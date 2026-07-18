import React from 'react'
import { Space, Tag, Typography } from 'antd'

const { Text } = Typography

export function SerialPipelineStrip(props: {
  model: any
}) {
  const serialPipelineModel = props.model
  if (!serialPipelineModel.visible) return null
  const repairGuide = serialPipelineModel.repairGuide
  const tagColor = (tone: string) => {
    if (tone === 'done') return 'green'
    if (tone === 'active') return 'blue'
    if (tone === 'blocked') return 'red'
    return 'default'
  }

  return (
    <div className="novel-serial-pipeline">
      <div className="novel-serial-pipeline-main">
        <Space direction="vertical" size={2} className="novel-serial-pipeline-copy">
          <Text strong>小说流水线 · {serialPipelineModel.currentStageLabel || '待同步'}</Text>
          <Text type="secondary">{serialPipelineModel.summary || '按创建契约、规划、正文、验收、批次、治理推进。'}</Text>
        </Space>
        <Tag color={tagColor(serialPipelineModel.primaryAction.tone || 'active')} bordered={false}>
          下一步：{serialPipelineModel.primaryAction.label || '查看下一步'}
        </Tag>
      </div>
      {repairGuide && (
        <div className={`novel-serial-pipeline-guide is-${repairGuide.severity}`}>
          <div className="novel-serial-pipeline-guide-head">
            <Tag
              color={repairGuide.severity === 'blocked' ? 'red' : repairGuide.severity === 'warning' ? 'gold' : repairGuide.severity === 'ready' ? 'green' : 'blue'}
              bordered={false}
            >
              {repairGuide.title}
            </Tag>
            <Text strong>{repairGuide.blockerLabel}</Text>
          </div>
          <div className="novel-serial-pipeline-guide-steps">
            <div className="novel-serial-pipeline-guide-step">
              <span>当前卡点</span>
              <strong>{repairGuide.reason}</strong>
            </div>
            <div className="novel-serial-pipeline-guide-step">
              <span>去哪里修</span>
              <strong>{repairGuide.repairAreaLabel} · {repairGuide.repairActionLabel}</strong>
            </div>
            <div className="novel-serial-pipeline-guide-step">
              <span>修完验证</span>
              <strong>{repairGuide.verificationLabel}</strong>
            </div>
          </div>
        </div>
      )}
      {!repairGuide && serialPipelineModel.currentIssues.length > 0 && (
        <div className="novel-serial-pipeline-issues">
          {serialPipelineModel.currentIssues.map(issue => (
            <span key={`${issue.status}-${issue.label}`} className={`novel-serial-pipeline-issue is-${issue.status}`}>
              <strong>{issue.label}</strong>
              <span>{issue.detail}</span>
            </span>
          ))}
        </div>
      )}
      {!repairGuide && serialPipelineModel.currentAgentSteps.length > 0 && (
        <div className="novel-serial-pipeline-agent-strip" aria-label="当前阶段能力链">
          {serialPipelineModel.currentAgentSteps.map(agent => (
            <span
              key={agent.key}
              className="novel-serial-pipeline-agent"
              title={agent.description}
            >
              <span className="novel-serial-pipeline-agent-name">{agent.label}</span>
              {agent.agent && <span className="novel-serial-pipeline-agent-id">{agent.agent}</span>}
            </span>
          ))}
        </div>
      )}
      <div className="novel-serial-pipeline-stages">
        {serialPipelineModel.stageCards.map(stage => (
          <div
            key={stage.key}
            className={`novel-serial-pipeline-stage is-${stage.tone}`}
            title={stage.summary}
          >
            <span className="novel-serial-pipeline-stage-label">{stage.label}</span>
            <Tag color={tagColor(stage.tone)} bordered={false}>
              {stage.statusLabel}
            </Tag>
            {(stage.blockerCount > 0 || stage.warningCount > 0) && (
              <span className="novel-serial-pipeline-stage-risk">
                {stage.blockerCount ? `阻${stage.blockerCount}` : `提${stage.warningCount}`}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
