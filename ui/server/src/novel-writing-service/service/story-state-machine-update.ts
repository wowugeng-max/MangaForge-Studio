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
  payload.style_fingerprint = stateDelta.style_fingerprint
  payload.style_fingerprint_contract = stateDelta.style_fingerprint_contract
  const chapters = await listNovelChapters(activeWorkspace, project.id)
  const chapterTitleUniquenessSync = buildChapterTitleUniquenessSyncReport(chapters, chapter)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterTitleUniquenessSync, reviewType: 'chapter_title_uniqueness_sync', payloadKey: 'chapter_title_uniqueness_sync', formatIssue: (item: any) => `标题重复：第${item.chapter_no || '-'}章《${item.title || ''}》` }))
  payload.chapter_title_uniqueness_sync = chapterTitleUniquenessSync
  const characterUpdates = prepared.character_updates
  if (characterUpdates.length > 0) {
    const characters = await listNovelCharacters(activeWorkspace, project.id)
    for (const update of characterUpdates) {
      const name = String(update?.name || '').trim()
      if (!name) continue
      const character = characters.find(item => item.name === name)
      if (!character) continue
      const currentState = update.current_state || update.currentState || {}
      await updateNovelCharacter(activeWorkspace, character.id, {
        current_state: {
          ...(character.current_state || {}),
          ...(currentState || {}),
          last_seen_chapter: chapter.chapter_no,
        },
      } as any)
    }
  }
  const characterStateDeltaSync = buildCharacterStateDeltaSyncReport(chapter, contextPackage, stateDelta, characterUpdates)
  if (Number(characterStateDeltaSync.planned_count || 0) > 0 || Number(characterStateDeltaSync.recorded_count || 0) > 0) {
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterStateDeltaSync, reviewType: 'character_state_delta_sync', payloadKey: 'character_state_delta_sync', formatIssue: (item: any) => `角色状态缺口：${item.name}｜${item.text}` }))
  }
  payload.character_state_delta_sync = characterStateDeltaSync
  const settingUpdates = prepared.setting_updates
  if (settingUpdates.length > 0) {
    const settings = await listNovelSettingEntities(activeWorkspace, project.id)
    const usages = await listNovelChapterSettingUsage(activeWorkspace, project.id, chapter.id)
    for (const update of settingUpdates) {
      const entityId = Number(update?.entity_id || update?.entityId || 0)
      const name = String(update?.name || '').trim()
      const entityType = update?.entity_type || update?.entityType
      const entity = settings.find(item => (entityId && item.id === entityId) || (!!name && item.name === name && (!entityType || item.entity_type === entityType)))
      if (!entity) continue
      const stateDelta = update.state_delta || update.stateDelta || update.actual_state_change || update.actualStateChange || {}
      const actualStateChange = update.actual_state_change || update.actualStateChange || stateDelta || {}
      await updateNovelSettingEntity(activeWorkspace, entity.id, {
        state_json: {
          ...(entity.state_json || {}),
          ...(stateDelta || {}),
          last_seen_chapter: chapter.chapter_no,
        },
      } as any)
      const usage = usages.find(item => item.entity_id === entity.id)
      if (usage) {
        await updateNovelChapterSettingUsage(activeWorkspace, usage.id, {
          actual_state_change: {
            ...(usage.actual_state_change || {}),
            ...(actualStateChange || {}),
          },
        } as any)
      }
    }
  }
  const timelineDeltaSync = buildTimelineDeltaSyncReport(chapter, contextPackage, stateDelta, settingUpdates)
  if (Number(timelineDeltaSync.planned_count || 0) > 0 || Number(timelineDeltaSync.recorded_count || 0) > 0) {
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: timelineDeltaSync, reviewType: 'timeline_delta_sync', payloadKey: 'timeline_delta_sync', formatIssue: (item: any) => `时间线缺口：${item.label}｜${item.text}` }))
  }
  payload.timeline_delta_sync = timelineDeltaSync
  const chapterHandoffDeltaSync = buildChapterHandoffDeltaSyncReport(chapter, contextPackage, stateDelta)
  if (Number(chapterHandoffDeltaSync.planned_count || 0) > 0 || Number(chapterHandoffDeltaSync.recorded_count || 0) > 0) {
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterHandoffDeltaSync, reviewType: 'chapter_handoff_delta_sync', payloadKey: 'chapter_handoff_delta_sync', formatIssue: (item: any) => `章末交接缺口：${item.label}｜${item.text}` }))
  }
  payload.chapter_handoff_delta_sync = chapterHandoffDeltaSync
  const chapterHandoffSync = buildChapterHandoffSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterHandoffSync, reviewType: 'chapter_handoff_sync', payloadKey: 'chapter_handoff_sync', issuePrefix: '章首承接缺口' }))
  payload.chapter_handoff_sync = chapterHandoffSync
  const storylineUpdates = prepared.storyline_updates
  const storylineSync = buildStorylineSyncReport(contextPackage, storylineUpdates)
  if (storylineUpdates.length > 0) {
    const settings = await listNovelSettingEntities(activeWorkspace, project.id)
    const usages = await listNovelChapterSettingUsage(activeWorkspace, project.id, chapter.id)
    for (const update of storylineUpdates) {
      const entityId = Number(update?.entity_id || update?.entityId || 0)
      const name = String(update?.name || '').trim()
      const entity = settings.find(item => STORYLINE_TYPES.includes(item.entity_type) && ((entityId && item.id === entityId) || (!!name && item.name === name)))
      if (!entity) continue
      const stateDelta = update.state_delta || update.stateDelta || update.actual_state_change || update.actualStateChange || {}
      const actualStateChange = update.actual_state_change || update.actualStateChange || stateDelta || {}
      if (!stateDelta || typeof stateDelta !== 'object' || Array.isArray(stateDelta)) continue
      await updateNovelSettingEntity(activeWorkspace, entity.id, {
        state_json: {
          ...(entity.state_json || {}),
          ...(stateDelta || {}),
          last_seen_chapter: chapter.chapter_no,
          last_checked_chapter_id: chapter.id,
          last_checked_chapter_no: chapter.chapter_no,
        },
      } as any)
      const usage = usages.find(item => item.entity_id === entity.id)
      if (usage) {
        await updateNovelChapterSettingUsage(activeWorkspace, usage.id, {
          actual_state_change: {
            ...(usage.actual_state_change || {}),
            ...(actualStateChange || {}),
          },
        } as any)
      }
    }
  }
  const [assetCharacters, assetSettings] = await Promise.all([
    listNovelCharacters(activeWorkspace, project.id),
    listNovelSettingEntities(activeWorkspace, project.id),
  ])
  const discoveredAssets = normalizeDiscoveredAssets(
    Array.isArray(payload?.discovered_assets)
      ? payload.discovered_assets
      : Array.isArray(payload?.discoveredAssets)
        ? payload.discoveredAssets
        : [],
    { existingCharacters: assetCharacters, existingSettings: assetSettings, chapter },
  )
  const assetIntakeReview = buildAssetIntakeReviewRecord({ projectId: project.id, chapter, discoveredAssets })
  if (assetIntakeReview) await createNovelReview(activeWorkspace, assetIntakeReview)
  payload.asset_intake = { discovered_assets: discoveredAssets }
  const assetStateDeltaSync = buildAssetStateDeltaSyncReport(chapter, contextPackage, stateDelta, settingUpdates, discoveredAssets)
  if (Number(assetStateDeltaSync.planned_count || 0) > 0 || Number(assetStateDeltaSync.recorded_count || 0) > 0) {
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: assetStateDeltaSync, reviewType: 'asset_state_delta_sync', payloadKey: 'asset_state_delta_sync', formatIssue: (item: any) => `资产状态缺口：${item.name}｜${item.text}` }))
  }
  payload.asset_state_delta_sync = assetStateDeltaSync
  const relationshipDeltaSync = buildRelationshipDeltaSyncReport(chapter, contextPackage, stateDelta, storylineUpdates)
  if (Number(relationshipDeltaSync.planned_count || 0) > 0 || Number(relationshipDeltaSync.recorded_count || 0) > 0) {
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: relationshipDeltaSync, reviewType: 'relationship_delta_sync', payloadKey: 'relationship_delta_sync', formatIssue: (item: any) => `关系增量缺口：${item.name}｜${item.text}` }))
  }
  payload.relationship_delta_sync = relationshipDeltaSync
  const foreshadowingDeltaSync = buildForeshadowingDeltaSyncReport(chapter, contextPackage, storylineUpdates, discoveredAssets, payload?.foreshadowing_status || payload?.foreshadowingStatus || {})
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: foreshadowingDeltaSync, reviewType: 'foreshadowing_delta_sync', payloadKey: 'foreshadowing_delta_sync', formatIssue: (item: any) => `伏笔增量缺口：${item.name}` }))
  payload.foreshadowing_delta_sync = foreshadowingDeltaSync
  const stateDeltaCompleteness = prepared.sync_reports.state_delta_completeness
  if (Number(stateDeltaCompleteness.planned_count || 0) > 0 || Number(stateDeltaCompleteness.missed_count || 0) > 0) {
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: stateDeltaCompleteness, reviewType: 'state_delta_completeness', payloadKey: 'state_delta_completeness', formatIssue: (item: any) => `${item.label}：${item.fix}` }))
  }
  payload.state_delta_completeness = stateDeltaCompleteness
  const ipSceneCandidates = normalizeIpSceneCandidates(
    Array.isArray(payload?.ip_scene_candidates)
      ? payload.ip_scene_candidates
      : Array.isArray(payload?.ipSceneCandidates)
        ? payload.ipSceneCandidates
        : [],
    chapter,
  )
  const ipSceneIntakeReview = buildIpSceneIntakeReviewRecord({ projectId: project.id, chapter, ipSceneCandidates })
  if (ipSceneIntakeReview) await createNovelReview(activeWorkspace, ipSceneIntakeReview)
  payload.ip_scene_intake = { ip_scene_candidates: ipSceneCandidates }
  const signatureSceneSync = buildSignatureSceneSyncReport(project, chapter, contextPackage, chapterText)
  if (Number(signatureSceneSync.planned_count || 0) > 0) {
    await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: signatureSceneSync, reviewType: 'signature_scene_sync', payloadKey: 'signature_scene_sync', formatIssue: (item: any) => `未兑现：${item.label}｜${item.text}` }))
  }
  payload.signature_scene_sync = signatureSceneSync
  await createNovelReview(activeWorkspace, buildStorylineSyncReviewRecord({ projectId: project.id, chapter, storylineSync }))
  payload.storyline_sync = storylineSync
  const storyUnitSync = buildStoryUnitSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({
    projectId: project.id,
    chapter,
    sync: storyUnitSync,
    reviewType: 'story_unit_sync',
    payloadKey: 'story_unit_sync',
    formatIssues: sync => [
      ...sync.missed.map((item: any) => `单元漏写：${item.label}｜${item.text}`),
      ...sync.rushed_ahead.map((item: any) => `单元抢跑：${item.label}｜${item.text}`),
      ...sync.forbidden_touched.map((item: any) => `禁抢跑：${item.label}｜${item.text}`),
    ],
  }))
  payload.story_unit_sync = storyUnitSync
  const coreDrift = buildChapterCoreDriftReport(project, chapter, contextPackage, chapterText, storylineSync)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: coreDrift, reviewType: 'chapter_core_drift', payloadKey: 'core_drift', formatIssues: sync => sync.drift_risks }))
  payload.core_drift = coreDrift
  const coreContractSync = buildCoreContractSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: coreContractSync, reviewType: 'core_contract_sync', payloadKey: 'core_contract_sync', issuePrefix: '核心契约缺口' }))
  payload.core_contract_sync = coreContractSync
  const readerPayoffSync = buildReaderPayoffSyncReport(project, chapter, contextPackage, chapterText, payload)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({
    projectId: project.id,
    chapter,
    sync: readerPayoffSync,
    reviewType: 'reader_payoff_sync',
    payloadKey: 'reader_payoff_sync',
    formatIssues: sync => [
      ...sync.missed.map((item: any) => `未兑现：${item.text}`),
      ...sync.debts.map((item: any) => `待回收：${item.text}`),
    ],
  }))
  payload.reader_payoff_sync = readerPayoffSync
  const readerExpectationSync = buildReaderExpectationSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({
    projectId: project.id,
    chapter,
    sync: readerExpectationSync,
    reviewType: 'reader_expectation_sync',
    payloadKey: 'reader_expectation_sync',
    formatIssue: (item: any) => `未兑现：${item.label}｜${item.text}`,
  }))
  payload.reader_expectation_sync = readerExpectationSync
  const expectationThresholdSync = buildExpectationThresholdSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: expectationThresholdSync, reviewType: 'expectation_threshold_sync', payloadKey: 'expectation_threshold_sync', issuePrefix: '期待阈值缺口' }))
  payload.expectation_threshold_sync = expectationThresholdSync
  const readerRetentionSync = buildReaderRetentionSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: readerRetentionSync, reviewType: 'reader_retention_sync', payloadKey: 'reader_retention_sync', formatIssue: (item: any) => `未兑现：${item.label}｜${item.text}` }))
  payload.reader_retention_sync = readerRetentionSync
  const chapterHookSync = buildChapterHookSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterHookSync, reviewType: 'chapter_hook_sync', payloadKey: 'chapter_hook_sync', issuePrefix: '章级钩子缺口' }))
  payload.chapter_hook_sync = chapterHookSync
  const paragraphHookSync = buildParagraphHookSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: paragraphHookSync, reviewType: 'paragraph_hook_sync', payloadKey: 'paragraph_hook_sync', issuePrefix: '段落钩子缺口' }))
  payload.paragraph_hook_sync = paragraphHookSync
  const suspenseSync = buildSuspenseSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: suspenseSync, reviewType: 'suspense_sync', payloadKey: 'suspense_sync', issuePrefix: '悬念缺口' }))
  payload.suspense_sync = suspenseSync
  const reversalSync = buildReversalSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: reversalSync, reviewType: 'reversal_sync', payloadKey: 'reversal_sync', issuePrefix: '反转缺口' }))
  payload.reversal_sync = reversalSync
  const showdownSync = buildShowdownSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: showdownSync, reviewType: 'showdown_sync', payloadKey: 'showdown_sync', issuePrefix: '高潮缺口' }))
  payload.showdown_sync = showdownSync
  const payoffSetupSync = buildPayoffSetupSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: payoffSetupSync, reviewType: 'payoff_setup_sync', payloadKey: 'payoff_setup_sync', formatIssue: (item: any) => `爽点铺垫缺口：${item.label}｜${item.evidence || item.text || item.expected}` }))
  payload.payoff_setup_sync = payoffSetupSync
  const spectatorReactionSync = buildSpectatorReactionSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: spectatorReactionSync, reviewType: 'spectator_reaction_sync', payloadKey: 'spectator_reaction_sync', formatIssue: (item: any) => `围观反应缺口：${item.label}｜${item.evidence || item.text || item.expected}` }))
  payload.spectator_reaction_sync = spectatorReactionSync
  const bridgeUnitSync = buildBridgeUnitSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: bridgeUnitSync, reviewType: 'bridge_unit_sync', payloadKey: 'bridge_unit_sync', issuePrefix: '桥段缺口' }))
  payload.bridge_unit_sync = bridgeUnitSync
  const beatCoolingSync = buildBeatCoolingSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: beatCoolingSync, reviewType: 'beat_cooling_sync', payloadKey: 'beat_cooling_sync', issuePrefix: '节奏冷却缺口' }))
  payload.beat_cooling_sync = beatCoolingSync
  const openingSync = buildOpeningSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: openingSync, reviewType: 'opening_sync', payloadKey: 'opening_sync', issuePrefix: '开篇缺口' }))
  payload.opening_sync = openingSync
  const proseCraftSync = buildProseCraftSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: proseCraftSync, reviewType: 'prose_craft_sync', payloadKey: 'prose_craft_sync', issuePrefix: '正文工艺缺口' }))
  payload.prose_craft_sync = proseCraftSync
  const punctuationToneSync = buildPunctuationToneSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: punctuationToneSync, reviewType: 'punctuation_tone_sync', payloadKey: 'punctuation_tone_sync', issuePrefix: '语气标点缺口' }))
  payload.punctuation_tone_sync = punctuationToneSync
  const qualityAuditSync = buildQualityAuditSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: qualityAuditSync, reviewType: 'quality_audit_sync', payloadKey: 'quality_audit_sync', issuePrefix: '质量诊断缺口' }))
  payload.quality_audit_sync = qualityAuditSync
  const proseMetaSync = buildProseMetaSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({
    projectId: project.id,
    chapter,
    sync: proseMetaSync,
    reviewType: 'prose_meta_sync',
    payloadKey: 'prose_meta_sync',
    formatIssue: (item: any) => `正文元信息缺口：${item.term || item.label}｜${item.evidence || item.text || item.expected}`,
  }))
  payload.prose_meta_sync = proseMetaSync
  const dialogueSync = buildDialogueSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: dialogueSync, reviewType: 'dialogue_sync', payloadKey: 'dialogue_sync', issuePrefix: '对白缺口' }))
  payload.dialogue_sync = dialogueSync
  const characterBehaviorSync = buildCharacterBehaviorSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterBehaviorSync, reviewType: 'character_behavior_sync', payloadKey: 'character_behavior_sync', issuePrefix: '角色行为缺口' }))
  payload.character_behavior_sync = characterBehaviorSync
  const assetLinkageSync = buildAssetLinkageSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: assetLinkageSync, reviewType: 'asset_linkage_sync', payloadKey: 'asset_linkage_sync', issuePrefix: '资产挂钩缺口' }))
  payload.asset_linkage_sync = assetLinkageSync
  const stateTrackingSync = buildStateTrackingSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: stateTrackingSync, reviewType: 'state_tracking_sync', payloadKey: 'state_tracking_sync', issuePrefix: '状态跟踪缺口' }))
  payload.state_tracking_sync = stateTrackingSync
  const sourceReadinessSync = buildSourceReadinessSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: sourceReadinessSync, reviewType: 'source_readiness_sync', payloadKey: 'source_readiness_sync', issuePrefix: '来源就绪缺口' }))
  payload.source_readiness_sync = sourceReadinessSync
  const intentConfirmationSync = buildIntentConfirmationSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: intentConfirmationSync, reviewType: 'intent_confirmation_sync', payloadKey: 'intent_confirmation_sync', issuePrefix: '意图确认缺口' }))
  payload.intent_confirmation_sync = intentConfirmationSync
  const continuityHeatSync = buildContinuityHeatSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: continuityHeatSync, reviewType: 'continuity_heat_sync', payloadKey: 'continuity_heat_sync', issuePrefix: '连续性热度缺口' }))
  payload.continuity_heat_sync = continuityHeatSync
  const conflictStructureSync = buildConflictStructureSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: conflictStructureSync, reviewType: 'conflict_structure_sync', payloadKey: 'conflict_structure_sync', issuePrefix: '冲突结构缺口' }))
  payload.conflict_structure_sync = conflictStructureSync
  const upgradeRhythmSync = buildUpgradeRhythmSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: upgradeRhythmSync, reviewType: 'upgrade_rhythm_sync', payloadKey: 'upgrade_rhythm_sync', issuePrefix: '升级节奏缺口' }))
  payload.upgrade_rhythm_sync = upgradeRhythmSync
  const targetReaderSync = buildTargetReaderSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: targetReaderSync, reviewType: 'target_reader_sync', payloadKey: 'target_reader_sync', issuePrefix: '目标读者缺口' }))
  payload.target_reader_sync = targetReaderSync
  const genrePositioningSync = buildGenrePositioningSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: genrePositioningSync, reviewType: 'genre_positioning_sync', payloadKey: 'genre_positioning_sync', issuePrefix: '题材定位缺口' }))
  payload.genre_positioning_sync = genrePositioningSync
  const femaleAudienceSync = buildFemaleAudienceSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: femaleAudienceSync, reviewType: 'female_audience_sync', payloadKey: 'female_audience_sync', issuePrefix: '女频长篇缺口' }))
  payload.female_audience_sync = femaleAudienceSync
  const plotDynamicsSync = buildPlotDynamicsSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: plotDynamicsSync, reviewType: 'plot_dynamics_sync', payloadKey: 'plot_dynamics_sync', issuePrefix: '剧情动力缺口' }))
  payload.plot_dynamics_sync = plotDynamicsSync
  const storyPowerSync = buildStoryPowerSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyPowerSync, reviewType: 'story_power_sync', payloadKey: 'story_power_sync', issuePrefix: '故事力缺口' }))
  payload.story_power_sync = storyPowerSync
  const characterRelationSync = buildCharacterRelationSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterRelationSync, reviewType: 'character_relation_sync', payloadKey: 'character_relation_sync', issuePrefix: '角色关系缺口' }))
  payload.character_relation_sync = characterRelationSync
  const chapterAttractionReview = buildChapterAttractionReviewReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterAttractionReview, reviewType: 'chapter_attraction_review', payloadKey: 'chapter_attraction_review', formatIssues: sync => sync.weak_dimensions.map((item: any) => `${item.label}｜${item.issue}`) }))
  payload.chapter_attraction_review = chapterAttractionReview
  const storyDriveSync = buildStoryDriveSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyDriveSync, reviewType: 'story_drive_sync', payloadKey: 'story_drive_sync', issuePrefix: '故事力缺口' }))
  payload.story_drive_sync = storyDriveSync
  const storyLoopSync = buildStoryLoopSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: storyLoopSync, reviewType: 'story_loop_sync', payloadKey: 'story_loop_sync', issuePrefix: '故事循环缺口' }))
  payload.story_loop_sync = storyLoopSync
  const informationFlowSync = buildInformationFlowSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: informationFlowSync, reviewType: 'information_flow_sync', payloadKey: 'information_flow_sync', issuePrefix: '信息流缺口' }))
  payload.information_flow_sync = informationFlowSync
  const emotionalArcSync = buildEmotionalArcSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: emotionalArcSync, reviewType: 'emotional_arc_sync', payloadKey: 'emotional_arc_sync', issuePrefix: '情绪弧缺口' }))
  payload.emotional_arc_sync = emotionalArcSync
  const characterArcSync = buildCharacterArcSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: characterArcSync, reviewType: 'character_arc_sync', payloadKey: 'character_arc_sync', issuePrefix: '人物弧光缺口' }))
  payload.character_arc_sync = characterArcSync
  const chapterBlueprintSync = buildChapterBlueprintSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterBlueprintSync, reviewType: 'chapter_blueprint_sync', payloadKey: 'chapter_blueprint_sync', issuePrefix: '细纲缺口' }))
  payload.chapter_blueprint_sync = chapterBlueprintSync
  const chapterBenchmarkSync = buildChapterBenchmarkSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: chapterBenchmarkSync, reviewType: 'chapter_benchmark_sync', payloadKey: 'chapter_benchmark_sync', issuePrefix: '未达标' }))
  payload.chapter_benchmark_sync = chapterBenchmarkSync
  const benchmarkRecallSync = buildBenchmarkRecallSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: benchmarkRecallSync, reviewType: 'benchmark_recall_sync', payloadKey: 'benchmark_recall_sync', issuePrefix: '召回缺口' }))
  payload.benchmark_recall_sync = benchmarkRecallSync
  const styleBoundarySync = buildStyleBoundarySyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: styleBoundarySync, reviewType: 'style_boundary_sync', payloadKey: 'style_boundary_sync', issuePrefix: '文风边界缺口' }))
  payload.style_boundary_sync = styleBoundarySync
  const styleSampleSync = buildStyleSampleSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({
    projectId: project.id,
    chapter,
    sync: styleSampleSync,
    reviewType: 'style_sample_sync',
    payloadKey: 'style_sample_sync',
    formatIssues: sync => [
      ...sync.missed.map((item: any) => `风格缺口：${item.label}｜${item.text}`),
      ...sync.copied_phrases.map((item: any) => `照搬风险：${item}`),
    ],
  }))
  payload.style_sample_sync = styleSampleSync
  const innovationSync = buildInnovationSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: innovationSync, reviewType: 'innovation_sync', payloadKey: 'innovation_sync', issuePrefix: '未兑现' }))
  payload.innovation_sync = innovationSync
  const volumeBeatSync = buildVolumeBeatSyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({ projectId: project.id, chapter, sync: volumeBeatSync, reviewType: 'volume_beat_sync', payloadKey: 'volume_beat_sync', issuePrefix: '未兑现' }))
  payload.volume_beat_sync = volumeBeatSync
  const runwaySync = buildRunwaySyncReport(project, chapter, contextPackage, chapterText)
  await createNovelReview(activeWorkspace, buildPostDeliverySyncReviewRecord({
    projectId: project.id,
    chapter,
    sync: runwaySync,
    reviewType: 'runway_sync',
    payloadKey: 'runway_sync',
    formatIssues: sync => [
      ...sync.four_question_missed.map((item: any) => `四问未兑现：${item.label}｜${item.text}`),
      ...sync.reader_fuel_missed.map((item: any) => `读者燃料未兑现：${item.text}`),
      ...sync.redline_touched.map((item: any) => `触碰红线：${item.text}`),
    ],
  }))
  payload.runway_sync = runwaySync
  await createNovelReview(activeWorkspace, buildStoryStateReviewRecord({ projectId: project.id, chapter, payload }))
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

