import { getChapterLaunchGateBlocker } from './prose-quality-contracts'

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

export const PROSE_RISK_CONTRACT_LIMIT = 4
export const PROSE_PROMPT_MAX_CHARS = 48_000

export type ProsePreDraftGateCode =
  | 'PROSE_PREFLIGHT_BLOCKED'
  | 'PROSE_STRICT_PREFLIGHT_BLOCKED'
  | 'PROSE_LAUNCH_GATE_BLOCKED'
  | 'PROSE_OH_STORY_GATE_BLOCKED'
  | 'PROSE_SCENE_CARDS_BLOCKED'

export interface ProsePreDraftGateDecision {
  passed: boolean
  code: ProsePreDraftGateCode | ''
  reasons: string[]
  details?: any
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

function reasonText(value: any) {
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim()
  if (!value || typeof value !== 'object') return String(value ?? '').trim()
  return String(value.detail || value.fix || value.label || value.message || value.key || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function asReasonList(...values: any[]) {
  const rows = values
    .flatMap(value => Array.isArray(value) ? value : [value])
    .map(reasonText)
    .filter(Boolean)
  return rows.length ? Array.from(new Set(rows)).slice(0, 12) : ['写前门禁未通过']
}

export function evaluateProsePreDraftGate(
  contract: ProseGenerationContract,
  options: { requireSceneCards?: boolean; allowIncomplete?: boolean } = {},
): ProsePreDraftGateDecision {
  void options.allowIncomplete
  const preflight = contract.preflight || {}
  if (preflight.ready !== true) {
    return {
      passed: false,
      code: 'PROSE_PREFLIGHT_BLOCKED',
      reasons: asReasonList(preflight.blockers, preflight.warnings),
      details: preflight,
    }
  }
  if (preflight.strict_ready === false) {
    const failures = (Array.isArray(preflight.checks) ? preflight.checks : [])
      .filter((item: any) => item?.ok === false && item?.severity !== 'low')
    return {
      passed: false,
      code: 'PROSE_STRICT_PREFLIGHT_BLOCKED',
      reasons: asReasonList(failures.length ? failures : preflight.warnings),
      details: failures,
    }
  }

  const context = contract.context || {}
  const launchGate = context.chapter_launch_gate
    || context.chapterLaunchGate
    || context.chapter_target?.chapter_launch_gate
    || context.chapterTarget?.chapterLaunchGate
  const launchBlocker = getChapterLaunchGateBlocker(launchGate)
  if (launchBlocker) {
    return {
      passed: false,
      code: 'PROSE_LAUNCH_GATE_BLOCKED',
      reasons: [launchBlocker.summary],
      details: launchBlocker,
    }
  }

  const directorReadiness = String(contract.director?.readiness || '')
  if (directorReadiness !== 'ready') {
    const requiredRepairs = contract.director?.required_repairs
    const blockingSummary = contract.director?.blocking_summary
    const hasSpecificReason = (Array.isArray(requiredRepairs) ? requiredRepairs.length > 0 : Boolean(requiredRepairs))
      || Boolean(blockingSummary)
    return {
      passed: false,
      code: 'PROSE_OH_STORY_GATE_BLOCKED',
      reasons: hasSpecificReason
        ? asReasonList(requiredRepairs, blockingSummary)
        : asReasonList(directorReadiness ? `oh-story director readiness=${directorReadiness}` : '缺少 oh-story director 写前判定'),
      details: contract.director,
    }
  }

  if (options.requireSceneCards !== false && contract.chapter.scene_cards.length === 0) {
    return {
      passed: false,
      code: 'PROSE_SCENE_CARDS_BLOCKED',
      reasons: ['正文生成前必须有本章场景卡'],
    }
  }

  return { passed: true, code: '', reasons: [] }
}
