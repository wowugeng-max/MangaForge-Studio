import React from 'react'
import { Alert, Progress, Space, Tag, Tooltip, Typography } from 'antd'
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
  AutoCreationDirectorAction,
  AutoCreationDirectorModel,
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
import { buildDirectorWorkspaceDerived } from './director-workspace-derived'

const { Text, Paragraph, Title } = Typography

export type DirectorDrawerPanelProps = {
  model: AutoCreationDirectorModel
  loadingActionKey?: string
  onAction: (action: AutoCreationDirectorAction) => void
  onStageAction: (action: AutoCreationDirectorAction) => void
  onSelectChapter: (chapterNo: number) => void
  derived: ReturnType<typeof buildDirectorWorkspaceDerived>
}

export function DirectorWorkspaceDetailDrawerContinuity(props: DirectorDrawerPanelProps) {
  const {
    model,
    loadingActionKey,
    onAction,
    onStageAction,
    onSelectChapter,
    derived: d,
  } = props
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
  } = d

  return (
    <>
      <section className="auto-director-panel auto-director-rhythm-panel">
        <div className="auto-director-panel-title">
          <FundProjectionScreenOutlined />
          <span>长篇节奏总控</span>
          <Tag color={rhythmColor(model.longformRhythm.status)} bordered={false}>{model.longformRhythm.label}</Tag>
          <Tag bordered={false}>{model.longformRhythm.currentBandLabel}</Tag>
        </div>
        <Text className="auto-director-rhythm-summary">{model.longformRhythm.summary}</Text>
        <div className="auto-director-rhythm-grid">
          {model.longformRhythm.signals.map(signal => {
            const signalAction: AutoCreationDirectorAction = {
                area: 'planning',
                key: signal.actionKey,
                label: signal.label,
                description: signal.detail,
                modelCall: false,
              }
            return (
              <ActionSurfaceButton
                key={signal.key}
                action={signalAction}
                className={`auto-director-rhythm-signal auto-director-rhythm-signal-${signal.status}`}
                loadingActionKey={loadingActionKey}
                onAction={onAction}
              >
                <span>
                  <strong>{signal.label}</strong>
                  <Tag color={rhythmColor(signal.status)} bordered={false}>{rhythmLabel(signal.status)}</Tag>
                </span>
                <em>{signal.score}</em>
                <Text type="secondary">{signal.detail}</Text>
              </ActionSurfaceButton>
            )
          })}
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
          {model.longformCapacity.signals.map(signal => {
            const signalAction: AutoCreationDirectorAction = {
                area: 'planning',
                key: signal.actionKey,
                label: signal.label,
                description: signal.detail,
                modelCall: false,
              }
            return (
              <ActionSurfaceButton
                key={signal.key}
                action={signalAction}
                className={`auto-director-capacity-signal auto-director-capacity-signal-${signal.status}`}
                loadingActionKey={loadingActionKey}
                onAction={onAction}
              >
                <span>
                  <strong>{signal.label}</strong>
                  <Tag color={signal.status === 'ok' ? 'green' : signal.status === 'warn' ? 'gold' : 'red'} bordered={false}>{batchSignalLabel(signal.status)}</Tag>
                </span>
                <em>{signal.score}</em>
                <Text type="secondary">{signal.detail}</Text>
              </ActionSurfaceButton>
            )
          })}
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

    </>
  )
}
