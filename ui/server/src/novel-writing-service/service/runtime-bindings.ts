import { normalizeDeliveryRiskReceipts } from '../post-delivery/delivery-risk-core'
import { bindDeliveryRiskReceiptNormalizer } from '../quality/review-fill'
import { bindPostDeliveryDeltaSyncDeps } from '../post-delivery/delta-sync-reports'
import {
  contextWithChapterRawPreDraftForSync,
  normalizeSuspenseExpectationChainContract,
  bindQualitySyncReportDeps,
} from '../post-delivery/quality-sync-reports'
import {
  characterRelationExplicitContract,
  assetLinkageExplicitContract,
  assetText,
  assetStateChangeText,
} from '../quality/character-asset-contracts'
import { stateTrackingExplicitContract, bindStateTrackingContractDeps } from '../quality/state-tracking-contracts'
import {
  bindSceneCardsNormalizerDeps,
} from '../post-delivery/scene-cards'
import {
  applyStyleFingerprintToSceneCards,
  applyExplicitNewConceptAnchorsToSceneCards,
  applyDeliveryRiskCarryOverToSceneCards,
  bindSceneCardDeliveryRiskDeps,
} from '../post-delivery/scene-card-delivery-risk'
import { applyIntentDialogueBaselineToSceneCards } from '../quality/intent-benchmark-contracts'
import { compactJsonBriefText, mergedContextChapterTarget, mergedContextChapterTargetPreferRuntime } from '../quality/paragraph-prose-context'
import { explicitNewConceptNames, bindAudienceQualityContractDeps } from '../quality/audience-quality-contracts'
import { nextBatchBriefFromContext, normalizeLongformMemoryCapsule } from '../quality/memory-longform-contracts'
import { bindCraftTensionContractDeps } from '../quality/craft-tension-contracts'
import {
  buildReaderExpectationLedger,
  normalizeBatchChapterHandoffContract,
} from '../post-delivery/chapter-handoff-contracts'
import {
  normalizeCoreContractPeriodicDriftCheck,
  normalizeCoreContractRadar,
} from '../quality/core-contract-radar'
import { bindCoreHandoffSyncReportDeps } from '../post-delivery/core-handoff-sync-reports'
import { storylineUsageByAnyType, bindContinuityDialogueContractDeps } from '../quality/continuity-dialogue-contracts'
import { buildChapterBlueprintCausalChainContract } from '../quality/chapter-blueprint-execution'
import { inferBlueprintFunctionTag } from '../quality/blueprint-function-tag'
import { storylineUsageByType, buildCharacterArcBriefFromContext } from '../quality/character-arc-brief'
import { bindOutlineBlueprintContractDeps } from '../quality/outline-blueprint-contracts'
import {
  buildChapterBenchmarkStrategy,
  buildStyleSampleStrategy,
  styleBoundaryExplicitContract,
} from '../quality/style-sample-strategy'
import { bindPreDraftBriefDeps } from '../quality/pre-draft-brief'
import { listNovelChapters, mergeNovelChapterRawPayload } from '../../novel'

bindDeliveryRiskReceiptNormalizer(normalizeDeliveryRiskReceipts)

bindPostDeliveryDeltaSyncDeps({
  contextWithChapterRawPreDraftForSync,
  characterRelationExplicitContract,
  assetLinkageExplicitContract,
  assetText,
  assetStateChangeText,
  stateTrackingExplicitContract,
})

bindSceneCardsNormalizerDeps({
  compactJsonBriefText,
  applyStyleFingerprintToSceneCards,
  applyExplicitNewConceptAnchorsToSceneCards,
  applyIntentDialogueBaselineToSceneCards,
  applyDeliveryRiskCarryOverToSceneCards,
})

bindSceneCardDeliveryRiskDeps({
  explicitNewConceptNames,
})

bindCraftTensionContractDeps({
  nextBatchBriefFromContext,
  normalizeSuspenseExpectationChainContract,
})

bindCoreHandoffSyncReportDeps({
  buildReaderExpectationLedger,
  contextWithChapterRawPreDraftForSync,
  normalizeBatchChapterHandoffContract,
  normalizeCoreContractPeriodicDriftCheck,
  normalizeCoreContractRadar,
})

bindAudienceQualityContractDeps({
  storylineUsageByAnyType,
})

bindContinuityDialogueContractDeps({
  normalizeLongformMemoryCapsule,
})

bindOutlineBlueprintContractDeps({
  buildChapterBlueprintCausalChainContract,
  inferBlueprintFunctionTag,
  storylineUsageByType,
})

bindQualitySyncReportDeps({
  buildChapterBenchmarkStrategy,
  buildStyleSampleStrategy,
  styleBoundaryExplicitContract,
})

bindPreDraftBriefDeps({
  buildCharacterArcBriefFromContext,
  mergedContextChapterTargetPreferRuntime,
})

bindStateTrackingContractDeps({
  mergedContextChapterTarget,
  contextWithChapterRawPreDraftForSync,
  listNovelChapters,
  mergeNovelChapterRawPayload,
})
