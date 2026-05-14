import React from 'react'
import { Button, Progress, Space, Tag, Tooltip, Typography } from 'antd'
import {
  BookOutlined,
  EditOutlined,
  PlayCircleOutlined,
  RocketOutlined,
  SafetyOutlined,
  StopOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { chapterStatusTag, displayValue, wc } from './utils'

const { Text } = Typography

export function ChapterDirectorySidebar({
  selectedModelId,
  stepOutlineLoading,
  stepProseLoading,
  stepRepairLoading,
  proseProgress,
  chapters,
  proseChapterCount,
  activeChapterId,
  onOpenOutlinePanel,
  onGenerateProse,
  onCancelGenerateProse,
  onRunRepair,
  onOpenOutlineTree,
  onOpenChapterDrawer,
  onCreateChapter,
  onSelectChapter,
}: {
  selectedModelId?: number
  stepOutlineLoading: boolean
  stepProseLoading: boolean
  stepRepairLoading: boolean
  proseProgress: { current: number; total: number }
  chapters: any[]
  proseChapterCount: number
  activeChapterId: number | null
  onOpenOutlinePanel: () => void
  onGenerateProse: () => void
  onCancelGenerateProse: () => void
  onRunRepair: () => void
  onOpenOutlineTree: () => void
  onOpenChapterDrawer: () => void
  onCreateChapter: () => void
  onSelectChapter: (chapterId: number) => void
}) {
  return (
    <div style={{
      width: 240, flexShrink: 0, background: '#fff',
      borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column',
      overflow: 'hidden', minHeight: 0,
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Text style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 8, fontWeight: 500 }}>✍️ 写作流程</Text>
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <Tooltip title={selectedModelId ? '设置并生成大纲 + 细纲 + 连续性预检' : '请先在顶部选择模型'}>
            <Button size="small" block icon={<RocketOutlined />} loading={stepOutlineLoading} disabled={!selectedModelId} onClick={onOpenOutlinePanel}>
              ① 生成大纲
            </Button>
          </Tooltip>
          <Tooltip title={selectedModelId ? '根据细纲批量生成所有章节正文' : '请先在顶部选择模型'}>
            <Button size="small" block icon={<PlayCircleOutlined />} loading={stepProseLoading} disabled={!selectedModelId} onClick={onGenerateProse}>
              ② 生成正文
            </Button>
          </Tooltip>
          <Tooltip title={selectedModelId ? '检查并修复前后章矛盾' : '请先选择模型'}>
            <Button size="small" block icon={<SafetyOutlined />} loading={stepRepairLoading} disabled={!selectedModelId} onClick={onRunRepair}>
              ③ 连续性修复
            </Button>
          </Tooltip>
        </Space>
        {proseProgress.current > 0 && (
          <div style={{ marginTop: 8 }}>
            <Progress
              percent={Math.round(proseProgress.current / proseProgress.total * 100)}
              size="small"
              format={() => `${proseProgress.current}/${proseProgress.total}`}
            />
            {stepProseLoading && (
              <Button
                size="small"
                danger
                block
                icon={<StopOutlined />}
                style={{ marginTop: 6 }}
                onClick={onCancelGenerateProse}
              >
                停止后续生成
              </Button>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '8px 0', flex: 1, minHeight: 0, overflow: 'auto' }}>
        <div style={{ padding: '8px 16px 12px', borderBottom: '1px solid #f5f5f5' }}>
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text strong style={{ fontSize: 13 }}><UnorderedListOutlined /> 章节目录</Text>
              <Space size={6}>
                <Tooltip title="弹出查看大纲树">
                  <Button size="small" onClick={onOpenOutlineTree} icon={<BookOutlined />}>大纲树</Button>
                </Tooltip>
                <Button size="small" type="primary" onClick={onOpenChapterDrawer}>管理</Button>
              </Space>
            </div>
            <Space wrap size={[4, 2]}>
              <Tag color="blue" bordered={false} style={{ fontSize: 11 }}>章 {chapters.length}</Tag>
              <Tag color="green" bordered={false} style={{ fontSize: 11 }}>已写 {proseChapterCount}</Tag>
              <Tag color="orange" bordered={false} style={{ fontSize: 11 }}>未写 {chapters.length - proseChapterCount}</Tag>
            </Space>
            <Button block icon={<EditOutlined />} onClick={onCreateChapter}>新增章节</Button>
          </Space>
        </div>

        {chapters.length === 0 ? (
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
                    <Text type="secondary" style={{ fontSize: 11 }}>{wc(ch.chapter_text)} 字</Text>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
