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
import { parseWorkspacePayload } from '../../payloadParseCache'



export const ROLE_META: Record<WritingCockpitRole, { label: string; description: string; actionKey: WritingCockpitActionKey }> = {
  chief_editor: {
    label: '总编',
    description: '校准作品承诺、卷目标和章节入口。',
    actionKey: 'open_writing_bible',
  },
  episode_planner: {
    label: '分集策划',
    description: '补齐章节任务、冲突和材料缺口。',
    actionKey: 'build_scene_plan',
  },
  draft_writer: {
    label: '正文写手',
    description: '根据章节计划生成稳定初稿。',
    actionKey: 'write_draft',
  },
  revision_editor: {
    label: '修订编辑',
    description: '审阅已有正文并推进改稿。',
    actionKey: 'review_draft',
  },
  continuity_auditor: {
    label: '连续性审计',
    description: '同步故事状态并修补设定断点。',
    actionKey: 'update_canon',
  },
  operations_analyst: {
    label: '运营分析',
    description: '查看任务、运行和生产节奏。',
    actionKey: 'open_task_center',
  },
}

export const ACTION_LABELS: Record<WritingCockpitActionKey, string> = {
  open_writing_bible: '完善写作圣经',
  open_outline_panel: '打开大纲面板',
  repair_materials: '修复生成材料',
  build_scene_plan: '补章节场景计划',
  write_draft: '生成本章初稿',
  review_draft: '审阅修订正文',
  fix_continuity: '修复连续性',
  update_canon: '同步故事状态',
  open_task_center: '打开任务中心',
  open_story_assets: '打开设定资产',
  refresh_context_package: '刷新上下文包',
  open_generation_diagnostics: '查看生成诊断',
  confirm_plan_and_write_draft: '确认计划，进入初稿',
  refresh_current_quality: '复检当前版本',
  create_editor_report: '生成编辑报告',
  apply_editor_revision: '生成修订稿',
  sync_story_state: '立即同步故事状态',
  accept_chapter_and_continue: '验收并进入下一章',
  open_editor_reports: '查看编辑报告',
  open_version_history: '查看版本历史',
}

export function text(value: any, fallback = '') {
  if (value === null || value === undefined) return fallback
  const normalized = String(value).trim()
  return normalized || fallback
}

export function arrayValue(value: any): any[] {
  return Array.isArray(value) ? value : []
}

export function normalizeOhStoryDirector(value?: AnyRecord | null): AnyRecord | null {
  if (!value || typeof value !== 'object') return null
  const director = [
    value.context_package?.oh_story_director,
    value.context_package?.ohStoryDirector,
    value.contextPackage?.oh_story_director,
    value.contextPackage?.ohStoryDirector,
    value.oh_story_director,
    value.ohStoryDirector,
  ].find(candidate => candidate && typeof candidate === 'object' && Object.keys(candidate).length > 0)
  return director || null
}

export function directorPlannerAction(director?: AnyRecord | null): WritingCockpitActionKey | null {
  const action = director?.primary_action || director?.primaryAction || {}
  const key = text(action?.key)
  if (key === 'generate_prose' || key === 'write_chapter_prose') return 'confirm_plan_and_write_draft'
  if (key === 'repair_pre_draft_materials' || key === 'auto_repair_pre_draft' || key === 'repair_materials') {
    return 'repair_materials'
  }
  if (key === 'confirm_missing_choice' || key === 'manual_confirmation_required') return 'open_generation_diagnostics'
  return null
}

export function directorActionLabel(director: AnyRecord, actionKey: WritingCockpitActionKey) {
  const action = director.primary_action || director.primaryAction || {}
  return text(action?.label, ACTION_LABELS[actionKey])
}

export function directorPlanningReasons(director: AnyRecord, fallback: string) {
  const summary = firstNonEmpty(director.blocking_summary, director.blockingSummary)
  const repairReasons = arrayValue(director.required_repairs || director.requiredRepairs)
    .map(repair => typeof repair === 'object'
      ? firstNonEmpty(repair.detail, repair.label, repair.summary, repair.message)
      : text(repair))
    .filter(Boolean)
  const reasons = [summary, ...repairReasons].filter(Boolean)
  return reasons.length ? reasons.slice(0, 3) : [fallback]
}

export function firstNonEmpty(...values: any[]) {
  for (const value of values) {
    const normalized = text(value)
    if (normalized) return normalized
  }
  return ''
}

export function issueText(issue: any) {
  if (typeof issue === 'string') return text(issue)
  return firstNonEmpty(issue?.message, issue?.summary, issue?.detail, issue?.text, issue?.title)
}


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

export function compactWordCount(value: any) {
  return String(value || '').replace(/\s/g, '').length
}

export function compactText(value: any) {
  return String(value || '').replace(/\s+/g, '').trim()
}

export function hasProse(chapter?: AnyRecord | null) {
  const chapterText = String(chapter?.chapter_text || '')
  const compact = chapterText.replace(/\s/g, '')
  if (chapterText) return Boolean(compact && !chapterText.includes('【占位正文】'))
  return Boolean(chapter?.has_prose || chapter?.hasProse || Number(chapter?.word_count ?? chapter?.wordCount ?? 0) > 0)
}

export function sortChapters(chapters: AnyRecord[]) {
  return [...chapters].sort((a, b) => Number(a?.chapter_no || 0) - Number(b?.chapter_no || 0))
}

export function hasValidId(record?: AnyRecord | null) {
  return record?.id !== null && record?.id !== undefined && String(record.id).trim() !== ''
}

export function resolveWritingBible(project?: AnyRecord | null) {
  return project?.reference_config?.writing_bible || project?.writing_bible || {}
}

export function resolveStoryState(project?: AnyRecord | null) {
  return project?.reference_config?.story_state || project?.story_state || {}
}

export function writingBibleExists(writingBible: AnyRecord) {
  return Boolean(firstNonEmpty(
    writingBible?.promise,
    writingBible?.reader_promise,
    writingBible?.mainline?.title,
    writingBible?.mainline?.hook,
    writingBible?.mainline_title,
    writingBible?.mainline_hook,
  ))
}

export function outlineLevel(outline: AnyRecord) {
  return text(outline?.outline_level || outline?.level || outline?.outline_type).toLowerCase()
}

export function outlineRange(outline: AnyRecord) {
  const raw = outline?.raw_payload || {}
  const start = Number(outline?.start_chapter ?? raw?.start_chapter ?? outline?.chapter_no ?? 0)
  const end = Number(outline?.end_chapter ?? raw?.end_chapter ?? outline?.start_chapter ?? raw?.start_chapter ?? outline?.chapter_no ?? start)
  return { start, end }
}

export function chapterInOutline(chapterNo: number, outline: AnyRecord) {
  const { start, end } = outlineRange(outline)
  return start > 0 && chapterNo >= start && chapterNo <= end
}

export function titleMatches(left: any, right: any) {
  const a = text(left)
  const b = text(right)
  return Boolean(a && b && (a.includes(b) || b.includes(a)))
}

export function resolveVolume(outlines: AnyRecord[], writingBible: AnyRecord, nextChapter: AnyRecord | null) {
  const chapterNo = Number(nextChapter?.chapter_no || 0)
  const volumeOutlines = outlines.filter(outline => {
    const level = outlineLevel(outline)
    return level === 'volume' || level === '卷'
  })
  const outline = volumeOutlines.find(item => chapterNo && chapterInOutline(chapterNo, item)) || volumeOutlines[0] || {}
  const bibleVolumes = arrayValue(writingBible?.volume_plan || writingBible?.volumes)
  const bibleVolume = bibleVolumes.find(volume => titleMatches(volume?.title, outline?.title)) || bibleVolumes[0] || {}

  return {
    title: firstNonEmpty(outline?.title, bibleVolume?.title, '未定卷'),
    goal: firstNonEmpty(outline?.goal, bibleVolume?.goal, bibleVolume?.summary, bibleVolume?.promise, outline?.summary),
  }
}

export function chapterNoFromTitle(title: any) {
  const match = text(title).match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : 0
}

export function chapterFromOutline(outlines: AnyRecord[], chapterOrNo: AnyRecord | number) {
  const chapter = typeof chapterOrNo === 'object' ? chapterOrNo : null
  const chapterNo = Number(chapter?.chapter_no || chapterOrNo || 0)
  const outlineId = chapter?.outline_id
  return outlines.find(outline => {
    const level = outlineLevel(outline)
    if (level !== 'chapter' && level !== '章节') return false
    if (outlineId !== null && outlineId !== undefined && String(outline?.id) === String(outlineId)) return true
    const raw = outline?.raw_payload || {}
    const rawChapterNo = Number(outline?.chapter_no || raw?.chapter_no || raw?.future100?.chapter_no || raw?.skeleton?.chapter_no || raw?.rollingPlan?.chapter_no || 0)
    const titleChapterNo = chapterNoFromTitle(outline?.title)
    return rawChapterNo === chapterNo || titleChapterNo === chapterNo || chapterInOutline(chapterNo, outline)
  }) || null
}

export function firstArrayText(value: any) {
  return arrayValue(value).map(item => text(item)).find(Boolean) || ''
}

export function outlineRawPayload(outline?: AnyRecord | null) {
  return outline?.raw_payload || {}
}

export function outlinePlanPayload(outline?: AnyRecord | null) {
  const raw = outlineRawPayload(outline)
  return {
    raw,
    future100: raw?.future100 || {},
    skeleton: raw?.skeleton || {},
    rollingPlan: raw?.rollingPlan || {},
  }
}

export function chapterPlanFields(chapter?: AnyRecord | null, outline?: AnyRecord | null) {
  const chapterRaw = chapter?.raw_payload || {}
  const chapterRollingPlan = chapterRaw?.rollingPlan || {}
  const { raw, future100, skeleton, rollingPlan } = outlinePlanPayload(outline)
  const goal = firstNonEmpty(
    chapter?.chapter_goal,
    chapter?.chapterTask,
    chapter?.task,
    chapterRaw?.chapter_goal,
    chapterRaw?.chapterTask,
    chapterRaw?.task,
    chapterRollingPlan?.chapter_goal,
    chapterRollingPlan?.chapterTask,
    chapterRollingPlan?.task,
    outline?.chapter_goal,
    outline?.chapterTask,
    outline?.task,
    raw?.chapter_goal,
    raw?.chapterTask,
    raw?.task,
    rollingPlan?.chapter_goal,
    rollingPlan?.chapterTask,
    rollingPlan?.task,
    future100?.chapter_goal,
    future100?.chapterTask,
    future100?.task,
    skeleton?.chapter_goal,
    skeleton?.chapterTask,
    skeleton?.task,
    outline?.summary,
  )
  const conflict = firstNonEmpty(
    chapter?.conflict,
    chapterRaw?.conflict,
    chapterRollingPlan?.conflict,
    outline?.conflict,
    raw?.conflict,
    rollingPlan?.conflict,
    future100?.conflict,
    skeleton?.conflict,
    firstArrayText(chapterRollingPlan?.conflict_points),
    firstArrayText(outline?.conflict_points),
    firstArrayText(raw?.conflict_points),
    firstArrayText(rollingPlan?.conflict_points),
    firstArrayText(future100?.conflict_points),
    firstArrayText(skeleton?.conflict_points),
  )
  const endingHook = firstNonEmpty(
    chapter?.ending_hook,
    chapter?.endingHook,
    chapter?.hook,
    chapterRaw?.ending_hook,
    chapterRaw?.endingHook,
    chapterRaw?.hook,
    chapterRollingPlan?.ending_hook,
    chapterRollingPlan?.endingHook,
    chapterRollingPlan?.hook,
    outline?.ending_hook,
    outline?.endingHook,
    outline?.hook,
    raw?.ending_hook,
    raw?.endingHook,
    raw?.hook,
    rollingPlan?.ending_hook,
    rollingPlan?.endingHook,
    rollingPlan?.hook,
    future100?.ending_hook,
    future100?.endingHook,
    future100?.hook,
    skeleton?.ending_hook,
    skeleton?.endingHook,
    skeleton?.hook,
  )

  return { goal, conflict, endingHook }
}

export function hasUsableChapterPlan(chapter?: AnyRecord | null, outline?: AnyRecord | null) {
  const plan = chapterPlanFields(chapter, outline)
  return Boolean(plan.goal && plan.conflict && plan.endingHook)
}

export function chapterHasOutline(chapter: AnyRecord | null, outlines: AnyRecord[]) {
  if (!chapter) return false
  const matchingOutline = chapterFromOutline(outlines, chapter)
  return hasUsableChapterPlan(chapter, matchingOutline)
}

export function materialReady(materialScore?: AnyRecord | null) {
  if (!materialScore) return false
  return Boolean(materialScore.can_generate) || Number(materialScore.score || 0) >= 70
}

export function memoryReady(memorySummary?: AnyRecord | null) {
  if (!memorySummary) return true
  return Number(memorySummary.memory_count || 0) > 0 || Number(memorySummary.fact_count || 0) > 0
}

export function stringArray(value: any): string[] {
  if (Array.isArray(value)) return value.map(item => text(item)).filter(Boolean)
  const single = text(value)
  return single ? [single] : []
}

export function labelStringArray(value: any): string[] {
  if (!Array.isArray(value)) return stringArray(value)
  return value.map(item => {
    if (!item || typeof item !== 'object') return text(item)
    return firstNonEmpty(item.label, item.name, item.summary, item.detail)
  }).filter(Boolean)
}

export function normalizeCoreContractPlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.core_contract_radar
    || target?.coreContractRadar
    || contextPackage?.core_contract_radar
    || contextPackage?.coreContractRadar
    || contextPackage?.pre_draft_brief?.core_contract_radar
    || contextPackage?.context_package?.core_contract_radar
    || {}
  return {
    summary: firstNonEmpty(raw?.summary, raw?.detail, raw?.reason),
    mustServe: stringArray(raw?.must_serve || raw?.mustServe || raw?.required),
    noDrift: stringArray(raw?.no_drift || raw?.noDrift || raw?.red_lines || raw?.redLines),
    repairFocus: stringArray(raw?.repair_focus || raw?.repairFocus || raw?.required_actions || raw?.requiredActions),
  }
}

export function normalizeReaderDropRiskPlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.reader_drop_risk_brief
    || target?.readerDropRiskBrief
    || contextPackage?.reader_drop_risk_brief
    || contextPackage?.readerDropRiskBrief
    || contextPackage?.reader_trial_context
    || contextPackage?.readerTrialContext
    || contextPackage?.pre_draft_brief?.reader_drop_risk_brief
    || {}
  return {
    status: firstNonEmpty(raw?.status, raw?.drop_points?.length || raw?.dropPoints?.length ? 'needs_repair' : ''),
    dropPoints: stringArray(raw?.drop_points || raw?.dropPoints || raw?.risks),
    openingGuardrail: firstNonEmpty(raw?.opening_guardrail, raw?.openingGuardrail),
    middleGuardrail: firstNonEmpty(raw?.middle_guardrail, raw?.middleGuardrail),
    endingGuardrail: firstNonEmpty(raw?.ending_guardrail, raw?.endingGuardrail),
  }
}

export function normalizeStoryPressurePlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.story_pressure_brief
    || target?.storyPressureBrief
    || contextPackage?.story_pressure_brief
    || contextPackage?.storyPressureBrief
    || contextPackage?.story_pressure_ladder
    || contextPackage?.storyPressureLadder
    || contextPackage?.pre_draft_brief?.story_pressure_brief
    || {}
  const pressureSources = labelStringArray(raw?.pressure_sources || raw?.pressureSources || raw?.sources)
  return {
    status: firstNonEmpty(raw?.status, pressureSources.length ? 'ready' : ''),
    pressureSources,
    conflictEscalationGuardrail: firstNonEmpty(raw?.conflict_escalation_guardrail, raw?.conflictEscalationGuardrail),
    stakesGrowthGuardrail: firstNonEmpty(raw?.stakes_growth_guardrail, raw?.stakesGrowthGuardrail),
    reversalPressureGuardrail: firstNonEmpty(raw?.reversal_pressure_guardrail, raw?.reversalPressureGuardrail),
    requiredActions: stringArray(raw?.required_actions || raw?.requiredActions || raw?.next_actions || raw?.nextActions),
  }
}

export function normalizeStoryDrivePlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.story_drive_brief
    || target?.storyDriveBrief
    || contextPackage?.story_drive_brief
    || contextPackage?.storyDriveBrief
    || contextPackage?.pre_draft_brief?.story_drive_brief
    || target
    || {}
  return {
    protagonistChoice: firstNonEmpty(raw?.protagonist_choice, raw?.protagonistChoice, raw?.active_choice, raw?.activeChoice, target?.protagonist_choice, target?.active_choice),
    choiceCost: firstNonEmpty(raw?.choice_cost, raw?.choiceCost, raw?.cost, raw?.consequence, raw?.stakes, target?.choice_cost, target?.cost, target?.consequence, target?.stakes),
    stateChange: firstNonEmpty(raw?.state_change, raw?.stateChange, raw?.exit_state, raw?.exitState, target?.state_change, target?.exit_state),
    obstacle: firstNonEmpty(raw?.obstacle, raw?.conflict, raw?.core_conflict, raw?.coreConflict, target?.core_conflict, target?.conflict),
    causalNextStep: firstNonEmpty(raw?.causal_next_step, raw?.causalNextStep, raw?.next_step, raw?.nextStep, raw?.ending_hook, raw?.endingHook, target?.ending_hook),
    requiredActions: stringArray(raw?.required_actions || raw?.requiredActions || raw?.next_actions || raw?.nextActions),
  }
}

export function normalizeSerialRhythmBudget(value: any, index: number) {
  if (!value || typeof value !== 'object') return null
  return {
    sceneNo: Number(value?.scene_no || value?.sceneNo || index + 1),
    title: firstNonEmpty(value?.title, value?.name, `场景${index + 1}`),
    wordBudget: firstNonEmpty(value?.word_budget, value?.wordBudget, value?.budget),
    requiredPayoff: firstNonEmpty(value?.required_payoff, value?.requiredPayoff, value?.reader_payoff, value?.readerPayoff, value?.payoff),
    turn: firstNonEmpty(value?.turn, value?.reversal, value?.turning_point, value?.turningPoint, value?.information_gap, value?.informationGap),
    endingHookSeed: firstNonEmpty(value?.ending_hook_seed, value?.endingHookSeed, value?.ending_hook, value?.endingHook, value?.exit_state, value?.exitState),
  }
}

export function normalizeSerialRhythmPlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.serial_rhythm_brief
    || target?.serialRhythmBrief
    || contextPackage?.serial_rhythm_brief
    || contextPackage?.serialRhythmBrief
    || contextPackage?.pre_draft_brief?.serial_rhythm_brief
    || {}
  return {
    status: firstNonEmpty(raw?.status),
    openingHookDeadline: firstNonEmpty(raw?.opening_hook_deadline, raw?.openingHookDeadline, raw?.opening_guardrail, raw?.openingGuardrail),
    payoffInterval: firstNonEmpty(raw?.payoff_interval, raw?.payoffInterval, raw?.payoff_density, raw?.payoffDensity),
    middleGuardrail: firstNonEmpty(raw?.middle_guardrail, raw?.middleGuardrail, raw?.pacing_guardrail, raw?.pacingGuardrail),
    endingHookGuardrail: firstNonEmpty(raw?.ending_hook_guardrail, raw?.endingHookGuardrail, raw?.ending_guardrail, raw?.endingGuardrail),
    scenePayoffBudget: (Array.isArray(raw?.scene_payoff_budget) ? raw.scene_payoff_budget : Array.isArray(raw?.scenePayoffBudget) ? raw.scenePayoffBudget : [])
      .map((item: any, index: number) => normalizeSerialRhythmBudget(item, index))
      .filter(Boolean),
    antiDragRules: stringArray(raw?.anti_drag_rules || raw?.antiDragRules || raw?.no_drag_rules || raw?.noDragRules),
  }
}

export function normalizePageTurnHookPlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.page_turn_hook_brief
    || target?.pageTurnHookBrief
    || contextPackage?.page_turn_hook_brief
    || contextPackage?.pageTurnHookBrief
    || contextPackage?.pre_draft_brief?.page_turn_hook_brief
    || {}
  return {
    status: firstNonEmpty(raw?.status),
    hookType: firstNonEmpty(raw?.hook_type, raw?.hookType, raw?.type),
    coreQuestion: firstNonEmpty(raw?.core_question, raw?.coreQuestion, raw?.question),
    visibleTrigger: firstNonEmpty(raw?.visible_trigger, raw?.visibleTrigger, raw?.trigger),
    withheldAnswer: firstNonEmpty(raw?.withheld_answer, raw?.withheldAnswer, raw?.withheld, raw?.forbidden_answer, raw?.forbiddenAnswer),
    nextChapterPull: firstNonEmpty(raw?.next_chapter_pull, raw?.nextChapterPull, raw?.next_pull, raw?.nextPull),
    finalImage: firstNonEmpty(raw?.final_image, raw?.finalImage, raw?.last_image, raw?.lastImage),
    forbiddenResolution: stringArray(raw?.forbidden_resolution || raw?.forbiddenResolution || raw?.forbidden),
    requiredActions: stringArray(raw?.required_actions || raw?.requiredActions),
  }
}

export function normalizeVolumeClimaxBeat(value: any, index: number) {
  if (!value || typeof value !== 'object') {
    const label = firstNonEmpty(value, `爆点${index + 1}`)
    return label ? { chapterNo: null, type: '', label, detail: '' } : null
  }
  const label = firstNonEmpty(value?.label, value?.title, value?.name, value?.summary, value?.detail, `爆点${index + 1}`)
  const detail = firstNonEmpty(value?.detail, value?.description, value?.summary, value?.promise, value?.payoff)
  const type = firstNonEmpty(value?.type, value?.beat_type, value?.beatType, value?.kind)
  if (!label && !detail && !type) return null
  return {
    chapterNo: Number(value?.chapter_no || value?.chapterNo || value?.chapter || 0) || null,
    type,
    label,
    detail,
  }
}

export function sortNearbyVolumeClimaxBeats(beats: Array<NonNullable<ReturnType<typeof normalizeVolumeClimaxBeat>>>, chapterNo: number) {
  return beats
    .map((beat, index) => ({ beat, index }))
    .sort((left, right) => {
      const leftNo = Number(left.beat.chapterNo || 0)
      const rightNo = Number(right.beat.chapterNo || 0)
      if (chapterNo && leftNo === chapterNo && rightNo !== chapterNo) return -1
      if (chapterNo && rightNo === chapterNo && leftNo !== chapterNo) return 1
      if (chapterNo && leftNo && rightNo) return Math.abs(leftNo - chapterNo) - Math.abs(rightNo - chapterNo)
      return left.index - right.index
    })
    .map(item => item.beat)
}

export function normalizeVolumeClimaxPlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.volume_climax_brief
    || target?.volumeClimaxBrief
    || target?.volume_beat_brief
    || target?.volumeBeatBrief
    || contextPackage?.volume_climax_brief
    || contextPackage?.volumeClimaxBrief
    || contextPackage?.volume_beat_brief
    || contextPackage?.volumeBeatBrief
    || contextPackage?.pre_draft_brief?.volume_climax_brief
    || {}
  const budget = contextPackage?.volume_beat_budget
    || contextPackage?.volumeBeatBudget
    || raw?.volume_beat_budget
    || raw?.volumeBeatBudget
    || {}
  const chapterNo = Number(target?.chapter_no || target?.chapterNo || raw?.chapter_no || raw?.chapterNo || 0)
  const explicitBeats = (Array.isArray(raw?.nearby_beats) ? raw.nearby_beats : Array.isArray(raw?.nearbyBeats) ? raw.nearbyBeats : [])
    .map((item: any, index: number) => normalizeVolumeClimaxBeat(item, index))
    .filter(Boolean)
  const budgetBeats = (Array.isArray(budget?.beats) ? budget.beats : Array.isArray(budget?.volume_beats) ? budget.volume_beats : Array.isArray(budget?.volumeBeats) ? budget.volumeBeats : [])
    .map((item: any, index: number) => normalizeVolumeClimaxBeat(item, index))
    .filter(Boolean)
  const nearbyBeats = (explicitBeats.length ? explicitBeats : sortNearbyVolumeClimaxBeats(budgetBeats, chapterNo)).slice(0, 6)
  const currentBeat = nearbyBeats.find(beat => chapterNo && Number(beat?.chapterNo || 0) === chapterNo) || nearbyBeats[0] || null
  return {
    status: firstNonEmpty(raw?.status, budget?.status),
    currentVolumeTitle: firstNonEmpty(raw?.current_volume_title, raw?.currentVolumeTitle, budget?.current_volume_title, budget?.currentVolumeTitle, budget?.volume_title, budget?.volumeTitle),
    chapterRange: firstNonEmpty(raw?.chapter_range, raw?.chapterRange, budget?.chapter_range, budget?.chapterRange),
    currentChapterRole: firstNonEmpty(
      raw?.current_chapter_role,
      raw?.currentChapterRole,
      raw?.chapter_role,
      raw?.chapterRole,
      raw?.role,
      currentBeat ? `${currentBeat.type ? `${currentBeat.type}：` : ''}${currentBeat.label}${currentBeat.detail ? `，${currentBeat.detail}` : ''}` : '',
      budget?.summary,
    ),
    volumeGoal: firstNonEmpty(raw?.volume_goal, raw?.volumeGoal, budget?.volume_goal, budget?.volumeGoal, budget?.goal, budget?.summary),
    climaxPromise: firstNonEmpty(raw?.climax_promise, raw?.climaxPromise, raw?.reader_payoff, raw?.readerPayoff, raw?.payoff, currentBeat?.detail),
    requiredBeats: stringArray(raw?.required_beats || raw?.requiredBeats || raw?.beats_required || raw?.beatsRequired),
    forbiddenPayoff: stringArray(raw?.forbidden_payoff || raw?.forbiddenPayoff || raw?.forbidden_payoffs || raw?.forbiddenPayoffs || raw?.forbidden_resolution || raw?.forbiddenResolution),
    nearbyBeats,
    nextActions: stringArray(raw?.next_actions || raw?.nextActions || budget?.next_actions || budget?.nextActions),
  }
}

export function normalizeDeliveryRiskCarryOverPlan(contextPackage?: AnyRecord | null, target: AnyRecord = {}) {
  const raw = target?.delivery_risk_carry_over
    || target?.deliveryRiskCarryOver
    || contextPackage?.delivery_risk_carry_over
    || contextPackage?.deliveryRiskCarryOver
    || contextPackage?.pre_draft_brief?.delivery_risk_carry_over
    || contextPackage?.pre_draft_brief?.deliveryRiskCarryOver
    || contextPackage?.preDraftBrief?.delivery_risk_carry_over
    || contextPackage?.preDraftBrief?.deliveryRiskCarryOver
    || contextPackage?.context_package?.delivery_risk_carry_over
    || contextPackage?.context_package?.deliveryRiskCarryOver
    || {}
  const totalCount = Number(raw?.total_count ?? raw?.totalCount ?? raw?.count)
  const items = stringArray(raw?.items || raw?.risk_items || raw?.riskItems || raw?.risks)
  const evidence = stringArray(raw?.evidence || raw?.evidences || raw?.risk_evidence || raw?.riskEvidence)
  const requiredActions = stringArray(raw?.required_actions || raw?.requiredActions || raw?.next_actions || raw?.nextActions || raw?.actions)
  const stagedActions = categorizeDeliveryRiskActions(requiredActions)
  const openingActions = uniqueStrings([
    ...stringArray(raw?.opening_actions || raw?.openingActions),
    ...stagedActions.openingActions,
  ])
  const middleActions = uniqueStrings([
    ...stringArray(raw?.middle_actions || raw?.middleActions),
    ...stagedActions.middleActions,
  ])
  const endingActions = uniqueStrings([
    ...stringArray(raw?.ending_actions || raw?.endingActions),
    ...stagedActions.endingActions,
  ])
  const forbiddenRepeats = uniqueStrings(stringArray(raw?.forbidden_repeats || raw?.forbiddenRepeats))
  return {
    label: firstNonEmpty(raw?.label, Number.isFinite(totalCount) && totalCount > 0 ? `待修复 ${totalCount}` : ''),
    priorityLabel: firstNonEmpty(raw?.priority_label, raw?.priorityLabel, raw?.priority, raw?.focus),
    items,
    evidence,
    requiredActions: uniqueStrings([
      ...requiredActions,
      ...openingActions,
      ...middleActions,
      ...endingActions,
    ]),
    openingActions,
    middleActions,
    endingActions,
    forbiddenRepeats,
  }
}

export function uniqueStrings(values: string[]) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const normalized = text(value)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

export function categorizeDeliveryRiskActions(actions: string[]) {
  const openingActions: string[] = []
  const middleActions: string[] = []
  const endingActions: string[] = []

  for (const action of actions) {
    const normalized = text(action)
    if (!normalized) continue
    if (/前\s*300|开篇|开头|开场|承接|入口|第一场/.test(normalized)) {
      openingActions.push(normalized)
      continue
    }
    if (/章末|结尾|最后|追读|翻页|尾声|钩子/.test(normalized)) {
      endingActions.push(normalized)
      continue
    }
    middleActions.push(normalized)
  }

  return {
    openingActions: uniqueStrings(openingActions),
    middleActions: uniqueStrings(middleActions),
    endingActions: uniqueStrings(endingActions),
  }
}

export function previousEnding(previousChapter?: AnyRecord | null) {
  const hook = firstNonEmpty(previousChapter?.ending_hook, previousChapter?.endingHook, previousChapter?.hook)
  if (hook) return hook
  const prose = compactText(previousChapter?.chapter_text)
  if (prose) return prose.slice(-120)
  return '上一章尚无可用收束，请先确认承接点。'
}

export function whyItMatters(volumeGoal: string) {
  if (volumeGoal) return `本章要服务当前卷目标：${volumeGoal}`
  return '当前卷目标缺失，请先明确本章为什么值得写。'
}

export function toCockpitChapter(chapter: AnyRecord, context: { previousChapter?: AnyRecord | null; volumeGoal?: string; outline?: AnyRecord | null } = {}): WritingCockpitChapter {
  const plan = chapterPlanFields(chapter, context.outline)
  const rawPayload = chapter?.raw_payload || {}
  return {
    id: chapter?.id,
    chapterNo: Number(chapter?.chapter_no || 0),
    title: text(chapter?.title, '未命名章节'),
    goal: plan.goal,
    previousEnding: previousEnding(context.previousChapter),
    whyItMatters: whyItMatters(text(context.volumeGoal)),
    mustAdvance: stringArray(rawPayload?.must_advance),
    forbiddenRepeats: stringArray(rawPayload?.forbidden_repeats),
    chapterGoal: plan.goal,
    conflict: plan.conflict,
    endingHook: plan.endingHook,
    wordCount: hasProse(chapter)
      ? (chapter?.chapter_text ? compactWordCount(chapter.chapter_text) : Number(chapter?.word_count ?? chapter?.wordCount ?? 0) || 0)
      : 0,
    hasProse: hasProse(chapter),
    rawPayload,
  }
}

export function chooseNextChapter(chapters: AnyRecord[], activeChapter?: AnyRecord | null) {
  if (hasValidId(activeChapter)) return activeChapter as AnyRecord
  const sorted = sortChapters(chapters)
  return sorted.find(chapter => !hasProse(chapter)) || sorted[0] || null
}

export function buildReadinessChecks(args: {
  writingBibleReady: boolean
  volumeGoalReady: boolean
  hasChapter: boolean
  chapterOutlineReady: boolean
  materialsReady: boolean
  storyStateReady: boolean
  memoryReady: boolean
}): WritingReadinessCheck[] {
  return [
    args.writingBibleReady
      ? { key: 'writing_bible_ready', status: 'pass', label: '写作圣经已就绪', detail: '作品承诺可用于约束正文。', actionKey: 'open_writing_bible' }
      : { key: 'writing_bible_missing', status: 'blocker', label: '缺写作圣经', detail: '需要先补齐读者承诺或主线钩子。', actionKey: 'open_writing_bible' },
    args.volumeGoalReady
      ? { key: 'volume_goal_ready', status: 'pass', label: '卷目标已就绪', detail: '当前卷有可用目标。', actionKey: 'open_outline_panel' }
      : { key: 'volume_goal_missing', status: 'blocker', label: '缺卷目标', detail: '需要明确当前卷要兑现的主线目标。', actionKey: 'open_outline_panel' },
    args.hasChapter
      ? { key: 'chapter_ready', status: 'pass', label: '目标章节已选定', detail: '可以围绕目标章节组织生产。', actionKey: 'open_outline_panel' }
      : { key: 'chapter_missing', status: 'blocker', label: '缺目标章节', detail: '需要先创建或选择章节。', actionKey: 'open_outline_panel' },
    args.chapterOutlineReady
      ? { key: 'chapter_outline_ready', status: 'pass', label: '章节计划已就绪', detail: '章节任务、冲突和钩子可用。', actionKey: 'build_scene_plan' }
      : { key: 'chapter_outline_missing', status: 'blocker', label: '缺章节计划', detail: '需要补齐章节任务、冲突和结尾钩子。', actionKey: 'build_scene_plan' },
    args.materialsReady
      ? { key: 'materials_ready', status: 'pass', label: '生成材料已就绪', detail: '材料分满足本轮正文生成。', actionKey: 'repair_materials' }
      : { key: 'materials_not_ready', status: 'blocker', label: '材料未就绪', detail: '需要修复材料诊断后再生成。', actionKey: 'repair_materials' },
    args.storyStateReady
      ? { key: 'story_state_ready', status: 'pass', label: '故事状态已同步', detail: '故事状态与已写章节保持对齐。', actionKey: 'update_canon' }
      : { key: 'story_state_stale', status: 'warning', label: '故事状态可能滞后', detail: '建议同步最近已写章节的状态机。', actionKey: 'update_canon' },
    args.memoryReady
      ? { key: 'memory_ready', status: 'pass', label: '记忆摘要可用', detail: '长期记忆可辅助连续性判断。', actionKey: 'fix_continuity' }
      : { key: 'memory_unavailable', status: 'warning', label: '记忆摘要不可用', detail: '缺少可引用的记忆事实。', actionKey: 'fix_continuity' },
  ]
}

export function resolvePrimaryAction(args: {
  writingBibleReady: boolean
  hasChapter: boolean
  chapterOutlineReady: boolean
  materialsReady: boolean
  nextHasProse: boolean
  storyStateReady: boolean
}): { role: WritingCockpitRole; action: WritingCockpitActionKey } {
  if (!args.writingBibleReady) return { role: 'chief_editor', action: 'open_writing_bible' }
  if (!args.hasChapter) return { role: 'chief_editor', action: 'open_outline_panel' }
  if (!args.chapterOutlineReady) return { role: 'episode_planner', action: 'build_scene_plan' }
  if (!args.materialsReady) return { role: 'episode_planner', action: 'repair_materials' }
  if (!args.storyStateReady) return { role: 'continuity_auditor', action: 'update_canon' }
  if (args.nextHasProse) return { role: 'revision_editor', action: 'review_draft' }
  return { role: 'draft_writer', action: 'write_draft' }
}

export function pipelineState(nextChapter: AnyRecord | null) {
  if (!nextChapter) return { state: 'no_chapter' as const, label: '等待章节' }
  if (hasProse(nextChapter)) return { state: 'draft_generated' as const, label: '已有初稿' }
  return { state: 'no_draft' as const, label: '等待生成初稿' }
}

export function chapterPlanSourceLabel(chapter: AnyRecord, outline?: AnyRecord | null) {
  const chapterRaw = chapter?.raw_payload || {}
  const outlineRaw = outline?.raw_payload || {}
  if (chapterRaw?.source === 'rolling_plan' || outlineRaw?.source === 'rolling_plan' || chapterRaw?.rollingPlan || outlineRaw?.rollingPlan) return '滚动规划'
  if (outlineRaw?.source === 'future100' || outlineRaw?.future100 || outlineRaw?.skeleton) return '百章骨架'
  if (outline?.id || chapter?.outline_id) return '章节大纲'
  return '手动章节'
}

export function missingPlanItems(plan: { goal: string; conflict: string; endingHook: string }) {
  const items = [
    { field: 'chapter_goal', label: '章节目标', missing: !plan.goal },
    { field: 'conflict', label: '核心冲突', missing: !plan.conflict },
    { field: 'ending_hook', label: '章末钩子', missing: !plan.endingHook },
  ].filter(item => item.missing)
  return {
    fields: items.map(item => item.field),
    labels: items.map(item => item.label),
  }
}

export function writingQueueAction(status: WritingQueueItemStatus, missingLabels: string[] = []) {
  if (status === 'draft_generated') {
    return { actionLabel: '质检', actionHint: '进入交稿质检、编辑报告和故事状态同步。' }
  }
  if (status === 'needs_plan') {
    return { actionLabel: '补计划', actionHint: `先补${missingLabels.length > 0 ? missingLabels.join('、') : '章节目标、核心冲突、章末钩子'}。` }
  }
  return { actionLabel: '开写', actionHint: '进入本章任务书、场景卡和正文生成。' }
}

export function buildWritingQueue(chapters: AnyRecord[], outlines: AnyRecord[], nextChapter: AnyRecord | null): WritingQueueModel {
  if (!nextChapter) {
    return {
      visible: false,
      currentChapterNo: null,
      readyCount: 0,
      blockedCount: 0,
      draftedCount: 0,
      planRepair: {
        visible: false,
        label: '补齐队列计划',
        chapterCount: 0,
        missingCount: 0,
        chapterNos: [],
        intent: null,
      },
      items: [],
    }
  }
  const currentChapterNo = Number(nextChapter?.chapter_no || 0)
  const items = sortChapters(chapters)
    .filter(chapter => Number(chapter?.chapter_no || 0) >= currentChapterNo)
    .slice(0, 5)
    .map(chapter => {
      const outline = chapterFromOutline(outlines, chapter)
      const plan = chapterPlanFields(chapter, outline)
      const drafted = hasProse(chapter)
      const planReady = Boolean(plan.goal && plan.conflict && plan.endingHook)
      const status: WritingQueueItemStatus = drafted ? 'draft_generated' : planReady ? 'ready_to_draft' : 'needs_plan'
      const missing = missingPlanItems(plan)
      const action = writingQueueAction(status, missing.labels)
      return {
        id: chapter?.id,
        chapterNo: Number(chapter?.chapter_no || 0),
        title: text(chapter?.title, '未命名章节'),
        sourceLabel: chapterPlanSourceLabel(chapter, outline),
        status,
        statusLabel: status === 'draft_generated' ? '待质检' : status === 'ready_to_draft' ? '可开写' : '缺计划',
        actionLabel: action.actionLabel,
        actionHint: action.actionHint,
        missingPlanFields: status === 'needs_plan' ? missing.fields : [],
        missingPlanLabels: status === 'needs_plan' ? missing.labels : [],
        repairIntent: status === 'needs_plan'
          ? {
              source: 'writing_queue_plan_repair',
              chapter_id: chapter?.id,
              chapter_no: Number(chapter?.chapter_no || 0),
              missing_fields: missing.fields,
              missing_labels: missing.labels,
            }
          : null,
        goal: plan.goal,
        conflict: plan.conflict,
        endingHook: plan.endingHook,
        wordCount: drafted ? compactWordCount(chapter?.chapter_text) : 0,
      }
    })
  const blockedItems = items.filter(item => item.status === 'needs_plan')
  const planRepair = {
    visible: blockedItems.length > 1,
    label: '补齐队列计划',
    chapterCount: blockedItems.length,
    missingCount: blockedItems.reduce((sum, item) => sum + item.missingPlanFields.length, 0),
    chapterNos: blockedItems.map(item => item.chapterNo),
    intent: blockedItems.length > 0
      ? {
          source: 'writing_queue_batch_plan_repair',
          chapter_nos: blockedItems.map(item => item.chapterNo),
          chapters: blockedItems.map(item => ({
            chapter_id: item.id,
            chapter_no: item.chapterNo,
            title: item.title,
            source_label: item.sourceLabel,
            missing_fields: item.missingPlanFields,
            missing_labels: item.missingPlanLabels,
          })),
        }
      : null,
  }
  return {
    visible: items.length > 0,
    currentChapterNo,
    readyCount: items.filter(item => item.status === 'ready_to_draft').length,
    blockedCount: blockedItems.length,
    draftedCount: items.filter(item => item.status === 'draft_generated').length,
    planRepair,
    items,
  }
}

export * from './cockpit-basics-context'
