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

export function DirectorWorkspaceDetailDrawerBatch(props: DirectorDrawerPanelProps) {
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
              <HintedSurfaceButton
                key={`allowed-${chapter.chapterNo}`}
                className="auto-director-batch-release-chapter auto-director-batch-release-chapter-allowed"
                tooltip={staticActionTooltip('panel', `定位到第 ${chapter.chapterNo} 章，查看已放行章节。`)}
                onClick={() => onSelectChapter(chapter.chapterNo)}
              >
                <span>第 {chapter.chapterNo} 章 · {chapter.title}</span>
                <Tag color="green" bordered={false}>{chapter.reason}</Tag>
              </HintedSurfaceButton>
            ))}
            {model.batchGuardrail.releaseWindow.blockedChapters.map(chapter => (
              <HintedSurfaceButton
                key={`blocked-${chapter.chapterNo}`}
                className="auto-director-batch-release-chapter auto-director-batch-release-chapter-blocked"
                tooltip={staticActionTooltip('panel', `定位到第 ${chapter.chapterNo} 章，查看阻塞原因。`)}
                onClick={() => onSelectChapter(chapter.chapterNo)}
              >
                <span>第 {chapter.chapterNo} 章 · {chapter.title}</span>
                <Tag color="gold" bordered={false}>{chapter.reason}</Tag>
              </HintedSurfaceButton>
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
                <HintedSurfaceButton
                  key={chapter.chapterNo}
                  className="auto-director-batch-brief-chapter"
                  tooltip={staticActionTooltip('panel', `定位到第 ${chapter.chapterNo} 章，查看下一批任务书。`)}
                  onClick={() => onSelectChapter(chapter.chapterNo)}
                >
                  <span>第 {chapter.chapterNo} 章 · {chapter.title}</span>
                  <Text type="secondary">{chapter.chapterTask || chapter.conflict || '待补章节任务'} · 钩子：{chapter.endingHook || '待补'}</Text>
                </HintedSurfaceButton>
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
                <HintedSurfaceButton
                  key={`${item.chapterId || item.chapterNo}-${item.title}`}
                  className={`auto-director-batch-review-item auto-director-batch-review-item-${item.status}`}
                  tooltip={staticActionTooltip('panel', `定位到第 ${item.chapterNo} 章，查看批次复盘结果。`)}
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
                </HintedSurfaceButton>
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
    </>
  )
}
