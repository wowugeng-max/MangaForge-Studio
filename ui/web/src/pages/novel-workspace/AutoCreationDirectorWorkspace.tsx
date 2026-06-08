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

function rhythmColor(status: string) {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'blocked' || status === 'block') return 'red'
  return 'gold'
}

function rhythmLabel(status: string) {
  if (status === 'ready' || status === 'ok') return '稳定'
  if (status === 'blocked' || status === 'block') return '阻塞'
  return '需治理'
}

function batchColor(status: AutoCreationDirectorModel['batchGuardrail']['status']) {
  if (status === 'ready') return 'green'
  if (status === 'caution') return 'gold'
  return 'red'
}

function batchSignalLabel(status: string) {
  if (status === 'ok') return '通过'
  if (status === 'warn') return '谨慎'
  return '阻塞'
}

function batchReviewColor(status: AutoCreationDirectorModel['batchReviewQueue']['status']) {
  if (status === 'ok' || status === 'done') return 'green'
  if (status === 'warn' || status === 'risk') return 'gold'
  return 'default'
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
            {model.metrics.creationDiagnosisScore !== null && <Tag color="geekblue" bordered={false}>创作诊断 {model.metrics.creationDiagnosisScore}分</Tag>}
            {model.metrics.longformCapacityScore !== null && <Tag color={rhythmColor(model.longformCapacity.status)} bordered={false}>产能 {model.metrics.longformCapacityScore}</Tag>}
            {model.metrics.volumeBeatScore !== null && <Tag color={rhythmColor(model.longformRhythm.status)} bordered={false}>爆点预算 {model.metrics.volumeBeatScore}</Tag>}
            {model.metrics.longformRhythmScore !== null && <Tag color={rhythmColor(model.longformRhythm.status)} bordered={false}>长篇节奏 {model.metrics.longformRhythmScore}</Tag>}
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

      <section className={`auto-director-panel auto-director-compass-panel auto-director-compass-panel-${model.longformCompass.status}`}>
        <div className="auto-director-panel-title">
          <FundProjectionScreenOutlined />
          <span>长篇作品罗盘</span>
          <Tag color={model.longformCompass.status === 'ready' ? 'green' : 'gold'} bordered={false}>{model.longformCompass.label}</Tag>
          <Tag bordered={false}>{model.longformCompass.sourceLabel}</Tag>
        </div>
        <Text className="auto-director-compass-summary">{model.longformCompass.summary}</Text>
        <div className="auto-director-compass-grid">
          {model.longformCompass.axes.map(axis => (
            <div key={axis.key} className={`auto-director-compass-axis auto-director-compass-axis-${axis.locked ? 'locked' : 'flexible'}`}>
              <span>
                <strong>{axis.label}</strong>
                {axis.locked && <Tag color="blue" bordered={false}>不可漂移</Tag>}
              </span>
              <Text>{axis.value}</Text>
            </div>
          ))}
        </div>
        <div className="auto-director-compass-boundaries">
          <div>
            <Text strong>不可漂移</Text>
            {model.longformCompass.immutableRules.slice(0, 4).map(rule => <Text key={rule} type="secondary">{rule}</Text>)}
          </div>
          <div>
            <Text strong>可调整区</Text>
            {model.longformCompass.flexibleZones.slice(0, 4).map(zone => <Text key={zone} type="secondary">{zone}</Text>)}
          </div>
        </div>
      </section>

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

      <section className="auto-director-panel auto-director-rhythm-panel">
        <div className="auto-director-panel-title">
          <FundProjectionScreenOutlined />
          <span>长篇节奏总控</span>
          <Tag color={rhythmColor(model.longformRhythm.status)} bordered={false}>{model.longformRhythm.label}</Tag>
          <Tag bordered={false}>{model.longformRhythm.currentBandLabel}</Tag>
        </div>
        <Text className="auto-director-rhythm-summary">{model.longformRhythm.summary}</Text>
        <div className="auto-director-rhythm-grid">
          {model.longformRhythm.signals.map(signal => (
            <button
              key={signal.key}
              type="button"
              className={`auto-director-rhythm-signal auto-director-rhythm-signal-${signal.status}`}
              onClick={() => onAction({
                area: 'planning',
                key: signal.actionKey,
                label: signal.label,
                description: signal.detail,
                modelCall: false,
              })}
            >
              <span>
                <strong>{signal.label}</strong>
                <Tag color={rhythmColor(signal.status)} bordered={false}>{rhythmLabel(signal.status)}</Tag>
              </span>
              <em>{signal.score}</em>
              <Text type="secondary">{signal.detail}</Text>
            </button>
          ))}
        </div>
      </section>

      <section className={`auto-director-panel auto-director-capacity-panel auto-director-capacity-panel-${model.longformCapacity.status}`}>
        <div className="auto-director-panel-title">
          <FundProjectionScreenOutlined />
          <span>百万字产能</span>
          <Tag color={rhythmColor(model.longformCapacity.status)} bordered={false}>{model.longformCapacity.label}</Tag>
          <Tag bordered={false}>{model.longformCapacity.targetBandLabel}</Tag>
          <Tag bordered={false}>剩余约 {model.longformCapacity.estimatedRemainingChapters} 章</Tag>
        </div>
        <Text className="auto-director-capacity-summary">{model.longformCapacity.summary}</Text>
        <div className="auto-director-capacity-grid">
          {model.longformCapacity.signals.map(signal => (
            <button
              key={signal.key}
              type="button"
              className={`auto-director-capacity-signal auto-director-capacity-signal-${signal.status}`}
              onClick={() => onAction({
                area: 'planning',
                key: signal.actionKey,
                label: signal.label,
                description: signal.detail,
                modelCall: false,
              })}
            >
              <span>
                <strong>{signal.label}</strong>
                <Tag color={signal.status === 'ok' ? 'green' : signal.status === 'warn' ? 'gold' : 'red'} bordered={false}>{batchSignalLabel(signal.status)}</Tag>
              </span>
              <em>{signal.score}</em>
              <Text type="secondary">{signal.detail}</Text>
            </button>
          ))}
        </div>
        {model.longformCapacity.fuelQueue.length > 0 && (
          <div className="auto-director-fuel-queue">
            <Text strong>生产燃料队列</Text>
            <div className="auto-director-fuel-list">
              {model.longformCapacity.fuelQueue.map(item => (
                <div key={item.key} className={`auto-director-fuel-item auto-director-fuel-item-${item.status}`}>
                  <span>
                    <strong>{item.label}</strong>
                    <Text type="secondary">{item.detail}</Text>
                  </span>
                  <ActionButton
                    action={{
                      area: 'planning',
                      key: item.actionKey,
                      label: item.actionLabel,
                      description: item.detail,
                      modelCall: item.modelCall,
                    }}
                    loadingActionKey={loadingActionKey}
                    onAction={onAction}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className={`auto-director-panel auto-director-batch-panel auto-director-batch-panel-${model.batchGuardrail.status}`}>
        <div className="auto-director-panel-title">
          <ThunderboltOutlined />
          <span>连续生产护栏</span>
          <Tag color={batchColor(model.batchGuardrail.status)} bordered={false}>{model.batchGuardrail.label}</Tag>
          <Tag bordered={false}>安全批次 {model.batchGuardrail.safeChapterCount} 章</Tag>
        </div>
        <div className="auto-director-batch-layout">
          <div className="auto-director-batch-summary">
            <Text>{model.batchGuardrail.summary}</Text>
            <ActionButton
              action={model.batchGuardrail.recommendedAction}
              loadingActionKey={loadingActionKey}
              onAction={onAction}
            />
          </div>
          <div className="auto-director-batch-guardrails">
            {model.batchGuardrail.guardrails.map(item => (
              <div key={item.label} className={`auto-director-batch-guardrail auto-director-batch-guardrail-${item.status}`}>
                <span>
                  <strong>{item.label}</strong>
                  <Tag color={item.status === 'ok' ? 'green' : item.status === 'warn' ? 'gold' : 'red'} bordered={false}>
                    {batchSignalLabel(item.status)}
                  </Tag>
                </span>
                <Text type="secondary">{item.detail}</Text>
              </div>
            ))}
          </div>
        </div>
        {model.batchGuardrail.nextBatchBrief.visible && (
          <div className="auto-director-batch-brief">
            <div className="auto-director-batch-brief-head">
              <Text strong>下一批任务书</Text>
              <Tag bordered={false}>{model.batchGuardrail.nextBatchBrief.chapterRangeLabel}</Tag>
            </div>
            <div className="auto-director-batch-brief-grid">
              <div><span>批次目标</span><strong>{model.batchGuardrail.nextBatchBrief.batchGoal}</strong></div>
              <div><span>读者回报</span><strong>{model.batchGuardrail.nextBatchBrief.readerPayoffPlan}</strong></div>
              <div><span>主线焦点</span><strong>{model.batchGuardrail.nextBatchBrief.mainlineFocus}</strong></div>
              <div><span>禁写边界</span><strong>{model.batchGuardrail.nextBatchBrief.forbiddenBoundary}</strong></div>
            </div>
            <div className="auto-director-batch-brief-chapters">
              {model.batchGuardrail.nextBatchBrief.chapters.map(chapter => (
                <button
                  key={chapter.chapterNo}
                  type="button"
                  className="auto-director-batch-brief-chapter"
                  onClick={() => onSelectChapter(chapter.chapterNo)}
                >
                  <span>第 {chapter.chapterNo} 章 · {chapter.title}</span>
                  <Text type="secondary">{chapter.chapterTask || chapter.conflict || '待补章节任务'} · 钩子：{chapter.endingHook || '待补'}</Text>
                </button>
              ))}
            </div>
          </div>
        )}
        {model.batchGuardrail.briefRepair.visible && (
          <div className={`auto-director-batch-repair auto-director-batch-repair-${model.batchGuardrail.briefRepair.status}`}>
            <div className="auto-director-batch-repair-head">
              <span>
                <Text strong>批次任务书补齐</Text>
                <Text type="secondary">{model.batchGuardrail.briefRepair.summary}</Text>
              </span>
              <ActionButton
                action={model.batchGuardrail.briefRepair.action}
                loadingActionKey={loadingActionKey}
                onAction={onAction}
              />
            </div>
            <div className="auto-director-batch-repair-list">
              {model.batchGuardrail.briefRepair.missingItems.map(item => (
                <Tag key={item} color={model.batchGuardrail.briefRepair.status === 'block' ? 'red' : 'gold'} bordered={false}>
                  {item}
                </Tag>
              ))}
            </div>
          </div>
        )}
        {model.batchGuardrail.briefRecovery.visible && (
          <div className="auto-director-batch-recovery">
            <div className="auto-director-batch-recovery-head">
              <span>
                <Text strong>批次安全已恢复</Text>
                <Text type="secondary">{model.batchGuardrail.briefRecovery.summary}</Text>
              </span>
              <ActionButton
                action={model.batchGuardrail.briefRecovery.action}
                loadingActionKey={loadingActionKey}
                onAction={onAction}
              />
            </div>
            <div className="auto-director-batch-recovery-list">
              {model.batchGuardrail.briefRecovery.evidence.map(item => (
                <Tag key={item} color="green" bordered={false}>{item}</Tag>
              ))}
            </div>
          </div>
        )}
      </section>

      {model.batchReviewQueue.visible && (
        <section className={`auto-director-panel auto-director-batch-review-panel auto-director-batch-review-panel-${model.batchReviewQueue.status}`}>
          <div className="auto-director-panel-title">
            <CheckCircleOutlined />
            <span>安全连写复盘</span>
            <Tag color={batchReviewColor(model.batchReviewQueue.status)} bordered={false}>
              成功 {model.batchReviewQueue.success}/{model.batchReviewQueue.total}
            </Tag>
            {model.batchReviewQueue.delivered > 0 && <Tag color="green" bordered={false}>交付 {model.batchReviewQueue.delivered}</Tag>}
            {model.batchReviewQueue.failed > 0 && <Tag color="red" bordered={false}>失败 {model.batchReviewQueue.failed}</Tag>}
            {model.batchReviewQueue.riskRadar.averageQualityScore !== null && <Tag color={model.batchReviewQueue.riskRadar.status === 'warn' ? 'gold' : 'green'} bordered={false}>均分 {model.batchReviewQueue.riskRadar.averageQualityScore}</Tag>}
            {model.batchReviewQueue.riskRadar.repairTasks.length > 0 && <Tag color="gold" bordered={false}>修复任务 {model.batchReviewQueue.riskRadar.repairTasks.length}</Tag>}
            {model.batchReviewQueue.safeLimit !== null && <Tag bordered={false}>安全上限 {model.batchReviewQueue.safeLimit}</Tag>}
          </div>
          <div className="auto-director-batch-review-layout">
            <div className="auto-director-batch-review-summary">
              <Text>{model.batchReviewQueue.summary}</Text>
              <ActionButton
                action={model.batchReviewQueue.nextAction}
                loadingActionKey={loadingActionKey}
                onAction={onAction}
              />
              {model.batchReviewQueue.riskRadar.signals.length > 0 && (
                <div className="auto-director-batch-risk-radar">
                  <Text strong>批次风险雷达</Text>
                  {model.batchReviewQueue.riskRadar.signals.map(signal => (
                    <span key={signal.key} className={`auto-director-batch-risk-signal auto-director-batch-risk-signal-${signal.status}`}>
                      <Tag color={signal.status === 'warn' ? 'gold' : 'green'} bordered={false}>{signal.label}</Tag>
                      <Text type="secondary">{signal.detail}</Text>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="auto-director-batch-review-list">
              {model.batchReviewQueue.items.slice(0, 6).map(item => (
                <button
                  key={`${item.chapterId || item.chapterNo}-${item.title}`}
                  type="button"
                  className={`auto-director-batch-review-item auto-director-batch-review-item-${item.status}`}
                  onClick={() => onSelectChapter(item.chapterNo)}
                >
                  <span>
                    <strong>第 {item.chapterNo} 章 · {item.title}</strong>
                    <Tag color={item.status === 'success' ? item.delivered ? 'green' : 'blue' : 'red'} bordered={false}>
                      {item.status === 'success' ? item.delivered ? '已交付' : '已生成' : '失败'}
                    </Tag>
                  </span>
                  <Text type="secondary">
                    {item.status === 'success'
                      ? `${item.wordCount ? `${item.wordCount} 字` : '正文已生成'}${item.score !== null ? ` · 质检 ${item.score}` : ''}${item.revised ? ' · 已修订' : ''}`
                      : item.error || '等待查看失败原因'}
                  </Text>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

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
