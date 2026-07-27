import React from 'react'
import { NodeToolbar, Position } from 'reactflow'
import { Button, Tooltip, Typography } from 'antd'
import { CloseOutlined } from '@ant-design/icons'

const { Text } = Typography

type NodeConfigToolbarProps = {
  open: boolean
  onClose: () => void
  title: string
  width?: number
  position?: Position
  children: React.ReactNode
}

// 挂在 React Flow NodeToolbar 上的配置面板容器：自动跟随节点、不随缩放变形。
export function NodeConfigToolbar({ open, onClose, title, width = 400, position = Position.Right, children }: NodeConfigToolbarProps) {
  return (
    <NodeToolbar isVisible={open} position={position} align="start" offset={12}>
      <div
        data-config-panel
        className="nodrag nowheel"
        style={{
          width,
          maxHeight: 480,
          overflowY: 'auto',
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          boxShadow: '0 16px 48px rgba(15,23,42,0.18), 0 2px 10px rgba(15,23,42,0.08)',
          padding: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', flex: 1 }}>{title}</Text>
          <Tooltip title="关闭">
            <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} />
          </Tooltip>
        </div>
        {children}
      </div>
    </NodeToolbar>
  )
}
