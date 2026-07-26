import type { NovelDeliveryActionKey, NovelDeliverySummaryInput } from './writing-recommendation-types-actions'

export type NovelDeliverySummary = {
  visible: boolean
  tone: 'check' | 'revision' | 'sync' | 'warning' | 'ready'
  statusLabel: string
  qualityLabel: string
  storyStateLabel: string
  reason: string
  storylineSync: NovelDeliverySummaryInput['storylineSync']
  storyUnitSync: NovelDeliverySummaryInput['storyUnitSync']
  assetIntake: NovelDeliverySummaryInput['assetIntake']
  ipSceneIntake: NovelDeliverySummaryInput['ipSceneIntake']
  signatureSceneSync: NovelDeliverySummaryInput['signatureSceneSync']
  readabilityReview: NovelDeliverySummaryInput['readabilityReview']
  deslopGateDiagnostics: NovelDeliverySummaryInput['deslopGateDiagnostics']
  coreDrift: NovelDeliverySummaryInput['coreDrift']
  runwaySync: NovelDeliverySummaryInput['runwaySync']
  readerPayoffSync: NovelDeliverySummaryInput['readerPayoffSync']
  readerExpectationSync: NovelDeliverySummaryInput['readerExpectationSync']
  qualityAuditSync: NovelDeliverySummaryInput['qualityAuditSync']
  qualityAuditRepairReceiptSync: NovelDeliverySummaryInput['qualityAuditRepairReceiptSync']
  chapterHandoffSync: NovelDeliverySummaryInput['chapterHandoffSync']
  chapterHandoffDeltaSync: NovelDeliverySummaryInput['chapterHandoffDeltaSync']
  writePreparation: NovelDeliverySummaryInput['writePreparation']
  readerRetentionSync: NovelDeliverySummaryInput['readerRetentionSync']
  chapterAttraction: NovelDeliverySummaryInput['chapterAttraction']
  storyDriveSync: NovelDeliverySummaryInput['storyDriveSync']
  characterArcSync: NovelDeliverySummaryInput['characterArcSync']
  chapterBenchmarkSync: NovelDeliverySummaryInput['chapterBenchmarkSync']
  styleSampleSync: NovelDeliverySummaryInput['styleSampleSync']
  first30RetentionRecheck: NovelDeliverySummaryInput['first30RetentionRecheck']
  innovationSync: NovelDeliverySummaryInput['innovationSync']
  volumeBeatSync: NovelDeliverySummaryInput['volumeBeatSync']
  blueprintReceipt: NovelDeliverySummaryInput['blueprintReceipt']
  revisionReceipt: NovelDeliverySummaryInput['revisionReceipt']
  deliveryRiskReceipt: NovelDeliverySummaryInput['deliveryRiskReceipt']
  sceneCardReceipt: NovelDeliverySummaryInput['sceneCardReceipt']
  qualityAudit: NovelDeliverySummaryInput['qualityAudit']
  platformRubric: NovelDeliverySummaryInput['platformRubric']
  approvalBlocker: NovelDeliverySummaryInput['approvalBlocker']
  deliveryRiskQueue: NovelDeliverySummaryInput['deliveryRiskQueue']
  deliveryRiskConvergence: NovelDeliverySummaryInput['deliveryRiskConvergence']
  actionKey: NovelDeliveryActionKey | null
  actionLabel: string
  compactActionLabel: string
  secondaryActions: Array<{ key: NovelDeliveryActionKey; label: string }>
  characterPov: NonNullable<NovelDeliverySummaryInput['characterPov']> | null
  storyStatePanel: NonNullable<NovelDeliverySummaryInput['storyStatePanel']> | null
  storyStateSyncAction: { key: NovelDeliveryActionKey; label: string } | null
}

