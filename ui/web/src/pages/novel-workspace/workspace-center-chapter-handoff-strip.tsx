import React from 'react'
import { Button, Tag, Typography } from 'antd'
import { ClickDetailPopover, asDetailItems } from './workspace-center-click-detail'

const { Text } = Typography

function HandoffDetailCard({
  label,
  summary,
  items,
  className,
}: {
  label: string
  summary: string
  items: string[]
  className?: string
}) {
  const detailItems = asDetailItems(items.length ? items : [summary])
  return (
    <ClickDetailPopover title={label} items={detailItems}>
      <div className={`novel-chapter-handoff-card novel-delivery-chip-interactive ${className || ''}`.trim()} role="button" tabIndex={0}>
        <span>{label}</span>
        <strong>{summary}</strong>
      </div>
    </ClickDetailPopover>
  )
}

export function WorkspaceChapterHandoffStrip(props: Record<string, any>) {
  const { chapterHandoffDesk, deliveryActionLoading, onDeliveryAction } = props
  if (!chapterHandoffDesk?.visible) return null

  const previousEnding = chapterHandoffDesk.previousEnding || '无明确章末钩子'
  const expectationItems = Array.isArray(chapterHandoffDesk.expectationCarryOver)
    ? chapterHandoffDesk.expectationCarryOver
    : []
  const openingItems = Array.isArray(chapterHandoffDesk.nextOpeningObligations)
    ? chapterHandoffDesk.nextOpeningObligations
    : []
  const riskItems = Array.isArray(chapterHandoffDesk.deliveryRiskCarryOver?.items)
    ? chapterHandoffDesk.deliveryRiskCarryOver.items
    : []

  return (
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
          <HandoffDetailCard
            label="上一章钩子"
            summary={previousEnding}
            items={[previousEnding]}
          />
          <HandoffDetailCard
            label="期待承接"
            summary={expectationItems.join('；') || '无期待欠账'}
            items={expectationItems.length ? expectationItems : ['无期待欠账']}
          />
          <HandoffDetailCard
            label="下一章开场"
            summary={openingItems.join('；') || '承接上一章最后一幕'}
            items={openingItems.length ? openingItems : ['承接上一章最后一幕']}
          />
          {chapterHandoffDesk.deliveryRiskCarryOver && (
            <HandoffDetailCard
              className="novel-chapter-handoff-risk"
              label="交稿风险"
              summary={`${chapterHandoffDesk.deliveryRiskCarryOver.label} · ${chapterHandoffDesk.deliveryRiskCarryOver.priorityLabel}`}
              items={riskItems.length
                ? riskItems
                : [`${chapterHandoffDesk.deliveryRiskCarryOver.label} · ${chapterHandoffDesk.deliveryRiskCarryOver.priorityLabel}`]}
            />
          )}
        </div>
      </div>
      <Button
        className="novel-chapter-handoff-action novel-btn-crystal novel-btn-crystal-display"
        type={chapterHandoffDesk.status === 'ready' ? 'primary' : 'default'}
        size="small"
        loading={deliveryActionLoading && chapterHandoffDesk.status !== 'ready'}
        onClick={() => onDeliveryAction?.(chapterHandoffDesk.actionKey)}
      >
        {chapterHandoffDesk.actionLabel}
      </Button>
    </div>
  )
}
