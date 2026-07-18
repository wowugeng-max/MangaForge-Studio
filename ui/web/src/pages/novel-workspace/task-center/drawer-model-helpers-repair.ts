import { parseJsonValue } from './chapter-group'

import {
  compactEvidenceText,
  REPAIR_TASK_CATEGORY_ISSUE_TYPE_ALIASES,
  SAFE_REPAIR_TASK_CATEGORY_ISSUE_TYPES,
} from './drawer-model-helpers-basics'
import {
  isNextChapterQualityPlanTask,
  taskText,
} from './drawer-model-helpers-quality'

export function repairTaskIssueType(task: any) {
  if (isNextChapterQualityPlanTask(task)) return 'next_chapter_quality_plan'
  const explicit = taskText(task?.issue_type ?? task?.issueType)
  if (explicit) return explicit
  const category = taskText(task?.annotation_category ?? task?.annotationCategory ?? task?.category)
  if (REPAIR_TASK_CATEGORY_ISSUE_TYPE_ALIASES[category]) return REPAIR_TASK_CATEGORY_ISSUE_TYPE_ALIASES[category]
  return SAFE_REPAIR_TASK_CATEGORY_ISSUE_TYPES.has(category) ? category : ''
}

export function isSceneCardDirectiveTask(task: any) {
  const payload = task?.payload && typeof task.payload === 'object' ? task.payload : {}
  const fields = [
    task?.issue_type,
    task?.issueType,
    task?.annotation_category,
    task?.annotationCategory,
    task?.category,
    task?.message,
    task?.detail,
    task?.title,
    task?.action,
    task?.summary,
    payload.key,
    payload.label,
    payload.message,
    payload.detail,
    payload.evidence,
    payload.fix,
  ].map(taskText).filter(Boolean).join(' ')
  return /scene[_\s-]*card[_\s-]*\d+[_\s-]*(execution[_\s-]*directives|forbidden[_\s-]*directives)/i.test(fields)
    || /场景卡(执行|禁令)/.test(fields)
}

export function isSingleChapterRecoveryEvidenceTask(task: any) {
  if (repairTaskIssueType(task) !== 'recovery_evidence_mismatch') return false
  const source = String(task?.source || '')
  const annotationSource = String(task?.annotation_source || task?.annotationSource || '')
  return source === 'review_annotation_risk' || annotationSource === 'governance_recheck_sync'
}

export function repairTaskActionLabel(task: any) {
  const issueType = repairTaskIssueType(task)
  if (isSceneCardDirectiveTask(task)) return '修场景卡'
  if (issueType === 'batch_brief_mismatch') return '按批次修订'
  if (issueType === 'recovery_evidence_governance_queue') {
    const actionKey = String(task?.action_key || task?.actionKey || '')
    const explicitActionLabel = String(task?.action_label || task?.actionLabel || '')
    if (String(task?.deep_repair_level || task?.deepRepairLevel || '') === 'escalated_after_recurrence' && explicitActionLabel) {
      return explicitActionLabel
    }
    const map: Record<string, string> = {
      revision: '回修依据并复检',
      recheck_single_chapter: '复检单章',
      recheck_safe_batch: '复盘批次',
      focus_task: '已处理并复盘',
      review_governance_closure: '治理复查台',
      deep_repair_single_brief: '深修单章任务书',
      deep_repair_batch_brief: '深修批次任务书',
    }
    return map[actionKey] || explicitActionLabel
  }
  if (issueType === 'recovery_evidence_mismatch') {
    return isSingleChapterRecoveryEvidenceTask(task) ? '回修依据' : '按批次修订'
  }
  if (issueType === 'style_sample_task_book_rebuild') return '重审样章'
  if (String(task?.source || '') === 'reader_trial_review' || issueType === 'reader_trial_drop_point') return '补试读'
  if (issueType === 'volume_segment_missed') return '补阶段结算'
  if (issueType === 'safe_batch_expansion_structure_decision_mismatch') return '查结构决策'
  if (issueType === 'safe_batch_expansion_structure_repair') return '改扩批结构'
  if (issueType === 'safe_batch_expansion_segment_hotspot') return '修扩批热区'
  if (issueType === 'intent_confirmation_gap') return '补意图确认'
  if (issueType === 'benchmark_recall_gap') return '补文风召回'
  if (issueType === 'style_sample_gap') return '校样章'
  if (issueType === 'chapter_handoff_gap') return '接章首'
  if (issueType === 'source_readiness_gap') return '补来源'
  if (issueType === 'state_tracking_gap') return '补状态'
  if (issueType === 'style_boundary_gap') return '校风格'
  if (issueType === 'story_drive_gap') return '补驱动'
  if (issueType === 'character_arc_gap') return '补弧光'
  if (issueType === 'runway_gap') return '补航线'
  if (issueType === 'quality_audit_gap') return '补诊断'
  if (issueType === 'beat_cooling_gap') return '补冷却'
  if (issueType === 'reader_expectation_debt') return '补期待'
  if (issueType === 'reader_payoff_debt') return '补回报'
  if (issueType === 'information_flow_gap') return '调信息'
  if (issueType === 'expectation_threshold_gap') return '补期待'
  if (issueType === 'story_loop_gap') return '补闭环'
  if (issueType === 'emotional_arc_gap') return '补情绪'
  if (issueType === 'chapter_hook_gap') return '补章钩'
  if (issueType === 'paragraph_hook_gap') return '补段钩'
  if (issueType === 'suspense_gap') return '补悬念'
  if (issueType === 'reversal_gap') return '补反转'
  if (issueType === 'showdown_gap') return '补高潮'
  if (issueType === 'prose_craft_gap') return '修工艺'
  if (issueType === 'payoff_setup_gap') return '补铺垫'
  if (issueType === 'spectator_reaction_gap') return '补围观'
  if (issueType === 'punctuation_tone_gap') return '调语气'
  if (issueType === 'content_rubric_gap') return '补内容'
  if (issueType === 'target_reader_gap') return '补读者'
  if (issueType === 'genre_positioning_gap') return '校题材'
  if (issueType === 'female_audience_gap') return '补女频'
  if (issueType === 'upgrade_rhythm_gap') return '补升级'
  if (issueType === 'chapter_structure_gap') return '补结构'
  if (issueType === 'chapter_progression_gap') return '补推进'
  if (issueType === 'information_load_gap') return '压信息'
  if (issueType === 'longform_continuity_gap') return '保长篇'
  if (issueType === 'next_chapter_quality_plan') return '补续航'
  if (issueType === 'write_preparation_receipts_gap') return '补写前'
  if (issueType === 'status_filter_receipts_gap') return '补状态筛选'
  if (issueType === 'core_contract_gap') return '守契约'
  if (issueType === 'continuity_heat_gap') return '补热度'
  if (issueType === 'revision_receipt_gap') return '补回执'
  if (issueType === 'prose_revision_receipt') return '补回执'
  if (issueType === 'quality_audit_repair_receipt') return '补质检'
  if (issueType === 'deslop_repair_receipt') return '补去味'
  if (issueType === 'revision_cascade_impact') return '补级联'
  if (issueType === 'revision_scope_guard') return '稳幅度'
  if (issueType === 'prose_revision_receipt_sync') return '补回执'
  if (issueType === 'quality_audit_repair_receipt_sync') return '补质检'
  if (issueType === 'deslop_repair_receipt_sync') return '补去味'
  if (issueType === 'revision_cascade_impact_sync') return '补级联'
  if (issueType === 'revision_scope_guard_sync') return '稳幅度'
  if (issueType === 'deslop_repair_gap') return '补去味'
  if (issueType === 'prose_meta_gap') return '删元叙'
  if (issueType === 'serial_risk_repair_gap') return '补连修'
  if (issueType === 'chapter_hook_quality_gap') return '强章钩'
  if (issueType === 'title_uniqueness_gap') return '改标题'
  if (issueType === 'blueprint_consumption_gap') return '兑现细纲'
  if (issueType === 'foreshadowing_delta_gap') return '补伏笔'
  if (issueType === 'deterministic_cleanup_gap') return '清AI味'
  if (issueType === 'story_state_update_gap') return '写状态'
  if (issueType === 'reader_retention_gap') return '补追读'
  if (issueType === 'asset_linkage_gap') return '挂资产'
  if (issueType === 'dialogue_gap') return '修对白'
  if (issueType === 'scene_card_receipts_gap') return '修回执'
  if (issueType === 'delivery_risk_receipts_gap') return '补交稿'
  if (issueType === 'revision_context_receipts_gap') return '补上下文'
  if (issueType === 'plot_dynamics_gap') return '补动力'
  if (issueType === 'character_relation_gap') return '修关系'
  if (issueType === 'character_behavior_gap') return '修行为'
  if (issueType === 'conflict_structure_gap') return '加冲突'
  if (issueType === 'bridge_unit_gap') return '补桥段'
  if (issueType === 'opening_gap') return '改开篇'
  if (issueType === 'reader_pull_missed' || issueType === 'reader_retention_missed') return '补追读'
  if (issueType === 'innovation_execution_missed' || issueType === 'innovation_missed') return '补创新'
  if (String(task?.task_type || '') === 'chapter_retention_patch') {
    const issueText = [issueType, task?.issue_type, task?.message, task?.action].filter(Boolean).join(' ')
    return issueText.includes('缺正文') || issueText.includes('生成正文') ? '生成正文' : '补留存'
  }
  if (String(task?.source || '') === 'rolling_script_room' || issueType === 'script_room_layer_gap') return '按剧本室修复'
  if (String(task?.source || '') === 'storyline_diff_decision' && issueType === 'storyline_diff_accept_as_plan') return '同步计划'
  if (String(task?.source || '') === 'storyline_diff_decision') return '按决策修订'
  if (String(task?.source || '') === 'review_annotation_risk') return '按风险修订'
  const map: Record<string, string> = {
    repair_skeleton: '补骨架',
    repair_materials: '补材料',
    repair_assets: '确认资产',
    repair_quality: '重质检',
    repair_similarity: '降相似风险',
    resolve_failure: '处理失败',
  }
  return map[String(task?.task_type || '')] || ''
}

export function deliveryRiskIssueMeta(task: any) {
  if (String(task?.source || '') !== 'review_annotation_risk') return null
  if (isSceneCardDirectiveTask(task)) return { label: '场景卡执行', color: 'volcano' }
  const explicitIssueType = taskText(task?.issue_type ?? task?.issueType)
  const issueType = repairTaskIssueType(task)
  const category = taskText(task?.annotation_category ?? task?.annotationCategory ?? task?.category)
  const key = explicitIssueType ? issueType : `${issueType} ${category}`
  if (issueType === 'next_chapter_quality_plan' || key.includes('next_chapter_quality_plan') || key.includes('质量续航')) return { label: '质量续航', color: 'gold' }
  if (key.includes('prose_revision_receipt_sync')) return { label: '修订回执', color: 'geekblue' }
  if (key.includes('delivery_risk_receipt')) return { label: '交稿回执', color: 'volcano' }
  if (key.includes('core_drift') || key.includes('delivery_core')) return { label: '核心偏移', color: 'red' }
  if (key.includes('retention')) return { label: '追读', color: 'orange' }
  if (key.includes('payoff')) return { label: '回报欠账', color: 'magenta' }
  if (key.includes('volume_beat')) return { label: '爆点', color: 'gold' }
  if (key.includes('innovation')) return { label: '创新', color: 'geekblue' }
  if (key.includes('signature_scene') || key.includes('强场面')) return { label: '强场面', color: 'volcano' }
  if (key.includes('storyline')) return { label: '剧情线', color: 'purple' }
  if (key.includes('story_drive') || key.includes('故事力')) return { label: '故事力', color: 'blue' }
  if (key.includes('character_arc') || key.includes('人物弧光')) return { label: '人物弧光', color: 'pink' }
  if (key.includes('intent_confirmation') || key.includes('意图确认')) return { label: '意图确认', color: 'blue' }
  if (key.includes('benchmark_recall') || key.includes('文风召回')) return { label: '文风召回', color: 'purple' }
  if (key.includes('source_readiness') || key.includes('来源就绪')) return { label: '来源就绪', color: 'cyan' }
  if (key.includes('state_tracking') || key.includes('状态跟踪')) return { label: '状态跟踪', color: 'blue' }
  if (key.includes('style_sample') || key.includes('风格')) return { label: '风格', color: 'purple' }
  if (key.includes('quality_audit_repair_receipt')) return { label: '质量回执', color: 'gold' }
  if (key.includes('prose_revision_receipt')) return { label: '修订回执', color: 'geekblue' }
  if (key.includes('deslop_repair_receipt')) return { label: '去AI味回执', color: 'cyan' }
  if (key.includes('revision_cascade_impact')) return { label: '级联修订', color: 'geekblue' }
  if (key.includes('revision_scope_guard')) return { label: '修订幅度', color: 'orange' }
  if (key.includes('readability') || key.includes('meme')) return { label: '可读性', color: 'cyan' }
  return { label: '交稿风险', color: 'volcano' }
}

export type RepairClosureHighlight = {
  key: string
  label: string
  color: string
  count: number
  chapterNos: number[]
  issueTypes: string[]
  detail: string
}

export function isResolvedRepairTaskStatus(status: any) {
  return ['resolved', 'closed', 'done', 'completed'].includes(String(status || ''))
}

export function repairClosureIssueMeta(task: any) {
  const explicitIssueType = taskText(task?.issue_type ?? task?.issueType)
  const issueType = repairTaskIssueType(task)
  const category = taskText(task?.annotation_category ?? task?.annotationCategory ?? task?.category)
  const source = taskText(task?.source)
  const key = explicitIssueType ? `${issueType} ${source}` : `${issueType} ${category} ${source}`
  if (isSceneCardDirectiveTask(task)) return { key: 'scene_card_directive', label: '场景卡执行', color: 'volcano' }
  if (issueType === 'next_chapter_quality_plan' || key.includes('next_chapter_quality_plan') || key.includes('质量续航')) return { key: 'next_chapter_quality_plan', label: '质量续航', color: 'gold' }
  if (key.includes('prose_revision_receipt_sync')) return { key: 'prose_revision_receipt_sync', label: '修订回执', color: 'geekblue' }
  if (key.includes('delivery_risk_receipt')) return { key: 'delivery_risk_receipt', label: '交稿回执', color: 'volcano' }
  if (key.includes('core_drift') || key.includes('delivery_core')) return { key: 'core', label: '核心偏移', color: 'red' }
  if (
    key.includes('retention')
    || key.includes('reader_pull')
    || key.includes('reader_expectation')
    || key.includes('opening_handoff')
  ) return { key: 'reader_pull', label: '追读', color: 'magenta' }
  if (key.includes('payoff')) return { key: 'payoff', label: '回报欠账', color: 'magenta' }
  if (key.includes('volume_beat') || key.includes('volume_segment')) return { key: 'volume_beat', label: '爆点', color: 'gold' }
  if (key.includes('safe_batch_expansion_structure_decision') || key.includes('batch_expansion_structure_decision')) return { key: 'batch_expansion_structure_decision', label: '结构决策', color: 'blue' }
  if (key.includes('safe_batch_expansion_structure') || key.includes('batch_expansion_structure')) return { key: 'batch_expansion_structure', label: '扩批结构', color: 'blue' }
  if (key.includes('safe_batch_expansion_segment') || key.includes('batch_expansion_segment')) return { key: 'batch_expansion_segment', label: '扩批分段', color: 'blue' }
  if (key.includes('innovation')) return { key: 'innovation', label: '创新', color: 'geekblue' }
  if (key.includes('signature_scene')) return { key: 'signature_scene', label: '强场面', color: 'volcano' }
  if (key.includes('storyline')) return { key: 'storyline', label: '剧情线', color: 'purple' }
  if (key.includes('story_drive')) return { key: 'story_drive', label: '故事力', color: 'blue' }
  if (key.includes('character_arc')) return { key: 'character_arc', label: '人物弧光', color: 'pink' }
  if (key.includes('intent_confirmation')) return { key: 'intent_confirmation', label: '意图确认', color: 'blue' }
  if (key.includes('benchmark_recall')) return { key: 'benchmark_recall', label: '文风召回', color: 'purple' }
  if (key.includes('source_readiness')) return { key: 'source_readiness', label: '来源就绪', color: 'cyan' }
  if (key.includes('state_tracking')) return { key: 'state_tracking', label: '状态跟踪', color: 'blue' }
  if (key.includes('style_sample')) return { key: 'style_sample', label: '风格', color: 'purple' }
  if (key.includes('recovery_evidence')) return { key: 'recovery_evidence', label: '恢复依据', color: 'purple' }
  if (key.includes('readability') || key.includes('meme') || key.includes('opening_pull') || key.includes('ending_page_turn') || key.includes('scene_progression') || key.includes('payoff_density')) {
    return { key: 'readability', label: '可读性', color: 'cyan' }
  }
  const deliveryMeta = deliveryRiskIssueMeta(task)
  if (deliveryMeta) return { key: issueType || category || 'delivery_risk', ...deliveryMeta }
  return null
}

