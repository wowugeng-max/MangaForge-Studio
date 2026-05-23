# Chapter Planning Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an auto-expanding chapter planning desk inside the writing cockpit so the user sees whether the current chapter is ready to write before generating prose.

**Architecture:** Extend the existing pure cockpit model with a `chapterPlanningDesk` slice, wire active chapter diagnostics and context package into `NovelProjectWorkspace`, then render a compact planning desk in `WritingCockpitPanel`. The first implementation reuses existing API endpoints and handlers instead of adding backend orchestration.

**Tech Stack:** React, TypeScript, Ant Design, Bun test, existing `apiClient` REST calls.

---

## File Structure

- Modify `ui/web/src/pages/novel-workspace/writingCockpitModel.ts`
  - Add planning desk action keys.
  - Add `ChapterPlanningDeskModel` types.
  - Add pure helpers for context package, diagnostics blockers, and scene cards.
  - Include `chapterPlanningDesk` in `WritingCockpitModel`.
- Modify `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`
  - Add tests for no chapter, missing context, insufficient context, missing scene cards, diagnostics blockers, ready state, auto-expand, and recommended action.
- Modify `ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx`
  - Render the chapter planning desk beneath the current cockpit summary.
  - Keep it automatically expanded when the model says it should expand.
  - Keep the visual hierarchy compact and action-oriented.
- Modify `ui/web/src/pages/NovelProjectWorkspace.tsx`
  - Load `GET /api/novel/chapters/:chapterId/context-package` for the active chapter.
  - Pass context package and diagnostics into `buildWritingCockpitModel`.
  - Add action routing for refresh context, diagnostics, scene plan generation, and confirm-plan-to-draft.

## Task 1: Add Planning Desk Model Tests

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`
- Test: `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`

- [ ] **Step 1: Add test fixtures near the existing `chapters` fixture**

Add this code after the `chapters` constant:

```ts
const contextPackage = {
  chapter_target: {
    chapter_goal: '用警钟把边军危机压到王府筵席上',
    previous_handoff: '王府内钟声先乱',
    core_conflict: '谢怀安要借钟声验人心，王府管事试图把警讯压成误传',
    emotional_movement: '从压抑回府转为当众夺回主动权',
    payoff: '读者看到失势皇子第一次反压王府新贵',
    ending_hook: '城门守将递来带血腰牌',
    forbidden_repeats: ['不要重复解释穿越设定'],
  },
  preflight: {
    ready: true,
    blockers: [],
  },
}

const sceneCardChapter = {
  ...chapters[1],
  scene_list: [
    {
      scene_no: 1,
      title: '警钟入席',
      purpose: '把边军警讯压到王府筵席上',
      conflict: '管事试图把警讯压成误传',
      turn: '谢怀安当众点出腰牌血迹',
      ending_hook: '第三声钟响后，守将闯入',
    },
  ],
}
```

- [ ] **Step 2: Add failing tests for the planning desk**

Add these tests before the final `})` in the `describe('buildWritingCockpitModel', ...)` block:

```ts
  test('planning desk shows empty state without an active chapter', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [],
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('blocked')
    expect(model.chapterPlanningDesk.statusLabel).toBe('缺目标章节')
    expect(model.chapterPlanningDesk.shouldAutoExpandPlanner).toBe(true)
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_outline_panel')
  })

  test('planning desk requires context package before scene planning', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('needs_context')
    expect(model.chapterPlanningDesk.contextPackageStatus).toBe('missing')
    expect(model.chapterPlanningDesk.shouldAutoExpandPlanner).toBe(true)
    expect(model.chapterPlanningDesk.reasons).toContain('本章还没有加载上下文包。')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('refresh_context_package')
  })

  test('planning desk treats failed context preflight as insufficient context', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      contextPackage: {
        ...contextPackage,
        preflight: {
          ready: false,
          blockers: ['缺少章节目标'],
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('needs_context')
    expect(model.chapterPlanningDesk.contextPackageStatus).toBe('insufficient')
    expect(model.chapterPlanningDesk.reasons).toContain('上下文包预检未通过：缺少章节目标')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
  })

  test('planning desk asks for scene cards when context is ready but scene plan is missing', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      contextPackage,
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('needs_scene_plan')
    expect(model.chapterPlanningDesk.contextPackageStatus).toBe('ready')
    expect(model.chapterPlanningDesk.scenePlanStatus).toBe('missing')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('build_scene_plan')
  })

  test('planning desk blocks drafting when diagnostics report blockers', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage,
      diagnostics: {
        preflight: {
          ready: false,
          blockers: ['缺少上一章承接'],
        },
        material_score: { score: 88, can_generate: true },
      },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('blocked')
    expect(model.chapterPlanningDesk.reasons).toContain('生成诊断阻塞：缺少上一章承接')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
    expect(model.chapterPlanningDesk.shouldAutoExpandPlanner).toBe(true)
  })

  test('planning desk is ready when context and scene cards are usable', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage,
      diagnostics: {
        preflight: { ready: true, blockers: [] },
        material_score: { score: 88, can_generate: true },
      },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('ready')
    expect(model.chapterPlanningDesk.statusLabel).toBe('本章可写')
    expect(model.chapterPlanningDesk.shouldAutoExpandPlanner).toBe(false)
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('confirm_plan_and_write_draft')
    expect(model.chapterPlanningDesk.episodePlan.chapterObjective).toBe('用警钟把边军危机压到王府筵席上')
    expect(model.chapterPlanningDesk.sceneCards).toHaveLength(1)
    expect(model.chapterPlanningDesk.sceneCards[0].endingHook).toBe('第三声钟响后，守将闯入')
  })
```

- [ ] **Step 3: Run the focused test and verify it fails**

Run:

```bash
bun run test:writing-cockpit
```

Expected: FAIL because `chapterPlanningDesk` and the new action keys do not exist yet.

## Task 2: Implement The Pure Planning Desk Model

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/writingCockpitModel.ts`
- Test: `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`

- [ ] **Step 1: Add new action keys and model types**

In `WritingCockpitActionKey`, add these union members:

```ts
  | 'refresh_context_package'
  | 'open_generation_diagnostics'
  | 'confirm_plan_and_write_draft'
```

Add these interfaces after `WritingCockpitChapter`:

```ts
export type ChapterPlanningReadiness = 'ready' | 'needs_context' | 'needs_scene_plan' | 'blocked'
export type ChapterContextPackageStatus = 'missing' | 'insufficient' | 'ready'
export type ChapterScenePlanStatus = 'missing' | 'ready'

export interface ChapterPlanningDeskSceneCard {
  sceneNo: number
  title: string
  purpose: string
  conflict: string
  turn: string
  endingHook: string
}

export interface ChapterPlanningDeskModel {
  readiness: ChapterPlanningReadiness
  statusLabel: string
  contextPackageStatus: ChapterContextPackageStatus
  scenePlanStatus: ChapterScenePlanStatus
  reasons: string[]
  recommendedPlannerAction: {
    key: WritingCockpitActionKey
    label: string
  }
  shouldAutoExpandPlanner: boolean
  episodePlan: {
    chapterObjective: string
    previousHandoff: string
    coreConflict: string
    emotionalMovement: string
    payoff: string
    endingHook: string
    forbiddenRepeats: string[]
  }
  sceneCards: ChapterPlanningDeskSceneCard[]
}
```

- [ ] **Step 2: Extend input and output interfaces**

Add this property to `WritingCockpitModel`:

```ts
  chapterPlanningDesk: ChapterPlanningDeskModel
```

Add this property to `BuildWritingCockpitModelInput`:

```ts
  contextPackage?: AnyRecord | null
```

- [ ] **Step 3: Add action labels**

Add these entries to `ACTION_LABELS`:

```ts
  refresh_context_package: '刷新上下文包',
  open_generation_diagnostics: '查看生成诊断',
  confirm_plan_and_write_draft: '确认计划，进入初稿',
```

- [ ] **Step 4: Add helper functions before `buildWritingCockpitModel`**

Add this code before `export function buildWritingCockpitModel`:

```ts
function contextPreflight(contextPackage?: AnyRecord | null) {
  return contextPackage?.preflight || contextPackage?.context_package?.preflight || {}
}

function contextTarget(contextPackage?: AnyRecord | null) {
  return contextPackage?.chapter_target || contextPackage?.context_package?.chapter_target || {}
}

function blockerTexts(value: any): string[] {
  if (!Array.isArray(value)) return []
  return value.map(item => {
    if (typeof item === 'string') return text(item)
    return firstNonEmpty(item?.message, item?.reason, item?.detail, item?.label)
  }).filter(Boolean)
}

function contextPackageStatus(contextPackage?: AnyRecord | null): ChapterContextPackageStatus {
  if (!contextPackage) return 'missing'
  const preflight = contextPreflight(contextPackage)
  const target = contextTarget(contextPackage)
  const blockers = blockerTexts(preflight?.blockers)
  if (preflight?.ready === false || blockers.length > 0) return 'insufficient'
  const hasTarget = Boolean(
    firstNonEmpty(target?.chapter_goal, target?.chapterObjective)
    && firstNonEmpty(target?.core_conflict, target?.coreConflict)
    && firstNonEmpty(target?.ending_hook, target?.endingHook),
  )
  if (preflight?.ready === true || hasTarget) return 'ready'
  return 'insufficient'
}

function diagnosticsBlockers(diagnostics?: AnyRecord | null): string[] {
  const preflight = diagnostics?.preflight || {}
  return blockerTexts(preflight?.blockers)
}

function chapterSceneCards(chapter?: AnyRecord | null): ChapterPlanningDeskSceneCard[] {
  const rawCards = Array.isArray(chapter?.scene_list) && chapter.scene_list.length > 0
    ? chapter.scene_list
    : (Array.isArray(chapter?.scene_breakdown) ? chapter.scene_breakdown : [])

  return rawCards.map((scene: AnyRecord, index: number) => ({
    sceneNo: Number(scene?.scene_no || index + 1),
    title: text(scene?.title || scene?.name || scene?.description || scene?.purpose, `场景 ${index + 1}`),
    purpose: firstNonEmpty(scene?.purpose, scene?.description, scene?.goal),
    conflict: firstNonEmpty(scene?.conflict, scene?.tension),
    turn: firstNonEmpty(scene?.turn, scene?.reveal, scene?.beat),
    endingHook: firstNonEmpty(scene?.ending_hook, scene?.endingHook, scene?.exit_state, scene?.hook),
  }))
}

function buildEpisodePlan(args: {
  nextChapter: AnyRecord | null
  cockpitChapter: WritingCockpitChapter | null
  contextPackage?: AnyRecord | null
}): ChapterPlanningDeskModel['episodePlan'] {
  const target = contextTarget(args.contextPackage)
  return {
    chapterObjective: firstNonEmpty(target?.chapter_goal, target?.chapterObjective, args.cockpitChapter?.chapterGoal),
    previousHandoff: firstNonEmpty(target?.previous_handoff, target?.previousHandoff, args.cockpitChapter?.previousEnding),
    coreConflict: firstNonEmpty(target?.core_conflict, target?.coreConflict, args.cockpitChapter?.conflict),
    emotionalMovement: firstNonEmpty(target?.emotional_movement, target?.emotionalMovement, target?.emotion),
    payoff: firstNonEmpty(target?.payoff, target?.reader_reward, target?.readerReward),
    endingHook: firstNonEmpty(target?.ending_hook, target?.endingHook, args.cockpitChapter?.endingHook),
    forbiddenRepeats: stringArray(target?.forbidden_repeats).length > 0
      ? stringArray(target?.forbidden_repeats)
      : (args.cockpitChapter?.forbiddenRepeats || []),
  }
}

function buildChapterPlanningDesk(args: {
  nextChapter: AnyRecord | null
  cockpitChapter: WritingCockpitChapter | null
  contextPackage?: AnyRecord | null
  diagnostics?: AnyRecord | null
}): ChapterPlanningDeskModel {
  const contextStatus = contextPackageStatus(args.contextPackage)
  const sceneCards = chapterSceneCards(args.nextChapter)
  const scenePlanStatus: ChapterScenePlanStatus = sceneCards.length > 0 ? 'ready' : 'missing'
  const diagnosticBlockers = diagnosticsBlockers(args.diagnostics)
  const preflightBlockers = blockerTexts(contextPreflight(args.contextPackage)?.blockers)
  const episodePlan = buildEpisodePlan(args)

  if (!args.nextChapter) {
    return {
      readiness: 'blocked',
      statusLabel: '缺目标章节',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons: ['需要先创建或选择章节。'],
      recommendedPlannerAction: { key: 'open_outline_panel', label: ACTION_LABELS.open_outline_panel },
      shouldAutoExpandPlanner: true,
      episodePlan,
      sceneCards,
    }
  }

  if (diagnosticBlockers.length > 0) {
    return {
      readiness: 'blocked',
      statusLabel: '诊断阻塞',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons: diagnosticBlockers.slice(0, 3).map(item => `生成诊断阻塞：${item}`),
      recommendedPlannerAction: { key: 'open_generation_diagnostics', label: ACTION_LABELS.open_generation_diagnostics },
      shouldAutoExpandPlanner: true,
      episodePlan,
      sceneCards,
    }
  }

  if (contextStatus === 'missing') {
    return {
      readiness: 'needs_context',
      statusLabel: '需补上下文',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons: ['本章还没有加载上下文包。'],
      recommendedPlannerAction: { key: 'refresh_context_package', label: ACTION_LABELS.refresh_context_package },
      shouldAutoExpandPlanner: true,
      episodePlan,
      sceneCards,
    }
  }

  if (contextStatus === 'insufficient') {
    const reasons = preflightBlockers.length > 0
      ? preflightBlockers.slice(0, 3).map(item => `上下文包预检未通过：${item}`)
      : ['上下文包预检未通过。']
    return {
      readiness: 'needs_context',
      statusLabel: '上下文不足',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons,
      recommendedPlannerAction: { key: 'open_generation_diagnostics', label: ACTION_LABELS.open_generation_diagnostics },
      shouldAutoExpandPlanner: true,
      episodePlan,
      sceneCards,
    }
  }

  if (scenePlanStatus === 'missing') {
    return {
      readiness: 'needs_scene_plan',
      statusLabel: '需补场景计划',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons: ['本章还没有可用场景卡。'],
      recommendedPlannerAction: { key: 'build_scene_plan', label: ACTION_LABELS.build_scene_plan },
      shouldAutoExpandPlanner: true,
      episodePlan,
      sceneCards,
    }
  }

  return {
    readiness: 'ready',
    statusLabel: '本章可写',
    contextPackageStatus: contextStatus,
    scenePlanStatus,
    reasons: ['本章场景计划已就绪，可以进入初稿。'],
    recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: ACTION_LABELS.confirm_plan_and_write_draft },
    shouldAutoExpandPlanner: false,
    episodePlan,
    sceneCards,
  }
}
```

- [ ] **Step 5: Wire the model into `buildWritingCockpitModel`**

Before the final `return`, create a cockpit chapter variable:

```ts
  const cockpitNextChapter = nextChapter ? toCockpitChapter(nextChapter, { previousChapter, volumeGoal: volume.goal, outline: nextChapterOutline }) : null
  const cockpitPreviousChapter = previousChapter ? toCockpitChapter(previousChapter, { volumeGoal: volume.goal, outline: previousChapterOutline }) : null
  const chapterPlanningDesk = buildChapterPlanningDesk({
    nextChapter,
    cockpitChapter: cockpitNextChapter,
    contextPackage: input.contextPackage || null,
    diagnostics: input.diagnostics || null,
  })
```

Use these variables in the returned object:

```ts
    nextChapter: cockpitNextChapter,
    previousChapter: cockpitPreviousChapter,
    chapterPlanningDesk,
```

- [ ] **Step 6: Run the focused test and verify it passes**

Run:

```bash
bun run test:writing-cockpit
```

Expected: PASS.

- [ ] **Step 7: Commit the pure model change**

Run:

```bash
git add ui/web/src/pages/novel-workspace/writingCockpitModel.ts ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts
git commit -m "feat: model chapter planning desk"
```

## Task 3: Render The Planning Desk In The Cockpit

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx`
- Test: `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`

- [ ] **Step 1: Update imports**

Change the React import:

```ts
import React, { useEffect, useState } from 'react'
```

Change the Ant Design import:

```ts
import { Alert, Button, Card, Col, Progress, Row, Space, Tag, Typography } from 'antd'
```

No new Ant Design component is required.

- [ ] **Step 2: Add planning desk color and text helpers**

Add these helpers after `readinessStatus`:

```tsx
function plannerColor(readiness: string) {
  if (readiness === 'ready') return 'green'
  if (readiness === 'needs_scene_plan') return 'blue'
  if (readiness === 'needs_context') return 'gold'
  return 'red'
}

function compactPlanValue(value: string, fallback: string) {
  return value && value.trim() ? value : fallback
}
```

- [ ] **Step 3: Add a `ChapterPlanningDesk` component**

Add this component above `export function WritingCockpitPanel`:

```tsx
function ChapterPlanningDesk({
  model,
  loading,
  onAction,
}: {
  model: WritingCockpitModel
  loading: boolean
  onAction: (key: WritingCockpitActionKey) => void
}) {
  const desk = model.chapterPlanningDesk
  const [expanded, setExpanded] = useState(desk.shouldAutoExpandPlanner)

  useEffect(() => {
    setExpanded(desk.shouldAutoExpandPlanner)
  }, [desk.shouldAutoExpandPlanner, model.nextChapter?.id])

  const plan = desk.episodePlan

  return (
    <Card
      size="small"
      style={{ borderRadius: 8, borderColor: desk.readiness === 'ready' ? '#d9f7be' : '#ffe7ba' }}
      styles={{ body: { padding: 12 } }}
    >
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Row gutter={[12, 8]} align="middle">
          <Col xs={24} lg={14}>
            <Space wrap size={[6, 4]}>
              <Tag color={plannerColor(desk.readiness)} bordered={false}>{desk.statusLabel}</Tag>
              <Tag bordered={false}>上下文：{desk.contextPackageStatus === 'ready' ? '已就绪' : desk.contextPackageStatus === 'insufficient' ? '不足' : '未加载'}</Tag>
              <Tag bordered={false}>场景卡：{desk.scenePlanStatus === 'ready' ? `${desk.sceneCards.length} 个` : '缺失'}</Tag>
            </Space>
            <Paragraph ellipsis={{ rows: expanded ? 3 : 1 }} style={{ margin: '6px 0 0', fontSize: 12 }}>
              {desk.reasons.slice(0, 3).join('；')}
            </Paragraph>
          </Col>
          <Col xs={24} lg={10}>
            <Space wrap style={{ justifyContent: 'flex-end', width: '100%' }}>
              <Button size="small" onClick={() => setExpanded(value => !value)}>
                {expanded ? '收起编剧台' : '展开编剧台'}
              </Button>
              <Button
                type={desk.readiness === 'ready' ? 'primary' : 'default'}
                size="small"
                loading={loading}
                onClick={() => onAction(desk.recommendedPlannerAction.key)}
                style={{ whiteSpace: 'normal', height: 'auto', lineHeight: 1.25 }}
              >
                {desk.recommendedPlannerAction.label}
              </Button>
            </Space>
          </Col>
        </Row>

        {expanded && (
          <Row gutter={[12, 10]}>
            <Col xs={24} lg={10}>
              <Card size="small" title="本章编剧计划" styles={{ body: { padding: 10 } }}>
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  <Text strong>{compactPlanValue(plan.chapterObjective, '待补章节目标')}</Text>
                  <Text type="secondary">承接：{compactPlanValue(plan.previousHandoff, '待确认上一章承接')}</Text>
                  <Text type="secondary">冲突：{compactPlanValue(plan.coreConflict, '待补核心冲突')}</Text>
                  <Text type="secondary">情绪：{compactPlanValue(plan.emotionalMovement, '待补情绪推进')}</Text>
                  <Text type="secondary">爽点：{compactPlanValue(plan.payoff, '待补读者回报')}</Text>
                  <Text type="secondary">钩子：{compactPlanValue(plan.endingHook, '待补结尾钩子')}</Text>
                  {plan.forbiddenRepeats.length > 0 && (
                    <Space wrap size={[4, 4]}>
                      {plan.forbiddenRepeats.slice(0, 4).map(item => (
                        <Tag key={item} color="red" bordered={false}>{item}</Tag>
                      ))}
                    </Space>
                  )}
                </Space>
              </Card>
            </Col>
            <Col xs={24} lg={14}>
              <Card size="small" title="场景卡" styles={{ body: { padding: 10 } }}>
                {desk.sceneCards.length > 0 ? (
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    {desk.sceneCards.slice(0, 4).map(scene => (
                      <div key={`${scene.sceneNo}-${scene.title}`} style={{ border: '1px solid #edf0f5', borderRadius: 6, padding: 8 }}>
                        <Space direction="vertical" size={3} style={{ width: '100%' }}>
                          <Space wrap size={[4, 4]}>
                            <Tag color="blue" bordered={false}>场景 {scene.sceneNo}</Tag>
                            <Text strong>{scene.title}</Text>
                          </Space>
                          <Text type="secondary">目的：{compactPlanValue(scene.purpose, '待补')}</Text>
                          <Text type="secondary">冲突：{compactPlanValue(scene.conflict, '待补')}</Text>
                          <Text type="secondary">转折：{compactPlanValue(scene.turn, '待补')}</Text>
                          <Text type="secondary">钩子：{compactPlanValue(scene.endingHook, '待补')}</Text>
                        </Space>
                      </div>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary">还没有场景卡。先生成场景计划，再进入初稿。</Text>
                )}
              </Card>
            </Col>
          </Row>
        )}
      </Space>
    </Card>
  )
}
```

- [ ] **Step 4: Render the desk inside `WritingCockpitPanel`**

Inside the top-level `<Space direction="vertical" ...>` in `WritingCockpitPanel`, add this block after `{blockerAlert(model, loading, onAction)}`:

```tsx
          <ChapterPlanningDesk model={model} loading={loading} onAction={onAction} />
```

- [ ] **Step 5: Run build to catch JSX and type errors**

Run:

```bash
bun run build:web
```

Expected: PASS.

- [ ] **Step 6: Commit the UI rendering change**

Run:

```bash
git add ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx
git commit -m "feat: render chapter planning desk"
```

## Task 4: Wire Context Package And Actions In The Workspace

**Files:**
- Modify: `ui/web/src/pages/NovelProjectWorkspace.tsx`
- Test: `ui/web/src/pages/novel-workspace/writingCockpitModel.test.ts`

- [ ] **Step 1: Add context package state**

Near the existing `activeChapterDiagnostics` state, add:

```ts
  const [activeChapterContextPackage, setActiveChapterContextPackage] = useState<any | null>(null)
  const [contextPackageLoading, setContextPackageLoading] = useState(false)
```

- [ ] **Step 2: Add a reusable context package loader**

Add this function after the diagnostics loading `useEffect`:

```ts
  const loadActiveChapterContextPackage = async (options: { silent?: boolean } = {}) => {
    if (!activeChapter?.id || !projectId) {
      setActiveChapterContextPackage(null)
      return null
    }
    setContextPackageLoading(true)
    try {
      const res = await apiClient.get(`/novel/chapters/${activeChapter.id}/context-package`, {
        params: { project_id: projectId },
      })
      setActiveChapterContextPackage(res.data || null)
      if (!options.silent) message.success('上下文包已刷新')
      return res.data || null
    } catch (error: any) {
      setActiveChapterContextPackage(null)
      if (!options.silent) message.error(error?.response?.data?.error || error?.message || '上下文包加载失败')
      return null
    } finally {
      setContextPackageLoading(false)
    }
  }
```

- [ ] **Step 3: Load context package when the active chapter changes**

Add this `useEffect` after `loadActiveChapterContextPackage`:

```ts
  useEffect(() => {
    void loadActiveChapterContextPackage({ silent: true })
  }, [activeChapter?.id, activeChapter?.updated_at, projectId])
```

- [ ] **Step 4: Pass context package and full diagnostics into the cockpit model**

Change the `buildWritingCockpitModel` call:

```ts
  const writingCockpitModel = useMemo(() => buildWritingCockpitModel({
    project: selectedProject,
    chapters: sortedChapters,
    outlines,
    activeChapter,
    contextPackage: activeChapterContextPackage,
    diagnostics: activeChapterDiagnostics,
    materialScore: activeChapterDiagnostics?.material_score || null,
    commercialReadiness,
    activeRuns: activeTasks,
  }), [
    selectedProject,
    sortedChapters,
    outlines,
    activeChapter,
    activeChapterContextPackage,
    activeChapterDiagnostics,
    commercialReadiness,
    activeTasks,
  ])
```

- [ ] **Step 5: Include context loading in the cockpit loading prop**

Change the `WritingCockpitPanel` loading prop:

```tsx
              loading={stepProseLoading || generatingProse || generatingSceneCards || diagnosticsLoading || contextPackageLoading}
```

- [ ] **Step 6: Route the new cockpit actions**

Add these cases to `handleWritingCockpitAction`:

```ts
      case 'refresh_context_package':
        void loadActiveChapterContextPackage()
        break
      case 'open_generation_diagnostics':
        void openGenerationDiagnostics()
        break
      case 'confirm_plan_and_write_draft':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId) {
          void selectChapterForWriting(targetChapterId).then((saved) => {
            if (saved) void generateCurrentChapterProse({ targetChapterId })
          })
        } else {
          void generateCurrentChapterProse()
        }
        break
```

- [ ] **Step 7: Run focused tests and build**

Run:

```bash
bun run test:writing-cockpit
bun run build:web
```

Expected: both PASS.

- [ ] **Step 8: Commit workspace wiring**

Run:

```bash
git add ui/web/src/pages/NovelProjectWorkspace.tsx
git commit -m "feat: wire chapter planning desk actions"
```

## Task 5: Final Verification

**Files:**
- Verify: `ui/web/src/pages/novel-workspace/writingCockpitModel.ts`
- Verify: `ui/web/src/pages/novel-workspace/WritingCockpitPanel.tsx`
- Verify: `ui/web/src/pages/NovelProjectWorkspace.tsx`

- [ ] **Step 1: Run writing cockpit tests**

Run:

```bash
bun run test:writing-cockpit
```

Expected: PASS with all writing cockpit model tests passing.

- [ ] **Step 2: Run planning workspace tests**

Run:

```bash
bun run test:planning-workspace
```

Expected: PASS with all planning workspace model tests passing.

- [ ] **Step 3: Run web build**

Run:

```bash
bun run build:web
```

Expected: PASS.

- [ ] **Step 4: Check whitespace**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 5: Inspect final git state**

Run:

```bash
git status --short
```

Expected: no unstaged implementation changes after all task commits.
