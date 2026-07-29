import type { NovelReviewRecord, NovelReviewSummaryRecord } from '../types'
import { openDb, ensureSqliteSchema } from '../db'
import { jsonText, nowIso, parseDbJson } from '../json'
import { ensureLegacyNovelStoreImportedForRead } from '../legacy-import'
import { withNovelWorkspaceMutation } from '../lock'
import { normalizeReviewRecord } from '../normalize'
import { reviewFromRow, reviewSummaryFromRow } from '../row-mappers'
import { withNovelDbWrite } from '../sql-rows'


export async function listNovelReviews(activeWorkspace: string, projectId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return (db.query(`
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
      WHERE project_id = ?
    `).all(projectId) as any[]).map(reviewFromRow)
  } finally {
    db.close()
  }
}

export async function listNovelReviewsByType(activeWorkspace: string, projectId: number, reviewType: string) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return (db.query(`
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
      WHERE project_id = ? AND review_type = ?
    `).all(projectId, reviewType) as any[]).map(reviewFromRow)
  } finally {
    db.close()
  }
}

export async function listNovelReviewSummaries(activeWorkspace: string, projectId: number, limit?: number): Promise<NovelReviewSummaryRecord[]> {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const normalizedLimit = Number.isInteger(limit) && Number(limit) > 0 ? Number(limit) : null
    const statement = db.query(`
      SELECT
        id,
        project_id,
        CASE WHEN json_valid(payload) THEN CAST(COALESCE(
          json_extract(payload, '$.chapter_id'),
          json_extract(payload, '$.chapterId'),
          json_extract(payload, '$.quality_card.chapter_id'),
          json_extract(payload, '$.qualityCard.chapterId')
        ) AS INTEGER) END AS chapter_id,
        CASE WHEN json_valid(payload) THEN CAST(COALESCE(
          json_extract(payload, '$.chapter_no'),
          json_extract(payload, '$.chapterNo'),
          json_extract(payload, '$.quality_card.chapter_no'),
          json_extract(payload, '$.qualityCard.chapterNo'),
          json_extract(payload, '$.context_package.chapter_target.chapter_no'),
          json_extract(payload, '$.context_package.summary.chapter_no'),
          json_extract(payload, '$.contextPackage.chapterTarget.chapterNo'),
          json_extract(payload, '$.contextPackage.summary.chapterNo')
        ) AS INTEGER) END AS chapter_no,
        review_type,
        status,
        substr(COALESCE(summary, ''), 1, 240) AS summary,
        CASE WHEN json_valid(issues) AND json_type(issues) = 'array' THEN json_array_length(issues) ELSE 0 END AS issue_count,
        CASE
          WHEN json_valid(issues) AND json_type(issues) = 'array' AND json_array_length(issues) > 0 THEN substr(COALESCE(
            CASE WHEN json_type(issues, '$[0]') = 'text' THEN json_extract(issues, '$[0]') END,
            json_extract(issues, '$[0].message'),
            json_extract(issues, '$[0].label'),
            json_extract(issues, '$[0].type'),
            json_extract(issues, '$[0]')
          ), 1, 180)
          ELSE ''
        END AS preview,
        CASE WHEN json_valid(payload) THEN COALESCE(
          json_extract(payload, '$.score'),
          json_extract(payload, '$.review.score'),
          json_extract(payload, '$.self_check.review.score'),
          json_extract(payload, '$.selfCheck.review.score'),
          json_extract(payload, '$.quality_card.score'),
          json_extract(payload, '$.qualityCard.score'),
          json_extract(payload, '$.report.score')
        ) END AS score,
        CASE WHEN json_valid(payload) THEN COALESCE(
          json_extract(payload, '$.passed'),
          json_extract(payload, '$.publishable'),
          json_extract(payload, '$.review.passed'),
          json_extract(payload, '$.review.publishable'),
          json_extract(payload, '$.self_check.review.passed'),
          json_extract(payload, '$.self_check.review.publishable'),
          json_extract(payload, '$.selfCheck.review.passed'),
          json_extract(payload, '$.selfCheck.review.publishable'),
          json_extract(payload, '$.report.passed')
        ) END AS passed,
        length(CAST(COALESCE(payload, '') AS BLOB)) AS payload_bytes,
        created_at
      FROM reviews
      WHERE project_id = ?
      ORDER BY created_at DESC, id DESC
      ${normalizedLimit ? 'LIMIT ?' : ''}
    `)
    const rows = normalizedLimit ? statement.all(projectId, normalizedLimit) : statement.all(projectId)
    return (rows as any[]).map(reviewSummaryFromRow)
  } finally {
    db.close()
  }
}

export async function getNovelReview(activeWorkspace: string, reviewId: number, projectId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const row = db.query(`
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
      WHERE id = ? AND project_id = ?
    `).get(reviewId, projectId) as any
    return row ? reviewFromRow(row) : null
  } finally {
    db.close()
  }
}

export async function createNovelReview(activeWorkspace: string, data: Partial<NovelReviewRecord>) {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
  const record = normalizeReviewRecord(data)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const result = db.query('INSERT INTO reviews (project_id,review_type,status,summary,issues,payload,created_at) VALUES (?,?,?,?,?,?,?)').run(
      record.project_id,
      record.review_type,
      record.status,
      record.summary || '',
      jsonText(record.issues || []),
      record.payload || '',
      record.created_at,
    ) as any
    const id = Number(result?.lastInsertRowid || (db.query('SELECT last_insert_rowid() AS id').get() as any)?.id || 0)
    return { ...record, id }
  } finally {
    db.close()
  }
  })
}

export async function upsertNovelReviewAnnotationStatus(activeWorkspace: string, input: {
  projectId: number
  annotationKey: string
  status: string
  note?: string
  editorRevisionRunId?: number
  now?: string
}) {
  const timestamp = input.now ? new Date(input.now).toISOString() : nowIso()
  return withNovelDbWrite(activeWorkspace, db => {
    const revisionRunId = Number(input.editorRevisionRunId || 0)
    if (input.editorRevisionRunId !== undefined) {
      const revision = db.query(`
        SELECT status, output_ref
        FROM runs
        WHERE id = ? AND project_id = ? AND run_type = 'editor_revision'
        LIMIT 1
      `).get(revisionRunId, input.projectId) as any
      const checkpoint = parseDbJson(revision?.output_ref, {})
      if (!revision
        || !['completed', 'failed', 'canceled'].includes(String(revision.status || ''))
        || checkpoint?.prose_persisted !== true) {
        throw Object.assign(new Error('editor revision annotation closure is not ready'), {
          code: 'REVISION_ANNOTATION_STATUS_NOT_READY',
        })
      }
      const existing = db.query(`
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
        WHERE project_id = ?
          AND review_type = 'review_annotation_status'
          AND json_valid(payload)
          AND CAST(json_extract(payload, '$.editor_revision_run_id') AS INTEGER) = ?
        ORDER BY id ASC
        LIMIT 1
      `).get(input.projectId, revisionRunId) as any
      if (existing) {
        const existingReview = reviewFromRow(existing)
        const existingPayload = parseDbJson(existingReview.payload, {})
        if (String(existingPayload?.annotation_key || '') !== input.annotationKey
          || String(existingPayload?.status || '') !== input.status
          || String(existingPayload?.note || '') !== String(input.note || '')) {
          throw Object.assign(new Error('editor revision annotation receipt conflicts with the committed request'), {
            code: 'REVISION_ANNOTATION_STATUS_CONFLICT',
          })
        }
        return existingReview
      }
    }

    const receipt = revisionRunId ? {
      editor_revision_run_id: revisionRunId,
      annotation_key: input.annotationKey,
      status: input.status,
      completed_at: timestamp,
    } : null
    const record = normalizeReviewRecord({
      project_id: input.projectId,
      review_type: 'review_annotation_status',
      status: input.status,
      summary: `${input.status === 'resolved' ? '已处理' : '已更新'}批注：${input.annotationKey.slice(0, 80)}`,
      issues: [],
      payload: JSON.stringify({
        annotation_key: input.annotationKey,
        status: input.status,
        note: String(input.note || ''),
        resolved_at: input.status === 'resolved' ? timestamp : null,
        ...(revisionRunId ? {
          editor_revision_run_id: revisionRunId,
          editor_revision_annotation_receipt: receipt,
        } : {}),
      }),
      created_at: timestamp,
    })
    const result = db.query(`
      INSERT INTO reviews (project_id,review_type,status,summary,issues,payload,created_at)
      VALUES (?,?,?,?,?,?,?)
    `).run(
      record.project_id,
      record.review_type,
      record.status,
      record.summary || '',
      jsonText(record.issues || []),
      record.payload || '',
      record.created_at,
    ) as any
    const id = Number(result?.lastInsertRowid || (db.query('SELECT last_insert_rowid() AS id').get() as any)?.id || 0)
    const inserted = db.query(`
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
      WHERE id = ?
    `).get(id) as any
    return reviewFromRow(inserted)
  }, 'upsert-review-annotation-status')
}

export async function findOrCreateNovelReviewByReceipt(activeWorkspace: string, input: {
  data: Partial<NovelReviewRecord>
  receiptKey: string
  derivedKey: string
}) {
  return withNovelDbWrite(activeWorkspace, db => {
    const recordPayload = parseDbJson(input.data.payload, {})
    const record = normalizeReviewRecord({
      ...input.data,
      payload: jsonText({
        ...(recordPayload && typeof recordPayload === 'object' && !Array.isArray(recordPayload) ? recordPayload : {}),
        story_state_receipt_key: input.receiptKey,
        derived_key: input.derivedKey,
      }, {}),
    })
    const select = `
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
    const existing = db.query(`${select}
      WHERE project_id = ?
        AND review_type = ?
        AND json_valid(payload)
        AND json_type(payload, '$.story_state_receipt_key') = 'text'
        AND json_extract(payload, '$.story_state_receipt_key') = ?
        AND json_type(payload, '$.derived_key') = 'text'
        AND json_extract(payload, '$.derived_key') = ?
      ORDER BY id DESC
      LIMIT 1
    `).get(record.project_id, record.review_type, input.receiptKey, input.derivedKey) as any
    if (existing) return reviewFromRow(existing)

    const result = db.query(`
      INSERT INTO reviews (project_id,review_type,status,summary,issues,payload,created_at)
      VALUES (?,?,?,?,?,?,?)
    `).run(
      record.project_id,
      record.review_type,
      record.status,
      record.summary || '',
      jsonText(record.issues || []),
      record.payload || '',
      record.created_at,
    ) as any
    const id = Number(result?.lastInsertRowid || (db.query('SELECT last_insert_rowid() AS id').get() as any)?.id || 0)
    return { ...record, id }
  }, 'find-or-create-story-state-derived-review')
}
