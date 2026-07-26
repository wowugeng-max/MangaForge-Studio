import React from 'react'
import { displayValue } from './utils'
import { Button, Space, Tag, Tooltip, Typography } from 'antd'
import {
  ExperimentOutlined,
} from '@ant-design/icons'
const { Text } = Typography

export function WorkspaceWritingQueueStrip(props: Record<string, any>) {
  const { currentQueueItem, deliverySummary, onRepairWritingQueuePlanBatch, queueFocus, selectWritingQueueChapter, writingQueue } = props
  return (
    <>
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
                    className="novel-writing-queue-focus-action novel-btn-crystal novel-btn-crystal-model"
                    loading={queueFocus.loading}
                    disabled={queueFocus.disabled}
                    onClick={queueFocus.run}>
                    {queueFocus.actionLabel}
                  </Button>
                </Space>
              </div>
            )}
          </div>
        )}

    </>
  )
}
