import React from 'react'
import { Alert, Button, Card, Progress, Space, Tag, Typography } from 'antd'
import { PauseCircleOutlined } from '@ant-design/icons'
import {
  buildChapterAdmissionWarningCards,
  parseJsonValue,
  type TaskRunCardModel,
} from './chapter-group'
import {
  runTypeLabel,
  safeJsonPreview,
} from './drawer-model'

const { Text, Paragraph } = Typography

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
              onClick={onPrimaryAction}>
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
