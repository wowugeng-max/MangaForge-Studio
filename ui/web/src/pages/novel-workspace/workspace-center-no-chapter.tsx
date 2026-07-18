import React from 'react'
import { FileTextOutlined } from '@ant-design/icons'
import { Button, Space, Typography } from 'antd'

const { Title } = Typography

export function WorkspaceCenterNoChapter({
  onCreateChapter,
}: {
  onCreateChapter: () => void
}) {
  return (
    <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
      <Space direction="vertical" align="center" size={16}>
        <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
        <Title level={4}>请选择一个章节</Title>
        <Button type="primary" onClick={onCreateChapter}>创建第一章</Button>
      </Space>
    </div>
  )
}
