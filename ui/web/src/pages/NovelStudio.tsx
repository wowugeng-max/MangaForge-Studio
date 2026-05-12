import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Checkbox, Col, Drawer, Input, InputNumber, Modal, Popconfirm, Progress, Radio, Row, Select, Space, Tag, Typography, message } from 'antd'
import { BookOutlined, CloudUploadOutlined, DatabaseOutlined, DeleteOutlined, EditOutlined, EyeOutlined, FileTextOutlined, FolderOutlined, LinkOutlined, PlusOutlined, ReadOutlined, ReloadOutlined, SearchOutlined, TagsOutlined } from '@ant-design/icons'
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

export default function NovelStudio() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [searchText, setSearchText] = useState('')

  const [knowledgeOpen, setKnowledgeOpen] = useState(false)
  const [knowledgeLoading, setKnowledgeLoading] = useState(false)
  const [knowledgeEntries, setKnowledgeEntries] = useState<any[]>([])
  const [knowledgeSummary, setKnowledgeSummary] = useState<Record<string, { label: string; count: number }>>({})
  const [knowledgeSearch, setKnowledgeSearch] = useState('')
  const [knowledgeCategory, setKnowledgeCategory] = useState('')
  const [knowledgeProjectTitle, setKnowledgeProjectTitle] = useState('')
  const [knowledgeProjectOptions, setKnowledgeProjectOptions] = useState<{ value: string; label: string }[]>([])
  const [knowledgeLoadedOnce, setKnowledgeLoadedOnce] = useState(false)
  const [knowledgeQuery, setKnowledgeQuery] = useState('')
  const [knowledgeQueryLoading, setKnowledgeQueryLoading] = useState(false)
  const [knowledgeQueryResults, setKnowledgeQueryResults] = useState<any[]>([])
  const [knowledgeDetailEntry, setKnowledgeDetailEntry] = useState<any | null>(null)
  const [memoryPalaceOpen, setMemoryPalaceOpen] = useState(false)

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
  const [feedMaxChapters, setFeedMaxChapters] = useState(20)
  const [feedBatchSize, setFeedBatchSize] = useState(10)
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
            label: `${item.title || '未命名项目'}${item.count ? ` ${item.count}` : ''}`,
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
    return [entry.title, entry.content, entry.source, entry.project_title, ...(Array.isArray(entry.tags) ? entry.tags : [])]
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

  useEffect(() => {
    if (knowledgePanelFromUrl && !knowledgeOpen) {
      setKnowledgeOpen(true)
    }
    if (!knowledgePanelFromUrl && knowledgeOpen) {
      setKnowledgeOpen(false)
    }
  }, [knowledgePanelFromUrl, knowledgeOpen])

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

  const updateKnowledgeRoute = (next: { panel?: string | null; action?: string | null }) => {
    const params = new URLSearchParams(searchParams)
    if (next.panel === null) params.delete('panel')
    else if (next.panel) params.set('panel', next.panel)

    if (next.action === null) params.delete('action')
    else if (next.action) params.set('action', next.action)

    setSearchParams(params, { replace: true })
  }

  const renderKnowledgeTag = (tag: string, idx: number) => (
    <Tag key={`${tag}-${idx}`} bordered={false} color="blue">{tag}</Tag>
  )

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
    setFeedMaxChapters(20)
    setFeedBatchSize(10)
    setFeedIngestJob(null)
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
    updateKnowledgeRoute({ panel: null, action: null })
  }

  const handleOpenMemoryPalace = () => {
    setMemoryPalaceOpen(true)
    updateKnowledgeRoute({ panel: 'memory-palace', action: null })
  }

  const handleCloseMemoryPalace = () => {
    setMemoryPalaceOpen(false)
    updateKnowledgeRoute({ panel: null, action: null })
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

  const handleCloseFeed = () => {
    if (feedSubmitting || feedAnalyzeLoading || fileReading) return
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
    setKnowledgeProjectTitle(String(value || '').trim())
    setKnowledgeCategory('')
    setKnowledgeQueryResults([])
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
      if (feedProjectTitle.trim()) setKnowledgeProjectTitle(feedProjectTitle.trim())
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
    return 'default'
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
      if (job?.status === 'completed') return job
      if (job?.status === 'failed') {
        throw new Error(Array.isArray(job.errors) && job.errors.length ? job.errors[0] : '后台提炼任务失败')
      }
    }
  }

  const handleAnalyzeFromUrl = async () => {
    const url = feedUrl.trim()
    if (!url) {
      message.warning('请输入要抓取的 URL')
      return
    }
    setFeedAnalyzeLoading(true)
    try {
      let fetchedText = ''
      let source = url
      if (feedSerialFetch) {
        const startRes = await apiClient.post('/knowledge/ingest/start', {
          url,
          model_id: feedModelId,
          start_chapter: feedStartChapter,
          max_chapters: feedMaxChapters,
          batch_size: feedBatchSize,
        })
        const startedJob = startRes.data?.job
        if (!startedJob?.id) {
          message.warning('后台任务启动失败')
          return
        }
        setFeedIngestJob(startedJob)
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
        const fetchRes = await apiClient.post('/knowledge/fetch-url', { url })
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
      })
      const entries = Array.isArray(analyzeRes.data?.entries) ? analyzeRes.data.entries : []
      if (!entries.length) {
        message.warning('AI 没有提炼出可入库知识')
        return
      }
      openAnalyzePreview(entries, source)
      message.success(`已提炼 ${entries.length} 条知识候选`)
    } catch {
      message.error('URL 抓取或分析失败')
    } finally {
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

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
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

        const readRes = await apiClient.post('/knowledge/read-local-file', payload)
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
        })
        const entries = Array.isArray(analyzeRes.data?.entries) ? analyzeRes.data.entries : []
        if (!entries.length) {
          message.warning('AI 没有提炼出可入库知识')
          return
        }
        openAnalyzePreview(entries, file.name)
        message.success(`已从 ${file.name} 读取并提炼 ${entries.length} 条知识候选`)
      } catch {
        message.error('文件读取或分析失败')
      } finally {
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
      if (feedProjectTitle.trim()) setKnowledgeProjectTitle(feedProjectTitle.trim())
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

          <Card size="small" title="筛选与检索" style={{ borderRadius: 8 }}>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Select
                allowClear
                showSearch
                value={knowledgeProjectTitle || undefined}
                onChange={handleKnowledgeProjectChange}
                placeholder="全部投喂项目（全局混合视图）"
                options={knowledgeProjectOptions}
                optionFilterProp="label"
                style={{ width: '100%' }}
              />
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
              </Space>
            </Card>

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
              : (feedAnalyzeLoading ? '分析中...' : '抓取并分析')
        }
        cancelText="取消"
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
                      onChange={(e) => setFeedSerialFetch(e.target.checked)}
                    >
                      自动连载抓取：目录页先进入第一章，再追下一章
                    </Checkbox>
                  </Col>
                  <Col>
                    <Space size={8}>
                      <Text type="secondary">上限</Text>
                      <InputNumber
                        min={1}
                        max={500}
                        value={feedMaxChapters}
                        onChange={(value) => setFeedMaxChapters(Number(value || 20))}
                        disabled={!feedSerialFetch}
                        style={{ width: 92 }}
                      />
                      <Text type="secondary">章</Text>
                    </Space>
                  </Col>
                </Row>
                {feedSerialFetch && (
                  <Row gutter={[10, 10]} align="middle">
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
                        <Tag color={feedIngestJob.status === 'failed' ? 'red' : feedIngestJob.status === 'completed' ? 'green' : 'blue'} bordered={false}>
                          {feedIngestJob.status || 'running'}
                        </Tag>
                      </Space>
                      <Progress percent={Math.max(0, Math.min(100, Number(feedIngestJob.progress || 0)))} size="small" />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        从第 {feedIngestJob.start_chapter || feedStartChapter || 1} 章开始；已抓取 {feedIngestJob.fetched_chapters || 0} 章，已分析 {feedIngestJob.analyzed_batches || 0}/{feedIngestJob.total_batches || 0} 批，候选知识 {Array.isArray(feedIngestJob.entries) ? feedIngestJob.entries.length : 0} 条
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
                  {feedSerialFetch
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
