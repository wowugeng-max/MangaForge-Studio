import type {
  AnyRecord,
  WritingCockpitRole,
  WritingCockpitActionKey,
  WritingReadinessStatus,
  WritingReadinessCheck,
  WritingCockpitChapter,
  WritingQueueItemStatus,
  WritingQueueItem,
  WritingQueueModel,
  ChapterPlanningReadiness,
  ChapterContextPackageStatus,
  ChapterScenePlanStatus,
  ChapterPlanningDeskSceneCard,
  ChapterQualityContinuitySceneMapItem,
  ChapterWritePreparationBrief,
  ChapterPlanningDeskModel,
  ChapterAcceptanceStatus,
  DeslopGateDiagnosticsModel,
  ChapterAcceptanceDeskModel,
  ChapterHandoffStatus,
  ChapterHandoffDeskModel,
  LongformWorkflowStageKey,
  LongformWorkflowStageStatus,
  LongformWorkflowStageModel,
  LongformWorkflowModel,
  WritingCockpitModel,
  BuildWritingCockpitModelInput,
} from './types'

import {
  ACTION_LABELS,
  arrayValue,
  firstNonEmpty,
  issueText,
  stringArray,
  text,
} from './cockpit-basics-core'

export function deliveryReceiptsFrom(value?: AnyRecord | null): AnyRecord {
  if (!value || typeof value !== 'object') return {}
  const rawPayload = value.raw_payload || value.rawPayload || {}
  return value.oh_story_delivery_receipts
    || value.ohStoryDeliveryReceipts
    || rawPayload.oh_story_delivery_receipts
    || rawPayload.ohStoryDeliveryReceipts
    || {}
}

export function uniqueObjects(values: any[]) {
  const seen = new Set<any>()
  return values.filter((value) => {
    if (!value || typeof value !== 'object') return false
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

export function blueprintReceiptLabel(key: string) {
  const labels: Record<string, string> = {
    target_emotion: '目标情绪',
    opening_hook: '开篇钩子',
    core_payoff: '核心回报',
    content_outline: '五段式',
    plot_lines: '多线推进',
    character_order: '人物顺序',
    relationship_change: '关系变化',
    information_gap: '信息缺口',
    beat_sequence: '节拍功能',
    cost_and_reward: '代价收益',
    ending_contract: '章尾承接',
    writing_intent: '写作意图',
  }
  return labels[key] || key
}

export function blueprintReceiptDelivered(value: any) {
  if (value === true) return true
  if (value === false) return false
  if (!value || typeof value !== 'object') return false
  const status = text(value.status || value.result).toLowerCase()
  if (['ok', 'pass', 'passed', 'delivered', 'fulfilled', 'met', 'done'].includes(status)) return true
  if (['warn', 'missed', 'missing', 'failed', 'fail', 'false'].includes(status)) return false
  if (value.delivered === true || value.ok === true || value.met === true || value.fulfilled === true) return true
  if (value.delivered === false || value.ok === false || value.met === false || value.fulfilled === false) return false
  return false
}

export function blueprintReceiptEvidence(value: any) {
  if (!value || typeof value !== 'object') return ''
  return firstNonEmpty(value.evidence, value.summary, value.detail, value.text)
}

export function isBlueprintReceiptValue(value: any) {
  if (typeof value === 'boolean') return true
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return 'delivered' in value
    || 'ok' in value
    || 'met' in value
    || 'fulfilled' in value
    || 'status' in value
    || 'result' in value
    || Boolean(firstNonEmpty(value.evidence, value.summary, value.detail, value.text))
}

export function blueprintReceiptEntries(raw: any) {
  if (!raw || typeof raw !== 'object') return []
  if (Array.isArray(raw)) {
    return raw
      .filter(item => item && typeof item === 'object')
      .map(item => ({
        key: firstNonEmpty(item.key, item.field, item.name, item.label, 'blueprint'),
        value: item,
      }))
      .filter(item => isBlueprintReceiptValue(item.value))
  }

  const nested = raw.receipts
    || raw.blueprint_receipts
    || raw.blueprintReceipts
    || raw.chapter_blueprint_receipts
    || raw.chapterBlueprintReceipts
    || null
  if (nested && nested !== raw) return blueprintReceiptEntries(nested)

  const entries = Object.entries(raw)
    .map(([key, value]) => ({ key, value }))
    .filter(item => isBlueprintReceiptValue(item.value))
  return entries.length > 0 ? entries : []
}

export function buildBlueprintReceiptSummary(chapter?: AnyRecord | null): ChapterAcceptanceDeskModel['blueprintReceipt'] {
  const chapterDeliveryReceipts = deliveryReceiptsFrom(chapter)
  const rawChapterBlueprint = chapterDeliveryReceipts?.chapter_blueprint || chapterDeliveryReceipts?.chapterBlueprint || null
  const scenes = [
    ...arrayValue(chapter?.scene_breakdown),
    ...arrayValue(chapter?.scene_list),
  ]
  const receiptSources = [
    ...scenes.map(scene => scene?.blueprint_receipts || scene?.blueprintReceipts || null),
    rawChapterBlueprint,
    chapterDeliveryReceipts?.chapter_blueprint_receipts || chapterDeliveryReceipts?.chapterBlueprintReceipts || null,
    chapterDeliveryReceipts?.blueprint_receipts || chapterDeliveryReceipts?.blueprintReceipts || null,
  ]
  const receipts = receiptSources.flatMap(raw => {
    return blueprintReceiptEntries(raw).map(({ key, value }) => ({
      key,
      label: blueprintReceiptLabel(key),
      delivered: blueprintReceiptDelivered(value),
      evidence: blueprintReceiptEvidence(value),
    }))
  })
  const totalCount = receipts.length
  if (totalCount <= 0) return null
  const deliveredCount = receipts.filter(item => item.delivered).length
  const missed = receipts.filter(item => !item.delivered).map(item => item.label)
  const missedCount = missed.length

  return {
    status: missedCount > 0 ? 'warn' : 'ok',
    label: missedCount > 0 ? `蓝图缺口 ${missedCount}` : '蓝图已兑现',
    scoreLabel: `蓝图兑现 ${deliveredCount}/${totalCount}`,
    deliveredCount,
    totalCount,
    missedCount,
    evidence: receipts.map(item => item.evidence).filter(Boolean).slice(0, 4),
    missed,
  }
}

export function revisionReceiptRemainingRisk(value: any) {
  const risk = firstNonEmpty(value?.remaining_risk, value?.remainingRisk, value?.risk)
  if (!risk) return ''
  const normalized = risk.toLowerCase()
  if (['无', 'none', 'no', 'n/a', 'null', 'false', '0'].includes(normalized)) return ''
  return risk
}

export function revisionReceiptSyncPayload(value?: AnyRecord | null) {
  const source = value || {}
  const result = source?.result || {}
  return source?.prose_revision_receipt_sync
    || source?.proseRevisionReceiptSync
    || result?.prose_revision_receipt_sync
    || result?.proseRevisionReceiptSync
    || null
}

export function revisionReceiptSyncRiskSummary(sync: AnyRecord | null) {
  if (!sync) {
    return {
      riskCount: 0,
      closedCount: 0,
      receiptCount: 0,
      label: '',
      risks: [] as string[],
      evidence: [] as string[],
    }
  }
  const missedRows = arrayValue(sync?.missed)
  const missedCountValue = Number(sync?.missed_count ?? sync?.missedCount)
  const completedCountValue = Number(sync?.completed_count ?? sync?.completedCount)
  const receiptCountValue = Number(sync?.receipt_count ?? sync?.receiptCount)
  const statusWarn = text(sync?.status).toLowerCase() === 'warn'
  const riskCount = Number.isFinite(missedCountValue)
    ? missedCountValue
    : statusWarn && missedRows.length === 0
      ? 1
      : missedRows.length
  const closedCount = Number.isFinite(completedCountValue) ? completedCountValue : 0
  const receiptCount = Number.isFinite(receiptCountValue) ? receiptCountValue : 0
  return {
    riskCount,
    closedCount,
    receiptCount,
    label: text(sync?.label),
    risks: missedRows
      .map(item => firstNonEmpty(item?.text, item?.risk, item?.remaining_risk, item?.remainingRisk, item?.label))
      .filter(Boolean)
      .slice(0, 4),
    evidence: missedRows
      .map(item => firstNonEmpty(item?.evidence, item?.changed_evidence, item?.changedEvidence, item?.applied_fix, item?.appliedFix))
      .filter(Boolean)
      .slice(0, 4),
  }
}

export function buildRevisionReceiptSummary(payload?: AnyRecord | null, receiptSyncPayload?: AnyRecord | null): ChapterAcceptanceDeskModel['revisionReceipt'] {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const revision = selfCheck?.revision || selfCheck?.revised_revision || payload?.revision || {}
  const revisionDeliveryReceipts = revision?.oh_story_delivery_receipts || revision?.ohStoryDeliveryReceipts || {}
  const revisionReceipts = [
    ...arrayValue(revisionDeliveryReceipts?.revision_receipts || revisionDeliveryReceipts?.revisionReceipts),
    ...arrayValue(revision?.revision_receipts || revision?.revisionReceipts),
    ...arrayValue(selfCheck?.revision_receipts || selfCheck?.revisionReceipts),
    ...arrayValue(payload?.revision_receipts || payload?.revisionReceipts),
  ]
  const deslopRepairReceipts = [
    ...arrayValue(revisionDeliveryReceipts?.deslop_repair_receipts || revisionDeliveryReceipts?.deslopRepairReceipts),
    ...arrayValue(revision?.deslop_repair_receipts || revision?.deslopRepairReceipts),
    ...arrayValue(selfCheck?.deslop_repair_receipts || selfCheck?.deslopRepairReceipts),
    ...arrayValue(payload?.deslop_repair_receipts || payload?.deslopRepairReceipts),
  ]
  const receipts = [...revisionReceipts, ...deslopRepairReceipts]
  const totalCount = receipts.length
  const proseSyncSummary = revisionReceiptSyncRiskSummary(revisionReceiptSyncPayload(receiptSyncPayload))
  if (totalCount <= 0) {
    if (proseSyncSummary.riskCount > 0 || proseSyncSummary.receiptCount > 0) {
      const syncTotalCount = Math.max(proseSyncSummary.riskCount + proseSyncSummary.closedCount, proseSyncSummary.receiptCount)
      return {
        status: proseSyncSummary.riskCount > 0 ? 'warn' : 'ok',
        label: proseSyncSummary.label || (proseSyncSummary.riskCount > 0 ? `修订残留 ${proseSyncSummary.riskCount}` : '修订已闭环'),
        scoreLabel: `修订闭环 ${proseSyncSummary.closedCount}/${syncTotalCount}`,
        closedCount: proseSyncSummary.closedCount,
        totalCount: syncTotalCount,
        riskCount: proseSyncSummary.riskCount,
        evidence: proseSyncSummary.evidence,
        risks: proseSyncSummary.risks,
      }
    }
    const sync = receiptSyncPayload?.deslop_repair_receipt_sync
      || receiptSyncPayload?.deslopRepairReceiptSync
      || receiptSyncPayload?.result?.deslop_repair_receipt_sync
      || receiptSyncPayload?.result?.deslopRepairReceiptSync
      || null
    const missedRows = arrayValue(sync?.missed)
    const missedCountValue = Number(sync?.missed_count ?? sync?.missedCount)
    const completedCountValue = Number(sync?.completed_count ?? sync?.completedCount)
    const receiptCountValue = Number(sync?.receipt_count ?? sync?.receiptCount)
    const riskCount = Number.isFinite(missedCountValue) ? missedCountValue : missedRows.length
    const closedCount = Number.isFinite(completedCountValue) ? completedCountValue : 0
    const syncTotalCount = Math.max(
      riskCount + closedCount,
      Number.isFinite(receiptCountValue) ? receiptCountValue : 0,
    )
    if (!sync || syncTotalCount <= 0) return null
    return {
      status: riskCount > 0 || text(sync?.status).toLowerCase() === 'warn' ? 'warn' : 'ok',
      label: text(sync?.label) || (riskCount > 0 ? `去AI味残留 ${riskCount}` : '去AI味已闭环'),
      scoreLabel: `去AI味闭环 ${closedCount}/${syncTotalCount}`,
      closedCount,
      totalCount: syncTotalCount,
      riskCount,
      evidence: missedRows.map(item => firstNonEmpty(item?.evidence, item?.changed_evidence, item?.changedEvidence, item?.applied_fix, item?.appliedFix)).filter(Boolean).slice(0, 4),
      risks: missedRows.map(item => firstNonEmpty(item?.text, item?.risk, item?.remaining_risk, item?.remainingRisk)).filter(Boolean).slice(0, 4),
    }
  }

  const risks = receipts.map(revisionReceiptRemainingRisk).filter(Boolean).slice(0, 4)
  const riskCount = receipts.filter(item => revisionReceiptRemainingRisk(item)).length
  const closedCount = Math.max(0, totalCount - riskCount)
  const combinedRiskCount = riskCount + proseSyncSummary.riskCount
  const combinedClosedCount = Math.max(closedCount, proseSyncSummary.closedCount)
  const combinedTotalCount = Math.max(totalCount, proseSyncSummary.receiptCount, combinedClosedCount + combinedRiskCount)
  const deslopOnly = revisionReceipts.length === 0 && deslopRepairReceipts.length > 0
  return {
    status: combinedRiskCount > 0 ? 'warn' : 'ok',
    label: proseSyncSummary.riskCount > 0 && proseSyncSummary.label
      ? proseSyncSummary.label
      : combinedRiskCount > 0 ? `${deslopOnly ? '去AI味' : '修订'}残留 ${combinedRiskCount}` : `${deslopOnly ? '去AI味' : '修订'}已闭环`,
    scoreLabel: `${deslopOnly ? '去AI味' : '修订'}闭环 ${combinedClosedCount}/${combinedTotalCount}`,
    closedCount: combinedClosedCount,
    totalCount: combinedTotalCount,
    riskCount: combinedRiskCount,
    evidence: [
      ...receipts.map(item => firstNonEmpty(item?.changed_evidence, item?.changedEvidence, item?.applied_fix, item?.appliedFix)).filter(Boolean),
      ...proseSyncSummary.evidence,
    ].slice(0, 4),
    risks: [...risks, ...proseSyncSummary.risks].slice(0, 4),
  }
}

export function deliveryRiskReceiptRemainingRisk(value: any) {
  const risk = firstNonEmpty(value?.remaining_risk, value?.remainingRisk, value?.risk)
  if (risk) {
    const normalized = risk.toLowerCase()
    if (!['无', 'none', 'no', 'n/a', 'null', 'false', '0'].includes(normalized)) return risk
  }
  if (value?.delivered === false) return firstNonEmpty(value?.required_action, value?.requiredAction, value?.risk_item, value?.riskItem, '承接动作未闭环')
  return ''
}

export function buildDeliveryRiskReceiptSummary(payload?: AnyRecord | null): ChapterAcceptanceDeskModel['deliveryRiskReceipt'] {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || payload?.review || {}
  const payloadDeliveryReceipts = payload?.oh_story_delivery_receipts || payload?.ohStoryDeliveryReceipts || {}
  const selfCheckDeliveryReceipts = selfCheck?.oh_story_delivery_receipts || selfCheck?.ohStoryDeliveryReceipts || {}
  const reviewDeliveryReceipts = review?.oh_story_delivery_receipts || review?.ohStoryDeliveryReceipts || {}
  const receipts = [
    ...arrayValue(reviewDeliveryReceipts?.delivery_risk_receipts || reviewDeliveryReceipts?.deliveryRiskReceipts),
    ...arrayValue(review?.delivery_risk_receipts || review?.deliveryRiskReceipts),
    ...arrayValue(selfCheckDeliveryReceipts?.delivery_risk_receipts || selfCheckDeliveryReceipts?.deliveryRiskReceipts),
    ...arrayValue(selfCheck?.delivery_risk_receipts || selfCheck?.deliveryRiskReceipts),
    ...arrayValue(payloadDeliveryReceipts?.delivery_risk_receipts || payloadDeliveryReceipts?.deliveryRiskReceipts),
    ...arrayValue(payload?.delivery_risk_receipts || payload?.deliveryRiskReceipts),
  ]
  const totalCount = receipts.length
  if (totalCount <= 0) return null

  const risks = receipts.map(deliveryRiskReceiptRemainingRisk).filter(Boolean).slice(0, 4)
  const riskCount = receipts.filter(item => deliveryRiskReceiptRemainingRisk(item)).length
  const closedCount = Math.max(0, totalCount - riskCount)
  return {
    status: riskCount > 0 ? 'warn' : 'ok',
    label: riskCount > 0 ? `承接残留 ${riskCount}` : '承接已闭环',
    scoreLabel: `承接闭环 ${closedCount}/${totalCount}`,
    closedCount,
    totalCount,
    riskCount,
    evidence: receipts.map(item => firstNonEmpty(item?.evidence, item?.required_action, item?.requiredAction, item?.risk_item, item?.riskItem)).filter(Boolean).slice(0, 4),
    risks,
  }
}

export function sceneCardReceiptCheckText(value: any) {
  if (typeof value === 'string') return text(value)
  return [
    value?.key,
    value?.label,
    value?.title,
    value?.status,
    value?.evidence,
    value?.fix,
    value?.message,
    value?.summary,
    value?.text,
    value?.remaining_risk,
    value?.remainingRisk,
    value?.required_action,
    value?.requiredAction,
    ...stringArray(value?.fields),
  ].map(item => text(item)).filter(Boolean).join(' ')
}

export function sceneCardReceiptCheckFailed(value: any) {
  if (typeof value === 'string') return value.toLowerCase().includes('scene_card_receipt')
  const status = text(value?.status || value?.result || value?.severity).toLowerCase()
  if (['pass', 'passed', 'ok', 'done', 'true'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'blocker'].includes(status)) return true
  if (value?.passed === true || value?.delivered === true || value?.ok === true) return false
  if (value?.passed === false || value?.delivered === false || value?.ok === false) return true
  return true
}

export function buildSceneCardReceiptSummary(payload?: AnyRecord | null): ChapterAcceptanceDeskModel['sceneCardReceipt'] {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || payload?.review || {}
  const payloadDeliveryReceipts = deliveryReceiptsFrom(payload)
  const selfCheckDeliveryReceipts = deliveryReceiptsFrom(selfCheck)
  const reviewDeliveryReceipts = deliveryReceiptsFrom(review)
  const auditChecks = [
    ...arrayValue(review?.quality_audit_checks || review?.qualityAuditChecks),
    ...arrayValue(selfCheck?.quality_audit_checks || selfCheck?.qualityAuditChecks),
    ...arrayValue(payload?.quality_audit_checks || payload?.qualityAuditChecks),
    ...arrayValue(review?.issues),
    ...arrayValue(selfCheck?.issues),
    ...arrayValue(payload?.issues),
  ].filter(item => sceneCardReceiptCheckText(item).toLowerCase().includes('scene_card_receipt'))
    .filter(sceneCardReceiptCheckFailed)
  const nestedReceipts = [
    ...arrayValue(reviewDeliveryReceipts?.scene_card_receipts || reviewDeliveryReceipts?.sceneCardReceipts),
    ...arrayValue(review?.scene_card_receipts || review?.sceneCardReceipts),
    ...arrayValue(selfCheckDeliveryReceipts?.scene_card_receipts || selfCheckDeliveryReceipts?.sceneCardReceipts),
    ...arrayValue(selfCheck?.scene_card_receipts || selfCheck?.sceneCardReceipts),
    ...arrayValue(payloadDeliveryReceipts?.scene_card_receipts || payloadDeliveryReceipts?.sceneCardReceipts),
    ...arrayValue(payload?.scene_card_receipts || payload?.sceneCardReceipts),
  ].filter(sceneCardReceiptCheckFailed)
  const checks = [...auditChecks, ...nestedReceipts]

  const riskCount = checks.length
  if (riskCount <= 0) return null

  const scenes = Array.from(new Set(checks.map(item => {
    const sceneNo = Number(item?.scene_no ?? item?.sceneNo)
    if (Number.isFinite(sceneNo) && sceneNo > 0) return `场景${sceneNo}`
    const match = sceneCardReceiptCheckText(item).match(/场景\s*(\d+)/)
    return match?.[1] ? `场景${match[1]}` : ''
  }).filter(Boolean))).slice(0, 4)
  const fields = Array.from(new Set(checks.flatMap(item => stringArray(item?.fields)).filter(Boolean))).slice(0, 6)
  const evidence = checks.map(item => firstNonEmpty(
    item?.remaining_risk,
    item?.remainingRisk,
    item?.evidence,
    item?.message,
    item?.summary,
    item?.text,
    item?.fix,
    sceneCardReceiptCheckText(item),
  )).filter(Boolean).slice(0, 4)

  return {
    status: 'warn',
    label: `场景回执缺口 ${riskCount}`,
    riskCount,
    evidence,
    scenes,
    fields,
  }
}

export function qualityAuditCheckText(value: any) {
  if (typeof value === 'string') return text(value)
  return [
    value?.key,
    value?.label,
    value?.status,
    value?.evidence,
    value?.fix,
    value?.message,
    value?.summary,
    value?.text,
    value?.strategy,
  ].map(item => text(item)).filter(Boolean).join(' ')
}

export function qualityAuditCheckFailed(value: any) {
  if (typeof value === 'string') return true
  const status = text(value?.status || value?.result || value?.severity).toLowerCase()
  const score = Number(value?.score)
  if (['pass', 'passed', 'ok', 'done', 'true'].includes(status)) return false
  if (['fail', 'failed', 'warn', 'warning', 'missing', 'missed', 'false', 'blocker'].includes(status)) return true
  return Number.isFinite(score) && score < 78
}

export function buildQualityAuditSummary(payload?: AnyRecord | null): ChapterAcceptanceDeskModel['qualityAudit'] {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || payload?.review || {}
  const checks = [
    ...arrayValue(review?.quality_audit_checks || review?.qualityAuditChecks),
    ...arrayValue(selfCheck?.quality_audit_checks || selfCheck?.qualityAuditChecks),
    ...arrayValue(payload?.quality_audit_checks || payload?.qualityAuditChecks),
  ].filter(item => !qualityAuditCheckText(item).toLowerCase().includes('scene_card_receipt'))
    .filter(qualityAuditCheckFailed)

  const riskCount = checks.length
  if (riskCount <= 0) return null

  return {
    status: 'warn',
    label: `质量诊断缺口 ${riskCount}`,
    riskCount,
    evidence: checks.map(item => firstNonEmpty(item?.evidence, item?.message, item?.summary, item?.text, qualityAuditCheckText(item))).filter(Boolean).slice(0, 4),
    checks: Array.from(new Set(checks.map(item => firstNonEmpty(item?.label, item?.key, item?.type, qualityAuditCheckText(item))).filter(Boolean))).slice(0, 6),
    fixes: checks.map(item => firstNonEmpty(item?.fix, item?.action)).filter(Boolean).slice(0, 4),
    strategies: Array.from(new Set(checks.map(item => text(item?.strategy)).filter(Boolean))).slice(0, 4),
  }
}

export function approvalBlockerLabel(type: string) {
  if (type === 'reference_safety_blocked') return '仿写安全阻断'
  if (type === 'safety') return '仿写安全待确认'
  if (type === 'low_score') return '低分待确认'
  if (type === 'draft') return '正文入库待确认'
  return '质量门禁阻断'
}

export function buildApprovalBlockerSummary(payload?: AnyRecord | null): ChapterAcceptanceDeskModel['approvalBlocker'] {
  if (!payload) return null
  const qualityGate = payload?.quality_gate || payload?.qualityGate || {}
  const safetyDecision = payload?.safety_decision || payload?.safetyDecision || payload?.reference_safety || payload?.referenceSafety || {}
  const explicitType = text(payload?.approval_type || payload?.approvalType).toLowerCase()
  const type = explicitType || (safetyDecision?.blocked ? 'reference_safety_blocked' : qualityGate?.passed === false ? 'quality_gate' : '')
  if (!['quality_gate', 'low_score', 'draft', 'safety', 'reference_safety_blocked'].includes(type)) return null
  const scoreValue = payload?.self_check?.review?.score
    ?? payload?.selfCheck?.review?.score
    ?? payload?.review?.score
    ?? safetyDecision?.score
    ?? qualityGate?.score
  const score = scoreValue === null || scoreValue === undefined || scoreValue === '' ? null : Number(scoreValue)
  const safeScore = Number.isFinite(score) ? score : null
  const safetyReasons = stringArray(safetyDecision?.reasons)
  const gateReasons = stringArray(qualityGate?.reasons)
  const issueReasons = arrayValue(payload?.self_check?.review?.issues || payload?.selfCheck?.review?.issues || payload?.review?.issues)
    .map(issueText)
    .filter(Boolean)
  const reasons = Array.from(new Set([...safetyReasons, ...gateReasons, ...issueReasons])).slice(0, 5)
  const copyHitCount = Number(safetyDecision?.copy_hit_count ?? safetyDecision?.copyHitCount)
  const detail = reasons[0]
    || (Number.isFinite(copyHitCount) && copyHitCount > 0 ? `参考相似命中 ${copyHitCount}` : '')
    || text(payload?.summary)
    || '入库前需要人工确认或修订处理。'
  return {
    type: type as NonNullable<ChapterAcceptanceDeskModel['approvalBlocker']>['type'],
    status: 'warn',
    label: approvalBlockerLabel(type),
    detail,
    scoreLabel: safeScore === null ? '入库阻断' : `入库阻断 ${safeScore}`,
    reasons,
  }
}

export function platformRubricLabel(value: any) {
  const normalized = firstNonEmpty(value).toLowerCase()
  if (normalized.includes('fanqie') || normalized.includes('番茄')) return '番茄'
  if (normalized.includes('qidian') || normalized.includes('起点')) return '起点'
  if (normalized.includes('zhihu') || normalized.includes('知乎') || normalized.includes('盐言')) return '知乎'
  if (normalized.includes('generic') || normalized.includes('通用')) return '通用'
  return firstNonEmpty(value, '通用')
}

export function platformCheckPassed(value: any) {
  if (value === true) return true
  if (value === false) return false
  const status = firstNonEmpty(value?.status, value?.result, value?.passed).toLowerCase()
  if (['pass', 'passed', 'ok', 'true', 'met', 'done'].includes(status)) return true
  if (['warn', 'warning', 'fail', 'failed', 'missing', 'missed', 'false'].includes(status)) return false
  if (value?.passed === true || value?.delivered === true || value?.ok === true) return true
  return false
}

export function buildPlatformRubricSummary(payload?: AnyRecord | null): ChapterAcceptanceDeskModel['platformRubric'] {
  const selfCheck = payload?.self_check || payload?.selfCheck || payload || {}
  const review = selfCheck?.review || payload?.review || {}
  const checks = [
    ...arrayValue(review?.platform_checks || review?.platformChecks),
    ...arrayValue(selfCheck?.platform_checks || selfCheck?.platformChecks),
    ...arrayValue(payload?.platform_checks || payload?.platformChecks),
  ]
  const rubric = firstNonEmpty(review?.rubric, selfCheck?.rubric, payload?.rubric, review?.platform, payload?.platform)
  if (checks.length <= 0 && !rubric) return null

  const totalCount = checks.length
  const missedChecks = checks.filter(item => !platformCheckPassed(item))
  const missed = missedChecks.map(item => firstNonEmpty(item?.label, item?.key, item?.fix, item?.evidence)).filter(Boolean).slice(0, 4)
  const missedCount = missedChecks.length
  const passedCount = Math.max(0, totalCount - missedCount)
  const label = platformRubricLabel(rubric)
  return {
    status: missedCount > 0 ? 'warn' : 'ok',
    label: `平台基准：${label}`,
    scoreLabel: totalCount > 0 ? `平台达标 ${passedCount}/${totalCount}` : `平台基准：${label}`,
    rubric,
    rubricSource: firstNonEmpty(review?.rubric_source, review?.rubricSource, selfCheck?.rubric_source, payload?.rubric_source, payload?.rubricSource),
    passedCount,
    totalCount,
    missedCount,
    missed,
    evidence: checks.map(item => firstNonEmpty(item?.evidence, item?.fix, item?.label, item?.key)).filter(Boolean).slice(0, 4),
  }
}

