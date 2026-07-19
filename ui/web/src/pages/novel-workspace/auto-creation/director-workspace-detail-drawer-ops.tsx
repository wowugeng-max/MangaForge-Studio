import React from 'react'
import { Alert, Progress, Space, Tag, Tooltip, Typography, Button } from 'antd'
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

export function DirectorWorkspaceDetailDrawerOps(props: DirectorDrawerPanelProps) {
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
                <Tooltip title={staticActionTooltip('panel', '定位到写作队列当前章节。')}>
                  <Button
                    aria-label={staticActionTooltip('panel', '定位到写作队列当前章节。')}
                    onClick={() => onSelectChapter(model.writingQueueFocus.currentChapterNo || 0)}
                  >
                    <span className="auto-director-action-content">
                      <span>定位章节</span>
                      <StaticActionKindTag kind="panel" />
                    </span>
                  </Button>
                </Tooltip>
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
              <ActionSurfaceButton
                key={layer.key}
                action={layer.action}
                className={`auto-director-script-room-layer auto-director-script-room-layer-${layer.status}`}
                loadingActionKey={loadingActionKey}
                onAction={onAction}
              >
                <span>
                  <strong>{layer.label}</strong>
                  <Tag color={rhythmColor(layer.status)} bordered={false}>{scriptRoomStatusLabel(layer.status)}</Tag>
                </span>
                <Text type="secondary">{layer.detail}</Text>
                {layer.evidence.length > 0 && (
                  <em>{layer.evidence.slice(0, 2).join('；')}</em>
                )}
              </ActionSurfaceButton>
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
                  <HintedSurfaceButton
                    key={chapter.chapterNo}
                    className="auto-director-script-room-chapter"
                    tooltip={staticActionTooltip('panel', `定位到第 ${chapter.chapterNo} 章，查看短期排期与章节职责。`)}
                    onClick={() => onSelectChapter(chapter.chapterNo)}
                  >
                    <span>第{chapter.chapterNo}章 · {chapter.title}</span>
                    <Text type="secondary">{chapter.chapterTask || chapter.conflict || '待补章节职责'}</Text>
                  </HintedSurfaceButton>
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
          {model.creationContract.map(item => {
            const contractAction: AutoCreationDirectorAction = {
                area: item.key === 'core' ? 'assets' : 'planning',
                key: item.actionKey,
                label: item.label,
                description: item.detail,
                modelCall: false,
              }
            return (
              <ActionSurfaceButton
                key={item.key}
                action={contractAction}
                className={`auto-director-contract-item auto-director-contract-${item.status}`}
                loadingActionKey={loadingActionKey}
                onAction={onAction}
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
              </ActionSurfaceButton>
            )
          })}
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
                  payload: { source: 'delivery_risk_gate', deliveryRiskGate: model.deliveryRiskGate },
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

    </>
  )
}
