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

export function buildProseRevisionReceiptSyncReport(chapter: any, selfCheck: any = {}) {
  const revision = selfCheck?.revision || selfCheck?.revised_revision || selfCheck || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const storedReceipts = storedRevisionReceiptsFromChapter(chapter)
  const chapterText = chapterReceiptProseText(chapter)
  const allReceipts = [
    ...asArray(revisionDeliveryReceipts?.revision_receipts || revisionDeliveryReceipts?.revisionReceipts),
    ...asArray(revision?.revision_receipts || revision?.revisionReceipts),
    ...asArray(selfCheck?.revision_receipts || selfCheck?.revisionReceipts),
    ...storedReceipts,
  ]
  const missingReceiptsAfterRevision = Boolean(selfCheck?.revised || revision?.revised) && allReceipts.length === 0
  const receiptResiduals = missingReceiptsAfterRevision
    ? [{
        issue_index: null,
        severity: 'S2',
        category: 'revision_receipt',
        label: '修订回执未生成',
        text: '本章已执行修订，但没有生成逐项 revision_receipts，无法确认修订是否逐条闭环。',
        evidence: 'revision_receipts 为空',
        applied_fix: '',
      }]
    : proseRevisionReceiptRows(selfCheck, storedReceipts, chapterText)
  const missingDeliveryRiskReceipts = missingDeliveryRiskRevisionReceiptRows(selfCheck, allReceipts)
  const missed = [...receiptResiduals, ...missingDeliveryRiskReceipts]
  const status = missed.length > 0 ? 'warn' : 'ok'
  const nextActions = status === 'ok'
    ? ['保持修订回执逐条对应自检 issues，changed_evidence 必须引用修订后的具体正文。']
    : missingReceiptsAfterRevision
      ? [
        '重新执行修订或复核修订结果，必须输出 revision_receipts。',
        'revision_receipts 要逐条对应自检 issues、delivery_risk_receipts 或确定性检查缺口，并引用 changed_evidence。',
      ]
      : [
        missingDeliveryRiskReceipts.length > 0
          ? '补齐 delivery_risk_receipts 对应的 revision_receipts；每条必须写 required_action、repair_segment、applied_fix 和 changed_evidence。'
          : '',
        '下一章或下一轮修订只补修订后仍残留的风险，不要重写整章。',
        '残留项必须用动作、对白、场景后果或状态写回解决，并在新回执中给出 changed_evidence。',
      ].filter(Boolean)
  return {
    report_id: `prose-revision-receipt-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: allReceipts.length === 0 ? '修订回执未生成' : status === 'ok' ? '修订回执 OK' : `修订回执残留 ${missed.length}`,
    summary: allReceipts.length === 0
      ? '本章没有生成逐项修订回执，无法确认修订是否逐条闭环。'
      : status === 'ok'
        ? '本章修订回执没有残留风险。'
        : `修订后仍有 ${missed.length} 项残留风险需要下一轮写作或修订优先处理。`,
    receipt_count: allReceipts.length,
    missed_count: missed.length,
    completed_count: Math.max(0, allReceipts.length - missed.length),
    missed,
    completed: allReceipts.length > missed.length ? allReceipts.filter((receipt: any) => !revisionReceiptSyncRisk(receipt, chapterText)).slice(0, 20) : [],
    next_actions: nextActions,
  }
}

function revisionContextReceiptRows(selfCheck: any = {}) {
  const revision = selfCheck?.revision || selfCheck?.revised_revision || selfCheck || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  return [
    ...asArray(revisionDeliveryReceipts?.revision_context_receipts || revisionDeliveryReceipts?.revisionContextReceipts),
    ...asArray(revision?.revision_context_receipts || revision?.revisionContextReceipts),
    ...asArray(selfCheck?.revision_context_receipts || selfCheck?.revisionContextReceipts),
  ]
}

const REVISION_CONTEXT_RECEIPT_REQUIRED_FIELDS = ['key', 'label', 'status', 'evidence', 'fix', 'source_excerpt']

function revisionContextReceiptMissingFields(receipt: any) {
  const value = receipt || {}
  return REVISION_CONTEXT_RECEIPT_REQUIRED_FIELDS.filter(field => {
    if (field === 'source_excerpt') return !compactBriefText(value.source_excerpt || value.sourceExcerpt)
    return !compactBriefText(value[field])
  })
}

export function buildRevisionContextReceiptSyncReport(chapter: any, selfCheck: any = {}) {
  const revision = selfCheck?.revision || selfCheck?.revised_revision || selfCheck || {}
  const allReceipts = revisionContextReceiptRows(selfCheck)
  const revised = Boolean(selfCheck?.revised || revision?.revised || allReceipts.length > 0)
  const missingReceiptsAfterRevision = revised && allReceipts.length === 0
  const missed = missingReceiptsAfterRevision
    ? [{
        key: 'missing_revision_context_receipts',
        label: '修订上下文回执未生成',
        evidence: 'revision_context_receipts 为空',
        fix: '修订后必须逐项输出 previous_chapter、next_chapter、foreshadowing、character_cards、timeline、setting_context 等上下文核对结果。',
      }]
    : allReceipts
      .map((receipt: any) => {
        const remainingRisk = compactBriefText(receipt?.remaining_risk || receipt?.remainingRisk || receipt?.risk)
        const statusText = String(receipt?.status || '').toLowerCase()
        const missingFields = revisionContextReceiptMissingFields(receipt)
        const needsRepair = platformCheckNeedsCarryOver(receipt)
          || Boolean(remainingRisk)
          || ['warn', 'warning', 'fail', 'failed', 'error', 'blocked'].includes(statusText)
          || missingFields.length > 0
        if (!needsRepair) return null
        const missingFieldText = missingFields.length > 0 ? `缺少字段：${missingFields.join(', ')}` : ''
        const receiptEvidence = compactBriefText(
          receipt?.evidence
          || receipt?.source_excerpt
          || receipt?.sourceExcerpt
          || receipt?.missing_source
          || receipt?.missingSource
          || remainingRisk,
        )
        const receiptFix = compactBriefText(
          receipt?.fix
          || receipt?.required_action
          || receipt?.requiredAction
          || receipt?.repair_instruction
          || receipt?.repairInstruction
          || remainingRisk,
        )
        return {
          key: compactBriefText(receipt?.key || receipt?.type || receipt?.category || 'revision_context'),
          label: compactBriefText(receipt?.label || receipt?.name || receipt?.title, '修订上下文'),
          evidence: [missingFieldText, receiptEvidence].filter(Boolean).join('；'),
          fix: [
            missingFields.length > 0 ? '补齐 revision_context_receipts 必需字段 key,label,status,evidence,fix,source_excerpt。' : '',
            receiptFix,
          ].filter(Boolean).join('；'),
          status: missingFields.length > 0 ? 'warn' : statusText || 'warn',
        }
      })
      .filter(Boolean)
  const status = missed.length > 0 ? 'warn' : 'ok'
  return {
    report_id: `revision-context-receipts-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: allReceipts.length === 0
      ? missingReceiptsAfterRevision ? '修订上下文回执未生成' : '修订上下文未触发'
      : status === 'ok' ? '修订上下文 OK' : `修订上下文残留 ${missed.length}`,
    summary: allReceipts.length === 0
      ? missingReceiptsAfterRevision
        ? '本章已执行修订，但没有生成 revision_context_receipts，无法确认修订前后上下文是否一致。'
        : '本章未执行修订，不触发修订上下文回执检查。'
      : status === 'ok'
        ? '本章修订上下文回执没有残留风险。'
        : `修订上下文仍有 ${missed.length} 项需要同步或承接。`,
    receipt_count: allReceipts.length,
    missed_count: missed.length,
    completed_count: Math.max(0, allReceipts.length - missed.length),
    missed,
    completed: allReceipts.length > missed.length
      ? allReceipts.filter((receipt: any) => !platformCheckNeedsCarryOver(receipt) && !compactBriefText(receipt?.remaining_risk || receipt?.remainingRisk || receipt?.risk) && revisionContextReceiptMissingFields(receipt).length === 0).slice(0, 20)
      : [],
    next_actions: status === 'ok'
      ? ['保持 revision_context_receipts 闭环：修订前后上下文来源、伏笔、角色卡、时间线、设定和关系边界都要有核对证据。']
      : missingReceiptsAfterRevision
        ? [
            '重新复核修订结果，补齐 revision_context_receipts。',
            'revision_context_receipts 必须逐项覆盖 previous_chapter、next_chapter、foreshadowing、character_cards、timeline、setting_context、资产归属和关系边界。',
          ]
        : [
            '补齐 revision_context_receipts 中 status=warn/fail、remaining_risk 非空或缺少 key,label,status,evidence,fix,source_excerpt 的上下文差异。',
            '下一章或下一轮修订开始前，先同步 previous_chapter、next_chapter、伏笔、角色卡、时间线、设定和关系边界，不能让旧上下文覆盖修订后的正史。',
          ],
  }
}

export function nextChapterQualityPlanReceiptRows(chapter: any = {}, selfCheck: any = {}) {
  const review = selfCheck?.review || selfCheck?.initial_review || {}
  const revision = selfCheck?.revision || selfCheck?.revised_revision || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const storedPreDraftReceipts = normalizeStoredOhStoryDeliveryReceipts(chapter?.raw_payload || chapter?.rawPayload || {})
    ?.pre_draft_execution_receipts
  const sources = [
    ...preDraftExecutionReceiptSections(selfCheck),
    revisionDeliveryReceipts?.pre_draft_execution_receipts || revisionDeliveryReceipts?.preDraftExecutionReceipts,
    revision?.pre_draft_execution_receipts || revision?.preDraftExecutionReceipts,
    storedPreDraftReceipts,
    chapter?.raw_payload?.pre_draft_execution_receipts || chapter?.rawPayload?.preDraftExecutionReceipts,
  ].filter(Boolean)
  const receipts = [
    ...asArray(review?.next_chapter_quality_plan_receipts || review?.nextChapterQualityPlanReceipts),
    ...asArray(revision?.next_chapter_quality_plan_receipts || revision?.nextChapterQualityPlanReceipts),
    ...asArray(selfCheck?.next_chapter_quality_plan_receipts || selfCheck?.nextChapterQualityPlanReceipts),
    ...sources.flatMap((source: any) => asArray(source?.next_chapter_quality_plan_receipts || source?.nextChapterQualityPlanReceipts)),
  ]
  const seen = new Set<string>()
  return receipts.filter((receipt: any) => {
    if (!receipt || typeof receipt !== 'object') return false
    const key = JSON.stringify({
      quality_focus: receipt?.quality_focus || receipt?.qualityFocus || receipt?.label || receipt?.key,
      evidence: receipt?.evidence || receipt?.changed_evidence || receipt?.changedEvidence || receipt?.source_excerpt || receipt?.sourceExcerpt,
      remaining_risk: receipt?.remaining_risk || receipt?.remainingRisk,
      status: receipt?.status,
      delivered: receipt?.delivered,
    })
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function nextChapterQualityPlanReceiptEvidence(receipt: any) {
  return compactBriefText(
    receipt?.evidence
    || receipt?.changed_evidence
    || receipt?.changedEvidence
    || receipt?.source_excerpt
    || receipt?.sourceExcerpt,
  )
}



export function nextChapterQualityPlanReceiptSegment(receipt: any) {
  const searchable = [
    receipt?.key,
    receipt?.label,
    receipt?.field,
    receipt?.quality_focus,
    receipt?.qualityFocus,
    receipt?.required_action,
    receipt?.requiredAction,
    receipt?.action,
    receipt?.fix,
  ].map((item: any) => compactBriefText(item)).join(' ')
  if (/opening_actions|opening|start|开篇|章首|开场|前300|前三百|第一屏/.test(searchable)) return 'opening_actions'
  if (/ending_actions|ending|end|章末|章尾|结尾|最后300|后三百|翻页|钩子|悬念/.test(searchable)) return 'ending_actions'
  if (/middle_actions|middle|mid|中段|场景推进|事件推进|推进|冲突|证据|状态变化|关系变化/.test(searchable)) return 'middle_actions'
  return ''
}

export function nextChapterQualityPlanReceiptSegmentRisk(receipt: any, evidence: any, chapterText: any) {
  const segment = nextChapterQualityPlanReceiptSegment(receipt)
  if (receiptEvidenceLocatedInQualityPlanSegment(evidence, chapterText, segment)) return ''
  if (segment === 'opening_actions') return '质量续航回执 opening_actions 的 evidence 未落在前300字。'
  if (segment === 'middle_actions') return '质量续航回执 middle_actions 的 evidence 未落在中段事件推进。'
  if (segment === 'ending_actions') return '质量续航回执 ending_actions 的 evidence 未落在最后300字。'
  return ''
}

export function nextChapterQualityPlanReceiptRisk(receipt: any, chapterText = '') {
  const evidence = nextChapterQualityPlanReceiptEvidence(receipt)
  if (evidence && isGenericDeliveryRiskEvidence(evidence)) {
    return '质量续航回执缺少可定位正文证据。'
  }
  if (preDraftReceiptCheckNeedsCarryOver(receipt)) {
    return revisionReceiptRemainingRisk(receipt)
      || compactBriefText(receipt?.risk || receipt?.remaining_risk || receipt?.remainingRisk)
      || (receipt?.delivered === false ? '质量续航计划未证明已落成正文。' : '')
      || `质量续航回执状态未通过：${compactBriefText(receipt?.status, 'missing')}`
  }
  if (!evidence) {
    return '缺少 evidence/source_excerpt，无法证明质量续航计划已落成正文。'
  }
  if (!receiptEvidenceLocatedInProse(evidence, chapterText)) {
    return '质量续航回执 evidence 无法定位到本章正文。'
  }
  const segmentRisk = nextChapterQualityPlanReceiptSegmentRisk(receipt, evidence, chapterText)
  if (segmentRisk) return segmentRisk
  return ''
}

