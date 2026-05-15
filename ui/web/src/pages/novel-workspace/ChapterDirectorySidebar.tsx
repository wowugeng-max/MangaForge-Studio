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
  incubatingOriginal,
  bookReviewLoading,
  commercialToolLoading,
  proseProgress,
  chapters,
  proseChapterCount,
  activeChapterId,
  referenceCount,
  onOpenOutlinePanel,
  onGenerateProse,
  onCancelGenerateProse,
  onRunRepair,
  onOpenReferenceConfig,
  onOpenReferenceEngineering,
  onRunOriginalIncubator,
  onOpenWritingBibleEditor,
  onOpenMaterialRepairPlan,
  onStartReadyChapterGroupGeneration,
  onStartChapterGroupGeneration,
  onOpenProductionDesk,
  onOpenTaskCenter,
  onRunBookReview,
  onOpenCommercialTools,
  onOpenOutlineTree,
  onOpenChapterDrawer,
  onCreateChapter,
  onSelectChapter,
}: {
  selectedModelId?: number
  stepOutlineLoading: boolean
  stepProseLoading: boolean
  stepRepairLoading: boolean
  incubatingOriginal: boolean
  bookReviewLoading: boolean
  commercialToolLoading: string
  proseProgress: { current: number; total: number }
  chapters: any[]
  proseChapterCount: number
  activeChapterId: number | null
  referenceCount: number
  onOpenOutlinePanel: () => void
  onGenerateProse: () => void
  onCancelGenerateProse: () => void
  onRunRepair: () => void
  onOpenReferenceConfig: () => void
  onOpenReferenceEngineering: () => void
  onRunOriginalIncubator: () => void
  onOpenWritingBibleEditor: () => void
  onOpenMaterialRepairPlan: () => void
  onStartReadyChapterGroupGeneration: () => void
  onStartChapterGroupGeneration: () => void
  onOpenProductionDesk: () => void
  onOpenTaskCenter: () => void
  onRunBookReview: () => void
  onOpenCommercialTools: () => void
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
        <Text style={{ fontSize: 12, color: '#667085', display: 'block', marginBottom: 8, fontWeight: 600 }}>生成小说步骤</Text>
        <Space direction="vertical" style={{ width: '100%' }} size={10}>
          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>1. 准备资料</Text>
            <Space.Compact block>
              <Button size="small" style={{ width: '50%' }} onClick={onOpenReferenceConfig}>参考{referenceCount ? ` ${referenceCount}` : ''}</Button>
              <Button size="small" style={{ width: '50%' }} onClick={onOpenWritingBibleEditor}>圣经</Button>
            </Space.Compact>
            <Space.Compact block style={{ marginTop: 6 }}>
              <Button size="small" style={{ width: '50%' }} loading={incubatingOriginal} onClick={onRunOriginalIncubator}>原创孵化</Button>
              <Button size="small" style={{ width: '50%' }} onClick={onOpenReferenceEngineering}>参考工程</Button>
            </Space.Compact>
          </div>

          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>2. 规划章节</Text>
            <Tooltip title={selectedModelId ? '设置并生成大纲 + 细纲 + 连续性预检' : '请先在顶部选择模型'}>
              <Button size="small" block icon={<RocketOutlined />} loading={stepOutlineLoading} disabled={!selectedModelId} onClick={onOpenOutlinePanel}>
                生成大纲 / 细纲
              </Button>
            </Tooltip>
          </div>

          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>3. 补齐材料</Text>
            <Button size="small" block loading={commercialToolLoading === 'materialRepair'} onClick={onOpenMaterialRepairPlan}>
              材料补齐计划
            </Button>
          </div>

          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>4. 生产正文</Text>
            <Space.Compact block>
              <Tooltip title={selectedModelId ? '根据细纲批量生成所有章节正文' : '请先在顶部选择模型'}>
                <Button size="small" style={{ width: '50%' }} icon={<PlayCircleOutlined />} loading={stepProseLoading} disabled={!selectedModelId} onClick={onGenerateProse}>
                  正文
                </Button>
              </Tooltip>
              <Button size="small" style={{ width: '50%' }} loading={commercialToolLoading === 'readyGroup'} disabled={!selectedModelId} onClick={onStartReadyChapterGroupGeneration}>
                智能群
              </Button>
            </Space.Compact>
            <Space.Compact block style={{ marginTop: 6 }}>
              <Button size="small" style={{ width: '50%' }} disabled={!selectedModelId} onClick={onStartChapterGroupGeneration}>章节群</Button>
              <Button size="small" style={{ width: '50%' }} onClick={onOpenProductionDesk}>生产台</Button>
            </Space.Compact>
          </div>

          <div>
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>5. 质检修订</Text>
            <Space.Compact block>
              <Tooltip title={selectedModelId ? '检查并修复前后章矛盾' : '请先选择模型'}>
                <Button size="small" style={{ width: '50%' }} icon={<SafetyOutlined />} loading={stepRepairLoading} disabled={!selectedModelId} onClick={onRunRepair}>
                  连续性
                </Button>
              </Tooltip>
              <Button size="small" style={{ width: '50%' }} loading={bookReviewLoading} disabled={!selectedModelId} onClick={onRunBookReview}>全书总检</Button>
            </Space.Compact>
            <Space.Compact block style={{ marginTop: 6 }}>
              <Button size="small" style={{ width: '50%' }} onClick={onOpenCommercialTools}>商业工具</Button>
              <Button size="small" style={{ width: '50%' }} onClick={onOpenTaskCenter}>任务中心</Button>
            </Space.Compact>
          </div>
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
