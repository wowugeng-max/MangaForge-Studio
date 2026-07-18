import {
  buildDeterministicProseCleanupReviewRecord,
  buildReceiptSyncReviewRecord,
  buildRevisionCascadeImpactSyncReviewRecord,
  buildRevisionScopeGuardSyncReviewRecord,
} from '../../novel-writing/post-delivery-sync-review-record'

export async function storePreStoreReceiptSyncReviews(args: {
  storeGeneratedReviewRecord: (record: any) => any
  projectId: number
  chapter: any
  selfCheck: any
  proseRevisionReceiptSync: any
  deslopRepairReceiptSync: any
  qualityAuditRepairReceiptSync: any
  revisionCascadeImpactSync: any
  revisionScopeGuardSync: any
  deterministicProseCleanup: any
  formatNormalization: any
  punctuationNormalization: any
  deslopTermNormalization: any
  cleanupRepairFormatNormalization: any
  cleanupRepairPunctuationNormalization: any
  cleanupRepairDeslopTermNormalization: any
}) {
  const {
    storeGeneratedReviewRecord,
    projectId,
    chapter,
    selfCheck,
    proseRevisionReceiptSync,
    deslopRepairReceiptSync,
    qualityAuditRepairReceiptSync,
    revisionCascadeImpactSync,
    revisionScopeGuardSync,
    deterministicProseCleanup,
    formatNormalization,
    punctuationNormalization,
    deslopTermNormalization,
    cleanupRepairFormatNormalization,
    cleanupRepairPunctuationNormalization,
    cleanupRepairDeslopTermNormalization,
  } = args
  await storeGeneratedReviewRecord(buildReceiptSyncReviewRecord({ projectId, chapter, sync: proseRevisionReceiptSync, reviewType: 'prose_revision_receipt_sync', payloadKey: 'prose_revision_receipt_sync' }))
  await storeGeneratedReviewRecord(buildReceiptSyncReviewRecord({ projectId, chapter, sync: deslopRepairReceiptSync, reviewType: 'deslop_repair_receipt_sync', payloadKey: 'deslop_repair_receipt_sync' }))
  await storeGeneratedReviewRecord(buildReceiptSyncReviewRecord({ projectId, chapter, sync: qualityAuditRepairReceiptSync, reviewType: 'quality_audit_repair_receipt_sync', payloadKey: 'quality_audit_repair_receipt_sync' }))
  await storeGeneratedReviewRecord(buildRevisionCascadeImpactSyncReviewRecord({ projectId, chapter, sync: revisionCascadeImpactSync }))
  await storeGeneratedReviewRecord(buildRevisionScopeGuardSyncReviewRecord({ projectId, chapter, selfCheck, sync: revisionScopeGuardSync }))
  await storeGeneratedReviewRecord(buildDeterministicProseCleanupReviewRecord({
    projectId,
    chapter,
    deterministicProseCleanup,
    formatNormalization,
    punctuationNormalization,
    deslopTermNormalization,
    cleanupRepairFormatNormalization,
    cleanupRepairPunctuationNormalization,
    cleanupRepairDeslopTermNormalization,
  }))
}
