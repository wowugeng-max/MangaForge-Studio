import React from 'react'
import { Alert, Button, Card, Space, Tag, Typography } from 'antd'
import {
  BranchesOutlined,
  CheckCircleOutlined,
  EditOutlined,
  NodeIndexOutlined,
  PartitionOutlined,
  RocketOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import type { StoryPlanningBoardPanelsProps } from './story-planning-board-types'

const { Text } = Typography

type ExpandStep = {
  key: string
  step: number
  title: string
  detail: string
  status: 'done' | 'todo' | 'active'
  actionKey: StoryPlanningBoardPanelsProps['onAction'] extends (key: infer K, ...args: any[]) => any ? K : never
  actionLabel: string
  loadingKey?: string
  primary?: boolean
}

function coverageTone(ready: boolean, planned: number, required: number) {
  if (ready) return 'done'
  if (planned > 0) return 'active'
  return 'todo'
}

export function StoryPlanningExpandFlowCard({
  model,
  selectedModelId,
  loadingKey,
  onAction,
  compact,
}: StoryPlanningBoardPanelsProps) {
  const future10 = model.topStatus.future10Coverage
  const future100 = model.topStatus.future100Coverage
  const currentNo = Number(String(model.topStatus.currentChapterLabel || '').match(/\d+/)?.[0] || 0)
  const expandFrom = Math.max(
    Number(future10.missingChapters?.[0] || 0),
    Number(future100.missingChapters?.[0] || 0),
    currentNo > 0 ? currentNo + 1 : 1,
    1,
  )

  const steps: ExpandStep[] = [
    {
      key: 'sync',
      step: 1,
      title: '同步进度',
      detail: '确认故事状态机已跟上最新正文，再扩纲，避免用过期状态生成细纲。',
      status: 'todo',
      actionKey: 'update_story_state',
      actionLabel: '同步故事状态',
    },
    {
      key: 'future100',
      step: 2,
      title: '未来100章骨架',
      detail: `中长线大纲储备 ${future100.label}。建议从第 ${expandFrom} 章起生成骨架，先落近段。`,
      status: coverageTone(future100.ready, future100.planned, future100.required),
      actionKey: 'future100_generate',
      actionLabel: '生成未来100章',
      loadingKey: 'future100Generate',
      primary: !future100.ready,
    },
    {
      key: 'rolling10',
      step: 3,
      title: '未来10章滚动规划',
      detail: `近窗细纲 ${future10.label}。把骨架落成可写的章目标、冲突和钩子。`,
      status: coverageTone(future10.ready, future10.planned, future10.required),
      actionKey: 'update_rolling_plan',
      actionLabel: '更新滚动规划',
      loadingKey: 'rollingPlan',
      primary: future100.ready && !future10.ready,
    },
    {
      key: 'volume',
      step: 4,
      title: '补当前卷规划',
      detail: `${model.topStatus.currentVolume} · ${model.volumeBeatBudget.summary}`,
      status: model.volumeBeatBudget.status === 'ready' ? 'done' : model.volumeBeatBudget.status === 'needs_attention' ? 'active' : 'todo',
      actionKey: 'complete_volume_plan',
      actionLabel: '补齐当前卷',
    },
    {
      key: 'tree',
      step: 5,
      title: '核对大纲树',
      detail: '检查卷/章层级是否连贯，避免回退已关闭线。',
      status: 'todo',
      actionKey: 'open_outline_tree',
      actionLabel: '查看大纲树',
    },
    {
      key: 'write',
      step: 6,
      title: '进入写作',
      detail: '细纲就绪后回到写作台：场景卡 → 正文 → 复检 → 状态同步。',
      status: future10.ready ? 'active' : 'todo',
      actionKey: 'enter_chapter_writing',
      actionLabel: '进入写作',
    },
  ]

  const recommended = model.creationPipeline.primaryAction

  const statusColor = (status: ExpandStep['status']) => {
    if (status === 'done') return 'green'
    if (status === 'active') return 'gold'
    return 'default'
  }

  const statusIcon = (status: ExpandStep['status']) => {
    if (status === 'done') return <CheckCircleOutlined style={{ color: '#52c41a' }} />
    if (status === 'active') return <RocketOutlined style={{ color: '#faad14' }} />
    return <PartitionOutlined style={{ color: '#94a3b8' }} />
  }

  return (
    <Card
      className="novel-outline-expand-flow-card"
      title="大纲扩写流程"
      size="small"
      extra={(
        <Button
          size="small"
          type="primary"
          disabled={!selectedModelId && recommended.key !== 'enter_chapter_writing' && recommended.key !== 'open_outline_tree' && recommended.key !== 'open_story_assets'}
          loading={Boolean(loadingKey)}
          onClick={() => onAction(recommended.key)}
        >
          当前建议：{recommended.label}
        </Button>
      )}
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Alert
          type={model.creationPipeline.riskCount > 0 ? 'warning' : 'info'}
          showIcon
          message={model.creationPipeline.summary}
          description={`路径：同步进度 → 未来100骨架 → 未来10章细纲 → 卷规划 → 大纲树核对 → 写作。当前卷：${model.topStatus.currentVolume}；近窗 ${future10.planned}/${future10.required}；远景 ${future100.planned}/${future100.required}。`}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: compact ? '1fr' : 'repeat(3, minmax(0, 1fr))',
            gap: 10,
          }}
        >
          {steps.map(step => (
            <div
              key={step.key}
              style={{
                border: '1px solid #edf0f5',
                borderRadius: 10,
                padding: 12,
                background: step.status === 'done' ? '#f6ffed' : step.status === 'active' || step.primary ? '#fffbe6' : '#fff',
                display: 'grid',
                gap: 8,
              }}
            >
              <Space wrap>
                {statusIcon(step.status)}
                <Tag color="blue" bordered={false}>步骤 {step.step}</Tag>
                <Tag color={statusColor(step.status)} bordered={false}>
                  {step.status === 'done' ? '已具备' : step.status === 'active' ? '待推进' : '可选/待做'}
                </Tag>
              </Space>
              <Text strong>{step.title}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>{step.detail}</Text>
              <Button
                size="small"
                type={step.primary || step.actionKey === recommended.key ? 'primary' : 'default'}
                icon={
                  step.key === 'sync' ? <SyncOutlined />
                    : step.key === 'future100' ? <NodeIndexOutlined />
                      : step.key === 'rolling10' ? <BranchesOutlined />
                        : step.key === 'write' ? <EditOutlined />
                          : <PartitionOutlined />
                }
                loading={Boolean(step.loadingKey && loadingKey === step.loadingKey)}
                disabled={Boolean(step.loadingKey) && !selectedModelId}
                onClick={() => onAction(step.actionKey)}
              >
                {step.actionLabel}
              </Button>
            </div>
          ))}
        </div>
      </Space>
    </Card>
  )
}
