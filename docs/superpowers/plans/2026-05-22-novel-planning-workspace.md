# Novel Planning Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the novel project workspace open into a mainline and volume planning cockpit while keeping chapter writing, assets, quality tools, and production operations one click away.

**Architecture:** Add a pure planning model builder that derives the first-screen status from existing project, outline, chapter, writing bible, story state, and diagnostics data. Render that model through a new `StoryPlanningWorkspace` component, then add a lightweight work-area switcher in `NovelProjectWorkspace` so the existing editor and tool surfaces remain available without being the default opening screen.

**Tech Stack:** React 18, TypeScript, Ant Design, existing Vite/Bun build pipeline, Bun test for the new pure model.

---

## File Structure

- Create `ui/web/src/pages/novel-workspace/planningWorkspaceModel.ts`
  - Owns all derived planning data: top status, mainline and volume summary, future 10-chapter route, volume structure, and planning health issues.
  - Pure TypeScript with no React imports.
- Create `ui/web/src/pages/novel-workspace/planningWorkspaceModel.test.ts`
  - Bun tests for the derived model.
- Create `ui/web/src/pages/novel-workspace/StoryPlanningWorkspace.tsx`
  - Renders the default planning cockpit from the derived model.
  - Emits callbacks for existing actions: rolling plan, outline panel, current chapter writing, outline tree, future 100 audit/generate, long-form pressure test, topic validation, reference diagnosis, story assets.
- Modify `ui/web/src/pages/NovelProjectWorkspace.tsx`
  - Adds work-area state.
  - Replaces the current top workflow menu cluster with five work areas.
  - Renders `StoryPlanningWorkspace` by default and keeps `WorkspaceCenter` for chapter writing mode.
  - Keeps all existing modals, drawers, and actions.
- Modify `ui/web/src/pages/novel-workspace/ChapterDirectorySidebar.tsx`
  - Demotes the left sidebar into navigation by collapsing the production guide when story planning is active.
- Modify `package.json`
  - Adds a focused model test command.

## Task 1: Planning Model

**Files:**
- Create: `ui/web/src/pages/novel-workspace/planningWorkspaceModel.ts`
- Create: `ui/web/src/pages/novel-workspace/planningWorkspaceModel.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Add the focused test script**

Update `package.json` scripts:

```json
{
  "scripts": {
    "dev": "node scripts/run-dev.mjs",
    "dev:server": "cd ui/server && bun run dev",
    "dev:web": "cd ui/web && bun run dev",
    "build:server": "cd ui/server && bun run build",
    "build:web": "cd ui/web && bun run build",
    "check": "bun run build:server && bun run build:web",
    "test:planning-workspace": "cd ui/web && bun test src/pages/novel-workspace/planningWorkspaceModel.test.ts",
    "smoke:novel": "node scripts/check-novel-generation-workflow.mjs",
    "smoke:novel:local": "node scripts/run-novel-smoke-local.mjs"
  }
}
```

- [ ] **Step 2: Write failing tests for the derived planning model**

Create `ui/web/src/pages/novel-workspace/planningWorkspaceModel.test.ts`:

```ts
import { describe, expect, test } from 'bun:test'
import { buildPlanningWorkspaceModel } from './planningWorkspaceModel'

const project = {
  title: '万古长夜',
  target_words: 3000000,
  reference_config: {
    writing_bible: {
      promise: '寒门少年以阵法改写宗门秩序',
      volumes: [
        {
          title: '宗门试炼',
          goal: '让主角从外门杂役进入内门视野',
          stages: [
            { title: '压迫升级', conflict: '执事逼主角交出阵盘', payoff_model: '升级+打脸' },
          ],
        },
      ],
    },
    story_state: {
      last_updated_chapter: 7,
      foreshadowing_status: [{ name: '残缺阵盘', status: 'pending' }],
      mainline_progress: '外门压迫线推进到试炼前夜',
    },
  },
}

const outlines = [
  { id: 1, title: '第一卷 宗门试炼', outline_level: 'volume', start_chapter: 1, end_chapter: 50 },
  { id: 2, title: '压迫升级', outline_level: 'stage', parent_id: 1, start_chapter: 1, end_chapter: 12 },
  { id: 3, title: '试炼前夜转折', outline_level: 'turning_point', parent_id: 2, start_chapter: 10, end_chapter: 10 },
]

const chapters = Array.from({ length: 12 }).map((_, index) => ({
  id: index + 1,
  chapter_no: index + 1,
  title: `第${index + 1}章`,
  chapter_goal: index < 10 ? `推进外门压迫 ${index + 1}` : '',
  conflict: index < 10 ? '执事压迫' : '',
  ending_hook: index < 10 ? '试炼将至' : '',
  chapter_text: index < 7 ? '正文'.repeat(1200) : '',
  raw_payload: {
    payoff: index % 2 === 0 ? '升级' : '打脸',
    mainline_progress: index < 10 ? '外门压迫线' : '',
  },
}))

describe('buildPlanningWorkspaceModel', () => {
  test('derives strategic top status and mainline panel from existing project data', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      materialScore: { score: 74, can_generate: true },
      commercialReadiness: { score: 81 },
    })

    expect(model.topStatus.projectTitle).toBe('万古长夜')
    expect(model.topStatus.currentChapterLabel).toBe('第7章')
    expect(model.topStatus.targetWords).toBe(3000000)
    expect(model.topStatus.writtenWords).toBeGreaterThan(0)
    expect(model.topStatus.future10Coverage.ready).toBe(true)
    expect(model.mainline.readerPromise).toBe('寒门少年以阵法改写宗门秩序')
    expect(model.mainline.currentVolumeGoal).toBe('让主角从外门杂役进入内门视野')
    expect(model.mainline.currentStageConflict).toBe('执事逼主角交出阵盘')
  })

  test('builds a future 10-chapter route from the active chapter position', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
    })

    expect(model.futureRoute).toHaveLength(6)
    expect(model.futureRoute[0]).toMatchObject({
      chapterNo: 7,
      title: '第7章',
      chapterTask: '推进外门压迫 7',
      endingHook: '试炼将至',
    })
    expect(model.futureRoute[3].riskTags).toContain('缺章节任务')
  })

  test('reports planning health issues with direct action keys', () => {
    const sparseProject = {
      title: '空白项目',
      reference_config: {
        writing_bible: { promise: '' },
        story_state: { last_updated_chapter: 1 },
      },
    }

    const model = buildPlanningWorkspaceModel({
      selectedProject: sparseProject,
      outlines: [],
      chapters: [{ id: 1, chapter_no: 1, title: '第一章', chapter_text: '正文' }],
      activeChapter: { id: 1, chapter_no: 1, title: '第一章', chapter_text: '正文' },
    })

    expect(model.healthIssues.map(issue => issue.key)).toContain('missing_volume_goal')
    expect(model.healthIssues.map(issue => issue.actionKey)).toContain('complete_volume_plan')
    expect(model.topStatus.longformHealth.status).toBe('needs_planning')
  })
})
```

- [ ] **Step 3: Run the tests and verify they fail**

Run:

```bash
bun run test:planning-workspace
```

Expected: FAIL because `planningWorkspaceModel.ts` does not exist or `buildPlanningWorkspaceModel` is not exported.

- [ ] **Step 4: Implement the model builder**

Create `ui/web/src/pages/novel-workspace/planningWorkspaceModel.ts`:

```ts
import { wc } from './utils'

export type FuturePlanningCoverage = {
  ready: boolean
  planned: number
  required: number
}

export type PlanningHealthStatus = 'healthy' | 'drifting' | 'needs_planning'

export type PlanningHealthIssue = {
  key: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  detail: string
  actionLabel: string
  actionKey: 'complete_volume_plan' | 'generate_future10' | 'open_story_assets' | 'update_story_state' | 'open_quality_revision'
}

export type PlanningWorkspaceModel = {
  topStatus: {
    projectTitle: string
    currentVolume: string
    currentStage: string
    currentChapterLabel: string
    writtenWords: number
    targetWords: number
    future10Coverage: FuturePlanningCoverage
    future100Coverage: FuturePlanningCoverage
    longformHealth: {
      status: PlanningHealthStatus
      label: string
    }
  }
  mainline: {
    readerPromise: string
    currentVolumeGoal: string
    currentStageConflict: string
    payoffModel: string
    previousTurn: string
    nextTurn: string
    currentChapterServesVolume: boolean
    risks: string[]
  }
  futureRoute: Array<{
    chapterId: number
    chapterNo: number
    title: string
    chapterTask: string
    mainlineProgress: string
    payoff: string
    endingHook: string
    riskTags: string[]
  }>
  volumeTree: Array<{
    key: string
    title: string
    chapterRange: string
    active: boolean
    children: Array<{ key: string; title: string; chapterRange: string; active: boolean }>
  }>
  healthIssues: PlanningHealthIssue[]
}

type BuildPlanningWorkspaceModelInput = {
  selectedProject: any | null
  outlines: any[]
  chapters: any[]
  activeChapter: any | null
  materialScore?: any
  commercialReadiness?: any
}

function text(value: unknown, fallback = '') {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

function arrayValue(value: unknown): any[] {
  return Array.isArray(value) ? value : []
}

function chapterRange(item: any) {
  const start = Number(item?.start_chapter || item?.chapter_start || item?.from_chapter || 0)
  const end = Number(item?.end_chapter || item?.chapter_end || item?.to_chapter || 0)
  if (start && end) return `第${start}-${end}章`
  if (start) return `第${start}章起`
  if (end) return `至第${end}章`
  return '章节范围未定'
}

function chapterInRange(chapterNo: number, item: any) {
  const start = Number(item?.start_chapter || item?.chapter_start || item?.from_chapter || 0)
  const end = Number(item?.end_chapter || item?.chapter_end || item?.to_chapter || 0)
  if (!chapterNo) return false
  if (start && chapterNo < start) return false
  if (end && chapterNo > end) return false
  return Boolean(start || end)
}

function outlineLevel(item: any) {
  return String(item?.outline_level || item?.level || item?.type || '').toLowerCase()
}

function isVolume(item: any) {
  const level = outlineLevel(item)
  const title = text(item?.title)
  return level.includes('volume') || level.includes('卷') || /^第.+卷/.test(title)
}

function isStage(item: any) {
  const level = outlineLevel(item)
  return level.includes('stage') || level.includes('阶段')
}

function isTurn(item: any) {
  const level = outlineLevel(item)
  return level.includes('turn') || level.includes('转折')
}

function firstNonEmpty(values: unknown[], fallback: string) {
  for (const value of values) {
    const normalized = text(value)
    if (normalized) return normalized
  }
  return fallback
}

function resolveWritingBible(project: any) {
  return project?.reference_config?.writing_bible || {}
}

function resolveStoryState(project: any) {
  return project?.reference_config?.story_state || {}
}

function resolveVolumeFromBible(writingBible: any, activeChapterNo: number) {
  const volumes = arrayValue(writingBible?.volumes || writingBible?.volume_plan)
  return volumes.find(volume => chapterInRange(activeChapterNo, volume)) || volumes[0] || null
}

function resolveStageFromBible(volume: any) {
  const stages = arrayValue(volume?.stages)
  return stages[0] || null
}

function routeRiskTags(chapter: any) {
  const risks: string[] = []
  if (!text(chapter?.chapter_goal)) risks.push('缺章节任务')
  if (!text(chapter?.ending_hook)) risks.push('缺结尾钩子')
  if (!text(chapter?.conflict)) risks.push('缺冲突')
  if (!text(chapter?.raw_payload?.mainline_progress)) risks.push('主线推进弱')
  return risks
}

function buildHealthIssues({
  writingBible,
  storyState,
  future10Coverage,
  activeChapterNo,
  materialScore,
}: {
  writingBible: any
  storyState: any
  future10Coverage: FuturePlanningCoverage
  activeChapterNo: number
  materialScore?: any
}): PlanningHealthIssue[] {
  const issues: PlanningHealthIssue[] = []
  if (!text(writingBible?.promise)) {
    issues.push({
      key: 'missing_reader_promise',
      severity: 'critical',
      title: '缺读者承诺',
      detail: '写作圣经缺少全书长期承诺，后续章节容易只推进事件，不兑现读者期待。',
      actionLabel: '打开资料设定',
      actionKey: 'open_story_assets',
    })
  }
  const volume = arrayValue(writingBible?.volumes || writingBible?.volume_plan)[0]
  if (!text(volume?.goal)) {
    issues.push({
      key: 'missing_volume_goal',
      severity: 'critical',
      title: '缺当前卷目标',
      detail: '当前卷没有清晰目标，章节生成容易偏离主线。',
      actionLabel: '补齐当前卷规划',
      actionKey: 'complete_volume_plan',
    })
  }
  if (!future10Coverage.ready) {
    issues.push({
      key: 'future10_incomplete',
      severity: 'warning',
      title: '未来 10 章路线不足',
      detail: `未来 10 章中只有 ${future10Coverage.planned} 章有明确任务。`,
      actionLabel: '更新滚动规划',
      actionKey: 'generate_future10',
    })
  }
  const stateChapter = Number(storyState?.last_updated_chapter || 0)
  if (activeChapterNo && stateChapter && activeChapterNo - stateChapter >= 3) {
    issues.push({
      key: 'story_state_stale',
      severity: 'warning',
      title: '故事状态落后',
      detail: `状态机只更新到第 ${stateChapter} 章，当前已到第 ${activeChapterNo} 章。`,
      actionLabel: '校正故事状态',
      actionKey: 'update_story_state',
    })
  }
  if (materialScore && Number(materialScore.score || 0) < 65) {
    issues.push({
      key: 'material_weak',
      severity: 'warning',
      title: '当前章材料不足',
      detail: '当前章生成前材料分偏低，需要补齐章节目标、冲突、钩子或状态。',
      actionLabel: '补齐当前卷规划',
      actionKey: 'complete_volume_plan',
    })
  }
  return issues
}

function healthLabel(status: PlanningHealthStatus) {
  if (status === 'healthy') return '正常'
  if (status === 'drifting') return '偏线风险'
  return '需要补规划'
}

export function buildPlanningWorkspaceModel({
  selectedProject,
  outlines,
  chapters,
  activeChapter,
  materialScore,
  commercialReadiness,
}: BuildPlanningWorkspaceModelInput): PlanningWorkspaceModel {
  const sortedChapters = [...chapters].sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
  const activeChapterNo = Number(activeChapter?.chapter_no || sortedChapters[0]?.chapter_no || 0)
  const writingBible = resolveWritingBible(selectedProject)
  const storyState = resolveStoryState(selectedProject)
  const volumeFromBible = resolveVolumeFromBible(writingBible, activeChapterNo)
  const stageFromBible = resolveStageFromBible(volumeFromBible)
  const volumeOutline = outlines.find(item => isVolume(item) && chapterInRange(activeChapterNo, item)) || outlines.find(isVolume)
  const stageOutline = outlines.find(item => isStage(item) && chapterInRange(activeChapterNo, item)) || outlines.find(isStage)
  const turns = outlines.filter(isTurn)
  const previousTurn = turns.filter(item => Number(item?.start_chapter || 0) <= activeChapterNo).slice(-1)[0]
  const nextTurn = turns.find(item => Number(item?.start_chapter || 0) > activeChapterNo) || turns[0]
  const futureRoute = sortedChapters
    .filter(chapter => Number(chapter.chapter_no || 0) >= activeChapterNo)
    .slice(0, 10)
    .map(chapter => ({
      chapterId: Number(chapter.id || 0),
      chapterNo: Number(chapter.chapter_no || 0),
      title: text(chapter.title, '无标题'),
      chapterTask: text(chapter.chapter_goal, '未设置章节任务'),
      mainlineProgress: text(chapter.raw_payload?.mainline_progress || chapter.chapter_summary, '主线推进未标注'),
      payoff: text(chapter.raw_payload?.payoff || chapter.raw_payload?.emotional_payoff, '爽点未标注'),
      endingHook: text(chapter.ending_hook, '结尾钩子未设置'),
      riskTags: routeRiskTags(chapter),
    }))
  const plannedFuture10 = futureRoute.filter(item => item.chapterTask !== '未设置章节任务').length
  const future10Coverage = { ready: plannedFuture10 >= Math.min(10, futureRoute.length || 10), planned: plannedFuture10, required: 10 }
  const future100Count = sortedChapters.filter(chapter => Number(chapter.chapter_no || 0) >= activeChapterNo && text(chapter.chapter_goal)).length
  const future100Coverage = { ready: future100Count >= 100, planned: future100Count, required: 100 }
  const healthIssues = buildHealthIssues({ writingBible, storyState, future10Coverage, activeChapterNo, materialScore })
  const criticalCount = healthIssues.filter(issue => issue.severity === 'critical').length
  const status: PlanningHealthStatus = criticalCount > 0 ? 'needs_planning' : healthIssues.length > 0 ? 'drifting' : 'healthy'
  const writtenWords = sortedChapters.reduce((sum, chapter) => sum + wc(chapter.chapter_text), 0)
  const targetWords = Number(selectedProject?.target_words || selectedProject?.target_word_count || 3000000)
  const currentVolume = firstNonEmpty([volumeFromBible?.title, volumeOutline?.title], '当前卷未命名')
  const currentStage = firstNonEmpty([stageFromBible?.title, stageOutline?.title], '当前阶段未命名')
  const currentVolumeGoal = firstNonEmpty([volumeFromBible?.goal, volumeOutline?.summary, volumeOutline?.description], '当前卷目标未设置')
  const currentStageConflict = firstNonEmpty([stageFromBible?.conflict, stageOutline?.conflict, stageOutline?.summary], '当前阶段冲突未设置')
  const volumeTree = outlines.filter(isVolume).map(volume => ({
    key: String(volume.id || volume.title),
    title: text(volume.title, '未命名卷'),
    chapterRange: chapterRange(volume),
    active: chapterInRange(activeChapterNo, volume),
    children: outlines
      .filter(item => item.parent_id === volume.id || chapterInRange(activeChapterNo, item))
      .filter(item => item.id !== volume.id)
      .slice(0, 6)
      .map(child => ({
        key: String(child.id || child.title),
        title: text(child.title, '未命名阶段'),
        chapterRange: chapterRange(child),
        active: chapterInRange(activeChapterNo, child),
      })),
  }))

  return {
    topStatus: {
      projectTitle: text(selectedProject?.title, '小说项目工作台'),
      currentVolume,
      currentStage,
      currentChapterLabel: activeChapterNo ? `第${activeChapterNo}章` : '暂无章节',
      writtenWords,
      targetWords,
      future10Coverage,
      future100Coverage,
      longformHealth: { status, label: healthLabel(status) },
    },
    mainline: {
      readerPromise: text(writingBible?.promise, '读者承诺未设置'),
      currentVolumeGoal,
      currentStageConflict,
      payoffModel: firstNonEmpty([stageFromBible?.payoff_model, writingBible?.payoff_model], '本阶段爽点模型未设置'),
      previousTurn: text(previousTurn?.title, '上一关键转折未标注'),
      nextTurn: text(nextTurn?.title, '下一关键转折未标注'),
      currentChapterServesVolume: Boolean(text(activeChapter?.chapter_goal) && currentVolumeGoal !== '当前卷目标未设置'),
      risks: healthIssues.slice(0, 4).map(issue => issue.title),
    },
    futureRoute,
    volumeTree,
    healthIssues,
  }
}
```

- [ ] **Step 5: Run the model tests**

Run:

```bash
bun run test:planning-workspace
```

Expected: PASS, 3 tests passing.

- [ ] **Step 6: Commit**

```bash
git add package.json ui/web/src/pages/novel-workspace/planningWorkspaceModel.ts ui/web/src/pages/novel-workspace/planningWorkspaceModel.test.ts
git commit -m "feat: derive novel planning workspace model"
```

## Task 2: Story Planning Workspace Component

**Files:**
- Create: `ui/web/src/pages/novel-workspace/StoryPlanningWorkspace.tsx`
- Modify: `ui/web/src/pages/novel-workspace/planningWorkspaceModel.ts`

- [ ] **Step 1: Add a lightweight compile guard by exporting callback types**

Append to `ui/web/src/pages/novel-workspace/planningWorkspaceModel.ts`:

```ts
export type PlanningActionKey =
  | 'update_rolling_plan'
  | 'complete_volume_plan'
  | 'enter_chapter_writing'
  | 'open_outline_tree'
  | 'future100_audit'
  | 'future100_generate'
  | 'longform_pressure'
  | 'topic_validation'
  | 'reference_diagnosis'
  | 'open_story_assets'
  | 'update_story_state'
  | 'open_quality_revision'
```

- [ ] **Step 2: Create the planning component**

Create `ui/web/src/pages/novel-workspace/StoryPlanningWorkspace.tsx`:

```tsx
import React from 'react'
import { Alert, Button, Card, Empty, Progress, Space, Tag, Timeline, Tooltip, Typography } from 'antd'
import {
  BranchesOutlined,
  CheckCircleOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  NodeIndexOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import type { PlanningActionKey, PlanningWorkspaceModel } from './planningWorkspaceModel'

const { Title, Text, Paragraph } = Typography

function healthColor(status: PlanningWorkspaceModel['topStatus']['longformHealth']['status']) {
  if (status === 'healthy') return 'green'
  if (status === 'drifting') return 'gold'
  return 'red'
}

function issueColor(severity: string) {
  if (severity === 'critical') return 'red'
  if (severity === 'warning') return 'gold'
  return 'blue'
}

function formatWords(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return String(value)
}

export function StoryPlanningWorkspace({
  model,
  selectedModelId,
  loadingKey,
  onAction,
  onSelectChapter,
}: {
  model: PlanningWorkspaceModel
  selectedModelId?: number
  loadingKey?: string
  onAction: (key: PlanningActionKey) => void
  onSelectChapter: (chapterId: number) => void
}) {
  const wordPercent = model.topStatus.targetWords > 0
    ? Math.min(100, Math.round((model.topStatus.writtenWords / model.topStatus.targetWords) * 100))
    : 0

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#f6f8fb' }}>
      <div style={{ padding: '16px 20px 24px', display: 'grid', gap: 16 }}>
        <Card size="small" styles={{ body: { padding: 16 } }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 16, alignItems: 'center' }}>
            <Space direction="vertical" size={8} style={{ minWidth: 0 }}>
              <Space wrap>
                <Tag color="blue" bordered={false}>{model.topStatus.currentVolume}</Tag>
                <Tag color="purple" bordered={false}>{model.topStatus.currentStage}</Tag>
                <Tag bordered={false}>{model.topStatus.currentChapterLabel}</Tag>
                <Tag color={healthColor(model.topStatus.longformHealth.status)} bordered={false}>
                  长线健康：{model.topStatus.longformHealth.label}
                </Tag>
              </Space>
              <Space wrap size={[12, 6]}>
                <Text type="secondary">已写 {formatWords(model.topStatus.writtenWords)} / 目标 {formatWords(model.topStatus.targetWords)}</Text>
                <Text type="secondary">未来10章 {model.topStatus.future10Coverage.planned}/{model.topStatus.future10Coverage.required}</Text>
                <Text type="secondary">未来100章 {model.topStatus.future100Coverage.planned}/{model.topStatus.future100Coverage.required}</Text>
              </Space>
              <Progress percent={wordPercent} size="small" showInfo={false} />
            </Space>
            <Space wrap>
              <Button
                icon={<BranchesOutlined />}
                loading={loadingKey === 'rollingPlan'}
                disabled={!selectedModelId}
                onClick={() => onAction('update_rolling_plan')}
              >
                更新滚动规划
              </Button>
              <Button icon={<NodeIndexOutlined />} onClick={() => onAction('complete_volume_plan')}>
                补齐当前卷规划
              </Button>
              <Button type="primary" icon={<EditOutlined />} onClick={() => onAction('enter_chapter_writing')}>
                进入当前章写作
              </Button>
            </Space>
          </div>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16 }}>
          <Space direction="vertical" size={16} style={{ minWidth: 0 }}>
            <Card title="主线与分卷推进" size="small">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <Alert type="info" showIcon message="全书主线承诺" description={model.mainline.readerPromise} />
                <Alert type={model.mainline.currentChapterServesVolume ? 'success' : 'warning'} showIcon message="当前章服务卷目标" description={model.mainline.currentChapterServesVolume ? '当前章已有任务，并能承接卷目标。' : '当前章任务或卷目标不足，需要先补规划。'} />
                <Card size="small" title="当前卷目标"><Paragraph style={{ marginBottom: 0 }}>{model.mainline.currentVolumeGoal}</Paragraph></Card>
                <Card size="small" title="当前阶段冲突"><Paragraph style={{ marginBottom: 0 }}>{model.mainline.currentStageConflict}</Paragraph></Card>
                <Card size="small" title="本阶段爽点模型"><Paragraph style={{ marginBottom: 0 }}>{model.mainline.payoffModel}</Paragraph></Card>
                <Card size="small" title="关键转折"><Paragraph style={{ marginBottom: 0 }}>上一转折：{model.mainline.previousTurn}<br />下一转折：{model.mainline.nextTurn}</Paragraph></Card>
              </div>
              {model.mainline.risks.length > 0 && (
                <Space wrap style={{ marginTop: 12 }}>
                  {model.mainline.risks.map(risk => <Tag key={risk} color="red" bordered={false}>{risk}</Tag>)}
                </Space>
              )}
            </Card>

            <Card
              title="未来 10 章路线"
              size="small"
              extra={<Button size="small" type="link" onClick={() => onAction('open_outline_tree')}>查看完整大纲</Button>}
            >
              {model.futureRoute.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无未来章节路线" />
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {model.futureRoute.map(row => (
                    <div
                      key={row.chapterId || row.chapterNo}
                      onClick={() => row.chapterId && onSelectChapter(row.chapterId)}
                      style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fff', cursor: row.chapterId ? 'pointer' : 'default' }}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color="blue" bordered={false}>第{row.chapterNo}章</Tag>
                          <Text strong>{row.title}</Text>
                          {row.riskTags.map(tag => <Tag key={tag} color="gold" bordered={false}>{tag}</Tag>)}
                        </Space>
                        <Text>{row.chapterTask}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>主线：{row.mainlineProgress} · 爽点：{row.payoff} · 钩子：{row.endingHook}</Text>
                      </Space>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="分卷结构" size="small">
              {model.volumeTree.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无分卷结构" />
              ) : (
                <Timeline
                  items={model.volumeTree.map(volume => ({
                    color: volume.active ? 'blue' : 'gray',
                    dot: volume.active ? <PlayCircleOutlined /> : undefined,
                    children: (
                      <Space direction="vertical" size={4}>
                        <Text strong>{volume.title}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{volume.chapterRange}</Text>
                        <Space wrap>
                          {volume.children.map(child => (
                            <Tag key={child.key} color={child.active ? 'blue' : 'default'} bordered={false}>
                              {child.title} · {child.chapterRange}
                            </Tag>
                          ))}
                        </Space>
                      </Space>
                    ),
                  }))}
                />
              )}
            </Card>
          </Space>

          <Space direction="vertical" size={16} style={{ minWidth: 0 }}>
            <Card title="规划健康" size="small">
              {model.healthIssues.length === 0 ? (
                <Alert type="success" showIcon icon={<CheckCircleOutlined />} message="主线规划暂未发现明显风险" />
              ) : (
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  {model.healthIssues.map(issue => (
                    <Card key={issue.key} size="small" style={{ borderColor: issueColor(issue.severity) === 'red' ? '#ffccc7' : undefined }}>
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space>
                          <ExclamationCircleOutlined style={{ color: issueColor(issue.severity) === 'red' ? '#cf1322' : '#d48806' }} />
                          <Text strong>{issue.title}</Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>{issue.detail}</Text>
                        <Button size="small" block onClick={() => onAction(issue.actionKey)}>{issue.actionLabel}</Button>
                      </Space>
                    </Card>
                  ))}
                </Space>
              )}
            </Card>

            <Card title="低频规划入口" size="small">
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Tooltip title="检查未来 100 章骨架是否覆盖长线节奏">
                  <Button block icon={<FileSearchOutlined />} loading={loadingKey === 'future100Audit'} onClick={() => onAction('future100_audit')}>未来100章骨架检查</Button>
                </Tooltip>
                <Button block type="primary" icon={<ThunderboltOutlined />} loading={loadingKey === 'future100Generate'} onClick={() => onAction('future100_generate')}>AI 生成未来100章骨架</Button>
                <Button block loading={loadingKey === 'longformPressure'} onClick={() => onAction('longform_pressure')}>300万字长线压力测试</Button>
                <Button block loading={loadingKey === 'topic'} onClick={() => onAction('topic_validation')}>原创选题验证</Button>
                <Button block loading={loadingKey === 'referenceDiagnosis'} onClick={() => onAction('reference_diagnosis')}>参考知识诊断</Button>
              </Space>
            </Card>
          </Space>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run build and verify the isolated component compiles**

Run:

```bash
bun run build:web
```

Expected: PASS. The component is not wired yet, but TypeScript must compile.

- [ ] **Step 4: Commit**

```bash
git add ui/web/src/pages/novel-workspace/planningWorkspaceModel.ts ui/web/src/pages/novel-workspace/StoryPlanningWorkspace.tsx
git commit -m "feat: add story planning workspace view"
```

## Task 3: Work Area Switcher And Default Planning Screen

**Files:**
- Modify: `ui/web/src/pages/NovelProjectWorkspace.tsx`

- [ ] **Step 1: Add imports and work-area state**

In `ui/web/src/pages/NovelProjectWorkspace.tsx`, add imports near the existing workspace imports:

```ts
import { StoryPlanningWorkspace } from './novel-workspace/StoryPlanningWorkspace'
import { buildPlanningWorkspaceModel, type PlanningActionKey } from './novel-workspace/planningWorkspaceModel'
```

Add the state near the other view state:

```ts
type WorkspaceArea = 'storyPlanning' | 'chapterWriting' | 'storyAssets' | 'qualityRevision' | 'productionOps'

const [workspaceArea, setWorkspaceArea] = useState<WorkspaceArea>('storyPlanning')
```

Add the derived model after `commercialReadiness` and chapter memos are available:

```ts
const planningWorkspaceModel = useMemo(() => buildPlanningWorkspaceModel({
  selectedProject,
  outlines,
  chapters: sortedChapters,
  activeChapter,
  materialScore: activeChapterDiagnostics?.material_score,
  commercialReadiness,
}), [selectedProject, outlines, sortedChapters, activeChapter, activeChapterDiagnostics?.material_score, commercialReadiness])
```

- [ ] **Step 2: Add the planning action dispatcher**

Add this function before `handleWorkflowMenuClick`:

```ts
const handlePlanningAction = (key: PlanningActionKey) => {
  const actions: Record<PlanningActionKey, () => void> = {
    update_rolling_plan: () => { void runRollingPlan() },
    complete_volume_plan: () => setOutlinePanelOpen(true),
    enter_chapter_writing: () => setWorkspaceArea('chapterWriting'),
    open_outline_tree: () => setOutlineTreeOpen(true),
    future100_audit: () => { void runFuture100SkeletonAudit() },
    future100_generate: () => { void generateFuture100Skeleton() },
    longform_pressure: () => { void runLongformPressureTest() },
    topic_validation: () => { void runTopicValidation() },
    reference_diagnosis: () => { void openReferenceKnowledgeDiagnosis() },
    open_story_assets: () => setWorkspaceArea('storyAssets'),
    update_story_state: () => openStoryStateEditor(),
    open_quality_revision: () => setWorkspaceArea('qualityRevision'),
  }
  actions[key]?.()
}
```

- [ ] **Step 3: Replace the central render with area-aware rendering**

Replace the unconditional `WorkspaceCenter` render with:

```tsx
{workspaceArea === 'storyPlanning' ? (
  <StoryPlanningWorkspace
    model={planningWorkspaceModel}
    selectedModelId={selectedModelId}
    loadingKey={commercialToolLoading}
    onAction={handlePlanningAction}
    onSelectChapter={(chapterId) => {
      void selectChapter(chapterId)
      setWorkspaceArea('chapterWriting')
    }}
  />
) : workspaceArea === 'chapterWriting' ? (
  <WorkspaceCenter
    isEmptyProject={isEmptyProject}
    selectedProject={selectedProject}
    activeChapter={activeChapter}
    materialScore={activeChapterDiagnostics?.material_score}
    worldbuildingCount={worldbuilding.length}
    characterCount={characters.length}
    outlineCount={outlines.length}
    streamingChapterId={streamingChapterId}
    streamingText={streamingText}
    streamingProgress={streamingProgress}
    streamingPercent={streamingPercent}
    generationPipeline={generationPipeline}
    streamingEndRef={streamingEndRef}
    proseEditorRef={proseEditorRef}
    saveStatus={saveStatus}
    planning={planning}
    incubatingOriginal={incubatingOriginal}
    generatingProse={generatingProse}
    generatingSceneCards={generatingSceneCards}
    diagnosticsLoading={diagnosticsLoading}
    pipelineLoading={pipelineLoading}
    editorReportLoading={editorReportLoading}
    onRunPlan={runPlan}
    onCreateOutline={() => openEditor('outline')}
    onCreateChapter={() => openEditor('chapter')}
    onRunOriginalIncubator={() => { void runOriginalIncubator() }}
    onOpenReferenceConfig={() => setReferenceConfigOpen(true)}
    onOpenWritingBibleEditor={() => { void openWritingBibleEditor() }}
    onGenerateCurrentChapterProse={() => generateCurrentChapterProse()}
    onRepairAndGenerateCurrentChapter={repairContextAndGenerateCurrentChapter}
    onGenerateSceneCards={() => generateSceneCardsForActiveChapter()}
    onOpenGenerationDiagnostics={openGenerationDiagnostics}
    onOpenQualityCard={openChapterQualityCard}
    onStartChapterPipeline={startChapterPipeline}
    onCreateEditorReport={createEditorReport}
    onEditActiveChapter={() => activeChapter && openEditor('chapter', activeChapter)}
    onChapterTextChange={(next) => {
      const chapterId = activeChapterId
      setChapters(prev => prev.map(c => c.id === chapterId ? { ...c, chapter_text: next } : c))
      scheduleSave(chapterId, next)
    }}
  />
) : (
  <StoryPlanningWorkspace
    model={planningWorkspaceModel}
    selectedModelId={selectedModelId}
    loadingKey={commercialToolLoading}
    onAction={handlePlanningAction}
    onSelectChapter={(chapterId) => {
      void selectChapter(chapterId)
      setWorkspaceArea('chapterWriting')
    }}
  />
)}
```

The fallback intentionally renders planning again until the dedicated assets, quality, and operations area shells are added in Task 4.

- [ ] **Step 4: Run build**

Run:

```bash
bun run build:web
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add ui/web/src/pages/NovelProjectWorkspace.tsx
git commit -m "feat: default novel workspace to story planning"
```

## Task 4: Five Work Areas And Function收纳

**Files:**
- Modify: `ui/web/src/pages/NovelProjectWorkspace.tsx`

- [ ] **Step 1: Replace the workflow menu cluster with five area buttons**

In the top bar, replace the current five `Dropdown` buttons inside the expanding `Space` with this tab-like switcher:

```tsx
<Space size={4} style={{ flex: 1, minWidth: 0 }}>
  {[
    ['storyPlanning', '故事规划'],
    ['chapterWriting', '章节写作'],
    ['storyAssets', '资料设定'],
    ['qualityRevision', '质检修订'],
    ['productionOps', '生产运营'],
  ].map(([key, label]) => (
    <Button
      key={key}
      size="small"
      type={workspaceArea === key ? 'primary' : 'text'}
      onClick={() => setWorkspaceArea(key as WorkspaceArea)}
    >
      {label}
    </Button>
  ))}
</Space>
```

- [ ] **Step 2: Add assets, quality, and operations area shells**

Add this helper render function before the main `return`:

```tsx
const renderWorkspaceArea = () => {
  if (workspaceArea === 'storyPlanning') {
    return (
      <StoryPlanningWorkspace
        model={planningWorkspaceModel}
        selectedModelId={selectedModelId}
        loadingKey={commercialToolLoading}
        onAction={handlePlanningAction}
        onSelectChapter={(chapterId) => {
          void selectChapter(chapterId)
          setWorkspaceArea('chapterWriting')
        }}
      />
    )
  }
  if (workspaceArea === 'chapterWriting') {
    return (
      <WorkspaceCenter
        isEmptyProject={isEmptyProject}
        selectedProject={selectedProject}
        activeChapter={activeChapter}
        materialScore={activeChapterDiagnostics?.material_score}
        worldbuildingCount={worldbuilding.length}
        characterCount={characters.length}
        outlineCount={outlines.length}
        streamingChapterId={streamingChapterId}
        streamingText={streamingText}
        streamingProgress={streamingProgress}
        streamingPercent={streamingPercent}
        generationPipeline={generationPipeline}
        streamingEndRef={streamingEndRef}
        proseEditorRef={proseEditorRef}
        saveStatus={saveStatus}
        planning={planning}
        incubatingOriginal={incubatingOriginal}
        generatingProse={generatingProse}
        generatingSceneCards={generatingSceneCards}
        diagnosticsLoading={diagnosticsLoading}
        pipelineLoading={pipelineLoading}
        editorReportLoading={editorReportLoading}
        onRunPlan={runPlan}
        onCreateOutline={() => openEditor('outline')}
        onCreateChapter={() => openEditor('chapter')}
        onRunOriginalIncubator={() => { void runOriginalIncubator() }}
        onOpenReferenceConfig={() => setReferenceConfigOpen(true)}
        onOpenWritingBibleEditor={() => { void openWritingBibleEditor() }}
        onGenerateCurrentChapterProse={() => generateCurrentChapterProse()}
        onRepairAndGenerateCurrentChapter={repairContextAndGenerateCurrentChapter}
        onGenerateSceneCards={() => generateSceneCardsForActiveChapter()}
        onOpenGenerationDiagnostics={openGenerationDiagnostics}
        onOpenQualityCard={openChapterQualityCard}
        onStartChapterPipeline={startChapterPipeline}
        onCreateEditorReport={createEditorReport}
        onEditActiveChapter={() => activeChapter && openEditor('chapter', activeChapter)}
        onChapterTextChange={(next) => {
          const chapterId = activeChapterId
          setChapters(prev => prev.map(c => c.id === chapterId ? { ...c, chapter_text: next } : c))
          scheduleSave(chapterId, next)
        }}
      />
    )
  }
  const groups: Record<Exclude<WorkspaceArea, 'storyPlanning' | 'chapterWriting'>, { title: string; desc: string; actions: Array<{ label: string; onClick: () => void; loading?: boolean; primary?: boolean }> }> = {
    storyAssets: {
      title: '资料设定',
      desc: '维护写作圣经、故事状态、角色、世界观、创作资料卡和参考工程。',
      actions: [
        { label: '写作圣经', onClick: () => { void openWritingBibleEditor() }, primary: true },
        { label: '故事状态机', onClick: openStoryStateEditor },
        { label: '创作资料卡中心', onClick: () => setCreativeCardsOpen(true) },
        { label: '参考作品配置', onClick: () => setReferenceConfigOpen(true) },
        { label: '参考工程总览', onClick: () => setReferenceEngineeringOpen(true) },
      ],
    },
    qualityRevision: {
      title: '质检修订',
      desc: '检查当前章、前 30 章、全书连续性、相似度和质量基准。',
      actions: [
        { label: '当前章质量卡', onClick: openChapterQualityCard, primary: true },
        { label: '编辑报告', onClick: createEditorReport, loading: editorReportLoading },
        { label: '章节审阅批注', onClick: () => setReviewAnnotationsOpen(true) },
        { label: '全书一致性图谱', onClick: () => setConsistencyGraphOpen(true) },
        { label: '质量评测基准', onClick: () => setQualityBenchmarkOpen(true) },
        { label: '全书连续性检查', onClick: () => { void openContinuityAudit() }, loading: commercialToolLoading === 'continuityAudit' },
      ],
    },
    productionOps: {
      title: '生产运营',
      desc: '管理章节群、任务队列、生产趋势、Agent 审计、模型诊断和交付备份。',
      actions: [
        { label: '章节生产台', onClick: openProductionDesk, primary: true, loading: commercialToolLoading === 'productionDesk' },
        { label: '任务中心', onClick: () => setTaskCenterOpen(true) },
        { label: '智能章节群入队', onClick: startReadyChapterGroupGeneration, loading: commercialToolLoading === 'readyGroup' },
        { label: '后台任务队列', onClick: openRunQueue, loading: commercialToolLoading === 'queue' },
        { label: '成本质量仪表盘', onClick: openProductionMetrics, loading: commercialToolLoading === 'metrics' },
        { label: '交付导出', onClick: () => setExportDeliveryOpen(true) },
      ],
    },
  }
  const group = groups[workspaceArea]
  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#f6f8fb', padding: 20 }}>
      <Card title={group.title} extra={<Button onClick={() => setWorkspaceArea('storyPlanning')}>返回故事规划</Button>}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Text type="secondary">{group.desc}</Text>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
            {group.actions.map(action => (
              <Button
                key={action.label}
                block
                type={action.primary ? 'primary' : 'default'}
                loading={action.loading}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </Space>
      </Card>
    </div>
  )
}
```

Replace the central conditional from Task 3 with:

```tsx
{renderWorkspaceArea()}
```

- [ ] **Step 3: Run build**

Run:

```bash
bun run build:web
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add ui/web/src/pages/NovelProjectWorkspace.tsx
git commit -m "feat: group novel workspace tools by work area"
```

## Task 5: Demote Chapter Directory Guidance In Planning Mode

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/ChapterDirectorySidebar.tsx`
- Modify: `ui/web/src/pages/NovelProjectWorkspace.tsx`

- [ ] **Step 1: Add a sidebar mode prop**

In `ChapterDirectorySidebar.tsx`, add the prop:

```ts
planningMode?: boolean
```

Add it to the destructured props:

```ts
planningMode = false,
```

Wrap the `ProductionGuidePanel` block:

```tsx
{!planningMode && (
  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
    <ProductionGuidePanel
      selectedModelId={selectedModelId}
      stepOutlineLoading={stepOutlineLoading}
      stepProseLoading={stepProseLoading}
      stepRepairLoading={stepRepairLoading}
      incubatingOriginal={incubatingOriginal}
      bookReviewLoading={bookReviewLoading}
      commercialToolLoading={commercialToolLoading}
      proseProgress={proseProgress}
      chapterCount={chapters.length}
      proseChapterCount={proseChapterCount}
      referenceCount={referenceCount}
      outlineCount={outlineCount}
      worldbuildingCount={worldbuildingCount}
      characterCount={characterCount}
      hasWritingBible={hasWritingBible}
      materialScore={materialScore}
      commercialReadiness={commercialReadiness}
      activeTaskCount={activeTaskCount}
      onOpenOutlinePanel={onOpenOutlinePanel}
      onGenerateProse={onGenerateProse}
      onCancelGenerateProse={onCancelGenerateProse}
      onRunRepair={onRunRepair}
      onOpenReferenceConfig={onOpenReferenceConfig}
      onOpenReferenceEngineering={onOpenReferenceEngineering}
      onOpenCreativeCards={onOpenCreativeCards}
      onRunOriginalIncubator={onRunOriginalIncubator}
      onOpenWritingBibleEditor={onOpenWritingBibleEditor}
      onOpenMaterialRepairPlan={onOpenMaterialRepairPlan}
      onStartReadyChapterGroupGeneration={onStartReadyChapterGroupGeneration}
      onStartChapterGroupGeneration={onStartChapterGroupGeneration}
      onOpenProductionDesk={onOpenProductionDesk}
      onOpenTaskCenter={onOpenTaskCenter}
      onOpenConsistencyGraph={onOpenConsistencyGraph}
      onOpenQualityBenchmark={onOpenQualityBenchmark}
      onRunBookReview={onRunBookReview}
      onOpenCommercialTools={onOpenCommercialTools}
      onOpenExportDelivery={onOpenExportDelivery}
    />
  </div>
)}
```

In planning mode, add a small navigation header above chapter stats:

```tsx
{planningMode && (
  <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', background: '#fbfcfe' }}>
    <Space direction="vertical" size={6} style={{ width: '100%' }}>
      <Text strong style={{ fontSize: 13 }}>章节导航</Text>
      <Text type="secondary" style={{ fontSize: 12 }}>规划首页负责判断方向；这里仅用于定位章节。</Text>
    </Space>
  </div>
)}
```

- [ ] **Step 2: Pass planning mode from the workspace**

In `NovelProjectWorkspace.tsx`, update the existing `ChapterDirectorySidebar` call by inserting this prop immediately before `selectedModelId={selectedModelId}`:

```tsx
planningMode={workspaceArea === 'storyPlanning'}
```

In the same existing `ChapterDirectorySidebar` call, replace the current `onSelectChapter` prop with:

```tsx
onSelectChapter={(chapterId) => {
  void selectChapter(chapterId)
  if (workspaceArea === 'storyPlanning') setWorkspaceArea('chapterWriting')
}}
```

- [ ] **Step 3: Run build**

Run:

```bash
bun run build:web
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add ui/web/src/pages/NovelProjectWorkspace.tsx ui/web/src/pages/novel-workspace/ChapterDirectorySidebar.tsx
git commit -m "feat: make chapter sidebar navigational in planning mode"
```

## Task 6: End-To-End Verification And Documentation

**Files:**
- Modify: `docs/novel-workspace-feature-spec.md`
- Modify: `docs/novel-roadmap-009-progress-log.md`

- [ ] **Step 1: Update the workspace feature spec**

Append a new section to `docs/novel-workspace-feature-spec.md`:

```md
## 1.4 长篇规划优先工作台

本版本将单项目工作台的默认第一屏调整为“故事规划”。

第一屏优先回答：

- 当前卷和当前阶段是什么。
- 当前章是否服务当前卷目标。
- 未来 10 章是否有明确任务、爽点和钩子。
- 分卷结构、关键转折和当前所在位置是否清楚。
- 后续写作是否存在偏线、缺卷目标、缺未来规划或故事状态落后风险。

章节写作、资料设定、质检修订和生产运营仍保留为顶部工作区入口。
```

- [ ] **Step 2: Update the progress log**

Append to `docs/novel-roadmap-009-progress-log.md`:

```md
## 2026-05-22 - 长篇规划优先工作台

- 将小说项目工作台默认首页规划为故事规划 cockpit。
- 新增主线与分卷推进、未来 10 章路线、分卷结构和规划健康提醒的前端模型与界面。
- 将工具入口收纳为故事规划、章节写作、资料设定、质检修订、生产运营五个工作区。
- 章节目录在规划模式下降级为导航入口，避免与主线规划争夺注意力。
```

- [ ] **Step 3: Run focused tests**

Run:

```bash
bun run test:planning-workspace
```

Expected: PASS, 3 tests passing.

- [ ] **Step 4: Run web build**

Run:

```bash
bun run build:web
```

Expected: PASS.

- [ ] **Step 5: Run server build**

Run:

```bash
bun run build:server
```

Expected: PASS.

- [ ] **Step 6: Run whitespace check**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 7: Commit docs and any verification fixes**

```bash
git add docs/novel-workspace-feature-spec.md docs/novel-roadmap-009-progress-log.md
git commit -m "docs: record planning workspace update"
```

If verification fixes were required, include those touched files in the same commit and mention them in the final handoff.

## Self-Review

- Spec coverage:
  - Default story planning screen: Tasks 2-4.
  - Mainline and volume panel: Tasks 1-2.
  - Future 10-chapter route: Tasks 1-2.
  - Volume structure tree: Tasks 1-2.
  - Planning health sidebar: Tasks 1-2.
  - Chapter directory demotion: Task 5.
  - Five work areas: Task 4.
  - Existing tools remain available: Tasks 3-4.
- Placeholder scan:
  - No placeholder keywords or unspecified implementation steps remain.
- Type consistency:
  - `PlanningActionKey`, `PlanningWorkspaceModel`, and `buildPlanningWorkspaceModel` are introduced before use.
  - `workspaceArea` values match all render branches.
