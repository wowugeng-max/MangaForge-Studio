import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Checkbox, Col, Drawer, Input, InputNumber, Modal, Popconfirm, Progress, Radio, Row, Select, Space, Tag, Typography, message } from 'antd'
import { BookOutlined, CloudUploadOutlined, DatabaseOutlined, DeleteOutlined, EditOutlined, EyeOutlined, FileTextOutlined, FolderOutlined, LinkOutlined, PauseCircleOutlined, PlayCircleOutlined, PlusOutlined, ReadOutlined, ReloadOutlined, SearchOutlined, StopOutlined, TagsOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import apiClient from '../api/client'
import MemoryPalacePanel from '../components/MemoryPalacePanel'
import NovelCreateWizard from '../components/NovelCreateWizard'

const { Title, Text, Paragraph } = Typography

const knowledgeCategoryPresets = [
  { value: 'character_design', label: '人物设计' },
  { value: 'story_design', label: '故事设计' },
  { value: 'story_pacing', label: '节奏设计' },
  { value: 'foreshadowing', label: '伏笔设计' },
  { value: 'ability_design', label: '能力体系' },
  { value: 'realm_design', label: '境界设计' },
  { value: 'worldbuilding', label: '世界观' },
  { value: 'writing_style', label: '写作风格' },
  { value: 'technique', label: '写作技巧' },
  { value: 'volume_design', label: '分卷设计' },
  { value: 'genre_positioning', label: '题材定位' },
  { value: 'trope_design', label: '套路设计' },
  { value: 'selling_point', label: '卖点设计' },
  { value: 'reader_hook', label: '读者钩子' },
  { value: 'emotion_design', label: '情绪设计' },
  { value: 'scene_design', label: '场景设计' },
  { value: 'conflict_design', label: '冲突设计' },
  { value: 'resource_economy', label: '资源经济' },
  { value: 'reference_profile', label: '参考作品画像' },
  { value: 'volume_architecture', label: '分卷结构' },
  { value: 'chapter_beat_template', label: '章节节拍模板' },
  { value: 'character_function_matrix', label: '角色功能矩阵' },
  { value: 'resource_economy_model', label: '资源经济模型' },
  { value: 'style_profile', label: '文风画像' },
]

const fieldLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 600,
  color: '#334155',
}

const panelStyle: React.CSSProperties = {
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: 14,
  background: '#ffffff',
}

const softPanelStyle: React.CSSProperties = {
  border: '1px solid #dbeafe',
  borderRadius: 10,
  padding: 14,
  background: '#f8fbff',
}

const inputStyle: React.CSSProperties = { borderRadius: 8 }
const knowledgeExtractModelStorageKey = 'knowledge.extract.model_id'
const knowledgeIngestJobStorageKey = 'knowledge.ingest.last_job_id'

export default function NovelStudio() {
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
  const knowledgeActionFromUrl = searchParams.get('action')
  const knowledgeProjectFromUrl = searchParams.get('project_title') || ''

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

  const truncateText = (value: string, max = 160) => {
    if (!value) return ''
    return value.length > max ? `${value.slice(0, max)}…` : value
  }

  const formatSource = (entry: any) => entry.source_title || entry.source || '未命名来源'

  const formatProjectScope = (entry: any) => String(entry?.project_title || '').trim()

  const formatKnowledgeCategory = (entry: any) => knowledgeSummary[entry?.category]?.label || entry?.category || '未分类'

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

  const loadSourceCaches = async (autoSelect = false) => {
    setSourceCacheLoading(true)
    try {
      const res = await apiClient.get('/knowledge/source-caches')
      const caches = Array.isArray(res.data?.caches) ? res.data.caches : []
      setSourceCaches(caches)
      if (autoSelect && caches.length > 0) {
        const current = selectedSourceCacheKey
          ? caches.find((item: any) => item.cache_key === selectedSourceCacheKey)
          : null
        await loadSourceCacheDetail(current?.cache_key || caches[0].cache_key)
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
  }

  const handleCloseSourceCache = () => {
    setSourceCacheOpen(false)
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

  const getBatchStatusColor = (status?: string) => {
    if (status === 'completed') return 'green'
    if (status === 'failed') return 'red'
    if (status === 'analyzing') return 'blue'
    if (status === 'pending') return 'default'
    return 'default'
  }

  const getIngestStatusColor = (status?: string) => {
    if (status === 'completed') return 'green'
    if (status === 'failed') return 'red'
    if (status === 'paused') return 'gold'
    if (status === 'canceled') return 'default'
    return 'blue'
  }

  const getSourceCacheLabel = (cache?: any) => {
    if (!cache) return ''
    const cached = Number(cache.cached_chapters || 0)
    const fetched = Number(cache.fetched_chapters || 0)
    if (cache.status === 'hit') return `命中正文缓存 ${cached} 章`
    if (cache.status === 'partial') return `已有缓存 ${cached} 章，新抓并缓存 ${fetched} 章`
    if (cache.status === 'miss') return fetched > 0 ? `新抓并缓存 ${fetched} 章` : '未命中缓存'
    return ''
  }

  const getSourceCacheColor = (status?: string) => {
    if (status === 'hit') return 'green'
    if (status === 'partial') return 'gold'
    if (status === 'miss') return 'default'
    return 'default'
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
  const getReferenceProjects = (project: any) => (
    Array.isArray(project?.reference_config?.references)
      ? project.reference_config.references
          .map((item: any) => String(item?.project_title || '').trim())
          .filter(Boolean)
      : []
  )

  return (
    <div style={{ minHeight: '100vh', padding: 24, background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)' }}>
      <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 20px 60px rgba(15,23,42,0.08)', overflow: 'hidden' }} bodyStyle={{ padding: 0 }}>
        <div style={{ padding: 28, borderBottom: '1px solid rgba(148,163,184,0.16)', background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))' }}>
          <Row justify="space-between" align="middle" gutter={24}>
            <Col flex="auto">
              <Space direction="vertical" size={4}>
                <Space align="center" size={10}>
                  <div style={{ width: 40, height: 40, borderRadius: 14, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #60a5fa, #7c3aed)', color: '#fff', boxShadow: '0 12px 24px rgba(99,102,241,0.24)' }}>📚</div>
                  <div>
                    <Title level={3} style={{ margin: 0 }}>小说项目大厅</Title>
                    <Text type="secondary">先选项目，再进入单项目工作台继续写作。</Text>
                  </div>
                </Space>
                <Space wrap>
                  <Tag color="blue" bordered={false}>项目总数 {stats.total}</Tag>
                  <Tag color="gold" bordered={false}>草稿 {stats.draft}</Tag>
                  <Tag color="green" bordered={false}>进行中 {stats.active}</Tag>
                </Space>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button icon={<ReadOutlined />} onClick={handleOpenKnowledge} style={{ borderRadius: 12 }}>知识库</Button>
                <Button icon={<FileTextOutlined />} onClick={handleOpenSourceCache} style={{ borderRadius: 12 }}>正文缓存</Button>
                <Button icon={<DatabaseOutlined />} onClick={handleOpenMemoryPalace} style={{ borderRadius: 12 }}>记忆宫殿</Button>
                <Button icon={<ReloadOutlined />} onClick={loadProjects} loading={loading} style={{ borderRadius: 12 }}>刷新</Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setWizardOpen(true)} style={{ borderRadius: 12, boxShadow: '0 10px 24px rgba(24, 144, 255, 0.25)' }}>新建小说项目</Button>
              </Space>
            </Col>
          </Row>
        </div>

        <div style={{ padding: 24 }}>
          <Card size="small" title="项目检索" style={{ borderRadius: 18, marginBottom: 16 }}>
            <Input prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="搜索项目标题、题材、状态、目标读者" allowClear />
          </Card>

          {filteredProjects.length === 0 ? (
            <Card style={{ borderRadius: 18, textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
              <Title level={5}>暂无小说项目</Title>
              <Text type="secondary">点击上方「新建小说项目」开始创作你的第一部小说。</Text>
            </Card>
          ) : (
            <Row gutter={16}>
              {filteredProjects.map(project => (
                <Col xs={24} md={12} xl={8} key={project.id} style={{ marginBottom: 16 }}>
                  <Card
                    hoverable
                    style={{ borderRadius: 18, height: '100%' }}
                    bodyStyle={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                    onClick={() => navigate(`/novel/workspace/${project.id}`)}
                  >
                    <Space direction="vertical" style={{ width: '100%' }} size={6}>
                      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                        <Title level={5} style={{ margin: 0 }}>{project.title}</Title>
                        <Tag color={project.status === 'draft' ? 'gold' : 'green'} bordered={false}>{project.status || 'draft'}</Tag>
                      </Space>
                      <Text type="secondary">{project.genre || '未设置题材'}</Text>
                    </Space>
                    <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                      <div>篇幅目标：{project.length_target || '-'}</div>
                      <div>目标读者：{project.target_audience || '-'}</div>
                      <div>风格标签：{Array.isArray(project.style_tags) ? project.style_tags.join(' / ') : '-'}</div>
                    </div>
                    {getReferenceProjects(project).length > 0 && (
                      <Space wrap size={4}>
                        <Tag color="purple" bordered={false}>参考 {getReferenceProjects(project).length}</Tag>
                        {getReferenceProjects(project).slice(0, 2).map(title => (
                          <Tag key={title} bordered={false}>{title}</Tag>
                        ))}
                        {getReferenceProjects(project).length > 2 && (
                          <Tag bordered={false}>+{getReferenceProjects(project).length - 2}</Tag>
                        )}
                      </Space>
                    )}
                    {project.synopsis && (
                      <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                        "{project.synopsis}"
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>点击进入工作台</Text>
                      <Space>
                        <Button type="primary" size="small" style={{ borderRadius: 10 }} onClick={(e) => { e.stopPropagation(); navigate(`/novel/workspace/${project.id}`) }}>进入</Button>
                        <Popconfirm
                          title="删除项目"
                          description={`确定删除《${project.title}》吗？此操作不可撤销。`}
                          okText="删除"
                          okButtonProps={{ danger: true }}
                          onConfirm={(e) => { e?.stopPropagation(); handleDeleteProject(project.id) }}
                        >
                          <Button danger size="small" icon={<DeleteOutlined />} style={{ borderRadius: 10 }} onClick={(e) => e.stopPropagation()}>删除</Button>
                        </Popconfirm>
                      </Space>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </div>
      </Card>

      <Drawer
        title={
          <Space direction="vertical" size={2}>
            <Space>
              <DatabaseOutlined style={{ color: '#1677ff' }} />
              <Text strong style={{ fontSize: 18 }}>全局记忆宫殿</Text>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>跨项目查看、进入和清理记忆数据</Text>
          </Space>
        }
        placement="right"
        width={640}
        open={memoryPalaceOpen}
        onClose={handleCloseMemoryPalace}
        destroyOnHidden={false}
      >
        <MemoryPalacePanel
          onOpenProject={(projectId) => {
            setMemoryPalaceOpen(false)
            updateKnowledgeRoute({ panel: null, action: null })
            navigate(`/novel/workspace/${projectId}`)
          }}
        />
      </Drawer>

      <Drawer
        title={
          <Space direction="vertical" size={2}>
            <Space>
              <FileTextOutlined style={{ color: '#1677ff' }} />
              <Text strong style={{ fontSize: 18 }}>正文缓存总览</Text>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>查看已抓取原文，用来和知识提炼结果互相印证</Text>
          </Space>
        }
        placement="right"
        width={1120}
        open={sourceCacheOpen}
        onClose={handleCloseSourceCache}
        destroyOnHidden={false}
        extra={
          <Button size="small" icon={<ReloadOutlined />} loading={sourceCacheLoading} onClick={() => loadSourceCaches(true)}>
            刷新
          </Button>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '340px minmax(0, 1fr)', gap: 16, height: 'calc(100vh - 120px)' }}>
          <div style={{ minHeight: 0, display: 'grid', gridTemplateRows: 'auto minmax(160px, 1fr) minmax(220px, 1.3fr)', gap: 12 }}>
            <Input
              value={sourceCacheSearch}
              onChange={(event) => setSourceCacheSearch(event.target.value)}
              placeholder="搜索项目名、来源、缓存键"
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              allowClear
            />

            <Card
              size="small"
              title={`缓存项目 ${filteredSourceCaches.length}`}
              style={{ borderRadius: 8, minHeight: 0, overflow: 'hidden' }}
              bodyStyle={{ padding: 8, height: 'calc(100% - 38px)', overflowY: 'auto' }}
            >
              {filteredSourceCaches.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>
                  {sourceCacheLoading ? '正在加载正文缓存...' : '还没有正文缓存'}
                </div>
              ) : (
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {filteredSourceCaches.map(cache => {
                    const active = cache.cache_key === selectedSourceCacheKey
                    return (
                      <div
                        key={cache.cache_key}
                        onClick={() => loadSourceCacheDetail(cache.cache_key)}
                        style={{
                          cursor: 'pointer',
                          border: `1px solid ${active ? '#93c5fd' : '#e5e7eb'}`,
                          background: active ? '#eff6ff' : '#fff',
                          borderRadius: 8,
                          padding: 10,
                        }}
                      >
                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                          <Space style={{ justifyContent: 'space-between', width: '100%' }} align="start">
                            <Text strong style={{ color: '#0f172a' }}>{cache.project_title || '未命名缓存'}</Text>
                            <Tag color={cache.complete ? 'green' : 'gold'} bordered={false}>
                              {cache.complete ? '完整' : '未完'}
                            </Tag>
                          </Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {cache.chapter_count || 0} 章 · 第 {cache.first_chapter || '-'}-{cache.last_chapter || '-'} 章 · {Math.round(Number(cache.total_chars || 0) / 1000)}k 字
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {truncateText(cache.source_url || cache.canonical_source_url || cache.cache_key, 54)}
                          </Text>
                        </Space>
                      </div>
                    )
                  })}
                </Space>
              )}
            </Card>

            <Card
              size="small"
              title={`章节目录 ${sourceCacheDetail?.chapter_count ? `(${sourceCacheDetail.chapter_count})` : ''}`}
              style={{ borderRadius: 8, minHeight: 0, overflow: 'hidden' }}
              bodyStyle={{ padding: 8, height: 'calc(100% - 38px)', overflowY: 'auto' }}
            >
              {!sourceCacheDetail ? (
                <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>选择一个缓存项目查看章节</div>
              ) : (
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {(sourceCacheDetail.chapters || []).map((chapter: any) => {
                    const active = Number(sourceCacheChapter?.chapter || 0) === Number(chapter.chapter)
                    return (
                      <div
                        key={chapter.chapter}
                        onClick={() => loadSourceCacheChapter(sourceCacheDetail.cache_key, Number(chapter.chapter))}
                        style={{
                          cursor: 'pointer',
                          border: `1px solid ${active ? '#bfdbfe' : '#e5e7eb'}`,
                          background: active ? '#eff6ff' : '#fff',
                          borderRadius: 8,
                          padding: '8px 10px',
                        }}
                      >
                        <Text strong={active} style={{ display: 'block', fontSize: 13 }}>
                          第{chapter.chapter}章
                        </Text>
                        <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                          {truncateText(chapter.title || '', 28)}
                        </Text>
                      </div>
                    )
                  })}
                </Space>
              )}
            </Card>
          </div>

          <Card
            style={{ borderRadius: 8, minHeight: 0, overflow: 'hidden' }}
            bodyStyle={{ height: '100%', padding: 0, display: 'flex', flexDirection: 'column' }}
          >
            {sourceCacheChapter ? (
              <>
                <div style={{ padding: '18px 22px', borderBottom: '1px solid #e5e7eb', background: '#fafcff' }}>
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
                      <div>
                        <Title level={4} style={{ margin: 0 }}>{sourceCacheChapter.title || `第${sourceCacheChapter.chapter}章`}</Title>
                        <Text type="secondary">《{sourceCacheChapter.project_title || sourceCacheDetail?.project_title || '未命名缓存'}》第 {sourceCacheChapter.chapter} 章</Text>
                      </div>
                      <Space wrap>
                        <Tag bordered={false}>{Number(sourceCacheChapter.length || 0).toLocaleString()} 字</Tag>
                        {sourceCacheDetail?.complete !== undefined && (
                          <Tag color={sourceCacheDetail.complete ? 'green' : 'gold'} bordered={false}>
                            {sourceCacheDetail.complete ? '完整缓存' : '未完缓存'}
                          </Tag>
                        )}
                      </Space>
                    </Space>
                    {(sourceCacheChapter.url || sourceCacheDetail?.source_url) && (
                      <Paragraph copyable={{ text: sourceCacheChapter.url || sourceCacheDetail?.source_url }} style={{ margin: 0, fontSize: 12 }}>
                        <Text type="secondary">{sourceCacheChapter.url || sourceCacheDetail?.source_url}</Text>
                      </Paragraph>
                    )}
                  </Space>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '22px 34px', background: '#ffffff' }}>
                  {sourceCacheChapterLoading ? (
                    <Text type="secondary">正在读取正文...</Text>
                  ) : (
                    <div
                      style={{
                        maxWidth: 760,
                        margin: '0 auto',
                        whiteSpace: 'pre-wrap',
                        fontSize: 16,
                        lineHeight: 1.82,
                        color: '#1f2937',
                      }}
                    >
                      {sourceCacheChapter.text || '该章节没有正文内容'}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#94a3b8' }}>
                {sourceCacheLoading ? '正在加载正文缓存...' : '选择左侧项目和章节查看正文'}
              </div>
            )}
          </Card>
        </div>
      </Drawer>

      <Drawer
        title={
          <Space direction="vertical" size={2}>
            <Space>
              <ReadOutlined style={{ color: '#1677ff' }} />
              <Text strong style={{ fontSize: 18 }}>写作知识库</Text>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>沉淀拆书知识，并同步到项目记忆宫殿</Text>
          </Space>
        }
        placement="right"
        width={640}
        open={knowledgeOpen}
        onClose={handleCloseKnowledge}
        destroyOnHidden={false}
        extra={
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={handleOpenFeed}>投喂</Button>
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              disabled={filteredKnowledgeEntries.length === 0}
              loading={knowledgeBulkDeleting}
              onClick={handleDeleteVisibleKnowledge}
            >
              清空当前结果
            </Button>
            <Button size="small" icon={<ReloadOutlined />} onClick={handleRefreshKnowledge} loading={knowledgeLoading}>刷新</Button>
          </Space>
        }
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card size="small" style={{ borderRadius: 8, background: 'linear-gradient(135deg, #f8fbff 0%, #ffffff 100%)' }}>
            <Row gutter={12}>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12 }}>知识条目</Text>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>{knowledgeStats.total}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12 }}>分类数量</Text>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#4f46e5' }}>{knowledgeStats.categories}</div>
              </Col>
              <Col span={8}>
                <Text type="secondary" style={{ fontSize: 12 }}>当前项目</Text>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginTop: 4 }}>{knowledgeProjectLabel}</div>
              </Col>
            </Row>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>{knowledgeCategoryLabel} · {knowledgeCountText}</Text>
          </Card>

          {feedIngestJob && feedSerialFetch && (
            <Card size="small" title="后台投喂任务" style={{ borderRadius: 8, background: '#fafcff' }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                  <Text strong>{feedIngestJob.phase || '后台任务'}</Text>
                  <Space size={6}>
                    <Tag color={getIngestStatusColor(feedIngestJob.status)} bordered={false}>
                      {feedIngestJob.status || 'running'}
                    </Tag>
                    {getSourceCacheLabel(feedIngestJob.source_cache) && (
                      <Tag color={getSourceCacheColor(feedIngestJob.source_cache?.status)} bordered={false}>
                        {getSourceCacheLabel(feedIngestJob.source_cache)}
                      </Tag>
                    )}
                    {feedIngestJob.fetch_only && feedIngestJob.status === 'completed' && (
                      <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={handleAnalyzeCachedJob}>
                        从缓存开始提炼
                      </Button>
                    )}
                    {['queued', 'running'].includes(feedIngestJob.status) && (
                      <Button size="small" icon={<PauseCircleOutlined />} onClick={handlePauseIngestJob}>
                        暂停
                      </Button>
                    )}
                    {['paused', 'failed', 'canceled'].includes(feedIngestJob.status) && (
                      <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={handleResumeIngestJob}>
                        继续
                      </Button>
                    )}
                    {!['completed', 'canceled'].includes(feedIngestJob.status) && (
                      <Popconfirm title="确定取消当前后台提炼任务？" okText="取消任务" cancelText="返回" onConfirm={handleCancelIngestJob}>
                        <Button size="small" danger icon={<StopOutlined />}>
                          取消
                        </Button>
                      </Popconfirm>
                    )}
                  </Space>
                </Space>
                <Progress percent={Math.max(0, Math.min(100, Number(feedIngestJob.progress || 0)))} size="small" />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {feedIngestJob.full_book ? '全本模式；' : ''}
                  {feedIngestJob.fetch_only ? '仅拉取正文缓存；' : ''}
                  从第 {feedIngestJob.start_chapter || feedStartChapter || 1} 章开始；并发 {feedIngestJob.fetch_concurrency || feedFetchConcurrency || 1}；已抓取 {feedIngestJob.fetched_chapters || 0} 章
                  {feedIngestJob.fetch_only ? '' : `，已分析 ${feedIngestJob.analyzed_batches || 0}/${feedIngestJob.total_batches || 0} 批，候选知识 ${Array.isArray(feedIngestJob.entries) ? feedIngestJob.entries.length : 0} 条`}
                  {feedIngestJob.stored_count ? `，已入库 ${feedIngestJob.stored_count} 条` : ''}
                </Text>
                {(feedIngestJob.current_range || feedIngestJob.current_chapter) && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {feedIngestJob.status === 'completed' ? '已完成到' : '当前处理'}：
                    {feedIngestJob.current_range || `第${feedIngestJob.current_chapter}章`}
                    {feedIngestJob.current_chapter_title ? ` / ${feedIngestJob.current_chapter_title}` : ''}
                  </Text>
                )}
              </Space>
            </Card>
          )}

          <Card size="small" title="筛选与检索" style={{ borderRadius: 8 }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Input.Search
                value={knowledgeProjectDraft}
                onChange={(e) => {
                  const next = e.target.value
                  setKnowledgeProjectDraft(next)
                  if (!next.trim()) handleKnowledgeProjectChange('')
                }}
                onSearch={handleKnowledgeProjectChange}
                placeholder="输入投喂项目名，例如：没钱修什么仙；留空查看全局混合视图"
                enterButton="筛选"
                allowClear
                style={inputStyle}
              />
              {knowledgeProjectOptions.length > 0 ? (
                <Space wrap>
                  <Tag
                    color={!knowledgeProjectTitle ? 'purple' : 'default'}
                    bordered={false}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleKnowledgeProjectChange('')}
                  >
                    全部投喂项目
                  </Tag>
                  {knowledgeProjectOptions.map(option => (
                    <Tag
                      key={option.value}
                      color={knowledgeProjectTitle === option.value ? 'purple' : 'default'}
                      bordered={false}
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleKnowledgeProjectChange(option.value)}
                    >
                      {option.label}
                    </Tag>
                  ))}
                </Space>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  还没有带投喂项目名的知识条目；投喂时填入项目名后会出现在这里。
                </Text>
              )}
              <Input
                value={knowledgeSearch}
                onChange={(e) => setKnowledgeSearch(e.target.value)}
                placeholder="搜索标题、内容、来源、标签"
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                allowClear
                style={inputStyle}
              />
              <Space wrap>
                <Tag
                  color={!knowledgeCategory ? 'blue' : 'default'}
                  bordered={false}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setKnowledgeCategory('')}
                >
                  全部分类
                </Tag>
                {categoryOptions.map(option => (
                  <Tag
                    key={option.key}
                    color={knowledgeCategory === option.key ? 'blue' : 'default'}
                    bordered={false}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setKnowledgeCategory(option.key)}
                  >
                    {option.label} {option.count}
                  </Tag>
                ))}
              </Space>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={knowledgeQuery}
                  onChange={(e) => setKnowledgeQuery(e.target.value)}
                  placeholder="按语义检索知识库，例如：悬念、伏笔、开篇钩子"
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  onPressEnter={handleQueryKnowledge}
                />
                <Button type="primary" loading={knowledgeQueryLoading} onClick={handleQueryKnowledge}>检索</Button>
              </Space.Compact>
            </Space>
          </Card>

          {knowledgeQuery.trim() && (
            <Card size="small" title={`语义检索结果 ${knowledgeQueryResults.length ? `(${knowledgeQueryResults.length})` : ''}`} style={{ borderRadius: 8 }}>
              {knowledgeQueryResults.length === 0 ? (
                <Text type="secondary">暂无命中结果</Text>
              ) : (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  {knowledgeQueryResults.map((entry: any, index: number) => (
                    <Card
                      key={entry.id || `${entry.title}-${index}`}
                      size="small"
                      hoverable
                      onClick={() => setKnowledgeDetailEntry(entry)}
                      style={{ borderRadius: 8, background: '#fafcff' }}
                    >
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
                          <Space wrap>
                            <Text strong>{entry.title || '未命名知识'}</Text>
                            {typeof entry.score === 'number' && <Tag color="cyan" bordered={false}>相关度 {entry.score.toFixed(3)}</Tag>}
                          </Space>
                          <Button
                            size="small"
                            type="link"
                            icon={<EyeOutlined />}
                            onClick={(event) => {
                              event.stopPropagation()
                              setKnowledgeDetailEntry(entry)
                            }}
                          >
                            详情
                          </Button>
                        </Space>
                        <Space wrap>
                          <Tag color="geekblue" bordered={false}>{formatKnowledgeCategory(entry)}</Tag>
                          {formatProjectScope(entry) && <Tag color="purple" bordered={false}>{formatProjectScope(entry)}</Tag>}
                          <Tag bordered={false}>{formatSource(entry)}</Tag>
                          {renderMetaTags(entry)}
                        </Space>
                        <Text>{truncateText(entry.content || '', 220)}</Text>
                      </Space>
                    </Card>
                  ))}
                </Space>
              )}
            </Card>
          )}

          {knowledgeEmpty ? (
            <Card style={{ borderRadius: 8, textAlign: 'center', borderStyle: 'dashed', background: '#fafcff' }}>
              <Space direction="vertical" size={10}>
                <DatabaseOutlined style={{ fontSize: 28, color: '#1677ff' }} />
                <Text strong>知识库还是空的</Text>
                <Text type="secondary">先投喂文本、导入 TXT/PDF，或用 URL 抓取后交给 AI 提炼。</Text>
                <Button type="primary" icon={<EditOutlined />} onClick={handleOpenFeed}>投喂第一条知识</Button>
              </Space>
            </Card>
          ) : (
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {filteredKnowledgeEntries.map((entry: any) => (
                <Card
                  key={entry.id}
                  size="small"
                  hoverable
                  onClick={() => setKnowledgeDetailEntry(entry)}
                  title={entry.title || '未命名知识'}
                  extra={
                    <Space size={4} onClick={(event) => event.stopPropagation()}>
                      <Button size="small" type="text" icon={<EyeOutlined />} onClick={() => setKnowledgeDetailEntry(entry)}>
                        详情
                      </Button>
                      <Popconfirm
                        title="删除知识条目"
                        description="确定删除这条知识吗？"
                        okText="删除"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDeleteKnowledge(entry.id)}
                      >
                        <Button danger size="small" type="text" icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  }
                  style={{ borderRadius: 8 }}
                >
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    <Space wrap>
                      <Tag color="geekblue" bordered={false}>{formatKnowledgeCategory(entry)}</Tag>
                      {formatProjectScope(entry) && <Tag color="purple" bordered={false}>{formatProjectScope(entry)}</Tag>}
                      <Tag bordered={false}>{formatSource(entry)}</Tag>
                      {renderMetaTags(entry)}
                    </Space>
                    <Text>{truncateText(entry.content || '')}</Text>
                    {Array.isArray(entry.tags) && entry.tags.length > 0 && (
                      <Space wrap>
                        {entry.tags.map((tag: string, idx: number) => renderKnowledgeTag(tag, idx))}
                      </Space>
                    )}
                  </Space>
                </Card>
              ))}
            </Space>
          )}
        </Space>
      </Drawer>

      <Modal
        title={
          <Space direction="vertical" size={6} style={{ width: '100%' }}>
            <Text strong style={{ fontSize: 18 }}>{knowledgeDetailEntry?.title || '未命名知识'}</Text>
            {knowledgeDetailEntry && (
              <Space wrap>
                <Tag color="geekblue" bordered={false}>{formatKnowledgeCategory(knowledgeDetailEntry)}</Tag>
                <Tag bordered={false}>权重 {Number(knowledgeDetailEntry.weight || 3)}</Tag>
                {typeof knowledgeDetailEntry.score === 'number' && (
                  <Tag color="cyan" bordered={false}>相关度 {knowledgeDetailEntry.score.toFixed(3)}</Tag>
                )}
              </Space>
            )}
          </Space>
        }
        open={Boolean(knowledgeDetailEntry)}
        width={760}
        onCancel={() => setKnowledgeDetailEntry(null)}
        footer={[
          <Button key="close" type="primary" onClick={() => setKnowledgeDetailEntry(null)}>
            关闭
          </Button>,
        ]}
        destroyOnHidden={false}
      >
        {knowledgeDetailEntry && (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Card size="small" style={{ borderRadius: 8, background: '#fafcff' }}>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">来源</Text>
                  <Paragraph copyable style={{ margin: '4px 0 0' }}>{formatSource(knowledgeDetailEntry)}</Paragraph>
                </div>
                {knowledgeDetailEntry.created_at && (
                  <div>
                    <Text type="secondary">创建时间</Text>
                    <div style={{ marginTop: 4 }}>{knowledgeDetailEntry.created_at}</div>
                  </div>
                )}
                {(knowledgeDetailEntry.use_case || knowledgeDetailEntry.chapter_range || knowledgeDetailEntry.confidence) && (
                  <Space wrap>
                    {renderMetaTags(knowledgeDetailEntry)}
                  </Space>
                )}
              </Space>
            </Card>

            {(knowledgeDetailEntry.evidence || Array.isArray(knowledgeDetailEntry.entities) && knowledgeDetailEntry.entities.length > 0) && (
              <Card size="small" title="证据与实体" style={{ borderRadius: 8 }}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {knowledgeDetailEntry.evidence && (
                    <div>
                      <Text type="secondary">证据</Text>
                      <Paragraph copyable style={{ margin: '4px 0 0' }}>{knowledgeDetailEntry.evidence}</Paragraph>
                    </div>
                  )}
                  {Array.isArray(knowledgeDetailEntry.entities) && knowledgeDetailEntry.entities.length > 0 && (
                    <div>
                      <Text type="secondary">实体</Text>
                      <Space wrap style={{ display: 'flex', marginTop: 6 }}>
                        {knowledgeDetailEntry.entities.map((entity: string, idx: number) => (
                          <Tag key={`${entity}-${idx}`} bordered={false}>{entity}</Tag>
                        ))}
                      </Space>
                    </div>
                  )}
                </Space>
              </Card>
            )}

            <div>
              <Text strong>完整内容</Text>
              <div
                style={{
                  marginTop: 8,
                  padding: 14,
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  background: '#fff',
                  maxHeight: 420,
                  overflow: 'auto',
                }}
              >
                <Paragraph
                  copyable
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.85,
                    fontSize: 15,
                  }}
                >
                  {knowledgeDetailEntry.content || '暂无内容'}
                </Paragraph>
              </div>
            </div>

            {Array.isArray(knowledgeDetailEntry.tags) && knowledgeDetailEntry.tags.length > 0 && (
              <div>
                <Text strong>标签</Text>
                <Space wrap style={{ display: 'flex', marginTop: 8 }}>
                  {knowledgeDetailEntry.tags.map((tag: string, idx: number) => renderKnowledgeTag(tag, idx))}
                </Space>
              </div>
            )}

            {(Array.isArray(knowledgeDetailEntry.genre_tags) && knowledgeDetailEntry.genre_tags.length > 0
              || Array.isArray(knowledgeDetailEntry.trope_tags) && knowledgeDetailEntry.trope_tags.length > 0) && (
              <div>
                <Text strong>题材与套路</Text>
                <Space wrap style={{ display: 'flex', marginTop: 8 }}>
                  {Array.isArray(knowledgeDetailEntry.genre_tags) && knowledgeDetailEntry.genre_tags.map((tag: string, idx: number) => (
                    <Tag key={`genre-detail-${tag}-${idx}`} color="cyan" bordered={false}>{tag}</Tag>
                  ))}
                  {Array.isArray(knowledgeDetailEntry.trope_tags) && knowledgeDetailEntry.trope_tags.map((tag: string, idx: number) => (
                    <Tag key={`trope-detail-${tag}-${idx}`} color="volcano" bordered={false}>{tag}</Tag>
                  ))}
                </Space>
              </div>
            )}
          </Space>
        )}
      </Modal>

      <Modal
        title={
          <Space direction="vertical" size={2}>
            <Space>
              <DatabaseOutlined style={{ color: '#1677ff' }} />
              <Text strong style={{ fontSize: 18 }}>投喂知识</Text>
            </Space>
            <Text type="secondary" style={{ fontSize: 13 }}>
              文本直投可立即入库；URL 和文件会先交给 AI 提炼，再预览确认。
            </Text>
          </Space>
        }
        open={feedOpen}
        width={760}
        onCancel={handleCloseFeed}
        onOk={
          feedMode === 'url'
            ? handleAnalyzeFromUrl
            : feedMode === 'file'
              ? () => fileInputRef.current?.click()
              : handleSubmitFeed
        }
        okText={
          feedMode === 'text'
            ? (feedSubmitting ? '提交中...' : '加入知识库')
            : feedMode === 'file'
              ? (fileReading ? '读取中...' : '选择文件并分析')
              : (feedAnalyzeLoading
                  ? (feedFetchOnly ? '拉取中...' : '分析中...')
                  : feedSerialFetch && feedFetchOnly
                    ? '仅拉取正文'
                    : feedSerialFetch && feedFullBook
                      ? '启动全本任务'
                      : '抓取并分析')
        }
        cancelText={feedAnalyzeLoading || fileReading ? '中断任务' : '取消'}
        confirmLoading={feedMode === 'text' ? feedSubmitting : feedMode === 'url' ? feedAnalyzeLoading : fileReading}
        okButtonProps={{
          disabled:
            feedMode === 'text'
              ? !feedText.trim()
              : feedMode === 'url'
                ? !feedUrl.trim()
                : false,
        }}
        destroyOnHidden={false}
        styles={{ body: { paddingTop: 10 } }}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={softPanelStyle}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              <Space align="center">
                <FolderOutlined style={{ color: '#1677ff' }} />
                <Text strong>投喂项目</Text>
                <Tag bordered={false}>知识隔离</Tag>
              </Space>
              <Input
                value={feedProjectTitle}
                onChange={(e) => {
                  setFeedProjectTitle(e.target.value)
                  setFeedProjectId(undefined)
                }}
                placeholder="例如：没钱修什么仙。这里是投喂分组，不绑定小说工作台项目"
                style={inputStyle}
              />
            </Space>
          </div>

          <div style={panelStyle}>
            <div style={fieldLabelStyle}>
              <BookOutlined />
              投喂方式
            </div>
            <Radio.Group
              value={feedMode}
              onChange={(e) => setFeedMode(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
            >
              <Radio.Button value="text" style={{ textAlign: 'center' }}>
                <FileTextOutlined /> 文本直投
              </Radio.Button>
              <Radio.Button value="url" style={{ textAlign: 'center' }}>
                <LinkOutlined /> URL 提炼
              </Radio.Button>
              <Radio.Button value="file" style={{ textAlign: 'center' }}>
                <CloudUploadOutlined /> TXT/PDF
              </Radio.Button>
            </Radio.Group>
          </div>

          {feedMode !== 'text' && (
            <div style={softPanelStyle}>
              <Row gutter={10} align="bottom">
                <Col flex="auto">
                  <div style={fieldLabelStyle}>
                    <DatabaseOutlined />
                    提炼模型
                  </div>
                  <Select
                    allowClear
                    showSearch
                    loading={feedModelsLoading}
                    value={feedModelId}
                    onChange={handleFeedModelChange}
                    optionFilterProp="label"
                    options={extractionModelOptions}
                    placeholder="默认自动选择模型"
                    notFoundContent={feedModelsLoading ? '加载中...' : '暂无可用模型'}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col>
                  <Button
                    icon={<ReloadOutlined />}
                    loading={feedModelsLoading}
                    onClick={loadAvailableModels}
                  />
                </Col>
              </Row>
            </div>
          )}

          {feedMode === 'text' ? (
            <div style={panelStyle}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Row gutter={10}>
                  <Col xs={24} md={12}>
                    <div style={fieldLabelStyle}>来源</div>
                    <Input
                      value={feedSource}
                      onChange={(e) => setFeedSource(e.target.value)}
                      placeholder="手动投喂 / 读书笔记 / 小说拆解"
                      style={inputStyle}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <div style={fieldLabelStyle}>标题</div>
                    <Input
                      value={feedTitle}
                      onChange={(e) => setFeedTitle(e.target.value)}
                      placeholder="可选，便于以后检索"
                      style={inputStyle}
                    />
                  </Col>
                </Row>
                <Row gutter={10}>
                  <Col xs={24} md={12}>
                    <div style={fieldLabelStyle}>
                      <TagsOutlined />
                      分类
                    </div>
                    <Select
                      showSearch
                      value={feedCategory}
                      onChange={setFeedCategory}
                      onSearch={(value) => setFeedCategory(value)}
                      options={knowledgeCategoryPresets}
                      placeholder="选择、搜索或输入分类"
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <div style={fieldLabelStyle}>标签</div>
                    <Input
                      value={feedTags}
                      onChange={(e) => setFeedTags(e.target.value)}
                      placeholder="开篇, 伏笔, 境界瓶颈"
                      style={inputStyle}
                    />
                  </Col>
                </Row>
                <div>
                  <div style={fieldLabelStyle}>知识正文</div>
                  <Input.TextArea
                    value={feedText}
                    onChange={(e) => setFeedText(e.target.value)}
                    placeholder="粘贴要沉淀的拆书笔记、设定片段、写作方法或样章分析..."
                    autoSize={{ minRows: 9, maxRows: 16 }}
                    showCount
                    style={{ borderRadius: 8 }}
                  />
                </div>
              </Space>
            </div>
          ) : feedMode === 'url' ? (
            <div style={panelStyle}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div style={fieldLabelStyle}>
                  <LinkOutlined />
                  网页地址
                </div>
                <Input
                  value={feedUrl}
                  onChange={(e) => setFeedUrl(e.target.value)}
                  placeholder="https://www.qute.cc/list/187949/"
                  prefix={<LinkOutlined style={{ color: '#94a3b8' }} />}
                  style={inputStyle}
                />
                <Row gutter={10} align="middle">
                  <Col flex="auto">
                    <Checkbox
                      checked={feedSerialFetch}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setFeedSerialFetch(checked)
                        if (!checked) {
                          setFeedFullBook(false)
                          setFeedFetchOnly(false)
                        }
                      }}
                    >
                      自动连载抓取：目录页先进入第一章，再追下一章
                    </Checkbox>
                  </Col>
                  <Col>
                    <Space size={8}>
                      <Text type="secondary">上限</Text>
                      <InputNumber
                        min={1}
                        max={5000}
                        value={feedMaxChapters}
                        onChange={(value) => setFeedMaxChapters(Number(value || 20))}
                        disabled={!feedSerialFetch || feedFullBook}
                        style={{ width: 92 }}
                      />
                      <Text type="secondary">章</Text>
                    </Space>
                  </Col>
                </Row>
                {feedSerialFetch && (
                  <Row gutter={[10, 10]} align="middle">
                    <Col xs={24} md={8}>
                      <Text type="secondary">全本模式</Text>
                    </Col>
                    <Col xs={24} md={16}>
                      <Checkbox
                        checked={feedFullBook}
                        onChange={(e) => setFeedFullBook(e.target.checked)}
                      >
                        {feedFetchOnly ? '一直追章到没有下一章，只写入正文缓存' : '一直追章到没有下一章，完成后自动入库'}
                      </Checkbox>
                    </Col>
                    <Col xs={24} md={8}>
                      <Text type="secondary">两阶段投喂</Text>
                    </Col>
                    <Col xs={24} md={16}>
                      <Checkbox
                        checked={feedFetchOnly}
                        onChange={(e) => setFeedFetchOnly(e.target.checked)}
                      >
                        先只拉取正文缓存，完成后再手动开始提炼
                      </Checkbox>
                    </Col>
                    <Col xs={24} md={8}>
                      <Text type="secondary">起始章节</Text>
                    </Col>
                    <Col xs={24} md={16}>
                      <Space size={8}>
                        <Text type="secondary">从第</Text>
                        <InputNumber
                          min={1}
                          max={100000}
                          value={feedStartChapter}
                          onChange={(value) => setFeedStartChapter(Number(value || 1))}
                          style={{ width: 100 }}
                        />
                        <Text type="secondary">章开始</Text>
                      </Space>
                    </Col>
                    <Col xs={24} md={8}>
                      <Text type="secondary">拉取并发数</Text>
                    </Col>
                    <Col xs={24} md={16}>
                      <Space size={8}>
                        <InputNumber
                          min={1}
                          max={24}
                          value={feedFetchConcurrency}
                          onChange={(value) => setFeedFetchConcurrency(Number(value || 1))}
                          style={{ width: 92 }}
                        />
                        <Text type="secondary">线程</Text>
                      </Space>
                    </Col>
                    <Col xs={24} md={8}>
                      <Text type="secondary">每批提炼章节数</Text>
                    </Col>
                    <Col xs={24} md={16}>
                      <Space size={8}>
                        <InputNumber
                          min={1}
                          max={50}
                          value={feedBatchSize}
                          onChange={(value) => setFeedBatchSize(Number(value || 10))}
                          style={{ width: 92 }}
                        />
                        <Text type="secondary">章/批</Text>
                      </Space>
                    </Col>
                  </Row>
                )}
                {feedIngestJob && feedSerialFetch && (
                  <div style={{ padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Space direction="vertical" size={6} style={{ width: '100%' }}>
                      <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                        <Text strong>{feedIngestJob.phase || '后台任务'}</Text>
                        <Space size={6}>
                          <Tag color={getIngestStatusColor(feedIngestJob.status)} bordered={false}>
                            {feedIngestJob.status || 'running'}
                          </Tag>
                          {getSourceCacheLabel(feedIngestJob.source_cache) && (
                            <Tag color={getSourceCacheColor(feedIngestJob.source_cache?.status)} bordered={false}>
                              {getSourceCacheLabel(feedIngestJob.source_cache)}
                            </Tag>
                          )}
                          {feedIngestJob.fetch_only && feedIngestJob.status === 'completed' && (
                            <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={handleAnalyzeCachedJob}>
                              从缓存开始提炼
                            </Button>
                          )}
                          {['queued', 'running'].includes(feedIngestJob.status) && (
                            <Button size="small" icon={<PauseCircleOutlined />} onClick={handlePauseIngestJob}>
                              暂停
                            </Button>
                          )}
                          {['paused', 'failed', 'canceled'].includes(feedIngestJob.status) && (
                            <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={handleResumeIngestJob}>
                              继续
                            </Button>
                          )}
                          {!['completed', 'canceled'].includes(feedIngestJob.status) && (
                            <Popconfirm title="确定取消当前后台提炼任务？" okText="取消任务" cancelText="返回" onConfirm={handleCancelIngestJob}>
                              <Button size="small" danger icon={<StopOutlined />}>
                                取消
                              </Button>
                            </Popconfirm>
                          )}
                        </Space>
                      </Space>
                      <Progress percent={Math.max(0, Math.min(100, Number(feedIngestJob.progress || 0)))} size="small" />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {feedIngestJob.fetch_only ? '仅拉取正文缓存；' : ''}
                        从第 {feedIngestJob.start_chapter || feedStartChapter || 1} 章开始；并发 {feedIngestJob.fetch_concurrency || feedFetchConcurrency || 1}；已抓取 {feedIngestJob.fetched_chapters || 0} 章
                        {feedIngestJob.fetch_only ? '' : `，已分析 ${feedIngestJob.analyzed_batches || 0}/${feedIngestJob.total_batches || 0} 批，候选知识 ${Array.isArray(feedIngestJob.entries) ? feedIngestJob.entries.length : 0} 条`}
                      </Text>
                      {(feedIngestJob.current_range || feedIngestJob.current_chapter) && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {feedIngestJob.status === 'completed' ? '已完成到' : '当前处理'}：
                          {feedIngestJob.current_range || `第${feedIngestJob.current_chapter}章`}
                          {feedIngestJob.current_chapter_title ? ` / ${feedIngestJob.current_chapter_title}` : ''}
                        </Text>
                      )}
                      {Array.isArray(feedIngestJob.batches) && feedIngestJob.batches.length > 0 && (
                        <Space wrap size={[6, 4]}>
                          {feedIngestJob.batches.map((batch: any) => (
                            <Tag key={batch.index} color={getBatchStatusColor(batch.status)} bordered={false}>
                              {batch.first_chapter === batch.last_chapter
                                ? `第${batch.first_chapter}章`
                                : `第${batch.first_chapter}-${batch.last_chapter}章`}
                              {' '}
                              {batch.status === 'completed' ? `完成 ${Array.isArray(batch.entries) ? batch.entries.length : 0}` : batch.status}
                            </Tag>
                          ))}
                        </Space>
                      )}
                    </Space>
                  </div>
                )}
                <div style={{ padding: 12, borderRadius: 8, background: '#f8fafc', color: '#64748b', fontSize: 13, lineHeight: 1.7 }}>
                  {feedSerialFetch && feedFetchOnly
                    ? '两阶段模式会先把章节正文完整拉取到本地缓存，不调用模型。目录页会优先并发拉取；解析不到目录时自动退回串行追章。'
                    : feedSerialFetch && feedFullBook
                    ? '全本模式会启动后台任务，一直追到没有下一章，跑完后自动写入当前投喂项目。抓取和提炼都可暂停，继续时会跳过已完成批次。'
                    : feedSerialFetch
                      ? '适合小说目录页。系统会后台自动进入第一章并逐章追章；如果已经投喂到第 20 章，把起始章节设为 21，就只分析后续章节。需要逐章重提时，把每批章节数设为 1。'
                    : '适合单页文章或章节页。系统会抓取当前页面正文，再让 AI 提炼为可入库知识。'}
                </div>
              </Space>
            </div>
          ) : (
            <div style={panelStyle}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,text/plain,application/pdf"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Row gutter={10}>
                  <Col xs={24} md={12}>
                    <div style={fieldLabelStyle}>标题</div>
                    <Input
                      value={feedTitle}
                      onChange={(e) => setFeedTitle(e.target.value)}
                      placeholder="默认使用文件名"
                      style={inputStyle}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <div style={fieldLabelStyle}>辅助分类</div>
                    <Select
                      showSearch
                      value={feedCategory}
                      onChange={setFeedCategory}
                      onSearch={(value) => setFeedCategory(value)}
                      options={knowledgeCategoryPresets}
                      placeholder="选择、搜索或输入分类"
                      style={{ width: '100%' }}
                    />
                  </Col>
                </Row>
                <div>
                  <div style={fieldLabelStyle}>辅助标签</div>
                  <Input
                    value={feedTags}
                    onChange={(e) => setFeedTags(e.target.value)}
                    placeholder="标签，支持逗号分隔；AI 也会补充标签"
                    style={inputStyle}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={fileReading}
                  style={{
                    width: '100%',
                    border: '1px dashed #93c5fd',
                    borderRadius: 10,
                    background: fileReading ? '#f8fafc' : '#eff6ff',
                    padding: '22px 16px',
                    cursor: fileReading ? 'default' : 'pointer',
                    color: '#1d4ed8',
                    textAlign: 'center',
                  }}
                >
                  <CloudUploadOutlined style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
                  <Text strong style={{ color: '#1d4ed8' }}>
                    {selectedFileName ? `已选择：${selectedFileName}` : '选择本地 TXT/PDF 文件'}
                  </Text>
                  <div style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>
                    读取后自动提炼，随后进入预览确认
                  </div>
                </button>
              </Space>
            </div>
          )}
        </Space>
      </Modal>

      <Modal
        title="AI 提炼结果预览"
        open={feedAnalyzePreviewOpen}
        onCancel={() => setFeedAnalyzePreviewOpen(false)}
        onOk={handleSaveAnalyzedEntries}
        okText={feedAnalyzeSaving ? '保存中...' : `批量保存 ${feedAnalyzedEntries.length} 条`}
        cancelText="取消"
        confirmLoading={feedAnalyzeSaving}
        width={760}
        destroyOnHidden={false}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Text type="secondary">来源：{feedAnalyzeSource || '未命名来源'}</Text>
          {feedProjectTitle.trim() && (
            <Text type="secondary">将保存到投喂项目：{feedProjectTitle.trim()}</Text>
          )}
          {Array.isArray(feedIngestJob?.batches) && feedIngestJob.batches.length > 0 && (
            <Card size="small" title="分批提炼进度" style={{ borderRadius: 8, background: '#fafcff' }}>
              <Space direction="vertical" size={10} style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  当前任务从第 {feedIngestJob.start_chapter || feedStartChapter || 1} 章开始，共抓取 {feedIngestJob.fetched_chapters || 0} 章，{feedIngestJob.total_batches || feedIngestJob.batches.length} 批。
                  如果需要精确到单章重新提炼，下次把“每批提炼章节数”设为 1。
                </Text>
                <div style={{ maxHeight: 220, overflow: 'auto', paddingRight: 4 }}>
                  <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    {feedIngestJob.batches.map((batch: any) => {
                      const label = batch.first_chapter === batch.last_chapter
                        ? `第${batch.first_chapter}章`
                        : `第${batch.first_chapter}-${batch.last_chapter}章`
                      const entryCount = Array.isArray(batch.entries) ? batch.entries.length : 0
                      return (
                        <Card key={batch.index} size="small" style={{ borderRadius: 8 }}>
                          <Space direction="vertical" size={6} style={{ width: '100%' }}>
                            <Space style={{ justifyContent: 'space-between', width: '100%' }} align="start">
                              <Space direction="vertical" size={2}>
                                <Space wrap>
                                  <Text strong>{label}</Text>
                                  <Tag color={getBatchStatusColor(batch.status)} bordered={false}>{batch.status || 'pending'}</Tag>
                                  <Tag bordered={false}>候选 {entryCount}</Tag>
                                </Space>
                                <Text type="secondary" style={{ fontSize: 12 }}>{batch.title || batch.source || ''}</Text>
                              </Space>
                              <Button
                                size="small"
                                icon={<ReloadOutlined />}
                                loading={feedReanalyzingBatch === batch.index}
                                disabled={feedReanalyzingBatch !== null || feedAnalyzeSaving}
                                onClick={() => handleReanalyzeBatch(batch.index)}
                              >
                                重新提炼
                              </Button>
                            </Space>
                            {batch.error && (
                              <Text type="danger" style={{ fontSize: 12 }}>{batch.error}</Text>
                            )}
                          </Space>
                        </Card>
                      )
                    })}
                  </Space>
                </div>
              </Space>
            </Card>
          )}
          {feedAnalyzedEntries.length === 0 ? (
            <Text type="secondary">暂无可保存条目</Text>
          ) : (
            <div style={{ maxHeight: 460, overflow: 'auto', paddingRight: 4 }}>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {feedAnalyzedEntries.map((entry: any, index: number) => (
                  <Card key={`${entry.title || 'entry'}-${index}`} size="small" style={{ borderRadius: 12 }}>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Space wrap>
                        <Text strong>{entry.title || '未命名知识'}</Text>
                        <Tag color="geekblue" bordered={false}>{entry.category || '未分类'}</Tag>
                        {typeof entry.weight === 'number' && <Tag bordered={false}>权重 {entry.weight}</Tag>}
                        {renderMetaTags(entry)}
                      </Space>
                      <Text>{entry.content || ''}</Text>
                      {Array.isArray(entry.tags) && entry.tags.length > 0 && (
                        <Space wrap>
                          {entry.tags.map((tag: string, idx: number) => renderKnowledgeTag(tag, idx))}
                        </Space>
                      )}
                    </Space>
                  </Card>
                ))}
              </Space>
            </div>
          )}
        </Space>
      </Modal>

      <NovelCreateWizard
        open={wizardOpen}
        onCancel={handleWizardCancel}
        onSuccess={handleWizardSuccess}
      />
    </div>
  )
}
