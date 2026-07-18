import React from 'react'
import { Button, Tag, Tooltip, Typography } from 'antd'
const { Text } = Typography

export function WorkspaceChapterHandoffStrip(props: Record<string, any>) {
  const { chapterHandoffDesk, deliveryActionLoading, onDeliveryAction } = props
  return (
    <>
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

    </>
  )
}
