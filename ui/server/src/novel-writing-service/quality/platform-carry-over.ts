import { compactBriefText } from './text-utils'

export function deliveryRiskEvidenceSearchText(value: any) {
  return String(value || '')
    .replace(/[\s"'“”‘’《》【】()[\]{}，。！？、；：,.!?;:|｜\-_/\\]+/g, '')
    .toLowerCase()
}

export function isGenericDeliveryRiskEvidence(value: any) {
  const normalized = deliveryRiskEvidenceSearchText(value)
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
}

export function platformCheckNeedsCarryOver(value: any) {
  const status = value?.status
  if (status === false) return true
  const normalized = String(status || '').trim().toLowerCase()
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'no', '0'].includes(normalized)) return true
  const evidenceValues = [
    value?.evidence,
    value?.delivered_evidence,
    value?.deliveredEvidence,
    value?.changed_evidence,
    value?.changedEvidence,
    value?.source_excerpt,
    value?.sourceExcerpt,
    value?.chapter_evidence,
    value?.chapterEvidence,
    value?.fix,
    value?.repair_instruction,
    value?.repairInstruction,
    value?.required_action,
    value?.requiredAction,
    value?.applied_fix,
    value?.appliedFix,
  ].map(item => compactBriefText(item)).filter(Boolean)
  return evidenceValues.some(isGenericDeliveryRiskEvidence)
}

