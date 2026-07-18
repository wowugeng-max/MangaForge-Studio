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

export function proseQualityStateTrackingRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.state_tracking_checks || review?.stateTrackingChecks),
    ...asArray(selfCheck?.state_tracking_checks || selfCheck?.stateTrackingChecks),
    ...asArray(payload?.state_tracking_checks || payload?.stateTrackingChecks),
    ...preDraftExecutionReceiptSections(payload)
      .flatMap((section: any) => asArray(section?.status_filter_receipts || section?.statusFilterReceipts)),
  ]
  return checks
    .filter((check: any) => {
      const normalizedStatus = String(check?.status ?? '').trim().toLowerCase()
      const explicitPass = check?.status === true || check?.delivered === true || ['pass', 'passed', 'ok', 'ready', 'done', 'true', 'yes'].includes(normalizedStatus)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      if (explicitPass && !remainingRisk && !fix) return false
      return preDraftReceiptCheckNeedsCarryOver(check)
    })
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '状态筛选')
      const stateSubject = compactBriefText(check?.state_subject || check?.stateSubject)
      const stateType = compactBriefText(check?.state_type || check?.stateType)
      const previousState = compactBriefText(check?.previous_state || check?.previousState)
      const allowedState = compactBriefText(check?.allowed_state || check?.allowedState)
      const usedInChapter = compactBriefText(check?.used_in_chapter || check?.usedInChapter)
      const excludedReason = compactBriefText(check?.excluded_reason || check?.excludedReason)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || usedInChapter || excludedReason || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `state_tracking_checks.${label}`,
        stateSubject ? `state_subject=${stateSubject}` : '',
        stateType ? `state_type=${stateType}` : '',
        previousState ? `previous_state=${previousState}` : '',
        allowedState ? `allowed_state=${allowedState}` : '',
        usedInChapter ? `used_in_chapter=${usedInChapter}` : '',
        excludedReason ? `excluded_reason=${excludedReason}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !stateSubject && !stateType && !previousState && !allowedState && !usedInChapter && !excludedReason && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        state_subject: stateSubject,
        state_type: stateType,
        previous_state: previousState,
        allowed_state: allowedState,
        used_in_chapter: usedInChapter,
        excluded_reason: excludedReason,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityStoryStateUpdateRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.story_state_update_checks || review?.storyStateUpdateChecks),
    ...asArray(selfCheck?.story_state_update_checks || selfCheck?.storyStateUpdateChecks),
    ...asArray(payload?.story_state_update_checks || payload?.storyStateUpdateChecks),
  ]
  return checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '状态写回')
      const stateDomain = compactBriefText(check?.state_domain || check?.stateDomain)
      const targetFile = compactBriefText(check?.target_file || check?.targetFile)
      const updatePath = compactBriefText(check?.update_path || check?.updatePath)
      const beforeState = compactBriefText(check?.before_state || check?.beforeState)
      const afterState = compactBriefText(check?.after_state || check?.afterState)
      const sourceExcerpt = compactBriefText(check?.source_excerpt || check?.sourceExcerpt)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const action = compactBriefText([
        `story_state_update_checks.${label}`,
        stateDomain ? `state_domain=${stateDomain}` : '',
        targetFile ? `target_file=${targetFile}` : '',
        updatePath ? `update_path=${updatePath}` : '',
        beforeState ? `before_state=${beforeState}` : '',
        afterState ? `after_state=${afterState}` : '',
        sourceExcerpt ? `source_excerpt=${sourceExcerpt}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !stateDomain && !targetFile && !updatePath && !beforeState && !afterState && !sourceExcerpt && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        state_domain: stateDomain,
        target_file: targetFile,
        update_path: updatePath,
        before_state: beforeState,
        after_state: afterState,
        source_excerpt: sourceExcerpt,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityForeshadowingDeltaRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.foreshadowing_delta_checks || review?.foreshadowingDeltaChecks),
    ...asArray(selfCheck?.foreshadowing_delta_checks || selfCheck?.foreshadowingDeltaChecks),
    ...asArray(payload?.foreshadowing_delta_checks || payload?.foreshadowingDeltaChecks),
  ]
  return checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '伏笔增量')
      const clueName = compactBriefText(check?.clue_name || check?.clueName || check?.clue || check?.name)
      const deltaType = compactBriefText(check?.delta_type || check?.deltaType || check?.type)
      const currentStatus = compactBriefText(check?.current_status || check?.currentStatus || check?.status_text || check?.statusText)
      const chapterLabel = compactBriefText(check?.chapter || check?.chapter_label || check?.chapterLabel)
      const sourceExcerpt = compactBriefText(check?.source_excerpt || check?.sourceExcerpt || check?.evidence)
      const ledgerPath = compactBriefText(check?.ledger_path || check?.ledgerPath || check?.target_file || check?.targetFile)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const action = compactBriefText([
        `foreshadowing_delta_checks.${label}`,
        clueName ? `clue_name=${clueName}` : '',
        deltaType ? `delta_type=${deltaType}` : '',
        currentStatus ? `current_status=${currentStatus}` : '',
        chapterLabel ? `chapter=${chapterLabel}` : '',
        ledgerPath ? `ledger_path=${ledgerPath}` : '',
        fix || remainingRisk || sourceExcerpt,
      ].filter(Boolean).join('；'))
      if (!label && !clueName && !deltaType && !currentStatus && !chapterLabel && !sourceExcerpt && !ledgerPath && !fix && !remainingRisk) return null
      return {
        label,
        clue_name: clueName,
        delta_type: deltaType,
        current_status: currentStatus,
        chapter: chapterLabel,
        source_excerpt: sourceExcerpt,
        ledger_path: ledgerPath,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualitySourceReadinessRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.source_readiness_checks || review?.sourceReadinessChecks),
    ...asArray(selfCheck?.source_readiness_checks || selfCheck?.sourceReadinessChecks),
    ...asArray(payload?.source_readiness_checks || payload?.sourceReadinessChecks),
    ...preDraftExecutionReceiptSections(payload)
      .flatMap((section: any) => asArray(section?.source_readiness_checks || section?.sourceReadinessChecks)),
  ]
  return checks
    .filter((check: any) => {
      const normalizedStatus = String(check?.status ?? '').trim().toLowerCase()
      const explicitPass = check?.status === true || ['pass', 'passed', 'ok', 'ready', 'done', 'true', 'yes'].includes(normalizedStatus)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      if (explicitPass && !remainingRisk && !fix) return false
      return platformCheckNeedsCarryOver(check) || Boolean(remainingRisk)
    })
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '来源就绪')
      const sourceName = compactBriefText(check?.source_name || check?.sourceName)
      const sourcePath = compactBriefText(check?.source_path || check?.sourcePath)
      const readStatus = compactBriefText(check?.read_status || check?.readStatus)
      const usedAsFactValue = typeof check?.used_as_fact === 'boolean'
        ? String(check.used_as_fact)
        : typeof check?.usedAsFact === 'boolean'
          ? String(check.usedAsFact)
          : compactBriefText(check?.used_as_fact || check?.usedAsFact)
      const chapterEvidence = compactBriefText(check?.chapter_evidence || check?.chapterEvidence)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const action = compactBriefText([
        `source_readiness_checks.${label}`,
        sourceName ? `source_name=${sourceName}` : '',
        sourcePath ? `source_path=${sourcePath}` : '',
        readStatus ? `read_status=${readStatus}` : '',
        usedAsFactValue ? `used_as_fact=${usedAsFactValue}` : '',
        chapterEvidence ? `chapter_evidence=${chapterEvidence}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !sourceName && !sourcePath && !readStatus && !usedAsFactValue && !chapterEvidence && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        source_name: sourceName,
        source_path: sourcePath,
        read_status: readStatus,
        used_as_fact: usedAsFactValue,
        chapter_evidence: chapterEvidence,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityIntentConfirmationRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const preDraftReceiptSections = preDraftExecutionReceiptSections(payload)
  const checks = [
    ...asArray(review?.intent_confirmation_checks || review?.intentConfirmationChecks),
    ...asArray(selfCheck?.intent_confirmation_checks || selfCheck?.intentConfirmationChecks),
    ...asArray(payload?.intent_confirmation_checks || payload?.intentConfirmationChecks),
    ...preDraftReceiptSections.flatMap((section: any) => asArray(section?.intent_confirmation_checks || section?.intentConfirmationChecks)),
  ]
  return checks
    .filter((check: any) => {
      const normalizedStatus = String(check?.status ?? '').trim().toLowerCase()
      const explicitPass = check?.status === true || check?.delivered === true || ['pass', 'passed', 'ok', 'ready', 'done', 'true', 'yes'].includes(normalizedStatus)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      if (explicitPass && !remainingRisk && !fix) return false
      return preDraftReceiptCheckNeedsCarryOver(check)
    })
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '意图确认')
      const intentField = compactBriefText(check?.intent_field || check?.intentField)
      const expectedIntent = compactBriefText(check?.expected_intent || check?.expectedIntent)
      const deliveredEvidence = compactBriefText(check?.delivered_evidence || check?.deliveredEvidence)
      const blueprintLink = compactBriefText(check?.blueprint_link || check?.blueprintLink)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || deliveredEvidence || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `intent_confirmation_checks.${label}`,
        intentField ? `intent_field=${intentField}` : '',
        expectedIntent ? `expected_intent=${expectedIntent}` : '',
        deliveredEvidence ? `delivered_evidence=${deliveredEvidence}` : '',
        blueprintLink ? `blueprint_link=${blueprintLink}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !intentField && !expectedIntent && !deliveredEvidence && !blueprintLink && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        intent_field: intentField,
        expected_intent: expectedIntent,
        delivered_evidence: deliveredEvidence,
        blueprint_link: blueprintLink,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityBenchmarkRecallRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const preDraftReceiptSections = preDraftExecutionReceiptSections(payload)
  const checks = [
    ...asArray(review?.benchmark_recall_checks || review?.benchmarkRecallChecks),
    ...asArray(selfCheck?.benchmark_recall_checks || selfCheck?.benchmarkRecallChecks),
    ...asArray(payload?.benchmark_recall_checks || payload?.benchmarkRecallChecks),
    ...preDraftReceiptSections.flatMap((section: any) => asArray(section?.benchmark_recall_checks || section?.benchmarkRecallChecks)),
  ]
  return checks
    .filter((check: any) => {
      const normalizedStatus = String(check?.status ?? '').trim().toLowerCase()
      const explicitPass = check?.status === true || check?.delivered === true || ['pass', 'passed', 'ok', 'ready', 'done', 'true', 'yes'].includes(normalizedStatus)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      if (explicitPass && !remainingRisk && !fix) return false
      return preDraftReceiptCheckNeedsCarryOver(check)
    })
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '文风召回')
      const sourceType = compactBriefText(check?.source_type || check?.sourceType)
      const sourcePath = compactBriefText(check?.source_path || check?.sourcePath)
      const expectedApplication = compactBriefText(check?.expected_application || check?.expectedApplication)
      const deliveredEvidence = compactBriefText(check?.delivered_evidence || check?.deliveredEvidence)
      const gapsPreservedRaw = check?.gaps_preserved ?? check?.gapsPreserved
      const gapsPreserved = gapsPreservedRaw === false
        ? 'false'
        : gapsPreservedRaw === true
          ? 'true'
          : compactBriefText(gapsPreservedRaw)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || deliveredEvidence || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `benchmark_recall_checks.${label}`,
        sourceType ? `source_type=${sourceType}` : '',
        sourcePath ? `source_path=${sourcePath}` : '',
        expectedApplication ? `expected_application=${expectedApplication}` : '',
        deliveredEvidence ? `delivered_evidence=${deliveredEvidence}` : '',
        gapsPreserved ? `gaps_preserved=${gapsPreserved}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !sourceType && !sourcePath && !expectedApplication && !deliveredEvidence && !gapsPreserved && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        source_type: sourceType,
        source_path: sourcePath,
        expected_application: expectedApplication,
        delivered_evidence: deliveredEvidence,
        gaps_preserved: gapsPreserved,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityWritePreparationRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const preDraftReceiptSections = preDraftExecutionReceiptSections(payload)
  const checks = [
    ...asArray(review?.write_preparation_checks || review?.writePreparationChecks),
    ...asArray(selfCheck?.write_preparation_checks || selfCheck?.writePreparationChecks),
    ...asArray(payload?.write_preparation_checks || payload?.writePreparationChecks),
    ...preDraftReceiptSections.flatMap((section: any) => asArray(section?.write_preparation_checks || section?.writePreparationChecks)),
  ]
  return checks
    .filter((check: any) => {
      const normalizedStatus = String(check?.status ?? '').trim().toLowerCase()
      const explicitPass = check?.status === true || check?.delivered === true || ['pass', 'passed', 'ok', 'ready', 'done', 'true', 'yes'].includes(normalizedStatus)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      if (explicitPass && !remainingRisk && !fix) return false
      return preDraftReceiptCheckNeedsCarryOver(check)
    })
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '写前准备')
      const preparationType = compactBriefText(check?.preparation_type || check?.preparationType)
      const expected = compactBriefText(check?.expected || check?.required || check?.target)
      const deliveredEvidence = compactBriefText(check?.delivered_evidence || check?.deliveredEvidence)
      const chapterLocation = compactBriefText(check?.chapter_location || check?.chapterLocation || check?.location)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || deliveredEvidence || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `write_preparation_checks.${label}`,
        preparationType ? `preparation_type=${preparationType}` : '',
        expected ? `expected=${expected}` : '',
        deliveredEvidence ? `delivered_evidence=${deliveredEvidence}` : '',
        chapterLocation ? `chapter_location=${chapterLocation}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !preparationType && !expected && !deliveredEvidence && !chapterLocation && !evidence && !fix && !remainingRisk) return null
      const rawText = [
        check?.key,
        check?.label,
        check?.name,
        preparationType,
        expected,
        evidence,
        fix,
        remainingRisk,
      ].filter(Boolean).join(' ')
      return {
        label,
        preparation_type: preparationType,
        expected,
        delivered_evidence: deliveredEvidence,
        chapter_location: chapterLocation,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
        is_creation_contract: /creation_contract_checklist|创作契约|目标读者|题材定位|核心承诺|追读留存/.test(rawText),
      }
    })
    .filter(Boolean)
}

