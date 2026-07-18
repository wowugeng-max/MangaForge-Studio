import type { AnyRecord } from './types'
import { text } from './helpers-basics'

export const SAFE_REPAIR_TASK_CATEGORY_ISSUE_TYPES = new Set([
  'batch_brief_mismatch',
  'chapter_handoff_missed',
  'chapter_benchmark_gap',
  'chapter_attraction_gap',
  'character_arc_gap',
  'benchmark_recall_gap',
  'core_drift',
  'intent_confirmation_gap',
  'innovation_execution_missed',
  'innovation_missed',
  'opening_handoff_debt',
  'post_batch_quality_warning',
  'reader_expectation_debt',
  'reader_payoff_debt',
  'reader_pull_missed',
  'target_reader_gap',
  'genre_positioning_gap',
  'female_audience_gap',
  'upgrade_rhythm_gap',
  'chapter_structure_gap',
  'chapter_progression_gap',
  'information_load_gap',
  'longform_continuity_gap',
  'core_contract_gap',
  'continuity_heat_gap',
  'revision_receipt_gap',
  'deslop_repair_gap',
  'prose_meta_gap',
  'serial_risk_repair_gap',
  'chapter_hook_quality_gap',
  'reader_retention_gap',
  'reader_retention_missed',
  'scene_card_receipt',
  'source_readiness_gap',
  'state_tracking_gap',
  'style_boundary_gap',
  'information_flow_gap',
  'expectation_threshold_gap',
  'story_loop_gap',
  'emotional_arc_gap',
  'chapter_hook_gap',
  'paragraph_hook_gap',
  'suspense_gap',
  'reversal_gap',
  'showdown_gap',
  'prose_craft_gap',
  'punctuation_tone_gap',
  'content_rubric_gap',
  'asset_linkage_gap',
  'dialogue_gap',
  'plot_dynamics_gap',
  'character_relation_gap',
  'character_behavior_gap',
  'conflict_structure_gap',
  'bridge_unit_gap',
  'opening_gap',
  'story_drive_gap',
  'storyline_sync_risk',
  'style_sample_gap',
  'volume_beat_missed',
  'volume_segment_missed',
  'deslop_repair_receipt',
  'revision_cascade_impact',
  'revision_scope_guard',
  'prose_revision_receipt',
  'prose_revision_receipt_sync',
  'quality_audit_repair_receipt',
  'quality_audit_repair_receipt_sync',
  'recovery_evidence',
  'recovery_evidence_mismatch',
])

export const REPAIR_TASK_CATEGORY_ISSUE_TYPE_ALIASES: Record<string, string> = {
  chapter_attraction: 'chapter_attraction_gap',
  chapter_benchmark: 'chapter_benchmark_gap',
  character_arc: 'character_arc_gap',
  delivery_core: 'core_drift',
  innovation: 'innovation_missed',
  reader_expectation: 'reader_expectation_debt',
  reader_payoff: 'reader_payoff_debt',
  target_reader: 'target_reader_gap',
  target_reader_sync: 'target_reader_gap',
  genre_positioning: 'genre_positioning_gap',
  genre_positioning_sync: 'genre_positioning_gap',
  female_audience: 'female_audience_gap',
  female_audience_sync: 'female_audience_gap',
  upgrade_rhythm: 'upgrade_rhythm_gap',
  upgrade_rhythm_sync: 'upgrade_rhythm_gap',
  chapter_structure: 'chapter_structure_gap',
  chapter_structure_sync: 'chapter_structure_gap',
  chapter_progression: 'chapter_progression_gap',
  chapter_progression_sync: 'chapter_progression_gap',
  information_load: 'information_load_gap',
  information_load_sync: 'information_load_gap',
  longform_continuity: 'longform_continuity_gap',
  longform_continuity_sync: 'longform_continuity_gap',
  core_contract: 'core_contract_gap',
  core_contract_check_sync: 'core_contract_gap',
  continuity_heat: 'continuity_heat_gap',
  continuity_heat_sync: 'continuity_heat_gap',
  revision_receipt: 'revision_receipt_gap',
  revision_receipt_check_sync: 'revision_receipt_gap',
  deslop_repair: 'deslop_repair_gap',
  deslop_repair_check_sync: 'deslop_repair_gap',
  prose_meta: 'prose_meta_gap',
  prose_meta_sync: 'prose_meta_gap',
  serial_risk_repair: 'serial_risk_repair_gap',
  serial_risk_repair_sync: 'serial_risk_repair_gap',
  chapter_hook_quality: 'chapter_hook_quality_gap',
  chapter_hook_quality_sync: 'chapter_hook_quality_gap',
  reader_retention: 'reader_retention_missed',
  reader_retention_check: 'reader_retention_gap',
  reader_retention_check_sync: 'reader_retention_gap',
  signature_scene: 'signature_scene_missed',
  source_readiness: 'source_readiness_gap',
  source_readiness_sync: 'source_readiness_gap',
  state_tracking: 'state_tracking_gap',
  state_tracking_sync: 'state_tracking_gap',
  style_boundary: 'style_boundary_gap',
  style_boundary_sync: 'style_boundary_gap',
  information_flow: 'information_flow_gap',
  information_flow_sync: 'information_flow_gap',
  expectation_threshold: 'expectation_threshold_gap',
  expectation_threshold_sync: 'expectation_threshold_gap',
  story_loop: 'story_loop_gap',
  story_loop_sync: 'story_loop_gap',
  emotional_arc: 'emotional_arc_gap',
  emotional_arc_sync: 'emotional_arc_gap',
  chapter_hook: 'chapter_hook_gap',
  chapter_hook_sync: 'chapter_hook_gap',
  paragraph_hook: 'paragraph_hook_gap',
  paragraph_hook_sync: 'paragraph_hook_gap',
  suspense: 'suspense_gap',
  suspense_sync: 'suspense_gap',
  reversal: 'reversal_gap',
  reversal_sync: 'reversal_gap',
  showdown: 'showdown_gap',
  showdown_sync: 'showdown_gap',
  prose_craft: 'prose_craft_gap',
  prose_craft_sync: 'prose_craft_gap',
  punctuation_tone: 'punctuation_tone_gap',
  punctuation_tone_sync: 'punctuation_tone_gap',
  content_rubric: 'content_rubric_gap',
  content_rubric_sync: 'content_rubric_gap',
  asset_linkage: 'asset_linkage_gap',
  asset_linkage_sync: 'asset_linkage_gap',
  dialogue: 'dialogue_gap',
  dialogue_sync: 'dialogue_gap',
  plot_dynamics: 'plot_dynamics_gap',
  plot_dynamics_sync: 'plot_dynamics_gap',
  character_relation: 'character_relation_gap',
  character_relation_sync: 'character_relation_gap',
  character_behavior: 'character_behavior_gap',
  character_behavior_sync: 'character_behavior_gap',
  conflict_structure: 'conflict_structure_gap',
  conflict_structure_sync: 'conflict_structure_gap',
  bridge_unit: 'bridge_unit_gap',
  bridge_unit_sync: 'bridge_unit_gap',
  opening: 'opening_gap',
  opening_sync: 'opening_gap',
  story_drive: 'story_drive_gap',
  storyline: 'storyline_sync_risk',
  story_unit: 'story_unit_sync_risk',
  style_sample: 'style_sample_gap',
  pre_draft_execution: 'intent_confirmation_gap',
  volume_beat: 'volume_beat_missed',
}

export function repairTaskIssueType(task: AnyRecord) {
  const explicit = text(task?.issue_type ?? task?.issueType)
  if (explicit) return explicit
  const category = text(task?.annotation_category ?? task?.annotationCategory ?? task?.category)
  if (REPAIR_TASK_CATEGORY_ISSUE_TYPE_ALIASES[category]) return REPAIR_TASK_CATEGORY_ISSUE_TYPE_ALIASES[category]
  return SAFE_REPAIR_TASK_CATEGORY_ISSUE_TYPES.has(category) ? category : ''
}

export function batchRiskIssueKeys(item: { chapterId: any; chapterNo: number }, issueType: string) {
  return [
    item.chapterId !== null && item.chapterId !== undefined ? `id:${String(item.chapterId)}:${issueType}` : '',
    item.chapterNo > 0 ? `no:${item.chapterNo}:${issueType}` : '',
  ].filter(Boolean)
}

export function batchRiskIssueBatchKey(issueType: string) {
  return `batch:${issueType}`
}

export function resolvedBatchRiskIssueTypes(issueType: string) {
  if (issueType === 'batch_brief_mismatch') {
    return [
      'batch_brief_mismatch',
      'core_drift',
      'reader_payoff_debt',
      'storyline_sync_risk',
    ]
  }
  if (issueType === 'opening_handoff_debt' || issueType === 'reader_expectation_debt') {
    return ['opening_handoff_debt', 'reader_expectation_debt']
  }
  if (issueType === 'reader_pull_missed' || issueType === 'reader_retention_missed') {
    return ['reader_pull_missed', 'reader_retention_missed', 'reader_expectation_debt']
  }
  if (issueType === 'target_reader_gap') {
    return ['target_reader_gap']
  }
  if (issueType === 'genre_positioning_gap') {
    return ['genre_positioning_gap']
  }
  if (issueType === 'female_audience_gap') {
    return ['female_audience_gap']
  }
  if (issueType === 'upgrade_rhythm_gap') {
    return ['upgrade_rhythm_gap']
  }
  if (issueType === 'chapter_structure_gap') {
    return ['chapter_structure_gap']
  }
  if (issueType === 'chapter_progression_gap') {
    return ['chapter_progression_gap']
  }
  if (issueType === 'information_load_gap') {
    return ['information_load_gap']
  }
  if (issueType === 'longform_continuity_gap') {
    return ['longform_continuity_gap']
  }
  if (issueType === 'core_contract_gap') {
    return ['core_contract_gap']
  }
  if (issueType === 'continuity_heat_gap') {
    return ['continuity_heat_gap']
  }
  if (issueType === 'revision_receipt_gap') {
    return ['revision_receipt_gap']
  }
  if (issueType === 'deslop_repair_gap') {
    return ['deslop_repair_gap']
  }
  if (issueType === 'prose_meta_gap') {
    return ['prose_meta_gap']
  }
  if (issueType === 'serial_risk_repair_gap') {
    return ['serial_risk_repair_gap']
  }
  if (issueType === 'chapter_hook_quality_gap') {
    return ['chapter_hook_quality_gap']
  }
  if (issueType === 'reader_retention_gap') {
    return ['reader_retention_gap']
  }
  if (issueType === 'innovation_missed' || issueType === 'innovation_execution_missed') {
    return ['innovation_missed', 'innovation_execution_missed']
  }
  if (issueType === 'intent_confirmation_gap' || issueType === 'benchmark_recall_gap') {
    return ['intent_confirmation_gap', 'benchmark_recall_gap']
  }
  if (issueType === 'volume_beat_missed' || issueType === 'volume_segment_missed') {
    return ['volume_beat_missed', 'volume_segment_missed']
  }
  if (issueType === 'recovery_evidence_mismatch') {
    return ['recovery_evidence_mismatch']
  }
  if (issueType.startsWith('scene_card_receipt')) {
    return ['scene_card_receipt', issueType]
  }
  if (issueType.startsWith('deslop_repair_receipt')) {
    return ['deslop_repair_receipt', issueType]
  }
  if (issueType.startsWith('revision_cascade_impact')) {
    return ['revision_cascade_impact', issueType]
  }
  if (issueType.startsWith('revision_scope_guard')) {
    return ['revision_scope_guard', issueType]
  }
  if (issueType.startsWith('prose_revision_receipt')) {
    return ['prose_revision_receipt_sync', 'prose_revision_receipt', issueType]
  }
  if (issueType === 'strengthened_repair_acceptance_mismatch') {
    return ['strengthened_repair_acceptance_mismatch']
  }
  if (issueType === 'safe_batch_expansion_segment_hotspot') {
    return ['safe_batch_expansion_segment_hotspot']
  }
  if (issueType === 'safe_batch_expansion_structure_repair') {
    return ['safe_batch_expansion_structure_repair', 'safe_batch_expansion_segment_hotspot']
  }
  if (issueType === 'safe_batch_expansion_structure_decision_mismatch') {
    return ['safe_batch_expansion_structure_decision_mismatch']
  }
  if ([
    'readability_risk',
    'readability_or_meme_risk',
    'opening_pull_risk',
    'ending_page_turn_risk',
    'scene_progression_risk',
    'payoff_density_risk',
  ].includes(issueType)) {
    return [
      'readability_risk',
      'readability_or_meme_risk',
      'opening_pull_risk',
      'ending_page_turn_risk',
      'scene_progression_risk',
      'payoff_density_risk',
    ]
  }
  return [issueType]
}

