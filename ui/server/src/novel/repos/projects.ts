import type { NovelProjectRecord } from '../types'
import { openDb, ensureSqliteSchema } from '../db'
import { nowIso } from '../json'
import { ensureLegacyNovelStoreImportedForRead } from '../legacy-import'
import { normalizeProjectRecord, dedupById } from '../normalize'
import { projectFromRow } from '../row-mappers'
import { withNovelDbWrite, nextTableId, insertProjectRow, updateProjectRow } from '../sql-rows'


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
