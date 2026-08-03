import { resolveOutgoingChapterHandoff } from './chapter-handoff-basics'
import { resolveChapterProgressLedger } from './chapter-progress-ledger'
import { redactAndBoundCredentialText } from './credential-redaction'
import { CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY } from '../novel-writing-service/generation-source/types'
import type { HumanizeCandidateProvenance } from './humanize-postprocess'
export type ChapterProseStoragePatchInput = {
  chapter: any
  generatedTitlePatch: Record<string, any>
  finalText: any
  finalContinuityNotes: any
  finalSceneBreakdown: any
  ohStoryDeliveryReceipts: any
  postDraftDirector?: any
  generationSourceProvenance?: any
  humanizePostprocess?: unknown
  proseAdmission?: {
    status: 'accepted' | 'accepted_with_warnings'
    quality_score: number | null
    quality_warnings: any[]
    story_state_status: 'synced' | 'pending'
    story_state_warning?: any
  }
}

export type PersistedHumanizeCandidateProvenance = HumanizeCandidateProvenance

export type PersistedHumanizeStageWindow = {
  id?: string
  score?: number
  reasons?: string[]
  chars?: number
}

export type PersistedHumanizeStageRepair = {
  from?: string
  to?: string
  count?: number
  reason?: string
}

export type PersistedHumanizePostprocessStage = {
  stage?: string
  version?: string
  id?: string
  reason?: string
  kept?: string
  humanize_mode?: string
  humanize_reason?: string
  fingerprint_reason?: string
  risk_segment_version?: string
  skip_reason?: string
  chunk_count?: number
  chars?: number
  ratio?: number
  paragraph_count?: number
  high_risk_count?: number
  total_score?: number
  window_count?: number
  before_chars?: number
  after_chars?: number
  score?: number
  before_pure?: number
  after_pure?: number
  before_hard?: number
  after_hard?: number
  before_clinical?: number
  after_clinical?: number
  before_count?: number
  after_count?: number
  injected?: number
  accepted?: boolean
  applied?: boolean
  changed?: boolean
  pass_b_enabled?: boolean
  humanize_accepted?: boolean
  fingerprint_accepted?: boolean
  used_deterministic_fallback?: boolean
  windows?: PersistedHumanizeStageWindow[]
  repairs?: PersistedHumanizeStageRepair[]
  zones?: string[]
}

export type PersistedHumanizePostprocessReport = {
  version?: string
  dual_pass_version?: string
  enabled?: boolean
  skipped?: boolean
  reason?: string
  error?: string
  before_chars?: number
  after_chars?: number
  chunk_count?: number
  pass_a_applied?: boolean
  pass_b_applied?: boolean
  deterministic_shells?: boolean
  accepted?: boolean
  reject_reason?: string
  stages?: PersistedHumanizePostprocessStage[]
  r76_zhuque_stack?: string
  candidate_provenance?: PersistedHumanizeCandidateProvenance
}

const PERSISTED_HUMANIZE_MAX_STRING = 240
const PERSISTED_HUMANIZE_MAX_STAGES = 64
const PERSISTED_HUMANIZE_MAX_NESTED_ITEMS = 32

function normalizePersistedHumanizeString(value: unknown, maxLength = PERSISTED_HUMANIZE_MAX_STRING) {
  if (typeof value !== 'string') return undefined
  return redactAndBoundCredentialText(value, Math.min(PERSISTED_HUMANIZE_MAX_STRING, maxLength))
}

function normalizePersistedHumanizeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function normalizePersistedHumanizeBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined
}

const PERSISTED_HUMANIZE_STAGE_STRING_FIELDS = [
  'stage',
  'version',
  'id',
  'reason',
  'kept',
  'humanize_mode',
  'humanize_reason',
  'fingerprint_reason',
  'risk_segment_version',
  'skip_reason',
] as const

const PERSISTED_HUMANIZE_STAGE_NUMBER_FIELDS = [
  'chunk_count',
  'chars',
  'ratio',
  'paragraph_count',
  'high_risk_count',
  'total_score',
  'window_count',
  'before_chars',
  'after_chars',
  'score',
  'before_pure',
  'after_pure',
  'before_hard',
  'after_hard',
  'before_clinical',
  'after_clinical',
  'before_count',
  'after_count',
  'injected',
] as const

const PERSISTED_HUMANIZE_STAGE_BOOLEAN_FIELDS = [
  'accepted',
  'applied',
  'changed',
  'pass_b_enabled',
  'humanize_accepted',
  'fingerprint_accepted',
  'used_deterministic_fallback',
] as const

function normalizePersistedHumanizeWindow(value: unknown): PersistedHumanizeStageWindow | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const input = value as Record<string, unknown>
  const output: PersistedHumanizeStageWindow = {}
  const id = normalizePersistedHumanizeString(input.id)
  const score = normalizePersistedHumanizeNumber(input.score)
  const chars = normalizePersistedHumanizeNumber(input.chars)
  if (id !== undefined) output.id = id
  if (score !== undefined) output.score = score
  if (chars !== undefined) output.chars = chars
  if (Array.isArray(input.reasons)) {
    output.reasons = input.reasons
      .slice(0, PERSISTED_HUMANIZE_MAX_NESTED_ITEMS)
      .map(item => normalizePersistedHumanizeString(item))
      .filter((item): item is string => item !== undefined)
  }
  return output
}

function normalizePersistedHumanizeRepair(value: unknown): PersistedHumanizeStageRepair | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const input = value as Record<string, unknown>
  const output: PersistedHumanizeStageRepair = {}
  const from = normalizePersistedHumanizeString(input.from)
  const to = normalizePersistedHumanizeString(input.to)
  const count = normalizePersistedHumanizeNumber(input.count)
  const reason = normalizePersistedHumanizeString(input.reason)
  if (from !== undefined) output.from = from
  if (to !== undefined) output.to = to
  if (count !== undefined) output.count = count
  if (reason !== undefined) output.reason = reason
  return output
}

function normalizePersistedHumanizeStage(value: unknown): PersistedHumanizePostprocessStage | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const input = value as Record<string, unknown>
  const output: Record<string, unknown> = {}
  for (const field of PERSISTED_HUMANIZE_STAGE_STRING_FIELDS) {
    const normalized = normalizePersistedHumanizeString(input[field])
    if (normalized !== undefined) output[field] = normalized
  }
  for (const field of PERSISTED_HUMANIZE_STAGE_NUMBER_FIELDS) {
    const normalized = normalizePersistedHumanizeNumber(input[field])
    if (normalized !== undefined) output[field] = normalized
  }
  for (const field of PERSISTED_HUMANIZE_STAGE_BOOLEAN_FIELDS) {
    const normalized = normalizePersistedHumanizeBoolean(input[field])
    if (normalized !== undefined) output[field] = normalized
  }
  if (Array.isArray(input.windows)) {
    output.windows = input.windows
      .slice(0, PERSISTED_HUMANIZE_MAX_NESTED_ITEMS)
      .map(normalizePersistedHumanizeWindow)
      .filter((item): item is PersistedHumanizeStageWindow => item !== undefined)
  }
  if (Array.isArray(input.repairs)) {
    output.repairs = input.repairs
      .slice(0, PERSISTED_HUMANIZE_MAX_NESTED_ITEMS)
      .map(normalizePersistedHumanizeRepair)
      .filter((item): item is PersistedHumanizeStageRepair => item !== undefined)
  }
  if (Array.isArray(input.zones)) {
    output.zones = input.zones
      .slice(0, PERSISTED_HUMANIZE_MAX_NESTED_ITEMS)
      .map(item => normalizePersistedHumanizeString(item))
      .filter((item): item is string => item !== undefined)
  }
  return output as PersistedHumanizePostprocessStage
}

function normalizePersistedHumanizeProvenance(value: unknown): PersistedHumanizeCandidateProvenance | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const input = value as Record<string, unknown>
  const humanizeInputHash = normalizePersistedHumanizeString(input.humanize_input_hash, 64)
  const humanizeOutputHash = normalizePersistedHumanizeString(input.humanize_output_hash, 64)
  const finalCandidateHash = normalizePersistedHumanizeString(input.final_candidate_hash, 64)
  const superseded = normalizePersistedHumanizeBoolean(input.superseded_by_quality_revision)
  const hasCanonicalScope = input.scope === 'post_quality' && input.stage === 'post_quality'
  const hasHistoricalScope = input.scope === 'pre_quality' && input.stage === 'pre_quality'
  if (
    (!hasCanonicalScope && !hasHistoricalScope)
    || !/^[a-f0-9]{64}$/i.test(humanizeInputHash || '')
    || !/^[a-f0-9]{64}$/i.test(humanizeOutputHash || '')
    || !/^[a-f0-9]{64}$/i.test(finalCandidateHash || '')
    || superseded === undefined
  ) return undefined
  const common = {
    humanize_input_hash: humanizeInputHash!,
    humanize_output_hash: humanizeOutputHash!,
    final_candidate_hash: finalCandidateHash!,
    superseded_by_quality_revision: superseded,
  }
  return hasCanonicalScope
    ? { scope: 'post_quality', stage: 'post_quality', ...common }
    : { scope: 'pre_quality', stage: 'pre_quality', ...common }
}

export function normalizeHumanizePostprocessForStorage(
  value: unknown,
): PersistedHumanizePostprocessReport | null | undefined {
  if (value === null) return null
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const input = value as Record<string, unknown>
  const output: PersistedHumanizePostprocessReport = {}
  const stringFields = ['version', 'dual_pass_version', 'reason', 'error', 'reject_reason', 'r76_zhuque_stack'] as const
  const numberFields = ['before_chars', 'after_chars', 'chunk_count'] as const
  const booleanFields = ['enabled', 'skipped', 'pass_a_applied', 'pass_b_applied', 'deterministic_shells', 'accepted'] as const
  for (const field of stringFields) {
    const normalized = normalizePersistedHumanizeString(input[field])
    if (normalized !== undefined) output[field] = normalized
  }
  for (const field of numberFields) {
    const normalized = normalizePersistedHumanizeNumber(input[field])
    if (normalized !== undefined) output[field] = normalized
  }
  for (const field of booleanFields) {
    const normalized = normalizePersistedHumanizeBoolean(input[field])
    if (normalized !== undefined) output[field] = normalized
  }
  if (Array.isArray(input.stages)) {
    output.stages = input.stages
      .slice(0, PERSISTED_HUMANIZE_MAX_STAGES)
      .map(normalizePersistedHumanizeStage)
      .filter((item): item is PersistedHumanizePostprocessStage => item !== undefined)
  }
  const provenance = normalizePersistedHumanizeProvenance(input.candidate_provenance)
  if (provenance) output.candidate_provenance = provenance
  return output
}

export type ChapterProseVersionSourceInput = {
  revisionEligible?: boolean
  editorRewrite?: any
  selfCheck?: any
}

function proseCharCount(value: string) {
  return String(value || '').replace(/\s+/g, '').length
}

type ProseSentence = {
  text: string
  complete: boolean
}

const PROSE_QUOTE_PAIRS: Record<string, string> = {
  '“': '”',
  '‘': '’',
  '「': '」',
  '『': '』',
}

function isSpeechAttributionContinuation(value: string) {
  return /^(?:他|她|它|[\u3400-\u9fff]{1,8})[^。！？!?；;]{0,12}(?:说|问|道|喊|答|叫|喝|吼|嘀咕|低语|提醒|补充|解释|说着|喊道|问道|答道)(?=$|[，,:：。！？!?；;“‘「『])/.test(
    String(value || '').trim(),
  )
}

function splitProseSentences(value: string): ProseSentence[] {
  const text = String(value || '')
  const sentences: ProseSentence[] = []
  let buffer = ''
  const quoteStack: string[] = []
  let previousChar = ''
  for (const char of text) {
    buffer += char
    const closesCurrentQuote = quoteStack.at(-1) === char
    const closesQuotedSentence = closesCurrentQuote
      && quoteStack.length === 1
      && /[。！？!?；;]/.test(previousChar)
    if (closesCurrentQuote) quoteStack.pop()
    else if (char === '"') quoteStack.push('"')
    else if (PROSE_QUOTE_PAIRS[char]) quoteStack.push(PROSE_QUOTE_PAIRS[char])
    if ((/[。！？!?；;]/.test(char) && quoteStack.length === 0) || closesQuotedSentence) {
      if (buffer) sentences.push({ text: buffer, complete: true })
      buffer = ''
    }
    if (!/\s/.test(char)) previousChar = char
  }
  if (buffer) sentences.push({ text: buffer, complete: false })
  return sentences.reduce<ProseSentence[]>((merged, sentence) => {
    const previous = merged.at(-1)
    if (previous && isDialogueParagraph(previous.text) && isSpeechAttributionContinuation(sentence.text)) {
      previous.text += sentence.text
      previous.complete = sentence.complete
      return merged
    }
    merged.push(sentence)
    return merged
  }, [])
}

function isDialogueParagraph(value: string) {
  return /^(?:[“‘「『][\s\S]*[”’」』]|"[\s\S]*")$/.test(String(value || '').trim())
}

function isProtectedProseLine(value: string) {
  const line = String(value || '').trim()
  return /^#{0,6}\s*第[一二三四五六七八九十百千万两0-9]+章(?:\s|$|[：:《「【_ -])/.test(line)
    || /^(?:[-*+]\s+|\d+[.．、)）]\s*|[一二三四五六七八九十]+[、.．)）]\s*)/.test(line)
}

function extractLeadingBracketedChapterTitle(value: string) {
  const text = String(value || '')
  const marker = text.match(/^#{0,6}\s*第[一二三四五六七八九十百千万两0-9]+章/)?.[0] || ''
  if (!marker) return ''
  const afterMarker = text.slice(marker.length)
  const spacing = afterMarker.match(/^\s*/)?.[0] || ''
  const opening = afterMarker.slice(spacing.length, spacing.length + 1)
  const closing = opening === '《' ? '》' : opening === '「' ? '」' : opening === '【' ? '】' : ''
  if (!closing) return ''
  const closingIndex = afterMarker.indexOf(closing, spacing.length + 1)
  if (closingIndex < 0 || closingIndex > spacing.length + 80) return ''
  return text.slice(0, marker.length + closingIndex + 1)
}

function addParagraphBreaksToWall(value: string) {
  const text = String(value || '')
  if (proseCharCount(text) < 180) return text
  const leadingTitle = extractLeadingBracketedChapterTitle(text)
  if (leadingTitle && text.length > leadingTitle.length) {
    const body = text.slice(leadingTitle.length)
    const segmentedBody = addParagraphBreaksToWall(body)
    return segmentedBody === body ? text : `${leadingTitle}\n\n${segmentedBody}`
  }
  if (isProtectedProseLine(text)) return text
  const sentences = splitProseSentences(text)
  if (sentences.filter(sentence => sentence.complete).length < 4) return text

  const paragraphs: string[] = []
  let current = ''
  let currentChars = 0
  for (let index = 0; index < sentences.length; index += 1) {
    const sentence = sentences[index].text
    const sentenceChars = proseCharCount(sentence)
    const nextSentence = sentences[index + 1]?.text || ''
    const dialogue = isDialogueParagraph(sentence)
    if (dialogue) {
      if (current) paragraphs.push(current)
      paragraphs.push(sentence)
      current = ''
      currentChars = 0
      continue
    }
    if (current && currentChars >= 45 && currentChars + sentenceChars > 90) {
      paragraphs.push(current)
      current = ''
      currentChars = 0
    }
    current += sentence
    currentChars += sentenceChars
    const nextStartsDialogue = isDialogueParagraph(nextSentence)
    if (
      currentChars >= 90
      || (currentChars >= 45 && nextStartsDialogue)
    ) {
      paragraphs.push(current)
      current = ''
      currentChars = 0
    }
  }
  if (current) paragraphs.push(current)
  return paragraphs.length > 1 ? paragraphs.join('\n\n') : text
}

function restoreParagraphBreaksForWallProse(value: any) {
  const text = String(value || '')
  if (!text) return text
  const normalized = text
    .split(/(\r?\n)/)
    .map(part => (/^\r?\n$/.test(part) ? part : addParagraphBreaksToWall(part)))
    .join('')
  const sourceChars = Array.from(text)
  let sourceIndex = 0
  for (const char of normalized) {
    if (char === sourceChars[sourceIndex]) {
      sourceIndex += 1
      continue
    }
    if (char !== '\n') return text
  }
  return sourceIndex === sourceChars.length ? normalized : text
}

/**
 * Models sometimes emit one sentence per single `\n` (no blank line).
 * Webnovel storage/fingerprint/Zhuque all expect `\n\n` paragraph breaks.
 * System-wide: convert single-newline sentence rows into double-newline paragraphs
 * when blank-line density is abnormally low.
 */
export function ensureWebnovelParagraphBreaks(value: any) {
  const body = String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (!body.trim()) return body
  const doubleCount = (body.match(/\n\n/g) || []).length
  const lines = body.split('\n').map((line) => line.trim()).filter(Boolean)
  if (lines.length < 12) return body
  // Healthy webnovel draft usually has blank lines between most paragraphs.
  if (doubleCount >= Math.max(8, Math.floor(lines.length * 0.35))) {
    return body
  }
  return `${lines.join('\n\n')}${body.endsWith('\n') ? '\n' : ''}`
}

export function normalizeProseForStorage(value: any) {
  return ensureWebnovelParagraphBreaks(restoreParagraphBreaksForWallProse(value))
}

export function buildChapterProseStoragePatch(input: ChapterProseStoragePatchInput) {
  const receipts = input.ohStoryDeliveryReceipts || {}
  const storedText = normalizeProseForStorage(input.finalText)
  const endingHook = input.chapter?.ending_hook
    || input.chapter?.endingHook
    || input.generatedTitlePatch?.ending_hook
    || input.generatedTitlePatch?.endingHook
    || ''
  const outgoingHandoff = resolveOutgoingChapterHandoff({
    chapterText: storedText,
    endingHook,
  })
  const progressLedger = resolveChapterProgressLedger({
    chapterText: storedText,
    endingHook,
    plannedGoal: input.chapter?.chapter_goal || input.chapter?.chapterGoal || input.chapter?.goal || '',
    plannedSummary: input.chapter?.chapter_summary || input.chapter?.chapterSummary || input.chapter?.summary || '',
    plannedConflict: input.chapter?.conflict || '',
    plannedMustAdvance: input.chapter?.raw_payload?.must_advance || input.chapter?.raw_payload?.mustAdvance,
    outgoingHandoff,
  })
  const rawPayload: Record<string, any> = {
    ...(input.chapter?.raw_payload || {}),
    generated_scene_breakdown: input.finalSceneBreakdown,
    oh_story_delivery_receipts: input.ohStoryDeliveryReceipts,
  }
  if (input.postDraftDirector !== undefined) {
    rawPayload.oh_story_director = input.postDraftDirector
    rawPayload.ohStoryDirector = input.postDraftDirector
  }
  if (input.generationSourceProvenance !== undefined) {
    if (input.generationSourceProvenance?.receipt_authority === CHAPTER_GENERATION_STAGE_RECEIPT_AUTHORITY) {
      rawPayload.chapter_generation_source = input.generationSourceProvenance
      delete rawPayload.prose_generation_source
    } else {
      rawPayload.prose_generation_source = input.generationSourceProvenance
    }
  }
  if (input.humanizePostprocess !== undefined) {
    const humanizePostprocess = normalizeHumanizePostprocessForStorage(input.humanizePostprocess)
    if (humanizePostprocess !== undefined) rawPayload.humanize_postprocess = humanizePostprocess
  }
  if (input.proseAdmission !== undefined) {
    rawPayload.prose_admission = input.proseAdmission
    rawPayload.proseAdmission = input.proseAdmission
  }
  if (outgoingHandoff) {
    rawPayload.outgoing_handoff = outgoingHandoff
    rawPayload.outgoingHandoff = outgoingHandoff
  }
  if (progressLedger && progressLedger.source !== 'empty') {
    rawPayload.chapter_progress_ledger = progressLedger
    rawPayload.chapterProgressLedger = progressLedger
  }
  Object.assign(rawPayload, {
    chapter_blueprint: receipts?.chapter_blueprint,
    scene_card_receipts: receipts?.scene_card_receipts,
    delivery_risk_receipts: receipts?.delivery_risk_receipts,
    revision_receipts: receipts?.revision_receipts,
    deslop_repair_receipts: receipts?.deslop_repair_receipts,
    quality_audit_repair_receipts: receipts?.quality_audit_repair_receipts,
    artifact_protocol_receipts: receipts?.artifact_protocol_receipts,
    pre_draft_execution_receipts: receipts?.pre_draft_execution_receipts,
  })
  return {
    ...(input.generatedTitlePatch || {}),
    chapter_text: storedText,
    continuity_notes: input.finalContinuityNotes,
    raw_payload: rawPayload,
    status: 'draft',
  }
}

export function resolveChapterProseVersionSource(input: ChapterProseVersionSourceInput = {}) {
  if (input.revisionEligible && input.selfCheck?.revised) return 'repair'
  if (input.editorRewrite?.edited) return 'editor_rewrite'
  return 'agent_execute'
}
