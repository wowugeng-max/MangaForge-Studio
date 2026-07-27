import type { Express } from 'express'
import {
  appendNovelRun,
  createNovelReview,
  listChapterVersions,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelWorldbuilding,
  updateNovelChapter,
} from '../../novel'
import { executeNovelAgent, previewNovelKnowledgeInjection } from '../../llm'
import { asArray, buildLLMResultDiagnostics, clampScore, extractLLMText, getNovelPayload, getSafetyPolicy, normalizeIssue, parseJsonLikePayload, safeJsonStringify } from '../novel-route-utils'
import { mergeProseQualityWithDeliveryRisks } from '../../novel-writing/prose-quality-delivery-link'
import { buildLiveContractChapterPatch, collectClosedBeatFamiliesFromChapters } from '../../novel-writing/closed-beat-canon'
import {
  COMPACT_REVISION_RETRY_MAX_TOKENS,
  type EditorRoutesContext,
  REVISION_MAX_TOKENS,
  applySurgicalRevisionPatch,
  buildChapterDeliveryRiskBrief,
  buildChapterQualityCard,
  buildCompactEditorRevisionPrompt,
  buildDeliveryRiskConvergenceReport,
  buildEditorReportPrompt,
  buildEditorRevisionPrompt,
  buildProseQualityRevisionReport,
  buildReviewAnnotationRepairTasks,
  buildReviewAnnotations,
  buildStorylineDiffDecisionRepairTasks,
  buildStorylineDiffDecisionReviewPayload,
  buildWorkflowRevisionContextBrief,
  createProseQualityReview,
  editorJson,
  focusDeliveryRiskBriefForRevision,
  isRevisionOutputTruncated,
  loadChapterBundle,
  shouldRetryRevisionPatch,
} from './builders'
import { revisionTextHash } from './revision-candidate-admission'
import { applySingleChapterStoryState, prepareSingleChapterStoryState } from './single-chapter-story-state'

export function registerNovelEditorQualityRoutes(app: Express, ctx: EditorRoutesContext) {
  app.post('/api/novel/chapters/:chapterId/story-state-sync', async (req, res) => {
    try {
      const loaded = await loadChapterBundle(ctx, Number(req.body.project_id || req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      const { activeWorkspace, project, chapter, reviews } = loaded
      const modelId = ctx.getStageModelId(project, 'review', Number(req.body.model_id || 0) || undefined)
      const beforeBrief = buildChapterDeliveryRiskBrief(chapter, reviews)
      const receipt = {
        source_run_id: req.body?.source_run_id == null ? null : Number(req.body.source_run_id),
        candidate_hash: String(req.body?.candidate_hash || revisionTextHash(String(chapter.chapter_text || ''))),
        chapter_id: chapter.id,
      }
      const storyStateUpdate = await prepareSingleChapterStoryState(ctx, {
        workspace: activeWorkspace,
        projectId: project.id,
        chapterId: chapter.id,
        modelId,
        receipt,
      }).then(preparedStoryState => applySingleChapterStoryState(ctx, {
          workspace: activeWorkspace,
          projectId: project.id,
          chapterId: chapter.id,
          modelId,
          receipt,
          prepared: preparedStoryState.prepared,
        }))
        .catch(error => ({ ok: false, error: String(error?.message || error) }))
      if ((storyStateUpdate as any)?.ok === false) {
        await appendNovelRun(activeWorkspace, {
          project_id: project.id,
          run_type: 'story_state',
          step_name: `chapter-${chapter.chapter_no}`,
          status: 'failed',
          input_ref: JSON.stringify({
            chapter_id: chapter.id,
            chapter_no: chapter.chapter_no,
            source: req.body?.source || 'manual_story_state_sync',
            source_review_id: req.body?.source_review_id || null,
            source_run_id: receipt.source_run_id,
            candidate_hash: receipt.candidate_hash,
          }),
          output_ref: JSON.stringify({ story_state_update: storyStateUpdate }),
        })
        return res.status(502).json({
          ok: false,
          chapter_id: chapter.id,
          error: (storyStateUpdate as any).error,
          story_state_update: storyStateUpdate,
        })
      }
      const [freshChapters, postReviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const freshChapter = freshChapters.find(item => item.id === chapter.id) || chapter
      const afterBrief = buildChapterDeliveryRiskBrief(freshChapter, postReviews)
      const convergenceReport = buildDeliveryRiskConvergenceReport({
        chapter: freshChapter,
        sourceReviewId: req.body?.source_review_id || null,
        before: beforeBrief,
        after: afterBrief,
      })
      const convergenceReview = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'delivery_risk_convergence',
        status: convergenceReport.status === 'cleared' || convergenceReport.status === 'improved' ? 'ok' : 'warn',
        summary: `${convergenceReport.label}，残留 ${convergenceReport.residual_count}`,
        issues: convergenceReport.next_actions,
        payload: JSON.stringify({
          chapter_id: freshChapter.id,
          chapter_no: freshChapter.chapter_no,
          source: req.body?.source || 'manual_story_state_sync',
          delivery_risk_convergence: convergenceReport,
          story_state_update: storyStateUpdate,
        }),
      })
      await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'story_state',
        step_name: `chapter-${chapter.chapter_no}`,
        status: 'success',
        input_ref: JSON.stringify({
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          source: req.body?.source || 'manual_story_state_sync',
          source_review_id: req.body?.source_review_id || null,
        }),
        output_ref: JSON.stringify({
          story_state_update: storyStateUpdate,
          delivery_risk_convergence: convergenceReport,
          delivery_risk_convergence_review_id: convergenceReview.id,
        }),
      })
      res.json({
        ok: true,
        chapter_id: chapter.id,
        story_state_update: storyStateUpdate,
        delivery_risk_convergence: convergenceReport,
        delivery_risk_convergence_review: convergenceReview,
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/prose-quality', async (req, res) => {
    try {
      const loaded = await loadChapterBundle(ctx, Number(req.body.project_id || req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      const { activeWorkspace, project, chapter } = loaded
      const quality = await createProseQualityReview(ctx, activeWorkspace, project, chapter, {
        model_id: req.body.model_id,
        source: req.body.source || 'manual_refresh',
        source_review_id: req.body.source_review_id || null,
        source_run_id: req.body.source_run_id == null ? null : Number(req.body.source_run_id),
        candidate_hash: req.body.candidate_hash || revisionTextHash(String(chapter.chapter_text || '')),
        current_chapter_only: true,
        max_tokens: 3000,
      })
      res.json({
        ok: true,
        review: quality.saved,
        self_check: quality.review,
        content_hash: quality.content_hash,
        context_package: quality.contextPackage,
        result: quality.result,
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/chapters/:chapterId/version-review', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.query.project_id || 0)
      const versions = await listChapterVersions(activeWorkspace, chapterId)
      const current = (await listNovelChapters(activeWorkspace, projectId)).find(ch => ch.id === chapterId)
      const previous = versions[0] || null
      const diff = ctx.diffTexts(previous?.chapter_text || '', current?.chapter_text || '')
      res.json({ ok: true, chapter: current, previous_version: previous, diff, recommendation: diff.similarity_score < 55 ? '修订幅度较大，建议人工复核剧情与设定连续性。' : '修订幅度可控。' })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/chapters/:chapterId/quality-card', async (req, res) => {
    try {
      const loaded = await loadChapterBundle(ctx, Number(req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      const { activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews } = loaded
      const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      res.json({ ok: true, quality_card: buildChapterQualityCard(chapter, contextPackage, reviews), context_package: contextPackage })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/version-merge', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || 0)
      const versions = await listChapterVersions(activeWorkspace, chapterId)
      const current = (await listNovelChapters(activeWorkspace, projectId)).find(ch => ch.id === chapterId)
      if (!current) return res.status(404).json({ error: 'chapter not found' })
      const version = versions.find(item => item.id === Number(req.body.version_id || 0))
      if (!version) return res.status(404).json({ error: 'version not found' })
      const currentParas = String(current.chapter_text || '').split(/\n+/)
      const versionParas = String(version.chapter_text || '').split(/\n+/)
      const choices = Array.isArray(req.body.choices) ? req.body.choices : []
      const max = Math.max(currentParas.length, versionParas.length)
      const merged = []
      for (let i = 0; i < max; i += 1) {
        const choice = choices.find((item: any) => Number(item.index) === i + 1)
        if (choice?.source === 'version') merged.push(versionParas[i] || '')
        else if (choice?.source === 'current') merged.push(currentParas[i] || '')
        else if (req.body.strategy === 'prefer_version') merged.push(versionParas[i] || currentParas[i] || '')
        else if (req.body.strategy === 'prefer_longer') merged.push(String(versionParas[i] || '').length > String(currentParas[i] || '').length ? (versionParas[i] || '') : (currentParas[i] || ''))
        else merged.push(currentParas[i] || versionParas[i] || '')
      }
      const chapterText = merged.join('\n\n').trim()
      if (req.body?.dry_run === true) return res.json({ ok: true, dry_run: true, merged_length: chapterText.length })
      const updated = await updateNovelChapter(activeWorkspace, chapterId, {
        chapter_text: chapterText,
        scene_breakdown: current.scene_breakdown || [],
        continuity_notes: [
          ...(current.continuity_notes || []),
          `已从版本 v${version.version_no} 段落级合并。`,
        ],
      }, { versionSource: 'repair' })
      res.json({ ok: true, chapter: updated, merged_length: chapterText.length })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/similarity-report', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || req.query.project_id || 0)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const chapter = (await listNovelChapters(activeWorkspace, projectId)).find(ch => ch.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const referenceReport = await ctx.buildReferenceUsageReport(activeWorkspace, project, '相似度检测', chapter.chapter_text || '')
      const quality = referenceReport.quality_assessment || {}
      const structuralRisk = clampScore(100 - Number(quality.originality_score || 100))
      const structuralReport = ctx.buildStructuralSimilarityReport(chapter, referenceReport)
      const combinedStructuralRisk = clampScore((structuralRisk * 0.45) + (Number(structuralReport.overall_structural_risk || 0) * 0.55))
      const copyHitCount = asArray(referenceReport.copy_guard?.hits).length
      const report = {
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        overall_risk_score: clampScore((copyHitCount * 12) + combinedStructuralRisk * 0.55),
        term_hits: referenceReport.copy_guard?.hits || [],
        copy_safety_score: quality.copy_safety_score,
        originality_score: quality.originality_score,
        structural_similarity_risk: combinedStructuralRisk,
        structural_report: structuralReport,
        decision: Number(quality.copy_safety_score || 100) < 75 || combinedStructuralRisk > 45 ? 'needs_rewrite' : 'pass',
        suggestions: [
          ...(referenceReport.copy_guard?.hits?.length ? ['替换疑似复用专名和证据词。'] : []),
          combinedStructuralRisk > 45 ? '调整场景目标、障碍来源、信息揭示顺序和角色选择，保留节奏功能但更换事件。' : '',
          ...structuralReport.suggestions,
        ].filter(Boolean),
      }
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'similarity_report',
        status: report.decision === 'pass' ? 'ok' : 'warn',
        summary: `相似度风险 ${report.overall_risk_score}`,
        issues: report.suggestions,
        payload: JSON.stringify({ report, reference_report: referenceReport }),
      })
      res.json({ ok: true, report, review: saved })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/reference-migration-plan', async (req, res) => {
    try {
      const loaded = await loadChapterBundle(ctx, Number(req.body.project_id || req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      const { activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews } = loaded
      const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      const preview = await previewNovelKnowledgeInjection(project, '正文创作')
      const safety = getSafetyPolicy(project)
      if (req.body?.dry_run === true || req.query.dry_run === '1') {
        const plan = ctx.buildReferenceMigrationDryPlan(project, chapter, preview, safety)
        return res.json({ ok: true, dry_run: true, plan, preview: { strength: preview.strength, entries: preview.entries?.length || 0 } })
      }
      const prompt = [
        '任务：生成参考作品迁移计划，只输出 JSON。',
        `项目：${project.title}`,
        '目标：在生成当前章节前，明确哪些只能学习，哪些必须禁止迁移。',
        '输出字段：allowed_learning_layers(array), cautious_layers(array), forbidden_transfer_layers(array), chapter_specific_plan, rewrite_boundaries, copy_guard_terms, generation_prompt_addendum。',
        '要求：只能学习节奏、结构、爽点安排、信息密度、情绪曲线；禁止迁移具体桥段、角色名、专有设定、原句、核心梗和事件顺序。',
        '【安全策略】',
        JSON.stringify(safety, null, 2),
        '【章节上下文包】',
        editorJson(contextPackage, 7000),
        '【参考注入预览】',
        editorJson({
          active_references: preview.active_references,
          entries: (preview.entries || []).slice(0, 20).map((entry: any) => ({
            title: entry.title,
            category: entry.category,
            source_project: entry.source_project,
            match_reason: entry.match_reason,
          })),
          warnings: preview.warnings,
        }, 7000),
      ].join('\n')
      const modelId = ctx.getStageModelId(project, 'safety', Number(req.body.model_id || 0) || undefined)
      const result = await executeNovelAgent('review-agent', project, { task: prompt }, { activeWorkspace, modelId: modelId ? String(modelId) : undefined, maxTokens: 4000, temperature: ctx.getStageTemperature(project, 'safety', 0.15), skipMemory: true })
      const plan = getNovelPayload(result)
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'reference_migration_plan',
        status: 'ok',
        summary: `第${chapter.chapter_no}章参考迁移计划`,
        issues: asArray(plan.forbidden_transfer_layers).map((item: any) => String(item)).slice(0, 20),
        payload: editorJson({ chapter_id: chapter.id, plan, context_package: contextPackage, preview }),
      })
      res.json({ ok: true, plan, review: saved, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
