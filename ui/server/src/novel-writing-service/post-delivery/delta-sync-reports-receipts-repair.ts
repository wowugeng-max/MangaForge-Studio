import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import {
  platformCheckNeedsCarryOver,
  preDraftReceiptCheckNeedsCarryOver,
  deliveryRiskEvidenceSearchText,
  isGenericDeliveryRiskEvidence,
} from '../quality/platform-carry-over'
import { revisionReceiptRemainingRisk } from '../quality/revision-receipt-risk'
import {
  receiptEvidenceLocatedInProse,
  receiptEvidenceLocatedInQualityPlanSegment,
} from '../quality/receipt-evidence'
import {
  contextHasNextChapterQualityPlanDebt,
  contextHasStatusFilterReceiptDebt,
} from '../quality/missing-review-checks'
import { preDraftExecutionReceiptSections } from '../quality/pre-draft-receipt-sections'
import {
  proseQualityDeslopRepairReceiptRisks,
  proseQualityDeslopRisks,
  proseQualityQualityAuditRisks,
  revisionReceiptSyncRisk,
} from '../quality/prose-quality-risks'
import { getContextContract } from '../context/context-contract'
import {
  deliveryRiskReceiptRemainingRisk,
  inferDeliveryRiskReceiptRepairSegment,
} from './delivery-risk-core'
import { normalizeStoredOhStoryDeliveryReceipts } from './delivery-risk-carry-over'
import {
  chapterReceiptProseText,
} from './delta-sync-reports-storyline'

function proseRevisionReceiptRows(selfCheck: any = {}, extraReceipts: any[] = [], chapterText = '') {
  const revision = selfCheck?.revision || selfCheck?.revised_revision || selfCheck || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const receipts = [
    ...asArray(revisionDeliveryReceipts?.revision_receipts || revisionDeliveryReceipts?.revisionReceipts),
    ...asArray(revision?.revision_receipts || revision?.revisionReceipts),
    ...asArray(selfCheck?.revision_receipts || selfCheck?.revisionReceipts),
    ...asArray(extraReceipts),
  ]
  return receipts
    .map((receipt: any) => {
      const risk = revisionReceiptSyncRisk(receipt, chapterText)
      const severity = compactBriefText(receipt?.severity || receipt?.level)
      const category = compactBriefText(receipt?.category || receipt?.type)
      const label = compactBriefText(
        [severity, category].filter(Boolean).join('｜'),
        '修订回执',
      )
      const evidence = compactBriefText(
        receipt?.changed_evidence
        || receipt?.changedEvidence
        || receipt?.applied_fix
        || receipt?.appliedFix
        || receipt?.original_evidence
        || receipt?.originalEvidence,
      )
      return {
        issue_index: Number.isFinite(Number(receipt?.issue_index ?? receipt?.issueIndex))
          ? Number(receipt?.issue_index ?? receipt?.issueIndex)
          : null,
        severity,
        category,
        label,
        text: risk,
        evidence,
        applied_fix: compactBriefText(receipt?.applied_fix || receipt?.appliedFix),
      }
    })
    .filter((item: any) => item.text)
}

function storedRevisionReceiptsFromChapter(chapter: any = {}) {
  const receipts = normalizeStoredOhStoryDeliveryReceipts(chapter?.raw_payload || chapter?.rawPayload || {})?.revision_receipts || []
  return asArray(receipts)
}

function deliveryRiskReceiptRevisionKey(receipt: any) {
  return [
    compactBriefText(receipt?.risk_item || receipt?.riskItem || receipt?.item || receipt?.label),
    compactBriefText(receipt?.required_action || receipt?.requiredAction || receipt?.action || receipt?.fix),
  ].filter(Boolean).join('｜')
}

function revisionReceiptSearchText(receipt: any) {
  return [
    receipt?.risk_item,
    receipt?.riskItem,
    receipt?.required_action,
    receipt?.requiredAction,
    receipt?.repair_segment,
    receipt?.repairSegment,
    receipt?.category,
    receipt?.type,
    receipt?.original_evidence,
    receipt?.originalEvidence,
    receipt?.applied_fix,
    receipt?.appliedFix,
    receipt?.changed_evidence,
    receipt?.changedEvidence,
  ].map((item: any) => compactBriefText(item)).filter(Boolean).join('｜')
}

function revisionReceiptMatchesDeliveryRisk(receipt: any, deliveryRiskReceipt: any) {
  const haystack = revisionReceiptSearchText(receipt)
  const riskItem = compactBriefText(deliveryRiskReceipt?.risk_item || deliveryRiskReceipt?.riskItem || deliveryRiskReceipt?.item || deliveryRiskReceipt?.label)
  const requiredAction = compactBriefText(deliveryRiskReceipt?.required_action || deliveryRiskReceipt?.requiredAction || deliveryRiskReceipt?.action || deliveryRiskReceipt?.fix)
  const repairSegment = compactBriefText(deliveryRiskReceipt?.repair_segment || deliveryRiskReceipt?.repairSegment || inferDeliveryRiskReceiptRepairSegment(deliveryRiskReceipt))
  if (requiredAction && haystack.includes(requiredAction)) return true
  if (riskItem && haystack.includes(riskItem)) return true
  return Boolean(repairSegment && haystack.includes(repairSegment) && (riskItem || requiredAction))
}

function missingDeliveryRiskRevisionReceiptRows(selfCheck: any = {}, revisionReceipts: any[] = []) {
  const review = selfCheck?.review || selfCheck?.initial_review || {}
  const failedDeliveryRiskReceipts = [
    ...asArray(review?.delivery_risk_receipts || review?.deliveryRiskReceipts),
    ...asArray(selfCheck?.delivery_risk_receipts || selfCheck?.deliveryRiskReceipts),
  ]
    .filter((receipt: any) => deliveryRiskReceiptRemainingRisk(receipt))
  return failedDeliveryRiskReceipts
    .filter((receipt: any) => !revisionReceipts.some((revisionReceipt: any) => revisionReceiptMatchesDeliveryRisk(revisionReceipt, receipt)))
    .map((receipt: any) => {
      const riskItem = compactBriefText(receipt?.risk_item || receipt?.riskItem || receipt?.item || receipt?.label, '交稿风险')
      const requiredAction = compactBriefText(receipt?.required_action || receipt?.requiredAction || receipt?.action || receipt?.fix)
      const repairSegment = compactBriefText(receipt?.repair_segment || receipt?.repairSegment || inferDeliveryRiskReceiptRepairSegment(receipt))
      const remainingRisk = deliveryRiskReceiptRemainingRisk(receipt)
      return {
        issue_index: null,
        severity: 'S2',
        category: 'delivery_risk_receipt',
        label: '交稿风险修订回执缺失',
        text: `缺少对应交稿风险修订回执：${deliveryRiskReceiptRevisionKey(receipt) || riskItem}`,
        evidence: [repairSegment, remainingRisk, compactBriefText(receipt?.evidence)].filter(Boolean).join('｜'),
        applied_fix: '',
      }
    })
}

export function buildDeslopRepairReceiptSyncReport(chapter: any, selfCheck: any = {}) {
  const revision = selfCheck?.revision || selfCheck?.revised_revision || selfCheck || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const chapterText = chapterReceiptProseText(chapter)
  const allReceipts = [
    ...asArray(revisionDeliveryReceipts?.deslop_repair_receipts || revisionDeliveryReceipts?.deslopRepairReceipts),
    ...asArray(revision?.deslop_repair_receipts || revision?.deslopRepairReceipts),
    ...asArray(selfCheck?.deslop_repair_receipts || selfCheck?.deslopRepairReceipts),
  ]
  const deslopRisks = proseQualityDeslopRisks({ self_check: selfCheck })
  const missingReceiptsAfterRepair = Boolean(selfCheck?.revised || revision?.revised) && deslopRisks.length > 0 && allReceipts.length === 0
  const residualRisks = proseQualityDeslopRepairReceiptRisks({ self_check: selfCheck }, chapterText)
  const missed = missingReceiptsAfterRepair
    ? [{
        gate: 'Gate A-G',
        label: '去AI味修复回执未生成',
        text: '本章已执行去AI味修复，但没有生成逐项 deslop_repair_receipts，无法确认 Gate A-G 是否逐项闭环。',
        evidence: deslopRisks
          .map((item: any) => [item.gate, item.pattern || item.label, item.evidence || item.fix].filter(Boolean).join('｜'))
          .filter(Boolean)
          .slice(0, 5)
          .join('；') || 'deslop_repair_receipts 为空',
        risk: '缺少去AI味修复回执',
      }]
    : residualRisks.map((item: any) => ({
        gate: item.gate,
        label: item.label,
        text: item.risk,
        evidence: item.evidence,
        risk: item.risk,
      }))
  const status = missed.length > 0 ? 'warn' : 'ok'
  return {
    report_id: `deslop-repair-receipt-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: allReceipts.length === 0
      ? missingReceiptsAfterRepair ? '去AI味修复回执未生成' : '去AI味修复未触发'
      : status === 'ok' ? '去AI味修复回执 OK' : `去AI味修复回执残留 ${missed.length}`,
    summary: allReceipts.length === 0
      ? missingReceiptsAfterRepair
        ? '本章存在去AI味门禁缺口且已执行修订，但没有生成逐项去AI味修复回执。'
        : '本章没有触发需要闭环的去AI味修复回执。'
      : status === 'ok'
        ? '本章去AI味修复回执没有残留风险。'
        : `去AI味修复后仍有 ${missed.length} 项残留风险需要继续处理。`,
    receipt_count: allReceipts.length,
    missed_count: missed.length,
    completed_count: Math.max(0, allReceipts.length - missed.length),
    missed,
    completed: allReceipts.length > missed.length ? allReceipts.filter((receipt: any) => !revisionReceiptSyncRisk(receipt, chapterText)).slice(0, 20) : [],
    next_actions: status === 'ok'
      ? ['保持 deslop_repair_receipts 逐条对应 Gate A-G 缺口，changed_evidence 必须引用修订后的具体正文。']
      : missingReceiptsAfterRepair
        ? [
          '重新复核去AI味修复结果，必须输出 deslop_repair_receipts。',
          'deslop_repair_receipts 要逐条对应 deslop_checks 或 deslop_gate_diagnostics 的失败项，并引用 changed_evidence。',
        ]
        : [
          '下一轮修订只补仍残留的 Gate A-G 风险，不要重写整章。',
          '残留项必须改成可见动作、对白、场景后果或信息推进，并在新回执中给出 changed_evidence。',
        ],
  }
}

export function buildQualityAuditRepairReceiptSyncReport(chapter: any, selfCheck: any = {}) {
  const revision = selfCheck?.revision || selfCheck?.revised_revision || selfCheck || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const chapterText = chapterReceiptProseText(chapter)
  const allReceipts = [
    ...asArray(revisionDeliveryReceipts?.quality_audit_repair_receipts || revisionDeliveryReceipts?.qualityAuditRepairReceipts),
    ...asArray(revision?.quality_audit_repair_receipts || revision?.qualityAuditRepairReceipts),
    ...asArray(selfCheck?.quality_audit_repair_receipts || selfCheck?.qualityAuditRepairReceipts),
  ]
  const qualityAuditRisks = proseQualityQualityAuditRisks({ self_check: selfCheck })
  const missingReceiptsAfterRepair = Boolean(selfCheck?.revised || revision?.revised) && qualityAuditRisks.length > 0 && allReceipts.length === 0
  const residualRisks = allReceipts
    .map((receipt: any) => {
      const risk = revisionReceiptSyncRisk(receipt, chapterText)
      if (!risk) return null
      return {
        check_key: compactBriefText(receipt?.check_key || receipt?.checkKey || receipt?.key),
        label: compactBriefText(receipt?.label || receipt?.name, '质量诊断修复回执'),
        text: risk,
        evidence: compactBriefText(
          receipt?.changed_evidence
          || receipt?.changedEvidence
          || receipt?.applied_fix
          || receipt?.appliedFix
          || receipt?.original_evidence
          || receipt?.originalEvidence,
        ),
        risk,
      }
    })
    .filter(Boolean)
  const missed = missingReceiptsAfterRepair
    ? [{
        check_key: '',
        label: '质量诊断修复回执未生成',
        text: '本章已执行质量诊断修复，但没有生成逐项 quality_audit_repair_receipts，无法确认质量诊断缺口是否逐项闭环。',
        evidence: qualityAuditRisks
          .map((item: any) => [item.label, item.evidence || item.fix].filter(Boolean).join('｜'))
          .filter(Boolean)
          .slice(0, 5)
          .join('；') || 'quality_audit_repair_receipts 为空',
        risk: '缺少质量诊断修复回执',
      }]
    : residualRisks
  const status = missed.length > 0 ? 'warn' : 'ok'
  return {
    report_id: `quality-audit-repair-receipt-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: allReceipts.length === 0
      ? missingReceiptsAfterRepair ? '质量诊断修复回执未生成' : '质量诊断修复未触发'
      : status === 'ok' ? '质量诊断修复回执 OK' : `质量诊断修复回执残留 ${missed.length}`,
    summary: allReceipts.length === 0
      ? missingReceiptsAfterRepair
        ? '本章存在质量诊断缺口且已执行修订，但没有生成逐项质量诊断修复回执。'
        : '本章没有触发需要闭环的质量诊断修复回执。'
      : status === 'ok'
        ? '本章质量诊断修复回执没有残留风险。'
        : `质量诊断修复后仍有 ${missed.length} 项残留风险需要继续处理。`,
    receipt_count: allReceipts.length,
    missed_count: missed.length,
    completed_count: Math.max(0, allReceipts.length - missed.length),
    missed,
    completed: allReceipts.length > missed.length ? allReceipts.filter((receipt: any) => !revisionReceiptSyncRisk(receipt, chapterText)).slice(0, 20) : [],
    next_actions: status === 'ok'
      ? ['保持 quality_audit_repair_receipts 逐条对应 quality_audit_checks 缺口，changed_evidence 必须引用修订后的具体正文。']
      : missingReceiptsAfterRepair
        ? [
          '重新复核质量诊断修复结果，必须输出 quality_audit_repair_receipts。',
          'quality_audit_repair_receipts 要逐条对应 quality_audit_checks 中 status=fail/warn 的诊断项，并引用 changed_evidence。',
        ]
        : [
          '下一轮修订只补仍残留的质量诊断风险，不要重写整章。',
          '残留项必须改成可见局势变化、目的词详略、信息跟冲突走或卖点隐性展示，并在新回执中给出 changed_evidence。',
        ],
  }
}

