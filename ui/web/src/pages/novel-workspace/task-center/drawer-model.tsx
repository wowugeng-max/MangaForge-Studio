import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Drawer, Empty, List, Modal, Popconfirm, Progress, Space, Tag, Typography } from 'antd'
import { PauseCircleOutlined, PlayCircleOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons'
import {
  chapterGroupActionState,
  chapterGroupRunActionState,
  buildChapterAdmissionWarningCards,
  parseJsonValue,
} from './chapter-group'

const { Text, Paragraph } = Typography

export type WorkspaceActiveTask = {
  key: string
  title: string
  phase?: string
  progress?: number
  detail?: string
  cancelLabel?: string
  onCancel?: () => void
}

export function statusTag(status?: string) {
  if (status === 'success' || status === 'ok') return <Tag color="green" bordered={false}>成功</Tag>
  if (status === 'failed' || status === 'error') return <Tag color="red" bordered={false}>失败</Tag>
  if (status === 'running') return <Tag color="blue" bordered={false}>运行中</Tag>
  if (status === 'queued') return <Tag color="cyan" bordered={false}>排队</Tag>
  if (status === 'paused') return <Tag color="gold" bordered={false}>已暂停</Tag>
  if (status === 'needs_approval') return <Tag color="gold" bordered={false}>待确认</Tag>
  if (status === 'completed') return <Tag color="green" bordered={false}>已完成</Tag>
  if (status === 'canceled') return <Tag color="default" bordered={false}>已取消</Tag>
  if (status === 'fallback' || status === 'warn') return <Tag color="gold" bordered={false}>需检查</Tag>
  return <Tag bordered={false}>{status || '未知'}</Tag>
}

export function isDefaultFiveChapterLaneRequirementKey(key: string) {
  return key.startsWith('default_lane_')
}


export function runTypeLabel(type?: string) {
  const map: Record<string, string> = {
    plan: '全案规划',
    creative_command: '创作指令',
    agent_execute: 'Agent 链',
    generate_prose: '正文生成',
    batch_generate_prose: '批量正文生成',
    repair: '连续性修复',
    restructure: '章节重组',
    market_review: '市场审计',
    scene_cards: '场景卡',
    chapter_generation_pipeline: '章节流水线',
    chapter_group_generation: '章节群生成',
    original_incubation: '原创孵化',
    editor_revision: '编辑修订',
    book_review: '全书总检',
    quality_benchmark: '质量基准',
    mechanical_qa: '机械质检',
    mechanical_qa_llm: 'AI机械质检复核',
    mechanical_qa_repair: '机械质检修复',
    first30_retention_diagnosis: '前30章留存诊断',
    first30_retention_repair: '前30章留存修复',
    longform_pressure_test: '300万字压力测试',
    longform_production_repair: '长线生产修复',
    future_100_skeleton: '未来100章骨架',
    future_100_skeleton_apply: '应用未来100章骨架',
    propagation_debt: '传播债务',
    propagation_debt_llm: 'AI传播债务方案',
    regression_benchmark: '回归基准',
    ab_experiment: 'A/B 实验',
    ab_sandbox: 'A/B 沙盒实写',
    ab_sandbox_apply: 'A/B 沙盒采纳',
    rolling_plan: '滚动规划',
    release_repair_queue: '发布修复队列',
    release_quality_batch: '发布质检批量任务',
    release_similarity_batch: '发布相似度批量任务',
    project_backup: '项目备份',
    project_backup_import: '备份导入',
    genre_template_apply: '类型模板',
  }
  return map[String(type || '')] || type || '任务'
}

export function productionModeLabel(mode?: string) {
  const map: Record<string, string> = {
    scene_cards_only: '只场景卡',
    draft_only: '只初稿',
    draft_review: '初稿+自检',
    draft_review_revise_store: '完整流水线',
    full_auto: '全自动',
  }
  return map[String(mode || '')] || mode || ''
}

export function safeJsonPreview(value: any) {
  if (!value) return ''
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  const raw = String(value)
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}



const SAFE_REPAIR_TASK_CATEGORY_ISSUE_TYPES = new Set([
  'benchmark_recall_gap',
  'chapter_attraction_gap',
  'chapter_benchmark_gap',
  'character_arc_gap',
  'core_drift',
  'deslop_repair_receipt',
  'deslop_repair_receipt_sync',
  'innovation_execution_missed',
  'innovation_missed',
  'intent_confirmation_gap',
  'opening_handoff_debt',
  'prose_revision_receipt',
  'prose_revision_receipt_sync',
  'quality_audit_repair_receipt',
  'quality_audit_repair_receipt_sync',
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
  'next_chapter_quality_plan',
  'next_chapter_quality_plan_receipts_gap',
  'write_preparation_receipts_gap',
  'status_filter_receipts_gap',
  'chapter_handoff_gap',
  'core_contract_gap',
  'continuity_heat_gap',
  'revision_receipt_gap',
  'deslop_repair_gap',
  'prose_meta_gap',
  'serial_risk_repair_gap',
  'chapter_hook_quality_gap',
  'title_uniqueness_gap',
  'blueprint_consumption_gap',
  'foreshadowing_delta_gap',
  'deterministic_cleanup_gap',
  'story_state_update_gap',
  'reader_retention_gap',
  'reader_retention_missed',
  'recovery_evidence',
  'recovery_evidence_mismatch',
  'revision_cascade_impact',
  'revision_cascade_impact_sync',
  'revision_scope_guard',
  'revision_scope_guard_sync',
  'scene_card_receipt',
  'scene_card_receipts_gap',
  'delivery_risk_receipts_gap',
  'revision_context_receipts_gap',
  'signature_scene_missed',
  'source_readiness_gap',
  'state_tracking_gap',
  'style_boundary_gap',
  'runway_gap',
  'quality_audit_gap',
  'beat_cooling_gap',
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
  'payoff_setup_gap',
  'spectator_reaction_gap',
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
  'story_unit_sync_risk',
  'storyline_sync_risk',
  'style_sample_gap',
  'volume_beat_missed',
  'volume_segment_missed',
])

const REPAIR_TASK_CATEGORY_ISSUE_TYPE_ALIASES: Record<string, string> = {
  chapter_attraction: 'chapter_attraction_gap',
  chapter_benchmark: 'chapter_benchmark_gap',
  character_arc: 'character_arc_gap',
  delivery_core: 'core_drift',
  innovation: 'innovation_missed',
  pre_draft_execution: 'intent_confirmation_gap',
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
  chapter_handoff: 'chapter_handoff_gap',
  chapter_handoff_sync: 'chapter_handoff_gap',
  title_uniqueness: 'title_uniqueness_gap',
  chapter_title_uniqueness: 'title_uniqueness_gap',
  blueprint_consumption: 'blueprint_consumption_gap',
  chapter_blueprint: 'blueprint_consumption_gap',
  foreshadowing_delta: 'foreshadowing_delta_gap',
  deterministic_cleanup: 'deterministic_cleanup_gap',
  deterministic_prose_cleanup: 'deterministic_cleanup_gap',
  story_state: 'story_state_update_gap',
  story_state_update: 'story_state_update_gap',
  state_delta: 'story_state_update_gap',
  reader_retention: 'reader_retention_missed',
  reader_retention_check: 'reader_retention_gap',
  reader_retention_check_sync: 'reader_retention_gap',
  signature_scene: 'signature_scene_missed',
  write_preparation_receipts: 'write_preparation_receipts_gap',
  source_readiness: 'source_readiness_gap',
  state_tracking: 'state_tracking_gap',
  style_boundary: 'style_boundary_gap',
  information_flow: 'information_flow_gap',
  expectation_threshold: 'expectation_threshold_gap',
  story_loop: 'story_loop_gap',
  emotional_arc: 'emotional_arc_gap',
  chapter_hook: 'chapter_hook_gap',
  paragraph_hook: 'paragraph_hook_gap',
  suspense: 'suspense_gap',
  reversal: 'reversal_gap',
  showdown: 'showdown_gap',
  prose_craft: 'prose_craft_gap',
  payoff_setup: 'payoff_setup_gap',
  spectator_reaction: 'spectator_reaction_gap',
  punctuation_tone: 'punctuation_tone_gap',
  content_rubric: 'content_rubric_gap',
  asset_linkage: 'asset_linkage_gap',
  dialogue: 'dialogue_gap',
  scene_card_receipts: 'scene_card_receipts_gap',
  delivery_risk_receipts: 'delivery_risk_receipts_gap',
  revision_context_receipts: 'revision_context_receipts_gap',
  plot_dynamics: 'plot_dynamics_gap',
  character_relation: 'character_relation_gap',
  character_behavior: 'character_behavior_gap',
  conflict_structure: 'conflict_structure_gap',
  bridge_unit: 'bridge_unit_gap',
  opening: 'opening_gap',
  story_drive: 'story_drive_gap',
  storyline: 'storyline_sync_risk',
  story_unit: 'story_unit_sync_risk',
  style_sample: 'style_sample_gap',
  volume_beat: 'volume_beat_missed',
}

function taskText(value: any) {
  return String(value ?? '').trim()
}

function isNextChapterQualityPlanTask(task: any) {
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
    payload.issue_type,
    payload.issueType,
    payload.message,
    payload.detail,
    payload.reason,
    payload.fix,
  ].map(taskText).filter(Boolean).join(' ')
  return /next_chapter_quality_plan|nextChapterQualityPlan|下一章质量续航计划|质量续航计划缺失|质量续航回执/.test(fields)
}

function qualityPlanItems(value: any, limit = 4) {
  if (Array.isArray(value)) return value.map(item => compactEvidenceText(item, 120)).filter(Boolean).slice(0, limit)
  const single = compactEvidenceText(value, 120)
  return single ? [single] : []
}

function nextChapterQualityPlanFromTask(task: any) {
  const payload = task?.payload && typeof task.payload === 'object' ? task.payload : {}
  const report = task?.report && typeof task.report === 'object' ? task.report : {}
  const deliveryReceipts = task?.oh_story_delivery_receipts
    || task?.ohStoryDeliveryReceipts
    || payload.oh_story_delivery_receipts
    || payload.ohStoryDeliveryReceipts
    || report.oh_story_delivery_receipts
    || report.ohStoryDeliveryReceipts
    || {}
  const candidates = [
    task?.next_chapter_quality_plan,
    task?.nextChapterQualityPlan,
    payload.next_chapter_quality_plan,
    payload.nextChapterQualityPlan,
    report.next_chapter_quality_plan,
    report.nextChapterQualityPlan,
    deliveryReceipts.next_chapter_quality_plan,
    deliveryReceipts.nextChapterQualityPlan,
  ]
  return candidates.find(item => item && typeof item === 'object') || null
}

function nextChapterQualityPlanMissingReason(task: any) {
  return [
    task?.detail,
    task?.message,
    task?.title,
    task?.action,
    task?.summary,
    task?.payload?.detail,
    task?.payload?.message,
    task?.payload?.reason,
    task?.payload?.fix,
  ].map(item => compactEvidenceText(item, 180))
    .find(item => /next_chapter_quality_plan|nextChapterQualityPlan|下一章质量续航计划|质量续航计划缺失|质量续航回执/.test(item)) || ''
}

export function buildNextChapterQualityPlanPreview(task: any): {
  visible: boolean
  label: string
  qualityFocus: string[]
  openingActions: string[]
  middleActions: string[]
  endingActions: string[]
  avoidRepetition: string[]
  evidenceBasis: string[]
  missingReason: string
} | null {
  const plan = nextChapterQualityPlanFromTask(task)
  const preview = {
    visible: true,
    label: '质量续航计划',
    qualityFocus: qualityPlanItems(plan?.quality_focus || plan?.qualityFocus),
    openingActions: qualityPlanItems(plan?.opening_actions || plan?.openingActions),
    middleActions: qualityPlanItems(plan?.middle_actions || plan?.middleActions),
    endingActions: qualityPlanItems(plan?.ending_actions || plan?.endingActions),
    avoidRepetition: qualityPlanItems(plan?.avoid_repetition || plan?.avoidRepetition || plan?.forbidden_repeats || plan?.forbiddenRepeats),
    evidenceBasis: qualityPlanItems(plan?.evidence_basis || plan?.evidenceBasis),
    missingReason: plan ? '' : nextChapterQualityPlanMissingReason(task),
  }
  const hasPlanContent = preview.qualityFocus.length
    || preview.openingActions.length
    || preview.middleActions.length
    || preview.endingActions.length
    || preview.avoidRepetition.length
    || preview.evidenceBasis.length
  if (!hasPlanContent && !preview.missingReason && !isNextChapterQualityPlanTask(task)) return null
  return preview
}

export function repairTaskIssueType(task: any) {
  if (isNextChapterQualityPlanTask(task)) return 'next_chapter_quality_plan'
  const explicit = taskText(task?.issue_type ?? task?.issueType)
  if (explicit) return explicit
  const category = taskText(task?.annotation_category ?? task?.annotationCategory ?? task?.category)
  if (REPAIR_TASK_CATEGORY_ISSUE_TYPE_ALIASES[category]) return REPAIR_TASK_CATEGORY_ISSUE_TYPE_ALIASES[category]
  return SAFE_REPAIR_TASK_CATEGORY_ISSUE_TYPES.has(category) ? category : ''
}

function isSceneCardDirectiveTask(task: any) {
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

function deliveryRiskIssueMeta(task: any) {
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

function isResolvedRepairTaskStatus(status: any) {
  return ['resolved', 'closed', 'done', 'completed'].includes(String(status || ''))
}

function repairClosureIssueMeta(task: any) {
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

export function compactChapterNos(chapterNos: number[]) {
  if (!chapterNos.length) return '相关章节'
  return `第${chapterNos.slice(0, 6).join('、')}章${chapterNos.length > 6 ? `等${chapterNos.length}章` : ''}`
}

export function normalizeChapterNos(value: any) {
  return (Array.isArray(value) ? value : [])
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => Number.isFinite(chapterNo) && chapterNo > 0)
}

function postBatchQualityStatusMeta(status?: string) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'ok' || normalized === 'success' || normalized === 'passed') return { status: 'ok', label: '通过', color: 'green' }
  if (normalized === 'warn' || normalized === 'warning' || normalized === 'needs_review') return { status: 'warn', label: '需复核', color: 'gold' }
  if (normalized === 'failed' || normalized === 'error') return { status: 'failed', label: '失败', color: 'red' }
  return { status: normalized || 'unknown', label: '未确认', color: 'default' }
}

function postBatchQualityChapterText(chapterNos: number[]) {
  if (!chapterNos.length) return '相关章节'
  const sorted = [...new Set(chapterNos)].sort((a, b) => a - b)
  const continuous = sorted.every((chapterNo, index) => index === 0 || chapterNo === sorted[index - 1] + 1)
  if (continuous && sorted.length > 1) return `第${sorted[0]}-${sorted[sorted.length - 1]}章`
  return compactChapterNos(sorted)
}

export function buildPostBatchQualityCheckSummary(run: any = {}) {
  const output = parseJsonValue(run.output_ref || run.outputRef) || run.payload || {}
  const raw = output.post_batch_quality_check || output.postBatchQualityCheck
  if (!raw || typeof raw !== 'object') return null
  const checks = (Array.isArray(raw.checks) ? raw.checks : []).map((check: any) => {
    const meta = postBatchQualityStatusMeta(check?.status)
    const warningCount = Number(check?.warn_count ?? check?.warnCount ?? 0) || (meta.status === 'warn' ? 1 : 0)
    return {
      key: String(check?.key || ''),
      label: String(check?.label || check?.key || '检查项'),
      status: meta.status,
      statusLabel: meta.label,
      statusColor: meta.color,
      checkedCount: Number(check?.checked_count ?? check?.checkedCount ?? 0) || 0,
      warningCount,
      unknownCount: Number(check?.unknown_count ?? check?.unknownCount ?? 0) || 0,
      summaries: (Array.isArray(check?.summaries) ? check.summaries : [])
        .map((item: any) => String(item || '').trim())
        .filter(Boolean),
    }
  }).filter((check: any) => check.key || check.label)
  const meta = postBatchQualityStatusMeta(raw.status)
  const chapterNos = normalizeChapterNos(raw.chapter_nos || raw.chapterNos)
  return {
    visible: true,
    title: '批次质检',
    source: String(raw.source || ''),
    status: meta.status,
    statusLabel: meta.label,
    statusColor: meta.color,
    completedCount: Number(raw.completed_count ?? raw.completedCount ?? chapterNos.length) || 0,
    chapterNos,
    chapterText: postBatchQualityChapterText(chapterNos),
    revisedCount: Number(raw.revised_count ?? raw.revisedCount ?? 0) || 0,
    averageScore: Number.isFinite(Number(raw.average_score ?? raw.averageScore)) ? Number(raw.average_score ?? raw.averageScore) : null,
    warningCount: checks.reduce((sum: number, check: any) => sum + (Number(check.warningCount) || 0), 0),
    checks,
  }
}

export type ProductionRelapseCtaExecutionSnapshot = {
  visible: boolean
  source: string
  kind: string
  label: string
  templateVersionId: string
  defaultBatchChapterNos: number[]
  validationChapterNos: number[]
  clearedFailureReasons: string[]
  remainingFailureReasons: string[]
  targetChapterCount: number
  summary: string
}

export function buildProductionRelapseCtaExecutionSnapshot(batchPreflight: any): ProductionRelapseCtaExecutionSnapshot | null {
  const raw = batchPreflight?.production_relapse_cta_execution
    || batchPreflight?.productionRelapseCtaExecution
    || batchPreflight
    || null
  if (!raw || typeof raw !== 'object') return null
  const source = compactEvidenceText(raw.source)
  const kind = compactEvidenceText(raw.kind)
  const label = compactEvidenceText(raw.label || kind || '生产后验 CTA')
  const templateVersionId = compactEvidenceText(raw.template_version_id || raw.templateVersionId)
  const clearedFailureReasons = normalizeEvidenceTextList(raw.cleared_failure_reasons || raw.clearedFailureReasons)
  const remainingFailureReasons = normalizeEvidenceTextList(raw.remaining_failure_reasons || raw.remainingFailureReasons)
  const defaultBatchChapterNos = normalizeChapterNos(raw.default_batch_chapter_nos || raw.defaultBatchChapterNos)
  const validationChapterNos = normalizeChapterNos(raw.validation_chapter_nos || raw.validationChapterNos)
  const targetChapterCount = Number(raw.target_chapter_count || raw.targetChapterCount || 0)
  const hasEvidence = Boolean(source || kind || label || templateVersionId || clearedFailureReasons.length || remainingFailureReasons.length || defaultBatchChapterNos.length || validationChapterNos.length || targetChapterCount)
  if (!hasEvidence) return null
  return {
    visible: true,
    source,
    kind,
    label,
    templateVersionId,
    defaultBatchChapterNos,
    validationChapterNos,
    clearedFailureReasons,
    remainingFailureReasons,
    targetChapterCount: Number.isFinite(targetChapterCount) ? targetChapterCount : 0,
    summary: `生产后验 CTA：${label}；模板 ${templateVersionId || '当前模板'}；已修复 ${clearedFailureReasons.length ? clearedFailureReasons.join('、') : '无'}；剩余 ${remainingFailureReasons.length ? remainingFailureReasons.join('、') : '无'}。`,
  }
}

export function normalizeEvidenceTextList(value: any) {
  return (Array.isArray(value) ? value : [])
    .map((item: any) => compactEvidenceText(item))
    .filter(Boolean)
}

export function buildRepairClosureHighlights(tasks: any[], audit?: any | null): RepairClosureHighlight[] {
  const groups = new Map<string, {
    label: string
    color: string
    chapterNos: Set<number>
    issueTypes: Set<string>
    count: number
  }>()

  for (const task of Array.isArray(tasks) ? tasks : []) {
    if (!isResolvedRepairTaskStatus(task?.task_status ?? task?.status)) continue
    const meta = repairClosureIssueMeta(task)
    if (!meta) continue
    const group = groups.get(meta.key) || {
      label: meta.label,
      color: meta.color,
      chapterNos: new Set<number>(),
      issueTypes: new Set<string>(),
      count: 0,
    }
    const chapterNo = Number(task?.chapter_no || task?.chapterNo || 0)
    if (Number.isFinite(chapterNo) && chapterNo > 0) group.chapterNos.add(chapterNo)
    const issueType = repairTaskIssueType(task) || String(task?.annotation_category || task?.annotationCategory || meta.key || '')
    if (issueType) group.issueTypes.add(issueType)
    group.count += 1
    groups.set(meta.key, group)
  }

  const auditClosed = String(audit?.status || '') === 'closed'
  return Array.from(groups.entries())
    .map(([key, group]) => {
      const chapterNos = Array.from(group.chapterNos).sort((a, b) => a - b)
      const issueTypes = Array.from(group.issueTypes)
      return {
        key,
        label: `${group.label}风险已清`,
        color: group.color,
        count: group.count,
        chapterNos,
        issueTypes,
        detail: `${compactChapterNos(chapterNos)} ${group.label}风险已处理，${auditClosed ? '修复审计已闭环' : '可等待或继续执行复检收敛'}。`,
      }
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 6)
}

export function buildRepairTaskIssueTagMeta(_task: any): { label: string; color: string } | null {
  const task = _task || {}
  const issueType = repairTaskIssueType(task)
  if (isSceneCardDirectiveTask(task)) return { label: '场景卡执行', color: 'volcano' }
  if (issueType === 'batch_brief_mismatch') return { label: '批次计划', color: 'purple' }
  if (['recovery_evidence_mismatch', 'recovery_evidence_governance_queue'].includes(issueType)) return { label: '恢复依据', color: 'purple' }
  if (issueType === 'style_sample_task_book_rebuild') return { label: '样章任务书', color: 'purple' }
  if (String(task?.source || '') === 'reader_trial_review' || issueType === 'reader_trial_drop_point') return { label: '读者试读', color: 'red' }
  if (issueType === 'volume_segment_missed') return { label: '卷级阶段', color: 'gold' }
  if (issueType === 'safe_batch_expansion_structure_decision_mismatch') return { label: '扩批结构决策', color: 'blue' }
  if (issueType === 'safe_batch_expansion_structure_repair') return { label: '扩批结构', color: 'blue' }
  if (issueType === 'safe_batch_expansion_segment_hotspot') return { label: '扩批分段', color: 'blue' }
  if (issueType === 'reader_pull_missed') return { label: '读者拉力', color: 'magenta' }
  if (issueType === 'target_reader_gap') return { label: '目标读者', color: 'magenta' }
  if (issueType === 'genre_positioning_gap') return { label: '题材定位', color: 'purple' }
  if (issueType === 'female_audience_gap') return { label: '女频长篇', color: 'magenta' }
  if (issueType === 'upgrade_rhythm_gap') return { label: '升级节奏', color: 'gold' }
  if (issueType === 'chapter_structure_gap') return { label: '章节结构', color: 'blue' }
  if (issueType === 'chapter_progression_gap') return { label: '章节推进', color: 'gold' }
  if (issueType === 'information_load_gap') return { label: '信息负载', color: 'cyan' }
  if (issueType === 'longform_continuity_gap') return { label: '长篇连续性', color: 'blue' }
  if (issueType === 'next_chapter_quality_plan') return { label: '质量续航', color: 'gold' }
  if (issueType === 'write_preparation_receipts_gap') return { label: '写前准备', color: 'cyan' }
  if (issueType === 'status_filter_receipts_gap') return { label: '状态筛选', color: 'blue' }
  if (issueType === 'core_contract_gap') return { label: '核心契约', color: 'red' }
  if (issueType === 'continuity_heat_gap') return { label: '连续性热度', color: 'orange' }
  if (issueType === 'revision_receipt_gap') return { label: '修订回执', color: 'purple' }
  if (issueType === 'deslop_repair_gap') return { label: '去AI味修复', color: 'red' }
  if (issueType === 'prose_meta_gap') return { label: '正文元叙事', color: 'red' }
  if (issueType === 'serial_risk_repair_gap') return { label: '连续风险修复', color: 'gold' }
  if (issueType === 'chapter_hook_quality_gap') return { label: '章钩质量', color: 'orange' }
  if (issueType === 'title_uniqueness_gap') return { label: '标题去重', color: 'blue' }
  if (issueType === 'blueprint_consumption_gap') return { label: '细纲兑现', color: 'gold' }
  if (issueType === 'foreshadowing_delta_gap') return { label: '伏笔增量', color: 'purple' }
  if (issueType === 'deterministic_cleanup_gap') return { label: '确定性清理', color: 'red' }
  if (issueType === 'story_state_update_gap') return { label: '状态写回', color: 'cyan' }
  if (issueType === 'reader_retention_gap') return { label: '追读雷达', color: 'orange' }
  if (issueType === 'reader_retention_missed') return { label: '追读', color: 'orange' }
  if (issueType === 'intent_confirmation_gap') return { label: '意图确认', color: 'blue' }
  if (issueType === 'benchmark_recall_gap') return { label: '文风召回', color: 'purple' }
  if (issueType === 'style_sample_gap') return { label: '风格', color: 'purple' }
  if (issueType === 'chapter_handoff_gap') return { label: '章首承接', color: 'gold' }
  if (issueType === 'source_readiness_gap') return { label: '来源就绪', color: 'cyan' }
  if (issueType === 'state_tracking_gap') return { label: '状态跟踪', color: 'blue' }
  if (issueType === 'style_boundary_gap') return { label: '风格边界', color: 'purple' }
  if (issueType === 'story_drive_gap') return { label: '故事驱动力', color: 'blue' }
  if (issueType === 'character_arc_gap') return { label: '人物弧光', color: 'pink' }
  if (issueType === 'runway_gap') return { label: '连载航线', color: 'gold' }
  if (issueType === 'quality_audit_gap') return { label: '质量诊断', color: 'gold' }
  if (issueType === 'beat_cooling_gap') return { label: '冷却节奏', color: 'cyan' }
  if (issueType === 'reader_expectation_debt') return { label: '读者期待', color: 'gold' }
  if (issueType === 'reader_payoff_debt') return { label: '读者回报', color: 'orange' }
  if (issueType === 'information_flow_gap') return { label: '信息流', color: 'geekblue' }
  if (issueType === 'expectation_threshold_gap') return { label: '期待阈值', color: 'gold' }
  if (issueType === 'story_loop_gap') return { label: '故事闭环', color: 'cyan' }
  if (issueType === 'emotional_arc_gap') return { label: '情绪弧', color: 'magenta' }
  if (issueType === 'chapter_hook_gap') return { label: '章级钩子', color: 'gold' }
  if (issueType === 'paragraph_hook_gap') return { label: '段落级钩子', color: 'lime' }
  if (issueType === 'suspense_gap') return { label: '悬念编排', color: 'volcano' }
  if (issueType === 'reversal_gap') return { label: '反转设计', color: 'volcano' }
  if (issueType === 'showdown_gap') return { label: '高潮对抗', color: 'red' }
  if (issueType === 'prose_craft_gap') return { label: '正文工艺', color: 'purple' }
  if (issueType === 'payoff_setup_gap') return { label: '爽点铺垫', color: 'gold' }
  if (issueType === 'spectator_reaction_gap') return { label: '围观反应', color: 'magenta' }
  if (issueType === 'punctuation_tone_gap') return { label: '语气标点', color: 'geekblue' }
  if (issueType === 'content_rubric_gap') return { label: '内容基准', color: 'orange' }
  if (issueType === 'asset_linkage_gap') return { label: '资产挂钩', color: 'cyan' }
  if (issueType === 'dialogue_gap') return { label: '对白质量', color: 'blue' }
  if (issueType === 'scene_card_receipts_gap') return { label: '场景回执', color: 'volcano' }
  if (issueType === 'delivery_risk_receipts_gap') return { label: '交稿回执', color: 'volcano' }
  if (issueType === 'revision_context_receipts_gap') return { label: '修订上下文', color: 'geekblue' }
  if (issueType === 'plot_dynamics_gap') return { label: '剧情动力', color: 'geekblue' }
  if (issueType === 'character_relation_gap') return { label: '角色关系', color: 'purple' }
  if (issueType === 'character_behavior_gap') return { label: '角色行为', color: 'magenta' }
  if (issueType === 'conflict_structure_gap') return { label: '冲突结构', color: 'red' }
  if (issueType === 'bridge_unit_gap') return { label: '桥段节奏', color: 'gold' }
  if (issueType === 'opening_gap') return { label: '开篇设计', color: 'orange' }
  if (issueType === 'innovation_execution_missed' || issueType === 'innovation_missed') return { label: '创新/IP', color: 'geekblue' }
  if (String(task?.source || '') === 'rolling_script_room' || issueType === 'script_room_layer_gap') return { label: '剧本室', color: 'blue' }
  if (String(task?.source || '') === 'storyline_diff_decision') return { label: '剧情线决策', color: 'purple' }
  const meta = deliveryRiskIssueMeta(task)
  return meta ? { label: meta.label, color: meta.color } : null
}

export function repairTaskIssueTag(task: any) {
  const meta = buildRepairTaskIssueTagMeta(task)
  if (!meta) return null
  return <Tag color={meta.color} bordered={false}>{meta.label}</Tag>
}


export function compactEvidenceText(value: any, maxLength?: number) {
  if (!value) return ''
  const raw = typeof value !== 'object'
    ? String(value)
    : String(value.name || value.label || value.title || value.text || value.description || value.reason || value.message || '').trim()
  return maxLength && raw.length > maxLength ? `${raw.slice(0, maxLength)}...` : raw
}

export * from './drawer-default-lane'
export * from './drawer-task-run-card'
export * from './drawer-previews'
export * from './drawer-recovery-evidence'
export * from './drawer-safe-batch'
export * from './drawer-snapshots'
