import { parseJsonValue } from './chapter-group'

import { compactEvidenceText } from './drawer-model-helpers-basics'

export function taskText(value: any) {
  return String(value ?? '').trim()
}

export function isNextChapterQualityPlanTask(task: any) {
  const payload = task?.payload && typeof task.payload === 'object' ? task.payload : {}
  const fields = [
    task?.issue_type,
    task?.issueType,
    task?.annotation_category,
    task?.annotationCategory,
    task?.category,
    task?.message,
    task?.detail,
    task?.title,
    task?.action,
    task?.summary,
    payload.issue_type,
    payload.issueType,
    payload.message,
    payload.detail,
    payload.reason,
    payload.fix,
  ].map(taskText).filter(Boolean).join(' ')
  return /next_chapter_quality_plan|nextChapterQualityPlan|下一章质量续航计划|质量续航计划缺失|质量续航回执/.test(fields)
}

function qualityPlanItems(value: any, limit = 4) {
  if (Array.isArray(value)) return value.map(item => compactEvidenceText(item, 120)).filter(Boolean).slice(0, limit)
  const single = compactEvidenceText(value, 120)
  return single ? [single] : []
}

function nextChapterQualityPlanFromTask(task: any) {
  const payload = task?.payload && typeof task.payload === 'object' ? task.payload : {}
  const report = task?.report && typeof task.report === 'object' ? task.report : {}
  const deliveryReceipts = task?.oh_story_delivery_receipts
    || task?.ohStoryDeliveryReceipts
    || payload.oh_story_delivery_receipts
    || payload.ohStoryDeliveryReceipts
    || report.oh_story_delivery_receipts
    || report.ohStoryDeliveryReceipts
    || {}
  const candidates = [
    task?.next_chapter_quality_plan,
    task?.nextChapterQualityPlan,
    payload.next_chapter_quality_plan,
    payload.nextChapterQualityPlan,
    report.next_chapter_quality_plan,
    report.nextChapterQualityPlan,
    deliveryReceipts.next_chapter_quality_plan,
    deliveryReceipts.nextChapterQualityPlan,
  ]
  return candidates.find(item => item && typeof item === 'object') || null
}

function nextChapterQualityPlanMissingReason(task: any) {
  return [
    task?.detail,
    task?.message,
    task?.title,
    task?.action,
    task?.summary,
    task?.payload?.detail,
    task?.payload?.message,
    task?.payload?.reason,
    task?.payload?.fix,
  ].map(item => compactEvidenceText(item, 180))
    .find(item => /next_chapter_quality_plan|nextChapterQualityPlan|下一章质量续航计划|质量续航计划缺失|质量续航回执/.test(item)) || ''
}

export function buildNextChapterQualityPlanPreview(task: any): {
  visible: boolean
  label: string
  qualityFocus: string[]
  openingActions: string[]
  middleActions: string[]
  endingActions: string[]
  avoidRepetition: string[]
  evidenceBasis: string[]
  missingReason: string
} | null {
  const plan = nextChapterQualityPlanFromTask(task)
  const preview = {
    visible: true,
    label: '质量续航计划',
    qualityFocus: qualityPlanItems(plan?.quality_focus || plan?.qualityFocus),
    openingActions: qualityPlanItems(plan?.opening_actions || plan?.openingActions),
    middleActions: qualityPlanItems(plan?.middle_actions || plan?.middleActions),
    endingActions: qualityPlanItems(plan?.ending_actions || plan?.endingActions),
    avoidRepetition: qualityPlanItems(plan?.avoid_repetition || plan?.avoidRepetition || plan?.forbidden_repeats || plan?.forbiddenRepeats),
    evidenceBasis: qualityPlanItems(plan?.evidence_basis || plan?.evidenceBasis),
    missingReason: plan ? '' : nextChapterQualityPlanMissingReason(task),
  }
  const hasPlanContent = preview.qualityFocus.length
    || preview.openingActions.length
    || preview.middleActions.length
    || preview.endingActions.length
    || preview.avoidRepetition.length
    || preview.evidenceBasis.length
  if (!hasPlanContent && !preview.missingReason && !isNextChapterQualityPlanTask(task)) return null
  return preview
}

