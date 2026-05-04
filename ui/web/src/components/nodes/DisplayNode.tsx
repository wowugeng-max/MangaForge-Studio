import React from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Card, Empty, Image, Tag, Typography } from 'antd'
import { nodeRegistry } from '../../utils/nodeRegistry'

const { Text } = Typography

function DisplayNodeImpl({ data }: NodeProps) {
  const preview = data?.result?.file_path || data?.result?.content || data?.incoming_data?.file_path || data?.incoming_data?.content
  return <Card bordered={false} size="small" style={{ borderRadius: 16, boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)', background: 'rgba(255,255,255,0.96)', minWidth: 260 }} bodyStyle={{ padding: 12 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <Text strong>结果展示</Text>
      <Tag color="blue">DISPLAY</Tag>
    </div>
    {preview ? (typeof preview === 'string' && (preview.startsWith('http') || preview.startsWith('data:') || preview.match(/\.(png|jpg|jpeg|webp|gif)$/i)) ? <Image src={preview.startsWith('http') || preview.startsWith('data:') ? preview : `/api/assets/media/${preview}`} style={{ borderRadius: 12 }} preview={false} /> : <pre style={{ margin: 0, whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 12, borderRadius: 12, fontSize: 12, maxHeight: 220, overflow: 'auto' }}>{String(preview)}</pre>) : <Empty description="等待上游输出" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
    <Handle type="target" position={Position.Left} style={{ background: '#1890ff' }} />
  </Card>
}

nodeRegistry.register({ type: 'display', displayName: '结果展示节点', component: DisplayNodeImpl })
export default DisplayNodeImpl
