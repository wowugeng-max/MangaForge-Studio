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
} from '../novel'
import { executeNovelAgent, previewNovelKnowledgeInjection } from '../llm'
import { asArray, buildLLMResultDiagnostics, clampScore, extractLLMText, getNovelPayload, getSafetyPolicy, normalizeIssue, parseJsonLikePayload } from './novel-route-utils'

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

const REVISION_MAX_TOKENS = 8000
const COMPACT_REVISION_RETRY_MAX_TOKENS = 5000

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

function compactAuditText(value: any, limit = 500) {
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

function countItems(value: any) {
  return Array.isArray(value) ? value.length : 0
}

function countPayloadNumber(value: any, fallback: number) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function storyUnitSyncRiskCount(storyUnit: any) {
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

function openingHandoffMisses(expectation: any) {
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

function openingHookScore(readability: any) {
  return metricNumber(readability?.opening_hook_score ?? readability?.openingHookScore)
}

function endingHookScore(readability: any) {
  return metricNumber(readability?.ending_hook_score ?? readability?.endingHookScore)
}

function sceneReadabilityScore(readability: any) {
  return metricNumber(readability?.scene_readability_score ?? readability?.sceneReadabilityScore)
}

function payoffDensityScore(readability: any) {
  return metricNumber(readability?.payoff_density_score ?? readability?.payoffDensityScore)
}

function hasWeakOpeningHook(readability: any) {
  const score = openingHookScore(readability)
  return score !== null && score > 0 && score < 70
}

function hasWeakEndingHook(readability: any) {
  const score = endingHookScore(readability)
  return score !== null && score > 0 && score < 70
}

function hasWeakSceneProgression(readability: any) {
  const score = sceneReadabilityScore(readability)
  return score !== null && score > 0 && score < 70
}

function hasWeakPayoffDensity(readability: any) {
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

function buildApprovalBlockerBrief(payload: any) {
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
    JSON.stringify(contextPackage, null, 2).slice(0, 9000),
    '【交稿风险清单】',
    JSON.stringify(deliveryRiskBrief || {}, null, 2).slice(0, 5000),
    '【章节正文】',
    String(chapter.chapter_text || '').slice(0, 14000),
    '【已有质检】',
    JSON.stringify({ latestQuality, latestReference }, null, 2).slice(0, 4000),
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

export function buildEditorRevisionPrompt({
  project,
  chapter,
  report,
  deliveryRiskBrief,
  revisionMode,
  userPrompt,
}: {
  project: any
  chapter: any
  report: any
  deliveryRiskBrief?: any
  revisionMode: string
  userPrompt?: string
}) {
  return [
    '任务：根据商业编辑报告对当前章节做局部修订补丁。只输出 JSON。',
    `项目：${project.title}`,
    '要求：保留当前章节整体结构、节奏、章末钩子和可用文气；只修复报告指出的问题；不得照搬参考作品。',
    `本次修订模式：${revisionMode}。${REVISION_MODE_GUIDE[revisionMode] || REVISION_MODE_GUIDE.from_report}`,
    '正文工艺硬约束：不要用环境描写替代剧情推进；涉及战斗/行动时必须补足动作链、空间变化、代价和结果；删改时不得破坏连续性。',
    '交稿风险硬约束：如果交稿风险清单不为空，必须优先修复清单中的核心偏移、追读漏项、回报欠账、创新缺口、剧情线风险和出戏风险；不得只按普通润色处理。',
    '为了避免长连接失败，优先输出局部补丁，不要输出完整正文。',
    '补丁长度硬约束：每条 find/anchor 控制在 30-300 字，必须是原文中唯一可精确匹配的短片段；不要把整章或多段长正文塞进 find/anchor。需要大幅删减时拆成多条短 replacement；删除时 replace 允许为空字符串。',
    '【编辑报告】',
    JSON.stringify(report, null, 2).slice(0, 7000),
    '【交稿风险清单】',
    JSON.stringify(deliveryRiskBrief || {}, null, 2).slice(0, 5000),
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
    '  "revision_summary": "简述修了什么"',
    '}',
    '只有在补丁无法表达时，才输出 chapter_text 完整修订正文。',
  ].join('\n')
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
    JSON.stringify(report, null, 2).slice(0, 3000),
    '【交稿风险清单】',
    JSON.stringify(deliveryRiskBrief || {}, null, 2).slice(0, 2500),
    '【修订提示】',
    String(userPrompt || report.one_click_revision_prompt || ''),
    '【上一次被截断输出片段，仅用于避免重复犯错】',
    String(previousOutputPreview || '').slice(0, 1200),
    '【原章节正文】',
    String(chapter.chapter_text || '').slice(0, 12000),
    'JSON 示例：{"revision_mode":"patch","replacements":[{"find":"原文中唯一短锚点","replace":""}],"insertions":[],"continuity_notes":[],"revision_summary":"修了最高优先级问题"}',
  ].join('\n')
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
    JSON.stringify(contextPackage, null, 2).slice(0, 6000),
    '',
    '【待复检正文】',
    String(chapterText || '').slice(0, 16000),
    '',
    '输出 JSON，字段：passed(boolean), score(0-100), craft_metrics({action_detail_score,description_overuse_score,event_density_score,combat_process_score}), focused_revision_modes(array，可取 expand_action/cut_description/tighten_pacing/add_consequence/restore_hook), issues(array: severity/type/description/suggestion), revision_directives(array), needs_revision(boolean)。只返回 JSON。',
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
    responseMode: 'stream',
    skipMemory: true,
  })
  if ((result as any).error) throw new Error(String((result as any).error))
  const reviewPayload = getNovelPayload(result)
  const normalizedReview = {
    passed: reviewPayload?.passed !== false,
    score: Number(reviewPayload?.score || 80),
    issues: Array.isArray(reviewPayload?.issues) ? reviewPayload.issues.map(normalizeIssue) : [],
    revision_directives: Array.isArray(reviewPayload?.revision_directives) ? reviewPayload.revision_directives.map((item: any) => String(item)) : [],
    craft_metrics: reviewPayload?.craft_metrics || {},
    focused_revision_modes: Array.isArray(reviewPayload?.focused_revision_modes) ? reviewPayload.focused_revision_modes.map((item: any) => String(item)) : [],
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

function sceneCardReceiptAuditChecks(payload: any) {
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

function sceneCardReceiptAuditMessage(checks: any[]) {
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

function qualityAuditFailureChecks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || {}
  const review = selfCheck?.review || payload?.review || {}
  return [
    ...asArray(review?.quality_audit_checks || review?.qualityAuditChecks),
    ...asArray(selfCheck?.quality_audit_checks || selfCheck?.qualityAuditChecks),
    ...asArray(payload?.quality_audit_checks || payload?.qualityAuditChecks),
  ].filter(item => !qualityAuditCheckText(item).toLowerCase().includes('scene_card_receipt'))
    .filter(qualityAuditCheckFailed)
}

function qualityAuditSeverity(checks: any[]) {
  return checks.some(item => {
    if (typeof item === 'string') return false
    const status = String(item?.status || item?.result || '').trim().toLowerCase()
    const score = Number(item?.score)
    return ['fail', 'failed', 'blocked', 'error'].includes(status)
      || (Number.isFinite(score) && score < 65)
  }) ? 'high' : 'medium'
}

function qualityAuditMessage(checks: any[]) {
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

function sourceReadinessChecks(payload: any) {
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

function sourceReadinessMessage(checks: any[]) {
  return checks.map(sourceReadinessEvidence).filter(Boolean).slice(0, 4).join('；') || '来源就绪表存在未清 fail/warn 项。'
}

function sourceReadinessMissedRows(checks: any[]) {
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

function stateTrackingChecks(payload: any) {
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

function stateTrackingMessage(checks: any[]) {
  return checks.map(stateTrackingEvidence).filter(Boolean).slice(0, 4).join('；') || '状态跟踪检查存在未清 fail/warn 项。'
}

function stateTrackingMissedRows(checks: any[]) {
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

function qualityContractChecks(payload: any, snakeKey: string, camelKey: string) {
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

function qualityContractMessage(checks: any[], fallback: string) {
  return checks.map(qualityContractEvidence).filter(Boolean).slice(0, 4).join('；') || fallback
}

function qualityContractMissedRows(checks: any[]) {
  return checks.map((check: any) => ({
    key: compactAuditText(check?.key || check?.check_key || check?.checkKey, 120),
    label: compactAuditText(check?.label || check?.name || check?.key, 120),
    text: qualityContractEvidence(check),
    evidence: compactAuditText(check?.evidence || check?.changed_evidence || check?.changedEvidence, 500),
    remaining_risk: compactAuditText(check?.remaining_risk || check?.remainingRisk, 500),
    fix: compactAuditText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || check?.required_action || check?.requiredAction, 500),
  })).filter(item => item.text || item.evidence || item.remaining_risk || item.fix)
}

function sceneCardDirectiveCheckKey(check: any) {
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

function preDraftExecutionChecks(payload: any, snakeKey: string, camelKey: string) {
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

function preDraftExecutionMessage(checks: any[]) {
  return checks.map(preDraftExecutionEvidence).filter(Boolean).slice(0, 3).join('；')
}

function preDraftExecutionMissedRows(checks: any[]) {
  return checks.map((check: any) => ({
    key: compactAuditText(check?.key || check?.check_key || check?.checkKey, 120),
    label: compactAuditText(check?.label || check?.name || check?.key, 120),
    text: preDraftExecutionEvidence(check),
    evidence: compactAuditText(check?.evidence || check?.changed_evidence || check?.changedEvidence, 500),
    remaining_risk: compactAuditText(check?.remaining_risk || check?.remainingRisk, 500),
    fix: compactAuditText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || check?.remaining_risk || check?.remainingRisk, 500),
  })).filter(item => item.text || item.evidence || item.remaining_risk || item.fix)
}

function deliveryRiskMissedCount(risk: any) {
  const count = Number(risk?.missed_count ?? risk?.missedCount ?? risk?.risk_count ?? risk?.riskCount)
  if (Number.isFinite(count)) return Math.max(0, count)
  return asArray(risk?.missed || risk?.gaps || risk?.issues || risk?.evidence_missing || risk?.evidenceMissing).length
}

function deliveryRiskMissedMessage(risk: any, fallback: string) {
  return [
    ...asArray(risk?.missed || risk?.gaps || risk?.issues || risk?.evidence_missing || risk?.evidenceMissing).map((item: any) => {
      if (typeof item === 'string') return item
      return String(item?.text || item?.evidence || item?.message || item?.summary || item?.risk || item?.required_action || item?.requiredAction || item?.target || item?.label || '').trim()
    }),
    ...asArray(risk?.next_actions || risk?.nextActions).map((item: any) => String(item || '').trim()),
    String(risk?.summary || '').trim(),
  ].filter(Boolean).slice(0, 3).join('；') || fallback
}

function deslopRepairReceiptCount(risk: any) {
  const count = Number(risk?.missed_count ?? risk?.missedCount)
  if (Number.isFinite(count)) return Math.max(0, count)
  return asArray(risk?.missed || risk?.gaps || risk?.issues).length
}

function deslopRepairReceiptMessage(risk: any) {
  return [
    ...asArray(risk?.missed || risk?.gaps || risk?.issues).map((item: any) => {
      if (typeof item === 'string') return item
      return String(item?.text || item?.evidence || item?.message || item?.summary || item?.risk || item?.label || '').trim()
    }),
    ...asArray(risk?.next_actions || risk?.nextActions).map((item: any) => String(item || '').trim()),
    String(risk?.summary || '').trim(),
  ].filter(Boolean).slice(0, 3).join('；') || 'deslop_repair_receipts 没有逐条证明去AI味修复已闭环。'
}

function qualityAuditRepairReceiptCount(risk: any) {
  const count = Number(risk?.missed_count ?? risk?.missedCount)
  if (Number.isFinite(count)) return Math.max(0, count)
  return asArray(risk?.missed || risk?.gaps || risk?.issues).length
}

function qualityAuditRepairReceiptMessage(risk: any) {
  return [
    ...asArray(risk?.missed || risk?.gaps || risk?.issues).map((item: any) => {
      if (typeof item === 'string') return item
      return String(item?.text || item?.evidence || item?.message || item?.summary || item?.risk || item?.label || '').trim()
    }),
    ...asArray(risk?.next_actions || risk?.nextActions).map((item: any) => String(item || '').trim()),
    String(risk?.summary || '').trim(),
  ].filter(Boolean).slice(0, 3).join('；') || 'quality_audit_repair_receipts 没有逐条证明质量诊断修复已闭环。'
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

export function buildReviewAnnotations(project: any, chapters: any[], reviews: any[]) {
  const statuses = latestAnnotationStatus(reviews)
  const items: any[] = []
  const chapterById = new Map(chapters.map(chapter => [Number(chapter.id), chapter]))
  const chapterByNo = new Map(chapters.map(chapter => [Number(chapter.chapter_no), chapter]))
  const resolveChapter = (payload: any) => {
    const chapterId = Number(payload.chapter_id || payload.report?.chapter_id || payload.quality_card?.chapter_id || payload.context_package?.chapter_target?.id || 0)
    const chapterNo = Number(payload.chapter_no || payload.report?.chapter_no || payload.quality_card?.chapter_no || payload.context_package?.chapter_target?.chapter_no || 0)
    return chapterById.get(chapterId) || chapterByNo.get(chapterNo) || null
  }
  const clearedConvergenceByChapter = new Map<number, any>()
  reviews
    .filter(item => item.review_type === 'delivery_risk_convergence')
    .forEach(review => {
      const payload = parseJsonLikePayload(review.payload) || {}
      const convergence = payload.delivery_risk_convergence || payload.result?.delivery_risk_convergence || payload.result || payload
      const chapter = resolveChapter({
        ...payload,
        chapter_id: payload.chapter_id || convergence?.chapter_id,
        chapter_no: payload.chapter_no || convergence?.chapter_no,
      })
      const afterCount = Number(convergence?.after_count ?? convergence?.after?.total_count ?? 0)
      if (!chapter?.id || !(convergence?.status === 'cleared' || afterCount === 0)) return
      const current = clearedConvergenceByChapter.get(Number(chapter.id))
      if (!current || String(review.created_at || '').localeCompare(String(current.review.created_at || '')) > 0) {
        clearedConvergenceByChapter.set(Number(chapter.id), { review, convergence })
      }
    })
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
  const pushDeliveryRiskAnnotation = (review: any, payload: any, config: {
    payloadKey: string
    sourceLabel: string
    category: string
    kind: string | ((risk: any, count: number) => string)
    title: (risk: any, count: number) => string
    message: (risk: any, count: number) => string
    action: string | ((risk: any, count: number) => string)
    count: (risk: any) => number
    severity?: (risk: any, count: number) => string
  }) => {
    const risk = payload?.[config.payloadKey] || payload?.result?.[config.payloadKey] || payload?.result || payload || {}
    const riskCount = Math.max(0, Number(config.count(risk) || 0))
    const shouldPush = riskCount > 0 || risk?.status === 'warn'
    if (!shouldPush) return
    const count = Math.max(1, riskCount)
    const chapter = resolveChapter(payload)
    const cleared = chapter?.id ? clearedConvergenceByChapter.get(Number(chapter.id)) : null
    const clearedAfterRisk = cleared && String(cleared.review.created_at || '').localeCompare(String(review.created_at || '')) > 0
    pushAnnotation(items, statuses, {
      source: review.review_type,
      source_label: config.sourceLabel,
      review_id: review.id,
      chapter_id: chapter?.id,
      chapter_no: chapter?.chapter_no,
      kind: typeof config.kind === 'function' ? config.kind(risk, count) : config.kind,
      severity: config.severity ? config.severity(risk, count) : 'medium',
      category: config.category,
      title: config.title(risk, count),
      message: config.message(risk, count),
      action: typeof config.action === 'function' ? config.action(risk, count) : config.action,
      created_at: review.created_at,
      status: clearedAfterRisk ? 'resolved' : undefined,
      resolved_at: clearedAfterRisk ? cleared.review.created_at : null,
      resolution_note: clearedAfterRisk ? `交稿风险已由风险收敛复盘清零：${cleared.convergence?.label || '风险已清零'}` : '',
      payload: risk,
    })
  }

  for (const review of reviews) {
    const payload = parseJsonLikePayload(review.payload) || {}
    if (review.review_type === 'prose_quality') {
      const reviewPayload = payload.self_check?.review || payload.review || {}
      const approvalBlocker = buildApprovalBlockerBrief(payload)
      if (approvalBlocker) {
        const chapter = resolveChapter(payload)
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '入库阻断',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'approval_blocker',
          severity: 'high',
          category: 'approval_blocker',
          title: approvalBlocker.label,
          message: [
            approvalBlocker.detail,
            approvalBlocker.reasons?.length ? `原因：${approvalBlocker.reasons.join('；')}` : '',
          ].filter(Boolean).join('；') || approvalBlocker.label,
          action: '先解除入库阻断：按阻断原因修订正文，重新复检并确认章节可以进入验收或入库。',
          created_at: review.created_at,
          payload: approvalBlocker,
        })
      }
      const sceneCardReceiptChecks = sceneCardReceiptAuditChecks(payload)
      if (sceneCardReceiptChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = sceneCardReceiptChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '场景回执',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: String(firstCheck?.key || firstCheck?.type || 'scene_card_receipt'),
          severity: 'high',
          category: 'scene_card_receipt',
          title: `场景回执缺口 ${sceneCardReceiptChecks.length}`,
          message: sceneCardReceiptAuditMessage(sceneCardReceiptChecks),
          action: '按场景卡回执缺口回修正文；修订后必须重写对应场景的 scene_start_anchor、scene_end_anchor 和 scene_card_receipts，scene_card_receipts.evidence 必须引用修订后对应场景正文证据，不得借用其他场景。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            checks: sceneCardReceiptChecks,
            review_type: review.review_type,
          },
        })
      }
      const qualityAuditChecks = qualityAuditFailureChecks(payload)
      if (qualityAuditChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = qualityAuditChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '质量诊断',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: String(firstCheck?.key || firstCheck?.type || 'quality_audit_gap'),
          severity: qualityAuditSeverity(qualityAuditChecks),
          category: 'quality_audit',
          title: `质量诊断缺口 ${qualityAuditChecks.length}`,
          message: qualityAuditMessage(qualityAuditChecks),
          action: '按 quality_audit_checks 回修正文：先补本章一句话概括和目的词，再重排详略、删除水文段落、强化信息跟冲突走、隐性展示卖点，并按五维评分最低项选择 rewrite/compress/de_ai/polish 策略。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            checks: qualityAuditChecks,
            review_type: review.review_type,
          },
        })
      }
      const sourceReadinessFailureChecks = sourceReadinessChecks(payload)
      if (sourceReadinessFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = sourceReadinessFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '来源就绪',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'source_readiness_gap',
          severity: 'high',
          category: 'source_readiness',
          title: `来源就绪缺口 ${sourceReadinessFailureChecks.length}`,
          message: sourceReadinessMessage(sourceReadinessFailureChecks),
          action: '按 source_readiness_checks 回修正文：先核对角色状态、相关伏笔/前史、世界约束和资产状态；missing/warn 来源不能被当作既定事实，ready 来源必须在正文中可见承接。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `来源就绪缺口 ${sourceReadinessFailureChecks.length}`,
            missed_count: sourceReadinessFailureChecks.length,
            missed: sourceReadinessMissedRows(sourceReadinessFailureChecks),
            checks: sourceReadinessFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const stateTrackingFailureChecks = stateTrackingChecks(payload)
      if (stateTrackingFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = stateTrackingFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '状态跟踪',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'state_tracking_gap',
          severity: 'high',
          category: 'state_tracking',
          title: `状态跟踪缺口 ${stateTrackingFailureChecks.length}`,
          message: stateTrackingMessage(stateTrackingFailureChecks),
          action: '按 state_tracking_checks 回修正文：核对角色状态、伏笔状态、资产归属、关系边界和世界规则；不得让昏迷、失效、未获得或未揭示的状态直接参与当前章结果。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `状态跟踪缺口 ${stateTrackingFailureChecks.length}`,
            missed_count: stateTrackingFailureChecks.length,
            missed: stateTrackingMissedRows(stateTrackingFailureChecks),
            checks: stateTrackingFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const styleBoundaryFailureChecks = qualityContractChecks(payload, 'style_boundary_checks', 'styleBoundaryChecks')
      if (styleBoundaryFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = styleBoundaryFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '风格边界',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'style_boundary_gap',
          severity: 'high',
          category: 'style_boundary',
          title: `风格边界缺口 ${styleBoundaryFailureChecks.length}`,
          message: qualityContractMessage(styleBoundaryFailureChecks, '风格边界检查存在未清 fail/warn 项。'),
          action: '按 style_boundary_checks 回修正文：保留本书承诺的语气、节奏和角色口吻，但必须重写过近的参照句式、桥段节奏、套话和模板化表达；不得复制标杆原句、专有设定或核心梗。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `风格边界缺口 ${styleBoundaryFailureChecks.length}`,
            missed_count: styleBoundaryFailureChecks.length,
            missed: qualityContractMissedRows(styleBoundaryFailureChecks),
            checks: styleBoundaryFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const informationFlowFailureChecks = qualityContractChecks(payload, 'information_flow_checks', 'informationFlowChecks')
      if (informationFlowFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = informationFlowFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '信息流',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'information_flow_gap',
          severity: 'high',
          category: 'information_flow',
          title: `信息流缺口 ${informationFlowFailureChecks.length}`,
          message: qualityContractMessage(informationFlowFailureChecks, '信息流检查存在未清 fail/warn 项。'),
          action: '按 information_flow_checks 回修正文：重排线索、解释、误判、反转和信息揭示顺序；让信息跟冲突、动作、选择和代价同步释放，避免提前泄底、补丁式旁白和上下文过载。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `信息流缺口 ${informationFlowFailureChecks.length}`,
            missed_count: informationFlowFailureChecks.length,
            missed: qualityContractMissedRows(informationFlowFailureChecks),
            checks: informationFlowFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const expectationThresholdFailureChecks = qualityContractChecks(payload, 'expectation_threshold_checks', 'expectationThresholdChecks')
      if (expectationThresholdFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = expectationThresholdFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '期待阈值',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'expectation_threshold_gap',
          severity: 'high',
          category: 'expectation_threshold',
          title: `期待阈值缺口 ${expectationThresholdFailureChecks.length}`,
          message: qualityContractMessage(expectationThresholdFailureChecks, '期待阈值检查存在未清 fail/warn 项。'),
          action: '按 expectation_threshold_checks 回修正文：强化读者必须继续阅读的问题、悬念、代价、选择压力或回报承诺；章末必须留下明确的下一章追问，不能只做氛围收束。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `期待阈值缺口 ${expectationThresholdFailureChecks.length}`,
            missed_count: expectationThresholdFailureChecks.length,
            missed: qualityContractMissedRows(expectationThresholdFailureChecks),
            checks: expectationThresholdFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const storyLoopFailureChecks = qualityContractChecks(payload, 'story_loop_checks', 'storyLoopChecks')
      if (storyLoopFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = storyLoopFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '故事闭环',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'story_loop_gap',
          severity: 'high',
          category: 'story_loop',
          title: `故事闭环缺口 ${storyLoopFailureChecks.length}`,
          message: qualityContractMessage(storyLoopFailureChecks, '故事闭环检查存在未清 fail/warn 项。'),
          action: '按 story_loop_checks 回修正文：让本章设问、阻碍、选择、代价、回报和新问题形成闭环；至少推进一个答案碎片或状态变化，并把残留问题自然挂到下一章。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `故事闭环缺口 ${storyLoopFailureChecks.length}`,
            missed_count: storyLoopFailureChecks.length,
            missed: qualityContractMissedRows(storyLoopFailureChecks),
            checks: storyLoopFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const emotionalArcFailureChecks = qualityContractChecks(payload, 'emotional_arc_checks', 'emotionalArcChecks')
      if (emotionalArcFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = emotionalArcFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '情绪弧',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'emotional_arc_gap',
          severity: 'high',
          category: 'emotional_arc',
          title: `情绪弧缺口 ${emotionalArcFailureChecks.length}`,
          message: qualityContractMessage(emotionalArcFailureChecks, '情绪弧检查存在未清 fail/warn 项。'),
          action: '按 emotional_arc_checks 回修正文：把平静、调动、释放、爽感写成可追踪递进；压迫必须落到现场选择，反制必须通过动作、对白、旁观反馈或状态变化外化。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `情绪弧缺口 ${emotionalArcFailureChecks.length}`,
            missed_count: emotionalArcFailureChecks.length,
            missed: qualityContractMissedRows(emotionalArcFailureChecks),
            checks: emotionalArcFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const chapterHookFailureChecks = qualityContractChecks(payload, 'chapter_hook_checks', 'chapterHookChecks')
      if (chapterHookFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = chapterHookFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '章级钩子',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'chapter_hook_gap',
          severity: 'high',
          category: 'chapter_hook',
          title: `章级钩子缺口 ${chapterHookFailureChecks.length}`,
          message: qualityContractMessage(chapterHookFailureChecks, '章级钩子检查存在未清 fail/warn 项。'),
          action: '按 chapter_hook_checks 回修正文：重做前100字章首钩子和最后约100字章尾翻页钩子；钩子必须形成具体问题、压力、兑现路径或下一章行动，不得是假悬念、低风险钩或机械降神。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `章级钩子缺口 ${chapterHookFailureChecks.length}`,
            missed_count: chapterHookFailureChecks.length,
            missed: qualityContractMissedRows(chapterHookFailureChecks),
            checks: chapterHookFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const paragraphHookFailureChecks = qualityContractChecks(payload, 'paragraph_hook_checks', 'paragraphHookChecks')
      if (paragraphHookFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = paragraphHookFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '段落级钩子',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'paragraph_hook_gap',
          severity: 'high',
          category: 'paragraph_hook',
          title: `段落级钩子缺口 ${paragraphHookFailureChecks.length}`,
          message: qualityContractMessage(paragraphHookFailureChecks, '段落级钩子检查存在未清 fail/warn 项。'),
          action: '按 paragraph_hook_checks 回修正文：每3-5段必须出现信息、风险、情绪或关系变化；补段落级钩子11种、钩子组合、对话情绪递进和围观者层级，修掉假悬念、低风险钩和同类型连用。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `段落级钩子缺口 ${paragraphHookFailureChecks.length}`,
            missed_count: paragraphHookFailureChecks.length,
            missed: qualityContractMissedRows(paragraphHookFailureChecks),
            checks: paragraphHookFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const suspenseFailureChecks = qualityContractChecks(payload, 'suspense_checks', 'suspenseChecks')
      if (suspenseFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = suspenseFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '悬念编排',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'suspense_gap',
          severity: 'high',
          category: 'suspense',
          title: `悬念编排缺口 ${suspenseFailureChecks.length}`,
          message: qualityContractMessage(suspenseFailureChecks, '悬念编排检查存在未清 fail/warn 项。'),
          action: '按 suspense_checks 回修正文：补疑问、误导、答案和新期待的悬念循环；先提出具体问题，再给可信提示或误导，公布局部答案后立起新期待，避免假悬念、谜语人拖延和信息延迟过久。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `悬念编排缺口 ${suspenseFailureChecks.length}`,
            missed_count: suspenseFailureChecks.length,
            missed: qualityContractMissedRows(suspenseFailureChecks),
            checks: suspenseFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const assetLinkageFailureChecks = qualityContractChecks(payload, 'asset_linkage_checks', 'assetLinkageChecks')
      if (assetLinkageFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = assetLinkageFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '资产挂钩',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'asset_linkage_gap',
          severity: 'high',
          category: 'asset_linkage',
          title: `资产挂钩缺口 ${assetLinkageFailureChecks.length}`,
          message: qualityContractMessage(assetLinkageFailureChecks, '资产挂钩检查存在未清 fail/warn 项。'),
          action: '按 asset_linkage_checks 回修正文：消灭孤立资产，让关键资产绑定功能、归属、触发条件、限制、后果和状态变化；每个资产至少接到本章目标、冲突、回报或章尾钩子之一，设定信息必须随使用、质疑、触发、误判或代价反馈释放。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `资产挂钩缺口 ${assetLinkageFailureChecks.length}`,
            missed_count: assetLinkageFailureChecks.length,
            missed: qualityContractMissedRows(assetLinkageFailureChecks),
            checks: assetLinkageFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const dialogueFailureChecks = qualityContractChecks(payload, 'dialogue_checks', 'dialogueChecks')
      if (dialogueFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = dialogueFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '对白质量',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'dialogue_gap',
          severity: 'high',
          category: 'dialogue',
          title: `对白质量缺口 ${dialogueFailureChecks.length}`,
          message: qualityContractMessage(dialogueFailureChecks, '对白质量检查存在未清 fail/warn 项。'),
          action: '按 dialogue_checks 回修正文：让每句对白承担推进剧情、增加期待或展示人设之一；补潜台词、议程、声线差异、权力博弈、信息嵌入和情绪递进，把说明书式对白改成借口、试探、回避、动作反应或信息差拉扯。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `对白质量缺口 ${dialogueFailureChecks.length}`,
            missed_count: dialogueFailureChecks.length,
            missed: qualityContractMissedRows(dialogueFailureChecks),
            checks: dialogueFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const plotDynamicsFailureChecks = qualityContractChecks(payload, 'plot_dynamics_checks', 'plotDynamicsChecks')
      if (plotDynamicsFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = plotDynamicsFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '剧情动力',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'plot_dynamics_gap',
          severity: 'high',
          category: 'plot_dynamics',
          title: `剧情动力缺口 ${plotDynamicsFailureChecks.length}`,
          message: qualityContractMessage(plotDynamicsFailureChecks, '剧情动力检查存在未清 fail/warn 项。'),
          action: '按 plot_dynamics_checks 回修正文：补目标、阻碍、行动、代价/反馈、新期待的最小剧情循环；需要时重构假胜、崩解、A/B情绪交替、多线错峰或悬置收尾，让本章推进变成可见行动链。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `剧情动力缺口 ${plotDynamicsFailureChecks.length}`,
            missed_count: plotDynamicsFailureChecks.length,
            missed: qualityContractMissedRows(plotDynamicsFailureChecks),
            checks: plotDynamicsFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const characterRelationFailureChecks = qualityContractChecks(payload, 'character_relation_checks', 'characterRelationChecks')
      if (characterRelationFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = characterRelationFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '角色关系',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'character_relation_gap',
          severity: 'high',
          category: 'character_relation',
          title: `角色关系缺口 ${characterRelationFailureChecks.length}`,
          message: qualityContractMessage(characterRelationFailureChecks, '角色关系检查存在未清 fail/warn 项。'),
          action: '按 character_relation_checks 回修正文：补关系类型、关系考验/变化、主角独立目标、目标归属、角色不止恋爱、配角期待枢纽、配角主动行动、态度变化和阶段匹配；主角必须保留自己的诉求、主动选择和代价，关系线要让目标摩擦或互补。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `角色关系缺口 ${characterRelationFailureChecks.length}`,
            missed_count: characterRelationFailureChecks.length,
            missed: qualityContractMissedRows(characterRelationFailureChecks),
            checks: characterRelationFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const characterBehaviorFailureChecks = qualityContractChecks(payload, 'character_behavior_checks', 'characterBehaviorChecks')
      if (characterBehaviorFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = characterBehaviorFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '角色行为',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'character_behavior_gap',
          severity: 'high',
          category: 'character_behavior',
          title: `角色行为缺口 ${characterBehaviorFailureChecks.length}`,
          message: qualityContractMessage(characterBehaviorFailureChecks, '角色行为检查存在未清 fail/warn 项。'),
          action: '按 character_behavior_checks 回修正文：补主角行为三必须、动机链、动机具体性、三层标签反差、人设强关联、展示优于告知、记忆锚点、配角功能、反派内在逻辑、反派分量、反派自我叙事和反派层级退场；动机必须落到具体事件、情感理由、触发变化和代价。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `角色行为缺口 ${characterBehaviorFailureChecks.length}`,
            missed_count: characterBehaviorFailureChecks.length,
            missed: qualityContractMissedRows(characterBehaviorFailureChecks),
            checks: characterBehaviorFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const coreContractFailureChecks = qualityContractChecks(payload, 'core_contract_checks', 'coreContractChecks')
      if (coreContractFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = coreContractFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '核心契约',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'core_contract_gap',
          severity: 'high',
          category: 'core_contract',
          title: `核心契约缺口 ${coreContractFailureChecks.length}`,
          message: qualityContractMessage(coreContractFailureChecks, '核心契约检查存在未清 fail/warn 项。'),
          action: '按 core_contract_checks 回修正文：守住全书核心承诺、主线服务、不得漂移红线和主题统一；把 repair_focus 写成可见事件、角色选择、代价、规则判定、主线推进或章末问题，小情绪必须服从全书核心情绪。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `核心契约缺口 ${coreContractFailureChecks.length}`,
            missed_count: coreContractFailureChecks.length,
            missed: qualityContractMissedRows(coreContractFailureChecks),
            checks: coreContractFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const revisionReceiptFailureChecks = qualityContractChecks(payload, 'revision_receipt_checks', 'revisionReceiptChecks')
      if (revisionReceiptFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = revisionReceiptFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '修订回执',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'revision_receipt_gap',
          severity: 'high',
          category: 'revision_receipt',
          title: `修订回执缺口 ${revisionReceiptFailureChecks.length}`,
          message: qualityContractMessage(revisionReceiptFailureChecks, '修订回执检查存在未清 fail/warn 项。'),
          action: '按 revision_receipt_checks 回修：逐条对齐 delivery_risk_receipts、prose revision 要求和实际改动，补齐 revision_receipts.required_action、repair_segment、applied_fix、changed_evidence；changed_evidence 必须能在修订后正文定位。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `修订回执缺口 ${revisionReceiptFailureChecks.length}`,
            missed_count: revisionReceiptFailureChecks.length,
            missed: qualityContractMissedRows(revisionReceiptFailureChecks),
            checks: revisionReceiptFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const deslopRepairFailureChecks = qualityContractChecks(payload, 'deslop_repair_checks', 'deslopRepairChecks')
      if (deslopRepairFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = deslopRepairFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '去AI味修复',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'deslop_repair_gap',
          severity: 'high',
          category: 'deslop_repair',
          title: `去AI味修复缺口 ${deslopRepairFailureChecks.length}`,
          message: qualityContractMessage(deslopRepairFailureChecks, '去AI味修复检查存在未清 fail/warn 项。'),
          action: '按 deslop_repair_checks 回修：逐条处理 story-deslop Gate A-G 残留，重写模板化对白、抽象心理、堆叠描写或AI腔，并在 deslop_repair_receipts.changed_evidence 中引用修订后正文证据。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `去AI味修复缺口 ${deslopRepairFailureChecks.length}`,
            missed_count: deslopRepairFailureChecks.length,
            missed: qualityContractMissedRows(deslopRepairFailureChecks),
            checks: deslopRepairFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const proseMetaFailureChecks = qualityContractChecks(payload, 'prose_meta_checks', 'proseMetaChecks')
      if (proseMetaFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = proseMetaFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '正文元叙事',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'prose_meta_gap',
          severity: 'high',
          category: 'prose_meta',
          title: `正文元叙事缺口 ${proseMetaFailureChecks.length}`,
          message: qualityContractMessage(proseMetaFailureChecks, '正文元叙事检查存在未清 fail/warn 项。'),
          action: '按 prose_meta_checks 回修正文：删除作者说明、创作术语、章节意图旁白和元叙事提示，把铺垫、反转、伏笔和解释改成角色现场证据、误判、行动后果或可定位信息变化。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `正文元叙事缺口 ${proseMetaFailureChecks.length}`,
            missed_count: proseMetaFailureChecks.length,
            missed: qualityContractMissedRows(proseMetaFailureChecks),
            checks: proseMetaFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const serialRiskRepairFailureChecks = qualityContractChecks(payload, 'serial_risk_repair_checks', 'serialRiskRepairChecks')
      if (serialRiskRepairFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = serialRiskRepairFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '连续风险修复',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'serial_risk_repair_gap',
          severity: 'high',
          category: 'serial_risk_repair',
          title: `连续风险修复缺口 ${serialRiskRepairFailureChecks.length}`,
          message: qualityContractMessage(serialRiskRepairFailureChecks, '连续风险修复检查存在未清 fail/warn 项。'),
          action: '按 serial_risk_repair_checks 回修正文：补齐安全批量、场景承接、连续生产风险的修复回执，并把场景承接变化、状态变化或风险解除证据落到正文可定位内容。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `连续风险修复缺口 ${serialRiskRepairFailureChecks.length}`,
            missed_count: serialRiskRepairFailureChecks.length,
            missed: qualityContractMissedRows(serialRiskRepairFailureChecks),
            checks: serialRiskRepairFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const chapterHookQualityFailureChecks = qualityContractChecks(payload, 'chapter_hook_quality_checks', 'chapterHookQualityChecks')
      if (chapterHookQualityFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = chapterHookQualityFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '章钩质量',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'chapter_hook_quality_gap',
          severity: 'high',
          category: 'chapter_hook_quality',
          title: `章钩质量缺口 ${chapterHookQualityFailureChecks.length}`,
          message: qualityContractMessage(chapterHookQualityFailureChecks, '章钩质量检查存在未清 fail/warn 项。'),
          action: '按 chapter_hook_quality_checks 回修正文：章首必须用现场异常、危险、选择、冲突、对话逼问或规则触发拉住读者；章尾必须留下具体问题、危险、发现、选择或下一章行动压力，并和后续行动直接相连。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `章钩质量缺口 ${chapterHookQualityFailureChecks.length}`,
            missed_count: chapterHookQualityFailureChecks.length,
            missed: qualityContractMissedRows(chapterHookQualityFailureChecks),
            checks: chapterHookQualityFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const continuityHeatFailureChecks = qualityContractChecks(payload, 'continuity_heat_checks', 'continuityHeatChecks')
      if (continuityHeatFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = continuityHeatFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '连续性热度',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'continuity_heat_gap',
          severity: 'high',
          category: 'continuity_heat',
          title: `连续性热度缺口 ${continuityHeatFailureChecks.length}`,
          message: qualityContractMessage(continuityHeatFailureChecks, '连续性热度检查存在未清 fail/warn 项。'),
          action: '按 continuity_heat_checks 回修正文：hot 元素必须推进，warm 元素必须有效触达，cold 回收前必须升温，archived 不得误激活；避免只点名伏笔、只说以后再说或让休眠线突然解题。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `连续性热度缺口 ${continuityHeatFailureChecks.length}`,
            missed_count: continuityHeatFailureChecks.length,
            missed: qualityContractMissedRows(continuityHeatFailureChecks),
            checks: continuityHeatFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const conflictStructureFailureChecks = qualityContractChecks(payload, 'conflict_structure_checks', 'conflictStructureChecks')
      if (conflictStructureFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = conflictStructureFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '冲突结构',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'conflict_structure_gap',
          severity: 'high',
          category: 'conflict_structure',
          title: `冲突结构缺口 ${conflictStructureFailureChecks.length}`,
          message: qualityContractMessage(conflictStructureFailureChecks, '冲突结构检查存在未清 fail/warn 项。'),
          action: '按 conflict_structure_checks 回修正文：补阻止者、有进无出、死亡赌注/退出代价、黏结剂、言语到行动再到激烈对抗的升级阶梯、明确胜负结果、压势不压人、主角主动破局、矛盾网和下一冲突种子。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `冲突结构缺口 ${conflictStructureFailureChecks.length}`,
            missed_count: conflictStructureFailureChecks.length,
            missed: qualityContractMissedRows(conflictStructureFailureChecks),
            checks: conflictStructureFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const bridgeUnitFailureChecks = qualityContractChecks(payload, 'bridge_unit_checks', 'bridgeUnitChecks')
      if (bridgeUnitFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = bridgeUnitFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '桥段节奏',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'bridge_unit_gap',
          severity: 'high',
          category: 'bridge_unit',
          title: `桥段节奏缺口 ${bridgeUnitFailureChecks.length}`,
          message: qualityContractMessage(bridgeUnitFailureChecks, '桥段节奏检查存在未清 fail/warn 项。'),
          action: '按 bridge_unit_checks 回修正文：确认四章一桥段位置，补连续期待、目标推进、章尾新目标、高潮中埋钩子或连续小期待；连续2章没有目标推进时提高冲突密度，连续2章只爆点时补关系、伏笔、状态承接余波。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `桥段节奏缺口 ${bridgeUnitFailureChecks.length}`,
            missed_count: bridgeUnitFailureChecks.length,
            missed: qualityContractMissedRows(bridgeUnitFailureChecks),
            checks: bridgeUnitFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const reversalFailureChecks = qualityContractChecks(payload, 'reversal_checks', 'reversalChecks')
      if (reversalFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = reversalFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '反转设计',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'reversal_gap',
          severity: 'high',
          category: 'reversal',
          title: `反转设计缺口 ${reversalFailureChecks.length}`,
          message: qualityContractMessage(reversalFailureChecks, '反转设计检查存在未清 fail/warn 项。'),
          action: '按 reversal_checks 回修正文：补足3处暗示、公平误导、反转类型、揭示时机、揭示后影响和打脸节奏；删除天降反转、作弊新信息和大段解释独白。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `反转设计缺口 ${reversalFailureChecks.length}`,
            missed_count: reversalFailureChecks.length,
            missed: qualityContractMissedRows(reversalFailureChecks),
            checks: reversalFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const showdownFailureChecks = qualityContractChecks(payload, 'showdown_checks', 'showdownChecks')
      if (showdownFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = showdownFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '高潮对抗',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'showdown_gap',
          severity: 'high',
          category: 'showdown',
          title: `高潮对抗缺口 ${showdownFailureChecks.length}`,
          message: qualityContractMessage(showdownFailureChecks, '高潮对抗检查存在未清 fail/warn 项。'),
          action: '按 showdown_checks 回修正文：补爽点释放、底牌管理、三压一爆三震、舞台层级、传递通道、震惊分层、战斗/智斗服务爽点、以弱胜强逻辑、三层破局和急-缓-急情绪节奏。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `高潮对抗缺口 ${showdownFailureChecks.length}`,
            missed_count: showdownFailureChecks.length,
            missed: qualityContractMissedRows(showdownFailureChecks),
            checks: showdownFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const openingFailureChecks = qualityContractChecks(payload, 'opening_checks', 'openingChecks')
      if (openingFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = openingFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '开篇设计',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'opening_gap',
          severity: 'high',
          category: 'opening',
          title: `开篇设计缺口 ${openingFailureChecks.length}`,
          message: qualityContractMessage(openingFailureChecks, '开篇设计检查存在未清 fail/warn 项。'),
          action: '按 opening_checks 回修正文：重做300字内主角登场、1000字内爽点/期待点、三大基点、开头五要诀（简单、不偏、快、爽、不平）、主角目标与本文卖点、信息分批释放；删除大段背景、天气风景、序章楔子和详细世界观。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `开篇设计缺口 ${openingFailureChecks.length}`,
            missed_count: openingFailureChecks.length,
            missed: qualityContractMissedRows(openingFailureChecks),
            checks: openingFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const proseCraftFailureChecks = qualityContractChecks(payload, 'prose_craft_checks', 'proseCraftChecks')
      if (proseCraftFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const directiveCheck = proseCraftFailureChecks.find(check => sceneCardDirectiveCheckKey(check))
        const firstCheck = directiveCheck || proseCraftFailureChecks[0] || {}
        const sceneCardDirectiveKind = sceneCardDirectiveCheckKey(firstCheck)
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '正文工艺',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: sceneCardDirectiveKind || 'prose_craft_gap',
          severity: 'high',
          category: 'prose_craft',
          title: `正文工艺缺口 ${proseCraftFailureChecks.length}`,
          message: qualityContractMessage(proseCraftFailureChecks, '正文工艺检查存在未清 fail/warn 项。'),
          action: '按 prose_craft_checks 回修正文：修深度限知、身体细节替代情绪词、连续内心独白、全场远景概括、三维度揉进、一动一静、道具/数字功能和环境交互；删除上帝视角、堆叠式描写、抽象心理总结、无交互环境和胶水词过渡。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `正文工艺缺口 ${proseCraftFailureChecks.length}`,
            missed_count: proseCraftFailureChecks.length,
            missed: qualityContractMissedRows(proseCraftFailureChecks),
            checks: proseCraftFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const punctuationToneFailureChecks = qualityContractChecks(payload, 'punctuation_tone_checks', 'punctuationToneChecks')
      if (punctuationToneFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = punctuationToneFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '语气标点',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'punctuation_tone_gap',
          severity: 'high',
          category: 'punctuation_tone',
          title: `语气标点缺口 ${punctuationToneFailureChecks.length}`,
          message: qualityContractMessage(punctuationToneFailureChecks, '语气标点检查存在未清 fail/warn 项。'),
          action: '按 punctuation_tone_checks 回修正文：修通篇句号化、随机标点堆砌、省略号/破折号硬停顿、质问/爆发/迟疑标点错配和角色声线同质；用动作打断、换行、短句或冒号落点承接语气。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `语气标点缺口 ${punctuationToneFailureChecks.length}`,
            missed_count: punctuationToneFailureChecks.length,
            missed: qualityContractMissedRows(punctuationToneFailureChecks),
            checks: punctuationToneFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const contentRubricFailureChecks = qualityContractChecks(payload, 'content_rubric_checks', 'contentRubricChecks')
      if (contentRubricFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = contentRubricFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '内容基准',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'content_rubric_gap',
          severity: 'high',
          category: 'content_rubric',
          title: `内容基准缺口 ${contentRubricFailureChecks.length}`,
          message: qualityContractMessage(contentRubricFailureChecks, '内容基准检查存在未清 fail/warn 项。'),
          action: '按 content_rubric_checks 回修正文：补核心卖点、冲突推进、情绪曲线、钩子与期待、角色动机、对话质量、设定一致性、自然文字证据、最小剧情循环和高潮构建；必须回答读者为什么翻下一页、本章改变了什么、正文证据在哪里。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `内容基准缺口 ${contentRubricFailureChecks.length}`,
            missed_count: contentRubricFailureChecks.length,
            missed: qualityContractMissedRows(contentRubricFailureChecks),
            checks: contentRubricFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const targetReaderFailureChecks = qualityContractChecks(payload, 'target_reader_checks', 'targetReaderChecks')
      if (targetReaderFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = targetReaderFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '目标读者',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'target_reader_gap',
          severity: 'high',
          category: 'target_reader',
          title: `目标读者缺口 ${targetReaderFailureChecks.length}`,
          message: qualityContractMessage(targetReaderFailureChecks, '目标读者检查存在未清 fail/warn 项。'),
          action: '按 target_reader_checks 回修正文：补清目标读者画像、读者渴望、情绪缺口、本章命中点、平台口味和可见读者回报；情绪缺口必须把核心痛苦、深层情结、高频情绪关键词和未满足需求写成冲突压力、角色选择、即时反馈或尊严/安全感/掌控感补偿。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `目标读者缺口 ${targetReaderFailureChecks.length}`,
            missed_count: targetReaderFailureChecks.length,
            missed: qualityContractMissedRows(targetReaderFailureChecks),
            checks: targetReaderFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const genrePositioningFailureChecks = qualityContractChecks(payload, 'genre_positioning_checks', 'genrePositioningChecks')
      if (genrePositioningFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = genrePositioningFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '题材定位',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'genre_positioning_gap',
          severity: 'high',
          category: 'genre_positioning',
          title: `题材定位缺口 ${genrePositioningFailureChecks.length}`,
          message: qualityContractMessage(genrePositioningFailureChecks, '题材定位检查存在未清 fail/warn 项。'),
          action: '按 genre_positioning_checks 回修正文：校准题材标签、核心梗、类型公式、金手指贴合、必备场景、微创新边界、长板聚焦和书名简介正文三位一体；拉长题材长板而非补短板，删除稀释核心卖点的支线，把同一卖点扩成至少 3 个角度的正文证据。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `题材定位缺口 ${genrePositioningFailureChecks.length}`,
            missed_count: genrePositioningFailureChecks.length,
            missed: qualityContractMissedRows(genrePositioningFailureChecks),
            checks: genrePositioningFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const femaleAudienceFailureChecks = qualityContractChecks(payload, 'female_audience_checks', 'femaleAudienceChecks')
      if (femaleAudienceFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = femaleAudienceFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '女频长篇',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'female_audience_gap',
          severity: 'high',
          category: 'female_audience',
          title: `女频长篇缺口 ${femaleAudienceFailureChecks.length}`,
          message: qualityContractMessage(femaleAudienceFailureChecks, '女频长篇检查存在未清 fail/warn 项。'),
          action: '按 female_audience_checks 回修正文：补安全感锚点、代入感、女主主动性、主情绪、感情线双轴、虐后反转或糖、平台对位和货板一致；把女主被动改成女主自己做决定、自己推进，把感情升级踩到事业/成长节点上，并控制连续虐戏剂量。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `女频长篇缺口 ${femaleAudienceFailureChecks.length}`,
            missed_count: femaleAudienceFailureChecks.length,
            missed: qualityContractMissedRows(femaleAudienceFailureChecks),
            checks: femaleAudienceFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const upgradeRhythmFailureChecks = qualityContractChecks(payload, 'upgrade_rhythm_checks', 'upgradeRhythmChecks')
      if (upgradeRhythmFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = upgradeRhythmFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '升级节奏',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'upgrade_rhythm_gap',
          severity: 'high',
          category: 'upgrade_rhythm',
          title: `升级节奏缺口 ${upgradeRhythmFailureChecks.length}`,
          message: qualityContractMessage(upgradeRhythmFailureChecks, '升级节奏检查存在未清 fail/warn 项。'),
          action: '按 upgrade_rhythm_checks 回修正文：补升级前后对比、即时反馈、延迟反馈、新门槛、金手指功能触发奖励规则和多维成长；金手指简单是核心，升级必须写成读者一眼能懂的动作反馈、资格变化、能力边界和下一层压力。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `升级节奏缺口 ${upgradeRhythmFailureChecks.length}`,
            missed_count: upgradeRhythmFailureChecks.length,
            missed: qualityContractMissedRows(upgradeRhythmFailureChecks),
            checks: upgradeRhythmFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const chapterStructureFailureChecks = qualityContractChecks(payload, 'structure_checks', 'structureChecks')
      if (chapterStructureFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = chapterStructureFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '章节结构',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'chapter_structure_gap',
          severity: 'high',
          category: 'chapter_structure',
          title: `章节结构缺口 ${chapterStructureFailureChecks.length}`,
          message: qualityContractMessage(chapterStructureFailureChecks, '章节结构检查存在未清 fail/warn 项。'),
          action: '按 structure_checks 回修正文：补开头钩子、中段推进、局势变化和章尾翻页；开头必须给具体异常/证据/危机，中段用行动推动局势，结尾落到新的发现、危机、选择或反转，而不是总结。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `章节结构缺口 ${chapterStructureFailureChecks.length}`,
            missed_count: chapterStructureFailureChecks.length,
            missed: qualityContractMissedRows(chapterStructureFailureChecks),
            checks: chapterStructureFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const chapterProgressionFailureChecks = qualityContractChecks(payload, 'progression_checks', 'progressionChecks')
      if (chapterProgressionFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = chapterProgressionFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '章节推进',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'chapter_progression_gap',
          severity: 'high',
          category: 'chapter_progression',
          title: `章节推进缺口 ${chapterProgressionFailureChecks.length}`,
          message: qualityContractMessage(chapterProgressionFailureChecks, '章节推进检查存在未清 fail/warn 项。'),
          action: '按 progression_checks 回修正文：证明删掉这章会影响理解；补本章不可删除的证据、选择、代价、关系变化、设定位移或主线位移，并压缩等待、复述、原地解释和不改变局势的段落。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `章节推进缺口 ${chapterProgressionFailureChecks.length}`,
            missed_count: chapterProgressionFailureChecks.length,
            missed: qualityContractMissedRows(chapterProgressionFailureChecks),
            checks: chapterProgressionFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const informationLoadFailureChecks = qualityContractChecks(payload, 'information_checks', 'informationChecks')
      if (informationLoadFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = informationLoadFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '信息负载',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'information_load_gap',
          severity: 'high',
          category: 'information_load',
          title: `信息负载缺口 ${informationLoadFailureChecks.length}`,
          message: qualityContractMessage(informationLoadFailureChecks, '信息负载检查存在未清 fail/warn 项。'),
          action: '按 information_checks 回修正文：压缩新概念到 3 个以内，把设定说明改成角色行动、质疑、触发、证据核对或冲突反馈中的可见信息；信息必须跟着冲突走，不得在行动前大段解释规则。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `信息负载缺口 ${informationLoadFailureChecks.length}`,
            missed_count: informationLoadFailureChecks.length,
            missed: qualityContractMissedRows(informationLoadFailureChecks),
            checks: informationLoadFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const longformContinuityFailureChecks = qualityContractChecks(payload, 'longform_checks', 'longformChecks')
      if (longformContinuityFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = longformContinuityFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '长篇连续性',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'longform_continuity_gap',
          severity: 'high',
          category: 'longform_continuity',
          title: `长篇连续性缺口 ${longformContinuityFailureChecks.length}`,
          message: qualityContractMessage(longformContinuityFailureChecks, '长篇连续性检查存在未清 fail/warn 项。'),
          action: '按 longform_checks 回修正文：检查最近 5 章是否有明确进展、爽点间隔是否过长、本章是否承接前文并推动后续；补阶段位移、状态变化、爽点回报和下一阶段牵引，避免连续多章只解释背景。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `长篇连续性缺口 ${longformContinuityFailureChecks.length}`,
            missed_count: longformContinuityFailureChecks.length,
            missed: qualityContractMissedRows(longformContinuityFailureChecks),
            checks: longformContinuityFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const readerRetentionFailureChecks = qualityContractChecks(payload, 'reader_retention_checks', 'readerRetentionChecks')
      if (readerRetentionFailureChecks.length > 0) {
        const chapter = resolveChapter(payload)
        const firstCheck = readerRetentionFailureChecks[0] || {}
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '追读雷达',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'reader_retention_gap',
          severity: 'high',
          category: 'reader_retention',
          title: `追读雷达缺口 ${readerRetentionFailureChecks.length}`,
          message: qualityContractMessage(readerRetentionFailureChecks, '追读雷达检查存在未清 fail/warn 项。'),
          action: '按 reader_retention_checks 回修正文：补前300字钩子、可见爽点、信息缺口、章末追读、留存双引擎的情绪 + 饥饿，以及 Hook上瘾模型的触发、行动、奖励、投入；饥饿缺口必须用信息差植入问号并剥洋葱卡住关键信息，奖励缺口必须补奖励随机性和沉没投入。',
          created_at: review.created_at,
          payload: {
            ...(typeof firstCheck === 'object' && firstCheck ? firstCheck : { check: firstCheck }),
            status: 'warn',
            label: `追读雷达缺口 ${readerRetentionFailureChecks.length}`,
            missed_count: readerRetentionFailureChecks.length,
            missed: qualityContractMissedRows(readerRetentionFailureChecks),
            checks: readerRetentionFailureChecks,
            review_type: review.review_type,
          },
        })
      }
      const intentConfirmationChecks = preDraftExecutionChecks(payload, 'intent_confirmation_checks', 'intentConfirmationChecks')
      if (intentConfirmationChecks.length > 0) {
        const chapter = resolveChapter(payload)
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '意图确认',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'intent_confirmation_gap',
          severity: 'high',
          category: 'intent_confirmation',
          title: `意图确认缺口 ${intentConfirmationChecks.length}`,
          message: preDraftExecutionMessage(intentConfirmationChecks) || '写前意图确认没有在正文中形成可验证证据。',
          action: '按写前意图确认回执回修正文：把情绪目标、章节意图、关键承接和章尾推动力改成正文可见事件、选择、动作、对白、关系反馈或物品状态变化。',
          created_at: review.created_at,
          payload: {
            status: 'warn',
            label: `意图确认缺口 ${intentConfirmationChecks.length}`,
            missed_count: intentConfirmationChecks.length,
            missed: preDraftExecutionMissedRows(intentConfirmationChecks),
            checks: intentConfirmationChecks,
            review_type: review.review_type,
          },
        })
      }
      const benchmarkRecallChecks = preDraftExecutionChecks(payload, 'benchmark_recall_checks', 'benchmarkRecallChecks')
      if (benchmarkRecallChecks.length > 0) {
        const chapter = resolveChapter(payload)
        pushAnnotation(items, statuses, {
          source: 'prose_quality',
          source_label: '文风召回',
          review_id: review.id,
          chapter_id: chapter?.id,
          chapter_no: chapter?.chapter_no,
          kind: 'benchmark_recall_gap',
          severity: 'high',
          category: 'benchmark_recall',
          title: `文风召回缺口 ${benchmarkRecallChecks.length}`,
          message: preDraftExecutionMessage(benchmarkRecallChecks) || '写前文风召回没有在正文中形成可验证证据。',
          action: '按写前文风召回回执回修正文：把对标模块、节奏参照、文风召回和表达方法改成正文中的节拍分配、对白比例、动作链和情绪转折，禁止复制参照文本原句或桥段。',
          created_at: review.created_at,
          payload: {
            status: 'warn',
            label: `文风召回缺口 ${benchmarkRecallChecks.length}`,
            missed_count: benchmarkRecallChecks.length,
            missed: preDraftExecutionMissedRows(benchmarkRecallChecks),
            checks: benchmarkRecallChecks,
            review_type: review.review_type,
          },
        })
      }
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
    if (review.review_type === 'quality_audit_repair_receipt_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'quality_audit_repair_receipt_sync',
        sourceLabel: '质量回执',
        category: 'quality_audit_repair_receipt',
        kind: 'quality_audit_repair_receipt',
        count: qualityAuditRepairReceiptCount,
        title: (risk, count) => String(risk?.label || `质量诊断修复回执缺口 ${count}`),
        message: risk => qualityAuditRepairReceiptMessage(risk),
        action: risk => asArray(risk?.next_actions || risk?.nextActions).map((item: any) => String(item || '').trim()).filter(Boolean).join('；')
          || '重新修订并逐条输出 quality_audit_repair_receipts.changed_evidence，确保每条回执能定位到修订后正文证据。',
        severity: () => 'high',
      })
    }
    if (review.review_type === 'deslop_repair_receipt_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'deslop_repair_receipt_sync',
        sourceLabel: '去AI味回执',
        category: 'deslop_repair_receipt',
        kind: 'deslop_repair_receipt',
        count: deslopRepairReceiptCount,
        title: (risk, count) => String(risk?.label || `去AI味修复回执残留 ${count}`),
        message: risk => deslopRepairReceiptMessage(risk),
        action: risk => asArray(risk?.next_actions || risk?.nextActions).map((item: any) => String(item || '').trim()).filter(Boolean).join('；')
          || '重新修订并逐条输出 deslop_repair_receipts.changed_evidence，确保每条回执能定位到修订后正文证据。',
        severity: () => 'high',
      })
    }
    if (review.review_type === 'revision_cascade_impact_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'revision_cascade_impact_sync',
        sourceLabel: '级联修订',
        category: 'revision_cascade_impact',
        kind: 'revision_cascade_impact',
        count: deliveryRiskMissedCount,
        title: (risk, count) => String(risk?.label || `修订级联影响 ${count}`),
        message: risk => deliveryRiskMissedMessage(risk, 'revision_receipts.cascade_impacts 存在后续章节同步义务。'),
        action: risk => [
          '复核 revision_receipts.cascade_impacts，补齐 evidence/source_excerpt，并把修订后的伏笔、时间线、角色状态、资产归属和关系边界同步到后续章节。',
          ...asArray(risk?.next_actions || risk?.nextActions).map((item: any) => String(item || '').trim()).filter(Boolean),
        ].join('；'),
        severity: () => 'high',
      })
    }
    if (review.review_type === 'revision_scope_guard_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'revision_scope_guard_sync',
        sourceLabel: '修订幅度',
        category: 'revision_scope_guard',
        kind: 'revision_scope_guard',
        count: deliveryRiskMissedCount,
        title: (risk, count) => String(risk?.label || `修订幅度风险 ${count}`),
        message: risk => deliveryRiskMissedMessage(risk, '修订前后字数差异超过 oh-story 修订幅度警戒线。'),
        action: risk => asArray(risk?.next_actions || risk?.nextActions).map((item: any) => String(item || '').trim()).filter(Boolean).join('；')
          || '下一轮修订不要重写整章；只按自检证据、修订回执残留和确定性检查缺口做局部修复。',
        severity: () => 'high',
      })
    }
    if (review.review_type === 'prose_revision_receipt_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'prose_revision_receipt_sync',
        sourceLabel: '修订回执',
        category: 'prose_revision_receipt',
        kind: 'prose_revision_receipt_sync',
        count: deliveryRiskMissedCount,
        title: (risk, count) => String(risk?.label || `修订回执残留 ${count}`),
        message: risk => deliveryRiskMissedMessage(risk, 'delivery_risk_receipts 存在失败项，但 revision_receipts 没有逐条闭环。'),
        action: risk => asArray(risk?.next_actions || risk?.nextActions).map((item: any) => String(item || '').trim()).filter(Boolean).join('；')
          || '补齐 delivery_risk_receipts 对应的 revision_receipts；每条必须写 required_action、repair_segment、applied_fix 和 changed_evidence。',
        severity: () => 'high',
      })
    }
    if (review.review_type === 'chapter_core_drift') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'core_drift',
        sourceLabel: '核心偏移',
        category: 'delivery_core',
        kind: 'core_drift',
        count: risk => countPayloadNumber(risk?.risk_count ?? risk?.riskCount, countItems(risk?.drift_risks) || countItems(risk?.risks)),
        title: (risk, count) => String(risk?.label || `核心偏移 ${count}`),
        message: risk => asArray(risk?.drift_risks || risk?.risks).slice(0, 3).map((item: any) => String(item)).join('；') || '章节疑似偏离作品核心、读者承诺或本章目标。',
        action: '进入章节修订，优先守住作品核心、读者承诺、本章目标和核心冲突。',
        severity: () => 'high',
      })
    }
    if (review.review_type === 'runway_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'runway_sync',
        sourceLabel: '百万字航线',
        category: 'runway',
        kind: 'runway_sync_risk',
        count: risk => countPayloadNumber(
          risk?.risk_count ?? risk?.riskCount,
          countItems(risk?.four_question_missed) + countItems(risk?.reader_fuel_missed) + countItems(risk?.redline_touched),
        ),
        title: (risk, count) => String(risk?.label || `航线风险 ${count}`),
        message: risk => [
          ...asArray(risk?.four_question_missed).map((item: any) => `四问未兑现 ${item?.label || item?.text || item}`),
          ...asArray(risk?.reader_fuel_missed).map((item: any) => `读者燃料未兑现 ${item?.text || item?.label || item}`),
          ...asArray(risk?.redline_touched).map((item: any) => `红线风险 ${item?.text || item?.label || item}`),
        ].slice(0, 4).join('；') || '本章没有充分兑现百万字航线。',
        action: '补齐百万字航线的本章四问、读者燃料和红线约束，避免当前章偏离长期主线或提前消费后续爆点。',
        severity: risk => countItems(risk?.redline_touched) > 0 ? 'high' : 'medium',
      })
    }
    if (review.review_type === 'reader_retention_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'reader_retention_sync',
        sourceLabel: '追读兑现',
        category: 'reader_retention',
        kind: 'reader_retention_missed',
        count: risk => countPayloadNumber(risk?.missed_count ?? risk?.missedCount, countItems(risk?.missed)),
        title: (risk, count) => String(risk?.label || `漏追读 ${count}`),
        message: risk => asArray(risk?.missed).slice(0, 3).map((item: any) => String(item?.label || item?.text || item)).join('；') || '本章追读承诺没有充分兑现。',
        action: '补齐开篇钩子、信息缺口、短剧化场面和章末追读问题。',
      })
    }
    if (review.review_type === 'chapter_attraction_review') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'chapter_attraction_review',
        sourceLabel: '章节吸引力',
        category: 'chapter_attraction',
        kind: 'chapter_attraction_gap',
        count: risk => countPayloadNumber(risk?.weak_count ?? risk?.weakCount, countItems(risk?.weak_dimensions) || countItems(risk?.dimensions)),
        title: (risk, count) => String(risk?.label || `吸引力缺口 ${count}`),
        message: risk => asArray(risk?.weak_dimensions || risk?.dimensions).slice(0, 4).map((item: any) => {
          const label = String(item?.label || item?.key || '').trim()
          const issue = String(item?.issue || item?.text || item?.expected || item || '').trim()
          return label && issue && label !== issue ? `${label}：${issue}` : label || issue
        }).join('；') || '本章开篇钩子、场景推进、爽点密度、章末翻页或传播场面存在吸引力缺口。',
        action: '按吸引力执行器重修开篇钩子、场景推进、爽点密度、章末翻页和传播场面，优先补出下一页动力。',
      })
    }
    if (review.review_type === 'story_drive_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'story_drive_sync',
        sourceLabel: '故事驱动力',
        category: 'story_drive',
        kind: 'story_drive_gap',
        count: risk => countPayloadNumber(risk?.missed_count ?? risk?.missedCount, countItems(risk?.missed)),
        title: (risk, count) => String(risk?.label || `故事力缺口 ${count}`),
        message: risk => asArray(risk?.missed).slice(0, 4).map((item: any) => {
          const label = String(item?.label || item?.key || '').trim()
          const issue = String(item?.text || item?.expected || item?.issue || item || '').trim()
          return label && issue && label !== issue ? `${label}：${issue}` : label || issue
        }).join('；') || '本章主角选择、明确阻碍、选择代价、局面变化或下一步因果没有充分兑现。',
        action: '补出主角主动选择、明确阻碍、选择代价、局面变化和下一步因果，避免章节只有事件没有人物决策。',
      })
    }
    if (review.review_type === 'character_arc_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'character_arc_sync',
        sourceLabel: '人物弧光',
        category: 'character_arc',
        kind: 'character_arc_gap',
        count: risk => countPayloadNumber(risk?.missed_count ?? risk?.missedCount, countItems(risk?.missed)),
        title: (risk, count) => String(risk?.label || `人物弧光缺口 ${count}`),
        message: risk => asArray(risk?.missed).slice(0, 4).map((item: any) => {
          const label = String(item?.label || item?.key || '').trim()
          const issue = String(item?.text || item?.expected || item?.issue || item || '').trim()
          return label && issue && label !== issue ? `${label}：${issue}` : label || issue
        }).join('；') || '本章角色欲望、缺陷受压、关系变化、成长节点或口吻锚点没有充分兑现。',
        action: '补出角色欲望、缺陷受压、关系变化、成长节点和口吻锚点，避免章节只有事件推进但人物没有变化。',
      })
    }
    if (review.review_type === 'style_sample_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'style_sample_sync',
        sourceLabel: '风格样章',
        category: 'style_sample',
        kind: 'style_sample_gap',
        count: risk => countPayloadNumber(
          risk?.missed_count ?? risk?.missedCount,
          countItems(risk?.missed) + countItems(risk?.copied_phrases || risk?.copiedPhrases),
        ),
        title: (risk, count) => String(risk?.label || `风格缺口 ${count}`),
        message: risk => [
          ...asArray(risk?.missed).slice(0, 3).map((item: any) => `${item?.label || item?.key || '风格'}：${item?.text || item?.evidence || item}`),
          ...asArray(risk?.copied_phrases || risk?.copiedPhrases).slice(0, 2).map((item: any) => `照搬风险：${item}`),
        ].join('；') || '本章没有充分执行风格样章的节奏、句式、对白比例或角色口吻策略。',
        action: '按风格样章重修叙述节奏、句式密度、对白比例和角色口吻；只学习抽象表达方法，不得照搬样章原句。',
      })
    }
    if (review.review_type === 'reader_payoff_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'reader_payoff_sync',
        sourceLabel: '读者回报',
        category: 'reader_payoff',
        kind: 'reader_payoff_debt',
        count: risk => countPayloadNumber(risk?.debt_count ?? risk?.debtCount, countItems(risk?.missed) || countItems(risk?.debts)),
        title: (risk, count) => String(risk?.label || `回报欠账 ${count}`),
        message: risk => asArray(risk?.missed || risk?.debts).slice(0, 3).map((item: any) => String(item?.label || item?.text || item)).join('；') || '本章承诺的爽点、惊点或信息回收没有兑现。',
        action: '补足本章承诺的爽点、惊点、信息回收或关系变化，避免只铺垫不回报。',
      })
    }
    if (review.review_type === 'reader_expectation_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'reader_expectation_sync',
        sourceLabel: '读者期待',
        category: 'reader_expectation',
        kind: risk => openingHandoffMisses(risk).length > 0 ? 'opening_handoff_debt' : 'reader_expectation_debt',
        count: risk => countPayloadNumber(risk?.missed_count ?? risk?.missedCount, countItems(risk?.missed)),
        title: (risk, count) => openingHandoffMisses(risk).length > 0 ? `开篇承接漏写 ${Math.max(1, openingHandoffMisses(risk).length)}` : String(risk?.label || `期待欠账 ${count}`),
        message: risk => {
          const opening = openingHandoffMisses(risk)
          const source = opening.length > 0 ? opening : asArray(risk?.missed)
          return source.slice(0, 3).map((item: any) => String(item?.label && item?.text ? `${item.label}：${item.text}` : item?.label || item?.text || item)).join('；')
            || (opening.length > 0 ? '本章开篇没有接住上一章最后一幕。' : '本章读者期待账本中的必兑现项没有充分兑现。')
        },
        action: risk => openingHandoffMisses(risk).length > 0
          ? '重写或补写本章前300-500字，先接住上一章最后一幕、未解危机或读者期待，再推进本章新冲突。'
          : '补齐读者期待账本中的必兑现项，把承诺写成可见行动、冲突结果、情绪回报或章末未解问题。',
      })
    }
    if (review.review_type === 'volume_beat_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'volume_beat_sync',
        sourceLabel: '卷级爆点兑现',
        category: 'volume_beat',
        kind: 'volume_beat_missed',
        count: risk => countPayloadNumber(risk?.missed_count ?? risk?.missedCount, countItems(risk?.missed)),
        title: (risk, count) => String(risk?.label || `爆点漏兑现 ${count}`),
        message: risk => asArray(risk?.missed).slice(0, 3).map((item: any) => {
          const label = String(item?.label || item?.name || '').trim()
          const text = String(item?.text || item?.description || item?.reason || item || '').trim()
          return label && text && label !== text ? `${label}：${text}` : label || text
        }).join('；') || '本章卷级爆点、小高潮或关键反转没有充分兑现。',
        action: '补足本章卷级爆点、小高潮、中高潮或卷末爆点，把爆点写成现场冲突、选择代价、反制结果、关系变化或章末升级。',
      })
    }
    if (review.review_type === 'signature_scene_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'signature_scene_sync',
        sourceLabel: '强场面兑现',
        category: 'signature_scene',
        kind: 'signature_scene_missed',
        count: risk => countPayloadNumber(risk?.missed_count ?? risk?.missedCount, countItems(risk?.missed)),
        title: (risk, count) => String(risk?.label || `强场面漏写 ${count}`),
        message: risk => asArray(risk?.missed).slice(0, 3).map((item: any) => {
          const label = String(item?.label || item?.name || '').trim()
          const text = String(item?.text || item?.description || item?.reason || item || '').trim()
          return label && text && label !== text ? `${label}：${text}` : label || text
        }).join('；') || '开写任务书指定的标志性强场面没有充分兑现。',
        action: '补回开写任务书指定的标志性场面，把它写成可视化动作、空间冲突、规则代价、公开反转或读者可讨论的选择，不要只补气氛描写。',
      })
    }
    if (review.review_type === 'innovation_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'innovation_sync',
        sourceLabel: '创新兑现',
        category: 'innovation',
        kind: 'innovation_missed',
        count: risk => countPayloadNumber(risk?.missed_count ?? risk?.missedCount, countItems(risk?.missed)),
        title: (risk, count) => String(risk?.label || `创新缺口 ${count}`),
        message: risk => asArray(risk?.missed).slice(0, 3).map((item: any) => String(item?.label || item?.text || item)).join('；') || '本章创新执行点没有落成可见场面。',
        action: '补足本章创新执行，不把章节写成普通套路章；把创新角度写成可见选择、机制反差、规则代价或 IP 化场面。',
      })
    }
    if (review.review_type === 'storyline_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'storyline_sync',
        sourceLabel: '剧情线同步',
        category: 'storyline',
        kind: 'storyline_sync_risk',
        count: risk => countItems(risk?.missed) + countItems(risk?.unplanned) + countItems(risk?.forbidden_touched),
        title: (risk, count) => String(risk?.label || `剧情线风险 ${count}`),
        message: risk => [
          ...asArray(risk?.missed).map((item: any) => `漏推 ${item?.name || item?.label || item}`),
          ...asArray(risk?.unplanned).map((item: any) => `额外推进 ${item?.name || item?.label || item}`),
          ...asArray(risk?.forbidden_touched).map((item: any) => `禁揭风险 ${item?.name || item?.label || item}`),
        ].slice(0, 4).join('；') || '本章剧情线推进与计划不一致。',
        action: '对齐本章计划推进、埋线、回收和禁揭边界，避免临时加戏或提前揭底。',
        severity: risk => countItems(risk?.forbidden_touched) > 0 ? 'high' : 'medium',
      })
    }
    if (review.review_type === 'story_unit_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'story_unit_sync',
        sourceLabel: '剧情单元兑现',
        category: 'story_unit',
        kind: 'story_unit_sync_risk',
        count: storyUnitSyncRiskCount,
        title: (risk, count) => String(risk?.label || `剧情单元风险 ${count}`),
        message: risk => [
          ...asArray(risk?.missed).map((item: any) => `单元漏写 ${item?.label || item?.name || item?.text || item}`),
          ...asArray(risk?.rushed_ahead || risk?.rushedAhead).map((item: any) => `单元抢跑 ${item?.label || item?.name || item?.text || item}`),
          ...asArray(risk?.forbidden_touched || risk?.forbiddenTouched).map((item: any) => `禁抢跑 ${item?.label || item?.name || item?.text || item}`),
        ].slice(0, 4).join('；') || '本章剧情单元职责与计划不一致。',
        action: '补足当前剧情单元职责，把抢跑的小高潮或出单元钩子改成暗示、误导、遮挡或延迟兑现，不得提前解决禁抢跑内容。',
        severity: risk => countItems(risk?.rushed_ahead) > 0 || countItems(risk?.rushedAhead) > 0 || countItems(risk?.forbidden_touched) > 0 || countItems(risk?.forbiddenTouched) > 0 ? 'high' : 'medium',
      })
    }
    if (review.review_type === 'governance_recheck_sync') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'governance_recheck_sync',
        sourceLabel: '恢复依据复盘',
        category: 'recovery_evidence',
        kind: 'recovery_evidence_mismatch',
        count: risk => countPayloadNumber(
          risk?.missed_count ?? risk?.missedCount,
          countItems(risk?.failed_evidence || risk?.failedEvidence)
            + countItems(risk?.missed || risk?.missed_items || risk?.missedItems),
        ),
        title: (risk, count) => String(risk?.label || `恢复依据缺口 ${count}`),
        message: risk => [
          ...asArray(risk?.failed_evidence || risk?.failedEvidence).map((item: any) => String(item?.text || item?.label || item)),
          ...asArray(risk?.missed || risk?.missed_items || risk?.missedItems).map((item: any) => String(item?.text || item?.label || item)),
          ...asArray(risk?.watch_items || risk?.watchItems).map((item: any) => `观察项：${item?.text || item?.label || item}`),
        ].slice(0, 4).join('；') || '单章交稿没有继承治理复查记忆。',
        action: '按治理复查记忆回修本章，把修后证据、失效依据和观察项写成正文可见的冲突推进、对白执行、读者回报或剧情线动作。',
        severity: () => 'high',
      })
    }
    if (review.review_type === 'readability_review') {
      pushDeliveryRiskAnnotation(review, payload, {
        payloadKey: 'readability_review',
        sourceLabel: '可读性/网感',
        category: 'readability',
        kind: risk => hasWeakOpeningHook(risk)
          ? 'opening_pull_risk'
          : hasWeakEndingHook(risk)
            ? 'ending_page_turn_risk'
            : hasWeakSceneProgression(risk)
              ? 'scene_progression_risk'
              : hasWeakPayoffDensity(risk)
                ? 'payoff_density_risk'
                : 'readability_or_meme_risk',
        count: risk => {
          const immersionCount = countItems(risk?.meme_sense?.immersion_risks) || countItems(risk?.immersion_risks)
          const lowScoreCount = Number(risk?.readability_score || risk?.score || 100) < 78 ? 1 : 0
          return (immersionCount || lowScoreCount)
            + (hasWeakOpeningHook(risk) ? 1 : 0)
            + (hasWeakEndingHook(risk) ? 1 : 0)
            + (hasWeakSceneProgression(risk) ? 1 : 0)
            + (hasWeakPayoffDensity(risk) ? 1 : 0)
        },
        title: (risk, count) => hasWeakOpeningHook(risk)
          ? `开篇吸引力弱 ${openingHookScore(risk)}`
          : hasWeakEndingHook(risk)
            ? `章末翻页弱 ${endingHookScore(risk)}`
            : hasWeakSceneProgression(risk)
              ? `场景推进弱 ${sceneReadabilityScore(risk)}`
              : hasWeakPayoffDensity(risk)
                ? `爽点密度弱 ${payoffDensityScore(risk)}`
                : String(risk?.label || `可读性/网感风险 ${count}`),
        message: risk => hasWeakOpeningHook(risk)
          ? `开篇 300 字吸引力评分 ${openingHookScore(risk)}，需要更快给出异常、危险、欲望或反常信息。`
          : hasWeakEndingHook(risk)
            ? `最后 300 字翻页评分 ${endingHookScore(risk)}，需要把章末问题压成下一章非看不可。`
            : hasWeakSceneProgression(risk)
              ? `场景推进评分 ${sceneReadabilityScore(risk)}，场景目标、阻碍、转折、回报不够清楚。`
              : hasWeakPayoffDensity(risk)
                ? `爽点密度评分 ${payoffDensityScore(risk)}，每 800-1200 字的信息增量或回报不足。`
                : asArray(risk?.meme_sense?.immersion_risks || risk?.immersion_risks || risk?.issues).slice(0, 3).map((item: any) => String(item?.description || item)).join('；') || `可读性评分 ${risk?.readability_score || risk?.score || '-'}`,
        action: risk => hasWeakOpeningHook(risk)
          ? '重写前300字，把钩子、危机、角色反应和信息增量压到开篇现场，避免泛环境和解释性开场。'
          : hasWeakEndingHook(risk)
            ? '重写最后300字，把危险升级、选择压力、反转或未解答案压到最后一幕，避免用总结或说明收尾。'
            : hasWeakSceneProgression(risk)
              ? '补齐场景目标、阻碍、转折、回报，把中段改成可见行动链和选择压力。'
              : hasWeakPayoffDensity(risk)
                ? '补足信息推进、能力展示、危机反制、关系变化或小回收，提高每 800-1200 字的读者回报密度。'
                : '调整段落密度、对话比例、角色口吻和网感强度，避免热梗或说明文字打断沉浸。',
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

const DELIVERY_RISK_ANNOTATION_CATEGORIES = new Set([
  'approval_blocker',
  'delivery_core',
  'reader_expectation',
  'target_reader',
  'genre_positioning',
  'female_audience',
  'upgrade_rhythm',
  'chapter_structure',
  'chapter_progression',
  'information_load',
  'longform_continuity',
  'core_contract',
  'continuity_heat',
  'revision_receipt',
  'deslop_repair',
  'prose_meta',
  'serial_risk_repair',
  'chapter_hook_quality',
  'reader_retention',
  'chapter_attraction',
  'story_drive',
  'character_arc',
  'style_sample',
  'reader_payoff',
  'volume_beat',
  'signature_scene',
  'scene_card_receipt',
  'deslop_repair_receipt',
  'revision_cascade_impact',
  'revision_scope_guard',
  'prose_revision_receipt',
  'quality_audit_repair_receipt',
  'quality_audit',
  'source_readiness',
  'state_tracking',
  'style_boundary',
  'information_flow',
  'expectation_threshold',
  'story_loop',
  'emotional_arc',
  'chapter_hook',
  'paragraph_hook',
  'suspense',
  'asset_linkage',
  'dialogue',
  'plot_dynamics',
  'character_relation',
  'character_behavior',
  'conflict_structure',
  'bridge_unit',
  'reversal',
  'showdown',
  'opening',
  'prose_craft',
  'punctuation_tone',
  'content_rubric',
  'intent_confirmation',
  'benchmark_recall',
  'runway',
  'recovery_evidence',
  'innovation',
  'storyline',
  'story_unit',
  'readability',
])

function deliveryRiskAnnotationPriority(annotation: any) {
  const category = String(annotation?.category || '')
  const order: Record<string, number> = {
    approval_blocker: 0,
    delivery_core: 1,
    content_rubric: 2,
    target_reader: 3,
    genre_positioning: 4,
    female_audience: 5,
    upgrade_rhythm: 6,
    chapter_structure: 7,
    chapter_progression: 8,
    information_load: 9,
    longform_continuity: 10,
    core_contract: 11,
    continuity_heat: 12,
    revision_receipt: 13,
    deslop_repair: 14,
    prose_meta: 15,
    serial_risk_repair: 16,
    chapter_hook_quality: 17,
    runway: 18,
    recovery_evidence: 19,
    story_unit: 20,
    signature_scene: 21,
    scene_card_receipt: 22,
    deslop_repair_receipt: 23,
    revision_cascade_impact: 21,
    revision_scope_guard: 22,
    prose_revision_receipt: 23,
    quality_audit_repair_receipt: 20,
    quality_audit: 21,
    source_readiness: 22,
    state_tracking: 23,
    style_boundary: 24,
    information_flow: 25,
    expectation_threshold: 26,
    story_loop: 27,
    emotional_arc: 28,
    chapter_hook: 29,
    paragraph_hook: 30,
    suspense: 31,
    asset_linkage: 32,
    dialogue: 33,
    plot_dynamics: 34,
    character_relation: 35,
    character_behavior: 36,
    conflict_structure: 37,
    bridge_unit: 38,
    reversal: 39,
    showdown: 40,
    opening: 41,
    prose_craft: 42,
    punctuation_tone: 43,
    intent_confirmation: 44,
    benchmark_recall: 45,
    reader_expectation: 46,
    volume_beat: 47,
    reader_retention: 48,
    chapter_attraction: 49,
    story_drive: 50,
    character_arc: 51,
    style_sample: 52,
    reader_payoff: 53,
    innovation: 54,
    storyline: 44,
    readability: 45,
  }
  return order[category] ?? 99
}

function isResolvedTaskStatus(value: any) {
  return ['resolved', 'done', 'completed', 'success', 'closed'].includes(String(value || '').trim().toLowerCase())
}

function existingReviewAnnotationRepairKeys(runs: any[]) {
  const keys = new Set<string>()
  for (const run of runs || []) {
    if (run?.run_type !== 'longform_production_repair') continue
    const payload = parseJsonLikePayload(run.output_ref) || {}
    const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
    for (const task of tasks) {
      if (task?.source !== 'review_annotation_risk') continue
      if (isResolvedTaskStatus(task?.task_status || task?.status)) continue
      const key = String(task.annotation_key || '').trim()
      if (key) keys.add(key)
    }
  }
  return keys
}

function existingStorylineDiffDecisionTaskKeys(runs: any[]) {
  const keys = new Set<string>()
  for (const run of runs || []) {
    if (run?.run_type !== 'longform_production_repair') continue
    const payload = parseJsonLikePayload(run.output_ref) || {}
    const tasks = Array.isArray(payload.tasks) ? payload.tasks : []
    for (const task of tasks) {
      if (task?.source !== 'storyline_diff_decision') continue
      if (isResolvedTaskStatus(task?.task_status || task?.status)) continue
      const key = String(task.decision_key || '').trim()
      if (key) keys.add(key)
    }
  }
  return keys
}

function annotationTaskTitle(annotation: any) {
  const chapterNo = Number(annotation.chapter_no || 0)
  const prefix = chapterNo > 0 ? `第${chapterNo}章` : '章节'
  return `${prefix}《${annotation.title || annotation.source_label || '交稿风险'}》修复`
}

export function buildReviewAnnotationRepairTasks(annotations: any[], runs: any[] = [], options: any = {}) {
  const existingKeys = existingReviewAnnotationRepairKeys(runs)
  const tasks: any[] = []
  let skippedExisting = 0
  let skippedResolved = 0
  const limit = Math.max(1, Math.min(120, Number(options.limit || 60)))

  for (const annotation of annotations || []) {
    if (!DELIVERY_RISK_ANNOTATION_CATEGORIES.has(String(annotation?.category || ''))) continue
    if (annotation.status === 'resolved') {
      skippedResolved += 1
      continue
    }
    const annotationKey = String(annotation.key || '').trim()
    if (annotationKey && existingKeys.has(annotationKey)) {
      skippedExisting += 1
      continue
    }
    const isApprovalBlocker = String(annotation.category || '') === 'approval_blocker'
    const isSceneCardReceipt = String(annotation.category || '') === 'scene_card_receipt'
    const isDeslopRepairReceipt = String(annotation.category || '') === 'deslop_repair_receipt'
    const isRevisionCascadeImpact = String(annotation.category || '') === 'revision_cascade_impact'
    const isRevisionScopeGuard = String(annotation.category || '') === 'revision_scope_guard'
    const isProseRevisionReceipt = String(annotation.category || '') === 'prose_revision_receipt'
    const isQualityAuditRepairReceipt = String(annotation.category || '') === 'quality_audit_repair_receipt'
    const isQualityAudit = String(annotation.category || '') === 'quality_audit'
    const isSourceReadiness = String(annotation.category || '') === 'source_readiness'
    const isStateTracking = String(annotation.category || '') === 'state_tracking'
    const isStyleBoundary = String(annotation.category || '') === 'style_boundary'
    const isInformationFlow = String(annotation.category || '') === 'information_flow'
    const isExpectationThreshold = String(annotation.category || '') === 'expectation_threshold'
    const isStoryLoop = String(annotation.category || '') === 'story_loop'
    const isEmotionalArc = String(annotation.category || '') === 'emotional_arc'
    const isChapterHook = String(annotation.category || '') === 'chapter_hook'
    const isParagraphHook = String(annotation.category || '') === 'paragraph_hook'
    const isSuspense = String(annotation.category || '') === 'suspense'
    const isAssetLinkage = String(annotation.category || '') === 'asset_linkage'
    const isDialogue = String(annotation.category || '') === 'dialogue'
    const isPlotDynamics = String(annotation.category || '') === 'plot_dynamics'
    const isCharacterRelation = String(annotation.category || '') === 'character_relation'
    const isCharacterBehavior = String(annotation.category || '') === 'character_behavior'
    const isConflictStructure = String(annotation.category || '') === 'conflict_structure'
    const isBridgeUnit = String(annotation.category || '') === 'bridge_unit'
    const isReversal = String(annotation.category || '') === 'reversal'
    const isShowdown = String(annotation.category || '') === 'showdown'
    const isOpening = String(annotation.category || '') === 'opening'
    const isProseCraft = String(annotation.category || '') === 'prose_craft'
    const isPunctuationTone = String(annotation.category || '') === 'punctuation_tone'
    const isContentRubric = String(annotation.category || '') === 'content_rubric'
    const isTargetReader = String(annotation.category || '') === 'target_reader'
    const isGenrePositioning = String(annotation.category || '') === 'genre_positioning'
    const isFemaleAudience = String(annotation.category || '') === 'female_audience'
    const isUpgradeRhythm = String(annotation.category || '') === 'upgrade_rhythm'
    const isChapterStructure = String(annotation.category || '') === 'chapter_structure'
    const isChapterProgression = String(annotation.category || '') === 'chapter_progression'
    const isInformationLoad = String(annotation.category || '') === 'information_load'
    const isLongformContinuity = String(annotation.category || '') === 'longform_continuity'
    const isCoreContract = String(annotation.category || '') === 'core_contract'
    const isContinuityHeat = String(annotation.category || '') === 'continuity_heat'
    const isRevisionReceipt = String(annotation.category || '') === 'revision_receipt'
    const isDeslopRepair = String(annotation.category || '') === 'deslop_repair'
    const isProseMeta = String(annotation.category || '') === 'prose_meta'
    const isSerialRiskRepair = String(annotation.category || '') === 'serial_risk_repair'
    const isChapterHookQuality = String(annotation.category || '') === 'chapter_hook_quality'
    const isReaderRetentionCheck = String(annotation.category || '') === 'reader_retention'
      && String(annotation.kind || '') === 'reader_retention_gap'
    const isIntentConfirmation = String(annotation.category || '') === 'intent_confirmation'
    const isBenchmarkRecall = String(annotation.category || '') === 'benchmark_recall'
    tasks.push({
      task_type: 'repair_quality',
      issue_type: String(annotation.kind || annotation.source || 'delivery_risk'),
      severity: annotation.severity || 'medium',
      chapter_id: annotation.chapter_id || null,
      chapter_no: Number(annotation.chapter_no || 0) || null,
      title: annotationTaskTitle(annotation),
      message: annotation.message || annotation.title || '交稿风险需要处理。',
      action: annotation.action || '按交稿风险批注修订正文，补回核心、追读、回报、创新、剧情线或可读性缺口。',
      acceptance_criteria: [
        ...(isApprovalBlocker ? ['入库阻断已经解除，章节可重新进入验收或入库'] : []),
        ...(isSceneCardReceipt ? [
          '场景回执复检清零，scene_card_receipt 相关质量检查不再失败',
          '对应场景的 scene_start_anchor、scene_end_anchor 和 scene_card_receipts 已按修订后正文重写',
          'scene_card_receipts.evidence 可在对应场景正文定位，且不得借用其他场景证据',
        ] : []),
        ...(isDeslopRepairReceipt ? [
          'deslop_repair_receipt_sync 复检通过，missed_count=0',
          'deslop_repair_receipts 逐条对应 deslop_checks 或 story-deslop Gate A-G 原 fail/warn 项',
          'deslop_repair_receipts.changed_evidence 能在修订后正文定位',
        ] : []),
        ...(isRevisionCascadeImpact ? [
          'revision_cascade_impact_sync 复检通过，missed_count=0',
          '后续章节已同步修订后的伏笔、时间线、角色状态、资产归属或关系边界',
          'revision_receipts.cascade_impacts 的 evidence/source_excerpt 能定位到修订后正文证据',
        ] : []),
        ...(isRevisionScopeGuard ? [
          'revision_scope_guard_sync 复检通过，missed_count=0',
          '修订前后字数差异回到 max(原文 30%, 800 字) 警戒线内',
          '没有为了润色大幅删掉伏笔、钩子、角色特征、情节推进或必要转折',
        ] : []),
        ...(isProseRevisionReceipt ? [
          'prose_revision_receipt_sync 复检通过，missed_count=0',
          'revision_receipts 逐条对应 delivery_risk_receipts 的失败项',
          '每条 revision_receipts 都写清 required_action、repair_segment、applied_fix 和 changed_evidence',
        ] : []),
        ...(isQualityAuditRepairReceipt ? [
          'quality_audit_repair_receipt_sync 复检通过，missed_count=0',
          'quality_audit_repair_receipts 逐条对应 quality_audit_checks 中原 fail/warn 项',
          'quality_audit_repair_receipts.changed_evidence 能在修订后正文定位',
        ] : []),
        ...(isQualityAudit ? [
          'quality_audit_checks 里的 fail/warn 项已清零',
          '修订说明中写明本章一句话概括、目的词详略、水文压缩、信息流或五维低分项的处理证据',
          '若策略为 rewrite/compress/de_ai/polish，修订稿已按对应策略完成且没有引入新设定漂移',
        ] : []),
        ...(isSourceReadiness ? [
          'source_readiness_checks 复检通过，missed_count=0',
          '角色状态、相关伏笔/前史、世界约束和资产状态已经在正文中可见承接',
          'missing/warn 来源没有被写成既定事实，ready 来源有明确动作、对白、信息变化或状态回填证据',
        ] : []),
        ...(isStateTracking ? [
          'state_tracking_checks 复检通过，missed_count=0',
          '角色状态、伏笔状态、资产归属、关系边界和世界规则已经与正文事实一致',
          '昏迷、失效、未获得、未揭示或受限状态没有被直接写成可用结果',
        ] : []),
        ...(isStyleBoundary ? [
          'style_boundary_checks 复检通过，missed_count=0',
          '过近的参照句式、桥段节奏、套话和模板化表达已经改写为本章动作链和角色口吻',
          '没有复制标杆原句、专有设定、角色名、核心梗或可识别桥段',
        ] : []),
        ...(isInformationFlow ? [
          'information_flow_checks 复检通过，missed_count=0',
          '线索、解释、误判、反转和信息揭示顺序已经跟冲突、动作、选择和代价同步释放',
          '没有提前泄底、补丁式旁白、上下文过载或把关键信息脱离场景冲突单独说明',
        ] : []),
        ...(isExpectationThreshold ? [
          'expectation_threshold_checks 复检通过，missed_count=0',
          '章末已经形成读者必须继续阅读的具体问题、悬念、代价、选择压力或回报承诺',
          '期待不是只靠氛围、旁白或口号维持，而是落到可见事件和下一章追问',
        ] : []),
        ...(isStoryLoop ? [
          'story_loop_checks 复检通过，missed_count=0',
          '本章设问、阻碍、选择、代价、回报和新问题形成可追踪闭环',
          '至少推进一个答案碎片或状态变化，并把残留问题自然挂到下一章',
        ] : []),
        ...(isEmotionalArc ? [
          'emotional_arc_checks 复检通过，missed_count=0',
          '平静、调动、释放、爽感形成可追踪递进，压迫和反制都落到正文现场',
          '关键情绪变化通过动作、对白、旁观反馈、关系反馈或状态变化外化，而不是只靠解释规则或心理总结',
        ] : []),
        ...(isChapterHook ? [
          'chapter_hook_checks 复检通过，missed_count=0',
          '前100字章首钩子和最后约100字章尾翻页钩子都已形成具体问题、压力或行动牵引',
          '钩子有明确兑现路径，没有假悬念、机械降神、低风险钩、过度留白或同类型连用',
        ] : []),
        ...(isParagraphHook ? [
          'paragraph_hook_checks 复检通过，missed_count=0',
          '每3-5段都有信息、风险、情绪或关系变化，关键冲突段落有可指认的微钩子',
          '段落级钩子包含钩子组合、对话情绪递进或围观者层级，不再连续停留在环境、姿态或静态说明',
        ] : []),
        ...(isSuspense ? [
          'suspense_checks 复检通过，missed_count=0',
          '疑问、误导、答案、新期待形成悬念循环',
          '悬念推进落到正文可见信息变化、误判修正、局部答案或新压力，避免假悬念、谜语人拖延和信息延迟过久',
        ] : []),
        ...(isAssetLinkage ? [
          'asset_linkage_checks 复检通过，missed_count=0',
          '关键资产已经绑定功能、归属、触发条件、限制、后果和状态变化',
          '每个资产至少接到本章目标、冲突、回报或章尾钩子之一，设定信息通过使用、质疑、触发、误判或代价反馈释放',
        ] : []),
        ...(isDialogue ? [
          'dialogue_checks 复检通过，missed_count=0',
          '每句对白至少承担推进剧情、增加期待或展示人设之一',
          '潜台词、议程、声线差异、权力博弈、信息嵌入和情绪递进已经落成正文可定位对白或动作反应',
        ] : []),
        ...(isPlotDynamics ? [
          'plot_dynamics_checks 复检通过，missed_count=0',
          '目标、阻碍、行动、代价/反馈、新期待形成可追踪最小剧情循环',
          '假胜、崩解、A/B情绪交替、多线错峰或悬置收尾等原缺口已落成正文可见行动链和状态变化',
        ] : []),
        ...(isCharacterRelation ? [
          'character_relation_checks 复检通过，missed_count=0',
          '关系类型、关系考验/变化、主角独立目标、目标归属、角色不止恋爱和配角主动行动已落成正文证据',
          '主角保留自己的诉求、主动选择和代价，关系线与主角目标形成摩擦、互补或阶段性变化',
        ] : []),
        ...(isCharacterBehavior ? [
          'character_behavior_checks 复检通过，missed_count=0',
          '动机链、动机具体性、主角行为三必须、三层标签反差、人设强关联和展示证据已落成正文',
          '配角功能、反派内在逻辑、反派分量、自我叙事或层级退场等原缺口已补成可定位行动、选择、威胁或代价',
        ] : []),
        ...(isConflictStructure ? [
          'conflict_structure_checks 复检通过，missed_count=0',
          '阻止者、有进无出、退出代价/死亡赌注、黏结剂、行动阻拦和明确胜负结果已落成正文',
          '矛盾网保持2-3条互相关联的矛盾线，解决一条后已激活或加深另一条，并留下下一冲突种子',
        ] : []),
        ...(isBridgeUnit ? [
          'bridge_unit_checks 复检通过，missed_count=0',
          '本章四章一桥段位置、连续期待、目标推进、高潮时长和阶段衔接已经落成正文',
          '兑现旧期待前先挂新期待；章尾有新目标、高潮中埋钩子或连续小期待，疲劳修复不再断档',
        ] : []),
        ...(isReversal ? [
          'reversal_checks 复检通过，missed_count=0',
          '反转类型、至少3处公平暗示、误导技巧、揭示时机和非作弊性已经落成正文',
          '揭示后影响、情绪冲击和打脸节奏可定位，且没有天降反转、作弊新信息或大段解释独白',
        ] : []),
        ...(isShowdown ? [
          'showdown_checks 复检通过，missed_count=0',
          '爽点释放、底牌管理、三压一爆三震、舞台层级、传递通道和震惊分层已经落成正文',
          '战斗/智斗服务爽点，以弱胜强逻辑、三层破局和急-缓-急情绪节奏可定位',
        ] : []),
        ...(isOpening ? [
          'opening_checks 复检通过，missed_count=0',
          '300字内主角登场，1000字内出现爽点、危机或明确期待点',
          '开头五要诀（简单、不偏、快、爽、不平）已落成正文，且删除大段背景、纯天气风景、序章楔子和详细世界观',
        ] : []),
        ...(isProseCraft ? [
          'prose_craft_checks 复检通过，missed_count=0',
          '深度限知、身体细节、环境交互、镜头对象、一动一静和道具/数字功能已落成正文',
          '删除上帝视角、全场/所有人远景概括、连续内心独白、堆叠式描写、抽象心理总结和胶水词过渡',
        ] : []),
        ...(isPunctuationTone ? [
          'punctuation_tone_checks 复检通过，missed_count=0',
          '标点服务质问、试探、爆发、迟疑、信息揭示和人物声线，不再通篇句号化或随机堆砌',
          '删除省略号/破折号硬停顿、论文式长分号链和同质化语气，用动作打断、换行、短句或冒号落点承接',
        ] : []),
        ...(isContentRubric ? [
          'content_rubric_checks 复检通过，missed_count=0',
          '正文已经回答黄金三问：读者为什么翻下一页、本章改变了什么、哪个正文证据支持判断',
          '核心卖点、冲突推进、情绪曲线、角色动机、最小剧情循环、高潮构建和章末期待已落成可定位正文证据',
        ] : []),
        ...(isTargetReader ? [
          'target_reader_checks 复检通过，missed_count=0',
          '目标读者画像、读者渴望、平台口味、本章命中点和可见读者回报已经落成正文证据',
          '核心痛苦、深层情结、高频情绪关键词和未满足需求已经写成冲突压力、角色选择、即时反馈或尊严/安全感/掌控感补偿',
          '修订稿通过 oh-story 自嗨判定法：写给谁看、读者想看什么、本章给了什么，三问都有正文证据',
        ] : []),
        ...(isGenrePositioning ? [
          'genre_positioning_checks 复检通过，missed_count=0',
          '题材标签、核心梗、类型公式、金手指贴合、必备场景和平台适配已经落成正文证据',
          '题材长板被强化而不是补短板稀释核心卖点，同一卖点至少扩成 3 个角度的正文证据',
          '书名简介正文三位一体：正文兑现书名/简介承诺，没有挂羊头卖狗肉或微创新过量',
        ] : []),
        ...(isFemaleAudience ? [
          'female_audience_checks 复检通过，missed_count=0',
          '安全感、代入感、女主主动性、主情绪和平台对位已经落成正文证据',
          '女主自己做决定、自己推进，并在关键节点承担代价或获得被认可、被珍视、被尊重的回馈',
          '感情线双轴踩在事业/成长节点上，虐后有反转或糖，货板与书名简介正文保持一致',
        ] : []),
        ...(isUpgradeRhythm ? [
          'upgrade_rhythm_checks 复检通过，missed_count=0',
          '升级前压制、升级后变化、即时反馈、延迟反馈和新门槛已经落成正文可定位证据',
          '金手指功能、触发条件、奖励、限制和升级规则足够简单，读者能从动作反馈中一眼看懂',
          '升级不是只给奖励，而是同时带来资格变化、能力边界、多维成长或排行榜/层级压力',
        ] : []),
        ...(isChapterStructure ? [
          'structure_checks 复检通过，missed_count=0',
          '开头钩子、中段推进、局势变化和章尾翻页已经落成正文可定位证据',
          '结尾落到新的发现、危机、选择或反转，而不是复述、解释或总结',
        ] : []),
        ...(isChapterProgression ? [
          'progression_checks 复检通过，missed_count=0',
          '修订稿能证明删掉这章会影响理解，至少留下证据、选择、代价、关系变化、设定位移或主线位移之一',
          '等待、旧设定复述、原地解释和不改变局势的段落已经压缩或改造成行动推进',
        ] : []),
        ...(isInformationLoad ? [
          'information_checks 复检通过，missed_count=0',
          '新概念压缩到 3 个以内，设定信息通过行动、质疑、触发、证据核对或冲突反馈释放',
          '没有在行动前大段解释规则，信息传递跟着冲突和角色目标走',
        ] : []),
        ...(isLongformContinuity ? [
          'longform_checks 复检通过，missed_count=0',
          '最近 5 章进展、爽点间隔、阶段目标和下一阶段牵引已经在正文或修订说明中可定位',
          '本章承接前文状态并推动后续，不再连续多章只解释背景或原地等待',
        ] : []),
        ...(isCoreContract ? [
          'core_contract_checks 复检通过，missed_count=0',
          '全书核心承诺、主线服务、不得漂移红线和主题统一已经落成正文可定位证据',
          '小情绪服从全书核心情绪，章尾问题回到主线推进、规则判定、角色选择或读者承诺',
        ] : []),
        ...(isContinuityHeat ? [
          'continuity_heat_checks 复检通过，missed_count=0',
          'hot 元素推进、warm 元素保温、cold 回收前升温、archived 休眠边界已经落成正文证据',
          '伏笔、关系和期待不再只点名不推进，也没有用未升温的冷线突然解题',
        ] : []),
        ...(isRevisionReceipt ? [
          'revision_receipt_checks 复检通过，missed_count=0',
          'revision_receipts 逐条对应 delivery_risk_receipts、prose revision 要求或本次修订风险',
          '每条 revision_receipts 都包含 required_action、repair_segment、applied_fix 和可定位的 changed_evidence',
        ] : []),
        ...(isDeslopRepair ? [
          'deslop_repair_checks 复检通过，missed_count=0',
          'story-deslop Gate A-G 原 fail/warn 残留已经逐条回修',
          'deslop_repair_receipts.changed_evidence 能在修订后正文中定位到对白、动作、描写或叙述变化',
        ] : []),
        ...(isProseMeta ? [
          'prose_meta_checks 复检通过，missed_count=0',
          '正文中的作者说明、创作术语、章节意图旁白和元叙事提示已经删除',
          '原本的铺垫、伏笔或反转说明已经改成角色现场证据、误判、行动后果或信息变化',
        ] : []),
        ...(isSerialRiskRepair ? [
          'serial_risk_repair_checks 复检通过，missed_count=0',
          'scene_serial_risk_repair_receipt 或连续生产风险修复回执已经补齐',
          '场景承接变化、状态变化或风险解除证据能在修订后正文定位',
        ] : []),
        ...(isChapterHookQuality ? [
          'chapter_hook_quality_checks 复检通过，missed_count=0',
          '章首和章尾都已经形成现场触发的具体问题、压力、选择或行动牵引',
          '章尾钩子和下一章行动直接相连，没有只用总结、氛围或空泛预告收束',
        ] : []),
        ...(isReaderRetentionCheck ? [
          'reader_retention_checks 复检通过，missed_count=0',
          '前300字钩子、可见爽点、信息缺口和章末追读已经落成正文可定位证据',
          '留存双引擎的情绪 + 饥饿同时落地：情绪快速代入，饥饿用信息差植入问号并剥洋葱卡住关键信息',
          'Hook上瘾模型的触发、行动、奖励、投入已经形成闭环，奖励随机性和沉没投入有正文证据',
        ] : []),
        ...(isIntentConfirmation ? [
          'intent_confirmation_checks 或写前执行回执复检通过，missed_count=0',
          '情绪目标、章节意图、关键承接和章尾推动力已落成正文可见事件或状态变化',
          'oh_story_delivery_receipts.delivery_risk_receipts 或 pre_draft_execution_receipts 引用修订后正文证据',
        ] : []),
        ...(isBenchmarkRecall ? [
          'benchmark_recall_checks 或文风召回回执复检通过，missed_count=0',
          '对标模块、节奏参照、对白比例、动作链和情绪转折已在正文中兑现',
          '没有复制参照文本原句、桥段、专有设定、角色名或核心梗',
        ] : []),
        '修订后重新运行章节质量复检，质量分不低于78',
        '重新同步故事状态，确认核心、追读、回报、创新、剧情线和可读性风险没有新增',
        '交稿风险批注标记为已处理，或风险收敛复盘显示该风险清零',
      ],
      task_status: 'open',
      source: 'review_annotation_risk',
      annotation_key: annotationKey,
      annotation_source: annotation.source,
      annotation_category: annotation.category,
      source_label: annotation.source_label,
      review_id: annotation.review_id || null,
      created_from_annotation_at: annotation.created_at || '',
      payload: annotation.payload || {},
      ...(isSourceReadiness ? { source_readiness_sync: annotation.payload || {} } : {}),
      ...(isStateTracking ? { state_tracking_sync: annotation.payload || {} } : {}),
      ...(isStyleBoundary ? { style_boundary_sync: annotation.payload || {} } : {}),
      ...(isInformationFlow ? { information_flow_sync: annotation.payload || {} } : {}),
      ...(isExpectationThreshold ? { expectation_threshold_sync: annotation.payload || {} } : {}),
      ...(isStoryLoop ? { story_loop_sync: annotation.payload || {} } : {}),
      ...(isEmotionalArc ? { emotional_arc_sync: annotation.payload || {} } : {}),
      ...(isChapterHook ? { chapter_hook_sync: annotation.payload || {} } : {}),
      ...(isParagraphHook ? { paragraph_hook_sync: annotation.payload || {} } : {}),
      ...(isSuspense ? { suspense_sync: annotation.payload || {} } : {}),
      ...(isAssetLinkage ? { asset_linkage_sync: annotation.payload || {} } : {}),
      ...(isDialogue ? { dialogue_sync: annotation.payload || {} } : {}),
      ...(isPlotDynamics ? { plot_dynamics_sync: annotation.payload || {} } : {}),
      ...(isCharacterRelation ? { character_relation_sync: annotation.payload || {} } : {}),
      ...(isCharacterBehavior ? { character_behavior_sync: annotation.payload || {} } : {}),
      ...(isConflictStructure ? { conflict_structure_sync: annotation.payload || {} } : {}),
      ...(isBridgeUnit ? { bridge_unit_sync: annotation.payload || {} } : {}),
      ...(isReversal ? { reversal_sync: annotation.payload || {} } : {}),
      ...(isShowdown ? { showdown_sync: annotation.payload || {} } : {}),
      ...(isOpening ? { opening_sync: annotation.payload || {} } : {}),
      ...(isProseCraft ? { prose_craft_sync: annotation.payload || {} } : {}),
      ...(isPunctuationTone ? { punctuation_tone_sync: annotation.payload || {} } : {}),
      ...(isContentRubric ? { content_rubric_sync: annotation.payload || {} } : {}),
      ...(isTargetReader ? { target_reader_sync: annotation.payload || {} } : {}),
      ...(isGenrePositioning ? { genre_positioning_sync: annotation.payload || {} } : {}),
      ...(isFemaleAudience ? { female_audience_sync: annotation.payload || {} } : {}),
      ...(isUpgradeRhythm ? { upgrade_rhythm_sync: annotation.payload || {} } : {}),
      ...(isChapterStructure ? { chapter_structure_sync: annotation.payload || {} } : {}),
      ...(isChapterProgression ? { chapter_progression_sync: annotation.payload || {} } : {}),
      ...(isInformationLoad ? { information_load_sync: annotation.payload || {} } : {}),
      ...(isLongformContinuity ? { longform_continuity_sync: annotation.payload || {} } : {}),
      ...(isCoreContract ? { core_contract_check_sync: annotation.payload || {} } : {}),
      ...(isContinuityHeat ? { continuity_heat_sync: annotation.payload || {} } : {}),
      ...(isRevisionReceipt ? { revision_receipt_check_sync: annotation.payload || {} } : {}),
      ...(isDeslopRepair ? { deslop_repair_check_sync: annotation.payload || {} } : {}),
      ...(isProseMeta ? { prose_meta_sync: annotation.payload || {} } : {}),
      ...(isSerialRiskRepair ? { serial_risk_repair_sync: annotation.payload || {} } : {}),
      ...(isChapterHookQuality ? { chapter_hook_quality_sync: annotation.payload || {} } : {}),
      ...(isReaderRetentionCheck ? { reader_retention_check_sync: annotation.payload || {} } : {}),
      ...(isIntentConfirmation ? { intent_confirmation_sync: annotation.payload || {} } : {}),
      ...(isBenchmarkRecall ? { benchmark_recall_sync: annotation.payload || {} } : {}),
      ...(String(annotation.kind || annotation.source || '') === 'recovery_evidence_mismatch'
        ? { recovery_evidence_review: annotation.payload || {} }
        : {}),
    })
  }

  tasks.sort((a, b) => deliveryRiskAnnotationPriority({ category: a.annotation_category }) - deliveryRiskAnnotationPriority({ category: b.annotation_category })
    || String(b.created_from_annotation_at || '').localeCompare(String(a.created_from_annotation_at || '')))

  return {
    tasks: tasks.slice(0, limit),
    total_candidates: tasks.length,
    skipped_existing: skippedExisting,
    skipped_resolved: skippedResolved,
  }
}

export function buildStorylineDiffDecisionRepairTasks(reviews: any[], runs: any[] = [], options: any = {}) {
  const existingKeys = existingStorylineDiffDecisionTaskKeys(runs)
  const tasks: any[] = []
  let skippedExisting = 0
  let skippedIgnored = 0
  const limit = Math.max(1, Math.min(120, Number(options.limit || 60)))

  for (const review of reviews || []) {
    if (review?.review_type !== 'storyline_diff_decision') continue
    const payload = parseJsonLikePayload(review.payload) || {}
    const decision = String(payload.decision || '').trim()
    const decisionKey = String(payload.decision_key || '').trim()
    if (!decisionKey) continue
    if (decision === 'false_positive') {
      skippedIgnored += 1
      continue
    }
    if (!['revise_prose', 'accept_as_plan'].includes(decision)) continue
    if (existingKeys.has(decisionKey)) {
      skippedExisting += 1
      continue
    }
    const chapterNo = Number(payload.chapter_no || 0) || null
    const entityName = compactAuditText(payload.entity_name || '未命名剧情线', 120)
    const summary = compactAuditText(payload.summary || review.summary || '剧情线差异需要处理。', 500)
    const isPlanSync = decision === 'accept_as_plan'
    tasks.push({
      task_type: isPlanSync ? 'repair_assets' : 'repair_quality',
      issue_type: isPlanSync ? 'storyline_diff_accept_as_plan' : 'storyline_diff_revise_prose',
      severity: isPlanSync ? 'medium' : 'high',
      chapter_id: Number(payload.chapter_id || 0) || null,
      chapter_no: chapterNo,
      title: `${chapterNo ? `第${chapterNo}章` : '章节'}《${entityName}》${isPlanSync ? '同步计划' : '回修正文'}`,
      message: summary,
      action: isPlanSync
        ? `接受为新计划：打开资料设定，把“${entityName}”的额外推进写入剧情线计划，并调整后续章节承接。`
        : `回修正文：按已记录决策修订第${chapterNo || '-'}章，把“${entityName}”的计划推进写成可见行动、状态变化或结果回收。`,
      acceptance_criteria: isPlanSync
        ? [
          '资料设定或大纲已纳入这次额外推进，并明确后续承接章节',
          '重新运行剧情线同步复盘，确认该推进不再作为计划外风险出现',
          '确认新计划不破坏全书核心承诺、禁揭边界和当前卷爆点节奏',
        ]
        : [
          '修订后重新运行章节质量复检，质量分不低于78',
          '修订后重新运行剧情线同步复盘，确认漏推或禁揭风险清零',
          '重新同步故事状态，确认主线、伏笔和禁揭边界没有新增偏移',
        ],
      task_status: 'open',
      source: 'storyline_diff_decision',
      decision_key: decisionKey,
      decision,
      decision_label: payload.decision_label || (isPlanSync ? '接受为新计划' : '回修正文'),
      entity_id: Number(payload.entity_id || 0) || null,
      entity_name: entityName,
      entity_type: compactAuditText(payload.entity_type, 80),
      risk_type: compactAuditText(payload.risk_type, 80),
      risk_label: compactAuditText(payload.risk_label, 80),
      review_id: review.id || null,
      created_from_decision_at: review.created_at || payload.decided_at || '',
      payload,
    })
  }

  tasks.sort((a, b) => (a.decision === 'revise_prose' ? 0 : 1) - (b.decision === 'revise_prose' ? 0 : 1)
    || Number(a.chapter_no || 999999) - Number(b.chapter_no || 999999)
    || String(b.created_from_decision_at || '').localeCompare(String(a.created_from_decision_at || '')))

  return {
    tasks: tasks.slice(0, limit),
    total_candidates: tasks.length + skippedExisting,
    skipped_existing: skippedExisting,
    skipped_ignored: skippedIgnored,
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

  app.post('/api/novel/projects/:id/review-annotations/repair-queue', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, reviews, runs] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      const annotationPayload = buildReviewAnnotations(project, chapters, reviews)
      const taskPayload = buildReviewAnnotationRepairTasks(annotationPayload.annotations, runs, { limit: req.body?.limit })
      const tasks = taskPayload.tasks
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'longform_production_repair',
        step_name: `review-annotation-risk-repair-${tasks.length}`,
        status: tasks.length ? 'ready' : 'success',
        input_ref: JSON.stringify({
          source: 'review_annotation_risk',
          annotations_generated_at: annotationPayload.generated_at,
          open_annotations: annotationPayload.summary.open,
          high_annotations: annotationPayload.summary.high,
          skipped_existing: taskPayload.skipped_existing,
        }),
        output_ref: JSON.stringify({
          report: {
            source: 'review_annotation_risk',
            summary: tasks.length
              ? `从章节审阅批注生成 ${tasks.length} 项交稿风险修复任务。`
              : '当前没有新的交稿风险修复任务需要生成。',
            status: tasks.length ? 'needs_repair' : 'clean',
            task_count: tasks.length,
            skipped_existing: taskPayload.skipped_existing,
            skipped_resolved: taskPayload.skipped_resolved,
          },
          recommendations: [
            '优先处理核心偏移、剧情线禁揭、追读漏项和回报欠账，再恢复安全连写。',
            '每个任务处理后重新复检、同步故事状态，并确认交稿风险收敛。',
          ],
          tasks,
        }),
      })
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'longform_production_repair',
        status: tasks.length ? 'warn' : 'ok',
        summary: `交稿风险修复任务：${tasks.length} 项`,
        issues: tasks.slice(0, 30).map((task: any) => task.chapter_no ? `第${task.chapter_no}章 ${task.message}` : task.message),
        payload: JSON.stringify({ run_id: run.id, source: 'review_annotation_risk', tasks, skipped_existing: taskPayload.skipped_existing }),
      })
      res.json({ ok: true, run, review, ...taskPayload })
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

  app.post('/api/novel/projects/:id/storyline-diff-decisions', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      let reviewPayload: ReturnType<typeof buildStorylineDiffDecisionReviewPayload>
      try {
        reviewPayload = buildStorylineDiffDecisionReviewPayload(req.body || {})
      } catch (error: any) {
        return res.status(400).json({ error: String(error?.message || error) })
      }
      const saved = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        ...reviewPayload,
      })
      res.json({ ok: true, decision: saved })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/storyline-diff-decisions/repair-queue', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [reviews, runs] = await Promise.all([
        listNovelReviews(activeWorkspace, project.id),
        listNovelRuns(activeWorkspace, project.id),
      ])
      const taskPayload = buildStorylineDiffDecisionRepairTasks(reviews, runs, { limit: req.body?.limit })
      const tasks = taskPayload.tasks
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'longform_production_repair',
        step_name: `storyline-diff-decision-${tasks.length}`,
        status: tasks.length ? 'ready' : 'success',
        input_ref: JSON.stringify({
          source: 'storyline_diff_decision',
          total_candidates: taskPayload.total_candidates,
          skipped_existing: taskPayload.skipped_existing,
          skipped_ignored: taskPayload.skipped_ignored,
        }),
        output_ref: JSON.stringify({
          report: {
            source: 'storyline_diff_decision',
            summary: tasks.length
              ? `从剧情线差异决策生成 ${tasks.length} 项修复或计划同步任务。`
              : '当前没有新的剧情线差异决策任务需要生成。',
            status: tasks.length ? 'needs_repair' : 'clean',
            task_count: tasks.length,
            skipped_existing: taskPayload.skipped_existing,
            skipped_ignored: taskPayload.skipped_ignored,
          },
          recommendations: [
            '先处理回修正文任务，确认计划内剧情线在正文中兑现，再处理计划同步候选。',
            '接受为新计划前必须确认不破坏全书核心承诺、当前卷爆点和禁揭边界。',
          ],
          tasks,
        }),
      })
      const review = await createNovelReview(activeWorkspace, {
        project_id: project.id,
        review_type: 'longform_production_repair',
        status: tasks.length ? 'warn' : 'ok',
        summary: `剧情线决策任务：${tasks.length} 项`,
        issues: tasks.slice(0, 30).map((task: any) => task.chapter_no ? `第${task.chapter_no}章 ${task.message}` : task.message),
        payload: JSON.stringify({ run_id: run.id, source: 'storyline_diff_decision', tasks, skipped_existing: taskPayload.skipped_existing, skipped_ignored: taskPayload.skipped_ignored }),
      })
      res.json({ ok: true, run, review, ...taskPayload })
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
        payload: JSON.stringify({ chapter_id: chapter.id, report, context_package: contextPackage, delivery_risk_brief: deliveryRiskBrief }),
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
      const revisionMode = String(req.body.revision_mode || 'from_report')
      const deliveryRiskBrief = buildChapterDeliveryRiskBrief(chapter, reviews)
      const prompt = buildEditorRevisionPrompt({
        project,
        chapter,
        report,
        deliveryRiskBrief,
        revisionMode,
        userPrompt: req.body.prompt,
      })
      const modelId = ctx.getStageModelId(project, 'revise', Number(req.body.model_id || 0) || undefined)
      let result = await executeNovelAgent('prose-agent', project, { task: prompt }, {
        activeWorkspace,
        modelId: modelId ? String(modelId) : undefined,
        maxTokens: REVISION_MAX_TOKENS,
        temperature: ctx.getStageTemperature(project, 'revise', 0.62),
        responseMode: 'stream',
        skipMemory: true,
      })
      if ((result as any).error) return res.status(502).json({ error: (result as any).error, result })
      let resultPayload = getNovelPayload(result)
      let patchResult = applySurgicalRevisionPatch(String(chapter.chapter_text || ''), resultPayload)
      let nextText = patchResult.chapterText
      if (!nextText || (!patchResult.applied.length && !resultPayload?.chapter_text && !resultPayload?.prose_chapters?.[0]?.chapter_text)) {
        if (shouldRetryRevisionPatch(resultPayload, patchResult, result)) {
          const retryReason = isRevisionOutputTruncated(result) ? 'initial_output_truncated' : 'initial_patch_not_applicable'
          const retryPrompt = buildCompactEditorRevisionPrompt({
            project,
            chapter,
            report,
            deliveryRiskBrief,
            revisionMode,
            userPrompt: req.body.prompt,
            previousOutputPreview: extractLLMText(result),
          })
          const retryResult = await executeNovelAgent('prose-agent', project, { task: retryPrompt }, {
            activeWorkspace,
            modelId: modelId ? String(modelId) : undefined,
            maxTokens: COMPACT_REVISION_RETRY_MAX_TOKENS,
            temperature: 0.15,
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
          return res.status(502).json({
            error: '修订输出被截断，未形成完整 JSON 补丁',
            error_code: 'REVISION_OUTPUT_TRUNCATED',
            result,
            llm_diagnostics: buildLLMResultDiagnostics(result),
            patch_result: patchResult,
          })
        }
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
          requested_revision_mode: revisionMode,
          revision_summary: resultPayload?.revision_summary || '',
          revision_mode: resultPayload?.revision_mode || 'patch',
          applied_patches: patchResult.applied,
          unapplied_patches: patchResult.unapplied,
          delivery_risk_brief: deliveryRiskBrief,
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
      res.json({ ok: true, chapter: updated, review: saved, result, patch_result: patchResult, quality_refresh: qualityRefresh, story_state_update: storyStateUpdate, delivery_risk_convergence: convergenceReport, delivery_risk_convergence_review: convergenceReview })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/story-state-sync', async (req, res) => {
    try {
      const loaded = await loadChapterBundle(ctx, Number(req.body.project_id || req.query.project_id || 0), Number(req.params.chapterId))
      if ('error' in loaded) return res.status(loaded.status || 500).json({ error: loaded.error })
      const { activeWorkspace, project, chapter, reviews } = loaded
      const modelId = ctx.getStageModelId(project, 'review', Number(req.body.model_id || 0) || undefined)
      const beforeBrief = buildChapterDeliveryRiskBrief(chapter, reviews)
      const storyStateUpdate = await syncStoryStateFromChapter(
        ctx,
        activeWorkspace,
        project,
        project.id,
        Number(chapter.chapter_no || 0),
        modelId,
      ).catch(error => ({ ok: false, error: String(error?.message || error), synced: [], errors: [] }))
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
        status: (storyStateUpdate as any)?.ok === false ? 'failed' : 'success',
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
