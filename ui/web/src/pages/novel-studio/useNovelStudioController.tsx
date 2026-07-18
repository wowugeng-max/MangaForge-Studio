import React, { useEffect, useMemo, useRef, useState } from 'react'
import { message, Modal, Tag } from 'antd'
import { useNavigate, useSearchParams } from 'react-router-dom'
import apiClient from '../../api/client'
import { buildNovelLobbyModel } from '../novel-lobby/novelLobbyModel'
import {
  formatKnowledgeCategory as formatKnowledgeCategoryShared,
  formatProjectScope,
  formatSource,
  getBatchStatusColor,
  getIngestStatusColor,
  getSourceCacheColor,
  getSourceCacheLabel,
  knowledgeCategoryPresets,
  knowledgeExtractModelStorageKey,
  knowledgeIngestJobStorageKey,
  truncateText,
} from './knowledge-ui-shared'

export function useNovelStudioController() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [searchText, setSearchText] = useState('')

  const [knowledgeOpen, setKnowledgeOpen] = useState(false)
  const [knowledgeLoading, setKnowledgeLoading] = useState(false)
  const [knowledgeBulkDeleting, setKnowledgeBulkDeleting] = useState(false)
  const [knowledgeEntries, setKnowledgeEntries] = useState<any[]>([])
  const [knowledgeSummary, setKnowledgeSummary] = useState<Record<string, { label: string; count: number }>>({})
  const [knowledgeSearch, setKnowledgeSearch] = useState('')
  const [knowledgeCategory, setKnowledgeCategory] = useState('')
  const [knowledgeProjectTitle, setKnowledgeProjectTitle] = useState('')
  const [knowledgeProjectDraft, setKnowledgeProjectDraft] = useState('')
  const [knowledgeProjectOptions, setKnowledgeProjectOptions] = useState<{ value: string; label: string }[]>([])
  const [knowledgeLoadedOnce, setKnowledgeLoadedOnce] = useState(false)
  const [knowledgeQuery, setKnowledgeQuery] = useState('')
  const [knowledgeQueryLoading, setKnowledgeQueryLoading] = useState(false)
  const [knowledgeQueryResults, setKnowledgeQueryResults] = useState<any[]>([])
  const [knowledgeDetailEntry, setKnowledgeDetailEntry] = useState<any | null>(null)
  const [memoryPalaceOpen, setMemoryPalaceOpen] = useState(false)
  const [sourceCacheOpen, setSourceCacheOpen] = useState(false)
  const [sourceCacheLoading, setSourceCacheLoading] = useState(false)
  const [sourceCaches, setSourceCaches] = useState<any[]>([])
  const [sourceCacheSearch, setSourceCacheSearch] = useState('')
  const [selectedSourceCacheKey, setSelectedSourceCacheKey] = useState('')
  const [sourceCacheDetail, setSourceCacheDetail] = useState<any | null>(null)
  const [sourceCacheChapter, setSourceCacheChapter] = useState<any | null>(null)
  const [sourceCacheChapterLoading, setSourceCacheChapterLoading] = useState(false)

  const [feedOpen, setFeedOpen] = useState(false)
  const [feedText, setFeedText] = useState('')
  const [feedSource, setFeedSource] = useState('手动投喂')
  const [feedSubmitting, setFeedSubmitting] = useState(false)
  const [feedCategory, setFeedCategory] = useState('writing_style')
  const [feedTitle, setFeedTitle] = useState('')
  const [feedTags, setFeedTags] = useState('')
  const [feedMode, setFeedMode] = useState<'text' | 'url' | 'file'>('text')
  const [feedUrl, setFeedUrl] = useState('')
  const [feedSerialFetch, setFeedSerialFetch] = useState(false)
  const [feedStartChapter, setFeedStartChapter] = useState(1)
  const [feedFullBook, setFeedFullBook] = useState(false)
  const [feedFetchOnly, setFeedFetchOnly] = useState(false)
  const [feedMaxChapters, setFeedMaxChapters] = useState(20)
  const [feedBatchSize, setFeedBatchSize] = useState(10)
  const [feedFetchConcurrency, setFeedFetchConcurrency] = useState(4)
  const [availableModels, setAvailableModels] = useState<any[]>([])
  const [feedModelsLoading, setFeedModelsLoading] = useState(false)
  const [feedModelId, setFeedModelId] = useState<number | undefined>(() => {
    const saved = typeof window === 'undefined' ? '' : window.localStorage.getItem(knowledgeExtractModelStorageKey)
    const parsed = Number(saved || 0)
    return parsed || undefined
  })
  const [feedIngestJob, setFeedIngestJob] = useState<any | null>(null)
  const [feedAnalyzeLoading, setFeedAnalyzeLoading] = useState(false)
  const [feedAnalyzePreviewOpen, setFeedAnalyzePreviewOpen] = useState(false)
  const [feedAnalyzeSource, setFeedAnalyzeSource] = useState('')
  const [feedAnalyzedEntries, setFeedAnalyzedEntries] = useState<any[]>([])
  const [feedAnalyzeSaving, setFeedAnalyzeSaving] = useState(false)
  const [feedReanalyzingBatch, setFeedReanalyzingBatch] = useState<number | null>(null)
  const [feedProjectId, setFeedProjectId] = useState<number | undefined>(undefined)
  const [feedProjectTitle, setFeedProjectTitle] = useState('')
  const [fileReading, setFileReading] = useState(false)
  const [selectedFileName, setSelectedFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const feedAbortControllerRef = useRef<AbortController | null>(null)

  const loadKnowledge = async (
    category?: string,
    projectTitle = knowledgeProjectTitle,
  ) => {
    setKnowledgeLoading(true)
    try {
      const params: Record<string, any> = {}
      if (category) params.category = category
      if (projectTitle.trim()) params.project_title = projectTitle.trim()
      const res = await apiClient.get('/knowledge', {
        params: Object.keys(params).length ? params : undefined,
      })
      setKnowledgeEntries(Array.isArray(res.data?.entries) ? res.data.entries : [])
      setKnowledgeSummary(res.data?.summary && typeof res.data.summary === 'object' ? res.data.summary : {})
      setKnowledgeProjectOptions(Array.isArray(res.data?.projects)
        ? res.data.projects.map((item: any) => ({
            value: String(item.title || ''),
            label: `${item.title || '未命名项目'}${item.count ? ` ${item.count}` : ''}${item.profile_count ? ` / 画像${item.profile_count}` : ''}`,
          })).filter((item: any) => item.value)
        : [])
      setKnowledgeLoadedOnce(true)
    } catch {
      message.error('无法加载知识库')
    } finally {
      setKnowledgeLoading(false)
    }
  }

  const handleDeleteKnowledge = async (id: string) => {
    try {
      await apiClient.delete(`/knowledge/entries/${id}`)
      message.success('知识条目已删除')
      await loadKnowledge(knowledgeCategory || undefined)
      if (knowledgeQueryResults.some(entry => entry.id === id)) {
        setKnowledgeQueryResults(prev => prev.filter(entry => entry.id !== id))
      }
    } catch {
      message.error('删除知识条目失败')
    }
  }

  const handleDeleteVisibleKnowledge = () => {
    const ids = filteredKnowledgeEntries.map(entry => String(entry.id || '').trim()).filter(Boolean)
    if (ids.length === 0) {
      message.info('当前没有可删除的知识条目')
      return
    }
    Modal.confirm({
      title: '清空当前结果',
      content: `将删除当前筛选结果中的 ${ids.length} 条知识。该操作不可撤销。`,
      okText: `删除 ${ids.length} 条`,
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        setKnowledgeBulkDeleting(true)
        try {
          await apiClient.post('/knowledge/entries/purge', { ids })
          message.success(`已删除 ${ids.length} 条知识`)
          setKnowledgeQueryResults(prev => prev.filter(entry => !ids.includes(String(entry.id || ''))))
          await loadKnowledge(knowledgeCategory || undefined)
        } catch {
          message.error('批量删除失败')
        } finally {
          setKnowledgeBulkDeleting(false)
        }
      },
    })
  }

  const handleRefreshKnowledge = async () => {
    await loadKnowledge(knowledgeCategory || undefined)
  }

  const handleQueryKnowledge = async () => {
    const query = knowledgeQuery.trim()
    if (!query) {
      setKnowledgeQueryResults([])
      return
    }
    setKnowledgeQueryLoading(true)
    try {
      const res = await apiClient.post('/knowledge/query', {
        query,
        category: knowledgeCategory || undefined,
        top_k: 8,
        project_title: knowledgeProjectTitle.trim() || undefined,
      })
      setKnowledgeQueryResults(Array.isArray(res.data?.results) ? res.data.results : [])
    } catch {
      message.error('知识检索失败')
    } finally {
      setKnowledgeQueryLoading(false)
    }
  }

  const filteredKnowledgeEntries = knowledgeEntries.filter(entry => {
    const q = knowledgeSearch.trim().toLowerCase()
    if (!q) return true
    return [
      entry.title,
      entry.content,
      entry.source,
      entry.project_title,
      entry.use_case,
      entry.evidence,
      entry.chapter_range,
      ...(Array.isArray(entry.tags) ? entry.tags : []),
      ...(Array.isArray(entry.genre_tags) ? entry.genre_tags : []),
      ...(Array.isArray(entry.trope_tags) ? entry.trope_tags : []),
      ...(Array.isArray(entry.entities) ? entry.entities : []),
    ]
      .filter(Boolean)
      .some((v: any) => String(v).toLowerCase().includes(q))
  })

  const categoryOptions = Object.entries(knowledgeSummary)
    .map(([key, value]) => ({ key, label: value?.label || key, count: Number(value?.count || 0) }))
    .sort((a, b) => b.count - a.count)

  const knowledgeStats = {
    total: knowledgeEntries.length,
    categories: categoryOptions.length,
  }

  const knowledgeCategoryLabel = knowledgeCategory
    ? (knowledgeSummary[knowledgeCategory]?.label || knowledgeCategory)
    : '全部分类'

  const knowledgeProjectLabel = knowledgeProjectTitle || '全部投喂项目'

  const knowledgeCountText = `共 ${filteredKnowledgeEntries.length} / ${knowledgeEntries.length} 条`

  const filteredSourceCaches = useMemo(() => {
    const q = sourceCacheSearch.trim().toLowerCase()
    if (!q) return sourceCaches
    return sourceCaches.filter(cache => [
      cache.project_title,
      cache.source_url,
      cache.canonical_source_url,
      cache.cache_key,
    ].filter(Boolean).some(value => String(value).toLowerCase().includes(q)))
  }, [sourceCaches, sourceCacheSearch])

  const extractionModelOptions = useMemo(() => {
    return availableModels
      .filter(model => {
        const caps = model?.capabilities && typeof model.capabilities === 'object' ? model.capabilities : {}
        const isMediaOnly = caps.text_to_image || caps.image_to_image || caps.text_to_video || caps.image_to_video
        return !isMediaOnly || caps.chat || caps.reasoning || caps.vision
      })
      .sort((a, b) => Number(Boolean(b?.is_favorite)) - Number(Boolean(a?.is_favorite)))
      .map(model => ({
        value: Number(model.id),
        label: `${model.display_name || model.model_name || `模型 #${model.id}`}${model.provider ? ` · ${model.provider}` : ''}`,
      }))
      .filter(option => option.value)
  }, [availableModels])

  const knowledgePanelFromUrl = searchParams.get('panel') === 'knowledge'
  const memoryPalacePanelFromUrl = searchParams.get('panel') === 'memory-palace'
  const sourceCachePanelFromUrl = searchParams.get('panel') === 'source-cache'
  const knowledgeActionFromUrl = searchParams.get('action')
  const knowledgeProjectFromUrl = searchParams.get('project_title') || ''
  const sourceCacheProjectFromUrl = searchParams.get('project_title') || ''

  useEffect(() => {
    if (knowledgePanelFromUrl && !knowledgeOpen) {
      setKnowledgeOpen(true)
    }
    if (!knowledgePanelFromUrl && knowledgeOpen) {
      setKnowledgeOpen(false)
    }
  }, [knowledgePanelFromUrl, knowledgeOpen])

  useEffect(() => {
    if (!knowledgePanelFromUrl) return
    const next = String(knowledgeProjectFromUrl || '').trim()
    if (next && next !== knowledgeProjectTitle) {
      setKnowledgeProjectTitle(next)
      setKnowledgeProjectDraft(next)
      setFeedProjectId(undefined)
      setFeedProjectTitle(next)
    }
  }, [knowledgePanelFromUrl, knowledgeProjectFromUrl])

  useEffect(() => {
    if (memoryPalacePanelFromUrl && !memoryPalaceOpen) {
      setMemoryPalaceOpen(true)
    }
    if (!memoryPalacePanelFromUrl && memoryPalaceOpen) {
      setMemoryPalaceOpen(false)
    }
  }, [memoryPalacePanelFromUrl, memoryPalaceOpen])

  useEffect(() => {
    if (sourceCachePanelFromUrl && !sourceCacheOpen) {
      setSourceCacheOpen(true)
      const title = String(sourceCacheProjectFromUrl || '').trim()
      if (title) setSourceCacheSearch(title)
      void loadSourceCaches(true, title)
    }
    if (!sourceCachePanelFromUrl && sourceCacheOpen) {
      setSourceCacheOpen(false)
    }
  }, [sourceCachePanelFromUrl, sourceCacheOpen, sourceCacheProjectFromUrl])

  useEffect(() => {
    if (knowledgePanelFromUrl && knowledgeActionFromUrl === 'feed' && !feedOpen) {
      setFeedOpen(true)
    }
    if (knowledgeActionFromUrl !== 'feed' && feedOpen) {
      setFeedOpen(false)
    }
  }, [knowledgePanelFromUrl, knowledgeActionFromUrl, feedOpen])

  useEffect(() => {
    if (knowledgeOpen && !knowledgeLoadedOnce) {
      loadKnowledge()
    }
  }, [knowledgeOpen, knowledgeLoadedOnce])

  useEffect(() => {
    if (knowledgeOpen && knowledgeLoadedOnce) {
      loadKnowledge(knowledgeCategory || undefined)
      setKnowledgeQueryResults([])
    }
  }, [knowledgeCategory, knowledgeProjectTitle])

  useEffect(() => {
    if (!knowledgeOpen) {
      setKnowledgeSearch('')
      setKnowledgeQuery('')
      setKnowledgeQueryResults([])
    }
  }, [knowledgeOpen])

  const loadAvailableModels = async () => {
    setFeedModelsLoading(true)
    try {
      const res = await apiClient.get('/models/')
      const models = Array.isArray(res.data) ? res.data : []
      setAvailableModels(models)
      if (feedModelId && !models.some((model: any) => Number(model.id) === Number(feedModelId))) {
        setFeedModelId(undefined)
        if (typeof window !== 'undefined') window.localStorage.removeItem(knowledgeExtractModelStorageKey)
      }
    } catch {
      message.error('无法加载模型列表')
    } finally {
      setFeedModelsLoading(false)
    }
  }

  useEffect(() => {
    if (feedOpen && availableModels.length === 0) {
      loadAvailableModels()
    }
  }, [feedOpen])

  const updateKnowledgeRoute = (next: { panel?: string | null; action?: string | null; projectTitle?: string | null }) => {
    const params = new URLSearchParams(searchParams)
    if (next.panel === null) params.delete('panel')
    else if (next.panel) params.set('panel', next.panel)

    if (next.action === null) params.delete('action')
    else if (next.action) params.set('action', next.action)

    if (next.projectTitle === null) params.delete('project_title')
    else if (next.projectTitle !== undefined) {
      const title = String(next.projectTitle || '').trim()
      if (title) params.set('project_title', title)
      else params.delete('project_title')
    }

    setSearchParams(params, { replace: true })
  }

  const renderKnowledgeTag = (tag: string, idx: number) => (
    <Tag key={`${tag}-${idx}`} bordered={false} color="blue">{tag}</Tag>
  )

  const renderMetaTags = (entry: any) => {
    const items: React.ReactNode[] = []
    if (entry.use_case) items.push(<Tag key="use_case" color="gold" bordered={false}>用途 {entry.use_case}</Tag>)
    if (entry.chapter_range) items.push(<Tag key="chapter_range" bordered={false}>{entry.chapter_range}</Tag>)
    if (typeof entry.confidence === 'number' && entry.confidence > 0) {
      items.push(<Tag key="confidence" bordered={false}>置信 {Math.round(entry.confidence * 100)}%</Tag>)
    }
    if (Array.isArray(entry.genre_tags)) {
      entry.genre_tags.slice(0, 4).forEach((tag: string, idx: number) => {
        items.push(<Tag key={`genre-${idx}-${tag}`} color="cyan" bordered={false}>{tag}</Tag>)
      })
    }
    if (Array.isArray(entry.trope_tags)) {
      entry.trope_tags.slice(0, 4).forEach((tag: string, idx: number) => {
        items.push(<Tag key={`trope-${idx}-${tag}`} color="volcano" bordered={false}>{tag}</Tag>)
      })
    }
    return items
  }

  const formatKnowledgeCategory = (entry: any) => formatKnowledgeCategoryShared(entry, knowledgeSummary)

  const knowledgeEmpty = !knowledgeLoading && filteredKnowledgeEntries.length === 0

  const resetFeedForm = () => {
    setFeedText('')
    setFeedTitle('')
    setFeedTags('')
    setFeedSource('手动投喂')
    setFeedUrl('')
    setFeedSerialFetch(false)
    setFeedStartChapter(1)
    setFeedFullBook(false)
    setFeedFetchOnly(false)
    setFeedMaxChapters(20)
    setFeedBatchSize(10)
    setFeedFetchConcurrency(4)
    setFeedIngestJob(null)
    if (typeof window !== 'undefined') window.localStorage.removeItem(knowledgeIngestJobStorageKey)
    setFeedMode('text')
    setFeedProjectId(undefined)
    setFeedProjectTitle('')
    setSelectedFileName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenKnowledge = () => {
    setKnowledgeOpen(true)
    updateKnowledgeRoute({ panel: 'knowledge', action: null })
  }

  const handleCloseKnowledge = () => {
    setKnowledgeOpen(false)
    setFeedOpen(false)
    updateKnowledgeRoute({ panel: null, action: null, projectTitle: null })
  }

  const handleOpenMemoryPalace = () => {
    setMemoryPalaceOpen(true)
    updateKnowledgeRoute({ panel: 'memory-palace', action: null })
  }

  const handleCloseMemoryPalace = () => {
    setMemoryPalaceOpen(false)
    updateKnowledgeRoute({ panel: null, action: null })
  }

  const loadSourceCacheChapter = async (cacheKey: string, chapterNo: number) => {
    if (!cacheKey || !chapterNo) return
    setSourceCacheChapterLoading(true)
    try {
      const res = await apiClient.get(`/knowledge/source-caches/${cacheKey}/chapters/${chapterNo}`)
      setSourceCacheChapter(res.data?.chapter || null)
    } catch {
      message.error('无法读取缓存章节正文')
    } finally {
      setSourceCacheChapterLoading(false)
    }
  }

  const loadSourceCacheDetail = async (cacheKey: string, preferredChapter?: number) => {
    if (!cacheKey) return
    try {
      const res = await apiClient.get(`/knowledge/source-caches/${cacheKey}`)
      const cache = res.data?.cache || null
      setSourceCacheDetail(cache)
      setSelectedSourceCacheKey(cacheKey)
      const chapterNo = Number(preferredChapter || cache?.chapters?.[0]?.chapter || 0)
      if (chapterNo) {
        await loadSourceCacheChapter(cacheKey, chapterNo)
      } else {
        setSourceCacheChapter(null)
      }
    } catch {
      message.error('无法读取正文缓存目录')
    }
  }

  const loadSourceCaches = async (autoSelect = false, preferredProjectTitle = '') => {
    setSourceCacheLoading(true)
    try {
      const res = await apiClient.get('/knowledge/source-caches')
      const caches = Array.isArray(res.data?.caches) ? res.data.caches : []
      setSourceCaches(caches)
      if (autoSelect && caches.length > 0) {
        const preferredTitle = String(preferredProjectTitle || '').trim().toLowerCase()
        const current = selectedSourceCacheKey
          ? caches.find((item: any) => item.cache_key === selectedSourceCacheKey)
          : null
        const preferred = preferredTitle
          ? caches.find((item: any) => String(item.project_title || '').trim().toLowerCase() === preferredTitle)
          : null
        await loadSourceCacheDetail(current?.cache_key || preferred?.cache_key || caches[0].cache_key)
      } else if (caches.length === 0) {
        setSelectedSourceCacheKey('')
        setSourceCacheDetail(null)
        setSourceCacheChapter(null)
      }
    } catch {
      message.error('无法加载正文缓存')
    } finally {
      setSourceCacheLoading(false)
    }
  }

  const handleOpenSourceCache = () => {
    setSourceCacheOpen(true)
    void loadSourceCaches(true)
    updateKnowledgeRoute({ panel: 'source-cache', action: null })
  }

  const handleCloseSourceCache = () => {
    setSourceCacheOpen(false)
    updateKnowledgeRoute({ panel: null, action: null, projectTitle: null })
  }

  const handleOpenFeed = () => {
    setKnowledgeOpen(true)
    if (knowledgeProjectTitle) {
      setFeedProjectId(undefined)
      setFeedProjectTitle(knowledgeProjectTitle)
    }
    setFeedOpen(true)
    updateKnowledgeRoute({ panel: 'knowledge', action: 'feed' })
  }

  const handleCloseFeed = async () => {
    if (feedAnalyzeLoading && feedIngestJob?.id) {
      try {
        const res = await apiClient.post(`/knowledge/ingest/${feedIngestJob.id}/pause`)
        setFeedIngestJob(res.data?.job || { ...feedIngestJob, status: 'paused', phase: '已暂停' })
        setFeedAnalyzeLoading(false)
        message.success('后台提炼任务已暂停，可稍后继续')
      } catch {
        message.error('暂停任务失败')
        return
      }
    } else if ((feedAnalyzeLoading || fileReading) && feedAbortControllerRef.current) {
      feedAbortControllerRef.current.abort()
      feedAbortControllerRef.current = null
      setFeedAnalyzeLoading(false)
      setFileReading(false)
      message.info('知识提炼已中断')
    } else if (feedSubmitting || feedAnalyzeLoading || fileReading) {
      return
    }
    setFeedOpen(false)
    updateKnowledgeRoute({ panel: 'knowledge', action: null })
  }

  const handleFeedModelChange = (value?: number) => {
    const next = Number(value || 0) || undefined
    setFeedModelId(next)
    if (typeof window === 'undefined') return
    if (next) window.localStorage.setItem(knowledgeExtractModelStorageKey, String(next))
    else window.localStorage.removeItem(knowledgeExtractModelStorageKey)
  }

  const handleKnowledgeProjectChange = (value?: string) => {
    const next = String(value || '').trim()
    setKnowledgeProjectDraft(next)
    setKnowledgeProjectTitle(next)
    setKnowledgeCategory('')
    setKnowledgeQueryResults([])
    updateKnowledgeRoute({ projectTitle: next || null })
  }

  const buildTags = () => {
    return feedTags
      .split(/[,，\n]/)
      .map(tag => tag.trim())
      .filter(Boolean)
  }

  const buildKnowledgePayload = () => ({
    category: feedCategory,
    title: feedTitle.trim() || undefined,
    source: feedSource.trim() || '手动投喂',
    source_title: feedSource.trim() || '手动投喂',
    tags: buildTags(),
    weight: 3,
    project_id: feedProjectId,
    project_title: feedProjectTitle.trim() || undefined,
  })

  const handleSubmitFeed = async () => {
    if (!feedText.trim()) {
      message.warning('请输入要投喂的文本内容')
      return
    }
    setFeedSubmitting(true)
    try {
      await apiClient.post('/knowledge/entries', {
        ...buildKnowledgePayload(),
        content: feedText.trim(),
      })
      if (feedProjectTitle.trim()) {
        setKnowledgeProjectTitle(feedProjectTitle.trim())
        setKnowledgeProjectDraft(feedProjectTitle.trim())
      }
      message.success(feedProjectTitle.trim() ? `知识已加入「${feedProjectTitle.trim()}」` : '知识已加入全局知识库')
      setFeedOpen(false)
      resetFeedForm()
      updateKnowledgeRoute({ panel: 'knowledge', action: null })
      await loadKnowledge(knowledgeCategory || undefined, feedProjectTitle.trim() || knowledgeProjectTitle)
      if (!knowledgeOpen) setKnowledgeOpen(true)
    } catch {
      message.error('投喂失败')
    } finally {
      setFeedSubmitting(false)
    }
  }

  const openAnalyzePreview = (entries: any[], source: string) => {
    setFeedAnalyzeSource(source)
    setFeedAnalyzedEntries(entries)
    setFeedAnalyzePreviewOpen(true)
  }

  const handlePauseIngestJob = async () => {
    const jobId = feedIngestJob?.id
    if (!jobId) return
    try {
      const res = await apiClient.post(`/knowledge/ingest/${jobId}/pause`)
      setFeedIngestJob(res.data?.job)
      setFeedAnalyzeLoading(false)
      message.success('后台提炼任务已暂停')
    } catch (error: any) {
      message.error(error?.response?.data?.error || '暂停任务失败')
    }
  }

  const handleResumeIngestJob = async () => {
    const jobId = feedIngestJob?.id
    if (!jobId) return
    try {
      const res = await apiClient.post(`/knowledge/ingest/${jobId}/resume`, {
        model_id: feedModelId,
      })
      const job = res.data?.job
      setFeedIngestJob(job)
      setFeedAnalyzeLoading(true)
      message.success('已继续后台提炼任务')
      void monitorAutoIngestJob(jobId)
    } catch (error: any) {
      message.error(error?.response?.data?.error || '继续任务失败')
    }
  }

  const handleCancelIngestJob = async () => {
    const jobId = feedIngestJob?.id
    if (!jobId) return
    try {
      const res = await apiClient.post(`/knowledge/ingest/${jobId}/cancel`)
      setFeedIngestJob(res.data?.job)
      setFeedAnalyzeLoading(false)
      message.success('后台提炼任务已取消')
    } catch (error: any) {
      message.error(error?.response?.data?.error || '取消任务失败')
    }
  }

  const handleAnalyzeCachedJob = async () => {
    const sourceJob = feedIngestJob
    const url = String(sourceJob?.url || feedUrl || '').trim()
    if (!url) {
      message.warning('没有可用于提炼的缓存来源')
      return
    }
    setFeedAnalyzeLoading(true)
    try {
      const startRes = await apiClient.post('/knowledge/ingest/start', {
        url,
        model_id: feedModelId || sourceJob?.model_id,
        full_book: Boolean(sourceJob?.full_book ?? feedFullBook),
        fetch_only: false,
        auto_store: Boolean(sourceJob?.full_book ?? feedFullBook),
        project_id: sourceJob?.project_id || feedProjectId,
        project_title: String(sourceJob?.project_title || feedProjectTitle || '').trim() || undefined,
        start_chapter: Number(sourceJob?.start_chapter || feedStartChapter || 1),
        max_chapters: Number(sourceJob?.max_chapters ?? (feedFullBook ? 0 : feedMaxChapters)),
        batch_size: Number(sourceJob?.batch_size || feedBatchSize || 10),
        fetch_concurrency: Number(sourceJob?.fetch_concurrency || feedFetchConcurrency || 1),
      })
      const startedJob = startRes.data?.job
      if (!startedJob?.id) {
        message.warning('缓存提炼任务启动失败')
        return
      }
      setFeedFetchOnly(false)
      setFeedIngestJob(startedJob)
      message.success('已从正文缓存启动提炼任务')
      void monitorAutoIngestJob(startedJob.id)
    } catch (error: any) {
      setFeedAnalyzeLoading(false)
      message.error(error?.response?.data?.error || '从缓存启动提炼失败')
    }
  }

  const handleReanalyzeBatch = async (batchIndex: number) => {
    const jobId = feedIngestJob?.id
    if (!jobId) {
      message.warning('没有可重新提炼的后台任务')
      return
    }
    setFeedReanalyzingBatch(batchIndex)
    try {
      const res = await apiClient.post(`/knowledge/ingest/${jobId}/reanalyze`, {
        batch_index: batchIndex,
        model_id: feedModelId,
      })
      const job = res.data?.job
      setFeedIngestJob(job)
      const entries = Array.isArray(job?.entries) ? job.entries : []
      setFeedAnalyzedEntries(entries)
      message.success(`已重新提炼第 ${batchIndex + 1} 批，并重新合并去重`)
    } catch (error: any) {
      message.error(error?.response?.data?.error || '重新提炼失败')
    } finally {
      setFeedReanalyzingBatch(null)
    }
  }

  const waitForIngestJob = async (jobId: string) => {
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      const res = await apiClient.get(`/knowledge/ingest/${jobId}`)
      const job = res.data?.job
      setFeedIngestJob(job)
      if (sourceCacheOpen && job?.source_cache?.cache_key) {
        void loadSourceCaches(false)
      }
      if (job?.status === 'completed') return job
      if (job?.status === 'canceled') {
        throw new Error('任务已取消')
      }
      if (job?.status === 'paused') {
        throw new Error('任务已暂停')
      }
      if (job?.status === 'failed') {
        throw new Error(Array.isArray(job.errors) && job.errors.length ? job.errors[0] : '后台提炼任务失败')
      }
    }
  }

  const monitorAutoIngestJob = async (jobId: string) => {
    try {
      const job = await waitForIngestJob(jobId)
      if (job?.fetch_only) {
        message.success(`正文拉取完成，已缓存 ${job.fetched_chapters || 0} 章，可从缓存开始提炼`)
        if (sourceCacheOpen) void loadSourceCaches(true)
        return
      }
      const stored = Number(job?.stored_count || 0)
      const entries = Array.isArray(job?.entries) ? job.entries.length : 0
      if (stored > 0) {
        message.success(`全本投喂完成，已入库 ${stored} 条知识`)
        await loadKnowledge(knowledgeCategory || undefined, feedProjectTitle.trim() || knowledgeProjectTitle)
      } else {
        message.success(`全本提炼完成，得到 ${entries} 条候选知识`)
        openAnalyzePreview(Array.isArray(job?.entries) ? job.entries : [], `${job.url || feedUrl}（全本提炼）`)
      }
    } catch (error: any) {
      if (String(error?.message || '').includes('取消')) message.info('全本后台投喂已取消')
      else if (String(error?.message || '').includes('暂停')) message.info('全本后台投喂已暂停，可在投喂面板继续')
      else message.error(error?.message || '全本后台投喂失败')
    } finally {
      setFeedAnalyzeLoading(false)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!feedIngestJob?.id) return
    if (feedIngestJob.status === 'completed') {
      window.localStorage.removeItem(knowledgeIngestJobStorageKey)
    } else {
      window.localStorage.setItem(knowledgeIngestJobStorageKey, String(feedIngestJob.id))
    }
  }, [feedIngestJob?.id, feedIngestJob?.status])

  useEffect(() => {
    if (typeof window === 'undefined' || feedIngestJob?.id) return
    const jobId = window.localStorage.getItem(knowledgeIngestJobStorageKey)
    if (!jobId) return
    apiClient.get(`/knowledge/ingest/${jobId}`)
      .then(res => {
        const job = res.data?.job
      if (!job?.id) return
      setFeedIngestJob(job)
      setFeedSerialFetch(true)
      setFeedFullBook(Boolean(job.full_book))
      setFeedFetchOnly(Boolean(job.fetch_only))
      setFeedFetchConcurrency(Number(job.fetch_concurrency || 4))
      if (job.project_title) {
          setFeedProjectTitle(String(job.project_title))
          setKnowledgeProjectTitle(String(job.project_title))
          setKnowledgeProjectDraft(String(job.project_title))
        }
        if (['queued', 'running'].includes(job.status)) {
          setFeedAnalyzeLoading(true)
          void monitorAutoIngestJob(job.id)
        }
      })
      .catch(() => {
        window.localStorage.removeItem(knowledgeIngestJobStorageKey)
      })
  }, [])

  const handleAnalyzeFromUrl = async () => {
    const url = feedUrl.trim()
    if (!url) {
      message.warning('请输入要抓取的 URL')
      return
    }
    const controller = new AbortController()
    feedAbortControllerRef.current = controller
    setFeedAnalyzeLoading(true)
    try {
      let fetchedText = ''
      let source = url
      if (feedSerialFetch) {
        const startRes = await apiClient.post('/knowledge/ingest/start', {
          url,
          model_id: feedModelId,
          full_book: feedFullBook,
          fetch_only: feedFetchOnly,
          auto_store: feedFullBook && !feedFetchOnly,
          project_id: feedProjectId,
          project_title: feedProjectTitle.trim() || undefined,
          start_chapter: feedStartChapter,
          max_chapters: feedFullBook ? 0 : feedMaxChapters,
          batch_size: feedBatchSize,
          fetch_concurrency: feedFetchConcurrency,
        })
        const startedJob = startRes.data?.job
        if (!startedJob?.id) {
          message.warning('后台任务启动失败')
          return
        }
        setFeedIngestJob(startedJob)
        if (feedFetchOnly) {
          message.success('已启动正文拉取任务，完成后可从缓存开始提炼')
          void monitorAutoIngestJob(startedJob.id)
          return
        }
        if (feedFullBook) {
          if (feedProjectTitle.trim()) {
            setKnowledgeProjectTitle(feedProjectTitle.trim())
            setKnowledgeProjectDraft(feedProjectTitle.trim())
          }
          message.success('已启动全本后台投喂，任务会自动跑到没有下一章并入库')
          setFeedOpen(false)
          updateKnowledgeRoute({ panel: 'knowledge', action: null })
          void monitorAutoIngestJob(startedJob.id)
          return
        }
        message.success('已启动后台抓取提炼任务')
        const job = await waitForIngestJob(startedJob.id)
        const entries = Array.isArray(job?.entries) ? job.entries : []
        if (!entries.length) {
          message.warning('AI 没有提炼出可入库知识')
          return
        }
        source = `${url}（从第${job.start_chapter || feedStartChapter || 1}章起分批抓取 ${job.fetched_chapters || 0} 章）`
        openAnalyzePreview(entries, source)
        message.success(`已分批提炼并去重合并 ${entries.length} 条知识候选`)
        return
      } else {
        const fetchRes = await apiClient.post('/knowledge/fetch-url', { url }, { signal: controller.signal })
        fetchedText = String(fetchRes.data?.text || '')
      }
      if (!fetchedText.trim()) {
        message.warning('未抓取到可分析文本')
        return
      }
      const analyzeRes = await apiClient.post('/knowledge/analyze', {
        source,
        text: fetchedText,
        model_id: feedModelId,
      }, { signal: controller.signal })
      const entries = Array.isArray(analyzeRes.data?.entries) ? analyzeRes.data.entries : []
      if (!entries.length) {
        message.warning('AI 没有提炼出可入库知识')
        return
      }
      openAnalyzePreview(entries, source)
      message.success(`已提炼 ${entries.length} 条知识候选`)
    } catch (error: any) {
      if (error?.code === 'ERR_CANCELED' || String(error?.message || '').includes('取消') || String(error?.message || '').includes('canceled')) message.info('知识提炼已中断')
      else message.error('URL 抓取或分析失败')
    } finally {
      if (feedAbortControllerRef.current === controller) feedAbortControllerRef.current = null
      setFeedAnalyzeLoading(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const isTxt = file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt')
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isTxt && !isPdf) {
      message.warning('当前仅支持上传 TXT 或 PDF 文件')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setSelectedFileName(file.name)
    setFileReading(true)
    const controller = new AbortController()
    feedAbortControllerRef.current = controller

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        if (controller.signal.aborted) return
        const result = String(e.target?.result || '')
        const payload = isTxt
          ? {
              filename: file.name,
              mime_type: file.type,
              text: result,
            }
          : {
              filename: file.name,
              mime_type: file.type,
              base64: result.split(',').pop() || '',
            }

        const readRes = await apiClient.post('/knowledge/read-local-file', payload, { signal: controller.signal })
        const extractedText = String(readRes.data?.text || '')
        if (!extractedText.trim()) {
          message.warning(readRes.data?.message || '未从文件中读取到可分析文本')
          return
        }

        setFeedText(extractedText)
        setFeedSource(file.name)
        setFeedTitle(feedTitle || file.name.replace(/\.(txt|pdf)$/i, ''))
        setFeedMode('file')

        const analyzeRes = await apiClient.post('/knowledge/analyze', {
          source: file.name,
          text: extractedText,
          model_id: feedModelId,
        }, { signal: controller.signal })
        const entries = Array.isArray(analyzeRes.data?.entries) ? analyzeRes.data.entries : []
        if (!entries.length) {
          message.warning('AI 没有提炼出可入库知识')
          return
        }
        openAnalyzePreview(entries, file.name)
        message.success(`已从 ${file.name} 读取并提炼 ${entries.length} 条知识候选`)
      } catch (error: any) {
        if (error?.code === 'ERR_CANCELED' || String(error?.message || '').includes('canceled')) message.info('知识提炼已中断')
        else message.error('文件读取或分析失败')
      } finally {
        if (feedAbortControllerRef.current === controller) feedAbortControllerRef.current = null
        setFileReading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }

    reader.onerror = () => {
      setFileReading(false)
      message.error('读取文件失败')
      if (fileInputRef.current) fileInputRef.current.value = ''
    }

    if (isPdf) reader.readAsDataURL(file)
    else reader.readAsText(file, 'utf-8')
  }

  const handleSaveAnalyzedEntries = async () => {
    if (!feedAnalyzedEntries.length) {
      message.warning('没有可保存的知识条目')
      return
    }
    setFeedAnalyzeSaving(true)
    try {
      const result = await apiClient.post('/knowledge/entries/batch', {
        entries: feedAnalyzedEntries.map(entry => ({
          ...entry,
          source: entry.source || feedAnalyzeSource || feedSource || '知识分析',
          source_title: entry.source_title || entry.source || feedAnalyzeSource || feedSource || '知识分析',
        })),
        project_id: feedProjectId,
        project_title: feedProjectTitle.trim() || undefined,
      })
      const synced = Number(result.data?.synced || 0)
      if (feedProjectTitle.trim()) {
        setKnowledgeProjectTitle(feedProjectTitle.trim())
        setKnowledgeProjectDraft(feedProjectTitle.trim())
      }
      if (feedProjectId && synced > 0) {
        message.success(`已批量写入 ${feedAnalyzedEntries.length} 条知识，并同步 ${synced} 条到记忆宫殿`)
      } else if (feedProjectTitle.trim()) {
        message.success(`已批量写入 ${feedAnalyzedEntries.length} 条知识到「${feedProjectTitle.trim()}」`)
      } else {
        message.success(`已批量写入 ${feedAnalyzedEntries.length} 条知识`)
      }
      setFeedAnalyzePreviewOpen(false)
      setFeedOpen(false)
      setFeedAnalyzedEntries([])
      setFeedAnalyzeSource('')
      resetFeedForm()
      updateKnowledgeRoute({ panel: 'knowledge', action: null })
      await loadKnowledge(knowledgeCategory || undefined)
      if (!knowledgeOpen) setKnowledgeOpen(true)
    } catch {
      message.error('批量写入知识库失败')
    } finally {
      setFeedAnalyzeSaving(false)
    }
  }

  const loadProjects = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/novel/projects')
      setProjects(Array.isArray(res.data) ? res.data : [])
    } catch {
      message.error('无法加载小说项目')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const handleWizardSuccess = (projectId: number) => {
    setWizardOpen(false)
    loadProjects()
    navigate(`/novel/workspace/${projectId}`)
  }

  const handleWizardCancel = () => {
    setWizardOpen(false)
  }

  const handleDeleteProject = async (projectId: number) => {
    try {
      await apiClient.delete(`/novel/projects/${projectId}`)
      message.success('项目已删除')
      await loadProjects()
    } catch {
      message.error('删除失败')
    }
  }

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const q = searchText.trim().toLowerCase()
      if (!q) return true
      return [project.title, project.genre, project.status, project.target_audience]
        .filter(Boolean)
        .some((v: any) => String(v).toLowerCase().includes(q))
    })
  }, [projects, searchText])

  const stats = useMemo(() => ({
    total: projects.length,
    draft: projects.filter(p => p.status === 'draft').length,
    active: projects.filter(p => p.status && p.status !== 'draft').length,
  }), [projects])
  const lobbyModel = useMemo(() => buildNovelLobbyModel(projects), [projects])
  const projectCardById = useMemo(() => new Map(lobbyModel.projectCards.map(card => [card.project.id, card])), [lobbyModel.projectCards])
  const getReferenceProjects = (project: any) => (
    Array.isArray(project?.reference_config?.references)
      ? project.reference_config.references
          .map((item: any) => String(item?.project_title || '').trim())
          .filter(Boolean)
      : []
  )


  return {
    navigate,
    searchParams,
    setSearchParams,
    projects,
    setProjects,
    loading,
    setLoading,
    wizardOpen,
    setWizardOpen,
    searchText,
    setSearchText,
    knowledgeOpen,
    setKnowledgeOpen,
    knowledgeLoading,
    setKnowledgeLoading,
    knowledgeBulkDeleting,
    setKnowledgeBulkDeleting,
    knowledgeEntries,
    setKnowledgeEntries,
    knowledgeSummary,
    setKnowledgeSummary,
    knowledgeSearch,
    setKnowledgeSearch,
    knowledgeCategory,
    setKnowledgeCategory,
    knowledgeProjectTitle,
    setKnowledgeProjectTitle,
    knowledgeProjectDraft,
    setKnowledgeProjectDraft,
    knowledgeProjectOptions,
    setKnowledgeProjectOptions,
    knowledgeLoadedOnce,
    setKnowledgeLoadedOnce,
    knowledgeQuery,
    setKnowledgeQuery,
    knowledgeQueryLoading,
    setKnowledgeQueryLoading,
    knowledgeQueryResults,
    setKnowledgeQueryResults,
    knowledgeDetailEntry,
    setKnowledgeDetailEntry,
    memoryPalaceOpen,
    setMemoryPalaceOpen,
    sourceCacheOpen,
    setSourceCacheOpen,
    sourceCacheLoading,
    setSourceCacheLoading,
    sourceCaches,
    setSourceCaches,
    sourceCacheSearch,
    setSourceCacheSearch,
    selectedSourceCacheKey,
    setSelectedSourceCacheKey,
    sourceCacheDetail,
    setSourceCacheDetail,
    sourceCacheChapter,
    setSourceCacheChapter,
    sourceCacheChapterLoading,
    setSourceCacheChapterLoading,
    feedOpen,
    setFeedOpen,
    feedText,
    setFeedText,
    feedSource,
    setFeedSource,
    feedSubmitting,
    setFeedSubmitting,
    feedCategory,
    setFeedCategory,
    feedTitle,
    setFeedTitle,
    feedTags,
    setFeedTags,
    feedMode,
    setFeedMode,
    feedUrl,
    setFeedUrl,
    feedSerialFetch,
    setFeedSerialFetch,
    feedStartChapter,
    setFeedStartChapter,
    feedFullBook,
    setFeedFullBook,
    feedFetchOnly,
    setFeedFetchOnly,
    feedMaxChapters,
    setFeedMaxChapters,
    feedBatchSize,
    setFeedBatchSize,
    feedFetchConcurrency,
    setFeedFetchConcurrency,
    availableModels,
    setAvailableModels,
    feedModelsLoading,
    setFeedModelsLoading,
    feedModelId,
    setFeedModelId,
    feedIngestJob,
    setFeedIngestJob,
    feedAnalyzeLoading,
    setFeedAnalyzeLoading,
    feedAnalyzePreviewOpen,
    setFeedAnalyzePreviewOpen,
    feedAnalyzeSource,
    setFeedAnalyzeSource,
    feedAnalyzedEntries,
    setFeedAnalyzedEntries,
    feedAnalyzeSaving,
    setFeedAnalyzeSaving,
    feedReanalyzingBatch,
    setFeedReanalyzingBatch,
    feedProjectId,
    setFeedProjectId,
    feedProjectTitle,
    setFeedProjectTitle,
    fileReading,
    setFileReading,
    selectedFileName,
    setSelectedFileName,
    fileInputRef,
    feedAbortControllerRef,
    loadKnowledge,
    handleDeleteKnowledge,
    handleDeleteVisibleKnowledge,
    handleRefreshKnowledge,
    handleQueryKnowledge,
    filteredKnowledgeEntries,
    categoryOptions,
    knowledgeStats,
    knowledgeCategoryLabel,
    knowledgeProjectLabel,
    knowledgeCountText,
    filteredSourceCaches,
    extractionModelOptions,
    knowledgePanelFromUrl,
    memoryPalacePanelFromUrl,
    sourceCachePanelFromUrl,
    knowledgeActionFromUrl,
    knowledgeProjectFromUrl,
    sourceCacheProjectFromUrl,
    loadAvailableModels,
    updateKnowledgeRoute,
    renderKnowledgeTag,
    renderMetaTags,
    formatKnowledgeCategory,
    knowledgeEmpty,
    resetFeedForm,
    handleOpenKnowledge,
    handleCloseKnowledge,
    handleOpenMemoryPalace,
    handleCloseMemoryPalace,
    loadSourceCacheChapter,
    loadSourceCacheDetail,
    loadSourceCaches,
    handleOpenSourceCache,
    handleCloseSourceCache,
    handleOpenFeed,
    handleCloseFeed,
    handleFeedModelChange,
    handleKnowledgeProjectChange,
    buildTags,
    buildKnowledgePayload,
    handleSubmitFeed,
    openAnalyzePreview,
    handlePauseIngestJob,
    handleResumeIngestJob,
    handleCancelIngestJob,
    handleAnalyzeCachedJob,
    handleReanalyzeBatch,
    waitForIngestJob,
    monitorAutoIngestJob,
    handleAnalyzeFromUrl,
    handleFileUpload,
    handleSaveAnalyzedEntries,
    loadProjects,
    handleWizardSuccess,
    handleWizardCancel,
    handleDeleteProject,
    filteredProjects,
    stats,
    lobbyModel,
    projectCardById,
    getReferenceProjects,
  }
}
