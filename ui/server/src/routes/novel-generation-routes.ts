import type { Express } from 'express'
import {
  appendNovelRun,
  createNovelChapter,
  createNovelReview,
  listChapterVersions,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelWorldbuilding,
  updateNovelChapter,
  updateNovelRun,
} from '../novel'
import { generateNovelChapterProse } from '../llm'
import { buildMaterialScore } from './novel-chapter-context-routes'
import { asArray, buildLLMResultDiagnostics, extractPlainProseFallback, getNovelPayload, normalizeSceneProduction, parseJsonLikePayload } from './novel-route-utils'
import { applyChapterWordTargetToContext, countProseChars, proseMaxTokensForWordTarget, resolveChapterWordTarget } from './novel-writing-service'

function outlineChapterNo(outline: any) {
  const rawNo = Number(outline.raw_payload?.chapter_no || outline.raw_payload?.future100?.chapter_no || 0)
  if (rawNo) return rawNo
  const match = String(outline.title || '').match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : 0
}

function futureSkeletonFromOutline(outline: any) {
  const future = outline.raw_payload?.future100 || {}
  return {
    chapter_no: outlineChapterNo(outline),
    title: String(future.title || String(outline.title || '').replace(/^第\s*\d+\s*章\s*/, '') || outline.title || ''),
    chapter_goal: String(future.chapter_goal || outline.summary || ''),
    conflict: String(future.conflict || asArray(outline.conflict_points)[0] || ''),
    payoff: String(future.payoff || asArray(outline.turning_points)[0] || ''),
    ending_hook: String(future.ending_hook || outline.hook || ''),
    volume_stage: String(future.volume_stage || ''),
    commercial_purpose: String(future.commercial_purpose || ''),
  }
}

function scoreFutureSkeletonChapter(item: any) {
  const checks = [
    item.title ? 14 : 0,
    String(item.chapter_goal || '').replace(/\s/g, '').length >= 18 ? 28 : 0,
    item.conflict ? 24 : 0,
    item.payoff ? 18 : 0,
    item.ending_hook ? 16 : 0,
  ]
  return checks.reduce((sum, value) => sum + value, 0)
}

function applyRequestLongformCompass(contextPackage: any, req: any) {
  if (!req.body?.longform_compass) return contextPackage
  return {
    ...contextPackage,
    longform_compass: req.body.longform_compass,
    chapter_target: { ...contextPackage.chapter_target, longform_compass: req.body.longform_compass },
  }
}

function applyRequestNextBatchBrief(contextPackage: any, req: any) {
  if (!req.body?.next_batch_brief) return contextPackage
  return {
    ...contextPackage,
    next_batch_brief: req.body.next_batch_brief,
    chapter_target: { ...contextPackage.chapter_target, next_batch_brief: req.body.next_batch_brief },
  }
}

type GenerationRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  getModelStrategy: (project: any, preferredModelId?: number) => any
  getApprovalPolicy: (project: any) => any
  buildAgentConfigSnapshot: (project: any, preferredModelId?: number) => any
  buildChapterGroupStages: () => any[]
  updateChapterStages: (stages: any[], key: string, patch?: any) => any[]
  classifyGenerationFailure: (error: any) => any
  executeChapterGroupRunRecord: (workspace: string, project: any, run: any, options?: any) => Promise<any>
  buildPipelineSteps: () => any[]
  updatePipelineStep: (steps: any[], key: string, patch: any) => any[]
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
  generateSceneCardsForChapter: (workspace: string, project: any, contextPackage: any, modelId?: number) => Promise<any>
  getReferenceMigrationPlanForChapter: (workspace: string, project: any, chapter: any) => Promise<any>
  buildParagraphProseContext: (project: any, contextPackage: any, migrationPlan?: any, chapterDraft?: any) => string[]
  getStageModelId: (project: any, stage: string, preferredModelId?: number) => number | undefined
  runCommercialEditorRewrite: (workspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options?: any) => Promise<any>
  runProseSelfReviewAndRevision: (workspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number) => Promise<any>
  ensureProseMeetsWordTarget: (workspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options?: any) => Promise<any>
  buildReferenceUsageReport: (workspace: string, project: any, taskType: string, generatedText?: string) => Promise<any>
  getReferenceSafetyDecision: (project: any, referenceReport: any) => any
  explainReferenceSafety: (referenceReport: any, safetyDecision: any) => any
  buildMigrationAudit: (project: any, referenceReport: any, safetyExplanation: any) => any
  updateStoryStateMachine: (workspace: string, project: any, chapter: any, contextPackage: any, chapterText: string, modelId?: number) => Promise<any>
}

function buildTextDiffSummary(before: string, after: string) {
  const beforeParas = String(before || '').split(/\n+/).map(item => item.trim()).filter(Boolean)
  const afterParas = String(after || '').split(/\n+/).map(item => item.trim()).filter(Boolean)
  const max = Math.max(beforeParas.length, afterParas.length)
  const paragraphChanges = []
  for (let i = 0; i < max; i += 1) {
    if ((beforeParas[i] || '') !== (afterParas[i] || '')) {
      paragraphChanges.push({ index: i + 1, before: beforeParas[i] || '', after: afterParas[i] || '' })
    }
    if (paragraphChanges.length >= 80) break
  }
  const beforeChars = String(before || '').replace(/\s/g, '').length
  const afterChars = String(after || '').replace(/\s/g, '').length
  return {
    before_length: beforeChars,
    after_length: afterChars,
    delta_length: afterChars - beforeChars,
    change_count: paragraphChanges.length,
    paragraph_changes: paragraphChanges,
  }
}

function selectTargetProsePayload(resultPayload: any, targetChapterNo: number) {
  const proseArr = Array.isArray(resultPayload?.prose_chapters) ? resultPayload.prose_chapters : []
  const topLevelChapterNo = Number(resultPayload?.chapter_no || 0)
  if (topLevelChapterNo && topLevelChapterNo !== targetChapterNo) {
    throw new Error(`模型返回的章节号与目标章节不一致：目标第${targetChapterNo}章，返回第${topLevelChapterNo}章`)
  }
  const matched = proseArr.find(item => Number(item?.chapter_no || 0) === targetChapterNo)
  if (matched) {
    return matched
  }
  if (proseArr.length === 1) {
    const single = proseArr[0]
    const singleChapterNo = Number(single?.chapter_no || 0)
    if (!singleChapterNo || singleChapterNo === targetChapterNo) {
      return single
    }
    throw new Error(`模型返回的章节号与目标章节不一致：目标第${targetChapterNo}章，返回第${singleChapterNo}章`)
  }
  if (proseArr.length > 1) {
    const foundNos = proseArr.map(item => item?.chapter_no).filter(Boolean).join('、') || '无'
    throw new Error(`模型返回的正文章节中没有第${targetChapterNo}章，实际章节号为：${foundNos}`)
  }
  return resultPayload || {}
}

export function registerNovelGenerationRoutes(app: Express, ctx: GenerationRoutesContext) {
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
          quality_threshold: Number(req.body.quality_threshold || 78),
          production_mode: req.body.production_mode || 'draft_review_revise_store',
        },
      }
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'chapter_group_generation',
        step_name: `chapter-${startNo}-${startNo + count - 1}`,
        status: 'ready',
        input_ref: JSON.stringify(req.body || {}),
        output_ref: JSON.stringify(output),
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
          quality_threshold: Number(req.body.quality_threshold || 78),
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
        input_ref: JSON.stringify(req.body || {}),
        output_ref: JSON.stringify(output),
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
          quality_threshold: Number(req.body.quality_threshold || 78),
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
        input_ref: JSON.stringify(req.body || {}),
        output_ref: JSON.stringify(output),
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

  app.post('/api/novel/projects/:id/chapter-groups/:runId/execute', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      const run = runs.find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
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
      const stage = String(req.body.stage || payload.last_error?.approval_stage || 'scene_cards')
      const index = chapterId ? chapters.findIndex((item: any) => Number(item.id) === chapterId) : Number(payload.current_index || 0)
      if (index < 0 || !chapters[index]) return res.status(404).json({ error: 'chapter in run not found' })
      const item = chapters[index]
      const approvals = {
        ...(item.approvals || {}),
        [stage]: {
          approved: true,
          approved_at: new Date().toISOString(),
          note: String(req.body.note || ''),
        },
      }
      chapters[index] = {
        ...item,
        status: 'ready',
        approvals,
        next_run_at: '',
        error: '',
        error_code: '',
        stages: ctx.updateChapterStages(item.stages || [], stage === 'low_score' || stage === 'quality_gate' ? 'review' : stage === 'draft' ? 'draft' : stage, { status: 'success', approved: true }),
      }
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'ready',
        output_ref: JSON.stringify({ ...payload, chapters, current_index: index, phase: `第${item.chapter_no}章已确认，等待继续执行`, approved_at: new Date().toISOString() }),
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
      chapters[index] = { ...chapters[index], status: 'ready', next_run_at: '', error: '', error_code: '' }
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'ready',
        output_ref: JSON.stringify({ ...payload, chapters, current_index: index, phase: `第${chapters[index].chapter_no}章已加入立即重试` }),
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
        output_ref: JSON.stringify({
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

  app.post('/api/novel/runs/:id/failure-recovery-plan', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id || req.query.project_id || 0)
      const runs = await listNovelRuns(activeWorkspace, projectId)
      const run = runs.find(item => item.id === Number(req.params.id))
      if (!run) return res.status(404).json({ error: 'run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const plan = ctx.classifyGenerationFailure({ message: run.error_message || payload?.error || payload?.last_error?.error || JSON.stringify(payload).slice(0, 500), code: payload?.last_error?.error_code || payload?.error_code })
      res.json({ ok: true, plan, run_id: run.id, status: run.status })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/generation-pipeline/start', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || 0)
      const modelId = Number(req.body.model_id || 0) || undefined
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const configSnapshot = ctx.buildAgentConfigSnapshot(project, modelId)
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, projectId),
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
      ])
      const chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      let wordTarget = resolveChapterWordTarget(project, chapter, req.body || {})
      let contextPackage = applyChapterWordTargetToContext(
        await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews),
        wordTarget,
      )
      let steps = ctx.buildPipelineSteps()
      steps = ctx.updatePipelineStep(steps, 'context', {
        status: contextPackage.preflight.ready ? 'success' : 'warn',
        detail: contextPackage.preflight.warnings.join('；'),
      })
      let updatedChapter = chapter
      if (req.body?.generate_scene_cards === true) {
        const sceneResult = await ctx.generateSceneCardsForChapter(activeWorkspace, project, contextPackage, modelId)
        if (sceneResult.sceneCards.length > 0) {
          updatedChapter = await updateNovelChapter(activeWorkspace, chapter.id, {
            scene_breakdown: sceneResult.sceneCards,
            scene_list: sceneResult.sceneCards,
            raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'pipeline_confirmation' },
          } as any, { createVersion: false }) || chapter
          const refreshedChapters = await listNovelChapters(activeWorkspace, projectId)
          wordTarget = resolveChapterWordTarget(project, updatedChapter, req.body || {})
          contextPackage = applyChapterWordTargetToContext(
            await ctx.buildChapterContextPackage(activeWorkspace, project, updatedChapter, refreshedChapters, worldbuilding, characters, outlines, reviews),
            wordTarget,
          )
          steps = ctx.updatePipelineStep(steps, 'scene_cards', {
            status: 'needs_confirmation',
            detail: `已生成 ${sceneResult.sceneCards.length} 个场景卡，等待人工确认。`,
            scene_cards: sceneResult.sceneCards,
          })
        } else {
          steps = ctx.updatePipelineStep(steps, 'scene_cards', { status: 'failed', detail: '模型未返回场景卡' })
        }
      }
      const output = {
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        current_step: req.body?.generate_scene_cards === true ? 'scene_cards' : 'context',
        steps,
        context_package: contextPackage,
        config_snapshot: configSnapshot,
        confirmed_scene_cards: false,
        can_resume_from: req.body?.generate_scene_cards === true ? 'draft' : 'scene_cards',
        resume_endpoint: `/api/novel/chapters/${chapter.id}/generate-prose`,
      }
      const run = await appendNovelRun(activeWorkspace, {
        project_id: projectId,
        run_type: 'chapter_generation_pipeline',
        step_name: `chapter-${chapter.chapter_no}`,
        status: req.body?.generate_scene_cards === true ? 'paused' : 'ready',
        input_ref: JSON.stringify(req.body || {}),
        output_ref: JSON.stringify(output),
      })
      res.json({ ok: true, run, pipeline: output, chapter: updatedChapter })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/scene-cards', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || 0)
      const modelId = Number(req.body.model_id || 0) || undefined
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const configSnapshot = ctx.buildAgentConfigSnapshot(project, modelId)
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, projectId),
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
      ])
      const chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const wordTarget = resolveChapterWordTarget(project, chapter, req.body || {})
      const contextPackage = applyChapterWordTargetToContext(
        await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews),
        wordTarget,
      )
      if (!contextPackage.preflight.ready && req.body?.allow_incomplete !== true) {
        return res.status(412).json({ error: '场景卡生成前置检查未通过', error_code: 'SCENE_PREFLIGHT_BLOCKED', preflight: contextPackage.preflight, context_package: contextPackage })
      }
      const result = await ctx.generateSceneCardsForChapter(activeWorkspace, project, contextPackage, modelId)
      if (!result.sceneCards.length) {
        const diagnostics = buildLLMResultDiagnostics(result.result)
        await appendNovelRun(activeWorkspace, {
          project_id: projectId,
          run_type: 'scene_cards',
          step_name: `chapter-${chapter.chapter_no}`,
          status: 'failed',
          input_ref: JSON.stringify(req.body),
          output_ref: JSON.stringify({ error: '模型未返回场景卡', llm_diagnostics: diagnostics, runtime_selection: (result.result as any)?.runtimeSelection || null, config_snapshot: configSnapshot }),
          error_message: '模型未返回场景卡',
        })
        return res.status(502).json({ error: '模型未返回场景卡', result: result.result, llm_diagnostics: diagnostics })
      }
      const updated = await updateNovelChapter(activeWorkspace, chapter.id, {
        scene_breakdown: result.sceneCards,
        scene_list: result.sceneCards,
        raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'manual_pipeline' },
      } as any, { createVersion: false })
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'scene_cards', step_name: `chapter-${chapter.chapter_no}`, status: 'success', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify({ scene_cards: result.sceneCards, modelName: (result.result as any).modelName, config_snapshot: configSnapshot }) })
      res.json({ chapter: updated, scene_cards: result.sceneCards, result: result.result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/generate-prose', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || 0)
      const modelId = Number(req.body.model_id || 0) || undefined
      const wantsStream = String(req.headers.accept || '').includes('text/event-stream') || String(req.query.stream || '') === '1'
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const configSnapshot = ctx.buildAgentConfigSnapshot(project, modelId)
      let chapters = await listNovelChapters(activeWorkspace, projectId)
      let chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const [worldbuilding, characters, outlines, reviews] = await Promise.all([listNovelWorldbuilding(activeWorkspace, projectId), listNovelCharacters(activeWorkspace, projectId), listNovelOutlines(activeWorkspace, projectId), listNovelReviews(activeWorkspace, projectId)])
      const pipeline: any[] = []
      const markStage = (key: string, label: string, status: string, detail = '', extra: any = {}) => {
        const stage = { key, label, status, detail, at: new Date().toISOString(), ...extra }
        pipeline.push(stage)
        if (wantsStream && !res.writableEnded) {
          res.write(`data: ${JSON.stringify({ type: 'progress', progress: label, pipeline, stage })}\n\n`)
        }
        return stage
      }
      if (wantsStream) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        res.setHeader('Connection', 'keep-alive')
      }
      markStage('context', '构建续写上下文包', 'running')
      let wordTarget = resolveChapterWordTarget(project, chapter, req.body || {})
      let contextPackage = applyChapterWordTargetToContext(
        await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews),
        wordTarget,
      )
      contextPackage = applyRequestLongformCompass(contextPackage, req)
      contextPackage = applyRequestNextBatchBrief(contextPackage, req)
      markStage(
        'context',
        contextPackage.preflight.ready ? '续写上下文包已就绪' : '续写上下文包存在缺口',
        contextPackage.preflight.ready ? 'success' : 'warn',
        contextPackage.preflight.warnings.join('；'),
        { context_package: contextPackage },
      )
      if (!contextPackage.preflight.ready && req.body?.allow_incomplete !== true) {
        const errorPayload = {
          error: '章节生成前置检查未通过',
          error_code: 'PROSE_PREFLIGHT_BLOCKED',
          context_package: contextPackage,
          config_snapshot: configSnapshot,
          preflight: contextPackage.preflight,
          pipeline,
        }
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify(errorPayload), error_message: '章节生成前置检查未通过' })
        if (wantsStream) {
          res.write(`data: ${JSON.stringify({ type: 'error', ...errorPayload })}\n\n`)
          res.end()
          return
        }
        return res.status(412).json(errorPayload)
      }

      if (!contextPackage.chapter_target.scene_cards.length || req.body?.force_scene_cards === true) {
        markStage('scene_cards', '生成章节场景卡', 'running')
        try {
          const sceneResult = await ctx.generateSceneCardsForChapter(activeWorkspace, project, contextPackage, modelId)
          if (sceneResult.sceneCards.length > 0) {
            const updatedSceneChapter = await updateNovelChapter(activeWorkspace, chapter.id, {
              scene_breakdown: sceneResult.sceneCards,
              scene_list: sceneResult.sceneCards,
              raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'generated' },
            } as any, { createVersion: false })
            if (updatedSceneChapter) chapter = updatedSceneChapter
            chapters = await listNovelChapters(activeWorkspace, projectId)
            wordTarget = resolveChapterWordTarget(project, chapter, req.body || {})
            contextPackage = applyChapterWordTargetToContext(
              await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews),
              wordTarget,
            )
            contextPackage = applyRequestLongformCompass(contextPackage, req)
            contextPackage = applyRequestNextBatchBrief(contextPackage, req)
            markStage('scene_cards', `场景卡已生成：${sceneResult.sceneCards.length} 个`, 'success', '', { scene_cards: sceneResult.sceneCards })
          } else {
            markStage('scene_cards', '场景卡生成为空，继续使用章节细纲', 'warn')
          }
        } catch (sceneError) {
          markStage('scene_cards', '场景卡生成失败，继续使用章节细纲', 'warn', String(sceneError).slice(0, 200))
        }
      }

      const prevChapters = chapters
        .filter(ch => ch.chapter_no < chapter.chapter_no && ch.chapter_text)
        .slice(-3)
        .map(ch => ({ chapter_no: ch.chapter_no, title: ch.title, chapter_summary: ch.chapter_summary || '', ending_hook: ch.ending_hook || '', chapter_text: ch.chapter_text }))
      markStage('migration_plan', '生成/读取参考迁移计划', 'running')
      const migrationPlan = await ctx.getReferenceMigrationPlanForChapter(activeWorkspace, project, chapter).catch(error => ({ error: String(error) }))
      markStage('migration_plan', (migrationPlan as any)?.error ? '参考迁移计划读取失败，继续保守生成' : '参考迁移计划已就绪', (migrationPlan as any)?.error ? 'warn' : 'success', (migrationPlan as any)?.error || '', { migration_plan: migrationPlan })
      markStage('draft', '段落级正文生成', 'running')
      const result = await generateNovelChapterProse(project, chapter, {
        worldbuilding,
        characters,
        outline: outlines,
        prompt: String(req.body.prompt || ''),
        prevChapters,
        contextPackage,
        migrationPlan,
        paragraphTask: ctx.buildParagraphProseContext(project, contextPackage, migrationPlan, chapter),
        maxTokens: proseMaxTokensForWordTarget(wordTarget),
      } as any, activeWorkspace, ctx.getStageModelId(project, 'draft', modelId))
      const resultPayload = getNovelPayload(result)
      let targetProse: any = null
      try {
        targetProse = selectTargetProsePayload(resultPayload, Number(chapter.chapter_no || 0))
      } catch (selectionError) {
        const errorPayload = { error: String(selectionError), error_code: 'PROSE_TARGET_MISMATCH', result, pipeline, context_package: contextPackage, config_snapshot: configSnapshot }
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify(errorPayload), error_message: String(selectionError) })
        if (wantsStream) {
          res.write(`data: ${JSON.stringify({ type: 'error', ...errorPayload })}\n\n`)
          res.end()
          return
        }
        return res.status(502).json(errorPayload)
      }
      const plainProseFallback = extractPlainProseFallback(result, 800)
      const chapterText = targetProse?.chapter_text || resultPayload?.chapter_text || plainProseFallback
      const sceneBreakdown = targetProse?.scene_breakdown || resultPayload?.scene_breakdown || []
      const continuityNotes = targetProse?.continuity_notes || resultPayload?.continuity_notes || []
      if ((result as any).error || !chapterText) {
        const resultError = String((result as any).error || (result as any).fallbackReason || '模型未返回正文')
        const runtimeDiagnostics = {
          result_error: resultError,
          output_source: (result as any).outputSource || '',
          model_id: (result as any).modelId || (result as any).runtimeSelection?.model?.id,
          model_name: (result as any).modelName || (result as any).runtimeSelection?.model?.model_name,
          provider_id: (result as any).providerId || (result as any).runtimeSelection?.provider?.id,
          runtime_selection: (result as any).runtimeSelection || null,
          llm_diagnostics: buildLLMResultDiagnostics(result),
        }
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify({ ...(resultPayload || {}), ...runtimeDiagnostics, config_snapshot: configSnapshot }), error_message: resultError })
        const errorPayload = { error: resultError, ...runtimeDiagnostics, result, pipeline, context_package: contextPackage, config_snapshot: configSnapshot }
        if (wantsStream) {
          res.write(`data: ${JSON.stringify({ type: 'error', ...errorPayload })}\n\n`)
          res.end()
          return
        }
        return res.status(502).json(errorPayload)
      }
      let selfCheck: any = null
      let editorRewrite: any = null
      let finalText = String(chapterText || '')
      let finalSceneBreakdown = sceneBreakdown
      let finalContinuityNotes = continuityNotes
      markStage('draft', '章节初稿已生成', 'success', `${countProseChars(finalText)} 字`)
      markStage('word_target', '核对章节字数目标', 'running', `当前 ${countProseChars(finalText)} 字 / 目标 ${wordTarget.target} 字`)
      try {
        const wordTargetCheck = await ctx.ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, modelId)
        finalText = wordTargetCheck.final_text || finalText
        if (wordTargetCheck.expanded && wordTargetCheck.expansion) {
          finalSceneBreakdown = wordTargetCheck.expansion.scene_breakdown?.length ? wordTargetCheck.expansion.scene_breakdown : finalSceneBreakdown
          finalContinuityNotes = wordTargetCheck.expansion.continuity_notes?.length ? wordTargetCheck.expansion.continuity_notes : finalContinuityNotes
        }
        markStage(
          'word_target',
          wordTargetCheck.expanded ? '正文已按字数目标扩写' : '正文达到字数目标',
          'success',
          `当前 ${countProseChars(finalText)} 字 / 目标 ${wordTarget.target} 字`,
          { word_target_check: wordTargetCheck },
        )
      } catch (wordTargetError: any) {
        const errorPayload = {
          error: String(wordTargetError?.message || wordTargetError || '章节正文低于字数下限'),
          error_code: wordTargetError?.code || 'PROSE_WORD_TARGET_SHORT',
          word_target: wordTargetError?.word_target || wordTarget,
          word_target_check: {
            evaluation: wordTargetError?.evaluation,
            final_evaluation: wordTargetError?.final_evaluation,
            expansion_attempts: wordTargetError?.expansion_attempts,
          },
          pipeline,
          context_package: contextPackage,
          config_snapshot: configSnapshot,
        }
        markStage('word_target', '章节正文低于字数下限', 'failed', errorPayload.error, { word_target_check: errorPayload.word_target_check })
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify(errorPayload), error_message: errorPayload.error })
        if (wantsStream) {
          res.write(`data: ${JSON.stringify({ type: 'error', ...errorPayload })}\n\n`)
          res.end()
          return
        }
        return res.status(502).json(errorPayload)
      }
      markStage('editor', '商业主编改稿', 'running')
      try {
        editorRewrite = await ctx.runCommercialEditorRewrite(activeWorkspace, project, contextPackage, finalText, modelId)
        finalText = editorRewrite.final_text || finalText
        if (editorRewrite.edited && editorRewrite.revision) {
          finalSceneBreakdown = editorRewrite.revision.scene_breakdown?.length ? editorRewrite.revision.scene_breakdown : finalSceneBreakdown
          finalContinuityNotes = editorRewrite.revision.continuity_notes?.length ? editorRewrite.revision.continuity_notes : finalContinuityNotes
        }
        markStage(
          'editor',
          editorRewrite.edited ? '商业主编改稿已应用' : '商业主编改稿无可用修订',
          editorRewrite.edited ? 'success' : 'warn',
          `${countProseChars(finalText)} 字`,
          { editor_rewrite: editorRewrite },
        )
      } catch (editorError) {
        editorRewrite = { error: String(editorError), edited: false }
        markStage('editor', '商业主编改稿失败，保留当前稿', 'warn', String(editorError).slice(0, 200), { editor_rewrite: editorRewrite })
      }
      try {
        const postEditorWordTargetCheck = await ctx.ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, modelId)
        finalText = postEditorWordTargetCheck.final_text || finalText
        if (postEditorWordTargetCheck.expanded && postEditorWordTargetCheck.expansion) {
          finalSceneBreakdown = postEditorWordTargetCheck.expansion.scene_breakdown?.length ? postEditorWordTargetCheck.expansion.scene_breakdown : finalSceneBreakdown
          finalContinuityNotes = postEditorWordTargetCheck.expansion.continuity_notes?.length ? postEditorWordTargetCheck.expansion.continuity_notes : finalContinuityNotes
          markStage('word_target', '主编改稿后正文已重新补足字数', 'success', `当前 ${countProseChars(finalText)} 字 / 目标 ${wordTarget.target} 字`, { word_target_check: postEditorWordTargetCheck, phase: 'post_editor' })
        }
      } catch (wordTargetError: any) {
        const errorPayload = {
          error: String(wordTargetError?.message || wordTargetError || '章节正文低于字数下限'),
          error_code: wordTargetError?.code || 'PROSE_WORD_TARGET_SHORT',
          word_target: wordTargetError?.word_target || wordTarget,
          word_target_check: {
            evaluation: wordTargetError?.evaluation,
            final_evaluation: wordTargetError?.final_evaluation,
            expansion_attempts: wordTargetError?.expansion_attempts,
            phase: 'post_editor',
          },
          pipeline,
          context_package: contextPackage,
          editor_rewrite: editorRewrite,
          config_snapshot: configSnapshot,
        }
        markStage('word_target', '主编改稿后正文低于字数下限', 'failed', errorPayload.error, { word_target_check: errorPayload.word_target_check })
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify(errorPayload), error_message: errorPayload.error })
        if (wantsStream) {
          res.write(`data: ${JSON.stringify({ type: 'error', ...errorPayload })}\n\n`)
          res.end()
          return
        }
        return res.status(502).json(errorPayload)
      }
      markStage('review', '执行章节自检', 'running')
      try {
        selfCheck = await ctx.runProseSelfReviewAndRevision(activeWorkspace, project, contextPackage, finalText, modelId)
        finalText = selfCheck.final_text || finalText
        if (selfCheck.revised && selfCheck.revision) {
          finalSceneBreakdown = selfCheck.revision.scene_breakdown?.length ? selfCheck.revision.scene_breakdown : finalSceneBreakdown
          finalContinuityNotes = selfCheck.revision.continuity_notes?.length ? selfCheck.revision.continuity_notes : finalContinuityNotes
        }
        markStage(
          'review',
          selfCheck.revised ? '自检完成，已应用修订稿' : '自检完成，初稿可用',
          selfCheck.review?.passed === false ? 'warn' : 'success',
          `评分 ${selfCheck.review?.score ?? '-'}`,
          { self_check: selfCheck.review, revised: selfCheck.revised },
        )
      } catch (reviewError) {
        selfCheck = { error: String(reviewError), revised: false }
        markStage('review', '自检失败，保留初稿', 'warn', String(reviewError).slice(0, 200), { self_check: selfCheck })
      }
      try {
        const postReviewWordTargetCheck = await ctx.ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, modelId)
        finalText = postReviewWordTargetCheck.final_text || finalText
        if (postReviewWordTargetCheck.expanded && postReviewWordTargetCheck.expansion) {
          finalSceneBreakdown = postReviewWordTargetCheck.expansion.scene_breakdown?.length ? postReviewWordTargetCheck.expansion.scene_breakdown : finalSceneBreakdown
          finalContinuityNotes = postReviewWordTargetCheck.expansion.continuity_notes?.length ? postReviewWordTargetCheck.expansion.continuity_notes : finalContinuityNotes
          markStage('word_target', '自检后正文已重新补足字数', 'success', `当前 ${countProseChars(finalText)} 字 / 目标 ${wordTarget.target} 字`, { word_target_check: postReviewWordTargetCheck })
        }
      } catch (wordTargetError: any) {
        const errorPayload = {
          error: String(wordTargetError?.message || wordTargetError || '章节正文低于字数下限'),
          error_code: wordTargetError?.code || 'PROSE_WORD_TARGET_SHORT',
          word_target: wordTargetError?.word_target || wordTarget,
          word_target_check: {
            evaluation: wordTargetError?.evaluation,
            final_evaluation: wordTargetError?.final_evaluation,
            expansion_attempts: wordTargetError?.expansion_attempts,
          },
          pipeline,
          context_package: contextPackage,
          self_check: selfCheck,
          config_snapshot: configSnapshot,
        }
        markStage('word_target', '自检后正文仍低于字数下限', 'failed', errorPayload.error, { word_target_check: errorPayload.word_target_check })
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify(errorPayload), error_message: errorPayload.error })
        if (wantsStream) {
          res.write(`data: ${JSON.stringify({ type: 'error', ...errorPayload })}\n\n`)
          res.end()
          return
        }
        return res.status(502).json(errorPayload)
      }

      try {
        const review = selfCheck?.review || {}
        await createNovelReview(activeWorkspace, {
          project_id: projectId,
          review_type: 'prose_quality',
          status: review.passed === false || Number(review.score || 100) < 78 ? 'warn' : 'ok',
          summary: `章节自检评分 ${review.score ?? '-'}${selfCheck?.revised ? '，已生成修订稿' : ''}`,
          issues: Array.isArray(review.issues) ? review.issues.map((issue: any) => `${issue.severity || 'medium'}｜${issue.description || issue}`) : [],
          payload: JSON.stringify({ chapter_id: chapter.id, context_package: contextPackage, editor_rewrite: editorRewrite, self_check: selfCheck, pipeline, config_snapshot: configSnapshot }),
        })
      } catch (reviewStoreError) {
        console.warn('[prose-quality] Failed to store review:', String(reviewStoreError).slice(0, 200))
      }
      let referenceReport: any = null
      let safetyDecision: any = null
      let migrationAudit: any = null
      try {
        markStage('reference_report', '生成参考使用报告', 'running')
        referenceReport = await ctx.buildReferenceUsageReport(activeWorkspace, project, '正文创作', finalText)
        safetyDecision = ctx.getReferenceSafetyDecision(project, referenceReport)
        const safetyExplanation = ctx.explainReferenceSafety(referenceReport, safetyDecision)
        migrationAudit = ctx.buildMigrationAudit(project, referenceReport, safetyExplanation)
        markStage('reference_report', safetyDecision.blocked ? '参考安全阈值未通过' : '参考使用报告已生成', safetyDecision.blocked ? 'failed' : 'success', safetyDecision.reasons?.join('；') || '', { reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit })
      } catch (reportError) {
        markStage('reference_report', '参考使用报告生成失败', 'warn', String(reportError).slice(0, 200))
        console.warn('[reference-report] Failed:', String(reportError).slice(0, 200))
      }
      const safetyExplanation = referenceReport && safetyDecision ? ctx.explainReferenceSafety(referenceReport, safetyDecision) : null
      if (!migrationAudit && referenceReport && safetyExplanation) migrationAudit = ctx.buildMigrationAudit(project, referenceReport, safetyExplanation)
      if (safetyDecision?.blocked) {
        const errorPayload = { error: '仿写安全阈值未通过，正文未入库', error_code: 'REFERENCE_SAFETY_BLOCKED', reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit, context_package: contextPackage, self_check: selfCheck, pipeline, config_snapshot: configSnapshot }
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify(errorPayload), error_message: safetyDecision.reasons?.join('；') || '仿写安全阈值未通过' })
        if (wantsStream) {
          res.write(`data: ${JSON.stringify({ type: 'error', ...errorPayload })}\n\n`)
          res.end()
          return
        }
        return res.status(409).json(errorPayload)
      }
      markStage('store', '写入章节正文与版本', 'running')
      const beforeText = String(chapter.chapter_text || '')
      const updated = await updateNovelChapter(activeWorkspace, chapter.id, {
        chapter_text: finalText,
        continuity_notes: finalContinuityNotes,
        raw_payload: { ...(chapter.raw_payload || {}), generated_scene_breakdown: finalSceneBreakdown },
        status: 'draft',
      }, { versionSource: selfCheck?.revised ? 'repair' : editorRewrite?.edited ? 'editor_rewrite' : 'agent_execute' })
      const versionsAfterStore = await listChapterVersions(activeWorkspace, chapter.id).catch(() => [])
      const previousVersion = versionsAfterStore[0] || null
      const generationDiff = buildTextDiffSummary(beforeText, finalText)
      markStage('store', '章节已写入', 'success')
      let storyStateUpdate: any = null
      try {
        markStage('story_state', '更新故事状态机', 'running')
        storyStateUpdate = await ctx.updateStoryStateMachine(activeWorkspace, project, chapter, contextPackage, finalText, modelId)
        markStage('story_state', '故事状态机已更新', 'success', '', { story_state_update: storyStateUpdate })
      } catch (stateError) {
        markStage('story_state', '故事状态机更新失败', 'warn', String(stateError).slice(0, 200))
      }
      const pipelineResult = { context_package: contextPackage, editor_rewrite: editorRewrite, self_check: selfCheck, pipeline, diff: generationDiff, previous_version: previousVersion, config_snapshot: configSnapshot }
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'success', input_ref: JSON.stringify(req.body), output_ref: JSON.stringify({ outputSource: (result as any).outputSource, modelId: (result as any).modelId, modelName: (result as any).modelName, providerId: (result as any).providerId, usage: (result as any).usage, reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit, story_state_update: storyStateUpdate, ...pipelineResult }) })
      if (!wantsStream) return res.json({ chapter: updated, result, reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit, story_state_update: storyStateUpdate, ...pipelineResult })
      const fullText = String(finalText || '')
      const chunkSize = Math.max(40, Math.ceil(fullText.length / 12))
      res.write(`data: ${JSON.stringify({ type: 'progress', progress: '生成完成，开始输出正文...', pipeline })}\n\n`)
      for (let i = 0; i < fullText.length; i += chunkSize) {
        const chunk = fullText.slice(i, i + chunkSize)
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`)
        await new Promise(resolve => setTimeout(resolve, 40))
      }
      res.write(`data: ${JSON.stringify({ type: 'done', chapter: updated, result, reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit, story_state_update: storyStateUpdate, ...pipelineResult })}\n\n`)
      res.end()
    } catch (error) {
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`)
        res.end()
        return
      }
      res.status(500).json({ error: String(error) })
    }
  })
}
