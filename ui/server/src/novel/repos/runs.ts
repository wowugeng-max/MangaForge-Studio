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

export async function listNovelRuns(activeWorkspace: string, projectId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return (db.query(`
      SELECT id, project_id, run_type, step_name, status, input_ref, output_ref, duration_ms, error_message, created_at
      FROM runs
      WHERE project_id = ?
      ORDER BY created_at DESC
    `).all(projectId) as NovelRunRecord[])
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  } finally {
    db.close()
  }
}

export async function listNovelRunSummaries(activeWorkspace: string, projectId: number, limit?: number): Promise<NovelRunSummaryRecord[]> {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const currentChapterIndexSql = `CASE
      WHEN json_type(output_ref, '$.chapters') = 'array'
        AND json_array_length(output_ref, '$.chapters') > 0
      THEN MIN(
        MAX(CAST(COALESCE(json_extract(output_ref, '$.current_index'), 0) AS INTEGER), 0),
        json_array_length(output_ref, '$.chapters') - 1
      )
      ELSE 0
    END`
    const normalizedLimit = Number.isInteger(limit) && Number(limit) > 0 ? Number(limit) : null
    const statement = db.query(`
      SELECT
        id,
        project_id,
        run_type,
        step_name,
        status,
        duration_ms,
        error_message,
        created_at,
        CASE WHEN json_valid(output_ref) THEN CAST(COALESCE(
          json_extract(output_ref, '$.chapter_id'),
          json_extract(output_ref, '$.chapterId'),
          json_extract(output_ref, '$.chapter.id'),
          json_extract(output_ref, '$.result.chapter_id'),
          json_extract(output_ref, '$.result.chapterId'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].id')
        ) AS INTEGER) END AS chapter_id,
        CASE WHEN json_valid(output_ref) THEN CAST(COALESCE(
          json_extract(output_ref, '$.chapter_no'),
          json_extract(output_ref, '$.chapterNo'),
          json_extract(output_ref, '$.chapter.chapter_no'),
          json_extract(output_ref, '$.chapter.chapterNo'),
          json_extract(output_ref, '$.result.chapter_no'),
          json_extract(output_ref, '$.result.chapterNo'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].chapter_no'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].chapterNo')
        ) AS INTEGER) END AS chapter_no,
        length(CAST(COALESCE(input_ref, '') AS BLOB)) AS input_bytes,
        length(CAST(COALESCE(output_ref, '') AS BLOB)) AS output_bytes,
        CASE WHEN json_valid(output_ref) THEN COALESCE(
          json_extract(output_ref, '$.admission_status'),
          json_extract(output_ref, '$.admissionStatus'),
          json_extract(output_ref, '$.prose_admission.status'),
          json_extract(output_ref, '$.proseAdmission.status'),
          json_extract(output_ref, '$.result.admission_status'),
          json_extract(output_ref, '$.result.admissionStatus'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].admission_status'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].admissionStatus'),
          ''
        ) ELSE '' END AS admission_status,
        CASE WHEN json_valid(output_ref) THEN COALESCE(
          CASE WHEN json_type(output_ref, '$.quality_warnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.quality_warnings')) END,
          CASE WHEN json_type(output_ref, '$.qualityWarnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.qualityWarnings')) END,
          CASE WHEN json_type(output_ref, '$.prose_admission.quality_warnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.prose_admission.quality_warnings')) END,
          CASE WHEN json_type(output_ref, '$.proseAdmission.qualityWarnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.proseAdmission.qualityWarnings')) END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].quality_warnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].quality_warnings')) END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].qualityWarnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].qualityWarnings')) END,
          0
        ) ELSE 0 END AS admission_warning_count,
        CASE WHEN json_valid(output_ref) THEN substr(COALESCE(
          json_extract(output_ref, '$.quality_warnings[0].message'),
          json_extract(output_ref, '$.qualityWarnings[0].message'),
          json_extract(output_ref, '$.prose_admission.quality_warnings[0].message'),
          json_extract(output_ref, '$.proseAdmission.qualityWarnings[0].message'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].quality_warnings[0].message'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].qualityWarnings[0].message'),
          CASE WHEN json_type(output_ref, '$.quality_warnings[0]') = 'text' THEN json_extract(output_ref, '$.quality_warnings[0]') END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].quality_warnings[0]') = 'text' THEN json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].quality_warnings[0]') END,
          ''
        ), 1, 220) ELSE '' END AS admission_warning_preview,
        CASE WHEN json_valid(output_ref) THEN COALESCE(
          json_extract(output_ref, '$.story_state_status'),
          json_extract(output_ref, '$.storyStateStatus'),
          json_extract(output_ref, '$.prose_admission.story_state_status'),
          json_extract(output_ref, '$.proseAdmission.storyStateStatus'),
          json_extract(output_ref, '$.result.story_state_status'),
          json_extract(output_ref, '$.result.storyStateStatus'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].story_state_status'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].storyStateStatus'),
          ''
        ) ELSE '' END AS story_state_status,
        CASE WHEN json_valid(output_ref) AND (
          COALESCE(
            json_extract(output_ref, '$.story_state_warning'),
            json_extract(output_ref, '$.storyStateWarning'),
            json_extract(output_ref, '$.prose_admission.story_state_warning'),
            json_extract(output_ref, '$.proseAdmission.storyStateWarning'),
            json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].story_state_warning'),
            json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].storyStateWarning')
          ) IS NOT NULL
          OR lower(COALESCE(
            json_extract(output_ref, '$.story_state_status'),
            json_extract(output_ref, '$.storyStateStatus'),
            json_extract(output_ref, '$.prose_admission.story_state_status'),
            json_extract(output_ref, '$.proseAdmission.storyStateStatus'),
            json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].story_state_status'),
            json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].storyStateStatus'),
            ''
          )) = 'pending'
        ) THEN 1 ELSE 0 END AS story_state_pending,
        CASE WHEN json_valid(output_ref) THEN substr(COALESCE(
          json_extract(output_ref, '$.story_state_warning.message'),
          json_extract(output_ref, '$.storyStateWarning.message'),
          json_extract(output_ref, '$.prose_admission.story_state_warning.message'),
          json_extract(output_ref, '$.proseAdmission.storyStateWarning.message'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].story_state_warning.message'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].storyStateWarning.message'),
          CASE WHEN json_type(output_ref, '$.story_state_warning') = 'text' THEN json_extract(output_ref, '$.story_state_warning') END,
          CASE WHEN json_type(output_ref, '$.storyStateWarning') = 'text' THEN json_extract(output_ref, '$.storyStateWarning') END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].story_state_warning') = 'text' THEN json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].story_state_warning') END,
          ''
        ), 1, 220) ELSE '' END AS story_state_warning,
        CASE WHEN json_valid(output_ref) THEN COALESCE(
          CASE WHEN json_type(output_ref, '$.post_commit_warnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.post_commit_warnings')) END,
          CASE WHEN json_type(output_ref, '$.postCommitWarnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.postCommitWarnings')) END,
          CASE WHEN json_type(output_ref, '$.prose_admission.post_commit_warnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.prose_admission.post_commit_warnings')) END,
          CASE WHEN json_type(output_ref, '$.proseAdmission.postCommitWarnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.proseAdmission.postCommitWarnings')) END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].post_commit_warnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].post_commit_warnings')) END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].postCommitWarnings') = 'array' THEN json_array_length(json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].postCommitWarnings')) END,
          0
        ) ELSE 0 END AS post_commit_warning_count,
        CASE WHEN json_valid(output_ref) THEN substr(COALESCE(
          json_extract(output_ref, '$.post_commit_warnings[0].message'),
          json_extract(output_ref, '$.postCommitWarnings[0].message'),
          json_extract(output_ref, '$.prose_admission.post_commit_warnings[0].message'),
          json_extract(output_ref, '$.proseAdmission.postCommitWarnings[0].message'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].post_commit_warnings[0].message'),
          json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].postCommitWarnings[0].message'),
          CASE WHEN json_type(output_ref, '$.post_commit_warnings[0]') = 'text' THEN json_extract(output_ref, '$.post_commit_warnings[0]') END,
          CASE WHEN json_type(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].post_commit_warnings[0]') = 'text' THEN json_extract(output_ref, '$.chapters[' || ${currentChapterIndexSql} || '].post_commit_warnings[0]') END,
          ''
        ), 1, 220) ELSE '' END AS post_commit_warning_preview
      FROM runs
      WHERE project_id = ?
      ORDER BY created_at DESC, id DESC
      ${normalizedLimit ? 'LIMIT ?' : ''}
    `)
    const rows = normalizedLimit ? statement.all(projectId, normalizedLimit) : statement.all(projectId)
    return (rows as any[]).map(runSummaryFromRow)
  } finally {
    db.close()
  }
}

export async function getNovelRun(activeWorkspace: string, runId: number, projectId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return (db.query(`
      SELECT id, project_id, run_type, step_name, status, input_ref, output_ref, duration_ms, error_message, created_at
      FROM runs
      WHERE id = ? AND project_id = ?
    `).get(runId, projectId) as NovelRunRecord | null) || null
  } finally {
    db.close()
  }
}

export async function appendNovelRun(activeWorkspace: string, data: Partial<NovelRunRecord>) {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
  const record = normalizeRunRecord(data)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const result = db.query('INSERT INTO runs (project_id,run_type,step_name,status,input_ref,output_ref,duration_ms,error_message,pipeline_chapter_failure_count,pipeline_open_task_count,pipeline_task_count,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(
      record.project_id,
      record.run_type,
      record.step_name,
      record.status,
      record.input_ref || '',
      record.output_ref || '',
      record.duration_ms || 0,
      record.error_message || '',
      record.pipeline_chapter_failure_count ?? 0,
      record.pipeline_open_task_count ?? 0,
      record.pipeline_task_count ?? 0,
      record.created_at,
    ) as any
    const id = Number(result?.lastInsertRowid || (db.query('SELECT last_insert_rowid() AS id').get() as any)?.id || 0)
    return { ...record, id }
  } finally {
    db.close()
  }
  })
}

export async function updateNovelRun(activeWorkspace: string, id: number, data: Partial<NovelRunRecord>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const row = db.query('SELECT * FROM runs WHERE id = ? LIMIT 1').get(id) as any
    if (!row) return null
    const next = normalizeRunRecord(data, row)
    updateRunRow(db, next)
    return next
  })
}
