import { appendNovelRun, listNovelRuns, updateNovelRun } from '../novel'
import { advanceSceneProduction, compactText, getQualityGate, getSafetyPolicy, getStyleLock, normalizeSceneProduction, parseJsonLikePayload, safeJsonStringify } from './novel-route-utils'

function stableStringify(value: any, seen = new WeakSet<object>()): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'bigint') return JSON.stringify(String(value))
  if (typeof value === 'function') return JSON.stringify('[Function]')
  if (Array.isArray(value)) {
    if (seen.has(value)) return JSON.stringify('[Circular]')
    seen.add(value)
    const text = `[${value.map(item => stableStringify(item, seen)).join(',')}]`
    seen.delete(value)
    return text
  }
  if (typeof value === 'object') {
    if (seen.has(value)) return JSON.stringify('[Circular]')
    seen.add(value)
    const text = `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key], seen)}`).join(',')}}`
    seen.delete(value)
    return text
  }
  return JSON.stringify(value)
}

function runJson(value: any) {
  return safeJsonStringify(compactRunPayload(value), undefined, 0)
}

function hashText(value: any) {
  const text = typeof value === 'string' ? value : stableStringify(value)
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

const RUN_STATE_TEXT_LIMIT = 700
const RUN_STATE_LONG_TEXT_LIMIT = 1400
const RUN_STATE_ARRAY_LIMIT = 20
const RUN_STATE_DEPTH_LIMIT = 6
const RUN_STATE_DROP_KEYS = new Set([
  'chapter_text',
  'chapterText',
  'final_text',
  'finalText',
  'revised_text',
  'revisedText',
  'full_text',
  'fullText',
  'context_package',
  'contextPackage',
  'paragraph_task',
  'paragraphTask',
  'prompt',
  'raw_prompt',
  'rawPrompt',
  'messages',
  'diagnostics',
  'debug',
  'raw',
])
const RUN_STATE_SCENE_KEYS = new Set([
  'scene_cards',
  'sceneCards',
  'scene_breakdown',
  'sceneBreakdown',
  'scene_list',
  'sceneList',
  'scenes',
])

function compactRunStateText(value: any, limit = RUN_STATE_TEXT_LIMIT) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= limit) return text
  return `${text.slice(0, limit)}...`
}

function compactRunSceneCard(item: any = {}) {
  if (!item || typeof item !== 'object') return compactRunStateText(item)
  return {
    scene_no: item.scene_no ?? item.sceneNo ?? null,
    title: compactRunStateText(item.title || item.name || '', 120),
    purpose: compactRunStateText(item.purpose || item.goal || item.scene_goal || item.sceneGoal || '', 240),
    conflict: compactRunStateText(item.conflict || item.obstacle || item.blocker || '', 260),
    change: compactRunStateText(item.change || item.state_change || item.stateChange || item.result || '', 240),
    status: item.status || item.scene_status || item.sceneStatus || undefined,
  }
}

function compactRunStateValue(value: any, key = '', depth = 0, seen = new WeakSet<object>()): any {
  if (RUN_STATE_DROP_KEYS.has(key)) return undefined
  if (value === null || value === undefined) return value
  const valueType = typeof value
  if (valueType === 'string') {
    const limit = ['error', 'summary', 'detail', 'evidence', 'fix', 'reason'].includes(key)
      ? RUN_STATE_LONG_TEXT_LIMIT
      : RUN_STATE_TEXT_LIMIT
    return compactRunStateText(value, limit)
  }
  if (valueType === 'number' || valueType === 'boolean') return value
  if (valueType === 'bigint') return String(value)
  if (valueType === 'function') return '[Function]'
  if (valueType !== 'object') return compactRunStateText(value)
  if (seen.has(value)) return '[Circular]'
  if (depth >= RUN_STATE_DEPTH_LIMIT) return '[CompactDepthLimit]'
  seen.add(value)
  if (Array.isArray(value)) {
    const source = RUN_STATE_SCENE_KEYS.has(key) ? value.map(compactRunSceneCard) : value
    const items = source
      .slice(0, RUN_STATE_ARRAY_LIMIT)
      .map(item => compactRunStateValue(item, '', depth + 1, seen))
      .filter(item => item !== undefined)
    if (source.length > RUN_STATE_ARRAY_LIMIT) items.push(`[Truncated ${source.length - RUN_STATE_ARRAY_LIMIT} items]`)
    seen.delete(value)
    return items
  }
  const output: Record<string, any> = {}
  for (const [childKey, childValue] of Object.entries(value)) {
    if (RUN_STATE_SCENE_KEYS.has(childKey) && Array.isArray(childValue)) {
      output[childKey] = childValue.slice(0, RUN_STATE_ARRAY_LIMIT).map(compactRunSceneCard)
      if (childValue.length > RUN_STATE_ARRAY_LIMIT) output[`${childKey}_truncated_count`] = childValue.length - RUN_STATE_ARRAY_LIMIT
      continue
    }
    const compacted = compactRunStateValue(childValue, childKey, depth + 1, seen)
    if (compacted !== undefined) output[childKey] = compacted
  }
  seen.delete(value)
  return output
}

function compactRunConfigSnapshot(snapshot: any = {}) {
  if (!snapshot || typeof snapshot !== 'object') return snapshot || null
  return compactRunStateValue(snapshot)
}

function compactRunStage(stage: any = {}) {
  if (!stage || typeof stage !== 'object') return stage
  return compactRunStateValue({
    key: stage.key,
    label: stage.label,
    status: stage.status,
    score: stage.score,
    phase: stage.phase,
    detail: stage.detail,
    error: stage.error,
    warnings: stage.warnings,
    blockers: stage.blockers,
    count: stage.count,
    word_count: stage.word_count,
    scene_status: stage.scene_status || stage.sceneStatus,
    quality_gate: stage.quality_gate || stage.qualityGate,
    scene_cards: stage.scene_cards || stage.sceneCards,
    updated_at: stage.updated_at || stage.updatedAt,
  })
}

function compactRunChapterItem(item: any = {}) {
  if (!item || typeof item !== 'object') return item
  return compactRunStateValue({
    id: item.id,
    chapter_id: item.chapter_id || item.chapterId,
    chapter_no: item.chapter_no ?? item.chapterNo,
    title: item.title,
    status: item.status,
    current_step: item.current_step || item.currentStep,
    current_label: item.current_label || item.currentLabel,
    score: item.score,
    revised: item.revised,
    attempts: item.attempts,
    next_run_at: item.next_run_at ?? item.nextRunAt ?? '',
    approval_stage: item.approval_stage || item.approvalStage,
    approval_context: item.approval_context || item.approvalContext,
    error: item.error,
    error_code: item.error_code || item.errorCode,
    recovery_plan: item.recovery_plan || item.recoveryPlan,
    repair_run_id: item.repair_run_id || item.repairRunId,
    repair_queue: item.repair_queue || item.repairQueue,
    production_mode: item.production_mode || item.productionMode,
    config_snapshot: compactRunConfigSnapshot(item.config_snapshot || item.configSnapshot),
    scenes: Array.isArray(item.scenes) ? item.scenes.map(compactRunSceneCard) : [],
    stages: Array.isArray(item.stages) ? item.stages.map(compactRunStage) : [],
    post_delivery_quality: item.post_delivery_quality || item.postDeliveryQuality,
    started_at: item.started_at || item.startedAt,
    completed_at: item.completed_at || item.completedAt,
    failed_at: item.failed_at || item.failedAt,
    stopped_at: item.stopped_at || item.stoppedAt,
  })
}

function compactRunPayload(value: any) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return compactRunStateValue(value)
  const chapters = Array.isArray(value.chapters) ? value.chapters.map(compactRunChapterItem) : []
  const results = Array.isArray(value.results) ? value.results.map(compactRunChapterItem) : []
  return compactRunStateValue({
    ...value,
    chapters,
    results,
    last_error: value.last_error || value.lastError ? compactRunChapterItem(value.last_error || value.lastError) : null,
    config_snapshot: compactRunConfigSnapshot(value.config_snapshot || value.configSnapshot),
  })
}

function requestRuntimeGc() {
  try {
    const gc = (globalThis as any).Bun?.gc
    if (typeof gc === 'function') gc(true)
  } catch {
    // GC is opportunistic; never let it affect chapter execution.
  }
}

function isAbortLikeError(error: any) {
  const message = String(error?.message || error || '').toLowerCase()
  return error?.name === 'AbortError'
    || error?.code === 'REQUEST_CANCELED'
    || message.includes('request canceled')
    || message.includes('aborted')
    || message.includes('abort')
}

function buildReturnedApprovalBlocker(chapterResult: any = {}, qualityThreshold: any = 0) {
  const payload = chapterResult || {}
  const explicitBlocker = payload.approval_blocker || payload.approvalBlocker
  if (explicitBlocker) {
    const blocker = typeof explicitBlocker === 'object' ? explicitBlocker : { detail: String(explicitBlocker) }
    return {
      type: String(blocker.type || 'approval_blocker'),
      label: String(blocker.label || '入库阻断'),
      detail: compactText(blocker.detail || blocker.message || blocker.summary || '章节仍存在入库阻断，不能继续无人值守生产。', 240),
      score: blocker.score ?? payload.score ?? null,
      score_label: blocker.score_label || blocker.scoreLabel || '',
      reasons: Array.isArray(blocker.reasons) ? blocker.reasons : [],
      source: 'approval_blocker',
    }
  }

  const safetyDecision = payload.safety_decision || payload.safetyDecision || payload.reference_safety || payload.referenceSafety || {}
  if (safetyDecision?.blocked === true) {
    return {
      type: 'reference_safety_blocked',
      label: '仿写安全阻断',
      detail: compactText(Array.isArray(safetyDecision.reasons) ? safetyDecision.reasons.join('；') : safetyDecision.reason || '仿写安全未通过。', 240),
      score: safetyDecision.score ?? payload.score ?? null,
      copy_hit_count: Number(safetyDecision.copy_hit_count ?? safetyDecision.copyHitCount ?? 0) || 0,
      reasons: Array.isArray(safetyDecision.reasons) ? safetyDecision.reasons : [],
      source: 'safety_decision',
    }
  }

  const qualityGate = payload.quality_gate || payload.qualityGate || payload.self_check?.quality_gate || payload.selfCheck?.qualityGate || {}
  if (qualityGate?.passed === false) {
    return {
      type: 'quality_gate',
      label: '质量门禁阻断',
      detail: compactText(Array.isArray(qualityGate.reasons) ? qualityGate.reasons.join('；') : qualityGate.reason || '质量门禁未通过。', 240),
      score: qualityGate.score ?? payload.score ?? null,
      reasons: Array.isArray(qualityGate.reasons) ? qualityGate.reasons : [],
      source: 'quality_gate',
    }
  }

  const score = Number(payload.score ?? payload.self_check?.review?.score ?? payload.selfCheck?.review?.score ?? payload.review?.score)
  const threshold = Number(qualityThreshold || 0)
  if (Number.isFinite(score) && Number.isFinite(threshold) && threshold > 0 && score < threshold) {
    return {
      type: 'low_score',
      label: '低分待确认',
      detail: `质量分 ${score} 低于无人值守阈值 ${threshold}。`,
      score,
      min_score: threshold,
      reasons: [`质量分 ${score} 低于阈值 ${threshold}`],
      source: 'quality_score',
    }
  }

  return null
}

function findExistingApprovalBlocker(payload: any = {}) {
  const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
  const index = Number(payload.current_index || 0)
  const item = chapters[index] || {}
  const lastError = payload.last_error || payload.lastError || {}
  const approvalStage = String(item.approval_stage || item.approvalStage || lastError.approval_stage || lastError.approvalStage || '')
  const errorCode = String(item.error_code || item.errorCode || lastError.error_code || lastError.errorCode || '')
  if (approvalStage !== 'approval_blocker' && errorCode !== 'APPROVAL_BLOCKER') return null
  return {
    item,
    index,
    error: item.error || lastError.error || '当前章节存在入库阻断，不能直接执行绕过。',
    error_code: 'APPROVAL_BLOCKER_REQUIRES_REPAIR',
    recovery_plan: lastError.recovery_plan || lastError.recoveryPlan || item.recovery_plan || item.recoveryPlan || {
      type: 'approval_blocker',
      actions: ['按入库阻断原因修订正文', '重新运行正文质检和入库门禁', '确认阻断解除后再继续后续章节生成'],
    },
  }
}

function syncCheckStatus(value: any) {
  if (!value || typeof value !== 'object') return 'unknown'
  const explicit = String(value.status || '').toLowerCase()
  if (['ok', 'pass', 'passed', 'success'].includes(explicit)) return 'ok'
  if (['warn', 'warning', 'fail', 'failed', 'error', 'blocked'].includes(explicit)) return 'warn'
  const count = Number(value.missed_count ?? value.missedCount ?? value.risk_count ?? value.riskCount ?? value.weak_count ?? value.weakCount ?? 0)
  return count > 0 ? 'warn' : 'unknown'
}

function buildOhStoryPostDeliveryQuality(chapterResult: any = {}, chapter: any = {}) {
  const state = chapterResult.story_state_update || chapterResult.storyStateUpdate || {}
  const syncs: Record<string, any> = {
    title_uniqueness: state.chapter_title_uniqueness_sync || state.chapterTitleUniquenessSync,
    prose_meta: state.prose_meta_sync || state.proseMetaSync,
    chapter_hook: state.chapter_hook_sync || state.chapterHookSync,
    blueprint_consumption: state.chapter_blueprint_sync || state.chapterBlueprintSync,
    foreshadowing_delta: state.foreshadowing_delta_sync || state.foreshadowingDeltaSync,
    deterministic_cleanup: state.deterministic_prose_cleanup || state.deterministicProseCleanup,
    story_state: state?.error ? { status: 'warn', summary: state.error } : { status: state?.skipped ? 'unknown' : 'ok' },
  }
  const sourceReadinessSync = state.source_readiness_sync || state.sourceReadinessSync
  if (sourceReadinessSync) syncs.source_readiness = sourceReadinessSync
  const intentConfirmationSync = state.intent_confirmation_sync || state.intentConfirmationSync
  if (intentConfirmationSync) syncs.intent_confirmation = intentConfirmationSync
  const benchmarkRecallSync = state.benchmark_recall_sync || state.benchmarkRecallSync
  if (benchmarkRecallSync) syncs.benchmark_recall = benchmarkRecallSync
  const styleSampleSync = state.style_sample_sync || state.styleSampleSync
  if (styleSampleSync) syncs.style_sample = styleSampleSync
  const storyLoopSync = state.story_loop_sync || state.storyLoopSync
  if (storyLoopSync) syncs.story_loop = storyLoopSync
  const informationFlowSync = state.information_flow_sync || state.informationFlowSync
  if (informationFlowSync) syncs.information_flow = informationFlowSync
  const expectationThresholdSync = state.expectation_threshold_sync || state.expectationThresholdSync
  if (expectationThresholdSync) syncs.expectation_threshold = expectationThresholdSync
  const emotionalArcSync = state.emotional_arc_sync || state.emotionalArcSync
  if (emotionalArcSync) syncs.emotional_arc = emotionalArcSync
  const dialogueSync = state.dialogue_sync || state.dialogueSync
  if (dialogueSync) syncs.dialogue = dialogueSync
  const characterBehaviorSync = state.character_behavior_sync || state.characterBehaviorSync
  if (characterBehaviorSync) syncs.character_behavior = characterBehaviorSync
  const sceneCardReceiptsSync = state.scene_card_receipts_sync || state.sceneCardReceiptsSync
  if (sceneCardReceiptsSync) syncs.scene_card_receipts = sceneCardReceiptsSync
  const deliveryRiskReceiptsSync = state.delivery_risk_receipts_sync || state.deliveryRiskReceiptsSync
  if (deliveryRiskReceiptsSync) syncs.delivery_risk_receipts = deliveryRiskReceiptsSync
  const assetLinkageSync = state.asset_linkage_sync || state.assetLinkageSync
  if (assetLinkageSync) syncs.asset_linkage = assetLinkageSync
  const stateTrackingSync = state.state_tracking_sync || state.stateTrackingSync
  if (stateTrackingSync) syncs.state_tracking = stateTrackingSync
  const chapterHandoffSync = state.chapter_handoff_sync || state.chapterHandoffSync
  if (chapterHandoffSync) syncs.chapter_handoff = chapterHandoffSync
  const paragraphHookSync = state.paragraph_hook_sync || state.paragraphHookSync
  if (paragraphHookSync) syncs.paragraph_hook = paragraphHookSync
  const suspenseSync = state.suspense_sync || state.suspenseSync
  if (suspenseSync) syncs.suspense = suspenseSync
  const reversalSync = state.reversal_sync || state.reversalSync
  if (reversalSync) syncs.reversal = reversalSync
  const showdownSync = state.showdown_sync || state.showdownSync
  if (showdownSync) syncs.showdown = showdownSync
  const openingSync = state.opening_sync || state.openingSync
  if (openingSync) syncs.opening = openingSync
  const bridgeUnitSync = state.bridge_unit_sync || state.bridgeUnitSync
  if (bridgeUnitSync) syncs.bridge_unit = bridgeUnitSync
  const continuityHeatSync = state.continuity_heat_sync || state.continuityHeatSync
  if (continuityHeatSync) syncs.continuity_heat = continuityHeatSync
  const conflictStructureSync = state.conflict_structure_sync || state.conflictStructureSync
  if (conflictStructureSync) syncs.conflict_structure = conflictStructureSync
  const upgradeRhythmSync = state.upgrade_rhythm_sync || state.upgradeRhythmSync
  if (upgradeRhythmSync) syncs.upgrade_rhythm = upgradeRhythmSync
  const targetReaderSync = state.target_reader_sync || state.targetReaderSync
  if (targetReaderSync) syncs.target_reader = targetReaderSync
  const genrePositioningSync = state.genre_positioning_sync || state.genrePositioningSync
  if (genrePositioningSync) syncs.genre_positioning = genrePositioningSync
  const femaleAudienceSync = state.female_audience_sync || state.femaleAudienceSync
  if (femaleAudienceSync) syncs.female_audience = femaleAudienceSync
  const plotDynamicsSync = state.plot_dynamics_sync || state.plotDynamicsSync
  if (plotDynamicsSync) syncs.plot_dynamics = plotDynamicsSync
  const characterRelationSync = state.character_relation_sync || state.characterRelationSync
  if (characterRelationSync) syncs.character_relation = characterRelationSync
  const readerRetentionSync = state.reader_retention_sync || state.readerRetentionSync
  if (readerRetentionSync) syncs.reader_retention = readerRetentionSync
  const coreContractSync = state.core_contract_sync || state.coreContractSync
  if (coreContractSync) syncs.core_contract = coreContractSync
  const storyDriveSync = state.story_drive_sync || state.storyDriveSync
  if (storyDriveSync) syncs.story_drive = storyDriveSync
  const characterArcSync = state.character_arc_sync || state.characterArcSync
  if (characterArcSync) syncs.character_arc = characterArcSync
  const styleBoundarySync = state.style_boundary_sync || state.styleBoundarySync
  if (styleBoundarySync) syncs.style_boundary = styleBoundarySync
  const innovationSync = state.innovation_sync || state.innovationSync
  if (innovationSync) syncs.innovation = innovationSync
  const runwaySync = state.runway_sync || state.runwaySync
  if (runwaySync) syncs.runway = runwaySync
  const readerExpectationSync = state.reader_expectation_sync || state.readerExpectationSync
  if (readerExpectationSync) syncs.reader_expectation = readerExpectationSync
  const qualityAuditSync = state.quality_audit_sync || state.qualityAuditSync
  if (qualityAuditSync) syncs.quality_audit = qualityAuditSync
  const beatCoolingSync = state.beat_cooling_sync || state.beatCoolingSync
  if (beatCoolingSync) syncs.beat_cooling = beatCoolingSync
  const readerPayoffSync = state.reader_payoff_sync || state.readerPayoffSync
  if (readerPayoffSync) syncs.reader_payoff = readerPayoffSync
  const proseCraftSync = state.prose_craft_sync || state.proseCraftSync
  if (proseCraftSync) syncs.prose_craft = proseCraftSync
  const punctuationToneSync = state.punctuation_tone_sync || state.punctuationToneSync
  if (punctuationToneSync) syncs.punctuation_tone = punctuationToneSync
  const payoffSetupSync = state.payoff_setup_sync || state.payoffSetupSync
  if (payoffSetupSync) syncs.payoff_setup = payoffSetupSync
  const spectatorReactionSync = state.spectator_reaction_sync || state.spectatorReactionSync
  if (spectatorReactionSync) syncs.spectator_reaction = spectatorReactionSync
  const proseRevisionReceiptSync = state.prose_revision_receipt_sync || state.proseRevisionReceiptSync
  if (proseRevisionReceiptSync) syncs.prose_revision_receipt_sync = proseRevisionReceiptSync
  const deslopRepairReceiptSync = state.deslop_repair_receipt_sync || state.deslopRepairReceiptSync
  if (deslopRepairReceiptSync) syncs.deslop_repair_receipt_sync = deslopRepairReceiptSync
  const qualityAuditRepairReceiptSync = state.quality_audit_repair_receipt_sync || state.qualityAuditRepairReceiptSync
  if (qualityAuditRepairReceiptSync) syncs.quality_audit_repair_receipt_sync = qualityAuditRepairReceiptSync
  const revisionCascadeImpactSync = state.revision_cascade_impact_sync || state.revisionCascadeImpactSync
  if (revisionCascadeImpactSync) syncs.revision_cascade_impact_sync = revisionCascadeImpactSync
  const revisionScopeGuardSync = state.revision_scope_guard_sync || state.revisionScopeGuardSync
  if (revisionScopeGuardSync) syncs.revision_scope_guard_sync = revisionScopeGuardSync
  const requiresQualityContinuityReceipts = Boolean(
    chapterResult.requires_next_chapter_quality_plan_receipts
    || chapterResult.requiresNextChapterQualityPlanReceipts
    || state.next_chapter_quality_plan_receipts_sync
    || state.nextChapterQualityPlanReceiptsSync,
  )
  if (requiresQualityContinuityReceipts) {
    syncs.next_chapter_quality_plan_receipts = state.next_chapter_quality_plan_receipts_sync || state.nextChapterQualityPlanReceiptsSync
  }
  const requiresStatusFilterReceipts = Boolean(
    chapterResult.requires_status_filter_receipts
    || chapterResult.requiresStatusFilterReceipts
    || state.status_filter_receipts_sync
    || state.statusFilterReceiptsSync,
  )
  if (requiresStatusFilterReceipts) {
    syncs.status_filter_receipts = state.status_filter_receipts_sync || state.statusFilterReceiptsSync
  }
  const writePreparationReceiptsSync = state.write_preparation_receipts_sync || state.writePreparationReceiptsSync
  if (writePreparationReceiptsSync) syncs.write_preparation_receipts = writePreparationReceiptsSync
  const revisionContextReceiptsSync = state.revision_context_receipts_sync || state.revisionContextReceiptsSync
  if (revisionContextReceiptsSync) syncs.revision_context_receipts = revisionContextReceiptsSync
  const labels: Record<string, string> = {
    title_uniqueness: '标题去重',
    prose_meta: '正文元信息',
    chapter_hook: '章尾钩子',
    blueprint_consumption: '细纲兑现',
    foreshadowing_delta: '伏笔增量',
    deterministic_cleanup: '确定性清理',
    story_state: '状态机更新',
    source_readiness: '来源就绪',
    intent_confirmation: '意图确认',
    benchmark_recall: '文风召回',
    style_sample: '样章/风格执行',
    story_loop: '故事闭环',
    information_flow: '信息流',
    expectation_threshold: '期待阈值',
    emotional_arc: '情绪弧',
    dialogue: '对白质量',
    character_behavior: '角色行为',
    scene_card_receipts: '场景回执',
    delivery_risk_receipts: '交稿回执',
    asset_linkage: '资产挂钩',
    state_tracking: '状态跟踪',
    chapter_handoff: '章首承接',
    paragraph_hook: '段落钩子',
    suspense: '悬念编排',
    reversal: '反转设计',
    showdown: '高潮对抗',
    opening: '开篇设计',
    bridge_unit: '桥段节奏',
    continuity_heat: '连续性热度',
    conflict_structure: '冲突结构',
    upgrade_rhythm: '升级节奏',
    target_reader: '目标读者',
    genre_positioning: '题材定位',
    female_audience: '女频长篇',
    plot_dynamics: '剧情动力',
    character_relation: '角色关系',
    reader_retention: '追读留存',
    core_contract: '核心契约',
    story_drive: '故事驱动力',
    character_arc: '人物弧光',
    style_boundary: '风格边界',
    innovation: '创新执行',
    runway: '连载航线',
    reader_expectation: '读者期待',
    quality_audit: '质量诊断',
    beat_cooling: '冷却节奏',
    reader_payoff: '读者回报',
    prose_craft: '正文工艺',
    punctuation_tone: '语气标点',
    payoff_setup: '爽点铺垫',
    spectator_reaction: '围观反应',
    prose_revision_receipt_sync: '修订回执',
    deslop_repair_receipt_sync: '去AI味回执',
    quality_audit_repair_receipt_sync: '质量回执',
    revision_cascade_impact_sync: '级联修订',
    revision_scope_guard_sync: '修订幅度',
    next_chapter_quality_plan_receipts: '质量续航回执',
    status_filter_receipts: '状态筛选回执',
    write_preparation_receipts: '写前准备回执',
    revision_context_receipts: '修订上下文',
  }
  const chapterNo = Number(chapter.chapter_no ?? chapter.chapterNo ?? chapterResult.chapter_no ?? chapterResult.chapterNo ?? 0) || null
  const checks = Object.entries(syncs).map(([key, value]: any) => {
    const status = syncCheckStatus(value)
    const label = labels[key] || key
    const summary = compactText(
      value?.summary
        || value?.label
        || value?.error
        || (status === 'unknown' ? `${chapterNo ? `第${chapterNo}章` : '本章'}未返回${label}复检证据。` : ''),
      180,
    )
    return {
      key,
      label,
      status,
      summary,
    }
  })
  return {
    source: 'oh_story_step_3',
    score: chapterResult.score ?? null,
    revised: Boolean(chapterResult.revised),
    checks,
    status: checks.some(check => check.status !== 'ok') ? 'warn' : 'ok',
  }
}

function buildOhStoryBatchQualityCheck(chapters: any[] = [], results: any[] = []) {
  const successful = chapters.filter((chapter: any) => ['success', 'skipped', 'written'].includes(String(chapter?.status || '')))
  const chapterNos = successful.map((chapter: any) => Number(chapter.chapter_no || 0)).filter(Boolean)
  const resultChecks = results.flatMap((result: any) => Array.isArray(result?.post_delivery_quality?.checks) ? result.post_delivery_quality.checks : [])
  const checkKeys = [
    ['title_uniqueness', '标题去重'],
    ['prose_meta', '正文元信息'],
    ['chapter_hook', '章尾钩子'],
    ['blueprint_consumption', '细纲兑现'],
    ['foreshadowing_delta', '伏笔增量'],
    ['deterministic_cleanup', '确定性清理'],
    ['story_state', '状态机更新'],
  ]
  if (resultChecks.some((check: any) => check.key === 'source_readiness')) {
    checkKeys.push(['source_readiness', '来源就绪'])
  }
  if (resultChecks.some((check: any) => check.key === 'intent_confirmation')) {
    checkKeys.push(['intent_confirmation', '意图确认'])
  }
  if (resultChecks.some((check: any) => check.key === 'benchmark_recall')) {
    checkKeys.push(['benchmark_recall', '文风召回'])
  }
  if (resultChecks.some((check: any) => check.key === 'style_sample')) {
    checkKeys.push(['style_sample', '样章/风格执行'])
  }
  if (resultChecks.some((check: any) => check.key === 'story_loop')) {
    checkKeys.push(['story_loop', '故事闭环'])
  }
  if (resultChecks.some((check: any) => check.key === 'information_flow')) {
    checkKeys.push(['information_flow', '信息流'])
  }
  if (resultChecks.some((check: any) => check.key === 'expectation_threshold')) {
    checkKeys.push(['expectation_threshold', '期待阈值'])
  }
  if (resultChecks.some((check: any) => check.key === 'emotional_arc')) {
    checkKeys.push(['emotional_arc', '情绪弧'])
  }
  if (resultChecks.some((check: any) => check.key === 'dialogue')) {
    checkKeys.push(['dialogue', '对白质量'])
  }
  if (resultChecks.some((check: any) => check.key === 'character_behavior')) {
    checkKeys.push(['character_behavior', '角色行为'])
  }
  if (resultChecks.some((check: any) => check.key === 'scene_card_receipts')) {
    checkKeys.push(['scene_card_receipts', '场景回执'])
  }
  if (resultChecks.some((check: any) => check.key === 'delivery_risk_receipts')) {
    checkKeys.push(['delivery_risk_receipts', '交稿回执'])
  }
  if (resultChecks.some((check: any) => check.key === 'asset_linkage')) {
    checkKeys.push(['asset_linkage', '资产挂钩'])
  }
  if (resultChecks.some((check: any) => check.key === 'state_tracking')) {
    checkKeys.push(['state_tracking', '状态跟踪'])
  }
  if (resultChecks.some((check: any) => check.key === 'chapter_handoff')) {
    checkKeys.push(['chapter_handoff', '章首承接'])
  }
  if (resultChecks.some((check: any) => check.key === 'paragraph_hook')) {
    checkKeys.push(['paragraph_hook', '段落钩子'])
  }
  if (resultChecks.some((check: any) => check.key === 'suspense')) {
    checkKeys.push(['suspense', '悬念编排'])
  }
  if (resultChecks.some((check: any) => check.key === 'reversal')) {
    checkKeys.push(['reversal', '反转设计'])
  }
  if (resultChecks.some((check: any) => check.key === 'showdown')) {
    checkKeys.push(['showdown', '高潮对抗'])
  }
  if (resultChecks.some((check: any) => check.key === 'opening')) {
    checkKeys.push(['opening', '开篇设计'])
  }
  if (resultChecks.some((check: any) => check.key === 'bridge_unit')) {
    checkKeys.push(['bridge_unit', '桥段节奏'])
  }
  if (resultChecks.some((check: any) => check.key === 'continuity_heat')) {
    checkKeys.push(['continuity_heat', '连续性热度'])
  }
  if (resultChecks.some((check: any) => check.key === 'conflict_structure')) {
    checkKeys.push(['conflict_structure', '冲突结构'])
  }
  if (resultChecks.some((check: any) => check.key === 'upgrade_rhythm')) {
    checkKeys.push(['upgrade_rhythm', '升级节奏'])
  }
  if (resultChecks.some((check: any) => check.key === 'target_reader')) {
    checkKeys.push(['target_reader', '目标读者'])
  }
  if (resultChecks.some((check: any) => check.key === 'genre_positioning')) {
    checkKeys.push(['genre_positioning', '题材定位'])
  }
  if (resultChecks.some((check: any) => check.key === 'female_audience')) {
    checkKeys.push(['female_audience', '女频长篇'])
  }
  if (resultChecks.some((check: any) => check.key === 'plot_dynamics')) {
    checkKeys.push(['plot_dynamics', '剧情动力'])
  }
  if (resultChecks.some((check: any) => check.key === 'character_relation')) {
    checkKeys.push(['character_relation', '角色关系'])
  }
  if (resultChecks.some((check: any) => check.key === 'reader_retention')) {
    checkKeys.push(['reader_retention', '追读留存'])
  }
  if (resultChecks.some((check: any) => check.key === 'core_contract')) {
    checkKeys.push(['core_contract', '核心契约'])
  }
  if (resultChecks.some((check: any) => check.key === 'story_drive')) {
    checkKeys.push(['story_drive', '故事驱动力'])
  }
  if (resultChecks.some((check: any) => check.key === 'character_arc')) {
    checkKeys.push(['character_arc', '人物弧光'])
  }
  if (resultChecks.some((check: any) => check.key === 'style_boundary')) {
    checkKeys.push(['style_boundary', '风格边界'])
  }
  if (resultChecks.some((check: any) => check.key === 'innovation')) {
    checkKeys.push(['innovation', '创新执行'])
  }
  if (resultChecks.some((check: any) => check.key === 'runway')) {
    checkKeys.push(['runway', '连载航线'])
  }
  if (resultChecks.some((check: any) => check.key === 'reader_expectation')) {
    checkKeys.push(['reader_expectation', '读者期待'])
  }
  if (resultChecks.some((check: any) => check.key === 'quality_audit')) {
    checkKeys.push(['quality_audit', '质量诊断'])
  }
  if (resultChecks.some((check: any) => check.key === 'beat_cooling')) {
    checkKeys.push(['beat_cooling', '冷却节奏'])
  }
  if (resultChecks.some((check: any) => check.key === 'reader_payoff')) {
    checkKeys.push(['reader_payoff', '读者回报'])
  }
  if (resultChecks.some((check: any) => check.key === 'prose_craft')) {
    checkKeys.push(['prose_craft', '正文工艺'])
  }
  if (resultChecks.some((check: any) => check.key === 'punctuation_tone')) {
    checkKeys.push(['punctuation_tone', '语气标点'])
  }
  if (resultChecks.some((check: any) => check.key === 'payoff_setup')) {
    checkKeys.push(['payoff_setup', '爽点铺垫'])
  }
  if (resultChecks.some((check: any) => check.key === 'spectator_reaction')) {
    checkKeys.push(['spectator_reaction', '围观反应'])
  }
  if (resultChecks.some((check: any) => check.key === 'prose_revision_receipt_sync')) {
    checkKeys.push(['prose_revision_receipt_sync', '修订回执'])
  }
  if (resultChecks.some((check: any) => check.key === 'deslop_repair_receipt_sync')) {
    checkKeys.push(['deslop_repair_receipt_sync', '去AI味回执'])
  }
  if (resultChecks.some((check: any) => check.key === 'quality_audit_repair_receipt_sync')) {
    checkKeys.push(['quality_audit_repair_receipt_sync', '质量回执'])
  }
  if (resultChecks.some((check: any) => check.key === 'revision_cascade_impact_sync')) {
    checkKeys.push(['revision_cascade_impact_sync', '级联修订'])
  }
  if (resultChecks.some((check: any) => check.key === 'revision_scope_guard_sync')) {
    checkKeys.push(['revision_scope_guard_sync', '修订幅度'])
  }
  if (resultChecks.some((check: any) => check.key === 'next_chapter_quality_plan_receipts')) {
    checkKeys.push(['next_chapter_quality_plan_receipts', '质量续航回执'])
  }
  if (resultChecks.some((check: any) => check.key === 'status_filter_receipts')) {
    checkKeys.push(['status_filter_receipts', '状态筛选回执'])
  }
  if (resultChecks.some((check: any) => check.key === 'write_preparation_receipts')) {
    checkKeys.push(['write_preparation_receipts', '写前准备回执'])
  }
  if (resultChecks.some((check: any) => check.key === 'revision_context_receipts')) {
    checkKeys.push(['revision_context_receipts', '修订上下文'])
  }
  const checks = checkKeys.map(([key, label]) => {
    const rows = resultChecks.filter((check: any) => check.key === key)
    const warnCount = rows.filter((check: any) => check.status === 'warn').length
    const unknownCount = rows.filter((check: any) => check.status === 'unknown').length
    return {
      key,
      label,
      status: warnCount > 0 ? 'warn' : rows.length > 0 && unknownCount === 0 ? 'ok' : 'unknown',
      checked_count: rows.length,
      warn_count: warnCount,
      unknown_count: unknownCount,
      summaries: rows.map((check: any) => check.summary).filter(Boolean).slice(0, 6),
    }
  })
  return {
    source: 'oh_story_step_3',
    status: checks.some(check => check.status !== 'ok') ? 'warn' : 'ok',
    completed_count: chapterNos.length,
    chapter_nos: chapterNos,
    revised_count: results.filter((result: any) => result.revised === true).length,
    average_score: results.length
      ? Math.round(results.reduce((sum: number, result: any) => sum + Number(result.score || 0), 0) / results.length)
      : null,
    checks,
    generated_at: new Date().toISOString(),
  }
}

const POST_DELIVERY_QUALITY_ISSUE_TYPES: Record<string, string> = {
  title_uniqueness: 'title_uniqueness_gap',
  prose_meta: 'prose_meta_gap',
  chapter_hook: 'chapter_hook_quality_gap',
  blueprint_consumption: 'blueprint_consumption_gap',
  foreshadowing_delta: 'foreshadowing_delta_gap',
  deterministic_cleanup: 'deterministic_cleanup_gap',
  story_state: 'story_state_update_gap',
  source_readiness: 'source_readiness_gap',
  intent_confirmation: 'intent_confirmation_gap',
  benchmark_recall: 'benchmark_recall_gap',
  style_sample: 'style_sample_gap',
  story_loop: 'story_loop_gap',
  information_flow: 'information_flow_gap',
  expectation_threshold: 'expectation_threshold_gap',
  emotional_arc: 'emotional_arc_gap',
  dialogue: 'dialogue_gap',
  character_behavior: 'character_behavior_gap',
  scene_card_receipts: 'scene_card_receipts_gap',
  delivery_risk_receipts: 'delivery_risk_receipts_gap',
  asset_linkage: 'asset_linkage_gap',
  state_tracking: 'state_tracking_gap',
  chapter_handoff: 'chapter_handoff_gap',
  paragraph_hook: 'paragraph_hook_gap',
  suspense: 'suspense_gap',
  reversal: 'reversal_gap',
  showdown: 'showdown_gap',
  opening: 'opening_gap',
  bridge_unit: 'bridge_unit_gap',
  continuity_heat: 'continuity_heat_gap',
  conflict_structure: 'conflict_structure_gap',
  upgrade_rhythm: 'upgrade_rhythm_gap',
  target_reader: 'target_reader_gap',
  genre_positioning: 'genre_positioning_gap',
  female_audience: 'female_audience_gap',
  plot_dynamics: 'plot_dynamics_gap',
  character_relation: 'character_relation_gap',
  reader_retention: 'reader_retention_gap',
  core_contract: 'core_contract_gap',
  story_drive: 'story_drive_gap',
  character_arc: 'character_arc_gap',
  style_boundary: 'style_boundary_gap',
  innovation: 'innovation_missed',
  runway: 'runway_gap',
  reader_expectation: 'reader_expectation_debt',
  quality_audit: 'quality_audit_gap',
  beat_cooling: 'beat_cooling_gap',
  reader_payoff: 'reader_payoff_debt',
  prose_craft: 'prose_craft_gap',
  punctuation_tone: 'punctuation_tone_gap',
  payoff_setup: 'payoff_setup_gap',
  spectator_reaction: 'spectator_reaction_gap',
  prose_revision_receipt_sync: 'prose_revision_receipt_sync',
  deslop_repair_receipt_sync: 'deslop_repair_receipt_sync',
  quality_audit_repair_receipt_sync: 'quality_audit_repair_receipt_sync',
  revision_cascade_impact_sync: 'revision_cascade_impact_sync',
  revision_scope_guard_sync: 'revision_scope_guard_sync',
  next_chapter_quality_plan_receipts: 'next_chapter_quality_plan_receipts_gap',
  status_filter_receipts: 'status_filter_receipts_gap',
  write_preparation_receipts: 'write_preparation_receipts_gap',
  revision_context_receipts: 'revision_context_receipts_gap',
}

function postDeliveryQualityRepairAction(check: any = {}) {
  const key = String(check?.key || '')
  if (key === 'title_uniqueness') return '修正重复或相似章节标题，并重新运行标题去重复检。'
  if (key === 'prose_meta') return '删除正文中的上一章/本章/伏笔/读者等元叙事词，改成角色当下可感知的事件锚点。'
  if (key === 'chapter_hook') return '重修章首/章尾钩子，让最后一幕留下下一章必须处理的问题。'
  if (key === 'blueprint_consumption') return '按 chapter_blueprint 补齐未兑现的场景、因果链、代价收益和章尾承接。'
  if (key === 'foreshadowing_delta') return '补齐本章新增伏笔/回收伏笔的增量记录，并同步追踪/伏笔.md。'
  if (key === 'deterministic_cleanup') return '按确定性清理结果修正文风、格式、禁用词、标点和 AI 味残留。'
  if (key === 'story_state') return '补齐故事状态写回，更新追踪/上下文.md、追踪/伏笔.md、追踪/时间线.md 和追踪/角色状态.md。'
  if (key === 'source_readiness') return '补齐来源就绪证据，确认上一章正文、追踪上下文、伏笔、时间线、角色状态和本章细纲已读取或刚更新。'
  if (key === 'intent_confirmation') return '补齐意图确认，明确本章情绪、节奏、模块、文风指令和新版细纲职责如何落成正文。'
  if (key === 'benchmark_recall') return '补齐文风/标杆召回证据，确认情绪模块、节奏参考、匹配章技巧和锚点片段已落成正文。'
  if (key === 'style_sample') return '补齐样章/风格执行证据，确认样章策略、对白节奏、停顿方式和禁照搬边界已落成正文。'
  if (key === 'story_loop') return '补齐故事闭环，确认本章问题、行动、代价、回报和新问题形成可追踪循环。'
  if (key === 'information_flow') return '调整信息流，确认关键信息随冲突推进分层释放，不用整段设定说明替代剧情。'
  if (key === 'expectation_threshold') return '补齐期待阈值，确认危机、代价、承诺和可期待回报在爽点前建立。'
  if (key === 'emotional_arc') return '补齐情绪弧，确认压力、选择、爆发、余波和角色反应形成可感知变化。'
  if (key === 'dialogue') return '修复对白质量，确认每段对白都有角色目标、冲突压力、潜台词和声线差异，删除只解释信息的填充对白。'
  if (key === 'character_behavior') return '修复角色行为链，确认选择和动作符合角色状态、关系压力、收益代价和当前场景约束，避免降智或无因转向。'
  if (key === 'scene_card_receipts') return '修复 scene_card_receipts，确认每个场景的 delivered 字段、场景边界和 evidence 都能在对应场景正文中定位。'
  if (key === 'delivery_risk_receipts') return '修复 delivery_risk_receipts，确认上一章/批次残留风险的 required_action 已落成开篇承接、中段事件推进、读者回报或章末钩子证据。'
  if (key === 'asset_linkage') return '补齐资产挂钩证据，确认新资产、关键道具、能力、地点或势力已和角色目标、冲突代价、后续承诺或当前卷主线发生可见关系。'
  if (key === 'state_tracking') return '补齐状态跟踪证据，确认角色状态、物品状态、时间线、伏笔状态和关键资产状态已在正文与追踪记录中闭环。'
  if (key === 'chapter_handoff') return '补齐章首承接证据，确认 previous_handoff、opening_obligations、must_deliver、keep_alive 和 overdue 已在前300字或对应场景落成正文。'
  if (key === 'paragraph_hook') return '补齐段落级钩子，确认段落之间有信息推进、情绪变化或问题牵引。'
  if (key === 'suspense') return '补齐悬念编排，确认疑问、线索、遮蔽和揭示节奏形成持续牵引。'
  if (key === 'reversal') return '补齐反转设计，确认误导、证据链、认知翻转和后果落点成立。'
  if (key === 'showdown') return '补齐高潮对抗，确认目标、阻力、反制、代价和结果逐层升级。'
  if (key === 'opening') return '修复开篇设计，确认前300字抛出冲突、异常、目标或代价压力。'
  if (key === 'bridge_unit') return '补齐桥段节奏，确认过渡桥段也有事件推进、情绪换挡或信息变化。'
  if (key === 'continuity_heat') return '补齐连续性热度，确认前文承诺、keep_alive、未兑现风险和本章推进形成追读牵引。'
  if (key === 'conflict_structure') return '补齐冲突结构，确认目标、阻力、升级、代价和结果不是平铺事件流水。'
  if (key === 'upgrade_rhythm') return '补齐升级节奏，确认能力、地位、资源或关系收益有训练/限制/代价/验证过程。'
  if (key === 'target_reader') return '补齐目标读者契约，确认本章选择服务目标读者期待，而不是作者自我解释。'
  if (key === 'genre_positioning') return '校正题材定位，确认主类型承诺、爽点/情绪钩子和市场定位落到正文事件。'
  if (key === 'female_audience') return '补齐女频长篇体验，确认女性主体选择、关系张力、情绪推进和安全感/价值感回报可见。'
  if (key === 'plot_dynamics') return '补齐剧情动力，确认角色主动目标、阻碍反馈、选择压力和下一步推动力可见。'
  if (key === 'character_relation') return '修复角色关系线，确认关系中的利益、情绪、权力或信任状态发生可追踪变化。'
  if (key === 'reader_retention') return '补齐追读留存，确认章末问题、未兑现承诺、下一章期待和读者回报焦点成立。'
  if (key === 'core_contract') return '修复核心创作契约，确认本章兑现作品核心卖点、主角承诺、题材承诺和读者回报。'
  if (key === 'story_drive') return '补齐故事驱动力，确认角色主动目标、阻碍反馈、选择代价和下一步推动力可见。'
  if (key === 'character_arc') return '补齐人物弧光，确认角色认知、能力、关系或公众形象发生可追踪变化。'
  if (key === 'style_boundary') return '修复文风边界，确认样章节奏、声线约束、禁照搬边界和当前场景基调已经落成正文。'
  if (key === 'innovation') return '补齐创新执行，确认创新点不是设定说明，而是进入角色选择、冲突策略或爽点桥段。'
  if (key === 'runway') return '补齐连载航线，确认后续三章承诺、风险、钩子和可持续推进路径成立。'
  if (key === 'reader_expectation') return '补齐读者期待，确认章首承诺、章中加压、章尾悬念和下一章期待持续维护。'
  if (key === 'quality_audit') return '按质量诊断修复水段、空洞爽点、均匀节奏、设定堆叠和低效桥段，并复检。'
  if (key === 'beat_cooling') return '补齐冷却节奏，确认连续高压后有关系、信息、情绪或世界观换挡，不让冲突疲劳。'
  if (key === 'reader_payoff') return '补齐读者回报，确认本章承诺的爽点、情绪价值、信息揭示或关系推进已落成正文证据。'
  if (key === 'prose_craft') return '按 oh-story 正文工艺修复深度限知、身体细节、疏密分配、小节结构、新概念锚点和非胶水转场，并用正文证据复检。'
  if (key === 'punctuation_tone') return '按 oh-story 确定性收尾修复语气标点、破折号、省略号、横线、双连字符和高危 AI 句式，复检到 0 个残留。'
  if (key === 'payoff_setup') return '补齐爽点/打脸/揭露前的危机、期待和代价铺垫，确认出手前读者能指认可期待的 payoff。'
  if (key === 'spectator_reaction') return '补齐在场配角的差异化反应，让立场、信息差、利益受损和情绪变化各自可见。'
  if (key === 'prose_revision_receipt_sync') return '补齐 revision_receipts，逐条对应自检问题、修订动作和 changed_evidence。'
  if (key === 'deslop_repair_receipt_sync') return '补齐 deslop_repair_receipts，逐条证明 Gate A-G 去AI味修复后的正文证据。'
  if (key === 'quality_audit_repair_receipt_sync') return '补齐 quality_audit_repair_receipts，逐条证明质量诊断缺口已经修复并引用修订后正文。'
  if (key === 'revision_cascade_impact_sync') return '补齐 revision_receipts.cascade_impacts，说明修订对后续伏笔、时间线、角色状态、资产和关系边界的影响。'
  if (key === 'revision_scope_guard_sync') return '补齐 revision_scope_guard，说明修订字数变化、允许幅度、scope_warning 和原因，避免修订越界。'
  if (key === 'next_chapter_quality_plan_receipts') return '补齐 next_chapter_quality_plan_receipts，证明上一章质量续航计划已落成正文证据。'
  if (key === 'status_filter_receipts') return '补齐 status_filter_receipts，证明状态筛选只加载/只使用会影响本章正确性的状态。'
  if (key === 'write_preparation_receipts') return '补齐 write_preparation_checks，证明来源缺口、资产风险、蓝图焦点、读者回报焦点和执行顺序已落成正文证据。'
  if (key === 'revision_context_receipts') return '补齐 revision_context_receipts，确认修订前后 previous_chapter、next_chapter、伏笔、角色卡、时间线、设定和关系边界都已对照并闭环。'
  return `按 ${check?.label || key || 'Step 3'} 复检结果修复未闭环项，并重新运行交付后质检。`
}

function buildPostDeliveryQualityRepairTasks(chapter: any = {}, postDeliveryQuality: any = {}, sourceRunId?: number) {
  const chapterNo = Number(chapter.chapter_no ?? chapter.chapterNo ?? 0) || null
  return (Array.isArray(postDeliveryQuality?.checks) ? postDeliveryQuality.checks : [])
    .filter((check: any) => String(check?.status || '') !== 'ok')
    .map((check: any, index: number) => {
      const key = String(check?.key || `check_${index + 1}`)
      const issueType = POST_DELIVERY_QUALITY_ISSUE_TYPES[key] || `${key}_gap`
      const label = compactText(check?.label || key, 40)
      const summary = compactText(check?.summary || `${label}未闭环。`, 240)
      const action = postDeliveryQualityRepairAction(check)
      return {
        task_id: `post-delivery-${chapter.id || chapterNo || 'chapter'}-${issueType}-${hashText(`${key}:${summary}`)}`,
        task_type: 'repair_quality',
        source: 'unattended_post_delivery_quality',
        issue_type: issueType,
        severity: String(check?.status || '') === 'warn' ? 'high' : 'medium',
        chapter_id: chapter.id || null,
        chapter_no: chapterNo,
        title: chapterNo ? `第${chapterNo}章${label}修复` : `${label}修复`,
        message: summary,
        action,
        task_status: 'open',
        annotation_category: key,
        annotation_source: 'oh_story_step_3',
        source_run_id: sourceRunId || null,
        post_delivery_quality: {
          source: postDeliveryQuality?.source || 'oh_story_step_3',
          status: postDeliveryQuality?.status || 'warn',
          score: postDeliveryQuality?.score ?? null,
          check,
        },
        acceptance_criteria: [
          `${label}复检状态为 ok。`,
          '重新运行当前章节交付后质检后，post_delivery_quality.checks 中该项不再为 warn/unknown。',
          '确认 Step 3 全部 ok 后，再继续无人值守下一章。',
        ],
      }
    })
    .slice(0, 20)
}

async function appendPostDeliveryQualityRepairRun(
  appendRun: (workspace: string, data: any) => Promise<any>,
  activeWorkspace: string,
  projectId: number,
  sourceRun: any,
  chapter: any,
  postDeliveryQuality: any,
) {
  const tasks = buildPostDeliveryQualityRepairTasks(chapter, postDeliveryQuality, sourceRun?.id)
  if (!tasks.length) return null
  const chapterNo = Number(chapter.chapter_no ?? chapter.chapterNo ?? 0) || null
  return appendRun(activeWorkspace, {
    project_id: projectId,
    run_type: 'longform_production_repair',
    step_name: `post-delivery-quality-repair-${chapterNo || chapter.id || 'chapter'}-${tasks.length}`,
    status: 'ready',
    input_ref: JSON.stringify({
      source: 'unattended_post_delivery_quality',
      source_run_id: sourceRun?.id || null,
      chapter_id: chapter.id || null,
      chapter_no: chapterNo,
    }),
    output_ref: runJson({
      report: {
        source: 'unattended_post_delivery_quality',
        status: 'needs_repair',
        summary: `第${chapterNo || '?'}章 oh-story Step 3 交付后质检未闭环，已生成 ${tasks.length} 项修复任务。`,
        chapter_id: chapter.id || null,
        chapter_no: chapterNo,
        checks: postDeliveryQuality?.checks || [],
      },
      tasks,
      source_run_id: sourceRun?.id || null,
    }),
  })
}

export function createNovelProductionService() {
  const buildPipelineSteps = () => [
    { key: 'context', label: '章节目标确认/续写上下文包', status: 'pending' },
    { key: 'material_repair', label: '缺失材料自动补齐', status: 'pending' },
    { key: 'scene_cards', label: '场景卡生成/人工确认', status: 'pending' },
    { key: 'migration_plan', label: '参考迁移计划', status: 'pending' },
    { key: 'draft', label: '段落级正文生成', status: 'pending' },
    { key: 'review', label: '章节级自检', status: 'pending' },
    { key: 'revise', label: '二次修订', status: 'pending' },
    { key: 'safety', label: '仿写安全阈值', status: 'pending' },
    { key: 'store', label: '入库版本', status: 'pending' },
    { key: 'story_state', label: '记忆状态机更新', status: 'pending' },
  ]

  const updatePipelineStep = (steps: any[], key: string, patch: any) => steps.map(step => step.key === key ? { ...step, ...patch, updated_at: new Date().toISOString() } : step)
  const buildChapterGroupStages = () => buildPipelineSteps().map(step => ({ ...step, status: 'pending' }))
  const updateChapterStages = (stages: any[] = [], key: string, patch: any = {}) => {
    const base = stages.length ? stages : buildChapterGroupStages()
    return updatePipelineStep(base, key, patch)
  }
  const summarizeChapterStages = (stages: any[] = []) => {
    const items = stages.length ? stages : buildChapterGroupStages()
    const failed = items.find(step => step.status === 'failed')
    if (failed) return { status: 'failed', current_step: failed.key, current_label: failed.label }
    const running = items.find(step => ['running', 'ready', 'needs_confirmation'].includes(step.status))
    if (running) return { status: 'running', current_step: running.key, current_label: running.label }
    const success = items.filter(step => step.status === 'success').length
    return { status: success === items.length ? 'success' : 'pending', current_step: items[success]?.key || 'done', current_label: items[success]?.label || '已完成' }
  }

  const runQueueWorkers = new Map<number, any>()

  const getModelStrategy = (project: any, preferredModelId?: number) => ({
    preferred_model_id: preferredModelId || null,
    stages: {
      incubation: { model_id: preferredModelId || null, temperature: 0.65, reason: '原创孵化需要创意和结构稳定性平衡。' },
      outline: { model_id: preferredModelId || null, temperature: 0.45, reason: '大纲和分卷要求结构一致性。' },
      scene_cards: { model_id: preferredModelId || null, temperature: 0.45, reason: '场景卡需要可控，不宜过度发散。' },
      draft: { model_id: preferredModelId || null, temperature: 0.75, reason: '正文初稿需要保留表达弹性。' },
      review: { model_id: preferredModelId || null, temperature: 0.2, reason: '审稿需要低温、稳定和可复现。' },
      revise: { model_id: preferredModelId || null, temperature: 0.62, reason: '修订需要遵循问题清单，同时保留文气。' },
      safety: { model_id: preferredModelId || null, temperature: 0.15, reason: '仿写安全审计需要保守判断。' },
    },
    cost_policy: {
      low_cost_mode: project.reference_config?.model_strategy?.low_cost_mode !== false,
      retry_limit: Number(project.reference_config?.model_strategy?.retry_limit || 2),
      fallback_enabled: project.reference_config?.model_strategy?.fallback_enabled !== false,
    },
  })

  const getStageModelId = (project: any, stage: string, preferredModelId?: number) => {
    const strategy = project.reference_config?.model_strategy || getModelStrategy(project, preferredModelId)
    return Number(strategy?.stages?.[stage]?.model_id || strategy?.preferred_model_id || preferredModelId || 0) || undefined
  }

  const getStageTemperature = (project: any, stage: string, fallback: number) => {
    const value = Number(project.reference_config?.model_strategy?.stages?.[stage]?.temperature)
    return Number.isFinite(value) && value > 0 ? value : fallback
  }

  const getApprovalPolicy = (project: any) => ({
    mode: project.reference_config?.approval_policy?.mode || 'balanced',
    require_scene_card_approval: project.reference_config?.approval_policy?.require_scene_card_approval !== false,
    require_draft_approval: Boolean(project.reference_config?.approval_policy?.require_draft_approval),
    require_low_score_approval: project.reference_config?.approval_policy?.require_low_score_approval !== false,
    low_score_threshold: Number(project.reference_config?.approval_policy?.low_score_threshold || 78),
    require_safety_approval: project.reference_config?.approval_policy?.require_safety_approval !== false,
    allow_full_auto: Boolean(project.reference_config?.approval_policy?.allow_full_auto),
  })

  const approvalRequired = (policy: any, stage: string, approvals: any = {}, context: any = {}) => {
    if (policy?.allow_full_auto) return false
    if (approvals?.[stage]?.approved === true || approvals?.[stage] === true) return false
    if (stage === 'scene_cards') return Boolean(policy?.require_scene_card_approval)
    if (stage === 'draft') return Boolean(policy?.require_draft_approval)
    if (stage === 'low_score') return Boolean(policy?.require_low_score_approval) && Number(context.score || 100) < Number(policy?.low_score_threshold || 78)
    if (stage === 'safety') {
      if (!policy?.require_safety_approval) return false
      return policy.mode === 'strict' || Number(context.copy_hit_count || 0) > 0 || ['medium', 'high'].includes(String(context.risk_level || 'low'))
    }
    return false
  }

  const buildApprovalError = (stage: string, message: string, context: any = {}) => Object.assign(new Error(message), {
    code: 'APPROVAL_REQUIRED',
    approval_stage: stage,
    approval_context: context,
  })

  const getProductionBudget = (project: any) => ({
    max_retries_per_chapter: Number(project.reference_config?.production_budget?.max_retries_per_chapter ?? 2),
    max_daily_generated_chapters: Number(project.reference_config?.production_budget?.max_daily_generated_chapters ?? 50),
    max_failure_rate: Number(project.reference_config?.production_budget?.max_failure_rate ?? 35),
    max_safety_blocks_per_day: Number(project.reference_config?.production_budget?.max_safety_blocks_per_day ?? 5),
    max_run_minutes: Number(project.reference_config?.production_budget?.max_run_minutes ?? 180),
    pause_on_budget_exceeded: project.reference_config?.production_budget?.pause_on_budget_exceeded !== false,
  })

  const getProductionBudgetDecision = (project: any, runs: any[]) => {
    const budget = getProductionBudget(project)
    const today = new Date().toISOString().slice(0, 10)
    const todayRuns = runs.filter(run => String(run.created_at || '').startsWith(today))
    const generatedToday = todayRuns.filter(run => run.run_type === 'generate_prose' && run.status === 'success').length
      + todayRuns.filter(run => run.run_type === 'chapter_group_generation' && String(run.output_ref || '').includes('"status":"success"')).length
    const failedRuns = todayRuns.filter(run => ['failed', 'error'].includes(run.status)).length
    const failureRate = todayRuns.length ? Math.round((failedRuns / todayRuns.length) * 100) : 0
    const safetyBlocks = todayRuns.filter(run => String(run.error_message || '').includes('仿写安全') || String(run.output_ref || '').includes('REFERENCE_SAFETY_BLOCKED')).length
    const reasons = [
      generatedToday >= budget.max_daily_generated_chapters ? `今日生成章节数 ${generatedToday} 已达到上限 ${budget.max_daily_generated_chapters}` : '',
      failureRate > budget.max_failure_rate ? `今日失败率 ${failureRate}% 超过上限 ${budget.max_failure_rate}%` : '',
      safetyBlocks > budget.max_safety_blocks_per_day ? `今日安全阻断 ${safetyBlocks} 次超过上限 ${budget.max_safety_blocks_per_day}` : '',
    ].filter(Boolean)
    return {
      budget,
      blocked: budget.pause_on_budget_exceeded && reasons.length > 0,
      reasons,
      usage: { generated_today: generatedToday, failed_runs: failedRuns, failure_rate: failureRate, safety_blocks: safetyBlocks, total_runs_today: todayRuns.length },
    }
  }

  const classifyGenerationFailure = (error: any) => {
    const text = String(error?.message || error?.error || error || '')
    if (text.includes('upload current user input file') || text.includes('upload file failed')) return { type: 'provider_upload_failed', actions: ['缩短上下文后重试', '切换模型重试', '把章节批量拆小'] }
    if (text.includes('JSON') || text.includes('解析')) return { type: 'json_parse_failed', actions: ['使用 JSON 修复解析', '降低输出字段复杂度后重试'] }
    if (text.includes('模型未返回正文') || text.includes('未返回正文')) return { type: 'empty_prose', actions: ['降低上下文字数重试', '强制重新生成场景卡', '切换正文模型'] }
    if (text.includes('仿写安全') || text.includes('REFERENCE_SAFETY_BLOCKED')) return { type: 'reference_safety_blocked', actions: ['生成参考迁移计划', '替换高风险专名和桥段', '降低参考强度后重试'] }
    if (text.includes('前置检查') || text.includes('PREFLIGHT')) return { type: 'preflight_blocked', actions: ['补齐章节目标/结尾钩子/角色状态', '生成场景卡', '允许缺材料继续'] }
    if (error?.code === 'APPROVAL_REQUIRED') return { type: 'approval_required', actions: ['人工确认当前关卡', '调整审批策略', '确认后继续执行'] }
    return { type: 'unknown', actions: ['查看原始错误', '手动重试', '切换模型重试'] }
  }

  const getAgentPromptConfig = (project: any) => ({
    version: project.reference_config?.agent_prompt_config?.version || 1,
    prompts: project.reference_config?.agent_prompt_config?.prompts || {},
    project_overrides_enabled: project.reference_config?.agent_prompt_config?.project_overrides_enabled !== false,
    updated_at: project.reference_config?.agent_prompt_config?.updated_at || '',
    history: Array.isArray(project.reference_config?.agent_prompt_config?.history) ? project.reference_config.agent_prompt_config.history : [],
  })

  const buildAgentConfigSnapshot = (project: any, preferredModelId?: number) => {
    const agentConfig = getAgentPromptConfig(project)
    const modelStrategy = project.reference_config?.model_strategy || getModelStrategy(project, preferredModelId)
    const writingBible = project.reference_config?.writing_bible || {}
    const snapshotSource = {
      agent_prompt_config: {
        version: agentConfig.version,
        prompts: agentConfig.prompts,
        project_overrides_enabled: agentConfig.project_overrides_enabled,
        updated_at: agentConfig.updated_at,
      },
      model_strategy: modelStrategy,
      approval_policy: getApprovalPolicy(project),
      production_budget: getProductionBudget(project),
      quality_gate: getQualityGate(project),
      style_lock: getStyleLock(project),
      safety_policy: getSafetyPolicy(project),
      writing_bible: writingBible,
      reference_policy: {
        strength: project.reference_config?.strength || 'balanced',
        references_count: Array.isArray(project.reference_config?.references) ? project.reference_config.references.length : 0,
      },
    }
    const fingerprint = hashText(snapshotSource)
    return {
      snapshot_id: `agentcfg-v${agentConfig.version}-${fingerprint}`,
      created_at: new Date().toISOString(),
      fingerprint,
      agent_prompt_version: agentConfig.version,
      agent_prompt_updated_at: agentConfig.updated_at || '',
      prompt_keys: Object.keys(agentConfig.prompts || {}).sort(),
      model_strategy: modelStrategy,
      approval_policy: snapshotSource.approval_policy,
      quality_gate: snapshotSource.quality_gate,
      style_lock_hash: hashText(snapshotSource.style_lock),
      safety_policy_hash: hashText(snapshotSource.safety_policy),
      writing_bible_hash: hashText(writingBible),
      writing_bible_updated_at: writingBible?.updated_at || '',
      reference_policy: snapshotSource.reference_policy,
      source_hash: fingerprint,
    }
  }

  return {
    buildPipelineSteps,
    updatePipelineStep,
    buildChapterGroupStages,
    updateChapterStages,
    summarizeChapterStages,
    runQueueWorkers,
    getModelStrategy,
    getStageModelId,
    getStageTemperature,
    getApprovalPolicy,
    approvalRequired,
    buildApprovalError,
    getProductionBudget,
    getProductionBudgetDecision,
    classifyGenerationFailure,
    getAgentPromptConfig,
    buildAgentConfigSnapshot,
  }
}

export function createNovelRunExecutionService(ctx: {
  getProject: (workspace: string, id: number) => Promise<any>
  production: NovelProductionService
  generateChapterForGroup: (workspace: string, projectId: number, chapterId: number, options?: any) => Promise<any>
  listNovelRuns?: (workspace: string, projectId: number) => Promise<any[]>
  updateNovelRun?: (workspace: string, runId: number, patch: any) => Promise<any>
  appendNovelRun?: (workspace: string, data: any) => Promise<any>
}) {
  const executeChapterGroupRunRecord = async (activeWorkspace: string, project: any, run: any, options: any = {}) => {
    const listRuns = ctx.listNovelRuns || listNovelRuns
    const updateRun = ctx.updateNovelRun || updateNovelRun
    const appendRun = ctx.appendNovelRun || appendNovelRun
    let payload = compactRunPayload(parseJsonLikePayload(run.output_ref) || {})
    const existingApprovalBlocker = findExistingApprovalBlocker(payload)
    if (existingApprovalBlocker) {
      return {
        run,
        group: payload,
        processed: 0,
        status: 'paused',
        error: existingApprovalBlocker.error,
        error_code: existingApprovalBlocker.error_code,
        recovery_plan: existingApprovalBlocker.recovery_plan,
      }
    }
    const lockOwner = String(options.lock_owner || `worker-${process.pid}-${Date.now()}`)
    const lock = payload.lock || {}
    const lockExpiresAt = lock.expires_at ? new Date(String(lock.expires_at)).getTime() : 0
    if (lock.owner && lock.owner !== lockOwner && lockExpiresAt > Date.now()) {
      return { run, group: payload, processed: 0, status: 'locked', locked_by: lock.owner }
    }
    payload = compactRunPayload({
      ...payload,
      lock: {
        owner: lockOwner,
        acquired_at: new Date().toISOString(),
        heartbeat_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
    })
    await updateRun(activeWorkspace, run.id, { status: 'running', output_ref: runJson(payload) })
    const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
    const maxChapters = Math.max(1, Math.min(50, Number(options.max_chapters || chapters.length || 10)))
    const retryLimit = Math.max(0, Math.min(5, Number(options.retry_limit ?? payload.model_strategy?.cost_policy?.retry_limit ?? 2)))
    const startedAt = Date.now()
    const results: any[] = Array.isArray(payload.results) ? payload.results : []
    let processed = 0
    let status = 'running'
    let errorMessage = ''
    await updateRun(activeWorkspace, run.id, {
      status: 'running',
      output_ref: runJson({ ...payload, started_at: payload.started_at || new Date().toISOString(), phase: '自动执行章节群' }),
    })

    const persistStage = async (index: number, stage: string, patch: any = {}) => {
      const item = chapters[index]
      if (!item) return
      const compactPatch = compactRunStateValue(patch) || {}
      const stages = ctx.production.updateChapterStages(item.stages || [], stage, compactPatch)
      const summary = ctx.production.summarizeChapterStages(stages)
      let scenes = Array.isArray(item.scenes) ? item.scenes : []
      const rawSceneCards = Array.isArray(patch.scene_cards)
        ? patch.scene_cards
        : Array.isArray(patch.sceneCards)
          ? patch.sceneCards
          : []
      const sceneCards = rawSceneCards.map(compactRunSceneCard)
      if (stage === 'scene_cards' && sceneCards.length > 0) {
        scenes = normalizeSceneProduction(sceneCards, scenes, 'planned')
      }
      if (patch.scene_status) {
        scenes = advanceSceneProduction(scenes, patch.scene_status, stage === 'draft' ? { generated_at: new Date().toISOString() } : {})
      }
      chapters[index] = compactRunChapterItem({ ...item, scenes, stages, current_step: summary.current_step, current_label: summary.current_label })
      payload = compactRunPayload({ ...payload, chapters, current_index: index, phase: `第${item.chapter_no}章：${summary.current_label}` })
      await updateRun(activeWorkspace, run.id, { status: 'running', output_ref: runJson(payload), duration_ms: Date.now() - startedAt })
    }

    for (let index = Number(payload.current_index || 0); index < chapters.length && processed < maxChapters; index += 1) {
      const latestRun = (await listRuns(activeWorkspace, project.id)).find(item => item.id === run.id)
      if (latestRun?.status === 'paused') {
        status = 'paused'
        payload = { ...(parseJsonLikePayload(latestRun.output_ref) || payload), current_index: index, phase: '已暂停' }
        break
      }
      const item = chapters[index]
        payload = compactRunPayload({
          ...payload,
          lock: {
            ...(payload.lock || {}),
            heartbeat_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          },
        })
      if (!item?.id) continue
      if (item.next_run_at && new Date(String(item.next_run_at)).getTime() > Date.now()) {
        payload = compactRunPayload({ ...payload, chapters, current_index: index, phase: `第${item.chapter_no}章等待重试窗口` })
        await updateRun(activeWorkspace, run.id, { status: 'ready', output_ref: runJson(payload) })
        status = 'ready'
        break
      }
      if (item.status === 'written' && options.regenerate !== true) {
        chapters[index] = compactRunChapterItem({ ...item, status: 'skipped', skipped_reason: '已有正文' })
        payload = compactRunPayload({ ...payload, chapters, current_index: index + 1 })
        await updateRun(activeWorkspace, run.id, { status: 'running', output_ref: runJson(payload) })
        continue
      }
      chapters[index] = compactRunChapterItem({ ...item, status: 'running', started_at: new Date().toISOString(), stages: item.stages?.length ? item.stages : ctx.production.buildChapterGroupStages() })
      payload = compactRunPayload({ ...payload, chapters, current_index: index, phase: `生成第${item.chapter_no}章` })
      await updateRun(activeWorkspace, run.id, { status: 'running', output_ref: runJson(payload) })
      try {
        const productionMode = options.production_mode || payload.production_mode || payload.policy?.production_mode || 'draft_review_revise_store'
        const approvalPolicy = productionMode === 'full_auto'
          ? { ...(payload.approval_policy || ctx.production.getApprovalPolicy(project)), allow_full_auto: true }
          : (payload.approval_policy || ctx.production.getApprovalPolicy(project))
        const chapterResult = await ctx.generateChapterForGroup(activeWorkspace, project.id, Number(item.id), {
          ...options,
          model_id: options.model_id || payload.model_strategy?.preferred_model_id,
          production_mode: productionMode,
          word_target_mode: options.word_target_mode || payload.word_target_mode,
          target_word_count: options.target_word_count || payload.target_word_count,
          quality_threshold: options.quality_threshold || payload.policy?.quality_threshold,
          allow_incomplete: options.allow_incomplete === true || payload.policy?.allow_incomplete === true || payload.unattended?.allow_incomplete === true,
          force_scene_cards: options.force_scene_cards === true || payload.policy?.force_scene_cards === true || payload.unattended?.force_scene_cards === true,
          auto_repair_missing_material: options.auto_repair_missing_material === true || payload.policy?.auto_repair_missing_material === true || payload.unattended?.auto_repair_missing_material === true,
          auto_repair_quality_gate: options.auto_repair_quality_gate === true || payload.policy?.auto_repair_quality_gate === true || payload.unattended?.auto_repair_quality_gate === true,
          approval_policy: approvalPolicy,
          approvals: item.approvals || {},
          onStage: async (stage: string, patch: any = {}) => {
            try {
              await persistStage(index, stage, patch)
            } catch (stageError) {
              console.warn('[novel] failed to persist chapter group stage:', stage, String(stageError).slice(0, 160))
            }
          },
        })
        const qualityThreshold = options.quality_threshold || payload.policy?.quality_threshold
        const returnedApprovalBlocker = buildReturnedApprovalBlocker(chapterResult, qualityThreshold)
        if (returnedApprovalBlocker) {
          const failedStages = ctx.production.updateChapterStages(chapters[index]?.stages || [], 'review', {
            status: 'needs_confirmation',
            error: `${returnedApprovalBlocker.label}：${returnedApprovalBlocker.detail}`,
            approval_stage: 'approval_blocker',
          })
          const resultItem = {
            id: item.id,
            chapter_no: item.chapter_no,
            title: item.title,
            status: 'needs_approval',
            score: chapterResult.score ?? returnedApprovalBlocker.score ?? null,
            revised: chapterResult.revised,
            stages: failedStages,
            approval_stage: 'approval_blocker',
            approval_context: returnedApprovalBlocker,
            config_snapshot: chapterResult.config_snapshot || payload.config_snapshot || ctx.production.buildAgentConfigSnapshot(project, options.model_id || payload.model_strategy?.preferred_model_id),
            error: `${returnedApprovalBlocker.label}：${returnedApprovalBlocker.detail}`,
            error_code: 'APPROVAL_BLOCKER',
            recovery_plan: {
              type: 'approval_blocker',
              summary: '章节生成返回成功，但入库阻断仍未解除；已暂停后续无人值守续写。',
              actions: ['按入库阻断原因修订正文', '重新运行正文质检和入库门禁', '确认阻断解除后再继续后续章节生成'],
            },
            failed_at: new Date().toISOString(),
          }
          const storedResultItem = compactRunChapterItem(resultItem)
          chapters[index] = storedResultItem
          results.push(storedResultItem)
          status = 'paused'
          errorMessage = storedResultItem.error
          payload = compactRunPayload({
            ...payload,
            chapters,
            results,
            current_index: index,
            phase: `第${item.chapter_no}章入库阻断未解除，已暂停`,
            last_error: storedResultItem,
          })
          await updateRun(activeWorkspace, run.id, { status, output_ref: runJson(payload), error_message: errorMessage })
          break
        }
        const storyStateError = compactText((chapterResult.story_state_update as any)?.error || '', 300)
        const postDeliveryQuality = buildOhStoryPostDeliveryQuality(chapterResult, item)
        const postDeliveryOpenCheck = Array.isArray(postDeliveryQuality.checks)
          ? postDeliveryQuality.checks.find((check: any) => String(check?.status || '') !== 'ok')
          : null
        const strictUnattendedQualityGate = payload.unattended?.enabled === true
          && options.allow_incomplete !== true
          && payload.policy?.allow_incomplete !== true
          && payload.unattended?.allow_incomplete !== true
        const postDeliveryQualityError = strictUnattendedQualityGate && postDeliveryQuality.status !== 'ok'
          ? compactText(`${postDeliveryOpenCheck?.label || '交付后质检'}：${postDeliveryOpenCheck?.summary || 'Step 3 仍有未闭环项。'}`, 300)
          : ''
        let resultItem = {
          id: item.id,
          chapter_no: item.chapter_no,
          title: item.title,
          status: storyStateError ? 'story_state_failed' : postDeliveryQualityError ? 'post_delivery_quality_failed' : 'success',
          score: chapterResult.score,
          revised: chapterResult.revised,
          production_mode: productionMode,
          config_snapshot: chapterResult.config_snapshot || payload.config_snapshot || null,
          scenes: advanceSceneProduction(chapters[index]?.scenes || [], 'accepted'),
          stages: (chapterResult.story_state_update as any)?.skipped
            ? (chapters[index]?.stages || [])
            : ctx.production.updateChapterStages(chapters[index]?.stages || [], 'story_state', { status: (chapterResult.story_state_update as any)?.error ? 'failed' : 'success' }),
          error: storyStateError || postDeliveryQualityError,
          error_code: storyStateError ? 'STORY_STATE_UPDATE_FAILED' : postDeliveryQualityError ? 'POST_DELIVERY_QUALITY_WARN' : '',
          post_delivery_quality: postDeliveryQuality,
          recovery_plan: storyStateError
            ? {
                type: 'story_state_update_failed',
                summary: '章节正文已生成，但故事状态机更新失败；暂停后续无人值守续写，避免下一章读取旧状态。',
                actions: ['修复故事状态机更新错误', '确认上一章角色状态、伏笔、时间线和资产状态已入库', '再继续后续章节生成'],
              }
            : postDeliveryQualityError
              ? {
                  type: 'post_delivery_quality_warn',
                  summary: '章节正文已生成，但 oh-story Step 3 交付后质检仍有未闭环项；暂停后续无人值守续写。',
                  actions: ['按 post_delivery_quality.checks 修复未闭环项', '重新运行当前章节交付后质检', '确认 Step 3 全部 ok 后再继续无人值守下一章'],
                }
            : null,
          completed_at: new Date().toISOString(),
        }
        if (postDeliveryQualityError) {
          const repairRun = await appendPostDeliveryQualityRepairRun(appendRun, activeWorkspace, project.id, run, resultItem, postDeliveryQuality).catch(error => {
            console.warn('[novel] failed to append post-delivery quality repair run:', String(error).slice(0, 160))
            return null
          })
          if (repairRun?.id) {
            resultItem = {
              ...resultItem,
              repair_run_id: repairRun.id,
              repair_queue: {
                run_id: repairRun.id,
                run_type: repairRun.run_type,
                task_count: buildPostDeliveryQualityRepairTasks(resultItem, postDeliveryQuality, run.id).length,
              },
            }
          }
        }
        const storedResultItem = compactRunChapterItem(resultItem)
        chapters[index] = storedResultItem
        results.push(storedResultItem)
        processed += 1
        if (storyStateError) {
          status = 'paused'
          errorMessage = storyStateError
          payload = compactRunPayload({
            ...payload,
            chapters,
            results,
            current_index: index,
            phase: `第${item.chapter_no}章状态机更新失败，已暂停`,
            last_error: storedResultItem,
          })
          await updateRun(activeWorkspace, run.id, { status, output_ref: runJson(payload), error_message: errorMessage })
          break
        }
        if (postDeliveryQualityError) {
          status = 'paused'
          errorMessage = postDeliveryQualityError
          payload = compactRunPayload({
            ...payload,
            chapters,
            results,
            current_index: index,
            phase: `第${item.chapter_no}章交付后质检未闭环，已暂停`,
            last_error: storedResultItem,
          })
          await updateRun(activeWorkspace, run.id, { status, output_ref: runJson(payload), error_message: errorMessage })
          break
        }
      } catch (chapterError: any) {
        const wasCanceled = options.abortSignal?.aborted || isAbortLikeError(chapterError)
        if (wasCanceled) {
          const currentStages = chapters[index]?.stages || ctx.production.buildChapterGroupStages()
          const resultItem = compactRunChapterItem({
            ...item,
            status: 'ready',
            stages: currentStages,
            attempts: Number(item.attempts || 0),
            next_run_at: '',
            error: '',
            error_code: 'REQUEST_CANCELED',
            stopped_at: new Date().toISOString(),
          })
          chapters[index] = resultItem
          status = 'ready'
          errorMessage = ''
          payload = compactRunPayload({
            ...payload,
            chapters,
            results,
            current_index: index,
            phase: `第${item.chapter_no}章已停止，可继续执行`,
            last_error: null,
          })
          await updateRun(activeWorkspace, run.id, { status, output_ref: runJson(payload), error_message: '' })
          break
        }
        const isApproval = chapterError?.code === 'APPROVAL_REQUIRED'
        const autoRetryQualityGate = isApproval
          && String(chapterError?.approval_stage || '') === 'quality_gate'
          && payload.unattended?.enabled === true
          && (
            options.auto_repair_quality_gate === true
            || payload.policy?.auto_repair_quality_gate === true
            || payload.unattended?.auto_repair_quality_gate === true
          )
        const blocksForApproval = isApproval && !autoRetryQualityGate
        const failedStages = (() => {
          const current = chapters[index]?.stages || ctx.production.buildChapterGroupStages()
          const active = current.find((step: any) => ['running', 'ready', 'needs_confirmation'].includes(step.status)) || current.find((step: any) => step.status === 'pending') || current[0]
          return active ? ctx.production.updateChapterStages(current, active.key, {
            status: blocksForApproval ? 'needs_confirmation' : 'failed',
            error: String(chapterError?.message || chapterError),
            approval_stage: blocksForApproval ? chapterError?.approval_stage || '' : '',
          }) : current
        })()
        const attempts = Number(item.attempts || 0) + (blocksForApproval ? 0 : 1)
        const canRetry = !blocksForApproval && attempts <= retryLimit
        const nextRunAt = canRetry
          ? autoRetryQualityGate
            ? ''
            : new Date(Date.now() + Math.min(15, attempts * 2) * 60000).toISOString()
          : ''
        const resultItem = compactRunChapterItem({
          id: item.id,
          chapter_no: item.chapter_no,
          title: item.title,
          status: blocksForApproval ? 'needs_approval' : (canRetry ? 'ready' : 'failed'),
          stages: failedStages,
          attempts,
          next_run_at: nextRunAt,
          approval_stage: blocksForApproval ? chapterError?.approval_stage || '' : '',
          approval_context: blocksForApproval ? chapterError?.approval_context || null : null,
          config_snapshot: payload.config_snapshot || ctx.production.buildAgentConfigSnapshot(project, options.model_id || payload.model_strategy?.preferred_model_id),
          error: String(chapterError?.message || chapterError),
          error_code: autoRetryQualityGate ? 'QUALITY_GATE_RETRY_REQUIRED' : chapterError?.code || '',
          recovery_plan: autoRetryQualityGate
            ? {
                type: 'quality_gate_retry',
                summary: '无人值守质量门禁未通过，已转为自动重试当前章；不会进入人工审批卡点。',
                actions: ['重新生成或修订当前章正文', '沿用质量门禁原因强化下一次提示', '达到重试上限后再暂停人工处理'],
              }
            : ctx.production.classifyGenerationFailure(chapterError),
          failed_at: new Date().toISOString(),
        })
        chapters[index] = resultItem
        results.push(resultItem)
        errorMessage = resultItem.error
        if (blocksForApproval || canRetry || payload.policy?.stop_on_failure !== false) {
          status = blocksForApproval ? 'paused' : (canRetry ? 'ready' : 'paused')
          payload = compactRunPayload({
            ...payload,
            chapters,
            results,
            current_index: index,
            phase: blocksForApproval
              ? `第${item.chapter_no}章等待人工确认`
              : autoRetryQualityGate && canRetry
                ? `第${item.chapter_no}章质量门禁未通过，准备自动重试`
                : canRetry
                  ? `第${item.chapter_no}章失败，等待重试`
                  : `第${item.chapter_no}章失败，已暂停`,
            last_error: resultItem,
          })
          await updateRun(activeWorkspace, run.id, { status, output_ref: runJson(payload), error_message: errorMessage })
          break
        }
      }
      payload = compactRunPayload({ ...payload, chapters, results, current_index: index + 1, phase: '自动执行章节群' })
      await updateRun(activeWorkspace, run.id, {
        status: 'running',
        output_ref: runJson(payload),
        duration_ms: Date.now() - startedAt,
      })
    }
    if (status === 'running') {
      status = chapters.every((item: any) => ['success', 'skipped', 'written'].includes(item.status)) ? 'success' : 'ready'
    }
    if (status === 'success') {
      payload = compactRunPayload({ ...payload, post_batch_quality_check: buildOhStoryBatchQualityCheck(chapters, results) })
    }
    const updated = await updateRun(activeWorkspace, run.id, {
      status,
      output_ref: runJson(compactRunPayload({ ...payload, chapters, results, lock: null, phase: status === 'success' ? '章节群已完成' : payload.phase, finished_at: status === 'success' ? new Date().toISOString() : undefined })),
      duration_ms: Date.now() - startedAt,
      error_message: errorMessage,
    })
    requestRuntimeGc()
    return { run: updated, group: parseJsonLikePayload(updated?.output_ref), processed, status }
  }

  return { executeChapterGroupRunRecord }
}

export type NovelProductionService = ReturnType<typeof createNovelProductionService>
