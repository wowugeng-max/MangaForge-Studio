import { countProseChars } from '../novel-writing/word-target'
import { revisionTextHash } from './revision-hash'
import type {
  NovelChapterRecord,
  NovelChapterVersionRecord,
  NovelReviewRecord,
  NovelRunRecord,
} from './types'

const DAMAGE_RATIO_THRESHOLD = 0.7
const EVIDENCE_WINDOW_MS = 24 * 60 * 60 * 1000
const PREVIEW_EDGE_CHARS = 120

export type EditorRevisionDamageEvidence = {
  project_id: number
  chapter_id: number
  chapter_no: number
  current_hash: string
  current_char_count: number
  suggested_version_id: number
  suggested_version_hash: string
  suggested_version_char_count: number
  ratio: number
  editor_revision_review_ids: number[]
  editor_revision_run_ids: number[]
  diff_summary: {
    removed_chars: number
    added_chars: number
    current_preview: string
    version_preview: string
  }
}

type DamageAuditInput = {
  chapters: NovelChapterRecord[]
  versions: NovelChapterVersionRecord[]
  reviews: NovelReviewRecord[]
  runs: NovelRunRecord[]
}

function parsedObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

function strictChapterId(value: unknown) {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null
  }
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function referencesChapter(value: unknown, chapterId: number) {
  const parsed = parsedObject(value)
  if (!parsed) return false
  return strictChapterId(parsed.chapter_id) === chapterId
    || strictChapterId(parsed.chapterId) === chapterId
}

function timestamp(value: string | undefined) {
  const parsed = Date.parse(String(value || ''))
  return Number.isFinite(parsed) ? parsed : null
}

function isWithinEvidenceWindow(createdAt: string, versionCreatedAt: string) {
  const evidenceTime = timestamp(createdAt)
  const versionTime = timestamp(versionCreatedAt)
  if (evidenceTime === null || versionTime === null) return false
  return evidenceTime >= versionTime && evidenceTime <= versionTime + EVIDENCE_WINDOW_MS
}

function compactPreview(value: string) {
  const compact = String(value || '').replace(/\s+/g, ' ').trim()
  const characters = Array.from(compact)
  if (!characters.length) return ''
  if (characters.length <= 1) return ''

  const retainedCount = Math.min(PREVIEW_EDGE_CHARS * 2, Math.max(0, characters.length - 2))
  const headCount = Math.min(PREVIEW_EDGE_CHARS, Math.ceil(retainedCount / 2))
  const tailCount = Math.min(PREVIEW_EDGE_CHARS, retainedCount - headCount)
  const head = characters.slice(0, headCount).join('')
  const tail = tailCount ? characters.slice(-tailCount).join('') : ''
  return `${head}…${tail}`
}

function sortedUniqueIds(records: Array<{ id: number }>) {
  return [...new Set(records.map(record => record.id))].sort((left, right) => left - right)
}

function highestRepairVersion(chapter: NovelChapterRecord, versions: NovelChapterVersionRecord[]) {
  let selected: NovelChapterVersionRecord | null = null
  for (const candidate of versions) {
    if (
      candidate.chapter_id !== chapter.id
      || candidate.project_id !== chapter.project_id
      || candidate.source !== 'repair'
    ) continue
    if (!selected || candidate.version_no > selected.version_no) selected = candidate
  }
  return selected
}

export function detectEditorRevisionDamage(input: DamageAuditInput): EditorRevisionDamageEvidence[] {
  const evidence: EditorRevisionDamageEvidence[] = []

  for (const chapter of input.chapters) {
    const suggestedVersion = highestRepairVersion(chapter, input.versions)
    if (!suggestedVersion) continue

    const currentText = String(chapter.chapter_text || '')
    const versionText = String(suggestedVersion.chapter_text || '')
    const currentCharCount = countProseChars(currentText)
    const suggestedVersionCharCount = countProseChars(versionText)
    if (suggestedVersionCharCount <= 0) continue

    const ratio = currentCharCount / suggestedVersionCharCount
    if (!(ratio < DAMAGE_RATIO_THRESHOLD)) continue

    const matchingReviews = input.reviews.filter(item => (
      item.project_id === chapter.project_id
      && item.review_type === 'editor_revision'
      && referencesChapter(item.payload, chapter.id)
      && isWithinEvidenceWindow(item.created_at, suggestedVersion.created_at)
    ))
    const matchingRuns = input.runs.filter(item => (
      item.project_id === chapter.project_id
      && item.run_type === 'editor_revision'
      && referencesChapter(item.input_ref, chapter.id)
      && isWithinEvidenceWindow(item.created_at, suggestedVersion.created_at)
    ))
    if (!matchingReviews.length && !matchingRuns.length) continue

    evidence.push({
      project_id: chapter.project_id,
      chapter_id: chapter.id,
      chapter_no: chapter.chapter_no,
      current_hash: revisionTextHash(currentText),
      current_char_count: currentCharCount,
      suggested_version_id: suggestedVersion.id,
      suggested_version_hash: revisionTextHash(versionText),
      suggested_version_char_count: suggestedVersionCharCount,
      ratio,
      editor_revision_review_ids: sortedUniqueIds(matchingReviews),
      editor_revision_run_ids: sortedUniqueIds(matchingRuns),
      diff_summary: {
        removed_chars: Math.max(suggestedVersionCharCount - currentCharCount, 0),
        added_chars: Math.max(currentCharCount - suggestedVersionCharCount, 0),
        current_preview: compactPreview(currentText),
        version_preview: compactPreview(versionText),
      },
    })
  }

  return evidence
}
