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

export function DirectorWorkspaceDetailDrawerCore(props: DirectorDrawerPanelProps) {
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
              <ActionSurfaceButton
                key={stage.key}
                action={stage.action}
                className={[
                  'auto-director-creation-stage',
                  `auto-director-creation-stage-${stage.status}`,
                  stage.active ? 'is-active' : '',
                ].filter(Boolean).join(' ')}
                loadingActionKey={loadingActionKey}
                onAction={() => onStageAction(stage.action)}
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
              </ActionSurfaceButton>
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
            {model.longformBattleDesk.lanes.map(lane => {
              const laneAction: AutoCreationDirectorAction = {
                  area: 'planning',
                  key: lane.actionKey,
                  label: lane.label,
                  description: lane.detail,
                  modelCall: false,
                }
              return (
                <ActionSurfaceButton
                  key={lane.key}
                  action={laneAction}
                  className={`auto-director-battle-lane auto-director-battle-lane-${lane.status}`}
                  loadingActionKey={loadingActionKey}
                  onAction={onAction}
                >
                  <span>
                    <Tag color={battleDeskColor(lane.status)} bordered={false}>
                      {lane.status === 'ok' ? '稳' : lane.status === 'block' ? '阻' : '警'}
                    </Tag>
                    <Text strong>{lane.label || battleLaneLabel(lane.key)}</Text>
                  </span>
                  <Progress percent={Math.max(0, Math.min(100, lane.score))} size="small" showInfo={false} />
                  <Text type="secondary">{lane.detail}</Text>
                </ActionSurfaceButton>
              )
            })}
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
              <ActionSurfaceButton
                key={stage.key}
                action={stage.action}
                className={[
                  'auto-director-serial-stage',
                  'auto-director-serial-stage-button',
                  `auto-director-serial-stage-${stage.status}`,
                ].join(' ')}
                loadingActionKey={loadingActionKey}
                onAction={() => onStageAction(stage.action)}
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
              </ActionSurfaceButton>
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
              <ActionSurfaceButton
                key={gate.key}
                action={model.millionWordRunway.recommendedAction}
                className={`auto-director-runway-gate auto-director-runway-gate-${gate.status}`}
                loadingActionKey={loadingActionKey}
                onAction={onAction}
              >
                <span>
                  <strong>{gate.label}</strong>
                  <Tag color={gate.status === 'ok' ? 'green' : gate.status === 'block' ? 'red' : 'gold'} bordered={false}>
                    {batchSignalLabel(gate.status)}
                  </Tag>
                </span>
                <Text type="secondary">{gate.detail}</Text>
              </ActionSurfaceButton>
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

    </>
  )
}
