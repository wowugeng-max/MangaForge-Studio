import { parseJsonLikePayload } from '../novel-route-utils'

export const DELIVERY_RISK_ANNOTATION_CATEGORIES = new Set([
  'approval_blocker',
  'delivery_core',
  'reader_expectation',
  'target_reader',
  'genre_positioning',
  'female_audience',
  'upgrade_rhythm',
  'chapter_structure',
  'chapter_progression',
  'information_load',
  'longform_continuity',
  'core_contract',
  'continuity_heat',
  'revision_receipt',
  'deslop_repair',
  'prose_meta',
  'serial_risk_repair',
  'chapter_hook_quality',
  'reader_retention',
  'chapter_attraction',
  'story_drive',
  'character_arc',
  'style_sample',
  'reader_payoff',
  'volume_beat',
  'signature_scene',
  'scene_card_receipt',
  'deslop_repair_receipt',
  'revision_cascade_impact',
  'revision_scope_guard',
  'prose_revision_receipt',
  'quality_audit_repair_receipt',
  'quality_audit',
  'source_readiness',
  'state_tracking',
  'style_boundary',
  'information_flow',
  'expectation_threshold',
  'story_loop',
  'emotional_arc',
  'chapter_hook',
  'paragraph_hook',
  'suspense',
  'asset_linkage',
  'dialogue',
  'plot_dynamics',
  'character_relation',
  'character_behavior',
  'conflict_structure',
  'bridge_unit',
  'reversal',
  'showdown',
  'opening',
  'prose_craft',
  'punctuation_tone',
  'content_rubric',
  'intent_confirmation',
  'benchmark_recall',
  'runway',
  'recovery_evidence',
  'innovation',
  'storyline',
  'story_unit',
  'readability',
])

export function deliveryRiskAnnotationPriority(annotation: any) {
  const category = String(annotation?.category || '')
  const order: Record<string, number> = {
    approval_blocker: 0,
    delivery_core: 1,
    content_rubric: 2,
    target_reader: 3,
    genre_positioning: 4,
    female_audience: 5,
    upgrade_rhythm: 6,
    chapter_structure: 7,
    chapter_progression: 8,
    information_load: 9,
    longform_continuity: 10,
    core_contract: 11,
    continuity_heat: 12,
    revision_receipt: 13,
    deslop_repair: 14,
    prose_meta: 15,
    serial_risk_repair: 16,
    chapter_hook_quality: 17,
    runway: 18,
    recovery_evidence: 19,
    story_unit: 20,
    signature_scene: 21,
    scene_card_receipt: 22,
    deslop_repair_receipt: 23,
    revision_cascade_impact: 21,
    revision_scope_guard: 22,
    prose_revision_receipt: 23,
    quality_audit_repair_receipt: 20,
    quality_audit: 21,
    source_readiness: 22,
    state_tracking: 23,
    style_boundary: 24,
    information_flow: 25,
    expectation_threshold: 26,
    story_loop: 27,
    emotional_arc: 28,
    chapter_hook: 29,
    paragraph_hook: 30,
    suspense: 31,
    asset_linkage: 32,
    dialogue: 33,
    plot_dynamics: 34,
    character_relation: 35,
    character_behavior: 36,
    conflict_structure: 37,
    bridge_unit: 38,
    reversal: 39,
    showdown: 40,
    opening: 41,
    prose_craft: 42,
    punctuation_tone: 43,
    intent_confirmation: 44,
    benchmark_recall: 45,
    reader_expectation: 46,
    volume_beat: 47,
    reader_retention: 48,
    chapter_attraction: 49,
    story_drive: 50,
    character_arc: 51,
    style_sample: 52,
    reader_payoff: 53,
    innovation: 54,
    storyline: 44,
    readability: 45,
  }
  return order[category] ?? 99
}

function isResolvedTaskStatus(value: any) {
  return ['resolved', 'done', 'completed', 'success', 'closed'].includes(String(value || '').trim().toLowerCase())
}

export function existingReviewAnnotationRepairKeys(runs: any[]) {
  const keys = new Set<string>()
  for (const run of runs || []) {
    if (run?.run_type !== 'longform_production_repair') continue
    const payload = parseJsonLikePayload(run.output_ref) || {}
    const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
    for (const task of tasks) {
      if (task?.source !== 'review_annotation_risk') continue
      if (isResolvedTaskStatus(task?.task_status || task?.status)) continue
      const key = String(task.annotation_key || '').trim()
      if (key) keys.add(key)
    }
  }
  return keys
}

export function existingStorylineDiffDecisionTaskKeys(runs: any[]) {
  const keys = new Set<string>()
  for (const run of runs || []) {
    if (run?.run_type !== 'longform_production_repair') continue
    const payload = parseJsonLikePayload(run.output_ref) || {}
    const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
    for (const task of tasks) {
      if (task?.source !== 'storyline_diff_decision') continue
      if (isResolvedTaskStatus(task?.task_status || task?.status)) continue
      const key = String(task.decision_key || '').trim()
      if (key) keys.add(key)
    }
  }
  return keys
}

export function annotationTaskTitle(annotation: any) {
  const chapterNo = Number(annotation.chapter_no || 0)
  const prefix = chapterNo > 0 ? `第${chapterNo}章` : '章节'
  return `${prefix}《${annotation.title || annotation.source_label || '交稿风险'}》修复`
}

