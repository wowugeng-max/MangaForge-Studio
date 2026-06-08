import React from 'react'
import { Alert, Button, Progress, Space, Tag, Tooltip, Typography } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FireOutlined,
  FundProjectionScreenOutlined,
  LoadingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import type {
  AutoCreationContractStatus,
  AutoCreationDirectorAction,
  AutoCreationDirectorModel,
  AutoCreationPipelineStatus,
} from './autoCreationDirectorModel'
import './AutoCreationDirectorWorkspace.css'

const { Text, Paragraph, Title } = Typography

export type AutoCreationDirectorWorkspaceProps = {
  model: AutoCreationDirectorModel
  loadingActionKey?: string
  onAction: (action: AutoCreationDirectorAction) => void
  onSelectChapter: (chapterNo: number) => void
}

function statusColor(status: AutoCreationDirectorModel['status']) {
  if (status === 'running') return 'blue'
  if (status === 'ready') return 'green'
  if (status === 'needs_acceptance') return 'purple'
  if (status === 'needs_governance') return 'gold'
  return 'red'
}

function pipelineColor(status: AutoCreationPipelineStatus) {
  if (status === 'done') return '#16a34a'
  if (status === 'active') return '#1677ff'
  if (status === 'blocked') return '#dc2626'
  if (status === 'warning') return '#d97706'
  return '#94a3b8'
}

function pipelineIcon(status: AutoCreationPipelineStatus) {
  if (status === 'done') return <CheckCircleOutlined />
  if (status === 'active') return <LoadingOutlined />
  if (status === 'blocked') return <ExclamationCircleOutlined />
  if (status === 'warning') return <ExclamationCircleOutlined />
  return <ClockCircleOutlined />
}

function contractColor(status: AutoCreationContractStatus) {
  if (status === 'ok') return 'green'
  if (status === 'block') return 'red'
  return 'gold'
}

function contractLabel(status: AutoCreationContractStatus) {
  if (status === 'ok') return '达标'
  if (status === 'block') return '阻塞'
  return '需关注'
}

function formatWords(value: number) {
  if (!value) return '0'
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return String(value)
}

function actionClass(action: AutoCreationDirectorAction, primary = false) {
  return [
    primary ? 'auto-director-primary-action' : 'auto-director-secondary-action',
    action.modelCall ? 'auto-director-model-action' : '',
  ].filter(Boolean).join(' ')
}

function ActionButton({
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
  const key = String(action.key)
  const loading = loadingActionKey === key
  const busyElsewhere = Boolean(loadingActionKey && !loading)
  const button = (
    <Button
      type={primary ? 'primary' : 'default'}
      className={actionClass(action, primary)}
      icon={action.modelCall ? <ThunderboltOutlined /> : undefined}
      loading={loading}
      disabled={action.disabled || busyElsewhere}
      onClick={() => onAction(action)}
    >
      {action.label}
    </Button>
  )
  if (!action.description) return button
  return <Tooltip title={action.description}>{button}</Tooltip>
}

export function AutoCreationDirectorWorkspace({
  model,
  loadingActionKey,
  onAction,
  onSelectChapter,
}: AutoCreationDirectorWorkspaceProps) {
  const targetPercent = model.metrics.targetWords > 0
    ? Math.min(100, Math.round((model.metrics.writtenWords / model.metrics.targetWords) * 100))
    : 0
  const activeStep = model.pipeline.find(step => step.status === 'active')

  return (
    <div className="auto-director-shell">
      <div className={`auto-director-hero auto-director-hero-${model.status}`}>
        <div className="auto-director-hero-copy">
          <Space wrap size={[8, 6]}>
            <Tag color={statusColor(model.status)} bordered={false}>{model.statusLabel}</Tag>
            <Tag bordered={false}>未来10章 {model.metrics.future10Label}</Tag>
            {model.metrics.first30Score !== null && <Tag bordered={false}>前30章 {model.metrics.first30Score}分</Tag>}
            <Tag bordered={false}>剧情线 {model.metrics.storylineCount}</Tag>
          </Space>
          <Title level={4}>自动创作总控台</Title>
          <Text className="auto-director-headline">{model.headline}</Text>
          <Paragraph className="auto-director-summary">{model.summary}</Paragraph>
          {model.targetChapter ? (
            <button
              type="button"
              className="auto-director-target"
              onClick={() => onSelectChapter(model.targetChapter?.chapterNo || 0)}
            >
              <span>当前目标</span>
              <strong>第 {model.targetChapter.chapterNo} 章 · {model.targetChapter.title}</strong>
              <em>{model.targetChapter.hasProse ? `${model.targetChapter.wordCount} 字，进入交稿` : '未生成正文，等待开写'}</em>
            </button>
          ) : (
            <Alert type="warning" showIcon message="还没有可写章节" description="先补齐大纲或创建章节，再进入自动创作链路。" />
          )}
        </div>

        <div className="auto-director-next-card">
          <div className="auto-director-next-eyebrow">
            <FireOutlined />
            <span>唯一下一步</span>
          </div>
          <Text strong>{model.mainAction.label}</Text>
          <Paragraph>{model.mainAction.description}</Paragraph>
          <ActionButton
            primary
            action={model.mainAction}
            loadingActionKey={loadingActionKey}
            onAction={onAction}
          />
          {model.mainAction.modelCall && <Text className="auto-director-model-note">会调用大模型，长文本任务保持流式/后台任务执行。</Text>}
        </div>
      </div>

      <section className="auto-director-panel auto-director-contract-panel">
        <div className="auto-director-panel-title">
          <CheckCircleOutlined />
          <span>长篇创作契约</span>
          <Tag bordered={false}>核心不偏 · 故事强度 · 创新差异 · 读者吸引</Tag>
        </div>
        <div className="auto-director-contract-grid">
          {model.creationContract.map(item => (
            <button
              key={item.key}
              type="button"
              className={`auto-director-contract-item auto-director-contract-${item.status}`}
              onClick={() => onAction({
                area: item.key === 'core' ? 'assets' : 'planning',
                key: item.actionKey,
                label: item.label,
                description: item.detail,
                modelCall: false,
              })}
            >
              <span className="auto-director-contract-topline">
                <strong>{item.label}</strong>
                <Tag color={contractColor(item.status)} bordered={false}>{contractLabel(item.status)}</Tag>
              </span>
              <Text type="secondary">{item.detail}</Text>
              {item.evidence.length > 0 && (
                <span className="auto-director-contract-evidence">
                  {item.evidence.slice(0, 2).map(evidence => <em key={evidence}>{evidence}</em>)}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <div className="auto-director-grid">
        <section className="auto-director-panel auto-director-pipeline-panel">
          <div className="auto-director-panel-title">
            <FundProjectionScreenOutlined />
            <span>长篇自动创作链路</span>
            {activeStep && <Tag color="blue" bordered={false}>当前：{activeStep.label}</Tag>}
          </div>
          <div className="auto-director-stage-list">
            {model.pipeline.map(step => (
              <div key={step.key} className={`auto-director-stage auto-director-stage-${step.status}`}>
                <div className="auto-director-stage-icon" style={{ color: pipelineColor(step.status) }}>
                  {pipelineIcon(step.status)}
                </div>
                <div className="auto-director-stage-body">
                  <Space wrap size={6}>
                    <Text strong>{step.label}</Text>
                    <Tag color={step.status === 'done' ? 'green' : step.status === 'active' ? 'blue' : step.status === 'blocked' ? 'red' : step.status === 'warning' ? 'gold' : 'default'} bordered={false}>
                      {step.status === 'done' ? '完成' : step.status === 'active' ? '进行中' : step.status === 'blocked' ? '阻塞' : step.status === 'warning' ? '待治理' : '等待'}
                    </Tag>
                  </Space>
                  <Text type="secondary">{step.detail}</Text>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="auto-director-panel auto-director-side-panel">
          <div className="auto-director-panel-title">
            <span>生产状态</span>
          </div>
          <div className="auto-director-metric">
            <Text type="secondary">长篇进度</Text>
            <Text strong>{formatWords(model.metrics.writtenWords)} / {formatWords(model.metrics.targetWords)}</Text>
            <Progress percent={targetPercent} size="small" showInfo={false} />
          </div>
          <div className="auto-director-queue">
            <Space wrap>
              <Tag color={model.queue.activeCount > 0 ? 'blue' : 'default'} bordered={false}>任务 {model.queue.activeCount}</Tag>
              {model.queue.labels.map(label => <Tag key={label} bordered={false}>{label}</Tag>)}
            </Space>
          </div>
          {model.blockers.length > 0 && (
            <Alert
              type="error"
              showIcon
              message="阻塞项"
              description={model.blockers.join('；')}
            />
          )}
          {model.confirmations.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message="需要作者确认"
              description={model.confirmations.join('；')}
            />
          )}
          <div className="auto-director-secondary-actions">
            {model.secondaryActions.map(action => (
              <ActionButton
                key={`${action.area}-${action.key}`}
                action={action}
                loadingActionKey={loadingActionKey}
                onAction={onAction}
              />
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
