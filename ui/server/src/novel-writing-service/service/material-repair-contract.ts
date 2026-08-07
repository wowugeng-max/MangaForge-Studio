import type { NovelChapterAcceptanceInput } from '../../novel'
import {
  buildBoundedProsePrompt,
  prosePromptJson,
} from '../../novel-writing/prose-prompt-context'

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
  benchmark_recall_gate: { targets: ['chapter_patch'] },
  benchmark_recall_gaps: { targets: ['chapter_patch'] },
  benchmark_recall_source_paths: { targets: ['chapter_patch'] },
  setting_workshop: { targets: ['settings'] },
  chapter_setting_usage: { targets: ['chapter_setting_usage'] },
  chapter_title_unique: { targets: ['chapter_patch'] },
  source_readiness_chapter_blueprint: { targets: ['chapter_patch'] },
  source_readiness_context_tracking: { targets: ['chapter_patch'] },
  source_readiness_foreshadowing_tracking: { targets: ['chapter_patch'] },
  source_readiness_timeline_tracking: { targets: ['chapter_patch'] },
  source_readiness_character_state: { targets: ['chapter_patch', 'character_updates'] },
  source_readiness_scene_card_goal_obstacle_change: { targets: ['chapter_patch'] },
} as const satisfies Record<string, { targets: readonly MaterialRepairTarget[] }>

const UNREPAIRABLE_CHECKS = new Set([
  'previous_continuity',
  'source_readiness_previous_chapter',
  'source_readiness_serial_story_state',
  'reference_knowledge',
  'copy_safety_policy',
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

export type MaterialRepairRequest = {
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

const CHARACTER_CREATE_FIELDS = new Set(['name', ...CHARACTER_MUTATION_FIELDS])
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

type ExistingMaterialIdentity = {
  characterNames: Set<string>
  settingKeys: Set<string>
  characterIds?: Set<number>
  settingIds?: Set<number>
  settingKeysById?: Map<number, string>
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
    const raw = value.raw_payload
    if (!isPlainObject(raw)) {
      throw materialRepairError('MATERIAL_REPAIR_INVALID', 'chapter_patch.raw_payload must be an object')
    }
    assertAllowedFields(raw, CHAPTER_RAW_PAYLOAD_FIELDS, 'chapter_patch.raw_payload')
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
  existing: ExistingMaterialIdentity,
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
  if (UNREPAIRABLE_CHECKS.has(key)) {
    throw materialRepairError('MATERIAL_REPAIR_UNREPAIRABLE', `material repair cannot safely repair preflight key: ${key}`)
  }
  const spec = REPAIRABLE_CHECKS[key as MaterialRepairCheckKey]
  if (!spec) {
    throw materialRepairError('MATERIAL_REPAIR_KEY_UNSUPPORTED', `unsupported material repair key: ${key}`)
  }
  return spec
}

export function resolveMaterialRepairRequest(contextPackage: any, requestedKeys?: string[]): MaterialRepairRequest {
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
    const check = checkByKey.get(key) || {}
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
  return new Set(resolveMaterialRepairRequest(contextPackage, requestedKeys).targets)
}

function assertMaterialRepairRequest(value: unknown): asserts value is MaterialRepairRequest {
  if (!isPlainObject(value) || !(value.targets instanceof Set) || !Array.isArray(value.obligations)) {
    throw materialRepairError('MATERIAL_REPAIR_REQUEST_INVALID', 'material repair request must contain targets and obligations')
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
      throw materialRepairError('MATERIAL_REPAIR_REQUEST_INVALID', 'material repair obligations must be objects')
    }
    const key = typeof raw.key === 'string' ? raw.key.trim() : ''
    const spec = materialRepairCheckSpec(key)
    if (seenKeys.has(key)) {
      throw materialRepairError('MATERIAL_REPAIR_REQUEST_INVALID', `duplicate material repair obligation: ${key}`)
    }
    seenKeys.add(key)
    if (!Array.isArray(raw.targets) || raw.targets.length !== spec.targets.length || raw.targets.some((target, index) => target !== spec.targets[index])) {
      throw materialRepairError('MATERIAL_REPAIR_REQUEST_INVALID', `material repair obligation target mismatch: ${key}`)
    }
    for (const target of spec.targets) expectedTargets.add(target)
  }
  if (expectedTargets.size !== value.targets.size || [...expectedTargets].some(target => !value.targets.has(target))) {
    throw materialRepairError('MATERIAL_REPAIR_REQUEST_INVALID', 'material repair targets do not match obligations')
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
  request: MaterialRepairRequest
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
  assertMaterialRepairRequest(input.request)
  const targets = MATERIAL_REPAIR_MUTATION_FIELDS.filter(target => input.request.targets.has(target))
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
        chapter_blueprint: 'object?',
        pre_draft_brief: {
          state_tracking_contract: {
            source_readiness: [{ key: 'string', status: 'ready|pass|ok', evidence: 'non-empty string' }],
          },
        },
        write_preparation_brief: 'object?',
        must_advance: 'string[]?',
        forbidden_repeats: 'string[]?',
        benchmark_recall_brief: 'object?',
        benchmark_recall_gaps: 'string[]?',
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
    `必须逐项满足的原始缺失项：${prosePromptJson(input.request.obligations, 12000)}`,
    '仅返回必须补齐的分区以及 repair_summary；不得返回未请求分区。',
    '仅允许输出 chapter_patch, worldbuilding, characters, character_updates, settings, chapter_setting_usage, repair_summary。',
    'chapter_setting_usage 使用已有 entity_id，或使用本次 settings 中唯一的 entity_name + entity_type。',
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

function nonEmptyRecord(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value) && Object.keys(value).length > 0
}

function nonEmptyString(value: unknown) {
  return typeof value === 'string' && Boolean(value.trim())
}

function materialAcceptanceRawPayload(acceptance: PreparedMaterialRepair['acceptance']) {
  const raw = acceptance.chapter_patch?.raw_payload
  return isPlainObject(raw) ? raw : {}
}

function materialPreDraftBrief(acceptance: PreparedMaterialRepair['acceptance']) {
  const raw = materialAcceptanceRawPayload(acceptance)
  const brief = raw.pre_draft_brief || raw.preDraftBrief
  return isPlainObject(brief) ? brief : {}
}

function materialPreDraftStateTracking(acceptance: PreparedMaterialRepair['acceptance']) {
  const brief = materialPreDraftBrief(acceptance)
  const contract = brief.state_tracking_contract || brief.stateTrackingContract
  return isPlainObject(contract) ? contract : {}
}

function sourceReadinessKeyForObligation(key: MaterialRepairCheckKey) {
  return key.replace(/^source_readiness_/, '').replace(/^scene_card_goal_obstacle_change$/, 'scene_card_goal_obstacle_change')
}

function hasReadySourceReadinessRow(acceptance: PreparedMaterialRepair['acceptance'], obligation: MaterialRepairObligation) {
  const contract = materialPreDraftStateTracking(acceptance)
  const rows = contract.source_readiness || contract.sourceReadiness
  if (!Array.isArray(rows)) return false
  const expected = sourceReadinessKeyForObligation(obligation.key)
  return rows.some(row => {
    if (!isPlainObject(row)) return false
    const key = String(row.key || row.name || '').trim()
    const status = String(row.status || '').trim().toLowerCase()
    const evidence = materialCheckText(row.evidence || row.source || row.summary)
    return key === expected && ['ready', 'pass', 'ok'].includes(status) && Boolean(evidence)
  })
}

function materialSceneCards(acceptance: PreparedMaterialRepair['acceptance']) {
  const patch = acceptance.chapter_patch || {}
  if (Array.isArray(patch.scene_list) && patch.scene_list.length) return patch.scene_list
  if (Array.isArray(patch.scene_breakdown) && patch.scene_breakdown.length) return patch.scene_breakdown
  return []
}

function sceneCardsHaveGoalObstacleChange(acceptance: PreparedMaterialRepair['acceptance']) {
  const cards = materialSceneCards(acceptance)
  return cards.length > 0 && cards.every(card => {
    if (!isPlainObject(card)) return false
    return nonEmptyString(card.goal || card.scene_goal || card.sceneGoal)
      && nonEmptyString(card.obstacle || card.conflict)
      && nonEmptyString(card.change || card.state_delta || card.stateDelta || card.turn || card.payoff)
  })
}

function hasNestedSourcePaths(value: unknown, depth = 0): boolean {
  if (!value || typeof value !== 'object' || depth > 8) return false
  if (Array.isArray(value)) return value.some(item => hasNestedSourcePaths(item, depth + 1))
  if (!isPlainObject(value)) return false
  for (const [key, item] of Object.entries(value)) {
    if (/source_?paths?|style_profile_path|module_source_path|rhythm_source_path|deep_dive_path|summary_source_path/i.test(key)) {
      if (nonEmptyString(item) || (Array.isArray(item) && item.some(nonEmptyString))) return true
    }
    if (hasNestedSourcePaths(item, depth + 1)) return true
  }
  return false
}

function obligationSatisfied(obligation: MaterialRepairObligation, acceptance: PreparedMaterialRepair['acceptance']) {
  const patch = acceptance.chapter_patch || {}
  const raw = materialAcceptanceRawPayload(acceptance)
  const characterUpdates = acceptance.character_updates || []
  switch (obligation.key) {
    case 'chapter_blueprint':
      return nonEmptyRecord(raw.chapter_blueprint)
    case 'scene_cards':
      return materialSceneCards(acceptance).length > 0
    case 'chapter_conflict':
      return nonEmptyString(patch.conflict)
    case 'ending_hook':
      return nonEmptyString(patch.ending_hook)
    case 'worldbuilding':
      return Boolean(acceptance.worldbuilding_creates?.length)
    case 'characters':
      return Boolean(acceptance.character_creates?.length)
    case 'character_state':
      return characterUpdates.some(update => nonEmptyRecord(update.patch?.current_state))
    case 'plot_points':
      return nonEmptyString(patch.chapter_goal)
        || nonEmptyString(patch.chapter_summary)
        || (Array.isArray(raw.must_advance) && raw.must_advance.some(nonEmptyString))
    case 'no_repeat':
      return Array.isArray(raw.forbidden_repeats) && raw.forbidden_repeats.some(nonEmptyString)
    case 'benchmark_recall_gate':
    case 'benchmark_recall_gaps':
      return nonEmptyRecord(raw.benchmark_recall_brief)
    case 'benchmark_recall_source_paths':
      return nonEmptyRecord(raw.benchmark_recall_brief) && hasNestedSourcePaths(raw.benchmark_recall_brief)
    case 'setting_workshop':
      return Boolean(acceptance.setting_creates?.length)
    case 'chapter_setting_usage':
      return Boolean(acceptance.chapter_setting_usage_replacement?.length)
    case 'chapter_title_unique':
      return nonEmptyString(patch.title)
    case 'source_readiness_chapter_blueprint':
      return nonEmptyRecord(raw.chapter_blueprint) && hasReadySourceReadinessRow(acceptance, obligation)
    case 'source_readiness_context_tracking':
    case 'source_readiness_foreshadowing_tracking':
    case 'source_readiness_timeline_tracking':
      return hasReadySourceReadinessRow(acceptance, obligation)
    case 'source_readiness_character_state':
      return characterUpdates.some(update => nonEmptyRecord(update.patch?.current_state))
        && hasReadySourceReadinessRow(acceptance, obligation)
    case 'source_readiness_scene_card_goal_obstacle_change':
      return sceneCardsHaveGoalObstacleChange(acceptance)
  }
}

function chapterMutationAllowance(obligations: readonly MaterialRepairObligation[]) {
  const fields = new Set<string>()
  const rawFields = new Set<string>()
  const preDraftFields = new Set<string>()
  for (const obligation of obligations) {
    switch (obligation.key) {
      case 'chapter_blueprint':
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
      case 'benchmark_recall_gate':
      case 'benchmark_recall_gaps':
        rawFields.add('benchmark_recall_brief')
        rawFields.add('benchmark_recall_gaps')
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
      case 'source_readiness_timeline_tracking':
      case 'source_readiness_character_state':
        rawFields.add('pre_draft_brief')
        preDraftFields.add('state_tracking_contract')
        break
    }
  }
  return { fields, rawFields, preDraftFields }
}

function assertRelevantMaterialMutation(request: MaterialRepairRequest, acceptance: PreparedMaterialRepair['acceptance']) {
  const allowance = chapterMutationAllowance(request.obligations)
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
      if (!['source_readiness', 'sourceReadiness', 'source_requirements', 'sourceRequirements'].includes(field)) {
        throw materialRepairError('MATERIAL_REPAIR_UNRELATED_MUTATION', `state_tracking_contract.${field} is unrelated to source readiness repair`)
      }
    }
  }
  if (request.targets.has('character_updates')) {
    for (const update of acceptance.character_updates || []) {
      for (const field of Object.keys(update.patch || {})) {
        if (field !== 'current_state') {
          throw materialRepairError('MATERIAL_REPAIR_UNRELATED_MUTATION', `character update ${field} is unrelated to character state repair`)
        }
      }
    }
  }
}

function assertMaterialObligationsSatisfied(request: MaterialRepairRequest, acceptance: PreparedMaterialRepair['acceptance']) {
  for (const obligation of request.obligations) {
    if (!obligationSatisfied(obligation, acceptance)) {
      throw materialRepairError('MATERIAL_REPAIR_OBLIGATION_UNMET', `material repair did not satisfy: ${obligation.key}`)
    }
  }
  assertRelevantMaterialMutation(request, acceptance)
}

export function prepareMcpMaterialRepairMutation(input: {
  request: MaterialRepairRequest
  payload: unknown
  existing: ExistingMaterialIdentity
}): PreparedMaterialRepair {
  assertMaterialRepairRequest(input.request)
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
  const allowedTopLevel = new Set<string>([...MATERIAL_REPAIR_MUTATION_FIELDS, 'repair_summary'])
  assertAllowedFields(input.payload, allowedTopLevel, 'material repair payload')
  for (const section of MATERIAL_REPAIR_MUTATION_FIELDS) {
    if (hasOwn(input.payload, section) && !input.request.targets.has(section)) {
      throw materialRepairError('MATERIAL_REPAIR_FORBIDDEN_FIELD', `material repair returned non-requested section: ${section}`)
    }
  }
  if (input.request.targets.size === 0) {
    throw materialRepairError('MATERIAL_REPAIR_INCOMPLETE', 'material repair requested no mutation target')
  }

  const acceptance: PreparedMaterialRepair['acceptance'] = { chapter_patch: {} }
  const applied: PreparedMaterialRepair['applied'] = []
  const createdCharacterNames = new Set<string>()
  const updatedCharacterNames = new Set<string>()
  const createdSettingKeys = new Set<string>()

  if (input.request.targets.has('chapter_patch')) {
    if (!hasOwn(input.payload, 'chapter_patch')) {
      throw materialRepairError('MATERIAL_REPAIR_INCOMPLETE', 'chapter_patch did not return a meaningful result')
    }
    const patch = normalizeChapterPatch(input.payload.chapter_patch)
    if (Object.keys(patch).length === 0) {
      throw materialRepairError('MATERIAL_REPAIR_INCOMPLETE', 'chapter_patch did not return a meaningful result')
    }
    acceptance.chapter_patch = patch
    applied.push({ type: 'chapter_patch' })
  }

  if (input.request.targets.has('worldbuilding')) {
    const creates = requiredCollection(input.payload, 'worldbuilding').map(normalizeWorldbuilding)
    if (creates.some(item => Object.keys(item).length === 0)) {
      throw materialRepairError('MATERIAL_REPAIR_INCOMPLETE', 'worldbuilding contains an empty result')
    }
    acceptance.worldbuilding_creates = creates
    applied.push({ type: 'worldbuilding_created', count: creates.length })
  }

  if (input.request.targets.has('characters')) {
    const creates = requiredCollection(input.payload, 'characters').map(normalizeCharacterCreate)
    for (const character of creates) {
      if (input.existing.characterNames.has(character.name) || createdCharacterNames.has(character.name)) {
        throw materialRepairError('MATERIAL_REPAIR_DUPLICATE', `duplicate character name: ${character.name}`)
      }
      createdCharacterNames.add(character.name)
    }
    acceptance.character_creates = creates
    applied.push({ type: 'characters_created', count: creates.length })
  }

  if (input.request.targets.has('character_updates')) {
    const updates = requiredCollection(input.payload, 'character_updates').map(normalizeCharacterUpdate)
    for (const update of updates) {
      if (createdCharacterNames.has(update.name) || updatedCharacterNames.has(update.name)) {
        throw materialRepairError('MATERIAL_REPAIR_DUPLICATE', `duplicate character name: ${update.name}`)
      }
      if (!input.existing.characterNames.has(update.name)) {
        throw materialRepairError('MATERIAL_REPAIR_REFERENCE_INVALID', `character update cannot resolve: ${update.name}`)
      }
      updatedCharacterNames.add(update.name)
    }
    acceptance.character_updates = updates
    applied.push({ type: 'characters_updated', count: updates.length })
  }

  if (input.request.targets.has('settings')) {
    const creates = requiredCollection(input.payload, 'settings').map(normalizeSetting)
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

  if (input.request.targets.has('chapter_setting_usage')) {
    const availableSettingKeys = new Set([...input.existing.settingKeys, ...createdSettingKeys])
    const seenUsage = new Set<string>()
    const usages = requiredCollection(input.payload, 'chapter_setting_usage').map(item => {
      const usage = normalizeUsage(item, input.existing, availableSettingKeys)
      if (seenUsage.has(usage.identityKey)) {
        throw materialRepairError('MATERIAL_REPAIR_DUPLICATE', `duplicate chapter setting usage: ${usage.identityKey}`)
      }
      seenUsage.add(usage.identityKey)
      return usage.normalized
    })
    acceptance.chapter_setting_usage_replacement = usages
    applied.push({ type: 'chapter_setting_usage_replaced', count: usages.length })
  }

  assertMaterialObligationsSatisfied(input.request, acceptance)
  const summaryValue = input.payload.repair_summary
  if (summaryValue !== undefined && typeof summaryValue !== 'string') {
    throw materialRepairError('MATERIAL_REPAIR_INVALID', 'repair_summary must be a string')
  }
  const summary = typeof summaryValue === 'string' ? summaryValue.trim().slice(0, 2000) : ''
  return { acceptance, applied, summary }
}

export function materialRepairExistingIdentity(input: {
  characters: Array<{ id?: number; name?: string }>
  settings: Array<{ id?: number; entity_type?: string; name?: string }>
}): ExistingMaterialIdentity {
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
  return { characterNames, settingKeys, characterIds, settingIds, settingKeysById }
}
