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
import { materializeStoryRelations } from '../../routes/novel-setting-story-relations'
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
  applyStoryStateMachineSyncPhaseA,
} from './story-state-machine-update-phase-a'
import {
  applyStoryStateMachineSyncPhaseB,
} from './story-state-machine-update-phase-b'

export async function updateStoryStateMachine(
  activeWorkspace: string,
  project: any,
  chapter: any,
  contextPackage: any,
  chapterText: string,
  modelId: number | undefined = undefined,
  options: any = {},
  deps: {
    prepareStoryStateUpdate: (
      activeWorkspace: string,
      project: any,
      chapter: any,
      contextPackage: any,
      chapterText: string,
      modelId?: number,
      options?: any,
    ) => Promise<PreparedStoryStateUpdate>
    refreshFollowingChapterSerialStoryStateReadiness: (...args: any[]) => any
  },
) {
  const prepareStoryStateUpdate = deps.prepareStoryStateUpdate
  const refreshFollowingChapterSerialStoryStateReadiness = deps.refreshFollowingChapterSerialStoryStateReadiness

  const prepared: PreparedStoryStateUpdate = options.prepared || await prepareStoryStateUpdate(activeWorkspace, project, chapter, contextPackage, chapterText, modelId, {
    ...options,
    allowDeterministicFallback: options.allowDeterministicFallback !== false,
    retryOnBlockedTransport: options.retryOnBlockedTransport !== false,
  })
  const blockingFailures = blockingPreparedStoryStateHardFailures(prepared.hard_failures)
  if (blockingFailures.length) {
    const summary = formatPreparedStoryStateFailureSummary(blockingFailures) || '故事状态准备阶段未通过'
    throw Object.assign(new Error(summary), {
      code: 'STORY_STATE_PREPARE_BLOCKED',
      hard_failures: prepared.hard_failures,
      blocking_hard_failures: blockingFailures,
    })
  }
  const payload = prepared.payload
  const stateDelta = prepared.state_delta
  const nextReferenceConfig = prepared.next_reference_config
  if (prepared.hard_failures.length) {
    payload.soft_hard_failures = prepared.hard_failures
    payload.story_state_applied_with_warnings = true
  }
  await updateNovelProject(activeWorkspace, project.id, { reference_config: nextReferenceConfig } as any)
  try {
    const storyState = nextReferenceConfig?.story_state || {}
    if (storyState && (storyState.character_relationships || storyState.characterRelationships)) {
      const materialized = await materializeStoryRelations(activeWorkspace, project.id, { storyState })
      payload.story_relation_materialize = {
        created: materialized.summary.created,
        updated: materialized.summary.updated,
        character_patches: materialized.summary.character_patches,
        total: materialized.summary.total,
      }
    }
  } catch (error: any) {
    payload.story_relation_materialize_error = String(error?.message || error || 'materialize failed')
  }
  payload.style_fingerprint = stateDelta.style_fingerprint
  payload.style_fingerprint_contract = stateDelta.style_fingerprint_contract
  await applyStoryStateMachineSyncPhaseA({
    activeWorkspace,
    project,
    chapter,
    contextPackage,
    chapterText,
    prepared,
    payload,
    stateDelta,
  })
  await applyStoryStateMachineSyncPhaseB({
    activeWorkspace,
    project,
    chapter,
    contextPackage,
    chapterText,
    payload,
  })
  try {
    const chapterId = Number(chapter?.id || 0)
    if (chapterId) {
      const existingAdmission = (chapter?.raw_payload && typeof chapter.raw_payload === 'object' ? chapter.raw_payload.prose_admission : null)
        || (chapter?.raw_payload && typeof chapter.raw_payload === 'object' ? chapter.raw_payload.proseAdmission : null)
        || {}
      const nextAdmission = {
        ...(existingAdmission && typeof existingAdmission === 'object' ? existingAdmission : {}),
        story_state_status: 'synced',
        story_state_warning: prepared.hard_failures.length
          ? { hard_failures: prepared.hard_failures, soft: true }
          : null,
      }
      await mergeNovelChapterRawPayload(activeWorkspace, chapterId, {
        prose_admission: nextAdmission,
        proseAdmission: nextAdmission,
      })
    }
  } catch {
    // manual sync still succeeds even if chapter admission flag cannot be patched
  }
  try {
    await refreshFollowingChapterSerialStoryStateReadiness(
      activeWorkspace,
      project.id,
      Number(chapter?.chapter_no || 0),
      Number(chapter?.chapter_no || 0),
    )
  } catch {
    // cache refresh is best-effort; live preflight reconcile is the source of truth
  }
  return payload
}

