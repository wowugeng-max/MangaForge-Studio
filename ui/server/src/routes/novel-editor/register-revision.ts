import type { Express } from 'express'
import { createHash } from 'crypto'
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
import { collectPlanAlignmentPatchesAfterProseChange, collectProjectPlanAlignmentPatches } from '../../novel-writing/chapter-plan-from-prose'
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
  syncStoryStateFromChapter,
} from './builders'

export function registerNovelEditorRevisionRoutes(app: Express, ctx: EditorRoutesContext) {
  app.post('/api/novel/chapters/:chapterId/editor-report', async (req, res) => {
    try {
      const loaded = await loadChapterBundle(ctx, Number(req.body.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      const { activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews } = loaded
      const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      const latestQuality = reviews.filter(item => item.review_type === 'prose_quality').slice(-1)[0] || null
      const latestReference = reviews.filter(item => item.review_type === 'reference_usage').slice(-1)[0] || null
      const deliveryRiskBrief = buildChapterDeliveryRiskBrief(chapter, reviews)
      const prompt = buildEditorReportPrompt({
        project,
        contextPackage,
        chapter,
        latestQuality,
        latestReference,
        deliveryRiskBrief,
      })
      const result = await executeNovelAgent('review-agent', project, { task: prompt }, { activeWorkspace, modelId: req.body.model_id ? String(req.body.model_id) : undefined, maxTokens: 5000, temperature: 0.2, skipMemory: true })
      const report = getNovelPayload(result)
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'editor_report',
        status: Number(report.overall_score || 0) >= 78 ? 'ok' : 'warn',
        summary: `编辑报告评分 ${report.overall_score ?? '-'}`,
        issues: asArray(report.must_fix).map((item: any) => String(item)),
        payload: editorJson({ chapter_id: chapter.id, report, context_package: contextPackage, delivery_risk_brief: deliveryRiskBrief }),
      })
      res.json({ ok: true, report, review: saved, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/reviews/:reviewId/apply-revision', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id || 0)
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const reviews = await listNovelReviews(activeWorkspace, projectId)
      const review = reviews.find(item => item.id === Number(req.params.reviewId))
      if (!review) return res.status(404).json({ error: 'review not found' })
      const payload = parseJsonLikePayload(review.payload) || {}
      const selfCheckReview = payload.self_check?.review || {}
      const report = payload.report || (review.review_type === 'prose_quality'
        ? buildProseQualityRevisionReport(selfCheckReview)
        : {})
      const chapterId = Number(payload.chapter_id || req.body.chapter_id || 0)
      const chapters = await listNovelChapters(activeWorkspace, projectId)
      const chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const [worldbuilding, characters, outlines] = await Promise.all([
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
      ])
      const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      const revisionMode = String(req.body.revision_mode || 'from_report')
      const deliveryRiskBrief = focusDeliveryRiskBriefForRevision(
        buildChapterDeliveryRiskBrief(chapter, reviews),
        report,
      )
      const revisionStrategy = String(report?.revision_strategy || 'surgical_patch')
      const structuralRewrite = revisionStrategy === 'structural_rewrite'
      const openingStructuralPatch = revisionStrategy === 'opening_structural_patch'
      const originalChapterChars = String(chapter.chapter_text || '').length
      // Full structural rewrite needs ~2x chapter chars in tokens once JSON-escaped; opening patch stays small.
      const revisionMaxTokens = structuralRewrite
        ? Math.min(28000, Math.max(12000, Math.ceil(originalChapterChars * 2.4) + 2500))
        : openingStructuralPatch
          ? Math.max(REVISION_MAX_TOKENS, 6000)
          : REVISION_MAX_TOKENS
      const prompt = buildEditorRevisionPrompt({
        project,
        chapter,
        contextPackage,
        report,
        deliveryRiskBrief,
        revisionMode,
        userPrompt: req.body.prompt,
      })
      const modelId = ctx.getStageModelId(project, 'revise', Number(req.body.model_id || 0) || undefined)
      let result = await executeNovelAgent('prose-agent', project, { task: prompt }, {
        activeWorkspace,
        modelId: modelId ? String(modelId) : undefined,
        maxTokens: revisionMaxTokens,
        temperature: ctx.getStageTemperature(project, 'revise', (structuralRewrite || openingStructuralPatch) ? 0.5 : 0.62),
        responseMode: 'stream',
        skipMemory: true,
      })
      if ((result as any).error) {
        await appendNovelRun(activeWorkspace, {
          project_id: projectId,
          run_type: 'editor_revision',
          step_name: `chapter-${chapter.chapter_no}`,
          status: 'failed',
          input_ref: JSON.stringify({ review_id: review.id, revision_strategy: report?.revision_strategy || 'surgical_patch' }),
          output_ref: JSON.stringify({ error: (result as any).error, stage: 'initial_llm' }),
        }).catch(() => null)
        return res.status(502).json({ error: (result as any).error, result })
      }
      let resultPayload = getNovelPayload(result)
      let patchResult = applySurgicalRevisionPatch(String(chapter.chapter_text || ''), resultPayload)
      let nextText = patchResult.chapterText
      if (!nextText || (!patchResult.applied.length && !resultPayload?.chapter_text && !resultPayload?.prose_chapters?.[0]?.chapter_text)) {
        if (shouldRetryRevisionPatch(resultPayload, patchResult, result) || structuralRewrite || openingStructuralPatch) {
          const retryReason = isRevisionOutputTruncated(result) ? 'initial_output_truncated' : 'initial_patch_not_applicable'
          const retryReport = (structuralRewrite && isRevisionOutputTruncated(result))
            ? { ...report, revision_strategy: 'opening_structural_patch' }
            : report
          const retryPrompt = buildCompactEditorRevisionPrompt({
            project,
            chapter,
            report: retryReport,
            deliveryRiskBrief,
            revisionMode,
            userPrompt: req.body.prompt,
            previousOutputPreview: extractLLMText(result),
          })
          const retryResult = await executeNovelAgent('prose-agent', project, { task: retryPrompt }, {
            activeWorkspace,
            modelId: modelId ? String(modelId) : undefined,
            maxTokens: structuralRewrite
              ? Math.min(16000, Math.max(COMPACT_REVISION_RETRY_MAX_TOKENS, Math.ceil(originalChapterChars * 1.2) + 2000))
              : Math.max(COMPACT_REVISION_RETRY_MAX_TOKENS, openingStructuralPatch ? 6000 : COMPACT_REVISION_RETRY_MAX_TOKENS),
            temperature: (structuralRewrite || openingStructuralPatch) ? 0.35 : 0.15,
            responseMode: 'stream',
            skipMemory: true,
          })
          if (!(retryResult as any).error) {
            const retryPayload = getNovelPayload(retryResult)
            const retryPatchResult = applySurgicalRevisionPatch(String(chapter.chapter_text || ''), retryPayload)
            const retryNextText = retryPatchResult.chapterText
            if (retryNextText && (retryPatchResult.applied.length || retryPayload?.chapter_text || retryPayload?.prose_chapters?.[0]?.chapter_text)) {
              result = {
                ...(retryResult as any),
                revision_retry: {
                  reason: retryReason,
                  source_finish_reason: (result as any)?.finish_reason || (result as any)?.raw?.finish_reason || (result as any)?.raw?.stop_reason || '',
                },
              }
              resultPayload = retryPayload
              patchResult = {
                ...retryPatchResult,
                retry: 'revision_retry',
              }
              nextText = retryNextText
            } else {
              await appendNovelRun(activeWorkspace, {
                project_id: projectId,
                run_type: 'editor_revision',
                step_name: `chapter-${chapter.chapter_no}`,
                status: 'failed',
                input_ref: JSON.stringify({ review_id: review.id, revision_strategy: report?.revision_strategy || 'surgical_patch', retry: true }),
                output_ref: JSON.stringify({
                  error_code: isRevisionOutputTruncated(retryResult) ? 'REVISION_RETRY_OUTPUT_TRUNCATED' : 'REVISION_RETRY_NO_APPLICABLE_PATCH',
                  patch_applied: retryPatchResult?.applied?.length || 0,
                }),
              }).catch(() => null)
              return res.status(502).json({
                error: isRevisionOutputTruncated(retryResult) ? '修订重试输出仍被截断，未形成完整 JSON 补丁' : '修订重试未返回可应用补丁',
                error_code: isRevisionOutputTruncated(retryResult) ? 'REVISION_RETRY_OUTPUT_TRUNCATED' : 'REVISION_RETRY_NO_APPLICABLE_PATCH',
                result,
                retry_result: retryResult,
                llm_diagnostics: buildLLMResultDiagnostics(result),
                retry_llm_diagnostics: buildLLMResultDiagnostics(retryResult),
                patch_result: retryPatchResult,
              })
            }
          } else {
            return res.status(502).json({ error: (retryResult as any).error, result, retry_result: retryResult })
          }
        }
      }
      if (!nextText || (!patchResult.applied.length && !resultPayload?.chapter_text && !resultPayload?.prose_chapters?.[0]?.chapter_text)) {
        if (isRevisionOutputTruncated(result)) {
          await appendNovelRun(activeWorkspace, {
            project_id: projectId,
            run_type: 'editor_revision',
            step_name: `chapter-${chapter.chapter_no}`,
            status: 'failed',
            input_ref: JSON.stringify({ review_id: review.id, revision_strategy: report?.revision_strategy || 'surgical_patch' }),
            output_ref: JSON.stringify({ error_code: 'REVISION_OUTPUT_TRUNCATED', patch_applied: patchResult?.applied?.length || 0, patch_unapplied: patchResult?.unapplied?.length || 0 }),
          }).catch(() => null)
          return res.status(502).json({
            error: '修订输出被截断，未形成完整 JSON 补丁',
            error_code: 'REVISION_OUTPUT_TRUNCATED',
            result,
            llm_diagnostics: buildLLMResultDiagnostics(result),
            patch_result: patchResult,
          })
        }
        await appendNovelRun(activeWorkspace, {
            project_id: projectId,
            run_type: 'editor_revision',
            step_name: `chapter-${chapter.chapter_no}`,
            status: 'failed',
            input_ref: JSON.stringify({ review_id: review.id, revision_strategy: report?.revision_strategy || 'surgical_patch' }),
            output_ref: JSON.stringify({ error_code: 'REVISION_NO_APPLICABLE_PATCH', patch_applied: patchResult?.applied?.length || 0, patch_unapplied: patchResult?.unapplied?.length || 0 }),
          }).catch(() => null)
          return res.status(502).json({ error: '修订未返回可应用补丁', result, patch_result: patchResult })
      }
      let updated = await updateNovelChapter(activeWorkspace, chapter.id, {
        chapter_text: nextText,
        continuity_notes: resultPayload?.continuity_notes || resultPayload?.prose_chapters?.[0]?.continuity_notes || chapter.continuity_notes || [],
        raw_payload: {
          ...(chapter.raw_payload || {}),
          generated_scene_breakdown: resultPayload?.scene_breakdown || resultPayload?.prose_chapters?.[0]?.scene_breakdown || [],
        },
        status: 'draft',
      }, { versionSource: 'repair' })
      let planAlignment: any = null
      try {
        const allChapters = await listNovelChapters(activeWorkspace, projectId)
        const alignment = collectPlanAlignmentPatchesAfterProseChange(allChapters, updated, {
          force: true,
          source: structuralRewrite ? 'post_structural_revision' : 'post_editor_revision',
          followLimit: 3,
        })
        planAlignment = {
          rebuilt: alignment.current.rebuilt,
          reason: alignment.current.reason,
          following_count: alignment.following_count,
          patches: alignment.patches.map(item => ({ chapter_id: item.chapter_id, kind: item.kind })),
        }
        for (const item of alignment.patches) {
          const patched = await updateNovelChapter(activeWorkspace, item.chapter_id, item.patch as any, { createVersion: false })
          if (Number(item.chapter_id) === Number(updated.id)) updated = patched
        }
      } catch (error: any) {
        planAlignment = { rebuilt: false, error: String(error?.message || error) }
      }
      const saved = await createNovelReview(activeWorkspace, {
        project_id: projectId,
        review_type: 'editor_revision',
        status: 'ok',
        summary: `已根据编辑报告 ${review.id} 生成修订稿`,
        issues: [],
        payload: editorJson({
          chapter_id: chapter.id,
          source_review_id: review.id,
          requested_revision_mode: revisionMode,
          revision_summary: resultPayload?.revision_summary || '',
          revision_mode: resultPayload?.revision_mode || 'patch',
          applied_patches: patchResult.applied,
          unapplied_patches: patchResult.unapplied,
          revision_context_receipts: resultPayload?.revision_context_receipts || resultPayload?.prose_chapters?.[0]?.revision_context_receipts || [],
          revision_receipts: resultPayload?.revision_receipts || resultPayload?.prose_chapters?.[0]?.revision_receipts || [],
          revision_scope_guard: resultPayload?.revision_scope_guard || resultPayload?.prose_chapters?.[0]?.revision_scope_guard || null,
          cascade_impacts: [
            ...asArray(resultPayload?.cascade_impacts || resultPayload?.cascadeImpacts),
            ...asArray(resultPayload?.prose_chapters?.[0]?.cascade_impacts || resultPayload?.prose_chapters?.[0]?.cascadeImpacts),
            ...asArray(resultPayload?.revision_receipts || resultPayload?.prose_chapters?.[0]?.revision_receipts)
              .flatMap((receipt: any) => asArray(receipt?.cascade_impacts || receipt?.cascadeImpacts)),
          ],
          workflow_revision_context: buildWorkflowRevisionContextBrief(contextPackage, chapter),
          delivery_risk_brief: deliveryRiskBrief,
          plan_alignment: planAlignment,
        }),
      })
      let qualityRefresh: any = null
      if (req.body?.auto_quality_check !== false) {
        try {
          const quality = await createProseQualityReview(ctx, activeWorkspace, project, updated, {
            model_id: req.body.model_id,
            source: 'post_revision',
            source_review_id: review.id,
            max_tokens: 3000,
          })
          qualityRefresh = {
            ok: true,
            review: quality.saved,
            score: quality.review.score,
            status: quality.saved.status,
          }
        } catch (error: any) {
          qualityRefresh = {
            ok: false,
            error: String(error?.message || error),
          }
          await appendNovelRun(activeWorkspace, {
            project_id: projectId,
            run_type: 'prose_quality',
            step_name: `chapter-${chapter.chapter_no}`,
            status: 'failed',
            input_ref: JSON.stringify({ chapter_id: chapter.id, source: 'post_revision', source_review_id: review.id }),
            output_ref: JSON.stringify({ error: qualityRefresh.error }),
          })
        }
      }
      let storyStateUpdate: any = null
      if (req.body?.auto_story_state !== false) {
        storyStateUpdate = await syncStoryStateFromChapter(
          ctx,
          activeWorkspace,
          project,
          projectId,
          Number(chapter.chapter_no || 0),
          modelId,
        ).catch(error => ({ ok: false, error: String(error?.message || error), synced: [], errors: [] }))
      }
      const postRevisionReviews = await listNovelReviews(activeWorkspace, projectId)
      const postDeliveryRiskBrief = buildChapterDeliveryRiskBrief(updated, postRevisionReviews)
      const convergenceReport = buildDeliveryRiskConvergenceReport({
        chapter: updated,
        sourceReviewId: saved.id,
        before: deliveryRiskBrief,
        after: postDeliveryRiskBrief,
      })
      const convergenceReview = await createNovelReview(activeWorkspace, {
        project_id: projectId,
        review_type: 'delivery_risk_convergence',
        status: convergenceReport.status === 'cleared' || convergenceReport.status === 'improved' ? 'ok' : 'warn',
        summary: `${convergenceReport.label}，残留 ${convergenceReport.residual_count}`,
        issues: convergenceReport.next_actions,
        payload: JSON.stringify({
          chapter_id: updated.id,
          chapter_no: updated.chapter_no,
          delivery_risk_convergence: convergenceReport,
        }),
      })
      await appendNovelRun(activeWorkspace, {
        project_id: projectId,
        run_type: 'editor_revision',
        step_name: `chapter-${chapter.chapter_no}`,
        status: 'success',
        input_ref: JSON.stringify({ review_id: review.id }),
        output_ref: JSON.stringify({ review: saved, modelName: (result as any).modelName, applied_patches: patchResult.applied.length, unapplied_patches: patchResult.unapplied.length, quality_refresh: qualityRefresh, story_state_update: storyStateUpdate, delivery_risk_convergence: convergenceReport }),
      })
      res.json({
        plan_alignment: planAlignment, ok: true, chapter: updated, review: saved, result, patch_result: patchResult, quality_refresh: qualityRefresh, story_state_update: storyStateUpdate, delivery_risk_convergence: convergenceReport, delivery_risk_convergence_review: convergenceReview })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

}
