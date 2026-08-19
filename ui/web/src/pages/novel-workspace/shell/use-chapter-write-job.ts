import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { message } from 'antd'
import { axiosKernelRequest, createKernelJobApi } from '../../../kernel/jobs/client'
import { kernelJobUserMessage } from '../../../kernel/jobs/messages'
import { pollKernelJob } from '../../../kernel/jobs/poll'
import type { KernelJobDetail } from '../../../kernel/jobs/types'
import { writeChapterLengthTarget } from '../../../kernel/jobs/write-brief'

export type ChapterWriteJobState =
  | { phase: 'idle' }
  | { phase: 'running'; jobId: string; hint: string; elapsedSec: number }
  | { phase: 'failed'; jobId: string | null; errorCode: string }

export type WriteChapterJobClient = Pick<
  ReturnType<typeof createKernelJobApi>,
  'createJobByVerb' | 'getJob' | 'cancelJob'
>

export type RunWriteChapterJobResult =
  | { kind: 'aborted' }
  | { kind: 'save_failed' }
  | { kind: 'create_failed'; code: string }
  | { kind: 'committed' }
  | { kind: 'cancelled' }
  | { kind: 'failed'; jobId: string; errorCode: string; toast: boolean }

async function cancelCreatedWriteJob(
  cancelJob: WriteChapterJobClient['cancelJob'],
  jobIdRef: { current: string },
  jobId?: string,
) {
  const id = String(jobId || jobIdRef.current || '')
  if (id && jobIdRef.current === id) jobIdRef.current = ''
  if (id) await cancelJob(id)
}

export async function cancelWriteChapterJob(input: {
  abort: () => void
  cancelJob: WriteChapterJobClient['cancelJob']
  jobIdRef: { current: string }
  stateJobId?: string
}): Promise<void> {
  const jobId = String(input.jobIdRef.current || input.stateJobId || '')
  input.abort()
  if (jobId) await input.cancelJob(jobId)
  input.jobIdRef.current = ''
}

export async function runWriteChapterJob(input: {
  api: WriteChapterJobClient
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
}): Promise<RunWriteChapterJobResult> {
  const saved = await input.flushPendingSave()
  if (input.signal.aborted) return { kind: 'aborted' }
  if (!saved) return { kind: 'save_failed' }

  const created = await input.api.createJobByVerb({
    projectId: input.projectId,
    chapterId: input.chapterId,
    modelId: input.modelId,
    verb: 'write_chapter',
    userBrief: input.userBrief,
  })
  if (created.ok) input.jobIdRef.current = created.jobId
  if (input.signal.aborted) {
    if (created.ok) await cancelCreatedWriteJob(input.api.cancelJob, input.jobIdRef, created.jobId)
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
      await cancelCreatedWriteJob(input.api.cancelJob, input.jobIdRef, created.jobId)
      return { kind: 'aborted' }
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
    if (terminal.job.status === 'failed' || terminal.job.status === 'awaiting_selection') {
      const errorCode = String(terminal.job.error_code || (terminal.job.status === 'awaiting_selection' ? 'AWAITING_SELECTION' : 'ENGINE_FAILED'))
      input.jobIdRef.current = ''
      return { kind: 'failed', jobId: created.jobId, errorCode, toast: true }
    }
    input.jobIdRef.current = ''
    return { kind: 'failed', jobId: created.jobId, errorCode: 'ENGINE_FAILED', toast: false }
  } catch (error: any) {
    if (error?.name === 'AbortError' || input.signal.aborted) {
      await cancelCreatedWriteJob(input.api.cancelJob, input.jobIdRef, created.jobId)
      return { kind: 'aborted' }
    }
    input.jobIdRef.current = ''
    return { kind: 'failed', jobId: created.jobId, errorCode: 'ENGINE_FAILED', toast: false }
  }
}

export function reduceChapterWriteProgress(prev: ChapterWriteJobState, detail: KernelJobDetail): ChapterWriteJobState {
  const jobId = String(detail.job?.id || (prev.phase === 'idle' ? '' : prev.jobId) || '')
  const elapsedSec = Math.round(Number(detail.progress?.elapsed_ms || 0) / 1000)
  const hint = String(detail.progress?.hint || '')
  const status = String(detail.job?.status || '')
  if (status === 'committed' || status === 'cancelled') return { phase: 'idle' }
  if (status === 'failed' || status === 'awaiting_selection') {
    return { phase: 'failed', jobId, errorCode: String(detail.job?.error_code || (status === 'awaiting_selection' ? 'AWAITING_SELECTION' : 'ENGINE_FAILED')) }
  }
  return { phase: 'running', jobId, hint, elapsedSec }
}

function toastCode(code: string) {
  const mapped = kernelJobUserMessage(code)
  if (!mapped) return
  if (mapped.kind === 'warning') message.warning(mapped.text)
  else if (mapped.kind === 'info') message.info(mapped.text)
  else message.error(mapped.text)
}

export function useChapterWriteJob(deps: {
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
  const [state, setState] = useState<ChapterWriteJobState>({ phase: 'idle' })
  const abortRef = useRef<AbortController | null>(null)
  const jobIdRef = useRef('')
  const runningRef = useRef(false)

  useEffect(() => () => {
    abortRef.current?.abort()
  }, [])

  const start = useCallback(async (chapterId: number) => {
    if (runningRef.current) return
    if (!chapterId) {
      message.warning('请先选择章节')
      return
    }
    if (!deps.projectId) {
      message.warning('请先选择项目')
      return
    }
    if (!deps.modelId) {
      message.warning('请先选择模型')
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    runningRef.current = true
    jobIdRef.current = ''
    const length = writeChapterLengthTarget(deps.chapterWordTargetPayload?.() || {})
    setState({ phase: 'running', jobId: '', hint: 'queued', elapsedSec: 0 })
    const result = await runWriteChapterJob({
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
        setState(prev => reduceChapterWriteProgress(
          prev.phase === 'idle'
            ? { phase: 'running', jobId: jobIdRef.current, hint: '', elapsedSec: 0 }
            : prev,
          detail,
        ))
      },
    })
    runningRef.current = false
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
    if (result.kind === 'committed') {
      message.success('本章初稿已写入')
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
    runningRef.current = false
    await cancelWriteChapterJob({
      abort: () => abortRef.current?.abort(),
      cancelJob: api.cancelJob,
      jobIdRef,
      stateJobId: state.phase === 'running' ? state.jobId : '',
    })
    setState({ phase: 'idle' })
  }, [api, state])

  return {
    state,
    start,
    cancel,
  }
}
