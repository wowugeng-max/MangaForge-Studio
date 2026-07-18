import {
  asArray,
  buildLLMResultDiagnostics,
  extractPlainProseFallback,
  getNovelPayload,
} from '../../routes/novel-route-utils'
import {
  countProseChars,
} from '../../novel-writing/word-target'
import {
  buildRevisionScopeGuardSyncReport,
} from '../post-delivery/delta-sync-reports'

export async function resolveProseRevisionOutcome(args: {
  revisionResult: any
  normalizedReview: any
  chapterText: string
  contextPackage: any
  emitReviewProgress: (phase: string, payload?: any) => Promise<void> | void
}) {
  const {
    revisionResult,
    normalizedReview,
    chapterText,
    contextPackage,
    emitReviewProgress,
  } = args
  const revisionPayload = getNovelPayload(revisionResult)
  const revisionPlainProseFallback = extractPlainProseFallback(revisionResult, 800)
  const revisedChapters = Array.isArray(revisionPayload?.prose_chapters)
    ? revisionPayload.prose_chapters
    : Array.isArray(revisionPayload?.proseChapters)
      ? revisionPayload.proseChapters
      : []
  const revisedFirst = revisedChapters.length ? revisedChapters[0] : revisionPayload
  const revisedText = revisedFirst?.chapter_text || revisedFirst?.chapterText || revisionPayload?.chapter_text || revisionPayload?.chapterText || revisionPlainProseFallback
  const revisionDeliveryReceipts = revisedFirst?.oh_story_delivery_receipts
    || revisedFirst?.ohStoryDeliveryReceipts
    || revisionPayload?.oh_story_delivery_receipts
    || revisionPayload?.ohStoryDeliveryReceipts
    || null
  const revisedFirstRevisionReceipts = [
    ...asArray(revisedFirst?.revision_receipts),
    ...asArray(revisedFirst?.revisionReceipts),
  ]
  const revisionPayloadReceipts = [
    ...asArray(revisionPayload?.revision_receipts),
    ...asArray(revisionPayload?.revisionReceipts),
  ]
  const revisionReceipts = revisedFirstRevisionReceipts.length
    ? revisedFirstRevisionReceipts
    : revisionPayloadReceipts
  const revisedFirstRevisionContextReceipts = [
    ...asArray(revisedFirst?.revision_context_receipts),
    ...asArray(revisedFirst?.revisionContextReceipts),
  ]
  const revisionPayloadContextReceipts = [
    ...asArray(revisionPayload?.revision_context_receipts),
    ...asArray(revisionPayload?.revisionContextReceipts),
  ]
  const revisionContextReceipts = revisedFirstRevisionContextReceipts.length
    ? revisedFirstRevisionContextReceipts
    : revisionPayloadContextReceipts
  const revisedFirstDeslopRepairReceipts = [
    ...asArray(revisedFirst?.deslop_repair_receipts),
    ...asArray(revisedFirst?.deslopRepairReceipts),
  ]
  const revisionPayloadDeslopRepairReceipts = [
    ...asArray(revisionPayload?.deslop_repair_receipts),
    ...asArray(revisionPayload?.deslopRepairReceipts),
  ]
  const deslopRepairReceipts = revisedFirstDeslopRepairReceipts.length
    ? revisedFirstDeslopRepairReceipts
    : revisionPayloadDeslopRepairReceipts
  const revisedFirstQualityAuditRepairReceipts = [
    ...asArray(revisedFirst?.quality_audit_repair_receipts),
    ...asArray(revisedFirst?.qualityAuditRepairReceipts),
  ]
  const revisionPayloadQualityAuditRepairReceipts = [
    ...asArray(revisionPayload?.quality_audit_repair_receipts),
    ...asArray(revisionPayload?.qualityAuditRepairReceipts),
  ]
  const qualityAuditRepairReceipts = revisedFirstQualityAuditRepairReceipts.length
    ? revisedFirstQualityAuditRepairReceipts
    : revisionPayloadQualityAuditRepairReceipts
  const revisionScopeGuardPayload = revisedFirst?.revision_scope_guard
    || revisedFirst?.revisionScopeGuard
    || revisionPayload?.revision_scope_guard
    || revisionPayload?.revisionScopeGuard
    || {}
  const revisionNextChapterQualityPlan = revisedFirst?.next_chapter_quality_plan
    || revisedFirst?.nextChapterQualityPlan
    || revisionPayload?.next_chapter_quality_plan
    || revisionPayload?.nextChapterQualityPlan
    || null
  if (!revisedText) {
    await emitReviewProgress('revision_llm', {
      status: 'warn',
      error: String(revisionResult.error || '修订未返回正文').slice(0, 240),
      llm_diagnostics: buildLLMResultDiagnostics(revisionResult),
    })
    return { review: normalizedReview, revision: { error: revisionResult.error || '修订未返回正文', llm_diagnostics: buildLLMResultDiagnostics(revisionResult) }, final_text: chapterText, revised: false }
  }
  await emitReviewProgress('revision_llm', {
    status: 'success',
    modelName: (revisionResult as any).modelName,
    word_count: countProseChars(revisedText),
  })
  const revisionScopeGuard = buildRevisionScopeGuardSyncReport(contextPackage?.chapter_target || {}, {
    revised: true,
    original_text: chapterText,
    final_text: revisedText,
    revision_scope_guard: revisionScopeGuardPayload,
  })
  return {
    review: normalizedReview,
    revision: {
      scene_breakdown: revisedFirst?.scene_breakdown || revisedFirst?.sceneBreakdown || revisionPayload?.scene_breakdown || revisionPayload?.sceneBreakdown || [],
      continuity_notes: revisedFirst?.continuity_notes || revisedFirst?.continuityNotes || revisionPayload?.continuity_notes || revisionPayload?.continuityNotes || [],
      revision_context_receipts: revisionContextReceipts,
      revision_receipts: revisionReceipts,
      deslop_repair_receipts: deslopRepairReceipts,
      quality_audit_repair_receipts: qualityAuditRepairReceipts,
      oh_story_delivery_receipts: revisionDeliveryReceipts,
      revision_scope_guard: revisionScopeGuard,
      next_chapter_quality_plan: revisionNextChapterQualityPlan,
      plain_text_fallback_used: Boolean(revisionPlainProseFallback && !revisedFirst?.chapter_text && !revisedFirst?.chapterText && !revisionPayload?.chapter_text && !revisionPayload?.chapterText),
      modelName: (revisionResult as any).modelName,
    },
    revision_scope_guard: revisionScopeGuard,
    final_text: revisedText,
    revised: true,
  }
}
