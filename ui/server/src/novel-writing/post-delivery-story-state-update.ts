type SyncReportInput = Record<string, any>

const STORY_STATE_DELTA_SYNC_KEYS = [
  'timeline_delta_sync',
  'chapter_handoff_delta_sync',
  'character_state_delta_sync',
  'asset_state_delta_sync',
  'relationship_delta_sync',
  'foreshadowing_delta_sync',
  'storyline_sync',
  'story_unit_sync',
  'signature_scene_sync',
  'chapter_benchmark_sync',
  'volume_beat_sync',
]

const SYNC_REPORT_FIELD_MAP: Array<[string, string]> = [
  ['proseRevisionReceiptSync', 'prose_revision_receipt_sync'],
  ['deslopRepairReceiptSync', 'deslop_repair_receipt_sync'],
  ['qualityAuditRepairReceiptSync', 'quality_audit_repair_receipt_sync'],
  ['nextChapterQualityPlanReceiptSync', 'next_chapter_quality_plan_receipts_sync'],
  ['statusFilterReceiptSync', 'status_filter_receipts_sync'],
  ['writePreparationReceiptSync', 'write_preparation_receipts_sync'],
  ['revisionContextReceiptSync', 'revision_context_receipts_sync'],
  ['revisionCascadeImpactSync', 'revision_cascade_impact_sync'],
  ['revisionScopeGuardSync', 'revision_scope_guard_sync'],
  ['deterministicProseCleanup', 'deterministic_prose_cleanup'],
  ['proseMetaSync', 'prose_meta_sync'],
  ['chapterBlueprintSync', 'chapter_blueprint_sync'],
  ['chapterTitleUniquenessSync', 'chapter_title_uniqueness_sync'],
  ['dialogueSync', 'dialogue_sync'],
  ['characterBehaviorSync', 'character_behavior_sync'],
  ['sceneCardReceiptSync', 'scene_card_receipts_sync'],
  ['deliveryRiskReceiptSync', 'delivery_risk_receipts_sync'],
  ['artifactProtocolReceiptSync', 'artifact_protocol_receipts_sync'],
  ['assetLinkageSync', 'asset_linkage_sync'],
  ['stateTrackingSync', 'state_tracking_sync'],
  ['chapterHandoffSync', 'chapter_handoff_sync'],
  ['proseCraftSync', 'prose_craft_sync'],
  ['punctuationToneSync', 'punctuation_tone_sync'],
  ['payoffSetupSync', 'payoff_setup_sync'],
  ['spectatorReactionSync', 'spectator_reaction_sync'],
  ['sourceReadinessSync', 'source_readiness_sync'],
  ['intentConfirmationSync', 'intent_confirmation_sync'],
  ['benchmarkRecallSync', 'benchmark_recall_sync'],
  ['styleSampleSync', 'style_sample_sync'],
  ['storyLoopSync', 'story_loop_sync'],
  ['informationFlowSync', 'information_flow_sync'],
  ['expectationThresholdSync', 'expectation_threshold_sync'],
  ['emotionalArcSync', 'emotional_arc_sync'],
  ['chapterHookSync', 'chapter_hook_sync'],
  ['paragraphHookSync', 'paragraph_hook_sync'],
  ['suspenseSync', 'suspense_sync'],
  ['reversalSync', 'reversal_sync'],
  ['showdownSync', 'showdown_sync'],
  ['openingSync', 'opening_sync'],
  ['bridgeUnitSync', 'bridge_unit_sync'],
  ['continuityHeatSync', 'continuity_heat_sync'],
  ['conflictStructureSync', 'conflict_structure_sync'],
  ['upgradeRhythmSync', 'upgrade_rhythm_sync'],
  ['targetReaderSync', 'target_reader_sync'],
  ['genrePositioningSync', 'genre_positioning_sync'],
  ['plotSpecialTopicsSync', 'plot_special_topics_sync'],
  ['femaleAudienceSync', 'female_audience_sync'],
  ['plotDynamicsSync', 'plot_dynamics_sync'],
  ['storyPowerSync', 'story_power_sync'],
  ['characterRelationSync', 'character_relation_sync'],
  ['readerRetentionSync', 'reader_retention_sync'],
  ['coreContractSync', 'core_contract_sync'],
  ['storyDriveSync', 'story_drive_sync'],
  ['characterArcSync', 'character_arc_sync'],
  ['styleBoundarySync', 'style_boundary_sync'],
  ['innovationSync', 'innovation_sync'],
  ['runwaySync', 'runway_sync'],
  ['readerExpectationSync', 'reader_expectation_sync'],
  ['qualityAuditSync', 'quality_audit_sync'],
  ['beatCoolingSync', 'beat_cooling_sync'],
  ['readerPayoffSync', 'reader_payoff_sync'],
  ['chapterAttractionReview', 'chapter_attraction_review'],
  ['chapterBenchmarkSync', 'chapter_benchmark_sync'],
  ['volumeBeatSync', 'volume_beat_sync'],
  ['signatureSceneSync', 'signature_scene_sync'],
  ['storyUnitSync', 'story_unit_sync'],
  ['coreDrift', 'core_drift'],
]

function attachSyncReports(target: Record<string, any>, syncReports: SyncReportInput = {}) {
  for (const [inputKey, outputKey] of SYNC_REPORT_FIELD_MAP) {
    target[outputKey] = syncReports[inputKey]
  }
  return target
}

export function buildPostDeliveryStoryStateUpdate(storyStateUpdate: any = {}, syncReports: SyncReportInput = {}) {
  const base = storyStateUpdate || {}
  const next: Record<string, any> = { ...base }
  for (const key of STORY_STATE_DELTA_SYNC_KEYS) {
    next[key] = base[key]
  }
  return attachSyncReports(next, syncReports)
}

export function buildSkippedPostDeliveryStoryStateUpdate(syncReports: SyncReportInput = {}) {
  return attachSyncReports({ skipped: true }, syncReports)
}
