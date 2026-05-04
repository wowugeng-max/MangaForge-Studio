import React from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Card, Tag, Typography } from 'antd'
import { nodeRegistry } from '../../utils/nodeRegistry'

const { Text } = Typography

function GroupNodeImpl({ data }: NodeProps) {
  return <Card bordered={false} size="small" style={{ borderRadius: 18, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.16)', minWidth: 220 }} bodyStyle={{ padding: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text strong>节点组</Text>
      <Tag color="purple">GROUP</Tag>
    </div>
    <div style={{ marginTop: 8, fontSize: 12, color: '#475569' }}>{data?.label || 'Group'}</div>
    <Handle type="target" position={Position.Left} style={{ background: '#8b5cf6' }} />
    <Handle type="source" position={Position.Right} style={{ background: '#8b5cf6' }} />
  </Card>
}

nodeRegistry.register({ type: 'nodeGroup', displayName: '节点组', component: GroupNodeImpl })
export default GroupNodeImpl
