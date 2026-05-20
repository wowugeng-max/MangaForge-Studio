import React from 'react'
import { Button, Modal, Space, Tree, Typography } from 'antd'
import { BookOutlined, EditOutlined } from '@ant-design/icons'

const { Text } = Typography

export function OutlineTreeModal({
  open,
  treeData,
  activeChapterId,
  activeOutlineIds = [],
  onClose,
  onCreateOutline,
  onSelectOutline,
  onSelectChapter,
}: {
  open: boolean
  treeData: any[]
  activeChapterId: number | null
  activeOutlineIds?: number[]
  onClose: () => void
  onCreateOutline: () => void
  onSelectOutline?: (outlineId: number) => void
  onSelectChapter: (chapterId: number) => void
}) {
  const handleSelect = (keys: React.Key[]) => {
    const key = String(keys?.[0] || '')
    if (key.startsWith('chapter-')) {
      const chapterId = Number(key.replace('chapter-', ''))
      if (chapterId) onSelectChapter(chapterId)
      return
    }
    if (key.startsWith('outline-')) {
      const outlineId = Number(key.replace('outline-', ''))
      if (outlineId && onSelectOutline) onSelectOutline(outlineId)
    }
  }
  const selectedKeys = activeOutlineIds.length
    ? activeOutlineIds.map(id => `outline-${id}`)
    : activeChapterId ? [`chapter-${activeChapterId}`] : []

  return (
    <Modal
      title={<Space><BookOutlined /> 大纲树</Space>}
      open={open}
      onCancel={onClose}
      footer={
        <Space>
          <Button onClick={onCreateOutline} icon={<EditOutlined />}>新增大纲</Button>
          <Button type="primary" onClick={onClose}>关闭</Button>
        </Space>
      }
      width={720}
      styles={{ body: { maxHeight: '68vh', overflow: 'auto', paddingTop: 12 } }}
    >
      {treeData.length > 0 ? (
        <Tree
          treeData={treeData}
          blockNode
          showLine
          defaultExpandAll
          virtual={false}
          selectedKeys={selectedKeys}
          onSelect={handleSelect}
          style={{ fontSize: 13 }}
        />
      ) : (
        <div style={{ padding: '28px 0', textAlign: 'center' }}>
          <Text type="secondary">暂无大纲。可以先生成大纲，或手动新增。</Text>
        </div>
      )}
    </Modal>
  )
}
