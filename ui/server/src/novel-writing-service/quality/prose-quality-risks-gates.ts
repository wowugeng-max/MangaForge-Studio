import { asArray, normalizeIssue } from '../../routes/novel-route-utils'
import { compactDeliveryRiskCarryOverText } from '../../novel-writing/prose-quality-contracts'
import { countProseChars } from '../../novel-writing/word-target'
import { firstCompactText } from '../../novel-writing/story-drive-basics'
import { compactBriefText, uniqueBriefStrings } from './text-utils'
import {
  deliveryRiskEvidenceSearchText,
  isGenericDeliveryRiskEvidence,
  platformCheckNeedsCarryOver,
  preDraftReceiptCheckNeedsCarryOver,
} from './platform-carry-over'
import { revisionReceiptRemainingRisk } from './revision-receipt-risk'
import {
  receiptEvidenceLocatedInProse,
  receiptEvidenceLocatedInQualityPlanSegment,
} from './receipt-evidence'
import {
  deliveryRiskItemText,
  deliveryRiskReceiptRemainingRisk,
  inferDeliveryRiskReceiptRepairSegment,
  deliveryRiskReceiptRepairPositionRule,
  deliveryRiskCarryOverFromContext,
  deliveryRiskCarryOversFromContext,
  normalizeDeliveryRiskCarryOverContext,
} from '../post-delivery/delivery-risk-core'
import {
  normalizeFiveDimensionQualityScores,
  normalizeCraftMetricRisks,
  normalizeSettingViolationRisks,
  normalizeRevisionStrategy,
  OH_STORY_FOCUSED_REVISION_MODE_SPECS,
} from './five-dimension-scores'
import { proseQualitySerialRiskRepairRisks } from './serial-risk-repair'
import { STRUCTURED_REVIEW_CHECK_FIELDS } from './structured-review-fields'
import { isMissingStructuredReviewCheck } from './review-merge'
import { getContextContract } from '../context/context-contract'
import { preDraftExecutionReceiptSections } from './pre-draft-receipt-sections'

import {
  proseQualityReviewNeedsRevision,
  revisionReceiptSyncRisk,
} from './prose-quality-risks-receipts'
export function proseQualityRevisionDirectiveRisks(payload: any) {
  if (!proseQualityReviewNeedsRevision(payload)) return []
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  return uniqueBriefStrings([
    ...asArray(review?.revision_directives || review?.revisionDirectives),
    ...asArray(selfCheck?.revision_directives || selfCheck?.revisionDirectives),
    ...asArray(payload?.revision_directives || payload?.revisionDirectives),
  ], 8)
}

export function proseQualityFocusedRevisionModeRisks(payload: any) {
  if (!proseQualityReviewNeedsRevision(payload)) return []
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  return uniqueBriefStrings([
    ...asArray(review?.focused_revision_modes || review?.focusedRevisionModes),
    ...asArray(selfCheck?.focused_revision_modes || selfCheck?.focusedRevisionModes),
    ...asArray(payload?.focused_revision_modes || payload?.focusedRevisionModes),
  ], 8).map((mode: any) => {
    const key = compactBriefText(mode)
    const spec = OH_STORY_FOCUSED_REVISION_MODE_SPECS[key] || {
      label: key,
      fix: `定向修订 ${key}：按自检要求修复上一章遗留的正文质量模式，下一章写作时不得复现同类问题。`,
    }
    return {
      mode: key,
      label: compactBriefText(spec.label, key),
      fix: compactBriefText(spec.fix),
    }
  }).filter((item: any) => item.mode || item.fix)
}

export function proseQualityCraftMetricRisks(payload: any) {
  if (!proseQualityReviewNeedsRevision(payload)) return []
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  return normalizeCraftMetricRisks(
    review?.craft_metrics
    || review?.craftMetrics
    || review?.craft_metric_scores
    || review?.craftMetricScores
    || selfCheck?.craft_metrics
    || selfCheck?.craftMetrics
    || payload?.craft_metrics
    || payload?.craftMetrics,
  )
}

export function proseQualitySettingViolationRisks(payload: any) {
  if (!proseQualityReviewNeedsRevision(payload)) return []
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  return normalizeSettingViolationRisks(
    review?.setting_violations
    || review?.settingViolations
    || selfCheck?.setting_violations
    || selfCheck?.settingViolations
    || payload?.setting_violations
    || payload?.settingViolations,
  )
}

export function proseQualityDeslopRepairReceiptRisks(payload: any, chapterText = '') {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const revision = selfCheck?.revision || selfCheck?.revised_revision || payload?.revision || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const receipts = [
    ...asArray(revisionDeliveryReceipts?.deslop_repair_receipts || revisionDeliveryReceipts?.deslopRepairReceipts),
    ...asArray(revision?.deslop_repair_receipts || revision?.deslopRepairReceipts),
    ...asArray(selfCheck?.deslop_repair_receipts || selfCheck?.deslopRepairReceipts),
    ...asArray(payload?.deslop_repair_receipts || payload?.deslopRepairReceipts),
  ]
  return receipts
    .map((receipt: any) => {
      const risk = revisionReceiptSyncRisk(receipt, chapterText)
      if (!risk) return null
      const gate = compactBriefText(receipt?.gate || receipt?.key || receipt?.name, 'Gate A-G')
      const label = compactBriefText(receipt?.label || receipt?.pattern || receipt?.issue, '去AI味残留')
      const evidence = compactBriefText(
        receipt?.changed_evidence
        || receipt?.changedEvidence
        || receipt?.original_evidence
        || receipt?.originalEvidence
        || receipt?.applied_fix
        || receipt?.appliedFix,
      )
      return {
        risk,
        evidence,
        gate,
        label,
      }
    })
    .filter(Boolean)
}

export function proseQualityDeslopRepairCheckRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.deslop_repair_checks || review?.deslopRepairChecks),
    ...asArray(selfCheck?.deslop_repair_checks || selfCheck?.deslopRepairChecks),
    ...asArray(payload?.deslop_repair_checks || payload?.deslopRepairChecks),
  ]
  return checks
    .filter((check: any) => preDraftReceiptCheckNeedsCarryOver(check) || check?.receipt_synced === false || check?.receiptSynced === false)
    .map((check: any) => {
      const rawGate = compactBriefText(check?.gate || check?.key)
      const gate = rawGate ? (/^gate\s+/i.test(rawGate) ? rawGate : `Gate ${rawGate}`) : 'Gate A-G'
      const label = compactBriefText(check?.label || check?.pattern || check?.issue || check?.name, '去AI味闭环')
      const originalRisk = compactBriefText(check?.original_risk || check?.originalRisk || check?.risk || check?.evidence || check?.issue)
      const rewrittenEvidence = compactBriefText(check?.rewritten_evidence || check?.rewrittenEvidence || check?.delivered_evidence || check?.deliveredEvidence)
      const changedEvidence = compactBriefText(check?.changed_evidence || check?.changedEvidence)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.required_action || check?.requiredAction || check?.suggestion)
      const remainingRisk = revisionReceiptRemainingRisk(check)
      const receiptSynced = check?.receipt_synced === false || check?.receiptSynced === false
        ? 'receipt_synced=false'
        : ''
      const action = compactBriefText([
        `deslop_repair_checks.${label}`,
        gate,
        receiptSynced,
        originalRisk ? `original_risk=${originalRisk}` : '',
        rewrittenEvidence ? `rewritten_evidence=${rewrittenEvidence}` : '',
        changedEvidence ? `changed_evidence=${changedEvidence}` : '',
        fix || remainingRisk,
      ].filter(Boolean).join('；'))
      if (!label && !gate && !originalRisk && !rewrittenEvidence && !changedEvidence && !fix && !remainingRisk && !receiptSynced) return null
      return {
        gate,
        label,
        original_risk: originalRisk,
        rewritten_evidence: rewrittenEvidence,
        changed_evidence: changedEvidence,
        fix,
        remaining_risk: remainingRisk,
        receipt_synced: receiptSynced,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityAuditRepairReceiptRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const revision = selfCheck?.revision || selfCheck?.revised_revision || payload?.revision || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const receipts = [
    ...asArray(revisionDeliveryReceipts?.quality_audit_repair_receipts || revisionDeliveryReceipts?.qualityAuditRepairReceipts),
    ...asArray(revision?.quality_audit_repair_receipts || revision?.qualityAuditRepairReceipts),
    ...asArray(selfCheck?.quality_audit_repair_receipts || selfCheck?.qualityAuditRepairReceipts),
    ...asArray(payload?.quality_audit_repair_receipts || payload?.qualityAuditRepairReceipts),
  ]
  return receipts
    .map((receipt: any) => {
      const risk = revisionReceiptRemainingRisk(receipt)
      if (!risk) return null
      const checkKey = compactBriefText(receipt?.check_key || receipt?.checkKey || receipt?.key)
      const label = compactBriefText(receipt?.label || receipt?.name, '质量诊断残留')
      const evidence = compactBriefText(
        receipt?.changed_evidence
        || receipt?.changedEvidence
        || receipt?.original_evidence
        || receipt?.originalEvidence
        || receipt?.applied_fix
        || receipt?.appliedFix,
      )
      return {
        risk,
        evidence,
        check_key: checkKey,
        label,
        strategy: compactBriefText(receipt?.strategy),
      }
    })
    .filter(Boolean)
}



export function proseQualityPlatformRubricRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.platform_checks || review?.platformChecks),
    ...asArray(selfCheck?.platform_checks || selfCheck?.platformChecks),
    ...asArray(payload?.platform_checks || payload?.platformChecks),
  ]
  return checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '平台检查')
      const checkKey = compactBriefText(check?.key || check?.field || check?.name)
      const platform = compactBriefText(check?.platform || check?.rubric || review?.rubric || selfCheck?.rubric || payload?.rubric)
      const openingPace = compactBriefText(check?.opening_pace || check?.openingPace)
      const payoffDensity = compactBriefText(check?.payoff_density || check?.payoffDensity)
      const readerExpectation = compactBriefText(check?.reader_expectation || check?.readerExpectation)
      const pageTurnPull = compactBriefText(check?.page_turn_pull || check?.pageTurnPull)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `platform_checks.${label}`,
        checkKey ? `key=${checkKey}` : '',
        platform ? `platform=${platform}` : '',
        openingPace ? `opening_pace=${openingPace}` : '',
        payoffDensity ? `payoff_density=${payoffDensity}` : '',
        readerExpectation ? `reader_expectation=${readerExpectation}` : '',
        pageTurnPull ? `page_turn_pull=${pageTurnPull}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !checkKey && !platform && !openingPace && !payoffDensity && !readerExpectation && !pageTurnPull && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        key: checkKey,
        platform,
        opening_pace: openingPace,
        payoff_density: payoffDensity,
        reader_expectation: readerExpectation,
        page_turn_pull: pageTurnPull,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityContentRubricRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.content_rubric_checks || review?.contentRubricChecks),
    ...asArray(selfCheck?.content_rubric_checks || selfCheck?.contentRubricChecks),
    ...asArray(payload?.content_rubric_checks || payload?.contentRubricChecks),
  ]
  return checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '内容基准')
      const coreSellingPoint = compactBriefText(check?.core_selling_point || check?.coreSellingPoint)
      const conflictProgression = compactBriefText(check?.conflict_progression || check?.conflictProgression)
      const chapterChange = compactBriefText(check?.chapter_change || check?.chapterChange)
      const pageTurnReason = compactBriefText(check?.page_turn_reason || check?.pageTurnReason)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `content_rubric_checks.${label}`,
        coreSellingPoint ? `core_selling_point=${coreSellingPoint}` : '',
        conflictProgression ? `conflict_progression=${conflictProgression}` : '',
        chapterChange ? `chapter_change=${chapterChange}` : '',
        pageTurnReason ? `page_turn_reason=${pageTurnReason}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !coreSellingPoint && !conflictProgression && !chapterChange && !pageTurnReason && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        core_selling_point: coreSellingPoint,
        conflict_progression: conflictProgression,
        chapter_change: chapterChange,
        page_turn_reason: pageTurnReason,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityTitleUniquenessRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.title_uniqueness_checks || review?.titleUniquenessChecks),
    ...asArray(selfCheck?.title_uniqueness_checks || selfCheck?.titleUniquenessChecks),
    ...asArray(payload?.title_uniqueness_checks || payload?.titleUniquenessChecks),
  ]
  return checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '标题唯一性')
      const oldTitle = compactBriefText(check?.old_title || check?.oldTitle)
      const newTitle = compactBriefText(check?.new_title || check?.newTitle)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      const syncGaps = [
        check?.outline_title_synced === false || check?.outlineTitleSynced === false ? '同步大纲标题' : '',
        check?.file_name_synced === false || check?.fileNameSynced === false ? '同步文件名' : '',
        check?.chapter_title_line_synced === false || check?.chapterTitleLineSynced === false ? '同步正文标题行' : '',
      ].filter(Boolean).join('、')
      const action = compactBriefText([
        `chapter_title_uniqueness_sync.title_uniqueness_checks.${label}`,
        oldTitle ? `旧标题：${oldTitle}` : '',
        newTitle ? `新标题：${newTitle}` : '',
        syncGaps,
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !oldTitle && !newTitle && !evidence && !remainingRisk && !fix) return null
      return {
        label,
        old_title: oldTitle,
        new_title: newTitle,
        evidence,
        remaining_risk: remainingRisk,
        fix,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityBlueprintConsumptionRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.blueprint_consumption_checks || review?.blueprintConsumptionChecks),
    ...asArray(selfCheck?.blueprint_consumption_checks || selfCheck?.blueprintConsumptionChecks),
    ...asArray(payload?.blueprint_consumption_checks || payload?.blueprintConsumptionChecks),
  ]
  return checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '细纲兑现')
      const blueprintField = compactBriefText(check?.blueprint_field || check?.blueprintField)
      const expected = compactBriefText(check?.expected || check?.target || check?.requirement)
      const deliveredEvidence = compactBriefText(check?.delivered_evidence || check?.deliveredEvidence || check?.evidence)
      const missingGap = compactBriefText(check?.missing_gap || check?.missingGap || check?.issue || check?.reason)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const action = compactBriefText([
        `blueprint_consumption_checks.${label}`,
        blueprintField ? `blueprint_field=${blueprintField}` : '',
        expected ? `expected=${expected}` : '',
        missingGap ? `missing_gap=${missingGap}` : '',
        fix || remainingRisk || deliveredEvidence,
      ].filter(Boolean).join('；'))
      if (!label && !blueprintField && !expected && !deliveredEvidence && !missingGap && !fix && !remainingRisk) return null
      return {
        label,
        blueprint_field: blueprintField,
        expected,
        delivered_evidence: deliveredEvidence,
        missing_gap: missingGap,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityWordCountRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.word_count_checks || review?.wordCountChecks),
    ...asArray(selfCheck?.word_count_checks || selfCheck?.wordCountChecks),
    ...asArray(payload?.word_count_checks || payload?.wordCountChecks),
  ]
  return checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '字数执行')
      const currentCount = Number(check?.current_count ?? check?.currentCount)
      const targetCount = Number(check?.target_count ?? check?.targetCount)
      const minRequiredCount = Number(check?.min_required_count ?? check?.minRequiredCount)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      const countParts = [
        Number.isFinite(currentCount) ? `current_count=${currentCount}` : '',
        Number.isFinite(targetCount) ? `target_count=${targetCount}` : '',
        Number.isFinite(minRequiredCount) ? `min_required_count=${minRequiredCount}` : '',
      ].filter(Boolean)
      const action = compactBriefText([
        `word_count_checks.${label}`,
        ...countParts,
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !countParts.length && !evidence && !remainingRisk && !fix) return null
      return {
        label,
        current_count: Number.isFinite(currentCount) ? currentCount : null,
        target_count: Number.isFinite(targetCount) ? targetCount : null,
        min_required_count: Number.isFinite(minRequiredCount) ? minRequiredCount : null,
        evidence,
        remaining_risk: remainingRisk,
        fix,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityBannedWordRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.banned_words_checks || review?.bannedWordsChecks),
    ...asArray(selfCheck?.banned_words_checks || selfCheck?.bannedWordsChecks),
    ...asArray(payload?.banned_words_checks || payload?.bannedWordsChecks),
  ]
  return checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '禁用词')
      const matchedWord = compactBriefText(check?.matched_word || check?.matchedWord)
      const level = compactBriefText(check?.level || check?.severity)
      const location = compactBriefText(check?.location || check?.position)
      const replacement = compactBriefText(check?.replacement || check?.rewrite || check?.suggestion)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction)
      const action = compactBriefText([
        `banned_words_checks.${label}`,
        matchedWord ? `matched_word=${matchedWord}` : '',
        level ? `level=${level}` : '',
        location ? `location=${location}` : '',
        replacement ? `replacement=${replacement}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !matchedWord && !level && !location && !replacement && !evidence && !remainingRisk && !fix) return null
      return {
        label,
        matched_word: matchedWord,
        level,
        location,
        replacement,
        evidence,
        remaining_risk: remainingRisk,
        fix,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityChapterBenchmarkRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.chapter_benchmark_checks || review?.chapterBenchmarkChecks),
    ...asArray(selfCheck?.chapter_benchmark_checks || selfCheck?.chapterBenchmarkChecks),
    ...asArray(payload?.chapter_benchmark_checks || payload?.chapterBenchmarkChecks),
  ]
  return checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '章节基准')
      const benchmarkDimension = compactBriefText(check?.benchmark_dimension || check?.benchmarkDimension)
      const expectedMethod = compactBriefText(check?.expected_method || check?.expectedMethod || check?.expected)
      const deliveredEvidence = compactBriefText(check?.delivered_evidence || check?.deliveredEvidence || check?.evidence)
      const originalityGuard = compactBriefText(check?.originality_guard || check?.originalityGuard)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const action = compactBriefText([
        `chapter_benchmark_checks.${label}`,
        benchmarkDimension ? `benchmark_dimension=${benchmarkDimension}` : '',
        expectedMethod ? `expected_method=${expectedMethod}` : '',
        originalityGuard,
        fix || remainingRisk || deliveredEvidence,
      ].filter(Boolean).join('；'))
      if (!label && !benchmarkDimension && !expectedMethod && !deliveredEvidence && !originalityGuard && !fix && !remainingRisk) return null
      return {
        label,
        benchmark_dimension: benchmarkDimension,
        expected_method: expectedMethod,
        delivered_evidence: deliveredEvidence,
        originality_guard: originalityGuard,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

