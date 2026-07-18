import {
  normalizeChapterPositioningBrief,
} from '../../novel-writing/chapter-positioning-brief'
import {
  normalizeGoldenThreeBrief,
} from '../../novel-writing/golden-three-brief'
import {
  normalizeInnovationBrief,
} from '../../novel-writing/innovation-basics'
import {
  longformCompassFromContext,
  normalizeLongformCompass,
} from '../../novel-writing/longform-compass'
import {
  buildAssetLinkagePromptSection,
  buildBenchmarkRecallPromptSection,
  buildBenchmarkRecallReceiptPromptSection,
  buildBridgeUnitPromptSection,
  buildChapterBlueprintPromptSection,
  buildChapterHookPromptSection,
  buildChapterLaunchGatePromptSection,
  buildCharacterBehaviorPromptSection,
  buildCharacterRelationPromptSection,
  buildConflictStructurePromptSection,
  buildContentRubricPromptSection,
  buildContinuityHeatPromptSection,
  buildCoreContractRadarPromptSection,
  buildDeliveryRiskCarryOverPromptSection,
  buildDialoguePromptSection,
  buildEmotionalArcPromptSection,
  buildExpectationThresholdPromptSection,
  buildFemaleAudiencePromptSection,
  buildGenrePositioningPromptSection,
  buildGovernanceRecheckPromptSection,
  buildInformationFlowPromptSection,
  buildIntentConfirmationPromptSection,
  buildIntentConfirmationReceiptPromptSection,
  buildLongformBattleContextPromptSection,
  buildLongformCompassPromptSection,
  buildOpeningPromptSection,
  buildParagraphHookPromptSection,
  buildPlatformRubricPromptSection,
  buildPlotDynamicsPromptSection,
  buildPlotFrameworkPromptSection,
  buildPlotSpecialTopicsPromptSection,
  buildProseCraftPromptSection,
  buildPunctuationTonePromptSection,
  buildQualityAuditPromptSection,
  buildReversalPromptSection,
  buildShowdownPromptSection,
  buildStateTrackingPromptSection,
  buildStateTrackingReceiptPromptSection,
  buildStoryLoopPromptSection,
  buildStoryPowerPromptSection,
  buildStyleBoundaryPromptSection,
  buildSuspensePromptSection,
  buildTargetReaderPromptSection,
  buildTitleUniquenessPromptSection,
  buildUpgradeRhythmPromptSection,
  buildWritePreparationPromptSection,
} from '../../novel-writing/prose-generation-prompt-sections'
import {
  buildBoundedProsePrompt,
  buildOhStoryDirectorPromptBlock,
  buildProsePromptContextSnapshot,
  compactProseSceneCard,
  prosePromptJson,
  prosePromptText,
} from '../../novel-writing/prose-prompt-context'
import {
  buildReaderRetentionBrief,
  first30RetentionBriefFromContext,
  normalizeReaderDropRiskBrief,
} from '../../novel-writing/reader-retention-brief'
import {
  normalizeRecentFatigueBrief,
} from '../../novel-writing/rolling-rhythm-preflight'
import {
  sceneBriefFromCard,
} from '../../novel-writing/scene-briefs'
import {
  normalizePageTurnHookBrief,
  normalizeSerialRhythmBrief,
} from '../../novel-writing/serial-rhythm-brief'
import {
  normalizeSignatureSceneBrief,
} from '../../novel-writing/signature-scene-basics'
import {
  normalizeStoryDriveBrief,
} from '../../novel-writing/story-drive-brief'
import {
  normalizeStoryPressureBrief,
} from '../../novel-writing/story-pressure-brief'
import {
  buildStyleFingerprintPromptHandoff,
} from '../../novel-writing/style-fingerprint'
import {
  normalizeVolumeClimaxBrief,
} from '../../novel-writing/volume-climax-brief'
import {
  asArray,
} from '../../routes/novel-route-utils'
import {
  applyReaderExpectationDebtAging,
  normalizeReaderExpectationDebtContext,
} from '../batch-serial/serial-momentum'
import {
  buildPreviousChapterHandoff,
  normalizeBatchChapterHandoffContract,
  normalizeGovernanceRecheckMemoryContext,
} from '../post-delivery/chapter-handoff-contracts'
import {
  normalizeDeliveryRiskCarryOverContext,
} from '../post-delivery/delivery-risk-core'
import {
  characterArcBriefFromContext,
  millionWordRunwayFromContext,
  plotSpecialTopicsContractForSync,
  storyUnitContextFromContext,
} from '../post-delivery/quality-sync-reports'
import {
  normalizeSceneCardsPayload,
} from '../post-delivery/scene-cards'
import {
  buildConflictStructureContract,
  buildExpectationThresholdContract,
  buildFemaleAudienceContract,
  buildGenrePositioningContract,
  buildInformationFlowContract,
  buildQualityAuditContract,
  buildStoryLoopContract,
  buildTargetReaderContract,
  buildUpgradeRhythmContract,
} from '../quality/audience-quality-contracts'
import {
  assetText,
  buildAssetLinkageContract,
  buildCharacterBehaviorContract,
  buildCharacterRelationContract,
} from '../quality/character-asset-contracts'
import {
  buildContinuityHeatContract,
  buildDialogueContract,
  buildPlotDynamicsContract,
  buildStoryPowerContract,
} from '../quality/continuity-dialogue-contracts'
import {
  buildCoreContractRadar,
  chapterLaunchGateFromContext,
} from '../quality/core-contract-radar'
import {
  buildBridgeUnitContract,
  buildChapterHookContract,
  buildEmotionalArcContract,
  buildParagraphHookContract,
  buildReversalContract,
  buildShowdownContract,
  buildSuspenseContract,
} from '../quality/craft-tension-contracts'
import {
  benchmarkRecallGapsFromContext,
  benchmarkRecallIsNoBenchmark,
  buildBenchmarkRecallBrief,
  buildIntentConfirmationContract,
} from '../quality/intent-benchmark-contracts'
import {
  chapterNosBrief,
  longformBattleContextFromContext,
  nextBatchBriefFromContext,
  normalizeDailyContextSnapshot,
  normalizeDailyProgressSummary,
  normalizeForeshadowingConsistencyRadar,
  normalizeLayeredMemoryContext,
  normalizeLongformBattleContext,
  normalizeLongformMemoryCapsule,
  normalizeNextBatchBrief,
} from '../quality/memory-longform-contracts'
import {
  OH_STORY_BEAT_DENSITY_RULE,
} from '../quality/outline-blueprint-contracts'
import {
  mergedContextChapterTargetPreferRuntime,
} from '../quality/paragraph-prose-context'
import {
  buildContentRubric,
  buildPlatformRubric,
} from '../quality/platform-content-rubrics'
import {
  buildOpeningContract,
  buildPlotFrameworkContract,
  buildProseCraftContract,
  buildPunctuationToneContract,
} from '../quality/plot-opening-prose-contracts'
import {
  buildStateTrackingContract,
} from '../quality/state-tracking-contracts'
import {
  buildChapterBenchmarkStrategy,
  buildStyleBoundaryContract,
  buildStyleSampleStrategy,
} from '../quality/style-sample-strategy'
import {
  compactBriefText,
  uniqueBriefStrings,
} from '../quality/text-utils'
import {
  buildWritePreparationBrief,
} from '../quality/write-preparation-contracts'

import { prepareParagraphProseContext } from './paragraph-prose-context-prepare'
import { buildParagraphProsePromptSections } from './paragraph-prose-context-sections'

export function buildParagraphProseContext(project: any, contextPackage: any, migrationPlan: any = null, chapterDraft: any = null) {
  const ctx = prepareParagraphProseContext(project, contextPackage, migrationPlan, chapterDraft)
  return buildParagraphProsePromptSections(ctx)
}
export { prepareParagraphProseContext } from './paragraph-prose-context-prepare'
export { buildParagraphProsePromptSections } from './paragraph-prose-context-sections'
