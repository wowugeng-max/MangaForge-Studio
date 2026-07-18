import { useEffect, useMemo, useState } from 'react'
import { message } from 'antd'
import apiClient from '../../api/client'
import { filterSourceCaches } from './studio-controller-derived'

export function useStudioSourceCachePanelController(deps: {
  sourceCachePanelFromUrl: boolean
  sourceCacheProjectFromUrl: string
  updateKnowledgeRoute: (next: { panel?: string | null; action?: string | null; projectTitle?: string | null }) => void
}) {
  const { sourceCachePanelFromUrl, sourceCacheProjectFromUrl, updateKnowledgeRoute } = deps

  const [sourceCacheOpen, setSourceCacheOpen] = useState(false)
  const [sourceCacheLoading, setSourceCacheLoading] = useState(false)
  const [sourceCaches, setSourceCaches] = useState<any[]>([])
  const [sourceCacheSearch, setSourceCacheSearch] = useState('')
  const [selectedSourceCacheKey, setSelectedSourceCacheKey] = useState('')
  const [sourceCacheDetail, setSourceCacheDetail] = useState<any | null>(null)
  const [sourceCacheChapter, setSourceCacheChapter] = useState<any | null>(null)
  const [sourceCacheChapterLoading, setSourceCacheChapterLoading] = useState(false)

  const filteredSourceCaches = useMemo(
    () => filterSourceCaches(sourceCaches, sourceCacheSearch),
    [sourceCaches, sourceCacheSearch],
  )


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


  return {
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
    filteredSourceCaches,
    loadSourceCacheChapter,
    loadSourceCacheDetail,
    loadSourceCaches,
    handleOpenSourceCache,
    handleCloseSourceCache,
  }
}
