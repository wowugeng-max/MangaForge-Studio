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

export function proseQualityFemaleAudienceRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.female_audience_checks || review?.femaleAudienceChecks),
    ...asArray(selfCheck?.female_audience_checks || selfCheck?.femaleAudienceChecks),
    ...asArray(payload?.female_audience_checks || payload?.femaleAudienceChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '女频长篇')
      const securityAnchor = compactBriefText(check?.security_anchor || check?.securityAnchor)
      const readerIdentification = compactBriefText(check?.reader_identification || check?.readerIdentification)
      const heroineAgency = compactBriefText(check?.heroine_agency || check?.heroineAgency)
      const relationshipAxis = compactBriefText(check?.relationship_axis || check?.relationshipAxis)
      const postAbusePayoff = compactBriefText(check?.post_abuse_payoff || check?.postAbusePayoff)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || heroineAgency || postAbusePayoff || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `female_audience_checks.${label}`,
        securityAnchor ? `security_anchor=${securityAnchor}` : '',
        readerIdentification ? `reader_identification=${readerIdentification}` : '',
        heroineAgency ? `heroine_agency=${heroineAgency}` : '',
        relationshipAxis ? `relationship_axis=${relationshipAxis}` : '',
        postAbusePayoff ? `post_abuse_payoff=${postAbusePayoff}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !securityAnchor && !readerIdentification && !heroineAgency && !relationshipAxis && !postAbusePayoff && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        security_anchor: securityAnchor,
        reader_identification: readerIdentification,
        heroine_agency: heroineAgency,
        relationship_axis: relationshipAxis,
        post_abuse_payoff: postAbusePayoff,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityUpgradeRhythmRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.upgrade_rhythm_checks || review?.upgradeRhythmChecks),
    ...asArray(selfCheck?.upgrade_rhythm_checks || selfCheck?.upgradeRhythmChecks),
    ...asArray(payload?.upgrade_rhythm_checks || payload?.upgradeRhythmChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '升级节奏')
      const beforeAfterContrast = compactBriefText(check?.before_after_contrast || check?.beforeAfterContrast)
      const instantFeedback = compactBriefText(check?.instant_feedback || check?.instantFeedback)
      const delayedFeedback = compactBriefText(check?.delayed_feedback || check?.delayedFeedback)
      const newThreshold = compactBriefText(check?.new_threshold || check?.newThreshold)
      const cheatRule = compactBriefText(check?.cheat_rule || check?.cheatRule)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || beforeAfterContrast || instantFeedback || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `upgrade_rhythm_checks.${label}`,
        beforeAfterContrast ? `before_after_contrast=${beforeAfterContrast}` : '',
        instantFeedback ? `instant_feedback=${instantFeedback}` : '',
        delayedFeedback ? `delayed_feedback=${delayedFeedback}` : '',
        newThreshold ? `new_threshold=${newThreshold}` : '',
        cheatRule ? `cheat_rule=${cheatRule}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !beforeAfterContrast && !instantFeedback && !delayedFeedback && !newThreshold && !cheatRule && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        before_after_contrast: beforeAfterContrast,
        instant_feedback: instantFeedback,
        delayed_feedback: delayedFeedback,
        new_threshold: newThreshold,
        cheat_rule: cheatRule,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityConflictStructureRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.conflict_structure_checks || review?.conflictStructureChecks),
    ...asArray(selfCheck?.conflict_structure_checks || selfCheck?.conflictStructureChecks),
    ...asArray(payload?.conflict_structure_checks || payload?.conflictStructureChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '冲突结构')
      const blocker = compactBriefText(check?.blocker)
      const noExitCondition = compactBriefText(check?.no_exit_condition || check?.noExitCondition)
      const stakesOrExitCost = compactBriefText(check?.stakes_or_exit_cost || check?.stakesOrExitCost)
      const actionBlock = compactBriefText(check?.action_block || check?.actionBlock)
      const winLossResult = compactBriefText(check?.win_loss_result || check?.winLossResult)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || blocker || actionBlock || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `conflict_structure_checks.${label}`,
        blocker ? `blocker=${blocker}` : '',
        noExitCondition ? `no_exit_condition=${noExitCondition}` : '',
        stakesOrExitCost ? `stakes_or_exit_cost=${stakesOrExitCost}` : '',
        actionBlock ? `action_block=${actionBlock}` : '',
        winLossResult ? `win_loss_result=${winLossResult}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !blocker && !noExitCondition && !stakesOrExitCost && !actionBlock && !winLossResult && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        blocker,
        no_exit_condition: noExitCondition,
        stakes_or_exit_cost: stakesOrExitCost,
        action_block: actionBlock,
        win_loss_result: winLossResult,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityStoryLoopRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.story_loop_checks || review?.storyLoopChecks),
    ...asArray(selfCheck?.story_loop_checks || selfCheck?.storyLoopChecks),
    ...asArray(payload?.story_loop_checks || payload?.storyLoopChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '故事循环')
      const setupQuestion = compactBriefText(check?.setup_question || check?.setupQuestion)
      const obstacle = compactBriefText(check?.obstacle)
      const choice = compactBriefText(check?.choice)
      const cost = compactBriefText(check?.cost)
      const payoffOrAnswerFragment = compactBriefText(check?.payoff_or_answer_fragment || check?.payoffOrAnswerFragment)
      const newQuestion = compactBriefText(check?.new_question || check?.newQuestion)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || setupQuestion || payoffOrAnswerFragment || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `story_loop_checks.${label}`,
        setupQuestion ? `setup_question=${setupQuestion}` : '',
        obstacle ? `obstacle=${obstacle}` : '',
        choice ? `choice=${choice}` : '',
        cost ? `cost=${cost}` : '',
        payoffOrAnswerFragment ? `payoff_or_answer_fragment=${payoffOrAnswerFragment}` : '',
        newQuestion ? `new_question=${newQuestion}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !setupQuestion && !obstacle && !choice && !cost && !payoffOrAnswerFragment && !newQuestion && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        setup_question: setupQuestion,
        obstacle,
        choice,
        cost,
        payoff_or_answer_fragment: payoffOrAnswerFragment,
        new_question: newQuestion,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityEmotionalArcRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.emotional_arc_checks || review?.emotionalArcChecks),
    ...asArray(selfCheck?.emotional_arc_checks || selfCheck?.emotionalArcChecks),
    ...asArray(payload?.emotional_arc_checks || payload?.emotionalArcChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '情绪弧')
      const calmOrPressure = compactBriefText(check?.calm_or_pressure || check?.calmOrPressure)
      const mobilization = compactBriefText(check?.mobilization)
      const counteraction = compactBriefText(check?.counteraction)
      const release = compactBriefText(check?.release)
      const readerPayoff = compactBriefText(check?.reader_payoff || check?.readerPayoff)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || mobilization || release || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `emotional_arc_checks.${label}`,
        calmOrPressure ? `calm_or_pressure=${calmOrPressure}` : '',
        mobilization ? `mobilization=${mobilization}` : '',
        counteraction ? `counteraction=${counteraction}` : '',
        release ? `release=${release}` : '',
        readerPayoff ? `reader_payoff=${readerPayoff}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !calmOrPressure && !mobilization && !counteraction && !release && !readerPayoff && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        calm_or_pressure: calmOrPressure,
        mobilization,
        counteraction,
        release,
        reader_payoff: readerPayoff,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityChapterHookRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const tagHookCheck = (check: any, checkType: string) => check && typeof check === 'object'
    ? { ...check, __check_type: checkType }
    : { description: check, __check_type: checkType }
  const checks = [
    ...asArray(review?.chapter_hook_checks || review?.chapterHookChecks).map((check: any) => tagHookCheck(check, 'chapter_hook_checks')),
    ...asArray(review?.chapter_hook_quality_checks || review?.chapterHookQualityChecks).map((check: any) => tagHookCheck(check, 'chapter_hook_quality_checks')),
    ...asArray(selfCheck?.chapter_hook_checks || selfCheck?.chapterHookChecks).map((check: any) => tagHookCheck(check, 'chapter_hook_checks')),
    ...asArray(selfCheck?.chapter_hook_quality_checks || selfCheck?.chapterHookQualityChecks).map((check: any) => tagHookCheck(check, 'chapter_hook_quality_checks')),
    ...asArray(payload?.chapter_hook_checks || payload?.chapterHookChecks).map((check: any) => tagHookCheck(check, 'chapter_hook_checks')),
    ...asArray(payload?.chapter_hook_quality_checks || payload?.chapterHookQualityChecks).map((check: any) => tagHookCheck(check, 'chapter_hook_quality_checks')),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '章级钩子')
      const checkType = compactBriefText(check?.__check_type, 'chapter_hook_checks')
      const hookPosition = compactBriefText(check?.hook_position || check?.hookPosition)
      const trigger = compactBriefText(check?.trigger)
      const readerQuestion = compactBriefText(check?.reader_question || check?.readerQuestion)
      const nextChapterPressure = compactBriefText(check?.next_chapter_pressure || check?.nextChapterPressure)
      const deliveredEvidence = compactBriefText(check?.delivered_evidence || check?.deliveredEvidence)
      const triggerType = compactBriefText(check?.trigger_type || check?.triggerType)
      const concreteQuestion = compactBriefText(check?.concrete_question || check?.concreteQuestion)
      const dangerOrChoice = compactBriefText(check?.danger_or_choice || check?.dangerOrChoice)
      const nextActionLink = compactBriefText(check?.next_action_link || check?.nextActionLink)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || deliveredEvidence || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `${checkType}.${label}`,
        hookPosition ? `hook_position=${hookPosition}` : '',
        trigger ? `trigger=${trigger}` : '',
        readerQuestion ? `reader_question=${readerQuestion}` : '',
        nextChapterPressure ? `next_chapter_pressure=${nextChapterPressure}` : '',
        deliveredEvidence ? `delivered_evidence=${deliveredEvidence}` : '',
        triggerType ? `trigger_type=${triggerType}` : '',
        concreteQuestion ? `concrete_question=${concreteQuestion}` : '',
        dangerOrChoice ? `danger_or_choice=${dangerOrChoice}` : '',
        nextActionLink ? `next_action_link=${nextActionLink}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !hookPosition && !trigger && !readerQuestion && !nextChapterPressure && !deliveredEvidence && !triggerType && !concreteQuestion && !dangerOrChoice && !nextActionLink && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        check_type: checkType,
        hook_position: hookPosition,
        trigger,
        reader_question: readerQuestion,
        next_chapter_pressure: nextChapterPressure,
        delivered_evidence: deliveredEvidence,
        trigger_type: triggerType,
        concrete_question: concreteQuestion,
        danger_or_choice: dangerOrChoice,
        next_action_link: nextActionLink,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityParagraphHookRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.paragraph_hook_checks || review?.paragraphHookChecks),
    ...asArray(selfCheck?.paragraph_hook_checks || selfCheck?.paragraphHookChecks),
    ...asArray(payload?.paragraph_hook_checks || payload?.paragraphHookChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '段落级钩子')
      const paragraphRange = compactBriefText(check?.paragraph_range || check?.paragraphRange)
      const hookType = compactBriefText(check?.hook_type || check?.hookType)
      const microChange = compactBriefText(check?.micro_change || check?.microChange)
      const informationOrRiskDelta = compactBriefText(check?.information_or_risk_delta || check?.informationOrRiskDelta)
      const emotionOrRelationDelta = compactBriefText(check?.emotion_or_relation_delta || check?.emotionOrRelationDelta)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || informationOrRiskDelta || emotionOrRelationDelta || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `paragraph_hook_checks.${label}`,
        paragraphRange ? `paragraph_range=${paragraphRange}` : '',
        hookType ? `hook_type=${hookType}` : '',
        microChange ? `micro_change=${microChange}` : '',
        informationOrRiskDelta ? `information_or_risk_delta=${informationOrRiskDelta}` : '',
        emotionOrRelationDelta ? `emotion_or_relation_delta=${emotionOrRelationDelta}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !paragraphRange && !hookType && !microChange && !informationOrRiskDelta && !emotionOrRelationDelta && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        paragraph_range: paragraphRange,
        hook_type: hookType,
        micro_change: microChange,
        information_or_risk_delta: informationOrRiskDelta,
        emotion_or_relation_delta: emotionOrRelationDelta,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualitySuspenseRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.suspense_checks || review?.suspenseChecks),
    ...asArray(selfCheck?.suspense_checks || selfCheck?.suspenseChecks),
    ...asArray(payload?.suspense_checks || payload?.suspenseChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '悬念编排')
      const question = compactBriefText(check?.question)
      const misdirect = compactBriefText(check?.misdirect)
      const partialAnswer = compactBriefText(check?.partial_answer || check?.partialAnswer)
      const newExpectation = compactBriefText(check?.new_expectation || check?.newExpectation)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || question || partialAnswer || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `suspense_checks.${label}`,
        question ? `question=${question}` : '',
        misdirect ? `misdirect=${misdirect}` : '',
        partialAnswer ? `partial_answer=${partialAnswer}` : '',
        newExpectation ? `new_expectation=${newExpectation}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !question && !misdirect && !partialAnswer && !newExpectation && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        question,
        misdirect,
        partial_answer: partialAnswer,
        new_expectation: newExpectation,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

