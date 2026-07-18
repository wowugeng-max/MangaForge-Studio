import { asArray } from '../../routes/novel-route-utils'
import { compactDeliveryRiskCarryOverText } from '../../novel-writing/prose-quality-contracts'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import {
  deliveryRiskEvidenceSearchText,
  isGenericDeliveryRiskEvidence,
} from '../quality/platform-carry-over'
import { revisionReceiptRemainingRisk } from '../quality/revision-receipt-risk'
import {
  receiptEvidenceLocatedInProse,
  receiptEvidenceLocatedInQualityPlanSegment,
} from '../quality/receipt-evidence'

export function deliveryRiskItemText(value: any) {
  if (typeof value === 'string') return compactBriefText(value)
  const label = compactBriefText(value?.label || value?.name || value?.title)
  const body = compactBriefText(value?.issue || value?.text || value?.summary || value?.detail)
  if (label && body && label !== body) return compactBriefText(`${label}：${body}`)
  return compactBriefText(body || label)
}

export function deliveryRiskReceiptRemainingRisk(value: any) {
  const risk = compactBriefText(value?.remaining_risk || value?.remainingRisk || value?.risk)
  if (risk) {
    const normalized = risk.toLowerCase()
    if (!['无', 'none', 'no', 'n/a', 'null', 'false', '0'].includes(normalized)) return risk
  }
  if (value?.delivered === false) {
    return compactBriefText(value?.required_action || value?.requiredAction || value?.risk_item || value?.riskItem || '承接动作未闭环')
  }
  return ''
}

export function inferDeliveryRiskReceiptRepairSegment(value: any) {
  const explicit = compactBriefText(value?.segment || value?.stage || value?.position || value?.section).toLowerCase()
  const searchable = [
    explicit,
    value?.risk_item,
    value?.riskItem,
    value?.required_action,
    value?.requiredAction,
    value?.action,
    value?.remaining_risk,
    value?.remainingRisk,
  ].map((item: any) => compactBriefText(item)).join(' ')
  if (/opening|start|开篇|章首|开场|起笔|前300|前三百|第一屏/.test(searchable)) return 'opening_actions'
  if (/ending|end|章末|章尾|结尾|收束|翻页|钩子|最后300|后三百|下一章|悬念/.test(searchable)) return 'ending_actions'
  if (/middle|mid|中段|场景|推进|冲突|反制|追查|证据|边界|关系|资产|伏笔|时间线|状态|承接|兑现|回报|对白|动作/.test(searchable)) return 'middle_actions'
  return 'required_actions'
}

export function deliveryRiskReceiptRepairPositionRule(segment: string) {
  if (segment === 'opening_actions') return '必须修到前300字，不得拖到中段或章末补一句。'
  if (segment === 'ending_actions') return '必须修到最后300字，不得把章末风险挪到开篇或中段。'
  if (segment === 'middle_actions') return '必须修到中段事件推进，不得只放在开篇声明或章末补一句。'
  return '按 required_action 指向的正文位置补可见事件，不能只在旁白中声明已处理。'
}

export const DELIVERY_RISK_CARRY_OVER_LIMIT = 8

export function inferDeliveryRiskStagedActions(actions: any[]) {
  const openingActions: string[] = []
  const middleActions: string[] = []
  const endingActions: string[] = []
  for (const action of actions.map(deliveryRiskItemText).map(compactDeliveryRiskCarryOverText).filter(Boolean)) {
    const normalized = action.replace(/\s+/g, '')
    if (normalized.includes('交稿风险必须在本章开篇、场景推进或章末钩子中得到可见承接')) continue
    let matched = false
    if (/(开篇|章首|开场|起笔|第一幕|前300|前三百)/.test(normalized)) {
      openingActions.push(action)
      matched = true
    }
    if (/(章末|章尾|结尾|收束|翻页|钩子|最后300|后三百|下一章|悬念)/.test(normalized)) {
      endingActions.push(action)
      matched = true
    }
    if (/(中段|场景|推进|冲突|反制|追查|证据|边界|关系|资产|伏笔|时间线|状态|恢复|同步|承接|兑现|回报|对白|动作)/.test(normalized)) {
      middleActions.push(action)
      matched = true
    }
    if (!matched) middleActions.push(action)
  }
  return {
    openingActions: uniqueBriefStrings(openingActions, 12),
    middleActions: uniqueBriefStrings(middleActions, 12),
    endingActions: uniqueBriefStrings(endingActions, 12),
  }
}

export function normalizeCreationContractCarryOverContext(value: any) {
  if (!value || typeof value !== 'object') return null
  const items = asArray(value.items || value.risk_items || value.riskItems || value.risks)
    .map(deliveryRiskItemText)
    .filter(Boolean)
  const requiredActions = asArray(value.required_actions || value.requiredActions || value.next_actions || value.nextActions)
    .map(deliveryRiskItemText)
    .filter(Boolean)
  const checklist = uniqueBriefStrings(
    asArray(value.checklist || value.creation_contract_checklist || value.creationContractChecklist)
      .map(deliveryRiskItemText)
      .filter(Boolean),
    8,
  )
  const policy = compactBriefText(value.policy)
  if (items.length === 0 && requiredActions.length === 0 && checklist.length === 0 && !policy) return null
  return {
    priority_label: compactBriefText(value.priority_label || value.priorityLabel, '优先修创作契约'),
    items: items.slice(0, 12),
    checklist,
    required_actions: requiredActions.slice(0, 16),
    policy,
  }
}

export function normalizeDeliveryRiskCarryOverContext(value: any) {
  if (!value || typeof value !== 'object') return null
  const creationContractCarryOver = normalizeCreationContractCarryOverContext(
    value.creation_contract_carry_over
    || value.creationContractCarryOver,
  )
  const items = uniqueBriefStrings(asArray(value.items || value.risk_items || value.riskItems || value.risks)
    .map(deliveryRiskItemText)
    .map(compactDeliveryRiskCarryOverText)
    .filter(Boolean), DELIVERY_RISK_CARRY_OVER_LIMIT)
  const requiredActions = uniqueBriefStrings(asArray(value.required_actions || value.requiredActions || value.next_actions || value.nextActions)
    .map(deliveryRiskItemText)
    .map(compactDeliveryRiskCarryOverText)
    .filter(Boolean), DELIVERY_RISK_CARRY_OVER_LIMIT)
  const inferredActions = inferDeliveryRiskStagedActions(requiredActions)
  const openingActions = uniqueBriefStrings([
    ...asArray(value.opening_actions || value.openingActions)
      .map(deliveryRiskItemText)
      .map(compactDeliveryRiskCarryOverText)
      .filter(Boolean),
    ...inferredActions.openingActions,
  ], DELIVERY_RISK_CARRY_OVER_LIMIT)
  const middleActions = uniqueBriefStrings([
    ...asArray(value.middle_actions || value.middleActions)
      .map(deliveryRiskItemText)
      .map(compactDeliveryRiskCarryOverText)
      .filter(Boolean),
    ...inferredActions.middleActions,
  ], DELIVERY_RISK_CARRY_OVER_LIMIT)
  const endingActions = uniqueBriefStrings([
    ...asArray(value.ending_actions || value.endingActions)
      .map(deliveryRiskItemText)
      .map(compactDeliveryRiskCarryOverText)
      .filter(Boolean),
    ...inferredActions.endingActions,
  ], DELIVERY_RISK_CARRY_OVER_LIMIT)
  const forbiddenRepeats = uniqueBriefStrings(
    asArray(value.forbidden_repeats || value.forbiddenRepeats)
      .map(deliveryRiskItemText)
      .map(compactDeliveryRiskCarryOverText)
      .filter(Boolean),
    DELIVERY_RISK_CARRY_OVER_LIMIT,
  )
  const totalCount = Number(value.total_count ?? value.totalCount ?? value.count ?? items.length)
  const stagedCount = openingActions.length + middleActions.length + endingActions.length
  const creationContractCount = creationContractCarryOver
    ? Math.max(
      creationContractCarryOver.items.length,
      creationContractCarryOver.required_actions.length,
      creationContractCarryOver.checklist.length,
    )
    : 0
  const executableTotal = Math.max(items.length, requiredActions.length, stagedCount, creationContractCount, forbiddenRepeats.length)
  const safeTotal = Math.min(DELIVERY_RISK_CARRY_OVER_LIMIT, Number.isFinite(totalCount) && totalCount > 0
    ? Math.max(1, Math.min(totalCount, executableTotal || totalCount))
    : executableTotal)
  if (safeTotal <= 0 && items.length === 0 && requiredActions.length === 0 && stagedCount === 0 && forbiddenRepeats.length === 0 && !creationContractCarryOver) return null
  const sourceChapterNo = Number(value.source_chapter_no ?? value.sourceChapterNo ?? 0) || null
  const rawLabel = compactBriefText(value.label)
  const label = /^待修复\s*\d+/.test(rawLabel) ? `待修复 ${safeTotal}` : compactBriefText(rawLabel, `待修复 ${safeTotal}`)
  return {
    source_chapter_no: sourceChapterNo,
    apply_to_chapter_no: Number(value.apply_to_chapter_no ?? value.applyToChapterNo ?? 0) || null,
    total_count: safeTotal,
    label,
    priority_label: compactBriefText(value.priority_label || value.priorityLabel, '优先复盘上一章'),
    items: items.slice(0, DELIVERY_RISK_CARRY_OVER_LIMIT),
    required_actions: requiredActions.slice(0, DELIVERY_RISK_CARRY_OVER_LIMIT),
    opening_actions: openingActions.slice(0, DELIVERY_RISK_CARRY_OVER_LIMIT),
    middle_actions: middleActions.slice(0, DELIVERY_RISK_CARRY_OVER_LIMIT),
    ending_actions: endingActions.slice(0, DELIVERY_RISK_CARRY_OVER_LIMIT),
    forbidden_repeats: forbiddenRepeats.slice(0, DELIVERY_RISK_CARRY_OVER_LIMIT),
    evidence: uniqueBriefStrings(asArray(value.evidence).map(deliveryRiskItemText).map(compactDeliveryRiskCarryOverText).filter(Boolean), DELIVERY_RISK_CARRY_OVER_LIMIT),
    source_review_ids: asArray(value.source_review_ids || value.sourceReviewIds).filter(Boolean).slice(0, DELIVERY_RISK_CARRY_OVER_LIMIT),
    ...(creationContractCarryOver ? { creation_contract_carry_over: creationContractCarryOver } : {}),
  }
}

export function deliveryRiskCarryOverFromContext(contextPackage: any = {}) {
  return deliveryRiskCarryOversFromContext(contextPackage)[0] || null
}

export function deliveryRiskCarryOversFromContext(contextPackage: any = {}) {
  return [
    contextPackage?.chapter_target?.delivery_risk_carry_over
    || contextPackage?.chapter_target?.deliveryRiskCarryOver,
    contextPackage?.chapterTarget?.delivery_risk_carry_over
    || contextPackage?.chapterTarget?.deliveryRiskCarryOver,
    contextPackage?.batch_preflight?.delivery_risk_carry_over
    || contextPackage?.batch_preflight?.deliveryRiskCarryOver,
    contextPackage?.batchPreflight?.delivery_risk_carry_over
    || contextPackage?.batchPreflight?.deliveryRiskCarryOver,
    contextPackage?.delivery_risk_carry_over
    || contextPackage?.deliveryRiskCarryOver,
  ]
    .map(value => normalizeDeliveryRiskCarryOverContext(value))
    .filter(Boolean)
}

export function normalizeDeliveryRiskReceiptDelivered(value: any) {
  if (value === true) return true
  const normalized = String(value || '').trim().toLowerCase()
  return ['true', 'yes', 'ok', 'pass', 'passed', 'delivered'].includes(normalized)
}



export function deliveryRiskReceiptAnchorTerms(receipt: any) {
  const terms: string[] = []
  const add = (value: any) => {
    const text = compactBriefText(value)
    if (!text) return
    const quotedMatches = [...text.matchAll(/[「“"]([^」”"]{2,24})[」”"]/g)]
    quotedMatches.forEach(match => terms.push(match[1]))
    text
      .split(/必须|需要|延展|回声|保留|结合|转成|不要|不得|直接|写成|写出|补|确认|入库|回到|围绕|的|和|与|或|及|把|将|在|中|成|为|强画面|视觉记忆|场面|动作|冲突|章末|开篇|本章|下一章|[，。！？、；：,.!?;:|｜()[\]{}【】《》\s]+/g)
      .map(item => item.trim())
      .filter(item => item.length >= 2 && item.length <= 24)
      .forEach(item => terms.push(item))
  }
  add(receipt?.risk_item || receipt?.riskItem)
  add(receipt?.required_action || receipt?.requiredAction || receipt?.action)
  if (!isGenericDeliveryRiskEvidence(receipt?.evidence)) add(receipt?.evidence)
  const ignored = new Set(['ip', 'ai', 's1', 's2', '待延展', '待确认', '新资产', '资产', '修复', '风险', '承接'])
  return [...new Set(terms.map(deliveryRiskEvidenceSearchText))]
    .filter(term => term.length >= 2 && !ignored.has(term))
    .slice(0, 12)
}

export function verifyDeliveryRiskReceiptAgainstProse(receipt: any, chapterText: any) {
  const prose = deliveryRiskEvidenceSearchText(chapterText)
  if (!prose || receipt?.delivered !== true) return receipt
  const segmentRisk = deliveryRiskReceiptSegmentRisk(receipt, chapterText)
  if (segmentRisk) {
    return {
      ...receipt,
      delivered: false,
      remaining_risk: revisionReceiptRemainingRisk(receipt) || segmentRisk,
    }
  }
  const evidenceIsGeneric = isGenericDeliveryRiskEvidence(receipt?.evidence)
  const anchorTerms = deliveryRiskReceiptAnchorTerms(receipt)
  const matchedAnchor = anchorTerms.find(term => prose.includes(term))
  if (!evidenceIsGeneric && (!anchorTerms.length || matchedAnchor)) return receipt
  if (matchedAnchor) return receipt
  const remaining = revisionReceiptRemainingRisk(receipt)
  return {
    ...receipt,
    delivered: false,
    remaining_risk: remaining || `缺少可核验的正文证据：${receipt?.risk_item || receipt?.required_action || '上一章承接风险'}`,
  }
}

export function deliveryRiskReceiptSegmentRisk(receipt: any, chapterText: any) {
  const evidence = compactBriefText(receipt?.evidence || receipt?.changed_evidence || receipt?.changedEvidence)
  const segment = inferDeliveryRiskReceiptRepairSegment(receipt)
  if (!['opening_actions', 'middle_actions', 'ending_actions'].includes(segment)) return ''
  if (receiptEvidenceLocatedInQualityPlanSegment(evidence, chapterText, segment)) return ''
  if (segment === 'opening_actions') return 'delivery_risk_receipts opening_actions 的 evidence 未落在前300字。'
  if (segment === 'middle_actions') return 'delivery_risk_receipts middle_actions 的 evidence 未落在中段事件推进。'
  if (segment === 'ending_actions') return 'delivery_risk_receipts ending_actions 的 evidence 未落在最后300字。'
  return ''
}

export function deliveryRiskReceiptCoverageText(receipt: any) {
  return deliveryRiskEvidenceSearchText([
    receipt?.risk_item,
    receipt?.riskItem,
    receipt?.required_action,
    receipt?.requiredAction,
    receipt?.action,
    receipt?.evidence,
    receipt?.remaining_risk,
    receipt?.remainingRisk,
  ].filter(Boolean).join(' '))
}

export function appendMissingDeliveryRiskReceipts(receipts: any[], contextPackage: any = {}) {
  const carryOvers = deliveryRiskCarryOversFromContext(contextPackage)
  if (carryOvers.length <= 0) return receipts
  const rows = carryOvers.flatMap((carryOver: any) => {
    const actionRows = uniqueBriefStrings([
      ...carryOver.required_actions,
      ...carryOver.opening_actions,
      ...carryOver.middle_actions,
      ...carryOver.ending_actions,
      ...asArray(carryOver.forbidden_repeats).map((item: any) => `禁用重复：${item}`),
    ], DELIVERY_RISK_CARRY_OVER_LIMIT)
    const rowCount = Math.max(carryOver.items.length, actionRows.length)
    return Array.from({ length: rowCount }, (_, index) => ({
      risk_item: carryOver.items[index] || (carryOver.items.length === 1 ? carryOver.items[0] : '') || carryOver.label,
      required_action: actionRows[index] || '',
      label: carryOver.label,
    }))
  })
  const coverage = receipts.map(deliveryRiskReceiptCoverageText)
  const missingReceipts = rows
    .map((row: any) => {
      const riskItem = compactDeliveryRiskCarryOverText(row.risk_item || row.label || '上一章交稿风险承接')
      const requiredAction = compactDeliveryRiskCarryOverText(row.required_action || riskItem)
      const primaryTargets = requiredAction && requiredAction !== riskItem ? [requiredAction] : [riskItem]
      const targets = primaryTargets
        .map(deliveryRiskEvidenceSearchText)
        .filter(text => text.length >= 2)
      const covered = targets.some(target => coverage.some(text => text.includes(target)))
      if (covered) return null
      return {
        risk_item: riskItem,
        required_action: requiredAction,
        delivered: false,
        evidence: '自检没有提供可定位正文证据，无法证明承接风险已兑现。',
        remaining_risk: `承接回执缺失：${riskItem}${requiredAction && requiredAction !== riskItem ? `｜${requiredAction}` : ''}`,
      }
    })
    .filter(Boolean)
  const remainingSlots = Math.max(0, DELIVERY_RISK_CARRY_OVER_LIMIT - receipts.length)
  return [...receipts, ...missingReceipts.slice(0, remainingSlots)]
}

export function deliveryRiskReceiptsFromContext(contextPackage: any = {}) {
  return [
    contextPackage?.chapter_target?.delivery_receipts,
    contextPackage?.chapter_target?.oh_story_delivery_receipts,
    contextPackage?.chapter_target,
    contextPackage?.chapterTarget?.delivery_receipts,
    contextPackage?.chapterTarget?.ohStoryDeliveryReceipts,
    contextPackage?.chapterTarget,
    contextPackage?.delivery_receipts,
    contextPackage?.oh_story_delivery_receipts,
  ]
    .flatMap((source: any) => {
      if (Array.isArray(source)) return source
      return asArray(source?.delivery_risk_receipts || source?.deliveryRiskReceipts)
    })
}

export function normalizeDeliveryRiskReceipts(reviewPayload: any = {}, contextPackage: any = {}, chapterText = '') {
  const rawReceipts = Array.isArray(reviewPayload?.delivery_risk_receipts)
    ? reviewPayload.delivery_risk_receipts
    : Array.isArray(reviewPayload?.deliveryRiskReceipts)
      ? reviewPayload.deliveryRiskReceipts
      : deliveryRiskReceiptsFromContext(contextPackage)
  if (rawReceipts.length > 0) {
    const normalizedReceipts = uniqueDeliveryRiskReceipts(rawReceipts.map((receipt: any) => {
      const riskItem = compactDeliveryRiskCarryOverText(receipt?.risk_item || receipt?.riskItem || receipt?.item || receipt?.label)
      const requiredAction = compactDeliveryRiskCarryOverText(receipt?.required_action || receipt?.requiredAction || receipt?.action)
      const delivered = normalizeDeliveryRiskReceiptDelivered(receipt?.delivered)
      const evidence = compactDeliveryRiskCarryOverText(receipt?.evidence || receipt?.changed_evidence || receipt?.changedEvidence)
      const remainingRisk = compactDeliveryRiskCarryOverText(receipt?.remaining_risk || receipt?.remainingRisk || receipt?.risk)
      return verifyDeliveryRiskReceiptAgainstProse({
        ...receipt,
        risk_item: riskItem,
        required_action: requiredAction,
        delivered,
        evidence: evidence || (delivered ? '' : '自检没有提供可定位正文证据，无法证明承接风险已兑现。'),
        remaining_risk: remainingRisk || (delivered ? '' : `承接回执缺失：${riskItem || requiredAction || '上一章交稿风险承接'}`),
      }, chapterText)
    })).slice(0, DELIVERY_RISK_CARRY_OVER_LIMIT)
    return appendMissingDeliveryRiskReceipts(normalizedReceipts, contextPackage)
  }
  return appendMissingDeliveryRiskReceipts([], contextPackage)
}


export function buildDeliveryRiskReceiptSyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const receipts = normalizeDeliveryRiskReceipts({}, contextPackage, chapterText)
  const missed = receipts
    .map((receipt: any) => {
      const remainingRisk = deliveryRiskReceiptRemainingRisk(receipt)
      if (receipt?.delivered !== false && !remainingRisk) return null
      return {
        risk_item: compactBriefText(receipt?.risk_item || receipt?.riskItem || receipt?.item || receipt?.label || '上一章交稿风险'),
        required_action: compactBriefText(receipt?.required_action || receipt?.requiredAction || receipt?.action || ''),
        evidence: compactBriefText(receipt?.evidence || receipt?.changed_evidence || receipt?.changedEvidence || ''),
        remaining_risk: compactBriefText(remainingRisk || '交稿风险回执未闭环。'),
        repair_segment: inferDeliveryRiskReceiptRepairSegment(receipt),
        repair_position_rule: deliveryRiskReceiptRepairPositionRule(inferDeliveryRiskReceiptRepairSegment(receipt)),
        delivered: false,
      }
    })
    .filter(Boolean)
  const missedCount = missed.length
  const receiptCount = receipts.length
  const status = missedCount > 0 ? 'warn' : 'ok'
  return {
    report_id: `delivery-risk-receipts-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    status,
    label: receiptCount === 0 ? '交稿回执未配置' : status === 'ok' ? '交稿回执 OK' : `交稿回执缺口 ${missedCount}`,
    summary: receiptCount === 0
      ? '本章没有需要复核的 delivery_risk_receipts。'
      : status === 'ok'
        ? `已复核 ${receiptCount} 条 delivery_risk_receipts，上一章/批次残留风险已闭环。`
        : `正文有 ${missedCount} 条上一章/批次交稿风险回执未闭环。`,
    receipt_count: receiptCount,
    missed_count: missedCount,
    missed,
    next_actions: status === 'ok'
      ? ['保持 delivery_risk_receipts 闭环：每条 required_action 必须有正文证据和 remaining_risk 归零。']
      : [
          '修订本章正文，补齐 delivery_risk_receipts 中 delivered=false、证据泛化或 remaining_risk 非空的上一章/批次风险债。',
          '按 repair_segment 落点修复：opening 写入前300字承接，middle 写成中段事件推进，ending 写成最后300字追读钩子或余波。',
        ],
  }
}

export function uniqueDeliveryRiskReceipts(receipts: any[] = []) {
  const rows = new Map<string, any>()
  for (const receipt of asArray(receipts)) {
    const key = [
      deliveryRiskEvidenceSearchText(receipt?.risk_item || receipt?.riskItem || receipt?.item || receipt?.label),
      deliveryRiskEvidenceSearchText(receipt?.required_action || receipt?.requiredAction || receipt?.action),
    ].filter(Boolean).join('|') || deliveryRiskReceiptCoverageText(receipt)
    if (!key) continue
    rows.set(key, receipt)
  }
  return Array.from(rows.values())
}

