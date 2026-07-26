import React, { useEffect, useMemo, useState } from 'react'
import { message, Modal, Tag } from 'antd'
import { useSearchParams } from 'react-router-dom'
import apiClient from '../../api/client'
import {
  formatKnowledgeCategory as formatKnowledgeCategoryShared,
} from './knowledge-ui-shared'
import {
  buildKnowledgeCategoryOptions,
  filterKnowledgeEntries,
} from './studio-controller-derived'
import { useStudioFeedPanelController } from './useStudioFeedPanelController'
import { useStudioSourceCachePanelController } from './useStudioSourceCachePanelController'

export function useStudioKnowledgePanelsController() {
  const [searchParams, setSearchParams] = useSearchParams()

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
  const [ohStoryPublishKind, setOhStoryPublishKind] = useState<string>('')
  const [ohStoryPublishInput, setOhStoryPublishInput] = useState('')
  const [ohStoryLastPublish, setOhStoryLastPublish] = useState<string>('')

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

  const filteredKnowledgeEntries = filterKnowledgeEntries(knowledgeEntries, knowledgeSearch)

  const categoryOptions = buildKnowledgeCategoryOptions(knowledgeSummary)

  const knowledgeStats = {
    total: knowledgeEntries.length,
    categories: categoryOptions.length,
  }

  const knowledgeCategoryLabel = knowledgeCategory
    ? (knowledgeSummary[knowledgeCategory]?.label || knowledgeCategory)
    : '全部分类'

  const knowledgeProjectLabel = knowledgeProjectTitle || '全部投喂项目'

  const knowledgeCountText = `共 ${filteredKnowledgeEntries.length} / ${knowledgeEntries.length} 条`


  const knowledgePanelFromUrl = searchParams.get('panel') === 'knowledge'
  const memoryPalacePanelFromUrl = searchParams.get('panel') === 'memory-palace'
  const sourceCachePanelFromUrl = searchParams.get('panel') === 'source-cache'
  const knowledgeActionFromUrl = searchParams.get('action')
  const knowledgeProjectFromUrl = searchParams.get('project_title') || ''
  const sourceCacheProjectFromUrl = searchParams.get('project_title') || ''

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


  const sourceCache = useStudioSourceCachePanelController({
    sourceCachePanelFromUrl,
    sourceCacheProjectFromUrl,
    updateKnowledgeRoute,
  })

  const feed = useStudioFeedPanelController({
    knowledgeCategory,
    knowledgeOpen,
    setKnowledgeOpen,
    knowledgeProjectTitle,
    setKnowledgeProjectTitle,
    setKnowledgeProjectDraft,
    loadKnowledge,
    updateKnowledgeRoute,
    knowledgePanelFromUrl,
    knowledgeActionFromUrl,
    sourceCacheOpen: sourceCache.sourceCacheOpen,
    loadSourceCaches: sourceCache.loadSourceCaches,
  })

  const resolveNovelProjectIdByTitle = async (title: string) => {
    const needle = title.trim()
    if (!needle) return undefined
    try {
      const res = await apiClient.get('/novel/projects')
      const rows = Array.isArray(res.data) ? res.data : []
      const exact = rows.find((item: any) => String(item?.title || '').trim() === needle)
      if (exact?.id) return Number(exact.id)
      const fuzzy = rows.find((item: any) => String(item?.title || '').includes(needle) || needle.includes(String(item?.title || '')))
      if (fuzzy?.id) return Number(fuzzy.id)
    } catch {
      // ignore resolve errors; publish can still proceed without project id
    }
    return undefined
  }

  const handlePublishOhStoryKnowledge = async (kind: string) => {
    const projectTitle = (knowledgeProjectTitle || knowledgeProjectDraft || ohStoryPublishInput).trim()
    const tip = ohStoryPublishInput.trim()
    if (!projectTitle && !['long_scan', 'short_suite', 'cover'].includes(kind)) {
      message.warning('请先填写当前项目名或题材关键词，再发布到知识库')
      return
    }

    setOhStoryPublishKind(kind)
    setOhStoryLastPublish('')
    try {
      let projectId = Number(feed.feedProjectId || 0) || undefined
      if (kind === 'ending_reserve' && !projectId) {
        projectId = await resolveNovelProjectIdByTitle(projectTitle)
        if (!projectId) {
          message.warning('终局账本需要关联真实小说项目：请把筛选项目名写成已有小说项目名')
          return
        }
      }

      const input: Record<string, any> = {
        title: tip || projectTitle,
        book_title: tip || projectTitle,
        project_title: projectTitle,
      }
      if (tip) {
        input.genre = tip
        input.tags = tip
        input.platform = tip
      } else if (projectTitle) {
        input.genre = projectTitle
      }

      const res = await apiClient.post('/novel/oh-story/knowledge/publish', {
        kind,
        project_id: projectId,
        project_title: projectTitle || undefined,
        auto_store: true,
        input,
      })

      const stored = res.data?.stored
      const entryCount = Array.isArray(res.data?.entries) ? res.data.entries.length : 0
      const storedCount = Array.isArray(stored)
        ? stored.length
        : Array.isArray(stored?.entries)
          ? stored.entries.length
          : stored?.id
            ? 1
            : entryCount
      if (!entryCount) {
        message.warning('未生成可入库条目，请检查题材关键词或项目数据')
        setOhStoryLastPublish('未生成条目')
        return
      }

      const kindLabelMap: Record<string, string> = {
        long_analyze: '拆文计划',
        long_scan: '扫榜计划',
        import: '导入计划',
        cover: '封面简报',
        short_suite: '短篇计划',
        genre_card: '题材卡',
        ending_reserve: '终局账本',
      }
      const label = kindLabelMap[kind] || kind
      message.success(`已发布${label}到知识库（${storedCount || entryCount} 条）`)
      setOhStoryLastPublish(`最近发布：${label} · ${storedCount || entryCount} 条`)
      if (projectTitle && projectTitle !== knowledgeProjectTitle) {
        setKnowledgeProjectTitle(projectTitle)
        setKnowledgeProjectDraft(projectTitle)
      }
      await loadKnowledge(knowledgeCategory || undefined, projectTitle || knowledgeProjectTitle)
    } catch (error: any) {
      message.error(String(error?.response?.data?.error || error?.message || '发布失败'))
      setOhStoryLastPublish('发布失败')
    } finally {
      setOhStoryPublishKind('')
    }
  }

  const handleOpenKnowledge = () => {
    setKnowledgeOpen(true)
    updateKnowledgeRoute({ panel: 'knowledge', action: null })
  }

  const handleCloseKnowledge = () => {
    setKnowledgeOpen(false)
    feed.setFeedOpen(false)
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

  useEffect(() => {
    if (!knowledgePanelFromUrl) return
    const next = String(knowledgeProjectFromUrl || '').trim()
    if (next && next !== knowledgeProjectTitle) {
      setKnowledgeProjectTitle(next)
      setKnowledgeProjectDraft(next)
      feed.setFeedProjectId(undefined)
      feed.setFeedProjectTitle(next)
    }
  }, [knowledgePanelFromUrl, knowledgeProjectFromUrl])


  return {
    searchParams,
    setSearchParams,
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
    ...sourceCache,
    ...feed,
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
    knowledgePanelFromUrl,
    memoryPalacePanelFromUrl,
    sourceCachePanelFromUrl,
    knowledgeActionFromUrl,
    knowledgeProjectFromUrl,
    sourceCacheProjectFromUrl,
    updateKnowledgeRoute,
    renderKnowledgeTag,
    renderMetaTags,
    formatKnowledgeCategory,
    knowledgeEmpty,
    ohStoryPublishKind,
    ohStoryPublishInput,
    setOhStoryPublishInput,
    ohStoryLastPublish,
    handlePublishOhStoryKnowledge,
    handleOpenKnowledge,
    handleCloseKnowledge,
    handleOpenMemoryPalace,
    handleCloseMemoryPalace,
  }
}
