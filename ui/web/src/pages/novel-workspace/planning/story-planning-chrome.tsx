import React from 'react'
import { Button, Space, Tag, Typography } from 'antd'
import type { PlanningActionKey, PlanningVolumeTreeNode, PlanningWorkspaceModel } from '../planningWorkspaceModel'

const { Text } = Typography
export function healthColor(status: PlanningWorkspaceModel['topStatus']['longformHealth']['status']) {
  if (status === 'healthy') return 'green'
  if (status === 'drifting') return 'gold'
  return 'red'
}

export function issueColor(severity: 'critical' | 'warning') {
  if (severity === 'critical') return 'red'
  if (severity === 'warning') return 'gold'
  return 'blue'
}

export function issueIconColor(severity: 'critical' | 'warning') {
  const color = issueColor(severity)
  if (color === 'red') return '#cf1322'
  if (color === 'gold') return '#d48806'
  return '#1677ff'
}

export function retentionColor(scoreOrStatus: number | string | null | undefined) {
  if (typeof scoreOrStatus === 'string') {
    if (scoreOrStatus === 'ready' || scoreOrStatus === 'ok') return 'green'
    if (scoreOrStatus === 'blocked') return 'red'
    if (scoreOrStatus === 'missing' || scoreOrStatus === 'stale') return 'gold'
    return 'gold'
  }
  const score = Number(scoreOrStatus || 0)
  if (score >= 80) return 'green'
  if (score < 65) return 'red'
  return 'gold'
}

export function retentionRiskColor(level: 'ok' | 'medium' | 'high') {
  if (level === 'ok') return 'green'
  if (level === 'high') return 'red'
  return 'gold'
}

export function storylineStatusColor(status: PlanningWorkspaceModel['storylineBoard']['status']) {
  if (status === 'ready') return 'green'
  if (status === 'missing') return 'gold'
  return 'red'
}

export function characterArcBoardColor(status: PlanningWorkspaceModel['characterArcBoard']['status']) {
  if (status === 'ready') return 'green'
  if (status === 'missing') return 'gold'
  return 'red'
}

export function storylineRiskColor(tag: string) {
  if (tag === '逾期未推') return 'red'
  if (tag === '回收债务') return 'purple'
  if (tag === '影响留存') return 'gold'
  return 'blue'
}

export function storylineDiffColor(riskType: PlanningWorkspaceModel['storylineBoard']['groups'][number]['items'][number]['diffEvidence'][number]['riskType']) {
  if (riskType === 'missed') return 'red'
  if (riskType === 'forbidden_touched') return 'volcano'
  return 'gold'
}

export function volumeBeatColor(status: PlanningWorkspaceModel['volumeBeatBudget']['status'] | string) {
  if (status === 'ready' || status === 'planned') return 'green'
  if (status === 'blocked') return 'red'
  return 'gold'
}

export function governanceColor(status: PlanningWorkspaceModel['governanceHub']['status'] | 'ok' | 'warn' | 'block') {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'blocked' || status === 'block') return 'red'
  return 'gold'
}

export function battleDeskColor(status: PlanningWorkspaceModel['longformBattleDesk']['status'] | 'ok' | 'warn' | 'block') {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'blocked' || status === 'block') return 'red'
  return 'gold'
}

export function coreContractRadarColor(status: PlanningWorkspaceModel['coreContractRadar']['status'] | 'ok' | 'warn' | 'block') {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'blocked' || status === 'block') return 'red'
  return 'gold'
}

export function serialReleaseColor(
  status:
    | PlanningWorkspaceModel['serialReleaseDesk']['status']
    | PlanningWorkspaceModel['serialReleaseDesk']['pipeline'][number]['status']
    | PlanningWorkspaceModel['serialReleaseDesk']['releaseWindow'][number]['status'],
) {
  if (status === 'ready' || status === 'ok' || status === 'publishable' || status === 'published') return 'green'
  if (status === 'blocked' || status === 'block' || status === 'needs_revision') return 'red'
  if (status === 'drafting') return 'blue'
  return 'gold'
}

export function spineGuardColor(status: PlanningWorkspaceModel['longformSpineGuard']['status'] | 'ok' | 'missing') {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'blocked' || status === 'missing') return 'red'
  return 'gold'
}

export function millionWordMilestoneColor(status: PlanningWorkspaceModel['millionWordMilestones']['status']) {
  if (status === 'ready') return 'green'
  if (status === 'blocked') return 'red'
  return 'gold'
}

export function millionWordMilestoneStepColor(status: PlanningWorkspaceModel['millionWordMilestones']['milestones'][number]['status']) {
  if (status === 'achieved') return 'green'
  if (status === 'current') return 'blue'
  if (status === 'needs_plan') return 'red'
  return 'default'
}

export function memoryCapsuleColor(status: PlanningWorkspaceModel['longformMemoryCapsule']['status']) {
  if (status === 'ready') return 'green'
  if (status === 'needs_sync') return 'gold'
  return 'red'
}

export function battleLaneFallbackLabel(key: PlanningWorkspaceModel['longformBattleDesk']['lanes'][number]['key']) {
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

export function readerTrustColor(status: PlanningWorkspaceModel['readerTrustLedger']['status'] | 'ok' | 'warn') {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'missing') return 'gold'
  return 'red'
}

export function readerTrialColor(status: PlanningWorkspaceModel['readerTrialRoom']['status'] | 'low' | 'medium' | 'high') {
  if (status === 'ready' || status === 'low') return 'green'
  if (status === 'blocked' || status === 'high') return 'red'
  return 'gold'
}

export function innovationRadarColor(status: PlanningWorkspaceModel['innovationRadar']['status'] | 'ok' | 'warn') {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'missing') return 'gold'
  return 'red'
}

export function fatigueRadarColor(status: PlanningWorkspaceModel['recentFatigueRadar']['status'] | 'ok' | 'warn') {
  if (status === 'ready' || status === 'ok') return 'green'
  return 'gold'
}

export function storyPressureColor(status: PlanningWorkspaceModel['storyPressureLadder']['status'] | 'ok' | 'warn' | 'block') {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'blocked' || status === 'block') return 'red'
  return 'gold'
}

export function storyUnitColor(status: PlanningWorkspaceModel['storyUnitWorkshop']['status'] | 'ok' | 'warn' | 'block') {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'blocked' || status === 'block') return 'red'
  return 'gold'
}

export function creationPipelineColor(status: PlanningWorkspaceModel['creationPipeline']['stages'][number]['status']) {
  if (status === 'ok') return 'green'
  if (status === 'block') return 'red'
  return 'gold'
}

export function formatWords(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return String(value || 0)
}

export function actionLabel(key: PlanningActionKey) {
  const labels: Record<PlanningActionKey, string> = {
    update_rolling_plan: '更新滚动规划',
    complete_volume_plan: '补齐当前卷规划',
    enter_story_planning: '进入故事规划',
    enter_chapter_writing: '进入当前章写作',
    open_outline_tree: '查看完整大纲',
    future100_audit: '检查未来100章',
    future100_generate: '生成未来100章',
    longform_pressure: '运行长线压力测试',
    longform_creation_diagnosis: '运行创作诊断',
    topic_validation: '验证原创选题',
    reference_diagnosis: '诊断参考知识',
    open_story_assets: '打开资料设定',
    update_story_state: '校正故事状态',
    open_quality_revision: '进入质检修订',
    run_first30_retention: '运行前30章诊断',
    create_first30_repair: '生成修复任务',
    run_reader_trial_review: '运行读者试读复盘',
    create_reader_trial_repair: '生成试读修复任务',
    create_delivery_risk_repair: '生成风险修复任务',
    record_storyline_diff_decision: '记录差异决策',
    create_storyline_decision_tasks: '生成决策任务',
    open_task_center: '打开任务中心',
  }
  return labels[key]
}

export function chapterRangeLabel(node: PlanningVolumeTreeNode) {
  if (node.chapterNo) return `第${node.chapterNo}章`
  if (node.startChapter && node.endChapter) return `第${node.startChapter}-${node.endChapter}章`
  if (node.startChapter) return `第${node.startChapter}章起`
  if (node.endChapter) return `至第${node.endChapter}章`
  return '章节范围未定'
}

export function renderVolumeNode(node: PlanningVolumeTreeNode, depth = 0): React.ReactNode {
  return (
    <div
      key={`${node.id}-${node.title}-${depth}`}
      style={{
        borderLeft: depth === 0 ? 'none' : '1px solid #e8edf3',
        marginLeft: depth === 0 ? 0 : 12,
        paddingLeft: depth === 0 ? 0 : 12,
      }}
    >
      <div style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <Tag color={node.level === 'chapter' ? 'default' : depth === 0 ? 'blue' : 'purple'} bordered={false}>
          {node.level === 'chapter' ? '章' : node.level || '规划'}
        </Tag>
        <Text strong={depth === 0} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.title}
        </Text>
        <Text type="secondary" style={{ marginLeft: 'auto', fontSize: 12, whiteSpace: 'nowrap' }}>
          {chapterRangeLabel(node)}
        </Text>
        {node.wordCount !== undefined && <Tag bordered={false}>{node.wordCount} 字</Tag>}
      </div>
      {node.children.length > 0 && (
        <div style={{ display: 'grid', gap: 2 }}>
          {node.children.map(child => renderVolumeNode(child, depth + 1))}
        </div>
      )}
    </div>
  )
}

export function renderStorylineEvidenceRows(rows: Array<{ chapterNo: number | null; usageType: string; summary: string }>, emptyText: string) {
  if (!rows.length) return <Text type="secondary" style={{ fontSize: 12 }}>{emptyText}</Text>
  return (
    <Space direction="vertical" size={4} style={{ width: '100%' }}>
      {rows.map((row, index) => (
        <Text key={`${row.chapterNo || 'unknown'}-${row.usageType}-${index}`} style={{ fontSize: 12 }}>
          {row.chapterNo ? `第${row.chapterNo}章` : '未标注章节'} · {row.usageType} · {row.summary}
        </Text>
      ))}
    </Space>
  )
}

export function renderStorylineDiffRows(
  rows: PlanningWorkspaceModel['storylineBoard']['groups'][number]['items'][number]['diffEvidence'],
  onAction: (key: PlanningActionKey, options?: { intent?: any }) => void,
) {
  if (!rows.length) return <Text type="secondary" style={{ fontSize: 12 }}>暂无差异决策</Text>
  return (
    <Space direction="vertical" size={6} style={{ width: '100%' }}>
      {rows.map((row, index) => (
        <div
          key={`${row.chapterNo || 'unknown'}-${row.riskType}-${row.summary}-${index}`}
          style={{
            display: 'grid',
            gap: 4,
            border: '1px solid #fed7aa',
            borderRadius: 6,
            padding: 8,
            background: '#fff',
          }}
        >
          <Space wrap>
            <Tag color={storylineDiffColor(row.riskType)} bordered={false}>{row.riskLabel}</Tag>
            <Tag bordered={false}>{row.chapterNo ? `第${row.chapterNo}章` : '未标注章节'}</Tag>
            <Tag color="blue" bordered={false}>{row.recommendedActionLabel}</Tag>
            <Button
              size="small"
              type="link"
              style={{ paddingInline: 0 }}
              onClick={() => onAction('record_storyline_diff_decision', {
                intent: {
                  ...row,
                  decisionKey: row.decisionKey,
                  recommendedDecision: row.recommendedDecision,
                },
              })}
            >
              记录决策
            </Button>
          </Space>
          <Text style={{ fontSize: 12 }}>{row.summary}</Text>
          {row.evidence && row.evidence !== row.summary && (
            <Text type="secondary" style={{ fontSize: 12 }}>证据：{row.evidence}</Text>
          )}
          <Text type="secondary" style={{ fontSize: 12 }}>{row.recommendedActionDetail}</Text>
        </div>
      ))}
    </Space>
  )
}

