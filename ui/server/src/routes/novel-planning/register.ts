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

export function registerNovelPlanningRoutes(app: Express, ctx: PlanningRoutesContext) {
  app.post('/api/novel/projects/:id/book-review', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, characters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const chapterBriefs = chapters
        .sort((a, b) => a.chapter_no - b.chapter_no)
        .map(ch => ({
          chapter_no: ch.chapter_no,
          title: ch.title,
          summary: ch.chapter_summary || compactText(ch.chapter_text || '', 220),
          ending_hook: ch.ending_hook || '',
          word_count: String(ch.chapter_text || '').replace(/\s/g, '').length,
          has_text: Boolean(ch.chapter_text),
        }))
      const prompt = [
        '任务：进行长篇小说全书/分卷级质量总检，只输出 JSON。',
        `项目：${project.title}`,
        '检查：主线是否停滞、角色成长是否断档、伏笔是否长期未回收、爽点密度是否下降、重复桥段/重复信息、分卷目标是否完成、是否偏离写作圣经。',
        '输出字段：overall_score, mainline, character_arcs, foreshadowing, payoff_density, repetition, volume_goals, bible_alignment, must_fix, next_actions。',
        '【写作圣经】',
        JSON.stringify(project.reference_config?.writing_bible || {}, null, 2).slice(0, 5000),
        '【大纲】',
        JSON.stringify(outlines, null, 2).slice(0, 5000),
        '【角色】',
        JSON.stringify(characters.map(char => ({ name: char.name, role_type: char.role_type, goal: char.goal, current_state: char.current_state })), null, 2).slice(0, 5000),
        '【章节摘要】',
        JSON.stringify(chapterBriefs, null, 2).slice(0, 12000),
        '【近期质检】',
        JSON.stringify(reviews.slice(0, 12).map(item => ({ type: item.review_type, status: item.status, summary: item.summary, issues: item.issues })), null, 2).slice(0, 5000),
      ].join('\n')
      const modelId = ctx.getStageModelId(project, 'review', Number(req.body.model_id || 0) || undefined)
      const result = await executeNovelAgent('review-agent', project, { task: prompt }, { activeWorkspace, modelId: modelId ? String(modelId) : undefined, maxTokens: 6000, temperature: ctx.getStageTemperature(project, 'review', 0.2), skipMemory: true })
      const report = getNovelPayload(result)
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'book_review',
        status: Number(report.overall_score || 0) >= 78 ? 'ok' : 'warn',
        summary: `全书总检评分 ${report.overall_score ?? '-'}`,
        issues: asArray(report.must_fix).map((item: any) => String(item)),
        payload: JSON.stringify({ report, chapter_count: chapters.length, written_count: chapters.filter(ch => ch.chapter_text).length }),
      })
      await appendNovelRun(activeWorkspace, { project_id: project.id, run_type: 'book_review', step_name: 'global', status: 'success', output_ref: JSON.stringify({ report, review: saved }) })
      res.json({ ok: true, report, review: saved, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/topic-validation', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const prompt = [
        '任务：进行商业网文选题验证，只输出 JSON。',
        `项目：${project.title}`,
        `题材：${project.genre || ''}`,
        `简介：${project.synopsis || ''}`,
        `目标读者：${project.target_audience || ''}`,
        '输出：overall_score, target_reader, market_position, selling_points, first_10_chapter_retention_risks, competition_risks, three_directions(array), recommendation。',
      ].join('\n')
      const modelId = ctx.getStageModelId(project, 'outline', Number(req.body.model_id || 0) || undefined)
      const result = await executeNovelAgent('market-agent', project, { task: prompt }, { activeWorkspace, modelId: modelId ? String(modelId) : undefined, maxTokens: 5000, temperature: 0.45, skipMemory: true })
      const report = getNovelPayload(result)
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'topic_validation',
        status: Number(report.overall_score || 0) >= 75 ? 'ok' : 'warn',
        summary: `选题验证评分 ${report.overall_score ?? '-'}`,
        issues: asArray(report.competition_risks).concat(asArray(report.first_10_chapter_retention_risks)).map((item: any) => String(item)),
        payload: JSON.stringify({ report }),
      })
      res.json({ ok: true, report, review: saved, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/benchmark', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const sample = chapters.find(ch => ch.chapter_summary || ch.chapter_goal) || chapters[0] || null
      const proseScores = reviews.filter(item => item.review_type === 'prose_quality').map(item => Number((parseJsonLikePayload(item.payload) || {}).self_check?.review?.score || 0)).filter(Boolean)
      const report = {
        benchmark_id: `bench-${Date.now()}`,
        sample_chapter: sample ? { id: sample.id, chapter_no: sample.chapter_no, title: sample.title, goal: sample.chapter_goal, summary: sample.chapter_summary } : null,
        current_strategy: project.reference_config?.model_strategy || ctx.getModelStrategy(project, Number(req.body.model_id || 0) || undefined),
        quality_baseline: {
          average_score: proseScores.length ? Math.round(proseScores.reduce((sum, score) => sum + score, 0) / proseScores.length) : null,
          sample_count: proseScores.length,
        },
        cost_baseline: ctx.buildProductionMetrics(chapters, reviews, await listNovelRuns(activeWorkspace, project.id)),
        recommendations: [
          proseScores.length < 3 ? '样本不足，建议至少生成 3 章后再做模型/提示词 A/B 对比。' : '',
          proseScores.length && Math.min(...proseScores) < 78 ? '存在低分章节，优先优化审稿修订提示词。' : '',
          !project.reference_config?.agent_prompt_config ? '尚未配置 Agent 提示词版本，可先建立项目级提示词基线。' : '',
        ].filter(Boolean),
      }
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'quality_benchmark',
        status: 'ok',
        summary: `质量基准：样本 ${proseScores.length}，均分 ${report.quality_baseline.average_score ?? '-'}`,
        issues: report.recommendations,
        payload: JSON.stringify({ report }),
      })
      await appendNovelRun(activeWorkspace, { project_id: project.id, run_type: 'quality_benchmark', step_name: 'baseline', status: 'success', output_ref: JSON.stringify({ report, review: saved }) })
      res.json({ ok: true, report, review: saved })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/regression-suite', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const issues = buildRegressionIssues(project, chapters)
      const storedSuite = project.reference_config?.regression_suite || null
      const suggestedSuite = buildRegressionSampleSet(project, chapters, reviews, issues, Number(req.query.max_samples || 10))
      const runs = reviews
        .filter(review => review.review_type === 'regression_benchmark')
        .map(review => ({ review, payload: parseJsonLikePayload(review.payload) || {} }))
        .sort((a, b) => String(b.review.created_at || '').localeCompare(String(a.review.created_at || '')))
      res.json({
        ok: true,
        suite: storedSuite,
        suggested_suite: suggestedSuite,
        latest_run: runs[0]?.payload?.report || null,
        history: runs.slice(0, 10).map(item => item.payload.report || {}),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/regression-suite', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const issues = buildRegressionIssues(project, chapters)
      const autoSuite = buildRegressionSampleSet(project, chapters, reviews, issues, Number(req.body?.max_samples || 10))
      const incoming = req.body?.suite || {}
      const suite = {
        ...autoSuite,
        ...incoming,
        suite_id: incoming.suite_id || autoSuite.suite_id,
        updated_at: new Date().toISOString(),
        samples: asArray(incoming.samples).length ? incoming.samples : autoSuite.samples,
        policy: { ...(autoSuite.policy || {}), ...(incoming.policy || {}) },
      }
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), regression_suite: suite },
      } as any)
      res.json({ ok: true, suite, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/regression-suite/run', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      const issues = buildRegressionIssues(project, chapters)
      const suite = project.reference_config?.regression_suite || buildRegressionSampleSet(project, chapters, reviews, issues, Number(req.body?.max_samples || 10))
      const report = runRegressionSuite(project, suite, chapters, reviews, runs, issues, {
        modelId: Number(req.body?.model_id || 0) || undefined,
        buildAgentConfigSnapshot: ctx.buildAgentConfigSnapshot,
        buildProductionMetrics: ctx.buildProductionMetrics,
      })
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'regression_benchmark',
        status: report.passed ? 'ok' : 'warn',
        summary: `回归基准：样本 ${report.sample_count}，均分 ${report.average_score}，变化 ${report.delta_average_score >= 0 ? '+' : ''}${report.delta_average_score}`,
        issues: report.recommendations,
        payload: JSON.stringify({ report }),
      })
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'regression_benchmark',
        step_name: suite.suite_id || 'suite',
        status: report.passed ? 'success' : 'warn',
        input_ref: JSON.stringify(req.body || {}),
        output_ref: JSON.stringify({ report, review: saved }),
      })
      res.json({ ok: true, report, review: saved })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

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

  app.post('/api/novel/projects/:id/rolling-plan', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const fromChapter = Number(req.body.from_chapter || chapters.find(ch => !ch.chapter_text)?.chapter_no || 1)
      const horizon = Math.max(3, Math.min(30, Number(req.body.horizon || 10)))
      const rollingPlanIntent = req.body.rolling_plan_intent || req.body.rollingPlanIntent || null
      const targetChapters = chapters.filter(ch => ch.chapter_no >= fromChapter).slice(0, horizon)
      const prompt = [
        '任务：生成未来章节滚动规划，只输出 JSON。',
        `项目：${project.title}`,
        `从第 ${fromChapter} 章开始，规划未来 ${horizon} 章。`,
        '需要输出：rolling_plan(array: chapter_no,title,chapter_goal,conflict,payoff,reader_payoff,foreshadowing_to_use,ending_hook,signature_scene,scene_repair_target,storyline_service), volume_remaining_goals, foreshadowing_recovery_plan, character_growth_nodes, risk_notes。',
        '【滚动规划意图】',
        rollingPlanIntent
          ? JSON.stringify(rollingPlanIntent, null, 2).slice(0, 4000)
          : '常规未来10章滚动规划。',
        rollingPlanIntent?.source === 'batch_brief_repair'
          ? '本次是批次任务书补齐：优先修复缺逐章职责、冲突落点、主线推进或章末钩子；输出的 rolling_plan 必须让目标批次可检查、可小批量连写。'
          : '',
        rollingPlanIntent?.source === 'recent_fatigue_repair'
          ? [
              '本次是近10章疲劳修复：优先根据 recent_fatigue_radar 中的 warn 信号做未来章节差异化规划。',
              '具体要求：更换冲突来源；更换回报/爽点形态；更换章末追读问题；更换标志性场面；每章必须在 chapter_goal/conflict/payoff/ending_hook 中体现差异化职责。',
              '如果 warn 信号包含 IP场面覆盖 或 场面新鲜度不足，必须生成“标志性场面补位”：至少指定 1-3 个补位章节；每个补位章节在 signature_scene 写明本章要补的标志性场面，在 scene_repair_target 写明修复哪个覆盖缺口，在 storyline_service 写明服务的主线推进或爽点回报。',
              '标志性场面必须是可被读者记住、可短剧/漫剧化的空间冲突、反转动作、规则压迫或视觉化爽点；不能只写“增加场面新鲜度”这类抽象说明。',
              '边界：不得改变主线方向、长期设定和已确认剧情线；只能调整后续章节的表达节奏、压迫来源、回报形态和场面安排。',
            ].join('\n')
          : '',
        '【写作圣经/状态机】',
        JSON.stringify({ writing_bible: project.reference_config?.writing_bible || {}, story_state: project.reference_config?.story_state || {} }, null, 2).slice(0, 6000),
        '【分卷/大纲】',
        JSON.stringify(outlines, null, 2).slice(0, 6000),
        '【待规划章节】',
        JSON.stringify(targetChapters.map(ch => ({ chapter_no: ch.chapter_no, title: ch.title, goal: ch.chapter_goal, summary: ch.chapter_summary, ending_hook: ch.ending_hook })), null, 2).slice(0, 6000),
        '【近期审稿】',
        JSON.stringify(reviews.slice(0, 8).map(item => ({ type: item.review_type, summary: item.summary, issues: item.issues })), null, 2).slice(0, 3000),
      ].join('\n')
      const modelId = ctx.getStageModelId(project, 'outline', Number(req.body.model_id || 0) || undefined)
      const result = await executeNovelAgent('outline-agent', project, { task: prompt }, { activeWorkspace, modelId: modelId ? String(modelId) : undefined, maxTokens: 6000, temperature: ctx.getStageTemperature(project, 'outline', 0.45), skipMemory: true })
      const report = getNovelPayload(result)
      const rollingPlan = normalizeRollingPlanPayload(report, fromChapter, horizon)
      const shouldWriteOutlines = req.body?.write_rolling_outlines !== false
      const applied = shouldWriteOutlines
        ? await applyRollingPlanOutlines(activeWorkspace, project, outlines, rollingPlan, rollingPlanIntent)
        : {
            writtenOutlines: [],
            writtenChapters: [],
            writeSummary: { created: 0, updated: 0, skipped: rollingPlan.length },
            chapterWriteSummary: { created: 0, updated: 0, skipped: rollingPlan.length },
          }
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'rolling_plan',
        status: 'ok',
        summary: `滚动规划：第${fromChapter}章起 ${horizon} 章${shouldWriteOutlines ? `，大纲创建 ${applied.writeSummary.created}，章节占位创建 ${applied.chapterWriteSummary.created}` : ''}`,
        issues: asArray(report.risk_notes).map((item: any) => String(item)),
        payload: JSON.stringify({
          report,
          rolling_plan: rollingPlan,
          from_chapter: fromChapter,
          horizon,
          rolling_plan_intent: rollingPlanIntent,
          written_outline_ids: applied.writtenOutlines.map((item: any) => item.id),
          written_chapter_ids: applied.writtenChapters.map((item: any) => item.id),
          write_summary: applied.writeSummary,
          chapter_write_summary: applied.chapterWriteSummary,
        }),
      })
      res.json({
        ok: true,
        report,
        rolling_plan: rollingPlan,
        review: saved,
        written_outlines: applied.writtenOutlines,
        written_chapters: applied.writtenChapters,
        write_summary: applied.writeSummary,
        chapter_write_summary: applied.chapterWriteSummary,
        result,
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/future-100-skeleton', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const report = buildFuture100SkeletonAudit(project, chapters, outlines, reviews, {
        from_chapter: Number(req.query.from_chapter || 0) || undefined,
        horizon: Number(req.query.horizon || 100) || 100,
      })
      res.json({ ok: true, report })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/future-100-skeleton/generate', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const modelId = ctx.getStageModelId(project, 'outline', Number(req.body.model_id || 0) || undefined)
      if (!modelId) return res.status(400).json({ error: 'model_id is required' })
      const [chapters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const horizon = Math.max(20, Math.min(120, Number(req.body.horizon || 100)))
      const audit = buildFuture100SkeletonAudit(project, chapters, outlines, reviews, {
        from_chapter: Number(req.body.from_chapter || 0) || undefined,
        horizon,
      })
      const prompt = buildFuture100Prompt(project, chapters, outlines, reviews, audit.from_chapter, horizon, audit)
      const result = await executeNovelAgent('outline-agent', project, { task: prompt }, {
        activeWorkspace,
        modelId: String(modelId),
        maxTokens: 12000,
        temperature: ctx.getStageTemperature(project, 'outline', 0.45),
        skipMemory: true,
      })
      const payload = getNovelPayload(result)
      const skeleton = normalizeFuture100Skeleton(payload, audit.from_chapter, horizon)
      const writtenOutlines: any[] = []
      const writeMode = req.body?.write_mode === 'append' || req.body?.overwrite_outline === false ? 'append' : 'upsert'
      const writeSummary = { mode: writeMode, created: 0, updated: 0, skipped: 0 }
      let writePreview = buildFuture100WritePreview(outlines, skeleton, { write_mode: writeMode })
      if (req.body?.write_outline === true) {
        const applied = await applyFuture100SkeletonOutlines(activeWorkspace, project, outlines, skeleton, { write_mode: writeMode })
        writtenOutlines.push(...applied.writtenOutlines)
        writeSummary.created = applied.writeSummary.created
        writeSummary.updated = applied.writeSummary.updated
        writeSummary.skipped = applied.writeSummary.skipped
        writePreview = applied.writePreview
      }
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'future_100_skeleton',
        status: skeleton.length >= Math.min(80, horizon) ? 'ok' : 'warn',
        summary: `未来100章骨架：生成 ${skeleton.length}/${horizon} 章${req.body?.write_outline === true ? `，创建 ${writeSummary.created}，更新 ${writeSummary.updated}` : ''}`,
        issues: asArray(payload?.risk_notes).slice(0, 30).map((item: any) => String(item)),
        payload: JSON.stringify({ audit, skeleton, payload, written_outline_ids: writtenOutlines.map(item => item.id), write_summary: writeSummary, write_preview: writePreview }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'future_100_skeleton',
        step_name: `future-100-${audit.from_chapter}-${audit.from_chapter + horizon - 1}`,
        status: (result as any).error ? 'warn' : 'success',
        input_ref: JSON.stringify({ model_id: modelId, from_chapter: audit.from_chapter, horizon, write_outline: req.body?.write_outline === true, write_mode: writeMode }),
        output_ref: JSON.stringify({ audit, skeleton, review_id: review.id, written_outline_count: writtenOutlines.length, write_summary: writeSummary, write_preview: writePreview, modelName: (result as any).modelName }),
        error_message: (result as any).error || '',
      })
      res.json({ ok: true, audit, skeleton, payload, review, run, written_outlines: writtenOutlines, write_summary: writeSummary, write_preview: writePreview, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/future-100-skeleton/apply', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const skeleton = normalizeFuture100Skeleton({ skeleton: req.body?.skeleton || [] }, Number(req.body?.from_chapter || 1), Math.max(20, Math.min(120, Number(req.body?.horizon || 100))))
      if (!skeleton.length) return res.status(400).json({ error: 'skeleton is required' })
      const outlines = await listNovelOutlines(activeWorkspace, project.id)
      const applied = await applyFuture100SkeletonOutlines(activeWorkspace, project, outlines, skeleton, {
        write_mode: req.body?.write_mode || 'upsert',
        selected_chapter_nos: req.body?.selected_chapter_nos,
      })
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'future_100_skeleton_apply',
        status: applied.writeSummary.created + applied.writeSummary.updated > 0 ? 'ok' : 'warn',
        summary: `应用未来100章骨架：创建 ${applied.writeSummary.created}，更新 ${applied.writeSummary.updated}，跳过 ${applied.writeSummary.skipped}`,
        issues: [],
        payload: JSON.stringify({ skeleton, written_outline_ids: applied.writtenOutlines.map(item => item.id), write_summary: applied.writeSummary, write_preview: applied.writePreview }),
      })
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'future_100_skeleton_apply',
        step_name: `future-100-apply-${skeleton[0]?.chapter_no || 'start'}-${skeleton[skeleton.length - 1]?.chapter_no || 'end'}`,
        status: 'success',
        input_ref: JSON.stringify({ write_mode: req.body?.write_mode || 'upsert', selected_chapter_nos: req.body?.selected_chapter_nos || [] }),
        output_ref: JSON.stringify({ review_id: review.id, written_outline_count: applied.writtenOutlines.length, write_summary: applied.writeSummary, write_preview: applied.writePreview }),
      })
      const [chapters, nextOutlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const audit = buildFuture100SkeletonAudit(project, chapters, nextOutlines, reviews, {
        from_chapter: skeleton[0]?.chapter_no || Number(req.body?.from_chapter || 1),
        horizon: skeleton.length,
      })
      res.json({ ok: true, audit, skeleton, review, run, written_outlines: applied.writtenOutlines, write_summary: applied.writeSummary, write_preview: applied.writePreview })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/volume-control/sync', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const reviews = await listNovelReviews(activeWorkspace, project.id)
      const latestRolling = reviews
        .filter(item => item.review_type === 'rolling_plan')
        .map(item => ({ review: item, payload: parseJsonLikePayload(item.payload) || {} }))
        .find(item => item.payload.report)
      const report = req.body?.report || latestRolling?.payload?.report || {}
      const volumeControl = {
        ...(project.reference_config?.volume_control || {}),
        volume_remaining_goals: report.volume_remaining_goals || req.body?.volume_remaining_goals || [],
        foreshadowing_recovery_plan: report.foreshadowing_recovery_plan || req.body?.foreshadowing_recovery_plan || [],
        character_growth_nodes: report.character_growth_nodes || req.body?.character_growth_nodes || [],
        synced_from_review_id: latestRolling?.review?.id || null,
        synced_at: new Date().toISOString(),
      }
      if (req.body?.dry_run === true) return res.json({ ok: true, dry_run: true, volume_control: volumeControl })
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), volume_control: volumeControl },
      } as any)
      await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'volume_control',
        status: 'ok',
        summary: '卷级控制已同步滚动规划',
        issues: [],
        payload: JSON.stringify({ volume_control: volumeControl }),
      })
      res.json({ ok: true, volume_control: volumeControl, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/model-strategy', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true, strategy: project.reference_config?.model_strategy || ctx.getModelStrategy(project, Number(req.query.model_id || 0) || undefined) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/model-strategy', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const strategy = req.body?.strategy || ctx.getModelStrategy(project, Number(req.body?.model_id || 0) || undefined)
      const updated = await updateNovelProject(activeWorkspace, project.id, {
        reference_config: { ...(project.reference_config || {}), model_strategy: strategy },
      } as any)
      res.json({ ok: true, strategy, project: updated })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/incubate-original', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const modelId = Number(req.body.model_id || 0) || undefined
      const chapterCount = Math.max(5, Math.min(80, Number(req.body.chapter_count || 30)))
      const variantCount = Math.max(1, Math.min(5, Number(req.body.variant_count || 1)))
      const stageModelId = ctx.getStageModelId(project, 'incubation', modelId)
      const result = await executeNovelAgent('outline-agent', project, {
        task: ctx.buildOriginalIncubatorPrompt(project, { ...req.body, chapter_count: chapterCount, variant_count: variantCount }),
      }, { activeWorkspace, modelId: stageModelId ? String(stageModelId) : undefined, maxTokens: 9000, temperature: ctx.getStageTemperature(project, 'incubation', 0.65), skipMemory: true })
      const payload = ctx.normalizeIncubatorPayload(getNovelPayload(result), chapterCount)
      if ((result as any).error || !ctx.isUsableIncubatorPayload(payload)) {
        await appendNovelRun(activeWorkspace, {
          project_id: project.id,
          run_type: 'original_incubation',
          step_name: 'preview',
          status: 'failed',
          input_ref: JSON.stringify(req.body || {}),
          output_ref: JSON.stringify({ payload, modelName: (result as any).modelName, raw_preview: String((result as any).content || (result as any).raw?.choices?.[0]?.message?.content || '').slice(0, 3000) }),
          error_message: (result as any).error || '模型未返回有效原创孵化方案',
        })
        return res.status(502).json({
          error: (result as any).error || '模型未返回有效原创孵化方案，请重试或切换模型。',
          error_code: 'ORIGINAL_INCUBATION_EMPTY',
          payload,
          raw_preview: String((result as any).content || (result as any).raw?.choices?.[0]?.message?.content || '').slice(0, 3000),
        })
      }
      let updatedProject: any = null
      if (req.body.auto_store !== false) {
        updatedProject = await ctx.storeOriginalIncubatorPayload(activeWorkspace, project, payload)
      }
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'original_incubation',
        step_name: req.body.auto_store === false ? 'preview' : 'foundation',
        status: 'success',
        input_ref: JSON.stringify(req.body || {}),
        output_ref: JSON.stringify({ payload, modelName: (result as any).modelName }),
      })
      res.json({ ok: true, payload, run, project: updatedProject, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/incubate-original/commit', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const payload = ctx.normalizeIncubatorPayload(req.body?.payload || project.reference_config?.original_incubator_last_payload || {}, Number(req.body?.chapter_count || 80))
      const updated = await ctx.storeOriginalIncubatorPayload(activeWorkspace, project, payload)
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'original_incubation',
        step_name: 'commit',
        status: 'success',
        input_ref: JSON.stringify({ confirmed: true }),
        output_ref: JSON.stringify({ payload }),
      })
      res.json({ ok: true, project: updated, run })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
