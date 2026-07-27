import type {
  CommitEditorRevisionChapterInput,
  CommitEditorRevisionChapterResult,
  EditorRevisionChapterPatch,
  NovelReviewRecord,
} from '../types'
import { createChapterVersionRecord, nextChapterVersionNo } from '../chapter-helpers'
import { jsonText, nowIso, sanitizeJsonValue } from '../json'
import { chapterFromRow, reviewFromRow } from '../row-mappers'
import {
  insertChapterVersionRow,
  nextTableId,
  updateChapterRow,
  withNovelDbWrite,
} from '../sql-rows'
import { revisionTextHash } from '../revision-hash'

const REVIEW_RECEIPT_SELECT = `
  SELECT
    id,
    project_id,
    CASE WHEN json_valid(payload) THEN CAST(json_extract(payload, '$.chapter_id') AS INTEGER) END AS chapter_id,
    CASE WHEN json_valid(payload) THEN CAST(json_extract(payload, '$.chapter_no') AS INTEGER) END AS chapter_no,
    review_type,
    status,
    summary,
    issues,
    payload,
    created_at
  FROM reviews
`

function revisionCommitError(code: string) {
  return Object.assign(new Error(code), { code })
}

function scopeReceiptCollections(value: any, key: string, chapterId: number): any {
  if (Array.isArray(value)) {
    const items = value.map(item => scopeReceiptCollections(item, '', chapterId))
    if (!/receipt/i.test(key)) return items
    return items.filter(item => {
      const receiptChapterId = Number(item?.chapter_id ?? item?.chapterId ?? 0)
      return !receiptChapterId || receiptChapterId === chapterId
    })
  }
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      scopeReceiptCollections(entryValue, entryKey, chapterId),
    ]),
  )
}

function currentChapterReviewPayload(payload: Record<string, unknown>, chapterId: number) {
  return scopeReceiptCollections(sanitizeJsonValue(payload), '', chapterId) as Record<string, unknown>
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function mergePlainObjects(base: unknown, patch: unknown): Record<string, unknown> {
  const current = isPlainObject(base) ? base : {}
  const sanitizedPatch = sanitizeJsonValue(patch)
  if (!isPlainObject(sanitizedPatch)) return { ...current }
  const merged: Record<string, unknown> = { ...current }
  for (const [key, value] of Object.entries(sanitizedPatch)) {
    if (value === undefined) continue
    merged[key] = isPlainObject(value) && isPlainObject(current[key])
      ? mergePlainObjects(current[key], value)
      : value
  }
  return merged
}

function currentPlanFields(patch: EditorRevisionChapterPatch) {
  const allowed: Partial<EditorRevisionChapterPatch> = {}
  for (const key of ['chapter_goal', 'chapter_summary', 'conflict', 'ending_hook'] as const) {
    if (patch[key] !== undefined) allowed[key] = patch[key]
  }
  return allowed
}

export async function commitEditorRevisionChapter(
  workspace: string,
  input: CommitEditorRevisionChapterInput,
): Promise<CommitEditorRevisionChapterResult> {
  return withNovelDbWrite(workspace, db => {
    const chapterRow = db.query(
      'SELECT * FROM chapters WHERE id = ? AND project_id = ? LIMIT 1',
    ).get(input.chapterId, input.projectId) as any
    if (!chapterRow) throw revisionCommitError('CHAPTER_NOT_FOUND')

    const current = chapterFromRow(chapterRow)
    const currentHash = revisionTextHash(current.chapter_text || '')
    const marker = current.raw_payload?.editor_revision_commit
    const markerRunId = Number(marker?.run_id || 0)
    if (revisionTextHash(input.candidateText) !== input.candidateHash) {
      throw revisionCommitError('CANDIDATE_HASH_MISMATCH')
    }

    if (markerRunId === input.runId) {
      if (currentHash !== input.candidateHash) {
        throw revisionCommitError('REVISION_RUN_SUPERSEDED')
      }
      const receiptRow = db.query(`${REVIEW_RECEIPT_SELECT}
        WHERE project_id = ?
          AND review_type = 'editor_revision'
          AND json_valid(payload)
          AND json_type(payload, '$.source_run_id') = 'integer'
          AND json_extract(payload, '$.source_run_id') = ?
          AND json_type(payload, '$.chapter_id') = 'integer'
          AND json_extract(payload, '$.chapter_id') = ?
          AND json_type(payload, '$.candidate_hash') = 'text'
          AND json_extract(payload, '$.candidate_hash') = ?
        ORDER BY id DESC
        LIMIT 1
      `).get(input.projectId, input.runId, input.chapterId, input.candidateHash) as any
      if (!receiptRow) throw revisionCommitError('REVISION_COMMIT_RECEIPT_MISSING')
      return {
        status: 'already_committed',
        chapter: current,
        review: reviewFromRow(receiptRow),
        versionCreated: false,
      }
    }
    if (markerRunId > input.runId) throw revisionCommitError('REVISION_RUN_SUPERSEDED')

    if (currentHash !== input.sourceTextHash) {
      throw revisionCommitError('SOURCE_VERSION_CHANGED')
    }

    const committedAt = nowIso()
    const version = createChapterVersionRecord({
      id: nextTableId(db, 'chapter_versions'),
      chapter_id: current.id,
      project_id: current.project_id,
      version_no: nextChapterVersionNo(db, current.id),
      chapter_text: current.chapter_text || '',
      scene_breakdown: current.scene_breakdown || [],
      continuity_notes: current.continuity_notes || [],
      source: 'repair',
      created_at: committedAt,
    })
    insertChapterVersionRow(db, version)

    const planFields = currentPlanFields(input.chapterPatch)
    const nextChapter = {
      ...current,
      ...planFields,
      chapter_text: input.candidateText,
      raw_payload: {
        ...mergePlainObjects(current.raw_payload, input.chapterPatch.raw_payload),
        editor_revision_commit: {
          run_id: input.runId,
          source_hash: input.sourceTextHash,
          candidate_hash: input.candidateHash,
          committed_at: committedAt,
        },
      },
      updated_at: committedAt,
    }
    updateChapterRow(db, nextChapter)
    const committedChapter = chapterFromRow(
      db.query('SELECT * FROM chapters WHERE id = ? AND project_id = ? LIMIT 1')
        .get(current.id, current.project_id) as any,
    )

    const reviewPayload = {
      ...currentChapterReviewPayload(input.reviewPayload, current.id),
      chapter_id: current.id,
      chapter_no: current.chapter_no,
      source_run_id: input.runId,
      candidate_hash: input.candidateHash,
    }
    const reviewInsert = db.query(`
      INSERT INTO reviews (project_id,review_type,status,summary,issues,payload,created_at)
      VALUES (?,?,?,?,?,?,?)
    `).run(
      current.project_id,
      'editor_revision',
      'ok',
      `Committed editor revision for chapter ${current.chapter_no}`,
      jsonText([]),
      jsonText(reviewPayload, {}),
      committedAt,
    ) as any
    const reviewId = Number(
      reviewInsert?.lastInsertRowid
      || (db.query('SELECT last_insert_rowid() AS id').get() as any)?.id
      || 0,
    )
    const reviewRow = db.query(`${REVIEW_RECEIPT_SELECT} WHERE id = ? LIMIT 1`).get(reviewId) as any

    return {
      status: 'committed',
      chapter: committedChapter,
      review: reviewFromRow(reviewRow) as NovelReviewRecord,
      versionCreated: true,
    }
  }, 'editor_revision_commit')
}
