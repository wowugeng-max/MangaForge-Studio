import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { message } from 'antd'
import { axiosKernelRequest, createKernelJobApi } from '../../../kernel/jobs/client'
import {
  contractsForAction,
  DEFAULT_CHAPTER_CONTRACT_IDS,
  resolveContractIdsForCreate,
} from '../../../kernel/jobs/contracts-for-action'
import { kernelJobUserMessage } from '../../../kernel/jobs/messages'
import { pollKernelJob } from '../../../kernel/jobs/poll'
import type { CreateKernelJobInput, KernelContractListItem, KernelJobAction, KernelJobDetail } from '../../../kernel/jobs/types'
import { assertOhStoryApplyReady, startChapterKernelJob } from './start-chapter-kernel-job'

export type ChapterKernelJobState =
  | { phase: 'idle' }
  | { phase: 'running'; action: KernelJobAction; jobId: string; hint: string; elapsedSec: number }
  | { phase: 'awaiting_selection'; action: KernelJobAction; jobId: string; detail: KernelJobDetail }
  | { phase: 'failed'; action: KernelJobAction; jobId: string | null; errorCode: string }

function actionFrom(prev: ChapterKernelJobState): KernelJobAction {
  return prev.phase === 'idle' ? 'review' : prev.action
}

export function reduceChapterKernelProgress(
  prev: ChapterKernelJobState,
  detail: KernelJobDetail,
): ChapterKernelJobState {
  const action = actionFrom(prev)
  const jobId = String(detail.job?.id || (prev.phase === 'idle' ? '' : prev.jobId) || '')
  const elapsedSec = Math.round(Number(detail.progress?.elapsed_ms || 0) / 1000)
  const hint = String(detail.progress?.hint || '')
  const status = String(detail.job?.status || '')
  if (status === 'awaiting_selection') return { phase: 'awaiting_selection', action, jobId, detail }
  if (status === 'committed' || status === 'cancelled') return { phase: 'idle' }
  if (status === 'failed') {
    return { phase: 'failed', action, jobId, errorCode: String(detail.job?.error_code || 'ENGINE_FAILED') }
  }
  return { phase: 'running', action, jobId, hint, elapsedSec }
}

function toastCode(code: string) {
  const mapped = kernelJobUserMessage(code)
  if (!mapped) return
  if (mapped.kind === 'warning') message.warning(mapped.text)
  else if (mapped.kind === 'info') message.info(mapped.text)
  else message.error(mapped.text)
}

export function useChapterKernelJob(deps: {
  api?: ReturnType<typeof createKernelJobApi>
  apiClient?: { request: Function }
  projectId: number
  chapterId: number
  modelId: number
  reviews: any[]
  chapter: any
  flushPendingSave: () => Promise<boolean>
  loadProjectModules: () => Promise<void>
  resolveContractIds?: (action: KernelJobAction) => string[] | undefined
}) {
  const api = useMemo(
    () => deps.api || createKernelJobApi(axiosKernelRequest(deps.apiClient || { request: async () => ({ status: 0, data: {} }) })),
    [deps.api, deps.apiClient],
  )
  const [state, setState] = useState<ChapterKernelJobState>({ phase: 'idle' })
  const [contracts, setContracts] = useState<KernelContractListItem[]>([])
  const [selectedContractIds, setSelectedByAction] = useState<Record<KernelJobAction, string[]>>({
    review: [],
    deslop: [],
    apply: [],
  })
  const abortRef = useRef<AbortController | null>(null)
  const actionRef = useRef<KernelJobAction>('review')
  const runningRef = useRef(false)

  useEffect(() => () => {
    abortRef.current?.abort()
  }, [])

  useEffect(() => {
    void api.listContracts().then((result) => {
      if (!result.ok) return
      setContracts(result.contracts)
    })
  }, [api])

  useEffect(() => {
    if (!contracts.length) return
    setSelectedByAction((prev) => {
      const next = { ...prev }
      for (const action of ['review', 'deslop', 'apply'] as KernelJobAction[]) {
        if (next[action].length) continue
        const options = contractsForAction(contracts, action)
        const defaultId = DEFAULT_CHAPTER_CONTRACT_IDS[action]
        const picked = options.find(item => item.id === defaultId)?.id || options[0]?.id
        next[action] = picked ? [picked] : []
      }
      return next
    })
  }, [contracts])

  const setSelectedContractIds = useCallback((action: KernelJobAction, ids: string[]) => {
    setSelectedByAction(prev => ({ ...prev, [action]: ids }))
  }, [])

  const start = useCallback(async (action: KernelJobAction) => {
    if (runningRef.current) return
    if (!deps.chapterId) {
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
    if (action === 'apply') {
      const ready = assertOhStoryApplyReady({ reviews: deps.reviews, chapter: deps.chapter })
      if (!ready.ok) {
        message.warning(ready.warning)
        return
      }
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    actionRef.current = action
    runningRef.current = true
    const input: CreateKernelJobInput = {
      projectId: deps.projectId,
      chapterId: deps.chapterId,
      modelId: deps.modelId,
      action,
      contractIds: deps.resolveContractIds?.(action) ?? resolveContractIdsForCreate(
        selectedContractIds[action],
        DEFAULT_CHAPTER_CONTRACT_IDS[action],
      ),
    }
    setState({ phase: 'running', action, jobId: '', hint: 'queued', elapsedSec: 0 })
    const started = await startChapterKernelJob({
      flushPendingSave: deps.flushPendingSave,
      createJob: api.createJob,
      input,
    })
    if (controller.signal.aborted) {
      runningRef.current = false
      return
    }
    if (!started.ok) {
      runningRef.current = false
      toastCode(started.code)
      setState({ phase: 'failed', action, jobId: null, errorCode: started.code })
      return
    }
    setState({ phase: 'running', action, jobId: started.jobId, hint: 'queued', elapsedSec: 0 })
    try {
      const terminal = await pollKernelJob({
        jobId: started.jobId,
        getJob: api.getJob,
        signal: controller.signal,
        onProgress: (detail) => {
          setState(prev => reduceChapterKernelProgress(
            prev.phase === 'idle'
              ? { phase: 'running', action, jobId: started.jobId, hint: '', elapsedSec: 0 }
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
        const label = action === 'review' ? 'oh-story 审稿' : action === 'deslop' ? 'oh-story 去AI' : '按建议改稿'
        message.success(`${label}完成`)
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
      if (terminal.job.status === 'failed') {
        toastCode(String(terminal.job.error_code || 'ENGINE_FAILED'))
        runningRef.current = false
        setState({ phase: 'failed', action, jobId: started.jobId, errorCode: String(terminal.job.error_code || 'ENGINE_FAILED') })
        return
      }
      runningRef.current = true
      setState({ phase: 'awaiting_selection', action, jobId: started.jobId, detail: terminal })
    } catch (error: any) {
      runningRef.current = false
      if (error?.name === 'AbortError' || controller.signal.aborted) return
      setState({ phase: 'failed', action, jobId: started.jobId, errorCode: 'ENGINE_FAILED' })
    }
  }, [api, deps, selectedContractIds])

  const cancel = useCallback(async () => {
    const jobId = state.phase === 'running' || state.phase === 'awaiting_selection' ? state.jobId : ''
    abortRef.current?.abort()
    runningRef.current = false
    if (jobId) await api.cancelJob(jobId)
    setState({ phase: 'idle' })
  }, [api, state])

  const commit = useCallback(async (candidateId: string) => {
    if (state.phase !== 'awaiting_selection') return
    const result = await api.commitJob(state.jobId, candidateId)
    if (!result.ok) {
      toastCode(result.code)
      return
    }
    await deps.loadProjectModules()
    message.success('已采纳所选候选')
    runningRef.current = false
    setState({ phase: 'idle' })
  }, [api, deps, state])

  const loadArtifact = useCallback(async (artifactId: string) => {
    const result = await api.getArtifactContent(artifactId)
    if (!result.ok) return null
    return { content: result.content, truncated: result.truncated }
  }, [api])

  return {
    state,
    contracts,
    selectedContractIds,
    setSelectedContractIds,
    start,
    cancel,
    commit,
    loadArtifact,
  }
}
