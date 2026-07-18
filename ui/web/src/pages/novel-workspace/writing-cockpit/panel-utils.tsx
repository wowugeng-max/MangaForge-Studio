import React from 'react'
import { Alert, Button, Space } from 'antd'
import {
  AuditOutlined,
  BarChartOutlined,
  BookOutlined,
  CheckCircleOutlined,
  EditOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  HistoryOutlined,
  PlayCircleOutlined,
  RetweetOutlined,
  RocketOutlined,
  SafetyOutlined,
  TeamOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import type { WritingCockpitActionKey, WritingCockpitModel, WritingCockpitRole } from '../writingCockpitModel'

export function roleIcon(role: WritingCockpitRole) {
  if (role === 'chief_editor') return <BookOutlined />
  if (role === 'episode_planner') return <FileSearchOutlined />
  if (role === 'draft_writer') return <EditOutlined />
  if (role === 'revision_editor') return <FileTextOutlined />
  if (role === 'continuity_auditor') return <SafetyOutlined />
  return <BarChartOutlined />
}

export function actionIcon(key: WritingCockpitActionKey, role: WritingCockpitRole) {
  if (key === 'write_draft') return <PlayCircleOutlined />
  if (key === 'repair_materials' || key === 'fix_continuity') return <ToolOutlined />
  if (key === 'refresh_current_quality') return <FileSearchOutlined />
  if (key === 'create_editor_report') return <AuditOutlined />
  if (key === 'open_editor_reports') return <AuditOutlined />
  if (key === 'apply_editor_revision') return <RetweetOutlined />
  if (key === 'sync_story_state') return <SafetyOutlined />
  if (key === 'accept_chapter_and_continue') return <CheckCircleOutlined />
  if (key === 'open_version_history') return <HistoryOutlined />
  return roleIcon(role)
}

export function checkColor(status: string) {
  if (status === 'pass') return 'green'
  if (status === 'warning') return 'gold'
  if (status === 'blocker') return 'red'
  return 'default'
}

export function readinessPercent(model: WritingCockpitModel) {
  const checks = model.readiness.checks
  if (!checks.length) return 0
  const passed = checks.filter(check => check.status === 'pass').length
  return Math.round((passed / checks.length) * 100)
}

export function readinessStatus(model: WritingCockpitModel) {
  if (model.readiness.blockers.length > 0) return 'exception'
  if (model.readiness.warnings.length > 0) return 'active'
  return 'success'
}

export function plannerColor(readiness: string) {
  if (readiness === 'ready') return 'green'
  if (readiness === 'needs_scene_plan') return 'blue'
  if (readiness === 'needs_context') return 'gold'
  return 'red'
}

export function acceptanceColor(status: string) {
  if (status === 'ready_to_accept' || status === 'delivered') return 'green'
  if (status === 'needs_state_sync') return 'cyan'
  if (status === 'needs_recheck') return 'blue'
  if (status === 'needs_revision') return 'red'
  if (status === 'needs_quality_check') return 'gold'
  return 'default'
}

export function qualityScoreText(value: number | null) {
  return value === null ? '未复检' : `${value} 分`
}

export function compactPlanValue(value: string, fallback: string) {
  return value && value.trim() ? value : fallback
}

export function continuityStageLabel(stage: string) {
  if (stage === 'opening') return '开篇'
  if (stage === 'ending') return '章末'
  return '中段'
}

const wrapTextStyle: React.CSSProperties = {
  display: 'block',
  minWidth: 0,
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
}

export function blockerAlert(model: WritingCockpitModel, loading: boolean, onAction: (key: WritingCockpitActionKey) => void) {
  const blocker = model.readiness.blockers[0]
  if (!blocker) return null
  const actionLabel = `处理：${blocker.label}`

  return (
    <Alert
      type="warning"
      showIcon
      icon={<ExclamationCircleOutlined />}
      message={blocker.label}
      description={blocker.detail}
      action={
        <Button
          size="small"
          disabled={loading}
          title={actionLabel}
          aria-label={actionLabel}
          onClick={() => onAction(blocker.actionKey)}
          style={{ whiteSpace: 'normal', height: 'auto', lineHeight: 1.25 }}
        >
          处理
        </Button>
      }
    />
  )
}

export function compactNumber(value: number) {
  return Number(value || 0).toLocaleString('zh-CN')
}

export function workflowStageColor(status: string) {
  if (status === 'ready') return 'green'
  if (status === 'blocked') return 'red'
  if (status === 'needs_action') return 'gold'
  return 'default'
}

export function workflowStageStatusLabel(status: string) {
  if (status === 'ready') return '已就绪'
  if (status === 'blocked') return '阻塞'
  if (status === 'needs_action') return '待处理'
  return '等待'
}
