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

