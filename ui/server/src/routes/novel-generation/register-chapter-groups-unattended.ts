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

export function registerNovelGenerationChapterGroupUnattendedRoutes(app: Express, ctx: GenerationRoutesContext) {
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

}
