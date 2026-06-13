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
  onStageAction?: (action: AutoCreationDirectorAction) => void
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

function safeBatchExpansionFeedbackColor(status: string) {
  if (status === 'recovered' || status === 'passed') return 'green'
  if (status === 'rollback_to_single_chapter') return 'red'
  if (status === 'rollback_to_small_batch') return 'gold'
  return 'blue'
}

function safeBatchExpansionFeedbackLabel(status: string) {
  if (status === 'recovered' || status === 'passed') return '扩批热区已清'
  if (status === 'rollback_to_single_chapter' || status === 'rollback_to_small_batch') return '扩批热区待修'
  return '扩批反馈'
}

function batchReviewColor(status: AutoCreationDirectorModel['batchReviewQueue']['status']) {
  if (status === 'ok' || status === 'done') return 'green'
  if (status === 'warn' || status === 'risk') return 'gold'
  return 'default'
}

function batchCompletionColor(status: AutoCreationDirectorModel['batchReviewQueue']['completionDashboard']['status']) {
  if (status === 'ready_next') return 'green'
  if (status === 'needs_repair') return 'gold'
  if (status === 'in_progress') return 'blue'
  return 'default'
}

function batchCompletionMetricColor(status: AutoCreationDirectorModel['batchReviewQueue']['completionDashboard']['metrics'][number]['status']) {
  if (status === 'ok') return 'green'
  if (status === 'block') return 'red'
  return 'gold'
}

function productionLicenseColor(status: AutoCreationDirectorModel['productionLicense']['status']) {
  if (status === 'batch_allowed') return 'green'
  if (status === 'single_chapter') return 'blue'
  return 'red'
}

function cockpitStatusColor(status: string) {
  if (status === 'ok' || status === 'done') return 'green'
  if (status === 'block') return 'red'
  if (status === 'current') return 'blue'
  if (status === 'warn') return 'gold'
  return 'default'
}

function cockpitStatusLabel(status: string) {
  if (status === 'ok') return '稳'
  if (status === 'block') return '阻'
  return '警'
}

function cockpitChainLabel(status: string) {
  if (status === 'done') return '完成'
  if (status === 'current') return '当前'
  if (status === 'block') return '阻塞'
  if (status === 'warn') return '待修'
  return '等待'
}

function battleDeskColor(status: string) {
  if (status === 'ready' || status === 'ok') return 'green'
  if (status === 'blocked' || status === 'block') return 'red'
  return 'gold'
}

function battleLaneLabel(key: AutoCreationDirectorModel['longformBattleDesk']['lanes'][number]['key']) {
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

function dailyStepStatusLabel(status: AutoCreationPipelineStatus) {
  if (status === 'done') return '完成'
  if (status === 'active') return '当前'
  if (status === 'blocked') return '阻塞'
  if (status === 'warning') return '待治理'
  return '等待'
}

function scriptRoomStatusLabel(status: AutoCreationDirectorModel['rollingScriptRoom']['status']) {
  if (status === 'ready') return '已对齐'
  if (status === 'blocked') return '阻塞'
  return '待校准'
}

const CREATION_PIPELINE_STAGE_HINTS = ['全书核心', '长线规划', '设定资产', '章节开写', '交稿验收', '连载发布']

function formatWords(value: number) {
  if (!value) return '0'
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return String(value)
}

function safeBatchChapterNos(value: any) {
  return (Array.isArray(value) ? value : [])
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => Number.isFinite(chapterNo) && chapterNo > 0)
}

function safeBatchChapterNosText(chapterNos: number[]) {
  if (!chapterNos.length) return ''
  return `${chapterNos.slice(0, 6).map(chapterNo => `第${chapterNo}章`).join('、')}${chapterNos.length > 6 ? `等${chapterNos.length}章` : ''}`
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
  onStageAction = onAction,
  onSelectChapter,
}: AutoCreationDirectorWorkspaceProps) {
  const targetPercent = model.metrics.targetWords > 0
    ? Math.min(100, Math.round((model.metrics.writtenWords / model.metrics.targetWords) * 100))
    : 0
  const activeStep = model.pipeline.find(step => step.status === 'active')
  const serialCockpit = model.serialCockpit
  const batchPreflight = model.batchGuardrail.preflight
  const recoveryEvidenceTrend = model.batchGuardrail.recoveryEvidenceTrend
  const longformMemoryAnchor = batchPreflight.longformMemoryAnchor || null
  const governanceRecheckMemory = batchPreflight.governanceRecheckMemory || null
  const safeBatchExpansionPolicy = batchPreflight.inputSnapshot?.safe_batch_expansion_policy
    || batchPreflight.inputSnapshot?.safeBatchExpansionPolicy
    || null
  const safeBatchRecoveryRestoreConfirmation = batchPreflight.inputSnapshot?.safe_batch_recovery_restore_confirmation
    || batchPreflight.inputSnapshot?.safeBatchRecoveryRestoreConfirmation
    || null
  const safeBatchRecoveryRestoreChapterNos = Array.isArray(safeBatchRecoveryRestoreConfirmation?.validation_chapter_nos)
    ? safeBatchRecoveryRestoreConfirmation.validation_chapter_nos
    : Array.isArray(safeBatchRecoveryRestoreConfirmation?.validationChapterNos)
      ? safeBatchRecoveryRestoreConfirmation.validationChapterNos
      : []
  const safeBatchExpansionFeedback = safeBatchExpansionPolicy?.expansion_feedback
    || safeBatchExpansionPolicy?.expansionFeedback
    || null
  const safeBatchExpansionFeedbackStatus = String(safeBatchExpansionFeedback?.status || '')
  const safeBatchRecoveryRestoreStabilityEvidence = safeBatchExpansionFeedback?.recovery_restore_stability_evidence
    || safeBatchExpansionFeedback?.recoveryRestoreStabilityEvidence
    || null
  const safeBatchRecoveryRestoreStabilityLane = batchPreflight.inputSnapshot?.safe_batch_recovery_restore_stability_lane
    || batchPreflight.inputSnapshot?.safeBatchRecoveryRestoreStabilityLane
    || model.batchGuardrail.recommendedAction.payload?.recovery_restore_stability_evidence
    || model.batchGuardrail.recommendedAction.payload?.default_five_chapter_lane
    || null
  const safeBatchRecoveryRestoreStabilityReview = safeBatchRecoveryRestoreStabilityLane
    || safeBatchRecoveryRestoreStabilityEvidence
    || null
  const safeBatchRecoveryRestoreLaneReadyFlag = safeBatchRecoveryRestoreStabilityLane?.default_five_chapter_ready
    ?? safeBatchRecoveryRestoreStabilityLane?.defaultFiveChapterReady
  const safeBatchRecoveryRestoreLaneReady = safeBatchRecoveryRestoreLaneReadyFlag === undefined || safeBatchRecoveryRestoreLaneReadyFlag === null
    ? String(safeBatchRecoveryRestoreStabilityLane?.status || '') === 'ready'
    : Boolean(safeBatchRecoveryRestoreLaneReadyFlag)
  const safeBatchRecoveryRestoreLaneLabel = String(
    safeBatchRecoveryRestoreStabilityLane?.label
      || (safeBatchRecoveryRestoreLaneReady ? '默认5章档位' : '5章观察批'),
  )
  const safeBatchRecoveryRestoreRequiredStreakRaw = Number(
    safeBatchRecoveryRestoreStabilityLane?.required_stable_pass_streak
      ?? safeBatchRecoveryRestoreStabilityLane?.requiredStablePassStreak
      ?? 2,
  )
  const safeBatchRecoveryRestoreRequiredStreak = Number.isFinite(safeBatchRecoveryRestoreRequiredStreakRaw) && safeBatchRecoveryRestoreRequiredStreakRaw > 0
    ? safeBatchRecoveryRestoreRequiredStreakRaw
    : 2
  const safeBatchRecoveryRestoreStabilityStreak = Number(
    safeBatchRecoveryRestoreStabilityReview?.stable_pass_streak
      ?? safeBatchRecoveryRestoreStabilityReview?.stablePassStreak
      ?? 0,
  )
  const safeBatchRecoveryRestoreChapterNosForStability = safeBatchChapterNos(
    safeBatchRecoveryRestoreStabilityReview?.restore_chapter_nos
      || safeBatchRecoveryRestoreStabilityReview?.restoreChapterNos,
  )
  const safeBatchRecoveryRestoreValidationNosForStability = safeBatchChapterNos(
    safeBatchRecoveryRestoreStabilityReview?.validation_chapter_nos
      || safeBatchRecoveryRestoreStabilityReview?.validationChapterNos,
  )
  const safeBatchRecoveryRestoreBatchText = safeBatchChapterNosText(safeBatchRecoveryRestoreChapterNosForStability)
  const safeBatchRecoveryRestoreValidationText = safeBatchChapterNosText(safeBatchRecoveryRestoreValidationNosForStability)
  const safeBatchExpansionFeedbackChapterNos = Array.isArray(safeBatchExpansionFeedback?.latest_chapter_nos)
    ? safeBatchExpansionFeedback.latest_chapter_nos
    : Array.isArray(safeBatchExpansionFeedback?.latestChapterNos)
      ? safeBatchExpansionFeedback.latestChapterNos
      : []
  const safeBatchExpansionStablePassStreak = Number(safeBatchExpansionFeedback?.stable_pass_streak || safeBatchExpansionFeedback?.stablePassStreak || 0)
  const safeBatchExpansionRecentBatchCount = Number(safeBatchExpansionFeedback?.recent_expanded_batch_count || safeBatchExpansionFeedback?.recentExpandedBatchCount || 0)
  const safeBatchExpansionRepeatedHotspot = safeBatchExpansionFeedback?.repeated_hotspot_segment
    || safeBatchExpansionFeedback?.repeatedHotspotSegment
    || null
  const safeBatchExpansionStructureTrend = safeBatchExpansionFeedback?.expansion_structure_validation_trend
    || safeBatchExpansionFeedback?.expansionStructureValidationTrend
    || null
  const safeBatchExpansionStructureEffectiveness = safeBatchExpansionFeedback?.expansion_structure_repair_effectiveness
    || safeBatchExpansionFeedback?.expansionStructureRepairEffectiveness
    || null
  const safeBatchExpansionStructureEffectivenessStatus = String(safeBatchExpansionStructureEffectiveness?.status || '')
  const safeBatchExpansionStructureFailureReasons = Array.isArray(safeBatchExpansionStructureTrend?.failure_reasons)
    ? safeBatchExpansionStructureTrend.failure_reasons
    : Array.isArray(safeBatchExpansionStructureTrend?.failureReasons)
      ? safeBatchExpansionStructureTrend.failureReasons
      : []
  const safeBatchExpansionStructureTopFailure = safeBatchExpansionStructureFailureReasons[0] || null
  const safeBatchExpansionStructureRecurrence = safeBatchExpansionStructureTrend?.recurrence_after_restore
    || safeBatchExpansionStructureTrend?.recurrenceAfterRestore
    || null
  const longformCharacterStates = Array.isArray(longformMemoryAnchor?.character_states) ? longformMemoryAnchor.character_states : []
  const longformOpenQuestions = Array.isArray(longformMemoryAnchor?.open_questions) ? longformMemoryAnchor.open_questions : []
  const longformPayoffDebts = Array.isArray(longformMemoryAnchor?.payoff_debts) ? longformMemoryAnchor.payoff_debts : []

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
            {model.governanceClosureBrief.status !== 'ok' && (
              <Tag color="red" bordered={false}>治理闭环</Tag>
            )}
            {model.deliveryRiskGate.totalOpen > 0 && (
              <Tag color={model.deliveryRiskGate.status === 'block' ? 'red' : 'gold'} bordered={false}>
                未清风险 {model.deliveryRiskGate.totalOpen}
              </Tag>
            )}
            {model.deliveryRiskGate.totalOpen === 0 && model.deliveryRiskGate.recentlyResolved.length > 0 && (
              <Tag color="green" bordered={false}>已清风险 {model.deliveryRiskGate.recentlyResolved.reduce((sum, item) => sum + item.count, 0)}</Tag>
            )}
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

        <div className="auto-director-judgement-card">
          <div className="auto-director-judgement-eyebrow">
            <FireOutlined />
            <span>当前判断</span>
          </div>
          <Text strong>{model.mainAction.label}</Text>
          <Paragraph>{model.mainAction.description}</Paragraph>
          {model.mainAction.modelCall && <Text className="auto-director-model-note">会调用大模型，长文本任务保持流式/后台任务执行。</Text>}
        </div>
      </div>

      <section className={`auto-director-panel auto-director-serial-cockpit auto-director-command-deck-${serialCockpit.command.status}`}>
        <div className="auto-director-panel-title">
          <FireOutlined />
          <span>{serialCockpit.title || '长篇连载驾驶舱'}</span>
          <Tag color={productionLicenseColor(serialCockpit.command.status)} bordered={false}>
            {serialCockpit.command.modeLabel}
          </Tag>
          <Tag color="blue" bordered={false}>今日唯一动作</Tag>
        </div>

        <div className="auto-director-cockpit-command">
          <div className="auto-director-cockpit-command-copy">
            <Text strong>{serialCockpit.summary}</Text>
            <Text type="secondary">当前：{serialCockpit.command.currentStepLabel}</Text>
            {serialCockpit.command.reasons.length > 0 && (
              <div className="auto-director-command-reasons">
                {serialCockpit.command.reasons.slice(0, 3).map(reason => <Text key={reason} type="secondary">{reason}</Text>)}
              </div>
            )}
            {serialCockpit.command.governanceMemory.visible && (
              <div className={`auto-director-command-memory auto-director-command-memory-${serialCockpit.command.governanceMemory.status}`}>
                <Space wrap size={[6, 4]}>
                  <Tag color={serialCockpit.command.governanceMemory.status === 'closed' ? 'green' : 'gold'} bordered={false}>治理复查记忆</Tag>
                  <Tag bordered={false}>{serialCockpit.command.governanceMemory.label}</Tag>
                </Space>
                <Text type="secondary">{serialCockpit.command.governanceMemory.summary}</Text>
                {(serialCockpit.command.governanceMemory.evidence.length > 0 || serialCockpit.command.governanceMemory.watchItems.length > 0) && (
                  <div className="auto-director-command-memory-lines">
                    {serialCockpit.command.governanceMemory.evidence.slice(0, 2).map(item => <Text key={`evidence-${item}`} type="secondary">{item}</Text>)}
                    {serialCockpit.command.governanceMemory.watchItems.slice(0, 2).map(item => <Text key={`watch-${item}`} type="secondary">{item}</Text>)}
                  </div>
                )}
              </div>
            )}
          </div>
          <ActionButton
            primary
            action={serialCockpit.command.action}
            loadingActionKey={loadingActionKey}
            onAction={onAction}
          />
        </div>

        <div className="auto-director-cockpit-guardrails" aria-label="万订五项护栏">
          <Text className="auto-director-cockpit-section-title">万订五项护栏</Text>
          {serialCockpit.guardrails.map(item => (
            <button
              key={item.key}
              type="button"
              className={`auto-director-cockpit-guardrail auto-director-cockpit-guardrail-${item.status}`}
              disabled={Boolean(loadingActionKey)}
              onClick={() => onAction(item.action)}
            >
              <span>
                <Tag color={cockpitStatusColor(item.status)} bordered={false}>
                  {cockpitStatusLabel(item.status)}
                </Tag>
                <Text strong>{item.label}</Text>
                {item.count > 0 && <Tag bordered={false}>{item.count}</Tag>}
              </span>
              <Text type="secondary">{item.detail}</Text>
            </button>
          ))}
        </div>

        <div className="auto-director-cockpit-lower">
          <div className="auto-director-cockpit-chain" aria-label="当前章生产链">
            <Text className="auto-director-cockpit-section-title">当前章生产链</Text>
            {serialCockpit.chapterChain.map((step, index) => (
              <button
                key={step.key}
                type="button"
                className={`auto-director-cockpit-chain-step auto-director-cockpit-chain-step-${step.status}`}
                disabled={Boolean(loadingActionKey)}
                onClick={() => onAction(step.action)}
              >
                <span className="auto-director-cockpit-chain-index">{index + 1}</span>
                <span className="auto-director-cockpit-chain-copy">
                  <Text strong>{step.label}</Text>
                  <Text type="secondary">{step.detail}</Text>
                </span>
                <Tag color={cockpitStatusColor(step.status)} bordered={false}>
                  {cockpitChainLabel(step.status)}
                </Tag>
              </button>
            ))}
          </div>

          <div className="auto-director-cockpit-side">
            <div className="auto-director-cockpit-license">
              <Text className="auto-director-cockpit-section-title">连写许可</Text>
              <Space wrap size={[6, 6]}>
                <Tag color={productionLicenseColor(serialCockpit.batchLicense.status)} bordered={false}>
                  {serialCockpit.batchLicense.modeLabel}
                </Tag>
                {serialCockpit.batchLicense.safeChapterCount > 0 && (
                  <Tag bordered={false}>放行 {serialCockpit.batchLicense.safeChapterCount} 章</Tag>
                )}
              </Space>
              <Text type="secondary">{serialCockpit.batchLicense.summary}</Text>
            </div>

            <div className="auto-director-cockpit-risks">
              <Text className="auto-director-cockpit-section-title">待处理风险</Text>
              {serialCockpit.riskQueue.length > 0 ? (
                serialCockpit.riskQueue.slice(0, 6).map(item => (
                  <button
                    key={item.key}
                    type="button"
                    className={`auto-director-cockpit-risk auto-director-cockpit-risk-${item.status}`}
                    disabled={Boolean(loadingActionKey)}
                    onClick={() => onAction(item.action)}
                  >
                    <span>
                      <Tag color={cockpitStatusColor(item.status)} bordered={false}>{item.label}</Tag>
                      {item.count > 0 && <Tag bordered={false}>{item.count}</Tag>}
                    </span>
                    <Text type="secondary">{item.detail}</Text>
                  </button>
                ))
              ) : (
                <Text type="secondary">当前没有阻塞连载推进的聚合风险。</Text>
              )}
            </div>
          </div>
        </div>
      </section>

      <details className="auto-director-detail-drawer">
        <summary className="auto-director-detail-summary">
          <span>展开详细依据</span>
          <Text type="secondary">查看长篇链路、作战台、生产轨道、航线守门、连续生产护栏和复盘证据。</Text>
        </summary>

      <section className="auto-director-panel auto-director-creation-pipeline">
        <div className="auto-director-panel-title">
          <FundProjectionScreenOutlined />
          <span>AI长篇创作流水线</span>
          <Tag color={model.creationPipeline.riskCount > 0 ? 'gold' : 'green'} bordered={false}>
            {model.creationPipeline.riskCount > 0 ? `风险 ${model.creationPipeline.riskCount}` : '链路可推进'}
          </Tag>
          <Tag color="blue" bordered={false}>唯一下一步</Tag>
        </div>
        <div className="auto-director-creation-pipeline-body">
          <div className="auto-director-creation-pipeline-copy">
            <Text strong>{model.creationPipeline.summary}</Text>
            <div className="auto-director-creation-pipeline-hints">
              {CREATION_PIPELINE_STAGE_HINTS.map(label => <Tag key={label} bordered={false}>{label}</Tag>)}
            </div>
            <ActionButton
              primary={model.creationPipeline.riskCount > 0}
              action={model.creationPipeline.primaryAction}
              loadingActionKey={loadingActionKey}
              onAction={onAction}
            />
          </div>
          <div className="auto-director-creation-stages">
            {model.creationPipeline.stages.map((stage, index) => (
              <button
                key={stage.key}
                type="button"
                className={[
                  'auto-director-creation-stage',
                  `auto-director-creation-stage-${stage.status}`,
                  stage.active ? 'is-active' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => onStageAction(stage.action)}
              >
                <span className="auto-director-creation-stage-head">
                  <span className="auto-director-creation-stage-index" style={{ color: pipelineColor(stage.status) }}>
                    {pipelineIcon(stage.status)}
                    <em>{index + 1}</em>
                  </span>
                  <Text strong>{stage.label}</Text>
                  {stage.active && <Tag color="blue" bordered={false}>当前</Tag>}
                </span>
                <Progress percent={Math.max(0, Math.min(100, stage.score))} size="small" showInfo={false} />
                <Text type="secondary">{stage.detail}</Text>
                <Text className="auto-director-creation-action-label">{stage.action.label}</Text>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={`auto-director-panel auto-director-battle-desk auto-director-battle-desk-${model.longformBattleDesk.status}`}>
        <div className="auto-director-panel-title">
          <FundProjectionScreenOutlined />
          <span>长篇作战台</span>
          <Tag color={battleDeskColor(model.longformBattleDesk.status)} bordered={false}>{model.longformBattleDesk.label}</Tag>
          {model.longformBattleDesk.riskChips.slice(0, 4).map(chip => (
            <Tag key={chip} color="gold" bordered={false}>{chip}</Tag>
          ))}
        </div>
        <div className="auto-director-battle-body">
          <div className="auto-director-battle-copy">
            <Text strong>{model.longformBattleDesk.summary}</Text>
            <Text type="secondary">同故事规划页共用六条生产线，避免总控台和规划页给出两套判断。</Text>
          </div>
          <div className="auto-director-battle-lanes">
            {model.longformBattleDesk.lanes.map(lane => (
              <button
                key={lane.key}
                type="button"
                className={`auto-director-battle-lane auto-director-battle-lane-${lane.status}`}
                onClick={() => onAction({
                  area: 'planning',
                  key: lane.actionKey,
                  label: lane.label,
                  description: lane.detail,
                  modelCall: false,
                })}
              >
                <span>
                  <Tag color={battleDeskColor(lane.status)} bordered={false}>
                    {lane.status === 'ok' ? '稳' : lane.status === 'block' ? '阻' : '警'}
                  </Tag>
                  <Text strong>{lane.label || battleLaneLabel(lane.key)}</Text>
                </span>
                <Progress percent={Math.max(0, Math.min(100, lane.score))} size="small" showInfo={false} />
                <Text type="secondary">{lane.detail}</Text>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="auto-director-panel auto-director-serial-rail">
        <div className="auto-director-panel-title">
          <FundProjectionScreenOutlined />
          <span>连载生产轨道</span>
          <Tag color="blue" bordered={false}>当前：{model.serialWorkflow.currentLabel}</Tag>
        </div>
        <div className="auto-director-serial-body">
          <Text className="auto-director-serial-summary">{model.serialWorkflow.summary}</Text>
          <div className="auto-director-serial-stages">
            {model.serialWorkflow.stages.map((stage, index) => (
              <button
                key={stage.key}
                type="button"
                className={[
                  'auto-director-serial-stage',
                  'auto-director-serial-stage-button',
                  `auto-director-serial-stage-${stage.status}`,
                ].join(' ')}
                onClick={() => onStageAction(stage.action)}
              >
                <div className="auto-director-serial-stage-head">
                  <span className="auto-director-serial-index" style={{ color: pipelineColor(stage.status) }}>
                    {pipelineIcon(stage.status)}
                    <em>{index + 1}</em>
                  </span>
                  <Text strong>{stage.label}</Text>
                  <Tag
                    color={stage.status === 'done' ? 'green' : stage.status === 'active' ? 'blue' : stage.status === 'blocked' ? 'red' : stage.status === 'warning' ? 'gold' : 'default'}
                    bordered={false}
                  >
                    {dailyStepStatusLabel(stage.status)}
                  </Tag>
                </div>
                <Text type="secondary">{stage.detail}</Text>
                <Text className="auto-director-serial-action-label">{stage.action.label}</Text>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={`auto-director-panel auto-director-license-panel auto-director-license-panel-${model.productionLicense.status}`}>
        <div className="auto-director-panel-title">
          <CheckCircleOutlined />
          <span>生产许可</span>
          <Tag color={productionLicenseColor(model.productionLicense.status)} bordered={false}>
            {model.productionLicense.modeLabel}
          </Tag>
          {model.productionLicense.safeChapterCount > 0 && (
            <Tag bordered={false}>放行 {model.productionLicense.safeChapterCount} 章</Tag>
          )}
        </div>
        <div className="auto-director-license-detail">
          <div className="auto-director-license-copy">
            <Text className="auto-director-license-mode">{model.productionLicense.summary}</Text>
            {model.productionLicense.reasons.length > 0 && (
              <div className="auto-director-license-reasons">
                {model.productionLicense.reasons.slice(0, 4).map(reason => <Text key={reason} type="secondary">{reason}</Text>)}
              </div>
            )}
            {model.productionLicense.badges.length > 0 && (
              <div className="auto-director-license-badges">
                {model.productionLicense.badges.map(badge => <Tag key={badge} bordered={false}>{badge}</Tag>)}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="auto-director-panel auto-director-daily-panel">
        <div className="auto-director-panel-title">
          <FireOutlined />
          <span>连载日更作战</span>
          <Tag color="blue" bordered={false}>
            当前：{model.dailyBattlePlan.steps.find(step => step.key === model.dailyBattlePlan.currentStepKey)?.label}
          </Tag>
        </div>
        <Text className="auto-director-daily-summary">{model.dailyBattlePlan.summary}</Text>
        <Text className="auto-director-daily-order" type="secondary">
          顺序：清交稿风险 {'->'} 补长线材料 {'->'} 写/修当前章 {'->'} 放行下一批
        </Text>
        <div className="auto-director-daily-steps">
          {model.dailyBattlePlan.steps.map((step, index) => (
            <div
              key={step.key}
              className={[
                'auto-director-daily-step',
                `auto-director-daily-step-${step.status}`,
                step.key === model.dailyBattlePlan.currentStepKey ? 'auto-director-daily-step-current' : '',
              ].filter(Boolean).join(' ')}
            >
              <div className="auto-director-daily-step-index" style={{ color: pipelineColor(step.status) }}>
                {pipelineIcon(step.status)}
                <span>{index + 1}</span>
              </div>
              <div className="auto-director-daily-step-body">
                <Space wrap size={6}>
                  <Text strong>{step.label}</Text>
                  <Tag color={step.status === 'done' ? 'green' : step.status === 'active' ? 'blue' : step.status === 'blocked' ? 'red' : step.status === 'warning' ? 'gold' : 'default'} bordered={false}>
                    {dailyStepStatusLabel(step.status)}
                  </Tag>
                </Space>
                <Text type="secondary">{step.detail}</Text>
                {step.badges.length > 0 && (
                  <div className="auto-director-daily-badges">
                    {step.badges.slice(0, 3).map(badge => <Tag key={badge} bordered={false}>{badge}</Tag>)}
                  </div>
                )}
                {step.gateChecks.length > 0 && (
                  <div className="auto-director-daily-gates">
                    <span>完成口径</span>
                    {step.gateChecks.slice(0, 2).map(check => <Text key={check} type="secondary">{check}</Text>)}
                  </div>
                )}
                {step.status !== 'done' && (
                  <ActionButton
                    action={step.action}
                    loadingActionKey={loadingActionKey}
                    onAction={onAction}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`auto-director-panel auto-director-runway-panel auto-director-runway-panel-${model.millionWordRunway.status}`}>
        <div className="auto-director-panel-title">
          <FundProjectionScreenOutlined />
          <span>百万字航线守门</span>
          <Tag color={rhythmColor(model.millionWordRunway.status)} bordered={false}>{model.millionWordRunway.label}</Tag>
          <Tag bordered={false}>{model.millionWordRunway.bandLabel}</Tag>
          <Tag color={model.millionWordRunway.status === 'ready' ? 'green' : model.millionWordRunway.status === 'blocked' ? 'red' : 'gold'} bordered={false}>
            {model.millionWordRunway.safeModeLabel}
          </Tag>
        </div>
        <Text className="auto-director-runway-summary">{model.millionWordRunway.summary}</Text>
        <div className="auto-director-runway-layout">
          <div className="auto-director-runway-gates">
            {model.millionWordRunway.gates.map(gate => (
              <button
                key={gate.key}
                type="button"
                className={`auto-director-runway-gate auto-director-runway-gate-${gate.status}`}
                onClick={() => onAction(model.millionWordRunway.recommendedAction)}
              >
                <span>
                  <strong>{gate.label}</strong>
                  <Tag color={gate.status === 'ok' ? 'green' : gate.status === 'block' ? 'red' : 'gold'} bordered={false}>
                    {batchSignalLabel(gate.status)}
                  </Tag>
                </span>
                <Text type="secondary">{gate.detail}</Text>
              </button>
            ))}
          </div>
          <div className="auto-director-runway-brief">
            <div>
              <Text strong>本章四问</Text>
              <div className="auto-director-runway-questions">
                {model.millionWordRunway.fourQuestions.map(question => (
                  <div key={question.key} className={`auto-director-runway-question auto-director-runway-question-${question.status}`}>
                    <span>{question.label}</span>
                    <Text>{question.answer}</Text>
                  </div>
                ))}
              </div>
            </div>
            <div className="auto-director-runway-lists">
              <div>
                <Text strong>不可偏移红线</Text>
                {model.millionWordRunway.redLines.slice(0, 4).map(item => <Text key={item} type="secondary">{item}</Text>)}
              </div>
              <div>
                <Text strong>追读燃料</Text>
                {model.millionWordRunway.readerFuel.slice(0, 4).map(item => <Text key={item} type="secondary">{item}</Text>)}
              </div>
            </div>
            <ActionButton
              action={model.millionWordRunway.recommendedAction}
              loadingActionKey={loadingActionKey}
              onAction={onAction}
            />
          </div>
        </div>
      </section>

      {model.writingQueueFocus.visible && (
        <section className={`auto-director-panel auto-director-writing-queue-focus auto-director-writing-queue-focus-${model.writingQueueFocus.status}`}>
          <div className="auto-director-panel-title">
            <ThunderboltOutlined />
            <span>写作队列</span>
            <Tag color={model.writingQueueFocus.status === 'needs_plan' ? 'gold' : model.writingQueueFocus.status === 'draft_generated' ? 'blue' : 'green'} bordered={false}>
              {model.writingQueueFocus.label}
            </Tag>
            {model.writingQueueFocus.currentChapterNo && (
              <Tag bordered={false}>第 {model.writingQueueFocus.currentChapterNo} 章</Tag>
            )}
          </div>
          <div className="auto-director-writing-queue-focus-body">
            <div className="auto-director-writing-queue-focus-copy">
              <Text>{model.writingQueueFocus.summary}</Text>
              {model.writingQueueFocus.badges.length > 0 && (
                <div className="auto-director-writing-queue-focus-badges">
                  {model.writingQueueFocus.badges.map(badge => <Tag key={badge} bordered={false}>{badge}</Tag>)}
                </div>
              )}
            </div>
            <div className="auto-director-writing-queue-focus-actions">
              {model.writingQueueFocus.currentChapterNo && (
                <Button onClick={() => onSelectChapter(model.writingQueueFocus.currentChapterNo || 0)}>
                  定位章节
                </Button>
              )}
              <ActionButton
                action={model.writingQueueFocus.action}
                loadingActionKey={loadingActionKey}
                onAction={onAction}
              />
            </div>
          </div>
        </section>
      )}

      <section className={`auto-director-panel auto-director-launch-gate-panel auto-director-launch-gate-panel-${model.chapterLaunchGate.status}`}>
        <div className="auto-director-panel-title">
          <CheckCircleOutlined />
          <span>本章开写门禁</span>
          <Tag color={rhythmColor(model.chapterLaunchGate.status)} bordered={false}>{model.chapterLaunchGate.label}</Tag>
        </div>
        <Text className="auto-director-launch-gate-summary">{model.chapterLaunchGate.summary}</Text>
        <div className="auto-director-launch-gate-signals">
          {model.chapterLaunchGate.signals.map(signal => (
            <div key={signal.key} className={`auto-director-launch-gate-signal auto-director-launch-gate-signal-${signal.status}`}>
              <span>
                <Text strong>{signal.label}</Text>
                <Tag color={signal.status === 'ok' ? 'green' : signal.status === 'block' ? 'red' : 'gold'} bordered={false}>
                  {batchSignalLabel(signal.status)}
                </Tag>
              </span>
              <Text type="secondary">{signal.detail}</Text>
            </div>
          ))}
        </div>
        {model.chapterLaunchGate.status !== 'ready' && (
          <ActionButton
            action={model.chapterLaunchGate.action}
            loadingActionKey={loadingActionKey}
            onAction={onAction}
          />
        )}
      </section>

      <section className={`auto-director-panel auto-director-script-room-panel auto-director-script-room-panel-${model.rollingScriptRoom.status}`}>
        <div className="auto-director-panel-title">
          <FundProjectionScreenOutlined />
          <span>百章滚动剧本室</span>
          <Tag color={rhythmColor(model.rollingScriptRoom.status)} bordered={false}>{model.rollingScriptRoom.label}</Tag>
          <Tag bordered={false}>{model.rollingScriptRoom.focusRangeLabel}</Tag>
          {model.rollingScriptRoom.repairTasks.length > 0 && (
            <Tag color="gold" bordered={false}>待修复 {model.rollingScriptRoom.repairTasks.length}</Tag>
          )}
        </div>
        <Text className="auto-director-script-room-summary">{model.rollingScriptRoom.summary}</Text>
        <Text className="auto-director-script-room-axis" type="secondary">
          五层：当前章 / 未来10章 / 未来100章 / 当前卷 / 全书罗盘
        </Text>
        <div className="auto-director-script-room-layout">
          <div className="auto-director-script-room-layers">
            {model.rollingScriptRoom.layers.map(layer => (
              <button
                key={layer.key}
                type="button"
                className={`auto-director-script-room-layer auto-director-script-room-layer-${layer.status}`}
                onClick={() => onAction(layer.action)}
              >
                <span>
                  <strong>{layer.label}</strong>
                  <Tag color={rhythmColor(layer.status)} bordered={false}>{scriptRoomStatusLabel(layer.status)}</Tag>
                </span>
                <Text type="secondary">{layer.detail}</Text>
                {layer.evidence.length > 0 && (
                  <em>{layer.evidence.slice(0, 2).join('；')}</em>
                )}
              </button>
            ))}
          </div>
          <div className="auto-director-script-room-route">
            <div className="auto-director-script-room-route-head">
              <Text strong>短期排期</Text>
              <ActionButton
                action={model.rollingScriptRoom.nextAction}
                loadingActionKey={loadingActionKey}
                onAction={onAction}
              />
              {model.rollingScriptRoom.repairTasks.length > 0 && (
                <div className="auto-director-script-room-repair-entry">
                  <Text type="secondary">生成剧本室修复任务</Text>
                  <ActionButton
                    action={model.rollingScriptRoom.repairAction}
                    loadingActionKey={loadingActionKey}
                    onAction={onAction}
                  />
                </div>
              )}
            </div>
            {model.rollingScriptRoom.nextChapters.length > 0 ? (
              <div className="auto-director-script-room-chapters">
                {model.rollingScriptRoom.nextChapters.slice(0, 6).map(chapter => (
                  <button
                    key={chapter.chapterNo}
                    type="button"
                    className="auto-director-script-room-chapter"
                    onClick={() => onSelectChapter(chapter.chapterNo)}
                  >
                    <span>第{chapter.chapterNo}章 · {chapter.title}</span>
                    <Text type="secondary">{chapter.chapterTask || chapter.conflict || '待补章节职责'}</Text>
                  </button>
                ))}
              </div>
            ) : (
              <Alert type="warning" showIcon message="短期排期不足" description="先补齐未来10章滚动规划，再放行连续生成。" />
            )}
          </div>
        </div>
      </section>

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

      {model.deliveryRiskGate.totalOpen > 0 && (
        <section className={`auto-director-panel auto-director-risk-fuse auto-director-risk-fuse-${model.deliveryRiskGate.status}`}>
          <div className="auto-director-panel-title">
            <ExclamationCircleOutlined />
            <span>交稿风险熔断</span>
            <Tag color={model.deliveryRiskGate.status === 'block' ? 'red' : 'gold'} bordered={false}>
              {model.deliveryRiskGate.label}
            </Tag>
            {model.deliveryRiskGate.highOpen > 0 && <Tag color="red" bordered={false}>高风险 {model.deliveryRiskGate.highOpen}</Tag>}
          </div>
          <div className="auto-director-risk-fuse-layout">
            <div className="auto-director-risk-fuse-summary">
              <Text>{model.deliveryRiskGate.summary}</Text>
              <ActionButton
                action={{
                  area: 'ops',
                  key: 'create_delivery_risk_repair',
                  label: '生成风险修复任务',
                  description: model.deliveryRiskGate.summary,
                  modelCall: false,
                }}
                loadingActionKey={loadingActionKey}
                onAction={onAction}
              />
            </div>
            <div className="auto-director-risk-fuse-body">
              <div className="auto-director-risk-fuse-categories">
                {model.deliveryRiskGate.categories.map(category => (
                  <span key={category.key} className="auto-director-risk-fuse-category">
                    <strong>{category.label}</strong>
                    <Tag color={category.highCount > 0 ? 'red' : 'gold'} bordered={false}>
                      {category.count}
                    </Tag>
                  </span>
                ))}
              </div>
              {model.deliveryRiskGate.topRisks.length > 0 && (
                <div className="auto-director-risk-fuse-list">
                  {model.deliveryRiskGate.topRisks.map(risk => <Text key={risk} type="secondary">{risk}</Text>)}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {model.deliveryRiskGate.totalOpen === 0 && model.deliveryRiskGate.recentlyResolved.length > 0 && (
        <section className="auto-director-panel auto-director-risk-cleared">
          <div className="auto-director-panel-title">
            <CheckCircleOutlined />
            <span>交稿风险已清</span>
            <Tag color="green" bordered={false}>
              已确认 {model.deliveryRiskGate.recentlyResolved.reduce((sum, item) => sum + item.count, 0)}
            </Tag>
          </div>
          <div className="auto-director-risk-cleared-list">
            {model.deliveryRiskGate.recentlyResolved.map(item => (
              <div key={`${item.label}-${item.chapterNos.join('-')}-${item.issueTypes.join('-')}`} className="auto-director-risk-cleared-item">
                <span>
                  <strong>{item.label}</strong>
                  <Tag color="green" bordered={false}>{item.count}</Tag>
                </span>
                <Text type="secondary">{item.detail}</Text>
              </div>
            ))}
          </div>
        </section>
      )}

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
        <Text type="secondary" className="auto-director-batch-axis">
          检查：长线治理 / 故事压力 / 剧情单元 / 近10章疲劳 / 批次任务书 / 每章交稿回填
        </Text>
        {batchPreflight.visible && (
          <div className={`auto-director-batch-preflight auto-director-batch-preflight-${batchPreflight.status}`}>
            <div className="auto-director-batch-preflight-head">
              <Text strong>安全连写预执行确认</Text>
              <Tag color={batchColor(batchPreflight.status)} bordered={false}>
                {batchPreflight.status === 'ready' ? '可执行' : batchPreflight.status === 'caution' ? '谨慎' : '阻塞'}
              </Tag>
              <Tag bordered={false}>放行 {batchPreflight.allowedChapterNos.length} 章</Tag>
              {batchPreflight.blockedChapterNos.length > 0 && (
                <Tag color="gold" bordered={false}>拦截 {batchPreflight.blockedChapterNos.length} 章</Tag>
              )}
            </div>
            <Text type="secondary">{batchPreflight.summary}</Text>
            <div className="auto-director-batch-preflight-flow">
              {batchPreflight.modelPipeline.map(step => (
                <Tag key={step} bordered={false}>{step}</Tag>
              ))}
            </div>
            {safeBatchRecoveryRestoreConfirmation && (
              <div className="auto-director-batch-restore-confirmation">
                <div className="auto-director-batch-memory-anchor-head">
                  <Text strong>{safeBatchRecoveryRestoreConfirmation.label || '确认恢复5章扩批'}</Text>
                  <Tag color="green" bordered={false}>3章验证批通过</Tag>
                  <Tag bordered={false}>
                    恢复 {Number(safeBatchRecoveryRestoreConfirmation.target_chapter_count || safeBatchRecoveryRestoreConfirmation.targetChapterCount || 5)} 章
                  </Tag>
                </div>
                <Text type="secondary">
                  {safeBatchRecoveryRestoreConfirmation.summary || '验证批已通过，本批可恢复5章扩批确认。'}
                </Text>
                {safeBatchRecoveryRestoreChapterNos.length > 0 && (
                  <div className="auto-director-batch-memory-chips">
                    <Tag bordered={false}>
                      {safeBatchRecoveryRestoreChapterNos.map((chapterNo: any) => `第${chapterNo}章`).join('、')}
                    </Tag>
                  </div>
                )}
              </div>
            )}
            {longformMemoryAnchor && (
              <div className="auto-director-batch-memory-anchor">
                <div className="auto-director-batch-memory-anchor-head">
                  <Text strong>正史锚点</Text>
                  {longformMemoryAnchor.last_updated_chapter && (
                    <Tag color="blue" bordered={false}>第{longformMemoryAnchor.last_updated_chapter}章同步</Tag>
                  )}
                  <Tag bordered={false}>角色 {longformCharacterStates.length}</Tag>
                  <Tag bordered={false}>悬念 {longformOpenQuestions.length}</Tag>
                  <Tag bordered={false}>回报债 {longformPayoffDebts.length}</Tag>
                </div>
                {longformMemoryAnchor.core_promise && (
                  <Text className="auto-director-batch-memory-promise">{longformMemoryAnchor.core_promise}</Text>
                )}
                <div className="auto-director-batch-memory-chips">
                  {longformMemoryAnchor.current_volume_goal && <Tag bordered={false}>卷目标：{longformMemoryAnchor.current_volume_goal}</Tag>}
                  {longformOpenQuestions.slice(0, 2).map((item: any) => <Tag key={`question-${item}`} bordered={false}>悬念：{item}</Tag>)}
                  {longformPayoffDebts.slice(0, 2).map((item: any) => <Tag key={`payoff-${item}`} bordered={false}>待兑现：{item}</Tag>)}
                </div>
              </div>
            )}
            {governanceRecheckMemory && (
              <div className={`auto-director-batch-governance-memory auto-director-batch-governance-memory-${governanceRecheckMemory.status}`}>
                <div className="auto-director-batch-memory-anchor-head">
                  <Text strong>治理复查记忆</Text>
                  <Tag color={governanceRecheckMemory.status === 'closed' ? 'green' : 'gold'} bordered={false}>{governanceRecheckMemory.label}</Tag>
                </div>
                <Text type="secondary">{governanceRecheckMemory.summary}</Text>
                <div className="auto-director-batch-memory-chips">
                  {(governanceRecheckMemory.evidence || []).slice(0, 2).map((item: any) => <Tag key={`governance-evidence-${item}`} bordered={false}>已补：{item}</Tag>)}
                  {(governanceRecheckMemory.watch_items || []).slice(0, 2).map((item: any) => <Tag key={`governance-watch-${item}`} bordered={false}>观察：{item}</Tag>)}
                </div>
              </div>
            )}
            {recoveryEvidenceTrend.visible && (
              <div className={`auto-director-batch-recovery-trend auto-director-batch-recovery-trend-${recoveryEvidenceTrend.status}`}>
                <div className="auto-director-batch-memory-anchor-head">
                  <Text strong>恢复依据画像趋势</Text>
                  <Tag color={recoveryEvidenceTrend.status === 'warn' ? 'gold' : 'green'} bordered={false}>
                    反复来源 {recoveryEvidenceTrend.repeatSourceCount}
                  </Tag>
                  <Tag bordered={false}>失效 {recoveryEvidenceTrend.totalFailureCount} 次</Tag>
                </div>
                <Text type="secondary">{recoveryEvidenceTrend.summary}</Text>
                {recoveryEvidenceTrend.strengthenedAcceptanceTrend?.visible && (
                  <div className="auto-director-batch-recovery-trend-acceptance">
                    <div className="auto-director-batch-memory-anchor-head">
                      <Text strong>强化恢复验收趋势</Text>
                      <Tag color={recoveryEvidenceTrend.strengthenedAcceptanceTrend.status === 'warn' ? 'gold' : 'green'} bordered={false}>
                        {recoveryEvidenceTrend.strengthenedAcceptanceTrend.status === 'warn' ? '回到单章' : `连过 ${recoveryEvidenceTrend.strengthenedAcceptanceTrend.passStreak} 批`}
                      </Tag>
                      <Tag bordered={false}>通过 {recoveryEvidenceTrend.strengthenedAcceptanceTrend.acceptedBatchCount}</Tag>
                      <Tag bordered={false}>未过 {recoveryEvidenceTrend.strengthenedAcceptanceTrend.failedBatchCount}</Tag>
                    </div>
                    <Text type="secondary">{recoveryEvidenceTrend.strengthenedAcceptanceTrend.summary}</Text>
                    <div className="auto-director-batch-memory-chips">
                      <Tag bordered={false}>核心 {recoveryEvidenceTrend.strengthenedAcceptanceTrend.dimensions.core.failedCount}</Tag>
                      <Tag bordered={false}>回报 {recoveryEvidenceTrend.strengthenedAcceptanceTrend.dimensions.payoff.failedCount}</Tag>
                      <Tag bordered={false}>拉力 {recoveryEvidenceTrend.strengthenedAcceptanceTrend.dimensions.readerPull.failedCount}</Tag>
                    </div>
                  </div>
                )}
                <div className="auto-director-batch-recovery-trend-list">
                  {recoveryEvidenceTrend.sources.slice(0, 3).map(source => (
                    <div key={source.source} className="auto-director-batch-recovery-trend-source">
                      <span>
                        <strong>{source.label}</strong>
                        <Tag color={source.releaseFailureCount >= 2 ? 'gold' : 'default'} bordered={false}>
                          {source.trendLabel}
                        </Tag>
                      </span>
                      <Text type="secondary">深层修复方向：{source.deepRepairDirection.replace(/^深层修复方向：/, '')}</Text>
                      {source.deepRepairEffect.status !== 'none' && (
                        <Text type="secondary">
                          深修结果：{source.deepRepairEffect.label}，{source.deepRepairEffect.summary}
                        </Text>
                      )}
                      {source.deepRepairEffect.strengthenedClosure.status !== 'not_required' && (
                        <Text type="secondary">
                          强化复检：{source.deepRepairEffect.strengthenedClosure.label}，{source.deepRepairEffect.strengthenedClosure.summary}
                        </Text>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {safeBatchExpansionFeedback && safeBatchExpansionFeedback.visible !== false && (
              <div className={`auto-director-batch-expansion-feedback auto-director-batch-expansion-feedback-${safeBatchExpansionFeedbackStatus || 'none'}`}>
                <div className="auto-director-batch-memory-anchor-head">
                  <Text strong>扩批热区反馈</Text>
                  <Tag color={safeBatchExpansionFeedbackColor(safeBatchExpansionFeedbackStatus)} bordered={false}>
                    {safeBatchExpansionFeedbackLabel(safeBatchExpansionFeedbackStatus)}
                  </Tag>
                  {Number(safeBatchExpansionFeedback.target_chapter_count || safeBatchExpansionFeedback.targetChapterCount || 0) > 0 && (
                    <Tag bordered={false}>
                      反馈目标 {Number(safeBatchExpansionFeedback.target_chapter_count || safeBatchExpansionFeedback.targetChapterCount)} 章
                    </Tag>
                  )}
                  {safeBatchExpansionStablePassStreak > 0 && (
                    <Tag color="green" bordered={false}>稳定连过 {safeBatchExpansionStablePassStreak}</Tag>
                  )}
                  {safeBatchExpansionRecentBatchCount > 1 && (
                    <Tag bordered={false}>观察 {safeBatchExpansionRecentBatchCount} 批</Tag>
                  )}
                  {safeBatchExpansionRepeatedHotspot && (
                    <Tag color="gold" bordered={false}>
                      {safeBatchExpansionRepeatedHotspot.label || '同段'}复发 {Number(safeBatchExpansionRepeatedHotspot.count || 0)}
                    </Tag>
                  )}
                  {safeBatchExpansionStructureTrend?.visible !== false && safeBatchExpansionStructureTrend && (
                    <Tag color={String(safeBatchExpansionStructureTrend.status || '') === 'warn' ? 'gold' : 'green'} bordered={false}>
                      验证通过率 {Number(safeBatchExpansionStructureTrend.pass_rate || safeBatchExpansionStructureTrend.passRate || 0)}%
                    </Tag>
                  )}
                  {safeBatchExpansionStructureTopFailure && (
                    <Tag color="gold" bordered={false}>
                      失败主因 {safeBatchExpansionStructureTopFailure.label}{Number(safeBatchExpansionStructureTopFailure.count || 0)}
                    </Tag>
                  )}
                  {safeBatchExpansionStructureRecurrence?.visible && (
                    <Tag color="gold" bordered={false}>
                      复发间隔 {Number(safeBatchExpansionStructureRecurrence.interval_batch_count || safeBatchExpansionStructureRecurrence.intervalBatchCount || 0)}批
                    </Tag>
                  )}
                  {safeBatchExpansionStructureEffectiveness?.visible !== false && safeBatchExpansionStructureEffectiveness && (
                    <Tag color={safeBatchExpansionStructureEffectivenessStatus === 'ok' ? 'green' : 'gold'} bordered={false}>
                      {safeBatchExpansionStructureEffectivenessStatus === 'ok' ? '结构修复有效' : '结构修复待观察'}
                    </Tag>
                  )}
                  {safeBatchExpansionStructureEffectiveness?.visible !== false && safeBatchExpansionStructureEffectiveness && (
                    <Tag bordered={false}>
                      主因 {Number(safeBatchExpansionStructureEffectiveness.baseline_failure_reason_count || safeBatchExpansionStructureEffectiveness.baselineFailureReasonCount || 0)}
                      -&gt;{Number(safeBatchExpansionStructureEffectiveness.current_failure_reason_count || safeBatchExpansionStructureEffectiveness.currentFailureReasonCount || 0)}
                    </Tag>
                  )}
                  {safeBatchRecoveryRestoreStabilityReview && (
                    <Tag color="green" bordered={false}>长期扩批稳定证据</Tag>
                  )}
                  {safeBatchRecoveryRestoreStabilityLane && (
                    <Tag color="blue" bordered={false}>批次复盘筛选</Tag>
                  )}
                  {safeBatchRecoveryRestoreStabilityReview && (
                    <Tag color={safeBatchRecoveryRestoreLaneReady ? 'green' : undefined} bordered={false}>
                      {safeBatchRecoveryRestoreStabilityLane
                        ? safeBatchRecoveryRestoreLaneLabel
                        : safeBatchRecoveryRestoreStabilityStreak >= 2 ? '默认5章档位' : '继续观察 1-2 批'}
                    </Tag>
                  )}
                </div>
                <Text type="secondary">
                  {safeBatchExpansionFeedback.summary || '扩批分段复盘结果已接入下一轮安全连写策略。'}
                </Text>
                {safeBatchRecoveryRestoreStabilityReview && (
                  <div className="auto-director-batch-restore-stability">
                    <div className="auto-director-batch-memory-anchor-head">
                      <Text strong>长期扩批稳定证据</Text>
                      {safeBatchRecoveryRestoreStabilityLane && (
                        <Tag color="blue" bordered={false}>批次复盘筛选</Tag>
                      )}
                      <Tag color="green" bordered={false}>
                        {String(safeBatchRecoveryRestoreStabilityReview.status || '') === 'passed' ? '恢复批通过' : '恢复批观察'}
                      </Tag>
                      <Tag bordered={false}>
                        {safeBatchRecoveryRestoreStabilityLane
                          ? safeBatchRecoveryRestoreLaneLabel
                          : safeBatchRecoveryRestoreStabilityStreak >= 2 ? '默认5章档位' : '继续观察 1-2 批'}
                      </Tag>
                    </div>
                    <Text type="secondary">
                      {safeBatchRecoveryRestoreStabilityReview.summary || '恢复 5 章后的稳定观察已沉淀，可继续作为扩批默认档位依据。'}
                    </Text>
                    {(safeBatchRecoveryRestoreBatchText || safeBatchRecoveryRestoreValidationText) && (
                      <div className="auto-director-batch-memory-chips">
                        {safeBatchRecoveryRestoreBatchText && <Tag bordered={false}>恢复批 {safeBatchRecoveryRestoreBatchText}</Tag>}
                        {safeBatchRecoveryRestoreValidationText && <Tag bordered={false}>验证批 {safeBatchRecoveryRestoreValidationText}</Tag>}
                        <Tag color="green" bordered={false}>
                          稳定连过 {safeBatchRecoveryRestoreStabilityStreak}
                          {safeBatchRecoveryRestoreStabilityLane ? `/${safeBatchRecoveryRestoreRequiredStreak}` : ''}
                        </Tag>
                      </div>
                    )}
                  </div>
                )}
                {safeBatchExpansionStructureTrend?.summary && (
                  <Text type="secondary">
                    {safeBatchExpansionStructureTrend.summary}
                  </Text>
                )}
                {safeBatchExpansionStructureEffectiveness?.visible !== false && safeBatchExpansionStructureEffectiveness && (
                  <Text type="secondary">
                    {safeBatchExpansionStructureEffectiveness.summary || `${safeBatchExpansionStructureEffectiveness.label || '结构修复有效性'}已进入扩批观察。`}
                  </Text>
                )}
                {safeBatchExpansionFeedbackChapterNos.length > 0 && (
                  <div className="auto-director-batch-memory-chips">
                    <Tag bordered={false}>
                      最近扩批 {safeBatchExpansionFeedbackChapterNos.map((chapterNo: any) => `第${chapterNo}章`).join('、')}
                    </Tag>
                    {Number(safeBatchExpansionFeedback.risk_count || safeBatchExpansionFeedback.riskCount || 0) > 0 && (
                      <Tag color="gold" bordered={false}>
                        热区风险 {Number(safeBatchExpansionFeedback.risk_count || safeBatchExpansionFeedback.riskCount)}
                      </Tag>
                    )}
                  </div>
                )}
              </div>
            )}
            {batchPreflight.warnings.length > 0 && (
              <div className="auto-director-batch-preflight-warnings">
                {batchPreflight.warnings.slice(0, 4).map(warning => (
                  <Text key={warning} type="secondary">{warning}</Text>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="auto-director-batch-release-window">
          <div className="auto-director-batch-release-head">
            <Text strong>本批放行范围</Text>
            <Text type="secondary">{model.batchGuardrail.releaseWindow.summary}</Text>
          </div>
          <div className="auto-director-batch-release-list">
            {model.batchGuardrail.releaseWindow.allowedChapters.map(chapter => (
              <button
                key={`allowed-${chapter.chapterNo}`}
                type="button"
                className="auto-director-batch-release-chapter auto-director-batch-release-chapter-allowed"
                onClick={() => onSelectChapter(chapter.chapterNo)}
              >
                <span>第 {chapter.chapterNo} 章 · {chapter.title}</span>
                <Tag color="green" bordered={false}>{chapter.reason}</Tag>
              </button>
            ))}
            {model.batchGuardrail.releaseWindow.blockedChapters.map(chapter => (
              <button
                key={`blocked-${chapter.chapterNo}`}
                type="button"
                className="auto-director-batch-release-chapter auto-director-batch-release-chapter-blocked"
                onClick={() => onSelectChapter(chapter.chapterNo)}
              >
                <span>第 {chapter.chapterNo} 章 · {chapter.title}</span>
                <Tag color="gold" bordered={false}>{chapter.reason}</Tag>
              </button>
            ))}
          </div>
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
            {model.batchGuardrail.nextBatchBrief.startChecklist.length > 0 && (
              <div className="auto-director-batch-start-checklist">
                <div className="auto-director-batch-start-checklist-head">
                  <Text strong>批次开工清单</Text>
                  <Text type="secondary">安全连写前确认核心、强故事、回报和边界。</Text>
                </div>
                <div className="auto-director-batch-start-checklist-grid">
                  {model.batchGuardrail.nextBatchBrief.startChecklist.map(item => (
                    <div
                      key={item.key}
                      className={`auto-director-batch-start-check auto-director-batch-start-check-${item.status}`}
                    >
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
            )}
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
              {model.batchReviewQueue.completionDashboard.visible && (
                <div className={`auto-director-batch-completion-dashboard auto-director-batch-completion-dashboard-${model.batchReviewQueue.completionDashboard.status}`}>
                  <div className="auto-director-batch-completion-head">
                    <Text strong>批次完成度</Text>
                    <Tag color={batchCompletionColor(model.batchReviewQueue.completionDashboard.status)} bordered={false}>
                      {model.batchReviewQueue.completionDashboard.label}
                    </Tag>
                    <Tag bordered={false}>{model.batchReviewQueue.completionDashboard.score}分</Tag>
                  </div>
                  <Text type="secondary">{model.batchReviewQueue.completionDashboard.summary}</Text>
                  <Progress
                    percent={model.batchReviewQueue.completionDashboard.score}
                    size="small"
                    showInfo={false}
                    status={model.batchReviewQueue.completionDashboard.status === 'needs_repair' ? 'exception' : 'normal'}
                  />
                  <div className="auto-director-batch-completion-metrics">
                    {model.batchReviewQueue.completionDashboard.metrics.map(metric => (
                      <div key={metric.key} className={`auto-director-batch-completion-metric auto-director-batch-completion-metric-${metric.status}`}>
                        <span>
                          <strong>{metric.label}</strong>
                          <Tag color={batchCompletionMetricColor(metric.status)} bordered={false}>
                            {metric.value}/{metric.target}
                          </Tag>
                        </span>
                        <Text type="secondary">{metric.detail}</Text>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {model.batchReviewQueue.handoff.visible && (
                <div className={`auto-director-batch-handoff auto-director-batch-handoff-${model.batchReviewQueue.handoff.status}`}>
                  <div className="auto-director-batch-handoff-head">
                    <Text strong>批次交接</Text>
                    <Tag
                      color={model.batchReviewQueue.handoff.status === 'continue_batch'
                        ? 'green'
                        : model.batchReviewQueue.handoff.status === 'failed'
                          ? 'red'
                          : 'gold'}
                      bordered={false}
                    >
                      {model.batchReviewQueue.handoff.label}
                    </Tag>
                    {model.batchReviewQueue.handoff.targetChapterNos.length > 0 && (
                      <Tag bordered={false}>
                        章节 {model.batchReviewQueue.handoff.targetChapterNos.map(no => `第${no}章`).join('、')}
                      </Tag>
                    )}
                  </div>
                  <Text type="secondary">{model.batchReviewQueue.handoff.summary}</Text>
                  {(model.batchReviewQueue.handoff.riskLabels.length > 0 || model.batchReviewQueue.handoff.evidence.length > 0) && (
                    <div className="auto-director-batch-handoff-tags">
                      {model.batchReviewQueue.handoff.riskLabels.map(label => (
                        <Tag key={`risk-${label}`} color="gold" bordered={false}>{label}</Tag>
                      ))}
                      {model.batchReviewQueue.handoff.evidence.slice(0, 4).map(item => (
                        <Tag key={`evidence-${item}`} bordered={false}>{item}</Tag>
                      ))}
                    </div>
                  )}
                  <ActionButton
                    action={model.batchReviewQueue.handoff.action}
                    loadingActionKey={loadingActionKey}
                    onAction={onAction}
                  />
                </div>
              )}
              <Text>{model.batchReviewQueue.summary}</Text>
              {!model.batchReviewQueue.handoff.visible && (
                <ActionButton
                  action={model.batchReviewQueue.nextAction}
                  loadingActionKey={loadingActionKey}
                  onAction={onAction}
                />
              )}
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
      </details>
    </div>
  )
}
