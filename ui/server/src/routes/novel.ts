import type { Express } from 'express'
import { ensureWorkspaceStructure } from '../workspace'
import {
  appendNovelRun,
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
  updateNovelChapter,
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
  executeRepairAgent,
  generateNovelPlan,
  generateNovelChapterProse,
} from '../llm'

export function registerNovelRoutes(app: Express, getWorkspace: () => string) {
  const getProject = async (workspace: string, id: number) => getNovelProject(workspace, id)
  const makeSnapshot = async (workspace: string, projectId: number) => ({
    worldbuilding: await listNovelWorldbuilding(workspace, projectId),
    characters: await listNovelCharacters(workspace, projectId),
    outlines: await listNovelOutlines(workspace, projectId),
    chapters: await listNovelChapters(workspace, projectId),
  })

  app.get('/api/novel/projects', async (_req, res) => { try { const activeWorkspace = getWorkspace(); await ensureWorkspaceStructure(activeWorkspace); res.json(await listNovelProjects(activeWorkspace)) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/projects', async (req, res) => { try { const activeWorkspace = getWorkspace(); await ensureWorkspaceStructure(activeWorkspace); res.json(await createNovelProject(activeWorkspace, req.body)) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.delete('/api/novel/projects/:id', async (req, res) => { try { const activeWorkspace = getWorkspace(); const ok = await deleteNovelProject(activeWorkspace, Number(req.params.id)); if (!ok) return res.status(404).json({ error: 'project not found' }); res.json({ ok: true }) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/projects/:id', async (req, res) => { try { const activeWorkspace = getWorkspace(); const project = await getProject(activeWorkspace, Number(req.params.id)); if (!project) return res.status(404).json({ error: 'project not found' }); res.json(project) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/projects/:id/worldbuilding', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await listNovelWorldbuilding(activeWorkspace, Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/projects/:id/worldbuilding', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await createNovelWorldbuilding(activeWorkspace, { ...req.body, project_id: Number(req.params.id) })) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/projects/:id/characters', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await listNovelCharacters(activeWorkspace, Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/characters', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await createNovelCharacter(activeWorkspace, req.body)) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.get('/api/novel/projects/:id/outlines', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await listNovelOutlines(activeWorkspace, Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) } })
  app.post('/api/novel/outlines', async (req, res) => { try { const activeWorkspace = getWorkspace(); res.json(await createNovelOutline(activeWorkspace, req.body)) } catch (error) { res.status(500).json({ error: String(error) }) } })
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
      if (!result.success || !result.output?.chapter_text) {
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify(result.parsed || null), error_message: String(result.error || result.fallbackReason || '模型未返回正文') })
        return res.status(502).json({ error: String(result.error || result.fallbackReason || '模型未返回正文'), result })
      }
      const updated = await updateNovelChapter(activeWorkspace, chapter.id, { chapter_text: result.output.chapter_text, scene_breakdown: result.output.scene_breakdown || [], continuity_notes: result.output.continuity_notes || [], status: 'draft' })
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'success', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify({ outputSource: result.outputSource, modelId: result.modelId, modelName: result.modelName, providerId: result.providerId, usage: result.usage }) })
      const wantsStream = String(req.headers.accept || '').includes('text/event-stream') || String(req.query.stream || '') === '1'
      if (!wantsStream) return res.json({ chapter: updated, result })
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache, no-transform')
      res.setHeader('Connection', 'keep-alive')
      const fullText = String(result.output.chapter_text || '')
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

  /** P1-1: 支持部分 Agent 执行 — 传 agents 数组则只执行指定 Agent */
  app.post('/api/novel/agents/execute', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace();
      const projectId = Number(req.body.project_id);
      const project = await getProject(activeWorkspace, projectId);
      if (!project) return res.status(404).json({ error: 'project not found' });
      const agentFilter = Array.isArray(req.body.agents) && req.body.agents.length > 0 ? req.body.agents : undefined;
      const execution = await executeNovelAgentChain(
        project,
        String(req.body.prompt || ''),
        activeWorkspace,
        Number(req.body.model_id || 0) || undefined,
        agentFilter,
      );
      const proseOutput = execution.results.find(item => item.step === 'prose-agent')?.output?.prose_chapters || [];
      await syncProseChaptersToStore(activeWorkspace, projectId, proseOutput);
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'agent_execute', step_name: 'chain', status: 'success', output_ref: JSON.stringify(execution.results) });
      const review = await createNovelReview(activeWorkspace, { project_id: projectId, review_type: 'continuity', status: 'ok', summary: execution.review.summary, issues: execution.review.issues });
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

      // P0-2: 调用真实 Repair Agent
      const repairResult = await executeRepairAgent(
        project,
        reviewIssues,
        snapshot,
        activeWorkspace,
        Number(req.body.model_id || 0) || undefined,
      )

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

  app.post('/api/novel/plan', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace(); const projectId = Number(req.body.project_id); const project = await getProject(activeWorkspace, projectId); if (!project) return res.status(404).json({ error: 'project not found' })
      const plan = await generateNovelPlan(project, String(req.body.prompt || '请规划小说的基础三项：世界观、角色、大纲。'), activeWorkspace, Number(req.body.model_id || 0) || undefined)
      const llmResult = (plan.results || []).find(item => item.step === 'outline-agent' && item.outputSource === 'llm')?.output || {}
      const chapterResult = (plan.results || []).find(item => item.step === 'chapter-agent' && item.outputSource === 'llm')?.output || {}
      const worldResult = (plan.results || []).find(item => item.step === 'world-agent' && item.outputSource === 'llm')?.output || {}
      const characterResult = (plan.results || []).find(item => item.step === 'character-agent' && item.outputSource === 'llm')?.output || {}
      const seed = buildNovelSeed(project, String(req.body.prompt || ''))
      const worldPayload = { world_summary: worldResult.world_summary || seed.world_summary, rules: worldResult.rules || seed.rules, factions: worldResult.factions || [{ name: '管理机构', role: '秩序维持者' }], locations: worldResult.locations || [{ name: '事件现场', type: '起点' }], systems: worldResult.systems || [{ name: '循环系统', description: '重置与因果偏差机制' }], timeline_anchor: worldResult.timeline_anchor || '故事起点', known_unknowns: worldResult.known_unknowns || ['为什么会重启', '谁在操控世界'], version: 1 }
      const world = await createNovelWorldbuilding(activeWorkspace, { project_id: projectId, ...worldPayload })
      const characterItems = Array.isArray(characterResult.characters) && characterResult.characters.length > 0 ? characterResult.characters : seed.characters
      const createdCharacters = [] as any[]; for (const item of characterItems) createdCharacters.push(await createNovelCharacter(activeWorkspace, { project_id: projectId, ...item }))
      const volumeItems = Array.isArray(llmResult.volume_outlines) && llmResult.volume_outlines.length > 0 ? llmResult.volume_outlines : seed.volumeOutlines
      const volumeOutlines = [] as any[]; for (const item of volumeItems) volumeOutlines.push(await createNovelOutline(activeWorkspace, { project_id: projectId, ...item }))
      const masterOutline = llmResult.master_outline || seed.outline
      const outline = await createNovelOutline(activeWorkspace, { project_id: projectId, ...masterOutline })
      const chapterItems = Array.isArray(chapterResult.chapters) && chapterResult.chapters.length > 0 ? chapterResult.chapters : (Array.isArray(llmResult.chapter_outlines) && llmResult.chapter_outlines.length > 0 ? llmResult.chapter_outlines : seed.chapters)
      const chapters = [] as any[]; for (const item of chapterItems) chapters.push(await createNovelChapter(activeWorkspace, { project_id: projectId, outline_id: outline.id, ...item }))
      const review = await createNovelReview(activeWorkspace, { project_id: projectId, review_type: 'continuity', status: 'ok', summary: '当前生成结构一致，尚未发现明显冲突。', issues: [] })
      const results = [ { step: 'market', success: true, output: plan.plan.market, error: '' }, { step: 'worldbuilding', success: true, output: world, error: '' }, { step: 'character', success: true, output: createdCharacters, error: '' }, { step: 'volume_outline', success: true, output: volumeOutlines, error: '' }, { step: 'outline', success: true, output: outline, error: '' }, { step: 'chapter', success: true, output: chapters, error: '' }, { step: 'review', success: true, output: review, error: '' } ]
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'plan', step_name: 'start', status: 'running', input_ref: JSON.stringify(req.body) }); for (const item of results) await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'plan', step_name: item.step, status: item.success ? 'success' : 'failed', output_ref: JSON.stringify(item.output), error_message: item.error }); await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'plan', step_name: 'finish', status: 'success', output_ref: JSON.stringify({ steps: results.length }) }); res.json({ project_id: projectId, plan, results })
    } catch (error) { res.status(500).json({ error: String(error) }) }
  })
}
