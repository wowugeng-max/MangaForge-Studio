import React from 'react'
import { Alert, Button, Card, Progress, Space, Tag, Typography } from 'antd'
import type { StoryPlanningBoardPanelsProps } from './story-planning-board-types'
import { creationPipelineColor } from './story-planning-chrome'

const { Text } = Typography

export function StoryPlanningCreationPipelineCard({ model, onAction, compact }: StoryPlanningBoardPanelsProps) {
  return (
    <Card
      className="novel-creation-pipeline-card"
      title="AI长篇创作流水线"
      size="small"
      extra={(
        <Button
          size="small"
          type={model.creationPipeline.riskCount> 0 ? 'primary' : 'default'}
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
  )
}
