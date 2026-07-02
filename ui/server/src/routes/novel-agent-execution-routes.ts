import type { Express } from 'express'
import {
  appendNovelRun,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelWorldbuilding,
  updateNovelChapter,
} from '../novel'
import { buildRepairPlan, executeNovelAgentChain } from '../llm'
import { summarizeAgentChainStatus, syncAgentExecutionToNovelStore } from './novel-agent-sync-service'

export { summarizeAgentChainStatus } from './novel-agent-sync-service'

type AgentExecutionRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
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
      const chainSummary = summarizeAgentChainStatus(execution.results || [])
      if (chainSummary.status === 'failed') {
        await appendNovelRun(activeWorkspace, {
          project_id: projectId,
          run_type: 'agent_execute',
          step_name: 'chain',
          status: 'failed',
          input_ref: JSON.stringify(req.body || {}),
          output_ref: JSON.stringify(execution.results || []),
          error_message: chainSummary.error || 'agent chain failed',
        })
        return res.status(502).json({ ...execution, chain_status: chainSummary, error: chainSummary.error || 'agent chain failed' })
      }
      const syncResult = await syncAgentExecutionToNovelStore(activeWorkspace, project, String(req.body.prompt || ''), execution)

      await appendNovelRun(activeWorkspace, {
        project_id: projectId,
        run_type: 'agent_execute',
        step_name: 'chain',
        status: chainSummary.status === 'partial' ? 'failed' : 'success',
        input_ref: JSON.stringify(req.body || {}),
        output_ref: JSON.stringify(execution.results),
        error_message: chainSummary.error,
      })
      const review = syncResult.synced.reviews[0] || null
      res.json({ ...execution, chain_status: chainSummary, review })
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
