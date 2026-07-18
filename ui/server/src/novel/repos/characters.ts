import type { NovelCharacterRecord } from '../types'
import { openDb, ensureSqliteSchema } from '../db'
import { ensureLegacyNovelStoreImportedForRead } from '../legacy-import'
import { normalizeCharacterRecord, dedupById } from '../normalize'
import { characterFromRow } from '../row-mappers'
import { withNovelDbWrite, nextTableId, insertCharacterRow, updateCharacterRow } from '../sql-rows'


export async function listNovelCharacters(activeWorkspace: string, projectId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return dedupById((db.query('SELECT * FROM characters WHERE project_id = ?').all(projectId) as any[]).map(characterFromRow))
  } finally {
    db.close()
  }
}

export async function createNovelCharacter(activeWorkspace: string, data: Partial<NovelCharacterRecord>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const record = normalizeCharacterRecord(data, { id: nextTableId(db, 'characters') })
    insertCharacterRow(db, record)
    return record
  })
}

export async function updateNovelCharacter(activeWorkspace: string, id: number, data: Partial<NovelCharacterRecord>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const row = db.query('SELECT * FROM characters WHERE id = ? LIMIT 1').get(id) as any
    if (!row) return null
    const next = normalizeCharacterRecord(data, characterFromRow(row))
    updateCharacterRow(db, next)
    return next
  })
}
