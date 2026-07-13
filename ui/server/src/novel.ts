import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { Database } from 'bun:sqlite'
import { AsyncLocalStorage } from 'node:async_hooks'
import { getNovelMutationTestHook } from './novel-test-support'

export type NovelReferenceConfig = {
  references?: Array<{ project_title: string; weight?: number; use_for?: string[]; dimensions?: string[]; avoid?: string[] }>
  strength?: 'light' | 'balanced' | 'strong'
  notes?: string
  style_lock?: any
  safety?: any
  story_state?: any
  writing_bible?: any
  generation_pipeline?: any
  [key: string]: any
}
export type NovelProjectRecord = { id: number; title: string; genre?: string; sub_genres?: string[]; synopsis?: string; length_target?: string; target_audience?: string; style_tags?: string[]; commercial_tags?: string[]; reference_config?: NovelReferenceConfig; status?: string; created_at?: string; updated_at: string }
export type NovelWorldbuildingRecord = { id: number; project_id: number; world_summary?: string; rules?: any; factions?: any[]; locations?: any[]; systems?: any; items?: any[]; timeline_anchor?: any; known_unknowns?: any[]; version?: number; raw_payload?: any; created_at: string; updated_at: string }
export type NovelCharacterRecord = { id: number; project_id: number; name: string; role?: string; role_type?: string; archetype?: string; personality?: any; motivation?: string; goal?: string; conflict?: string; abilities?: any[]; backstory?: string; relationships?: any; relationship_graph?: any; growth_arc?: string; arc_hint?: string; current_state?: any; secret?: string; appearance?: string; status?: string; version?: number; raw_payload?: any; created_at?: string; updated_at: string }
export type NovelOutlineRecord = { id: number; project_id: number; outline_type?: string; title: string; summary?: string; beats?: any[]; conflict_points?: string[]; turning_points?: string[]; hook?: string; target_length?: string; version?: number; parent_id?: number | null; raw_payload?: any; created_at?: string; updated_at: string }
export type NovelChapterRecord = { id: number; project_id: number; chapter_no: number; title: string; chapter_goal?: string; chapter_summary?: string; conflict?: string; ending_hook?: string; chapter_text?: string; scene_breakdown?: any[]; scene_list?: any[]; continuity_notes?: string[]; items_in_play?: any[]; foreshadowing?: any; timeline_note?: string; status?: string; version?: number; published_at?: string | null; outline_id?: number | null; raw_payload?: any; created_at?: string; updated_at: string }
export type NovelChapterVersionSource = 'manual_edit' | 'agent_execute' | 'repair' | 'rollback'
export type NovelChapterVersionRecord = { id: number; chapter_id: number; project_id: number; version_no: number; chapter_text: string; scene_breakdown: any[]; continuity_notes: string[]; source: NovelChapterVersionSource; created_at: string }
export type NovelReviewRecord = { id: number; project_id: number; chapter_id?: number | null; chapter_no?: number | null; review_type: string; status: string; summary: string; issues: string[]; created_at: string; payload?: string }
export type NovelRunRecord = { id: number; project_id: number; run_type: string; step_name: string; status: string; input_ref?: string; output_ref?: string; duration_ms?: number; error_message?: string; created_at: string; pipeline_run_count?: number; pipeline_chapter_failure_count?: number; pipeline_open_task_count?: number }
export type NovelProjectSeedDraftRecord = { id: number; title: string; idea?: string; seed: any; review_model?: any; diagnostics?: any; model_id?: number | null; source?: string; created_at: string; updated_at: string }
export type NovelSettingEntityRecord = {
  id: number
  project_id: number
  entity_type: string
  name: string
  summary?: string
  status?: string
  visibility?: string
  first_chapter_no?: number | null
  last_chapter_no?: number | null
  related_character_ids?: number[]
  related_chapter_ids?: number[]
  related_entity_ids?: number[]
  constraints_json?: any
  state_json?: any
  payload_json?: any
  created_at?: string
  updated_at: string
}
export type NovelChapterSettingUsageRecord = {
  id: number
  project_id: number
  chapter_id: number
  entity_id: number
  usage_type?: string
  required?: boolean
  allowed?: boolean
  forbidden?: boolean
  reveal_level?: string
  expected_state_change?: any
  actual_state_change?: any
  created_at?: string
  updated_at: string
}

type NovelStore = { projects: NovelProjectRecord[]; worldbuilding: NovelWorldbuildingRecord[]; characters: NovelCharacterRecord[]; outlines: NovelOutlineRecord[]; chapters: NovelChapterRecord[]; chapter_versions: NovelChapterVersionRecord[]; reviews: NovelReviewRecord[]; runs: NovelRunRecord[]; setting_entities: NovelSettingEntityRecord[]; chapter_setting_usage: NovelChapterSettingUsageRecord[] }

function nowIso() { return new Date().toISOString() }
function getNovelStorePath(activeWorkspace: string) { return join(activeWorkspace, 'novel-store.json') }
function getNovelDbPath(activeWorkspace: string) { return join(activeWorkspace, 'novel.sqlite') }
function toStringArray(value: any, fallback: string[] = []) { return Array.isArray(value) ? value.map(item => String(item)).filter(Boolean) : fallback }
function toAnyArray(value: any, fallback: any[] = []) { return Array.isArray(value) ? value : fallback }
function toJsonable(value: any, fallback: any = null) { return value === undefined ? fallback : value }
function sanitizeJsonValue(value: any, seen = new WeakSet<object>(), depth = 0): any {
  if (value === null || value === undefined) return value
  const valueType = typeof value
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') return value
  if (valueType === 'bigint') return String(value)
  if (valueType === 'function') return '[Function]'
  if (valueType !== 'object') return String(value)
  if (seen.has(value)) return '[Circular]'
  if (depth >= 40) return '[MaxDepth]'
  seen.add(value)
  if (Array.isArray(value)) {
    const items = value.map(item => sanitizeJsonValue(item, seen, depth + 1))
    seen.delete(value)
    return items
  }
  const output: Record<string, any> = {}
  for (const [key, item] of Object.entries(value)) output[key] = sanitizeJsonValue(item, seen, depth + 1)
  seen.delete(value)
  return output
}
function safeJsonText(value: any, space?: number) {
  try {
    const text = JSON.stringify(sanitizeJsonValue(value), null, space)
    return text === undefined ? 'null' : text
  } catch {
    return JSON.stringify(String(value ?? ''))
  }
}
const MAX_PERSISTED_DIAGNOSTIC_CHARS = 60000
const STORAGE_PREVIEW_CHARS = 4000
const LARGE_DIAGNOSTIC_KEYS = new Set([
  'context_package',
  'contextPackage',
  'paragraph_task',
  'paragraphTask',
  'prompt',
  'raw_prompt',
  'rawPrompt',
  'full_prompt',
  'fullPrompt',
  'messages',
  'chapter_text',
  'chapterText',
  'final_text',
  'finalText',
  'revised_text',
  'revisedText',
  'full_text',
  'fullText',
])
const NESTED_STORAGE_KEYS = new Set(['raw_payload', 'rawPayload'])
const SCENE_DIAGNOSTIC_KEYS = new Set([
  'scene_breakdown',
  'sceneBreakdown',
  'generated_scene_breakdown',
  'generatedSceneBreakdown',
  'scene_list',
  'sceneList',
  'scene_cards',
  'sceneCards',
])
const PRE_DRAFT_BRIEF_KEYS = new Set([
  'pre_draft_brief',
  'preDraftBrief',
])
const PRE_DRAFT_BRIEF_PRESERVED_CONTRACT_KEYS = new Set([
  'state_tracking_contract',
  'stateTrackingContract',
])
const STATE_TRACKING_SOURCE_READINESS_KEYS = new Set([
  'source_readiness',
  'sourceReadiness',
])
const STATE_TRACKING_SOURCE_READINESS_STORAGE_LIMIT = 24
const CHAPTER_BLUEPRINT_KEYS = new Set([
  'chapter_blueprint',
  'chapterBlueprint',
])
const CHAPTER_BLUEPRINT_CORE_KEYS = [
  'target_emotion',
  'targetEmotion',
  'opening_hook',
  'openingHook',
  'core_payoff',
  'corePayoff',
  'content_outline',
  'contentOutline',
  'plot_lines',
  'plotLines',
  'character_order',
  'characterOrder',
  'beat_sequence',
  'beatSequence',
  'beat_density_contract',
  'beatDensityContract',
  'small_outline_contract',
  'smallOutlineContract',
  'mainline_definition_contract',
  'mainlineDefinitionContract',
  'cost_and_reward',
  'costAndReward',
  'ending_contract',
  'endingContract',
]
const PRE_DRAFT_BRIEF_CORE_KEYS = [
  'confirmed_at',
  'confirmedAt',
  'confirmation_source',
  'confirmationSource',
  'updated_at',
  'updatedAt',
  'chapter_goal',
  'chapterGoal',
  'reader_promise',
  'readerPromise',
  'core_conflict',
  'coreConflict',
  'emotional_curve',
  'emotionalCurve',
  'chapter_blueprint',
  'chapterBlueprint',
  'next_chapter_quality_plan',
  'nextChapterQualityPlan',
  'write_preparation_brief',
  'writePreparationBrief',
  'benchmark_recall_brief',
  'benchmarkRecallBrief',
  'style_sample_strategy',
  'styleSampleStrategy',
  'chapter_benchmark_strategy',
  'chapterBenchmarkStrategy',
  'state_tracking_contract',
  'stateTrackingContract',
  'scene_briefs',
  'sceneBriefs',
  'scene_cards',
  'sceneCards',
  'delivery_risk_carry_over',
  'deliveryRiskCarryOver',
]
const SCENE_DIAGNOSTIC_TEXT_KEYS = [
  'purpose',
  'conflict',
  'goal',
  'obstacle',
  'change',
  'result',
  'ending_hook',
  'endingHook',
  'scene_start_anchor',
  'sceneStartAnchor',
  'scene_end_anchor',
  'sceneEndAnchor',
]

function storageOmitted(reason = 'storage_compaction', extra: Record<string, any> = {}) {
  return { omitted: true, reason, ...extra }
}

function compactStorageText(value: any, limit = 360) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= limit) return text
  return `${text.slice(0, limit)}...`
}

function compactStorageStringArray(value: any, limit = 180, maxItems = 6) {
  if (!Array.isArray(value)) return []
  return value.slice(0, maxItems).map(item => compactStorageText(item, limit)).filter(Boolean)
}

function compactSceneDiagnosticForStorage(value: any) {
  if (!value || typeof value !== 'object') return compactStorageText(value)
  const output: Record<string, any> = {
    scene_no: value.scene_no ?? value.sceneNo ?? null,
    title: compactStorageText(value.title || value.name || '', 120),
    scene_type: compactStorageText(value.scene_type || value.sceneType || '', 80),
    location: compactStorageText(value.location || '', 100),
    purpose_tag: compactStorageText(value.purpose_tag || value.purposeTag || '', 120),
    purpose_tags: compactStorageStringArray(value.purpose_tags || value.purposeTags, 180, 6),
    characters_present: compactStorageStringArray(value.characters_present || value.charactersPresent, 80, 8),
  }
  for (const key of SCENE_DIAGNOSTIC_TEXT_KEYS) {
    if (value[key] !== undefined && value[key] !== null) output[key] = compactStorageText(value[key], 360)
  }
  const receipts = value.scene_card_receipts || value.sceneCardReceipts
  if (Array.isArray(receipts)) {
    output.scene_card_receipt_count = receipts.length
    output.scene_card_receipts = receipts.slice(0, 4).map((item: any) => ({
      key: compactStorageText(item?.key || item?.label || '', 80),
      delivered: item?.delivered,
      evidence: compactStorageText(item?.evidence || '', 180),
      remaining_risk: compactStorageText(item?.remaining_risk || item?.remainingRisk || '', 180),
    }))
  }
  return output
}

function compactSceneDiagnosticsForStorage(value: any) {
  if (!Array.isArray(value)) return value
  const scenes = value.slice(0, 20).map(compactSceneDiagnosticForStorage)
  if (value.length > 20) scenes.push(storageOmitted('storage_compaction', { truncated: true, original_count: value.length - 20 }))
  return scenes
}

function compactPreDraftBriefContractForStorage(value: any) {
  const summary: Record<string, any> = {}
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of ['status', 'passed', 'score', 'version', 'source']) {
      if (value[key] !== undefined && value[key] !== null) summary[key] = value[key]
    }
    const warnings = compactStorageStringArray(value.warnings || value.warning || value.risks || value.risk, 180, 6)
    const missing = compactStorageStringArray(value.missing || value.blockers || value.gaps, 180, 6)
    if (warnings.length) summary.warnings = warnings
    if (missing.length) summary.missing = missing
  }
  return storageOmitted('storage_compaction', {
    kind: 'pre_draft_contract',
    ...(Object.keys(summary).length ? { summary } : {}),
  })
}

function isPreDraftBriefContractKey(key: string) {
  return key.toLowerCase().includes('contract')
}

function compactChapterBlueprintForStorage(value: any) {
  if (!value || typeof value !== 'object') return compactStorageText(value, 900)
  const output: Record<string, any> = {}
  const used = new Set<string>()
  for (const key of CHAPTER_BLUEPRINT_CORE_KEYS) {
    if (value[key] === undefined || value[key] === null) continue
    output[key] = compactPreDraftBriefValueForStorage(value[key], '', new WeakSet<object>(), 1)
    used.add(key)
  }
  for (const [key, childValue] of Object.entries(value)) {
    if (used.has(key) || output[key] !== undefined) continue
    if (Object.keys(output).length >= 28) {
      output._truncated_keys = Math.max(1, Object.keys(value).length - used.size - 28)
      break
    }
    const compacted = compactPreDraftBriefValueForStorage(childValue, key, new WeakSet<object>(), 1)
    if (compacted !== undefined) output[key] = compacted
  }
  return output
}

function compactPreDraftBriefValueForStorage(value: any, key = '', seen = new WeakSet<object>(), depth = 0, parentKey = ''): any {
  if (NESTED_STORAGE_KEYS.has(key) || LARGE_DIAGNOSTIC_KEYS.has(key)) return undefined
  if (CHAPTER_BLUEPRINT_KEYS.has(key)) return compactChapterBlueprintForStorage(value)
  if (isPreDraftBriefContractKey(key) && !PRE_DRAFT_BRIEF_PRESERVED_CONTRACT_KEYS.has(key)) {
    return compactPreDraftBriefContractForStorage(value)
  }
  if (value === null || value === undefined) return value
  if (SCENE_DIAGNOSTIC_KEYS.has(key) && Array.isArray(value)) return compactSceneDiagnosticsForStorage(value)
  const valueType = typeof value
  if (valueType === 'string') return compactStorageText(value, depth <= 1 ? 900 : 420)
  if (valueType === 'number' || valueType === 'boolean') return value
  if (valueType === 'bigint') return String(value)
  if (valueType === 'function') return '[Function]'
  if (valueType !== 'object') return compactStorageText(value, 420)
  if (seen.has(value)) return '[Circular]'
  if (depth >= 5) return storageOmitted('storage_compaction', { max_depth: depth })
  seen.add(value)
  if (Array.isArray(value)) {
    const limit = PRE_DRAFT_BRIEF_PRESERVED_CONTRACT_KEYS.has(parentKey) && STATE_TRACKING_SOURCE_READINESS_KEYS.has(key)
      ? STATE_TRACKING_SOURCE_READINESS_STORAGE_LIMIT
      : depth <= 1 ? 12 : 8
    const items = value
      .slice(0, limit)
      .map(item => compactPreDraftBriefValueForStorage(item, '', seen, depth + 1, key))
      .filter(item => item !== undefined)
    if (value.length > limit) items.push(storageOmitted('storage_compaction', { truncated: true, original_count: value.length - limit }))
    seen.delete(value)
    return items
  }
  const output: Record<string, any> = {}
  const entries = Object.entries(value).slice(0, depth <= 1 ? 28 : 18)
  for (const [childKey, childValue] of entries) {
    const compacted = compactPreDraftBriefValueForStorage(childValue, childKey, seen, depth + 1, key)
    if (compacted !== undefined) output[childKey] = compacted
  }
  if (Object.keys(value).length > entries.length) output._truncated_keys = Object.keys(value).length - entries.length
  seen.delete(value)
  return output
}

function compactPreDraftBriefForStorage(value: any) {
  if (!value || typeof value !== 'object') return compactStorageText(value, 900)
  const output: Record<string, any> = {}
  const used = new Set<string>()
  for (const key of PRE_DRAFT_BRIEF_CORE_KEYS) {
    if (value[key] === undefined || value[key] === null) continue
    output[key] = compactPreDraftBriefValueForStorage(value[key], key, new WeakSet<object>(), 1)
    used.add(key)
  }
  for (const [key, childValue] of Object.entries(value)) {
    if (used.has(key) || output[key] !== undefined) continue
    if (Object.keys(output).length >= 36) {
      output._truncated_keys = Math.max(1, Object.keys(value).length - used.size - 36)
      break
    }
    const compacted = compactPreDraftBriefValueForStorage(childValue, key, new WeakSet<object>(), 1)
    if (compacted !== undefined) output[key] = compacted
  }
  return output
}

function compactContextPackageForStorage(value: any) {
  const target = value?.chapter_target || value?.chapterTarget || {}
  const project = value?.project || {}
  const preflight = value?.preflight || {}
  return storageOmitted('storage_compaction', {
    summary: {
      project_id: value?.project_id ?? project?.id ?? null,
      project_title: value?.project_title ?? project?.title ?? '',
      chapter_id: value?.chapter_id ?? target?.chapter_id ?? target?.id ?? null,
      chapter_no: value?.chapter_no ?? target?.chapter_no ?? target?.chapterNo ?? null,
      chapter_title: value?.chapter_title ?? target?.title ?? '',
      preflight_ready: typeof preflight?.ready === 'boolean' ? preflight.ready : null,
      preflight_warnings: Array.isArray(preflight?.warnings) ? preflight.warnings.slice(0, 12) : [],
      scene_card_count: Array.isArray(target?.scene_cards) ? target.scene_cards.length : 0,
    },
  })
}

function compactJsonPayloadForStorage(value: any, key = '', seen = new WeakSet<object>(), depth = 0): any {
  if (NESTED_STORAGE_KEYS.has(key)) return undefined
  if (value === null || value === undefined) return value
  if (SCENE_DIAGNOSTIC_KEYS.has(key) && Array.isArray(value)) return compactSceneDiagnosticsForStorage(value)
  if (PRE_DRAFT_BRIEF_KEYS.has(key)) return compactPreDraftBriefForStorage(value)
  if (LARGE_DIAGNOSTIC_KEYS.has(key)) {
    return key === 'context_package' || key === 'contextPackage'
      ? compactContextPackageForStorage(value)
      : storageOmitted('storage_compaction')
  }
  const valueType = typeof value
  if (valueType === 'string') {
    if (value.length <= MAX_PERSISTED_DIAGNOSTIC_CHARS) return value
    return storageOmitted('storage_compaction', {
      truncated: true,
      original_chars: value.length,
      preview: value.slice(0, STORAGE_PREVIEW_CHARS),
    })
  }
  if (valueType === 'number' || valueType === 'boolean') return value
  if (valueType === 'bigint') return String(value)
  if (valueType === 'function') return '[Function]'
  if (valueType !== 'object') return String(value)
  if (seen.has(value)) return '[Circular]'
  if (depth >= 12) return storageOmitted('storage_compaction', { max_depth: depth })
  seen.add(value)
  if (Array.isArray(value)) {
    if (value.length > 80) {
      const preview = value.slice(0, 8).map(item => compactJsonPayloadForStorage(item, '', seen, depth + 1))
      seen.delete(value)
      return storageOmitted('storage_compaction', {
        truncated: true,
        original_count: value.length,
        preview,
      })
    }
    const items = value.map(item => compactJsonPayloadForStorage(item, '', seen, depth + 1))
    seen.delete(value)
    return items
  }
  const output: Record<string, any> = {}
  for (const [childKey, item] of Object.entries(value)) {
    const compacted = compactJsonPayloadForStorage(item, childKey, seen, depth + 1)
    if (compacted !== undefined) output[childKey] = compacted
  }
  seen.delete(value)
  return output
}

function compactPersistedText(value: any, maxChars = MAX_PERSISTED_DIAGNOSTIC_CHARS) {
  const text = String(value ?? '')
  if (!text) return ''
  const trimmed = text.trim()
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const compacted = compactJsonPayloadForStorage(JSON.parse(trimmed))
      const compactedText = safeJsonText(compacted)
      if (compactedText.length <= maxChars) return compactedText
      return safeJsonText({
        truncated: true,
        reason: 'storage_compaction',
        original_chars: compactedText.length,
        preview: compactedText.slice(0, STORAGE_PREVIEW_CHARS),
      })
    } catch {
      /* fall through to plain text truncation */
    }
  }
  if (text.length <= maxChars) return text
  return safeJsonText({
    truncated: true,
    reason: 'storage_compaction',
    original_chars: text.length,
    preview: text.slice(0, STORAGE_PREVIEW_CHARS),
  })
}

function compactRawPayloadForStorage(value: any) {
  return compactJsonPayloadForStorage(value)
}

function compactQualityIssueForStorage(value: any) {
  if (!value || typeof value !== 'object') return compactStorageText(value, 420)
  const output: Record<string, any> = {}
  for (const key of [
    'key',
    'label',
    'status',
    'severity',
    'type',
    'message',
    'description',
    'detail',
    'evidence',
    'fix',
    'reason',
    'remaining_risk',
    'remainingRisk',
    'score',
    'passed',
    'delivered',
  ]) {
    if (value[key] === undefined || value[key] === null) continue
    output[key] = typeof value[key] === 'string' ? compactStorageText(value[key], 420) : value[key]
  }
  return Object.keys(output).length ? output : compactJsonPayloadForStorage(value)
}

function compactQualityIssueArrayForStorage(value: any, maxItems = 12) {
  if (!Array.isArray(value)) return []
  const items = value.slice(0, maxItems).map(compactQualityIssueForStorage)
  if (value.length > maxItems) items.push(storageOmitted('storage_compaction', { truncated: true, original_count: value.length - maxItems }))
  return items
}

function compactQualityStringListForStorage(value: any, maxItems = 12, limit = 360) {
  if (!Array.isArray(value)) return []
  const items = value.slice(0, maxItems).map(item => compactStorageText(item, limit)).filter(Boolean)
  if (value.length > maxItems) items.push(`...已省略 ${value.length - maxItems} 项`)
  return items
}

function compactQualityReviewForStorage(review: any = {}) {
  if (!review || typeof review !== 'object') return {}
  const output: Record<string, any> = {}
  for (const key of ['passed', 'score', 'needs_revision', 'needsRevision', 'revised', 'deslop_level', 'deslopLevel']) {
    if (review[key] !== undefined && review[key] !== null) output[key] = review[key]
  }
  if (review.craft_metrics || review.craftMetrics) {
    output.craft_metrics = compactJsonPayloadForStorage(review.craft_metrics || review.craftMetrics)
  }
  const focusedModes = review.focused_revision_modes || review.focusedRevisionModes
  if (Array.isArray(focusedModes)) output.focused_revision_modes = compactQualityStringListForStorage(focusedModes, 8, 80)
  output.issues = compactQualityIssueArrayForStorage(review.issues, 12)
  output.revision_directives = compactQualityStringListForStorage(review.revision_directives || review.revisionDirectives, 12, 420)
  for (const key of [
    'platform_checks',
    'content_rubric_checks',
    'opening_checks',
    'chapter_hook_checks',
    'paragraph_hook_checks',
    'prose_craft_checks',
    'quality_audit_checks',
    'dialogue_checks',
    'state_tracking_checks',
    'source_readiness_checks',
    'delivery_risk_receipts',
    'next_chapter_quality_plan_receipts',
    'scene_card_receipts',
  ]) {
    if (Array.isArray(review[key])) output[key] = compactQualityIssueArrayForStorage(review[key], 8)
  }
  if (review.next_chapter_quality_plan || review.nextChapterQualityPlan) {
    output.next_chapter_quality_plan = compactJsonPayloadForStorage(review.next_chapter_quality_plan || review.nextChapterQualityPlan)
  }
  return output
}

function compactQualityContextForStorage(contextPackage: any = {}) {
  const summary = contextPackage?.summary || {}
  const target = contextPackage?.chapter_target || contextPackage?.chapterTarget || {}
  const preflight = contextPackage?.preflight || {}
  const previous = contextPackage?.continuity?.previous_chapter || contextPackage?.continuity?.previousChapter || null
  return {
    chapter_target: {
      id: target.id ?? target.chapter_id ?? summary.chapter_id ?? null,
      chapter_id: target.chapter_id ?? target.id ?? summary.chapter_id ?? null,
      chapter_no: target.chapter_no ?? target.chapterNo ?? summary.chapter_no ?? null,
      title: compactStorageText(target.title || summary.chapter_title || '', 160),
      scene_card_count: Array.isArray(target.scene_cards)
        ? target.scene_cards.length
        : Array.isArray(target.sceneCards)
          ? target.sceneCards.length
          : Number(summary.scene_card_count || 0),
    },
    preflight: {
      ready: typeof preflight.ready === 'boolean'
        ? preflight.ready
        : typeof summary.preflight_ready === 'boolean'
          ? summary.preflight_ready
          : null,
      warnings: compactQualityStringListForStorage(preflight.warnings || summary.preflight_warnings, 12, 420),
      checks: compactQualityIssueArrayForStorage(preflight.checks, 16),
    },
    continuity: previous
      ? {
          previous_chapter: {
            chapter_no: previous.chapter_no ?? previous.chapterNo ?? null,
            title: compactStorageText(previous.title || '', 120),
            ending_hook: compactStorageText(previous.ending_hook || previous.endingHook || '', 260),
          },
        }
      : {},
  }
}

function compactQualityPipelineForStorage(value: any) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 12).map(stage => ({
    key: compactStorageText(stage?.key || '', 80),
    label: compactStorageText(stage?.label || '', 120),
    status: stage?.status || '',
    detail: compactStorageText(stage?.detail || '', 220),
    error: compactStorageText(stage?.error || '', 260),
    score: stage?.score,
  }))
}

function compactProseQualityPayloadForStorage(value: any = {}) {
  const payload = value?.truncated && typeof value.preview === 'string'
    ? (() => {
        try { return JSON.parse(value.preview) } catch { return value }
      })()
    : value
  const selfCheck = payload?.self_check || payload?.selfCheck || {}
  const review = selfCheck.review || payload?.review || {}
  return {
    chapter_id: payload?.chapter_id ?? payload?.chapterId ?? null,
    chapter_updated_at: payload?.chapter_updated_at || payload?.chapterUpdatedAt || '',
    content_hash: payload?.content_hash || payload?.contentHash || '',
    source: payload?.source || '',
    source_review_id: payload?.source_review_id ?? payload?.sourceReviewId ?? null,
    context_package: compactQualityContextForStorage(payload?.context_package || payload?.contextPackage || {}),
    self_check: {
      revised: Boolean(selfCheck.revised),
      final_text: storageOmitted(),
      review: compactQualityReviewForStorage(review),
    },
    pipeline: compactQualityPipelineForStorage(payload?.pipeline),
  }
}

function hasUnrecoverableStoragePreview(value: any) {
  if (!value?.truncated || typeof value.preview !== 'string') return false
  try {
    JSON.parse(value.preview)
    return false
  } catch {
    return true
  }
}

function compactReviewPayloadText(value: any, reviewType = '', maxChars = MAX_PERSISTED_DIAGNOSTIC_CHARS) {
  const text = String(value ?? '')
  if (!text) return ''
  if (String(reviewType || '') === 'prose_quality') {
    try {
      const parsed = typeof value === 'string' ? JSON.parse(text) : value
      if (hasUnrecoverableStoragePreview(parsed)) return compactPersistedText(value, maxChars)
      const compactedText = safeJsonText(compactProseQualityPayloadForStorage(parsed))
      if (compactedText.length <= maxChars) return compactedText
    } catch {
      /* fall through to generic compaction */
    }
  }
  return compactPersistedText(value, maxChars)
}

function jsonText(value: any, fallback: any = []) { return safeJsonText(value === undefined ? fallback : value) }
function textValue(value: any, fallback = '') { return value === undefined || value === null ? fallback : (typeof value === 'string' ? value : jsonText(value, fallback)) }
function normalizeStore(store: Partial<NovelStore> | null | undefined): NovelStore { return { projects: Array.isArray(store?.projects) ? store!.projects : [], worldbuilding: Array.isArray(store?.worldbuilding) ? store!.worldbuilding : [], characters: Array.isArray(store?.characters) ? store!.characters : [], outlines: Array.isArray(store?.outlines) ? store!.outlines : [], chapters: Array.isArray(store?.chapters) ? store!.chapters : [], chapter_versions: Array.isArray(store?.chapter_versions) ? store!.chapter_versions : [], reviews: Array.isArray(store?.reviews) ? store!.reviews : [], runs: Array.isArray(store?.runs) ? store!.runs : [], setting_entities: Array.isArray(store?.setting_entities) ? store!.setting_entities : [], chapter_setting_usage: Array.isArray(store?.chapter_setting_usage) ? store!.chapter_setting_usage : [] } }
async function readJsonStore(activeWorkspace: string): Promise<NovelStore> { try { return normalizeStore(JSON.parse(await readFile(getNovelStorePath(activeWorkspace), 'utf8')) as Partial<NovelStore>) } catch { return normalizeStore(null) } }
function dbPathFromEnv() { const raw = process.env.SQLITE_DATABASE_URL || process.env.DATABASE_URL || ''; if (!raw) return ''; if (raw.startsWith('file:')) return raw.slice(5).split('?', 1)[0]; return raw }
function boundedTimeout(value: any, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, Math.floor(parsed))) : fallback
}
function sqliteBusyTimeoutMs() { return boundedTimeout(process.env.NOVEL_SQLITE_BUSY_TIMEOUT_MS, 5000, 25, 30000) }
function mutationLockTimeoutMs() { return boundedTimeout(process.env.NOVEL_MUTATION_LOCK_TIMEOUT_MS, 15000, 25, 60000) }
function openDb(activeWorkspace: string) {
  const db = new Database(dbPathFromEnv() || getNovelDbPath(activeWorkspace))
  db.exec(`PRAGMA busy_timeout = ${sqliteBusyTimeoutMs()}`)
  return db
}
type NovelMutationWaiter = {
  resolve: (release: () => void) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}
type NovelMutationLock = { locked: boolean; waiters: NovelMutationWaiter[] }
const novelMutationLocks = new Map<string, NovelMutationLock>()
const novelMutationContext = new AsyncLocalStorage<Set<string>>()
function novelMutationKey(activeWorkspace: string) { return dbPathFromEnv() || getNovelDbPath(activeWorkspace) }
function releaseNovelMutationLock(key: string, lock: NovelMutationLock) {
  const next = lock.waiters.shift()
  if (next) {
    clearTimeout(next.timer)
    next.resolve(() => releaseNovelMutationLock(key, lock))
    return
  }
  lock.locked = false
  novelMutationLocks.delete(key)
}
function acquireNovelMutationLock(key: string) {
  let lock = novelMutationLocks.get(key)
  if (!lock) {
    lock = { locked: false, waiters: [] }
    novelMutationLocks.set(key, lock)
  }
  if (!lock.locked) {
    lock.locked = true
    return Promise.resolve(() => releaseNovelMutationLock(key, lock!))
  }
  return new Promise<() => void>((resolve, reject) => {
    const timeoutMs = mutationLockTimeoutMs()
    const waiter: NovelMutationWaiter = {
      resolve,
      reject,
      timer: setTimeout(() => {
        const index = lock!.waiters.indexOf(waiter)
        if (index >= 0) lock!.waiters.splice(index, 1)
        reject(new Error(`novel workspace mutation lock timeout after ${timeoutMs}ms`))
      }, timeoutMs),
    }
    lock!.waiters.push(waiter)
  })
}
async function withNovelWorkspaceMutation<T>(activeWorkspace: string, mutation: () => Promise<T>, operation = 'mutation'): Promise<T> {
  const key = novelMutationKey(activeWorkspace)
  const activeKeys = novelMutationContext.getStore()
  if (activeKeys?.has(key)) return mutation()
  const release = await acquireNovelMutationLock(key)
  const nextKeys = new Set(activeKeys || [])
  nextKeys.add(key)
  try {
    const testHook = getNovelMutationTestHook()
    if (testHook) await testHook({ activeWorkspace, phase: 'after_mutation_lock_acquired', operation })
    return await novelMutationContext.run(nextKeys, mutation)
  } finally {
    release()
  }
}
function assertNovelWorkspaceMutationHeld(activeWorkspace: string) {
  if (!novelMutationContext.getStore()?.has(novelMutationKey(activeWorkspace))) {
    throw new Error('novel store write attempted outside workspace mutation lock')
  }
}
function parseDbArray(value: any) { try { return value ? JSON.parse(String(value)) : [] } catch { return [] } }
function parseDbJson(value: any, fallback: any = null) { try { return value ? JSON.parse(String(value)) : fallback } catch { return fallback } }
function tableExists(db: Database, name: string) { return !!db.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name) }
function hasColumn(db: Database, table: string, column: string) {
  return (db.query(`PRAGMA table_info(${table})`).all() as any[]).some(item => item.name === column)
}
function addColumnIfMissing(db: Database, table: string, column: string, definition: string) {
  if (!hasColumn(db, table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}
function ensureSqliteSchema(db: Database) {
  db.exec(`
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  genre TEXT DEFAULT '',
  sub_genres TEXT DEFAULT '[]',
  synopsis TEXT DEFAULT '',
  length_target TEXT DEFAULT 'medium',
  target_audience TEXT DEFAULT '',
  style_tags TEXT DEFAULT '[]',
  commercial_tags TEXT DEFAULT '[]',
  reference_config TEXT DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS worldbuilding (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  world_summary TEXT DEFAULT '',
  rules TEXT DEFAULT '[]',
  factions TEXT DEFAULT '[]',
  locations TEXT DEFAULT '[]',
  systems TEXT DEFAULT '[]',
  items TEXT DEFAULT '[]',
  timeline_anchor TEXT DEFAULT '',
  known_unknowns TEXT DEFAULT '[]',
  version INTEGER DEFAULT 1,
  raw_payload TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT '',
  role_type TEXT DEFAULT '',
  archetype TEXT DEFAULT '',
  personality TEXT DEFAULT '[]',
  motivation TEXT DEFAULT '',
  goal TEXT DEFAULT '',
  conflict TEXT DEFAULT '',
  abilities TEXT DEFAULT '[]',
  backstory TEXT DEFAULT '',
  relationships TEXT DEFAULT '[]',
  relationship_graph TEXT DEFAULT '{}',
  growth_arc TEXT DEFAULT '',
  arc_hint TEXT DEFAULT '',
  current_state TEXT DEFAULT '{}',
  secret TEXT DEFAULT '',
  appearance TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  version INTEGER DEFAULT 1,
  raw_payload TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS outlines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  outline_type TEXT NOT NULL DEFAULT 'master',
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  beats TEXT DEFAULT '[]',
  conflict_points TEXT DEFAULT '[]',
  turning_points TEXT DEFAULT '[]',
  hook TEXT DEFAULT '',
  target_length TEXT DEFAULT '',
  version INTEGER DEFAULT 1,
  parent_id INTEGER DEFAULT NULL,
  raw_payload TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES outlines(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  outline_id INTEGER DEFAULT NULL,
  chapter_no INTEGER NOT NULL,
  title TEXT NOT NULL,
  chapter_goal TEXT DEFAULT '',
  chapter_summary TEXT DEFAULT '',
  conflict TEXT DEFAULT '',
  ending_hook TEXT DEFAULT '',
  chapter_text TEXT DEFAULT '',
  scene_breakdown TEXT DEFAULT '[]',
  scene_list TEXT DEFAULT '[]',
  continuity_notes TEXT DEFAULT '[]',
  items_in_play TEXT DEFAULT '[]',
  foreshadowing TEXT DEFAULT '[]',
  timeline_note TEXT DEFAULT '',
  status TEXT DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  published_at TEXT DEFAULT NULL,
  raw_payload TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (outline_id) REFERENCES outlines(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS chapter_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chapter_id INTEGER NOT NULL,
  project_id INTEGER NOT NULL,
  version_no INTEGER NOT NULL DEFAULT 1,
  chapter_text TEXT DEFAULT '',
  scene_breakdown TEXT DEFAULT '[]',
  continuity_notes TEXT DEFAULT '[]',
  source TEXT DEFAULT 'manual_edit',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  review_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok',
  summary TEXT DEFAULT '',
  issues TEXT DEFAULT '[]',
  payload TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  run_type TEXT NOT NULL,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL,
  input_ref TEXT DEFAULT '',
  output_ref TEXT DEFAULT '',
  duration_ms INTEGER DEFAULT 0,
  error_message TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS project_seed_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  idea TEXT DEFAULT '',
  seed TEXT NOT NULL DEFAULT '{}',
  review_model TEXT DEFAULT '{}',
  diagnostics TEXT DEFAULT '{}',
  model_id INTEGER DEFAULT NULL,
  source TEXT DEFAULT 'deep_draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS setting_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  entity_type TEXT NOT NULL,
  name TEXT NOT NULL,
  summary TEXT DEFAULT '',
  status TEXT DEFAULT 'active',
  visibility TEXT DEFAULT 'public',
  first_chapter_no INTEGER DEFAULT NULL,
  last_chapter_no INTEGER DEFAULT NULL,
  related_character_ids TEXT DEFAULT '[]',
  related_chapter_ids TEXT DEFAULT '[]',
  related_entity_ids TEXT DEFAULT '[]',
  constraints_json TEXT DEFAULT '{}',
  state_json TEXT DEFAULT '{}',
  payload_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS chapter_setting_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  chapter_id INTEGER NOT NULL,
  entity_id INTEGER NOT NULL,
  usage_type TEXT DEFAULT 'allowed',
  required INTEGER DEFAULT 0,
  allowed INTEGER DEFAULT 1,
  forbidden INTEGER DEFAULT 0,
  reveal_level TEXT DEFAULT 'none',
  expected_state_change TEXT DEFAULT '{}',
  actual_state_change TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
  FOREIGN KEY (entity_id) REFERENCES setting_entities(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_worldbuilding_project_id ON worldbuilding(project_id);
CREATE INDEX IF NOT EXISTS idx_characters_project_id ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_outlines_project_id ON outlines(project_id);
CREATE INDEX IF NOT EXISTS idx_outlines_parent_id ON outlines(parent_id);
CREATE INDEX IF NOT EXISTS idx_chapters_project_id ON chapters(project_id);
CREATE INDEX IF NOT EXISTS idx_chapters_project_chapter_no ON chapters(project_id, chapter_no);
CREATE INDEX IF NOT EXISTS idx_chapters_outline_id ON chapters(outline_id);
CREATE INDEX IF NOT EXISTS idx_chapters_chapter_no ON chapters(chapter_no);
CREATE INDEX IF NOT EXISTS idx_chapter_versions_chapter_id ON chapter_versions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_reviews_project_id ON reviews(project_id);
CREATE INDEX IF NOT EXISTS idx_runs_project_id ON runs(project_id);
CREATE INDEX IF NOT EXISTS idx_runs_project_created_at ON runs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_seed_drafts_updated_at ON project_seed_drafts(updated_at);
CREATE INDEX IF NOT EXISTS idx_setting_entities_project_type ON setting_entities(project_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_setting_entities_project_name ON setting_entities(project_id, name);
CREATE INDEX IF NOT EXISTS idx_chapter_setting_usage_chapter ON chapter_setting_usage(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_setting_usage_entity ON chapter_setting_usage(entity_id);
CREATE INDEX IF NOT EXISTS idx_chapter_setting_usage_project_chapter ON chapter_setting_usage(project_id, chapter_id);
`)
  for (const [table, columns] of Object.entries({
    projects: [['synopsis', "TEXT DEFAULT ''"], ['reference_config', "TEXT DEFAULT '{}'"]],
    worldbuilding: [['items', "TEXT DEFAULT '[]'"], ['raw_payload', "TEXT DEFAULT '{}'"]],
    characters: [['role', "TEXT DEFAULT ''"], ['personality', "TEXT DEFAULT '[]'"], ['abilities', "TEXT DEFAULT '[]'"], ['backstory', "TEXT DEFAULT ''"], ['relationships', "TEXT DEFAULT '[]'"], ['relationship_graph', "TEXT DEFAULT '{}'"], ['growth_arc', "TEXT DEFAULT ''"], ['arc_hint', "TEXT DEFAULT ''"], ['current_state', "TEXT DEFAULT '{}'"], ['secret', "TEXT DEFAULT ''"], ['appearance', "TEXT DEFAULT ''"], ['status', "TEXT DEFAULT 'active'"], ['version', 'INTEGER DEFAULT 1'], ['raw_payload', "TEXT DEFAULT '{}'"], ['created_at', "TEXT DEFAULT ''"]],
    outlines: [['beats', "TEXT DEFAULT '[]'"], ['target_length', "TEXT DEFAULT ''"], ['version', 'INTEGER DEFAULT 1'], ['raw_payload', "TEXT DEFAULT '{}'"], ['created_at', "TEXT DEFAULT ''"]],
    chapters: [['scene_list', "TEXT DEFAULT '[]'"], ['items_in_play', "TEXT DEFAULT '[]'"], ['foreshadowing', "TEXT DEFAULT '[]'"], ['timeline_note', "TEXT DEFAULT ''"], ['version', 'INTEGER DEFAULT 1'], ['published_at', 'TEXT DEFAULT NULL'], ['raw_payload', "TEXT DEFAULT '{}'"]],
    reviews: [['payload', "TEXT DEFAULT ''"], ['status', "TEXT DEFAULT 'ok'"]],
    project_seed_drafts: [['review_model', "TEXT DEFAULT '{}'"], ['diagnostics', "TEXT DEFAULT '{}'"], ['model_id', 'INTEGER DEFAULT NULL'], ['source', "TEXT DEFAULT 'deep_draft'"]],
    setting_entities: [['payload_json', "TEXT DEFAULT '{}'"], ['state_json', "TEXT DEFAULT '{}'"], ['constraints_json', "TEXT DEFAULT '{}'"]],
    chapter_setting_usage: [['expected_state_change', "TEXT DEFAULT '{}'"], ['actual_state_change', "TEXT DEFAULT '{}'"]],
  } as Record<string, Array<[string, string]>>)) {
    if (!tableExists(db, table)) continue
    for (const [column, definition] of columns) addColumnIfMissing(db, table, column, definition)
  }
}
function projectFromRow(item: any): NovelProjectRecord {
  return { ...item, sub_genres: parseDbArray(item.sub_genres), style_tags: parseDbArray(item.style_tags), commercial_tags: parseDbArray(item.commercial_tags), reference_config: parseDbJson(item.reference_config, {}) }
}
function worldbuildingFromRow(item: any): NovelWorldbuildingRecord {
  return { ...item, rules: parseDbJson(item.rules, []), factions: parseDbArray(item.factions), locations: parseDbArray(item.locations), systems: parseDbJson(item.systems, []), items: parseDbArray(item.items), timeline_anchor: parseDbJson(item.timeline_anchor, item.timeline_anchor || ''), known_unknowns: parseDbArray(item.known_unknowns), raw_payload: parseDbJson(item.raw_payload, {}) }
}
function characterFromRow(item: any): NovelCharacterRecord {
  return { ...item, personality: parseDbJson(item.personality, []), abilities: parseDbArray(item.abilities), relationships: parseDbJson(item.relationships, []), relationship_graph: parseDbJson(item.relationship_graph, {}), current_state: parseDbJson(item.current_state, {}), raw_payload: parseDbJson(item.raw_payload, {}) }
}
function outlineFromRow(item: any): NovelOutlineRecord {
  return { ...item, beats: parseDbArray(item.beats), conflict_points: parseDbArray(item.conflict_points), turning_points: parseDbArray(item.turning_points), raw_payload: parseDbJson(item.raw_payload, {}) }
}
function chapterFromRow(item: any): NovelChapterRecord {
  return { ...item, scene_breakdown: parseDbArray(item.scene_breakdown), scene_list: parseDbArray(item.scene_list), continuity_notes: parseDbArray(item.continuity_notes), items_in_play: parseDbArray(item.items_in_play), foreshadowing: parseDbJson(item.foreshadowing, []), raw_payload: parseDbJson(item.raw_payload, {}) }
}
function chapterVersionFromRow(item: any): NovelChapterVersionRecord {
  return { ...item, scene_breakdown: parseDbArray(item.scene_breakdown), continuity_notes: parseDbArray(item.continuity_notes) }
}
function reviewFromRow(item: any): NovelReviewRecord {
  return { ...item, issues: parseDbArray(item.issues), payload: item.payload || '' }
}
function settingEntityFromRow(item: any): NovelSettingEntityRecord {
  return { ...item, related_character_ids: parseDbArray(item.related_character_ids).map(Number).filter(Boolean), related_chapter_ids: parseDbArray(item.related_chapter_ids).map(Number).filter(Boolean), related_entity_ids: parseDbArray(item.related_entity_ids).map(Number).filter(Boolean), constraints_json: parseDbJson(item.constraints_json, {}), state_json: parseDbJson(item.state_json, {}), payload_json: parseDbJson(item.payload_json, {}) }
}
function chapterSettingUsageFromRow(item: any): NovelChapterSettingUsageRecord {
  return { ...item, required: Boolean(item.required), allowed: item.allowed !== 0, forbidden: Boolean(item.forbidden), expected_state_change: parseDbJson(item.expected_state_change, {}), actual_state_change: parseDbJson(item.actual_state_change, {}) }
}
function loadStoreFromOpenDb(db: Database): NovelStore {
  ensureSqliteSchema(db)
  try {
    const projects = db.query('SELECT * FROM projects ORDER BY updated_at DESC').all() as any[]
    const worldbuilding = db.query('SELECT * FROM worldbuilding').all() as any[]
    const characters = db.query('SELECT * FROM characters').all() as any[]
    const outlines = db.query('SELECT * FROM outlines').all() as any[]
    const chapters = db.query('SELECT * FROM chapters ORDER BY chapter_no ASC').all() as any[]
    const chapterVersions = db.query('SELECT * FROM chapter_versions ORDER BY created_at DESC').all() as any[]
    const reviews = db.query('SELECT * FROM reviews').all() as any[]
    const runs = db.query('SELECT * FROM runs ORDER BY created_at DESC').all() as any[]
    const settingEntities = db.query('SELECT * FROM setting_entities ORDER BY entity_type ASC, name ASC').all() as any[]
    const chapterSettingUsage = db.query('SELECT * FROM chapter_setting_usage ORDER BY updated_at DESC').all() as any[]
    return {
      projects: projects.map(projectFromRow),
      worldbuilding: worldbuilding.map(worldbuildingFromRow),
      characters: characters.map(characterFromRow),
      outlines: outlines.map(outlineFromRow),
      chapters: chapters.map(chapterFromRow),
      chapter_versions: chapterVersions.map(chapterVersionFromRow),
      reviews: reviews.map(reviewFromRow),
      runs,
      setting_entities: settingEntities.map(settingEntityFromRow),
      chapter_setting_usage: chapterSettingUsage.map(chapterSettingUsageFromRow),
    }
  } catch (error) {
    if (String(error).includes('no such table')) return normalizeStore(null)
    throw error
  }
}
function storeScore(store: NovelStore) { return Object.values(store).reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0) }
async function readStore(activeWorkspace: string): Promise<NovelStore> {
  const db = openDb(activeWorkspace)
  try {
    const dbStore = loadStoreFromOpenDb(db)
    if (storeScore(dbStore) > 0) return dbStore
    const jsonStore = await readJsonStore(activeWorkspace)
    if (storeScore(jsonStore) > storeScore(dbStore)) {
      db.close()
      return withNovelWorkspaceMutation(activeWorkspace, async () => {
        await importLegacyNovelStoreIfNeeded(activeWorkspace, jsonStore)
        const migrated = openDb(activeWorkspace)
        try { return loadStoreFromOpenDb(migrated) } finally { migrated.close() }
      })
    }
    return dbStore
  } finally {
    try { db.close() } catch { /* already closed during migration */ }
  }
}
async function ensureLegacyNovelStoreImportedForRead(activeWorkspace: string) {
  if (!existsSync(getNovelStorePath(activeWorkspace))) return
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    if (db.query('SELECT 1 AS present FROM projects LIMIT 1').get()) return
  } finally {
    db.close()
  }
  const jsonStore = await readJsonStore(activeWorkspace)
  if (storeScore(jsonStore) === 0) return
  await withNovelWorkspaceMutation(activeWorkspace, () => importLegacyNovelStoreIfNeeded(activeWorkspace, jsonStore), 'legacy-read-import')
}
function replaceStoreInOpenDb(db: Database, store: NovelStore) {
  const normalized = normalizeStore(store)
  for (const table of ['chapter_setting_usage','setting_entities','runs','reviews','chapter_versions','chapters','outlines','characters','worldbuilding','projects']) db.exec(`DELETE FROM ${table}`)
  const insert = (sql: string, params: any[]) => db.query(sql).run(...params)
    for (const p of normalized.projects) insert('INSERT INTO projects (id,title,genre,sub_genres,synopsis,length_target,target_audience,style_tags,commercial_tags,reference_config,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [p.id,p.title,p.genre||'',jsonText(p.sub_genres),p.synopsis||'',p.length_target||'medium',p.target_audience||'',jsonText(p.style_tags),jsonText(p.commercial_tags),jsonText(p.reference_config, {}),p.status||'draft',p.created_at||nowIso(),p.updated_at||nowIso()])
    for (const w of normalized.worldbuilding) insert('INSERT INTO worldbuilding (id,project_id,world_summary,rules,factions,locations,systems,items,timeline_anchor,known_unknowns,version,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [w.id,w.project_id,w.world_summary||'',jsonText(w.rules),jsonText(w.factions),jsonText(w.locations),jsonText(w.systems),jsonText(w.items),textValue(w.timeline_anchor),jsonText(w.known_unknowns),w.version||1,jsonText(w.raw_payload || w, {}),w.created_at||nowIso(),w.updated_at||nowIso()])
    for (const c of normalized.characters) insert('INSERT INTO characters (id,project_id,name,role,role_type,archetype,personality,motivation,goal,conflict,abilities,backstory,relationships,relationship_graph,growth_arc,arc_hint,current_state,secret,appearance,status,version,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [c.id,c.project_id,c.name,c.role||'',c.role_type||c.role||'',c.archetype||'',jsonText(c.personality),c.motivation||'',c.goal||'',c.conflict||'',jsonText(c.abilities),c.backstory||'',jsonText(c.relationships),jsonText(c.relationship_graph, {}),c.growth_arc||'',c.arc_hint||'',jsonText(c.current_state, {}),c.secret||'',c.appearance||'',c.status||'active',c.version||1,jsonText(c.raw_payload || c, {}),c.created_at||c.updated_at||nowIso(),c.updated_at||nowIso()])
    for (const o of normalized.outlines) insert('INSERT INTO outlines (id,project_id,outline_type,title,summary,beats,conflict_points,turning_points,hook,target_length,version,parent_id,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [o.id,o.project_id,o.outline_type||'master',o.title,o.summary||'',jsonText(o.beats),jsonText(o.conflict_points),jsonText(o.turning_points),o.hook||'',o.target_length||'',o.version||1,o.parent_id ?? null,jsonText(o.raw_payload || o, {}),o.created_at||nowIso(),o.updated_at||nowIso()])
    for (const c of normalized.chapters) insert('INSERT INTO chapters (id,project_id,outline_id,chapter_no,title,chapter_goal,chapter_summary,conflict,ending_hook,chapter_text,scene_breakdown,scene_list,continuity_notes,items_in_play,foreshadowing,timeline_note,status,version,published_at,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [c.id,c.project_id,c.outline_id ?? null,c.chapter_no,c.title,c.chapter_goal||'',c.chapter_summary||'',c.conflict||'',c.ending_hook||'',c.chapter_text||'',jsonText(c.scene_breakdown),jsonText(c.scene_list || c.scene_breakdown),jsonText(c.continuity_notes),jsonText(c.items_in_play),jsonText(c.foreshadowing),c.timeline_note||'',c.status||'draft',c.version||1,c.published_at||null,jsonText(c.raw_payload || c, {}),c.created_at||nowIso(),c.updated_at||nowIso()])
    for (const v of normalized.chapter_versions) insert('INSERT INTO chapter_versions (id,chapter_id,project_id,version_no,chapter_text,scene_breakdown,continuity_notes,source,created_at) VALUES (?,?,?,?,?,?,?,?,?)', [v.id,v.chapter_id,v.project_id,v.version_no,v.chapter_text||'',jsonText(v.scene_breakdown||[]),jsonText(v.continuity_notes||[]),v.source||'manual_edit',v.created_at||nowIso()])
    for (const r of normalized.reviews) insert('INSERT INTO reviews (id,project_id,review_type,status,summary,issues,payload,created_at) VALUES (?,?,?,?,?,?,?,?)', [r.id,r.project_id,r.review_type,r.status,r.summary||'',jsonText(r.issues||[]),r.payload||'',r.created_at||nowIso()])
    for (const r of normalized.runs) insert('INSERT INTO runs (id,project_id,run_type,step_name,status,input_ref,output_ref,duration_ms,error_message,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)', [r.id,r.project_id,r.run_type,r.step_name,r.status,r.input_ref||'',r.output_ref||'',r.duration_ms||0,r.error_message||'',r.created_at||nowIso()])
    for (const s of normalized.setting_entities) insert('INSERT INTO setting_entities (id,project_id,entity_type,name,summary,status,visibility,first_chapter_no,last_chapter_no,related_character_ids,related_chapter_ids,related_entity_ids,constraints_json,state_json,payload_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [s.id,s.project_id,s.entity_type||'rule',s.name,s.summary||'',s.status||'active',s.visibility||'public',s.first_chapter_no ?? null,s.last_chapter_no ?? null,jsonText(s.related_character_ids, []),jsonText(s.related_chapter_ids, []),jsonText(s.related_entity_ids, []),jsonText(s.constraints_json, {}),jsonText(s.state_json, {}),jsonText(s.payload_json || s, {}),s.created_at||nowIso(),s.updated_at||nowIso()])
  for (const u of normalized.chapter_setting_usage) insert('INSERT INTO chapter_setting_usage (id,project_id,chapter_id,entity_id,usage_type,required,allowed,forbidden,reveal_level,expected_state_change,actual_state_change,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [u.id,u.project_id,u.chapter_id,u.entity_id,u.usage_type||'allowed',u.required ? 1 : 0,u.allowed === false ? 0 : 1,u.forbidden ? 1 : 0,u.reveal_level||'none',jsonText(u.expected_state_change, {}),jsonText(u.actual_state_change, {}),u.created_at||nowIso(),u.updated_at||nowIso()])
}
async function importLegacyNovelStoreIfNeeded(activeWorkspace: string, knownJsonStore?: NovelStore) {
  assertNovelWorkspaceMutationHeld(activeWorkspace)
  const jsonStore = knownJsonStore || await readJsonStore(activeWorkspace)
  if (storeScore(jsonStore) === 0) return
  const db = openDb(activeWorkspace)
  let committed = false
  try {
    ensureSqliteSchema(db)
    db.exec('BEGIN IMMEDIATE')
    if (storeScore(loadStoreFromOpenDb(db)) === 0) replaceStoreInOpenDb(db, jsonStore)
    db.exec('COMMIT')
    committed = true
  } catch (error) {
    if (!committed) {
      try { db.exec('ROLLBACK') } catch { /* transaction may not have started */ }
    }
    throw error
  } finally {
    db.close()
  }
}
async function mutateNovelStore<T>(activeWorkspace: string, mutation: (store: NovelStore) => T): Promise<T> {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
    await importLegacyNovelStoreIfNeeded(activeWorkspace)
    const testHook = getNovelMutationTestHook()
    if (testHook) await testHook({ activeWorkspace, phase: 'before_full_store_write' })
    const db = openDb(activeWorkspace)
    let committed = false
    try {
      ensureSqliteSchema(db)
      db.exec('BEGIN IMMEDIATE')
      const store = loadStoreFromOpenDb(db)
      const result = mutation(store)
      replaceStoreInOpenDb(db, store)
      db.exec('COMMIT')
      committed = true
      return result
    } catch (error) {
      if (!committed) {
        try { db.exec('ROLLBACK') } catch { /* transaction may not have started */ }
      }
      throw error
    } finally {
      db.close()
    }
  })
}
function normalizeReferenceConfig(value: any): NovelReferenceConfig {
  const raw = value && typeof value === 'object' ? value : {}
  const references = Array.isArray(raw.references)
    ? raw.references.map((item: any) => ({
      project_title: String(item?.project_title || item?.projectTitle || '').trim(),
      weight: Math.max(0.1, Math.min(1, Number(item?.weight || 0.7) || 0.7)),
      use_for: toStringArray(item?.use_for || item?.useFor),
      dimensions: toStringArray(item?.dimensions),
      avoid: toStringArray(item?.avoid),
    })).filter((item: any) => item.project_title)
    : []
  const strength = raw.strength === 'light' || raw.strength === 'strong' ? raw.strength : 'balanced'
  return {
    ...raw,
    references,
    strength,
    notes: String(raw.notes || ''),
  }
}
function normalizeProjectRecord(data: Partial<NovelProjectRecord>, existing?: Partial<NovelProjectRecord>): NovelProjectRecord { const ts = nowIso(); return { id: Number(existing?.id || data.id || 0), title: String(data.title ?? existing?.title ?? '未命名小说'), genre: String(data.genre ?? existing?.genre ?? ''), sub_genres: toStringArray(data.sub_genres ?? existing?.sub_genres), synopsis: String(data.synopsis ?? existing?.synopsis ?? ''), length_target: String(data.length_target ?? existing?.length_target ?? 'medium'), target_audience: String(data.target_audience ?? existing?.target_audience ?? ''), style_tags: toStringArray(data.style_tags ?? existing?.style_tags), commercial_tags: toStringArray(data.commercial_tags ?? existing?.commercial_tags), reference_config: normalizeReferenceConfig(data.reference_config ?? existing?.reference_config), status: String(data.status ?? existing?.status ?? 'draft'), created_at: String(existing?.created_at ?? data.created_at ?? ts), updated_at: String(existing?.updated_at ?? data.updated_at ?? ts) } }
function normalizeWorldbuildingRecord(data: Partial<NovelWorldbuildingRecord>, existing?: Partial<NovelWorldbuildingRecord>): NovelWorldbuildingRecord {
  const raw = { ...(existing?.raw_payload || {}), ...(data.raw_payload || {}), ...data }
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    world_summary: String(data.world_summary ?? existing?.world_summary ?? ''),
    rules: toJsonable(data.rules ?? existing?.rules, []),
    factions: toAnyArray(data.factions ?? existing?.factions),
    locations: toAnyArray(data.locations ?? existing?.locations),
    systems: toJsonable(data.systems ?? existing?.systems, []),
    items: toAnyArray((data as any).items ?? existing?.items),
    timeline_anchor: toJsonable(data.timeline_anchor ?? existing?.timeline_anchor, ''),
    known_unknowns: toAnyArray(data.known_unknowns ?? existing?.known_unknowns),
    version: Number(data.version ?? existing?.version ?? 1),
    raw_payload: raw,
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}
function normalizeCharacterRecord(data: Partial<NovelCharacterRecord>, existing?: Partial<NovelCharacterRecord>): NovelCharacterRecord {
  const raw = { ...(existing?.raw_payload || {}), ...(data.raw_payload || {}), ...data }
  const role = String(data.role ?? data.role_type ?? existing?.role ?? existing?.role_type ?? '')
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    name: String(data.name ?? existing?.name ?? '未命名角色'),
    role,
    role_type: String(data.role_type ?? existing?.role_type ?? role),
    archetype: String(data.archetype ?? existing?.archetype ?? ''),
    personality: toJsonable(data.personality ?? existing?.personality, []),
    motivation: String(data.motivation ?? existing?.motivation ?? ''),
    goal: String(data.goal ?? existing?.goal ?? ''),
    conflict: String(data.conflict ?? existing?.conflict ?? ''),
    abilities: toAnyArray(data.abilities ?? existing?.abilities),
    backstory: String(data.backstory ?? existing?.backstory ?? ''),
    relationships: toJsonable(data.relationships ?? existing?.relationships, []),
    relationship_graph: toJsonable(data.relationship_graph ?? existing?.relationship_graph, {}),
    growth_arc: String(data.growth_arc ?? existing?.growth_arc ?? ''),
    arc_hint: String(data.arc_hint ?? existing?.arc_hint ?? ''),
    current_state: toJsonable(data.current_state ?? existing?.current_state, {}),
    secret: String(data.secret ?? existing?.secret ?? ''),
    appearance: String(data.appearance ?? existing?.appearance ?? ''),
    status: String(data.status ?? existing?.status ?? 'active'),
    version: Number(data.version ?? existing?.version ?? 1),
    raw_payload: raw,
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}
function normalizeOutlineRecord(data: Partial<NovelOutlineRecord>, existing?: Partial<NovelOutlineRecord>): NovelOutlineRecord {
  const raw = { ...(existing?.raw_payload || {}), ...(data.raw_payload || {}), ...data }
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    outline_type: String(data.outline_type ?? existing?.outline_type ?? 'master'),
    title: String(data.title ?? existing?.title ?? '未命名大纲'),
    summary: String(data.summary ?? existing?.summary ?? ''),
    beats: toAnyArray(data.beats ?? existing?.beats),
    conflict_points: toStringArray(data.conflict_points ?? existing?.conflict_points),
    turning_points: toStringArray(data.turning_points ?? existing?.turning_points),
    hook: String(data.hook ?? existing?.hook ?? ''),
    target_length: String(data.target_length ?? existing?.target_length ?? ''),
    version: Number(data.version ?? existing?.version ?? 1),
    parent_id: data.parent_id ?? existing?.parent_id ?? null,
    raw_payload: raw,
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}
function normalizeChapterRecord(data: Partial<NovelChapterRecord>, existing?: Partial<NovelChapterRecord>): NovelChapterRecord {
  const raw = { ...(existing?.raw_payload || {}), ...(data.raw_payload || {}), ...data }
  const sceneBreakdown = toAnyArray(data.scene_breakdown ?? data.scene_list ?? existing?.scene_breakdown ?? existing?.scene_list)
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    chapter_no: Number(data.chapter_no ?? existing?.chapter_no ?? 1),
    title: String(data.title ?? existing?.title ?? '第一章'),
    chapter_goal: String(data.chapter_goal ?? existing?.chapter_goal ?? ''),
    chapter_summary: String(data.chapter_summary ?? existing?.chapter_summary ?? ''),
    conflict: String(data.conflict ?? existing?.conflict ?? ''),
    ending_hook: String(data.ending_hook ?? existing?.ending_hook ?? ''),
    chapter_text: String(data.chapter_text ?? existing?.chapter_text ?? ''),
    scene_breakdown: sceneBreakdown,
    scene_list: toAnyArray(data.scene_list ?? existing?.scene_list ?? sceneBreakdown),
    continuity_notes: toStringArray(data.continuity_notes ?? existing?.continuity_notes),
    items_in_play: toAnyArray(data.items_in_play ?? existing?.items_in_play),
    foreshadowing: toJsonable(data.foreshadowing ?? existing?.foreshadowing, []),
    timeline_note: String(data.timeline_note ?? existing?.timeline_note ?? ''),
    status: String(data.status ?? existing?.status ?? 'draft'),
    version: Number(data.version ?? existing?.version ?? 1),
    published_at: data.published_at ?? existing?.published_at ?? null,
    outline_id: data.outline_id ?? existing?.outline_id ?? null,
    raw_payload: compactRawPayloadForStorage(raw),
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}
function normalizeReviewRecord(data: Partial<NovelReviewRecord>, existing?: Partial<NovelReviewRecord>): NovelReviewRecord {
  const reviewType = String(data.review_type ?? existing?.review_type ?? 'continuity')
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    review_type: reviewType,
    status: String(data.status ?? existing?.status ?? 'ok'),
    summary: String(data.summary ?? existing?.summary ?? ''),
    issues: toStringArray(data.issues ?? existing?.issues),
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    payload: compactReviewPayloadText(data.payload ?? existing?.payload ?? '', reviewType),
  }
}
function normalizeRunRecord(data: Partial<NovelRunRecord>, existing?: Partial<NovelRunRecord>): NovelRunRecord { return { id: Number(existing?.id || data.id || 0), project_id: Number(data.project_id ?? existing?.project_id ?? 0), run_type: String(data.run_type ?? existing?.run_type ?? 'plan'), step_name: String(data.step_name ?? existing?.step_name ?? 'step'), status: String(data.status ?? existing?.status ?? 'pending'), input_ref: compactPersistedText(data.input_ref ?? existing?.input_ref ?? ''), output_ref: compactPersistedText(data.output_ref ?? existing?.output_ref ?? ''), duration_ms: Number(data.duration_ms ?? existing?.duration_ms ?? 0), error_message: String(data.error_message ?? existing?.error_message ?? ''), created_at: String(existing?.created_at ?? data.created_at ?? nowIso()) } }
function normalizeProjectSeedDraftRecord(data: Partial<NovelProjectSeedDraftRecord>, existing?: Partial<NovelProjectSeedDraftRecord>): NovelProjectSeedDraftRecord {
  const seed = data.seed ?? existing?.seed ?? {}
  const title = String(data.title ?? existing?.title ?? seed?.title ?? seed?.project_title ?? '未命名孵化草稿').trim() || '未命名孵化草稿'
  return {
    id: Number(existing?.id || data.id || 0),
    title,
    idea: String(data.idea ?? existing?.idea ?? ''),
    seed,
    review_model: data.review_model ?? existing?.review_model ?? {},
    diagnostics: data.diagnostics ?? existing?.diagnostics ?? {},
    model_id: data.model_id === undefined ? (existing?.model_id ?? null) : (data.model_id === null ? null : Number(data.model_id) || null),
    source: String(data.source ?? existing?.source ?? 'deep_draft'),
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}
function projectSeedDraftFromRow(row: any): NovelProjectSeedDraftRecord {
  return {
    id: Number(row.id || 0),
    title: String(row.title || ''),
    idea: String(row.idea || ''),
    seed: parseDbJson(row.seed, {}),
    review_model: parseDbJson(row.review_model, {}),
    diagnostics: parseDbJson(row.diagnostics, {}),
    model_id: row.model_id === null || row.model_id === undefined ? null : Number(row.model_id) || null,
    source: String(row.source || 'deep_draft'),
    created_at: String(row.created_at || ''),
    updated_at: String(row.updated_at || ''),
  }
}
function normalizeSettingEntityRecord(data: Partial<NovelSettingEntityRecord>, existing?: Partial<NovelSettingEntityRecord>): NovelSettingEntityRecord {
  const raw = { ...(existing?.payload_json || {}), ...(data.payload_json || {}), ...data }
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    entity_type: String(data.entity_type ?? existing?.entity_type ?? 'rule'),
    name: String(data.name ?? existing?.name ?? '未命名设定'),
    summary: String(data.summary ?? existing?.summary ?? ''),
    status: String(data.status ?? existing?.status ?? 'active'),
    visibility: String(data.visibility ?? existing?.visibility ?? 'public'),
    first_chapter_no: data.first_chapter_no ?? existing?.first_chapter_no ?? null,
    last_chapter_no: data.last_chapter_no ?? existing?.last_chapter_no ?? null,
    related_character_ids: toAnyArray(data.related_character_ids ?? existing?.related_character_ids).map(Number).filter(Boolean),
    related_chapter_ids: toAnyArray(data.related_chapter_ids ?? existing?.related_chapter_ids).map(Number).filter(Boolean),
    related_entity_ids: toAnyArray(data.related_entity_ids ?? existing?.related_entity_ids).map(Number).filter(Boolean),
    constraints_json: toJsonable(data.constraints_json ?? existing?.constraints_json, {}),
    state_json: toJsonable(data.state_json ?? existing?.state_json, {}),
    payload_json: raw,
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}
function normalizeChapterSettingUsageRecord(data: Partial<NovelChapterSettingUsageRecord>, existing?: Partial<NovelChapterSettingUsageRecord>): NovelChapterSettingUsageRecord {
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    chapter_id: Number(data.chapter_id ?? existing?.chapter_id ?? 0),
    entity_id: Number(data.entity_id ?? existing?.entity_id ?? 0),
    usage_type: String(data.usage_type ?? existing?.usage_type ?? (data.forbidden ? 'forbidden' : data.required ? 'required' : 'allowed')),
    required: Boolean(data.required ?? existing?.required ?? false),
    allowed: data.allowed ?? existing?.allowed ?? true,
    forbidden: Boolean(data.forbidden ?? existing?.forbidden ?? false),
    reveal_level: String(data.reveal_level ?? existing?.reveal_level ?? 'none'),
    expected_state_change: toJsonable(data.expected_state_change ?? existing?.expected_state_change, {}),
    actual_state_change: toJsonable(data.actual_state_change ?? existing?.actual_state_change, {}),
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    updated_at: String(data.updated_at ?? nowIso()),
  }
}
function dedupById<T extends { id: number | string }>(items: T[]): T[] {
  const seen = new Set<number | string>()
  return items.filter(item => {
    const key = item.id
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export type NovelPipelineSnapshot = {
  project: NovelProjectRecord
  chapters: NovelChapterRecord[]
  outlines: NovelOutlineRecord[]
  worldbuilding: NovelWorldbuildingRecord[]
  characters: NovelCharacterRecord[]
  reviews: NovelReviewRecord[]
  runs: NovelRunRecord[]
}

const NOVEL_PIPELINE_CHAPTER_REVIEW_TYPES = ['prose_quality', 'editor_report', 'editor_revision'] as const
const NOVEL_PIPELINE_GOVERNANCE_REVIEW_TYPES = [
  'longform_production_repair_audit',
  'book_review',
  'quality_benchmark',
  'delivery_risk_convergence',
] as const
const NOVEL_PIPELINE_BATCH_RUN_TYPES = ['chapter_group_generation', 'batch_generate_prose'] as const
const NOVEL_PIPELINE_REPAIR_RUN_TYPES = ['longform_production_repair', 'release_repair_queue'] as const
const NOVEL_PIPELINE_GOVERNANCE_RUN_TYPES = [
  'longform_creation_diagnosis',
  'longform_pressure_test',
  'quality_benchmark',
  'book_review',
  'regression_benchmark',
  'first30_retention_diagnosis',
] as const

export async function getNovelPipelineSnapshot(activeWorkspace: string, projectId: number): Promise<NovelPipelineSnapshot | null> {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const projectRow = db.query(`
      SELECT id, title, synopsis, reference_config, updated_at
      FROM projects
      WHERE id = ?
      LIMIT 1
    `).get(projectId) as any
    if (!projectRow) return null

    const chapters = (db.query(`
      SELECT
        id,
        project_id,
        chapter_no,
        title,
        chapter_goal,
        chapter_summary,
        conflict,
        ending_hook,
        CASE
          WHEN length(trim(
            COALESCE(chapter_text, ''),
            char(9) || char(10) || char(11) || char(12) || char(13) || char(32) || char(160) || char(5760)
              || char(8192) || char(8193) || char(8194) || char(8195) || char(8196) || char(8197)
              || char(8198) || char(8199) || char(8200) || char(8201) || char(8202) || char(8232)
              || char(8233) || char(8239) || char(8287) || char(12288) || char(65279)
          )) = 0 THEN ''
          WHEN instr(chapter_text, '【占位正文】') > 0 THEN '【占位正文】'
          ELSE '[pipeline-prose-present]'
        END AS chapter_text,
        CASE
          WHEN json_valid(raw_payload) THEN json_object(
            'scene_cards', json_extract(raw_payload, '$.scene_cards'),
            'scenes', json_extract(raw_payload, '$.scenes'),
            'pre_draft_brief', json_extract(raw_payload, '$.pre_draft_brief')
          )
          ELSE '{}'
        END AS raw_payload,
        updated_at
      FROM chapters
      WHERE project_id = ?
      ORDER BY chapter_no ASC
    `).all(projectId) as any[]).map(chapterFromRow)

    const targetChapter = chapters.find(chapter => !chapter.chapter_text || chapter.chapter_text.includes('【占位正文】'))
      || chapters[chapters.length - 1]
      || null
    const targetChapterNo = Number(targetChapter?.chapter_no || 0)
    const chapterWindow = chapters
      .filter(chapter => Math.abs(Number(chapter.chapter_no || 0) - targetChapterNo) <= 1)
      .map(chapter => Number(chapter.id || 0))
      .filter(Boolean)
      .slice(0, 3)
    while (chapterWindow.length < 3) chapterWindow.push(0)

    const outlines = (db.query(`
      SELECT
        id,
        project_id,
        title,
        CASE
          WHEN json_valid(raw_payload) THEN json_object(
            'chapter_no', json_extract(raw_payload, '$.chapter_no'),
            'future100', json_object('chapter_no', json_extract(raw_payload, '$.future100.chapter_no')),
            'skeleton', json_object('chapter_no', json_extract(raw_payload, '$.skeleton.chapter_no')),
            'rollingPlan', json_object('chapter_no', json_extract(raw_payload, '$.rollingPlan.chapter_no'))
          )
          ELSE '{}'
        END AS raw_payload
      FROM outlines
      WHERE project_id = ?
    `).all(projectId) as any[]).map(outlineFromRow)

    const worldbuilding = (db.query(`
      SELECT id, project_id, world_summary, rules, systems
      FROM worldbuilding
      WHERE project_id = ?
    `).all(projectId) as any[]).map(worldbuildingFromRow)

    const characters = (db.query(`
      SELECT id, project_id, name, goal, motivation, current_state
      FROM characters
      WHERE project_id = ?
    `).all(projectId) as any[]).map(characterFromRow)

    const chapterReviewPlaceholders = NOVEL_PIPELINE_CHAPTER_REVIEW_TYPES.map(() => '?').join(', ')
    const governanceReviewPlaceholders = NOVEL_PIPELINE_GOVERNANCE_REVIEW_TYPES.map(() => '?').join(', ')
    const chapterReviews = (db.query(`
      WITH chapter_review_index AS MATERIALIZED (
        SELECT
          id,
          review_type,
          created_at,
          CASE WHEN json_valid(payload) THEN CAST(json_extract(payload, '$.chapter_id') AS INTEGER) END AS chapter_id,
          CASE WHEN json_valid(payload) THEN CAST(json_extract(payload, '$.chapter_no') AS INTEGER) END AS chapter_no
        FROM reviews
        WHERE project_id = ?
          AND review_type IN (${chapterReviewPlaceholders})
      ), ranked_chapter_reviews AS (
        SELECT
          id,
          review_type,
          created_at,
          chapter_id,
          chapter_no,
          ROW_NUMBER() OVER (
            PARTITION BY review_type, chapter_id
            ORDER BY created_at DESC, id DESC
          ) AS pipeline_rank
        FROM chapter_review_index
        WHERE chapter_id IN (?, ?, ?)
      ), chapter_review_winners AS (
        SELECT id, chapter_id, chapter_no
        FROM ranked_chapter_reviews
        WHERE pipeline_rank = 1
      )
      SELECT
        review.id,
        review.project_id,
        winner.chapter_id,
        winner.chapter_no,
        review.review_type,
        review.status,
        '' AS summary,
        '[]' AS issues,
        review.payload,
        review.created_at
      FROM chapter_review_winners AS winner
      JOIN reviews AS review ON review.id = winner.id
    `).all(
      projectId,
      ...NOVEL_PIPELINE_CHAPTER_REVIEW_TYPES,
      ...chapterWindow,
    ) as any[]).map(reviewFromRow)
    const governanceReviews = (db.query(`
      SELECT
        -MIN(id) AS id,
        project_id,
        review_type,
        MAX(created_at) AS created_at
      FROM reviews
      WHERE project_id = ? AND review_type IN (${governanceReviewPlaceholders})
      GROUP BY project_id, review_type
    `).all(projectId, ...NOVEL_PIPELINE_GOVERNANCE_REVIEW_TYPES) as any[]).map(row => reviewFromRow({
      ...row,
      status: 'ok',
      summary: '',
      issues: '[]',
      payload: '',
    }))
    const reviews = [...chapterReviews, ...governanceReviews]

    const batchRunPlaceholders = NOVEL_PIPELINE_BATCH_RUN_TYPES.map(() => '?').join(', ')
    const repairRunPlaceholders = NOVEL_PIPELINE_REPAIR_RUN_TYPES.map(() => '?').join(', ')
    const governanceRunPlaceholders = NOVEL_PIPELINE_GOVERNANCE_RUN_TYPES.map(() => '?').join(', ')
    const batchSemanticRows = db.query(`
      WITH batch_run_semantics AS MATERIALIZED (
        SELECT
          run.id,
          run.project_id,
          run.run_type,
          LOWER(run.status) AS status_norm,
          run.created_at,
          CASE WHEN EXISTS (
            SELECT 1
            FROM json_each(CASE WHEN json_valid(run.output_ref) THEN run.output_ref ELSE '{}' END, '$.chapters') AS chapter_result
            WHERE LOWER(COALESCE(json_extract(chapter_result.value, '$.status'), '')) IN ('failed', 'error', 'blocked', 'needs_repair')
          ) THEN 1 ELSE 0 END AS has_chapter_failure
        FROM runs AS run
        WHERE run.project_id = ? AND run.run_type IN (${batchRunPlaceholders})
      )
      SELECT
        -MIN(id) AS id,
        project_id,
        run_type,
        MAX(created_at) AS created_at,
        SUM(CASE
          WHEN status_norm IN ('completed', 'complete', 'success', 'succeeded', 'done', 'ok') AND has_chapter_failure = 0 THEN 1
          ELSE 0
        END) AS successful_run_count,
        SUM(CASE
          WHEN status_norm IN ('failed', 'error', 'blocked', 'cancelled') OR has_chapter_failure = 1 THEN 1
          ELSE 0
        END) AS failed_run_count,
        SUM(CASE
          WHEN status_norm IN ('queued', 'ready', 'running', 'paused', 'pending', 'needs_approval') THEN 1
          ELSE 0
        END) AS active_run_count
      FROM batch_run_semantics
      GROUP BY project_id, run_type
    `).all(projectId, ...NOVEL_PIPELINE_BATCH_RUN_TYPES) as any[]
    const batchRows: NovelRunRecord[] = []
    for (const row of batchSemanticRows) {
      const shared = {
        project_id: Number(row.project_id || projectId),
        run_type: String(row.run_type || ''),
        input_ref: '',
        output_ref: '',
        created_at: String(row.created_at || ''),
        pipeline_open_task_count: 0,
      }
      const successfulCount = Math.max(0, Number(row.successful_run_count || 0))
      const failedCount = Math.max(0, Number(row.failed_run_count || 0))
      const activeCount = Math.max(0, Number(row.active_run_count || 0))
      if (successfulCount) batchRows.push({
        ...shared,
        id: Number(row.id || 0),
        step_name: 'pipeline-completed-batch',
        status: 'completed',
        pipeline_run_count: successfulCount,
        pipeline_chapter_failure_count: 0,
      })
      if (failedCount) batchRows.push({
        ...shared,
        id: Number(row.id || 0) - 1,
        step_name: 'pipeline-failed-batch',
        status: 'failed',
        pipeline_run_count: failedCount,
        pipeline_chapter_failure_count: 1,
      })
      if (activeCount) batchRows.push({
        ...shared,
        id: Number(row.id || 0) - 2,
        step_name: 'pipeline-active-batch',
        status: 'paused',
        pipeline_run_count: activeCount,
        pipeline_chapter_failure_count: 0,
      })
    }

    const repairSemanticRows = db.query(`
      WITH repair_run_semantics AS MATERIALIZED (
        SELECT
          run.id,
          run.project_id,
          run.run_type,
          LOWER(run.status) AS status_norm,
          run.created_at,
          COALESCE(json_array_length(CASE WHEN json_valid(run.output_ref) THEN run.output_ref ELSE '{}' END, '$.tasks'), 0)
            + COALESCE(json_array_length(CASE WHEN json_valid(run.output_ref) THEN run.output_ref ELSE '{}' END, '$.repair_tasks'), 0)
            + COALESCE(json_array_length(CASE WHEN json_valid(run.input_ref) THEN run.input_ref ELSE '{}' END, '$.tasks'), 0)
            + COALESCE(json_array_length(CASE WHEN json_valid(run.input_ref) THEN run.input_ref ELSE '{}' END, '$.repair_tasks'), 0)
            AS task_count,
          (
            SELECT COUNT(*)
            FROM (
              SELECT value FROM json_each(CASE WHEN json_valid(run.output_ref) THEN run.output_ref ELSE '{}' END, '$.tasks')
              UNION ALL
              SELECT value FROM json_each(CASE WHEN json_valid(run.output_ref) THEN run.output_ref ELSE '{}' END, '$.repair_tasks')
              UNION ALL
              SELECT value FROM json_each(CASE WHEN json_valid(run.input_ref) THEN run.input_ref ELSE '{}' END, '$.tasks')
              UNION ALL
              SELECT value FROM json_each(CASE WHEN json_valid(run.input_ref) THEN run.input_ref ELSE '{}' END, '$.repair_tasks')
            ) AS repair_task
            WHERE LOWER(COALESCE(
              CASE WHEN json_valid(repair_task.value) THEN json_extract(repair_task.value, '$.task_status') END,
              CASE WHEN json_valid(repair_task.value) THEN json_extract(repair_task.value, '$.taskStatus') END,
              CASE WHEN json_valid(repair_task.value) THEN json_extract(repair_task.value, '$.status') END,
              ''
            )) NOT IN ('resolved', 'closed', 'completed', 'complete', 'done', 'success', 'ok')
          ) AS open_task_count
        FROM runs AS run
        WHERE run.project_id = ? AND run.run_type IN (${repairRunPlaceholders})
      )
      SELECT
        -MIN(id) AS id,
        project_id,
        run_type,
        MAX(created_at) AS created_at,
        SUM(open_task_count) AS open_task_count,
        SUM(CASE WHEN status_norm IN ('failed', 'error', 'blocked', 'cancelled') THEN 1 ELSE 0 END) AS failed_run_count,
        SUM(CASE WHEN status_norm IN ('queued', 'ready', 'running', 'paused', 'pending', 'needs_approval') THEN 1 ELSE 0 END) AS active_run_count,
        SUM(CASE
          WHEN status_norm NOT IN (
            'completed', 'complete', 'success', 'succeeded', 'done', 'ok',
            'failed', 'error', 'blocked', 'cancelled',
            'queued', 'ready', 'running', 'paused', 'pending', 'needs_approval'
          ) AND task_count = 0 THEN 1
          ELSE 0
        END) AS incomplete_run_count
      FROM repair_run_semantics
      GROUP BY project_id, run_type
    `).all(projectId, ...NOVEL_PIPELINE_REPAIR_RUN_TYPES) as any[]
    const repairRows: NovelRunRecord[] = []
    for (const row of repairSemanticRows) {
      const shared = {
        project_id: Number(row.project_id || projectId),
        run_type: String(row.run_type || ''),
        input_ref: '',
        output_ref: '',
        created_at: String(row.created_at || ''),
        pipeline_chapter_failure_count: 0,
      }
      const failedCount = Math.max(0, Number(row.failed_run_count || 0))
      const activeCount = Math.max(0, Number(row.active_run_count || 0))
      const incompleteCount = Math.max(0, Number(row.incomplete_run_count || 0))
      const openTaskCount = Math.max(0, Number(row.open_task_count || 0))
      if (failedCount) repairRows.push({
        ...shared,
        id: Number(row.id || 0),
        step_name: 'pipeline-failed-repair',
        status: 'failed',
        pipeline_run_count: failedCount,
        pipeline_open_task_count: 0,
      })
      if (activeCount) repairRows.push({
        ...shared,
        id: Number(row.id || 0) - 1,
        step_name: 'pipeline-active-repair',
        status: 'paused',
        pipeline_run_count: activeCount,
        pipeline_open_task_count: 0,
      })
      if (incompleteCount) repairRows.push({
        ...shared,
        id: Number(row.id || 0) - 2,
        step_name: 'pipeline-incomplete-repair',
        status: 'pending',
        pipeline_run_count: incompleteCount,
        pipeline_open_task_count: 0,
      })
      if (openTaskCount) repairRows.push({
        ...shared,
        id: Number(row.id || 0) - 3,
        step_name: 'pipeline-open-repair',
        status: 'completed',
        pipeline_run_count: 1,
        pipeline_open_task_count: openTaskCount,
      })
    }

    const governanceRows = db.query(`
      WITH governance_run_index AS (
        SELECT
          id,
          project_id,
          run_type,
          step_name,
          status,
          created_at
        FROM runs
        WHERE project_id = ?
          AND run_type IN (${governanceRunPlaceholders})
          AND LOWER(status) IN ('completed', 'complete', 'success', 'succeeded', 'done', 'ok')
      ), ranked_governance_runs AS (
        SELECT
          id,
          project_id,
          run_type,
          step_name,
          status,
          created_at,
          ROW_NUMBER() OVER (PARTITION BY run_type ORDER BY created_at DESC, id DESC) AS pipeline_rank
        FROM governance_run_index
      )
      SELECT id, project_id, run_type, step_name, status, created_at
      FROM ranked_governance_runs
      WHERE pipeline_rank = 1
    `).all(
      projectId,
      ...NOVEL_PIPELINE_GOVERNANCE_RUN_TYPES,
    ) as any[]
    const governanceRuns: NovelRunRecord[] = governanceRows.map(row => ({
      ...row,
      input_ref: '',
      output_ref: '',
      pipeline_run_count: 1,
      pipeline_chapter_failure_count: 0,
      pipeline_open_task_count: 0,
    }))
    const runs = [...batchRows.filter(row => Number(row.pipeline_run_count || 0) > 0), ...repairRows, ...governanceRuns]

    return {
      project: projectFromRow(projectRow),
      chapters: dedupById(chapters).sort((a, b) => a.chapter_no - b.chapter_no),
      outlines: dedupById(outlines),
      worldbuilding: dedupById(worldbuilding),
      characters: dedupById(characters),
      reviews,
      runs: runs.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    }
  } finally {
    db.close()
  }
}

export async function listNovelProjects(activeWorkspace: string) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return dedupById((db.query('SELECT * FROM projects ORDER BY updated_at DESC').all() as any[]).map(projectFromRow))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  } finally {
    db.close()
  }
}
export async function createNovelProject(activeWorkspace: string, data: Partial<NovelProjectRecord>) { return mutateNovelStore(activeWorkspace, store => { const project = normalizeProjectRecord(data, { id: store.projects.reduce((max, item) => Math.max(max, item.id), 0) + 1 }); store.projects.push(project); return project }) }
export async function getNovelProject(activeWorkspace: string, id: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const row = db.query('SELECT * FROM projects WHERE id = ? LIMIT 1').get(id) as any
    return row ? projectFromRow(row) : null
  } finally {
    db.close()
  }
}
export async function updateNovelProject(activeWorkspace: string, id: number, data: Partial<NovelProjectRecord>) { return mutateNovelStore(activeWorkspace, store => { const idx = store.projects.findIndex(item => item.id === id); if (idx < 0) return null; const current = store.projects[idx]; const updated = normalizeProjectRecord(data, { ...current, id, updated_at: nowIso() }); store.projects[idx] = { ...current, ...updated, updated_at: nowIso() }; return store.projects[idx] }) }
export async function listNovelWorldbuilding(activeWorkspace: string, projectId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return dedupById((db.query('SELECT * FROM worldbuilding WHERE project_id = ?').all(projectId) as any[]).map(worldbuildingFromRow))
  } finally {
    db.close()
  }
}
export async function createNovelWorldbuilding(activeWorkspace: string, data: Partial<NovelWorldbuildingRecord>) { return mutateNovelStore(activeWorkspace, store => { const record = normalizeWorldbuildingRecord(data, { id: store.worldbuilding.reduce((max, item) => Math.max(max, item.id), 0) + 1 }); store.worldbuilding.push(record); return record }) }
export async function updateNovelWorldbuilding(activeWorkspace: string, id: number, data: Partial<NovelWorldbuildingRecord>) { return mutateNovelStore(activeWorkspace, store => { const idx = store.worldbuilding.findIndex(item => item.id === id); if (idx < 0) return null; const current = store.worldbuilding[idx]; store.worldbuilding[idx] = normalizeWorldbuildingRecord(data, current); return store.worldbuilding[idx] }) }
export async function listNovelCharacters(activeWorkspace: string, projectId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return dedupById((db.query('SELECT * FROM characters WHERE project_id = ?').all(projectId) as any[]).map(characterFromRow))
  } finally {
    db.close()
  }
}
export async function createNovelCharacter(activeWorkspace: string, data: Partial<NovelCharacterRecord>) { return mutateNovelStore(activeWorkspace, store => { const record = normalizeCharacterRecord(data, { id: store.characters.reduce((max, item) => Math.max(max, item.id), 0) + 1 }); store.characters.push(record); return record }) }
export async function updateNovelCharacter(activeWorkspace: string, id: number, data: Partial<NovelCharacterRecord>) { return mutateNovelStore(activeWorkspace, store => { const idx = store.characters.findIndex(item => item.id === id); if (idx < 0) return null; const current = store.characters[idx]; store.characters[idx] = normalizeCharacterRecord(data, current); return store.characters[idx] }) }
export async function listNovelSettingEntities(activeWorkspace: string, projectId: number, entityType?: string) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const rows = entityType
      ? db.query('SELECT * FROM setting_entities WHERE project_id = ? AND entity_type = ?').all(projectId, entityType) as any[]
      : db.query('SELECT * FROM setting_entities WHERE project_id = ?').all(projectId) as any[]
    return dedupById(rows.map(settingEntityFromRow))
      .sort((a, b) => String(a.entity_type || '').localeCompare(String(b.entity_type || '')) || String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN'))
  } finally {
    db.close()
  }
}
export async function createNovelSettingEntity(activeWorkspace: string, data: Partial<NovelSettingEntityRecord>) { return mutateNovelStore(activeWorkspace, store => { const record = normalizeSettingEntityRecord(data, { id: store.setting_entities.reduce((max, item) => Math.max(max, item.id), 0) + 1 }); store.setting_entities.push(record); return record }) }
export async function updateNovelSettingEntity(activeWorkspace: string, id: number, data: Partial<NovelSettingEntityRecord>) { return mutateNovelStore(activeWorkspace, store => { const idx = store.setting_entities.findIndex(item => item.id === id); if (idx < 0) return null; const current = store.setting_entities[idx]; store.setting_entities[idx] = normalizeSettingEntityRecord(data, current); return store.setting_entities[idx] }) }
export async function deleteNovelSettingEntity(activeWorkspace: string, id: number) { return mutateNovelStore(activeWorkspace, store => { const entity = store.setting_entities.find(item => item.id === id); if (!entity) return false; store.setting_entities = store.setting_entities.filter(item => item.id !== id); store.chapter_setting_usage = store.chapter_setting_usage.filter(item => item.entity_id !== id); return true }) }
export async function listNovelChapterSettingUsage(activeWorkspace: string, projectId: number, chapterId?: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const rows = chapterId
      ? db.query('SELECT * FROM chapter_setting_usage WHERE project_id = ? AND chapter_id = ? ORDER BY updated_at DESC').all(projectId, chapterId) as any[]
      : db.query('SELECT * FROM chapter_setting_usage WHERE project_id = ? ORDER BY updated_at DESC').all(projectId) as any[]
    return dedupById(rows.map(chapterSettingUsageFromRow))
  } finally {
    db.close()
  }
}
export async function replaceNovelChapterSettingUsage(activeWorkspace: string, projectId: number, chapterId: number, usage: Partial<NovelChapterSettingUsageRecord>[]) { return mutateNovelStore(activeWorkspace, store => { store.chapter_setting_usage = store.chapter_setting_usage.filter(item => !(item.project_id === projectId && item.chapter_id === chapterId)); let nextId = store.chapter_setting_usage.reduce((max, item) => Math.max(max, item.id), 0) + 1; const records = usage.map(item => normalizeChapterSettingUsageRecord({ ...item, project_id: projectId, chapter_id: chapterId }, { id: nextId++ })).filter(item => item.entity_id > 0); store.chapter_setting_usage.push(...records); return records }) }
export async function updateNovelChapterSettingUsage(activeWorkspace: string, id: number, data: Partial<NovelChapterSettingUsageRecord>) { return mutateNovelStore(activeWorkspace, store => { const idx = store.chapter_setting_usage.findIndex(item => item.id === id); if (idx < 0) return null; const current = store.chapter_setting_usage[idx]; store.chapter_setting_usage[idx] = normalizeChapterSettingUsageRecord(data, current); return store.chapter_setting_usage[idx] }) }
export async function listNovelOutlines(activeWorkspace: string, projectId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return dedupById((db.query('SELECT * FROM outlines WHERE project_id = ?').all(projectId) as any[]).map(outlineFromRow))
  } finally {
    db.close()
  }
}
export async function createNovelOutline(activeWorkspace: string, data: Partial<NovelOutlineRecord>) { return mutateNovelStore(activeWorkspace, store => { const record = normalizeOutlineRecord(data, { id: store.outlines.reduce((max, item) => Math.max(max, item.id), 0) + 1 }); store.outlines.push(record); return record }) }
export async function updateNovelOutline(activeWorkspace: string, id: number, data: Partial<NovelOutlineRecord>) { return mutateNovelStore(activeWorkspace, store => { const idx = store.outlines.findIndex(item => item.id === id); if (idx < 0) return null; const current = store.outlines[idx]; store.outlines[idx] = normalizeOutlineRecord(data, current); return store.outlines[idx] }) }
export async function listNovelChapters(activeWorkspace: string, projectId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return dedupById((db.query('SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_no ASC').all(projectId) as any[]).map(chapterFromRow))
      .sort((a, b) => a.chapter_no - b.chapter_no)
  } finally {
    db.close()
  }
}
export async function createNovelChapter(activeWorkspace: string, data: Partial<NovelChapterRecord>) { return mutateNovelStore(activeWorkspace, store => { const record = normalizeChapterRecord(data, { id: store.chapters.reduce((max, item) => Math.max(max, item.id), 0) + 1 }); store.chapters.push(record); return record }) }
export async function upsertNovelChapterByNumber(activeWorkspace: string, data: Partial<NovelChapterRecord>) {
  return mutateNovelStore(activeWorkspace, store => {
    const projectId = Number(data.project_id || 0)
    const chapterNo = Number(data.chapter_no || 0)
    const index = store.chapters.findIndex(item => item.project_id === projectId && Number(item.chapter_no) === chapterNo)
    if (index >= 0) {
      const current = store.chapters[index]
      const updated = normalizeChapterRecord(data, { ...current, id: current.id, updated_at: nowIso() })
      store.chapters[index] = { ...current, ...updated, updated_at: nowIso() }
      return store.chapters[index]
    }
    const record = normalizeChapterRecord(data, { id: store.chapters.reduce((max, item) => Math.max(max, item.id), 0) + 1 })
    store.chapters.push(record)
    return record
  })
}
function outlineChapterNo(outline: Partial<NovelOutlineRecord>) {
  const raw = outline.raw_payload || {}
  const rawNo = Number((raw as any).chapter_no || (raw as any).chapterNo || (raw as any).future100?.chapter_no || (raw as any).rollingPlan?.chapter_no || 0)
  if (rawNo) return rawNo
  const match = String(outline.title || '').match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : 0
}
function cleanChapterPlanTitle(chapterNo: number, title: any) {
  const text = String(title || '').trim()
  if (!text) return `第${chapterNo}章`
  return text
    .replace(new RegExp(`^第\\s*${chapterNo}\\s*章[\\s:：、-]*`), '')
    .replace(/^第\s*\d+\s*章[\s:：、-]*/, '')
    .trim() || `第${chapterNo}章`
}
function chapterPlanOutlineTitle(chapterNo: number, title: any) {
  const cleanTitle = cleanChapterPlanTitle(chapterNo, title)
  return cleanTitle === `第${chapterNo}章` ? cleanTitle : `第${chapterNo}章 ${cleanTitle}`
}
function chapterPlanOutlineSummary(data: Partial<NovelChapterRecord>) {
  return [
    data.chapter_goal ? `目标：${data.chapter_goal}` : '',
    data.chapter_summary ? `摘要：${data.chapter_summary}` : '',
  ].filter(Boolean).join('\n')
}
export async function syncNovelChapterPlanByNumber(activeWorkspace: string, data: Partial<NovelChapterRecord>, options: {
  parent_id?: number | null
  source?: string
} = {}) {
  return mutateNovelStore(activeWorkspace, store => {
  const projectId = Number(data.project_id || 0)
  const chapterNo = Number(data.chapter_no || 0)
  if (!projectId || !chapterNo) return null
  const cleanTitle = cleanChapterPlanTitle(chapterNo, data.title)
  const existingChapters = store.chapters.filter(item => item.project_id === projectId)
  const existingChapter = existingChapters.find(item => Number(item.chapter_no) === chapterNo)
  const outlines = store.outlines.filter(item => item.project_id === projectId)
  const preferredOutlineId = Number(data.outline_id || existingChapter?.outline_id || 0)
  const existingOutline = outlines.find(outline => Number(outline.id) === preferredOutlineId && String(outline.outline_type || '') === 'chapter')
    || outlines
      .filter(outline => String(outline.outline_type || '') === 'chapter' && outlineChapterNo(outline) === chapterNo)
      .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')) || Number(b.id || 0) - Number(a.id || 0))[0]
    || null
  const source = options.source || (data.raw_payload as any)?.source || (data.raw_payload as any)?.agent_sync?.source || 'chapter_plan'
  const outlineData: Partial<NovelOutlineRecord> = {
    project_id: projectId,
    outline_type: 'chapter',
    parent_id: options.parent_id ?? existingOutline?.parent_id ?? null,
    title: chapterPlanOutlineTitle(chapterNo, cleanTitle),
    summary: chapterPlanOutlineSummary(data),
    conflict_points: data.conflict ? [String(data.conflict)] : [],
    turning_points: toAnyArray((data.raw_payload as any)?.must_advance ?? (data.raw_payload as any)?.rollingPlan?.payoff ?? []),
    hook: String(data.ending_hook || ''),
    raw_payload: {
      ...(existingOutline?.raw_payload || {}),
      ...(data.raw_payload || {}),
      source,
      chapter_no: chapterNo,
      synced_from_chapter_plan_at: nowIso(),
    },
  }
  let outline: NovelOutlineRecord
  if (existingOutline?.id) {
    const outlineIndex = store.outlines.findIndex(item => item.id === existingOutline.id)
    store.outlines[outlineIndex] = normalizeOutlineRecord(outlineData, store.outlines[outlineIndex])
    outline = store.outlines[outlineIndex]
  } else {
    outline = normalizeOutlineRecord(outlineData, { id: store.outlines.reduce((max, item) => Math.max(max, item.id), 0) + 1 })
    store.outlines.push(outline)
  }
  if (!outline) return null
  const chapterData = {
    ...data,
    project_id: projectId,
    outline_id: outline.id,
    chapter_no: chapterNo,
    title: cleanTitle,
    raw_payload: {
      ...(data.raw_payload || {}),
      source,
      chapter_outline_id: outline.id,
      chapter_no: chapterNo,
    },
  } as Partial<NovelChapterRecord>
  const chapterIndex = store.chapters.findIndex(item => item.project_id === projectId && Number(item.chapter_no) === chapterNo)
  let chapter: NovelChapterRecord
  if (chapterIndex >= 0) {
    const current = store.chapters[chapterIndex]
    const updated = normalizeChapterRecord(chapterData, { ...current, id: current.id, updated_at: nowIso() })
    store.chapters[chapterIndex] = { ...current, ...updated, updated_at: nowIso() }
    chapter = store.chapters[chapterIndex]
  } else {
    chapter = normalizeChapterRecord(chapterData, { id: store.chapters.reduce((max, item) => Math.max(max, item.id), 0) + 1 })
    store.chapters.push(chapter)
  }
    return { outline, chapter }
  })
}
type UpdateNovelChapterOptions = { createVersion?: boolean; versionSource?: NovelChapterVersionSource; forceVersion?: boolean }
export type NovelChapterAcceptanceUpdate = {
  id?: number
  name?: string
  entity_id?: number
  entityId?: number
  entity_type?: string
  entityType?: string
  patch?: Record<string, any>
}
export type NovelChapterAcceptanceInput = {
  chapter_id: number
  chapter_patch: Partial<NovelChapterRecord>
  version_source?: NovelChapterVersionSource
  project_patch?: Partial<NovelProjectRecord>
  next_reference_config?: NovelReferenceConfig
  worldbuilding_creates?: Partial<NovelWorldbuildingRecord>[]
  character_creates?: Partial<NovelCharacterRecord>[]
  setting_creates?: Partial<NovelSettingEntityRecord>[]
  chapter_setting_usage_replacement?: Array<Partial<NovelChapterSettingUsageRecord> & { entity_name?: string; entity_type?: string }>
  character_updates?: NovelChapterAcceptanceUpdate[]
  setting_updates?: NovelChapterAcceptanceUpdate[]
  usage_updates?: NovelChapterAcceptanceUpdate[]
  reviews?: Partial<NovelReviewRecord>[]
}
function versionedChapterSnapshotChanged(current: NovelChapterRecord, next: NovelChapterRecord) {
  return (
    String(current.chapter_text || '') !== String(next.chapter_text || '') ||
    jsonText(current.scene_breakdown || []) !== jsonText(next.scene_breakdown || []) ||
    jsonText(current.continuity_notes || []) !== jsonText(next.continuity_notes || [])
  )
}
function createChapterVersionRecord(store: NovelStore, data: Partial<NovelChapterVersionRecord>): NovelChapterVersionRecord { return { id: store.chapter_versions.reduce((max, item) => Math.max(max, item.id), 0) + 1, chapter_id: Number(data.chapter_id || 0), project_id: Number(data.project_id || 0), version_no: Number(data.version_no || 1), chapter_text: String(data.chapter_text || ''), scene_breakdown: toAnyArray(data.scene_breakdown), continuity_notes: toStringArray(data.continuity_notes), source: data.source || 'manual_edit', created_at: String(data.created_at || nowIso()) } }
export async function appendChapterVersion(activeWorkspace: string, data: Partial<NovelChapterVersionRecord>) { return mutateNovelStore(activeWorkspace, store => { const record = createChapterVersionRecord(store, data); store.chapter_versions.push(record); return record }) }
export async function listChapterVersions(activeWorkspace: string, chapterId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return (db.query('SELECT * FROM chapter_versions WHERE chapter_id = ? ORDER BY created_at DESC').all(chapterId) as any[])
      .map(chapterVersionFromRow)
      .sort((a, b) => b.version_no - a.version_no)
  } finally {
    db.close()
  }
}
export async function rollbackChapterVersion(activeWorkspace: string, chapterId: number, versionId: number) { return mutateNovelStore(activeWorkspace, store => { const idx = store.chapters.findIndex(item => item.id === chapterId); const version = store.chapter_versions.find(item => item.id === versionId && item.chapter_id === chapterId); if (idx < 0 || !version) return null; const current = store.chapters[idx]; store.chapter_versions.push(createChapterVersionRecord(store, { chapter_id: current.id, project_id: current.project_id, version_no: store.chapter_versions.filter(v => v.chapter_id === current.id).length + 1, chapter_text: current.chapter_text || '', scene_breakdown: current.scene_breakdown || [], continuity_notes: current.continuity_notes || [], source: 'rollback' })); store.chapters[idx] = { ...current, chapter_text: version.chapter_text, scene_breakdown: version.scene_breakdown || [], continuity_notes: version.continuity_notes || [], updated_at: nowIso() }; return store.chapters[idx] }) }
export async function updateNovelChapter(activeWorkspace: string, chapterId: number, data: Partial<NovelChapterRecord>, options: UpdateNovelChapterOptions = {}) { return mutateNovelStore(activeWorkspace, store => { const idx = store.chapters.findIndex(item => item.id === chapterId); if (idx < 0) return null; const current = store.chapters[idx]; const updated = normalizeChapterRecord(data, { ...current, id: current.id, updated_at: nowIso() }); const next = { ...current, ...updated, updated_at: nowIso() }; const shouldCreateVersion = options.createVersion !== false && (options.forceVersion || versionedChapterSnapshotChanged(current, next)); if (shouldCreateVersion) store.chapter_versions.push(createChapterVersionRecord(store, { chapter_id: current.id, project_id: current.project_id, version_no: store.chapter_versions.filter(v => v.chapter_id === current.id).length + 1, chapter_text: current.chapter_text || '', scene_breakdown: current.scene_breakdown || [], continuity_notes: current.continuity_notes || [], source: options.versionSource || 'manual_edit' })); store.chapters[idx] = next; return store.chapters[idx] }) }
export async function mergeNovelChapterRawPayload(activeWorkspace: string, chapterId: number, patch: Record<string, any>) {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
  const db = openDb(activeWorkspace)
  let committed = false
  try {
    ensureSqliteSchema(db)
    db.exec('BEGIN IMMEDIATE')
    const row = db.query('SELECT raw_payload FROM chapters WHERE id=?').get(chapterId) as any
    if (!row) {
      db.exec('COMMIT')
      committed = true
      return null
    }
    const parsed = parseDbJson(row.raw_payload, {})
    const current = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? { ...parsed } : {}
    const sanitized = sanitizeJsonValue(patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {}) as Record<string, any>
    for (const key of NESTED_STORAGE_KEYS) {
      delete current[key]
      delete sanitized[key]
    }
    const merged = compactRawPayloadForStorage({ ...current, ...sanitized })
    for (const key of NESTED_STORAGE_KEYS) delete merged[key]
    db.query('UPDATE chapters SET raw_payload=?, updated_at=? WHERE id=?').run(jsonText(merged, {}), nowIso(), chapterId)
    db.exec('COMMIT')
    committed = true
    return merged
  } catch (error) {
    if (!committed) {
      try { db.exec('ROLLBACK') } catch { /* transaction may already be closed */ }
    }
    throw error
  } finally {
    db.close()
  }
  })
}
function changedAcceptanceRecords<T extends { id: number }>(before: T[], after: T[]) {
  const beforeById = new Map(before.map(record => [record.id, record]))
  return after.filter(record => safeJsonText(beforeById.get(record.id)) !== safeJsonText(record))
}
function removedAcceptanceRecordIds<T extends { id: number }>(before: T[], after: T[]) {
  const afterIds = new Set(after.map(record => record.id))
  return before.filter(record => !afterIds.has(record.id)).map(record => record.id)
}
function persistNovelChapterAcceptanceDelta(db: Database, before: NovelStore, after: NovelStore) {
  const run = (sql: string, params: any[]) => db.query(sql).run(...params)
  for (const p of changedAcceptanceRecords(before.projects, after.projects)) {
    run(`UPDATE projects SET title=?,genre=?,sub_genres=?,synopsis=?,length_target=?,target_audience=?,style_tags=?,commercial_tags=?,reference_config=?,status=?,created_at=?,updated_at=? WHERE id=?`, [
      p.title,p.genre||'',jsonText(p.sub_genres),p.synopsis||'',p.length_target||'medium',p.target_audience||'',jsonText(p.style_tags),jsonText(p.commercial_tags),jsonText(p.reference_config, {}),p.status||'draft',p.created_at||nowIso(),p.updated_at||nowIso(),p.id,
    ])
  }
  for (const w of changedAcceptanceRecords(before.worldbuilding, after.worldbuilding)) {
    run(`INSERT INTO worldbuilding (id,project_id,world_summary,rules,factions,locations,systems,items,timeline_anchor,known_unknowns,version,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id,world_summary=excluded.world_summary,rules=excluded.rules,factions=excluded.factions,locations=excluded.locations,systems=excluded.systems,items=excluded.items,timeline_anchor=excluded.timeline_anchor,known_unknowns=excluded.known_unknowns,version=excluded.version,raw_payload=excluded.raw_payload,created_at=excluded.created_at,updated_at=excluded.updated_at`, [
      w.id,w.project_id,w.world_summary||'',jsonText(w.rules),jsonText(w.factions),jsonText(w.locations),jsonText(w.systems),jsonText(w.items),textValue(w.timeline_anchor),jsonText(w.known_unknowns),w.version||1,jsonText(w.raw_payload || w, {}),w.created_at||nowIso(),w.updated_at||nowIso(),
    ])
  }
  for (const c of changedAcceptanceRecords(before.characters, after.characters)) {
    run(`INSERT INTO characters (id,project_id,name,role,role_type,archetype,personality,motivation,goal,conflict,abilities,backstory,relationships,relationship_graph,growth_arc,arc_hint,current_state,secret,appearance,status,version,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id,name=excluded.name,role=excluded.role,role_type=excluded.role_type,archetype=excluded.archetype,personality=excluded.personality,motivation=excluded.motivation,goal=excluded.goal,conflict=excluded.conflict,abilities=excluded.abilities,backstory=excluded.backstory,relationships=excluded.relationships,relationship_graph=excluded.relationship_graph,growth_arc=excluded.growth_arc,arc_hint=excluded.arc_hint,current_state=excluded.current_state,secret=excluded.secret,appearance=excluded.appearance,status=excluded.status,version=excluded.version,raw_payload=excluded.raw_payload,created_at=excluded.created_at,updated_at=excluded.updated_at`, [
      c.id,c.project_id,c.name,c.role||'',c.role_type||c.role||'',c.archetype||'',jsonText(c.personality),c.motivation||'',c.goal||'',c.conflict||'',jsonText(c.abilities),c.backstory||'',jsonText(c.relationships),jsonText(c.relationship_graph, {}),c.growth_arc||'',c.arc_hint||'',jsonText(c.current_state, {}),c.secret||'',c.appearance||'',c.status||'active',c.version||1,jsonText(c.raw_payload || c, {}),c.created_at||c.updated_at||nowIso(),c.updated_at||nowIso(),
    ])
  }
  for (const c of changedAcceptanceRecords(before.chapters, after.chapters)) {
    run(`UPDATE chapters SET project_id=?,outline_id=?,chapter_no=?,title=?,chapter_goal=?,chapter_summary=?,conflict=?,ending_hook=?,chapter_text=?,scene_breakdown=?,scene_list=?,continuity_notes=?,items_in_play=?,foreshadowing=?,timeline_note=?,status=?,version=?,published_at=?,raw_payload=?,created_at=?,updated_at=? WHERE id=?`, [
      c.project_id,c.outline_id ?? null,c.chapter_no,c.title,c.chapter_goal||'',c.chapter_summary||'',c.conflict||'',c.ending_hook||'',c.chapter_text||'',jsonText(c.scene_breakdown),jsonText(c.scene_list || c.scene_breakdown),jsonText(c.continuity_notes),jsonText(c.items_in_play),jsonText(c.foreshadowing),c.timeline_note||'',c.status||'draft',c.version||1,c.published_at||null,jsonText(c.raw_payload || c, {}),c.created_at||nowIso(),c.updated_at||nowIso(),c.id,
    ])
  }
  for (const v of changedAcceptanceRecords(before.chapter_versions, after.chapter_versions)) {
    run('INSERT INTO chapter_versions (id,chapter_id,project_id,version_no,chapter_text,scene_breakdown,continuity_notes,source,created_at) VALUES (?,?,?,?,?,?,?,?,?)', [
      v.id,v.chapter_id,v.project_id,v.version_no,v.chapter_text||'',jsonText(v.scene_breakdown||[]),jsonText(v.continuity_notes||[]),v.source||'manual_edit',v.created_at||nowIso(),
    ])
  }
  for (const r of changedAcceptanceRecords(before.reviews, after.reviews)) {
    run('INSERT INTO reviews (id,project_id,review_type,status,summary,issues,payload,created_at) VALUES (?,?,?,?,?,?,?,?)', [
      r.id,r.project_id,r.review_type,r.status,r.summary||'',jsonText(r.issues||[]),r.payload||'',r.created_at||nowIso(),
    ])
  }
  for (const s of changedAcceptanceRecords(before.setting_entities, after.setting_entities)) {
    run(`INSERT INTO setting_entities (id,project_id,entity_type,name,summary,status,visibility,first_chapter_no,last_chapter_no,related_character_ids,related_chapter_ids,related_entity_ids,constraints_json,state_json,payload_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id,entity_type=excluded.entity_type,name=excluded.name,summary=excluded.summary,status=excluded.status,visibility=excluded.visibility,first_chapter_no=excluded.first_chapter_no,last_chapter_no=excluded.last_chapter_no,related_character_ids=excluded.related_character_ids,related_chapter_ids=excluded.related_chapter_ids,related_entity_ids=excluded.related_entity_ids,constraints_json=excluded.constraints_json,state_json=excluded.state_json,payload_json=excluded.payload_json,created_at=excluded.created_at,updated_at=excluded.updated_at`, [
      s.id,s.project_id,s.entity_type||'rule',s.name,s.summary||'',s.status||'active',s.visibility||'public',s.first_chapter_no ?? null,s.last_chapter_no ?? null,jsonText(s.related_character_ids, []),jsonText(s.related_chapter_ids, []),jsonText(s.related_entity_ids, []),jsonText(s.constraints_json, {}),jsonText(s.state_json, {}),jsonText(s.payload_json || s, {}),s.created_at||nowIso(),s.updated_at||nowIso(),
    ])
  }
  for (const id of removedAcceptanceRecordIds(before.chapter_setting_usage, after.chapter_setting_usage)) {
    run('DELETE FROM chapter_setting_usage WHERE id=?', [id])
  }
  for (const u of changedAcceptanceRecords(before.chapter_setting_usage, after.chapter_setting_usage)) {
    run(`INSERT INTO chapter_setting_usage (id,project_id,chapter_id,entity_id,usage_type,required,allowed,forbidden,reveal_level,expected_state_change,actual_state_change,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id,chapter_id=excluded.chapter_id,entity_id=excluded.entity_id,usage_type=excluded.usage_type,required=excluded.required,allowed=excluded.allowed,forbidden=excluded.forbidden,reveal_level=excluded.reveal_level,expected_state_change=excluded.expected_state_change,actual_state_change=excluded.actual_state_change,created_at=excluded.created_at,updated_at=excluded.updated_at`, [
      u.id,u.project_id,u.chapter_id,u.entity_id,u.usage_type||'allowed',u.required ? 1 : 0,u.allowed === false ? 0 : 1,u.forbidden ? 1 : 0,u.reveal_level||'none',jsonText(u.expected_state_change, {}),jsonText(u.actual_state_change, {}),u.created_at||nowIso(),u.updated_at||nowIso(),
    ])
  }
}
export async function commitNovelChapterAcceptance(activeWorkspace: string, input: NovelChapterAcceptanceInput) {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
  await importLegacyNovelStoreIfNeeded(activeWorkspace)
  const db = openDb(activeWorkspace)
  let committed = false
  try {
  ensureSqliteSchema(db)
  db.exec('BEGIN IMMEDIATE')
  const store = loadStoreFromOpenDb(db)
  const beforeStore = structuredClone(store)
  const chapterIndex = store.chapters.findIndex(item => item.id === Number(input.chapter_id || 0))
  if (chapterIndex < 0) throw new Error(`chapter reference not found: ${input.chapter_id}`)
  const currentChapter = store.chapters[chapterIndex]
  const projectIndex = store.projects.findIndex(item => item.id === currentChapter.project_id)
  if (projectIndex < 0) throw new Error(`project reference not found: ${currentChapter.project_id}`)
  const currentProject = store.projects[projectIndex]
  const validateImmutablePatchReferences = (
    patch: any,
    references: Array<[key: string, expected: number]>,
    label: string,
    index?: number,
  ) => {
    for (const [key, expected] of references) {
      if (Object.prototype.hasOwnProperty.call(patch || {}, key) && Number(patch[key]) !== expected) {
        throw new Error(`${label} immutable ${key} reference invalid${index === undefined ? '' : ` at index ${index}`}`)
      }
    }
  }
  validateImmutablePatchReferences(input.chapter_patch, [
    ['id', currentChapter.id],
    ['project_id', currentProject.id],
  ], 'chapter patch')
  validateImmutablePatchReferences(input.project_patch, [['id', currentProject.id]], 'project patch')
  const temporaryEntityIds = new Map<number, number>()
  const validateCreateProject = (record: any, label: string, index: number) => {
    if (record?.project_id !== undefined && Number(record.project_id) !== currentProject.id) {
      throw new Error(`${label} project reference invalid at index ${index}`)
    }
  }
  let nextWorldbuildingId = store.worldbuilding.reduce((max, item) => Math.max(max, item.id), 0) + 1
  for (const [index, create] of (input.worldbuilding_creates || []).entries()) {
    validateCreateProject(create, 'worldbuilding create', index)
    const requestedId = Number(create?.id || 0)
    if (requestedId > 0 && store.worldbuilding.some(item => item.id === requestedId)) throw new Error(`worldbuilding id conflict at index ${index}`)
    const id = requestedId > 0 ? requestedId : nextWorldbuildingId++
    nextWorldbuildingId = Math.max(nextWorldbuildingId, id + 1)
    if (requestedId < 0) temporaryEntityIds.set(requestedId, id)
    store.worldbuilding.push(normalizeWorldbuildingRecord({ ...create, project_id: currentProject.id }, { id }))
  }
  let nextCharacterId = store.characters.reduce((max, item) => Math.max(max, item.id), 0) + 1
  for (const [index, create] of (input.character_creates || []).entries()) {
    validateCreateProject(create, 'character create', index)
    const name = String(create?.name || '').trim()
    if (!name || store.characters.some(item => item.project_id === currentProject.id && item.name === name)) throw new Error(`character create reference conflict at index ${index}`)
    const requestedId = Number(create?.id || 0)
    if (requestedId > 0 && store.characters.some(item => item.id === requestedId)) throw new Error(`character id conflict at index ${index}`)
    const id = requestedId > 0 ? requestedId : nextCharacterId++
    nextCharacterId = Math.max(nextCharacterId, id + 1)
    if (requestedId < 0) temporaryEntityIds.set(requestedId, id)
    store.characters.push(normalizeCharacterRecord({ ...create, project_id: currentProject.id }, { id }))
  }
  let nextSettingId = store.setting_entities.reduce((max, item) => Math.max(max, item.id), 0) + 1
  for (const [index, create] of (input.setting_creates || []).entries()) {
    validateCreateProject(create, 'setting create', index)
    const name = String(create?.name || '').trim()
    const entityType = String(create?.entity_type || 'rule')
    if (!name || store.setting_entities.some(item => item.project_id === currentProject.id && item.name === name && item.entity_type === entityType)) throw new Error(`setting create reference conflict at index ${index}`)
    const requestedId = Number(create?.id || 0)
    if (requestedId > 0 && store.setting_entities.some(item => item.id === requestedId)) throw new Error(`setting id conflict at index ${index}`)
    const id = requestedId > 0 ? requestedId : nextSettingId++
    nextSettingId = Math.max(nextSettingId, id + 1)
    if (requestedId < 0) temporaryEntityIds.set(requestedId, id)
    store.setting_entities.push(normalizeSettingEntityRecord({ ...create, project_id: currentProject.id }, { id }))
  }

  const resolveUniqueRecordIndex = (matches: number[], label: string, index: number) => {
    if (matches.length === 0) throw new Error(`${label} not found at index ${index}`)
    if (matches.length > 1) throw new Error(`${label} ambiguous at index ${index}`)
    return matches[0]
  }
  const resolveSettingReference = (reference: any, label: string, index: number) => {
    const requestedId = Number(reference?.entity_id || reference?.entityId || reference?.id || 0)
    const id = temporaryEntityIds.get(requestedId) || requestedId
    const name = String(reference?.entity_name || reference?.name || '').trim()
    const entityType = String(reference?.entity_type || reference?.entityType || '').trim()
    const hasIdReference = id > 0
    const hasNameReference = Boolean(name)
    if (!hasIdReference && !hasNameReference) throw new Error(`${label} not found at index ${index}`)
    const idRecordIndex = hasIdReference
      ? resolveUniqueRecordIndex(store.setting_entities
          .map((item, recordIndex) => item.project_id === currentProject.id && item.id === id ? recordIndex : -1)
          .filter(recordIndex => recordIndex >= 0), label, index)
      : null
    const nameRecordIndex = hasNameReference
      ? resolveUniqueRecordIndex(store.setting_entities
          .map((item, recordIndex) => item.project_id === currentProject.id && item.name === name && (!entityType || item.entity_type === entityType) ? recordIndex : -1)
          .filter(recordIndex => recordIndex >= 0), label, index)
      : null
    if (idRecordIndex !== null && nameRecordIndex !== null && idRecordIndex !== nameRecordIndex) {
      throw new Error(`${label} inconsistent at index ${index}`)
    }
    const recordIndex = (idRecordIndex ?? nameRecordIndex) as number
    return { recordIndex, entityId: store.setting_entities[recordIndex].id }
  }

  const resolveCharacterReference = (reference: any, label: string, index: number) => {
    const requestedId = Number(reference?.id || 0)
    const id = temporaryEntityIds.get(requestedId) || requestedId
    const name = String(reference?.name || '').trim()
    const hasIdReference = id > 0
    const hasNameReference = Boolean(name)
    if (!hasIdReference && !hasNameReference) throw new Error(`${label} not found at index ${index}`)
    const idRecordIndex = hasIdReference
      ? resolveUniqueRecordIndex(store.characters
          .map((item, recordIndex) => item.project_id === currentProject.id && item.id === id ? recordIndex : -1)
          .filter(recordIndex => recordIndex >= 0), label, index)
      : null
    const nameRecordIndex = hasNameReference
      ? resolveUniqueRecordIndex(store.characters
          .map((item, recordIndex) => item.project_id === currentProject.id && item.name === name ? recordIndex : -1)
          .filter(recordIndex => recordIndex >= 0), label, index)
      : null
    if (idRecordIndex !== null && nameRecordIndex !== null && idRecordIndex !== nameRecordIndex) {
      throw new Error(`${label} inconsistent at index ${index}`)
    }
    return (idRecordIndex ?? nameRecordIndex) as number
  }

  const characterChanges = (input.character_updates || []).map((update, index) => {
    const recordIndex = resolveCharacterReference(update, 'character update reference', index)
    const current = store.characters[recordIndex]
    validateImmutablePatchReferences(update.patch, [
      ['id', current.id],
      ['project_id', currentProject.id],
    ], 'character update patch', index)
    return { recordIndex, patch: update.patch || {} }
  })
  const settingChanges = (input.setting_updates || []).map((update, index) => {
    const { recordIndex } = resolveSettingReference(update, 'setting update reference', index)
    const current = store.setting_entities[recordIndex]
    validateImmutablePatchReferences(update.patch, [
      ['id', current.id],
      ['project_id', currentProject.id],
    ], 'setting update patch', index)
    return { recordIndex, patch: update.patch || {} }
  })
  const replacementUsage = input.chapter_setting_usage_replacement === undefined ? null : input.chapter_setting_usage_replacement.map((usage, index) => {
    const { entityId } = resolveSettingReference(usage, 'usage replacement entity reference', index)
    return { ...usage, entity_id: entityId }
  })
  if (replacementUsage) {
    const seenReplacementEntities = new Set<number>()
    for (const [index, usage] of replacementUsage.entries()) {
      if (seenReplacementEntities.has(usage.entity_id)) throw new Error(`usage replacement entity reference ambiguous at index ${index}`)
      seenReplacementEntities.add(usage.entity_id)
    }
    store.chapter_setting_usage = store.chapter_setting_usage.filter(item => !(item.project_id === currentProject.id && item.chapter_id === currentChapter.id))
    let nextUsageId = store.chapter_setting_usage.reduce((max, item) => Math.max(max, item.id), 0) + 1
    store.chapter_setting_usage.push(...replacementUsage.map(usage => normalizeChapterSettingUsageRecord({
      ...usage,
      id: nextUsageId++,
      project_id: currentProject.id,
      chapter_id: currentChapter.id,
    })))
  }
  const usageChanges = (input.usage_updates || []).map((update, index) => {
    const id = Number(update?.id || 0)
    const hasEntityReference = Number(update?.entity_id || update?.entityId || 0) !== 0 || Boolean(String(update?.name || '').trim())
    if (replacementUsage && !hasEntityReference) throw new Error(`usage update reference not found at index ${index}`)
    const idRecordIndex = id > 0
      ? resolveUniqueRecordIndex(store.chapter_setting_usage
          .map((item, recordIndex) => item.project_id === currentProject.id && item.chapter_id === currentChapter.id && item.id === id ? recordIndex : -1)
          .filter(recordIndex => recordIndex >= 0), 'usage update reference', index)
      : null
    const entityId = hasEntityReference
      ? resolveSettingReference(update, 'usage update reference', index).entityId
      : 0
    const entityRecordIndex = entityId > 0
      ? resolveUniqueRecordIndex(store.chapter_setting_usage
          .map((item, recordIndex) => item.project_id === currentProject.id && item.chapter_id === currentChapter.id && item.entity_id === entityId ? recordIndex : -1)
          .filter(recordIndex => recordIndex >= 0), 'usage update reference', index)
      : null
    if (idRecordIndex !== null && entityRecordIndex !== null && idRecordIndex !== entityRecordIndex) {
      throw new Error(`usage update reference inconsistent at index ${index}`)
    }
    const recordIndex = idRecordIndex ?? entityRecordIndex
    if (recordIndex === null) throw new Error(`usage update reference not found at index ${index}`)
    const current = store.chapter_setting_usage[recordIndex]
    validateImmutablePatchReferences(update.patch, [
      ['id', current.id],
      ['project_id', currentProject.id],
      ['chapter_id', currentChapter.id],
      ['entity_id', current.entity_id],
    ], 'usage update patch', index)
    return { recordIndex, patch: update.patch || {} }
  })
  for (const [index, review] of (input.reviews || []).entries()) {
    if (review.project_id !== undefined && Number(review.project_id) !== currentProject.id) {
      throw new Error(`review project reference invalid at index ${index}`)
    }
  }

  const updatedChapter = normalizeChapterRecord(input.chapter_patch || {}, { ...currentChapter, id: currentChapter.id, updated_at: nowIso() })
  const nextChapter = { ...currentChapter, ...updatedChapter, updated_at: nowIso() }
  if (versionedChapterSnapshotChanged(currentChapter, nextChapter)) {
    store.chapter_versions.push(createChapterVersionRecord(store, {
      chapter_id: currentChapter.id,
      project_id: currentChapter.project_id,
      version_no: store.chapter_versions.filter(version => version.chapter_id === currentChapter.id).length + 1,
      chapter_text: currentChapter.chapter_text || '',
      scene_breakdown: currentChapter.scene_breakdown || [],
      continuity_notes: currentChapter.continuity_notes || [],
      source: input.version_source || 'manual_edit',
    }))
  }
  store.chapters[chapterIndex] = nextChapter

  const projectPatch = {
    ...(input.project_patch || {}),
    ...(input.next_reference_config === undefined ? {} : { reference_config: input.next_reference_config }),
  }
  if (Object.keys(projectPatch).length > 0) {
    const normalizedProject = normalizeProjectRecord(projectPatch, { ...currentProject, id: currentProject.id, updated_at: nowIso() })
    store.projects[projectIndex] = { ...currentProject, ...normalizedProject, updated_at: nowIso() }
  }
  for (const change of characterChanges) {
    const current = store.characters[change.recordIndex]
    const patch = change.patch.current_state === undefined ? change.patch : {
      ...change.patch,
      current_state: { ...(current.current_state || {}), ...(change.patch.current_state || {}) },
    }
    store.characters[change.recordIndex] = normalizeCharacterRecord(patch, current)
  }
  for (const change of settingChanges) {
    const current = store.setting_entities[change.recordIndex]
    const patch = change.patch.state_json === undefined ? change.patch : {
      ...change.patch,
      state_json: { ...(current.state_json || {}), ...(change.patch.state_json || {}) },
    }
    store.setting_entities[change.recordIndex] = normalizeSettingEntityRecord(patch, current)
  }
  for (const change of usageChanges) {
    const current = store.chapter_setting_usage[change.recordIndex]
    const patch = change.patch.actual_state_change === undefined ? change.patch : {
      ...change.patch,
      actual_state_change: { ...(current.actual_state_change || {}), ...(change.patch.actual_state_change || {}) },
    }
    store.chapter_setting_usage[change.recordIndex] = normalizeChapterSettingUsageRecord(patch, current)
  }
  let nextReviewId = store.reviews.reduce((max, item) => Math.max(max, item.id), 0) + 1
  for (const review of input.reviews || []) {
    store.reviews.push(normalizeReviewRecord({ ...review, id: nextReviewId++, project_id: currentProject.id }))
  }

  persistNovelChapterAcceptanceDelta(db, beforeStore, store)
  db.exec('COMMIT')
  committed = true
  return { chapter: store.chapters[chapterIndex], project: store.projects[projectIndex] }
  } catch (error) {
    if (!committed) {
      try { db.exec('ROLLBACK') } catch { /* transaction may not have started */ }
    }
    throw error
  } finally {
    db.close()
  }
  }, 'acceptance')
}
export async function deleteNovelChapter(activeWorkspace: string, chapterId: number) { return mutateNovelStore(activeWorkspace, store => { const chapter = store.chapters.find(item => item.id === chapterId); if (!chapter) return false; store.chapters = store.chapters.filter(item => item.id !== chapterId); store.chapter_versions = store.chapter_versions.filter(item => item.chapter_id !== chapterId); return true }) }
export async function deleteNovelOutline(activeWorkspace: string, outlineId: number) { return mutateNovelStore(activeWorkspace, store => { const outline = store.outlines.find(item => item.id === outlineId); if (!outline) return false; store.outlines = store.outlines.filter(item => item.id !== outlineId); store.chapters = store.chapters.map(chapter => chapter.outline_id === outlineId ? { ...chapter, outline_id: null } : chapter); return true }) }
export async function deleteNovelProject(activeWorkspace: string, projectId: number) { return mutateNovelStore(activeWorkspace, store => { const project = store.projects.find(item => item.id === projectId); if (!project) return false; store.projects = store.projects.filter(item => item.id !== projectId); store.worldbuilding = store.worldbuilding.filter(item => item.project_id !== projectId); store.characters = store.characters.filter(item => item.project_id !== projectId); store.outlines = store.outlines.filter(item => item.project_id !== projectId); store.chapters = store.chapters.filter(item => item.project_id !== projectId); store.chapter_versions = store.chapter_versions.filter(item => item.project_id !== projectId); store.reviews = store.reviews.filter(item => item.project_id !== projectId); store.runs = store.runs.filter(item => item.project_id !== projectId); store.setting_entities = store.setting_entities.filter(item => item.project_id !== projectId); store.chapter_setting_usage = store.chapter_setting_usage.filter(item => item.project_id !== projectId); return true }) }
export async function listNovelReviews(activeWorkspace: string, projectId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return (db.query(`
      SELECT
        id,
        project_id,
        CASE WHEN json_valid(payload) THEN CAST(json_extract(payload, '$.chapter_id') AS INTEGER) END AS chapter_id,
        CASE WHEN json_valid(payload) THEN CAST(json_extract(payload, '$.chapter_no') AS INTEGER) END AS chapter_no,
        review_type,
        status,
        summary,
        issues,
        payload,
        created_at
      FROM reviews
      WHERE project_id = ?
    `).all(projectId) as any[]).map(reviewFromRow)
  } finally {
    db.close()
  }
}
export async function createNovelReview(activeWorkspace: string, data: Partial<NovelReviewRecord>) {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
  const record = normalizeReviewRecord(data)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const result = db.query('INSERT INTO reviews (project_id,review_type,status,summary,issues,payload,created_at) VALUES (?,?,?,?,?,?,?)').run(
      record.project_id,
      record.review_type,
      record.status,
      record.summary || '',
      jsonText(record.issues || []),
      record.payload || '',
      record.created_at,
    ) as any
    const id = Number(result?.lastInsertRowid || (db.query('SELECT last_insert_rowid() AS id').get() as any)?.id || 0)
    return { ...record, id }
  } finally {
    db.close()
  }
  })
}
export async function listNovelRuns(activeWorkspace: string, projectId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return (db.query('SELECT * FROM runs WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as NovelRunRecord[])
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  } finally {
    db.close()
  }
}
export async function appendNovelRun(activeWorkspace: string, data: Partial<NovelRunRecord>) {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
  const record = normalizeRunRecord(data)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const result = db.query('INSERT INTO runs (project_id,run_type,step_name,status,input_ref,output_ref,duration_ms,error_message,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(
      record.project_id,
      record.run_type,
      record.step_name,
      record.status,
      record.input_ref || '',
      record.output_ref || '',
      record.duration_ms || 0,
      record.error_message || '',
      record.created_at,
    ) as any
    const id = Number(result?.lastInsertRowid || (db.query('SELECT last_insert_rowid() AS id').get() as any)?.id || 0)
    return { ...record, id }
  } finally {
    db.close()
  }
  })
}
export async function updateNovelRun(activeWorkspace: string, id: number, data: Partial<NovelRunRecord>) { return mutateNovelStore(activeWorkspace, store => { const idx = store.runs.findIndex(item => item.id === id); if (idx < 0) return null; store.runs[idx] = normalizeRunRecord(data, store.runs[idx]); return store.runs[idx] }) }
export async function compactNovelStorage(activeWorkspace: string, options: { vacuum?: boolean; maxChars?: number } = {}) {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
  const maxChars = Number(options.maxChars || MAX_PERSISTED_DIAGNOSTIC_CHARS)
  const shouldVacuum = options.vacuum !== false
  const db = openDb(activeWorkspace)
  let scanned = 0
  let compacted = 0
  let committed = false
  const contextPattern = '%context_package%'
  const camelContextPattern = '%contextPackage%'
  try {
    ensureSqliteSchema(db)
    db.exec('BEGIN')

    const runRows = db.query(`
      SELECT id, input_ref, output_ref FROM runs
      WHERE length(coalesce(input_ref,'')) > ?
        OR length(coalesce(output_ref,'')) > ?
        OR input_ref LIKE ?
        OR output_ref LIKE ?
        OR input_ref LIKE ?
        OR output_ref LIKE ?
    `).all(maxChars, maxChars, contextPattern, contextPattern, camelContextPattern, camelContextPattern) as any[]
    const updateRun = db.query('UPDATE runs SET input_ref=?, output_ref=? WHERE id=?')
    for (const row of runRows) {
      scanned += 1
      const nextInput = compactPersistedText(row.input_ref || '', maxChars)
      const nextOutput = compactPersistedText(row.output_ref || '', maxChars)
      if (nextInput !== String(row.input_ref || '') || nextOutput !== String(row.output_ref || '')) {
        updateRun.run(nextInput, nextOutput, row.id)
        compacted += 1
      }
    }

    const reviewRows = db.query(`
      SELECT id, review_type, payload FROM reviews
      WHERE length(coalesce(payload,'')) > ?
        OR payload LIKE ?
        OR payload LIKE ?
    `).all(maxChars, contextPattern, camelContextPattern) as any[]
    const updateReview = db.query('UPDATE reviews SET payload=? WHERE id=?')
    for (const row of reviewRows) {
      scanned += 1
      const nextPayload = compactReviewPayloadText(row.payload || '', row.review_type || '', maxChars)
      if (nextPayload !== String(row.payload || '')) {
        updateReview.run(nextPayload, row.id)
        compacted += 1
      }
    }

    const chapterRows = db.query(`
      SELECT id, raw_payload FROM chapters
      WHERE length(coalesce(raw_payload,'')) > ?
        OR raw_payload LIKE ?
        OR raw_payload LIKE ?
    `).all(maxChars, contextPattern, camelContextPattern) as any[]
    const updateChapter = db.query('UPDATE chapters SET raw_payload=? WHERE id=?')
    for (const row of chapterRows) {
      scanned += 1
      const nextPayload = compactPersistedText(row.raw_payload || '{}', maxChars)
      if (nextPayload !== String(row.raw_payload || '')) {
        updateChapter.run(nextPayload, row.id)
        compacted += 1
      }
    }

    db.exec('COMMIT')
    committed = true
    if (shouldVacuum && compacted > 0) db.exec('VACUUM')
    return { scanned, compacted, vacuumed: shouldVacuum && compacted > 0, max_chars: maxChars }
  } catch (error) {
    if (!committed) {
      try { db.exec('ROLLBACK') } catch { /* transaction may already be closed */ }
    }
    throw error
  } finally {
    db.close()
  }
  })
}
export async function listNovelProjectSeedDrafts(activeWorkspace: string) {
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const rows = db.query('SELECT * FROM project_seed_drafts ORDER BY updated_at DESC, id DESC').all() as any[]
    return rows.map(projectSeedDraftFromRow)
  } finally {
    db.close()
  }
}
export async function createNovelProjectSeedDraft(activeWorkspace: string, data: Partial<NovelProjectSeedDraftRecord>) {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
  const draft = normalizeProjectSeedDraftRecord(data)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const result = db.query('INSERT INTO project_seed_drafts (title,idea,seed,review_model,diagnostics,model_id,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run(
      draft.title,
      draft.idea || '',
      jsonText(draft.seed, {}),
      jsonText(draft.review_model, {}),
      jsonText(draft.diagnostics, {}),
      draft.model_id ?? null,
      draft.source || 'deep_draft',
      draft.created_at,
      draft.updated_at,
    ) as any
    const id = Number(result?.lastInsertRowid || (db.query('SELECT last_insert_rowid() AS id').get() as any)?.id || 0)
    const row = db.query('SELECT * FROM project_seed_drafts WHERE id=?').get(id) as any
    return projectSeedDraftFromRow(row)
  } finally {
    db.close()
  }
  })
}
export async function deleteNovelProjectSeedDraft(activeWorkspace: string, id: number) {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const result = db.query('DELETE FROM project_seed_drafts WHERE id=?').run(id) as any
    return Number(result?.changes || 0) > 0
  } finally {
    db.close()
  }
  })
}
