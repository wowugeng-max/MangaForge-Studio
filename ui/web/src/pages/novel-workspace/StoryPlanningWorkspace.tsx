import React from 'react'
import { Alert, Button, Card, Empty, Grid, Progress, Space, Tag, Tooltip, Typography } from 'antd'
import {
  BranchesOutlined,
  CheckCircleOutlined,
  DownOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  NodeIndexOutlined,
  ThunderboltOutlined,
  UpOutlined,
} from '@ant-design/icons'
import type { PlanningActionKey, PlanningVolumeTreeNode, PlanningWorkspaceModel } from './planningWorkspaceModel'

const { Text, Paragraph } = Typography
const { useBreakpoint } = Grid

export type PlanningLoadingKey = 'rollingPlan' | 'future100Audit' | 'future100Generate' | 'longformPressure' | 'longformCreationDiagnosis' | 'topic' | 'referenceDiagnosis' | 'first30Retention' | 'first30Repair' | 'readerTrial' | 'readerTrialRepair'

export type StoryPlanningWorkspaceProps = {
  model: PlanningWorkspaceModel
  selectedModelId?: number
  loadingKey?: PlanningLoadingKey
  onAction: (key: PlanningActionKey, options?: { intent?: any }) => void
  onSelectChapter: (chapterNo: number) => void
}

function healthColor(status: PlanningWorkspaceModel['topStatus']['longformHealth']['status']) {
  if (status === 'healthy') return 'green'
  if (status === 'drifting') return 'gold'
  return 'red'
}

function issueColor(severity: 'critical' | 'warning') {
  if (severity === 'critical') return 'red'
  if (severity === 'warning') return 'gold'
  return 'blue'
}

function issueIconColor(severity: 'critical' | 'warning') {
  const color = issueColor(severity)
  if (color === 'red') return '#cf1322'
  if (color === 'gold') return '#d48806'
  return '#1677ff'
}

function retentionColor(scoreOrStatus: number | string | null | undefined) {
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

function retentionRiskColor(level: 'ok' | 'medium' | 'high') {
  if (level === 'ok') return 'green'
  if (level === 'high') return 'red'
  return 'gold'
}

function storylineStatusColor(status: PlanningWorkspaceModel['storylineBoard']['status']) {
  if (status === 'ready') return 'green'
  if (status === 'missing') return 'gold'
  return 'red'
}

function characterArcBoardColor(status: PlanningWorkspaceModel['characterArcBoard']['status']) {
  if (status === 'ready') return 'green'
  if (status === 'missing') return 'gold'
  return 'red'
}

function storylineRiskColor(tag: string) {
  if (tag === '逾期未推') return 'red'
  if (tag === '回收债务') return 'purple'
  if (tag === '影响留存') return 'gold'
  return 'blue'
}

function storylineDiffColor(riskType: PlanningWorkspaceModel['storylineBoard']['groups'][number]['items'][number]['diffEvidence'][number]['riskType']) {
  if (riskType === 'missed') return 'red'
  if (riskType === 'forbidden_touched') return 'volcano'
  return 'gold'
}

function volumeBeatColor(status: PlanningWorkspaceModel['volumeBeatBudget']['status'] | string) {
  if (status === 'ready' || status === 'planned') return 'green'
  if (status === 'blocked') return 'red'
  return 'gold'
}

function governanceColor(status: PlanningWorkspaceModel['governanceHub']['status'] | 'ok' | 'warn' | 'block') {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'blocked' || status === 'block') return 'red'
  return 'gold'
}

function battleDeskColor(status: PlanningWorkspaceModel['longformBattleDesk']['status'] | 'ok' | 'warn' | 'block') {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'blocked' || status === 'block') return 'red'
  return 'gold'
}

function coreContractRadarColor(status: PlanningWorkspaceModel['coreContractRadar']['status'] | 'ok' | 'warn' | 'block') {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'blocked' || status === 'block') return 'red'
  return 'gold'
}

function serialReleaseColor(
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

function spineGuardColor(status: PlanningWorkspaceModel['longformSpineGuard']['status'] | 'ok' | 'missing') {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'blocked' || status === 'missing') return 'red'
  return 'gold'
}

function millionWordMilestoneColor(status: PlanningWorkspaceModel['millionWordMilestones']['status']) {
  if (status === 'ready') return 'green'
  if (status === 'blocked') return 'red'
  return 'gold'
}

function millionWordMilestoneStepColor(status: PlanningWorkspaceModel['millionWordMilestones']['milestones'][number]['status']) {
  if (status === 'achieved') return 'green'
  if (status === 'current') return 'blue'
  if (status === 'needs_plan') return 'red'
  return 'default'
}

function memoryCapsuleColor(status: PlanningWorkspaceModel['longformMemoryCapsule']['status']) {
  if (status === 'ready') return 'green'
  if (status === 'needs_sync') return 'gold'
  return 'red'
}

function battleLaneFallbackLabel(key: PlanningWorkspaceModel['longformBattleDesk']['lanes'][number]['key']) {
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

function readerTrustColor(status: PlanningWorkspaceModel['readerTrustLedger']['status'] | 'ok' | 'warn') {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'missing') return 'gold'
  return 'red'
}

function readerTrialColor(status: PlanningWorkspaceModel['readerTrialRoom']['status'] | 'low' | 'medium' | 'high') {
  if (status === 'ready' || status === 'low') return 'green'
  if (status === 'blocked' || status === 'high') return 'red'
  return 'gold'
}

function innovationRadarColor(status: PlanningWorkspaceModel['innovationRadar']['status'] | 'ok' | 'warn') {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'missing') return 'gold'
  return 'red'
}

function fatigueRadarColor(status: PlanningWorkspaceModel['recentFatigueRadar']['status'] | 'ok' | 'warn') {
  if (status === 'ready' || status === 'ok') return 'green'
  return 'gold'
}

function storyPressureColor(status: PlanningWorkspaceModel['storyPressureLadder']['status'] | 'ok' | 'warn' | 'block') {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'blocked' || status === 'block') return 'red'
  return 'gold'
}

function storyUnitColor(status: PlanningWorkspaceModel['storyUnitWorkshop']['status'] | 'ok' | 'warn' | 'block') {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'blocked' || status === 'block') return 'red'
  return 'gold'
}

function creationPipelineColor(status: PlanningWorkspaceModel['creationPipeline']['stages'][number]['status']) {
  if (status === 'ok') return 'green'
  if (status === 'block') return 'red'
  return 'gold'
}

function formatWords(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return String(value || 0)
}

function actionLabel(key: PlanningActionKey) {
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

function chapterRangeLabel(node: PlanningVolumeTreeNode) {
  if (node.chapterNo) return `第${node.chapterNo}章`
  if (node.startChapter && node.endChapter) return `第${node.startChapter}-${node.endChapter}章`
  if (node.startChapter) return `第${node.startChapter}章起`
  if (node.endChapter) return `至第${node.endChapter}章`
  return '章节范围未定'
}

function renderVolumeNode(node: PlanningVolumeTreeNode, depth = 0): React.ReactNode {
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

function renderStorylineEvidenceRows(rows: Array<{ chapterNo: number | null; usageType: string; summary: string }>, emptyText: string) {
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

function renderStorylineDiffRows(
  rows: PlanningWorkspaceModel['storylineBoard']['groups'][number]['items'][number]['diffEvidence'],
  onAction: StoryPlanningWorkspaceProps['onAction'],
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

export function StoryPlanningWorkspace({
  model,
  selectedModelId,
  loadingKey,
  onAction,
  onSelectChapter,
}: StoryPlanningWorkspaceProps) {
  const screens = useBreakpoint()
  const compact = !screens.xl
  const [overviewCollapsed, setOverviewCollapsed] = React.useState(false)
  const wordPercent = model.topStatus.targetWords > 0
    ? Math.min(100, Math.round((model.topStatus.writtenWords / model.topStatus.targetWords) * 100))
    : 0

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#f6f8fb' }}>
      <div style={{ padding: '16px 20px 24px', display: 'grid', gap: 16 }}>
        <Card className="story-planning-overview-card" size="small" styles={{ body: { padding: overviewCollapsed ? 12 : 16 } }}>
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'minmax(0, 1fr) auto', gap: 16, alignItems: 'center' }}>
            <Space direction="vertical" size={8} style={{ minWidth: 0 }}>
              <Space wrap>
                <Tag color="blue" bordered={false}>{model.topStatus.currentVolume}</Tag>
                <Tag color="purple" bordered={false}>{model.topStatus.currentStage}</Tag>
                <Tag bordered={false}>{model.topStatus.currentChapterLabel}</Tag>
                <Tag color={healthColor(model.topStatus.longformHealth.status)} bordered={false}>
                  长线健康：{model.topStatus.longformHealth.label}
                </Tag>
              </Space>
              {!overviewCollapsed && (
                <>
                  <Space wrap size={[12, 6]}>
                    <Text type="secondary">已写 {formatWords(model.topStatus.writtenWords)} / 目标 {formatWords(model.topStatus.targetWords)}</Text>
                    <Text type="secondary">
                      未来10章 {model.topStatus.future10Coverage.planned}/{model.topStatus.future10Coverage.required}
                    </Text>
                    <Text type="secondary">
                      未来100章 {model.topStatus.future100Coverage.planned}/{model.topStatus.future100Coverage.required}
                    </Text>
                  </Space>
                  <Progress percent={wordPercent} size="small" showInfo={false} />
                </>
              )}
            </Space>
            <Space wrap style={{ justifyContent: 'flex-end' }}>
              <Button
                icon={overviewCollapsed ? <DownOutlined /> : <UpOutlined />}
                onClick={() => setOverviewCollapsed(value => !value)}
              >
                {overviewCollapsed ? '展开规划概览' : '收起规划概览'}
              </Button>
              {!overviewCollapsed && (
                <>
                  <Button
                    icon={<BranchesOutlined />}
                    loading={loadingKey === 'rollingPlan'}
                    disabled={!selectedModelId}
                    onClick={() => onAction('update_rolling_plan')}
                  >
                    更新滚动规划
                  </Button>
                  <Button icon={<NodeIndexOutlined />} onClick={() => onAction('complete_volume_plan')}>
                    补齐当前卷规划
                  </Button>
                </>
              )}
              <Button type="primary" icon={<EditOutlined />} onClick={() => onAction('enter_chapter_writing')}>
                进入当前章写作
              </Button>
            </Space>
          </div>
        </Card>

        <Card
          className="novel-creation-pipeline-card"
          title="AI长篇创作流水线"
          size="small"
          extra={(
            <Button
              size="small"
              type={model.creationPipeline.riskCount > 0 ? 'primary' : 'default'}
              onClick={() => onAction(model.creationPipeline.primaryAction.key)}
            >
              {model.creationPipeline.primaryAction.label}
            </Button>
          )}
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={model.creationPipeline.riskCount > 0 ? 'gold' : 'green'} bordered={false}>
                当前建议
              </Tag>
              <Tag bordered={false}>全书核心</Tag>
              <Tag bordered={false}>长线规划</Tag>
              <Tag bordered={false}>设定资产</Tag>
              <Tag bordered={false}>章节开写</Tag>
              <Tag bordered={false}>交稿验收</Tag>
              <Tag bordered={false}>连载发布</Tag>
              {model.creationPipeline.riskCount > 0 && <Tag color="red" bordered={false}>风险 {model.creationPipeline.riskCount}</Tag>}
            </Space>
            <Alert
              type={model.creationPipeline.riskCount > 0 ? 'warning' : 'success'}
              showIcon
              message={`当前建议：${model.creationPipeline.primaryAction.label}`}
              description={model.creationPipeline.summary}
            />
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
              {model.creationPipeline.stages.map(stage => (
                <button
                  key={stage.key}
                  type="button"
                  onClick={() => onAction(stage.actionKey)}
                  style={{
                    border: `1px solid ${stage.active ? '#1677ff' : '#edf0f5'}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    background: stage.status === 'ok' ? '#fff' : stage.status === 'block' ? '#fff1f0' : '#fffbeb',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    font: 'inherit',
                    color: 'inherit',
                    boxShadow: stage.active ? '0 8px 20px rgba(22,119,255,0.12)' : 'none',
                  }}
                >
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    <Space wrap>
                      <Tag color={creationPipelineColor(stage.status)} bordered={false}>{stage.label}</Tag>
                      {stage.active && <Tag color="blue" bordered={false}>当前</Tag>}
                    </Space>
                    <Progress
                      percent={Math.max(0, Math.min(100, stage.score))}
                      size="small"
                      showInfo={false}
                      strokeColor={creationPipelineColor(stage.status) === 'green' ? '#52c41a' : creationPipelineColor(stage.status) === 'red' ? '#ff4d4f' : '#faad14'}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>{stage.detail}</Text>
                  </Space>
                </button>
              ))}
            </div>
          </Space>
        </Card>

        <Card
          className="novel-longform-battle-desk-card"
          title="长篇作战台"
          size="small"
          extra={(
            <Button
              size="small"
              type={model.longformBattleDesk.status === 'ready' ? 'default' : 'primary'}
              onClick={() => onAction(model.longformBattleDesk.primaryAction.key)}
            >
              {model.longformBattleDesk.primaryAction.label}
            </Button>
          )}
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={battleDeskColor(model.longformBattleDesk.status)} bordered={false}>{model.longformBattleDesk.label}</Tag>
              <Tag bordered={false}>{model.longformRhythm.currentBandLabel}</Tag>
              {model.longformBattleDesk.riskChips.map(chip => (
                <Tag key={chip} color="gold" bordered={false}>{chip}</Tag>
              ))}
            </Space>
            <Text type="secondary">{model.longformBattleDesk.summary}</Text>
            <Alert
              type={model.longformBattleDesk.status === 'ready' ? 'success' : model.longformBattleDesk.status === 'blocked' ? 'error' : 'warning'}
              showIcon
              message={`今日优先：${model.longformBattleDesk.primaryAction.label}`}
              description={model.longformBattleDesk.primaryAction.reason}
            />
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
              {model.longformBattleDesk.lanes.map(lane => (
                <button
                  key={lane.key}
                  type="button"
                  onClick={() => onAction(lane.actionKey)}
                  style={{
                    border: '1px solid #edf0f5',
                    borderRadius: 8,
                    padding: '10px 12px',
                    background: lane.status === 'ok' ? '#fff' : lane.status === 'block' ? '#fff1f0' : '#fffbeb',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    font: 'inherit',
                    color: 'inherit',
                  }}
                >
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    <Space wrap>
                      <Tag color={battleDeskColor(lane.status)} bordered={false}>{lane.label || battleLaneFallbackLabel(lane.key)}</Tag>
                      <Tag bordered={false}>{lane.score}</Tag>
                    </Space>
                    <Progress
                      percent={Math.max(0, Math.min(100, lane.score))}
                      size="small"
                      showInfo={false}
                      strokeColor={battleDeskColor(lane.status) === 'green' ? '#52c41a' : battleDeskColor(lane.status) === 'red' ? '#ff4d4f' : '#faad14'}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>{lane.detail}</Text>
                  </Space>
                </button>
              ))}
            </div>
          </Space>
        </Card>

        <Card
          className="novel-core-contract-radar-card"
          title="核心契约雷达"
          size="small"
          extra={(
            <Button
              size="small"
              type={model.coreContractRadar.status === 'ready' ? 'default' : 'primary'}
              onClick={() => onAction(model.coreContractRadar.primaryAction.key)}
            >
              {model.coreContractRadar.primaryAction.label}
            </Button>
          )}
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={coreContractRadarColor(model.coreContractRadar.status)} bordered={false}>
                {model.coreContractRadar.label}
              </Tag>
              <Tag bordered={false}>百万字核心守门</Tag>
              {model.coreContractRadar.riskTags.map(tag => (
                <Tag key={tag} color={tag.includes('偏移') || tag.includes('缺') ? 'red' : 'gold'} bordered={false}>{tag}</Tag>
              ))}
            </Space>
            <Alert
              type={model.coreContractRadar.status === 'ready' ? 'success' : model.coreContractRadar.status === 'blocked' ? 'error' : 'warning'}
              showIcon
              message={`契约下一步：${model.coreContractRadar.primaryAction.label}`}
              description={model.coreContractRadar.summary}
            />
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
              {model.coreContractRadar.checks.map(check => (
                <button
                  key={check.key}
                  type="button"
                  onClick={() => onAction(check.status === 'ok' ? 'enter_chapter_writing' : model.coreContractRadar.primaryAction.key)}
                  style={{
                    border: '1px solid #edf0f5',
                    borderRadius: 8,
                    padding: '10px 12px',
                    background: check.status === 'ok' ? '#fff' : check.status === 'block' ? '#fff1f0' : '#fffbeb',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    font: 'inherit',
                    color: 'inherit',
                  }}
                >
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    <Space wrap>
                      <Tag color={coreContractRadarColor(check.status)} bordered={false}>{check.label}</Tag>
                      <Tag bordered={false}>{check.score}</Tag>
                    </Space>
                    <Progress
                      percent={Math.max(0, Math.min(100, check.score))}
                      size="small"
                      showInfo={false}
                      strokeColor={coreContractRadarColor(check.status) === 'green' ? '#52c41a' : coreContractRadarColor(check.status) === 'red' ? '#ff4d4f' : '#faad14'}
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>{check.detail}</Text>
                  </Space>
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              <div style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fbfcfe' }}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>必须服务</Text>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {(model.coreContractRadar.mustServe.length ? model.coreContractRadar.mustServe : ['补齐核心卖点、主角驱动、核心矛盾和本章任务。']).slice(0, 5).map(item => (
                    <Text key={item} type="secondary" style={{ fontSize: 12 }}>{item}</Text>
                  ))}
                </Space>
              </div>
              <div style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fbfcfe' }}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>不可偏移</Text>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {(model.coreContractRadar.noDrift.length ? model.coreContractRadar.noDrift : ['不能改写既定核心承诺，不能把创新机制写成普通套路。']).slice(0, 5).map(item => (
                    <Text key={item} type="secondary" style={{ fontSize: 12 }}>{item}</Text>
                  ))}
                </Space>
              </div>
            </div>
          </Space>
        </Card>

        <Card
          className="novel-serial-release-desk-card"
          title="连载发布节奏台"
          size="small"
          extra={(
            <Button
              size="small"
              type={model.serialReleaseDesk.status === 'ready' ? 'default' : 'primary'}
              onClick={() => onAction(model.serialReleaseDesk.primaryAction.key)}
            >
              {model.serialReleaseDesk.primaryAction.label}
            </Button>
          )}
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={serialReleaseColor(model.serialReleaseDesk.status)} bordered={false}>
                {model.serialReleaseDesk.label}
              </Tag>
              <Tag bordered={false}>日更 {model.serialReleaseDesk.dailyTargetChapters} 章</Tag>
              <Tag color={model.serialReleaseDesk.bufferDays >= model.serialReleaseDesk.minBufferDays ? 'green' : 'gold'} bordered={false}>
                存稿 {model.serialReleaseDesk.bufferDays} 天
              </Tag>
              <Tag bordered={false}>存稿安全线 {model.serialReleaseDesk.minBufferDays} 天</Tag>
              <Tag bordered={false}>已发布到第 {model.serialReleaseDesk.lastPublishedChapter} 章</Tag>
            </Space>
            <Text type="secondary">{model.serialReleaseDesk.summary}</Text>
            <Alert
              type={model.serialReleaseDesk.status === 'ready' ? 'success' : model.serialReleaseDesk.status === 'blocked' ? 'error' : 'warning'}
              showIcon
              message={`发布节奏下一步：${model.serialReleaseDesk.primaryAction.label}`}
              description={model.serialReleaseDesk.primaryAction.reason}
            />
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
              {[
                { label: '发布窗口', value: `${model.serialReleaseDesk.releaseWindow[0]?.chapterNo || '?'}-${model.serialReleaseDesk.releaseWindow.at(-1)?.chapterNo || '?'}`, color: serialReleaseColor(model.serialReleaseDesk.status) },
                { label: '可发布存稿', value: `${model.serialReleaseDesk.publishableChapters} 章`, color: model.serialReleaseDesk.publishableChapters > 0 ? 'green' : 'gold' },
                { label: '当前存稿', value: `${model.serialReleaseDesk.bufferDays} 天`, color: model.serialReleaseDesk.bufferDays >= model.serialReleaseDesk.minBufferDays ? 'green' : 'gold' },
                { label: '风险章节', value: `${model.serialReleaseDesk.riskChapters.length} 章`, color: model.serialReleaseDesk.riskChapters.length ? 'red' : 'green' },
              ].map(item => (
                <div key={item.label} style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fbfcfe' }}>
                  <Space direction="vertical" size={6}>
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.label}</Text>
                    <Tag color={item.color} bordered={false}>{item.value}</Tag>
                  </Space>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
              {model.serialReleaseDesk.pipeline.map(step => (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => onAction(step.actionKey)}
                  style={{
                    border: '1px solid #edf0f5',
                    borderRadius: 8,
                    padding: '10px 12px',
                    background: step.status === 'ok' ? '#fff' : step.status === 'block' ? '#fff1f0' : '#fffbeb',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    font: 'inherit',
                    color: 'inherit',
                  }}
                >
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    <Space wrap>
                      <Tag color={serialReleaseColor(step.status)} bordered={false}>{step.label}</Tag>
                      <Tag bordered={false}>{step.count}</Tag>
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>{step.detail}</Text>
                  </Space>
                </button>
              ))}
            </div>
            <div style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: 10, background: '#fff' }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>发布窗口</Text>
              <div style={{ display: 'grid', gap: 6 }}>
                {model.serialReleaseDesk.releaseWindow.map(chapter => (
                  <button
                    key={`${chapter.chapterNo}-${chapter.title}`}
                    type="button"
                    onClick={() => onSelectChapter(chapter.chapterNo)}
                    style={{
                      border: '1px solid #edf0f5',
                      borderRadius: 8,
                      padding: '8px 10px',
                      background: chapter.status === 'needs_revision' ? '#fff1f0' : '#fbfcfe',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      font: 'inherit',
                      color: 'inherit',
                    }}
                  >
                    <Space wrap>
                      <Tag color={serialReleaseColor(chapter.status)} bordered={false}>第{chapter.chapterNo}章</Tag>
                      <Text strong>{chapter.title}</Text>
                      <Tag bordered={false}>{chapter.wordCount} 字</Tag>
                      <Tag color={serialReleaseColor(chapter.status)} bordered={false}>
                        {chapter.status === 'publishable' ? '可发布' : chapter.status === 'needs_revision' ? '待修订' : chapter.status === 'drafting' ? '待生成正文' : chapter.status === 'published' ? '已发布' : '待补计划'}
                      </Tag>
                      {chapter.riskTags.map(tag => <Tag key={tag} color="red" bordered={false}>{tag}</Tag>)}
                    </Space>
                  </button>
                ))}
              </div>
            </div>
            {model.serialReleaseDesk.riskChapters.length > 0 && (
              <Space wrap>
                {model.serialReleaseDesk.riskChapters.slice(0, 6).map(chapter => (
                  <Tag key={chapter.chapterNo} color="red" bordered={false}>
                    第{chapter.chapterNo}章 {chapter.riskTags.join('、')}
                  </Tag>
                ))}
              </Space>
            )}
            {model.serialReleaseDesk.nextActions.length > 0 && (
              <Space wrap>
                {model.serialReleaseDesk.nextActions.map(action => <Tag key={action} color="gold" bordered={false}>{action}</Tag>)}
              </Space>
            )}
          </Space>
        </Card>

        <Card
          className="novel-longform-spine-guard-card"
          title="全书主轴护栏"
          size="small"
          extra={(
            <Button
              size="small"
              type={model.longformSpineGuard.status === 'ready' ? 'default' : 'primary'}
              onClick={() => onAction(model.longformSpineGuard.actionKey)}
            >
              {actionLabel(model.longformSpineGuard.actionKey)}
            </Button>
          )}
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={spineGuardColor(model.longformSpineGuard.status)} bordered={false}>
                {model.longformSpineGuard.label}
              </Tag>
              <Tag bordered={false}>{model.longformSpineGuard.sourceLabel}</Tag>
              {model.longformSpineGuard.missingAxes.map(axis => (
                <Tag key={axis} color="red" bordered={false}>缺{axis}</Tag>
              ))}
            </Space>
            <Text type="secondary">{model.longformSpineGuard.summary}</Text>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(7, minmax(0, 1fr))', gap: 8 }}>
              {model.longformSpineGuard.axes.map(axis => (
                <div
                  key={axis.key}
                  style={{
                    border: `1px solid ${axis.status === 'ok' ? '#e8edf3' : '#ffd8bf'}`,
                    borderRadius: 8,
                    padding: '10px 12px',
                    background: axis.status === 'ok' ? '#fff' : '#fff7ed',
                    minWidth: 0,
                  }}
                >
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    <Space wrap>
                      <Text strong>{axis.label}</Text>
                      {axis.locked && <Tag color="blue" bordered={false}>不可漂移</Tag>}
                      {axis.status === 'missing' && <Tag color="red" bordered={false}>待补</Tag>}
                    </Space>
                    <Text type={axis.value ? undefined : 'secondary'} style={{ fontSize: 12 }}>
                      {axis.value || '未设置'}
                    </Text>
                  </Space>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              <div style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fbfcfe' }}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>不可漂移边界</Text>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {(model.longformSpineGuard.immutableRules.length ? model.longformSpineGuard.immutableRules : ['补齐核心卖点、核心矛盾和创新钩子后形成边界。']).slice(0, 4).map(rule => (
                    <Text key={rule} type="secondary" style={{ fontSize: 12 }}>{rule}</Text>
                  ))}
                </Space>
              </div>
              <div style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fbfcfe' }}>
                <Text strong style={{ display: 'block', marginBottom: 6 }}>可调整区</Text>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  {model.longformSpineGuard.flexibleZones.slice(0, 4).map(zone => (
                    <Text key={zone} type="secondary" style={{ fontSize: 12 }}>{zone}</Text>
                  ))}
                </Space>
              </div>
            </div>
          </Space>
        </Card>

        <Card
          className="novel-million-word-milestone-card"
          title="百万字里程碑地图"
          size="small"
          extra={(
            <Button
              size="small"
              type={model.millionWordMilestones.status === 'ready' ? 'default' : 'primary'}
              onClick={() => onAction(model.millionWordMilestones.actionKey)}
            >
              {actionLabel(model.millionWordMilestones.actionKey)}
            </Button>
          )}
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={millionWordMilestoneColor(model.millionWordMilestones.status)} bordered={false}>
                {model.millionWordMilestones.label}
              </Tag>
              <Tag bordered={false}>{model.millionWordMilestones.sourceLabel}</Tag>
              <Tag bordered={false}>节点 {model.millionWordMilestones.total}</Tag>
              {model.millionWordMilestones.currentMilestone && (
                <Tag color="blue" bordered={false}>当前：{model.millionWordMilestones.currentMilestone.label}</Tag>
              )}
              {model.millionWordMilestones.nextMilestone && (
                <Tag color="purple" bordered={false}>下一：{model.millionWordMilestones.nextMilestone.label}</Tag>
              )}
            </Space>
            <Text type="secondary">{model.millionWordMilestones.summary}</Text>
            {model.millionWordMilestones.milestones.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="300万字以上项目需要先补齐30万、100万、300万等里程碑" />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {model.millionWordMilestones.milestones.map(item => (
                  <div
                    key={item.key}
                    style={{
                      border: `1px solid ${item.status === 'needs_plan' ? '#ffd8bf' : '#e8edf3'}`,
                      borderRadius: 8,
                      padding: '10px 12px',
                      background: item.status === 'needs_plan' ? '#fff7ed' : '#fff',
                      minWidth: 0,
                    }}
                  >
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color={millionWordMilestoneStepColor(item.status)} bordered={false}>
                          {item.status === 'achieved' ? '已完成' : item.status === 'current' ? '当前节点' : item.status === 'needs_plan' ? '待补规划' : '未来节点'}
                        </Tag>
                        <Text strong>{item.label}</Text>
                        <Tag bordered={false}>{formatWords(item.targetWords)}</Tag>
                        {item.targetChapter && <Tag bordered={false}>约第{item.targetChapter}章</Tag>}
                      </Space>
                      <Text>{item.theme || '未填写阶段主题'}</Text>
                      <Space direction="vertical" size={3} style={{ width: '100%' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>主角状态：{item.protagonistState || '未设置'}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>世界扩展：{item.worldExpansion || '未设置'}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>冲突升级：{item.conflictEscalation || '未设置'}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>读者回报：{item.readerPayoff || '未设置'}</Text>
                      </Space>
                      {item.riskTags.length > 0 && (
                        <Space wrap>
                          {item.riskTags.map(tag => <Tag key={tag} color="red" bordered={false}>{tag}</Tag>)}
                        </Space>
                      )}
                    </Space>
                  </div>
                ))}
              </div>
            )}
            {model.millionWordMilestones.nextActions.length > 0 && (
              <Alert
                type={model.millionWordMilestones.status === 'ready' ? 'success' : model.millionWordMilestones.status === 'blocked' ? 'error' : 'warning'}
                showIcon
                message="下一步"
                description={model.millionWordMilestones.nextActions.join('；')}
              />
            )}
          </Space>
        </Card>

        <Card
          className="novel-longform-memory-capsule-card"
          title="长篇记忆胶囊"
          size="small"
          extra={(
            <Button
              size="small"
              type={model.longformMemoryCapsule.status === 'ready' ? 'default' : 'primary'}
              onClick={() => onAction(model.longformMemoryCapsule.actionKey)}
            >
              {actionLabel(model.longformMemoryCapsule.actionKey)}
            </Button>
          )}
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={memoryCapsuleColor(model.longformMemoryCapsule.status)} bordered={false}>
                {model.longformMemoryCapsule.label}
              </Tag>
              <Tag bordered={false}>
                {model.longformMemoryCapsule.lastUpdatedChapter ? `第${model.longformMemoryCapsule.lastUpdatedChapter}章同步` : '未同步'}
              </Tag>
              <Tag bordered={false}>角色 {model.longformMemoryCapsule.characterStates.length}</Tag>
              <Tag bordered={false}>开放悬念 {model.longformMemoryCapsule.openQuestions.length}</Tag>
              <Tag bordered={false}>待兑现 {model.longformMemoryCapsule.payoffDebts.length}</Tag>
            </Space>
            <Text type="secondary">{model.longformMemoryCapsule.summary}</Text>
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {[
                ['核心承诺', model.longformMemoryCapsule.corePromise],
                ['主线进度', model.longformMemoryCapsule.mainlineProgress],
                ['当前卷目标', model.longformMemoryCapsule.currentVolumeGoal],
                ['角色状态', model.longformMemoryCapsule.characterStates.join('；')],
                ['开放悬念', model.longformMemoryCapsule.openQuestions.join('；')],
                ['待兑现', model.longformMemoryCapsule.payoffDebts.join('；')],
                ['正史事实', model.longformMemoryCapsule.canonFacts.join('；')],
                ['红线', model.longformMemoryCapsule.redLines.join('；')],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    border: '1px solid #edf0f5',
                    borderRadius: 8,
                    padding: '10px 12px',
                    background: label === '红线' && value ? '#fff1f0' : '#fbfcfe',
                    minWidth: 0,
                  }}
                >
                  <Text strong style={{ display: 'block', marginBottom: 6 }}>{label}</Text>
                  <Text type={value ? undefined : 'secondary'} style={{ fontSize: 12 }}>
                    {value || '未设置'}
                  </Text>
                </div>
              ))}
            </div>
            {model.longformMemoryCapsule.status !== 'ready' && (
              <Alert
                type={model.longformMemoryCapsule.status === 'needs_sync' ? 'warning' : 'error'}
                showIcon
                message={model.longformMemoryCapsule.status === 'needs_sync' ? '继续写作前建议同步故事状态' : '缺少长篇正史召回材料'}
                description={model.longformMemoryCapsule.status === 'needs_sync'
                  ? '胶囊过期时，单章生成容易忘记最近角色状态、悬念和回报债。'
                  : '先补写作圣经或同步故事状态，再让模型进入章节开写任务书。'}
              />
            )}
          </Space>
        </Card>

        <Card
          className="novel-governance-hub-card"
          title="连载治理中枢"
          size="small"
          extra={(
            <Button
              size="small"
              type={model.governanceHub.status === 'ready' ? 'default' : 'primary'}
              onClick={() => onAction(model.governanceHub.primaryAction.key)}
            >
              {model.governanceHub.primaryAction.label}
            </Button>
          )}
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={governanceColor(model.governanceHub.status)} bordered={false}>
                {model.governanceHub.status === 'ready' ? '可继续创作' : model.governanceHub.status === 'blocked' ? '先治理阻塞' : '需要治理'}
              </Tag>
              <Text type="secondary">{model.governanceHub.summary}</Text>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              汇总交稿风险、前30章留存、读者试读、剧情线、新资产和长线材料，先给出唯一下一步。
            </Text>
            <Alert
              type={model.governanceHub.status === 'ready' ? 'success' : model.governanceHub.status === 'blocked' ? 'error' : 'warning'}
              showIcon
              message={`唯一下一步：${model.governanceHub.primaryAction.label}`}
              description={model.governanceHub.primaryAction.reason}
            />
            <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
              {model.governanceHub.checkpoints.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onAction(item.actionKey)}
                  style={{
                    border: '1px solid #edf0f5',
                    borderRadius: 8,
                    padding: '10px 12px',
                    background: item.status === 'ok' ? '#fff' : item.status === 'block' ? '#fff1f0' : '#fffbeb',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    font: 'inherit',
                    color: 'inherit',
                  }}
                >
                  <Space direction="vertical" size={6} style={{ width: '100%' }}>
                    <Space wrap>
                      <Tag color={governanceColor(item.status)} bordered={false}>{item.label}</Tag>
                      {item.count > 0 && <Tag bordered={false}>{item.count}</Tag>}
                    </Space>
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.detail}</Text>
                  </Space>
                </button>
              ))}
            </div>
          </Space>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'minmax(0, 1fr) 320px', gap: 16, alignItems: 'start' }}>
          <Space direction="vertical" size={16} style={{ minWidth: 0 }}>
            <Card
              className="novel-first30-retention-card"
              title="前30章留存曲线"
              size="small"
              extra={(
                <Space wrap>
                  <Button
                    size="small"
                    loading={loadingKey === 'first30Retention'}
                    onClick={() => onAction('run_first30_retention')}
                  >
                    运行前30章诊断
                  </Button>
                  {model.first30Retention.status !== 'missing' && model.first30Retention.status !== 'ready' && (
                    <Button
                      size="small"
                      type="primary"
                      loading={loadingKey === 'first30Repair'}
                      onClick={() => onAction('create_first30_repair')}
                    >
                      生成修复任务
                    </Button>
                  )}
                </Space>
              )}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color={retentionColor(model.first30Retention.status)} bordered={false}>
                    {model.first30Retention.status === 'missing' ? '未诊断' : model.first30Retention.status === 'stale' ? '需重新诊断' : model.first30Retention.status}
                  </Tag>
                  {model.first30Retention.score !== null && (
                    <Tag color={retentionColor(model.first30Retention.score)} bordered={false}>留存 {model.first30Retention.score} 分</Tag>
                  )}
                  <Tag color={model.first30Retention.promiseReady ? 'green' : 'gold'} bordered={false}>
                    读者承诺{model.first30Retention.promiseReady ? '已清晰' : '待补强'}
                  </Tag>
                </Space>
                <Text type="secondary">{model.first30Retention.summary}</Text>
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  {(model.first30Retention.segments.length ? model.first30Retention.segments : [
                    { key: '1-3', label: '开篇三章', score: 0, coverage: 0, hookRate: 0, payoffAverage: 0, chapterCount: 0 },
                    { key: '4-10', label: '试读十章', score: 0, coverage: 0, hookRate: 0, payoffAverage: 0, chapterCount: 0 },
                    { key: '11-30', label: '付费前蓄势', score: 0, coverage: 0, hookRate: 0, payoffAverage: 0, chapterCount: 0 },
                  ]).map(segment => (
                    <div key={segment.key} style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: 10, background: '#fbfcfe' }}>
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          <Text strong>{segment.label}</Text>
                          <Tag color={retentionColor(segment.score)} bordered={false}>{segment.score || '-'}分</Tag>
                        </Space>
                        <Progress percent={Math.max(0, Math.min(100, Number(segment.score || 0)))} size="small" showInfo={false} strokeColor={retentionColor(segment.score) === 'green' ? '#52c41a' : retentionColor(segment.score) === 'red' ? '#ff4d4f' : '#faad14'} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          覆盖 {segment.coverage}% · 钩子 {segment.hookRate}% · 爽点/悬念 {segment.payoffAverage}
                        </Text>
                      </Space>
                    </div>
                  ))}
                </div>
                {model.first30Retention.chapterCards.length > 0 ? (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {model.first30Retention.chapterCards.slice(0, 30).map(row => (
                      <button
                        key={`${row.chapterNo}-${row.title}`}
                        type="button"
                        onClick={() => onSelectChapter(row.chapterNo)}
                        style={{
                          border: '1px solid #edf0f5',
                          borderRadius: 8,
                          padding: '8px 10px',
                          background: '#fff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          font: 'inherit',
                          color: 'inherit',
                        }}
                      >
                        <Space wrap>
                          <Tag color={retentionRiskColor(row.riskLevel)} bordered={false}>第{row.chapterNo}章</Tag>
                          <Text strong>{row.title}</Text>
                          <Tag color={retentionColor(row.score)} bordered={false}>{row.score}分</Tag>
                          <Tag bordered={false}>{row.wordCount}字</Tag>
                          {row.flags.slice(0, 3).map(flag => <Tag key={flag} color="gold" bordered={false}>{flag}</Tag>)}
                        </Space>
                      </button>
                    ))}
                  </div>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="运行诊断后显示每章留存风险" />
                )}
                {model.first30Retention.nextActions.length > 0 && (
                  <Space wrap>
                    {model.first30Retention.nextActions.slice(0, 3).map(action => <Tag key={action} bordered={false}>{action}</Tag>)}
                  </Space>
                )}
              </Space>
            </Card>

            <Card
              className="novel-reader-trust-ledger-card"
              title="追读信任账本"
              size="small"
              extra={(
                <Button size="small" type={model.readerTrustLedger.status === 'needs_attention' ? 'primary' : 'link'} onClick={() => onAction(model.readerTrustLedger.actionKey)}>
                  {actionLabel(model.readerTrustLedger.actionKey)}
                </Button>
              )}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color={readerTrustColor(model.readerTrustLedger.status)} bordered={false}>
                    {model.readerTrustLedger.status === 'missing' ? '待复盘' : model.readerTrustLedger.status === 'ready' ? '追读稳定' : '需要修复'}
                  </Tag>
                  {model.readerTrustLedger.score !== null && (
                    <Tag color={retentionColor(model.readerTrustLedger.score)} bordered={false}>信任 {model.readerTrustLedger.score} 分</Tag>
                  )}
                  {model.readerTrustLedger.expectationDebtCount > 0 && <Tag color="red" bordered={false}>期待欠账 {model.readerTrustLedger.expectationDebtCount}</Tag>}
                  {model.readerTrustLedger.payoffDebtCount > 0 && <Tag color="purple" bordered={false}>回报欠账 {model.readerTrustLedger.payoffDebtCount}</Tag>}
                  {model.readerTrustLedger.retentionMissedCount > 0 && <Tag color="gold" bordered={false}>追读漏项 {model.readerTrustLedger.retentionMissedCount}</Tag>}
                  {model.readerTrustLedger.keepAliveCount > 0 && <Tag color="blue" bordered={false}>继续悬念 {model.readerTrustLedger.keepAliveCount}</Tag>}
                </Space>
                <Text type="secondary">{model.readerTrustLedger.summary}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  按期待兑现、爽点回报、追读钩子、继续悬念四个维度检查读者是否还有理由追下一章。
                </Text>
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                  {model.readerTrustLedger.signals.map(signal => (
                    <button
                      key={signal.key}
                      type="button"
                      onClick={() => onAction(signal.actionKey)}
                      style={{
                        border: '1px solid #edf0f5',
                        borderRadius: 8,
                        padding: '10px 12px',
                        background: signal.status === 'ok' ? '#fff' : '#fff1f0',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        font: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color={readerTrustColor(signal.status)} bordered={false}>{signal.label}</Tag>
                          {signal.count > 0 && <Tag bordered={false}>{signal.count}</Tag>}
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>{signal.detail}</Text>
                      </Space>
                    </button>
                  ))}
                </div>
              </Space>
            </Card>

            <Card
              className="novel-reader-trial-room-card"
              title="读者试读室"
              size="small"
              extra={(
                <Space wrap>
                  <Button
                    size="small"
                    type={model.readerTrialRoom.status === 'ready' ? 'link' : 'default'}
                    loading={loadingKey === 'readerTrial'}
                    onClick={() => onAction('run_reader_trial_review')}
                  >
                    运行读者试读复盘
                  </Button>
                  {model.readerTrialRoom.status !== 'missing' && (model.readerTrialRoom.status !== 'ready' || model.readerTrialRoom.dropPoints.length > 0) && (
                    <Button
                      size="small"
                      type="primary"
                      loading={loadingKey === 'readerTrialRepair'}
                      onClick={() => onAction('create_reader_trial_repair')}
                    >
                      生成试读修复任务
                    </Button>
                  )}
                </Space>
              )}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color={readerTrialColor(model.readerTrialRoom.status)} bordered={false}>
                    {model.readerTrialRoom.status === 'missing' ? '待试读' : model.readerTrialRoom.status === 'ready' ? '试读稳定' : model.readerTrialRoom.status === 'blocked' ? '高危弃读' : '需要修复'}
                  </Tag>
                  {model.readerTrialRoom.score !== null && (
                    <Tag color={retentionColor(model.readerTrialRoom.score)} bordered={false}>试读 {model.readerTrialRoom.score} 分</Tag>
                  )}
                  <Tag color="geekblue" bordered={false}>{model.readerTrialRoom.qualityBar}</Tag>
                  {model.readerTrialRoom.dropPoints.length > 0 && <Tag color="red" bordered={false}>弃读点 {model.readerTrialRoom.dropPoints.length}</Tag>}
                </Space>
                <Text type="secondary">{model.readerTrialRoom.summary}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  模拟爽点读者、剧情党、设定党和平台试读用户，检查前三章、试读十章和最近十章有没有继续追读的理由。
                </Text>
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                  {model.readerTrialRoom.personas.map(persona => (
                    <div key={persona.key} style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fbfcfe' }}>
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color={readerTrialColor(persona.riskLevel)} bordered={false}>{persona.label}</Tag>
                          {persona.score > 0 && <Tag bordered={false}>{persona.score}分</Tag>}
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>{persona.focus}</Text>
                        <Text>{persona.verdict}</Text>
                      </Space>
                    </div>
                  ))}
                </div>
                {model.readerTrialRoom.segments.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                    {model.readerTrialRoom.segments.map(segment => (
                      <div key={segment.key} style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fff' }}>
                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                          <Space wrap>
                            <Text strong>{segment.label}</Text>
                            <Tag color={retentionColor(segment.score)} bordered={false}>{segment.score || '-'}分</Tag>
                          </Space>
                          <Progress percent={segment.score} size="small" showInfo={false} strokeColor={retentionColor(segment.score) === 'green' ? '#52c41a' : retentionColor(segment.score) === 'red' ? '#ff4d4f' : '#faad14'} />
                          <Text type="secondary" style={{ fontSize: 12 }}>{segment.verdict}</Text>
                        </Space>
                      </div>
                    ))}
                  </div>
                )}
                {(model.readerTrialRoom.dropPoints.length > 0 || model.readerTrialRoom.pullPoints.length > 0) && (
                  <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                    <div style={{ border: '1px solid #fee2e2', borderRadius: 8, padding: '10px 12px', background: '#fff7f7' }}>
                      <Text strong style={{ display: 'block', marginBottom: 6 }}>弃读点</Text>
                      <Space direction="vertical" size={4}>
                        {(model.readerTrialRoom.dropPoints.length ? model.readerTrialRoom.dropPoints : ['暂无明显弃读点']).slice(0, 5).map(item => <Text key={item} type="secondary" style={{ fontSize: 12 }}>{item}</Text>)}
                      </Space>
                    </div>
                    <div style={{ border: '1px solid #dcfce7', borderRadius: 8, padding: '10px 12px', background: '#f6ffed' }}>
                      <Text strong style={{ display: 'block', marginBottom: 6 }}>追读拉力</Text>
                      <Space direction="vertical" size={4}>
                        {(model.readerTrialRoom.pullPoints.length ? model.readerTrialRoom.pullPoints : ['暂无明确追读拉力']).slice(0, 5).map(item => <Text key={item} type="secondary" style={{ fontSize: 12 }}>{item}</Text>)}
                      </Space>
                    </div>
                  </div>
                )}
                {model.readerTrialRoom.repairActions.length > 0 && (
                  <Space wrap>
                    {model.readerTrialRoom.repairActions.slice(0, 4).map(action => <Tag key={action} color="gold" bordered={false}>{action}</Tag>)}
                  </Space>
                )}
              </Space>
            </Card>

            <Card
              className="novel-innovation-radar-card"
              title="创新雷达"
              size="small"
              extra={(
                <Button size="small" type={model.innovationRadar.status === 'needs_attention' ? 'primary' : 'link'} onClick={() => onAction(model.innovationRadar.actionKey)}>
                  {actionLabel(model.innovationRadar.actionKey)}
                </Button>
              )}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color={innovationRadarColor(model.innovationRadar.status)} bordered={false}>
                    {model.innovationRadar.status === 'missing' ? '待复盘' : model.innovationRadar.status === 'ready' ? '创新稳定' : '需要修复'}
                  </Tag>
                  {model.innovationRadar.score !== null && (
                    <Tag color={retentionColor(model.innovationRadar.score)} bordered={false}>创新 {model.innovationRadar.score} 分</Tag>
                  )}
                  <Tag bordered={false}>兑现 {model.innovationRadar.deliveredCount}/{model.innovationRadar.plannedCount || '-'}</Tag>
                  {model.innovationRadar.missedCount > 0 && <Tag color="geekblue" bordered={false}>创新缺口 {model.innovationRadar.missedCount}</Tag>}
                </Space>
                <Text type="secondary">{model.innovationRadar.summary}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  按创新角度、执行点、差异护栏、IP化场面四个维度检查本章是否滑回同题材套路。
                </Text>
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                  {model.innovationRadar.signals.map(signal => (
                    <button
                      key={signal.key}
                      type="button"
                      onClick={() => onAction(signal.actionKey)}
                      style={{
                        border: '1px solid #edf0f5',
                        borderRadius: 8,
                        padding: '10px 12px',
                        background: signal.status === 'ok' ? '#fff' : '#f0f5ff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        font: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color={innovationRadarColor(signal.status)} bordered={false}>{signal.label}</Tag>
                          {signal.count > 0 && <Tag bordered={false}>{signal.count}</Tag>}
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>{signal.detail}</Text>
                      </Space>
                    </button>
                  ))}
                </div>
                {model.innovationRadar.nextActions.length > 0 && (
                  <Space wrap>
                    {model.innovationRadar.nextActions.slice(0, 3).map(action => <Tag key={action} bordered={false}>{action}</Tag>)}
                  </Space>
                )}
              </Space>
            </Card>

            <Card
              className="novel-volume-beat-budget-card"
              title="卷级高潮预算"
              size="small"
              extra={<Button size="small" type="link" onClick={() => onAction('complete_volume_plan')}>补齐当前卷规划</Button>}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color={volumeBeatColor(model.volumeBeatBudget.status)} bordered={false}>
                    {model.volumeBeatBudget.label}
                  </Tag>
                  <Tag bordered={false}>{model.volumeBeatBudget.currentVolumeTitle}</Tag>
                  <Tag bordered={false}>{model.volumeBeatBudget.chapterRange}</Tag>
                  <Tag color={model.volumeBeatBudget.climaxCount >= model.volumeBeatBudget.climaxTarget ? 'green' : 'gold'} bordered={false}>
                    高潮 {model.volumeBeatBudget.climaxCount}/{model.volumeBeatBudget.climaxTarget}
                  </Tag>
                  <Tag color={model.volumeBeatBudget.payoffCount >= model.volumeBeatBudget.payoffTarget ? 'green' : 'gold'} bordered={false}>
                    爽点 {model.volumeBeatBudget.payoffCount}/{model.volumeBeatBudget.payoffTarget}
                  </Tag>
                </Space>
                <Text type="secondary">{model.volumeBeatBudget.summary}</Text>
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                  {[
                    { label: '小高潮', description: '前段建立期待，给第一次明确反压或规则突破。' },
                    { label: '中高潮', description: '中段升级冲突，兑现阶段性爽点并抛出更大危机。' },
                    { label: '卷末爆点', description: '卷尾完成大回报、身份/势力变化或新地图钩子。' },
                  ].map(item => (
                    <div key={item.label} style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: 10, background: '#fbfcfe' }}>
                      <Space direction="vertical" size={6}>
                        <Text strong>{item.label}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Text>
                      </Space>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {model.volumeBeatBudget.beats.map(beat => (
                    <button
                      key={beat.key}
                      type="button"
                      disabled={!beat.chapterNo}
                      onClick={() => beat.chapterNo && onSelectChapter(beat.chapterNo)}
                      style={{
                        border: '1px solid #edf0f5',
                        borderRadius: 8,
                        padding: '10px 12px',
                        background: beat.status === 'missing' ? '#fffbeb' : '#fff',
                        cursor: beat.chapterNo ? 'pointer' : 'default',
                        textAlign: 'left',
                        width: '100%',
                        font: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color={volumeBeatColor(beat.status)} bordered={false}>{beat.type}</Tag>
                          {beat.chapterNo && <Tag bordered={false}>第{beat.chapterNo}章</Tag>}
                          <Text strong>{beat.label}</Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>{beat.detail}</Text>
                      </Space>
                    </button>
                  ))}
                </div>
                {model.volumeBeatBudget.nextActions.length > 0 && (
                  <Space wrap>
                    {model.volumeBeatBudget.nextActions.map(action => <Tag key={action} bordered={false}>{action}</Tag>)}
                  </Space>
                )}
              </Space>
            </Card>

            <Card
              className="novel-volume-segment-gate-card"
              title="卷段验收"
              size="small"
              extra={<Button size="small" type={model.volumeSegmentGate.status === 'ready' ? 'link' : 'primary'} onClick={() => onAction(model.volumeSegmentGate.actionKey)}>{actionLabel(model.volumeSegmentGate.actionKey)}</Button>}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color={volumeBeatColor(model.volumeSegmentGate.status)} bordered={false}>
                    {model.volumeSegmentGate.label}
                  </Tag>
                  <Tag bordered={false}>{model.volumeSegmentGate.currentSegmentLabel}</Tag>
                  <Tag bordered={false}>进度 {model.volumeSegmentGate.chapterProgress.written}/{model.volumeSegmentGate.chapterProgress.total}</Tag>
                  <Tag color={retentionColor(model.volumeSegmentGate.score)} bordered={false}>{model.volumeSegmentGate.score} 分</Tag>
                </Space>
                <Progress percent={model.volumeSegmentGate.chapterProgress.percent} size="small" showInfo={false} />
                <Text type="secondary">{model.volumeSegmentGate.summary}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  验收项：阶段目标 / 高潮/回报 / 读者信任 / 创新/IP化 / 风险闭环
                </Text>
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
                  {model.volumeSegmentGate.signals.map(signal => (
                    <button
                      key={signal.key}
                      type="button"
                      onClick={() => onAction(signal.actionKey)}
                      style={{
                        border: '1px solid #edf0f5',
                        borderRadius: 8,
                        padding: '10px 12px',
                        background: signal.status === 'ok' ? '#fff' : signal.status === 'block' ? '#fff1f0' : '#fffbeb',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        font: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color={governanceColor(signal.status)} bordered={false}>{signal.label}</Tag>
                          {signal.count > 0 && <Tag bordered={false}>{signal.count}</Tag>}
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>{signal.detail}</Text>
                      </Space>
                    </button>
                  ))}
                </div>
                {model.volumeSegmentGate.nextActions.length > 0 && (
                  <Space wrap>
                    {model.volumeSegmentGate.nextActions.map(action => <Tag key={action} bordered={false}>{action}</Tag>)}
                  </Space>
                )}
              </Space>
            </Card>

            <Card
              className="novel-story-pressure-ladder-card"
              title="故事压力阶梯"
              size="small"
              extra={<Button size="small" type={model.storyPressureLadder.status === 'ready' ? 'link' : 'primary'} onClick={() => onAction(model.storyPressureLadder.actionKey)}>{actionLabel(model.storyPressureLadder.actionKey)}</Button>}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color={storyPressureColor(model.storyPressureLadder.status)} bordered={false}>
                    {model.storyPressureLadder.label}
                  </Tag>
                  <Tag bordered={false}>{model.storyPressureLadder.chapterRangeLabel}</Tag>
                  <Tag color={retentionColor(model.storyPressureLadder.score)} bordered={false}>{model.storyPressureLadder.score} 分</Tag>
                </Space>
                <Text type="secondary">{model.storyPressureLadder.summary}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  监控项：压力源 / 冲突升级 / 赌注升级 / 反转逼迫
                </Text>
                {model.storyPressureLadder.pressureSources.length > 0 && (
                  <Space wrap>
                    {model.storyPressureLadder.pressureSources.map(source => (
                      <Tag key={`${source.label}-${source.count}`} color={source.riskLevel === 'warn' ? 'gold' : 'blue'} bordered={false}>
                        {source.label} {source.count}次
                      </Tag>
                    ))}
                  </Space>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                  {model.storyPressureLadder.signals.map(signal => (
                    <button
                      key={signal.key}
                      type="button"
                      onClick={() => onAction(signal.actionKey)}
                      style={{
                        border: '1px solid #edf0f5',
                        borderRadius: 8,
                        padding: '10px 12px',
                        background: signal.status === 'ok' ? '#fff' : signal.status === 'block' ? '#fff1f0' : '#fffbeb',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        font: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color={storyPressureColor(signal.status)} bordered={false}>{signal.label}</Tag>
                          {signal.count > 0 && <Tag bordered={false}>{signal.count}</Tag>}
                        </Space>
                        <Progress percent={signal.score} size="small" showInfo={false} strokeColor={signal.status === 'ok' ? '#52c41a' : signal.status === 'block' ? '#ff4d4f' : '#faad14'} />
                        <Text type="secondary" style={{ fontSize: 12 }}>{signal.detail}</Text>
                      </Space>
                    </button>
                  ))}
                </div>
                {model.storyPressureLadder.nextActions.length > 0 && (
                  <Space wrap>
                    {model.storyPressureLadder.nextActions.map(action => <Tag key={action} bordered={false}>{action}</Tag>)}
                  </Space>
                )}
              </Space>
            </Card>

            <Card
              className="novel-story-unit-workshop-card"
              title="剧情单元工坊"
              size="small"
              extra={<Button size="small" type={model.storyUnitWorkshop.status === 'ready' ? 'link' : 'primary'} onClick={() => onAction(model.storyUnitWorkshop.actionKey)}>{actionLabel(model.storyUnitWorkshop.actionKey)}</Button>}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color={storyUnitColor(model.storyUnitWorkshop.status)} bordered={false}>
                    {model.storyUnitWorkshop.label}
                  </Tag>
                  <Tag bordered={false}>{model.storyUnitWorkshop.currentUnit.chapterRangeLabel}</Tag>
                  <Tag color={retentionColor(model.storyUnitWorkshop.score)} bordered={false}>{model.storyUnitWorkshop.score} 分</Tag>
                </Space>
                <Text type="secondary">{model.storyUnitWorkshop.summary}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  监控项：入口钩子 / 压力升级 / 小高潮/回报 / 伏笔/剧情线 / 出单元钩子
                </Text>
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
                  {model.storyUnitWorkshop.currentUnit.signals.map(signal => (
                    <button
                      key={signal.key}
                      type="button"
                      onClick={() => onAction(signal.actionKey)}
                      style={{
                        border: '1px solid #edf0f5',
                        borderRadius: 8,
                        padding: '10px 12px',
                        background: signal.status === 'ok' ? '#fff' : signal.status === 'block' ? '#fff1f0' : '#fffbeb',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        font: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color={storyUnitColor(signal.status)} bordered={false}>{signal.label}</Tag>
                          {signal.count > 0 && <Tag bordered={false}>{signal.count}</Tag>}
                        </Space>
                        <Progress percent={signal.score} size="small" showInfo={false} strokeColor={signal.status === 'ok' ? '#52c41a' : signal.status === 'block' ? '#ff4d4f' : '#faad14'} />
                        <Text type="secondary" style={{ fontSize: 12 }}>{signal.detail}</Text>
                      </Space>
                    </button>
                  ))}
                </div>
                {model.storyUnitWorkshop.currentUnit.chapters.length > 0 && (
                  <div style={{ display: 'grid', gap: 6 }}>
                    {model.storyUnitWorkshop.currentUnit.chapters.map(chapter => (
                      <button
                        key={`${chapter.chapterNo}-${chapter.title}`}
                        type="button"
                        onClick={() => onSelectChapter(chapter.chapterNo)}
                        style={{
                          border: '1px solid #edf0f5',
                          borderRadius: 8,
                          padding: '8px 10px',
                          background: '#fff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                          font: 'inherit',
                          color: 'inherit',
                        }}
                      >
                        <Space wrap>
                          <Tag color="blue" bordered={false}>第{chapter.chapterNo}章</Tag>
                          <Tag bordered={false}>{chapter.role}</Tag>
                          <Text strong>{chapter.title}</Text>
                          <Text type="secondary">{chapter.goal || '未设置章节职责'}</Text>
                        </Space>
                      </button>
                    ))}
                  </div>
                )}
                {model.storyUnitWorkshop.nextActions.length > 0 && (
                  <Space wrap>
                    {model.storyUnitWorkshop.nextActions.map(action => <Tag key={action} bordered={false}>{action}</Tag>)}
                  </Space>
                )}
              </Space>
            </Card>

            <Card
              className="novel-recent-fatigue-radar-card"
              title="近10章疲劳雷达"
              size="small"
              extra={<Button size="small" type={model.recentFatigueRadar.status === 'ready' ? 'link' : 'primary'} onClick={() => onAction(model.recentFatigueRadar.actionKey)}>{actionLabel(model.recentFatigueRadar.actionKey)}</Button>}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color={fatigueRadarColor(model.recentFatigueRadar.status)} bordered={false}>
                    {model.recentFatigueRadar.label}
                  </Tag>
                  <Tag bordered={false}>{model.recentFatigueRadar.chapterRangeLabel}</Tag>
                  <Tag color={retentionColor(model.recentFatigueRadar.score)} bordered={false}>{model.recentFatigueRadar.score} 分</Tag>
                </Space>
                <Text type="secondary">{model.recentFatigueRadar.summary}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  监控项：冲突变化 / 回报变化 / 钩子变化 / 场面新鲜度
                </Text>
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
                  {model.recentFatigueRadar.signals.map(signal => (
                    <button
                      key={signal.key}
                      type="button"
                      onClick={() => onAction(signal.actionKey)}
                      style={{
                        border: '1px solid #edf0f5',
                        borderRadius: 8,
                        padding: '10px 12px',
                        background: signal.status === 'ok' ? '#fff' : '#fffbeb',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        font: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color={fatigueRadarColor(signal.status)} bordered={false}>{signal.label}</Tag>
                          {signal.count > 0 && <Tag bordered={false}>{signal.count}</Tag>}
                        </Space>
                        <Progress percent={signal.score} size="small" showInfo={false} strokeColor={signal.status === 'ok' ? '#52c41a' : '#faad14'} />
                        <Text type="secondary" style={{ fontSize: 12 }}>{signal.detail}</Text>
                      </Space>
                    </button>
                  ))}
                </div>
                {model.recentFatigueRadar.nextActions.length > 0 && (
                  <Space wrap>
                    {model.recentFatigueRadar.nextActions.map(action => <Tag key={action} bordered={false}>{action}</Tag>)}
                  </Space>
                )}
              </Space>
            </Card>

            <Card
              className="novel-character-arc-board-card"
              title="人物成长看板"
              size="small"
              extra={<Button size="small" type={model.characterArcBoard.status === 'ready' ? 'link' : 'primary'} onClick={() => onAction(model.characterArcBoard.actionKey)}>{actionLabel(model.characterArcBoard.actionKey)}</Button>}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color={characterArcBoardColor(model.characterArcBoard.status)} bordered={false}>
                    {model.characterArcBoard.status === 'missing' ? '未建立' : model.characterArcBoard.status === 'ready' ? '成长稳定' : '需要治理'}
                  </Tag>
                  <Tag bordered={false}>人物线 {model.characterArcBoard.total}</Tag>
                  {model.characterArcBoard.overdueCount > 0 && <Tag color="red" bordered={false}>成长断档 {model.characterArcBoard.overdueCount}</Tag>}
                  {model.characterArcBoard.relationshipRiskCount > 0 && <Tag color="gold" bordered={false}>关系待推进 {model.characterArcBoard.relationshipRiskCount}</Tag>}
                  {model.characterArcBoard.growthGapCount > 0 && <Tag color="volcano" bordered={false}>弧光缺口 {model.characterArcBoard.growthGapCount}</Tag>}
                </Space>
                <Text type="secondary">{model.characterArcBoard.summary}</Text>
                {model.characterArcBoard.arcs.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="在资料设定中补齐角色线和关系线" />
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                    {model.characterArcBoard.arcs.map(item => (
                      <div
                        key={`${item.entityType}-${item.id}-${item.name}`}
                        style={{
                          border: '1px solid #e8edf3',
                          borderRadius: 8,
                          padding: '10px 12px',
                          background: '#fff',
                          textAlign: 'left',
                          width: '100%',
                          font: 'inherit',
                          color: 'inherit',
                        }}
                      >
                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                          <Space wrap>
                            <Text strong>{item.name}</Text>
                            <Tag color={item.entityType === 'relationship_arc' ? 'purple' : 'blue'} bordered={false}>{item.typeLabel}</Tag>
                            {item.priority && <Tag bordered={false}>{item.priority}</Tag>}
                            {item.riskTags.map(tag => (
                              <Tag key={tag} color={tag === '成长断档' || tag === '弧光缺口' ? 'red' : tag === '关系待推进' ? 'gold' : 'blue'} bordered={false}>
                                {tag}
                              </Tag>
                            ))}
                          </Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            最近：{item.lastAdvancedChapter ? `第${item.lastAdvancedChapter}章` : '未标注'} · 下次：{item.nextAdvanceChapter ? `第${item.nextAdvanceChapter}章` : '未标注'} · 角色：{item.relatedNames.join('、') || '未标注'}
                          </Text>
                          <Text>{item.summary || item.currentState || '未填写人物线简介'}</Text>
                          {(item.desire || item.flawPressure || item.growthTarget || item.relationshipShift) && (
                            <Space direction="vertical" size={2} style={{ width: '100%' }}>
                              {item.desire && <Text type="secondary" style={{ fontSize: 12 }}>欲望：{item.desire}</Text>}
                              {item.flawPressure && <Text type="secondary" style={{ fontSize: 12 }}>缺陷受压：{item.flawPressure}</Text>}
                              {item.growthTarget && <Text type="secondary" style={{ fontSize: 12 }}>成长节点：{item.growthTarget}</Text>}
                              {item.relationshipShift && <Text type="secondary" style={{ fontSize: 12 }}>关系变化：{item.relationshipShift}</Text>}
                            </Space>
                          )}
                          <Space wrap>
                            {item.voiceAnchor && <Tag bordered={false}>口吻锚点</Tag>}
                            {item.forbiddenReveal && <Tag color="red" bordered={false}>禁揭</Tag>}
                            <Button size="small" type="link" style={{ paddingInline: 0 }} onClick={() => onSelectChapter(item.actionChapterNo)}>
                              跳到第{item.actionChapterNo}章
                            </Button>
                          </Space>
                          {item.latestEvidence.length > 0 && (
                            <details className="novel-character-arc-evidence" style={{ marginTop: 4 }}>
                              <summary style={{ cursor: 'pointer', color: '#475569', fontSize: 12, fontWeight: 650 }}>人物弧光证据</summary>
                              <Space direction="vertical" size={4} style={{ width: '100%', marginTop: 8 }}>
                                {item.latestEvidence.map(evidence => <Text key={evidence} style={{ fontSize: 12 }}>{evidence}</Text>)}
                              </Space>
                            </details>
                          )}
                        </Space>
                      </div>
                    ))}
                  </div>
                )}
              </Space>
            </Card>

            <Card
              className="novel-storyline-board-card"
              title="剧情线看板"
              size="small"
              extra={(
                <Space>
                  <Button size="small" type="link" onClick={() => onAction('create_storyline_decision_tasks')}>生成决策任务</Button>
                  <Button size="small" type="link" onClick={() => onAction('open_story_assets')}>管理剧情线</Button>
                </Space>
              )}
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Space wrap>
                  <Tag color={storylineStatusColor(model.storylineBoard.status)} bordered={false}>
                    {model.storylineBoard.status === 'missing' ? '未建立' : model.storylineBoard.status === 'ready' ? '调度正常' : '需要调度'}
                  </Tag>
                  <Tag bordered={false}>剧情线 {model.storylineBoard.total}</Tag>
                  {model.storylineBoard.overdueCount > 0 && <Tag color="red" bordered={false}>逾期未推 {model.storylineBoard.overdueCount}</Tag>}
                  {model.storylineBoard.debtCount > 0 && <Tag color="purple" bordered={false}>回收债务 {model.storylineBoard.debtCount}</Tag>}
                  {model.storylineBoard.retentionRiskCount > 0 && <Tag color="gold" bordered={false}>影响留存 {model.storylineBoard.retentionRiskCount}</Tag>}
                </Space>
                <Text type="secondary">{model.storylineBoard.summary}</Text>
                {model.storylineBoard.groups.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="在资料设定中补齐主线、支线、角色线、关系线、势力线和伏笔线" />
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {model.storylineBoard.groups.map(group => (
                      <div key={group.key} style={{ border: '1px solid #edf0f5', borderRadius: 8, background: '#fbfcfe', padding: 10 }}>
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                          <Space wrap>
                            <Text strong>{group.label}</Text>
                            <Tag bordered={false}>{group.count} 条</Tag>
                          </Space>
                          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                            {group.items.map(item => (
                              <div
                                key={`${item.entityType}-${item.id}-${item.name}`}
                                style={{
                                  border: '1px solid #e8edf3',
                                  borderRadius: 8,
                                  padding: '10px 12px',
                                  background: '#fff',
                                  textAlign: 'left',
                                  width: '100%',
                                  font: 'inherit',
                                  color: 'inherit',
                                }}
                              >
                                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                  <Space wrap>
                                    <Text strong>{item.name}</Text>
                                    <Tag color={item.priority === 'high' ? 'red' : item.priority === 'medium' ? 'gold' : 'default'} bordered={false}>
                                      {item.priority}
                                    </Tag>
                                    {item.riskTags.map(tag => <Tag key={tag} color={storylineRiskColor(tag)} bordered={false}>{tag}</Tag>)}
                                  </Space>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    最近：{item.lastAdvancedChapter ? `第${item.lastAdvancedChapter}章` : '未标注'} · 下次：{item.nextAdvanceChapter ? `第${item.nextAdvanceChapter}章` : '未标注'} · 范围：{item.startChapter ? `第${item.startChapter}` : '?'}-{item.endChapter ? `${item.endChapter}章` : '?'}
                                  </Text>
                                  <Text>{item.summary || item.status || '未填写简介'}</Text>
                                  {(item.retentionImpacts.length > 0 || item.forbiddenReveal) && (
                                    <Space wrap>
                                      {item.retentionImpacts.slice(0, 3).map(label => <Tag key={label} color="gold" bordered={false}>留存风险 {label}</Tag>)}
                                      {item.forbiddenReveal && <Tag color="red" bordered={false}>禁揭</Tag>}
                                    </Space>
                                  )}
                                  <Space wrap>
                                    {item.latestSyncChapter && <Tag color="blue" bordered={false}>复盘到第{item.latestSyncChapter}章</Tag>}
                                    {item.syncRisks.map(risk => <Tag key={risk} color={risk.includes('禁揭') ? 'red' : 'gold'} bordered={false}>{risk}</Tag>)}
                                    <Button size="small" type="link" style={{ paddingInline: 0 }} onClick={() => onSelectChapter(item.actionChapterNo)}>
                                      跳到第{item.actionChapterNo}章
                                    </Button>
                                  </Space>
                                  {(item.planEvidence.length > 0 || item.actualEvidence.length > 0 || item.diffEvidence.length > 0 || item.syncRisks.length > 0) && (
                                    <details className="novel-storyline-evidence" style={{ marginTop: 4 }}>
                                      <summary style={{ cursor: 'pointer', color: '#475569', fontSize: 12, fontWeight: 650 }}>剧情线证据</summary>
                                      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                                        <div style={{ border: '1px solid #edf0f5', borderRadius: 6, padding: 8, background: '#fbfcfe' }}>
                                          <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>计划推进</Text>
                                          {renderStorylineEvidenceRows(item.planEvidence, '暂无计划推进证据')}
                                        </div>
                                        <div style={{ border: '1px solid #edf0f5', borderRadius: 6, padding: 8, background: '#fbfcfe' }}>
                                          <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>实际推进</Text>
                                          {renderStorylineEvidenceRows(item.actualEvidence, '暂无实际推进证据')}
                                        </div>
                                        <div style={{ border: '1px solid #edf0f5', borderRadius: 6, padding: 8, background: '#fff7ed' }}>
                                          <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>差异复盘</Text>
                                          {item.syncRisks.length
                                            ? <Space wrap>{item.syncRisks.map(risk => <Tag key={risk} color={risk.includes('禁揭') ? 'red' : 'gold'} bordered={false}>{risk}</Tag>)}</Space>
                                            : <Text type="secondary" style={{ fontSize: 12 }}>暂无差异风险</Text>}
                                        </div>
                                        <div style={{ border: '1px solid #fed7aa', borderRadius: 6, padding: 8, background: '#fffbeb' }}>
                                          <Text strong style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>差异决策</Text>
                                          <Text type="secondary" style={{ display: 'block', marginBottom: 6, fontSize: 12 }}>
                                            动作口径：漏推回修正文，额外推进接受为新计划，禁揭风险先核对后标记误判或回修。
                                          </Text>
                                          {renderStorylineDiffRows(item.diffEvidence, onAction)}
                                        </div>
                                      </div>
                                    </details>
                                  )}
                                </Space>
                              </div>
                            ))}
                          </div>
                        </Space>
                      </div>
                    ))}
                  </div>
                )}
              </Space>
            </Card>

            <Card title="主线与分卷推进" size="small">
              <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <Alert type="info" showIcon message="全书主线承诺" description={model.mainline.readerPromise || '未设置'} />
                <Alert
                  type={model.mainline.currentChapterServesVolume ? 'success' : 'warning'}
                  showIcon
                  message="当前章服务卷目标"
                  description={model.mainline.currentChapterServesVolume ? '当前章已有主线推进证据。' : '当前章任务或卷目标不足，需要先补规划。'}
                />
                {[
                  ['当前卷目标', model.mainline.currentVolumeGoal],
                  ['当前阶段冲突', model.mainline.currentStageConflict],
                  ['本阶段爽点模型', model.mainline.payoffModel],
                  ['关键转折', `上一转折：${model.mainline.previousTurn || '未标注'}\n下一转折：${model.mainline.nextTurn || '未标注'}`],
                ].map(([label, value]) => (
                  <div key={label} style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fbfcfe' }}>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>{label}</Text>
                    <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{value || '未设置'}</Paragraph>
                  </div>
                ))}
              </div>
              {model.mainline.risks.length > 0 && (
                <Space wrap style={{ marginTop: 12 }}>
                  {model.mainline.risks.map(risk => <Tag key={risk} color="red" bordered={false}>{risk}</Tag>)}
                </Space>
              )}
            </Card>

            <Card
              title="未来 10 章路线"
              size="small"
              extra={<Button size="small" type="link" onClick={() => onAction('open_outline_tree')}>查看完整大纲</Button>}
            >
              {model.futureRoute.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无未来章节路线" />
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {model.futureRoute.map(row => (
                    <button
                      key={`${row.chapterNo}-${row.title}`}
                      type="button"
                      onClick={() => onSelectChapter(row.chapterNo)}
                      style={{
                        border: '1px solid #edf0f5',
                        borderRadius: 8,
                        padding: '10px 12px',
                        background: '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        font: 'inherit',
                        color: 'inherit',
                      }}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color="blue" bordered={false}>第{row.chapterNo}章</Tag>
                          <Text strong>{row.title || '无标题'}</Text>
                          {row.riskTags.map(tag => <Tag key={tag} color="gold" bordered={false}>{tag}</Tag>)}
                        </Space>
                        <Text>{row.chapterTask || '未设置章节任务'}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          主线：{row.mainlineProgress || '未标注'} · 冲突：{row.conflict || '未设置'} · 钩子：{row.endingHook || '未设置'}
                        </Text>
                      </Space>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            <Card title="分卷结构" size="small">
              {model.volumeTree.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无分卷结构" />
              ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                  {model.volumeTree.map(node => renderVolumeNode(node))}
                </div>
              )}
            </Card>
          </Space>

          <Space direction="vertical" size={16} style={{ minWidth: 0 }}>
            <Card title="规划健康" size="small">
              {model.healthIssues.length === 0 ? (
                <Alert type="success" showIcon icon={<CheckCircleOutlined />} message="主线规划暂未发现明显风险" />
              ) : (
                <Space direction="vertical" size={10} style={{ width: '100%' }}>
                  {model.healthIssues.map(issue => (
                    <div
                      key={issue.key}
                      style={{ border: '1px solid #edf0f5', borderRadius: 8, padding: '10px 12px', background: '#fff' }}
                    >
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space>
                          <ExclamationCircleOutlined style={{ color: issueIconColor(issue.severity) }} />
                          <Text strong>{issue.title}</Text>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>{issue.detail}</Text>
                        <Button size="small" block onClick={() => onAction(issue.actionKey)}>{actionLabel(issue.actionKey)}</Button>
                      </Space>
                    </div>
                  ))}
                </Space>
              )}
            </Card>

            <Card title="低频规划入口" size="small">
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Tooltip title="检查未来 100 章骨架是否覆盖长线节奏">
                  <Button block icon={<FileSearchOutlined />} loading={loadingKey === 'future100Audit'} onClick={() => onAction('future100_audit')}>
                    未来100章骨架检查
                  </Button>
                </Tooltip>
                <Button block type="primary" icon={<ThunderboltOutlined />} loading={loadingKey === 'future100Generate'} onClick={() => onAction('future100_generate')}>
                  AI 生成未来100章骨架
                </Button>
                <Button block loading={loadingKey === 'longformPressure'} onClick={() => onAction('longform_pressure')}>300万字长线压力测试</Button>
                <Button block loading={loadingKey === 'topic'} onClick={() => onAction('topic_validation')}>原创选题验证</Button>
                <Button block loading={loadingKey === 'referenceDiagnosis'} onClick={() => onAction('reference_diagnosis')}>参考知识诊断</Button>
              </Space>
            </Card>

          </Space>
        </div>
      </div>
    </div>
  )
}
