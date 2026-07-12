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

function splitProseSentences(value: string) {
  const text = String(value || '')
  const sentences: string[] = []
  let buffer = ''
  let quoteDepth = 0
  for (const char of text) {
    buffer += char
    if ('“「『'.includes(char)) quoteDepth += 1
    if ('”」』'.includes(char)) quoteDepth = Math.max(0, quoteDepth - 1)
    if (/。|！|？|!|\?|；|;/.test(char) && quoteDepth === 0) {
      const sentence = buffer.trim()
      if (sentence) sentences.push(sentence)
      buffer = ''
    }
  }
  const tail = buffer.trim()
  if (tail) sentences.push(tail)
  return sentences
}

function isDialogueParagraph(value: string) {
  return /^[“「『].*[”」』]$/.test(String(value || '').trim())
}

function restoreParagraphBreaksForSingleLineProse(value: any) {
  const text = String(value || '').replace(/\r\n?/g, '\n').trim()
  if (!text) return text
  const nonEmptyLines = text.split('\n').map(line => line.trim()).filter(Boolean)
  if (nonEmptyLines.length !== 1) return text
  if (proseCharCount(text) < 500) return text
  const sentences = splitProseSentences(text)
  if (sentences.length < 6) return text

  const paragraphs: string[] = []
  let current = ''
  let currentChars = 0
  for (let index = 0; index < sentences.length; index += 1) {
    const sentence = sentences[index]
    const sentenceChars = proseCharCount(sentence)
    const nextSentence = sentences[index + 1] || ''
    const dialogue = isDialogueParagraph(sentence)
    if (dialogue) {
      if (current) paragraphs.push(current)
      paragraphs.push(sentence)
      current = ''
      currentChars = 0
      continue
    }
    if (current && currentChars >= 18 && currentChars + sentenceChars > 78) {
      paragraphs.push(current)
      current = ''
      currentChars = 0
    }
    current += sentence
    currentChars += sentenceChars
    const nextStartsDialogue = isDialogueParagraph(nextSentence)
    if (
      currentChars >= 68
      || (currentChars >= 40 && nextStartsDialogue)
      || (currentChars >= 48 && sentenceChars >= 32)
    ) {
      paragraphs.push(current)
      current = ''
      currentChars = 0
    }
  }
  if (current) paragraphs.push(current)
  return paragraphs.length > 1 ? paragraphs.join('\n\n') : text
}

export function normalizeProseForStorage(value: any) {
  return restoreParagraphBreaksForSingleLineProse(value)
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
