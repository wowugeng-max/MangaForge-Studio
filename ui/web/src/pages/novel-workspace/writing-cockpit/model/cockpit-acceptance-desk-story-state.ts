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
import { parseWorkspacePayload } from '../../payloadParseCache'


import {
  ACTION_LABELS,
  QUALITY_PASS_THRESHOLD,
  arrayValue,
  buildApprovalBlockerSummary,
  buildBlueprintReceiptSummary,
  buildDeliveryRiskReceiptSummary,
  buildDeslopGateDiagnosticsSummary,
  buildPlatformRubricSummary,
  buildQualityAuditSummary,
  buildRevisionReceiptSummary,
  buildSceneCardReceiptSummary,
  compareReviewRefs,
  countArray,
  createdTime,
  deliveryReceiptsFrom,
  firstNonEmpty,
  hasProse,
  issueText,
  latestReviewRef,
  parsedTime,
  proseQualityReviewMatchesCurrentChapter,
  qualityPayload,
  reportPayload,
  reviewPayload,
  reviewType,
  revisionPayload,
  storylineSyncPayload,
  stringArray,
  text,
  uniqueObjects,
  uniqueStrings,
} from './cockpit-basics'
import {
  buildAssetIntakeSummary,
  buildBenchmarkRecallSyncSummary,
  buildChapterAttractionSummary,
  buildChapterBenchmarkSyncSummary,
  buildChapterHandoffSyncSummary,
  buildCharacterArcSyncSummary,
  buildCoreDriftSummary,
  buildDeliveryRiskQueue,
  buildFirst30RetentionRecheckSummary,
  buildInnovationSyncSummary,
  buildIntentConfirmationSyncSummary,
  buildIpSceneIntakeSummary,
  buildPreDraftExecutionSyncSummary,
  buildQualityAuditRepairReceiptSyncSummary,
  buildQualityAuditSyncSummary,
  buildQualityCheckSummary,
  buildReadabilityReviewSummary,
  buildReaderExpectationSyncSummary,
  buildReaderPayoffSyncSummary,
  buildReaderRetentionSyncSummary,
  buildRunwaySyncSummary,
  buildSceneCardDirectiveSummary,
  buildSignatureSceneSyncSummary,
  buildStoryDriveSyncSummary,
  buildStoryUnitSyncSummary,
  buildStorylineSyncSummary,
  buildStyleSampleSyncSummary,
  buildVolumeBeatSyncSummary,
  mergeContractSyncSummary,
} from './cockpit-acceptance'

import {
  buildDeliveryRiskConvergenceSummary,
  buildGovernanceRecheckSyncSummary,
  extractQualityScore,
  resolveProseAdmission,
  normalizedAdmissionWarnings,
  normalizedPostCommitWarnings,
  hasUsableProseQualityReview,
  extractMustFix,
  extractOptionalImprovements,
  reportBelongsToCurrentQualityCycle,
  storyStateFailureMessages
} from './cockpit-acceptance-desk-utils'

export function buildStoryStatePanel(args: {
  chapter: AnyRecord
  storyState: AnyRecord
  proseAdmission: AnyRecord | null
  hasChapterProse: boolean
}): ChapterAcceptanceDeskModel['storyStatePanel'] {
  if (!args.hasChapterProse) return null
  const chapterNo = Number(args.chapter?.chapter_no || args.chapter?.chapterNo || 0)
  const lastUpdatedChapter = Number(args.storyState?.last_updated_chapter || args.storyState?.lastUpdatedChapter || 0)
  const admissionStoryStatus = firstNonEmpty(
    args.proseAdmission?.story_state_status,
    args.proseAdmission?.storyStateStatus,
  )
  const warning = args.proseAdmission?.story_state_warning || args.proseAdmission?.storyStateWarning || null
  const reasons = storyStateFailureMessages(warning)
  const skippedReason = firstNonEmpty(warning?.reason, '')
  const skippedByMode = /draft_only|draft_review/i.test(skippedReason)
  const laggingByCursor = chapterNo > 0 && lastUpdatedChapter > 0 && lastUpdatedChapter < chapterNo
  const laggingUnknown = chapterNo > 0 && lastUpdatedChapter === 0
  let status: 'synced' | 'pending' | 'skipped' | 'lagging' | 'synced_with_gaps' = 'synced'
  if (admissionStoryStatus === 'pending' || skippedByMode) {
    status = skippedByMode ? 'skipped' : 'pending'
  } else if (admissionStoryStatus === 'synced' && reasons.length > 0) {
    status = 'synced_with_gaps'
  } else if (admissionStoryStatus === 'synced') {
    status = laggingByCursor ? 'lagging' : 'synced'
  } else if (laggingByCursor || laggingUnknown) {
    status = 'lagging'
  } else if (reasons.length > 0) {
    status = 'pending'
  } else {
    status = lastUpdatedChapter >= chapterNo && chapterNo > 0 ? 'synced' : 'lagging'
  }

  const statusLabel = ({
    synced: '已同步',
    pending: '待同步',
    skipped: '本模式跳过',
    lagging: '落后于正文',
    synced_with_gaps: '已同步（有缺口）',
  } as const)[status]

  const headline = ({
    synced: `状态机已同步到第 ${Math.max(lastUpdatedChapter, chapterNo)} 章`,
    pending: '正文已入库，故事状态机尚未写入',
    skipped: '当前生产模式不会自动更新状态机',
    lagging: `状态机仍停在第 ${lastUpdatedChapter || 0} 章，落后于第 ${chapterNo} 章正文`,
    synced_with_gaps: '状态机已推进，但仍有计划状态缺口',
  } as const)[status]

  const defaultSummary = ({
    synced: '角色位置、道具归属、伏笔和时间线已与本章正文对齐。',
    pending: '系统设计会把“正文入库”和“状态机写入”拆开：准备不完整时先保住正文，避免用不完整 delta 污染长期记忆。',
    skipped: '只初稿 / 生成并自检 模式为防草稿污染，不会自动写状态机。满意正文后可手动同步。',
    lagging: '已有正文比状态机更新更靠后。继续写下一章前，建议先同步本章状态机。',
    synced_with_gaps: 'last_updated_chapter 已推进，但部分角色/资产/交接变化仍被标记为缺口，可按需重新同步补齐。',
  } as const)[status]

  const guidance = ({
    synced: '可继续下一章；若你刚改过大纲或角色设定，也可重新同步一次。',
    pending: '正文不用重写。点“立即同步故事状态”即可补写状态机；同步时允许带软警告推进。',
    skipped: '切换到“生成、自检、修订、入库”会自动尝试更新；或现在直接点“立即同步故事状态”。',
    lagging: '点“立即同步故事状态”，系统会从本章起按已写正文补跑状态机。',
    synced_with_gaps: '若你对正文已满意，可再点一次同步尝试补齐缺口；也可先继续写作。',
  } as const)[status]

  const eventSource = Array.isArray(args.storyState?.established_events)
    ? args.storyState.established_events
    : Array.isArray(args.storyState?.establishedEvents)
      ? args.storyState.establishedEvents
      : Array.isArray(args.storyState?.canon_facts)
        ? args.storyState.canon_facts
        : Array.isArray(args.storyState?.canonFacts)
          ? args.storyState.canonFacts
          : []
  const preview = eventSource
    .map((item: any) => {
      if (typeof item === 'string') return String(item || '').trim()
      return String(item?.fact || item?.text || item?.summary || '').trim()
    })
    .filter(Boolean)
    .slice(0, 5)
  const confirmedCount = eventSource.filter((item: any) => {
    if (typeof item === 'string') return Boolean(item.trim())
    const st = String(item?.status || 'confirmed')
    return st === 'confirmed' || !item?.status
  }).length
  const candidateCount = eventSource.filter((item: any) => item && typeof item === 'object' && item.status === 'candidate').length
  const hardCount = eventSource.filter((item: any) => {
    if (typeof item === 'string') return false
    return item?.lock_level === 'hard' || item?.lockLevel === 'hard' || item?.kind === 'death' || item?.kind === 'rule_trigger'
  }).length
  const establishedEvents = {
    confirmedCount,
    candidateCount,
    hardCount,
    preview,
    guidance: preview.length
      ? `已锁正史事件 ${confirmedCount} 条（硬锁 ${hardCount}）。下一章闪回/复述必须一致。`
      : (status === 'synced'
        ? '本章已同步，但还没有抽到事件级正史。若正文含死亡方式/规则触发，建议重新同步。'
        : '同步故事状态后，会抽取死亡方式、规则触发等不可改写事件。'),
  }
  const panelReasons = [...reasons]
  if (!preview.length && status === 'synced') {
    panelReasons.push('未抽到事件级正史（死亡/规则等），闪回章可能改写旧事实')
  }

  const canSync = status !== 'synced'
  return {
    visible: true,
    status,
    statusLabel,
    headline,
    summary: defaultSummary,
    reasons: Array.from(new Set(panelReasons)).slice(0, 6),
    guidance,
    chapterNo,
    lastUpdatedChapter,
    canSync,
    primaryAction: canSync
      ? { key: 'sync_story_state', label: status === 'skipped' || status === 'pending' || status === 'lagging' ? '立即同步故事状态' : '重新同步故事状态' }
      : { key: 'sync_story_state', label: '重新同步故事状态' },
    establishedEvents,
  }
}

