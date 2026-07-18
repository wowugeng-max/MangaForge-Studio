import type { Express } from 'express'
import {
  appendNovelRun,
  createNovelOutline,
  createNovelReview,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelWorldbuilding,
  updateNovelChapter,
  updateNovelOutline,
  updateNovelProject,
  upsertNovelChapterByNumber,
} from '../../novel'
import { executeNovelAgent, generateNovelChapterProse } from '../../llm'
import { asArray, clampScore, compactPreviousChaptersForProse, compactText, deepMergeObjects, getNovelPayload, parseJsonLikePayload } from '../novel-route-utils'
import type {
  PlanningRoutesContext,
} from './builders'
import {
  applyFuture100SkeletonOutlines,
  applyRollingPlanOutlines,
  buildAbExperimentReport,
  buildCandidateProject,
  buildFuture100Prompt,
  buildFuture100SkeletonAudit,
  buildFuture100WritePreview,
  buildRegressionIssues,
  buildRegressionSampleSet,
  diffSandboxText,
  extractSandboxText,
  mergeSandboxParagraphs,
  normalizeFuture100Skeleton,
  normalizeRollingPlanPayload,
  runRegressionSuite,
  suggestedAbCandidateConfig,
} from './builders'

export function registerNovelPlanningAbRoutes(app: Express, ctx: PlanningRoutesContext) {
  app.get('/api/novel/projects/:id/ab-experiments', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const experiments = asArray(project.reference_config?.ab_experiments)
      res.json({
        ok: true,
        experiments,
        suggested_candidate_config: suggestedAbCandidateConfig(project, Number(req.query.model_id || 0) || undefined),
        current_snapshot: ctx.buildAgentConfigSnapshot(project, Number(req.query.model_id || 0) || undefined),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/ab-experiments', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const experiments = asArray(project.reference_config?.ab_experiments)
      const candidateConfig = req.body?.candidate_config || suggestedAbCandidateConfig(project, Number(req.body?.model_id || 0) || undefined)
      const candidateProject = buildCandidateProject(project, candidateConfig)
      const experiment = {
        id: `ab-${Date.now()}`,
        name: String(req.body?.name || `配置实验 ${experiments.length + 1}`),
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        current_snapshot: ctx.buildAgentConfigSnapshot(project, Number(req.body?.model_id || 0) || undefined),
        candidate_snapshot: ctx.buildAgentConfigSnapshot(candidateProject, Number(req.body?.model_id || 0) || undefined),
        candidate_config: candidateConfig,
        latest_report: null,
        history: [],
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), ab_experiments: [experiment, ...experiments].slice(0, 30) },
      } as any)
      res.json({ ok: true, experiment, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/ab-experiments/:experimentId/run', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const experiments = asArray(project.reference_config?.ab_experiments)
      const experiment = experiments.find((item: any) => item.id === req.params.experimentId)
      if (!experiment) return res.status(404).json({ error: 'experiment not found' })
      const [chapters, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      const issues = buildRegressionIssues(project, chapters)
      const suite = project.reference_config?.regression_suite || buildRegressionSampleSet(project, chapters, reviews, issues, Number(req.body?.max_samples || 10))
      const report = buildAbExperimentReport(project, experiment, suite, chapters, reviews, runs, issues, {
        modelId: Number(req.body?.model_id || 0) || undefined,
        buildAgentConfigSnapshot: ctx.buildAgentConfigSnapshot,
        buildProductionMetrics: ctx.buildProductionMetrics,
      })
      const nextExperiment = {
        ...experiment,
        status: report.decision === 'candidate_better' ? 'passed' : report.decision === 'candidate_risky' ? 'risky' : 'neutral',
        latest_report: report,
        history: [report, ...asArray(experiment.history)].slice(0, 10),
        updated_at: new Date().toISOString(),
      }
      const updatedExperiments = experiments.map((item: any) => item.id === experiment.id ? nextExperiment : item)
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'ab_experiment',
        status: nextExperiment.status === 'risky' ? 'warn' : 'ok',
        summary: `A/B 实验：${experiment.name}，决策 ${report.decision}`,
        issues: report.recommendations,
        payload: JSON.stringify({ report, experiment_id: experiment.id }),
      })
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'ab_experiment',
        step_name: experiment.id,
        status: nextExperiment.status === 'risky' ? 'warn' : 'success',
        input_ref: JSON.stringify(req.body || {}),
        output_ref: JSON.stringify({ report, review: saved }),
      })
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), ab_experiments: updatedExperiments },
      } as any)
      res.json({ ok: true, experiment: nextExperiment, report, review: saved, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/ab-experiments/:experimentId/promote', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const experiments = asArray(project.reference_config?.ab_experiments)
      const experiment = experiments.find((item: any) => item.id === req.params.experimentId)
      if (!experiment) return res.status(404).json({ error: 'experiment not found' })
      if (experiment.status === 'risky' && req.body?.force !== true) {
        return res.status(409).json({ error: '候选配置仍标记为风险，需传 force=true 才能提升。', experiment })
      }
      const nextReferenceConfig = deepMergeObjects(project.reference_config || {}, experiment.candidate_config || {})
      const nextExperiment = {
        ...experiment,
        status: 'promoted',
        promoted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...nextReferenceConfig,
          ab_experiments: experiments.map((item: any) => item.id === experiment.id ? nextExperiment : item),
          agent_prompt_config: {
            ...(nextReferenceConfig.agent_prompt_config || {}),
            version: Number(nextReferenceConfig.agent_prompt_config?.version || project.reference_config?.agent_prompt_config?.version || 1) + 1,
            updated_at: new Date().toISOString(),
          },
        },
      } as any)
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'ab_experiment',
        step_name: `${experiment.id}-promote`,
        status: 'success',
        output_ref: JSON.stringify({ promoted_experiment: nextExperiment, snapshot: ctx.buildAgentConfigSnapshot(updated, Number(req.body?.model_id || 0) || undefined) }),
      })
      res.json({ ok: true, experiment: nextExperiment, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/ab-experiments/:experimentId/sandbox', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const experiments = asArray(project.reference_config?.ab_experiments)
      const experiment = experiments.find((item: any) => item.id === req.params.experimentId)
      if (!experiment) return res.status(404).json({ error: 'experiment not found' })
      const candidateProject = buildCandidateProject(project, experiment.candidate_config || {})
      const preferredModelId = Number(req.body?.model_id || 0) || undefined
      const [chapters, worldbuilding, characters, outlines, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelWorldbuilding(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      const issues = buildRegressionIssues(project, chapters)
      const suite = project.reference_config?.regression_suite || buildRegressionSampleSet(project, chapters, reviews, issues, Number(req.body?.max_samples || 10))
      const chapterMap = new Map(chapters.map(chapter => [Number(chapter.id), chapter]))
      const selectedSamples = asArray(suite.samples)
        .filter((sample: any) => chapterMap.has(Number(sample.chapter_id)))
        .slice(0, Math.max(1, Math.min(3, Number(req.body?.sample_count || 2))))
      const drafts: any[] = []
      for (const sample of selectedSamples) {
        const chapter = chapterMap.get(Number(sample.chapter_id))
        if (!chapter) continue
        try {
          const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, candidateProject, chapter, chapters, worldbuilding, characters, outlines, reviews)
          const migrationPlan = await ctx.getReferenceMigrationPlanForChapter(activeWorkspace, candidateProject, chapter).catch(error => ({ error: String(error) }))
          const prevChapters = compactPreviousChaptersForProse(chapters, chapter.chapter_no)
          const stageModelId = ctx.getStageModelId(candidateProject, 'draft', preferredModelId)
          const result = await generateNovelChapterProse(candidateProject, chapter, {
            worldbuilding,
            characters,
            outline: outlines,
            prevChapters,
            contextPackage,
            migrationPlan,
            paragraphTask: ctx.buildParagraphProseContext(candidateProject, contextPackage, migrationPlan, chapter),
            prompt: `A/B 沙盒生成：请为第 ${chapter.chapter_no} 章生成候选正文，不要覆盖原文。`,
          } as any, { activeWorkspace, modelId: stageModelId ? String(stageModelId) : undefined, skipMemory: true })
          const extracted = extractSandboxText(result)
          if (!extracted.chapter_text) {
            drafts.push({
              chapter_id: chapter.id,
              chapter_no: chapter.chapter_no,
              title: chapter.title,
              status: 'failed',
              error: String((result as any).error || (result as any).fallbackReason || '模型未返回正文'),
            })
            continue
          }
          const diff = diffSandboxText(chapter.chapter_text || '', extracted.chapter_text)
          drafts.push({
            chapter_id: chapter.id,
            chapter_no: chapter.chapter_no,
            title: chapter.title,
            status: 'success',
            sample_reason: sample.reason || '',
            modelName: (result as any).modelName || '',
            modelId: stageModelId || null,
            candidate_text: extracted.chapter_text,
            candidate_preview: compactText(extracted.chapter_text, 420),
            scene_breakdown: extracted.scene_breakdown,
            continuity_notes: extracted.continuity_notes,
            diff,
            baseline_score: sample.baseline_score,
            projected_score: clampScore(Number(sample.baseline_score || 72) + (diff.delta_chars > 0 ? 2 : 0) - (diff.after_chars < 800 ? 8 : 0)),
          })
        } catch (draftError: any) {
          drafts.push({
            chapter_id: chapter.id,
            chapter_no: chapter.chapter_no,
            title: chapter.title,
            status: 'failed',
            error: String(draftError?.message || draftError),
          })
        }
      }
      const successCount = drafts.filter(item => item.status === 'success').length
      const report = {
        sandbox_id: `sandbox-${Date.now()}`,
        experiment_id: experiment.id,
        created_at: new Date().toISOString(),
        mode: 'candidate_draft_sandbox',
        config_snapshot: ctx.buildAgentConfigSnapshot(candidateProject, preferredModelId),
        sample_count: drafts.length,
        success_count: successCount,
        passed: drafts.length > 0 && successCount === drafts.length,
        drafts,
        recommendations: [
          successCount === 0 ? '候选配置未生成有效沙盒稿，不建议提升。' : '',
          drafts.some(item => item.status === 'success' && Number(item.diff?.after_chars || 0) < 800) ? '存在候选稿字数过短，需要检查正文提示词或模型输出限制。' : '',
          drafts.some(item => item.status === 'failed') ? '存在沙盒生成失败样本，建议先修正候选配置再重试。' : '',
          successCount > 0 ? '请人工对照候选稿预览和原文，确认文风、节奏、连续性后再提升配置。' : '',
        ].filter(Boolean),
        cost_baseline: ctx.buildProductionMetrics(chapters, reviews, runs),
      }
      const nextExperiment = {
        ...experiment,
        status: report.passed ? 'sandboxed' : 'sandbox_failed',
        latest_sandbox: report,
        history: [report, ...asArray(experiment.history)].slice(0, 10),
        updated_at: new Date().toISOString(),
      }
      const updatedExperiments = experiments.map((item: any) => item.id === experiment.id ? nextExperiment : item)
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'ab_sandbox_draft',
        status: report.passed ? 'ok' : 'warn',
        summary: `A/B 沙盒实写：${experiment.name}，成功 ${successCount}/${drafts.length}`,
        issues: report.recommendations,
        payload: JSON.stringify({ report, experiment_id: experiment.id }),
      })
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'ab_sandbox',
        step_name: experiment.id,
        status: report.passed ? 'success' : 'warn',
        input_ref: JSON.stringify(req.body || {}),
        output_ref: JSON.stringify({ report, review: saved }),
      })
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), ab_experiments: updatedExperiments },
      } as any)
      res.json({ ok: true, experiment: nextExperiment, report, review: saved, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/ab-experiments/:experimentId/sandbox/apply', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const experiments = asArray(project.reference_config?.ab_experiments)
      const experiment = experiments.find((item: any) => item.id === req.params.experimentId)
      if (!experiment) return res.status(404).json({ error: 'experiment not found' })
      const sandbox = experiment.latest_sandbox || {}
      const chapterId = Number(req.body?.chapter_id || 0)
      const draft = asArray(sandbox.drafts).find((item: any) => Number(item.chapter_id || 0) === chapterId)
      if (!draft) return res.status(404).json({ error: 'sandbox draft not found' })
      if (draft.status !== 'success' || !draft.candidate_text) return res.status(409).json({ error: '沙盒稿不可采纳', draft })
      const chapters = await listNovelChapters(activeWorkspace, project.id)
      const chapter = chapters.find(item => Number(item.id) === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })

      const mode = req.body?.mode === 'paragraphs' ? 'paragraphs' : 'full'
      const paragraphIndexes = asArray(req.body?.paragraph_indexes).map(Number).filter(item => Number.isInteger(item) && item >= 0)
      if (mode === 'paragraphs' && paragraphIndexes.length === 0) {
        return res.status(400).json({ error: '段落采纳至少选择一个段落。' })
      }
      const nextText = mode === 'paragraphs'
        ? mergeSandboxParagraphs(chapter.chapter_text || '', draft.candidate_text || '', paragraphIndexes)
        : String(draft.candidate_text || '')
      if (!nextText.trim()) return res.status(400).json({ error: '采纳后的正文为空。' })

      const diff = diffSandboxText(chapter.chapter_text || '', nextText)
      const updatedChapter = await updateNovelChapter(activeWorkspace, chapter.id, {
        chapter_text: nextText,
        scene_breakdown: mode === 'full' ? asArray(draft.scene_breakdown) : chapter.scene_breakdown,
        continuity_notes: mode === 'full' ? asArray(draft.continuity_notes) : chapter.continuity_notes,
        status: 'draft',
      }, { versionSource: 'agent_execute' })
      const application = {
        applied_id: `sandbox-apply-${Date.now()}`,
        sandbox_id: sandbox.sandbox_id || '',
        experiment_id: experiment.id,
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        title: chapter.title || '',
        mode,
        paragraph_indexes: mode === 'paragraphs' ? paragraphIndexes : [],
        diff,
        applied_at: new Date().toISOString(),
      }
      const nextExperiment = {
        ...experiment,
        latest_sandbox: {
          ...sandbox,
          applications: [application, ...asArray(sandbox.applications)].slice(0, 20),
        },
        updated_at: new Date().toISOString(),
      }
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'ab_sandbox_apply',
        status: 'ok',
        summary: `采纳 A/B 沙盒稿：第${chapter.chapter_no}章，${mode === 'full' ? '整章' : `${paragraphIndexes.length} 个段落`}`,
        issues: [],
        payload: JSON.stringify({ application, draft_preview: compactText(draft.candidate_text || '', 800) }),
      })
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'ab_sandbox_apply',
        step_name: `${experiment.id}-chapter-${chapter.chapter_no}`,
        status: 'success',
        input_ref: JSON.stringify({ chapter_id: chapter.id, mode, paragraph_indexes: paragraphIndexes }),
        output_ref: JSON.stringify({ application, review: saved, updated_chapter_id: updatedChapter?.id }),
      })
      const updatedProject = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: {
          ...(project.reference_config || {}),
          ab_experiments: experiments.map((item: any) => item.id === experiment.id ? nextExperiment : item),
        },
      } as any)
      res.json({ ok: true, chapter: updatedChapter, application, experiment: nextExperiment, review: saved, project: updatedProject })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

}
