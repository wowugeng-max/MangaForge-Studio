import type { Express } from 'express'
import {
  appendNovelRun,
  createNovelChapter,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelWorldbuilding,
  updateNovelChapter,
  updateNovelRun,
} from '../../novel'
import { buildMaterialScore } from '../novel-chapter-context-routes'
import { asArray, buildLLMResultDiagnostics, compactText, getNovelPayload, normalizeSceneProduction, parseJsonLikePayload, safeJsonStringify } from '../novel-route-utils'
import { applyChapterWordTargetToContext, countProseChars, normalizeDeliveryRiskReceipts, resolveChapterWordTarget } from '../../novel-writing-service'
import { compactProseGenerationOverride } from '../../novel-writing/prose-generation-contract'
import type {
  GenerationRoutesContext,
} from './builders'
import {
  activeChapterNo,
  approvalBlockerRoutePayload,
  buildStandaloneProseServiceErrorPayload,
  buildStandaloneProseServiceOptions,
  collectMissingPlanningChapterNos,
  compactPlanningEnsureResult,
  compactStandaloneProseProgressStage,
  futureSkeletonFromOutline,
  isApprovalBlockerChapter,
  isLegacyQualityGateApproval,
  isTerminalAdmissionChapter,
  legacyQualityGateRoutePayload,
  outlineChapterNo,
  resolveChapterGroupQualityThreshold,
  scoreFutureSkeletonChapter,
  sseData,
  standaloneProseServiceErrorStatus,
  standaloneProseServiceStageDetail,
  standaloneProseServiceStageLabel,
  stringifyNovelGenerationPayload,
  terminalAdmissionRoutePayload,
} from './builders'

export function registerNovelGenerationChapterGroupStartRoutes(app: Express, ctx: GenerationRoutesContext) {
  app.post('/api/novel/projects/:id/chapter-groups/start', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const chapters = await listNovelChapters(activeWorkspace, project.id)
      const startNo = Number(req.body.start_chapter || chapters.find(ch => !ch.chapter_text)?.chapter_no || 1)
      const count = Math.max(1, Math.min(50, Number(req.body.count || 10)))
      const selected = chapters.filter(ch => ch.chapter_no >= startNo && ch.chapter_no < startNo + count)
      const modelStrategy = project.reference_config?.model_strategy || ctx.getModelStrategy(project, Number(req.body.model_id || 0) || undefined)
      const approvalPolicy = project.reference_config?.approval_policy || ctx.getApprovalPolicy(project)
      const configSnapshot = ctx.buildAgentConfigSnapshot(project, Number(req.body.model_id || 0) || undefined)
      const output = {
        chapter_ids: selected.map(ch => ch.id),
        chapters: selected.map(ch => ({
          id: ch.id,
          chapter_no: ch.chapter_no,
          title: ch.title,
          status: ch.chapter_text ? 'written' : 'pending',
          scenes: normalizeSceneProduction(asArray(ch.scene_breakdown).length ? ch.scene_breakdown : asArray(ch.scene_list), [], ch.chapter_text ? 'accepted' : 'pending'),
          stages: ctx.buildChapterGroupStages(),
        })),
        current_index: 0,
        mode: req.body.mode || 'group',
        production_mode: req.body.production_mode || 'draft_review_revise_store',
        model_strategy: modelStrategy,
        approval_policy: approvalPolicy,
        config_snapshot: configSnapshot,
        policy: {
          stop_on_failure: req.body.stop_on_failure !== false,
          require_scene_confirmation: req.body.require_scene_confirmation ?? approvalPolicy.require_scene_card_approval,
          quality_threshold: resolveChapterGroupQualityThreshold(req.body, project),
          production_mode: req.body.production_mode || 'draft_review_revise_store',
        },
      }
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'chapter_group_generation',
        step_name: `chapter-${startNo}-${startNo + count - 1}`,
        status: 'ready',
        input_ref: stringifyNovelGenerationPayload(req.body || {}),
        output_ref: stringifyNovelGenerationPayload(output),
      })
      res.json({ ok: true, run, group: output })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/start-ready', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelWorldbuilding(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const startNo = Number(req.body.start_chapter || chapters.find(ch => !ch.chapter_text)?.chapter_no || 1)
      const scanLimit = Math.max(1, Math.min(120, Number(req.body.scan_limit || 40)))
      const count = Math.max(1, Math.min(50, Number(req.body.count || 10)))
      const minScore = Math.max(0, Math.min(100, Number(req.body.min_score || 65)))
      const candidates = chapters
        .filter(chapter => Number(chapter.chapter_no || 0) >= startNo)
        .filter(chapter => req.body.include_written ? true : !chapter.chapter_text)
        .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
        .slice(0, scanLimit)
      const ready = []
      const skipped = []
      for (const chapter of candidates) {
        const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
        const materialScore = buildMaterialScore(contextPackage)
        const row = {
          id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          score: materialScore.score,
          can_generate: materialScore.can_generate && Number(materialScore.score || 0) >= minScore,
          blockers: materialScore.blockers,
          recommendations: materialScore.recommendations,
        }
        if (row.can_generate && ready.length < count) ready.push({ chapter, materialScore })
        else skipped.push(row)
      }
      if (ready.length === 0) {
        return res.status(409).json({
          error: '没有找到材料达标的待生成章节',
          error_code: 'NO_READY_CHAPTERS',
          min_score: minScore,
          scanned: candidates.length,
          skipped,
        })
      }
      const selected = ready.map(item => item.chapter)
      const modelStrategy = project.reference_config?.model_strategy || ctx.getModelStrategy(project, Number(req.body.model_id || 0) || undefined)
      const approvalPolicy = project.reference_config?.approval_policy || ctx.getApprovalPolicy(project)
      const output = {
        chapter_ids: selected.map(ch => ch.id),
        chapters: ready.map(({ chapter, materialScore }) => ({
          id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          status: chapter.chapter_text ? 'written' : 'pending',
          material_score: materialScore.score,
          scenes: normalizeSceneProduction(asArray(chapter.scene_breakdown).length ? chapter.scene_breakdown : asArray(chapter.scene_list), [], chapter.chapter_text ? 'accepted' : 'pending'),
          stages: ctx.buildChapterGroupStages(),
        })),
        skipped_chapters: skipped,
        current_index: 0,
        mode: 'ready_matrix',
        production_mode: req.body.production_mode || 'draft_review_revise_store',
        model_strategy: modelStrategy,
        approval_policy: approvalPolicy,
        policy: {
          stop_on_failure: req.body.stop_on_failure !== false,
          require_scene_confirmation: req.body.require_scene_confirmation ?? approvalPolicy.require_scene_card_approval,
          quality_threshold: resolveChapterGroupQualityThreshold(req.body, project),
          min_material_score: minScore,
          production_mode: req.body.production_mode || 'draft_review_revise_store',
        },
      }
      const firstNo = selected[0]?.chapter_no || startNo
      const lastNo = selected[selected.length - 1]?.chapter_no || firstNo
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'chapter_group_generation',
        step_name: `ready-chapter-${firstNo}-${lastNo}`,
        status: 'ready',
        input_ref: stringifyNovelGenerationPayload(req.body || {}),
        output_ref: stringifyNovelGenerationPayload(output),
      })
      res.json({
        ok: true,
        run,
        group: output,
        summary: {
          scanned: candidates.length,
          queued: selected.length,
          skipped: skipped.length,
          min_score: minScore,
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/start-from-skeleton', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
      ])
      const startNo = Number(req.body.start_chapter || chapters.find(ch => !ch.chapter_text)?.chapter_no || 1)
      const scanLimit = Math.max(1, Math.min(120, Number(req.body.scan_limit || 100)))
      const count = Math.max(1, Math.min(50, Number(req.body.count || 10)))
      const minScore = Math.max(0, Math.min(100, Number(req.body.min_score || 70)))
      const createMissing = req.body.create_missing !== false
      const syncChapterFields = req.body.sync_chapter_fields !== false
      const chapterByNo = new Map(chapters.map(chapter => [Number(chapter.chapter_no || 0), chapter]))
      const skeletonRows = outlines
        .filter(outline => String(outline.outline_type || '') === 'chapter' && (outline.raw_payload?.source === 'future_100_skeleton' || outline.raw_payload?.future100))
        .map(outline => ({ outline, skeleton: futureSkeletonFromOutline(outline) }))
        .filter(row => Number(row.skeleton.chapter_no || 0) >= startNo)
        .sort((a, b) => Number(a.skeleton.chapter_no || 0) - Number(b.skeleton.chapter_no || 0))
        .slice(0, scanLimit)
      const ready: any[] = []
      const skipped: any[] = []
      const createdChapters: any[] = []
      const updatedChapters: any[] = []
      for (const row of skeletonRows) {
        const skeletonScore = scoreFutureSkeletonChapter(row.skeleton)
        const existing = chapterByNo.get(Number(row.skeleton.chapter_no || 0))
        const baseChapter = existing || (createMissing && !req.body.dry_run ? await createNovelChapter(activeWorkspace, {
          project_id: project.id,
          outline_id: row.outline.id,
          chapter_no: row.skeleton.chapter_no,
          title: row.skeleton.title || row.outline.title,
          chapter_goal: row.skeleton.chapter_goal,
          chapter_summary: [row.skeleton.conflict, row.skeleton.payoff, row.skeleton.commercial_purpose].filter(Boolean).join('；'),
          ending_hook: row.skeleton.ending_hook,
          status: 'draft',
          raw_payload: { source: 'future_100_skeleton_group', future100: row.skeleton },
        } as any) : existing)
        if (baseChapter && !existing) {
          createdChapters.push(baseChapter)
          chapterByNo.set(Number(baseChapter.chapter_no || 0), baseChapter)
        }
        let chapter = baseChapter
        if (chapter && syncChapterFields && !req.body.dry_run) {
          const patch: any = {
            outline_id: chapter.outline_id || row.outline.id,
            title: chapter.title || row.skeleton.title || row.outline.title,
            chapter_goal: chapter.chapter_goal || row.skeleton.chapter_goal,
            chapter_summary: chapter.chapter_summary || [row.skeleton.conflict, row.skeleton.payoff, row.skeleton.commercial_purpose].filter(Boolean).join('；'),
            ending_hook: chapter.ending_hook || row.skeleton.ending_hook,
            raw_payload: { ...(chapter.raw_payload || {}), future100_source_outline_id: row.outline.id },
          }
          const updated = await updateNovelChapter(activeWorkspace, chapter.id, patch, { createVersion: false })
          if (updated) {
            chapter = updated
            updatedChapters.push(updated)
          }
        }
        const canGenerate = Boolean(chapter) && (req.body.include_written ? true : !chapter.chapter_text) && skeletonScore >= minScore
        const candidate = {
          outline_id: row.outline.id,
          chapter_id: chapter?.id || null,
          chapter_no: row.skeleton.chapter_no,
          title: chapter?.title || row.skeleton.title,
          skeleton_score: skeletonScore,
          can_generate: canGenerate,
          blockers: [
            !chapter ? '缺章节记录' : '',
            chapter?.chapter_text && !req.body.include_written ? '已有正文' : '',
            skeletonScore < minScore ? `骨架分 ${skeletonScore} 低于阈值 ${minScore}` : '',
          ].filter(Boolean),
        }
        if (canGenerate && ready.length < count) ready.push({ chapter, skeletonScore, outline: row.outline })
        else skipped.push(candidate)
      }
      if (req.body.dry_run === true) {
        return res.json({
          ok: true,
          dry_run: true,
          candidates: skeletonRows.length,
          ready: ready.map(item => ({ chapter_id: item.chapter?.id || null, chapter_no: item.chapter?.chapter_no, title: item.chapter?.title, skeleton_score: item.skeletonScore })),
          skipped,
          summary: { scanned: skeletonRows.length, queued: ready.length, skipped: skipped.length, created: 0, updated: 0, min_score: minScore },
        })
      }
      if (ready.length === 0) {
        return res.status(409).json({
          error: '没有找到可从未来100章骨架入队的章节',
          error_code: 'NO_READY_SKELETON_CHAPTERS',
          min_score: minScore,
          scanned: skeletonRows.length,
          skipped,
        })
      }
      const selected = ready.map(item => item.chapter)
      const modelStrategy = project.reference_config?.model_strategy || ctx.getModelStrategy(project, Number(req.body.model_id || 0) || undefined)
      const approvalPolicy = project.reference_config?.approval_policy || ctx.getApprovalPolicy(project)
      const output = {
        chapter_ids: selected.map(ch => ch.id),
        chapters: ready.map(({ chapter, skeletonScore }) => ({
          id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          status: chapter.chapter_text ? 'written' : 'pending',
          material_score: skeletonScore,
          skeleton_score: skeletonScore,
          scenes: normalizeSceneProduction(asArray(chapter.scene_breakdown).length ? chapter.scene_breakdown : asArray(chapter.scene_list), [], chapter.chapter_text ? 'accepted' : 'pending'),
          stages: ctx.buildChapterGroupStages(),
        })),
        skipped_chapters: skipped,
        created_chapters: createdChapters.map(chapter => ({ id: chapter.id, chapter_no: chapter.chapter_no, title: chapter.title })),
        updated_chapters: updatedChapters.map(chapter => ({ id: chapter.id, chapter_no: chapter.chapter_no, title: chapter.title })),
        current_index: 0,
        mode: 'future100_skeleton',
        production_mode: req.body.production_mode || 'draft_review_revise_store',
        model_strategy: modelStrategy,
        approval_policy: approvalPolicy,
        policy: {
          stop_on_failure: req.body.stop_on_failure !== false,
          require_scene_confirmation: req.body.require_scene_confirmation ?? approvalPolicy.require_scene_card_approval,
          quality_threshold: resolveChapterGroupQualityThreshold(req.body, project),
          min_skeleton_score: minScore,
          production_mode: req.body.production_mode || 'draft_review_revise_store',
        },
      }
      const firstNo = selected[0]?.chapter_no || startNo
      const lastNo = selected[selected.length - 1]?.chapter_no || firstNo
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'chapter_group_generation',
        step_name: `future100-chapter-${firstNo}-${lastNo}`,
        status: 'ready',
        input_ref: stringifyNovelGenerationPayload(req.body || {}),
        output_ref: stringifyNovelGenerationPayload(output),
      })
      res.json({
        ok: true,
        run,
        group: output,
        summary: {
          scanned: skeletonRows.length,
          queued: selected.length,
          skipped: skipped.length,
          created: createdChapters.length,
          updated: updatedChapters.length,
          min_score: minScore,
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

}
