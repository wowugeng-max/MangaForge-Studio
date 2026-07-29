import type { NovelReviewRecord } from '../../novel/types'

const PUBLIC_PATCH_TYPES = new Set(['full_text', 'replacement', 'insertion', 'opening_rewrite'])
const PUBLIC_PATCH_MATCHES = new Set(['exact', 'trimmed', 'normalized_whitespace', 'offset_cut'])
const PUBLIC_PATCH_POSITIONS = new Set(['before', 'after', 'append_or_prepend'])

function parseObject(value: unknown): Record<string, any> | null {
  let parsed = value
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      return null
    }
  }
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, any>
    : null
}

function compactObject(entries: Array<[string, unknown]>) {
  return Object.fromEntries(entries.filter(([, value]) => value !== undefined))
}

function safeString(value: unknown, limit = 500) {
  return typeof value === 'string' ? value.slice(0, limit) : undefined
}

function safeBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined
}

function safeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function safeInteger(value: unknown, minimum = 0) {
  return typeof value === 'number' && Number.isInteger(value) && value >= minimum ? value : undefined
}

function safeNullableId(value: unknown) {
  if (value === null) return null
  return safeInteger(value, 1)
}

function safeHash(value: unknown) {
  const hash = safeString(value, 128)
  return hash && /^[a-f0-9]{64}$/i.test(hash) ? hash : undefined
}

function safeEnum(value: unknown, allowed: Set<string>) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return allowed.has(normalized) ? normalized : undefined
}

function safeTextList(value: unknown, limit = 16, textLimit = 500) {
  if (!Array.isArray(value)) return undefined
  const items = value
    .slice(0, limit)
    .flatMap(item => {
      const text = safeString(item, textLimit)?.trim()
      return text ? [text] : []
    })
  return items.length ? items : []
}

function safeQualityIssues(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 24).flatMap(item => {
    if (typeof item === 'string') {
      const text = safeString(item, 500)?.trim()
      return text ? [text] : []
    }
    const issue = parseObject(item)
    if (!issue) return []
    const safe = compactObject([
      ['severity', safeString(issue.severity, 40)],
      ['type', safeString(issue.type, 120)],
      ['description', safeString(issue.description, 500)],
      ['fix', safeString(issue.fix, 500)],
      ['source', safeString(issue.source, 120)],
    ])
    return Object.keys(safe).length ? [safe] : []
  })
}

function safeScalarRecord(value: unknown, limit = 40) {
  const record = parseObject(value)
  if (!record) return undefined
  const entries = Object.entries(record).slice(0, limit).flatMap(([key, item]) => {
    if (!/^[a-zA-Z0-9_.:-]{1,120}$/.test(key)) return []
    if (typeof item === 'boolean' || typeof item === 'number' && Number.isFinite(item)) {
      return [[key, item] as [string, unknown]]
    }
    const text = safeString(item, 200)
    return text === undefined ? [] : [[key, text] as [string, unknown]]
  })
  return entries.length ? Object.fromEntries(entries) : undefined
}

function safeDeliveryLink(value: unknown) {
  const link = parseObject(value)
  if (!link) return undefined
  const selected = Array.isArray(link.selected)
    ? link.selected.slice(0, 12).flatMap(item => {
      const entry = parseObject(item)
      if (!entry) return []
      const safe = compactObject([
        ['key', safeString(entry.key, 120)],
        ['priority', safeNumber(entry.priority)],
        ['severity', safeString(entry.severity, 40)],
        ['label', safeString(entry.label, 160)],
        ['directive', safeString(entry.directive, 500)],
      ])
      return Object.keys(safe).length ? [safe] : []
    })
    : undefined
  return compactObject([
    ['version', safeString(link.version, 80)],
    ['selected', selected],
    ['source_count', safeInteger(link.source_count)],
    ['model_issue_count', safeInteger(link.model_issue_count)],
    ['model_directive_count', safeInteger(link.model_directive_count)],
  ])
}

function safeQualityReview(value: unknown) {
  const review = parseObject(value)
  if (!review) return undefined
  return compactObject([
    ['passed', safeBoolean(review.passed)],
    ['score', safeNumber(review.score)],
    ['issues', safeQualityIssues(review.issues)],
    ['revision_directives', safeTextList(review.revision_directives)],
    ['craft_metrics', safeScalarRecord(review.craft_metrics)],
    ['focused_revision_modes', safeTextList(review.focused_revision_modes, 16, 120)],
    ['needs_revision', safeBoolean(review.needs_revision)],
    ['modelName', safeString(review.modelName, 160)],
    ['model_name', safeString(review.model_name, 160)],
    ['delivery_link', safeDeliveryLink(review.delivery_link)],
  ])
}

function safePlanAlignment(value: unknown) {
  const alignment = parseObject(value)
  if (!alignment) return undefined
  return compactObject([
    ['chapter_id', safeInteger(alignment.chapter_id, 1)],
    ['rebuilt', safeBoolean(alignment.rebuilt)],
    ['updated', safeBoolean(alignment.updated)],
    ['reason', safeString(alignment.reason, 240)],
    ['following_count', safeInteger(alignment.following_count)],
  ])
}

function safeAppliedPatches(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.slice(0, 100).flatMap(item => {
    const patch = parseObject(item)
    if (!patch) return []
    const safe = compactObject([
      ['type', safeEnum(patch.type, PUBLIC_PATCH_TYPES)],
      ['chars', safeInteger(patch.chars)],
      ['match', safeEnum(patch.match, PUBLIC_PATCH_MATCHES)],
      ['position', safeEnum(patch.position, PUBLIC_PATCH_POSITIONS)],
    ])
    return Object.keys(safe).length ? [safe] : []
  })
}

function safeCandidateDiagnostics(value: unknown) {
  const diagnostics = parseObject(value)
  if (!diagnostics) return undefined
  return compactObject([
    ['source_char_count', safeInteger(diagnostics.source_char_count)],
    ['candidate_char_count', safeInteger(diagnostics.candidate_char_count)],
    ['minimum_char_count', safeInteger(diagnostics.minimum_char_count)],
    ['maximum_char_count', safeInteger(diagnostics.maximum_char_count)],
    ['applied_patch_count', safeInteger(diagnostics.applied_patch_count)],
    ['unapplied_patch_count', safeInteger(diagnostics.unapplied_patch_count)],
  ])
}

function publicEditorRevisionPayload(value: unknown) {
  const payload = parseObject(value) || {}
  return compactObject([
    ['chapter_id', safeInteger(payload.chapter_id, 1)],
    ['chapter_no', safeInteger(payload.chapter_no, 1)],
    ['source_review_id', safeNullableId(payload.source_review_id)],
    ['requested_revision_mode', safeString(payload.requested_revision_mode, 120)],
    ['revision_strategy', safeString(payload.revision_strategy, 120)],
    ['source_run_id', safeInteger(payload.source_run_id, 1)],
    ['candidate_hash', safeHash(payload.candidate_hash)],
    ['applied_patches', safeAppliedPatches(payload.applied_patches)],
    ['candidate_diagnostics', safeCandidateDiagnostics(payload.candidate_diagnostics)],
  ])
}

function revisionOwnedProseQualityPayload(value: unknown) {
  const payload = parseObject(value)
  if (!payload) return null
  const sourceRunId = safeInteger(payload.source_run_id, 1)
  const candidateHash = safeHash(payload.candidate_hash)
  const revisionOwned = payload.source === 'post_revision'
    || payload.current_chapter_only === true
      && sourceRunId !== undefined
      && candidateHash !== undefined
  if (!revisionOwned) return null
  const selfCheck = parseObject(payload.self_check) || {}
  return compactObject([
    ['chapter_id', safeInteger(payload.chapter_id, 1)],
    ['chapter_updated_at', safeString(payload.chapter_updated_at, 80)],
    ['content_hash', safeHash(payload.content_hash)],
    ['source', safeString(payload.source, 120)],
    ['source_review_id', safeNullableId(payload.source_review_id)],
    ['source_run_id', sourceRunId],
    ['candidate_hash', candidateHash],
    ['current_chapter_only', safeBoolean(payload.current_chapter_only)],
    ['self_check', compactObject([
      ['review', safeQualityReview(selfCheck.review)],
      ['revision', selfCheck.revision === null ? null : undefined],
      ['revised', safeBoolean(selfCheck.revised)],
    ])],
    ['delivery_link', safeDeliveryLink(payload.delivery_link)],
    ['plan_alignment', safePlanAlignment(payload.plan_alignment)],
  ])
}

export function buildPublicRevisionReview(review: NovelReviewRecord): NovelReviewRecord {
  if (review.review_type === 'editor_revision') {
    return { ...review, payload: JSON.stringify(publicEditorRevisionPayload(review.payload)) }
  }
  if (review.review_type === 'prose_quality') {
    const payload = revisionOwnedProseQualityPayload(review.payload)
    if (payload) return { ...review, payload: JSON.stringify(payload) }
  }
  return review
}
