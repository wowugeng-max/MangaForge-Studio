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

export async function listNovelProjects(activeWorkspace: string) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return dedupById((db.query('SELECT * FROM projects ORDER BY updated_at DESC').all() as any[]).map(projectFromRow))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  } finally {
    db.close()
  }
}

export async function createNovelProject(activeWorkspace: string, data: Partial<NovelProjectRecord>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const project = normalizeProjectRecord(data, { id: nextTableId(db, 'projects') })
    insertProjectRow(db, project)
    return project
  })
}

export async function getNovelProject(activeWorkspace: string, id: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const row = db.query('SELECT * FROM projects WHERE id = ? LIMIT 1').get(id) as any
    return row ? projectFromRow(row) : null
  } finally {
    db.close()
  }
}

export async function updateNovelProject(activeWorkspace: string, id: number, data: Partial<NovelProjectRecord>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const row = db.query('SELECT * FROM projects WHERE id = ? LIMIT 1').get(id) as any
    if (!row) return null
    const current = projectFromRow(row)
    const next = { ...current, ...normalizeProjectRecord(data, { ...current, id, updated_at: nowIso() }), updated_at: nowIso() }
    updateProjectRow(db, next)
    return next
  })
}

export async function deleteNovelProject(activeWorkspace: string, projectId: number) {
  return withNovelDbWrite(activeWorkspace, db => {
    const project = db.query('SELECT id FROM projects WHERE id = ? LIMIT 1').get(projectId) as any
    if (!project) return false
    db.query('DELETE FROM chapter_setting_usage WHERE project_id = ?').run(projectId)
    db.query('DELETE FROM setting_entities WHERE project_id = ?').run(projectId)
    db.query('DELETE FROM reviews WHERE project_id = ?').run(projectId)
    db.query('DELETE FROM runs WHERE project_id = ?').run(projectId)
    db.query('DELETE FROM chapter_versions WHERE project_id = ?').run(projectId)
    db.query('DELETE FROM chapters WHERE project_id = ?').run(projectId)
    db.query('DELETE FROM outlines WHERE project_id = ?').run(projectId)
    db.query('DELETE FROM characters WHERE project_id = ?').run(projectId)
    db.query('DELETE FROM worldbuilding WHERE project_id = ?').run(projectId)
    db.query('DELETE FROM projects WHERE id = ?').run(projectId)
    return true
  })
}
