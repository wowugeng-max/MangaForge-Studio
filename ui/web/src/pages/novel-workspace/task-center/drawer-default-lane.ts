import type { SafeBatchRecoveryFocusSnapshot } from './drawer-safe-batch'
import {
  compactChapterNos,
  compactEvidenceText,
  isDefaultFiveChapterLaneRequirementKey,
  normalizeChapterNos,
  normalizeEvidenceTextList,
} from './drawer-model'
import type { RepairTaskTagMeta } from './drawer-recovery-evidence'

/** Default-lane template repair tags/focus helpers for task center. */

const DEFAULT_LANE_TEMPLATE_REQUIREMENTS = [
  { key: 'default_lane_segment_duty', label: '默认档位段位职责' },
  { key: 'default_lane_conflict_rotation', label: '冲突轮换' },
  { key: 'default_lane_payoff_density', label: '回报密度' },
  { key: 'default_lane_ending_hook_template', label: '章末追读模板' },
]

export type DefaultLaneObligationStatus = {
  key: string
  label: string
  status: 'fulfilled' | 'missing' | 'unverified'
  text: string
  color: string
}

export type DefaultLaneProductionRelapseClosure = {
  status: string
  templateVersionId: string
  defaultBatchChapterNos: number[]
  validationChapterNos: number[]
  remainingFailureReasons: string[]
  clearedFailureReasons: string[]
  failedRequirements: Array<{ key: string; label: string; failureReason: string }>
  closeText: string
  detailText: string
}

function structureDecisionRepairReviewOfTask(task: any) {
  return task?.safe_batch_expansion_structure_decision_review
    || task?.safeBatchExpansionStructureDecisionReview
    || task?.payload?.safe_batch_expansion_structure_decision_review
    || task?.payload?.safeBatchExpansionStructureDecisionReview
    || null
}

function structureRepairReviewOfTask(task: any) {
  return task?.safe_batch_expansion_structure_review
    || task?.safeBatchExpansionStructureReview
    || task?.payload?.safe_batch_expansion_structure_review
    || task?.payload?.safeBatchExpansionStructureReview
    || null
}

function defaultLaneRedesignOfTask(task: any) {
  const review = structureDecisionRepairReviewOfTask(task)
  return review?.default_five_chapter_lane_redesign
    || review?.defaultFiveChapterLaneRedesign
    || null
}

function defaultLaneTemplateRedesignQueueOfTask(task: any) {
  const review = structureRepairReviewOfTask(task)
  const queue = review?.default_five_chapter_lane_template_redesign_queue
    || review?.defaultFiveChapterLaneTemplateRedesignQueue
    || null
  if (!queue || queue.visible === false) return null
  return queue
}

function defaultLaneTemplateRepairOfTask(task: any) {
  const review = structureRepairReviewOfTask(task)
  const repair = review?.default_five_chapter_lane_template_repair
    || review?.defaultFiveChapterLaneTemplateRepair
    || null
  if (!repair || repair.visible === false) return null
  return repair
}

function defaultLaneTemplateRepairProductionFailedRequirementsOfTask(task: any) {
  const repair = defaultLaneTemplateRepairOfTask(task)
  if (!repair) return []
  const verdict = repair.production_relapse_verdict || repair.productionRelapseVerdict || null
  const rawRequirements = Array.isArray(repair.production_failed_requirements)
    ? repair.production_failed_requirements
    : Array.isArray(repair.productionFailedRequirements)
      ? repair.productionFailedRequirements
      : Array.isArray(verdict?.failed_requirements)
        ? verdict.failed_requirements
        : Array.isArray(verdict?.failedRequirements)
          ? verdict.failedRequirements
          : []
  return rawRequirements
    .map((item: any) => ({
      key: compactEvidenceText(item?.key || ''),
      label: compactEvidenceText(item?.label || item?.name || item?.key || ''),
      failureReason: compactEvidenceText(item?.failure_reason || item?.failureReason || ''),
    }))
    .filter((item: any) => item.key || item.label || item.failureReason)
}

function defaultLaneTemplateProductionRelapseClosureOfTask(task: any): DefaultLaneProductionRelapseClosure | null {
  const repair = defaultLaneTemplateRepairOfTask(task)
  if (!repair) return null
  const verdict = repair.production_relapse_verdict || repair.productionRelapseVerdict || null
  if (verdict?.visible === false) return null
  const failedRequirements = defaultLaneTemplateRepairProductionFailedRequirementsOfTask(task)
  const status = compactEvidenceText(verdict?.status || repair.production_relapse_status || repair.productionRelapseStatus || '')
  const remainingFailureReasons = normalizeEvidenceTextList(verdict?.remaining_failure_reasons || verdict?.remainingFailureReasons)
  const clearedFailureReasons = normalizeEvidenceTextList(verdict?.cleared_failure_reasons || verdict?.clearedFailureReasons)
  const defaultBatchChapterNos = normalizeChapterNos(verdict?.default_batch_chapter_nos || verdict?.defaultBatchChapterNos)
  const validationChapterNos = normalizeChapterNos(verdict?.validation_chapter_nos || verdict?.validationChapterNos || repair.validation_chapter_nos || repair.validationChapterNos)
  const templateVersionId = compactEvidenceText(verdict?.template_version_id || verdict?.templateVersionId || repair.template_version_id || repair.templateVersionId || '')
  if (!status && !failedRequirements.length && !remainingFailureReasons.length && !defaultBatchChapterNos.length) return null
  const detailParts = [
    templateVersionId ? `模板版本：${templateVersionId}` : '',
    defaultBatchChapterNos.length ? `真实复发批：${compactChapterNos(defaultBatchChapterNos)}` : '',
    validationChapterNos.length ? `验证批：${compactChapterNos(validationChapterNos)}` : '',
    remainingFailureReasons.length ? `仍复发维度：${remainingFailureReasons.join('、')}` : '',
    clearedFailureReasons.length ? `已修复维度：${clearedFailureReasons.join('、')}` : '',
    failedRequirements.length ? `生产失败项：${failedRequirements.map(item => item.failureReason || item.label || item.key).filter(Boolean).join('、')}` : '',
  ].filter(Boolean)
  return {
    status,
    templateVersionId,
    defaultBatchChapterNos,
    validationChapterNos,
    remainingFailureReasons,
    clearedFailureReasons,
    failedRequirements,
    closeText: '等待生产后验验证批：下一轮以 production_relapse_verdict.status=passed 关闭，且 remaining_failure_reasons 为空。',
    detailText: detailParts.join('；'),
  }
}

function defaultLaneFailedRequirementsOfTask(task: any) {
  const review = structureDecisionRepairReviewOfTask(task)
  const failedItems = Array.isArray(review?.failed_items)
    ? review.failed_items
    : Array.isArray(review?.failedItems)
      ? review.failedItems
      : []
  const explicitMissed = Array.isArray(review?.default_five_chapter_lane_redesign?.missed_requirements)
    ? review.default_five_chapter_lane_redesign.missed_requirements
    : Array.isArray(review?.defaultFiveChapterLaneRedesign?.missedRequirements)
      ? review.defaultFiveChapterLaneRedesign.missedRequirements
      : []
  const byKey = new Map<string, { key: string; label: string; count: number }>()
  ;[...failedItems, ...explicitMissed].forEach((item: any) => {
    const key = compactEvidenceText(item?.key || '')
    if (!isDefaultFiveChapterLaneRequirementKey(key)) return
    const current = byKey.get(key)
    byKey.set(key, {
      key,
      label: compactEvidenceText(item?.label || key),
      count: Math.max(Number(current?.count || 0), Number(item?.count || 1)),
    })
  })
  return Array.from(byKey.values())
    .sort((a, b) => {
      const orderA = DEFAULT_LANE_TEMPLATE_REQUIREMENTS.findIndex(item => item.key === a.key)
      const orderB = DEFAULT_LANE_TEMPLATE_REQUIREMENTS.findIndex(item => item.key === b.key)
      return (orderA < 0 ? 99 : orderA) - (orderB < 0 ? 99 : orderB)
    })
}

export function buildDefaultLaneRepairTaskTags(task: any): RepairTaskTagMeta[] {
  const issueType = compactEvidenceText(task?.issue_type || task?.issueType)
  if (issueType === 'safe_batch_expansion_structure_repair') {
    const tags: RepairTaskTagMeta[] = []
    const redesignQueue = defaultLaneTemplateRedesignQueueOfTask(task)
    if (redesignQueue) {
      const topFailed = redesignQueue.top_failed_requirement || redesignQueue.topFailedRequirement || null
      const topFailedKey = compactEvidenceText(topFailed?.key || '')
      const topFailedLabel = compactEvidenceText(topFailed?.label || topFailed?.key || '')
      tags.push({ key: 'default_lane_template_redesign', label: '默认档位模板重构', color: 'gold' })
      if (topFailedKey && topFailedLabel) {
        tags.push({ key: topFailedKey, label: `重写${topFailedLabel}`, color: 'gold' })
      }
    }
    const templateRepair = defaultLaneTemplateRepairOfTask(task)
    const productionRelapseVerdict = templateRepair?.production_relapse_verdict
      || templateRepair?.productionRelapseVerdict
      || null
    const productionRelapseStatus = compactEvidenceText(productionRelapseVerdict?.status || '')
    const productionFailedRequirements = defaultLaneTemplateRepairProductionFailedRequirementsOfTask(task)
    if (productionRelapseStatus === 'failed' || productionFailedRequirements.length) {
      tags.push({ key: 'default_lane_production_relapse', label: '生产后验仍复发', color: 'gold' })
      productionFailedRequirements.slice(0, 4).forEach(item => {
        const key = item.key || item.failureReason || item.label
        const label = item.failureReason ? `${item.failureReason}未修` : `重修${item.label || item.key}`
        if (key && label) tags.push({ key, label, color: 'gold' })
      })
    } else if (productionRelapseStatus === 'passed') {
      tags.push({ key: 'default_lane_production_repaired', label: '生产后验已修复', color: 'green' })
    }
    if (!tags.length) return []
    return tags
  }
  if (issueType !== 'safe_batch_expansion_structure_decision_mismatch') return []
  const missedRequirements = defaultLaneFailedRequirementsOfTask(task)
  const redesign = defaultLaneRedesignOfTask(task)
  if (!redesign && !missedRequirements.length) return []
  const relapseCount = Number(redesign?.relapse_count ?? redesign?.relapseCount ?? 0)
  const tags: RepairTaskTagMeta[] = [
    { key: 'default_lane_template', label: '默认档位模板', color: 'gold' },
    ...missedRequirements.slice(0, 4).map(item => ({
      key: item.key,
      label: `缺${item.label}`,
      color: 'gold',
    })),
  ]
  if (Number.isFinite(relapseCount) && relapseCount > 0) {
    tags.push({ key: 'default_lane_relapse', label: `连续失效${relapseCount}次`, color: 'gold' })
  }
  return tags
}

export function repairTaskFocusRequirementMatches(requirementKey: string, task: any) {
  if (!requirementKey) return true
  if (requirementKey === 'default_lane_template') return buildDefaultLaneRepairTaskTags(task).length > 0
  return defaultLaneFailedRequirementsOfTask(task).some(item => item.key === requirementKey)
}

export function buildDefaultLaneFocusObligationStatuses(
  focus: SafeBatchRecoveryFocusSnapshot | null | undefined,
  activeItems: any[],
  resolvedItems: any[],
): DefaultLaneObligationStatus[] {
  if (focus?.requirementKey !== 'default_lane_template') return []
  if (!activeItems.length && !resolvedItems.length) return []
  const activeFailed = new Set(activeItems.flatMap((item: any) => (
    [
      ...defaultLaneFailedRequirementsOfTask(item?.task || item).map(requirement => requirement.key),
      ...defaultLaneTemplateRepairProductionFailedRequirementsOfTask(item?.task || item).map(requirement => requirement.key),
    ]
  )))
  const resolvedFailed = new Set(resolvedItems.flatMap((item: any) => (
    [
      ...defaultLaneFailedRequirementsOfTask(item?.task || item).map(requirement => requirement.key),
      ...defaultLaneTemplateRepairProductionFailedRequirementsOfTask(item?.task || item).map(requirement => requirement.key),
    ]
  )))
  return DEFAULT_LANE_TEMPLATE_REQUIREMENTS.map(requirement => {
    if (activeFailed.has(requirement.key)) {
      return {
        ...requirement,
        status: 'missing' as const,
        text: `${requirement.label}待补齐`,
        color: 'gold',
      }
    }
    if (resolvedItems.length > 0) {
      const text = resolvedFailed.has(requirement.key)
        ? `${requirement.label}已补齐`
        : `${requirement.label}已具备`
      return {
        ...requirement,
        status: 'fulfilled' as const,
        text,
        color: 'green',
      }
    }
    return {
      ...requirement,
      status: 'unverified' as const,
      text: `${requirement.label}待确认`,
      color: 'default',
    }
  })
}

export function buildDefaultLaneProductionRelapseClosure(
  focus: SafeBatchRecoveryFocusSnapshot | null | undefined,
  activeItems: any[],
  resolvedItems: any[],
): DefaultLaneProductionRelapseClosure | null {
  if (focus?.requirementKey !== 'default_lane_template') return null
  const closures = [...activeItems, ...resolvedItems]
    .map((item: any) => defaultLaneTemplateProductionRelapseClosureOfTask(item?.task || item))
    .filter(Boolean) as DefaultLaneProductionRelapseClosure[]
  if (!closures.length) return null
  return closures.find(item => item.status === 'failed' || item.remainingFailureReasons.length > 0 || item.failedRequirements.length > 0)
    || closures[0]
}

