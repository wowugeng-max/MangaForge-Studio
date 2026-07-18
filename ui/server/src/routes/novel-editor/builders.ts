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

export function editorJson(value: any, maxChars = 0) {
  return safeJsonStringify(value, 2, maxChars)
}

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

function firstPatchText(...values: any[]) {
  return values.map(value => String(value || '').trim()).find(Boolean) || ''
}

function firstReplacementText(...values: any[]) {
  for (const value of values) {
    if (value === undefined || value === null) continue
    const text = String(value)
    if (text.trim()) return text.trim()
    if (typeof value === 'string') return ''
  }
  return null
}

function firstAnchorText(...values: any[]) {
  for (const value of values) {
    if (value === undefined || value === null) continue
    const text = String(value)
    if (text.trim()) return text
  }
  return ''
}

function whitespaceInsensitiveIndex(source: string, anchor: string) {
  const sourceMap: number[] = []
  let normalizedSource = ''
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (/\s/.test(char)) continue
    sourceMap.push(i)
    normalizedSource += char
  }
  const normalizedAnchor = anchor.replace(/\s+/g, '')
  if (!normalizedAnchor) return null
  const normalizedIndex = normalizedSource.indexOf(normalizedAnchor)
  if (normalizedIndex < 0 || normalizedSource.indexOf(normalizedAnchor, normalizedIndex + 1) >= 0) return null
  const start = sourceMap[normalizedIndex]
  const end = sourceMap[normalizedIndex + normalizedAnchor.length - 1] + 1
  return { index: start, anchor: source.slice(start, end), match: 'normalized_whitespace' }
}

function findPatchAnchor(source: string, anchor: string) {
  let index = source.indexOf(anchor)
  if (index >= 0) return { index, anchor, match: 'exact' }
  const trimmed = anchor.trim()
  if (trimmed && trimmed !== anchor) {
    index = source.indexOf(trimmed)
    if (index >= 0) return { index, anchor: trimmed, match: 'trimmed' }
  }
  const normalizedMatch = whitespaceInsensitiveIndex(source, anchor)
  if (normalizedMatch) return normalizedMatch
  return { index: -1, anchor, match: 'none' }
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

export function applySurgicalRevisionPatch(originalText: string, payload: any) {
  const fullText = firstPatchText(payload?.chapter_text, payload?.prose_chapters?.[0]?.chapter_text)
  if (fullText) {
    return { chapterText: fullText, applied: [{ type: 'full_text', chars: fullText.length }], unapplied: [] as any[] }
  }

  const openingRewrite = firstPatchText(
    payload?.opening_rewrite,
    payload?.opening_text,
    payload?.new_opening,
    payload?.prose_chapters?.[0]?.opening_rewrite,
  )
  if (openingRewrite) {
    const source = String(originalText || '')
    const keepFrom = firstAnchorText(
      payload?.keep_from,
      payload?.keep_from_anchor,
      payload?.resume_from,
      payload?.resume_anchor,
      payload?.keep_tail_from,
    )
    if (keepFrom) {
      const match = findPatchAnchor(source, keepFrom)
      if (match.index >= 0) {
        const chapterText = `${openingRewrite.replace(/\s+$/g, '')}

${source.slice(match.index)}`
        return {
          chapterText,
          applied: [{ type: 'opening_rewrite', chars: openingRewrite.length, keep_from: match.anchor.slice(0, 80), match: match.match }],
          unapplied: [] as any[],
        }
      }
    }
    // Fallback: replace the original opening window with rewritten opening.
    const cut = Math.min(Math.max(900, Math.floor(source.length * 0.28)), 1800, Math.max(0, source.length - 400))
    const chapterText = source.length > cut
      ? `${openingRewrite.replace(/\s+$/g, '')}

${source.slice(cut).replace(/^\s+/, '')}`
      : openingRewrite
    return {
      chapterText,
      applied: [{ type: 'opening_rewrite', chars: openingRewrite.length, keep_from: cut ? `offset:${cut}` : 'full', match: keepFrom ? 'anchor_not_found_fallback' : 'offset_cut' }],
      unapplied: keepFrom ? [{ type: 'opening_rewrite', reason: 'keep_from_not_found', keep_from: String(keepFrom).slice(0, 120) }] : [],
    }
  }

  let chapterText = String(originalText || '')
  const applied: any[] = []
  const unapplied: any[] = []
  const replacements = asArray(payload?.replacements || payload?.replace || payload?.patches)
  for (const item of replacements) {
    const find = firstAnchorText(item?.find, item?.old_text, item?.original, item?.target)
    const replace = firstReplacementText(item?.replace, item?.new_text, item?.replacement, item?.text)
    if (!find || replace === null) {
      unapplied.push({ type: 'replacement', reason: 'missing_find_or_replace', item })
      continue
    }
    const match = findPatchAnchor(chapterText, find)
    const index = match.index
    if (index < 0) {
      unapplied.push({ type: 'replacement', reason: 'anchor_not_found', find: find.slice(0, 120) })
      continue
    }
    chapterText = `${chapterText.slice(0, index)}${replace}${chapterText.slice(index + match.anchor.length)}`
    applied.push({ type: 'replacement', match: match.match, find: match.anchor.slice(0, 80), replace: replace.slice(0, 80) })
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
    const match = findPatchAnchor(chapterText, anchor)
    const index = match.index
    if (index < 0) {
      unapplied.push({ type: 'insertion', reason: 'anchor_not_found', anchor: anchor.slice(0, 120), text: text.slice(0, 120) })
      continue
    }
    const offset = position === 'before' ? index : index + match.anchor.length
    const prefix = position === 'before' ? '' : '\n\n'
    const suffix = position === 'before' ? '\n\n' : ''
    chapterText = `${chapterText.slice(0, offset)}${prefix}${text}${suffix}${chapterText.slice(offset)}`
    applied.push({ type: 'insertion', position, match: match.match, anchor: match.anchor.slice(0, 80), text: text.slice(0, 80) })
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

export function countItems(value: any) {
  return Array.isArray(value) ? value.length : 0
}

export function countPayloadNumber(value: any, fallback: number) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

export function storyUnitSyncRiskCount(storyUnit: any) {
  const missed = countPayloadNumber(storyUnit?.missed_count ?? storyUnit?.missedCount, countItems(storyUnit?.missed))
  const rushed = countPayloadNumber(storyUnit?.rushed_count ?? storyUnit?.rushedCount, countItems(storyUnit?.rushed_ahead) || countItems(storyUnit?.rushedAhead))
  const forbidden = countPayloadNumber(storyUnit?.forbidden_count ?? storyUnit?.forbiddenCount, countItems(storyUnit?.forbidden_touched) || countItems(storyUnit?.forbiddenTouched))
  return Math.max(0, missed) + Math.max(0, rushed) + Math.max(0, forbidden)
}

function isOpeningHandoffMiss(value: any) {
  const searchable = [
    value?.key,
    value?.type,
    value?.label,
    value?.name,
    value?.category,
    value?.match_scope,
    value?.scope,
  ].map(item => String(item || '').toLowerCase()).join(' ')
  return searchable.includes('opening_handoff')
    || searchable.includes('previous_handoff')
    || searchable.includes('上一章承接')
    || (searchable.includes('handoff') && searchable.includes('opening'))
}

export function openingHandoffMisses(expectation: any) {
  return asArray(expectation?.missed).filter(isOpeningHandoffMiss)
}

function openingHandoffMissLabel(expectation: any) {
  const first = openingHandoffMisses(expectation)[0] || {}
  return String(first?.label || first?.name || '开篇承接漏写 1').trim()
}

function metricNumber(value: any) {
  if (value === null || value === undefined || value === '') return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

export function openingHookScore(readability: any) {
  return metricNumber(readability?.opening_hook_score ?? readability?.openingHookScore)
}

export function endingHookScore(readability: any) {
  return metricNumber(readability?.ending_hook_score ?? readability?.endingHookScore)
}

export function sceneReadabilityScore(readability: any) {
  return metricNumber(readability?.scene_readability_score ?? readability?.sceneReadabilityScore)
}

export function payoffDensityScore(readability: any) {
  return metricNumber(readability?.payoff_density_score ?? readability?.payoffDensityScore)
}

export function hasWeakOpeningHook(readability: any) {
  const score = openingHookScore(readability)
  return score !== null && score > 0 && score < 70
}

export function hasWeakEndingHook(readability: any) {
  const score = endingHookScore(readability)
  return score !== null && score > 0 && score < 70
}

export function hasWeakSceneProgression(readability: any) {
  const score = sceneReadabilityScore(readability)
  return score !== null && score > 0 && score < 70
}

export function hasWeakPayoffDensity(readability: any) {
  const score = payoffDensityScore(readability)
  return score !== null && score > 0 && score < 70
}

function deliveryRiskPayload(reviews: any[], chapterId: number, type: string, key: string) {
  const payload = findChapterReviewPayload(reviews, chapterId, [type])?.payload || {}
  return payload?.[key] || payload?.result?.[key] || payload?.result || payload
}

function approvalBlockerLabel(type: string) {
  if (type === 'reference_safety_blocked') return '仿写安全阻断'
  if (type === 'safety') return '仿写安全待确认'
  if (type === 'low_score') return '低分待确认'
  if (type === 'draft') return '正文入库待确认'
  return '质量门禁阻断'
}

function issueBriefText(issue: any) {
  if (typeof issue === 'string') return issue.trim()
  return String(issue?.description || issue?.suggestion || issue?.message || issue?.summary || issue?.detail || issue?.text || '').trim()
}

export function buildApprovalBlockerBrief(payload: any) {
  const qualityGate = payload?.quality_gate || payload?.qualityGate || {}
  const safetyDecision = payload?.safety_decision || payload?.safetyDecision || payload?.reference_safety || payload?.referenceSafety || {}
  const explicitType = String(payload?.approval_type || payload?.approvalType || '').trim().toLowerCase()
  const type = explicitType || (safetyDecision?.blocked ? 'reference_safety_blocked' : qualityGate?.passed === false ? 'quality_gate' : '')
  if (!['quality_gate', 'low_score', 'draft', 'safety', 'reference_safety_blocked'].includes(type)) return null

  const qualityReview = payload?.self_check?.review || payload?.selfCheck?.review || payload?.review || {}
  const scoreValue = qualityReview?.score ?? safetyDecision?.score ?? qualityGate?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const copyHitCount = Number(safetyDecision?.copy_hit_count ?? safetyDecision?.copyHitCount)
  const reasons = Array.from(new Set([
    ...asArray(safetyDecision?.reasons).map((item: any) => String(item || '').trim()),
    ...asArray(qualityGate?.reasons).map((item: any) => String(item || '').trim()),
    ...asArray(qualityReview?.issues).map(issueBriefText),
    ...asArray(qualityReview?.revision_directives || qualityReview?.revisionDirectives).map((item: any) => String(item || '').trim()),
  ].filter(Boolean))).slice(0, 6)
  const label = approvalBlockerLabel(type)
  const detail = reasons[0]
    || (Number.isFinite(copyHitCount) && copyHitCount > 0 ? `参考相似命中 ${copyHitCount}` : '')
    || String(payload?.summary || '').trim()
    || '入库前需要人工确认或修订处理。'

  return {
    type,
    label,
    detail,
    score_label: safeScore === null ? '入库阻断' : `入库阻断 ${safeScore}`,
    score: safeScore,
    copy_hit_count: Number.isFinite(copyHitCount) ? copyHitCount : 0,
    reasons,
    quality_gate: qualityGate,
    safety_decision: safetyDecision,
  }
}

export function buildChapterDeliveryRiskBrief(chapter: any, reviews: any[]) {
  const risks: Array<{ count: number; item: string; directive: string; priority_label: string; evidence: any }> = []
  const qualityPayload = findChapterReviewPayload(reviews, chapter.id, ['prose_quality'])?.payload || {}
  const qualityReview = qualityPayload.self_check?.review || qualityPayload.review || {}
  const approvalBlocker = buildApprovalBlockerBrief(qualityPayload)
  const qualityMustFix = [
    ...asArray(qualityReview.must_fix),
    ...asArray(qualityReview.mustFix),
    ...asArray(qualityReview.revision_directives),
    ...asArray(qualityReview.issues)
      .filter((issue: any) => ['high', 'critical', 'blocker', 'must_fix'].includes(String(issue?.severity || issue?.level || '').toLowerCase()))
      .map((issue: any) => issue?.description || issue?.suggestion || issue?.message || issue),
  ].map((item: any) => String(item || '').trim()).filter(Boolean)

  if (approvalBlocker) {
    risks.push({
      count: 1,
      item: `处理入库阻断：${approvalBlocker.label} · ${approvalBlocker.detail}`,
      directive: `必须优先处理入库阻断：${approvalBlocker.label}。${approvalBlocker.detail}。修订时先解除阻断原因，再处理普通润色；修后必须重新复检并确认可以入库。`,
      priority_label: '优先处理入库阻断',
      evidence: approvalBlocker,
    })
  }

  const core = deliveryRiskPayload(reviews, chapter.id, 'chapter_core_drift', 'core_drift')
  const coreCount = countPayloadNumber(core?.risk_count ?? core?.riskCount, countItems(core?.drift_risks) || countItems(core?.risks))
  if (coreCount > 0 || core?.status === 'warn') {
    risks.push({
      count: Math.max(1, coreCount),
      item: `守核心：${String(core?.label || `核心偏移 ${Math.max(1, coreCount)}`)}`,
      directive: '优先守住作品核心、读者承诺、本章目标和核心冲突，不要只做普通润色。',
      priority_label: '优先补核心',
      evidence: core,
    })
  }

  const runway = deliveryRiskPayload(reviews, chapter.id, 'runway_sync', 'runway_sync')
  const runwayCount = countPayloadNumber(
    runway?.risk_count ?? runway?.riskCount,
    countItems(runway?.four_question_missed) + countItems(runway?.reader_fuel_missed) + countItems(runway?.redline_touched),
  )
  if (runwayCount > 0 || runway?.status === 'warn') {
    risks.push({
      count: Math.max(1, runwayCount),
      item: `补航线：${String(runway?.label || `航线风险 ${Math.max(1, runwayCount)}`)}`,
      directive: '补齐百万字航线的本章四问、读者燃料和红线约束，确保当前章服务长期主线和追读承诺。',
      priority_label: '优先补航线',
      evidence: runway,
    })
  }

  if (qualityMustFix.length > 0) {
    risks.push({
      count: qualityMustFix.length,
      item: `修质量：${qualityMustFix.slice(0, 2).join('；')}`,
      directive: '按质量必修项逐条修复，修订后需要重新复检当前正文。',
      priority_label: '优先修质量',
      evidence: qualityMustFix,
    })
  }

  const revisionCascadeImpact = deliveryRiskPayload(reviews, chapter.id, 'revision_cascade_impact_sync', 'revision_cascade_impact_sync')
  const revisionCascadeImpactCountValue = deliveryRiskMissedCount(revisionCascadeImpact)
  if (revisionCascadeImpactCountValue > 0 || revisionCascadeImpact?.status === 'warn') {
    risks.push({
      count: Math.max(1, revisionCascadeImpactCountValue),
      item: `级联修订：${String(revisionCascadeImpact?.label || `修订级联影响 ${Math.max(1, revisionCascadeImpactCountValue)}`)}`,
      directive: '复核 revision_receipts.cascade_impacts；后续章节必须先同步修订后的伏笔、时间线、角色状态、资产归属和关系边界，再推进新冲突。',
      priority_label: '优先级联修订',
      evidence: revisionCascadeImpact,
    })
  }

  const revisionScopeGuard = deliveryRiskPayload(reviews, chapter.id, 'revision_scope_guard_sync', 'revision_scope_guard_sync')
  const revisionScopeGuardCountValue = deliveryRiskMissedCount(revisionScopeGuard)
  if (revisionScopeGuardCountValue > 0 || revisionScopeGuard?.status === 'warn') {
    risks.push({
      count: Math.max(1, revisionScopeGuardCountValue),
      item: `稳修订幅度：${String(revisionScopeGuard?.label || `修订幅度风险 ${Math.max(1, revisionScopeGuardCountValue)}`)}`,
      directive: '按 oh-story workflow-revision 复核修订幅度；下一轮修订不要重写整章，只按自检证据、修订回执残留和确定性检查缺口做局部修复。',
      priority_label: '优先稳修订幅度',
      evidence: revisionScopeGuard,
    })
  }

  const proseRevisionReceipt = deliveryRiskPayload(reviews, chapter.id, 'prose_revision_receipt_sync', 'prose_revision_receipt_sync')
  const proseRevisionReceiptCountValue = deliveryRiskMissedCount(proseRevisionReceipt)
  if (proseRevisionReceiptCountValue > 0 || proseRevisionReceipt?.status === 'warn') {
    risks.push({
      count: Math.max(1, proseRevisionReceiptCountValue),
      item: `复核修订回执：${String(proseRevisionReceipt?.label || `修订回执残留 ${Math.max(1, proseRevisionReceiptCountValue)}`)}`,
      directive: '补齐 delivery_risk_receipts 对应的 revision_receipts；每条必须写 required_action、repair_segment、applied_fix 和 changed_evidence，不能只补普通润色回执或用一条汇总回执覆盖多条风险。',
      priority_label: '优先修订回执',
      evidence: proseRevisionReceipt,
    })
  }

  const deslopRepairReceipt = deliveryRiskPayload(reviews, chapter.id, 'deslop_repair_receipt_sync', 'deslop_repair_receipt_sync')
  const deslopRepairReceiptCountValue = deslopRepairReceiptCount(deslopRepairReceipt)
  if (deslopRepairReceiptCountValue > 0 || deslopRepairReceipt?.status === 'warn') {
    risks.push({
      count: Math.max(1, deslopRepairReceiptCountValue),
      item: `复核去AI味回执：${String(deslopRepairReceipt?.label || `去AI味修复回执残留 ${Math.max(1, deslopRepairReceiptCountValue)}`)}`,
      directive: '重新修订并逐条输出 deslop_repair_receipts.changed_evidence；每条回执必须对应 deslop_checks 或 oh-story story-deslop Gate A-G 原 fail/warn 项，并能定位到修订后正文证据。',
      priority_label: '优先去AI味回执',
      evidence: deslopRepairReceipt,
    })
  }

  const qualityAuditRepairReceipt = deliveryRiskPayload(reviews, chapter.id, 'quality_audit_repair_receipt_sync', 'quality_audit_repair_receipt_sync')
  const qualityAuditRepairReceiptCountValue = qualityAuditRepairReceiptCount(qualityAuditRepairReceipt)
  if (qualityAuditRepairReceiptCountValue > 0 || qualityAuditRepairReceipt?.status === 'warn') {
    risks.push({
      count: Math.max(1, qualityAuditRepairReceiptCountValue),
      item: `复核质量回执：${String(qualityAuditRepairReceipt?.label || `质量诊断修复回执缺口 ${Math.max(1, qualityAuditRepairReceiptCountValue)}`)}`,
      directive: '重新修订并逐条输出 quality_audit_repair_receipts.changed_evidence；每条回执必须对应 quality_audit_checks 中原 fail/warn 项，并能定位到修订后正文证据。',
      priority_label: '优先补质量回执',
      evidence: qualityAuditRepairReceipt,
    })
  }

  const expectation = deliveryRiskPayload(reviews, chapter.id, 'reader_expectation_sync', 'reader_expectation_sync')
  const expectationCount = countPayloadNumber(expectation?.missed_count ?? expectation?.missedCount, countItems(expectation?.missed))
  const hasExpectationRisk = expectationCount > 0 || expectation?.status === 'warn'
  const hasOpeningHandoffMiss = openingHandoffMisses(expectation).length > 0
  if (hasExpectationRisk) {
    risks.push({
      count: Math.max(1, expectationCount),
      item: hasOpeningHandoffMiss
        ? `修开篇承接：${openingHandoffMissLabel(expectation)}`
        : `补期待：${String(expectation?.label || `期待欠账 ${Math.max(1, expectationCount)}`)}`,
      directive: hasOpeningHandoffMiss
        ? '优先重写或补写本章前300字，必须直接接住上一章最后一幕、未解决危机或读者期待，不得用泛环境、泛醒来、泛解释重新开场。'
        : '补齐读者期待账本中的必兑现项，把承诺写成可见行动、冲突结果、情绪回报或章末未解问题。',
      priority_label: hasOpeningHandoffMiss ? '优先修开篇' : '优先补期待',
      evidence: expectation,
    })
  }

  const retention = deliveryRiskPayload(reviews, chapter.id, 'reader_retention_sync', 'reader_retention_sync')
  const retentionCount = countPayloadNumber(retention?.missed_count ?? retention?.missedCount, countItems(retention?.missed))
  if (!hasExpectationRisk && (retentionCount > 0 || retention?.status === 'warn')) {
    risks.push({
      count: Math.max(1, retentionCount),
      item: `补追读：${String(retention?.label || `漏追读 ${Math.max(1, retentionCount)}`)}`,
      directive: '补齐开篇钩子、信息缺口、短剧化场面和章末追读问题，尤其要检查前300字与最后一幕。',
      priority_label: '优先补追读',
      evidence: retention,
    })
  }

  const payoff = deliveryRiskPayload(reviews, chapter.id, 'reader_payoff_sync', 'reader_payoff_sync')
  const payoffCount = countPayloadNumber(payoff?.debt_count ?? payoff?.debtCount, countItems(payoff?.missed) || countItems(payoff?.debts))
  if (!hasExpectationRisk && (payoffCount > 0 || payoff?.status === 'warn')) {
    risks.push({
      count: Math.max(1, payoffCount),
      item: `补回报：${String(payoff?.label || `回报欠账 ${Math.max(1, payoffCount)}`)}`,
      directive: '补足本章承诺的爽点、惊点、信息回收或关系变化，不能只留下铺垫。',
      priority_label: '优先补回报',
      evidence: payoff,
    })
  }

  const volumeBeat = deliveryRiskPayload(reviews, chapter.id, 'volume_beat_sync', 'volume_beat_sync')
  const volumeBeatCount = countPayloadNumber(volumeBeat?.missed_count ?? volumeBeat?.missedCount, countItems(volumeBeat?.missed))
  if (volumeBeatCount > 0 || volumeBeat?.status === 'warn') {
    risks.push({
      count: Math.max(1, volumeBeatCount),
      item: `补爆点：${String(volumeBeat?.label || `爆点漏兑现 ${Math.max(1, volumeBeatCount)}`)}`,
      directive: '补足本章卷级爆点、小高潮、中高潮或卷末爆点，把转折写成现场冲突、选择代价、反制结果、关系变化或章末升级。',
      priority_label: '优先补爆点',
      evidence: volumeBeat,
    })
  }

  const signatureScene = deliveryRiskPayload(reviews, chapter.id, 'signature_scene_sync', 'signature_scene_sync')
  const signatureSceneCount = countPayloadNumber(signatureScene?.missed_count ?? signatureScene?.missedCount, countItems(signatureScene?.missed))
  if (signatureSceneCount > 0 || signatureScene?.status === 'warn') {
    risks.push({
      count: Math.max(1, signatureSceneCount),
      item: `补强场面：${String(signatureScene?.label || `强场面漏写 ${Math.max(1, signatureSceneCount)}`)}`,
      directive: '补回开写任务书指定的标志性强场面，把它写成可视化动作、空间冲突、规则代价、公开反转或读者可讨论的选择，不要只补气氛描写。',
      priority_label: '优先补强场面',
      evidence: signatureScene,
    })
  }

  const innovation = deliveryRiskPayload(reviews, chapter.id, 'innovation_sync', 'innovation_sync')
  const innovationCount = countPayloadNumber(innovation?.missed_count ?? innovation?.missedCount, countItems(innovation?.missed))
  if (innovationCount > 0 || innovation?.status === 'warn') {
    risks.push({
      count: Math.max(1, innovationCount),
      item: `补创新：${String(innovation?.label || `创新缺口 ${Math.max(1, innovationCount)}`)}`,
      directive: '补足本章创新执行，不把章节写成普通套路章；把创新角度写成可见选择、机制反差、规则代价或 IP 化场面。',
      priority_label: '优先补创新',
      evidence: innovation,
    })
  }

  const storyline = deliveryRiskPayload(reviews, chapter.id, 'storyline_sync', 'storyline_sync')
  const storylineCount = countItems(storyline?.missed) + countItems(storyline?.unplanned) + countItems(storyline?.forbidden_touched)
  if (storylineCount > 0 || storyline?.status === 'warn') {
    risks.push({
      count: Math.max(1, storylineCount),
      item: `校剧情线：${String(storyline?.label || `剧情线风险 ${Math.max(1, storylineCount)}`)}`,
      directive: '对齐本章计划推进、埋线、回收和禁揭边界，避免临时加戏或提前揭底。',
      priority_label: '优先校剧情线',
      evidence: storyline,
    })
  }

  const storyUnit = deliveryRiskPayload(reviews, chapter.id, 'story_unit_sync', 'story_unit_sync')
  const storyUnitCount = storyUnitSyncRiskCount(storyUnit)
  if (storyUnitCount > 0 || storyUnit?.status === 'warn') {
    risks.push({
      count: Math.max(1, storyUnitCount),
      item: `校单元：${String(storyUnit?.label || `剧情单元风险 ${Math.max(1, storyUnitCount)}`)}`,
      directive: '补足当前剧情单元职责；把抢跑的小高潮、出单元钩子或后段兑现改成暗示、误导、遮挡或延迟兑现，不得提前解决禁抢跑内容。',
      priority_label: '优先校单元',
      evidence: storyUnit,
    })
  }

  const storyDrive = deliveryRiskPayload(reviews, chapter.id, 'story_drive_sync', 'story_drive_sync')
  const storyDriveCount = countPayloadNumber(storyDrive?.missed_count ?? storyDrive?.missedCount, countItems(storyDrive?.missed))
  if (storyDriveCount > 0 || storyDrive?.status === 'warn') {
    risks.push({
      count: Math.max(1, storyDriveCount),
      item: `补故事力：${String(storyDrive?.label || `故事力缺口 ${Math.max(1, storyDriveCount)}`)}`,
      directive: '补出主角主动选择、明确阻碍、选择代价、局面变化和下一步因果，避免章节只有事件没有人物决策。',
      priority_label: String(storyDrive?.priority_repair || storyDrive?.priorityRepair || '优先补主角选择'),
      evidence: storyDrive,
    })
  }

  const characterArc = deliveryRiskPayload(reviews, chapter.id, 'character_arc_sync', 'character_arc_sync')
  const characterArcCount = countPayloadNumber(characterArc?.missed_count ?? characterArc?.missedCount, countItems(characterArc?.missed))
  if (characterArcCount > 0 || characterArc?.status === 'warn') {
    risks.push({
      count: Math.max(1, characterArcCount),
      item: `补人物弧光：${String(characterArc?.label || `人物弧光缺口 ${Math.max(1, characterArcCount)}`)}`,
      directive: '补出角色欲望、缺陷受压、关系变化、成长节点和口吻锚点，避免章节只有事件推进但人物没有变化。',
      priority_label: String(characterArc?.priority_repair || characterArc?.priorityRepair || '优先补成长节点'),
      evidence: characterArc,
    })
  }

  const styleSample = deliveryRiskPayload(reviews, chapter.id, 'style_sample_sync', 'style_sample_sync')
  const styleSampleCount = countPayloadNumber(
    styleSample?.missed_count ?? styleSample?.missedCount,
    countItems(styleSample?.missed) + countItems(styleSample?.copied_phrases || styleSample?.copiedPhrases),
  )
  if (styleSampleCount > 0 || styleSample?.status === 'warn') {
    risks.push({
      count: Math.max(1, styleSampleCount),
      item: `校风格：${String(styleSample?.label || `风格缺口 ${Math.max(1, styleSampleCount)}`)}`,
      directive: '按风格样章重修叙述节奏、句式密度、对白比例和角色口吻；只学习抽象表达方法，不得照搬样章原句。',
      priority_label: countItems(styleSample?.copied_phrases || styleSample?.copiedPhrases) > 0 ? '优先去照搬' : '优先校风格',
      evidence: styleSample,
    })
  }

  const readability = deliveryRiskPayload(reviews, chapter.id, 'readability_review', 'readability_review')
  const memeSense = readability?.meme_sense || {}
  const openingScore = openingHookScore(readability)
  const endingScore = endingHookScore(readability)
  const sceneScore = sceneReadabilityScore(readability)
  const payoffScore = payoffDensityScore(readability)
  if (hasWeakOpeningHook(readability)) {
    risks.push({
      count: 1,
      item: `修开篇吸引力：开篇吸引力 ${openingScore}`,
      directive: '重写或补写本章前300字，必须快速给出异常、危险、欲望或反常信息，并把角色选择、危机反馈或信息增量压到开篇现场。',
      priority_label: '优先修开篇',
      evidence: readability,
    })
  }
  if (hasWeakEndingHook(readability)) {
    risks.push({
      count: 1,
      item: `修章末翻页：章末翻页 ${endingScore}`,
      directive: '重写或补写本章最后300字，必须把危险升级、选择压力、反转、未解答案或利益诱惑压到最后一幕，让下一章非看不可。',
      priority_label: '优先修章末',
      evidence: readability,
    })
  }
  if (hasWeakSceneProgression(readability)) {
    risks.push({
      count: 1,
      item: `修场景推进：场景推进 ${sceneScore}`,
      directive: '补齐每个场景的目标、阻碍、转折、回报；把纯解释段改成行动、对话、受阻、选择代价和结果变化，不得只补说明文字。',
      priority_label: '优先修场景',
      evidence: readability,
    })
  }
  if (hasWeakPayoffDensity(readability)) {
    risks.push({
      count: 1,
      item: `补爽点密度：爽点密度 ${payoffScore}`,
      directive: '按每800-1200字至少一次信息推进、能力展示、危机反制、关系变化或小回收的节奏补足读者回报，避免只有铺垫没有短周期收益。',
      priority_label: '优先补爽点',
      evidence: readability,
    })
  }
  const readabilityCount = countItems(memeSense?.immersion_risks) || countItems(readability?.immersion_risks)
  if (readabilityCount > 0) {
    risks.push({
      count: readabilityCount,
      item: `调可读性：出戏风险 ${readabilityCount}`,
      directive: '调整段落密度、对话比例、角色口吻和网感强度，避免热梗或说明文字打断沉浸。',
      priority_label: '优先调可读性',
      evidence: readability,
    })
  }

  const totalCount = risks.reduce((sum, risk) => sum + risk.count, 0)
  return {
    chapter_id: chapter.id,
    chapter_no: chapter.chapter_no,
    total_count: totalCount,
    label: totalCount > 0 ? `待修复 ${totalCount}` : '无待修复风险',
    priority_label: risks[0]?.priority_label || '可进入下一章',
    items: risks.map(risk => risk.item),
    revision_directives: risks.map(risk => risk.directive),
    approval_blocker: approvalBlocker,
    risks: risks.map(risk => ({
      count: risk.count,
      item: risk.item,
      priority_label: risk.priority_label,
      directive: risk.directive,
      evidence: risk.evidence,
    })),
  }
}

export function buildDeliveryRiskConvergenceReport({
  chapter,
  sourceReviewId,
  before,
  after,
}: {
  chapter: any
  sourceReviewId?: any
  before: any
  after: any
}) {
  const beforeCount = Number(before?.total_count || 0)
  const afterCount = Number(after?.total_count || 0)
  const resolvedCount = Math.max(0, beforeCount - afterCount)
  const addedCount = Math.max(0, afterCount - beforeCount)
  const status = afterCount === 0
    ? 'cleared'
    : resolvedCount > 0
      ? 'improved'
      : addedCount > 0
        ? 'worse'
        : 'unchanged'
  const label = status === 'cleared'
    ? '风险已清零'
    : status === 'improved'
      ? `风险收敛 ${resolvedCount}`
      : status === 'worse'
        ? `新增风险 ${addedCount}`
        : `仍有残留 ${afterCount}`
  const residualItems = asArray(after?.items).map((item: any) => String(item || '').trim()).filter(Boolean)
  const nextActions = afterCount > 0
    ? [`继续处理残留风险：${residualItems.slice(0, 3).join('；') || after?.priority_label || '复盘本章交稿风险'}`]
    : ['本章交稿风险已收敛，可以进入最终验收。']

  return {
    chapter_id: chapter.id,
    chapter_no: chapter.chapter_no,
    source_review_id: sourceReviewId || null,
    status,
    label,
    before_count: beforeCount,
    after_count: afterCount,
    resolved_count: resolvedCount,
    residual_count: afterCount,
    added_count: addedCount,
    before,
    after,
    next_actions: nextActions,
  }
}

export function buildEditorReportPrompt({
  project,
  contextPackage,
  chapter,
  latestQuality,
  latestReference,
  deliveryRiskBrief,
}: {
  project: any
  contextPackage: any
  chapter: any
  latestQuality: any
  latestReference: any
  deliveryRiskBrief?: any
}) {
  return [
    '任务：生成商用编辑部风格的章节编辑报告。只输出 JSON。',
    `项目：${project.title}`,
    '检查维度：结构审稿、连续性审稿、节奏审稿、文风审稿、原创性审稿、商业审稿。',
    '每个维度输出 score, verdict, issues(array), revision_actions(array), accept_criteria(array)。',
    '如果存在交稿风险清单，报告 must_fix 和 one_click_revision_prompt 必须优先覆盖这些风险，不得只做普通润色。',
    '最后输出 overall_score, must_fix, optional_improvements, one_click_revision_prompt。',
    '【上下文包】',
    editorJson(contextPackage, 9000),
    '【交稿风险清单】',
    editorJson(deliveryRiskBrief || {}, 5000),
    '【章节正文】',
    String(chapter.chapter_text || '').slice(0, 14000),
    '【已有质检】',
    editorJson({ latestQuality, latestReference }, 4000),
  ].join('\n')
}

const REVISION_MODE_GUIDE: Record<string, string> = {
  from_report: '按报告综合修订，优先处理高严重度问题。',
  expand_action: '重点补足战斗、追逐、清剿、灾祸或强冲突过程。必须写出动作起手、空间位置、对手反应、受伤/资源损耗/信息暴露、反制动作和结果。',
  cut_description: '重点压缩不推动剧情的环境描写和连续氛围段落。保留影响动作空间、诡异规则、危险判断的描写。',
  tighten_pacing: '重点提高事件密度，删掉空泛总结和重复解释。每 3-5 段必须有行动、选择、信息变化或关系变化。',
  add_consequence: '重点补充行动后果，包括伤势、物品损耗、暴露秘密、角色关系变化、规则代价。',
  restore_hook: '重点强化章末钩子，同时保持前文因果自然。',
}

function compactWorkflowRevisionContextValue(value: any, max = 1200) {
  if (value === null || value === undefined || value === '') return ''
  const text = typeof value === 'string' ? value : editorJson(value)
  return String(text || '').slice(0, max)
}

export function buildWorkflowRevisionContextBrief(contextPackage: any = {}, chapter: any = {}) {
  if (!contextPackage || typeof contextPackage !== 'object') return null
  const continuity = contextPackage.continuity || {}
  const chapterTarget = contextPackage.chapter_target || contextPackage.chapterTarget || {}
  const storyState = contextPackage.story_state || contextPackage.storyState || {}
  const brief = {
    previous_chapter: compactWorkflowRevisionContextValue(
      continuity.previous_chapter || continuity.previousChapter || contextPackage.previous_chapter || contextPackage.previousChapter || chapterTarget.previous_handoff || chapterTarget.previousHandoff,
    ),
    current_chapter: compactWorkflowRevisionContextValue({
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      goal: chapterTarget.chapter_goal || chapterTarget.goal || chapterTarget.summary || chapter.chapter_goal || chapter.chapter_summary,
      conflict: chapterTarget.conflict || chapter.conflict,
      ending_hook: chapterTarget.ending_hook || chapter.ending_hook,
    }),
    next_chapter: compactWorkflowRevisionContextValue(
      continuity.next_chapter || continuity.nextChapter || contextPackage.next_chapter || contextPackage.nextChapter || chapterTarget.next_chapter_handoff || chapterTarget.nextChapterHandoff,
    ),
    outline: compactWorkflowRevisionContextValue(
      contextPackage.chapter_outline || contextPackage.chapterOutline || contextPackage.outline || contextPackage.current_outline || contextPackage.currentOutline || chapterTarget.chapter_blueprint || chapterTarget.chapterBlueprint,
    ),
    foreshadowing: compactWorkflowRevisionContextValue(
      contextPackage.foreshadowing_context || contextPackage.foreshadowingContext || contextPackage.foreshadowing || storyState.foreshadowing || storyState.foreshadowings,
    ),
    character_cards: compactWorkflowRevisionContextValue(
      contextPackage.character_cards || contextPackage.characterCards || contextPackage.relevant_characters || contextPackage.relevantCharacters || storyState.characters,
    ),
    timeline: compactWorkflowRevisionContextValue(
      contextPackage.timeline_context || contextPackage.timelineContext || contextPackage.timeline || storyState.timeline || storyState.events,
    ),
    setting_context: compactWorkflowRevisionContextValue(
      contextPackage.setting_context || contextPackage.settingContext || contextPackage.worldbuilding || storyState.setting_context || storyState.settingContext,
    ),
    relationship_boundaries: compactWorkflowRevisionContextValue(
      contextPackage.relationship_graph || contextPackage.relationshipGraph || contextPackage.character_relation_contract || contextPackage.characterRelationContract,
    ),
  }
  const compactBrief = Object.fromEntries(Object.entries(brief).filter(([, value]) => Boolean(value)))
  return Object.keys(compactBrief).length ? compactBrief : null
}

export function buildEditorRevisionPrompt({
  project,
  chapter,
  contextPackage,
  report,
  deliveryRiskBrief,
  revisionMode,
  userPrompt,
}: {
  project: any
  chapter: any
  contextPackage?: any
  report: any
  deliveryRiskBrief?: any
  revisionMode: string
  userPrompt?: string
}) {
  const originalText = String(chapter.chapter_text || '')
  const originalLength = originalText.length
  const workflowRevisionContextBrief = buildWorkflowRevisionContextBrief(contextPackage, chapter)
  const strategy = String(report?.revision_strategy || deliveryRiskBrief?.revision_strategy || 'surgical_patch')
  const structural = strategy === 'structural_rewrite'
  const openingStructural = strategy === 'opening_structural_patch'
  const focusedRiskBrief = focusDeliveryRiskBriefForRevision(deliveryRiskBrief || {}, report || {})
  const mustFixLines = uniqueRevisionTexts(report?.must_fix || report?.one_click_revision_prompt, 6)
  if (openingStructural) {
    const replaceableOpening = originalText.slice(0, Math.min(1400, Math.max(700, Math.floor(originalLength * 0.24))))
    const resumeHint = originalText.slice(replaceableOpening.length, replaceableOpening.length + 180).trim()
    return [
      '任务：只修本章开篇连续性（章末主钩子/进度回放）。只输出 JSON。禁止输出完整 chapter_text。',
      `项目：${project.title}`,
      '要求：开篇前 300-800 字必须先承接上一章真正章末钩子；禁止先重播上一章中段平行戏或已兑现冲突。',
      `本次修订模式：${revisionMode}。opening_structural_patch = 只重写开篇，其余正文尽量保留。`,
      `原文长度：${originalLength} 字。不要为了修开篇而重写整章。`,
      '硬优先级（只修这些）：',
      ...mustFixLines.map((item, index) => `${index + 1}. ${item}`),
      '推荐输出方式（二选一，优先 A）：',
      'A) opening_rewrite + keep_from：opening_rewrite=新开篇；keep_from=原文后段唯一短锚点（从下方“可保留接续锚点”复制）。',
      'B) replacements：1-2 条，find 必须从“可替换开篇区”精确复制，replace 为新开篇。',
      '【可替换开篇区】',
      replaceableOpening,
      resumeHint ? '【可保留接续锚点候选】' : '',
      resumeHint || '',
      '【必修项】',
      editorJson({ must_fix: mustFixLines, revision_strategy: 'opening_structural_patch', overall_score: report?.overall_score }, 2500),
      '【聚焦交稿风险】',
      editorJson(focusedRiskBrief || {}, 2500),
      workflowRevisionContextBrief ? '【上下文摘要】' : '',
      workflowRevisionContextBrief ? editorJson({
        previous_chapter: workflowRevisionContextBrief.previous_chapter,
        current_chapter: workflowRevisionContextBrief.current_chapter,
      }, 3500) : '',
      '【修订提示】',
      String(userPrompt || report?.one_click_revision_prompt || mustFixLines.join('；')),
      '输出 JSON 示例：',
      '{"revision_mode":"opening_structural_patch","opening_rewrite":"新开篇正文...","keep_from":"原文唯一短锚点","revision_summary":"开篇改接章末主钩子，去掉平行戏回放"}',
    ].filter(Boolean).join('\n')
  }
  if (structural) {
    return [
      '任务：根据质检/交付风险对当前章节做结构修订。只输出 JSON。',
      `项目：${project.title}`,
      '要求：优先消除进度回放、章首承接失败、章末交接缺口；可以改写开篇与中段冲突，但必须承接上一章已兑现事实，不得重演已打完的高潮。',
      `本次修订模式：${revisionMode}。结构修订允许较大改动，不只是润色。`,
      `原文长度：${originalLength} 字。若因消除回放导致字数变化超过 30%，revision_scope_guard.over_limit=true，但仍应完成本次结构修复。`,
      '硬优先级（只修这些，不要同时处理全部交稿标签）：',
      ...mustFixLines.map((item, index) => `${index + 1}. ${item}`),
      '正文工艺硬约束：动作链完整；不要用环境描写替代推进；章末必须留下未解决钩子。',
      '禁止把“无需修改/处理得精彩”之类低优先级意见覆盖高优先级回放修复。',
      '输出策略：优先输出完整 chapter_text；只有改动极少时才改用 replacements。',
      '【必修项】',
      editorJson({ must_fix: mustFixLines, revision_strategy: 'structural_rewrite', overall_score: report?.overall_score }, 4000),
      '【聚焦交稿风险】',
      editorJson(focusedRiskBrief || {}, 3500),
      workflowRevisionContextBrief ? '【上下文摘要】' : '',
      workflowRevisionContextBrief ? editorJson({
        previous_chapter: workflowRevisionContextBrief.previous_chapter,
        current_chapter: workflowRevisionContextBrief.current_chapter,
        next_chapter: workflowRevisionContextBrief.next_chapter,
        outline: workflowRevisionContextBrief.outline,
      }, 5000) : '',
      '【修订提示】',
      String(userPrompt || report?.one_click_revision_prompt || mustFixLines.join('；')),
      '【原章节正文】',
      originalText.slice(0, 14000),
      '输出 JSON：',
      '{',
      '  "revision_mode": "structural_rewrite",',
      '  "chapter_text": "完整修订后正文",',
      '  "continuity_notes": ["修订后的连续性说明"],',
      '  "revision_scope_guard": {"original_word_count": 0, "revised_word_count": 0, "word_delta": 0, "over_limit": false, "action": "结构修订"},',
      '  "revision_receipts": [{"required_action": "对应必修项", "repair_segment": "opening|middle|ending|global", "applied_fix": "实际改法", "changed_evidence": "修后正文短句"}],',
      '  "revision_summary": "简述如何消除回放并承接上一章"',
      '}',
    ].filter(Boolean).join('\n')
  }
  return [
    '任务：根据商业编辑报告对当前章节做局部修订补丁。只输出 JSON。',
    `项目：${project.title}`,
    '要求：保留当前章节整体结构、节奏、章末钩子和可用文气；只修复报告指出的问题；不得照搬参考作品。',
    `本次修订模式：${revisionMode}。${REVISION_MODE_GUIDE[revisionMode] || REVISION_MODE_GUIDE.from_report}`,
    `oh-story workflow-revision：本次属于已写章节大修/回炉；修订前按 Step 2 做上下文对照，修订后按 Step 4 做级联检查和 Step 5 质量检查。`,
    `原文长度：${originalLength} 字；修订后字数差异超过原文 30% 或超过 800 字（取较大值）时，必须在 revision_scope_guard 标记 over_limit=true 并说明是否需要拆成局部二修。`,
    'workflow-revision 上下文对照：必须逐项核对 previous_chapter、current_chapter、next_chapter 或下一章细纲、foreshadowing、character_cards、timeline、setting_context、资产归属和关系边界；缺来源时 status=warn/fail，不得假设已经一致。',
    '正文工艺硬约束：不要用环境描写替代剧情推进；涉及战斗/行动时必须补足动作链、空间变化、代价和结果；删改时不得破坏连续性。',
    '级联检查硬约束：如果修订改变伏笔、时间线、角色状态、关系、资产归属或世界观设定，revision_receipts 必须写 affected_chapters 和 cascade_impacts，并说明后续章节或下一章细纲需要如何同步。',
    '质量检查硬约束：修订后必须做正文元信息扫描和禁用词扫描；标题行以外不得混入“上一章/本章/前文/伏笔/细纲/读者”等写作工程词，命中要改成角色当下可感知的事件锚点。',
    '交稿风险硬约束：如果交稿风险清单不为空，必须优先修复清单中的核心偏移、追读漏项、回报欠账、创新缺口、剧情线风险和出戏风险；不得只按普通润色处理。',
    '为了避免长连接失败，优先输出局部补丁，不要输出完整正文。',
    '补丁长度硬约束：每条 find/anchor 控制在 30-300 字，必须是原文中唯一可精确匹配的短片段；不要把整章或多段长正文塞进 find/anchor。需要大幅删减时拆成多条短 replacement；删除时 replace 允许为空字符串。',
    '【编辑报告】',
    editorJson(report, 7000),
    '【交稿风险清单】',
    editorJson(focusedRiskBrief || deliveryRiskBrief || {}, 5000),
    workflowRevisionContextBrief ? '【workflow-revision 上下文包】' : '',
    workflowRevisionContextBrief ? '以下片段来自 MangaForge 章节上下文包；修订前必须据此完成 Step 2 上下文对照，修订后在 revision_context_receipts 中逐项回执。' : '',
    workflowRevisionContextBrief ? editorJson(workflowRevisionContextBrief, 7000) : '',
    '【修订提示】',
    String(userPrompt || report.one_click_revision_prompt || ''),
    '【原章节正文】',
    String(chapter.chapter_text || '').slice(0, 12000),
    '输出 JSON：',
    '{',
    '  "revision_mode": "patch",',
    '  "replacements": [{"find": "原文中可精确匹配的一小段", "replace": "替换后的文字"}],',
    '  "insertions": [{"anchor": "原文中可精确匹配的一小段", "position": "before|after", "text": "要插入的文字"}],',
    '  "continuity_notes": ["修订后的连续性说明"],',
    '  "revision_context_receipts": [{"key": "previous_chapter|next_chapter|foreshadowing|character_cards|timeline|setting_context|prose_meta|banned_words", "label": "核对项", "status": "pass|warn|fail", "evidence": "修订后正文或上下文证据", "fix": "仍需处理时的修复动作", "source_excerpt": "用于核对的原文/上下文短摘"}],',
    '  "revision_scope_guard": {"original_word_count": 0, "revised_word_count": 0, "word_delta": 0, "threshold": "max(原文30%, 800字)", "over_limit": false, "action": "局部修订/需要二修/提醒用户确认"},',
    '  "revision_receipts": [{"required_action": "对应报告或交稿风险的修订动作", "repair_segment": "opening|middle|ending|global", "applied_fix": "实际改法", "changed_evidence": "修订后正文可定位证据", "affected_chapters": [], "cascade_impacts": []}],',
    '  "revision_summary": "简述修了什么"',
    '}',
  ].filter(Boolean).join('\n')
}

export function buildCompactEditorRevisionPrompt({
  project,
  chapter,
  report,
  deliveryRiskBrief,
  revisionMode,
  userPrompt,
  previousOutputPreview,
}: {
  project: any
  chapter: any
  report: any
  deliveryRiskBrief?: any
  revisionMode: string
  userPrompt?: string
  previousOutputPreview?: string
}) {
  const strategy = String(report?.revision_strategy || deliveryRiskBrief?.revision_strategy || '')
  const structural = strategy === 'structural_rewrite'
  const openingStructural = strategy === 'opening_structural_patch' || strategy === 'structural_rewrite'
  // Truncated full-chapter structural rewrite almost always needs opening-only retry, not another full chapter_text.
  if (openingStructural) {
    const originalText = String(chapter.chapter_text || '')
    const replaceableOpening = originalText.slice(0, Math.min(1200, Math.max(600, Math.floor(originalText.length * 0.22))))
    const resumeHint = originalText.slice(replaceableOpening.length, replaceableOpening.length + 160).trim()
    return [
      '上一次修订因输出过长被截断或不可解析。现在只修开篇连续性，禁止输出完整 chapter_text。',
      `项目：${project.title}`,
      '只处理最高优先级：开篇承接章末主钩子 / 禁止平行戏或进度回放。',
      '只输出一个可完整闭合的 JSON object。',
      '【必修项】',
      editorJson({ must_fix: uniqueRevisionTexts(report?.must_fix || report?.one_click_revision_prompt, 4), revision_strategy: 'opening_structural_patch' }, 1800),
      '【可替换开篇区】',
      replaceableOpening,
      resumeHint ? '【可保留接续锚点候选】' : '',
      resumeHint || '',
      '【修订提示】',
      String(userPrompt || report?.one_click_revision_prompt || ''),
      previousOutputPreview ? '【上次失败输出预览】' : '',
      previousOutputPreview ? String(previousOutputPreview).slice(0, 800) : '',
      'JSON 示例：{"revision_mode":"opening_structural_patch","opening_rewrite":"新开篇...","keep_from":"原文短锚点","revision_summary":"开篇改接主钩子"}',
      '也可：{"revision_mode":"patch","replacements":[{"find":"开篇区唯一短锚点","replace":"新开篇片段"}],"revision_summary":"去掉回放"}',
    ].filter(Boolean).join('\n')
  }
  return [
    '任务：上一次修订输出被截断。现在只生成极短、可应用的 JSON 补丁。不要输出 Markdown，不要输出代码块，不要解释。',
    `项目：${project.title}`,
    `本次修订模式：${revisionMode}。${REVISION_MODE_GUIDE[revisionMode] || REVISION_MODE_GUIDE.from_report}`,
    '硬性格式：只输出一个 JSON object，字段只允许 revision_mode, replacements, insertions, continuity_notes, revision_summary。',
    '硬性限制：禁止输出 chapter_text。最多 6 条 replacements，最多 3 条 insertions。',
    'replacement 限制：find 控制在 20-160 字，必须从原文精确复制且能唯一定位；replace 控制在 0-900 字。删除时 replace 用空字符串。不要把整段长正文塞进 find 或 replace。',
    'insertion 限制：anchor 控制在 20-160 字，text 控制在 20-900 字。',
    '如果修不完，只修最高优先级的 1-3 个问题，保证 JSON 完整闭合。',
    '【编辑报告】',
    editorJson(report, 3000),
    '【交稿风险清单】',
    editorJson(deliveryRiskBrief || {}, 2500),
    '【修订提示】',
    String(userPrompt || report.one_click_revision_prompt || ''),
    '【上一次被截断输出片段，仅用于避免重复犯错】',
    String(previousOutputPreview || '').slice(0, 1200),
    '【原章节正文】',
    String(chapter.chapter_text || '').slice(0, 12000),
    'JSON 示例：{"revision_mode":"patch","replacements":[{"find":"原文中唯一短锚点","replace":""}],"insertions":[],"continuity_notes":[],"revision_summary":"修了最高优先级问题"}',
  ].join('\n')
}

function uniqueRevisionTexts(values: any, limit = 8) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of asArray(values)) {
    const text = String(raw ?? '').replace(/\s+/g, ' ').trim()
    if (!text) continue
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(text)
    if (out.length >= limit) break
  }
  return out
}

function isKeepAsIsRevisionIssue(issue: any) {
  const blob = [
    issue?.description,
    issue?.suggestion,
    issue?.fix,
    issue?.message,
    typeof issue === 'string' ? issue : '',
  ].map(item => String(item || '')).join('｜')
  return /无需修改|不判定为失误|不需要修改|维持当前|无需修订|无需改动/.test(blob)
}

/** Build a revision-facing report from prose_quality self_check, prioritizing delivery_link. */
export function buildProseQualityRevisionReport(selfCheckReview: any = {}) {
  const deliveryLink = selfCheckReview?.delivery_link || selfCheckReview?.deliveryLink || {}
  const selected = asArray(deliveryLink?.selected)
  const linkedDirectives = uniqueRevisionTexts([
    ...selected.map((item: any) => item?.directive || item?.label || item),
    ...asArray(selfCheckReview?.revision_directives || selfCheckReview?.revisionDirectives),
  ], 8)
  const highIssues = asArray(selfCheckReview?.issues)
    .filter((issue: any) => {
      if (isKeepAsIsRevisionIssue(issue)) return false
      const severity = String(issue?.severity || issue?.level || '').toLowerCase()
      return ['high', 'critical', 'blocker', 'must_fix', 'error'].includes(severity)
    })
    .map((issue: any) => String(issue?.fix || issue?.description || issue?.suggestion || issue?.message || issue || '').trim())
    .filter(Boolean)
  const optional = asArray(selfCheckReview?.issues)
    .filter((issue: any) => {
      if (isKeepAsIsRevisionIssue(issue)) return false
      const severity = String(issue?.severity || issue?.level || 'medium').toLowerCase()
      return !['high', 'critical', 'blocker', 'must_fix', 'error'].includes(severity)
    })
    .map((issue: any) => String(issue?.fix || issue?.description || issue?.suggestion || issue || '').trim())
    .filter(Boolean)
  const mustFix = uniqueRevisionTexts([...linkedDirectives, ...highIssues], 6)
  const selectedKeys = selected.map((item: any) => String(item?.key || item?.type || ''))
  const hasContinuityStructural = selectedKeys.some((key: string) => (
    key === 'progress_replay'
    || key === 'opening_hook_miss'
    || key.startsWith('handoff')
  )) || mustFix.some(item => /禁止回放|进度回放|超写|章首承接|章末交接|双死局|开篇未接|平行戏回放|物业合规/.test(item))
  const hasQualityStructural = selectedKeys.some((key: string) => key.startsWith('quality_audit'))
    || mustFix.some(item => /质量诊断|质量硬伤|全文重写|结构重排/.test(item))
  // Continuity/open-hook issues only need opening rewrite; full-chapter JSON rewrite often truncates.
  const revisionStrategy = hasContinuityStructural && !hasQualityStructural
    ? 'opening_structural_patch'
    : (hasContinuityStructural || hasQualityStructural)
      ? 'structural_rewrite'
      : 'surgical_patch'

  return {
    overall_score: Number(selfCheckReview?.score || 0) || null,
    must_fix: mustFix,
    optional_improvements: uniqueRevisionTexts(optional, 4),
    one_click_revision_prompt: mustFix.join('；'),
    prose_quality_review: selfCheckReview,
    delivery_link: deliveryLink,
    revision_strategy: revisionStrategy,
  }
}

export function focusDeliveryRiskBriefForRevision(brief: any = {}, report: any = {}) {
  const strategy = String(report?.revision_strategy || '')
  const mustFix = uniqueRevisionTexts(report?.must_fix || report?.one_click_revision_prompt, 6)
  if (!brief || typeof brief !== 'object') {
    return {
      total_count: mustFix.length,
      label: mustFix.length ? `待修复 ${mustFix.length}` : '无待修复风险',
      items: mustFix,
      revision_directives: mustFix,
      risks: mustFix.map(item => ({ count: 1, item, directive: item, priority_label: '优先修质量' })),
    }
  }
  const preferred = asArray(brief.risks).filter((risk: any) => {
    const blob = `${risk?.item || ''} ${risk?.directive || ''} ${risk?.priority_label || ''}`
    if (strategy === 'structural_rewrite' || strategy === 'opening_structural_patch') {
      return /质量|回放|交接|承接|核心|章首|章末|进度|开篇|平行|物业/.test(blob)
    }
    return true
  })
  const risks = (preferred.length ? preferred : asArray(brief.risks)).slice(0, (strategy === 'structural_rewrite' || strategy === 'opening_structural_patch') ? 5 : 8)
  const directives = uniqueRevisionTexts([
    ...mustFix,
    ...risks.map((risk: any) => risk?.directive || risk?.item),
    ...asArray(brief.revision_directives),
  ], (strategy === 'structural_rewrite' || strategy === 'opening_structural_patch') ? 6 : 10)
  return {
    ...brief,
    total_count: Math.min(Number(brief.total_count || 0) || directives.length, directives.length || Number(brief.total_count || 0)),
    items: uniqueRevisionTexts([
      ...mustFix,
      ...risks.map((risk: any) => risk?.item || risk?.directive),
      ...asArray(brief.items),
    ], 8),
    revision_directives: directives,
    risks,
    focused_for_revision: true,
    revision_strategy: strategy || 'surgical_patch',
  }
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

function qualityAuditCheckText(value: any) {
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
    value.strategy,
  ].flat().map(item => String(item || '')).join(' ')
}

function qualityAuditCheckFailed(value: any) {
  if (typeof value === 'string') return true
  const status = String(value?.status || value?.result || '').trim().toLowerCase()
  const score = Number(value?.score)
  return ['fail', 'failed', 'warn', 'warning', 'blocked', 'error'].includes(status)
    || (Number.isFinite(score) && score < 78)
}

export function qualityAuditFailureChecks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || {}
  const review = selfCheck?.review || payload?.review || {}
  return [
    ...asArray(review?.quality_audit_checks || review?.qualityAuditChecks),
    ...asArray(selfCheck?.quality_audit_checks || selfCheck?.qualityAuditChecks),
    ...asArray(payload?.quality_audit_checks || payload?.qualityAuditChecks),
  ].filter(item => !qualityAuditCheckText(item).toLowerCase().includes('scene_card_receipt'))
    .filter(qualityAuditCheckFailed)
}

export function qualityAuditSeverity(checks: any[]) {
  return checks.some(item => {
    if (typeof item === 'string') return false
    const status = String(item?.status || item?.result || '').trim().toLowerCase()
    const score = Number(item?.score)
    return ['fail', 'failed', 'blocked', 'error'].includes(status)
      || (Number.isFinite(score) && score < 65)
  }) ? 'high' : 'medium'
}

export function qualityAuditMessage(checks: any[]) {
  return checks.map(item => {
    if (typeof item === 'string') return item
    return String(item?.evidence || item?.message || item?.summary || item?.text || item?.fix || qualityAuditCheckText(item)).trim()
  }).filter(Boolean).slice(0, 4).join('；') || '质量诊断检查存在未清 fail/warn 项。'
}

function sourceReadinessCheckText(value: any) {
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
    value.required_action,
    value.requiredAction,
  ].flat().map(item => String(item || '')).join(' ')
}

function sourceReadinessCheckNeedsRepair(value: any) {
  if (typeof value === 'string') return true
  const status = String(value?.status || value?.result || value?.state || '').trim().toLowerCase()
  return ['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error'].includes(status)
    || value?.ready === false
    || value?.delivered === false
    || Boolean(compactAuditText(value?.remaining_risk || value?.remainingRisk, 500))
}

export function sourceReadinessChecks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  return [
    ...asArray(review?.source_readiness_checks || review?.sourceReadinessChecks),
    ...asArray(selfCheck?.source_readiness_checks || selfCheck?.sourceReadinessChecks),
    ...asArray(payload?.source_readiness_checks || payload?.sourceReadinessChecks),
  ].filter(sourceReadinessCheckNeedsRepair)
}

function sourceReadinessEvidence(check: any) {
  return compactAuditText(
    check?.remaining_risk
    || check?.remainingRisk
    || check?.evidence
    || check?.issue
    || check?.reason
    || check?.description
    || check?.text
    || check?.fix
    || check?.label
    || check?.key,
    500,
  )
}

export function sourceReadinessMessage(checks: any[]) {
  return checks.map(sourceReadinessEvidence).filter(Boolean).slice(0, 4).join('；') || '来源就绪表存在未清 fail/warn 项。'
}

export function sourceReadinessMissedRows(checks: any[]) {
  return checks.map((check: any) => ({
    key: compactAuditText(check?.key || check?.check_key || check?.checkKey, 120),
    label: compactAuditText(check?.label || check?.name || check?.key, 120),
    text: sourceReadinessEvidence(check),
    evidence: compactAuditText(check?.evidence || check?.changed_evidence || check?.changedEvidence, 500),
    remaining_risk: compactAuditText(check?.remaining_risk || check?.remainingRisk, 500),
    fix: compactAuditText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || check?.required_action || check?.requiredAction, 500),
  })).filter(item => item.text || item.evidence || item.remaining_risk || item.fix)
}

function stateTrackingCheckNeedsRepair(value: any) {
  if (typeof value === 'string') return true
  const status = String(value?.status || value?.result || value?.state || '').trim().toLowerCase()
  return ['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error'].includes(status)
    || value?.ready === false
    || value?.delivered === false
    || Boolean(compactAuditText(value?.remaining_risk || value?.remainingRisk, 500))
}

export function stateTrackingChecks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  return [
    ...asArray(review?.state_tracking_checks || review?.stateTrackingChecks),
    ...asArray(selfCheck?.state_tracking_checks || selfCheck?.stateTrackingChecks),
    ...asArray(payload?.state_tracking_checks || payload?.stateTrackingChecks),
  ].filter(stateTrackingCheckNeedsRepair)
}

function stateTrackingEvidence(check: any) {
  return compactAuditText(
    check?.remaining_risk
    || check?.remainingRisk
    || check?.evidence
    || check?.issue
    || check?.reason
    || check?.description
    || check?.text
    || check?.fix
    || check?.label
    || check?.key,
    500,
  )
}

export function stateTrackingMessage(checks: any[]) {
  return checks.map(stateTrackingEvidence).filter(Boolean).slice(0, 4).join('；') || '状态跟踪检查存在未清 fail/warn 项。'
}

export function stateTrackingMissedRows(checks: any[]) {
  return checks.map((check: any) => ({
    key: compactAuditText(check?.key || check?.check_key || check?.checkKey, 120),
    label: compactAuditText(check?.label || check?.name || check?.key, 120),
    text: stateTrackingEvidence(check),
    evidence: compactAuditText(check?.evidence || check?.changed_evidence || check?.changedEvidence, 500),
    remaining_risk: compactAuditText(check?.remaining_risk || check?.remainingRisk, 500),
    fix: compactAuditText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || check?.required_action || check?.requiredAction, 500),
  })).filter(item => item.text || item.evidence || item.remaining_risk || item.fix)
}

function qualityContractCheckNeedsRepair(value: any) {
  if (typeof value === 'string') return true
  const status = String(value?.status || value?.result || value?.state || '').trim().toLowerCase()
  return ['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'blocked', 'error'].includes(status)
    || value?.ready === false
    || value?.delivered === false
    || value?.passed === false
    || value?.ok === false
    || Boolean(compactAuditText(value?.remaining_risk || value?.remainingRisk, 500))
}

export function qualityContractChecks(payload: any, snakeKey: string, camelKey: string) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  return [
    ...asArray(review?.[snakeKey] || review?.[camelKey]),
    ...asArray(selfCheck?.[snakeKey] || selfCheck?.[camelKey]),
    ...asArray(payload?.[snakeKey] || payload?.[camelKey]),
  ].filter(qualityContractCheckNeedsRepair)
}

function qualityContractEvidence(check: any) {
  return compactAuditText(
    check?.remaining_risk
    || check?.remainingRisk
    || check?.evidence
    || check?.issue
    || check?.reason
    || check?.description
    || check?.text
    || check?.fix
    || check?.label
    || check?.key,
    500,
  )
}

export function qualityContractMessage(checks: any[], fallback: string) {
  return checks.map(qualityContractEvidence).filter(Boolean).slice(0, 4).join('；') || fallback
}

export function qualityContractMissedRows(checks: any[]) {
  return checks.map((check: any) => ({
    key: compactAuditText(check?.key || check?.check_key || check?.checkKey, 120),
    label: compactAuditText(check?.label || check?.name || check?.key, 120),
    text: qualityContractEvidence(check),
    evidence: compactAuditText(check?.evidence || check?.changed_evidence || check?.changedEvidence, 500),
    remaining_risk: compactAuditText(check?.remaining_risk || check?.remainingRisk, 500),
    fix: compactAuditText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || check?.required_action || check?.requiredAction, 500),
  })).filter(item => item.text || item.evidence || item.remaining_risk || item.fix)
}

export function sceneCardDirectiveCheckKey(check: any) {
  const key = String(check?.key || check?.check_key || check?.checkKey || check?.type || '').trim()
  return /^scene_card_\d+_(execution|forbidden)_directives$/i.test(key) ? key : ''
}

function uniqueObjectReferences(values: any[]) {
  const seen = new Set<any>()
  return values.filter((value) => {
    if (!value || typeof value !== 'object') return false
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

function deliveryReceiptsFrom(value: any = {}) {
  if (!value || typeof value !== 'object') return {}
  const rawPayload = value.raw_payload || value.rawPayload || {}
  return value.oh_story_delivery_receipts
    || value.ohStoryDeliveryReceipts
    || rawPayload.oh_story_delivery_receipts
    || rawPayload.ohStoryDeliveryReceipts
    || {}
}

function preDraftExecutionReceiptSections(payload: any = {}) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const receiptSources = uniqueObjectReferences([
    deliveryReceiptsFrom(review),
    deliveryReceiptsFrom(selfCheck),
    deliveryReceiptsFrom(payload),
  ])
  return uniqueObjectReferences([
    review?.pre_draft_execution_receipts || review?.preDraftExecutionReceipts,
    selfCheck?.pre_draft_execution_receipts || selfCheck?.preDraftExecutionReceipts,
    payload?.pre_draft_execution_receipts || payload?.preDraftExecutionReceipts,
    ...receiptSources.map(source => source?.pre_draft_execution_receipts || source?.preDraftExecutionReceipts),
  ])
}

function preDraftExecutionCheckNeedsRepair(value: any) {
  const status = compactAuditText(value?.status, 40).toLowerCase()
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'no', '0'].includes(status)) return true
  if (value?.delivered === false) return true
  return Boolean(compactAuditText(value?.remaining_risk || value?.remainingRisk, 500))
}

export function preDraftExecutionChecks(payload: any, snakeKey: string, camelKey: string) {
  return preDraftExecutionReceiptSections(payload)
    .flatMap(section => asArray(section?.[snakeKey] || section?.[camelKey]))
    .filter(preDraftExecutionCheckNeedsRepair)
}

function preDraftExecutionEvidence(check: any) {
  return compactAuditText(
    check?.remaining_risk
    || check?.remainingRisk
    || check?.evidence
    || check?.issue
    || check?.reason
    || check?.description
    || check?.text
    || check?.label
    || check?.key,
    500,
  )
}

export function preDraftExecutionMessage(checks: any[]) {
  return checks.map(preDraftExecutionEvidence).filter(Boolean).slice(0, 3).join('；')
}

export function preDraftExecutionMissedRows(checks: any[]) {
  return checks.map((check: any) => ({
    key: compactAuditText(check?.key || check?.check_key || check?.checkKey, 120),
    label: compactAuditText(check?.label || check?.name || check?.key, 120),
    text: preDraftExecutionEvidence(check),
    evidence: compactAuditText(check?.evidence || check?.changed_evidence || check?.changedEvidence, 500),
    remaining_risk: compactAuditText(check?.remaining_risk || check?.remainingRisk, 500),
    fix: compactAuditText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || check?.remaining_risk || check?.remainingRisk, 500),
  })).filter(item => item.text || item.evidence || item.remaining_risk || item.fix)
}

export function deliveryRiskMissedCount(risk: any) {
  const count = Number(risk?.missed_count ?? risk?.missedCount ?? risk?.risk_count ?? risk?.riskCount)
  if (Number.isFinite(count)) return Math.max(0, count)
  return asArray(risk?.missed || risk?.gaps || risk?.issues || risk?.evidence_missing || risk?.evidenceMissing).length
}

export function deliveryRiskMissedMessage(risk: any, fallback: string) {
  return [
    ...asArray(risk?.missed || risk?.gaps || risk?.issues || risk?.evidence_missing || risk?.evidenceMissing).map((item: any) => {
      if (typeof item === 'string') return item
      return String(item?.text || item?.evidence || item?.message || item?.summary || item?.risk || item?.required_action || item?.requiredAction || item?.target || item?.label || '').trim()
    }),
    ...asArray(risk?.next_actions || risk?.nextActions).map((item: any) => String(item || '').trim()),
    String(risk?.summary || '').trim(),
  ].filter(Boolean).slice(0, 3).join('；') || fallback
}

export function deslopRepairReceiptCount(risk: any) {
  const count = Number(risk?.missed_count ?? risk?.missedCount)
  if (Number.isFinite(count)) return Math.max(0, count)
  return asArray(risk?.missed || risk?.gaps || risk?.issues).length
}

export function deslopRepairReceiptMessage(risk: any) {
  return [
    ...asArray(risk?.missed || risk?.gaps || risk?.issues).map((item: any) => {
      if (typeof item === 'string') return item
      return String(item?.text || item?.evidence || item?.message || item?.summary || item?.risk || item?.label || '').trim()
    }),
    ...asArray(risk?.next_actions || risk?.nextActions).map((item: any) => String(item || '').trim()),
    String(risk?.summary || '').trim(),
  ].filter(Boolean).slice(0, 3).join('；') || 'deslop_repair_receipts 没有逐条证明去AI味修复已闭环。'
}

export function qualityAuditRepairReceiptCount(risk: any) {
  const count = Number(risk?.missed_count ?? risk?.missedCount)
  if (Number.isFinite(count)) return Math.max(0, count)
  return asArray(risk?.missed || risk?.gaps || risk?.issues).length
}

export function qualityAuditRepairReceiptMessage(risk: any) {
  return [
    ...asArray(risk?.missed || risk?.gaps || risk?.issues).map((item: any) => {
      if (typeof item === 'string') return item
      return String(item?.text || item?.evidence || item?.message || item?.summary || item?.risk || item?.label || '').trim()
    }),
    ...asArray(risk?.next_actions || risk?.nextActions).map((item: any) => String(item || '').trim()),
    String(risk?.summary || '').trim(),
  ].filter(Boolean).slice(0, 3).join('；') || 'quality_audit_repair_receipts 没有逐条证明质量诊断修复已闭环。'
}

export function latestAnnotationStatus(reviews: any[]) {
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

export function pushAnnotation(items: any[], statuses: Map<string, any>, raw: any) {
  const key = raw.key || annotationKey(raw)
  const state = statuses.get(key) || {}
  items.push({
    key,
    status: state.status || raw.status || 'open',
    resolved_at: state.resolved_at || raw.resolved_at || null,
    resolution_note: state.note || raw.resolution_note || '',
    severity: raw.severity || 'medium',
    category: raw.category || 'general',
    kind: raw.kind || 'issue',
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

export * from './builders-annotations'
