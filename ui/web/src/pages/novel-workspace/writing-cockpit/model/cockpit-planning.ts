import type {
  AnyRecord,
  WritingCockpitRole,
  WritingCockpitActionKey,
  WritingReadinessStatus,
  WritingReadinessCheck,
  WritingCockpitChapter,
  WritingQueueItemStatus,
  WritingQueueItem,
  WritingQueueModel,
  ChapterPlanningReadiness,
  ChapterContextPackageStatus,
  ChapterScenePlanStatus,
  ChapterPlanningDeskSceneCard,
  ChapterQualityContinuitySceneMapItem,
  ChapterWritePreparationBrief,
  ChapterPlanningDeskModel,
  ChapterAcceptanceStatus,
  DeslopGateDiagnosticsModel,
  ChapterAcceptanceDeskModel,
  ChapterHandoffStatus,
  ChapterHandoffDeskModel,
  LongformWorkflowStageKey,
  LongformWorkflowStageStatus,
  LongformWorkflowStageModel,
  LongformWorkflowModel,
  WritingCockpitModel,
  BuildWritingCockpitModelInput,
} from './types'
import { buildCharacterPovUiModel } from '../../characterPovUiModel'
import { parseWorkspacePayload } from '../../payloadParseCache'


import {
  readerExpectationSyncPayload,
} from './cockpit-acceptance'
import {
  ACTION_LABELS,
  arrayValue,
  blockerTexts,
  buildQualityContinuitySceneMap,
  chapterSceneCards,
  contextPackageStatus,
  contextPreflight,
  contextTarget,
  deliveryRiskCarryOverNeedsSceneMapping,
  diagnosticsBlockers,
  directorActionLabel,
  directorPlannerAction,
  directorPlanningReasons,
  firstNonEmpty,
  hasProse,
  latestReviewRef,
  normalizeCoreContractPlan,
  normalizeDeliveryRiskCarryOverPlan,
  normalizeOhStoryDirector,
  normalizePageTurnHookPlan,
  normalizeReaderDropRiskPlan,
  normalizeSerialRhythmPlan,
  normalizeStoryDrivePlan,
  normalizeStoryPressurePlan,
  normalizeVolumeClimaxPlan,
  normalizeWritePreparationBrief,
  previousEnding,
  stringArray,
  text,
  writePreparationReasonTexts,
} from './cockpit-basics'

export function buildHiddenHandoffDesk(): ChapterHandoffDeskModel {
  return {
    visible: false,
    status: 'hidden',
    label: '等待交接',
    fromChapterNo: null,
    toChapterNo: null,
    previousEnding: '',
    nextOpeningObligations: [],
    expectationCarryOver: [],
    deliveryRiskCarryOver: null,
    storyStateSynced: false,
    storylineStatusLabel: '',
    actionKey: 'write_draft',
    actionLabel: ACTION_LABELS.write_draft,
  }
}

export function handoffItemText(item: any) {
  if (typeof item === 'string') return text(item)
  return firstNonEmpty(item?.text, item?.label, item?.name, item?.summary, item?.detail, item?.title)
}

export function handoffTextItems(value: any): string[] {
  return Array.from(new Set(arrayValue(value).map(handoffItemText).filter(Boolean))).slice(0, 4)
}

export function buildChapterHandoffDesk(args: {
  fromChapter: AnyRecord | null
  toChapter: AnyRecord | null
  acceptanceDesk: ChapterAcceptanceDeskModel
  reviews: AnyRecord[]
}): ChapterHandoffDeskModel {
  if (!args.fromChapter || !hasProse(args.fromChapter) || !args.toChapter) return buildHiddenHandoffDesk()

  const readerExpectationRef = latestReviewRef(args.reviews, args.fromChapter, 'reader_expectation_sync')
  const expectationPayload = readerExpectationSyncPayload(readerExpectationRef?.review || null)
  const expectationCarryOver = handoffTextItems(expectationPayload?.missed)
  const nextOpeningObligations = handoffTextItems(expectationPayload?.keep_alive)
  const ready = ['ready_to_accept', 'delivered', 'delivered_with_warnings'].includes(args.acceptanceDesk.acceptanceStatus)

  return {
    visible: true,
    status: ready ? 'ready' : 'needs_delivery',
    label: ready ? '可接下一章' : '先完成交稿',
    fromChapterNo: Number(args.fromChapter?.chapter_no || 0) || null,
    toChapterNo: Number(args.toChapter?.chapter_no || 0) || null,
    previousEnding: previousEnding(args.fromChapter),
    nextOpeningObligations,
    expectationCarryOver,
    deliveryRiskCarryOver: args.acceptanceDesk.deliveryRiskQueue || null,
    storyStateSynced: args.acceptanceDesk.storyStateSynced,
    storylineStatusLabel: args.acceptanceDesk.storylineSync?.label || '',
    actionKey: ready ? 'accept_chapter_and_continue' : args.acceptanceDesk.recommendedAcceptanceAction.key,
    actionLabel: ready ? '进入下一章开写' : '先完成交稿',
  }
}

export function buildEpisodePlan(args: {
  nextChapter: AnyRecord | null
  cockpitChapter: WritingCockpitChapter | null
  contextPackage?: AnyRecord | null
}): ChapterPlanningDeskModel['episodePlan'] {
  const target = contextTarget(args.contextPackage)
  const forbiddenRepeats = stringArray(target?.forbidden_repeats)
  const coreContract = normalizeCoreContractPlan(args.contextPackage, target)
  const readerDropRisk = normalizeReaderDropRiskPlan(args.contextPackage, target)
  const storyPressure = normalizeStoryPressurePlan(args.contextPackage, target)
  const storyDrive = normalizeStoryDrivePlan(args.contextPackage, target)
  const serialRhythm = normalizeSerialRhythmPlan(args.contextPackage, target)
  const pageTurnHook = normalizePageTurnHookPlan(args.contextPackage, target)
  const volumeClimax = normalizeVolumeClimaxPlan(args.contextPackage, target)
  const deliveryRiskCarryOver = normalizeDeliveryRiskCarryOverPlan(args.contextPackage, target)
  return {
    chapterObjective: firstNonEmpty(target?.chapter_goal, target?.chapterObjective, target?.goal, target?.summary, args.cockpitChapter?.chapterGoal),
    previousHandoff: firstNonEmpty(target?.previous_handoff, target?.previousHandoff, args.cockpitChapter?.previousEnding),
    coreConflict: firstNonEmpty(target?.core_conflict, target?.coreConflict, target?.conflict, args.cockpitChapter?.conflict),
    emotionalMovement: firstNonEmpty(target?.emotional_movement, target?.emotionalMovement, target?.emotion),
    payoff: firstNonEmpty(target?.payoff, target?.reader_reward, target?.readerReward),
    endingHook: firstNonEmpty(target?.ending_hook, target?.endingHook, args.cockpitChapter?.endingHook),
    forbiddenRepeats: forbiddenRepeats.length > 0
      ? forbiddenRepeats
      : (args.cockpitChapter?.forbiddenRepeats || []),
    coreContract,
    readerDropRisk,
    storyPressure,
    storyDrive,
    serialRhythm,
    pageTurnHook,
    volumeClimax,
    deliveryRiskCarryOver,
  }
}

export function buildChapterPlanningDesk(args: {
  nextChapter: AnyRecord | null
  cockpitChapter: WritingCockpitChapter | null
  contextPackage?: AnyRecord | null
  diagnostics?: AnyRecord | null
}): ChapterPlanningDeskModel {
  const contextStatus = contextPackageStatus(args.contextPackage)
  const sceneCards = chapterSceneCards(args.nextChapter, args.contextPackage)
  const characterPov = buildCharacterPovUiModel({
    sceneCards,
    characters: Array.isArray(args.contextPackage?.characters) ? args.contextPackage.characters : [],
    chapterText: String(args.nextChapter?.chapter_text || args.nextChapter?.chapterText || ''),
  })
  const qualityContinuitySceneMap = buildQualityContinuitySceneMap(sceneCards)
  const scenePlanStatus: ChapterScenePlanStatus = sceneCards.length > 0 ? 'ready' : 'missing'
  const diagnosticBlockers = diagnosticsBlockers(args.diagnostics)
  const preflightBlockers = blockerTexts(contextPreflight(args.contextPackage)?.blockers)
  const writePreparationBrief = normalizeWritePreparationBrief(args.contextPackage)
  const writePreparationReasons = writePreparationReasonTexts(writePreparationBrief)
  const episodePlan = buildEpisodePlan(args)
  const director = normalizeOhStoryDirector(args.contextPackage)
  const directorActionKey = directorPlannerAction(director)
  const directorReadiness = text(director?.readiness)
  const qualityContinuityNeedsSceneMapping = deliveryRiskCarryOverNeedsSceneMapping(episodePlan.deliveryRiskCarryOver)
    && sceneCards.length > 0
    && qualityContinuitySceneMap.length === 0
    && !writePreparationBrief?.sourceGaps.length

  if (!args.nextChapter) {
    return {
      readiness: 'blocked',
      statusLabel: '缺目标章节',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons: ['需要先创建或选择章节。'],
      recommendedPlannerAction: { key: 'open_outline_panel', label: ACTION_LABELS.open_outline_panel },
      shouldAutoExpandPlanner: true,
      writePreparationBrief,
      episodePlan,
      sceneCards,
      characterPov,
      qualityContinuitySceneMap,
    }
  }

  if (director && directorActionKey && directorReadiness !== 'ready') {
    const blocked = directorReadiness === 'blocked'
    const reasons = directorPlanningReasons(director, blocked ? '总导演判断需要人工确认后继续。' : '总导演判断本章写前材料需要修复。')
    return {
      readiness: blocked ? 'blocked' : 'needs_context',
      statusLabel: blocked ? '需要确认' : '需要修复',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons,
      recommendedPlannerAction: {
        key: directorActionKey,
        label: directorActionLabel(director, directorActionKey),
      },
      shouldAutoExpandPlanner: true,
      writePreparationBrief,
      episodePlan,
      sceneCards,
      characterPov,
      qualityContinuitySceneMap,
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
      writePreparationBrief,
      episodePlan,
      sceneCards,
      characterPov,
      qualityContinuitySceneMap,
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
      writePreparationBrief,
      episodePlan,
      sceneCards,
      characterPov,
      qualityContinuitySceneMap,
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
      writePreparationBrief,
      episodePlan,
      sceneCards,
      characterPov,
      qualityContinuitySceneMap,
    }
  }

  if (qualityContinuityNeedsSceneMapping) {
    return {
      readiness: 'needs_scene_plan',
      statusLabel: '需补质量续航落点',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons: ['检测到 delivery_risk_carry_over / 质量续航动作，但当前场景卡没有写入 serial_risk_repairs、recent_fatigue_action、required_beats 或章末钩子落点。'],
      recommendedPlannerAction: { key: 'build_scene_plan', label: ACTION_LABELS.build_scene_plan },
      shouldAutoExpandPlanner: true,
      writePreparationBrief,
      episodePlan,
      sceneCards,
      characterPov,
      qualityContinuitySceneMap,
    }
  }

  if (writePreparationBrief?.readinessStatus === 'needs_context' && writePreparationReasons.length > 0) {
    const actionKey: WritingCockpitActionKey = writePreparationBrief.sourceGaps.length > 0
      || writePreparationBrief.deliveryRiskActions.length > 0
      ? 'open_generation_diagnostics'
      : 'open_story_assets'
    return {
      readiness: 'needs_context',
      statusLabel: '写前准备待确认',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons: writePreparationReasons.slice(0, 3),
      recommendedPlannerAction: { key: actionKey, label: ACTION_LABELS[actionKey] },
      shouldAutoExpandPlanner: true,
      writePreparationBrief,
      episodePlan,
      sceneCards,
      characterPov,
      qualityContinuitySceneMap,
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
      writePreparationBrief,
      episodePlan,
      sceneCards,
      characterPov,
      qualityContinuitySceneMap,
    }
  }

  if (director && directorActionKey && directorReadiness === 'ready') {
    return {
      readiness: 'ready',
      statusLabel: '可继续',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons: directorPlanningReasons(director, '总导演判断本章写前材料可用。'),
      recommendedPlannerAction: {
        key: directorActionKey,
        label: directorActionLabel(director, directorActionKey),
      },
      shouldAutoExpandPlanner: false,
      writePreparationBrief,
      episodePlan,
      sceneCards,
      characterPov,
      qualityContinuitySceneMap,
    }
  }

  if (args.cockpitChapter?.hasProse) {
    return {
      readiness: 'ready',
      statusLabel: '本章可审',
      contextPackageStatus: contextStatus,
      scenePlanStatus,
      reasons: ['本章已有正文，优先进入审阅修订。'],
      recommendedPlannerAction: { key: 'review_draft', label: ACTION_LABELS.review_draft },
      shouldAutoExpandPlanner: false,
      writePreparationBrief,
      episodePlan,
      sceneCards,
      characterPov,
      qualityContinuitySceneMap,
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
    writePreparationBrief,
    episodePlan,
    sceneCards,
    characterPov,
    qualityContinuitySceneMap,
  }
}

const LONGFORM_SETUP_CHECK_KEYS = new Set<WritingReadinessCheck['key']>([
  'writing_bible_missing',
  'writing_bible_ready',
  'volume_goal_missing',
  'volume_goal_ready',
  'chapter_missing',
  'chapter_ready',
  'chapter_outline_missing',
  'chapter_outline_ready',
  'materials_not_ready',
  'materials_ready',
  'memory_unavailable',
  'memory_ready',
])

export function workflowStatusFromChecks(checks: WritingReadinessCheck[]): LongformWorkflowStageStatus {
  if (checks.some(check => check.status === 'blocker')) return 'blocked'
  if (checks.some(check => check.status === 'warning')) return 'needs_action'
  return 'ready'
}

export function workflowStatusFromPlanning(readiness: ChapterPlanningReadiness): LongformWorkflowStageStatus {
  if (readiness === 'blocked') return 'blocked'
  if (readiness === 'ready') return 'ready'
  return 'needs_action'
}

export function compactWorkflowEvidence(items: string[], fallback: string) {
  const evidence = items.map(item => text(item)).filter(Boolean)
  return evidence.length ? evidence.slice(0, 6) : [fallback]
}

export function buildLongformWorkflow(args: {
  readinessChecks: WritingReadinessCheck[]
  chapterPlanningDesk: ChapterPlanningDeskModel
  chapterAcceptanceDesk: ChapterAcceptanceDeskModel
}): LongformWorkflowModel {
  const setupChecks = args.readinessChecks.filter(check => LONGFORM_SETUP_CHECK_KEYS.has(check.key))
  const setupIssues = setupChecks.filter(check => check.status !== 'pass')
  const setupAction = setupIssues[0]?.actionKey || 'open_writing_bible'
  const setupStage: LongformWorkflowStageModel = {
    key: 'creation_setup',
    label: '开书设定',
    status: workflowStatusFromChecks(setupChecks),
    actionKey: setupAction,
    actionLabel: ACTION_LABELS[setupAction],
    evidence: compactWorkflowEvidence(
      setupIssues.map(check => check.label),
      '写作圣经、卷目标、目标章节和材料已就绪。',
    ),
    riskCount: setupIssues.length,
  }

  const planning = args.chapterPlanningDesk
  const preDraftEvidence = [
    `上下文包：${planning.contextPackageStatus === 'ready' ? '已就绪' : planning.contextPackageStatus === 'insufficient' ? '不足' : '缺失'}`,
    `场景卡：${planning.scenePlanStatus === 'ready' ? `${planning.sceneCards.length} 个` : '缺失'}`,
    ...planning.reasons,
  ]
  const preDraftStage: LongformWorkflowStageModel = {
    key: 'pre_draft',
    label: '写前准备',
    status: workflowStatusFromPlanning(planning.readiness),
    actionKey: planning.recommendedPlannerAction.key,
    actionLabel: planning.recommendedPlannerAction.label,
    evidence: compactWorkflowEvidence(preDraftEvidence, '上下文、场景卡和写前意图已就绪。'),
    riskCount: planning.readiness === 'ready' ? 0 : Math.max(1, planning.reasons.length),
  }

  const acceptance = args.chapterAcceptanceDesk
  const deliveryRiskCount = Number(acceptance.deliveryRiskQueue?.totalCount || 0)
  const reviewRiskCount = deliveryRiskCount + acceptance.mustFix.length
  const postDraftStatus: LongformWorkflowStageStatus = !acceptance.visible
    ? 'waiting'
    : reviewRiskCount > 0
      || ['needs_quality_check', 'needs_revision', 'needs_recheck'].includes(acceptance.acceptanceStatus)
      ? 'needs_action'
      : 'ready'
  const postDraftAction: WritingCockpitActionKey = reviewRiskCount > 0
    ? 'open_task_center'
    : acceptance.visible
      ? acceptance.recommendedAcceptanceAction.key
      : 'write_draft'
  const postDraftStage: LongformWorkflowStageModel = {
    key: 'post_draft_review',
    label: '写后诊断',
    status: postDraftStatus,
    actionKey: postDraftAction,
    actionLabel: ACTION_LABELS[postDraftAction],
    evidence: compactWorkflowEvidence(
      acceptance.visible
        ? [
            acceptance.statusLabel,
            ...acceptance.acceptanceReasons,
            ...(acceptance.deliveryRiskQueue?.items || []),
            acceptance.chapterAttraction?.label || '',
            acceptance.readerRetentionSync?.label || '',
            acceptance.storyUnitSync?.label || '',
            acceptance.signatureSceneSync?.label || '',
          ]
        : ['正文未生成，等待初稿。'],
      '交稿复检和章节诊断已通过。',
    ),
    riskCount: reviewRiskCount,
  }

  const repairReceiptRisk = Number(acceptance.qualityAuditRepairReceiptSync?.missedCount || 0)
    + Number(acceptance.revisionReceipt?.riskCount || 0)
    + Number(acceptance.deliveryRiskReceipt?.riskCount || 0)
    + Number(acceptance.deliveryRiskConvergence?.residualCount || 0)
  const continuityRiskCount = (!acceptance.visible || acceptance.storyStateSynced ? 0 : 1) + repairReceiptRisk
  const continuityStatus: LongformWorkflowStageStatus = !acceptance.visible
    ? 'waiting'
    : continuityRiskCount > 0
      ? 'needs_action'
      : 'ready'
  const continuityAction: WritingCockpitActionKey = acceptance.visible && !acceptance.storyStateSynced
    ? 'sync_story_state'
    : repairReceiptRisk > 0
      ? 'open_task_center'
      : acceptance.visible
        ? acceptance.recommendedAcceptanceAction.key
        : 'write_draft'
  const continuityStage: LongformWorkflowStageModel = {
    key: 'quality_continuity',
    label: '质量续航',
    status: continuityStatus,
    actionKey: continuityAction,
    actionLabel: ACTION_LABELS[continuityAction],
    evidence: compactWorkflowEvidence(
      acceptance.visible
        ? [
            acceptance.storyStateSynced ? '故事状态已同步' : '故事状态待同步',
            acceptance.qualityAuditRepairReceiptSync?.label || '',
            acceptance.revisionReceipt?.label || '',
            acceptance.deliveryRiskReceipt?.label || '',
            acceptance.deliveryRiskConvergence?.label || '',
          ]
        : ['等待正文和交稿复检后同步故事状态。'],
      '修复回执、故事状态和下一章交接已闭环。',
    ),
    riskCount: continuityRiskCount,
  }

  const stages = [setupStage, preDraftStage, postDraftStage, continuityStage]
  const currentStage = stages.find(stage => stage.status === 'blocked' || stage.status === 'needs_action')
    || stages.find(stage => stage.status === 'waiting')
    || continuityStage
  return {
    stages,
    currentStage,
    primaryAction: {
      key: currentStage.actionKey,
      label: currentStage.actionLabel,
    },
    riskCount: stages.reduce((sum, stage) => sum + stage.riskCount, 0),
  }
}
