import type { NovelWorldbuildingRecord } from '../types'
import { openDb, ensureSqliteSchema } from '../db'
import { ensureLegacyNovelStoreImportedForRead } from '../legacy-import'
import { normalizeWorldbuildingRecord, dedupById } from '../normalize'
import { worldbuildingFromRow } from '../row-mappers'
import { withNovelDbWrite, nextTableId, insertWorldbuildingRow, updateWorldbuildingRow } from '../sql-rows'


export async function listNovelWorldbuilding(activeWorkspace: string, projectId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return dedupById((db.query('SELECT * FROM worldbuilding WHERE project_id = ?').all(projectId) as any[]).map(worldbuildingFromRow))
  } finally {
    db.close()
  }
}

export async function createNovelWorldbuilding(activeWorkspace: string, data: Partial<NovelWorldbuildingRecord>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const record = normalizeWorldbuildingRecord(data, { id: nextTableId(db, 'worldbuilding') })
    insertWorldbuildingRow(db, record)
    return record
  })
}

export async function updateNovelWorldbuilding(activeWorkspace: string, id: number, data: Partial<NovelWorldbuildingRecord>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const row = db.query('SELECT * FROM worldbuilding WHERE id = ? LIMIT 1').get(id) as any
    if (!row) return null
    const next = normalizeWorldbuildingRecord(data, worldbuildingFromRow(row))
    updateWorldbuildingRow(db, next)
    return next
  })
}
