import React from 'react'
import { WorkspaceDeliveryStatusChips } from './workspace-center-delivery-status-chips'
import { Button, Space, Tag, Tooltip, Typography } from 'antd'
import {
  SyncOutlined,
} from '@ant-design/icons'
const { Text } = Typography

export function WorkspaceDeliveryStatusStrip(props: Record<string, any>) {
  const { deliveryActionLoading, deliveryNeedsStorySync, deliveryNextStepText, deliveryQualityDetail, deliveryQualityPending, deliveryStoryDetail, deliverySummary, ipSceneIntakeTooltip, onDeliveryAction, onOpenStoryAssets, revisionActionDisabled } = props
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
                      className="novel-delivery-status-action novel-btn-crystal novel-btn-crystal-model"
                      type="primary"
                      size="small"
                      disabled={revisionActionDisabled?.(deliverySummary.actionKey)}
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
                      disabled={revisionActionDisabled?.(deliverySummary.storyStateSyncAction!.key)}
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

              <WorkspaceDeliveryStatusChips
                mode="summary"
                deliverySummary={deliverySummary}
                ipSceneIntakeTooltip={ipSceneIntakeTooltip}
                onOpenStoryAssets={onOpenStoryAssets}
              />
            </div>
          </div>
        )}

    </>
  )
}
