import React from 'react'
import { EditOutlined, FileTextOutlined } from '@ant-design/icons'
import { Button, InputNumber, Tooltip, Typography } from 'antd'
import type { NovelWritingRecommendedActionKey } from './writingRecommendationModel'

const { Text } = Typography

export type ChapterWordTargetMode = 'standard' | 'long' | 'custom'

function clampNumber(value: any, min: number, max: number, fallback: number) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

export function WorkspaceCenterWordTargetControl({
  generationWordTargetMode,
  generationTargetWordCount,
  onGenerationWordTargetModeChange,
  onGenerationTargetWordCountChange,
}: {
  generationWordTargetMode?: ChapterWordTargetMode
  generationTargetWordCount?: number
  onGenerationWordTargetModeChange?: (mode: ChapterWordTargetMode) => void
  onGenerationTargetWordCountChange?: (count: number) => void
}) {
  const selectWordPreset = (mode: Exclude<ChapterWordTargetMode, 'custom'>) => {
    onGenerationWordTargetModeChange?.(mode)
    onGenerationTargetWordCountChange?.(mode === 'long' ? 10000 : 3000)
  }
  return (
    <div className="novel-word-target-control" aria-label="章节字数目标">
      <Tooltip title="标准章节，适合日常连载更新">
        <Button
          size="small"
          className="novel-word-preset"
          type={generationWordTargetMode === 'standard' ? 'primary' : 'default'}
          onClick={() => selectWordPreset('standard')}
        >
          标准章
        </Button>
      </Tooltip>
      <Tooltip title="长章，适合高潮、战斗或阶段收束">
        <Button
          size="small"
          className="novel-word-preset"
          type={generationWordTargetMode === 'long' ? 'primary' : 'default'}
          onClick={() => selectWordPreset('long')}
        >
          长章
        </Button>
      </Tooltip>
      <Tooltip title="手动输入本次生成的目标字数">
        <InputNumber
          size="small"
          min={1000}
          max={12000}
          step={500}
          value={generationTargetWordCount}
          controls={false}
          className={generationWordTargetMode === 'custom' ? 'is-custom' : undefined}
          formatter={(value) => `${value || 0}`}
          parser={(value) => Number(String(value || '').replace(/[^\d]/g, ''))}
          onChange={(value) => {
            const next = clampNumber(value, 1000, 12000, 3000)
            onGenerationTargetWordCountChange?.(next)
            onGenerationWordTargetModeChange?.('custom')
          }}
        />
      </Tooltip>
      <span className="novel-word-target-unit">字</span>
    </div>
  )
}

export function WorkspaceCenterSecondaryActionMenu({
  commandClass,
  recommendedBadge,
  diagnosticsLoading,
  generatingSceneCards,
  editorReportLoading,
  onOpenGenerationDiagnostics,
  onGenerateSceneCards,
  onEditActiveChapter,
  onOpenQualityCard,
  onCreateEditorReport,
}: {
  commandClass: (key?: NovelWritingRecommendedActionKey, extra?: string) => string
  recommendedBadge: (phase: 'prep' | 'write' | 'review' | string) => React.ReactNode
  diagnosticsLoading?: boolean
  generatingSceneCards?: boolean
  editorReportLoading?: boolean
  onOpenGenerationDiagnostics: () => void
  onGenerateSceneCards: () => void
  onEditActiveChapter: () => void
  onOpenQualityCard: () => void
  onCreateEditorReport: () => void
}) {
  return (
    <div className="novel-editor-action-popover novel-editor-secondary-actions">
      <div className="novel-editor-action-group novel-editor-action-group-prep">
        <div className="novel-editor-action-group-heading">
          <Text className="novel-editor-action-group-label">写前准备</Text>
          {recommendedBadge('prep')}
        </div>
        <Button size="small" className={commandClass('diagnostics')} loading={diagnosticsLoading} onClick={onOpenGenerationDiagnostics}>诊断</Button>
        <Button size="small" className={commandClass('scene_cards')} icon={<FileTextOutlined />} loading={generatingSceneCards} onClick={onGenerateSceneCards}>场景卡</Button>
        <Button size="small" className={commandClass(undefined, 'novel-editor-muted-command')} onClick={onEditActiveChapter} icon={<EditOutlined />}>元数据</Button>
      </div>
      <div className="novel-editor-action-group novel-editor-action-group-review">
        <div className="novel-editor-action-group-heading">
          <Text className="novel-editor-action-group-label">写后复检</Text>
          {recommendedBadge('review')}
        </div>
        <Button size="small" className={commandClass('quality_card')} onClick={onOpenQualityCard}>交稿质检</Button>
        <Button size="small" className={commandClass(undefined, 'novel-editor-muted-command')} loading={editorReportLoading} onClick={onCreateEditorReport}>编辑报告</Button>
      </div>
    </div>
  )
}
