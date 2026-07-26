import {
  appendNovelRun,
  createNovelChapter,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelWorldbuilding,
  updateNovelChapter,
  updateNovelRun,
} from '../../novel'
import { buildMaterialScore } from '../novel-chapter-context-routes'
import { asArray, buildLLMResultDiagnostics, compactText, getNovelPayload, normalizeSceneProduction, parseJsonLikePayload, safeJsonStringify } from '../novel-route-utils'
import { applyChapterWordTargetToContext, countProseChars, normalizeDeliveryRiskReceipts, resolveChapterWordTarget } from '../novel-writing-service'
import { compactProseGenerationOverride } from '../../novel-writing/prose-generation-contract'
import { applyZhuqueFastPathOptions } from '../../novel-writing/zhuque-fast-path'

export function stringifyNovelGenerationPayload(value: any) {
  return safeJsonStringify(value, undefined, 0)
}

export function sseData(value: any) {
  return `data: ${stringifyNovelGenerationPayload(value)}\n\n`
}

export function outlineChapterNo(outline: any) {
  const rawNo = Number(outline.raw_payload?.chapter_no || outline.raw_payload?.future100?.chapter_no || 0)
  if (rawNo) return rawNo
  const match = String(outline.title || '').match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : 0
}

export function activeChapterNo(chapters: any[] = []) {
  return chapters.reduce((max, chapter) => Math.max(max, Number(chapter?.chapter_no || 0)), 0)
}

export function isApprovalBlockerChapter(item: any = {}, payload: any = {}, stage = '') {
  return String(stage || '') === 'approval_blocker'
    || item?.error_code === 'APPROVAL_BLOCKER'
    || payload?.last_error?.error_code === 'APPROVAL_BLOCKER'
    || item?.approval_stage === 'approval_blocker'
    || payload?.last_error?.approval_stage === 'approval_blocker'
}

export function approvalBlockerRoutePayload(item: any = {}, payload: any = {}, action = '继续') {
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

export function isTerminalAdmissionChapter(item: any = {}, payload: any = {}) {
  const lastError = payload?.last_error || payload?.lastError || {}
  return String(item?.admission_status || item?.admissionStatus || lastError?.admission_status || lastError?.admissionStatus || '') === 'blocked_invalid'
    || String(item?.error_code || item?.errorCode || lastError?.error_code || lastError?.errorCode || '') === 'PROSE_ADMISSION_BLOCKED_INVALID'
}

export function terminalAdmissionRoutePayload(item: any = {}, payload: any = {}, action = '继续') {
  return {
    error: `当前章节正文未通过有效性检查且未入库，不能${action}；需要显式修复或重置终态。`,
    error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
    admission_status: 'blocked_invalid',
    chapter_id: item.id || null,
    chapter_no: item.chapter_no || null,
    recovery_plan: payload.last_error?.recovery_plan || item.recovery_plan || {
      type: 'blocked_invalid',
      actions: ['显式修复或重置当前章节终态', '重新提交正文生成'],
    },
  }
}

export function isLegacyQualityGateApproval(item: any = {}, payload: any = {}, stage = '') {
  const lastError = payload?.last_error || payload?.lastError || {}
  const persistedStage = String(item?.approval_stage || item?.approvalStage || lastError?.approval_stage || lastError?.approvalStage || '')
  const requestedStage = String(stage || '')
  const errorCode = String(item?.error_code || item?.errorCode || lastError?.error_code || lastError?.errorCode || '')
  return (persistedStage === 'quality_gate' || requestedStage === 'quality_gate') && errorCode === 'APPROVAL_REQUIRED'
}

export function legacyQualityGateRoutePayload(item: any = {}, action = '继续') {
  return {
    error: `旧质量门禁审批项不能${action}触发自动生成；需要显式修复后重新提交。`,
    error_code: 'APPROVAL_REQUIRED',
    approval_stage: 'quality_gate',
    chapter_id: item.id || null,
    chapter_no: item.chapter_no || null,
  }
}

export function futureSkeletonFromOutline(outline: any) {
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

export function collectMissingPlanningChapterNos(startNo: number, targetNo: number, chapterByNo: Map<number, any>, outlinesByChapterNo: Map<number, any>) {
  const missing: number[] = []
  for (let chapterNo = startNo; chapterNo <= targetNo; chapterNo += 1) {
    if (!hasChapterPlanningMaterial(chapterByNo.get(chapterNo), outlinesByChapterNo.get(chapterNo))) {
      missing.push(chapterNo)
    }
  }
  return missing
}

export function compactPlanningEnsureResult(result: any = {}) {
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

export function scoreFutureSkeletonChapter(item: any) {
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

export function resolveChapterGroupQualityThreshold(body: any = {}, project: any = {}) {
  return [
    body?.quality_threshold,
    body?.qualityThreshold,
    project?.reference_config?.quality_gate?.min_score,
    project?.reference_config?.quality_gate?.minScore,
    78,
  ]
    .map(value => Number(value))
    .find(value => Number.isFinite(value) && value > 0) || 78
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

function compactStandalonePromptDiagnostics(value: any) {
  if (!value || typeof value !== 'object') return undefined
  return compactStandaloneProseProgressValue({
    prompt_chars: value.prompt_chars ?? value.promptChars,
    required_chars: value.required_chars ?? value.requiredChars,
    selected_contract_keys: value.selected_contract_keys ?? value.selectedContractKeys,
    omitted_contract_keys: value.omitted_contract_keys ?? value.omittedContractKeys,
    section_chars: value.section_chars ?? value.sectionChars,
    downgrades: value.downgrades,
    budget_chars: value.budget_chars ?? value.budgetChars,
    model_usage: value.model_usage ?? value.modelUsage,
  })
}

function compactStandaloneQualityLoop(value: any) {
  if (!value || typeof value !== 'object') return undefined
  const decision = value.decision && typeof value.decision === 'object'
    ? {
        passed: value.decision.passed,
        approvable: value.decision.approvable,
        score: value.decision.score,
        min_score: value.decision.min_score ?? value.decision.minScore,
        hard_failures: asArray(value.decision.hard_failures || value.decision.hardFailures).map((item: any) => ({
          key: item?.key,
          message: item?.message,
          source: item?.source,
        })),
        advisory_failures: value.decision.advisory_failures ?? value.decision.advisoryFailures,
      }
    : undefined
  return compactStandaloneProseProgressValue({
    rounds: asArray(value.rounds).map((item: any) => ({
      round: item?.round,
      accepted: item?.accepted,
      reason: item?.reason,
    })),
    decision,
  })
}

export function buildStandaloneProseServiceErrorPayload(serviceError: any, pipeline: any[], configSnapshot: any, chapterIdentity: any = {}) {
  const admissionStatus = String(serviceError?.admission_status || serviceError?.admissionStatus || '')
  const blockedInvalid = admissionStatus === 'blocked_invalid'
  // Keep residual prose for Zhuque/export even when admission blocks storage.
  // Progress compaction drops chapter_text from pipeline stages; recover it here.
  const residualCandidates = [
    serviceError?.chapter_text,
    serviceError?.chapterText,
    serviceError?.finalText,
    serviceError?.final_text,
    serviceError?.text,
    serviceError?.details?.chapter_text,
    serviceError?.details?.chapterText,
    serviceError?.admission_failure?.details?.chapter_text,
    serviceError?.admission_failure?.details?.chapterText,
  ]
  const residualText = residualCandidates.find((item: any) => typeof item === 'string' && item.trim().length > 200)
  return {
    error: String(serviceError?.message || serviceError),
    error_code: serviceError?.code || serviceError?.error_code || (blockedInvalid ? 'PROSE_ADMISSION_BLOCKED_INVALID' : 'PROSE_GENERATION_FAILED'),
    ...(blockedInvalid ? {
      admission_status: 'blocked_invalid',
      chapter_id: chapterIdentity?.chapter_id ?? chapterIdentity?.chapterId ?? serviceError?.chapter_id ?? serviceError?.chapterId ?? null,
      chapter_no: chapterIdentity?.chapter_no ?? chapterIdentity?.chapterNo ?? serviceError?.chapter_no ?? serviceError?.chapterNo ?? null,
    } : {}),
    ...(typeof residualText === 'string' ? {
      chapter_text: residualText,
      finalText: residualText,
      details: {
        ...(serviceError?.details && typeof serviceError.details === 'object' ? serviceError.details : {}),
        chapter_text: residualText,
      },
    } : {}),
    pipeline,
    launch_gate_blocker: serviceError?.launchGateBlocker || serviceError?.launch_gate_blocker,
    reference_report: serviceError?.referenceReport || serviceError?.reference_report,
    safety_decision: serviceError?.safetyDecision || serviceError?.safety_decision,
    prompt_diagnostics: compactStandalonePromptDiagnostics(serviceError?.promptDiagnostics || serviceError?.prompt_diagnostics),
    quality_loop: compactStandaloneQualityLoop(serviceError?.qualityLoop || serviceError?.quality_loop),
    config_snapshot: configSnapshot,
  }
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

export type GenerationRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  getModelStrategy: (project: any, preferredModelId?: number) => any
  getApprovalPolicy: (project: any) => any
  buildAgentConfigSnapshot: (project: any, preferredModelId?: number) => any
  buildChapterGroupStages: () => any[]
  updateChapterStages: (stages: any[], key: string, patch?: any) => any[]
  classifyGenerationFailure: (error: any) => any
  executeChapterGroupRunRecord: (workspace: string, project: any, run: any, options?: any) => Promise<any>
  generateChapterForGroup: (workspace: string, projectId: number, chapterId: number, options?: any) => Promise<any>
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
  generateSceneCardsForChapter: (workspace: string, project: any, contextPackage: any, modelId?: number) => Promise<any>
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

export function standaloneProseServiceStageLabel(key: string) {
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
    humanize_postprocess: 'R76人味后处理',
    opening_handoff_bridge: '开篇强交接桥接',
    zhuque_fast: '朱雀验证快路径',
  }
  return labels[key] || key
}

export function standaloneProseServiceStageDetail(payload: any = {}) {
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

export function standaloneProseServiceErrorStatus(error: any) {
  const code = String(error?.code || error?.error_code || '')
  const message = String(error?.message || error || '')
  if (code.includes('PREFLIGHT') || code.includes('LAUNCH_GATE') || code.includes('SCENE_CARDS')) return 412
  if (code.includes('REFERENCE_SAFETY') || code.includes('QUALITY') || code.includes('APPROVAL')) return 409
  if (message.includes('project not found') || message.includes('chapter not found')) return 404
  return 500
}

export function buildStandaloneProseServiceOptions(body: any = {}, runtime: {
  modelId?: number
  autoRepairQualityGate: boolean
  onStage: (key: string, payload?: any) => Promise<void>
  abortSignal: AbortSignal
}) {
  const merged = {
    ...(body || {}),
    ...(runtime.modelId ? { model_id: runtime.modelId } : {}),
    auto_repair_quality_gate: runtime.autoRepairQualityGate,
    // Match unattended writing: auto-fill local/model materials before hard-blocking the cockpit generate path.
    auto_repair_missing_material: body?.auto_repair_missing_material !== false,
    approvals: body?.approvals || {},
    onStage: runtime.onStage,
    abortSignal: runtime.abortSignal,
  }
  // production_mode=zhuque_fast | draft_humanize_store | zhuque_validate or zhuque_fast:true
  return applyZhuqueFastPathOptions(merged)
}

