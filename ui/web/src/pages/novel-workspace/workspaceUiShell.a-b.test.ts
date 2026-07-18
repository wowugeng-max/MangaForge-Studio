import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  source,
  serverSource,
  sourceCached,
  localSourceCache,
  packageSourceCache,
  packageSource,
  writingServiceSource,
  editorRoutesSource,
  commercialOpsRoutesSource,
  directorModelSource,
  planningWorkspaceSource,
  workspaceCenterSource,
  projectWorkspaceSource,
  writingCockpitPanelSource,
  taskCenterSource,
  storyPlanningWorkspaceSource,
  autoCreationDirectorWorkspaceSource,
  writingCockpitModelSource,
  writingRecommendationModelSource,
} from './workspaceUiShellSource'

describe('commercial writing workspace UI shell a b', () => {
  test('keeps the shared novel pipeline stage rail compact enough to scan at once', () => {
    const projectWorkspace = projectWorkspaceSource()
    const css = source('../NovelProjectWorkspace.css')

    expect(projectWorkspace).toContain('`阻${stage.blockerCount}`')
    expect(projectWorkspace).toContain('`提${stage.warningCount}`')
    expect(css).toContain('grid-template-columns: repeat(6, minmax(0, 1fr))')
    expect(css).toContain('.novel-serial-pipeline-stage .ant-tag')
  })

  test('surfaces the shared novel pipeline as a blocker repair guide', () => {
    const projectWorkspace = projectWorkspaceSource()
    const css = source('../NovelProjectWorkspace.css')

    expect(projectWorkspace).toContain('novel-serial-pipeline-guide')
    expect(projectWorkspace).toContain('当前卡点')
    expect(projectWorkspace).toContain('去哪里修')
    expect(projectWorkspace).toContain('修完验证')
    expect(projectWorkspace).toContain('serialPipelineModel.repairGuide')
    expect(css).toContain('.novel-serial-pipeline-guide')
    expect(css).toContain('.novel-serial-pipeline-guide-steps')
  })

  test('offers a direct de-ai gate repair action from the chapter writing desk', () => {
    const workspaceCenter = workspaceCenterSource()
    const projectWorkspace = projectWorkspaceSource()

    expect(workspaceCenter).toContain('onRepairDeslopGate')
    expect(workspaceCenter).toContain('修复去AI味并复检')
    expect(workspaceCenter).toContain('novel-deslop-gate-action')
    expect(projectWorkspace).toContain('repairActiveDeslopGate')
    expect(projectWorkspace).toContain("revisionMode: 'tighten_pacing'")
    expect(projectWorkspace).toContain("source: 'deslop_gate_repair'")
  })

  test('exposes creation contract fields in the writing bible editor', () => {
    const projectWorkspace = projectWorkspaceSource()

    expect(projectWorkspace).toContain('创建契约')
    expect(projectWorkspace).toContain('name="reader_promise"')
    expect(projectWorkspace).toContain('name="protagonist_drive"')
    expect(projectWorkspace).toContain('name="core_conflict"')
    expect(projectWorkspace).toContain('name="current_volume_goal"')
    expect(projectWorkspace).toContain('name="innovation_hook"')
    expect(projectWorkspace).toContain('name="first30_plan"')
    expect(projectWorkspace).toContain('name="longform_capacity"')
    expect(projectWorkspace).toContain('reader_promise: v.reader_promise')
    expect(projectWorkspace).toContain('protagonist_drive: v.protagonist_drive')
  })

  test('keeps longform governance rails inside the auto creation detail drawer', () => {
    const component = autoCreationDirectorWorkspaceSource()

    const drawerIndex = component.indexOf('auto-director-detail-drawer')
    expect(drawerIndex).toBeGreaterThan(0)
    expect(component.indexOf('auto-director-creation-pipeline')).toBeGreaterThan(drawerIndex)
    expect(component.indexOf('auto-director-battle-desk')).toBeGreaterThan(drawerIndex)
    expect(component.indexOf('auto-director-serial-rail')).toBeGreaterThan(drawerIndex)
  })

  test('guards longform canon and memory runway before safe batching', () => {
    const model = directorModelSource()

    expect(model).toContain('buildCanonRunway')
    expect(model).toContain('story_state_stale')
    expect(model).toContain('memory_unavailable')
    expect(model).toContain('长线记忆')
    expect(model).toContain('长线记忆待同步')
    expect(model).toContain("writingAction('update_canon'")
    expect(model).toContain("writingAction('fix_continuity'")
  })

  test('passes memory palace summary into the writing cockpit runway checks', () => {
    const projectWorkspace = projectWorkspaceSource()

    expect(projectWorkspace).toContain('memoryPalaceProjects')
    expect(projectWorkspace).toContain('/memory-palace/projects')
    expect(projectWorkspace).toContain('activeMemorySummary')
    expect(projectWorkspace).toContain('memorySummary: activeMemorySummary')
    expect(projectWorkspace).toContain('memory_count: 0')
    expect(projectWorkspace).toContain('missing: true')
  })

  test('runs story state sync automatically from writing cockpit actions', () => {
    const projectWorkspace = projectWorkspaceSource()

    expect(projectWorkspace).toContain('syncStoryStateForChapter')
    expect(projectWorkspace).toContain('/story-state-sync')
    expect(projectWorkspace).toContain("source: 'writing_cockpit_state_sync'")
    expect(projectWorkspace).toContain("case 'sync_story_state'")
    expect(projectWorkspace).toContain('void syncStoryStateForChapter')
  })

  test('keeps the left production guide as a compact status summary', () => {
    const component = source('ProductionGuidePanel.tsx')
    const css = source('ProductionGuidePanel.css')

    expect(component).toContain("import './ProductionGuidePanel.css'")
    expect(component).toContain('production-guide-summary-panel')
    expect(component).toContain('production-guide-summary-grid')
    expect(component).toContain('production-guide-summary-action')
    expect(component).toContain('项目进度')
    expect(component).not.toContain('GuideStep')
    expect(component).not.toContain('production-guide-primary-command')
    expect(component).not.toContain('production-guide-secondary-command')
    expect(component).not.toContain('primaryLabel')
    expect(css).toContain('.production-guide-summary-panel')
    expect(css).toContain('.production-guide-summary-grid')
    expect(css).not.toContain('.production-guide-step-active')
    expect(css).not.toContain('.production-guide-secondary-command')
  })

  test('separates the writing cockpit from delivery and collapsed workspace bars', () => {
    const component = writingCockpitPanelSource()
    const css = source('WritingCockpitPanel.css')

    expect(component).toContain("import './WritingCockpitPanel.css'")
    expect(component).toContain('writing-cockpit-card-expanded')
    expect(component).toContain('writing-cockpit-card-collapsed')
    expect(component).toContain('writing-cockpit-summary-strip')
    expect(component).toContain('writing-cockpit-summary-primary')
    expect(component).toContain('writing-cockpit-summary-right')
    expect(component).not.toContain('writing-cockpit-collapsed-actions')
    expect(component).toContain('writing-cockpit-subdesk')
    expect(component).toContain('writing-cockpit-command-grid')
    expect(component).toContain('核心契约')
    expect(component).toContain('mustServe')
    expect(component).toContain('不得漂移')
    expect(component).toContain('弃读预警')
    expect(component).toContain('readerDropRisk')
    expect(component).toContain('开篇防弃读')
    expect(component).toContain('中段防掉速')
    expect(component).toContain('故事压力')
    expect(component).toContain('storyPressure')
    expect(component).toContain('冲突升级')
    expect(component).toContain('赌注升级')
    expect(component).toContain('反转逼迫')
    expect(component).toContain('主角能动性')
    expect(component).toContain('storyDrive')
    expect(component).toContain('主角选择')
    expect(component).toContain('选择代价')
    expect(component).toContain('状态变化')
    expect(component).toContain('连载节奏')
    expect(component).toContain('serialRhythm')
    expect(component).toContain('回报密度')
    expect(component).toContain('开篇钩子')
    expect(component).toContain('章末追读')
    expect(component).toContain('章末翻页')
    expect(component).toContain('pageTurnHook')
    expect(component).toContain('读者问题')
    expect(component).toContain('禁提前解答')
    expect(component).toContain('卷级爆点')
    expect(component).toContain('volumeClimax')
    expect(component).toContain('本章爆点职责')
    expect(component).toContain('禁提前消费')
    expect(component).toContain('交稿风险转写作动作')
    expect(component).toContain('deliveryRiskCarryOver')
    expect(component).toContain('风险：')
    expect(component).toContain('证据：')
    expect(component).toContain('deliveryRiskCarryOver.evidence')
    expect(component).toContain('动作：')
    expect(component).toContain('开篇修复')
    expect(component).toContain('中段推进')
    expect(component).toContain('章末追读')
    expect(css).toContain('.writing-cockpit-card-expanded')
    expect(css).toContain('.writing-cockpit-subdesk')
    expect(css).toContain('.writing-cockpit-card-collapsed')
    expect(css).toContain('.writing-cockpit-summary-strip')
    expect(css).toContain('.writing-cockpit-summary-primary')
    expect(css).not.toContain('.writing-cockpit-collapsed-actions')
    expect(css).toContain('.writing-cockpit-reader-drop-risk')
    expect(css).toContain('.writing-cockpit-story-pressure')
    expect(css).toContain('.writing-cockpit-story-drive')
    expect(css).toContain('.writing-cockpit-serial-rhythm')
    expect(css).toContain('.writing-cockpit-page-turn-hook')
    expect(css).toContain('.writing-cockpit-volume-climax')
    expect(css).toContain('.writing-cockpit-delivery-risk')
  })

  test('uses a reference nav rail with compact revision chips', () => {
    const component = source('ReferencePanel.tsx')
    const css = source('ReferencePanel.css')

    expect(component).toContain("import './ReferencePanel.css'")
    expect(component).toContain('novel-reference-nav-rail')
    expect(component).toContain('novel-reference-nav-item')
    expect(component).toContain('novel-reference-revision-chip')
    expect(css).toContain('.novel-reference-nav-item')
    expect(css).toContain('.novel-reference-revision-chip')
  })

  test('shows storyline workshop types and draft brief storyline section', () => {
    const settingPanel = source('SettingWorkshopPanel.tsx')
    const usageModel = source('settingUsageWorkbenchModel.ts')
    const workspaceCenter = workspaceCenterSource()
    const workspaceCss = source('WorkspaceCenter.css')

    expect(settingPanel).toContain("value: 'mainline'")
    expect(settingPanel).toContain("label: '主线'")
    expect(settingPanel).toContain("value: 'subplot'")
    expect(settingPanel).toContain("value: 'character_arc'")
    expect(settingPanel).toContain("value: 'relationship_arc'")
    expect(settingPanel).toContain("value: 'faction_arc'")
    expect(settingPanel).toContain("value: 'foreshadowing_arc'")
    expect(settingPanel).toContain('usageSegmentOptions')
    expect(usageModel).toContain("value: 'advance'")
    expect(usageModel).toContain("value: 'payoff'")
    expect(settingPanel).toContain('/storylines/suggest')
    expect(settingPanel).toContain('匹配剧情线')
    expect(workspaceCenter).toContain('剧情线推进')
    expect(workspaceCenter).toContain('必推')
    expect(workspaceCenter).toContain('埋线')
    expect(workspaceCenter).toContain('回收')
    expect(workspaceCenter).toContain('禁用')
    expect(workspaceCss).toContain('.novel-draft-brief-storylines')
  })

  test('shows character growth obligations in the chapter pre-draft brief', () => {
    const workspaceCenter = workspaceCenterSource()
    const workspaceCss = source('WorkspaceCenter.css')
    const model = writingRecommendationModelSource()
    const service = writingServiceSource()

    expect(workspaceCenter).toContain('人物成长承接')
    expect(workspaceCenter).toContain('角色欲望')
    expect(workspaceCenter).toContain('缺陷受压')
    expect(workspaceCenter).toContain('成长节点')
    expect(workspaceCenter).toContain('关系变化')
    expect(workspaceCenter).toContain('禁揭')
    expect(workspaceCss).toContain('.novel-draft-brief-character-arc')
    expect(model).toContain('character_arc_brief')
    expect(model).toContain('characterArcGrowthBeat')
    expect(service).toContain('character_arc_brief')
    expect(service).toContain('【人物成长承接】')
  })

  test('shows storyline board evidence details for plan versus actual sync', () => {
    const workspaceCenter = storyPlanningWorkspaceSource()
    const model = planningWorkspaceSource()

    expect(workspaceCenter).toContain('剧情线证据')
    expect(workspaceCenter).toContain('计划推进')
    expect(workspaceCenter).toContain('实际推进')
    expect(workspaceCenter).toContain('差异复盘')
    expect(workspaceCenter).toContain('差异决策')
    expect(workspaceCenter).toContain('回修正文')
    expect(workspaceCenter).toContain('接受为新计划')
    expect(workspaceCenter).toContain('标记误判')
    expect(workspaceCenter).toContain('novel-storyline-evidence')
    expect(model).toContain('planEvidence')
    expect(model).toContain('actualEvidence')
    expect(model).toContain('diffEvidence')
    expect(model).toContain('syncRisks')
    expect(model).toContain('latestSyncChapter')
  })

  test('shows reader retention radar in the chapter pre-draft brief', () => {
    const workspaceCenter = workspaceCenterSource()
    const workspaceCss = source('WorkspaceCenter.css')
    const model = writingRecommendationModelSource()
    const service = writingServiceSource()

    expect(workspaceCenter).toContain('追读雷达')
    expect(workspaceCenter).toContain('开篇钩子')
    expect(workspaceCenter).toContain('爽点承诺')
    expect(workspaceCenter).toContain('短剧场面')
    expect(workspaceCenter).toContain('章末追读')
    expect(workspaceCss).toContain('.novel-draft-brief-retention')
    expect(model).toContain('reader_retention_brief')
    expect(model).toContain('retentionOpeningHook')
    expect(service).toContain('reader_retention_brief')
    expect(service).toContain('short_drama_scene')
  })

  test('shows story unit task in the chapter pre-draft brief', () => {
    const workspaceCenter = workspaceCenterSource()
    const workspaceCss = source('WorkspaceCenter.css')
    const model = writingRecommendationModelSource()
    const service = writingServiceSource()

    expect(workspaceCenter).toContain('剧情单元任务')
    expect(workspaceCenter).toContain('当前职责')
    expect(workspaceCenter).toContain('单元目标')
    expect(workspaceCenter).toContain('禁抢跑')
    expect(workspaceCss).toContain('.novel-draft-brief-story-unit')
    expect(model).toContain('story_unit_context')
    expect(model).toContain('storyUnitRole')
    expect(service).toContain('story_unit_context')
    expect(service).toContain('【剧情单元任务】')
  })

  test('shows volume climax budget in the chapter pre-draft brief', () => {
    const workspaceCenter = workspaceCenterSource()
    const workspaceCss = source('WorkspaceCenter.css')
    const model = writingRecommendationModelSource()
    const service = writingServiceSource()

    expect(workspaceCenter).toContain('卷级爆点预算')
    expect(workspaceCenter).toContain('本章爆点职责')
    expect(workspaceCenter).toContain('禁提前消费')
    expect(workspaceCss).toContain('.novel-draft-brief-volume-climax')
    expect(model).toContain('volume_climax_brief')
    expect(model).toContain('volumeClimaxRole')
    expect(service).toContain('volume_climax_brief')
    expect(service).toContain('【卷级高潮预算】')
  })

  test('shows recent fatigue avoidance in the chapter pre-draft brief', () => {
    const workspaceCenter = workspaceCenterSource()
    const workspaceCss = source('WorkspaceCenter.css')
    const model = writingRecommendationModelSource()
    const service = writingServiceSource()

    expect(workspaceCenter).toContain('近10章疲劳规避')
    expect(workspaceCenter).toContain('冲突换源')
    expect(workspaceCenter).toContain('回报换形')
    expect(workspaceCenter).toContain('钩子换题')
    expect(workspaceCss).toContain('.novel-draft-brief-recent-fatigue')
    expect(model).toContain('recent_fatigue_brief')
    expect(model).toContain('recentFatigueConflict')
    expect(service).toContain('recent_fatigue_brief')
    expect(service).toContain('【近章连载动能与疲劳规避】')
  })

  test('shows strong story and reader pull execution in the chapter pre-draft brief', () => {
    const workspaceCenter = workspaceCenterSource()
    const workspaceCss = source('WorkspaceCenter.css')
    const model = writingRecommendationModelSource()
    const service = writingServiceSource()

    expect(workspaceCenter).toContain('弃读预警')
    expect(workspaceCenter).toContain('强故事节奏')
    expect(workspaceCenter).toContain('主角选择')
    expect(workspaceCenter).toContain('回报密度')
    expect(workspaceCenter).toContain('章末翻页')
    expect(workspaceCss).toContain('.novel-draft-brief-reader-drop')
    expect(workspaceCss).toContain('.novel-draft-brief-story-pull')
    expect(model).toContain('reader_drop_risk_brief')
    expect(model).toContain('readerDropRisks')
    expect(model).toContain('story_drive_brief')
    expect(model).toContain('storyDriveChoice')
    expect(model).toContain('serial_rhythm_brief')
    expect(model).toContain('serialRhythmPayoffInterval')
    expect(model).toContain('page_turn_hook_brief')
    expect(model).toContain('pageTurnQuestion')
    expect(service).toContain('reader_drop_risk_brief')
    expect(service).toContain('story_drive_brief')
    expect(service).toContain('serial_rhythm_brief')
    expect(service).toContain('page_turn_hook_brief')
  })

  test('shows chapter innovation execution in the pre-draft brief', () => {
    const workspaceCenter = workspaceCenterSource()
    const workspaceCss = source('WorkspaceCenter.css')
    const model = writingRecommendationModelSource()
    const service = writingServiceSource()

    expect(workspaceCenter).toContain('创新执行')
    expect(workspaceCenter).toContain('创新角度')
    expect(workspaceCenter).toContain('差异护栏')
    expect(workspaceCenter).toContain('IP化场面')
    expect(workspaceCss).toContain('.novel-draft-brief-innovation')
    expect(model).toContain('innovation_brief')
    expect(model).toContain('innovationAngle')
    expect(service).toContain('innovation_brief')
    expect(service).toContain('differentiation_guardrails')
  })

  test('shows signature scene repair in the pre-draft brief', () => {
    const workspaceCenter = workspaceCenterSource()
    const workspaceCss = source('WorkspaceCenter.css')
    const model = writingRecommendationModelSource()
    const service = writingServiceSource()

    expect(workspaceCenter).toContain('强场面补位')
    expect(workspaceCenter).toContain('标志性场面')
    expect(workspaceCenter).toContain('补位目标')
    expect(workspaceCenter).toContain('服务主线')
    expect(workspaceCss).toContain('.novel-draft-brief-signature-scene')
    expect(model).toContain('signature_scene_brief')
    expect(model).toContain('signatureSceneTarget')
    expect(service).toContain('【本章标志性场面补位】')
    expect(service).toContain('signature_scene')
  })

  test('shows longform battle obligations in the pre-draft brief', () => {
    const workspaceCenter = workspaceCenterSource()
    const workspaceCss = source('WorkspaceCenter.css')
    const model = writingRecommendationModelSource()
    const service = writingServiceSource()
    const promptSections = [
      serverSource('novel-writing/prose-generation-prompt-sections.ts'),
      serverSource('novel-writing/prose-generation-prompt-sections-shared.ts'),
      serverSource('novel-writing/prose-generation-prompt-sections-prep.ts'),
      serverSource('novel-writing/prose-generation-prompt-sections-hooks.ts'),
      serverSource('novel-writing/prose-generation-prompt-sections-craft.ts'),
      serverSource('novel-writing/prose-generation-prompt-sections-governance.ts'),
    ].join('\n')

    expect(workspaceCenter).toContain('长篇作战承接')
    expect(workspaceCenter).toContain('今日优先')
    expect(workspaceCenter).toContain('风险线')
    expect(workspaceCss).toContain('.novel-draft-brief-battle')
    expect(model).toContain('longform_battle_context')
    expect(model).toContain('longformBattleLaneRequirements')
    expect(service).toContain('longform_battle_context')
    expect(service).toContain('buildLongformBattleContextPromptSection')
    expect(promptSections).toContain('【长篇作战承接】')
  })

  test('shows governance recheck memory in the pre-draft brief', () => {
    const workspaceCenter = workspaceCenterSource()
    const workspaceCss = source('WorkspaceCenter.css')
    const model = writingRecommendationModelSource()
    const service = writingServiceSource()
    const promptSections = [
      serverSource('novel-writing/prose-generation-prompt-sections.ts'),
      serverSource('novel-writing/prose-generation-prompt-sections-shared.ts'),
      serverSource('novel-writing/prose-generation-prompt-sections-prep.ts'),
      serverSource('novel-writing/prose-generation-prompt-sections-hooks.ts'),
      serverSource('novel-writing/prose-generation-prompt-sections-craft.ts'),
      serverSource('novel-writing/prose-generation-prompt-sections-governance.ts'),
    ].join('\n')

    expect(workspaceCenter).toContain('治理复查承接')
    expect(workspaceCenter).toContain('修后证据')
    expect(workspaceCenter).toContain('观察项')
    expect(workspaceCss).toContain('.novel-draft-brief-governance-memory')
    expect(model).toContain('governance_recheck_memory')
    expect(model).toContain('governanceMemoryEvidence')
    expect(service).toContain('governance_recheck_memory')
    expect(service).toContain('buildGovernanceRecheckPromptSection')
    expect(promptSections).toContain('【治理复查承接】')
  })

  test('shows storyline sync status in the delivery strip', () => {
    const workspaceCenter = workspaceCenterSource()
    const workspaceCss = source('WorkspaceCenter.css')

    expect(workspaceCenter).toContain('storylineSync')
    expect(workspaceCenter).toContain('novel-delivery-storyline-tag')
    expect(workspaceCss).toContain('.novel-delivery-storyline-tag')
    expect(workspaceCss).toContain('.novel-delivery-storyline-tag-warn')
  })

  test('shows story unit sync status in the delivery strip', () => {
    const workspaceCenter = workspaceCenterSource()
    const workspaceCss = source('WorkspaceCenter.css')
    const writingModel = writingCockpitModelSource()
    const recommendationModel = writingRecommendationModelSource()
    const service = writingServiceSource()
    const reviewRecords = serverSource('novel-writing/post-delivery-sync-review-record.ts')

    expect(workspaceCenter).toContain('storyUnitSync')
    expect(workspaceCenter).toContain('novel-delivery-story-unit-tag')
    expect(workspaceCss).toContain('.novel-delivery-story-unit-tag')
    expect(workspaceCss).toContain('.novel-delivery-story-unit-tag-warn')
    expect(writingModel).toContain('story_unit_sync')
    expect(recommendationModel).toContain('storyUnitSync')
    expect(service).toContain("reviewType: 'story_unit_sync'")
    expect(reviewRecords).toContain('review_type: input.reviewType')
  })

  test('shows chapter core drift status in the delivery strip', () => {
    const workspaceCenter = workspaceCenterSource()
    const workspaceCss = source('WorkspaceCenter.css')
    const model = writingCockpitModelSource()
    const service = writingServiceSource()
    const draftReviewRecords = serverSource('novel-writing/draft-sync-review-record.ts')

    expect(workspaceCenter).toContain('coreDrift')
    expect(workspaceCenter).toContain('novel-delivery-core-drift-tag')
    expect(workspaceCss).toContain('.novel-delivery-core-drift-tag')
    expect(workspaceCss).toContain('.novel-delivery-core-drift-tag-warn')
    expect(model).toContain('chapter_core_drift')
    expect(service).toContain('buildChapterCoreDriftDraftReviewRecord')
    expect(draftReviewRecords).toContain("reviewType: 'chapter_core_drift'")
  })

  test('shows reader payoff sync status in the delivery strip', () => {
    const workspaceCenter = workspaceCenterSource()
    const workspaceCss = source('WorkspaceCenter.css')
    const model = writingCockpitModelSource()
    const service = writingServiceSource()
    const draftReviewRecords = serverSource('novel-writing/draft-sync-review-record.ts')

    expect(workspaceCenter).toContain('readerPayoffSync')
    expect(workspaceCenter).toContain('novel-delivery-payoff-tag')
    expect(workspaceCss).toContain('.novel-delivery-payoff-tag')
    expect(workspaceCss).toContain('.novel-delivery-payoff-tag-warn')
    expect(model).toContain('reader_payoff_sync')
    expect(service).toContain('buildReaderPayoffDraftReviewRecord')
    expect(draftReviewRecords).toContain("reviewType: 'reader_payoff_sync'")
  })

})
