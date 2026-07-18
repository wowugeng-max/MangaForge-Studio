import type { NovelOutlineRecord } from '../types'
import { openDb, ensureSqliteSchema } from '../db'
import { ensureLegacyNovelStoreImportedForRead } from '../legacy-import'
import { normalizeOutlineRecord, dedupById } from '../normalize'
import { outlineFromRow } from '../row-mappers'
import { withNovelDbWrite, nextTableId, insertOutlineRow, updateOutlineRow } from '../sql-rows'


export async function listNovelOutlines(activeWorkspace: string, projectId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return dedupById((db.query('SELECT * FROM outlines WHERE project_id = ?').all(projectId) as any[]).map(outlineFromRow))
  } finally {
    db.close()
  }
}

export async function createNovelOutline(activeWorkspace: string, data: Partial<NovelOutlineRecord>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const record = normalizeOutlineRecord(data, { id: nextTableId(db, 'outlines') })
    insertOutlineRow(db, record)
    return record
  })
}

export async function updateNovelOutline(activeWorkspace: string, id: number, data: Partial<NovelOutlineRecord>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const row = db.query('SELECT * FROM outlines WHERE id = ? LIMIT 1').get(id) as any
    if (!row) return null
    const next = normalizeOutlineRecord(data, outlineFromRow(row))
    updateOutlineRow(db, next)
    return next
  })
}

export async function deleteNovelOutline(activeWorkspace: string, outlineId: number) {
  return withNovelDbWrite(activeWorkspace, db => {
    const outline = db.query('SELECT id FROM outlines WHERE id = ? LIMIT 1').get(outlineId) as any
    if (!outline) return false
    db.query('DELETE FROM outlines WHERE id = ?').run(outlineId)
    db.query('UPDATE chapters SET outline_id = NULL WHERE outline_id = ?').run(outlineId)
    return true
  })
}
