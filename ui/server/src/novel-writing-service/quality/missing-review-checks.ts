import { asArray } from '../../routes/novel-route-utils'
import { getContextContract } from '../context/context-contract'

export function appendMissingContractReviewCheck(
  checks: any[] = [],
  contract: any,
  checkField: string,
  contractField: string,
  label: string,
  options: { emit_missing_check?: boolean } = {},
) {
  const existing = asArray(checks)
  if (options.emit_missing_check === false) return existing
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) return existing
  if (existing.length > 0) return existing
  return [
    {
      key: `missing_${checkField}`,
      label: `缺少${label}自检`,
      status: 'fail',
      evidence: `chapter_target.${contractField} 存在，但模型没有输出 ${checkField}。`,
      fix: `按 chapter_target.${contractField} 补充 ${checkField}，逐项给出 status/evidence/fix。`,
    },
  ]
}

export function appendMissingStatusFilterReceiptCheck(
  checks: any[] = [],
  stateTrackingContract: any,
  statusFilterReceipts: any[] = [],
) {
  const existing = asArray(checks)
  if (!stateTrackingContract || typeof stateTrackingContract !== 'object' || Array.isArray(stateTrackingContract)) return existing
  if (asArray(statusFilterReceipts).length > 0) return existing
  if (existing.some(item => String(item?.key || '') === 'missing_status_filter_receipts')) return existing
  return [
    ...existing,
    {
      key: 'missing_status_filter_receipts',
      label: '缺少状态筛选回执',
      status: 'fail',
      evidence: 'chapter_target.state_tracking_contract 存在，但模型没有输出 oh_story_delivery_receipts.pre_draft_execution_receipts.status_filter_receipts。',
      fix: '按状态筛选合同补充 status_filter_receipts；每项必须包含 key、label、used_in_chapter、evidence、excluded_reason、remaining_risk，说明该状态是否影响本章正确性。',
    },
  ]
}

export function contextHasNextChapterQualityPlanDebt(contextPackage: any = {}) {
  return Boolean(
    contextPackage?.chapter_target?.delivery_risk_carry_over
    || contextPackage?.chapterTarget?.delivery_risk_carry_over
    || contextPackage?.chapterTarget?.deliveryRiskCarryOver
    || contextPackage?.delivery_risk_carry_over
    || contextPackage?.deliveryRiskCarryOver
    || contextPackage?.batch_preflight?.delivery_risk_carry_over
    || contextPackage?.batchPreflight?.delivery_risk_carry_over
    || contextPackage?.batchPreflight?.deliveryRiskCarryOver
    || contextPackage?.pre_draft_brief?.delivery_risk_carry_over
    || contextPackage?.preDraftBrief?.deliveryRiskCarryOver
  )
}

export function contextHasStatusFilterReceiptDebt(contextPackage: any = {}) {
  const contract = getContextContract(contextPackage, 'state_tracking_contract')
  return Boolean(contract && typeof contract === 'object' && !Array.isArray(contract) && Object.keys(contract).length > 0)
}

export function appendMissingNextChapterQualityPlanReceiptCheck(
  checks: any[] = [],
  contextPackage: any = {},
) {
  const existing = asArray(checks)
  if (!contextHasNextChapterQualityPlanDebt(contextPackage)) return existing
  if (existing.length > 0) return existing
  return [
    {
      key: 'missing_next_chapter_quality_plan_receipts',
      label: '缺少质量续航回执',
      status: 'fail',
      evidence: 'chapter_target.delivery_risk_carry_over 或 batch_preflight.delivery_risk_carry_over 存在，但模型没有输出 oh_story_delivery_receipts.pre_draft_execution_receipts.next_chapter_quality_plan_receipts。',
      fix: '按上一章 next_chapter_quality_plan 和 delivery_risk_carry_over 补充 next_chapter_quality_plan_receipts；逐项证明 quality_focus、opening_actions、middle_actions、ending_actions、avoid_repetition 和 evidence_basis 是否已落成正文证据。',
    },
  ]
}
