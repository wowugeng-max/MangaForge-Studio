import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { Database } from 'bun:sqlite'
import { AsyncLocalStorage } from 'node:async_hooks'
import { getNovelMutationTestHook } from '../novel-test-support'
import type {
  NovelReferenceConfig,
  NovelProjectRecord,
  NovelWorldbuildingRecord,
  NovelCharacterRecord,
  NovelOutlineRecord,
  NovelChapterRecord,
  NovelChapterWorkspaceRecord,
  NovelChapterVersionSource,
  NovelChapterVersionRecord,
  NovelReviewRecord,
  NovelReviewSummaryRecord,
  NovelRunRecord,
  NovelRunSummaryRecord,
  NovelProjectSeedDraftRecord,
  NovelSettingEntityRecord,
  NovelChapterSettingUsageRecord,
  NovelStore,
  UpdateNovelChapterOptions,
  NovelChapterAcceptanceUpdate,
  NovelChapterAcceptanceInput,
  NovelPipelineSnapshot,
} from './types'

export type * from './types'


export function nowIso() { return new Date().toISOString() }
export function getNovelStorePath(activeWorkspace: string) { return join(activeWorkspace, 'novel-store.json') }
export function getNovelDbPath(activeWorkspace: string) { return join(activeWorkspace, 'novel.sqlite') }
export function toStringArray(value: any, fallback: string[] = []) { return Array.isArray(value) ? value.map(item => String(item)).filter(Boolean) : fallback }
export function toAnyArray(value: any, fallback: any[] = []) { return Array.isArray(value) ? value : fallback }
export function toJsonable(value: any, fallback: any = null) { return value === undefined ? fallback : value }
export function sanitizeJsonValue(value: any, seen = new WeakSet<object>(), depth = 0): any {
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
export function safeJsonText(value: any, space?: number) {
  try {
    const text = JSON.stringify(sanitizeJsonValue(value), null, space)
    return text === undefined ? 'null' : text
  } catch {
    return JSON.stringify(String(value ?? ''))
  }
}
export const MAX_PERSISTED_DIAGNOSTIC_CHARS = 60000
export const STORAGE_PREVIEW_CHARS = 4000
export const LARGE_DIAGNOSTIC_KEYS = new Set([
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
export const NESTED_STORAGE_KEYS = new Set(['raw_payload', 'rawPayload'])
export const SCENE_DIAGNOSTIC_KEYS = new Set([
  'scene_breakdown',
  'sceneBreakdown',
  'generated_scene_breakdown',
  'generatedSceneBreakdown',
  'scene_list',
  'sceneList',
  'scene_cards',
  'sceneCards',
])
export const PRE_DRAFT_BRIEF_KEYS = new Set([
  'pre_draft_brief',
  'preDraftBrief',
])
export const PRE_DRAFT_BRIEF_PRESERVED_CONTRACT_KEYS = new Set([
  'state_tracking_contract',
  'stateTrackingContract',
])
export const STATE_TRACKING_SOURCE_READINESS_KEYS = new Set([
  'source_readiness',
  'sourceReadiness',
])
export const STATE_TRACKING_SOURCE_READINESS_STORAGE_LIMIT = 24
export const CHAPTER_BLUEPRINT_KEYS = new Set([
  'chapter_blueprint',
  'chapterBlueprint',
])
export const CHAPTER_BLUEPRINT_CORE_KEYS = [
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
export const PRE_DRAFT_BRIEF_CORE_KEYS = [
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
export const SCENE_DIAGNOSTIC_TEXT_KEYS = [
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

export function storageOmitted(reason = 'storage_compaction', extra: Record<string, any> = {}) {
  return { omitted: true, reason, ...extra }
}

export function compactStorageText(value: any, limit = 360) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= limit) return text
  return `${text.slice(0, limit)}...`
}

export function compactStorageStringArray(value: any, limit = 180, maxItems = 6) {
  if (!Array.isArray(value)) return []
  return value.slice(0, maxItems).map(item => compactStorageText(item, limit)).filter(Boolean)
}

export function compactSceneDiagnosticForStorage(value: any) {
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

export function compactSceneDiagnosticsForStorage(value: any) {
  if (!Array.isArray(value)) return value
  const scenes = value.slice(0, 20).map(compactSceneDiagnosticForStorage)
  if (value.length > 20) scenes.push(storageOmitted('storage_compaction', { truncated: true, original_count: value.length - 20 }))
  return scenes
}

export function compactPreDraftBriefContractForStorage(value: any) {
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

export function isPreDraftBriefContractKey(key: string) {
  return key.toLowerCase().includes('contract')
}

export function compactChapterBlueprintForStorage(value: any) {
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

export function compactPreDraftBriefValueForStorage(value: any, key = '', seen = new WeakSet<object>(), depth = 0, parentKey = ''): any {
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

export function compactPreDraftBriefForStorage(value: any) {
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

export function compactContextPackageForStorage(value: any) {
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

export function compactJsonPayloadForStorage(value: any, key = '', seen = new WeakSet<object>(), depth = 0): any {
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

export function extractPersistedAdmissionSummary(value: any): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const chapter = value.chapter && typeof value.chapter === 'object' ? value.chapter : null
  const proseAdmission = value.prose_admission || value.proseAdmission
    || (chapter?.raw_payload && typeof chapter.raw_payload === 'object' ? chapter.raw_payload.prose_admission || chapter.raw_payload.proseAdmission : null)
    || null
  const admissionStatus = value.admission_status || value.admissionStatus
    || proseAdmission?.status || proseAdmission?.admission_status || proseAdmission?.admissionStatus || ''
  const summary: Record<string, any> = {}
  const chapterId = value.chapter_id ?? value.chapterId ?? chapter?.id
  const chapterNo = value.chapter_no ?? value.chapterNo ?? chapter?.chapter_no ?? chapter?.chapterNo
  if (chapterId !== undefined && chapterId !== null && chapterId !== '') summary.chapter_id = Number(chapterId) || chapterId
  if (chapterNo !== undefined && chapterNo !== null && chapterNo !== '') summary.chapter_no = Number(chapterNo) || chapterNo
  if (admissionStatus) summary.admission_status = String(admissionStatus)
  const qualityScore = value.quality_score ?? value.qualityScore ?? proseAdmission?.quality_score ?? proseAdmission?.qualityScore
  if (qualityScore !== undefined && qualityScore !== null && qualityScore !== '') summary.quality_score = qualityScore
  const qualityWarnings = value.quality_warnings || value.qualityWarnings || proseAdmission?.quality_warnings || proseAdmission?.qualityWarnings
  if (Array.isArray(qualityWarnings) && qualityWarnings.length) summary.quality_warnings = qualityWarnings.slice(0, 8)
  const storyStateStatus = value.story_state_status || value.storyStateStatus
    || proseAdmission?.story_state_status || proseAdmission?.storyStateStatus || ''
  if (storyStateStatus) summary.story_state_status = String(storyStateStatus)
  if (proseAdmission && typeof proseAdmission === 'object') {
    summary.prose_admission = {
      status: proseAdmission.status || proseAdmission.admission_status || proseAdmission.admissionStatus || admissionStatus || '',
      quality_score: proseAdmission.quality_score ?? proseAdmission.qualityScore ?? qualityScore ?? null,
      quality_warnings: Array.isArray(proseAdmission.quality_warnings || proseAdmission.qualityWarnings)
        ? (proseAdmission.quality_warnings || proseAdmission.qualityWarnings).slice(0, 8)
        : [],
      story_state_status: proseAdmission.story_state_status || proseAdmission.storyStateStatus || storyStateStatus || '',
    }
  }
  return summary
}

export function compactPersistedText(value: any, maxChars = MAX_PERSISTED_DIAGNOSTIC_CHARS) {
  const text = String(value ?? '')
  if (!text) return ''
  const trimmed = text.trim()
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed)
      const compacted = compactJsonPayloadForStorage(parsed)
      const compactedText = safeJsonText(compacted)
      if (compactedText.length <= maxChars) return compactedText
      // Keep admission/chapter identity at the top level so later UI can read it after storage truncation.
      return safeJsonText({
        ...extractPersistedAdmissionSummary(parsed),
        ...extractPersistedAdmissionSummary(compacted),
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

export function pipelineRunPayload(value: any) {
  if (!value) return {}
  if (typeof value === 'object') return value
  if (typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function pipelineRunArray(value: any): any[] {
  return Array.isArray(value) ? value : []
}

export function pipelineRunTaskStatus(task: any) {
  for (const key of ['task_status', 'taskStatus', 'status']) {
    const normalized = String(task?.[key] ?? '').trim().toLowerCase()
    if (normalized) return normalized
  }
  return ''
}

export function summarizeNovelRunPipelineRefs(inputRef: any, outputRef: any) {
  const input = pipelineRunPayload(inputRef)
  const output = pipelineRunPayload(outputRef)
  const chapterFailureCount = pipelineRunArray(output.chapters).filter((chapter: any) => {
    const status = String(chapter?.status || '').toLowerCase()
    return ['failed', 'error', 'blocked', 'needs_repair'].includes(status)
  }).length
  const tasks = [
    ...pipelineRunArray(output.tasks),
    ...pipelineRunArray(output.repair_tasks),
    ...pipelineRunArray(input.tasks),
    ...pipelineRunArray(input.repair_tasks),
  ]
  const openTaskCount = tasks.filter(task => {
    const status = pipelineRunTaskStatus(task)
    return !status || !['resolved', 'closed', 'completed', 'complete', 'done', 'success', 'ok'].includes(status)
  }).length
  return {
    pipeline_chapter_failure_count: chapterFailureCount,
    pipeline_open_task_count: openTaskCount,
    pipeline_task_count: tasks.length,
  }
}

export function backfillNovelRunPipelineSummaries(db: Database) {
  const selectNextId = db.query(`
    SELECT id
    FROM runs
    WHERE id > ?
      AND (
        pipeline_chapter_failure_count IS NULL
        OR pipeline_open_task_count IS NULL
        OR pipeline_task_count IS NULL
      )
    ORDER BY id ASC
    LIMIT 1
  `)
  const selectPayload = db.query('SELECT input_ref, output_ref FROM runs WHERE id = ?')
  const updateRow = db.query(`
    UPDATE runs
    SET pipeline_chapter_failure_count = ?, pipeline_open_task_count = ?, pipeline_task_count = ?
    WHERE id = ?
  `)
  let lastId = 0
  while (true) {
    const pending = selectNextId.get(lastId) as { id?: number } | null
    if (!pending?.id) return
    const id = Number(pending.id)
    lastId = id
    const row = selectPayload.get(id) as any
    if (!row) continue
    const summary = summarizeNovelRunPipelineRefs(row.input_ref, row.output_ref)
    updateRow.run(
      summary.pipeline_chapter_failure_count,
      summary.pipeline_open_task_count,
      summary.pipeline_task_count,
      id,
    )
  }
}

export function compactRawPayloadForStorage(value: any) {
  return compactJsonPayloadForStorage(value)
}

export function compactQualityIssueForStorage(value: any) {
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

export function compactQualityIssueArrayForStorage(value: any, maxItems = 12) {
  if (!Array.isArray(value)) return []
  const items = value.slice(0, maxItems).map(compactQualityIssueForStorage)
  if (value.length > maxItems) items.push(storageOmitted('storage_compaction', { truncated: true, original_count: value.length - maxItems }))
  return items
}

export function compactQualityStringListForStorage(value: any, maxItems = 12, limit = 360) {
  if (!Array.isArray(value)) return []
  const items = value.slice(0, maxItems).map(item => compactStorageText(item, limit)).filter(Boolean)
  if (value.length > maxItems) items.push(`...已省略 ${value.length - maxItems} 项`)
  return items
}

export function compactQualityReviewForStorage(review: any = {}) {
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

export function compactQualityContextForStorage(contextPackage: any = {}) {
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

export function compactQualityPipelineForStorage(value: any) {
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

export function compactProseQualityPayloadForStorage(value: any = {}) {
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

export function hasUnrecoverableStoragePreview(value: any) {
  if (!value?.truncated || typeof value.preview !== 'string') return false
  try {
    JSON.parse(value.preview)
    return false
  } catch {
    return true
  }
}

export function compactReviewPayloadText(value: any, reviewType = '', maxChars = MAX_PERSISTED_DIAGNOSTIC_CHARS) {
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

export function jsonText(value: any, fallback: any = []) { return safeJsonText(value === undefined ? fallback : value) }
export function textValue(value: any, fallback = '') { return value === undefined || value === null ? fallback : (typeof value === 'string' ? value : jsonText(value, fallback)) }
export function normalizeStore(store: Partial<NovelStore> | null | undefined): NovelStore { return { projects: Array.isArray(store?.projects) ? store!.projects : [], worldbuilding: Array.isArray(store?.worldbuilding) ? store!.worldbuilding : [], characters: Array.isArray(store?.characters) ? store!.characters : [], outlines: Array.isArray(store?.outlines) ? store!.outlines : [], chapters: Array.isArray(store?.chapters) ? store!.chapters : [], chapter_versions: Array.isArray(store?.chapter_versions) ? store!.chapter_versions : [], reviews: Array.isArray(store?.reviews) ? store!.reviews : [], runs: Array.isArray(store?.runs) ? store!.runs : [], setting_entities: Array.isArray(store?.setting_entities) ? store!.setting_entities : [], chapter_setting_usage: Array.isArray(store?.chapter_setting_usage) ? store!.chapter_setting_usage : [] } }
export async function readJsonStore(activeWorkspace: string): Promise<NovelStore> { try { return normalizeStore(JSON.parse(await readFile(getNovelStorePath(activeWorkspace), 'utf8')) as Partial<NovelStore>) } catch { return normalizeStore(null) } }
export function dbPathFromEnv() { const raw = process.env.SQLITE_DATABASE_URL || process.env.DATABASE_URL || ''; if (!raw) return ''; if (raw.startsWith('file:')) return raw.slice(5).split('?', 1)[0]; return raw }
export function boundedTimeout(value: any, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, Math.floor(parsed))) : fallback
}
export function sqliteBusyTimeoutMs() { return boundedTimeout(process.env.NOVEL_SQLITE_BUSY_TIMEOUT_MS, 5000, 25, 30000) }
export function mutationLockTimeoutMs() { return boundedTimeout(process.env.NOVEL_MUTATION_LOCK_TIMEOUT_MS, 15000, 25, 60000) }
export function openDb(activeWorkspace: string) {
  const db = new Database(dbPathFromEnv() || getNovelDbPath(activeWorkspace))
  db.exec(`PRAGMA busy_timeout = ${sqliteBusyTimeoutMs()}`)
  return db
}
export const novelMutationLocks = new Map<string, NovelMutationLock>()
export const novelMutationContext = new AsyncLocalStorage<Set<string>>()
export function novelMutationKey(activeWorkspace: string) { return dbPathFromEnv() || getNovelDbPath(activeWorkspace) }
export function releaseNovelMutationLock(key: string, lock: NovelMutationLock) {
  const next = lock.waiters.shift()
  if (next) {
    clearTimeout(next.timer)
    next.resolve(() => releaseNovelMutationLock(key, lock))
    return
  }
  lock.locked = false
  novelMutationLocks.delete(key)
}
export function acquireNovelMutationLock(key: string) {
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
export async function withNovelWorkspaceMutation<T>(activeWorkspace: string, mutation: () => Promise<T>, operation = 'mutation'): Promise<T> {
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
export function assertNovelWorkspaceMutationHeld(activeWorkspace: string) {
  if (!novelMutationContext.getStore()?.has(novelMutationKey(activeWorkspace))) {
    throw new Error('novel store write attempted outside workspace mutation lock')
  }
}
export function parseDbArray(value: any) { try { return value ? JSON.parse(String(value)) : [] } catch { return [] } }
export function parseDbJson(value: any, fallback: any = null) { try { return value ? JSON.parse(String(value)) : fallback } catch { return fallback } }
export function tableExists(db: Database, name: string) { return !!db.query("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name) }
export function hasColumn(db: Database, table: string, column: string) {
  return (db.query(`PRAGMA table_info(${table})`).all() as any[]).some(item => item.name === column)
}
export function addColumnIfMissing(db: Database, table: string, column: string, definition: string) {
  if (!hasColumn(db, table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}
export function ensureSqliteSchema(db: Database) {
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
  pipeline_chapter_failure_count INTEGER DEFAULT NULL,
  pipeline_open_task_count INTEGER DEFAULT NULL,
  pipeline_task_count INTEGER DEFAULT NULL,
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
    runs: [['pipeline_chapter_failure_count', 'INTEGER DEFAULT NULL'], ['pipeline_open_task_count', 'INTEGER DEFAULT NULL'], ['pipeline_task_count', 'INTEGER DEFAULT NULL']],
    project_seed_drafts: [['review_model', "TEXT DEFAULT '{}'"], ['diagnostics', "TEXT DEFAULT '{}'"], ['model_id', 'INTEGER DEFAULT NULL'], ['source', "TEXT DEFAULT 'deep_draft'"]],
    setting_entities: [['payload_json', "TEXT DEFAULT '{}'"], ['state_json', "TEXT DEFAULT '{}'"], ['constraints_json', "TEXT DEFAULT '{}'"]],
    chapter_setting_usage: [['expected_state_change', "TEXT DEFAULT '{}'"], ['actual_state_change', "TEXT DEFAULT '{}'"]],
  } as Record<string, Array<[string, string]>>)) {
    if (!tableExists(db, table)) continue
    for (const [column, definition] of columns) addColumnIfMissing(db, table, column, definition)
  }
  backfillNovelRunPipelineSummaries(db)
}
export function projectFromRow(item: any): NovelProjectRecord {
  return { ...item, sub_genres: parseDbArray(item.sub_genres), style_tags: parseDbArray(item.style_tags), commercial_tags: parseDbArray(item.commercial_tags), reference_config: parseDbJson(item.reference_config, {}) }
}
export function worldbuildingFromRow(item: any): NovelWorldbuildingRecord {
  return { ...item, rules: parseDbJson(item.rules, []), factions: parseDbArray(item.factions), locations: parseDbArray(item.locations), systems: parseDbJson(item.systems, []), items: parseDbArray(item.items), timeline_anchor: parseDbJson(item.timeline_anchor, item.timeline_anchor || ''), known_unknowns: parseDbArray(item.known_unknowns), raw_payload: parseDbJson(item.raw_payload, {}) }
}
export function characterFromRow(item: any): NovelCharacterRecord {
  return { ...item, personality: parseDbJson(item.personality, []), abilities: parseDbArray(item.abilities), relationships: parseDbJson(item.relationships, []), relationship_graph: parseDbJson(item.relationship_graph, {}), current_state: parseDbJson(item.current_state, {}), raw_payload: parseDbJson(item.raw_payload, {}) }
}
export function outlineFromRow(item: any): NovelOutlineRecord {
  return { ...item, beats: parseDbArray(item.beats), conflict_points: parseDbArray(item.conflict_points), turning_points: parseDbArray(item.turning_points), raw_payload: parseDbJson(item.raw_payload, {}) }
}
export function chapterFromRow(item: any): NovelChapterRecord {
  return { ...item, scene_breakdown: parseDbArray(item.scene_breakdown), scene_list: parseDbArray(item.scene_list), continuity_notes: parseDbArray(item.continuity_notes), items_in_play: parseDbArray(item.items_in_play), foreshadowing: parseDbJson(item.foreshadowing, []), raw_payload: parseDbJson(item.raw_payload, {}) }
}
export function chapterVersionFromRow(item: any): NovelChapterVersionRecord {
  return { ...item, scene_breakdown: parseDbArray(item.scene_breakdown), continuity_notes: parseDbArray(item.continuity_notes) }
}
export function reviewFromRow(item: any): NovelReviewRecord {
  return { ...item, issues: parseDbArray(item.issues), payload: item.payload || '' }
}
export function nullableSqliteBoolean(value: any) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['false', '0', 'no', 'failed', 'fail'].includes(normalized)) return false
    if (['true', '1', 'yes', 'passed', 'pass', 'ok'].includes(normalized)) return true
  }
  return Boolean(value)
}
export function reviewSummaryFromRow(item: any): NovelReviewSummaryRecord {
  return {
    ...item,
    chapter_id: item.chapter_id === null || item.chapter_id === undefined ? null : Number(item.chapter_id) || null,
    chapter_no: item.chapter_no === null || item.chapter_no === undefined ? null : Number(item.chapter_no) || null,
    issue_count: Number(item.issue_count || 0),
    preview: String(item.preview || ''),
    score: item.score === null || item.score === undefined || item.score === '' ? null : Number(item.score),
    passed: nullableSqliteBoolean(item.passed),
    payload_bytes: Number(item.payload_bytes || 0),
  }
}
export function runSummaryFromRow(item: any): NovelRunSummaryRecord {
  return {
    ...item,
    chapter_id: item.chapter_id === null || item.chapter_id === undefined ? null : Number(item.chapter_id) || null,
    chapter_no: item.chapter_no === null || item.chapter_no === undefined ? null : Number(item.chapter_no) || null,
    input_bytes: Number(item.input_bytes || 0),
    output_bytes: Number(item.output_bytes || 0),
    admission_status: String(item.admission_status || ''),
    admission_warning_count: Number(item.admission_warning_count || 0),
    admission_warning_preview: String(item.admission_warning_preview || ''),
    story_state_status: String(item.story_state_status || ''),
    story_state_pending: Boolean(item.story_state_pending),
    story_state_warning: String(item.story_state_warning || ''),
    post_commit_warning_count: Number(item.post_commit_warning_count || 0),
    post_commit_warning_preview: String(item.post_commit_warning_preview || ''),
  }
}
export function settingEntityFromRow(item: any): NovelSettingEntityRecord {
  return { ...item, related_character_ids: parseDbArray(item.related_character_ids).map(Number).filter(Boolean), related_chapter_ids: parseDbArray(item.related_chapter_ids).map(Number).filter(Boolean), related_entity_ids: parseDbArray(item.related_entity_ids).map(Number).filter(Boolean), constraints_json: parseDbJson(item.constraints_json, {}), state_json: parseDbJson(item.state_json, {}), payload_json: parseDbJson(item.payload_json, {}) }
}
export function chapterSettingUsageFromRow(item: any): NovelChapterSettingUsageRecord {
  return { ...item, required: Boolean(item.required), allowed: item.allowed !== 0, forbidden: Boolean(item.forbidden), expected_state_change: parseDbJson(item.expected_state_change, {}), actual_state_change: parseDbJson(item.actual_state_change, {}) }
}
export function loadStoreFromOpenDb(db: Database): NovelStore {
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
export function storeScore(store: NovelStore) { return Object.values(store).reduce((sum, value) => sum + (Array.isArray(value) ? value.length : 0), 0) }
export async function readStore(activeWorkspace: string): Promise<NovelStore> {
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
export async function ensureLegacyNovelStoreImportedForRead(activeWorkspace: string) {
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
export function replaceStoreInOpenDb(db: Database, store: NovelStore) {
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
    for (const rawRun of normalized.runs) {
      const r = normalizeRunRecord(rawRun)
      insert('INSERT INTO runs (id,project_id,run_type,step_name,status,input_ref,output_ref,duration_ms,error_message,pipeline_chapter_failure_count,pipeline_open_task_count,pipeline_task_count,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [r.id,r.project_id,r.run_type,r.step_name,r.status,r.input_ref||'',r.output_ref||'',r.duration_ms||0,r.error_message||'',r.pipeline_chapter_failure_count ?? 0,r.pipeline_open_task_count ?? 0,r.pipeline_task_count ?? 0,r.created_at||nowIso()])
    }
    for (const s of normalized.setting_entities) insert('INSERT INTO setting_entities (id,project_id,entity_type,name,summary,status,visibility,first_chapter_no,last_chapter_no,related_character_ids,related_chapter_ids,related_entity_ids,constraints_json,state_json,payload_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [s.id,s.project_id,s.entity_type||'rule',s.name,s.summary||'',s.status||'active',s.visibility||'public',s.first_chapter_no ?? null,s.last_chapter_no ?? null,jsonText(s.related_character_ids, []),jsonText(s.related_chapter_ids, []),jsonText(s.related_entity_ids, []),jsonText(s.constraints_json, {}),jsonText(s.state_json, {}),jsonText(s.payload_json || s, {}),s.created_at||nowIso(),s.updated_at||nowIso()])
  for (const u of normalized.chapter_setting_usage) insert('INSERT INTO chapter_setting_usage (id,project_id,chapter_id,entity_id,usage_type,required,allowed,forbidden,reveal_level,expected_state_change,actual_state_change,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [u.id,u.project_id,u.chapter_id,u.entity_id,u.usage_type||'allowed',u.required ? 1 : 0,u.allowed === false ? 0 : 1,u.forbidden ? 1 : 0,u.reveal_level||'none',jsonText(u.expected_state_change, {}),jsonText(u.actual_state_change, {}),u.created_at||nowIso(),u.updated_at||nowIso()])
}
export async function importLegacyNovelStoreIfNeeded(activeWorkspace: string, knownJsonStore?: NovelStore) {
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

export function nextTableId(db: Database, table: string): number {
  return Number((db.query(`SELECT COALESCE(MAX(id), 0) + 1 AS id FROM ${table}`).get() as any)?.id || 1)
}

export function insertProjectRow(db: Database, p: NovelProjectRecord) {
  db.query('INSERT INTO projects (id,title,genre,sub_genres,synopsis,length_target,target_audience,style_tags,commercial_tags,reference_config,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    p.id, p.title, p.genre || '', jsonText(p.sub_genres), p.synopsis || '', p.length_target || 'medium', p.target_audience || '', jsonText(p.style_tags), jsonText(p.commercial_tags), jsonText(p.reference_config, {}), p.status || 'draft', p.created_at || nowIso(), p.updated_at || nowIso(),
  )
}
export function updateProjectRow(db: Database, p: NovelProjectRecord) {
  db.query('UPDATE projects SET title=?,genre=?,sub_genres=?,synopsis=?,length_target=?,target_audience=?,style_tags=?,commercial_tags=?,reference_config=?,status=?,created_at=?,updated_at=? WHERE id=?').run(
    p.title, p.genre || '', jsonText(p.sub_genres), p.synopsis || '', p.length_target || 'medium', p.target_audience || '', jsonText(p.style_tags), jsonText(p.commercial_tags), jsonText(p.reference_config, {}), p.status || 'draft', p.created_at || nowIso(), p.updated_at || nowIso(), p.id,
  )
}
export function insertWorldbuildingRow(db: Database, w: NovelWorldbuildingRecord) {
  db.query('INSERT INTO worldbuilding (id,project_id,world_summary,rules,factions,locations,systems,items,timeline_anchor,known_unknowns,version,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    w.id, w.project_id, w.world_summary || '', jsonText(w.rules), jsonText(w.factions), jsonText(w.locations), jsonText(w.systems), jsonText(w.items), textValue(w.timeline_anchor), jsonText(w.known_unknowns), w.version || 1, jsonText(w.raw_payload || w, {}), w.created_at || nowIso(), w.updated_at || nowIso(),
  )
}
export function updateWorldbuildingRow(db: Database, w: NovelWorldbuildingRecord) {
  db.query('UPDATE worldbuilding SET project_id=?,world_summary=?,rules=?,factions=?,locations=?,systems=?,items=?,timeline_anchor=?,known_unknowns=?,version=?,raw_payload=?,created_at=?,updated_at=? WHERE id=?').run(
    w.project_id, w.world_summary || '', jsonText(w.rules), jsonText(w.factions), jsonText(w.locations), jsonText(w.systems), jsonText(w.items), textValue(w.timeline_anchor), jsonText(w.known_unknowns), w.version || 1, jsonText(w.raw_payload || w, {}), w.created_at || nowIso(), w.updated_at || nowIso(), w.id,
  )
}
export function insertCharacterRow(db: Database, c: NovelCharacterRecord) {
  db.query('INSERT INTO characters (id,project_id,name,role,role_type,archetype,personality,motivation,goal,conflict,abilities,backstory,relationships,relationship_graph,growth_arc,arc_hint,current_state,secret,appearance,status,version,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    c.id, c.project_id, c.name, c.role || '', c.role_type || c.role || '', c.archetype || '', jsonText(c.personality), c.motivation || '', c.goal || '', c.conflict || '', jsonText(c.abilities), c.backstory || '', jsonText(c.relationships), jsonText(c.relationship_graph, {}), c.growth_arc || '', c.arc_hint || '', jsonText(c.current_state, {}), c.secret || '', c.appearance || '', c.status || 'active', c.version || 1, jsonText(c.raw_payload || c, {}), c.created_at || c.updated_at || nowIso(), c.updated_at || nowIso(),
  )
}
export function updateCharacterRow(db: Database, c: NovelCharacterRecord) {
  db.query('UPDATE characters SET project_id=?,name=?,role=?,role_type=?,archetype=?,personality=?,motivation=?,goal=?,conflict=?,abilities=?,backstory=?,relationships=?,relationship_graph=?,growth_arc=?,arc_hint=?,current_state=?,secret=?,appearance=?,status=?,version=?,raw_payload=?,created_at=?,updated_at=? WHERE id=?').run(
    c.project_id, c.name, c.role || '', c.role_type || c.role || '', c.archetype || '', jsonText(c.personality), c.motivation || '', c.goal || '', c.conflict || '', jsonText(c.abilities), c.backstory || '', jsonText(c.relationships), jsonText(c.relationship_graph, {}), c.growth_arc || '', c.arc_hint || '', jsonText(c.current_state, {}), c.secret || '', c.appearance || '', c.status || 'active', c.version || 1, jsonText(c.raw_payload || c, {}), c.created_at || c.updated_at || nowIso(), c.updated_at || nowIso(), c.id,
  )
}
export function insertOutlineRow(db: Database, o: NovelOutlineRecord) {
  db.query('INSERT INTO outlines (id,project_id,outline_type,title,summary,beats,conflict_points,turning_points,hook,target_length,version,parent_id,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    o.id, o.project_id, o.outline_type || 'master', o.title, o.summary || '', jsonText(o.beats), jsonText(o.conflict_points), jsonText(o.turning_points), o.hook || '', o.target_length || '', o.version || 1, o.parent_id ?? null, jsonText(o.raw_payload || o, {}), o.created_at || nowIso(), o.updated_at || nowIso(),
  )
}
export function updateOutlineRow(db: Database, o: NovelOutlineRecord) {
  db.query('UPDATE outlines SET project_id=?,outline_type=?,title=?,summary=?,beats=?,conflict_points=?,turning_points=?,hook=?,target_length=?,version=?,parent_id=?,raw_payload=?,created_at=?,updated_at=? WHERE id=?').run(
    o.project_id, o.outline_type || 'master', o.title, o.summary || '', jsonText(o.beats), jsonText(o.conflict_points), jsonText(o.turning_points), o.hook || '', o.target_length || '', o.version || 1, o.parent_id ?? null, jsonText(o.raw_payload || o, {}), o.created_at || nowIso(), o.updated_at || nowIso(), o.id,
  )
}
export function insertChapterRow(db: Database, c: NovelChapterRecord) {
  db.query('INSERT INTO chapters (id,project_id,outline_id,chapter_no,title,chapter_goal,chapter_summary,conflict,ending_hook,chapter_text,scene_breakdown,scene_list,continuity_notes,items_in_play,foreshadowing,timeline_note,status,version,published_at,raw_payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    c.id, c.project_id, c.outline_id ?? null, c.chapter_no, c.title, c.chapter_goal || '', c.chapter_summary || '', c.conflict || '', c.ending_hook || '', c.chapter_text || '', jsonText(c.scene_breakdown), jsonText(c.scene_list || c.scene_breakdown), jsonText(c.continuity_notes), jsonText(c.items_in_play), jsonText(c.foreshadowing), c.timeline_note || '', c.status || 'draft', c.version || 1, c.published_at || null, jsonText(c.raw_payload || c, {}), c.created_at || nowIso(), c.updated_at || nowIso(),
  )
}
export function updateChapterRow(db: Database, c: NovelChapterRecord) {
  db.query('UPDATE chapters SET project_id=?,outline_id=?,chapter_no=?,title=?,chapter_goal=?,chapter_summary=?,conflict=?,ending_hook=?,chapter_text=?,scene_breakdown=?,scene_list=?,continuity_notes=?,items_in_play=?,foreshadowing=?,timeline_note=?,status=?,version=?,published_at=?,raw_payload=?,created_at=?,updated_at=? WHERE id=?').run(
    c.project_id, c.outline_id ?? null, c.chapter_no, c.title, c.chapter_goal || '', c.chapter_summary || '', c.conflict || '', c.ending_hook || '', c.chapter_text || '', jsonText(c.scene_breakdown), jsonText(c.scene_list || c.scene_breakdown), jsonText(c.continuity_notes), jsonText(c.items_in_play), jsonText(c.foreshadowing), c.timeline_note || '', c.status || 'draft', c.version || 1, c.published_at || null, jsonText(c.raw_payload || c, {}), c.created_at || nowIso(), c.updated_at || nowIso(), c.id,
  )
}
export function insertChapterVersionRow(db: Database, v: NovelChapterVersionRecord) {
  db.query('INSERT INTO chapter_versions (id,chapter_id,project_id,version_no,chapter_text,scene_breakdown,continuity_notes,source,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(
    v.id, v.chapter_id, v.project_id, v.version_no, v.chapter_text || '', jsonText(v.scene_breakdown || []), jsonText(v.continuity_notes || []), v.source || 'manual_edit', v.created_at || nowIso(),
  )
}
export function insertSettingEntityRow(db: Database, s: NovelSettingEntityRecord) {
  db.query('INSERT INTO setting_entities (id,project_id,entity_type,name,summary,status,visibility,first_chapter_no,last_chapter_no,related_character_ids,related_chapter_ids,related_entity_ids,constraints_json,state_json,payload_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    s.id, s.project_id, s.entity_type || 'rule', s.name, s.summary || '', s.status || 'active', s.visibility || 'public', s.first_chapter_no ?? null, s.last_chapter_no ?? null, jsonText(s.related_character_ids, []), jsonText(s.related_chapter_ids, []), jsonText(s.related_entity_ids, []), jsonText(s.constraints_json, {}), jsonText(s.state_json, {}), jsonText(s.payload_json || s, {}), s.created_at || nowIso(), s.updated_at || nowIso(),
  )
}
export function updateSettingEntityRow(db: Database, s: NovelSettingEntityRecord) {
  db.query('UPDATE setting_entities SET project_id=?,entity_type=?,name=?,summary=?,status=?,visibility=?,first_chapter_no=?,last_chapter_no=?,related_character_ids=?,related_chapter_ids=?,related_entity_ids=?,constraints_json=?,state_json=?,payload_json=?,created_at=?,updated_at=? WHERE id=?').run(
    s.project_id, s.entity_type || 'rule', s.name, s.summary || '', s.status || 'active', s.visibility || 'public', s.first_chapter_no ?? null, s.last_chapter_no ?? null, jsonText(s.related_character_ids, []), jsonText(s.related_chapter_ids, []), jsonText(s.related_entity_ids, []), jsonText(s.constraints_json, {}), jsonText(s.state_json, {}), jsonText(s.payload_json || s, {}), s.created_at || nowIso(), s.updated_at || nowIso(), s.id,
  )
}
export function insertChapterSettingUsageRow(db: Database, u: NovelChapterSettingUsageRecord) {
  db.query('INSERT INTO chapter_setting_usage (id,project_id,chapter_id,entity_id,usage_type,required,allowed,forbidden,reveal_level,expected_state_change,actual_state_change,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
    u.id, u.project_id, u.chapter_id, u.entity_id, u.usage_type || 'allowed', u.required ? 1 : 0, u.allowed === false ? 0 : 1, u.forbidden ? 1 : 0, u.reveal_level || 'none', jsonText(u.expected_state_change, {}), jsonText(u.actual_state_change, {}), u.created_at || nowIso(), u.updated_at || nowIso(),
  )
}
export function updateChapterSettingUsageRow(db: Database, u: NovelChapterSettingUsageRecord) {
  db.query('UPDATE chapter_setting_usage SET project_id=?,chapter_id=?,entity_id=?,usage_type=?,required=?,allowed=?,forbidden=?,reveal_level=?,expected_state_change=?,actual_state_change=?,created_at=?,updated_at=? WHERE id=?').run(
    u.project_id, u.chapter_id, u.entity_id, u.usage_type || 'allowed', u.required ? 1 : 0, u.allowed === false ? 0 : 1, u.forbidden ? 1 : 0, u.reveal_level || 'none', jsonText(u.expected_state_change, {}), jsonText(u.actual_state_change, {}), u.created_at || nowIso(), u.updated_at || nowIso(), u.id,
  )
}
export function updateRunRow(db: Database, r: NovelRunRecord) {
  db.query('UPDATE runs SET project_id=?,run_type=?,step_name=?,status=?,input_ref=?,output_ref=?,duration_ms=?,error_message=?,pipeline_chapter_failure_count=?,pipeline_open_task_count=?,pipeline_task_count=?,created_at=? WHERE id=?').run(
    r.project_id, r.run_type, r.step_name, r.status, r.input_ref || '', r.output_ref || '', r.duration_ms || 0, r.error_message || '', r.pipeline_chapter_failure_count ?? null, r.pipeline_open_task_count ?? null, r.pipeline_task_count ?? null, r.created_at || nowIso(), r.id,
  )
}
export async function withNovelDbWrite<T>(activeWorkspace: string, writer: (db: Database) => T, operation = 'mutation'): Promise<T> {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
    await importLegacyNovelStoreIfNeeded(activeWorkspace)
    const testHook = getNovelMutationTestHook()
    if (testHook) await testHook({ activeWorkspace, phase: 'before_full_store_write', operation })
    const db = openDb(activeWorkspace)
    let committed = false
    try {
      ensureSqliteSchema(db)
      db.exec('BEGIN IMMEDIATE')
      const result = writer(db)
      db.exec('COMMIT')
      committed = true
      return result
    } catch (error) {
      if (!committed) {
        try { db.exec('ROLLBACK') } catch { /* ignore */ }
      }
      throw error
    } finally {
      db.close()
    }
  }, operation)
}


export function normalizeReferenceConfig(value: any): NovelReferenceConfig {
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
export function normalizeProjectRecord(data: Partial<NovelProjectRecord>, existing?: Partial<NovelProjectRecord>): NovelProjectRecord { const ts = nowIso(); return { id: Number(existing?.id || data.id || 0), title: String(data.title ?? existing?.title ?? '未命名小说'), genre: String(data.genre ?? existing?.genre ?? ''), sub_genres: toStringArray(data.sub_genres ?? existing?.sub_genres), synopsis: String(data.synopsis ?? existing?.synopsis ?? ''), length_target: String(data.length_target ?? existing?.length_target ?? 'medium'), target_audience: String(data.target_audience ?? existing?.target_audience ?? ''), style_tags: toStringArray(data.style_tags ?? existing?.style_tags), commercial_tags: toStringArray(data.commercial_tags ?? existing?.commercial_tags), reference_config: normalizeReferenceConfig(data.reference_config ?? existing?.reference_config), status: String(data.status ?? existing?.status ?? 'draft'), created_at: String(existing?.created_at ?? data.created_at ?? ts), updated_at: String(existing?.updated_at ?? data.updated_at ?? ts) } }
export function normalizeWorldbuildingRecord(data: Partial<NovelWorldbuildingRecord>, existing?: Partial<NovelWorldbuildingRecord>): NovelWorldbuildingRecord {
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
export function normalizeCharacterRecord(data: Partial<NovelCharacterRecord>, existing?: Partial<NovelCharacterRecord>): NovelCharacterRecord {
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
export function normalizeOutlineRecord(data: Partial<NovelOutlineRecord>, existing?: Partial<NovelOutlineRecord>): NovelOutlineRecord {
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
export function normalizeChapterRecord(data: Partial<NovelChapterRecord>, existing?: Partial<NovelChapterRecord>): NovelChapterRecord {
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
export function normalizeReviewRecord(data: Partial<NovelReviewRecord>, existing?: Partial<NovelReviewRecord>): NovelReviewRecord {
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
export function normalizeRunRecord(data: Partial<NovelRunRecord>, existing?: Partial<NovelRunRecord>): NovelRunRecord {
  const inputRef = compactPersistedText(data.input_ref ?? existing?.input_ref ?? '')
  const outputRef = compactPersistedText(data.output_ref ?? existing?.output_ref ?? '')
  return {
    id: Number(existing?.id || data.id || 0),
    project_id: Number(data.project_id ?? existing?.project_id ?? 0),
    run_type: String(data.run_type ?? existing?.run_type ?? 'plan'),
    step_name: String(data.step_name ?? existing?.step_name ?? 'step'),
    status: String(data.status ?? existing?.status ?? 'pending'),
    input_ref: inputRef,
    output_ref: outputRef,
    duration_ms: Number(data.duration_ms ?? existing?.duration_ms ?? 0),
    error_message: String(data.error_message ?? existing?.error_message ?? ''),
    created_at: String(existing?.created_at ?? data.created_at ?? nowIso()),
    ...summarizeNovelRunPipelineRefs(inputRef, outputRef),
  }
}
export function normalizeProjectSeedDraftRecord(data: Partial<NovelProjectSeedDraftRecord>, existing?: Partial<NovelProjectSeedDraftRecord>): NovelProjectSeedDraftRecord {
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
export function projectSeedDraftFromRow(row: any): NovelProjectSeedDraftRecord {
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
export function normalizeSettingEntityRecord(data: Partial<NovelSettingEntityRecord>, existing?: Partial<NovelSettingEntityRecord>): NovelSettingEntityRecord {
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
export function normalizeChapterSettingUsageRecord(data: Partial<NovelChapterSettingUsageRecord>, existing?: Partial<NovelChapterSettingUsageRecord>): NovelChapterSettingUsageRecord {
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
export function dedupById<T extends { id: number | string }>(items: T[]): T[] {
  const seen = new Set<number | string>()
  return items.filter(item => {
    const key = item.id
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const NOVEL_PIPELINE_CHAPTER_REVIEW_TYPES = ['prose_quality', 'editor_report', 'editor_revision'] as const
export const NOVEL_PIPELINE_SQL_TRIM_CHARS = [
  9, 10, 11, 12, 13, 32, 160, 5760,
  8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202,
  8232, 8233, 8239, 8287, 12288, 65279,
].map(codePoint => `char(${codePoint})`).join(' || ')
export const NOVEL_PIPELINE_GOVERNANCE_REVIEW_TYPES = [
  'longform_production_repair_audit',
  'book_review',
  'quality_benchmark',
  'delivery_risk_convergence',
] as const
export const NOVEL_PIPELINE_BATCH_RUN_TYPES = ['chapter_group_generation', 'batch_generate_prose'] as const
export const NOVEL_PIPELINE_REPAIR_RUN_TYPES = ['longform_production_repair', 'release_repair_queue'] as const
export const NOVEL_PIPELINE_GOVERNANCE_RUN_TYPES = [
  'longform_creation_diagnosis',
  'longform_pressure_test',
  'quality_benchmark',
  'book_review',
  'regression_benchmark',
  'first30_retention_diagnosis',
] as const

export function pipelineJsonTruthySql(column: string, path: string) {
  const type = `json_type(${column}, '${path}')`
  const value = `json_extract(${column}, '${path}')`
  return `(json_valid(${column}) AND CASE ${type}
    WHEN 'null' THEN 0
    WHEN 'false' THEN 0
    WHEN 'true' THEN 1
    WHEN 'integer' THEN ${value} != 0
    WHEN 'real' THEN ${value} != 0
    WHEN 'text' THEN length(trim(CAST(${value} AS TEXT), ${NOVEL_PIPELINE_SQL_TRIM_CHARS})) > 0
    WHEN 'array' THEN EXISTS (
      WITH RECURSIVE pipeline_array_string(item_value, item_type) AS (
        SELECT json_extract(${column}, '${path}'), json_type(${column}, '${path}')
        UNION ALL
        SELECT json_extract(item_value, '$[0]'), json_type(item_value, '$[0]')
        FROM pipeline_array_string
        WHERE item_type = 'array' AND json_array_length(item_value) = 1
      )
      SELECT 1
      FROM pipeline_array_string
      WHERE CASE item_type
        WHEN 'null' THEN 0
        WHEN 'text' THEN length(trim(CAST(item_value AS TEXT), ${NOVEL_PIPELINE_SQL_TRIM_CHARS})) > 0
        WHEN 'array' THEN json_array_length(item_value) > 1
        ELSE 1
      END
      LIMIT 1
    )
    WHEN 'object' THEN 1
    ELSE 0
  END)`
}

export function pipelineAnyJsonTruthySql(column: string, paths: string[]) {
  return `CASE WHEN ${paths.map(path => pipelineJsonTruthySql(column, path)).join(' OR ')} THEN 1 ELSE 0 END`
}

export function pipelineJsonAnchorTruthySql(column: string, path: string) {
  const type = `json_type(${column}, '${path}')`
  const value = `json_extract(${column}, '${path}')`
  return `(json_valid(${column}) AND CASE ${type}
    WHEN 'null' THEN 0
    WHEN 'false' THEN 0
    WHEN 'true' THEN 1
    WHEN 'integer' THEN ${value} != 0
    WHEN 'real' THEN ${value} != 0
    WHEN 'text' THEN length(trim(CAST(${value} AS TEXT), ${NOVEL_PIPELINE_SQL_TRIM_CHARS})) > 0
    WHEN 'array' THEN json_array_length(${column}, '${path}') > 0
    WHEN 'object' THEN 1
    ELSE 0
  END)`
}

export function pipelineReviewText(...values: any[]) {
  for (const value of values) {
    const normalized = String(value ?? '').trim()
    if (normalized) return normalized
  }
  return ''
}

export function pipelineReviewArray(value: any): any[] {
  return Array.isArray(value) ? value : []
}

export function projectNovelPipelineReview(review: NovelReviewRecord): NovelReviewRecord {
  let payload: any = {}
  try { payload = review.payload ? JSON.parse(String(review.payload)) : {} } catch { payload = {} }
  if (!payload || typeof payload !== 'object') payload = {}
  if (review.review_type === 'prose_quality') {
    const quality = payload.self_check?.review || payload.review || payload.quality || payload.result || payload
    const score = Number(quality?.score ?? quality?.overall_score ?? quality?.quality_score ?? 0)
    const passed = quality?.passed === true
      || (Number.isFinite(score) && score >= 75 && quality?.passed !== false)
    return { ...review, issues: [], payload: JSON.stringify({ passed }) }
  }
  if (review.review_type === 'editor_report') {
    const report = payload.editor_report || payload.report || payload.result || payload
    const hasIssues = [
      ...pipelineReviewArray(report?.issues),
      ...pipelineReviewArray(report?.revision_items),
      ...pipelineReviewArray(report?.revisions),
      ...pipelineReviewArray(payload?.issues),
    ].length > 0
    const status = pipelineReviewText(report?.status, payload?.status, review.status).toLowerCase()
    const needsRevision = hasIssues
      || /warn|fail|risk|revision|revise|needs/.test(status)
      || !/ok|pass|clean|accept|accepted|completed/.test(status)
    return {
      ...review,
      issues: [],
      payload: JSON.stringify({ status: needsRevision ? 'needs_revision' : 'accepted', issues: needsRevision ? ['[pipeline-issue-present]'] : [] }),
    }
  }
  return { ...review, issues: [], payload: '' }
}




















export function outlineChapterNo(outline: Partial<NovelOutlineRecord>) {
  const raw = outline.raw_payload || {}
  const rawNo = Number((raw as any).chapter_no || (raw as any).chapterNo || (raw as any).future100?.chapter_no || (raw as any).rollingPlan?.chapter_no || 0)
  if (rawNo) return rawNo
  const match = String(outline.title || '').match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : 0
}
export function cleanChapterPlanTitle(chapterNo: number, title: any) {
  const text = String(title || '').trim()
  if (!text) return `第${chapterNo}章`
  return text
    .replace(new RegExp(`^第\\s*${chapterNo}\\s*章[\\s:：、-]*`), '')
    .replace(/^第\s*\d+\s*章[\s:：、-]*/, '')
    .trim() || `第${chapterNo}章`
}
export function chapterPlanOutlineTitle(chapterNo: number, title: any) {
  const cleanTitle = cleanChapterPlanTitle(chapterNo, title)
  return cleanTitle === `第${chapterNo}章` ? cleanTitle : `第${chapterNo}章 ${cleanTitle}`
}
export function chapterPlanOutlineSummary(data: Partial<NovelChapterRecord>) {
  return [
    data.chapter_goal ? `目标：${data.chapter_goal}` : '',
    data.chapter_summary ? `摘要：${data.chapter_summary}` : '',
  ].filter(Boolean).join('\n')
}


export function versionedChapterSnapshotChanged(current: NovelChapterRecord, next: NovelChapterRecord) {
  return (
    String(current.chapter_text || '') !== String(next.chapter_text || '') ||
    jsonText(current.scene_breakdown || []) !== jsonText(next.scene_breakdown || []) ||
    jsonText(current.continuity_notes || []) !== jsonText(next.continuity_notes || [])
  )
}
export function createChapterVersionRecord(data: Partial<NovelChapterVersionRecord> & { id?: number }): NovelChapterVersionRecord { return { id: Number(data.id || 0), chapter_id: Number(data.chapter_id || 0), project_id: Number(data.project_id || 0), version_no: Number(data.version_no || 1), chapter_text: String(data.chapter_text || ''), scene_breakdown: toAnyArray(data.scene_breakdown), continuity_notes: toStringArray(data.continuity_notes), source: data.source || 'manual_edit', created_at: String(data.created_at || nowIso()) } }
export function nextChapterVersionNo(db: Database, chapterId: number): number {
  return Number((db.query('SELECT COALESCE(MAX(version_no), 0) + 1 AS n FROM chapter_versions WHERE chapter_id = ?').get(chapterId) as any)?.n || 1)
}







export function changedAcceptanceRecords<T extends { id: number }>(before: T[], after: T[]) {
  const beforeById = new Map(before.map(record => [record.id, record]))
  return after.filter(record => safeJsonText(beforeById.get(record.id)) !== safeJsonText(record))
}
export function removedAcceptanceRecordIds<T extends { id: number }>(before: T[], after: T[]) {
  const afterIds = new Set(after.map(record => record.id))
  return before.filter(record => !afterIds.has(record.id)).map(record => record.id)
}
export function persistNovelChapterAcceptanceDelta(db: Database, before: NovelStore, after: NovelStore) {
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

export function loadAcceptanceWorkingSet(db: Database, chapterId: number): { store: NovelStore; chapterIndex: number; projectIndex: number } | null {
  const chapterRow = db.query('SELECT * FROM chapters WHERE id = ? LIMIT 1').get(chapterId) as any
  if (!chapterRow) return null
  const chapter = chapterFromRow(chapterRow)
  const projectRow = db.query('SELECT * FROM projects WHERE id = ? LIMIT 1').get(chapter.project_id) as any
  if (!projectRow) return null
  const project = projectFromRow(projectRow)
  const projectId = project.id
  const store: NovelStore = {
    projects: [project],
    worldbuilding: (db.query('SELECT * FROM worldbuilding WHERE project_id = ?').all(projectId) as any[]).map(worldbuildingFromRow),
    characters: (db.query('SELECT * FROM characters WHERE project_id = ?').all(projectId) as any[]).map(characterFromRow),
    outlines: [],
    chapters: [chapter],
    chapter_versions: (db.query('SELECT * FROM chapter_versions WHERE chapter_id = ?').all(chapter.id) as any[]).map(chapterVersionFromRow),
    reviews: [],
    runs: [],
    setting_entities: (db.query('SELECT * FROM setting_entities WHERE project_id = ?').all(projectId) as any[]).map(settingEntityFromRow),
    chapter_setting_usage: (db.query('SELECT * FROM chapter_setting_usage WHERE project_id = ?').all(projectId) as any[]).map(chapterSettingUsageFromRow),
  }
  return { store, chapterIndex: 0, projectIndex: 0 }
}









