import {
  type AnyRecord,
  arrayValue,
  firstText,
  limitedArray,
  objectValue,
  parseJsonValue,
  text,
} from './utils'
import {
  camelFieldName,
  deterministicProseCleanupResidualsFromQuality,
  genericClosureEvidenceDetail,
  metricNumber,
  preDraftExecutionReceiptSources,
  qualityContractMissingFields,
  qualityContractResidualsFromQuality,
  sceneCardDirectiveResidualsFromQuality,
  sceneCardReceiptResidualsFromQuality,
  summarizeEvidenceItem,
} from './quality-contract'
import {
  isSingleChapterRecoveryEvidenceTask,
  normalizeFailedDeliveryRiskReceiptRepairs,
  deliveryRiskStrategy,
  isOpeningHandoffMiss,
  repairTaskIssueType,
} from './support'
import {
  normalizeApprovalBlockerRepairContext,
  normalizeDeliveryRiskContext,
  qualityContractClosurePlan,
} from './support-normalize'
import {
  normalizePostDeliveryQualityRepair,
  normalizePostDeliveryQualityClosureResult,
  normalizePostBatchQualityClosureResult,
  normalizeSceneCardReceiptRepair,
  normalizeSceneCardDirectiveRepair,
  normalizeQualityAuditRepair,
  normalizeDeslopRepairReceiptRepair,
  normalizeRevisionCascadeImpactRepair,
  normalizeRevisionScopeGuardRepair,
  normalizeRevisionContextReceiptRepair,
  normalizeProseRevisionReceiptSyncRepair,
  normalizeQualityAuditRepairReceiptRepair,
  deslopRepairReceiptResidualsFromQuality,
  revisionCascadeImpactResidualsFromQuality,
  revisionScopeGuardResidualsFromQuality,
  revisionContextReceiptResidualsFromQuality,
  proseRevisionReceiptResidualsFromQuality,
  qualityAuditRepairReceiptResidualsFromQuality,
  qualityAuditResidualsFromQuality,
  preDraftExecutionReceiptKeyForTask,
  preDraftExecutionResidualsFromQuality,
  sourceReadinessResidualsFromQuality,
  stateTrackingResidualsFromQuality,
} from './support-normalize-repairs'


export function buildDeliveryRiskRevisionClosurePlan(task: AnyRecord, revisionResult: AnyRecord = {}) {
  const isStorylineDecision = task?.source === 'storyline_diff_decision' || Boolean(task?.decision_key)
  if (isStorylineDecision) {
    const quality = objectValue(revisionResult.quality_refresh)
    const storyStateUpdate = objectValue(revisionResult.story_state_update)
    const storylineSync = objectValue(storyStateUpdate.storyline_sync || revisionResult.storyline_sync)
    const missedCount = arrayValue(storylineSync.missed).length
    const unplannedCount = arrayValue(storylineSync.unplanned).length
    const forbiddenCount = arrayValue(storylineSync.forbidden_touched || storylineSync.forbiddenTouched).length
    const diffCount = missedCount + unplannedCount + forbiddenCount
    const qualityOk = quality.ok !== false
    const status = firstText(storylineSync.status)
    const cleared = qualityOk && (status === 'ok' || diffCount === 0)
    const decisionKey = firstText(task.decision_key)
    const diffSummary = [
      missedCount ? `漏推 ${missedCount}` : '',
      unplannedCount ? `额外推进 ${unplannedCount}` : '',
      forbiddenCount ? `禁揭 ${forbiddenCount}` : '',
    ].filter(Boolean).join('，')
    if (cleared) {
      return {
        taskStatus: 'resolved',
        annotationStatus: '',
        annotationKey: '',
        note: `剧情线决策复检通过${decisionKey ? `：${decisionKey}` : ''}。`,
      }
    }
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey: '',
        note: `剧情线决策已执行，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey: '',
      note: `剧情线仍有差异：${diffSummary || firstText(storylineSync.label, status, '需要人工复查')}。`,
    }
  }

  const isRecoveryEvidenceMismatch = firstText(task?.issue_type, task?.issueType) === 'recovery_evidence_mismatch'
  if (isRecoveryEvidenceMismatch) {
    const singleChapterRecoveryEvidence = isSingleChapterRecoveryEvidenceTask(task)
    const quality = objectValue(revisionResult.quality_refresh)
    const recoveryReview = objectValue(revisionResult.recovery_evidence_review || revisionResult.recoveryEvidenceReview)
    const convergence = objectValue(revisionResult.delivery_risk_convergence)
    const qualityOk = quality.ok === true
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    const hasRecoveryReview = Object.keys(recoveryReview).length > 0
    const hasFailedEvidenceField = Array.isArray(recoveryReview.failed_evidence) || Array.isArray(recoveryReview.failedEvidence)
    const failedEvidence = arrayValue(recoveryReview.failed_evidence || recoveryReview.failedEvidence)
      .map(item => summarizeEvidenceItem(item))
      .filter(Boolean)
    const reviewStatus = firstText(recoveryReview.status)
    const convergenceStatus = firstText(convergence.status)
    const hasConvergence = Object.keys(convergence).length > 0
    const hasResidualField = convergence.residual_count !== undefined || convergence.residualCount !== undefined
    const residualCount = Math.max(0, Number(convergence.residual_count ?? convergence.residualCount ?? 0) || 0)
    const clearedByRecoveryReview = hasRecoveryReview && (reviewStatus === 'ok' || (hasFailedEvidenceField && failedEvidence.length === 0))
    const clearedByConvergence = !hasRecoveryReview && hasConvergence && (convergenceStatus === 'cleared' || (hasResidualField && residualCount === 0))
    const cleared = qualityOk && (clearedByRecoveryReview || clearedByConvergence)
    if (cleared) {
      return {
        taskStatus: 'resolved',
        annotationStatus: '',
        annotationKey: '',
        note: singleChapterRecoveryEvidence
          ? `单章治理复查通过${scoreText}，governance_recheck_sync failed_evidence 已清空。`
          : `恢复依据复检通过${scoreText}，failed_evidence 已清空。`,
      }
    }
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey: '',
        note: singleChapterRecoveryEvidence
          ? `单章恢复依据已回修，但治理复查未通过：${firstText(quality.error, '需要人工复查')}。`
          : `恢复依据已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    const evidenceSummary = failedEvidence.length > 0
      ? failedEvidence.slice(0, 3).join('；')
      : firstText(recoveryReview.summary, convergence.label, convergence.summary, reviewStatus, convergenceStatus, '需要人工复查')
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey: '',
      note: `${singleChapterRecoveryEvidence ? '单章恢复依据' : '恢复依据'}仍有失效项：${evidenceSummary}${residualCount ? `，残留 ${residualCount} 项` : ''}。`,
    }
  }

  const isPostBatchQualityWarning = firstText(task?.issue_type, task?.issueType) === 'post_batch_quality_warning'
  if (isPostBatchQualityWarning) {
    const quality = objectValue(revisionResult.quality_refresh || revisionResult.qualityRefresh)
    const qualityOk = quality.ok === true
    const qualityResult = normalizePostBatchQualityClosureResult(revisionResult)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey: '',
        note: `批次质检已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (qualityResult.cleared) {
      return {
        taskStatus: 'resolved',
        annotationStatus: '',
        annotationKey: '',
        note: `批次质检复检通过${scoreText}，post_batch_quality_check 已清零。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey: '',
      note: `批次质检仍未闭环：${qualityResult.residuals.slice(0, 4).join('；')}。`,
    }
  }

  const postDeliveryQualityRepair = normalizePostDeliveryQualityRepair(task || {})
  if (postDeliveryQualityRepair) {
    const quality = objectValue(revisionResult.quality_refresh || revisionResult.qualityRefresh)
    const qualityOk = quality.ok === true
    const qualityResult = normalizePostDeliveryQualityClosureResult(task || {}, revisionResult)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey: '',
        note: `单章交付后质检已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (qualityResult.cleared) {
      return {
        taskStatus: 'resolved',
        annotationStatus: '',
        annotationKey: '',
        note: `单章交付后质检复检通过${scoreText}，post_delivery_quality 已清零。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey: '',
      note: `单章交付后质检仍未闭环：${qualityResult.residuals.slice(0, 4).join('；')}。`,
    }
  }

  const approvalBlocker = normalizeApprovalBlockerRepairContext(task || {})
  if (approvalBlocker) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const convergence = objectValue(revisionResult.delivery_risk_convergence)
    const after = objectValue(convergence.after)
    const afterHasBlockerField = Object.prototype.hasOwnProperty.call(after, 'approval_blocker')
      || Object.prototype.hasOwnProperty.call(after, 'approvalBlocker')
    const afterBlocker = after.approval_blocker || after.approvalBlocker || null
    const qualityOk = quality.ok === true
    const residualCount = Math.max(0, Number(convergence.residual_count ?? convergence.residualCount ?? after.total_count ?? after.totalCount ?? 0) || 0)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `入库阻断已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (afterHasBlockerField && !afterBlocker) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `入库阻断已解除${scoreText}${residualCount ? `，仍有其他交稿风险 ${residualCount} 项需继续处理` : ''}。`,
      }
    }
    if (!afterHasBlockerField && (firstText(convergence.status) === 'cleared' || residualCount === 0)) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `入库阻断已解除${scoreText}，交稿风险已清零。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `入库阻断仍未解除：${firstText(afterBlocker?.label, afterBlocker?.detail, convergence.label, convergence.summary, '需要人工复查')}。`,
    }
  }

  const sceneCardReceiptRepair = normalizeSceneCardReceiptRepair(task || {})
  if (sceneCardReceiptRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = sceneCardReceiptResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `场景卡回执已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `场景卡回执复检通过${scoreText}，scene_card_receipt 相关残留已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `场景卡回执仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const sceneCardDirectiveRepair = normalizeSceneCardDirectiveRepair(task || {})
  if (sceneCardDirectiveRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = sceneCardDirectiveResidualsFromQuality(quality, sceneCardDirectiveRepair.issueType)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `场景卡执行禁令已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `场景卡执行禁令复检通过${scoreText}，scene_card_*_execution_directives / forbidden_directives 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `场景卡执行禁令仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const deslopRepairReceiptRepair = normalizeDeslopRepairReceiptRepair(task || {})
  if (deslopRepairReceiptRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = deslopRepairReceiptResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `去AI味修复回执已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `去AI味修复回执复检通过${scoreText}，deslop_repair_receipt_sync 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `去AI味修复回执仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const revisionCascadeImpactRepair = normalizeRevisionCascadeImpactRepair(task || {})
  if (revisionCascadeImpactRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = revisionCascadeImpactResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `修订级联影响已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `修订级联影响复检通过${scoreText}，revision_cascade_impact_sync 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `修订级联影响仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const revisionScopeGuardRepair = normalizeRevisionScopeGuardRepair(task || {})
  if (revisionScopeGuardRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = revisionScopeGuardResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `修订幅度已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `修订幅度复检通过${scoreText}，revision_scope_guard_sync 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `修订幅度仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const revisionContextReceiptRepair = normalizeRevisionContextReceiptRepair(task || {})
  if (revisionContextReceiptRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = revisionContextReceiptResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `修订上下文已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `修订上下文复检通过${scoreText}，revision_context_receipts_sync 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `修订上下文仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const proseRevisionReceiptRepair = normalizeProseRevisionReceiptSyncRepair(task || {})
  if (proseRevisionReceiptRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = proseRevisionReceiptResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `修订回执已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `修订回执复检通过${scoreText}，prose_revision_receipt_sync 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `修订回执仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const qualityAuditRepairReceiptRepair = normalizeQualityAuditRepairReceiptRepair(task || {})
  if (qualityAuditRepairReceiptRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityAuditRepairReceiptResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `质量诊断修复回执已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `质量诊断修复回执复检通过${scoreText}，quality_audit_repair_receipt_sync 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `质量诊断修复回执仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const qualityAuditRepair = normalizeQualityAuditRepair(task || {})
  if (qualityAuditRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityAuditResidualsFromQuality(quality, qualityAuditRepair.issueType)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `质量诊断已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `质量诊断复检通过${scoreText}，quality_audit_checks 相关 fail/warn 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `质量诊断仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isSourceReadinessRepair = firstText(task?.issue_type, task?.issueType) === 'source_readiness_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'source_readiness'
  if (isSourceReadinessRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = sourceReadinessResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `来源就绪已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `来源就绪复检通过${scoreText}，source_readiness_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `来源就绪仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isStateTrackingRepair = firstText(task?.issue_type, task?.issueType) === 'state_tracking_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'state_tracking'
  if (isStateTrackingRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = stateTrackingResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `状态跟踪已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `状态跟踪复检通过${scoreText}，state_tracking_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `状态跟踪仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isStoryStateUpdateRepair = repairTaskIssueType(task || {}) === 'story_state_update_gap'
    || repairTaskIssueType(task || {}) === 'state_delta_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'story_state'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'story_state_update'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'state_delta'
  if (isStoryStateUpdateRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'story_state_update_checks', 'storyStateUpdateChecks', '状态写回')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `状态写回已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `状态写回复检通过${scoreText}，story_state_update_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `状态写回仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const qualityContractRepairIssueType = repairTaskIssueType(task || {})
  const qualityContractRepairCategory = firstText(task?.annotation_category, task?.annotationCategory, task?.category)
  const qualityContractRepair = [
    {
      issueTypes: ['innovation_missed', 'innovation_execution_missed'],
      categories: ['innovation'],
      snakeKey: 'innovation_checks',
      camelKey: 'innovationChecks',
      label: '创新执行',
    },
    {
      issueTypes: ['chapter_attraction_gap'],
      categories: ['chapter_attraction'],
      snakeKey: 'chapter_attraction_checks',
      camelKey: 'chapterAttractionChecks',
      label: '章节吸引力',
    },
    {
      issueTypes: ['story_drive_gap'],
      categories: ['story_drive'],
      snakeKey: 'story_drive_checks',
      camelKey: 'storyDriveChecks',
      label: '故事驱动力',
    },
    {
      issueTypes: ['character_arc_gap'],
      categories: ['character_arc'],
      snakeKey: 'character_arc_checks',
      camelKey: 'characterArcChecks',
      label: '人物弧光',
    },
    {
      issueTypes: ['chapter_benchmark_gap'],
      categories: ['chapter_benchmark'],
      snakeKey: 'chapter_benchmark_checks',
      camelKey: 'chapterBenchmarkChecks',
      label: '章节标杆',
    },
    {
      issueTypes: ['style_sample_gap'],
      categories: ['style_sample'],
      snakeKey: 'style_sample_checks',
      camelKey: 'styleSampleChecks',
      label: '样章风格',
    },
  ].find(config => config.issueTypes.includes(qualityContractRepairIssueType) || config.categories.includes(qualityContractRepairCategory))
  if (qualityContractRepair) {
    return qualityContractClosurePlan(
      task,
      revisionResult,
      qualityContractRepair.snakeKey,
      qualityContractRepair.camelKey,
      qualityContractRepair.label,
    )
  }

  const deliveryRiskForClosure = normalizeDeliveryRiskContext(task || {})
  const issueTypeForClosure = firstText(task?.issue_type, task?.issueType)
  const isChapterHandoffRepair = issueTypeForClosure === 'chapter_handoff_missed'
    || issueTypeForClosure === 'opening_handoff_debt'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'chapter_handoff'
    || Boolean(deliveryRiskForClosure?.openingHandoffMissed?.length)
  if (isChapterHandoffRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'chapter_handoff_checks', 'chapterHandoffChecks', '章首承接')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `章首承接已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `章首承接复检通过${scoreText}，chapter_handoff_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `章首承接仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const issueTypeForWordCountClosure = repairTaskIssueType(task || {})
  const isWordCountRepair = issueTypeForWordCountClosure === 'word_count_gap'
    || issueTypeForWordCountClosure === 'chapter_word_count_gap'
    || issueTypeForWordCountClosure === 'chapter_length_gap'
    || issueTypeForWordCountClosure === 'length_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'word_count'
  if (isWordCountRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'word_count_checks', 'wordCountChecks', '字数验证')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `字数验证已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `字数验证复检通过${scoreText}，word_count_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `字数验证仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isStyleBoundaryRepair = firstText(task?.issue_type, task?.issueType) === 'style_boundary_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'style_boundary'
  if (isStyleBoundaryRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'style_boundary_checks', 'styleBoundaryChecks', '风格边界')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `风格边界已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `风格边界复检通过${scoreText}，style_boundary_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `风格边界仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isInformationFlowRepair = firstText(task?.issue_type, task?.issueType) === 'information_flow_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'information_flow'
  if (isInformationFlowRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'information_flow_checks', 'informationFlowChecks', '信息流')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `信息流已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `信息流复检通过${scoreText}，information_flow_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `信息流仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isExpectationThresholdRepair = firstText(task?.issue_type, task?.issueType) === 'expectation_threshold_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'expectation_threshold'
  if (isExpectationThresholdRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'expectation_threshold_checks', 'expectationThresholdChecks', '期待阈值')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `期待阈值已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `期待阈值复检通过${scoreText}，expectation_threshold_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `期待阈值仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isStoryLoopRepair = firstText(task?.issue_type, task?.issueType) === 'story_loop_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'story_loop'
  if (isStoryLoopRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'story_loop_checks', 'storyLoopChecks', '故事闭环')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `故事闭环已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `故事闭环复检通过${scoreText}，story_loop_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `故事闭环仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isEmotionalArcRepair = firstText(task?.issue_type, task?.issueType) === 'emotional_arc_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'emotional_arc'
  if (isEmotionalArcRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'emotional_arc_checks', 'emotionalArcChecks', '情绪弧')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `情绪弧已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `情绪弧复检通过${scoreText}，emotional_arc_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `情绪弧仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isChapterHookRepair = firstText(task?.issue_type, task?.issueType) === 'chapter_hook_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'chapter_hook'
  if (isChapterHookRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'chapter_hook_checks', 'chapterHookChecks', '章级钩子')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `章级钩子已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `章级钩子复检通过${scoreText}，chapter_hook_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `章级钩子仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isParagraphHookRepair = firstText(task?.issue_type, task?.issueType) === 'paragraph_hook_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'paragraph_hook'
  if (isParagraphHookRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'paragraph_hook_checks', 'paragraphHookChecks', '段落级钩子')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `段落级钩子已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `段落级钩子复检通过${scoreText}，paragraph_hook_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `段落级钩子仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isSuspenseRepair = firstText(task?.issue_type, task?.issueType) === 'suspense_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'suspense'
  if (isSuspenseRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'suspense_checks', 'suspenseChecks', '悬念编排')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `悬念编排已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `悬念编排复检通过${scoreText}，suspense_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `悬念编排仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isAssetLinkageRepair = firstText(task?.issue_type, task?.issueType) === 'asset_linkage_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'asset_linkage'
  if (isAssetLinkageRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'asset_linkage_checks', 'assetLinkageChecks', '资产挂钩')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `资产挂钩已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `资产挂钩复检通过${scoreText}，asset_linkage_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `资产挂钩仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isDialogueRepair = firstText(task?.issue_type, task?.issueType) === 'dialogue_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'dialogue'
  if (isDialogueRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'dialogue_checks', 'dialogueChecks', '对白质量')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `对白质量已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `对白质量复检通过${scoreText}，dialogue_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `对白质量仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isPlotDynamicsRepair = firstText(task?.issue_type, task?.issueType) === 'plot_dynamics_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'plot_dynamics'
  if (isPlotDynamicsRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'plot_dynamics_checks', 'plotDynamicsChecks', '剧情动力')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `剧情动力已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `剧情动力复检通过${scoreText}，plot_dynamics_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `剧情动力仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isCharacterRelationRepair = firstText(task?.issue_type, task?.issueType) === 'character_relation_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'character_relation'
  if (isCharacterRelationRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'character_relation_checks', 'characterRelationChecks', '角色关系')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `角色关系已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `角色关系复检通过${scoreText}，character_relation_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `角色关系仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isCharacterBehaviorRepair = firstText(task?.issue_type, task?.issueType) === 'character_behavior_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'character_behavior'
  if (isCharacterBehaviorRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'character_behavior_checks', 'characterBehaviorChecks', '角色行为')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `角色行为已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `角色行为复检通过${scoreText}，character_behavior_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `角色行为仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isConflictStructureRepair = firstText(task?.issue_type, task?.issueType) === 'conflict_structure_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'conflict_structure'
  if (isConflictStructureRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'conflict_structure_checks', 'conflictStructureChecks', '冲突结构')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `冲突结构已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `冲突结构复检通过${scoreText}，conflict_structure_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `冲突结构仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isBridgeUnitRepair = firstText(task?.issue_type, task?.issueType) === 'bridge_unit_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'bridge_unit'
  if (isBridgeUnitRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'bridge_unit_checks', 'bridgeUnitChecks', '桥段节奏')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `桥段节奏已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `桥段节奏复检通过${scoreText}，bridge_unit_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `桥段节奏仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isReversalRepair = firstText(task?.issue_type, task?.issueType) === 'reversal_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'reversal'
  if (isReversalRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'reversal_checks', 'reversalChecks', '反转设计')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `反转设计已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `反转设计复检通过${scoreText}，reversal_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `反转设计仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isShowdownRepair = firstText(task?.issue_type, task?.issueType) === 'showdown_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'showdown'
  if (isShowdownRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'showdown_checks', 'showdownChecks', '高潮对抗')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `高潮对抗已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `高潮对抗复检通过${scoreText}，showdown_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `高潮对抗仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isOpeningRepair = firstText(task?.issue_type, task?.issueType) === 'opening_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'opening'
  if (isOpeningRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'opening_checks', 'openingChecks', '开篇设计')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `开篇设计已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `开篇设计复检通过${scoreText}，opening_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `开篇设计仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isProseCraftRepair = firstText(task?.issue_type, task?.issueType) === 'prose_craft_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'prose_craft'
  if (isProseCraftRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'prose_craft_checks', 'proseCraftChecks', '正文工艺')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `正文工艺已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `正文工艺复检通过${scoreText}，prose_craft_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `正文工艺仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isPunctuationToneRepair = firstText(task?.issue_type, task?.issueType) === 'punctuation_tone_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'punctuation_tone'
  if (isPunctuationToneRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'punctuation_tone_checks', 'punctuationToneChecks', '语气标点')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `语气标点已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `语气标点复检通过${scoreText}，punctuation_tone_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `语气标点仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isContentRubricRepair = firstText(task?.issue_type, task?.issueType) === 'content_rubric_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'content_rubric'
  if (isContentRubricRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'content_rubric_checks', 'contentRubricChecks', '内容基准')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `内容基准已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `内容基准复检通过${scoreText}，content_rubric_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `内容基准仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isTargetReaderRepair = firstText(task?.issue_type, task?.issueType) === 'target_reader_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'target_reader'
  if (isTargetReaderRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'target_reader_checks', 'targetReaderChecks', '目标读者')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `目标读者已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `目标读者复检通过${scoreText}，target_reader_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `目标读者仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isGenrePositioningRepair = firstText(task?.issue_type, task?.issueType) === 'genre_positioning_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'genre_positioning'
  if (isGenrePositioningRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'genre_positioning_checks', 'genrePositioningChecks', '题材定位')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `题材定位已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `题材定位复检通过${scoreText}，genre_positioning_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `题材定位仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isFemaleAudienceRepair = firstText(task?.issue_type, task?.issueType) === 'female_audience_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'female_audience'
  if (isFemaleAudienceRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'female_audience_checks', 'femaleAudienceChecks', '女频长篇')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `女频长篇已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `女频长篇复检通过${scoreText}，female_audience_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `女频长篇仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isUpgradeRhythmRepair = firstText(task?.issue_type, task?.issueType) === 'upgrade_rhythm_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'upgrade_rhythm'
  if (isUpgradeRhythmRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'upgrade_rhythm_checks', 'upgradeRhythmChecks', '升级节奏')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `升级节奏已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `升级节奏复检通过${scoreText}，upgrade_rhythm_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `升级节奏仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isChapterStructureRepair = firstText(task?.issue_type, task?.issueType) === 'chapter_structure_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'chapter_structure'
  if (isChapterStructureRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'structure_checks', 'structureChecks', '章节结构')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `章节结构已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `章节结构复检通过${scoreText}，structure_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `章节结构仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isChapterProgressionRepair = firstText(task?.issue_type, task?.issueType) === 'chapter_progression_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'chapter_progression'
  if (isChapterProgressionRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'progression_checks', 'progressionChecks', '章节推进')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `章节推进已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `章节推进复检通过${scoreText}，progression_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `章节推进仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isInformationLoadRepair = firstText(task?.issue_type, task?.issueType) === 'information_load_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'information_load'
  if (isInformationLoadRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'information_checks', 'informationChecks', '信息负载')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `信息负载已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `信息负载复检通过${scoreText}，information_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `信息负载仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isLongformContinuityRepair = firstText(task?.issue_type, task?.issueType) === 'longform_continuity_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'longform_continuity'
  if (isLongformContinuityRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'longform_checks', 'longformChecks', '长篇连续性')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `长篇连续性已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `长篇连续性复检通过${scoreText}，longform_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `长篇连续性仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isCoreContractRepair = firstText(task?.issue_type, task?.issueType) === 'core_contract_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'core_contract'
  if (isCoreContractRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'core_contract_checks', 'coreContractChecks', '核心契约')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `核心契约已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `核心契约复检通过${scoreText}，core_contract_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `核心契约仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isContinuityHeatRepair = firstText(task?.issue_type, task?.issueType) === 'continuity_heat_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'continuity_heat'
  if (isContinuityHeatRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'continuity_heat_checks', 'continuityHeatChecks', '连续性热度')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `连续性热度已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `连续性热度复检通过${scoreText}，continuity_heat_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `连续性热度仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isRevisionReceiptRepair = firstText(task?.issue_type, task?.issueType) === 'revision_receipt_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'revision_receipt'
  if (isRevisionReceiptRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'revision_receipt_checks', 'revisionReceiptChecks', '修订回执')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `修订回执已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `修订回执复检通过${scoreText}，revision_receipt_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `修订回执仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isDeslopRepairCheckRepair = firstText(task?.issue_type, task?.issueType) === 'deslop_repair_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'deslop_repair'
  if (isDeslopRepairCheckRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'deslop_repair_checks', 'deslopRepairChecks', '去AI味修复')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `去AI味修复已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `去AI味修复复检通过${scoreText}，deslop_repair_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `去AI味修复仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isProseMetaRepair = firstText(task?.issue_type, task?.issueType) === 'prose_meta_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'prose_meta'
  if (isProseMetaRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'prose_meta_checks', 'proseMetaChecks', '正文元叙事')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `正文元叙事已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `正文元叙事复检通过${scoreText}，prose_meta_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `正文元叙事仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isBannedWordsRepair = repairTaskIssueType(task || {}) === 'banned_words_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'banned_words'
  if (isBannedWordsRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'banned_words_checks', 'bannedWordsChecks', '禁用词扫描')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `禁用词扫描已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `禁用词扫描复检通过${scoreText}，banned_words_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `禁用词扫描仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isTitleUniquenessRepair = repairTaskIssueType(task || {}) === 'title_uniqueness_gap'
    || repairTaskIssueType(task || {}) === 'chapter_title_uniqueness'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'title_uniqueness'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'chapter_title_uniqueness'
  if (isTitleUniquenessRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'title_uniqueness_checks', 'titleUniquenessChecks', '标题去重')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `标题去重已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `标题去重复检通过${scoreText}，title_uniqueness_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `标题去重仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isBlueprintConsumptionRepair = repairTaskIssueType(task || {}) === 'blueprint_consumption_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'blueprint_consumption'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'chapter_blueprint'
  if (isBlueprintConsumptionRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'blueprint_consumption_checks', 'blueprintConsumptionChecks', '细纲兑现')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `细纲兑现已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `细纲兑现复检通过${scoreText}，blueprint_consumption_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `细纲兑现仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isForeshadowingDeltaRepair = repairTaskIssueType(task || {}) === 'foreshadowing_delta_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'foreshadowing_delta'
  if (isForeshadowingDeltaRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'foreshadowing_delta_checks', 'foreshadowingDeltaChecks', '伏笔增量')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `伏笔增量已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `伏笔增量复检通过${scoreText}，foreshadowing_delta_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `伏笔增量仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isDeterministicCleanupRepair = repairTaskIssueType(task || {}) === 'deterministic_cleanup_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'deterministic_cleanup'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'deterministic_prose_cleanup'
  if (isDeterministicCleanupRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = deterministicProseCleanupResidualsFromQuality(quality)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `确定性清理已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `确定性清理复检通过${scoreText}，deterministic_prose_cleanup.risk_count 为 0。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `确定性清理仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isSerialRiskRepair = firstText(task?.issue_type, task?.issueType) === 'serial_risk_repair_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'serial_risk_repair'
  if (isSerialRiskRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'serial_risk_repair_checks', 'serialRiskRepairChecks', '连续风险修复')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `连续风险修复已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `连续风险修复复检通过${scoreText}，serial_risk_repair_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `连续风险修复仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isChapterHookQualityRepair = firstText(task?.issue_type, task?.issueType) === 'chapter_hook_quality_gap'
    || firstText(task?.annotation_category, task?.annotationCategory, task?.category) === 'chapter_hook_quality'
  if (isChapterHookQualityRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'chapter_hook_quality_checks', 'chapterHookQualityChecks', '章钩质量')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `章钩质量已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `章钩质量复检通过${scoreText}，chapter_hook_quality_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `章钩质量仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isReaderRetentionCheckRepair = firstText(task?.issue_type, task?.issueType) === 'reader_retention_gap'
    || Boolean(task?.reader_retention_check_sync || task?.readerRetentionCheckSync)
  if (isReaderRetentionCheckRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = qualityContractResidualsFromQuality(quality, 'reader_retention_checks', 'readerRetentionChecks', '追读雷达')
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `追读雷达已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `追读雷达复检通过${scoreText}，reader_retention_checks 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `追读雷达仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const preDraftExecutionKey = preDraftExecutionReceiptKeyForTask(task || {})
  if (preDraftExecutionKey) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = preDraftExecutionResidualsFromQuality(quality, preDraftExecutionKey.snake, preDraftExecutionKey.camel)
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `${preDraftExecutionKey.label}已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (!residuals.length) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `${preDraftExecutionKey.label}写前执行回执复检通过${scoreText}，${preDraftExecutionKey.snake} 已清空。`,
      }
    }
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `写前执行回执仍未闭环：${residuals.slice(0, 3).join('；')}。`,
    }
  }

  const isDeliveryRisk = task?.source === 'review_annotation_risk' || Boolean(task?.annotation_key)
  if (!isDeliveryRisk) {
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey: '',
      note: '非交稿风险任务，修订后等待人工复查。',
    }
  }
  const annotationKey = firstText(task.annotation_key)
  const quality = objectValue(revisionResult.quality_refresh)
  const convergence = objectValue(revisionResult.delivery_risk_convergence)
  const qualityOk = quality.ok === true
  const convergenceStatus = firstText(convergence.status)
  const residualCount = Math.max(0, Number(convergence.residual_count ?? convergence.residualCount ?? 0) || 0)
  const cleared = qualityOk && (convergenceStatus === 'cleared' || residualCount === 0)
  const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
  const convergenceLabel = firstText(convergence.label, convergence.summary, convergenceStatus || '风险收敛结果未知')
  if (cleared) {
    return {
      taskStatus: 'resolved',
      annotationStatus: annotationKey ? 'resolved' : '',
      annotationKey,
      note: `修订后自动复检通过${scoreText}，${convergenceLabel}。`,
    }
  }
  if (!qualityOk) {
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `修订稿已生成，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
    }
  }
  return {
    taskStatus: 'needs_review',
    annotationStatus: '',
    annotationKey,
    note: `修订后仍需复查：${convergenceLabel}${residualCount ? `，残留 ${residualCount} 项` : ''}。`,
  }
}

export * from './support-normalize-repairs'
