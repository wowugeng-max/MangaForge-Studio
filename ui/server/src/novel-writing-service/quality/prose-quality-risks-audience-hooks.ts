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

export function proseQualityReversalRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.reversal_checks || review?.reversalChecks),
    ...asArray(selfCheck?.reversal_checks || selfCheck?.reversalChecks),
    ...asArray(payload?.reversal_checks || payload?.reversalChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '反转设计')
      const reversalType = compactBriefText(check?.reversal_type || check?.reversalType)
      const fairClues = compactBriefText(check?.fair_clues || check?.fairClues)
      const misdirect = compactBriefText(check?.misdirect)
      const revealTiming = compactBriefText(check?.reveal_timing || check?.revealTiming)
      const impactAfterReveal = compactBriefText(check?.impact_after_reveal || check?.impactAfterReveal)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || fairClues || impactAfterReveal || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `reversal_checks.${label}`,
        reversalType ? `reversal_type=${reversalType}` : '',
        fairClues ? `fair_clues=${fairClues}` : '',
        misdirect ? `misdirect=${misdirect}` : '',
        revealTiming ? `reveal_timing=${revealTiming}` : '',
        impactAfterReveal ? `impact_after_reveal=${impactAfterReveal}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !reversalType && !fairClues && !misdirect && !revealTiming && !impactAfterReveal && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        reversal_type: reversalType,
        fair_clues: fairClues,
        misdirect,
        reveal_timing: revealTiming,
        impact_after_reveal: impactAfterReveal,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityShowdownRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.showdown_checks || review?.showdownChecks),
    ...asArray(selfCheck?.showdown_checks || selfCheck?.showdownChecks),
    ...asArray(payload?.showdown_checks || payload?.showdownChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '高潮对抗')
      const payoffRelease = compactBriefText(check?.payoff_release || check?.payoffRelease)
      const trumpCardUsed = compactBriefText(check?.trump_card_used || check?.trumpCardUsed)
      const pressureLayers = compactBriefText(check?.pressure_layers || check?.pressureLayers)
      const audienceReactions = compactBriefText(check?.audience_reactions || check?.audienceReactions)
      const consequence = compactBriefText(check?.consequence)
      const nextThreshold = compactBriefText(check?.next_threshold || check?.nextThreshold)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || payoffRelease || pressureLayers || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `showdown_checks.${label}`,
        payoffRelease ? `payoff_release=${payoffRelease}` : '',
        trumpCardUsed ? `trump_card_used=${trumpCardUsed}` : '',
        pressureLayers ? `pressure_layers=${pressureLayers}` : '',
        audienceReactions ? `audience_reactions=${audienceReactions}` : '',
        consequence ? `consequence=${consequence}` : '',
        nextThreshold ? `next_threshold=${nextThreshold}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !payoffRelease && !trumpCardUsed && !pressureLayers && !audienceReactions && !consequence && !nextThreshold && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        payoff_release: payoffRelease,
        trump_card_used: trumpCardUsed,
        pressure_layers: pressureLayers,
        audience_reactions: audienceReactions,
        consequence,
        next_threshold: nextThreshold,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityBridgeUnitRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.bridge_unit_checks || review?.bridgeUnitChecks),
    ...asArray(selfCheck?.bridge_unit_checks || selfCheck?.bridgeUnitChecks),
    ...asArray(payload?.bridge_unit_checks || payload?.bridgeUnitChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '桥段节奏')
      const bridgePosition = compactBriefText(check?.bridge_position || check?.bridgePosition)
      const oldExpectationPayoff = compactBriefText(check?.old_expectation_payoff || check?.oldExpectationPayoff)
      const newExpectationSeed = compactBriefText(check?.new_expectation_seed || check?.newExpectationSeed)
      const goalProgression = compactBriefText(check?.goal_progression || check?.goalProgression)
      const climaxHook = compactBriefText(check?.climax_hook || check?.climaxHook)
      const stageHandoff = compactBriefText(check?.stage_handoff || check?.stageHandoff)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || oldExpectationPayoff || goalProgression || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `bridge_unit_checks.${label}`,
        bridgePosition ? `bridge_position=${bridgePosition}` : '',
        oldExpectationPayoff ? `old_expectation_payoff=${oldExpectationPayoff}` : '',
        newExpectationSeed ? `new_expectation_seed=${newExpectationSeed}` : '',
        goalProgression ? `goal_progression=${goalProgression}` : '',
        climaxHook ? `climax_hook=${climaxHook}` : '',
        stageHandoff ? `stage_handoff=${stageHandoff}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !bridgePosition && !oldExpectationPayoff && !newExpectationSeed && !goalProgression && !climaxHook && !stageHandoff && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        bridge_position: bridgePosition,
        old_expectation_payoff: oldExpectationPayoff,
        new_expectation_seed: newExpectationSeed,
        goal_progression: goalProgression,
        climax_hook: climaxHook,
        stage_handoff: stageHandoff,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityOpeningRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.opening_checks || review?.openingChecks),
    ...asArray(selfCheck?.opening_checks || selfCheck?.openingChecks),
    ...asArray(payload?.opening_checks || payload?.openingChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '开篇设计')
      const protagonistEntry = compactBriefText(check?.protagonist_entry || check?.protagonistEntry)
      const first300Goal = compactBriefText(check?.first_300_goal || check?.first300Goal)
      const first1000Expectation = compactBriefText(check?.first_1000_expectation || check?.first1000Expectation)
      const openingPrinciple = compactBriefText(check?.opening_principle || check?.openingPrinciple)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const action = compactBriefText([
        `opening_checks.${label}`,
        protagonistEntry ? `protagonist_entry=${protagonistEntry}` : '',
        first300Goal ? `first_300_goal=${first300Goal}` : '',
        first1000Expectation ? `first_1000_expectation=${first1000Expectation}` : '',
        openingPrinciple ? `opening_principle=${openingPrinciple}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !protagonistEntry && !first300Goal && !first1000Expectation && !openingPrinciple && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        protagonist_entry: protagonistEntry,
        first_300_goal: first300Goal,
        first_1000_expectation: first1000Expectation,
        opening_principle: openingPrinciple,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

