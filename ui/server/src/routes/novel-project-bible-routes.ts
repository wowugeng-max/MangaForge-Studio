import type { Express } from 'express'
import {
  appendNovelRun,
  createNovelReview,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelWorldbuilding,
  updateNovelProject,
} from '../novel'
import { executeNovelAgent } from '../llm'
import { asArray, getNovelPayload, stableTextHash } from './novel-route-utils'

type ProjectBibleRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  getStoredOrBuiltWritingBible: (workspace: string, project: any) => Promise<any>
  getStoryState: (project: any) => any
}

function compactControlText(value: any, limit = 600) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function normalizeGeneratedWritingBible(project: any, payload: any, fallback: any = {}) {
  const styleLock = payload?.style_lock || fallback?.style_lock || {}
  const safety = payload?.safety_policy || fallback?.safety_policy || project.reference_config?.safety || {}
  return {
    ...(fallback || {}),
    project: {
      ...(fallback?.project || {}),
      ...(payload?.project || {}),
      title: project.title,
      genre: payload?.project?.genre || project.genre || fallback?.project?.genre || '',
      synopsis: payload?.project?.synopsis || project.synopsis || fallback?.project?.synopsis || '',
      target_audience: payload?.project?.target_audience || project.target_audience || fallback?.project?.target_audience || '',
      style_tags: asArray(payload?.project?.style_tags).length ? asArray(payload.project.style_tags) : (project.style_tags || fallback?.project?.style_tags || []),
      length_target: payload?.project?.length_target || project.length_target || fallback?.project?.length_target || '',
    },
    promise: String(payload?.promise || fallback?.promise || project.synopsis || ''),
    world_summary: String(payload?.world_summary || fallback?.world_summary || ''),
    world_rules: asArray(payload?.world_rules).length ? payload.world_rules : asArray(fallback?.world_rules),
    mainline: payload?.mainline || fallback?.mainline || {},
    volume_plan: asArray(payload?.volume_plan).length ? payload.volume_plan : asArray(fallback?.volume_plan),
    characters: asArray(payload?.characters).length ? payload.characters : asArray(fallback?.characters),
    style_lock: {
      ...(styleLock || {}),
      narrative_person: String(styleLock?.narrative_person || ''),
      sentence_length: String(styleLock?.sentence_length || ''),
      dialogue_ratio: String(styleLock?.dialogue_ratio || ''),
      banter_density: String(styleLock?.banter_density || ''),
      payoff_density: String(styleLock?.payoff_density || ''),
      description_density: String(styleLock?.description_density || ''),
      chapter_word_range: String(styleLock?.chapter_word_range || ''),
      banned_words: asArray(styleLock?.banned_words),
      preferred_words: asArray(styleLock?.preferred_words),
      ending_policy: String(styleLock?.ending_policy || ''),
      banned_shortcuts: asArray(styleLock?.banned_shortcuts),
    },
    safety_policy: {
      ...(safety || {}),
      allowed: asArray(safety?.allowed),
      cautious: asArray(safety?.cautious),
      forbidden: asArray(safety?.forbidden),
    },
    forbidden: asArray(payload?.forbidden).length ? payload.forbidden : asArray(safety?.forbidden || fallback?.forbidden),
    commercial_positioning: payload?.commercial_positioning || fallback?.commercial_positioning || {},
    generation_rules: asArray(payload?.generation_rules).length ? payload.generation_rules : asArray(fallback?.generation_rules),
    updated_at: new Date().toISOString(),
  }
}

export function registerNovelProjectBibleRoutes(app: Express, ctx: ProjectBibleRoutesContext) {
  app.get('/api/novel/projects/:id/writing-bible', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, writing_bible: await ctx.getStoredOrBuiltWritingBible(activeWorkspace, project), generated: !project.reference_config?.writing_bible })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/writing-bible/generate', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const modelId = req.body?.model_id ? String(req.body.model_id) : undefined
      if (!modelId) return res.status(400).json({ error: 'model_id is required' })
      const [worldbuilding, characters, outlines, chapters, reviews] = await Promise.all([
        listNovelWorldbuilding(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const fallback = await ctx.getStoredOrBuiltWritingBible(activeWorkspace, project)
      const material = {
        project: {
          title: project.title,
          genre: project.genre || '',
          sub_genres: project.sub_genres || [],
          synopsis: project.synopsis || '',
          target_audience: project.target_audience || '',
          length_target: project.length_target || '',
          style_tags: project.style_tags || [],
          commercial_tags: project.commercial_tags || [],
        },
        existing_writing_bible: fallback,
        worldbuilding: worldbuilding.slice(0, 6).map(item => ({
          summary: item.world_summary || '',
          rules: item.rules || [],
          systems: item.systems || null,
          factions: item.factions || [],
          locations: item.locations || [],
          timeline_anchor: item.timeline_anchor || '',
        })),
        characters: characters.slice(0, 20).map(item => ({
          name: item.name,
          role: item.role_type || item.role || '',
          goal: item.goal || '',
          motivation: item.motivation || '',
          conflict: item.conflict || '',
          appearance: item.appearance || '',
          abilities: item.abilities || [],
          relationships: item.relationships || [],
          secret: item.secret || '',
          growth_arc: item.growth_arc || '',
          current_state: item.current_state || {},
          profile: item.raw_payload?.profile || {},
        })),
        outlines: outlines.slice(0, 40).map(item => ({
          type: item.outline_type,
          title: item.title,
          summary: item.summary || '',
          hook: item.hook || '',
          conflict_points: item.conflict_points || [],
          turning_points: item.turning_points || [],
          target_length: item.target_length || '',
        })),
        chapters: chapters.slice(0, 30).map(item => ({
          chapter_no: item.chapter_no,
          title: item.title,
          goal: item.chapter_goal || '',
          summary: item.chapter_summary || '',
          conflict: item.conflict || '',
          ending_hook: item.ending_hook || '',
          text_excerpt: compactControlText(item.chapter_text, 900),
        })),
        latest_reviews: reviews.slice(-12).map(item => ({
          type: item.review_type,
          status: item.status,
          summary: item.summary,
          issues: item.issues || [],
        })),
        reference_config: {
          safety: project.reference_config?.safety || {},
          style_lock: project.reference_config?.style_lock || {},
          active_references: project.reference_config?.active_references || [],
        },
      }
      const prompt = [
        '任务：根据现有小说项目材料生成一份可直接用于商业级自动写作工作台的“写作圣经”。只输出 JSON。',
        '要求：不要空字段；材料不足时可以合理推断，但必须保持可执行、具体、可约束后续生成。',
        '写作圣经用于后续章节生成、质检、修订、仿写安全和长篇一致性控制。',
        '必须输出字段：',
        '{',
        '  "project": {"title","genre","synopsis","target_audience","style_tags","length_target"},',
        '  "promise": "读者承诺/核心卖点，100-300字",',
        '  "world_summary": "世界观摘要",',
        '  "world_rules": ["稳定世界规则，包含力量体系/禁忌/代价/社会秩序"],',
        '  "mainline": {"core_conflict","protagonist_drive","antagonist_pressure","long_term_question","ending_direction","must_payoff":[]},',
        '  "volume_plan": [{"title","goal","phase_conflict","turning_points":[],"payoff","risk"}],',
        '  "characters": [{"name","role","desire","fear","secret","arc","voice","do_not_violate":[]}],',
        '  "style_lock": {"narrative_person","sentence_length","dialogue_ratio","banter_density","payoff_density","description_density","chapter_word_range","ending_policy","banned_words":[],"preferred_words":[],"banned_shortcuts":[]},',
        '  "safety_policy": {"allowed":[],"cautious":[],"forbidden":[]},',
        '  "forbidden": ["禁止重复/禁止写法/禁止设定漂移"],',
        '  "commercial_positioning": {"selling_points":[],"target_reader_emotion":[],"chapter_hook_model","retention_strategy"},',
        '  "generation_rules": ["每章生成必须遵守的硬规则"]',
        '}',
        '【项目材料】',
        JSON.stringify(material, null, 2).slice(0, 18000),
      ].join('\n')
      const result = await executeNovelAgent('outline-agent', project, { task: prompt }, {
        activeWorkspace,
        modelId,
        maxTokens: 6500,
        temperature: 0.35,
        responseMode: 'non_stream',
        skipMemory: true,
      })
      if ((result as any).error) return res.status(502).json({ error: (result as any).error, result })
      const payload = getNovelPayload(result)
      const writingBible = normalizeGeneratedWritingBible(project, payload, fallback)
      let updated = project
      if (req.body?.save !== false) {
        updated = await updateNovelProject(activeWorkspace, project.id, {
          reference_config: {
            ...(project.reference_config || {}),
            writing_bible: writingBible,
          },
        } as any) || project
        await appendNovelRun(activeWorkspace, {
          project_id: project.id,
          run_type: 'writing_bible',
          step_name: 'generate',
          status: 'success',
          input_ref: JSON.stringify({ model_id: modelId, save: req.body?.save !== false }),
          output_ref: JSON.stringify({ writing_bible_hash: stableTextHash(JSON.stringify(writingBible)), modelName: (result as any).modelName }),
        })
      }
      res.json({ ok: true, writing_bible: writingBible, project: updated, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/writing-bible', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const writingBible = req.body?.writing_bible || req.body || {}
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          writing_bible: { ...writingBible, updated_at: new Date().toISOString() },
        },
      } as any)
      res.json({ ok: true, writing_bible: updated?.reference_config?.writing_bible || writingBible, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/story-state', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, story_state: ctx.getStoryState(project) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/story-state', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const storyState = req.body?.story_state || req.body || {}
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          story_state: { ...storyState, manually_corrected_at: new Date().toISOString() },
        },
      } as any)
      await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'story_state',
        status: 'ok',
        summary: '故事状态机已人工校正',
        issues: [],
        payload: JSON.stringify({ manual: true, story_state: updated?.reference_config?.story_state || storyState }),
      })
      res.json({ ok: true, story_state: updated?.reference_config?.story_state || storyState, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
