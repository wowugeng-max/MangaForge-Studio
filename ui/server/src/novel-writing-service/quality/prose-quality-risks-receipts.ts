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

export function deliveryRiskCountFromPayload(payload: any, keys: string[] = []) {
  for (const key of keys) {
    const value = Number(payload?.[key])
    if (Number.isFinite(value) && value > 0) return value
  }
  const candidateArrays = [
    payload?.missed,
    payload?.weak_dimensions,
    payload?.weakDimensions,
    payload?.drift_risks,
    payload?.driftRisks,
    payload?.failed_evidence,
    payload?.failedEvidence,
    payload?.risks,
    payload?.risk_items,
    payload?.riskItems,
  ]
  for (const candidate of candidateArrays) {
    const length = asArray(candidate).length
    if (length > 0) return length
  }
  return 0
}

export function deliveryRiskEvidence(payload: any) {
  return [
    ...asArray(payload?.missed),
    ...asArray(payload?.weak_dimensions || payload?.weakDimensions),
    ...asArray(payload?.drift_risks || payload?.driftRisks),
    ...asArray(payload?.failed_evidence || payload?.failedEvidence),
    ...asArray(payload?.risks),
    ...asArray(payload?.required_actions || payload?.requiredActions),
    ...asArray(payload?.next_actions || payload?.nextActions),
  ].flatMap((item: any) => [
    deliveryRiskItemText(item),
    deliveryRiskItemText(item?.key),
    deliveryRiskItemText(item?.evidence || item?.source_excerpt || item?.sourceExcerpt),
    deliveryRiskItemText(item?.evidence_location_risk || item?.evidenceLocationRisk),
    deliveryRiskItemText(item?.required_action || item?.requiredAction),
    deliveryRiskItemText(item?.fix || item?.repair_instruction || item?.repairInstruction),
  ]).filter(Boolean).slice(0, 8)
}

export function pendingAssetIntakeRisks(payload: any) {
  const appliedNames = new Set(
    asArray(payload?.applied_asset_names || payload?.appliedAssetNames)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean),
  )
  return asArray(payload?.discovered_assets || payload?.discoveredAssets)
    .filter((asset: any) => {
      const name = compactBriefText(asset?.name)
      if (!name) return false
      return !appliedNames.has(name)
    })
    .map((asset: any) => {
      const type = compactBriefText(asset?.entity_type || asset?.entityType || asset?.type, 'asset')
      const name = compactBriefText(asset?.name)
      const summary = compactBriefText(asset?.summary || asset?.description || asset?.detail)
      const evidence = compactBriefText(asset?.evidence || asset?.source_excerpt || asset?.sourceExcerpt)
      return {
        type,
        name,
        summary,
        evidence,
        fix: compactBriefText(`下一章必须承认新资产「${name}」已经出场；若继续使用，明确其状态、归属、限制或关系变化；若暂不使用，至少不要反向改写或当作未出现。`),
      }
    })
    .filter((asset: any) => asset.name)
    .slice(0, 8)
}

export function pendingIpSceneIntakeRisks(payload: any) {
  const source = payload?.ip_scene_intake || payload?.ipSceneIntake || payload || {}
  const appliedTitles = new Set(
    asArray(source?.applied_scene_titles || source?.appliedSceneTitles || source?.applied_titles || source?.appliedTitles)
      .map((item: any) => compactBriefText(item))
      .filter(Boolean),
  )
  return asArray(source?.ip_scene_candidates || source?.ipSceneCandidates)
    .filter((scene: any) => {
      const title = compactBriefText(scene?.title || scene?.name)
      if (!title) return false
      return !appliedTitles.has(title)
    })
    .map((scene: any) => {
      const title = compactBriefText(scene?.title || scene?.name)
      const summary = compactBriefText(scene?.summary || scene?.description || scene?.detail)
      const visualHook = compactBriefText(scene?.visual_hook || scene?.visualHook)
      const adaptationValue = compactBriefText(scene?.adaptation_value || scene?.adaptationValue)
      const spreadPoint = compactBriefText(scene?.spread_point || scene?.spreadPoint)
      const evidence = compactBriefText(scene?.evidence || scene?.source_excerpt || scene?.sourceExcerpt)
      const sourceExcerpt = compactBriefText(scene?.source_excerpt || scene?.sourceExcerpt)
      const tags = asArray(scene?.tags).map((item: any) => compactBriefText(item)).filter(Boolean)
      return {
        title,
        summary,
        visualHook,
        adaptationValue,
        spreadPoint,
        evidence,
        sourceExcerpt,
        tags,
        fix: compactBriefText(
          `下一章必须延展或回声 IP 场面「${title}」；保留${visualHook || summary || '强画面'}的视觉记忆，结合${adaptationValue || spreadPoint || '场景推进'}转成新的行动、冲突或章末钩子；不要反向改写、遗忘或机械复述上一章。`,
        ),
      }
    })
    .filter((scene: any) => scene.title)
    .slice(0, 6)
}

export function revisionReceiptRepairSegment(value: any) {
  const repairSegment = compactBriefText(value?.repair_segment || value?.repairSegment)
  if (!repairSegment) return inferDeliveryRiskReceiptRepairSegment(value)
  return inferDeliveryRiskReceiptRepairSegment({ ...(value || {}), segment: repairSegment })
}

export function revisionReceiptSegmentRisk(value: any, chapterText: any) {
  const changedEvidence = compactBriefText(value?.changed_evidence || value?.changedEvidence)
  const segment = revisionReceiptRepairSegment(value)
  if (!['opening_actions', 'middle_actions', 'ending_actions'].includes(segment)) return ''
  if (receiptEvidenceLocatedInQualityPlanSegment(changedEvidence, chapterText, segment)) return ''
  if (segment === 'opening_actions') return 'revision_receipts changed_evidence 未落在前300字。'
  if (segment === 'middle_actions') return 'revision_receipts changed_evidence 未落在中段事件推进。'
  if (segment === 'ending_actions') return 'revision_receipts changed_evidence 未落在最后300字。'
  return ''
}

export function revisionReceiptEvidenceLocationRisk(value: any, chapterText: any) {
  const changedEvidence = compactBriefText(value?.changed_evidence || value?.changedEvidence)
  if (!changedEvidence || !String(chapterText || '').trim()) return ''
  return receiptEvidenceLocatedInProse(changedEvidence, chapterText) ? '' : 'changed_evidence 无法定位到修订后正文。'
}

export function revisionReceiptSyncRisk(value: any, chapterText: any = '') {
  return revisionReceiptRemainingRisk(value)
    || revisionReceiptSegmentRisk(value, chapterText)
    || revisionReceiptEvidenceLocationRisk(value, chapterText)
}

export function proseQualityRevisionReceiptRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const revision = selfCheck?.revision || selfCheck?.revised_revision || payload?.revision || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const receipts = [
    ...asArray(revisionDeliveryReceipts?.revision_receipts || revisionDeliveryReceipts?.revisionReceipts),
    ...asArray(revision?.revision_receipts || revision?.revisionReceipts),
    ...asArray(selfCheck?.revision_receipts || selfCheck?.revisionReceipts),
    ...asArray(payload?.revision_receipts || payload?.revisionReceipts),
  ]
  return receipts
    .map((receipt: any) => {
      const risk = revisionReceiptRemainingRisk(receipt)
      if (!risk) return null
      return {
        risk,
        evidence: compactBriefText(
          receipt?.changed_evidence
          || receipt?.changedEvidence
          || receipt?.original_evidence
          || receipt?.originalEvidence
          || receipt?.applied_fix
          || receipt?.appliedFix,
        ),
      }
    })
    .filter(Boolean)
}

export function proseQualityRevisionReceiptCheckRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.revision_receipt_checks || review?.revisionReceiptChecks),
    ...asArray(selfCheck?.revision_receipt_checks || selfCheck?.revisionReceiptChecks),
    ...asArray(payload?.revision_receipt_checks || payload?.revisionReceiptChecks),
  ]
  return checks
    .filter(preDraftReceiptCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '修订回执检查')
      const requiredAction = compactBriefText(check?.required_action || check?.requiredAction || check?.action)
      const repairSegment = compactBriefText(check?.repair_segment || check?.repairSegment || check?.segment || check?.position || check?.stage)
      const appliedFix = compactBriefText(check?.applied_fix || check?.appliedFix)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      const changedEvidence = compactBriefText(check?.changed_evidence || check?.changedEvidence)
      const evidence = compactBriefText(
        check?.evidence
        || check?.original_evidence
        || check?.originalEvidence
        || check?.source_excerpt
        || check?.sourceExcerpt
        || check?.chapter_evidence
        || check?.chapterEvidence,
      )
      const remainingRisk = revisionReceiptRemainingRisk(check)
      const action = compactBriefText([
        `revision_receipt_checks.${label}`,
        requiredAction ? `required_action=${requiredAction}` : '',
        repairSegment ? `repair_segment=${repairSegment}` : '',
        appliedFix ? `applied_fix=${appliedFix}` : '',
        changedEvidence ? `changed_evidence=${changedEvidence}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !requiredAction && !repairSegment && !appliedFix && !fix && !changedEvidence && !evidence && !remainingRisk) return null
      return {
        label,
        required_action: requiredAction,
        repair_segment: repairSegment,
        applied_fix: appliedFix,
        fix,
        changed_evidence: changedEvidence,
        evidence,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityRevisionContextRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const revision = selfCheck?.revision || selfCheck?.revised_revision || payload?.revision || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts
    || revision?.ohStoryDeliveryReceipts
    || payload?.oh_story_delivery_receipts
    || payload?.ohStoryDeliveryReceipts
    || {}
  const receipts = [
    ...asArray(revisionDeliveryReceipts?.revision_context_receipts || revisionDeliveryReceipts?.revisionContextReceipts),
    ...asArray(revision?.revision_context_receipts || revision?.revisionContextReceipts),
    ...asArray(selfCheck?.revision_context_receipts || selfCheck?.revisionContextReceipts),
    ...asArray(payload?.revision_context_receipts || payload?.revisionContextReceipts),
  ]
  return receipts
    .map((receipt: any) => {
      const remainingRisk = compactBriefText(receipt?.remaining_risk || receipt?.remainingRisk || receipt?.risk)
      if (!platformCheckNeedsCarryOver(receipt) && !remainingRisk) return null
      return {
        key: compactBriefText(receipt?.key),
        label: compactBriefText(receipt?.label || receipt?.name || receipt?.title, '修订上下文'),
        evidence: compactBriefText(
          receipt?.evidence
          || receipt?.source_excerpt
          || receipt?.sourceExcerpt
          || receipt?.missing_source
          || receipt?.missingSource,
        ),
        fix: compactBriefText(
          receipt?.fix
          || receipt?.required_action
          || receipt?.requiredAction
          || receipt?.repair_instruction
          || receipt?.repairInstruction
          || remainingRisk,
        ),
      }
    })
    .filter(Boolean)
}

export function proseQualityHighSeverityFindings(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const issues = [
    ...asArray(review?.issues),
    ...asArray(review?.findings),
    ...asArray(selfCheck?.issues),
    ...asArray(selfCheck?.findings),
    ...asArray(payload?.issues),
    ...asArray(payload?.findings),
  ]
  return issues
    .map(normalizeIssue)
    .filter((issue: any) => ['S1', 'S2'].includes(String(issue.severity || '').toUpperCase()))
    .map((issue: any) => {
      const severity = String(issue.severity || '').toUpperCase()
      const category = compactBriefText(issue.category, 'quality')
      const evidence = compactBriefText(issue.evidence || issue.location || issue.issue || issue.description)
      const fix = compactBriefText(issue.fix || issue.repair_instruction || issue.suggestion || issue.issue || issue.description)
      if (!evidence && !fix) return null
      return {
        severity,
        category,
        evidence,
        fix,
      }
    })
    .filter(Boolean)
}

export function normalizeNextChapterQualityPlanEndingContract(plan: any) {
  const raw = plan?.ending_contract
    || plan?.endingContract
    || plan?.chapter_handoff_contract
    || plan?.chapterHandoffContract
    || {}
  const finalState = firstCompactText(
    raw?.final_state,
    raw?.finalState,
    plan?.final_state,
    plan?.finalState,
  )
  const unresolvedQuestion = firstCompactText(
    raw?.unresolved_question,
    raw?.unresolvedQuestion,
    raw?.open_question,
    raw?.openQuestion,
    plan?.unresolved_question,
    plan?.unresolvedQuestion,
  )
  const nextChapterPull = firstCompactText(
    raw?.next_chapter_pull,
    raw?.nextChapterPull,
    raw?.next_pull,
    raw?.nextPull,
    plan?.next_chapter_pull,
    plan?.nextChapterPull,
  )
  const handoffToNext = firstCompactText(
    raw?.handoff_to_next,
    raw?.handoffToNext,
    raw?.chapter_handoff,
    raw?.chapterHandoff,
    raw?.next_chapter_handoff,
    raw?.nextChapterHandoff,
    raw?.handoff,
    plan?.handoff_to_next,
    plan?.handoffToNext,
  )
  if (!finalState && !unresolvedQuestion && !nextChapterPull && !handoffToNext) return null
  return {
    final_state: finalState,
    unresolved_question: unresolvedQuestion,
    next_chapter_pull: nextChapterPull,
    handoff_to_next: handoffToNext,
  }
}

export function collectFallbackQualityPlanCheckTexts(review: any = {}) {
  return uniqueBriefStrings(STRUCTURED_REVIEW_CHECK_FIELDS.flatMap(([snakeField, camelField]) => {
    return asArray(review?.[snakeField] || review?.[camelField])
      .filter((check: any) => {
        const status = compactBriefText(check?.status || check?.state).toLowerCase()
        const remainingRisk = revisionReceiptRemainingRisk(check)
        return ['fail', 'failed', 'warn', 'warning', 'blocked'].includes(status) || Boolean(remainingRisk)
      })
      .flatMap((check: any) => [
        compactBriefText(check?.label || check?.key || check?.name),
        compactBriefText(check?.fix || check?.required_action || check?.requiredAction || check?.action),
        compactBriefText(check?.remaining_risk || check?.remainingRisk),
        compactBriefText(check?.evidence),
      ])
  }).filter(Boolean), 8)
}

export function compactChapterTailEvidence(chapterText: any) {
  const paragraphs = String(chapterText || '')
    .split(/\n+/)
    .map(item => compactBriefText(item))
    .filter(Boolean)
  return paragraphs.slice(-2).join('；').slice(0, 180)
}

export function buildFallbackNextChapterQualityPlan(review: any = {}, contextPackage: any = {}, chapterText = '') {
  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const carryOver = deliveryRiskCarryOverFromContext(contextPackage)
  const failedCheckTexts = collectFallbackQualityPlanCheckTexts(review)
  const deliveryRiskActions = uniqueBriefStrings(asArray(review?.delivery_risk_receipts || review?.deliveryRiskReceipts)
    .filter((receipt: any) => receipt?.delivered === false || revisionReceiptRemainingRisk(receipt))
    .flatMap((receipt: any) => [
      compactDeliveryRiskCarryOverText(receipt?.required_action || receipt?.requiredAction || receipt?.action),
      compactDeliveryRiskCarryOverText(receipt?.remaining_risk || receipt?.remainingRisk || receipt?.risk),
      compactDeliveryRiskCarryOverText(receipt?.risk_item || receipt?.riskItem || receipt?.label),
    ])
    .filter(Boolean), 8)
  const title = compactBriefText(target.title || target.chapter_title || target.chapterTitle || '下一章')
  const endingHook = compactBriefText(
    target.ending_hook
    || target.endingHook
    || target.chapter_blueprint?.ending_contract?.next_chapter_pull
    || target.chapterBlueprint?.endingContract?.nextChapterPull
    || target.summary
    || target.conflict,
  )
  const tailEvidence = compactChapterTailEvidence(chapterText)
  const qualityFocus = uniqueBriefStrings([
    ...failedCheckTexts.filter(item => /缺少|失败|未兑现|未闭环|低分|风险|自检|门禁|质量|冲突|读者|题材|对白|升级/.test(item)),
    ...deliveryRiskActions,
    endingHook ? `守住章末钩子：${endingHook}` : '',
    title ? `下一章继续服务《${title}》的章节目标。` : '',
  ], 3)
  const openingActions = uniqueBriefStrings([
    ...deliveryRiskActions.filter(item => /开篇|前300|前三百|章首|接住|承接/.test(item)),
    ...(carryOver?.opening_actions || []),
    endingHook ? `前300字直接承接章末钩子：${endingHook}` : '',
    deliveryRiskActions[0] ? `前300字把未兑现风险写成可见目标或阻碍：${deliveryRiskActions[0]}` : '',
  ], 3)
  const middleActions = uniqueBriefStrings([
    ...failedCheckTexts.filter(item => /中段|冲突|阻碍|行动|代价|信息|关系|补足|兑现|推进/.test(item)),
    ...(carryOver?.middle_actions || []),
    deliveryRiskActions[1] ? `中段把承接风险推进成行动、信息变化或代价：${deliveryRiskActions[1]}` : '',
  ], 3)
  const endingActions = uniqueBriefStrings([
    endingHook ? `最后300字把本章结果继续推向：${endingHook}` : '',
    ...(carryOver?.ending_actions || []),
    deliveryRiskActions[2] ? `章末复核承接风险是否闭环，并留下新状态：${deliveryRiskActions[2]}` : '',
  ], 3)
  const avoidRepetition = uniqueBriefStrings([
    ...(carryOver?.forbidden_repeats || []),
    '不要用旁白宣布已修复；必须用动作、对话、证据变化或章末钩子证明。',
    '不要复现连续解释设定、空泛总结、作者预告或低风险空钩子。',
  ], 3)
  const evidenceBasis = uniqueBriefStrings([
    ...deliveryRiskActions,
    ...failedCheckTexts,
    tailEvidence ? `本章尾段：${tailEvidence}` : '',
  ], 5)
  return {
    version: 'oh_story_next_chapter_quality_plan_v1',
    quality_focus: qualityFocus.length ? qualityFocus : [`下一章优先修复《${title}》的质量门禁残留。`],
    opening_actions: openingActions.length ? openingActions : [`前300字承接《${title}》上一章结尾，先给可见目标、阻碍或异常。`],
    middle_actions: middleActions.length ? middleActions : ['中段必须把目标、阻碍、行动、反馈和不可删除变化写成连续事件。'],
    ending_actions: endingActions.length ? endingActions : ['最后300字必须给出故事内新问题、新证据、代价或下一章行动压力。'],
    avoid_repetition: avoidRepetition,
    evidence_basis: evidenceBasis.length ? evidenceBasis : ['系统兜底：模型漏输出 next_chapter_quality_plan，但质量门禁要求下一章保留可执行续航计划。'],
    ending_contract: {
      final_state: tailEvidence || `《${title}》当前收束状态需要下一章开篇承接。`,
      unresolved_question: endingHook ? `《${title}》未解问题：${endingHook}` : `《${title}》仍需确认上一章残留风险如何闭环。`,
      next_chapter_pull: endingHook || deliveryRiskActions[0] || `继续修复《${title}》的质量门禁残留。`,
      handoff_to_next: openingActions[0] || `下一章前300字直接承接《${title}》的章末状态。`,
    },
  }
}

export function proseQualityNextChapterPlanRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const revision = selfCheck?.revision || selfCheck?.revised_revision || payload?.revision || payload?.revised_revision || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const reviewDeliveryReceipts = review?.oh_story_delivery_receipts || review?.ohStoryDeliveryReceipts || {}
  const payloadDeliveryReceipts = payload?.oh_story_delivery_receipts || payload?.ohStoryDeliveryReceipts || {}
  const planCandidates = [
    revision?.next_chapter_quality_plan || revision?.nextChapterQualityPlan,
    revisionDeliveryReceipts?.next_chapter_quality_plan || revisionDeliveryReceipts?.nextChapterQualityPlan,
    review?.next_chapter_quality_plan || review?.nextChapterQualityPlan,
    reviewDeliveryReceipts?.next_chapter_quality_plan || reviewDeliveryReceipts?.nextChapterQualityPlan,
    selfCheck?.next_chapter_quality_plan || selfCheck?.nextChapterQualityPlan,
    payload?.next_chapter_quality_plan || payload?.nextChapterQualityPlan,
    payloadDeliveryReceipts?.next_chapter_quality_plan || payloadDeliveryReceipts?.nextChapterQualityPlan,
  ]
  const plan = planCandidates.find((candidate: any) => candidate && typeof candidate === 'object') || null
  if (!plan) return null
  const qualityFocus = uniqueBriefStrings(asArray(plan?.quality_focus || plan?.qualityFocus).map(deliveryRiskItemText).filter(Boolean), 8)
  const openingActions = uniqueBriefStrings(asArray(plan?.opening_actions || plan?.openingActions).map(deliveryRiskItemText).filter(Boolean), 8)
  const middleActions = uniqueBriefStrings(asArray(plan?.middle_actions || plan?.middleActions).map(deliveryRiskItemText).filter(Boolean), 8)
  const endingActions = uniqueBriefStrings(asArray(plan?.ending_actions || plan?.endingActions).map(deliveryRiskItemText).filter(Boolean), 8)
  const avoidRepetition = uniqueBriefStrings(asArray(plan?.avoid_repetition || plan?.avoidRepetition).map(deliveryRiskItemText).filter(Boolean), 8)
  const evidenceBasis = uniqueBriefStrings(asArray(plan?.evidence_basis || plan?.evidenceBasis).map(deliveryRiskItemText).filter(Boolean), 8)
  const endingContract = normalizeNextChapterQualityPlanEndingContract(plan)
  const endingContractEvidence = endingContract
    ? uniqueBriefStrings([
      endingContract.final_state ? `final_state：${endingContract.final_state}` : '',
      endingContract.unresolved_question ? `unresolved_question：${endingContract.unresolved_question}` : '',
      endingContract.next_chapter_pull ? `next_chapter_pull：${endingContract.next_chapter_pull}` : '',
      endingContract.handoff_to_next ? `handoff_to_next：${endingContract.handoff_to_next}` : '',
    ], 8)
    : []
  const endingContractOpeningActions = endingContract
    ? uniqueBriefStrings([
      endingContract.final_state ? `上章最后状态：${endingContract.final_state}` : '',
      endingContract.handoff_to_next ? `章首承接：${endingContract.handoff_to_next}` : '',
      endingContract.next_chapter_pull ? `章首承接下一章推动力：${endingContract.next_chapter_pull}` : '',
    ], 8)
    : []
  const endingContractMiddleActions = endingContract
    ? uniqueBriefStrings([
      endingContract.unresolved_question ? `未解决问题：${endingContract.unresolved_question}` : '',
    ], 8)
    : []
  const endingContractEndingActions = endingContract
    ? uniqueBriefStrings([
      endingContract.next_chapter_pull ? `下一章推动力：${endingContract.next_chapter_pull}` : '',
      endingContract.handoff_to_next ? `章尾复核承接：${endingContract.handoff_to_next}` : '',
    ], 8)
    : []
  const count = qualityFocus.length
    + openingActions.length
    + middleActions.length
    + endingActions.length
    + avoidRepetition.length
    + evidenceBasis.length
    + endingContractEvidence.length
  if (count <= 0) return null
  return {
    count,
    qualityFocus,
    openingActions,
    middleActions,
    endingActions,
    avoidRepetition,
    evidenceBasis,
    endingContract,
    endingContractEvidence,
    endingContractOpeningActions,
    endingContractMiddleActions,
    endingContractEndingActions,
  }
}

export function proseQualityGateFailureRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const qualityGate = payload?.quality_gate
    || payload?.qualityGate
    || selfCheck?.quality_gate
    || selfCheck?.qualityGate
    || review?.quality_gate
    || review?.qualityGate
    || null
  const score = Number(review?.score ?? review?.quality_score ?? review?.qualityScore ?? payload?.score ?? payload?.quality_score ?? payload?.qualityScore)
  const threshold = Number(review?.quality_threshold ?? review?.qualityThreshold ?? payload?.quality_threshold ?? payload?.qualityThreshold ?? 78)
  const gateScore = Number(qualityGate?.score ?? qualityGate?.quality_score ?? qualityGate?.qualityScore)
  const gateThreshold = Number(
    qualityGate?.gate?.min_score
    ?? qualityGate?.gate?.minScore
    ?? qualityGate?.min_score
    ?? qualityGate?.minScore
    ?? qualityGate?.quality_threshold
    ?? qualityGate?.qualityThreshold
    ?? qualityGate?.threshold,
  )
  const effectiveScore = Number.isFinite(gateScore) ? gateScore : score
  const effectiveThreshold = Number.isFinite(gateThreshold) ? gateThreshold : threshold
  const qualityGateStatus = compactBriefText(qualityGate?.status || qualityGate?.state).toLowerCase()
  const qualityGateFailed = qualityGate?.passed === false
    || ['fail', 'failed', 'blocked', 'error'].includes(qualityGateStatus)
  const failed = qualityGateFailed
    || review?.passed === false
    || payload?.passed === false
    || (Number.isFinite(effectiveScore) && effectiveScore < effectiveThreshold)
  if (!failed) return []
  const issues = [
    ...asArray(review?.issues),
    ...asArray(review?.findings),
    ...asArray(selfCheck?.issues),
    ...asArray(selfCheck?.findings),
    ...asArray(payload?.issues),
    ...asArray(payload?.findings),
  ]
  const qualityGateReasonValues = [
    ...asArray(qualityGate?.reasons),
    ...asArray(qualityGate?.failed_reasons || qualityGate?.failedReasons),
    ...asArray(qualityGate?.blockers),
  ]
  const singleQualityGateReason = compactBriefText(
    qualityGate?.reason
    || qualityGate?.message
    || qualityGate?.error
    || qualityGate?.detail
    || qualityGate?.summary,
  )
  if (singleQualityGateReason) qualityGateReasonValues.push(singleQualityGateReason)
  const qualityGateReasonRows = uniqueBriefStrings(qualityGateReasonValues
    .map((reason: any) => {
      if (typeof reason === 'string') return reason
      return compactBriefText(
        reason?.reason
        || reason?.message
        || reason?.detail
        || reason?.summary
        || reason?.description
        || reason?.evidence
        || reason?.fix
        || deliveryRiskItemText(reason),
      )
    })
    .filter(Boolean), 8)
    .map((reason: string) => ({
      severity: 'quality_gate',
      category: 'quality_gate',
      evidence: reason,
      fix: `下一章必须修复质量门禁原因：${reason}`,
      score: Number.isFinite(effectiveScore) ? effectiveScore : null,
      threshold: Number.isFinite(effectiveThreshold) ? effectiveThreshold : 78,
    }))
  const issueRows = issues
    .map(normalizeIssue)
    .filter((issue: any) => {
      const severity = String(issue?.severity || '').toLowerCase()
      if (/^s\d+$/.test(severity)) return false
      if (['low', 'info', 'pass', 'ok'].includes(severity)) return false
      return compactBriefText(issue?.description || issue?.evidence || issue?.fix || issue?.suggestion)
    })
    .map((issue: any) => ({
      severity: compactBriefText(issue?.severity, 'medium'),
      category: compactBriefText(issue?.category || issue?.type, 'quality_gate'),
      evidence: compactBriefText(issue?.evidence || issue?.description),
      fix: compactBriefText(issue?.fix || issue?.suggestion || issue?.description),
      score: Number.isFinite(effectiveScore) ? effectiveScore : null,
      threshold: Number.isFinite(effectiveThreshold) ? effectiveThreshold : 78,
    }))
    .filter((issue: any) => issue.evidence || issue.fix)
  const rows = [...qualityGateReasonRows, ...issueRows]
  if (rows.length <= 0 && qualityGateFailed) {
    rows.push({
      severity: 'quality_gate',
      category: 'quality_gate',
      evidence: 'quality_gate.passed=false',
      fix: '下一章必须修复 quality_gate 未通过的结构化原因，并补齐可定位正文证据。',
      score: Number.isFinite(effectiveScore) ? effectiveScore : null,
      threshold: Number.isFinite(effectiveThreshold) ? effectiveThreshold : 78,
    })
  }
  return rows
    .slice(0, 8)
}

export function proseQualityDeliveryRiskReceiptRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || payload?.review || {}
  const receipts = [
    ...asArray(review?.delivery_risk_receipts || review?.deliveryRiskReceipts),
    ...asArray(selfCheck?.delivery_risk_receipts || selfCheck?.deliveryRiskReceipts),
    ...asArray(payload?.delivery_risk_receipts || payload?.deliveryRiskReceipts),
  ]
  return receipts
    .map((receipt: any) => {
      const risk = deliveryRiskReceiptRemainingRisk(receipt)
      if (!risk) return null
      const riskItem = compactBriefText(receipt?.risk_item || receipt?.riskItem || receipt?.item || receipt?.label)
      const requiredAction = compactBriefText(receipt?.required_action || receipt?.requiredAction || receipt?.action)
      const evidence = compactBriefText(receipt?.evidence || receipt?.changed_evidence || receipt?.changedEvidence)
      const repairSegment = inferDeliveryRiskReceiptRepairSegment(receipt)
      return {
        risk,
        risk_item: riskItem,
        required_action: requiredAction,
        evidence: evidence || requiredAction || riskItem,
        remaining_risk: risk,
        repair_segment: repairSegment,
        repair_position_rule: deliveryRiskReceiptRepairPositionRule(repairSegment),
      }
    })
    .filter(Boolean)
}

export function proseQualityReviewNeedsRevision(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const statusText = compactBriefText(review?.status || selfCheck?.status || payload?.status).toLowerCase()
  return review?.passed === false
    || review?.needs_revision === true
    || review?.needsRevision === true
    || selfCheck?.needs_revision === true
    || selfCheck?.needsRevision === true
    || ['fail', 'failed', 'warn', 'warning', 'missing', 'missed'].includes(statusText)
}

