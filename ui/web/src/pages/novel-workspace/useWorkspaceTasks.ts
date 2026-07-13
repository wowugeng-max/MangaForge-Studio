import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import apiClient from '../../api/client'
import type { WorkspaceActiveTask } from './TaskCenterDrawer'
import { displayValue } from './utils'

const ACTIVE_POLLING_STATUSES = new Set(['queued', 'ready', 'running', 'pending', 'in_progress', 'processing'])

export type WorkspaceTaskRefreshState<T> = {
  data: T
  confirmed: boolean
  error: string | null
}

export function workspaceTaskRefreshStarted<T>(state: WorkspaceTaskRefreshState<T>): WorkspaceTaskRefreshState<T> {
  return { ...state, confirmed: false }
}

export function workspaceTaskRefreshSucceeded<T>(_state: WorkspaceTaskRefreshState<T>, data: T): WorkspaceTaskRefreshState<T> {
  return { data, confirmed: true, error: null }
}

export function workspaceTaskRefreshFailed<T>(state: WorkspaceTaskRefreshState<T>, error: unknown): WorkspaceTaskRefreshState<T> {
  return {
    ...state,
    confirmed: false,
    error: error instanceof Error ? error.message : String(error || '任务刷新失败'),
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
}: {
  taskCenterOpen: boolean
  productionTasks: any
  knowledgeIngestJobs: any[]
  hasLocalActiveTask: boolean
  productionRefreshConfirmed?: boolean
  knowledgeRefreshConfirmed?: boolean
}) {
  if (!taskCenterOpen) return null
  return !productionRefreshConfirmed
    || !knowledgeRefreshConfirmed
    || hasLocalActiveTask
    || workspaceHasLiveProductionTasks(productionTasks)
    || workspaceHasLiveKnowledgeJobs(knowledgeIngestJobs)
    ? 3500
    : null
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
  })
  const [knowledgeJobsLoading, setKnowledgeJobsLoading] = useState(false)
  const [productionRefresh, setProductionRefresh] = useState<WorkspaceTaskRefreshState<any | null>>({
    data: null,
    confirmed: false,
    error: null,
  })
  const [productionTasksLoading, setProductionTasksLoading] = useState(false)
  const knowledgeRefreshRef = useRef(knowledgeRefresh)
  const productionRefreshRef = useRef(productionRefresh)
  const knowledgeIngestJobs = knowledgeRefresh.data
  const productionTasks = productionRefresh.data

  const loadProductionTasks = useCallback(async () => {
    if (!projectId) return
    setProductionRefresh(workspaceTaskRefreshStarted)
    setProductionTasksLoading(true)
    try {
      const res = await apiClient.get(`/novel/projects/${projectId}/tasks`)
      setProductionRefresh(state => workspaceTaskRefreshSucceeded(state, res.data || null))
    } catch (error) {
      setProductionRefresh(state => workspaceTaskRefreshFailed(state, error))
    } finally {
      setProductionTasksLoading(false)
    }
  }, [projectId])

  const loadKnowledgeIngestJobs = useCallback(async () => {
    setKnowledgeRefresh(workspaceTaskRefreshStarted)
    setKnowledgeJobsLoading(true)
    try {
      const res = await apiClient.get('/knowledge/ingest')
      setKnowledgeRefresh(state => workspaceTaskRefreshSucceeded(state, Array.isArray(res.data?.jobs) ? res.data.jobs : []))
    } catch (error) {
      setKnowledgeRefresh(state => workspaceTaskRefreshFailed(state, error))
    } finally {
      setKnowledgeJobsLoading(false)
    }
  }, [])

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
