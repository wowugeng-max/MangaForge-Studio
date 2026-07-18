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

export function proseQualityProseCraftRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.prose_craft_checks || review?.proseCraftChecks),
    ...asArray(selfCheck?.prose_craft_checks || selfCheck?.proseCraftChecks),
    ...asArray(payload?.prose_craft_checks || payload?.proseCraftChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '正文工艺')
      const povDepth = compactBriefText(check?.pov_depth || check?.povDepth)
      const bodyDetail = compactBriefText(check?.body_detail || check?.bodyDetail)
      const environmentInteraction = compactBriefText(check?.environment_interaction || check?.environmentInteraction)
      const actionStillnessBalance = compactBriefText(check?.action_stillness_balance || check?.actionStillnessBalance)
      const crowdReactionLayering = compactBriefText(check?.crowd_reaction_layering || check?.crowdReactionLayering)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || povDepth || bodyDetail || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `prose_craft_checks.${label}`,
        povDepth ? `pov_depth=${povDepth}` : '',
        bodyDetail ? `body_detail=${bodyDetail}` : '',
        environmentInteraction ? `environment_interaction=${environmentInteraction}` : '',
        actionStillnessBalance ? `action_stillness_balance=${actionStillnessBalance}` : '',
        crowdReactionLayering ? `crowd_reaction_layering=${crowdReactionLayering}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !povDepth && !bodyDetail && !environmentInteraction && !actionStillnessBalance && !crowdReactionLayering && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        pov_depth: povDepth,
        body_detail: bodyDetail,
        environment_interaction: environmentInteraction,
        action_stillness_balance: actionStillnessBalance,
        crowd_reaction_layering: crowdReactionLayering,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityPunctuationToneRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.punctuation_tone_checks || review?.punctuationToneChecks),
    ...asArray(selfCheck?.punctuation_tone_checks || selfCheck?.punctuationToneChecks),
    ...asArray(payload?.punctuation_tone_checks || payload?.punctuationToneChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '语气标点')
      const speaker = compactBriefText(check?.speaker)
      const punctuationIssue = compactBriefText(check?.punctuation_issue || check?.punctuationIssue)
      const toneIntent = compactBriefText(check?.tone_intent || check?.toneIntent)
      const replacement = compactBriefText(check?.replacement)
      const voiceDifference = compactBriefText(check?.voice_difference || check?.voiceDifference)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || punctuationIssue || toneIntent || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `punctuation_tone_checks.${label}`,
        speaker ? `speaker=${speaker}` : '',
        punctuationIssue ? `punctuation_issue=${punctuationIssue}` : '',
        toneIntent ? `tone_intent=${toneIntent}` : '',
        replacement ? `replacement=${replacement}` : '',
        voiceDifference ? `voice_difference=${voiceDifference}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !speaker && !punctuationIssue && !toneIntent && !replacement && !voiceDifference && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        speaker,
        punctuation_issue: punctuationIssue,
        tone_intent: toneIntent,
        replacement,
        voice_difference: voiceDifference,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityQualityAuditRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.quality_audit_checks || review?.qualityAuditChecks),
    ...asArray(selfCheck?.quality_audit_checks || selfCheck?.qualityAuditChecks),
    ...asArray(payload?.quality_audit_checks || payload?.qualityAuditChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '质量诊断')
      const strategy = compactBriefText(check?.strategy)
      const purposeTag = compactBriefText(check?.purpose_tag || check?.purposeTag)
      const densityChange = compactBriefText(check?.density_change || check?.densityChange)
      const conflictBoundInfo = compactBriefText(check?.conflict_bound_info || check?.conflictBoundInfo)
      const changedEvidence = compactBriefText(check?.changed_evidence || check?.changedEvidence)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || changedEvidence || densityChange || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `quality_audit_checks.${label}`,
        strategy ? `strategy=${strategy}` : '',
        purposeTag ? `purpose_tag=${purposeTag}` : '',
        densityChange ? `density_change=${densityChange}` : '',
        conflictBoundInfo ? `conflict_bound_info=${conflictBoundInfo}` : '',
        changedEvidence ? `changed_evidence=${changedEvidence}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !strategy && !purposeTag && !densityChange && !conflictBoundInfo && !changedEvidence && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        strategy,
        purpose_tag: purposeTag,
        density_change: densityChange,
        conflict_bound_info: conflictBoundInfo,
        changed_evidence: changedEvidence,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityFiveDimensionRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const scores = normalizeFiveDimensionQualityScores(
    review?.five_dimension_scores
    || review?.fiveDimensionScores
    || review?.five_dimensions
    || review?.fiveDimensions
    || review?.quality_audit_scores
    || review?.qualityAuditScores
    || selfCheck?.five_dimension_scores
    || selfCheck?.fiveDimensionScores
    || payload?.five_dimension_scores
    || payload?.fiveDimensionScores,
  )
  return asArray(scores?.below_threshold)
    .map((dimension: any) => {
      const label = compactBriefText(dimension?.label || dimension?.key, '五维评分')
      const evidence = compactBriefText(dimension?.evidence || `${label} ${dimension?.score} 分，低于 ${scores.threshold}。`)
      const fix = compactBriefText(dimension?.fix || (
        dimension?.strategy === 'de_ai'
          ? `下一章必须修复 ${label} 暴露的 AI 腔、解释腔或可读性问题。`
          : dimension?.strategy === 'rewrite'
            ? `下一章必须围绕 ${label} 重建核心冲突、因果或角色动机。`
            : `下一章必须补强 ${label} 的节奏、格式和信息衔接。`
      ))
      return { key: dimension?.key, label, evidence, fix, score: Number(dimension?.score || 0), strategy: dimension?.strategy }
    })
    .filter((item: any) => item.label || item.evidence || item.fix)
}

export function readabilityAiSmellRisks(payload: any) {
  const aiSmell = payload?.ai_smell || payload?.aiSmell || {}
  const level = compactBriefText(aiSmell?.level || payload?.ai_smell_level || payload?.aiSmellLevel)
  const normalizedLevel = level.toLowerCase()
  if (['', '无', 'none', 'no', 'n/a', 'null', 'false', '0'].includes(normalizedLevel)) return null
  const patternHits = asArray(aiSmell?.pattern_hits || aiSmell?.patternHits)
  const tactics = asArray(aiSmell?.rewrite_tactics || aiSmell?.rewriteTactics)
    .map(deliveryRiskItemText)
    .filter(Boolean)
  const evidence = patternHits
    .map((item: any) => deliveryRiskItemText(item?.evidence || item?.type || item))
    .filter(Boolean)
  const count = patternHits.length || tactics.length
  if (count <= 0) return null
  return {
    count,
    item: `去AI味：AI味${level} ${count}`,
    priorityLabel: '优先去AI味',
    evidence: [...tactics, ...evidence].slice(0, 6),
  }
}

export function makeDeliveryRiskItem(prefix: string, payload: any, count: number) {
  const label = compactBriefText(payload?.label || payload?.summary, `${prefix} ${count}`)
  return `${prefix}：${label}`
}

export function genericSyncRiskStagedActions(reviewType: string, evidence: string[]) {
  const firstEvidence = evidence[0] || '同步风险缺少可见承接。'
  const evidenceText = evidence.join('；')
  if (reviewType === 'benchmark_recall_sync' && /benchmark_anchor_excerpt_copy_risk|原文锚点复制|锚点原句|anchor_excerpts|copied_anchor/i.test(evidenceText)) {
    const anchorEvidence = evidence.find((item: string) => /删除|改写|锚点原句|信息释放手法|anchor_excerpts|原文锚点/i.test(item)) || firstEvidence
    return {
      openingActions: [
        `文风召回开篇修复：前300字先清理上一章 benchmark_anchor_excerpt_copy_risk，不得延续或复述锚点原句；${anchorEvidence}`,
      ],
      middleActions: [
        `文风召回中段修复：只保留锚点的句长、停顿、潜台词和信息释放手法，全部换成本书人物、事件、设定和措辞；${anchorEvidence}`,
      ],
      endingActions: [
        `文风召回章尾复核：章尾检查锚点复制风险是否清零，保留抽象技法但不得出现原文锚点句、桥段、角色名或专名；${anchorEvidence}`,
      ],
    }
  }
  return {
    openingActions: [
      `同步风险开篇承接：前300字先回应 ${reviewType} 的上一章缺口，把它转成当前场景目标、阻碍、证据或状态压力；${firstEvidence}`,
    ],
    middleActions: [
      `同步风险中段兑现：中段必须按 ${reviewType} 的 missed/next_actions 写出可见行动、信息变化、关系变化或状态变化，不能只在旁白里声明已处理；${firstEvidence}`,
    ],
    endingActions: [
      `同步风险章尾复核：章尾复核 ${reviewType} 的缺口是否闭环，并把处理结果转成新状态、新风险或下一章钩子；${firstEvidence}`,
    ],
  }
}
