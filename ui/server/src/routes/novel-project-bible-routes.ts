export * from './novel-project-bible-helpers'
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
import {
  COMMERCIAL_WEB_NOVEL_STYLE_LOCK_DEFAULTS,
  asArray,
  getNovelPayload,
  getStyleLock,
  parseJsonLikePayload,
  safeJsonStringify,
  stableTextHash,
} from './novel-route-utils'
import { normalizeStyleSampleBank } from './novel-writing-service'
import {
  ProjectBibleRoutesContext,
  applyStyleSampleAdjustmentBatch,
  applyStyleSampleAdjustmentPatch,
  bibleJson,
  buildStyleSampleCandidatesFromChapters,
  buildStyleSampleEffectivenessReport,
  buildStyleSamplePatchHistoryEntry,
  buildStyleSamplePatchPostApplyReview,
  chapterStyleSampleStrategy,
  compactControlText,
  normalizeGeneratedWritingBible,
  undoLatestStyleSamplePatchHistory,
  uniqueStyleTexts
} from './novel-project-bible-helpers'

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
        '  "reader_promise": "读者每章/每卷能稳定获得的情绪回报",',
        '  "protagonist_drive": "主角为什么必须持续往前走",',
        '  "core_conflict": "贯穿全书的长期矛盾",',
        '  "current_volume_goal": "当前卷必须抵达的阶段目标",',
        '  "innovation_hook": "区别于同类作品的原创新鲜点",',
        '  "first30_plan": "前三十章留存、爽点、转折和付费前蓄势策略",',
        '  "longform_capacity": "支撑长篇/超长篇推进的卷轴、升级、谜团或矛盾扩展方式",',
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
        bibleJson(material, 18000),
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
          output_ref: JSON.stringify({ writing_bible_hash: stableTextHash(safeJsonStringify(writingBible, undefined, 0)), modelName: (result as any).modelName }),
        })
      }
      res.json({ ok: true, writing_bible: writingBible, project: updated, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/writing-bible/style-sample-candidates', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const candidates = buildStyleSampleCandidatesFromChapters(chapters, reviews, req.body || {})
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'writing_bible',
        step_name: 'style_sample_candidates',
        status: 'success',
        input_ref: JSON.stringify({ min_score: req.body?.min_score ?? req.body?.minScore ?? 86, limit: req.body?.limit || 6 }),
        output_ref: JSON.stringify({ total: candidates.length, sample_keys: candidates.map((item: any) => item.sample_key) }),
      })
      res.json({ ok: true, candidates, total: candidates.length })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/writing-bible/style-sample-effectiveness', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [writingBible, chapters, reviews] = await Promise.all([
        ctx.getStoredOrBuiltWritingBible(activeWorkspace, project),
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const styleSampleBank = [
        ...asArray(project.reference_config?.style_sample_bank),
        ...asArray(writingBible?.style_sample_bank),
      ]
      const styleSampleEffectiveness = buildStyleSampleEffectivenessReport(styleSampleBank, chapters, reviews)
      res.json({
        ok: true,
        style_sample_effectiveness: styleSampleEffectiveness,
        report: styleSampleEffectiveness,
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/writing-bible/style-sample-adjustment', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const sampleKey = String(req.body?.sample_key || req.body?.sampleKey || '').trim()
      if (!sampleKey) return res.status(400).json({ error: 'sample_key is required' })
      const dryRun = req.body?.dry_run === true || req.body?.dryRun === true
      const [writingBible, chapters, reviews] = await Promise.all([
        ctx.getStoredOrBuiltWritingBible(activeWorkspace, project),
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const currentStyleSampleBank = asArray(writingBible?.style_sample_bank).length
        ? asArray(writingBible.style_sample_bank)
        : asArray(project.reference_config?.style_sample_bank)
      const hasSample = currentStyleSampleBank.some((item: any) => String(item?.sample_key || item?.key || item?.name || '').trim() === sampleKey)
      if (!hasSample) return res.status(404).json({ error: 'style sample not found' })

      const report = buildStyleSampleEffectivenessReport(currentStyleSampleBank, chapters, reviews)
      const reportItem = asArray(report.samples).find((item: any) => String(item?.sample_key || '').trim() === sampleKey)
      if (!reportItem) return res.status(404).json({ error: 'style sample report not found' })
      const adjustment = applyStyleSampleAdjustmentPatch(currentStyleSampleBank, reportItem)
      if (dryRun) {
        return res.json({
          ok: true,
          dry_run: true,
          style_sample_patch: adjustment.patch,
          style_sample_bank: adjustment.style_sample_bank,
          changed: adjustment.changed,
        })
      }

      const patchHistoryEntry = adjustment.changed
        ? buildStyleSamplePatchHistoryEntry(currentStyleSampleBank, adjustment.style_sample_bank, {
          mode: 'single',
          patches: [adjustment.patch],
          changed_count: 1,
        })
        : null
      const nextWritingBible = {
        ...(writingBible || {}),
        style_sample_bank: adjustment.style_sample_bank,
        ...(patchHistoryEntry ? {
          style_sample_patch_history: [
            ...asArray(writingBible?.style_sample_patch_history),
            patchHistoryEntry,
          ],
        } : {}),
        updated_at: new Date().toISOString(),
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          style_sample_bank: adjustment.style_sample_bank,
          writing_bible: nextWritingBible,
        },
      } as any)
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'writing_bible',
        step_name: 'style_sample_adjustment',
        status: 'success',
        input_ref: JSON.stringify({ sample_key: sampleKey, dry_run: dryRun }),
        output_ref: JSON.stringify({
          changed: adjustment.changed,
          action: adjustment.patch?.action,
          patch_hash: stableTextHash(adjustment.patch?.patch_json || JSON.stringify(adjustment.patch || {})),
          patch_history_id: patchHistoryEntry?.patch_id,
        }),
      })
      res.json({
        ok: true,
        dry_run: false,
        changed: adjustment.changed,
        style_sample_patch: adjustment.patch,
        writing_bible: nextWritingBible,
        project: updated,
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/writing-bible/style-sample-adjustments', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const dryRun = req.body?.dry_run === true || req.body?.dryRun === true
      const [writingBible, chapters, reviews] = await Promise.all([
        ctx.getStoredOrBuiltWritingBible(activeWorkspace, project),
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const currentStyleSampleBank = asArray(writingBible?.style_sample_bank).length
        ? asArray(writingBible.style_sample_bank)
        : asArray(project.reference_config?.style_sample_bank)
      const report = buildStyleSampleEffectivenessReport(currentStyleSampleBank, chapters, reviews)
      const adjustmentBatch = applyStyleSampleAdjustmentBatch(currentStyleSampleBank, report, {
        sample_keys: req.body?.sample_keys || req.body?.sampleKeys || [],
      })
      if (dryRun) {
        return res.json({
          ok: true,
          dry_run: true,
          style_sample_patch_batch: adjustmentBatch,
          style_sample_bank: adjustmentBatch.style_sample_bank,
          changed: adjustmentBatch.changed,
        })
      }

      const patchHistoryEntry = adjustmentBatch.changed
        ? buildStyleSamplePatchHistoryEntry(currentStyleSampleBank, adjustmentBatch.style_sample_bank, {
          mode: 'batch',
          patches: adjustmentBatch.patches,
          changed_count: adjustmentBatch.changed_count,
        })
        : null
      const nextWritingBible = {
        ...(writingBible || {}),
        style_sample_bank: adjustmentBatch.style_sample_bank,
        ...(patchHistoryEntry ? {
          style_sample_patch_history: [
            ...asArray(writingBible?.style_sample_patch_history),
            patchHistoryEntry,
          ],
        } : {}),
        updated_at: new Date().toISOString(),
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          style_sample_bank: adjustmentBatch.style_sample_bank,
          writing_bible: nextWritingBible,
        },
      } as any)
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'writing_bible',
        step_name: 'style_sample_adjustment_batch',
        status: 'success',
        input_ref: JSON.stringify({ sample_keys: req.body?.sample_keys || req.body?.sampleKeys || [], dry_run: dryRun }),
        output_ref: JSON.stringify({
          changed: adjustmentBatch.changed,
          total_patch_count: adjustmentBatch.total_patch_count,
          changed_count: adjustmentBatch.changed_count,
          patch_hash: stableTextHash(adjustmentBatch.patch_json),
          patch_history_id: patchHistoryEntry?.patch_id,
        }),
      })
      res.json({
        ok: true,
        dry_run: false,
        changed: adjustmentBatch.changed,
        style_sample_patch_batch: adjustmentBatch,
        writing_bible: nextWritingBible,
        project: updated,
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/writing-bible/style-sample-adjustments/undo', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const writingBible = await ctx.getStoredOrBuiltWritingBible(activeWorkspace, project)
      const undo = undoLatestStyleSamplePatchHistory(writingBible)
      if (!undo.changed) {
        return res.json({
          ok: true,
          changed: false,
          writing_bible: writingBible,
          project,
          undone_patch: null,
        })
      }

      const nextWritingBible = {
        ...(undo.writing_bible || {}),
        updated_at: new Date().toISOString(),
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          style_sample_bank: nextWritingBible.style_sample_bank,
          writing_bible: nextWritingBible,
        },
      } as any)
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'writing_bible',
        step_name: 'style_sample_adjustment_undo',
        status: 'success',
        input_ref: JSON.stringify({ patch_id: undo.history_entry?.patch_id }),
        output_ref: JSON.stringify({
          changed: true,
          patch_id: undo.history_entry?.patch_id,
          sample_keys: undo.history_entry?.sample_keys || [],
          changed_count: undo.history_entry?.changed_count || 0,
        }),
      })
      res.json({
        ok: true,
        changed: true,
        writing_bible: nextWritingBible,
        project: updated,
        undone_patch: undo.history_entry,
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/writing-bible/style-sample-adjustments/post-apply-review', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [writingBible, chapters, reviews] = await Promise.all([
        ctx.getStoredOrBuiltWritingBible(activeWorkspace, project),
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const currentStyleSampleBank = asArray(writingBible?.style_sample_bank).length
        ? asArray(writingBible.style_sample_bank)
        : asArray(project.reference_config?.style_sample_bank)
      const styleSampleEffectiveness = buildStyleSampleEffectivenessReport(currentStyleSampleBank, chapters, reviews)
      const history = asArray(writingBible?.style_sample_patch_history)
      const latestPatch = history.slice().reverse().find((entry: any) => !entry?.undone) || history[history.length - 1] || null
      const chapterId = Number(req.body?.chapter_id || req.body?.chapterId || 0)
      const chapterNo = Number(req.body?.chapter_no || req.body?.chapterNo || 0)
      const chapter = asArray(chapters).find((item: any) => (
        (chapterId > 0 && Number(item?.id || 0) === chapterId)
        || (chapterNo > 0 && Number(item?.chapter_no || 0) === chapterNo)
      ))
      const requestContextPackage = req.body?.context_package || req.body?.contextPackage || {}
      const nextStyleSampleStrategy = req.body?.next_style_sample_strategy
        || req.body?.nextStyleSampleStrategy
        || req.body?.style_sample_strategy
        || requestContextPackage?.pre_draft_brief?.style_sample_strategy
        || requestContextPackage?.chapter_target?.style_sample_strategy
        || chapterStyleSampleStrategy(chapter)
        || {}
      const patchedSampleKeys = uniqueStyleTexts([
        ...asArray(req.body?.patched_sample_keys || req.body?.patchedSampleKeys || req.body?.sample_keys || req.body?.sampleKeys),
        ...asArray(latestPatch?.sample_keys || latestPatch?.sampleKeys),
      ])
      const styleSamplePatchReview = buildStyleSamplePatchPostApplyReview(styleSampleEffectiveness, {
        patched_sample_keys: patchedSampleKeys,
        next_style_sample_strategy: nextStyleSampleStrategy,
      })
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'writing_bible',
        step_name: 'style_sample_adjustment_post_apply_review',
        status: 'success',
        input_ref: JSON.stringify({
          patch_id: latestPatch?.patch_id || null,
          sample_keys: patchedSampleKeys,
          chapter_id: chapterId || chapter?.id || null,
          chapter_no: chapterNo || chapter?.chapter_no || null,
        }),
        output_ref: JSON.stringify({
          status: styleSamplePatchReview.status,
          still_risky_sample_keys: styleSamplePatchReview.still_risky_sample_keys,
          next_task_selected_sample_keys: styleSamplePatchReview.next_task_selected_sample_keys,
          next_task_selects_repatched_risky_sample: styleSamplePatchReview.next_task_selects_repatched_risky_sample,
        }),
      })
      res.json({
        ok: true,
        style_sample_patch_review: styleSamplePatchReview,
        style_sample_effectiveness: styleSampleEffectiveness,
        report: styleSampleEffectiveness,
      })
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
