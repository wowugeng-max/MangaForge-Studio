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

