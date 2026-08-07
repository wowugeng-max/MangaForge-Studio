import { createHash } from 'node:crypto'
import type { Database } from 'bun:sqlite'
import { ensureSqliteSchema, openDb } from './db'
import { ensureLegacyNovelStoreImportedForRead } from './legacy-import'
import {
  chapterFromRow,
  chapterSettingUsageFromRow,
  characterFromRow,
  outlineFromRow,
  projectFromRow,
  reviewFromRow,
  settingEntityFromRow,
  worldbuildingFromRow,
} from './row-mappers'

type MaterialRepairRows = {
  targetChapterId: number
  projectRow: any
  chapterRows: any[]
  worldRows: any[]
  characterRows: any[]
  outlineRows: any[]
  reviewRows: any[]
  settingRows: any[]
  usageRows: any[]
}

type MaterialRepairMappedRows = {
  project: ReturnType<typeof projectFromRow>
  chapter: ReturnType<typeof chapterFromRow>
  chapters: ReturnType<typeof chapterFromRow>[]
  worldbuilding: ReturnType<typeof worldbuildingFromRow>[]
  characters: ReturnType<typeof characterFromRow>[]
  outlines: ReturnType<typeof outlineFromRow>[]
  reviews: ReturnType<typeof reviewFromRow>[]
  settings: ReturnType<typeof settingEntityFromRow>[]
  projectSettingUsage: ReturnType<typeof chapterSettingUsageFromRow>[]
  chapterSettingUsage: ReturnType<typeof chapterSettingUsageFromRow>[]
}

function materialRepairScopeError() {
  return Object.assign(new Error('material repair scope not found'), {
    code: 'MATERIAL_REPAIR_SCOPE_NOT_FOUND',
    error_code: 'MATERIAL_REPAIR_SCOPE_NOT_FOUND',
  })
}

function canonicalJsonValue(value: any): any {
  if (Array.isArray(value)) return value.map(canonicalJsonValue)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(key => [key, canonicalJsonValue(value[key])]),
  )
}

function sha256(value: unknown) {
  return `sha256:${createHash('sha256').update(JSON.stringify(canonicalJsonValue(value)), 'utf8').digest('hex')}`
}

function assertScopeId(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw materialRepairScopeError()
}

function materialRepairRowsFromDb(db: Database, projectId: number, chapterId: number): MaterialRepairRows {
  assertScopeId(projectId)
  assertScopeId(chapterId)
  const ordered = (table: string) => db
    .query(`SELECT * FROM ${table} WHERE project_id = ? ORDER BY id ASC`)
    .all(projectId) as any[]
  const rows: MaterialRepairRows = {
    targetChapterId: chapterId,
    projectRow: db.query('SELECT * FROM projects WHERE id = ? LIMIT 1').get(projectId) as any,
    chapterRows: ordered('chapters'),
    worldRows: ordered('worldbuilding'),
    characterRows: ordered('characters'),
    outlineRows: ordered('outlines'),
    reviewRows: ordered('reviews'),
    settingRows: ordered('setting_entities'),
    usageRows: db.query(`
      SELECT DISTINCT usage.*
      FROM chapter_setting_usage AS usage
      LEFT JOIN chapters AS chapter ON chapter.id = usage.chapter_id
      LEFT JOIN setting_entities AS setting ON setting.id = usage.entity_id
      WHERE usage.project_id = ? OR chapter.project_id = ? OR setting.project_id = ?
      ORDER BY usage.id ASC
    `).all(projectId, projectId, projectId) as any[],
  }
  const chapterIds = new Set(rows.chapterRows.map(row => Number(row.id)))
  const settingIds = new Set(rows.settingRows.map(row => Number(row.id)))
  const outlineIds = new Set(rows.outlineRows.map(row => Number(row.id)))
  const targetChapter = rows.chapterRows.find(row => Number(row.id) === chapterId)
  if (!rows.projectRow || !targetChapter) throw materialRepairScopeError()
  if (rows.chapterRows.some(row => row.outline_id != null && !outlineIds.has(Number(row.outline_id)))) {
    throw materialRepairScopeError()
  }
  if (rows.outlineRows.some(row => row.parent_id != null && !outlineIds.has(Number(row.parent_id)))) {
    throw materialRepairScopeError()
  }
  if (rows.usageRows.some(row => (
    Number(row.project_id) !== projectId
    || !chapterIds.has(Number(row.chapter_id))
    || !settingIds.has(Number(row.entity_id))
  ))) {
    throw materialRepairScopeError()
  }
  return rows
}

function mappedMaterialRepairRows(rows: MaterialRepairRows): MaterialRepairMappedRows {
  const project = projectFromRow(rows.projectRow)
  const chapters = rows.chapterRows.map(chapterFromRow)
  const projectSettingUsage = rows.usageRows.map(chapterSettingUsageFromRow)
  return {
    project,
    chapter: chapters.find(chapter => chapter.id === rows.targetChapterId)!,
    chapters,
    worldbuilding: rows.worldRows.map(worldbuildingFromRow),
    characters: rows.characterRows.map(characterFromRow),
    outlines: rows.outlineRows.map(outlineFromRow),
    reviews: rows.reviewRows.map(reviewFromRow),
    settings: rows.settingRows.map(settingEntityFromRow),
    projectSettingUsage,
    chapterSettingUsage: projectSettingUsage.filter(usage => usage.chapter_id === rows.targetChapterId),
  }
}

function projectMaterialProjection(project: ReturnType<typeof projectFromRow>) {
  const {
    chapter_generation_source: _chapterGenerationSource,
    prose_generation_source: _proseGenerationSource,
    ...materialReferenceConfig
  } = project.reference_config || {}
  const {
    created_at: _createdAt,
    updated_at: _updatedAt,
    reference_config: _referenceConfig,
    ...materialProject
  } = project
  return {
    ...materialProject,
    reference_config: materialReferenceConfig,
  }
}

function materialRepairContextVersion(rows: MaterialRepairRows, mapped: MaterialRepairMappedRows) {
  return sha256({
    targetChapterId: rows.targetChapterId,
    project: projectMaterialProjection(mapped.project),
    chapters: mapped.chapters,
    worldbuilding: mapped.worldbuilding,
    characters: mapped.characters,
    outlines: mapped.outlines,
    reviews: mapped.reviews,
    settings: mapped.settings,
    projectSettingUsage: mapped.projectSettingUsage,
  })
}

export function materialRepairContextVersionFromDb(db: Database, projectId: number, chapterId: number) {
  const rows = materialRepairRowsFromDb(db, projectId, chapterId)
  return materialRepairContextVersion(rows, mappedMaterialRepairRows(rows))
}

export async function loadNovelMaterialRepairSnapshot(
  activeWorkspace: string,
  projectId: number,
  chapterId: number,
) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  let committed = false
  try {
    ensureSqliteSchema(db)
    db.exec('BEGIN')
    const rows = materialRepairRowsFromDb(db, projectId, chapterId)
    const mapped = mappedMaterialRepairRows(rows)
    const snapshot = {
      ...mapped,
      contextVersion: materialRepairContextVersion(rows, mapped),
    }
    db.exec('COMMIT')
    committed = true
    return snapshot
  } catch (error) {
    if (!committed) {
      try { db.exec('ROLLBACK') } catch { /* read transaction may already be closed */ }
    }
    throw error
  } finally {
    db.close()
  }
}

export type NovelMaterialRepairSnapshot = Awaited<ReturnType<typeof loadNovelMaterialRepairSnapshot>>
