import type { PlanningActionKey, PlanningWorkspaceModel } from '../../planningWorkspaceModel'
import type { WritingCockpitActionKey, WritingCockpitModel } from '../../writingCockpitModel'
import { parseWorkspacePayload, type WorkspacePayloadParseOptions } from '../../payloadParseCache'
import type {
  AnyRecord,
  AutoCreationDirectorStatus,
  AutoCreationDirectorArea,
  AutoCreationDirectorActionKey,
  AutoCreationPipelineStatus,
  AutoCreationContractStatus,
  AutoCreationBatchGuardrailStatus,
  AutoCreationBatchGuardrailSignalStatus,
  AutoCreationBatchReviewStatus,
  AutoCreationBatchReviewItemStatus,
  AutoCreationBatchRiskStatus,
  AutoCreationBatchCompletionStatus,
  AutoCreationBatchCompletionMetricStatus,
  AutoCreationBatchHandoffStatus,
  AutoCreationChapterLaunchGateStatus,
  AutoCreationLongformCapacityStatus,
  AutoCreationDeliveryRiskGateStatus,
  AutoCreationManualTestReadinessStatus,
  AutoCreationDailyBattleStepKey,
  AutoCreationRollingScriptRoomStatus,
  AutoCreationRollingScriptLayerKey,
  AutoCreationMillionWordRunwayStatus,
  AutoCreationProductionLicenseStatus,
  AutoCreationDirectorAction,
  AutoCreationRepairPlan,
  AutoCreationPipelineStep,
  AutoCreationSerialStageKey,
  AutoCreationSerialWorkflowStage,
  AutoCreationDirectorCreationPipelineStage,
  AutoCreationDirectorCreationPipeline,
  AutoCreationSerialWorkflow,
  AutoCreationContractItem,
  AutoCreationLongformCompassAxis,
  AutoCreationLongformCompass,
  AutoCreationManualTestGate,
  AutoCreationManualTestReadiness,
  AutoCreationBatchGuardrailSignal,
  AutoCreationRecoveryEvidenceTrendSource,
  AutoCreationStrengthenedRepairAcceptanceTrend,
  AutoCreationRecoveryEvidenceTrend,
  AutoCreationBatchReleaseChapter,
  AutoCreationBatchReleaseWindow,
  AutoCreationBatchPreflight,
  AutoCreationBatchBriefRepair,
  AutoCreationBatchBriefRecovery,
  AutoCreationNextBatchBriefChapter,
  AutoCreationNextBatchBriefStartChecklistKey,
  AutoCreationNextBatchBriefStartChecklistItem,
  AutoCreationNextBatchBrief,
  AutoCreationLongformCapacitySignal,
  AutoCreationLongformFuelItem,
  AutoCreationLongformCapacity,
  AutoCreationChapterLaunchSignal,
  AutoCreationChapterLaunchGate,
  AutoCreationBatchGuardrail,
  AutoCreationBatchReviewItem,
  AutoCreationBatchRiskSignal,
  AutoCreationBatchChecklistExecutionItem,
  AutoCreationBatchChecklistExecution,
  AutoCreationBatchRiskRadar,
  AutoCreationBatchCompletionMetric,
  AutoCreationBatchCompletionDashboard,
  AutoCreationBatchHandoff,
  AutoCreationBatchReviewQueue,
  AutoCreationDeliveryRiskGateCategory,
  AutoCreationDeliveryRiskResolution,
  AutoCreationDeliveryRiskGate,
  AutoCreationStorylineDecisionGate,
  AutoCreationGovernanceClosureBrief,
  AutoCreationWritingQueueFocus,
  AutoCreationDailyBattleStep,
  AutoCreationDailyBattlePlan,
  AutoCreationProductionLicense,
  AutoCreationTodayCommandFlowItem,
  AutoCreationTodayQualityGate,
  AutoCreationGovernanceRecheckMemoryStatus,
  AutoCreationGovernanceRecheckMemory,
  AutoCreationReleaseRationale,
  AutoCreationTodayCommandDeck,
  AutoCreationSerialCockpitStatus,
  AutoCreationChapterChainStatus,
  AutoCreationSerialGuardrail,
  AutoCreationChapterChainStep,
  AutoCreationRiskQueueItem,
  AutoCreationSerialCockpit,
  AutoCreationMillionWordRunwayGate,
  AutoCreationMillionWordRunwayQuestion,
  AutoCreationMillionWordRunway,
  AutoCreationRollingScriptLayer,
  AutoCreationRollingScriptRoom,
  AutoCreationDirectorModel,
  BuildAutoCreationDirectorModelInput
} from './types'


export const PLANNING_ACTION_LABELS: Record<PlanningActionKey, string> = {
  update_rolling_plan: '更新滚动规划',
  complete_volume_plan: '补齐当前卷规划',
  enter_story_planning: '进入故事规划',
  enter_chapter_writing: '进入当前章写作',
  open_outline_tree: '查看完整大纲',
  future100_audit: '检查未来100章',
  future100_generate: '生成未来100章',
  longform_pressure: '运行长线压力测试',
  longform_creation_diagnosis: '运行创作诊断',
  topic_validation: '验证原创选题',
  reference_diagnosis: '诊断参考知识',
  open_story_assets: '打开设定资产',
  update_story_state: '校正故事状态',
  open_quality_revision: '进入质检修订',
  run_first30_retention: '运行前30章诊断',
  create_first30_repair: '生成修复任务',
  run_reader_trial_review: '运行读者试读复盘',
  create_reader_trial_repair: '生成试读修复任务',
  create_delivery_risk_repair: '生成风险修复任务',
  record_storyline_diff_decision: '记录剧情线决策',
  create_storyline_decision_tasks: '生成剧情线决策任务',
  open_task_center: '打开任务中心',
}

export const WRITING_ACTION_LABELS: Record<WritingCockpitActionKey, string> = {
  open_writing_bible: '完善写作圣经',
  open_outline_panel: '打开大纲面板',
  repair_materials: '修复生成材料',
  build_scene_plan: '生成场景卡',
  write_draft: '生成本章初稿',
  review_draft: '审阅修订正文',
  fix_continuity: '修复连续性',
  update_canon: '同步故事状态',
  open_task_center: '打开任务中心',
  refresh_context_package: '刷新上下文包',
  open_generation_diagnostics: '查看生成诊断',
  confirm_plan_and_write_draft: '确认并生成',
  refresh_current_quality: '复检当前版本',
  create_editor_report: '生成编辑报告',
  apply_editor_revision: '生成修订稿',
  sync_story_state: '同步故事状态',
  accept_chapter_and_continue: '验收并进入下一章',
  open_editor_reports: '查看编辑报告',
  open_version_history: '查看版本历史',
}

export const MODEL_CALL_ACTIONS = new Set<string>([
  'update_rolling_plan',
  'future100_audit',
  'future100_generate',
  'longform_pressure',
  'longform_creation_diagnosis',
  'topic_validation',
  'reference_diagnosis',
  'run_first30_retention',
  'create_first30_repair',
  'run_reader_trial_review',
  'create_reader_trial_repair',
  'build_scene_plan',
  'write_draft',
  'confirm_plan_and_write_draft',
  'refresh_current_quality',
  'create_editor_report',
  'apply_editor_revision',
  'repair_materials',
  'refresh_context_package',
  'review_governance_closure',
  'start_safe_batch_generation',
  'auto_repair_blockers',
])

export function arrayValue(value: any): any[] {
  return Array.isArray(value) ? value : []
}

export function text(value: any, fallback = '') {
  if (value === null || value === undefined) return fallback
  const normalized = String(value).trim()
  return normalized || fallback
}

export function firstText(...values: any[]) {
  for (const value of values) {
    const normalized = text(value)
    if (normalized) return normalized
  }
  return ''
}

export function planningAction(key: PlanningActionKey, description: string, label?: string, payload?: AnyRecord): AutoCreationDirectorAction {
  return {
    area: 'planning',
    key,
    label: label || PLANNING_ACTION_LABELS[key] || key,
    description,
    modelCall: MODEL_CALL_ACTIONS.has(key),
    payload,
  }
}

export function normalizePlanningActionKey(value: any, fallback: PlanningActionKey): PlanningActionKey {
  const key = text(value)
  if (key && Object.prototype.hasOwnProperty.call(PLANNING_ACTION_LABELS, key)) return key as PlanningActionKey
  return fallback
}

export function writingAction(key: WritingCockpitActionKey, description: string, label?: string): AutoCreationDirectorAction {
  return {
    area: 'writing',
    key,
    label: label || WRITING_ACTION_LABELS[key] || key,
    description,
    modelCall: MODEL_CALL_ACTIONS.has(key),
  }
}

export function chapterOrderNumber(chapter: AnyRecord): number {
  const value = Number(chapter?.chapter_no ?? chapter?.chapterNo ?? chapter?.no ?? 0)
  return Number.isFinite(value) ? value : 0
}

export function latestChapterOhStoryDirectorEntry(chapters: AnyRecord[]): { chapter: AnyRecord, director: AnyRecord } | null {
  const entry = [...chapters]
    .sort((a, b) => chapterOrderNumber(b) - chapterOrderNumber(a))
    .map(chapter => ({
      chapter,
      director: chapter?.raw_payload?.oh_story_director
        || chapter?.raw_payload?.ohStoryDirector
        || chapter?.rawPayload?.oh_story_director
        || chapter?.rawPayload?.ohStoryDirector
        || chapter?.oh_story_director
        || chapter?.ohStoryDirector,
    }))
    .find(item => item.director && typeof item.director === 'object')
  return entry ? { chapter: entry.chapter, director: entry.director } : null
}

export function postDraftDirectorAction(director: AnyRecord | null): AutoCreationDirectorAction | null {
  if (!director || text(director.stage) !== 'post_draft') return null
  const acceptance = text(director.acceptance)
  if (!['accepted', 'accepted_with_carryover'].includes(acceptance)) return null
  if (arrayValue(director.required_repairs || director.requiredRepairs).length > 0) return null
  const primaryAction = director.primary_action || director.primaryAction || {}
  if (text(primaryAction.key) !== 'continue_next_chapter') return null
  return writingAction(
    'accept_chapter_and_continue',
    text(director.blocking_summary || director.blockingSummary, '总导演验收通过，承接到下一章。'),
    text(primaryAction.label, '继续下一章'),
  )
}

export function sameChapterIdentity(a: AnyRecord | null | undefined, b: AnyRecord | null | undefined): boolean {
  if (!a || !b) return false
  const aId = text(a.id)
  const bId = text(b.id)
  if (aId && bId && aId === bId) return true
  const aNo = Number(a.chapter_no ?? a.chapterNo)
  const bNo = Number(b.chapter_no ?? b.chapterNo)
  return Number.isFinite(aNo) && Number.isFinite(bNo) && aNo === bNo
}

export function acceptanceDeskBlocksDirector(acceptance: AnyRecord | null | undefined): boolean {
  if (!acceptance?.visible) return false
  const status = text(acceptance.acceptanceStatus || acceptance.status)
  return !['ready_to_accept', 'delivered', 'delivered_with_warnings'].includes(status)
}

export function opsAction(
  key: 'open_task_center' | 'select_model' | 'review_governance_closure' | 'start_safe_batch_generation' | 'create_safe_batch_risk_repair' | 'create_style_sample_batch_repair' | 'create_recovery_evidence_governance_queue' | 'create_delivery_risk_repair' | 'create_script_room_repair' | 'auto_repair_blockers',
  label: string,
  description: string,
  disabled = false,
  payload?: AnyRecord,
): AutoCreationDirectorAction {
  return {
    area: 'ops',
    key,
    label,
    description,
    modelCall: MODEL_CALL_ACTIONS.has(key),
    disabled,
    payload,
  }
}

export function deliveryRiskRepairPayload(deliveryRiskGate: AutoCreationDeliveryRiskGate): AnyRecord {
  return {
    source: 'delivery_risk_gate',
    deliveryRiskGate: {
      status: deliveryRiskGate.status,
      label: deliveryRiskGate.label,
      summary: deliveryRiskGate.summary,
      totalOpen: deliveryRiskGate.totalOpen,
      highOpen: deliveryRiskGate.highOpen,
      categories: deliveryRiskGate.categories,
      topRisks: deliveryRiskGate.topRisks,
      recentlyResolved: deliveryRiskGate.recentlyResolved,
    },
  }
}

export function writingReadinessIssue(writing: WritingCockpitModel, key: string) {
  return [
    ...arrayValue(writing.readiness?.warnings),
    ...arrayValue(writing.readiness?.blockers),
    ...arrayValue(writing.readinessChecks),
    ...arrayValue(writing.readiness?.checks),
  ].find(check => text(check?.key) === key && text(check?.status) !== 'pass')
}

