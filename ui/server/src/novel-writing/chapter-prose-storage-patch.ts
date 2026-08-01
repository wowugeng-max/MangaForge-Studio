import { resolveOutgoingChapterHandoff } from './chapter-handoff-basics'
import { resolveChapterProgressLedger } from './chapter-progress-ledger'
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
  if (lines.length < 12) return body.endsWith('\n') ? body : `${body}\n`
  // Healthy webnovel draft usually has blank lines between most paragraphs.
  if (doubleCount >= Math.max(8, Math.floor(lines.length * 0.35))) {
    return body.endsWith('\n') ? body : `${body}\n`
  }
  return `${lines.join('\n\n')}\n`
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
    rawPayload.prose_generation_source = input.generationSourceProvenance
  }
  if (input.humanizePostprocess !== undefined) {
    rawPayload.humanize_postprocess = input.humanizePostprocess
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
