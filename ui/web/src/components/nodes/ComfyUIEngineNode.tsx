import React from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Card, Tag, Typography } from 'antd'
import { nodeRegistry } from '../../utils/nodeRegistry'

const { Text } = Typography

function ComfyUIEngineNodeImpl({ data }: NodeProps) {
  return <Card bordered={false} size="small" style={{ borderRadius: 16, boxShadow: '0 10px 28px rgba(15, 23, 42, 0.08)', minWidth: 240 }} bodyStyle={{ padding: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <Text strong>算力引擎</Text>
      <Tag color="purple">ENGINE</Tag>
    </div>
    <div style={{ fontSize: 12, color: '#475569' }}>{data?.label || 'ComfyUI / 物理引擎'}</div>
    <Handle type="target" position={Position.Left} style={{ background: '#8b5cf6' }} />
    <Handle type="source" position={Position.Right} style={{ background: '#8b5cf6' }} />
  </Card>
}

nodeRegistry.register({ type: 'comfyUIEngine', displayName: '算力引擎节点', component: ComfyUIEngineNodeImpl })
export default ComfyUIEngineNodeImpl
