import { describe, expect, test } from 'bun:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  buildRecoveryEvidenceAuditView,
  buildRecoveryEvidenceReviewActionFeedback,
  buildRecoveryEvidenceReviewActionFeedbackKey,
  buildRecoveryEvidenceReviewRefreshAnchor,
  buildRecoveryEvidenceReviewRefreshFeedback,
  buildRecoveryEvidenceReviewResolvedFeedback,
  buildRecoveryEvidenceReviewRowAction,
  buildRecoveryEvidenceReviewRows,
  buildRecoveryEvidenceRegovernanceSummary,
  buildRecoveryEvidenceSourceRiskProfileSnapshot,
  buildPostBatchQualityCheckSummary,
  buildNextChapterQualityPlanPreview,
  buildRepairClosureHighlights,
  buildRepairTaskIssueTagMeta,
  buildTaskRunCardModel,
  buildChapterAdmissionWarningCards,
  buildSafeBatchExpansionPolicySnapshot,
  buildSafeBatchRecoveryFocusReviewState,
  chapterGroupActionState,
  chapterGroupRunActionState,
  recoveryEvidenceSourceRecheckAction,
  repairTaskActionLabel,
  runTypeLabel,
  safeBatchRecoveryFocusMatchesTask,
  TaskRunCard,
} from './TaskCenterDrawer'
import { buildNovelWorkspaceDeferredSurfacesProps } from './shell/workspace-view-props-deferred'

function editorRevisionTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 81,
    run_type: 'editor_revision',
    status: 'running',
    phase: 'admit_candidate',
    phase_label: '不应直接信任的标签',
    progress: null,
    chapter_id: 7,
    chapter_no: 7,
    chapter_title: '雾港来信',
    prose_persisted: false,
    phases: {
      admit_candidate: { status: 'running', attempt: 1 },
    },
    warnings: [{ code: 'QUALITY_CONTEXT_GAP', message: '缺少前章摘要' }],
    error: null,
    can_cancel: true,
    can_retry: false,
    can_continue: false,
    repair_task_link: null,
    created_at: '2026-07-29T08:00:00.000Z',
    updated_at: '2026-07-29T08:00:02.000Z',
    ...overrides,
  }
}

async function loadEditorRevisionSummary() {
  return import('./task-center/drawer-run-summary-editor-revision').catch(() => null)
}

function nodeText(node: any): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (React.isValidElement(node)) return nodeText((node.props as any).children)
  return ''
}

function findClickable(node: any, label: string): React.ReactElement | null {
  if (!React.isValidElement(node)) {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = findClickable(child, label)
        if (found) return found
      }
    }
    return null
  }
  const props = node.props as any
  if (typeof props.onClick === 'function' && nodeText(props.children).includes(label)) return node
  return findClickable(props.children, label)
}

describe('buildTaskRunCardModel', () => {
  test('uses the single-chapter label and preserves indeterminate editor revision progress', () => {
    const run = editorRevisionTask()
    const model = buildTaskRunCardModel(run)
    const html = renderToStaticMarkup(React.createElement(TaskRunCard, {
      run,
      model,
      onDetail: () => {},
    }))

    expect(runTypeLabel('editor_revision')).toBe('单章修订')
    expect(model.progress).toBeNull()
    expect(html).toContain('ant-spin')
    expect(html).toContain('安全检查')
    expect(html).not.toContain('ant-progress')
  })

  test('summarizes repair runs with lifecycle, operation mode, timeline, closure and one primary action', () => {
    const model = buildTaskRunCardModel({
      id: 17,
      run_type: 'longform_production_repair',
      status: 'ready',
      step_name: 'reader-trial-repair-1',
      created_at: '2026-06-30T08:10:00.000Z',
      updated_at: '2026-06-30T08:15:00.000Z',
      output_ref: JSON.stringify({
        tasks: [
          { task_status: 'open', title: '补章末追读' },
          { task_status: 'needs_review', title: '复查试读修复' },
          { task_status: 'resolved', title: '补开篇钩子' },
        ],
      }),
    }, { canProcessRepairTasks: true })

    expect(model.lifecycle.label).toBe('待启动')
    expect(model.execution.label).toBe('手工处理')
    expect(model.timeline).toEqual([
      { key: 'created', label: '创建', value: '2026-06-30 16:10' },
      { key: 'started', label: '开始', value: '未开始' },
      { key: 'ended', label: '结束', value: '未结束' },
      { key: 'updated', label: '更新', value: '2026-06-30 16:15' },
    ])
    expect(model.closure).toMatchObject({
      total: 3,
      pending: 1,
      needsReview: 1,
      resolved: 1,
      failed: 0,
      summary: '待处理 1 项，需复查 1 项，已完成 1/3',
    })
    expect(model.primaryAction).toEqual({ key: 'process_repair', label: '处理下一项' })
  })

  test('marks unattended and completed runs without adding a primary action', () => {
    const model = buildTaskRunCardModel({
      id: 18,
      run_type: 'chapter_group_generation',
      status: 'completed',
      step_name: 'unattended-to-10',
      input_ref: JSON.stringify({ unattended: { enabled: true } }),
      output_ref: JSON.stringify({ chapters: [{ status: 'success' }, { status: 'success' }] }),
      started_at: '2026-06-30T09:00:00.000Z',
      completed_at: '2026-06-30T09:05:00.000Z',
    })

    expect(model.lifecycle.label).toBe('已完成')
    expect(model.execution.label).toBe('自动运行')
    expect(model.closure.summary).toBe('已完成 2/2')
    expect(model.primaryAction).toEqual({ key: 'none', label: '' })
  })

  test('director stage summarizes oh-story director stage, blocking status and lifecycle metadata', () => {
    const model = buildTaskRunCardModel({
      id: 19,
      run_type: 'generate_prose',
      status: 'completed',
      created_at: '2026-06-30T08:10:00.000Z',
      started_at: '2026-06-30T08:12:00.000Z',
      completed_at: '2026-06-30T08:18:00.000Z',
      input: { unattended: true },
      payload: {
        oh_story_director: {
          stage: 'pre_draft',
          readiness: 'needs_repair',
          primary_action: { key: 'repair_pre_draft_materials', label: '补齐并继续', mode: 'automatic' },
          required_repairs: [{ key: 'blueprint', label: '补蓝图', blocking: true }],
        },
      },
    })

    expect(model.execution.key).toBe('auto')
    expect(model.directorStage?.key).toBe('pre_draft')
    expect(model.directorStage?.label).toBe('写前准备')
    expect(model.blocking.key).toBe('blocking')
    expect(model.timeline.find(item => item.key === 'started')?.value).toContain('2026')
    expect(model.timeline.find(item => item.key === 'ended')?.value).toContain('2026')
  })

  test('director stage marks ready post-draft director runs as non-blocking', () => {
    const model = buildTaskRunCardModel({
      id: 20,
      run_type: 'generate_prose',
      status: 'completed',
      output_ref: JSON.stringify({
        ohStoryDirector: {
          stage: 'post_draft',
          readiness: 'ready',
          requiredRepairs: [],
        },
      }),
    })

    expect(model.directorStage?.label).toBe('写后诊断')
    expect(model.blocking.key).toBe('non_blocking')
    expect(model.blocking.label).toBe('不阻塞')
  })

  test('director stage reads director metadata from payload when output ref has no director', () => {
    const model = buildTaskRunCardModel({
      id: 21,
      run_type: 'generate_prose',
      status: 'completed',
      output_ref: JSON.stringify({ chapters: [] }),
      payload: {
        oh_story_director: {
          stage: 'handoff',
          readiness: 'needs_user_confirmation',
          required_repairs: [{ blocking: true }],
        },
      },
    })

    expect(model.directorStage?.key).toBe('handoff')
    expect(model.directorStage?.label).toBe('章节交接')
    expect(model.blocking.key).toBe('blocking')
  })

  test('director stage reads director metadata from input context package when input ref has no director', () => {
    const model = buildTaskRunCardModel({
      id: 22,
      run_type: 'generate_prose',
      status: 'completed',
      input_ref: JSON.stringify({ unattended: false }),
      input: {
        contextPackage: {
          ohStoryDirector: {
            stage: 'drafting',
            readiness: 'ready',
            requiredRepairs: [],
          },
        },
      },
    })

    expect(model.directorStage?.key).toBe('drafting')
    expect(model.directorStage?.label).toBe('正文生成')
    expect(model.blocking.key).toBe('non_blocking')
  })

  test('summarizes admitted chapter warnings once per source without approval action', () => {
    const run = {
      id: 23,
      run_type: 'chapter_group_generation',
      status: 'completed',
      output_ref: JSON.stringify({
        chapters: [{
          id: 903,
          chapter_no: 23,
          status: 'success',
          admission_status: 'accepted_with_warnings',
          story_state_status: 'pending',
          quality_warnings: [
            { source: 'quality', code: 'hook_weak', message: '章尾钩子偏弱' },
            { source: 'quality', code: 'score_low', message: '评分低于建议目标' },
          ],
          warnings: [
            { source: 'quality', code: 'hook_weak', message: '章尾钩子偏弱' },
            { source: 'story_state', code: 'pending', message: 'Story State 同步待完成。' },
            { source: 'story_state', code: 'index_pending', message: '状态索引稍后补齐' },
          ],
        }],
      }),
    }

    const cards = buildChapterAdmissionWarningCards(run)
    const actionState = chapterGroupActionState(JSON.parse(run.output_ref).chapters[0])

    expect(cards).toHaveLength(2)
    expect(cards.map(card => card.source)).toEqual(['quality', 'story_state'])
    expect(cards[0]?.title).toBe('已入库，建议修订')
    expect(cards[0]?.messages).toEqual(['章尾钩子偏弱', '评分低于建议目标'])
    expect(cards[1]?.title).toBe('正文已入库，故事状态待补同步')
    expect(cards[1]?.messages).toEqual(['Story State 同步待完成。', '状态索引稍后补齐'])
    expect(actionState.canApprove).toBe(false)
  })

  test('deduplicates the same warning across chapters while retaining every chapter number', () => {
    const cards = buildChapterAdmissionWarningCards({
      run_type: 'chapter_group_generation',
      status: 'completed',
      output_ref: JSON.stringify({
        chapters: [11, 12].map(chapterNo => ({
          chapter_no: chapterNo,
          status: 'success',
          admission_status: 'accepted_with_warnings',
          story_state_status: 'pending',
          warnings: [{ source: 'story_state', code: 'pending', message: 'Story State 同步待完成。' }],
        })),
      }),
    })

    expect(cards).toHaveLength(1)
    expect(cards[0]?.messages).toEqual(['Story State 同步待完成。'])
    expect(cards[0]?.chapterNos).toEqual([11, 12])
  })
})

describe('EditorRevisionRunSummary', () => {
  test('renders chapter, redacted phase, elapsed/update time, warnings and only legal running actions', async () => {
    const module = await loadEditorRevisionSummary()
    expect(module).not.toBeNull()
    if (!module) return
    const loadDiagnostics = () => { throw new Error('ordinary render must not load diagnostics') }

    const html = renderToStaticMarkup(React.createElement(module.EditorRevisionRunSummary, {
      run: editorRevisionTask(),
      diagnostics: null,
      diagnosticsLoading: false,
      onCancel: () => {},
      onRetry: () => {},
      onContinue: () => {},
      onOpenChapter: () => {},
      onLoadDiagnostics: loadDiagnostics,
    }))

    expect(html).toContain('单章修订')
    expect(html).toContain('第7章')
    expect(html).toContain('雾港来信')
    expect(html).toContain('安全检查')
    expect(html).toContain('耗时 2秒')
    expect(html).toContain('更新 2026-07-29 16:00')
    expect(html).toContain('缺少前章摘要')
    expect(html).toContain('取消修订')
    expect(html).toContain('查看诊断')
    expect(html).not.toContain('重试')
    expect(html).not.toContain('继续后处理')
  })

  test('shows retry before commit and continue after commit without leaking illegal actions', async () => {
    const module = await loadEditorRevisionSummary()
    expect(module).not.toBeNull()
    if (!module) return
    const baseProps = {
      diagnostics: null,
      diagnosticsLoading: false,
      onCancel: () => {},
      onRetry: () => {},
      onContinue: () => {},
      onOpenChapter: () => {},
      onLoadDiagnostics: () => {},
    }

    const retryHtml = renderToStaticMarkup(React.createElement(module.EditorRevisionRunSummary, {
      ...baseProps,
      run: editorRevisionTask({
        status: 'failed',
        phase: 'generate_candidate',
        prose_persisted: false,
        can_cancel: false,
        can_retry: true,
        error: { code: 'REVISION_FAILED', message: '候选生成失败' },
      }),
    }))
    const continueHtml = renderToStaticMarkup(React.createElement(module.EditorRevisionRunSummary, {
      ...baseProps,
      run: editorRevisionTask({
        status: 'canceled',
        phase: 'sync_current_story_state',
        prose_persisted: true,
        can_cancel: false,
        can_continue: true,
        error: { code: 'POST_PROCESSING_FAILED', message: '后处理未完成' },
      }),
    }))

    expect(retryHtml).toContain('候选生成失败')
    expect(retryHtml.replace(/重\s+试/g, '重试')).toContain('重试')
    expect(retryHtml).not.toContain('继续后处理')
    expect(retryHtml).not.toContain('取消修订')
    expect(continueHtml).toContain('继续后处理')
    expect(continueHtml).not.toContain('重试')
    expect(continueHtml).not.toContain('取消修订')
  })

  test('loads diagnostics only from the explicit diagnostics action', async () => {
    const module = await loadEditorRevisionSummary()
    expect(module).not.toBeNull()
    if (!module) return
    let diagnosticsCalls = 0
    const summary = module.EditorRevisionRunSummary({
      run: editorRevisionTask(),
      diagnostics: null,
      diagnosticsLoading: false,
      onCancel: () => {},
      onRetry: () => {},
      onContinue: () => {},
      onOpenChapter: () => {},
      onLoadDiagnostics: () => { diagnosticsCalls += 1 },
    })

    expect(diagnosticsCalls).toBe(0)
    const diagnosticsButton = findClickable(summary, '查看诊断')
    expect(diagnosticsButton).not.toBeNull()
    ;(diagnosticsButton?.props as any).onClick()
    expect(diagnosticsCalls).toBe(1)
  })
})

describe('editor revision Task Center callback plumbing', () => {
  test('forwards cancel, retry and diagnostics callbacks to deferred surfaces', () => {
    const cancelEditorRevision = () => {}
    const retryEditorRevision = () => {}
    const loadEditorRevisionDiagnostics = () => Promise.resolve({})
    const props = buildNovelWorkspaceDeferredSurfacesProps({
      cancelEditorRevision,
      retryEditorRevision,
      loadEditorRevisionDiagnostics,
    })

    expect(props.cancelEditorRevision).toBe(cancelEditorRevision)
    expect(props.retryEditorRevision).toBe(retryEditorRevision)
    expect(props.loadEditorRevisionDiagnostics).toBe(loadEditorRevisionDiagnostics)
  })
})

describe('buildPostBatchQualityCheckSummary', () => {
  test('summarizes oh-story batch quality checks from chapter group output', () => {
    const summary = buildPostBatchQualityCheckSummary({
      run_type: 'chapter_group_generation',
      output_ref: JSON.stringify({
        post_batch_quality_check: {
          source: 'oh_story_step_3',
          status: 'warn',
          completed_count: 3,
          chapter_nos: [21, 22, 23],
          revised_count: 1,
          average_score: 82,
          checks: [
            { key: 'title_uniqueness', label: '标题去重', status: 'ok', checked_count: 3, warn_count: 0 },
            { key: 'prose_meta', label: '正文元信息', status: 'warn', checked_count: 3, warn_count: 1, summaries: ['第22章仍残留作者说明'] },
            { key: 'chapter_hook', label: '章尾钩子', status: 'ok', checked_count: 3, warn_count: 0 },
            { key: 'blueprint_consumption', label: '细纲兑现', status: 'ok', checked_count: 3, warn_count: 0 },
            { key: 'foreshadowing_delta', label: '伏笔增量', status: 'warn', checked_count: 3, warn_count: 1 },
            { key: 'deterministic_cleanup', label: '确定性清理', status: 'ok', checked_count: 3, warn_count: 0 },
            { key: 'story_state', label: '状态机更新', status: 'ok', checked_count: 3, warn_count: 0 },
          ],
        },
      }),
    })

    expect(summary).toMatchObject({
      visible: true,
      title: '批次质检',
      source: 'oh_story_step_3',
      status: 'warn',
      statusLabel: '需复核',
      statusColor: 'gold',
      completedCount: 3,
      chapterNos: [21, 22, 23],
      revisedCount: 1,
      averageScore: 82,
      warningCount: 2,
    })
    expect(summary?.chapterText).toBe('第21-23章')
    expect(summary?.checks).toHaveLength(7)
    expect(summary?.checks.find(check => check.key === 'prose_meta')).toMatchObject({
      label: '正文元信息',
      status: 'warn',
      statusLabel: '需复核',
      warningCount: 1,
      summaries: ['第22章仍残留作者说明'],
    })
  })

  test('stays hidden when chapter group output has no post batch quality check', () => {
    expect(buildPostBatchQualityCheckSummary({
      run_type: 'chapter_group_generation',
      output_ref: JSON.stringify({ chapters: [] }),
    })).toBeNull()
  })
})

describe('chapterGroupActionState', () => {
  test('does not offer manual approval for approval-blocker chapters', () => {
    const state = chapterGroupActionState({
      status: 'needs_approval',
      approval_stage: 'approval_blocker',
      error_code: 'APPROVAL_BLOCKER',
      error: '仿写安全阻断：参考桥段相似度过高',
    })

    expect(state.canApprove).toBe(false)
    expect(state.canRetry).toBe(false)
    expect(state.canSkip).toBe(false)
    expect(state.blockedByApprovalBlocker).toBe(true)
    expect(state.actionHint).toContain('先修复入库阻断')
  })

  test('keeps manual confirmation available for ordinary approval stages', () => {
    const state = chapterGroupActionState({
      status: 'needs_approval',
      approval_stage: 'scene_cards',
    })

    expect(state.canApprove).toBe(true)
    expect(state.canRetry).toBe(true)
    expect(state.canSkip).toBe(true)
    expect(state.blockedByApprovalBlocker).toBe(false)
  })

  test('disables actions for terminal blocked invalid chapters', () => {
    const state = chapterGroupActionState({
      status: 'failed',
      admission_status: 'blocked_invalid',
      error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
    })

    expect(state.terminalAdmission).toBe(true)
    expect(state.canApprove).toBe(false)
    expect(state.canRetry).toBe(false)
    expect(state.canSkip).toBe(false)
    expect(state.actionHint).toContain('正文无效且未入库')
  })
})

describe('chapterGroupRunActionState', () => {
  test('does not offer run-level continue or execute for approval-blocker runs', () => {
    const state = chapterGroupRunActionState({
      run_type: 'chapter_group_generation',
      status: 'paused',
      output_ref: JSON.stringify({
        current_index: 0,
        chapters: [
          {
            id: 901,
            chapter_no: 21,
            status: 'needs_approval',
            approval_stage: 'approval_blocker',
            error_code: 'APPROVAL_BLOCKER',
          },
        ],
        last_error: {
          approval_stage: 'approval_blocker',
          error_code: 'APPROVAL_BLOCKER',
        },
      }),
    })

    expect(state.blockedByApprovalBlocker).toBe(true)
    expect(state.canResume).toBe(false)
    expect(state.canExecute).toBe(false)
    expect(state.actionHint).toContain('先修复入库阻断')
  })

  test('keeps run-level continue and execute available for ordinary paused chapter groups', () => {
    const state = chapterGroupRunActionState({
      run_type: 'chapter_group_generation',
      status: 'paused',
      output_ref: JSON.stringify({
        current_index: 0,
        chapters: [{ id: 902, chapter_no: 22, status: 'needs_approval', approval_stage: 'scene_cards' }],
      }),
    })

    expect(state.blockedByApprovalBlocker).toBe(false)
    expect(state.canResume).toBe(true)
    expect(state.canExecute).toBe(true)
  })

  test('disables run actions for persisted blocked invalid admissions', () => {
    const state = chapterGroupRunActionState({
      run_type: 'chapter_group_generation',
      status: 'paused',
      output_ref: JSON.stringify({
        current_index: 0,
        chapters: [{ admission_status: 'blocked_invalid', error_code: 'PROSE_ADMISSION_BLOCKED_INVALID' }],
      }),
    })

    expect(state.terminalAdmission).toBe(true)
    expect(state.canResume).toBe(false)
    expect(state.canExecute).toBe(false)
  })

  test('disables run actions when blocked invalid exists only in last error metadata', () => {
    const state = chapterGroupRunActionState({
      run_type: 'chapter_group_generation',
      status: 'paused',
      output_ref: JSON.stringify({
        error_code: 'PROSE_GENERATION_FAILED',
        current_index: 0,
        chapters: [{ chapter_no: 11, status: 'failed' }],
        last_error: { error_code: 'PROSE_ADMISSION_BLOCKED_INVALID' },
      }),
    })

    expect(state.terminalAdmission).toBe(true)
    expect(state.canResume).toBe(false)
    expect(state.canExecute).toBe(false)
  })

  test('ignores stale top-level terminal admission when the current chapter is ordinary', () => {
    const state = chapterGroupRunActionState({
      run_type: 'chapter_group_generation',
      status: 'paused',
      output_ref: JSON.stringify({
        admission_status: 'blocked_invalid',
        error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
        current_index: 0,
        chapters: [{ chapter_no: 12, status: 'failed' }],
        last_error: { error_code: 'PROSE_GENERATION_FAILED' },
      }),
    })

    expect(state.terminalAdmission).toBe(false)
    expect(state.canResume).toBe(true)
    expect(state.canExecute).toBe(true)
  })

  test('disables resume for a standalone blocked invalid admission payload', () => {
    const state = chapterGroupRunActionState({
      run_type: 'generate_prose',
      status: 'failed',
      output_ref: JSON.stringify({
        admission_status: 'blocked_invalid',
        error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
        chapter_id: 412,
        chapter_no: 21,
      }),
    })

    expect(state.terminalAdmission).toBe(true)
    expect(state.canResume).toBe(false)
    expect(state.canExecute).toBe(false)
  })
})

describe('buildRepairClosureHighlights', () => {
  test('summarizes resolved delivery risk repair tasks for task center closure evidence', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        issue_type: 'volume_beat_missed',
        task_status: 'resolved',
        chapter_no: 7,
        title: '旧规反噬',
      },
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        issue_type: 'core_drift',
        task_status: 'needs_review',
        chapter_no: 8,
      },
    ], { status: 'closed' })

    expect(highlights).toEqual([
      expect.objectContaining({
        label: '爆点风险已清',
        count: 1,
        chapterNos: [7],
        issueTypes: ['volume_beat_missed'],
      }),
    ])
    expect(highlights[0]?.detail).toContain('第7章')
    expect(highlights[0]?.detail).toContain('修复审计已闭环')
  })

  test('normalizes resolved annotation categories when issue type is missing', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        annotation_category: 'delivery_core',
        task_status: 'resolved',
        chapter_no: 8,
      },
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        annotation_category: 'reader_payoff',
        task_status: 'resolved',
        chapter_no: 9,
      },
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        issue_type: 'volume_beat_missed',
        annotation_category: 'delivery_core',
        task_status: 'resolved',
        chapter_no: 10,
      },
    ])

    expect(highlights).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: '核心偏移风险已清',
        chapterNos: [8],
        issueTypes: ['core_drift'],
      }),
      expect.objectContaining({
        label: '回报欠账风险已清',
        chapterNos: [9],
        issueTypes: ['reader_payoff_debt'],
      }),
      expect.objectContaining({
        label: '爆点风险已清',
        chapterNos: [10],
        issueTypes: ['volume_beat_missed'],
      }),
    ]))
  })

  test('groups resolved safe-batch repair aliases by longform risk category', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'reader_pull_missed',
        task_status: 'resolved',
        chapter_no: 9,
      },
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'reader_expectation_debt',
        task_status: 'resolved',
        chapter_no: 10,
      },
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'innovation_execution_missed',
        task_status: 'resolved',
        chapter_no: 11,
      },
    ])

    expect(highlights.map(item => item.label)).toEqual(['追读风险已清', '创新风险已清'])
    expect(highlights[0]?.count).toBe(2)
    expect(highlights[0]?.chapterNos).toEqual([9, 10])
    expect(highlights[0]?.issueTypes).toEqual(['reader_pull_missed', 'reader_expectation_debt'])
    expect(highlights[0]?.detail).toContain('第9、10章')
  })

  test('summarizes resolved next-chapter quality plan repairs as quality continuity closure', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        issue_type: 'next_chapter_quality_plan',
        task_status: 'resolved',
        chapter_no: 12,
        message: '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan。',
      },
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        annotation_category: 'approval_blocker',
        task_status: 'resolved',
        chapter_no: 13,
        detail: '下一章质量续航计划缺失',
      },
    ], { status: 'closed' })

    expect(highlights).toEqual([
      expect.objectContaining({
        label: '质量续航风险已清',
        color: 'gold',
        count: 2,
        chapterNos: [12, 13],
        issueTypes: ['next_chapter_quality_plan'],
      }),
    ])
    expect(highlights[0]?.detail).toContain('第12、13章')
    expect(highlights[0]?.detail).toContain('修复审计已闭环')
  })

  test('groups resolved scene-card execution directive repairs as scene-card closure evidence', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        issue_type: 'scene_card_1_forbidden_directives',
        task_status: 'resolved',
        chapter_no: 12,
        message: '场景1《蓝晶灼手》违反场景卡禁令：不得用整段来历/等级解释蓝晶。',
      },
    ], { status: 'closed' })

    expect(highlights).toEqual([
      expect.objectContaining({
        key: 'scene_card_directive',
        label: '场景卡执行风险已清',
        color: 'volcano',
        count: 1,
        chapterNos: [12],
        issueTypes: ['scene_card_1_forbidden_directives'],
      }),
    ])
    expect(highlights[0]?.detail).toContain('第12章')
    expect(highlights[0]?.detail).toContain('场景卡执行风险已处理')
  })

  test('groups resolved safe-batch expansion segment repairs as rollback evidence', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'safe_batch_expansion_segment_hotspot',
        task_status: 'resolved',
        chapter_no: 10,
      },
    ])

    expect(highlights).toEqual([
      expect.objectContaining({
        key: 'batch_expansion_segment',
        label: '扩批分段风险已清',
        count: 1,
        chapterNos: [10],
        issueTypes: ['safe_batch_expansion_segment_hotspot'],
      }),
    ])
  })

  test('groups resolved safe-batch expansion structure repairs as structure governance evidence', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'safe_batch_expansion_structure_repair',
        task_status: 'resolved',
        chapter_no: 15,
      },
    ])

    expect(highlights).toEqual([
      expect.objectContaining({
        key: 'batch_expansion_structure',
        label: '扩批结构风险已清',
        count: 1,
        chapterNos: [15],
        issueTypes: ['safe_batch_expansion_structure_repair'],
      }),
    ])
  })

  test('groups resolved recovery evidence repairs as closure evidence', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'recovery_evidence_mismatch',
        task_status: 'resolved',
        chapter_no: 41,
      },
    ], { status: 'closed' })

    expect(highlights).toEqual([
      expect.objectContaining({
        key: 'recovery_evidence',
        label: '恢复依据风险已清',
        count: 1,
        chapterNos: [41],
        issueTypes: ['recovery_evidence_mismatch'],
      }),
    ])
    expect(highlights[0]?.detail).toContain('恢复依据风险已处理')
    expect(highlights[0]?.detail).toContain('修复审计已闭环')
  })

  test('labels resolved repair receipt and revision guard risks by concrete closure category', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        chapter_no: 8,
      },
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'deslop_repair_receipt',
        annotation_category: 'deslop_repair_receipt',
        chapter_no: 8,
      },
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'revision_cascade_impact',
        annotation_category: 'revision_cascade_impact',
        chapter_no: 9,
      },
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'revision_scope_guard',
        annotation_category: 'revision_scope_guard',
        chapter_no: 9,
      },
    ])

    expect(highlights.map(item => item.label)).toEqual(expect.arrayContaining([
      '质量回执风险已清',
      '去AI味回执风险已清',
      '级联修订风险已清',
      '修订幅度风险已清',
    ]))
    expect(highlights).toHaveLength(4)
  })

  test('labels resolved prose revision sync and delivery receipt repairs by closure category', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'prose_revision_receipt',
        annotation_category: 'prose_revision_receipt',
        chapter_no: 12,
      },
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'prose_revision_receipt_sync',
        annotation_category: 'prose_revision_receipt_sync',
        chapter_no: 12,
      },
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'delivery_risk_receipts',
        annotation_category: 'delivery_risk_receipt',
        chapter_no: 12,
      },
    ], { status: 'closed' })

    expect(highlights).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'prose_revision_receipt',
        label: '修订回执风险已清',
        chapterNos: [12],
      }),
      expect.objectContaining({
        key: 'prose_revision_receipt_sync',
        label: '修订回执风险已清',
        chapterNos: [12],
      }),
      expect.objectContaining({
        key: 'delivery_risk_receipt',
        label: '交稿回执风险已清',
        chapterNos: [12],
      }),
    ]))
    expect(highlights.map(item => item.detail).join('\n')).toContain('修订回执风险已处理')
    expect(highlights.map(item => item.detail).join('\n')).toContain('交稿回执风险已处理')
  })

  test('ignores open repair tasks and non-risk maintenance tasks', () => {
    const highlights = buildRepairClosureHighlights([
      { issue_type: 'reader_pull_missed', task_status: 'needs_review', chapter_no: 9 },
      { task_type: 'repair_materials', task_status: 'resolved', chapter_no: 1 },
    ])

    expect(highlights).toEqual([])
  })
})
