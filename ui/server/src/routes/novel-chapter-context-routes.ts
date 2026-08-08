import type { Express } from 'express'
import {
  createNovelCharacter,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelWorldbuilding,
  updateNovelChapter,
  updateNovelCharacter,
} from '../novel'
import { executeNovelAgent } from '../llm'
import type { ChapterAuthorityFence } from '../novel-writing-service/generation-source/create-generation-source'
import {
  resolveChapterGenerationSource,
} from '../novel-writing-service/generation-source/source-config'
import { asArray, getNovelPayload } from './novel-route-utils'
import { applyStyleSampleStrategyAuthorAction, buildChapterPreDraftBrief } from './novel-writing-service'
import {
  projectChapterAuthorityRouteError,
  resolveChapterAuthorityRequestFingerprint,
} from './chapter-authority-route-fence'
import {
  normalizeMaterialRepairKeysFromBody,
  projectMaterialRepairRouteError,
} from './novel-chapter-context-material-repair-route'

type ChapterContextRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  buildChapterContextPackage: (
    workspace: string,
    project: any,
    chapter: any,
    chapters: any[],
    worldbuilding: any[],
    characters: any[],
    outlines: any[],
    reviews: any[],
  ) => Promise<any>
  repairChapterMaterials: (input: {
    activeWorkspace: string
    projectId: number
    chapterId: number
    expectedAuthorityFingerprint: string
    repairKeys?: string[]
    signal?: AbortSignal
  }) => Promise<any>
  withChapterAuthorityFence: ChapterAuthorityFence
  executeNovelAgent?: typeof executeNovelAgent
}

import {
  buildFallbackGeneratedCharacters,
  buildMaterialRepairPlan,
  buildMaterialScore,
  compactContextText,
  fallbackForbiddenRepeats,
  loadChapterContext,
  normalizeGeneratedCharacter,
} from './novel-chapter-context-helpers'

export {
  buildFallbackGeneratedCharacters,
  buildMaterialScore,
} from './novel-chapter-context-helpers'

export function registerNovelChapterContextRoutes(app: Express, ctx: ChapterContextRoutesContext) {
  const runNovelAgent = ctx.executeNovelAgent || executeNovelAgent
  app.get('/api/novel/chapters/:chapterId/preflight', async (req, res) => {
    try {
      const loaded = await loadChapterContext(ctx, Number(req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      res.json({ ok: loaded.contextPackage.preflight.ready, context_package: loaded.contextPackage, preflight: loaded.contextPackage.preflight })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/chapters/:chapterId/generation-diagnostics', async (req, res) => {
    try {
      const loaded = await loadChapterContext(ctx, Number(req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      const preflight = loaded.contextPackage.preflight
      const readinessScore = Math.round((preflight.checks.filter((item: any) => item.ok).length / Math.max(1, preflight.checks.length)) * 100)
      const materialScore = buildMaterialScore(loaded.contextPackage)
      res.json({
        ok: preflight.ready,
        readiness_score: readinessScore,
        material_score: materialScore,
        preflight,
        context_package: loaded.contextPackage,
        writing_bible: loaded.contextPackage.writing_bible,
        story_state: loaded.contextPackage.story_state,
        recommendations: materialScore.recommendations.length
          ? materialScore.recommendations
          : preflight.checks.filter((item: any) => !item.ok).map((item: any) => item.fix || `${item.label}不足`),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/chapters/:chapterId/material-score', async (req, res) => {
    try {
      const loaded = await loadChapterContext(ctx, Number(req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      res.json({ ok: true, material_score: buildMaterialScore(loaded.contextPackage), preflight: loaded.contextPackage.preflight })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/auto-repair-context', async (req, res) => {
    let sourceDispatchBoundary: 'legacy' | 'resolving' | 'mcp' = 'legacy'
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id || req.query.project_id || 0)
      const chapterId = Number(req.params.chapterId)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      sourceDispatchBoundary = 'resolving'
      const chapterGenerationSource = resolveChapterGenerationSource(project)
      const expectedAuthorityFingerprint = resolveChapterAuthorityRequestFingerprint(req, project)
      if (chapterGenerationSource.active === 'mcp') {
        sourceDispatchBoundary = 'mcp'
        const result = await ctx.repairChapterMaterials({
          activeWorkspace,
          projectId,
          chapterId,
          expectedAuthorityFingerprint,
          repairKeys: normalizeMaterialRepairKeysFromBody(req.body),
        })
        return res.json({
          ...result,
          material_score: buildMaterialScore(result.context_package),
        })
      }
      sourceDispatchBoundary = 'legacy'
      const outcome: { status?: number; body: any } = await ctx.withChapterAuthorityFence({
        activeWorkspace,
        projectId,
        expectedAuthorityFingerprint,
        operation: async () => {
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, projectId),
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
      ])
      const chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return { status: 404, body: { error: 'chapter not found' } }
      const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      const checks = Array.isArray(contextPackage?.preflight?.checks) ? contextPackage.preflight.checks : []
      const missingKeys = checks.filter((item: any) => !item.ok).map((item: any) => item.key)
      const needsCharacters = missingKeys.includes('characters') || characters.length === 0
      const needsCharacterState = missingKeys.includes('character_state')
      const needsForbiddenRepeats = missingKeys.includes('no_repeat') || !asArray(chapter.raw_payload?.forbidden_repeats).length
      if (!needsCharacters && !needsCharacterState && !needsForbiddenRepeats) {
        return { body: { ok: true, applied: [], skipped: true, context_package: contextPackage } }
      }

      let payload: any = {}
      let repairError = ''
      const modelId = req.body?.model_id ? String(req.body.model_id) : ''
      if (modelId && (needsCharacters || needsCharacterState)) {
        const prompt = [
          '任务：为当前小说章节自动补齐生成前上下文材料。只输出 JSON。',
          '只补材料，不生成正文。优先解决：角色卡不足、角色当前状态不足、禁止重复信息不足。',
          '输出字段：',
          '{',
          '  "characters": [{"name","role_type","archetype","age","gender","identity","faction","appearance","personality":[],"abilities":[],"items":[],"knowledge_scope":[],"information_boundaries":[],"motivation","goal","conflict","backstory","secret","relationships":[],"growth_arc","current_state":{}}],',
          '  "character_updates": [{"name","current_state":{}}],',
          '  "forbidden_repeats": ["本章禁止重复解释的信息"],',
          '  "must_advance": ["本章必须推进的剧情点"],',
          '  "repair_summary": "补齐说明"',
          '}',
          '角色 current_state 要尽量结构化，包含 location, physical_condition, emotional_state, items, knowledge_scope, information_boundaries, ability_status, relationship_attitudes, last_seen_chapter 等可由材料确定的字段。',
          '要求：角色卡只创建对当前章和后续 5 章有用的主要/关键角色；不要编造与项目核心冲突相违背的人设；禁止重复信息要具体到本章写作可执行。',
          '【项目】',
          JSON.stringify({
            title: project.title,
            genre: project.genre,
            synopsis: project.synopsis,
            style_tags: project.style_tags,
          }, null, 2),
          '【当前章】',
          JSON.stringify({
            chapter_no: chapter.chapter_no,
            title: chapter.title,
            goal: chapter.chapter_goal,
            summary: chapter.chapter_summary,
            conflict: chapter.conflict,
            ending_hook: chapter.ending_hook,
            must_advance: chapter.raw_payload?.must_advance || [],
            forbidden_repeats: chapter.raw_payload?.forbidden_repeats || [],
          }, null, 2),
          '【已有角色】',
          JSON.stringify(characters.slice(0, 20).map(char => ({
            name: char.name,
            role: char.role_type || char.role,
            archetype: char.archetype,
            appearance: char.appearance,
            abilities: char.abilities,
            motivation: char.motivation,
            goal: char.goal,
            conflict: char.conflict,
            current_state: char.current_state || {},
            profile: char.raw_payload?.profile || {},
          })), null, 2),
          '【世界观/大纲/近期章节】',
          JSON.stringify({
            worldbuilding: worldbuilding.slice(0, 2).map(item => ({
              world_summary: compactContextText(item.world_summary, 500),
              rules: asArray(item.rules).slice(0, 8),
              timeline_anchor: item.timeline_anchor || '',
            })),
            outlines: outlines.slice(0, 15).map(item => ({ type: item.outline_type, title: item.title, summary: compactContextText(item.summary, 400), hook: item.hook })),
            recent_chapters: chapters
              .filter(item => item.chapter_no <= chapter.chapter_no)
              .slice(-3)
              .map(item => ({ chapter_no: item.chapter_no, title: item.title, summary: item.chapter_summary, ending_hook: item.ending_hook, excerpt: compactContextText(item.chapter_text, 260) })),
            story_state: contextPackage.story_state?.global || {},
            preflight_warnings: contextPackage.preflight?.warnings || [],
          }, null, 2).slice(0, 6500),
        ].join('\n')
        try {
          const result = await runNovelAgent('outline-agent', project, { task: prompt }, {
            activeWorkspace,
            modelId,
            maxTokens: 2200,
            temperature: 0.35,
            responseMode: 'stream',
            skipMemory: true,
          })
          if ((result as any).error) {
            repairError = String((result as any).error || '上下文补齐模型调用失败')
          } else {
            payload = getNovelPayload(result)
          }
        } catch (error) {
          repairError = String(error || '上下文补齐模型调用失败')
        }
        if (repairError) {
          payload = {
            characters: [],
            character_updates: [],
            forbidden_repeats: fallbackForbiddenRepeats(project, chapter, contextPackage),
            must_advance: asArray(chapter.raw_payload?.must_advance),
            repair_summary: `模型补齐失败，已降级为本地可推断补齐：${repairError.slice(0, 240)}`,
          }
        }
      } else {
        payload = {
          characters: [],
          character_updates: [],
          forbidden_repeats: fallbackForbiddenRepeats(project, chapter, contextPackage),
          must_advance: asArray(chapter.raw_payload?.must_advance),
          repair_summary: modelId ? '当前缺口无需调用模型，仅执行本地可推断补齐。' : '未指定模型，仅执行本地可推断补齐。',
        }
      }

      const applied: any[] = []
      const existingByName = new Map(characters.map(char => [String(char.name || '').trim(), char]).filter(([name]) => Boolean(name)) as any)
      if (needsCharacters) {
        let characterCandidates = asArray(payload.characters)
          .map(normalizeGeneratedCharacter)
          .filter((item: any) => item.name && !existingByName.has(item.name))
        if (characterCandidates.length === 0) {
          characterCandidates = buildFallbackGeneratedCharacters(project, chapter, contextPackage)
            .map(normalizeGeneratedCharacter)
            .filter((item: any) => item.name && !existingByName.has(item.name))
          payload.characters = [
            ...asArray(payload.characters),
            ...characterCandidates.map((item: any) => ({ ...item.raw_payload, ...item })),
          ]
          payload.repair_summary = [
            payload.repair_summary,
            '模型未返回可入库角色卡，已创建本地兜底主角卡。',
          ].filter(Boolean).join('；')
        }
        for (const normalized of characterCandidates.slice(0, 8)) {
          const created = await createNovelCharacter(activeWorkspace, {
            project_id: projectId,
            ...normalized,
            status: 'active',
          } as any)
          existingByName.set(created.name, created)
          applied.push({ type: 'character_created', id: created.id, name: created.name })
        }
      }
      if (needsCharacterState) {
        for (const raw of asArray(payload.character_updates).slice(0, 12)) {
          const name = String(raw?.name || '').trim()
          const current = existingByName.get(name)
          if (!name || !current || !raw?.current_state || typeof raw.current_state !== 'object') continue
          const updated = await updateNovelCharacter(activeWorkspace, current.id, {
            current_state: {
              ...(current.current_state || {}),
              ...(raw.current_state || {}),
              last_seen_chapter: chapter.chapter_no,
            },
          } as any)
          if (updated) applied.push({ type: 'character_state_updated', id: updated.id, name: updated.name })
        }
      }
      const nextForbiddenRepeats = [
        ...asArray(chapter.raw_payload?.forbidden_repeats),
        ...asArray(payload.forbidden_repeats),
        ...fallbackForbiddenRepeats(project, chapter, contextPackage),
      ].map((item: any) => String(item || '').trim()).filter(Boolean)
      const nextMustAdvance = [
        ...asArray(chapter.raw_payload?.must_advance),
        ...asArray(payload.must_advance),
      ].map((item: any) => String(item || '').trim()).filter(Boolean)
      if (needsForbiddenRepeats || nextMustAdvance.length !== asArray(chapter.raw_payload?.must_advance).length) {
        const uniqueForbidden = [...new Set(nextForbiddenRepeats)].slice(0, 12)
        const uniqueAdvance = [...new Set(nextMustAdvance)].slice(0, 12)
        const updated = await updateNovelChapter(activeWorkspace, chapter.id, {
          raw_payload: {
            ...(chapter.raw_payload || {}),
            forbidden_repeats: uniqueForbidden,
            must_advance: uniqueAdvance,
            context_auto_repair_summary: payload.repair_summary || '',
            context_auto_repaired_at: new Date().toISOString(),
          },
        } as any, { createVersion: false })
        applied.push({ type: 'chapter_context_updated', chapter_id: chapter.id, forbidden_repeats: uniqueForbidden.length, must_advance: uniqueAdvance.length })
        Object.assign(chapter, updated || chapter)
      }
      const refreshed = await loadChapterContext(ctx, projectId, chapter.id)
      return { body: {
        ok: true,
        applied,
        payload,
        warnings: repairError ? [`上下文补齐模型调用失败，已降级处理并允许继续生成：${repairError.slice(0, 240)}`] : [],
        context_package: 'error' in refreshed ? null : refreshed.contextPackage,
        preflight: 'error' in refreshed ? null : refreshed.contextPackage.preflight,
        material_score: 'error' in refreshed ? null : buildMaterialScore(refreshed.contextPackage),
      } }
        },
      })
      if (outcome.status) return res.status(outcome.status).json(outcome.body)
      return res.json(outcome.body)
    } catch (error) {
      const authorityProjection = projectChapterAuthorityRouteError(error)
      if (authorityProjection) return res.status(authorityProjection.status).json(authorityProjection.body)
      if (sourceDispatchBoundary === 'legacy') {
        return res.status(500).json({ error: String(error) })
      }
      const projected = projectMaterialRepairRouteError(error)
      if (projected) return res.status(projected.status).json(projected.body)
      return res.status(500).json({ error: '材料补齐失败' })
    }
  })

  app.get('/api/novel/projects/:id/chapter-material-matrix', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.params.id)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, projectId),
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
      ])
      const limit = Math.max(1, Math.min(300, Number(req.query.limit || 120)))
      const unwrittenOnly = String(req.query.unwritten_only || '') === '1'
      const scopedChapters = chapters
        .filter(chapter => !unwrittenOnly || !chapter.chapter_text)
        .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
        .slice(0, limit)
      const rows = []
      for (const chapter of scopedChapters) {
        const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
        const materialScore = buildMaterialScore(contextPackage)
        rows.push({
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          status: chapter.status || '',
          word_count: String(chapter.chapter_text || '').replace(/\s/g, '').length,
          has_text: Boolean(chapter.chapter_text),
          material_score: materialScore,
          score: materialScore.score,
          level: materialScore.level,
          can_generate: materialScore.can_generate,
          blockers: materialScore.blockers,
          recommendations: materialScore.recommendations,
        })
      }
      const blocked = rows.filter(row => !row.can_generate)
      res.json({
        ok: true,
        rows,
        summary: {
          total: rows.length,
          ready: rows.filter(row => row.can_generate).length,
          blocked: blocked.length,
          average_score: rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.score || 0), 0) / rows.length) : 0,
          low_score: rows.filter(row => Number(row.score || 0) < 65).length,
        },
        weakest: [...rows].sort((a, b) => Number(a.score || 0) - Number(b.score || 0)).slice(0, 12),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/material-repair-plan', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.params.id)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, projectId),
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
      ])
      const limit = Math.max(1, Math.min(300, Number(req.query.limit || 120)))
      const startNo = Math.max(1, Number(req.query.start_chapter || 1))
      const unwrittenOnly = String(req.query.unwritten_only ?? '1') !== '0'
      const scopedChapters = chapters
        .filter(chapter => Number(chapter.chapter_no || 0) >= startNo)
        .filter(chapter => !unwrittenOnly || !chapter.chapter_text)
        .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
        .slice(0, limit)
      const rows = []
      for (const chapter of scopedChapters) {
        const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
        const materialScore = buildMaterialScore(contextPackage)
        rows.push({
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          has_text: Boolean(chapter.chapter_text),
          score: materialScore.score,
          can_generate: materialScore.can_generate,
          material_score: materialScore,
        })
      }
      const plan = buildMaterialRepairPlan(rows)
      res.json({
        ok: true,
        rows,
        plan,
        summary: {
          scanned: rows.length,
          ready: plan.ready_chapter_ids.length,
          blocked: plan.blocked_chapter_ids.length,
          average_score: rows.length ? Math.round(rows.reduce((sum, row) => sum + Number(row.score || 0), 0) / rows.length) : 0,
          bucket_count: plan.buckets.length,
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/chapters/:chapterId/context-package', async (req, res) => {
    try {
      const loaded = await loadChapterContext(ctx, Number(req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      res.json({ ok: true, context_package: loaded.contextPackage, override: loaded.chapter.raw_payload?.context_package_override || null })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/chapters/:chapterId/pre-draft-brief', async (req, res) => {
    try {
      const loaded = await loadChapterContext(ctx, Number(req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      const stored = loaded.chapter.raw_payload ? loaded.chapter.raw_payload.pre_draft_brief : null
      const brief = stored || buildChapterPreDraftBrief(loaded.project, loaded.contextPackage)
      res.json({ ok: true, brief, stored: Boolean(stored), confirmed: Boolean(brief?.confirmed_at), context_package: loaded.contextPackage })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/chapters/:chapterId/pre-draft-brief', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id || req.query.project_id || 0)
      const chapterId = Number(req.params.chapterId)
      const chapter = (await listNovelChapters(activeWorkspace, projectId)).find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const brief = req.body?.brief || req.body?.pre_draft_brief || {}
      const updated = await updateNovelChapter(activeWorkspace, chapterId, {
        raw_payload: {
          ...(chapter.raw_payload || {}),
          pre_draft_brief: {
            ...(chapter.raw_payload?.pre_draft_brief || {}),
            ...(brief || {}),
            updated_at: new Date().toISOString(),
          },
        },
      } as any, { createVersion: false })
      res.json({ ok: true, chapter: updated, brief: updated?.raw_payload?.pre_draft_brief || brief })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/pre-draft-brief/confirm', async (req, res) => {
    try {
      const loaded = await loadChapterContext(ctx, Number(req.body.project_id || req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      const existing = req.body?.brief || loaded.chapter.raw_payload?.pre_draft_brief || buildChapterPreDraftBrief(loaded.project, loaded.contextPackage)
      const brief = {
        ...(existing || {}),
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const updated = await updateNovelChapter(loaded.activeWorkspace, loaded.chapter.id, {
        raw_payload: {
          ...(loaded.chapter.raw_payload || {}),
          pre_draft_brief: brief,
        },
      } as any, { createVersion: false })
      const storedBrief = updated?.raw_payload?.pre_draft_brief || null
      res.json({ ok: true, chapter: updated, brief: storedBrief, confirmed: Boolean(storedBrief?.confirmed_at) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/pre-draft-brief/style-samples', async (req, res) => {
    try {
      const loaded = await loadChapterContext(ctx, Number(req.body.project_id || req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      const action = String(req.body?.action || 'lock').trim() || 'lock'
      const existing = loaded.chapter.raw_payload?.pre_draft_brief || buildChapterPreDraftBrief(loaded.project, loaded.contextPackage)
      const styleSampleStrategy = applyStyleSampleStrategyAuthorAction(
        loaded.project,
        loaded.contextPackage,
        existing?.style_sample_strategy || {},
        {
          action,
          sample_keys: req.body?.sample_keys || req.body?.sampleKeys || [],
        },
      )
      const brief = {
        ...(existing || {}),
        style_sample_strategy: styleSampleStrategy,
        updated_at: new Date().toISOString(),
      }
      if (action !== 'lock') {
        delete (brief as any).confirmed_at
      }
      const updated = await updateNovelChapter(loaded.activeWorkspace, loaded.chapter.id, {
        raw_payload: {
          ...(loaded.chapter.raw_payload || {}),
          pre_draft_brief: brief,
        },
      } as any, { createVersion: false })
      res.json({ ok: true, chapter: updated, brief, style_sample_strategy: styleSampleStrategy })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/chapters/:chapterId/context-package', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || req.query.project_id || 0)
      const chapter = (await listNovelChapters(activeWorkspace, projectId)).find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const override = req.body?.override || req.body?.context_package_override || {}
      const updated = await updateNovelChapter(activeWorkspace, chapterId, {
        raw_payload: {
          ...(chapter.raw_payload || {}),
          context_package_override: override,
          context_package_override_updated_at: new Date().toISOString(),
        },
      } as any, { createVersion: false })
      res.json({ ok: true, chapter: updated, override })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
