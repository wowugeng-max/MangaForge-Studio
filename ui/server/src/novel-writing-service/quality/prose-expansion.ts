import { getNovelPayload } from '../../routes/novel-route-utils'

export function isLikelyChapterTitleLine(line: string) {
  return /^#{0,6}\s*第[一二三四五六七八九十百千万两0-9]+章(?:\s|$|[：:《「【_ -])/.test(String(line || '').trim())
}

export function proseBodyWithoutTitleLine(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  const firstContentLine = lines.findIndex(line => String(line || '').trim())
  if (firstContentLine >= 0 && isLikelyChapterTitleLine(lines[firstContentLine])) {
    lines.splice(firstContentLine, 1)
  }
  return lines.join('\n').trim()
}

export function proseParagraphsWithoutTitle(text: string) {
  return proseBodyWithoutTitleLine(text)
    .split(/\n\s*\n+/)
    .map(paragraph => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

export function extractProseExpansionPayload(result: any) {
  const payload = getNovelPayload(result)
  const expandedChapters = Array.isArray(payload?.prose_chapters)
    ? payload.prose_chapters
    : Array.isArray(payload?.proseChapters)
      ? payload.proseChapters
      : []
  const expandedFirst = expandedChapters[0] || payload
  return {
    text: String(expandedFirst?.chapter_text || expandedFirst?.chapterText || payload?.chapter_text || payload?.chapterText || ''),
    scene_breakdown: expandedFirst?.scene_breakdown || expandedFirst?.sceneBreakdown || payload?.scene_breakdown || payload?.sceneBreakdown || [],
    continuity_notes: expandedFirst?.continuity_notes || expandedFirst?.continuityNotes || payload?.continuity_notes || payload?.continuityNotes || [],
    expansion_blueprint_patch: expandedFirst?.expansion_blueprint_patch
      || expandedFirst?.expansionBlueprintPatch
      || payload?.expansion_blueprint_patch
      || payload?.expansionBlueprintPatch
      || null,
    payload,
  }
}

export function chunkStructuredReviewFields(fields: string[], batchSize = 4) {
  const size = Math.max(1, Math.min(6, Number(batchSize || 4)))
  const chunks: string[][] = []
  for (let index = 0; index < fields.length; index += size) {
    chunks.push(fields.slice(index, index + size))
  }
  return chunks
}
