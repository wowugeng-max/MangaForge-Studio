import React from 'react'
import { Button, Space, Tag, Tooltip, Typography } from 'antd'
import {
  BookOutlined,
  DownOutlined,
  EditOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RightOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { ProductionGuidePanel } from './ProductionGuidePanel'
import { chapterStatusTag, chapterWordCount, displayValue } from './utils'

const { Text } = Typography

export function ChapterDirectorySidebar({
  collapsed = false,
  onCollapsedChange,
  planningMode = false,
  proseProgress,
  chapters,
  proseChapterCount,
  activeChapterId,
  materialScore,
  commercialReadiness,
  activeTaskCount,
  onOpenTaskCenter,
  onOpenExportDelivery,
  onOpenOutlineTree,
  onOpenChapterDrawer,
  onCreateChapter,
  onSelectChapter,
}: {
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  planningMode?: boolean
  proseProgress: { current: number; total: number }
  chapters: any[]
  proseChapterCount: number
  activeChapterId: number | null
  materialScore?: any
  commercialReadiness?: any
  activeTaskCount: number
  onOpenTaskCenter: () => void
  onOpenExportDelivery: () => void
  onOpenOutlineTree: () => void
  onOpenChapterDrawer: () => void
  onCreateChapter: () => void
  onSelectChapter: (chapterId: number) => void
}) {
  const [chaptersCollapsed, setChaptersCollapsed] = React.useState(false)

  if (collapsed) {
    return (
      <div className="chapter-directory-sidebar is-collapsed">
        <div className="chapter-directory-sidebar-collapsed-rail">
          <Tooltip title="展开目录" placement="right">
            <Button
              type="text"
              size="small"
              icon={<MenuUnfoldOutlined />}
              onClick={() => onCollapsedChange?.(false)}
              aria-label="展开目录"
            />
          </Tooltip>
          <Tooltip title="章节目录" placement="right">
            <Button
              type="text"
              size="small"
              icon={<UnorderedListOutlined />}
              onClick={onOpenChapterDrawer}
              aria-label="章节目录"
            />
          </Tooltip>
          {activeTaskCount > 0 && (
            <Tooltip title="任务中心" placement="right">
              <Button
                type="text"
                size="small"
                onClick={onOpenTaskCenter}
                aria-label="任务中心">
                {activeTaskCount > 99 ? '99+' : activeTaskCount}
              </Button>
            </Tooltip>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="chapter-directory-sidebar" style={{
      width: '100%', flexShrink: 0, background: '#fff',
      borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', minHeight: 0,
    }}>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', paddingBottom: 24 }}>
        <div className="chapter-directory-sidebar-toolbar">
          <Text strong style={{ fontSize: 13 }}>小说目录</Text>
          <Tooltip title="收起目录" placement="right">
            <Button
              type="text"
              size="small"
              icon={<MenuFoldOutlined />}
              onClick={() => onCollapsedChange?.(true)}
              aria-label="收起目录"
            />
          </Tooltip>
        </div>
        {!planningMode && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
            <ProductionGuidePanel
              proseProgress={proseProgress}
              chapterCount={chapters.length}
              proseChapterCount={proseChapterCount}
              materialScore={materialScore}
              commercialReadiness={commercialReadiness}
              activeTaskCount={activeTaskCount}
              onOpenTaskCenter={onOpenTaskCenter}
              onOpenExportDelivery={onOpenExportDelivery}
            />
          </div>
        )}

        {planningMode && (
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', background: '#fbfcfe' }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Text strong style={{ fontSize: 13 }}>章节导航</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>规划首页负责判断方向；点击章节会进入写作区。</Text>
            </Space>
          </div>
        )}

      <div style={{ padding: '8px 0' }}>
        <div style={{ padding: '8px 16px 12px', borderBottom: '1px solid #f5f5f5' }}>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                type="text"
                size="small"
                icon={chaptersCollapsed ? <RightOutlined /> : <DownOutlined />}
                onClick={() => setChaptersCollapsed(prev => !prev)}
                style={{ padding: 0, height: 24, fontSize: 13, fontWeight: 600 }}
              >
                <UnorderedListOutlined /> 章节目录
              </Button>
              <Space size={6}>
                <Tooltip title="弹出查看大纲树">
                  <Button size="small" onClick={onOpenOutlineTree} icon={<BookOutlined />}>大纲树</Button>
                </Tooltip>
                <Button size="small" type="primary" onClick={onOpenChapterDrawer}> 管理</Button>
              </Space>
            </div>
            <Space wrap size={[4, 2]}>
              <Tag color="blue" bordered={false} style={{ fontSize: 11 }}>章 {chapters.length}</Tag>
              <Tag color="green" bordered={false} style={{ fontSize: 11 }}>已写 {proseChapterCount}</Tag>
              <Tag color="orange" bordered={false} style={{ fontSize: 11 }}>未写 {chapters.length - proseChapterCount}</Tag>
            </Space>
            {!chaptersCollapsed && <Button block icon={<EditOutlined />} onClick={onCreateChapter}>新增章节</Button>}
          </Space>
        </div>

        {chaptersCollapsed ? null : chapters.length === 0 ? (
          <div style={{ padding: '20px 16px', textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>暂无章节</Text>
          </div>
        ) : (
          chapters.map(ch => {
            const isActive = ch.id === activeChapterId
            return (
              <div
                key={ch.id}
                onClick={() => onSelectChapter(ch.id)}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  background: isActive ? '#e6f4ff' : 'transparent',
                  borderLeft: isActive ? '3px solid #1677ff' : '3px solid transparent',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = '#fafafa' }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Text strong style={{ fontSize: 13 }}>第{ch.chapter_no}章</Text>
                      {chapterStatusTag(ch)}
                    </div>
                    <Text style={{ fontSize: 12, color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: 160 }}>
                      {displayValue(ch.title) || '无标题'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{chapterWordCount(ch)} 字</Text>
                  </div>
                </div>
              </div>
            )
          })
        )}
        </div>
      </div>
    </div>
  )
}
