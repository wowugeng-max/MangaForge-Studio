import {
  createNovelReview as persistNovelReview,
  listNovelChapterSettingUsage,
  listNovelChapters,
  listNovelCharacters,
  listNovelSettingEntities,
  mergeNovelChapterSettingUsageActualStateChange,
  mergeNovelCharacterCurrentState,
  mergeNovelSettingEntityState,
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
  STORYLINE_TYPES,
} from '../../routes/novel-setting-helpers-shared'
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



export async function applyStoryStateMachineSyncPhaseA(args: {
  activeWorkspace: string
  project: any
  chapter: any
  contextPackage: any
  chapterText: string
  prepared: any
  payload: any
  stateDelta: any
  saveDerivedReview?: (activeWorkspace: string, record: any) => Promise<any>
  exactChapter?: boolean
}) {
  const { activeWorkspace, project, chapter, contextPackage, chapterText, prepared, payload, stateDelta } = args
  const createNovelReview = args.saveDerivedReview || persistNovelReview
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
      if (args.exactChapter) {
        await mergeNovelCharacterCurrentState(activeWorkspace, character.id, {
          ...(currentState || {}),
          last_seen_chapter: chapter.chapter_no,
        })
      } else {
        await updateNovelCharacter(activeWorkspace, character.id, {
          current_state: {
            ...(character.current_state || {}),
            ...(currentState || {}),
            last_seen_chapter: chapter.chapter_no,
          },
        } as any)
      }
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
      if (args.exactChapter) {
        await mergeNovelSettingEntityState(activeWorkspace, entity.id, {
          ...(stateDelta || {}),
          last_seen_chapter: chapter.chapter_no,
        })
      } else {
        await updateNovelSettingEntity(activeWorkspace, entity.id, {
          state_json: {
            ...(entity.state_json || {}),
            ...(stateDelta || {}),
            last_seen_chapter: chapter.chapter_no,
          },
        } as any)
      }
      const usage = usages.find(item => item.entity_id === entity.id)
      if (usage) {
        if (args.exactChapter) {
          await mergeNovelChapterSettingUsageActualStateChange(activeWorkspace, usage.id, actualStateChange || {})
        } else {
          await updateNovelChapterSettingUsage(activeWorkspace, usage.id, {
            actual_state_change: {
              ...(usage.actual_state_change || {}),
              ...(actualStateChange || {}),
            },
          } as any)
        }
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
      if (args.exactChapter) {
        await mergeNovelSettingEntityState(activeWorkspace, entity.id, {
          ...(stateDelta || {}),
          last_seen_chapter: chapter.chapter_no,
          last_checked_chapter_id: chapter.id,
          last_checked_chapter_no: chapter.chapter_no,
        })
      } else {
        await updateNovelSettingEntity(activeWorkspace, entity.id, {
          state_json: {
            ...(entity.state_json || {}),
            ...(stateDelta || {}),
            last_seen_chapter: chapter.chapter_no,
            last_checked_chapter_id: chapter.id,
            last_checked_chapter_no: chapter.chapter_no,
          },
        } as any)
      }
      const usage = usages.find(item => item.entity_id === entity.id)
      if (usage) {
        if (args.exactChapter) {
          await mergeNovelChapterSettingUsageActualStateChange(activeWorkspace, usage.id, actualStateChange || {})
        } else {
          await updateNovelChapterSettingUsage(activeWorkspace, usage.id, {
            actual_state_change: {
              ...(usage.actual_state_change || {}),
              ...(actualStateChange || {}),
            },
          } as any)
        }
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
  return payload
}
