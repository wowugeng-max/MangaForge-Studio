import React from 'react'
import { Button, Input, Modal, Space, Spin, Tag, Typography } from 'antd'
import {
  buildRevisionUsageMap,
  issueLabel,
  issueSeverity,
  parseReviewPayload,
  resolveQualityReportView,
  reviewMatchesCurrentText,
  scoreColor,
  timeValue,
} from './reference-panel-helpers'
import { chapterWordCount, displayValue } from './utils'
import {
  isActiveEditorRevisionTask,
  type EditorRevisionTask,
} from './editorRevisionTasks'
import { editorRevisionPhaseLabel } from './task-center/drawer-run-summary-editor-revision'

const { Text, Paragraph } = Typography

const REVISION_CHIPS = [
  { mode: 'expand_action', label: '补动作' },
  { mode: 'cut_description', label: '砍描写' },
  { mode: 'tighten_pacing', label: '提节奏' },
  { mode: 'add_consequence', label: '补后果' },
] as const

const CUSTOM_REVISION_PRESETS = [
  {
    key: 'clear_english',
    label: '清英文夹杂',
    prompt: '删除或改写正文中所有英文单词、英文粘连词、拼音碎片和夹杂拉丁字母，统一改为自然简体中文；必要专有名词可保留中文括注，不得保留 and/but/the 等英文碎片。',
  },
  {
    key: 'opening_handoff',
    label: '强接开篇',
    prompt: '开篇前 300-500 字必须直接接住上一章章末钩子/危机/欠账，禁止先写环境空镜、平行戏或已兑现冲突回放。',
  },
  {
    key: 'cut_replay',
    label: '去进度回放',
    prompt: '删除已兑现冲突、已结束事件的重复回放，改写为基于当前新进度的推进与结果。',
  },
] as const

const CRAFT_METRIC_LABELS: Record<string, string> = {
  action_detail_score: '动作细节',
  combat_process_score: '战斗过程',
  event_density_score: '事件密度',
  description_overuse_score: '描写过量',
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
    // Legacy truncated reports (pre 2026-07-14 compaction) only keep chapter_id inside the
    // preview text; reuse the ReferencePanel fallback so both panels agree on the chapter.
    || resolveQualityReportView(report).chapterTarget?.id
    || 0,
  )
}

function asTextList(value: any): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'string') return item.trim()
      return String(item?.description || item?.message || item?.label || item?.fix || item?.text || displayValue(item) || '').trim()
    }).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value.split(/[；;\n]/).map(item => item.trim()).filter(Boolean)
  }
  return []
}

function QualityRow({
  status,
  label,
  detail,
  meta,
}: {
  status?: 'pass' | 'warn' | 'fail' | 'info'
  label: string
  detail?: string
  meta?: string
}) {
  return (
    <div className={`novel-quality-row is-${status || 'info'}`}>
      <div className="novel-quality-row-main">
        {status ? <span className="novel-quality-row-status">{status === 'pass' ? '通过' : status === 'fail' ? '失败' : status === 'warn' ? '关注' : '信息'}</span> : null}
        <span className="novel-quality-row-label">{label}</span>
        {meta ? <span className="novel-quality-row-meta">{meta}</span> : null}
      </div>
      {detail ? <div className="novel-quality-row-detail">{detail}</div> : null}
    </div>
  )
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
  proseQualityReports = [],
  editorRevisionReports = [],
  editorRevisionTask = null,
  proseQualityLoading = false,
  editorReportLoading = false,
  onRefreshProseQuality,
  onApplyEditorRevision,
  onCancelEditorRevision,
  onRetryEditorRevision,
  onLoadEditorRevisionDiagnostics,
  onCreateEditorReport,
  onOpenSideQuality,
}: {
  activeChapter: any | null
  proseQualityReports?: any[]
  editorRevisionReports?: any[]
  editorRevisionTask?: EditorRevisionTask | null
  proseQualityLoading?: boolean
  editorReportLoading?: boolean
  onRefreshProseQuality?: () => void
  onApplyEditorRevision?: (report: any, options?: { revisionMode?: string; prompt?: string; skipConfirm?: boolean }) => void
  onCancelEditorRevision?: (runId: number) => void | Promise<unknown>
  onRetryEditorRevision?: (runId: number) => void | Promise<unknown>
  onLoadEditorRevisionDiagnostics?: (runId: number) => Promise<Record<string, unknown>>
  onCreateEditorReport?: () => void
  onOpenSideQuality?: () => void
}) {
  const wordCount = chapterWordCount(activeChapter)
  const chapterId = Number(activeChapter?.id || 0)
  const hasProse = Boolean(chapterId && wordCount > 0)
  const [open, setOpen] = React.useState(true)
  const [customRevisionPrompt, setCustomRevisionPrompt] = React.useState('')
  const currentEditorRevisionTask = editorRevisionTask?.chapter_id === chapterId ? editorRevisionTask : null
  const revisionActive = Boolean(currentEditorRevisionTask && isActiveEditorRevisionTask(currentEditorRevisionTask))

  const chapterReports = React.useMemo(() => {
    if (!chapterId) return [] as any[]
    return (proseQualityReports || [])
      .filter(report => reportChapterId(report) === chapterId)
      .slice()
      .sort((a, b) => timeValue(b.created_at) - timeValue(a.created_at))
  }, [proseQualityReports, chapterId])

  const latest = chapterReports[0] || null
  const view = latest ? resolveQualityReportView(latest) : null
  const revisionUsageMap = React.useMemo(
    () => buildRevisionUsageMap(editorRevisionReports || []),
    [editorRevisionReports],
  )
  const usedByRevisions = latest ? (revisionUsageMap.get(Number(latest.id)) || []) : []
  const matchesCurrent = latest ? reviewMatchesCurrentText(latest, activeChapter) : false
  const reportTime = timeValue(latest?.created_at)
  const chapterTime = timeValue(activeChapter?.updated_at)
  const isStale = Boolean(
    latest
    && !matchesCurrent
    && chapterTime
    && reportTime
    && reportTime < chapterTime,
  )
  const score = Number(view?.score || 0)
  const issues = Array.isArray(view?.issues) ? view!.issues : []
  const checks = Array.isArray(view?.checks) ? view!.checks : []
  const warnings = Array.isArray(view?.warnings) ? view!.warnings : []
  const pipeline = Array.isArray(view?.pipeline) ? view!.pipeline : []
  const craftMetrics = view?.craftMetrics && typeof view.craftMetrics === 'object' ? view.craftMetrics : {}
  const focusedModes = Array.isArray(view?.focusedModes) ? view!.focusedModes : []
  const review = view?.review || {}
  const payload = view?.payload || {}
  const previousChapter = view?.previousChapter || null
  const revisionDirectives = asTextList(review?.revision_directives || review?.revisionDirectives)
  const summaryText = String(latest?.summary || review?.summary || '').trim()
  const dimensions = (review?.dimensions && typeof review.dimensions === 'object')
    ? review.dimensions
    : (payload?.dimensions && typeof payload.dimensions === 'object' ? payload.dimensions : {})
  const findings = Array.isArray(review?.findings) ? review.findings : []

  const needsWork = Boolean(
    !latest
    || isStale
    || latest?.status === 'warn'
    || (score > 0 && score < 78)
    || issues.length > 0
    || revisionDirectives.length > 0,
  )

  React.useEffect(() => {
    if (needsWork) setOpen(true)
  }, [needsWork, chapterId, latest?.id])

  if (!hasProse) return null

  const canRevise = Boolean(latest && onApplyEditorRevision && !isStale && usedByRevisions.length === 0 && !revisionActive)
  const trimmedCustomPrompt = customRevisionPrompt.trim()
  const withCustomPrompt = (options: { revisionMode?: string; prompt?: string; skipConfirm?: boolean } = {}) => ({
    ...options,
    prompt: String(options.prompt || trimmedCustomPrompt || '').trim() || undefined,
  })
  const applyRevision = (options: { revisionMode?: string; prompt?: string; skipConfirm?: boolean } = {}) => {
    if (!canRevise || revisionActive || !latest || !onApplyEditorRevision) return
    onApplyEditorRevision(latest, withCustomPrompt(options))
  }


  const summaryBits = [
    latest ? `${score || '-'}分` : '尚未质检',
    isStale ? '旧报告' : '',
    latest?.status === 'warn' ? '需检查' : latest ? (score >= 78 ? '可过关' : '待提升') : '',
    issues.length ? `${issues.length} 项问题` : (latest ? '无列出问题' : ''),
    checks.length ? `${checks.length} 项预检` : '',
    revisionDirectives.length ? `${revisionDirectives.length} 条修订指令` : '',
    usedByRevisions.length ? '已生成修订' : '',
  ].filter(Boolean)

  const busy = Boolean(proseQualityLoading || editorReportLoading)
  const craftRows = Object.entries(craftMetrics)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ({
      key,
      label: CRAFT_METRIC_LABELS[key] || key,
      value: String(value),
    }))
  const dimensionRows = Object.entries(dimensions)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ({ key, label: key, value: String(value) }))

  return (
    <details
      className={`novel-quality-revision-panel${needsWork ? ' is-attention' : ''}`}
      open={open}
      onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}
    >
      <summary className="novel-quality-revision-summary">
        <span className="novel-quality-revision-title">质检修订</span>
        <span className="novel-quality-revision-pills">
          {summaryBits.map(bit => (
            <span key={bit} className="novel-quality-revision-pill">{bit}</span>
          ))}
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
        <div className="novel-quality-revision-actions">
          <Space wrap size={[6, 6]}>
            <Button
              size="small"
              type="primary"
              loading={proseQualityLoading}
              onClick={() => onRefreshProseQuality?.()}
            >
              {latest ? (isStale ? '复检当前版本' : '重新质检') : '立即质检'}
            </Button>
            <Button
              size="small"
              disabled={!canRevise}
              loading={editorReportLoading}
              onClick={() => applyRevision()}
            >
              {usedByRevisions.length ? '已用于修订' : isStale ? '旧报告不可修订' : (trimmedCustomPrompt ? '按报告+自定义修订' : '按报告修订')}
            </Button>
            {onCreateEditorReport ? (
              <Button size="small" loading={editorReportLoading} onClick={() => onCreateEditorReport?.()}>
                生成编辑报告
              </Button>
            ) : null}
            {onOpenSideQuality ? (
              <Button size="small" type="link" onClick={() => onOpenSideQuality?.()}>
                历史记录
              </Button>
            ) : null}
          </Space>
        </div>

        {!latest ? (
          <Text type="secondary" className="novel-quality-revision-empty">
            当前章已有正文，但还没有质检结果。先点「立即质检」，再按问题修订。
          </Text>
        ) : (
          <>
            <div className="novel-quality-revision-meta">
              <Space wrap size={[4, 4]}>
                <Tag color={scoreColor(score)} bordered={false}>{score || '-'} 分</Tag>
                <Tag color={latest.status === 'warn' ? 'gold' : 'green'} bordered={false}>
                  {latest.status === 'warn' ? '需检查' : '通过'}
                </Tag>
                {review?.needs_revision || review?.needsRevision ? <Tag color="gold" bordered={false}>建议修订</Tag> : null}
                {isStale ? <Tag color="red" bordered={false}>旧报告</Tag> : <Tag color="blue" bordered={false}>对应当前正文</Tag>}
                {usedByRevisions.length > 0 ? <Tag color="purple" bordered={false}>已生成修订稿</Tag> : null}
                {payload.source === 'post_revision' ? <Tag color="blue" bordered={false}>修订后复检</Tag> : null}
                {view?.preflight?.ready ? <Tag color="green" bordered={false}>上下文完整</Tag> : <Tag color="gold" bordered={false}>上下文缺口</Tag>}
                <Text type="secondary" style={{ fontSize: 11 }}>{latest.created_at}</Text>
              </Space>
              {isStale ? (
                <Text type="danger" className="novel-quality-revision-hint">
                  这份报告早于当前正文，请先复检当前版本再修订。
                </Text>
              ) : null}
              {usedByRevisions.length > 0 ? (
                <Text className="novel-quality-revision-hint">
                  已用于生成修订稿：{usedByRevisions.map((item: any) => `#${item.report.id}`).join('、')}
                </Text>
              ) : null}
              {summaryText ? (
                <Paragraph className="novel-quality-revision-summary-text">{summaryText}</Paragraph>
              ) : null}
            </div>

            {canRevise && !busy ? (
              <>
                <div className="novel-quality-revision-chips">
                  <div className="novel-quality-section-title">定向修订</div>
                  <Space wrap size={[4, 4]}>
                    {REVISION_CHIPS.map(chip => (
                      <Button
                        key={chip.mode}
                        size="small"
                        className="novel-quality-revision-chip novel-btn-crystal novel-btn-crystal-display"
                        onClick={() => applyRevision({ revisionMode: chip.mode })}
                      >
                        {chip.label}
                      </Button>
                    ))}
                  </Space>
                </div>

                <div className="novel-quality-revision-custom">
                  <div className="novel-quality-section-title">自定义修订指令</div>
                  <Text type="secondary" className="novel-quality-revision-hint">
                    质检漏检时，可写强制改法；会优先并入修订提示词，并仍覆盖报告必修项。
                  </Text>
                  <Space wrap size={[4, 4]} className="novel-quality-revision-custom-presets">
                    {CUSTOM_REVISION_PRESETS.map(preset => (
                      <Button
                        key={preset.key}
                        size="small"
                        className="novel-quality-revision-chip novel-btn-crystal novel-btn-crystal-display"
                        onClick={() => setCustomRevisionPrompt(preset.prompt)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                    {trimmedCustomPrompt ? (
                      <Button size="small" type="link" onClick={() => setCustomRevisionPrompt('')}>
                        清空
                      </Button>
                    ) : null}
                  </Space>
                  <Input.TextArea
                    value={customRevisionPrompt}
                    onChange={(event) => setCustomRevisionPrompt(event.target.value)}
                    placeholder="例如：删除正文中所有英文夹杂，统一改成自然中文"
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    maxLength={500}
                    showCount
                  />
                </div>
              </>
            ) : null}

            {dimensionRows.length > 0 ? (
              <section className="novel-quality-section">
                <div className="novel-quality-section-title">维度评分</div>
                <div className="novel-quality-row-list">
                  {dimensionRows.map(row => (
                    <QualityRow key={row.key} status="info" label={row.label} meta={`${row.value} 分`} />
                  ))}
                </div>
              </section>
            ) : null}

            {craftRows.length > 0 || focusedModes.length > 0 ? (
              <section className="novel-quality-section">
                <div className="novel-quality-section-title">工艺指标</div>
                <div className="novel-quality-row-list">
                  {craftRows.map(row => (
                    <QualityRow
                      key={row.key}
                      status={row.key.includes('overuse') && Number(row.value) > 60 ? 'warn' : 'info'}
                      label={row.label}
                      meta={row.value}
                    />
                  ))}
                  {focusedModes.map((mode: string) => (
                    <QualityRow key={`mode-${mode}`} status="info" label="建议修订模式" detail={mode} />
                  ))}
                </div>
              </section>
            ) : null}

            {checks.length > 0 ? (
              <section className="novel-quality-section">
                <div className="novel-quality-section-title">预检清单（{checks.length}）</div>
                <div className="novel-quality-row-list">
                  {checks.map((check: any, index: number) => {
                    const ok = Boolean(check?.ok)
                    const label = String(check?.label || check?.key || `预检 ${index + 1}`)
                    const detail = [check?.fix, check?.evidence, check?.detail].filter(Boolean).map(String).join(' · ')
                    return (
                      <QualityRow
                        key={`${check?.key || label}-${index}`}
                        status={ok ? 'pass' : (String(check?.severity || '') === 'high' ? 'fail' : 'warn')}
                        label={label}
                        detail={detail || undefined}
                        meta={ok ? '已备' : '缺口'}
                      />
                    )
                  })}
                </div>
              </section>
            ) : null}

            {warnings.length > 0 ? (
              <section className="novel-quality-section">
                <div className="novel-quality-section-title">上下文缺口（{warnings.length}）</div>
                <div className="novel-quality-row-list">
                  {warnings.map((warning: any, index: number) => (
                    <QualityRow
                      key={`warn-${index}`}
                      status="warn"
                      label={typeof warning === 'string' ? warning : displayValue(warning)}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {issues.length > 0 ? (
              <section className="novel-quality-section">
                <div className="novel-quality-section-title">质检问题（{issues.length}）</div>
                <div className="novel-quality-row-list">
                  {issues.map((issue: any, index: number) => {
                    const severity = issueSeverity(issue)
                    const status = severity === 'critical' || severity === 'high' ? 'fail' : severity === 'low' ? 'info' : 'warn'
                    const title = issueLabel(issue)
                    const type = typeof issue === 'object' ? String(issue?.type || issue?.key || '') : ''
                    const fix = typeof issue === 'object' ? String(issue?.fix || issue?.required_change || issue?.suggestion || '') : ''
                    const evidence = typeof issue === 'object' ? String(issue?.evidence || '') : ''
                    const detailParts = [
                      type ? `类型：${type}` : '',
                      evidence ? `证据：${evidence}` : '',
                      fix ? `改法：${fix}` : '',
                    ].filter(Boolean)
                    return (
                      <QualityRow
                        key={`issue-${index}`}
                        status={status as any}
                        label={title}
                        meta={severity}
                        detail={detailParts.join('\n') || undefined}
                      />
                    )
                  })}
                </div>
              </section>
            ) : (
              <section className="novel-quality-section">
                <div className="novel-quality-section-title">质检问题</div>
                <Text type="secondary" className="novel-quality-revision-empty">最近一次质检没有列出明确问题条目。</Text>
              </section>
            )}

            {findings.length > 0 ? (
              <section className="novel-quality-section">
                <div className="novel-quality-section-title">诊断发现（{findings.length}）</div>
                <div className="novel-quality-row-list">
                  {findings.map((finding: any, index: number) => {
                    const severity = String(finding?.severity || 'info')
                    const status = /S1|critical|high/i.test(severity) ? 'fail' : /S2|medium|warn/i.test(severity) ? 'warn' : 'info'
                    const label = String(finding?.key || finding?.dimension || `发现 ${index + 1}`)
                    const detail = [
                      finding?.evidence ? `证据：${finding.evidence}` : '',
                      finding?.required_change ? `改法：${finding.required_change}` : '',
                      finding?.acceptance_test ? `复检：${finding.acceptance_test}` : '',
                    ].filter(Boolean).join('\n')
                    return (
                      <QualityRow
                        key={`finding-${index}`}
                        status={status as any}
                        label={label}
                        meta={severity}
                        detail={detail || undefined}
                      />
                    )
                  })}
                </div>
              </section>
            ) : null}

            {revisionDirectives.length > 0 ? (
              <section className="novel-quality-section">
                <div className="novel-quality-section-title">修订指令（{revisionDirectives.length}）</div>
                <div className="novel-quality-row-list">
                  {revisionDirectives.map((directive, index) => (
                    <QualityRow
                      key={`directive-${index}`}
                      status="warn"
                      label={`指令 ${index + 1}`}
                      detail={directive}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {pipeline.length > 0 ? (
              <section className="novel-quality-section">
                <div className="novel-quality-section-title">生成流水线（{pipeline.length}）</div>
                <div className="novel-quality-row-list">
                  {pipeline.map((stage: any, index: number) => {
                    const statusRaw = String(stage?.status || '')
                    const status = statusRaw === 'success' || statusRaw === 'ok'
                      ? 'pass'
                      : statusRaw === 'failed' || statusRaw === 'error'
                        ? 'fail'
                        : statusRaw === 'warn'
                          ? 'warn'
                          : 'info'
                    return (
                      <QualityRow
                        key={`${stage?.key || stage?.label || index}`}
                        status={status as any}
                        label={String(stage?.label || stage?.key || `阶段 ${index + 1}`)}
                        detail={String(stage?.detail || stage?.message || '') || undefined}
                        meta={statusRaw || undefined}
                      />
                    )
                  })}
                </div>
              </section>
            ) : null}

            {previousChapter ? (
              <section className="novel-quality-section">
                <div className="novel-quality-section-title">前章衔接</div>
                <div className="novel-quality-row-list">
                  <QualityRow
                    status="info"
                    label={`第${previousChapter.chapter_no || '-'}章《${displayValue(previousChapter.title) || '未命名'}》`}
                    detail={`章末钩子：${displayValue(previousChapter.ending_hook) || '未记录'}`}
                  />
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </details>
  )
}
