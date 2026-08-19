import { parseChapterNoFromRelPath } from './domain-upsert'

export function chapterTextHasProse(text: string): boolean {
  const value = String(text || '')
  return value.trim().length > 0 && !value.includes('【占位正文】')
}

function outlinePayload(raw_payload?: any): Record<string, any> {
  if (raw_payload && typeof raw_payload === 'object' && !Array.isArray(raw_payload)) {
    return raw_payload
  }
  if (typeof raw_payload === 'string' && raw_payload.trim()) {
    try {
      const parsed = JSON.parse(raw_payload)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
    } catch {
      return {}
    }
  }
  return {}
}

export function chapterHasMatchingOutline(
  chapter: { id?: number; outline_id?: number | null; chapter_no: number },
  outlines: Array<{ id: number; raw_payload?: any }>,
): boolean {
  const outlineId = Number(chapter.outline_id || 0)
  if (outlineId && outlines.some(row => Number(row.id) === outlineId)) return true
  const chapterNo = Number(chapter.chapter_no)
  for (const row of outlines) {
    const payload = outlinePayload(row.raw_payload)
    if (Number(payload.chapter_no) === chapterNo) return true
    const rel = String(payload.kernel_rel_path || '')
    if (rel && parseChapterNoFromRelPath(rel) === chapterNo) return true
  }
  return false
}
