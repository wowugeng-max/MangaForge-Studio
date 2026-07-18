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

export function proseQualityStructuredCheckRisks(payload: any, options: {
  snakeField: string
  camelField: string
  actionPrefix: string
  fallbackLabel: string
  detailFields?: string[][]
}) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.[options.snakeField] || review?.[options.camelField]),
    ...asArray(selfCheck?.[options.snakeField] || selfCheck?.[options.camelField]),
    ...asArray(payload?.[options.snakeField] || payload?.[options.camelField]),
  ]
  return checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, options.fallbackLabel)
      const detailValues = uniqueBriefStrings(asArray(options.detailFields).flatMap((fields: string[]) => (
        fields.map(field => check?.[field])
      )), 8)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const action = compactBriefText([
        `${options.actionPrefix}.${label}`,
        ...detailValues,
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !detailValues.length && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        details: detailValues,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityQualitySpecialtyRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const groups = [
    {
      field: 'structure_checks',
      fallbackLabel: '章节结构',
      checks: [
        ...asArray(review?.structure_checks || review?.structureChecks),
        ...asArray(selfCheck?.structure_checks || selfCheck?.structureChecks),
        ...asArray(payload?.structure_checks || payload?.structureChecks),
      ],
    },
    {
      field: 'progression_checks',
      fallbackLabel: '章节推进',
      checks: [
        ...asArray(review?.progression_checks || review?.progressionChecks),
        ...asArray(selfCheck?.progression_checks || selfCheck?.progressionChecks),
        ...asArray(payload?.progression_checks || payload?.progressionChecks),
      ],
    },
    {
      field: 'information_checks',
      fallbackLabel: '信息传递',
      checks: [
        ...asArray(review?.information_checks || review?.informationChecks),
        ...asArray(selfCheck?.information_checks || selfCheck?.informationChecks),
        ...asArray(payload?.information_checks || payload?.informationChecks),
      ],
    },
  ]
  return groups.flatMap(group => group.checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, group.fallbackLabel)
      const normalizedLabel = compactBriefText(label.replace(new RegExp(`^${group.field}[\\s.：:]*`, 'i'), ''), label)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      const action = compactBriefText(`${group.field}.${normalizedLabel}：${fix || evidence}`)
      if (!label && !evidence && !fix) return null
      return {
        field: group.field,
        label: `${group.field} ${normalizedLabel}`,
        evidence,
        fix,
        action,
      }
    })
    .filter(Boolean))
}

export function proseQualityReaderRetentionRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.reader_retention_checks || review?.readerRetentionChecks),
    ...asArray(selfCheck?.reader_retention_checks || selfCheck?.readerRetentionChecks),
    ...asArray(payload?.reader_retention_checks || payload?.readerRetentionChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '追读雷达')
      const retentionEngine = compactBriefText(check?.retention_engine || check?.retentionEngine)
      const emotionalPayoff = compactBriefText(check?.emotional_payoff || check?.emotionalPayoff)
      const informationHunger = compactBriefText(check?.information_hunger || check?.informationHunger)
      const pageTurnQuestion = compactBriefText(check?.page_turn_question || check?.pageTurnQuestion)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || emotionalPayoff || informationHunger || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `reader_retention_checks.${label}`,
        retentionEngine ? `retention_engine=${retentionEngine}` : '',
        emotionalPayoff ? `emotional_payoff=${emotionalPayoff}` : '',
        informationHunger ? `information_hunger=${informationHunger}` : '',
        pageTurnQuestion ? `page_turn_question=${pageTurnQuestion}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !retentionEngine && !emotionalPayoff && !informationHunger && !pageTurnQuestion && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        retention_engine: retentionEngine,
        emotional_payoff: emotionalPayoff,
        information_hunger: informationHunger,
        page_turn_question: pageTurnQuestion,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityCoreContractRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.core_contract_checks || review?.coreContractChecks),
    ...asArray(selfCheck?.core_contract_checks || selfCheck?.coreContractChecks),
    ...asArray(payload?.core_contract_checks || payload?.coreContractChecks),
  ]
  return checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '核心承诺')
      const corePromise = compactBriefText(check?.core_promise || check?.corePromise)
      const mainlineService = compactBriefText(check?.mainline_service || check?.mainlineService)
      const coreEmotion = compactBriefText(check?.core_emotion || check?.coreEmotion)
      const ruleJudgement = compactBriefText(check?.rule_judgement || check?.ruleJudgement)
      const endingQuestion = compactBriefText(check?.ending_question || check?.endingQuestion)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const action = compactBriefText([
        `core_contract_checks.${label}`,
        corePromise ? `core_promise=${corePromise}` : '',
        mainlineService ? `mainline_service=${mainlineService}` : '',
        coreEmotion ? `core_emotion=${coreEmotion}` : '',
        ruleJudgement ? `rule_judgement=${ruleJudgement}` : '',
        endingQuestion ? `ending_question=${endingQuestion}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !corePromise && !mainlineService && !coreEmotion && !ruleJudgement && !endingQuestion && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        core_promise: corePromise,
        mainline_service: mainlineService,
        core_emotion: coreEmotion,
        rule_judgement: ruleJudgement,
        ending_question: endingQuestion,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function normalizePerspectiveVerdicts(value: any) {
  const rows = Array.isArray(value)
    ? value
    : value && typeof value === 'object'
      ? Object.entries(value).map(([reviewer, verdict]: [string, any]) => (
          verdict && typeof verdict === 'object' && !Array.isArray(verdict)
            ? { reviewer, ...verdict }
            : { reviewer, verdict }
        ))
      : []
  return rows
    .map((row: any) => {
      const reviewer = compactBriefText(row?.reviewer || row?.agent || row?.name || row?.role)
      const verdict = compactBriefText(row?.verdict || row?.status || row?.result).toUpperCase()
      const findings = asArray(row?.findings || row?.issues).map(normalizeIssue)
      const recommendations = asArray(row?.recommendations || row?.suggestions || row?.next_actions || row?.nextActions)
        .map(deliveryRiskItemText)
        .filter(Boolean)
      const summary = compactBriefText(row?.summary || row?.reason || row?.issue || row?.description)
      if (!reviewer && !verdict && !summary && findings.length === 0 && recommendations.length === 0) return null
      return {
        reviewer,
        verdict,
        summary,
        finding_count: Number(row?.finding_count ?? row?.findingCount ?? findings.length ?? 0) || findings.length,
        findings,
        recommendations,
      }
    })
    .filter(Boolean)
}

export function proseQualityPerspectiveVerdictRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  return normalizePerspectiveVerdicts(
    review?.perspective_verdicts
    || review?.perspectiveVerdicts
    || selfCheck?.perspective_verdicts
    || selfCheck?.perspectiveVerdicts
    || payload?.perspective_verdicts
    || payload?.perspectiveVerdicts,
  )
    .filter((row: any) => ['CONCERNS', 'REJECT'].includes(String(row?.verdict || '').toUpperCase()))
    .map((row: any) => {
      const evidence = [
        ...asArray(row.recommendations),
        ...asArray(row.findings).flatMap((finding: any) => [finding.fix, finding.evidence, finding.issue]),
        row.summary,
      ].map(deliveryRiskItemText).filter(Boolean)
      return {
        reviewer: compactBriefText(row.reviewer, 'reviewer'),
        verdict: compactBriefText(row.verdict, 'CONCERNS'),
        evidence,
      }
    })
}

export function proseQualityDeslopRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.deslop_checks || review?.deslopChecks),
    ...asArray(selfCheck?.deslop_checks || selfCheck?.deslopChecks),
    ...asArray(payload?.deslop_checks || payload?.deslopChecks),
  ]
  const directRisks = checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const gate = compactBriefText(check?.gate || check?.key || check?.name, 'Gate')
      const pattern = compactBriefText(check?.pattern || check?.label || check?.type || check?.issue, 'AI味模式')
      const evidence = compactBriefText(check?.evidence || check?.example || check?.reason || check?.description)
      const fix = compactBriefText(check?.fix || check?.rewrite || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      if (!gate && !pattern && !evidence && !fix) return null
      return {
        gate,
        pattern,
        evidence,
        fix,
      }
    })
    .filter(Boolean)
  const diagnostics = review?.deslop_gate_diagnostics
    || review?.deslopGateDiagnostics
    || selfCheck?.deslop_gate_diagnostics
    || selfCheck?.deslopGateDiagnostics
    || payload?.deslop_gate_diagnostics
    || payload?.deslopGateDiagnostics
  const diagnosticRisks = asArray(diagnostics?.gates)
    .filter((gate: any) => platformCheckNeedsCarryOver(gate))
    .map((gate: any) => {
      const gateId = compactBriefText(gate?.gate || gate?.key || gate?.name, 'Gate')
      const label = compactBriefText(gate?.label || gate?.title, '门禁摘要')
      const patterns = asArray(gate?.patterns).map(deliveryRiskItemText).filter(Boolean).join('、')
      const evidence = compactBriefText(gate?.evidence || diagnostics?.summary)
      const fix = compactBriefText(gate?.fix || gate?.repair_instruction || gate?.repairInstruction || gate?.suggestion)
      return {
        gate: gateId,
        pattern: patterns || label,
        evidence: [diagnostics?.summary, `Gate ${gateId} ${label}`, evidence].map(deliveryRiskItemText).filter(Boolean).join('；'),
        fix,
        diagnostic: true,
      }
    })
    .filter((item: any) => item.gate || item.pattern || item.evidence || item.fix)
  return [...directRisks, ...diagnosticRisks]
}

export function proseQualityDialogueRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.dialogue_checks || review?.dialogueChecks),
    ...asArray(selfCheck?.dialogue_checks || selfCheck?.dialogueChecks),
    ...asArray(payload?.dialogue_checks || payload?.dialogueChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '对白检查')
      const speaker = compactBriefText(check?.speaker)
      const agenda = compactBriefText(check?.agenda)
      const subtext = compactBriefText(check?.subtext)
      const powerShift = compactBriefText(check?.power_shift || check?.powerShift)
      const informationDelta = compactBriefText(check?.information_delta || check?.informationDelta)
      const characterVoice = compactBriefText(check?.character_voice || check?.characterVoice)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || subtext || informationDelta || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `dialogue_checks.${label}`,
        speaker ? `speaker=${speaker}` : '',
        agenda ? `agenda=${agenda}` : '',
        subtext ? `subtext=${subtext}` : '',
        powerShift ? `power_shift=${powerShift}` : '',
        informationDelta ? `information_delta=${informationDelta}` : '',
        characterVoice ? `character_voice=${characterVoice}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !speaker && !agenda && !subtext && !powerShift && !informationDelta && !characterVoice && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        speaker,
        agenda,
        subtext,
        power_shift: powerShift,
        information_delta: informationDelta,
        character_voice: characterVoice,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityPlotDynamicsRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.plot_dynamics_checks || review?.plotDynamicsChecks),
    ...asArray(selfCheck?.plot_dynamics_checks || selfCheck?.plotDynamicsChecks),
    ...asArray(payload?.plot_dynamics_checks || payload?.plotDynamicsChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '剧情动力')
      const goal = compactBriefText(check?.goal)
      const obstacle = compactBriefText(check?.obstacle)
      const actionText = compactBriefText(check?.action)
      const costOrFeedback = compactBriefText(check?.cost_or_feedback || check?.costOrFeedback)
      const newExpectation = compactBriefText(check?.new_expectation || check?.newExpectation)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || actionText || costOrFeedback || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `plot_dynamics_checks.${label}`,
        goal ? `goal=${goal}` : '',
        obstacle ? `obstacle=${obstacle}` : '',
        actionText ? `action=${actionText}` : '',
        costOrFeedback ? `cost_or_feedback=${costOrFeedback}` : '',
        newExpectation ? `new_expectation=${newExpectation}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !goal && !obstacle && !actionText && !costOrFeedback && !newExpectation && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        goal,
        obstacle,
        action: actionText,
        cost_or_feedback: costOrFeedback,
        new_expectation: newExpectation,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action_directive: action,
      }
    })
    .filter(Boolean)
}

export function proseQualityContinuityHeatRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.continuity_heat_checks || review?.continuityHeatChecks),
    ...asArray(selfCheck?.continuity_heat_checks || selfCheck?.continuityHeatChecks),
    ...asArray(payload?.continuity_heat_checks || payload?.continuityHeatChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '连续性热度')
      const heatState = compactBriefText(check?.heat_state || check?.heatState)
      const hotProgress = compactBriefText(check?.hot_progress || check?.hotProgress)
      const warmKeepalive = compactBriefText(check?.warm_keepalive || check?.warmKeepalive)
      const coldWarmup = compactBriefText(check?.cold_warmup || check?.coldWarmup)
      const archivedBoundary = compactBriefText(check?.archived_boundary || check?.archivedBoundary)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || hotProgress || warmKeepalive || coldWarmup || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `continuity_heat_checks.${label}`,
        heatState ? `heat_state=${heatState}` : '',
        hotProgress ? `hot_progress=${hotProgress}` : '',
        warmKeepalive ? `warm_keepalive=${warmKeepalive}` : '',
        coldWarmup ? `cold_warmup=${coldWarmup}` : '',
        archivedBoundary ? `archived_boundary=${archivedBoundary}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !heatState && !hotProgress && !warmKeepalive && !coldWarmup && !archivedBoundary && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        heat_state: heatState,
        hot_progress: hotProgress,
        warm_keepalive: warmKeepalive,
        cold_warmup: coldWarmup,
        archived_boundary: archivedBoundary,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityCharacterRelationRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.character_relation_checks || review?.characterRelationChecks),
    ...asArray(selfCheck?.character_relation_checks || selfCheck?.characterRelationChecks),
    ...asArray(payload?.character_relation_checks || payload?.characterRelationChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '角色关系')
      const relationType = compactBriefText(check?.relation_type || check?.relationType)
      const protagonistGoal = compactBriefText(check?.protagonist_goal || check?.protagonistGoal)
      const agencyChoice = compactBriefText(check?.agency_choice || check?.agencyChoice)
      const cost = compactBriefText(check?.cost)
      const relationShift = compactBriefText(check?.relation_shift || check?.relationShift)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || agencyChoice || relationShift || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `character_relation_checks.${label}`,
        relationType ? `relation_type=${relationType}` : '',
        protagonistGoal ? `protagonist_goal=${protagonistGoal}` : '',
        agencyChoice ? `agency_choice=${agencyChoice}` : '',
        cost ? `cost=${cost}` : '',
        relationShift ? `relation_shift=${relationShift}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !relationType && !protagonistGoal && !agencyChoice && !cost && !relationShift && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        relation_type: relationType,
        protagonist_goal: protagonistGoal,
        agency_choice: agencyChoice,
        cost,
        relation_shift: relationShift,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityCharacterBehaviorRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.character_behavior_checks || review?.characterBehaviorChecks),
    ...asArray(selfCheck?.character_behavior_checks || selfCheck?.characterBehaviorChecks),
    ...asArray(payload?.character_behavior_checks || payload?.characterBehaviorChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '角色行为')
      const character = compactBriefText(check?.character)
      const concreteMotive = compactBriefText(check?.concrete_motive || check?.concreteMotive)
      const emotionalReason = compactBriefText(check?.emotional_reason || check?.emotionalReason)
      const triggerChange = compactBriefText(check?.trigger_change || check?.triggerChange)
      const visibleChoice = compactBriefText(check?.visible_choice || check?.visibleChoice)
      const cost = compactBriefText(check?.cost)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || concreteMotive || visibleChoice || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `character_behavior_checks.${label}`,
        character ? `character=${character}` : '',
        concreteMotive ? `concrete_motive=${concreteMotive}` : '',
        emotionalReason ? `emotional_reason=${emotionalReason}` : '',
        triggerChange ? `trigger_change=${triggerChange}` : '',
        visibleChoice ? `visible_choice=${visibleChoice}` : '',
        cost ? `cost=${cost}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !character && !concreteMotive && !emotionalReason && !triggerChange && !visibleChoice && !cost && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        character,
        concrete_motive: concreteMotive,
        emotional_reason: emotionalReason,
        trigger_change: triggerChange,
        visible_choice: visibleChoice,
        cost,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityAssetLinkageRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.asset_linkage_checks || review?.assetLinkageChecks),
    ...asArray(selfCheck?.asset_linkage_checks || selfCheck?.assetLinkageChecks),
    ...asArray(payload?.asset_linkage_checks || payload?.assetLinkageChecks),
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
      const label = compactBriefText(check?.label || check?.key || check?.name, '资产挂钩')
      const assetName = compactBriefText(check?.asset_name || check?.assetName)
      const assetFunction = compactBriefText(check?.function || check?.asset_function || check?.assetFunction)
      const ownership = compactBriefText(check?.ownership)
      const triggerCondition = compactBriefText(check?.trigger_condition || check?.triggerCondition)
      const limitation = compactBriefText(check?.limitation)
      const consequence = compactBriefText(check?.consequence)
      const storyLink = compactBriefText(check?.story_link || check?.storyLink)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description || assetFunction || storyLink || remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `asset_linkage_checks.${label}`,
        assetName ? `asset_name=${assetName}` : '',
        assetFunction ? `function=${assetFunction}` : '',
        ownership ? `ownership=${ownership}` : '',
        triggerCondition ? `trigger_condition=${triggerCondition}` : '',
        limitation ? `limitation=${limitation}` : '',
        consequence ? `consequence=${consequence}` : '',
        storyLink ? `story_link=${storyLink}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !assetName && !assetFunction && !ownership && !triggerCondition && !limitation && !consequence && !storyLink && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        asset_name: assetName,
        asset_function: assetFunction,
        ownership,
        trigger_condition: triggerCondition,
        limitation,
        consequence,
        story_link: storyLink,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export * from './prose-quality-risks-extended'
