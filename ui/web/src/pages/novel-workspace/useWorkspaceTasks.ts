import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import apiClient from '../../api/client'
import type { WorkspaceActiveTask } from './TaskCenterDrawer'
import { displayValue } from './utils'

const ACTIVE_POLLING_STATUSES = new Set(['queued', 'ready', 'running', 'pending', 'in_progress', 'processing'])

export type WorkspaceTaskRefreshState<T> = {
  data: T
  confirmed: boolean
  error: string | null
  failures: number
}

type WorkspaceTaskRequestKind = 'production' | 'knowledge'
type WorkspaceTaskRequest = {
  kind: WorkspaceTaskRequestKind
  projectId: number
  token: number
  signal: AbortSignal
}

export function createWorkspaceTaskRequestGate() {
  let epoch = 0
  const active = new Map<WorkspaceTaskRequestKind, WorkspaceTaskRequest & { controller: AbortController }>()
  return {
    begin(kind: WorkspaceTaskRequestKind, projectId: number): WorkspaceTaskRequest | null {
      const current = active.get(kind)
      if (current && current.projectId === projectId && !current.signal.aborted) return null
      current?.controller.abort()
      const controller = new AbortController()
      const request = { kind, projectId, token: ++epoch, signal: controller.signal, controller }
      active.set(kind, request)
      return request
    },
    isCurrent(request: WorkspaceTaskRequest | null, projectId: number) {
      if (!request || request.projectId !== projectId || request.signal.aborted) return false
      const current = active.get(request.kind)
      return current?.token === request.token && current.projectId === projectId
    },
    finish(request: WorkspaceTaskRequest | null) {
      if (!request) return
      const current = active.get(request.kind)
      if (current?.token === request.token) active.delete(request.kind)
    },
    invalidate() {
      epoch += 1
      for (const request of active.values()) request.controller.abort()
      active.clear()
    },
  }
}

export function workspaceTaskRefreshStarted<T>(state: WorkspaceTaskRefreshState<T>): WorkspaceTaskRefreshState<T> {
  return { ...state, confirmed: false }
}

export function workspaceTaskRefreshSucceeded<T>(_state: WorkspaceTaskRefreshState<T>, data: T): WorkspaceTaskRefreshState<T> {
  return { data, confirmed: true, error: null, failures: 0 }
}

export function workspaceTaskRefreshFailed<T>(state: WorkspaceTaskRefreshState<T>, error: unknown): WorkspaceTaskRefreshState<T> {
  return {
    ...state,
    confirmed: false,
    error: error instanceof Error ? error.message : String(error || '任务刷新失败'),
    failures: Number(state.failures || 0) + 1,
  }
}

function hasLiveStatus(items: any[]) {
  return items.some(item => ACTIVE_POLLING_STATUSES.has(String(item?.status || '').toLowerCase()))
}

export function workspaceHasLiveProductionTasks(productionTasks: any) {
  const tasks = [
    ...(Array.isArray(productionTasks?.tasks) ? productionTasks.tasks : []),
    ...(Array.isArray(productionTasks?.active) ? productionTasks.active : []),
  ]
  return Number(productionTasks?.summary?.running || 0) > 0
    || Number(productionTasks?.summary?.queued || 0) > 0
    || hasLiveStatus(tasks)
}

export function workspaceHasLiveKnowledgeJobs(knowledgeIngestJobs: any[]) {
  return hasLiveStatus(Array.isArray(knowledgeIngestJobs) ? knowledgeIngestJobs : [])
}

export function workspaceTaskPollingIntervalMs({
  taskCenterOpen,
  productionTasks,
  knowledgeIngestJobs,
  hasLocalActiveTask,
  productionRefreshConfirmed = true,
  knowledgeRefreshConfirmed = true,
  productionRefreshFailures = 0,
  knowledgeRefreshFailures = 0,
}: {
  taskCenterOpen: boolean
  productionTasks: any
  knowledgeIngestJobs: any[]
  hasLocalActiveTask: boolean
  productionRefreshConfirmed?: boolean
  knowledgeRefreshConfirmed?: boolean
  productionRefreshFailures?: number
  knowledgeRefreshFailures?: number
}) {
  if (!taskCenterOpen) return null
  const shouldPoll = !productionRefreshConfirmed
    || !knowledgeRefreshConfirmed
    || hasLocalActiveTask
    || workspaceHasLiveProductionTasks(productionTasks)
    || workspaceHasLiveKnowledgeJobs(knowledgeIngestJobs)
  if (!shouldPoll) return null
  const failures = Math.max(Number(productionRefreshFailures || 0), Number(knowledgeRefreshFailures || 0))
  if (failures >= 2) return 30000
  if (failures >= 1) return 10000
  return 3500
}

export function useWorkspaceTasks({
  projectId,
  taskCenterOpen,
  selectedModelId,
  stepOutlineLoading,
  stepProseLoading,
  stepRepairLoading,
  proseProgress,
  proseBatchStatus,
  planning,
  planProgress,
  executingAgents,
  generatingProse,
  streamingProgress,
  streamingPercent,
  activeChapter,
  onCancelProseBatch,
}: {
  projectId: number
  taskCenterOpen: boolean
  selectedModelId?: number
  stepOutlineLoading: boolean
  stepProseLoading: boolean
  stepRepairLoading: boolean
  proseProgress: { current: number; total: number }
  proseBatchStatus?: any
  planning: boolean
  planProgress: any
  executingAgents: boolean
  generatingProse: boolean
  streamingProgress: string
  streamingPercent: number
  activeChapter: any | null
  onCancelProseBatch?: () => void
}) {
  const [knowledgeRefresh, setKnowledgeRefresh] = useState<WorkspaceTaskRefreshState<any[]>>({
    data: [],
    confirmed: false,
    error: null,
    failures: 0,
  })
  const [knowledgeJobsLoading, setKnowledgeJobsLoading] = useState(false)
  const [productionRefresh, setProductionRefresh] = useState<WorkspaceTaskRefreshState<any | null>>({
    data: null,
    confirmed: false,
    error: null,
    failures: 0,
  })
  const [productionTasksLoading, setProductionTasksLoading] = useState(false)
  const knowledgeRefreshRef = useRef(knowledgeRefresh)
  const productionRefreshRef = useRef(productionRefresh)
  const requestGateRef = useRef<ReturnType<typeof createWorkspaceTaskRequestGate> | null>(null)
  if (!requestGateRef.current) requestGateRef.current = createWorkspaceTaskRequestGate()
  const knowledgeIngestJobs = knowledgeRefresh.data
  const productionTasks = productionRefresh.data

  const loadProductionTasks = useCallback(async () => {
    if (!projectId) return
    const request = requestGateRef.current!.begin('production', projectId)
    if (!request) return
    setProductionRefresh(workspaceTaskRefreshStarted)
    setProductionTasksLoading(true)
    try {
      const res = await apiClient.get(`/novel/projects/${projectId}/tasks`, { signal: request.signal })
      if (requestGateRef.current?.isCurrent(request, projectId)) {
        setProductionRefresh(state => workspaceTaskRefreshSucceeded(state, res.data || null))
      }
    } catch (error) {
      if (requestGateRef.current?.isCurrent(request, projectId)) {
        setProductionRefresh(state => workspaceTaskRefreshFailed(state, error))
      }
    } finally {
      if (requestGateRef.current?.isCurrent(request, projectId)) setProductionTasksLoading(false)
      requestGateRef.current?.finish(request)
    }
  }, [projectId])

  const loadKnowledgeIngestJobs = useCallback(async () => {
    if (!projectId) return
    const request = requestGateRef.current!.begin('knowledge', projectId)
    if (!request) return
    setKnowledgeRefresh(workspaceTaskRefreshStarted)
    setKnowledgeJobsLoading(true)
    try {
      const res = await apiClient.get('/knowledge/ingest', { signal: request.signal })
      if (requestGateRef.current?.isCurrent(request, projectId)) {
        setKnowledgeRefresh(state => workspaceTaskRefreshSucceeded(state, Array.isArray(res.data?.jobs) ? res.data.jobs : []))
      }
    } catch (error) {
      if (requestGateRef.current?.isCurrent(request, projectId)) {
        setKnowledgeRefresh(state => workspaceTaskRefreshFailed(state, error))
      }
    } finally {
      if (requestGateRef.current?.isCurrent(request, projectId)) setKnowledgeJobsLoading(false)
      requestGateRef.current?.finish(request)
    }
  }, [projectId])

  const pauseKnowledgeIngestJob = useCallback(async (jobId: string) => {
    await apiClient.post(`/knowledge/ingest/${jobId}/pause`)
    await loadKnowledgeIngestJobs()
  }, [loadKnowledgeIngestJobs])

  const resumeKnowledgeIngestJob = useCallback(async (jobId: string) => {
    await apiClient.post(`/knowledge/ingest/${jobId}/resume`, { model_id: selectedModelId })
    await loadKnowledgeIngestJobs()
  }, [loadKnowledgeIngestJobs, selectedModelId])

  const cancelKnowledgeIngestJob = useCallback(async (jobId: string) => {
    await apiClient.post(`/knowledge/ingest/${jobId}/cancel`)
    await loadKnowledgeIngestJobs()
  }, [loadKnowledgeIngestJobs])

  useEffect(() => {
    knowledgeRefreshRef.current = knowledgeRefresh
  }, [knowledgeRefresh])

  useEffect(() => {
    productionRefreshRef.current = productionRefresh
  }, [productionRefresh])

  useEffect(() => {
    requestGateRef.current?.invalidate()
    setKnowledgeRefresh({ data: [], confirmed: false, error: null, failures: 0 })
    setProductionRefresh({ data: null, confirmed: false, error: null, failures: 0 })
    setKnowledgeJobsLoading(false)
    setProductionTasksLoading(false)
    return () => requestGateRef.current?.invalidate()
  }, [projectId])

  useEffect(() => {
    if (!taskCenterOpen) {
      requestGateRef.current?.invalidate()
      setKnowledgeJobsLoading(false)
      setProductionTasksLoading(false)
    }
  }, [taskCenterOpen])

  useEffect(() => {
    if (!taskCenterOpen) return
    void loadProductionTasks()
    void loadKnowledgeIngestJobs()
  }, [taskCenterOpen, loadKnowledgeIngestJobs, loadProductionTasks])

  const hasLocalActiveTask = stepOutlineLoading
    || stepProseLoading
    || stepRepairLoading
    || planning
    || executingAgents
    || generatingProse
  const pollingIntervalMs = workspaceTaskPollingIntervalMs({
    taskCenterOpen,
    productionTasks,
    knowledgeIngestJobs,
    hasLocalActiveTask,
    productionRefreshConfirmed: productionRefresh.confirmed,
    knowledgeRefreshConfirmed: knowledgeRefresh.confirmed,
    productionRefreshFailures: productionRefresh.failures,
    knowledgeRefreshFailures: knowledgeRefresh.failures,
  })

  useEffect(() => {
    if (pollingIntervalMs === null) return
    const timer = setInterval(() => {
      const knowledgeState = knowledgeRefreshRef.current
      const productionState = productionRefreshRef.current
      if (!knowledgeState.confirmed || workspaceHasLiveKnowledgeJobs(knowledgeState.data)) void loadKnowledgeIngestJobs()
      if (!productionState.confirmed || hasLocalActiveTask || workspaceHasLiveProductionTasks(productionState.data)) void loadProductionTasks()
    }, pollingIntervalMs)
    return () => clearInterval(timer)
  }, [hasLocalActiveTask, loadKnowledgeIngestJobs, loadProductionTasks, pollingIntervalMs])

  const activeTasks = useMemo<WorkspaceActiveTask[]>(() => {
    const tasks: WorkspaceActiveTask[] = []
    if (stepOutlineLoading) {
      tasks.push({ key: 'outline', title: '大纲生成', phase: '执行大纲 Agent 链', detail: '生成总纲、细纲、世界观、角色和连续性预检。' })
    }
    if (stepProseLoading) {
      tasks.push({
        key: 'batch-prose',
        title: '批量生成正文',
        phase: proseProgress.total ? `第 ${proseProgress.current}/${proseProgress.total} 章` : '准备生成',
        progress: proseProgress.total ? (proseProgress.current / proseProgress.total) * 100 : undefined,
        detail: [
          proseBatchStatus?.currentTitle || '',
          `成功 ${proseBatchStatus?.success || 0} 章 · 失败 ${proseBatchStatus?.failed || 0} 章`,
          proseBatchStatus?.lastQuality || '',
          proseBatchStatus?.lastError || '',
        ].filter(Boolean).join('\n'),
        cancelLabel: '停止后续',
        onCancel: onCancelProseBatch,
      })
    }
    if (stepRepairLoading) {
      tasks.push({ key: 'repair-step', title: '连续性修复', phase: '分析并回写修复建议' })
    }
    if (planning) {
      tasks.push({
        key: 'plan',
        title: '全案规划',
        phase: planProgress?.step || planProgress?.message || '流式规划中',
        detail: planProgress ? JSON.stringify(planProgress) : '',
      })
    }
    if (executingAgents) {
      tasks.push({ key: 'agents', title: 'Agent 链执行', phase: '执行小说 Agent 工作流' })
    }
    if (generatingProse) {
      tasks.push({
        key: 'current-prose',
        title: '当前章节正文生成',
        phase: streamingProgress || '生成中',
        progress: streamingPercent,
        detail: activeChapter ? `第 ${activeChapter.chapter_no} 章《${displayValue(activeChapter.title)}》` : '',
      })
    }
    return tasks
  }, [
    stepOutlineLoading,
    stepProseLoading,
    stepRepairLoading,
    proseProgress,
    proseBatchStatus,
    planning,
    planProgress,
    executingAgents,
    generatingProse,
    streamingProgress,
    streamingPercent,
    activeChapter,
    onCancelProseBatch,
  ])

  const activeKnowledgeJobCount = useMemo(
    () => knowledgeIngestJobs.filter(job => ['queued', 'running'].includes(String(job.status || ''))).length,
    [knowledgeIngestJobs],
  )

  return {
    activeTasks,
    activeKnowledgeJobCount,
    productionTasks,
    productionTasksLoading,
    productionTasksError: productionRefresh.error,
    loadProductionTasks,
    knowledgeIngestJobs,
    knowledgeJobsLoading,
    knowledgeJobsError: knowledgeRefresh.error,
    loadKnowledgeIngestJobs,
    pauseKnowledgeIngestJob,
    resumeKnowledgeIngestJob,
    cancelKnowledgeIngestJob,
  }
}
