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
  deliveryRiskMissedCount,
  deslopRepairReceiptCount,
  qualityAuditRepairReceiptCount,
} from './builders-quality-receipt-helpers'
import { editorJson } from './builders-json'

export type EditorRoutesContext = {
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

export const REVISION_MAX_TOKENS = 8000
export const COMPACT_REVISION_RETRY_MAX_TOKENS = 5000


export async function loadChapterBundle(ctx: EditorRoutesContext, projectId: number, chapterId: number) {
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

export async function syncStoryStateFromChapter(
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
      synced.push({
        chapter_id: freshChapter.id,
        chapter_no: freshChapter.chapter_no,
        update,
        soft_hard_failures: Array.isArray(update?.soft_hard_failures) ? update.soft_hard_failures : [],
      })
    } catch (error: any) {
      const hardFailures = Array.isArray(error?.hard_failures) ? error.hard_failures : []
      const blockingHardFailures = Array.isArray(error?.blocking_hard_failures) ? error.blocking_hard_failures : hardFailures
      errors.push({
        chapter_id: target.id,
        chapter_no: target.chapter_no,
        error: String(error?.message || error),
        code: error?.code || '',
        hard_failures: hardFailures,
        blocking_hard_failures: blockingHardFailures,
      })
      break
    }
  }
  const firstError = errors[0]
  return {
    ok: errors.length === 0,
    synced,
    errors,
    error: firstError
      ? (
          Array.isArray(firstError.hard_failures) && firstError.hard_failures.length
            ? firstError.hard_failures.map((item: any) => item?.message || item?.key).filter(Boolean).slice(0, 3).join('；')
            : firstError.error
        )
      : undefined,
    last_synced_chapter: synced.length ? synced[synced.length - 1].chapter_no : null,
  }
}

export function isRevisionOutputTruncated(result: any) {
  const finishReason = String(
    result?.finish_reason
    || result?.raw?.finish_reason
    || result?.raw?.stop_reason
    || result?.raw?.stopReason
    || result?.raw?.status
    || result?.raw?.choices?.[0]?.finish_reason
    || '',
  ).toLowerCase()
  return finishReason === 'max_tokens'
    || finishReason === 'length'
    || finishReason.includes('max_token')
    || finishReason.includes('max output')
}

export function shouldRetryRevisionPatch(payload: any, patchResult: any, result?: any) {
  if (isRevisionOutputTruncated(result)) return true
  const hasPatchShape = asArray(payload?.replacements || payload?.replace || payload?.patches).length > 0
    || asArray(payload?.insertions || payload?.insert).length > 0
  if (!hasPatchShape) return false
  if (asArray(patchResult?.applied).length > 0) return false
  return asArray(patchResult?.unapplied).some((item: any) => String(item?.reason || '') === 'anchor_not_found')
}

function textHash(value: string) {
  return createHash('sha256').update(value || '').digest('hex').slice(0, 16)
}

const STORYLINE_DIFF_DECISION_LABELS = {
  revise_prose: '回修正文',
  accept_as_plan: '接受为新计划',
  false_positive: '标记误判',
} as const

type StorylineDiffDecision = keyof typeof STORYLINE_DIFF_DECISION_LABELS

export function compactAuditText(value: any, limit = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

export function buildStorylineDiffDecisionReviewPayload(input: any, now = new Date()) {
  const decision = String(input?.decision || input?.recommendedDecision || '').trim() as StorylineDiffDecision
  if (!decision || !STORYLINE_DIFF_DECISION_LABELS[decision]) {
    throw new Error('unsupported storyline diff decision')
  }
  const decisionKey = compactAuditText(input?.decision_key || input?.decisionKey, 260)
  if (!decisionKey) throw new Error('decision_key required')
  const summary = compactAuditText(input?.summary, 500)
  if (!summary) throw new Error('summary required')
  const chapterNo = Number(input?.chapter_no ?? input?.chapterNo ?? 0) || null
  const chapterId = Number(input?.chapter_id ?? input?.chapterId ?? 0) || null
  const entityId = Number(input?.entity_id ?? input?.entityId ?? 0) || null
  const entityName = compactAuditText(input?.entity_name || input?.entityName || '未命名剧情线', 120)
  const riskLabel = compactAuditText(input?.risk_label || input?.riskLabel || input?.risk_type || input?.riskType, 80)
  const decisionLabel = STORYLINE_DIFF_DECISION_LABELS[decision]
  const issues = decision === 'revise_prose'
    ? [`${chapterNo ? `第${chapterNo}章 ` : ''}${summary}`]
    : []

  return {
    review_type: 'storyline_diff_decision',
    status: decision === 'revise_prose' ? 'warn' : 'ok',
    summary: `剧情线差异决策：${decisionLabel} · ${entityName}${chapterNo ? ` · 第${chapterNo}章` : ''}`,
    issues,
    payload: JSON.stringify({
      source: 'storyline_diff_decision',
      decision_key: decisionKey,
      decision,
      decision_label: decisionLabel,
      chapter_no: chapterNo,
      chapter_id: chapterId,
      entity_id: entityId,
      entity_name: entityName,
      entity_type: compactAuditText(input?.entity_type || input?.entityType, 80),
      risk_type: compactAuditText(input?.risk_type || input?.riskType, 80),
      risk_label: riskLabel,
      summary,
      evidence: compactAuditText(input?.evidence, 800),
      note: compactAuditText(input?.note, 500),
      decided_at: now.toISOString(),
    }),
  }
}

export { applySurgicalRevisionPatch } from './revision-candidate-admission'

export * from './builders-json'
import {
  findChapterReviewPayload,
} from './builders-delivery-risk-brief'
export * from './builders-delivery-risk-brief'
export * from './builders-revision-prompts'

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
    '8. 场景卡承诺的战斗、追逐、清剿、灾祸或强冲突是否真正写出过程，而不是只有结果。',
    '9. action_beats 是否有起手、反应、受阻、代价、反制、结果；是否缺少空间位置、伤势、资源损耗或信息暴露。',
    '10. 是否存在过度环境描写、连续纯氛围段落、用阴冷/压抑/雨雾等描写替代剧情推进。',
    '11. 每 3-5 段是否有可见行动、选择、信息变化或关系变化。',
    '',
    '【结构化上下文包】',
    editorJson(contextPackage, 6000),
    '',
    '【待复检正文】',
    String(chapterText || '').slice(0, 16000),
    '',
    '输出 JSON，字段：passed(boolean), score(0-100), craft_metrics({action_detail_score,description_overuse_score,event_density_score,combat_process_score}), focused_revision_modes(array，可取 expand_action/cut_description/tighten_pacing/add_consequence/restore_hook), issues(array: severity/type/description/suggestion), revision_directives(array), needs_revision(boolean)。只返回 JSON。',
  ].join('\n')
}

export async function createProseQualityReview(ctx: EditorRoutesContext, activeWorkspace: string, project: any, chapter: any, options: any = {}) {
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
    responseMode: 'stream',
    skipMemory: true,
  })
  if ((result as any).error) throw new Error(String((result as any).error))
  const reviewPayload = getNovelPayload(result)
  const modelReview = {
    passed: reviewPayload?.passed !== false,
    score: Number(reviewPayload?.score || 80),
    issues: Array.isArray(reviewPayload?.issues) ? reviewPayload.issues.map(normalizeIssue) : [],
    revision_directives: Array.isArray(reviewPayload?.revision_directives) ? reviewPayload.revision_directives.map((item: any) => String(item)) : [],
    craft_metrics: reviewPayload?.craft_metrics || {},
    focused_revision_modes: Array.isArray(reviewPayload?.focused_revision_modes) ? reviewPayload.focused_revision_modes.map((item: any) => String(item)) : [],
    needs_revision: Boolean(reviewPayload?.needs_revision),
    modelName: (result as any).modelName,
  }
  const previousChapters = chapters
    .filter((item: any) => Number(item.chapter_no || 0) < Number(currentChapter.chapter_no || 0))
    .sort((a: any, b: any) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
  const previousChapter = previousChapters.length ? previousChapters[previousChapters.length - 1] : null
  // If accepted prose already diverged from frozen task-book, reverse-sync plan first so
  // quality / revision / blueprint no longer judge against dead seeds.
  let alignedChapter = currentChapter
  let planAlignment: any = null
  try {
    const alignment = collectPlanAlignmentPatchesAfterProseChange(chapters, currentChapter, {
      force: true,
      source: options.source ? `pre_quality_${options.source}` : 'pre_quality',
      followLimit: 5,
      alignWrittenFollowers: true,
    })
    planAlignment = {
      rebuilt: alignment.current.rebuilt,
      reason: alignment.current.reason,
      following_count: alignment.following_count,
    }
    if (alignment.current.rebuilt || alignment.following_count > 0) {
      for (const item of alignment.patches) {
        const patched = await updateNovelChapter(activeWorkspace, item.chapter_id, item.patch as any, { createVersion: false })
        if (Number(item.chapter_id) === Number(currentChapter.id)) alignedChapter = patched
      }
    } else if (alignment.alignedChapter) {
      alignedChapter = alignment.alignedChapter
    }
    try {
      const refreshed = await listNovelChapters(activeWorkspace, projectId)
      const projectAlign = collectProjectPlanAlignmentPatches(refreshed, {
        source: options.source ? `pre_quality_project_${options.source}` : 'pre_quality_project',
        onlyFromChapterNo: Math.max(1, Number(currentChapter.chapter_no || 1) - 2),
        followLimit: 2,
      })
      for (const item of projectAlign.patches) {
        const patched = await updateNovelChapter(activeWorkspace, item.chapter_id, item.patch as any, { createVersion: false })
        if (Number(item.chapter_id) === Number(currentChapter.id)) alignedChapter = patched
      }
      planAlignment = {
        ...(planAlignment || {}),
        project_align: {
          patch_count: projectAlign.patch_count,
          closed_families: projectAlign.closed_families,
        },
      }
    } catch (projectAlignError: any) {
      planAlignment = {
        ...(planAlignment || {}),
        project_align_error: String(projectAlignError?.message || projectAlignError),
      }
    }
  } catch (error: any) {
    planAlignment = { rebuilt: false, error: String(error?.message || error) }
  }
  // Persist live contract: strip closed beats from stored task book before QA judges goals.
  try {
    const closedBeats = collectClosedBeatFamiliesFromChapters(previousChapters || [])
    const live = buildLiveContractChapterPatch(alignedChapter, {
      previousChapters: previousChapters || [],
      previousChapter,
      closedBeats,
    })
    if (live.changed && alignedChapter?.id) {
      alignedChapter = await updateNovelChapter(activeWorkspace, Number(alignedChapter.id), live.patch as any, { createVersion: false })
      planAlignment = {
        ...(planAlignment || {}),
        live_contract: {
          plan_health: live.contract.plan_health,
          closed_blocked: live.contract.closed_blocked,
          acceptance_goals: live.contract.acceptance_goals,
        },
      }
    }
  } catch (error: any) {
    planAlignment = {
      ...(planAlignment || {}),
      live_contract_error: String(error?.message || error),
    }
  }

  const normalizedReview = mergeProseQualityWithDeliveryRisks(modelReview, {
    reviews,
    chapter: alignedChapter,
    previousChapter,
    previousChapters,
    limit: 5,
  })
  const contentHash = textHash(alignedChapter.chapter_text || '')
  const saved = await createNovelReview(activeWorkspace, {
    project_id: projectId,
    review_type: 'prose_quality',
    status: normalizedReview.passed === false || Number(normalizedReview.score || 100) < 78 || normalizedReview.needs_revision ? 'warn' : 'ok',
    summary: `当前版本质检评分 ${normalizedReview.score ?? '-'}${normalizedReview.delivery_link?.source_count ? `，已并入 ${normalizedReview.delivery_link.source_count} 条交付风险` : ''}`,
    issues: normalizedReview.issues.map((issue: any) => `${issue.severity || 'medium'}｜${issue.description || issue}`),
    payload: editorJson({
      chapter_id: alignedChapter.id,
      chapter_updated_at: alignedChapter.updated_at || '',
      content_hash: contentHash,
      source: options.source || 'manual_refresh',
      source_review_id: options.source_review_id || null,
      context_package: contextPackage,
      self_check: {
        review: normalizedReview,
        revision: null,
        final_text: alignedChapter.chapter_text || '',
        revised: false,
      },
      delivery_link: normalizedReview.delivery_link || null,
      plan_alignment: planAlignment,
    }),
  })
  await appendNovelRun(activeWorkspace, {
    project_id: projectId,
    run_type: 'prose_quality',
    step_name: `chapter-${alignedChapter.chapter_no}`,
    status: 'success',
    input_ref: JSON.stringify({ chapter_id: alignedChapter.id, source: options.source || 'manual_refresh' }),
    output_ref: JSON.stringify({
      review_id: saved.id,
      score: normalizedReview.score,
      needs_revision: normalizedReview.needs_revision,
      delivery_link_count: normalizedReview.delivery_link?.source_count || 0,
      plan_alignment: planAlignment,
      modelName: (result as any).modelName,
    }),
  })
  return { review: normalizedReview, saved, contextPackage, result, content_hash: contentHash, chapter: alignedChapter, plan_alignment: planAlignment }
}

export function buildChapterQualityCard(chapter: any, contextPackage: any, reviews: any[]) {
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
  const wordTarget = contextPackage?.chapter_target?.word_target || null
  const targetMin = Number(wordTarget?.min || 0)
  const targetMax = Number(wordTarget?.max || 0)
  const targetRangeText = String(wordTarget?.rangeText || (targetMin && targetMax ? `${targetMin}-${targetMax} 字` : ''))
  const wordTargetScore = !wordTarget
    ? null
    : wordCount >= targetMin && (!targetMax || wordCount <= targetMax)
      ? 100
      : wordCount > 0 && wordCount < targetMin
        ? clampScore((wordCount / Math.max(1, targetMin)) * 60)
        : 70
  const dimensions = [
    ...(wordTarget ? [{
      key: 'word_target',
      label: '字数目标',
      score: clampScore(Number(wordTargetScore || 0)),
      evidence: `当前 ${wordCount} 字，目标 ${targetRangeText || `${targetMin}-${targetMax} 字`}`,
      action: wordCount < targetMin
        ? `按目标字数扩写到 ${targetRangeText || `${targetMin}-${targetMax} 字`}，优先补动作过程、选择代价、对话交锋和章末钩子铺垫。`
        : `压缩到 ${targetRangeText || `${targetMin}-${targetMax} 字`}，删掉重复解释和不推进剧情的描写。`,
    }] : []),
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

export function annotationKey(input: any) {
  return [
    input.source || 'review',
    input.review_id || 0,
    input.chapter_id || 0,
    input.chapter_no || 0,
    String(input.kind || 'issue'),
    String(input.title || input.message || '').slice(0, 120),
  ].join(':')
}

function sceneCardReceiptCheckText(value: any) {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object') return ''
  return [
    value.key,
    value.type,
    value.label,
    value.status,
    value.evidence,
    value.message,
    value.summary,
    value.text,
    value.fix,
    value.fields,
  ].flat().map(item => String(item || '')).join(' ')
}

function sceneCardReceiptCheckFailed(value: any) {
  if (typeof value === 'string') return value.toLowerCase().includes('scene_card_receipt')
  const status = String(value?.status || value?.result || '').trim().toLowerCase()
  const delivered = value?.delivered
  return ['fail', 'failed', 'warn', 'warning', 'blocked', 'error'].includes(status)
    || delivered === false
    || String(value?.key || '').toLowerCase().includes('undelivered')
    || String(value?.key || '').toLowerCase().includes('missing')
}

export function sceneCardReceiptAuditChecks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || {}
  const review = selfCheck?.review || payload?.review || {}
  return [
    ...asArray(review?.quality_audit_checks || review?.qualityAuditChecks),
    ...asArray(selfCheck?.quality_audit_checks || selfCheck?.qualityAuditChecks),
    ...asArray(payload?.quality_audit_checks || payload?.qualityAuditChecks),
    ...asArray(review?.issues),
    ...asArray(selfCheck?.issues),
    ...asArray(payload?.issues),
  ].filter(item => sceneCardReceiptCheckText(item).toLowerCase().includes('scene_card_receipt'))
    .filter(sceneCardReceiptCheckFailed)
}

export function sceneCardReceiptAuditMessage(checks: any[]) {
  return checks.map(item => {
    if (typeof item === 'string') return item
    return String(item?.evidence || item?.message || item?.summary || item?.text || item?.fix || sceneCardReceiptCheckText(item)).trim()
  }).filter(Boolean).slice(0, 3).join('；') || '场景卡回执与正文证据不一致。'
}

export * from './builders-quality-receipt-helpers'
export * from './builders-annotations'
