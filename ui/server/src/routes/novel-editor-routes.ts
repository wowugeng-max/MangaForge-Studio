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
  listNovelWorldbuilding,
  updateNovelChapter,
} from '../novel'
import { executeNovelAgent, previewNovelKnowledgeInjection } from '../llm'
import { asArray, clampScore, getNovelPayload, getSafetyPolicy, normalizeIssue, parseJsonLikePayload } from './novel-route-utils'

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
  updateStoryStateMachine: (workspace: string, project: any, chapter: any, contextPackage: any, chapterText: string, modelId?: number) => Promise<any>
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

async function syncStoryStateFromChapter(
  ctx: EditorRoutesContext,
  activeWorkspace: string,
  project: any,
  projectId: number,
  startChapterNo: number,
  modelId?: number,
) {
  const writtenChapters = (await listNovelChapters(activeWorkspace, projectId))
    .filter(chapter => Number(chapter.chapter_no || 0) >= startChapterNo && String(chapter.chapter_text || '').trim())
    .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
  const synced: any[] = []
  const errors: any[] = []
  let currentProject = project
  for (const target of writtenChapters) {
    try {
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, projectId),
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
      ])
      currentProject = await ctx.getProject(activeWorkspace, projectId) || currentProject
      const freshChapter = chapters.find(item => item.id === target.id) || target
      const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, currentProject, freshChapter, chapters, worldbuilding, characters, outlines, reviews)
      const update = await ctx.updateStoryStateMachine(activeWorkspace, currentProject, freshChapter, contextPackage, String(freshChapter.chapter_text || ''), modelId)
      synced.push({ chapter_id: freshChapter.id, chapter_no: freshChapter.chapter_no, update })
    } catch (error: any) {
      errors.push({ chapter_id: target.id, chapter_no: target.chapter_no, error: String(error?.message || error) })
      break
    }
  }
  return {
    ok: errors.length === 0,
    synced,
    errors,
    last_synced_chapter: synced.length ? synced[synced.length - 1].chapter_no : null,
  }
}

function firstPatchText(...values: any[]) {
  return values.map(value => String(value || '').trim()).find(Boolean) || ''
}

function textHash(value: string) {
  return createHash('sha256').update(value || '').digest('hex').slice(0, 16)
}

function applySurgicalRevisionPatch(originalText: string, payload: any) {
  const fullText = firstPatchText(payload?.chapter_text, payload?.prose_chapters?.[0]?.chapter_text)
  if (fullText) {
    return { chapterText: fullText, applied: [{ type: 'full_text', chars: fullText.length }], unapplied: [] as any[] }
  }

  let chapterText = String(originalText || '')
  const applied: any[] = []
  const unapplied: any[] = []
  const replacements = asArray(payload?.replacements || payload?.replace || payload?.patches)
  for (const item of replacements) {
    const find = firstPatchText(item?.find, item?.old_text, item?.original, item?.target)
    const replace = firstPatchText(item?.replace, item?.new_text, item?.replacement, item?.text)
    if (!find || !replace) {
      unapplied.push({ type: 'replacement', reason: 'missing_find_or_replace', item })
      continue
    }
    const index = chapterText.indexOf(find)
    if (index < 0) {
      unapplied.push({ type: 'replacement', reason: 'anchor_not_found', find: find.slice(0, 120) })
      continue
    }
    chapterText = `${chapterText.slice(0, index)}${replace}${chapterText.slice(index + find.length)}`
    applied.push({ type: 'replacement', find: find.slice(0, 80), replace: replace.slice(0, 80) })
  }

  const insertions = asArray(payload?.insertions || payload?.insert)
  for (const item of insertions) {
    const text = firstPatchText(item?.text, item?.insert, item?.content)
    const anchor = firstPatchText(item?.anchor, item?.after, item?.before, item?.near)
    const position = String(item?.position || (item?.before ? 'before' : 'after')).toLowerCase()
    if (!text) {
      unapplied.push({ type: 'insertion', reason: 'missing_text', item })
      continue
    }
    if (!anchor) {
      if (position === 'start' || position === 'before') chapterText = `${text}\n\n${chapterText}`
      else chapterText = `${chapterText}\n\n${text}`
      applied.push({ type: 'insertion', position: anchor ? position : 'append_or_prepend', text: text.slice(0, 80) })
      continue
    }
    const index = chapterText.indexOf(anchor)
    if (index < 0) {
      unapplied.push({ type: 'insertion', reason: 'anchor_not_found', anchor: anchor.slice(0, 120), text: text.slice(0, 120) })
      continue
    }
    const offset = position === 'before' ? index : index + anchor.length
    const prefix = position === 'before' ? '' : '\n\n'
    const suffix = position === 'before' ? '\n\n' : ''
    chapterText = `${chapterText.slice(0, offset)}${prefix}${text}${suffix}${chapterText.slice(offset)}`
    applied.push({ type: 'insertion', position, anchor: anchor.slice(0, 80), text: text.slice(0, 80) })
  }

  return { chapterText, applied, unapplied }
}

function findChapterReviewPayload(reviews: any[], chapterId: number, types: string[]) {
  return reviews
    .filter(item => types.includes(item.review_type))
    .map(item => ({ review: item, payload: parseJsonLikePayload(item.payload) || {} }))
    .filter(item => Number(item.payload.chapter_id || item.payload.report?.chapter_id || item.payload.context_package?.chapter_target?.id || 0) === chapterId)
    .sort((a, b) => String(b.review.created_at || '').localeCompare(String(a.review.created_at || '')))[0] || null
}

function scoreStatus(score: number) {
  if (score >= 85) return 'pass'
  if (score >= 70) return 'watch'
  return 'needs_rework'
}

function buildProseQualityPrompt(project: any, contextPackage: any, chapterText: string) {
  return [
    '任务：对当前章节正文做商用小说正文质检。只输出 JSON，不要输出正文修订稿。',
    `作品标题：${project.title}`,
    '检查维度：',
    '1. 是否完成本章目标、冲突和章末钩子。',
    '2. 是否自然衔接上一章结尾状态。',
    '3. 角色行为是否符合角色卡与当前状态。',
    '4. 是否有设定冲突、时间线跳跃、物品凭空出现或消失。',
    '5. 是否有水文、重复、空泛总结、机械说明。',
    '6. 是否疑似照搬参考项目的专名、桥段或原句。',
    '7. 修订后新增内容是否引入新的人物、道具或规程突兀点。',
    '',
    '【结构化上下文包】',
    JSON.stringify(contextPackage, null, 2).slice(0, 6000),
    '',
    '【待复检正文】',
    String(chapterText || '').slice(0, 16000),
    '',
    '输出 JSON，字段：passed(boolean), score(0-100), issues(array: severity/type/description/suggestion), revision_directives(array), needs_revision(boolean)。只返回 JSON。',
  ].join('\n')
}

async function createProseQualityReview(ctx: EditorRoutesContext, activeWorkspace: string, project: any, chapter: any, options: any = {}) {
  const projectId = Number(project.id)
  const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
    listNovelChapters(activeWorkspace, projectId),
    listNovelWorldbuilding(activeWorkspace, projectId),
    listNovelCharacters(activeWorkspace, projectId),
    listNovelOutlines(activeWorkspace, projectId),
    listNovelReviews(activeWorkspace, projectId),
  ])
  const currentChapter = chapters.find(item => item.id === chapter.id) || chapter
  const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, currentChapter, chapters, worldbuilding, characters, outlines, reviews)
  const modelId = ctx.getStageModelId(project, 'review', Number(options.model_id || 0) || undefined)
  const result = await executeNovelAgent('review-agent', project, {
    task: buildProseQualityPrompt(project, contextPackage, currentChapter.chapter_text || ''),
  }, {
    activeWorkspace,
    modelId: modelId ? String(modelId) : undefined,
    maxTokens: Number(options.max_tokens || 3000),
    temperature: ctx.getStageTemperature(project, 'review', 0.2),
    responseMode: 'non_stream',
    skipMemory: true,
  })
  if ((result as any).error) throw new Error(String((result as any).error))
  const reviewPayload = getNovelPayload(result)
  const normalizedReview = {
    passed: reviewPayload?.passed !== false,
    score: Number(reviewPayload?.score || 80),
    issues: Array.isArray(reviewPayload?.issues) ? reviewPayload.issues.map(normalizeIssue) : [],
    revision_directives: Array.isArray(reviewPayload?.revision_directives) ? reviewPayload.revision_directives.map((item: any) => String(item)) : [],
    needs_revision: Boolean(reviewPayload?.needs_revision),
    modelName: (result as any).modelName,
  }
  const contentHash = textHash(currentChapter.chapter_text || '')
  const saved = await createNovelReview(activeWorkspace, {
    project_id: projectId,
    review_type: 'prose_quality',
    status: normalizedReview.passed === false || Number(normalizedReview.score || 100) < 78 ? 'warn' : 'ok',
    summary: `当前版本质检评分 ${normalizedReview.score ?? '-'}`,
    issues: normalizedReview.issues.map((issue: any) => `${issue.severity || 'medium'}｜${issue.description || issue}`),
    payload: JSON.stringify({
      chapter_id: currentChapter.id,
      chapter_updated_at: currentChapter.updated_at || '',
      content_hash: contentHash,
      source: options.source || 'manual_refresh',
      source_review_id: options.source_review_id || null,
      context_package: contextPackage,
      self_check: {
        review: normalizedReview,
        revision: null,
        final_text: currentChapter.chapter_text || '',
        revised: false,
      },
    }),
  })
  await appendNovelRun(activeWorkspace, {
    project_id: projectId,
    run_type: 'prose_quality',
    step_name: `chapter-${currentChapter.chapter_no}`,
    status: 'success',
    input_ref: JSON.stringify({ chapter_id: currentChapter.id, source: options.source || 'manual_refresh' }),
    output_ref: JSON.stringify({ review_id: saved.id, score: normalizedReview.score, modelName: (result as any).modelName }),
  })
  return { review: normalizedReview, saved, contextPackage, result, content_hash: contentHash }
}

function buildChapterQualityCard(chapter: any, contextPackage: any, reviews: any[]) {
  const preflight = contextPackage?.preflight || {}
  const checks = Array.isArray(preflight.checks) ? preflight.checks : []
  const checkOk = (key: string) => checks.find((item: any) => item.key === key)?.ok === true
  const wordCount = String(chapter.chapter_text || '').replace(/\s/g, '').length
  const sceneCount = Array.isArray(chapter.scene_breakdown) ? chapter.scene_breakdown.length : 0
  const qualityPayload = findChapterReviewPayload(reviews, chapter.id, ['prose_quality'])?.payload || {}
  const editorPayload = findChapterReviewPayload(reviews, chapter.id, ['editor_report'])?.payload || {}
  const similarityPayload = findChapterReviewPayload(reviews, chapter.id, ['similarity_report'])?.payload || {}
  const selfReview = qualityPayload.self_check?.review || {}
  const editorReport = editorPayload.report || {}
  const similarityReport = similarityPayload.report || {}
  const qualityScore = Number(selfReview.score || editorReport.overall_score || 0)
  const dimensions = [
    {
      key: 'chapter_goal',
      label: '完成本章目标',
      score: clampScore((chapter.chapter_goal || chapter.chapter_summary ? 45 : 0) + (wordCount > 800 ? 35 : wordCount > 0 ? 20 : 0) + (chapter.ending_hook ? 20 : 0)),
      evidence: chapter.chapter_goal || chapter.chapter_summary || '缺章节目标/摘要',
      action: '补齐章节目标，并确认正文确实推进该目标。',
    },
    {
      key: 'continuity',
      label: '连续性',
      score: clampScore((checkOk('previous_continuity') ? 55 : 15) + (Array.isArray(chapter.continuity_notes) && chapter.continuity_notes.length ? 25 : 10) + (contextPackage?.continuity?.previous_chapter ? 20 : 10)),
      evidence: preflight.warnings?.join('；') || '未发现明显前置缺口',
      action: '检查上一章结尾、当前章开场承接和状态机记录。',
    },
    {
      key: 'character_consistency',
      label: '角色一致性',
      score: clampScore((checkOk('characters') ? 40 : 10) + (checkOk('character_state') ? 40 : 10) + (contextPackage?.story_state?.characters?.length ? 20 : 0)),
      evidence: `角色卡 ${contextPackage?.story_state?.characters?.length || 0} 个`,
      action: '补充主要角色 current_state 和本章行为动机。',
    },
    {
      key: 'pacing',
      label: '节奏',
      score: clampScore((sceneCount >= 2 ? 45 : sceneCount ? 25 : 5) + (wordCount >= 1800 && wordCount <= 6000 ? 35 : wordCount > 0 ? 20 : 0) + (chapter.conflict ? 20 : 0)),
      evidence: `${sceneCount} 个场景卡，${wordCount} 字`,
      action: '用 2-6 个场景卡控制冲突、转折和出场状态。',
    },
    {
      key: 'repetition',
      label: '水文/重复',
      score: clampScore(100 - Math.min(50, asArray(contextPackage?.story_state?.global?.recent_repeated_information).length * 12) - (wordCount > 8000 ? 15 : 0)),
      evidence: asArray(contextPackage?.story_state?.global?.recent_repeated_information).slice(0, 3).join('；') || '暂无重复提示',
      action: '删减重复解释，只保留本章新增信息。',
    },
    {
      key: 'ending_hook',
      label: '章末钩子',
      score: clampScore((chapter.ending_hook ? 65 : 20) + (String(chapter.chapter_text || '').slice(-500).trim().length > 80 ? 35 : 10)),
      evidence: chapter.ending_hook || '缺章末钩子',
      action: '补一个能推动下一章点击的悬念、反转或目标变化。',
    },
    {
      key: 'reference_safety',
      label: '仿写安全',
      score: clampScore(similarityReport.decision ? 100 - Number(similarityReport.overall_risk_score || 0) : 75),
      evidence: similarityReport.decision ? `相似度风险 ${similarityReport.overall_risk_score}` : '暂无相似度报告',
      action: '生成相似度检测或参考迁移计划，避免迁移具体桥段和专有设定。',
    },
  ]
  const baseScore = dimensions.reduce((sum, item) => sum + item.score, 0) / Math.max(1, dimensions.length)
  const overallScore = clampScore(qualityScore ? baseScore * 0.55 + qualityScore * 0.45 : baseScore)
  return {
    chapter_id: chapter.id,
    chapter_no: chapter.chapter_no,
    title: chapter.title,
    word_count: wordCount,
    overall_score: overallScore,
    status: scoreStatus(overallScore),
    dimensions,
    latest_quality_score: qualityScore || null,
    must_fix: dimensions.filter(item => item.score < 65).map(item => `${item.label}：${item.action}`),
    next_actions: [
      ...dimensions.filter(item => item.score < 75).sort((a, b) => a.score - b.score).slice(0, 4).map(item => item.action),
      !qualityScore ? '建议生成一次编辑报告或正文质检，获得模型审稿样本。' : '',
    ].filter(Boolean),
  }
}

function annotationKey(input: any) {
  return [
    input.source || 'review',
    input.review_id || 0,
    input.chapter_id || 0,
    input.chapter_no || 0,
    String(input.kind || 'issue'),
    String(input.title || input.message || '').slice(0, 120),
  ].join(':')
}

function latestAnnotationStatus(reviews: any[]) {
  const map = new Map<string, any>()
  reviews
    .filter(item => item.review_type === 'review_annotation_status')
    .slice()
    .sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
    .forEach(item => {
      const payload = parseJsonLikePayload(item.payload) || {}
      if (payload.annotation_key) map.set(payload.annotation_key, { ...payload, review: item })
    })
  return map
}

function pushAnnotation(items: any[], statuses: Map<string, any>, raw: any) {
  const key = raw.key || annotationKey(raw)
  const state = statuses.get(key) || {}
  items.push({
    key,
    status: state.status || raw.status || 'open',
    resolved_at: state.resolved_at || null,
    resolution_note: state.note || '',
    severity: raw.severity || 'medium',
    category: raw.category || 'general',
    title: raw.title || raw.message || '审阅批注',
    message: raw.message || raw.title || '',
    action: raw.action || raw.suggestion || '',
    chapter_id: raw.chapter_id || null,
    chapter_no: raw.chapter_no || null,
    source: raw.source || 'review',
    source_label: raw.source_label || raw.source || '审阅',
    review_id: raw.review_id || null,
    created_at: raw.created_at || '',
    payload: raw.payload || {},
  })
}

function buildReviewAnnotations(project: any, chapters: any[], reviews: any[]) {
  const statuses = latestAnnotationStatus(reviews)
  const items: any[] = []
  const chapterById = new Map(chapters.map(chapter => [Number(chapter.id), chapter]))
  const chapterByNo = new Map(chapters.map(chapter => [Number(chapter.chapter_no), chapter]))
  const resolveChapter = (payload: any) => {
    const chapterId = Number(payload.chapter_id || payload.report?.chapter_id || payload.quality_card?.chapter_id || payload.context_package?.chapter_target?.id || 0)
    const chapterNo = Number(payload.chapter_no || payload.report?.chapter_no || payload.quality_card?.chapter_no || payload.context_package?.chapter_target?.chapter_no || 0)
    return chapterById.get(chapterId) || chapterByNo.get(chapterNo) || null
  }
  const pushReviewIssues = (review: any, payload: any, issueList: any[], defaults: any = {}) => {
    const chapter = resolveChapter(payload)
    issueList.forEach((issue: any, index: number) => {
      const normalized = typeof issue === 'string' ? { description: issue } : issue || {}
      pushAnnotation(items, statuses, {
        source: defaults.source || review.review_type,
        source_label: defaults.source_label || review.summary || review.review_type,
        review_id: review.id,
        chapter_id: chapter?.id || defaults.chapter_id || null,
        chapter_no: chapter?.chapter_no || defaults.chapter_no || null,
        kind: normalized.type || defaults.kind || `issue-${index}`,
        severity: normalized.severity || defaults.severity || 'medium',
        category: defaults.category || normalized.type || review.review_type,
        title: normalized.title || normalized.description || normalized.message || String(issue),
        message: normalized.description || normalized.message || normalized.title || String(issue),
        action: normalized.suggestion || normalized.action || defaults.action || '',
        created_at: review.created_at,
        payload: { issue: normalized, review_type: review.review_type },
      })
    })
  }

  for (const review of reviews) {
    const payload = parseJsonLikePayload(review.payload) || {}
    if (review.review_type === 'prose_quality') {
      const reviewPayload = payload.self_check?.review || payload.review || {}
      pushReviewIssues(review, payload, asArray(reviewPayload.issues), {
        source: 'prose_quality',
        source_label: '正文质检',
        category: 'quality',
        severity: Number(reviewPayload.score || 100) < 65 ? 'high' : 'medium',
      })
      if (Number(reviewPayload.score || 100) < 78) {
        const chapter = resolveChapter(payload)
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '正文质检',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'low_quality_score',
          severity: Number(reviewPayload.score || 0) < 65 ? 'high' : 'medium',
          category: 'quality',
          title: `质量分 ${reviewPayload.score || 0} 低于阈值`,
          message: review.summary || `章节质量分 ${reviewPayload.score || 0}`,
          action: '进入章节修订，补齐目标、冲突、节奏或章末钩子。',
          created_at: review.created_at,
          payload: { score: reviewPayload.score },
        })
      }
    }
    if (review.review_type === 'editor_report') {
      const report = payload.report || {}
      pushReviewIssues(review, payload, asArray(report.must_fix), {
        source: 'editor_report',
        source_label: '编辑报告',
        category: 'editorial',
        severity: 'high',
        action: '按编辑报告生成修订稿或人工修改。',
      })
      asArray(report.optional_improvements).forEach((item: any, index: number) => {
        const chapter = resolveChapter(payload)
        pushAnnotation(items, statuses, {
          source: 'editor_report',
          source_label: '编辑报告',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: `optional-${index}`,
          severity: 'low',
          category: 'editorial',
          title: String(item),
          message: String(item),
          action: '可选优化，人工判断是否处理。',
          created_at: review.created_at,
        })
      })
    }
    if (review.review_type === 'similarity_report') {
      const report = payload.report || payload
      const chapter = resolveChapter(payload)
      const risk = Number(report.overall_risk_score || 0)
      if (risk > 35 || report.decision === 'needs_rewrite') {
        pushAnnotation(items, statuses, {
          source: 'similarity_report',
          source_label: '相似度报告',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no || report.chapter_no,
          kind: 'similarity_risk',
          severity: risk > 55 ? 'high' : 'medium',
          category: 'safety',
          title: `相似风险 ${risk}`,
          message: `相似度检测决策：${report.decision || '需复核'}`,
          action: asArray(report.suggestions)[0] || '运行参考迁移计划并重写高风险桥段。',
          created_at: review.created_at,
          payload: report,
        })
      }
      pushReviewIssues(review, payload, asArray(report.suggestions), {
        source: 'similarity_report',
        source_label: '相似度报告',
        category: 'safety',
        severity: risk > 55 ? 'high' : 'medium',
      })
    }
    if (review.review_type === 'release_repair_queue') {
      const audit = payload.release_audit || {}
      asArray(audit.blockers).concat(asArray(audit.warnings)).forEach((item: any, index: number) => {
        pushAnnotation(items, statuses, {
          source: 'release_repair_queue',
          source_label: '发布审核',
          review_id: review.id,
          kind: `release-${item.key || index}`,
          severity: item.status === 'blocker' ? 'high' : 'medium',
          category: 'release',
          title: item.label || '发布审核问题',
          message: item.message || item.label || '',
          action: item.action || '',
          created_at: review.created_at,
          payload: item,
        })
      })
    }
  }

  for (const chapter of chapters) {
    if (chapter.chapter_text && !chapter.ending_hook) {
      pushAnnotation(items, statuses, {
        source: 'local_scan',
        source_label: '本地扫描',
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        kind: 'missing_hook',
        severity: 'medium',
        category: 'continuity',
        title: '缺少章末钩子',
        message: `第${chapter.chapter_no}章已写正文但缺少章末钩子。`,
        action: '补齐能推动下一章点击的悬念、反转或目标变化。',
      })
    }
    if (chapter.chapter_text && (!Array.isArray(chapter.continuity_notes) || chapter.continuity_notes.length === 0)) {
      pushAnnotation(items, statuses, {
        source: 'local_scan',
        source_label: '本地扫描',
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        kind: 'missing_continuity_notes',
        severity: 'low',
        category: 'continuity',
        title: '缺少连续性备注',
        message: `第${chapter.chapter_no}章缺少角色、道具、伏笔或时间线变化记录。`,
        action: '补齐连续性备注或运行状态机更新。',
      })
    }
  }

  const unique = new Map<string, any>()
  items.forEach(item => unique.set(item.key, item))
  const annotations = [...unique.values()].sort((a, b) => {
    const severityWeight: Record<string, number> = { high: 0, critical: 0, medium: 1, low: 2 }
    return (severityWeight[a.severity] ?? 3) - (severityWeight[b.severity] ?? 3)
      || Number(a.chapter_no || 999999) - Number(b.chapter_no || 999999)
      || String(b.created_at || '').localeCompare(String(a.created_at || ''))
  })
  return {
    project_id: project.id,
    summary: {
      total: annotations.length,
      open: annotations.filter(item => item.status !== 'resolved').length,
      resolved: annotations.filter(item => item.status === 'resolved').length,
      high: annotations.filter(item => item.status !== 'resolved' && ['high', 'critical'].includes(item.severity)).length,
      medium: annotations.filter(item => item.status !== 'resolved' && item.severity === 'medium').length,
      low: annotations.filter(item => item.status !== 'resolved' && item.severity === 'low').length,
    },
    annotations,
    generated_at: new Date().toISOString(),
  }
}

export function registerNovelEditorRoutes(app: Express, ctx: EditorRoutesContext) {
  app.get('/api/novel/projects/:id/review-annotations', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const payload = buildReviewAnnotations(project, chapters, reviews)
      res.json({ ok: true, ...payload })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/review-annotations/status', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const key = String(req.body?.annotation_key || req.body?.key || '').trim()
      if (!key) return res.status(400).json({ error: 'annotation_key required' })
      const status = String(req.body?.status || 'resolved')
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'review_annotation_status',
        status,
        summary: `${status === 'resolved' ? '已处理' : '已更新'}批注：${key.slice(0, 80)}`,
        issues: [],
        payload: JSON.stringify({
          annotation_key: key,
          status,
          note: String(req.body?.note || ''),
          resolved_at: status === 'resolved' ? new Date().toISOString() : null,
        }),
      })
      res.json({ ok: true, status: saved })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

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
      const selfCheckReview = payload.self_check?.review || {}
      const report = payload.report || (review.review_type === 'prose_quality' ? {
        overall_score: selfCheckReview.score,
        must_fix: asArray(selfCheckReview.issues).map((issue: any) => issue?.description || issue?.suggestion || issue).filter(Boolean),
        optional_improvements: asArray(selfCheckReview.revision_directives),
        one_click_revision_prompt: asArray(selfCheckReview.revision_directives).join('；'),
        prose_quality_review: selfCheckReview,
      } : {})
      const chapterId = Number(payload.chapter_id || req.body.chapter_id || 0)
      const chapters = await listNovelChapters(activeWorkspace, projectId)
      const chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const prompt = [
        '任务：根据商业编辑报告对当前章节做局部修订补丁。只输出 JSON。',
        `项目：${project.title}`,
        '要求：保留当前章节整体结构、节奏、章末钩子和可用文气；只修复报告指出的问题；不得照搬参考作品。',
        '为了避免长连接失败，优先输出局部补丁，不要输出完整正文。',
        '【编辑报告】',
        JSON.stringify(report, null, 2).slice(0, 7000),
        '【修订提示】',
        String(report.one_click_revision_prompt || req.body.prompt || ''),
        '【原章节正文】',
        String(chapter.chapter_text || '').slice(0, 12000),
        '输出 JSON：',
        '{',
        '  "revision_mode": "patch",',
        '  "replacements": [{"find": "原文中可精确匹配的一小段", "replace": "替换后的文字"}],',
        '  "insertions": [{"anchor": "原文中可精确匹配的一小段", "position": "before|after", "text": "要插入的文字"}],',
        '  "continuity_notes": ["修订后的连续性说明"],',
        '  "revision_summary": "简述修了什么"',
        '}',
        '只有在补丁无法表达时，才输出 chapter_text 完整修订正文。',
      ].join('\n')
      const modelId = ctx.getStageModelId(project, 'revise', Number(req.body.model_id || 0) || undefined)
      const result = await executeNovelAgent('prose-agent', project, { task: prompt }, {
        activeWorkspace,
        modelId: modelId ? String(modelId) : undefined,
        maxTokens: 2600,
        temperature: ctx.getStageTemperature(project, 'revise', 0.62),
        responseMode: 'non_stream',
        skipMemory: true,
      })
      if ((result as any).error) return res.status(502).json({ error: (result as any).error, result })
      const resultPayload = getNovelPayload(result)
      const patchResult = applySurgicalRevisionPatch(String(chapter.chapter_text || ''), resultPayload)
      const nextText = patchResult.chapterText
      if (!nextText || (!patchResult.applied.length && !resultPayload?.chapter_text && !resultPayload?.prose_chapters?.[0]?.chapter_text)) {
        return res.status(502).json({ error: '修订未返回可应用补丁', result, patch_result: patchResult })
      }
      const updated = await updateNovelChapter(activeWorkspace, chapter.id, {
        chapter_text: nextText,
        continuity_notes: resultPayload?.continuity_notes || resultPayload?.prose_chapters?.[0]?.continuity_notes || chapter.continuity_notes || [],
        raw_payload: {
          ...(chapter.raw_payload || {}),
          generated_scene_breakdown: resultPayload?.scene_breakdown || resultPayload?.prose_chapters?.[0]?.scene_breakdown || [],
        },
        status: 'draft',
      }, { versionSource: 'repair' })
      const saved = await createNovelReview(activeWorkspace, {
        project_id: projectId,
        review_type: 'editor_revision',
        status: 'ok',
        summary: `已根据编辑报告 ${review.id} 生成修订稿`,
        issues: [],
        payload: JSON.stringify({
          chapter_id: chapter.id,
          source_review_id: review.id,
          revision_summary: resultPayload?.revision_summary || '',
          revision_mode: resultPayload?.revision_mode || 'patch',
          applied_patches: patchResult.applied,
          unapplied_patches: patchResult.unapplied,
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
      await appendNovelRun(activeWorkspace, {
        project_id: projectId,
        run_type: 'editor_revision',
        step_name: `chapter-${chapter.chapter_no}`,
        status: 'success',
        input_ref: JSON.stringify({ review_id: review.id }),
        output_ref: JSON.stringify({ review: saved, modelName: (result as any).modelName, applied_patches: patchResult.applied.length, unapplied_patches: patchResult.unapplied.length, quality_refresh: qualityRefresh, story_state_update: storyStateUpdate }),
      })
      res.json({ ok: true, chapter: updated, review: saved, result, patch_result: patchResult, quality_refresh: qualityRefresh, story_state_update: storyStateUpdate })
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
