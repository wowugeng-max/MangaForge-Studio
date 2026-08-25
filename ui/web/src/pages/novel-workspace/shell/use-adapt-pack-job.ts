import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { message } from 'antd'
import { axiosKernelRequest, createKernelJobApi } from '../../../kernel/jobs/client'
import { kernelJobUserMessage } from '../../../kernel/jobs/messages'
import { pollKernelJob } from '../../../kernel/jobs/poll'
import type { KernelJobDetail } from '../../../kernel/jobs/types'

export type AdaptPackJobState =
  | { phase: 'idle' }
  | { phase: 'running'; jobId: string; hint: string; elapsedSec: number }
  | { phase: 'awaiting_selection'; jobId: string; candidateId: string; detail: KernelJobDetail }
  | { phase: 'failed'; jobId: string | null; errorCode: string; detail?: KernelJobDetail | null }

export type AdaptPackJobClient = Pick<
  ReturnType<typeof createKernelJobApi>,
  'createJobByVerb' | 'getJob' | 'cancelJob' | 'commitJob' | 'listJobs'
>

export type RunAdaptPackJobResult =
  | { kind: 'aborted' }
  | { kind: 'idle' }
  | { kind: 'create_failed'; code: string; message: string }
  | { kind: 'awaiting_selection'; jobId: string; candidateId: string; detail: KernelJobDetail }
  | { kind: 'committed' }
  | { kind: 'cancelled' }
  | { kind: 'failed'; jobId: string; errorCode: string; detail: KernelJobDetail | null; toast: boolean }

const ADAPT_PACK_ACTIVE = ['queued', 'running', 'awaiting_selection'] as const

export function adaptPackCommitSuccessText(count: number) {
  return `已写入 ${count} 份合同，默认绑定未改`
}

export function adaptPackCreateFailureText(code: string): string | null {
  if (code === 'PROJECT_JOB_RUNNING') return '该 skill 适配未结束'
  return kernelJobUserMessage(code)?.text || null
}

function toastMapped(code: string) {
  const mapped = kernelJobUserMessage(code)
  if (!mapped) return
  if (mapped.kind === 'warning') message.warning(mapped.text)
  else if (mapped.kind === 'info') message.info(mapped.text)
  else message.error(mapped.text)
}

export function toastAdaptPackCreateFailure(code: string) {
  if (code === 'PROJECT_JOB_RUNNING') {
    message.warning(adaptPackCreateFailureText(code) || '该 skill 适配未结束')
    return
  }
  toastMapped(code)
}

function pickAdaptCandidateId(detail: KernelJobDetail): string {
  const succeeded = (detail.candidates || []).find(c => c.status === 'succeeded')
  return String(succeeded?.id || detail.candidates?.[0]?.id || '')
}

function runningFrom(detail: KernelJobDetail, fallbackId: string): Extract<AdaptPackJobState, { phase: 'running' }> {
  return {
    phase: 'running',
    jobId: String(detail.job?.id || fallbackId),
    hint: String(detail.progress?.hint || ''),
    elapsedSec: Math.round(Number(detail.progress?.elapsed_ms || 0) / 1000),
  }
}

export function reduceAdaptPackProgress(prev: AdaptPackJobState, detail: KernelJobDetail): AdaptPackJobState {
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
      candidateId: pickAdaptCandidateId(detail),
      detail,
    }
  }
  return runningFrom(detail, jobId)
}

function settleAdaptPackDetail(detail: KernelJobDetail, jobId: string): RunAdaptPackJobResult {
  const status = String(detail.job?.status || '')
  if (status === 'awaiting_selection') {
    return {
      kind: 'awaiting_selection',
      jobId,
      candidateId: pickAdaptCandidateId(detail),
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
  api: AdaptPackJobClient
  jobId: string
  signal: AbortSignal
  jobIdRef: { current: string }
  onProgress?: (detail: KernelJobDetail) => void
  pollJob?: typeof pollKernelJob
}): Promise<RunAdaptPackJobResult> {
  const pollJob = input.pollJob || pollKernelJob
  try {
    const terminal = await pollJob({
      jobId: input.jobId,
      getJob: input.api.getJob,
      signal: input.signal,
      onProgress: input.onProgress,
    })
    if (input.signal.aborted) return { kind: 'aborted' }
    return settleAdaptPackDetail(terminal, input.jobId)
  } catch (error: any) {
    if (error?.name === 'AbortError' || input.signal.aborted) return { kind: 'aborted' }
    input.jobIdRef.current = ''
    return { kind: 'failed', jobId: input.jobId, errorCode: 'ENGINE_FAILED', detail: null, toast: false }
  }
}

export async function runAdaptPackJob(input: {
  api: AdaptPackJobClient
  projectId: number
  modelId: number
  skillId: string
  signal: AbortSignal
  jobIdRef: { current: string }
  onProgress?: (detail: KernelJobDetail) => void
  onCreated?: (jobId: string) => void
  pollJob?: typeof pollKernelJob
}): Promise<RunAdaptPackJobResult> {
  const created = await input.api.createJobByVerb({
    projectId: input.projectId,
    chapterId: 0,
    modelId: input.modelId,
    verb: 'adapt_pack',
    subjectType: 'pack',
    subjectId: 0,
    subjectKey: input.skillId,
    verbParams: { skill_id: input.skillId },
  })
  if (input.signal.aborted) return { kind: 'aborted' }
  if (!created.ok) return { kind: 'create_failed', code: created.code, message: created.message }
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

export async function resumeAdaptPackJob(input: {
  api: AdaptPackJobClient
  skillId: string
  signal: AbortSignal
  jobIdRef: { current: string }
  onProgress?: (detail: KernelJobDetail) => void
  onCreated?: (jobId: string) => void
  pollJob?: typeof pollKernelJob
}): Promise<RunAdaptPackJobResult> {
  const listed = await input.api.listJobs({ verb: 'adapt_pack', subjectKey: input.skillId })
  if (input.signal.aborted) return { kind: 'aborted' }
  if (!listed.ok) return { kind: 'idle' }
  const latest = [...(listed.jobs || [])]
    .filter(job => (ADAPT_PACK_ACTIVE as readonly string[]).includes(String(job.status || '')))
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
  return settleAdaptPackDetail(detail, jobId)
}

export async function cancelAdaptPackJob(input: {
  abort: () => void
  cancelJob: AdaptPackJobClient['cancelJob']
  jobIdRef: { current: string }
  stateJobId?: string
}): Promise<void> {
  const jobId = String(input.jobIdRef.current || input.stateJobId || '')
  input.abort()
  if (jobId) await input.cancelJob(jobId)
  input.jobIdRef.current = ''
}

export async function commitAdaptPackJob(input: {
  api: { commitJob: AdaptPackJobClient['commitJob']; putVerbDefaults?: Function }
  jobId: string
  candidateId: string
}): Promise<{ ok: true; count: number } | { ok: false; code: string; message: string }> {
  const result = await input.api.commitJob(input.jobId, input.candidateId)
  if (!result.ok) return { ok: false, code: result.code, message: result.message }
  return { ok: true, count: Array.isArray(result.commits) ? result.commits.length : 0 }
}

function applyAdaptResult(
  result: RunAdaptPackJobResult,
  setState: (next: AdaptPackJobState) => void,
) {
  if (result.kind === 'aborted') return
  if (result.kind === 'idle' || result.kind === 'committed' || result.kind === 'cancelled') {
    if (result.kind === 'cancelled') toastMapped('CANCELLED')
    setState({ phase: 'idle' })
    return
  }
  if (result.kind === 'create_failed') {
    toastAdaptPackCreateFailure(result.code)
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

export function useAdaptPackJob(deps: {
  api?: ReturnType<typeof createKernelJobApi>
  apiClient?: { request: Function }
  projectId: number
  modelId?: number
}) {
  const api = useMemo(
    () => deps.api || createKernelJobApi(axiosKernelRequest(deps.apiClient || { request: async () => ({ status: 0, data: {} }) })),
    [deps.api, deps.apiClient],
  )
  const [state, setState] = useState<AdaptPackJobState>({ phase: 'idle' })
  const abortRef = useRef<AbortController | null>(null)
  const jobIdRef = useRef('')
  const runningRef = useRef(false)
  const sessionRef = useRef(0)
  const skillIdRef = useRef('')

  useEffect(() => () => {
    abortRef.current?.abort()
  }, [])

  const beginSession = (skillId: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    const session = ++sessionRef.current
    skillIdRef.current = skillId
    runningRef.current = true
    jobIdRef.current = ''
    return { controller, session }
  }

  const isCurrentSession = (session: number) => (
    sessionRef.current === session && skillIdRef.current !== ''
  )

  const bindProgress = (session: number, skillId: string) => ({
    onCreated: (jobId: string) => {
      if (!isCurrentSession(session) || skillIdRef.current !== skillId) return
      setState({ phase: 'running' as const, jobId, hint: 'queued', elapsedSec: 0 })
    },
    onProgress: (detail: KernelJobDetail) => {
      if (!isCurrentSession(session) || skillIdRef.current !== skillId) return
      setState(prev => reduceAdaptPackProgress(
        prev.phase === 'idle'
          ? { phase: 'running' as const, jobId: jobIdRef.current, hint: '', elapsedSec: 0 }
          : prev,
        detail,
      ))
    },
  })

  const finishSession = (session: number, skillId: string, result: RunAdaptPackJobResult) => {
    if (!isCurrentSession(session) || skillIdRef.current !== skillId) return
    runningRef.current = false
    applyAdaptResult(result, setState)
  }

  const start = useCallback(async (skillId: string) => {
    if (runningRef.current) return
    if (state.phase === 'awaiting_selection') return
    if (!deps.projectId || !deps.modelId || !skillId) return
    const { controller, session } = beginSession(skillId)
    setState({ phase: 'running', jobId: '', hint: 'queued', elapsedSec: 0 })
    const result = await runAdaptPackJob({
      api,
      projectId: deps.projectId,
      modelId: deps.modelId,
      skillId,
      signal: controller.signal,
      jobIdRef,
      ...bindProgress(session, skillId),
    })
    finishSession(session, skillId, result)
  }, [api, deps.modelId, deps.projectId, state.phase])

  const resume = useCallback(async (skillId: string) => {
    if (!skillId) return
    const { controller, session } = beginSession(skillId)
    setState({ phase: 'running', jobId: '', hint: 'queued', elapsedSec: 0 })
    const result = await resumeAdaptPackJob({
      api,
      skillId,
      signal: controller.signal,
      jobIdRef,
      ...bindProgress(session, skillId),
    })
    finishSession(session, skillId, result)
  }, [api])

  const session = sessionRef.current
  const skillId = skillIdRef.current

  const cancel = useCallback(async () => {
    if (!isCurrentSession(session) || skillIdRef.current !== skillId) return
    sessionRef.current += 1
    skillIdRef.current = ''
    runningRef.current = false
    await cancelAdaptPackJob({
      abort: () => abortRef.current?.abort(),
      cancelJob: api.cancelJob,
      jobIdRef,
      stateJobId: state.phase === 'running' || state.phase === 'awaiting_selection' ? state.jobId : '',
    })
    setState({ phase: 'idle' })
  }, [api, state, session, skillId])

  const commit = useCallback(async () => {
    if (state.phase !== 'awaiting_selection') return
    if (!isCurrentSession(session) || skillIdRef.current !== skillId) return
    const result = await commitAdaptPackJob({
      api,
      jobId: state.jobId,
      candidateId: state.candidateId,
    })
    if (!isCurrentSession(session) || skillIdRef.current !== skillId) return
    if (!result.ok) {
      toastMapped(result.code)
      return result
    }
    jobIdRef.current = ''
    message.success(adaptPackCommitSuccessText(result.count))
    setState({ phase: 'idle' })
    return result
  }, [api, state, session, skillId])

  return { state, start, cancel, commit, resume, api }
}
