import type { NovelChapterAcceptanceInput } from '../../novel'
import { normalizeChapterRecord } from '../../novel/normalize'
import { buildChapterTitleUniquenessReport } from '../../novel-writing/title-uniqueness'
import { deepMergeObjects } from '../../routes/novel-route-utils-payload'
import {
  buildBenchmarkRecallPreflightChecks,
  buildPreflightChecks,
} from '../../routes/novel-route-utils-preflight'
import {
  buildBoundedProsePrompt,
  prosePromptJson,
} from '../../novel-writing/prose-prompt-context'
import {
  mergeFinalRepairPreDraftRawPayload,
} from '../quality/preflight-auto-repair'
import { mergeConfirmedPreDraftBriefIntoContext } from '../quality/pre-draft-brief-merge'
import { buildSourceReadinessPreflightChecks } from '../quality/state-tracking-contracts-readiness'

export type MaterialRepairTarget =
  | 'chapter_patch'
  | 'worldbuilding'
  | 'characters'
  | 'character_updates'
  | 'settings'
  | 'chapter_setting_usage'

const REPAIRABLE_CHECKS = {
  chapter_blueprint: { targets: ['chapter_patch'] },
  scene_cards: { targets: ['chapter_patch'] },
  chapter_conflict: { targets: ['chapter_patch'] },
  ending_hook: { targets: ['chapter_patch'] },
  worldbuilding: { targets: ['worldbuilding'] },
  characters: { targets: ['characters'] },
  character_state: { targets: ['character_updates'] },
  plot_points: { targets: ['chapter_patch'] },
  no_repeat: { targets: ['chapter_patch'] },
  benchmark_recall_source_paths: { targets: ['chapter_patch'] },
  setting_workshop: { targets: ['settings'] },
  chapter_setting_usage: { targets: ['chapter_setting_usage'] },
  chapter_title_unique: { targets: ['chapter_patch'] },
  source_readiness_chapter_blueprint: { targets: ['chapter_patch'] },
  source_readiness_context_tracking: { targets: ['chapter_patch'] },
  source_readiness_foreshadowing_tracking: { targets: ['chapter_patch'] },
  source_readiness_foreshadowing_history: { targets: ['chapter_patch'] },
  source_readiness_timeline_tracking: { targets: ['chapter_patch'] },
  source_readiness_character_state: { targets: ['chapter_patch', 'character_updates'] },
  source_readiness_world_constraints: { targets: ['chapter_patch'] },
  source_readiness_scene_card_goal_obstacle_change: { targets: ['chapter_patch'] },
} as const satisfies Record<string, { targets: readonly MaterialRepairTarget[] }>

const UNREPAIRABLE_CHECKS = new Set([
  'previous_continuity',
  'source_readiness_previous_chapter',
  'source_readiness_serial_story_state',
  'source_readiness_delivery_risk_carry_over',
  'reference_knowledge',
  'copy_safety_policy',
  'benchmark_recall_gate',
  'benchmark_recall_gaps',
])

export type MaterialRepairCheckKey = keyof typeof REPAIRABLE_CHECKS

export type MaterialRepairObligation = {
  key: MaterialRepairCheckKey
  targets: readonly MaterialRepairTarget[]
  label: string
  severity: 'low' | 'medium' | 'high' | 'unknown'
  fix: string
  evidence: string
  gaps: string[]
}

export type ResolvedMaterialRepairPlan = {
  targets: ReadonlySet<MaterialRepairTarget>
  obligations: readonly MaterialRepairObligation[]
}

const MATERIAL_REPAIR_MUTATION_FIELDS = [
  'chapter_patch',
  'worldbuilding',
  'characters',
  'character_updates',
  'settings',
  'chapter_setting_usage',
] as const satisfies readonly MaterialRepairTarget[]

const MISNESTED_MATERIAL_ROOT_FIELDS = new Set<string>([
  'worldbuilding',
  'characters',
  'character_updates',
  'settings',
  'chapter_setting_usage',
  'repair_summary',
])

const MATERIAL_REPAIR_OUTPUT_MAX_CHARS = 180000
const MATERIAL_REPAIR_LIMITS: Record<Exclude<MaterialRepairTarget, 'chapter_patch'>, number> = {
  worldbuilding: 3,
  characters: 24,
  character_updates: 24,
  settings: 30,
  chapter_setting_usage: 60,
}

const FORBIDDEN_MUTATION_KEYS = new Set([
  'chapter_text',
  'project_id',
  'project_patch',
  'next_reference_config',
  'generation_source',
  'generationSource',
  'chapter_generation_source',
  'prose_generation_source',
  'selected_model_id',
  'selectedModelId',
  'key_id',
  'server_id',
  'adapter_id',
  'agent_id',
  'session_id',
])

const CHAPTER_PATCH_FIELDS = new Set([
  'title',
  'chapter_goal',
  'chapter_summary',
  'conflict',
  'ending_hook',
  'scene_breakdown',
  'scene_list',
  'raw_payload',
])

const CHAPTER_RAW_PAYLOAD_FIELDS = new Set([
  'chapter_blueprint',
  'pre_draft_brief',
  'preDraftBrief',
  'write_preparation_brief',
  'writePreparationBrief',
  'state_tracking_contract',
  'stateTrackingContract',
  'source_readiness',
  'sourceReadiness',
  'must_advance',
  'mustAdvance',
  'forbidden_repeats',
  'forbiddenRepeats',
  'benchmark_recall_brief',
  'benchmarkRecallBrief',
  'benchmark_recall_gaps',
  'benchmarkRecallGaps',
])

const WORLD_FIELDS = new Set([
  'world_summary',
  'summary',
  'rules',
  'factions',
  'locations',
  'systems',
  'items',
  'timeline_anchor',
  'known_unknowns',
  'raw_payload',
])

const CHARACTER_MUTATION_FIELDS = new Set([
  'role',
  'role_type',
  'roleType',
  'archetype',
  'personality',
  'motivation',
  'goal',
  'conflict',
  'abilities',
  'backstory',
  'relationships',
  'relationship_graph',
  'relationshipGraph',
  'growth_arc',
  'growthArc',
  'arc_hint',
  'arcHint',
  'current_state',
  'currentState',
  'secret',
  'appearance',
  'status',
  'tier',
  'narrative_function',
  'narrativeFunction',
  'relationship_to_protagonist',
  'relationshipToProtagonist',
  'first_appearance_chapter',
  'firstAppearanceChapter',
  'active_range',
  'activeRange',
  'voice_anchor',
  'voiceAnchor',
  'signature_action',
  'signatureAction',
  'secret_or_pressure',
  'secretOrPressure',
  'exit_or_turning_point',
  'exitOrTurningPoint',
  'antagonist_logic',
  'antagonistLogic',
])

const CHARACTER_CREATE_FIELDS = new Set(['name', 'limits', ...CHARACTER_MUTATION_FIELDS])
const CHARACTER_UPDATE_FIELDS = new Set(['name', 'patch', ...CHARACTER_MUTATION_FIELDS])

const SETTING_FIELDS = new Set([
  'entity_type',
  'entityType',
  'type',
  'name',
  'title',
  'summary',
  'description',
  'status',
  'visibility',
  'first_chapter_no',
  'firstChapterNo',
  'last_chapter_no',
  'lastChapterNo',
  'constraints_json',
  'constraintsJson',
  'constraints',
  'state_json',
  'stateJson',
  'state',
  'payload_json',
  'payloadJson',
  'payload',
])

const USAGE_FIELDS = new Set([
  'entity_id',
  'entityId',
  'setting_id',
  'entity_name',
  'entityName',
  'name',
  'setting',
  'entity_type',
  'entityType',
  'type',
  'usage_type',
  'usageType',
  'required',
  'allowed',
  'forbidden',
  'reveal_level',
  'revealLevel',
  'expected_state_change',
  'expectedStateChange',
  'actual_state_change',
  'actualStateChange',
])

const CHARACTER_ALIASES: Record<string, readonly string[]> = {
  role_type: ['role_type', 'roleType'],
  relationship_graph: ['relationship_graph', 'relationshipGraph'],
  growth_arc: ['growth_arc', 'growthArc'],
  arc_hint: ['arc_hint', 'arcHint'],
  current_state: ['current_state', 'currentState'],
  narrative_function: ['narrative_function', 'narrativeFunction'],
  relationship_to_protagonist: ['relationship_to_protagonist', 'relationshipToProtagonist'],
  first_appearance_chapter: ['first_appearance_chapter', 'firstAppearanceChapter'],
  active_range: ['active_range', 'activeRange'],
  voice_anchor: ['voice_anchor', 'voiceAnchor'],
  signature_action: ['signature_action', 'signatureAction'],
  secret_or_pressure: ['secret_or_pressure', 'secretOrPressure'],
  exit_or_turning_point: ['exit_or_turning_point', 'exitOrTurningPoint'],
  antagonist_logic: ['antagonist_logic', 'antagonistLogic'],
}

const CHARACTER_DIRECT_FIELDS = [
  'role',
  'archetype',
  'personality',
  'motivation',
  'goal',
  'conflict',
  'abilities',
  'backstory',
  'relationships',
  'secret',
  'appearance',
  'status',
  'tier',
] as const

const CHARACTER_STRING_FIELDS = new Set([
  'role',
  'role_type',
  'archetype',
  'motivation',
  'goal',
  'conflict',
  'backstory',
  'growth_arc',
  'arc_hint',
  'secret',
  'appearance',
  'status',
  'tier',
  'narrative_function',
  'relationship_to_protagonist',
  'voice_anchor',
  'signature_action',
  'secret_or_pressure',
  'exit_or_turning_point',
])

export type ExistingMaterialSnapshot = {
  characterNames: Set<string>
  settingKeys: Set<string>
  characterIds?: Set<number>
  settingIds?: Set<number>
  settingKeysById?: Map<number, string>
  project: any
  chapter: any
  contextPackage: any
  chapters: any[]
  worldbuilding: any[]
  characters: any[]
  sceneCards: any[]
  referencePreview: any
  reviews: any[]
  settings: any[]
  chapterSettingUsage: any[]
}

export type MaterialRepairTaskIdentity = {
  project_identity_hash: string
  chapter_identity_hash: string
  source_identity_hash: string
  context_identity_hash: string
}

export type PreparedMaterialRepair = {
  acceptance: Pick<NovelChapterAcceptanceInput,
    | 'chapter_patch'
    | 'worldbuilding_creates'
    | 'character_creates'
    | 'character_updates'
    | 'setting_creates'
    | 'chapter_setting_usage_replacement'
    | 'reviews'
  >
  applied: Array<{ type: string; name?: string; count?: number }>
  summary: string
}

function materialRepairError(code: string, message: string): Error & { code: string; error_code: string } {
  return Object.assign(new Error(message), { code, error_code: code })
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function hasOwn(value: Record<string, unknown>, field: string) {
  return Object.prototype.hasOwnProperty.call(value, field)
}

function normalizeMisnestedMaterialRootSections(payload: Record<string, unknown>) {
  const topLevelFields = Object.keys(payload)
  if (topLevelFields.length !== 1 || topLevelFields[0] !== 'chapter_patch') return payload
  const chapterPatch = payload.chapter_patch
  if (!isPlainObject(chapterPatch)) return payload
  const misplacedFields = Object.keys(chapterPatch)
    .filter(field => MISNESTED_MATERIAL_ROOT_FIELDS.has(field))
  if (misplacedFields.length === 0) return payload
  const normalizedChapterPatch: Record<string, unknown> = Object.create(null)
  const normalized: Record<string, unknown> = Object.create(null)
  normalized.chapter_patch = normalizedChapterPatch
  for (const [field, value] of Object.entries(chapterPatch)) {
    if (MISNESTED_MATERIAL_ROOT_FIELDS.has(field)) normalized[field] = value
    else normalizedChapterPatch[field] = value
  }
  return normalized
}

function assertAllowedFields(value: Record<string, unknown>, allowed: Set<string>, section: string) {
  const unknown = Object.keys(value).find(field => !allowed.has(field))
  if (unknown) {
    throw materialRepairError('MATERIAL_REPAIR_FORBIDDEN_FIELD', `${section} contains forbidden field: ${unknown}`)
  }
}

function assertNoForbiddenMutationKeys(value: unknown, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 12) return
  if (Array.isArray(value)) {
    for (const item of value) assertNoForbiddenMutationKeys(item, depth + 1)
    return
  }
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_MUTATION_KEYS.has(key)) {
      throw materialRepairError('MATERIAL_REPAIR_FORBIDDEN_FIELD', `material repair contains forbidden field: ${key}`)
    }
    assertNoForbiddenMutationKeys(item, depth + 1)
  }
}

function invalidMaterialField(label: string, expected: string): never {
  throw materialRepairError('MATERIAL_REPAIR_INVALID', `${label} must be ${expected}`)
}

function emptyOverwriteValue(value: unknown) {
  return value === undefined || value === null
}

function assertStringField(value: unknown, label: string) {
  if (emptyOverwriteValue(value)) return
  if (typeof value !== 'string') invalidMaterialField(label, 'a string')
}

function assertBooleanField(value: unknown, label: string) {
  if (emptyOverwriteValue(value)) return
  if (typeof value !== 'boolean') invalidMaterialField(label, 'a boolean')
}

function assertIntegerField(value: unknown, label: string, positive = false) {
  if (emptyOverwriteValue(value)) return
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || (positive && value <= 0)) {
    invalidMaterialField(label, positive ? 'a positive finite integer' : 'a finite integer')
  }
}

function assertJsonSafeValue(value: unknown, label: string, depth = 0): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) invalidMaterialField(label, 'finite JSON data')
    return
  }
  if (typeof value !== 'object' || depth > 12) invalidMaterialField(label, 'bounded JSON data')
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      if (item === undefined) invalidMaterialField(`${label}[${index}]`, 'JSON data')
      assertJsonSafeValue(item, `${label}[${index}]`, depth + 1)
    }
    return
  }
  if (!isPlainObject(value)) invalidMaterialField(label, 'a plain JSON object')
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) invalidMaterialField(`${label}.${key}`, 'JSON data')
    assertJsonSafeValue(item, `${label}.${key}`, depth + 1)
  }
}

function assertPlainObjectField(value: unknown, label: string) {
  if (emptyOverwriteValue(value)) return
  if (!isPlainObject(value)) invalidMaterialField(label, 'a plain object')
  assertJsonSafeValue(value, label)
}

function assertArrayField(value: unknown, label: string) {
  if (emptyOverwriteValue(value)) return
  if (!Array.isArray(value)) invalidMaterialField(label, 'an array')
  assertJsonSafeValue(value, label)
}

function assertObjectArrayField(value: unknown, label: string) {
  if (emptyOverwriteValue(value)) return
  if (!Array.isArray(value)) invalidMaterialField(label, 'an array of plain objects')
  for (const [index, item] of value.entries()) {
    if (!isPlainObject(item)) invalidMaterialField(`${label}[${index}]`, 'a plain object')
    assertJsonSafeValue(item, `${label}[${index}]`)
  }
}

function assertStringArrayField(value: unknown, label: string) {
  if (emptyOverwriteValue(value)) return
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    invalidMaterialField(label, 'an array of strings')
  }
}

function assertObjectOrArrayField(value: unknown, label: string) {
  if (emptyOverwriteValue(value)) return
  if (!Array.isArray(value) && !isPlainObject(value)) invalidMaterialField(label, 'a plain object or array')
  assertJsonSafeValue(value, label)
}

function assertObjectArrayOrStringField(value: unknown, label: string) {
  if (emptyOverwriteValue(value)) return
  if (typeof value !== 'string' && !Array.isArray(value) && !isPlainObject(value)) {
    invalidMaterialField(label, 'a string, plain object, or array')
  }
  assertJsonSafeValue(value, label)
}

function cleanOverwriteValue(value: unknown, depth = 0): unknown {
  if (value === undefined || value === null || depth > 12) return undefined
  if (typeof value === 'string') {
    const text = value.trim()
    return text || undefined
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'boolean') return value
  if (Array.isArray(value)) {
    const items = value
      .map(item => cleanOverwriteValue(item, depth + 1))
      .filter(item => item !== undefined)
    return items.length ? items : undefined
  }
  if (!isPlainObject(value)) return undefined
  const entries = Object.entries(value)
    .map(([key, item]) => [key, cleanOverwriteValue(item, depth + 1)] as const)
    .filter(([, item]) => item !== undefined)
  return entries.length ? Object.fromEntries(entries) : undefined
}

function cleanObject(value: Record<string, unknown>) {
  const cleaned = cleanOverwriteValue(value)
  return isPlainObject(cleaned) ? cleaned : {}
}

function aliasValue(value: Record<string, unknown>, aliases: readonly string[], label: string) {
  const present = aliases.filter(alias => hasOwn(value, alias))
  if (present.length > 1) {
    const first = cleanOverwriteValue(value[present[0]])
    for (const alias of present.slice(1)) {
      if (JSON.stringify(cleanOverwriteValue(value[alias])) !== JSON.stringify(first)) {
        throw materialRepairError('MATERIAL_REPAIR_INVALID', `${label} has conflicting aliases`)
      }
    }
  }
  return present.length ? value[present[0]] : undefined
}

function settingKey(entityType: unknown, name: unknown) {
  return `${String(entityType || 'rule').trim() || 'rule'}\u0000${String(name || '').trim()}`
}

function requiredIdentityText(value: unknown, label: string) {
  if (typeof value !== 'string') invalidMaterialField(label, 'a string')
  const text = value.trim()
  if (!text) throw materialRepairError('MATERIAL_REPAIR_INCOMPLETE', `${label} is required`)
  if (text.length > 240) throw materialRepairError('MATERIAL_REPAIR_LIMIT_EXCEEDED', `${label} is too long`)
  return text
}

function normalizeCharacterFields(value: Record<string, unknown>) {
  const normalized: Record<string, unknown> = {}
  for (const field of CHARACTER_DIRECT_FIELDS) {
    if (hasOwn(value, field)) normalized[field] = value[field]
  }
  for (const [canonical, aliases] of Object.entries(CHARACTER_ALIASES)) {
    const item = aliasValue(value, aliases, canonical)
    if (item !== undefined) normalized[canonical] = item
  }
  for (const [field, item] of Object.entries(normalized)) {
    const label = `character.${field}`
    if (CHARACTER_STRING_FIELDS.has(field)) assertStringField(item, label)
    else if (field === 'first_appearance_chapter') assertIntegerField(item, label)
    else if (field === 'abilities') assertArrayField(item, label)
    else if (field === 'relationship_graph' || field === 'current_state') assertPlainObjectField(item, label)
    else if (field === 'personality' || field === 'relationships') assertObjectOrArrayField(item, label)
    else if (field === 'active_range' || field === 'antagonist_logic') assertObjectArrayOrStringField(item, label)
  }
  return cleanObject(normalized)
}

function recoverCanonicalMaterialSourceReadinessRows(rawPayload: Record<string, unknown>) {
  const preDraftBrief = rawPayload.pre_draft_brief
  if (!isPlainObject(preDraftBrief)) return rawPayload
  const stateTrackingContract = preDraftBrief.state_tracking_contract
  if (!isPlainObject(stateTrackingContract) || !hasOwn(stateTrackingContract, 'source_readiness')) return rawPayload

  const label = 'chapter_patch.raw_payload.pre_draft_brief.state_tracking_contract.source_readiness'
  const sourceReadiness = stateTrackingContract.source_readiness
  if (!Array.isArray(sourceReadiness)) invalidMaterialField(label, 'an array')
  if (sourceReadiness.length === 0) return rawPayload
  if (sourceReadiness.every(isPlainObject)) return rawPayload
  if (!sourceReadiness.every(item => typeof item === 'string' && item.trim().length > 0)) {
    invalidMaterialField(label, 'an array of plain objects or non-empty JSON object strings')
  }

  const recoveredRows = sourceReadiness.map((item, index) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(item as string)
    } catch {
      invalidMaterialField(`${label}[${index}]`, 'a valid JSON object string')
    }
    if (!isPlainObject(parsed)) invalidMaterialField(`${label}[${index}]`, 'a JSON object string')
    assertNoForbiddenMutationKeys(parsed)
    return parsed
  })
  return {
    ...rawPayload,
    pre_draft_brief: {
      ...preDraftBrief,
      state_tracking_contract: {
        ...stateTrackingContract,
        source_readiness: recoveredRows,
      },
    },
  }
}

function normalizeChapterPatch(value: unknown) {
  if (!isPlainObject(value)) {
    throw materialRepairError('MATERIAL_REPAIR_INVALID', 'chapter_patch must be an object')
  }
  assertAllowedFields(value, CHAPTER_PATCH_FIELDS, 'chapter_patch')
  const normalized: Record<string, unknown> = {}
  for (const field of ['title', 'chapter_goal', 'chapter_summary', 'conflict', 'ending_hook']) {
    if (hasOwn(value, field)) {
      assertStringField(value[field], `chapter_patch.${field}`)
      normalized[field] = value[field]
    }
  }
  for (const field of ['scene_breakdown', 'scene_list']) {
    if (hasOwn(value, field)) normalized[field] = value[field]
    if (hasOwn(value, field)) assertObjectArrayField(value[field], `chapter_patch.${field}`)
  }
  if (hasOwn(value, 'raw_payload')) {
    const rawInput = value.raw_payload
    if (!isPlainObject(rawInput)) {
      throw materialRepairError('MATERIAL_REPAIR_INVALID', 'chapter_patch.raw_payload must be an object')
    }
    assertAllowedFields(rawInput, CHAPTER_RAW_PAYLOAD_FIELDS, 'chapter_patch.raw_payload')
    const raw = recoverCanonicalMaterialSourceReadinessRows(rawInput)
    const rawAliases: Record<string, readonly string[]> = {
      chapter_blueprint: ['chapter_blueprint'],
      pre_draft_brief: ['pre_draft_brief', 'preDraftBrief'],
      write_preparation_brief: ['write_preparation_brief', 'writePreparationBrief'],
      state_tracking_contract: ['state_tracking_contract', 'stateTrackingContract'],
      source_readiness: ['source_readiness', 'sourceReadiness'],
      must_advance: ['must_advance', 'mustAdvance'],
      forbidden_repeats: ['forbidden_repeats', 'forbiddenRepeats'],
      benchmark_recall_brief: ['benchmark_recall_brief', 'benchmarkRecallBrief'],
      benchmark_recall_gaps: ['benchmark_recall_gaps', 'benchmarkRecallGaps'],
    }
    const normalizedRaw: Record<string, unknown> = {}
    for (const [canonical, aliases] of Object.entries(rawAliases)) {
      const item = aliasValue(raw, aliases, `chapter_patch.raw_payload.${canonical}`)
      if (item === undefined) continue
      if (canonical === 'source_readiness') assertObjectArrayField(item, `chapter_patch.raw_payload.${canonical}`)
      else if (canonical === 'must_advance' || canonical === 'forbidden_repeats' || canonical === 'benchmark_recall_gaps') {
        assertStringArrayField(item, `chapter_patch.raw_payload.${canonical}`)
      } else {
        assertPlainObjectField(item, `chapter_patch.raw_payload.${canonical}`)
      }
      normalizedRaw[canonical] = item
    }
    normalized.raw_payload = normalizedRaw
  }
  return cleanObject(normalized)
}

function normalizeWorldbuilding(value: unknown) {
  if (!isPlainObject(value)) {
    throw materialRepairError('MATERIAL_REPAIR_INVALID', 'worldbuilding entries must be objects')
  }
  assertAllowedFields(value, WORLD_FIELDS, 'worldbuilding')
  const normalized: Record<string, unknown> = {}
  const summary = aliasValue(value, ['world_summary', 'summary'], 'worldbuilding.world_summary')
  if (summary !== undefined) {
    assertStringField(summary, 'worldbuilding.world_summary')
    normalized.world_summary = summary
  }
  for (const field of ['rules', 'factions', 'locations', 'items', 'known_unknowns']) {
    if (hasOwn(value, field)) {
      assertArrayField(value[field], `worldbuilding.${field}`)
      normalized[field] = value[field]
    }
  }
  if (hasOwn(value, 'systems')) {
    assertObjectOrArrayField(value.systems, 'worldbuilding.systems')
    normalized.systems = value.systems
  }
  if (hasOwn(value, 'timeline_anchor')) {
    assertObjectArrayOrStringField(value.timeline_anchor, 'worldbuilding.timeline_anchor')
    normalized.timeline_anchor = value.timeline_anchor
  }
  if (hasOwn(value, 'raw_payload')) {
    assertPlainObjectField(value.raw_payload, 'worldbuilding.raw_payload')
    normalized.raw_payload = value.raw_payload
  }
  return cleanObject(normalized)
}

function normalizeCharacterCreate(value: unknown) {
  if (!isPlainObject(value)) {
    throw materialRepairError('MATERIAL_REPAIR_INVALID', 'character entries must be objects')
  }
  assertAllowedFields(value, CHARACTER_CREATE_FIELDS, 'characters')
  const name = requiredIdentityText(value.name, 'character name')
  const fields = normalizeCharacterFields(value)
  if (hasOwn(value, 'limits')) {
    assertArrayField(value.limits, 'character.limits')
    const limits = (value.limits as unknown[])
      .map(item => typeof item === 'string' ? `限制：${item.trim()}` : { type: 'limit', value: item })
      .filter(item => typeof item !== 'string' || item !== '限制：')
    if (limits.length > 0) {
      fields.abilities = [
        ...(Array.isArray(fields.abilities) ? fields.abilities : []),
        ...limits,
      ]
    }
  }
  if (Object.keys(fields).length === 0) {
    throw materialRepairError('MATERIAL_REPAIR_INCOMPLETE', `character ${name} has no material`)
  }
  return { name, ...fields }
}

function normalizeCharacterUpdate(value: unknown) {
  if (!isPlainObject(value)) {
    throw materialRepairError('MATERIAL_REPAIR_INVALID', 'character update entries must be objects')
  }
  assertAllowedFields(value, CHARACTER_UPDATE_FIELDS, 'character_updates')
  const name = requiredIdentityText(value.name, 'character update name')
  const direct = normalizeCharacterFields(value)
  let patch: Record<string, unknown> = {}
  if (hasOwn(value, 'patch')) {
    if (!isPlainObject(value.patch)) {
      throw materialRepairError('MATERIAL_REPAIR_INVALID', `character update ${name} patch must be an object`)
    }
    assertAllowedFields(value.patch, CHARACTER_MUTATION_FIELDS, `character update ${name} patch`)
    patch = normalizeCharacterFields(value.patch)
  }
  for (const field of Object.keys(direct)) {
    if (hasOwn(patch, field)) {
      throw materialRepairError('MATERIAL_REPAIR_INVALID', `character update ${name} repeats ${field}`)
    }
  }
  patch = cleanObject({ ...patch, ...direct })
  if (Object.keys(patch).length === 0) {
    throw materialRepairError('MATERIAL_REPAIR_INCOMPLETE', `character update ${name} has no material`)
  }
  return { name, patch }
}

function normalizeSetting(value: unknown) {
  if (!isPlainObject(value)) {
    throw materialRepairError('MATERIAL_REPAIR_INVALID', 'setting entries must be objects')
  }
  assertAllowedFields(value, SETTING_FIELDS, 'settings')
  const name = requiredIdentityText(aliasValue(value, ['name', 'title'], 'setting.name'), 'setting name')
  const rawEntityType = aliasValue(value, ['entity_type', 'entityType', 'type'], 'setting.entity_type')
  const entityType = requiredIdentityText(
    rawEntityType === undefined ? 'rule' : rawEntityType,
    'setting entity_type',
  )
  const normalized: Record<string, unknown> = { entity_type: entityType, name }
  const aliases: Record<string, readonly string[]> = {
    summary: ['summary', 'description'],
    status: ['status'],
    visibility: ['visibility'],
    first_chapter_no: ['first_chapter_no', 'firstChapterNo'],
    last_chapter_no: ['last_chapter_no', 'lastChapterNo'],
    constraints_json: ['constraints_json', 'constraintsJson', 'constraints'],
    state_json: ['state_json', 'stateJson', 'state'],
    payload_json: ['payload_json', 'payloadJson', 'payload'],
  }
  for (const [canonical, names] of Object.entries(aliases)) {
    const item = aliasValue(value, names, `setting.${canonical}`)
    if (item === undefined) continue
    if (canonical === 'summary' || canonical === 'status' || canonical === 'visibility') {
      assertStringField(item, `setting.${canonical}`)
    } else if (canonical === 'first_chapter_no' || canonical === 'last_chapter_no') {
      assertIntegerField(item, `setting.${canonical}`)
    } else {
      assertPlainObjectField(item, `setting.${canonical}`)
    }
    normalized[canonical] = item
  }
  const cleaned = cleanObject(normalized)
  if (Object.keys(cleaned).every(field => field === 'entity_type' || field === 'name')) {
    throw materialRepairError('MATERIAL_REPAIR_INCOMPLETE', `setting ${name} has no material`)
  }
  return cleaned
}

function normalizedUsageReference(value: Record<string, unknown>) {
  const rawId = aliasValue(value, ['entity_id', 'entityId', 'setting_id'], 'chapter_setting_usage.entity_id')
  if (rawId !== undefined && rawId !== null) {
    assertIntegerField(rawId, 'chapter_setting_usage.entity_id', true)
  }
  const entityId = typeof rawId === 'number' ? rawId : 0
  const nameValue = aliasValue(value, ['entity_name', 'entityName', 'name', 'setting'], 'chapter_setting_usage.entity_name')
  const typeValue = aliasValue(value, ['entity_type', 'entityType', 'type'], 'chapter_setting_usage.entity_type')
  const entityName = nameValue === undefined ? '' : requiredIdentityText(nameValue, 'usage entity_name')
  const entityType = typeValue === undefined ? '' : requiredIdentityText(typeValue, 'usage entity_type')
  if (!entityId && (!entityName || !entityType)) {
    throw materialRepairError('MATERIAL_REPAIR_REFERENCE_INVALID', 'usage must reference an entity_id or entity_name + entity_type')
  }
  if ((entityName && !entityType) || (!entityName && entityType)) {
    throw materialRepairError('MATERIAL_REPAIR_REFERENCE_INVALID', 'usage name references require entity_type')
  }
  return { entityId, entityName, entityType }
}

function normalizeUsage(
  value: unknown,
  existing: ExistingMaterialSnapshot,
  availableSettingKeys: Set<string>,
) {
  if (!isPlainObject(value)) {
    throw materialRepairError('MATERIAL_REPAIR_INVALID', 'chapter setting usage entries must be objects')
  }
  assertAllowedFields(value, USAGE_FIELDS, 'chapter_setting_usage')
  const reference = normalizedUsageReference(value)
  const idKey = reference.entityId ? existing.settingKeysById?.get(reference.entityId) : undefined
  if (reference.entityId && (!existing.settingIds?.has(reference.entityId) || !idKey)) {
    throw materialRepairError('MATERIAL_REPAIR_REFERENCE_INVALID', `usage entity_id ${reference.entityId} is outside the material snapshot`)
  }
  const namedKey = reference.entityName ? settingKey(reference.entityType, reference.entityName) : ''
  if (namedKey && !availableSettingKeys.has(namedKey)) {
    throw materialRepairError('MATERIAL_REPAIR_REFERENCE_INVALID', `usage setting ${reference.entityName} cannot be resolved`)
  }
  if (idKey && namedKey && idKey !== namedKey) {
    throw materialRepairError('MATERIAL_REPAIR_REFERENCE_INVALID', 'usage id and name references disagree')
  }

  const aliases: Record<string, readonly string[]> = {
    usage_type: ['usage_type', 'usageType'],
    required: ['required'],
    allowed: ['allowed'],
    forbidden: ['forbidden'],
    reveal_level: ['reveal_level', 'revealLevel'],
    expected_state_change: ['expected_state_change', 'expectedStateChange'],
    actual_state_change: ['actual_state_change', 'actualStateChange'],
  }
  const directives: Record<string, unknown> = {}
  for (const [canonical, names] of Object.entries(aliases)) {
    const item = aliasValue(value, names, `chapter_setting_usage.${canonical}`)
    if (item === undefined) continue
    if (canonical === 'required' || canonical === 'allowed' || canonical === 'forbidden') {
      assertBooleanField(item, `chapter_setting_usage.${canonical}`)
    } else if (canonical === 'usage_type' || canonical === 'reveal_level') {
      assertStringField(item, `chapter_setting_usage.${canonical}`)
    } else {
      assertPlainObjectField(item, `chapter_setting_usage.${canonical}`)
    }
    directives[canonical] = item
  }
  const cleanedDirectives = cleanObject(directives)
  if (Object.keys(cleanedDirectives).length === 0) {
    throw materialRepairError('MATERIAL_REPAIR_INCOMPLETE', 'chapter setting usage has no directive')
  }
  if (cleanedDirectives.forbidden === true && (cleanedDirectives.required === true || cleanedDirectives.allowed === true)) {
    throw materialRepairError('MATERIAL_REPAIR_INVALID', 'forbidden usage cannot also be required or allowed')
  }
  return {
    normalized: {
      ...(reference.entityId ? { entity_id: reference.entityId } : {}),
      ...(reference.entityName ? { entity_name: reference.entityName, entity_type: reference.entityType } : {}),
      ...cleanedDirectives,
    },
    identityKey: idKey || namedKey,
  }
}

function unresolvedForbiddenUsagePlaceholder(
  value: unknown,
  availableSettingKeys: Set<string>,
) {
  if (!isPlainObject(value) || value.forbidden !== true) return null
  let reference: ReturnType<typeof normalizedUsageReference>
  try {
    reference = normalizedUsageReference(value)
  } catch {
    return null
  }
  if (reference.entityId || !reference.entityName || !reference.entityType) return null
  const key = settingKey(reference.entityType, reference.entityName)
  if (availableSettingKeys.has(key)) return null
  const revealLevel = typeof value.reveal_level === 'string' && value.reveal_level.trim()
    ? value.reveal_level.trim()
    : 'forbidden'
  return {
    key,
    setting: normalizeSetting({
      entity_type: reference.entityType,
      name: reference.entityName,
      summary: `本章禁揭的未解析设定：${reference.entityName}`,
      status: 'active',
      visibility: 'limited',
      constraints_json: { reveal_level: revealLevel },
      state_json: { status: 'unresolved', reveal_level: revealLevel },
      payload_json: { source: 'mcp_material_repair_forbidden_usage' },
    }),
  }
}

function requiredCollection(payload: Record<string, unknown>, target: Exclude<MaterialRepairTarget, 'chapter_patch'>) {
  const value = payload[target]
  if (value === undefined) {
    throw materialRepairError('MATERIAL_REPAIR_INCOMPLETE', `${target} did not return a meaningful result`)
  }
  if (!Array.isArray(value)) invalidMaterialField(target, 'an array')
  if (value.length === 0) {
    throw materialRepairError('MATERIAL_REPAIR_INCOMPLETE', `${target} did not return a meaningful result`)
  }
  if (value.length > MATERIAL_REPAIR_LIMITS[target]) {
    throw materialRepairError('MATERIAL_REPAIR_LIMIT_EXCEEDED', `${target} exceeds its item limit`)
  }
  return value
}

function materialCheckText(value: unknown) {
  if (typeof value === 'string') return value.trim().slice(0, 2000)
  if (value === undefined || value === null) return ''
  try {
    return JSON.stringify(value).slice(0, 2000)
  } catch {
    return String(value).slice(0, 2000)
  }
}

function materialCheckGaps(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map(materialCheckText).filter(Boolean).slice(0, 30)
}

function materialRepairCheckSpec(key: string) {
  const spec = REPAIRABLE_CHECKS[key as MaterialRepairCheckKey]
  if (spec) return spec
  if (UNREPAIRABLE_CHECKS.has(key) || key.startsWith('source_readiness_')) {
    throw materialRepairError('MATERIAL_REPAIR_UNREPAIRABLE', `material repair cannot safely repair preflight key: ${key}`)
  }
  throw materialRepairError('MATERIAL_REPAIR_KEY_UNSUPPORTED', `unsupported material repair key: ${key}`)
}

export function resolveMaterialRepairPlan(contextPackage: any, requestedKeys?: string[]): ResolvedMaterialRepairPlan {
  const checks = Array.isArray(contextPackage?.preflight?.checks)
    ? contextPackage.preflight.checks.filter(isPlainObject)
    : []
  const checkByKey = new Map<string, Record<string, unknown>>()
  for (const check of checks) {
    const key = String(check.key || '').trim()
    if (key && !checkByKey.has(key)) checkByKey.set(key, check)
  }
  const keys = requestedKeys?.length
    ? requestedKeys.map(key => String(key || '').trim()).filter(Boolean)
    : checks
        .filter(check => check.ok !== true)
        .map(check => String(check.key || '').trim())
        .filter(Boolean)
  const obligations: MaterialRepairObligation[] = []
  const seen = new Set<string>()
  const targets = new Set<MaterialRepairTarget>()
  for (const key of keys) {
    if (seen.has(key)) continue
    seen.add(key)
    const spec = materialRepairCheckSpec(key)
    const matchedCheck = checkByKey.get(key)
    if (requestedKeys?.length && (!matchedCheck || matchedCheck.ok === true)) {
      throw materialRepairError('MATERIAL_REPAIR_KEY_NOT_FAILED', `material repair key is not a current failed preflight check: ${key}`)
    }
    const check = matchedCheck || {}
    const severityValue = String(check.severity || '').toLowerCase()
    const severity: MaterialRepairObligation['severity'] = ['low', 'medium', 'high'].includes(severityValue)
      ? severityValue as MaterialRepairObligation['severity']
      : 'unknown'
    const obligation: MaterialRepairObligation = {
      key: key as MaterialRepairCheckKey,
      targets: [...spec.targets],
      label: materialCheckText(check.label),
      severity,
      fix: materialCheckText(check.fix),
      evidence: materialCheckText(check.evidence),
      gaps: materialCheckGaps(check.gaps),
    }
    obligations.push(obligation)
    for (const target of spec.targets) targets.add(target)
  }
  return { targets, obligations }
}

export function resolveMaterialRepairTargets(contextPackage: any, requestedKeys?: string[]) {
  return new Set(resolveMaterialRepairPlan(contextPackage, requestedKeys).targets)
}

function materialRepairEffectiveTargets(plan: ResolvedMaterialRepairPlan, hasExistingCharacters: boolean) {
  const targets = new Set(plan.targets)
  const createsCharacters = targets.has('characters')
  const repairsCharacterStateReadiness = plan.obligations
    .some(obligation => obligation.key === 'source_readiness_character_state')
  if (!hasExistingCharacters && createsCharacters && repairsCharacterStateReadiness) {
    targets.delete('character_updates')
  }
  return targets
}

function assertResolvedMaterialRepairPlan(value: unknown): asserts value is ResolvedMaterialRepairPlan {
  if (!isPlainObject(value) || !(value.targets instanceof Set) || !Array.isArray(value.obligations)) {
    throw materialRepairError('MATERIAL_REPAIR_PLAN_INVALID', 'resolved material repair plan must contain targets and obligations')
  }
  const allowedTargets = new Set<unknown>(MATERIAL_REPAIR_MUTATION_FIELDS)
  for (const target of value.targets) {
    if (!allowedTargets.has(target)) {
      throw materialRepairError('MATERIAL_REPAIR_TARGET_INVALID', `unknown material repair target: ${String(target)}`)
    }
  }
  const expectedTargets = new Set<MaterialRepairTarget>()
  const seenKeys = new Set<string>()
  for (const raw of value.obligations) {
    if (!isPlainObject(raw)) {
      throw materialRepairError('MATERIAL_REPAIR_PLAN_INVALID', 'material repair obligations must be objects')
    }
    const key = typeof raw.key === 'string' ? raw.key.trim() : ''
    if (!hasOwn(REPAIRABLE_CHECKS, key)) {
      throw materialRepairError('MATERIAL_REPAIR_PLAN_INVALID', `unknown resolved material repair obligation: ${key}`)
    }
    const spec = materialRepairCheckSpec(key)
    if (seenKeys.has(key)) {
      throw materialRepairError('MATERIAL_REPAIR_PLAN_INVALID', `duplicate material repair obligation: ${key}`)
    }
    seenKeys.add(key)
    if (!Array.isArray(raw.targets) || raw.targets.length !== spec.targets.length || raw.targets.some((target, index) => target !== spec.targets[index])) {
      throw materialRepairError('MATERIAL_REPAIR_PLAN_INVALID', `material repair obligation target mismatch: ${key}`)
    }
    for (const target of spec.targets) expectedTargets.add(target)
  }
  if (expectedTargets.size !== value.targets.size || [...expectedTargets].some(target => !value.targets.has(target))) {
    throw materialRepairError('MATERIAL_REPAIR_PLAN_INVALID', 'material repair targets do not match obligations')
  }
}

function assertExistingMaterialSnapshot(value: unknown): asserts value is ExistingMaterialSnapshot {
  if (!isPlainObject(value)
    || !(value.characterNames instanceof Set)
    || !(value.settingKeys instanceof Set)
    || !isPlainObject(value.project)
    || !isPlainObject(value.chapter)
    || !isPlainObject(value.contextPackage)
    || !Array.isArray(value.chapters)
    || !Array.isArray(value.worldbuilding)
    || !Array.isArray(value.characters)
    || !Array.isArray(value.sceneCards)
    || (value.referencePreview !== null && !isPlainObject(value.referencePreview))
    || !Array.isArray(value.reviews)
    || !Array.isArray(value.settings)
    || !Array.isArray(value.chapterSettingUsage)) {
    throw materialRepairError('MATERIAL_REPAIR_SNAPSHOT_INVALID', 'material repair requires a complete transaction snapshot')
  }
}

function projectPromptView(project: any) {
  return {
    id: project?.id,
    title: project?.title,
    genre: project?.genre,
    sub_genres: project?.sub_genres,
    synopsis: project?.synopsis,
    length_target: project?.length_target,
    target_audience: project?.target_audience,
    style_tags: project?.style_tags,
    commercial_tags: project?.commercial_tags,
  }
}

function chapterPromptView(chapter: any) {
  const raw = chapter?.raw_payload || {}
  return {
    id: chapter?.id,
    project_id: chapter?.project_id,
    chapter_no: chapter?.chapter_no,
    title: chapter?.title,
    chapter_goal: chapter?.chapter_goal,
    chapter_summary: chapter?.chapter_summary,
    conflict: chapter?.conflict,
    ending_hook: chapter?.ending_hook,
    scene_breakdown: chapter?.scene_breakdown,
    scene_list: chapter?.scene_list,
    continuity_notes: chapter?.continuity_notes,
    raw_payload: {
      chapter_blueprint: raw.chapter_blueprint,
      pre_draft_brief: raw.pre_draft_brief || raw.preDraftBrief,
      must_advance: raw.must_advance,
      forbidden_repeats: raw.forbidden_repeats,
    },
  }
}

function recentChapterPromptView(chapter: any) {
  return {
    id: chapter?.id,
    chapter_no: chapter?.chapter_no,
    title: chapter?.title,
    chapter_goal: chapter?.chapter_goal,
    chapter_summary: chapter?.chapter_summary,
    conflict: chapter?.conflict,
    ending_hook: chapter?.ending_hook,
    continuity_notes: chapter?.continuity_notes,
  }
}

function materialRepairTaskIdentity(value: MaterialRepairTaskIdentity) {
  const fields: Array<keyof MaterialRepairTaskIdentity> = [
    'project_identity_hash',
    'chapter_identity_hash',
    'source_identity_hash',
    'context_identity_hash',
  ]
  const identity = {} as MaterialRepairTaskIdentity
  for (const field of fields) {
    const text = typeof value?.[field] === 'string' ? value[field].trim() : ''
    if (!text || text.length > 512) {
      throw materialRepairError('MATERIAL_REPAIR_IDENTITY_REQUIRED', `${field} must be a non-empty bounded identity hash`)
    }
    identity[field] = text
  }
  return identity
}

export function buildMaterialRepairTask(input: {
  plan: ResolvedMaterialRepairPlan
  project: any
  chapter: any
  contextPackage: any
  chapters: any[]
  worldbuilding: any[]
  characters: any[]
  outlines: any[]
  reviews: any[]
  settings: any[]
  chapterSettingUsage: any[]
  projectSettingUsage: any[]
  identity: MaterialRepairTaskIdentity
}) {
  assertResolvedMaterialRepairPlan(input.plan)
  const effectiveTargets = materialRepairEffectiveTargets(input.plan, input.characters.length > 0)
  const targets = MATERIAL_REPAIR_MUTATION_FIELDS.filter(target => effectiveTargets.has(target))
  const identity = materialRepairTaskIdentity(input.identity)
  const outputEnvelope = {
    chapter_patch: {
      title: 'string?',
      chapter_goal: 'string?',
      chapter_summary: 'string?',
      conflict: 'string?',
      ending_hook: 'string?',
      scene_breakdown: 'object[]?',
      scene_list: 'object[]?',
      raw_payload: {
        chapter_blueprint: {
          target_emotion: 'non-empty string',
          opening_hook: 'non-empty string',
          core_payoff: 'non-empty string',
          content_outline: {
            cause: 'non-empty string',
            development: 'non-empty string',
            turn: 'non-empty string',
            climax: 'non-empty string',
            ending: 'non-empty string',
          },
          plot_lines: {
            mainline: 'non-empty string',
            logic_line: 'non-empty string',
          },
          character_order: ['character name'],
          beat_sequence: ['beat with function tag'],
          cost_and_reward: 'non-empty string',
          ending_contract: { next_chapter_pull: 'non-empty string' },
        },
        pre_draft_brief: {
          state_tracking_contract: {
            source_readiness: [{ key: 'string', status: 'ready|pass|ok', evidence: 'non-empty string' }],
          },
        },
        write_preparation_brief: 'object?',
        must_advance: 'string[]?',
        forbidden_repeats: 'string[]?',
        benchmark_recall_brief: 'object?',
      },
    },
    worldbuilding: [{ world_summary: 'string', rules: 'array?', factions: 'array?', locations: 'array?', systems: 'object|array?', items: 'array?', timeline_anchor: 'object|string?', known_unknowns: 'array?' }],
    characters: [{ name: 'string', role_type: 'string?', motivation: 'string?', goal: 'string?', conflict: 'string?', current_state: 'object?', abilities: 'array?' }],
    character_updates: [{ name: 'existing character name', current_state: 'object?', goal: 'string?', conflict: 'string?', abilities: 'array?' }],
    settings: [{ entity_type: 'string', name: 'string', summary: 'string?', constraints_json: 'object?', state_json: 'object?', payload_json: 'object?' }],
    chapter_setting_usage: [{ entity_id: 'existing positive id?', entity_name: 'string?', entity_type: 'string?', usage_type: 'string?', required: 'boolean?', allowed: 'boolean?', forbidden: 'boolean?', reveal_level: 'string?', expected_state_change: 'object?' }],
    repair_summary: 'string?',
  }

  return buildBoundedProsePrompt([
    '任务：一次性补齐本章写作前置材料。只输出 JSON，不生成正文。',
    'MangaForge 本次请求中的项目材料是权威上下文；不得用远端历史覆盖。远端记忆只能辅助执行，不能新增或改写权威事实。',
    `必须补齐的分区：${JSON.stringify(targets)}`,
    `必须逐项满足的原始缺失项：${prosePromptJson(input.plan.obligations, 12000)}`,
    '仅返回必须补齐的分区以及 repair_summary；不得返回未请求分区。',
    '仅允许输出 chapter_patch, worldbuilding, characters, character_updates, settings, chapter_setting_usage, repair_summary。',
    'chapter_setting_usage 使用已有 entity_id，或使用本次 settings 中唯一的 entity_name + entity_type。',
    'source_readiness 必须是 JSON 对象数组；数组元素不得是字符串化 JSON。',
    'chapter_blueprint 返回时必须使用输出合同中的标准 snake_case 字段；five_part_summary、multi_line_progression、character_appearance_order、event_function_tags、cost_benefit 和根级 unknowns 均不能替代标准字段。',
    'chapter_blueprint 仅在原始缺失项包含 chapter_blueprint 或 source_readiness_chapter_blueprint 时返回；其他 chapter_patch 修复必须省略该字段。',
    '已有材料默认只读；不得用空字符串、空数组、空对象或 null 覆盖已有内容。',
    '不得输出正文、项目修改、来源配置、认证信息或远端身份；不得输出 Markdown 代码围栏或解释文字。',
    '【本次权威身份哈希】',
    prosePromptJson(identity, 4000),
    '【项目与写作圣经】',
    prosePromptJson({
      project: projectPromptView(input.project),
      writing_bible: input.contextPackage?.writing_bible || {},
    }, 28000),
    '【本章与严格检查】',
    prosePromptJson({
      chapter: chapterPromptView(input.chapter),
      chapter_target: input.contextPackage?.chapter_target || input.contextPackage?.chapterTarget || {},
      preflight: input.contextPackage?.preflight || {},
    }, 32000),
    '【Story State 与连续性】',
    prosePromptJson({
      story_state: input.contextPackage?.story_state || {},
      continuity: input.contextPackage?.continuity || {},
      recent_chapters: (input.chapters || []).slice(-5).map(recentChapterPromptView),
    }, 30000),
    '【已有世界观、角色、大纲、设定和调用】',
    prosePromptJson({
      worldbuilding: (input.worldbuilding || []).slice(0, 3),
      characters: (input.characters || []).slice(0, 24),
      outlines: (input.outlines || []).slice(0, 20),
      reviews: (input.reviews || []).slice(-20),
      settings: (input.settings || []).slice(0, 30),
      project_setting_usage: (input.projectSettingUsage || []).slice(0, 60),
      chapter_setting_usage: (input.chapterSettingUsage || []).slice(0, 60),
    }, 60000),
    '【输出合同】',
    prosePromptJson(outputEnvelope, 30000),
    '只输出一个 JSON 对象。仅返回必须补齐的分区；每个请求分区都必须提供非空且可保存的结果。不得输出 Markdown 代码围栏或解释文字。',
  ])
}

function materialAcceptanceRawPayload(acceptance: PreparedMaterialRepair['acceptance']) {
  const raw = acceptance.chapter_patch?.raw_payload
  return isPlainObject(raw) ? raw : {}
}

function nonEmptyRecord(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value) && Object.keys(value).length > 0
}

function mergedPlainObjects(...values: unknown[]) {
  return values.reduce<Record<string, unknown>>((current, value) => (
    isPlainObject(value) ? deepMergeObjects(current, value) : current
  ), {})
}

function materialPreDraftBriefFromRaw(rawPayload: any = {}) {
  return mergedPlainObjects(rawPayload?.preDraftBrief, rawPayload?.pre_draft_brief)
}

function materialPreDraftBriefForStorage(preDraftBrief: Record<string, unknown>) {
  const normalized = { ...preDraftBrief }
  for (const [snakeKey, camelKey] of [
    ['benchmark_recall_brief', 'benchmarkRecallBrief'],
    ['state_tracking_contract', 'stateTrackingContract'],
    ['write_preparation_brief', 'writePreparationBrief'],
  ] as const) {
    if (!hasOwn(preDraftBrief, snakeKey) && !hasOwn(preDraftBrief, camelKey)) continue
    const merged = mergedPlainObjects(preDraftBrief[camelKey], preDraftBrief[snakeKey])
    normalized[snakeKey] = merged
    normalized[camelKey] = merged
  }
  return normalized
}

function materialMergedStateTrackingContract(
  existingPreDraftBrief: Record<string, unknown>,
  patchPreDraftBrief: Record<string, unknown>,
) {
  const existing = mergedPlainObjects(
    existingPreDraftBrief.stateTrackingContract,
    existingPreDraftBrief.state_tracking_contract,
  )
  const patch = mergedPlainObjects(
    patchPreDraftBrief.stateTrackingContract,
    patchPreDraftBrief.state_tracking_contract,
  )
  if (!Object.keys(existing).length && !Object.keys(patch).length) return null
  const merged = deepMergeObjects(existing, patch)
  const sourceReadiness = materialMergedSourceReadinessRows(existing, patch)
  if (sourceReadiness) {
    merged.source_readiness = sourceReadiness
    merged.sourceReadiness = sourceReadiness
  }
  const sourceRequirements = materialMergedStringAliasValues(
    existing,
    patch,
    'source_requirements',
    'sourceRequirements',
  )
  if (sourceRequirements) {
    merged.source_requirements = sourceRequirements
    merged.sourceRequirements = sourceRequirements
  }
  return merged
}

function materialMergedStringAliasValues(
  existing: Record<string, unknown>,
  patch: Record<string, unknown>,
  snakeKey: string,
  camelKey: string,
) {
  const hasValues = hasOwn(existing, snakeKey)
    || hasOwn(existing, camelKey)
    || hasOwn(patch, snakeKey)
    || hasOwn(patch, camelKey)
  if (!hasValues) return null
  const values: string[] = []
  const seen = new Set<string>()
  for (const value of [
    ...(Array.isArray(existing[camelKey]) ? existing[camelKey] : []),
    ...(Array.isArray(existing[snakeKey]) ? existing[snakeKey] : []),
    ...(Array.isArray(patch[camelKey]) ? patch[camelKey] : []),
    ...(Array.isArray(patch[snakeKey]) ? patch[snakeKey] : []),
  ]) {
    const text = typeof value === 'string' ? value.trim() : ''
    if (!text || seen.has(text)) continue
    seen.add(text)
    values.push(text)
  }
  return values
}

function materialSourceReadinessKey(row: any) {
  return String(row?.key || row?.name || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase()
}

function materialSourceReadinessRows(contract: Record<string, unknown>) {
  return [
    ...(Array.isArray(contract.sourceReadiness) ? contract.sourceReadiness : []),
    ...(Array.isArray(contract.source_readiness) ? contract.source_readiness : []),
  ]
}

function materialMergedSourceReadinessRows(
  existing: Record<string, unknown>,
  patch: Record<string, unknown>,
) {
  const hasRows = hasOwn(existing, 'source_readiness')
    || hasOwn(existing, 'sourceReadiness')
    || hasOwn(patch, 'source_readiness')
    || hasOwn(patch, 'sourceReadiness')
  if (!hasRows) return null
  const rows: any[] = []
  const indexByKey = new Map<string, number>()
  for (const row of [...materialSourceReadinessRows(existing), ...materialSourceReadinessRows(patch)]) {
    const key = materialSourceReadinessKey(row)
    if (key && indexByKey.has(key)) {
      const index = indexByKey.get(key)!
      rows[index] = deepMergeObjects(rows[index], row)
      continue
    }
    if (key) indexByKey.set(key, rows.length)
    rows.push(row)
  }
  return rows
}

function materialPreDraftStateTracking(acceptance: PreparedMaterialRepair['acceptance']) {
  const preDraftBrief = materialPreDraftBriefFromRaw(materialAcceptanceRawPayload(acceptance))
  return mergedPlainObjects(preDraftBrief.stateTrackingContract, preDraftBrief.state_tracking_contract)
}

function mergeMaterialRepairRawPayload(existingRawPayload: any = {}, patchRawPayload: any = {}) {
  const mergedRawPayload = deepMergeObjects(existingRawPayload || {}, patchRawPayload || {})
  const existingPreDraftBrief = materialPreDraftBriefFromRaw(existingRawPayload)
  const patchPreDraftBrief = materialPreDraftBriefFromRaw(patchRawPayload)
  if (!Object.keys(existingPreDraftBrief).length && !Object.keys(patchPreDraftBrief).length) {
    return mergedRawPayload
  }
  const finalPreDraftBrief = deepMergeObjects(existingPreDraftBrief, patchPreDraftBrief)
  const stateTrackingContract = materialMergedStateTrackingContract(existingPreDraftBrief, patchPreDraftBrief)
  if (stateTrackingContract) {
    finalPreDraftBrief.state_tracking_contract = stateTrackingContract
    finalPreDraftBrief.stateTrackingContract = stateTrackingContract
  }
  const merged = mergeFinalRepairPreDraftRawPayload(
    mergedRawPayload,
    materialPreDraftBriefForStorage(finalPreDraftBrief),
  )
  const storedPreDraftBrief = { ...(merged.pre_draft_brief || {}) }
  const removeAbsentAliases = (aliases: string[]) => {
    if (aliases.some(alias => hasOwn(finalPreDraftBrief, alias))) return
    for (const alias of aliases) delete storedPreDraftBrief[alias]
  }
  removeAbsentAliases(['benchmark_recall_brief', 'benchmarkRecallBrief'])
  removeAbsentAliases(['benchmark_recall_gaps', 'benchmarkRecallGaps'])
  removeAbsentAliases(['write_preparation_brief', 'writePreparationBrief'])
  if (!hasOwn(finalPreDraftBrief, 'stateTrackingContract')) delete storedPreDraftBrief.stateTrackingContract
  return {
    ...merged,
    pre_draft_brief: storedPreDraftBrief,
    ...(hasOwn(merged, 'preDraftBrief') ? { preDraftBrief: storedPreDraftBrief } : {}),
  }
}

function completeMaterialRepairChapterPatch(
  patch: Record<string, unknown>,
  existing: ExistingMaterialSnapshot,
  confirmationTimestamp: string,
) {
  if (!hasOwn(patch, 'raw_payload')) return patch
  const existingChapter = existing.chapter || existing.contextPackage?.chapter || {}
  const existingRawPayload = existingChapter?.raw_payload || {}
  const patchRawPayload = isPlainObject(patch.raw_payload) ? patch.raw_payload : {}
  const patchPreDraftBrief = materialPreDraftBriefFromRaw(patchRawPayload)
  if (!Object.keys(patchPreDraftBrief).length) {
    return {
      ...patch,
      raw_payload: mergeMaterialRepairRawPayload(existingRawPayload, patchRawPayload),
    }
  }
  const existingPreDraftBrief = materialPreDraftBriefFromRaw(existingRawPayload)
  const confirmedAt = typeof existingPreDraftBrief.confirmed_at === 'string' && existingPreDraftBrief.confirmed_at.trim()
    ? existingPreDraftBrief.confirmed_at
    : confirmationTimestamp
  const confirmationSource = typeof existingPreDraftBrief.confirmation_source === 'string' && existingPreDraftBrief.confirmation_source.trim()
    ? existingPreDraftBrief.confirmation_source
    : 'generation_source_material_repair'
  const confirmedPatchRawPayload = {
    ...patchRawPayload,
    pre_draft_brief: {
      ...patchPreDraftBrief,
      confirmed_at: confirmedAt,
      confirmation_source: confirmationSource,
    },
  }
  return {
    ...patch,
    raw_payload: mergeMaterialRepairRawPayload(existingRawPayload, confirmedPatchRawPayload),
  }
}

type MaterialRepairEvaluationState = {
  project: any
  chapter: any
  previousChapter: any
  contextPackage: any
  chapters: any[]
  worldbuilding: any[]
  characters: any[]
  sceneCards: any[]
  referencePreview: any
  reviews: any[]
  settings: any[]
  chapterSettingUsage: any[]
}

function materialCandidateContext(contextPackage: any, chapter: any) {
  const base = isPlainObject(contextPackage) ? contextPackage : {}
  const raw = isPlainObject(chapter?.raw_payload) ? chapter.raw_payload : {}
  const rawPreDraftBrief = materialPreDraftBriefFromRaw(raw)
  const hasConfirmedPreDraftBrief = typeof rawPreDraftBrief.confirmed_at === 'string'
    && Boolean(rawPreDraftBrief.confirmed_at.trim())
  const existingTarget = mergedPlainObjects(base.chapterTarget, base.chapter_target)
  const {
    state_tracking_contract: _staleTargetStateTracking,
    stateTrackingContract: _staleTargetStateTrackingAlias,
    ...baseTarget
  } = existingTarget
  const {
    pre_draft_brief: _stalePreDraftBrief,
    preDraftBrief: _stalePreDraftBriefAlias,
    state_tracking_contract: _staleRootStateTracking,
    stateTrackingContract: _staleRootStateTrackingAlias,
    ...baseWithoutStoredPreDraft
  } = base
  const confirmedBase = hasConfirmedPreDraftBrief
    ? mergeConfirmedPreDraftBriefIntoContext({
        ...baseWithoutStoredPreDraft,
        chapter,
        chapter_target: baseTarget,
        chapterTarget: baseTarget,
      }, rawPreDraftBrief)
    : { ...base, chapter }
  const preDraftBrief = mergedPlainObjects(confirmedBase.preDraftBrief, confirmedBase.pre_draft_brief)
  const confirmedTarget = mergedPlainObjects(confirmedBase.chapter_target, confirmedBase.chapterTarget)
  const chapterBlueprint = mergedPlainObjects(
    confirmedTarget.chapterBlueprint,
    confirmedTarget.chapter_blueprint,
    preDraftBrief.chapterBlueprint,
    preDraftBrief.chapter_blueprint,
    raw.chapterBlueprint,
    raw.chapter_blueprint,
  )
  const stateTrackingContract = mergedPlainObjects(
    confirmedTarget.stateTrackingContract,
    confirmedTarget.state_tracking_contract,
    preDraftBrief.stateTrackingContract,
    preDraftBrief.state_tracking_contract,
  )
  const benchmarkRecallBrief = mergedPlainObjects(
    confirmedTarget.benchmarkRecallBrief,
    confirmedTarget.benchmark_recall_brief,
    preDraftBrief.benchmarkRecallBrief,
    preDraftBrief.benchmark_recall_brief,
    raw.benchmarkRecallBrief,
    raw.benchmark_recall_brief,
  )
  const chapterScenes = Array.isArray(chapter?.scene_list) && chapter.scene_list.length
    ? chapter.scene_list
    : Array.isArray(chapter?.scene_breakdown) && chapter.scene_breakdown.length
      ? chapter.scene_breakdown
      : []
  const existingScenes = Array.isArray(confirmedTarget.scene_cards)
    ? confirmedTarget.scene_cards
    : Array.isArray(confirmedTarget.sceneCards)
      ? confirmedTarget.sceneCards
      : []
  const sceneCards = chapterScenes.length ? chapterScenes : existingScenes
  const targetPatch: Record<string, unknown> = {
    chapter_no: chapter?.chapter_no,
    chapter_goal: chapter?.chapter_goal,
    chapter_summary: chapter?.chapter_summary,
  }
  if (Object.keys(chapterBlueprint).length) {
    targetPatch.chapter_blueprint = chapterBlueprint
    targetPatch.chapterBlueprint = chapterBlueprint
  }
  if (Object.keys(stateTrackingContract).length) {
    targetPatch.state_tracking_contract = stateTrackingContract
    targetPatch.stateTrackingContract = stateTrackingContract
  }
  if (Object.keys(benchmarkRecallBrief).length) {
    targetPatch.benchmark_recall_brief = benchmarkRecallBrief
    targetPatch.benchmarkRecallBrief = benchmarkRecallBrief
  }
  if (sceneCards.length) {
    targetPatch.scene_cards = sceneCards
    targetPatch.sceneCards = sceneCards
  }
  const chapterTarget = deepMergeObjects(confirmedTarget, targetPatch)
  return {
    ...confirmedBase,
    chapter,
    pre_draft_brief: preDraftBrief,
    preDraftBrief,
    chapter_target: chapterTarget,
    chapterTarget,
  }
}

function materialCandidateCharacters(existing: ExistingMaterialSnapshot, acceptance: PreparedMaterialRepair['acceptance']) {
  const baseCharacters = Array.isArray(existing.characters) && existing.characters.length
    ? existing.characters.map(item => deepMergeObjects({}, item))
    : [...existing.characterNames].map(name => ({ name }))
  const byName = new Map(baseCharacters.map(character => [String(character?.name || '').trim(), character]))
  for (const character of acceptance.character_creates || []) {
    const name = String(character?.name || '').trim()
    if (name) byName.set(name, deepMergeObjects({}, character))
  }
  for (const update of acceptance.character_updates || []) {
    const name = String(update?.name || '').trim()
    if (!name) continue
    byName.set(name, deepMergeObjects(byName.get(name) || { name }, update.patch || {}))
  }
  return [...byName.values()]
}

function completeMaterialRepairCharacterUpdate(
  update: { name: string; patch: Record<string, unknown> },
  existing: ExistingMaterialSnapshot,
) {
  if (!hasOwn(update.patch, 'current_state')) return update
  const currentCharacter = existing.characters.find(character => String(character?.name || '').trim() === update.name)
  const currentState = isPlainObject(currentCharacter?.current_state)
    ? currentCharacter.current_state
    : isPlainObject(currentCharacter?.currentState)
      ? currentCharacter.currentState
      : {}
  return {
    ...update,
    patch: {
      ...update.patch,
      current_state: deepMergeObjects(currentState, update.patch.current_state),
    },
  }
}

function materialRepairEvaluationState(
  existing: ExistingMaterialSnapshot,
  acceptance: PreparedMaterialRepair['acceptance'],
): MaterialRepairEvaluationState {
  const existingChapter = existing.chapter || existing.contextPackage?.chapter || { chapter_no: 1, raw_payload: {} }
  const chapter = normalizeChapterRecord(acceptance.chapter_patch || {}, existingChapter)
  const chapters = Array.isArray(existing.chapters) ? existing.chapters : []
  const contextPackage = acceptance.chapter_patch && Object.keys(acceptance.chapter_patch).length
    ? materialCandidateContext(existing.contextPackage || {}, chapter)
    : existing.contextPackage || {}
  const contextStoryState = contextPackage.story_state || contextPackage.storyState
  const projectBase = existing.project || contextPackage.project || {}
  const project = contextStoryState && !projectBase?.reference_config?.story_state
    ? deepMergeObjects(projectBase, { reference_config: { story_state: contextStoryState } })
    : projectBase
  const previousChapter = contextPackage?.continuity?.previous_chapter
    || contextPackage?.continuity?.previousChapter
    || chapters
      .filter(item => Number(item?.chapter_no || 0) < Number(chapter?.chapter_no || 0))
      .sort((left, right) => Number(right?.chapter_no || 0) - Number(left?.chapter_no || 0))[0]
    || null
  const worldbuilding = [
    ...(Array.isArray(existing.worldbuilding) ? existing.worldbuilding : []),
    ...(acceptance.worldbuilding_creates || []),
  ]
  const characters = materialCandidateCharacters(existing, acceptance)
  const target = contextPackage.chapter_target || {}
  const sceneCards = Array.isArray(chapter.scene_list) && chapter.scene_list.length
    ? chapter.scene_list
    : Array.isArray(chapter.scene_breakdown) && chapter.scene_breakdown.length
      ? chapter.scene_breakdown
      : Array.isArray(existing.sceneCards) && existing.sceneCards.length
        ? existing.sceneCards
        : Array.isArray(target.scene_cards)
          ? target.scene_cards
          : []
  const settings = [
    ...(Array.isArray(existing.settings) ? existing.settings : []),
    ...(acceptance.setting_creates || []),
  ]
  const chapterSettingUsage = acceptance.chapter_setting_usage_replacement
    || (Array.isArray(existing.chapterSettingUsage) ? existing.chapterSettingUsage : [])
  return {
    project,
    chapter,
    previousChapter,
    contextPackage,
    chapters,
    worldbuilding,
    characters,
    sceneCards,
    referencePreview: existing.referencePreview || contextPackage.reference_preview || contextPackage.referencePreview || {},
    reviews: Array.isArray(existing.reviews) ? existing.reviews : [],
    settings,
    chapterSettingUsage,
  }
}

function basicPreflightCheckFailed(state: MaterialRepairEvaluationState, key: MaterialRepairCheckKey) {
  const preflight = buildPreflightChecks(
    state.project,
    state.chapter,
    state.previousChapter,
    state.worldbuilding,
    state.characters,
    state.sceneCards,
    state.referencePreview,
    state.reviews,
  )
  return preflight.checks.some((check: any) => check?.key === key && check?.ok !== true)
}

function benchmarkPreflightCheckFailed(state: MaterialRepairEvaluationState, key: MaterialRepairCheckKey) {
  const raw = isPlainObject(state.chapter?.raw_payload) ? state.chapter.raw_payload : {}
  const source = {
    ...raw,
    chapter_target: state.contextPackage.chapter_target || {},
    chapterTarget: state.contextPackage.chapterTarget || {},
    pre_draft_brief: state.contextPackage.pre_draft_brief || {},
    preDraftBrief: state.contextPackage.preDraftBrief || {},
  }
  return buildBenchmarkRecallPreflightChecks(source).some((check: any) => check?.key === key && check?.ok !== true)
}

function materialProductionCheckFailed(state: MaterialRepairEvaluationState, key: MaterialRepairCheckKey) {
  switch (key) {
    case 'chapter_blueprint':
    case 'scene_cards':
    case 'chapter_conflict':
    case 'ending_hook':
    case 'worldbuilding':
    case 'characters':
    case 'character_state':
    case 'plot_points':
    case 'no_repeat':
      return basicPreflightCheckFailed(state, key)
    case 'benchmark_recall_source_paths':
      return benchmarkPreflightCheckFailed(state, key)
    case 'setting_workshop':
      return state.settings.length === 0
    case 'chapter_setting_usage':
      return state.chapterSettingUsage.length === 0
    case 'chapter_title_unique':
      return buildChapterTitleUniquenessReport(state.chapters, state.chapter).status !== 'ok'
    case 'source_readiness_chapter_blueprint':
    case 'source_readiness_context_tracking':
    case 'source_readiness_foreshadowing_tracking':
    case 'source_readiness_foreshadowing_history':
    case 'source_readiness_timeline_tracking':
    case 'source_readiness_world_constraints':
    case 'source_readiness_scene_card_goal_obstacle_change':
      return buildSourceReadinessPreflightChecks(state.contextPackage)
        .some((check: any) => check?.key === key && check?.ok !== true)
    case 'source_readiness_character_state':
      return buildSourceReadinessPreflightChecks(state.contextPackage)
        .some((check: any) => check?.key === key && check?.ok !== true)
        || basicPreflightCheckFailed(state, 'character_state')
  }
}

function chapterMutationAllowance(obligations: readonly MaterialRepairObligation[]) {
  const fields = new Set<string>()
  const rawFields = new Set<string>()
  const preDraftFields = new Set<string>()
  for (const obligation of obligations) {
    switch (obligation.key) {
      case 'chapter_blueprint':
        fields.add('chapter_goal')
        fields.add('chapter_summary')
        rawFields.add('chapter_blueprint')
        break
      case 'scene_cards':
      case 'source_readiness_scene_card_goal_obstacle_change':
        fields.add('scene_breakdown')
        fields.add('scene_list')
        break
      case 'chapter_conflict':
        fields.add('conflict')
        break
      case 'ending_hook':
        fields.add('ending_hook')
        break
      case 'plot_points':
        fields.add('chapter_goal')
        fields.add('chapter_summary')
        rawFields.add('must_advance')
        break
      case 'no_repeat':
        rawFields.add('forbidden_repeats')
        break
      case 'benchmark_recall_source_paths':
        rawFields.add('benchmark_recall_brief')
        break
      case 'chapter_title_unique':
        fields.add('title')
        break
      case 'source_readiness_chapter_blueprint':
        rawFields.add('chapter_blueprint')
        rawFields.add('pre_draft_brief')
        preDraftFields.add('state_tracking_contract')
        break
      case 'source_readiness_context_tracking':
      case 'source_readiness_foreshadowing_tracking':
      case 'source_readiness_foreshadowing_history':
      case 'source_readiness_timeline_tracking':
      case 'source_readiness_character_state':
      case 'source_readiness_world_constraints':
        rawFields.add('pre_draft_brief')
        preDraftFields.add('state_tracking_contract')
        break
    }
  }
  return { fields, rawFields, preDraftFields }
}

function assertRelevantMaterialMutation(
  plan: ResolvedMaterialRepairPlan,
  effectiveTargets: ReadonlySet<MaterialRepairTarget>,
  acceptance: PreparedMaterialRepair['acceptance'],
) {
  const allowance = chapterMutationAllowance(plan.obligations)
  const patch = acceptance.chapter_patch || {}
  for (const field of Object.keys(patch)) {
    if (field === 'raw_payload') continue
    if (!allowance.fields.has(field)) {
      throw materialRepairError('MATERIAL_REPAIR_UNRELATED_MUTATION', `chapter_patch.${field} is unrelated to requested obligations`)
    }
  }
  const raw = materialAcceptanceRawPayload(acceptance)
  for (const field of Object.keys(raw)) {
    if (!allowance.rawFields.has(field)) {
      throw materialRepairError('MATERIAL_REPAIR_UNRELATED_MUTATION', `chapter_patch.raw_payload.${field} is unrelated to requested obligations`)
    }
  }
  if (nonEmptyRecord(raw.pre_draft_brief)) {
    for (const field of Object.keys(raw.pre_draft_brief)) {
      if (!allowance.preDraftFields.has(field)) {
        throw materialRepairError('MATERIAL_REPAIR_UNRELATED_MUTATION', `chapter_patch.raw_payload.pre_draft_brief.${field} is unrelated to requested obligations`)
      }
    }
    const stateTracking = materialPreDraftStateTracking(acceptance)
    for (const field of Object.keys(stateTracking)) {
      if (!['source_readiness', 'sourceReadiness'].includes(field)) {
        throw materialRepairError('MATERIAL_REPAIR_UNRELATED_MUTATION', `state_tracking_contract.${field} is unrelated to source readiness repair`)
      }
    }
  }
  if (effectiveTargets.has('character_updates')) {
    for (const update of acceptance.character_updates || []) {
      for (const field of Object.keys(update.patch || {})) {
        if (field !== 'current_state') {
          throw materialRepairError('MATERIAL_REPAIR_UNRELATED_MUTATION', `character update ${field} is unrelated to character state repair`)
        }
      }
    }
  }
}

function assertMaterialObligationsSatisfied(
  plan: ResolvedMaterialRepairPlan,
  effectiveTargets: ReadonlySet<MaterialRepairTarget>,
  existing: ExistingMaterialSnapshot,
  acceptance: PreparedMaterialRepair['acceptance'],
  mutationAcceptance: PreparedMaterialRepair['acceptance'],
) {
  const baseline = materialRepairEvaluationState(existing, { chapter_patch: {} })
  const candidate = materialRepairEvaluationState(existing, acceptance)
  for (const obligation of plan.obligations) {
    if (!materialProductionCheckFailed(baseline, obligation.key)) {
      throw materialRepairError('MATERIAL_REPAIR_OBLIGATION_UNMET', `material repair baseline does not reproduce failed production check: ${obligation.key}`)
    }
    if (materialProductionCheckFailed(candidate, obligation.key)) {
      throw materialRepairError('MATERIAL_REPAIR_OBLIGATION_UNMET', `material repair did not satisfy: ${obligation.key}`)
    }
  }
  assertRelevantMaterialMutation(plan, effectiveTargets, mutationAcceptance)
}

function materialRepairConfirmationTimestamp(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    throw materialRepairError('MATERIAL_REPAIR_CONFIRMATION_INVALID', 'material repair confirmationTimestamp is required')
  }
  const timestamp = value.trim()
  const parsed = Date.parse(timestamp)
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== timestamp) {
    throw materialRepairError('MATERIAL_REPAIR_CONFIRMATION_INVALID', 'material repair confirmationTimestamp must be a canonical ISO timestamp')
  }
  return timestamp
}

export function prepareMcpMaterialRepairMutation(input: {
  plan: ResolvedMaterialRepairPlan
  payload: unknown
  existing: ExistingMaterialSnapshot
  confirmationTimestamp: string
}): PreparedMaterialRepair {
  assertResolvedMaterialRepairPlan(input.plan)
  assertExistingMaterialSnapshot(input.existing)
  const effectiveTargets = materialRepairEffectiveTargets(
    input.plan,
    input.existing.characters.length > 0 || input.existing.characterNames.size > 0,
  )
  const confirmationTimestamp = materialRepairConfirmationTimestamp(input.confirmationTimestamp)
  if (!isPlainObject(input.payload)) {
    throw materialRepairError('MATERIAL_REPAIR_INVALID', 'material repair payload must be an object')
  }
  let serialized = ''
  try {
    serialized = JSON.stringify(input.payload)
  } catch {
    throw materialRepairError('MATERIAL_REPAIR_INVALID', 'material repair payload must be JSON serializable')
  }
  if (serialized.length > MATERIAL_REPAIR_OUTPUT_MAX_CHARS) {
    throw materialRepairError('MATERIAL_REPAIR_LIMIT_EXCEEDED', 'material repair payload exceeds its size limit')
  }
  assertNoForbiddenMutationKeys(input.payload)
  const payload = normalizeMisnestedMaterialRootSections(input.payload)
  const allowedTopLevel = new Set<string>([...MATERIAL_REPAIR_MUTATION_FIELDS, 'repair_summary'])
  assertAllowedFields(payload, allowedTopLevel, 'material repair payload')
  for (const section of MATERIAL_REPAIR_MUTATION_FIELDS) {
    if (hasOwn(payload, section) && !effectiveTargets.has(section)) {
      if (section === 'character_updates'
        && effectiveTargets.has('characters')
        && !effectiveTargets.has('character_updates')
        && input.existing.characters.length === 0
        && input.existing.characterNames.size === 0) {
        if (!Array.isArray(payload.character_updates)) {
          invalidMaterialField('character_updates', 'an array')
        }
        continue
      }
      throw materialRepairError('MATERIAL_REPAIR_FORBIDDEN_FIELD', `material repair returned non-requested section: ${section}`)
    }
  }
  if (effectiveTargets.size === 0) {
    throw materialRepairError('MATERIAL_REPAIR_INCOMPLETE', 'material repair requested no mutation target')
  }

  const acceptance: PreparedMaterialRepair['acceptance'] = { chapter_patch: {} }
  const mutationAcceptance: PreparedMaterialRepair['acceptance'] = { chapter_patch: {} }
  const applied: PreparedMaterialRepair['applied'] = []
  const createdCharacterNames = new Set<string>()
  const updatedCharacterNames = new Set<string>()
  const createdSettingKeys = new Set<string>()
  const syntheticForbiddenSettings: Record<string, unknown>[] = []

  if (effectiveTargets.has('chapter_patch')) {
    if (!hasOwn(payload, 'chapter_patch')) {
      throw materialRepairError('MATERIAL_REPAIR_INCOMPLETE', 'chapter_patch did not return a meaningful result')
    }
    const patch = normalizeChapterPatch(payload.chapter_patch)
    if (Object.keys(patch).length === 0) {
      throw materialRepairError('MATERIAL_REPAIR_INCOMPLETE', 'chapter_patch did not return a meaningful result')
    }
    mutationAcceptance.chapter_patch = patch
    acceptance.chapter_patch = completeMaterialRepairChapterPatch(patch, input.existing, confirmationTimestamp)
    applied.push({ type: 'chapter_patch' })
  }

  if (effectiveTargets.has('worldbuilding')) {
    const creates = requiredCollection(payload, 'worldbuilding').map(normalizeWorldbuilding)
    if (creates.some(item => Object.keys(item).length === 0)) {
      throw materialRepairError('MATERIAL_REPAIR_INCOMPLETE', 'worldbuilding contains an empty result')
    }
    acceptance.worldbuilding_creates = creates
    applied.push({ type: 'worldbuilding_created', count: creates.length })
  }

  if (effectiveTargets.has('characters')) {
    const creates = requiredCollection(payload, 'characters').map(normalizeCharacterCreate)
    for (const character of creates) {
      if (input.existing.characterNames.has(character.name) || createdCharacterNames.has(character.name)) {
        throw materialRepairError('MATERIAL_REPAIR_DUPLICATE', `duplicate character name: ${character.name}`)
      }
      createdCharacterNames.add(character.name)
    }
    acceptance.character_creates = creates
    applied.push({ type: 'characters_created', count: creates.length })
  }

  if (effectiveTargets.has('character_updates')) {
    const updates = requiredCollection(payload, 'character_updates').map(normalizeCharacterUpdate)
    for (const update of updates) {
      if (createdCharacterNames.has(update.name) || updatedCharacterNames.has(update.name)) {
        throw materialRepairError('MATERIAL_REPAIR_DUPLICATE', `duplicate character name: ${update.name}`)
      }
      if (!input.existing.characterNames.has(update.name)) {
        throw materialRepairError('MATERIAL_REPAIR_REFERENCE_INVALID', `character update cannot resolve: ${update.name}`)
      }
      updatedCharacterNames.add(update.name)
    }
    acceptance.character_updates = updates.map(update => completeMaterialRepairCharacterUpdate(update, input.existing))
    mutationAcceptance.character_updates = updates
    applied.push({ type: 'characters_updated', count: updates.length })
  }

  if (effectiveTargets.has('settings')) {
    const creates = requiredCollection(payload, 'settings').map(normalizeSetting)
    for (const setting of creates) {
      const key = settingKey(setting.entity_type, setting.name)
      if (input.existing.settingKeys.has(key) || createdSettingKeys.has(key)) {
        throw materialRepairError('MATERIAL_REPAIR_DUPLICATE', `duplicate setting identity: ${String(setting.name)}`)
      }
      createdSettingKeys.add(key)
    }
    acceptance.setting_creates = creates
    applied.push({ type: 'settings_created', count: creates.length })
  }

  if (effectiveTargets.has('chapter_setting_usage')) {
    const availableSettingKeys = new Set([...input.existing.settingKeys, ...createdSettingKeys])
    const seenUsage = new Set<string>()
    const usages = requiredCollection(payload, 'chapter_setting_usage').map(item => {
      let usage: ReturnType<typeof normalizeUsage>
      try {
        usage = normalizeUsage(item, input.existing, availableSettingKeys)
      } catch (error) {
        const code = error && typeof error === 'object' && 'code' in error && typeof (error as any).code === 'string'
          ? (error as any).code
          : ''
        const placeholder = code === 'MATERIAL_REPAIR_REFERENCE_INVALID'
          ? unresolvedForbiddenUsagePlaceholder(item, availableSettingKeys)
          : null
        if (!placeholder) throw error
        syntheticForbiddenSettings.push(placeholder.setting)
        createdSettingKeys.add(placeholder.key)
        availableSettingKeys.add(placeholder.key)
        usage = normalizeUsage(item, input.existing, availableSettingKeys)
      }
      if (seenUsage.has(usage.identityKey)) {
        throw materialRepairError('MATERIAL_REPAIR_DUPLICATE', `duplicate chapter setting usage: ${usage.identityKey}`)
      }
      seenUsage.add(usage.identityKey)
      return usage.normalized
    })
    acceptance.chapter_setting_usage_replacement = usages
    applied.push({ type: 'chapter_setting_usage_replaced', count: usages.length })
  }

  if (syntheticForbiddenSettings.length > 0) {
    acceptance.setting_creates = [
      ...(acceptance.setting_creates || []),
      ...syntheticForbiddenSettings,
    ]
    applied.push({ type: 'forbidden_settings_created', count: syntheticForbiddenSettings.length })
  }

  assertMaterialObligationsSatisfied(input.plan, effectiveTargets, input.existing, acceptance, mutationAcceptance)
  const summaryValue = payload.repair_summary
  if (summaryValue !== undefined && typeof summaryValue !== 'string') {
    throw materialRepairError('MATERIAL_REPAIR_INVALID', 'repair_summary must be a string')
  }
  const summary = typeof summaryValue === 'string' ? summaryValue.trim().slice(0, 2000) : ''
  return { acceptance, applied, summary }
}

export function materialRepairExistingSnapshot(input: {
  characters: Array<{ id?: number; name?: string }>
  settings: Array<{ id?: number; entity_type?: string; name?: string }>
  project: any
  chapter: any
  contextPackage: any
  chapters: any[]
  worldbuilding: any[]
  sceneCards: any[]
  referencePreview: any
  reviews: any[]
  chapterSettingUsage: any[]
}): ExistingMaterialSnapshot {
  const characterNames = new Set(
    input.characters
      .map(item => String(item.name || '').trim())
      .filter(Boolean),
  )
  const characterIds = new Set(
    input.characters
      .map(item => Number(item.id || 0))
      .filter(id => Number.isInteger(id) && id > 0),
  )
  const settingKeys = new Set<string>()
  const settingIds = new Set<number>()
  const settingKeysById = new Map<number, string>()
  for (const setting of input.settings) {
    const name = String(setting.name || '').trim()
    if (!name) continue
    const key = settingKey(setting.entity_type, name)
    settingKeys.add(key)
    const id = Number(setting.id || 0)
    if (Number.isInteger(id) && id > 0) {
      settingIds.add(id)
      settingKeysById.set(id, key)
    }
  }
  return {
    characterNames,
    settingKeys,
    characterIds,
    settingIds,
    settingKeysById,
    project: input.project,
    chapter: input.chapter,
    contextPackage: input.contextPackage,
    chapters: input.chapters,
    worldbuilding: input.worldbuilding,
    characters: input.characters,
    sceneCards: input.sceneCards,
    referencePreview: input.referencePreview,
    reviews: input.reviews,
    settings: input.settings,
    chapterSettingUsage: input.chapterSettingUsage,
  }
}
