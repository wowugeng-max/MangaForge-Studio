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

export function deliveryRiskConvergencePayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.delivery_risk_convergence || payload?.result?.delivery_risk_convergence || payload?.result || payload
}

export function buildDeliveryRiskConvergenceSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['deliveryRiskConvergence'] {
  if (!review) return null
  const payload = deliveryRiskConvergencePayload(review)
  const statusText = text(payload?.status || review?.status).toLowerCase()
  const status: 'cleared' | 'improved' | 'unchanged' | 'worse' =
    statusText === 'cleared' || statusText === 'improved' || statusText === 'worse' ? statusText : 'unchanged'
  const residualCountValue = Number(payload?.residual_count ?? payload?.residualCount ?? payload?.after_count)
  const resolvedCountValue = Number(payload?.resolved_count ?? payload?.resolvedCount)
  const residualCount = Number.isFinite(residualCountValue) ? residualCountValue : 0
  const resolvedCount = Number.isFinite(resolvedCountValue) ? resolvedCountValue : 0
  const nextActions = Array.isArray(payload?.next_actions) ? payload.next_actions.map((item: any) => text(item)).filter(Boolean) : []

  return {
    status,
    label: text(payload?.label) || (status === 'cleared' ? '风险已清零' : status === 'improved' ? `风险收敛 ${resolvedCount}` : status === 'worse' ? '新增风险' : `仍有残留 ${residualCount}`),
    residualCount,
    resolvedCount,
    nextAction: nextActions[0] || '',
  }
}

export function governanceRecheckSyncPayload(review?: AnyRecord | null) {
  const payload = review ? reviewPayload(review) : {}
  return payload?.governance_recheck_sync || payload?.result?.governance_recheck_sync || payload?.result || payload
}

export function reviewItemTextArray(value: any): string[] {
  if (!Array.isArray(value)) return stringArray(value)
  return value.map(item => {
    if (!item || typeof item !== 'object') return text(item)
    return firstNonEmpty(item.text, item.label, item.summary, item.detail, item.name, item.title)
  }).filter(Boolean)
}

export function buildGovernanceRecheckSyncSummary(review?: AnyRecord | null): ChapterAcceptanceDeskModel['governanceRecheckSync'] {
  if (!review) return null
  const payload = governanceRecheckSyncPayload(review)
  const payloadMissedCount = Number(payload?.missed_count ?? payload?.missedCount)
  const failedEvidence = reviewItemTextArray(payload?.failed_evidence || payload?.failedEvidence)
  const missedItems = reviewItemTextArray(payload?.missed || payload?.missed_items || payload?.missedItems)
  const missedCount = Number.isFinite(payloadMissedCount)
    ? payloadMissedCount
    : failedEvidence.length + missedItems.length
  const status: 'ok' | 'warn' = text(payload?.status || review?.status).toLowerCase() === 'ok' && missedCount === 0 ? 'ok' : 'warn'

  return {
    status,
    label: status === 'ok' ? '恢复依据 OK' : text(payload?.label) || `恢复依据缺口 ${missedCount}`,
    missedCount,
    failedEvidence: failedEvidence.slice(0, 6),
    watchItems: reviewItemTextArray(payload?.watch_items || payload?.watchItems).slice(0, 6),
    summary: text(payload?.summary || review?.summary),
  }
}

export function extractQualityScore(quality: AnyRecord) {
  const value = quality?.score ?? quality?.overall_score ?? quality?.quality_score
  if (value === null || value === undefined || value === '') return null
  const score = Number(value)
  return Number.isFinite(score) ? score : null
}

export function recordValue(value: any): AnyRecord {
  if (!value) return {}
  if (typeof value === 'object') return value
  const parsed = parseWorkspacePayload(value, { kind: 'admission', field: 'payload' })
  return parsed && typeof parsed === 'object' ? parsed : {}
}

export function unwrapStorageEnvelope(record: AnyRecord): AnyRecord {
  if (!record || typeof record !== 'object') return {}
  const preview = typeof record.preview === 'string' ? recordValue(record.preview) : {}
  const hasPreview = Object.keys(preview).length > 0
  if (!record.truncated || !hasPreview) return record
  return {
    ...preview,
    ...record,
    chapter_id: record.chapter_id ?? record.chapterId ?? preview.chapter_id ?? preview.chapterId ?? preview.chapter?.id,
    chapter_no: record.chapter_no ?? record.chapterNo ?? preview.chapter_no ?? preview.chapterNo ?? preview.chapter?.chapter_no ?? preview.chapter?.chapterNo,
    admission_status: firstNonEmpty(record.admission_status, record.admissionStatus, preview.admission_status, preview.admissionStatus),
    prose_admission: record.prose_admission || record.proseAdmission || preview.prose_admission || preview.proseAdmission,
    quality_score: record.quality_score ?? record.qualityScore ?? preview.quality_score ?? preview.qualityScore ?? preview.score,
    quality_warnings: record.quality_warnings || record.qualityWarnings || preview.quality_warnings || preview.qualityWarnings || preview.warnings,
    story_state_status: firstNonEmpty(record.story_state_status, record.storyStateStatus, preview.story_state_status, preview.storyStateStatus),
    post_commit_warnings: record.post_commit_warnings || record.postCommitWarnings || preview.post_commit_warnings || preview.postCommitWarnings,
  }
}

export function normalizeAdmissionCandidate(value: any): AnyRecord | null {
  const record = unwrapStorageEnvelope(recordValue(value))
  const direct = record?.prose_admission || record?.proseAdmission
  if (direct && typeof direct === 'object') {
    const status = firstNonEmpty(direct.status, direct.admission_status, direct.admissionStatus)
    if (!['accepted', 'accepted_with_warnings', 'blocked_invalid'].includes(status)) return null
    return {
      ...direct,
      status,
      quality_score: direct.quality_score ?? direct.qualityScore ?? record?.quality_score ?? record?.qualityScore ?? record?.score,
      quality_warnings: direct.quality_warnings || direct.qualityWarnings || record?.quality_warnings || record?.qualityWarnings || record?.warnings,
      story_state_status: direct.story_state_status || direct.storyStateStatus || record?.story_state_status || record?.storyStateStatus,
      story_state_warning: direct.story_state_warning || direct.storyStateWarning || record?.story_state_warning || record?.storyStateWarning || null,
      post_commit_warnings: direct.post_commit_warnings || direct.postCommitWarnings || record?.post_commit_warnings || record?.postCommitWarnings,
    }
  }
  const status = firstNonEmpty(record?.status, record?.admission_status, record?.admissionStatus)
  if (!['accepted', 'accepted_with_warnings', 'blocked_invalid'].includes(status)) return null
  return {
    ...record,
    status,
    quality_score: record?.quality_score ?? record?.qualityScore ?? record?.score,
    quality_warnings: record?.quality_warnings || record?.qualityWarnings || record?.warnings,
    story_state_status: record?.story_state_status || record?.storyStateStatus,
    story_state_warning: record?.story_state_warning || record?.storyStateWarning || null,
    post_commit_warnings: record?.post_commit_warnings || record?.postCommitWarnings,
  }
}

export function recordBelongsToChapter(record: AnyRecord, chapter: AnyRecord) {
  const recordId = text(record?.chapter_id ?? record?.chapterId ?? record?.chapter?.id)
  const recordNoValue = record?.chapter_no ?? record?.chapterNo ?? record?.chapter?.chapter_no ?? record?.chapter?.chapterNo
  const recordNo = Number(recordNoValue || 0)
  const chapterId = text(chapter?.id)
  const chapterNo = Number(chapter?.chapter_no || chapter?.chapterNo || 0)
  if (!recordId && recordNo <= 0) return false
  if (recordId && (!chapterId || recordId !== chapterId)) return false
  if (recordNo > 0 && (!chapterNo || recordNo !== chapterNo)) return false
  return true
}

export function runAdmissionOrder(run: AnyRecord) {
  const timestamp = Date.parse(firstNonEmpty(run?.updated_at, run?.updatedAt, run?.completed_at, run?.completedAt, run?.created_at, run?.createdAt))
  if (Number.isFinite(timestamp)) return timestamp
  const id = Number(run?.id || 0)
  return Number.isFinite(id) ? id : 0
}

export function admissionRank(status: string) {
  if (status === 'accepted') return 3
  if (status === 'accepted_with_warnings') return 2
  if (status === 'blocked_invalid') return 1
  return 0
}

export function runAdmission(runs: AnyRecord[], chapter: AnyRecord): AnyRecord | null {
  const sortedRuns = [...runs].sort((left, right) => runAdmissionOrder(right) - runAdmissionOrder(left))
  let best: AnyRecord | null = null
  let bestRank = 0
  for (const run of sortedRuns) {
    const roots = [run?.output_ref, run?.outputRef, run?.output, run?.payload, run]
      .map(recordValue)
      .map(unwrapStorageEnvelope)
      .filter(value => Object.keys(value).length > 0)
    for (const root of roots) {
      const direct = recordBelongsToChapter(root, chapter) ? normalizeAdmissionCandidate(root) : null
      const items = [...arrayValue(root?.chapters), ...arrayValue(root?.results)]
      const item = items.find(candidate => recordBelongsToChapter(candidate, chapter))
      const nested = normalizeAdmissionCandidate(item)
      const candidate = direct || nested
      if (!candidate) continue
      const status = firstNonEmpty(candidate.status, candidate.admission_status, candidate.admissionStatus)
      const rank = admissionRank(status)
      // Prefer the newest successful admission; only fall back to blocked_invalid when nothing better exists.
      if (rank > bestRank || (rank === bestRank && !best)) {
        best = candidate
        bestRank = rank
      }
      if (bestRank >= 2) return best
    }
  }
  return best
}

export function resolveProseAdmission(chapter: AnyRecord, qualityReviewPayload: AnyRecord, runs: AnyRecord[]) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  const fromChapter = normalizeAdmissionCandidate(rawPayload?.prose_admission || rawPayload?.proseAdmission)
  if (fromChapter) return fromChapter
  const fromReview = normalizeAdmissionCandidate(qualityReviewPayload?.prose_admission || qualityReviewPayload?.proseAdmission)
  if (fromReview) return fromReview
  const fromRun = runAdmission(runs, chapter)
  if (!fromRun) return null
  const status = firstNonEmpty(fromRun.status, fromRun.admission_status, fromRun.admissionStatus)
  // blocked_invalid means prose was rejected before store. If the chapter already has prose,
  // the failed run is stale relative to a later successful commit.
  if (status === 'blocked_invalid' && hasProse(chapter)) return null
  return fromRun
}

export function normalizedAdmissionWarnings(value: any): Array<{ code: string; source: string; message: string }> {
  const seen = new Set<string>()
  return arrayValue(value).map((item: any) => {
    if (typeof item === 'string') return { code: 'admission_warning', source: 'quality', message: text(item) }
    return {
      code: firstNonEmpty(item?.code, item?.key, 'admission_warning'),
      source: firstNonEmpty(item?.source, item?.stage, 'quality'),
      message: firstNonEmpty(item?.message, item?.detail, item?.summary, item?.label),
    }
  }).filter(item => item.message && !seen.has(`${item.source}:${item.code}:${item.message}`) && Boolean(seen.add(`${item.source}:${item.code}:${item.message}`)))
}

export function normalizedPostCommitWarnings(value: any): Array<{ stage: string; message: string }> {
  const seen = new Set<string>()
  return arrayValue(value).map((item: any) => {
    if (typeof item === 'string') return { stage: 'post_commit', message: text(item) }
    return {
      stage: firstNonEmpty(item?.stage, item?.source, 'post_commit'),
      message: firstNonEmpty(item?.message, item?.detail, item?.summary, item?.label),
    }
  }).filter(item => item.message && !seen.has(`${item.stage}:${item.message}`) && Boolean(seen.add(`${item.stage}:${item.message}`)))
}

export function hasUsableProseQualityReview(review?: AnyRecord | null) {
  const quality = qualityPayload(review)
  return extractQualityScore(quality) !== null
    || typeof quality?.passed === 'boolean'
}


export function hasHighSeverityIssue(issue: any) {
  if (typeof issue === 'string') return false
  const severity = text(issue?.severity || issue?.level || issue?.grade).toLowerCase()
  return severity === 'high' || severity === 'critical' || severity === 'blocker' || severity === 'must_fix'
}

export function extractMustFix(quality: AnyRecord, report: AnyRecord) {
  const fromQuality = [
    ...stringArray(quality?.must_fix),
    ...stringArray(quality?.mustFix),
    ...stringArray(quality?.revision_directives),
  ]
  const fromHighIssues = arrayValue(quality?.issues).filter(hasHighSeverityIssue).map(issueText).filter(Boolean)
  const fromReport = [
    ...stringArray(report?.must_fix),
    ...stringArray(report?.mustFix),
  ]
  return Array.from(new Set([...fromQuality, ...fromHighIssues, ...fromReport])).slice(0, 5)
}

export function extractOptionalImprovements(quality: AnyRecord, report: AnyRecord) {
  const items = [
    ...stringArray(quality?.optional_improvements),
    ...stringArray(quality?.optionalImprovements),
    ...stringArray(report?.optional_improvements),
    ...stringArray(report?.optionalImprovements),
  ]
  return Array.from(new Set(items)).slice(0, 5)
}

export function reportBelongsToCurrentQualityCycle(args: {
  reportRef: ReviewRef | null
  qualityRef: ReviewRef | null
  revisionRef: ReviewRef | null
}) {
  if (!args.reportRef || !args.qualityRef) return false
  return compareReviewRefs(args.reportRef, args.qualityRef) >= 0
    && (!args.revisionRef || compareReviewRefs(args.reportRef, args.revisionRef) > 0)
}


export function storyStateFailureMessages(warning: any): string[] {
  const failures = arrayValue(warning?.hard_failures || warning?.hardFailures || warning?.failures)
  const messages = failures.map((item: any) => {
    if (typeof item === 'string') return text(item)
    return firstNonEmpty(item?.message, item?.detail, item?.summary, item?.key)
  }).filter(Boolean)
  const skipped = firstNonEmpty(warning?.reason, warning?.skipped === true ? 'story_state_skipped' : '')
  if (skipped && !messages.length) {
    if (/draft_only/i.test(skipped)) return ['当前是“只生成正文初稿”模式，正文入库后故意不更新状态机，避免草稿污染长期记忆。']
    if (/draft_review/i.test(skipped)) return ['当前是“生成并自检”模式，正文入库后故意不更新状态机；完整流水线或手动同步后才会写入。']
    return [`状态机更新被跳过：${skipped}`]
  }
  if (warning?.error) messages.unshift(firstNonEmpty(warning.error, '故事状态准备失败'))
  return Array.from(new Set(messages)).slice(0, 6)
}

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

export function buildHiddenAcceptanceDesk(): ChapterAcceptanceDeskModel {
  return {
    visible: false,
    acceptanceStatus: 'hidden',
    admissionStatus: '',
    qualityWarnings: [],
    storyStateStatus: '',
    storyStatePanel: null,
    postCommitWarnings: [],
    statusLabel: '等待正文',
    acceptanceReasons: ['本章还没有正文，先完成章节计划和初稿。'],
    storylineSync: null,
    storyUnitSync: null,
    assetIntake: null,
    ipSceneIntake: null,
    signatureSceneSync: null,
    readabilityReview: null,
    deslopGateDiagnostics: null,
    coreDrift: null,
    runwaySync: null,
    readerPayoffSync: null,
    readerExpectationSync: null,
    qualityAuditSync: null,
    qualityAuditRepairReceiptSync: null,
    chapterHandoffSync: null,
    chapterHandoffDeltaSync: null,
    writePreparation: null,
    intentConfirmationSync: null,
    benchmarkRecallSync: null,
    sourceReadiness: null,
    stateTracking: null,
    styleBoundary: null,
    informationFlow: null,
    expectationThreshold: null,
    storyLoop: null,
    emotionalArc: null,
    chapterHook: null,
    paragraphHook: null,
    suspense: null,
    assetLinkage: null,
    dialogue: null,
    plotDynamics: null,
    characterRelation: null,
    characterBehavior: null,
    conflictStructure: null,
    bridgeUnit: null,
    reversal: null,
    showdown: null,
    opening: null,
    proseCraft: null,
    punctuationTone: null,
    contentRubric: null,
    targetReader: null,
    genrePositioning: null,
    femaleAudience: null,
    upgradeRhythm: null,
    chapterStructure: null,
    chapterProgression: null,
    informationLoad: null,
    longformContinuity: null,
    coreContractCheck: null,
    continuityHeat: null,
    revisionReceiptCheck: null,
    deslopRepairCheck: null,
    proseMeta: null,
    serialRiskRepair: null,
    chapterHookQuality: null,
    readerRetentionCheck: null,
    readerRetentionSync: null,
    chapterAttraction: null,
    storyDriveSync: null,
    characterArcSync: null,
    chapterBenchmarkSync: null,
    styleSampleSync: null,
    first30RetentionRecheck: null,
    innovationSync: null,
    volumeBeatSync: null,
    blueprintReceipt: null,
    revisionReceipt: null,
    deliveryRiskReceipt: null,
    sceneCardReceipt: null,
    qualityAudit: null,
    platformRubric: null,
    approvalBlocker: null,
    governanceRecheckSync: null,
    deliveryRiskQueue: null,
    deliveryRiskConvergence: null,
    qualityScore: null,
    qualityStatus: '',
    mustFix: [],
    optionalImprovements: [],
    latestQualityReviewId: null,
    latestEditorReportId: null,
    latestRevisionReviewId: null,
    latestEditorReportSummary: '',
    latestRevisionSummary: '',
    storyStateSynced: false,
    recommendedAcceptanceAction: { key: 'write_draft', label: ACTION_LABELS.write_draft },
    secondaryActions: [],
    shouldAutoExpandAcceptance: false,
  }
}

export function buildChapterAcceptanceDesk(args: {
  nextChapter: AnyRecord | null
  cockpitChapter: WritingCockpitChapter | null
  reviews: AnyRecord[]
  activeRuns: AnyRecord[]
  storyState: AnyRecord
}): ChapterAcceptanceDeskModel {
  if (!args.nextChapter) return buildHiddenAcceptanceDesk()

  const latestQualityReviewRef = latestReviewRef(args.reviews, args.nextChapter, 'prose_quality')
  const latestQualityRef = latestQualityReviewRef
    && proseQualityReviewMatchesCurrentChapter(latestQualityReviewRef.review, args.nextChapter)
    && hasUsableProseQualityReview(latestQualityReviewRef.review)
    ? latestQualityReviewRef
    : null
  const latestReportRef = latestReviewRef(args.reviews, args.nextChapter, 'editor_report')
  const latestRevisionRef = latestReviewRef(args.reviews, args.nextChapter, 'editor_revision')
  const latestStorylineSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'storyline_sync')
  const latestStoryUnitSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'story_unit_sync')
  const latestAssetIntakeRef = latestReviewRef(args.reviews, args.nextChapter, 'asset_intake')
  const latestAssetLinkageSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'asset_linkage_sync')
  const latestIpSceneIntakeRef = latestReviewRef(args.reviews, args.nextChapter, 'ip_scene_intake')
  const latestSignatureSceneSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'signature_scene_sync')
  const latestReadabilityRef = latestReviewRef(args.reviews, args.nextChapter, 'readability_review')
  const latestCoreDriftRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_core_drift')
  const latestRunwaySyncRef = latestReviewRef(args.reviews, args.nextChapter, 'runway_sync')
  const latestReaderPayoffSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'reader_payoff_sync')
  const latestReaderExpectationSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'reader_expectation_sync')
  const latestQualityAuditSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'quality_audit_sync')
  const latestQualityAuditRepairReceiptSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'quality_audit_repair_receipt_sync')
  const latestChapterHandoffSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_handoff_sync')
  const latestChapterHandoffDeltaSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_handoff_delta_sync')
  const latestIntentConfirmationSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'intent_confirmation_sync')
  const latestBenchmarkRecallSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'benchmark_recall_sync')
  const latestReaderRetentionSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'reader_retention_sync')
  const latestChapterAttractionRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_attraction_review')
  const latestStoryDriveSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'story_drive_sync')
  const latestCharacterArcSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'character_arc_sync')
  const latestChapterBenchmarkSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'chapter_benchmark_sync')
  const latestStyleSampleSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'style_sample_sync')
  const latestInnovationSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'innovation_sync')
  const latestVolumeBeatSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'volume_beat_sync')
  const latestGovernanceRecheckSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'governance_recheck_sync')
  const latestDeliveryRiskConvergenceRef = latestReviewRef(args.reviews, args.nextChapter, 'delivery_risk_convergence')
  const latestDeslopRepairReceiptSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'deslop_repair_receipt_sync')
  const latestProseRevisionReceiptSyncRef = latestReviewRef(args.reviews, args.nextChapter, 'prose_revision_receipt_sync')
  const latestQuality = latestQualityRef?.review || null
  const latestReport = latestReportRef?.review || null
  const latestRevision = latestRevisionRef?.review || null
  const latestQualityPayload = reviewPayload(latestQuality)
  const proseAdmission = resolveProseAdmission(args.nextChapter, latestQualityPayload, args.activeRuns)
  const admissionStatus = firstNonEmpty(proseAdmission?.status, proseAdmission?.admission_status, proseAdmission?.admissionStatus) as ChapterAcceptanceDeskModel['admissionStatus']
  const qualityWarnings = normalizedAdmissionWarnings(proseAdmission?.quality_warnings || proseAdmission?.qualityWarnings)
  const storyStateStatus = firstNonEmpty(proseAdmission?.story_state_status, proseAdmission?.storyStateStatus) as ChapterAcceptanceDeskModel['storyStateStatus']
  const postCommitWarnings = normalizedPostCommitWarnings(proseAdmission?.post_commit_warnings || proseAdmission?.postCommitWarnings)
  const storyStatePanel = buildStoryStatePanel({
    chapter: args.nextChapter,
    storyState: args.storyState,
    proseAdmission,
    hasChapterProse: hasProse(args.nextChapter),
  })
  const admissionFields = { admissionStatus, qualityWarnings, storyStateStatus, storyStatePanel, postCommitWarnings }
  if (!hasProse(args.nextChapter) && admissionStatus !== 'blocked_invalid') return buildHiddenAcceptanceDesk()
  const storylineSync = buildStorylineSyncSummary(latestStorylineSyncRef?.review || null)
  const storyUnitSync = buildStoryUnitSyncSummary(latestStoryUnitSyncRef?.review || null)
  const assetIntake = buildAssetIntakeSummary(latestAssetIntakeRef?.review || null)
  const ipSceneIntake = buildIpSceneIntakeSummary(latestIpSceneIntakeRef?.review || null)
  const signatureSceneSync = buildSignatureSceneSyncSummary(latestSignatureSceneSyncRef?.review || null)
  const readabilityReview = buildReadabilityReviewSummary(latestReadabilityRef?.review || null)
  const coreDrift = buildCoreDriftSummary(latestCoreDriftRef?.review || null)
  const runwaySync = buildRunwaySyncSummary(latestRunwaySyncRef?.review || null)
  const readerPayoffSync = buildReaderPayoffSyncSummary(latestReaderPayoffSyncRef?.review || null)
  const readerExpectationSync = buildReaderExpectationSyncSummary(latestReaderExpectationSyncRef?.review || null)
  const qualityAuditSync = buildQualityAuditSyncSummary(latestQualityAuditSyncRef?.review || null)
  const qualityAuditRepairReceiptSync = buildQualityAuditRepairReceiptSyncSummary(latestQualityAuditRepairReceiptSyncRef?.review || null)
  const chapterHandoffSync = mergeContractSyncSummary(
    buildChapterHandoffSyncSummary(
      latestChapterHandoffSyncRef?.review || null,
      'chapter_handoff_sync',
      'chapterHandoffSync',
      '章首承接 OK',
      '章首承接缺口',
    ),
    buildQualityCheckSummary(latestQualityPayload, 'chapter_handoff_checks', 'chapterHandoffChecks', '章首承接'),
    '章首承接',
  )
  const chapterHandoffDeltaSync = buildChapterHandoffSyncSummary(
    latestChapterHandoffDeltaSyncRef?.review || null,
    'chapter_handoff_delta_sync',
    'chapterHandoffDeltaSync',
    '章末交接 OK',
    '章末交接缺口',
  )
  const writePreparation = mergeContractSyncSummary(
    buildQualityCheckSummary(latestQualityPayload, 'write_preparation_checks', 'writePreparationChecks', '写前准备'),
    buildPreDraftExecutionSyncSummary(latestQualityPayload, 'write_preparation_checks', 'writePreparationChecks', '写前准备'),
    '写前准备',
  )
  const intentConfirmationSync = mergeContractSyncSummary(
    buildIntentConfirmationSyncSummary(latestIntentConfirmationSyncRef?.review || null),
    buildPreDraftExecutionSyncSummary(latestQualityPayload, 'intent_confirmation_checks', 'intentConfirmationChecks', '意图确认'),
    '意图确认',
  )
  const benchmarkRecallSync = mergeContractSyncSummary(
    buildBenchmarkRecallSyncSummary(latestBenchmarkRecallSyncRef?.review || null),
    buildPreDraftExecutionSyncSummary(latestQualityPayload, 'benchmark_recall_checks', 'benchmarkRecallChecks', '文风召回'),
    '文风召回',
  )
  const sourceReadiness = buildQualityCheckSummary(latestQualityPayload, 'source_readiness_checks', 'sourceReadinessChecks', '来源就绪')
  const stateTracking = buildQualityCheckSummary(latestQualityPayload, 'state_tracking_checks', 'stateTrackingChecks', '状态跟踪')
  const styleBoundary = buildQualityCheckSummary(latestQualityPayload, 'style_boundary_checks', 'styleBoundaryChecks', '风格边界')
  const informationFlow = buildQualityCheckSummary(latestQualityPayload, 'information_flow_checks', 'informationFlowChecks', '信息流')
  const expectationThreshold = buildQualityCheckSummary(latestQualityPayload, 'expectation_threshold_checks', 'expectationThresholdChecks', '期待阈值')
  const storyLoop = buildQualityCheckSummary(latestQualityPayload, 'story_loop_checks', 'storyLoopChecks', '故事闭环')
  const emotionalArc = buildQualityCheckSummary(latestQualityPayload, 'emotional_arc_checks', 'emotionalArcChecks', '情绪弧')
  const chapterHook = buildQualityCheckSummary(latestQualityPayload, 'chapter_hook_checks', 'chapterHookChecks', '章级钩子')
  const paragraphHook = buildQualityCheckSummary(latestQualityPayload, 'paragraph_hook_checks', 'paragraphHookChecks', '段落级钩子')
  const suspense = buildQualityCheckSummary(latestQualityPayload, 'suspense_checks', 'suspenseChecks', '悬念编排')
  const assetLinkage = mergeContractSyncSummary(
    buildChapterHandoffSyncSummary(
      latestAssetLinkageSyncRef?.review || null,
      'asset_linkage_sync',
      'assetLinkageSync',
      '资产挂钩 OK',
      '资产挂钩缺口',
    ),
    buildQualityCheckSummary(latestQualityPayload, 'asset_linkage_checks', 'assetLinkageChecks', '资产挂钩'),
    '资产挂钩',
  )
  const dialogue = buildQualityCheckSummary(latestQualityPayload, 'dialogue_checks', 'dialogueChecks', '对白质量')
  const plotDynamics = buildQualityCheckSummary(latestQualityPayload, 'plot_dynamics_checks', 'plotDynamicsChecks', '剧情动力')
  const characterRelation = buildQualityCheckSummary(latestQualityPayload, 'character_relation_checks', 'characterRelationChecks', '角色关系')
  const characterBehavior = buildQualityCheckSummary(latestQualityPayload, 'character_behavior_checks', 'characterBehaviorChecks', '角色行为')
  const conflictStructure = buildQualityCheckSummary(latestQualityPayload, 'conflict_structure_checks', 'conflictStructureChecks', '冲突结构')
  const bridgeUnit = buildQualityCheckSummary(latestQualityPayload, 'bridge_unit_checks', 'bridgeUnitChecks', '桥段节奏')
  const reversal = buildQualityCheckSummary(latestQualityPayload, 'reversal_checks', 'reversalChecks', '反转设计')
  const showdown = buildQualityCheckSummary(latestQualityPayload, 'showdown_checks', 'showdownChecks', '高潮对抗')
  const opening = buildQualityCheckSummary(latestQualityPayload, 'opening_checks', 'openingChecks', '开篇设计')
  const proseCraft = buildQualityCheckSummary(latestQualityPayload, 'prose_craft_checks', 'proseCraftChecks', '正文工艺')
  const sceneCardDirective = buildSceneCardDirectiveSummary(latestQualityPayload)
  const punctuationTone = buildQualityCheckSummary(latestQualityPayload, 'punctuation_tone_checks', 'punctuationToneChecks', '语气标点')
  const contentRubric = buildQualityCheckSummary(latestQualityPayload, 'content_rubric_checks', 'contentRubricChecks', '内容基准')
  const targetReader = buildQualityCheckSummary(latestQualityPayload, 'target_reader_checks', 'targetReaderChecks', '目标读者')
  const genrePositioning = buildQualityCheckSummary(latestQualityPayload, 'genre_positioning_checks', 'genrePositioningChecks', '题材定位')
  const femaleAudience = buildQualityCheckSummary(latestQualityPayload, 'female_audience_checks', 'femaleAudienceChecks', '女频长篇')
  const upgradeRhythm = buildQualityCheckSummary(latestQualityPayload, 'upgrade_rhythm_checks', 'upgradeRhythmChecks', '升级节奏')
  const chapterStructure = buildQualityCheckSummary(latestQualityPayload, 'structure_checks', 'structureChecks', '章节结构')
  const chapterProgression = buildQualityCheckSummary(latestQualityPayload, 'progression_checks', 'progressionChecks', '章节推进')
  const informationLoad = buildQualityCheckSummary(latestQualityPayload, 'information_checks', 'informationChecks', '信息负载')
  const longformContinuity = buildQualityCheckSummary(latestQualityPayload, 'longform_checks', 'longformChecks', '长篇连续性')
  const coreContractCheck = buildQualityCheckSummary(latestQualityPayload, 'core_contract_checks', 'coreContractChecks', '核心契约')
  const continuityHeat = buildQualityCheckSummary(latestQualityPayload, 'continuity_heat_checks', 'continuityHeatChecks', '连续性热度')
  const revisionReceiptCheck = buildQualityCheckSummary(latestQualityPayload, 'revision_receipt_checks', 'revisionReceiptChecks', '修订回执')
  const deslopRepairCheck = buildQualityCheckSummary(latestQualityPayload, 'deslop_repair_checks', 'deslopRepairChecks', '去AI味修复')
  const proseMeta = buildQualityCheckSummary(latestQualityPayload, 'prose_meta_checks', 'proseMetaChecks', '正文元叙事')
  const serialRiskRepair = buildQualityCheckSummary(latestQualityPayload, 'serial_risk_repair_checks', 'serialRiskRepairChecks', '连续风险修复')
  const chapterHookQuality = buildQualityCheckSummary(latestQualityPayload, 'chapter_hook_quality_checks', 'chapterHookQualityChecks', '章钩质量')
  const readerRetentionCheck = buildQualityCheckSummary(latestQualityPayload, 'reader_retention_checks', 'readerRetentionChecks', '追读雷达')
  const readerRetentionSync = buildReaderRetentionSyncSummary(latestReaderRetentionSyncRef?.review || null)
  const chapterAttraction = buildChapterAttractionSummary(latestChapterAttractionRef?.review || null)
  const storyDriveSync = buildStoryDriveSyncSummary(latestStoryDriveSyncRef?.review || null)
  const characterArcSync = buildCharacterArcSyncSummary(latestCharacterArcSyncRef?.review || null)
  const chapterBenchmarkSync = buildChapterBenchmarkSyncSummary(latestChapterBenchmarkSyncRef?.review || null)
  const styleSampleSync = buildStyleSampleSyncSummary(latestStyleSampleSyncRef?.review || null)
  const first30RetentionRecheck = buildFirst30RetentionRecheckSummary(args.nextChapter, args.reviews)
  const innovationSync = buildInnovationSyncSummary(latestInnovationSyncRef?.review || null)
  const volumeBeatSync = buildVolumeBeatSyncSummary(latestVolumeBeatSyncRef?.review || null)
  const blueprintReceipt = buildBlueprintReceiptSummary(args.nextChapter)
  const revisionReceipt = buildRevisionReceiptSummary(
    reviewPayload(latestQuality),
    {
      ...reviewPayload(latestDeslopRepairReceiptSyncRef?.review || null),
      ...reviewPayload(latestProseRevisionReceiptSyncRef?.review || null),
    },
  )
  const deliveryRiskReceipt = buildDeliveryRiskReceiptSummary(reviewPayload(latestQuality))
  const sceneCardReceipt = buildSceneCardReceiptSummary(reviewPayload(latestQuality))
  const qualityAudit = buildQualityAuditSummary(reviewPayload(latestQuality))
  const platformRubric = buildPlatformRubricSummary(reviewPayload(latestQuality))
  const governanceRecheckSync = buildGovernanceRecheckSyncSummary(latestGovernanceRecheckSyncRef?.review || null)
  const deliveryRiskConvergence = buildDeliveryRiskConvergenceSummary(latestDeliveryRiskConvergenceRef?.review || null)
  const quality = qualityPayload(latestQuality)
  const legacyApprovalBlocker = buildApprovalBlockerSummary(reviewPayload(latestQuality))
  const admissionApprovalBlocker: ChapterAcceptanceDeskModel['approvalBlocker'] = admissionStatus === 'blocked_invalid'
    ? {
        type: 'blocked_invalid',
        status: 'warn',
        label: '正文无效，未入库',
        detail: qualityWarnings.map(item => item.message).join('；') || '正文未通过有效性检查且未入库。',
        scoreLabel: '终止入库',
        reasons: qualityWarnings.map(item => item.message),
      }
    : null
  const approvalBlocker = ['accepted', 'accepted_with_warnings'].includes(admissionStatus)
    ? null
    : admissionApprovalBlocker || legacyApprovalBlocker
  const report = reportPayload(latestReport)
  const revision = revisionPayload(latestRevision)
  const score = extractQualityScore(proseAdmission || {}) ?? extractQualityScore(quality)
  const qualityStatus = firstNonEmpty(quality?.status, latestQuality?.status)
  const currentReport = reportBelongsToCurrentQualityCycle({
    reportRef: latestReportRef,
    qualityRef: latestQualityRef,
    revisionRef: latestRevisionRef,
  }) ? report : {}
  const deslopGateDiagnostics = buildDeslopGateDiagnosticsSummary(quality)
  const mustFix = extractMustFix(quality, currentReport)
  const optionalImprovements = extractOptionalImprovements(quality, report)
  const deliveryRiskQueue = buildDeliveryRiskQueue({
    mustFix,
    storylineSync,
    storyUnitSync,
    signatureSceneSync,
    readabilityReview,
    coreDrift,
    runwaySync,
    readerPayoffSync,
    readerExpectationSync,
    qualityAuditSync,
    qualityAuditRepairReceiptSync,
    chapterHandoffSync,
    chapterHandoffDeltaSync,
    writePreparation,
    intentConfirmationSync,
    benchmarkRecallSync,
    sourceReadiness,
    stateTracking,
    styleBoundary,
    informationFlow,
    expectationThreshold,
    storyLoop,
    emotionalArc,
    chapterHook,
    paragraphHook,
    suspense,
    assetLinkage,
    dialogue,
    plotDynamics,
    characterRelation,
    characterBehavior,
    conflictStructure,
    bridgeUnit,
    reversal,
    showdown,
    opening,
    proseCraft,
    sceneCardDirective,
    punctuationTone,
    contentRubric,
    targetReader,
    genrePositioning,
    femaleAudience,
    upgradeRhythm,
    chapterStructure,
    chapterProgression,
    informationLoad,
    longformContinuity,
    coreContractCheck,
    continuityHeat,
    revisionReceiptCheck,
    deslopRepairCheck,
    proseMeta,
    serialRiskRepair,
    chapterHookQuality,
    readerRetentionCheck,
    readerRetentionSync,
    chapterAttraction,
    storyDriveSync,
    characterArcSync,
    chapterBenchmarkSync,
    styleSampleSync,
    innovationSync,
    volumeBeatSync,
    blueprintReceipt,
    revisionReceipt,
    deliveryRiskReceipt,
    sceneCardReceipt,
    qualityAudit,
    platformRubric,
    approvalBlocker,
    governanceRecheckSync,
  })
  const storyStateSynced = storyStateStatus
    ? storyStateStatus === 'synced'
    : Number(args.storyState?.last_updated_chapter || 0) >= Number(args.nextChapter?.chapter_no || 0)
  const latestEditorReportSummary = firstNonEmpty(report?.summary, latestReport?.summary)
  const latestRevisionSummary = firstNonEmpty(revision?.revision_summary, latestRevision?.summary)
  const revisionNeedsRecheck = Boolean(
    latestQualityRef
    && latestRevisionRef
    && compareReviewRefs(latestRevisionRef, latestQualityRef) > 0,
  )
  const scoreNeedsRevision = score !== null && score < QUALITY_PASS_THRESHOLD
  const qualityNeedsRevision = Boolean(
    scoreNeedsRevision
    || mustFix.length > 0
    || Boolean(approvalBlocker)
    || quality?.needs_revision === true
    || quality?.passed === false,
  )
  const secondaryActions: Array<{ key: WritingCockpitActionKey; label: string }> = [
    { key: 'review_draft', label: '查看交稿质检' },
    { key: 'open_editor_reports', label: ACTION_LABELS.open_editor_reports },
    { key: 'open_version_history', label: ACTION_LABELS.open_version_history },
  ]

  if (admissionStatus === 'accepted_with_warnings' && (scoreNeedsRevision || mustFix.length > 0 || qualityWarnings.length > 0)) {
    secondaryActions.unshift({ key: 'apply_editor_revision', label: ACTION_LABELS.apply_editor_revision })
  }
  const needsStoryStateSync = Boolean(storyStatePanel && ['pending', 'skipped', 'lagging'].includes(storyStatePanel.status))
  if (needsStoryStateSync) {
    secondaryActions.unshift({
      key: 'sync_story_state',
      label: storyStatePanel?.primaryAction?.label || ACTION_LABELS.sync_story_state,
    })
  }

  const admissionCommon = {
    storylineSync, storyUnitSync, assetIntake, ipSceneIntake, signatureSceneSync, readabilityReview,
    deslopGateDiagnostics, coreDrift, runwaySync, readerPayoffSync, readerExpectationSync,
    qualityAuditSync, qualityAuditRepairReceiptSync, chapterHandoffSync, chapterHandoffDeltaSync,
    writePreparation, intentConfirmationSync, benchmarkRecallSync, sourceReadiness, stateTracking,
    styleBoundary, informationFlow, expectationThreshold, storyLoop, emotionalArc, chapterHook,
    paragraphHook, suspense, assetLinkage, dialogue, plotDynamics, characterRelation, characterBehavior,
    conflictStructure, bridgeUnit, reversal, showdown, opening, proseCraft, punctuationTone, contentRubric,
    targetReader, genrePositioning, femaleAudience, upgradeRhythm, chapterStructure, chapterProgression,
    informationLoad, longformContinuity, coreContractCheck, continuityHeat, revisionReceiptCheck,
    deslopRepairCheck, proseMeta, serialRiskRepair, chapterHookQuality, readerRetentionCheck,
    readerRetentionSync, chapterAttraction, storyDriveSync, characterArcSync, chapterBenchmarkSync,
    styleSampleSync, first30RetentionRecheck, innovationSync, volumeBeatSync, blueprintReceipt,
    revisionReceipt, deliveryRiskReceipt, sceneCardReceipt, qualityAudit, platformRubric, governanceRecheckSync,
    deliveryRiskQueue, deliveryRiskConvergence, qualityScore: score, qualityStatus, mustFix,
    optionalImprovements, latestQualityReviewId: latestQuality?.id || null,
    latestEditorReportId: latestReport?.id || null, latestRevisionReviewId: latestRevision?.id || null,
    latestEditorReportSummary, latestRevisionSummary, storyStateSynced, secondaryActions,
  }

  if (admissionStatus === 'accepted_with_warnings') {
    const storyReason = needsStoryStateSync
      ? (storyStatePanel?.headline || '正文已入库，故事状态待补同步')
      : ''
    return {
      visible: true,
      acceptanceStatus: needsStoryStateSync ? 'needs_state_sync' : 'delivered_with_warnings',
      ...admissionFields,
      statusLabel: needsStoryStateSync ? '已入库，待同步状态机' : '已入库，建议修订',
      acceptanceReasons: [
        storyReason,
        ...qualityWarnings.map(item => item.message),
        ...postCommitWarnings.map(item => item.message),
      ].filter(Boolean).slice(0, 4),
      ...admissionCommon,
      approvalBlocker: null,
      recommendedAcceptanceAction: needsStoryStateSync
        ? { key: 'sync_story_state', label: storyStatePanel?.primaryAction?.label || ACTION_LABELS.sync_story_state }
        : { key: 'accept_chapter_and_continue', label: ACTION_LABELS.accept_chapter_and_continue },
      shouldAutoExpandAcceptance: needsStoryStateSync || Boolean(storyStatePanel?.reasons?.length),
    }
  }

  if (admissionStatus === 'accepted') {
    const storyReason = needsStoryStateSync
      ? (storyStatePanel?.headline || '正文已入库，故事状态待补同步')
      : '正文已入库，可以继续下一章。'
    return {
      visible: true,
      acceptanceStatus: needsStoryStateSync ? 'needs_state_sync' : 'delivered',
      ...admissionFields,
      statusLabel: needsStoryStateSync ? '已入库，待同步状态机' : '已入库',
      acceptanceReasons: [storyReason, ...(storyStatePanel?.reasons || [])].filter(Boolean).slice(0, 4),
      ...admissionCommon,
      approvalBlocker: null,
      recommendedAcceptanceAction: needsStoryStateSync
        ? { key: 'sync_story_state', label: storyStatePanel?.primaryAction?.label || ACTION_LABELS.sync_story_state }
        : { key: 'accept_chapter_and_continue', label: ACTION_LABELS.accept_chapter_and_continue },
      shouldAutoExpandAcceptance: needsStoryStateSync,
    }
  }

  if (admissionStatus === 'blocked_invalid') {
    return {
      visible: true,
      acceptanceStatus: 'needs_revision',
      ...admissionFields,
      statusLabel: '正文无效，未入库',
      acceptanceReasons: qualityWarnings.map(item => item.message).concat('正文未通过有效性检查且未入库。').slice(0, 3),
      ...admissionCommon,
      approvalBlocker,
      recommendedAcceptanceAction: { key: 'open_generation_diagnostics', label: ACTION_LABELS.open_generation_diagnostics },
      shouldAutoExpandAcceptance: true,
    }
  }

  if (!latestQuality) {
    return {
      visible: true,
      acceptanceStatus: 'needs_quality_check',
      ...admissionFields,
      statusLabel: '需复检',
      acceptanceReasons: ['本章已有正文，但还没有当前章节的质量复检记录。'],
      storylineSync,
      storyUnitSync,
      assetIntake,
      ipSceneIntake,
      signatureSceneSync,
      readabilityReview,
      deslopGateDiagnostics,
      coreDrift,
      runwaySync,
      readerPayoffSync,
      readerExpectationSync,
      qualityAuditSync,
      qualityAuditRepairReceiptSync,
      chapterHandoffSync,
      chapterHandoffDeltaSync,
      writePreparation,
      intentConfirmationSync,
      benchmarkRecallSync,
      sourceReadiness,
      stateTracking,
      styleBoundary,
      informationFlow,
      expectationThreshold,
      storyLoop,
      emotionalArc,
      chapterHook,
      paragraphHook,
      suspense,
      assetLinkage,
      dialogue,
      plotDynamics,
      characterRelation,
      characterBehavior,
      conflictStructure,
      bridgeUnit,
      reversal,
      showdown,
      opening,
      proseCraft,
      punctuationTone,
      contentRubric,
      targetReader,
      genrePositioning,
      femaleAudience,
      upgradeRhythm,
      chapterStructure,
      chapterProgression,
      informationLoad,
      longformContinuity,
      coreContractCheck,
      continuityHeat,
      revisionReceiptCheck,
      deslopRepairCheck,
      proseMeta,
      serialRiskRepair,
      chapterHookQuality,
      readerRetentionCheck,
      readerRetentionSync,
      chapterAttraction,
      storyDriveSync,
      characterArcSync,
      chapterBenchmarkSync,
      styleSampleSync,
      first30RetentionRecheck,
      innovationSync,
      volumeBeatSync,
      blueprintReceipt,
      revisionReceipt,
      deliveryRiskReceipt,
      sceneCardReceipt,
      qualityAudit,
      platformRubric,
      approvalBlocker,
      governanceRecheckSync,
      deliveryRiskQueue,
      deliveryRiskConvergence,
      qualityScore: null,
      qualityStatus,
      mustFix,
      optionalImprovements,
      latestQualityReviewId: null,
      latestEditorReportId: latestReport?.id || null,
      latestRevisionReviewId: latestRevision?.id || null,
      latestEditorReportSummary,
      latestRevisionSummary,
      storyStateSynced,
      recommendedAcceptanceAction: { key: 'refresh_current_quality', label: ACTION_LABELS.refresh_current_quality },
      secondaryActions,
      shouldAutoExpandAcceptance: true,
    }
  }

  if (revisionNeedsRecheck) {
    return {
      visible: true,
      acceptanceStatus: 'needs_recheck',
      ...admissionFields,
      statusLabel: '修订后需复检',
      acceptanceReasons: ['本章已有修订记录，修订时间晚于最新质量复检。'],
      storylineSync,
      storyUnitSync,
      assetIntake,
      ipSceneIntake,
      signatureSceneSync,
      readabilityReview,
      deslopGateDiagnostics,
      coreDrift,
      runwaySync,
      readerPayoffSync,
      readerExpectationSync,
      qualityAuditSync,
      qualityAuditRepairReceiptSync,
      chapterHandoffSync,
      chapterHandoffDeltaSync,
      writePreparation,
      intentConfirmationSync,
      benchmarkRecallSync,
      sourceReadiness,
      stateTracking,
      styleBoundary,
      informationFlow,
      expectationThreshold,
      storyLoop,
      emotionalArc,
      chapterHook,
      paragraphHook,
      suspense,
      assetLinkage,
      dialogue,
      plotDynamics,
      characterRelation,
      characterBehavior,
      conflictStructure,
      bridgeUnit,
      reversal,
      showdown,
      opening,
      proseCraft,
      punctuationTone,
      contentRubric,
      targetReader,
      genrePositioning,
      femaleAudience,
      upgradeRhythm,
      chapterStructure,
      chapterProgression,
      informationLoad,
      longformContinuity,
      coreContractCheck,
      continuityHeat,
      revisionReceiptCheck,
      deslopRepairCheck,
      proseMeta,
      serialRiskRepair,
      chapterHookQuality,
      readerRetentionCheck,
      readerRetentionSync,
      chapterAttraction,
      storyDriveSync,
      characterArcSync,
      chapterBenchmarkSync,
      styleSampleSync,
      first30RetentionRecheck,
      innovationSync,
      volumeBeatSync,
      blueprintReceipt,
      revisionReceipt,
      deliveryRiskReceipt,
      sceneCardReceipt,
      qualityAudit,
      platformRubric,
      approvalBlocker,
      governanceRecheckSync,
      deliveryRiskQueue,
      deliveryRiskConvergence,
      qualityScore: score,
      qualityStatus,
      mustFix,
      optionalImprovements,
      latestQualityReviewId: latestQuality?.id || null,
      latestEditorReportId: latestReport?.id || null,
      latestRevisionReviewId: latestRevision?.id || null,
      latestEditorReportSummary,
      latestRevisionSummary,
      storyStateSynced,
      recommendedAcceptanceAction: { key: 'refresh_current_quality', label: ACTION_LABELS.refresh_current_quality },
      secondaryActions,
      shouldAutoExpandAcceptance: true,
    }
  }

  if (qualityNeedsRevision) {
    const hasReportFix = Boolean(latestReport && extractMustFix({}, currentReport).length > 0)
    const key: WritingCockpitActionKey = hasReportFix ? 'apply_editor_revision' : 'create_editor_report'
    return {
      visible: true,
      acceptanceStatus: 'needs_revision',
      ...admissionFields,
      statusLabel: '需修订',
      acceptanceReasons: [
        approvalBlocker ? `${approvalBlocker.label}：${approvalBlocker.detail}` : '',
        scoreNeedsRevision ? `质量分 ${score} 低于 ${QUALITY_PASS_THRESHOLD}` : '',
        mustFix.length > 0 ? `必须修复：${mustFix.slice(0, 2).join('；')}` : '',
      ].filter(Boolean).slice(0, 3),
      storylineSync,
      storyUnitSync,
      assetIntake,
      ipSceneIntake,
      signatureSceneSync,
      readabilityReview,
      deslopGateDiagnostics,
      coreDrift,
      runwaySync,
      readerPayoffSync,
      readerExpectationSync,
      qualityAuditSync,
      qualityAuditRepairReceiptSync,
      chapterHandoffSync,
      chapterHandoffDeltaSync,
      writePreparation,
      intentConfirmationSync,
      benchmarkRecallSync,
      sourceReadiness,
      stateTracking,
      styleBoundary,
      informationFlow,
      expectationThreshold,
      storyLoop,
      emotionalArc,
      chapterHook,
      paragraphHook,
      suspense,
      assetLinkage,
      dialogue,
      plotDynamics,
      characterRelation,
      characterBehavior,
      conflictStructure,
      bridgeUnit,
      reversal,
      showdown,
      opening,
      proseCraft,
      punctuationTone,
      contentRubric,
      targetReader,
      genrePositioning,
      femaleAudience,
      upgradeRhythm,
      chapterStructure,
      chapterProgression,
      informationLoad,
      longformContinuity,
      coreContractCheck,
      continuityHeat,
      revisionReceiptCheck,
      deslopRepairCheck,
      proseMeta,
      serialRiskRepair,
      chapterHookQuality,
      readerRetentionCheck,
      readerRetentionSync,
      chapterAttraction,
      storyDriveSync,
      characterArcSync,
      chapterBenchmarkSync,
      styleSampleSync,
      first30RetentionRecheck,
      innovationSync,
      volumeBeatSync,
      blueprintReceipt,
      revisionReceipt,
      deliveryRiskReceipt,
      sceneCardReceipt,
      qualityAudit,
      platformRubric,
      approvalBlocker,
      governanceRecheckSync,
      deliveryRiskQueue,
      deliveryRiskConvergence,
      qualityScore: score,
      qualityStatus,
      mustFix,
      optionalImprovements,
      latestQualityReviewId: latestQuality?.id || null,
      latestEditorReportId: latestReport?.id || null,
      latestRevisionReviewId: latestRevision?.id || null,
      latestEditorReportSummary,
      latestRevisionSummary,
      storyStateSynced,
      recommendedAcceptanceAction: { key, label: ACTION_LABELS[key] },
      secondaryActions,
      shouldAutoExpandAcceptance: true,
    }
  }

  if (!storyStateSynced) {
    return {
      visible: true,
      acceptanceStatus: 'needs_state_sync',
      ...admissionFields,
      statusLabel: '需同步故事状态',
      acceptanceReasons: [
        storyStatePanel?.headline || `故事状态还没有同步到第 ${args.nextChapter.chapter_no} 章。`,
        ...(storyStatePanel?.reasons || []),
      ].filter(Boolean).slice(0, 4),
      storylineSync,
      storyUnitSync,
      assetIntake,
      ipSceneIntake,
      signatureSceneSync,
      readabilityReview,
      deslopGateDiagnostics,
      coreDrift,
      runwaySync,
      readerPayoffSync,
      readerExpectationSync,
      qualityAuditSync,
      qualityAuditRepairReceiptSync,
      chapterHandoffSync,
      chapterHandoffDeltaSync,
      writePreparation,
      intentConfirmationSync,
      benchmarkRecallSync,
      sourceReadiness,
      stateTracking,
      styleBoundary,
      informationFlow,
      expectationThreshold,
      storyLoop,
      emotionalArc,
      chapterHook,
      paragraphHook,
      suspense,
      assetLinkage,
      dialogue,
      plotDynamics,
      characterRelation,
      characterBehavior,
      conflictStructure,
      bridgeUnit,
      reversal,
      showdown,
      opening,
      proseCraft,
      punctuationTone,
      contentRubric,
      targetReader,
      genrePositioning,
      femaleAudience,
      upgradeRhythm,
      chapterStructure,
      chapterProgression,
      informationLoad,
      longformContinuity,
      coreContractCheck,
      continuityHeat,
      revisionReceiptCheck,
      deslopRepairCheck,
      proseMeta,
      serialRiskRepair,
      chapterHookQuality,
      readerRetentionCheck,
      readerRetentionSync,
      chapterAttraction,
      storyDriveSync,
      characterArcSync,
      chapterBenchmarkSync,
      styleSampleSync,
      first30RetentionRecheck,
      innovationSync,
      volumeBeatSync,
      blueprintReceipt,
      revisionReceipt,
      deliveryRiskReceipt,
      sceneCardReceipt,
      qualityAudit,
      platformRubric,
      approvalBlocker,
      governanceRecheckSync,
      deliveryRiskQueue,
      deliveryRiskConvergence,
      qualityScore: score,
      qualityStatus,
      mustFix,
      optionalImprovements,
      latestQualityReviewId: latestQuality?.id || null,
      latestEditorReportId: latestReport?.id || null,
      latestRevisionReviewId: latestRevision?.id || null,
      latestEditorReportSummary,
      latestRevisionSummary,
      storyStateSynced,
      recommendedAcceptanceAction: { key: 'sync_story_state', label: ACTION_LABELS.sync_story_state },
      secondaryActions,
      shouldAutoExpandAcceptance: true,
    }
  }

  return {
    visible: true,
    acceptanceStatus: 'ready_to_accept',
    ...admissionFields,
    statusLabel: '可验收',
    acceptanceReasons: ['质量复检通过，故事状态已同步，可以进入下一章。'],
    storylineSync,
    storyUnitSync,
    assetIntake,
    ipSceneIntake,
    signatureSceneSync,
    readabilityReview,
    deslopGateDiagnostics,
    coreDrift,
    runwaySync,
    readerPayoffSync,
    readerExpectationSync,
    qualityAuditSync,
    qualityAuditRepairReceiptSync,
    chapterHandoffSync,
    chapterHandoffDeltaSync,
    writePreparation,
    intentConfirmationSync,
    benchmarkRecallSync,
    sourceReadiness,
    stateTracking,
    styleBoundary,
    informationFlow,
    expectationThreshold,
    storyLoop,
    emotionalArc,
    chapterHook,
    paragraphHook,
    suspense,
    assetLinkage,
    dialogue,
    plotDynamics,
    characterRelation,
    characterBehavior,
    conflictStructure,
    bridgeUnit,
    reversal,
    showdown,
    opening,
    proseCraft,
    punctuationTone,
    contentRubric,
    targetReader,
    genrePositioning,
    femaleAudience,
    upgradeRhythm,
    chapterStructure,
    chapterProgression,
    informationLoad,
    longformContinuity,
    coreContractCheck,
    continuityHeat,
    revisionReceiptCheck,
    deslopRepairCheck,
    proseMeta,
    serialRiskRepair,
    chapterHookQuality,
    readerRetentionCheck,
    readerRetentionSync,
    chapterAttraction,
    storyDriveSync,
    characterArcSync,
    chapterBenchmarkSync,
    styleSampleSync,
    first30RetentionRecheck,
    innovationSync,
    volumeBeatSync,
    blueprintReceipt,
    revisionReceipt,
    deliveryRiskReceipt,
    sceneCardReceipt,
    qualityAudit,
    platformRubric,
    approvalBlocker,
    governanceRecheckSync,
    deliveryRiskQueue,
    deliveryRiskConvergence,
    qualityScore: score,
    qualityStatus,
    mustFix,
    optionalImprovements,
    latestQualityReviewId: latestQuality?.id || null,
    latestEditorReportId: latestReport?.id || null,
    latestRevisionReviewId: latestRevision?.id || null,
    latestEditorReportSummary,
    latestRevisionSummary,
    storyStateSynced,
    recommendedAcceptanceAction: { key: 'accept_chapter_and_continue', label: ACTION_LABELS.accept_chapter_and_continue },
    secondaryActions,
    shouldAutoExpandAcceptance: false,
  }
}
