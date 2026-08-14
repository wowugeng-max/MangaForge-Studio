import React from 'react'
import { Button, Modal, Space, Spin, Tag, Typography } from 'antd'
import { ohStoryChapterTextHash } from './oh-story-chapter-text-hash'
import {
  parseReviewPayload,
  resolveQualityReportView,
  timeValue,
} from './reference-panel-helpers'
import { chapterWordCount } from './utils'
import {
  isActiveEditorRevisionTask,
  type EditorRevisionTask,
} from './editorRevisionTasks'
import { editorRevisionPhaseLabel } from './task-center/drawer-run-summary-editor-revision'
import { buildEditorRevisionProgress } from './editor-revision-progress'

const { Text } = Typography

const QUALITY_PANEL_OPEN_KEY = 'novel_quality_panel_open'

export type OhStoryCoreBusyAction = 'review' | 'deslop' | 'apply'

export function ohStoryBusySummary(action: OhStoryCoreBusyAction, elapsedSec: number) {
  const label = action === 'review' ? '审稿中' : action === 'deslop' ? '去AI中' : '改稿中'
  return `${label} · ${Math.max(0, Math.floor(Number(elapsedSec) || 0))}s`
}

type EditorRevisionTaskActionKey = 'cancel' | 'retry' | 'continue'
type EditorRevisionPendingAction = {
  runId: number
  actionKey: EditorRevisionTaskActionKey
}

export async function runEditorRevisionTaskAction({
  runId,
  actionKey,
  action,
  inFlightRunIds,
  setPendingAction,
  onError,
}: {
  runId: number
  actionKey: EditorRevisionTaskActionKey
  action: (runId: number) => void | Promise<unknown>
  inFlightRunIds: Set<number>
  setPendingAction: (pending: EditorRevisionPendingAction | null) => void
  onError: (error: unknown) => void
}) {
  if (inFlightRunIds.has(runId)) return false
  inFlightRunIds.add(runId)
  setPendingAction({ runId, actionKey })
  try {
    await action(runId)
    return true
  } catch (error) {
    onError(error)
    return false
  } finally {
    inFlightRunIds.delete(runId)
    setPendingAction(null)
  }
}

export function reportChapterId(report: any) {
  const payload = parseReviewPayload(report)
  return Number(
    payload.chapter_id
    || payload.context_package?.chapter_target?.id
    || payload.chapter_target?.id
    || report?.chapter_id
    // Legacy truncated reports (pre 2026-07-14 compaction) only keep chapter_id inside the
    // preview text; reuse the ReferencePanel fallback so both panels agree on the chapter.
    || resolveQualityReportView(report).chapterTarget?.id
    || 0,
  )
}

export function ohStoryReportText(report: any): string {
  const payload = parseReviewPayload(report)
  return String(payload.report_text || report?.summary || '').trim()
}

function EditorRevisionStatusStrip({
  task,
  onCancel,
  onRetry,
  onLoadDiagnostics,
}: {
  task: EditorRevisionTask
  onCancel?: (runId: number) => void | Promise<unknown>
  onRetry?: (runId: number) => void | Promise<unknown>
  onLoadDiagnostics?: (runId: number) => Promise<Record<string, unknown>>
}) {
  const inFlightRunIdsRef = React.useRef(new Set<number>())
  const [pendingAction, setPendingAction] = React.useState<EditorRevisionPendingAction | null>(null)
  const active = isActiveEditorRevisionTask(task)
  const [nowMs, setNowMs] = React.useState(() => Date.now())
  React.useEffect(() => {
    if (!active) return
    const timer = setInterval(() => setNowMs(Date.now()), 1_000)
    return () => clearInterval(timer)
  }, [active])
  const progress = React.useMemo(
    () => buildEditorRevisionProgress(task, nowMs),
    [task, nowMs],
  )
  const statusLabel = task.status === 'completed'
    ? '已完成'
    : task.status === 'failed'
      ? '失败'
      : task.status === 'canceled'
        ? '已取消'
        : task.status === 'cancel_requested'
          ? '取消中'
          : task.status === 'queued'
            ? '排队中'
            : '运行中'
  const statusColor = task.status === 'completed'
    ? 'green'
    : task.status === 'failed'
      ? 'red'
      : active
        ? 'blue'
        : undefined
  const pendingForTask = pendingAction?.runId === task.id
  const pendingActionKey = pendingForTask ? pendingAction.actionKey : null
  const runTaskAction = (
    actionKey: EditorRevisionTaskActionKey,
    action: ((runId: number) => void | Promise<unknown>) | undefined,
  ) => {
    if (!action) return
    const actionLabel = actionKey === 'cancel' ? '取消修订' : actionKey === 'continue' ? '继续后处理' : '重试'
    void runEditorRevisionTaskAction({
      runId: task.id,
      actionKey,
      action,
      inFlightRunIds: inFlightRunIdsRef.current,
      setPendingAction,
      onError: error => {
        Modal.error({
          title: `${actionLabel}失败`,
          content: String((error as any)?.message || error || '未知错误'),
        })
      },
    })
  }
  const showDiagnostics = async () => {
    if (!onLoadDiagnostics) return
    try {
      const diagnostics = await onLoadDiagnostics(task.id)
      Modal.info({
        title: `第${task.chapter_no}章修订诊断`,
        width: 720,
        content: (
          <pre style={{ maxHeight: 420, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
        ),
      })
    } catch (error: any) {
      Modal.error({ title: '诊断加载失败', content: String(error?.message || error || '未知错误') })
    }
  }

  return (
    <div className="novel-editor-revision-status-strip">
      <div className="novel-editor-revision-status-main">
        <div className="novel-editor-revision-status-heading">
          {active ? <Spin size="small" /> : null}
          <Tag color={statusColor} bordered={false}>{statusLabel}</Tag>
          <Text strong>{editorRevisionPhaseLabel(task.phase)}</Text>
          <Text type="secondary">第{task.chapter_no}章《{task.chapter_title || '未命名'}》</Text>
        </div>
        {active && (
          <div className="novel-editor-revision-progress">
            <div className="novel-editor-revision-progress-steps">
              {progress.steps.map(step => (
                <span
                  key={step.key}
                  className={`novel-editor-revision-progress-step is-${step.status}`}
                  title={step.durationLabel ? `${step.label} ${step.durationLabel}` : step.label}
                >
                  <span className="novel-editor-revision-progress-step-label">{step.label}</span>
                  {step.durationLabel && (
                    <span className="novel-editor-revision-progress-step-duration">{step.durationLabel}</span>
                  )}
                </span>
              ))}
            </div>
            {progress.hint && (
              <Text
                type={progress.stalled ? 'danger' : 'secondary'}
                className="novel-editor-revision-status-message"
              >
                {progress.hint}
              </Text>
            )}
          </div>
        )}
        {task.warnings.map((warning, index) => (
          <Text key={`${warning.code}-${index}`} type="warning" className="novel-editor-revision-status-message">
            {warning.message}
          </Text>
        ))}
        {task.error ? <Text type="danger" className="novel-editor-revision-status-message">{task.error.message}</Text> : null}
      </div>
      <div className="novel-editor-revision-status-actions">
        {task.can_cancel && onCancel ? (
          <Button
            size="small"
            danger
            disabled={pendingForTask}
            loading={pendingActionKey === 'cancel'}
            onClick={() => runTaskAction('cancel', onCancel)}
          >取消修订</Button>
        ) : null}
        {task.can_retry && onRetry ? (
          <Button
            size="small"
            type="primary"
            disabled={pendingForTask}
            loading={pendingActionKey === 'retry'}
            onClick={() => runTaskAction('retry', onRetry)}
          >重试</Button>
        ) : null}
        {task.can_continue && onRetry ? (
          <Button
            size="small"
            type="primary"
            disabled={pendingForTask}
            loading={pendingActionKey === 'continue'}
            onClick={() => runTaskAction('continue', onRetry)}
          >继续后处理</Button>
        ) : null}
        {onLoadDiagnostics ? <Button size="small" type="link" onClick={() => { void showDiagnostics() }}>查看诊断</Button> : null}
      </div>
    </div>
  )
}

export function WorkspaceCenterQualityRevisionPanel({
  activeChapter,
  ohStoryReviews = [],
  editorRevisionTask = null,
  onOhStoryReview,
  onOhStoryApply,
  onOhStoryDeslop,
  ohStoryAction = null,
  ohStoryElapsedSec,
  onCancelEditorRevision,
  onRetryEditorRevision,
  onLoadEditorRevisionDiagnostics,
}: {
  activeChapter: any | null
  ohStoryReviews?: any[]
  proseQualityReports?: any[]
  editorRevisionReports?: any[]
  editorRevisionTask?: EditorRevisionTask | null
  proseQualityLoading?: boolean
  editorReportLoading?: boolean
  onRefreshProseQuality?: () => void
  onRepairPreflightGaps?: () => void | Promise<void>
  onApplyEditorRevision?: (report: any, options?: { revisionMode?: string; prompt?: string; skipConfirm?: boolean }) => void
  onOhStoryReview?: () => void | Promise<void>
  onOhStoryApply?: () => void | Promise<void>
  onOhStoryDeslop?: () => void | Promise<void>
  ohStoryAction?: OhStoryCoreBusyAction | null
  ohStoryElapsedSec?: number
  onCancelEditorRevision?: (runId: number) => void | Promise<unknown>
  onRetryEditorRevision?: (runId: number) => void | Promise<unknown>
  onLoadEditorRevisionDiagnostics?: (runId: number) => Promise<Record<string, unknown>>
  onCreateEditorReport?: () => void
  onOpenSideQuality?: () => void
}) {
  const wordCount = chapterWordCount(activeChapter)
  const chapterId = Number(activeChapter?.id || 0)
  const hasProse = Boolean(chapterId && wordCount > 0)
  const [open, setOpen] = React.useState(() => {
    try {
      return localStorage.getItem(QUALITY_PANEL_OPEN_KEY) === '1'
    } catch {
      return false
    }
  })
  const persistOpen = (value: boolean) => {
    setOpen(value)
    try {
      localStorage.setItem(QUALITY_PANEL_OPEN_KEY, value ? '1' : '0')
    } catch {
      // localStorage unavailable (private mode/tests) — state stays in memory.
    }
  }
  const currentEditorRevisionTask = editorRevisionTask?.chapter_id === chapterId ? editorRevisionTask : null
  const revisionActive = Boolean(currentEditorRevisionTask && isActiveEditorRevisionTask(currentEditorRevisionTask))

  const chapterReviews = React.useMemo(() => {
    if (!chapterId) return [] as any[]
    return (ohStoryReviews || [])
      .filter(report => reportChapterId(report) === chapterId)
      .slice()
      .sort((a, b) => timeValue(b.created_at) - timeValue(a.created_at))
  }, [ohStoryReviews, chapterId])

  const latest = chapterReviews[0] || null
  const reportText = latest ? ohStoryReportText(latest) : ''
  const storedHash = String(parseReviewPayload(latest).chapter_text_hash || '')
  const hydrated = Boolean(reportText || storedHash)
  const matchesCurrent = Boolean(
    latest
    && storedHash
    && storedHash === ohStoryChapterTextHash(String(activeChapter?.chapter_text || '')),
  )
  const isStale = Boolean(latest && hydrated && !matchesCurrent)
  const hasReview = Boolean(latest && reportText)
  const [localOhStoryAction, setLocalOhStoryAction] = React.useState<OhStoryCoreBusyAction | null>(null)
  const [ohStoryNowMs, setOhStoryNowMs] = React.useState(() => Date.now())
  const ohStoryStartedAtRef = React.useRef<number | null>(null)
  const busyAction = ohStoryAction ?? localOhStoryAction

  React.useEffect(() => {
    if (hasReview) setOpen(true)
  }, [hasReview, chapterId, latest?.id])
  React.useEffect(() => {
    if (!busyAction || ohStoryElapsedSec != null) return
    const timer = setInterval(() => setOhStoryNowMs(Date.now()), 1_000)
    return () => clearInterval(timer)
  }, [busyAction, ohStoryElapsedSec])

  if (!hasProse) return null

  const busyElapsedSec = ohStoryElapsedSec != null
    ? ohStoryElapsedSec
    : ohStoryStartedAtRef.current
      ? Math.floor((ohStoryNowMs - ohStoryStartedAtRef.current) / 1000)
      : 0
  const runOhStoryAction = (action: OhStoryCoreBusyAction, handler?: () => void | Promise<void>) => {
    if (busyAction) return
    ohStoryStartedAtRef.current = Date.now()
    setOhStoryNowMs(Date.now())
    setLocalOhStoryAction(action)
    void Promise.resolve(handler?.()).finally(() => {
      setLocalOhStoryAction(null)
      ohStoryStartedAtRef.current = null
    })
  }

  const summaryBits = [
    busyAction ? ohStoryBusySummary(busyAction, busyElapsedSec) : '',
    revisionActive && currentEditorRevisionTask
      ? `修订中·${editorRevisionPhaseLabel(currentEditorRevisionTask.phase)}`
      : '',
    !latest ? '尚未审稿' : !hydrated ? '审稿加载中' : matchesCurrent ? '已审稿' : '正文已改',
  ].filter(Boolean)

  return (
    <details
      className={`novel-quality-revision-panel${hasReview ? '' : ' is-attention'}`}
      open={open}
      onToggle={(event) => persistOpen((event.target as HTMLDetailsElement).open)}
    >
      <summary className="novel-quality-revision-summary">
        <span className="novel-quality-revision-title">质检修订</span>
        <span className="novel-quality-revision-score-block" style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span className="novel-quality-revision-pills">
            {summaryBits.map(bit => (
              <span key={bit} className="novel-quality-revision-pill">{bit}</span>
            ))}
          </span>
        </span>
        <span className="novel-quality-revision-summary-action" style={{ gap: 6 }}>
          <Button
            size="small"
            loading={busyAction === 'review'}
            disabled={Boolean(busyAction) && busyAction !== 'review'}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              runOhStoryAction('review', onOhStoryReview)
            }}
          >oh-story 审稿</Button>
          <Button
            size="small"
            loading={busyAction === 'apply'}
            disabled={Boolean(busyAction) && busyAction !== 'apply'}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              runOhStoryAction('apply', onOhStoryApply)
            }}
          >按建议改稿</Button>
          <Button
            size="small"
            loading={busyAction === 'deslop'}
            disabled={Boolean(busyAction) && busyAction !== 'deslop'}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              runOhStoryAction('deslop', onOhStoryDeslop)
            }}
          >oh-story 去AI</Button>
        </span>
      </summary>

      <div className="novel-quality-revision-body">
        {currentEditorRevisionTask ? (
          <EditorRevisionStatusStrip
            task={currentEditorRevisionTask}
            onCancel={onCancelEditorRevision}
            onRetry={onRetryEditorRevision}
            onLoadDiagnostics={onLoadEditorRevisionDiagnostics}
          />
        ) : null}

        {!latest ? (
          <Text type="secondary" className="novel-quality-revision-empty">
            还没有 oh-story 审稿。点「oh-story 审稿」生成本章报告。
          </Text>
        ) : (
          <>
            <div className="novel-quality-revision-meta">
              <Space wrap size={[4, 4]}>
                <Tag color="blue" bordered={false}>oh-story 审稿</Tag>
                {!hydrated ? <Tag bordered={false}>审稿加载中</Tag> : isStale ? <Tag color="gold" bordered={false}>正文已改</Tag> : <Tag color="green" bordered={false}>对应当前正文</Tag>}
                <Text type="secondary" style={{ fontSize: 11 }}>{latest.created_at}</Text>
              </Space>
              {isStale ? (
                <Text type="warning" className="novel-quality-revision-hint">
                  正文在这次审稿之后改过，报告可能对不上当前稿。
                </Text>
              ) : null}
            </div>
            {reportText ? (
              <pre className="novel-oh-story-review-report">{reportText}</pre>
            ) : (
              <Text type="secondary" className="novel-quality-revision-empty">
                正在加载审稿全文…
              </Text>
            )}
          </>
        )}
      </div>
    </details>
  )
}
