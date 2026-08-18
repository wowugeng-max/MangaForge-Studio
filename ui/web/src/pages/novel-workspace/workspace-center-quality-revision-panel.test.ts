import { describe, expect, test } from 'bun:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ohStoryChapterTextHash } from './oh-story-chapter-text-hash'
import * as qualityPanelModule from './workspace-center-quality-revision-panel'
import { WorkspaceChapterHandoffStrip } from './workspace-center-chapter-handoff-strip'
import { WorkspaceDeliveryStatusStrip } from './workspace-center-delivery-status-strip'
import * as workspaceCenterModule from './WorkspaceCenter'

const {
  WorkspaceCenterQualityRevisionPanel,
  reportChapterId,
} = qualityPanelModule

function activeChapter(id: number) {
  return {
    id,
    chapter_no: id,
    title: `第${id}章`,
    chapter_text: `第${id}章正文`,
    updated_at: '2026-07-29T08:00:00.000Z',
  }
}

function qualityReport(chapterId: number) {
  return {
    id: chapterId * 10,
    status: 'success',
    created_at: '2026-07-29T08:00:00.000Z',
    payload: {
      chapter_id: chapterId,
      self_check: {
        final_text: `第${chapterId}章正文`,
        review: { score: 86, issues: [] },
      },
    },
  }
}

function revisionTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 71,
    run_type: 'editor_revision',
    status: 'running',
    phase: 'admit_candidate',
    phase_label: '不应直接信任的标签',
    progress: null,
    chapter_id: 7,
    chapter_no: 7,
    chapter_title: '第七章',
    prose_persisted: false,
    warnings: [],
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

function ohStoryReview(chapterId: number, reportText = '=== 故事审查报告（solo）===\n本章冲突成立。') {
  return {
    id: chapterId * 100,
    review_type: 'oh_story_review',
    status: 'success',
    created_at: '2026-08-14T12:44:33.000Z',
    payload: {
      chapter_id: chapterId,
      chapter_no: chapterId,
      report_text: reportText,
    },
  }
}

function renderPanel(
  chapterId: number,
  task: Record<string, unknown> | null,
  extra: Record<string, unknown> = {},
) {
  return renderToStaticMarkup(React.createElement(WorkspaceCenterQualityRevisionPanel as any, {
    activeChapter: activeChapter(chapterId),
    proseQualityReports: [qualityReport(chapterId)],
    editorRevisionTask: task,
    onRefreshProseQuality: () => {},
    onApplyEditorRevision: () => {},
    onCancelEditorRevision: () => {},
    onRetryEditorRevision: () => {},
    onLoadEditorRevisionDiagnostics: () => Promise.resolve({}),
    ...extra,
  }))
}

function renderWorkspaceCenter(chapterId: number, task: Record<string, unknown> | null) {
  const noop = () => {}
  return renderToStaticMarkup(React.createElement(workspaceCenterModule.WorkspaceCenter as any, {
    isEmptyProject: false,
    selectedProject: { id: 1, title: '测试项目' },
    activeChapter: activeChapter(chapterId),
    materialScore: { score: 100, can_generate: true, recommendations: [] },
    worldbuildingCount: 1,
    characterCount: 1,
    outlineCount: 1,
    streamingChapterId: null,
    streamingText: '',
    streamingProgress: '',
    streamingPercent: 0,
    generationPipeline: [],
    streamingEndRef: React.createRef(),
    proseEditorRef: { current: null },
    saveStatus: 'saved',
    planning: false,
    incubatingOriginal: false,
    generatingProse: false,
    generatingSceneCards: false,
    preDraftBriefLoading: false,
    styleSampleActionLoading: false,
    diagnosticsLoading: false,
    pipelineLoading: false,
    editorReportLoading: false,
    onRunPlan: noop,
    onCreateOutline: noop,
    onCreateChapter: noop,
    onRunOriginalIncubator: noop,
    onOpenReferenceConfig: noop,
    onOpenWritingBibleEditor: noop,
    onGenerateCurrentChapterProse: noop,
    onRepairAndGenerateCurrentChapter: noop,
    onGenerateSceneCards: noop,
    onOpenGenerationDiagnostics: noop,
    onOpenQualityCard: noop,
    onStartChapterPipeline: noop,
    onCreateEditorReport: noop,
    onEditActiveChapter: noop,
    onOpenStoryAssets: noop,
    onChapterTextChange: noop,
    chapterAcceptanceDesk: {
      acceptanceStatus: 'needs_revision',
      qualityScore: 70,
      storyStateSynced: false,
    },
    deliveryActionLoading: false,
    onDeliveryAction: noop,
    proseQualityReports: [qualityReport(chapterId)],
    editorRevisionTask: task,
    onApplyEditorRevision: noop,
    onCancelEditorRevision: noop,
    onRetryEditorRevision: noop,
    onLoadEditorRevisionDiagnostics: () => Promise.resolve({}),
    isImmersiveShell: true,
  }))
}

function buttonMarkup(html: string, label: string) {
  return Array.from(html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g))
    .map(match => match[0])
    .find(button => button.includes(label)) || ''
}

function revisionActionDisabled(revisionActive: boolean) {
  return (key: string) => revisionActive && key === 'apply_editor_revision'
}

function collectPropsByClass(node: React.ReactNode, className: string, result: any[] = []) {
  if (Array.isArray(node)) {
    node.forEach(child => collectPropsByClass(child, className, result))
    return result
  }
  if (!React.isValidElement(node)) return result
  const props = node.props as Record<string, any>
  if (String(props.className || '').split(/\s+/).includes(className)) result.push(props)
  collectPropsByClass(props.children, className, result)
  return result
}

function deliveryStatusActionProps(actionKey: string, revisionActive: boolean) {
  const actionLabel = actionKey === 'apply_editor_revision' ? '一键修订' : '同步故事状态'
  const tree = WorkspaceDeliveryStatusStrip({
    deliveryActionLoading: false,
    deliveryNeedsStorySync: true,
    deliveryNextStepText: '继续完成当前章交稿闭环。',
    deliveryQualityDetail: '质量待处理。',
    deliveryQualityPending: true,
    deliveryStoryDetail: '故事状态待同步。',
    deliverySummary: {
      visible: true,
      tone: 'revision',
      statusLabel: '待修订',
      qualityLabel: '质量 70',
      storyStateLabel: '故事状态待同步',
      actionKey,
      actionLabel,
      compactActionLabel: actionKey === 'apply_editor_revision' ? '修订' : '同步',
      storyStateSyncAction: actionKey === 'apply_editor_revision'
        ? { key: 'sync_story_state', label: '立即同步故事状态' }
        : null,
    },
    revisionActionDisabled: revisionActionDisabled(revisionActive),
    onDeliveryAction: () => {},
  })
  return collectPropsByClass(tree, 'novel-delivery-status-action')
}

function chapterHandoffActionProps(actionKey: string, revisionActive: boolean) {
  const actionLabel = actionKey === 'apply_editor_revision' ? '修订本章' : '同步交接状态'
  const tree = WorkspaceChapterHandoffStrip({
    chapterHandoffDesk: {
      visible: true,
      status: 'blocked',
      label: '待处理',
      fromChapterNo: 7,
      toChapterNo: 8,
      storyStateSynced: false,
      actionKey,
      actionLabel,
    },
    deliveryActionLoading: false,
    revisionActionDisabled: revisionActionDisabled(revisionActive),
    onDeliveryAction: () => {},
  })
  return collectPropsByClass(tree, 'novel-chapter-handoff-action')[0]
}

describe('reportChapterId', () => {
  test('reads chapter id from normal quality report payloads', () => {
    expect(reportChapterId({ payload: { chapter_id: 7 } })).toBe(7)
    expect(reportChapterId({ payload: JSON.stringify({ context_package: { chapter_target: { id: 9 } } }) })).toBe(9)
    expect(reportChapterId({ chapter_id: 61, payload: {} })).toBe(61)
  })

  test('falls back to the truncated preview chapter target for legacy compacted reports', () => {
    const payload = {
      truncated: true,
      preview: '{"chapter_id": 123, "chapter_no": 12, "chapter_title": "旧章", "self_check"',
    }
    expect(reportChapterId({ payload })).toBe(123)
  })
})

describe('current chapter editor revision status', () => {
  test('shows indeterminate current phase and cancel while disabling only the matching chapter revision', () => {
    const html = renderPanel(7, revisionTask())

    expect(html).toContain('novel-editor-revision-status-strip')
    expect(html).toContain('安全检查')
    expect(html).toContain('ant-spin')
    expect(html).toContain('运行中')
    expect(html).not.toContain('ant-progress')
    expect(html).toContain('取消修订')
    expect(html).not.toContain('按报告修订')
  })

  test('does not lock revision when the active chapter no longer matches the task', () => {
    const html = renderPanel(8, revisionTask())

    expect(html).not.toContain('novel-editor-revision-status-strip')
    expect(html).not.toContain('取消修订')
  })

  test('keeps the cancel-requested status label visible beside the spinner', () => {
    const html = renderPanel(7, revisionTask({
      status: 'cancel_requested',
      can_cancel: false,
    }))

    expect(html).toContain('ant-spin')
    expect(html).toContain('取消中')
  })

  test('locks the header revision action for the matching active task while keeping other chapters usable', () => {
    const matchingHtml = renderWorkspaceCenter(7, revisionTask())
    const otherChapterHtml = renderWorkspaceCenter(8, revisionTask())

    expect(matchingHtml).not.toContain('一键修订')
    expect(otherChapterHtml).not.toContain('一键修订')
    expect(buttonMarkup(matchingHtml, '同步故事状态')).toBeTruthy()
    expect(buttonMarkup(otherChapterHtml, '同步故事状态')).toBeTruthy()
  })

  test('routes the header revision action through the shared delivery guard', async () => {
    const source = await Bun.file(new URL('./WorkspaceCenter.tsx', import.meta.url)).text()

    expect(source).toContain('guardedDeliveryAction(key as NovelDeliveryActionKey)')
  })

  test('blocks only active same-chapter revision delivery through the shared dispatcher', () => {
    const dispatch = Reflect.get(workspaceCenterModule, 'dispatchWorkspaceDeliveryAction')
    expect(typeof dispatch).toBe('function')
    if (typeof dispatch !== 'function') return

    const calls: string[] = []
    const onDeliveryAction = (key: string) => calls.push(key)

    expect(dispatch('apply_editor_revision', true, onDeliveryAction)).toBe(false)
    expect(dispatch('sync_story_state', true, onDeliveryAction)).toBe(true)
    expect(dispatch('apply_editor_revision', false, onDeliveryAction)).toBe(true)
    expect(calls).toEqual(['sync_story_state', 'apply_editor_revision'])
  })

  test('routes writing support and queue revision actions through the shared delivery guard', async () => {
    const source = await Bun.file(new URL('./WorkspaceCenter.tsx', import.meta.url)).text()

    expect(source).toContain('dispatchWorkspaceDeliveryAction(key, revisionActive, onDeliveryAction)')
    expect(source).toContain('guardedDeliveryAction(deliverySummary.actionKey)')
    expect(source).toContain('onDeliveryAction={guardedDeliveryAction}')
    expect(source).not.toContain('onDeliveryAction={onDeliveryAction}')
  })

  test('explicitly disables only the active revision action in delivery status', () => {
    const activeActions = deliveryStatusActionProps('apply_editor_revision', true)
    const inactiveActions = deliveryStatusActionProps('apply_editor_revision', false)
    const syncActions = deliveryStatusActionProps('sync_story_state', true)

    expect(activeActions[0]?.disabled).toBe(true)
    expect(Boolean(activeActions[1]?.disabled)).toBe(false)
    expect(Boolean(inactiveActions[0]?.disabled)).toBe(false)
    expect(Boolean(syncActions[0]?.disabled)).toBe(false)
  })

  test('explicitly disables only the active revision action in chapter handoff', () => {
    const activeAction = chapterHandoffActionProps('apply_editor_revision', true)
    const inactiveAction = chapterHandoffActionProps('apply_editor_revision', false)
    const syncAction = chapterHandoffActionProps('sync_story_state', true)

    expect(activeAction?.disabled).toBe(true)
    expect(Boolean(inactiveAction?.disabled)).toBe(false)
    expect(Boolean(syncAction?.disabled)).toBe(false)
  })

  test('passes the revision disabled predicate through writing support to both strips', async () => {
    const workspaceSource = await Bun.file(new URL('./WorkspaceCenter.tsx', import.meta.url)).text()
    const supportSource = await Bun.file(new URL('./workspace-center-writing-support.tsx', import.meta.url)).text()

    expect(workspaceSource).toContain('revisionActionDisabled={revisionActionDisabled}')
    expect(supportSource.match(/revisionActionDisabled=\{revisionActionDisabled\}/g)?.length).toBe(2)
  })

  test('prevents duplicate per-run revision actions and releases pending state', async () => {
    const runAction = Reflect.get(qualityPanelModule, 'runEditorRevisionTaskAction')
    expect(typeof runAction).toBe('function')
    if (typeof runAction !== 'function') return

    const inFlightRunIds = new Set<number>()
    const pending: any[] = []
    const errors: unknown[] = []
    let calls = 0
    let release: (() => void) | undefined
    const action = () => {
      calls += 1
      return new Promise<void>(resolve => { release = resolve })
    }
    const input = {
      runId: 71,
      actionKey: 'retry',
      action,
      inFlightRunIds,
      setPendingAction: (value: unknown) => pending.push(value),
      onError: (error: unknown) => errors.push(error),
    }

    const first = runAction(input)
    expect(inFlightRunIds.has(71)).toBe(true)
    expect(await runAction(input)).toBe(false)
    expect(calls).toBe(1)

    release?.()
    expect(await first).toBe(true)
    expect(inFlightRunIds.size).toBe(0)
    expect(pending[0]).toEqual({ runId: 71, actionKey: 'retry' })
    expect(pending.at(-1)).toBeNull()
    expect(errors).toEqual([])
  })

  test('captures synchronous throws and rejected revision action promises', async () => {
    const runAction = Reflect.get(qualityPanelModule, 'runEditorRevisionTaskAction')
    expect(typeof runAction).toBe('function')
    if (typeof runAction !== 'function') return

    const errors: string[] = []
    const runFailure = (runId: number, action: () => unknown) => runAction({
      runId,
      actionKey: 'cancel',
      action,
      inFlightRunIds: new Set<number>(),
      setPendingAction: () => {},
      onError: (error: any) => errors.push(String(error?.message || error)),
    })

    expect(await runFailure(72, () => { throw new Error('同步失败') })).toBe(false)
    expect(await runFailure(73, () => Promise.reject(new Error('异步失败')))).toBe(false)
    expect(errors).toEqual(['同步失败', '异步失败'])
  })

  test('shows pending state on cancel retry and continue buttons', async () => {
    const source = await Bun.file(new URL('./workspace-center-quality-revision-panel.tsx', import.meta.url)).text()

    expect(source.match(/disabled=\{pendingForTask\}/g)?.length).toBe(3)
    expect(source).toContain("loading={pendingActionKey === 'cancel'}")
    expect(source).toContain("loading={pendingActionKey === 'retry'}")
    expect(source).toContain("loading={pendingActionKey === 'continue'}")
    expect(source).toContain('runEditorRevisionTaskAction({')
  })

  test('offers retry only for a failed revision before prose commit', () => {
    const html = renderPanel(7, revisionTask({
      status: 'failed',
      phase: 'generate_candidate',
      can_cancel: false,
      can_retry: true,
      error: { code: 'REVISION_FAILED', message: '候选生成失败' },
    }))

    expect(html.replace(/重\s+试/g, '重试')).toContain('重试')
    expect(html).not.toContain('继续后处理')
  })

  test('offers continue only for failed or canceled revisions after prose commit', () => {
    for (const status of ['failed', 'canceled']) {
      const html = renderPanel(7, revisionTask({
        status,
        phase: 'sync_current_story_state',
        prose_persisted: true,
        can_cancel: false,
        can_continue: true,
        error: { code: 'POST_PROCESSING_FAILED', message: '后处理未完成' },
      }))

      expect(html).toContain('继续后处理')
      expect(buttonMarkup(html, '重试')).toBe('')
    }
  })

  test('derives the current task in the ready runtime instead of copying it into component state', async () => {
    const source = await Bun.file(new URL('./shell/build-novel-workspace-ready-runtime.tsx', import.meta.url)).text()

    expect(source).toContain('editorRevisionForChapter(editorRevisionTasks, Number(activeChapterId || 0))')
    expect(source).not.toContain('useState(editorRevisionForChapter')
  })
})

describe('oh-story quality panel actions', () => {
  test('shows review and deslop actions without the old quality-score caption', () => {
    const html = renderPanel(7, null)

    expect(html).toContain('oh-story 审稿')
    expect(html).toContain('按建议改稿')
    expect(html).toContain('oh-story 去AI')
    expect(html).not.toContain('参考，不自动改稿')
    expect(html).not.toContain('一键修订')
    expect(html).not.toContain('按报告修订')
    expect(html).not.toContain('立即质检')
    expect(html).not.toContain('复检当前版本')
    expect(html).not.toContain('重新质检')
    expect(html).not.toContain('生成编辑报告')
    expect(html).not.toContain('补动作')
    expect(html).not.toContain('一键补材料')
    expect(html).not.toContain('先点「立即质检」')
  })

  test('ignores MangaForge prose_quality scores and issues', () => {
    const html = renderPanel(7, null, {
      proseQualityReports: [qualityReport(7)],
    })

    expect(html).not.toContain('86分')
    expect(html).not.toContain('尚未质检')
    expect(html).not.toContain('质检问题')
    expect(html).not.toContain('还没有参考分')
    expect(html).toContain('尚未审稿')
    expect(html).toContain('还没有 oh-story 审稿')
  })

  test('renders the latest oh-story review report for the current chapter', () => {
    const html = renderPanel(7, null, {
      ohStoryReviews: [
        ohStoryReview(8, '=== 故事审查报告（solo）===\n别章报告。'),
        ohStoryReview(7, '=== 故事审查报告（solo）===\n本章冲突成立。'),
      ],
    })

    expect(html).toContain('正文已改')
    expect(html).toContain('=== 故事审查报告（solo）===')
    expect(html).toContain('本章冲突成立。')
    expect(html).not.toContain('别章报告。')
    expect(html).not.toContain('86分')
    expect(html).not.toContain('质检问题')
  })

  test('shows a loading hint when the oh-story review exists but report_text is not hydrated yet', () => {
    const html = renderPanel(7, null, {
      ohStoryReviews: [{
        id: 700,
        review_type: 'oh_story_review',
        chapter_id: 7,
        created_at: '2026-08-14T12:44:33.000Z',
        payload_bytes: 8000,
      }],
    })

    expect(html).toContain('审稿加载中')
    expect(html).toContain('正在加载审稿全文')
    expect(html).not.toContain('正文已改')
    expect(html).not.toContain('再跑一次')
  })

  test('shows apply action and hash-based review status', () => {
    const text = '第7章正文'
    const html = renderPanel(7, null, {
      ohStoryReviews: [{
        id: 700,
        review_type: 'oh_story_review',
        created_at: '2026-08-14T12:44:33.000Z',
        payload: {
          chapter_id: 7,
          report_text: '=== 故事审查报告（solo）===\n本章冲突成立。',
          chapter_text_hash: ohStoryChapterTextHash(text),
        },
      }],
    })
    expect(html).toContain('按建议改稿')
    expect(html).toContain('已审稿')
    expect(html).not.toContain('正文已改')
    expect(html).not.toContain('一键修订')
  })

  test('ohStoryBusySummary follows the confirmed C labels', () => {
    expect(qualityPanelModule.ohStoryBusySummary('review', 12)).toBe('审稿中 · 12s')
    expect(qualityPanelModule.ohStoryBusySummary('apply', 3)).toBe('改稿中 · 3s')
    expect(qualityPanelModule.ohStoryBusySummary('deslop', 0)).toBe('去AI中 · 0s')
  })

  test('spins the running oh-story button, disables the others, and shows elapsed time', () => {
    const html = renderPanel(7, null, { ohStoryAction: 'deslop', ohStoryElapsedSec: 12 })

    expect(html).toContain('去AI中 · 12s')
    expect(buttonMarkup(html, 'oh-story 去AI')).toContain('ant-btn-loading')
    expect(buttonMarkup(html, 'oh-story 审稿')).toContain('disabled=""')
    expect(buttonMarkup(html, '按建议改稿')).toContain('disabled=""')
    expect(buttonMarkup(html, 'oh-story 去AI')).not.toContain('disabled=""')
  })

  test('shows a cancel control while a kernel job is running', () => {
    const html = renderPanel(7, null, { ohStoryAction: 'review', ohStoryElapsedSec: 5, onCancelKernelJob: () => {} })
    expect(html).toContain('取消')
  })

  test('lists same-verb kernel contracts for compete', () => {
    const html = renderPanel(7, null, {
      kernelContracts: [
        { id: 'oh-story-core.story-review.full', label: '完整审稿', verb: 'review_chapter', implemented: true },
        { id: 'user.review.fast', label: '假审稿', verb: 'review_chapter', implemented: true },
        { id: 'oh-story-core.story-deslop.file', label: '去AI', verb: 'deslop_chapter', implemented: true },
        { id: 'pending.review', label: '未实现', verb: 'review_chapter', implemented: false },
      ],
      kernelSelectedContractIds: ['oh-story-core.story-review.full'],
    })
    expect(html).toContain('完整审稿')
    expect(html).toContain('假审稿')
    expect(html).not.toContain('oh-story-core.story-deslop.file')
  })

  test('marks a hashless or mismatched review as 正文已改', () => {
    const html = renderPanel(7, null, {
      ohStoryReviews: [ohStoryReview(7)],
    })
    expect(html).toContain('正文已改')
    expect(html).not.toContain('>已审稿<')
  })

  test('workspace apply action starts a kernel job instead of blocking oh-story HTTP', async () => {
    const handlers = await Bun.file(new URL('./shell/workspace-repair-task-handlers.tsx', import.meta.url)).text()
    const starter = await Bun.file(new URL('./shell/start-chapter-kernel-job.ts', import.meta.url)).text()
    expect(handlers).toContain("runOhStoryCoreAction('apply')")
    expect(handlers).not.toContain('/novel/oh-story/core/${action}')
    expect(handlers).toContain('startChapterKernelJob')
    expect(starter).toContain('SAVE_FAILED')
    expect(starter).toContain('先对本稿重新审稿')
  })

  test('stops wiring old quality and revision launches in the writing shell', async () => {
    const body = await Bun.file(new URL('./shell/workspace-body.tsx', import.meta.url)).text()
    const controls = await Bun.file(new URL('./workspace-center-editor-controls.tsx', import.meta.url)).text()
    expect(body).not.toContain('onRefreshProseQuality=')
    expect(body).not.toContain('onApplyEditorRevision=')
    expect(controls).not.toContain('写后复检')
    expect(controls).not.toContain('交稿质检')
    expect(controls).not.toContain('编辑报告')
  })
})
