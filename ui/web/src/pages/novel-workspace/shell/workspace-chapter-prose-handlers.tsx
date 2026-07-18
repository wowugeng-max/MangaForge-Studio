import { message } from 'antd'

export type ChapterProseHandlerDeps = {
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
}

export function createChapterProseHandlers(deps: ChapterProseHandlerDeps) {
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

  return {
    generateCurrentChapterProse,
    repairContextAndGenerateCurrentChapter,
  }
}
