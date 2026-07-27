import {
  createNovelReview,
  listNovelChapterSettingUsage,
  listNovelChapters,
  listNovelCharacters,
  listNovelSettingEntities,
  mergeNovelChapterRawPayload,
  updateNovelChapterSettingUsage,
  updateNovelCharacter,
  updateNovelProject,
  updateNovelSettingEntity,
} from '../../novel'
import {
  buildAssetIntakeReviewRecord,
  buildIpSceneIntakeReviewRecord,
  buildPostDeliverySyncReviewRecord,
  buildStoryStateReviewRecord,
  buildStorylineSyncReviewRecord,
} from '../../novel-writing/post-delivery-sync-review-record'
import {
  blockingPreparedStoryStateHardFailures,
  buildPreparedStoryStateHardFailures,
  formatPreparedStoryStateFailureSummary,
} from '../../novel-writing/prepared-story-state'
import {
  buildProseMetaSyncReport,
} from '../../novel-writing/prose-meta'
import {
  buildPayoffSetupSyncReport,
  buildSpectatorReactionSyncReport,
} from '../../novel-writing/public-payoff-scans'
import {
  buildStoryStatePrompt as buildStoryStatePromptFromBuilder,
} from '../../novel-writing/story-state-prompt'
import {
  buildStyleFingerprintStateSnapshot,
} from '../../novel-writing/style-fingerprint'
import {
  buildChapterTitleUniquenessSyncReport,
} from '../../novel-writing/title-uniqueness'
import {
  hasProseTransportIncompleteDetails,
  rejectedProseTransportFinishReason,
} from '../quality/prose-transport-admission'
import {
  asArray,
  buildLLMResultDiagnostics,
  getNovelPayload,
} from '../../routes/novel-route-utils'
import {
  normalizeDiscoveredAssets,
  normalizeIpSceneCandidates,
} from '../post-delivery/asset-banks'
import {
  buildChapterCoreDriftReport,
  buildChapterHandoffSyncReport,
  buildCoreContractSyncReport,
  buildReaderExpectationSyncReport,
  buildReaderPayoffSyncReport,
} from '../post-delivery/core-handoff-sync-reports'
import {
  buildAssetStateDeltaSyncReport,
  buildChapterHandoffDeltaSyncReport,
  buildCharacterStateDeltaSyncReport,
  buildForeshadowingDeltaSyncReport,
  buildRelationshipDeltaSyncReport,
  buildStateDeltaCompletenessReport,
  buildStorylineSyncReport,
  buildTimelineDeltaSyncReport,
} from '../post-delivery/delta-sync-reports'
import {
  buildAssetLinkageSyncReport,
  buildBeatCoolingSyncReport,
  buildBenchmarkRecallSyncReport,
  buildBridgeUnitSyncReport,
  buildChapterAttractionReviewReport,
  buildChapterBenchmarkSyncReport,
  buildChapterBlueprintSyncReport,
  buildChapterHookSyncReport,
  buildCharacterArcSyncReport,
  buildCharacterBehaviorSyncReport,
  buildConflictStructureSyncReport,
  buildContinuityHeatSyncReport,
  buildDialogueSyncReport,
  buildEmotionalArcSyncReport,
  buildExpectationThresholdSyncReport,
  buildFemaleAudienceSyncReport,
  buildGenrePositioningSyncReport,
  buildInformationFlowSyncReport,
  buildInnovationSyncReport,
  buildIntentConfirmationSyncReport,
  buildOpeningSyncReport,
  buildParagraphHookSyncReport,
  buildPlotDynamicsSyncReport,
  buildProseCraftSyncReport,
  buildPunctuationToneSyncReport,
  buildQualityAuditSyncReport,
  buildReaderRetentionSyncReport,
  buildReversalSyncReport,
  buildRunwaySyncReport,
  buildShowdownSyncReport,
  buildSignatureSceneSyncReport,
  buildStateTrackingSyncReport,
  buildStoryDriveSyncReport,
  buildStoryLoopSyncReport,
  buildStoryPowerSyncReport,
  buildStoryUnitSyncReport,
  buildStyleBoundarySyncReport,
  buildStyleSampleSyncReport,
  buildSuspenseSyncReport,
  buildTargetReaderSyncReport,
  buildUpgradeRhythmSyncReport,
  buildVolumeBeatSyncReport,
} from '../post-delivery/quality-sync-reports'
import {
  buildCharacterRelationSyncReport,
} from '../quality/character-asset-contracts'
import {
  buildSourceReadinessSyncReport,
} from '../quality/state-tracking-contracts'
import {
  throwIfAborted,
} from './runtime-helpers'
import {
  mergeStoryState,
  normalizeStoryStateDeltaForStorage,
} from './story-state-helpers'


import {
  prepareStoryStateUpdate as prepareStoryStateUpdateImpl,
  type PrepareStoryStateUpdateOptions,
} from './story-state-machine-prepare'
import {
  updateStoryStateMachine as updateStoryStateMachineImpl,
  type StoryStateMachineUpdateOptions,
} from './story-state-machine-update'

export function createStoryStateMachineMethods(deps: {
  executeAgent: (...args: any[]) => any
  getStageModelId: (...args: any[]) => any
  getStageTemperature: (...args: any[]) => any
  refreshFollowingChapterSerialStoryStateReadiness: (...args: any[]) => any
}) {
  const executeAgent = deps.executeAgent
  const getStageModelId = deps.getStageModelId
  const getStageTemperature = deps.getStageTemperature
  const refreshFollowingChapterSerialStoryStateReadiness = deps.refreshFollowingChapterSerialStoryStateReadiness

  const buildStoryStatePrompt = (project: any, contextPackage: any, chapterText: string) => {
    return buildStoryStatePromptFromBuilder(project, contextPackage, chapterText)
  }

  const prepareStoryStateUpdate = (
    activeWorkspace: string,
    project: any,
    chapter: any,
    contextPackage: any,
    chapterText: string,
    modelId?: number,
    options: PrepareStoryStateUpdateOptions = {},
  ) => prepareStoryStateUpdateImpl(
    activeWorkspace,
    project,
    chapter,
    contextPackage,
    chapterText,
    modelId,
    options,
    { executeAgent, getStageModelId, getStageTemperature },
  )

  const updateStoryStateMachine = (
    activeWorkspace: string,
    project: any,
    chapter: any,
    contextPackage: any,
    chapterText: string,
    modelId?: number,
    options: StoryStateMachineUpdateOptions = {},
  ) => updateStoryStateMachineImpl(
    activeWorkspace,
    project,
    chapter,
    contextPackage,
    chapterText,
    modelId,
    options,
    {
      prepareStoryStateUpdate,
      refreshFollowingChapterSerialStoryStateReadiness,
    },
  )

  return {
    buildStoryStatePrompt,
    prepareStoryStateUpdate,
    updateStoryStateMachine,
  }
}
