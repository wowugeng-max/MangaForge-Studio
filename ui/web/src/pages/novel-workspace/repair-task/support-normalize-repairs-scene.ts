import type { AnyRecord } from './utils'
import {
  firstText,
  limitedArray,
  objectValue,
  text,
} from './utils'

export function normalizeSceneCardReceiptRepair(task: AnyRecord) {
  const payload = objectValue(task.payload)
  const issueType = firstText(task.issue_type, task.issueType, task.key, task.annotation_key, payload.key)
  const haystack = [
    issueType,
    task.message,
    task.action,
    task.evidence,
    payload.message,
    payload.evidence,
  ].map(item => text(item).toLowerCase()).join(' ')
  if (!haystack.includes('scene_card_receipt') && !haystack.includes('scene_card_receipts')) return null
  const sceneNo = Number(task.scene_no ?? task.sceneNo ?? payload.scene_no ?? payload.sceneNo ?? 0)
  const fields = limitedArray(task.fields, payload.fields)
    .map(item => text(item))
    .filter(Boolean)
  return {
    issueType,
    severity: firstText(task.severity, task.status, payload.severity, payload.status),
    sourceLabel: firstText(task.source_label, task.sourceLabel, task.label, payload.label, '场景卡回执证据复核'),
    sceneNo,
    fields,
    evidence: firstText(task.evidence, payload.evidence, task.message, payload.message),
    fix: firstText(task.action, task.fix, payload.fix, payload.action),
  }
}

export function normalizeSceneCardDirectiveRepair(task: AnyRecord) {
  const payload = objectValue(task.payload)
  const issueType = firstText(task.issue_type, task.issueType, task.key, task.annotation_key, payload.key)
  const haystack = [
    issueType,
    task.annotation_category,
    task.annotationCategory,
    task.source_label,
    task.sourceLabel,
    task.message,
    task.action,
    task.evidence,
    payload.key,
    payload.label,
    payload.message,
    payload.evidence,
  ].map(item => text(item).toLowerCase()).join(' ')
  const isSceneCardDirective = /scene[_\s-]*card[_\s-]*\d+[_\s-]*(execution[_\s-]*directives|forbidden[_\s-]*directives)/i.test(haystack)
    || /场景卡(执行|禁令)/.test(haystack)
  if (!isSceneCardDirective) return null
  const sceneNo = Number(task.scene_no ?? task.sceneNo ?? payload.scene_no ?? payload.sceneNo ?? issueType.match(/scene[_-]card[_-](\d+)/i)?.[1] ?? 0)
  const conceptAnchorRules = limitedArray(
    task.concept_anchor_rules,
    task.conceptAnchorRules,
    payload.concept_anchor_rules,
    payload.conceptAnchorRules,
  ).map(item => text(item)).filter(Boolean)
  const proseCraftDirectives = limitedArray(
    task.prose_craft_directives,
    task.proseCraftDirectives,
    payload.prose_craft_directives,
    payload.proseCraftDirectives,
  ).map(item => text(item)).filter(Boolean)
  return {
    issueType,
    severity: firstText(task.severity, task.status, payload.severity, payload.status),
    sourceLabel: firstText(task.source_label, task.sourceLabel, task.label, payload.label, '场景卡执行禁令'),
    sceneNo,
    evidence: firstText(task.evidence, payload.evidence, task.message, payload.message),
    fix: firstText(task.action, task.fix, payload.fix, payload.action),
    conceptAnchorRules,
    proseCraftDirectives,
  }
}

