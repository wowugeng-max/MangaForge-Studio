# Novel Writing Cockpit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working version of the chapter writing cockpit so opening a novel project immediately shows the next writing action, readiness blockers, model-team role, and the right existing workspace action to take.

**Architecture:** This first increment is frontend-first and testable: add a pure cockpit model, add a presentational cockpit panel, then wire it into `NovelProjectWorkspace.tsx` using already-loaded project data and existing generation/governance handlers. Backend aggregation and new model-role endpoints are intentionally deferred to later increments after the UI workflow is proven.

**Tech Stack:** React 18, TypeScript, Ant Design, Bun test, existing MangaForge novel workspace APIs and components.

---

## Scope

This plan implements Increment 1 from `docs/superpowers/specs/2026-05-22-novel-writing-cockpit-design.md`.

Included:

- Pure cockpit reasoning model.
- Unit tests for next-chapter selection, readiness, role recommendation, and primary action.
- Static writing cockpit panel.
- Integration into the project workspace using existing state and callbacks.
- Build and focused regression verification.

Deferred to future plans:

- Backend cockpit payload endpoint.
- New role-specific model endpoints.
- Automatic canon update after acceptance.
- Full redesign of workspace navigation.

## File Structure

- Create `ui/web/src/pages/novel-workspace/writingCockpitModel.ts`
  - Owns all deterministic cockpit reasoning.
  - No React imports.
  - Converts project, chapters, outlines, diagnostics, and runs into a cockpit view model.

- Create `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`
  - Bun tests for all cockpit model branches.
  - Uses realistic project/chapter/outlines payload shapes.

- Create `ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx`
  - Pure presentational React component.
  - Receives `WritingCockpitModel` and callbacks from `NovelProjectWorkspace`.
  - Does not fetch data and does not mutate state directly.

- Modify `ui/web/src/pages/NovelProjectWorkspace.tsx`
  - Imports the model builder and panel.
  - Builds cockpit model from already-loaded workspace data.
  - Adds role/action callbacks that call existing functions.
  - Renders cockpit panel above the main workspace area.

- Modify `package.json`
  - Add `test:writing-cockpit`.
  - Extend `test:planning-workspace` only if useful; do not overload unrelated scripts.

---

### Task 1: Add Pure Cockpit Model With Failing Tests

**Files:**
- Create: `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`
- Create later in Task 2: `ui/web/src/pages/novel-workspace/writingCockpitModel.ts`

- [ ] **Step 1: Create the failing model test file**

Create `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { buildWritingCockpitModel } from './writingCockpitModel'

const readyProject = {
  id: 1,
  title: '大益武夫',
  reference_config: {
    writing_bible: {
      promise: '看失势皇子以武道和权谋守住镜州',
      volume_plan: [{ title: '第一卷 镜州风雷', goal: '迟正稳住镜州并查清神降真相' }],
    },
    story_state: {
      last_updated_chapter: 1,
      character_positions: { 迟正: '镜州王府' },
    },
  },
}

const chapters = [
  {
    id: 101,
    chapter_no: 1,
    title: '断臂归来',
    chapter_goal: '迟正醒来并确认镜州危局',
    ending_hook: '王府外响起古神灾祸警钟',
    chapter_text: '迟正睁开眼，左臂传来陌生的灼痛。',
    updated_at: '2026-05-22T10:00:00.000Z',
  },
  {
    id: 102,
    chapter_no: 2,
    title: '警钟入城',
    chapter_goal: '迟正第一次用镜王身份压住混乱',
    conflict: '王府旧臣不信任迟正',
    ending_hook: '灰白纹路从城门下钻出',
    chapter_text: '',
    raw_payload: {
      must_advance: ['迟正确认王府人心', '引出城门灾祸'],
      forbidden_repeats: ['不要重复解释穿越设定'],
    },
  },
]

const outlines = [
  {
    id: 201,
    outline_type: 'volume',
    title: '第一卷 镜州风雷',
    summary: '迟正稳住镜州并查清神降真相',
    raw_payload: { start_chapter: 1, end_chapter: 40 },
  },
]

describe('buildWritingCockpitModel', () => {
  test('chooses the first planned unwritten chapter as the daily target', () => {
    const model = buildWritingCockpitModel({
      project: readyProject,
      chapters,
      outlines,
      activeChapter: chapters[1],
      materialScore: { score: 82, can_generate: true },
      activeRuns: [],
    })

    expect(model.nextChapter?.chapterNo).toBe(2)
    expect(model.previousChapter?.chapterNo).toBe(1)
    expect(model.topStatus.primaryActionKey).toBe('write_draft')
    expect(model.modelTeam.recommendedRole).toBe('draft_writer')
    expect(model.readiness.blockers).toEqual([])
    expect(model.nextChapter?.mustAdvance).toContain('迟正确认王府人心')
    expect(model.nextChapter?.forbiddenRepeats).toContain('不要重复解释穿越设定')
  })

  test('prioritizes writing bible blocker before draft generation', () => {
    const model = buildWritingCockpitModel({
      project: { id: 2, title: '空项目', reference_config: {} },
      chapters: [chapters[1]],
      outlines,
      activeChapter: chapters[1],
      materialScore: { score: 80, can_generate: true },
      activeRuns: [],
    })

    expect(model.readiness.blockers.map(item => item.key)).toContain('writing_bible_missing')
    expect(model.topStatus.primaryActionKey).toBe('open_writing_bible')
    expect(model.modelTeam.recommendedRole).toBe('chief_editor')
  })

  test('uses material repair as the primary action when material score blocks generation', () => {
    const model = buildWritingCockpitModel({
      project: readyProject,
      chapters,
      outlines,
      activeChapter: chapters[1],
      materialScore: { score: 42, can_generate: false },
      activeRuns: [],
    })

    expect(model.readiness.blockers.map(item => item.key)).toContain('materials_not_ready')
    expect(model.topStatus.primaryActionKey).toBe('repair_materials')
    expect(model.modelTeam.recommendedRole).toBe('episode_planner')
  })

  test('selects revision editor when active chapter already has prose', () => {
    const draftChapter = { ...chapters[1], chapter_text: '城门灰纹像活物一样爬过青砖。' }
    const model = buildWritingCockpitModel({
      project: readyProject,
      chapters: [chapters[0], draftChapter],
      outlines,
      activeChapter: draftChapter,
      materialScore: { score: 88, can_generate: true },
      activeRuns: [],
    })

    expect(model.draftPipeline.state).toBe('draft_generated')
    expect(model.modelTeam.recommendedRole).toBe('revision_editor')
    expect(model.topStatus.primaryActionKey).toBe('review_draft')
  })

  test('starts with planning action when there is no chapter', () => {
    const model = buildWritingCockpitModel({
      project: readyProject,
      chapters: [],
      outlines: [],
      activeChapter: null,
      materialScore: null,
      activeRuns: [],
    })

    expect(model.nextChapter).toBeNull()
    expect(model.topStatus.primaryActionKey).toBe('open_outline_panel')
    expect(model.readiness.blockers.map(item => item.key)).toContain('chapter_missing')
  })
})
```

- [ ] **Step 2: Run the test to verify RED**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/writingCockpitModel.test.ts
```

Expected:

```text
SyntaxError: Export named 'buildWritingCockpitModel' not found
```

If the failure is from a typo in the test file, fix the typo and rerun until the failure proves the model does not exist.

---

### Task 2: Implement Cockpit Model

**Files:**
- Create: `ui/web/src/pages/novel-workspace/writingCockpitModel.ts`
- Test: `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`

- [ ] **Step 1: Create the model implementation**

Create `ui/web/src/pages/novel-workspace/writingCockpitModel.ts`:

```ts
type AnyRecord = Record<string, any>

export type WritingCockpitRole =
  | 'chief_editor'
  | 'episode_planner'
  | 'draft_writer'
  | 'revision_editor'
  | 'continuity_auditor'
  | 'operations_analyst'

export type WritingCockpitActionKey =
  | 'open_writing_bible'
  | 'open_outline_panel'
  | 'repair_materials'
  | 'build_scene_plan'
  | 'write_draft'
  | 'review_draft'
  | 'fix_continuity'
  | 'update_canon'
  | 'open_task_center'

export type WritingReadinessStatus = 'pass' | 'warning' | 'blocker'

export interface WritingReadinessCheck {
  key:
    | 'writing_bible_present'
    | 'volume_goal_present'
    | 'chapter_present'
    | 'chapter_outline_present'
    | 'materials_ready'
    | 'story_state_aligned'
    | 'memory_available'
  label: string
  status: WritingReadinessStatus
  detail: string
  actionKey?: WritingCockpitActionKey
}

export interface WritingCockpitChapter {
  id: number
  chapterNo: number
  title: string
  goal: string
  conflict: string
  previousEnding: string
  endingHook: string
  whyItMatters: string
  mustAdvance: string[]
  forbiddenRepeats: string[]
  wordCount: number
}

export interface WritingCockpitModel {
  topStatus: {
    projectTitle: string
    currentVolume: string
    writtenWords: number
    currentRoleLabel: string
    nextActionLabel: string
    primaryActionKey: WritingCockpitActionKey
  }
  nextChapter: WritingCockpitChapter | null
  previousChapter: WritingCockpitChapter | null
  readiness: {
    checks: WritingReadinessCheck[]
    blockers: WritingReadinessCheck[]
    warnings: WritingReadinessCheck[]
  }
  modelTeam: {
    recommendedRole: WritingCockpitRole
    roles: Array<{
      key: WritingCockpitRole
      label: string
      description: string
      actionKey: WritingCockpitActionKey
      active: boolean
    }>
  }
  draftPipeline: {
    state: 'no_chapter' | 'no_draft' | 'draft_generated' | 'review_failed' | 'accepted'
    label: string
  }
  canonUpdatePreview: string[]
}

export interface BuildWritingCockpitModelInput {
  project?: AnyRecord | null
  chapters?: AnyRecord[]
  outlines?: AnyRecord[]
  activeChapter?: AnyRecord | null
  materialScore?: AnyRecord | null
  commercialReadiness?: AnyRecord | null
  activeRuns?: AnyRecord[]
  memorySummary?: AnyRecord | null
}

function text(value: any, fallback = '') {
  if (value === null || value === undefined) return fallback
  const normalized = String(value).trim()
  return normalized || fallback
}

function list(value: any): string[] {
  return Array.isArray(value) ? value.map(item => text(item)).filter(Boolean) : []
}

function wordCount(value: any) {
  return text(value).replace(/\s/g, '').length
}

function writingBible(project?: AnyRecord | null) {
  return project?.reference_config?.writing_bible || project?.writing_bible || {}
}

function storyState(project?: AnyRecord | null) {
  return project?.reference_config?.story_state || project?.story_state || {}
}

function hasWritingBible(project?: AnyRecord | null) {
  const bible = writingBible(project)
  return Boolean(text(bible.promise || bible.reader_promise || bible.mainline?.title || bible.mainline?.hook))
}

function volumeTitle(outlines: AnyRecord[], project?: AnyRecord | null) {
  const outlineVolume = outlines.find(outline => text(outline.outline_type || outline.level) === 'volume' || /卷/.test(text(outline.title)))
  const bible = writingBible(project)
  const bibleVolume = Array.isArray(bible.volume_plan) ? bible.volume_plan[0] : Array.isArray(bible.volumes) ? bible.volumes[0] : null
  return text(outlineVolume?.title || bibleVolume?.title, '当前卷未设置')
}

function volumeGoal(outlines: AnyRecord[], project?: AnyRecord | null) {
  const outlineVolume = outlines.find(outline => text(outline.outline_type || outline.level) === 'volume' || /卷/.test(text(outline.title)))
  const bible = writingBible(project)
  const bibleVolume = Array.isArray(bible.volume_plan) ? bible.volume_plan[0] : Array.isArray(bible.volumes) ? bible.volumes[0] : null
  return text(outlineVolume?.summary || outlineVolume?.goal || bibleVolume?.goal || bibleVolume?.summary)
}

function sortedChapters(chapters: AnyRecord[]) {
  return [...chapters].sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
}

function hasProse(chapter?: AnyRecord | null) {
  return wordCount(chapter?.chapter_text) > 0 && !text(chapter?.chapter_text).includes('【占位正文】')
}

function chooseNextChapter(chapters: AnyRecord[], activeChapter?: AnyRecord | null) {
  if (activeChapter && Number(activeChapter.id || 0) > 0) return activeChapter
  return sortedChapters(chapters).find(chapter => !hasProse(chapter)) || sortedChapters(chapters)[0] || null
}

function previousWrittenChapter(chapters: AnyRecord[], target?: AnyRecord | null) {
  const targetNo = Number(target?.chapter_no || 0)
  return sortedChapters(chapters).filter(chapter => hasProse(chapter) && Number(chapter.chapter_no || 0) < targetNo).slice(-1)[0] || null
}

function toCockpitChapter(chapter: AnyRecord | null | undefined, previous?: AnyRecord | null, project?: AnyRecord | null, outlines: AnyRecord[] = []): WritingCockpitChapter | null {
  if (!chapter) return null
  const no = Number(chapter.chapter_no || 0)
  const goal = text(chapter.chapter_goal || chapter.chapter_summary || chapter.raw_payload?.chapter_goal, '本章目标未设置')
  const currentVolumeGoal = volumeGoal(outlines, project)
  return {
    id: Number(chapter.id || 0),
    chapterNo: no,
    title: text(chapter.title, `第${no || '?'}章`),
    goal,
    conflict: text(chapter.conflict || chapter.raw_payload?.conflict, '本章冲突未设置'),
    previousEnding: text(previous?.ending_hook || previous?.chapter_text?.slice(-120), '暂无上一章钩子'),
    endingHook: text(chapter.ending_hook || chapter.raw_payload?.ending_hook, '结尾钩子未设置'),
    whyItMatters: currentVolumeGoal ? `服务当前卷目标：${currentVolumeGoal}` : '需要先明确当前卷目标',
    mustAdvance: list(chapter.raw_payload?.must_advance),
    forbiddenRepeats: list(chapter.raw_payload?.forbidden_repeats),
    wordCount: wordCount(chapter.chapter_text),
  }
}

function materialReady(materialScore?: AnyRecord | null) {
  if (!materialScore) return false
  return Boolean(materialScore.can_generate) || Number(materialScore.score || 0) >= 70
}

function storyStateAligned(project: AnyRecord | null | undefined, chapters: AnyRecord[]) {
  const state = storyState(project)
  const lastStateChapter = Number(state.last_updated_chapter || 0)
  const writtenMax = sortedChapters(chapters).filter(hasProse).reduce((max, chapter) => Math.max(max, Number(chapter.chapter_no || 0)), 0)
  if (!writtenMax) return true
  return lastStateChapter >= writtenMax - 1
}

function buildChecks(input: BuildWritingCockpitModelInput, nextChapter: AnyRecord | null): WritingReadinessCheck[] {
  const project = input.project
  const outlines = input.outlines || []
  const chapters = input.chapters || []
  const hasBible = hasWritingBible(project)
  const hasVolumeGoal = Boolean(volumeGoal(outlines, project))
  const hasChapter = Boolean(nextChapter)
  const hasChapterPlan = Boolean(text(nextChapter?.chapter_goal || nextChapter?.chapter_summary || nextChapter?.ending_hook))
  const isMaterialReady = materialReady(input.materialScore)
  const aligned = storyStateAligned(project, chapters)
  const memoryAvailable = input.memorySummary ? Number(input.memorySummary.memory_count || input.memorySummary.fact_count || 0) > 0 : true

  return [
    {
      key: 'writing_bible_present',
      label: '写作圣经',
      status: hasBible ? 'pass' : 'blocker',
      detail: hasBible ? '已有写作圣经约束。' : '缺少写作圣经，模型没有稳定创作准则。',
      actionKey: hasBible ? undefined : 'open_writing_bible',
    },
    {
      key: 'volume_goal_present',
      label: '当前卷目标',
      status: hasVolumeGoal ? 'pass' : 'warning',
      detail: hasVolumeGoal ? volumeGoal(outlines, project) : '当前章缺少卷级目标牵引。',
      actionKey: hasVolumeGoal ? undefined : 'open_outline_panel',
    },
    {
      key: 'chapter_present',
      label: '当前章节',
      status: hasChapter ? 'pass' : 'blocker',
      detail: hasChapter ? `已定位第${Number(nextChapter?.chapter_no || 0)}章。` : '还没有可写章节。',
      actionKey: hasChapter ? undefined : 'open_outline_panel',
    },
    {
      key: 'chapter_outline_present',
      label: '章节细纲',
      status: hasChapterPlan ? 'pass' : 'blocker',
      detail: hasChapterPlan ? '已有章节目标或结尾钩子。' : '当前章缺少目标、摘要或钩子。',
      actionKey: hasChapterPlan ? undefined : 'build_scene_plan',
    },
    {
      key: 'materials_ready',
      label: '材料准备',
      status: isMaterialReady ? 'pass' : 'blocker',
      detail: input.materialScore ? `材料分 ${Number(input.materialScore.score || 0)}。` : '尚未生成材料诊断。',
      actionKey: isMaterialReady ? undefined : 'repair_materials',
    },
    {
      key: 'story_state_aligned',
      label: '故事状态',
      status: aligned ? 'pass' : 'warning',
      detail: aligned ? '故事状态接近最新正文。' : '故事状态可能落后于已写章节。',
      actionKey: aligned ? undefined : 'update_canon',
    },
    {
      key: 'memory_available',
      label: '记忆宫殿',
      status: memoryAvailable ? 'pass' : 'warning',
      detail: memoryAvailable ? '可使用记忆或未启用记忆摘要。' : '记忆宫殿暂无可用事实，连续性置信度降低。',
      actionKey: memoryAvailable ? undefined : 'fix_continuity',
    },
  ]
}

function actionLabel(action: WritingCockpitActionKey) {
  const labels: Record<WritingCockpitActionKey, string> = {
    open_writing_bible: '补写作圣经',
    open_outline_panel: '补章节规划',
    repair_materials: '补齐本章材料',
    build_scene_plan: '生成场景计划',
    write_draft: '生成本章初稿',
    review_draft: '审校并修订',
    fix_continuity: '检查连续性',
    update_canon: '更新故事状态',
    open_task_center: '查看任务中心',
  }
  return labels[action]
}

function roleLabel(role: WritingCockpitRole) {
  const labels: Record<WritingCockpitRole, string> = {
    chief_editor: '主编',
    episode_planner: '编剧',
    draft_writer: '写手',
    revision_editor: '改稿编辑',
    continuity_auditor: '连续性审校',
    operations_analyst: '运营分析',
  }
  return labels[role]
}

function resolveRecommendation(blockers: WritingReadinessCheck[], warnings: WritingReadinessCheck[], nextChapter: AnyRecord | null): { role: WritingCockpitRole; action: WritingCockpitActionKey } {
  const firstBlocker = blockers[0]
  if (firstBlocker?.key === 'writing_bible_present') return { role: 'chief_editor', action: 'open_writing_bible' }
  if (firstBlocker?.key === 'chapter_present') return { role: 'chief_editor', action: 'open_outline_panel' }
  if (firstBlocker?.key === 'chapter_outline_present') return { role: 'episode_planner', action: 'build_scene_plan' }
  if (firstBlocker?.key === 'materials_ready') return { role: 'episode_planner', action: 'repair_materials' }
  if (hasProse(nextChapter)) return { role: 'revision_editor', action: 'review_draft' }
  const staleState = warnings.find(item => item.key === 'story_state_aligned')
  if (staleState) return { role: 'continuity_auditor', action: 'update_canon' }
  return { role: 'draft_writer', action: 'write_draft' }
}

function buildRoles(activeRole: WritingCockpitRole) {
  const rows: Array<{ key: WritingCockpitRole; label: string; description: string; actionKey: WritingCockpitActionKey }> = [
    { key: 'chief_editor', label: '主编', description: '判断下一步写什么，先修什么。', actionKey: 'open_writing_bible' },
    { key: 'episode_planner', label: '编剧', description: '拆本章场景、冲突、钩子。', actionKey: 'build_scene_plan' },
    { key: 'draft_writer', label: '写手', description: '根据锁定材料写正文初稿。', actionKey: 'write_draft' },
    { key: 'revision_editor', label: '改稿', description: '强化节奏、情绪、爽点和文风。', actionKey: 'review_draft' },
    { key: 'continuity_auditor', label: '审校', description: '检查设定、状态、伏笔和时间线。', actionKey: 'fix_continuity' },
    { key: 'operations_analyst', label: '运营', description: '观察追读、卷目标和长线风险。', actionKey: 'open_task_center' },
  ]
  return rows.map(row => ({ ...row, active: row.key === activeRole }))
}

export function buildWritingCockpitModel(input: BuildWritingCockpitModelInput): WritingCockpitModel {
  const chapters = input.chapters || []
  const outlines = input.outlines || []
  const next = chooseNextChapter(chapters, input.activeChapter)
  const previous = previousWrittenChapter(chapters, next)
  const checks = buildChecks(input, next)
  const blockers = checks.filter(item => item.status === 'blocker')
  const warnings = checks.filter(item => item.status === 'warning')
  const recommendation = resolveRecommendation(blockers, warnings, next)
  const writtenWords = chapters.reduce((sum, chapter) => sum + wordCount(chapter.chapter_text), 0)
  const draftState = !next ? 'no_chapter' : hasProse(next) ? 'draft_generated' : 'no_draft'
  const draftLabels = {
    no_chapter: '暂无可写章节',
    no_draft: '等待初稿',
    draft_generated: '已有初稿，等待审校',
    review_failed: '审校未通过',
    accepted: '已确认入库',
  } as const

  return {
    topStatus: {
      projectTitle: text(input.project?.title, '未命名作品'),
      currentVolume: volumeTitle(outlines, input.project),
      writtenWords,
      currentRoleLabel: roleLabel(recommendation.role),
      nextActionLabel: actionLabel(recommendation.action),
      primaryActionKey: recommendation.action,
    },
    nextChapter: toCockpitChapter(next, previous, input.project, outlines),
    previousChapter: toCockpitChapter(previous, null, input.project, outlines),
    readiness: { checks, blockers, warnings },
    modelTeam: {
      recommendedRole: recommendation.role,
      roles: buildRoles(recommendation.role),
    },
    draftPipeline: {
      state: draftState,
      label: draftLabels[draftState],
    },
    canonUpdatePreview: [
      next ? `确认后更新到第${Number(next.chapter_no || 0)}章故事状态。` : '确认章节后更新故事状态。',
      '抽取正文事实并写入记忆宫殿。',
      '同步角色位置、伏笔状态和卷进度。',
    ],
  }
}
```

- [ ] **Step 2: Run model tests**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/writingCockpitModel.test.ts
```

Expected:

```text
5 pass
0 fail
```

- [ ] **Step 3: Commit**

```bash
git add ui/web/src/pages/novel-workspace/writingCockpitModel.ts ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts
git commit -m "feat: add novel writing cockpit model"
```

---

### Task 3: Add Writing Cockpit Panel

**Files:**
- Create: `ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx`
- Depends on: `ui/web/src/pages/novel-workspace/writingCockpitModel.ts`

- [ ] **Step 1: Create the presentational component**

Create `ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx`:

```tsx
import React from 'react'
import { Alert, Button, Card, Col, Progress, Row, Space, Tag, Typography } from 'antd'
import {
  CheckCircleOutlined,
  EditOutlined,
  FileSearchOutlined,
  PlayCircleOutlined,
  SafetyOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import type { WritingCockpitActionKey, WritingCockpitModel, WritingCockpitRole } from './writingCockpitModel'

const { Text, Paragraph } = Typography

type ActionMap = Partial<Record<WritingCockpitActionKey, () => void>>

interface WritingCockpitPanelProps {
  model: WritingCockpitModel
  loading?: boolean
  onAction: (key: WritingCockpitActionKey) => void
}

function roleIcon(role: WritingCockpitRole) {
  if (role === 'draft_writer') return <PlayCircleOutlined />
  if (role === 'revision_editor') return <EditOutlined />
  if (role === 'continuity_auditor') return <SafetyOutlined />
  if (role === 'episode_planner') return <FileSearchOutlined />
  if (role === 'operations_analyst') return <ToolOutlined />
  return <CheckCircleOutlined />
}

function checkColor(status: string) {
  if (status === 'pass') return 'green'
  if (status === 'blocker') return 'red'
  return 'gold'
}

function readinessPercent(model: WritingCockpitModel) {
  const total = model.readiness.checks.length || 1
  const passed = model.readiness.checks.filter(item => item.status === 'pass').length
  return Math.round((passed / total) * 100)
}

function blockerAlert(model: WritingCockpitModel, onAction: (key: WritingCockpitActionKey) => void) {
  const blocker = model.readiness.blockers[0]
  if (!blocker) return null
  return (
    <Alert
      type="warning"
      showIcon
      message={blocker.label}
      description={blocker.detail}
      action={blocker.actionKey ? (
        <Button size="small" onClick={() => onAction(blocker.actionKey!)}>
          处理
        </Button>
      ) : undefined}
    />
  )
}

export function WritingCockpitPanel({ model, loading = false, onAction }: WritingCockpitPanelProps) {
  const next = model.nextChapter
  return (
    <div style={{ flexShrink: 0, padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
      <Card size="small" style={{ borderRadius: 8 }}>
        <Row gutter={[16, 12]} align="stretch">
          <Col xs={24} xl={8}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Space wrap size={[6, 6]}>
                <Tag color="blue" bordered={false}>{model.topStatus.currentRoleLabel}</Tag>
                <Tag color="purple" bordered={false}>{model.topStatus.currentVolume}</Tag>
                <Tag bordered={false}>{model.topStatus.writtenWords.toLocaleString()}字</Tag>
              </Space>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>今日写作目标</Text>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
                  {next ? `第${next.chapterNo}章 · ${next.title}` : '先补章节规划'}
                </div>
              </div>
              <Paragraph style={{ margin: 0, color: '#475569' }} ellipsis={{ rows: 2 }}>
                {next?.whyItMatters || '当前项目还没有可执行章节，建议先生成或补齐章节细纲。'}
              </Paragraph>
              <Button
                type="primary"
                block
                loading={loading}
                icon={roleIcon(model.modelTeam.recommendedRole)}
                onClick={() => onAction(model.topStatus.primaryActionKey)}
                style={{ minHeight: 38, whiteSpace: 'normal' }}
              >
                {model.topStatus.nextActionLabel}
              </Button>
            </Space>
          </Col>

          <Col xs={24} xl={8}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text strong>材料就绪</Text>
              <Space align="center">
                <Progress type="circle" size={56} percent={readinessPercent(model)} />
                <Space direction="vertical" size={2}>
                  <Text type={model.readiness.blockers.length ? 'danger' : undefined}>
                    {model.readiness.blockers.length ? `${model.readiness.blockers.length} 个阻塞` : '可进入下一步'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {model.readiness.warnings.length ? `${model.readiness.warnings.length} 个提醒` : '无关键提醒'}
                  </Text>
                </Space>
              </Space>
              {blockerAlert(model, onAction)}
              <Space wrap size={[4, 4]}>
                {model.readiness.checks.map(check => (
                  <Tag key={check.key} color={checkColor(check.status)} bordered={false}>
                    {check.label}
                  </Tag>
                ))}
              </Space>
            </Space>
          </Col>

          <Col xs={24} xl={8}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text strong>模型创作团队</Text>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
                {model.modelTeam.roles.map(role => (
                  <Button
                    key={role.key}
                    size="small"
                    type={role.active ? 'primary' : 'default'}
                    icon={roleIcon(role.key)}
                    onClick={() => onAction(role.actionKey)}
                    style={{ minWidth: 0, whiteSpace: 'normal', height: 34, paddingInline: 6 }}
                  >
                    {role.label}
                  </Button>
                ))}
              </div>
              <Card size="small" style={{ borderRadius: 6, background: '#fbfdff' }} bodyStyle={{ padding: 10 }}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>当前流水线</Text>
                  <Text strong>{model.draftPipeline.label}</Text>
                  <Paragraph style={{ margin: 0, color: '#64748b' }} ellipsis={{ rows: 2 }}>
                    {next ? `上章钩子：${next.previousEnding}` : '完成章节规划后，驾驶舱会切换到场景计划和初稿生成。'}
                  </Paragraph>
                </Space>
              </Card>
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export type { ActionMap }
```

- [ ] **Step 2: Run TypeScript build**

Run:

```bash
bun run build:web
```

Expected:

```text
✓ built
```

If TypeScript reports unused imports or incompatible Ant Design props, fix only this component.

- [ ] **Step 3: Commit**

```bash
git add ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx
git commit -m "feat: add novel writing cockpit panel"
```

---

### Task 4: Integrate Cockpit Into Project Workspace

**Files:**
- Modify: `ui/web/src/pages/NovelProjectWorkspace.tsx`
- Test: `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`

- [ ] **Step 1: Add imports**

In `ui/web/src/pages/NovelProjectWorkspace.tsx`, add imports near the existing workspace imports:

```ts
import { WritingCockpitPanel } from './novel-workspace/WritingCockpitPanel'
import { buildWritingCockpitModel, type WritingCockpitActionKey } from './novel-workspace/writingCockpitModel'
```

- [ ] **Step 2: Build cockpit model after planning model inputs are available**

Find the render setup area before `const renderWorkspaceArea = () => {`.

Add:

```ts
  const writingCockpitModel = useMemo(() => buildWritingCockpitModel({
    project: selectedProject,
    chapters: sortedChapters,
    outlines,
    activeChapter,
    materialScore: activeChapterDiagnostics?.material_score || null,
    commercialReadiness,
    activeRuns: activeTasks,
  }), [
    selectedProject,
    sortedChapters,
    outlines,
    activeChapter,
    activeChapterDiagnostics?.material_score,
    commercialReadiness,
    activeTasks,
  ])
```

If `activeTasks` is declared after this location, move this block lower so all referenced variables are already in scope. Do not duplicate `activeTasks`.

- [ ] **Step 3: Add action dispatcher**

Below `handlePlanningAction`, add:

```ts
  const handleWritingCockpitAction = (key: WritingCockpitActionKey) => {
    const actions: Record<WritingCockpitActionKey, () => void> = {
      open_writing_bible: () => { void openWritingBibleEditor() },
      open_outline_panel: () => setOutlinePanelOpen(true),
      repair_materials: () => { void openMaterialRepairPlan() },
      build_scene_plan: () => {
        if (activeChapter) void generateSceneCardsForActiveChapter()
        else setOutlinePanelOpen(true)
      },
      write_draft: () => { void generateCurrentChapterProse() },
      review_draft: () => {
        if (activeChapter) void openChapterQualityCard()
        else setWorkspaceArea('chapterWriting')
      },
      fix_continuity: () => { void openContinuityAudit() },
      update_canon: () => openStoryStateEditor(),
      open_task_center: () => setTaskCenterOpen(true),
    }
    actions[key]?.()
  }
```

This dispatcher intentionally reuses existing handlers. Do not add new API calls in this task.

- [ ] **Step 4: Render cockpit above the center workspace**

Replace the center rendering in the main body:

```tsx
        {renderWorkspaceArea()}
```

with:

```tsx
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <WritingCockpitPanel
            model={writingCockpitModel}
            loading={stepProseLoading || generatingProse || generatingSceneCards || diagnosticsLoading}
            onAction={handleWritingCockpitAction}
          />
          {renderWorkspaceArea()}
        </div>
```

This preserves the left chapter directory and right reference panel while making the cockpit the first central surface.

- [ ] **Step 5: Run focused tests**

Run:

```bash
cd ui/web && bun test src/pages/novel-workspace/writingCockpitModel.test.ts
```

Expected:

```text
5 pass
0 fail
```

- [ ] **Step 6: Run web build**

Run:

```bash
bun run build:web
```

Expected:

```text
✓ built
```

- [ ] **Step 7: Commit**

```bash
git add ui/web/src/pages/NovelProjectWorkspace.tsx
git commit -m "feat: show novel writing cockpit in workspace"
```

---

### Task 5: Add Test Script And Final Verification

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add script**

Modify the root `package.json` scripts block:

```json
"test:writing-cockpit": "cd ui/web && bun test src/pages/novel-workspace/writingCockpitModel.test.ts",
```

Place it after `test:planning-workspace`.

The final scripts section should include:

```json
"test:novel-server": "cd ui/server && bun test src/novel.test.ts src/routes/novel-core-routes.test.ts",
"test:novel-entry": "cd ui/web && bun test src/components/novel-entry/launchpadModel.test.ts src/pages/novel-lobby/novelLobbyModel.test.ts",
"test:planning-workspace": "cd ui/web && bun test src/pages/novel-workspace/planningWorkspaceModel.test.ts",
"test:writing-cockpit": "cd ui/web && bun test src/pages/novel-workspace/writingCockpitModel.test.ts"
```

- [ ] **Step 2: Run cockpit script**

Run:

```bash
bun run test:writing-cockpit
```

Expected:

```text
5 pass
0 fail
```

- [ ] **Step 3: Run adjacent workspace tests**

Run:

```bash
bun run test:planning-workspace
```

Expected:

```text
all tests pass
```

- [ ] **Step 4: Run web build**

Run:

```bash
bun run build:web
```

Expected:

```text
✓ built
```

- [ ] **Step 5: Run diff check**

Run:

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 6: Commit script**

```bash
git add package.json
git commit -m "test: add writing cockpit test script"
```

---

### Task 6: Manual Product Check

**Files:**
- No code changes expected.

- [ ] **Step 1: Start or reuse local dev server**

If the dev server is not already running, run:

```bash
bun run dev
```

Expected:

```text
Manga UI server on http://localhost:8787
Vite local URL available
```

- [ ] **Step 2: Open a project workspace**

Use an existing project URL such as:

```text
http://localhost:5173/novel/workspace/4
```

Expected:

- The central workspace shows the writing cockpit directly under the top bar.
- The cockpit shows current role, current volume, word count, next action, readiness tags, and model team buttons.

- [ ] **Step 3: Check blocked case**

Open or create a sparse project with no writing bible or chapters.

Expected:

- Primary action is `补写作圣经` or `补章节规划`.
- The cockpit does not show `生成本章初稿` before a chapter exists.

- [ ] **Step 4: Check ready chapter case**

Open a project with an unwritten planned chapter and usable material score.

Expected:

- Primary action is `生成本章初稿`.
- Recommended role is `写手`.
- Previous chapter hook is visible if there is a previous written chapter.

- [ ] **Step 5: Check existing draft case**

Select a chapter with `chapter_text`.

Expected:

- Pipeline says `已有初稿，等待审校`.
- Primary action is `审校并修订`.
- Recommended role is `改稿编辑`.

---

## Self-Review Notes

Spec coverage:

- Daily writing cockpit: Task 1 through Task 4.
- Model team roles: Task 2 and Task 3.
- Readiness and blockers: Task 1 and Task 2.
- Existing action reuse: Task 4.
- Testing: Task 1 and Task 5.
- Backend aggregation: intentionally deferred because this is Increment 1.
- Role-specific model calls: intentionally deferred because this is Increment 1.

Placeholder scan:

- No unresolved markers or open-ended implementation placeholders are used.
- Deferred items are explicitly listed as out of scope for this increment.

Type consistency:

- `WritingCockpitActionKey` values used by the panel match the dispatcher in `NovelProjectWorkspace.tsx`.
- `WritingCockpitRole` values used by the model match the panel icon mapping.
- The model input uses existing workspace names: `selectedProject`, `sortedChapters`, `outlines`, `activeChapter`, `activeChapterDiagnostics?.material_score`, `commercialReadiness`, and `activeTasks`.
