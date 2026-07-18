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
} from '../autoCreationDirectorModel'
import {
  statusColor,
  pipelineColor,
  pipelineIcon,
  contractColor,
  contractLabel,
  rhythmColor,
  rhythmLabel,
  batchColor,
  batchSignalLabel,
  safeBatchExpansionFeedbackColor,
  safeBatchExpansionFeedbackLabel,
  batchReviewColor,
  batchCompletionColor,
  batchCompletionMetricColor,
  productionLicenseColor,
  cockpitStatusColor,
  cockpitStatusLabel,
  cockpitChainLabel,
  battleDeskColor,
  battleLaneLabel,
  dailyStepStatusLabel,
  scriptRoomStatusLabel,
  CREATION_PIPELINE_STAGE_HINTS,
  formatWords,
  safeBatchChapterNos,
  safeBatchChapterNosText,
  staticActionTooltip,
  StaticActionKindTag,
  ActionButton,
  ActionSurfaceButton,
  HintedSurfaceButton,
} from './director-workspace-chrome'
import {
  buildDirectorWorkspaceDerived,
} from './director-workspace-derived'
import {
  DirectorWorkspaceDetailDrawer,
} from './director-workspace-detail-drawer'

import '../AutoCreationDirectorWorkspace.css'

const { Text, Paragraph, Title } = Typography

export type AutoCreationDirectorWorkspaceProps = {
  model: AutoCreationDirectorModel
  loadingActionKey?: string
  onAction: (action: AutoCreationDirectorAction) => void
  onStageAction?: (action: AutoCreationDirectorAction) => void
  onSelectChapter: (chapterNo: number) => void
}
export function AutoCreationDirectorWorkspace({
  model,
  loadingActionKey,
  onAction,
  onStageAction = onAction,
  onSelectChapter,
}: AutoCreationDirectorWorkspaceProps) {
  const derived = buildDirectorWorkspaceDerived(model)
  const {
    targetPercent,
    activeStep,
    serialCockpit,
    batchPreflight,
    recoveryEvidenceTrend,
    longformMemoryAnchor,
    governanceRecheckMemory,
    safeBatchExpansionPolicy,
    safeBatchRecoveryRestoreConfirmation,
    safeBatchRecoveryRestoreChapterNos,
    safeBatchExpansionFeedback,
    safeBatchExpansionFeedbackStatus,
    safeBatchRecoveryRestoreStabilityEvidence,
    safeBatchRecoveryRestoreStabilityLane,
    safeBatchRecoveryRestoreStabilityReview,
    safeBatchRecoveryRestoreLaneReadyFlag,
    safeBatchRecoveryRestoreLaneReady,
    safeBatchRecoveryRestoreLaneLabel,
    safeBatchRecoveryRestoreRequiredStreakRaw,
    safeBatchRecoveryRestoreRequiredStreak,
    safeBatchRecoveryRestoreStabilityStreak,
    safeBatchRecoveryRestoreChapterNosForStability,
    safeBatchRecoveryRestoreValidationNosForStability,
    safeBatchRecoveryRestoreBatchText,
    safeBatchRecoveryRestoreValidationText,
    safeBatchExpansionFeedbackChapterNos,
    safeBatchExpansionStablePassStreak,
    safeBatchExpansionRecentBatchCount,
    safeBatchExpansionRepeatedHotspot,
    safeBatchExpansionStructureTrend,
    safeBatchExpansionStructureEffectiveness,
    safeBatchExpansionStructureEffectivenessStatus,
    safeBatchExpansionStructureFailureReasons,
    safeBatchExpansionStructureTopFailure,
    safeBatchExpansionStructureRecurrence,
    longformCharacterStates,
    longformOpenQuestions,
    longformPayoffDebts,
  } = derived

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
            <HintedSurfaceButton
              className="auto-director-target"
              tooltip={staticActionTooltip('panel', `定位到第 ${model.targetChapter.chapterNo} 章，查看当前目标章节。`)}
              onClick={() => onSelectChapter(model.targetChapter?.chapterNo || 0)}
            >
              <span>当前目标</span>
              <strong>第 {model.targetChapter.chapterNo} 章 · {model.targetChapter.title}</strong>
              <em>{model.targetChapter.hasProse ? `${model.targetChapter.wordCount} 字，进入交稿` : '未生成正文，等待开写'}</em>
            </HintedSurfaceButton>
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
          {model.repairPlan.visible && (
            <div className="auto-director-repair-plan">
              <div className="auto-director-repair-plan-copy">
                <Text strong>一键处理当前阻塞</Text>
                <Text type="secondary">{model.repairPlan.summary}</Text>
              </div>
              <ActionButton
                primary
                action={model.repairPlan.primaryAction}
                loadingActionKey={loadingActionKey}
                onAction={onAction}
              />
              <div className="auto-director-repair-plan-actions">
                {model.repairPlan.actions.slice(0, 4).map(action => (
                  <Tag key={`${action.area}-${action.key}`} bordered={false}>
                    {action.label}
                  </Tag>
                ))}
                {model.repairPlan.actions.length > 4 && (
                  <Tag bordered={false}>另 {model.repairPlan.actions.length - 4} 项</Tag>
                )}
              </div>
            </div>
          )}
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
            <ActionSurfaceButton
              key={item.key}
              action={item.action}
              className={`auto-director-cockpit-guardrail auto-director-cockpit-guardrail-${item.status}`}
              loadingActionKey={loadingActionKey}
              onAction={onAction}
            >
              <span>
                <Tag color={cockpitStatusColor(item.status)} bordered={false}>
                  {cockpitStatusLabel(item.status)}
                </Tag>
                <Text strong>{item.label}</Text>
                {item.count > 0 && <Tag bordered={false}>{item.count}</Tag>}
              </span>
              <Text type="secondary">{item.detail}</Text>
            </ActionSurfaceButton>
          ))}
        </div>

        <div className="auto-director-cockpit-lower">
          <div className="auto-director-cockpit-chain" aria-label="当前章生产链">
            <Text className="auto-director-cockpit-section-title">当前章生产链</Text>
            {serialCockpit.chapterChain.map((step, index) => (
              <ActionSurfaceButton
                key={step.key}
                action={step.action}
                className={`auto-director-cockpit-chain-step auto-director-cockpit-chain-step-${step.status}`}
                loadingActionKey={loadingActionKey}
                onAction={onAction}
              >
                <span className="auto-director-cockpit-chain-index">{index + 1}</span>
                <span className="auto-director-cockpit-chain-copy">
                  <Text strong>{step.label}</Text>
                  <Text type="secondary">{step.detail}</Text>
                </span>
                <Tag color={cockpitStatusColor(step.status)} bordered={false}>
                  {cockpitChainLabel(step.status)}
                </Tag>
              </ActionSurfaceButton>
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
                  <ActionSurfaceButton
                    key={item.key}
                    action={item.action}
                    className={`auto-director-cockpit-risk auto-director-cockpit-risk-${item.status}`}
                    loadingActionKey={loadingActionKey}
                    onAction={onAction}
                  >
                    <span>
                      <Tag color={cockpitStatusColor(item.status)} bordered={false}>{item.label}</Tag>
                      {item.count > 0 && <Tag bordered={false}>{item.count}</Tag>}
                    </span>
                    <Text type="secondary">{item.detail}</Text>
                  </ActionSurfaceButton>
                ))
              ) : (
                <Text type="secondary">当前没有阻塞连载推进的聚合风险。</Text>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={`auto-director-panel auto-director-manual-test auto-director-manual-test-${model.manualTestReadiness.status}`}>
        <div className="auto-director-panel-title">
          <CheckCircleOutlined />
          <span>首测校准台</span>
          <Tag
            color={model.manualTestReadiness.status === 'ready' ? 'green' : model.manualTestReadiness.status === 'blocked' ? 'red' : 'gold'}
            bordered={false}
          >
            {model.manualTestReadiness.label}
          </Tag>
        </div>
        <div className="auto-director-manual-test-body">
          <div className="auto-director-manual-test-copy">
            <Text strong>{model.manualTestReadiness.summary}</Text>
            <div className="auto-director-manual-test-checklist">
              {model.manualTestReadiness.handoffChecklist.slice(0, 4).map(item => (
                <Text key={item} type="secondary">{item}</Text>
              ))}
            </div>
            <ActionButton
              primary={model.manualTestReadiness.status !== 'ready'}
              action={model.manualTestReadiness.primaryAction}
              loadingActionKey={loadingActionKey}
              onAction={onAction}
            />
          </div>
          <div className="auto-director-manual-test-gates">
            {model.manualTestReadiness.gates.map(gate => (
              <ActionSurfaceButton
                key={gate.key}
                action={gate.action}
                className={`auto-director-manual-test-gate auto-director-manual-test-gate-${gate.status}`}
                loadingActionKey={loadingActionKey}
                onAction={onAction}
              >
                <span>
                  <Text strong>{gate.label}</Text>
                  <Tag color={gate.status === 'ok' ? 'green' : gate.status === 'block' ? 'red' : 'gold'} bordered={false}>
                    {batchSignalLabel(gate.status)}
                  </Tag>
                </span>
                <Text type="secondary">{gate.detail}</Text>
                {gate.evidence.length > 0 && <em>{gate.evidence.slice(0, 2).join('；')}</em>}
              </ActionSurfaceButton>
            ))}
          </div>
        </div>
      </section>

      <DirectorWorkspaceDetailDrawer
        model={model}
        loadingActionKey={loadingActionKey}
        onAction={onAction}
        onStageAction={onStageAction}
        onSelectChapter={onSelectChapter}
        derived={derived}
      />
    </div>
  )
}
