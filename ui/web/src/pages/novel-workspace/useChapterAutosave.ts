import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { message } from 'antd'
import apiClient from '../../api/client'

export type ChapterSaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'

export function useChapterAutosave({
  activeChapterId,
  resetKey,
  setActiveChapterId,
  setChapters,
}: {
  activeChapterId: number | null
  resetKey: string | number
  setActiveChapterId: (chapterId: number | null) => void
  setChapters: Dispatch<SetStateAction<any[]>>
}) {
  const [saveStatus, setSaveStatus] = useState<ChapterSaveStatus>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveInFlightRef = useRef(false)
  const pendingSaveRef = useRef<{ chapterId: number; text: string } | null>(null)
  const saveWaitersRef = useRef<Array<(ok: boolean) => void>>([])
  const manualEditVersionChapterIdsRef = useRef<Set<number>>(new Set())

  const clearSaveTimers = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (saveIdleTimerRef.current) clearTimeout(saveIdleTimerRef.current)
    saveTimerRef.current = null
    saveIdleTimerRef.current = null
  }, [])

  const runSaveQueue = useCallback(async (): Promise<boolean> => {
    if (saveInFlightRef.current) {
      return new Promise(resolve => saveWaitersRef.current.push(resolve))
    }
    const next = pendingSaveRef.current
    if (!next) return true

    pendingSaveRef.current = null
    saveInFlightRef.current = true
    setSaveStatus('saving')

    let ok = false
    try {
      const createVersion = !manualEditVersionChapterIdsRef.current.has(next.chapterId)
      const res = await apiClient.put(`/novel/chapters/${next.chapterId}`, {
        chapter_text: next.text,
        create_version: createVersion,
        version_source: 'manual_edit',
      })
      const updated = res.data || {}
      setChapters(prev => prev.map(c => c.id === next.chapterId ? { ...c, ...updated, chapter_text: next.text } : c))
      manualEditVersionChapterIdsRef.current.add(next.chapterId)
      setSaveStatus('saved')
      if (saveIdleTimerRef.current) clearTimeout(saveIdleTimerRef.current)
      saveIdleTimerRef.current = setTimeout(() => setSaveStatus('idle'), 1800)
      ok = true
    } catch {
      if (!pendingSaveRef.current) pendingSaveRef.current = next
      setSaveStatus('error')
      message.error('保存失败，请检查网络')
    } finally {
      saveInFlightRef.current = false
      const waiters = saveWaitersRef.current.splice(0)
      if (ok && pendingSaveRef.current) {
        const nextOk = await runSaveQueue()
        waiters.forEach(resolve => resolve(nextOk))
        return nextOk
      }
      waiters.forEach(resolve => resolve(ok))
    }
    return ok
  }, [setChapters])

  const scheduleSave = useCallback((chapterId: number | null, text: string) => {
    if (!chapterId) return
    pendingSaveRef.current = { chapterId, text }
    setSaveStatus('unsaved')
    if (saveIdleTimerRef.current) {
      clearTimeout(saveIdleTimerRef.current)
      saveIdleTimerRef.current = null
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => { void runSaveQueue() }, 1200)
  }, [runSaveQueue])

  const flushPendingSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    return runSaveQueue()
  }, [runSaveQueue])

  const selectChapter = useCallback(async (chapterId: number) => {
    if (chapterId === activeChapterId) return true
    const saved = await flushPendingSave()
    if (!saved) return false
    setActiveChapterId(chapterId)
    return true
  }, [activeChapterId, flushPendingSave, setActiveChapterId])

  useEffect(() => {
    manualEditVersionChapterIdsRef.current.clear()
    pendingSaveRef.current = null
    clearSaveTimers()
    setSaveStatus('idle')
  }, [resetKey, clearSaveTimers])

  useEffect(() => {
    return () => { clearSaveTimers() }
  }, [clearSaveTimers])

  return {
    saveStatus,
    scheduleSave,
    flushPendingSave,
    selectChapter,
  }
}
