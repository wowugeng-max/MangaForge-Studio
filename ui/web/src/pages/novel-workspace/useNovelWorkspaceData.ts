import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { message } from 'antd'
import apiClient from '../../api/client'
import {
  buildChapterTreeData,
  buildTree,
  wc,
} from './utils'
import {
  applyWorkspaceDetailResults,
  createWorkspaceDetailCache,
  selectChapterWorkingSet,
  selectAutomaticChapterDetailRecords,
  selectReviewDetailIds,
  selectRunDetailIds,
  type WorkspaceDetailKind,
  type WorkspaceDetailResult,
} from './workspaceDetailCache'
import { clearWorkspacePayloadParseCache } from './payloadParseCache'

export type ChapterStatusFilter = 'all' | 'written' | 'unwritten' | 'placeholder'
export type ChapterSortMode = 'chapter_no_asc' | 'chapter_no_desc' | 'word_count_desc' | 'title_asc'

export function initialWorkspaceRequestPlan(projectId: number) {
  return [
    { key: 'chapters', url: `/novel/projects/${projectId}/chapters`, params: { view: 'workspace' } },
    { key: 'runs', url: '/novel/runs', params: { project_id: projectId, view: 'summary' } },
    { key: 'reviews', url: `/novel/projects/${projectId}/reviews`, params: { view: 'summary' } },
  ] as Array<{ key: string; url: string; params?: Record<string, any> }>
}

export function createWorkspaceRequestEpoch() {
  let current = 0
  return {
    begin: () => {
      current += 1
      return current
    },
    invalidate: () => {
      current += 1
    },
    isCurrent: (token: number) => token === current,
  }
}

const CHAPTER_WORKSPACE_FIELDS = [
  'id',
  'project_id',
  'outline_id',
  'chapter_no',
  'title',
  'chapter_goal',
  'chapter_summary',
  'conflict',
  'ending_hook',
  'timeline_note',
  'status',
  'version',
  'published_at',
  'created_at',
  'updated_at',
  'has_prose',
  'has_scene_plan',
  'word_count',
] as const

function compactChapterWorkspaceRecord(record: any) {
  const compact: Record<string, any> = {}
  for (const field of CHAPTER_WORKSPACE_FIELDS) {
    if (record?.[field] !== undefined) compact[field] = record[field]
  }
  const text = String(record?.chapter_text || '')
  const hasSceneArrays = Array.isArray(record?.scene_breakdown) || Array.isArray(record?.scene_list)
  const compactText = text.replace(/\s/g, '')
  compact.has_prose = text
    ? Boolean(compactText && !text.includes('【占位正文】'))
    : Boolean(record?.has_prose || Number(record?.word_count || 0) > 0)
  compact.word_count = text ? compactText.length : Number(record?.word_count || 0)
  compact.has_scene_plan = hasSceneArrays
    ? Boolean(
        (Array.isArray(record?.scene_breakdown) && record.scene_breakdown.length > 0)
          || (Array.isArray(record?.scene_list) && record.scene_list.length > 0)
      )
    : Boolean(record?.has_scene_plan)
  return compact
}

function detailVersion(kind: WorkspaceDetailKind, record: any) {
  if (kind === 'chapter') return String(record?.updated_at || record?.version || record?.word_count || '')
  if (kind === 'review') return `${record?.created_at || ''}:${record?.payload_bytes || 0}:${record?.status || ''}`
  return `${record?.created_at || ''}:${record?.status || ''}:${record?.output_bytes || 0}:${record?.error_message || ''}`
}

export function resolveSelectedWorkspaceModelId(currentId: number | undefined, models: any[]) {
  if (!Array.isArray(models) || models.length === 0) return undefined
  if (currentId && models.some((model: any) => Number(model.id) === Number(currentId))) return currentId
  return models.find((model: any) => model.is_favorite)?.id || models[0]?.id
}

export function resolveActiveWorkspaceChapterId(currentId: number | null, chapters: any[]) {
  if (!Array.isArray(chapters) || chapters.length === 0) return null
  if (currentId && chapters.some((chapter: any) => Number(chapter.id) === Number(currentId))) return currentId
  const fallback = chapters.find?.((chapter: any) => Boolean(chapter?.has_prose) || Number(chapter?.word_count || 0) > 0 || Boolean(chapter?.chapter_text)) || chapters[0] || null
  return fallback?.id || null
}

export function workspaceDetailsBelongToProject(projectId: number | null | undefined, selectedProject: any) {
  return Boolean(projectId && Number(selectedProject?.id || 0) === Number(projectId))
}

export function useNovelWorkspaceData({
  projectId,
  chapterSearch,
  chapterStatusFilter,
  chapterSortMode,
}: {
  projectId: number
  chapterSearch: string
  chapterStatusFilter: ChapterStatusFilter
  chapterSortMode: ChapterSortMode
}) {
  const [loading, setLoading] = useState(false)
  const [selectedProject, setSelectedProject] = useState<any | null>(null)
  const [worldbuilding, setWorldbuilding] = useState<any[]>([])
  const [characters, setCharacters] = useState<any[]>([])
  const [outlines, setOutlines] = useState<any[]>([])
  const [chapterSummaries, setChapterSummaries] = useState<any[]>([])
  const [runSummaries, setRunSummaries] = useState<any[]>([])
  const [reviewSummaries, setReviewSummaries] = useState<any[]>([])
  const [chapterDetailResults, setChapterDetailResults] = useState<WorkspaceDetailResult[]>([])
  const [reviewDetailResults, setReviewDetailResults] = useState<WorkspaceDetailResult[]>([])
  const [runDetailResults, setRunDetailResults] = useState<WorkspaceDetailResult[]>([])
  const [agentExecution, setAgentExecution] = useState<any | null>(null)
  const [pipeline, setPipeline] = useState<any | null>(null)
  const [models, setModels] = useState<any[]>([])
  const [selectedModelId, setSelectedModelId] = useState<number | undefined>()
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null)
  const projectIdRef = useRef(projectId)
  projectIdRef.current = projectId
  const chapterDetailEpochRef = useRef(0)
  const reviewDetailEpochRef = useRef(0)
  const runDetailEpochRef = useRef(0)
  const chaptersRef = useRef<any[]>([])
  const projectLoadEpochRef = useRef<ReturnType<typeof createWorkspaceRequestEpoch> | null>(null)
  const projectLoadAbortRef = useRef<AbortController | null>(null)
  const detailCacheRef = useRef<ReturnType<typeof createWorkspaceDetailCache> | null>(null)
  if (!projectLoadEpochRef.current) projectLoadEpochRef.current = createWorkspaceRequestEpoch()
  if (!detailCacheRef.current) {
    detailCacheRef.current = createWorkspaceDetailCache(async (kind, id) => {
      const url = kind === 'chapter'
        ? `/novel/chapters/${id}`
        : kind === 'review'
          ? `/novel/reviews/${id}`
          : `/novel/runs/${id}`
      const response = await apiClient.get(url, { params: { project_id: projectIdRef.current } })
      return response.data
    })
  }

  const loadProjectModules = useCallback(async () => {
    if (!projectId) return
    projectLoadAbortRef.current?.abort()
    const controller = new AbortController()
    projectLoadAbortRef.current = controller
    const requestEpoch = projectLoadEpochRef.current!.begin()
    setLoading(true)
    try {
      const requestPlan = initialWorkspaceRequestPlan(projectId)
      const compactRequest = (key: string) => {
        const request = requestPlan.find(item => item.key === key)
        if (!request) throw new Error(`workspace request missing: ${key}`)
        return apiClient.get(request.url, { params: request.params, signal: controller.signal })
      }
      const [pr, wr, cr, olr, chr, rnr, revr, plr, mr] = await Promise.all([
        apiClient.get(`/novel/projects/${projectId}`, { signal: controller.signal }),
        apiClient.get(`/novel/projects/${projectId}/worldbuilding`, { signal: controller.signal }),
        apiClient.get(`/novel/projects/${projectId}/characters`, { signal: controller.signal }),
        apiClient.get(`/novel/projects/${projectId}/outlines`, { signal: controller.signal }),
        compactRequest('chapters'),
        compactRequest('runs'),
        compactRequest('reviews'),
        apiClient.get(`/novel/projects/${projectId}/pipeline`, { signal: controller.signal }).catch(() => ({ data: null })),
        apiClient.get('/models', { signal: controller.signal }).catch(() => ({ data: [] })),
      ])
      if (!projectLoadEpochRef.current?.isCurrent(requestEpoch) || controller.signal.aborted) return
      const nextChapters = Array.isArray(chr.data) ? chr.data.map(compactChapterWorkspaceRecord) : []
      const nextModels = Array.isArray(mr.data) ? mr.data : []
      const nextReviews = Array.isArray(revr.data) ? revr.data : []

      setSelectedProject(pr.data || null)
      setWorldbuilding(Array.isArray(wr.data) ? wr.data : [])
      setCharacters(Array.isArray(cr.data) ? cr.data : [])
      setOutlines(Array.isArray(olr.data) ? olr.data : [])
      chapterDetailEpochRef.current += 1
      reviewDetailEpochRef.current += 1
      runDetailEpochRef.current += 1
      setChapterDetailResults([])
      setReviewDetailResults([])
      setRunDetailResults([])
      setChapterSummaries(nextChapters)
      setRunSummaries(Array.isArray(rnr.data) ? rnr.data : [])
      setReviewSummaries(nextReviews)
      setAgentExecution(null)
      setPipeline(plr.data?.pipeline || null)
      setModels(nextModels)
      setSelectedModelId(prev => resolveSelectedWorkspaceModelId(prev, nextModels))
      setActiveChapterId(prev => resolveActiveWorkspaceChapterId(prev, nextChapters))
    } catch {
      if (projectLoadEpochRef.current?.isCurrent(requestEpoch) && !controller.signal.aborted) {
        message.error('无法加载项目工作台')
      }
    } finally {
      if (projectLoadEpochRef.current?.isCurrent(requestEpoch) && !controller.signal.aborted) setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void loadProjectModules()
    return () => {
      projectLoadAbortRef.current?.abort()
      projectLoadEpochRef.current?.invalidate()
    }
  }, [loadProjectModules])

  useEffect(() => {
    detailCacheRef.current?.clear()
    clearWorkspacePayloadParseCache()
    chapterDetailEpochRef.current += 1
    reviewDetailEpochRef.current += 1
    runDetailEpochRef.current += 1
    setChapterDetailResults([])
    setReviewDetailResults([])
    setRunDetailResults([])
    setSelectedProject(null)
    setWorldbuilding([])
    setCharacters([])
    setOutlines([])
    setChapterSummaries([])
    setRunSummaries([])
    setReviewSummaries([])
    setAgentExecution(null)
    setPipeline(null)
    setModels([])
    setSelectedModelId(undefined)
    setActiveChapterId(null)
    setLoading(Boolean(projectId))
    return () => {
      clearWorkspacePayloadParseCache()
    }
  }, [projectId])

  const chapterWorkingSet = useMemo(
    () => selectAutomaticChapterDetailRecords(chapterSummaries, activeChapterId, 12),
    [chapterSummaries, activeChapterId],
  )

  useEffect(() => {
    const epoch = ++chapterDetailEpochRef.current
    setChapterDetailResults([])
    if (!workspaceDetailsBelongToProject(projectId, selectedProject)) return
    if (chapterWorkingSet.length === 0) return
    void detailCacheRef.current?.loadMany('chapter', chapterWorkingSet.map(record => ({
      id: Number(record.id),
      version: detailVersion('chapter', record),
    }))).then(results => {
      if (epoch === chapterDetailEpochRef.current) setChapterDetailResults(results)
    })
  }, [projectId, selectedProject, chapterWorkingSet])

  useEffect(() => {
    const epoch = ++reviewDetailEpochRef.current
    setReviewDetailResults([])
    if (!workspaceDetailsBelongToProject(projectId, selectedProject)) return
    const ids = selectReviewDetailIds(reviewSummaries, chapterWorkingSet)
    if (ids.length === 0) return
    const byId = new Map(reviewSummaries.map(record => [Number(record?.id || 0), record]))
    void detailCacheRef.current?.loadMany('review', ids.map(id => ({
      id,
      version: detailVersion('review', byId.get(id)),
    }))).then(results => {
      if (epoch === reviewDetailEpochRef.current) setReviewDetailResults(results)
    })
  }, [projectId, selectedProject, reviewSummaries, chapterWorkingSet])

  useEffect(() => {
    const epoch = ++runDetailEpochRef.current
    setRunDetailResults([])
    if (!workspaceDetailsBelongToProject(projectId, selectedProject)) return
    const ids = selectRunDetailIds(runSummaries)
    if (ids.length === 0) return
    const byId = new Map(runSummaries.map(record => [Number(record?.id || 0), record]))
    void detailCacheRef.current?.loadMany('run', ids.map(id => ({
      id,
      version: detailVersion('run', byId.get(id)),
    }))).then(results => {
      if (epoch === runDetailEpochRef.current) setRunDetailResults(results)
    })
  }, [projectId, selectedProject, runSummaries])

  const chapters = useMemo(
    () => applyWorkspaceDetailResults(chapterSummaries, chapterDetailResults),
    [chapterSummaries, chapterDetailResults],
  )
  const reviews = useMemo(
    () => applyWorkspaceDetailResults(reviewSummaries, reviewDetailResults),
    [reviewSummaries, reviewDetailResults],
  )
  const runRecords = useMemo(
    () => applyWorkspaceDetailResults(runSummaries, runDetailResults),
    [runSummaries, runDetailResults],
  )

  useEffect(() => {
    chaptersRef.current = chapters
  }, [chapters])

  const setChapters = useCallback((update: any) => {
    const current = chaptersRef.current
    const next = typeof update === 'function' ? update(current) : update
    if (!Array.isArray(next)) return
    const normalizedNext = next.map(record => ({ ...record, ...compactChapterWorkspaceRecord(record) }))
    chaptersRef.current = normalizedNext
    setChapterSummaries(normalizedNext.map(compactChapterWorkspaceRecord))
    const byId = new Map(normalizedNext.map(record => [Number(record?.id || 0), record]))
    setChapterDetailResults(currentResults => currentResults.map(result => (
      result.status === 'ready' && byId.has(result.id)
        ? { ...result, record: byId.get(result.id) }
        : result
    )))
  }, [])

  const activeChapter = useMemo(
    () => chapters.find(c => c.id === activeChapterId) || null,
    [chapters, activeChapterId],
  )

  const chapterTree = useMemo(() => buildTree(outlines, chapters), [outlines, chapters])
  const chapterTreeData = useMemo(() => buildChapterTreeData(chapterTree), [chapterTree])
  const proseChapters = useMemo(() => chapters.filter(ch => Boolean(ch?.has_prose) || Number(ch?.word_count || 0) > 0 || Boolean(ch?.chapter_text)), [chapters])

  const referenceSummary = useMemo(() => {
    const refs = Array.isArray(selectedProject?.reference_config?.references)
      ? selectedProject.reference_config.references.filter((item: any) => String(item?.project_title || '').trim())
      : []
    const strength = selectedProject?.reference_config?.strength || 'balanced'
    const strengthLabel = strength === 'light' ? '轻参考' : strength === 'strong' ? '强参考' : '中参考'
    return { count: refs.length, strengthLabel }
  }, [selectedProject?.reference_config])

  const referenceReports = useMemo(() => (
    reviews
      .filter((item: any) => item.review_type === 'reference_report')
      .slice()
      .sort((a: any, b: any) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
  ), [reviews])

  const isEmptyProject = useMemo(() => (
    !loading &&
    selectedProject !== null &&
    worldbuilding.length === 0 &&
    characters.length === 0 &&
    outlines.length === 0 &&
    chapters.length === 0
  ), [loading, selectedProject, worldbuilding.length, characters.length, outlines.length, chapters.length])

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.chapter_no - b.chapter_no),
    [chapters],
  )

  const filteredChapters = useMemo(() => {
    const keyword = chapterSearch.trim().toLowerCase()
    const filtered = sortedChapters.filter((ch) => {
      const text = String(ch.chapter_text || '')
      const isPlaceholder = text.includes('【占位正文】')
      const isWritten = !isPlaceholder && (Boolean(ch?.has_prose) || Number(ch?.word_count || 0) > 0 || Boolean(text))
      const matchesKeyword = !keyword || [
        ch.title,
        ch.chapter_summary,
        ch.chapter_goal,
        ch.conflict,
        ch.ending_hook,
        `第${ch.chapter_no}章`,
      ].some((value) => String(value || '').toLowerCase().includes(keyword))

      const matchesStatus = chapterStatusFilter === 'all'
        || (chapterStatusFilter === 'written' && isWritten)
        || (chapterStatusFilter === 'unwritten' && !isWritten)
        || (chapterStatusFilter === 'placeholder' && isPlaceholder)

      return matchesKeyword && matchesStatus
    })

    const sorted = [...filtered]
    if (chapterSortMode === 'chapter_no_desc') sorted.sort((a, b) => b.chapter_no - a.chapter_no)
    else if (chapterSortMode === 'word_count_desc') sorted.sort((a, b) => Number(b?.word_count || wc(b.chapter_text)) - Number(a?.word_count || wc(a.chapter_text)))
    else if (chapterSortMode === 'title_asc') sorted.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'zh-CN'))
    else sorted.sort((a, b) => a.chapter_no - b.chapter_no)

    return sorted
  }, [sortedChapters, chapterSearch, chapterStatusFilter, chapterSortMode])

  return {
    loading,
    selectedProject,
    setSelectedProject,
    worldbuilding,
    characters,
    outlines,
    chapters,
    setChapters,
    runRecords,
    reviews,
    agentExecution,
    setAgentExecution,
    pipeline,
    models,
    selectedModelId,
    setSelectedModelId,
    activeChapterId,
    setActiveChapterId,
    activeChapter,
    loadProjectModules,
    chapterTreeData,
    proseChapters,
    referenceSummary,
    referenceReports,
    isEmptyProject,
    sortedChapters,
    filteredChapters,
  }
}
