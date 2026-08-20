import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { message } from 'antd'
import { axiosKernelRequest, createKernelJobApi } from '../../../kernel/jobs/client'
import { kernelJobUserMessage } from '../../../kernel/jobs/messages'
import { pollKernelJob } from '../../../kernel/jobs/poll'
import type { KernelJobDetail } from '../../../kernel/jobs/types'
import { writeChapterLengthTarget } from '../../../kernel/jobs/write-brief'

export type ProjectContinueJobState =
  | { phase: 'idle' }
  | { phase: 'running'; jobId: string; hint: string; elapsedSec: number }
  | { phase: 'failed'; jobId: string | null; errorCode: string }

export type ProjectContinueJobClient = Pick<
  ReturnType<typeof createKernelJobApi>,
  'createJobByVerb' | 'getJob' | 'cancelJob'
>

export type RunContinueJobResult =
  | { kind: 'aborted' }
  | { kind: 'save_failed' }
  | { kind: 'create_failed'; code: string; message: string }
  | { kind: 'committed' }
  | { kind: 'cancelled' }
  | { kind: 'failed'; jobId: string; errorCode: string; toast: boolean }

async function cancelCreatedContinueJob(
  cancelJob: ProjectContinueJobClient['cancelJob'],
  jobIdRef: { current: string },
  jobId?: string,
) {
  const id = String(jobId || jobIdRef.current || '')
  if (id && jobIdRef.current === id) jobIdRef.current = ''
  if (id) await cancelJob(id)
}

export async function cancelContinueJob(input: {
  abort: () => void
  cancelJob: ProjectContinueJobClient['cancelJob']
  jobIdRef: { current: string }
  stateJobId?: string
}): Promise<void> {
  const jobId = String(input.jobIdRef.current || input.stateJobId || '')
  input.abort()
  if (jobId) await input.cancelJob(jobId)
  input.jobIdRef.current = ''
}

export async function runContinueJob(input: {
  api: ProjectContinueJobClient
  projectId: number
  fromChapterNo: number
  count: number
  modelId: number
  userBrief?: { length_target: string }
  flushPendingSave: () => Promise<boolean>
  loadProjectModules: () => Promise<void>
  signal: AbortSignal
  jobIdRef: { current: string }
  onProgress?: (detail: KernelJobDetail) => void
  onCreated?: (jobId: string) => void
  pollJob?: typeof pollKernelJob
}): Promise<RunContinueJobResult> {
  const saved = await input.flushPendingSave()
  if (input.signal.aborted) return { kind: 'aborted' }
  if (!saved) return { kind: 'save_failed' }

  const created = await input.api.createJobByVerb({
    projectId: input.projectId,
    chapterId: 0,
    modelId: input.modelId,
    verb: 'write_continue',
    subjectType: 'project',
    subjectId: input.projectId,
    verbParams: { from_chapter_no: input.fromChapterNo, count: input.count },
    userBrief: input.userBrief,
  })
  if (created.ok) input.jobIdRef.current = created.jobId
  if (input.signal.aborted) {
    if (created.ok) await cancelCreatedContinueJob(input.api.cancelJob, input.jobIdRef, created.jobId)
    return { kind: 'aborted' }
  }
  if (!created.ok) return { kind: 'create_failed', code: created.code, message: created.message }

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
      await cancelCreatedContinueJob(input.api.cancelJob, input.jobIdRef, created.jobId)
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
      await cancelCreatedContinueJob(input.api.cancelJob, input.jobIdRef, created.jobId)
      return { kind: 'aborted' }
    }
    input.jobIdRef.current = ''
    return { kind: 'failed', jobId: created.jobId, errorCode: 'ENGINE_FAILED', toast: false }
  }
}

export function reduceProjectContinueProgress(prev: ProjectContinueJobState, detail: KernelJobDetail): ProjectContinueJobState {
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

export function toastContinueFailure(code: string, serverMessage?: string) {
  if (serverMessage && /第\s*\d+\s*章/.test(serverMessage)) {
    message.warning(serverMessage)
    return
  }
  const mapped = kernelJobUserMessage(code)
  if (!mapped) return
  if (mapped.kind === 'warning') message.warning(mapped.text)
  else if (mapped.kind === 'info') message.info(mapped.text)
  else message.error(mapped.text)
}

export function useProjectContinueJob(deps: {
  api?: ReturnType<typeof createKernelJobApi>
  apiClient?: { request: Function }
  projectId: number
  modelId: number
  flushPendingSave: () => Promise<boolean>
  loadProjectModules: () => Promise<void>
  chapterWordTargetPayload?: () => { word_target_mode?: string; target_word_count?: number }
  isAuthorWriteBusy?: () => boolean
}) {
  const api = useMemo(
    () => deps.api || createKernelJobApi(axiosKernelRequest(deps.apiClient || { request: async () => ({ status: 0, data: {} }) })),
    [deps.api, deps.apiClient],
  )
  const [state, setState] = useState<ProjectContinueJobState>({ phase: 'idle' })
  const abortRef = useRef<AbortController | null>(null)
  const jobIdRef = useRef('')
  const runningRef = useRef(false)

  useEffect(() => () => {
    abortRef.current?.abort()
  }, [])

  const start = useCallback(async (input: { fromChapterNo: number; count: number }) => {
    if (runningRef.current) return
    if (deps.isAuthorWriteBusy?.()) {
      message.warning('先等当前写章或回炉结束')
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
    const from = Number(input.fromChapterNo)
    const count = Number(input.count)
    const hint = `正在续写第 ${from}–${from + count - 1} 章`
    setState({ phase: 'running', jobId: '', hint, elapsedSec: 0 })
    const result = await runContinueJob({
      api,
      projectId: deps.projectId,
      fromChapterNo: from,
      count,
      modelId: deps.modelId,
      userBrief: length ? { length_target: length } : undefined,
      flushPendingSave: deps.flushPendingSave,
      loadProjectModules: deps.loadProjectModules,
      signal: controller.signal,
      jobIdRef,
      onCreated: (jobId) => {
        setState({ phase: 'running', jobId, hint, elapsedSec: 0 })
      },
      onProgress: (detail) => {
        setState(prev => reduceProjectContinueProgress(
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
      toastContinueFailure(result.code, result.message)
      setState({ phase: 'failed', jobId: null, errorCode: result.code })
      return
    }
    if (result.kind === 'committed') {
      message.success('续写已写入')
      setState({ phase: 'idle' })
      return
    }
    if (result.kind === 'cancelled') {
      toastContinueFailure('CANCELLED')
      setState({ phase: 'idle' })
      return
    }
    if (result.toast) toastContinueFailure(result.errorCode)
    setState({ phase: 'failed', jobId: result.jobId, errorCode: result.errorCode })
  }, [api, deps])

  const cancel = useCallback(async () => {
    runningRef.current = false
    await cancelContinueJob({
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
