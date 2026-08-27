import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { message } from 'antd'
import { axiosKernelRequest, createKernelJobApi } from '../../../kernel/jobs/client'
import { kernelJobUserMessage } from '../../../kernel/jobs/messages'
import { pollKernelJob } from '../../../kernel/jobs/poll'
import type { KernelJobDetail } from '../../../kernel/jobs/types'
import {
  expandOutlineCommitSuccessText,
  expandOutlineCreateFailureText,
} from '../expand-outline-ui'

export type ExpandOutlineJobState =
  | { phase: 'idle' }
  | { phase: 'running'; jobId: string; hint: string; elapsedSec: number }
  | { phase: 'awaiting_selection'; jobId: string; candidateId: string; detail: KernelJobDetail }
  | { phase: 'failed'; jobId: string | null; errorCode: string; detail?: KernelJobDetail | null }

export type ExpandOutlineJobClient = Pick<
  ReturnType<typeof createKernelJobApi>,
  'createJobByVerb' | 'getJob' | 'cancelJob' | 'commitJob' | 'listJobs' | 'getArtifactContent'
>

export type RunExpandOutlineJobResult =
  | { kind: 'aborted' }
  | { kind: 'idle' }
  | { kind: 'create_failed'; code: string; message: string }
  | { kind: 'awaiting_selection'; jobId: string; candidateId: string; detail: KernelJobDetail }
  | { kind: 'committed' }
  | { kind: 'cancelled' }
  | { kind: 'failed'; jobId: string; errorCode: string; detail: KernelJobDetail | null; toast: boolean }

const EXPAND_OUTLINE_ACTIVE = ['queued', 'running', 'awaiting_selection'] as const

function toastMapped(code: string) {
  const mapped = kernelJobUserMessage(code)
  if (!mapped) return
  if (mapped.kind === 'warning') message.warning(mapped.text)
  else if (mapped.kind === 'info') message.info(mapped.text)
  else message.error(mapped.text)
}

export function toastExpandOutlineCreateFailure(code: string) {
  if (code === 'PROJECT_JOB_RUNNING') {
    message.warning(expandOutlineCreateFailureText(code) || '该项目扩纲未结束')
    return
  }
  toastMapped(code)
}

function pickExpandCandidateId(detail: KernelJobDetail): string {
  const succeeded = (detail.candidates || []).find(item => item.status === 'succeeded')
  return String(succeeded?.id || detail.candidates?.[0]?.id || '')
}

function runningFrom(detail: KernelJobDetail, fallbackId: string): Extract<ExpandOutlineJobState, { phase: 'running' }> {
  return {
    phase: 'running',
    jobId: String(detail.job?.id || fallbackId),
    hint: String(detail.progress?.hint || ''),
    elapsedSec: Math.round(Number(detail.progress?.elapsed_ms || 0) / 1000),
  }
}

export function reduceExpandOutlineProgress(prev: ExpandOutlineJobState, detail: KernelJobDetail): ExpandOutlineJobState {
  const jobId = String(detail.job?.id || (prev.phase === 'idle' ? '' : prev.jobId) || '')
  const status = String(detail.job?.status || '')
  if (status === 'committed' || status === 'cancelled') return { phase: 'idle' }
  if (status === 'failed') {
    return {
      phase: 'failed',
      jobId,
      errorCode: String(detail.job?.error_code || 'ENGINE_FAILED'),
      detail,
    }
  }
  if (status === 'awaiting_selection') {
    return {
      phase: 'awaiting_selection',
      jobId,
      candidateId: pickExpandCandidateId(detail),
      detail,
    }
  }
  return runningFrom(detail, jobId)
}

function settleExpandDetail(detail: KernelJobDetail, jobId: string): RunExpandOutlineJobResult {
  const status = String(detail.job?.status || '')
  if (status === 'awaiting_selection') {
    return {
      kind: 'awaiting_selection',
      jobId,
      candidateId: pickExpandCandidateId(detail),
      detail,
    }
  }
  if (status === 'committed') return { kind: 'committed' }
  if (status === 'cancelled') return { kind: 'cancelled' }
  if (status === 'failed') {
    return {
      kind: 'failed',
      jobId,
      errorCode: String(detail.job?.error_code || 'ENGINE_FAILED'),
      detail,
      toast: true,
    }
  }
  return { kind: 'failed', jobId, errorCode: 'ENGINE_FAILED', detail, toast: false }
}

async function pollUntilSettled(input: {
  api: ExpandOutlineJobClient
  jobId: string
  signal: AbortSignal
  jobIdRef: { current: string }
  onProgress?: (detail: KernelJobDetail) => void
  pollJob?: typeof pollKernelJob
}): Promise<RunExpandOutlineJobResult> {
  const pollJob = input.pollJob || pollKernelJob
  try {
    const terminal = await pollJob({
      jobId: input.jobId,
      getJob: input.api.getJob,
      signal: input.signal,
      onProgress: input.onProgress,
    })
    if (input.signal.aborted) return { kind: 'aborted' }
    return settleExpandDetail(terminal, input.jobId)
  } catch (error: any) {
    if (error?.name === 'AbortError' || input.signal.aborted) return { kind: 'aborted' }
    input.jobIdRef.current = ''
    return { kind: 'failed', jobId: input.jobId, errorCode: 'ENGINE_FAILED', detail: null, toast: false }
  }
}

export async function resumeExpandOutlineJob(input: {
  api: ExpandOutlineJobClient
  projectId: number
  signal: AbortSignal
  jobIdRef: { current: string }
  onProgress?: (detail: KernelJobDetail) => void
  onCreated?: (jobId: string) => void
  pollJob?: typeof pollKernelJob
}): Promise<RunExpandOutlineJobResult> {
  const listed = await input.api.listJobs({ verb: 'expand_outline', projectId: input.projectId })
  if (input.signal.aborted) return { kind: 'aborted' }
  if (!listed.ok) return { kind: 'idle' }
  const latest = [...(listed.jobs || [])]
    .filter(job => (EXPAND_OUTLINE_ACTIVE as readonly string[]).includes(String(job.status || '')))
    .sort((a, b) => {
      const byTime = String(b.created_at || '').localeCompare(String(a.created_at || ''))
      if (byTime) return byTime
      return String(b.id || '').localeCompare(String(a.id || ''))
    })[0]
  const jobId = String(latest?.id || '')
  if (!jobId) return { kind: 'idle' }

  input.jobIdRef.current = jobId
  const detail = await input.api.getJob(jobId)
  if (input.signal.aborted) return { kind: 'aborted' }
  if (!detail || !('ok' in detail) || !detail.ok || !detail.job) return { kind: 'idle' }

  const status = String(detail.job.status || '')
  if (status === 'queued' || status === 'running') {
    input.onCreated?.(jobId)
    input.onProgress?.(detail)
    return pollUntilSettled({
      api: input.api,
      jobId,
      signal: input.signal,
      jobIdRef: input.jobIdRef,
      onProgress: input.onProgress,
      pollJob: input.pollJob,
    })
  }
  return settleExpandDetail(detail, jobId)
}

export async function runExpandOutlineJob(input: {
  api: ExpandOutlineJobClient
  projectId: number
  modelId: number
  signal: AbortSignal
  jobIdRef: { current: string }
  onProgress?: (detail: KernelJobDetail) => void
  onCreated?: (jobId: string) => void
  pollJob?: typeof pollKernelJob
}): Promise<RunExpandOutlineJobResult> {
  const created = await input.api.createJobByVerb({
    projectId: input.projectId,
    chapterId: 0,
    modelId: input.modelId,
    verb: 'expand_outline',
    subjectType: 'project',
    subjectId: input.projectId,
  })
  if (input.signal.aborted) return { kind: 'aborted' }
  if (!created.ok) {
    if (created.code === 'PROJECT_JOB_RUNNING') {
      const resumed = await resumeExpandOutlineJob({
        api: input.api,
        projectId: input.projectId,
        signal: input.signal,
        jobIdRef: input.jobIdRef,
        onProgress: input.onProgress,
        onCreated: input.onCreated,
        pollJob: input.pollJob,
      })
      if (resumed.kind !== 'idle' && resumed.kind !== 'aborted') return resumed
    }
    return { kind: 'create_failed', code: created.code, message: created.message }
  }
  input.jobIdRef.current = created.jobId
  input.onCreated?.(created.jobId)
  return pollUntilSettled({
    api: input.api,
    jobId: created.jobId,
    signal: input.signal,
    jobIdRef: input.jobIdRef,
    onProgress: input.onProgress,
    pollJob: input.pollJob,
  })
}

export async function cancelExpandOutlineJob(input: {
  abort: () => void
  cancelJob: ExpandOutlineJobClient['cancelJob']
  jobId?: string
  jobIdRef: { current: string }
}): Promise<void> {
  const jobId = String(input.jobId || input.jobIdRef.current || '')
  input.abort()
  if (jobId) await input.cancelJob(jobId)
  if (input.jobIdRef.current === jobId) input.jobIdRef.current = ''
}

export async function commitExpandOutlineJob(input: {
  api: { commitJob: ExpandOutlineJobClient['commitJob']; putVerbDefaults?: Function }
  jobId: string
  candidateId: string
}): Promise<{ ok: true; count: number } | { ok: false; code: string; message: string }> {
  const result = await input.api.commitJob(input.jobId, input.candidateId)
  if (!result.ok) return { ok: false, code: result.code, message: result.message }
  return { ok: true, count: Array.isArray(result.commits) ? result.commits.length : 0 }
}

function applyExpandResult(
  result: RunExpandOutlineJobResult,
  setState: (next: ExpandOutlineJobState) => void,
) {
  if (result.kind === 'aborted') return
  if (result.kind === 'idle' || result.kind === 'committed' || result.kind === 'cancelled') {
    if (result.kind === 'cancelled') toastMapped('CANCELLED')
    setState({ phase: 'idle' })
    return
  }
  if (result.kind === 'create_failed') {
    toastExpandOutlineCreateFailure(result.code)
    setState({ phase: 'failed', jobId: null, errorCode: result.code })
    return
  }
  if (result.kind === 'awaiting_selection') {
    setState({
      phase: 'awaiting_selection',
      jobId: result.jobId,
      candidateId: result.candidateId,
      detail: result.detail,
    })
    return
  }
  if (result.toast) toastMapped(result.errorCode)
  setState({
    phase: 'failed',
    jobId: result.jobId,
    errorCode: result.errorCode,
    detail: result.detail,
  })
}

export function useExpandOutlineJob(deps: {
  api?: ReturnType<typeof createKernelJobApi>
  apiClient?: { request: Function }
  projectId: number
  modelId?: number
  loadProjectModules?: () => Promise<void>
}) {
  const api = useMemo(
    () => deps.api || createKernelJobApi(axiosKernelRequest(deps.apiClient || { request: async () => ({ status: 0, data: {} }) })),
    [deps.api, deps.apiClient],
  )
  const [state, setState] = useState<ExpandOutlineJobState>({ phase: 'idle' })
  const abortRef = useRef<AbortController | null>(null)
  const jobIdRef = useRef('')
  const runningRef = useRef(false)
  const sessionRef = useRef(0)

  useEffect(() => () => {
    abortRef.current?.abort()
  }, [])

  const beginSession = () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const session = ++sessionRef.current
    runningRef.current = true
    jobIdRef.current = ''
    return { controller, session }
  }

  const isCurrentSession = (session: number) => sessionRef.current === session

  const bindProgress = (session: number) => ({
    onCreated: (jobId: string) => {
      if (!isCurrentSession(session)) return
      setState({ phase: 'running' as const, jobId, hint: 'queued', elapsedSec: 0 })
    },
    onProgress: (detail: KernelJobDetail) => {
      if (!isCurrentSession(session)) return
      setState(prev => reduceExpandOutlineProgress(
        prev.phase === 'idle'
          ? { phase: 'running' as const, jobId: jobIdRef.current, hint: '', elapsedSec: 0 }
          : prev,
        detail,
      ))
    },
  })

  const finishSession = (session: number, result: RunExpandOutlineJobResult) => {
    if (!isCurrentSession(session)) return
    runningRef.current = false
    applyExpandResult(result, setState)
  }

  const start = useCallback(async () => {
    if (runningRef.current) return
    if (state.phase === 'awaiting_selection') return
    if (!deps.projectId || !deps.modelId) return
    const { controller, session } = beginSession()
    setState({ phase: 'running', jobId: '', hint: 'queued', elapsedSec: 0 })
    const result = await runExpandOutlineJob({
      api,
      projectId: deps.projectId,
      modelId: deps.modelId,
      signal: controller.signal,
      jobIdRef,
      ...bindProgress(session),
    })
    finishSession(session, result)
  }, [api, deps.modelId, deps.projectId, state.phase])

  const resume = useCallback(async () => {
    if (runningRef.current) return
    if (state.phase === 'awaiting_selection') return
    if (!deps.projectId) return
    const { controller, session } = beginSession()
    setState({ phase: 'running', jobId: '', hint: 'queued', elapsedSec: 0 })
    const result = await resumeExpandOutlineJob({
      api,
      projectId: deps.projectId,
      signal: controller.signal,
      jobIdRef,
      ...bindProgress(session),
    })
    finishSession(session, result)
  }, [api, deps.projectId, state.phase])

  const session = sessionRef.current

  const cancel = useCallback(async () => {
    if (!isCurrentSession(session)) return
    const jobId = String(
      jobIdRef.current
      || (state.phase === 'running' || state.phase === 'awaiting_selection' ? state.jobId : ''),
    )
    const controller = abortRef.current
    sessionRef.current += 1
    const cancelSession = sessionRef.current
    await cancelExpandOutlineJob({
      abort: () => controller?.abort(),
      cancelJob: api.cancelJob,
      jobId,
      jobIdRef,
    })
    if (sessionRef.current !== cancelSession) return
    runningRef.current = false
    setState({ phase: 'idle' })
  }, [api, state, session])

  const commit = useCallback(async () => {
    if (state.phase !== 'awaiting_selection') return
    if (!isCurrentSession(session)) return
    const result = await commitExpandOutlineJob({
      api,
      jobId: state.jobId,
      candidateId: state.candidateId,
    })
    if (!isCurrentSession(session)) return
    if (!result.ok) {
      toastMapped(result.code)
      return result
    }
    jobIdRef.current = ''
    message.success(expandOutlineCommitSuccessText())
    setState({ phase: 'idle' })
    await deps.loadProjectModules?.()
    return result
  }, [api, state, session, deps.loadProjectModules])

  return { state, start, cancel, commit, resume, api }
}
