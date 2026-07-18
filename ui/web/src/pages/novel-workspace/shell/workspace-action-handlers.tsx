import { message, Modal } from 'antd'
import type { AutoCreationDirectorAction } from '../autoCreationDirectorModel'
import type { PlanningActionKey } from '../planningWorkspaceModel'
import type { WritingCockpitActionKey } from '../writingCockpitModel'
import {
  isAutoCreationPlanningArea,
  isAutoCreationWritingArea,
  resolveWritingCockpitTarget,
  runPlanningAction,
  serialPipelineActionWorkspaceArea,
} from './workspace-action-routers'

export type WorkspaceActionHandlerDeps = {
  activeChapter: any
  activeChapterId: any
  applyEditorRevision: any
  autoCreationDirectorModel: any
  chapterHasProse: any
  chapters: any
  createDeliveryRiskRepairQueue: any
  createEditorReport: any
  createEditorReportForChapter: any
  createFirst30RetentionRepairQueue: any
  createReaderTrialRepairQueue: any
  createRecoveryEvidenceGovernanceQueue: any
  createSafeBatchRiskRepairQueue: any
  createScriptRoomRepairQueue: any
  createStyleSampleBatchRepairQueue: any
  generateCurrentChapterProse: any
  generateSceneCardsForChapter: any
  loadProductionTasks: any
  loadProjectModules: any
  openChapterQualityCard: any
  openContinuityAudit: any
  openGenerationDiagnostics: any
  openLongformProductionTrends: any
  openStoryAssetsWorkspace: any
  openStoryStateEditor: any
  openWritingBibleEditor: any
  recentFatigueRollingPlanIntent: any
  refreshActiveProseQuality: any
  runRecords: any
  runRollingPlan: any
  selectChapterForWriting: any
  selectTargetChapterForWriting: any
  serialPipelineModel: any
  setAutoDirectorActionLoadingKey: any
  setOutlinePanelOpen: any
  setOutlineTreeOpen: any
  setRightPanelOpen: any
  setRightPanelTab: any
  setTaskCenterOpen: any
  setWorkspaceArea: any
  sortedChapters: any
  stepGenerateProse: any
  syncStoryStateForChapter: any
  writingCockpitModel: any
}

export function createWorkspaceActionHandlers(deps: WorkspaceActionHandlerDeps) {
  const activeChapter = deps.activeChapter
  const activeChapterId = deps.activeChapterId
  const applyEditorRevision = deps.applyEditorRevision
  const autoCreationDirectorModel = deps.autoCreationDirectorModel
  const chapterHasProse = deps.chapterHasProse
  const chapters = deps.chapters
  const createDeliveryRiskRepairQueue = deps.createDeliveryRiskRepairQueue
  const createEditorReport = deps.createEditorReport
  const createEditorReportForChapter = deps.createEditorReportForChapter
  const createFirst30RetentionRepairQueue = deps.createFirst30RetentionRepairQueue
  const createReaderTrialRepairQueue = deps.createReaderTrialRepairQueue
  const createRecoveryEvidenceGovernanceQueue = deps.createRecoveryEvidenceGovernanceQueue
  const createSafeBatchRiskRepairQueue = deps.createSafeBatchRiskRepairQueue
  const createScriptRoomRepairQueue = deps.createScriptRoomRepairQueue
  const createStyleSampleBatchRepairQueue = deps.createStyleSampleBatchRepairQueue
  const generateCurrentChapterProse = deps.generateCurrentChapterProse
  const generateSceneCardsForChapter = deps.generateSceneCardsForChapter
  const loadProductionTasks = deps.loadProductionTasks
  const loadProjectModules = deps.loadProjectModules
  const openChapterQualityCard = deps.openChapterQualityCard
  const openContinuityAudit = deps.openContinuityAudit
  const openGenerationDiagnostics = deps.openGenerationDiagnostics
  const openLongformProductionTrends = deps.openLongformProductionTrends
  const openStoryAssetsWorkspace = deps.openStoryAssetsWorkspace
  const openStoryStateEditor = deps.openStoryStateEditor
  const openWritingBibleEditor = deps.openWritingBibleEditor
  const recentFatigueRollingPlanIntent = deps.recentFatigueRollingPlanIntent
  const refreshActiveProseQuality = deps.refreshActiveProseQuality
  const runRecords = deps.runRecords
  const runRollingPlan = deps.runRollingPlan
  const selectChapterForWriting = deps.selectChapterForWriting
  const selectTargetChapterForWriting = deps.selectTargetChapterForWriting
  const serialPipelineModel = deps.serialPipelineModel
  const setAutoDirectorActionLoadingKey = deps.setAutoDirectorActionLoadingKey
  const setOutlinePanelOpen = deps.setOutlinePanelOpen
  const setOutlineTreeOpen = deps.setOutlineTreeOpen
  const setRightPanelOpen = deps.setRightPanelOpen
  const setRightPanelTab = deps.setRightPanelTab
  const setTaskCenterOpen = deps.setTaskCenterOpen
  const setWorkspaceArea = deps.setWorkspaceArea
  const sortedChapters = deps.sortedChapters
  const stepGenerateProse = deps.stepGenerateProse
  const syncStoryStateForChapter = deps.syncStoryStateForChapter
  const writingCockpitModel = deps.writingCockpitModel

  const handlePlanningAction = (key: PlanningActionKey, options?: { intent?: any }) => {
    const rollingPlanIntent = options?.intent || (key === 'update_rolling_plan' ? recentFatigueRollingPlanIntent : null)
    const actions: Record<PlanningActionKey, () => void | Promise<void>> = {
      update_rolling_plan: () => runRollingPlan({ intent: rollingPlanIntent || undefined }),
      complete_volume_plan: () => setOutlinePanelOpen(true),
      enter_story_planning: () => setWorkspaceArea('storyPlanning'),
      enter_chapter_writing: () => setWorkspaceArea('chapterWriting'),
      open_outline_tree: () => setOutlineTreeOpen(true),
      future100_audit: () => { void runFuture100SkeletonAudit() },
      future100_generate: () => { void generateFuture100Skeleton() },
      longform_pressure: () => { void runLongformPressureTest() },
      longform_creation_diagnosis: () => { void runLongformCreationDiagnosis() },
      topic_validation: () => { void runTopicValidation() },
      reference_diagnosis: () => { void openReferenceKnowledgeDiagnosis() },
      open_story_assets: () => openStoryAssetsWorkspace(),
      update_story_state: () => openStoryStateEditor(),
      open_quality_revision: () => setWorkspaceArea('qualityRevision'),
      run_first30_retention: () => { void runFirst30RetentionDiagnosis() },
      create_first30_repair: () => { void createFirst30RetentionRepairQueue() },
      run_reader_trial_review: () => { void runReaderTrialReview() },
      create_reader_trial_repair: () => { void createReaderTrialRepairQueue() },
      create_delivery_risk_repair: () => { void createDeliveryRiskRepairQueue(options?.intent?.payload) },
      record_storyline_diff_decision: () => { void recordStorylineDiffDecision(options?.intent) },
      create_storyline_decision_tasks: () => { void createStorylineDecisionTasks() },
      open_task_center: () => setTaskCenterOpen(true),
    }
    return runPlanningAction(actions, key)
  }

  const acceptCockpitChapterAndContinue = async () => {
    const currentNo = Number(writingCockpitModel.nextChapter?.chapterNo || 0)
    const next = sortedChapters.find(chapter => Number(chapter.chapter_no || 0) > currentNo && !chapterHasProse(chapter))
      || sortedChapters.find(chapter => Number(chapter.chapter_no || 0) > currentNo)
      || null

    if (!next?.id) {
      message.success('本章已达到交稿条件，当前项目暂无下一章。')
      return
    }

    setWorkspaceArea('chapterWriting')
    const saved = await selectChapterForWriting(Number(next.id))
    if (saved) message.success(`已进入第 ${next.chapter_no} 章。`)
  }

  const handleWritingCockpitAction = (key: WritingCockpitActionKey) => {
    const { targetChapterId, targetChapterUpdatedAt } = resolveWritingCockpitTarget({
      nextChapterId: writingCockpitModel.nextChapter?.id,
      activeChapter,
      sortedChapters,
    })

    switch (key) {
      case 'open_writing_bible':
        void openWritingBibleEditor()
        break
      case 'open_outline_panel':
        setOutlinePanelOpen(true)
        break
      case 'repair_materials':
        void openMaterialRepairPlan()
        break
      case 'refresh_context_package':
        void loadActiveChapterContextPackage({ chapterId: targetChapterId, updatedAt: targetChapterUpdatedAt })
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
      case 'build_scene_plan':
        if (targetChapterId) {
          setWorkspaceArea('chapterWriting')
          void selectChapterForWriting(targetChapterId).then((saved) => {
            if (saved) void generateSceneCardsForChapter(targetChapterId)
          })
        } else if (activeChapter) {
          setWorkspaceArea('chapterWriting')
          void generateSceneCardsForActiveChapter()
        } else {
          setOutlinePanelOpen(true)
        }
        break
      case 'write_draft':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId) {
          void selectChapterForWriting(targetChapterId).then((saved) => {
            if (saved) void generateCurrentChapterProse({ targetChapterId })
          })
        } else {
          void generateCurrentChapterProse()
        }
        break
      case 'review_draft':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId && Number(activeChapter?.id) !== targetChapterId) {
          void selectChapterForWriting(targetChapterId).then((saved) => {
            if (saved) void openChapterQualityCardForChapter(targetChapterId)
          })
        } else if (targetChapterId) {
          void openChapterQualityCardForChapter(targetChapterId)
        } else if (activeChapter) {
          void openChapterQualityCard()
        }
        break
      case 'fix_continuity':
        void openContinuityAudit()
        break
      case 'update_canon':
        openStoryStateEditor()
        break
      case 'open_task_center':
        setTaskCenterOpen(true)
        break
      case 'open_story_assets':
        openStoryAssetsWorkspace()
        break
      case 'refresh_current_quality':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId) {
          void refreshProseQualityForChapter(targetChapterId, 'writing_cockpit')
        } else if (activeChapter) {
          void refreshActiveProseQuality('writing_cockpit')
        }
        break
      case 'create_editor_report':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId) {
          void selectTargetChapterForWriting({
            targetChapterId,
            activeChapterId: activeChapter?.id,
            selectChapterForWriting,
          }).then((saved) => {
            if (saved) void createEditorReportForChapter(targetChapterId)
          })
        } else {
          void createEditorReport()
        }
        break
      case 'apply_editor_revision': {
        setWorkspaceArea('chapterWriting')
        const report = latestCockpitEditorReport()
        if (!report) {
          message.warning('还没有可用于修订的编辑报告。')
          setRightPanelOpen(true)
          setRightPanelTab('editorReports')
          break
        }
        void selectTargetChapterForWriting({
          targetChapterId,
          activeChapterId: activeChapter?.id,
          selectChapterForWriting,
        }).then((saved) => {
          if (saved) void applyEditorRevision(report, { skipConfirm: true, targetChapterId, autoStoryState: false })
        })
        break
      }
      case 'sync_story_state':
        void syncStoryStateForChapter(targetChapterId)
        break
      case 'accept_chapter_and_continue':
        void acceptCockpitChapterAndContinue()
        break
      case 'open_editor_reports':
        setRightPanelOpen(true)
        setRightPanelTab('editorReports')
        break
      case 'open_version_history':
        setWorkspaceArea('chapterWriting')
        if (targetChapterId && Number(activeChapter?.id) !== targetChapterId) {
          void selectTargetChapterForWriting({
            targetChapterId,
            activeChapterId: activeChapter?.id,
            selectChapterForWriting,
          }).then((saved) => {
            if (!saved) return
            setRightPanelOpen(true)
            setRightPanelTab('versions')
          })
          break
        }
        setRightPanelOpen(true)
        setRightPanelTab('versions')
        break
    }
  }

  const runAutoCreationRepairAction = async (repairAction: AutoCreationDirectorAction) => {
    if (!repairAction || repairAction.disabled || repairAction.key === 'auto_repair_blockers') return false
    switch (repairAction.key) {
      case 'longform_creation_diagnosis':
        await runLongformCreationDiagnosis()
        return true
      case 'run_first30_retention':
        await runFirst30RetentionDiagnosis()
        return true
      case 'create_first30_repair':
        await createFirst30RetentionRepairQueue()
        return true
      case 'run_reader_trial_review':
        await runReaderTrialReview()
        return true
      case 'create_reader_trial_repair':
        await createReaderTrialRepairQueue()
        return true
      case 'longform_pressure':
        await runLongformPressureTest()
        return true
      case 'sync_story_state':
        await syncStoryStateForChapter()
        return true
      case 'create_delivery_risk_repair':
        await createDeliveryRiskRepairQueue(repairAction.payload)
        return true
      case 'create_safe_batch_risk_repair':
        await createSafeBatchRiskRepairQueue()
        return true
      case 'create_style_sample_batch_repair':
        await createStyleSampleBatchRepairQueue()
        return true
      case 'create_recovery_evidence_governance_queue':
        await createRecoveryEvidenceGovernanceQueue(repairAction.payload)
        return true
      case 'create_script_room_repair':
        await createScriptRoomRepairQueue()
        return true
      case 'open_generation_diagnostics':
        await openGenerationDiagnostics()
        return true
      case 'open_story_assets':
        openStoryAssetsWorkspace()
        return true
      case 'open_task_center':
        setTaskCenterRecoveryFocus(safeBatchRecoveryFocusFromPayload(repairAction.payload))
        setTaskCenterOpen(true)
        return true
      case 'select_model':
        message.info('请先在顶部选择一个可用模型。')
        return true
      case 'complete_volume_plan':
        setOutlinePanelOpen(true)
        return true
      case 'open_outline_tree':
        setOutlineTreeOpen(true)
        return true
      case 'enter_story_planning':
        setWorkspaceArea('storyPlanning')
        return true
      case 'enter_chapter_writing':
        setWorkspaceArea('chapterWriting')
        return true
      case 'open_writing_bible':
        await openWritingBibleEditor()
        return true
      case 'repair_materials':
        await openMaterialRepairPlan()
        return true
      case 'refresh_context_package':
        await loadActiveChapterContextPackage()
        return true
      case 'refresh_current_quality':
        if (activeChapter) await refreshActiveProseQuality('auto_creation_repair')
        return true
      case 'create_editor_report':
        await createEditorReport()
        return true
      case 'apply_editor_revision':
        handleWritingCockpitAction('apply_editor_revision')
        return true
      case 'update_rolling_plan':
        await Promise.resolve(handlePlanningAction('update_rolling_plan', { intent: repairAction.payload }))
        return true
      case 'record_storyline_diff_decision':
        await recordStorylineDiffDecision(repairAction.payload)
        return true
      case 'create_storyline_decision_tasks':
        await createStorylineDecisionTasks()
        return true
      default:
        if (repairAction.area === 'planning' || repairAction.area === 'assets') {
          await Promise.resolve(handlePlanningAction(repairAction.key as PlanningActionKey, { intent: repairAction.payload }))
          return true
        }
        if (repairAction.area === 'writing' || repairAction.area === 'quality') {
          await Promise.resolve(handleWritingCockpitAction(repairAction.key as WritingCockpitActionKey))
          return true
        }
        return false
    }
  }

  const runAutoCreationRepairPlan = async (action: AutoCreationDirectorAction) => {
    const payloadActions = Array.isArray(action.payload?.actions) ? action.payload.actions : []
    const repairActions = payloadActions.length ? payloadActions : autoCreationDirectorModel.repairPlan.actions
    const executableActions = repairActions.filter((item: AutoCreationDirectorAction) => item && !item.disabled && item.key !== 'auto_repair_blockers')
    if (!executableActions.length) {
      message.info('当前没有可自动修复的阻塞。')
      return
    }
    setAutoDirectorActionLoadingKey('auto_repair_blockers')
    let completed = 0
    try {
      for (const repairAction of executableActions) {
        const handled = await runAutoCreationRepairAction(repairAction)
        if (handled) completed += 1
        setAutoDirectorActionLoadingKey('auto_repair_blockers')
      }
      await loadProjectModules()
      await loadProductionTasks()
      setTaskCenterOpen(true)
      message.success(`已处理自动修复阻塞：${completed}/${executableActions.length} 项`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '自动修复阻塞失败')
    } finally {
      setAutoDirectorActionLoadingKey('')
    }
  }

  const handleAutoCreationDirectorAction = (action: AutoCreationDirectorAction) => {
    if (action.disabled) return
    if (action.key === 'auto_repair_blockers') {
      void runAutoCreationRepairPlan(action)
      return
    }
    if (action.modelCall) setAutoDirectorActionLoadingKey(String(action.key))

    if (isAutoCreationPlanningArea(action)) {
      if (action.key === 'open_story_assets') {
        openStoryAssetsWorkspace()
        setAutoDirectorActionLoadingKey('')
        return
      }
      if (action.key === 'update_rolling_plan' && (action.payload?.source === 'batch_brief_repair' || action.payload?.source === 'recent_fatigue_repair')) {
        void Promise.resolve(handlePlanningAction(action.key as PlanningActionKey, { intent: action.payload }))
          .finally(() => setAutoDirectorActionLoadingKey(''))
        return
      }
      void Promise.resolve(handlePlanningAction(action.key as PlanningActionKey))
        .finally(() => setAutoDirectorActionLoadingKey(''))
      return
    }

    if (isAutoCreationWritingArea(action)) {
      void Promise.resolve(handleWritingCockpitAction(action.key as WritingCockpitActionKey))
        .finally(() => setAutoDirectorActionLoadingKey(''))
      return
    }

    if (action.key === 'review_governance_closure') {
      setTaskCenterOpen(true)
      const repairRunId = Number(action.payload?.repairAuditRunId || 0)
      const repairRun = repairRunId ? runRecords.find(run => Number(run.id) === repairRunId) : null
      if (repairRun) {
        void Promise.resolve(generateLongformRepairAuditSummary(repairRun))
          .finally(() => setAutoDirectorActionLoadingKey(''))
      } else {
        message.info('已打开任务中心，请逐项处理治理闭环任务。')
        setAutoDirectorActionLoadingKey('')
      }
      return
    }

    if (action.key === 'open_task_center') {
      setTaskCenterRecoveryFocus(safeBatchRecoveryFocusFromPayload(action.payload))
      setTaskCenterOpen(true)
      setAutoDirectorActionLoadingKey('')
      return
    }

    if (action.key === 'start_safe_batch_generation') {
      const guardrail = autoCreationDirectorModel.batchGuardrail
      if (guardrail.status !== 'ready' || guardrail.safeChapterCount <= 0) {
        message.warning('连续生产护栏尚未通过，先处理阻塞或谨慎项。')
        setAutoDirectorActionLoadingKey('')
        return
      }
      void stepGenerateProse({
        limit: autoCreationDirectorModel.batchGuardrail.safeChapterCount,
        allowedChapterNos: autoCreationDirectorModel.batchGuardrail.nextBatchBrief.chapters.map(chapter => chapter.chapterNo),
        source: 'auto_creation_safe_batch',
        longformCompass: autoCreationDirectorModel.longformCompass,
        longformBattleContext: autoCreationDirectorModel.longformBattleDesk,
        chapterLaunchGate: autoCreationDirectorModel.chapterLaunchGate,
        nextBatchBrief: autoCreationDirectorModel.batchGuardrail.nextBatchBrief,
        batchPreflight: autoCreationDirectorModel.batchGuardrail.preflight.inputSnapshot,
        millionWordRunway: autoCreationDirectorModel.millionWordRunway,
      })
        .finally(() => setAutoDirectorActionLoadingKey(''))
      return
    }

    if (action.key === 'create_safe_batch_risk_repair') {
      void createSafeBatchRiskRepairQueue()
      return
    }

    if (action.key === 'create_style_sample_batch_repair') {
      void createStyleSampleBatchRepairQueue()
      return
    }

    if (action.key === 'create_recovery_evidence_governance_queue') {
      void createRecoveryEvidenceGovernanceQueue(action.payload)
      return
    }

    if (action.key === 'create_script_room_repair') {
      void createScriptRoomRepairQueue()
      return
    }

    if (action.key === 'create_delivery_risk_repair') {
      void createDeliveryRiskRepairQueue(action.payload)
      return
    }

    if (action.key === 'select_model') {
      message.info('请先在顶部选择一个可用模型。')
      setAutoDirectorActionLoadingKey('')
    }
  }

  const handleSerialPipelineAction = (key: string) => {
    switch (key) {
      case 'open_writing_bible':
        openStoryAssetsWorkspace()
        void openWritingBibleEditor()
        break
      case 'enter_story_planning':
        setWorkspaceArea('storyPlanning')
        break
      case 'confirm_plan_and_write_draft':
        handleWritingCockpitAction('confirm_plan_and_write_draft')
        break
      case 'refresh_current_quality':
        handleWritingCockpitAction('refresh_current_quality')
        break
      case 'create_editor_report':
        handleWritingCockpitAction('create_editor_report')
        break
      case 'apply_editor_revision':
        handleWritingCockpitAction('apply_editor_revision')
        break
      case 'sync_story_state':
        handleWritingCockpitAction('sync_story_state')
        break
      case 'start_safe_batch':
        setWorkspaceArea('autoCreation')
        handleAutoCreationDirectorAction({ key: 'start_safe_batch_generation' } as AutoCreationDirectorAction)
        break
      case 'open_longform_governance':
        setWorkspaceArea('productionOps')
        void openLongformProductionTrends()
        break
      default: {
        const area = serialPipelineActionWorkspaceArea(key, serialPipelineModel.primaryAction.workspace_area)
        if (area) setWorkspaceArea(area)
      }
    }
  }


  return {
    handlePlanningAction,
    acceptCockpitChapterAndContinue,
    handleWritingCockpitAction,
    runAutoCreationRepairAction,
    runAutoCreationRepairPlan,
    handleAutoCreationDirectorAction,
    handleSerialPipelineAction,
  }
}
