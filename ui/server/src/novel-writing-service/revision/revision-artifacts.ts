import { safeJsonStringify as stringifyRouteJsonSafely } from '../../routes/novel-route-utils'

export const REVISION_ARTIFACT_RECEIPT_FIELDS = [
  ['revision_context_receipts', 'revisionContextReceipts'],
  ['revision_receipts', 'revisionReceipts'],
  ['deslop_repair_receipts', 'deslopRepairReceipts'],
  ['quality_audit_repair_receipts', 'qualityAuditRepairReceipts'],
  ['artifact_protocol_receipts', 'artifactProtocolReceipts'],
] as const

export const DELIVERY_ARTIFACT_RECEIPT_FIELDS = [
  ['scene_card_receipts', 'sceneCardReceipts'],
  ['delivery_risk_receipts', 'deliveryRiskReceipts'],
  ...REVISION_ARTIFACT_RECEIPT_FIELDS,
] as const

export const PRE_DRAFT_ARTIFACT_RECEIPT_FIELDS = [
  ['status_filter_receipts', 'statusFilterReceipts'],
  ['source_readiness_checks', 'sourceReadinessChecks'],
  ['artifact_protocol_receipts', 'artifactProtocolReceipts'],
  ['write_preparation_checks', 'writePreparationChecks'],
  ['intent_confirmation_checks', 'intentConfirmationChecks'],
  ['benchmark_recall_checks', 'benchmarkRecallChecks'],
  ['style_sample_checks', 'styleSampleChecks'],
  ['next_chapter_quality_plan_receipts', 'nextChapterQualityPlanReceipts'],
  ['fallback_usage_receipts', 'fallbackUsageReceipts'],
] as const

function artifactArray(value: any) {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
}

function uniqueArtifactArray(items: any[]) {
  const seen = new Set<string>()
  const result: any[] = []
  for (const item of items) {
    if (item === undefined || item === null) continue
    const key = typeof item === 'object'
      ? stringifyRouteJsonSafely(item, undefined, 2000)
      : String(item)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result
}

function mergeArtifactArrayField(target: any, previous: any, next: any, snakeField: string, camelField: string) {
  const merged = uniqueArtifactArray([
    ...artifactArray(previous?.[snakeField]),
    ...artifactArray(previous?.[camelField]),
    ...artifactArray(next?.[snakeField]),
    ...artifactArray(next?.[camelField]),
  ])
  if (merged.length > 0) target[snakeField] = merged
}

export function meaningfulRevisionValue(value: any) {
  if (value === undefined || value === null) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

export function latestRevisionValue(next: any, previous: any, snakeField: string, camelField: string = snakeField) {
  const nextValue = next?.[snakeField] ?? next?.[camelField]
  if (meaningfulRevisionValue(nextValue)) return nextValue
  const previousValue = previous?.[snakeField] ?? previous?.[camelField]
  return meaningfulRevisionValue(previousValue) ? previousValue : nextValue
}

export function mergePreDraftExecutionReceipts(previous: any, next: any) {
  const previousReceipts = previous?.pre_draft_execution_receipts || previous?.preDraftExecutionReceipts || {}
  const nextReceipts = next?.pre_draft_execution_receipts || next?.preDraftExecutionReceipts || {}
  if (!meaningfulRevisionValue(previousReceipts) && !meaningfulRevisionValue(nextReceipts)) return null
  const merged: any = {
    ...previousReceipts,
    ...nextReceipts,
  }
  for (const [snakeField, camelField] of PRE_DRAFT_ARTIFACT_RECEIPT_FIELDS) {
    mergeArtifactArrayField(merged, previousReceipts, nextReceipts, snakeField, camelField)
  }
  return merged
}

export function mergeOhStoryDeliveryArtifacts(previous: any, next: any) {
  const previousDelivery = previous?.oh_story_delivery_receipts || previous?.ohStoryDeliveryReceipts || {}
  const nextDelivery = next?.oh_story_delivery_receipts || next?.ohStoryDeliveryReceipts || {}
  if (!meaningfulRevisionValue(previousDelivery) && !meaningfulRevisionValue(nextDelivery)) return null
  const merged: any = {
    ...previousDelivery,
    ...nextDelivery,
  }
  for (const [snakeField, camelField] of DELIVERY_ARTIFACT_RECEIPT_FIELDS) {
    mergeArtifactArrayField(merged, previousDelivery, nextDelivery, snakeField, camelField)
  }
  const preDraftExecutionReceipts = mergePreDraftExecutionReceipts(previousDelivery, nextDelivery)
  if (preDraftExecutionReceipts) merged.pre_draft_execution_receipts = preDraftExecutionReceipts
  return merged
}

export function mergeProseRevisionArtifacts(previousRevision: any = null, nextRevision: any = null) {
  if (!meaningfulRevisionValue(previousRevision)) return nextRevision || null
  if (!meaningfulRevisionValue(nextRevision)) return previousRevision || null
  const merged: any = {
    ...previousRevision,
    ...nextRevision,
  }
  for (const [snakeField, camelField] of REVISION_ARTIFACT_RECEIPT_FIELDS) {
    mergeArtifactArrayField(merged, previousRevision, nextRevision, snakeField, camelField)
  }
  const ohStoryDeliveryReceipts = mergeOhStoryDeliveryArtifacts(previousRevision, nextRevision)
  if (ohStoryDeliveryReceipts) merged.oh_story_delivery_receipts = ohStoryDeliveryReceipts
  for (const [snakeField, camelField] of [
    ['scene_breakdown', 'sceneBreakdown'],
    ['continuity_notes', 'continuityNotes'],
    ['revision_scope_guard', 'revisionScopeGuard'],
    ['next_chapter_quality_plan', 'nextChapterQualityPlan'],
  ]) {
    const selected = latestRevisionValue(nextRevision, previousRevision, snakeField, camelField)
    if (meaningfulRevisionValue(selected)) merged[snakeField] = selected
  }
  return merged
}
