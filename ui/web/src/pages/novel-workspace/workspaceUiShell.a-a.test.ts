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
import { createChapterSourceOperationFence } from './chapterGenerationSourceModel'

describe('commercial writing workspace UI shell a a', () => {
  test('lets the inner chapter directory rail collapse without hiding task center', () => {
    const projectWorkspace = projectWorkspaceSource()
    const projectWorkspaceCss = source('../NovelProjectWorkspace.css')
    const directorySidebar = source('ChapterDirectorySidebar.tsx')

    expect(projectWorkspace).toContain('directoryCollapsed')
    expect(projectWorkspace).toContain('setDirectoryCollapsed')
    expect(projectWorkspace).toContain('handleDirectoryCollapsedChange')
    expect(projectWorkspace).toContain("novel-workspace-directory-shell is-collapsed")
    expect(projectWorkspace).toContain('collapsed={directoryCollapsed}')
    expect(projectWorkspace).toContain('onCollapsedChange={handleDirectoryCollapsedChange}')
    expect(projectWorkspace).toContain('novel-workspace-task-entry')
    expect(directorySidebar).toContain('collapsed = false')
    expect(directorySidebar).toContain('onCollapsedChange')
    expect(directorySidebar).toContain('收起目录')
    expect(directorySidebar).toContain('展开目录')
    expect(directorySidebar).toContain('chapter-directory-sidebar is-collapsed')
    expect(projectWorkspaceCss).toContain('.novel-workspace-directory-shell.is-collapsed')
    expect(projectWorkspaceCss).toContain('flex: 0 0 var(--novel-shell-directory-collapsed)')
    expect(projectWorkspaceCss).toContain('.chapter-directory-sidebar-collapsed-rail')
  })

  test('uses a single primary action entry in the central writing toolbar', () => {
    const component = workspaceCenterSource()
    const actionBar = source('workspace-center-chapter-action-bar.tsx')
    const css = source('WorkspaceCenter.css')

    expect(component).toContain('runChapterWorkflowAction')
    expect(component).toContain('chapterActionLoading')
    expect(component).toContain('ChapterActionBar')
    expect(component).toContain('buildChapterWorkflowPresenter')
    expect(component).toContain('novel-writing-header')
    expect(component).toContain('novel-word-preset')
    expect(actionBar).toContain('chapter-action-bar')
    expect(actionBar).toContain('primaryAction')
    expect(actionBar).toContain('secondaryActions')
    expect(component).not.toContain('novel-editor-action-group-draft')
    expect(component).not.toContain('onStartChapterPipeline}>流水线')
    expect(component).not.toContain('NOVEL_WRITING_DESK_COLLAPSED_KEY')
    expect(component).not.toContain('setWritingDeskCollapsed')
    expect(component).not.toContain('novel-editor-desk-toggle')
    expect(component).not.toContain('novel-editor-stagebar')
    expect(component).not.toContain('novel-editor-action-flow')
    expect(component).not.toContain('novel-ai-responsibility-strip')
    expect(css).toContain('.chapter-action-bar')
    expect(css).toContain('.novel-writing-header')
    expect(css).toContain('grid-template-columns')
    expect(css).not.toContain('.novel-editor-toolbar-collapsed')
    expect(css).not.toContain('.novel-editor-desk-toggle')
    expect(css).not.toContain('.novel-editor-stagebar')
    expect(css).not.toContain('.novel-editor-action-flow')
    expect(css).toContain('flex-shrink: 0')
  })

  test('keeps pipeline and model team as status displays instead of duplicate writing actions', () => {
    const cockpit = writingCockpitPanelSource()
    const projectWorkspace = projectWorkspaceSource()
    const projectWorkspaceCss = source('../NovelProjectWorkspace.css')

    expect(cockpit).toContain('writing-cockpit-role-strip')
    expect(cockpit).not.toContain('onClick={() => onAction(role.actionKey)}')
    expect(cockpit).not.toContain('type={role.active ? \'primary\' : \'default\'}')
    expect(projectWorkspace).toContain('下一步：{serialPipelineModel.primaryAction.label || \'查看下一步\'}')
    expect(projectWorkspace).not.toContain('handleSerialPipelineAction(serialPipelineModel.primaryAction.key)')
    expect(projectWorkspace).not.toContain('novel-serial-pipeline-guide-action')
    expect(projectWorkspace).not.toContain('onClick={() => handleSerialPipelineAction(stage.action.key)}')
    expect(projectWorkspaceCss).not.toContain('.novel-serial-pipeline-guide-action')
    expect(projectWorkspaceCss).not.toContain('.novel-serial-pipeline-agent:hover')
  })

  test('keeps chapter writing to one guidance layer by hiding global cockpit and pipeline there', () => {
    const projectWorkspace = projectWorkspaceSource()

    expect(projectWorkspace).toContain('showGlobalWritingGuidance')
    expect(projectWorkspace).toContain("workspaceArea !== 'chapterWriting' && workspaceArea !== 'storyAssets'")
    expect(projectWorkspace).toContain('{showGlobalWritingGuidance && (')
    expect(projectWorkspace).toContain('{showGlobalWritingGuidance && renderSerialPipeline()}')
  })

  test('shows a compact writing queue in the chapter workspace', () => {
    const component = workspaceCenterSource()
    const css = source('WorkspaceCenter.css')
    const projectWorkspace = projectWorkspaceSource()
    const model = writingCockpitModelSource()

    expect(model).toContain('writingQueue')
    expect(model).toContain('sourceLabel: chapterPlanSourceLabel')
    expect(component).toContain('writingQueue')
    expect(component).toContain('写作队列')
    expect(component).toContain('novel-writing-queue-strip')
    expect(component).toContain('novel-writing-queue-item-')
    expect(component).toContain('onSelectWritingQueueChapter')
    expect(component).toContain('role="button"')
    expect(component).toContain('tabIndex={0}')
    expect(component).toContain("event.key === 'Enter'")
    expect(component).toContain('novel-writing-queue-action')
    expect(component).toContain('item.actionLabel')
    expect(component).toContain('item.actionHint')
    expect(component).toContain('novel-writing-queue-focus')
    expect(component).toContain('本章计划缺口')
    expect(component).toContain('补齐本章计划')
    expect(component).toContain('本章开写就绪')
    expect(component).toContain('处理本章开写')
    expect(component).toContain('runDraftBriefAction')
    expect(component).toContain('novel-draft-brief-action')
    expect(component).toContain('{draftBriefSummary.actionLabel}')
    expect(component).toContain('onClick={runDraftBriefAction}')
    expect(component).toContain('本章交稿中')
    expect(component).toContain('novel-delivery-progress-panel')
    expect(component).toContain('交稿进度')
    expect(component).toContain('deliveryNeedsStorySync')
    expect(component).toContain('storyStateSyncAction')
    expect(component).toContain('runQueueDeliveryAction')
    expect(component).toContain('!(queueFocus.tone === \'delivery\' && deliverySummary.visible)')
    expect(css).toContain('.novel-delivery-progress-steps')
    expect(component).toContain('onRepairWritingQueuePlan')
    expect(component).toContain('补齐队列计划')
    expect(component).toContain('onRepairWritingQueuePlanBatch')
    expect(component).toContain('滚动规划')
    expect(css).toContain('.novel-writing-queue-strip')
    expect(css).toContain('.novel-writing-queue-item.is-active')
    expect(css).toContain('.novel-writing-queue-action')
    expect(css).toContain('.novel-writing-queue-focus')
    expect(css).toContain('cursor: pointer')
    expect(css).toContain('.novel-writing-queue-item-ready_to_draft')
    expect(css).toContain('.novel-writing-queue-item-needs_plan')
    expect(projectWorkspace).toContain('writingQueue={writingCockpitModel.writingQueue}')
    expect(projectWorkspace).toContain('onSelectWritingQueueChapter={(chapterId) => { void selectChapterForWriting(chapterId) }}')
    expect(projectWorkspace).toContain('onRepairWritingQueuePlan={repairWritingQueuePlan}')
    expect(projectWorkspace).toContain('onRepairWritingQueuePlanBatch={repairWritingQueuePlanBatch}')
    expect(projectWorkspace).toContain("source: 'writing_queue_plan_repair'")
    expect(projectWorkspace).toContain("source: 'writing_queue_batch_plan_repair'")
  })

  test('keeps manual writing visible by collapsing auxiliary writing panels', () => {
    const component = workspaceCenterSource()
    const css = source('WorkspaceCenter.css')
    const projectWorkspaceCss = source('../NovelProjectWorkspace.css')

    expect(component).toContain('writingAuxCollapsed')
    expect(component).toContain('setWritingAuxCollapsed')
    expect(component).toContain('novel-writing-header')
    expect(component).toContain('novel-writing-header-details')
    expect(component).toContain('onToggleDetails')
    expect(component).toContain('detailsSummary')
    expect(component).toContain('writingSupportBody')
    const actionBar = source('workspace-center-chapter-action-bar.tsx')
    expect(actionBar).toContain('收起详情')
    expect(actionBar).toContain('展开详情')
    expect(source('workspace-center-quality-revision-panel.tsx')).toContain('质检修订')
    expect(source('workspace-center-quality-revision-panel.tsx')).toContain('oh-story 审稿')
    expect(source('workspace-center-quality-revision-panel.tsx')).toContain('ohStoryBusySummary')
    expect(source('workspace-center-quality-revision-panel.tsx')).toContain('去AI中')
    expect(source('WorkspaceCenter.tsx')).toContain('WorkspaceCenterQualityRevisionPanel')
    expect(actionBar).toContain('chapter-action-bar-details-toggle')
    expect(actionBar).toContain('DownOutlined')
    expect(actionBar).toContain('UpOutlined')
    expect(actionBar).toContain('aria-expanded')
    expect(css).toContain('.chapter-action-bar-details-toggle')
    expect(css).toContain('.chapter-action-bar-details-chip')
    expect(css).toContain('.chapter-action-bar')
    expect(css).toContain('.novel-writing-header')
    expect(css).toContain('.novel-writing-header-details')
    expect(projectWorkspaceCss).toContain('.novel-workspace-area-tabs')
    expect(projectWorkspaceCss).toContain('overflow-x: auto')
    expect(projectWorkspaceCss).toContain('flex: 0 0 auto')
  })

  test('surfaces a direct unattended shortcut inside the writing cockpit', () => {
    const component = writingCockpitPanelSource()
    const topbar = source('shell/workspace-topbar.tsx')
    const core = source('shell/workspace-core-area.ts')

    // Unattended is demoted from cockpit primary chrome into the topbar More tools menu.
    expect(component).toContain('onOpenProductionOps')
    expect(topbar).toContain('WORKSPACE_TOOL_MENU_DEFS')
    expect(topbar).toContain('setWorkspaceArea(item.key)')
    expect(topbar).toContain('更多')
    expect(core).toContain("key: 'productionOps'")
    expect(core).toContain('生产运营 / 无人值守')
  })

  test('surfaces the oh-story longform workflow in the writing cockpit', () => {
    const component = writingCockpitPanelSource()
    const css = source('WritingCockpitPanel.css')

    expect(component).toContain('LongformWorkflowStrip')
    expect(component).toContain('model.longformWorkflow')
    expect(component).toContain('writing-cockpit-workflow-strip')
    expect(component).toContain('writing-cockpit-workflow-stage-')
    expect(component).toContain('workflow.currentStage.label')
    expect(component).toContain('workflow.primaryAction.label')
    expect(component).toContain('stage.evidence.slice(0, 2)')
    expect(css).toContain('.writing-cockpit-workflow-strip')
    expect(css).toContain('.writing-cockpit-workflow-stage')
    expect(css).toContain('.writing-cockpit-workflow-stage.is-current')
    expect(css).toContain('.writing-cockpit-workflow-evidence')
  })

  test('surfaces the oh-story chapter blueprint contract in the writing brief card', () => {
    const component = workspaceCenterSource()
    const css = source('WorkspaceCenter.css')
    const model = writingRecommendationModelSource()
    const projectWorkspace = projectWorkspaceSource()

    expect(model).toContain('chapter_blueprint')
    expect(model).toContain('blueprintOutline')
    expect(model).toContain('blueprintPlotLines')
    expect(model).toContain('blueprintBeatSequence')
    expect(model).toContain('blueprintTargetEmotion')
    expect(model).toContain('blueprintOpeningHook')
    expect(model).toContain('blueprintCorePayoff')
    expect(model).toContain('writePreparationStatus')
    expect(model).toContain('writePreparationSourceGaps')
    expect(model).toContain('writePreparationMustConfirm')
    expect(model).toContain('nextChapterQualityFocus')
    expect(model).toContain('nextChapterQualityAvoid')
    expect(projectWorkspace).toContain('savePreDraftBriefForActiveChapter')
    expect(projectWorkspace).toContain('onSavePreDraftBrief')
    expect(projectWorkspace).toContain('apiClient.put(`/novel/chapters/${activeChapter.id}/pre-draft-brief`')
    expect(component).toContain('写前准备确认')
    expect(component).toContain('novel-draft-brief-write-preparation')
    expect(component).toContain('下一章质量续航')
    expect(component).toContain('novel-draft-brief-next-quality')
    expect(component).toContain('draftBriefSummary.briefFields.nextChapterQualityFocus')
    expect(component).toContain('draftBriefSummary.briefFields.nextChapterQualityAvoid')
    expect(component).toContain('draftBriefSummary.briefFields.writePreparationStatus')
    expect(component).toContain('来源缺口')
    expect(component).toContain('资产关系')
    expect(component).toContain('必须确认')
    expect(component).toContain('章节蓝图合同')
    expect(component).toContain('编辑蓝图')
    expect(component).toContain('保存蓝图')
    expect(component).toContain('openChapterBlueprintEditor')
    expect(component).toContain('saveChapterBlueprintEditor')
    expect(component).toContain('JSON.parse(blueprintEditorText)')
    expect(component).toContain('delete nextBrief.confirmed_at')
    expect(component).toContain('onSavePreDraftBrief?.(nextBrief)')
    expect(component).toContain('novel-draft-brief-blueprint')
    expect(component).toContain('novel-draft-brief-blueprint-edit')
    expect(component).toContain('五段式')
    expect(component).toContain('目标情绪')
    expect(component).toContain('开篇钩子')
    expect(component).toContain('核心回报')
    expect(component).toContain('多线推进')
    expect(component).toContain('人物顺序')
    expect(component).toContain('节拍功能')
    expect(component).toContain('代价收益')
    expect(component).toContain('章尾承接')
    expect(css).toContain('.novel-draft-brief-blueprint')
    expect(css).toContain('.novel-draft-brief-blueprint strong')
    expect(css).toContain('.novel-draft-brief-blueprint-edit')
  })

  test('reads camelCase raw pre-draft briefs in the writing workspace UI', () => {
    const component = workspaceCenterSource()
    const projectWorkspace = projectWorkspaceSource()

    expect(component).toContain('activeChapter?.raw_payload?.pre_draft_brief || activeChapter?.raw_payload?.preDraftBrief || null')
    expect(projectWorkspace).toContain('activeChapter.raw_payload?.pre_draft_brief || activeChapter.raw_payload?.preDraftBrief')
    expect(projectWorkspace).toContain('activeChapter?.raw_payload?.pre_draft_brief?.style_sample_strategy')
    expect(projectWorkspace).toContain('activeChapter?.raw_payload?.preDraftBrief?.style_sample_strategy')
  })

  test('surfaces chapter blueprint, revision, and delivery risk receipts in the delivery status strip', () => {
    const component = workspaceCenterSource()
    const css = source('WorkspaceCenter.css')
    const model = writingCockpitModelSource()
    const recommendationModel = writingRecommendationModelSource()

    expect(model).toContain('blueprintReceipt')
    expect(model).toContain('revisionReceipt')
    expect(model).toContain('deliveryRiskReceipt')
    expect(model).toContain('sceneCardReceipt')
    expect(model).toContain('qualityAudit')
    expect(model).toContain('approvalBlocker')
    expect(model).toContain('buildBlueprintReceiptSummary')
    expect(model).toContain('buildRevisionReceiptSummary')
    expect(model).toContain('buildDeliveryRiskReceiptSummary')
    expect(model).toContain('buildSceneCardReceiptSummary')
    expect(model).toContain('buildQualityAuditSummary')
    expect(model).toContain('buildApprovalBlockerSummary')
    expect(model).toContain('writePreparation')
    expect(model).toContain('write_preparation_checks')
    expect(model).toContain('blueprint_receipts')
    expect(model).toContain('revision_receipts')
    expect(model).toContain('delivery_risk_receipts')
    expect(model).toContain('scene_card_receipt')
    expect(model).toContain('质量诊断缺口')
    expect(model).toContain('复核修订')
    expect(model).toContain('复核承接')
    expect(model).toContain('复核场景回执')
    expect(model).toContain('修质量诊断')
    expect(model).toContain('补写前准备')
    expect(model).toContain('chapterHandoffSync')
    expect(model).toContain('chapter_handoff_sync')
    expect(model).toContain('补章首承接')
    expect(model).toContain('补章末交接')
    expect(recommendationModel).toContain('blueprintReceipt')
    expect(recommendationModel).toContain('revisionReceipt')
    expect(recommendationModel).toContain('deliveryRiskReceipt')
    expect(recommendationModel).toContain('sceneCardReceipt')
    expect(recommendationModel).toContain('qualityAudit')
    expect(recommendationModel).toContain('writePreparation')
    expect(recommendationModel).toContain('chapterHandoffSync')
    expect(recommendationModel).toContain('chapterHandoffDeltaSync')
    expect(component).toContain('deliverySummary.blueprintReceipt')
    expect(component).toContain('deliverySummary.revisionReceipt')
    expect(component).toContain('deliverySummary.deliveryRiskReceipt')
    expect(component).toContain('deliverySummary.sceneCardReceipt')
    expect(component).toContain('deliverySummary.qualityAudit')
    expect(component).toContain('deliverySummary.writePreparation')
    expect(component).toContain('deliverySummary.chapterHandoffSync')
    expect(component).toContain('deliverySummary.chapterHandoffDeltaSync')
    expect(component).toContain('deliverySummary.approvalBlocker')
    expect(component).toContain('novel-delivery-blueprint-tag')
    expect(component).toContain('novel-delivery-revision-tag')
    expect(component).toContain('novel-delivery-risk-receipt-tag')
    expect(component).toContain('novel-delivery-scene-card-receipt-tag')
    expect(component).toContain('novel-delivery-quality-audit-tag')
    expect(component).toContain('novel-delivery-write-preparation-tag')
    expect(component).toContain('novel-delivery-handoff-sync-tag')
    expect(component).toContain('novel-delivery-handoff-delta-tag')
    expect(component).toContain('novel-delivery-approval-blocker-tag')
    expect(component).toContain('scoreLabel')
    expect(component).toContain('missed.join')
    expect(component).toContain('risks.join')
    expect(component).toContain('fixes.join')
    expect(css).toContain('.novel-delivery-blueprint-tag')
    expect(css).toContain('.novel-delivery-blueprint-tag-warn')
    expect(model).toContain('platformRubric')
    expect(model).toContain('buildPlatformRubricSummary')
    expect(model).toContain('platform_checks')
    expect(model).toContain('平台适配')
    expect(recommendationModel).toContain('platformRubric')
    expect(component).toContain('deliverySummary.platformRubric')
    expect(component).toContain('novel-delivery-platform-tag')
    expect(css).toContain('.novel-delivery-platform-tag')
    expect(css).toContain('.novel-delivery-revision-tag')
    expect(css).toContain('.novel-delivery-revision-tag-warn')
    expect(css).toContain('.novel-delivery-risk-receipt-tag')
    expect(css).toContain('.novel-delivery-risk-receipt-tag-warn')
    expect(css).toContain('.novel-delivery-scene-card-receipt-tag')
    expect(css).toContain('.novel-delivery-scene-card-receipt-tag-warn')
    expect(css).toContain('.novel-delivery-quality-audit-tag')
    expect(css).toContain('.novel-delivery-quality-audit-tag-warn')
    expect(css).toContain('.novel-delivery-write-preparation-tag')
    expect(css).toContain('.novel-delivery-write-preparation-tag-warn')
    expect(css).toContain('.novel-delivery-handoff-sync-tag')
    expect(css).toContain('.novel-delivery-handoff-sync-tag-warn')
    expect(css).toContain('.novel-delivery-handoff-delta-tag')
    expect(css).toContain('.novel-delivery-handoff-delta-tag-warn')
    expect(css).toContain('.novel-delivery-approval-blocker-tag')
    expect(css).toContain('.novel-delivery-approval-blocker-tag-warn')
  })

  test('explains approval-blocker resume failures instead of showing a generic run error', () => {
    const projectWorkspace = projectWorkspaceSource()

    expect(projectWorkspace).toContain('formatRunResumeErrorMessage')
    expect(projectWorkspace).toContain('APPROVAL_BLOCKER_REQUIRES_REPAIR')
    expect(projectWorkspace).toContain('入库阻断')
    expect(projectWorkspace).toContain('message.error(formatRunResumeErrorMessage(error))')
  })

  test('surfaces writing queue focus inside the auto creation director', () => {
    const component = autoCreationDirectorWorkspaceSource()
    const css = source('AutoCreationDirectorWorkspace.css')
    const model = directorModelSource()

    expect(model).toContain('writingQueueFocus')
    expect(model).toContain('buildWritingQueueFocus')
    expect(component).toContain('写作队列')
    expect(component).toContain('auto-director-writing-queue-focus')
    expect(component).toContain('model.writingQueueFocus.visible')
    expect(component).toContain('model.writingQueueFocus.badges')
    expect(component).toContain('model.writingQueueFocus.action')
    expect(css).toContain('.auto-director-writing-queue-focus')
    expect(css).toContain('.auto-director-writing-queue-focus-needs_plan')
    expect(css).toContain('.auto-director-writing-queue-focus-ready_to_draft')
    expect(css).toContain('.auto-director-writing-queue-focus-draft_generated')
  })

  test('shows a five-stage serial production rail in the auto creation director', () => {
    const component = autoCreationDirectorWorkspaceSource()
    const css = source('AutoCreationDirectorWorkspace.css')
    const model = directorModelSource()
    const projectWorkspace = projectWorkspaceSource()

    expect(model).toContain('serialWorkflow')
    expect(model).toContain('book_core')
    expect(model).toContain('longform_plan')
    expect(model).toContain('chapter_launch')
    expect(model).toContain('delivery_acceptance')
    expect(model).toContain('serial_governance')
    expect(component).toContain('连载生产轨道')
    expect(component).toContain('model.serialWorkflow.currentLabel')
    expect(component).toContain('auto-director-serial-rail')
    expect(component).toContain('model.serialWorkflow.stages.map')
    expect(component).toContain('onStageAction(stage.action)')
    expect(component).toContain('auto-director-serial-stage-button')
    expect(component).toContain('stage.action.label')
    expect(component).toContain('onStageAction?: (action: AutoCreationDirectorAction) => void')
    expect(projectWorkspace).toContain('onStageAction={handleAutoCreationDirectorAction}')
    expect(projectWorkspace).toContain("enter_story_planning: () => setWorkspaceArea('storyPlanning')")
    expect(model).toContain("planningAction('enter_story_planning'")
    expect(css).toContain('.auto-director-serial-rail')
    expect(css).toContain('.auto-director-serial-stage-button')
    expect(css).toContain('.auto-director-serial-stage-active')
    expect(css).toContain('.auto-director-serial-stage-blocked')
    expect(css).toContain('.auto-director-serial-stage-done')
  })

  test('exposes unattended writing goal controls in the production toolbox', () => {
    const projectWorkspace = projectWorkspaceSource()
    const startIdx = projectWorkspace.indexOf('const startUnattendedWritingGoal = async () =>')
    // After extract, openRunQueue stays in NWS while startUnattended lives in production handlers;
    // slice to the factory return binding that follows the function body.
    const endIdx = projectWorkspace.indexOf('startUnattendedWritingGoal,', startIdx + 1)
    const startBlock = projectWorkspace.slice(startIdx, endIdx > startIdx ? endIdx : startIdx + 2500)

    expect(startIdx).toBeGreaterThanOrEqual(0)
    expect(projectWorkspace).toContain('unattendedTargetChapter')
    expect(projectWorkspace).toContain('startUnattendedWritingGoal')
    expect(projectWorkspace).toContain("chapter-groups/start-unattended")
    expect(projectWorkspace).toContain('target_chapter: unattendedTargetChapter')
    expect(projectWorkspace).toContain('无人值守到目标章')
    expect(projectWorkspace).toContain('启动无人值守')
    expect(projectWorkspace).toContain('run-queue/start-worker')
    expect(startBlock).toContain('allow_incomplete: false')
    expect(startBlock).toContain('idle_wait_ms')
    expect(startBlock).toContain('idle_poll_ms')
    expect(startBlock).not.toContain('allow_incomplete: true')
    expect(startBlock).not.toContain('quality_threshold: 78')
  })

  test('surfaces unattended writing directly in the production operations workspace', () => {
    const projectWorkspace = projectWorkspaceSource()
    const productionOpsBlock = projectWorkspace.slice(
      projectWorkspace.indexOf("productionOps: {"),
      projectWorkspace.indexOf('const group = groups[workspaceArea]'),
    )

    expect(productionOpsBlock).toContain('无人值守到目标章')
    expect(productionOpsBlock).toContain('unattendedTargetChapter')
    expect(productionOpsBlock).toContain('startUnattendedWritingGoal')
    expect(productionOpsBlock).toContain('写前蓝图')
  })

  test('keeps a top bar shortcut for unattended writing visible from any workspace area', () => {
    const topbar = source('shell/workspace-topbar.tsx')
    const core = source('shell/workspace-core-area.ts')
    const tabs = source('shell/workspace-area-tabs.tsx')

    // Unattended stays reachable from More tools, not as a permanent primary topbar button.
    expect(topbar).toContain('更多')
    expect(topbar).toContain('WORKSPACE_TOOL_MENU_DEFS')
    expect(topbar).toContain('setWorkspaceArea(item.key)')
    expect(core).toContain("key: 'productionOps'")
    expect(core).toContain('生产运营 / 无人值守')
    expect(core).toContain("label: '大纲'")
    expect(core).toContain("label: '写作'")
    expect(core).toContain("label: '资产'")
    expect(tabs).not.toContain("label: '自动创作'")
    expect(tabs).toContain('WORKSPACE_PRIMARY_TAB_DEFS')
  })

  test('shows the shared six-stage AI creation pipeline inside the auto creation director', () => {
    const component = autoCreationDirectorWorkspaceSource()
    const css = source('AutoCreationDirectorWorkspace.css')
    const model = directorModelSource()

    expect(model).toContain('creationPipeline')
    expect(model).toContain('buildCreationPipeline')
    expect(component).toContain('AI长篇创作流水线')
    expect(component).toContain('model.creationPipeline.summary')
    expect(component).toContain('model.creationPipeline.primaryAction')
    expect(component).toContain('model.creationPipeline.stages.map')
    expect(component).toContain('auto-director-creation-pipeline')
    expect(component).toContain('auto-director-creation-stage')
    expect(component).toContain('全书核心')
    expect(component).toContain('长线规划')
    expect(component).toContain('设定资产')
    expect(component).toContain('章节开写')
    expect(component).toContain('交稿验收')
    expect(component).toContain('连载发布')
    expect(css).toContain('.auto-director-creation-pipeline')
    expect(css).toContain('.auto-director-creation-stage')
    expect(css).toContain('.auto-director-creation-stage.is-active')
  })

  test('shows the current agent chain inside the shared novel pipeline', () => {
    const projectWorkspace = projectWorkspaceSource()
    const css = source('../NovelProjectWorkspace.css')

    expect(projectWorkspace).toContain('serialPipelineModel.currentAgentSteps')
    expect(projectWorkspace).toContain('novel-serial-pipeline-agent-strip')
    expect(projectWorkspace).toContain('novel-serial-pipeline-agent')
    expect(projectWorkspace).toContain('agent.description')
    expect(projectWorkspace).toContain('agent.agent')
    expect(projectWorkspace).toContain("case 'create_editor_report'")
    expect(projectWorkspace).toContain("case 'apply_editor_revision'")
    expect(css).toContain('.novel-serial-pipeline-agent-strip')
    expect(css).toContain('.novel-serial-pipeline-agent')
    expect(css).toContain('.novel-serial-pipeline-agent-name')
  })

  test('wires one shared chapter source authority and fence through the ready topbar and settings', async () => {
    const topbar = source('shell/workspace-topbar.tsx')
    const topbarProps = source('shell/workspace-view-props-topbar.ts')
    const ready = source('shell/build-novel-workspace-ready-runtime.tsx')
    const base = source('shell/use-novel-workspace-base-model.tsx')

    expect(topbar).toContain('<ChapterGenerationSourceControl')
    expect(topbar).not.toContain('<McpGenerationSourceStatus')
    expect(topbar).not.toContain('className="novel-workspace-model-select"')
    expect(topbar).toContain('compact={isImmersiveShell}')
    expect(topbar).toContain('<ProjectSettingsModal')
    for (const name of [
      'chapterGenerationSourceAuthority',
      'setChapterGenerationSourceAuthority',
      'beginChapterSourceOperation',
      'assertChapterSourceOperationCurrent',
      'chapterSourceLocallyBusy',
      'chapterSourcePendingState',
      'setChapterSourceMutationPending',
    ]) {
      expect(base).toContain(name)
      expect(ready).toContain(name)
      expect(topbarProps).toContain(name)
      expect(topbar).toContain(name)
    }
    expect(base).not.toContain('componentSourceMutationCounter')
    expect(topbar).not.toContain('useState<ChapterSourcePendingState>')
    expect(topbar).toContain('pending={sourcePending}')
    expect(topbar).toContain('onPendingChange={setSourceOperationPending}')
  })

  test('derives local source busy from prose, active revision, manual quality, and story-state work', async () => {
    const module = await import('./shell/use-novel-workspace-base-model') as Record<string, any>
    expect(typeof module.resolveChapterSourceLocallyBusy).toBe('function')
    if (typeof module.resolveChapterSourceLocallyBusy !== 'function') return
    const ordinary = {
      projectId: 1,
      localTaskProjectId: 1,
      sourceAuthorityLoading: false,
      chapterInvocationPending: false,
      generatingProse: false,
      stepProseLoading: false,
      proseQualityLoading: false,
      editorReportLoading: false,
      commercialToolLoading: '',
      editorRevisionTasksProjectId: 1,
      editorRevisionTasks: [],
    }
    expect(module.resolveChapterSourceLocallyBusy(ordinary)).toBe(false)
    expect(module.resolveChapterSourceLocallyBusy({ ...ordinary, generatingProse: true })).toBe(true)
    expect(module.resolveChapterSourceLocallyBusy({ ...ordinary, proseQualityLoading: true })).toBe(true)
    expect(module.resolveChapterSourceLocallyBusy({ ...ordinary, commercialToolLoading: 'storyStateSync' })).toBe(true)
    expect(module.resolveChapterSourceLocallyBusy({ ...ordinary, sourceAuthorityLoading: true })).toBe(true)
    expect(module.resolveChapterSourceLocallyBusy({ ...ordinary, chapterInvocationPending: true })).toBe(true)
    expect(module.resolveChapterSourceLocallyBusy({
      ...ordinary,
      localTaskProjectId: 2,
      generatingProse: true,
      proseQualityLoading: true,
      commercialToolLoading: 'storyStateSync',
    })).toBe(false)
    expect(module.resolveChapterSourceLocallyBusy({
      ...ordinary,
      editorRevisionTasks: [{ run_type: 'editor_revision', status: 'running' }],
    })).toBe(true)
    expect(module.resolveChapterSourceLocallyBusy({
      ...ordinary,
      editorRevisionTasksProjectId: 2,
      editorRevisionTasks: [{ run_type: 'editor_revision', status: 'running' }],
    })).toBe(false)
  })

  test('does not revive stale pending after same-project reload or an A-B-A project cycle', async () => {
    const module = await import('./shell/workspace-topbar') as Record<string, any>
    expect(typeof module.chapterSourcePendingIsCurrent).toBe('function')
    if (typeof module.chapterSourcePendingIsCurrent !== 'function') return
    const fence = createChapterSourceOperationFence()
    fence.enterProject(1, 101)
    const token = fence.begin(1, 101)
    const pendingState = { projectId: 1, pending: true, token }
    const check = (projectId: number) => module.chapterSourcePendingIsCurrent(
      pendingState,
      projectId,
      (candidate: any) => fence.assertCurrent(candidate),
    )
    expect(check(1)).toBe(true)
    fence.enterProject(1, 102)
    expect(check(1)).toBe(false)
    fence.enterProject(2, 201)
    expect(check(2)).toBe(false)
    fence.enterProject(1, 103)
    expect(check(1)).toBe(false)
  })

  test('wires 续写 from the chapter more menu without changing 写下一章', () => {
    const actionBar = source('workspace-center-chapter-action-bar.tsx')
    const center = source('WorkspaceCenter.tsx')
    const actionHandlers = source('shell/workspace-action-handlers.tsx')
    const presenter = source('chapter-workflow-presenter.ts')
    const baseModel = source('shell/use-novel-workspace-base-model.tsx')
    const areaView = source('shell/workspace-area-view.tsx')
    const readyRuntime = source('shell/build-novel-workspace-ready-runtime.tsx')
    const areaProps = source('shell/workspace-view-props-area.ts')

    expect(actionBar).toContain('write_continue')
    expect(workspaceCenterSource()).toContain('onWriteContinue')
    expect(workspaceCenterSource()).toContain('write_continue')
    expect(center).toContain('onWriteContinue')
    expect(center).toContain("if (key === 'write_continue')")
    const continueIdx = center.indexOf("if (key === 'write_continue')")
    const generateIdx = center.indexOf("if (key === 'generate')")
    expect(continueIdx).toBeGreaterThan(-1)
    expect(continueIdx).toBeLessThan(generateIdx)
    expect(center).toContain("onWriteContinue: () => runChapterWorkflowAction('write_continue')")
    expect(center).toContain('onCancelContinue')

    expect(actionHandlers).not.toContain('write_continue')
    const acceptStart = actionHandlers.indexOf('const acceptCockpitChapterAndContinue')
    const acceptEnd = actionHandlers.indexOf('const handleWritingCockpitAction')
    const acceptBody = actionHandlers.slice(acceptStart, acceptEnd)
    expect(acceptStart).toBeGreaterThan(-1)
    expect(acceptBody).not.toContain('write_continue')
    expect(acceptBody).not.toContain('/kernel/jobs')

    const emptyBlock = presenter.slice(
      presenter.indexOf("if (phase === 'empty')"),
      presenter.indexOf("if (phase === 'written_unchecked'"),
    )
    expect(emptyBlock).toContain("phase === 'empty'")
    expect(emptyBlock).not.toContain("'write_continue'")

    expect(baseModel).toContain('useProjectContinueJob')
    expect(baseModel).toContain('onWriteContinue')
    expect(baseModel).toContain('onCancelContinue')
    expect(areaView).toContain('onWriteContinue={onWriteContinue}')
    expect(areaView).toContain('onCancelContinue')
    expect(readyRuntime).toContain('onWriteContinue')
    expect(readyRuntime).toContain('onCancelContinue')
    expect(areaProps).toContain('onWriteContinue')
    expect(areaProps).toContain('onCancelContinue')
  })

})
