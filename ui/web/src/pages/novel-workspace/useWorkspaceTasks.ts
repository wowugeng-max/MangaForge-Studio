import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import apiClient from '../../api/client'
import type { WorkspaceActiveTask } from './TaskCenterDrawer'
import { displayValue } from './utils'

export function useWorkspaceTasks({
  taskCenterOpen,
  selectedModelId,
  stepOutlineLoading,
  stepProseLoading,
  stepRepairLoading,
  proseProgress,
  planning,
  planProgress,
  executingAgents,
  generatingProse,
  streamingProgress,
  streamingPercent,
  activeChapter,
}: {
  taskCenterOpen: boolean
  selectedModelId?: number
  stepOutlineLoading: boolean
  stepProseLoading: boolean
  stepRepairLoading: boolean
  proseProgress: { current: number; total: number }
  planning: boolean
  planProgress: any
  executingAgents: boolean
  generatingProse: boolean
  streamingProgress: string
  streamingPercent: number
  activeChapter: any | null
}) {
  const [knowledgeIngestJobs, setKnowledgeIngestJobs] = useState<any[]>([])
  const [knowledgeJobsLoading, setKnowledgeJobsLoading] = useState(false)
  const knowledgeIngestJobsRef = useRef<any[]>([])

  const loadKnowledgeIngestJobs = useCallback(async () => {
    setKnowledgeJobsLoading(true)
    try {
      const res = await apiClient.get('/knowledge/ingest')
      setKnowledgeIngestJobs(Array.isArray(res.data?.jobs) ? res.data.jobs : [])
    } catch {
      setKnowledgeIngestJobs([])
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
    knowledgeIngestJobsRef.current = knowledgeIngestJobs
  }, [knowledgeIngestJobs])

  useEffect(() => {
    if (!taskCenterOpen) return
    void loadKnowledgeIngestJobs()
    const timer = setInterval(() => {
      const hasLiveJob = knowledgeIngestJobsRef.current.some(job => ['queued', 'running'].includes(String(job.status || '')))
      if (hasLiveJob) void loadKnowledgeIngestJobs()
    }, 3500)
    return () => clearInterval(timer)
  }, [taskCenterOpen, loadKnowledgeIngestJobs])

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
    planning,
    planProgress,
    executingAgents,
    generatingProse,
    streamingProgress,
    streamingPercent,
    activeChapter,
  ])

  const activeKnowledgeJobCount = useMemo(
    () => knowledgeIngestJobs.filter(job => ['queued', 'running'].includes(String(job.status || ''))).length,
    [knowledgeIngestJobs],
  )

  return {
    activeTasks,
    activeKnowledgeJobCount,
    knowledgeIngestJobs,
    knowledgeJobsLoading,
    loadKnowledgeIngestJobs,
    pauseKnowledgeIngestJob,
    resumeKnowledgeIngestJob,
    cancelKnowledgeIngestJob,
  }
}
