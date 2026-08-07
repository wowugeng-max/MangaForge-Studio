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

function materialRepairScopeError() {
  return Object.assign(new Error('material repair scope not found'), {
    code: 'MATERIAL_REPAIR_SCOPE_NOT_FOUND',
    error_code: 'MATERIAL_REPAIR_SCOPE_NOT_FOUND',
  })
}

function sha256(value: unknown) {
  return `sha256:${createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex')}`
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
    usageRows: ordered('chapter_setting_usage'),
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

export function materialRepairContextVersionFromDb(db: Database, projectId: number, chapterId: number) {
  return sha256(materialRepairRowsFromDb(db, projectId, chapterId))
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
    const chapters = rows.chapterRows.map(chapterFromRow)
    const projectSettingUsage = rows.usageRows.map(chapterSettingUsageFromRow)
    const snapshot = {
      project: projectFromRow(rows.projectRow),
      chapter: chapters.find(chapter => chapter.id === chapterId)!,
      chapters,
      worldbuilding: rows.worldRows.map(worldbuildingFromRow),
      characters: rows.characterRows.map(characterFromRow),
      outlines: rows.outlineRows.map(outlineFromRow),
      reviews: rows.reviewRows.map(reviewFromRow),
      settings: rows.settingRows.map(settingEntityFromRow),
      projectSettingUsage,
      chapterSettingUsage: projectSettingUsage.filter(usage => usage.chapter_id === chapterId),
      contextVersion: sha256(rows),
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
