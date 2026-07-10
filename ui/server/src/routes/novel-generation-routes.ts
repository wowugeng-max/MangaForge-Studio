import type { Express } from 'express'
import {
  appendNovelRun,
  createNovelChapter,
  createNovelReview,
  listChapterVersions,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelWorldbuilding,
  updateNovelChapter,
  updateNovelRun,
} from '../novel'
import { generateNovelChapterProse } from '../llm'
import { buildMaterialScore } from './novel-chapter-context-routes'
import { asArray, buildLLMResultDiagnostics, compactPreviousChaptersForProse, extractPlainProseFallback, formatReviewIssueForStorage, getNovelPayload, getQualityGateDecision, normalizeSceneProduction, parseJsonLikePayload, safeJsonStringify } from './novel-route-utils'
import { applyChapterWordTargetToContext, countProseChars, normalizeDeliveryRiskReceipts, proseMaxTokensForWordTarget, resolveChapterWordTarget } from './novel-writing-service'
import { getChapterLaunchGateBlocker, selectUsableRevisionText } from '../novel-writing/prose-quality-contracts'
import {
  normalizeDeterministicProseLanguageFragments,
  resolveProseLanguageRiskReview,
  stripProseEngineeringAppendix,
} from '../novel-writing/prose-format'
import { compactProseGenerationOverride } from '../novel-writing/prose-generation-contract'

export function stringifyNovelGenerationPayload(value: any) {
  return safeJsonStringify(value, undefined, 0)
}

function sseData(value: any) {
  return `data: ${stringifyNovelGenerationPayload(value)}\n\n`
}

function outlineChapterNo(outline: any) {
  const rawNo = Number(outline.raw_payload?.chapter_no || outline.raw_payload?.future100?.chapter_no || 0)
  if (rawNo) return rawNo
  const match = String(outline.title || '').match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : 0
}

function activeChapterNo(chapters: any[] = []) {
  return chapters.reduce((max, chapter) => Math.max(max, Number(chapter?.chapter_no || 0)), 0)
}

function isApprovalBlockerChapter(item: any = {}, payload: any = {}, stage = '') {
  return String(stage || '') === 'approval_blocker'
    || item?.error_code === 'APPROVAL_BLOCKER'
    || payload?.last_error?.error_code === 'APPROVAL_BLOCKER'
    || item?.approval_stage === 'approval_blocker'
    || payload?.last_error?.approval_stage === 'approval_blocker'
}

function approvalBlockerRoutePayload(item: any = {}, payload: any = {}, action = '继续') {
  return {
    error: `当前章节存在入库阻断，不能${action}绕过。`,
    error_code: 'APPROVAL_BLOCKER_REQUIRES_REPAIR',
    chapter_id: item.id || null,
    chapter_no: item.chapter_no || null,
    approval_stage: 'approval_blocker',
    approval_context: item.approval_context || payload.last_error?.approval_context || null,
    recovery_plan: payload.last_error?.recovery_plan || item.recovery_plan || {
      type: 'approval_blocker',
      actions: ['按入库阻断原因修订正文', '重新运行正文质检和入库门禁', '确认阻断解除后再继续后续章节生成'],
    },
  }
}

function futureSkeletonFromOutline(outline: any) {
  const future = outline.raw_payload?.future100 || {}
  return {
    chapter_no: outlineChapterNo(outline),
    title: String(future.title || String(outline.title || '').replace(/^第\s*\d+\s*章\s*/, '') || outline.title || ''),
    chapter_goal: String(future.chapter_goal || outline.summary || ''),
    conflict: String(future.conflict || asArray(outline.conflict_points)[0] || ''),
    payoff: String(future.payoff || asArray(outline.turning_points)[0] || ''),
    ending_hook: String(future.ending_hook || outline.hook || ''),
    volume_stage: String(future.volume_stage || ''),
    commercial_purpose: String(future.commercial_purpose || ''),
  }
}

function hasPlanningText(value: any, minLength = 1) {
  return String(value || '').replace(/\s/g, '').length >= minLength
}

function hasChapterPlanningMaterial(chapter: any, outline: any) {
  const skeleton = outline ? futureSkeletonFromOutline(outline) : null
  const goal = chapter?.chapter_goal || skeleton?.chapter_goal || outline?.summary || ''
  const summary = chapter?.chapter_summary || skeleton?.payoff || skeleton?.commercial_purpose || outline?.summary || ''
  const conflict = chapter?.conflict || skeleton?.conflict || asArray(outline?.conflict_points)[0] || ''
  const hook = chapter?.ending_hook || skeleton?.ending_hook || outline?.hook || ''
  const sceneCount = asArray(chapter?.scene_breakdown).length
    || asArray(chapter?.scene_list).length
    || asArray(outline?.scene_breakdown).length
    || asArray(outline?.scene_list).length
    || asArray(outline?.raw_payload?.scene_breakdown).length
    || asArray(outline?.raw_payload?.scene_list).length
  return hasPlanningText(goal, 8)
    && hasPlanningText(summary)
    && hasPlanningText(conflict)
    && hasPlanningText(hook)
    && sceneCount > 0
}

function collectMissingPlanningChapterNos(startNo: number, targetNo: number, chapterByNo: Map<number, any>, outlinesByChapterNo: Map<number, any>) {
  const missing: number[] = []
  for (let chapterNo = startNo; chapterNo <= targetNo; chapterNo += 1) {
    if (!hasChapterPlanningMaterial(chapterByNo.get(chapterNo), outlinesByChapterNo.get(chapterNo))) {
      missing.push(chapterNo)
    }
  }
  return missing
}

function compactPlanningEnsureResult(result: any = {}) {
  return {
    ok: result?.ok !== false,
    status: result?.status || (result?.ok === false ? 'warn' : 'success'),
    repaired_count: asArray(result?.repaired_chapters).length,
    created_count: asArray(result?.created_chapters).length,
    updated_count: asArray(result?.updated_chapters).length,
    detail_count: asArray(result?.detail_chapters).length,
    error: result?.error ? String(result.error).slice(0, 300) : '',
  }
}

function scoreFutureSkeletonChapter(item: any) {
  const checks = [
    item.title ? 14 : 0,
    String(item.chapter_goal || '').replace(/\s/g, '').length >= 18 ? 28 : 0,
    item.conflict ? 24 : 0,
    item.payoff ? 18 : 0,
    item.ending_hook ? 16 : 0,
  ]
  return checks.reduce((sum, value) => sum + value, 0)
}

export function compactGenerationRequestOverride(value: any, key = '', depth = 0, seen = new WeakSet<object>()): any {
  return compactProseGenerationOverride(value, key, depth, seen)
}

const STANDALONE_PROGRESS_MAX_STRING = 240
const STANDALONE_PROGRESS_MAX_ARRAY = 6
const STANDALONE_PROGRESS_MAX_DEPTH = 4
const STANDALONE_PROGRESS_DROP_KEYS = new Set([
  'pipeline',
  'chapters',
  'scene_cards',
  'sceneCards',
  'context_package',
  'contextPackage',
  'raw_payload',
  'rawPayload',
  'final_text',
  'finalText',
  'chapter_text',
  'chapterText',
  'full_text',
  'fullText',
  'prompt',
  'messages',
  'debug',
  'diagnostics',
])

function compactStandaloneProgressText(value: any, maxLength = STANDALONE_PROGRESS_MAX_STRING) {
  const text = String(value || '').trim()
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

function compactStandaloneQualityGate(value: any, seen: WeakSet<object>) {
  if (!value || typeof value !== 'object') return value
  return {
    passed: value.passed,
    score: value.score,
    critical_count: value.critical_count ?? value.criticalCount,
    high_count: value.high_count ?? value.highCount,
    reasons: asArray(value.reasons)
      .map((item: any) => compactStandaloneProgressText(item))
      .filter(Boolean)
      .slice(0, STANDALONE_PROGRESS_MAX_ARRAY),
    gate: compactStandaloneProseProgressValue(value.gate, 'gate', 1, seen),
  }
}

function compactStandaloneProseProgressValue(value: any, key = '', depth = 0, seen = new WeakSet<object>()): any {
  if (STANDALONE_PROGRESS_DROP_KEYS.has(key)) return undefined
  if (value === null || value === undefined) return value
  if (key === 'quality_gate' || key === 'qualityGate') return compactStandaloneQualityGate(value, seen)
  const valueType = typeof value
  if (valueType === 'string') return compactStandaloneProgressText(value)
  if (valueType === 'number' || valueType === 'boolean') return value
  if (valueType === 'bigint') return String(value)
  if (valueType !== 'object') return String(value)
  if (seen.has(value)) return '[Circular]'
  if (depth >= STANDALONE_PROGRESS_MAX_DEPTH) return undefined
  seen.add(value)
  if (Array.isArray(value)) {
    const items = value.slice(0, STANDALONE_PROGRESS_MAX_ARRAY)
      .map(item => compactStandaloneProseProgressValue(item, '', depth + 1, seen))
      .filter(item => item !== undefined)
    seen.delete(value)
    return items
  }
  const output: Record<string, any> = {}
  for (const [childKey, childValue] of Object.entries(value)) {
    const compacted = compactStandaloneProseProgressValue(childValue, childKey, depth + 1, seen)
    if (compacted !== undefined) output[childKey] = compacted
  }
  seen.delete(value)
  return output
}

export function compactStandaloneProseProgressStage(stage: any = {}) {
  const sceneCards = asArray(stage?.scene_cards || stage?.sceneCards)
  const compacted = compactStandaloneProseProgressValue(stage) || {}
  if (sceneCards.length > 0 && compacted.scene_card_count === undefined) {
    compacted.scene_card_count = sceneCards.length
  }
  return compacted
}

function applyRequestLongformCompass(contextPackage: any, req: any) {
  if (!req.body?.longform_compass) return contextPackage
  const longformCompass = compactGenerationRequestOverride(req.body.longform_compass)
  return {
    ...contextPackage,
    longform_compass: longformCompass,
    chapter_target: { ...contextPackage.chapter_target, longform_compass: longformCompass },
  }
}

function applyRequestLongformBattleContext(contextPackage: any, req: any) {
  if (!req.body?.longform_battle_context) return contextPackage
  const longformBattleContext = compactGenerationRequestOverride(req.body.longform_battle_context)
  return {
    ...contextPackage,
    longform_battle_context: longformBattleContext,
    chapter_target: { ...contextPackage.chapter_target, longform_battle_context: longformBattleContext },
  }
}

function applyRequestNextBatchBrief(contextPackage: any, req: any) {
  if (!req.body?.next_batch_brief) return contextPackage
  const nextBatchBrief = compactGenerationRequestOverride(req.body.next_batch_brief)
  return {
    ...contextPackage,
    next_batch_brief: nextBatchBrief,
    chapter_target: { ...contextPackage.chapter_target, next_batch_brief: nextBatchBrief },
  }
}

function applyRequestChapterLaunchGate(contextPackage: any, req: any) {
  if (!req.body?.chapter_launch_gate) return contextPackage
  const chapterLaunchGate = compactGenerationRequestOverride(req.body.chapter_launch_gate)
  return {
    ...contextPackage,
    chapter_launch_gate: chapterLaunchGate,
    chapter_target: { ...contextPackage.chapter_target, chapter_launch_gate: chapterLaunchGate },
  }
}

function standaloneChapterLaunchGateFromContext(contextPackage: any = {}, chapter: any = {}) {
  const rawPayload = chapter?.raw_payload || chapter?.rawPayload || {}
  return contextPackage?.chapter_launch_gate
    || contextPackage?.chapterLaunchGate
    || contextPackage?.chapter_target?.chapter_launch_gate
    || contextPackage?.chapterTarget?.chapterLaunchGate
    || rawPayload?.chapter_launch_gate
    || rawPayload?.chapterLaunchGate
    || null
}

export function applyRequestBatchPreflight(contextPackage: any, req: any) {
  const batchPreflight = req.body?.batch_preflight || req.body?.batchPreflight
  if (!batchPreflight) return contextPackage
  const compactBatchPreflight = compactGenerationRequestOverride(batchPreflight)
  const deliveryRiskCarryOver = compactGenerationRequestOverride(batchPreflight?.delivery_risk_carry_over || batchPreflight?.deliveryRiskCarryOver || null)
  const chapterHandoffContract = compactGenerationRequestOverride(batchPreflight?.chapter_handoff_contract || batchPreflight?.chapterHandoffContract || null)
  const previousHandoff = chapterHandoffContract?.previous_handoff || chapterHandoffContract?.previousHandoff || null
  return {
    ...contextPackage,
    batch_preflight: compactBatchPreflight,
    ...(deliveryRiskCarryOver ? { delivery_risk_carry_over: deliveryRiskCarryOver } : {}),
    ...(chapterHandoffContract ? { chapter_handoff_contract: chapterHandoffContract } : {}),
    ...(previousHandoff ? { previous_handoff: previousHandoff } : {}),
    chapter_target: {
      ...contextPackage.chapter_target,
      batch_preflight: compactBatchPreflight,
      ...(deliveryRiskCarryOver ? { delivery_risk_carry_over: deliveryRiskCarryOver } : {}),
      ...(chapterHandoffContract ? { chapter_handoff_contract: chapterHandoffContract } : {}),
      ...(previousHandoff ? { previous_handoff: previousHandoff } : {}),
    },
  }
}

function applyRequestMillionWordRunway(contextPackage: any, req: any) {
  if (!req.body?.million_word_runway) return contextPackage
  const millionWordRunway = compactGenerationRequestOverride(req.body.million_word_runway)
  return {
    ...contextPackage,
    million_word_runway: millionWordRunway,
    chapter_target: { ...contextPackage.chapter_target, million_word_runway: millionWordRunway },
  }
}

type GenerationRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  getModelStrategy: (project: any, preferredModelId?: number) => any
  getApprovalPolicy: (project: any) => any
  buildAgentConfigSnapshot: (project: any, preferredModelId?: number) => any
  buildChapterGroupStages: () => any[]
  updateChapterStages: (stages: any[], key: string, patch?: any) => any[]
  classifyGenerationFailure: (error: any) => any
  executeChapterGroupRunRecord: (workspace: string, project: any, run: any, options?: any) => Promise<any>
  generateChapterForGroup?: (workspace: string, projectId: number, chapterId: number, options?: any) => Promise<any>
  buildPipelineSteps: () => any[]
  updatePipelineStep: (steps: any[], key: string, patch: any) => any[]
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
  autoRepairChapterPreflightGaps?: (
    workspace: string,
    project: any,
    chapter: any,
    contextPackage: any,
    modelId?: number,
    options?: any,
  ) => Promise<any>
  generateSceneCardsForChapter: (workspace: string, project: any, contextPackage: any, modelId?: number) => Promise<any>
  getReferenceMigrationPlanForChapter: (workspace: string, project: any, chapter: any) => Promise<any>
  buildParagraphProseContext: (project: any, contextPackage: any, migrationPlan?: any, chapterDraft?: any) => string[]
  getStageModelId: (project: any, stage: string, preferredModelId?: number) => number | undefined
  runCommercialEditorRewrite: (workspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options?: any) => Promise<any>
  runProseSelfReviewAndRevision: (workspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options?: any) => Promise<any>
  ensureProseMeetsWordTarget: (workspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options?: any) => Promise<any>
  buildReferenceUsageReport: (workspace: string, project: any, taskType: string, generatedText?: string) => Promise<any>
  getReferenceSafetyDecision: (project: any, referenceReport: any) => any
  explainReferenceSafety: (referenceReport: any, safetyDecision: any) => any
  buildMigrationAudit: (project: any, referenceReport: any, safetyExplanation: any) => any
  updateStoryStateMachine: (workspace: string, project: any, chapter: any, contextPackage: any, chapterText: string, modelId?: number) => Promise<any>
  ensureChapterPlanningForRange?: (workspace: string, project: any, options: any) => Promise<any>
}

function buildTextDiffSummary(before: string, after: string) {
  const beforeParas = String(before || '').split(/\n+/).map(item => item.trim()).filter(Boolean)
  const afterParas = String(after || '').split(/\n+/).map(item => item.trim()).filter(Boolean)
  const max = Math.max(beforeParas.length, afterParas.length)
  const paragraphChanges = []
  for (let i = 0; i < max; i += 1) {
    if ((beforeParas[i] || '') !== (afterParas[i] || '')) {
      paragraphChanges.push({ index: i + 1, before: beforeParas[i] || '', after: afterParas[i] || '' })
    }
    if (paragraphChanges.length >= 80) break
  }
  const beforeChars = String(before || '').replace(/\s/g, '').length
  const afterChars = String(after || '').replace(/\s/g, '').length
  return {
    before_length: beforeChars,
    after_length: afterChars,
    delta_length: afterChars - beforeChars,
    change_count: paragraphChanges.length,
    paragraph_changes: paragraphChanges,
  }
}

export function selectTargetProsePayload(resultPayload: any, targetChapterNo: number) {
  const proseArr = Array.isArray(resultPayload?.prose_chapters)
    ? resultPayload.prose_chapters
    : Array.isArray(resultPayload?.proseChapters)
      ? resultPayload.proseChapters
      : []
  const topLevelChapterNo = Number(resultPayload?.chapter_no || resultPayload?.chapterNo || 0)
  if (topLevelChapterNo && topLevelChapterNo !== targetChapterNo) {
    throw new Error(`模型返回的章节号与目标章节不一致：目标第${targetChapterNo}章，返回第${topLevelChapterNo}章`)
  }
  const matched = proseArr.find(item => Number(item?.chapter_no || item?.chapterNo || 0) === targetChapterNo)
  if (matched) {
    return matched
  }
  if (proseArr.length === 1) {
    const single = proseArr[0]
    const singleChapterNo = Number(single?.chapter_no || single?.chapterNo || 0)
    if (!singleChapterNo || singleChapterNo === targetChapterNo) {
      return single
    }
    throw new Error(`模型返回的章节号与目标章节不一致：目标第${targetChapterNo}章，返回第${singleChapterNo}章`)
  }
  if (proseArr.length > 1) {
    const foundNos = proseArr.map(item => item?.chapter_no || item?.chapterNo).filter(Boolean).join('、') || '无'
    throw new Error(`模型返回的正文章节中没有第${targetChapterNo}章，实际章节号为：${foundNos}`)
  }
  return resultPayload || {}
}

function firstReceiptValue(primary: any, fallback: any, snakeKey: string, camelKey: string) {
  const primaryNested = primary?.oh_story_delivery_receipts || primary?.ohStoryDeliveryReceipts || {}
  const fallbackNested = fallback?.oh_story_delivery_receipts || fallback?.ohStoryDeliveryReceipts || {}
  const primaryNestedValue = primaryNested?.[snakeKey] ?? primaryNested?.[camelKey]
  if (primaryNestedValue !== undefined && primaryNestedValue !== null) return primaryNestedValue
  const primaryValue = primary?.[snakeKey] ?? primary?.[camelKey]
  if (primaryValue !== undefined && primaryValue !== null) return primaryValue
  const fallbackNestedValue = fallbackNested?.[snakeKey] ?? fallbackNested?.[camelKey]
  if (fallbackNestedValue !== undefined && fallbackNestedValue !== null) return fallbackNestedValue
  return fallback?.[snakeKey] ?? fallback?.[camelKey]
}

export function extractOhStoryDeliveryReceipts(targetProse: any = {}, resultPayload: any = {}) {
  return {
    chapter_blueprint: firstReceiptValue(targetProse, resultPayload, 'chapter_blueprint', 'chapterBlueprint') || {},
    pre_draft_execution_receipts: firstReceiptValue(targetProse, resultPayload, 'pre_draft_execution_receipts', 'preDraftExecutionReceipts') || {},
    scene_card_receipts: firstReceiptValue(targetProse, resultPayload, 'scene_card_receipts', 'sceneCardReceipts') || [],
    delivery_risk_receipts: firstReceiptValue(targetProse, resultPayload, 'delivery_risk_receipts', 'deliveryRiskReceipts') || [],
    revision_receipts: firstReceiptValue(targetProse, resultPayload, 'revision_receipts', 'revisionReceipts') || [],
    deslop_repair_receipts: firstReceiptValue(targetProse, resultPayload, 'deslop_repair_receipts', 'deslopRepairReceipts') || [],
    quality_audit_repair_receipts: firstReceiptValue(targetProse, resultPayload, 'quality_audit_repair_receipts', 'qualityAuditRepairReceipts') || [],
  }
}

function sceneCardReceiptsFromBreakdown(sceneBreakdown: any[] = []) {
  return asArray(sceneBreakdown)
    .map((scene: any) => scene?.scene_card_receipts || scene?.sceneCardReceipts)
    .filter(Boolean)
}

function refreshedSceneCardReceipts(selfCheck: any = {}, finalSceneBreakdown: any[] = []) {
  const revision = selfCheck?.revision || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const candidates = [
    asArray(revisionDeliveryReceipts?.scene_card_receipts || revisionDeliveryReceipts?.sceneCardReceipts),
    sceneCardReceiptsFromBreakdown(revision?.scene_breakdown || revision?.sceneBreakdown),
    sceneCardReceiptsFromBreakdown(finalSceneBreakdown),
    asArray(revision?.scene_card_receipts || revision?.sceneCardReceipts),
  ]
  return candidates.find(items => items.length > 0) || []
}

export function refreshOhStoryDeliveryReceiptsAfterRevision(currentReceipts: any = {}, selfCheck: any = {}, finalText = '', finalSceneBreakdown: any[] = [], contextPackage: any = {}) {
  const revision = selfCheck?.revision || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const sceneCardReceipts = refreshedSceneCardReceipts(selfCheck, finalSceneBreakdown)
  const currentDeliveryRiskReceipts = asArray(currentReceipts?.delivery_risk_receipts || currentReceipts?.deliveryRiskReceipts)
  const contextDeliveryReceipts = contextPackage?.oh_story_delivery_receipts || contextPackage?.ohStoryDeliveryReceipts || {}
  const revisionDeliveryRiskReceipts = asArray(revisionDeliveryReceipts?.delivery_risk_receipts || revisionDeliveryReceipts?.deliveryRiskReceipts)
  const fallbackDeliveryRiskReceipts = revisionDeliveryRiskReceipts.length > 0
    ? revisionDeliveryRiskReceipts
    : currentDeliveryRiskReceipts.length > 0
      ? currentDeliveryRiskReceipts
      : asArray(contextDeliveryReceipts?.delivery_risk_receipts || contextDeliveryReceipts?.deliveryRiskReceipts)
  const preDraftExecutionReceipts = revisionDeliveryReceipts?.pre_draft_execution_receipts
    || revisionDeliveryReceipts?.preDraftExecutionReceipts
    || revision?.pre_draft_execution_receipts
    || revision?.preDraftExecutionReceipts
    || currentReceipts?.pre_draft_execution_receipts
    || currentReceipts?.preDraftExecutionReceipts
    || {}
  const deliveryRiskContext = {
    ...contextPackage,
    oh_story_delivery_receipts: {
      ...contextDeliveryReceipts,
      delivery_risk_receipts: fallbackDeliveryRiskReceipts,
    },
  }
  const deliveryRiskReceipts = normalizeDeliveryRiskReceipts(selfCheck?.review || {}, deliveryRiskContext, finalText)
  const revisionReceipts = [
    ...asArray(revisionDeliveryReceipts?.revision_receipts || revisionDeliveryReceipts?.revisionReceipts),
    ...asArray(revision?.revision_receipts || revision?.revisionReceipts),
    ...asArray(selfCheck?.revision_receipts || selfCheck?.revisionReceipts),
  ]
  const deslopRepairReceipts = [
    ...asArray(revisionDeliveryReceipts?.deslop_repair_receipts || revisionDeliveryReceipts?.deslopRepairReceipts),
    ...asArray(revision?.deslop_repair_receipts || revision?.deslopRepairReceipts),
    ...asArray(selfCheck?.deslop_repair_receipts || selfCheck?.deslopRepairReceipts),
  ]
  const qualityAuditRepairReceipts = [
    ...asArray(revisionDeliveryReceipts?.quality_audit_repair_receipts || revisionDeliveryReceipts?.qualityAuditRepairReceipts),
    ...asArray(revision?.quality_audit_repair_receipts || revision?.qualityAuditRepairReceipts),
    ...asArray(selfCheck?.quality_audit_repair_receipts || selfCheck?.qualityAuditRepairReceipts),
  ]
  return {
    chapter_blueprint: currentReceipts?.chapter_blueprint || currentReceipts?.chapterBlueprint || {},
    pre_draft_execution_receipts: preDraftExecutionReceipts,
    scene_card_receipts: sceneCardReceipts.length > 0
      ? sceneCardReceipts
      : asArray(currentReceipts?.scene_card_receipts || currentReceipts?.sceneCardReceipts),
    delivery_risk_receipts: deliveryRiskReceipts.length > 0
      ? deliveryRiskReceipts
      : asArray(currentReceipts?.delivery_risk_receipts || currentReceipts?.deliveryRiskReceipts),
    revision_receipts: revisionReceipts.length > 0
      ? revisionReceipts
      : asArray(currentReceipts?.revision_receipts || currentReceipts?.revisionReceipts),
    deslop_repair_receipts: deslopRepairReceipts.length > 0
      ? deslopRepairReceipts
      : asArray(currentReceipts?.deslop_repair_receipts || currentReceipts?.deslopRepairReceipts),
    quality_audit_repair_receipts: qualityAuditRepairReceipts.length > 0
      ? qualityAuditRepairReceipts
      : asArray(currentReceipts?.quality_audit_repair_receipts || currentReceipts?.qualityAuditRepairReceipts),
  }
}

function standaloneProseServiceStageLabel(key: string) {
  const labels: Record<string, string> = {
    context: '构建续写上下文包',
    material_repair: '自动补齐写作前置材料',
    scene_cards: '生成章节场景卡',
    migration_plan: '生成/读取参考迁移计划',
    draft: '段落级正文生成',
    word_target: '核对章节字数目标',
    editor: '商业主编改稿',
    meme_polish: '网感润色',
    review: '执行章节自检',
    revise: '应用修订稿',
    readability_review: '可读性复检',
    safety: '参考安全检查',
    store: '写入章节正文与版本',
    story_state: '更新故事状态机',
  }
  return labels[key] || key
}

function standaloneProseServiceStageDetail(payload: any = {}) {
  if (typeof payload === 'string') return payload
  if (payload?.error) return String(payload.error)
  if (payload?.reason) return String(payload.reason)
  if (Array.isArray(payload?.warnings) && payload.warnings.length) return payload.warnings.join('；')
  if (Array.isArray(payload?.blockers) && payload.blockers.length) return payload.blockers.join('；')
  if (Array.isArray(payload?.issues) && payload.issues.length) return payload.issues.slice(0, 3).map((item: any) => item?.message || item?.summary || item?.label || String(item)).join('；')
  if (payload?.quality_gate?.reasons?.length) return payload.quality_gate.reasons.join('；')
  if (Number.isFinite(Number(payload?.word_count))) return `${Number(payload.word_count)} 字`
  if (Number.isFinite(Number(payload?.score))) return `评分 ${Number(payload.score)}`
  if (Number.isFinite(Number(payload?.count))) return `${Number(payload.count)} 个`
  return ''
}

function standaloneProseServiceErrorStatus(error: any) {
  const code = String(error?.code || error?.error_code || '')
  const message = String(error?.message || error || '')
  if (code.includes('PREFLIGHT') || code.includes('LAUNCH_GATE') || code.includes('SCENE_CARDS')) return 412
  if (code.includes('REFERENCE_SAFETY') || code.includes('QUALITY') || code.includes('APPROVAL')) return 409
  if (message.includes('project not found') || message.includes('chapter not found')) return 404
  return 500
}

function standaloneProseServiceApprovals(approvals: any = {}) {
  const sceneCardApproval = approvals?.scene_cards && typeof approvals.scene_cards === 'object'
    ? approvals.scene_cards
    : {}
  return {
    ...(approvals || {}),
    scene_cards: {
      ...sceneCardApproval,
      approved: true,
      source: sceneCardApproval.source || 'standalone_generate_prose',
    },
  }
}

export function registerNovelGenerationRoutes(app: Express, ctx: GenerationRoutesContext) {
  app.post('/api/novel/projects/:id/chapter-groups/start', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const chapters = await listNovelChapters(activeWorkspace, project.id)
      const startNo = Number(req.body.start_chapter || chapters.find(ch => !ch.chapter_text)?.chapter_no || 1)
      const count = Math.max(1, Math.min(50, Number(req.body.count || 10)))
      const selected = chapters.filter(ch => ch.chapter_no >= startNo && ch.chapter_no < startNo + count)
      const modelStrategy = project.reference_config?.model_strategy || ctx.getModelStrategy(project, Number(req.body.model_id || 0) || undefined)
      const approvalPolicy = project.reference_config?.approval_policy || ctx.getApprovalPolicy(project)
      const configSnapshot = ctx.buildAgentConfigSnapshot(project, Number(req.body.model_id || 0) || undefined)
      const output = {
        chapter_ids: selected.map(ch => ch.id),
        chapters: selected.map(ch => ({
          id: ch.id,
          chapter_no: ch.chapter_no,
          title: ch.title,
          status: ch.chapter_text ? 'written' : 'pending',
          scenes: normalizeSceneProduction(asArray(ch.scene_breakdown).length ? ch.scene_breakdown : asArray(ch.scene_list), [], ch.chapter_text ? 'accepted' : 'pending'),
          stages: ctx.buildChapterGroupStages(),
        })),
        current_index: 0,
        mode: req.body.mode || 'group',
        production_mode: req.body.production_mode || 'draft_review_revise_store',
        model_strategy: modelStrategy,
        approval_policy: approvalPolicy,
        config_snapshot: configSnapshot,
        policy: {
          stop_on_failure: req.body.stop_on_failure !== false,
          require_scene_confirmation: req.body.require_scene_confirmation ?? approvalPolicy.require_scene_card_approval,
          quality_threshold: Number(req.body.quality_threshold || 78),
          production_mode: req.body.production_mode || 'draft_review_revise_store',
        },
      }
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'chapter_group_generation',
        step_name: `chapter-${startNo}-${startNo + count - 1}`,
        status: 'ready',
        input_ref: stringifyNovelGenerationPayload(req.body || {}),
        output_ref: stringifyNovelGenerationPayload(output),
      })
      res.json({ ok: true, run, group: output })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/start-ready', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelWorldbuilding(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
      const startNo = Number(req.body.start_chapter || chapters.find(ch => !ch.chapter_text)?.chapter_no || 1)
      const scanLimit = Math.max(1, Math.min(120, Number(req.body.scan_limit || 40)))
      const count = Math.max(1, Math.min(50, Number(req.body.count || 10)))
      const minScore = Math.max(0, Math.min(100, Number(req.body.min_score || 65)))
      const candidates = chapters
        .filter(chapter => Number(chapter.chapter_no || 0) >= startNo)
        .filter(chapter => req.body.include_written ? true : !chapter.chapter_text)
        .sort((a, b) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
        .slice(0, scanLimit)
      const ready = []
      const skipped = []
      for (const chapter of candidates) {
        const contextPackage = await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews)
        const materialScore = buildMaterialScore(contextPackage)
        const row = {
          id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          score: materialScore.score,
          can_generate: materialScore.can_generate && Number(materialScore.score || 0) >= minScore,
          blockers: materialScore.blockers,
          recommendations: materialScore.recommendations,
        }
        if (row.can_generate && ready.length < count) ready.push({ chapter, materialScore })
        else skipped.push(row)
      }
      if (ready.length === 0) {
        return res.status(409).json({
          error: '没有找到材料达标的待生成章节',
          error_code: 'NO_READY_CHAPTERS',
          min_score: minScore,
          scanned: candidates.length,
          skipped,
        })
      }
      const selected = ready.map(item => item.chapter)
      const modelStrategy = project.reference_config?.model_strategy || ctx.getModelStrategy(project, Number(req.body.model_id || 0) || undefined)
      const approvalPolicy = project.reference_config?.approval_policy || ctx.getApprovalPolicy(project)
      const output = {
        chapter_ids: selected.map(ch => ch.id),
        chapters: ready.map(({ chapter, materialScore }) => ({
          id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          status: chapter.chapter_text ? 'written' : 'pending',
          material_score: materialScore.score,
          scenes: normalizeSceneProduction(asArray(chapter.scene_breakdown).length ? chapter.scene_breakdown : asArray(chapter.scene_list), [], chapter.chapter_text ? 'accepted' : 'pending'),
          stages: ctx.buildChapterGroupStages(),
        })),
        skipped_chapters: skipped,
        current_index: 0,
        mode: 'ready_matrix',
        production_mode: req.body.production_mode || 'draft_review_revise_store',
        model_strategy: modelStrategy,
        approval_policy: approvalPolicy,
        policy: {
          stop_on_failure: req.body.stop_on_failure !== false,
          require_scene_confirmation: req.body.require_scene_confirmation ?? approvalPolicy.require_scene_card_approval,
          quality_threshold: Number(req.body.quality_threshold || 78),
          min_material_score: minScore,
          production_mode: req.body.production_mode || 'draft_review_revise_store',
        },
      }
      const firstNo = selected[0]?.chapter_no || startNo
      const lastNo = selected[selected.length - 1]?.chapter_no || firstNo
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'chapter_group_generation',
        step_name: `ready-chapter-${firstNo}-${lastNo}`,
        status: 'ready',
        input_ref: stringifyNovelGenerationPayload(req.body || {}),
        output_ref: stringifyNovelGenerationPayload(output),
      })
      res.json({
        ok: true,
        run,
        group: output,
        summary: {
          scanned: candidates.length,
          queued: selected.length,
          skipped: skipped.length,
          min_score: minScore,
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/start-from-skeleton', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const [chapters, outlines] = await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
      ])
      const startNo = Number(req.body.start_chapter || chapters.find(ch => !ch.chapter_text)?.chapter_no || 1)
      const scanLimit = Math.max(1, Math.min(120, Number(req.body.scan_limit || 100)))
      const count = Math.max(1, Math.min(50, Number(req.body.count || 10)))
      const minScore = Math.max(0, Math.min(100, Number(req.body.min_score || 70)))
      const createMissing = req.body.create_missing !== false
      const syncChapterFields = req.body.sync_chapter_fields !== false
      const chapterByNo = new Map(chapters.map(chapter => [Number(chapter.chapter_no || 0), chapter]))
      const skeletonRows = outlines
        .filter(outline => String(outline.outline_type || '') === 'chapter' && (outline.raw_payload?.source === 'future_100_skeleton' || outline.raw_payload?.future100))
        .map(outline => ({ outline, skeleton: futureSkeletonFromOutline(outline) }))
        .filter(row => Number(row.skeleton.chapter_no || 0) >= startNo)
        .sort((a, b) => Number(a.skeleton.chapter_no || 0) - Number(b.skeleton.chapter_no || 0))
        .slice(0, scanLimit)
      const ready: any[] = []
      const skipped: any[] = []
      const createdChapters: any[] = []
      const updatedChapters: any[] = []
      for (const row of skeletonRows) {
        const skeletonScore = scoreFutureSkeletonChapter(row.skeleton)
        const existing = chapterByNo.get(Number(row.skeleton.chapter_no || 0))
        const baseChapter = existing || (createMissing && !req.body.dry_run ? await createNovelChapter(activeWorkspace, {
          project_id: project.id,
          outline_id: row.outline.id,
          chapter_no: row.skeleton.chapter_no,
          title: row.skeleton.title || row.outline.title,
          chapter_goal: row.skeleton.chapter_goal,
          chapter_summary: [row.skeleton.conflict, row.skeleton.payoff, row.skeleton.commercial_purpose].filter(Boolean).join('；'),
          ending_hook: row.skeleton.ending_hook,
          status: 'draft',
          raw_payload: { source: 'future_100_skeleton_group', future100: row.skeleton },
        } as any) : existing)
        if (baseChapter && !existing) {
          createdChapters.push(baseChapter)
          chapterByNo.set(Number(baseChapter.chapter_no || 0), baseChapter)
        }
        let chapter = baseChapter
        if (chapter && syncChapterFields && !req.body.dry_run) {
          const patch: any = {
            outline_id: chapter.outline_id || row.outline.id,
            title: chapter.title || row.skeleton.title || row.outline.title,
            chapter_goal: chapter.chapter_goal || row.skeleton.chapter_goal,
            chapter_summary: chapter.chapter_summary || [row.skeleton.conflict, row.skeleton.payoff, row.skeleton.commercial_purpose].filter(Boolean).join('；'),
            ending_hook: chapter.ending_hook || row.skeleton.ending_hook,
            raw_payload: { ...(chapter.raw_payload || {}), future100_source_outline_id: row.outline.id },
          }
          const updated = await updateNovelChapter(activeWorkspace, chapter.id, patch, { createVersion: false })
          if (updated) {
            chapter = updated
            updatedChapters.push(updated)
          }
        }
        const canGenerate = Boolean(chapter) && (req.body.include_written ? true : !chapter.chapter_text) && skeletonScore >= minScore
        const candidate = {
          outline_id: row.outline.id,
          chapter_id: chapter?.id || null,
          chapter_no: row.skeleton.chapter_no,
          title: chapter?.title || row.skeleton.title,
          skeleton_score: skeletonScore,
          can_generate: canGenerate,
          blockers: [
            !chapter ? '缺章节记录' : '',
            chapter?.chapter_text && !req.body.include_written ? '已有正文' : '',
            skeletonScore < minScore ? `骨架分 ${skeletonScore} 低于阈值 ${minScore}` : '',
          ].filter(Boolean),
        }
        if (canGenerate && ready.length < count) ready.push({ chapter, skeletonScore, outline: row.outline })
        else skipped.push(candidate)
      }
      if (req.body.dry_run === true) {
        return res.json({
          ok: true,
          dry_run: true,
          candidates: skeletonRows.length,
          ready: ready.map(item => ({ chapter_id: item.chapter?.id || null, chapter_no: item.chapter?.chapter_no, title: item.chapter?.title, skeleton_score: item.skeletonScore })),
          skipped,
          summary: { scanned: skeletonRows.length, queued: ready.length, skipped: skipped.length, created: 0, updated: 0, min_score: minScore },
        })
      }
      if (ready.length === 0) {
        return res.status(409).json({
          error: '没有找到可从未来100章骨架入队的章节',
          error_code: 'NO_READY_SKELETON_CHAPTERS',
          min_score: minScore,
          scanned: skeletonRows.length,
          skipped,
        })
      }
      const selected = ready.map(item => item.chapter)
      const modelStrategy = project.reference_config?.model_strategy || ctx.getModelStrategy(project, Number(req.body.model_id || 0) || undefined)
      const approvalPolicy = project.reference_config?.approval_policy || ctx.getApprovalPolicy(project)
      const output = {
        chapter_ids: selected.map(ch => ch.id),
        chapters: ready.map(({ chapter, skeletonScore }) => ({
          id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          status: chapter.chapter_text ? 'written' : 'pending',
          material_score: skeletonScore,
          skeleton_score: skeletonScore,
          scenes: normalizeSceneProduction(asArray(chapter.scene_breakdown).length ? chapter.scene_breakdown : asArray(chapter.scene_list), [], chapter.chapter_text ? 'accepted' : 'pending'),
          stages: ctx.buildChapterGroupStages(),
        })),
        skipped_chapters: skipped,
        created_chapters: createdChapters.map(chapter => ({ id: chapter.id, chapter_no: chapter.chapter_no, title: chapter.title })),
        updated_chapters: updatedChapters.map(chapter => ({ id: chapter.id, chapter_no: chapter.chapter_no, title: chapter.title })),
        current_index: 0,
        mode: 'future100_skeleton',
        production_mode: req.body.production_mode || 'draft_review_revise_store',
        model_strategy: modelStrategy,
        approval_policy: approvalPolicy,
        policy: {
          stop_on_failure: req.body.stop_on_failure !== false,
          require_scene_confirmation: req.body.require_scene_confirmation ?? approvalPolicy.require_scene_card_approval,
          quality_threshold: Number(req.body.quality_threshold || 78),
          min_skeleton_score: minScore,
          production_mode: req.body.production_mode || 'draft_review_revise_store',
        },
      }
      const firstNo = selected[0]?.chapter_no || startNo
      const lastNo = selected[selected.length - 1]?.chapter_no || firstNo
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'chapter_group_generation',
        step_name: `future100-chapter-${firstNo}-${lastNo}`,
        status: 'ready',
        input_ref: stringifyNovelGenerationPayload(req.body || {}),
        output_ref: stringifyNovelGenerationPayload(output),
      })
      res.json({
        ok: true,
        run,
        group: output,
        summary: {
          scanned: skeletonRows.length,
          queued: selected.length,
          skipped: skipped.length,
          created: createdChapters.length,
          updated: updatedChapters.length,
          min_score: minScore,
        },
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/start-unattended', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      let chapters = await listNovelChapters(activeWorkspace, project.id)
      let outlines = await listNovelOutlines(activeWorkspace, project.id)
      const firstUnwritten = chapters.find(chapter => !chapter.chapter_text)
      const startNo = Math.max(1, Number(req.body.start_chapter || firstUnwritten?.chapter_no || activeChapterNo(chapters) + 1 || 1))
      const rawTargetNo = Number(req.body.target_chapter || req.body.target_chapter_no || 0)
      if (!rawTargetNo) return res.status(400).json({ error: 'target_chapter required' })
      if (rawTargetNo < startNo) return res.status(400).json({ error: 'target_chapter must be greater than or equal to start_chapter', error_code: 'UNATTENDED_TARGET_BEFORE_START', start_chapter: startNo, target_chapter: rawTargetNo })
      const targetNo = rawTargetNo
      const maxRange = Math.max(1, Math.min(80, Number(req.body.max_chapters || 50)))
      if (targetNo - startNo + 1 > maxRange) {
        return res.status(400).json({ error: `无人值守单次最多 ${maxRange} 章，请缩小目标范围`, error_code: 'UNATTENDED_RANGE_TOO_LARGE', start_chapter: startNo, target_chapter: targetNo, max_chapters: maxRange })
      }
      const createMissing = req.body.create_missing !== false
      const syncChapterFields = req.body.sync_chapter_fields !== false
      const includeWritten = req.body.include_written === true
      let chapterByNo = new Map(chapters.map(chapter => [Number(chapter.chapter_no || 0), chapter]))
      let outlinesByChapterNo = new Map(outlines
        .filter(outline => String(outline.outline_type || '') === 'chapter')
        .map(outline => [outlineChapterNo(outline), outline])
        .filter(([chapterNo]) => Number(chapterNo || 0) > 0) as Array<[number, any]>)
      const rebuildPlanningMaps = () => {
        chapterByNo = new Map(chapters.map(chapter => [Number(chapter.chapter_no || 0), chapter]))
        outlinesByChapterNo = new Map(outlines
          .filter(outline => String(outline.outline_type || '') === 'chapter')
          .map(outline => [outlineChapterNo(outline), outline])
          .filter(([chapterNo]) => Number(chapterNo || 0) > 0) as Array<[number, any]>)
      }
      let planningPreflight: any = {
        enabled: req.body.auto_plan_missing !== false,
        status: 'skipped',
        missing_chapter_nos: [],
      }
      if (req.body.auto_plan_missing !== false) {
        const missingPlanningNos = collectMissingPlanningChapterNos(startNo, targetNo, chapterByNo, outlinesByChapterNo)
        planningPreflight = {
          enabled: true,
          status: missingPlanningNos.length ? 'missing' : 'ready',
          missing_chapter_nos: missingPlanningNos,
        }
        if (missingPlanningNos.length > 0 && ctx.ensureChapterPlanningForRange) {
          try {
            const ensureResult = await ctx.ensureChapterPlanningForRange(activeWorkspace, project, {
              start_chapter: startNo,
              target_chapter: targetNo,
              chapter_count: targetNo - startNo + 1,
              continue_from: startNo > 1 ? startNo - 1 : 0,
              model_id: Number(req.body.model_id || 0) || undefined,
              missing_chapter_nos: missingPlanningNos,
              user_outline: req.body.user_outline || req.body.prompt || '',
              source: 'start-unattended',
            })
            chapters = await listNovelChapters(activeWorkspace, project.id)
            outlines = await listNovelOutlines(activeWorkspace, project.id)
            rebuildPlanningMaps()
            const remainingMissingNos = collectMissingPlanningChapterNos(startNo, targetNo, chapterByNo, outlinesByChapterNo)
            planningPreflight = {
              enabled: true,
              status: remainingMissingNos.length ? 'warn' : 'success',
              missing_chapter_nos: missingPlanningNos,
              remaining_missing_chapter_nos: remainingMissingNos,
              result: compactPlanningEnsureResult(ensureResult),
            }
          } catch (planningError) {
            chapters = await listNovelChapters(activeWorkspace, project.id)
            outlines = await listNovelOutlines(activeWorkspace, project.id)
            rebuildPlanningMaps()
            planningPreflight = {
              enabled: true,
              status: 'failed',
              missing_chapter_nos: missingPlanningNos,
              error: String(planningError).slice(0, 300),
            }
          }
        } else if (missingPlanningNos.length > 0) {
          planningPreflight = {
            ...planningPreflight,
            status: 'skipped_no_ensure_hook',
          }
        }
      }
      const strictPlanningPreflight = req.body.allow_planning_fallback !== true
      const planningStillMissing = asArray(planningPreflight.remaining_missing_chapter_nos).length > 0
        || (planningPreflight.status === 'failed' && asArray(planningPreflight.missing_chapter_nos).length > 0)
      if (strictPlanningPreflight && ['failed', 'warn'].includes(String(planningPreflight.status || '')) && planningStillMissing) {
        return res.status(424).json({
          error: '无人值守章节规划补齐失败，已停止入队，避免使用浅层兜底规划继续生成。',
          error_code: 'UNATTENDED_PLANNING_PREFLIGHT_FAILED',
          start_chapter: startNo,
          target_chapter: targetNo,
          planning_preflight: planningPreflight,
          recovery_plan: {
            type: 'planning_preflight_failed',
            summary: '自动写作前置规划没有补齐，不能继续创建正文队列。',
            actions: ['检查模型和 Key 是否可用', '缩小目标章节范围后重试', '先在章节规划面板生成大纲/细纲，再重新启动无人值守'],
          },
        })
      }
      const createdChapters: any[] = []
      const updatedChapters: any[] = []
      const skipped: any[] = []
      const selected: any[] = []

      for (let chapterNo = startNo; chapterNo <= targetNo; chapterNo += 1) {
        const outline = outlinesByChapterNo.get(chapterNo)
        const skeleton = outline ? futureSkeletonFromOutline(outline) : null
        let chapter = chapterByNo.get(chapterNo)
        if (!chapter && createMissing) {
          chapter = await createNovelChapter(activeWorkspace, {
            project_id: project.id,
            outline_id: outline?.id || null,
            chapter_no: chapterNo,
            title: skeleton?.title || outline?.title || `第${chapterNo}章`,
            chapter_goal: skeleton?.chapter_goal || outline?.summary || `承接前文推进第${chapterNo}章核心冲突，并为下一章留下钩子。`,
            chapter_summary: [skeleton?.conflict, skeleton?.payoff, skeleton?.commercial_purpose].filter(Boolean).join('；') || outline?.summary || '',
            conflict: skeleton?.conflict || asArray(outline?.conflict_points)[0] || '',
            ending_hook: skeleton?.ending_hook || outline?.hook || '',
            status: 'draft',
            raw_payload: {
              source: 'unattended_goal',
              unattended_goal: {
                target_chapter: targetNo,
                created_by: 'start-unattended',
                needs_agent_completion: !outline,
              },
              ...(skeleton ? { future100: skeleton } : {}),
            },
          } as any)
          chapterByNo.set(chapterNo, chapter)
          createdChapters.push(chapter)
        }
        if (chapter && syncChapterFields && outline) {
          const patch: any = {
            outline_id: chapter.outline_id || outline.id,
            title: chapter.title || skeleton?.title || outline.title,
            chapter_goal: chapter.chapter_goal || skeleton?.chapter_goal || outline.summary || '',
            chapter_summary: chapter.chapter_summary || [skeleton?.conflict, skeleton?.payoff, skeleton?.commercial_purpose].filter(Boolean).join('；') || outline.summary || '',
            conflict: chapter.conflict || skeleton?.conflict || asArray(outline.conflict_points)[0] || '',
            ending_hook: chapter.ending_hook || skeleton?.ending_hook || outline.hook || '',
            raw_payload: {
              ...(chapter.raw_payload || {}),
              unattended_goal: {
                ...(chapter.raw_payload?.unattended_goal || {}),
                target_chapter: targetNo,
                outline_id: outline.id,
                auto_repair_missing_material: true,
              },
            },
          }
          const updated = await updateNovelChapter(activeWorkspace, chapter.id, patch, { createVersion: false })
          if (updated) {
            chapter = updated
            chapterByNo.set(chapterNo, updated)
            updatedChapters.push(updated)
          }
        }
        if (!chapter) {
          skipped.push({ chapter_no: chapterNo, reason: '缺章节记录，且未允许自动创建' })
          continue
        }
        if (chapter.chapter_text && !includeWritten) {
          skipped.push({ chapter_id: chapter.id, chapter_no: chapterNo, title: chapter.title, reason: '已有正文' })
          continue
        }
        selected.push(chapter)
      }

      if (!selected.length) {
        return res.status(409).json({ error: '无人值守目标范围内没有可入队章节', error_code: 'NO_UNATTENDED_CHAPTERS', start_chapter: startNo, target_chapter: targetNo, skipped })
      }

      chapters = await listNovelChapters(activeWorkspace, project.id)
      const modelStrategy = project.reference_config?.model_strategy || ctx.getModelStrategy(project, Number(req.body.model_id || 0) || undefined)
      const approvalPolicy = { ...(project.reference_config?.approval_policy || ctx.getApprovalPolicy(project)), allow_full_auto: true }
      const configSnapshot = ctx.buildAgentConfigSnapshot(project, Number(req.body.model_id || 0) || undefined)
      const qualityThreshold = Number(req.body.quality_threshold || project.reference_config?.quality_gate?.min_score || 78)
      const output = {
        chapter_ids: selected.map(chapter => chapter.id),
        chapters: selected.map(chapter => ({
          id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          status: chapter.chapter_text ? 'written' : 'pending',
          material_score: chapter.chapter_goal && chapter.ending_hook ? 80 : 60,
          scenes: normalizeSceneProduction(asArray(chapter.scene_breakdown).length ? chapter.scene_breakdown : asArray(chapter.scene_list), [], chapter.chapter_text ? 'accepted' : 'pending'),
          stages: ctx.buildChapterGroupStages(),
        })),
        skipped_chapters: skipped,
        created_chapters: createdChapters.map(chapter => ({ id: chapter.id, chapter_no: chapter.chapter_no, title: chapter.title })),
        updated_chapters: updatedChapters.map(chapter => ({ id: chapter.id, chapter_no: chapter.chapter_no, title: chapter.title })),
        current_index: 0,
        mode: 'unattended_goal',
        production_mode: 'full_auto',
        model_strategy: modelStrategy,
        approval_policy: approvalPolicy,
        config_snapshot: configSnapshot,
        unattended: {
          enabled: true,
          start_chapter: startNo,
          target_chapter: targetNo,
          allow_incomplete: req.body.allow_incomplete === true,
          force_scene_cards: req.body.force_scene_cards !== false,
          auto_repair_missing_material: true,
          auto_repair_quality_gate: true,
          advance_rule: 'quality_gate_passed_then_next_chapter',
        },
        policy: {
          stop_on_failure: req.body.stop_on_failure !== false,
          allow_incomplete: req.body.allow_incomplete === true,
          force_scene_cards: req.body.force_scene_cards !== false,
          require_scene_confirmation: false,
          quality_threshold: qualityThreshold,
          production_mode: 'full_auto',
          auto_repair_missing_material: true,
          auto_repair_quality_gate: true,
        },
        planning_preflight: planningPreflight,
      }
      const run = await appendNovelRun(activeWorkspace, {
        project_id: project.id,
        run_type: 'chapter_group_generation',
        step_name: `unattended-chapter-${startNo}-${targetNo}`,
        status: 'ready',
        input_ref: stringifyNovelGenerationPayload(req.body || {}),
        output_ref: stringifyNovelGenerationPayload(output),
      })
      res.json({
        ok: true,
        run,
        group: output,
        worker_start_endpoint: `/api/novel/projects/${project.id}/run-queue/start-worker`,
        summary: {
          start_chapter: startNo,
          target_chapter: targetNo,
          queued: selected.length,
          skipped: skipped.length,
          created: createdChapters.length,
          updated: updatedChapters.length,
          quality_threshold: qualityThreshold,
          auto_repair_missing_material: true,
        },
        chapters: chapters.filter(chapter => chapter.chapter_no >= startNo && chapter.chapter_no <= targetNo),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/:runId/execute', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      const run = runs.find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
      const item = chapters[Number(payload.current_index || 0)] || {}
      if (isApprovalBlockerChapter(item, payload)) return res.status(409).json(approvalBlockerRoutePayload(item, payload, '直接执行'))
      const result = await ctx.executeChapterGroupRunRecord(activeWorkspace, project, run, req.body || {})
      res.json({ ok: true, ...result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/:runId/approve', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      const run = runs.find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
      const chapterId = Number(req.body.chapter_id || 0)
      const stage = String(req.body.stage || payload.last_error?.approval_stage || 'scene_cards')
      const index = chapterId ? chapters.findIndex((item: any) => Number(item.id) === chapterId) : Number(payload.current_index || 0)
      if (index < 0 || !chapters[index]) return res.status(404).json({ error: 'chapter in run not found' })
      const item = chapters[index]
      if (isApprovalBlockerChapter(item, payload, stage)) return res.status(409).json(approvalBlockerRoutePayload(item, payload, '用人工确认直接'))
      const approvals = {
        ...(item.approvals || {}),
        [stage]: {
          approved: true,
          approved_at: new Date().toISOString(),
          note: String(req.body.note || ''),
        },
      }
      chapters[index] = {
        ...item,
        status: 'ready',
        approvals,
        next_run_at: '',
        error: '',
        error_code: '',
        stages: ctx.updateChapterStages(item.stages || [], stage === 'low_score' || stage === 'quality_gate' ? 'review' : stage === 'draft' ? 'draft' : stage, { status: 'success', approved: true }),
      }
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'ready',
        output_ref: stringifyNovelGenerationPayload({ ...payload, chapters, current_index: index, phase: `第${item.chapter_no}章已确认，等待继续执行`, approved_at: new Date().toISOString() }),
        error_message: '',
      })
      res.json({ ok: true, run: updated, group: parseJsonLikePayload(updated?.output_ref) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/:runId/retry-now', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      const run = runs.find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
      const chapterId = Number(req.body.chapter_id || 0)
      const index = chapterId ? chapters.findIndex((item: any) => Number(item.id) === chapterId) : Number(payload.current_index || 0)
      if (index < 0 || !chapters[index]) return res.status(404).json({ error: 'chapter in run not found' })
      const item = chapters[index]
      if (isApprovalBlockerChapter(item, payload)) return res.status(409).json(approvalBlockerRoutePayload(item, payload, '直接重试'))
      chapters[index] = { ...chapters[index], status: 'ready', next_run_at: '', error: '', error_code: '' }
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'ready',
        output_ref: stringifyNovelGenerationPayload({ ...payload, chapters, current_index: index, phase: `第${chapters[index].chapter_no}章已加入立即重试` }),
        error_message: '',
      })
      res.json({ ok: true, run: updated, group: parseJsonLikePayload(updated?.output_ref) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/chapter-groups/:runId/skip-chapter', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const runs = await listNovelRuns(activeWorkspace, project.id)
      const run = runs.find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
      const chapterId = Number(req.body.chapter_id || 0)
      const index = chapterId ? chapters.findIndex((item: any) => Number(item.id) === chapterId) : Number(payload.current_index || 0)
      if (index < 0 || !chapters[index]) return res.status(404).json({ error: 'chapter in run not found' })
      const item = chapters[index]
      if (isApprovalBlockerChapter(item, payload)) return res.status(409).json(approvalBlockerRoutePayload(item, payload, '跳过章节'))
      const stages = (Array.isArray(item.stages) && item.stages.length ? item.stages : ctx.buildChapterGroupStages())
        .map((stage: any) => ['success', 'skipped'].includes(stage.status) ? stage : { ...stage, status: 'skipped', skipped_at: new Date().toISOString() })
      const nextIndex = Number(payload.current_index || 0) <= index ? index + 1 : Number(payload.current_index || 0)
      chapters[index] = {
        ...item,
        status: 'skipped',
        stages,
        skipped_reason: String(req.body.reason || '用户在任务中心跳过'),
        skipped_at: new Date().toISOString(),
        error: '',
        error_code: '',
        next_run_at: '',
      }
      const updated = await updateNovelRun(activeWorkspace, run.id, {
        status: 'ready',
        output_ref: stringifyNovelGenerationPayload({
          ...payload,
          chapters,
          current_index: nextIndex,
          phase: `已跳过第${item.chapter_no}章，等待继续执行`,
          last_error: payload.last_error?.id === item.id ? null : payload.last_error,
        }),
        error_message: '',
      })
      res.json({ ok: true, run: updated, group: parseJsonLikePayload(updated?.output_ref) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/chapter-groups/:runId/scenes', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      const run = (await listNovelRuns(activeWorkspace, project.id)).find(item => item.id === Number(req.params.runId))
      if (!run || run.run_type !== 'chapter_group_generation') return res.status(404).json({ error: 'chapter group run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
      res.json({
        ok: true,
        run_id: run.id,
        scenes: chapters.map((chapter: any) => ({
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          title: chapter.title,
          status: chapter.status,
          scenes: Array.isArray(chapter.scenes) ? chapter.scenes : [],
        })),
      })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/runs/:id/failure-recovery-plan', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const projectId = Number(req.body.project_id || req.query.project_id || 0)
      const runs = await listNovelRuns(activeWorkspace, projectId)
      const run = runs.find(item => item.id === Number(req.params.id))
      if (!run) return res.status(404).json({ error: 'run not found' })
      const payload = parseJsonLikePayload(run.output_ref) || {}
      const plan = ctx.classifyGenerationFailure({ message: run.error_message || payload?.error || payload?.last_error?.error || stringifyNovelGenerationPayload(payload).slice(0, 500), code: payload?.last_error?.error_code || payload?.error_code })
      res.json({ ok: true, plan, run_id: run.id, status: run.status })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/generation-pipeline/start', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || 0)
      const modelId = Number(req.body.model_id || 0) || undefined
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const configSnapshot = ctx.buildAgentConfigSnapshot(project, modelId)
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, projectId),
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
      ])
      const chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      let wordTarget = resolveChapterWordTarget(project, chapter, req.body || {})
      let contextPackage = applyChapterWordTargetToContext(
        await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews),
        wordTarget,
      )
      let steps = ctx.buildPipelineSteps()
      steps = ctx.updatePipelineStep(steps, 'context', {
        status: contextPackage.preflight.ready ? 'success' : 'warn',
        detail: contextPackage.preflight.warnings.join('；'),
      })
      let updatedChapter = chapter
      if (req.body?.generate_scene_cards === true) {
        const sceneResult = await ctx.generateSceneCardsForChapter(activeWorkspace, project, contextPackage, modelId)
        if (sceneResult.sceneCards.length > 0) {
          updatedChapter = await updateNovelChapter(activeWorkspace, chapter.id, {
            scene_breakdown: sceneResult.sceneCards,
            scene_list: sceneResult.sceneCards,
            raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'pipeline_confirmation' },
          } as any, { createVersion: false }) || chapter
          const refreshedChapters = await listNovelChapters(activeWorkspace, projectId)
          wordTarget = resolveChapterWordTarget(project, updatedChapter, req.body || {})
          contextPackage = applyChapterWordTargetToContext(
            await ctx.buildChapterContextPackage(activeWorkspace, project, updatedChapter, refreshedChapters, worldbuilding, characters, outlines, reviews),
            wordTarget,
          )
          steps = ctx.updatePipelineStep(steps, 'scene_cards', {
            status: 'needs_confirmation',
            detail: `已生成 ${sceneResult.sceneCards.length} 个场景卡，等待人工确认。`,
            scene_cards: sceneResult.sceneCards,
          })
        } else {
          steps = ctx.updatePipelineStep(steps, 'scene_cards', { status: 'failed', detail: '模型未返回场景卡' })
        }
      }
      const output = {
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        current_step: req.body?.generate_scene_cards === true ? 'scene_cards' : 'context',
        steps,
        context_package: contextPackage,
        config_snapshot: configSnapshot,
        confirmed_scene_cards: false,
        can_resume_from: req.body?.generate_scene_cards === true ? 'draft' : 'scene_cards',
        resume_endpoint: `/api/novel/chapters/${chapter.id}/generate-prose`,
      }
      const run = await appendNovelRun(activeWorkspace, {
        project_id: projectId,
        run_type: 'chapter_generation_pipeline',
        step_name: `chapter-${chapter.chapter_no}`,
        status: req.body?.generate_scene_cards === true ? 'paused' : 'ready',
        input_ref: stringifyNovelGenerationPayload(req.body || {}),
        output_ref: stringifyNovelGenerationPayload(output),
      })
      res.json({ ok: true, run, pipeline: output, chapter: updatedChapter })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/scene-cards', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || 0)
      const modelId = Number(req.body.model_id || 0) || undefined
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const configSnapshot = ctx.buildAgentConfigSnapshot(project, modelId)
      const [chapters, worldbuilding, characters, outlines, reviews] = await Promise.all([
        listNovelChapters(activeWorkspace, projectId),
        listNovelWorldbuilding(activeWorkspace, projectId),
        listNovelCharacters(activeWorkspace, projectId),
        listNovelOutlines(activeWorkspace, projectId),
        listNovelReviews(activeWorkspace, projectId),
      ])
      const chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      const wordTarget = resolveChapterWordTarget(project, chapter, req.body || {})
      const contextPackage = applyChapterWordTargetToContext(
        await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews),
        wordTarget,
      )
      if (!contextPackage.preflight.ready && req.body?.allow_incomplete !== true) {
        return res.status(412).json({ error: '场景卡生成前置检查未通过', error_code: 'SCENE_PREFLIGHT_BLOCKED', preflight: contextPackage.preflight, context_package: contextPackage })
      }
      const result = await ctx.generateSceneCardsForChapter(activeWorkspace, project, contextPackage, modelId)
      if (!result.sceneCards.length) {
        const diagnostics = buildLLMResultDiagnostics(result.result)
        await appendNovelRun(activeWorkspace, {
          project_id: projectId,
          run_type: 'scene_cards',
          step_name: `chapter-${chapter.chapter_no}`,
          status: 'failed',
          input_ref: stringifyNovelGenerationPayload(req.body),
          output_ref: stringifyNovelGenerationPayload({ error: '模型未返回场景卡', llm_diagnostics: diagnostics, runtime_selection: (result.result as any)?.runtimeSelection || null, config_snapshot: configSnapshot }),
          error_message: '模型未返回场景卡',
        })
        return res.status(502).json({ error: '模型未返回场景卡', result: result.result, llm_diagnostics: diagnostics })
      }
      const updated = await updateNovelChapter(activeWorkspace, chapter.id, {
        scene_breakdown: result.sceneCards,
        scene_list: result.sceneCards,
        raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'manual_pipeline' },
      } as any, { createVersion: false })
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'scene_cards', step_name: `chapter-${chapter.chapter_no}`, status: 'success', input_ref: stringifyNovelGenerationPayload(req.body), output_ref: stringifyNovelGenerationPayload({ scene_cards: result.sceneCards, modelName: (result.result as any).modelName, config_snapshot: configSnapshot }) })
      res.json({ chapter: updated, scene_cards: result.sceneCards, result: result.result })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/chapters/:chapterId/generate-prose', async (req, res) => {
    try {
      const activeWorkspace = ctx.getWorkspace()
      const chapterId = Number(req.params.chapterId)
      const projectId = Number(req.body.project_id || 0)
      const modelId = Number(req.body.model_id || 0) || undefined
      const wantsStream = String(req.headers.accept || '').includes('text/event-stream') || String(req.query.stream || '') === '1'
      const autoRepairQualityGate = req.body?.auto_repair_quality_gate === true || req.body?.quality_gate_repair === true
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return res.status(404).json({ error: 'project not found' })
      const configSnapshot = ctx.buildAgentConfigSnapshot(project, modelId)
      if (ctx.generateChapterForGroup) {
        const pipeline: any[] = []
        const markServiceStage = async (key: string, payload: any = {}) => {
          const normalizedPayload = payload && typeof payload === 'object' ? payload : { detail: payload }
          const stage = compactStandaloneProseProgressStage({
            key,
            label: standaloneProseServiceStageLabel(key),
            status: normalizedPayload.status || 'running',
            detail: standaloneProseServiceStageDetail(normalizedPayload),
            at: new Date().toISOString(),
            ...normalizedPayload,
          })
          pipeline.push(stage)
          if (wantsStream && !res.writableEnded) {
            res.write(sseData({ type: 'progress', progress: stage.label, pipeline, stage }))
          }
        }
        if (wantsStream) {
          res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
          res.setHeader('Cache-Control', 'no-cache, no-transform')
          res.setHeader('Connection', 'keep-alive')
        }
        // Standalone prose generation auto-confirms only scene_cards: { approved: true }.
        const serviceApprovals = standaloneProseServiceApprovals(req.body?.approvals)
        const abortController = new AbortController()
        let standaloneProseCompleted = false
        const abortStandaloneProseGeneration = () => {
          if (standaloneProseCompleted || abortController.signal.aborted) return
          abortController.abort()
        }
        const standaloneProseAbortPoll = setInterval(() => {
          if (
            req.aborted
            || res.destroyed
            || req.socket?.destroyed
            || res.socket?.destroyed
          ) {
            abortStandaloneProseGeneration()
          }
        }, 1000)
        const writeStandaloneProseHeartbeat = () => {
          if (!wantsStream || standaloneProseCompleted || abortController.signal.aborted) return
          if (
            res.writableEnded
            || res.destroyed
            || req.aborted
            || req.socket?.destroyed
            || res.socket?.destroyed
          ) {
            abortStandaloneProseGeneration()
            return
          }
          try {
            res.write(': mangaforge-prose-heartbeat\n\n')
          } catch {
            abortStandaloneProseGeneration()
          }
        }
        const standaloneProseHeartbeat = setInterval(writeStandaloneProseHeartbeat, 15000)
        const cleanupStandaloneProseAbortListeners = () => {
          clearInterval(standaloneProseAbortPoll)
          clearInterval(standaloneProseHeartbeat)
          req.off('aborted', abortStandaloneProseGeneration)
          res.off('close', abortStandaloneProseGeneration)
          req.socket?.off('close', abortStandaloneProseGeneration)
          res.socket?.off('close', abortStandaloneProseGeneration)
        }
        req.on('aborted', abortStandaloneProseGeneration)
        res.on('close', abortStandaloneProseGeneration)
        req.socket?.on('close', abortStandaloneProseGeneration)
        res.socket?.on('close', abortStandaloneProseGeneration)
        try {
          const serviceResult = await ctx.generateChapterForGroup(activeWorkspace, projectId, chapterId, {
            ...(req.body || {}),
            ...(modelId ? { model_id: modelId } : {}),
            auto_repair_quality_gate: autoRepairQualityGate,
            approvals: serviceApprovals,
            onStage: markServiceStage,
            abortSignal: abortController.signal,
          })
          standaloneProseCompleted = true
          cleanupStandaloneProseAbortListeners()
          const updated = serviceResult?.chapter || null
          const finalText = String(updated?.chapter_text || '')
          const stepName = `chapter-${updated?.chapter_no || chapterId}`
          await appendNovelRun(activeWorkspace, {
            project_id: projectId,
            run_type: 'generate_prose',
            step_name: stepName,
            status: 'success',
            input_ref: stringifyNovelGenerationPayload(req.body),
            output_ref: stringifyNovelGenerationPayload({
              ...serviceResult,
              pipeline,
              config_snapshot: serviceResult?.config_snapshot || configSnapshot,
              chapter_text_length: countProseChars(finalText),
            }),
          })
          if (!wantsStream) return res.json({ ...serviceResult, result: serviceResult, pipeline, config_snapshot: serviceResult?.config_snapshot || configSnapshot })
          const chunkSize = Math.max(40, Math.ceil(finalText.length / 12))
          res.write(sseData({ type: 'progress', progress: '生成完成，开始输出正文...', pipeline }))
          for (let i = 0; i < finalText.length; i += chunkSize) {
            res.write(sseData({ type: 'chunk', text: finalText.slice(i, i + chunkSize) }))
            await new Promise(resolve => setTimeout(resolve, 40))
          }
          res.write(sseData({ type: 'done', ...serviceResult, result: serviceResult, pipeline, config_snapshot: serviceResult?.config_snapshot || configSnapshot }))
          res.end()
          return
        } catch (serviceError: any) {
          standaloneProseCompleted = true
          cleanupStandaloneProseAbortListeners()
          const errorPayload = {
            error: String(serviceError?.message || serviceError),
            error_code: serviceError?.code || serviceError?.error_code || 'PROSE_GENERATION_FAILED',
            pipeline,
            context_package: serviceError?.contextPackage || serviceError?.context_package,
            launch_gate_blocker: serviceError?.launchGateBlocker || serviceError?.launch_gate_blocker,
            reference_report: serviceError?.referenceReport || serviceError?.reference_report,
            safety_decision: serviceError?.safetyDecision || serviceError?.safety_decision,
            config_snapshot: configSnapshot,
          }
          await appendNovelRun(activeWorkspace, {
            project_id: projectId,
            run_type: 'generate_prose',
            step_name: `chapter-${chapterId}`,
            status: 'failed',
            input_ref: stringifyNovelGenerationPayload(req.body),
            output_ref: stringifyNovelGenerationPayload(errorPayload),
            error_message: errorPayload.error,
          })
          const status = standaloneProseServiceErrorStatus(serviceError)
          if (wantsStream) {
            res.write(sseData({ type: 'error', ...errorPayload }))
            res.end()
            return
          }
          return res.status(status).json(errorPayload)
        }
      }
      let chapters = await listNovelChapters(activeWorkspace, projectId)
      let chapter = chapters.find(item => item.id === chapterId)
      if (!chapter) return res.status(404).json({ error: 'chapter not found' })
      let [worldbuilding, characters, outlines, reviews] = await Promise.all([listNovelWorldbuilding(activeWorkspace, projectId), listNovelCharacters(activeWorkspace, projectId), listNovelOutlines(activeWorkspace, projectId), listNovelReviews(activeWorkspace, projectId)])
      const pipeline: any[] = []
      const markStage = (key: string, label: string, status: string, detail = '', extra: any = {}) => {
        const stage = { key, label, status, detail, at: new Date().toISOString(), ...extra }
        pipeline.push(stage)
        if (wantsStream && !res.writableEnded) {
          res.write(sseData({ type: 'progress', progress: label, pipeline, stage }))
        }
        return stage
      }
      if (wantsStream) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        res.setHeader('Connection', 'keep-alive')
      }
      markStage('context', '构建续写上下文包', 'running')
      let wordTarget = resolveChapterWordTarget(project, chapter, req.body || {})
      let contextPackage = applyChapterWordTargetToContext(
        await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews),
        wordTarget,
      )
      contextPackage = applyRequestLongformCompass(contextPackage, req)
      contextPackage = applyRequestLongformBattleContext(contextPackage, req)
      contextPackage = applyRequestNextBatchBrief(contextPackage, req)
      contextPackage = applyRequestChapterLaunchGate(contextPackage, req)
      contextPackage = applyRequestBatchPreflight(contextPackage, req)
      contextPackage = applyRequestMillionWordRunway(contextPackage, req)
      markStage(
        'context',
        contextPackage.preflight.ready ? '续写上下文包已就绪' : '续写上下文包存在缺口',
        contextPackage.preflight.ready ? 'success' : 'warn',
        contextPackage.preflight.warnings.join('；'),
        { context_package: contextPackage },
      )
      if (!contextPackage.preflight.ready && ctx.autoRepairChapterPreflightGaps) {
        markStage('material_repair', '自动补齐写作前置材料', 'running', contextPackage.preflight.warnings.join('；'))
        const repairResult = await ctx.autoRepairChapterPreflightGaps(activeWorkspace, project, chapter, contextPackage, modelId)
        chapters = await listNovelChapters(activeWorkspace, projectId)
        chapter = chapters.find(item => item.id === chapterId) || chapter
        const repairedMaterials = await Promise.all([
          listNovelWorldbuilding(activeWorkspace, projectId),
          listNovelCharacters(activeWorkspace, projectId),
          listNovelOutlines(activeWorkspace, projectId),
          listNovelReviews(activeWorkspace, projectId),
        ])
        worldbuilding = repairedMaterials[0]
        characters = repairedMaterials[1]
        outlines = repairedMaterials[2]
        reviews = repairedMaterials[3]
        wordTarget = resolveChapterWordTarget(project, chapter, req.body || {})
        contextPackage = applyChapterWordTargetToContext(
          await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews),
          wordTarget,
        )
        contextPackage = applyRequestLongformCompass(contextPackage, req)
        contextPackage = applyRequestLongformBattleContext(contextPackage, req)
        contextPackage = applyRequestNextBatchBrief(contextPackage, req)
        contextPackage = applyRequestChapterLaunchGate(contextPackage, req)
        contextPackage = applyRequestBatchPreflight(contextPackage, req)
        contextPackage = applyRequestMillionWordRunway(contextPackage, req)
        markStage(
          'material_repair',
          contextPackage.preflight.ready ? '前置材料已自动补齐' : '前置材料自动补齐后仍有缺口',
          contextPackage.preflight.ready ? 'success' : 'warn',
          contextPackage.preflight.ready ? '' : contextPackage.preflight.warnings.join('；'),
          { repair_result: repairResult, context_package: contextPackage },
        )
      }
      if (!contextPackage.preflight.ready && req.body?.allow_incomplete !== true) {
        const errorPayload = {
          error: '章节生成前置检查未通过',
          error_code: 'PROSE_PREFLIGHT_BLOCKED',
          context_package: contextPackage,
          config_snapshot: configSnapshot,
          preflight: contextPackage.preflight,
          pipeline,
        }
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: stringifyNovelGenerationPayload(req.body), output_ref: stringifyNovelGenerationPayload(errorPayload), error_message: '章节生成前置检查未通过' })
        if (wantsStream) {
          res.write(sseData({ type: 'error', ...errorPayload }))
          res.end()
          return
        }
        return res.status(412).json(errorPayload)
      }
      const launchGateBlocker = getChapterLaunchGateBlocker(standaloneChapterLaunchGateFromContext(contextPackage, chapter))
      if (launchGateBlocker && req.body?.allow_incomplete !== true) {
        const errorPayload = {
          error: `开写门禁未通过：${launchGateBlocker.summary}`,
          error_code: 'PROSE_LAUNCH_GATE_BLOCKED',
          launch_gate_blocker: launchGateBlocker,
          context_package: contextPackage,
          config_snapshot: configSnapshot,
          preflight: contextPackage.preflight,
          pipeline,
        }
        markStage('context', '开写门禁未通过', 'failed', launchGateBlocker.summary, { launch_gate_blocker: launchGateBlocker })
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: stringifyNovelGenerationPayload(req.body), output_ref: stringifyNovelGenerationPayload(errorPayload), error_message: errorPayload.error })
        if (wantsStream) {
          res.write(sseData({ type: 'error', ...errorPayload }))
          res.end()
          return
        }
        return res.status(412).json(errorPayload)
      }

      if (!contextPackage.chapter_target.scene_cards.length || req.body?.force_scene_cards === true) {
        markStage('scene_cards', '生成章节场景卡', 'running')
        try {
          const sceneResult = await ctx.generateSceneCardsForChapter(activeWorkspace, project, contextPackage, modelId)
          if (sceneResult.sceneCards.length > 0) {
            const updatedSceneChapter = await updateNovelChapter(activeWorkspace, chapter.id, {
              scene_breakdown: sceneResult.sceneCards,
              scene_list: sceneResult.sceneCards,
              raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'generated' },
            } as any, { createVersion: false })
            if (updatedSceneChapter) chapter = updatedSceneChapter
            chapters = await listNovelChapters(activeWorkspace, projectId)
            wordTarget = resolveChapterWordTarget(project, chapter, req.body || {})
            contextPackage = applyChapterWordTargetToContext(
              await ctx.buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews),
              wordTarget,
            )
            contextPackage = applyRequestLongformCompass(contextPackage, req)
            contextPackage = applyRequestLongformBattleContext(contextPackage, req)
            contextPackage = applyRequestNextBatchBrief(contextPackage, req)
            contextPackage = applyRequestChapterLaunchGate(contextPackage, req)
            contextPackage = applyRequestBatchPreflight(contextPackage, req)
            contextPackage = applyRequestMillionWordRunway(contextPackage, req)
            markStage('scene_cards', `场景卡已生成：${sceneResult.sceneCards.length} 个`, 'success', '', { scene_cards: sceneResult.sceneCards })
          } else {
            markStage('scene_cards', '场景卡生成为空，继续使用章节细纲', 'warn')
          }
        } catch (sceneError) {
          markStage('scene_cards', '场景卡生成失败，继续使用章节细纲', 'warn', String(sceneError).slice(0, 200))
        }
      }

      const prevChapters = compactPreviousChaptersForProse(chapters, chapter.chapter_no)
      markStage('migration_plan', '生成/读取参考迁移计划', 'running')
      const migrationPlan = await ctx.getReferenceMigrationPlanForChapter(activeWorkspace, project, chapter).catch(error => ({ error: String(error) }))
      markStage('migration_plan', (migrationPlan as any)?.error ? '参考迁移计划读取失败，继续保守生成' : '参考迁移计划已就绪', (migrationPlan as any)?.error ? 'warn' : 'success', (migrationPlan as any)?.error || '', { migration_plan: migrationPlan })
      markStage('draft', '段落级正文生成', 'running')
      const result = await generateNovelChapterProse(project, chapter, {
        worldbuilding,
        characters,
        outline: outlines,
        prompt: String(req.body.prompt || ''),
        prevChapters,
        contextPackage,
        migrationPlan,
        paragraphTask: ctx.buildParagraphProseContext(project, contextPackage, migrationPlan, chapter),
        maxTokens: proseMaxTokensForWordTarget(wordTarget),
      } as any, activeWorkspace, ctx.getStageModelId(project, 'draft', modelId))
      const resultPayload = getNovelPayload(result)
      let targetProse: any = null
      try {
        targetProse = selectTargetProsePayload(resultPayload, Number(chapter.chapter_no || 0))
      } catch (selectionError) {
        const errorPayload = { error: String(selectionError), error_code: 'PROSE_TARGET_MISMATCH', result, pipeline, context_package: contextPackage, config_snapshot: configSnapshot }
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: stringifyNovelGenerationPayload(req.body), output_ref: stringifyNovelGenerationPayload(errorPayload), error_message: String(selectionError) })
        if (wantsStream) {
          res.write(sseData({ type: 'error', ...errorPayload }))
          res.end()
          return
        }
        return res.status(502).json(errorPayload)
      }
      const plainProseFallback = extractPlainProseFallback(result, 800)
      const chapterText = targetProse?.chapter_text || targetProse?.chapterText || resultPayload?.chapter_text || resultPayload?.chapterText || plainProseFallback
      const sceneBreakdown = targetProse?.scene_breakdown || targetProse?.sceneBreakdown || resultPayload?.scene_breakdown || resultPayload?.sceneBreakdown || []
      const continuityNotes = targetProse?.continuity_notes || targetProse?.continuityNotes || resultPayload?.continuity_notes || resultPayload?.continuityNotes || []
      let ohStoryDeliveryReceipts = extractOhStoryDeliveryReceipts(targetProse, resultPayload)
      if (!chapterText) {
        const resultError = String((result as any).error || (result as any).fallbackReason || '模型未返回正文')
        const runtimeDiagnostics = {
          result_error: resultError,
          output_source: (result as any).outputSource || '',
          model_id: (result as any).modelId || (result as any).runtimeSelection?.model?.id,
          model_name: (result as any).modelName || (result as any).runtimeSelection?.model?.model_name,
          provider_id: (result as any).providerId || (result as any).runtimeSelection?.provider?.id,
          runtime_selection: (result as any).runtimeSelection || null,
          llm_diagnostics: buildLLMResultDiagnostics(result),
        }
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: stringifyNovelGenerationPayload(req.body), output_ref: stringifyNovelGenerationPayload({ ...(resultPayload || {}), ...runtimeDiagnostics, config_snapshot: configSnapshot }), error_message: resultError })
        const errorPayload = { error: resultError, ...runtimeDiagnostics, result, pipeline, context_package: contextPackage, config_snapshot: configSnapshot }
        if (wantsStream) {
          res.write(sseData({ type: 'error', ...errorPayload }))
          res.end()
          return
        }
        return res.status(502).json(errorPayload)
      }
      let selfCheck: any = null
      let editorRewrite: any = null
      let finalText = String(chapterText || '')
      let finalSceneBreakdown = sceneBreakdown
      let finalContinuityNotes = continuityNotes
      const draftAppendixStrip = stripProseEngineeringAppendix(finalText)
      if (draftAppendixStrip.changed) {
        finalText = draftAppendixStrip.text
      }
      markStage('draft', '章节初稿已生成', 'success', `${countProseChars(finalText)} 字`)
      markStage('word_target', '核对章节字数目标', 'running', `当前 ${countProseChars(finalText)} 字 / 目标 ${wordTarget.target} 字`)
      try {
        const wordTargetCheck = await ctx.ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, modelId)
        finalText = wordTargetCheck.final_text || finalText
        if (wordTargetCheck.expanded && wordTargetCheck.expansion) {
          finalSceneBreakdown = wordTargetCheck.expansion.scene_breakdown?.length ? wordTargetCheck.expansion.scene_breakdown : finalSceneBreakdown
          finalContinuityNotes = wordTargetCheck.expansion.continuity_notes?.length ? wordTargetCheck.expansion.continuity_notes : finalContinuityNotes
        }
        markStage(
          'word_target',
          wordTargetCheck.expanded ? '正文已按字数目标扩写' : '正文达到字数目标',
          'success',
          `当前 ${countProseChars(finalText)} 字 / 目标 ${wordTarget.target} 字`,
          { word_target_check: wordTargetCheck },
        )
      } catch (wordTargetError: any) {
        const errorPayload = {
          error: String(wordTargetError?.message || wordTargetError || '章节正文低于字数下限'),
          error_code: wordTargetError?.code || 'PROSE_WORD_TARGET_SHORT',
          word_target: wordTargetError?.word_target || wordTarget,
          word_target_check: {
            evaluation: wordTargetError?.evaluation,
            final_evaluation: wordTargetError?.final_evaluation,
            expansion_attempts: wordTargetError?.expansion_attempts,
          },
          pipeline,
          context_package: contextPackage,
          config_snapshot: configSnapshot,
        }
        markStage('word_target', '章节正文低于字数下限', 'failed', errorPayload.error, { word_target_check: errorPayload.word_target_check })
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: stringifyNovelGenerationPayload(req.body), output_ref: stringifyNovelGenerationPayload(errorPayload), error_message: errorPayload.error })
        if (wantsStream) {
          res.write(sseData({ type: 'error', ...errorPayload }))
          res.end()
          return
        }
        return res.status(502).json(errorPayload)
      }
      markStage('editor', '商业主编改稿', 'running')
      try {
        editorRewrite = await ctx.runCommercialEditorRewrite(activeWorkspace, project, contextPackage, finalText, modelId)
        const editorRevisionSelection = selectUsableRevisionText(finalText, editorRewrite)
        finalText = editorRevisionSelection.text
        if (!editorRevisionSelection.accepted && editorRevisionSelection.reason) {
          editorRewrite = { ...editorRewrite, final_text_rejected: true, rejected_final_text_reason: editorRevisionSelection.reason }
        }
        if (editorRevisionSelection.accepted && editorRewrite.edited && editorRewrite.revision) {
          finalSceneBreakdown = editorRewrite.revision.scene_breakdown?.length ? editorRewrite.revision.scene_breakdown : finalSceneBreakdown
          finalContinuityNotes = editorRewrite.revision.continuity_notes?.length ? editorRewrite.revision.continuity_notes : finalContinuityNotes
        }
        markStage(
          'editor',
          editorRewrite.edited ? '商业主编改稿已应用' : '商业主编改稿无可用修订',
          editorRewrite.edited ? 'success' : 'warn',
          `${countProseChars(finalText)} 字`,
          { editor_rewrite: editorRewrite },
        )
      } catch (editorError) {
        editorRewrite = { error: String(editorError), edited: false }
        markStage('editor', '商业主编改稿失败，保留当前稿', 'warn', String(editorError).slice(0, 200), { editor_rewrite: editorRewrite })
      }
      try {
        const postEditorWordTargetCheck = await ctx.ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, modelId)
        finalText = postEditorWordTargetCheck.final_text || finalText
        if (postEditorWordTargetCheck.expanded && postEditorWordTargetCheck.expansion) {
          finalSceneBreakdown = postEditorWordTargetCheck.expansion.scene_breakdown?.length ? postEditorWordTargetCheck.expansion.scene_breakdown : finalSceneBreakdown
          finalContinuityNotes = postEditorWordTargetCheck.expansion.continuity_notes?.length ? postEditorWordTargetCheck.expansion.continuity_notes : finalContinuityNotes
          markStage('word_target', '主编改稿后正文已重新补足字数', 'success', `当前 ${countProseChars(finalText)} 字 / 目标 ${wordTarget.target} 字`, { word_target_check: postEditorWordTargetCheck, phase: 'post_editor' })
        }
      } catch (wordTargetError: any) {
        const errorPayload = {
          error: String(wordTargetError?.message || wordTargetError || '章节正文低于字数下限'),
          error_code: wordTargetError?.code || 'PROSE_WORD_TARGET_SHORT',
          word_target: wordTargetError?.word_target || wordTarget,
          word_target_check: {
            evaluation: wordTargetError?.evaluation,
            final_evaluation: wordTargetError?.final_evaluation,
            expansion_attempts: wordTargetError?.expansion_attempts,
            phase: 'post_editor',
          },
          pipeline,
          context_package: contextPackage,
          editor_rewrite: editorRewrite,
          config_snapshot: configSnapshot,
        }
        markStage('word_target', '主编改稿后正文低于字数下限', 'failed', errorPayload.error, { word_target_check: errorPayload.word_target_check })
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: stringifyNovelGenerationPayload(req.body), output_ref: stringifyNovelGenerationPayload(errorPayload), error_message: errorPayload.error })
        if (wantsStream) {
          res.write(sseData({ type: 'error', ...errorPayload }))
          res.end()
          return
        }
        return res.status(502).json(errorPayload)
      }
      markStage('review', '执行章节自检', 'running')
      try {
        selfCheck = await ctx.runProseSelfReviewAndRevision(activeWorkspace, project, contextPackage, finalText, modelId, {
          ...(autoRepairQualityGate ? { fill_missing_structured_checks: false } : {}),
        })
        const selfCheckRevisionSelection = selectUsableRevisionText(finalText, selfCheck)
        finalText = selfCheckRevisionSelection.text
        if (!selfCheckRevisionSelection.accepted && selfCheckRevisionSelection.reason) {
          selfCheck = { ...selfCheck, final_text_rejected: true, rejected_final_text_reason: selfCheckRevisionSelection.reason }
        }
        if (selfCheckRevisionSelection.accepted && selfCheck.revised && selfCheck.revision) {
          finalSceneBreakdown = selfCheck.revision.scene_breakdown?.length ? selfCheck.revision.scene_breakdown : finalSceneBreakdown
          finalContinuityNotes = selfCheck.revision.continuity_notes?.length ? selfCheck.revision.continuity_notes : finalContinuityNotes
        }
        markStage(
          'review',
          selfCheck.revised && selfCheckRevisionSelection.accepted ? '自检完成，已应用修订稿' : '自检完成，初稿可用',
          selfCheck.review?.passed === false ? 'warn' : 'success',
          `评分 ${selfCheck.review?.score ?? '-'}`,
          { self_check: selfCheck.review, revised: selfCheck.revised },
        )
      } catch (reviewError) {
        selfCheck = { error: String(reviewError), revised: false }
        markStage('review', '自检失败，保留初稿', 'warn', String(reviewError).slice(0, 200), { self_check: selfCheck })
      }
      try {
        const postReviewWordTargetCheck = await ctx.ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, modelId)
        finalText = postReviewWordTargetCheck.final_text || finalText
        if (postReviewWordTargetCheck.expanded && postReviewWordTargetCheck.expansion) {
          finalSceneBreakdown = postReviewWordTargetCheck.expansion.scene_breakdown?.length ? postReviewWordTargetCheck.expansion.scene_breakdown : finalSceneBreakdown
          finalContinuityNotes = postReviewWordTargetCheck.expansion.continuity_notes?.length ? postReviewWordTargetCheck.expansion.continuity_notes : finalContinuityNotes
          markStage('word_target', '自检后正文已重新补足字数', 'success', `当前 ${countProseChars(finalText)} 字 / 目标 ${wordTarget.target} 字`, { word_target_check: postReviewWordTargetCheck })
        }
      } catch (wordTargetError: any) {
        const errorPayload = {
          error: String(wordTargetError?.message || wordTargetError || '章节正文低于字数下限'),
          error_code: wordTargetError?.code || 'PROSE_WORD_TARGET_SHORT',
          word_target: wordTargetError?.word_target || wordTarget,
          word_target_check: {
            evaluation: wordTargetError?.evaluation,
            final_evaluation: wordTargetError?.final_evaluation,
            expansion_attempts: wordTargetError?.expansion_attempts,
          },
          pipeline,
          context_package: contextPackage,
          self_check: selfCheck,
          config_snapshot: configSnapshot,
        }
        markStage('word_target', '自检后正文仍低于字数下限', 'failed', errorPayload.error, { word_target_check: errorPayload.word_target_check })
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: stringifyNovelGenerationPayload(req.body), output_ref: stringifyNovelGenerationPayload(errorPayload), error_message: errorPayload.error })
        if (wantsStream) {
          res.write(sseData({ type: 'error', ...errorPayload }))
          res.end()
          return
        }
        return res.status(502).json(errorPayload)
      }
      const appendixStrip = stripProseEngineeringAppendix(finalText)
      if (appendixStrip.changed) {
        finalText = appendixStrip.text
        markStage('review', '确定性工程附录剥离', 'success', `${appendixStrip.removed_line_count} 行`, {
          phase: 'deterministic_engineering_appendix_strip',
        })
      }
      if (autoRepairQualityGate && !selfCheck?.error) {
        markStage('review', '修订后正文质量复检', 'running', '', { phase: 'quality_recheck' })
        const finalQualityRecheck = await ctx.runProseSelfReviewAndRevision(activeWorkspace, project, contextPackage, finalText, modelId, {
          revise: false,
          quality_gate_repair: true,
        })
        const finalQualityRecheckSelection = selectUsableRevisionText(finalText, finalQualityRecheck)
        finalText = finalQualityRecheckSelection.text
        selfCheck = {
          ...selfCheck,
          review: finalQualityRecheck.review,
          final_text: finalText,
          initial_review: selfCheck?.review || null,
          quality_recheck: finalQualityRecheck.review,
          revised: Boolean(selfCheck?.revised),
          ...(!finalQualityRecheckSelection.accepted && finalQualityRecheckSelection.reason ? {
            final_text_recheck_rejected: true,
            rejected_final_text_recheck_reason: finalQualityRecheckSelection.reason,
          } : {}),
        }
        markStage('review', '修订后正文质量复检完成', 'success', `评分 ${selfCheck.review?.score ?? '-'}`, {
          phase: 'quality_recheck',
          self_check: selfCheck.review,
        })
      }
      const languageNormalization = normalizeDeterministicProseLanguageFragments(finalText)
      if (languageNormalization.changed) {
        finalText = languageNormalization.text
        if (selfCheck?.review) {
          selfCheck = {
            ...selfCheck,
            review: resolveProseLanguageRiskReview(selfCheck.review, finalText),
          }
        }
        markStage('review', '确定性语言碎片清理', 'success', `${languageNormalization.change_count} 处`, {
          phase: 'deterministic_language_normalize',
          language_rules: languageNormalization.rules,
        })
      }
      let qualityGateDecision = getQualityGateDecision(project, { ...(selfCheck?.review || {}), revised: Boolean(selfCheck?.revised) })
      if (!qualityGateDecision.passed && autoRepairQualityGate) {
        markStage('quality_repair', '质量门禁自动修复', 'running', qualityGateDecision.reasons.join('；'), { quality_gate: qualityGateDecision })
        try {
          const qualityRepair = await ctx.runProseSelfReviewAndRevision(activeWorkspace, project, contextPackage, finalText, modelId, {
            fill_missing_structured_checks: false,
          })
          const qualityRepairSelection = selectUsableRevisionText(finalText, qualityRepair)
          finalText = qualityRepairSelection.text
          selfCheck = {
            ...qualityRepair,
            quality_repair_attempted: true,
            previous_review: selfCheck?.review || null,
            ...(!qualityRepairSelection.accepted && qualityRepairSelection.reason ? {
              final_text_rejected: true,
              rejected_final_text_reason: qualityRepairSelection.reason,
            } : {}),
          }
          if (qualityRepairSelection.accepted && qualityRepair.revised && qualityRepair.revision) {
            finalSceneBreakdown = qualityRepair.revision.scene_breakdown?.length ? qualityRepair.revision.scene_breakdown : finalSceneBreakdown
            finalContinuityNotes = qualityRepair.revision.continuity_notes?.length ? qualityRepair.revision.continuity_notes : finalContinuityNotes
          }
          const postQualityRepairWordTargetCheck = await ctx.ensureProseMeetsWordTarget(activeWorkspace, project, contextPackage, finalText, modelId)
          finalText = postQualityRepairWordTargetCheck.final_text || finalText
          const qualityRepairRecheck = await ctx.runProseSelfReviewAndRevision(activeWorkspace, project, contextPackage, finalText, modelId, {
            revise: false,
            quality_gate_repair: true,
          })
          const qualityRepairRecheckSelection = selectUsableRevisionText(finalText, qualityRepairRecheck)
          finalText = qualityRepairRecheckSelection.text
          selfCheck = {
            ...selfCheck,
            review: qualityRepairRecheck.review,
            final_text: finalText,
            quality_recheck: qualityRepairRecheck.review,
            revised: Boolean(selfCheck?.revised),
            ...(!qualityRepairRecheckSelection.accepted && qualityRepairRecheckSelection.reason ? {
              final_text_recheck_rejected: true,
              rejected_final_text_recheck_reason: qualityRepairRecheckSelection.reason,
            } : {}),
          }
          qualityGateDecision = getQualityGateDecision(project, { ...(selfCheck?.review || {}), revised: Boolean(selfCheck?.revised) })
          markStage('review', '质量门禁修复后复检完成', qualityGateDecision.passed ? 'success' : 'warn', qualityGateDecision.reasons.join('；'), {
            quality_gate: qualityGateDecision,
            self_check: selfCheck?.review,
            phase: 'quality_recheck',
          })
          markStage(
            'quality_repair',
            qualityGateDecision.passed ? '质量门禁自动修复通过' : '质量门禁自动修复后仍未通过',
            qualityGateDecision.passed ? 'success' : 'warn',
            qualityGateDecision.reasons.join('；'),
            { quality_gate: qualityGateDecision, self_check: selfCheck?.review, word_target_check: postQualityRepairWordTargetCheck },
          )
        } catch (qualityRepairError) {
          markStage('quality_repair', '质量门禁自动修复失败', 'warn', String(qualityRepairError).slice(0, 200), { quality_gate: qualityGateDecision })
        }
      }
      ohStoryDeliveryReceipts = refreshOhStoryDeliveryReceiptsAfterRevision(ohStoryDeliveryReceipts, selfCheck, finalText, finalSceneBreakdown, contextPackage)

      try {
        const review = selfCheck?.review || {}
        await createNovelReview(activeWorkspace, {
          project_id: projectId,
          review_type: 'prose_quality',
          status: qualityGateDecision.passed ? 'ok' : 'warn',
          summary: `章节自检评分 ${review.score ?? '-'}${selfCheck?.revised ? '，已生成修订稿' : ''}`,
          issues: Array.isArray(review.issues) ? review.issues.map(formatReviewIssueForStorage) : [],
          payload: stringifyNovelGenerationPayload({ chapter_id: chapter.id, context_package: contextPackage, editor_rewrite: editorRewrite, self_check: selfCheck, quality_gate: qualityGateDecision, pipeline, config_snapshot: configSnapshot }),
        })
      } catch (reviewStoreError) {
        console.warn('[prose-quality] Failed to store review:', String(reviewStoreError).slice(0, 200))
      }
      if (!qualityGateDecision.passed && req.body?.allow_incomplete !== true) {
        const errorPayload = {
          error: '章节质量门禁未通过，正文未入库',
          error_code: 'PROSE_QUALITY_GATE_BLOCKED',
          quality_gate: qualityGateDecision,
          context_package: contextPackage,
          self_check: selfCheck,
          editor_rewrite: editorRewrite,
          pipeline,
          config_snapshot: configSnapshot,
        }
        markStage('review', '章节质量门禁未通过', 'failed', qualityGateDecision.reasons.join('；'), { quality_gate: qualityGateDecision })
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: stringifyNovelGenerationPayload(req.body), output_ref: stringifyNovelGenerationPayload(errorPayload), error_message: errorPayload.error })
        if (wantsStream) {
          res.write(sseData({ type: 'error', ...errorPayload }))
          res.end()
          return
        }
        return res.status(409).json(errorPayload)
      }
      let referenceReport: any = null
      let safetyDecision: any = null
      let migrationAudit: any = null
      try {
        markStage('reference_report', '生成参考使用报告', 'running')
        referenceReport = await ctx.buildReferenceUsageReport(activeWorkspace, project, '正文创作', finalText)
        safetyDecision = ctx.getReferenceSafetyDecision(project, referenceReport)
        const safetyExplanation = ctx.explainReferenceSafety(referenceReport, safetyDecision)
        migrationAudit = ctx.buildMigrationAudit(project, referenceReport, safetyExplanation)
        markStage('reference_report', safetyDecision.blocked ? '参考安全阈值未通过' : '参考使用报告已生成', safetyDecision.blocked ? 'failed' : 'success', safetyDecision.reasons?.join('；') || '', { reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit })
      } catch (reportError) {
        markStage('reference_report', '参考使用报告生成失败', 'warn', String(reportError).slice(0, 200))
        console.warn('[reference-report] Failed:', String(reportError).slice(0, 200))
      }
      const safetyExplanation = referenceReport && safetyDecision ? ctx.explainReferenceSafety(referenceReport, safetyDecision) : null
      if (!migrationAudit && referenceReport && safetyExplanation) migrationAudit = ctx.buildMigrationAudit(project, referenceReport, safetyExplanation)
      if (safetyDecision?.blocked) {
        const errorPayload = { error: '仿写安全阈值未通过，正文未入库', error_code: 'REFERENCE_SAFETY_BLOCKED', reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit, context_package: contextPackage, self_check: selfCheck, pipeline, config_snapshot: configSnapshot }
        await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'failed', input_ref: stringifyNovelGenerationPayload(req.body), output_ref: stringifyNovelGenerationPayload(errorPayload), error_message: safetyDecision.reasons?.join('；') || '仿写安全阈值未通过' })
        if (wantsStream) {
          res.write(sseData({ type: 'error', ...errorPayload }))
          res.end()
          return
        }
        return res.status(409).json(errorPayload)
      }
      markStage('store', '写入章节正文与版本', 'running')
      const beforeText = String(chapter.chapter_text || '')
      const updated = await updateNovelChapter(activeWorkspace, chapter.id, {
        chapter_text: finalText,
        continuity_notes: finalContinuityNotes,
        raw_payload: {
          ...(chapter.raw_payload || {}),
          generated_scene_breakdown: finalSceneBreakdown,
          oh_story_delivery_receipts: ohStoryDeliveryReceipts,
          chapter_blueprint: ohStoryDeliveryReceipts.chapter_blueprint,
          pre_draft_execution_receipts: ohStoryDeliveryReceipts.pre_draft_execution_receipts,
          scene_card_receipts: ohStoryDeliveryReceipts.scene_card_receipts,
          delivery_risk_receipts: ohStoryDeliveryReceipts.delivery_risk_receipts,
          revision_receipts: ohStoryDeliveryReceipts.revision_receipts,
          deslop_repair_receipts: ohStoryDeliveryReceipts.deslop_repair_receipts,
          quality_audit_repair_receipts: ohStoryDeliveryReceipts.quality_audit_repair_receipts,
        },
        status: 'draft',
      }, { versionSource: selfCheck?.revised ? 'repair' : editorRewrite?.edited ? 'editor_rewrite' : 'agent_execute' })
      const versionsAfterStore = await listChapterVersions(activeWorkspace, chapter.id).catch(() => [])
      const previousVersion = versionsAfterStore[0] || null
      const generationDiff = buildTextDiffSummary(beforeText, finalText)
      markStage('store', '章节已写入', 'success')
      let storyStateUpdate: any = null
      try {
        markStage('story_state', '更新故事状态机', 'running')
        storyStateUpdate = await ctx.updateStoryStateMachine(activeWorkspace, project, chapter, contextPackage, finalText, modelId)
        markStage('story_state', '故事状态机已更新', 'success', '', { story_state_update: storyStateUpdate })
      } catch (stateError) {
        markStage('story_state', '故事状态机更新失败', 'warn', String(stateError).slice(0, 200))
      }
      const pipelineResult = { context_package: contextPackage, editor_rewrite: editorRewrite, self_check: selfCheck, oh_story_delivery_receipts: ohStoryDeliveryReceipts, pipeline, diff: generationDiff, previous_version: previousVersion, config_snapshot: configSnapshot }
      await appendNovelRun(activeWorkspace, { project_id: projectId, run_type: 'generate_prose', step_name: `chapter-${chapter.chapter_no}`, status: 'success', input_ref: stringifyNovelGenerationPayload(req.body), output_ref: stringifyNovelGenerationPayload({ outputSource: (result as any).outputSource, modelId: (result as any).modelId, modelName: (result as any).modelName, providerId: (result as any).providerId, usage: (result as any).usage, reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit, story_state_update: storyStateUpdate, ...pipelineResult }) })
      if (!wantsStream) return res.json({ chapter: updated, result, reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit, story_state_update: storyStateUpdate, ...pipelineResult })
      const fullText = String(finalText || '')
      const chunkSize = Math.max(40, Math.ceil(fullText.length / 12))
      res.write(sseData({ type: 'progress', progress: '生成完成，开始输出正文...', pipeline }))
      for (let i = 0; i < fullText.length; i += chunkSize) {
        const chunk = fullText.slice(i, i + chunkSize)
        res.write(sseData({ type: 'chunk', text: chunk }))
        await new Promise(resolve => setTimeout(resolve, 40))
      }
      res.write(sseData({ type: 'done', chapter: updated, result, reference_report: referenceReport, safety_decision: safetyDecision, safety_explanation: safetyExplanation, migration_audit: migrationAudit, story_state_update: storyStateUpdate, ...pipelineResult }))
      res.end()
    } catch (error) {
      if (res.headersSent) {
        res.write(sseData({ type: 'error', error: String(error) }))
        res.end()
        return
      }
      res.status(500).json({ error: String(error) })
    }
  })
}
