import React from 'react'
import { Alert, Button, Space, Spin, Tag, Typography } from 'antd'
import {
  isActiveEditorRevisionTask,
  type EditorRevisionTask,
} from '../editorRevisionTasks'
import { runTypeLabel } from './drawer-model-helpers-basics'

const { Text } = Typography

const EDITOR_REVISION_PHASE_LABELS: Record<string, string> = {
  generate_candidate: '生成候选',
  admit_candidate: '安全检查',
  persist_chapter: '保存版本',
  post_quality: '当前章质检',
  sync_current_story_state: '当前章状态更新',
  record_continuity_warning: '记录连续性提示',
  completed: '完成',
}

const EDITOR_REVISION_STATUS_LABELS: Record<string, string> = {
  queued: '排队中',
  running: '运行中',
  cancel_requested: '取消中',
  completed: '已完成',
  failed: '失败',
  canceled: '已取消',
}

const EDITOR_REVISION_PHASE_STATE_LABELS: Record<string, string> = {
  pending: '待处理',
  running: '进行中',
  completed: '已完成',
  failed: '失败',
  skipped: '已跳过',
}

type EditorRevisionRunWithTimes = EditorRevisionTask & {
  created_at?: string
}

export type EditorRevisionRunSummaryProps = {
  run: EditorRevisionTask
  diagnostics: Record<string, unknown> | null
  diagnosticsLoading: boolean
  onCancel: () => void
  onRetry: () => void
  onContinue: () => void
  onOpenChapter: (chapterId: number) => void
  onLoadDiagnostics: () => void
}

export function editorRevisionPhaseLabel(phase: string) {
  return EDITOR_REVISION_PHASE_LABELS[String(phase || '')] || '处理中'
}

function editorRevisionStatusLabel(status: string) {
  return EDITOR_REVISION_STATUS_LABELS[String(status || '')] || '未知状态'
}

function editorRevisionStatusColor(status: string) {
  if (status === 'completed') return 'green'
  if (status === 'failed') return 'red'
  if (status === 'queued' || status === 'running' || status === 'cancel_requested') return 'blue'
  return undefined
}

function formatTaskTime(value?: string) {
  const time = Date.parse(String(value || ''))
  if (!Number.isFinite(time)) return String(value || '-')
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

function formatElapsed(createdAt?: string, updatedAt?: string) {
  const started = Date.parse(String(createdAt || ''))
  const updated = Date.parse(String(updatedAt || ''))
  if (!Number.isFinite(started) || !Number.isFinite(updated) || updated < started) return '-'
  const seconds = Math.max(0, Math.floor((updated - started) / 1000))
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}分${remainingSeconds ? `${remainingSeconds}秒` : ''}`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}小时${remainingMinutes ? `${remainingMinutes}分` : ''}`
}

function currentPhaseStateText(run: EditorRevisionTask) {
  const phaseState = run.phases?.[run.phase] as Record<string, unknown> | undefined
  if (!phaseState) return ''
  const state = EDITOR_REVISION_PHASE_STATE_LABELS[String(phaseState.status || '')] || ''
  const attempt = Number(phaseState.attempt || 0)
  return [state, attempt > 0 ? `第 ${attempt} 次` : ''].filter(Boolean).join(' · ')
}

export function EditorRevisionRunSummary({
  run,
  diagnostics,
  diagnosticsLoading,
  onCancel,
  onRetry,
  onContinue,
  onOpenChapter,
  onLoadDiagnostics,
}: EditorRevisionRunSummaryProps) {
  const runWithTimes = run as EditorRevisionRunWithTimes
  const active = isActiveEditorRevisionTask(run)
  const phaseLabel = editorRevisionPhaseLabel(run.phase)
  const phaseStateText = currentPhaseStateText(run)

  return (
    <div className="task-run-card task-editor-revision-run-card" style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start" wrap>
          <Space direction="vertical" size={3} style={{ minWidth: 0 }}>
            <Space wrap size={[6, 4]}>
              <Text strong>{runTypeLabel(run.run_type)}</Text>
              <Tag color={editorRevisionStatusColor(run.status)} bordered={false}>{editorRevisionStatusLabel(run.status)}</Tag>
              <Text>第{run.chapter_no}章《{run.chapter_title || '未命名'}》</Text>
            </Space>
            <Space wrap size={[6, 4]}>
              {active ? <Spin size="small" /> : null}
              <Text strong>{phaseLabel}</Text>
              {phaseStateText ? <Text type="secondary">{phaseStateText}</Text> : null}
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              耗时 {formatElapsed(runWithTimes.created_at, run.updated_at)} · 更新 {formatTaskTime(run.updated_at)}
            </Text>
          </Space>
        </Space>

        {run.warnings.map((warning, index) => (
          <Alert
            key={`${warning.code}-${index}`}
            type="warning"
            showIcon
            message={warning.message}
          />
        ))}
        {run.error ? <Alert type="error" showIcon message={run.error.message} /> : null}

        <Space wrap size={[6, 6]}>
          <Button size="small" onClick={() => onOpenChapter(run.chapter_id)}>打开章节</Button>
          {run.can_cancel ? <Button size="small" danger onClick={onCancel}>取消修订</Button> : null}
          {run.can_retry ? <Button size="small" type="primary" onClick={onRetry}>重试</Button> : null}
          {run.can_continue ? <Button size="small" type="primary" onClick={onContinue}>继续后处理</Button> : null}
          <Button size="small" type="link" loading={diagnosticsLoading} onClick={onLoadDiagnostics}>查看诊断</Button>
        </Space>

        {diagnostics ? (
          <pre style={{ margin: 0, padding: 10, maxHeight: 240, overflow: 'auto', borderRadius: 6, background: '#f8fafc', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
        ) : null}
      </Space>
    </div>
  )
}
