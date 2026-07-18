import type { AnyRecord } from './types'
import { arrayValue, firstText, text } from './helpers-basics'
import {
  BATCH_DELIVERY_QUALITY_THRESHOLD,
  issueTexts,
  numberValue,
  parsePayload,
  recordTime,
} from './helpers-risk-shared'

export function boolValue(value: any) {
  if (value === true || value === false) return value
  const normalized = text(value).toLowerCase()
  if (['true', 'yes', 'ok', 'pass', 'passed', 'delivered', 'done'].includes(normalized)) return true
  if (['false', 'no', 'warn', 'warning', 'fail', 'failed', 'missing', 'missed'].includes(normalized)) return false
  return null
}

export function riskPayload(review: AnyRecord | null, key: string) {
  const payload = parsePayload(review?.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
  return payload?.[key] || payload?.result?.[key] || payload?.result || payload
}

export function reviewPayload(review: AnyRecord | null) {
  return parsePayload(review?.payload, { owner: review, kind: 'review', field: 'payload' }) || {}
}

export function riskCountFromStatus(payload: AnyRecord, review: AnyRecord | null) {
  return text(payload?.status || review?.status).toLowerCase() === 'warn' ? 1 : 0
}

export function sceneCardReceiptCheckText(value: any) {
  if (typeof value === 'string') return text(value)
  return [
    value?.key,
    value?.label,
    value?.status,
    value?.evidence,
    value?.fix,
    value?.message,
    value?.summary,
    value?.text,
    ...arrayValue(value?.fields),
  ].map(item => text(item)).filter(Boolean).join(' ')
}

export function sceneCardReceiptCheckFailed(value: any) {
  if (typeof value === 'string') return value.toLowerCase().includes('scene_card_receipt')
  const status = text(value?.status || value?.result || value?.severity).toLowerCase()
  if (['pass', 'passed', 'ok', 'done', 'true'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'blocker'].includes(status)) return true
  if (value?.passed === false || value?.delivered === false || value?.ok === false) return true
  return true
}

export function sceneCardReceiptRiskChecks(payload: AnyRecord | null) {
  const source = payload || {}
  const selfCheck = source?.self_check || source?.selfCheck || source
  const review = selfCheck?.review || source?.review || {}
  return [
    ...arrayValue(review?.quality_audit_checks || review?.qualityAuditChecks),
    ...arrayValue(selfCheck?.quality_audit_checks || selfCheck?.qualityAuditChecks),
    ...arrayValue(source?.quality_audit_checks || source?.qualityAuditChecks),
    ...arrayValue(review?.issues),
    ...arrayValue(selfCheck?.issues),
    ...arrayValue(source?.issues),
  ].filter(item => sceneCardReceiptCheckText(item).toLowerCase().includes('scene_card_receipt'))
    .filter(sceneCardReceiptCheckFailed)
}

export function sceneCardReceiptRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  return sceneCardReceiptRiskChecks(reviewPayload(review)).length
}

export function sceneCardReceiptRiskTitle(risk: AnyRecord, count: number) {
  return text(risk?.scene_card_receipt?.label || risk?.sceneCardReceipt?.label, `场景回执缺口 ${count}`)
}

export function sceneCardReceiptRiskMessage(risk: AnyRecord) {
  const checks = sceneCardReceiptRiskChecks(risk)
  return checks.map(item => firstText(item?.evidence, item?.message, item?.summary, item?.text, item?.fix, sceneCardReceiptCheckText(item))).filter(Boolean).slice(0, 2).join('；')
    || '场景卡回执未能证明对应场景正文已兑现。'
}

export function qualityAuditCheckText(value: any) {
  if (typeof value === 'string') return text(value)
  return [
    value?.key,
    value?.label,
    value?.status,
    value?.evidence,
    value?.fix,
    value?.message,
    value?.summary,
    value?.text,
    value?.strategy,
  ].map(item => text(item)).filter(Boolean).join(' ')
}

export function qualityAuditCheckFailed(value: any) {
  if (typeof value === 'string') return true
  const status = text(value?.status || value?.result || value?.severity).toLowerCase()
  const score = Number(value?.score)
  if (['pass', 'passed', 'ok', 'done', 'true'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'blocker'].includes(status)) return true
  return Number.isFinite(score) && score < 78
}

export function qualityAuditRiskChecks(payload: AnyRecord | null) {
  const source = payload || {}
  const selfCheck = source?.self_check || source?.selfCheck || source
  const review = selfCheck?.review || source?.review || {}
  return [
    ...arrayValue(review?.quality_audit_checks || review?.qualityAuditChecks),
    ...arrayValue(selfCheck?.quality_audit_checks || selfCheck?.qualityAuditChecks),
    ...arrayValue(source?.quality_audit_checks || source?.qualityAuditChecks),
  ].filter(item => !qualityAuditCheckText(item).toLowerCase().includes('scene_card_receipt'))
    .filter(qualityAuditCheckFailed)
}

export function qualityAuditRiskMessageFromChecks(checks: AnyRecord[]) {
  return checks.map(item => firstText(item?.evidence, item?.message, item?.summary, item?.text, item?.fix, qualityAuditCheckText(item))).filter(Boolean).slice(0, 2).join('；')
    || 'quality_audit_checks 仍有 fail/warn 项未清。'
}

export function qualityAuditRiskHigh(checks: AnyRecord[]) {
  return checks.some(item => {
    const status = text(item?.status || item?.result || item?.severity).toLowerCase()
    const score = Number(item?.score)
    return ['fail', 'failed', 'blocker'].includes(status) || (Number.isFinite(score) && score < 65)
  })
}

export function uniqueObjectReferences(values: any[]) {
  const seen = new Set<any>()
  return values.filter((value) => {
    if (!value || typeof value !== 'object') return false
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

export function deliveryReceiptsFrom(value: AnyRecord | null | undefined) {
  if (!value || typeof value !== 'object') return {}
  const rawPayload = value.raw_payload || value.rawPayload || {}
  return value.oh_story_delivery_receipts
    || value.ohStoryDeliveryReceipts
    || rawPayload.oh_story_delivery_receipts
    || rawPayload.ohStoryDeliveryReceipts
    || {}
}

export function preDraftExecutionReceiptSections(payload: AnyRecord | null) {
  const source = payload || {}
  const selfCheck = source?.self_check || source?.selfCheck || source
  const review = selfCheck?.review || selfCheck?.initial_review || source?.review || source
  const receiptSources = uniqueObjectReferences([
    deliveryReceiptsFrom(review),
    deliveryReceiptsFrom(selfCheck),
    deliveryReceiptsFrom(source),
  ])
  return uniqueObjectReferences([
    review?.pre_draft_execution_receipts || review?.preDraftExecutionReceipts,
    selfCheck?.pre_draft_execution_receipts || selfCheck?.preDraftExecutionReceipts,
    source?.pre_draft_execution_receipts || source?.preDraftExecutionReceipts,
    ...receiptSources.map(item => item?.pre_draft_execution_receipts || item?.preDraftExecutionReceipts),
  ])
}

export function preDraftExecutionCheckNeedsRepair(value: any) {
  const status = text(value?.status || value?.result || value?.severity).toLowerCase()
  if (['pass', 'passed', 'ok', 'done', 'true'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'blocker'].includes(status)) return true
  if (value?.delivered === false || value?.passed === false || value?.ok === false) return true
  return Boolean(firstText(value?.remaining_risk, value?.remainingRisk))
}

export function preDraftExecutionRiskChecks(payload: AnyRecord | null, snakeKey: string, camelKey: string) {
  return preDraftExecutionReceiptSections(payload)
    .flatMap(section => arrayValue(section?.[snakeKey] || section?.[camelKey]))
    .filter(preDraftExecutionCheckNeedsRepair)
}

export function preDraftExecutionRiskMessage(checks: AnyRecord[]) {
  return checks.map(item => firstText(
    item?.remaining_risk,
    item?.remainingRisk,
    item?.evidence,
    item?.message,
    item?.summary,
    item?.text,
    item?.fix,
    item?.label,
    item?.key,
  )).filter(Boolean).slice(0, 2).join('；') || '写前执行回执仍有未兑现项。'
}

export function sourceStateCheckNeedsRepair(value: any) {
  if (typeof value === 'string') return true
  const status = text(value?.status || value?.result || value?.severity).toLowerCase()
  if (['pass', 'passed', 'ok', 'done', 'true', 'yes'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error', 'false', 'no', '0'].includes(status)) return true
  if (value?.ready === false || value?.passed === false || value?.delivered === false || value?.ok === false) return true
  if (value?.ready === true || value?.passed === true || value?.delivered === true || value?.ok === true) return false
  return Boolean(firstText(value?.remaining_risk, value?.remainingRisk, value?.fix, value?.evidence))
}

export function sourceStateRiskChecks(payload: AnyRecord | null, snakeKey: string, camelKey: string) {
  const source = payload || {}
  const selfCheck = source?.self_check || source?.selfCheck || source
  const review = selfCheck?.review || source?.review || {}
  return [
    ...arrayValue(review?.[snakeKey] || review?.[camelKey]),
    ...arrayValue(selfCheck?.[snakeKey] || selfCheck?.[camelKey]),
    ...arrayValue(source?.[snakeKey] || source?.[camelKey]),
  ].filter(sourceStateCheckNeedsRepair)
}

export function sourceStateRiskMessage(checks: AnyRecord[]) {
  return checks.map(item => firstText(
    item?.evidence,
    item?.message,
    item?.summary,
    item?.text,
    item?.remaining_risk,
    item?.remainingRisk,
    item?.fix,
    item?.label,
    item?.key,
  )).filter(Boolean).slice(0, 2).join('；') || '来源/状态检查仍有 fail/warn 项未清。'
}

export function qualityAuditRepairReceiptRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const risk = riskPayload(review, 'quality_audit_repair_receipt_sync')
  const count = Number(risk?.missed_count ?? risk?.missedCount)
  if (Number.isFinite(count)) return Math.max(0, count)
  const missed = arrayValue(risk?.missed || risk?.gaps || risk?.issues)
  if (missed.length > 0) return missed.length
  return riskCountFromStatus(risk, review)
}

export function qualityAuditRepairReceiptRiskMessage(risk: AnyRecord) {
  return issueTexts([
    ...arrayValue(risk?.missed || risk?.gaps || risk?.issues).map((item: any) => firstText(
      item?.text,
      item?.evidence,
      item?.message,
      item?.summary,
      item?.risk,
      item?.label,
    )),
    ...arrayValue(risk?.next_actions || risk?.nextActions),
    risk?.summary,
  ], 2).join('；') || 'quality_audit_repair_receipts 没有逐条证明质量诊断修复已闭环。'
}

export function deslopRepairReceiptRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const risk = riskPayload(review, 'deslop_repair_receipt_sync')
  const count = Number(risk?.missed_count ?? risk?.missedCount)
  if (Number.isFinite(count)) return Math.max(0, count)
  const missed = arrayValue(risk?.missed || risk?.gaps || risk?.issues)
  if (missed.length > 0) return missed.length
  return riskCountFromStatus(risk, review)
}

export function deslopRepairReceiptRiskMessage(risk: AnyRecord) {
  return issueTexts([
    ...arrayValue(risk?.missed || risk?.gaps || risk?.issues).map((item: any) => firstText(
      item?.text,
      item?.evidence,
      item?.message,
      item?.summary,
      item?.risk,
      item?.label,
    )),
    ...arrayValue(risk?.next_actions || risk?.nextActions),
    risk?.summary,
  ], 2).join('；') || 'deslop_repair_receipts 没有逐条证明去AI味修复已闭环。'
}

export function revisionSyncRiskCount(review: AnyRecord | null, key: string) {
  if (!review) return 0
  const risk = riskPayload(review, key)
  const count = Number(risk?.missed_count ?? risk?.missedCount ?? risk?.risk_count ?? risk?.riskCount)
  if (Number.isFinite(count)) return Math.max(0, count)
  const missed = arrayValue(risk?.missed || risk?.gaps || risk?.issues || risk?.evidence_missing || risk?.evidenceMissing)
  if (missed.length > 0) return missed.length
  return riskCountFromStatus(risk, review)
}

export function revisionSyncRiskMessage(risk: AnyRecord, fallback: string) {
  return issueTexts([
    ...arrayValue(risk?.missed || risk?.gaps || risk?.issues || risk?.evidence_missing || risk?.evidenceMissing).map((item: any) => firstText(
      item?.text,
      item?.impact,
      item?.evidence,
      item?.message,
      item?.summary,
      item?.risk,
      item?.required_action,
      item?.requiredAction,
      item?.target,
      item?.label,
    )),
    ...arrayValue(risk?.next_actions || risk?.nextActions),
    risk?.summary,
  ], 2).join('；') || fallback
}

export function coreRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const raw = riskPayload(review, 'core_drift')
  const payload = raw?.chapter_core_drift || raw?.core_drift || raw
  const count = arrayValue(payload?.drift_risks).length + arrayValue(payload?.risks).length
  return count > 0 ? count : riskCountFromStatus(payload, review)
}

export function runwayRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'runway_sync')
  const count = numberValue(payload?.risk_count ?? payload?.riskCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.four_question_missed).length
    + arrayValue(payload?.reader_fuel_missed).length
    + arrayValue(payload?.redline_touched).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function payoffDebtCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'reader_payoff_sync')
  const count = numberValue(payload?.debt_count ?? payload?.debtCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length + arrayValue(payload?.debts).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function expectationRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'reader_expectation_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length + arrayValue(payload?.debts).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function storylineRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'storyline_sync')
  const count = arrayValue(payload?.missed).length
    + arrayValue(payload?.unplanned).length
    + arrayValue(payload?.forbidden_touched).length
  return count > 0 ? count : riskCountFromStatus(payload, review)
}

export function storyUnitRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'story_unit_sync')
  const counted = numberValue(payload?.missed_count ?? payload?.missedCount)
    || numberValue(payload?.rushed_count ?? payload?.rushedCount)
    || numberValue(payload?.forbidden_count ?? payload?.forbiddenCount)
  if (counted !== null) {
    const missed = numberValue(payload?.missed_count ?? payload?.missedCount) ?? arrayValue(payload?.missed).length
    const rushed = numberValue(payload?.rushed_count ?? payload?.rushedCount) ?? (arrayValue(payload?.rushed_ahead).length + arrayValue(payload?.rushedAhead).length)
    const forbidden = numberValue(payload?.forbidden_count ?? payload?.forbiddenCount) ?? (arrayValue(payload?.forbidden_touched).length + arrayValue(payload?.forbiddenTouched).length)
    return missed + rushed + forbidden
  }
  const count = arrayValue(payload?.missed).length
    + arrayValue(payload?.rushed_ahead).length
    + arrayValue(payload?.rushedAhead).length
    + arrayValue(payload?.forbidden_touched).length
    + arrayValue(payload?.forbiddenTouched).length
  return count > 0 ? count : riskCountFromStatus(payload, review)
}

export function storyDriveRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'story_drive_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function characterArcRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'character_arc_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function readabilityRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'readability_review')
  const memeSense = payload?.meme_sense || {}
  const immersionRiskCount = arrayValue(memeSense?.immersion_risks).length + arrayValue(payload?.immersion_risks).length
  const score = numberValue(payload?.readability_score ?? payload?.score)
  const lowScoreCount = score !== null && score < BATCH_DELIVERY_QUALITY_THRESHOLD ? 1 : 0
  return immersionRiskCount + lowScoreCount
}

export function styleSampleRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'style_sample_sync')
  const missed = numberValue(payload?.missed_count ?? payload?.missedCount) ?? arrayValue(payload?.missed).length
  const copied = numberValue(payload?.copy_risk_count ?? payload?.copyRiskCount) ?? (arrayValue(payload?.copied_phrases).length + arrayValue(payload?.copiedPhrases).length)
  const total = missed + copied
  return total > 0 ? total : riskCountFromStatus(payload, review)
}

export function chapterBenchmarkRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'chapter_benchmark_sync')
  const missed = numberValue(payload?.missed_count ?? payload?.missedCount) ?? arrayValue(payload?.missed).length
  return missed > 0 ? missed : riskCountFromStatus(payload, review)
}

export function contractSyncRiskCount(review: AnyRecord | null, payloadKey: string) {
  if (!review) return 0
  const payload = riskPayload(review, payloadKey)
  const missed = numberValue(payload?.missed_count ?? payload?.missedCount)
    ?? arrayValue(payload?.missed || payload?.gaps || payload?.issues).length
  return missed > 0 ? missed : riskCountFromStatus(payload, review)
}

export function chapterAttractionWeakDimensions(payload: AnyRecord) {
  const explicitWeak = arrayValue(payload?.weak_dimensions || payload?.weakDimensions)
  if (explicitWeak.length > 0) return explicitWeak
  return arrayValue(payload?.dimensions)
    .filter((item: any) => text(item?.status).toLowerCase() === 'warn')
}

export function chapterAttractionRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'chapter_attraction_review')
  const count = numberValue(payload?.weak_count ?? payload?.weakCount)
  if (count !== null) return count
  const weak = chapterAttractionWeakDimensions(payload).length
  return weak > 0 ? weak : riskCountFromStatus(payload, review)
}

export function governanceRecheckRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'governance_recheck_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.failed_evidence).length
    + arrayValue(payload?.failedEvidence).length
    + arrayValue(payload?.missed).length
    + arrayValue(payload?.missed_items).length
    + arrayValue(payload?.missedItems).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function readerTrialReport(review: AnyRecord | null) {
  if (!review) return null
  const payload = reviewPayload(review)
  return payload?.report || payload?.reader_trial_review || payload?.result?.report || payload?.result || payload
}

export function latestReaderTrialReview(reviews: AnyRecord[]) {
  return reviews
    .filter(review => text(review?.review_type) === 'reader_trial_review')
    .slice()
    .sort((a, b) => recordTime(b) - recordTime(a))[0] || null
}

export function chapterNosFromText(value: string) {
  const result = new Set<number>()
  const normalized = text(value)
  const patterns = [
    /第\s*(\d+)\s*章/g,
    /chapter\s*(\d+)/gi,
  ]
  for (const pattern of patterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(normalized))) {
      const chapterNo = Number(match[1])
      if (Number.isFinite(chapterNo) && chapterNo > 0) result.add(chapterNo)
    }
  }
  return [...result]
}

export function readerTrialAppliesToBatch(textValue: string, chapterNos: Set<number>) {
  const mentionedNos = chapterNosFromText(textValue)
  if (mentionedNos.length > 0) {
    return mentionedNos.some(chapterNo => chapterNos.has(chapterNo))
  }
  return [...chapterNos].some(chapterNo => chapterNo > 0 && chapterNo <= 30)
}

export function readerTrialBatchReview(args: {
  items: AutoCreationBatchReviewItem[]
  review: AnyRecord | null
}) {
  const report = readerTrialReport(args.review)
  const chapterNos = new Set(args.items.map(item => Number(item.chapterNo || 0)).filter(Boolean))
  const dropPoints = arrayValue(report?.drop_points || report?.dropPoints)
    .map(item => text(item))
    .filter(Boolean)
    .filter(item => readerTrialAppliesToBatch(item, chapterNos))
  const repairActions = arrayValue(report?.repair_actions || report?.repairActions)
    .map(item => text(item))
    .filter(Boolean)
    .filter(item => readerTrialAppliesToBatch(item, chapterNos) || dropPoints.length > 0)
  const score = numberValue(report?.score)
  const status = text(report?.status).toLowerCase()
  const batchInTrialWindow = [...chapterNos].some(chapterNo => chapterNo > 0 && chapterNo <= 30)
  const lowScoreRisk = batchInTrialWindow && score !== null && score < BATCH_DELIVERY_QUALITY_THRESHOLD ? 1 : 0
  const statusRisk = batchInTrialWindow && ['blocked', 'block', 'needs_repair', 'warn'].includes(status) ? 1 : 0
  const riskCount = dropPoints.length || Math.max(lowScoreRisk, statusRisk)
  return {
    status: riskCount > 0 ? 'warn' as const : 'ok' as const,
    score,
    label: riskCount > 0 ? `试读弃读点 ${riskCount}` : '试读 OK',
    summary: text(report?.summary, riskCount > 0 ? '读者试读复盘存在弃读点。' : '读者试读复盘未发现当前批次风险。'),
    quality_bar: firstText(report?.quality_bar, report?.qualityBar),
    drop_points: dropPoints,
    repair_actions: repairActions,
    personas: arrayValue(report?.personas),
    segments: arrayValue(report?.segments),
    risk_count: riskCount,
  }
}

export function retentionRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'reader_retention_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function innovationRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'innovation_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function signatureSceneRiskCount(review: AnyRecord | null) {
  if (!review) return 0
  const payload = riskPayload(review, 'signature_scene_sync')
  const count = numberValue(payload?.missed_count ?? payload?.missedCount)
  if (count !== null) return count
  const inferred = arrayValue(payload?.missed).length
  return inferred > 0 ? inferred : riskCountFromStatus(payload, review)
}

export function payloadReviewChapterId(review: AnyRecord, payload: AnyRecord) {
  return review?.chapter_id
    ?? review?.chapterId
    ?? payload?.chapter_id
    ?? payload?.chapterId
    ?? payload?.report?.chapter_id
    ?? payload?.report?.chapterId
    ?? payload?.context_package?.chapter_target?.id
    ?? null
}

export function payloadReviewChapterNo(review: AnyRecord, payload: AnyRecord) {
  return Number(
    review?.chapter_no
    ?? review?.chapterNo
    ?? payload?.chapter_no
    ?? payload?.chapterNo
    ?? payload?.report?.chapter_no
    ?? payload?.report?.chapterNo
    ?? payload?.context_package?.chapter_target?.chapter_no
    ?? payload?.context_package?.chapter_target?.chapterNo
    ?? 0,
  )
}

export function deliveryRiskAnnotationKey(input: {
  source: string
  reviewId: any
  chapterId: any
  chapterNo: any
  kind: string
  title: string
}) {
  return [
    input.source || 'review',
    input.reviewId || 0,
    input.chapterId || 0,
    input.chapterNo || 0,
    String(input.kind || 'issue'),
    String(input.title || '').slice(0, 120),
  ].join(':')
}

export function resolvedAnnotationKeys(reviews: AnyRecord[]) {
  const map = new Map<string, AnyRecord>()
  reviews
    .filter(review => text(review?.review_type) === 'review_annotation_status')
    .slice()
    .sort((a, b) => recordTime(a) - recordTime(b))
    .forEach(review => {
      const payload = reviewPayload(review)
      const key = text(payload?.annotation_key || payload?.key)
      if (key) map.set(key, payload)
    })
  return new Set([...map.entries()]
    .filter(([, payload]) => text(payload?.status).toLowerCase() === 'resolved')
    .map(([key]) => key))
}

export function clearedDeliveryRiskChapterKeys(reviews: AnyRecord[]) {
  const cleared = new Map<string, number>()
  reviews
    .filter(review => text(review?.review_type) === 'delivery_risk_convergence')
    .forEach(review => {
      const payload = reviewPayload(review)
      const convergence = payload?.delivery_risk_convergence || payload?.result?.delivery_risk_convergence || payload?.result || payload
      const afterCount = Number(convergence?.after_count ?? convergence?.afterCount ?? convergence?.after?.total_count ?? 0)
      if (!(text(convergence?.status) === 'cleared' || afterCount === 0)) return
      const chapterId = payloadReviewChapterId(review, { ...payload, chapter_id: payload?.chapter_id || convergence?.chapter_id })
      const chapterNo = payloadReviewChapterNo(review, { ...payload, chapter_no: payload?.chapter_no || convergence?.chapter_no })
      const time = recordTime(review)
      if (chapterId !== null && chapterId !== undefined) cleared.set(`id:${chapterId}`, Math.max(cleared.get(`id:${chapterId}`) || 0, time))
      if (chapterNo > 0) cleared.set(`no:${chapterNo}`, Math.max(cleared.get(`no:${chapterNo}`) || 0, time))
    })
  return cleared
}

