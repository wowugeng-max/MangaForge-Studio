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

function taskRunTimeValue(...values: any[]) {
  for (const value of values) {
    const raw = String(value || '').trim()
    if (!raw) continue
    const time = Date.parse(raw)
    if (!Number.isFinite(time)) return raw
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(time)).replace(/\//g, '-')
  }
  return ''
}

function taskRunLifecycle(status: any): TaskRunCardModel['lifecycle'] {
  const normalized = String(status || '').toLowerCase()
  if (['completed', 'success', 'ok', 'done', 'closed', 'resolved'].includes(normalized)) return { key: normalized || 'completed', label: '已完成', color: 'green' }
  if (['failed', 'error'].includes(normalized)) return { key: normalized, label: '失败', color: 'red' }
  if (['running', 'in_progress', 'processing'].includes(normalized)) return { key: normalized, label: '运行中', color: 'blue' }
  if (['queued', 'pending'].includes(normalized)) return { key: normalized, label: '排队中', color: 'blue' }
  if (normalized === 'ready') return { key: normalized, label: '待启动', color: 'default' }
  if (normalized === 'paused') return { key: normalized, label: '已暂停', color: 'gold' }
  if (['needs_approval', 'needs_confirmation'].includes(normalized)) return { key: normalized, label: '待确认', color: 'gold' }
  if (['canceled', 'cancelled'].includes(normalized)) return { key: normalized, label: '已取消', color: 'default' }
  return { key: normalized || 'unknown', label: normalized || '未知', color: 'default' }
}

function taskRunPayloads(run: any) {
  return {
    input: parseJsonValue(run?.input_ref || run?.inputRef) || run?.input || {},
    output: parseJsonValue(run?.output_ref || run?.outputRef) || run?.output || run?.payload || {},
  }
}

function taskRunDirectorPayload(run: any) {
  const candidates = [
    parseJsonValue(run?.output_ref || run?.outputRef),
    run?.output,
    run?.payload,
    parseJsonValue(run?.input_ref || run?.inputRef),
    run?.input,
  ].filter(Boolean)
  for (const candidate of candidates) {
    const direct = candidate?.oh_story_director || candidate?.ohStoryDirector
    if (direct) return direct
    const contextPackage = candidate?.contextPackage || candidate?.context_package
    const nested = contextPackage?.oh_story_director || contextPackage?.ohStoryDirector
    if (nested) return nested
  }
  return null
}

function taskRunDirectorStage(run: any): TaskRunCardModel['directorStage'] {
  const director = taskRunDirectorPayload(run)
  const stage = String(director?.stage || '').trim()
  if (!stage) return undefined
  const labels: Record<string, string> = {
    project_creation: '项目创建',
    pre_draft: '写前准备',
    drafting: '正文生成',
    post_draft: '写后诊断',
    handoff: '章节交接',
  }
  return { key: stage, label: labels[stage] || stage, color: 'blue' }
}

function taskRunBlockingState(run: any): TaskRunCardModel['blocking'] {
  const director = taskRunDirectorPayload(run)
  if (!director) return { key: 'non_blocking', label: '不阻塞', color: 'default' }
  const requiredRepairs = Array.isArray(director.required_repairs)
    ? director.required_repairs
    : Array.isArray(director.requiredRepairs)
      ? director.requiredRepairs
      : []
  const hasBlockingRepair = requiredRepairs.some((repair: any) => repair?.blocking !== false)
  const readiness = String(director.readiness || '').toLowerCase()
  if (hasBlockingRepair || ['blocked', 'needs_repair', 'needs_user_confirmation'].includes(readiness)) {
    return { key: 'blocking', label: '阻塞进度', color: 'red' }
  }
  return { key: 'non_blocking', label: '不阻塞', color: 'default' }
}

function taskRunExecutionMode(run: any): TaskRunCardModel['execution'] {
  const { input, output } = taskRunPayloads(run)
  const source = [
    run?.source,
    run?.source_mode,
    run?.sourceMode,
    input?.source,
    input?.source_mode,
    input?.sourceMode,
    output?.source,
    output?.report?.source,
  ].map(item => String(item || '').toLowerCase()).join(' ')
  const unattended = Boolean(
    run?.unattended
    || run?.is_auto
    || run?.isAuto
    || input?.unattended
    || input?.policy?.unattended
    || output?.unattended,
  )
  const runType = String(run?.run_type || '')
  const auto = unattended
    || source.includes('auto_creation')
    || source.includes('unattended')
    || ['batch_generate_prose', 'chapter_group_generation'].includes(runType) && Boolean(input?.unattended || input?.policy?.unattended || input?.target_chapter)
  if (auto) return { key: 'auto', label: '自动运行', color: 'blue' }
  return { key: 'manual', label: ['longform_production_repair', 'first30_retention_repair', 'mechanical_qa_repair'].includes(runType) ? '手工处理' : '手工操作', color: 'default' }
}

function taskRunClosureFromTasks(tasks: any[]) {
  const total = tasks.length
  const failed = tasks.filter((task: any) => ['failed', 'error'].includes(String(task?.task_status ?? task?.status ?? '').toLowerCase())).length
  const needsReview = tasks.filter((task: any) => String(task?.task_status ?? task?.status ?? '').toLowerCase() === 'needs_review').length
  const resolved = tasks.filter((task: any) => ['resolved', 'closed', 'done', 'completed', 'success', 'ok'].includes(String(task?.task_status ?? task?.status ?? '').toLowerCase())).length
  const pending = Math.max(0, total - failed - needsReview - resolved)
  return { total, pending, needsReview, resolved, failed }
}

function taskRunClosure(run: any): TaskRunCardModel['closure'] {
  const { output } = taskRunPayloads(run)
  const tasks = Array.isArray(output.tasks) ? output.tasks : []
  const chapters = Array.isArray(output.chapters) ? output.chapters : []
  const base = tasks.length
    ? taskRunClosureFromTasks(tasks)
    : chapters.length
      ? {
        total: Number(output.total ?? chapters.length) || chapters.length,
        pending: chapters.filter((chapter: any) => ['ready', 'queued', 'running', 'pending', 'needs_approval'].includes(String(chapter?.status || '').toLowerCase())).length,
        needsReview: chapters.filter((chapter: any) => String(chapter?.status || '').toLowerCase() === 'needs_review').length,
        resolved: chapters.filter((chapter: any) => ['success', 'completed', 'ok', 'done'].includes(String(chapter?.status || '').toLowerCase())).length,
        failed: chapters.filter((chapter: any) => ['failed', 'error'].includes(String(chapter?.status || '').toLowerCase())).length,
      }
      : {
        total: Number(output.total || 0) || 0,
        pending: 0,
        needsReview: 0,
        resolved: Number(output.success ?? output.completed ?? 0) || 0,
        failed: Number(output.failed || 0) || (['failed', 'error'].includes(String(run?.status || '').toLowerCase()) ? 1 : 0),
      }
  const summaryParts = [
    base.pending ? `待处理 ${base.pending} 项` : '',
    base.needsReview ? `需复查 ${base.needsReview} 项` : '',
    base.failed ? `失败 ${base.failed} 项` : '',
    base.total ? `已完成 ${base.resolved}/${base.total}` : base.resolved ? `已完成 ${base.resolved}` : '',
  ].filter(Boolean)
  return {
    ...base,
    summary: summaryParts.join('，') || '暂无可处理项',
  }
}

export function buildTaskRunCardModel(run: any, options: {
  canProcessRepairTasks?: boolean
  canResume?: boolean
  canExecute?: boolean
} = {}): TaskRunCardModel {
  const lifecycle = taskRunLifecycle(run?.status)
  const execution = taskRunExecutionMode(run)
  const directorStage = taskRunDirectorStage(run)
  const blocking = taskRunBlockingState(run)
  const closure = taskRunClosure(run)
  const admissionWarnings = buildChapterAdmissionWarningCards(run)
  const explicitProgress = Number(run?.progress)
  const progress = Number.isFinite(explicitProgress)
    ? Math.max(0, Math.min(100, explicitProgress))
    : closure.total > 0
      ? Math.max(0, Math.min(100, Math.round((closure.resolved / closure.total) * 100)))
      : lifecycle.color === 'green' ? 100 : 0
  const primaryAction: TaskRunCardModel['primaryAction'] = (() => {
    if (lifecycle.color === 'red' || closure.failed > 0) return { key: 'view_failure', label: '查看失败' }
    if (options.canProcessRepairTasks || closure.pending > 0 && ['longform_production_repair', 'first30_retention_repair', 'mechanical_qa_repair'].includes(String(run?.run_type || ''))) return { key: 'process_repair', label: '处理下一项' }
    if (closure.needsReview > 0) return { key: 'recheck', label: '复查任务' }
    if (options.canResume) return { key: 'resume', label: '继续' }
    if (options.canExecute) return { key: 'execute', label: '执行' }
    return { key: 'none', label: '' }
  })()
  return {
    title: run?.type_label || runTypeLabel(run?.run_type),
    stepName: String(run?.step_name || run?.stepName || 'step'),
    lifecycle,
    execution,
    directorStage,
    blocking,
    timeline: [
      { key: 'created', label: '创建', value: taskRunTimeValue(run?.created_at, run?.createdAt) || '-' },
      { key: 'started', label: '开始', value: taskRunTimeValue(run?.started_at, run?.startedAt, run?.startedAtMs) || '未开始' },
      { key: 'ended', label: '结束', value: taskRunTimeValue(run?.completed_at, run?.completedAt, run?.finished_at, run?.finishedAt, run?.ended_at, run?.endedAt) || '未结束' },
      { key: 'updated', label: '更新', value: taskRunTimeValue(run?.updated_at, run?.updatedAt, run?.completed_at, run?.completedAt, run?.created_at, run?.createdAt) || '-' },
    ],
    closure,
    progress,
    primaryAction,
    admissionWarnings,
  }
}

function taskRunCardPrimaryActionType(actionKey: TaskRunCardModel['primaryAction']['key']) {
  if (['process_repair', 'recheck', 'resume', 'execute'].includes(actionKey)) return 'primary' as const
  return 'default' as const
}

export function TaskRunCard({
  run,
  model,
  extraTags = null,
  errorText = '',
  recoveryPlan = null,
  onPrimaryAction,
  onDetail,
  onPause,
}: {
  run: any
  model: TaskRunCardModel
  extraTags?: React.ReactNode
  errorText?: string
  recoveryPlan?: any
  onPrimaryAction?: () => void
  onDetail: () => void
  onPause?: () => void
}) {
  return (
    <div className="task-run-card" style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
          <Space direction="vertical" size={4} style={{ minWidth: 0 }}>
            <Space wrap size={[6, 4]}>
              <Tag color={model.lifecycle.color === 'default' ? undefined : model.lifecycle.color} bordered={false}>运行状态：{model.lifecycle.label}</Tag>
              <Tag color={model.execution.color === 'default' ? undefined : model.execution.color} bordered={false}>执行方式：{model.execution.label}</Tag>
              {model.directorStage && (
                <Tag color={model.directorStage.color === 'default' ? undefined : model.directorStage.color} bordered={false}>阶段：{model.directorStage.label}</Tag>
              )}
              <Tag color={model.blocking.color === 'default' ? undefined : model.blocking.color} bordered={false}>状态：{model.blocking.label}</Tag>
              <Text strong>{model.title}</Text>
              <Tag bordered={false}>{model.stepName}</Tag>
              {extraTags}
            </Space>
            <Space wrap size={[6, 4]} className="task-run-card-timeline">
              {model.timeline.map(item => (
                <Text key={item.key} type="secondary" style={{ fontSize: 12 }}>
                  {item.label}：{item.value}
                </Text>
              ))}
            </Space>
          </Space>
          <Button size="small" type="link" onClick={onDetail}>详情</Button>
        </Space>
        <Progress percent={Math.max(0, Math.min(100, Number(model.progress || 0)))} size="small" />
        <Space wrap size={[6, 4]}>
          <Tag color={model.closure.pending ? 'gold' : 'default'} bordered={false}>待处理 {model.closure.pending}</Tag>
          <Tag color={model.closure.needsReview ? 'gold' : 'default'} bordered={false}>需复查 {model.closure.needsReview}</Tag>
          <Tag color={model.closure.resolved ? 'green' : 'default'} bordered={false}>已完成 {model.closure.resolved}/{model.closure.total || 0}</Tag>
          <Tag color={model.closure.failed ? 'red' : 'default'} bordered={false}>失败 {model.closure.failed}</Tag>
        </Space>
        <Text type="secondary" style={{ fontSize: 12 }}>闭环状态：{model.closure.summary}</Text>
        {model.admissionWarnings.map(warning => (
          <Alert
            key={warning.source}
            type="warning"
            showIcon
            message={warning.title}
            description={`${warning.chapterNos.length ? `第${warning.chapterNos.join('、')}章：` : ''}${warning.messages.join('；')}`}
          />
        ))}
        {errorText && <Text type="danger" style={{ fontSize: 12 }}>{errorText}</Text>}
        {recoveryPlan && (
          <Paragraph style={{ marginBottom: 0, fontSize: 12 }} ellipsis={{ rows: 2, expandable: true }}>
            恢复方案：{safeJsonPreview(recoveryPlan)}
          </Paragraph>
        )}
        <Space wrap>
          {model.primaryAction.key !== 'none' && onPrimaryAction && (
            <Button
              size="small"
              type={taskRunCardPrimaryActionType(model.primaryAction.key)}
              onClick={onPrimaryAction}
            >
              {model.primaryAction.label}
            </Button>
          )}
          {onPause && ['running', 'queued'].includes(String(run?.status || '')) && (
            <Button size="small" icon={<PauseCircleOutlined />} onClick={onPause}>暂停</Button>
          )}
        </Space>
      </Space>
    </div>
  )
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

function isSingleChapterRecoveryEvidenceTask(task: any) {
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

export function compactAuditList(values: any[], limit = 8) {
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

export function recoveryEvidenceTaskSourceMeta(task: any) {
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

export function recoveryEvidenceRegovernanceQueueOfTask(task: any) {
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

type RepairTaskTagMeta = {
  key: string
  label: string
  color: string
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

export function repairTaskFocusRequirementMatches(requirementKey: string, task: any) {
  if (!requirementKey) return true
  if (requirementKey === 'default_lane_template') return buildDefaultLaneRepairTaskTags(task).length > 0
  return defaultLaneFailedRequirementsOfTask(task).some(item => item.key === requirementKey)
}

export function buildDefaultLaneFocusObligationStatuses(
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

export function buildDefaultLaneProductionRelapseClosure(
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

export function compactEvidenceText(value: any, maxLength?: number) {
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

export function BatchPlanReviewPreview({ task }: { task: any }) {
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

export function RecoveryEvidenceReviewPreview({
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

export function RecoveryEvidenceRegovernancePreview({ task }: { task: any }) {
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

export function DeliveryRiskReviewPreview({ task }: { task: any }) {
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

export function NextChapterQualityPlanPreview({ task }: { task: any }) {
  const preview = buildNextChapterQualityPlanPreview(task)
  if (!preview) return null
  const rows = [
    ['质量目标', preview.qualityFocus],
    ['开篇动作', preview.openingActions],
    ['中段动作', preview.middleActions],
    ['章末动作', preview.endingActions],
    ['禁用重复', preview.avoidRepetition],
    ['证据依据', preview.evidenceBasis],
  ].filter(([, values]) => Array.isArray(values) && values.length > 0) as [string, string[]][]
  return (
    <div style={{ marginTop: 4, padding: 8, border: '1px solid #fde68a', borderRadius: 6, background: '#fffbeb' }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <Space wrap size={[4, 2]}>
          <Text strong style={{ fontSize: 12 }}>{preview.label}</Text>
          <Tag color="gold" bordered={false}>下一章</Tag>
        </Space>
        {preview.missingReason && (
          <Text type="danger" style={{ fontSize: 12 }}>{preview.missingReason}</Text>
        )}
        {rows.map(([label, values]) => (
          <Text key={label} type="secondary" style={{ fontSize: 12 }}>
            {label}：{values.slice(0, 3).join('；')}
          </Text>
        ))}
      </Space>
    </div>
  )
}

export function SafeBatchExpansionSegmentPreview({ task }: { task: any }) {
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

export function repairTaskStatusTag(status?: string) {
  if (status === 'resolved') return <Tag color="green" bordered={false}>已处理</Tag>
  if (status === 'needs_review') return <Tag color="gold" bordered={false}>需复查</Tag>
  if (status === 'in_progress') return <Tag color="blue" bordered={false}>处理中</Tag>
  return <Tag bordered={false}>待处理</Tag>
}

export * from './drawer-safe-batch'
export * from './drawer-snapshots'
