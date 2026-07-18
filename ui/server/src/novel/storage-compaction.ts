import type { Database } from 'bun:sqlite'
import { safeJsonText, sanitizeJsonValue } from './json'

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
