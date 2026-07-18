import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText } from '../quality/text-utils'
import { isGenericDeliveryRiskEvidence } from '../quality/platform-carry-over'
import { revisionReceiptRemainingRisk } from '../quality/revision-receipt-risk'
import { receiptEvidenceLocatedInProse } from '../quality/receipt-evidence'

export const OH_STORY_ARTIFACT_PROTOCOL_REQUIREMENTS = [
  {
    key: 'relationship_map',
    path: '设定/关系.md',
    match: /关系\.md|relationship/i,
    required_fields: ['关系总览', '关系演变', '核心冲突关系'],
  },
  {
    key: 'genre_positioning',
    path: '设定/题材定位.md',
    match: /题材定位|genre/i,
    required_fields: ['基本信息', '核心梗三分法', '对标分析', '题材框架'],
  },
  {
    key: 'volume_outline',
    path: '大纲/卷纲_第X卷.md',
    match: /卷纲|volume/i,
    required_fields: ['核心矛盾', '情绪弧线', '爽点节奏', '人物弧线', '本卷伏笔'],
  },
  {
    key: 'chapter_blueprint',
    path: '大纲/细纲_第XXX章.md',
    match: /细纲|chapter_blueprint|blueprint/i,
    required_fields: ['内容概括', '情节安排', '人物关系和出场顺序', '情节细化', '结尾设定和钩子'],
  },
  {
    key: 'foreshadowing_tracking',
    path: '追踪/伏笔.md',
    match: /伏笔|foreshadow/i,
    required_fields: ['伏笔状态表', '回收日志', '过期伏笔'],
  },
  {
    key: 'timeline_tracking',
    path: '追踪/时间线.md',
    match: /时间线|timeline/i,
    required_fields: ['时间刻度', '关键事件时序', '待确认'],
  },
  {
    key: 'character_state_tracking',
    path: '追踪/角色状态.md',
    match: /角色状态|character_state/i,
    required_fields: ['角色状态快照', '状态变化证据', '下一章约束'],
  },
  {
    key: 'context_tracking',
    path: '追踪/上下文.md',
    match: /上下文|context/i,
    required_fields: ['最近章节摘要', '当前开放问题', '下一章承接'],
  },
  {
    key: 'benchmark_report',
    path: '对标/{对标书名}/拆文报告.md',
    match: /拆文报告|benchmark|对标/i,
    required_fields: ['基本信息', '核心发现', '禁止照搬'],
  },
]

export function artifactProtocolTextList(...values: any[]) {
  return Array.from(new Set(values
    .flatMap((value) => {
      if (Array.isArray(value)) return value
      if (typeof value === 'string') return value.split(/[、,，;；|｜\n\r]+/g)
      return value ? [value] : []
    })
    .map(item => compactBriefText(item))
    .filter(Boolean))).slice(0, 24)
}

export function artifactProtocolRequirementForReceipt(receipt: any) {
  const key = compactBriefText(receipt?.key || receipt?.artifact_key || receipt?.artifactKey)
  const path = compactBriefText(receipt?.artifact_path || receipt?.artifactPath || receipt?.path || receipt?.source_path || receipt?.sourcePath)
  return OH_STORY_ARTIFACT_PROTOCOL_REQUIREMENTS.find(spec => {
    if (key && (key === spec.key || key.includes(spec.key) || spec.key.includes(key))) return true
    return spec.match.test(path)
  }) || null
}

export function normalizeArtifactProtocolReceipt(receipt: any = {}, index = 0) {
  const spec = artifactProtocolRequirementForReceipt(receipt)
  const artifactPath = compactBriefText(
    receipt?.artifact_path
    || receipt?.artifactPath
    || receipt?.path
    || receipt?.source_path
    || receipt?.sourcePath
    || spec?.path,
  )
  const key = compactBriefText(receipt?.key || receipt?.artifact_key || receipt?.artifactKey || spec?.key || `artifact_protocol_${index + 1}`)
  const label = compactBriefText(receipt?.label || receipt?.title || spec?.path || artifactPath || key, '项目产物协议')
  const requiredFields = artifactProtocolTextList(receipt?.required_fields, receipt?.requiredFields, receipt?.fields, receipt?.covered_fields, receipt?.coveredFields)
  const usedFields = artifactProtocolTextList(receipt?.used_fields, receipt?.usedFields, receipt?.used, receipt?.evidence_fields, receipt?.evidenceFields)
  const evidence = compactBriefText(
    receipt?.evidence
    || receipt?.chapter_evidence
    || receipt?.chapterEvidence
    || receipt?.used_evidence
    || receipt?.usedEvidence
    || receipt?.source_excerpt
    || receipt?.sourceExcerpt,
  )
  if (!key && !artifactPath && !label && requiredFields.length <= 0 && usedFields.length <= 0 && !evidence) return null
  return {
    key,
    label,
    status: compactBriefText(receipt?.status || receipt?.state || (receipt?.delivered === false ? 'fail' : 'ready')).toLowerCase(),
    artifact_path: artifactPath,
    required_fields: requiredFields,
    used_fields: usedFields,
    evidence,
    delivered: receipt?.delivered === undefined ? undefined : receipt?.delivered !== false,
    fix: compactBriefText(receipt?.fix || receipt?.required_action || receipt?.requiredAction || receipt?.repair_instruction || receipt?.repairInstruction),
    remaining_risk: compactBriefText(receipt?.remaining_risk || receipt?.remainingRisk || receipt?.risk),
  }
}

export function artifactProtocolReceiptsFromSource(source: any = {}) {
  const payload = source?.oh_story_delivery_receipts
    || source?.ohStoryDeliveryReceipts
    || source?.delivery_receipts
    || source?.deliveryReceipts
    || source
  const preDraft = payload?.pre_draft_execution_receipts
    || payload?.preDraftExecutionReceipts
    || source?.pre_draft_execution_receipts
    || source?.preDraftExecutionReceipts
    || {}
  return [
    ...asArray(preDraft?.artifact_protocol_receipts || preDraft?.artifactProtocolReceipts),
    ...asArray(payload?.artifact_protocol_receipts || payload?.artifactProtocolReceipts),
    ...asArray(source?.artifact_protocol_receipts || source?.artifactProtocolReceipts),
  ]
}

export function artifactProtocolFieldCovered(actualFields: string[], expected: string) {
  const expectedText = compactBriefText(expected)
  if (!expectedText) return true
  return actualFields.some(field => {
    const text = compactBriefText(field)
    return text === expectedText || text.includes(expectedText) || expectedText.includes(text)
  })
}

export function artifactProtocolReceiptMiss(receipt: any, chapterText = '') {
  const spec = artifactProtocolRequirementForReceipt(receipt)
  const expectedFields = spec?.required_fields || []
  const actualFields = artifactProtocolTextList(receipt?.required_fields, receipt?.used_fields)
  const missingFields = expectedFields.filter(field => !artifactProtocolFieldCovered(actualFields, field))
  const status = compactBriefText(receipt?.status, 'ready').toLowerCase()
  const statusBad = Boolean(status) && !['ok', 'pass', 'ready', 'used', 'delivered', 'done'].includes(status)
  const deliveredBad = receipt?.delivered === false
  const remainingRisk = compactBriefText(receipt?.remaining_risk)
  const evidence = compactBriefText(receipt?.evidence)
  const evidenceMissing = !evidence
  const evidenceUnlocated = Boolean(evidence && chapterText && !receiptEvidenceLocatedInProse(evidence, chapterText))
  if (!missingFields.length && !statusBad && !deliveredBad && !remainingRisk && !evidenceMissing && !evidenceUnlocated) return null
  const text = [
    missingFields.length ? `缺字段：${missingFields.join('、')}` : '',
    statusBad ? `status=${status}` : '',
    deliveredBad ? 'delivered=false' : '',
    remainingRisk,
    evidenceMissing ? '缺少正文 evidence' : '',
    evidenceUnlocated ? 'evidence 无法定位到 chapter_text' : '',
  ].filter(Boolean).join('；')
  return {
    key: receipt.key,
    label: receipt.label,
    artifact_path: receipt.artifact_path || spec?.path || '',
    missing_fields: missingFields,
    text,
    evidence,
    fix: receipt.fix || `补齐 ${receipt.artifact_path || spec?.path || '项目产物'} 的 artifact_protocol_receipts，required_fields 覆盖 oh-story 模板字段，并用 chapter_text 可定位证据证明本章已使用。`,
    remaining_risk: remainingRisk || text,
  }
}

export function buildArtifactProtocolReceiptSyncReport(project: any = {}, chapter: any = {}, contextPackage: any = {}, chapterText = '') {
  const sources = uniqueObjectReferences([
    contextPackage,
    contextPackage?.chapter_target,
    contextPackage?.chapterTarget,
    contextPackage?.delivery_receipts,
    contextPackage?.deliveryReceipts,
    contextPackage?.oh_story_delivery_receipts,
    contextPackage?.ohStoryDeliveryReceipts,
    chapter?.raw_payload,
    chapter?.rawPayload,
    chapter?.raw_payload?.oh_story_delivery_receipts,
    chapter?.rawPayload?.ohStoryDeliveryReceipts,
  ])
  const receipts = sources
    .flatMap(artifactProtocolReceiptsFromSource)
    .map(normalizeArtifactProtocolReceipt)
    .filter(Boolean)
  const dedupedReceipts = Array.from(new Map(receipts.map((receipt: any) => [
    `${receipt.key}::${receipt.artifact_path}::${receipt.evidence}`,
    receipt,
  ])).values())
  const missed = dedupedReceipts
    .map((receipt: any) => artifactProtocolReceiptMiss(receipt, chapterText))
    .filter(Boolean)
  const receiptCount = dedupedReceipts.length
  const missedCount = missed.length
  const status = missedCount > 0 ? 'warn' : 'ok'
  return {
    report_id: `artifact-protocol-receipts-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    project_id: project?.id || null,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || chapter?.chapterNo || null,
    status,
    label: receiptCount === 0 ? '项目产物协议未配置' : status === 'ok' ? '项目产物协议 OK' : `项目产物协议缺口 ${missedCount}`,
    summary: receiptCount === 0
      ? '本章没有可复核的 artifact_protocol_receipts。'
      : status === 'ok'
        ? `已复核 ${receiptCount} 条 artifact_protocol_receipts，项目产物字段和正文证据可用。`
        : `已复核 ${receiptCount} 条 artifact_protocol_receipts，仍有 ${missedCount} 条产物协议缺口。`,
    requires_receipts: receiptCount > 0,
    receipt_count: receiptCount,
    missed_count: missedCount,
    receipts: dedupedReceipts,
    missed,
    next_actions: missed.length
      ? missed.map((item: any) => `补齐 artifact_protocol_receipts：${item.artifact_path || item.label}｜${item.text}`)
      : [],
  }
}

