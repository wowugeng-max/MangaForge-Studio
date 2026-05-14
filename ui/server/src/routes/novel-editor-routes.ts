import type { Express } from 'express'
import {
  appendNovelRun,
  createNovelReview,
  listChapterVersions,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelWorldbuilding,
  updateNovelChapter,
} from '../novel'
import { executeNovelAgent, previewNovelKnowledgeInjection } from '../llm'
import { asArray, clampScore, getNovelPayload, getSafetyPolicy, parseJsonLikePayload } from './novel-route-utils'

type EditorRoutesContext = {
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
  getStageModelId: (project: any, stage: string, preferredModelId?: number) => number | undefined
  getStageTemperature: (project: any, stage: string, fallback: number) => number
  buildReferenceUsageReport: (workspace: string, project: any, taskType: string, generatedText?: string) => Promise<any>
  buildStructuralSimilarityReport: (chapter: any, referenceReport: any) => any
  buildReferenceMigrationDryPlan: (project: any, chapter: any, preview: any, safety: any) => any
  diffTexts: (before: string, after: string) => any
}

async function loadChapterBundle(ctx: EditorRoutesContext, projectId: number, chapterId: number) {
  const activeWorkspace = ctx.getWorkspace()
  const project = await ctx.getProject(activeWorkspace, projectId)
  if (!project) return { activeWorkspace, status: 404, error: 'project not found' }
  const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
    listNovelChapters(activeWorkspace, projectId),
    listNovelWorldbuilding(activeWorkspace, projectId),
    listNovelCharacters(activeWorkspace, projectId),
    listNovelOutlines(activeWorkspace, projectId),
    listNovelReviews(activeWorkspace, projectId),
  ])
  const chapter = chapters.find(item => item.id === chapterId)
  if (!chapter) return { activeWorkspace, project, status: 404, error: 'chapter not found' }
  return { activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews }
}

export function registerNovelEditorRoutes(app: Express, ctx: EditorRoutesContext) {
  app.post('/api/novel/chapters/:chapterId/editor-report', async (req, res) => {
    try {
      const loaded = await loadChapterBundle(ctx, Number(req.body.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      const { activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews } = loaded
      const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
      const latestQuality = reviews.filter(item => item.review_type === 'prose_quality').slice(-1)[0] || null
      const latestReference = reviews.filter(item => item.review_type === 'reference_usage').slice(-1)[0] || null
      const prompt = [
        '任务：生成商用编辑部风格的章节编辑报告。只输出 JSON。',
        `项目：${project.title}`,
        '检查维度：结构审稿、连续性审稿、节奏审稿、文风审稿、原创性审稿、商业审稿。',
        '每个维度输出 score, verdict, issues(array), revision_actions(array), accept_criteria(array)。',
        '最后输出 overall_score, must_fix, optional_improvements, one_click_revision_prompt。',
        '【上下文包】',
        JSON.stringify(contextPackage, null, 2).slice(0, 9000),
        '【章节正文】',
        String(chapter.chapter_text || '').slice(0, 14000),
        '【已有质检】',
        JSON.stringify({ latestQuality, latestReference }, null, 2).slice(0, 4000),
      ].join('\n')
      const result = await executeNovelAgent('review-agent', project, { task: prompt }, { activeWorkspace, modelId: req.body.model_id ? String(req.body.model_id) : undefined, maxTokens: 5000, temperature: 0.2, skipMemory: true })
      const report = getNovelPayload(result)
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'editor_report',
        status: Number(report.overall_score || 0) >= 78 ? 'ok' : 'warn',
        summary: `编辑报告评分 ${report.overall_score ?? '-'}`,
        issues: asArray(report.must_fix).map((item: any) => String(item)),
        payload: JSON.stringify({ chapter_id: chapter.id, report, context_package: contextPackage }),
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
      const report = payload.report || {}
      const chapterId = Number(payload.chapter_id || req.body.chapter_id || 0)
      const chapters = await listNovelChapters(activeWorkspace, projectId)
      const chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const prompt = [
        '任务：根据商业编辑报告对当前章节进行一键修订。只输出 JSON。',
        `项目：${project.title}`,
        '要求：保留可用情节，修复 must_fix、维度问题和连续性问题；不得照搬参考作品；输出完整修订正文。',
        '【编辑报告】',
        JSON.stringify(report, null, 2).slice(0, 7000),
        '【修订提示】',
        String(report.one_click_revision_prompt || req.body.prompt || ''),
        '【原章节正文】',
        String(chapter.chapter_text || '').slice(0, 18000),
        '输出 JSON：{chapter_text, scene_breakdown, continuity_notes, revision_summary}',
      ].join('\n')
      const modelId = ctx.getStageModelId(project, 'revise', Number(req.body.model_id || 0) || undefined)
      const result = await executeNovelAgent('prose-agent', project, { task: prompt }, { activeWorkspace, modelId: modelId ? String(modelId) : undefined, maxTokens: 9000, temperature: ctx.getStageTemperature(project, 'revise', 0.62), skipMemory: true })
      const resultPayload = getNovelPayload(result)
      const nextText = resultPayload?.chapter_text || resultPayload?.prose_chapters?.[0]?.chapter_text || ''
      if (!nextText) return res.status(502).json({ error: '修订未返回正文', result })
      const updated = await updateNovelChapter(activeWorkspace, chapter.id, {
        chapter_text: nextText,
        scene_breakdown: resultPayload?.scene_breakdown || resultPayload?.prose_chapters?.[0]?.scene_breakdown || chapter.scene_breakdown || [],
        continuity_notes: resultPayload?.continuity_notes || resultPayload?.prose_chapters?.[0]?.continuity_notes || chapter.continuity_notes || [],
        status: 'draft',
      }, { versionSource: 'repair' })
      const saved = await createNovelReview(activeWorkspace, {
        project_id: projectId,
        review_type: 'editor_revision',
        status: 'ok',
        summary: `已根据编辑报告 ${review.id} 生成修订稿`,
        issues: [],
        payload: JSON.stringify({ chapter_id: chapter.id, source_review_id: review.id, revision_summary: resultPayload?.revision_summary || '' }),
      })
      await appendNovelRun(activeWorkspace, {
        project_id: projectId,
        run_type: 'editor_revision',
        step_name: `chapter-${chapter.chapter_no}`,
        status: 'success',
        input_ref: JSON.stringify({ review_id: review.id }),
        output_ref: JSON.stringify({ review: saved, modelName: (result as any).modelName }),
      })
      res.json({ ok: true, chapter: updated, review: saved, result })
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
        JSON.stringify(contextPackage, null, 2).slice(0, 7000),
        '【参考注入预览】',
        JSON.stringify({
          active_references: preview.active_references,
          entries: (preview.entries || []).slice(0, 20).map((entry: any) => ({
            title: entry.title,
            category: entry.category,
            source_project: entry.source_project,
            match_reason: entry.match_reason,
          })),
          warnings: preview.warnings,
        }, null, 2).slice(0, 7000),
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
        payload: JSON.stringify({ chapter_id: chapter.id, plan, context_package: contextPackage, preview }),
      })
      res.json({ ok: true, plan, review: saved, result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
