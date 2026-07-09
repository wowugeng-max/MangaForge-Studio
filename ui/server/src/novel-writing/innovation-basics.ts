import { anchorMatchScore } from './text-matching'

function compactText(value: any, limit = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function asArray(value: any) {
  if (Array.isArray(value)) return value
  return value === undefined || value === null || value === '' ? [] : [value]
}

function firstDefined(...values: any[]) {
  return values.find(value => value !== undefined && value !== null && value !== '')
}

function uniqueBriefStrings(values: any, limit = 12) {
  const seen = new WeakSet<object>()
  const flattenBriefValues = (value: any, depth = 0): any[] => {
    if (depth > 6) return []
    if (Array.isArray(value)) return value.flatMap(item => flattenBriefValues(item, depth + 1))
    if (value && typeof value === 'object') {
      if (seen.has(value)) return []
      seen.add(value)
      return Object.values(value).flatMap(item => flattenBriefValues(item, depth + 1))
    }
    return value ? [value] : []
  }
  return Array.from(new Set(flattenBriefValues(values)
    .map(value => compactText(value))
    .filter(Boolean))).slice(0, limit)
}

export function normalizeInnovationBrief(value: any) {
  const raw = value?.innovation_brief || value?.innovationBrief || value || {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const normalized = {
    chapter_angle: compactText(raw.chapter_angle || raw.chapterAngle || raw.angle),
    execution_points: uniqueBriefStrings(raw.execution_points || raw.executionPoints || raw.actions || [], 8),
    differentiation_guardrails: uniqueBriefStrings(raw.differentiation_guardrails || raw.differentiationGuardrails || raw.guardrails || [], 8),
    ip_adaptation_hooks: uniqueBriefStrings(raw.ip_adaptation_hooks || raw.ipAdaptationHooks || raw.ip_hooks || raw.ipHooks || [], 8),
  }
  const hasContent = Boolean(
    normalized.chapter_angle
    || normalized.execution_points.length
    || normalized.differentiation_guardrails.length
    || normalized.ip_adaptation_hooks.length,
  )
  return hasContent ? normalized : null
}

export function buildChapterInnovationBrief(project: any, contextPackage: any, sceneBriefs: any[], longformCompass: any) {
  const compactPoint = (item: any) => compactText(item).replace(/[。.!！?？]+$/g, '')
  const chapterTarget = contextPackage?.chapter_target || {}
  const writingBible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const commercial = writingBible?.commercial_positioning || project?.reference_config?.writing_bible?.commercial_positioning || {}
  const innovationAxis = asArray(longformCompass?.axes).find((axis: any) => String(axis?.key || '') === 'innovation_hook')
  const worldAxis = asArray(longformCompass?.axes).find((axis: any) => String(axis?.key || '') === 'world_hook')
  const executionPoints = [
    ...sceneBriefs.map((item: any) => item.reader_payoff),
    ...sceneBriefs.map((item: any) => item.rule_pressure),
    ...sceneBriefs.map((item: any) => item.reversal),
    chapterTarget.signature_scene_brief?.signature_scene,
    chapterTarget.signature_scene_brief?.reader_payoff,
    chapterTarget.reader_payoff,
  ].map(compactPoint).filter(Boolean)
  const ipHooks = [
    ...sceneBriefs.map((item: any) => item.title),
    ...sceneBriefs.map((item: any) => item.short_drama_scene),
    ...sceneBriefs.map((item: any) => item.conflict),
    chapterTarget.signature_scene_brief?.signature_scene,
    chapterTarget.short_drama_scene,
  ].map(compactPoint).filter(Boolean)
  const chapterAngle = compactText(firstDefined(
    chapterTarget.innovation_angle,
    chapterTarget.innovation_hook,
    innovationAxis?.value,
    writingBible?.innovation_hook,
    commercial?.innovation_hook,
    asArray(commercial?.selling_points)[0],
    worldAxis?.value,
  ))
  const guardrails = Array.from(new Set([
    '不得写成普通开挂碾压',
    '不得把创新卖点降级成通用套路桥段',
    '新增人物、道具、支线必须服务本章创新角度和长期读者承诺',
    ...asArray(chapterTarget.innovation_guardrails),
    ...asArray(chapterTarget.differentiation_guardrails),
  ].map((item: any) => compactText(item)).filter(Boolean))).slice(0, 8)

  const hasContent = chapterAngle || executionPoints.length || guardrails.length || ipHooks.length
  if (!hasContent) return null
  return {
    chapter_angle: chapterAngle,
    execution_points: Array.from(new Set(executionPoints)).slice(0, 8),
    differentiation_guardrails: guardrails,
    ip_adaptation_hooks: Array.from(new Set(ipHooks)).slice(0, 8),
  }
}

export function normalizeInnovationBeat(key: string, label: string, value: any) {
  const text = compactText(value, 180)
  return text ? { key, label, text } : null
}

export function innovationBeatMatch(beat: any, chapterText: string) {
  const match = anchorMatchScore(beat.text, chapterText)
  const key = String(beat.key || '')
  const threshold = key === 'chapter_angle'
    ? 22
    : key.startsWith('differentiation_guardrail')
      ? 38
      : 44
  const delivered = match.score >= threshold || (key === 'chapter_angle' && match.score >= 20 && asArray(match.matched).length >= 2)
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered,
  }
}
