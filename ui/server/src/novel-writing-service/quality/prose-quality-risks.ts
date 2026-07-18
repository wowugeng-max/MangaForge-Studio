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

export function proseQualityRevisionDirectiveRisks(payload: any) {
  if (!proseQualityReviewNeedsRevision(payload)) return []
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  return uniqueBriefStrings([
    ...asArray(review?.revision_directives || review?.revisionDirectives),
    ...asArray(selfCheck?.revision_directives || selfCheck?.revisionDirectives),
    ...asArray(payload?.revision_directives || payload?.revisionDirectives),
  ], 8)
}

export function proseQualityFocusedRevisionModeRisks(payload: any) {
  if (!proseQualityReviewNeedsRevision(payload)) return []
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  return uniqueBriefStrings([
    ...asArray(review?.focused_revision_modes || review?.focusedRevisionModes),
    ...asArray(selfCheck?.focused_revision_modes || selfCheck?.focusedRevisionModes),
    ...asArray(payload?.focused_revision_modes || payload?.focusedRevisionModes),
  ], 8).map((mode: any) => {
    const key = compactBriefText(mode)
    const spec = OH_STORY_FOCUSED_REVISION_MODE_SPECS[key] || {
      label: key,
      fix: `定向修订 ${key}：按自检要求修复上一章遗留的正文质量模式，下一章写作时不得复现同类问题。`,
    }
    return {
      mode: key,
      label: compactBriefText(spec.label, key),
      fix: compactBriefText(spec.fix),
    }
  }).filter((item: any) => item.mode || item.fix)
}

export function proseQualityCraftMetricRisks(payload: any) {
  if (!proseQualityReviewNeedsRevision(payload)) return []
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  return normalizeCraftMetricRisks(
    review?.craft_metrics
    || review?.craftMetrics
    || review?.craft_metric_scores
    || review?.craftMetricScores
    || selfCheck?.craft_metrics
    || selfCheck?.craftMetrics
    || payload?.craft_metrics
    || payload?.craftMetrics,
  )
}

export function proseQualitySettingViolationRisks(payload: any) {
  if (!proseQualityReviewNeedsRevision(payload)) return []
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  return normalizeSettingViolationRisks(
    review?.setting_violations
    || review?.settingViolations
    || selfCheck?.setting_violations
    || selfCheck?.settingViolations
    || payload?.setting_violations
    || payload?.settingViolations,
  )
}

export function proseQualityDeslopRepairReceiptRisks(payload: any, chapterText = '') {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const revision = selfCheck?.revision || selfCheck?.revised_revision || payload?.revision || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const receipts = [
    ...asArray(revisionDeliveryReceipts?.deslop_repair_receipts || revisionDeliveryReceipts?.deslopRepairReceipts),
    ...asArray(revision?.deslop_repair_receipts || revision?.deslopRepairReceipts),
    ...asArray(selfCheck?.deslop_repair_receipts || selfCheck?.deslopRepairReceipts),
    ...asArray(payload?.deslop_repair_receipts || payload?.deslopRepairReceipts),
  ]
  return receipts
    .map((receipt: any) => {
      const risk = revisionReceiptSyncRisk(receipt, chapterText)
      if (!risk) return null
      const gate = compactBriefText(receipt?.gate || receipt?.key || receipt?.name, 'Gate A-G')
      const label = compactBriefText(receipt?.label || receipt?.pattern || receipt?.issue, '去AI味残留')
      const evidence = compactBriefText(
        receipt?.changed_evidence
        || receipt?.changedEvidence
        || receipt?.original_evidence
        || receipt?.originalEvidence
        || receipt?.applied_fix
        || receipt?.appliedFix,
      )
      return {
        risk,
        evidence,
        gate,
        label,
      }
    })
    .filter(Boolean)
}

export function proseQualityDeslopRepairCheckRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.deslop_repair_checks || review?.deslopRepairChecks),
    ...asArray(selfCheck?.deslop_repair_checks || selfCheck?.deslopRepairChecks),
    ...asArray(payload?.deslop_repair_checks || payload?.deslopRepairChecks),
  ]
  return checks
    .filter((check: any) => preDraftReceiptCheckNeedsCarryOver(check) || check?.receipt_synced === false || check?.receiptSynced === false)
    .map((check: any) => {
      const rawGate = compactBriefText(check?.gate || check?.key)
      const gate = rawGate ? (/^gate\s+/i.test(rawGate) ? rawGate : `Gate ${rawGate}`) : 'Gate A-G'
      const label = compactBriefText(check?.label || check?.pattern || check?.issue || check?.name, '去AI味闭环')
      const originalRisk = compactBriefText(check?.original_risk || check?.originalRisk || check?.risk || check?.evidence || check?.issue)
      const rewrittenEvidence = compactBriefText(check?.rewritten_evidence || check?.rewrittenEvidence || check?.delivered_evidence || check?.deliveredEvidence)
      const changedEvidence = compactBriefText(check?.changed_evidence || check?.changedEvidence)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.required_action || check?.requiredAction || check?.suggestion)
      const remainingRisk = revisionReceiptRemainingRisk(check)
      const receiptSynced = check?.receipt_synced === false || check?.receiptSynced === false
        ? 'receipt_synced=false'
        : ''
      const action = compactBriefText([
        `deslop_repair_checks.${label}`,
        gate,
        receiptSynced,
        originalRisk ? `original_risk=${originalRisk}` : '',
        rewrittenEvidence ? `rewritten_evidence=${rewrittenEvidence}` : '',
        changedEvidence ? `changed_evidence=${changedEvidence}` : '',
        fix || remainingRisk,
      ].filter(Boolean).join('；'))
      if (!label && !gate && !originalRisk && !rewrittenEvidence && !changedEvidence && !fix && !remainingRisk && !receiptSynced) return null
      return {
        gate,
        label,
        original_risk: originalRisk,
        rewritten_evidence: rewrittenEvidence,
        changed_evidence: changedEvidence,
        fix,
        remaining_risk: remainingRisk,
        receipt_synced: receiptSynced,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityAuditRepairReceiptRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const revision = selfCheck?.revision || selfCheck?.revised_revision || payload?.revision || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const receipts = [
    ...asArray(revisionDeliveryReceipts?.quality_audit_repair_receipts || revisionDeliveryReceipts?.qualityAuditRepairReceipts),
    ...asArray(revision?.quality_audit_repair_receipts || revision?.qualityAuditRepairReceipts),
    ...asArray(selfCheck?.quality_audit_repair_receipts || selfCheck?.qualityAuditRepairReceipts),
    ...asArray(payload?.quality_audit_repair_receipts || payload?.qualityAuditRepairReceipts),
  ]
  return receipts
    .map((receipt: any) => {
      const risk = revisionReceiptRemainingRisk(receipt)
      if (!risk) return null
      const checkKey = compactBriefText(receipt?.check_key || receipt?.checkKey || receipt?.key)
      const label = compactBriefText(receipt?.label || receipt?.name, '质量诊断残留')
      const evidence = compactBriefText(
        receipt?.changed_evidence
        || receipt?.changedEvidence
        || receipt?.original_evidence
        || receipt?.originalEvidence
        || receipt?.applied_fix
        || receipt?.appliedFix,
      )
      return {
        risk,
        evidence,
        check_key: checkKey,
        label,
        strategy: compactBriefText(receipt?.strategy),
      }
    })
    .filter(Boolean)
}



export function proseQualityPlatformRubricRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.platform_checks || review?.platformChecks),
    ...asArray(selfCheck?.platform_checks || selfCheck?.platformChecks),
    ...asArray(payload?.platform_checks || payload?.platformChecks),
  ]
  return checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '平台检查')
      const checkKey = compactBriefText(check?.key || check?.field || check?.name)
      const platform = compactBriefText(check?.platform || check?.rubric || review?.rubric || selfCheck?.rubric || payload?.rubric)
      const openingPace = compactBriefText(check?.opening_pace || check?.openingPace)
      const payoffDensity = compactBriefText(check?.payoff_density || check?.payoffDensity)
      const readerExpectation = compactBriefText(check?.reader_expectation || check?.readerExpectation)
      const pageTurnPull = compactBriefText(check?.page_turn_pull || check?.pageTurnPull)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `platform_checks.${label}`,
        checkKey ? `key=${checkKey}` : '',
        platform ? `platform=${platform}` : '',
        openingPace ? `opening_pace=${openingPace}` : '',
        payoffDensity ? `payoff_density=${payoffDensity}` : '',
        readerExpectation ? `reader_expectation=${readerExpectation}` : '',
        pageTurnPull ? `page_turn_pull=${pageTurnPull}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !checkKey && !platform && !openingPace && !payoffDensity && !readerExpectation && !pageTurnPull && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        key: checkKey,
        platform,
        opening_pace: openingPace,
        payoff_density: payoffDensity,
        reader_expectation: readerExpectation,
        page_turn_pull: pageTurnPull,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityContentRubricRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.content_rubric_checks || review?.contentRubricChecks),
    ...asArray(selfCheck?.content_rubric_checks || selfCheck?.contentRubricChecks),
    ...asArray(payload?.content_rubric_checks || payload?.contentRubricChecks),
  ]
  return checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '内容基准')
      const coreSellingPoint = compactBriefText(check?.core_selling_point || check?.coreSellingPoint)
      const conflictProgression = compactBriefText(check?.conflict_progression || check?.conflictProgression)
      const chapterChange = compactBriefText(check?.chapter_change || check?.chapterChange)
      const pageTurnReason = compactBriefText(check?.page_turn_reason || check?.pageTurnReason)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion || remainingRisk)
      const action = compactBriefText([
        `content_rubric_checks.${label}`,
        coreSellingPoint ? `core_selling_point=${coreSellingPoint}` : '',
        conflictProgression ? `conflict_progression=${conflictProgression}` : '',
        chapterChange ? `chapter_change=${chapterChange}` : '',
        pageTurnReason ? `page_turn_reason=${pageTurnReason}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !coreSellingPoint && !conflictProgression && !chapterChange && !pageTurnReason && !evidence && !fix && !remainingRisk) return null
      return {
        label,
        core_selling_point: coreSellingPoint,
        conflict_progression: conflictProgression,
        chapter_change: chapterChange,
        page_turn_reason: pageTurnReason,
        evidence,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityTitleUniquenessRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.title_uniqueness_checks || review?.titleUniquenessChecks),
    ...asArray(selfCheck?.title_uniqueness_checks || selfCheck?.titleUniquenessChecks),
    ...asArray(payload?.title_uniqueness_checks || payload?.titleUniquenessChecks),
  ]
  return checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '标题唯一性')
      const oldTitle = compactBriefText(check?.old_title || check?.oldTitle)
      const newTitle = compactBriefText(check?.new_title || check?.newTitle)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      const syncGaps = [
        check?.outline_title_synced === false || check?.outlineTitleSynced === false ? '同步大纲标题' : '',
        check?.file_name_synced === false || check?.fileNameSynced === false ? '同步文件名' : '',
        check?.chapter_title_line_synced === false || check?.chapterTitleLineSynced === false ? '同步正文标题行' : '',
      ].filter(Boolean).join('、')
      const action = compactBriefText([
        `chapter_title_uniqueness_sync.title_uniqueness_checks.${label}`,
        oldTitle ? `旧标题：${oldTitle}` : '',
        newTitle ? `新标题：${newTitle}` : '',
        syncGaps,
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !oldTitle && !newTitle && !evidence && !remainingRisk && !fix) return null
      return {
        label,
        old_title: oldTitle,
        new_title: newTitle,
        evidence,
        remaining_risk: remainingRisk,
        fix,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityBlueprintConsumptionRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.blueprint_consumption_checks || review?.blueprintConsumptionChecks),
    ...asArray(selfCheck?.blueprint_consumption_checks || selfCheck?.blueprintConsumptionChecks),
    ...asArray(payload?.blueprint_consumption_checks || payload?.blueprintConsumptionChecks),
  ]
  return checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '细纲兑现')
      const blueprintField = compactBriefText(check?.blueprint_field || check?.blueprintField)
      const expected = compactBriefText(check?.expected || check?.target || check?.requirement)
      const deliveredEvidence = compactBriefText(check?.delivered_evidence || check?.deliveredEvidence || check?.evidence)
      const missingGap = compactBriefText(check?.missing_gap || check?.missingGap || check?.issue || check?.reason)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const action = compactBriefText([
        `blueprint_consumption_checks.${label}`,
        blueprintField ? `blueprint_field=${blueprintField}` : '',
        expected ? `expected=${expected}` : '',
        missingGap ? `missing_gap=${missingGap}` : '',
        fix || remainingRisk || deliveredEvidence,
      ].filter(Boolean).join('；'))
      if (!label && !blueprintField && !expected && !deliveredEvidence && !missingGap && !fix && !remainingRisk) return null
      return {
        label,
        blueprint_field: blueprintField,
        expected,
        delivered_evidence: deliveredEvidence,
        missing_gap: missingGap,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityWordCountRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.word_count_checks || review?.wordCountChecks),
    ...asArray(selfCheck?.word_count_checks || selfCheck?.wordCountChecks),
    ...asArray(payload?.word_count_checks || payload?.wordCountChecks),
  ]
  return checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '字数执行')
      const currentCount = Number(check?.current_count ?? check?.currentCount)
      const targetCount = Number(check?.target_count ?? check?.targetCount)
      const minRequiredCount = Number(check?.min_required_count ?? check?.minRequiredCount)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      const countParts = [
        Number.isFinite(currentCount) ? `current_count=${currentCount}` : '',
        Number.isFinite(targetCount) ? `target_count=${targetCount}` : '',
        Number.isFinite(minRequiredCount) ? `min_required_count=${minRequiredCount}` : '',
      ].filter(Boolean)
      const action = compactBriefText([
        `word_count_checks.${label}`,
        ...countParts,
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !countParts.length && !evidence && !remainingRisk && !fix) return null
      return {
        label,
        current_count: Number.isFinite(currentCount) ? currentCount : null,
        target_count: Number.isFinite(targetCount) ? targetCount : null,
        min_required_count: Number.isFinite(minRequiredCount) ? minRequiredCount : null,
        evidence,
        remaining_risk: remainingRisk,
        fix,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityBannedWordRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.banned_words_checks || review?.bannedWordsChecks),
    ...asArray(selfCheck?.banned_words_checks || selfCheck?.bannedWordsChecks),
    ...asArray(payload?.banned_words_checks || payload?.bannedWordsChecks),
  ]
  return checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '禁用词')
      const matchedWord = compactBriefText(check?.matched_word || check?.matchedWord)
      const level = compactBriefText(check?.level || check?.severity)
      const location = compactBriefText(check?.location || check?.position)
      const replacement = compactBriefText(check?.replacement || check?.rewrite || check?.suggestion)
      const evidence = compactBriefText(check?.evidence || check?.issue || check?.reason || check?.description)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction)
      const action = compactBriefText([
        `banned_words_checks.${label}`,
        matchedWord ? `matched_word=${matchedWord}` : '',
        level ? `level=${level}` : '',
        location ? `location=${location}` : '',
        replacement ? `replacement=${replacement}` : '',
        fix || remainingRisk || evidence,
      ].filter(Boolean).join('；'))
      if (!label && !matchedWord && !level && !location && !replacement && !evidence && !remainingRisk && !fix) return null
      return {
        label,
        matched_word: matchedWord,
        level,
        location,
        replacement,
        evidence,
        remaining_risk: remainingRisk,
        fix,
        action,
      }
    })
    .filter(Boolean)
}

export function proseQualityChapterBenchmarkRisks(payload: any) {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || selfCheck?.initial_review || payload?.review || payload || {}
  const checks = [
    ...asArray(review?.chapter_benchmark_checks || review?.chapterBenchmarkChecks),
    ...asArray(selfCheck?.chapter_benchmark_checks || selfCheck?.chapterBenchmarkChecks),
    ...asArray(payload?.chapter_benchmark_checks || payload?.chapterBenchmarkChecks),
  ]
  return checks
    .filter(platformCheckNeedsCarryOver)
    .map((check: any) => {
      const label = compactBriefText(check?.label || check?.key || check?.name, '章节基准')
      const benchmarkDimension = compactBriefText(check?.benchmark_dimension || check?.benchmarkDimension)
      const expectedMethod = compactBriefText(check?.expected_method || check?.expectedMethod || check?.expected)
      const deliveredEvidence = compactBriefText(check?.delivered_evidence || check?.deliveredEvidence || check?.evidence)
      const originalityGuard = compactBriefText(check?.originality_guard || check?.originalityGuard)
      const fix = compactBriefText(check?.fix || check?.repair_instruction || check?.repairInstruction || check?.suggestion)
      const remainingRisk = compactBriefText(check?.remaining_risk || check?.remainingRisk)
      const action = compactBriefText([
        `chapter_benchmark_checks.${label}`,
        benchmarkDimension ? `benchmark_dimension=${benchmarkDimension}` : '',
        expectedMethod ? `expected_method=${expectedMethod}` : '',
        originalityGuard,
        fix || remainingRisk || deliveredEvidence,
      ].filter(Boolean).join('；'))
      if (!label && !benchmarkDimension && !expectedMethod && !deliveredEvidence && !originalityGuard && !fix && !remainingRisk) return null
      return {
        label,
        benchmark_dimension: benchmarkDimension,
        expected_method: expectedMethod,
        delivered_evidence: deliveredEvidence,
        originality_guard: originalityGuard,
        fix,
        remaining_risk: remainingRisk,
        action,
      }
    })
    .filter(Boolean)
}

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
