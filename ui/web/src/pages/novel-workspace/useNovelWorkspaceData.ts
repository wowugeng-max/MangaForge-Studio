import { useCallback, useEffect, useMemo, useState } from 'react'
import { message } from 'antd'
import apiClient from '../../api/client'
import {
  buildChapterTreeData,
  buildTree,
  wc,
} from './utils'

export type ChapterStatusFilter = 'all' | 'written' | 'unwritten' | 'placeholder'
export type ChapterSortMode = 'chapter_no_asc' | 'chapter_no_desc' | 'word_count_desc' | 'title_asc'

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
  const [chapters, setChapters] = useState<any[]>([])
  const [runRecords, setRunRecords] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [agentExecution, setAgentExecution] = useState<any | null>(null)
  const [models, setModels] = useState<any[]>([])
  const [selectedModelId, setSelectedModelId] = useState<number | undefined>()
  const [activeChapterId, setActiveChapterId] = useState<number | null>(null)

  const loadProjectModules = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [pr, wr, cr, olr, chr, rnr, revr, mr] = await Promise.all([
        apiClient.get(`/novel/projects/${projectId}`),
        apiClient.get(`/novel/projects/${projectId}/worldbuilding`),
        apiClient.get(`/novel/projects/${projectId}/characters`),
        apiClient.get(`/novel/projects/${projectId}/outlines`),
        apiClient.get(`/novel/projects/${projectId}/chapters`),
        apiClient.get('/novel/runs', { params: { project_id: projectId } }),
        apiClient.get(`/novel/projects/${projectId}/reviews`),
        apiClient.get('/models').catch(() => ({ data: [] })),
      ])
      const nextChapters = Array.isArray(chr.data) ? chr.data : []
      const nextModels = Array.isArray(mr.data) ? mr.data : []
      const nextReviews = Array.isArray(revr.data) ? revr.data : []

      setSelectedProject(pr.data || null)
      setWorldbuilding(Array.isArray(wr.data) ? wr.data : [])
      setCharacters(Array.isArray(cr.data) ? cr.data : [])
      setOutlines(Array.isArray(olr.data) ? olr.data : [])
      setChapters(nextChapters)
      setRunRecords(Array.isArray(rnr.data) ? rnr.data : [])
      setReviews(nextReviews)
      setAgentExecution(null)
      setModels(nextModels)
      setSelectedModelId(prev => prev || (nextModels.find((m: any) => m.is_favorite)?.id || nextModels[0]?.id))
      const act = nextChapters.find?.((c: any) => c.chapter_text) || nextChapters[0] || null
      setActiveChapterId(act?.id || null)
    } catch {
      message.error('无法加载项目工作台')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void loadProjectModules()
  }, [loadProjectModules])

  const activeChapter = useMemo(
    () => chapters.find(c => c.id === activeChapterId) || null,
    [chapters, activeChapterId],
  )

  const chapterTree = useMemo(() => buildTree(outlines, chapters), [outlines, chapters])
  const chapterTreeData = useMemo(() => buildChapterTreeData(chapterTree), [chapterTree])
  const proseChapters = useMemo(() => chapters.filter(ch => ch.chapter_text), [chapters])

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
      const isWritten = !!text && !isPlaceholder
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
        || (chapterStatusFilter === 'unwritten' && !text)
        || (chapterStatusFilter === 'placeholder' && isPlaceholder)

      return matchesKeyword && matchesStatus
    })

    const sorted = [...filtered]
    if (chapterSortMode === 'chapter_no_desc') sorted.sort((a, b) => b.chapter_no - a.chapter_no)
    else if (chapterSortMode === 'word_count_desc') sorted.sort((a, b) => wc(b.chapter_text) - wc(a.chapter_text))
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
