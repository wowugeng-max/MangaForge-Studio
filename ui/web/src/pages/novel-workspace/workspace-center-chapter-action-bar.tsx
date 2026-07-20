import React from 'react'
import { Button, Space, Tag, Typography } from 'antd'
import {
  buildChapterWorkflowPresenter,
  chapterWorkflowStepLabels,
  type ChapterWorkflowInput,
  type ChapterWorkflowPresenter,
} from './chapter-workflow-presenter'
import type { WritingCockpitActionKey } from './writingCockpitModel'

const { Text } = Typography

export type ChapterActionBarHandlers = {
  onGenerate: () => void
  onRepairGenerate: () => void
  onRepairMaterials: () => void
  onRefreshQuality: () => void
  onCreateEditorReport: () => void
  onApplyEditorRevision: () => void
  onSyncStoryState: () => void
  onAcceptAndContinue: () => void
  onOpenStoryAssets: () => void
  onOpenDiagnostics: () => void
  onOpenVersions: () => void
  onOpenBrief: () => void
  onOpenQuality: () => void
}

export function ChapterActionBar({
  input,
  loading = false,
  wordCountLabel,
  saveStatusLabel,
  handlers,
  presenter: presenterOverride,
}: {
  input: ChapterWorkflowInput
  loading?: boolean
  wordCountLabel?: string
  saveStatusLabel?: string
  handlers: ChapterActionBarHandlers
  presenter?: ChapterWorkflowPresenter
}) {
  const presenter = presenterOverride || buildChapterWorkflowPresenter(input)
  const steps = chapterWorkflowStepLabels()

  const run = (key: string) => {
    switch (key) {
      case 'generate':
        handlers.onGenerate()
        break
      case 'repair_generate':
        handlers.onRepairGenerate()
        break
      case 'repair_materials':
        handlers.onRepairMaterials()
        break
      case 'refresh_current_quality':
        handlers.onRefreshQuality()
        break
      case 'create_editor_report':
        handlers.onCreateEditorReport()
        break
      case 'apply_editor_revision':
        handlers.onApplyEditorRevision()
        break
      case 'sync_story_state':
        handlers.onSyncStoryState()
        break
      case 'accept_chapter_and_continue':
        handlers.onAcceptAndContinue()
        break
      case 'open_story_assets':
        handlers.onOpenStoryAssets()
        break
      case 'open_generation_diagnostics':
        handlers.onOpenDiagnostics()
        break
      case 'open_versions':
        handlers.onOpenVersions()
        break
      case 'view_brief':
        handlers.onOpenBrief()
        break
      case 'view_quality':
        handlers.onOpenQuality()
        break
      default:
        break
    }
  }

  const phaseColor = presenter.phase === 'ready_next'
    ? 'green'
    : presenter.phase === 'failed_admission' || presenter.phase === 'blocked_materials'
      ? 'red'
      : presenter.phase === 'needs_revision' || presenter.phase === 'needs_state_sync'
        ? 'gold'
        : 'blue'

  const primaryType = presenter.primaryAction.kind === 'danger'
    ? 'primary'
    : 'primary'

  const primaryDanger = presenter.primaryAction.kind === 'danger'

  return (
    <div className="chapter-action-bar" style={{
      border: '1px solid #e6ebf2',
      borderRadius: 14,
      background: '#fff',
      padding: '12px 14px',
      display: 'grid',
      gap: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Space direction="vertical" size={6} style={{ minWidth: 0 }}>
          <Space wrap size={[6, 6]}>
            <Tag color={phaseColor} bordered={false}>{presenter.phaseLabel}</Tag>
            {wordCountLabel ? <Tag bordered={false}>{wordCountLabel}</Tag> : null}
            {saveStatusLabel ? <Tag color="green" bordered={false}>{saveStatusLabel}</Tag> : null}
          </Space>
          <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.55 }}>
            {presenter.reasonText}
          </Text>
        </Space>
        <Space wrap>
          <Button
            type={primaryType as any}
            danger={primaryDanger}
            loading={loading}
            onClick={() => run(presenter.primaryAction.key)}
          >
            {presenter.primaryAction.label}
          </Button>
          {presenter.secondaryActions.map(action => (
            <Button
              key={`${action.key}-${action.label}`}
              type={action.kind === 'ghost' ? 'text' : 'default'}
              onClick={() => run(action.key)}
            >
              {action.label}
            </Button>
          ))}
        </Space>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`, gap: 6 }}>
        {steps.map((label, index) => {
          const done = presenter.stepsDone[index]
          const now = presenter.stepIndex === index
          return (
            <div
              key={label}
              style={{
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 10,
                padding: '7px 4px',
                border: `1px solid ${done ? '#bfe8d1' : now ? '#cdddff' : '#e6ebf2'}`,
                background: done ? '#e9f8f0' : now ? '#eaf1ff' : '#f7f9fc',
                color: done ? '#1f9d63' : now ? '#2f6fed' : '#66758b',
              }}
            >
              {label}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export type { WritingCockpitActionKey }
