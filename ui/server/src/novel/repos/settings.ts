import type { NovelChapterSettingUsageRecord, NovelSettingEntityRecord } from '../types'
import { openDb, ensureSqliteSchema } from '../db'
import { ensureLegacyNovelStoreImportedForRead } from '../legacy-import'
import { normalizeCharacterRecord, normalizeSettingEntityRecord, normalizeChapterSettingUsageRecord, dedupById } from '../normalize'
import { characterFromRow, settingEntityFromRow, chapterSettingUsageFromRow } from '../row-mappers'
import { withNovelDbWrite, nextTableId, insertSettingEntityRow, updateCharacterRow, updateSettingEntityRow, insertChapterSettingUsageRow, updateChapterSettingUsageRow } from '../sql-rows'
import { mergeJsonObjects } from '../json'


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

export async function mergeNovelSettingEntityState(activeWorkspace: string, id: number, delta: Record<string, any>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const row = db.query('SELECT * FROM setting_entities WHERE id = ? LIMIT 1').get(id) as any
    if (!row) return null
    const current = settingEntityFromRow(row)
    const next = normalizeSettingEntityRecord({
      state_json: mergeJsonObjects(current.state_json, delta),
    }, current)
    updateSettingEntityRow(db, next)
    return next
  }, 'merge-setting-entity-state')
}

function emptyRelationshipValue(value: any) {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return !value.trim()
  if (Array.isArray(value)) return value.length === 0
  return typeof value === 'object' && Object.keys(value).length === 0
}

function mergeNonEmptyValue(base: any, patch: any): any {
  if (emptyRelationshipValue(patch)) return base
  if (Array.isArray(base) || Array.isArray(patch)) {
    const left = (Array.isArray(base) ? base : []).filter(item => !emptyRelationshipValue(item))
    const right = (Array.isArray(patch) ? patch : []).filter(item => !emptyRelationshipValue(item))
    const seen = new Set(left.map(item => JSON.stringify(item)))
    return [...left, ...right.filter(item => {
      const key = JSON.stringify(item)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })]
  }
  if (patch && typeof patch === 'object') {
    const next = base && typeof base === 'object' && !Array.isArray(base) ? { ...base } : {}
    for (const [key, value] of Object.entries(patch)) {
      if (emptyRelationshipValue(value)) continue
      next[key] = emptyRelationshipValue(next[key]) ? value : mergeNonEmptyValue(next[key], value)
    }
    return next
  }
  return patch
}

function mergeCharacterRelationship(current: any[], relation: any) {
  const other = String(relation.name || relation.target || '').trim()
  let found = false
  const relationships = current.map(item => {
    const target = typeof item === 'string'
      ? item.includes(other) ? other : ''
      : String(item?.name || item?.target || '').trim()
    if (!other || target !== other) return item
    found = true
    return typeof item === 'string'
      ? `${other}：${String(relation.status || '').trim()}`
      : mergeNonEmptyValue(item, relation)
  })
  if (!found && other) relationships.push(relation)
  return relationships
}

export async function upsertNovelStoryRelationship(activeWorkspace: string, input: {
  projectId: number
  existingEntityId?: number
  entity: Partial<NovelSettingEntityRecord> & { name: string }
  characterRelations: Array<{ characterName: string; relation: Record<string, any> }>
}) {
  return withNovelDbWrite(activeWorkspace, db => {
    const existingEntityId = Number(input.existingEntityId || 0)
    let row = Number.isInteger(existingEntityId) && existingEntityId > 0
      ? db.query(`
          SELECT * FROM setting_entities
          WHERE id = ? AND project_id = ? AND entity_type = 'relationship'
          LIMIT 1
        `).get(existingEntityId, input.projectId) as any
      : null
    if (!row) {
      row = db.query(`
        SELECT * FROM setting_entities
        WHERE project_id = ? AND entity_type = 'relationship' AND name = ?
        LIMIT 1
      `).get(input.projectId, input.entity.name) as any
    }
    const current = row ? settingEntityFromRow(row) : null
    const entity = normalizeSettingEntityRecord({
      ...input.entity,
      project_id: input.projectId,
      entity_type: 'relationship',
      state_json: mergeNonEmptyValue(current?.state_json || {}, input.entity.state_json || {}),
      payload_json: mergeNonEmptyValue(current?.payload_json || {}, input.entity.payload_json || {}),
    }, current || { id: nextTableId(db, 'setting_entities') })
    if (current) updateSettingEntityRow(db, entity)
    else insertSettingEntityRow(db, entity)

    const characterPatches: Array<{ id: number; name: string; other: string }> = []
    for (const item of input.characterRelations) {
      const characterRow = db.query(`
        SELECT * FROM characters WHERE project_id = ? AND name = ? LIMIT 1
      `).get(input.projectId, item.characterName) as any
      if (!characterRow) continue
      const character = characterFromRow(characterRow)
      const relationships = mergeCharacterRelationship(
        Array.isArray(character.relationships) ? character.relationships : [],
        item.relation,
      )
      const nextCharacter = normalizeCharacterRecord({ relationships }, character)
      updateCharacterRow(db, nextCharacter)
      characterPatches.push({
        id: character.id,
        name: character.name,
        other: String(item.relation.name || item.relation.target || ''),
      })
    }
    return { entity, created: !current, characterPatches }
  }, 'upsert-story-relationship')
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

export async function mergeNovelChapterSettingUsageActualStateChange(activeWorkspace: string, id: number, delta: Record<string, any>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const row = db.query('SELECT * FROM chapter_setting_usage WHERE id = ? LIMIT 1').get(id) as any
    if (!row) return null
    const current = chapterSettingUsageFromRow(row)
    const next = normalizeChapterSettingUsageRecord({
      actual_state_change: mergeJsonObjects(current.actual_state_change, delta),
    }, current)
    updateChapterSettingUsageRow(db, next)
    return next
  }, 'merge-chapter-setting-usage-state')
}
