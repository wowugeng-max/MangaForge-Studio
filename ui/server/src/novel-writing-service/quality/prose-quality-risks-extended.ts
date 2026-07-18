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

export function proseQualityChapterHandoffRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.chapter_handoff_checks || review?.chapterHandoffChecks),
    ...asArray(selfCheck?.chapter_handoff_checks || selfCheck?.chapterHandoffChecks),
    ...asArray(payload?.chapter_handoff_checks || payload?.chapterHandoffChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '章首承接')
      const previousHandoff = compactBriefText(check?.previous_handoff || check?.previousHandoff)
      const openingObligation = compactBriefText(check?.opening_obligation || check?.openingObligation)
      const openingEvidence = compactBriefText(check?.opening_evidence || check?.openingEvidence)
      const location = compactBriefText(check?.location || check?.position)
      const continuityAction = compactBriefText(check?.continuity_action || check?.continuityAction)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const action = compactBriefText([
        `chapter_handoff_checks.${label}`,
        previousHandoff ? `previous_handoff=${previousHandoff}` : '',
        openingObligation ? `opening_obligation=${openingObligation}` : '',
        openingEvidence ? `opening_evidence=${openingEvidence}` : '',
        location ? `location=${location}` : '',
        continuityAction ? `continuity_action=${continuityAction}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !previousHandoff && !openingObligation && !openingEvidence && !location && !continuityAction && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        previous_handoff: previousHandoff,
        opening_obligation: openingObligation,
        opening_evidence: openingEvidence,
        location,
        continuity_action: continuityAction,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityStyleBoundaryRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.style_boundary_checks || review?.styleBoundaryChecks),
    ...asArray(selfCheck?.style_boundary_checks || selfCheck?.styleBoundaryChecks),
    ...asArray(payload?.style_boundary_checks || payload?.styleBoundaryChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '文风覆盖边界')
      const referenceRisk = compactBriefText(check?.reference_risk || check?.referenceRisk)
      const rewrittenWithLocalAction = compactBriefText(check?.rewritten_with_local_action || check?.rewrittenWithLocalAction)
      const voiceAnchor = compactBriefText(check?.voice_anchor || check?.voiceAnchor)
      const copiedPhraseRemovedRaw = check?.copied_phrase_removed ?? check?.copiedPhraseRemoved
      const copiedPhraseRemoved = copiedPhraseRemovedRaw === false
        ? 'false'
        : copiedPhraseRemovedRaw === true
          ? 'true'
          : compactBriefText(copiedPhraseRemovedRaw)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || referenceRisk || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `style_boundary_checks.${label}`,
        referenceRisk ? `reference_risk=${referenceRisk}` : '',
        rewrittenWithLocalAction ? `rewritten_with_local_action=${rewrittenWithLocalAction}` : '',
        voiceAnchor ? `voice_anchor=${voiceAnchor}` : '',
        copiedPhraseRemoved ? `copied_phrase_removed=${copiedPhraseRemoved}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !referenceRisk && !rewrittenWithLocalAction && !voiceAnchor && !copiedPhraseRemoved && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        reference_risk: referenceRisk,
        rewritten_with_local_action: rewrittenWithLocalAction,
        voice_anchor: voiceAnchor,
        copied_phrase_removed: copiedPhraseRemoved,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityStyleSampleRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const preDraftReceiptSections = preDraftExecutionReceiptSections(payload)
  const checks = [
    ...asArray(review?.style_sample_checks || review?.styleSampleChecks),
    ...asArray(selfCheck?.style_sample_checks || selfCheck?.styleSampleChecks),
    ...asArray(payload?.style_sample_checks || payload?.styleSampleChecks),
    ...preDraftReceiptSections.flatMap((section: any) => asArray(section?.style_sample_checks || section?.styleSampleChecks)),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '样章策略')
      const styleDimension = compactBriefText(check?.style_dimension || check?.styleDimension)
      const sourceTechnique = compactBriefText(check?.source_technique || check?.sourceTechnique)
      const adaptedEvidence = compactBriefText(check?.adapted_evidence || check?.adaptedEvidence)
      const copiedPhraseRewrittenRaw = check?.copied_phrase_rewritten ?? check?.copiedPhraseRewritten
      const copiedPhraseRewritten = copiedPhraseRewrittenRaw === false
        ? 'false'
        : copiedPhraseRewrittenRaw === true
          ? 'true'
          : compactBriefText(copiedPhraseRewrittenRaw)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || adaptedEvidence || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `style_sample_checks.${label}`,
        styleDimension ? `style_dimension=${styleDimension}` : '',
        sourceTechnique ? `source_technique=${sourceTechnique}` : '',
        adaptedEvidence ? `adapted_evidence=${adaptedEvidence}` : '',
        copiedPhraseRewritten ? `copied_phrase_rewritten=${copiedPhraseRewritten}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !styleDimension && !sourceTechnique && !adaptedEvidence && !copiedPhraseRewritten && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        style_dimension: styleDimension,
        source_technique: sourceTechnique,
        adapted_evidence: adaptedEvidence,
        copied_phrase_rewritten: copiedPhraseRewritten,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityProseMetaRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.prose_meta_checks || review?.proseMetaChecks),
    ...asArray(selfCheck?.prose_meta_checks || selfCheck?.proseMetaChecks),
    ...asArray(payload?.prose_meta_checks || payload?.proseMetaChecks),
  ]
  return checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name || check?.term, '工程词')
      const matchedTerm = compactBriefText(check?.matched_term || check?.matchedTerm || check?.term)
      const location = compactBriefText(check?.location || check?.line || check?.line_no || check?.lineNo)
      const replacement = compactBriefText(check?.replacement || check?.rewrite || check?.expected)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `prose_meta_checks.${label}`,
        matchedTerm ? `matched_term=${matchedTerm}` : '',
        location ? `location=${location}` : '',
        replacement ? `replacement=${replacement}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !matchedTerm && !location && !replacement && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        matched_term: matchedTerm,
        location,
        replacement,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityInformationFlowRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.information_flow_checks || review?.informationFlowChecks),
    ...asArray(selfCheck?.information_flow_checks || selfCheck?.informationFlowChecks),
    ...asArray(payload?.information_flow_checks || payload?.informationFlowChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '信息团衔接')
      const revealOrder = compactBriefText(check?.reveal_order || check?.revealOrder)
      const withheldQuestion = compactBriefText(check?.withheld_question || check?.withheldQuestion)
      const actionBoundRelease = compactBriefText(check?.action_bound_release || check?.actionBoundRelease)
      const conflictOrCost = compactBriefText(check?.conflict_or_cost || check?.conflictOrCost)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const action = compactBriefText([
        `information_flow_checks.${label}`,
        revealOrder ? `reveal_order=${revealOrder}` : '',
        withheldQuestion ? `withheld_question=${withheldQuestion}` : '',
        actionBoundRelease ? `action_bound_release=${actionBoundRelease}` : '',
        conflictOrCost ? `conflict_or_cost=${conflictOrCost}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !revealOrder && !withheldQuestion && !actionBoundRelease && !conflictOrCost && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        reveal_order: revealOrder,
        withheld_question: withheldQuestion,
        action_bound_release: actionBoundRelease,
        conflict_or_cost: conflictOrCost,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityExpectationThresholdRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const preDraftReceiptSections = preDraftExecutionReceiptSections(payload)
  const checks = [
    ...asArray(review?.expectation_threshold_checks || review?.expectationThresholdChecks),
    ...asArray(selfCheck?.expectation_threshold_checks || selfCheck?.expectationThresholdChecks),
    ...asArray(payload?.expectation_threshold_checks || payload?.expectationThresholdChecks),
    ...preDraftReceiptSections.flatMap((section: any) => asArray(section?.expectation_threshold_checks || section?.expectationThresholdChecks)),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '期待门槛')
      const readerQuestion = compactBriefText(check?.reader_question || check?.readerQuestion)
      const stakes = compactBriefText(check?.stakes)
      const choicePressure = compactBriefText(check?.choice_pressure || check?.choicePressure)
      const payoffPromise = compactBriefText(check?.payoff_promise || check?.payoffPromise)
      const nextChapterPull = compactBriefText(check?.next_chapter_pull || check?.nextChapterPull)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `expectation_threshold_checks.${label}`,
        readerQuestion ? `reader_question=${readerQuestion}` : '',
        stakes ? `stakes=${stakes}` : '',
        choicePressure ? `choice_pressure=${choicePressure}` : '',
        payoffPromise ? `payoff_promise=${payoffPromise}` : '',
        nextChapterPull ? `next_chapter_pull=${nextChapterPull}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !readerQuestion && !stakes && !choicePressure && !payoffPromise && !nextChapterPull && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        reader_question: readerQuestion,
        stakes,
        choice_pressure: choicePressure,
        payoff_promise: payoffPromise,
        next_chapter_pull: nextChapterPull,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityTargetReaderRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.target_reader_checks || review?.targetReaderChecks),
    ...asArray(selfCheck?.target_reader_checks || selfCheck?.targetReaderChecks),
    ...asArray(payload?.target_reader_checks || payload?.targetReaderChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '目标读者')
      const targetReaderProfile = compactBriefText(check?.target_reader_profile || check?.targetReaderProfile)
      const readerDesire = compactBriefText(check?.reader_desire || check?.readerDesire)
      const emotionGap = compactBriefText(check?.emotion_gap || check?.emotionGap)
      const chapterHit = compactBriefText(check?.chapter_hit || check?.chapterHit)
      const platformTaste = compactBriefText(check?.platform_taste || check?.platformTaste)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || readerDesire || chapterHit || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `target_reader_checks.${label}`,
        targetReaderProfile ? `target_reader_profile=${targetReaderProfile}` : '',
        readerDesire ? `reader_desire=${readerDesire}` : '',
        emotionGap ? `emotion_gap=${emotionGap}` : '',
        chapterHit ? `chapter_hit=${chapterHit}` : '',
        platformTaste ? `platform_taste=${platformTaste}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !targetReaderProfile && !readerDesire && !emotionGap && !chapterHit && !platformTaste && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        target_reader_profile: targetReaderProfile,
        reader_desire: readerDesire,
        emotion_gap: emotionGap,
        chapter_hit: chapterHit,
        platform_taste: platformTaste,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityGenrePositioningRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.genre_positioning_checks || review?.genrePositioningChecks),
    ...asArray(selfCheck?.genre_positioning_checks || selfCheck?.genrePositioningChecks),
    ...asArray(payload?.genre_positioning_checks || payload?.genrePositioningChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '题材定位')
      const genreTag = compactBriefText(check?.genre_tag || check?.genreTag)
      const coreHook = compactBriefText(check?.core_hook || check?.coreHook)
      const typeFormula = compactBriefText(check?.type_formula || check?.typeFormula)
      const genreStrength = compactBriefText(check?.genre_strength || check?.genreStrength)
      const bookTitleBlurbAlignment = compactBriefText(check?.book_title_blurb_alignment || check?.bookTitleBlurbAlignment)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || coreHook || typeFormula || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `genre_positioning_checks.${label}`,
        genreTag ? `genre_tag=${genreTag}` : '',
        coreHook ? `core_hook=${coreHook}` : '',
        typeFormula ? `type_formula=${typeFormula}` : '',
        genreStrength ? `genre_strength=${genreStrength}` : '',
        bookTitleBlurbAlignment ? `book_title_blurb_alignment=${bookTitleBlurbAlignment}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !genreTag && !coreHook && !typeFormula && !genreStrength && !bookTitleBlurbAlignment && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        genre_tag: genreTag,
        core_hook: coreHook,
        type_formula: typeFormula,
        genre_strength: genreStrength,
        book_title_blurb_alignment: bookTitleBlurbAlignment,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityPlotSpecialTopicsRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.plot_special_topics_checks || review?.plotSpecialTopicsChecks),
    ...asArray(selfCheck?.plot_special_topics_checks || selfCheck?.plotSpecialTopicsChecks),
    ...asArray(payload?.plot_special_topics_checks || payload?.plotSpecialTopicsChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '特殊题材')
      const matchedTopics = uniqueBriefStrings(check?.matched_topics || check?.matchedTopics, 8)
      const goldfingerExecution = compactBriefText(check?.goldfinger_execution || check?.goldfingerExecution)
      const genreBoundaryExecution = compactBriefText(check?.genre_boundary_execution || check?.genreBoundaryExecution)
      const marketBenchmarkExecution = compactBriefText(check?.market_benchmark_execution || check?.marketBenchmarkExecution)
      const urbanHighMartialExecution = compactBriefText(check?.urban_high_martial_execution || check?.urbanHighMartialExecution)
      const launchCheckpointExecution = compactBriefText(check?.launch_checkpoint_execution || check?.launchCheckpointExecution)
      const factionHandExecution = compactBriefText(check?.faction_hand_execution || check?.factionHandExecution)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || launchCheckpointExecution || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `plot_special_topics_checks.${label}`,
        matchedTopics.length ? `matched_topics=${matchedTopics.join('、')}` : '',
        goldfingerExecution ? `goldfinger_execution=${goldfingerExecution}` : '',
        genreBoundaryExecution ? `genre_boundary_execution=${genreBoundaryExecution}` : '',
        marketBenchmarkExecution ? `market_benchmark_execution=${marketBenchmarkExecution}` : '',
        urbanHighMartialExecution ? `urban_high_martial_execution=${urbanHighMartialExecution}` : '',
        launchCheckpointExecution ? `launch_checkpoint_execution=${launchCheckpointExecution}` : '',
        factionHandExecution ? `faction_hand_execution=${factionHandExecution}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !matchedTopics.length && !goldfingerExecution && !genreBoundaryExecution && !marketBenchmarkExecution && !urbanHighMartialExecution && !launchCheckpointExecution && !factionHandExecution && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        matched_topics: matchedTopics,
        goldfinger_execution: goldfingerExecution,
        genre_boundary_execution: genreBoundaryExecution,
        market_benchmark_execution: marketBenchmarkExecution,
        urban_high_martial_execution: urbanHighMartialExecution,
        launch_checkpoint_execution: launchCheckpointExecution,
        faction_hand_execution: factionHandExecution,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export * from './prose-quality-risks-audience'
