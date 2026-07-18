import React from 'react'
import { Button, Space, Tag } from 'antd'
import { SafetyOutlined } from '@ant-design/icons'
import type { WritingCockpitActionKey, WritingCockpitModel } from '../writingCockpitModel'
import { actionIcon, workflowStageColor, workflowStageStatusLabel } from './panel-utils'

export function LongformWorkflowStrip({
  model,
  loading,
  onAction,
}: {
  model: WritingCockpitModel
  loading: boolean
  onAction: (key: WritingCockpitActionKey) => void
}) {
  const workflow = model.longformWorkflow
  return (
    <div className="writing-cockpit-workflow-strip">
      <div className="writing-cockpit-workflow-head">
        <Space wrap size={[6, 4]}>
          <Tag icon={<SafetyOutlined />} color={workflowStageColor(workflow.currentStage.status)} bordered={false}>
            当前：{workflow.currentStage.label}
          </Tag>
          <Tag bordered={false}>风险 {workflow.riskCount}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {workflow.currentStage.evidence[0] || workflow.currentStage.actionLabel}
          </Text>
        </Space>
        <Button
          size="small"
          loading={loading}
          icon={actionIcon(workflow.primaryAction.key, model.modelTeam.recommendedRole)}
          onClick={() => onAction(workflow.primaryAction.key)}
          style={{ whiteSpace: 'normal', height: 'auto', lineHeight: 1.25 }}
        >
          {workflow.primaryAction.label}
        </Button>
      </div>
      <div className="writing-cockpit-workflow-stages">
        {workflow.stages.map(stage => (
          <button
            key={stage.key}
            type="button"
            className={`writing-cockpit-workflow-stage writing-cockpit-workflow-stage-${stage.status}${stage.key === workflow.currentStage.key ? ' is-current' : ''}`}
            disabled={loading}
            onClick={() => onAction(stage.actionKey)}
            title={stage.evidence.join('；')}
          >
            <span className="writing-cockpit-workflow-stage-top">
              <span>{stage.label}</span>
              <Tag color={workflowStageColor(stage.status)} bordered={false}>{workflowStageStatusLabel(stage.status)}</Tag>
            </span>
            <span className="writing-cockpit-workflow-evidence">
              {stage.evidence.slice(0, 2).join('；')}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
