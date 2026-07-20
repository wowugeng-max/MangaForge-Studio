import React from 'react'
import { message, Modal } from 'antd'
import { chapterHasProse, displayValue } from '../utils'
import { renderGenerationResultDiffContentView } from './workspace-commercial-ops-views'

export type ChapterProseHandlerDeps = {
  proseBatchCancelRef: any
  setProseBatchStatus: any
  setProseProgress: any
  setStepProseLoading: any
  sortedChapters: any
  activeChapter: any
  apiClient: any
  autoCreationDirectorModel: any
  chapterWordTargetPayload: any
  chapters: any
  confirmReferenceReady: any
  flushPendingSave: any
  loadProjectModules: any
  projectId: any
  selectedModelId: any
  setChapters: any
  setGeneratingProse: any
  setGenerationPipeline: any
  setRightPanelOpen: any
  setRightPanelTab: any
  setStreamingChapterId: any
  setStreamingPercent: any
  setStreamingProgress: any
  setStreamingText: any
  showGenerationBlockedModal: any
  worldbuilding: any
  characters: any
  outlines: any
}

export function createChapterProseHandlers(deps: ChapterProseHandlerDeps) {
  const proseBatchCancelRef = deps.proseBatchCancelRef
  const setProseBatchStatus = deps.setProseBatchStatus
  const setProseProgress = deps.setProseProgress
  const setStepProseLoading = deps.setStepProseLoading
  const sortedChapters = deps.sortedChapters
  const activeChapter = deps.activeChapter
  const apiClient = deps.apiClient
  const autoCreationDirectorModel = deps.autoCreationDirectorModel
  const chapterWordTargetPayload = deps.chapterWordTargetPayload
  const chapters = deps.chapters
  const confirmReferenceReady = deps.confirmReferenceReady
  const flushPendingSave = deps.flushPendingSave
  const loadProjectModules = deps.loadProjectModules
  const projectId = deps.projectId
  const selectedModelId = deps.selectedModelId
  const setChapters = deps.setChapters
  const setGeneratingProse = deps.setGeneratingProse
  const setGenerationPipeline = deps.setGenerationPipeline
  const setRightPanelOpen = deps.setRightPanelOpen
  const setRightPanelTab = deps.setRightPanelTab
  const setStreamingChapterId = deps.setStreamingChapterId
  const setStreamingPercent = deps.setStreamingPercent
  const setStreamingProgress = deps.setStreamingProgress
  const setStreamingText = deps.setStreamingText
  const showGenerationBlockedModal = deps.showGenerationBlockedModal
  const worldbuilding = Array.isArray(deps.worldbuilding) ? deps.worldbuilding : []
  const characters = Array.isArray(deps.characters) ? deps.characters : []
  const outlines = Array.isArray(deps.outlines) ? deps.outlines : []

  const generateCurrentChapterProse = async (options: { allowIncomplete?: boolean; forceSceneCards?: boolean; targetChapterId?: number } = {}) => {
    const targetChapter = options.targetChapterId
      ? chapters.find(ch => String(ch.id) === String(options.targetChapterId))
      : activeChapter
    if (!targetChapter) return message.warning('请先选择章节')
    if (!selectedModelId) return message.warning('请先选择写作模型')
    if (!await flushPendingSave()) return
    if (!await confirmReferenceReady('正文创作')) return
    const targetChapterNo = Number(targetChapter.chapter_no || 0)
    const currentChapterLaunchGate = (
      Number(autoCreationDirectorModel.targetChapter?.id || 0) === Number(targetChapter.id || 0)
      || Number(autoCreationDirectorModel.targetChapter?.chapterNo || 0) === targetChapterNo
    )
      ? autoCreationDirectorModel.chapterLaunchGate
      : null
    setStreamingChapterId(targetChapter.id)
    setStreamingText('')
    setStreamingProgress('正在请求模型...')
    setStreamingPercent(10)
    setGenerationPipeline([])
    setGeneratingProse(true)
    try {
      const ctx = {
        worldbuilding: worldbuilding[0] || null,
        characters, outlines,
        previousChapter: chapters.filter(ch => ch.chapter_no < targetChapterNo).sort((a, b) => b.chapter_no - a.chapter_no)[0] || null,
      }
      const resp = await fetch(
        `${apiClient.defaults.baseURL}/novel/chapters/${targetChapter.id}/generate-prose?stream=1`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({
            project_id: projectId, model_id: selectedModelId,
            ...chapterWordTargetPayload(),
            longform_compass: autoCreationDirectorModel.longformCompass,
            longform_battle_context: autoCreationDirectorModel.longformBattleDesk,
            chapter_launch_gate: currentChapterLaunchGate,
            million_word_runway: autoCreationDirectorModel.millionWordRunway,
            prompt: `请生成第 ${targetChapter.chapter_no} 章《${displayValue(targetChapter.title)}》完整正文`,
            payload: ctx,
            allow_incomplete: Boolean(options.allowIncomplete),
            force_scene_cards: Boolean(options.forceSceneCards),
          }),
        },
      )
      if (!resp.ok || !resp.body) {
        const raw = await resp.text()
        let payload: any = null
        try { payload = raw ? JSON.parse(raw) : null } catch { payload = null }
        if (payload?.error_code === 'PROSE_PREFLIGHT_BLOCKED' || payload?.error_code === 'REFERENCE_SAFETY_BLOCKED') {
          showGenerationBlockedModal(payload, () => { void generateCurrentChapterProse({ ...options, allowIncomplete: true }) }, {
            targetChapterId: targetChapter.id,
            onRepairComplete: () => { void generateCurrentChapterProse({ ...options, allowIncomplete: false, forceSceneCards: true, targetChapterId: targetChapter.id }) },
          })
        }
        throw new Error(payload?.error || raw || `HTTP ${resp.status}`)
      }
      const reader = resp.body.getReader()
      const dec = new TextDecoder('utf-8')
      let buf = '', done: any
      while (true) {
        const { value, done: d } = await reader.read()
        if (d) break
        buf += dec.decode(value, { stream: true })
        const parts = buf.split('\n\n'); buf = parts.pop() || ''
        for (const part of parts) {
          const line = part.split('\n').find(r => r.startsWith('data: '))
          if (!line) continue
          const p = JSON.parse(line.replace(/^data: /, ''))
          if (p.pipeline) setGenerationPipeline(Array.isArray(p.pipeline) ? p.pipeline : [])
          if (p.type === 'progress') { setStreamingProgress(p.progress || '生成中...'); setStreamingPercent(Math.min(90, p.percent || 35)) }
          else if (p.type === 'chunk') { setStreamingText(prev => `${prev}${p.text || ''}`); setStreamingPercent(prev => Math.min(95, prev + 2)) }
          else if (p.type === 'done') done = p
          else if (p.type === 'error') {
            if (p.error_code === 'PROSE_PREFLIGHT_BLOCKED' || p.error_code === 'REFERENCE_SAFETY_BLOCKED') {
              showGenerationBlockedModal(p, () => { void generateCurrentChapterProse({ ...options, allowIncomplete: true }) }, {
                targetChapterId: targetChapter.id,
                onRepairComplete: () => { void generateCurrentChapterProse({ ...options, allowIncomplete: false, forceSceneCards: true, targetChapterId: targetChapter.id }) },
              })
            }
            throw new Error(p.error || '正文生成失败')
          }
        }
      }
      const updated = done?.chapter
      if (updated) setChapters(prev => prev.map(c => c.id === updated.id ? updated : c))
      setStreamingProgress('生成完成')
      setStreamingPercent(100)
      setStreamingText(prev => prev || updated?.chapter_text || '')
      await loadProjectModules()
      if (done?.diff) {
        const diff = done.diff
        Modal.info({
          title: '生成结果差异',
          width: 820,
          content: renderGenerationResultDiffContentView(diff, done.previous_version),
        })
      }
      setRightPanelOpen(true)
      setRightPanelTab('proseQuality')
      message.success(`已使用 ${done?.result?.modelName || '所选模型'} 生成正文`)
    } catch (error: any) {
      setStreamingProgress('生成失败'); setStreamingPercent(0)
      message.error(error?.message || '正文生成失败')
    } finally {
      setGeneratingProse(false)
      setTimeout(() => { setStreamingChapterId(null); setStreamingPercent(0) }, 1500)
    }
  }

  const repairContextAndGenerateCurrentChapter = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await flushPendingSave()) return
    const targetChapterId = activeChapter.id
    setGeneratingProse(true)
    setStreamingChapterId(targetChapterId)
    setStreamingText('')
    setStreamingProgress('自动补齐上下文材料')
    setStreamingPercent(8)
    try {
      const res = await apiClient.post(`/novel/chapters/${targetChapterId}/auto-repair-context`, {
        project_id: projectId,
        model_id: selectedModelId,
      })
      const applied = Array.isArray(res.data?.applied) ? res.data.applied : []
      const warnings = Array.isArray(res.data?.warnings) ? res.data.warnings : []
      await loadProjectModules()
      if (warnings.length) {
        message.warning(String(warnings[0] || '上下文补齐已降级处理，将继续生成正文'))
      } else {
        message.success(applied.length ? `已自动补齐 ${applied.length} 项上下文材料` : '上下文材料无需补齐')
      }
    } catch (error: any) {
      message.error(error?.response?.data?.error || error?.message || '上下文自动补齐失败')
      setGeneratingProse(false)
      return
    }
    setGeneratingProse(false)
    await generateCurrentChapterProse({ allowIncomplete: true, forceSceneCards: true, targetChapterId })
  }

  /* ── 章节重组 ──────────────────────────────────────────────────── */

  const stepGenerateProse = async (options?: { limit?: number; source?: string; longformCompass?: any; longformBattleContext?: any; chapterLaunchGate?: any; nextBatchBrief?: any; batchPreflight?: any; millionWordRunway?: any; allowedChapterNos?: number[] }) => {
    if (!selectedModelId) return message.warning('请先选择模型')
    if (!await flushPendingSave()) return
    const allowedChapterNoSet = new Set((options?.allowedChapterNos || []).map(chapterNo => Number(chapterNo)).filter(Boolean))
    const allUnwrittenChapters = sortedChapters.filter(ch => !chapterHasProse(ch))
    const allUnwritten = allowedChapterNoSet.size > 0
      ? allUnwrittenChapters.filter(ch => allowedChapterNoSet.has(Number(ch.chapter_no || 0)))
      : allUnwrittenChapters
    const safetyLimit = Math.max(0, Number(options?.limit || 0))
    const unWritten = safetyLimit > 0 ? allUnwritten.slice(0, safetyLimit) : allUnwritten
    if (allUnwrittenChapters.length === 0) return message.warning('所有章节已有正文，无需生成')
    if (allUnwritten.length === 0) return message.warning('当前护栏放行的章节没有可生成正文')
    if (unWritten.length === 0) return message.warning('当前安全批次没有可生成章节')
    if (!await confirmReferenceReady('正文创作')) return
    setStepProseLoading(true)
    proseBatchCancelRef.current = false
    setProseBatchStatus({ success: 0, failed: 0, currentTitle: '', lastError: '', lastQuality: '' })
    let success = 0
    let failed = 0
    const errors: string[] = []
    const batchStartedAt = Date.now()
    const batchChapters: any[] = []
    try {
      for (let index = 0; index < unWritten.length; index += 1) {
        if (proseBatchCancelRef.current) break
        const ch = unWritten[index]
        const currentTitle = `第 ${ch.chapter_no} 章《${displayValue(ch.title)}》`
        setProseProgress({ current: index + 1, total: unWritten.length })
        setProseBatchStatus({ success, failed, currentTitle, lastError: '', lastQuality: '' })
        try {
          const resp = await fetch(`${apiClient.defaults.baseURL}/novel/chapters/${ch.id}/generate-prose`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: projectId,
              model_id: selectedModelId,
              ...chapterWordTargetPayload(),
              longform_compass: options?.longformCompass,
              longform_battle_context: options?.longformBattleContext,
              chapter_launch_gate: options?.chapterLaunchGate,
              next_batch_brief: options?.nextBatchBrief,
              batch_preflight: options?.batchPreflight,
              million_word_runway: options?.millionWordRunway,
              prompt: `请生成第 ${ch.chapter_no} 章《${displayValue(ch.title)}》完整正文`,
            }),
          })
          const raw = await resp.text()
          let data: any = null
          try { data = raw ? JSON.parse(raw) : null } catch { data = null }
          if (!resp.ok) {
            if (data?.error_code === 'PROSE_PREFLIGHT_BLOCKED' || data?.error_code === 'REFERENCE_SAFETY_BLOCKED') {
              showGenerationBlockedModal(data, undefined, { targetChapterId: ch.id })
            }
            throw new Error(data?.error || data?.detail || raw || `HTTP ${resp.status}`)
          }
          success += 1
          const score = data?.self_check?.review?.score
          const revised = data?.self_check?.revised
          batchChapters.push({
            id: ch.id,
            chapter_no: ch.chapter_no,
            title: displayValue(ch.title),
            status: 'success',
            score,
            revised: Boolean(revised),
            word_count: data?.chapter?.chapter_text ? String(data.chapter.chapter_text).replace(/\s/g, '').length : undefined,
          })
          if (Array.isArray(data?.pipeline)) setGenerationPipeline(data.pipeline)
          setProseBatchStatus({
            success,
            failed,
            currentTitle,
            lastError: '',
            lastQuality: score !== undefined ? `最近质检：${score} 分${revised ? '，已修订' : ''}` : '',
          })
        } catch (error: any) {
          failed += 1
          const messageText = `${currentTitle}：${error?.message || '生成失败'}`
          errors.push(messageText)
          batchChapters.push({
            id: ch.id,
            chapter_no: ch.chapter_no,
            title: displayValue(ch.title),
            status: 'failed',
            error: error?.message || '生成失败',
          })
          setProseBatchStatus({ success, failed, currentTitle, lastError: messageText, lastQuality: '' })
        }
        if (proseBatchCancelRef.current) break
      }
      const canceled = proseBatchCancelRef.current
      const skipped = Math.max(0, unWritten.length - success - failed)
      try {
        await apiClient.post('/novel/runs', {
          project_id: projectId,
          run_type: 'batch_generate_prose',
          step_name: 'summary',
          status: canceled ? 'canceled' : failed > 0 ? 'warn' : 'success',
          input_ref: {
            model_id: selectedModelId,
            chapter_ids: unWritten.map(ch => ch.id),
            total: unWritten.length,
            source: options?.source || 'manual_batch',
            longform_compass: options?.longformCompass,
            longform_battle_context: options?.longformBattleContext,
            chapter_launch_gate: options?.chapterLaunchGate,
            next_batch_brief: options?.nextBatchBrief,
            batch_preflight: options?.batchPreflight,
            million_word_runway: options?.millionWordRunway,
            allowed_chapter_nos: Array.from(allowedChapterNoSet),
            safety_limit: safetyLimit || null,
            available_total: allUnwritten.length,
          },
          output_ref: {
            total: unWritten.length,
            success,
            failed,
            skipped,
            canceled,
            chapters: batchChapters,
            errors,
          },
          duration_ms: Date.now() - batchStartedAt,
          error_message: errors.slice(0, 5).join('\n'),
        })
      } catch {
        // 汇总记录写入失败不影响已经生成的章节正文。
      }
      await loadProjectModules()
      if (success > 0) {
        setRightPanelOpen(true)
        setRightPanelTab('proseQuality')
      }
      if (canceled) {
        message.warning(`已停止批量生成：成功 ${success} 章，失败 ${failed} 章，未处理 ${skipped} 章`)
      } else if (failed > 0) {
        message.warning(`正文批量生成完成：成功 ${success} 章，失败 ${failed} 章`)
        Modal.warning({
          title: '部分章节生成失败',
          width: 680,
          content: (
            <div style={{ whiteSpace: 'pre-wrap', maxHeight: 320, overflow: 'auto' }}>
              {errors.slice(0, 20).join('\n')}
              {errors.length > 20 ? `\n... 另有 ${errors.length - 20} 条失败` : ''}
            </div>
          ),
        })
      } else {
        message.success(safetyLimit > 0
          ? `安全连写完成 (${success}/${unWritten.length})`
          : `正文生成完成 (${success}/${unWritten.length})`)
      }
    } catch (e: any) { message.error(e.message || '正文生成失败') }
    finally {
      setStepProseLoading(false)
      setProseProgress({ current: 0, total: 0 })
      proseBatchCancelRef.current = false
    }
  }

  return {
    stepGenerateProse,
    generateCurrentChapterProse,
    repairContextAndGenerateCurrentChapter,
  }
}
