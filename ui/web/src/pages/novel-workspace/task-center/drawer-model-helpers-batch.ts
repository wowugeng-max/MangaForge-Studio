import { parseJsonValue } from './chapter-group'

import {
  compactEvidenceText,
} from './drawer-model-helpers-basics'
import {
  isNextChapterQualityPlanTask,
  taskText,
} from './drawer-model-helpers-quality'
import {
  deliveryRiskIssueMeta,
  isSceneCardDirectiveTask,
  isResolvedRepairTaskStatus,
  repairClosureIssueMeta,
  repairTaskIssueType,
  type RepairClosureHighlight,
} from './drawer-model-helpers-repair'

export function compactChapterNos(chapterNos: number[]) {
  if (!chapterNos.length) return '相关章节'
  return `第${chapterNos.slice(0, 6).join('、')}章${chapterNos.length > 6 ? `等${chapterNos.length}章` : ''}`
}

export function normalizeChapterNos(value: any) {
  return (Array.isArray(value) ? value : [])
    .map((chapterNo: any) => Number(chapterNo))
    .filter((chapterNo: number) => Number.isFinite(chapterNo) && chapterNo > 0)
}

function postBatchQualityStatusMeta(status?: string) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'ok' || normalized === 'success' || normalized === 'passed') return { status: 'ok', label: '通过', color: 'green' }
  if (normalized === 'warn' || normalized === 'warning' || normalized === 'needs_review') return { status: 'warn', label: '需复核', color: 'gold' }
  if (normalized === 'failed' || normalized === 'error') return { status: 'failed', label: '失败', color: 'red' }
  return { status: normalized || 'unknown', label: '未确认', color: 'default' }
}

function postBatchQualityChapterText(chapterNos: number[]) {
  if (!chapterNos.length) return '相关章节'
  const sorted = [...new Set(chapterNos)].sort((a, b) => a - b)
  const continuous = sorted.every((chapterNo, index) => index === 0 || chapterNo === sorted[index - 1] + 1)
  if (continuous && sorted.length > 1) return `第${sorted[0]}-${sorted[sorted.length - 1]}章`
  return compactChapterNos(sorted)
}

export function buildPostBatchQualityCheckSummary(run: any = {}) {
  const output = parseJsonValue(run.output_ref || run.outputRef) || run.payload || {}
  const raw = output.post_batch_quality_check || output.postBatchQualityCheck
  if (!raw || typeof raw !== 'object') return null
  const checks = (Array.isArray(raw.checks) ? raw.checks : []).map((check: any) => {
    const meta = postBatchQualityStatusMeta(check?.status)
    const warningCount = Number(check?.warn_count ?? check?.warnCount ?? 0) || (meta.status === 'warn' ? 1 : 0)
    return {
      key: String(check?.key || ''),
      label: String(check?.label || check?.key || '检查项'),
      status: meta.status,
      statusLabel: meta.label,
      statusColor: meta.color,
      checkedCount: Number(check?.checked_count ?? check?.checkedCount ?? 0) || 0,
      warningCount,
      unknownCount: Number(check?.unknown_count ?? check?.unknownCount ?? 0) || 0,
      summaries: (Array.isArray(check?.summaries) ? check.summaries : [])
        .map((item: any) => String(item || '').trim())
        .filter(Boolean),
    }
  }).filter((check: any) => check.key || check.label)
  const meta = postBatchQualityStatusMeta(raw.status)
  const chapterNos = normalizeChapterNos(raw.chapter_nos || raw.chapterNos)
  return {
    visible: true,
    title: '批次质检',
    source: String(raw.source || ''),
    status: meta.status,
    statusLabel: meta.label,
    statusColor: meta.color,
    completedCount: Number(raw.completed_count ?? raw.completedCount ?? chapterNos.length) || 0,
    chapterNos,
    chapterText: postBatchQualityChapterText(chapterNos),
    revisedCount: Number(raw.revised_count ?? raw.revisedCount ?? 0) || 0,
    averageScore: Number.isFinite(Number(raw.average_score ?? raw.averageScore)) ? Number(raw.average_score ?? raw.averageScore) : null,
    warningCount: checks.reduce((sum: number, check: any) => sum + (Number(check.warningCount) || 0), 0),
    checks,
  }
}

export type ProductionRelapseCtaExecutionSnapshot = {
  visible: boolean
  source: string
  kind: string
  label: string
  templateVersionId: string
  defaultBatchChapterNos: number[]
  validationChapterNos: number[]
  clearedFailureReasons: string[]
  remainingFailureReasons: string[]
  targetChapterCount: number
  summary: string
}

export function buildProductionRelapseCtaExecutionSnapshot(batchPreflight: any): ProductionRelapseCtaExecutionSnapshot | null {
  const raw = batchPreflight?.production_relapse_cta_execution
    || batchPreflight?.productionRelapseCtaExecution
    || batchPreflight
    || null
  if (!raw || typeof raw !== 'object') return null
  const source = compactEvidenceText(raw.source)
  const kind = compactEvidenceText(raw.kind)
  const label = compactEvidenceText(raw.label || kind || '生产后验 CTA')
  const templateVersionId = compactEvidenceText(raw.template_version_id || raw.templateVersionId)
  const clearedFailureReasons = normalizeEvidenceTextList(raw.cleared_failure_reasons || raw.clearedFailureReasons)
  const remainingFailureReasons = normalizeEvidenceTextList(raw.remaining_failure_reasons || raw.remainingFailureReasons)
  const defaultBatchChapterNos = normalizeChapterNos(raw.default_batch_chapter_nos || raw.defaultBatchChapterNos)
  const validationChapterNos = normalizeChapterNos(raw.validation_chapter_nos || raw.validationChapterNos)
  const targetChapterCount = Number(raw.target_chapter_count || raw.targetChapterCount || 0)
  const hasEvidence = Boolean(source || kind || label || templateVersionId || clearedFailureReasons.length || remainingFailureReasons.length || defaultBatchChapterNos.length || validationChapterNos.length || targetChapterCount)
  if (!hasEvidence) return null
  return {
    visible: true,
    source,
    kind,
    label,
    templateVersionId,
    defaultBatchChapterNos,
    validationChapterNos,
    clearedFailureReasons,
    remainingFailureReasons,
    targetChapterCount: Number.isFinite(targetChapterCount) ? targetChapterCount : 0,
    summary: `生产后验 CTA：${label}；模板 ${templateVersionId || '当前模板'}；已修复 ${clearedFailureReasons.length ? clearedFailureReasons.join('、') : '无'}；剩余 ${remainingFailureReasons.length ? remainingFailureReasons.join('、') : '无'}。`,
  }
}

export function normalizeEvidenceTextList(value: any) {
  return (Array.isArray(value) ? value : [])
    .map((item: any) => compactEvidenceText(item))
    .filter(Boolean)
}

export function buildRepairClosureHighlights(tasks: any[], audit?: any | null): RepairClosureHighlight[] {
  const groups = new Map<string, {
    label: string
    color: string
    chapterNos: Set<number>
    issueTypes: Set<string>
    count: number
  }>()

  for (const task of Array.isArray(tasks) ? tasks : []) {
    if (!isResolvedRepairTaskStatus(task?.task_status ?? task?.status)) continue
    const meta = repairClosureIssueMeta(task)
    if (!meta) continue
    const group = groups.get(meta.key) || {
      label: meta.label,
      color: meta.color,
      chapterNos: new Set<number>(),
      issueTypes: new Set<string>(),
      count: 0,
    }
    const chapterNo = Number(task?.chapter_no || task?.chapterNo || 0)
    if (Number.isFinite(chapterNo) && chapterNo > 0) group.chapterNos.add(chapterNo)
    const issueType = repairTaskIssueType(task) || String(task?.annotation_category || task?.annotationCategory || meta.key || '')
    if (issueType) group.issueTypes.add(issueType)
    group.count += 1
    groups.set(meta.key, group)
  }

  const auditClosed = String(audit?.status || '') === 'closed'
  return Array.from(groups.entries())
    .map(([key, group]) => {
      const chapterNos = Array.from(group.chapterNos).sort((a, b) => a - b)
      const issueTypes = Array.from(group.issueTypes)
      return {
        key,
        label: `${group.label}风险已清`,
        color: group.color,
        count: group.count,
        chapterNos,
        issueTypes,
        detail: `${compactChapterNos(chapterNos)} ${group.label}风险已处理，${auditClosed ? '修复审计已闭环' : '可等待或继续执行复检收敛'}。`,
      }
    })
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 6)
}

export function buildRepairTaskIssueTagMeta(_task: any): { label: string; color: string } | null {
  const task = _task || {}
  const issueType = repairTaskIssueType(task)
  if (isSceneCardDirectiveTask(task)) return { label: '场景卡执行', color: 'volcano' }
  if (issueType === 'batch_brief_mismatch') return { label: '批次计划', color: 'purple' }
  if (['recovery_evidence_mismatch', 'recovery_evidence_governance_queue'].includes(issueType)) return { label: '恢复依据', color: 'purple' }
  if (issueType === 'style_sample_task_book_rebuild') return { label: '样章任务书', color: 'purple' }
  if (String(task?.source || '') === 'reader_trial_review' || issueType === 'reader_trial_drop_point') return { label: '读者试读', color: 'red' }
  if (issueType === 'volume_segment_missed') return { label: '卷级阶段', color: 'gold' }
  if (issueType === 'safe_batch_expansion_structure_decision_mismatch') return { label: '扩批结构决策', color: 'blue' }
  if (issueType === 'safe_batch_expansion_structure_repair') return { label: '扩批结构', color: 'blue' }
  if (issueType === 'safe_batch_expansion_segment_hotspot') return { label: '扩批分段', color: 'blue' }
  if (issueType === 'reader_pull_missed') return { label: '读者拉力', color: 'magenta' }
  if (issueType === 'target_reader_gap') return { label: '目标读者', color: 'magenta' }
  if (issueType === 'genre_positioning_gap') return { label: '题材定位', color: 'purple' }
  if (issueType === 'female_audience_gap') return { label: '女频长篇', color: 'magenta' }
  if (issueType === 'upgrade_rhythm_gap') return { label: '升级节奏', color: 'gold' }
  if (issueType === 'chapter_structure_gap') return { label: '章节结构', color: 'blue' }
  if (issueType === 'chapter_progression_gap') return { label: '章节推进', color: 'gold' }
  if (issueType === 'information_load_gap') return { label: '信息负载', color: 'cyan' }
  if (issueType === 'longform_continuity_gap') return { label: '长篇连续性', color: 'blue' }
  if (issueType === 'next_chapter_quality_plan') return { label: '质量续航', color: 'gold' }
  if (issueType === 'write_preparation_receipts_gap') return { label: '写前准备', color: 'cyan' }
  if (issueType === 'status_filter_receipts_gap') return { label: '状态筛选', color: 'blue' }
  if (issueType === 'core_contract_gap') return { label: '核心契约', color: 'red' }
  if (issueType === 'continuity_heat_gap') return { label: '连续性热度', color: 'orange' }
  if (issueType === 'revision_receipt_gap') return { label: '修订回执', color: 'purple' }
  if (issueType === 'deslop_repair_gap') return { label: '去AI味修复', color: 'red' }
  if (issueType === 'prose_meta_gap') return { label: '正文元叙事', color: 'red' }
  if (issueType === 'serial_risk_repair_gap') return { label: '连续风险修复', color: 'gold' }
  if (issueType === 'chapter_hook_quality_gap') return { label: '章钩质量', color: 'orange' }
  if (issueType === 'title_uniqueness_gap') return { label: '标题去重', color: 'blue' }
  if (issueType === 'blueprint_consumption_gap') return { label: '细纲兑现', color: 'gold' }
  if (issueType === 'foreshadowing_delta_gap') return { label: '伏笔增量', color: 'purple' }
  if (issueType === 'deterministic_cleanup_gap') return { label: '确定性清理', color: 'red' }
  if (issueType === 'story_state_update_gap') return { label: '状态写回', color: 'cyan' }
  if (issueType === 'reader_retention_gap') return { label: '追读雷达', color: 'orange' }
  if (issueType === 'reader_retention_missed') return { label: '追读', color: 'orange' }
  if (issueType === 'intent_confirmation_gap') return { label: '意图确认', color: 'blue' }
  if (issueType === 'benchmark_recall_gap') return { label: '文风召回', color: 'purple' }
  if (issueType === 'style_sample_gap') return { label: '风格', color: 'purple' }
  if (issueType === 'chapter_handoff_gap') return { label: '章首承接', color: 'gold' }
  if (issueType === 'source_readiness_gap') return { label: '来源就绪', color: 'cyan' }
  if (issueType === 'state_tracking_gap') return { label: '状态跟踪', color: 'blue' }
  if (issueType === 'style_boundary_gap') return { label: '风格边界', color: 'purple' }
  if (issueType === 'story_drive_gap') return { label: '故事驱动力', color: 'blue' }
  if (issueType === 'character_arc_gap') return { label: '人物弧光', color: 'pink' }
  if (issueType === 'runway_gap') return { label: '连载航线', color: 'gold' }
  if (issueType === 'quality_audit_gap') return { label: '质量诊断', color: 'gold' }
  if (issueType === 'beat_cooling_gap') return { label: '冷却节奏', color: 'cyan' }
  if (issueType === 'reader_expectation_debt') return { label: '读者期待', color: 'gold' }
  if (issueType === 'reader_payoff_debt') return { label: '读者回报', color: 'orange' }
  if (issueType === 'information_flow_gap') return { label: '信息流', color: 'geekblue' }
  if (issueType === 'expectation_threshold_gap') return { label: '期待阈值', color: 'gold' }
  if (issueType === 'story_loop_gap') return { label: '故事闭环', color: 'cyan' }
  if (issueType === 'emotional_arc_gap') return { label: '情绪弧', color: 'magenta' }
  if (issueType === 'chapter_hook_gap') return { label: '章级钩子', color: 'gold' }
  if (issueType === 'paragraph_hook_gap') return { label: '段落级钩子', color: 'lime' }
  if (issueType === 'suspense_gap') return { label: '悬念编排', color: 'volcano' }
  if (issueType === 'reversal_gap') return { label: '反转设计', color: 'volcano' }
  if (issueType === 'showdown_gap') return { label: '高潮对抗', color: 'red' }
  if (issueType === 'prose_craft_gap') return { label: '正文工艺', color: 'purple' }
  if (issueType === 'payoff_setup_gap') return { label: '爽点铺垫', color: 'gold' }
  if (issueType === 'spectator_reaction_gap') return { label: '围观反应', color: 'magenta' }
  if (issueType === 'punctuation_tone_gap') return { label: '语气标点', color: 'geekblue' }
  if (issueType === 'content_rubric_gap') return { label: '内容基准', color: 'orange' }
  if (issueType === 'asset_linkage_gap') return { label: '资产挂钩', color: 'cyan' }
  if (issueType === 'dialogue_gap') return { label: '对白质量', color: 'blue' }
  if (issueType === 'scene_card_receipts_gap') return { label: '场景回执', color: 'volcano' }
  if (issueType === 'delivery_risk_receipts_gap') return { label: '交稿回执', color: 'volcano' }
  if (issueType === 'revision_context_receipts_gap') return { label: '修订上下文', color: 'geekblue' }
  if (issueType === 'plot_dynamics_gap') return { label: '剧情动力', color: 'geekblue' }
  if (issueType === 'character_relation_gap') return { label: '角色关系', color: 'purple' }
  if (issueType === 'character_behavior_gap') return { label: '角色行为', color: 'magenta' }
  if (issueType === 'conflict_structure_gap') return { label: '冲突结构', color: 'red' }
  if (issueType === 'bridge_unit_gap') return { label: '桥段节奏', color: 'gold' }
  if (issueType === 'opening_gap') return { label: '开篇设计', color: 'orange' }
  if (issueType === 'innovation_execution_missed' || issueType === 'innovation_missed') return { label: '创新/IP', color: 'geekblue' }
  if (String(task?.source || '') === 'rolling_script_room' || issueType === 'script_room_layer_gap') return { label: '剧本室', color: 'blue' }
  if (String(task?.source || '') === 'storyline_diff_decision') return { label: '剧情线决策', color: 'purple' }
  const meta = deliveryRiskIssueMeta(task)
  return meta ? { label: meta.label, color: meta.color } : null
}

