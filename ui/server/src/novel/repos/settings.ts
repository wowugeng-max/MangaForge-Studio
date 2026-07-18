import type { NovelChapterSettingUsageRecord, NovelSettingEntityRecord } from '../types'
import { openDb, ensureSqliteSchema } from '../db'
import { ensureLegacyNovelStoreImportedForRead } from '../legacy-import'
import { normalizeSettingEntityRecord, normalizeChapterSettingUsageRecord, dedupById } from '../normalize'
import { settingEntityFromRow, chapterSettingUsageFromRow } from '../row-mappers'
import { withNovelDbWrite, nextTableId, insertSettingEntityRow, updateSettingEntityRow, insertChapterSettingUsageRow, updateChapterSettingUsageRow } from '../sql-rows'


export async function listNovelSettingEntities(activeWorkspace: string, projectId: number, entityType?: string) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const rows = entityType
      ? db.query('SELECT * FROM setting_entities WHERE project_id = ? AND entity_type = ?').all(projectId, entityType) as any[]
      : db.query('SELECT * FROM setting_entities WHERE project_id = ?').all(projectId) as any[]
    return dedupById(rows.map(settingEntityFromRow))
      .sort((a, b) => String(a.entity_type || '').localeCompare(String(b.entity_type || '')) || String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN'))
  } finally {
    db.close()
  }
}

export async function createNovelSettingEntity(activeWorkspace: string, data: Partial<NovelSettingEntityRecord>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const record = normalizeSettingEntityRecord(data, { id: nextTableId(db, 'setting_entities') })
    insertSettingEntityRow(db, record)
    return record
  })
}

export async function updateNovelSettingEntity(activeWorkspace: string, id: number, data: Partial<NovelSettingEntityRecord>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const row = db.query('SELECT * FROM setting_entities WHERE id = ? LIMIT 1').get(id) as any
    if (!row) return null
    const next = normalizeSettingEntityRecord(data, settingEntityFromRow(row))
    updateSettingEntityRow(db, next)
    return next
  })
}

export async function deleteNovelSettingEntity(activeWorkspace: string, id: number) {
  return withNovelDbWrite(activeWorkspace, db => {
    const entity = db.query('SELECT id FROM setting_entities WHERE id = ? LIMIT 1').get(id) as any
    if (!entity) return false
    db.query('DELETE FROM chapter_setting_usage WHERE entity_id = ?').run(id)
    db.query('DELETE FROM setting_entities WHERE id = ?').run(id)
    return true
  })
}

export async function listNovelChapterSettingUsage(activeWorkspace: string, projectId: number, chapterId?: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const rows = chapterId
      ? db.query('SELECT * FROM chapter_setting_usage WHERE project_id = ? AND chapter_id = ? ORDER BY updated_at DESC').all(projectId, chapterId) as any[]
      : db.query('SELECT * FROM chapter_setting_usage WHERE project_id = ? ORDER BY updated_at DESC').all(projectId) as any[]
    return dedupById(rows.map(chapterSettingUsageFromRow))
  } finally {
    db.close()
  }
}

export async function replaceNovelChapterSettingUsage(activeWorkspace: string, projectId: number, chapterId: number, usage: Partial<NovelChapterSettingUsageRecord>[]) {
  return withNovelDbWrite(activeWorkspace, db => {
    db.query('DELETE FROM chapter_setting_usage WHERE project_id = ? AND chapter_id = ?').run(projectId, chapterId)
    let nextId = nextTableId(db, 'chapter_setting_usage')
    const records = usage.map(item => normalizeChapterSettingUsageRecord({ ...item, project_id: projectId, chapter_id: chapterId }, { id: nextId++ })).filter(item => item.entity_id > 0)
    for (const record of records) insertChapterSettingUsageRow(db, record)
    return records
  })
}

export async function updateNovelChapterSettingUsage(activeWorkspace: string, id: number, data: Partial<NovelChapterSettingUsageRecord>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const row = db.query('SELECT * FROM chapter_setting_usage WHERE id = ? LIMIT 1').get(id) as any
    if (!row) return null
    const next = normalizeChapterSettingUsageRecord(data, chapterSettingUsageFromRow(row))
    updateChapterSettingUsageRow(db, next)
    return next
  })
}
