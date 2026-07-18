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
