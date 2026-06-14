import React, { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Drawer, Empty, List, Modal, Popconfirm, Progress, Space, Tag, Typography } from 'antd'
import { PauseCircleOutlined, PlayCircleOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons'

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

function statusTag(status?: string) {
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

function runTypeLabel(type?: string) {
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

function productionModeLabel(mode?: string) {
  const map: Record<string, string> = {
    scene_cards_only: '只场景卡',
    draft_only: '只初稿',
    draft_review: '初稿+自检',
    draft_review_revise_store: '完整流水线',
    full_auto: '全自动',
  }
  return map[String(mode || '')] || mode || ''
}

function safeJsonPreview(value: any) {
  if (!value) return ''
  if (typeof value === 'object') return JSON.stringify(value, null, 2)
  const raw = String(value)
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function parseJsonValue(value: any) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(String(value))
  } catch {
    return null
  }
}

function isSingleChapterRecoveryEvidenceTask(task: any) {
  if (String(task?.issue_type || '') !== 'recovery_evidence_mismatch') return false
  const source = String(task?.source || '')
  const annotationSource = String(task?.annotation_source || task?.annotationSource || '')
  return source === 'review_annotation_risk' || annotationSource === 'governance_recheck_sync'
}

export function repairTaskActionLabel(task: any) {
  if (String(task?.issue_type || '') === 'batch_brief_mismatch') return '按批次修订'
  if (String(task?.issue_type || '') === 'recovery_evidence_governance_queue') {
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
  if (String(task?.issue_type || '') === 'recovery_evidence_mismatch') {
    return isSingleChapterRecoveryEvidenceTask(task) ? '回修依据' : '按批次修订'
  }
  if (String(task?.issue_type || '') === 'style_sample_task_book_rebuild') return '重审样章'
  if (String(task?.source || '') === 'reader_trial_review' || String(task?.issue_type || '') === 'reader_trial_drop_point') return '补试读'
  if (String(task?.issue_type || '') === 'volume_segment_missed') return '补阶段结算'
  if (String(task?.issue_type || '') === 'safe_batch_expansion_structure_decision_mismatch') return '查结构决策'
  if (String(task?.issue_type || '') === 'safe_batch_expansion_structure_repair') return '改扩批结构'
  if (String(task?.issue_type || '') === 'safe_batch_expansion_segment_hotspot') return '修扩批热区'
  if (String(task?.issue_type || '') === 'reader_pull_missed') return '补追读'
  if (String(task?.issue_type || '') === 'innovation_execution_missed') return '补创新'
  if (String(task?.source || '') === 'rolling_script_room' || String(task?.issue_type || '') === 'script_room_layer_gap') return '按剧本室修复'
  if (String(task?.source || '') === 'storyline_diff_decision' && String(task?.issue_type || '') === 'storyline_diff_accept_as_plan') return '同步计划'
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
  const issueType = String(task?.issue_type || '')
  const category = String(task?.annotation_category || '')
  const key = `${issueType} ${category}`
  if (key.includes('core_drift') || key.includes('delivery_core')) return { label: '核心偏移', color: 'red' }
  if (key.includes('retention')) return { label: '追读', color: 'orange' }
  if (key.includes('payoff')) return { label: '回报欠账', color: 'magenta' }
  if (key.includes('volume_beat')) return { label: '爆点', color: 'gold' }
  if (key.includes('innovation')) return { label: '创新', color: 'geekblue' }
  if (key.includes('signature_scene') || key.includes('强场面')) return { label: '强场面', color: 'volcano' }
  if (key.includes('storyline')) return { label: '剧情线', color: 'purple' }
  if (key.includes('story_drive') || key.includes('故事力')) return { label: '故事力', color: 'blue' }
  if (key.includes('character_arc') || key.includes('人物弧光')) return { label: '人物弧光', color: 'pink' }
  if (key.includes('style_sample') || key.includes('风格')) return { label: '风格', color: 'purple' }
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
  const issueType = String(task?.issue_type || '')
  const category = String(task?.annotation_category || '')
  const source = String(task?.source || '')
  const key = `${issueType} ${category} ${source}`
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
  if (key.includes('style_sample')) return { key: 'style_sample', label: '风格', color: 'purple' }
  if (key.includes('recovery_evidence')) return { key: 'recovery_evidence', label: '恢复依据', color: 'purple' }
  if (key.includes('readability') || key.includes('meme') || key.includes('opening_pull') || key.includes('ending_page_turn') || key.includes('scene_progression') || key.includes('payoff_density')) {
    return { key: 'readability', label: '可读性', color: 'cyan' }
  }
  const deliveryMeta = deliveryRiskIssueMeta(task)
  if (deliveryMeta) return { key: issueType || 'delivery_risk', ...deliveryMeta }
  return null
}

function compactChapterNos(chapterNos: number[]) {
  if (!chapterNos.length) return '相关章节'
  return `第${chapterNos.slice(0, 6).join('、')}章${chapterNos.length > 6 ? `等${chapterNos.length}章` : ''}`
}

function normalizeChapterNos(value: any) {
  return (Array.isArray(value) ? value : [])
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => Number.isFinite(chapterNo) && chapterNo > 0)
}

function normalizeEvidenceTextList(value: any) {
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
    const issueType = String(task?.issue_type || task?.annotation_category || meta.key || '')
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

export type RecoveryEvidenceAuditNextAction = {
  action: 'revision' | 'focus_task' | 'recheck_single_chapter' | 'recheck_safe_batch' | 'review_governance_closure' | ''
  label: string
  source: string
  sourceLabel: string
  taskIndex: number | null
  residualEvidence: string[]
}

export type RecoveryEvidenceAuditSourceGroup = {
  source: string
  label: string
  count: number
  taskIndexes: number[]
  chapterNos: number[]
  recheckAction: string
  recheckLabel: string
  resultStatus: 'closed' | 'needs_followup' | 'pending'
  resultLabel: string
  latestSummary: string
  residualEvidence: string[]
  residualAction: string
  residualActionLabel: string
  productionBlockStatus: 'cleared' | 'blocked' | 'pending'
  productionBlockLabel: string
  productionBlockDetail: string
}

export type RecoveryEvidenceAuditView = {
  status: 'closed' | 'needs_followup'
  label: string
  total: number
  resolved: number
  sourceSummary: string
  sourceGroups: RecoveryEvidenceAuditSourceGroup[]
  nextAction: RecoveryEvidenceAuditNextAction | null
  sourceRunId: any
  memoryLabel: string
  memorySummary: string
  failedEvidence: string[]
  repairedEvidence: string[]
  watchItems: string[]
  relatedTasks: {
    chapterId: number | null
    chapterNo: number | null
    taskIndex: number | null
    source: string
    sourceLabel: string
    status: string
    title: string
    summary: string
  }[]
}

function compactAuditList(values: any[], limit = 8) {
  return Array.from(new Set(values.map(item => compactEvidenceText(item)).filter(Boolean))).slice(0, limit)
}

function recoveryEvidenceSourceSummary(closure: any) {
  const tasks = Array.isArray(closure?.tasks) ? closure.tasks : []
  const singleChapterCount = Number(closure?.single_chapter_count ?? closure?.singleChapterCount ?? 0)
    || tasks.filter((task: any) => String(task?.source || task?.sourceMode || '') === 'single_chapter_governance_recheck').length
  const batchCount = Number(closure?.batch_count ?? closure?.batchCount ?? 0)
    || tasks.filter((task: any) => String(task?.source || task?.sourceMode || '') === 'safe_batch_recovery_recheck').length
  const genericCount = Math.max(0, Number(closure?.total || 0) - singleChapterCount - batchCount)
  return [
    singleChapterCount > 0 ? `单章治理复查 ${singleChapterCount}` : '',
    batchCount > 0 ? `批次恢复复查 ${batchCount}` : '',
    genericCount > 0 ? `恢复依据复查 ${genericCount}` : '',
  ].filter(Boolean).join('；')
}

function recoveryEvidenceTaskSourceMeta(task: any) {
  const source = String(task?.source || task?.sourceMode || '')
  const sourceLabel = compactEvidenceText(task?.source_label || task?.sourceLabel || '')
  if (source === 'single_chapter_governance_recheck') return { source, label: sourceLabel || '单章治理复查' }
  if (source === 'safe_batch_recovery_recheck') return { source, label: sourceLabel || '批次恢复复查' }
  if (isSingleChapterRecoveryEvidenceTask(task)) return { source: 'single_chapter_governance_recheck', label: '单章治理复查' }
  if (String(task?.source || '') === 'auto_creation_safe_batch_risk' || task?.segment) return { source: 'safe_batch_recovery_recheck', label: '批次恢复复查' }
  return { source: 'recovery_evidence_recheck', label: sourceLabel || '恢复依据复查' }
}

export function recoveryEvidenceSourceRecheckAction(source: any) {
  const key = String(source || '')
  if (key === 'single_chapter_governance_recheck') {
    return { action: 'single_chapter_governance_recheck', label: '复检单章' }
  }
  if (key === 'safe_batch_recovery_recheck') {
    return { action: 'safe_batch_recovery_recheck', label: '复盘批次' }
  }
  return { action: '', label: '' }
}

function recoveryEvidenceReviewOfTask(task: any) {
  return task?.recovery_evidence_review || task?.recoveryEvidenceReview || {}
}

function recoveryEvidenceFailedTexts(review: any) {
  const failedItems = [
    ...(Array.isArray(review?.failed_items) ? review.failed_items : []),
    ...(Array.isArray(review?.failedItems) ? review.failedItems : []),
  ]
  return compactAuditList([
    ...(Array.isArray(review?.failed_evidence) ? review.failed_evidence : []),
    ...(Array.isArray(review?.failedEvidence) ? review.failedEvidence : []),
    ...failedItems.map((item: any) => item?.evidence || item),
  ], 6)
}

export type RecoveryEvidenceReviewRow = {
  evidence: string
  riskLabels: string[]
  source: string
  sourceLabel: string
  sourceDetail: string
  sourceAction: string
  sourceActionLabel: string
  productionGateSource: string
}

export type RecoveryEvidenceReviewRowAction = {
  action: 'recheck_single_chapter' | 'recheck_safe_batch' | 'review_governance_closure' | 'execute_typed_repair' | ''
  label: string
  focusSource: string
}

export type RecoveryEvidenceReviewActionFeedback = {
  statusLabel: string
  triggeredAt: string
  closureCondition: string
  detail: string
}

export type RecoveryEvidenceReviewRefreshAnchor = {
  feedbackKey: string
  taskIndex: number
  sourceTaskIndex: number | null
  focusSource: string
  refreshedAt: string
  statusLabel: '已刷新结果'
}

type RepairTaskActionOptions = {
  keepTaskCenterOpen?: boolean
}

function recoveryEvidenceReviewSourceLabel(source: string) {
  if (source === 'recovery_evidence') return '恢复放行依据'
  if (source === 'governance_recheck_memory') return '治理复查记忆'
  if (source === 'recovery_evidence_production_gate') return '入口生产闸门'
  if (source === 'storyline_decision_closure') return '剧情线决策闭环'
  if (source === 'single_chapter_governance_recheck') return '单章治理复查'
  if (source === 'safe_batch_recovery_recheck') return '批次恢复复查'
  return ''
}

function recoveryEvidenceReviewFallbackSource(evidence: string, task: any) {
  if (evidence.includes('生产阻断已解除')) return 'recovery_evidence_production_gate'
  if (isSingleChapterRecoveryEvidenceTask(task)) return 'single_chapter_governance_recheck'
  return ''
}

export function buildRecoveryEvidenceReviewRows(task: any): RecoveryEvidenceReviewRow[] {
  const recoveryEvidenceReview = task?.recovery_evidence_review || task?.recoveryEvidenceReview || null
  const failedItems = [
    ...(Array.isArray(recoveryEvidenceReview?.failed_items) ? recoveryEvidenceReview.failed_items : []),
    ...(Array.isArray(recoveryEvidenceReview?.failedItems) ? recoveryEvidenceReview.failedItems : []),
  ]
  const failedEvidence = [
    ...(Array.isArray(recoveryEvidenceReview?.failed_evidence) ? recoveryEvidenceReview.failed_evidence : []),
    ...(Array.isArray(recoveryEvidenceReview?.failedEvidence) ? recoveryEvidenceReview.failedEvidence : []),
  ]
  const rows = failedItems.length > 0
    ? failedItems.map((item: any) => {
      const evidence = compactEvidenceText(item?.evidence || item)
      const source = String(item?.source || item?.sourceMode || recoveryEvidenceReviewFallbackSource(evidence, task))
      const sourceLabel = compactEvidenceText(item?.source_label || item?.sourceLabel || recoveryEvidenceReviewSourceLabel(source))
      return {
        evidence,
        riskLabels: Array.isArray(item?.risk_labels) ? item.risk_labels : Array.isArray(item?.riskLabels) ? item.riskLabels : [],
        source,
        sourceLabel,
        sourceDetail: compactEvidenceText(item?.source_detail || item?.sourceDetail || ''),
        sourceAction: compactEvidenceText(item?.source_action || item?.sourceAction || ''),
        sourceActionLabel: compactEvidenceText(item?.source_action_label || item?.sourceActionLabel || ''),
        productionGateSource: compactEvidenceText(item?.production_gate_source || item?.productionGateSource || ''),
      }
    })
    : failedEvidence.map((item: any) => {
      const evidence = compactEvidenceText(item)
      const source = recoveryEvidenceReviewFallbackSource(evidence, task)
      return {
        evidence,
        riskLabels: [],
        source,
        sourceLabel: recoveryEvidenceReviewSourceLabel(source),
        sourceDetail: '',
        sourceAction: '',
        sourceActionLabel: '',
        productionGateSource: '',
      }
    })
  return rows.filter(item => item.evidence)
}

function recoveryEvidenceRegovernanceQueueOfTask(task: any) {
  if (String(task?.issue_type || '') !== 'recovery_evidence_mismatch') return null
  const queue = task?.recovery_evidence_regovernance_queue
    || task?.recoveryEvidenceRegovernanceQueue
    || task?.recoveryEvidenceGovernanceQueue
    || null
  const tasks = Array.isArray(queue?.tasks) ? queue.tasks : []
  return tasks.length > 0 ? queue : null
}

export function buildRecoveryEvidenceRegovernanceSummary(task: any) {
  const queue = recoveryEvidenceRegovernanceQueueOfTask(task)
  if (!queue) return null
  const tasks = Array.isArray(queue.tasks) ? queue.tasks : []
  const actionLabels = Array.from(new Set(tasks
    .map((item: any) => compactEvidenceText(item?.action_label || item?.actionLabel || ''))
    .filter(Boolean)))
  return {
    label: compactEvidenceText(queue.label || '安全连写放行摘要再治理'),
    summary: compactEvidenceText(queue.summary || '', 200),
    taskCount: Number(queue.task_count || queue.taskCount || tasks.length || 0),
    actionLabel: '生成再治理队列',
    actionLabels,
  }
}

export function buildRecoveryEvidenceReviewRowAction(row: RecoveryEvidenceReviewRow): RecoveryEvidenceReviewRowAction {
  const action = String(row.sourceAction || '')
  const productionGateSource = String(row.productionGateSource || '')
  if (row.source === 'recovery_evidence_production_gate') {
    if (productionGateSource === 'single_chapter_governance_recheck' || action === 'single_chapter_governance_recheck') {
      return { action: 'recheck_single_chapter', label: row.sourceActionLabel || '复检单章', focusSource: 'single_chapter_governance_recheck' }
    }
    if (productionGateSource === 'safe_batch_recovery_recheck' || action === 'safe_batch_recovery_recheck') {
      return { action: 'recheck_safe_batch', label: row.sourceActionLabel || '复盘批次', focusSource: 'safe_batch_recovery_recheck' }
    }
  }
  if (row.source === 'governance_recheck_memory' || action === 'review_governance_closure') {
    return { action: 'review_governance_closure', label: row.sourceActionLabel || '治理复查台', focusSource: '' }
  }
  if (row.source === 'recovery_evidence' || action === 'create_safe_batch_risk_repair') {
    return { action: 'execute_typed_repair', label: row.sourceActionLabel || '按批次修订', focusSource: '' }
  }
  return { action: '', label: '', focusSource: '' }
}

export function buildRecoveryEvidenceReviewActionFeedbackKey(
  taskIndex: number,
  row: RecoveryEvidenceReviewRow,
  rowAction: RecoveryEvidenceReviewRowAction,
) {
  return [
    taskIndex,
    row.source,
    row.productionGateSource,
    rowAction.action,
    row.evidence,
  ].join('|')
}

export function buildRecoveryEvidenceReviewActionFeedback(
  rowAction: RecoveryEvidenceReviewRowAction,
  triggeredAt: string,
): RecoveryEvidenceReviewActionFeedback {
  const label = rowAction.label || '处理'
  const closureCondition = rowAction.action === 'recheck_single_chapter'
    ? '关闭条件：单章复查为 ok 或 failed_evidence 为空。'
    : rowAction.action === 'recheck_safe_batch'
      ? '关闭条件：长线生产修复审计重新生成，来源行显示生产阻断已解除。'
      : rowAction.action === 'review_governance_closure'
        ? '关闭条件：恢复依据审计闭环，治理复查记忆不再列出当前失效依据。'
        : rowAction.action === 'execute_typed_repair'
          ? '关闭条件：完成批次修订并重新运行批次交稿复盘，recovery_evidence_review 为 ok。'
          : '关闭条件：等待对应复检或修订结果回填。'
  return {
    statusLabel: `已触发${label}`,
    triggeredAt,
    closureCondition,
    detail: `最近动作：${label} · ${triggeredAt} · 已触发，等待复检结果回填。`,
  }
}

export function buildRecoveryEvidenceReviewRefreshAnchor({
  taskIndex,
  row,
  rowAction,
  sourceTaskIndex,
  refreshedAt,
}: {
  taskIndex: number
  row: RecoveryEvidenceReviewRow
  rowAction: RecoveryEvidenceReviewRowAction
  sourceTaskIndex?: number | null
  refreshedAt: string
}): RecoveryEvidenceReviewRefreshAnchor {
  return {
    feedbackKey: buildRecoveryEvidenceReviewActionFeedbackKey(taskIndex, row, rowAction),
    taskIndex,
    sourceTaskIndex: sourceTaskIndex ?? null,
    focusSource: rowAction.focusSource || '',
    refreshedAt,
    statusLabel: '已刷新结果',
  }
}

export function buildRecoveryEvidenceReviewRefreshFeedback(
  localFeedback: RecoveryEvidenceReviewActionFeedback | null,
  refreshAnchor: RecoveryEvidenceReviewRefreshAnchor | null,
): RecoveryEvidenceReviewActionFeedback | null {
  if (!refreshAnchor && !localFeedback) return null
  if (!refreshAnchor) return localFeedback
  const triggeredAt = refreshAnchor.refreshedAt
  const detail = localFeedback?.detail
    ? `${localFeedback.detail.replace(/。$/, '')}；已刷新结果，刷新后继续定位此依据。`
    : `最近动作：刷新 · ${triggeredAt} · 已刷新结果，刷新后继续定位此依据。`
  return {
    statusLabel: refreshAnchor.statusLabel,
    triggeredAt,
    closureCondition: localFeedback?.closureCondition || '关闭条件：查看刷新后的复检或修订结果。',
    detail,
  }
}

function recoveryEvidenceReviewIsCleared(task: any) {
  const review = recoveryEvidenceReviewOfTask(task)
  const reviewStatus = String(review?.status || '').toLowerCase()
  if (reviewStatus === 'ok') return true
  const hasKnownFailedLists = Array.isArray(review?.failed_evidence)
    || Array.isArray(review?.failedEvidence)
    || Array.isArray(review?.failed_items)
    || Array.isArray(review?.failedItems)
  return hasKnownFailedLists && recoveryEvidenceFailedTexts(review).length === 0
}

function recoveryEvidenceReviewRunPayload(run: any) {
  return {
    input: parseJsonValue(run?.input_ref) || {},
    output: parseJsonValue(run?.output_ref) || {},
  }
}

function recoveryEvidenceReviewRunTime(run: any) {
  const value = Date.parse(String(run?.updated_at || run?.completed_at || run?.finished_at || run?.created_at || ''))
  return Number.isFinite(value) ? value : 0
}

function recoveryEvidenceReviewRunHasAuditPayload(run: any) {
  const { input, output } = recoveryEvidenceReviewRunPayload(run)
  return Boolean(
    input?.recovery_evidence_action
    || input?.recoveryEvidenceAction
    || output?.recovery_evidence_action
    || output?.recoveryEvidenceAction
    || output?.audit_summary
    || output?.auditSummary
    || output?.recovery_evidence_closure
    || output?.recoveryEvidenceClosure
    || output?.governance_recheck_memory
    || output?.governanceRecheckMemory,
  )
}

function recoveryEvidenceReviewRunMatchesAction(
  run: any,
  task: any,
  rowAction: RecoveryEvidenceReviewRowAction,
  currentRun?: any | null,
) {
  const runType = String(run?.run_type || '')
  const { input, output } = recoveryEvidenceReviewRunPayload(run)
  const taskChapterId = Number(task?.chapter_id || task?.chapterId || 0)
  const inputChapterId = Number(input?.chapter_id || input?.chapterId || 0)
  const currentRunId = Number(currentRun?.id || 0)
  const runId = Number(run?.id || 0)
  const sourceRunId = Number(input?.source_run_id || input?.sourceRunId || output?.source_run_id || output?.sourceRunId || output?.audit_summary?.source_run_id || output?.auditSummary?.sourceRunId || 0)
  const source = String(input?.source || output?.source || '')

  if (rowAction.action === 'recheck_single_chapter') {
    return runType === 'prose_quality'
      && taskChapterId > 0
      && inputChapterId === taskChapterId
      && source === 'governance_recheck_sync'
  }

  if (rowAction.action === 'recheck_safe_batch' || rowAction.action === 'review_governance_closure') {
    return runType === 'longform_production_repair'
      && recoveryEvidenceReviewRunHasAuditPayload(run)
      && (runId === currentRunId || (currentRunId > 0 && sourceRunId === currentRunId))
  }

  if (rowAction.action === 'execute_typed_repair') {
    if (!taskChapterId) return false
    if (runType === 'prose_quality') return inputChapterId === taskChapterId && ['post_revision', 'governance_recheck_sync'].includes(source)
    if (runType === 'editor_revision') return inputChapterId === taskChapterId
  }

  return false
}

function recoveryEvidenceReviewRunStatus(run: any) {
  const status = String(run?.status || '').toLowerCase()
  if (['running', 'queued', 'ready', 'pending'].includes(status)) return 'running'
  if (['failed', 'error', 'canceled', 'cancelled'].includes(status)) return 'failed'
  if (['success', 'ok', 'completed', 'done', 'closed'].includes(status)) return 'success'
  return ''
}

function recoveryEvidenceReviewRunFailureDetail(run: any) {
  const { output } = recoveryEvidenceReviewRunPayload(run)
  return compactEvidenceText(
    run?.error_message
    || run?.error
    || output?.error
    || output?.message
    || '对应复检运行失败，请重试。',
  )
}

export function buildRecoveryEvidenceReviewResolvedFeedback({
  task,
  rowAction,
  currentRun = null,
  runRecords = [],
  localFeedback = null,
}: {
  task: any
  rowAction: RecoveryEvidenceReviewRowAction
  currentRun?: any | null
  runRecords?: any[] | null
  localFeedback?: RecoveryEvidenceReviewActionFeedback | null
}): RecoveryEvidenceReviewActionFeedback | null {
  const label = rowAction.label || '处理'
  const closureCondition = buildRecoveryEvidenceReviewActionFeedback(rowAction, '实时状态').closureCondition
  if (recoveryEvidenceReviewIsCleared(task)) {
    return {
      statusLabel: '已回填',
      triggeredAt: '实时状态',
      closureCondition,
      detail: `最近动作：${label} · 已回填 · 恢复依据复盘已清空失效项。`,
    }
  }

  const latestRun = [...(Array.isArray(runRecords) ? runRecords : [])]
    .filter(run => recoveryEvidenceReviewRunMatchesAction(run, task, rowAction, currentRun))
    .sort((a, b) => recoveryEvidenceReviewRunTime(b) - recoveryEvidenceReviewRunTime(a))[0]
  const runStatus = latestRun ? recoveryEvidenceReviewRunStatus(latestRun) : ''
  if (runStatus === 'running') {
    const runningDetail = rowAction.action === 'recheck_single_chapter'
      ? '单章治理复查正在回填恢复依据结果。'
      : rowAction.action === 'execute_typed_repair'
        ? '修订复检正在回填恢复依据结果。'
        : '长线生产修复正在回填恢复依据结果。'
    return {
      statusLabel: '运行中',
      triggeredAt: '实时状态',
      closureCondition,
      detail: `最近动作：${label} · 运行中 · ${runningDetail}`,
    }
  }
  if (runStatus === 'failed') {
    return {
      statusLabel: '失败需重试',
      triggeredAt: '实时状态',
      closureCondition,
      detail: `最近动作：${label} · 失败需重试 · ${recoveryEvidenceReviewRunFailureDetail(latestRun)}`,
    }
  }
  if (runStatus === 'success') {
    return {
      statusLabel: '已回填',
      triggeredAt: '实时状态',
      closureCondition,
      detail: `最近动作：${label} · 已回填 · 对应复检运行已完成，等待失效依据复盘刷新。`,
    }
  }

  return localFeedback
}

function recoveryEvidenceTaskResult(task: any) {
  const review = recoveryEvidenceReviewOfTask(task)
  const taskStatus = String(task?.task_status ?? task?.status ?? '').toLowerCase()
  const reviewStatus = String(review?.status || '').toLowerCase()
  const residualEvidence = recoveryEvidenceFailedTexts(review)
  const latestSummary = compactEvidenceText(
    review?.summary
    || task?.status_note
    || task?.statusNote
    || task?.note
    || task?.summary
    || task?.message
    || task?.action
    || '',
  )
  const hasResidual = residualEvidence.length > 0 || reviewStatus === 'warn' || taskStatus === 'needs_review'
  const closed = ['resolved', 'closed', 'done', 'completed'].includes(taskStatus) || reviewStatus === 'ok'
  const resultStatus = hasResidual ? 'needs_followup' : closed ? 'closed' : 'pending'
  return {
    resultStatus,
    resultLabel: resultStatus === 'closed' ? '已闭环' : resultStatus === 'needs_followup' ? '仍需复查' : '待复查',
    latestSummary,
    residualEvidence,
  }
}

function recoveryEvidenceResidualAction(source: string, resultStatus: string, residualEvidence: string[]) {
  if (resultStatus !== 'needs_followup' || residualEvidence.length === 0) return { action: '', label: '' }
  if (source === 'single_chapter_governance_recheck') return { action: 'revision', label: '回修依据' }
  if (source === 'safe_batch_recovery_recheck') return { action: 'focus_task', label: '定位批次任务' }
  return { action: 'focus_task', label: '定位任务' }
}

function recoveryEvidenceProductionBlockHint(source: string, resultStatus: string) {
  if (resultStatus === 'closed') {
    return {
      status: 'cleared' as const,
      label: '生产阻断已解除',
      detail: '该来源已复检闭环，可作为恢复安全连写依据。',
    }
  }
  if (resultStatus === 'needs_followup') {
    if (source === 'safe_batch_recovery_recheck') {
      return {
        status: 'blocked' as const,
        label: '暂缓安全连写',
        detail: '残留依据未闭环，先定位批次任务并完成批次回修，再复盘后继续安全连写。',
      }
    }
    if (source === 'single_chapter_governance_recheck') {
      return {
        status: 'blocked' as const,
        label: '暂缓安全连写',
        detail: '残留依据未闭环，先回修依据并复检单章，再继续安全连写。',
      }
    }
    return {
      status: 'blocked' as const,
      label: '暂缓安全连写',
      detail: '残留依据未闭环，先定位任务并复检，再继续安全连写。',
    }
  }
  return {
    status: 'pending' as const,
    label: '等待复检结论',
    detail: '先完成来源复检，再决定是否恢复安全连写。',
  }
}

function taskIndexOf(task: any, fallbackIndex: number | null = null) {
  const taskIndex = Number(task?.task_index ?? task?.taskIndex)
  if (Number.isFinite(taskIndex)) return taskIndex
  return fallbackIndex
}

function recoveryEvidenceSourceGroups(tasks: any[], latestTasks: any[] = []) {
  const groups = new Map<string, {
    source: string
    label: string
    count: number
    taskIndexes: number[]
    chapterNos: number[]
    resultTasks: any[]
  }>()
  const latestTaskByIndex = new Map<number, any>()
  for (const [index, task] of (Array.isArray(latestTasks) ? latestTasks : []).entries()) {
    const taskIndex = taskIndexOf(task, index)
    if (taskIndex !== null) latestTaskByIndex.set(taskIndex, task)
  }
  for (const [index, task] of tasks.entries()) {
    const meta = recoveryEvidenceTaskSourceMeta(task)
    const existing = groups.get(meta.source) || { source: meta.source, label: meta.label, count: 0, taskIndexes: [], chapterNos: [], resultTasks: [] }
    existing.count += 1
    const taskIndex = taskIndexOf(task, index)
    if (taskIndex !== null) existing.taskIndexes.push(taskIndex)
    const chapterNo = Number(task?.chapter_no ?? task?.chapterNo)
    if (Number.isFinite(chapterNo) && chapterNo > 0 && !existing.chapterNos.includes(chapterNo)) existing.chapterNos.push(chapterNo)
    existing.resultTasks.push(taskIndex !== null && latestTaskByIndex.has(taskIndex) ? latestTaskByIndex.get(taskIndex) : task)
    groups.set(meta.source, existing)
  }
  const order: Record<string, number> = {
    single_chapter_governance_recheck: 0,
    safe_batch_recovery_recheck: 1,
    recovery_evidence_recheck: 2,
  }
  return Array.from(groups.values())
    .map(group => {
      const recheck = recoveryEvidenceSourceRecheckAction(group.source)
      const taskResults = group.resultTasks.map(recoveryEvidenceTaskResult)
      const residualEvidence = compactAuditList(taskResults.flatMap(item => item.residualEvidence), 6)
      const resultStatus = residualEvidence.length > 0 || taskResults.some(item => item.resultStatus === 'needs_followup')
        ? 'needs_followup'
        : taskResults.length > 0 && taskResults.every(item => item.resultStatus === 'closed')
          ? 'closed'
          : 'pending'
      const residualAction = recoveryEvidenceResidualAction(group.source, resultStatus, residualEvidence)
      const productionBlock = recoveryEvidenceProductionBlockHint(group.source, resultStatus)
      return {
        source: group.source,
        label: group.label,
        count: group.count,
        taskIndexes: Array.from(new Set(group.taskIndexes)).sort((a, b) => a - b),
        chapterNos: group.chapterNos.sort((a, b) => a - b),
        recheckAction: recheck.action,
        recheckLabel: recheck.label,
        resultStatus,
        resultLabel: resultStatus === 'closed' ? '已闭环' : resultStatus === 'needs_followup' ? '仍需复查' : '待复查',
        latestSummary: taskResults.map(item => item.latestSummary).find(Boolean) || '',
        residualEvidence,
        residualAction: residualAction.action,
        residualActionLabel: residualAction.label,
        productionBlockStatus: productionBlock.status,
        productionBlockLabel: productionBlock.label,
        productionBlockDetail: productionBlock.detail,
      }
    })
    .sort((a, b) => (order[a.source] ?? 99) - (order[b.source] ?? 99) || a.label.localeCompare(b.label))
}

function recoveryEvidenceAuditActionFromGroup(
  group: RecoveryEvidenceAuditSourceGroup,
  action: RecoveryEvidenceAuditNextAction['action'],
  label: string,
): RecoveryEvidenceAuditNextAction {
  return {
    action,
    label,
    source: group.source,
    sourceLabel: group.label,
    taskIndex: group.taskIndexes[0] ?? null,
    residualEvidence: group.residualEvidence,
  }
}

function buildRecoveryEvidenceAuditNextAction(sourceGroups: RecoveryEvidenceAuditSourceGroup[]): RecoveryEvidenceAuditNextAction | null {
  const singleResidual = sourceGroups.find(group => group.source === 'single_chapter_governance_recheck' && group.residualAction === 'revision')
  if (singleResidual) {
    return recoveryEvidenceAuditActionFromGroup(singleResidual, 'revision', singleResidual.residualActionLabel || '回修依据')
  }

  const batchResidual = sourceGroups.find(group => group.source === 'safe_batch_recovery_recheck' && group.residualAction === 'focus_task')
  if (batchResidual) {
    return recoveryEvidenceAuditActionFromGroup(batchResidual, 'focus_task', batchResidual.residualActionLabel || '定位批次任务')
  }

  const genericResidual = sourceGroups.find(group => group.resultStatus === 'needs_followup' && group.residualAction)
  if (genericResidual) {
    return recoveryEvidenceAuditActionFromGroup(genericResidual, genericResidual.residualAction as RecoveryEvidenceAuditNextAction['action'], genericResidual.residualActionLabel || '定位任务')
  }

  const singlePending = sourceGroups.find(group => group.source === 'single_chapter_governance_recheck' && group.resultStatus === 'pending')
  if (singlePending) {
    return recoveryEvidenceAuditActionFromGroup(singlePending, 'recheck_single_chapter', singlePending.recheckLabel || '复检单章')
  }

  const batchPending = sourceGroups.find(group => group.source === 'safe_batch_recovery_recheck' && group.resultStatus === 'pending')
  if (batchPending) {
    return recoveryEvidenceAuditActionFromGroup(batchPending, 'recheck_safe_batch', batchPending.recheckLabel || '复盘批次')
  }

  const unresolved = sourceGroups.find(group => group.resultStatus !== 'closed')
  if (unresolved) {
    return recoveryEvidenceAuditActionFromGroup(unresolved, 'review_governance_closure', '治理复查台')
  }

  return null
}

export function buildRecoveryEvidenceAuditView(audit?: any | null, latestTasks: any[] = []): RecoveryEvidenceAuditView | null {
  const closure = audit?.recovery_evidence_closure || audit?.recoveryEvidenceClosure || null
  if (!closure || Number(closure.total || 0) <= 0) return null
  const memory = audit?.governance_recheck_memory || audit?.governanceRecheckMemory || null
  const closureTasks = Array.isArray(closure.tasks) ? closure.tasks : []
  const sourceGroups = recoveryEvidenceSourceGroups(closureTasks, latestTasks)
  return {
    status: closure.status === 'closed' ? 'closed' : 'needs_followup',
    label: '恢复依据审计',
    total: Number(closure.total || 0),
    resolved: Number(closure.resolved || 0),
    sourceSummary: recoveryEvidenceSourceSummary(closure),
    sourceGroups,
    nextAction: buildRecoveryEvidenceAuditNextAction(sourceGroups),
    sourceRunId: memory?.source_run_id ?? memory?.sourceRunId ?? audit?.source_run_id ?? audit?.sourceRunId ?? null,
    memoryLabel: compactEvidenceText(memory?.label || ''),
    memorySummary: compactEvidenceText(memory?.summary || '', 200),
    failedEvidence: compactAuditList([
      ...(Array.isArray(memory?.failed_evidence) ? memory.failed_evidence : []),
      ...(Array.isArray(memory?.failedEvidence) ? memory.failedEvidence : []),
      ...(Array.isArray(closure.failed_evidence) ? closure.failed_evidence : []),
      ...(Array.isArray(closure.failedEvidence) ? closure.failedEvidence : []),
    ]),
    repairedEvidence: compactAuditList([
      ...(Array.isArray(memory?.evidence) ? memory.evidence : []),
      ...(Array.isArray(memory?.repaired_evidence) ? memory.repaired_evidence : []),
      ...(Array.isArray(memory?.repairedEvidence) ? memory.repairedEvidence : []),
      ...(Array.isArray(closure.repaired_evidence) ? closure.repaired_evidence : []),
      ...(Array.isArray(closure.repairedEvidence) ? closure.repairedEvidence : []),
    ]),
    watchItems: compactAuditList([
      ...(Array.isArray(memory?.watch_items) ? memory.watch_items : []),
      ...(Array.isArray(memory?.watchItems) ? memory.watchItems : []),
      ...(Array.isArray(closure.watch_items) ? closure.watch_items : []),
      ...(Array.isArray(closure.watchItems) ? closure.watchItems : []),
    ]),
    relatedTasks: closureTasks
      .map((task: any) => ({
        ...recoveryEvidenceTaskSourceMeta(task),
        chapterId: Number(task?.chapter_id ?? task?.chapterId ?? 0) || null,
        chapterNo: Number(task?.chapter_no ?? task?.chapterNo ?? 0) || null,
        taskIndex: Number.isFinite(Number(task?.task_index ?? task?.taskIndex)) ? Number(task?.task_index ?? task?.taskIndex) : null,
        sourceLabel: recoveryEvidenceTaskSourceMeta(task).label,
        status: String(task?.task_status ?? task?.status ?? 'open'),
        title: compactEvidenceText(task?.title || task?.message || '恢复依据修复任务', 120),
        summary: compactEvidenceText(task?.summary || task?.message || task?.action || '', 160),
      }))
      .filter((task: any) => task.title || task.summary)
      .slice(0, 6),
  }
}

function repairTaskIssueTag(task: any) {
  if (String(task?.issue_type || '') === 'batch_brief_mismatch') return <Tag color="purple" bordered={false}>批次计划</Tag>
  if (['recovery_evidence_mismatch', 'recovery_evidence_governance_queue'].includes(String(task?.issue_type || ''))) return <Tag color="purple" bordered={false}>恢复依据</Tag>
  if (String(task?.issue_type || '') === 'style_sample_task_book_rebuild') return <Tag color="purple" bordered={false}>样章任务书</Tag>
  if (String(task?.source || '') === 'reader_trial_review' || String(task?.issue_type || '') === 'reader_trial_drop_point') return <Tag color="red" bordered={false}>读者试读</Tag>
  if (String(task?.issue_type || '') === 'volume_segment_missed') return <Tag color="gold" bordered={false}>卷级阶段</Tag>
  if (String(task?.issue_type || '') === 'safe_batch_expansion_structure_decision_mismatch') return <Tag color="blue" bordered={false}>扩批结构决策</Tag>
  if (String(task?.issue_type || '') === 'safe_batch_expansion_structure_repair') return <Tag color="blue" bordered={false}>扩批结构</Tag>
  if (String(task?.issue_type || '') === 'safe_batch_expansion_segment_hotspot') return <Tag color="blue" bordered={false}>扩批分段</Tag>
  if (String(task?.issue_type || '') === 'reader_pull_missed') return <Tag color="magenta" bordered={false}>读者拉力</Tag>
  if (String(task?.issue_type || '') === 'innovation_execution_missed') return <Tag color="geekblue" bordered={false}>创新/IP</Tag>
  if (String(task?.source || '') === 'rolling_script_room' || String(task?.issue_type || '') === 'script_room_layer_gap') return <Tag color="blue" bordered={false}>剧本室</Tag>
  if (String(task?.source || '') === 'storyline_diff_decision') return <Tag color="purple" bordered={false}>剧情线决策</Tag>
  const meta = deliveryRiskIssueMeta(task)
  if (meta) return <Tag color={meta.color} bordered={false}>{meta.label}</Tag>
  return null
}

type RepairTaskTagMeta = {
  key: string
  label: string
  color: string
}

const DEFAULT_LANE_TEMPLATE_REQUIREMENTS = [
  { key: 'default_lane_segment_duty', label: '默认档位段位职责' },
  { key: 'default_lane_conflict_rotation', label: '冲突轮换' },
  { key: 'default_lane_payoff_density', label: '回报密度' },
  { key: 'default_lane_ending_hook_template', label: '章末追读模板' },
]

type DefaultLaneObligationStatus = {
  key: string
  label: string
  status: 'fulfilled' | 'missing' | 'unverified'
  text: string
  color: string
}

type DefaultLaneProductionRelapseClosure = {
  status: string
  templateVersionId: string
  defaultBatchChapterNos: number[]
  validationChapterNos: number[]
  remainingFailureReasons: string[]
  clearedFailureReasons: string[]
  failedRequirements: Array<{ key: string; label: string; failureReason: string }>
  closeText: string
  detailText: string
}

function structureDecisionRepairReviewOfTask(task: any) {
  return task?.safe_batch_expansion_structure_decision_review
    || task?.safeBatchExpansionStructureDecisionReview
    || task?.payload?.safe_batch_expansion_structure_decision_review
    || task?.payload?.safeBatchExpansionStructureDecisionReview
    || null
}

function structureRepairReviewOfTask(task: any) {
  return task?.safe_batch_expansion_structure_review
    || task?.safeBatchExpansionStructureReview
    || task?.payload?.safe_batch_expansion_structure_review
    || task?.payload?.safeBatchExpansionStructureReview
    || null
}

function defaultLaneRedesignOfTask(task: any) {
  const review = structureDecisionRepairReviewOfTask(task)
  return review?.default_five_chapter_lane_redesign
    || review?.defaultFiveChapterLaneRedesign
    || null
}

function defaultLaneTemplateRedesignQueueOfTask(task: any) {
  const review = structureRepairReviewOfTask(task)
  const queue = review?.default_five_chapter_lane_template_redesign_queue
    || review?.defaultFiveChapterLaneTemplateRedesignQueue
    || null
  if (!queue || queue.visible === false) return null
  return queue
}

function defaultLaneTemplateRepairOfTask(task: any) {
  const review = structureRepairReviewOfTask(task)
  const repair = review?.default_five_chapter_lane_template_repair
    || review?.defaultFiveChapterLaneTemplateRepair
    || null
  if (!repair || repair.visible === false) return null
  return repair
}

function defaultLaneTemplateRepairProductionFailedRequirementsOfTask(task: any) {
  const repair = defaultLaneTemplateRepairOfTask(task)
  if (!repair) return []
  const verdict = repair.production_relapse_verdict || repair.productionRelapseVerdict || null
  const rawRequirements = Array.isArray(repair.production_failed_requirements)
    ? repair.production_failed_requirements
    : Array.isArray(repair.productionFailedRequirements)
      ? repair.productionFailedRequirements
      : Array.isArray(verdict?.failed_requirements)
        ? verdict.failed_requirements
        : Array.isArray(verdict?.failedRequirements)
          ? verdict.failedRequirements
          : []
  return rawRequirements
    .map((item: any) => ({
      key: compactEvidenceText(item?.key || ''),
      label: compactEvidenceText(item?.label || item?.name || item?.key || ''),
      failureReason: compactEvidenceText(item?.failure_reason || item?.failureReason || ''),
    }))
    .filter((item: any) => item.key || item.label || item.failureReason)
}

function defaultLaneTemplateProductionRelapseClosureOfTask(task: any): DefaultLaneProductionRelapseClosure | null {
  const repair = defaultLaneTemplateRepairOfTask(task)
  if (!repair) return null
  const verdict = repair.production_relapse_verdict || repair.productionRelapseVerdict || null
  if (verdict?.visible === false) return null
  const failedRequirements = defaultLaneTemplateRepairProductionFailedRequirementsOfTask(task)
  const status = compactEvidenceText(verdict?.status || repair.production_relapse_status || repair.productionRelapseStatus || '')
  const remainingFailureReasons = normalizeEvidenceTextList(verdict?.remaining_failure_reasons || verdict?.remainingFailureReasons)
  const clearedFailureReasons = normalizeEvidenceTextList(verdict?.cleared_failure_reasons || verdict?.clearedFailureReasons)
  const defaultBatchChapterNos = normalizeChapterNos(verdict?.default_batch_chapter_nos || verdict?.defaultBatchChapterNos)
  const validationChapterNos = normalizeChapterNos(verdict?.validation_chapter_nos || verdict?.validationChapterNos || repair.validation_chapter_nos || repair.validationChapterNos)
  const templateVersionId = compactEvidenceText(verdict?.template_version_id || verdict?.templateVersionId || repair.template_version_id || repair.templateVersionId || '')
  if (!status && !failedRequirements.length && !remainingFailureReasons.length && !defaultBatchChapterNos.length) return null
  const detailParts = [
    templateVersionId ? `模板版本：${templateVersionId}` : '',
    defaultBatchChapterNos.length ? `真实复发批：${compactChapterNos(defaultBatchChapterNos)}` : '',
    validationChapterNos.length ? `验证批：${compactChapterNos(validationChapterNos)}` : '',
    remainingFailureReasons.length ? `仍复发维度：${remainingFailureReasons.join('、')}` : '',
    clearedFailureReasons.length ? `已修复维度：${clearedFailureReasons.join('、')}` : '',
    failedRequirements.length ? `生产失败项：${failedRequirements.map(item => item.failureReason || item.label || item.key).filter(Boolean).join('、')}` : '',
  ].filter(Boolean)
  return {
    status,
    templateVersionId,
    defaultBatchChapterNos,
    validationChapterNos,
    remainingFailureReasons,
    clearedFailureReasons,
    failedRequirements,
    closeText: '等待生产后验验证批：下一轮以 production_relapse_verdict.status=passed 关闭，且 remaining_failure_reasons 为空。',
    detailText: detailParts.join('；'),
  }
}

function defaultLaneFailedRequirementsOfTask(task: any) {
  const review = structureDecisionRepairReviewOfTask(task)
  const failedItems = Array.isArray(review?.failed_items)
    ? review.failed_items
    : Array.isArray(review?.failedItems)
      ? review.failedItems
      : []
  const explicitMissed = Array.isArray(review?.default_five_chapter_lane_redesign?.missed_requirements)
    ? review.default_five_chapter_lane_redesign.missed_requirements
    : Array.isArray(review?.defaultFiveChapterLaneRedesign?.missedRequirements)
      ? review.defaultFiveChapterLaneRedesign.missedRequirements
      : []
  const byKey = new Map<string, { key: string; label: string; count: number }>()
  ;[...failedItems, ...explicitMissed].forEach((item: any) => {
    const key = compactEvidenceText(item?.key || '')
    if (!isDefaultFiveChapterLaneRequirementKey(key)) return
    const current = byKey.get(key)
    byKey.set(key, {
      key,
      label: compactEvidenceText(item?.label || key),
      count: Math.max(Number(current?.count || 0), Number(item?.count || 1)),
    })
  })
  return Array.from(byKey.values())
    .sort((a, b) => {
      const orderA = DEFAULT_LANE_TEMPLATE_REQUIREMENTS.findIndex(item => item.key === a.key)
      const orderB = DEFAULT_LANE_TEMPLATE_REQUIREMENTS.findIndex(item => item.key === b.key)
      return (orderA < 0 ? 99 : orderA) - (orderB < 0 ? 99 : orderB)
    })
}

export function buildDefaultLaneRepairTaskTags(task: any): RepairTaskTagMeta[] {
  const issueType = compactEvidenceText(task?.issue_type || task?.issueType)
  if (issueType === 'safe_batch_expansion_structure_repair') {
    const tags: RepairTaskTagMeta[] = []
    const redesignQueue = defaultLaneTemplateRedesignQueueOfTask(task)
    if (redesignQueue) {
      const topFailed = redesignQueue.top_failed_requirement || redesignQueue.topFailedRequirement || null
      const topFailedKey = compactEvidenceText(topFailed?.key || '')
      const topFailedLabel = compactEvidenceText(topFailed?.label || topFailed?.key || '')
      tags.push({ key: 'default_lane_template_redesign', label: '默认档位模板重构', color: 'gold' })
      if (topFailedKey && topFailedLabel) {
        tags.push({ key: topFailedKey, label: `重写${topFailedLabel}`, color: 'gold' })
      }
    }
    const templateRepair = defaultLaneTemplateRepairOfTask(task)
    const productionRelapseVerdict = templateRepair?.production_relapse_verdict
      || templateRepair?.productionRelapseVerdict
      || null
    const productionRelapseStatus = compactEvidenceText(productionRelapseVerdict?.status || '')
    const productionFailedRequirements = defaultLaneTemplateRepairProductionFailedRequirementsOfTask(task)
    if (productionRelapseStatus === 'failed' || productionFailedRequirements.length) {
      tags.push({ key: 'default_lane_production_relapse', label: '生产后验仍复发', color: 'gold' })
      productionFailedRequirements.slice(0, 4).forEach(item => {
        const key = item.key || item.failureReason || item.label
        const label = item.failureReason ? `${item.failureReason}未修` : `重修${item.label || item.key}`
        if (key && label) tags.push({ key, label, color: 'gold' })
      })
    } else if (productionRelapseStatus === 'passed') {
      tags.push({ key: 'default_lane_production_repaired', label: '生产后验已修复', color: 'green' })
    }
    if (!tags.length) return []
    return tags
  }
  if (issueType !== 'safe_batch_expansion_structure_decision_mismatch') return []
  const missedRequirements = defaultLaneFailedRequirementsOfTask(task)
  const redesign = defaultLaneRedesignOfTask(task)
  if (!redesign && !missedRequirements.length) return []
  const relapseCount = Number(redesign?.relapse_count ?? redesign?.relapseCount ?? 0)
  const tags: RepairTaskTagMeta[] = [
    { key: 'default_lane_template', label: '默认档位模板', color: 'gold' },
    ...missedRequirements.slice(0, 4).map(item => ({
      key: item.key,
      label: `缺${item.label}`,
      color: 'gold',
    })),
  ]
  if (Number.isFinite(relapseCount) && relapseCount > 0) {
    tags.push({ key: 'default_lane_relapse', label: `连续失效${relapseCount}次`, color: 'gold' })
  }
  return tags
}

function repairTaskFocusRequirementMatches(requirementKey: string, task: any) {
  if (!requirementKey) return true
  if (requirementKey === 'default_lane_template') return buildDefaultLaneRepairTaskTags(task).length > 0
  return defaultLaneFailedRequirementsOfTask(task).some(item => item.key === requirementKey)
}

function buildDefaultLaneFocusObligationStatuses(
  focus: SafeBatchRecoveryFocusSnapshot | null | undefined,
  activeItems: any[],
  resolvedItems: any[],
): DefaultLaneObligationStatus[] {
  if (focus?.requirementKey !== 'default_lane_template') return []
  if (!activeItems.length && !resolvedItems.length) return []
  const activeFailed = new Set(activeItems.flatMap((item: any) => (
    [
      ...defaultLaneFailedRequirementsOfTask(item?.task || item).map(requirement => requirement.key),
      ...defaultLaneTemplateRepairProductionFailedRequirementsOfTask(item?.task || item).map(requirement => requirement.key),
    ]
  )))
  const resolvedFailed = new Set(resolvedItems.flatMap((item: any) => (
    [
      ...defaultLaneFailedRequirementsOfTask(item?.task || item).map(requirement => requirement.key),
      ...defaultLaneTemplateRepairProductionFailedRequirementsOfTask(item?.task || item).map(requirement => requirement.key),
    ]
  )))
  return DEFAULT_LANE_TEMPLATE_REQUIREMENTS.map(requirement => {
    if (activeFailed.has(requirement.key)) {
      return {
        ...requirement,
        status: 'missing' as const,
        text: `${requirement.label}待补齐`,
        color: 'gold',
      }
    }
    if (resolvedItems.length > 0) {
      const text = resolvedFailed.has(requirement.key)
        ? `${requirement.label}已补齐`
        : `${requirement.label}已具备`
      return {
        ...requirement,
        status: 'fulfilled' as const,
        text,
        color: 'green',
      }
    }
    return {
      ...requirement,
      status: 'unverified' as const,
      text: `${requirement.label}待确认`,
      color: 'default',
    }
  })
}

function buildDefaultLaneProductionRelapseClosure(
  focus: SafeBatchRecoveryFocusSnapshot | null | undefined,
  activeItems: any[],
  resolvedItems: any[],
): DefaultLaneProductionRelapseClosure | null {
  if (focus?.requirementKey !== 'default_lane_template') return null
  const closures = [...activeItems, ...resolvedItems]
    .map((item: any) => defaultLaneTemplateProductionRelapseClosureOfTask(item?.task || item))
    .filter(Boolean) as DefaultLaneProductionRelapseClosure[]
  if (!closures.length) return null
  return closures.find(item => item.status === 'failed' || item.remainingFailureReasons.length > 0 || item.failedRequirements.length > 0)
    || closures[0]
}

function compactEvidenceText(value: any, maxLength?: number) {
  if (!value) return ''
  const raw = typeof value !== 'object'
    ? String(value)
    : String(value.name || value.label || value.title || value.text || value.description || value.reason || value.message || '').trim()
  return maxLength && raw.length > maxLength ? `${raw.slice(0, maxLength)}...` : raw
}

function deliveryRiskEvidenceLines(task: any) {
  if (String(task?.source || '') !== 'review_annotation_risk') return []
  const payload = task.payload && typeof task.payload === 'object' ? task.payload : {}
  const rows = [
    ['漏推', payload.missed],
    ['额外推进', payload.unplanned],
    ['禁揭', payload.forbidden_touched || payload.forbiddenTouched],
    ['核心', payload.drift_risks || payload.risks],
    ['出戏', payload.meme_sense?.immersion_risks || payload.immersion_risks || payload.issues],
  ]
  return rows
    .flatMap(([label, value]: any[]) => Array.isArray(value)
      ? value.slice(0, 2).map(item => `${label}：${compactEvidenceText(item)}`)
      : [])
    .filter(Boolean)
    .slice(0, 4)
}

function BatchPlanReviewPreview({ task }: { task: any }) {
  const batchPlanReview = task.batch_plan_review || task.batchPlanReview || null
  const planned = Array.isArray(batchPlanReview?.planned) ? batchPlanReview.planned : []
  const actualRisks = Array.isArray(batchPlanReview?.actual_risks) ? batchPlanReview.actual_risks : []
  if (!planned.length && !actualRisks.length) return null
  return (
    <div style={{ marginTop: 4, padding: 8, border: '1px solid #ede9fe', borderRadius: 6, background: '#faf5ff' }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Text strong style={{ fontSize: 12 }}>计划/实际</Text>
        {planned.length > 0 && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            计划：{planned.slice(0, 2).join('；')}
          </Text>
        )}
        {actualRisks.length > 0 && (
          <Text type="danger" style={{ fontSize: 12 }}>
            实际风险：{actualRisks.slice(0, 2).join('；')}
          </Text>
        )}
      </Space>
    </div>
  )
}

function RecoveryEvidenceReviewPreview({
  task,
  taskIndex = 0,
  currentRun = null,
  runRecords = [],
  actionFeedbackByKey = {},
  onRecoveryEvidenceReviewRowAction,
}: {
  task: any
  taskIndex?: number
  currentRun?: any | null
  runRecords?: any[]
  actionFeedbackByKey?: Record<string, RecoveryEvidenceReviewActionFeedback>
  onRecoveryEvidenceReviewRowAction?: (row: RecoveryEvidenceReviewRow, rowAction: RecoveryEvidenceReviewRowAction) => void | Promise<void>
}) {
  const recoveryEvidenceReview = task.recovery_evidence_review || task.recoveryEvidenceReview || null
  const rows = buildRecoveryEvidenceReviewRows(task)
  const summary = String(recoveryEvidenceReview?.summary || '').trim()
  if (!rows.length && !summary) return null
  return (
    <div style={{ marginTop: 4, padding: 8, border: '1px solid #f5d0fe', borderRadius: 6, background: '#fdf4ff' }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Text strong style={{ fontSize: 12 }}>{isSingleChapterRecoveryEvidenceTask(task) ? '单章恢复依据复盘' : '恢复依据复盘'}</Text>
        {summary && (
          <Text type="danger" style={{ fontSize: 12 }}>
            复盘结论：{summary}
          </Text>
        )}
        {rows.slice(0, 4).map((item: any, index: number) => (
          <Space key={`${item.evidence}-${index}`} direction="vertical" size={2} style={{ width: '100%' }}>
            {(() => {
              const rowAction = buildRecoveryEvidenceReviewRowAction(item)
              const feedback = buildRecoveryEvidenceReviewResolvedFeedback({
                task,
                rowAction,
                currentRun,
                runRecords,
                localFeedback: actionFeedbackByKey[buildRecoveryEvidenceReviewActionFeedbackKey(taskIndex, item, rowAction)] || null,
              })
              return (
                <>
                  {(item.sourceLabel || item.sourceDetail || item.sourceActionLabel) && (
              <Space wrap size={[4, 2]}>
                {item.sourceLabel && <Tag color="purple" bordered={false}>来源：{item.sourceLabel}</Tag>}
                {item.sourceDetail && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.sourceLabel && item.sourceDetail.startsWith(`${item.sourceLabel} · `)
                      ? item.sourceDetail.slice(item.sourceLabel.length + 3)
                      : item.sourceDetail}
                  </Text>
                )}
                {rowAction.action && onRecoveryEvidenceReviewRowAction ? (
                  <Button
                    size="small"
                    type="link"
                    icon={rowAction.action === 'recheck_single_chapter' || rowAction.action === 'recheck_safe_batch' || rowAction.action === 'review_governance_closure' ? <ReloadOutlined /> : undefined}
                    onClick={() => { void onRecoveryEvidenceReviewRowAction?.(item, rowAction) }}
                  >
                    {rowAction.label}
                  </Button>
                ) : item.sourceActionLabel ? (
                  <Tag color="blue" bordered={false}>下一步：{item.sourceActionLabel}</Tag>
                ) : null}
              </Space>
                  )}
                  {feedback && (
                    <Space direction="vertical" size={1} style={{ width: '100%' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>{feedback.detail}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{feedback.closureCondition}</Text>
                    </Space>
                  )}
                </>
              )
            })()}
            <Text type="secondary" style={{ fontSize: 12 }}>失效依据：{item.evidence}</Text>
            {item.riskLabels.length > 0 && (
              <Text type="secondary" style={{ fontSize: 12 }}>对应风险：{item.riskLabels.slice(0, 3).join('；')}</Text>
            )}
          </Space>
        ))}
      </Space>
    </div>
  )
}

function RecoveryEvidenceRegovernancePreview({ task }: { task: any }) {
  const summary = buildRecoveryEvidenceRegovernanceSummary(task)
  if (!summary) return null
  return (
    <div style={{ marginTop: 4, padding: 8, border: '1px solid #f0abfc', borderRadius: 6, background: '#fae8ff' }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Space wrap size={[4, 2]}>
          <Text strong style={{ fontSize: 12 }}>{summary.label}</Text>
          <Tag color="purple" bordered={false}>队列 {summary.taskCount}</Tag>
          {summary.actionLabels.slice(0, 3).map(label => (
            <Tag key={label} color="gold" bordered={false}>{label}</Tag>
          ))}
        </Space>
        {summary.summary && (
          <Text type="secondary" style={{ fontSize: 12 }}>{summary.summary}</Text>
        )}
      </Space>
    </div>
  )
}

function DeliveryRiskReviewPreview({ task }: { task: any }) {
  const evidence = deliveryRiskEvidenceLines(task)
  if (!evidence.length) return null
  return (
    <div style={{ marginTop: 4, padding: 8, border: '1px solid #fee2e2', borderRadius: 6, background: '#fff7ed' }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Text strong style={{ fontSize: 12 }}>风险证据</Text>
        {evidence.map(item => (
          <Text key={item} type="secondary" style={{ fontSize: 12 }}>{item}</Text>
        ))}
      </Space>
    </div>
  )
}

function SafeBatchExpansionSegmentPreview({ task }: { task: any }) {
  const review = task.safe_batch_expansion_segment_review || task.safeBatchExpansionSegmentReview || null
  const hotspots = Array.isArray(review?.hotspots) ? review.hotspots : []
  const rollback = review?.rollback_policy || review?.rollbackPolicy || null
  if (!hotspots.length && !rollback) return null
  return (
    <div style={{ marginTop: 4, padding: 8, border: '1px solid #bfdbfe', borderRadius: 6, background: '#eff6ff' }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Text strong style={{ fontSize: 12 }}>扩批热区</Text>
        {hotspots.slice(0, 3).map((hotspot: any) => (
          <Text key={`${hotspot.key}-${hotspot.chapter_nos?.join?.('-') || hotspot.label}`} type="secondary" style={{ fontSize: 12 }}>
            {hotspot.label || '热区'}：第{(hotspot.chapter_nos || hotspot.chapterNos || []).join('、')}章，风险 {hotspot.risk_count ?? hotspot.riskCount ?? 0} 项
          </Text>
        ))}
        {rollback?.summary && (
          <Text type="secondary" style={{ fontSize: 12 }}>回退：{rollback.summary}</Text>
        )}
      </Space>
    </div>
  )
}

function repairTaskStatusTag(status?: string) {
  if (status === 'resolved') return <Tag color="green" bordered={false}>已处理</Tag>
  if (status === 'needs_review') return <Tag color="gold" bordered={false}>需复查</Tag>
  if (status === 'in_progress') return <Tag color="blue" bordered={false}>处理中</Tag>
  return <Tag bordered={false}>待处理</Tag>
}

export type StrengthenedRepairAcceptanceTrendSnapshot = {
  visible: boolean
  status: 'ok' | 'warn'
  label: string
  summary: string
  acceptedBatchCount: number
  failedBatchCount: number
  passStreak: number
  latestStatus: 'none' | 'ok' | 'warn'
  latestBatchLabel: string
  latestRunId: any | null
  sourceEvidence: string[]
  dimensions: {
    core: { label: string; failedCount: number }
    payoff: { label: string; failedCount: number }
    readerPull: { label: string; failedCount: number }
  }
}

export type SafeBatchExpansionPolicySnapshot = {
  visible: boolean
  status: 'observing' | 'expanded' | 'recovering'
  label: string
  summary: string
  targetChapterCount: number
  baseChapterCount: number
  expandedChapterCount: number
  requiredPassStreak: number
  passStreak: number
  acceptedBatchCount: number
  failedBatchCount: number
  latestStatus: 'none' | 'ok' | 'warn'
  expansionFeedback: SafeBatchExpansionFeedbackSnapshot | null
  recoveryRoadmap: SafeBatchRecoveryRoadmapSnapshot | null
  recoveryValidation: SafeBatchRecoveryValidationSnapshot | null
  recoveryRestoreStabilityLane: SafeBatchRecoveryRestoreStabilityLaneSnapshot | null
}

export type SafeBatchRecoveryRestoreStabilityLaneSnapshot = {
  visible: boolean
  status: string
  label: string
  source: string
  stablePassStreak: number
  requiredStablePassStreak: number
  defaultFiveChapterReady: boolean
  restoreChapterNos: number[]
  validationChapterNos: number[]
  summary: string
  taskCenterFilterLabel: string
  latestTemplateVersionProfile: SafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot | null
}

export type SafeBatchRecoveryRoadmapSnapshot = {
  visible: boolean
  label: string
  currentLane: string
  currentLaneLabel: string
  currentTargetChapterCount: number
  currentStatus: string
  currentReason: string
  recommendedFocus: SafeBatchRecoveryFocusSnapshot | null
  nextRepairLayer: SafeBatchRecoveryRoadmapNodeSnapshot | null
  routeNodes: SafeBatchRecoveryRoadmapNodeSnapshot[]
}

export type SafeBatchRecoveryFocusSnapshot = {
  layerKey: string
  layerLabel: string
  actionLabel: string
  targetView: string
  issueType: string
  source: string
  taskStatuses: string[]
  taskCenterFilterLabel: string
  requirementKey?: string
  templateVersionId?: string
}

export type SafeBatchRecoveryValidationSnapshot = {
  visible: boolean
  status: 'passed' | 'failed'
  label: string
  summary: string
  validationChapterNos: number[]
  failedChapterNos: number[]
  riskCount: number
  targetChapterCount: number
  nextActionKind: 'confirm_restore_five' | 'focus_repair'
  nextActionLabel: string
  focus: SafeBatchRecoveryFocusSnapshot | null
  defaultFiveChapterRecoveryVerdict: SafeBatchDefaultFiveChapterRecoveryVerdictSnapshot | null
  defaultFiveChapterLaneTemplateVerdict: SafeBatchDefaultFiveChapterLaneTemplateVerdictSnapshot | null
}

export type SafeBatchRecoveryRoadmapNodeSnapshot = {
  key: string
  label: string
  status: 'ok' | 'warn' | 'pending'
  targetChapterCount: number
  detail: string
  actionLabel: string
  focus: SafeBatchRecoveryFocusSnapshot | null
}

export function safeBatchRecoveryFocusMatchesTask(focus: SafeBatchRecoveryFocusSnapshot | null | undefined, task: any) {
  if (!focus || !task) return false
  const issueType = compactEvidenceText(task?.issue_type || task?.issueType || '')
  const source = compactEvidenceText(task?.source || task?.sourceMode || '')
  const status = compactEvidenceText(task?.task_status || task?.taskStatus || task?.status || '')
  const statusMatches = !focus.taskStatuses.length || focus.taskStatuses.includes(status)
  if (!statusMatches) return false
  if (!repairTaskFocusRequirementMatches(focus.requirementKey, task)) return false
  if (focus.issueType && issueType === focus.issueType) return true
  return Boolean(focus.source && source === focus.source)
}

function safeBatchRecoveryFocusMatchesTaskIdentity(focus: SafeBatchRecoveryFocusSnapshot | null | undefined, task: any) {
  if (!focus || !task) return false
  const issueType = compactEvidenceText(task?.issue_type || task?.issueType || '')
  const source = compactEvidenceText(task?.source || task?.sourceMode || '')
  if (!repairTaskFocusRequirementMatches(focus.requirementKey, task)) return false
  if (focus.issueType && issueType === focus.issueType) return true
  return Boolean(focus.source && source === focus.source)
}

export function buildSafeBatchRecoveryFocusReviewState(focus: SafeBatchRecoveryFocusSnapshot | null | undefined, items: any[] = []) {
  const matchedItems = focus ? items.filter((item: any) => safeBatchRecoveryFocusMatchesTaskIdentity(focus, item?.task || item)) : []
  const activeItems = matchedItems.filter((item: any) => safeBatchRecoveryFocusMatchesTask(focus, item?.task || item))
  const resolvedItems = matchedItems.filter((item: any) => {
    const task = item?.task || item
    const status = compactEvidenceText(task?.task_status || task?.taskStatus || task?.status || '')
    return status === 'resolved'
  })
  const actionLabel = compactEvidenceText(focus?.actionLabel || focus?.layerLabel || '路线图聚焦')
  const status = activeItems.length > 0
    ? 'active'
    : resolvedItems.length > 0
      ? 'ready_for_recheck'
      : 'empty'
  const nextActionLabel = status === 'active'
    ? `继续${actionLabel}`
    : status === 'ready_for_recheck'
      ? '刷新路线图并启动验证批'
      : '等待匹配任务'
  const obligationStatuses = buildDefaultLaneFocusObligationStatuses(focus, activeItems, resolvedItems)
  const obligationSummary = obligationStatuses.length
    ? `四项回检：${obligationStatuses.map(item => item.text).join('、')}。`
      : ''
  const productionRelapseClosure = buildDefaultLaneProductionRelapseClosure(focus, activeItems, resolvedItems)
  const productionRelapseSummary = productionRelapseClosure
    ? `${productionRelapseClosure.closeText}${productionRelapseClosure.detailText ? `${productionRelapseClosure.detailText}。` : ''}不能只补 default_lane_*_delivered。`
    : ''
  const summary = status === 'active'
    ? `${actionLabel}仍有 ${activeItems.length} 个待处理任务，${obligationSummary}${productionRelapseSummary}先闭环后再回到安全连写验证。`
    : status === 'ready_for_recheck'
      ? `${actionLabel}已处理 ${resolvedItems.length} 个匹配任务，${obligationSummary}${productionRelapseSummary}刷新路线图后可判断启动验证批还是继续修下一层。`
      : '暂未找到路线图匹配任务，可打开最近安全连写或修复历史查看复盘记录。'
  return {
    status,
    matchedCount: matchedItems.length,
    activeCount: activeItems.length,
    resolvedCount: resolvedItems.length,
    activeItems,
    resolvedItems,
    nextActionLabel,
    summary,
    obligationStatuses,
    productionRelapseClosure,
  }
}

export type SafeBatchExpansionFeedbackSnapshot = {
  visible: boolean
  status: 'none' | 'passed' | 'recovered' | 'rollback_to_small_batch' | 'rollback_to_single_chapter'
  label: string
  summary: string
  targetChapterCount: number
  latestBatchCreatedAt: string
  latestChapterNos: number[]
  riskCount: number
  stablePassStreak: number
  recentExpandedBatchCount: number
  repeatedHotspotSegment: {
    key: string
    label: string
    count: number
    summary: string
  } | null
  structureValidationTrend: SafeBatchExpansionStructureValidationTrendSnapshot | null
  structureValidationResult: SafeBatchExpansionStructureValidationResultSnapshot | null
  structureRepairEffectiveness: SafeBatchExpansionStructureRepairEffectivenessSnapshot | null
  structureDecisionTrend: SafeBatchExpansionStructureDecisionTrendSnapshot | null
  defaultFiveChapterLaneTemplateStabilityProfile: SafeBatchDefaultFiveChapterLaneTemplateStabilityProfileSnapshot | null
  recoveryRestoreStabilityEvidence: SafeBatchRecoveryRestoreStabilityEvidenceSnapshot | null
  defaultFiveChapterRegression: SafeBatchDefaultFiveChapterRegressionSnapshot | null
  defaultFiveChapterRecoveryVerdictRelapse: SafeBatchDefaultFiveChapterRecoveryVerdictRelapseSnapshot | null
}

export type SafeBatchRecoveryRestoreStabilityEvidenceSnapshot = {
  status: string
  source: string
  restoredBatchCreatedAt: string
  restoreChapterNos: number[]
  validationChapterNos: number[]
  stablePassStreak: number
  summary: string
}

export type SafeBatchDefaultFiveChapterRegressionSnapshot = {
  visible: boolean
  status: string
  label: string
  source: string
  stablePassStreak: number
  requiredStablePassStreak: number
  defaultBatchChapterNos: number[]
  restoreChapterNos: number[]
  validationChapterNos: number[]
  repeatedHotspotSegment: {
    key: string
    label: string
    riskCount: number
  } | null
  failureReasons: string[]
  templateVersionId: string
  templateVersion: SafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot | null
  templateVersionFailedRequirements: {
    key: string
    label: string
    failureReason: string
  }[]
  summary: string
}

export type SafeBatchDefaultFiveChapterRecoveryVerdictSnapshot = {
  visible: boolean
  status: 'passed' | 'failed'
  label: string
  summary: string
  defaultBatchChapterNos: number[]
  restoreChapterNos: number[]
  previousValidationChapterNos: number[]
  validationChapterNos: number[]
  failureReasons: string[]
  clearedFailureReasons: string[]
  remainingFailureReasons: string[]
  failureReasonStatuses: {
    reason: string
    status: 'cleared' | 'remaining'
    riskCount: number
  }[]
}

type SafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot = {
  id: string
  label: string
  source: string
  redesignSource: string
  sourceRunId: any
  summary: string
  latestStatus?: string
  latestBatchCreatedAt?: string
  latestChapterNos?: number[]
  validationBatchCount?: number
  passedBatchCount?: number
  failedBatchCount?: number
  passStreak?: number
  requiredPassStreak?: number
  status?: string
  productionValidationFailedCount?: number
  latestProductionRelapseVerdict?: SafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot | null
}

export type SafeBatchDefaultFiveChapterLaneTemplateFailedRequirementSnapshot = {
  key: string
  label: string
  failureReason: string
  chapterNos: number[]
}

export type SafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot = {
  visible: boolean
  status: 'passed' | 'failed'
  label: string
  templateVersionId: string
  defaultBatchChapterNos: number[]
  restoreChapterNos: number[]
  previousValidationChapterNos: number[]
  validationChapterNos: number[]
  failureReasons: string[]
  clearedFailureReasons: string[]
  remainingFailureReasons: string[]
  failureReasonStatuses: {
    reason: string
    status: 'cleared' | 'remaining'
    riskCount: number
  }[]
  failedCount: number
  failedRequirements: SafeBatchDefaultFiveChapterLaneTemplateFailedRequirementSnapshot[]
  summary: string
}

export type SafeBatchDefaultFiveChapterLaneTemplateVerdictSnapshot = {
  visible: boolean
  status: 'passed' | 'failed'
  label: string
  summary: string
  validationChapterNos: number[]
  requirements: {
    key: string
    label: string
    status: 'fulfilled' | 'missing' | 'unverified'
  }[]
  missingCount: number
  missingRequirements: {
    key: string
    label: string
    chapterNos: number[]
  }[]
  productionFailedCount: number
  productionRelapseVerdict: SafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot | null
  productionFailedRequirements: SafeBatchDefaultFiveChapterLaneTemplateFailedRequirementSnapshot[]
  templateVersion: SafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot | null
}

export type SafeBatchDefaultFiveChapterLaneTemplateStabilityProfileSnapshot = {
  visible: boolean
  status: string
  label: string
  summary: string
  latestStatus: string
  latestBatchCreatedAt: string
  latestChapterNos: number[]
  validationBatchCount: number
  passedBatchCount: number
  failedBatchCount: number
  passStreak: number
  requiredPassStreak: number
  recommendation: string
  failedRequirementCount: number
  requirements: {
    key: string
    label: string
    passedCount: number
    failedCount: number
    latestStatus: string
    latestMissingChapterNos: number[]
  }[]
  topFailedRequirement: {
    key: string
    label: string
    failedCount: number
  } | null
  templateVersionProfiles: SafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot[]
  latestTemplateVersionProfile: SafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot | null
}

export type SafeBatchDefaultFiveChapterRecoveryVerdictRelapseSnapshot = {
  visible: boolean
  status: string
  label: string
  source: string
  summary: string
  defaultBatchChapterNos: number[]
  restoreChapterNos: number[]
  previousValidationChapterNos: number[]
  validationChapterNos: number[]
  relapseBatchChapterNos: number[]
  relapsedChapterNos: number[]
  repeatedHotspotSegment: {
    key: string
    label: string
    riskCount: number
  } | null
  failureReasons: string[]
  clearedFailureReasons: string[]
  relapsedFailureReasons: string[]
  stableFailureReasons: string[]
  failureReasonStatuses: {
    reason: string
    status: 'relapsed' | 'stable'
    riskCount: number
  }[]
}

export type SafeBatchDefaultFiveChapterLaneRedesignSnapshot = {
  visible: boolean
  label: string
  reason: string
  relapseCount: number
  repeatedFailureReasons: string[]
  missedRequirements: {
    key: string
    label: string
    count: number
  }[]
  summary: string
}

export type SafeBatchExpansionStructureValidationResultSnapshot = {
  visible: boolean
  status: 'ok' | 'warn'
  label: string
  summary: string
  validationChapterNos: number[]
  failedChapterNos: number[]
  riskCount: number
  defaultFiveChapterRecoveryVerdict: SafeBatchDefaultFiveChapterRecoveryVerdictSnapshot | null
  defaultFiveChapterLaneTemplateVerdict: SafeBatchDefaultFiveChapterLaneTemplateVerdictSnapshot | null
}

export type SafeBatchExpansionStructureValidationTrendSnapshot = {
  visible: boolean
  status: 'ok' | 'warn'
  label: string
  summary: string
  segmentKey: string
  segmentLabel: string
  validationBatchCount: number
  passedBatchCount: number
  failedBatchCount: number
  passRate: number
  latestStatus: 'none' | 'ok' | 'warn'
  latestChapterNos: number[]
  failureReasons: {
    key: string
    label: string
    count: number
  }[]
  recurrenceAfterRestore: {
    visible: boolean
    intervalBatchCount: number
    intervalLabel: string
    recurrenceChapterNos: number[]
  }
}

export type SafeBatchExpansionStructureRepairEffectivenessSnapshot = {
  visible: boolean
  status: 'ok' | 'warn'
  label: string
  summary: string
  sourceRunId: any | null
  repairedAt: string
  segmentKey: string
  segmentLabel: string
  baselinePassRate: number
  currentPassRate: number
  passRateDelta: number
  baselineFailureReasonCount: number
  currentFailureReasonCount: number
  failureReasonDelta: number
  baselineRecurrenceIntervalBatchCount: number
  currentRecurrenceIntervalBatchCount: number
  recommendation: string
  baselineTrend: any | null
  currentTrend: any | null
  defaultFiveChapterRecoveryVerdictRelapseTrend: SafeBatchDefaultFiveChapterRecoveryVerdictRelapseTrendSnapshot | null
}

export type SafeBatchDefaultFiveChapterRecoveryVerdictRelapseTrendSnapshot = {
  visible: boolean
  baselineRelapseCount: number
  currentRelapseCount: number
  repeatedRelapseCount: number
  repeatedFailureReasons: {
    reason: string
    count: number
  }[]
  recommendation: string
  summary: string
}

export type SafeBatchExpansionStructureDecisionTrendSnapshot = {
  visible: boolean
  status: 'ok' | 'warn'
  label: string
  summary: string
  totalBatchCount: number
  passedBatchCount: number
  failedBatchCount: number
  latestStatus: 'none' | 'ok' | 'warn'
  latestBatchCreatedAt: string
  latestChapterNos: number[]
  latestSegmentKey: string
  latestSegmentLabel: string
  topFailedRecommendation: {
    key: string
    label: string
    count: number
  } | null
  topFailedRequirement: {
    key: string
    label: string
    count: number
  } | null
  failedRequirements: {
    key: string
    label: string
    count: number
  }[]
  topFailedSegment: {
    key: string
    label: string
    count: number
  } | null
  defaultFiveChapterLaneRedesign: SafeBatchDefaultFiveChapterLaneRedesignSnapshot | null
  suggestedTargetChapterCount: number
}

export type RecoveryEvidenceSourceRiskProfileSnapshot = {
  visible: boolean
  status: 'ok' | 'warn'
  label: string
  summary: string
  totalFailureCount: number
  repeatSourceCount: number
  strengthenedAcceptanceTrend: StrengthenedRepairAcceptanceTrendSnapshot | null
  sources: {
    source: string
    label: string
    releaseFailureCount: number
    trendLabel: string
    evidence: string[]
    deepRepairDirection: string
    deepRepairEffect: {
      status: 'none' | 'pending' | 'observing' | 'recurred'
      label: string
      summary: string
      latestRepairRunId: any | null
      latestRepairActionLabel: string
      latestRepairAt: string
      postRepairFailureCount: number
      postRepairEvidence: string[]
      strengthenedClosure: {
        status: 'not_required' | 'needs_repair' | 'pending_recheck' | 'converged' | 'recurred'
        label: string
        summary: string
        latestRepairRunId: any | null
        latestRepairAt: string
        postRepairFailureCount: number
        postRepairEvidence: string[]
      }
    }
  }[]
}

function buildSafeBatchRecoveryRoadmapSnapshot(roadmapLike: any): SafeBatchRecoveryRoadmapSnapshot | null {
  const roadmap = parseJsonValue(roadmapLike) || roadmapLike || null
  if (!roadmap || roadmap.visible === false) return null
  const focusMap: Record<string, Partial<SafeBatchRecoveryFocusSnapshot>> = {
    strengthened_acceptance: {
      targetView: 'recovery_review',
      issueType: 'strengthened_repair_acceptance_mismatch',
      source: 'strengthened_repair_acceptance_trend',
      taskCenterFilterLabel: '强化复盘',
    },
    expansion_feedback: {
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_segment_hotspot',
      source: 'safe_batch_expansion_feedback',
      taskCenterFilterLabel: '扩批分段',
    },
    structure_validation: {
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_repair',
      source: 'safe_batch_expansion_structure_validation',
      taskCenterFilterLabel: '扩批结构',
    },
    structure_repair_effectiveness: {
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_repair',
      source: 'safe_batch_expansion_structure_repair_effectiveness',
      taskCenterFilterLabel: '扩批结构',
    },
    structure_decision_execution: {
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_decision_mismatch',
      source: 'safe_batch_expansion_structure_decision_trend',
      taskCenterFilterLabel: '扩批结构决策',
    },
    default_lane_template_version: {
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_repair',
      source: 'default_five_chapter_lane_template_stability_profile',
      taskCenterFilterLabel: '当前模板版本',
      requirementKey: 'default_lane_template',
    },
  }
  const normalizeStatus = (value: any): SafeBatchRecoveryRoadmapNodeSnapshot['status'] => {
    const status = String(value || '').trim()
    if (status === 'ok' || status === 'warn' || status === 'pending') return status
    return 'pending'
  }
  const normalizeFocus = (focusLike: any, nodeKey = '', nodeLabel = '', nodeActionLabel = ''): SafeBatchRecoveryFocusSnapshot | null => {
    const focus = parseJsonValue(focusLike) || focusLike || null
    const key = compactEvidenceText(focus?.layer_key || focus?.layerKey || nodeKey)
    const fallback = focusMap[key] || null
    if (!focus && !fallback) return null
    const layerLabel = compactEvidenceText(focus?.layer_label || focus?.layerLabel || nodeLabel)
    const actionLabel = compactEvidenceText(focus?.action_label || focus?.actionLabel || nodeActionLabel || layerLabel)
    const targetView = compactEvidenceText(focus?.target_view || focus?.targetView || fallback?.targetView || '')
    const issueType = compactEvidenceText(focus?.issue_type || focus?.issueType || fallback?.issueType || '')
    if (!key || !targetView && !issueType) return null
    const statuses = Array.isArray(focus?.task_statuses)
      ? focus.task_statuses
      : Array.isArray(focus?.taskStatuses)
        ? focus.taskStatuses
        : []
    return {
      layerKey: key,
      layerLabel,
      actionLabel,
      targetView,
      issueType,
      source: compactEvidenceText(focus?.source || fallback?.source || 'safe_batch_recovery_roadmap'),
      taskStatuses: statuses.map((item: any) => compactEvidenceText(item)).filter(Boolean),
      taskCenterFilterLabel: compactEvidenceText(focus?.task_center_filter_label || focus?.taskCenterFilterLabel || fallback?.taskCenterFilterLabel || layerLabel),
      requirementKey: compactEvidenceText(focus?.requirement_key || focus?.requirementKey || fallback?.requirementKey || ''),
      templateVersionId: compactEvidenceText(focus?.template_version_id || focus?.templateVersionId || ''),
    }
  }
  const normalizeNode = (node: any): SafeBatchRecoveryRoadmapNodeSnapshot | null => {
    if (!node) return null
    const key = compactEvidenceText(node?.key || '')
    const label = compactEvidenceText(node?.label || key)
    if (!key || !label) return null
    const actionLabel = compactEvidenceText(node?.action_label || node?.actionLabel || '')
    return {
      key,
      label,
      status: normalizeStatus(node?.status),
      targetChapterCount: Number(node?.target_chapter_count ?? node?.targetChapterCount ?? 0),
      detail: compactEvidenceText(node?.detail || ''),
      actionLabel,
      focus: normalizeFocus(node?.focus, key, label, actionLabel),
    }
  }
  const routeNodes = (Array.isArray(roadmap?.route_nodes)
    ? roadmap.route_nodes
    : Array.isArray(roadmap?.routeNodes)
      ? roadmap.routeNodes
      : []
  ).map(normalizeNode).filter(Boolean) as SafeBatchRecoveryRoadmapNodeSnapshot[]
  const nextRepairLayer = normalizeNode(roadmap?.next_repair_layer || roadmap?.nextRepairLayer)
  const recommendedFocus = normalizeFocus(roadmap?.recommended_focus || roadmap?.recommendedFocus)
    || (nextRepairLayer?.status === 'warn' ? nextRepairLayer.focus : null)

  return {
    visible: true,
    label: compactEvidenceText(roadmap?.label || '安全连写恢复路线图'),
    currentLane: compactEvidenceText(roadmap?.current_lane || roadmap?.currentLane || ''),
    currentLaneLabel: compactEvidenceText(roadmap?.current_lane_label || roadmap?.currentLaneLabel || ''),
    currentTargetChapterCount: Number(roadmap?.current_target_chapter_count ?? roadmap?.currentTargetChapterCount ?? 0),
    currentStatus: compactEvidenceText(roadmap?.current_status || roadmap?.currentStatus || ''),
    currentReason: compactEvidenceText(roadmap?.current_reason || roadmap?.currentReason || ''),
    recommendedFocus,
    nextRepairLayer,
    routeNodes,
  }
}

export function buildSafeBatchExpansionPolicySnapshot(batchPreflight: any): SafeBatchExpansionPolicySnapshot | null {
  const policy = parseJsonValue(
    batchPreflight?.safe_batch_expansion_policy
      || batchPreflight?.safeBatchExpansionPolicy,
  ) || batchPreflight?.safe_batch_expansion_policy || batchPreflight?.safeBatchExpansionPolicy || null
  if (!policy) return null
  const targetChapterCount = Number(policy?.target_chapter_count ?? policy?.targetChapterCount ?? 0)
  if (!Number.isFinite(targetChapterCount) || targetChapterCount <= 0) return null
  const rawStatus = String(policy?.status || '').trim()
  const status = rawStatus === 'expanded' ? 'expanded' : rawStatus === 'recovering' ? 'recovering' : 'observing'
  const latestStatusText = String(policy?.latest_status || policy?.latestStatus || '').trim()
  const latestStatus = latestStatusText === 'ok' || latestStatusText === 'warn' ? latestStatusText : 'none'
  const expandedChapterCount = Number(policy?.expanded_chapter_count ?? policy?.expandedChapterCount ?? targetChapterCount)
  const expansionFeedback = buildSafeBatchExpansionFeedbackSnapshot(policy?.expansion_feedback || policy?.expansionFeedback)
  const recoveryRoadmap = buildSafeBatchRecoveryRoadmapSnapshot(policy?.safe_batch_recovery_roadmap || policy?.safeBatchRecoveryRoadmap || policy?.recoveryRoadmap)
  const recoveryRestoreStabilityLane = buildSafeBatchRecoveryRestoreStabilityLaneSnapshot(
    batchPreflight?.safe_batch_recovery_restore_stability_lane
      || batchPreflight?.safeBatchRecoveryRestoreStabilityLane
      || policy?.safe_batch_recovery_restore_stability_lane
      || policy?.safeBatchRecoveryRestoreStabilityLane,
    expansionFeedback?.recoveryRestoreStabilityEvidence || null,
  )

  return {
    visible: true,
    status,
    label: compactEvidenceText(policy?.label || '强化扩批规则'),
    summary: compactEvidenceText(policy?.summary || '按强化恢复验收趋势决定是否扩大安全连写批次。'),
    targetChapterCount,
    baseChapterCount: Number(policy?.base_chapter_count ?? policy?.baseChapterCount ?? 3),
    expandedChapterCount,
    requiredPassStreak: Number(policy?.required_pass_streak ?? policy?.requiredPassStreak ?? 3),
    passStreak: Number(policy?.pass_streak ?? policy?.passStreak ?? 0),
    acceptedBatchCount: Number(policy?.accepted_batch_count ?? policy?.acceptedBatchCount ?? 0),
    failedBatchCount: Number(policy?.failed_batch_count ?? policy?.failedBatchCount ?? 0),
    latestStatus,
    expansionFeedback,
    recoveryRoadmap,
    recoveryValidation: buildSafeBatchRecoveryValidationSnapshot(expansionFeedback, recoveryRoadmap, expandedChapterCount),
    recoveryRestoreStabilityLane,
  }
}

function buildSafeBatchRecoveryValidationSnapshot(
  expansionFeedback: SafeBatchExpansionFeedbackSnapshot | null,
  recoveryRoadmap: SafeBatchRecoveryRoadmapSnapshot | null,
  expandedChapterCount: number,
): SafeBatchRecoveryValidationSnapshot | null {
  const result = expansionFeedback?.structureValidationResult || null
  if (!result?.visible) return null
  const passed = result.status === 'ok' && result.riskCount <= 0
  const focus = passed ? null : recoveryRoadmap?.recommendedFocus || recoveryRoadmap?.nextRepairLayer?.focus || null
  const repairLabel = compactEvidenceText(focus?.actionLabel || recoveryRoadmap?.nextRepairLayer?.actionLabel || focus?.taskCenterFilterLabel || '下一层修复')

  return {
    visible: true,
    status: passed ? 'passed' : 'failed',
    label: passed ? '3章验证批通过' : '3章验证批未过',
    summary: result.summary,
    validationChapterNos: result.validationChapterNos,
    failedChapterNos: result.failedChapterNos,
    riskCount: result.riskCount,
    targetChapterCount: passed
      ? Math.max(5, recoveryRoadmap?.currentTargetChapterCount || expansionFeedback?.targetChapterCount || expandedChapterCount || 5)
      : Math.max(1, recoveryRoadmap?.currentTargetChapterCount || expansionFeedback?.targetChapterCount || 3),
    nextActionKind: passed ? 'confirm_restore_five' : 'focus_repair',
    nextActionLabel: passed ? '确认恢复5章扩批' : `聚焦${repairLabel}`,
    focus,
    defaultFiveChapterRecoveryVerdict: result.defaultFiveChapterRecoveryVerdict || null,
    defaultFiveChapterLaneTemplateVerdict: result.defaultFiveChapterLaneTemplateVerdict || null,
  }
}

function safeBatchExpansionFeedbackLabel(status: SafeBatchExpansionFeedbackSnapshot['status'], fallback: string) {
  if (status === 'recovered' || status === 'passed') return '扩批热区已清'
  if (status === 'rollback_to_small_batch' || status === 'rollback_to_single_chapter') return '扩批热区待修'
  return fallback || '扩批反馈'
}

function safeBatchExpansionFeedbackColor(status: SafeBatchExpansionFeedbackSnapshot['status']) {
  if (status === 'recovered' || status === 'passed') return 'green'
  if (status === 'rollback_to_single_chapter') return 'red'
  if (status === 'rollback_to_small_batch') return 'gold'
  return 'blue'
}

function buildSafeBatchExpansionStructureValidationTrendSnapshot(trendLike: any): SafeBatchExpansionStructureValidationTrendSnapshot | null {
  const trend = parseJsonValue(trendLike) || trendLike || null
  if (!trend || trend.visible === false) return null
  const rawStatus = String(trend?.status || '').trim()
  const rawLatestStatus = String(trend?.latest_status || trend?.latestStatus || '').trim()
  const latestStatus = rawLatestStatus === 'ok' || rawLatestStatus === 'warn' ? rawLatestStatus : 'none'
  const failureReasons = (Array.isArray(trend?.failure_reasons)
    ? trend.failure_reasons
    : Array.isArray(trend?.failureReasons)
      ? trend.failureReasons
      : []
  ).map((item: any) => ({
    key: compactEvidenceText(item?.key || ''),
    label: compactEvidenceText(item?.label || ''),
    count: Number(item?.count || 0),
  })).filter((item: any) => item.label && item.count > 0)
  const recurrence = trend?.recurrence_after_restore || trend?.recurrenceAfterRestore || {}
  const recurrenceChapterNos = (Array.isArray(recurrence?.recurrence_chapter_nos)
    ? recurrence.recurrence_chapter_nos
    : Array.isArray(recurrence?.recurrenceChapterNos)
      ? recurrence.recurrenceChapterNos
      : []
  ).map((chapterNo: any) => Number(chapterNo)).filter((chapterNo: number) => chapterNo > 0)
  const latestChapterNos = (Array.isArray(trend?.latest_chapter_nos)
    ? trend.latest_chapter_nos
    : Array.isArray(trend?.latestChapterNos)
      ? trend.latestChapterNos
      : []
  ).map((chapterNo: any) => Number(chapterNo)).filter((chapterNo: number) => chapterNo > 0)

  return {
    visible: true,
    status: rawStatus === 'warn' ? 'warn' : 'ok',
    label: compactEvidenceText(trend?.label || '扩批结构验证趋势'),
    summary: compactEvidenceText(trend?.summary || '扩批结构验证趋势已沉淀。'),
    segmentKey: compactEvidenceText(trend?.segment_key || trend?.segmentKey || ''),
    segmentLabel: compactEvidenceText(trend?.segment_label || trend?.segmentLabel || '复发段位'),
    validationBatchCount: Number(trend?.validation_batch_count ?? trend?.validationBatchCount ?? 0),
    passedBatchCount: Number(trend?.passed_batch_count ?? trend?.passedBatchCount ?? 0),
    failedBatchCount: Number(trend?.failed_batch_count ?? trend?.failedBatchCount ?? 0),
    passRate: Number(trend?.pass_rate ?? trend?.passRate ?? 0),
    latestStatus,
    latestChapterNos,
    failureReasons,
    recurrenceAfterRestore: {
      visible: Boolean(recurrence?.visible),
      intervalBatchCount: Number(recurrence?.interval_batch_count ?? recurrence?.intervalBatchCount ?? 0),
      intervalLabel: compactEvidenceText(recurrence?.interval_label || recurrence?.intervalLabel || ''),
      recurrenceChapterNos,
    },
  }
}

function buildSafeBatchDefaultFiveChapterRecoveryVerdictRelapseTrendSnapshot(trendLike: any): SafeBatchDefaultFiveChapterRecoveryVerdictRelapseTrendSnapshot | null {
  const trend = parseJsonValue(trendLike) || trendLike || null
  if (!trend || trend.visible === false) return null
  const repeatedFailureReasons = (Array.isArray(trend?.repeated_failure_reasons)
    ? trend.repeated_failure_reasons
    : Array.isArray(trend?.repeatedFailureReasons)
      ? trend.repeatedFailureReasons
      : []
  ).map((item: any) => ({
    reason: compactEvidenceText(item?.reason || item?.label || item),
    count: Number(item?.count || 0),
  })).filter((item: any) => item.reason && item.count > 0)
  const snapshot = {
    visible: true,
    baselineRelapseCount: Number(trend?.baseline_relapse_count ?? trend?.baselineRelapseCount ?? 0),
    currentRelapseCount: Number(trend?.current_relapse_count ?? trend?.currentRelapseCount ?? 0),
    repeatedRelapseCount: Number(trend?.repeated_relapse_count ?? trend?.repeatedRelapseCount ?? 0),
    repeatedFailureReasons,
    recommendation: compactEvidenceText(trend?.recommendation || ''),
    summary: compactEvidenceText(trend?.summary || ''),
  }
  if (!snapshot.summary && !snapshot.repeatedFailureReasons.length && snapshot.repeatedRelapseCount <= 0) return null
  return snapshot
}

function buildSafeBatchExpansionStructureRepairEffectivenessSnapshot(effectivenessLike: any): SafeBatchExpansionStructureRepairEffectivenessSnapshot | null {
  const effectiveness = parseJsonValue(effectivenessLike) || effectivenessLike || null
  if (!effectiveness || effectiveness.visible === false) return null
  const rawStatus = String(effectiveness?.status || '').trim()

  return {
    visible: true,
    status: rawStatus === 'warn' ? 'warn' : 'ok',
    label: compactEvidenceText(effectiveness?.label || '结构修复有效性'),
    summary: compactEvidenceText(effectiveness?.summary || '结构修复有效性已接入扩批反馈。'),
    sourceRunId: effectiveness?.source_run_id ?? effectiveness?.sourceRunId ?? null,
    repairedAt: compactEvidenceText(effectiveness?.repaired_at || effectiveness?.repairedAt || ''),
    segmentKey: compactEvidenceText(effectiveness?.segment_key || effectiveness?.segmentKey || ''),
    segmentLabel: compactEvidenceText(effectiveness?.segment_label || effectiveness?.segmentLabel || ''),
    baselinePassRate: Number(effectiveness?.baseline_pass_rate ?? effectiveness?.baselinePassRate ?? 0),
    currentPassRate: Number(effectiveness?.current_pass_rate ?? effectiveness?.currentPassRate ?? 0),
    passRateDelta: Number(effectiveness?.pass_rate_delta ?? effectiveness?.passRateDelta ?? 0),
    baselineFailureReasonCount: Number(effectiveness?.baseline_failure_reason_count ?? effectiveness?.baselineFailureReasonCount ?? 0),
    currentFailureReasonCount: Number(effectiveness?.current_failure_reason_count ?? effectiveness?.currentFailureReasonCount ?? 0),
    failureReasonDelta: Number(effectiveness?.failure_reason_delta ?? effectiveness?.failureReasonDelta ?? 0),
    baselineRecurrenceIntervalBatchCount: Number(effectiveness?.baseline_recurrence_interval_batch_count ?? effectiveness?.baselineRecurrenceIntervalBatchCount ?? 0),
    currentRecurrenceIntervalBatchCount: Number(effectiveness?.current_recurrence_interval_batch_count ?? effectiveness?.currentRecurrenceIntervalBatchCount ?? 0),
    recommendation: compactEvidenceText(effectiveness?.recommendation || ''),
    baselineTrend: effectiveness?.baseline_trend || effectiveness?.baselineTrend || null,
    currentTrend: effectiveness?.current_trend || effectiveness?.currentTrend || null,
    defaultFiveChapterRecoveryVerdictRelapseTrend: buildSafeBatchDefaultFiveChapterRecoveryVerdictRelapseTrendSnapshot(
      effectiveness?.default_five_chapter_recovery_verdict_relapse_trend || effectiveness?.defaultFiveChapterRecoveryVerdictRelapseTrend,
    ),
  }
}

function isDefaultFiveChapterLaneRequirementKey(key: string) {
  return key.startsWith('default_lane_')
}

function normalizeDecisionRequirementCountList(value: any) {
  return (Array.isArray(value) ? value : [])
    .map((item: any) => {
      const label = compactEvidenceText(item?.label || item?.key || '')
      const count = Number(item?.count || 0)
      if (!label || count <= 0) return null
      return {
        key: compactEvidenceText(item?.key || label),
        label,
        count,
      }
    })
    .filter(Boolean) as { key: string; label: string; count: number }[]
}

function buildSafeBatchDefaultFiveChapterLaneRedesignSnapshot(
  redesignLike: any,
  failedRequirements: { key: string; label: string; count: number }[],
): SafeBatchDefaultFiveChapterLaneRedesignSnapshot | null {
  const redesign = parseJsonValue(redesignLike) || redesignLike || null
  if (redesign?.visible === false) return null
  const defaultLaneFailedRequirements = failedRequirements.filter(item => isDefaultFiveChapterLaneRequirementKey(item.key))
  const explicitMissedRequirements = normalizeDecisionRequirementCountList(
    redesign?.missed_requirements || redesign?.missedRequirements,
  )
  const missedRequirements = explicitMissedRequirements.length
    ? explicitMissedRequirements
    : defaultLaneFailedRequirements
  if (!redesign && !missedRequirements.length) return null
  const repeatedFailureReasons = normalizeEvidenceTextList(
    redesign?.repeated_failure_reasons || redesign?.repeatedFailureReasons,
  )
  const missedRequirementText = missedRequirements.map(item => item.label).join('、')
  const relapseCount = Number(redesign?.relapse_count ?? redesign?.relapseCount ?? 0)
  const summary = compactEvidenceText(redesign?.summary || (
    missedRequirementText
      ? `默认5章档位模板漏项：${missedRequirementText}。`
      : '默认5章档位结构重构需要补齐模板回执。'
  ))

  return {
    visible: true,
    label: compactEvidenceText(redesign?.label || '默认档位模板漏项'),
    reason: compactEvidenceText(redesign?.reason || ''),
    relapseCount: Number.isFinite(relapseCount) ? relapseCount : 0,
    repeatedFailureReasons,
    missedRequirements,
    summary,
  }
}

function buildSafeBatchExpansionStructureDecisionTrendSnapshot(trendLike: any): SafeBatchExpansionStructureDecisionTrendSnapshot | null {
  const trend = parseJsonValue(trendLike) || trendLike || null
  if (!trend || trend.visible === false) return null
  const rawStatus = String(trend?.status || '').trim()
  const rawLatestStatus = String(trend?.latest_status || trend?.latestStatus || '').trim()
  const latestStatus = rawLatestStatus === 'ok' || rawLatestStatus === 'warn' ? rawLatestStatus : 'none'
  const latestChapterNos = (Array.isArray(trend?.latest_chapter_nos)
    ? trend.latest_chapter_nos
    : Array.isArray(trend?.latestChapterNos)
      ? trend.latestChapterNos
      : []
  ).map((chapterNo: any) => Number(chapterNo)).filter((chapterNo: number) => chapterNo > 0)
  const normalizeCount = (source: any) => {
    if (!source) return null
    const label = compactEvidenceText(source?.label || source?.key || '')
    const count = Number(source?.count || 0)
    if (!label || count <= 0) return null
    return {
      key: compactEvidenceText(source?.key || label),
      label,
      count,
    }
  }
  const failedRequirements = normalizeDecisionRequirementCountList(trend?.failed_requirements || trend?.failedRequirements)
  const topFailedRequirement = normalizeCount(trend?.top_failed_requirement || trend?.topFailedRequirement)
  const fallbackFailedRequirements = failedRequirements.length
    ? failedRequirements
    : topFailedRequirement
      ? [topFailedRequirement]
      : []

  return {
    visible: true,
    status: rawStatus === 'warn' ? 'warn' : 'ok',
    label: compactEvidenceText(trend?.label || '扩批结构决策执行趋势'),
    summary: compactEvidenceText(trend?.summary || '扩批结构决策执行趋势已沉淀。'),
    totalBatchCount: Number(trend?.total_batch_count ?? trend?.totalBatchCount ?? 0),
    passedBatchCount: Number(trend?.passed_batch_count ?? trend?.passedBatchCount ?? 0),
    failedBatchCount: Number(trend?.failed_batch_count ?? trend?.failedBatchCount ?? 0),
    latestStatus,
    latestBatchCreatedAt: compactEvidenceText(trend?.latest_batch_created_at || trend?.latestBatchCreatedAt || ''),
    latestChapterNos,
    latestSegmentKey: compactEvidenceText(trend?.latest_segment_key || trend?.latestSegmentKey || ''),
    latestSegmentLabel: compactEvidenceText(trend?.latest_segment_label || trend?.latestSegmentLabel || ''),
    topFailedRecommendation: normalizeCount(trend?.top_failed_recommendation || trend?.topFailedRecommendation),
    topFailedRequirement,
    failedRequirements: fallbackFailedRequirements,
    topFailedSegment: normalizeCount(trend?.top_failed_segment || trend?.topFailedSegment),
    defaultFiveChapterLaneRedesign: buildSafeBatchDefaultFiveChapterLaneRedesignSnapshot(
      trend?.default_five_chapter_lane_redesign || trend?.defaultFiveChapterLaneRedesign,
      fallbackFailedRequirements,
    ),
    suggestedTargetChapterCount: Number(trend?.suggested_target_chapter_count ?? trend?.suggestedTargetChapterCount ?? 0),
  }
}

function buildSafeBatchExpansionStructureValidationResultSnapshot(resultLike: any): SafeBatchExpansionStructureValidationResultSnapshot | null {
  const result = parseJsonValue(resultLike) || resultLike || null
  if (!result || result.visible === false) return null
  const rawStatus = String(result?.status || '').trim()
  const validationChapterNos = (Array.isArray(result?.validation_chapter_nos)
    ? result.validation_chapter_nos
    : Array.isArray(result?.validationChapterNos)
      ? result.validationChapterNos
      : []
  ).map((chapterNo: any) => Number(chapterNo)).filter((chapterNo: number) => chapterNo > 0)
  const failedChapterNos = (Array.isArray(result?.failed_chapter_nos)
    ? result.failed_chapter_nos
    : Array.isArray(result?.failedChapterNos)
      ? result.failedChapterNos
      : []
  ).map((chapterNo: any) => Number(chapterNo)).filter((chapterNo: number) => chapterNo > 0)

  return {
    visible: true,
    status: rawStatus === 'warn' ? 'warn' : 'ok',
    label: compactEvidenceText(result?.label || '扩批结构验证'),
    summary: compactEvidenceText(result?.summary || '扩批结构验证批已完成。'),
    validationChapterNos,
    failedChapterNos,
    riskCount: Number(result?.risk_count ?? result?.riskCount ?? 0),
    defaultFiveChapterRecoveryVerdict: buildSafeBatchDefaultFiveChapterRecoveryVerdictSnapshot(
      result?.default_five_chapter_recovery_verdict || result?.defaultFiveChapterRecoveryVerdict,
    ),
    defaultFiveChapterLaneTemplateVerdict: buildSafeBatchDefaultFiveChapterLaneTemplateVerdictSnapshot(
      result?.default_five_chapter_lane_template_verdict || result?.defaultFiveChapterLaneTemplateVerdict,
    ),
  }
}

function buildSafeBatchDefaultFiveChapterLaneTemplateFailedRequirementsSnapshot(requirementsLike: any): SafeBatchDefaultFiveChapterLaneTemplateFailedRequirementSnapshot[] {
  const requirements = Array.isArray(requirementsLike) ? requirementsLike : []
  return requirements
    .map((item: any) => ({
      key: compactEvidenceText(item?.key || ''),
      label: compactEvidenceText(item?.label || item?.name || item?.key || ''),
      failureReason: compactEvidenceText(item?.failure_reason || item?.failureReason || ''),
      chapterNos: normalizeChapterNos(item?.chapter_nos || item?.chapterNos),
    }))
    .filter((item: any) => item.key || item.label || item.failureReason || item.chapterNos.length)
}

function buildSafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot(verdictLike: any): SafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot | null {
  const verdict = parseJsonValue(verdictLike) || verdictLike || null
  if (!verdict || verdict.visible === false) return null
  const rawStatus = compactEvidenceText(verdict?.status || '')
  const failedRequirements = buildSafeBatchDefaultFiveChapterLaneTemplateFailedRequirementsSnapshot(
    verdict?.failed_requirements || verdict?.failedRequirements,
  )
  const snapshot = {
    visible: true,
    status: rawStatus === 'failed' ? 'failed' as const : 'passed' as const,
    label: compactEvidenceText(verdict?.label || '默认档位模板生产后验判定'),
    templateVersionId: compactEvidenceText(verdict?.template_version_id || verdict?.templateVersionId || ''),
    defaultBatchChapterNos: normalizeChapterNos(verdict?.default_batch_chapter_nos || verdict?.defaultBatchChapterNos),
    restoreChapterNos: normalizeChapterNos(verdict?.restore_chapter_nos || verdict?.restoreChapterNos),
    previousValidationChapterNos: normalizeChapterNos(verdict?.previous_validation_chapter_nos || verdict?.previousValidationChapterNos),
    validationChapterNos: normalizeChapterNos(verdict?.validation_chapter_nos || verdict?.validationChapterNos),
    failureReasons: normalizeEvidenceTextList(verdict?.failure_reasons || verdict?.failureReasons),
    clearedFailureReasons: normalizeEvidenceTextList(verdict?.cleared_failure_reasons || verdict?.clearedFailureReasons),
    remainingFailureReasons: normalizeEvidenceTextList(verdict?.remaining_failure_reasons || verdict?.remainingFailureReasons),
    failureReasonStatuses: (Array.isArray(verdict?.failure_reason_statuses)
      ? verdict.failure_reason_statuses
      : Array.isArray(verdict?.failureReasonStatuses)
        ? verdict.failureReasonStatuses
        : []
    ).map((item: any) => {
      const statusText = compactEvidenceText(item?.status || '')
      return {
        reason: compactEvidenceText(item?.reason || ''),
        status: statusText === 'remaining' ? 'remaining' as const : 'cleared' as const,
        riskCount: Number(item?.risk_count ?? item?.riskCount ?? 0),
      }
    }).filter((item: any) => item.reason),
    failedCount: Number(verdict?.failed_count ?? verdict?.failedCount ?? failedRequirements.length),
    failedRequirements,
    summary: compactEvidenceText(verdict?.summary || ''),
  }
  if (!snapshot.summary && !snapshot.failureReasons.length && !snapshot.failedRequirements.length) return null
  return snapshot
}

function buildSafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot(versionLike: any): SafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot | null {
  const version = parseJsonValue(versionLike) || versionLike || null
  if (!version || version.visible === false) return null
  const id = compactEvidenceText(version?.id || version?.template_version_id || version?.templateVersionId || version?.version_id || version?.versionId || '')
  const snapshot = {
    id,
    label: compactEvidenceText(version?.label || '默认5章档位模板版本'),
    source: compactEvidenceText(version?.source || ''),
    redesignSource: compactEvidenceText(version?.redesign_source || version?.redesignSource || ''),
    sourceRunId: version?.source_run_id ?? version?.sourceRunId ?? null,
    summary: compactEvidenceText(version?.summary || ''),
    latestStatus: compactEvidenceText(version?.latest_status || version?.latestStatus || ''),
    latestBatchCreatedAt: compactEvidenceText(version?.latest_batch_created_at || version?.latestBatchCreatedAt || ''),
    latestChapterNos: normalizeChapterNos(version?.latest_chapter_nos || version?.latestChapterNos),
    validationBatchCount: Number(version?.validation_batch_count ?? version?.validationBatchCount ?? 0),
    passedBatchCount: Number(version?.passed_batch_count ?? version?.passedBatchCount ?? 0),
    failedBatchCount: Number(version?.failed_batch_count ?? version?.failedBatchCount ?? 0),
    passStreak: Number(version?.pass_streak ?? version?.passStreak ?? 0),
    requiredPassStreak: Number(version?.required_pass_streak ?? version?.requiredPassStreak ?? 0),
    status: compactEvidenceText(version?.status || ''),
    productionValidationFailedCount: Number(version?.production_validation_failed_count ?? version?.productionValidationFailedCount ?? 0),
    latestProductionRelapseVerdict: buildSafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot(
      version?.latest_production_relapse_verdict || version?.latestProductionRelapseVerdict,
    ),
  }
  if (!snapshot.id && !snapshot.summary && !snapshot.sourceRunId && !snapshot.redesignSource) return null
  return snapshot
}

function buildSafeBatchDefaultFiveChapterLaneTemplateVerdictSnapshot(verdictLike: any): SafeBatchDefaultFiveChapterLaneTemplateVerdictSnapshot | null {
  const verdict = parseJsonValue(verdictLike) || verdictLike || null
  if (!verdict || verdict.visible === false) return null
  const rawStatus = compactEvidenceText(verdict?.status || '')
  const status = rawStatus === 'failed' ? 'failed' : 'passed'
  const requirements = (Array.isArray(verdict?.requirements)
    ? verdict.requirements
    : Array.isArray(verdict?.items)
      ? verdict.items
      : []
  ).map((item: any) => {
    const itemStatus = compactEvidenceText(item?.status || '')
    return {
      key: compactEvidenceText(item?.key || ''),
      label: compactEvidenceText(item?.label || item?.name || item?.key || ''),
      status: itemStatus === 'missing'
        ? 'missing' as const
        : itemStatus === 'unverified'
          ? 'unverified' as const
          : 'fulfilled' as const,
    }
  }).filter((item: any) => item.key || item.label)
  const missingRequirements = (Array.isArray(verdict?.missing_requirements)
    ? verdict.missing_requirements
    : Array.isArray(verdict?.missingRequirements)
      ? verdict.missingRequirements
      : []
  ).map((item: any) => ({
    key: compactEvidenceText(item?.key || ''),
    label: compactEvidenceText(item?.label || item?.name || item?.key || ''),
    chapterNos: normalizeChapterNos(item?.chapter_nos || item?.chapterNos),
  })).filter((item: any) => item.key || item.label || item.chapterNos.length)
  const missingCount = Number(verdict?.missing_count ?? verdict?.missingCount ?? missingRequirements.reduce((sum: number, item: any) => sum + item.chapterNos.length, 0))
  const productionRelapseVerdict = buildSafeBatchDefaultFiveChapterLaneTemplateProductionRelapseVerdictSnapshot(
    verdict?.production_relapse_verdict || verdict?.productionRelapseVerdict,
  )
  const productionFailedRequirements = buildSafeBatchDefaultFiveChapterLaneTemplateFailedRequirementsSnapshot(
    verdict?.production_failed_requirements
      || verdict?.productionFailedRequirements
      || productionRelapseVerdict?.failedRequirements,
  )
  const productionFailedCount = Number(verdict?.production_failed_count ?? verdict?.productionFailedCount ?? productionRelapseVerdict?.failedCount ?? productionFailedRequirements.length)
  const snapshot = {
    visible: true,
    status,
    label: compactEvidenceText(verdict?.label || '默认档位模板回检'),
    summary: compactEvidenceText(verdict?.summary || ''),
    validationChapterNos: normalizeChapterNos(verdict?.validation_chapter_nos || verdict?.validationChapterNos),
    requirements,
    missingCount: Number.isFinite(missingCount) ? missingCount : 0,
    missingRequirements,
    productionFailedCount: Number.isFinite(productionFailedCount) ? productionFailedCount : 0,
    productionRelapseVerdict,
    productionFailedRequirements,
    templateVersion: buildSafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot(
      verdict?.template_version || verdict?.templateVersion,
    ),
  }
  if (!snapshot.summary && !snapshot.requirements.length && !snapshot.missingRequirements.length && !snapshot.productionRelapseVerdict) return null
  return snapshot
}

function buildSafeBatchDefaultFiveChapterLaneTemplateStabilityProfileSnapshot(profileLike: any): SafeBatchDefaultFiveChapterLaneTemplateStabilityProfileSnapshot | null {
  const profile = parseJsonValue(profileLike) || profileLike || null
  if (!profile || profile.visible === false) return null
  const requirements = (Array.isArray(profile?.requirements)
    ? profile.requirements
    : Array.isArray(profile?.items)
      ? profile.items
      : []
  ).map((item: any) => ({
    key: compactEvidenceText(item?.key || ''),
    label: compactEvidenceText(item?.label || item?.name || item?.key || ''),
    passedCount: Number(item?.passed_count ?? item?.passedCount ?? 0),
    failedCount: Number(item?.failed_count ?? item?.failedCount ?? 0),
    latestStatus: compactEvidenceText(item?.latest_status || item?.latestStatus || ''),
    latestMissingChapterNos: normalizeChapterNos(item?.latest_missing_chapter_nos || item?.latestMissingChapterNos),
  })).filter((item: any) => item.key || item.label || item.passedCount > 0 || item.failedCount > 0)
  const topFailedRaw = profile?.top_failed_requirement || profile?.topFailedRequirement || null
  const topFailedRequirement = topFailedRaw ? {
    key: compactEvidenceText(topFailedRaw?.key || ''),
    label: compactEvidenceText(topFailedRaw?.label || topFailedRaw?.name || topFailedRaw?.key || ''),
    failedCount: Number(topFailedRaw?.failed_count ?? topFailedRaw?.failedCount ?? 0),
  } : null
  const templateVersionProfiles = (Array.isArray(profile?.template_version_profiles)
    ? profile.template_version_profiles
    : Array.isArray(profile?.templateVersionProfiles)
      ? profile.templateVersionProfiles
      : []
  ).map(buildSafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot)
    .filter(Boolean) as SafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot[]
  const latestTemplateVersionProfile = buildSafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot(
    profile?.latest_template_version_profile || profile?.latestTemplateVersionProfile,
  )
  const snapshot = {
    visible: true,
    status: compactEvidenceText(profile?.status || ''),
    label: compactEvidenceText(profile?.label || '默认档位模板稳定性'),
    summary: compactEvidenceText(profile?.summary || ''),
    latestStatus: compactEvidenceText(profile?.latest_status || profile?.latestStatus || ''),
    latestBatchCreatedAt: compactEvidenceText(profile?.latest_batch_created_at || profile?.latestBatchCreatedAt || ''),
    latestChapterNos: normalizeChapterNos(profile?.latest_chapter_nos || profile?.latestChapterNos),
    validationBatchCount: Number(profile?.validation_batch_count ?? profile?.validationBatchCount ?? 0),
    passedBatchCount: Number(profile?.passed_batch_count ?? profile?.passedBatchCount ?? 0),
    failedBatchCount: Number(profile?.failed_batch_count ?? profile?.failedBatchCount ?? 0),
    passStreak: Number(profile?.pass_streak ?? profile?.passStreak ?? 0),
    requiredPassStreak: Number(profile?.required_pass_streak ?? profile?.requiredPassStreak ?? 0),
    recommendation: compactEvidenceText(profile?.recommendation || ''),
    failedRequirementCount: Number(profile?.failed_requirement_count ?? profile?.failedRequirementCount ?? 0),
    requirements,
    topFailedRequirement: topFailedRequirement && (topFailedRequirement.key || topFailedRequirement.label || topFailedRequirement.failedCount > 0)
      ? topFailedRequirement
      : null,
    templateVersionProfiles,
    latestTemplateVersionProfile,
  }
  if (!snapshot.summary && !snapshot.requirements.length && snapshot.validationBatchCount <= 0) return null
  return snapshot
}

function buildSafeBatchDefaultFiveChapterRecoveryVerdictSnapshot(verdictLike: any): SafeBatchDefaultFiveChapterRecoveryVerdictSnapshot | null {
  const verdict = parseJsonValue(verdictLike) || verdictLike || null
  if (!verdict || verdict.visible === false) return null
  const rawStatus = compactEvidenceText(verdict?.status || '')
  const status = rawStatus === 'failed' ? 'failed' : 'passed'
  const failureReasonStatuses = (Array.isArray(verdict?.failure_reason_statuses)
    ? verdict.failure_reason_statuses
    : Array.isArray(verdict?.failureReasonStatuses)
      ? verdict.failureReasonStatuses
      : []
  ).map((item: any) => {
    const itemStatus = compactEvidenceText(item?.status || '')
    return {
      reason: compactEvidenceText(item?.reason || ''),
      status: itemStatus === 'remaining' ? 'remaining' as const : 'cleared' as const,
      riskCount: Number(item?.risk_count ?? item?.riskCount ?? 0),
    }
  }).filter((item: any) => item.reason)
  const snapshot = {
    visible: true,
    status,
    label: compactEvidenceText(verdict?.label || '默认档位恢复判定'),
    summary: compactEvidenceText(verdict?.summary || ''),
    defaultBatchChapterNos: normalizeChapterNos(verdict?.default_batch_chapter_nos || verdict?.defaultBatchChapterNos),
    restoreChapterNos: normalizeChapterNos(verdict?.restore_chapter_nos || verdict?.restoreChapterNos),
    previousValidationChapterNos: normalizeChapterNos(verdict?.previous_validation_chapter_nos || verdict?.previousValidationChapterNos),
    validationChapterNos: normalizeChapterNos(verdict?.validation_chapter_nos || verdict?.validationChapterNos),
    failureReasons: normalizeEvidenceTextList(verdict?.failure_reasons || verdict?.failureReasons),
    clearedFailureReasons: normalizeEvidenceTextList(verdict?.cleared_failure_reasons || verdict?.clearedFailureReasons),
    remainingFailureReasons: normalizeEvidenceTextList(verdict?.remaining_failure_reasons || verdict?.remainingFailureReasons),
    failureReasonStatuses,
  }
  if (!snapshot.summary && !snapshot.failureReasons.length && !snapshot.failureReasonStatuses.length) return null
  return snapshot
}

function buildSafeBatchDefaultFiveChapterRecoveryVerdictRelapseSnapshot(relapseLike: any): SafeBatchDefaultFiveChapterRecoveryVerdictRelapseSnapshot | null {
  const relapse = parseJsonValue(relapseLike) || relapseLike || null
  if (!relapse || relapse.visible === false) return null
  const hotspot = relapse?.repeated_hotspot_segment || relapse?.repeatedHotspotSegment || null
  const failureReasonStatuses = (Array.isArray(relapse?.failure_reason_statuses)
    ? relapse.failure_reason_statuses
    : Array.isArray(relapse?.failureReasonStatuses)
      ? relapse.failureReasonStatuses
      : []
  ).map((item: any) => {
    const itemStatus = compactEvidenceText(item?.status || '')
    return {
      reason: compactEvidenceText(item?.reason || ''),
      status: itemStatus === 'stable' ? 'stable' as const : 'relapsed' as const,
      riskCount: Number(item?.risk_count ?? item?.riskCount ?? 0),
    }
  }).filter((item: any) => item.reason)
  const snapshot = {
    visible: true,
    status: compactEvidenceText(relapse?.status || 'relapsed'),
    label: compactEvidenceText(relapse?.label || '恢复判定失效'),
    source: compactEvidenceText(relapse?.source || ''),
    summary: compactEvidenceText(relapse?.summary || ''),
    defaultBatchChapterNos: normalizeChapterNos(relapse?.default_batch_chapter_nos || relapse?.defaultBatchChapterNos),
    restoreChapterNos: normalizeChapterNos(relapse?.restore_chapter_nos || relapse?.restoreChapterNos),
    previousValidationChapterNos: normalizeChapterNos(relapse?.previous_validation_chapter_nos || relapse?.previousValidationChapterNos),
    validationChapterNos: normalizeChapterNos(relapse?.validation_chapter_nos || relapse?.validationChapterNos),
    relapseBatchChapterNos: normalizeChapterNos(relapse?.relapse_batch_chapter_nos || relapse?.relapseBatchChapterNos),
    relapsedChapterNos: normalizeChapterNos(relapse?.relapsed_chapter_nos || relapse?.relapsedChapterNos),
    repeatedHotspotSegment: hotspot ? {
      key: compactEvidenceText(hotspot?.key || ''),
      label: compactEvidenceText(hotspot?.label || hotspot?.key || '复发段位'),
      riskCount: Number(hotspot?.risk_count ?? hotspot?.riskCount ?? 0),
    } : null,
    failureReasons: normalizeEvidenceTextList(relapse?.failure_reasons || relapse?.failureReasons),
    clearedFailureReasons: normalizeEvidenceTextList(relapse?.cleared_failure_reasons || relapse?.clearedFailureReasons),
    relapsedFailureReasons: normalizeEvidenceTextList(relapse?.relapsed_failure_reasons || relapse?.relapsedFailureReasons),
    stableFailureReasons: normalizeEvidenceTextList(relapse?.stable_failure_reasons || relapse?.stableFailureReasons),
    failureReasonStatuses,
  }
  if (!snapshot.summary && !snapshot.relapsedFailureReasons.length && !snapshot.failureReasonStatuses.length) return null
  return snapshot
}

function buildSafeBatchRecoveryRestoreStabilityEvidenceSnapshot(evidenceLike: any): SafeBatchRecoveryRestoreStabilityEvidenceSnapshot | null {
  const evidence = parseJsonValue(evidenceLike) || evidenceLike || null
  if (!evidence || evidence.visible === false) return null
  const restoreChapterNos = normalizeChapterNos(evidence?.restore_chapter_nos || evidence?.restoreChapterNos)
  const validationChapterNos = normalizeChapterNos(evidence?.validation_chapter_nos || evidence?.validationChapterNos)
  const stablePassStreak = Number(evidence?.stable_pass_streak ?? evidence?.stablePassStreak ?? 0)
  const snapshot = {
    status: compactEvidenceText(evidence?.status || ''),
    source: compactEvidenceText(evidence?.source || ''),
    restoredBatchCreatedAt: compactEvidenceText(evidence?.restored_batch_created_at || evidence?.restoredBatchCreatedAt || ''),
    restoreChapterNos,
    validationChapterNos,
    stablePassStreak: Number.isFinite(stablePassStreak) ? stablePassStreak : 0,
    summary: compactEvidenceText(evidence?.summary || ''),
  }
  if (!snapshot.status && !snapshot.source && !snapshot.restoreChapterNos.length && !snapshot.validationChapterNos.length && !snapshot.summary) return null
  return snapshot
}

function buildSafeBatchRecoveryRestoreStabilityLaneSnapshot(
  laneLike: any,
  fallbackEvidence?: SafeBatchRecoveryRestoreStabilityEvidenceSnapshot | null,
): SafeBatchRecoveryRestoreStabilityLaneSnapshot | null {
  const lane = parseJsonValue(laneLike) || laneLike || null
  if (!lane || lane.visible === false) return null
  const stablePassStreak = Number(lane?.stable_pass_streak ?? lane?.stablePassStreak ?? fallbackEvidence?.stablePassStreak ?? 0)
  const requiredStablePassStreak = Number(lane?.required_stable_pass_streak ?? lane?.requiredStablePassStreak ?? 2)
  const normalizedStablePassStreak = Number.isFinite(stablePassStreak) ? stablePassStreak : 0
  const normalizedRequiredStablePassStreak = Number.isFinite(requiredStablePassStreak) && requiredStablePassStreak > 0
    ? requiredStablePassStreak
    : 2
  const rawStatus = compactEvidenceText(lane?.status || '')
  const explicitDefaultFiveChapterReady = lane?.default_five_chapter_ready ?? lane?.defaultFiveChapterReady
  const defaultFiveChapterReady = explicitDefaultFiveChapterReady === undefined || explicitDefaultFiveChapterReady === null
    ? rawStatus === 'ready' || normalizedStablePassStreak >= normalizedRequiredStablePassStreak
    : Boolean(explicitDefaultFiveChapterReady)
  const status = rawStatus || (defaultFiveChapterReady ? 'ready' : 'observing')
  const label = compactEvidenceText(lane?.label || (defaultFiveChapterReady ? '默认5章档位' : '5章观察批'))
  const restoreChapterNos = normalizeChapterNos(lane?.restore_chapter_nos || lane?.restoreChapterNos)
  const validationChapterNos = normalizeChapterNos(lane?.validation_chapter_nos || lane?.validationChapterNos)
  const summary = compactEvidenceText(lane?.summary || fallbackEvidence?.summary || '')
  const latestTemplateVersionProfile = buildSafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot(
    lane?.latest_template_version_profile || lane?.latestTemplateVersionProfile,
  )
  const snapshot = {
    visible: true,
    status,
    label,
    source: compactEvidenceText(lane?.source || fallbackEvidence?.source || ''),
    stablePassStreak: normalizedStablePassStreak,
    requiredStablePassStreak: normalizedRequiredStablePassStreak,
    defaultFiveChapterReady,
    restoreChapterNos: restoreChapterNos.length ? restoreChapterNos : fallbackEvidence?.restoreChapterNos || [],
    validationChapterNos: validationChapterNos.length ? validationChapterNos : fallbackEvidence?.validationChapterNos || [],
    summary,
    taskCenterFilterLabel: compactEvidenceText(lane?.task_center_filter_label || lane?.taskCenterFilterLabel || `批次复盘筛选：${label}`),
    latestTemplateVersionProfile,
  }
  if (!snapshot.status && !snapshot.label && !snapshot.restoreChapterNos.length && !snapshot.validationChapterNos.length && !snapshot.summary) return null
  return snapshot
}

function buildSafeBatchDefaultFiveChapterRegressionSnapshot(regressionLike: any): SafeBatchDefaultFiveChapterRegressionSnapshot | null {
  const regression = parseJsonValue(regressionLike) || regressionLike || null
  if (!regression || regression.visible === false) return null
  const hotspot = regression?.repeated_hotspot_segment || regression?.repeatedHotspotSegment || null
  const stablePassStreak = Number(regression?.stable_pass_streak ?? regression?.stablePassStreak ?? 0)
  const requiredStablePassStreak = Number(regression?.required_stable_pass_streak ?? regression?.requiredStablePassStreak ?? 2)
  const failureReasons = (Array.isArray(regression?.failure_reasons)
    ? regression.failure_reasons
    : Array.isArray(regression?.failureReasons)
      ? regression.failureReasons
      : []
  ).map((item: any) => compactEvidenceText(item)).filter(Boolean)
  const templateVersion = buildSafeBatchDefaultFiveChapterLaneTemplateVersionSnapshot(
    regression?.template_version || regression?.templateVersion,
  )
  const templateVersionId = compactEvidenceText(
    regression?.template_version_id || regression?.templateVersionId || templateVersion?.id || '',
  )
  const templateVersionFailedRequirements = (Array.isArray(regression?.template_version_failed_requirements)
    ? regression.template_version_failed_requirements
    : Array.isArray(regression?.templateVersionFailedRequirements)
      ? regression.templateVersionFailedRequirements
      : []
  ).map((item: any) => ({
    key: compactEvidenceText(item?.key || ''),
    label: compactEvidenceText(item?.label || item?.key || ''),
    failureReason: compactEvidenceText(item?.failure_reason || item?.failureReason || ''),
  })).filter((item: any) => item.key || item.label || item.failureReason)
  const snapshot = {
    visible: true,
    status: compactEvidenceText(regression?.status || ''),
    label: compactEvidenceText(regression?.label || '默认5章档位回退原因'),
    source: compactEvidenceText(regression?.source || ''),
    stablePassStreak: Number.isFinite(stablePassStreak) ? stablePassStreak : 0,
    requiredStablePassStreak: Number.isFinite(requiredStablePassStreak) && requiredStablePassStreak > 0 ? requiredStablePassStreak : 2,
    defaultBatchChapterNos: normalizeChapterNos(regression?.default_batch_chapter_nos || regression?.defaultBatchChapterNos),
    restoreChapterNos: normalizeChapterNos(regression?.restore_chapter_nos || regression?.restoreChapterNos),
    validationChapterNos: normalizeChapterNos(regression?.validation_chapter_nos || regression?.validationChapterNos),
    repeatedHotspotSegment: hotspot ? {
      key: compactEvidenceText(hotspot?.key || ''),
      label: compactEvidenceText(hotspot?.label || hotspot?.key || '复发段位'),
      riskCount: Number(hotspot?.risk_count ?? hotspot?.riskCount ?? 0),
    } : null,
    failureReasons,
    templateVersionId,
    templateVersion,
    templateVersionFailedRequirements,
    summary: compactEvidenceText(regression?.summary || ''),
  }
  if (!snapshot.status && !snapshot.defaultBatchChapterNos.length && !snapshot.summary) return null
  return snapshot
}

function buildSafeBatchExpansionFeedbackSnapshot(feedbackLike: any): SafeBatchExpansionFeedbackSnapshot | null {
  const feedback = parseJsonValue(feedbackLike) || feedbackLike || null
  if (!feedback || feedback.visible === false) return null
  const rawStatus = String(feedback?.status || '').trim()
  const status = ([
    'passed',
    'recovered',
    'rollback_to_small_batch',
    'rollback_to_single_chapter',
  ].includes(rawStatus) ? rawStatus : 'none') as SafeBatchExpansionFeedbackSnapshot['status']
  const latestChapterNos = (Array.isArray(feedback?.latest_chapter_nos)
    ? feedback.latest_chapter_nos
    : Array.isArray(feedback?.latestChapterNos)
      ? feedback.latestChapterNos
      : []
  ).map((chapterNo: any) => Number(chapterNo)).filter((chapterNo: number) => chapterNo > 0)

  return {
    visible: true,
    status,
    label: safeBatchExpansionFeedbackLabel(status, compactEvidenceText(feedback?.label || '扩批反馈')),
    summary: compactEvidenceText(feedback?.summary || '扩批反馈已写入安全连写策略。'),
    targetChapterCount: Number(feedback?.target_chapter_count ?? feedback?.targetChapterCount ?? 0),
    latestBatchCreatedAt: compactEvidenceText(feedback?.latest_batch_created_at || feedback?.latestBatchCreatedAt || ''),
    latestChapterNos,
    riskCount: Number(feedback?.risk_count ?? feedback?.riskCount ?? 0),
    stablePassStreak: Number(feedback?.stable_pass_streak ?? feedback?.stablePassStreak ?? 0),
    recentExpandedBatchCount: Number(feedback?.recent_expanded_batch_count ?? feedback?.recentExpandedBatchCount ?? 0),
    repeatedHotspotSegment: feedback?.repeated_hotspot_segment || feedback?.repeatedHotspotSegment ? {
      key: compactEvidenceText((feedback?.repeated_hotspot_segment || feedback?.repeatedHotspotSegment)?.key || ''),
      label: compactEvidenceText((feedback?.repeated_hotspot_segment || feedback?.repeatedHotspotSegment)?.label || ''),
      count: Number((feedback?.repeated_hotspot_segment || feedback?.repeatedHotspotSegment)?.count || 0),
      summary: compactEvidenceText((feedback?.repeated_hotspot_segment || feedback?.repeatedHotspotSegment)?.summary || ''),
    } : null,
    structureValidationTrend: buildSafeBatchExpansionStructureValidationTrendSnapshot(
      feedback?.expansion_structure_validation_trend || feedback?.expansionStructureValidationTrend,
    ),
    structureValidationResult: buildSafeBatchExpansionStructureValidationResultSnapshot(
      feedback?.expansion_structure_validation_result || feedback?.expansionStructureValidationResult,
    ),
    structureRepairEffectiveness: buildSafeBatchExpansionStructureRepairEffectivenessSnapshot(
      feedback?.expansion_structure_repair_effectiveness || feedback?.expansionStructureRepairEffectiveness,
    ),
    structureDecisionTrend: buildSafeBatchExpansionStructureDecisionTrendSnapshot(
      feedback?.expansion_structure_decision_trend || feedback?.expansionStructureDecisionTrend,
    ),
    defaultFiveChapterLaneTemplateStabilityProfile: buildSafeBatchDefaultFiveChapterLaneTemplateStabilityProfileSnapshot(
      feedback?.default_five_chapter_lane_template_stability_profile || feedback?.defaultFiveChapterLaneTemplateStabilityProfile,
    ),
    recoveryRestoreStabilityEvidence: buildSafeBatchRecoveryRestoreStabilityEvidenceSnapshot(
      feedback?.recovery_restore_stability_evidence || feedback?.recoveryRestoreStabilityEvidence,
    ),
    defaultFiveChapterRegression: buildSafeBatchDefaultFiveChapterRegressionSnapshot(
      feedback?.default_five_chapter_regression || feedback?.defaultFiveChapterRegression,
    ),
    defaultFiveChapterRecoveryVerdictRelapse: buildSafeBatchDefaultFiveChapterRecoveryVerdictRelapseSnapshot(
      feedback?.default_five_chapter_recovery_verdict_relapse || feedback?.defaultFiveChapterRecoveryVerdictRelapse,
    ),
  }
}

function normalizeStrengthenedRepairAcceptanceTrend(trendLike: any): StrengthenedRepairAcceptanceTrendSnapshot | null {
  const trend = parseJsonValue(trendLike) || trendLike || null
  if (!trend || trend.visible === false) return null
  const status = String(trend?.status || '') === 'warn' ? 'warn' : 'ok'
  const latestStatusText = String(trend?.latest_status || trend?.latestStatus || '').trim()
  const latestStatus = latestStatusText === 'ok' || latestStatusText === 'warn' ? latestStatusText : 'none'
  const dimensions = trend?.dimensions || {}
  const normalizeDimension = (source: any, fallbackLabel: string) => ({
    label: compactEvidenceText(source?.label || fallbackLabel),
    failedCount: Number(source?.failed_count ?? source?.failedCount ?? 0),
  })

  return {
    visible: true,
    status,
    label: compactEvidenceText(trend?.label || '强化恢复验收趋势'),
    summary: compactEvidenceText(trend?.summary || '强化深修恢复后的核心守恒、读者回报和追读拉力趋势已沉淀。'),
    acceptedBatchCount: Number(trend?.accepted_batch_count ?? trend?.acceptedBatchCount ?? 0),
    failedBatchCount: Number(trend?.failed_batch_count ?? trend?.failedBatchCount ?? 0),
    passStreak: Number(trend?.pass_streak ?? trend?.passStreak ?? 0),
    latestStatus,
    latestBatchLabel: compactEvidenceText(trend?.latest_batch_label || trend?.latestBatchLabel || ''),
    latestRunId: trend?.latest_run_id ?? trend?.latestRunId ?? null,
    sourceEvidence: compactAuditList(
      Array.isArray(trend?.source_evidence)
        ? trend.source_evidence
        : Array.isArray(trend?.sourceEvidence)
          ? trend.sourceEvidence
          : [],
      6,
    ),
    dimensions: {
      core: normalizeDimension(dimensions.core, '核心守恒'),
      payoff: normalizeDimension(dimensions.payoff, '读者回报'),
      readerPull: normalizeDimension(dimensions.reader_pull || dimensions.readerPull, '读者拉力'),
    },
  }
}

function recoveryEvidenceSourceDeepRepairDirection(source: string, label: string) {
  if (source === 'single_chapter_governance_recheck') {
    return '回到单章任务书，确认治理复查证据已经写成正文里的可见冲突、对白动作、读者回报和章末钩子。'
  }
  if (source === 'safe_batch_recovery_recheck') {
    return '复盘批次任务书，把多章承诺拆回每章冲突职责、回报落点和剧情线推进，再恢复批量连写。'
  }
  if (source === 'review_governance_closure') {
    return '回到治理复查台，重新确认修后证据、观察项和关闭条件，再让后续正文承接。'
  }
  return `复查${label || '恢复依据来源'}的关闭条件，把抽象依据改成下一章可执行的事件、选择、代价和回报。`
}

function normalizeRecoveryEvidenceSourceDeepRepairEffect(effect: any, fallbackLabel: string): RecoveryEvidenceSourceRiskProfileSnapshot['sources'][number]['deepRepairEffect'] {
  const status = String(effect?.status || '').trim()
  const normalizedStatus = status === 'pending' || status === 'observing' || status === 'recurred' ? status : 'none'
  const defaultLabel = normalizedStatus === 'recurred'
    ? '深修后仍失效'
    : normalizedStatus === 'observing'
      ? '深修后暂无再失效'
      : normalizedStatus === 'pending'
        ? '深修待复查'
        : '未深修'
  const strengthenedClosure = normalizeRecoveryEvidenceSourceStrengthenedClosure(
    effect?.strengthened_repair_closure || effect?.strengthenedRepairClosure,
    fallbackLabel,
    normalizedStatus,
  )
  return {
    status: normalizedStatus,
    label: compactEvidenceText(effect?.label || defaultLabel),
    summary: compactEvidenceText(effect?.summary || `${fallbackLabel || '恢复依据来源'}尚未生成深层修复队列。`),
    latestRepairRunId: effect?.latest_repair_run_id ?? effect?.latestRepairRunId ?? null,
    latestRepairActionLabel: compactEvidenceText(effect?.latest_repair_action_label || effect?.latestRepairActionLabel || ''),
    latestRepairAt: compactEvidenceText(effect?.latest_repair_at || effect?.latestRepairAt || ''),
    postRepairFailureCount: Number(effect?.post_repair_failure_count ?? effect?.postRepairFailureCount ?? 0),
    postRepairEvidence: compactAuditList(Array.isArray(effect?.post_repair_evidence) ? effect.post_repair_evidence : Array.isArray(effect?.postRepairEvidence) ? effect.postRepairEvidence : [], 4),
    strengthenedClosure,
  }
}

function normalizeRecoveryEvidenceSourceStrengthenedClosure(
  closure: any,
  fallbackLabel: string,
  effectStatus: RecoveryEvidenceSourceRiskProfileSnapshot['sources'][number]['deepRepairEffect']['status'],
): RecoveryEvidenceSourceRiskProfileSnapshot['sources'][number]['deepRepairEffect']['strengthenedClosure'] {
  const status = String(closure?.status || '').trim()
  const normalizedStatus = status === 'needs_repair' || status === 'pending_recheck' || status === 'converged' || status === 'recurred'
    ? status
    : effectStatus === 'recurred'
      ? 'needs_repair'
      : 'not_required'
  const defaultLabel = normalizedStatus === 'needs_repair'
    ? '待强化深修'
    : normalizedStatus === 'pending_recheck'
      ? '强化深修待复检'
      : normalizedStatus === 'converged'
        ? '强化深修已收敛'
        : normalizedStatus === 'recurred'
          ? '强化深修后仍复发'
          : '无需强化深修'
  const defaultSummary = normalizedStatus === 'needs_repair'
    ? `${fallbackLabel || '恢复依据来源'}普通深修后仍出现同源放行失败，需要生成强化深修复检。`
    : normalizedStatus === 'pending_recheck'
      ? `${fallbackLabel || '恢复依据来源'}强化深修任务已生成，等待执行后复检同源失败是否收敛。`
      : normalizedStatus === 'converged'
        ? `${fallbackLabel || '恢复依据来源'}强化深修后暂无新的同源放行后失效，可恢复小批量安全连写并继续观察。`
        : normalizedStatus === 'recurred'
          ? `${fallbackLabel || '恢复依据来源'}强化深修后仍出现同源放行失败，继续禁止放宽安全连写。`
          : `${fallbackLabel || '恢复依据来源'}尚未触发强化深修。`
  return {
    status: normalizedStatus,
    label: compactEvidenceText(closure?.label || defaultLabel),
    summary: compactEvidenceText(closure?.summary || defaultSummary),
    latestRepairRunId: closure?.latest_repair_run_id ?? closure?.latestRepairRunId ?? null,
    latestRepairAt: compactEvidenceText(closure?.latest_repair_at || closure?.latestRepairAt || ''),
    postRepairFailureCount: Number(closure?.post_repair_failure_count ?? closure?.postRepairFailureCount ?? 0),
    postRepairEvidence: compactAuditList(Array.isArray(closure?.post_repair_evidence) ? closure.post_repair_evidence : Array.isArray(closure?.postRepairEvidence) ? closure.postRepairEvidence : [], 4),
  }
}

export function buildRecoveryEvidenceSourceRiskProfileSnapshot(batchPreflight: any): RecoveryEvidenceSourceRiskProfileSnapshot | null {
  const profile = parseJsonValue(
    batchPreflight?.recovery_evidence_source_risk_profile
      || batchPreflight?.recoveryEvidenceSourceRiskProfile,
  ) || batchPreflight?.recovery_evidence_source_risk_profile || batchPreflight?.recoveryEvidenceSourceRiskProfile || null
  const strengthenedAcceptanceTrend = normalizeStrengthenedRepairAcceptanceTrend(
    batchPreflight?.strengthened_repair_acceptance_trend
      || batchPreflight?.strengthenedRepairAcceptanceTrend,
  )
  const sources = [
    ...(Array.isArray(profile?.sources) ? profile.sources : []),
  ].map((item: any) => {
    const source = String(item?.source || item?.sourceMode || '').trim()
    const label = compactEvidenceText(item?.label || item?.source_label || item?.sourceLabel || item?.source || '恢复依据来源')
    const releaseFailureCount = Number(item?.release_failure_count || item?.releaseFailureCount || 0)
    const deepRepairEffect = normalizeRecoveryEvidenceSourceDeepRepairEffect(item?.deep_repair_effect || item?.deepRepairEffect, label)
    return {
      source,
      label,
      releaseFailureCount,
      trendLabel: `近${Math.max(1, releaseFailureCount || 1)}轮失败`,
      evidence: compactAuditList(Array.isArray(item?.evidence) ? item.evidence : [], 4),
      deepRepairDirection: recoveryEvidenceSourceDeepRepairDirection(source, label),
      deepRepairEffect,
    }
  }).filter(item => item.source && item.releaseFailureCount > 0)
    .sort((a, b) => b.releaseFailureCount - a.releaseFailureCount)

  if (!sources.length && !strengthenedAcceptanceTrend) return null
  const repeatedSources = sources.filter(item => item.releaseFailureCount >= 2)
  const focus = repeatedSources[0] || sources[0]
  const status = repeatedSources.length > 0 || String(profile?.status || '') === 'warn' || strengthenedAcceptanceTrend?.status === 'warn' ? 'warn' : 'ok'
  return {
    visible: true,
    status,
    label: '恢复依据画像趋势',
    summary: focus
      ? focus.releaseFailureCount >= 2
        ? `${focus.label}近${focus.releaseFailureCount}轮放行后失效，任务中心应先处理深层创作修复，再恢复多章安全连写。`
        : `${focus.label}已有放行后失效记录，任务中心继续观察来源稳定性。`
      : strengthenedAcceptanceTrend?.summary || '暂无恢复依据来源失效趋势。',
    totalFailureCount: Number(profile?.total_failure_count || profile?.totalFailureCount || sources.reduce((sum, item) => sum + item.releaseFailureCount, 0)),
    repeatSourceCount: Number(profile?.repeat_source_count || profile?.repeatSourceCount || repeatedSources.length),
    strengthenedAcceptanceTrend,
    sources,
  }
}

function BatchProseRunSummary({ run }: { run: any }) {
  const input = parseJsonValue(run.input_ref) || {}
  const output = parseJsonValue(run.output_ref) || {}
  const batchPreflight = input.batch_preflight || input.batchPreflight || null
  const expansionPolicy = buildSafeBatchExpansionPolicySnapshot(batchPreflight)
  const recoveryEvidenceProfile = buildRecoveryEvidenceSourceRiskProfileSnapshot(batchPreflight)
  const recoveryEvidence = [
    ...(Array.isArray(batchPreflight?.recovery_evidence) ? batchPreflight.recovery_evidence : []),
    ...(Array.isArray(batchPreflight?.recoveryEvidence) ? batchPreflight.recoveryEvidence : []),
  ].map((item: any) => String(item || '').trim()).filter(Boolean)
  const chapters = Array.isArray(output.chapters) ? output.chapters : []
  const failedChapters = chapters.filter((chapter: any) => chapter.status === 'failed')
  const successChapters = chapters.filter((chapter: any) => chapter.status === 'success')
  const avgScore = successChapters
    .map((chapter: any) => Number(chapter.score))
    .filter((score: number) => Number.isFinite(score))
  const scoreText = avgScore.length > 0
    ? Math.round(avgScore.reduce((sum: number, score: number) => sum + score, 0) / avgScore.length)
    : null
  const expansionFeedback = expansionPolicy?.expansionFeedback || null
  const expansionFeedbackChapterText = expansionFeedback?.latestChapterNos.length
    ? `第${expansionFeedback.latestChapterNos.join('、')}章`
    : ''
  const expansionStructureTrend = expansionFeedback?.structureValidationTrend || null
  const expansionStructureFailureReason = expansionStructureTrend?.failureReasons?.[0] || null
  const expansionStructureEffectiveness = expansionFeedback?.structureRepairEffectiveness || null
  const defaultRecoveryVerdictRelapseEffectiveness = expansionStructureEffectiveness?.defaultFiveChapterRecoveryVerdictRelapseTrend || null
  const expansionStructureDecisionTrend = expansionFeedback?.structureDecisionTrend || null
  const expansionStructureDecisionRequirement = expansionStructureDecisionTrend?.topFailedRequirement || null
  const defaultLaneRedesign = expansionStructureDecisionTrend?.defaultFiveChapterLaneRedesign || null
  const defaultLaneMissedRequirements = defaultLaneRedesign?.missedRequirements || []
  const defaultFiveChapterRegression = expansionFeedback?.defaultFiveChapterRegression || null
  const defaultRecoveryVerdictRelapse = expansionFeedback?.defaultFiveChapterRecoveryVerdictRelapse || null
  const defaultLaneTemplateStability = expansionFeedback?.defaultFiveChapterLaneTemplateStabilityProfile || null
  const defaultLaneTemplateStabilityTop = defaultLaneTemplateStability?.topFailedRequirement
    || defaultLaneTemplateStability?.requirements.find(requirement => requirement.failedCount > 0)
    || null
  const defaultLaneTemplateVersion = defaultLaneTemplateStability?.latestTemplateVersionProfile || null
  const recoveryRestoreStability = expansionFeedback?.recoveryRestoreStabilityEvidence || null
  const recoveryRestoreStabilityLane = expansionPolicy?.recoveryRestoreStabilityLane
    || buildSafeBatchRecoveryRestoreStabilityLaneSnapshot(
      input.default_five_chapter_lane
        || input.defaultFiveChapterLane
        || input.recovery_restore_stability_evidence
        || input.recoveryRestoreStabilityEvidence,
      recoveryRestoreStability,
    )
  const recoveryRestoreReview = recoveryRestoreStabilityLane || recoveryRestoreStability
  const recoveryRestoreBatchText = recoveryRestoreReview?.restoreChapterNos.length
    ? `恢复批 ${compactChapterNos(recoveryRestoreReview.restoreChapterNos)}`
    : ''
  const recoveryRestoreValidationText = recoveryRestoreReview?.validationChapterNos.length
    ? `验证 ${compactChapterNos(recoveryRestoreReview.validationChapterNos)}`
    : ''
  const recoveryRestoreDecisionLabel = recoveryRestoreStabilityLane?.label
    || (recoveryRestoreStability && recoveryRestoreStability.stablePassStreak >= 2 ? '默认5章档位' : '继续观察 1-2 批')
  const recoveryRestoreSummary = recoveryRestoreStabilityLane?.summary
    || recoveryRestoreStability?.summary
    || '恢复 5 章后的稳定观察已沉淀，可继续作为扩批默认档位依据。'
  const defaultRegressionBatchText = defaultFiveChapterRegression?.defaultBatchChapterNos.length
    ? `失效批 ${compactChapterNos(defaultFiveChapterRegression.defaultBatchChapterNos)}`
    : ''
  const defaultRegressionRestoreText = defaultFiveChapterRegression?.restoreChapterNos.length
    ? `默认依据 ${compactChapterNos(defaultFiveChapterRegression.restoreChapterNos)}`
    : ''
  const defaultRegressionValidationText = defaultFiveChapterRegression?.validationChapterNos.length
    ? `前置验证 ${compactChapterNos(defaultFiveChapterRegression.validationChapterNos)}`
    : ''
  const recoveryRoadmap = expansionPolicy?.recoveryRoadmap || null
  const recoveryValidation = expansionPolicy?.recoveryValidation || null
  const defaultRecoveryVerdict = recoveryValidation?.defaultFiveChapterRecoveryVerdict || null
  const defaultLaneTemplateVerdict = recoveryValidation?.defaultFiveChapterLaneTemplateVerdict || null
  const defaultLaneTemplateProductionRelapse = defaultLaneTemplateVerdict?.productionRelapseVerdict || null
  const defaultLaneTemplateVersionProductionRelapse = defaultLaneTemplateVersion?.latestProductionRelapseVerdict || null

  return (
    <Card size="small" title="批量生成摘要">
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="blue" bordered={false}>总计 {output.total ?? chapters.length} 章</Tag>
          <Tag color="green" bordered={false}>成功 {output.success ?? successChapters.length} 章</Tag>
          <Tag color={failedChapters.length > 0 ? 'red' : 'default'} bordered={false}>失败 {output.failed ?? failedChapters.length} 章</Tag>
          {output.canceled && <Tag color="default" bordered={false}>已停止</Tag>}
          {Number(output.skipped || 0) > 0 && <Tag bordered={false}>未处理 {output.skipped} 章</Tag>}
          {scoreText !== null && <Tag color={scoreText >= 78 ? 'green' : 'gold'} bordered={false}>平均质检 {scoreText} 分</Tag>}
          <Tag bordered={false}>耗时 {run.duration_ms ? `${Math.round(Number(run.duration_ms) / 1000)}s` : '-'}</Tag>
        </Space>
        {expansionPolicy?.visible && (
          <div style={{ padding: 8, border: '1px solid #bfdbfe', borderRadius: 6, background: '#eff6ff' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap size={[4, 4]}>
                <Text strong style={{ fontSize: 12 }}>{expansionPolicy.label}</Text>
                <Tag color={expansionPolicy.status === 'expanded' ? 'green' : 'blue'} bordered={false}>
                  目标 {expansionPolicy.targetChapterCount} 章
                </Tag>
                <Tag bordered={false}>连续 {expansionPolicy.passStreak}/{expansionPolicy.requiredPassStreak}</Tag>
                <Tag bordered={false}>通过 {expansionPolicy.acceptedBatchCount}</Tag>
                <Tag bordered={false}>未过 {expansionPolicy.failedBatchCount}</Tag>
              </Space>
              {recoveryRoadmap?.visible && (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space wrap size={[4, 4]}>
                    <Tag color={recoveryRoadmap.currentTargetChapterCount >= 5 ? 'green' : recoveryRoadmap.currentTargetChapterCount <= 1 ? 'red' : 'blue'} bordered={false}>
                      {recoveryRoadmap.currentLaneLabel || `目标 ${recoveryRoadmap.currentTargetChapterCount} 章`}
                    </Tag>
                    {recoveryRoadmap.nextRepairLayer && (
                      <Tag color={recoveryRoadmap.nextRepairLayer.status === 'warn' ? 'gold' : 'default'} bordered={false}>
                        下一层 {recoveryRoadmap.nextRepairLayer.actionLabel || recoveryRoadmap.nextRepairLayer.label}
                      </Tag>
                    )}
                    {recoveryRoadmap.routeNodes.slice(0, 5).map(node => (
                      <Tag
                        key={node.key}
                        color={node.status === 'ok' ? 'green' : node.status === 'warn' ? 'gold' : 'default'}
                        bordered={false}
                      >
                        {node.label}
                      </Tag>
                    ))}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>{recoveryRoadmap.currentReason}</Text>
                </Space>
              )}
              {recoveryValidation?.visible && (
                <div style={{ padding: 8, border: `1px solid ${recoveryValidation.status === 'passed' ? '#bbf7d0' : '#fde68a'}`, borderRadius: 6, background: recoveryValidation.status === 'passed' ? '#f0fdf4' : '#fffdf3' }}>
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Space wrap size={[4, 4]}>
                      <Tag color={recoveryValidation.status === 'passed' ? 'green' : 'gold'} bordered={false}>{recoveryValidation.label}</Tag>
                      {recoveryValidation.validationChapterNos.length > 0 && (
                        <Tag bordered={false}>第{recoveryValidation.validationChapterNos.join('、')}章</Tag>
                      )}
                      <Tag bordered={false}>风险 {recoveryValidation.riskCount}</Tag>
                      <Tag color={recoveryValidation.status === 'passed' ? 'green' : 'blue'} bordered={false}>
                        下一步 {recoveryValidation.nextActionLabel}
                      </Tag>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>{recoveryValidation.summary}</Text>
                    {defaultRecoveryVerdict && (
                      <Space direction="vertical" size={3} style={{ width: '100%' }}>
                        <Space wrap size={[4, 4]}>
                          <Tag color={defaultRecoveryVerdict.status === 'passed' ? 'green' : 'gold'} bordered={false}>
                            {defaultRecoveryVerdict.label}
                          </Tag>
                          {defaultRecoveryVerdict.clearedFailureReasons.slice(0, 3).map(reason => (
                            <Tag key={`cleared-${reason}`} color="green" bordered={false}>{reason}已清零</Tag>
                          ))}
                          {defaultRecoveryVerdict.remainingFailureReasons.slice(0, 3).map(reason => (
                            <Tag key={`remaining-${reason}`} color="gold" bordered={false}>{reason}未清零</Tag>
                          ))}
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>{defaultRecoveryVerdict.summary}</Text>
                      </Space>
                    )}
                    {defaultLaneTemplateVerdict && (
                      <Space direction="vertical" size={3} style={{ width: '100%' }}>
                        <Space wrap size={[4, 4]}>
                          <Tag color={defaultLaneTemplateVerdict.status === 'passed' ? 'green' : 'gold'} bordered={false}>
                            {defaultLaneTemplateVerdict.label}
                          </Tag>
                          <Tag color={defaultLaneTemplateVerdict.status === 'passed' ? 'green' : 'gold'} bordered={false}>
                            {defaultLaneTemplateVerdict.status === 'passed' ? '四项模板全过' : `缺项 ${defaultLaneTemplateVerdict.missingCount}`}
                          </Tag>
                          {defaultLaneTemplateVerdict.status === 'passed' && defaultLaneTemplateVerdict.requirements.slice(0, 4).map(requirement => (
                            <Tag key={`default-lane-template-pass-${requirement.key || requirement.label}`} color="green" bordered={false}>
                              {requirement.label}通过
                            </Tag>
                          ))}
                          {defaultLaneTemplateVerdict.missingRequirements.slice(0, 4).map(requirement => (
                            <Tag key={`default-lane-template-missing-${requirement.key || requirement.label}`} color="gold" bordered={false}>
                              {compactChapterNos(requirement.chapterNos)}缺{requirement.label}
                            </Tag>
                          ))}
                          {defaultLaneTemplateProductionRelapse && (
                            <Tag color={defaultLaneTemplateProductionRelapse.status === 'passed' ? 'green' : 'gold'} bordered={false}>
                              {defaultLaneTemplateProductionRelapse.status === 'passed' ? '生产后验已修复' : '生产后验仍复发'}
                            </Tag>
                          )}
                          {defaultLaneTemplateProductionRelapse?.remainingFailureReasons.slice(0, 3).map(reason => (
                            <Tag key={`default-lane-production-remaining-${reason}`} color="gold" bordered={false}>{reason}未修</Tag>
                          ))}
                          {defaultLaneTemplateProductionRelapse?.clearedFailureReasons.slice(0, 3).map(reason => (
                            <Tag key={`default-lane-production-cleared-${reason}`} color="green" bordered={false}>{reason}已修复</Tag>
                          ))}
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>{defaultLaneTemplateVerdict.summary}</Text>
                        {defaultLaneTemplateProductionRelapse?.summary && (
                          <Text type="secondary" style={{ fontSize: 12 }}>{defaultLaneTemplateProductionRelapse.summary}</Text>
                        )}
                      </Space>
                    )}
                  </Space>
                </div>
              )}
              <Text type="secondary" style={{ fontSize: 12 }}>{expansionPolicy.summary}</Text>
              {expansionFeedback && (
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <Space wrap size={[4, 4]}>
                    <Tag color={safeBatchExpansionFeedbackColor(expansionFeedback.status)} bordered={false}>
                      {expansionFeedback.label}
                    </Tag>
                    {expansionFeedback.targetChapterCount > 0 && (
                      <Tag bordered={false}>反馈目标 {expansionFeedback.targetChapterCount} 章</Tag>
                    )}
                    {expansionFeedbackChapterText && (
                      <Tag bordered={false}>{expansionFeedbackChapterText}</Tag>
                    )}
                    {expansionFeedback.stablePassStreak > 0 && (
                      <Tag color="green" bordered={false}>稳定连过 {expansionFeedback.stablePassStreak}</Tag>
                    )}
                    {expansionFeedback.recentExpandedBatchCount > 1 && (
                      <Tag bordered={false}>观察 {expansionFeedback.recentExpandedBatchCount} 批</Tag>
                    )}
                    {expansionFeedback.repeatedHotspotSegment && (
                      <Tag color="gold" bordered={false}>
                        {expansionFeedback.repeatedHotspotSegment.label}复发 {expansionFeedback.repeatedHotspotSegment.count}
                      </Tag>
                    )}
                    {expansionStructureTrend?.visible && (
                      <Tag color={expansionStructureTrend.status === 'warn' ? 'gold' : 'green'} bordered={false}>
                        验证通过率 {expansionStructureTrend.passRate}%
                      </Tag>
                    )}
                    {expansionStructureFailureReason && (
                      <Tag color="gold" bordered={false}>
                        失败主因 {expansionStructureFailureReason.label}{expansionStructureFailureReason.count}
                      </Tag>
                    )}
                    {expansionStructureTrend?.recurrenceAfterRestore.visible && (
                      <Tag color="gold" bordered={false}>
                        复发间隔 {expansionStructureTrend.recurrenceAfterRestore.intervalBatchCount}批
                      </Tag>
                    )}
                    {expansionStructureEffectiveness?.visible && (
                      <Tag color={expansionStructureEffectiveness.status === 'ok' ? 'green' : 'gold'} bordered={false}>
                        {expansionStructureEffectiveness.status === 'ok' ? '结构修复有效' : '结构修复待观察'}
                      </Tag>
                    )}
                    {expansionStructureEffectiveness?.visible && (
                      <Tag bordered={false}>
                        主因 {expansionStructureEffectiveness.baselineFailureReasonCount}{'->'}{expansionStructureEffectiveness.currentFailureReasonCount}
                      </Tag>
                    )}
                    {defaultRecoveryVerdictRelapseEffectiveness && (
                      <Tag color="gold" bordered={false}>
                        恢复判定连续失效 {defaultRecoveryVerdictRelapseEffectiveness.repeatedRelapseCount}
                      </Tag>
                    )}
                    {expansionStructureDecisionTrend?.visible && (
                      <Tag color={expansionStructureDecisionTrend.status === 'warn' ? 'gold' : 'green'} bordered={false}>
                        结构决策{expansionStructureDecisionTrend.status === 'warn' ? '待补齐' : '已落地'}
                      </Tag>
                    )}
                    {expansionStructureDecisionRequirement && (
                      <Tag color="gold" bordered={false}>
                        漏项 {expansionStructureDecisionRequirement.label}{expansionStructureDecisionRequirement.count}
                      </Tag>
                    )}
                    {defaultLaneRedesign && (
                      <Tag color="gold" bordered={false}>默认档位模板漏项</Tag>
                    )}
                    {defaultLaneMissedRequirements.slice(0, 4).map(requirement => (
                      <Tag key={`default-lane-missed-${requirement.key}`} color="gold" bordered={false}>
                        缺{requirement.label}
                      </Tag>
                    ))}
                    {defaultLaneTemplateStability && (
                      <Tag color={defaultLaneTemplateStability.status === 'ready' ? 'green' : defaultLaneTemplateStability.status === 'redesign' || defaultLaneTemplateStability.status === 'relapsed' ? 'gold' : 'blue'} bordered={false}>
                        {defaultLaneTemplateStability.label}
                      </Tag>
                    )}
                    {defaultLaneTemplateStability && (
                      <Tag bordered={false}>
                        模板连过 {defaultLaneTemplateStability.passStreak}/{defaultLaneTemplateStability.requiredPassStreak}
                      </Tag>
                    )}
                    {defaultLaneTemplateStabilityTop && (
                      <Tag color="gold" bordered={false}>
                        {defaultLaneTemplateStabilityTop.label}失败 {defaultLaneTemplateStabilityTop.failedCount}
                      </Tag>
                    )}
                    {defaultLaneTemplateVersion && (
                      <Tag color={defaultLaneTemplateVersion.status === 'ready' ? 'green' : defaultLaneTemplateVersion.status === 'relapsed' || defaultLaneTemplateVersion.status === 'redesign' ? 'gold' : 'blue'} bordered={false}>
                        模板版本连过 {defaultLaneTemplateVersion.passStreak || 0}/{defaultLaneTemplateVersion.requiredPassStreak || defaultLaneTemplateStability?.requiredPassStreak || 0}
                      </Tag>
                    )}
                    {defaultLaneTemplateVersionProductionRelapse && (
                      <Tag color={defaultLaneTemplateVersionProductionRelapse.status === 'passed' ? 'green' : 'gold'} bordered={false}>
                        {defaultLaneTemplateVersionProductionRelapse.status === 'passed' ? '生产后验已修复' : '生产后验仍复发'}
                      </Tag>
                    )}
                    {defaultLaneTemplateVersionProductionRelapse?.remainingFailureReasons.slice(0, 3).map(reason => (
                      <Tag key={`default-lane-version-production-remaining-${reason}`} color="gold" bordered={false}>{reason}未修</Tag>
                    ))}
                    {defaultLaneTemplateVersionProductionRelapse?.clearedFailureReasons.slice(0, 3).map(reason => (
                      <Tag key={`default-lane-version-production-cleared-${reason}`} color="green" bordered={false}>{reason}已修复</Tag>
                    ))}
                    {recoveryRestoreReview && (
                      <Tag color="green" bordered={false}>长期扩批稳定证据</Tag>
                    )}
                    {recoveryRestoreStabilityLane && (
                      <Tag color="blue" bordered={false}>批次复盘筛选</Tag>
                    )}
                    {recoveryRestoreReview && (
                      <Tag color={recoveryRestoreStabilityLane?.defaultFiveChapterReady ? 'green' : undefined} bordered={false}>
                        {recoveryRestoreDecisionLabel}
                      </Tag>
                    )}
                    {defaultFiveChapterRegression && (
                      <Tag color="gold" bordered={false}>默认档位回退原因</Tag>
                    )}
                    {defaultFiveChapterRegression?.repeatedHotspotSegment && (
                      <Tag color="gold" bordered={false}>
                        {defaultFiveChapterRegression.repeatedHotspotSegment.label}复发
                      </Tag>
                    )}
                    {defaultFiveChapterRegression?.templateVersionId && (
                      <Tag color="gold" bordered={false}>
                        模板版本 {defaultFiveChapterRegression.templateVersionId}
                      </Tag>
                    )}
                    {defaultRecoveryVerdictRelapse && (
                      <Tag color="gold" bordered={false}>恢复判定失效</Tag>
                    )}
                    {defaultRecoveryVerdictRelapse?.relapsedFailureReasons.slice(0, 3).map(reason => (
                      <Tag key={`relapse-${reason}`} color="gold" bordered={false}>{reason}复发</Tag>
                    ))}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>{expansionFeedback.summary}</Text>
                  {defaultLaneTemplateStability && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{defaultLaneTemplateStability.summary}</Text>
                  )}
                  {defaultRecoveryVerdictRelapse && (
                    <Space direction="vertical" size={3} style={{ width: '100%' }}>
                      <Space wrap size={[4, 4]}>
                        {defaultRecoveryVerdictRelapse.validationChapterNos.length > 0 && (
                          <Tag bordered={false}>清零验证 {compactChapterNos(defaultRecoveryVerdictRelapse.validationChapterNos)}</Tag>
                        )}
                        {defaultRecoveryVerdictRelapse.relapseBatchChapterNos.length > 0 && (
                          <Tag color="gold" bordered={false}>复发批 {compactChapterNos(defaultRecoveryVerdictRelapse.relapseBatchChapterNos)}</Tag>
                        )}
                        {defaultRecoveryVerdictRelapse.repeatedHotspotSegment && (
                          <Tag color="gold" bordered={false}>{defaultRecoveryVerdictRelapse.repeatedHotspotSegment.label}风险 {defaultRecoveryVerdictRelapse.repeatedHotspotSegment.riskCount}</Tag>
                        )}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {defaultRecoveryVerdictRelapse.summary || '恢复判定失效，需要回到 3 章验证批重新证明核心、回报和追读稳定。'}
                      </Text>
                    </Space>
                  )}
                  {defaultFiveChapterRegression && (
                    <Space direction="vertical" size={3} style={{ width: '100%' }}>
                      <Space wrap size={[4, 4]}>
                        {defaultRegressionBatchText && <Tag color="gold" bordered={false}>{defaultRegressionBatchText}</Tag>}
                        {defaultRegressionRestoreText && <Tag bordered={false}>{defaultRegressionRestoreText}</Tag>}
                        {defaultRegressionValidationText && <Tag bordered={false}>{defaultRegressionValidationText}</Tag>}
                        <Tag color="green" bordered={false}>
                          原稳定 {defaultFiveChapterRegression.stablePassStreak}/{defaultFiveChapterRegression.requiredStablePassStreak}
                        </Tag>
                        {defaultFiveChapterRegression.failureReasons.slice(0, 3).map(reason => (
                          <Tag key={reason} color="gold" bordered={false}>{reason}</Tag>
                        ))}
                        {defaultFiveChapterRegression.templateVersionFailedRequirements.slice(0, 3).map(requirement => (
                          <Tag key={`template-version-${requirement.key || requirement.failureReason}`} color="gold" bordered={false}>
                            {requirement.label || requirement.failureReason}
                          </Tag>
                        ))}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {defaultFiveChapterRegression.summary || '默认 5 章档位出现复发，需要回到 3 章验证批或扩批结构修复层。'}
                      </Text>
                    </Space>
                  )}
                  {recoveryRestoreReview && (
                    <Space direction="vertical" size={3} style={{ width: '100%' }}>
                      <Space wrap size={[4, 4]}>
                        {recoveryRestoreStabilityLane && (
                          <Tag color="blue" bordered={false}>{recoveryRestoreStabilityLane.taskCenterFilterLabel}</Tag>
                        )}
                        {recoveryRestoreBatchText && <Tag bordered={false}>{recoveryRestoreBatchText}</Tag>}
                        {recoveryRestoreValidationText && <Tag bordered={false}>{recoveryRestoreValidationText}</Tag>}
                        {recoveryRestoreStabilityLane ? (
                          <Tag color="green" bordered={false}>
                            稳定连过 {recoveryRestoreStabilityLane.stablePassStreak}/{recoveryRestoreStabilityLane.requiredStablePassStreak}
                          </Tag>
                        ) : (
                          <Tag color="green" bordered={false}>稳定连过 {recoveryRestoreReview.stablePassStreak}</Tag>
                        )}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {recoveryRestoreSummary}
                      </Text>
                    </Space>
                  )}
                  {expansionStructureTrend?.visible && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{expansionStructureTrend.summary}</Text>
                  )}
                  {expansionStructureEffectiveness?.visible && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{expansionStructureEffectiveness.summary}</Text>
                  )}
                  {expansionStructureDecisionTrend?.visible && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{expansionStructureDecisionTrend.summary}</Text>
                  )}
                  {defaultLaneRedesign && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {defaultLaneRedesign.summary}
                      {defaultLaneRedesign.relapseCount > 0 ? ` 连续失效 ${defaultLaneRedesign.relapseCount} 次。` : ''}
                      {defaultLaneRedesign.repeatedFailureReasons.length ? ` 同维复发：${defaultLaneRedesign.repeatedFailureReasons.join('、')}。` : ''}
                    </Text>
                  )}
                </Space>
              )}
            </Space>
          </div>
        )}
        {recoveryEvidence.length > 0 && (
          <div style={{ padding: 8, border: '1px solid #bbf7d0', borderRadius: 6, background: '#f0fdf4' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Text strong style={{ fontSize: 12 }}>恢复放行依据</Text>
              <Space wrap size={[4, 4]}>
                {Array.from(new Set(recoveryEvidence)).slice(0, 8).map(item => (
                  <Tag key={item} color="green" bordered={false}>{item}</Tag>
                ))}
              </Space>
            </Space>
          </div>
        )}
        {recoveryEvidenceProfile?.visible && (
          <div style={{ padding: 8, border: '1px solid #fde68a', borderRadius: 6, background: '#fffdf3' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap size={[4, 4]}>
                <Text strong style={{ fontSize: 12 }}>{recoveryEvidenceProfile.label}</Text>
                <Tag color={recoveryEvidenceProfile.status === 'warn' ? 'gold' : 'green'} bordered={false}>反复来源 {recoveryEvidenceProfile.repeatSourceCount}</Tag>
                <Tag bordered={false}>失效 {recoveryEvidenceProfile.totalFailureCount} 次</Tag>
              </Space>
              <Text type="secondary" style={{ fontSize: 12 }}>{recoveryEvidenceProfile.summary}</Text>
              {recoveryEvidenceProfile.strengthenedAcceptanceTrend?.visible && (
                <div style={{ padding: 8, border: '1px solid #bfdbfe', borderRadius: 6, background: '#eff6ff' }}>
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Space wrap size={[4, 4]}>
                      <Text strong style={{ fontSize: 12 }}>{recoveryEvidenceProfile.strengthenedAcceptanceTrend.label}</Text>
                      <Tag color={recoveryEvidenceProfile.strengthenedAcceptanceTrend.status === 'warn' ? 'gold' : 'green'} bordered={false}>
                        {recoveryEvidenceProfile.strengthenedAcceptanceTrend.status === 'warn' ? '回到单章' : `连过 ${recoveryEvidenceProfile.strengthenedAcceptanceTrend.passStreak} 批`}
                      </Tag>
                      <Tag bordered={false}>通过 {recoveryEvidenceProfile.strengthenedAcceptanceTrend.acceptedBatchCount}</Tag>
                      <Tag bordered={false}>未过 {recoveryEvidenceProfile.strengthenedAcceptanceTrend.failedBatchCount}</Tag>
                      {recoveryEvidenceProfile.strengthenedAcceptanceTrend.latestBatchLabel && (
                        <Tag bordered={false}>{recoveryEvidenceProfile.strengthenedAcceptanceTrend.latestBatchLabel}</Tag>
                      )}
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>{recoveryEvidenceProfile.strengthenedAcceptanceTrend.summary}</Text>
                    <Space wrap size={[4, 4]}>
                      <Tag bordered={false}>核心 {recoveryEvidenceProfile.strengthenedAcceptanceTrend.dimensions.core.failedCount}</Tag>
                      <Tag bordered={false}>回报 {recoveryEvidenceProfile.strengthenedAcceptanceTrend.dimensions.payoff.failedCount}</Tag>
                      <Tag bordered={false}>拉力 {recoveryEvidenceProfile.strengthenedAcceptanceTrend.dimensions.readerPull.failedCount}</Tag>
                    </Space>
                    {recoveryEvidenceProfile.strengthenedAcceptanceTrend.sourceEvidence.length > 0 && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        依据：{recoveryEvidenceProfile.strengthenedAcceptanceTrend.sourceEvidence.join('；')}
                      </Text>
                    )}
                  </Space>
                </div>
              )}
              {recoveryEvidenceProfile.sources.slice(0, 3).map(source => (
                <Space key={source.source} direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space wrap size={[4, 4]}>
                    <Tag color={source.releaseFailureCount >= 2 ? 'gold' : 'default'} bordered={false}>{source.label}</Tag>
                    <Tag bordered={false}>{source.trendLabel}</Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>深层修复方向：{source.deepRepairDirection}</Text>
                  {source.deepRepairEffect.status !== 'none' && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      深修结果：{source.deepRepairEffect.label}，{source.deepRepairEffect.summary}
                    </Text>
                  )}
                  {source.deepRepairEffect.strengthenedClosure.status !== 'not_required' && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      强化复检：{source.deepRepairEffect.strengthenedClosure.label}，{source.deepRepairEffect.strengthenedClosure.summary}
                    </Text>
                  )}
                </Space>
              ))}
            </Space>
          </div>
        )}
        {chapters.length > 0 && (
          <Space wrap size={[4, 4]}>
            {chapters.slice(0, 80).map((chapter: any) => (
              <Tag
                key={`${chapter.chapter_no}-${chapter.id || chapter.title}`}
                color={chapter.status === 'success' ? (Number(chapter.score || 0) >= 78 ? 'green' : 'gold') : 'red'}
                bordered={false}
              >
                第{chapter.chapter_no}章
                {chapter.status === 'success' ? ` ${chapter.score ?? '-'}分${chapter.revised ? ' 修订' : ''}` : ' 失败'}
              </Tag>
            ))}
            {chapters.length > 80 && <Tag bordered={false}>另有 {chapters.length - 80} 章</Tag>}
          </Space>
        )}
        {failedChapters.length > 0 && (
          <Card size="small" title="失败章节" styles={{ body: { padding: 8 } }}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              {failedChapters.slice(0, 12).map((chapter: any) => (
                <Paragraph key={`${chapter.chapter_no}-${chapter.id || chapter.title}`} style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>
                  第{chapter.chapter_no}章《{chapter.title || '未命名'}》：{chapter.error || '生成失败'}
                </Paragraph>
              ))}
              {failedChapters.length > 12 && <Text type="secondary" style={{ fontSize: 12 }}>另有 {failedChapters.length - 12} 个失败章节，可查看下方原始输出。</Text>}
            </Space>
          </Card>
        )}
      </Space>
    </Card>
  )
}

function ChapterPipelineRunSummary({ run }: { run: any }) {
  const output = parseJsonValue(run.output_ref) || {}
  const steps = Array.isArray(output.steps) ? output.steps : []
  return (
    <Card size="small" title="章节流水线">
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="blue" bordered={false}>第{output.chapter_no || '-'}章</Tag>
          <Tag bordered={false}>当前：{output.current_step || '-'}</Tag>
          {output.can_resume_from && <Tag color="green" bordered={false}>可从 {output.can_resume_from} 继续</Tag>}
          {output.confirmed_scene_cards === false && <Tag color="gold" bordered={false}>等待场景卡确认</Tag>}
        </Space>
        {steps.length > 0 && (
          <Space wrap size={[4, 4]}>
            {steps.map((step: any) => (
              <Tag key={step.key} color={step.status === 'success' ? 'green' : step.status === 'failed' ? 'red' : step.status === 'needs_confirmation' ? 'gold' : step.status === 'ready' ? 'blue' : 'default'} bordered={false}>
                {step.label || step.key} · {step.status}
              </Tag>
            ))}
          </Space>
        )}
        {Array.isArray(output.context_package?.preflight?.warnings) && output.context_package.preflight.warnings.length > 0 && (
          <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>
            上下文缺口：{output.context_package.preflight.warnings.join('；')}
          </Paragraph>
        )}
      </Space>
    </Card>
  )
}

function ReleaseRepairRunSummary({ run }: { run: any }) {
  const output = parseJsonValue(run.output_ref) || {}
  const tasks = Array.isArray(output.tasks) ? output.tasks : []
  const relatedRuns = Array.isArray(output.related_runs) ? output.related_runs : []
  return (
    <Card size="small" title="发布修复队列">
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color={output.release_audit?.can_release ? 'green' : 'red'} bordered={false}>
            发布评分 {output.release_audit?.score ?? '-'}
          </Tag>
          <Tag color="blue" bordered={false}>修复任务 {tasks.length}</Tag>
          <Tag bordered={false}>子任务 {relatedRuns.length}</Tag>
          <Tag color={(output.release_audit?.blocker_count || 0) > 0 ? 'red' : 'default'} bordered={false}>阻塞 {output.release_audit?.blocker_count || 0}</Tag>
          <Tag color={(output.release_audit?.warning_count || 0) > 0 ? 'gold' : 'default'} bordered={false}>警告 {output.release_audit?.warning_count || 0}</Tag>
        </Space>
        {tasks.length > 0 && (
          <List
            size="small"
            dataSource={tasks}
            renderItem={(task: any) => (
              <List.Item>
                <Space direction="vertical" size={2}>
                  <Space wrap>
                    <Tag color={task.priority === 'high' ? 'red' : 'gold'} bordered={false}>{task.priority || 'medium'}</Tag>
                    <Text>{task.title}</Text>
                    <Tag bordered={false}>{task.count || 0} 项</Tag>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {task.action}{task.chapter_nos?.length ? ` · 章节：${task.chapter_nos.slice(0, 20).join('、')}` : ''}
                  </Text>
                </Space>
              </List.Item>
            )}
          />
        )}
        {relatedRuns.length > 0 && (
          <Space wrap>
            {relatedRuns.map((item: any) => (
              <Tag key={`${item.run_type}-${item.run_id}`} color="blue" bordered={false}>
                子任务 #{item.run_id} · {runTypeLabel(item.run_type)}
              </Tag>
            ))}
          </Space>
        )}
      </Space>
    </Card>
  )
}

function RepairTaskRunSummary({
  run,
  runRecords = [],
  onSelectChapter,
  onOpenChapterEditor,
  onStartRepairTaskRevision,
  onExecuteTypedRepairTask,
  onRecheckRepairTask,
  onUpdateRepairTaskStatus,
  onBulkUpdateRepairTaskStatus,
  onRecheckStyleSampleTaskBooks,
  onGenerateRepairAuditSummary,
  onCreateRecoveryEvidenceGovernanceQueue,
  safeBatchRecoveryFocus,
  onRefresh,
}: {
  run: any
  runRecords?: any[]
  onSelectChapter?: (chapterId: number) => void | Promise<void>
  onOpenChapterEditor?: (chapterId: number) => void | Promise<void>
  onStartRepairTaskRevision?: (task: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  onExecuteTypedRepairTask?: (task: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  onRecheckRepairTask?: (task: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  onUpdateRepairTaskStatus?: (task: any, run: any, status: string, taskIndex: number) => void | Promise<void>
  onBulkUpdateRepairTaskStatus?: (items: any[], status: string) => void | Promise<void>
  onRecheckStyleSampleTaskBooks?: (items: any[]) => void
  onGenerateRepairAuditSummary?: (run: any, options?: RepairTaskActionOptions) => void | Promise<void>
  onCreateRecoveryEvidenceGovernanceQueue?: (payload: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  safeBatchRecoveryFocus?: SafeBatchRecoveryFocusSnapshot | null
  onRefresh?: () => void | Promise<void>
}) {
  const output = parseJsonValue(run.output_ref) || {}
  const tasks = Array.isArray(output.tasks) ? output.tasks : []
  const audit = output.audit_summary || null
  const [focusedTaskIndex, setFocusedTaskIndex] = useState<number | null>(null)
  const [focusedTaskSource, setFocusedTaskSource] = useState<string>('')
  const [recoveryEvidenceActionFeedbackByKey, setRecoveryEvidenceActionFeedbackByKey] = useState<Record<string, RecoveryEvidenceReviewActionFeedback>>({})
  const [recoveryEvidenceRefreshAnchor, setRecoveryEvidenceRefreshAnchor] = useState<RecoveryEvidenceReviewRefreshAnchor | null>(null)
  const high = tasks.filter((task: any) => task.severity === 'high').length
  const medium = tasks.filter((task: any) => task.severity === 'medium').length
  const resolved = tasks.filter((task: any) => task.task_status === 'resolved').length
  const needsReview = tasks.filter((task: any) => task.task_status === 'needs_review').length
  const closureHighlights = buildRepairClosureHighlights(tasks, audit)
  const recoveryEvidenceAudit = buildRecoveryEvidenceAuditView(audit, tasks)
  const sourceTaskForRecoveryEvidenceRow = (focusSource: string) => {
    const group = recoveryEvidenceAudit?.sourceGroups.find(item => item.source === focusSource)
    const taskIndex = group?.taskIndexes.find(index => tasks[index] && Number(tasks[index]?.chapter_id || tasks[index]?.chapterId || 0))
      ?? group?.taskIndexes[0]
      ?? null
    return {
      taskIndex,
      task: taskIndex !== null ? tasks[taskIndex] : null,
    }
  }
  useEffect(() => {
    if (!safeBatchRecoveryFocus) return
    const taskIndex = tasks.findIndex((task: any) => safeBatchRecoveryFocusMatchesTask(safeBatchRecoveryFocus, task))
    if (taskIndex < 0) return
    setFocusedTaskSource('')
    setFocusedTaskIndex(taskIndex)
  }, [run?.id, safeBatchRecoveryFocus?.layerKey, safeBatchRecoveryFocus?.issueType, safeBatchRecoveryFocus?.source])
  const sourceTaskForRecoveryEvidenceAuditAction = (nextAction: RecoveryEvidenceAuditNextAction) => {
    const groupedTask = sourceTaskForRecoveryEvidenceRow(nextAction.source)
    const taskIndex = nextAction.taskIndex ?? groupedTask.taskIndex
    return {
      taskIndex,
      task: taskIndex !== null ? tasks[taskIndex] : groupedTask.task,
    }
  }
  const recoveryEvidenceAuditNextActionDisabled = (nextAction: RecoveryEvidenceAuditNextAction) => {
    const sourceTask = sourceTaskForRecoveryEvidenceAuditAction(nextAction)
    if (nextAction.action === 'revision') return !sourceTask.task || !onStartRepairTaskRevision
    if (nextAction.action === 'recheck_single_chapter') return !sourceTask.task || !onRecheckRepairTask
    if (nextAction.action === 'recheck_safe_batch' || nextAction.action === 'review_governance_closure') return !onGenerateRepairAuditSummary
    return false
  }
  const handleRecoveryEvidenceAuditNextAction = (nextAction: RecoveryEvidenceAuditNextAction) => {
    const sourceTask = sourceTaskForRecoveryEvidenceAuditAction(nextAction)
    setFocusedTaskSource(nextAction.source)
    setFocusedTaskIndex(sourceTask.taskIndex)
    if (nextAction.action === 'revision' && sourceTask.task && onStartRepairTaskRevision) {
      onStartRepairTaskRevision(sourceTask.task, run, sourceTask.taskIndex ?? 0)
      return
    }
    if (nextAction.action === 'recheck_single_chapter' && sourceTask.task && onRecheckRepairTask) {
      onRecheckRepairTask(sourceTask.task, run, sourceTask.taskIndex ?? 0)
      return
    }
    if ((nextAction.action === 'recheck_safe_batch' || nextAction.action === 'review_governance_closure') && onGenerateRepairAuditSummary) {
      onGenerateRepairAuditSummary(run)
    }
  }
  const focusRecoveryEvidenceAnchor = (anchor: RecoveryEvidenceReviewRefreshAnchor) => {
    setFocusedTaskSource(anchor.focusSource)
    setFocusedTaskIndex(anchor.sourceTaskIndex ?? anchor.taskIndex)
  }
  const runRecoveryEvidenceActionWithRefresh = async (
    actionFeedback: RecoveryEvidenceReviewActionFeedback,
    refreshAnchor: RecoveryEvidenceReviewRefreshAnchor,
    action: () => void | Promise<void>,
  ) => {
    setRecoveryEvidenceRefreshAnchor(refreshAnchor)
    focusRecoveryEvidenceAnchor(refreshAnchor)
    setRecoveryEvidenceActionFeedbackByKey(prev => ({ ...prev, [refreshAnchor.feedbackKey]: actionFeedback }))
    await Promise.resolve(action())
    if (onRefresh) await Promise.resolve(onRefresh())
    const refreshedAnchor = { ...refreshAnchor, refreshedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) }
    setRecoveryEvidenceRefreshAnchor(refreshedAnchor)
    focusRecoveryEvidenceAnchor(refreshedAnchor)
    setRecoveryEvidenceActionFeedbackByKey(prev => {
      const refreshedFeedback = buildRecoveryEvidenceReviewRefreshFeedback(prev[refreshAnchor.feedbackKey] || actionFeedback, refreshedAnchor)
      return refreshedFeedback ? { ...prev, [refreshAnchor.feedbackKey]: refreshedFeedback } : prev
    })
  }
  const handleRecoveryEvidenceReviewRowAction = async (
    task: any,
    taskIndex: number,
    row: RecoveryEvidenceReviewRow,
    rowAction: RecoveryEvidenceReviewRowAction,
  ) => {
    const triggeredAt = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
    const actionFeedback = buildRecoveryEvidenceReviewActionFeedback(rowAction, triggeredAt)
    const runActionOptions = { keepTaskCenterOpen: true }
    if (rowAction.focusSource) {
      const sourceTask = sourceTaskForRecoveryEvidenceRow(rowAction.focusSource)
      const refreshAnchor = buildRecoveryEvidenceReviewRefreshAnchor({
        taskIndex,
        row,
        rowAction,
        sourceTaskIndex: sourceTask.taskIndex,
        refreshedAt: triggeredAt,
      })
      if (rowAction.action === 'recheck_single_chapter' && sourceTask.task && onRecheckRepairTask) {
        await runRecoveryEvidenceActionWithRefresh(actionFeedback, refreshAnchor, () => onRecheckRepairTask(sourceTask.task, run, sourceTask.taskIndex ?? 0, runActionOptions))
      }
      if (rowAction.action === 'recheck_safe_batch' && onGenerateRepairAuditSummary) {
        await runRecoveryEvidenceActionWithRefresh(actionFeedback, refreshAnchor, () => onGenerateRepairAuditSummary(run, runActionOptions))
      }
      return
    }
    const refreshAnchor = buildRecoveryEvidenceReviewRefreshAnchor({
      taskIndex,
      row,
      rowAction,
      sourceTaskIndex: taskIndex,
      refreshedAt: triggeredAt,
    })
    if (rowAction.action === 'review_governance_closure' && onGenerateRepairAuditSummary) {
      await runRecoveryEvidenceActionWithRefresh(actionFeedback, refreshAnchor, () => onGenerateRepairAuditSummary(run, runActionOptions))
      return
    }
    if (rowAction.action === 'execute_typed_repair' && onExecuteTypedRepairTask) {
      await runRecoveryEvidenceActionWithRefresh(actionFeedback, refreshAnchor, () => onExecuteTypedRepairTask(task, run, taskIndex, runActionOptions))
    }
  }
  const title = run.run_type === 'first30_retention_repair'
    ? '前30章留存修复任务'
    : run.run_type === 'longform_production_repair'
      ? output.report?.source === 'auto_creation_safe_batch_risk'
        ? '安全连写风险修复任务'
        : output.report?.source === 'review_annotation_risk'
          ? '交稿风险修复任务'
          : output.report?.source === 'rolling_script_room'
            ? '百章剧本室修复任务'
            : output.report?.source === 'reader_trial_review'
              ? '读者试读修复任务'
              : output.report?.source === 'recovery_evidence_governance_queue'
                ? '恢复依据治理队列'
                : '长线生产修复任务'
      : '机械质检修复任务'
  return (
    <Card size="small" title={title}>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="blue" bordered={false}>任务 {tasks.length}</Tag>
          <Tag color={high ? 'red' : 'default'} bordered={false}>高危 {high}</Tag>
          <Tag color={medium ? 'gold' : 'default'} bordered={false}>中危 {medium}</Tag>
          <Tag color={resolved ? 'green' : 'default'} bordered={false}>已处理 {resolved}</Tag>
          <Tag color={needsReview ? 'gold' : 'default'} bordered={false}>需复查 {needsReview}</Tag>
          {output.report?.score !== undefined && <Tag bordered={false}>诊断分 {output.report.score}</Tag>}
          {output.report?.weak_count !== undefined && <Tag bordered={false}>薄弱章节 {output.report.weak_count}</Tag>}
          {output.report?.status && <Tag bordered={false}>{output.report.status}</Tag>}
          {run.run_type === 'longform_production_repair' && onGenerateRepairAuditSummary && (
            <Button size="small" type="primary" onClick={() => onGenerateRepairAuditSummary(run)}>生成审计摘要</Button>
          )}
        </Space>
        {audit && (
          <div style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color={audit.status === 'closed' ? 'green' : 'gold'} bordered={false}>{audit.status === 'closed' ? '已闭环' : '需跟进'}</Tag>
                <Tag bordered={false}>已确认 {audit.task_summary?.resolved || 0}/{audit.task_summary?.total || 0}</Tag>
                <Tag bordered={false}>触达章节 {audit.task_summary?.touched_chapter_count || 0}</Tag>
              </Space>
              {(audit.conclusion || []).map((item: string, index: number) => (
                <Text key={`${item}-${index}`} type="secondary" style={{ fontSize: 12 }}>{item}</Text>
              ))}
              <Space wrap size={[4, 4]}>
                {Object.entries(audit.metric_deltas || {}).map(([key, value]: [string, any]) => (
                  <Tag key={key} bordered={false}>
                    {key} {value.before ?? '-'} {'->'} {value.after ?? '-'}{value.delta === null || value.delta === undefined ? '' : ` (${value.delta >= 0 ? '+' : ''}${value.delta})`}
                  </Tag>
                ))}
              </Space>
            </Space>
          </div>
        )}
        {closureHighlights.length > 0 && (
          <div style={{ padding: 8, border: '1px solid #bbf7d0', borderRadius: 6, background: '#f0fdf4' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap>
                <Text strong style={{ fontSize: 12 }}>风险闭环记录</Text>
                <Tag color="green" bordered={false}>已清 {closureHighlights.reduce((sum, item) => sum + item.count, 0)}</Tag>
              </Space>
              {closureHighlights.map(item => (
                <Space key={item.key} direction="vertical" size={2} style={{ width: '100%' }}>
                  <Space wrap size={[4, 4]}>
                    <Tag color={item.color} bordered={false}>{item.label}</Tag>
                    <Tag color="green" bordered={false}>{item.count}</Tag>
                    {item.chapterNos.length > 0 && <Tag bordered={false}>第{item.chapterNos.slice(0, 6).join('、')}章</Tag>}
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.detail}</Text>
                </Space>
              ))}
            </Space>
          </div>
        )}
        {recoveryEvidenceAudit && (
          <div style={{ padding: 8, border: '1px solid #f5d0fe', borderRadius: 6, background: '#fdf4ff' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space wrap>
                <Text strong style={{ fontSize: 12 }}>{recoveryEvidenceAudit.label}</Text>
                <Tag color={recoveryEvidenceAudit.status === 'closed' ? 'green' : 'gold'} bordered={false}>
                  {recoveryEvidenceAudit.status === 'closed' ? '已闭环' : '需跟进'}
                </Tag>
                <Tag bordered={false}>已确认 {recoveryEvidenceAudit.resolved}/{recoveryEvidenceAudit.total}</Tag>
                {recoveryEvidenceAudit.sourceRunId && <Tag bordered={false}>来源 #{recoveryEvidenceAudit.sourceRunId}</Tag>}
                {recoveryEvidenceAudit.memoryLabel && <Tag color="purple" bordered={false}>{recoveryEvidenceAudit.memoryLabel}</Tag>}
                {recoveryEvidenceAudit.sourceSummary && <Tag color="purple" bordered={false}>{recoveryEvidenceAudit.sourceSummary}</Tag>}
              </Space>
              {recoveryEvidenceAudit.nextAction && (
                <Space wrap size={[4, 4]} style={{ padding: 6, border: '1px solid #f0abfc', borderRadius: 6, background: '#fae8ff' }}>
                  <Tag color="gold" bordered={false}>下一步</Tag>
                  <Text strong style={{ fontSize: 12 }}>{recoveryEvidenceAudit.nextAction.label}</Text>
                  {recoveryEvidenceAudit.nextAction.sourceLabel && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{recoveryEvidenceAudit.nextAction.sourceLabel}</Text>
                  )}
                  {recoveryEvidenceAudit.nextAction.residualEvidence.length > 0 && (
                    <Text type="danger" style={{ fontSize: 12 }}>{recoveryEvidenceAudit.nextAction.residualEvidence.join('；')}</Text>
                  )}
                  <Button
                    size="small"
                    type="primary"
                    icon={['recheck_single_chapter', 'recheck_safe_batch', 'review_governance_closure'].includes(recoveryEvidenceAudit.nextAction.action) ? <ReloadOutlined /> : undefined}
                    disabled={recoveryEvidenceAuditNextActionDisabled(recoveryEvidenceAudit.nextAction)}
                    onClick={() => handleRecoveryEvidenceAuditNextAction(recoveryEvidenceAudit.nextAction!)}
                  >
                    {recoveryEvidenceAudit.nextAction.label}
                  </Button>
                </Space>
              )}
              {recoveryEvidenceAudit.sourceGroups.length > 0 && (
                <Space wrap size={[4, 4]}>
                  <Text strong style={{ fontSize: 12 }}>按来源定位</Text>
                  {recoveryEvidenceAudit.sourceGroups.map(group => {
                    const sourceTaskIndex = group.taskIndexes.find(index => tasks[index] && Number(tasks[index]?.chapter_id || tasks[index]?.chapterId || 0))
                      ?? group.taskIndexes[0]
                      ?? null
                    const sourceTask = sourceTaskIndex !== null ? tasks[sourceTaskIndex] : null
                    return (
                      <Space key={group.source} size={[2, 2]} wrap>
                        <Button
                          size="small"
                          type={focusedTaskSource === group.source ? 'primary' : 'default'}
                          onClick={() => {
                            setFocusedTaskSource(group.source)
                            setFocusedTaskIndex(group.taskIndexes[0] ?? null)
                          }}
                        >
                          {group.label} {group.count}
                        </Button>
                        {group.recheckAction === 'single_chapter_governance_recheck' && sourceTask && onRecheckRepairTask && (
                          <Button
                            size="small"
                            icon={<ReloadOutlined />}
                            onClick={() => {
                              setFocusedTaskSource(group.source)
                              setFocusedTaskIndex(sourceTaskIndex)
                              onRecheckRepairTask?.(sourceTask, run, sourceTaskIndex ?? 0)
                            }}
                          >
                            {group.recheckLabel}
                          </Button>
                        )}
                        {group.recheckAction === 'safe_batch_recovery_recheck' && onGenerateRepairAuditSummary && (
                          <Button
                            size="small"
                            icon={<ReloadOutlined />}
                            onClick={() => {
                              setFocusedTaskSource(group.source)
                              setFocusedTaskIndex(group.taskIndexes[0] ?? null)
                              onGenerateRepairAuditSummary?.(run)
                            }}
                          >
                            {group.recheckLabel}
                          </Button>
                        )}
                        <Tag color={group.resultStatus === 'closed' ? 'green' : group.resultStatus === 'needs_followup' ? 'gold' : 'default'} bordered={false}>
                          {group.resultLabel}
                        </Tag>
                        <Tag color={group.productionBlockStatus === 'cleared' ? 'green' : group.productionBlockStatus === 'blocked' ? 'red' : 'default'} bordered={false}>
                          {group.productionBlockLabel}
                        </Tag>
                        <Text type={group.productionBlockStatus === 'blocked' ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                          {group.productionBlockDetail}
                        </Text>
                        {group.latestSummary && (
                          <Text type="secondary" style={{ fontSize: 12 }}>{group.latestSummary}</Text>
                        )}
                        {group.residualEvidence.length > 0 && (
                          <Text type="danger" style={{ fontSize: 12 }}>残留依据：{group.residualEvidence.join('；')}</Text>
                        )}
                        {group.residualAction === 'revision' && sourceTask && onStartRepairTaskRevision && (
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => {
                              setFocusedTaskSource(group.source)
                              setFocusedTaskIndex(sourceTaskIndex)
                              onStartRepairTaskRevision?.(sourceTask, run, sourceTaskIndex ?? 0)
                            }}
                          >
                            {group.residualActionLabel}
                          </Button>
                        )}
                        {group.residualAction === 'focus_task' && (
                          <Button
                            size="small"
                            type="link"
                            onClick={() => {
                              setFocusedTaskSource(group.source)
                              setFocusedTaskIndex(sourceTaskIndex)
                            }}
                          >
                            {group.residualActionLabel}
                          </Button>
                        )}
                      </Space>
                    )
                  })}
                </Space>
              )}
              {recoveryEvidenceAudit.memorySummary && (
                <Text type="secondary" style={{ fontSize: 12 }}>治理记忆：{recoveryEvidenceAudit.memorySummary}</Text>
              )}
              {recoveryEvidenceAudit.failedEvidence.length > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>失效依据：{recoveryEvidenceAudit.failedEvidence.join('；')}</Text>
              )}
              {recoveryEvidenceAudit.repairedEvidence.length > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>修后证据：{recoveryEvidenceAudit.repairedEvidence.join('；')}</Text>
              )}
              {recoveryEvidenceAudit.watchItems.length > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>仍需观察：{recoveryEvidenceAudit.watchItems.join('；')}</Text>
              )}
              {recoveryEvidenceAudit.relatedTasks.length > 0 && (
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Text strong style={{ fontSize: 12 }}>关联批次修复任务</Text>
                  {recoveryEvidenceAudit.relatedTasks.map((task, index) => {
                    const sourceTask = task.taskIndex !== null ? tasks[task.taskIndex] : null
                    const chapterId = task.chapterId || Number(sourceTask?.chapter_id || sourceTask?.chapterId || 0) || null
                    return (
                      <Space key={`${task.chapterNo || 'task'}-${index}`} wrap size={[4, 2]}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {task.chapterNo ? `第${task.chapterNo}章 ` : ''}{task.title}{task.status ? ` · ${task.status}` : ''}{task.summary ? ` · ${task.summary}` : ''}
                        </Text>
                        {task.taskIndex !== null && (
                          <Button size="small" type="link" onClick={() => {
                            setFocusedTaskSource('')
                            setFocusedTaskIndex(task.taskIndex)
                          }}>定位任务</Button>
                        )}
                        {chapterId && onSelectChapter && (
                          <Button size="small" type="link" onClick={() => onSelectChapter(chapterId)}>打开章节</Button>
                        )}
                        {sourceTask && onStartRepairTaskRevision && (
                          <Button size="small" type="link" onClick={() => onStartRepairTaskRevision(sourceTask, run, task.taskIndex ?? index)}>生成修订稿</Button>
                        )}
                      </Space>
                    )
                  })}
                </Space>
              )}
            </Space>
          </div>
        )}
        {Array.isArray(output.recommendations) && output.recommendations.length > 0 && (
          <div style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 6 }}>
            <Space direction="vertical" size={4}>
              <Text strong style={{ fontSize: 12 }}>处理建议</Text>
              {output.recommendations.slice(0, 4).map((item: string, index: number) => (
                <Text key={`${item}-${index}`} type="secondary" style={{ fontSize: 12 }}>{item}</Text>
              ))}
            </Space>
          </div>
        )}
        {output.report?.summary && <Text type="secondary" style={{ fontSize: 12 }}>{output.report.summary}</Text>}
        {safeBatchRecoveryFocus && (
          <Alert
            type="info"
            showIcon
            message={`路线图聚焦：${safeBatchRecoveryFocus.actionLabel || safeBatchRecoveryFocus.layerLabel}`}
            description={safeBatchRecoveryFocus.taskCenterFilterLabel || safeBatchRecoveryFocus.issueType || '按安全连写恢复路线图定位下一层修复任务。'}
          />
        )}
        <List
          size="small"
          dataSource={tasks.slice(0, 40)}
          locale={{ emptyText: '暂无修复任务' }}
          renderItem={(task: any, taskIndex: number) => {
            const sourceFocused = Boolean(focusedTaskSource && recoveryEvidenceTaskSourceMeta(task).source === focusedTaskSource)
            const regovernanceQueue = recoveryEvidenceRegovernanceQueueOfTask(task)
            const regovernanceSummary = buildRecoveryEvidenceRegovernanceSummary(task)
            const refreshAnchorFocused = Boolean(
              recoveryEvidenceRefreshAnchor
              && (recoveryEvidenceRefreshAnchor.taskIndex === taskIndex || recoveryEvidenceRefreshAnchor.sourceTaskIndex === taskIndex),
            )
            const roadmapFocused = safeBatchRecoveryFocusMatchesTask(safeBatchRecoveryFocus, task)
            const defaultLaneTags = buildDefaultLaneRepairTaskTags(task)
            const focused = focusedTaskIndex === taskIndex || sourceFocused || refreshAnchorFocused || roadmapFocused
            return (
              <List.Item
                style={focused ? { border: '1px solid #a855f7', borderRadius: 6, paddingInline: 8, background: '#faf5ff' } : undefined}
              actions={[
                regovernanceQueue && regovernanceSummary && onCreateRecoveryEvidenceGovernanceQueue && task.task_status !== 'resolved' ? (
                  <Button
                    key="regovernance"
                    size="small"
                    type="primary"
                    onClick={() => onCreateRecoveryEvidenceGovernanceQueue({
                      recoveryEvidenceGovernanceQueue: regovernanceQueue,
                      sourceTask: task,
                      sourceRunId: run?.id,
                      sourceTaskIndex: taskIndex,
                    }, run, taskIndex, { keepTaskCenterOpen: true })}
                  >
                    {regovernanceSummary.actionLabel}
                  </Button>
                ) : null,
                repairTaskActionLabel(task) && onExecuteTypedRepairTask && task.task_status !== 'resolved' ? <Button key="typed" size="small" type="primary" onClick={() => onExecuteTypedRepairTask(task, run, taskIndex)}>{repairTaskActionLabel(task)}</Button> : null,
                onUpdateRepairTaskStatus && task.task_status !== 'resolved' ? <Button key="resolved" size="small" type="link" onClick={() => onUpdateRepairTaskStatus(task, run, 'resolved', taskIndex)}>已处理</Button> : null,
                onUpdateRepairTaskStatus && task.task_status !== 'needs_review' ? <Button key="review" size="small" type="link" onClick={() => onUpdateRepairTaskStatus(task, run, 'needs_review', taskIndex)}>需复查</Button> : null,
                task.chapter_id && onSelectChapter ? <Button key="select" size="small" type="link" onClick={() => onSelectChapter(Number(task.chapter_id))}>定位</Button> : null,
                task.chapter_id && onOpenChapterEditor ? <Button key="edit" size="small" type="link" onClick={() => onOpenChapterEditor(Number(task.chapter_id))}>手动编辑</Button> : null,
                task.chapter_id && onStartRepairTaskRevision ? <Button key="revise" size="small" type="link" onClick={() => onStartRepairTaskRevision(task, run, taskIndex)}>生成修订稿</Button> : null,
              ].filter(Boolean)}
            >
              <List.Item.Meta
                title={(
                  <Space wrap>
                    <Tag color={task.severity === 'high' ? 'red' : task.severity === 'medium' ? 'gold' : 'default'} bordered={false}>{task.severity || 'task'}</Tag>
                    {repairTaskIssueTag(task)}
                    {defaultLaneTags.map(tag => (
                      <Tag key={tag.key} color={tag.color} bordered={false}>{tag.label}</Tag>
                    ))}
                    {repairTaskStatusTag(task.task_status)}
                    <Text>{task.chapter_no ? `第${task.chapter_no}章 ` : ''}{task.title || task.message}</Text>
                    {task.segment && <Tag bordered={false}>{task.segment}</Tag>}
                  </Space>
                )}
                description={(
                  <Space direction="vertical" size={2}>
                    <Text type="secondary">{task.message}</Text>
                    <Text>{task.action}</Text>
                    {Array.isArray(task.acceptance_criteria) && task.acceptance_criteria.length > 0 && (
                      <Text type="secondary" style={{ fontSize: 12 }}>验收：{task.acceptance_criteria.slice(0, 2).join('；')}</Text>
                    )}
                    <BatchPlanReviewPreview task={task} />
                    <RecoveryEvidenceReviewPreview
                      task={task}
                      taskIndex={taskIndex}
                      currentRun={run}
                      runRecords={runRecords}
                      actionFeedbackByKey={recoveryEvidenceActionFeedbackByKey}
                      onRecoveryEvidenceReviewRowAction={(row, rowAction) => handleRecoveryEvidenceReviewRowAction(task, taskIndex, row, rowAction)}
                    />
                    <RecoveryEvidenceRegovernancePreview task={task} />
                    <SafeBatchExpansionSegmentPreview task={task} />
                    <DeliveryRiskReviewPreview task={task} />
                  </Space>
                )}
              />
            </List.Item>
            )
          }}
        />
      </Space>
    </Card>
  )
}

function ReleaseBatchRunSummary({ run }: { run: any }) {
  const output = parseJsonValue(run.output_ref) || {}
  const results = Array.isArray(output.results) ? output.results : []
  const failed = results.filter((item: any) => item.status === 'failed')
  const title = run.run_type === 'release_similarity_batch' ? '发布相似度批量任务' : '发布质检批量任务'
  return (
    <Card size="small" title={title}>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          {statusTag(run.status)}
          <Tag color="blue" bordered={false}>已处理 {output.processed || results.length || 0}</Tag>
          <Tag color="green" bordered={false}>成功 {output.success ?? results.length - failed.length}</Tag>
          <Tag color={failed.length ? 'red' : 'default'} bordered={false}>失败 {output.failed ?? failed.length}</Tag>
        </Space>
        <Text type="secondary" style={{ fontSize: 12 }}>{output.phase || run.step_name || '-'}</Text>
        {results.length > 0 && (
          <List
            size="small"
            dataSource={results.slice(0, 30)}
            renderItem={(item: any) => (
              <List.Item>
                <Space direction="vertical" size={2}>
                  <Space wrap>
                    {statusTag(item.status)}
                    <Text>第{item.chapter_no}章</Text>
                    {typeof item.score === 'number' && <Tag color={item.score >= 78 ? 'green' : 'gold'} bordered={false}>质量 {item.score}</Tag>}
                    {typeof item.risk === 'number' && <Tag color={item.risk <= 35 ? 'green' : 'gold'} bordered={false}>风险 {item.risk}</Tag>}
                    {item.review_id && <Tag bordered={false}>报告 #{item.review_id}</Tag>}
                  </Space>
                  {item.error && <Text type="danger" style={{ fontSize: 12 }}>{item.error}</Text>}
                </Space>
              </List.Item>
            )}
          />
        )}
      </Space>
    </Card>
  )
}

function ChapterGroupRunSummary({
  run,
  onApproveChapterGroup,
  onRetryChapterGroup,
  onSkipChapterGroup,
}: {
  run: any
  onApproveChapterGroup?: (run: any, chapter: any) => void
  onRetryChapterGroup?: (run: any, chapter: any) => void
  onSkipChapterGroup?: (run: any, chapter: any) => void
}) {
  const output = parseJsonValue(run.output_ref) || {}
  const chapters = Array.isArray(output.chapters) ? output.chapters : []
  const success = chapters.filter((item: any) => item.status === 'success').length
  const failed = chapters.filter((item: any) => item.status === 'failed').length
  const skipped = chapters.filter((item: any) => item.status === 'skipped' || item.status === 'written').length
  const total = chapters.length
  const percent = total ? Math.round(((success + skipped) / total) * 100) : 0
  const stageColor = (status?: string) => (
    status === 'success' ? 'green'
      : status === 'failed' ? 'red'
        : status === 'running' ? 'blue'
          : status === 'warn' ? 'gold'
            : status === 'skipped' ? 'default'
              : 'default'
  )
  return (
    <Card size="small" title="章节群执行">
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space wrap>
          <Tag color="blue" bordered={false}>进度 {success + skipped}/{total}</Tag>
          <Tag color="green" bordered={false}>成功 {success}</Tag>
          <Tag color={failed ? 'red' : 'default'} bordered={false}>失败 {failed}</Tag>
          <Tag bordered={false}>跳过 {skipped}</Tag>
          <Tag bordered={false}>当前 {output.current_index ?? 0}</Tag>
        </Space>
        <Progress percent={percent} size="small" />
        {output.phase && <Text type="secondary" style={{ fontSize: 12 }}>{output.phase}</Text>}
        <Space wrap size={[4, 4]}>
          {chapters.slice(0, 80).map((chapter: any) => (
            <Tag
              key={`${chapter.id || chapter.chapter_no}-${chapter.status}`}
              color={chapter.status === 'success' ? 'green' : chapter.status === 'failed' ? 'red' : chapter.status === 'running' ? 'blue' : chapter.status === 'skipped' ? 'default' : 'gold'}
              bordered={false}
            >
              第{chapter.chapter_no}章 · {chapter.status || 'pending'}{chapter.score ? ` · ${chapter.score}分` : ''}
            </Tag>
          ))}
        </Space>
        {chapters.some((chapter: any) => Array.isArray(chapter.stages) && chapter.stages.length > 0) && (
          <Card size="small" title="章节流水线阶段" styles={{ body: { padding: 8 } }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {chapters.slice(0, 12).map((chapter: any) => {
                const stages = Array.isArray(chapter.stages) ? chapter.stages : []
                if (!stages.length) return null
                return (
                  <div key={`stages-${chapter.id || chapter.chapter_no}`} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 6 }}>
                    <Text strong style={{ fontSize: 12 }}>第{chapter.chapter_no}章</Text>
                    <Space wrap size={[4, 4]} style={{ marginLeft: 8 }}>
                      {stages.map((stage: any) => (
                        <Tag key={`${chapter.id || chapter.chapter_no}-${stage.key}`} color={stageColor(stage.status)} bordered={false}>
                          {stage.label || stage.key}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )
              })}
            </Space>
          </Card>
        )}
        {output.last_error && (
          <Paragraph type="danger" style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 3, expandable: true }}>
            第{output.last_error.chapter_no}章失败：{output.last_error.error}
          </Paragraph>
        )}
        {chapters.some((chapter: any) => ['needs_approval', 'ready', 'failed'].includes(chapter.status)) && (
          <Card size="small" title="可操作章节" styles={{ body: { padding: 8 } }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              {chapters.filter((chapter: any) => ['needs_approval', 'ready', 'failed'].includes(chapter.status)).slice(0, 10).map((chapter: any) => (
                <Space key={`action-${chapter.id || chapter.chapter_no}`} style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12 }}>第{chapter.chapter_no}章 · {chapter.error || chapter.approval_stage || chapter.status}</Text>
                  <Space>
                    {chapter.status === 'needs_approval' && onApproveChapterGroup && <Button size="small" type="link" onClick={() => onApproveChapterGroup(run, chapter)}>确认</Button>}
                    {onRetryChapterGroup && <Button size="small" type="link" onClick={() => onRetryChapterGroup(run, chapter)}>重试</Button>}
                    {onSkipChapterGroup && <Button size="small" type="link" danger onClick={() => onSkipChapterGroup(run, chapter)}>跳过</Button>}
                  </Space>
                </Space>
              ))}
            </Space>
          </Card>
        )}
      </Space>
    </Card>
  )
}

function sourceCacheTag(sourceCache: any) {
  if (!sourceCache?.status) return null
  const cached = Number(sourceCache.cached_chapters || 0)
  const fetched = Number(sourceCache.fetched_chapters || 0)
  if (sourceCache.status === 'hit') return <Tag color="green" bordered={false}>缓存命中 {cached}章</Tag>
  if (sourceCache.status === 'partial') return <Tag color="gold" bordered={false}>缓存 {cached}章 · 新抓 {fetched}章</Tag>
  return <Tag bordered={false}>新抓 {fetched}章</Tag>
}

export function TaskCenterDrawer({
  open,
  activeTasks,
  runRecords,
  productionTasks,
  knowledgeIngestJobs,
  loading,
  knowledgeJobsLoading,
  onClose,
  onRefresh,
  onRefreshKnowledgeJobs,
  onPauseKnowledgeJob,
  onResumeKnowledgeJob,
  onCancelKnowledgeJob,
  chapterGroupExecutingId,
  releaseRepairExecutingId,
  onExecuteChapterGroup,
  onPauseRun,
  onResumeRun,
  onRecoverRunQueue,
  onExecuteReleaseRepairRun,
  onApproveChapterGroup,
  onRetryChapterGroup,
  onSkipChapterGroup,
  onSelectChapter,
  onOpenChapterEditor,
  onStartRepairTaskRevision,
  onExecuteTypedRepairTask,
  onRecheckRepairTask,
  onUpdateRepairTaskStatus,
  onBulkUpdateRepairTaskStatus,
  onGenerateRepairAuditSummary,
  onCreateRecoveryEvidenceGovernanceQueue,
  safeBatchRecoveryFocus,
}: {
  open: boolean
  activeTasks: WorkspaceActiveTask[]
  runRecords: any[]
  productionTasks?: any | null
  knowledgeIngestJobs: any[]
  loading: boolean
  knowledgeJobsLoading: boolean
  onClose: () => void
  onRefresh: () => void | Promise<void>
  onRefreshKnowledgeJobs: () => void | Promise<void>
  onPauseKnowledgeJob: (jobId: string) => void | Promise<void>
  onResumeKnowledgeJob: (jobId: string) => void | Promise<void>
  onCancelKnowledgeJob: (jobId: string) => void | Promise<void>
  chapterGroupExecutingId?: number | null
  releaseRepairExecutingId?: number | null
  onExecuteChapterGroup?: (run: any) => void
  onPauseRun?: (run: any) => void
  onResumeRun?: (run: any) => void
  onRecoverRunQueue?: () => void
  onExecuteReleaseRepairRun?: (run: any) => void
  onApproveChapterGroup?: (run: any, chapter: any) => void
  onRetryChapterGroup?: (run: any, chapter: any) => void
  onSkipChapterGroup?: (run: any, chapter: any) => void
  onSelectChapter?: (chapterId: number) => void | Promise<void>
  onOpenChapterEditor?: (chapterId: number) => void | Promise<void>
  onStartRepairTaskRevision?: (task: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  onExecuteTypedRepairTask?: (task: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  onRecheckRepairTask?: (task: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  onUpdateRepairTaskStatus?: (task: any, run: any, status: string, taskIndex: number) => void | Promise<void>
  onBulkUpdateRepairTaskStatus?: (items: any[], status: string) => void | Promise<void>
  onGenerateRepairAuditSummary?: (run: any, options?: RepairTaskActionOptions) => void | Promise<void>
  onCreateRecoveryEvidenceGovernanceQueue?: (payload: any, run: any, taskIndex: number, options?: RepairTaskActionOptions) => void | Promise<void>
  safeBatchRecoveryFocus?: SafeBatchRecoveryFocusSnapshot | null
}) {
  const [detailRun, setDetailRun] = useState<any | null>(null)
  const [detailKnowledgeJob, setDetailKnowledgeJob] = useState<any | null>(null)
  const sortedRuns = useMemo(() => (
    [...runRecords].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  ), [runRecords])
  const sortedKnowledgeJobs = useMemo(() => (
    [...knowledgeIngestJobs].sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))
  ), [knowledgeIngestJobs])
  useEffect(() => {
    if (!detailRun?.id) return
    const nextRun = runRecords.find((run: any) => Number(run.id) === Number(detailRun.id))
    if (nextRun && nextRun !== detailRun) setDetailRun(nextRun)
  }, [runRecords, detailRun?.id])
  const normalizedTasks = Array.isArray(productionTasks?.tasks) ? productionTasks.tasks : []
  const activeNormalizedTasks = Array.isArray(productionTasks?.active) ? productionTasks.active : []
  const taskSummary = productionTasks?.summary || {}
  const openTaskDetail = (task: any) => {
    const matched = runRecords.find((run: any) => run.id === task.id)
    setDetailRun(matched || {
      ...task,
      input_ref: task.input_ref || '',
      output_ref: JSON.stringify(task.payload || {}, null, 2),
      error_message: task.error || '',
    })
  }
  const getRunPayload = (run: any) => parseJsonValue(run.output_ref) || run.payload || {}
  const reviewTasks = useMemo(() => sortedRuns.flatMap((run: any) => {
    if (!['longform_production_repair', 'first30_retention_repair', 'mechanical_qa_repair'].includes(run.run_type)) return []
    const payload = getRunPayload(run)
    const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
    return tasks
      .map((task: any, taskIndex: number) => ({ run, task, taskIndex }))
      .filter((item: any) => item.task?.task_status === 'needs_review')
  }), [sortedRuns])
  const styleSampleReviewTasks = reviewTasks.filter((item: any) => String(item.task?.issue_type || '') === 'style_sample_task_book_rebuild')
  const repairTaskItems = useMemo(() => {
    return sortedRuns.flatMap((run: any) => {
      if (!['longform_production_repair', 'first30_retention_repair', 'mechanical_qa_repair'].includes(run.run_type)) return []
      const payload = getRunPayload(run)
      const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
      return tasks
        .map((task: any, taskIndex: number) => ({ run, task, taskIndex }))
    })
  }, [sortedRuns])
  const safeBatchRecoveryFocusReviewState = useMemo(() => (
    buildSafeBatchRecoveryFocusReviewState(safeBatchRecoveryFocus, repairTaskItems)
  ), [safeBatchRecoveryFocus, repairTaskItems])
  const safeBatchRecoveryFocusTasks = safeBatchRecoveryFocusReviewState.activeItems.length > 0
    ? safeBatchRecoveryFocusReviewState.activeItems
    : safeBatchRecoveryFocusReviewState.resolvedItems
  const handleUpdateRepairTaskStatus = async (task: any, run: any, status: string, taskIndex: number) => {
    const shouldRefreshRoadmap = status === 'resolved' && safeBatchRecoveryFocusMatchesTask(safeBatchRecoveryFocus, task)
    await Promise.resolve(onUpdateRepairTaskStatus?.(task, run, status, taskIndex))
    if (shouldRefreshRoadmap) await Promise.resolve(onRefresh())
  }

  useEffect(() => {
    if (!open || !safeBatchRecoveryFocus || detailRun) return
    const focusedTask = safeBatchRecoveryFocusTasks[0]
    if (focusedTask?.run) setDetailRun(focusedTask.run)
  }, [open, detailRun, safeBatchRecoveryFocus, safeBatchRecoveryFocusTasks])

  return (
    <>
      <Drawer
        open={open}
        title="任务中心"
        width={520}
        onClose={onClose}
        extra={<Button size="small" icon={<ReloadOutlined />} loading={loading || knowledgeJobsLoading} onClick={() => { onRefresh(); onRefreshKnowledgeJobs() }}>刷新</Button>}
      >
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          <Card size="small" title="正在运行">
            {activeTasks.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前没有运行中的工作台任务" />
            ) : (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                {activeTasks.map(task => (
                  <div key={task.key} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Text strong>{task.title}</Text>
                        <Tag color="blue" bordered={false}>运行中</Tag>
                      </Space>
                      {task.phase && <Text type="secondary" style={{ fontSize: 12 }}>{task.phase}</Text>}
                      {typeof task.progress === 'number' && <Progress percent={Math.max(0, Math.min(100, Math.round(task.progress)))} size="small" />}
                      {task.detail && <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>{task.detail}</Paragraph>}
                      {task.onCancel && (
                        <Button size="small" danger icon={<StopOutlined />} onClick={task.onCancel}>
                          {task.cancelLabel || '停止'}
                        </Button>
                      )}
                    </Space>
                  </div>
                ))}
              </Space>
            )}
          </Card>

          <Card size="small" title="生产任务总览">
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Space wrap>
                <Tag color="blue" bordered={false}>活动 {taskSummary.active || activeNormalizedTasks.length || 0}</Tag>
                <Tag bordered={false}>运行 {taskSummary.running || 0}</Tag>
                <Tag bordered={false}>暂停 {taskSummary.paused || 0}</Tag>
                <Tag color={(taskSummary.failed || 0) > 0 ? 'red' : 'default'} bordered={false}>失败 {taskSummary.failed || 0}</Tag>
                <Tag color={(taskSummary.needs_approval || 0) > 0 ? 'gold' : 'default'} bordered={false}>待确认 {taskSummary.needs_approval || 0}</Tag>
                <Tag color={productionTasks?.worker?.status === 'running' ? 'green' : productionTasks?.worker?.status === 'stale' ? 'gold' : 'default'} bordered={false}>
                  worker {productionTasks?.worker?.status || 'idle'}
                </Tag>
                {productionTasks?.worker?.status === 'stale' && onRecoverRunQueue && (
                  <Button size="small" type="link" onClick={onRecoverRunQueue}>恢复队列</Button>
                )}
              </Space>
              {normalizedTasks.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无生产任务" />
              ) : (
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {normalizedTasks.slice(0, 8).map((task: any) => (
                    <div key={`${task.run_type}-${task.id}`} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
                          <Space wrap>
                            {statusTag(task.status)}
                            <Text strong>{task.type_label || runTypeLabel(task.run_type)}</Text>
                            <Tag bordered={false}>{task.step_name || '-'}</Tag>
                            {productionModeLabel(task.production_mode || task.payload?.production_mode || task.payload?.policy?.production_mode) && (
                              <Tag color="purple" bordered={false}>{productionModeLabel(task.production_mode || task.payload?.production_mode || task.payload?.policy?.production_mode)}</Tag>
                            )}
                          </Space>
                          <Button size="small" type="link" onClick={() => openTaskDetail(task)}>详情</Button>
                        </Space>
                        <Progress percent={Math.max(0, Math.min(100, Number(task.progress || 0)))} size="small" />
                        <Text type="secondary" style={{ fontSize: 12 }}>{task.phase || task.created_at || '-'}</Text>
                        {task.error && <Text type="danger" style={{ fontSize: 12 }}>{task.error}</Text>}
                        {task.recovery_plan && (
                          <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>
                            恢复方案：{safeJsonPreview(task.recovery_plan)}
                          </Paragraph>
                        )}
                        <Space wrap>
                          {task.can_pause && onPauseRun && (
                            <Button size="small" icon={<PauseCircleOutlined />} onClick={() => onPauseRun(task)}>暂停</Button>
                          )}
                          {task.can_resume && onResumeRun && (
                            <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => onResumeRun(task)}>继续</Button>
                          )}
                          {task.can_execute && task.run_type === 'chapter_group_generation' && onExecuteChapterGroup && (
                            <Button size="small" loading={chapterGroupExecutingId === task.id} onClick={() => onExecuteChapterGroup(task)}>执行</Button>
                          )}
                          {['release_quality_batch', 'release_similarity_batch'].includes(task.run_type) && ['queued', 'ready', 'failed'].includes(task.status) && onExecuteReleaseRepairRun && (
                            <Button size="small" type="primary" loading={releaseRepairExecutingId === task.id} onClick={() => onExecuteReleaseRepairRun(task)}>执行发布批量</Button>
                          )}
                          {task.error && (
                            <Button size="small" type="link" onClick={() => openTaskDetail(task)}>查看恢复</Button>
                          )}
                        </Space>
                      </Space>
                    </div>
                  ))}
                </Space>
              )}
            </Space>
          </Card>

          {safeBatchRecoveryFocus && (
            <Card size="small" title="路线图聚焦">
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color="blue" bordered={false}>{safeBatchRecoveryFocus.layerLabel || '安全连写恢复'}</Tag>
                  <Tag color={safeBatchRecoveryFocusReviewState.status === 'ready_for_recheck' ? 'green' : 'gold'} bordered={false}>
                    {safeBatchRecoveryFocus.taskCenterFilterLabel || safeBatchRecoveryFocus.issueType || '待处理'}
                  </Tag>
                  {safeBatchRecoveryFocusReviewState.matchedCount > 0 && <Tag color="green" bordered={false}>命中 {safeBatchRecoveryFocusReviewState.matchedCount}</Tag>}
                  {safeBatchRecoveryFocusReviewState.activeCount > 0 && <Tag color="gold" bordered={false}>待处理 {safeBatchRecoveryFocusReviewState.activeCount}</Tag>}
                  {safeBatchRecoveryFocusReviewState.resolvedCount > 0 && <Tag color="green" bordered={false}>已处理 {safeBatchRecoveryFocusReviewState.resolvedCount}</Tag>}
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {safeBatchRecoveryFocusReviewState.summary}
                </Text>
                {safeBatchRecoveryFocusReviewState.obligationStatuses.length > 0 && (
                  <Space wrap>
                    {safeBatchRecoveryFocusReviewState.obligationStatuses.map(item => (
                      <Tag key={item.key} color={item.color} bordered={false}>{item.text}</Tag>
                    ))}
                  </Space>
                )}
                <Space wrap>
                  <Button
                    size="small"
                    type={safeBatchRecoveryFocusReviewState.status === 'ready_for_recheck' ? 'primary' : 'default'}
                    icon={<ReloadOutlined />}
                    onClick={() => onRefresh()}
                  >
                    {safeBatchRecoveryFocusReviewState.nextActionLabel}
                  </Button>
                </Space>
                {safeBatchRecoveryFocusTasks.length > 0 ? (
                  <List
                    size="small"
                    dataSource={safeBatchRecoveryFocusTasks.slice(0, 5)}
                    renderItem={(item: any) => (
                      <List.Item actions={[<Button key="open" size="small" type="link" onClick={() => setDetailRun(item.run)}>打开</Button>]}>
                        <List.Item.Meta
                          title={<Text>{item.task?.chapter_no ? `第${item.task.chapter_no}章 ` : ''}{item.task?.title || item.task?.message || '路线图任务'}</Text>}
                          description={<Text type="secondary" style={{ fontSize: 12 }}>{runTypeLabel(item.run?.run_type)} · {repairTaskActionLabel(item.task) || item.task?.action || '-'}</Text>}
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Text type="secondary" style={{ fontSize: 12 }}>暂未找到匹配的待复查任务，可打开最近的安全连写/修复历史查看复盘记录。</Text>
                )}
              </Space>
            </Card>
          )}

          {reviewTasks.length > 0 && (
            <Card
              size="small"
              title={`复查清单 ${reviewTasks.length}`}
              extra={(
                <Space>
                  {styleSampleReviewTasks.length > 0 && onRecheckStyleSampleTaskBooks && (
                    <Button size="small" onClick={() => onRecheckStyleSampleTaskBooks(styleSampleReviewTasks)}>
                      复检样章任务书
                    </Button>
                  )}
                  {onBulkUpdateRepairTaskStatus ? (
                    <Popconfirm
                      title={`确认通过 ${reviewTasks.length} 个需复查任务？`}
                      onConfirm={() => onBulkUpdateRepairTaskStatus(reviewTasks, 'resolved')}
                    >
                      <Button size="small" type="primary">批量确认通过</Button>
                    </Popconfirm>
                  ) : null}
                </Space>
              )}
            >
              <List
                size="small"
                dataSource={reviewTasks.slice(0, 30)}
                renderItem={(item: any) => (
                  <List.Item
                    style={safeBatchRecoveryFocusMatchesTask(safeBatchRecoveryFocus, item.task) ? { border: '1px solid #a855f7', borderRadius: 6, paddingInline: 8, background: '#faf5ff' } : undefined}
                    actions={[
                      item.task?.chapter_id && onSelectChapter ? <Button key="select" size="small" type="link" onClick={() => onSelectChapter(Number(item.task.chapter_id))}>定位</Button> : null,
                      item.task?.chapter_id && onRecheckRepairTask ? <Button key="recheck" size="small" type="link" onClick={() => onRecheckRepairTask(item.task, item.run, item.taskIndex)}>复检收敛</Button> : null,
                      onUpdateRepairTaskStatus ? <Button key="resolve" size="small" type="link" onClick={() => handleUpdateRepairTaskStatus(item.task, item.run, 'resolved', item.taskIndex)}>确认通过</Button> : null,
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      title={(
                        <Space wrap>
                          <Tag color="gold" bordered={false}>需复查</Tag>
                          {buildDefaultLaneRepairTaskTags(item.task).map(tag => (
                            <Tag key={tag.key} color={tag.color} bordered={false}>{tag.label}</Tag>
                          ))}
                          <Text>{item.task?.chapter_no ? `第${item.task.chapter_no}章 ` : ''}{item.task?.title || item.task?.message || '修复任务'}</Text>
                        </Space>
                      )}
                      description={<Text type="secondary" style={{ fontSize: 12 }}>{runTypeLabel(item.run?.run_type)} · {item.task?.action || item.task?.message || '-'}</Text>}
                    />
                  </List.Item>
                )}
              />
              {reviewTasks.length > 30 && <Text type="secondary" style={{ fontSize: 12 }}>另有 {reviewTasks.length - 30} 个需复查任务，可批量确认或打开对应队列查看。</Text>}
            </Card>
          )}

          <Card size="small" title={`全本抓取/提炼 ${sortedKnowledgeJobs.length}`}>
            {sortedKnowledgeJobs.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无全本抓取或提炼任务" />
            ) : (
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                {sortedKnowledgeJobs.slice(0, 40).map((job: any) => {
                  const canPause = ['queued', 'running'].includes(job.status)
                  const canResume = ['paused', 'failed', 'canceled'].includes(job.status)
                  const canCancel = !['completed', 'canceled'].includes(job.status)
                  return (
                    <div key={job.id} style={{ padding: 10, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
                          <Space direction="vertical" size={2}>
                            <Space wrap>
                              {statusTag(job.status)}
                              <Text strong>{job.project_title || '未命名投喂项目'}</Text>
                              {job.fetch_only && <Tag color="blue" bordered={false}>仅拉取</Tag>}
                              {sourceCacheTag(job.source_cache)}
                            </Space>
                            <Text type="secondary" style={{ fontSize: 12 }}>{job.phase || '-'}</Text>
                          </Space>
                          <Button size="small" type="link" onClick={() => setDetailKnowledgeJob(job)}>详情</Button>
                        </Space>
                        <Progress percent={Math.max(0, Math.min(100, Number(job.progress || 0)))} size="small" />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          已抓取 {job.fetched_chapters || 0} 章
                          {job.fetch_only ? '' : ` · 已提炼 ${job.analyzed_batches || 0}/${job.total_batches || 0} 批 · 候选知识 ${job.entry_count ?? job.entries?.length ?? 0} 条`}
                        </Text>
                        {(job.current_range || job.current_chapter) && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            当前：{job.current_range || `第${job.current_chapter}章`}{job.current_chapter_title ? ` / ${job.current_chapter_title}` : ''}
                          </Text>
                        )}
                        <Space wrap>
                          {canPause && (
                            <Button size="small" icon={<PauseCircleOutlined />} onClick={() => onPauseKnowledgeJob(job.id)}>暂停</Button>
                          )}
                          {canResume && (
                            <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => onResumeKnowledgeJob(job.id)}>继续</Button>
                          )}
                          {canCancel && (
                            <Popconfirm title="确定取消这个全本任务？" okText="取消任务" cancelText="返回" onConfirm={() => onCancelKnowledgeJob(job.id)}>
                              <Button size="small" danger icon={<StopOutlined />}>取消</Button>
                            </Popconfirm>
                          )}
                        </Space>
                      </Space>
                    </div>
                  )
                })}
              </Space>
            )}
          </Card>

          <Card size="small" title={`历史记录 ${sortedRuns.length}`}>
            {sortedRuns.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无历史运行记录" />
            ) : (
              <List
                size="small"
                dataSource={sortedRuns.slice(0, 80)}
                renderItem={(run: any) => (
                  <List.Item
                    actions={[
                      run.run_type === 'chapter_generation_pipeline' && run.status !== 'paused' && onPauseRun ? <Button key="pause" type="link" size="small" onClick={() => onPauseRun(run)}>暂停</Button> : null,
                      run.run_type === 'chapter_generation_pipeline' && ['paused', 'failed', 'ready'].includes(run.status) && onResumeRun ? <Button key="resume" type="link" size="small" onClick={() => onResumeRun(run)}>继续</Button> : null,
                      run.run_type === 'chapter_group_generation' && ['ready', 'paused', 'failed'].includes(run.status) && onResumeRun ? <Button key="resume-group" type="link" size="small" onClick={() => onResumeRun(run)}>继续</Button> : null,
                      run.run_type === 'chapter_group_generation' && ['ready', 'paused', 'failed', 'running'].includes(run.status) && onExecuteChapterGroup ? <Button key="execute-group" type="link" size="small" loading={chapterGroupExecutingId === run.id} onClick={() => onExecuteChapterGroup(run)}>执行</Button> : null,
                      ['release_quality_batch', 'release_similarity_batch'].includes(run.run_type) && ['queued', 'ready', 'failed'].includes(run.status) && onExecuteReleaseRepairRun ? <Button key="execute-release" type="link" size="small" loading={releaseRepairExecutingId === run.id} onClick={() => onExecuteReleaseRepairRun(run)}>执行发布批量</Button> : null,
                      run.run_type === 'chapter_group_generation' && run.status === 'running' && onPauseRun ? <Button key="pause-group" type="link" size="small" onClick={() => onPauseRun(run)}>暂停</Button> : null,
                      <Button key="detail" type="link" size="small" onClick={() => setDetailRun(run)}>详情</Button>,
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      title={(
                        <Space wrap>
                          {statusTag(run.status)}
                          <Text strong>{runTypeLabel(run.run_type)}</Text>
                          <Tag bordered={false}>{run.step_name || 'step'}</Tag>
                        </Space>
                      )}
                      description={(
                        <Space direction="vertical" size={2} style={{ width: '100%' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>{run.created_at || '-'}</Text>
                          {run.run_type === 'chapter_group_generation' && productionModeLabel(getRunPayload(run).production_mode || getRunPayload(run).policy?.production_mode) && (
                            <Text type="secondary" style={{ fontSize: 12 }}>模式：{productionModeLabel(getRunPayload(run).production_mode || getRunPayload(run).policy?.production_mode)}</Text>
                          )}
                          {run.error_message && <Text type="danger" style={{ fontSize: 12 }}>{run.error_message}</Text>}
                        </Space>
                      )}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Space>
      </Drawer>

      <Modal
        open={!!detailRun}
        title={detailRun ? `${runTypeLabel(detailRun.run_type)} · ${detailRun.step_name || 'step'}` : '任务详情'}
        onCancel={() => setDetailRun(null)}
        footer={<Button type="primary" onClick={() => setDetailRun(null)}>关闭</Button>}
        width={820}
      >
        {detailRun && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              {statusTag(detailRun.status)}
              <Tag bordered={false}>{detailRun.created_at || '-'}</Tag>
              {detailRun.duration_ms ? <Tag bordered={false}>{detailRun.duration_ms}ms</Tag> : null}
            </Space>
            {detailRun.error_message && (
              <Card size="small" title="错误信息">
                <Text type="danger">{detailRun.error_message}</Text>
              </Card>
            )}
            {detailRun.run_type === 'batch_generate_prose' && <BatchProseRunSummary run={detailRun} />}
            {detailRun.run_type === 'chapter_generation_pipeline' && <ChapterPipelineRunSummary run={detailRun} />}
            {detailRun.run_type === 'release_repair_queue' && <ReleaseRepairRunSummary run={detailRun} />}
            {['mechanical_qa_repair', 'first30_retention_repair'].includes(detailRun.run_type) && (
              <RepairTaskRunSummary
                run={detailRun}
                runRecords={runRecords}
                safeBatchRecoveryFocus={safeBatchRecoveryFocus}
                onRefresh={onRefresh}
                onSelectChapter={(chapterId) => {
                  setDetailRun(null)
                  return onSelectChapter?.(chapterId)
                }}
                onOpenChapterEditor={(chapterId) => {
                  setDetailRun(null)
                  return onOpenChapterEditor?.(chapterId)
                }}
                onStartRepairTaskRevision={(task, run, taskIndex, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onStartRepairTaskRevision?.(task, run, taskIndex, options)
                }}
                onExecuteTypedRepairTask={(task, run, taskIndex, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onExecuteTypedRepairTask?.(task, run, taskIndex, options)
                }}
                onRecheckRepairTask={(task, run, taskIndex, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onRecheckRepairTask?.(task, run, taskIndex, options)
                }}
                onUpdateRepairTaskStatus={(task, run, status, taskIndex) => {
                  setDetailRun(null)
                  return handleUpdateRepairTaskStatus(task, run, status, taskIndex)
                }}
                onGenerateRepairAuditSummary={(run, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onGenerateRepairAuditSummary?.(run, options)
                }}
                onCreateRecoveryEvidenceGovernanceQueue={(payload, run, taskIndex, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onCreateRecoveryEvidenceGovernanceQueue?.(payload, run, taskIndex, options)
                }}
              />
            )}
            {detailRun.run_type === 'longform_production_repair' && (
              <RepairTaskRunSummary
                run={detailRun}
                runRecords={runRecords}
                safeBatchRecoveryFocus={safeBatchRecoveryFocus}
                onRefresh={onRefresh}
                onSelectChapter={(chapterId) => {
                  setDetailRun(null)
                  return onSelectChapter?.(chapterId)
                }}
                onOpenChapterEditor={(chapterId) => {
                  setDetailRun(null)
                  return onOpenChapterEditor?.(chapterId)
                }}
                onStartRepairTaskRevision={(task, run, taskIndex, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onStartRepairTaskRevision?.(task, run, taskIndex, options)
                }}
                onExecuteTypedRepairTask={(task, run, taskIndex, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onExecuteTypedRepairTask?.(task, run, taskIndex, options)
                }}
                onRecheckRepairTask={(task, run, taskIndex, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onRecheckRepairTask?.(task, run, taskIndex, options)
                }}
                onUpdateRepairTaskStatus={(task, run, status, taskIndex) => {
                  setDetailRun(null)
                  return handleUpdateRepairTaskStatus(task, run, status, taskIndex)
                }}
                onGenerateRepairAuditSummary={(run, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onGenerateRepairAuditSummary?.(run, options)
                }}
                onCreateRecoveryEvidenceGovernanceQueue={(payload, run, taskIndex, options) => {
                  if (!options?.keepTaskCenterOpen) setDetailRun(null)
                  return onCreateRecoveryEvidenceGovernanceQueue?.(payload, run, taskIndex, options)
                }}
              />
            )}
            {['release_quality_batch', 'release_similarity_batch'].includes(detailRun.run_type) && <ReleaseBatchRunSummary run={detailRun} />}
            {detailRun.run_type === 'chapter_group_generation' && <ChapterGroupRunSummary run={detailRun} onApproveChapterGroup={onApproveChapterGroup} onRetryChapterGroup={onRetryChapterGroup} onSkipChapterGroup={onSkipChapterGroup} />}
            <Card size="small" title="输入">
              <Paragraph style={{ whiteSpace: 'pre-wrap', maxHeight: 220, overflow: 'auto', marginBottom: 0 }}>
                {safeJsonPreview(detailRun.input_ref) || '无'}
              </Paragraph>
            </Card>
            <Card size="small" title="输出">
              <Paragraph style={{ whiteSpace: 'pre-wrap', maxHeight: 320, overflow: 'auto', marginBottom: 0 }}>
                {safeJsonPreview(detailRun.output_ref) || '无'}
              </Paragraph>
            </Card>
          </Space>
        )}
      </Modal>

      <Modal
        open={!!detailKnowledgeJob}
        title={detailKnowledgeJob ? `全本任务 · ${detailKnowledgeJob.project_title || detailKnowledgeJob.id}` : '全本任务详情'}
        onCancel={() => setDetailKnowledgeJob(null)}
        footer={<Button type="primary" onClick={() => setDetailKnowledgeJob(null)}>关闭</Button>}
        width={860}
      >
        {detailKnowledgeJob && (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              {statusTag(detailKnowledgeJob.status)}
              <Tag bordered={false}>{detailKnowledgeJob.phase || '-'}</Tag>
              <Tag bordered={false}>并发 {detailKnowledgeJob.fetch_concurrency || 1}</Tag>
              <Tag bordered={false}>批量 {detailKnowledgeJob.batch_size || 0} 章</Tag>
              {sourceCacheTag(detailKnowledgeJob.source_cache)}
            </Space>
            <Progress percent={Math.max(0, Math.min(100, Number(detailKnowledgeJob.progress || 0)))} size="small" />
            <Card size="small" title="来源">
              <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{detailKnowledgeJob.url || '无'}</Paragraph>
            </Card>
            {Array.isArray(detailKnowledgeJob.errors) && detailKnowledgeJob.errors.length > 0 && (
              <Card size="small" title="错误">
                <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{detailKnowledgeJob.errors.join('\n')}</Paragraph>
              </Card>
            )}
            <Card size="small" title="批次">
              {Array.isArray(detailKnowledgeJob.batches) && detailKnowledgeJob.batches.length > 0 ? (
                <Space wrap>
                  {detailKnowledgeJob.batches.map((batch: any) => (
                    <Tag key={batch.index} bordered={false} color={batch.status === 'completed' ? 'green' : batch.status === 'failed' ? 'red' : batch.status === 'analyzing' ? 'blue' : 'default'}>
                      {batch.first_chapter === batch.last_chapter ? `第${batch.first_chapter}章` : `第${batch.first_chapter}-${batch.last_chapter}章`}
                      {' '}
                      {batch.status}
                      {typeof batch.entry_count === 'number' ? ` ${batch.entry_count}条` : ''}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">暂无批次</Text>
              )}
            </Card>
          </Space>
        )}
      </Modal>
    </>
  )
}
