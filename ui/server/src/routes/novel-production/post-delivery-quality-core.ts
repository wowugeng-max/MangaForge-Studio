import { compactText, parseJsonLikePayload } from '../novel-route-utils'
import { compactRunStateValue, compactWarningList, hashText, runJson, stableStringify } from './run-state'

export function buildReturnedApprovalBlocker(chapterResult: any = {}, qualityThreshold: any = 0) {
  const payload = chapterResult || {}
  const admissionStatus = String(payload.admission_status || payload.admissionStatus || '')
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

  if (admissionStatus === 'blocked_invalid') {
    return {
      type: 'blocked_invalid',
      label: '正文入库阻断',
      detail: compactText(payload.error || payload.message || '正文未通过有效性检查，未入库。', 240),
      score: payload.score ?? null,
      reasons: Array.isArray(payload.reasons) ? payload.reasons : [],
      source: 'admission_status',
    }
  }

  if (admissionStatus === 'accepted' || admissionStatus === 'accepted_with_warnings') return null

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

export function findExistingApprovalBlocker(payload: any = {}) {
  const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
  const index = Number(payload.current_index || 0)
  const item = chapters[index] || {}
  const lastError = payload.last_error || payload.lastError || {}
  const approvalStage = String(item.approval_stage || item.approvalStage || lastError.approval_stage || lastError.approvalStage || '')
  const errorCode = String(item.error_code || item.errorCode || lastError.error_code || lastError.errorCode || '')
  const isAdmissionBlocker = approvalStage === 'approval_blocker' || errorCode === 'APPROVAL_BLOCKER'
  const isLegacyApproval = errorCode === 'APPROVAL_REQUIRED' && Boolean(approvalStage)
  if (!isAdmissionBlocker && !isLegacyApproval) return null
  return {
    item,
    index,
    error: item.error || lastError.error || '当前章节存在入库阻断，不能直接执行绕过。',
    error_code: isAdmissionBlocker ? 'APPROVAL_BLOCKER_REQUIRES_REPAIR' : 'APPROVAL_REQUIRED',
    recovery_plan: lastError.recovery_plan || lastError.recoveryPlan || item.recovery_plan || item.recoveryPlan || {
      type: 'approval_blocker',
      actions: ['按入库阻断原因修订正文', '重新运行正文质检和入库门禁', '确认阻断解除后再继续后续章节生成'],
    },
  }
}

export function findExistingTerminalAdmission(payload: any = {}) {
  const chapters = Array.isArray(payload.chapters) ? payload.chapters : []
  const index = Number(payload.current_index || 0)
  const item = chapters[index] || {}
  const lastError = payload.last_error || payload.lastError || {}
  const admissionStatus = String(item.admission_status || item.admissionStatus || lastError.admission_status || lastError.admissionStatus || '')
  const errorCode = String(item.error_code || item.errorCode || lastError.error_code || lastError.errorCode || '')
  if (admissionStatus !== 'blocked_invalid' && errorCode !== 'PROSE_ADMISSION_BLOCKED_INVALID') return null
  return {
    item,
    index,
    error: item.error || lastError.error || '正文未通过有效性检查且未入库。',
    error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
    recovery_plan: lastError.recovery_plan || lastError.recoveryPlan || item.recovery_plan || item.recoveryPlan || {
      type: 'blocked_invalid',
      actions: ['显式修复或重置当前章节终态', '重新提交正文生成'],
    },
  }
}

export function syncCheckStatus(value: any) {
  if (!value || typeof value !== 'object') return 'unknown'
  const explicit = String(value.status || '').toLowerCase()
  if (['ok', 'pass', 'passed', 'success'].includes(explicit)) return 'ok'
  if (['warn', 'warning', 'fail', 'failed', 'error', 'blocked'].includes(explicit)) return 'warn'
  const count = Number(value.missed_count ?? value.missedCount ?? value.risk_count ?? value.riskCount ?? value.weak_count ?? value.weakCount ?? 0)
  return count > 0 ? 'warn' : 'unknown'
}

export function buildOhStoryPostDeliveryQuality(chapterResult: any = {}, chapter: any = {}) {
  const state = chapterResult.story_state_update || chapterResult.storyStateUpdate || {}
  const storyStateStatus = String(chapterResult.story_state_status || chapterResult.storyStateStatus || '')
  const storyStateWarning = chapterResult.story_state_warning || chapterResult.storyStateWarning
  const syncs: Record<string, any> = {
    title_uniqueness: state.chapter_title_uniqueness_sync || state.chapterTitleUniquenessSync,
    prose_meta: state.prose_meta_sync || state.proseMetaSync,
    chapter_hook: state.chapter_hook_sync || state.chapterHookSync,
    blueprint_consumption: state.chapter_blueprint_sync || state.chapterBlueprintSync,
    foreshadowing_delta: state.foreshadowing_delta_sync || state.foreshadowingDeltaSync,
    deterministic_cleanup: state.deterministic_prose_cleanup || state.deterministicProseCleanup,
    story_state: storyStateStatus === 'pending' || storyStateWarning || state?.error
      ? { status: 'warn', summary: storyStateWarning?.error || storyStateWarning?.message || storyStateWarning?.summary || storyStateWarning || state.error || 'Story State 同步待完成。' }
      : { status: state?.skipped ? 'unknown' : 'ok' },
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
      missed_count: Number(value?.missed_count ?? value?.missedCount ?? 0) || 0,
      evidence: compactRunStateValue(value?.evidence || value?.evidences || []),
      next_actions: compactRunStateValue(value?.next_actions || value?.nextActions || []),
      details: compactRunStateValue(value || {}),
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

