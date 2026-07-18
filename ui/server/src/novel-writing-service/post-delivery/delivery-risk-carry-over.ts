import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import {
  deliveryRiskItemText,
  normalizeDeliveryRiskCarryOverContext,
  normalizeDeliveryRiskReceiptDelivered,
} from './delivery-risk-core'
import {
  artifactProtocolReceiptsFromSource,
  normalizeArtifactProtocolReceipt,
} from './artifact-protocol'
import { reviewTimestamp, reviewBelongsToChapter, reviewPayloadForType } from '../quality/review-lookup'
import { proseQualitySerialRiskRepairRisks } from '../quality/serial-risk-repair'
import {
  deliveryRiskCountFromPayload,
  deliveryRiskEvidence,
  pendingAssetIntakeRisks,
  pendingIpSceneIntakeRisks,
  makeDeliveryRiskItem,
  genericSyncRiskStagedActions,
  proseQualityAssetLinkageRisks,
  proseQualityAuditRepairReceiptRisks,
  proseQualityBannedWordRisks,
  proseQualityBenchmarkRecallRisks,
  proseQualityBlueprintConsumptionRisks,
  proseQualityBridgeUnitRisks,
  proseQualityChapterBenchmarkRisks,
  proseQualityChapterHandoffRisks,
  proseQualityChapterHookRisks,
  proseQualityCharacterBehaviorRisks,
  proseQualityCharacterRelationRisks,
  proseQualityConflictStructureRisks,
  proseQualityContentRubricRisks,
  proseQualityContinuityHeatRisks,
  proseQualityCoreContractRisks,
  proseQualityCraftMetricRisks,
  proseQualityDeliveryRiskReceiptRisks,
  proseQualityDeslopRepairCheckRisks,
  proseQualityDeslopRepairReceiptRisks,
  proseQualityDeslopRisks,
  proseQualityDialogueRisks,
  proseQualityEmotionalArcRisks,
  proseQualityExpectationThresholdRisks,
  proseQualityFemaleAudienceRisks,
  proseQualityFiveDimensionRisks,
  proseQualityFocusedRevisionModeRisks,
  proseQualityForeshadowingDeltaRisks,
  proseQualityGateFailureRisks,
  proseQualityGenrePositioningRisks,
  proseQualityHighSeverityFindings,
  proseQualityInformationFlowRisks,
  proseQualityIntentConfirmationRisks,
  proseQualityNextChapterPlanRisks,
  proseQualityOpeningRisks,
  proseQualityParagraphHookRisks,
  proseQualityPerspectiveVerdictRisks,
  proseQualityPlatformRubricRisks,
  proseQualityPlotDynamicsRisks,
  proseQualityPlotSpecialTopicsRisks,
  proseQualityProseCraftRisks,
  proseQualityProseMetaRisks,
  proseQualityPunctuationToneRisks,
  proseQualityQualityAuditRisks,
  proseQualityQualitySpecialtyRisks,
  proseQualityReaderRetentionRisks,
  proseQualityReversalRisks,
  proseQualityRevisionContextRisks,
  proseQualityRevisionDirectiveRisks,
  proseQualityRevisionReceiptCheckRisks,
  proseQualityRevisionReceiptRisks,
  proseQualitySettingViolationRisks,
  proseQualityShowdownRisks,
  proseQualitySourceReadinessRisks,
  proseQualityStateTrackingRisks,
  proseQualityStoryLoopRisks,
  proseQualityStoryStateUpdateRisks,
  proseQualityStructuredCheckRisks,
  proseQualityStyleBoundaryRisks,
  proseQualityStyleSampleRisks,
  proseQualitySuspenseRisks,
  proseQualityTargetReaderRisks,
  proseQualityTitleUniquenessRisks,
  proseQualityUpgradeRhythmRisks,
  proseQualityWordCountRisks,
  proseQualityWritePreparationRisks,
  readabilityAiSmellRisks,
} from '../quality/prose-quality-risks'

export function normalizeStoredOhStoryDeliveryReceipts(source: any = {}) {
  const payload = source?.oh_story_delivery_receipts
    || source?.ohStoryDeliveryReceipts
    || source?.delivery_receipts
    || source?.deliveryReceipts
    || source
  const chapterBlueprint = payload?.chapter_blueprint || payload?.chapterBlueprint || source?.chapter_blueprint || source?.chapterBlueprint || null
  const sceneCardReceipts = asArray(payload?.scene_card_receipts || payload?.sceneCardReceipts || source?.scene_card_receipts || source?.sceneCardReceipts)
  const deliveryRiskReceipts = asArray(payload?.delivery_risk_receipts || payload?.deliveryRiskReceipts || source?.delivery_risk_receipts || source?.deliveryRiskReceipts)
  const revisionContextReceipts = asArray(payload?.revision_context_receipts || payload?.revisionContextReceipts || source?.revision_context_receipts || source?.revisionContextReceipts)
  const revisionReceipts = asArray(payload?.revision_receipts || payload?.revisionReceipts || source?.revision_receipts || source?.revisionReceipts)
  const deslopRepairReceipts = asArray(payload?.deslop_repair_receipts || payload?.deslopRepairReceipts || source?.deslop_repair_receipts || source?.deslopRepairReceipts)
  const qualityAuditRepairReceipts = asArray(payload?.quality_audit_repair_receipts || payload?.qualityAuditRepairReceipts || source?.quality_audit_repair_receipts || source?.qualityAuditRepairReceipts)
  const artifactProtocolReceipts = [
    ...artifactProtocolReceiptsFromSource(payload),
    ...artifactProtocolReceiptsFromSource(source),
  ]
    .map(normalizeArtifactProtocolReceipt)
    .filter(Boolean)
  const uniqueArtifactProtocolReceipts = Array.from(new Map(artifactProtocolReceipts.map((receipt: any) => [
    `${receipt.key}::${receipt.artifact_path}::${receipt.evidence}`,
    receipt,
  ])).values())
  const preDraftExecutionReceipts = payload?.pre_draft_execution_receipts
    || payload?.preDraftExecutionReceipts
    || source?.pre_draft_execution_receipts
    || source?.preDraftExecutionReceipts
    || null
  if (
    !chapterBlueprint
    && sceneCardReceipts.length <= 0
    && deliveryRiskReceipts.length <= 0
    && revisionContextReceipts.length <= 0
    && revisionReceipts.length <= 0
    && deslopRepairReceipts.length <= 0
    && qualityAuditRepairReceipts.length <= 0
    && uniqueArtifactProtocolReceipts.length <= 0
    && !preDraftExecutionReceipts
  ) return null
  return {
    chapter_blueprint: chapterBlueprint,
    scene_card_receipts: sceneCardReceipts,
    delivery_risk_receipts: deliveryRiskReceipts,
    revision_context_receipts: revisionContextReceipts,
    revision_receipts: revisionReceipts,
    deslop_repair_receipts: deslopRepairReceipts,
    quality_audit_repair_receipts: qualityAuditRepairReceipts,
    artifact_protocol_receipts: uniqueArtifactProtocolReceipts,
    pre_draft_execution_receipts: preDraftExecutionReceipts,
  }
}

export * from './delivery-risk-carry-over-context'
