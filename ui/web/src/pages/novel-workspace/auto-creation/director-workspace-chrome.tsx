import React from 'react'
import { Button, Tag, Tooltip } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import type {
  AutoCreationContractStatus,
  AutoCreationDirectorAction,
  AutoCreationDirectorModel,
  AutoCreationPipelineStatus,
} from '../autoCreationDirectorModel'

export function statusColor(status: AutoCreationDirectorModel['status']) {
  if (status === 'running') return 'blue'
  if (status === 'ready') return 'green'
  if (status === 'needs_acceptance') return 'purple'
  if (status === 'needs_governance') return 'gold'
  return 'red'
}

export function pipelineColor(status: AutoCreationPipelineStatus) {
  if (status === 'done') return '#16a34a'
  if (status === 'active') return '#1677ff'
  if (status === 'blocked') return '#dc2626'
  if (status === 'warning') return '#d97706'
  return '#94a3b8'
}

export function pipelineIcon(status: AutoCreationPipelineStatus) {
  if (status === 'done') return <CheckCircleOutlined />
  if (status === 'active') return <LoadingOutlined />
  if (status === 'blocked') return <ExclamationCircleOutlined />
  if (status === 'warning') return <ExclamationCircleOutlined />
  return <ClockCircleOutlined />
}

export function contractColor(status: AutoCreationContractStatus) {
  if (status === 'ok') return 'green'
  if (status === 'block') return 'red'
  return 'gold'
}

export function contractLabel(status: AutoCreationContractStatus) {
  if (status === 'ok') return '达标'
  if (status === 'block') return '阻塞'
  return '需关注'
}

export function rhythmColor(status: string) {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'blocked' || status === 'block') return 'red'
  return 'gold'
}

export function rhythmLabel(status: string) {
  if (status === 'ready' || status === 'ok') return '稳定'
  if (status === 'blocked' || status === 'block') return '阻塞'
  return '需治理'
}

export function batchColor(status: AutoCreationDirectorModel['batchGuardrail']['status']) {
  if (status === 'ready') return 'green'
  if (status === 'caution') return 'gold'
  return 'red'
}

export function batchSignalLabel(status: string) {
  if (status === 'ok') return '通过'
  if (status === 'warn') return '谨慎'
  return '阻塞'
}

export function safeBatchExpansionFeedbackColor(status: string) {
  if (status === 'recovered' || status === 'passed') return 'green'
  if (status === 'rollback_to_single_chapter') return 'red'
  if (status === 'rollback_to_small_batch') return 'gold'
  return 'blue'
}

export function safeBatchExpansionFeedbackLabel(status: string) {
  if (status === 'recovered' || status === 'passed') return '扩批热区已清'
  if (status === 'rollback_to_single_chapter' || status === 'rollback_to_small_batch') return '扩批热区待修'
  return '扩批反馈'
}

export function batchReviewColor(status: AutoCreationDirectorModel['batchReviewQueue']['status']) {
  if (status === 'ok' || status === 'done') return 'green'
  if (status === 'warn' || status === 'risk') return 'gold'
  return 'default'
}

export function batchCompletionColor(status: AutoCreationDirectorModel['batchReviewQueue']['completionDashboard']['status']) {
  if (status === 'ready_next') return 'green'
  if (status === 'needs_repair') return 'gold'
  if (status === 'in_progress') return 'blue'
  return 'default'
}

export function batchCompletionMetricColor(status: AutoCreationDirectorModel['batchReviewQueue']['completionDashboard']['metrics'][number]['status']) {
  if (status === 'ok') return 'green'
  if (status === 'block') return 'red'
  return 'gold'
}

export function productionLicenseColor(status: AutoCreationDirectorModel['productionLicense']['status']) {
  if (status === 'batch_allowed') return 'green'
  if (status === 'single_chapter') return 'blue'
  return 'red'
}

export function cockpitStatusColor(status: string) {
  if (status === 'ok' || status === 'done') return 'green'
  if (status === 'block') return 'red'
  if (status === 'current') return 'blue'
  if (status === 'warn') return 'gold'
  return 'default'
}

export function cockpitStatusLabel(status: string) {
  if (status === 'ok') return '稳'
  if (status === 'block') return '阻'
  return '警'
}

export function cockpitChainLabel(status: string) {
  if (status === 'done') return '完成'
  if (status === 'current') return '当前'
  if (status === 'block') return '阻塞'
  if (status === 'warn') return '待修'
  return '等待'
}

export function battleDeskColor(status: string) {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'blocked' || status === 'block') return 'red'
  return 'gold'
}

export function battleLaneLabel(key: AutoCreationDirectorModel['longformBattleDesk']['lanes'][number]['key']) {
  const labels = {
    story_core: '核心守恒',
    reader_pull: '读者拉力',
    storyline: '剧情线调度',
    volume_beat: '卷级爆点',
    innovation_ip: '创新/IP场面',
    production_fuel: '生产燃料',
  }
  return labels[key]
}

export function dailyStepStatusLabel(status: AutoCreationPipelineStatus) {
  if (status === 'done') return '完成'
  if (status === 'active') return '当前'
  if (status === 'blocked') return '阻塞'
  if (status === 'warning') return '待治理'
  return '等待'
}

export function scriptRoomStatusLabel(status: AutoCreationDirectorModel['rollingScriptRoom']['status']) {
  if (status === 'ready') return '已对齐'
  if (status === 'blocked') return '阻塞'
  return '待校准'
}

export const CREATION_PIPELINE_STAGE_HINTS = ['全书核心', '长线规划', '设定资产', '章节开写', '交稿验收', '连载发布']

export function formatWords(value: number) {
  if (!value) return '0'
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return String(value)
}

export function safeBatchChapterNos(value: any) {
  return (Array.isArray(value) ? value : [])
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => Number.isFinite(chapterNo) && chapterNo > 0)
}

export function safeBatchChapterNosText(chapterNos: number[]) {
  if (!chapterNos.length) return ''
  return `${chapterNos.slice(0, 6).map(chapterNo => `第${chapterNo}章`).join('、')}${chapterNos.length > 6 ? `等${chapterNos.length}章` : ''}`
}

export type ActionExecutionKind = 'model' | 'background' | 'task' | 'panel' | 'local'

export const ACTION_EXECUTION_LABELS: Record<ActionExecutionKind, string> = {
  model: '调用大模型',
  background: '后台执行',
  task: '创建任务',
  panel: '打开面板',
  local: '本地计算',
}

export function actionExecutionMeta(action: AutoCreationDirectorAction): { kind: ActionExecutionKind; label: string } {
  const key = String(action.key)
  if (key === 'auto_repair_blockers') return { kind: 'background', label: ACTION_EXECUTION_LABELS.background }
  if (key === 'start_safe_batch_generation') return { kind: 'background', label: ACTION_EXECUTION_LABELS.background }
  if (action.modelCall) return { kind: 'model', label: ACTION_EXECUTION_LABELS.model }
  if (key.startsWith('create_') || key.includes('repair') || key.includes('_queue')) {
    return { kind: 'task', label: ACTION_EXECUTION_LABELS.task }
  }
  if (key.startsWith('open_') || key.startsWith('enter_') || key === 'select_model') {
    return { kind: 'panel', label: ACTION_EXECUTION_LABELS.panel }
  }
  return { kind: 'local', label: ACTION_EXECUTION_LABELS.local }
}

export function actionModelHint(action: AutoCreationDirectorAction) {
  return action.modelCall ? '会调用大模型' : '不调用大模型'
}

export function buildActionTooltip(action: AutoCreationDirectorAction) {
  const meta = actionExecutionMeta(action)
  return `${meta.label}（${actionModelHint(action)}）：${action.description || action.label}`
}

export function staticActionTooltip(kind: ActionExecutionKind, description: string, modelCall = false) {
  return `${ACTION_EXECUTION_LABELS[kind]}（${modelCall ? '会调用大模型' : '不调用大模型'}）：${description}`
}

export function ActionKindTag({ action }: { action: AutoCreationDirectorAction }) {
  const meta = actionExecutionMeta(action)
  return (
    <span className={`auto-director-action-kind auto-director-action-kind-${meta.kind}`}>
      {meta.label}
    </span>
  )
}

export function StaticActionKindTag({ kind }: { kind: ActionExecutionKind }) {
  return (
    <span className={`auto-director-action-kind auto-director-action-kind-${kind}`}>
      {ACTION_EXECUTION_LABELS[kind]}
    </span>
  )
}

export function actionClass(action: AutoCreationDirectorAction, primary = false) {
  const meta = actionExecutionMeta(action)
  return [
    primary ? 'auto-director-primary-action' : 'auto-director-secondary-action',
    action.modelCall ? 'auto-director-model-action' : '',
    `auto-director-action-${meta.kind}`,
  ].filter(Boolean).join(' ')
}

export function actionDisabledState(action: AutoCreationDirectorAction, loadingActionKey?: string, disabled = false) {
  const key = String(action.key)
  const loading = loadingActionKey === key
  const busyElsewhere = Boolean(loadingActionKey && !loading)
  return { key, loading, disabled: disabled || Boolean(action.disabled) || busyElsewhere }
}

export function ActionButton({
  action,
  primary,
  loadingActionKey,
  onAction,
}: {
  action: AutoCreationDirectorAction
  primary?: boolean
  loadingActionKey?: string
  onAction: (action: AutoCreationDirectorAction) => void
}) {
  const { loading, disabled } = actionDisabledState(action, loadingActionKey)
  const button = (
    <Button
      type={primary ? 'primary' : 'default'}
      className={actionClass(action, primary)}
      icon={action.modelCall ? <ThunderboltOutlined /> : undefined}
      loading={loading}
      disabled={disabled}
      aria-label={`${action.label}，${buildActionTooltip(action)}`}
      onClick={() => onAction(action)}
    >
      <span className="auto-director-action-content">
        <span>{action.label}</span>
        <ActionKindTag action={action} />
      </span>
    </Button>
  )
  return <Tooltip title={buildActionTooltip(action)}>{button}</Tooltip>
}

export function ActionSurfaceButton({
  action,
  className,
  loadingActionKey,
  disabled,
  onAction,
  children,
}: {
  action: AutoCreationDirectorAction
  className: string
  loadingActionKey?: string
  disabled?: boolean
  onAction: (action: AutoCreationDirectorAction) => void
  children: React.ReactNode
}) {
  const state = actionDisabledState(action, loadingActionKey, disabled)
  const meta = actionExecutionMeta(action)
  const button = (
    <button
      type="button"
      className={[
        className,
        action.modelCall ? 'auto-director-model-action' : '',
        `auto-director-action-${meta.kind}`,
        state.loading ? 'is-loading' : '',
      ].filter(Boolean).join(' ')}
      disabled={state.disabled}
      aria-label={`${action.label}，${buildActionTooltip(action)}`}
      onClick={() => onAction(action)}
    >
      {children}
      <ActionKindTag action={action} />
    </button>
  )
  return (
    <Tooltip title={buildActionTooltip(action)}>
      <span className="auto-director-action-surface-wrap">{button}</span>
    </Tooltip>
  )
}

export function HintedSurfaceButton({
  className,
  tooltip,
  kind = 'panel',
  disabled,
  onClick,
  children,
}: {
  className: string
  tooltip: string
  kind?: ActionExecutionKind
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  const button = (
    <button
      type="button"
      className={[className, `auto-director-action-${kind}`].filter(Boolean).join(' ')}
      disabled={disabled}
      aria-label={tooltip}
      onClick={onClick}
    >
      {children}
      <StaticActionKindTag kind={kind} />
    </button>
  )
  return (
    <Tooltip title={tooltip}>
      <span className="auto-director-action-surface-wrap">{button}</span>
    </Tooltip>
  )
}

