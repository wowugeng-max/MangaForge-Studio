import type { Express } from 'express'
import {
  appendNovelRun,
  createNovelChapter,
  createNovelCharacter,
  createNovelOutline,
  createNovelReview,
  createNovelWorldbuilding,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelWorldbuilding,
  updateNovelChapter,
  updateNovelProject,
} from '../novel'
import { buildNovelSeed, buildRepairPlan, executeNovelAgentChain } from '../llm'

type AgentExecutionRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
}

async function syncProseChaptersToStore(activeWorkspace: string, projectId: number, proseChapters: any[], source: 'agent_execute' | 'repair' = 'agent_execute') {
  for (const proseChapter of proseChapters || []) {
    const chapterList = await listNovelChapters(activeWorkspace, projectId)
    const matched = chapterList.find(item => item.chapter_no === Number(proseChapter.chapter_no))
    if (matched) {
      await updateNovelChapter(activeWorkspace, matched.id, {
        chapter_text: String(proseChapter.chapter_text || ''),
        scene_breakdown: proseChapter.scene_breakdown || [],
        continuity_notes: proseChapter.continuity_notes || [],
      }, { versionSource: source })
    }
  }
}

async function makeSnapshot(workspace: string, projectId: number) {
  return {
    worldbuilding: await listNovelWorldbuilding(workspace, projectId),
    characters: await listNovelCharacters(workspace, projectId),
    outlines: await listNovelOutlines(workspace, projectId),
    chapters: await listNovelChapters(workspace, projectId),
  }
}

export function registerNovelAgentExecutionRoutes(app: Express, ctx: AgentExecutionRoutesContext) {
  app.post('/api/novel/agents/execute', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const agentFilter = Array.isArray(req.body.agents) && req.body.agents.length > 0 ? req.body.agents : undefined
      const chapterCount = req.body.payload?.chapterCount || req.body.chapterCount || undefined
      const continueFrom = req.body.payload?.continueFrom || req.body.continueFrom || undefined
      const userOutline = req.body.payload?.userOutline || req.body.userOutline || undefined

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
      )
      const seed = buildNovelSeed(project, String(req.body.prompt || ''))
      const getStep = (stepName: string) => execution.results.find(item => item.step === stepName && item.outputSource === 'llm')?.output || {}

      const worldResult = getStep('world-agent')
      const charResult = getStep('character-agent')
      const outlineResult = getStep('outline-agent')
      const detailResult = getStep('detail-outline-agent')
      const continuityResult = getStep('continuity-check-agent')
      const proseResult = getStep('prose-agent')

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

      const characterItems = Array.isArray(charResult.characters) && charResult.characters.length > 0
        ? charResult.characters : (Array.isArray(seed.characters) ? seed.characters : [])
      for (const c of characterItems) {
        await createNovelCharacter(activeWorkspace, { project_id: projectId, ...c })
      }

      const volumeItems = Array.isArray(outlineResult.volume_outlines) && outlineResult.volume_outlines.length > 0
        ? outlineResult.volume_outlines : []
      for (const v of volumeItems) {
        await createNovelOutline(activeWorkspace, { project_id: projectId, outline_type: 'volume', ...v })
      }

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

      await syncProseChaptersToStore(activeWorkspace, projectId, proseResult?.prose_chapters || [])

      const marketResult = getStep('market-agent')
      await updateNovelProject(activeWorkspace, projectId, {
        genre: String(worldResult.genre || marketResult.genre || project.genre || ''),
        synopsis: String(masterOutlineData.summary || outlineResult.synopsis || seed.outline?.summary || project.synopsis || ''),
        target_audience: String(marketResult.target_audience || marketResult.targetReader || project.target_audience || ''),
        sub_genres: Array.isArray(marketResult.sub_genres) ? marketResult.sub_genres : undefined,
        style_tags: Array.isArray(marketResult.style_tags) ? marketResult.style_tags : undefined,
        commercial_tags: Array.isArray(marketResult.commercial_tags) ? marketResult.commercial_tags : undefined,
        status: 'draft',
      })

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

  app.post('/api/novel/agents/repair', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })

      const snapshot = await makeSnapshot(activeWorkspace, projectId)
      const repairs = buildRepairPlan()
      let reviewIssues: Array<any> = req.body.issues || []
      if (!reviewIssues.length) {
        const reviews = await listNovelReviews(activeWorkspace, projectId)
        const continuity = reviews.find(r => r.review_type === 'continuity') || reviews.find(r => r.review_type === 'platform_fit')
        if (continuity && Array.isArray(continuity.issues)) reviewIssues = continuity.issues
      }
      if (!reviewIssues.length) reviewIssues = repairs.map(r => `修复目标：${r.target} — ${r.action}`)

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

      const applied: any[] = []
      const repairedChapters = Array.isArray(repairResult.output?.repaired_chapters) ? repairResult.output.repaired_chapters : []
      const repairedOutlines = Array.isArray(repairResult.output?.repaired_outlines) ? repairResult.output.repaired_outlines : []
      const repairedCharacters = Array.isArray(repairResult.output?.repaired_characters) ? repairResult.output.repaired_characters : []

      if (repairedChapters.length > 0) {
        for (const rc of repairedChapters) {
          const matched = snapshot.chapters.find(ch => ch.chapter_no === Number(rc.chapter_no) || ch.id === Number(rc.id))
          if (matched) {
            await updateNovelChapter(activeWorkspace, matched.id, {
              chapter_text: String(rc.chapter_text || matched.chapter_text),
              chapter_summary: String(rc.chapter_summary || matched.chapter_summary),
              conflict: String(rc.conflict || matched.conflict),
              ending_hook: String(rc.ending_hook || matched.ending_hook),
            }, { versionSource: 'repair' })
            applied.push({ target: 'chapter', chapter_no: rc.chapter_no, action: '修复章节正文与摘要' })
          }
        }
      }
      for (const ro of repairedOutlines) {
        const matched = snapshot.outlines.find(o => o.id === Number(ro.id))
        if (matched) applied.push({ target: 'outline', outline_id: matched.id, action: '修复大纲摘要与转折' })
      }
      for (const rch of repairedCharacters) {
        const matched = snapshot.characters.find(c => c.id === Number(rch.id))
        if (matched) applied.push({ target: 'character', character_id: matched.id, action: '修复角色动机与目标' })
      }

      if (!repairResult.success && applied.length === 0) {
        if (repairs.find(r => r.target === 'worldbuilding') && snapshot.worldbuilding[0]) applied.push({ target: 'worldbuilding', action: 'refined rules and timeline anchor' })
        if (repairs.find(r => r.target === 'outline') && snapshot.outlines[0]) applied.push({ target: 'outline', action: 'rebalanced summary and turning points' })
        if (repairs.find(r => r.target === 'chapter') && snapshot.chapters[0]) applied.push({ target: 'chapter', action: 'tightened chapter conflict and ending hook' })
        if (repairs.find(r => r.target === 'prose') && snapshot.chapters[0]) applied.push({ target: 'prose', action: 'rewrote chapter text and scene breakdown' })
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
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'repair', step_name: 'apply', status: repairResult.success ? 'success' : 'fallback', output_ref: JSON.stringify({ applied, llm_used: repairResult.success && !repairResult.fallbackUsed, modelId: (repairResult as any).modelId, modelName: (repairResult as any).modelName }), error_message: (repairResult as any).error || '' })
      res.json({ project_id: projectId, repairs, applied, before: snapshot, after, review, llm_result: repairResult })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
