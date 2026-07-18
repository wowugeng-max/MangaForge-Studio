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

export function findChapterReviewPayload(reviews: any[], chapterId: number, types: string[]) {
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

