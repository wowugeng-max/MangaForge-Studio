import React from 'react'
import { message, Modal } from 'antd'
import { chapterHasProse, displayValue } from '../utils'
import { renderGenerationResultDiffContentView } from './workspace-commercial-ops-views'
import { isAbortError, proseStreamControl } from '../prose-stream-control'
import { formatMcpGenerationFailure } from '../mcpGenerationSourceModel'
import {
  assertChapterInvocationAuthorityCurrent,
  assertChapterInvocationFenceCurrent,
  beginChapterInvocationFence,
  CHAPTER_INVOCATION_SOURCE_CHANGED_MESSAGE,
  isStaleChapterSourceOperationError,
  type ChapterInvocationFence,
  type ChapterSourceAuthorityState,
  type ChapterSourceOperationToken,
} from '../chapterGenerationSourceModel'

export function buildMcpGenerationFailureError(payload: any, fallback: string) {
  const error = new Error(
    formatMcpGenerationFailure(payload)
      || String(payload?.error || fallback || '正文生成失败'),
  )
  return Object.assign(error, {
    error_code: payload?.error_code,
    payload,
  })
}

/**
 * Shared streaming UI state (streamingChapterId/generatingProse/progress) may only be written by
 * the run that still owns the stream: either its controller is still the active one, or the stream
 * ended/was canceled with no successor. A run superseded by proseStreamControl.begin() must stay
 * silent so it cannot clobber the newer run's state from its catch/finally (incl. delayed cleanup).
 */
export function canFinalizeProseRun(activeController: AbortController | null | undefined, runController: AbortController) {
  return !activeController || activeController === runController
}

export type ChapterProseHandlerDeps = {
  proseBatchCancelRef: any
  setProseBatchStatus: any
  setProseProgress: any
  setStepProseLoading: any
  sortedChapters: any
  activeChapter: any
  apiClient: any
  assertChapterSourceOperationCurrent: (token: ChapterSourceOperationToken) => void
  autoCreationDirectorModel: any
  beginChapterSourceOperation: () => ChapterSourceOperationToken
  chapterWordTargetPayload: any
  chapters: any
  confirmReferenceReady: any
  flushPendingSave: any
  getChapterGenerationSourceAuthority: () => ChapterSourceAuthorityState
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
  const assertChapterSourceOperationCurrent = deps.assertChapterSourceOperationCurrent
  const autoCreationDirectorModel = deps.autoCreationDirectorModel
  const beginChapterSourceOperation = deps.beginChapterSourceOperation
  const chapterWordTargetPayload = deps.chapterWordTargetPayload
  const chapters = deps.chapters
  const confirmReferenceReady = deps.confirmReferenceReady
  const flushPendingSave = deps.flushPendingSave
  const getChapterGenerationSourceAuthority = deps.getChapterGenerationSourceAuthority
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
  const invocationFenceDependencies = {
    getAuthority: getChapterGenerationSourceAuthority,
    selectedModelId,
    beginSourceOperation: beginChapterSourceOperation,
    assertSourceOperationCurrent: assertChapterSourceOperationCurrent,
  }

  const beginInvocation = () => {
    try {
      const result = beginChapterInvocationFence(invocationFenceDependencies)
      if (!result.fence) message.warning(result.gate.message)
      return result.fence
    } catch (error) {
      if (!isStaleChapterSourceOperationError(error)) throw error
      message.warning(CHAPTER_INVOCATION_SOURCE_CHANGED_MESSAGE)
      return null
    }
  }

  const assertInvocationCurrent = (fence: ChapterInvocationFence, authorityOnly = false) => {
    if (authorityOnly) {
      assertChapterInvocationAuthorityCurrent(fence, invocationFenceDependencies)
    } else {
      assertChapterInvocationFenceCurrent(fence, invocationFenceDependencies)
    }
  }

  const invocationIsCurrent = (fence: ChapterInvocationFence, authorityOnly = false) => {
    try {
      assertInvocationCurrent(fence, authorityOnly)
      return true
    } catch (error) {
      if (!isStaleChapterSourceOperationError(error)) throw error
      message.warning(CHAPTER_INVOCATION_SOURCE_CHANGED_MESSAGE)
      return false
    }
  }


  const reloadTokenIsCurrent = (token: ChapterSourceOperationToken | null | undefined) => {
    if (!token) return false
    assertChapterSourceOperationCurrent(token)
    return true
  }

  const generateCurrentChapterProse = async (options: { allowIncomplete?: boolean; forceSceneCards?: boolean; targetChapterId?: number } = {}) => {
    const targetChapter = options.targetChapterId
      ? chapters.find(ch => String(ch.id) === String(options.targetChapterId))
      : activeChapter
    if (!targetChapter) return message.warning('请先选择章节')
    const invocation = beginInvocation()
    if (!invocation) return
    const gate = invocation.gate
    if (!await flushPendingSave()) return
    if (!invocationIsCurrent(invocation)) return
    if (!await confirmReferenceReady('正文创作')) return
    if (!invocationIsCurrent(invocation)) return
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
    const streamController = proseStreamControl.begin()
    const streamSignal = streamController.signal
    try {
      assertInvocationCurrent(invocation)
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
          signal: streamSignal,
          body: JSON.stringify({
            project_id: projectId,
            ...(gate.active === 'model' ? { model_id: gate.modelId } : {}),
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
      assertInvocationCurrent(invocation)
      if (!resp.ok || !resp.body) {
        const raw = await resp.text()
        assertInvocationCurrent(invocation)
        let payload: any = null
        try { payload = raw ? JSON.parse(raw) : null } catch { payload = null }
        if (payload?.error_code === 'PROSE_PREFLIGHT_BLOCKED' || payload?.error_code === 'REFERENCE_SAFETY_BLOCKED') {
          showGenerationBlockedModal(payload, () => { void generateCurrentChapterProse({ ...options, allowIncomplete: true }) }, {
            targetChapterId: targetChapter.id,
            onRepairComplete: () => { void generateCurrentChapterProse({ ...options, allowIncomplete: false, forceSceneCards: true, targetChapterId: targetChapter.id }) },
          })
        }
        throw buildMcpGenerationFailureError(payload, raw || `HTTP ${resp.status}`)
      }
      const reader = resp.body.getReader()
      const dec = new TextDecoder('utf-8')
      let buf = '', done: any
      while (true) {
        const { value, done: d } = await reader.read()
        assertInvocationCurrent(invocation)
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
            throw buildMcpGenerationFailureError(p, p.error || '正文生成失败')
          }
        }
      }
      const updated = done?.chapter
      if (updated) setChapters(prev => prev.map(c => c.id === updated.id ? updated : c))
      assertInvocationCurrent(invocation)
      const reloadToken = await loadProjectModules()
      if (!reloadTokenIsCurrent(reloadToken)) return
      assertInvocationCurrent(invocation, true)
      setStreamingProgress('生成完成')
      setStreamingPercent(100)
      setStreamingText(prev => prev || updated?.chapter_text || '')
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
      // A newer run may have taken over via proseStreamControl.begin(); it now owns the shared UI state.
      const runSuperseded = !canFinalizeProseRun(proseStreamControl.controller, streamController)
      if (isStaleChapterSourceOperationError(error)) {
        if (!runSuperseded) {
          setStreamingProgress('生成已中止')
          setStreamingPercent(0)
          message.warning(CHAPTER_INVOCATION_SOURCE_CHANGED_MESSAGE)
        }
      } else if (isAbortError(error) || streamSignal.aborted) {
        if (!runSuperseded) {
          setStreamingProgress('已取消生成')
          setStreamingPercent(0)
          message.info('已取消正文生成，可继续浏览或切换章节')
        }
      } else if (!runSuperseded) {
        setStreamingProgress('生成失败'); setStreamingPercent(0)
        message.error(error?.message || '正文生成失败')
      }
    } finally {
      const runSuperseded = !canFinalizeProseRun(proseStreamControl.controller, streamController)
      proseStreamControl.end(streamController)
      if (!runSuperseded) {
        setGeneratingProse(false)
        setTimeout(() => {
          // Re-check at fire time: a new run may have started during the 1.5s cleanup delay.
          if (!canFinalizeProseRun(proseStreamControl.controller, streamController)) return
          setStreamingChapterId(null); setStreamingPercent(0); setStreamingProgress(prev => prev === '已取消生成' || prev === '生成失败' ? prev : '')
        }, 1500)
      }
    }
  }

  const cancelCurrentChapterProse = () => {
    // Abort first (no-op if already aborted by proseStreamControl.cancel).
    proseStreamControl.controller?.abort()
    proseStreamControl.controller = null
    setStreamingProgress('已取消生成')
    setStreamingPercent(0)
    setGeneratingProse(false)
  }
  // UI unlock path used by the shared cancel control / stop button.
  proseStreamControl.onCancel = () => {
    setStreamingProgress('已取消生成')
    setStreamingPercent(0)
    setGeneratingProse(false)
  }

  const repairContextAndGenerateCurrentChapter = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    const invocation = beginInvocation()
    if (!invocation) return
    const gate = invocation.gate
    if (!await flushPendingSave()) return
    if (!invocationIsCurrent(invocation)) return
    const targetChapterId = activeChapter.id
    const repairController = proseStreamControl.begin()
    setGeneratingProse(true)
    setStreamingChapterId(targetChapterId)
    setStreamingText('')
    setStreamingProgress('自动补齐上下文材料')
    setStreamingPercent(8)
    try {
      assertInvocationCurrent(invocation)
      const res = await apiClient.post(`/novel/chapters/${targetChapterId}/auto-repair-context`, {
        project_id: projectId,
        ...(gate.active === 'model' ? { model_id: gate.modelId } : {}),
      }, { signal: repairController.signal })
      assertInvocationCurrent(invocation)
      const applied = Array.isArray(res.data?.applied) ? res.data.applied : []
      const warnings = Array.isArray(res.data?.warnings) ? res.data.warnings : []
      const reloadToken = await loadProjectModules()
      if (!reloadTokenIsCurrent(reloadToken)) {
        const runSuperseded = !canFinalizeProseRun(proseStreamControl.controller, repairController)
        proseStreamControl.end(repairController)
        if (!runSuperseded) {
          setGeneratingProse(false)
          setStreamingChapterId(null)
          setStreamingProgress('')
          setStreamingPercent(0)
        }
        return
      }
      assertInvocationCurrent(invocation, true)
      if (warnings.length) {
        message.warning(String(warnings[0] || '上下文补齐已降级处理，将继续生成正文'))
      } else {
        message.success(applied.length ? `已自动补齐 ${applied.length} 项上下文材料` : '上下文材料无需补齐')
      }
    } catch (error: any) {
      // A newer run may have taken over via proseStreamControl.begin(); it now owns the shared UI state.
      const runSuperseded = !canFinalizeProseRun(proseStreamControl.controller, repairController)
      if (isStaleChapterSourceOperationError(error)) {
        if (!runSuperseded) {
          message.warning(CHAPTER_INVOCATION_SOURCE_CHANGED_MESSAGE)
          setStreamingProgress('生成已中止')
          setStreamingPercent(0)
        }
      } else if (isAbortError(error) || repairController.signal.aborted) {
        if (!runSuperseded) {
          setStreamingProgress('已取消生成')
          setStreamingPercent(0)
          message.info('已取消材料补齐')
        }
      } else if (!runSuperseded) {
        message.error(error?.response?.data?.error || error?.message || '上下文自动补齐失败')
        setStreamingProgress('生成失败')
        setStreamingPercent(0)
      }
      proseStreamControl.end(repairController)
      if (!runSuperseded) setGeneratingProse(false)
      return
    }
    proseStreamControl.end(repairController)
    setGeneratingProse(false)
    await generateCurrentChapterProse({ allowIncomplete: false, forceSceneCards: true, targetChapterId })
  }

  /* ── 章节重组 ──────────────────────────────────────────────────── */

  const stepGenerateProse = async (options?: { limit?: number; source?: string; longformCompass?: any; longformBattleContext?: any; chapterLaunchGate?: any; nextBatchBrief?: any; batchPreflight?: any; millionWordRunway?: any; allowedChapterNos?: number[] }) => {
    const invocation = beginInvocation()
    if (!invocation) return
    const gate = invocation.gate
    if (!await flushPendingSave()) return
    if (!invocationIsCurrent(invocation)) return
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
    if (!invocationIsCurrent(invocation)) return
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
          assertInvocationCurrent(invocation)
          const resp = await fetch(`${apiClient.defaults.baseURL}/novel/chapters/${ch.id}/generate-prose`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              project_id: projectId,
              ...(gate.active === 'model' ? { model_id: gate.modelId } : {}),
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
          assertInvocationCurrent(invocation)
          const raw = await resp.text()
          assertInvocationCurrent(invocation)
          let data: any = null
          try { data = raw ? JSON.parse(raw) : null } catch { data = null }
          if (!resp.ok) {
            if (data?.error_code === 'PROSE_PREFLIGHT_BLOCKED' || data?.error_code === 'REFERENCE_SAFETY_BLOCKED') {
              showGenerationBlockedModal(data, undefined, { targetChapterId: ch.id })
            }
            throw buildMcpGenerationFailureError(data, raw || `HTTP ${resp.status}`)
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
          if (isStaleChapterSourceOperationError(error)) throw error
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
        assertInvocationCurrent(invocation)
        await apiClient.post('/novel/runs', {
          project_id: projectId,
          run_type: 'batch_generate_prose',
          step_name: 'summary',
          status: canceled ? 'canceled' : failed > 0 ? 'warn' : 'success',
          input_ref: {
            ...(gate.active === 'model' ? { model_id: gate.modelId } : {}),
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
        assertInvocationCurrent(invocation)
      } catch (error) {
        if (isStaleChapterSourceOperationError(error)) throw error
        // 汇总记录写入失败不影响已经生成的章节正文。
      }
      assertInvocationCurrent(invocation)
      const reloadToken = await loadProjectModules()
      if (!reloadTokenIsCurrent(reloadToken)) return
      assertInvocationCurrent(invocation, true)
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
    } catch (e: any) {
      if (isStaleChapterSourceOperationError(e)) message.warning(CHAPTER_INVOCATION_SOURCE_CHANGED_MESSAGE)
      else message.error(e.message || '正文生成失败')
    }
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
    cancelCurrentChapterProse,
  }
}
