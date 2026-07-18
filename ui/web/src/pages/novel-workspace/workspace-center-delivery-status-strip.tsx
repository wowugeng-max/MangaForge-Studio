import React from 'react'
import { Button, Space, Tag, Tooltip, Typography } from 'antd'
import {
  SyncOutlined,
} from '@ant-design/icons'
const { Text } = Typography

export function WorkspaceDeliveryStatusStrip(props: Record<string, any>) {
  const { deliveryActionLoading, deliveryNeedsStorySync, deliveryNextStepText, deliveryQualityDetail, deliveryQualityPending, deliveryStoryDetail, deliverySummary, ipSceneIntakeTooltip, onDeliveryAction, onOpenStoryAssets } = props
  return (
    <>
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

    </>
  )
}
