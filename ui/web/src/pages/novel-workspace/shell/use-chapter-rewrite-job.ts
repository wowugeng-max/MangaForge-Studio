import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { message } from 'antd'
import { axiosKernelRequest, createKernelJobApi } from '../../../kernel/jobs/client'
import { kernelJobUserMessage } from '../../../kernel/jobs/messages'
import { pollKernelJob } from '../../../kernel/jobs/poll'
import type { KernelJobDetail } from '../../../kernel/jobs/types'
import { writeChapterLengthTarget } from '../../../kernel/jobs/write-brief'

export type ChapterRewriteJobState =
  | { phase: 'idle' }
  | { phase: 'running'; jobId: string; hint: string; elapsedSec: number }
  | { phase: 'awaiting_selection'; jobId: string; candidateId: string; preview: string; truncated: boolean; chapterId: number }
  | { phase: 'failed'; jobId: string | null; errorCode: string }

export type RewriteChapterJobClient = Pick<
  ReturnType<typeof createKernelJobApi>,
  'createJobByVerb' | 'getJob' | 'cancelJob' | 'commitJob' | 'getArtifactContent'
>

export type RunRewriteChapterJobResult =
  | { kind: 'aborted' }
  | { kind: 'save_failed' }
  | { kind: 'create_failed'; code: string }
  | { kind: 'committed' }
  | { kind: 'cancelled' }
  | { kind: 'failed'; jobId: string; errorCode: string; toast: boolean }
  | { kind: 'awaiting_selection'; jobId: string; candidateId: string; preview: string; truncated: boolean; chapterId: number }

export type ChapterRewriteSelection = {
  chapterId: number
  preview: string
  truncated: boolean
  onCommit: () => void | Promise<void>
  onCancel: () => void | Promise<void>
}

export function beginRewriteStart(occupancy: { current: boolean }): boolean {
  if (occupancy.current) return false
  occupancy.current = true
  return true
}

export function settleRewriteStart(occupancy: { current: boolean }, kind: RunRewriteChapterJobResult['kind']): void {
  occupancy.current = kind === 'awaiting_selection'
}

export function shouldShowRewriteSelection(
  activeChapterId: number | string | null | undefined,
  rewriteSelection: Pick<ChapterRewriteSelection, 'chapterId'> | null | undefined,
): boolean {
  if (!rewriteSelection) return false
  const activeId = Number(activeChapterId || 0)
  return Boolean(activeId) && activeId === Number(rewriteSelection.chapterId)
}

async function cancelCreatedRewriteJob(
  cancelJob: RewriteChapterJobClient['cancelJob'],
  jobIdRef: { current: string },
  jobId?: string,
) {
  const id = String(jobId || jobIdRef.current || '')
  if (id && jobIdRef.current === id) jobIdRef.current = ''
  if (id) await cancelJob(id)
}

export async function cancelRewriteChapterJob(input: {
  abort: () => void
  cancelJob: RewriteChapterJobClient['cancelJob']
  jobIdRef: { current: string }
  stateJobId?: string
}): Promise<void> {
  const jobId = String(input.jobIdRef.current || input.stateJobId || '')
  input.abort()
  if (jobId) await input.cancelJob(jobId)
  input.jobIdRef.current = ''
}

export function reduceChapterRewriteProgress(prev: ChapterRewriteJobState, detail: KernelJobDetail): ChapterRewriteJobState {
  const jobId = String(detail.job?.id || (prev.phase === 'idle' ? '' : prev.jobId) || '')
  const elapsedSec = Math.round(Number(detail.progress?.elapsed_ms || 0) / 1000)
  const hint = String(detail.progress?.hint || '')
  const status = String(detail.job?.status || '')
  if (status === 'committed' || status === 'cancelled') return { phase: 'idle' }
  if (status === 'failed') {
    return { phase: 'failed', jobId, errorCode: String(detail.job?.error_code || 'ENGINE_FAILED') }
  }
  if (status === 'awaiting_selection') {
    if (prev.phase === 'awaiting_selection' && prev.jobId === jobId) return prev
    return { phase: 'running', jobId, hint: hint || 'awaiting_selection', elapsedSec }
  }
  return { phase: 'running', jobId, hint, elapsedSec }
}

export function pickRewriteChapterPreview(detail: KernelJobDetail): { candidateId: string; artifactId: string } | null {
  const candidate = (detail.candidates || []).find(c => c.status === 'succeeded')
  if (!candidate) return null
  const artifact = (detail.artifacts || []).find(a => a.candidate_id === candidate.id && a.artifact_kind === 'chapter_text')
  if (!artifact?.id) return null
  return { candidateId: candidate.id, artifactId: artifact.id }
}

export async function runRewriteChapterJob(input: {
  api: RewriteChapterJobClient
  projectId: number
  chapterId: number
  modelId: number
  userBrief?: { length_target: string }
  flushPendingSave: () => Promise<boolean>
  loadProjectModules: () => Promise<void>
  signal: AbortSignal
  jobIdRef: { current: string }
  onProgress?: (detail: KernelJobDetail) => void
  onCreated?: (jobId: string) => void
  pollJob?: typeof pollKernelJob
}): Promise<RunRewriteChapterJobResult> {
  const saved = await input.flushPendingSave()
  if (input.signal.aborted) return { kind: 'aborted' }
  if (!saved) return { kind: 'save_failed' }

  const created = await input.api.createJobByVerb({
    projectId: input.projectId,
    chapterId: input.chapterId,
    modelId: input.modelId,
    verb: 'rewrite_chapter',
    userBrief: input.userBrief,
  })
  if (created.ok) input.jobIdRef.current = created.jobId
  if (input.signal.aborted) {
    if (created.ok) await cancelCreatedRewriteJob(input.api.cancelJob, input.jobIdRef, created.jobId)
    return { kind: 'aborted' }
  }
  if (!created.ok) return { kind: 'create_failed', code: created.code }

  input.onCreated?.(created.jobId)
  const pollJob = input.pollJob || pollKernelJob
  try {
    const terminal = await pollJob({
      jobId: created.jobId,
      getJob: input.api.getJob,
      signal: input.signal,
      onProgress: input.onProgress,
    })
    if (input.signal.aborted) {
      if (terminal.job.status === 'committed') {
        input.jobIdRef.current = ''
        return { kind: 'aborted' }
      }
      await cancelCreatedRewriteJob(input.api.cancelJob, input.jobIdRef, created.jobId)
      return { kind: 'aborted' }
    }
    if (terminal.job.status === 'awaiting_selection') {
      const picked = pickRewriteChapterPreview(terminal)
      if (!picked) {
        await cancelCreatedRewriteJob(input.api.cancelJob, input.jobIdRef, created.jobId)
        return { kind: 'failed', jobId: created.jobId, errorCode: 'ENGINE_FAILED', toast: true }
      }
      const content = await input.api.getArtifactContent(picked.artifactId)
      if (input.signal.aborted) {
        await cancelCreatedRewriteJob(input.api.cancelJob, input.jobIdRef, created.jobId)
        return { kind: 'aborted' }
      }
      if (!content.ok) {
        await cancelCreatedRewriteJob(input.api.cancelJob, input.jobIdRef, created.jobId)
        return { kind: 'failed', jobId: created.jobId, errorCode: String(content.code || 'ENGINE_FAILED'), toast: true }
      }
      return {
        kind: 'awaiting_selection',
        jobId: created.jobId,
        candidateId: picked.candidateId,
        preview: content.content,
        truncated: content.truncated,
        chapterId: input.chapterId,
      }
    }
    if (terminal.job.status === 'committed') {
      if (input.signal.aborted) return { kind: 'aborted' }
      await input.loadProjectModules()
      if (input.signal.aborted) return { kind: 'aborted' }
      input.jobIdRef.current = ''
      return { kind: 'committed' }
    }
    if (terminal.job.status === 'cancelled') {
      input.jobIdRef.current = ''
      return { kind: 'cancelled' }
    }
    if (terminal.job.status === 'failed') {
      const errorCode = String(terminal.job.error_code || 'ENGINE_FAILED')
      input.jobIdRef.current = ''
      return { kind: 'failed', jobId: created.jobId, errorCode, toast: true }
    }
    input.jobIdRef.current = ''
    return { kind: 'failed', jobId: created.jobId, errorCode: 'ENGINE_FAILED', toast: false }
  } catch (error: any) {
    if (error?.name === 'AbortError' || input.signal.aborted) {
      await cancelCreatedRewriteJob(input.api.cancelJob, input.jobIdRef, created.jobId)
      return { kind: 'aborted' }
    }
    input.jobIdRef.current = ''
    return { kind: 'failed', jobId: created.jobId, errorCode: 'ENGINE_FAILED', toast: false }
  }
}

function toastCode(code: string) {
  const mapped = kernelJobUserMessage(code)
  if (!mapped) return
  if (mapped.kind === 'warning') message.warning(mapped.text)
  else if (mapped.kind === 'info') message.info(mapped.text)
  else message.error(mapped.text)
}

export function useChapterRewriteJob(deps: {
  api?: ReturnType<typeof createKernelJobApi>
  apiClient?: { request: Function }
  projectId: number
  modelId: number
  flushPendingSave: () => Promise<boolean>
  loadProjectModules: () => Promise<void>
  chapterWordTargetPayload?: () => { word_target_mode?: string; target_word_count?: number }
}) {
  const api = useMemo(
    () => deps.api || createKernelJobApi(axiosKernelRequest(deps.apiClient || { request: async () => ({ status: 0, data: {} }) })),
    [deps.api, deps.apiClient],
  )
  const [state, setState] = useState<ChapterRewriteJobState>({ phase: 'idle' })
  const abortRef = useRef<AbortController | null>(null)
  const jobIdRef = useRef('')
  const runningRef = useRef(false)

  useEffect(() => () => {
    void cancelRewriteChapterJob({
      abort: () => abortRef.current?.abort(),
      cancelJob: api.cancelJob,
      jobIdRef,
    })
  }, [api])

  const start = useCallback(async (chapterId: number) => {
    if (!beginRewriteStart(runningRef)) return
    if (!chapterId) {
      settleRewriteStart(runningRef, 'aborted')
      message.warning('请先选择章节')
      return
    }
    if (!deps.projectId) {
      settleRewriteStart(runningRef, 'aborted')
      message.warning('请先选择项目')
      return
    }
    if (!deps.modelId) {
      settleRewriteStart(runningRef, 'aborted')
      message.warning('请先选择模型')
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    jobIdRef.current = ''
    const length = writeChapterLengthTarget(deps.chapterWordTargetPayload?.() || {})
    setState({ phase: 'running', jobId: '', hint: 'queued', elapsedSec: 0 })
    const result = await runRewriteChapterJob({
      api,
      projectId: deps.projectId,
      chapterId,
      modelId: deps.modelId,
      userBrief: length ? { length_target: length } : undefined,
      flushPendingSave: deps.flushPendingSave,
      loadProjectModules: deps.loadProjectModules,
      signal: controller.signal,
      jobIdRef,
      onCreated: (jobId) => {
        setState({ phase: 'running', jobId, hint: 'queued', elapsedSec: 0 })
      },
      onProgress: (detail) => {
        setState(prev => reduceChapterRewriteProgress(
          prev.phase === 'idle'
            ? { phase: 'running', jobId: jobIdRef.current, hint: '', elapsedSec: 0 }
            : prev,
          detail,
        ))
      },
    })
    settleRewriteStart(runningRef, result.kind)
    if (result.kind === 'aborted') return
    if (result.kind === 'save_failed') {
      setState({ phase: 'idle' })
      return
    }
    if (result.kind === 'create_failed') {
      toastCode(result.code)
      setState({ phase: 'failed', jobId: null, errorCode: result.code })
      return
    }
    if (result.kind === 'awaiting_selection') {
      setState({
        phase: 'awaiting_selection',
        jobId: result.jobId,
        candidateId: result.candidateId,
        preview: result.preview,
        truncated: result.truncated,
        chapterId: result.chapterId,
      })
      return
    }
    if (result.kind === 'committed') {
      message.success('本章回炉已写入')
      setState({ phase: 'idle' })
      return
    }
    if (result.kind === 'cancelled') {
      toastCode('CANCELLED')
      setState({ phase: 'idle' })
      return
    }
    if (result.toast) toastCode(result.errorCode)
    setState({ phase: 'failed', jobId: result.jobId, errorCode: result.errorCode })
  }, [api, deps])

  const cancel = useCallback(async () => {
    settleRewriteStart(runningRef, 'cancelled')
    await cancelRewriteChapterJob({
      abort: () => abortRef.current?.abort(),
      cancelJob: api.cancelJob,
      jobIdRef,
      stateJobId: state.phase === 'running' || state.phase === 'awaiting_selection' ? state.jobId : '',
    })
    setState({ phase: 'idle' })
  }, [api, state])

  const commit = useCallback(async () => {
    if (state.phase !== 'awaiting_selection') return
    const committed = await api.commitJob(state.jobId, state.candidateId)
    if (!committed.ok) {
      toastCode(committed.code)
      return
    }
    await deps.loadProjectModules()
    message.success('本章回炉已写入')
    jobIdRef.current = ''
    settleRewriteStart(runningRef, 'committed')
    setState({ phase: 'idle' })
  }, [api, deps, state])

  return {
    state,
    start,
    cancel,
    commit,
  }
}
