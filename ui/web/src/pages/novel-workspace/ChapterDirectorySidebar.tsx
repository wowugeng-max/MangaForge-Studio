import React from 'react'
import { Button, Space, Tag, Tooltip, Typography } from 'antd'
import {
  BookOutlined,
  EditOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { ProductionGuidePanel } from './ProductionGuidePanel'
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
  outlineCount,
  worldbuildingCount,
  characterCount,
  hasWritingBible,
  materialScore,
  commercialReadiness,
  activeTaskCount,
  onOpenOutlinePanel,
  onGenerateProse,
  onCancelGenerateProse,
  onRunRepair,
  onOpenReferenceConfig,
  onOpenReferenceEngineering,
  onOpenCreativeCards,
  onRunOriginalIncubator,
  onOpenWritingBibleEditor,
  onOpenMaterialRepairPlan,
  onStartReadyChapterGroupGeneration,
  onStartChapterGroupGeneration,
  onOpenProductionDesk,
  onOpenTaskCenter,
  onOpenConsistencyGraph,
  onOpenQualityBenchmark,
  onRunBookReview,
  onOpenCommercialTools,
  onOpenExportDelivery,
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
  outlineCount: number
  worldbuildingCount: number
  characterCount: number
  hasWritingBible: boolean
  materialScore?: any
  commercialReadiness?: any
  activeTaskCount: number
  onOpenOutlinePanel: () => void
  onGenerateProse: () => void
  onCancelGenerateProse: () => void
  onRunRepair: () => void
  onOpenReferenceConfig: () => void
  onOpenReferenceEngineering: () => void
  onOpenCreativeCards: () => void
  onRunOriginalIncubator: () => void
  onOpenWritingBibleEditor: () => void
  onOpenMaterialRepairPlan: () => void
  onStartReadyChapterGroupGeneration: () => void
  onStartChapterGroupGeneration: () => void
  onOpenProductionDesk: () => void
  onOpenTaskCenter: () => void
  onOpenConsistencyGraph: () => void
  onOpenQualityBenchmark: () => void
  onRunBookReview: () => void
  onOpenCommercialTools: () => void
  onOpenExportDelivery: () => void
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
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', paddingBottom: 24 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
          <ProductionGuidePanel
          selectedModelId={selectedModelId}
          stepOutlineLoading={stepOutlineLoading}
          stepProseLoading={stepProseLoading}
          stepRepairLoading={stepRepairLoading}
          incubatingOriginal={incubatingOriginal}
          bookReviewLoading={bookReviewLoading}
          commercialToolLoading={commercialToolLoading}
          proseProgress={proseProgress}
          chapterCount={chapters.length}
          proseChapterCount={proseChapterCount}
          referenceCount={referenceCount}
          outlineCount={outlineCount}
          worldbuildingCount={worldbuildingCount}
          characterCount={characterCount}
          hasWritingBible={hasWritingBible}
          materialScore={materialScore}
          commercialReadiness={commercialReadiness}
          activeTaskCount={activeTaskCount}
          onOpenOutlinePanel={onOpenOutlinePanel}
          onGenerateProse={onGenerateProse}
          onCancelGenerateProse={onCancelGenerateProse}
          onRunRepair={onRunRepair}
          onOpenReferenceConfig={onOpenReferenceConfig}
          onOpenReferenceEngineering={onOpenReferenceEngineering}
          onOpenCreativeCards={onOpenCreativeCards}
          onRunOriginalIncubator={onRunOriginalIncubator}
          onOpenWritingBibleEditor={onOpenWritingBibleEditor}
          onOpenMaterialRepairPlan={onOpenMaterialRepairPlan}
          onStartReadyChapterGroupGeneration={onStartReadyChapterGroupGeneration}
          onStartChapterGroupGeneration={onStartChapterGroupGeneration}
          onOpenProductionDesk={onOpenProductionDesk}
          onOpenTaskCenter={onOpenTaskCenter}
          onOpenConsistencyGraph={onOpenConsistencyGraph}
          onOpenQualityBenchmark={onOpenQualityBenchmark}
          onRunBookReview={onRunBookReview}
          onOpenCommercialTools={onOpenCommercialTools}
          onOpenExportDelivery={onOpenExportDelivery}
          />
        </div>

      <div style={{ padding: '8px 0' }}>
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
    </div>
  )
}
