import type { PreparedStoryStateUpdate } from '../../novel-writing/prepared-story-state'

const RECOVERY_MAX_DEPTH = 10
const RECOVERY_MAX_ARRAY_ITEMS = 128
const RECOVERY_MAX_OBJECT_KEYS = 128
const RECOVERY_MAX_STRING_LENGTH = 2_000
const RECOVERY_MAX_NODES_PER_FIELD = 2_048
const RECOVERY_FIELD_BYTE_LIMITS = {
  state_delta: 60_000,
  character_updates: 35_000,
  setting_updates: 35_000,
  storyline_updates: 35_000,
  sync_reports: 15_000,
  hard_failures: 15_000,
  payload: 25_000,
} as const

const STORY_STATE_RECOVERY_KEYS = [
  'timeline',
  'current_time',
  'active_locations',
  'character_positions',
  'character_relationships',
  'relationship_graph',
  'known_secrets',
  'secret_visibility',
  'item_ownership',
  'resource_status',
  'foreshadowing_status',
  'payoff_queue',
  'mainline_progress',
  'volume_progress',
  'unresolved_conflicts',
  'open_questions',
  'recent_repeated_information',
  'next_chapter_priorities',
  'layered_memory_context',
  'progress_summary',
  'daily_context_snapshot',
  'established_events',
  'canon_facts',
  'style_fingerprint',
  'style_fingerprint_contract',
] as const

const CHARACTER_STATE_RECOVERY_KEYS = [
  'age',
  'location',
  'physical_condition',
  'appearance_delta',
  'outfit',
  'items',
  'item_changes',
  'ability_status',
  'resource_status',
  'emotional_state',
  'public_image',
  'relationship_attitudes',
  'knowledge_scope',
  'newly_learned',
  'information_boundaries',
  'secrets_known',
  'injuries',
  'goals',
  'next_intent',
  'last_seen_chapter',
] as const

const STATE_DELTA_COMPLETENESS_KEYS = [
  'report_id',
  'chapter_id',
  'chapter_no',
  'status',
  'label',
  'summary',
  'planned_count',
  'recorded_count',
  'missed_count',
  'blocking_missed',
  'high_confidence_missed',
  'recorded',
  'planned',
  'completed',
  'missed',
  'next_actions',
] as const

const RECOVERY_DOMAIN_VALUE_KEYS = [
  'status',
  'state',
  'active',
  'found',
  'location',
  'owner',
  'holder',
  'visibility',
  'condition',
  'physical_condition',
  'change',
  'from',
  'to',
  'cost',
  'progress',
  'summary',
  'stage',
  'current_stage',
  'next_step',
  'amount',
  'remaining',
  'value',
  'available',
  'trigger',
  'payoff',
  'risk',
  'consequence',
  'constraints',
  'rule',
  'goal',
  'intent',
  'emotion',
  'attitude',
  'knowledge',
  'scope',
  'known',
  'learned_at',
  'time',
  'chapter_no',
  'target_chapter',
  'priority',
  'label',
  'name',
  'kind',
  'subject',
  'predicate',
  'fact',
  'cause',
  'mechanism',
  'aliases',
  'confidence',
  'tags',
  'event',
  'events',
  'notes',
  'completed',
  'last_seen_chapter',
  'last_checked_chapter_id',
  'last_checked_chapter_no',
] as const

const SETTING_STATE_RECOVERY_KEYS = [
  ...RECOVERY_DOMAIN_VALUE_KEYS,
  'current_time',
  'triggered',
  'current_owner',
  'owner_rule',
  'forbidden_reveal',
  'first_seen_chapter',
  'advance_rule',
] as const

const STORYLINE_STATE_RECOVERY_KEYS = [
  ...RECOVERY_DOMAIN_VALUE_KEYS,
  'current_state',
  'payoff_status',
  'clue',
  'attitude_shift',
  'leaked',
  'usage_type',
] as const

const FORESHADOWING_STATE_RECOVERY_KEYS = [
  ...STORYLINE_STATE_RECOVERY_KEYS,
  'detail',
  'lifecycle',
  'importance',
  'plant_chapter_no',
  'planted_at',
  'expected_resolve_chapter_no',
  'due',
  'resolve_chapter_no',
  'resolved_at',
  'triggered',
] as const

const RELATIONSHIP_STATE_RECOVERY_KEYS = [
  'party_a',
  'party_b',
  'a',
  'b',
  'current_status',
  'status',
  'state',
  'story_relation_type',
  'relation_type',
  'type',
  'emotion',
  'start_chapter_no',
  'start',
  'change_nodes',
  'cost',
  'summary',
  'progress',
  'confidence',
] as const

const DISCOVERED_ASSET_CONSTRAINT_RECOVERY_KEYS = [
  ...RECOVERY_DOMAIN_VALUE_KEYS,
  'owner_rule',
  'forbidden_reveal',
  'advance_rule',
] as const

const DISCOVERED_ASSET_STATE_RECOVERY_KEYS = [
  ...SETTING_STATE_RECOVERY_KEYS,
  'current_state',
  'payoff_status',
  'clue',
] as const

const TIMELINE_RECOVERY_KEYS = ['event', 'time', 'current_time', 'location', 'chapter_no', 'sequence', 'status', 'source_excerpt', 'evidence'] as const
const PROGRESS_SUMMARY_RECOVERY_KEYS = [
  'last_completed_chapter', 'updated_at', 'completed_chapter_count', 'completed_word_count',
  'active_foreshadowing_count', 'recent_changed_characters', 'next_outline_status', 'notes',
] as const
const DAILY_CONTEXT_RECOVERY_KEYS = [
  'current_chapter', 'current_scene', 'current_emotion_target', 'writing_changes', 'pending_clues',
] as const
const LAYERED_MEMORY_RECOVERY_KEYS = [
  'recent_chapter_details', 'ten_chapter_summaries', 'volume_overview', 'archive_refs', 'red_lines',
] as const
const MEMORY_ITEM_RECOVERY_KEYS = [
  'chapter', 'chapter_no', 'title', 'event', 'events', 'state_changes', 'foreshadowing', 'summary',
  'range', 'start_chapter', 'end_chapter', 'volume', 'volume_no', 'status', 'mainline_progress',
  'unresolved_conflicts', 'path', 'key', 'label', 'text', 'rule',
] as const
const STYLE_CONTRACT_RECOVERY_KEYS = [
  'source', 'style_fingerprint', 'target_sentence_band', 'min_sentence_chars', 'max_sentence_chars',
  'policy', 'source_excerpt',
] as const
const ESTABLISHED_EVENT_RECOVERY_FIELDS = {
  id: ['id'],
  chapter_no: ['chapter_no', 'chapterNo'],
  kind: ['kind'],
  subject: ['subject', 'name', 'who'],
  predicate: ['predicate', 'aspect'],
  fact: ['fact', 'text', 'summary'],
  cause: ['cause'],
  mechanism: ['mechanism'],
  constraints: ['constraints'],
  aliases: ['aliases'],
  source_excerpt: ['source_excerpt', 'sourceExcerpt', 'evidence'],
  lock_level: ['lock_level', 'lockLevel'],
  status: ['status'],
  mutable: ['mutable'],
  confidence: ['confidence'],
  last_seen_chapter: ['last_seen_chapter', 'lastSeenChapter'],
  tags: ['tags'],
} as const
const DISCOVERED_ASSET_RECOVERY_FIELDS = {
  entity_type: ['entity_type', 'type'],
  name: ['name', 'title'],
  summary: ['summary', 'description', 'role', 'effect'],
  evidence: ['evidence', 'quote'],
  source_text: ['source_text'],
  source_excerpt: ['source_excerpt', 'quote', 'evidence'],
  first_chapter_no: ['first_chapter_no'],
  constraints_json: ['constraints_json', 'constraints'],
  state_json: ['state_json', 'suggested_state', 'state'],
} as const
const IP_SCENE_RECOVERY_FIELDS = {
  title: ['title', 'name'],
  summary: ['summary', 'description'],
  visual_hook: ['visual_hook', 'visual', 'image_hook'],
  adaptation_value: ['adaptation_value', 'ip_value', 'short_drama_value'],
  spread_point: ['spread_point', 'comment_point', 'discussion_point'],
  evidence: ['evidence'],
  quote: ['quote'],
  source_excerpt: ['source_excerpt', 'excerpt', 'evidence'],
  tags: ['tags'],
} as const
const RELATION_CHANGE_NODE_RECOVERY_KEYS = ['chapter_no', 'note', 'event_id', 'kind'] as const
const COMPLETENESS_ITEM_RECOVERY_KEYS = [
  'key', 'label', 'evidence', 'high_confidence_evidence', 'fix', 'blocking', 'confidence',
] as const
const COMPLETENESS_RECORDED_RECOVERY_KEYS = [
  'timeline', 'character_state', 'asset_state', 'relationship', 'foreshadowing_or_handoff',
] as const
const OPEN_DOMAIN_MAP_KEYS = new Set([
  'constraints', 'items', 'item_changes', 'relationship_attitudes', 'resource_status', 'knowledge_scope',
  'information_boundaries', 'secrets_known', 'injuries', 'goals', 'aliases', 'tags', 'events',
])

type RecoveryBudget = { nodes: number; bytes: number }

const utf8Encoder = new TextEncoder()

function jsonByteLength(value: any) {
  return utf8Encoder.encode(JSON.stringify(value)).byteLength
}

function forbiddenRecoveryKey(key: string) {
  const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase()
  return normalized === 'content'
    || normalized === 'body'
    || normalized.includes('prose')
    || normalized === 'sourceprose'
    || normalized === 'chapterprose'
    || normalized === 'candidateprose'
    || normalized === 'originalprose'
    || normalized === 'revisedprose'
    || normalized === 'finalprose'
    || normalized === 'fullprose'
    || normalized.endsWith('chaptertext')
    || normalized.endsWith('sourcetext')
    || normalized.endsWith('prosetext')
    || normalized === 'finaltext'
    || normalized === 'candidatetext'
    || normalized === 'originaltext'
    || normalized === 'revisedtext'
    || normalized === 'fulltext'
    || normalized === 'context'
    || normalized.endsWith('contextpackage')
    || normalized.endsWith('prompt')
    || normalized === 'provider'
    || normalized.endsWith('providermessages')
    || normalized.endsWith('providerresponse')
    || normalized.endsWith('message')
    || normalized.endsWith('messages')
    || normalized.includes('rawresponse')
    || normalized === 'raw'
    || normalized === 'rawpayload'
    || normalized === 'request'
    || normalized === 'response'
    || normalized === 'task'
    || normalized === 'storystatesyncreceipts'
    || normalized === 'receiptbinding'
    || normalized.startsWith('receipt')
    || normalized.endsWith('receipt')
    || normalized.endsWith('receipts')
}

function recoveryCheckpointTooLarge(field: string) {
  return Object.assign(new Error(`Story State recovery checkpoint field exceeds its lossless limit: ${field}`), {
    code: 'STORY_STATE_RECOVERY_CHECKPOINT_TOO_LARGE',
    field,
  })
}

function sanitizeRecoveryScalar(value: any, field: string, budget: { nodes: number }): any {
  if (value === undefined) return undefined
  if (budget.nodes <= 0) throw recoveryCheckpointTooLarge(field)
  budget.nodes -= 1
  if (typeof value === 'string') {
    if (Array.from(value).length > RECOVERY_MAX_STRING_LENGTH) throw recoveryCheckpointTooLarge(field)
    return value
  }
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value
  return undefined
}

function sanitizeRecoveryScalarOrArray(value: any, field: string, budget: { nodes: number }): any {
  if (!Array.isArray(value)) return sanitizeRecoveryScalar(value, field, budget)
  if (value.length > RECOVERY_MAX_ARRAY_ITEMS) throw recoveryCheckpointTooLarge(field)
  return value
    .map(item => sanitizeRecoveryScalar(item, field, budget))
    .filter(item => item !== undefined)
}

function validRecoveryDynamicKey(key: string) {
  const value = String(key || '')
  const characters = Array.from(value)
  if (!value || value.trim() !== value || characters.length > 80 || forbiddenRecoveryKey(value)) return false
  if (/[\r\n\t。，！？；：“”‘’]/u.test(value)) return false
  return value.split(/\s+/).filter(Boolean).length <= 6
}

function firstOwnValue(source: Record<string, any>, keys: readonly string[]) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) return source[key]
  }
  return undefined
}

function firstTruthyAliasValue(source: Record<string, any>, keys: readonly string[]) {
  if (keys.length === 1) return firstOwnValue(source, keys)
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key]) return source[key]
  }
  return undefined
}

function selectDiscoveredAssetRecoveryValue(
  source: Record<string, any>,
  keys: readonly string[],
  canonicalKey: string,
) {
  if (canonicalKey === 'source_text') {
    return !source.evidence && !source.quote && source.source_text
      ? source.source_text
      : undefined
  }
  return firstTruthyAliasValue(source, keys)
}

function selectIpSceneRecoveryValue(
  source: Record<string, any>,
  keys: readonly string[],
  canonicalKey: string,
) {
  if (canonicalKey === 'quote') return !source.evidence && source.quote ? source.quote : undefined
  return firstTruthyAliasValue(source, keys)
}

function recoveryRecord(
  value: any,
  fields: Record<string, readonly string[]>,
  field: string,
  budget: { nodes: number },
  sanitizers: Record<string, (value: any, budget: { nodes: number }) => any> = {},
  selectValue: (source: Record<string, any>, keys: readonly string[], canonicalKey: string) => any = firstOwnValue,
) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const output: Record<string, any> = {}
  for (const [canonicalKey, aliases] of Object.entries(fields)) {
    const item = selectValue(source, aliases, canonicalKey)
    if (item === undefined) continue
    const sanitized = sanitizers[canonicalKey]
      ? sanitizers[canonicalKey](item, budget)
      : sanitizeRecoveryScalarOrArray(item, field, budget)
    if (sanitized !== undefined) output[canonicalKey] = sanitized
  }
  return output
}

function sanitizeRecoveryNamedMap(
  value: any,
  field: string,
  budget: { nodes: number },
  valueFields: readonly string[] = RECOVERY_DOMAIN_VALUE_KEYS,
  objectSanitizer?: (value: any, budget: { nodes: number }) => any,
) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const entries = Object.entries(source)
    .filter(([key, item]) => item !== undefined && validRecoveryDynamicKey(key))
  if (entries.length > RECOVERY_MAX_OBJECT_KEYS) throw recoveryCheckpointTooLarge(field)
  const output: Record<string, any> = {}
  for (const [key, item] of entries) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      output[key] = objectSanitizer
        ? objectSanitizer(item, budget)
        : sanitizeRecoveryDomainStateRecord(item, field, budget, valueFields)
    } else {
      const sanitized = sanitizeRecoveryScalarOrArray(item, field, budget)
      if (sanitized !== undefined) output[key] = sanitized
    }
  }
  return output
}

function sanitizeRecoveryStructuredArray(
  value: any,
  fields: readonly string[],
  field: string,
  budget: { nodes: number },
) {
  const source = Array.isArray(value) ? value : []
  if (source.length > RECOVERY_MAX_ARRAY_ITEMS) throw recoveryCheckpointTooLarge(field)
  const itemFields = identityRecoveryFields(fields)
  return source.map(item => (
    item && typeof item === 'object' && !Array.isArray(item)
      ? recoveryRecord(item, itemFields, field, budget)
      : sanitizeRecoveryScalar(item, field, budget)
  )).filter(item => item !== undefined)
}

function sanitizeRecoveryMappedArray(
  value: any,
  fields: Record<string, readonly string[]>,
  field: string,
  budget: { nodes: number },
  sanitizers: Record<string, (value: any, budget: { nodes: number }) => any> = {},
) {
  const source = Array.isArray(value) ? value : []
  if (source.length > RECOVERY_MAX_ARRAY_ITEMS) throw recoveryCheckpointTooLarge(field)
  return source.map(item => (
    item && typeof item === 'object' && !Array.isArray(item)
      ? recoveryRecord(item, fields, field, budget, sanitizers, firstTruthyAliasValue)
      : sanitizeRecoveryScalar(item, field, budget)
  )).filter(item => item !== undefined)
}

function sanitizeRecoveryDomainStateRecord(
  value: any,
  field: string,
  budget: { nodes: number },
  valueFields: readonly string[] = RECOVERY_DOMAIN_VALUE_KEYS,
  depth = 0,
  seen = new WeakSet<object>(),
): Record<string, any> {
  if (depth > RECOVERY_MAX_DEPTH || budget.nodes <= 0) throw recoveryCheckpointTooLarge(field)
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  if (seen.has(source)) throw recoveryCheckpointTooLarge(field)
  seen.add(source)
  budget.nodes -= 1
  const output: Record<string, any> = {}
  try {
    for (const key of valueFields) {
      if (!Object.prototype.hasOwnProperty.call(source, key) || source[key] === undefined) continue
      const item = source[key]
      if (OPEN_DOMAIN_MAP_KEYS.has(key)) {
        output[key] = item && typeof item === 'object' && !Array.isArray(item)
          ? sanitizeRecoveryNamedMap(item, field, budget, valueFields)
          : sanitizeRecoveryScalarOrArray(item, field, budget)
      } else if (Array.isArray(item)) {
        output[key] = sanitizeRecoveryStructuredArray(item, valueFields, field, budget)
      } else if (item && typeof item === 'object' && !Array.isArray(item)) {
        output[key] = sanitizeRecoveryDomainStateRecord(item, field, budget, valueFields, depth + 1, seen)
      } else {
        const sanitized = sanitizeRecoveryScalar(item, field, budget)
        if (sanitized !== undefined) output[key] = sanitized
      }
    }
    return output
  } finally {
    seen.delete(source)
  }
}

function sanitizeRecoveryDomainContractValue(
  value: any,
  field: string,
  budget: { nodes: number },
  valueFields: readonly string[] = RECOVERY_DOMAIN_VALUE_KEYS,
) {
  if (Array.isArray(value)) return sanitizeRecoveryStructuredArray(value, valueFields, field, budget)
  if (value && typeof value === 'object') return sanitizeRecoveryDomainStateRecord(value, field, budget, valueFields)
  return sanitizeRecoveryScalar(value, field, budget)
}

function sanitizeRecoveryRelationshipValue(value: any, field: string, budget: { nodes: number }) {
  return recoveryRecord(
    value,
    identityRecoveryFields(RELATIONSHIP_STATE_RECOVERY_KEYS),
    field,
    budget,
    {
      change_nodes: (item, itemBudget) => sanitizeRecoveryStructuredArray(
        item, RELATION_CHANGE_NODE_RECOVERY_KEYS, field, itemBudget,
      ),
    },
  )
}

function sanitizeRecoveryRelationshipMap(value: any, field: string, budget: { nodes: number }) {
  return sanitizeRecoveryNamedMap(
    value,
    field,
    budget,
    RELATIONSHIP_STATE_RECOVERY_KEYS,
    (item, itemBudget) => sanitizeRecoveryRelationshipValue(item, field, itemBudget),
  )
}

function sanitizeRecoveryForeshadowMap(value: any, field: string, budget: { nodes: number }) {
  return sanitizeRecoveryNamedMap(
    value,
    field,
    budget,
    FORESHADOWING_STATE_RECOVERY_KEYS,
    (item, itemBudget) => recoveryRecord(
      item, identityRecoveryFields(FORESHADOWING_STATE_RECOVERY_KEYS), field, itemBudget,
    ),
  )
}

function sanitizeRecoveryCanonFacts(value: any, field: string, budget: { nodes: number }) {
  return sanitizeRecoveryMappedArray(value, ESTABLISHED_EVENT_RECOVERY_FIELDS, field, budget)
}

function sanitizeRecoveryLayeredMemory(value: any, field: string, budget: { nodes: number }) {
  const arraySanitizers = Object.fromEntries(LAYERED_MEMORY_RECOVERY_KEYS.map(key => [
    key,
    (item: any, itemBudget: { nodes: number }) => sanitizeRecoveryStructuredArray(item, MEMORY_ITEM_RECOVERY_KEYS, field, itemBudget),
  ]))
  return recoveryRecord(
    value,
    identityRecoveryFields(LAYERED_MEMORY_RECOVERY_KEYS),
    field,
    budget,
    arraySanitizers,
  )
}

function identityRecoveryFields(keys: readonly string[]) {
  return Object.fromEntries(keys.map(key => [key, [key]])) as Record<string, readonly string[]>
}

function recoveryArray(
  value: any,
  field: string,
  item: (value: any, budget: { nodes: number }) => any,
) {
  const source = Array.isArray(value) ? value : []
  if (source.length > RECOVERY_MAX_ARRAY_ITEMS) throw recoveryCheckpointTooLarge(field)
  const budget = { nodes: RECOVERY_MAX_NODES_PER_FIELD }
  return source.map(entry => item(entry, budget)).filter(entry => entry !== undefined)
}

function checkedRecoveryField<T>(field: keyof typeof RECOVERY_FIELD_BYTE_LIMITS, value: T): T {
  if (jsonByteLength(value) > RECOVERY_FIELD_BYTE_LIMITS[field]) throw recoveryCheckpointTooLarge(field)
  return value
}

export function sanitizeRecoveryValue(
  value: any,
  depth = 0,
  budget: RecoveryBudget = { nodes: RECOVERY_MAX_NODES_PER_FIELD, bytes: RECOVERY_FIELD_BYTE_LIMITS.payload },
): any {
  if (depth > RECOVERY_MAX_DEPTH || budget.nodes <= 0 || budget.bytes <= 0 || value === undefined) return undefined
  budget.nodes -= 1
  if (typeof value === 'string') {
    const characters = Array.from(value).slice(0, RECOVERY_MAX_STRING_LENGTH)
    let low = 0
    let high = characters.length
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      if (jsonByteLength(characters.slice(0, middle).join('')) <= budget.bytes) low = middle
      else high = middle - 1
    }
    const bounded = characters.slice(0, low).join('')
    const bytes = jsonByteLength(bounded)
    if (bytes > budget.bytes) return undefined
    budget.bytes -= bytes
    return bounded
  }
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    const bytes = jsonByteLength(value)
    if (bytes > budget.bytes) return undefined
    budget.bytes -= bytes
    return value
  }
  if (Array.isArray(value)) {
    if (budget.bytes < 2) return undefined
    budget.bytes -= 2
    const output: any[] = []
    for (const item of value.slice(0, RECOVERY_MAX_ARRAY_ITEMS)) {
      const separatorBytes = output.length ? 1 : 0
      if (separatorBytes >= budget.bytes) break
      budget.bytes -= separatorBytes
      const sanitized = sanitizeRecoveryValue(item, depth + 1, budget)
      if (sanitized === undefined) {
        budget.bytes += separatorBytes
        continue
      }
      output.push(sanitized)
      if (budget.nodes <= 0 || budget.bytes <= 0) break
    }
    return output
  }
  if (typeof value !== 'object') return sanitizeRecoveryValue(String(value), depth, budget)
  if (budget.bytes < 2) return undefined
  budget.bytes -= 2
  const output: Record<string, any> = {}
  let retainedKeys = 0
  for (const [key, item] of Object.entries(value)) {
    if (retainedKeys >= RECOVERY_MAX_OBJECT_KEYS || budget.nodes <= 0 || budget.bytes <= 0) break
    if (item === undefined || forbiddenRecoveryKey(key)) continue
    const prefixBytes = (retainedKeys ? 1 : 0) + jsonByteLength(key) + 1
    if (prefixBytes >= budget.bytes) continue
    budget.bytes -= prefixBytes
    const sanitized = sanitizeRecoveryValue(item, depth + 1, budget)
    if (sanitized === undefined) {
      budget.bytes += prefixBytes
      continue
    }
    output[key] = sanitized
    retainedKeys += 1
  }
  return output
}

export function compactPreparedStoryStateForRecovery(prepared: PreparedStoryStateUpdate) {
  const payload = prepared.payload || {}
  const namedMapSanitizers: Record<string, (value: any, budget: { nodes: number }) => any> = {
    character_positions: (value, budget) => sanitizeRecoveryNamedMap(
      value, 'state_delta', budget, RECOVERY_DOMAIN_VALUE_KEYS,
    ),
    character_relationships: (value, budget) => sanitizeRecoveryRelationshipMap(value, 'state_delta', budget),
    relationship_graph: (value, budget) => sanitizeRecoveryRelationshipMap(value, 'state_delta', budget),
    known_secrets: (value, budget) => sanitizeRecoveryNamedMap(
      value, 'state_delta', budget, RECOVERY_DOMAIN_VALUE_KEYS,
    ),
    secret_visibility: (value, budget) => sanitizeRecoveryNamedMap(
      value, 'state_delta', budget, RECOVERY_DOMAIN_VALUE_KEYS,
    ),
    item_ownership: (value, budget) => sanitizeRecoveryNamedMap(
      value, 'state_delta', budget, SETTING_STATE_RECOVERY_KEYS,
    ),
    resource_status: (value, budget) => sanitizeRecoveryNamedMap(
      value, 'state_delta', budget, SETTING_STATE_RECOVERY_KEYS,
    ),
    foreshadowing_status: (value, budget) => sanitizeRecoveryForeshadowMap(value, 'state_delta', budget),
  }
  Object.assign(namedMapSanitizers, {
    current_time: (value: any, budget: { nodes: number }) => sanitizeRecoveryDomainContractValue(value, 'state_delta', budget),
    timeline: (value: any, budget: { nodes: number }) => sanitizeRecoveryStructuredArray(value, TIMELINE_RECOVERY_KEYS, 'state_delta', budget),
    active_locations: (value: any, budget: { nodes: number }) => sanitizeRecoveryStructuredArray(
      value, ['name', 'location', 'status', 'source_excerpt', 'evidence'], 'state_delta', budget,
    ),
    payoff_queue: (value: any, budget: { nodes: number }) => sanitizeRecoveryStructuredArray(value, RECOVERY_DOMAIN_VALUE_KEYS, 'state_delta', budget),
    unresolved_conflicts: (value: any, budget: { nodes: number }) => sanitizeRecoveryStructuredArray(value, RECOVERY_DOMAIN_VALUE_KEYS, 'state_delta', budget),
    open_questions: (value: any, budget: { nodes: number }) => sanitizeRecoveryStructuredArray(value, RECOVERY_DOMAIN_VALUE_KEYS, 'state_delta', budget),
    recent_repeated_information: (value: any, budget: { nodes: number }) => sanitizeRecoveryStructuredArray(value, RECOVERY_DOMAIN_VALUE_KEYS, 'state_delta', budget),
    next_chapter_priorities: (value: any, budget: { nodes: number }) => sanitizeRecoveryStructuredArray(value, RECOVERY_DOMAIN_VALUE_KEYS, 'state_delta', budget),
    mainline_progress: (value: any, budget: { nodes: number }) => sanitizeRecoveryDomainContractValue(value, 'state_delta', budget),
    volume_progress: (value: any, budget: { nodes: number }) => sanitizeRecoveryDomainContractValue(value, 'state_delta', budget),
    layered_memory_context: (value: any, budget: { nodes: number }) => sanitizeRecoveryLayeredMemory(value, 'state_delta', budget),
    progress_summary: (value: any, budget: { nodes: number }) => recoveryRecord(
      value, identityRecoveryFields(PROGRESS_SUMMARY_RECOVERY_KEYS), 'state_delta', budget, {
        recent_changed_characters: (item, itemBudget) => sanitizeRecoveryStructuredArray(
          item, RECOVERY_DOMAIN_VALUE_KEYS, 'state_delta', itemBudget,
        ),
      },
    ),
    daily_context_snapshot: (value: any, budget: { nodes: number }) => recoveryRecord(
      value, identityRecoveryFields(DAILY_CONTEXT_RECOVERY_KEYS), 'state_delta', budget, {
        writing_changes: (item, itemBudget) => sanitizeRecoveryStructuredArray(
          item, RECOVERY_DOMAIN_VALUE_KEYS, 'state_delta', itemBudget,
        ),
        pending_clues: (item, itemBudget) => sanitizeRecoveryStructuredArray(
          item, RECOVERY_DOMAIN_VALUE_KEYS, 'state_delta', itemBudget,
        ),
      },
    ),
    established_events: (value: any, budget: { nodes: number }) => sanitizeRecoveryMappedArray(
      value, ESTABLISHED_EVENT_RECOVERY_FIELDS, 'state_delta', budget,
    ),
    canon_facts: (value: any, budget: { nodes: number }) => sanitizeRecoveryCanonFacts(value, 'state_delta', budget),
    style_fingerprint: (value: any, budget: { nodes: number }) => sanitizeRecoveryScalar(value, 'state_delta', budget),
    style_fingerprint_contract: (value: any, budget: { nodes: number }) => recoveryRecord(
      value, identityRecoveryFields(STYLE_CONTRACT_RECOVERY_KEYS), 'state_delta', budget,
    ),
  })
  const stateBudget = { nodes: RECOVERY_MAX_NODES_PER_FIELD }
  const stateDelta = recoveryRecord(
    prepared.state_delta,
    identityRecoveryFields(STORY_STATE_RECOVERY_KEYS),
    'state_delta',
    stateBudget,
    namedMapSanitizers,
  )
  const characterUpdates = recoveryArray(prepared.character_updates, 'character_updates', (update, budget) => {
    const item = recoveryRecord(update, {
      name: ['name'],
      current_state: ['current_state', 'currentState'],
      source_excerpt: ['source_excerpt', 'sourceExcerpt'],
      evidence: ['evidence'],
    }, 'character_updates', budget)
    const currentState = firstOwnValue(update || {}, ['current_state', 'currentState']) || {}
    const currentStateSanitizers = Object.fromEntries(CHARACTER_STATE_RECOVERY_KEYS.map(key => [
      key,
      (value: any, itemBudget: { nodes: number }) => OPEN_DOMAIN_MAP_KEYS.has(key)
        && value && typeof value === 'object' && !Array.isArray(value)
        ? sanitizeRecoveryNamedMap(value, 'character_updates', itemBudget)
        : sanitizeRecoveryDomainContractValue(value, 'character_updates', itemBudget),
    ]))
    item.current_state = recoveryRecord(currentState, identityRecoveryFields(CHARACTER_STATE_RECOVERY_KEYS), 'character_updates', budget, currentStateSanitizers)
    return item
  })
  const settingUpdates = recoveryArray(prepared.setting_updates, 'setting_updates', (update, budget) => recoveryRecord(update, {
    entity_id: ['entity_id', 'entityId'],
    name: ['name'],
    entity_type: ['entity_type', 'entityType'],
    state_delta: ['state_delta', 'stateDelta'],
    actual_state_change: ['actual_state_change', 'actualStateChange'],
    source_excerpt: ['source_excerpt', 'sourceExcerpt'],
    evidence: ['evidence'],
  }, 'setting_updates', budget, {
    state_delta: (value, itemBudget) => sanitizeRecoveryDomainStateRecord(value, 'setting_updates', itemBudget, SETTING_STATE_RECOVERY_KEYS),
    actual_state_change: (value, itemBudget) => sanitizeRecoveryDomainStateRecord(value, 'setting_updates', itemBudget, SETTING_STATE_RECOVERY_KEYS),
  }))
  const storylineUpdates = recoveryArray(prepared.storyline_updates, 'storyline_updates', (update, budget) => recoveryRecord(update, {
    entity_id: ['entity_id', 'entityId'],
    name: ['name'],
    entity_type: ['entity_type', 'entityType'],
    state_delta: ['state_delta', 'stateDelta'],
    actual_state_change: ['actual_state_change', 'actualStateChange'],
    summary: ['summary'],
  }, 'storyline_updates', budget, {
    state_delta: (value, itemBudget) => sanitizeRecoveryDomainStateRecord(value, 'storyline_updates', itemBudget, STORYLINE_STATE_RECOVERY_KEYS),
    actual_state_change: (value, itemBudget) => sanitizeRecoveryDomainStateRecord(value, 'storyline_updates', itemBudget, STORYLINE_STATE_RECOVERY_KEYS),
  }))
  const syncBudget = { nodes: RECOVERY_MAX_NODES_PER_FIELD }
  const stateDeltaCompleteness = recoveryRecord(
    prepared.sync_reports?.state_delta_completeness,
    identityRecoveryFields(STATE_DELTA_COMPLETENESS_KEYS),
    'sync_reports',
    syncBudget,
    {
      blocking_missed: (value, budget) => sanitizeRecoveryStructuredArray(value, COMPLETENESS_ITEM_RECOVERY_KEYS, 'sync_reports', budget),
      high_confidence_missed: (value, budget) => sanitizeRecoveryStructuredArray(value, COMPLETENESS_ITEM_RECOVERY_KEYS, 'sync_reports', budget),
      recorded: (value, budget) => recoveryRecord(
        value, identityRecoveryFields(COMPLETENESS_RECORDED_RECOVERY_KEYS), 'sync_reports', budget,
      ),
      planned: (value, budget) => sanitizeRecoveryStructuredArray(value, COMPLETENESS_ITEM_RECOVERY_KEYS, 'sync_reports', budget),
      completed: (value, budget) => sanitizeRecoveryStructuredArray(value, COMPLETENESS_ITEM_RECOVERY_KEYS, 'sync_reports', budget),
      missed: (value, budget) => sanitizeRecoveryStructuredArray(value, COMPLETENESS_ITEM_RECOVERY_KEYS, 'sync_reports', budget),
      next_actions: (value, budget) => sanitizeRecoveryStructuredArray(value, [], 'sync_reports', budget),
    },
  )
  const hardFailures = recoveryArray(prepared.hard_failures, 'hard_failures', (failure, budget) => recoveryRecord(failure, {
    key: ['key'],
    message: ['message'],
    source: ['source'],
    details: ['details'],
  }, 'hard_failures', budget, {
    details: (value, itemBudget) => sanitizeRecoveryStructuredArray(value, COMPLETENESS_ITEM_RECOVERY_KEYS, 'hard_failures', itemBudget),
  }))
  const payloadBudget = { nodes: RECOVERY_MAX_NODES_PER_FIELD }
  const recoveredPayload = {
    discovered_assets: recoveryArray(
      firstOwnValue(payload, ['discovered_assets', 'discoveredAssets']),
      'payload',
      (asset, budget) => recoveryRecord(
        asset,
        DISCOVERED_ASSET_RECOVERY_FIELDS,
        'payload',
        budget,
        {
          constraints_json: (value, itemBudget) => sanitizeRecoveryDomainStateRecord(
            value, 'payload', itemBudget, DISCOVERED_ASSET_CONSTRAINT_RECOVERY_KEYS,
          ),
          state_json: (value, itemBudget) => sanitizeRecoveryDomainStateRecord(
            value, 'payload', itemBudget, DISCOVERED_ASSET_STATE_RECOVERY_KEYS,
          ),
        },
        selectDiscoveredAssetRecoveryValue,
      ),
    ),
    ip_scene_candidates: recoveryArray(
      firstOwnValue(payload, ['ip_scene_candidates', 'ipSceneCandidates']),
      'payload',
      (candidate, budget) => recoveryRecord(
        candidate, IP_SCENE_RECOVERY_FIELDS, 'payload', budget, {}, selectIpSceneRecoveryValue,
      ),
    ),
    foreshadowing_status: sanitizeRecoveryForeshadowMap(
      firstOwnValue(payload, ['foreshadowing_status', 'foreshadowingStatus']) || {},
      'payload',
      payloadBudget,
    ),
  }
  return {
    state_delta: checkedRecoveryField('state_delta', stateDelta),
    character_updates: checkedRecoveryField('character_updates', characterUpdates),
    setting_updates: checkedRecoveryField('setting_updates', settingUpdates),
    storyline_updates: checkedRecoveryField('storyline_updates', storylineUpdates),
    sync_reports: checkedRecoveryField('sync_reports', { state_delta_completeness: stateDeltaCompleteness }),
    hard_failures: checkedRecoveryField('hard_failures', hardFailures),
    payload: checkedRecoveryField('payload', recoveredPayload),
  } as PreparedStoryStateUpdate
}
