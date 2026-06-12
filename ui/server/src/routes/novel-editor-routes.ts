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

export function buildChapterDeliveryRiskBrief(chapter: any, reviews: any[]) {
  const risks: Array<{ count: number; item: string; directive: string; priority_label: string; evidence: any }> = []
  const qualityPayload = findChapterReviewPayload(reviews, chapter.id, ['prose_quality'])?.payload || {}
  const qualityReview = qualityPayload.self_check?.review || qualityPayload.review || {}
  const qualityMustFix = [
    ...asArray(qualityReview.must_fix),
    ...asArray(qualityReview.mustFix),
    ...asArray(qualityReview.revision_directives),
    ...asArray(qualityReview.issues)
      .filter((issue: any) => ['high', 'critical', 'blocker', 'must_fix'].includes(String(issue?.severity || issue?.level || '').toLowerCase()))
      .map((issue: any) => issue?.description || issue?.suggestion || issue?.message || issue),
  ].map((item: any) => String(item || '').trim()).filter(Boolean)

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
  'delivery_core',
  'reader_expectation',
  'reader_retention',
  'chapter_attraction',
  'story_drive',
  'character_arc',
  'style_sample',
  'reader_payoff',
  'volume_beat',
  'signature_scene',
  'runway',
  'innovation',
  'storyline',
  'story_unit',
  'readability',
])

function deliveryRiskAnnotationPriority(annotation: any) {
  const category = String(annotation?.category || '')
  const order: Record<string, number> = {
    delivery_core: 0,
    runway: 1,
    story_unit: 2,
    signature_scene: 3,
    reader_expectation: 4,
    volume_beat: 5,
    reader_retention: 6,
    chapter_attraction: 7,
    story_drive: 8,
    character_arc: 9,
    style_sample: 10,
    reader_payoff: 11,
    innovation: 12,
    storyline: 13,
    readability: 14,
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
      const result = await executeNovelAgent('prose-agent', project, { task: prompt }, {
        activeWorkspace,
        modelId: modelId ? String(modelId) : undefined,
        maxTokens: 2600,
        temperature: ctx.getStageTemperature(project, 'revise', 0.62),
        responseMode: 'stream',
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
