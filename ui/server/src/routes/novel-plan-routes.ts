import type { Express } from 'express'
import {
  appendNovelRun,
  createNovelChapter,
  createNovelCharacter,
  createNovelOutline,
  createNovelReview,
  createNovelWorldbuilding,
  updateNovelProject,
} from '../novel'
import { buildNovelSeed, generateNovelPlan } from '../llm'

type PlanRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
}

export function registerNovelPlanRoutes(app: Express, ctx: PlanRoutesContext) {
  app.post('/api/novel/plan', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })

      const scope = req.body.payload?.scope === 'foundation'
        ? ['market-agent', 'world-agent', 'character-agent', 'outline-agent', 'detail-outline-agent', 'continuity-check-agent']
        : undefined
      const plan = await generateNovelPlan(
        project,
        String(req.body.prompt || '请规划小说的基础三项：世界观、角色、大纲。'),
        activeWorkspace,
        Number(req.body.model_id || 0) || undefined,
        undefined,
        scope,
      )

      const getResult = (stepName: string) => (plan.results || []).find(item => item.step === stepName && item.outputSource === 'llm')?.output || {}
      const worldResult = getResult('world-agent')
      const characterResult = getResult('character-agent')
      const outlineResult = getResult('outline-agent')
      const detailOutlineResult = getResult('detail-outline-agent')
      const continuityResult = getResult('continuity-check-agent')

      const seed = buildNovelSeed(project, String(req.body.prompt || ''))

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

      const characterItems = Array.isArray(characterResult.characters) && characterResult.characters.length > 0
        ? characterResult.characters
        : seed.characters
      const createdCharacters: any[] = []
      for (const item of characterItems) {
        createdCharacters.push(await createNovelCharacter(activeWorkspace, { project_id: projectId, ...item }))
      }

      const volumeItems = Array.isArray(outlineResult.volume_outlines) && outlineResult.volume_outlines.length > 0
        ? outlineResult.volume_outlines
        : seed.volumeOutlines
      const volumeOutlines: any[] = []
      for (const item of volumeItems) {
        volumeOutlines.push(await createNovelOutline(activeWorkspace, { project_id: projectId, outline_type: 'volume', ...item }))
      }

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

      let chapterItems: any[] = []
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
      } else if (Array.isArray(outlineResult.chapter_outlines) && outlineResult.chapter_outlines.length > 0) {
        chapterItems = outlineResult.chapter_outlines
      } else {
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
        await appendNovelRun(activeWorkspace, {
          project_id: projectId,
          run_type: 'plan',
          step_name: item.step,
          status: item.success ? 'success' : 'failed',
          output_ref: JSON.stringify(item.output),
          error_message: item.error,
        })
      }
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'plan', step_name: 'finish', status: 'success', output_ref: JSON.stringify({ steps: results.length }) })

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
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
