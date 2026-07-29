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
import { tryBuildSpecialtyQualityClosurePlan } from './support-delivery-closure-specialty'

function hasOwnField(value: AnyRecord, ...keys: string[]) {
  return keys.some(key => Object.prototype.hasOwnProperty.call(value, key))
}

function nonnegativeNumberField(value: AnyRecord, ...keys: string[]) {
  const key = keys.find(candidate => Object.prototype.hasOwnProperty.call(value, candidate))
  if (!key) return { present: false, value: null }
  const raw = value[key]
  return {
    present: true,
    value: typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? raw : null,
  }
}

function passesExactStatusOrFallback(value: AnyRecord, expectedStatus: string, fallbackPasses: boolean) {
  return hasOwnField(value, 'status') ? value.status === expectedStatus : fallbackPasses
}

export function buildDeliveryRiskRevisionClosurePlan(task: AnyRecord, revisionResult: AnyRecord = {}) {
  const isStorylineDecision = task?.source === 'storyline_diff_decision' || Boolean(task?.decision_key)
  if (isStorylineDecision) {
    const quality = objectValue(revisionResult.quality_refresh)
    const storyStateUpdate = objectValue(revisionResult.story_state_update)
    const storylineSync = objectValue(storyStateUpdate.storyline_sync || revisionResult.storyline_sync)
    const missedCount = arrayValue(storylineSync.missed).length
    const unplannedCount = arrayValue(storylineSync.unplanned).length
    const forbiddenTouched = hasOwnField(storylineSync, 'forbidden_touched')
      ? storylineSync.forbidden_touched
      : storylineSync.forbiddenTouched
    const forbiddenCount = arrayValue(forbiddenTouched).length
    const diffCount = missedCount + unplannedCount + forbiddenCount
    const qualityOk = quality.ok === true
    const status = firstText(storylineSync.status)
    const hasStorylineSync = Object.keys(storylineSync).length > 0
    const hasBoundedDifferenceArrays = Array.isArray(storylineSync.missed)
      && Array.isArray(storylineSync.unplanned)
      && Array.isArray(forbiddenTouched)
    const cleared = qualityOk
      && hasStorylineSync
      && hasBoundedDifferenceArrays
      && passesExactStatusOrFallback(storylineSync, 'ok', diffCount === 0)
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
    if (!hasStorylineSync) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey: '',
        note: '剧情线决策仍需复查：缺少 storyline_sync 复检结果。',
      }
    }
    if (!hasBoundedDifferenceArrays) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey: '',
        note: '剧情线决策仍需复查：storyline_sync.missed/unplanned/forbidden_touched 必须为数组。',
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
    const failedEvidenceValue = hasOwnField(recoveryReview, 'failed_evidence')
      ? recoveryReview.failed_evidence
      : recoveryReview.failedEvidence
    const hasFailedEvidenceField = Array.isArray(failedEvidenceValue)
    const failedEvidenceItems = arrayValue(failedEvidenceValue)
    const failedEvidence = failedEvidenceItems
      .map(item => summarizeEvidenceItem(item))
      .filter(Boolean)
    const reviewStatus = firstText(recoveryReview.status)
    const convergenceStatus = firstText(convergence.status)
    const hasConvergence = Object.keys(convergence).length > 0
    const residualCountEvidence = nonnegativeNumberField(convergence, 'residual_count', 'residualCount')
    const hasResidualField = residualCountEvidence.present
    const residualCount = residualCountEvidence.value
    const clearedByRecoveryReview = hasRecoveryReview
      && passesExactStatusOrFallback(recoveryReview, 'ok', hasFailedEvidenceField && failedEvidenceItems.length === 0)
    const clearedByConvergence = !hasRecoveryReview
      && hasConvergence
      && passesExactStatusOrFallback(convergence, 'cleared', hasResidualField && residualCount === 0)
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
    const convergenceStatus = firstText(convergence.status)
    const convergenceResidualCount = nonnegativeNumberField(convergence, 'residual_count', 'residualCount')
    const afterTotalCount = nonnegativeNumberField(after, 'total_count', 'totalCount')
    const residualCountEvidence = convergenceResidualCount.present ? convergenceResidualCount : afterTotalCount
    const hasResidualCount = residualCountEvidence.present
    const residualCount = residualCountEvidence.value
    const blockerCleared = passesExactStatusOrFallback(
      convergence,
      'cleared',
      afterHasBlockerField ? !afterBlocker : hasResidualCount && residualCount === 0,
    )
    const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
    if (!qualityOk) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: `入库阻断已回修，但自动复检未通过：${firstText(quality.error, '需要人工复查')}。`,
      }
    }
    if (hasResidualCount && residualCount === null) {
      return {
        taskStatus: 'needs_review',
        annotationStatus: '',
        annotationKey,
        note: '入库阻断仍未解除：delivery_risk_convergence 残余计数无效。',
      }
    }
    if (blockerCleared && afterHasBlockerField && !afterBlocker) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `入库阻断已解除${scoreText}${residualCount !== null && residualCount > 0 ? `，仍有其他交稿风险 ${residualCount} 项需继续处理` : ''}。`,
      }
    }
    if (blockerCleared && !afterHasBlockerField) {
      return {
        taskStatus: 'resolved',
        annotationStatus: annotationKey ? 'resolved' : '',
        annotationKey,
        note: `入库阻断已解除${scoreText}，交稿风险已清零。`,
      }
    }
    const convergenceEvidenceMissing = !afterHasBlockerField && !convergenceStatus && !hasResidualCount
    return {
      taskStatus: 'needs_review',
      annotationStatus: '',
      annotationKey,
      note: `入库阻断仍未解除：${convergenceEvidenceMissing
        ? '缺少 delivery_risk_convergence 复检结果'
        : firstText(afterBlocker?.label, afterBlocker?.detail, convergence.label, convergence.summary, '需要人工复查')}。`,
    }
  }

  const sceneCardReceiptRepair = normalizeSceneCardReceiptRepair(task || {})
  if (sceneCardReceiptRepair) {
    const annotationKey = firstText(task.annotation_key)
    const quality = objectValue(revisionResult.quality_refresh)
    const qualityOk = quality.ok === true
    const residuals = sceneCardReceiptResidualsFromQuality(quality, sceneCardReceiptRepair.issueType)
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

  const specialtyClosure = tryBuildSpecialtyQualityClosurePlan(task, revisionResult)
  if (specialtyClosure) return specialtyClosure

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
  const residualCountEvidence = nonnegativeNumberField(convergence, 'residual_count', 'residualCount')
  const hasResidualCount = residualCountEvidence.present
  const residualCount = residualCountEvidence.value
  const invalidResidualCount = hasResidualCount && residualCount === null
  const cleared = qualityOk
    && !invalidResidualCount
    && passesExactStatusOrFallback(convergence, 'cleared', hasResidualCount && residualCount === 0)
  const scoreText = quality.score === undefined || quality.score === null ? '' : `，评分 ${quality.score}`
  const convergenceEvidenceMissing = !convergenceStatus && !hasResidualCount
  const convergenceLabel = invalidResidualCount
    ? 'delivery_risk_convergence 残余计数无效'
    : convergenceEvidenceMissing
      ? '缺少 delivery_risk_convergence 复检结果'
      : firstText(convergence.label, convergence.summary, convergenceStatus || '风险收敛结果未知')
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
    note: `修订后仍需复查：${convergenceLabel}${residualCount !== null && residualCount > 0 ? `，残留 ${residualCount} 项` : ''}。`,
  }
}

export * from './support-normalize-repairs'
