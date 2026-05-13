import { useCallback, useEffect, useState } from 'react'
import { message } from 'antd'
import apiClient from '../../api/client'

export function useChapterVersions({
  activeChapter,
  flushPendingSave,
  reloadProject,
}: {
  activeChapter: any | null
  flushPendingSave: () => Promise<boolean>
  reloadProject: () => Promise<void>
}) {
  const [chapterVersions, setChapterVersions] = useState<any[]>([])
  const [chapterVersionsLoading, setChapterVersionsLoading] = useState(false)
  const [chapterVersionDetail, setChapterVersionDetail] = useState<any | null>(null)
  const [rollingBackVersionId, setRollingBackVersionId] = useState<number | null>(null)

  const loadChapterVersions = useCallback(async (chapterId: number) => {
    setChapterVersionsLoading(true)
    try {
      const res = await apiClient.get(`/novel/chapters/${chapterId}/versions`)
      setChapterVersions(Array.isArray(res.data) ? res.data : [])
    } catch {
      setChapterVersions([])
    } finally {
      setChapterVersionsLoading(false)
    }
  }, [])

  const rollbackChapterVersion = useCallback(async (versionId: number) => {
    if (!activeChapter) return
    if (!await flushPendingSave()) return
    setRollingBackVersionId(versionId)
    try {
      await apiClient.post(`/novel/chapters/${activeChapter.id}/rollback`, { version_id: versionId })
      await reloadProject()
      await loadChapterVersions(activeChapter.id)
      message.success('已回滚到指定版本')
    } catch {
      message.error('回滚失败')
    } finally {
      setRollingBackVersionId(null)
    }
  }, [activeChapter, flushPendingSave, loadChapterVersions, reloadProject])

  useEffect(() => {
    if (activeChapter?.id) {
      void loadChapterVersions(activeChapter.id)
      setChapterVersionDetail(null)
    } else {
      setChapterVersions([])
      setChapterVersionDetail(null)
    }
  }, [activeChapter?.id, loadChapterVersions])

  return {
    chapterVersions,
    chapterVersionsLoading,
    chapterVersionDetail,
    rollingBackVersionId,
    setChapterVersionDetail,
    rollbackChapterVersion,
  }
}
