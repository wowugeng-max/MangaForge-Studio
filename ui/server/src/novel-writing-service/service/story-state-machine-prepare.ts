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
  autoRecordMissedChapterHandoff,
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
import type { PreparedStoryStateUpdate } from '../../novel-writing/prepared-story-state'
import {
  executeChapterStage,
  type ChapterTaskExecution,
} from '../generation-source/types'


export type PrepareStoryStateUpdateOptions = {
  chapterTaskExecution?: ChapterTaskExecution
  signal?: AbortSignal
  abortSignal?: AbortSignal
  timeoutMs?: number
  llmTimeoutMs?: number
  maxRetries?: number
  maxTokens?: number
  max_tokens?: number
  retryOnBlockedTransport?: boolean
  allowDeterministicFallback?: boolean
}

export async function prepareStoryStateUpdate(
  activeWorkspace: string,
  project: any,
  chapter: any,
  contextPackage: any,
  chapterText: string,
  modelId: number | undefined = undefined,
  options: PrepareStoryStateUpdateOptions = {},
  deps: {
    executeAgent: (...args: any[]) => any
    getStageModelId: (...args: any[]) => any
    getStageTemperature: (...args: any[]) => any
  },
): Promise<PreparedStoryStateUpdate> {
  const executeAgent = deps.executeAgent
  const getStageModelId = deps.getStageModelId
  const getStageTemperature = deps.getStageTemperature

  const stageModelId = options.chapterTaskExecution ? undefined : getStageModelId(project, 'review', modelId)
  const buildFromAgentResult = async (result: any): Promise<PreparedStoryStateUpdate> => {
    const rawPayload = getNovelPayload(result)
    const payload = rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload)
      ? { ...rawPayload }
      : rawPayload
    const diagnostics = buildLLMResultDiagnostics(result)
    const rawStateDelta = payload?.state_delta || payload?.stateDelta || {}
    const establishedEventsIncoming = asArray(
      payload?.established_events
      || payload?.establishedEvents
      || rawStateDelta?.established_events
      || rawStateDelta?.establishedEvents,
    )
    const stateDelta = normalizeStoryStateDeltaForStorage({
      ...(rawStateDelta || {}),
      established_events: establishedEventsIncoming.length
        ? establishedEventsIncoming
        : asArray(rawStateDelta?.established_events || rawStateDelta?.establishedEvents),
    })
    const styleFingerprintSnapshot = buildStyleFingerprintStateSnapshot(contextPackage, project, project.reference_config?.story_state || {})
    const stateDeltaWithStyle = styleFingerprintSnapshot
      ? { ...stateDelta, ...styleFingerprintSnapshot }
      : stateDelta
    // Planned handoff hooks are verbatim quotes vs paraphrased state records; close the gap deterministically.
    const handoffAutoRecord = autoRecordMissedChapterHandoff(
      chapter,
      contextPackage,
      stateDeltaWithStyle,
      buildChapterHandoffDeltaSyncReport(chapter, contextPackage, stateDeltaWithStyle),
    )
    const stateDeltaWithStyleFingerprint = handoffAutoRecord.stateDelta
    const nextReferenceConfig = {
      ...(project.reference_config || {}),
      story_state: mergeStoryState(project.reference_config?.story_state || {}, stateDeltaWithStyleFingerprint, chapter),
    }
    const characterUpdates = asArray(payload?.character_updates || payload?.characterUpdates)
    const settingUpdates = asArray(payload?.setting_updates || payload?.settingUpdates)
    const storylineUpdates = asArray(payload?.storyline_updates || payload?.storylineUpdates)
    const [assetCharacters, assetSettings] = await Promise.all([
      listNovelCharacters(activeWorkspace, project.id),
      listNovelSettingEntities(activeWorkspace, project.id),
    ])
    const discoveredAssets = normalizeDiscoveredAssets(asArray(payload?.discovered_assets || payload?.discoveredAssets), {
      existingCharacters: assetCharacters,
      existingSettings: assetSettings,
      chapter,
    })
    const syncReports = {
      character_state_delta_sync: buildCharacterStateDeltaSyncReport(chapter, contextPackage, stateDeltaWithStyleFingerprint, characterUpdates),
      asset_state_delta_sync: buildAssetStateDeltaSyncReport(chapter, contextPackage, stateDeltaWithStyleFingerprint, settingUpdates, discoveredAssets),
      chapter_handoff_delta_sync: handoffAutoRecord.report,
      timeline_delta_sync: buildTimelineDeltaSyncReport(chapter, contextPackage, stateDeltaWithStyleFingerprint, settingUpdates),
      state_delta_completeness: buildStateDeltaCompletenessReport(chapter, chapterText, stateDeltaWithStyleFingerprint, {
        settingUpdates,
        characterUpdates,
        storylineUpdates,
        discoveredAssets,
        foreshadowingStatus: payload?.foreshadowing_status || payload?.foreshadowingStatus || {},
      }),
    }
    payload.style_fingerprint = stateDeltaWithStyleFingerprint.style_fingerprint
    payload.style_fingerprint_contract = stateDeltaWithStyleFingerprint.style_fingerprint_contract
    Object.assign(payload, syncReports)
    const finishReason = rejectedProseTransportFinishReason(result)
      || String(diagnostics.finish_reason || '').toLowerCase()
    const validStateFields = [
      'current_time', 'currentTime', 'character_positions', 'characterPositions', 'character_relationships', 'characterRelationships',
      'relationship_graph', 'relationshipGraph', 'known_secrets', 'knownSecrets', 'secret_visibility', 'secretVisibility',
      'item_ownership', 'itemOwnership', 'resource_status', 'resourceStatus', 'foreshadowing_status', 'foreshadowingStatus',
      'payoff_queue', 'payoffQueue', 'active_locations', 'activeLocations', 'open_questions', 'openQuestions',
      'next_chapter_priorities', 'nextChapterPriorities', 'timeline', 'progress_summary', 'progressSummary',
    ]
    const payloadDiagnostics = {
      invalid_payload: !payload || typeof payload !== 'object' || Array.isArray(payload)
        || !rawStateDelta || typeof rawStateDelta !== 'object' || Array.isArray(rawStateDelta)
        || !validStateFields.some(key => Object.prototype.hasOwnProperty.call(rawStateDelta, key)),
      transport_incomplete: Boolean(finishReason)
        && ['length', 'incomplete', 'max_tokens', 'content_filter', 'tool', 'tool_calls'].some(reason => String(finishReason).includes(reason))
        || hasProseTransportIncompleteDetails(result),
    }
    return {
      state_delta: stateDeltaWithStyleFingerprint,
      next_reference_config: nextReferenceConfig,
      character_updates: characterUpdates,
      setting_updates: settingUpdates,
      storyline_updates: storylineUpdates,
      sync_reports: syncReports,
      hard_failures: buildPreparedStoryStateHardFailures(syncReports, payloadDiagnostics),
      payload,
    }
  }

  const runAgentOnce = async (maxTokens: number) => {
    throwIfAborted(options)
    let preparedBeforeReceipt: PreparedStoryStateUpdate | undefined
    const result = await executeChapterStage({
      execution: options.chapterTaskExecution,
      fallback: executeAgent,
      stage: 'story_state_sync',
      responseContract: 'story_state_json',
      agentId: 'review-agent',
      project,
      context: {
        task: buildStoryStatePromptFromBuilder(project, contextPackage, chapterText),
      },
      options: {
        activeWorkspace,
        modelId: stageModelId ? String(stageModelId) : undefined,
        maxTokens,
        temperature: getStageTemperature(project, 'review', 0.15),
        skipMemory: true,
        signal: options.signal ?? options.abortSignal,
        timeoutMs: options.timeoutMs ?? options.llmTimeoutMs,
        maxRetries: options.maxRetries,
      },
      beforeReceipt: async result => {
        preparedBeforeReceipt = await buildFromAgentResult(result)
      },
    })
    return preparedBeforeReceipt || buildFromAgentResult(result)
  }

  const primaryMaxTokens = Number(options.maxTokens || options.max_tokens || 4500) || 4500
  let prepared = await runAgentOnce(primaryMaxTokens)
  const hasTransportBlock = (item: PreparedStoryStateUpdate) => item.hard_failures.some((failure: any) => (
    failure?.key === 'story_state_invalid_payload' || failure?.key === 'story_state_transport_incomplete'
  ))
  const shouldRetry = options.retryOnBlockedTransport === true && hasTransportBlock(prepared)
  if (shouldRetry) {
    const retryMaxTokens = Math.max(primaryMaxTokens + 1500, 6000)
    prepared = await runAgentOnce(retryMaxTokens)
    prepared.payload = {
      ...(prepared.payload || {}),
      story_state_prepare_retry: true,
      story_state_prepare_retry_max_tokens: retryMaxTokens,
    }
  }
  // Manual/cockpit sync can fall back to a minimal handoff delta so last_updated_chapter still advances.
  if (options.allowDeterministicFallback === true && hasTransportBlock(prepared)) {
    const endingHook = String(chapter?.ending_hook || chapter?.endingHook || '').trim()
    const summary = String(chapter?.chapter_summary || chapter?.chapterSummary || chapter?.chapter_goal || chapter?.chapterGoal || chapter?.title || '').trim()
    const deterministicDelta = {
      open_questions: endingHook ? [endingHook] : [],
      next_chapter_priorities: [endingHook, summary].filter(Boolean),
      progress_summary: {
        last_completed_chapter: Number(chapter?.chapter_no || 0) || null,
        notes: summary || endingHook || `第${chapter?.chapter_no || '?'}章正文已写，状态机使用确定性回退更新。`,
      },
    }
    const styleFingerprintSnapshot = buildStyleFingerprintStateSnapshot(contextPackage, project, project.reference_config?.story_state || {})
    const stateDeltaWithStyle = styleFingerprintSnapshot
      ? { ...normalizeStoryStateDeltaForStorage(deterministicDelta), ...styleFingerprintSnapshot }
      : normalizeStoryStateDeltaForStorage(deterministicDelta)
    const handoffAutoRecord = autoRecordMissedChapterHandoff(
      chapter,
      contextPackage,
      stateDeltaWithStyle,
      buildChapterHandoffDeltaSyncReport(chapter, contextPackage, stateDeltaWithStyle),
    )
    const stateDeltaWithStyleFingerprint = handoffAutoRecord.stateDelta
    const nextReferenceConfig = {
      ...(project.reference_config || {}),
      story_state: mergeStoryState(project.reference_config?.story_state || {}, stateDeltaWithStyleFingerprint, chapter),
    }
    const syncReports = {
      character_state_delta_sync: buildCharacterStateDeltaSyncReport(chapter, contextPackage, stateDeltaWithStyleFingerprint, []),
      asset_state_delta_sync: buildAssetStateDeltaSyncReport(chapter, contextPackage, stateDeltaWithStyleFingerprint, [], []),
      chapter_handoff_delta_sync: handoffAutoRecord.report,
      timeline_delta_sync: buildTimelineDeltaSyncReport(chapter, contextPackage, stateDeltaWithStyleFingerprint, []),
      state_delta_completeness: buildStateDeltaCompletenessReport(chapter, chapterText, stateDeltaWithStyleFingerprint, {
        settingUpdates: [],
        characterUpdates: [],
        storylineUpdates: [],
        discoveredAssets: [],
        foreshadowingStatus: {},
      }),
    }
    const softFailures = buildPreparedStoryStateHardFailures(syncReports, { invalid_payload: false, transport_incomplete: false })
    prepared = {
      state_delta: stateDeltaWithStyleFingerprint,
      next_reference_config: nextReferenceConfig,
      character_updates: [],
      setting_updates: [],
      storyline_updates: [],
      sync_reports: syncReports,
      hard_failures: softFailures,
      payload: {
        ...(prepared.payload || {}),
        state_delta: stateDeltaWithStyleFingerprint,
        ...syncReports,
        story_state_deterministic_fallback: true,
        story_state_prepare_retry: Boolean(prepared.payload?.story_state_prepare_retry),
        previous_hard_failures: prepared.hard_failures,
      },
    }
  }
  return prepared
}
