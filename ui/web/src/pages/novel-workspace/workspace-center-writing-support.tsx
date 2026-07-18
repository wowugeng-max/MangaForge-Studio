import React from 'react'
import { Button, Input, Modal, Progress, Space, Tag, Tooltip, Typography } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { displayValue } from './utils'
import { buildNovelDraftBriefSummary } from './writingRecommendationModel'
import { pickWritingAuxFocusTags } from './writingAuxFocusModel'
import { DeslopGateDiagnosticsPanel } from './workspace-center-chrome'

const { Text, Paragraph } = Typography

export function WorkspaceCenterWritingSupport(props: Record<string, any>) {
  const {
    blueprintEditorError,
    blueprintEditorOpen,
    blueprintEditorText,
    chapterHandoffDesk,
    currentQueueItem,
    deliveryActionLoading,
    deliveryNeedsStorySync,
    deliveryNextStepText,
    deliveryQualityDetail,
    deliveryQualityPending,
    deliveryStoryDetail,
    deliverySummary,
    draftBriefActionLoading,
    draftBriefSummary,
    generatingProse,
    generationTargetWordCount,
    ipSceneIntakeTooltip,
    onDeliveryAction,
    onDisableStyleSamples,
    onLockStyleSamples,
    onOpenStoryAssets,
    onRepairDeslopGate,
    onRepairWritingQueuePlanBatch,
    onReplaceStyleSamples,
    onSavePreDraftBrief,
    openChapterBlueprintEditor,
    preDraftBriefLoading,
    queueFocus,
    runDraftBriefAction,
    saveChapterBlueprintEditor,
    selectWritingQueueChapter,
    setBlueprintEditorError,
    setBlueprintEditorOpen,
    setBlueprintEditorText,
    styleSampleActionDisabled,
    styleSampleActionLoading,
    writingQueue,
  } = props

  return (
        {writingQueue?.visible && (
          <div className="novel-writing-queue-strip" aria-label="写作队列，滚动规划章节会自动进入">
            <div className="novel-writing-queue-head">
              <span className="novel-writing-queue-label">写作队列</span>
              <Tag bordered={false}>可写 {writingQueue.readyCount}</Tag>
              {writingQueue.blockedCount > 0 && <Tag color="gold" bordered={false}>待补 {writingQueue.blockedCount}</Tag>}
              {writingQueue.draftedCount > 0 && <Tag color="blue" bordered={false}>待质检 {writingQueue.draftedCount}</Tag>}
              {writingQueue.planRepair?.visible && (
                <Tooltip title={`补齐 ${writingQueue.planRepair.chapterCount} 章计划缺口，共 ${writingQueue.planRepair.missingCount} 项`}>
                  <Button
                    size="small"
                    className="novel-writing-queue-batch-action"
                    icon={<ExperimentOutlined />}
                    onClick={() => onRepairWritingQueuePlanBatch?.(writingQueue)}
                  >
                    补齐队列计划
                  </Button>
                </Tooltip>
              )}
            </div>
            <div className="novel-writing-queue-list">
              {writingQueue.items.map(item => (
                <Tooltip
                  key={`${item.id || item.chapterNo}-${item.status}`}
                  title={[
                    item.goal ? `目标：${item.goal}` : '目标待补齐',
                    item.conflict ? `冲突：${item.conflict}` : '冲突待补齐',
                    item.endingHook ? `钩子：${item.endingHook}` : '章末钩子待补齐',
                    item.actionHint || '',
                  ].join('；')}
                >
                  <div
                    className={[
                      'novel-writing-queue-item',
                      `novel-writing-queue-item-${item.status}`,
                      Number(item.chapterNo) === Number(writingQueue.currentChapterNo) ? 'is-active' : '',
                    ].filter(Boolean).join(' ')}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectWritingQueueChapter(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        selectWritingQueueChapter(item.id)
                      }
                    }}
                  >
                    <span className="novel-writing-queue-no">第{item.chapterNo}章</span>
                    <strong>{displayValue(item.title) || '未命名章节'}</strong>
                    <span className="novel-writing-queue-source">{item.sourceLabel || '手动章节'}</span>
                    <span className="novel-writing-queue-status">{item.statusLabel}</span>
                    <span className="novel-writing-queue-action">{item.actionLabel}</span>
                  </div>
                </Tooltip>
              ))}
            </div>
            {queueFocus && currentQueueItem && !(queueFocus.tone === 'delivery' && deliverySummary.visible) && (
              <div className={`novel-writing-queue-focus novel-writing-queue-focus-${queueFocus.tone}`}>
                <div className="novel-writing-queue-focus-main">
                  <span>{queueFocus.title}</span>
                  <strong>第{currentQueueItem.chapterNo}章 · {currentQueueItem.title || '未命名章节'}</strong>
                  <Text type="secondary">
                    {queueFocus.detail}
                  </Text>
                </div>
                <Space wrap size={6} align="center">
                  {queueFocus.tags.map(label => (
                    <Tag key={label} color={queueFocus.tone === 'delivery' ? 'blue' : queueFocus.tone === 'draft' ? 'green' : 'gold'} bordered={false}>{label}</Tag>
                  ))}
                  <Button
                    size="small"
                    type="primary"
                    className="novel-writing-queue-focus-action"
                    loading={queueFocus.loading}
                    disabled={queueFocus.disabled}
                    onClick={queueFocus.run}
                  >
                    {queueFocus.actionLabel}
                  </Button>
                </Space>
              </div>
            )}
          </div>
        )}

        {deliverySummary.visible && (
          <div className={`novel-delivery-status-strip novel-delivery-progress-panel novel-delivery-status-strip-${deliverySummary.tone}`}>
            <div className="novel-delivery-status-main">
              <div className="novel-delivery-progress-header">
                <div className="novel-delivery-progress-title-block">
                  <div className="novel-delivery-status-head">
                    <span className="novel-delivery-status-label">交稿进度</span>
                    <Tag className="novel-delivery-status-tag" bordered={false}>{deliverySummary.statusLabel}</Tag>
                  </div>
                  <Text className="novel-delivery-status-reason">
                    {deliveryNextStepText}
                  </Text>
                </div>
                <Space className="novel-delivery-status-actions" size={8} wrap>
                  {deliverySummary.actionKey && (
                    <Button
                      className="novel-delivery-status-action"
                      type="primary"
                      size="small"
                      loading={deliveryActionLoading}
                      icon={deliverySummary.actionKey === 'sync_story_state' ? <SyncOutlined /> : undefined}
                      onClick={() => onDeliveryAction?.(deliverySummary.actionKey!)}
                    >
                      <span className="novel-delivery-status-action-full">{deliverySummary.actionLabel}</span>
                      <span className="novel-delivery-status-action-compact">{deliverySummary.compactActionLabel}</span>
                    </Button>
                  )}
                  {deliverySummary.storyStateSyncAction
                    && deliverySummary.actionKey !== 'sync_story_state' && (
                    <Button
                      className="novel-delivery-status-action"
                      size="small"
                      icon={<SyncOutlined />}
                      loading={deliveryActionLoading}
                      onClick={() => onDeliveryAction?.(deliverySummary.storyStateSyncAction!.key)}
                    >
                      <span className="novel-delivery-status-action-full">{deliverySummary.storyStateSyncAction.label}</span>
                      <span className="novel-delivery-status-action-compact">同步状态</span>
                    </Button>
                  )}
                </Space>
              </div>

              <div className="novel-delivery-progress-steps">
                <div className="novel-delivery-progress-step is-done">
                  <span className="novel-delivery-progress-step-label">1. 正文</span>
                  <strong>已入库</strong>
                  <Text type="secondary">本章正文已保留，可继续质检或同步状态。</Text>
                </div>
                <div className={`novel-delivery-progress-step ${deliveryQualityPending ? 'is-current' : 'is-done'}`}>
                  <span className="novel-delivery-progress-step-label">2. 质量</span>
                  <strong>{deliverySummary.qualityLabel}</strong>
                  <Text type="secondary">{deliveryQualityDetail}</Text>
                </div>
                <div className={`novel-delivery-progress-step ${deliveryNeedsStorySync ? 'is-current' : 'is-done'}`}>
                  <span className="novel-delivery-progress-step-label">3. 故事状态</span>
                  <strong>{deliverySummary.storyStateLabel}</strong>
                  <Text type="secondary">{deliveryStoryDetail}</Text>
                </div>
              </div>

              <div className="novel-delivery-status-chips">
              {deliverySummary.deliveryRiskQueue && (
                <Tooltip title={deliverySummary.deliveryRiskQueue.items.join('；')}>
                  <Tag
                    className="novel-delivery-risk-tag novel-delivery-risk-tag-warn"
                    bordered={false}
                  >
                    {deliverySummary.deliveryRiskQueue.label} · {deliverySummary.deliveryRiskQueue.priorityLabel}
                  </Tag>
                </Tooltip>
              )}
              {deliverySummary.deliveryRiskConvergence && (
                <Tooltip title={deliverySummary.deliveryRiskConvergence.nextAction || deliverySummary.deliveryRiskConvergence.label}>
                  <Tag
                    className={`novel-delivery-convergence-tag novel-delivery-convergence-tag-${deliverySummary.deliveryRiskConvergence.status}`}
                    bordered={false}
                  >
                    {deliverySummary.deliveryRiskConvergence.label}
                  </Tag>
                </Tooltip>
              )}
              {deliverySummary.storylineSync && (
                <Tag
                  className={`novel-delivery-storyline-tag novel-delivery-storyline-tag-${deliverySummary.storylineSync.status}`}
                  bordered={false}
                >
                  {deliverySummary.storylineSync.label}
                </Tag>
              )}
              {deliverySummary.storyUnitSync && (
                <>
                  <Tag
                    className={`novel-delivery-story-unit-tag novel-delivery-story-unit-tag-${deliverySummary.storyUnitSync.status}`}
                    bordered={false}
                  >
                    {deliverySummary.storyUnitSync.scoreLabel}
                  </Tag>
                  {deliverySummary.storyUnitSync.riskCount > 0 && (
                    <Tag className="novel-delivery-story-unit-tag novel-delivery-story-unit-tag-warn" bordered={false}>
                      {deliverySummary.storyUnitSync.label}
                    </Tag>
                  )}
                </>
              )}
              {deliverySummary.assetIntake && deliverySummary.assetIntake.pendingCount > 0 && (
                <Tooltip title="打开设定资产页，确认正文中新出现的人物、物品、能力、势力、地点或伏笔">
                  <Tag
                    className="novel-delivery-asset-tag novel-delivery-asset-tag-clickable"
                    bordered={false}
                    role={onOpenStoryAssets ? 'button' : undefined}
                    tabIndex={onOpenStoryAssets ? 0 : undefined}
                    onClick={() => onOpenStoryAssets?.('discoveredAssets')}
                    onKeyDown={(event) => {
                      if (!onOpenStoryAssets) return
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      onOpenStoryAssets('discoveredAssets')
                    }}
                  >
                    {deliverySummary.assetIntake.label}
                  </Tag>
                </Tooltip>
              )}
              {deliverySummary.ipSceneIntake && (
                <Tooltip title={ipSceneIntakeTooltip}>
                  <Tag className="novel-delivery-ip-scene-tag" bordered={false}>
                    {deliverySummary.ipSceneIntake.label}
                  </Tag>
                </Tooltip>
              )}
              {deliverySummary.signatureSceneSync && (
                <>
                  <Tag
                    className={`novel-delivery-signature-scene-tag novel-delivery-signature-scene-tag-${deliverySummary.signatureSceneSync.status}`}
                    bordered={false}
                  >
                    {deliverySummary.signatureSceneSync.scoreLabel}
                  </Tag>
                  {deliverySummary.signatureSceneSync.missedCount > 0 && (
                    <Tag className="novel-delivery-signature-scene-tag novel-delivery-signature-scene-tag-warn" bordered={false}>
                      {deliverySummary.signatureSceneSync.label}
                    </Tag>
                  )}
                </>
              )}
              {deliverySummary.coreDrift && (
                <>
                  <Tag
                    className={`novel-delivery-core-drift-tag novel-delivery-core-drift-tag-${deliverySummary.coreDrift.status}`}
                    bordered={false}
                  >
                    {deliverySummary.coreDrift.scoreLabel}
                  </Tag>
                  {deliverySummary.coreDrift.riskCount > 0 && (
                    <Tag className="novel-delivery-core-drift-tag novel-delivery-core-drift-tag-warn" bordered={false}>
                      {deliverySummary.coreDrift.label}
                    </Tag>
                  )}
                </>
              )}
              {deliverySummary.runwaySync && (
                <>
                  <Tag
                    className={`novel-delivery-runway-tag novel-delivery-runway-tag-${deliverySummary.runwaySync.status}`}
                    bordered={false}
                  >
                    {deliverySummary.runwaySync.scoreLabel}
                  </Tag>
                  {deliverySummary.runwaySync.riskCount > 0 && (
                    <Tag className="novel-delivery-runway-tag novel-delivery-runway-tag-warn" bordered={false}>
                      {deliverySummary.runwaySync.label}
                    </Tag>
                  )}
                </>
              )}
              {deliverySummary.readerExpectationSync && (
                <>
                  <Tag
                    className={`novel-delivery-expectation-tag novel-delivery-expectation-tag-${deliverySummary.readerExpectationSync.status}`}
                    bordered={false}
                  >
                    {deliverySummary.readerExpectationSync.scoreLabel}
                  </Tag>
                  {deliverySummary.readerExpectationSync.missedCount > 0 && (
                    <Tag className="novel-delivery-expectation-tag novel-delivery-expectation-tag-warn" bordered={false}>
                      {deliverySummary.readerExpectationSync.label}
                    </Tag>
                  )}
                </>
              )}
              {!deliverySummary.readerExpectationSync && deliverySummary.readerPayoffSync && (
                <>
                  <Tag
                    className={`novel-delivery-payoff-tag novel-delivery-payoff-tag-${deliverySummary.readerPayoffSync.status}`}
                    bordered={false}
                  >
                    {deliverySummary.readerPayoffSync.scoreLabel}
                  </Tag>
                  {deliverySummary.readerPayoffSync.debtCount > 0 && (
                    <Tag className="novel-delivery-payoff-tag novel-delivery-payoff-tag-warn" bordered={false}>
                      {deliverySummary.readerPayoffSync.label}
                    </Tag>
                  )}
                </>
              )}
              {!deliverySummary.readerExpectationSync && deliverySummary.readerRetentionSync && (
                <>
                  <Tag
                    className={`novel-delivery-retention-tag novel-delivery-retention-tag-${deliverySummary.readerRetentionSync.status}`}
                    bordered={false}
                  >
                    {deliverySummary.readerRetentionSync.scoreLabel}
                  </Tag>
                  {deliverySummary.readerRetentionSync.missedCount > 0 && (
                    <Tag className="novel-delivery-retention-tag novel-delivery-retention-tag-warn" bordered={false}>
                      {deliverySummary.readerRetentionSync.label}
                    </Tag>
                  )}
                </>
              )}
              {deliverySummary.chapterAttraction && (
                <>
                  <Tag
                    className={`novel-delivery-attraction-tag novel-delivery-attraction-tag-${deliverySummary.chapterAttraction.status}`}
                    bordered={false}
                  >
                    {deliverySummary.chapterAttraction.scoreLabel}
                  </Tag>
                  {deliverySummary.chapterAttraction.weakCount > 0 && (
                    <Tag className="novel-delivery-attraction-tag novel-delivery-attraction-tag-warn" bordered={false}>
                      {deliverySummary.chapterAttraction.priorityLabel || deliverySummary.chapterAttraction.label}
                    </Tag>
                  )}
                </>
              )}
              {deliverySummary.storyDriveSync && (
                <>
                  <Tag
                    className={`novel-delivery-story-drive-tag novel-delivery-story-drive-tag-${deliverySummary.storyDriveSync.status}`}
                    bordered={false}
                  >
                    {deliverySummary.storyDriveSync.scoreLabel}
                  </Tag>
                  {deliverySummary.storyDriveSync.missedCount > 0 && (
                    <Tag className="novel-delivery-story-drive-tag novel-delivery-story-drive-tag-warn" bordered={false}>
                      {deliverySummary.storyDriveSync.priorityLabel || deliverySummary.storyDriveSync.label}
                    </Tag>
                  )}
                </>
              )}
              {deliverySummary.characterArcSync && (
                <>
                  <Tag
                    className={`novel-delivery-character-arc-tag novel-delivery-character-arc-tag-${deliverySummary.characterArcSync.status}`}
                    bordered={false}
                  >
                    {deliverySummary.characterArcSync.scoreLabel}
                  </Tag>
                  {deliverySummary.characterArcSync.missedCount > 0 && (
                    <Tag className="novel-delivery-character-arc-tag novel-delivery-character-arc-tag-warn" bordered={false}>
                      {deliverySummary.characterArcSync.priorityLabel || deliverySummary.characterArcSync.label}
                    </Tag>
                  )}
                </>
              )}
              {deliverySummary.chapterBenchmarkSync && (
                <>
                  <Tag
                    className={`novel-delivery-benchmark-tag novel-delivery-benchmark-tag-${deliverySummary.chapterBenchmarkSync.status}`}
                    bordered={false}
                  >
                    {deliverySummary.chapterBenchmarkSync.scoreLabel}
                  </Tag>
                  {deliverySummary.chapterBenchmarkSync.missedCount > 0 && (
                    <Tag className="novel-delivery-benchmark-tag novel-delivery-benchmark-tag-warn" bordered={false}>
                      {deliverySummary.chapterBenchmarkSync.label}
                    </Tag>
                  )}
                </>
              )}
              {deliverySummary.styleSampleSync && (
                <>
                  <Tag
                    className={`novel-delivery-style-sample-tag novel-delivery-style-sample-tag-${deliverySummary.styleSampleSync.status}`}
                    bordered={false}
                  >
                    {deliverySummary.styleSampleSync.scoreLabel}
                  </Tag>
                  {(deliverySummary.styleSampleSync.missedCount > 0 || deliverySummary.styleSampleSync.copyRiskCount > 0) && (
                    <Tag className="novel-delivery-style-sample-tag novel-delivery-style-sample-tag-warn" bordered={false}>
                      {deliverySummary.styleSampleSync.copyRiskCount > 0 ? `照搬风险 ${deliverySummary.styleSampleSync.copyRiskCount}` : deliverySummary.styleSampleSync.label}
                    </Tag>
                  )}
                </>
              )}
              {deliverySummary.first30RetentionRecheck && (
                <Tooltip title={deliverySummary.first30RetentionRecheck.reason}>
                  <Tag className="novel-delivery-first30-tag" bordered={false}>
                    {deliverySummary.first30RetentionRecheck.label}
                  </Tag>
                </Tooltip>
              )}
              {deliverySummary.innovationSync && (
                <>
                  <Tag
                    className={`novel-delivery-innovation-tag novel-delivery-innovation-tag-${deliverySummary.innovationSync.status}`}
                    bordered={false}
                  >
                    {deliverySummary.innovationSync.scoreLabel}
                  </Tag>
                  {deliverySummary.innovationSync.missedCount > 0 && (
                    <Tag className="novel-delivery-innovation-tag novel-delivery-innovation-tag-warn" bordered={false}>
                      {deliverySummary.innovationSync.label}
                    </Tag>
                  )}
                </>
              )}
              {deliverySummary.volumeBeatSync && (
                <>
                  <Tag
                    className={`novel-delivery-volume-beat-tag novel-delivery-volume-beat-tag-${deliverySummary.volumeBeatSync.status}`}
                    bordered={false}
                  >
                    {deliverySummary.volumeBeatSync.scoreLabel}
                  </Tag>
                  {deliverySummary.volumeBeatSync.missedCount > 0 && (
                    <Tag className="novel-delivery-volume-beat-tag novel-delivery-volume-beat-tag-warn" bordered={false}>
                      {deliverySummary.volumeBeatSync.label}
                    </Tag>
                  )}
                </>
              )}
              {deliverySummary.blueprintReceipt && (
                <Tooltip
                  title={[
                    deliverySummary.blueprintReceipt.missed.length ? `缺口：${deliverySummary.blueprintReceipt.missed.join('、')}` : '',
                    deliverySummary.blueprintReceipt.evidence.length ? `证据：${deliverySummary.blueprintReceipt.evidence.join('；')}` : '',
                  ].filter(Boolean).join('；') || deliverySummary.blueprintReceipt.label}
                >
                  <Tag
                    className={`novel-delivery-blueprint-tag novel-delivery-blueprint-tag-${deliverySummary.blueprintReceipt.status}`}
                    bordered={false}
                  >
                    {deliverySummary.blueprintReceipt.scoreLabel}
                  </Tag>
                </Tooltip>
              )}
              {deliverySummary.revisionReceipt && (
                <Tooltip
                  title={[
                    deliverySummary.revisionReceipt.risks.length ? `残余：${deliverySummary.revisionReceipt.risks.join('、')}` : '',
                    deliverySummary.revisionReceipt.evidence.length ? `修后证据：${deliverySummary.revisionReceipt.evidence.join('；')}` : '',
                  ].filter(Boolean).join('；') || deliverySummary.revisionReceipt.label}
                >
                  <Tag
                    className={`novel-delivery-revision-tag novel-delivery-revision-tag-${deliverySummary.revisionReceipt.status}`}
                    bordered={false}
                  >
                    {deliverySummary.revisionReceipt.scoreLabel}
                  </Tag>
                </Tooltip>
              )}
              {deliverySummary.deliveryRiskReceipt && (
                <Tooltip
                  title={[
                    deliverySummary.deliveryRiskReceipt.risks.length ? `残余：${deliverySummary.deliveryRiskReceipt.risks.join('、')}` : '',
                    deliverySummary.deliveryRiskReceipt.evidence.length ? `承接证据：${deliverySummary.deliveryRiskReceipt.evidence.join('；')}` : '',
                  ].filter(Boolean).join('；') || deliverySummary.deliveryRiskReceipt.label}
                >
                  <Tag
                    className={`novel-delivery-risk-receipt-tag novel-delivery-risk-receipt-tag-${deliverySummary.deliveryRiskReceipt.status}`}
                    bordered={false}
                  >
                    {deliverySummary.deliveryRiskReceipt.scoreLabel}
                  </Tag>
                </Tooltip>
              )}
              {deliverySummary.sceneCardReceipt && (
                <Tooltip
                  title={[
                    deliverySummary.sceneCardReceipt.scenes.length ? `场景：${deliverySummary.sceneCardReceipt.scenes.join('、')}` : '',
                    deliverySummary.sceneCardReceipt.fields.length ? `字段：${deliverySummary.sceneCardReceipt.fields.join('、')}` : '',
                    deliverySummary.sceneCardReceipt.evidence.length ? `证据：${deliverySummary.sceneCardReceipt.evidence.join('；')}` : '',
                  ].filter(Boolean).join('；') || deliverySummary.sceneCardReceipt.label}
                >
                  <Tag
                    className={`novel-delivery-scene-card-receipt-tag novel-delivery-scene-card-receipt-tag-${deliverySummary.sceneCardReceipt.status}`}
                    bordered={false}
                  >
                    {deliverySummary.sceneCardReceipt.label}
                  </Tag>
                </Tooltip>
              )}
              {deliverySummary.qualityAudit && (
                <Tooltip
                  title={[
                    deliverySummary.qualityAudit.checks.length ? `检查：${deliverySummary.qualityAudit.checks.join('、')}` : '',
                    deliverySummary.qualityAudit.evidence.length ? `证据：${deliverySummary.qualityAudit.evidence.join('；')}` : '',
                    deliverySummary.qualityAudit.fixes.length ? `修法：${deliverySummary.qualityAudit.fixes.join('；')}` : '',
                    deliverySummary.qualityAudit.strategies.length ? `策略：${deliverySummary.qualityAudit.strategies.join('、')}` : '',
                  ].filter(Boolean).join('；') || deliverySummary.qualityAudit.label}
                >
                  <Tag
                    className={`novel-delivery-quality-audit-tag novel-delivery-quality-audit-tag-${deliverySummary.qualityAudit.status}`}
                    bordered={false}
                  >
                    {deliverySummary.qualityAudit.label}
                  </Tag>
                </Tooltip>
              )}
              {deliverySummary.qualityAuditSync && (
                <Tooltip
                  title={[
                    deliverySummary.qualityAuditSync.evidence.length ? `证据：${deliverySummary.qualityAuditSync.evidence.join('；')}` : '',
                    deliverySummary.qualityAuditSync.nextActions.length ? `动作：${deliverySummary.qualityAuditSync.nextActions.join('；')}` : '',
                  ].filter(Boolean).join('；') || deliverySummary.qualityAuditSync.label}
                >
                  <Tag
                    className={`novel-delivery-quality-sync-tag novel-delivery-quality-sync-tag-${deliverySummary.qualityAuditSync.status}`}
                    bordered={false}
                  >
                    诊断承接 · {deliverySummary.qualityAuditSync.label}
                  </Tag>
                </Tooltip>
              )}
              {deliverySummary.qualityAuditRepairReceiptSync && (
                <Tooltip
                  title={[
                    deliverySummary.qualityAuditRepairReceiptSync.evidence.length ? `证据：${deliverySummary.qualityAuditRepairReceiptSync.evidence.join('；')}` : '',
                    deliverySummary.qualityAuditRepairReceiptSync.nextActions.length ? `动作：${deliverySummary.qualityAuditRepairReceiptSync.nextActions.join('；')}` : '',
                  ].filter(Boolean).join('；') || deliverySummary.qualityAuditRepairReceiptSync.label}
                >
                  <Tag
                    className={`novel-delivery-quality-repair-receipt-tag novel-delivery-quality-repair-receipt-tag-${deliverySummary.qualityAuditRepairReceiptSync.status}`}
                    bordered={false}
                  >
                    质量回执 · {deliverySummary.qualityAuditRepairReceiptSync.label}
                  </Tag>
                </Tooltip>
              )}
              {deliverySummary.chapterHandoffSync && (
                <Tooltip
                  title={[
                    deliverySummary.chapterHandoffSync.evidence.length ? `证据：${deliverySummary.chapterHandoffSync.evidence.join('；')}` : '',
                    deliverySummary.chapterHandoffSync.nextActions.length ? `动作：${deliverySummary.chapterHandoffSync.nextActions.join('；')}` : '',
                  ].filter(Boolean).join('；') || deliverySummary.chapterHandoffSync.label}
                >
                  <Tag
                    className={`novel-delivery-handoff-sync-tag novel-delivery-handoff-sync-tag-${deliverySummary.chapterHandoffSync.status}`}
                    bordered={false}
                  >
                    章首承接 · {deliverySummary.chapterHandoffSync.label}
                  </Tag>
                </Tooltip>
              )}
              {deliverySummary.chapterHandoffDeltaSync && (
                <Tooltip
                  title={[
                    deliverySummary.chapterHandoffDeltaSync.evidence.length ? `证据：${deliverySummary.chapterHandoffDeltaSync.evidence.join('；')}` : '',
                    deliverySummary.chapterHandoffDeltaSync.nextActions.length ? `动作：${deliverySummary.chapterHandoffDeltaSync.nextActions.join('；')}` : '',
                  ].filter(Boolean).join('；') || deliverySummary.chapterHandoffDeltaSync.label}
                >
                  <Tag
                    className={`novel-delivery-handoff-delta-tag novel-delivery-handoff-delta-tag-${deliverySummary.chapterHandoffDeltaSync.status}`}
                    bordered={false}
                  >
                    章末交接 · {deliverySummary.chapterHandoffDeltaSync.label}
                  </Tag>
                </Tooltip>
              )}
              {deliverySummary.writePreparation && (
                <Tooltip
                  title={[
                    deliverySummary.writePreparation.evidence.length ? `证据：${deliverySummary.writePreparation.evidence.join('；')}` : '',
                    deliverySummary.writePreparation.nextActions.length ? `动作：${deliverySummary.writePreparation.nextActions.join('；')}` : '',
                  ].filter(Boolean).join('；') || deliverySummary.writePreparation.label}
                >
                  <Tag
                    className={`novel-delivery-write-preparation-tag novel-delivery-write-preparation-tag-${deliverySummary.writePreparation.status}`}
                    bordered={false}
                  >
                    写前准备 · {deliverySummary.writePreparation.label}
                  </Tag>
                </Tooltip>
              )}
              {deliverySummary.approvalBlocker && (
                <Tooltip
                  title={[
                    deliverySummary.approvalBlocker.detail,
                    deliverySummary.approvalBlocker.reasons.length ? `原因：${deliverySummary.approvalBlocker.reasons.join('；')}` : '',
                  ].filter(Boolean).join('；') || deliverySummary.approvalBlocker.label}
                >
                  <Tag
                    className={`novel-delivery-approval-blocker-tag novel-delivery-approval-blocker-tag-${deliverySummary.approvalBlocker.status}`}
                    bordered={false}
                  >
                    {deliverySummary.approvalBlocker.scoreLabel} · {deliverySummary.approvalBlocker.label}
                  </Tag>
                </Tooltip>
              )}
              {deliverySummary.platformRubric && (
                <Tooltip
                  title={[
                    deliverySummary.platformRubric.missed.length ? `未达标：${deliverySummary.platformRubric.missed.join('、')}` : '',
                    deliverySummary.platformRubric.evidence.length ? `证据：${deliverySummary.platformRubric.evidence.join('；')}` : '',
                    deliverySummary.platformRubric.rubricSource ? `来源：${deliverySummary.platformRubric.rubricSource}` : '',
                  ].filter(Boolean).join('；') || deliverySummary.platformRubric.label}
                >
                  <Tag
                    className={`novel-delivery-platform-tag novel-delivery-platform-tag-${deliverySummary.platformRubric.status}`}
                    bordered={false}
                  >
                    {deliverySummary.platformRubric.scoreLabel}
                  </Tag>
                </Tooltip>
              )}
              {deliverySummary.readabilityReview && (
                <>
                  <Tag className="novel-delivery-readability-tag" bordered={false}>
                    {deliverySummary.readabilityReview.scoreLabel}
                  </Tag>
                  <Tag className="novel-delivery-readability-tag" bordered={false}>
                    {deliverySummary.readabilityReview.memeLabel}
                  </Tag>
                  {deliverySummary.readabilityReview.riskCount > 0 && (
                    <Tooltip
                      title={deliverySummary.readabilityReview.aiSmellTactics?.length
                        ? `去AI味建议：${deliverySummary.readabilityReview.aiSmellTactics.join('；')}`
                        : deliverySummary.readabilityReview.riskLabel}
                    >
                      <Tag className="novel-delivery-readability-tag novel-delivery-readability-tag-warn" bordered={false}>
                        {deliverySummary.readabilityReview.riskLabel}
                      </Tag>
                    </Tooltip>
                  )}
                </>
              )}
              </div>
            </div>
          </div>
        )}

        <DeslopGateDiagnosticsPanel
          diagnostics={deliverySummary.deslopGateDiagnostics}
          onRepairDeslopGate={onRepairDeslopGate}
          repairLoading={deliveryActionLoading}
        />

        {chapterHandoffDesk?.visible && (
          <div className={`novel-chapter-handoff-strip novel-chapter-handoff-strip-${chapterHandoffDesk.status}`}>
            <div className="novel-chapter-handoff-main">
              <div className="novel-chapter-handoff-head">
                <span className="novel-chapter-handoff-label">章节交接单</span>
                <Tag className="novel-chapter-handoff-status" bordered={false}>{chapterHandoffDesk.label}</Tag>
                <Text className="novel-chapter-handoff-route">
                  第{chapterHandoffDesk.fromChapterNo || '-'}章 → 第{chapterHandoffDesk.toChapterNo || '-'}章
                </Text>
                {chapterHandoffDesk.storylineStatusLabel && (
                  <Tag bordered={false}>{chapterHandoffDesk.storylineStatusLabel}</Tag>
                )}
                <Tag bordered={false}>{chapterHandoffDesk.storyStateSynced ? '状态已同步' : '状态待同步'}</Tag>
              </div>
              <div className="novel-chapter-handoff-grid">
                <Tooltip title={chapterHandoffDesk.previousEnding || '无明确章末钩子'}>
                  <div>
                    <span>上一章钩子</span>
                    <strong>{chapterHandoffDesk.previousEnding || '无明确章末钩子'}</strong>
                  </div>
                </Tooltip>
                <Tooltip title={chapterHandoffDesk.expectationCarryOver.join('；') || '无期待欠账'}>
                  <div>
                    <span>期待承接</span>
                    <strong>{chapterHandoffDesk.expectationCarryOver.join('；') || '无期待欠账'}</strong>
                  </div>
                </Tooltip>
                <Tooltip title={chapterHandoffDesk.nextOpeningObligations.join('；') || '承接上一章最后一幕'}>
                  <div>
                    <span>下一章开场</span>
                    <strong>{chapterHandoffDesk.nextOpeningObligations.join('；') || '承接上一章最后一幕'}</strong>
                  </div>
                </Tooltip>
                {chapterHandoffDesk.deliveryRiskCarryOver && (
                  <Tooltip title={chapterHandoffDesk.deliveryRiskCarryOver.items.join('；') || '无交稿风险'}>
                    <div className="novel-chapter-handoff-risk">
                      <span>交稿风险</span>
                      <strong>{chapterHandoffDesk.deliveryRiskCarryOver.label} · {chapterHandoffDesk.deliveryRiskCarryOver.priorityLabel}</strong>
                    </div>
                  </Tooltip>
                )}
              </div>
            </div>
            <Button
              className="novel-chapter-handoff-action"
              type={chapterHandoffDesk.status === 'ready' ? 'primary' : 'default'}
              size="small"
              loading={deliveryActionLoading && chapterHandoffDesk.status !== 'ready'}
              onClick={() => onDeliveryAction?.(chapterHandoffDesk.actionKey)}
            >
              {chapterHandoffDesk.actionLabel}
            </Button>
          </div>
        )}

        {draftBriefSummary.visible && (
          <div className="novel-draft-brief-strip">
            <div className="novel-draft-brief-main">
              <div className="novel-draft-brief-head">
                <span className="novel-draft-brief-label">章节开写任务书</span>
                <Tag className="novel-draft-brief-status" bordered={false}>{draftBriefSummary.statusLabel}</Tag>
                {draftBriefSummary.checks.map(check => (
                  <Tag key={check} bordered={false}>{check}</Tag>
                ))}
                <Text className="novel-draft-brief-focus">{draftBriefSummary.focus}</Text>
                {draftBriefSummary.actionKey && (
                  <Button
                    className="novel-draft-brief-action"
                    size="small"
                    type={draftBriefSummary.actionKey === 'build_brief' ? 'primary' : 'default'}
                    loading={draftBriefActionLoading}
                    onClick={runDraftBriefAction}
                  >
                    {draftBriefSummary.actionLabel}
                  </Button>
                )}
              </div>
              <div className="novel-draft-brief-grid">
                <div><span>本章目标</span><strong>{draftBriefSummary.briefFields.chapterGoal || '待补齐'}</strong></div>
                <div><span>读者承诺</span><strong>{draftBriefSummary.briefFields.readerPromise || '待生成任务书'}</strong></div>
                <div><span>核心冲突</span><strong>{draftBriefSummary.briefFields.coreConflict || '待补齐'}</strong></div>
                <div><span>情绪曲线</span><strong>{draftBriefSummary.briefFields.emotionalCurve || '待生成任务书'}</strong></div>
                <div><span>关键设定</span><strong>{draftBriefSummary.briefFields.keySettings || '无明确必用设定'}</strong></div>
                <div><span>禁揭/禁写</span><strong>{draftBriefSummary.briefFields.forbiddenContent || '无明确禁写项'}</strong></div>
                <div><span>场景预算</span><strong>{draftBriefSummary.briefFields.sceneBudget || `${sceneCards.length} 个场景`}</strong></div>
                <div><span>字数目标</span><strong>{draftBriefSummary.briefFields.wordBudget || `${generationTargetWordCount} 字`}</strong></div>
                <div><span>章末钩子</span><strong>{draftBriefSummary.briefFields.endingHook || '待补齐'}</strong></div>
              </div>
              {(draftBriefSummary.briefFields.writePreparationStatus || draftBriefSummary.briefFields.writePreparationSourceGaps || draftBriefSummary.briefFields.writePreparationMustConfirm) && (
                <div className="novel-draft-brief-write-preparation">
                  <span>写前准备确认</span>
                  <strong>状态：{draftBriefSummary.briefFields.writePreparationStatus || 'ready'}</strong>
                  <strong>来源缺口：{draftBriefSummary.briefFields.writePreparationSourceGaps || '无'}</strong>
                  <strong>资产关系：{draftBriefSummary.briefFields.writePreparationAssetRisks || '无'}</strong>
                  <strong>交稿动作：{draftBriefSummary.briefFields.writePreparationDeliveryActions || '无'}</strong>
                  <strong>蓝图焦点：{draftBriefSummary.briefFields.writePreparationBlueprintFocus || '按章节蓝图执行'}</strong>
                  <strong>读者回报：{draftBriefSummary.briefFields.writePreparationReaderPayoff || draftBriefSummary.briefFields.readerPromise || '按追读雷达兑现'}</strong>
                  <strong>必须确认：{draftBriefSummary.briefFields.writePreparationMustConfirm || '无'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.blueprintOutline || draftBriefSummary.briefFields.blueprintPlotLines || draftBriefSummary.briefFields.blueprintBeatSequence) && (
                <div className="novel-draft-brief-blueprint">
                  <span>章节蓝图合同</span>
                  <Button
                    className="novel-draft-brief-blueprint-edit"
                    size="small"
                    icon={<EditOutlined />}
                    disabled={!onSavePreDraftBrief || Boolean(preDraftBriefLoading || generatingProse)}
                    onClick={openChapterBlueprintEditor}
                  >
                    编辑蓝图
                  </Button>
                  <strong>目标情绪：{draftBriefSummary.briefFields.blueprintTargetEmotion || draftBriefSummary.briefFields.emotionalCurve || '明确本章读者情绪走向'}</strong>
                  <strong>开篇钩子：{draftBriefSummary.briefFields.blueprintOpeningHook || draftBriefSummary.briefFields.retentionOpeningHook || '前300字要有可见抓手'}</strong>
                  <strong>核心回报：{draftBriefSummary.briefFields.blueprintCorePayoff || draftBriefSummary.briefFields.readerPromise || '明确本章兑现给读者的爽点/信息/关系变化'}</strong>
                  <strong>五段式：{draftBriefSummary.briefFields.blueprintOutline || '按起因、发展、转折、高潮、收束执行'}</strong>
                  <strong>多线推进：{draftBriefSummary.briefFields.blueprintPlotLines || '主线、副线、事件线、关系线和逻辑线都要落到正文'}</strong>
                  <strong>人物顺序：{draftBriefSummary.briefFields.blueprintCharacterOrder || '按场景需要控制出场'}</strong>
                  <strong>关系变化：{draftBriefSummary.briefFields.blueprintRelationshipChange || draftBriefSummary.briefFields.characterArcRelationshipShift || '写成站队、亏欠、误解或信任变化'}</strong>
                  <strong>信息缺口：{draftBriefSummary.briefFields.blueprintInformationGap || draftBriefSummary.briefFields.retentionInformationGap || '保留可追读的问题'}</strong>
                  <strong>节拍功能：{draftBriefSummary.briefFields.blueprintBeatSequence || '每个场景要有功能标签和回报'}</strong>
                  <strong>代价收益：{draftBriefSummary.briefFields.blueprintCostAndReward || '主角选择必须有代价和读者回报'}</strong>
                  <strong>章尾承接：{draftBriefSummary.briefFields.blueprintEndingContract || draftBriefSummary.briefFields.endingHook || '最后一幕压到下一章拉力'}</strong>
                  {draftBriefSummary.briefFields.blueprintWritingIntent && (
                    <strong>写作意图：{draftBriefSummary.briefFields.blueprintWritingIntent}</strong>
                  )}
                </div>
              )}
              <div className="novel-draft-brief-retention">
                <span>追读雷达</span>
                <strong>开篇钩子：{draftBriefSummary.briefFields.retentionOpeningHook || '前300字要有抓手'}</strong>
                <strong>爽点承诺：{draftBriefSummary.briefFields.retentionPayoffPromise || draftBriefSummary.briefFields.readerPromise || '明确本章回报'}</strong>
                <strong>信息缺口：{draftBriefSummary.briefFields.retentionInformationGap || '保留待解问题'}</strong>
                <strong>短剧场面：{draftBriefSummary.briefFields.retentionShortDramaScene || '需要可视化冲突场面'}</strong>
                <strong>章末追读：{draftBriefSummary.briefFields.retentionEndingQuestion || draftBriefSummary.briefFields.endingHook || '压到最后一幕'}</strong>
              </div>
              {(draftBriefSummary.briefFields.readerDropRiskStatus || draftBriefSummary.briefFields.readerDropRisks || draftBriefSummary.briefFields.readerDropOpening) && (
                <div className="novel-draft-brief-reader-drop">
                  <span>弃读预警</span>
                  <strong>{draftBriefSummary.briefFields.readerDropRiskStatus || '起点1万均订试读基准'}</strong>
                  <strong>风险：{draftBriefSummary.briefFields.readerDropRisks || '无明确弃读点'}</strong>
                  <strong>开篇防弃读：{draftBriefSummary.briefFields.readerDropOpening || draftBriefSummary.briefFields.retentionOpeningHook || '前300字先给现场压力'}</strong>
                  <strong>中段防掉速：{draftBriefSummary.briefFields.readerDropMiddle || '减少设定解释，用行动推进'}</strong>
                  <strong>章末防流失：{draftBriefSummary.briefFields.readerDropEnding || draftBriefSummary.briefFields.retentionEndingQuestion || '留下下一章必须看的问题'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.storyDriveChoice || draftBriefSummary.briefFields.storyPressureSources || draftBriefSummary.briefFields.serialRhythmPayoffInterval || draftBriefSummary.briefFields.pageTurnQuestion) && (
                <div className="novel-draft-brief-story-pull">
                  <span>强故事节奏</span>
                  <strong>压力源：{draftBriefSummary.briefFields.storyPressureSources || draftBriefSummary.briefFields.storyDriveObstacle || '本章必须有外部阻碍'}</strong>
                  <strong>主角选择：{draftBriefSummary.briefFields.storyDriveChoice || '必须写成主动选择'}</strong>
                  <strong>选择代价：{draftBriefSummary.briefFields.storyDriveCost || draftBriefSummary.briefFields.storyPressureStakes || '选择必须有代价'}</strong>
                  <strong>回报密度：{draftBriefSummary.briefFields.serialRhythmPayoffInterval || '每800-1200字给一次回报'}</strong>
                  <strong>场景回报：{draftBriefSummary.briefFields.serialRhythmScenePayoffs || '每个场景有目标、转折和回报'}</strong>
                  <strong>章末翻页：{draftBriefSummary.briefFields.pageTurnQuestion || draftBriefSummary.briefFields.pageTurnPull || draftBriefSummary.briefFields.retentionEndingQuestion || '最后300字压追读问题'}</strong>
                  {(draftBriefSummary.briefFields.storyDriveChange || draftBriefSummary.briefFields.pageTurnTrigger || draftBriefSummary.briefFields.pageTurnForbidden) && (
                    <strong>边界：{[
                      draftBriefSummary.briefFields.storyDriveChange ? `状态变化：${draftBriefSummary.briefFields.storyDriveChange}` : '',
                      draftBriefSummary.briefFields.pageTurnTrigger ? `触发：${draftBriefSummary.briefFields.pageTurnTrigger}` : '',
                      draftBriefSummary.briefFields.pageTurnForbidden ? `禁提前解答：${draftBriefSummary.briefFields.pageTurnForbidden}` : '',
                    ].filter(Boolean).join('；')}</strong>
                  )}
                </div>
              )}
              {(draftBriefSummary.briefFields.longformBattleSummary || draftBriefSummary.briefFields.longformBattleRisks || draftBriefSummary.briefFields.longformBattleLaneRequirements) && (
                <div className="novel-draft-brief-battle">
                  <span>长篇作战承接</span>
                  <strong>状态：{draftBriefSummary.briefFields.longformBattleStatus || '待承接'}</strong>
                  <strong>风险线：{draftBriefSummary.briefFields.longformBattleRisks || draftBriefSummary.briefFields.longformBattleSummary || '无明确风险'}</strong>
                  <strong>今日优先：{draftBriefSummary.briefFields.longformBattlePrimaryAction || '按风险线补正文动作'}</strong>
                  <strong>写作动作：{draftBriefSummary.briefFields.longformBattleLaneRequirements || '保持核心、追读和剧情线不偏移'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.longformMemoryCorePromise || draftBriefSummary.briefFields.longformMemoryCharacters || draftBriefSummary.briefFields.longformMemoryQuestions || draftBriefSummary.briefFields.longformMemoryPayoffDebts) && (
                <div className="novel-draft-brief-memory-capsule">
                  <span>长篇记忆胶囊</span>
                  <strong>同步：{draftBriefSummary.briefFields.longformMemoryStatus || '待同步'}</strong>
                  <strong>核心承诺：{draftBriefSummary.briefFields.longformMemoryCorePromise || '按写作圣经执行'}</strong>
                  <strong>主线进度：{draftBriefSummary.briefFields.longformMemoryMainline || '按当前章任务推进'}</strong>
                  <strong>角色状态：{draftBriefSummary.briefFields.longformMemoryCharacters || '无明确状态'}</strong>
                  <strong>开放悬念：{draftBriefSummary.briefFields.longformMemoryQuestions || '无'}</strong>
                  <strong>待兑现：{draftBriefSummary.briefFields.longformMemoryPayoffDebts || '无'}</strong>
                  <strong>正史事实：{draftBriefSummary.briefFields.longformMemoryCanonFacts || '无'}</strong>
                  <strong>红线：{draftBriefSummary.briefFields.longformMemoryRedLines || '不得偏离核心承诺'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.governanceMemoryStatus || draftBriefSummary.briefFields.governanceMemoryEvidence || draftBriefSummary.briefFields.governanceMemoryWatchItems) && (
                <div className="novel-draft-brief-governance-memory">
                  <span>治理复查承接</span>
                  <strong>{draftBriefSummary.briefFields.governanceMemoryStatus || '治理复查已记录'}</strong>
                  <strong>摘要：{draftBriefSummary.briefFields.governanceMemorySummary || '沿用上一轮修后证据'}</strong>
                  <strong>修后证据：{draftBriefSummary.briefFields.governanceMemoryEvidence || '无'}</strong>
                  {draftBriefSummary.briefFields.governanceMemoryFailedEvidence && (
                    <strong>失效依据：{draftBriefSummary.briefFields.governanceMemoryFailedEvidence}</strong>
                  )}
                  <strong>观察项：{draftBriefSummary.briefFields.governanceMemoryWatchItems || '无'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.handoffPreviousEnding || draftBriefSummary.briefFields.handoffOpeningObligation || draftBriefSummary.briefFields.handoffMustCarry || draftBriefSummary.briefFields.handoffKeepAlive) && (
                <div className="novel-draft-brief-handoff">
                  <span>上一章承接</span>
                  <strong>最后一幕：{draftBriefSummary.briefFields.handoffPreviousEnding || '承接上一章章末钩子'}</strong>
                  <strong>开篇义务：{draftBriefSummary.briefFields.handoffOpeningObligation || '开篇接住上一章悬念'}</strong>
                  <strong>必须推进：{draftBriefSummary.briefFields.handoffMustCarry || '无跨章欠账'}</strong>
                  <strong>继续悬念：{draftBriefSummary.briefFields.handoffKeepAlive || '无跨章悬念'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.nextChapterQualityFocus || draftBriefSummary.briefFields.nextChapterQualityOpening || draftBriefSummary.briefFields.nextChapterQualityAvoid) && (
                <div className="novel-draft-brief-next-quality">
                  <span>下一章质量续航</span>
                  <strong>质量目标：{draftBriefSummary.briefFields.nextChapterQualityFocus || '承接上一章自检质量目标'}</strong>
                  <strong>开篇：{draftBriefSummary.briefFields.nextChapterQualityOpening || '前300字接住上一章风险'}</strong>
                  <strong>中段：{draftBriefSummary.briefFields.nextChapterQualityMiddle || '把风险写成可见冲突或信息变化'}</strong>
                  <strong>章末：{draftBriefSummary.briefFields.nextChapterQualityEnding || '压出下一章追读问题'}</strong>
                  <strong>禁用重复：{draftBriefSummary.briefFields.nextChapterQualityAvoid || '避免复现上一章自检指出的套路'}</strong>
                  {draftBriefSummary.briefFields.nextChapterQualityEvidence && (
                    <strong>依据：{draftBriefSummary.briefFields.nextChapterQualityEvidence}</strong>
                  )}
                </div>
              )}
              {(draftBriefSummary.briefFields.deliveryRiskLabel || draftBriefSummary.briefFields.deliveryRiskItems || draftBriefSummary.briefFields.deliveryRiskActions) && (
                <div className="novel-draft-brief-delivery-risk">
                  <span>交稿风险承接</span>
                  <strong>{draftBriefSummary.briefFields.deliveryRiskLabel || '上一章待复盘'}</strong>
                  <strong>优先：{draftBriefSummary.briefFields.deliveryRiskPriority || '先处理最高风险'}</strong>
                  <strong>风险：{draftBriefSummary.briefFields.deliveryRiskItems || '无明确残留风险'}</strong>
                  <strong>动作：{draftBriefSummary.briefFields.deliveryRiskActions || '写成开篇承接、场景推进或章末钩子'}</strong>
                  {draftBriefSummary.briefFields.deliveryRiskOpeningActions && (
                    <strong>开篇：{draftBriefSummary.briefFields.deliveryRiskOpeningActions}</strong>
                  )}
                  {draftBriefSummary.briefFields.deliveryRiskMiddleActions && (
                    <strong>中段：{draftBriefSummary.briefFields.deliveryRiskMiddleActions}</strong>
                  )}
                  {draftBriefSummary.briefFields.deliveryRiskEndingActions && (
                    <strong>章末：{draftBriefSummary.briefFields.deliveryRiskEndingActions}</strong>
                  )}
                  {draftBriefSummary.briefFields.deliveryRiskEvidence && (
                    <strong>证据：{draftBriefSummary.briefFields.deliveryRiskEvidence}</strong>
                  )}
                </div>
              )}
              {(draftBriefSummary.briefFields.expectationMustDeliver || draftBriefSummary.briefFields.expectationKeepAlive) && (
                <div className="novel-draft-brief-expectations">
                  <span>读者期待账本</span>
                  <strong>必须兑现：{draftBriefSummary.briefFields.expectationMustDeliver || '承接本章读者承诺'}</strong>
                  <strong>保持悬念：{draftBriefSummary.briefFields.expectationKeepAlive || '无明确长期悬念'}</strong>
                  <strong>禁止破坏：{draftBriefSummary.briefFields.expectationMustNotBreak || '不得只铺设定不兑现期待'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.expectationDebtMustCarry || draftBriefSummary.briefFields.expectationDebtKeepAlive || draftBriefSummary.briefFields.expectationDebtOverdue || draftBriefSummary.briefFields.expectationCarryOver) && (
                <div className="novel-draft-brief-expectation-debt">
                  <span>期待债务承接</span>
                  {draftBriefSummary.briefFields.expectationDebtOverdue && (
                    <strong>逾期优先：{draftBriefSummary.briefFields.expectationDebtOverdue}</strong>
                  )}
                  <strong>待兑现：{draftBriefSummary.briefFields.expectationDebtMustCarry || draftBriefSummary.briefFields.expectationCarryOver || '无跨章欠账'}</strong>
                  <strong>继续悬念：{draftBriefSummary.briefFields.expectationDebtKeepAlive || '无跨章悬念'}</strong>
                  {draftBriefSummary.briefFields.expectationDebtSummary && (
                    <strong>债务概览：{draftBriefSummary.briefFields.expectationDebtSummary}</strong>
                  )}
                </div>
              )}
              {(draftBriefSummary.briefFields.first30RetentionSegment || draftBriefSummary.briefFields.first30RetentionFlags) && (
                <div className="novel-draft-brief-first30">
                  <span>前30章留存修复</span>
                  <strong>{draftBriefSummary.briefFields.first30RetentionSegment || '当前章'}</strong>
                  <strong>风险：{draftBriefSummary.briefFields.first30RetentionFlags || draftBriefSummary.briefFields.first30RetentionFocus || '无明确风险'}</strong>
                  <strong>动作：{draftBriefSummary.briefFields.first30RetentionActions || '按追读雷达补强'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.recentFatigueRange || draftBriefSummary.briefFields.recentFatigueRisks || draftBriefSummary.briefFields.recentFatigueConflict) && (
                <div className="novel-draft-brief-recent-fatigue">
                  <span>近10章疲劳规避</span>
                  <strong>{draftBriefSummary.briefFields.recentFatigueRange || '近10章'}</strong>
                  <strong>风险：{draftBriefSummary.briefFields.recentFatigueRisks || '无明确疲劳风险'}</strong>
                  <strong>冲突换源：{draftBriefSummary.briefFields.recentFatigueConflict || '更换压迫来源'}</strong>
                  <strong>回报换形：{draftBriefSummary.briefFields.recentFatiguePayoff || '更换回报形态'}</strong>
                  <strong>钩子换题：{draftBriefSummary.briefFields.recentFatigueHook || '更换章末问题'}</strong>
                  <strong>场面新鲜：{draftBriefSummary.briefFields.recentFatigueScene || '补新可视化场面'}</strong>
                  {draftBriefSummary.briefFields.recentFatigueActions && (
                    <strong>动作：{draftBriefSummary.briefFields.recentFatigueActions}</strong>
                  )}
                </div>
              )}
              <div className="novel-draft-brief-innovation">
                <span>创新执行</span>
                <strong>创新角度：{draftBriefSummary.briefFields.innovationAngle || '承接长篇作品罗盘'}</strong>
                <strong>执行点：{draftBriefSummary.briefFields.innovationExecution || '用本章动作/规则/反差落地'}</strong>
                <strong>差异护栏：{draftBriefSummary.briefFields.innovationGuardrails || '不得写成普通套路章'}</strong>
                <strong>IP化场面：{draftBriefSummary.briefFields.innovationIpHooks || draftBriefSummary.briefFields.retentionShortDramaScene || '保留可视化场面'}</strong>
              </div>
              {(draftBriefSummary.briefFields.signatureScene || draftBriefSummary.briefFields.signatureSceneTarget) && (
                <div className="novel-draft-brief-signature-scene">
                  <span>强场面补位</span>
                  <strong>标志性场面：{draftBriefSummary.briefFields.signatureScene || '本章必须补一个可记忆画面'}</strong>
                  <strong>补位目标：{draftBriefSummary.briefFields.signatureSceneTarget || '修复强场面覆盖缺口'}</strong>
                  <strong>爽点回报：{draftBriefSummary.briefFields.signatureScenePayoff || '落成可见读者回报'}</strong>
                  <strong>服务主线：{draftBriefSummary.briefFields.signatureSceneStoryline || '服务当前主线推进'}</strong>
                </div>
              )}
              <div className="novel-draft-brief-storylines">
                <span>剧情线推进</span>
                <strong>必推：{draftBriefSummary.briefFields.storylineAdvances || '无'}</strong>
                <strong>埋线：{draftBriefSummary.briefFields.storylinePlants || '无'}</strong>
                <strong>回收：{draftBriefSummary.briefFields.storylinePayoffs || '无'}</strong>
                <strong>禁用：{draftBriefSummary.briefFields.storylineForbidden || '无'}</strong>
              </div>
              {(draftBriefSummary.briefFields.characterArcDesire || draftBriefSummary.briefFields.characterArcGrowthBeat || draftBriefSummary.briefFields.characterArcRelationshipShift) && (
                <div className="novel-draft-brief-character-arc">
                  <span>人物成长承接</span>
                  <strong>人物线：{draftBriefSummary.briefFields.characterArcNames || '本章角色/关系线'}</strong>
                  <strong>角色欲望：{draftBriefSummary.briefFields.characterArcDesire || '用欲望驱动行动'}</strong>
                  <strong>缺陷受压：{draftBriefSummary.briefFields.characterArcFlawPressure || '让旧习惯被冲突逼出反应'}</strong>
                  <strong>成长节点：{draftBriefSummary.briefFields.characterArcGrowthBeat || '写成选择或行动变化'}</strong>
                  <strong>关系变化：{draftBriefSummary.briefFields.characterArcRelationshipShift || '写成对话、试探、站队或亏欠'}</strong>
                  <strong>口吻锚点：{draftBriefSummary.briefFields.characterArcVoiceAnchor || '保持角色说话和行动方式差异'}</strong>
                  <strong>禁揭：{draftBriefSummary.briefFields.characterArcForbiddenReveal || '不得提前写穿后续关系/成长结果'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.storyUnitRange || draftBriefSummary.briefFields.storyUnitRole || draftBriefSummary.briefFields.storyUnitGoal) && (
                <div className="novel-draft-brief-story-unit">
                  <span>剧情单元任务</span>
                  <strong>{draftBriefSummary.briefFields.storyUnitRange || '当前剧情单元'}</strong>
                  <strong>当前职责：{draftBriefSummary.briefFields.storyUnitRole || '承接本章任务书'}</strong>
                  <strong>单元目标：{draftBriefSummary.briefFields.storyUnitGoal || '推进当前事件包'}</strong>
                  <strong>小高潮：{draftBriefSummary.briefFields.storyUnitPayoff || '后续章节兑现，不在本章抢跑'}</strong>
                  <strong>出单元钩子：{draftBriefSummary.briefFields.storyUnitExitHook || '保留追读问题'}</strong>
                  <strong>禁抢跑：{draftBriefSummary.briefFields.storyUnitForbidden || '不得提前消费后段爆点'}</strong>
                </div>
              )}
              {(draftBriefSummary.briefFields.volumeClimaxRange || draftBriefSummary.briefFields.volumeClimaxRole || draftBriefSummary.briefFields.volumeClimaxGoal) && (
                <div className="novel-draft-brief-volume-climax">
                  <span>卷级爆点预算</span>
                  <strong>{draftBriefSummary.briefFields.volumeClimaxRange || '当前卷爆点'}</strong>
                  <strong>本章爆点职责：{draftBriefSummary.briefFields.volumeClimaxRole || '承接当前卷节奏'}</strong>
                  <strong>卷目标：{draftBriefSummary.briefFields.volumeClimaxGoal || '服务当前卷主线推进'}</strong>
                  <strong>高潮承诺：{draftBriefSummary.briefFields.volumeClimaxPromise || '本章必须给阶段性回报'}</strong>
                  <strong>必须兑现：{draftBriefSummary.briefFields.volumeClimaxRequiredBeats || '按场景卡兑现本章爆点'}</strong>
                  <strong>禁提前消费：{draftBriefSummary.briefFields.volumeClimaxForbidden || '不得提前揭穿卷末爆点'}</strong>
                  {draftBriefSummary.briefFields.volumeClimaxNearbyBeats && (
                    <strong>邻近爆点：{draftBriefSummary.briefFields.volumeClimaxNearbyBeats}</strong>
                  )}
                  {draftBriefSummary.briefFields.volumeClimaxNextActions && (
                    <strong>动作：{draftBriefSummary.briefFields.volumeClimaxNextActions}</strong>
                  )}
                </div>
              )}
              {(draftBriefSummary.briefFields.batchGoal || draftBriefSummary.briefFields.batchCurrentRole) && (
                <div className="novel-draft-brief-batch">
                  <span>本批连载任务</span>
                  <strong>{draftBriefSummary.briefFields.batchRange || '当前批次'}</strong>
                  <strong>批次目标：{draftBriefSummary.briefFields.batchGoal || '保持连载推进'}</strong>
                  <strong>本章职责：{draftBriefSummary.briefFields.batchCurrentRole || '承接本章任务书'}</strong>
                  <strong>禁抢跑：{draftBriefSummary.briefFields.batchForbidden || '不得提前消费后续爆点'}</strong>
                </div>
              )}
              <div className="novel-draft-brief-meme">
                <span>本章网感策略</span>
                <strong>强度：{draftBriefSummary.briefFields.memeIntensity || '无'}</strong>
                <strong>功能：{draftBriefSummary.briefFields.memeFunctions || '无'}</strong>
                <strong>禁用：{draftBriefSummary.briefFields.memeForbidden || '严肃场景不玩梗'}</strong>
              </div>
              {(draftBriefSummary.briefFields.styleSampleKeys || draftBriefSummary.briefFields.styleSampleUsage || draftBriefSummary.briefFields.styleSampleControlState) && (
                <div className="novel-draft-brief-style-samples">
                  <span>本章风格样章</span>
                  <strong>状态：{draftBriefSummary.briefFields.styleSampleControlState || '系统推荐待确认'}</strong>
                  <strong>样章：{draftBriefSummary.briefFields.styleSampleKeys || '未指定'}</strong>
                  <strong>学习：{draftBriefSummary.briefFields.styleSampleUsage || '只学习节奏与句式'}</strong>
                  <strong>命中：{draftBriefSummary.briefFields.styleSampleReasons || '按本章目标与场景卡匹配'}</strong>
                  <strong>禁抄：{draftBriefSummary.briefFields.styleSampleForbidden || '原句不能照搬'}</strong>
                  <div className="novel-draft-brief-style-actions">
                    <Tooltip title="确认本章使用当前风格样章策略">
                      <Button size="small" icon={<CheckCircleOutlined />} loading={styleSampleActionLoading} disabled={styleSampleActionDisabled || !onLockStyleSamples} onClick={onLockStyleSamples}>
                        锁定样章
                      </Button>
                    </Tooltip>
                    <Tooltip title="替换为另一组更适合本章的风格样章策略">
                      <Button size="small" icon={<SyncOutlined />} loading={styleSampleActionLoading} disabled={styleSampleActionDisabled || !onReplaceStyleSamples} onClick={onReplaceStyleSamples}>
                        换一组
                      </Button>
                    </Tooltip>
                    <Tooltip title="本章不使用风格样章，只按任务书和写作圣经生成">
                      <Button size="small" icon={<StopOutlined />} loading={styleSampleActionLoading} disabled={styleSampleActionDisabled || !onDisableStyleSamples} onClick={onDisableStyleSamples}>
                        不用样章
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              )}
              {(draftBriefSummary.briefFields.chapterBenchmarkKeys || draftBriefSummary.briefFields.chapterBenchmarkUsage) && (
                <div className="novel-draft-brief-benchmark-samples">
                  <span>本章质量基准</span>
                  <strong>样例：{draftBriefSummary.briefFields.chapterBenchmarkKeys || '未指定'}</strong>
                  <strong>学习：{draftBriefSummary.briefFields.chapterBenchmarkUsage || '只学习章节结构与追读节拍'}</strong>
                  <strong>禁抄：{draftBriefSummary.briefFields.chapterBenchmarkForbidden || '不得复制桥段、角色名、设定和原句'}</strong>
                </div>
              )}
            </div>
          </div>
        )}
        <Modal
          title="编辑章节蓝图合同"
          open={blueprintEditorOpen}
          width={860}
          okText="保存蓝图"
          cancelText="取消"
          confirmLoading={Boolean(preDraftBriefLoading)}
          onOk={saveChapterBlueprintEditor}
          onCancel={() => setBlueprintEditorOpen(false)}
          destroyOnClose
        >
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Input.TextArea
              value={blueprintEditorText}
              onChange={(event) => {
                setBlueprintEditorText(event.target.value)
                if (blueprintEditorError) setBlueprintEditorError('')
              }}
              autoSize={{ minRows: 16, maxRows: 26 }}
              style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12 }}
            />
            {blueprintEditorError && <Text type="danger">{blueprintEditorError}</Text>}
          </Space>
        </Modal>
  </>
  )
}
