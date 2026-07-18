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

export async function listNovelProjectSeedDrafts(activeWorkspace: string) {
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const rows = db.query('SELECT * FROM project_seed_drafts ORDER BY updated_at DESC, id DESC').all() as any[]
    return rows.map(projectSeedDraftFromRow)
  } finally {
    db.close()
  }
}

export async function createNovelProjectSeedDraft(activeWorkspace: string, data: Partial<NovelProjectSeedDraftRecord>) {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
  const draft = normalizeProjectSeedDraftRecord(data)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const result = db.query('INSERT INTO project_seed_drafts (title,idea,seed,review_model,diagnostics,model_id,source,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run(
      draft.title,
      draft.idea || '',
      jsonText(draft.seed, {}),
      jsonText(draft.review_model, {}),
      jsonText(draft.diagnostics, {}),
      draft.model_id ?? null,
      draft.source || 'deep_draft',
      draft.created_at,
      draft.updated_at,
    ) as any
    const id = Number(result?.lastInsertRowid || (db.query('SELECT last_insert_rowid() AS id').get() as any)?.id || 0)
    const row = db.query('SELECT * FROM project_seed_drafts WHERE id=?').get(id) as any
    return projectSeedDraftFromRow(row)
  } finally {
    db.close()
  }
  })
}

export async function deleteNovelProjectSeedDraft(activeWorkspace: string, id: number) {
  return withNovelWorkspaceMutation(activeWorkspace, async () => {
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const result = db.query('DELETE FROM project_seed_drafts WHERE id=?').run(id) as any
    return Number(result?.changes || 0) > 0
  } finally {
    db.close()
  }
  })
}
