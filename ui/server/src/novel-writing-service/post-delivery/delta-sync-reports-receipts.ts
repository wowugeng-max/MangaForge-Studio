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

function nextChapterQualityPlanReceiptRows(chapter: any = {}, selfCheck: any = {}) {
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

function nextChapterQualityPlanReceiptEvidence(receipt: any) {
  return compactBriefText(
    receipt?.evidence
    || receipt?.changed_evidence
    || receipt?.changedEvidence
    || receipt?.source_excerpt
    || receipt?.sourceExcerpt,
  )
}



function nextChapterQualityPlanReceiptSegment(receipt: any) {
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

function nextChapterQualityPlanReceiptSegmentRisk(receipt: any, evidence: any, chapterText: any) {
  const segment = nextChapterQualityPlanReceiptSegment(receipt)
  if (receiptEvidenceLocatedInQualityPlanSegment(evidence, chapterText, segment)) return ''
  if (segment === 'opening_actions') return '质量续航回执 opening_actions 的 evidence 未落在前300字。'
  if (segment === 'middle_actions') return '质量续航回执 middle_actions 的 evidence 未落在中段事件推进。'
  if (segment === 'ending_actions') return '质量续航回执 ending_actions 的 evidence 未落在最后300字。'
  return ''
}

function nextChapterQualityPlanReceiptRisk(receipt: any, chapterText = '') {
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

export function buildNextChapterQualityPlanReceiptSyncReport(chapter: any, contextPackage: any = {}, selfCheck: any = {}) {
  const requiresReceipts = contextHasNextChapterQualityPlanDebt(contextPackage)
  const allReceipts = nextChapterQualityPlanReceiptRows(chapter, selfCheck)
  const chapterText = chapterReceiptProseText(chapter)
  const residuals = allReceipts
    .map((receipt: any) => {
      const risk = nextChapterQualityPlanReceiptRisk(receipt, chapterText)
      if (!risk) return null
      return {
        key: 'next_chapter_quality_plan_receipts',
        label: compactBriefText(receipt?.quality_focus || receipt?.qualityFocus || receipt?.label || receipt?.key, '质量续航回执'),
        text: risk,
        evidence: nextChapterQualityPlanReceiptEvidence(receipt),
        required_action: compactBriefText(receipt?.required_action || receipt?.requiredAction || receipt?.fix || receipt?.action),
      }
    })
    .filter(Boolean)
  const missed = requiresReceipts && allReceipts.length === 0
    ? [{
        key: 'next_chapter_quality_plan_receipts',
        label: '质量续航回执未生成',
        text: `第${chapter?.chapter_no || '-'}章未返回质量续航回执复检证据。`,
        evidence: 'delivery_risk_carry_over 存在，但 next_chapter_quality_plan_receipts 为空。',
        required_action: '补齐 next_chapter_quality_plan_receipts，逐项证明上一章质量续航计划已落成正文证据。',
      }]
    : residuals
  const status = missed.length > 0 ? 'warn' : 'ok'
  return {
    report_id: `next-chapter-quality-plan-receipt-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: allReceipts.length === 0
      ? requiresReceipts ? '质量续航回执未生成' : '质量续航回执未触发'
      : status === 'ok' ? '质量续航回执 OK' : `质量续航回执残留 ${missed.length}`,
    summary: allReceipts.length === 0
      ? requiresReceipts
        ? '本章承接了上一章质量续航计划，但没有返回 next_chapter_quality_plan_receipts。'
        : '本章没有触发必须闭环的质量续航回执。'
      : status === 'ok'
        ? '上一章质量续航计划已通过回执证明落成到本章正文。'
        : `质量续航回执仍有 ${missed.length} 项未闭环。`,
    requires_receipts: requiresReceipts,
    receipt_count: allReceipts.length,
    missed_count: missed.length,
    completed_count: Math.max(0, allReceipts.length - missed.length),
    missed,
    completed: allReceipts.filter((receipt: any) => !nextChapterQualityPlanReceiptRisk(receipt, chapterText)).slice(0, 20),
    next_actions: status === 'ok'
      ? ['保持 next_chapter_quality_plan_receipts 逐项引用本章正文证据，证明上一章质量续航计划已落成。']
      : [
          '补齐 next_chapter_quality_plan_receipts；逐项覆盖 quality_focus、opening_actions、middle_actions、ending_actions、avoid_repetition、evidence_basis 和 ending_contract。',
          '每条回执必须写 delivered/status、evidence 或 source_excerpt；仍未兑现的项必须写 remaining_risk 和下一轮修复动作。',
        ],
  }
}

function statusFilterReceiptRows(chapter: any = {}, selfCheck: any = {}) {
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
    ...asArray(review?.status_filter_receipts || review?.statusFilterReceipts),
    ...asArray(revision?.status_filter_receipts || revision?.statusFilterReceipts),
    ...asArray(selfCheck?.status_filter_receipts || selfCheck?.statusFilterReceipts),
    ...sources.flatMap((source: any) => asArray(source?.status_filter_receipts || source?.statusFilterReceipts)),
  ]
  const seen = new Set<string>()
  return receipts.filter((receipt: any) => {
    if (!receipt || typeof receipt !== 'object') return false
    const key = JSON.stringify({
      key: receipt?.key || receipt?.label || receipt?.name,
      used: receipt?.used_in_chapter ?? receipt?.usedInChapter,
      evidence: receipt?.evidence || receipt?.source_excerpt || receipt?.sourceExcerpt,
      excluded_reason: receipt?.excluded_reason || receipt?.excludedReason,
      remaining_risk: receipt?.remaining_risk || receipt?.remainingRisk,
      status: receipt?.status,
    })
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function statusFilterContractRowsFromValue(value: any, field: string, rows: any[] = []) {
  if (value === undefined || value === null) return rows
  if (Array.isArray(value)) {
    value.forEach((item, index) => statusFilterContractRowsFromValue(item, `${field}_${index + 1}`, rows))
    return rows
  }
  if (typeof value === 'object') {
    const label = compactBriefText(value.label || value.name || value.key || value.title)
    const text = compactBriefText(
      value.text
      || value.summary
      || value.state
      || value.rule
      || value.requirement
      || value.description
      || value.evidence,
    )
    if (text || label) {
      rows.push({
        key: compactBriefText(value.key || field),
        label: label || field,
        text: text || label,
      })
      return rows
    }
    Object.entries(value).forEach(([childKey, childValue]) => {
      statusFilterContractRowsFromValue(childValue, `${field}_${childKey}`, rows)
    })
    return rows
  }
  const text = compactBriefText(value)
  if (text) rows.push({ key: field, label: field, text })
  return rows
}

function statusFilterContractRows(contextPackage: any = {}) {
  const contract = getContextContract(contextPackage, 'state_tracking_contract')
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) return []
  const fields = [
    'character_states',
    'characterStates',
    'foreshadowing_threads',
    'foreshadowingThreads',
    'timeline_constraints',
    'timelineConstraints',
    'world_constraints',
    'worldConstraints',
    'source_requirements',
    'sourceRequirements',
    'filter_rules',
    'filterRules',
  ]
  const rows = fields.flatMap(field => statusFilterContractRowsFromValue(contract?.[field], field))
  const seen = new Set<string>()
  return rows
    .map((row: any, index: number) => ({
      key: compactBriefText(row.key || `state_tracking_contract_${index + 1}`)
        .replace(/[^\w\u3400-\u9fff]+/g, '_')
        .replace(/^_+|_+$/g, '')
        || `state_tracking_contract_${index + 1}`,
      label: compactBriefText(row.label || row.key || `状态筛选${index + 1}`),
      text: compactBriefText(row.text || row.label || row.key),
    }))
    .filter((row: any) => {
      if (!row.text) return false
      const key = `${row.key}::${row.text}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function commonChineseSubstringEvidence(sourceText: string, chapterText: string) {
  const source = deliveryRiskEvidenceSearchText(sourceText)
  const prose = deliveryRiskEvidenceSearchText(chapterText)
  if (!source || !prose) return ''
  let best = ''
  for (let length = Math.min(18, source.length); length >= 4; length -= 1) {
    for (let index = 0; index <= source.length - length; index += 1) {
      const candidate = source.slice(index, index + length)
      if (!/[\u3400-\u9fff]{4,}/.test(candidate)) continue
      if (!prose.includes(candidate)) continue
      best = candidate
      break
    }
    if (best) break
  }
  return best
}

function fallbackStatusFilterReceiptsFromContext(contextPackage: any = {}, chapterText = '') {
  if (!compactBriefText(chapterText)) return []
  return statusFilterContractRows(contextPackage).map((row: any) => {
    const evidence = commonChineseSubstringEvidence(row.text, chapterText)
    if (evidence) {
      return {
        key: row.key,
        label: row.label,
        status: 'pass',
        used_in_chapter: true,
        evidence,
        excluded_reason: '',
        remaining_risk: '',
        fallback_generated: true,
      }
    }
    return {
      key: row.key,
      label: row.label,
      status: 'pass',
      used_in_chapter: false,
      evidence: '',
      excluded_reason: `本章正文没有直接调用「${row.text}」；按状态筛选合同排除，不作为本章事实依据。`,
      remaining_risk: '',
      fallback_generated: true,
    }
  })
}

function statusFilterReceiptRisk(receipt: any, chapterText = '') {
  const usedInChapter = receipt?.used_in_chapter ?? receipt?.usedInChapter
  const evidence = compactBriefText(receipt?.evidence || receipt?.source_excerpt || receipt?.sourceExcerpt)
  const excludedReason = compactBriefText(receipt?.excluded_reason || receipt?.excludedReason)
  if (usedInChapter === false && excludedReason && isGenericDeliveryRiskEvidence(excludedReason)) return '未使用的状态缺少具体 excluded_reason，无法确认排除后不会导致本章写错。'
  if (usedInChapter !== false && evidence && isGenericDeliveryRiskEvidence(evidence)) return '已使用或未声明排除的状态缺少可定位正文证据。'
  const directRisk = preDraftReceiptCheckNeedsCarryOver(receipt)
    ? compactBriefText(receipt?.remaining_risk || receipt?.remainingRisk || receipt?.risk)
      || (receipt?.delivered === false ? '状态筛选回执未证明已落成正文。' : '')
      || `状态筛选回执状态未通过：${compactBriefText(receipt?.status, 'missing')}`
    : ''
  if (directRisk) return directRisk
  if (usedInChapter === false && !excludedReason) return '未使用的状态缺少 excluded_reason，无法确认排除后不会导致本章写错。'
  if (usedInChapter !== false && !evidence) return '已使用或未声明排除的状态缺少 evidence，无法回指本章正文证据。'
  if (usedInChapter !== false && !receiptEvidenceLocatedInProse(evidence, chapterText)) return '已使用或未声明排除的状态 evidence 无法定位到本章正文。'
  return ''
}

export function buildStatusFilterReceiptSyncReport(chapter: any, contextPackage: any = {}, selfCheck: any = {}) {
  const requiresReceipts = contextHasStatusFilterReceiptDebt(contextPackage)
  const chapterText = chapterReceiptProseText(chapter)
  const explicitReceipts = statusFilterReceiptRows(chapter, selfCheck)
  const shouldBuildFallbackReceipts = explicitReceipts.length <= 0 || Boolean(selfCheck?.revised)
  const fallbackReceipts = shouldBuildFallbackReceipts
    ? fallbackStatusFilterReceiptsFromContext(contextPackage, chapterText)
    : []
  const receiptResiduals = (receipts: any[]) => receipts
    .map((receipt: any) => {
      const risk = statusFilterReceiptRisk(receipt, chapterText)
      if (!risk) return null
      return {
        key: 'status_filter_receipts',
        label: compactBriefText(receipt?.label || receipt?.key || receipt?.name, '状态筛选回执'),
        text: risk,
        evidence: compactBriefText(receipt?.evidence || receipt?.source_excerpt || receipt?.sourceExcerpt),
        excluded_reason: compactBriefText(receipt?.excluded_reason || receipt?.excludedReason),
        used_in_chapter: receipt?.used_in_chapter ?? receipt?.usedInChapter ?? null,
      }
    })
    .filter(Boolean)
  const explicitResiduals = receiptResiduals(explicitReceipts)
  const fallbackResiduals = receiptResiduals(fallbackReceipts)
  const useFallbackReceipts = explicitReceipts.length <= 0
    || (Boolean(selfCheck?.revised) && explicitResiduals.length > 0 && fallbackReceipts.length > 0 && fallbackResiduals.length === 0)
  const allReceipts = useFallbackReceipts ? fallbackReceipts : explicitReceipts
  const residuals = useFallbackReceipts ? fallbackResiduals : explicitResiduals
  const missed = requiresReceipts && allReceipts.length === 0
    ? [{
        key: 'status_filter_receipts',
        label: '状态筛选回执未生成',
        text: `第${chapter?.chapter_no || '-'}章未返回状态筛选回执复检证据。`,
        evidence: 'state_tracking_contract 存在，但 status_filter_receipts 为空。',
        excluded_reason: '',
        used_in_chapter: null,
      }]
    : residuals
  const status = missed.length > 0 ? 'warn' : 'ok'
  return {
    report_id: `status-filter-receipt-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: allReceipts.length === 0
      ? requiresReceipts ? '状态筛选回执未生成' : '状态筛选回执未触发'
      : status === 'ok' ? '状态筛选回执 OK' : `状态筛选回执残留 ${missed.length}`,
    summary: allReceipts.length === 0
      ? requiresReceipts
        ? '本章存在状态筛选合同，但没有返回 status_filter_receipts。'
        : '本章没有触发必须闭环的状态筛选回执。'
      : status === 'ok'
        ? fallbackReceipts.length > 0
          ? '状态筛选回执由 state_tracking_contract 兜底生成，已说明哪些状态影响本章正确性，以及未使用状态的排除理由。'
          : '状态筛选回执已说明哪些状态影响本章正确性，以及未使用状态的排除理由。'
        : `状态筛选回执仍有 ${missed.length} 项未闭环。`,
    requires_receipts: requiresReceipts,
    fallback_generated: useFallbackReceipts && fallbackReceipts.length > 0,
    receipt_count: allReceipts.length,
    missed_count: missed.length,
    completed_count: Math.max(0, allReceipts.length - missed.length),
    missed,
    completed: allReceipts.filter((receipt: any) => !statusFilterReceiptRisk(receipt, chapterText)).slice(0, 20),
    next_actions: status === 'ok'
      ? ['保持 status_filter_receipts 逐项说明 used_in_chapter、evidence 或 excluded_reason，证明状态筛选没有依赖聊天记忆。']
      : [
          '补齐 status_filter_receipts；逐项覆盖角色状态、相关伏笔/前史、时间线、世界约束、filter_rules 和 source_requirements。',
          '已用于本章的状态必须给 evidence 或 source_excerpt；未使用的状态必须给 excluded_reason，说明为什么不会导致本章写错。',
        ],
  }
}

function contextHasWritePreparationReceiptDebt(contextPackage: any = {}) {
  const brief = getContextContract(contextPackage, 'write_preparation_brief')
  return Boolean(brief && typeof brief === 'object' && !Array.isArray(brief) && Object.keys(brief).length > 0)
}

function writePreparationReceiptRows(chapter: any = {}, selfCheck: any = {}) {
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
    ...asArray(review?.write_preparation_checks || review?.writePreparationChecks),
    ...asArray(revision?.write_preparation_checks || revision?.writePreparationChecks),
    ...asArray(selfCheck?.write_preparation_checks || selfCheck?.writePreparationChecks),
    ...sources.flatMap((source: any) => asArray(source?.write_preparation_checks || source?.writePreparationChecks)),
  ]
  const seen = new Set<string>()
  return receipts.filter((receipt: any) => {
    if (!receipt || typeof receipt !== 'object') return false
    const key = JSON.stringify({
      key: receipt?.key || receipt?.label || receipt?.name,
      delivered: receipt?.delivered,
      evidence: receipt?.evidence || receipt?.source_excerpt || receipt?.sourceExcerpt,
      remaining_risk: receipt?.remaining_risk || receipt?.remainingRisk,
      status: receipt?.status,
    })
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function writePreparationReceiptEvidence(receipt: any) {
  return compactBriefText(
    receipt?.evidence
    || receipt?.delivered_evidence
    || receipt?.deliveredEvidence
    || receipt?.changed_evidence
    || receipt?.changedEvidence
    || receipt?.source_excerpt
    || receipt?.sourceExcerpt,
  )
}

function writePreparationReceiptSegmentRisk(receipt: any, evidence: any, chapterText: any) {
  const segment = nextChapterQualityPlanReceiptSegment(receipt)
  if (receiptEvidenceLocatedInQualityPlanSegment(evidence, chapterText, segment)) return ''
  if (segment === 'opening_actions') return '写前准备回执 opening_actions 的 evidence 未落在前300字。'
  if (segment === 'middle_actions') return '写前准备回执 middle_actions 的 evidence 未落在中段事件推进。'
  if (segment === 'ending_actions') return '写前准备回执 ending_actions 的 evidence 未落在最后300字。'
  return ''
}

function writePreparationReceiptRisk(receipt: any, chapterText = '') {
  if (preDraftReceiptCheckNeedsCarryOver(receipt)) {
    return revisionReceiptRemainingRisk(receipt)
      || compactBriefText(receipt?.risk || receipt?.remaining_risk || receipt?.remainingRisk)
      || (receipt?.delivered === false ? '写前准备回执未证明已落成正文。' : '')
      || `写前准备回执状态未通过：${compactBriefText(receipt?.status, 'missing')}`
  }
  const evidence = writePreparationReceiptEvidence(receipt)
  if (isGenericDeliveryRiskEvidence(evidence)) return '写前准备回执缺少可定位正文证据。'
  if (!receiptEvidenceLocatedInProse(evidence, chapterText)) return '写前准备回执 evidence 无法定位到本章正文。'
  const segmentRisk = writePreparationReceiptSegmentRisk(receipt, evidence, chapterText)
  if (segmentRisk) return segmentRisk
  return ''
}

export function buildWritePreparationReceiptSyncReport(project: any, chapter: any, contextPackage: any = {}, chapterText = '', selfCheck: any = {}) {
  const requiresReceipts = contextHasWritePreparationReceiptDebt(contextPackage)
  const allReceipts = writePreparationReceiptRows(chapter, selfCheck)
  const residuals = allReceipts
    .map((receipt: any) => {
      const risk = writePreparationReceiptRisk(receipt, chapterText)
      if (!risk) return null
      return {
        key: compactBriefText(receipt?.key || receipt?.name || 'write_preparation_checks'),
        label: compactBriefText(receipt?.label || receipt?.key || receipt?.name, '写前准备'),
        text: risk,
        evidence: writePreparationReceiptEvidence(receipt),
        required_action: compactBriefText(receipt?.required_action || receipt?.requiredAction || receipt?.fix || receipt?.action),
        delivered: receipt?.delivered ?? null,
      }
    })
    .filter(Boolean)
  const missed = requiresReceipts && allReceipts.length === 0
    ? [{
        key: 'write_preparation_checks',
        label: '写前准备回执未生成',
        text: `第${chapter?.chapter_no || '-'}章未返回写前准备回执复检证据。`,
        evidence: 'write_preparation_brief 存在，但 write_preparation_checks 为空。',
        required_action: '补齐 write_preparation_checks，逐项证明来源缺口、资产风险、蓝图焦点、读者回报焦点和执行顺序已落成正文证据。',
        delivered: false,
      }]
    : residuals
  const status = missed.length > 0 ? 'warn' : 'ok'
  return {
    report_id: `write-preparation-receipt-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: allReceipts.length === 0
      ? requiresReceipts ? '写前准备回执未生成' : '写前准备回执未触发'
      : status === 'ok' ? '写前准备回执 OK' : `写前准备缺口 ${missed.length}`,
    summary: allReceipts.length === 0
      ? requiresReceipts
        ? '本章存在写前准备卡，但没有返回 write_preparation_checks。'
        : '本章没有触发必须闭环的写前准备回执。'
      : status === 'ok'
        ? '写前准备回执已证明来源缺口、资产风险、蓝图焦点、读者回报和执行顺序落成正文。'
        : `写前准备回执仍有 ${missed.length} 项未闭环。`,
    requires_receipts: requiresReceipts,
    receipt_count: allReceipts.length,
    missed_count: missed.length,
    completed_count: Math.max(0, allReceipts.length - missed.length),
    missed,
    completed: allReceipts.filter((receipt: any) => !writePreparationReceiptRisk(receipt, chapterText)).slice(0, 20),
    next_actions: status === 'ok'
      ? ['保持 write_preparation_checks 逐项引用本章正文证据，证明写前准备不是只停留在任务书。']
      : [
          '补齐 write_preparation_checks；逐项覆盖来源缺口、资产风险、上一轮待修复、创作契约清单、蓝图焦点、读者回报焦点和 must_confirm。',
          '每条回执必须写 delivered/status、evidence 或 source_excerpt；仍未兑现的项必须写 remaining_risk 和下一轮修复动作。',
        ],
  }
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

