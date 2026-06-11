# Longform Serial Cockpit V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the automatic creation workspace first screen into a compact longform serial cockpit with one next action, five subscription guardrails, current-chapter production chain, batch license, and risk queue.

**Architecture:** Add a derived `serialCockpit` block to `autoCreationDirectorModel.ts` using existing planning and writing data. Render that block at the top of `AutoCreationDirectorWorkspace.tsx`, keeping detailed panels inside the existing evidence drawer. No database, backend route, or provider-runtime changes are part of this plan.

**Tech Stack:** React, TypeScript, Ant Design, Bun tests, existing novel workspace model tests.

---

## File Structure

- Modify `ui/web/src/pages/novel-workspace/autoCreationDirectorModel.ts`
  - Add derived cockpit types.
  - Add helper functions for guardrails, chapter chain, risk queue, and `buildSerialCockpit`.
  - Add `serialCockpit` to `AutoCreationDirectorModel`.
- Modify `ui/web/src/pages/novel-workspace/autoCreationDirectorModel.test.ts`
  - Add tests for guardrails, chapter chain, risk queue, and degraded missing-source behavior.
- Modify `ui/web/src/pages/novel-workspace/AutoCreationDirectorWorkspace.tsx`
  - Render the new first-screen cockpit block.
  - Keep detailed evidence under the existing `details.auto-director-detail-drawer`.
- Modify `ui/web/src/pages/novel-workspace/AutoCreationDirectorWorkspace.css`
  - Add scoped styles for `auto-director-serial-cockpit-*`.
  - Keep the existing button loading model.
- Modify `ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts`
  - Add shell guards for visible labels and new CSS class names.
- Modify `docs/novel-usage-guide.md`
  - Add a short usage note for the longform serial cockpit.

Do not stage or commit `workspace/providers.json`.

---

## Task 1: Model Tests For Serial Cockpit

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/autoCreationDirectorModel.test.ts`

- [ ] **Step 1: Add a passing-data test for the cockpit shape**

Append this test near the existing `today command deck` tests:

```ts
  test('builds a longform serial cockpit from existing director signals', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ title: '资格争夺', goal: '主角拿到试炼资格' }],
          reasons: [],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认计划，进入初稿' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认计划，进入初稿',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.serialCockpit.title).toBe('长篇连载驾驶舱')
    expect(model.serialCockpit.command.action.key).toBe('confirm_plan_and_write_draft')
    expect(model.serialCockpit.guardrails.map(item => item.key)).toEqual([
      'core_stability',
      'story_drive',
      'reader_pull',
      'innovation_ip',
      'serial_safety',
    ])
    expect(model.serialCockpit.guardrails.every(item => item.status === 'ok')).toBe(true)
    expect(model.serialCockpit.chapterChain.map(item => item.key)).toEqual([
      'handoff',
      'brief',
      'draft',
      'quality',
      'state_sync',
      'delivery',
    ])
    expect(model.serialCockpit.chapterChain.find(item => item.key === 'brief')?.status).toBe('done')
    expect(model.serialCockpit.chapterChain.find(item => item.key === 'draft')?.status).toBe('current')
    expect(model.serialCockpit.batchLicense.status).toBe('single_chapter')
    expect(model.serialCockpit.riskQueue.length).toBe(0)
  })
```

- [ ] **Step 2: Add a risk aggregation test**

Append this test near delivery risk tests:

```ts
  test('serial cockpit summarizes open risks into a compact queue', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        first30Retention: {
          ...basePlanning.first30Retention,
          status: 'stale',
          stale: true,
          score: 70,
          summary: '前30章报告已过期。',
        },
        storylineBoard: {
          ...basePlanning.storylineBoard,
          status: 'needs_attention',
          overdueCount: 1,
          debtCount: 1,
          summary: '主线第8章应推进但未推进。',
        },
      },
      writing: {
        ...baseWriting,
        chapterAcceptanceDesk: {
          ...baseWriting.chapterAcceptanceDesk,
          visible: true,
          acceptanceStatus: 'needs_revision',
          statusLabel: '待修订',
          deliveryRiskQueue: {
            totalCount: 3,
            label: '待修复 3',
            priorityLabel: '优先补追读',
            items: ['开篇未承接上一章钩子', '主角选择不清', '章末钩子弱'],
          },
          assetIntake: {
            status: 'pending',
            label: '新资产 2 待确认',
            pendingCount: 2,
          },
          readerExpectationSync: {
            status: 'warn',
            label: '期待欠账 1',
            score: 72,
            scoreLabel: '72',
            missedCount: 1,
            openingHandoffMissedCount: 0,
          },
          recommendedAcceptanceAction: { key: 'apply_editor_revision', label: '生成修订稿' },
        },
      },
      activeTasks: [],
      reviews: [
        {
          review_type: 'delivery_risk_annotations',
          summary: '待修复 3',
          payload_json: { open_count: 3 },
          created_at: '2026-06-11T01:00:00.000Z',
        },
      ],
      selectedModelId: 12,
    })

    expect(model.serialCockpit.riskQueue.map(item => item.key)).toEqual(expect.arrayContaining([
      'delivery_risks',
      'storylines',
      'reader_expectation',
      'first30_retention',
      'asset_intake',
    ]))
    expect(model.serialCockpit.riskQueue.find(item => item.key === 'delivery_risks')?.label).toBe('待修复 3')
    expect(model.serialCockpit.riskQueue.find(item => item.key === 'asset_intake')?.count).toBe(2)
    expect(model.serialCockpit.guardrails.find(item => item.key === 'reader_pull')?.status).toBe('warn')
    expect(model.serialCockpit.guardrails.find(item => item.key === 'serial_safety')?.status).toBe('warn')
  })
```

- [ ] **Step 3: Add a missing-source degradation test**

Append this test near the other model resilience tests:

```ts
  test('serial cockpit degrades gracefully when chapter material is missing', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        mainline: {
          ...basePlanning.mainline,
          readerPromise: '',
          currentVolumeGoal: '',
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: null,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'blocked',
          statusLabel: '缺少章节',
          reasons: ['还没有可写章节。'],
          recommendedPlannerAction: { key: 'open_outline_panel', label: '打开大纲面板' },
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.serialCockpit.chapterChain.find(item => item.key === 'handoff')?.status).toBe('block')
    expect(model.serialCockpit.chapterChain.find(item => item.key === 'handoff')?.detail).toContain('还没有可写章节')
    expect(model.serialCockpit.guardrails.find(item => item.key === 'core_stability')?.status).toBe('block')
    expect(model.serialCockpit.command.action.key).toBe('open_outline_panel')
  })
```

- [ ] **Step 4: Run tests and verify failure**

Run:

```bash
bun test ui/web/src/pages/novel-workspace/autoCreationDirectorModel.test.ts
```

Expected: tests fail because `serialCockpit` is not defined on `AutoCreationDirectorModel`.

---

## Task 2: Derived Serial Cockpit Model

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/autoCreationDirectorModel.ts`
- Test: `ui/web/src/pages/novel-workspace/autoCreationDirectorModel.test.ts`

- [ ] **Step 1: Add serial cockpit types**

Insert these types after `AutoCreationTodayCommandDeck`:

```ts
export type AutoCreationSerialCockpitStatus = 'ok' | 'warn' | 'block'
export type AutoCreationChapterChainStatus = 'done' | 'current' | 'pending' | 'warn' | 'block'

export interface AutoCreationSerialGuardrail {
  key: 'core_stability' | 'story_drive' | 'reader_pull' | 'innovation_ip' | 'serial_safety'
  label: string
  status: AutoCreationSerialCockpitStatus
  detail: string
  count: number
  action: AutoCreationDirectorAction
}

export interface AutoCreationChapterChainStep {
  key: 'handoff' | 'brief' | 'draft' | 'quality' | 'state_sync' | 'delivery'
  label: string
  status: AutoCreationChapterChainStatus
  detail: string
  action: AutoCreationDirectorAction
}

export interface AutoCreationRiskQueueItem {
  key: 'delivery_risks' | 'storylines' | 'reader_expectation' | 'first30_retention' | 'asset_intake' | 'batch_risks'
  label: string
  count: number
  status: AutoCreationSerialCockpitStatus
  detail: string
  action: AutoCreationDirectorAction
}

export interface AutoCreationSerialCockpit {
  title: string
  summary: string
  command: AutoCreationTodayCommandDeck
  guardrails: AutoCreationSerialGuardrail[]
  chapterChain: AutoCreationChapterChainStep[]
  batchLicense: AutoCreationProductionLicense
  riskQueue: AutoCreationRiskQueueItem[]
}
```

- [ ] **Step 2: Add `serialCockpit` to the director interface**

In `AutoCreationDirectorModel`, add this field after `todayCommandDeck`:

```ts
  serialCockpit: AutoCreationSerialCockpit
```

- [ ] **Step 3: Add status helper functions**

Insert these helpers before `buildAutoCreationDirectorModel`:

```ts
function mergeCockpitStatus(...statuses: AutoCreationSerialCockpitStatus[]): AutoCreationSerialCockpitStatus {
  if (statuses.includes('block')) return 'block'
  if (statuses.includes('warn')) return 'warn'
  return 'ok'
}

function signalToCockpitStatus(status: any): AutoCreationSerialCockpitStatus {
  const normalized = text(status)
  if (normalized === 'block' || normalized === 'blocked') return 'block'
  if (normalized === 'warn' || normalized === 'warning' || normalized === 'needs_action' || normalized === 'needs_attention' || normalized === 'stale') return 'warn'
  return 'ok'
}

function cockpitStatusFromCount(count: number, highCount = 0): AutoCreationSerialCockpitStatus {
  if (highCount > 0) return 'block'
  if (count > 0) return 'warn'
  return 'ok'
}
```

- [ ] **Step 4: Add guardrail builder**

Insert this function before `buildAutoCreationDirectorModel`:

```ts
function buildSerialGuardrails(args: {
  creationContract: AutoCreationContractItem[]
  chapterLaunchGate: AutoCreationChapterLaunchGate
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  longformCompass: AutoCreationLongformCompass
  millionWordRunway: AutoCreationMillionWordRunway
  writing: WritingCockpitModel
  planning: PlanningWorkspaceModel
  batchGuardrail: AutoCreationBatchGuardrail
  productionLicense: AutoCreationProductionLicense
}): AutoCreationSerialGuardrail[] {
  const acceptance = args.writing.chapterAcceptanceDesk
  const contractCore = args.creationContract.find(item => item.key === 'core')
  const contractStory = args.creationContract.find(item => item.key === 'story')
  const contractInnovation = args.creationContract.find(item => item.key === 'innovation')
  const contractReader = args.creationContract.find(item => item.key === 'reader_pull')
  const delivery = args.deliveryRiskGate
  const deliveryCategory = (key: AutoCreationDeliveryRiskGateCategory['key']) => delivery.categories.find(item => item.key === key)
  const storylineCount = Number(acceptance.storylineSync?.missedCount || 0) + Number(acceptance.storylineSync?.forbiddenCount || 0)
  const expectationDebtCount = Number(acceptance.readerExpectationSync?.missedCount || 0)
    + Number(acceptance.readerExpectationSync?.openingHandoffMissedCount || 0)
  const attractionWeakCount = Number(acceptance.chapterAttraction?.weakCount || 0)
  const innovationMissed = Number(acceptance.innovationSync?.missedCount || 0)
    + Number(acceptance.signatureSceneSync?.missedCount || 0)
    + Number(acceptance.volumeBeatSync?.missedCount || 0)
  const serialRiskCount = storylineCount
    + Number(acceptance.assetIntake?.pendingCount || 0)
    + Number(deliveryCategory('storyline')?.count || 0)
    + Number(deliveryCategory('story_unit')?.count || 0)

  return [
    {
      key: 'core_stability',
      label: '核心不偏移',
      status: mergeCockpitStatus(
        signalToCockpitStatus(contractCore?.status),
        signalToCockpitStatus(args.longformCompass.status),
        cockpitStatusFromCount(Number(deliveryCategory('delivery_core')?.count || 0), Number(deliveryCategory('delivery_core')?.highCount || 0)),
        signalToCockpitStatus(args.millionWordRunway.gates.find(gate => gate.key === 'core_compass')?.status),
      ),
      detail: contractCore?.detail || args.longformCompass.summary || '核心承诺、主角驱动和长期方向保持可追踪。',
      count: Number(deliveryCategory('delivery_core')?.count || 0),
      action: planningAction('open_outline_tree', '查看全书核心契约、主轴护栏和长期方向。'),
    },
    {
      key: 'story_drive',
      label: '故事驱动力',
      status: mergeCockpitStatus(
        signalToCockpitStatus(contractStory?.status),
        signalToCockpitStatus(args.chapterLaunchGate.status),
        signalToCockpitStatus(acceptance.storyDriveSync?.status),
        cockpitStatusFromCount(Number(deliveryCategory('story_drive')?.count || 0), Number(deliveryCategory('story_drive')?.highCount || 0)),
      ),
      detail: acceptance.storyDriveSync?.priorityLabel || args.chapterLaunchGate.summary || contractStory?.detail || '本章目标、阻碍、代价和状态变化保持明确。',
      count: Number(acceptance.storyDriveSync?.missedCount || 0) + Number(deliveryCategory('story_drive')?.count || 0),
      action: args.chapterLaunchGate.action,
    },
    {
      key: 'reader_pull',
      label: '读者追读',
      status: mergeCockpitStatus(
        signalToCockpitStatus(contractReader?.status),
        signalToCockpitStatus(acceptance.readerExpectationSync?.status),
        signalToCockpitStatus(acceptance.readerRetentionSync?.status),
        signalToCockpitStatus(acceptance.chapterAttraction?.status),
        signalToCockpitStatus(args.planning.first30Retention?.status),
        cockpitStatusFromCount(Number(deliveryCategory('reader_expectation')?.count || 0) + Number(deliveryCategory('reader_retention')?.count || 0)),
      ),
      detail: acceptance.readerExpectationSync?.label
        || acceptance.chapterAttraction?.priorityLabel
        || args.planning.first30Retention?.summary
        || '章节承诺、爽点回报和章末翻页理由保持可见。',
      count: expectationDebtCount + attractionWeakCount + Number(deliveryCategory('reader_expectation')?.count || 0) + Number(deliveryCategory('reader_retention')?.count || 0),
      action: acceptance.readerExpectationSync?.status === 'warn'
        ? writingAction('apply_editor_revision', '按读者期待欠账修订当前章。', '按期待修订')
        : planningAction('run_first30_retention', '运行或刷新前30章留存诊断。'),
    },
    {
      key: 'innovation_ip',
      label: '创新/IP场面',
      status: mergeCockpitStatus(
        signalToCockpitStatus(contractInnovation?.status),
        signalToCockpitStatus(acceptance.innovationSync?.status),
        signalToCockpitStatus(acceptance.signatureSceneSync?.status),
        signalToCockpitStatus(acceptance.volumeBeatSync?.status),
        cockpitStatusFromCount(Number(deliveryCategory('innovation')?.count || 0) + Number(deliveryCategory('signature_scene')?.count || 0)),
      ),
      detail: acceptance.signatureSceneSync?.label || acceptance.innovationSync?.label || contractInnovation?.detail || '差异化设定、可传播场面和卷级爆点保持可执行。',
      count: innovationMissed + Number(deliveryCategory('innovation')?.count || 0) + Number(deliveryCategory('signature_scene')?.count || 0),
      action: planningAction('complete_volume_plan', '补齐创新执行、强场面和卷级爆点预算。'),
    },
    {
      key: 'serial_safety',
      label: '连载安全',
      status: mergeCockpitStatus(
        signalToCockpitStatus(args.batchGuardrail.status),
        signalToCockpitStatus(args.productionLicense.status === 'blocked' ? 'block' : args.productionLicense.status === 'single_chapter' ? 'warn' : 'ok'),
        signalToCockpitStatus(acceptance.storylineSync?.status),
        cockpitStatusFromCount(serialRiskCount),
      ),
      detail: args.productionLicense.summary || args.batchGuardrail.summary || '正史同步、剧情线、资产入库和批量连写护栏保持可控。',
      count: serialRiskCount,
      action: args.productionLicense.nextAction,
    },
  ]
}
```

- [ ] **Step 5: Add chapter-chain builder**

Insert this function after `buildSerialGuardrails`:

```ts
function buildChapterChain(writing: WritingCockpitModel): AutoCreationChapterChainStep[] {
  const chapter = writing.nextChapter
  const planningDesk = writing.chapterPlanningDesk
  const acceptance = writing.chapterAcceptanceDesk
  const handoff = writing.chapterHandoffDesk
  const hasChapter = Boolean(chapter)
  const hasProse = Boolean(chapter?.hasProse || Number(chapter?.wordCount || 0) > 0)
  const hasBrief = planningDesk.readiness === 'ready' || planningDesk.scenePlanStatus === 'ready' || planningDesk.sceneCards.length > 0
  const qualityDone = acceptance.qualityScore !== null || Boolean(acceptance.latestQualityReviewId)
  const needsRevision = ['needs_revision', 'needs_recheck'].includes(acceptance.acceptanceStatus)
  const synced = acceptance.storyStateSynced
  const delivered = acceptance.acceptanceStatus === 'delivered'
  const actionForMissingChapter = writingAction('open_outline_panel', '先补齐章节大纲，创建可写章节。', '打开大纲面板')
  const handoffAction = writingAction(handoff.actionKey || 'accept_chapter_and_continue', handoff.label || '查看章节交接', handoff.actionLabel || '查看交接')

  return [
    {
      key: 'handoff',
      label: '交接',
      status: !hasChapter ? 'block' : handoff.visible && handoff.status === 'needs_delivery' ? 'warn' : 'done',
      detail: !hasChapter ? '还没有可写章节。' : handoff.visible ? handoff.label : '上一章钩子、期待欠账和故事状态已接入。',
      action: !hasChapter ? actionForMissingChapter : handoffAction,
    },
    {
      key: 'brief',
      label: '任务书',
      status: !hasChapter ? 'pending' : hasBrief ? 'done' : 'current',
      detail: hasBrief ? planningDesk.statusLabel || '章节任务书和场景卡可用。' : planningDesk.reasons[0] || '先补章节开写任务书或场景卡。',
      action: writingAction(planningDesk.recommendedPlannerAction.key || 'build_scene_plan', '补齐章节任务书、场景卡和本章生成约束。', planningDesk.recommendedPlannerAction.label || '补章节计划'),
    },
    {
      key: 'draft',
      label: '初稿',
      status: !hasChapter || !hasBrief ? 'pending' : hasProse ? 'done' : 'current',
      detail: hasProse ? `当前正文约 ${chapter?.wordCount || 0} 字。` : '生成正文前必须确认任务书和场景预算。',
      action: writingAction('confirm_plan_and_write_draft', '确认任务书并生成本章初稿。', '确认并生成'),
    },
    {
      key: 'quality',
      label: '质检',
      status: !hasProse ? 'pending' : needsRevision ? 'warn' : qualityDone ? 'done' : 'current',
      detail: !hasProse ? '初稿生成后进入质检。' : needsRevision ? acceptance.statusLabel : qualityDone ? '质量复检已有结果。' : '运行质量复检和编辑报告。',
      action: writingAction(needsRevision ? 'apply_editor_revision' : 'refresh_current_quality', needsRevision ? '按风险清单生成修订稿。' : '复检当前正文质量。', needsRevision ? '生成修订稿' : '复检当前版本'),
    },
    {
      key: 'state_sync',
      label: '状态同步',
      status: !hasProse || !qualityDone ? 'pending' : synced ? 'done' : 'current',
      detail: synced ? '故事状态已同步到当前章。' : '交稿前需要同步正史、剧情线和新资产候选。',
      action: writingAction('sync_story_state', '同步故事状态、剧情线和资产候选。', '同步故事状态'),
    },
    {
      key: 'delivery',
      label: '交稿',
      status: delivered ? 'done' : acceptance.acceptanceStatus === 'ready_to_accept' ? 'current' : acceptance.visible ? 'warn' : 'pending',
      detail: delivered ? '本章已交稿。' : acceptance.visible ? acceptance.statusLabel : '完成质检、修订和状态同步后验收。',
      action: writingAction('accept_chapter_and_continue', '验收当前章并进入下一章。', '验收并进入下一章'),
    },
  ]
}
```

- [ ] **Step 6: Add risk-queue builder**

Insert this function after `buildChapterChain`:

```ts
function buildSerialRiskQueue(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  batchReviewQueue: AutoCreationBatchReviewQueue
}): AutoCreationRiskQueueItem[] {
  const acceptance = args.writing.chapterAcceptanceDesk
  const risks: AutoCreationRiskQueueItem[] = []
  if (args.deliveryRiskGate.totalOpen > 0 || acceptance.deliveryRiskQueue?.totalCount) {
    const count = Number(acceptance.deliveryRiskQueue?.totalCount || args.deliveryRiskGate.totalOpen || 0)
    risks.push({
      key: 'delivery_risks',
      label: acceptance.deliveryRiskQueue?.label || `待修复 ${count}`,
      count,
      status: args.deliveryRiskGate.highOpen > 0 ? 'block' : 'warn',
      detail: acceptance.deliveryRiskQueue?.priorityLabel || args.deliveryRiskGate.summary,
      action: opsAction('create_delivery_risk_repair', '生成风险修复任务', args.deliveryRiskGate.summary || '把交稿风险转成可执行修复任务。'),
    })
  }
  const storylineCount = Number(args.planning.storylineBoard?.overdueCount || 0)
    + Number(args.planning.storylineBoard?.debtCount || 0)
    + Number(acceptance.storylineSync?.missedCount || 0)
    + Number(acceptance.storylineSync?.forbiddenCount || 0)
  if (storylineCount > 0) {
    risks.push({
      key: 'storylines',
      label: `剧情线 ${storylineCount}`,
      count: storylineCount,
      status: Number(acceptance.storylineSync?.forbiddenCount || 0) > 0 ? 'block' : 'warn',
      detail: args.planning.storylineBoard?.summary || acceptance.storylineSync?.label || '剧情线推进和禁揭边界需要确认。',
      action: planningAction('open_story_assets', '打开资料设定页，校准剧情线资产和本章调用关系。'),
    })
  }
  const expectationCount = Number(acceptance.readerExpectationSync?.missedCount || 0)
    + Number(acceptance.readerExpectationSync?.openingHandoffMissedCount || 0)
  if (expectationCount > 0) {
    risks.push({
      key: 'reader_expectation',
      label: `期待欠账 ${expectationCount}`,
      count: expectationCount,
      status: 'warn',
      detail: acceptance.readerExpectationSync?.label || '读者期待承诺没有在正文中充分兑现。',
      action: writingAction('apply_editor_revision', '按读者期待欠账修订当前章。', '按期待修订'),
    })
  }
  if (args.planning.first30Retention?.status === 'stale' || acceptance.first30RetentionRecheck) {
    risks.push({
      key: 'first30_retention',
      label: '留存需复诊',
      count: 1,
      status: 'warn',
      detail: acceptance.first30RetentionRecheck?.reason || args.planning.first30Retention?.summary || '前30章章节更新后需要重新诊断留存。',
      action: planningAction('run_first30_retention', '重新运行前30章留存诊断。'),
    })
  }
  if (acceptance.assetIntake?.pendingCount) {
    risks.push({
      key: 'asset_intake',
      label: acceptance.assetIntake.label,
      count: acceptance.assetIntake.pendingCount,
      status: 'warn',
      detail: '正文中新人物、物品、能力、势力、地点或伏笔需要作者确认入库。',
      action: planningAction('open_story_assets', '进入资料设定页确认新资产候选。'),
    })
  }
  if (args.batchReviewQueue.visible && ['warn', 'risk'].includes(args.batchReviewQueue.status)) {
    const count = Math.max(1, args.batchReviewQueue.riskRadar?.signals?.filter(item => item.status === 'warn').length || 0)
    risks.push({
      key: 'batch_risks',
      label: `批次风险 ${count}`,
      count,
      status: args.batchReviewQueue.status === 'risk' ? 'block' : 'warn',
      detail: args.batchReviewQueue.summary,
      action: args.batchReviewQueue.nextAction,
    })
  }
  return risks
}
```

- [ ] **Step 7: Add cockpit builder and return field**

Insert this function after `buildSerialRiskQueue`:

```ts
function buildSerialCockpit(args: {
  planning: PlanningWorkspaceModel
  writing: WritingCockpitModel
  todayCommandDeck: AutoCreationTodayCommandDeck
  creationContract: AutoCreationContractItem[]
  chapterLaunchGate: AutoCreationChapterLaunchGate
  deliveryRiskGate: AutoCreationDeliveryRiskGate
  longformCompass: AutoCreationLongformCompass
  millionWordRunway: AutoCreationMillionWordRunway
  batchGuardrail: AutoCreationBatchGuardrail
  productionLicense: AutoCreationProductionLicense
  batchReviewQueue: AutoCreationBatchReviewQueue
}): AutoCreationSerialCockpit {
  const riskQueue = buildSerialRiskQueue(args)
  const guardrails = buildSerialGuardrails(args)
  const primaryRisk = riskQueue[0]
  return {
    title: '长篇连载驾驶舱',
    summary: primaryRisk
      ? `当前优先处理：${primaryRisk.label}。${primaryRisk.detail}`
      : args.todayCommandDeck.summary,
    command: args.todayCommandDeck,
    guardrails,
    chapterChain: buildChapterChain(args.writing),
    batchLicense: args.productionLicense,
    riskQueue,
  }
}
```

In `buildAutoCreationDirectorModel`, after `todayCommandDeck` is created, add:

```ts
  const serialCockpit = buildSerialCockpit({
    planning,
    writing,
    todayCommandDeck,
    creationContract,
    chapterLaunchGate,
    deliveryRiskGate,
    longformCompass,
    millionWordRunway,
    batchGuardrail,
    productionLicense,
    batchReviewQueue,
  })
```

In the returned object, add:

```ts
    serialCockpit,
```

immediately after `todayCommandDeck`.

- [ ] **Step 8: Run model tests**

Run:

```bash
bun test ui/web/src/pages/novel-workspace/autoCreationDirectorModel.test.ts
```

Expected: all tests in the file pass.

---

## Task 3: Workspace Shell Guards And JSX Refactor

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts`
- Modify: `ui/web/src/pages/novel-workspace/AutoCreationDirectorWorkspace.tsx`

- [ ] **Step 1: Add shell guard assertions**

In the existing director workspace shell assertions, add these expectations near the current `今日指挥条` assertions:

```ts
    expect(directorWorkspace).toContain('model.serialCockpit')
    expect(directorWorkspace).toContain('长篇连载驾驶舱')
    expect(directorWorkspace).toContain('今日唯一动作')
    expect(directorWorkspace).toContain('万订五项护栏')
    expect(directorWorkspace).toContain('当前章生产链')
    expect(directorWorkspace).toContain('连写许可')
    expect(directorWorkspace).toContain('待处理风险')
    expect(directorWorkspace).toContain('auto-director-serial-cockpit')
    expect(directorWorkspace).toContain('auto-director-cockpit-guardrails')
    expect(directorWorkspace).toContain('auto-director-cockpit-chain')
    expect(directorWorkspace).toContain('auto-director-cockpit-risks')
```

- [ ] **Step 2: Run shell test and verify failure**

Run:

```bash
bun test ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts
```

Expected: test fails because the JSX does not render the new cockpit block yet.

- [ ] **Step 3: Add status-label helpers to JSX file**

In `AutoCreationDirectorWorkspace.tsx`, after `qualityGateColor`, add:

```tsx
function cockpitStatusColor(status: string) {
  if (status === 'ok' || status === 'done') return 'green'
  if (status === 'block') return 'red'
  if (status === 'current') return 'blue'
  if (status === 'warn') return 'gold'
  return 'default'
}

function cockpitChainLabel(status: string) {
  if (status === 'done') return '完成'
  if (status === 'current') return '当前'
  if (status === 'block') return '阻塞'
  if (status === 'warn') return '待修'
  return '等待'
}
```

- [ ] **Step 4: Render cockpit data near the top**

Inside the component, after `const todayCommandDeck = model.todayCommandDeck`, add:

```tsx
  const serialCockpit = model.serialCockpit
```

Replace the current first `section` with class `auto-director-command-deck` with this block, preserving the existing `ActionButton`:

```tsx
      <section className={`auto-director-panel auto-director-serial-cockpit auto-director-command-deck-${serialCockpit.command.status}`}>
        <div className="auto-director-panel-title">
          <FireOutlined />
          <span>{serialCockpit.title}</span>
          <Tag color={productionLicenseColor(serialCockpit.command.status)} bordered={false}>
            {serialCockpit.command.modeLabel}
          </Tag>
          <Tag color="blue" bordered={false}>今日唯一动作</Tag>
        </div>

        <div className="auto-director-cockpit-command">
          <div className="auto-director-cockpit-command-copy">
            <Text strong>{serialCockpit.summary}</Text>
            <Text type="secondary">当前：{serialCockpit.command.currentStepLabel}</Text>
            {serialCockpit.command.reasons.length > 0 && (
              <div className="auto-director-command-reasons">
                {serialCockpit.command.reasons.slice(0, 3).map(reason => <Text key={reason} type="secondary">{reason}</Text>)}
              </div>
            )}
          </div>
          <ActionButton
            primary
            action={serialCockpit.command.action}
            loadingActionKey={loadingActionKey}
            onAction={onAction}
          />
        </div>

        <div className="auto-director-cockpit-guardrails" aria-label="万订五项护栏">
          <Text className="auto-director-cockpit-section-title">万订五项护栏</Text>
          {serialCockpit.guardrails.map(item => (
            <button
              key={item.key}
              type="button"
              className={`auto-director-cockpit-guardrail auto-director-cockpit-guardrail-${item.status}`}
              onClick={() => onAction(item.action)}
            >
              <span>
                <Tag color={cockpitStatusColor(item.status)} bordered={false}>
                  {item.status === 'ok' ? '稳' : item.status === 'block' ? '阻' : '警'}
                </Tag>
                <Text strong>{item.label}</Text>
                {item.count > 0 && <Tag bordered={false}>{item.count}</Tag>}
              </span>
              <Text type="secondary">{item.detail}</Text>
            </button>
          ))}
        </div>

        <div className="auto-director-cockpit-lower">
          <div className="auto-director-cockpit-chain" aria-label="当前章生产链">
            <Text className="auto-director-cockpit-section-title">当前章生产链</Text>
            {serialCockpit.chapterChain.map((step, index) => (
              <button
                key={step.key}
                type="button"
                className={`auto-director-cockpit-chain-step auto-director-cockpit-chain-step-${step.status}`}
                onClick={() => onAction(step.action)}
              >
                <span className="auto-director-cockpit-chain-index">{index + 1}</span>
                <span className="auto-director-cockpit-chain-copy">
                  <Text strong>{step.label}</Text>
                  <Text type="secondary">{step.detail}</Text>
                </span>
                <Tag color={cockpitStatusColor(step.status)} bordered={false}>{cockpitChainLabel(step.status)}</Tag>
              </button>
            ))}
          </div>

          <div className="auto-director-cockpit-side">
            <div className="auto-director-cockpit-license">
              <Text className="auto-director-cockpit-section-title">连写许可</Text>
              <Space wrap>
                <Tag color={productionLicenseColor(serialCockpit.batchLicense.status)} bordered={false}>
                  {serialCockpit.batchLicense.modeLabel}
                </Tag>
                {serialCockpit.batchLicense.safeChapterCount > 0 && (
                  <Tag bordered={false}>放行 {serialCockpit.batchLicense.safeChapterCount} 章</Tag>
                )}
              </Space>
              <Text type="secondary">{serialCockpit.batchLicense.summary}</Text>
            </div>

            <div className="auto-director-cockpit-risks">
              <Text className="auto-director-cockpit-section-title">待处理风险</Text>
              {serialCockpit.riskQueue.length > 0 ? (
                serialCockpit.riskQueue.slice(0, 6).map(item => (
                  <button
                    key={item.key}
                    type="button"
                    className={`auto-director-cockpit-risk auto-director-cockpit-risk-${item.status}`}
                    onClick={() => onAction(item.action)}
                  >
                    <span>
                      <Tag color={cockpitStatusColor(item.status)} bordered={false}>{item.label}</Tag>
                      {item.count > 0 && <Tag bordered={false}>{item.count}</Tag>}
                    </span>
                    <Text type="secondary">{item.detail}</Text>
                  </button>
                ))
              ) : (
                <Text type="secondary">当前没有阻塞连载推进的聚合风险。</Text>
              )}
            </div>
          </div>
        </div>
      </section>
```

- [ ] **Step 5: Keep the existing detailed sections under the drawer**

Ensure the `details.auto-director-detail-drawer` still contains:

```tsx
<span>展开详细依据</span>
```

and continues to wrap the existing `AI长篇创作流水线`, `长篇作战台`, `连载生产轨道`, `生产许可`, and `连载日更作战` sections.

- [ ] **Step 6: Run shell tests**

Run:

```bash
bun test ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts
```

Expected: shell tests pass.

---

## Task 4: Cockpit CSS

**Files:**
- Modify: `ui/web/src/pages/novel-workspace/AutoCreationDirectorWorkspace.css`
- Test: `ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts`

- [ ] **Step 1: Add scoped cockpit styles**

Append this CSS near the existing command deck styles:

```css
.auto-director-serial-cockpit {
  display: grid;
  gap: 14px;
  border-color: #c7d2fe;
  background: #fbfdff;
}

.auto-director-cockpit-command {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  border: 1px solid #dbeafe;
  border-radius: 10px;
  background: #ffffff;
  padding: 12px;
}

.auto-director-cockpit-command-copy {
  min-width: 0;
  display: grid;
  gap: 5px;
}

.auto-director-cockpit-section-title {
  font-size: 12px;
  font-weight: 800;
  color: #334155;
}

.auto-director-cockpit-guardrails {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
}

.auto-director-cockpit-guardrail,
.auto-director-cockpit-chain-step,
.auto-director-cockpit-risk {
  width: 100%;
  border: 1px solid #e5eaf2;
  border-radius: 9px;
  background: #fff;
  padding: 10px;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}

.auto-director-cockpit-guardrail:hover,
.auto-director-cockpit-chain-step:hover,
.auto-director-cockpit-risk:hover {
  border-color: #93c5fd;
  background: #f8fbff;
  transform: translateY(-1px);
}

.auto-director-cockpit-guardrail span,
.auto-director-cockpit-risk span {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.auto-director-cockpit-guardrail-ok {
  border-color: #dcfce7;
}

.auto-director-cockpit-guardrail-warn,
.auto-director-cockpit-risk-warn {
  border-color: #fde68a;
  background: #fffbeb;
}

.auto-director-cockpit-guardrail-block,
.auto-director-cockpit-risk-block {
  border-color: #fecaca;
  background: #fff7f7;
}

.auto-director-cockpit-lower {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
  gap: 12px;
  align-items: start;
}

.auto-director-cockpit-chain,
.auto-director-cockpit-side,
.auto-director-cockpit-license,
.auto-director-cockpit-risks {
  min-width: 0;
  display: grid;
  gap: 8px;
}

.auto-director-cockpit-chain-step {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.auto-director-cockpit-chain-index {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  background: #eff6ff;
  color: #1677ff;
  font-weight: 800;
  font-size: 12px;
}

.auto-director-cockpit-chain-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.auto-director-cockpit-chain-step-done {
  border-color: #dcfce7;
}

.auto-director-cockpit-chain-step-current {
  border-color: #bfdbfe;
  background: #f8fbff;
}

.auto-director-cockpit-chain-step-warn {
  border-color: #fde68a;
  background: #fffbeb;
}

.auto-director-cockpit-chain-step-block {
  border-color: #fecaca;
  background: #fff7f7;
}

.auto-director-cockpit-license,
.auto-director-cockpit-risks {
  border: 1px solid #e5eaf2;
  border-radius: 9px;
  background: #ffffff;
  padding: 10px;
}
```

- [ ] **Step 2: Add responsive rules**

Near the existing media queries, add:

```css
@media (max-width: 1180px) {
  .auto-director-cockpit-guardrails {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .auto-director-cockpit-lower {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .auto-director-cockpit-command,
  .auto-director-cockpit-chain-step {
    grid-template-columns: 1fr;
  }

  .auto-director-cockpit-guardrails {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 3: Add shell CSS guards**

In `workspaceUiShell.test.ts`, add these expectations beside existing CSS checks:

```ts
    expect(directorCss).toContain('.auto-director-serial-cockpit')
    expect(directorCss).toContain('.auto-director-cockpit-guardrails')
    expect(directorCss).toContain('.auto-director-cockpit-chain')
    expect(directorCss).toContain('.auto-director-cockpit-risks')
```

- [ ] **Step 4: Run shell tests**

Run:

```bash
bun test ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts
```

Expected: shell tests pass.

---

## Task 5: Usage Guide Update

**Files:**
- Modify: `docs/novel-usage-guide.md`

- [ ] **Step 1: Add cockpit usage note**

In the section that describes the automatic creation control desk, add this paragraph:

```md
`长篇连载驾驶舱` 是自动创作总控台的首屏入口。作者每天先看 `今日唯一动作`，再看 `万订五项护栏`：核心不偏移、故事驱动力、读者追读、创新/IP场面、连载安全。当前章生产链按 `交接 -> 任务书 -> 初稿 -> 质检 -> 状态同步 -> 交稿` 展示，不需要在多个面板之间推断下一步。`连写许可` 会明确当前是禁止连写、只放行 1 章，还是允许小批量连写；`待处理风险` 会把交稿风险、剧情线、期待欠账、留存复诊、新资产和批次风险压成可点击队列。
```

- [ ] **Step 2: Add progress-log bullet**

In the current capability record near the existing automatic creation desk bullets, add:

```md
- 自动创作总控台升级为 `长篇连载驾驶舱`，首屏聚合今日唯一动作、万订五项护栏、当前章生产链、连写许可和待处理风险，详细依据默认收起。
```

- [ ] **Step 3: Check docs diff**

Run:

```bash
git diff -- docs/novel-usage-guide.md
```

Expected: only the usage guide additions above are present.

---

## Task 6: Full Verification And Commit

**Files:**
- Verify all modified files.

- [ ] **Step 1: Run targeted model and UI tests**

Run:

```bash
bun test ui/web/src/pages/novel-workspace/autoCreationDirectorModel.test.ts ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts
```

Expected: both test files pass.

- [ ] **Step 2: Run workspace regression script**

Run:

```bash
bun run test:writing-cockpit
```

Expected: writing cockpit regression passes.

- [ ] **Step 3: Run type/check script**

Run:

```bash
bun run check
```

Expected: check script passes.

- [ ] **Step 4: Run whitespace diff check**

Run:

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 5: Confirm staged files exclude local provider config**

Run:

```bash
git status --short
git diff --name-only
```

Expected: changed files for this feature are limited to:

```text
ui/web/src/pages/novel-workspace/autoCreationDirectorModel.ts
ui/web/src/pages/novel-workspace/autoCreationDirectorModel.test.ts
ui/web/src/pages/novel-workspace/AutoCreationDirectorWorkspace.tsx
ui/web/src/pages/novel-workspace/AutoCreationDirectorWorkspace.css
ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts
docs/novel-usage-guide.md
```

`workspace/providers.json` may appear in the worktree from earlier local changes, but do not stage it.

- [ ] **Step 6: Stage and commit only feature files**

Run:

```bash
git add ui/web/src/pages/novel-workspace/autoCreationDirectorModel.ts \
  ui/web/src/pages/novel-workspace/autoCreationDirectorModel.test.ts \
  ui/web/src/pages/novel-workspace/AutoCreationDirectorWorkspace.tsx \
  ui/web/src/pages/novel-workspace/AutoCreationDirectorWorkspace.css \
  ui/web/src/pages/novel-workspace/workspaceUiShell.test.ts \
  docs/novel-usage-guide.md
git commit -m "Improve longform serial cockpit"
```

Expected: commit succeeds without staging provider config or unrelated model-management files.

---

## Self-Review

- Spec coverage: the plan covers one next action, five guardrails, chapter chain, batch license, risk queue, collapsed evidence, loading behavior preservation, model tests, UI shell tests, docs, and verification.
- No open-ended implementation steps remain.
- Type names are consistent across model, JSX, and tests: `serialCockpit`, `AutoCreationSerialCockpit`, `AutoCreationSerialGuardrail`, `AutoCreationChapterChainStep`, and `AutoCreationRiskQueueItem`.
- Scope stays within the novel workspace. Provider runtime, Claude compatibility, database schema, and backend generation routes are not touched.
