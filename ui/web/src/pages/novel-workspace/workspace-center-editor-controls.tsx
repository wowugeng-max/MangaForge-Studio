import React from 'react'
import { EditOutlined, FileTextOutlined } from '@ant-design/icons'
import { Button, InputNumber, Tooltip, Typography } from 'antd'
import type { NovelWritingRecommendedActionKey } from './writingRecommendationModel'
import {
  DEFAULT_FICTION_HUMANIZER_MODE,
  DEFAULT_WRITING_SKILLS_ENABLED,
  WRITING_SKILL_CATALOG,
  type FictionHumanizerMode,
  type WritingSkillCatalogItem,
  type WritingSkillEnabledMap,
} from './writingSkillsModel'

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
          type="default"
          className={`novel-word-preset novel-btn-crystal ${generationWordTargetMode === 'standard' ? 'novel-btn-crystal-local is-selected' : 'novel-btn-crystal-display'}`}
          onClick={() => selectWordPreset('standard')}
        >
          标准章
        </Button>
      </Tooltip>
      <Tooltip title="长章，适合高潮、战斗或阶段收束">
        <Button
          size="small"
          type="default"
          className={`novel-word-preset novel-btn-crystal ${generationWordTargetMode === 'long' ? 'novel-btn-crystal-local is-selected' : 'novel-btn-crystal-display'}`}
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

export function WorkspaceCenterWritingSkillsControl({
  writingSkillsEnabled,
  onWritingSkillsEnabledChange,
  fictionHumanizerMode,
  onFictionHumanizerModeChange,
  writingSkillsCatalog,
}: {
  writingSkillsEnabled?: WritingSkillEnabledMap
  onWritingSkillsEnabledChange?: (enabled: WritingSkillEnabledMap) => void
  fictionHumanizerMode?: FictionHumanizerMode
  onFictionHumanizerModeChange?: (mode: FictionHumanizerMode) => void
  writingSkillsCatalog?: WritingSkillCatalogItem[]
}) {
  const catalog = writingSkillsCatalog?.length ? writingSkillsCatalog : WRITING_SKILL_CATALOG
  const current = writingSkillsEnabled || DEFAULT_WRITING_SKILLS_ENABLED
  const mode = fictionHumanizerMode || DEFAULT_FICTION_HUMANIZER_MODE
  const modeDisabled = !current['fiction-humanizer-zh']
  return (
    <div className="novel-word-target-control novel-writing-skills-control" aria-label="去AI味写作skill">
      {catalog.map(skill => (
        <Tooltip key={skill.id} title={skill.description}>
          <Button
            size="small"
            type="default"
            className={`novel-word-preset novel-btn-crystal ${current[skill.id] ? 'novel-btn-crystal-local is-selected' : 'novel-btn-crystal-display'}`}
            onClick={() => onWritingSkillsEnabledChange?.({
              ...current,
              [skill.id]: !current[skill.id],
            })}
          >
            {skill.label}
          </Button>
        </Tooltip>
      ))}
      {(['polish', 'rewrite'] as const).map(item => (
        <Button
          key={item}
          size="small"
          disabled={modeDisabled}
          aria-label={item === 'polish' ? '精修' : '重写'}
          className={`novel-word-preset novel-btn-crystal ${!modeDisabled && mode === item ? 'novel-btn-crystal-local is-selected' : 'novel-btn-crystal-display'}`}
          onClick={() => onFictionHumanizerModeChange?.(item)}
        >
          {item === 'polish' ? '精修' : '重写'}
        </Button>
      ))}
    </div>
  )
}

export function WorkspaceCenterSecondaryActionMenu({
  commandClass,
  recommendedBadge,
  diagnosticsLoading,
  generatingSceneCards,
  onOpenGenerationDiagnostics,
  onGenerateSceneCards,
  onEditActiveChapter,
}: {
  commandClass: (key?: NovelWritingRecommendedActionKey, extra?: string) => string
  recommendedBadge: (phase: 'prep' | 'write' | 'review' | string) => React.ReactNode
  diagnosticsLoading?: boolean
  generatingSceneCards?: boolean
  editorReportLoading?: boolean
  onOpenGenerationDiagnostics: () => void
  onGenerateSceneCards: () => void
  onEditActiveChapter: () => void
  onOpenQualityCard?: () => void
  onCreateEditorReport?: () => void
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
    </div>
  )
}
