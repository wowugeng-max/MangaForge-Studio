import * as core from '../core'
import type * as T from '../types'

const {
  nowIso, openDb, ensureSqliteSchema, ensureLegacyNovelStoreImportedForRead, withNovelDbWrite, withNovelWorkspaceMutation,
  importLegacyNovelStoreIfNeeded, nextTableId, nextChapterVersionNo, createChapterVersionRecord, versionedChapterSnapshotChanged,
  projectFromRow, worldbuildingFromRow, characterFromRow, outlineFromRow, chapterFromRow, chapterVersionFromRow,
  reviewFromRow, reviewSummaryFromRow, runSummaryFromRow, settingEntityFromRow, chapterSettingUsageFromRow, projectSeedDraftFromRow,
  normalizeProjectRecord, normalizeWorldbuildingRecord, normalizeCharacterRecord, normalizeOutlineRecord, normalizeChapterRecord,
  normalizeReviewRecord, normalizeRunRecord, normalizeProjectSeedDraftRecord, normalizeSettingEntityRecord, normalizeChapterSettingUsageRecord,
  insertProjectRow, updateProjectRow, insertWorldbuildingRow, updateWorldbuildingRow, insertCharacterRow, updateCharacterRow,
  insertOutlineRow, updateOutlineRow, insertChapterRow, updateChapterRow, insertChapterVersionRow, insertSettingEntityRow,
  updateSettingEntityRow, insertChapterSettingUsageRow, updateChapterSettingUsageRow, updateRunRow, dedupById, jsonText, textValue,
  parseDbJson, compactRawPayloadForStorage, compactPersistedText, compactReviewPayloadText, sanitizeJsonValue, NESTED_STORAGE_KEYS,
  MAX_PERSISTED_DIAGNOSTIC_CHARS, summarizeNovelRunPipelineRefs, toAnyArray, outlineChapterNo, cleanChapterPlanTitle,
  chapterPlanOutlineTitle, chapterPlanOutlineSummary, loadAcceptanceWorkingSet, persistNovelChapterAcceptanceDelta,
  NOVEL_PIPELINE_SQL_TRIM_CHARS, NOVEL_PIPELINE_CHAPTER_REVIEW_TYPES, NOVEL_PIPELINE_GOVERNANCE_REVIEW_TYPES,
  NOVEL_PIPELINE_BATCH_RUN_TYPES, NOVEL_PIPELINE_REPAIR_RUN_TYPES, NOVEL_PIPELINE_GOVERNANCE_RUN_TYPES,
  pipelineJsonTruthySql, pipelineAnyJsonTruthySql, pipelineJsonAnchorTruthySql, projectNovelPipelineReview, pipelineReviewArray,
  pipelineReviewText, nullableSqliteBoolean,
} = core as any

type NovelProjectRecord = T.NovelProjectRecord
type NovelWorldbuildingRecord = T.NovelWorldbuildingRecord
type NovelCharacterRecord = T.NovelCharacterRecord
type NovelOutlineRecord = T.NovelOutlineRecord
type NovelChapterRecord = T.NovelChapterRecord
type NovelChapterWorkspaceRecord = T.NovelChapterWorkspaceRecord
type NovelChapterVersionRecord = T.NovelChapterVersionRecord
type NovelReviewRecord = T.NovelReviewRecord
type NovelReviewSummaryRecord = T.NovelReviewSummaryRecord
type NovelRunRecord = T.NovelRunRecord
type NovelRunSummaryRecord = T.NovelRunSummaryRecord
type NovelProjectSeedDraftRecord = T.NovelProjectSeedDraftRecord
type NovelSettingEntityRecord = T.NovelSettingEntityRecord
type NovelChapterSettingUsageRecord = T.NovelChapterSettingUsageRecord
type UpdateNovelChapterOptions = T.UpdateNovelChapterOptions
type NovelChapterAcceptanceInput = T.NovelChapterAcceptanceInput
type NovelPipelineSnapshot = T.NovelPipelineSnapshot
type NovelReferenceConfig = T.NovelReferenceConfig

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
