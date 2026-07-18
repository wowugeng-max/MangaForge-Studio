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
import { applyChapterWordTargetToContext, countProseChars, normalizeDeliveryRiskReceipts, resolveChapterWordTarget } from '../novel-writing-service'
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

export function registerNovelGenerationChapterGroupRoutes(app: Express, ctx: GenerationRoutesContext) {
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

  app.post('/api/novel/projects/:id/chapter-groups/start-unattended', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      let chapters = await listNovelChapters(activeWorkspace, project.id)
      let outlines = await listNovelOutlines(activeWorkspace, project.id)
      const firstUnwritten = chapters.find(chapter => !chapter.chapter_text)
      const startNo = Math.max(1, Number(req.body.start_chapter || firstUnwritten?.chapter_no || activeChapterNo(chapters) + 1 || 1))
      const rawTargetNo = Number(req.body.target_chapter || req.body.target_chapter_no || 0)
      if (!rawTargetNo) return res.status(400).json({ error: 'target_chapter required' })
      if (rawTargetNo < startNo) return res.status(400).json({ error: 'target_chapter must be greater than or equal to start_chapter', error_code: 'UNATTENDED_TARGET_BEFORE_START', start_chapter: startNo, target_chapter: rawTargetNo })
      const targetNo = rawTargetNo
      const maxRange = Math.max(1, Math.min(80, Number(req.body.max_chapters || 50)))
      if (targetNo - startNo + 1 > maxRange) {
        return res.status(400).json({ error: `无人值守单次最多 ${maxRange} 章，请缩小目标范围`, error_code: 'UNATTENDED_RANGE_TOO_LARGE', start_chapter: startNo, target_chapter: targetNo, max_chapters: maxRange })
      }
      const createMissing = req.body.create_missing !== false
      const syncChapterFields = req.body.sync_chapter_fields !== false
      const includeWritten = req.body.include_written === true
      let chapterByNo = new Map(chapters.map(chapter => [Number(chapter.chapter_no || 0), chapter]))
      let outlinesByChapterNo = new Map(outlines
        .filter(outline => String(outline.outline_type || '') === 'chapter')
        .map(outline => [outlineChapterNo(outline), outline])
        .filter(([chapterNo]) => Number(chapterNo || 0) > 0) as Array<[number, any]>)
      const rebuildPlanningMaps = () => {
        chapterByNo = new Map(chapters.map(chapter => [Number(chapter.chapter_no || 0), chapter]))
        outlinesByChapterNo = new Map(outlines
          .filter(outline => String(outline.outline_type || '') === 'chapter')
          .map(outline => [outlineChapterNo(outline), outline])
          .filter(([chapterNo]) => Number(chapterNo || 0) > 0) as Array<[number, any]>)
      }
      let planningPreflight: any = {
        enabled: req.body.auto_plan_missing !== false,
        status: 'skipped',
        missing_chapter_nos: [],
      }
      if (req.body.auto_plan_missing !== false) {
        const missingPlanningNos = collectMissingPlanningChapterNos(startNo, targetNo, chapterByNo, outlinesByChapterNo)
        planningPreflight = {
          enabled: true,
          status: missingPlanningNos.length ? 'missing' : 'ready',
          missing_chapter_nos: missingPlanningNos,
        }
        if (missingPlanningNos.length > 0 && ctx.ensureChapterPlanningForRange) {
          try {
            const ensureResult = await ctx.ensureChapterPlanningForRange(activeWorkspace, project, {
              start_chapter: startNo,
              target_chapter: targetNo,
              chapter_count: targetNo - startNo + 1,
              continue_from: startNo > 1 ? startNo - 1 : 0,
              model_id: Number(req.body.model_id || 0) || undefined,
              missing_chapter_nos: missingPlanningNos,
              user_outline: req.body.user_outline || req.body.prompt || '',
              source: 'start-unattended',
            })
            chapters = await listNovelChapters(activeWorkspace, project.id)
            outlines = await listNovelOutlines(activeWorkspace, project.id)
            rebuildPlanningMaps()
            const remainingMissingNos = collectMissingPlanningChapterNos(startNo, targetNo, chapterByNo, outlinesByChapterNo)
            planningPreflight = {
              enabled: true,
              status: remainingMissingNos.length ? 'warn' : 'success',
              missing_chapter_nos: missingPlanningNos,
              remaining_missing_chapter_nos: remainingMissingNos,
              result: compactPlanningEnsureResult(ensureResult),
            }
          } catch (planningError) {
            chapters = await listNovelChapters(activeWorkspace, project.id)
            outlines = await listNovelOutlines(activeWorkspace, project.id)
            rebuildPlanningMaps()
            planningPreflight = {
              enabled: true,
              status: 'failed',
              missing_chapter_nos: missingPlanningNos,
              error: String(planningError).slice(0, 300),
            }
          }
        } else if (missingPlanningNos.length > 0) {
          planningPreflight = {
            ...planningPreflight,
            status: 'skipped_no_ensure_hook',
          }
        }
      }
      const strictPlanningPreflight = req.body.allow_planning_fallback !== true
      const planningStillMissing = asArray(planningPreflight.remaining_missing_chapter_nos).length > 0
        || (planningPreflight.status === 'failed' && asArray(planningPreflight.missing_chapter_nos).length > 0)
      if (strictPlanningPreflight && ['failed', 'warn'].includes(String(planningPreflight.status || '')) && planningStillMissing) {
        return res.status(424).json({
          error: '无人值守章节规划补齐失败，已停止入队，避免使用浅层兜底规划继续生成。',
          error_code: 'UNATTENDED_PLANNING_PREFLIGHT_FAILED',
          start_chapter: startNo,
          target_chapter: targetNo,
          planning_preflight: planningPreflight,
          recovery_plan: {
            type: 'planning_preflight_failed',
            summary: '自动写作前置规划没有补齐，不能继续创建正文队列。',
            actions: ['检查模型和 Key 是否可用', '缩小目标章节范围后重试', '先在章节规划面板生成大纲/细纲，再重新启动无人值守'],
          },
        })
      }
      const createdChapters: any[] = []
      const updatedChapters: any[] = []
      const skipped: any[] = []
      const selected: any[] = []

      for (let chapterNo = startNo; chapterNo <= targetNo; chapterNo += 1) {
        const outline = outlinesByChapterNo.get(chapterNo)
        const skeleton = outline ? futureSkeletonFromOutline(outline) : null
        let chapter = chapterByNo.get(chapterNo)
        if (!chapter && createMissing) {
          chapter = await createNovelChapter(activeWorkspace, {
            project_id: project.id,
            outline_id: outline?.id || null,
            chapter_no: chapterNo,
            title: skeleton?.title || outline?.title || `第${chapterNo}章`,
            chapter_goal: skeleton?.chapter_goal || outline?.summary || `承接前文推进第${chapterNo}章核心冲突，并为下一章留下钩子。`,
            chapter_summary: [skeleton?.conflict, skeleton?.payoff, skeleton?.commercial_purpose].filter(Boolean).join('；') || outline?.summary || '',
            conflict: skeleton?.conflict || asArray(outline?.conflict_points)[0] || '',
            ending_hook: skeleton?.ending_hook || outline?.hook || '',
            status: 'draft',
            raw_payload: {
              source: 'unattended_goal',
              unattended_goal: {
                target_chapter: targetNo,
                created_by: 'start-unattended',
                needs_agent_completion: !outline,
              },
              ...(skeleton ? { future100: skeleton } : {}),
            },
          } as any)
          chapterByNo.set(chapterNo, chapter)
          createdChapters.push(chapter)
        }
        if (chapter && syncChapterFields && outline) {
          const patch: any = {
            outline_id: chapter.outline_id || outline.id,
            title: chapter.title || skeleton?.title || outline.title,
            chapter_goal: chapter.chapter_goal || skeleton?.chapter_goal || outline.summary || '',
            chapter_summary: chapter.chapter_summary || [skeleton?.conflict, skeleton?.payoff, skeleton?.commercial_purpose].filter(Boolean).join('；') || outline.summary || '',
            conflict: chapter.conflict || skeleton?.conflict || asArray(outline.conflict_points)[0] || '',
            ending_hook: chapter.ending_hook || skeleton?.ending_hook || outline.hook || '',
            raw_payload: {
              ...(chapter.raw_payload || {}),
              unattended_goal: {
                ...(chapter.raw_payload?.unattended_goal || {}),
                target_chapter: targetNo,
                outline_id: outline.id,
                auto_repair_missing_material: true,
              },
            },
          }
          const updated = await updateNovelChapter(activeWorkspace, chapter.id, patch, { createVersion: false })
          if (updated) {
            chapter = updated
            chapterByNo.set(chapterNo, updated)
            updatedChapters.push(updated)
          }
        }
        if (!chapter) {
          skipped.push({ chapter_no: chapterNo, reason: '缺章节记录，且未允许自动创建' })
          continue
        }
        if (chapter.chapter_text && !includeWritten) {
          skipped.push({ chapter_id: chapter.id, chapter_no: chapterNo, title: chapter.title, reason: '已有正文' })
          continue
        }
        selected.push(chapter)
      }

      if (!selected.length) {
        return res.status(409).json({ error: '无人值守目标范围内没有可入队章节', error_code: 'NO_UNATTENDED_CHAPTERS', start_chapter: startNo, target_chapter: targetNo, skipped })
      }

      chapters = await listNovelChapters(activeWorkspace, project.id)
      const modelStrategy = project.reference_config?.model_strategy || ctx.getModelStrategy(project, Number(req.body.model_id || 0) || undefined)
      const approvalPolicy = { ...(project.reference_config?.approval_policy || ctx.getApprovalPolicy(project)), allow_full_auto: true }
      const configSnapshot = ctx.buildAgentConfigSnapshot(project, Number(req.body.model_id || 0) || undefined)
      const qualityThreshold = resolveChapterGroupQualityThreshold(req.body, project)
      const output = {
        chapter_ids: selected.map(chapter => chapter.id),
        chapters: selected.map(chapter => ({
          id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          status: chapter.chapter_text ? 'written' : 'pending',
          material_score: chapter.chapter_goal && chapter.ending_hook ? 80 : 60,
          scenes: normalizeSceneProduction(asArray(chapter.scene_breakdown).length ? chapter.scene_breakdown : asArray(chapter.scene_list), [], chapter.chapter_text ? 'accepted' : 'pending'),
          stages: ctx.buildChapterGroupStages(),
        })),
        skipped_chapters: skipped,
        created_chapters: createdChapters.map(chapter => ({ id: chapter.id, chapter_no: chapter.chapter_no, title: chapter.title })),
        updated_chapters: updatedChapters.map(chapter => ({ id: chapter.id, chapter_no: chapter.chapter_no, title: chapter.title })),
        current_index: 0,
        mode: 'unattended_goal',
        production_mode: 'full_auto',
        model_strategy: modelStrategy,
        approval_policy: approvalPolicy,
        config_snapshot: configSnapshot,
        unattended: {
          enabled: true,
          start_chapter: startNo,
          target_chapter: targetNo,
          allow_incomplete: req.body.allow_incomplete === true,
          force_scene_cards: req.body.force_scene_cards !== false,
          auto_repair_missing_material: true,
          auto_repair_quality_gate: false,
          advance_rule: 'prose_admitted_then_next_chapter',
        },
        policy: {
          stop_on_failure: req.body.stop_on_failure !== false,
          allow_incomplete: req.body.allow_incomplete === true,
          force_scene_cards: req.body.force_scene_cards !== false,
          require_scene_confirmation: false,
          quality_threshold: qualityThreshold,
          production_mode: 'full_auto',
          auto_repair_missing_material: true,
          auto_repair_quality_gate: false,
        },
        planning_preflight: planningPreflight,
      }
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'chapter_group_generation',
        step_name: `unattended-chapter-${startNo}-${targetNo}`,
        status: 'ready',
        input_ref: stringifyNovelGenerationPayload(req.body || {}),
        output_ref: stringifyNovelGenerationPayload(output),
      })
      res.json({
        ok: true,
        run,
        group: output,
        worker_start_endpoint: `/api/novel/projects/${project.id}/run-queue/start-worker`,
        summary: {
          start_chapter: startNo,
          target_chapter: targetNo,
          queued: selected.length,
          skipped: skipped.length,
          created: createdChapters.length,
          updated: updatedChapters.length,
          quality_threshold: qualityThreshold,
          auto_repair_missing_material: true,
        },
        chapters: chapters.filter(chapter => chapter.chapter_no >= startNo && chapter.chapter_no <= targetNo),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/:runId/execute', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      const run = runs.find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
      const item = chapters[Number(payload.current_index || 0)] || {}
      if (isTerminalAdmissionChapter(item, payload)) return res.status(409).json(terminalAdmissionRoutePayload(item, payload, '直接执行'))
      if (isApprovalBlockerChapter(item, payload)) return res.status(409).json(approvalBlockerRoutePayload(item, payload, '直接执行'))
      if (isLegacyQualityGateApproval(item, payload)) return res.status(409).json(legacyQualityGateRoutePayload(item, '直接执行'))
      const result = await ctx.executeChapterGroupRunRecord(activeWorkspace, project, run, req.body || {})
      res.json({ ok: true, ...result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/:runId/approve', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      const run = runs.find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
      const chapterId = Number(req.body.chapter_id || 0)
      const index = chapterId ? chapters.findIndex((item: any) => Number(item.id) === chapterId) : Number(payload.current_index || 0)
      if (index < 0 || !chapters[index]) return res.status(404).json({ error: 'chapter in run not found' })
      const item = chapters[index]
      const stage = String(item.approval_stage || item.approvalStage || payload.last_error?.approval_stage || payload.lastError?.approvalStage || req.body.stage || 'scene_cards')
      if (isTerminalAdmissionChapter(item, payload)) return res.status(409).json(terminalAdmissionRoutePayload(item, payload, '用人工确认直接'))
      if (isApprovalBlockerChapter(item, payload, stage)) return res.status(409).json(approvalBlockerRoutePayload(item, payload, '用人工确认直接'))
      if (isLegacyQualityGateApproval(item, payload, stage)) return res.status(409).json(legacyQualityGateRoutePayload(item, '用人工确认直接'))
      const approvals = {
        ...(item.approvals || {}),
        [stage]: {
          approved: true,
          approved_at: new Date().toISOString(),
          note: compactText(req.body.note || '', 500),
        },
      }
      chapters[index] = {
        ...item,
        status: 'ready',
        approvals,
        next_run_at: '',
        error: '',
        error_code: '',
        approval_stage: '',
        approval_context: null,
        stages: ctx.updateChapterStages(item.stages || [], stage === 'low_score' || stage === 'quality_gate' ? 'review' : stage === 'draft' ? 'draft' : stage, { status: 'success', approved: true }),
      }
      const clearsLastError = Number(payload.last_error?.id || 0) === Number(item.id || 0)
        || Number(payload.current_index || 0) === index
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'ready',
        output_ref: stringifyNovelGenerationPayload({
          ...payload,
          chapters,
          current_index: index,
          phase: `第${item.chapter_no}章已确认，等待继续执行`,
          approved_at: new Date().toISOString(),
          last_error: clearsLastError ? null : payload.last_error,
        }),
        error_message: '',
      })
      res.json({ ok: true, run: updated, group: parseJsonLikePayload(updated?.output_ref) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/:runId/retry-now', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      const run = runs.find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
      const chapterId = Number(req.body.chapter_id || 0)
      const index = chapterId ? chapters.findIndex((item: any) => Number(item.id) === chapterId) : Number(payload.current_index || 0)
      if (index < 0 || !chapters[index]) return res.status(404).json({ error: 'chapter in run not found' })
      const item = chapters[index]
      if (isTerminalAdmissionChapter(item, payload)) return res.status(409).json(terminalAdmissionRoutePayload(item, payload, '直接重试'))
      if (isApprovalBlockerChapter(item, payload)) return res.status(409).json(approvalBlockerRoutePayload(item, payload, '直接重试'))
      if (isLegacyQualityGateApproval(item, payload)) return res.status(409).json(legacyQualityGateRoutePayload(item, '直接重试'))
      chapters[index] = { ...chapters[index], status: 'ready', next_run_at: '', error: '', error_code: '' }
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'ready',
        output_ref: stringifyNovelGenerationPayload({ ...payload, chapters, current_index: index, phase: `第${chapters[index].chapter_no}章已加入立即重试` }),
        error_message: '',
      })
      res.json({ ok: true, run: updated, group: parseJsonLikePayload(updated?.output_ref) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/:runId/skip-chapter', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      const run = runs.find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
      const chapterId = Number(req.body.chapter_id || 0)
      const index = chapterId ? chapters.findIndex((item: any) => Number(item.id) === chapterId) : Number(payload.current_index || 0)
      if (index < 0 || !chapters[index]) return res.status(404).json({ error: 'chapter in run not found' })
      const item = chapters[index]
      if (isTerminalAdmissionChapter(item, payload)) return res.status(409).json(terminalAdmissionRoutePayload(item, payload, '跳过章节'))
      if (isApprovalBlockerChapter(item, payload)) return res.status(409).json(approvalBlockerRoutePayload(item, payload, '跳过章节'))
      if (isLegacyQualityGateApproval(item, payload)) return res.status(409).json(legacyQualityGateRoutePayload(item, '跳过章节'))
      const stages = (Array.isArray(item.stages) && item.stages.length ? item.stages : ctx.buildChapterGroupStages())
        .map((stage: any) => ['success', 'skipped'].includes(stage.status) ? stage : { ...stage, status: 'skipped', skipped_at: new Date().toISOString() })
      const nextIndex = Number(payload.current_index || 0) <= index ? index + 1 : Number(payload.current_index || 0)
      chapters[index] = {
        ...item,
        status: 'skipped',
        stages,
        skipped_reason: String(req.body.reason || '用户在任务中心跳过'),
        skipped_at: new Date().toISOString(),
        error: '',
        error_code: '',
        next_run_at: '',
      }
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'ready',
        output_ref: stringifyNovelGenerationPayload({
          ...payload,
          chapters,
          current_index: nextIndex,
          phase: `已跳过第${item.chapter_no}章，等待继续执行`,
          last_error: payload.last_error?.id === item.id ? null : payload.last_error,
        }),
        error_message: '',
      })
      res.json({ ok: true, run: updated, group: parseJsonLikePayload(updated?.output_ref) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/chapter-groups/:runId/scenes', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const run = (await listNovelRuns(activeWorkspace, project.id)).find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
      res.json({
        ok: true,
        run_id: run.id,
        scenes: chapters.map((chapter: any) => ({
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          status: chapter.status,
          scenes: Array.isArray(chapter.scenes) ? chapter.scenes : [],
        })),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
