import {
  firstText,
  objectValue,
  parseJsonValue,
  text,
} from './utils'

export function summarizeEvidenceItem(value: any) {
  if (value === null || value === undefined) return ''
  if (typeof value !== 'object') return text(value)
  const item = objectValue(value)
  const label = firstText(item.name, item.label, item.title, item.key, item.type, item.text, item.description)
  const detail = firstText(
    item.expected_state_change,
    item.expectedStateChange,
    item.actual_state_change,
    item.actualStateChange,
    item.reason,
    item.message,
    item.description,
    item.text,
    item.action,
  )
  if (label && detail && label !== detail) return `${label}：${detail}`
  return label || detail || JSON.stringify(item).slice(0, 240)
}

export function metricNumber(value: any) {
  if (value === null || value === undefined || value === '') return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

export function preDraftExecutionReceiptSources(value: any) {
  const quality = objectValue(value)
  const review = objectValue(quality.review)
  const result = objectValue(quality.result)
  const payload = parseJsonValue(review.payload) || objectValue(review.payload)
  const reviewReceipts = objectValue(review.oh_story_delivery_receipts || review.ohStoryDeliveryReceipts)
  const qualityReceipts = objectValue(quality.oh_story_delivery_receipts || quality.ohStoryDeliveryReceipts)
  const resultReceipts = objectValue(result.oh_story_delivery_receipts || result.ohStoryDeliveryReceipts)
  const payloadReceipts = objectValue(payload.oh_story_delivery_receipts || payload.ohStoryDeliveryReceipts)
  const selfCheck = objectValue(payload.self_check || payload.selfCheck)
  const selfCheckReview = objectValue(selfCheck.review)
  const selfCheckReceipts = objectValue(selfCheck.oh_story_delivery_receipts || selfCheck.ohStoryDeliveryReceipts)
  const selfCheckReviewReceipts = objectValue(selfCheckReview.oh_story_delivery_receipts || selfCheckReview.ohStoryDeliveryReceipts)
  return [
    review.pre_draft_execution_receipts || review.preDraftExecutionReceipts,
    quality.pre_draft_execution_receipts || quality.preDraftExecutionReceipts,
    result.pre_draft_execution_receipts || result.preDraftExecutionReceipts,
    payload.pre_draft_execution_receipts || payload.preDraftExecutionReceipts,
    selfCheck.pre_draft_execution_receipts || selfCheck.preDraftExecutionReceipts,
    selfCheckReview.pre_draft_execution_receipts || selfCheckReview.preDraftExecutionReceipts,
    reviewReceipts.pre_draft_execution_receipts || reviewReceipts.preDraftExecutionReceipts,
    qualityReceipts.pre_draft_execution_receipts || qualityReceipts.preDraftExecutionReceipts,
    resultReceipts.pre_draft_execution_receipts || resultReceipts.preDraftExecutionReceipts,
    payloadReceipts.pre_draft_execution_receipts || payloadReceipts.preDraftExecutionReceipts,
    selfCheckReceipts.pre_draft_execution_receipts || selfCheckReceipts.preDraftExecutionReceipts,
    selfCheckReviewReceipts.pre_draft_execution_receipts || selfCheckReviewReceipts.preDraftExecutionReceipts,
  ].map(objectValue).filter(source => Object.keys(source).length > 0)
}

export function genericEvidenceSearchText(value: any) {
  return text(value).replace(/[\s"'“”‘’《》【】()[\]{}，。！？、；：,.!?;:|｜\-_/\\]+/g, '').toLowerCase()
}

export function genericClosureEvidenceDetail(item: any) {
  const check = objectValue(item)
  const evidenceValues = [
    check.evidence,
    check.delivered_evidence,
    check.deliveredEvidence,
    check.changed_evidence,
    check.changedEvidence,
    check.source_excerpt,
    check.sourceExcerpt,
    check.chapter_evidence,
    check.chapterEvidence,
    check.excluded_reason,
    check.excludedReason,
  ].map(value => firstText(value)).filter(Boolean)
  const evidence = evidenceValues.find(value => {
    const normalized = genericEvidenceSearchText(value)
    if (!normalized || normalized.length < 4) return true
    return [
      '已处理',
      '已完成',
      '已兑现',
      '已落地',
      '已修复',
      '已调整',
      '已修改',
      '已优化',
      '已补充',
      '已补齐',
      '已改写',
      '已重写',
      '已完善',
      '已解决',
      '已闭环',
      '已经处理',
      '已经完成',
      '已经兑现',
      '已经落地',
      '已经修复',
      '已经调整',
      '已经修改',
      '已经优化',
      '已经补充',
      '已经补齐',
      '已经改写',
      '已经重写',
      '已经完善',
      '已经解决',
      '已经闭环',
      '按要求处理',
      '按要求完成',
      '按要求调整',
      '按要求修改',
      '按要求优化',
      '按要求补充',
      '按要求补齐',
      '按要求改写',
      '按要求重写',
      '按要求完善',
      '处理完成',
      '修复完成',
      '调整完成',
      '修改完成',
      '优化完成',
      '补充完成',
      '补齐完成',
      '改写完成',
      '重写完成',
      '完善完成',
      '问题解决',
      '风险闭环',
      '正文已处理',
      '正文已体现',
      '已在正文中体现',
      '见正文',
      '详见正文',
      '见修订正文',
      '详见修订正文',
      '见修订后正文',
      '详见修订后正文',
      '见修订稿',
      '详见修订稿',
      '见修订文本',
      '详见修订文本',
      '见修订后文本',
      '详见修订后文本',
      'ok',
      'true',
      'yes',
      'ready',
      'pass',
      'passed',
      'done',
      '已就绪',
      '已确认',
      '已检查',
      '已核对',
      '已读取',
      '已同步',
      '已写回',
      '已更新',
      '已经同步',
      '已经写回',
      '已经更新',
    ].includes(normalized)
  })
  if (!evidence) return ''
  return `证据泛化 ${evidence}`
}

