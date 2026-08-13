import React from 'react'
import { Handle, Position, type HandleType } from 'reactflow'
import { Tooltip } from 'antd'
import { getTypeColor, getTypeLabel } from '../../utils/handleTypes'

export const COLLAPSED_HANDLE_TOP = 21

export function resolveTypedHandleTop(collapsed: boolean | undefined, top: number | string | undefined): number | string {
  if (collapsed) return COLLAPSED_HANDLE_TOP
  return top ?? '50%'
}

type TypedHandleProps = {
  id: string
  type: HandleType
  position: Position
  dataType: string
  label?: string
  top?: number | string
  collapsed?: boolean
  color?: string
  isConnectable?: boolean
}

export function TypedHandle({ id, type, position, dataType, label, top, collapsed, color, isConnectable }: TypedHandleProps) {
  const background = color || getTypeColor(dataType)
  const title = `${label || (type === 'target' ? '输入' : '输出')} · ${getTypeLabel(dataType)}`
  return (
    <Tooltip title={title} placement={position === Position.Left ? 'left' : 'right'}>
      <Handle
        id={id}
        type={type}
        position={position}
        isConnectable={isConnectable}
        className="typed-handle"
        style={{ top: resolveTypedHandleTop(collapsed, top), background, width: 14, height: 14, border: '2px solid #fff', transition: 'transform 0.15s ease, top 0.2s ease' }}
      />
    </Tooltip>
  )
}
