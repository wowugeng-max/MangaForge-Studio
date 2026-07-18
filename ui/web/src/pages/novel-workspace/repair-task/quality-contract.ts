import {
  type AnyRecord,
  arrayValue,
  firstText,
  limitedArray,
  objectValue,
  parseJsonValue,
  text,
} from './utils'

export function summarizeEvidenceItem(value: any) {
  if (value === null || value === undefined) return ''
  if (typeof value !== 'object') return text(value)
  const item = objectValue(value)
  const label = firstText(item.name, item.label, item.title, item.key, item.type, item.text, item.description)
  const detail = firstText(
    item.expected_state_change,
    item.expectedStateChange,
    item.actual_state_change,
    item.actualStateChange,
    item.reason,
    item.message,
    item.description,
    item.text,
    item.action,
  )
  if (label && detail && label !== detail) return `${label}：${detail}`
  return label || detail || JSON.stringify(item).slice(0, 240)
}

export function metricNumber(value: any) {
  if (value === null || value === undefined || value === '') return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

export function preDraftExecutionReceiptSources(value: any) {
  const quality = objectValue(value)
  const review = objectValue(quality.review)
  const result = objectValue(quality.result)
  const payload = parseJsonValue(review.payload) || objectValue(review.payload)
  const reviewReceipts = objectValue(review.oh_story_delivery_receipts || review.ohStoryDeliveryReceipts)
  const qualityReceipts = objectValue(quality.oh_story_delivery_receipts || quality.ohStoryDeliveryReceipts)
  const resultReceipts = objectValue(result.oh_story_delivery_receipts || result.ohStoryDeliveryReceipts)
  const payloadReceipts = objectValue(payload.oh_story_delivery_receipts || payload.ohStoryDeliveryReceipts)
  const selfCheck = objectValue(payload.self_check || payload.selfCheck)
  const selfCheckReview = objectValue(selfCheck.review)
  const selfCheckReceipts = objectValue(selfCheck.oh_story_delivery_receipts || selfCheck.ohStoryDeliveryReceipts)
  const selfCheckReviewReceipts = objectValue(selfCheckReview.oh_story_delivery_receipts || selfCheckReview.ohStoryDeliveryReceipts)
  return [
    review.pre_draft_execution_receipts || review.preDraftExecutionReceipts,
    quality.pre_draft_execution_receipts || quality.preDraftExecutionReceipts,
    result.pre_draft_execution_receipts || result.preDraftExecutionReceipts,
    payload.pre_draft_execution_receipts || payload.preDraftExecutionReceipts,
    selfCheck.pre_draft_execution_receipts || selfCheck.preDraftExecutionReceipts,
    selfCheckReview.pre_draft_execution_receipts || selfCheckReview.preDraftExecutionReceipts,
    reviewReceipts.pre_draft_execution_receipts || reviewReceipts.preDraftExecutionReceipts,
    qualityReceipts.pre_draft_execution_receipts || qualityReceipts.preDraftExecutionReceipts,
    resultReceipts.pre_draft_execution_receipts || resultReceipts.preDraftExecutionReceipts,
    payloadReceipts.pre_draft_execution_receipts || payloadReceipts.preDraftExecutionReceipts,
    selfCheckReceipts.pre_draft_execution_receipts || selfCheckReceipts.preDraftExecutionReceipts,
    selfCheckReviewReceipts.pre_draft_execution_receipts || selfCheckReviewReceipts.preDraftExecutionReceipts,
  ].map(objectValue).filter(source => Object.keys(source).length > 0)
}

export function genericEvidenceSearchText(value: any) {
  return text(value).replace(/[\s"'“”‘’《》【】()[\]{}，。！？、；：,.!?;:|｜\-_/\\]+/g, '').toLowerCase()
}

export function genericClosureEvidenceDetail(item: any) {
  const check = objectValue(item)
  const evidenceValues = [
    check.evidence,
    check.delivered_evidence,
    check.deliveredEvidence,
    check.changed_evidence,
    check.changedEvidence,
    check.source_excerpt,
    check.sourceExcerpt,
    check.chapter_evidence,
    check.chapterEvidence,
    check.excluded_reason,
    check.excludedReason,
  ].map(value => firstText(value)).filter(Boolean)
  const evidence = evidenceValues.find(value => {
    const normalized = genericEvidenceSearchText(value)
    if (!normalized || normalized.length < 4) return true
    return [
      '已处理',
      '已完成',
      '已兑现',
      '已落地',
      '已修复',
      '已调整',
      '已修改',
      '已优化',
      '已补充',
      '已补齐',
      '已改写',
      '已重写',
      '已完善',
      '已解决',
      '已闭环',
      '已经处理',
      '已经完成',
      '已经兑现',
      '已经落地',
      '已经修复',
      '已经调整',
      '已经修改',
      '已经优化',
      '已经补充',
      '已经补齐',
      '已经改写',
      '已经重写',
      '已经完善',
      '已经解决',
      '已经闭环',
      '按要求处理',
      '按要求完成',
      '按要求调整',
      '按要求修改',
      '按要求优化',
      '按要求补充',
      '按要求补齐',
      '按要求改写',
      '按要求重写',
      '按要求完善',
      '处理完成',
      '修复完成',
      '调整完成',
      '修改完成',
      '优化完成',
      '补充完成',
      '补齐完成',
      '改写完成',
      '重写完成',
      '完善完成',
      '问题解决',
      '风险闭环',
      '正文已处理',
      '正文已体现',
      '已在正文中体现',
      '见正文',
      '详见正文',
      '见修订正文',
      '详见修订正文',
      '见修订后正文',
      '详见修订后正文',
      '见修订稿',
      '详见修订稿',
      '见修订文本',
      '详见修订文本',
      '见修订后文本',
      '详见修订后文本',
      'ok',
      'true',
      'yes',
      'ready',
      'pass',
      'passed',
      'done',
      '已就绪',
      '已确认',
      '已检查',
      '已核对',
      '已读取',
      '已同步',
      '已写回',
      '已更新',
      '已经同步',
      '已经写回',
      '已经更新',
    ].includes(normalized)
  })
  if (!evidence) return ''
  return `证据泛化 ${evidence}`
}

export const QUALITY_CONTRACT_REQUIRED_FIELDS: Record<string, string[]> = {
  content_rubric_checks: [
    'key',
    'label',
    'status',
    'core_selling_point',
    'conflict_progression',
    'chapter_change',
    'page_turn_reason',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  quality_audit_checks: [
    'key',
    'label',
    'status',
    'strategy',
    'purpose_tag',
    'density_change',
    'conflict_bound_info',
    'changed_evidence',
    'fix',
    'remaining_risk',
  ],
  chapter_handoff_checks: [
    'key',
    'label',
    'status',
    'previous_handoff',
    'opening_obligation',
    'opening_evidence',
    'location',
    'continuity_action',
    'remaining_risk',
  ],
  deslop_repair_checks: [
    'key',
    'label',
    'status',
    'gate',
    'original_risk',
    'rewritten_evidence',
    'changed_evidence',
    'receipt_synced',
    'fix',
    'remaining_risk',
  ],
  reader_retention_checks: [
    'key',
    'label',
    'status',
    'retention_engine',
    'emotional_payoff',
    'information_hunger',
    'page_turn_question',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  innovation_checks: [
    'key',
    'label',
    'status',
    'innovation_type',
    'differentiating_mechanism',
    'visualized_scene',
    'reader_retellable_hook',
    'long_term_fit',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  chapter_attraction_checks: [
    'key',
    'label',
    'status',
    'attraction_dimension',
    'opening_hook',
    'scene_goal_obstacle_turn_reward',
    'payoff_density',
    'ending_page_turn',
    'spreadable_scene',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  story_drive_checks: [
    'key',
    'label',
    'status',
    'protagonist_choice',
    'obstacle',
    'cost',
    'state_change',
    'next_causality',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  character_arc_checks: [
    'key',
    'label',
    'status',
    'character',
    'desire',
    'flaw_pressure',
    'relationship_change',
    'growth_beat',
    'voice_anchor',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  chapter_benchmark_checks: [
    'key',
    'label',
    'status',
    'benchmark_dimension',
    'expected_method',
    'delivered_evidence',
    'originality_guard',
    'fix',
    'remaining_risk',
  ],
  style_sample_checks: [
    'key',
    'label',
    'status',
    'style_dimension',
    'source_technique',
    'adapted_evidence',
    'copied_phrase_rewritten',
    'fix',
    'remaining_risk',
  ],
  title_uniqueness_checks: [
    'key',
    'label',
    'status',
    'old_title',
    'new_title',
    'outline_title_synced',
    'file_name_synced',
    'chapter_title_line_synced',
    'evidence',
    'remaining_risk',
  ],
  prose_meta_checks: [
    'key',
    'label',
    'status',
    'matched_term',
    'location',
    'replacement',
    'evidence',
    'remaining_risk',
  ],
  banned_words_checks: [
    'key',
    'label',
    'status',
    'matched_word',
    'level',
    'location',
    'replacement',
    'evidence',
    'remaining_risk',
  ],
  blueprint_consumption_checks: [
    'key',
    'label',
    'status',
    'blueprint_field',
    'expected',
    'delivered_evidence',
    'missing_gap',
    'fix',
    'remaining_risk',
  ],
  foreshadowing_delta_checks: [
    'key',
    'label',
    'status',
    'clue_name',
    'delta_type',
    'current_status',
    'chapter',
    'source_excerpt',
    'ledger_path',
    'fix',
    'remaining_risk',
  ],
  serial_risk_repair_checks: [
    'key',
    'label',
    'status',
    'risk_type',
    'repair_receipt',
    'continuity_change',
    'state_change',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  chapter_hook_quality_checks: [
    'key',
    'label',
    'status',
    'hook_position',
    'trigger_type',
    'concrete_question',
    'danger_or_choice',
    'next_action_link',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  intent_confirmation_checks: [
    'key',
    'label',
    'status',
    'intent_field',
    'expected_intent',
    'delivered_evidence',
    'blueprint_link',
    'fix',
    'remaining_risk',
  ],
  write_preparation_checks: [
    'key',
    'label',
    'status',
    'preparation_type',
    'expected',
    'delivered_evidence',
    'chapter_location',
    'fix',
    'remaining_risk',
  ],
  benchmark_recall_checks: [
    'key',
    'label',
    'status',
    'source_type',
    'source_path',
    'expected_application',
    'delivered_evidence',
    'gaps_preserved',
    'fix',
    'remaining_risk',
  ],
  target_reader_checks: [
    'key',
    'label',
    'status',
    'target_reader_profile',
    'reader_desire',
    'emotion_gap',
    'chapter_hit',
    'platform_taste',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  genre_positioning_checks: [
    'key',
    'label',
    'status',
    'genre_tag',
    'core_hook',
    'type_formula',
    'genre_strength',
    'book_title_blurb_alignment',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  female_audience_checks: [
    'key',
    'label',
    'status',
    'security_anchor',
    'reader_identification',
    'heroine_agency',
    'relationship_axis',
    'post_abuse_payoff',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  upgrade_rhythm_checks: [
    'key',
    'label',
    'status',
    'before_after_contrast',
    'instant_feedback',
    'delayed_feedback',
    'new_threshold',
    'cheat_rule',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  structure_checks: [
    'key',
    'label',
    'status',
    'opening_hook',
    'middle_progression',
    'situation_change',
    'ending_page_turn',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  progression_checks: [
    'key',
    'label',
    'status',
    'non_deletable_change',
    'mainline_shift',
    'relationship_or_state_change',
    'compressed_water',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  information_checks: [
    'key',
    'label',
    'status',
    'new_concept_count',
    'action_bound_info',
    'conflict_release',
    'reader_first_scene',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  source_readiness_checks: [
    'key',
    'label',
    'status',
    'source_name',
    'source_path',
    'read_status',
    'used_as_fact',
    'chapter_evidence',
    'fix',
    'remaining_risk',
  ],
  state_tracking_checks: [
    'key',
    'label',
    'status',
    'state_subject',
    'state_type',
    'previous_state',
    'allowed_state',
    'used_in_chapter',
    'evidence',
    'excluded_reason',
    'fix',
    'remaining_risk',
  ],
  story_state_update_checks: [
    'key',
    'label',
    'status',
    'state_domain',
    'target_file',
    'update_path',
    'before_state',
    'after_state',
    'source_excerpt',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  word_count_checks: [
    'key',
    'label',
    'status',
    'current_count',
    'target_count',
    'min_required_count',
    'evidence',
    'remaining_risk',
  ],
  style_boundary_checks: [
    'key',
    'label',
    'status',
    'reference_risk',
    'rewritten_with_local_action',
    'voice_anchor',
    'copied_phrase_removed',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  information_flow_checks: [
    'key',
    'label',
    'status',
    'reveal_order',
    'withheld_question',
    'action_bound_release',
    'conflict_or_cost',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  expectation_threshold_checks: [
    'key',
    'label',
    'status',
    'reader_question',
    'stakes',
    'choice_pressure',
    'payoff_promise',
    'next_chapter_pull',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  story_loop_checks: [
    'key',
    'label',
    'status',
    'setup_question',
    'obstacle',
    'choice',
    'cost',
    'payoff_or_answer_fragment',
    'new_question',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  emotional_arc_checks: [
    'key',
    'label',
    'status',
    'calm_or_pressure',
    'mobilization',
    'counteraction',
    'release',
    'reader_payoff',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  chapter_hook_checks: [
    'key',
    'label',
    'status',
    'hook_position',
    'trigger',
    'reader_question',
    'next_chapter_pressure',
    'delivered_evidence',
    'fix',
    'remaining_risk',
  ],
  paragraph_hook_checks: [
    'key',
    'label',
    'status',
    'paragraph_range',
    'hook_type',
    'micro_change',
    'information_or_risk_delta',
    'emotion_or_relation_delta',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  suspense_checks: [
    'key',
    'label',
    'status',
    'question',
    'misdirect',
    'partial_answer',
    'new_expectation',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  asset_linkage_checks: [
    'key',
    'label',
    'status',
    'asset_name',
    'function',
    'ownership',
    'trigger_condition',
    'limitation',
    'consequence',
    'story_link',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  dialogue_checks: [
    'key',
    'label',
    'status',
    'speaker',
    'agenda',
    'subtext',
    'power_shift',
    'information_delta',
    'character_voice',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  plot_dynamics_checks: [
    'key',
    'label',
    'status',
    'goal',
    'obstacle',
    'action',
    'cost_or_feedback',
    'new_expectation',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  character_relation_checks: [
    'key',
    'label',
    'status',
    'relation_type',
    'protagonist_goal',
    'agency_choice',
    'cost',
    'relation_shift',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  character_behavior_checks: [
    'key',
    'label',
    'status',
    'character',
    'concrete_motive',
    'emotional_reason',
    'trigger_change',
    'visible_choice',
    'cost',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  conflict_structure_checks: [
    'key',
    'label',
    'status',
    'blocker',
    'no_exit_condition',
    'stakes_or_exit_cost',
    'action_block',
    'win_loss_result',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  opening_checks: [
    'key',
    'label',
    'status',
    'protagonist_entry',
    'first_300_goal',
    'first_1000_expectation',
    'opening_principle',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  bridge_unit_checks: [
    'key',
    'label',
    'status',
    'bridge_position',
    'old_expectation_payoff',
    'new_expectation_seed',
    'goal_progression',
    'climax_hook',
    'stage_handoff',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  reversal_checks: [
    'key',
    'label',
    'status',
    'reversal_type',
    'fair_clues',
    'misdirect',
    'reveal_timing',
    'impact_after_reveal',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  showdown_checks: [
    'key',
    'label',
    'status',
    'payoff_release',
    'trump_card_used',
    'pressure_layers',
    'audience_reactions',
    'consequence',
    'next_threshold',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  prose_craft_checks: [
    'key',
    'label',
    'status',
    'pov_depth',
    'body_detail',
    'environment_interaction',
    'action_stillness_balance',
    'crowd_reaction_layering',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  punctuation_tone_checks: [
    'key',
    'label',
    'status',
    'speaker',
    'punctuation_issue',
    'tone_intent',
    'replacement',
    'voice_difference',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  longform_checks: [
    'key',
    'label',
    'status',
    'recent_5_chapter_progress',
    'payoff_interval',
    'stage_goal_shift',
    'next_stage_pull',
    'context_layer',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  core_contract_checks: [
    'key',
    'label',
    'status',
    'core_promise',
    'mainline_service',
    'core_emotion',
    'rule_judgement',
    'ending_question',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  continuity_heat_checks: [
    'key',
    'label',
    'status',
    'heat_state',
    'hot_progress',
    'warm_keepalive',
    'cold_warmup',
    'archived_boundary',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  revision_receipt_checks: [
    'key',
    'label',
    'status',
    'required_action',
    'repair_segment',
    'applied_fix',
    'changed_evidence',
    'evidence',
    'fix',
    'remaining_risk',
  ],
  status_filter_receipts: [
    'key',
    'label',
    'used_in_chapter',
    'evidence',
    'excluded_reason',
    'remaining_risk',
  ],
  next_chapter_quality_plan_receipts: [
    'key',
    'label',
    'delivered',
    'evidence',
    'remaining_risk',
  ],
}

export function listQualityContractRequiredFieldKeys() {
  return Object.keys(QUALITY_CONTRACT_REQUIRED_FIELDS)
}

export function listQualityContractRequiredFields() {
  return Object.fromEntries(
    Object.entries(QUALITY_CONTRACT_REQUIRED_FIELDS).map(([key, fields]) => [key, [...fields]]),
  )
}

export function camelFieldName(field: string) {
  return field.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

export function hasContractField(check: AnyRecord, field: string) {
  const camelField = camelFieldName(field)
  const hasSnake = Object.prototype.hasOwnProperty.call(check, field)
  const hasCamel = camelField !== field && Object.prototype.hasOwnProperty.call(check, camelField)
  if (!hasSnake && !hasCamel) return false
  if (field === 'remaining_risk') return true
  return firstText(check[field], check[camelField]) !== ''
}

export function qualityContractMissingFields(item: any, snakeKey: string) {
  if (typeof item === 'string') return []
  const requiredFields = QUALITY_CONTRACT_REQUIRED_FIELDS[snakeKey] || []
  if (requiredFields.length === 0) return []
  const check = objectValue(item)
  return requiredFields.filter(field => !hasContractField(check, field))
}

export function qualityContractCheckFailed(item: any, snakeKey = '') {
  if (typeof item === 'string') return true
  const check = objectValue(item)
  const status = firstText(check.status, check.result, check.state).toLowerCase()
  const remainingRisk = firstText(check.remaining_risk, check.remainingRisk, check.residual_risk, check.residualRisk)
  const missingFields = qualityContractMissingFields(item, snakeKey)
  const genericEvidenceDetail = genericClosureEvidenceDetail(item)
  return ['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error'].includes(status)
    || check.ready === false
    || check.delivered === false
    || check.passed === false
    || check.ok === false
    || Boolean(remainingRisk)
    || Boolean(genericEvidenceDetail)
    || missingFields.length > 0
}

export function qualityContractCheckLine(item: any, fallback: string, snakeKey = '') {
  if (typeof item === 'string') return item
  const check = objectValue(item)
  const label = firstText(check.label, check.key, check.check_key, check.checkKey, fallback)
  const missingFields = qualityContractMissingFields(item, snakeKey)
  const status = firstText(check.status, check.result, check.state).toLowerCase()
  const passedLike = ['pass', 'passed', 'ok', 'done', 'true'].includes(status)
  const missingDetail = missingFields.length > 0 ? `缺少字段 ${missingFields.join(', ')}` : ''
  const genericEvidenceDetail = genericClosureEvidenceDetail(item)
  const detail = firstText(
    genericEvidenceDetail,
    passedLike ? missingDetail : '',
    check.remaining_risk,
    check.remainingRisk,
    check.evidence,
    check.actual,
    check.message,
    check.text,
    check.description,
    check.fix,
    !passedLike ? missingDetail : '',
    check.status,
  )
  return detail && label !== detail ? `${label}：${detail}` : label
}

export function qualityContractResidualsFromQuality(value: any, snakeKey: string, camelKey: string, missingLabel: string): string[] {
  const quality = objectValue(value)
  const review = objectValue(quality.review)
  const result = objectValue(quality.result)
  const payload = parseJsonValue(review.payload) || objectValue(review.payload)
  const selfCheck = objectValue(payload.self_check || payload.selfCheck)
  const selfCheckReview = objectValue(selfCheck.review)
  const candidates = [
    ...arrayValue(review[snakeKey] || review[camelKey]),
    ...arrayValue(quality[snakeKey] || quality[camelKey]),
    ...arrayValue(result[snakeKey] || result[camelKey]),
    ...arrayValue(payload[snakeKey] || payload[camelKey]),
    ...arrayValue(selfCheck[snakeKey] || selfCheck[camelKey]),
    ...arrayValue(selfCheckReview[snakeKey] || selfCheckReview[camelKey]),
    ...preDraftExecutionReceiptSources(value)
      .flatMap(source => arrayValue(source[snakeKey] || source[camelKey])),
  ]
  if (candidates.length === 0) return [`缺少 ${snakeKey} 复检结果`]
  return candidates
    .filter(item => qualityContractCheckFailed(item, snakeKey))
    .map(item => qualityContractCheckLine(item, missingLabel, snakeKey))
    .filter(Boolean)
}

export function deterministicProseCleanupFailed(item: any) {
  const cleanup = objectValue(item)
  const status = firstText(cleanup.status, cleanup.result, cleanup.state).toLowerCase()
  const riskCount = metricNumber(cleanup.risk_count ?? cleanup.riskCount)
  const categoryRisks = arrayValue(cleanup.categories)
    .some(category => {
      const normalized = objectValue(category)
      const count = metricNumber(normalized.count)
      const categoryStatus = firstText(normalized.status, normalized.result, normalized.state).toLowerCase()
      return (count !== null && count > 0)
        || ['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error'].includes(categoryStatus)
    })
  return ['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error'].includes(status)
    || (riskCount !== null && riskCount > 0)
    || cleanup.ok === false
    || cleanup.passed === false
    || categoryRisks
}

export function deterministicProseCleanupLine(item: any) {
  const cleanup = objectValue(item)
  const label = firstText(cleanup.label, cleanup.key, '确定性清理')
  const riskCount = metricNumber(cleanup.risk_count ?? cleanup.riskCount)
  const categories = arrayValue(cleanup.categories)
    .map(category => {
      const normalized = objectValue(category)
      const categoryLabel = firstText(normalized.label, normalized.key, normalized.name, '风险项')
      const count = metricNumber(normalized.count)
      const evidence = firstText(normalized.evidence, normalized.example, normalized.text, normalized.message)
      return [
        categoryLabel,
        count !== null ? `${count}` : '',
        evidence,
      ].filter(Boolean).join('：')
    })
    .filter(Boolean)
  const detail = categories.length > 0
    ? categories.slice(0, 3).join('；')
    : firstText(cleanup.summary, cleanup.message, cleanup.evidence, cleanup.status, '仍有残留')
  return [
    label,
    riskCount !== null ? `risk_count ${riskCount}` : '',
    detail,
  ].filter(Boolean).join('：')
}

export function deterministicProseCleanupResidualsFromQuality(value: any): string[] {
  const quality = objectValue(value)
  const review = objectValue(quality.review)
  const result = objectValue(quality.result)
  const payload = parseJsonValue(review.payload) || objectValue(review.payload)
  const selfCheck = objectValue(payload.self_check || payload.selfCheck)
  const selfCheckReview = objectValue(selfCheck.review)
  const candidates = [
    review.deterministic_prose_cleanup,
    review.deterministicProseCleanup,
    quality.deterministic_prose_cleanup,
    quality.deterministicProseCleanup,
    result.deterministic_prose_cleanup,
    result.deterministicProseCleanup,
    payload.deterministic_prose_cleanup,
    payload.deterministicProseCleanup,
    selfCheck.deterministic_prose_cleanup,
    selfCheck.deterministicProseCleanup,
    selfCheckReview.deterministic_prose_cleanup,
    selfCheckReview.deterministicProseCleanup,
  ].filter(candidate => candidate !== undefined && candidate !== null && candidate !== '')
  if (candidates.length === 0) return ['缺少 deterministic_prose_cleanup 复检结果']
  return candidates
    .filter(deterministicProseCleanupFailed)
    .map(deterministicProseCleanupLine)
    .filter(Boolean)
}

export function sceneCardReceiptResidualsFromQuality(value: any): string[] {
  const quality = objectValue(value)
  const review = objectValue(quality.review)
  const payload = parseJsonValue(review.payload) || objectValue(review.payload)
  const candidates = [
    ...arrayValue(review.issues),
    ...arrayValue(quality.issues),
    ...arrayValue(payload.issues),
    ...arrayValue(payload.self_check?.review?.quality_audit_checks),
    ...arrayValue(payload.self_check?.quality_audit_checks),
    ...arrayValue(payload.quality_audit_checks),
  ]
  return candidates
    .map(item => summarizeEvidenceItem(item))
    .filter(item => item.toLowerCase().includes('scene_card_receipt'))
}

export function sceneCardDirectiveCheckText(value: any) {
  if (typeof value === 'string') return text(value)
  const check = objectValue(value)
  return [
    check.key,
    check.label,
    check.type,
    check.status,
    check.result,
    check.evidence,
    check.fix,
    check.message,
    check.summary,
    check.text,
    check.remaining_risk,
    check.remainingRisk,
  ].map(item => text(item)).filter(Boolean).join(' ')
}

export function sceneCardDirectiveCheckMatches(value: any, issueType: string) {
  const valueText = sceneCardDirectiveCheckText(value)
  const normalizedIssueType = issueType.toLowerCase()
  return Boolean(normalizedIssueType && valueText.toLowerCase().includes(normalizedIssueType))
    || /scene[_\s-]*card[_\s-]*\d+[_\s-]*(execution[_\s-]*directives|forbidden[_\s-]*directives)/i.test(valueText)
    || /场景卡(执行|禁令)/.test(valueText)
}

export function sceneCardDirectiveResidualsFromQuality(value: any, issueType: string): string[] {
  const quality = objectValue(value)
  const review = objectValue(quality.review)
  const result = objectValue(quality.result)
  const payload = parseJsonValue(review.payload) || objectValue(review.payload)
  const selfCheck = objectValue(payload.self_check || payload.selfCheck)
  const selfCheckReview = objectValue(selfCheck.review)
  const candidates = [
    ...arrayValue(review.prose_craft_checks || review.proseCraftChecks),
    ...arrayValue(quality.prose_craft_checks || quality.proseCraftChecks),
    ...arrayValue(result.prose_craft_checks || result.proseCraftChecks),
    ...arrayValue(payload.prose_craft_checks || payload.proseCraftChecks),
    ...arrayValue(selfCheck.prose_craft_checks || selfCheck.proseCraftChecks),
    ...arrayValue(selfCheckReview.prose_craft_checks || selfCheckReview.proseCraftChecks),
    ...arrayValue(review.quality_audit_checks || review.qualityAuditChecks),
    ...arrayValue(quality.quality_audit_checks || quality.qualityAuditChecks),
    ...arrayValue(result.quality_audit_checks || result.qualityAuditChecks),
    ...arrayValue(payload.quality_audit_checks || payload.qualityAuditChecks),
    ...arrayValue(selfCheck.quality_audit_checks || selfCheck.qualityAuditChecks),
    ...arrayValue(selfCheckReview.quality_audit_checks || selfCheckReview.qualityAuditChecks),
    ...arrayValue(review.issues),
    ...arrayValue(quality.issues),
    ...arrayValue(result.issues),
    ...arrayValue(payload.issues),
  ].filter(item => sceneCardDirectiveCheckMatches(item, issueType))
  if (candidates.length === 0) return [`缺少 ${issueType || 'scene_card_*_execution_directives'} 复检结果`]
  return candidates
    .filter(qualityContractCheckFailed)
    .map(item => qualityContractCheckLine(item, '场景卡执行禁令'))
    .filter(Boolean)
}

