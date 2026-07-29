import React from 'react'
import { DownOutlined, UpOutlined } from '@ant-design/icons'
import { Button, Tag, Tooltip, Typography } from 'antd'
import {
  buildChapterWorkflowPresenter,
  chapterWorkflowStepLabels,
  type ChapterWorkflowInput,
  type ChapterWorkflowPresenter,
} from './chapter-workflow-presenter'
import type { WritingCockpitActionKey } from './writingCockpitModel'


const MODEL_ACTION_KEYS = new Set([
  'generate',
  'repair_generate',
  'refresh_current_quality',
  'apply_editor_revision',
  'create_editor_report',
  'accept_chapter_and_continue',
])

const LOCAL_ACTION_KEYS = new Set([
  'repair_materials',
  'sync_story_state',
  'open_story_assets',
  'open_versions',
  'view_brief',
  'view_quality',
  'open_generation_diagnostics',
])

function crystalClassForAction(key: string, kind?: string) {
  if (kind === 'danger') return 'novel-btn-crystal novel-btn-crystal-model'
  if (MODEL_ACTION_KEYS.has(key) || kind === 'primary') return 'novel-btn-crystal novel-btn-crystal-model'
  if (LOCAL_ACTION_KEYS.has(key)) return 'novel-btn-crystal novel-btn-crystal-local'
  if (kind === 'ghost') return 'novel-btn-crystal novel-btn-crystal-display'
  // secondary rewrite/generate etc. already covered; remaining defaults are display
  if (key === 'generate' || /复检|重写|生成|修订|修复/.test(String(kind || ''))) {
    return 'novel-btn-crystal novel-btn-crystal-model'
  }
  return 'novel-btn-crystal novel-btn-crystal-display'
}

function normalizeDetailsSummary(summary?: string | string[]): string[] {
  if (!summary) return []
  const parts = Array.isArray(summary) ? summary : String(summary).split(' · ')
  return parts.map(part => String(part || '').trim()).filter(Boolean)
}

const { Text, Title } = Typography

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
  primaryDisabled = false,
  title,
  statusTags = [],
  wordCountLabel,
  saveStatusLabel,
  trailing,
  detailsOpen = false,
  onToggleDetails,
  detailsSummary,
  handlers,
  presenter: presenterOverride,
}: {
  input?: ChapterWorkflowInput
  loading?: boolean
  primaryDisabled?: boolean
  title?: React.ReactNode
  statusTags?: Array<{ key: string; label: string; color?: string; tooltip?: string }>
  wordCountLabel?: string
  saveStatusLabel?: string
  trailing?: React.ReactNode
  detailsOpen?: boolean
  onToggleDetails?: () => void
  detailsSummary?: string | string[]
  handlers: ChapterActionBarHandlers
  presenter?: ChapterWorkflowPresenter
}) {
  const presenter = presenterOverride || buildChapterWorkflowPresenter(input || {})
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

  const primaryDanger = presenter.primaryAction.kind === 'danger'
  const summaryItems = normalizeDetailsSummary(detailsSummary)

  return (
    <div className="chapter-action-bar">
      <div className="chapter-action-bar-top">
        <div className="chapter-action-bar-titleblock">
          {title ? (
            <div className="chapter-action-bar-title-row">
              {typeof title === 'string' ? (
                <Title level={5} className="chapter-action-bar-title">{title}</Title>
              ) : title}
            </div>
          ) : null}
          <div className="chapter-action-bar-tags">
            <Tag color={phaseColor} bordered={false}>{presenter.phaseLabel}</Tag>
            {statusTags.map(tag => (
              <Tooltip key={tag.key} title={tag.tooltip || tag.label}>
                <Tag color={tag.color || 'default'} bordered={false}>{tag.label}</Tag>
              </Tooltip>
            ))}
            {wordCountLabel ? <Tag bordered={false}>{wordCountLabel}</Tag> : null}
            {saveStatusLabel ? <Tag color="green" bordered={false}>{saveStatusLabel}</Tag> : null}
          </div>
        </div>

        <div className="chapter-action-bar-actions">
          <Button
            type={primaryDanger ? 'primary' : 'default'}
            danger={primaryDanger}
            className={crystalClassForAction(String(presenter.primaryAction.key), presenter.primaryAction.kind)}
            disabled={primaryDisabled}
            loading={loading}
            onClick={() => run(presenter.primaryAction.key)}
          >
            {presenter.primaryAction.label}
          </Button>
          {presenter.secondaryActions.slice(0, 2).map(action => (
            <Button
              key={`${action.key}-${action.label}`}
              type={action.kind === 'ghost' ? 'text' : 'default'}
              className={crystalClassForAction(String(action.key), action.kind)}
              onClick={() => run(action.key)}
            >
              {action.label}
            </Button>
          ))}
          {trailing}
        </div>
      </div>

      <div className="chapter-action-bar-reason-row">
        <Text type="secondary" className="chapter-action-bar-reason">
          {presenter.reasonText}
        </Text>
        {onToggleDetails ? (
          <button
            type="button"
            className={`chapter-action-bar-details-toggle${detailsOpen ? ' is-open' : ''}`}
            onClick={onToggleDetails}
            aria-expanded={detailsOpen}
            aria-label={detailsOpen ? '收起详情' : '展开详情'}
          >
            <span className="chapter-action-bar-details-toggle-label">
              {detailsOpen ? <UpOutlined /> : <DownOutlined />}
              <span>{detailsOpen ? '收起详情' : '展开详情'}</span>
            </span>
            {!detailsOpen ? (
              <span className="chapter-action-bar-details-toggle-summary" aria-hidden={summaryItems.length === 0}>
                {summaryItems.length > 0
                  ? summaryItems.map(item => (
                      <span key={item} className="chapter-action-bar-details-chip">{item}</span>
                    ))
                  : <span className="chapter-action-bar-details-chip is-muted">查看队列与交稿状态</span>}
              </span>
            ) : (
              <span className="chapter-action-bar-details-toggle-hint">点击收起辅助面板</span>
            )}
          </button>
        ) : null}
      </div>

      <div className="chapter-action-bar-steps" aria-label="写作闭环进度">
        {steps.map((label, index) => {
          const done = presenter.stepsDone[index]
          const now = presenter.stepIndex === index
          return (
            <div
              key={label}
              className={`chapter-action-bar-step${done ? ' is-done' : ''}${now ? ' is-now' : ''}`}
              title={done ? `${label}已完成` : now ? `当前：${label}` : `${label}未完成`}
            >
              {done ? `✓ ${label}` : label}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export type { WritingCockpitActionKey }
