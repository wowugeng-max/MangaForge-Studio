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
