import React, { useMemo, useState } from 'react'
import { Button, Card, Drawer, Empty, List, Modal, Popconfirm, Progress, Space, Tag, Typography } from 'antd'
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
  if (String(task?.issue_type || '') === 'recovery_evidence_mismatch') {
    return isSingleChapterRecoveryEvidenceTask(task) ? '回修依据' : '按批次修订'
  }
  if (String(task?.issue_type || '') === 'style_sample_task_book_rebuild') return '重审样章'
  if (String(task?.source || '') === 'reader_trial_review' || String(task?.issue_type || '') === 'reader_trial_drop_point') return '补试读'
  if (String(task?.issue_type || '') === 'volume_segment_missed') return '补阶段结算'
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

export type RecoveryEvidenceAuditView = {
  status: 'closed' | 'needs_followup'
  label: string
  total: number
  resolved: number
  sourceSummary: string
  sourceGroups: {
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
  }[]
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
      }
    })
    .sort((a, b) => (order[a.source] ?? 99) - (order[b.source] ?? 99) || a.label.localeCompare(b.label))
}

export function buildRecoveryEvidenceAuditView(audit?: any | null, latestTasks: any[] = []): RecoveryEvidenceAuditView | null {
  const closure = audit?.recovery_evidence_closure || audit?.recoveryEvidenceClosure || null
  if (!closure || Number(closure.total || 0) <= 0) return null
  const memory = audit?.governance_recheck_memory || audit?.governanceRecheckMemory || null
  const closureTasks = Array.isArray(closure.tasks) ? closure.tasks : []
  return {
    status: closure.status === 'closed' ? 'closed' : 'needs_followup',
    label: '恢复依据审计',
    total: Number(closure.total || 0),
    resolved: Number(closure.resolved || 0),
    sourceSummary: recoveryEvidenceSourceSummary(closure),
    sourceGroups: recoveryEvidenceSourceGroups(closureTasks, latestTasks),
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
  if (String(task?.issue_type || '') === 'recovery_evidence_mismatch') return <Tag color="purple" bordered={false}>恢复依据</Tag>
  if (String(task?.issue_type || '') === 'style_sample_task_book_rebuild') return <Tag color="purple" bordered={false}>样章任务书</Tag>
  if (String(task?.source || '') === 'reader_trial_review' || String(task?.issue_type || '') === 'reader_trial_drop_point') return <Tag color="red" bordered={false}>读者试读</Tag>
  if (String(task?.issue_type || '') === 'volume_segment_missed') return <Tag color="gold" bordered={false}>卷级阶段</Tag>
  if (String(task?.issue_type || '') === 'reader_pull_missed') return <Tag color="magenta" bordered={false}>读者拉力</Tag>
  if (String(task?.issue_type || '') === 'innovation_execution_missed') return <Tag color="geekblue" bordered={false}>创新/IP</Tag>
  if (String(task?.source || '') === 'rolling_script_room' || String(task?.issue_type || '') === 'script_room_layer_gap') return <Tag color="blue" bordered={false}>剧本室</Tag>
  if (String(task?.source || '') === 'storyline_diff_decision') return <Tag color="purple" bordered={false}>剧情线决策</Tag>
  const meta = deliveryRiskIssueMeta(task)
  if (meta) return <Tag color={meta.color} bordered={false}>{meta.label}</Tag>
  return null
}

function compactEvidenceText(value: any) {
  if (!value) return ''
  if (typeof value !== 'object') return String(value)
  return String(value.name || value.label || value.title || value.text || value.description || value.reason || value.message || '').trim()
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

function RecoveryEvidenceReviewPreview({ task }: { task: any }) {
  const recoveryEvidenceReview = task.recovery_evidence_review || task.recoveryEvidenceReview || null
  const failedItems = Array.isArray(recoveryEvidenceReview?.failed_items) ? recoveryEvidenceReview.failed_items : []
  const failedEvidence = Array.isArray(recoveryEvidenceReview?.failed_evidence) ? recoveryEvidenceReview.failed_evidence : []
  const rows = (failedItems.length > 0
    ? failedItems.map((item: any) => ({
      evidence: compactEvidenceText(item?.evidence || item),
      riskLabels: Array.isArray(item?.risk_labels) ? item.risk_labels : Array.isArray(item?.riskLabels) ? item.riskLabels : [],
    }))
    : failedEvidence.map((item: any) => ({
      evidence: compactEvidenceText(item),
      riskLabels: [],
    })))
    .filter((item: any) => item.evidence)
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

function repairTaskStatusTag(status?: string) {
  if (status === 'resolved') return <Tag color="green" bordered={false}>已处理</Tag>
  if (status === 'needs_review') return <Tag color="gold" bordered={false}>需复查</Tag>
  if (status === 'in_progress') return <Tag color="blue" bordered={false}>处理中</Tag>
  return <Tag bordered={false}>待处理</Tag>
}

function BatchProseRunSummary({ run }: { run: any }) {
  const input = parseJsonValue(run.input_ref) || {}
  const output = parseJsonValue(run.output_ref) || {}
  const batchPreflight = input.batch_preflight || input.batchPreflight || null
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
  onSelectChapter,
  onOpenChapterEditor,
  onStartRepairTaskRevision,
  onExecuteTypedRepairTask,
  onRecheckRepairTask,
  onUpdateRepairTaskStatus,
  onBulkUpdateRepairTaskStatus,
  onRecheckStyleSampleTaskBooks,
  onGenerateRepairAuditSummary,
}: {
  run: any
  onSelectChapter?: (chapterId: number) => void
  onOpenChapterEditor?: (chapterId: number) => void
  onStartRepairTaskRevision?: (task: any, run: any, taskIndex: number) => void
  onExecuteTypedRepairTask?: (task: any, run: any, taskIndex: number) => void
  onRecheckRepairTask?: (task: any, run: any, taskIndex: number) => void
  onUpdateRepairTaskStatus?: (task: any, run: any, status: string, taskIndex: number) => void
  onBulkUpdateRepairTaskStatus?: (items: any[], status: string) => void
  onRecheckStyleSampleTaskBooks?: (items: any[]) => void
  onGenerateRepairAuditSummary?: (run: any) => void
}) {
  const output = parseJsonValue(run.output_ref) || {}
  const tasks = Array.isArray(output.tasks) ? output.tasks : []
  const audit = output.audit_summary || null
  const [focusedTaskIndex, setFocusedTaskIndex] = useState<number | null>(null)
  const [focusedTaskSource, setFocusedTaskSource] = useState<string>('')
  const high = tasks.filter((task: any) => task.severity === 'high').length
  const medium = tasks.filter((task: any) => task.severity === 'medium').length
  const resolved = tasks.filter((task: any) => task.task_status === 'resolved').length
  const needsReview = tasks.filter((task: any) => task.task_status === 'needs_review').length
  const closureHighlights = buildRepairClosureHighlights(tasks, audit)
  const recoveryEvidenceAudit = buildRecoveryEvidenceAuditView(audit, tasks)
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
        <List
          size="small"
          dataSource={tasks.slice(0, 40)}
          locale={{ emptyText: '暂无修复任务' }}
          renderItem={(task: any, taskIndex: number) => {
            const sourceFocused = Boolean(focusedTaskSource && recoveryEvidenceTaskSourceMeta(task).source === focusedTaskSource)
            const focused = focusedTaskIndex === taskIndex || sourceFocused
            return (
              <List.Item
                style={focused ? { border: '1px solid #a855f7', borderRadius: 6, paddingInline: 8, background: '#faf5ff' } : undefined}
              actions={[
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
                    <RecoveryEvidenceReviewPreview task={task} />
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
}: {
  open: boolean
  activeTasks: WorkspaceActiveTask[]
  runRecords: any[]
  productionTasks?: any | null
  knowledgeIngestJobs: any[]
  loading: boolean
  knowledgeJobsLoading: boolean
  onClose: () => void
  onRefresh: () => void
  onRefreshKnowledgeJobs: () => void
  onPauseKnowledgeJob: (jobId: string) => void
  onResumeKnowledgeJob: (jobId: string) => void
  onCancelKnowledgeJob: (jobId: string) => void
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
  onSelectChapter?: (chapterId: number) => void
  onOpenChapterEditor?: (chapterId: number) => void
  onStartRepairTaskRevision?: (task: any, run: any, taskIndex: number) => void
  onExecuteTypedRepairTask?: (task: any, run: any, taskIndex: number) => void
  onRecheckRepairTask?: (task: any, run: any, taskIndex: number) => void
  onUpdateRepairTaskStatus?: (task: any, run: any, status: string, taskIndex: number) => void
  onBulkUpdateRepairTaskStatus?: (items: any[], status: string) => void
  onGenerateRepairAuditSummary?: (run: any) => void
}) {
  const [detailRun, setDetailRun] = useState<any | null>(null)
  const [detailKnowledgeJob, setDetailKnowledgeJob] = useState<any | null>(null)
  const sortedRuns = useMemo(() => (
    [...runRecords].sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  ), [runRecords])
  const sortedKnowledgeJobs = useMemo(() => (
    [...knowledgeIngestJobs].sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))
  ), [knowledgeIngestJobs])
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
                    actions={[
                      item.task?.chapter_id && onSelectChapter ? <Button key="select" size="small" type="link" onClick={() => onSelectChapter(Number(item.task.chapter_id))}>定位</Button> : null,
                      item.task?.chapter_id && onRecheckRepairTask ? <Button key="recheck" size="small" type="link" onClick={() => onRecheckRepairTask(item.task, item.run, item.taskIndex)}>复检收敛</Button> : null,
                      onUpdateRepairTaskStatus ? <Button key="resolve" size="small" type="link" onClick={() => onUpdateRepairTaskStatus(item.task, item.run, 'resolved', item.taskIndex)}>确认通过</Button> : null,
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      title={(
                        <Space wrap>
                          <Tag color="gold" bordered={false}>需复查</Tag>
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
                onSelectChapter={(chapterId) => {
                  setDetailRun(null)
                  onSelectChapter?.(chapterId)
                }}
                onOpenChapterEditor={(chapterId) => {
                  setDetailRun(null)
                  onOpenChapterEditor?.(chapterId)
                }}
                onStartRepairTaskRevision={(task, run, taskIndex) => {
                  setDetailRun(null)
                  onStartRepairTaskRevision?.(task, run, taskIndex)
                }}
                onExecuteTypedRepairTask={(task, run, taskIndex) => {
                  setDetailRun(null)
                  onExecuteTypedRepairTask?.(task, run, taskIndex)
                }}
                onRecheckRepairTask={(task, run, taskIndex) => {
                  setDetailRun(null)
                  onRecheckRepairTask?.(task, run, taskIndex)
                }}
                onUpdateRepairTaskStatus={(task, run, status, taskIndex) => {
                  setDetailRun(null)
                  onUpdateRepairTaskStatus?.(task, run, status, taskIndex)
                }}
                onGenerateRepairAuditSummary={(run) => {
                  setDetailRun(null)
                  onGenerateRepairAuditSummary?.(run)
                }}
              />
            )}
            {detailRun.run_type === 'longform_production_repair' && (
              <RepairTaskRunSummary
                run={detailRun}
                onSelectChapter={(chapterId) => {
                  setDetailRun(null)
                  onSelectChapter?.(chapterId)
                }}
                onOpenChapterEditor={(chapterId) => {
                  setDetailRun(null)
                  onOpenChapterEditor?.(chapterId)
                }}
                onStartRepairTaskRevision={(task, run, taskIndex) => {
                  setDetailRun(null)
                  onStartRepairTaskRevision?.(task, run, taskIndex)
                }}
                onExecuteTypedRepairTask={(task, run, taskIndex) => {
                  setDetailRun(null)
                  onExecuteTypedRepairTask?.(task, run, taskIndex)
                }}
                onRecheckRepairTask={(task, run, taskIndex) => {
                  setDetailRun(null)
                  onRecheckRepairTask?.(task, run, taskIndex)
                }}
                onUpdateRepairTaskStatus={(task, run, status, taskIndex) => {
                  setDetailRun(null)
                  onUpdateRepairTaskStatus?.(task, run, status, taskIndex)
                }}
                onGenerateRepairAuditSummary={(run) => {
                  setDetailRun(null)
                  onGenerateRepairAuditSummary?.(run)
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
