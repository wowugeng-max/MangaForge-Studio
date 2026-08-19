import React from 'react'
import { message, Modal } from 'antd'
import { chapterHasProse, displayValue } from '../utils'
import { isAbortError, proseStreamControl } from '../prose-stream-control'
import { formatMcpGenerationFailure } from '../mcpGenerationSourceModel'
import {
  assertChapterInvocationAuthorityCurrent,
  assertChapterInvocationFenceCurrent,
  beginChapterInvocationFence,
  CHAPTER_GENERATION_SOURCE_FINGERPRINT_HEADER,
  CHAPTER_INVOCATION_PENDING_MESSAGE,
  CHAPTER_INVOCATION_SOURCE_CHANGED_MESSAGE,
  CHAPTER_SOURCE_MUTATION_PENDING_MESSAGE,
  isStaleChapterSourceOperationError,
  type ChapterInvocationFence,
  type ChapterInvocationOwner,
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
  chapterWordTargetPayload: any
  chapters: any
  confirmReferenceReady: any
  flushPendingSave: any
  getChapterGenerationSourceAuthority: () => ChapterSourceAuthorityState
  claimChapterInvocation: () => any
  chapterInvocationOwnerIsActive: (owner: ChapterInvocationOwner) => boolean
  releaseChapterInvocation: (owner: ChapterInvocationOwner) => boolean
  loadProjectModules: any
  projectId: any
  selectedModelId: any
  setGeneratingProse: any
  setGenerationPipeline: any
  setRightPanelOpen: any
  setRightPanelTab: any
  setStreamingChapterId: any
  setStreamingPercent: any
  setStreamingProgress: any
  setStreamingText: any
  showGenerationBlockedModal: any
  startKernelWriteChapter: (chapterId: number) => Promise<void>
  cancelKernelWriteChapter: () => void | Promise<void>
  startKernelRewriteChapter: (chapterId: number) => Promise<void>
  cancelKernelRewriteChapter: () => void | Promise<void>
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
  const chapterWordTargetPayload = deps.chapterWordTargetPayload
  const chapters = deps.chapters
  const confirmReferenceReady = deps.confirmReferenceReady
  const flushPendingSave = deps.flushPendingSave
  const getChapterGenerationSourceAuthority = deps.getChapterGenerationSourceAuthority
  const claimChapterInvocation = deps.claimChapterInvocation
  const chapterInvocationOwnerIsActive = deps.chapterInvocationOwnerIsActive
  const releaseChapterInvocation = deps.releaseChapterInvocation
  const loadProjectModules = deps.loadProjectModules
  const projectId = deps.projectId
  const selectedModelId = deps.selectedModelId
  const setGeneratingProse = deps.setGeneratingProse
  const setGenerationPipeline = deps.setGenerationPipeline
  const setRightPanelOpen = deps.setRightPanelOpen
  const setRightPanelTab = deps.setRightPanelTab
  const setStreamingChapterId = deps.setStreamingChapterId
  const setStreamingPercent = deps.setStreamingPercent
  const setStreamingProgress = deps.setStreamingProgress
  const setStreamingText = deps.setStreamingText
  const showGenerationBlockedModal = deps.showGenerationBlockedModal
  const startKernelWriteChapter = deps.startKernelWriteChapter
  const cancelKernelWriteChapter = deps.cancelKernelWriteChapter
  const startKernelRewriteChapter = deps.startKernelRewriteChapter
  const cancelKernelRewriteChapter = deps.cancelKernelRewriteChapter
  const invocationFenceDependencies = {
    getAuthority: getChapterGenerationSourceAuthority,
    selectedModelId,
    assertSourceOperationCurrent: assertChapterSourceOperationCurrent,
  }

  const beginInvocation = () => {
    let claim: any
    try {
      claim = claimChapterInvocation()
    } catch (error) {
      if (!isStaleChapterSourceOperationError(error)) throw error
      message.warning(CHAPTER_INVOCATION_SOURCE_CHANGED_MESSAGE)
      return null
    }
    if (claim.status === 'source_mutation_pending') {
      message.warning({ content: CHAPTER_SOURCE_MUTATION_PENDING_MESSAGE, duration: 3 })
      return null
    }
    if (claim.status === 'invocation_pending') {
      message.warning({ content: CHAPTER_INVOCATION_PENDING_MESSAGE, duration: 3 })
      return null
    }
    try {
      const result = beginChapterInvocationFence({
        ...invocationFenceDependencies,
        beginSourceOperation: () => claim.owner.token,
      })
      if (!result.fence) {
        releaseChapterInvocation(claim.owner)
        message.warning(result.gate.message)
        return null
      }
      return { ...result.fence, owner: claim.owner }
    } catch (error) {
      releaseChapterInvocation(claim.owner)
      if (!isStaleChapterSourceOperationError(error)) throw error
      message.warning(CHAPTER_INVOCATION_SOURCE_CHANGED_MESSAGE)
      return null
    }
  }

  const assertInvocationCurrent = (fence: ChapterInvocationFence & { owner: ChapterInvocationOwner }, authorityOnly = false) => {
    if (!chapterInvocationOwnerIsActive(fence.owner)) throw new StaleChapterSourceOperationError()
    if (authorityOnly) {
      assertChapterInvocationAuthorityCurrent(fence, invocationFenceDependencies)
    } else {
      assertChapterInvocationFenceCurrent(fence, invocationFenceDependencies)
    }
  }

  const invocationIsCurrent = (fence: ChapterInvocationFence & { owner: ChapterInvocationOwner }, authorityOnly = false) => {
    try {
      assertInvocationCurrent(fence, authorityOnly)
      return true
    } catch (error) {
      if (!isStaleChapterSourceOperationError(error)) throw error
      message.warning(CHAPTER_INVOCATION_SOURCE_CHANGED_MESSAGE)
      return false
    }
  }

  const preferStaleInvocationError = (
    fence: ChapterInvocationFence & { owner: ChapterInvocationOwner },
    error: unknown,
    authorityOnly = false,
  ) => {
    try {
      assertInvocationCurrent(fence, authorityOnly)
      return error
    } catch (invocationError) {
      if (!isStaleChapterSourceOperationError(invocationError)) throw invocationError
      return invocationError
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
    try {
      if (!await flushPendingSave()) return
      if (!invocationIsCurrent(invocation)) return
      if (!await confirmReferenceReady('正文创作')) return
      if (!invocationIsCurrent(invocation)) return
      setStreamingChapterId(targetChapter.id)
      setStreamingProgress('正在写本章…')
      setGeneratingProse(true)
      try {
        assertInvocationCurrent(invocation)
        if (chapterHasProse(targetChapter)) {
          await startKernelRewriteChapter(Number(targetChapter.id))
        } else {
          await startKernelWriteChapter(Number(targetChapter.id))
        }
        if (!invocationIsCurrent(invocation, true)) return
      } catch (caughtError: any) {
        const error: any = preferStaleInvocationError(invocation, caughtError)
        if (isStaleChapterSourceOperationError(error)) {
          setStreamingProgress('生成已中止')
          message.warning(CHAPTER_INVOCATION_SOURCE_CHANGED_MESSAGE)
        } else {
          setStreamingProgress('生成失败')
          message.error(error?.message || '正文生成失败')
        }
      } finally {
        setGeneratingProse(false)
        setStreamingChapterId(null)
        setStreamingPercent(0)
      }
    } finally {
      releaseChapterInvocation(invocation.owner)
    }
  }

  const cancelCurrentChapterProse = () => {
    proseStreamControl.controller?.abort()
    proseStreamControl.controller = null
    void cancelKernelWriteChapter()
    void cancelKernelRewriteChapter()
    setStreamingProgress('已取消生成')
    setStreamingPercent(0)
    setGeneratingProse(false)
    setStreamingChapterId(null)
  }
  // UI unlock path used by the shared cancel control / stop button.
  proseStreamControl.onCancel = () => {
    void cancelKernelWriteChapter()
    void cancelKernelRewriteChapter()
    setStreamingProgress('已取消生成')
    setStreamingPercent(0)
    setGeneratingProse(false)
    setStreamingChapterId(null)
  }

  const repairContextAndGenerateCurrentChapter = async () => {
    if (!activeChapter) return message.warning('请先选择章节')
    const invocation = beginInvocation()
    if (!invocation) return
    let continueWithProse = false
    try {
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
    let invocationReloaded = false
    try {
      assertInvocationCurrent(invocation)
      const res = await apiClient.post(`/novel/chapters/${targetChapterId}/auto-repair-context`, {
        project_id: projectId,
        ...(gate.active === 'model' ? { model_id: gate.modelId } : {}),
      }, {
        signal: repairController.signal,
        headers: { [CHAPTER_GENERATION_SOURCE_FINGERPRINT_HEADER]: invocation.sourceFingerprint },
      })
      assertInvocationCurrent(invocation)
      const applied = Array.isArray(res.data?.applied) ? res.data.applied : []
      const warnings = Array.isArray(res.data?.warnings) ? res.data.warnings : []
      const reloadToken = await loadProjectModules()
      if (!reloadTokenIsCurrent(reloadToken)) {
        const runSuperseded = !chapterInvocationOwnerIsActive(invocation.owner)
          || !canFinalizeProseRun(proseStreamControl.controller, repairController)
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
      invocationReloaded = true
      if (warnings.length) {
        message.warning(String(warnings[0] || '上下文补齐已降级处理，将继续生成正文'))
      } else {
        message.success(applied.length ? `已自动补齐 ${applied.length} 项上下文材料` : '上下文材料无需补齐')
      }
    } catch (caughtError: any) {
      const error: any = preferStaleInvocationError(invocation, caughtError, invocationReloaded)
      // A newer run may have taken over via proseStreamControl.begin(); it now owns the shared UI state.
      const runSuperseded = !chapterInvocationOwnerIsActive(invocation.owner)
        || !canFinalizeProseRun(proseStreamControl.controller, repairController)
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
    if (chapterInvocationOwnerIsActive(invocation.owner)) setGeneratingProse(false)
    continueWithProse = true
    } finally {
      releaseChapterInvocation(invocation.owner)
    }
    if (continueWithProse) {
      await generateCurrentChapterProse({ allowIncomplete: false, forceSceneCards: true, targetChapterId: activeChapter.id })
    }
  }

  /* ── 章节重组 ──────────────────────────────────────────────────── */

  const stepGenerateProse = async (options?: { limit?: number; source?: string; longformCompass?: any; longformBattleContext?: any; chapterLaunchGate?: any; nextBatchBrief?: any; batchPreflight?: any; millionWordRunway?: any; allowedChapterNos?: number[] }) => {
    const invocation = beginInvocation()
    if (!invocation) return
    try {
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
        assertInvocationCurrent(invocation)
        const ch = unWritten[index]
        const currentTitle = `第 ${ch.chapter_no} 章《${displayValue(ch.title)}》`
        setProseProgress({ current: index + 1, total: unWritten.length })
        setProseBatchStatus({ success, failed, currentTitle, lastError: '', lastQuality: '' })
        try {
          assertInvocationCurrent(invocation)
          const resp = await fetch(`${apiClient.defaults.baseURL}/novel/chapters/${ch.id}/generate-prose`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              [CHAPTER_GENERATION_SOURCE_FINGERPRINT_HEADER]: invocation.sourceFingerprint,
            },
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
        } catch (caughtError: any) {
          const error: any = preferStaleInvocationError(invocation, caughtError)
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
      } catch (caughtError) {
        const error = preferStaleInvocationError(invocation, caughtError)
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
      if (chapterInvocationOwnerIsActive(invocation.owner)) {
        if (isStaleChapterSourceOperationError(e)) message.warning(CHAPTER_INVOCATION_SOURCE_CHANGED_MESSAGE)
        else message.error(e.message || '正文生成失败')
      }
    }
    finally {
      if (chapterInvocationOwnerIsActive(invocation.owner)) {
        setStepProseLoading(false)
        setProseProgress({ current: 0, total: 0 })
        proseBatchCancelRef.current = false
      }
    }
    } finally {
      releaseChapterInvocation(invocation.owner)
    }
  }

  return {
    stepGenerateProse,
    generateCurrentChapterProse,
    repairContextAndGenerateCurrentChapter,
    cancelCurrentChapterProse,
  }
}
