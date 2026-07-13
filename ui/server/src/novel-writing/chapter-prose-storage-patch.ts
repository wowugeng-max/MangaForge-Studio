export type ChapterProseStoragePatchInput = {
  chapter: any
  generatedTitlePatch: Record<string, any>
  finalText: any
  finalContinuityNotes: any
  finalSceneBreakdown: any
  ohStoryDeliveryReceipts: any
  postDraftDirector?: any
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

function splitProseSentences(value: string): ProseSentence[] {
  const text = String(value || '')
  const sentences: ProseSentence[] = []
  let buffer = ''
  let quoteDepth = 0
  let previousChar = ''
  for (const char of text) {
    buffer += char
    if ('“「『'.includes(char)) quoteDepth += 1
    const closesQuotedSentence = '”」』'.includes(char)
      && quoteDepth === 1
      && /[。！？!?；;]/.test(previousChar)
    if ('”」』'.includes(char)) quoteDepth = Math.max(0, quoteDepth - 1)
    if ((/[。！？!?；;]/.test(char) && quoteDepth === 0) || closesQuotedSentence) {
      if (buffer) sentences.push({ text: buffer, complete: true })
      buffer = ''
    }
    if (!/\s/.test(char)) previousChar = char
  }
  if (buffer) sentences.push({ text: buffer, complete: false })
  return sentences
}

function isDialogueParagraph(value: string) {
  return /^[“「『][\s\S]*[”」』]$/.test(String(value || '').trim())
}

function isProtectedProseLine(value: string) {
  const line = String(value || '').trim()
  return /^#{0,6}\s*第[一二三四五六七八九十百千万两0-9]+章(?:\s|$|[：:《「【_ -])/.test(line)
    || /^(?:[-*+]\s+|\d+[.．、)）]\s*|[一二三四五六七八九十]+[、.．)）]\s*)/.test(line)
}

function addParagraphBreaksToWall(value: string) {
  const text = String(value || '')
  if (proseCharCount(text) < 180 || isProtectedProseLine(text)) return text
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
  return normalized.replace(/\s+/g, '') === text.replace(/\s+/g, '') ? normalized : text
}

export function normalizeProseForStorage(value: any) {
  return restoreParagraphBreaksForWallProse(value)
}

export function buildChapterProseStoragePatch(input: ChapterProseStoragePatchInput) {
  const receipts = input.ohStoryDeliveryReceipts || {}
  const rawPayload: Record<string, any> = {
    ...(input.chapter?.raw_payload || {}),
    generated_scene_breakdown: input.finalSceneBreakdown,
    oh_story_delivery_receipts: input.ohStoryDeliveryReceipts,
  }
  if (input.postDraftDirector !== undefined) {
    rawPayload.oh_story_director = input.postDraftDirector
    rawPayload.ohStoryDirector = input.postDraftDirector
  }
  if (input.proseAdmission !== undefined) {
    rawPayload.prose_admission = input.proseAdmission
    rawPayload.proseAdmission = input.proseAdmission
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
    chapter_text: normalizeProseForStorage(input.finalText),
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
