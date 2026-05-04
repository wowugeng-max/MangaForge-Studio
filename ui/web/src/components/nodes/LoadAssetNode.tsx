import React from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Card, Tag, Typography } from 'antd'
import { nodeRegistry } from '../../utils/nodeRegistry'

const { Text } = Typography

function LoadAssetNodeImpl({ data }: NodeProps) {
  const asset = data?.asset
  return <Card bordered={false} size="small" style={{ borderRadius: 16, boxShadow: '0 10px 28px rgba(15, 23, 42, 0.08)', minWidth: 240 }} bodyStyle={{ padding: 12 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <Text strong>资产输入</Text>
      <Tag color="green">ASSET</Tag>
    </div>
    <div style={{ fontSize: 12, color: '#475569' }}>{asset?.name || data?.label || '未选择资产'}</div>
    <Handle type="source" position={Position.Right} style={{ background: '#22c55e' }} />
  </Card>
}

nodeRegistry.register({ type: 'loadAsset', displayName: '资产输入节点', component: LoadAssetNodeImpl })
export default LoadAssetNodeImpl
