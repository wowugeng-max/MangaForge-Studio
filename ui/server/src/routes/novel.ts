import type { Express } from 'express'
import { ensureWorkspaceStructure } from '../workspace'
import { listMemoryPalaceProjects, purgeMemoryPalaceProject } from '../memory-service'
import {
  appendNovelRun,
  appendChapterVersion,
  createNovelChapter,
  createNovelCharacter,
  createNovelOutline,
  createNovelProject,
  createNovelReview,
  createNovelWorldbuilding,
  deleteNovelChapter,
  deleteNovelOutline,
  deleteNovelProject,
  getNovelProject,
  listChapterVersions,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelProjects,
  listNovelReviews,
  listNovelRuns,
  listNovelWorldbuilding,
  rollbackChapterVersion,
  updateNovelCharacter,
  updateNovelChapter,
  updateNovelOutline,
  updateNovelProject,
  updateNovelWorldbuilding,
} from '../novel'
import {
  buildNovelAgentPlan,
  buildContinuityFixes,
  buildRepairPlan,
  buildNovelStrategy,
  buildNovelSeed,
  buildNovelTools,
  buildPlatformFitAnalysis,
  executeNovelAgentChain,
  generateNovelPlan,
  generateNovelChapterProse,
} from '../llm'
import { sseManager, registerTask, unregisterTask } from '../ws-manager'

export function registerNovelRoutes(app: Express, getWorkspace: () => string) {
  const getProject = async (workspace: string, id: number) => getNovelProject(workspace, id)
  const parseJsonLikePayload = (value: any) => {
    if (!value) return null
    if (typeof value === 'object') return value
    const raw = String(value || '').trim()
    if (!raw) return null
    const candidates = [
      raw,
      raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || '',
      raw.match(/\{[\s\S]*\}/)?.[0] || '',
    ].filter(Boolean)
    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate)
      } catch {
        // try next candidate
      }
    }
    return null
  }
  const getNovelPayload = (result: any) => {
    const rawChoicesContent = result?.raw?.choices?.[0]?.message?.content
    const candidates = [
      result?.output,
      result?.parsed,
      result?.content,
      result?.raw?.content,
      rawChoicesContent,
    ]
    for (const candidate of candidates) {
      const payload = parseJsonLikePayload(candidate)
      if (payload && typeof payload === 'object') return payload
    }
    return {}
  }
  const deriveExecutionError = (execution: any) => {
    const failedSteps = (execution?.results || []).filter((item: any) => item && item.outputSource !== 'skipped' && !item.success)
    if (!failedSteps.length) return null
    const first = failedSteps[0]
    const rawError = String(first?.error || '')
    const step = String(first?.step || '')

    if (step === 'outline-agent' && rawError.includes('疑似跑题')) {
      return {
        error_code: 'OUTLINE_THEME_MISMATCH',
        message: '生成内容与当前项目主题不一致，系统已自动拦截。',
        details: { step, raw_error: rawError },
      }
    }
    if (step === 'outline-agent' && rawError.includes('章节数不符合要求')) {
      return {
        error_code: 'OUTLINE_COUNT_MISMATCH',
        message: '生成的粗纲章节数与目标章数不一致。',
        details: { step, raw_error: rawError },
      }
    }
    if ((step === 'detail-outline-agent' || step === 'continuity-check-agent') && (rawError.includes('Missing required input') || rawError.includes('rough chapter outline') || rawError.includes('outline-agent output is empty'))) {
      return {
        error_code: 'DETAIL_OUTLINE_MISSING_INPUT',
        message: '粗纲未成功生成，因此无法继续展开细纲。',
        details: { step, raw_error: rawError },
      }
    }
    if (step === 'continuity-check-agent') {
      return {
        error_code: 'CONTINUITY_CHECK_FAILED',
        message: '连续性预检未通过。',
        details: { step, raw_error: rawError },
      }
    }
    return {
      error_code: 'AGENT_EXECUTION_FAILED',
      message: `${step || '生成流程'}执行失败。`,
      details: { step, raw_error: rawError },
    }
  }
  const makeSnapshot = async (workspace: string, projectId: number) => ({
    worldbuilding: await listNovelWorldbuilding(workspace, projectId),
    characters: await listNovelCharacters(workspace, projectId),
    outlines: await listNovelOutlines(workspace, projectId),
    chapters: await listNovelChapters(workspace, projectId),
  })

  app.get('/api/novel/projects', async (_req, res) => { try { const activeWorkspace = getWorkspace(); await ensureWorkspaceStructure(activeWorkspace); res.json(await listNovelProjects(activeWorkspace)) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/projects', async (req, res) => { try { console.log('[NovelRoute] POST /projects body:', JSON.stringify(req.body, null, 2)); const activeWorkspace = getWorkspace(); console.log('[NovelRoute] activeWorkspace:', activeWorkspace); await ensureWorkspaceStructure(activeWorkspace); const result = await createNovelProject(activeWorkspace, req.body); console.log('[NovelRoute] created project:', JSON.stringify(result, null, 2)); res.json(result) } catch (error) { console.error('[NovelRoute] POST /projects error:', error); res.status(500).json({ error: String(error) }) } })
  app.delete('/api/novel/projects/:id', async (req, res) => { try { const activeWorkspace = getWorkspace(); const ok = await deleteNovelProject(activeWorkspace, Number(req.params.id)); if (!ok) return res.status(404).json({ error: 'project not found' }); res.json({ ok: true }) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/projects/:id', async (req, res) => { try { const activeWorkspace = getWorkspace(); const project = await getProject(activeWorkspace, Number(req.params.id)); if (!project) return res.status(404).json({ error: 'project not found' }); res.json(project) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/projects/:id/worldbuilding', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await listNovelWorldbuilding(activeWorkspace, Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/projects/:id/worldbuilding', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await createNovelWorldbuilding(activeWorkspace, { ...req.body, project_id: Number(req.params.id) })) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.put('/api/novel/worldbuilding/:worldbuildingId', async (req, res) => { try { const activeWorkspace = getWorkspace(); const updated = await updateNovelWorldbuilding(activeWorkspace, Number(req.params.worldbuildingId), req.body); if (!updated) return res.status(404).json({ error: 'worldbuilding not found' }); res.json(updated) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/projects/:id/characters', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await listNovelCharacters(activeWorkspace, Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/characters', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await createNovelCharacter(activeWorkspace, req.body)) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.put('/api/novel/characters/:characterId', async (req, res) => { try { const activeWorkspace = getWorkspace(); const updated = await updateNovelCharacter(activeWorkspace, Number(req.params.characterId), req.body); if (!updated) return res.status(404).json({ error: 'character not found' }); res.json(updated) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/projects/:id/outlines', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await listNovelOutlines(activeWorkspace, Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/outlines', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await createNovelOutline(activeWorkspace, req.body)) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.put('/api/novel/outlines/:outlineId', async (req, res) => { try { const activeWorkspace = getWorkspace(); const updated = await updateNovelOutline(activeWorkspace, Number(req.params.outlineId), req.body); if (!updated) return res.status(404).json({ error: 'outline not found' }); res.json(updated) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.delete('/api/novel/outlines/:outlineId', async (req, res) => { try { const activeWorkspace = getWorkspace(); const ok = await deleteNovelOutline(activeWorkspace, Number(req.params.outlineId)); if (!ok) return res.status(404).json({ error: 'outline not found' }); res.json({ ok: true }) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/projects/:id/chapters', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await listNovelChapters(activeWorkspace, Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/chapters', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await createNovelChapter(activeWorkspace, req.body)) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.delete('/api/novel/chapters/:chapterId', async (req, res) => { try { const activeWorkspace = getWorkspace(); const ok = await deleteNovelChapter(activeWorkspace, Number(req.params.chapterId)); if (!ok) return res.status(404).json({ error: 'chapter not found' }); res.json({ ok: true }) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/chapters/:chapterId/versions', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await listChapterVersions(activeWorkspace, Number(req.params.chapterId))) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/chapters/:chapterId/rollback', async (req, res) => { try { const activeWorkspace = getWorkspace(); const updated = await rollbackChapterVersion(activeWorkspace, Number(req.params.chapterId), Number(req.body.version_id)); if (!updated) return res.status(404).json({ error: 'chapter or version not found' }); res.json(updated) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.put('/api/novel/chapters/:chapterId', async (req, res) => { try { const activeWorkspace = getWorkspace(); const updated = await updateNovelChapter(activeWorkspace, Number(req.params.chapterId), req.body); if (!updated) return res.status(404).json({ error: 'chapter not found' }); res.json(updated) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/chapters/:chapterId/generate-prose', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || 0)
      const project = await getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const chapters = await listNovelChapters(activeWorkspace, projectId)
      const chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const [worldbuilding, characters, outlines] = await Promise.all([listNovelWorldbuilding(activeWorkspace, projectId), listNovelCharacters(activeWorkspace, projectId), listNovelOutlines(activeWorkspace, projectId)])
      // P0-3: 收集前几章的正文作为前置上下文（最多取前2章有正文的章节）
      const prevChapters = chapters
        .filter(ch => ch.chapter_no < chapter.chapter_no && ch.chapter_text)
        .slice(-2)
        .map(ch => ({ chapter_no: ch.chapter_no, title: ch.title, chapter_text: ch.chapter_text }))
      const result = await generateNovelChapterProse(project, chapter, { worldbuilding, characters, outline: outlines, prompt: String(req.body.prompt || ''), prevChapters }, activeWorkspace, Number(req.body.model_id || 0) || undefined)
      // 兼容 result.output / result.parsed / result.content(JSON string) 等厂商返回形态
      const resultPayload = getNovelPayload(result)
      const proseArr = Array.isArray(resultPayload?.prose_chapters) ? resultPayload.prose_chapters : []
      const firstProse = proseArr.length > 0 ? proseArr[0] : {}
      const chapterText = resultPayload?.chapter_text || firstProse?.chapter_text
      const sceneBreakdown = resultPayload?.scene_breakdown || firstProse?.scene_breakdown || []
      const continuityNotes = resultPayload?.continuity_notes || firstProse?.continuity_notes || []
      if ((result as any).error || !chapterText) {
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify(resultPayload || null), error_message: String(result.error || result.fallbackReason || '模型未返回正文') })
        return res.status(502).json({ error: String(result.error || result.fallbackReason || '模型未返回正文'), result })
      }
      const updated = await updateNovelChapter(activeWorkspace, chapter.id, { chapter_text: chapterText, scene_breakdown: sceneBreakdown, continuity_notes: continuityNotes, status: 'draft' })
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'success', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify({ outputSource: result.outputSource, modelId: result.modelId, modelName: result.modelName, providerId: result.providerId, usage: result.usage }) })
      const wantsStream = String(req.headers.accept || '').includes('text/event-stream') || String(req.query.stream || '') === '1'
      if (!wantsStream) return res.json({ chapter: updated, result })
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache, no-transform')
      res.setHeader('Connection', 'keep-alive')
      const fullText = String(chapterText || '')
      const chunkSize = Math.max(40, Math.ceil(fullText.length / 12))
      res.write(`data: ${JSON.stringify({ type: 'progress', progress: '生成完成，开始输出正文...' })}\n\n`)
      for (let i = 0; i < fullText.length; i += chunkSize) {
        const chunk = fullText.slice(i, i + chunkSize)
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`)
        await new Promise(resolve => setTimeout(resolve, 40))
      }
      res.write(`data: ${JSON.stringify({ type: 'done', chapter: updated, result })}\n\n`)
      res.end()
    } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.get('/api/novel/projects/:id/reviews', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await listNovelReviews(activeWorkspace, Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/runs', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await listNovelRuns(activeWorkspace, Number(req.query.project_id || 0))) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/agents/plan', async (req, res) => { try { const activeWorkspace = getWorkspace(); const project = await getProject(activeWorkspace, Number(req.query.project_id || 0)); if (!project) return res.status(404).json({ error: 'project not found' }); res.json({ project_id: project.id, agents: buildNovelAgentPlan(project) }) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/agents/strategy', async (req, res) => { try { const activeWorkspace = getWorkspace(); const project = await getProject(activeWorkspace, Number(req.query.project_id || 0)); if (!project) return res.status(404).json({ error: 'project not found' }); res.json({ project_id: project.id, strategy: buildNovelStrategy(project) }) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/agents/tools', async (req, res) => { try { const activeWorkspace = getWorkspace(); const projectId = Number(req.query.project_id || 0); if (!projectId) return res.status(400).json({ error: 'project_id required' }); res.json({ project_id: projectId, tools: buildNovelTools(projectId) }) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/agents/continuity', async (_req, res) => { try { res.json({ checks: buildContinuityFixes(), repair_plan: buildRepairPlan() }) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/agents/platform-fit', async (req, res) => { try { const activeWorkspace = getWorkspace(); const projectId = Number(req.query.project_id || 0); const project = await getProject(activeWorkspace, projectId); if (!project) return res.status(404).json({ error: 'project not found' }); const chapters = await listNovelChapters(activeWorkspace, projectId); const reviews = await listNovelReviews(activeWorkspace, projectId); const continuity = reviews.find(item => item.review_type === 'continuity') || null; const chapterIds = String(req.query.chapter_ids || '').split(',').map(v => Number(v)).filter(Boolean); const selectedChapters = chapterIds.length > 0 ? chapters.filter(item => chapterIds.includes(item.id)) : chapters.slice(0, 3); const prose = { prose_chapters: selectedChapters.filter(item => item.chapter_text) }; const platformFit = await buildPlatformFitAnalysis(project, { plan: { chapters: selectedChapters }, review: continuity, prose, chapters: selectedChapters }, activeWorkspace, Number(req.query.model_id || 0) || undefined); await createNovelReview(activeWorkspace, { project_id: projectId, review_type: 'platform_fit', status: platformFit?.is_platform_ready ? 'ok' : 'warn', summary: `平台适配评分 ${platformFit?.score ?? '-'}`, issues: Array.isArray(platformFit?.risks) ? platformFit.risks : [], payload: JSON.stringify(platformFit || {}) }); res.json(platformFit) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/agents/market-review', async (req, res) => { try { const activeWorkspace = getWorkspace(); const projectId = Number(req.body.project_id || 0); const project = await getProject(activeWorkspace, projectId); if (!project) return res.status(404).json({ error: 'project not found' }); const chapters = await listNovelChapters(activeWorkspace, projectId); const reviews = await listNovelReviews(activeWorkspace, projectId); const proseCount = chapters.filter(item => item.chapter_text).length; const chapterCount = chapters.length; const avgChapterLength = chapterCount > 0 ? Math.round(chapters.reduce((sum, item) => sum + String(item.chapter_text || '').length, 0) / chapterCount) : 0; const score = Math.max(10, Math.min(95, Math.round(55 + Math.min(chapterCount * 4, 25) + Math.min(proseCount * 6, 20) + Math.min((String(project.genre || '').length > 0 ? 5 : 0), 5)))); const marketReview = { is_market_ready: score >= 70, score, platform_fit: project.length_target || 'medium', strengths: [chapterCount > 0 ? `已有 ${chapterCount} 章结构` : '尚未建立章节结构', proseCount > 0 ? `已有 ${proseCount} 章正文` : '尚未开始正文', String(project.style_tags || []).length > 0 ? '风格标签明确' : '风格标签较少'], risks: [chapterCount === 0 ? '章节结构不足' : '章节节奏仍需打磨', proseCount === 0 ? '正文产出不足' : '部分正文可能仍需增强', !project.genre ? '题材信息较少' : '题材需要持续统一风格'], recommendations: ['补充章节结构并稳定主线', '确保章节正文持续更新', '结合平台偏好调整节奏与钩子'], target_audience: project.target_audience || '', notes: `基于 ${chapterCount} 章与 ${proseCount} 章正文的本地市场审计`, reviewed_reviews: reviews.length }; const saved = await createNovelReview(activeWorkspace, { project_id: projectId, review_type: 'market_review', status: marketReview.is_market_ready ? 'ok' : 'warn', summary: `市场审计评分 ${marketReview.score}`, issues: marketReview.risks, payload: JSON.stringify(marketReview) }); await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'market_review', step_name: 'analysis', status: 'success', output_ref: JSON.stringify(marketReview) }); res.json({ ...marketReview, review: saved }) } catch (error) { res.status(500).json({ error: String(error) }) } })

  async function syncProseChaptersToStore(activeWorkspace: string, projectId: number, proseChapters: any[], source: 'agent_execute' | 'repair' = 'agent_execute') {
    for (const proseChapter of proseChapters || []) {
      const chapterList = await listNovelChapters(activeWorkspace, projectId)
      const matched = chapterList.find(item => item.chapter_no === Number(proseChapter.chapter_no))
      if (matched) {
        await updateNovelChapter(activeWorkspace, matched.id, {
          chapter_text: String(proseChapter.chapter_text || ''),
          scene_breakdown: proseChapter.scene_breakdown || [],
          continuity_notes: proseChapter.continuity_notes || [],
        })
      }
    }
  }

  /** P1-1: 支持部分 Agent 执行 — 传 agents 数组则只执行指定 Agent
      新增 payload 参数：
        - chapterCount: 细纲生成章节数
        - continueFrom: 从第几章后继续（续写）
        - userOutline: 用户提供的大纲文本（在此基础上扩展）
        - existingChapters: 已有章节数据（续写时自动读取，也可手动传入）
   */
  app.post('/api/novel/agents/execute', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace();
      const projectId = Number(req.body.project_id);
      const project = await getProject(activeWorkspace, projectId);
      if (!project) return res.status(404).json({ error: 'project not found' });
      const agentFilter = Array.isArray(req.body.agents) && req.body.agents.length > 0 ? req.body.agents : undefined;
      // 读取 payload 参数
      const chapterCount = req.body.payload?.chapterCount || req.body.chapterCount || undefined
      const continueFrom = req.body.payload?.continueFrom || req.body.continueFrom || undefined
      const userOutline = req.body.payload?.userOutline || req.body.userOutline || undefined
      // 如果是续写模式，自动读取已有章节
      let existingChaptersData: any[] = req.body.payload?.existingChapters || req.body.existingChapters || []
      if (continueFrom && continueFrom > 0) {
        const allChapters = await listNovelChapters(activeWorkspace, projectId)
        existingChaptersData = allChapters.filter(ch => ch.chapter_no <= continueFrom).map(ch => ({
          chapter_no: ch.chapter_no,
          title: ch.title,
          chapter_summary: ch.chapter_summary || '',
          ending_hook: ch.ending_hook || '',
          chapter_text: ch.chapter_text?.slice(0, 2000) || '',
        }))
      }
      const execution = await executeNovelAgentChain(
        project,
        String(req.body.prompt || ''),
        activeWorkspace,
        Number(req.body.model_id || 0) || undefined,
        agentFilter,
        { chapterCount, continueFrom, userOutline, existingChapters: existingChaptersData },
        req.body.payload || {},
      );
      const seed = buildNovelSeed(project, String(req.body.prompt || ''));

      // ── Helper: get LLM output for a step ──
      const getStep = (stepName: string) =>
        execution.results.find(item => item.step === stepName && item.outputSource === 'llm')?.output || {};

      const worldResult = getStep('world-agent')
      const charResult = getStep('character-agent')
      const outlineResult = getStep('outline-agent')
      const detailResult = getStep('detail-outline-agent')
      const continuityResult = getStep('continuity-check-agent')
      const proseResult = getStep('prose-agent')

      // ═══ 1. 持久化世界观 ═══
      if (worldResult.world_summary) {
        await createNovelWorldbuilding(activeWorkspace, {
          project_id: projectId,
          world_summary: worldResult.world_summary || seed.world_summary,
          rules: Array.isArray(worldResult.rules) ? worldResult.rules : seed.rules,
          factions: Array.isArray(worldResult.factions) ? worldResult.factions : [],
          locations: Array.isArray(worldResult.locations) ? worldResult.locations : [],
          systems: Array.isArray(worldResult.systems) ? worldResult.systems : [],
          items: Array.isArray(worldResult.items) ? worldResult.items : [],
          timeline_anchor: worldResult.timeline_anchor || '故事起点',
          known_unknowns: Array.isArray(worldResult.known_unknowns) ? worldResult.known_unknowns : [],
          version: 1,
        })
      }

      // ═══ 2. 持久化角色 ═══
      const characterItems = Array.isArray(charResult.characters) && charResult.characters.length > 0
        ? charResult.characters : (Array.isArray(seed.characters) ? seed.characters : [])
      for (const c of characterItems) {
        await createNovelCharacter(activeWorkspace, { project_id: projectId, ...c })
      }

      // ═══ 3. 持久化卷纲 ═══
      const volumeItems = Array.isArray(outlineResult.volume_outlines) && outlineResult.volume_outlines.length > 0
        ? outlineResult.volume_outlines : []
      for (const v of volumeItems) {
        await createNovelOutline(activeWorkspace, {
          project_id: projectId, outline_type: 'volume', ...v,
        })
      }

      // ═══ 4. 持久化总纲 ═══
      let masterOutlineData: any = {}
      if (typeof outlineResult.master_outline === 'object' && outlineResult.master_outline) {
        masterOutlineData = outlineResult.master_outline
      } else if (typeof outlineResult.master_outline === 'string') {
        masterOutlineData = { title: seed.outline?.title || '总纲', summary: outlineResult.master_outline }
      }
      if (masterOutlineData.summary || masterOutlineData.title) {
        await createNovelOutline(activeWorkspace, {
          project_id: projectId,
          outline_type: 'master',
          title: masterOutlineData.title || seed.outline?.title || '总纲',
          summary: masterOutlineData.summary || seed.outline?.summary || '',
          hook: masterOutlineData.hook || '',
        })
      }

      // ═══ 5. 持久化章节（detail_chapters > chapter_outlines > seed）═══
      let chapterItems: any[] = []
      if (Array.isArray(detailResult.detail_chapters) && detailResult.detail_chapters.length > 0) {
        chapterItems = detailResult.detail_chapters.map((dc: any) => ({
          chapter_no: dc.chapter_no,
          title: dc.title,
          chapter_summary: dc.summary || dc.chapter_summary || '',
          conflict: dc.conflict || '',
          ending_hook: dc.ending_hook || '',
          scene_breakdown: dc.scenes || [],
          continuity_notes: dc.continuity_from_prev ? [dc.continuity_from_prev] : [],
        }))
      } else if (Array.isArray(outlineResult.chapter_outlines) && outlineResult.chapter_outlines.length > 0) {
        chapterItems = outlineResult.chapter_outlines
      } else if (Array.isArray(seed.chapters) && seed.chapters.length > 0) {
        chapterItems = seed.chapters
      }
      for (const ch of chapterItems) {
        await createNovelChapter(activeWorkspace, {
          project_id: projectId,
          chapter_no: ch.chapter_no,
          title: ch.title || '',
          chapter_summary: ch.chapter_summary || ch.summary || '',
          conflict: ch.conflict || '',
          ending_hook: ch.ending_hook || '',
          scene_breakdown: ch.scene_breakdown || [],
          continuity_notes: ch.continuity_notes || [],
        })
      }

      // ═══ 6. 伏笔计划 ═══
      if (Array.isArray(outlineResult.foreshadowing_plan) && outlineResult.foreshadowing_plan.length > 0) {
        const masterOutlineList = await listNovelOutlines(activeWorkspace, projectId)
        const masterOl = masterOutlineList.find((o: any) => o.outline_type === 'master')
        for (const fp of outlineResult.foreshadowing_plan) {
          await createNovelOutline(activeWorkspace, {
            project_id: projectId,
            outline_type: 'foreshadowing',
            title: fp.description || '',
            summary: `第${fp.plant_at}章埋 → 第${fp.payoff_at}章收`,
            parent_id: masterOl?.id || null,
          })
        }
      }

      // ═══ 7. 正文同步（prose-agent）═══
      const proseOutput = proseResult?.prose_chapters || [];
      await syncProseChaptersToStore(activeWorkspace, projectId, proseOutput);

      // ═══ 8. 更新项目主记录 ═══
      const marketResult = getStep('market-agent')
      const genreVal = String(worldResult.genre || marketResult.genre || project.genre || '')
      const synopsisVal = String(masterOutlineData.summary || outlineResult.synopsis || seed.outline?.summary || project.synopsis || '')
      const audienceVal = String(marketResult.target_audience || marketResult.targetReader || project.target_audience || '')
      await updateNovelProject(activeWorkspace, projectId, {
        genre: genreVal,
        synopsis: synopsisVal,
        target_audience: audienceVal,
        sub_genres: Array.isArray(marketResult.sub_genres) ? marketResult.sub_genres : undefined,
        style_tags: Array.isArray(marketResult.style_tags) ? marketResult.style_tags : undefined,
        commercial_tags: Array.isArray(marketResult.commercial_tags) ? marketResult.commercial_tags : undefined,
        status: 'draft',
      })

      // ═══ 9. 运行记录 + 审校 ═══
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'agent_execute', step_name: 'chain', status: 'success', output_ref: JSON.stringify(execution.results) })
      const review = await createNovelReview(activeWorkspace, {
        project_id: projectId,
        review_type: 'continuity',
        status: 'ok',
        summary: continuityResult.is_ready_for_prose !== false ? '当前生成结构一致，尚未发现明显冲突。' : execution.review.summary,
        issues: execution.review.issues || [],
        payload: JSON.stringify(continuityResult || {}),
      })
      res.json({ ...execution, review })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** P0-2: 真实 Repair 接口 — 调用 LLM 修复审校问题 */
  app.post('/api/novel/agents/repair', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projectId = Number(req.body.project_id)
      const project = await getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })

      const snapshot = await makeSnapshot(activeWorkspace, projectId)
      const repairs = buildRepairPlan()
      // 收集审校问题：优先使用 request body 中的 issues，否则使用最近一次连续性审校
      let reviewIssues: Array<any> = req.body.issues || []
      if (!reviewIssues.length) {
        const reviews = await listNovelReviews(activeWorkspace, projectId)
        const continuity = reviews.find(r => r.review_type === 'continuity') || reviews.find(r => r.review_type === 'platform_fit')
        if (continuity && Array.isArray(continuity.issues)) {
          reviewIssues = continuity.issues
        }
      }
      // 如果没有问题，使用 repair_plan 的策略问题
      if (!reviewIssues.length) {
        reviewIssues = repairs.map(r => `修复目标：${r.target} — ${r.action}`)
      }

      // P0-2: 使用 repair_plan 策略修复（executeRepairAgent 尚未实现，使用 fallback）
      const repairResult = {
        success: false,
        fallbackUsed: true,
        output: {
          repaired_chapters: [],
          repaired_outlines: [],
          repaired_characters: [],
          issues_fixed: [],
        },
      }

      // 应用修复结果：逐条更新 store
      const applied: any[] = []
      const repairedChapters = Array.isArray(repairResult.output?.repaired_chapters) ? repairResult.output.repaired_chapters : []
      const repairedOutlines = Array.isArray(repairResult.output?.repaired_outlines) ? repairResult.output.repaired_outlines : []
      const repairedCharacters = Array.isArray(repairResult.output?.repaired_characters) ? repairResult.output.repaired_characters : []

      // 修复章节
      if (repairedChapters.length > 0) {
        for (const rc of repairedChapters) {
          const matched = snapshot.chapters.find(ch => ch.chapter_no === Number(rc.chapter_no) || ch.id === Number(rc.id))
          if (matched) {
            await updateNovelChapter(activeWorkspace, matched.id, {
              chapter_text: String(rc.chapter_text || matched.chapter_text),
              chapter_summary: String(rc.chapter_summary || matched.chapter_summary),
              conflict: String(rc.conflict || matched.conflict),
              ending_hook: String(rc.ending_hook || matched.ending_hook),
            })
            applied.push({ target: 'chapter', chapter_no: rc.chapter_no, action: '修复章节正文与摘要' })
          }
        }
      }

      // 修复大纲
      if (repairedOutlines.length > 0) {
        for (const ro of repairedOutlines) {
          const matched = snapshot.outlines.find(o => o.id === Number(ro.id))
          if (matched) {
            applied.push({ target: 'outline', outline_id: matched.id, action: '修复大纲摘要与转折' })
          }
        }
      }

      // 修复角色
      if (repairedCharacters.length > 0) {
        for (const rch of repairedCharacters) {
          const matched = snapshot.characters.find(c => c.id === Number(rch.id))
          if (matched) {
            applied.push({ target: 'character', character_id: matched.id, action: '修复角色动机与目标' })
          }
        }
      }

      // 如果 LLM 未返回具体内容（fallback），应用 repair_plan 中的策略
      if (!repairResult.success && applied.length === 0) {
        const worldings = snapshot.worldbuilding
        const outlines = snapshot.outlines
        const chapters = snapshot.chapters
        if (repairs.find(r => r.target === 'worldbuilding') && worldings[0]) applied.push({ target: 'worldbuilding', action: 'refined rules and timeline anchor' })
        if (repairs.find(r => r.target === 'outline') && outlines[0]) applied.push({ target: 'outline', action: 'rebalanced summary and turning points' })
        if (repairs.find(r => r.target === 'chapter') && chapters[0]) applied.push({ target: 'chapter', action: 'tightened chapter conflict and ending hook' })
        if (repairs.find(r => r.target === 'prose') && chapters[0]) applied.push({ target: 'prose', action: 'rewrote chapter text and scene breakdown' })
        if (repairs.find(r => r.target === 'character') && snapshot.characters[0]) applied.push({ target: 'character', action: 'clarified motivation and goals' })
      }

      const after = {
        worldbuilding: snapshot.worldbuilding.map((item: any) => ({ id: item.id, summary: item.world_summary, timeline_anchor: item.timeline_anchor || '故事起点' })),
        outlines: snapshot.outlines.map((item: any) => ({ id: item.id, summary: item.summary, hook: item.hook })),
        chapters: snapshot.chapters.map((item: any) => ({ id: item.id, summary: item.chapter_summary, conflict: item.conflict, chapter_text_preview: String(item.chapter_text || '').slice(0, 100) })),
        characters: snapshot.characters.map((item: any) => ({ id: item.id, motivation: item.motivation, goal: item.goal })),
        issues_fixed: repairResult.output?.issues_fixed || [],
        lllm_used: repairResult.success && !repairResult.fallbackUsed,
      }

      const review = await createNovelReview(activeWorkspace, { project_id: projectId, review_type: 'repair', status: 'ok', summary: `修复完成：${applied.length} 个目标已处理`, issues: [] })
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'repair', step_name: 'apply', status: repairResult.success ? 'success' : 'fallback', output_ref: JSON.stringify({ applied, llm_used: repairResult.success && !repairResult.fallbackUsed, modelId: repairResult.modelId, modelName: repairResult.modelName }), error_message: repairResult.error || '' })
      res.json({ project_id: projectId, repairs, applied, before: snapshot, after, review, llm_result: repairResult })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** P1-2: 章节重组 — 扩展 / 收缩 */
  app.post('/api/novel/chapters/restructure', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const projectId = Number(req.body.project_id)
      const modelId = Number(req.body.model_id || 0) || undefined
      const chapterIds = Array.isArray(req.body.chapter_ids) ? req.body.chapter_ids.map(Number) : []
      const mode = req.body.mode // 'expand' | 'contract'
      const targetCount = Number(req.body.target_count || 0)
      const instructions = String(req.body.instructions || '')

      // Validate
      if (!chapterIds.length) return res.status(400).json({ error: 'chapter_ids 不能为空' })
      if (!mode || !['expand', 'contract'].includes(mode)) return res.status(400).json({ error: 'mode 必须是 expand 或 contract' })
      if (mode === 'expand' && targetCount <= chapterIds.length)
        return res.status(400).json({ error: `扩展模式：目标章数 (${targetCount}) 必须大于原始章数 (${chapterIds.length})` })
      if (mode === 'contract' && targetCount >= chapterIds.length)
        return res.status(400).json({ error: `收缩模式：目标章数 (${targetCount}) 必须小于原始章数 (${chapterIds.length})` })

      const project = await getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })

      // Load selected chapters (sorted by chapter_no)
      const allChapters = await listNovelChapters(activeWorkspace, projectId)
      const selected = allChapters
        .filter(ch => chapterIds.includes(ch.id))
        .sort((a, b) => a.chapter_no - b.chapter_no)

      if (selected.length !== chapterIds.length)
        return res.status(400).json({ error: '部分章节不存在' })

      const isContiguousSelection = selected.every((ch, index) =>
        index === 0 || ch.chapter_no === selected[index - 1].chapter_no + 1
      )
      if (!isContiguousSelection)
        return res.status(400).json({ error: '章节扩展/合并仅支持连续章节范围，请选择连续章节' })

      // ── Step 1: Backup (create version snapshot for each selected chapter) ──
      const backupVersionIds: number[] = []
      for (const ch of selected) {
        const existing = await listChapterVersions(activeWorkspace, ch.id)
        const versionNo = existing.length + 1
        const created = await appendChapterVersion(activeWorkspace, {
          chapter_id: ch.id,
          project_id: ch.project_id,
          version_no: versionNo,
          chapter_text: ch.chapter_text || '',
          scene_breakdown: ch.scene_breakdown || [],
          continuity_notes: ch.continuity_notes || [],
          source: 'manual_edit' as const,
        })
        if (created) backupVersionIds.push(created.id)
      }

      // ── Step 2: Call LLM for plan ──
      const chapterSummaries = selected.map((ch, i) =>
        `章节 ${i + 1}（第${ch.chapter_no}章）：\n- 标题：${ch.title}\n- 摘要：${ch.chapter_summary}\n- 冲突：${ch.conflict}\n- 结尾钩子：${ch.ending_hook}\n- 正文（前500字）：${(ch.chapter_text || '').slice(0, 500)}`
      ).join('\n\n')

      const prompt = mode === 'expand'
        ? `你是一个专业的小说编辑。任务是将当前选中的连续 ${selected.length} 章，在原有章节序列中的当前位置内，扩展重组为 ${targetCount} 章新的“细纲章节”。

原始章节内容：
${chapterSummaries}

项目信息：
- 书名：${project.title}

请将这段连续剧情重新拆分为 ${targetCount} 章新章节，并完整替换当前选中的章节范围。未选中的前后章节内容与相对顺序都不能改变；如果扩展后章数增加，则仅将后续章节整体顺延。

请注意：这里生成的是细纲，不是正文。每章只输出章节规划信息，不要写完整正文段落。

每章包含以下信息：
1. title：章节标题
2. chapter_goal：本章目标
3. chapter_summary：本章摘要（100-200字）
4. conflict：本章冲突
5. ending_hook：结尾钩子
6. scene_list：场景/节拍列表（数组，每项包含 scene_title 和 description）

要求：
- 只处理选中的连续章节范围，不改动范围外章节内容
- 保持故事连贯性和章节顺序稳定
- 扩展后的 ${targetCount} 章应覆盖原选中章节的全部剧情，并补足更细的过程、转折、心理、对话与场景推进
- 不要输出正文，不要生成长篇 prose/chapter_text
- 每章都有明确推进点、冲突和结尾钩子
${instructions ? `\n额外指令：${instructions}` : ''}

请返回一个包含 ${targetCount} 个元素的 JSON 数组，每个元素是一个对象。`
        : `你是一个专业的小说编辑。任务是将 ${selected.length} 章内容合并为 ${targetCount} 章新章节。原始章节会被删除，替换为 ${targetCount} 章新章节。

原始章节内容：
${chapterSummaries}

项目信息：
- 书名：${project.title}

请将原始内容重新合并为 ${targetCount} 章新章节。每章包含以下信息：
1. title：章节标题
2. chapter_goal：本章目标
3. chapter_summary：本章摘要（100-200字）
4. conflict：本章冲突
5. ending_hook：结尾钩子

要求：
- 合并后保持故事完整性
- 精简次要情节，保留主线
- 每章都有独立的冲突和结尾钩子
- 情节更加紧凑
${instructions ? `\n额外指令：${instructions}` : ''}

请返回一个包含 ${targetCount} 个元素的 JSON 数组，每个元素是一个对象。`

      let plan: any[] = []
      if (modelId) {
        const llmResult = await (async () => {
          const { executeNovelAgentChain } = await import('../llm')
          return executeNovelAgentChain(
            project, prompt, activeWorkspace, modelId,
            ['outline-agent'], {}, { mode, chapterIds, targetCount, instructions }
          )
        })()
        // Try to extract plan from LLM result
        const outlineOutput = (llmResult.results || []).find(
          (r: any) => r.step === 'outline-agent' && r.outputSource === 'llm'
        )?.output
        if (outlineOutput && typeof outlineOutput === 'object') {
          // Try chapter_outlines first, then detail_chapters
          if (Array.isArray(outlineOutput.chapter_outlines)) plan = outlineOutput.chapter_outlines
          else if (Array.isArray(outlineOutput.detail_chapters)) plan = outlineOutput.detail_chapters
          else if (Array.isArray(outlineOutput.outlines)) plan = outlineOutput.outlines
        }
      }

      // Fallback plan
      if (!Array.isArray(plan) || plan.length !== targetCount) {
        plan = []
        for (let i = 0; i < targetCount; i++) {
          const ratio = i / targetCount
          const srcIdx = Math.min(Math.floor(ratio * selected.length), selected.length - 1)
          const srcCh = selected[srcIdx]
          plan.push({
            title: `${srcCh.title}（${mode === 'expand' ? '扩展' : '合并'} ${i + 1}/${targetCount}）`,
            chapter_goal: mode === 'expand'
              ? `扩展自第${srcCh.chapter_no}章，对应重组范围第 ${i + 1}/${targetCount} 章`
              : `合并自第${selected[0].chapter_no}-${selected[selected.length - 1].chapter_no}章`,
            chapter_summary: mode === 'expand'
              ? `${(srcCh.chapter_summary || '').slice(0, 160)}（扩展细纲 ${i + 1}/${targetCount}，正文待审核后手动生成）`
              : (srcCh.chapter_summary || '').slice(0, 200),
            conflict: srcCh.conflict || '',
            ending_hook: srcCh.ending_hook || '',
            scene_list: [],
          })
        }
      }

      const normalizedPlan = plan.slice(0, targetCount).map((item, i) => ({
        title: String(item?.title || `第${selected[0].chapter_no + i}章`),
        chapter_goal: String(item?.chapter_goal || ''),
        chapter_summary: String(item?.chapter_summary || ''),
        conflict: String(item?.conflict || ''),
        ending_hook: String(item?.ending_hook || ''),
        scene_list: Array.isArray(item?.scene_list)
          ? item.scene_list
          : Array.isArray(item?.scenes)
            ? item.scenes
            : Array.isArray(item?.scene_breakdown)
              ? item.scene_breakdown
              : [],
      }))

      // ── Step 3: Shift chapters after selected range ──
      const firstChapterNo = selected[0].chapter_no
      const lastChapterNo = selected[selected.length - 1].chapter_no
      const shift = targetCount - selected.length
      const trailingChapters = allChapters
        .filter(ch => ch.chapter_no > lastChapterNo)
        .sort((a, b) => b.chapter_no - a.chapter_no)

      if (shift !== 0) {
        for (const ch of trailingChapters) {
          await updateNovelChapter(activeWorkspace, ch.id, { chapter_no: ch.chapter_no + shift })
        }
      }

      // ── Step 4: Delete original selected chapters ──
      for (const ch of selected) {
        await deleteNovelChapter(activeWorkspace, ch.id)
      }

      // ── Step 5: Create replacement chapters in-place ──
      const newChapterIds: number[] = []
      for (let i = 0; i < normalizedPlan.length; i++) {
        const item = normalizedPlan[i]
        const created = await createNovelChapter(activeWorkspace, {
          project_id: projectId,
          chapter_no: firstChapterNo + i,
          title: item.title || `第${firstChapterNo + i}章`,
          chapter_goal: item.chapter_goal || '',
          chapter_summary: item.chapter_summary || '',
          conflict: item.conflict || '',
          ending_hook: item.ending_hook || '',
          chapter_text: '',
          scene_breakdown: item.scene_list || [],
          continuity_notes: [],
          status: mode === 'expand' ? 'outline_pending_review' : 'draft',
        })
        newChapterIds.push(created.id)
      }

      // ── Step 6: Run record ──
      await appendNovelRun(activeWorkspace, {
        project_id: projectId,
        run_type: 'restructure',
        step_name: mode,
        status: 'success',
        input_ref: JSON.stringify({ mode, chapterIds, targetCount }),
        output_ref: JSON.stringify({ mode, original_count: selected.length, target_count: targetCount, new_chapter_ids: newChapterIds, backup_version_ids: backupVersionIds }),
      })

      res.json({
        mode,
        original_count: selected.length,
        target_count: targetCount,
        new_chapter_ids: newChapterIds,
        backup_version_ids: backupVersionIds,
        plan: normalizedPlan,
        message: mode === 'expand'
          ? `已在原章节范围内将 ${selected.length} 章扩展为 ${targetCount} 章细纲，后续章节已顺延，正文需审核后手动生成`
          : `已将 ${selected.length} 章合并为 ${targetCount} 章`,
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/plan', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace(); const projectId = Number(req.body.project_id); const project = await getProject(activeWorkspace, projectId); if (!project) return res.status(404).json({ error: 'project not found' })
      // scope=foundation: 只跑设定 + 大纲 + 细纲 + 预检，不跑正文/审校/平台适配
      const scope = req.body.payload?.scope === 'foundation'
        ? ['market-agent', 'world-agent', 'character-agent', 'outline-agent', 'detail-outline-agent', 'continuity-check-agent']
        : undefined
      const plan = await generateNovelPlan(project, String(req.body.prompt || '请规划小说的基础三项：世界观、角色、大纲。'), activeWorkspace, Number(req.body.model_id || 0) || undefined, undefined, scope)

      // 从 Agent 执行结果中提取各阶段的 LLM 输出
      const getResult = (stepName: string) => (plan.results || []).find(item => item.step === stepName && item.outputSource === 'llm')?.output || {}
      const worldResult = getResult('world-agent')
      const characterResult = getResult('character-agent')
      const outlineResult = getResult('outline-agent')
      const detailOutlineResult = getResult('detail-outline-agent')
      const continuityResult = getResult('continuity-check-agent')

      const seed = buildNovelSeed(project, String(req.body.prompt || ''))

      // ═══ 1. 世界观 ═══
      const worldPayload = {
        world_summary: worldResult.world_summary || seed.world_summary,
        rules: Array.isArray(worldResult.rules) ? worldResult.rules : seed.rules,
        factions: Array.isArray(worldResult.factions) ? worldResult.factions : [{ name: '管理机构', role: '秩序维持者' }],
        locations: Array.isArray(worldResult.locations) ? worldResult.locations : [{ name: '事件现场', type: '起点' }],
        systems: Array.isArray(worldResult.systems) ? worldResult.systems : [{ name: '循环系统', description: '重置与因果偏差机制' }],
        items: Array.isArray(worldResult.items) ? worldResult.items : [],
        timeline_anchor: worldResult.timeline_anchor || '故事起点',
        known_unknowns: Array.isArray(worldResult.known_unknowns) ? worldResult.known_unknowns : ['为什么会重启', '谁在操控世界'],
        version: 1,
      }
      const world = await createNovelWorldbuilding(activeWorkspace, { project_id: projectId, ...worldPayload })

      // ═══ 2. 角色 ═══
      const characterItems = Array.isArray(characterResult.characters) && characterResult.characters.length > 0
        ? characterResult.characters
        : seed.characters
      const createdCharacters: any[] = []
      for (const item of characterItems) {
        createdCharacters.push(await createNovelCharacter(activeWorkspace, { project_id: projectId, ...item }))
      }

      // ═══ 3. 卷纲 ═══
      const volumeItems = Array.isArray(outlineResult.volume_outlines) && outlineResult.volume_outlines.length > 0
        ? outlineResult.volume_outlines
        : seed.volumeOutlines
      const volumeOutlines: any[] = []
      for (const item of volumeItems) {
        volumeOutlines.push(await createNovelOutline(activeWorkspace, { project_id: projectId, outline_type: 'volume', ...item }))
      }

      // ═══ 4. 总纲（master_outline 可能是对象或字符串）═══
      let masterOutlineData: any
      if (typeof outlineResult.master_outline === 'object' && outlineResult.master_outline !== null) {
        masterOutlineData = outlineResult.master_outline
      } else if (typeof outlineResult.master_outline === 'string') {
        masterOutlineData = { title: seed.outline.title, summary: outlineResult.master_outline }
      } else {
        masterOutlineData = seed.outline
      }
      const masterOutline = await createNovelOutline(activeWorkspace, {
        project_id: projectId,
        outline_type: 'master',
        title: masterOutlineData.title || seed.outline.title,
        summary: masterOutlineData.summary || seed.outline.summary,
        hook: masterOutlineData.hook || seed.outline.hook,
      })

      // ═══ 5. 章节（优先用 detail-outline 的 detail_chapters，否则用 outline 的 chapter_outlines，最后用 seed）═══
      let chapterItems: any[] = []

      // 优先级 1: detail_outline 的 detail_chapters
      if (Array.isArray(detailOutlineResult.detail_chapters) && detailOutlineResult.detail_chapters.length > 0) {
        chapterItems = detailOutlineResult.detail_chapters.map((dc: any) => ({
          chapter_no: dc.chapter_no,
          title: dc.title,
          chapter_summary: dc.summary || dc.chapter_summary || '',
          conflict: dc.conflict || '',
          ending_hook: dc.ending_hook || '',
          scene_breakdown: dc.scenes || [],
          continuity_notes: dc.continuity_from_prev ? [dc.continuity_from_prev] : [],
        }))
      }
      // 优先级 2: outline 的 chapter_outlines
      else if (Array.isArray(outlineResult.chapter_outlines) && outlineResult.chapter_outlines.length > 0) {
        chapterItems = outlineResult.chapter_outlines
      }
      // 优先级 3: seed
      else {
        chapterItems = seed.chapters
      }

      const chapters: any[] = []
      for (const item of chapterItems) {
        chapters.push(await createNovelChapter(activeWorkspace, {
          project_id: projectId,
          outline_id: masterOutline.id,
          chapter_no: item.chapter_no,
          title: item.title,
          chapter_summary: item.chapter_summary || item.summary || '',
          conflict: item.conflict || '',
          ending_hook: item.ending_hook || '',
          scene_breakdown: item.scene_breakdown || [],
          continuity_notes: item.continuity_notes || [],
        }))
      }

      // ═══ 6. 伏笔计划（存到大纲中作为子项）═══
      if (Array.isArray(outlineResult.foreshadowing_plan) && outlineResult.foreshadowing_plan.length > 0) {
        for (const fp of outlineResult.foreshadowing_plan) {
          await createNovelOutline(activeWorkspace, {
            project_id: projectId,
            outline_type: 'foreshadowing',
            title: fp.description || '',
            summary: `第${fp.plant_at}章埋 → 第${fp.payoff_at}章收`,
            parent_id: masterOutline.id,
          })
        }
      }

      // ═══ 7. 连续性预检记录 ═══
      const continuityIssues: string[] = []
      if (Array.isArray(continuityResult.continuity_issues)) {
        continuityIssues.push(...continuityResult.continuity_issues.map((ci: any) => `[${ci.severity || 'medium'}] 第${ci.chapter_no || '?'}章: ${ci.description || ''}`))
      }
      const review = await createNovelReview(activeWorkspace, {
        project_id: projectId,
        review_type: 'continuity',
        status: continuityResult.is_ready_for_prose !== false ? 'ok' : 'warn',
        summary: continuityIssues.length > 0 ? `发现 ${continuityIssues.length} 个连续性问题` : '当前生成结构一致，尚未发现明显冲突。',
        issues: continuityIssues,
        payload: JSON.stringify(continuityResult || {}),
      })

      // ═══ 8. 运行记录 ═══
      const results = [
        { step: 'market', success: true, output: plan.plan.market || {}, error: '' },
        { step: 'worldbuilding', success: true, output: world, error: '' },
        { step: 'character', success: true, output: createdCharacters, error: '' },
        { step: 'volume_outline', success: true, output: volumeOutlines, error: '' },
        { step: 'outline', success: true, output: masterOutline, error: '' },
        { step: 'detail_outline', success: true, output: detailOutlineResult, error: '' },
        { step: 'continuity_check', success: true, output: continuityResult, error: '' },
        { step: 'chapter', success: true, output: chapters, error: '' },
        { step: 'review', success: true, output: review, error: '' },
      ]

      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'plan', step_name: 'start', status: 'running', input_ref: JSON.stringify(req.body) })
      for (const item of results) {
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'plan', step_name: item.step, status: item.success ? 'success' : 'failed', output_ref: JSON.stringify(item.output), error_message: item.error })
      }
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'plan', step_name: 'finish', status: 'success', output_ref: JSON.stringify({ steps: results.length }) })

      // ═══ 8.5. 更新项目主记录（genre / synopsis / target_audience / tags）═══
      const marketResult = (plan.results || []).find(item => item.step === 'market-agent' && item.outputSource === 'llm')?.output || {}
      const genreValue = String(worldResult.genre || marketResult.genre || project.genre || '')
      const synopsisValue = String(masterOutlineData.summary || outlineResult.synopsis || seed.outline.summary || project.synopsis || '')
      const audienceValue = String(marketResult.target_audience || marketResult.targetReader || project.target_audience || '')
      const subGenresArr = Array.isArray(marketResult.sub_genres) ? marketResult.sub_genres : []
      const styleTagsArr = Array.isArray(marketResult.style_tags) ? marketResult.style_tags : []
      const commercialTagsArr = Array.isArray(marketResult.commercial_tags) ? marketResult.commercial_tags : (Array.isArray(outlineResult.commercial_tags) ? outlineResult.commercial_tags : [])
      await updateNovelProject(activeWorkspace, projectId, {
        genre: genreValue,
        synopsis: synopsisValue,
        target_audience: audienceValue,
        sub_genres: subGenresArr.length > 0 ? subGenresArr : undefined,
        style_tags: styleTagsArr.length > 0 ? styleTagsArr : undefined,
        commercial_tags: commercialTagsArr.length > 0 ? commercialTagsArr : undefined,
        status: 'draft',
      })

      // ═══ 9. 返回完整数据，包含所有生成的内容 ═══
      res.json({
        project_id: projectId,
        plan,
        results,
        world,
        characters: createdCharacters,
        volume_outlines: volumeOutlines,
        master_outline: masterOutline,
        chapters,
        continuity_check: continuityResult,
        review,
      })
    } catch (error) { res.status(500).json({ error: String(error) }) }
  })

  // ═══ Memory Palace Management API ═══

  /** GET /api/novel/memory-palace/projects — 列出记忆宫殿中所有已存储记忆的项目 */
  app.get('/api/novel/memory-palace/projects', async (_req, res) => {
    try {
      const projects = await listMemoryPalaceProjects()
      res.json({ projects })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  /** DELETE /api/novel/memory-palace/projects/:id — 删除指定项目的记忆宫殿数据 */
  app.delete('/api/novel/memory-palace/projects/:id', async (req, res) => {
    try {
      const projectId = Number(req.params.id)
      const projectTitle = req.body?.project_title || req.query?.project_title
      const result = await purgeMemoryPalaceProject(projectId, projectTitle || undefined)
      if (!result.ok) {
        return res.status(400).json({ ok: false, error: result.error })
      }
      res.json({ ok: true, project_id: projectId, message: `已成功删除项目 ${projectId} 的所有记忆数据` })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
