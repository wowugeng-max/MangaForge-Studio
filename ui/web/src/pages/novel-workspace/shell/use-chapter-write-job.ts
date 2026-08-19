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
    const length = writeChapterLengthTarget(deps.chapterWordTargetPayload?.() || {})
    setState({ phase: 'running', jobId: '', hint: 'queued', elapsedSec: 0 })
    const saved = await deps.flushPendingSave()
    if (controller.signal.aborted) {
      runningRef.current = false
      return
    }
    if (!saved) {
      runningRef.current = false
      setState({ phase: 'idle' })
      return
    }
    const created = await api.createJobByVerb({
      projectId: deps.projectId,
      chapterId,
      modelId: deps.modelId,
      verb: 'write_chapter',
      userBrief: length ? { length_target: length } : undefined,
    })
    if (controller.signal.aborted) {
      runningRef.current = false
      return
    }
    if (!created.ok) {
      runningRef.current = false
      toastCode(created.code)
      setState({ phase: 'failed', jobId: null, errorCode: created.code })
      return
    }
    setState({ phase: 'running', jobId: created.jobId, hint: 'queued', elapsedSec: 0 })
    try {
      const terminal = await pollKernelJob({
        jobId: created.jobId,
        getJob: api.getJob,
        signal: controller.signal,
        onProgress: (detail) => {
          setState(prev => reduceChapterWriteProgress(
            prev.phase === 'idle'
              ? { phase: 'running', jobId: created.jobId, hint: '', elapsedSec: 0 }
              : prev,
            detail,
          ))
        },
      })
      if (controller.signal.aborted) {
        runningRef.current = false
        return
      }
      if (terminal.job.status === 'committed') {
        await deps.loadProjectModules()
        message.success('本章初稿已写入')
        runningRef.current = false
        setState({ phase: 'idle' })
        return
      }
      if (terminal.job.status === 'cancelled') {
        toastCode('CANCELLED')
        runningRef.current = false
        setState({ phase: 'idle' })
        return
      }
      if (terminal.job.status === 'failed' || terminal.job.status === 'awaiting_selection') {
        const errorCode = String(terminal.job.error_code || (terminal.job.status === 'awaiting_selection' ? 'AWAITING_SELECTION' : 'ENGINE_FAILED'))
        toastCode(errorCode)
        runningRef.current = false
        setState({ phase: 'failed', jobId: created.jobId, errorCode })
        return
      }
      runningRef.current = false
      setState({ phase: 'failed', jobId: created.jobId, errorCode: 'ENGINE_FAILED' })
    } catch (error: any) {
      runningRef.current = false
      if (error?.name === 'AbortError' || controller.signal.aborted) return
      setState({ phase: 'failed', jobId: created.jobId, errorCode: 'ENGINE_FAILED' })
    }
  }, [api, deps])

  const cancel = useCallback(async () => {
    const jobId = state.phase === 'running' ? state.jobId : ''
    abortRef.current?.abort()
    runningRef.current = false
    if (jobId) await api.cancelJob(jobId)
    setState({ phase: 'idle' })
  }, [api, state])

  return {
    state,
    start,
    cancel,
  }
}
