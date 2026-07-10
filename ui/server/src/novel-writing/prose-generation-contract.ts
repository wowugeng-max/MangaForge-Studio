export interface ProseGenerationContract {
  version: 'prose_generation_contract_v1'
  chapter: Readonly<{
    id: number
    chapter_no: number
    title: string
    goal: string
    summary: string
    conflict: string
    ending_hook: string
    previous_handoff: any
    word_target: any
    scene_cards: readonly any[]
  }>
  preflight: Readonly<any>
  director: Readonly<any>
  context: Readonly<any>
}

const REQUEST_OVERRIDE_FIELDS = [
  ['longform_compass', 'longformCompass'],
  ['longform_battle_context', 'longformBattleContext'],
  ['next_batch_brief', 'nextBatchBrief'],
  ['chapter_launch_gate', 'chapterLaunchGate'],
  ['batch_preflight', 'batchPreflight'],
  ['million_word_runway', 'millionWordRunway'],
] as const

const REQUEST_OVERRIDE_MAX_STRING = 800
const REQUEST_OVERRIDE_MAX_ARRAY = 12
const REQUEST_OVERRIDE_MAX_DEPTH = 5
const REQUEST_OVERRIDE_DROP_KEYS = new Set([
  'context_package',
  'contextPackage',
  'raw_payload',
  'rawPayload',
  'pipeline',
  'chapters',
  'chapter_text',
  'chapterText',
  'full_text',
  'fullText',
  'prompt',
  'messages',
  'debug',
  'diagnostics',
])

export function compactProseGenerationOverride(
  value: any,
  key = '',
  depth = 0,
  seen = new WeakSet<object>(),
): any {
  if (REQUEST_OVERRIDE_DROP_KEYS.has(key)) return undefined
  if (value === null || value === undefined) return value
  const valueType = typeof value
  if (valueType === 'string') {
    const text = value.trim()
    return text.length > REQUEST_OVERRIDE_MAX_STRING
      ? `${text.slice(0, REQUEST_OVERRIDE_MAX_STRING)}...`
      : text
  }
  if (valueType === 'number' || valueType === 'boolean') return value
  if (valueType === 'bigint') return String(value)
  if (valueType !== 'object') return String(value)
  if (seen.has(value)) return '[Circular]'
  if (depth >= REQUEST_OVERRIDE_MAX_DEPTH) return undefined

  seen.add(value)
  if (Array.isArray(value)) {
    const items = value
      .slice(0, REQUEST_OVERRIDE_MAX_ARRAY)
      .map(item => compactProseGenerationOverride(item, '', depth + 1, seen))
      .filter(item => item !== undefined)
    seen.delete(value)
    return items
  }

  const output: Record<string, any> = {}
  for (const [childKey, childValue] of Object.entries(value)) {
    const compacted = compactProseGenerationOverride(childValue, childKey, depth + 1, seen)
    if (compacted !== undefined) output[childKey] = compacted
  }
  seen.delete(value)
  return output
}

function firstField(source: any, snake: string, camel: string) {
  return source?.[snake] ?? source?.[camel]
}

export function mergeProseGenerationRequestOverrides(contextPackage: any, request: any = {}) {
  const merged = {
    ...(contextPackage || {}),
    chapter_target: { ...(contextPackage?.chapter_target || {}) },
  }

  for (const [snake, camel] of REQUEST_OVERRIDE_FIELDS) {
    const raw = firstField(request, snake, camel)
    if (raw == null) continue
    const value = compactProseGenerationOverride(raw)
    merged[snake] = value
    merged.chapter_target[snake] = value
  }

  const batchPreflight = merged.batch_preflight || merged.chapter_target.batch_preflight
  if (batchPreflight) {
    const deliveryRiskCarryOver = compactProseGenerationOverride(
      firstField(batchPreflight, 'delivery_risk_carry_over', 'deliveryRiskCarryOver'),
    )
    const chapterHandoffContract = compactProseGenerationOverride(
      firstField(batchPreflight, 'chapter_handoff_contract', 'chapterHandoffContract'),
    )
    const previousHandoff = firstField(chapterHandoffContract, 'previous_handoff', 'previousHandoff')

    if (deliveryRiskCarryOver) {
      merged.delivery_risk_carry_over = deliveryRiskCarryOver
      merged.chapter_target.delivery_risk_carry_over = deliveryRiskCarryOver
    }
    if (chapterHandoffContract) {
      merged.chapter_handoff_contract = chapterHandoffContract
      merged.chapter_target.chapter_handoff_contract = chapterHandoffContract
    }
    if (previousHandoff) {
      merged.previous_handoff = previousHandoff
      merged.chapter_target.previous_handoff = previousHandoff
    }
  }

  return merged
}

export function normalizeProseContractKey(value: any) {
  return String(value ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase()
    .replace(/_contract$/, '')
}

function cloneValue<T>(value: T): T {
  return structuredClone(value)
}

function deepFreeze<T>(value: T, seen = new WeakSet<object>()): T {
  if (!value || typeof value !== 'object' || seen.has(value as object)) return value
  seen.add(value as object)
  Object.values(value as any).forEach(item => deepFreeze(item, seen))
  return Object.freeze(value)
}

export function buildProseGenerationContract(contextPackage: any): ProseGenerationContract {
  const context = cloneValue(contextPackage || {})
  const target = {
    ...(context.chapter_target || {}),
    ...(context.chapterTarget || {}),
  }

  return deepFreeze({
    version: 'prose_generation_contract_v1',
    chapter: {
      id: Number(target.id || 0),
      chapter_no: Number(target.chapter_no ?? target.chapterNo ?? 0),
      title: String(target.title || ''),
      goal: String(target.goal || target.chapter_goal || target.chapterGoal || ''),
      summary: String(target.summary || ''),
      conflict: String(target.conflict || ''),
      ending_hook: String(target.ending_hook || target.endingHook || ''),
      previous_handoff: target.previous_handoff ?? target.previousHandoff ?? null,
      word_target: target.word_target ?? target.wordTarget ?? null,
      scene_cards: target.scene_cards ?? target.sceneCards ?? [],
    },
    preflight: context.preflight || {},
    director: context.oh_story_director || context.ohStoryDirector || {},
    context,
  })
}
