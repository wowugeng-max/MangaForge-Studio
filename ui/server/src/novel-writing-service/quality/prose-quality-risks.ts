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
