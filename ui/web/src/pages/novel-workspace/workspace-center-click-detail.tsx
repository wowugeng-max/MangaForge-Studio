import React from 'react'
import { Popover, Typography } from 'antd'

const { Text } = Typography

export function asDetailItems(...parts: Array<string | string[] | null | undefined>) {
  const items: string[] = []
  for (const part of parts) {
    if (!part) continue
    if (Array.isArray(part)) {
      for (const item of part) {
        const text = String(item || '').trim()
        if (text) items.push(text)
      }
      continue
    }
    const text = String(part).trim()
    if (!text) continue
    if (text.includes('；')) {
      for (const piece of text.split('；')) {
        const trimmed = piece.trim()
        if (trimmed) items.push(trimmed)
      }
    } else {
      items.push(text)
    }
  }
  // de-dupe while preserving order
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item)) return false
    seen.add(item)
    return true
  })
}

export function ClickDetailPopover({
  title,
  items = [],
  children,
  actionLabel,
  onAction,
  placement = 'topLeft',
}: {
  title: React.ReactNode
  items?: Array<string | null | undefined> | string
  children: React.ReactElement
  actionLabel?: string
  onAction?: () => void
  placement?: 'top' | 'topLeft' | 'topRight' | 'bottom' | 'bottomLeft' | 'bottomRight'
}) {
  const detailItems = asDetailItems(items)
  if (!detailItems.length && !onAction) return children

  return (
    <Popover
      trigger="click"
      placement={placement}
      destroyTooltipOnHide
      overlayClassName="novel-delivery-chip-popover"
      align={{ overflow: { adjustX: true, adjustY: true } }}
      content={(
        <div className="novel-delivery-chip-panel" onClick={(event) => event.stopPropagation()}>
          <div className="novel-delivery-chip-panel-head">
            <Text strong className="novel-delivery-chip-panel-title">{title}</Text>
            <Text type="secondary" className="novel-delivery-chip-panel-hint">
              点击查看 · 共 {detailItems.length || 0} 条
            </Text>
          </div>
          {detailItems.length > 0 ? (
            <ul className="novel-delivery-chip-panel-list">
              {detailItems.map((item, index) => (
                <li key={`${index}-${item.slice(0, 24)}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <div className="novel-delivery-chip-panel-empty">暂无更多明细</div>
          )}
          {onAction ? (
            <button type="button" className="novel-delivery-chip-panel-action" onClick={onAction}>
              {actionLabel || '打开对应处理入口'}
            </button>
          ) : null}
        </div>
      )}
    >
      {children}
    </Popover>
  )
}
