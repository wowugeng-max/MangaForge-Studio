import type { NovelChapterRecord, NovelChapterVersionRecord, NovelChapterWorkspaceRecord, NovelOutlineRecord, UpdateNovelChapterOptions } from '../types'
import { nextChapterVersionNo, createChapterVersionRecord, versionedChapterSnapshotChanged, outlineChapterNo, cleanChapterPlanTitle, chapterPlanOutlineTitle, chapterPlanOutlineSummary } from '../chapter-helpers'
import { openDb, ensureSqliteSchema } from '../db'
import { nowIso, jsonText, parseDbJson, sanitizeJsonValue, toAnyArray } from '../json'
import { ensureLegacyNovelStoreImportedForRead } from '../legacy-import'
import { normalizeOutlineRecord, normalizeChapterRecord, dedupById } from '../normalize'
import { outlineFromRow, chapterFromRow, chapterVersionFromRow } from '../row-mappers'
import { withNovelDbWrite, nextTableId, insertOutlineRow, updateOutlineRow, insertChapterRow, updateChapterRow, insertChapterVersionRow } from '../sql-rows'
import { compactRawPayloadForStorage, NESTED_STORAGE_KEYS } from '../storage-compaction'


export async function listNovelChapters(activeWorkspace: string, projectId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return dedupById((db.query('SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_no ASC').all(projectId) as any[]).map(chapterFromRow))
      .sort((a, b) => a.chapter_no - b.chapter_no)
  } finally {
    db.close()
  }
}

export async function listNovelWorkspaceChapters(activeWorkspace: string, projectId: number): Promise<NovelChapterWorkspaceRecord[]> {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return (db.query(`
      SELECT
        id,
        project_id,
        outline_id,
        chapter_no,
        title,
        chapter_goal,
        chapter_summary,
        conflict,
        ending_hook,
        timeline_note,
        status,
        version,
        published_at,
        created_at,
        updated_at,
        CASE
          WHEN length(trim(chapter_text)) > 0 AND instr(chapter_text, '【占位正文】') = 0 THEN 1
          ELSE 0
        END AS has_prose,
        CASE
          WHEN (json_valid(scene_breakdown) AND json_array_length(scene_breakdown) > 0)
            OR (json_valid(scene_list) AND json_array_length(scene_list) > 0)
          THEN 1 ELSE 0
        END AS has_scene_plan,
        length(replace(replace(replace(replace(COALESCE(chapter_text, ''), ' ', ''), char(10), ''), char(13), ''), char(9), '')) AS word_count
      FROM chapters
      WHERE project_id = ?
      ORDER BY chapter_no ASC
    `).all(projectId) as any[]).map(item => ({
      ...item,
      has_prose: Boolean(item.has_prose),
      has_scene_plan: Boolean(item.has_scene_plan),
      word_count: Number(item.word_count || 0),
    })) as NovelChapterWorkspaceRecord[]
  } finally {
    db.close()
  }
}

export async function getNovelChapter(activeWorkspace: string, chapterId: number, projectId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    const row = db.query('SELECT * FROM chapters WHERE id = ? AND project_id = ?').get(chapterId, projectId) as any
    return row ? chapterFromRow(row) : null
  } finally {
    db.close()
  }
}

export async function createNovelChapter(activeWorkspace: string, data: Partial<NovelChapterRecord>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const record = normalizeChapterRecord(data, { id: nextTableId(db, 'chapters') })
    insertChapterRow(db, record)
    return record
  })
}

export async function upsertNovelChapterByNumber(activeWorkspace: string, data: Partial<NovelChapterRecord>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const projectId = Number(data.project_id || 0)
    const chapterNo = Number(data.chapter_no || 0)
    const row = db.query('SELECT * FROM chapters WHERE project_id = ? AND chapter_no = ? LIMIT 1').get(projectId, chapterNo) as any
    if (row) {
      const current = chapterFromRow(row)
      const next = { ...current, ...normalizeChapterRecord(data, { ...current, id: current.id, updated_at: nowIso() }), updated_at: nowIso() }
      updateChapterRow(db, next)
      return next
    }
    const record = normalizeChapterRecord(data, { id: nextTableId(db, 'chapters') })
    insertChapterRow(db, record)
    return record
  })
}

export async function syncNovelChapterPlanByNumber(activeWorkspace: string, data: Partial<NovelChapterRecord>, options: {
  parent_id?: number | null
  source?: string
} = {}) {
  return withNovelDbWrite(activeWorkspace, db => {
    const projectId = Number(data.project_id || 0)
    const chapterNo = Number(data.chapter_no || 0)
    if (!projectId || !chapterNo) return null
    const cleanTitle = cleanChapterPlanTitle(chapterNo, data.title)
    const existingChapterRow = db.query('SELECT * FROM chapters WHERE project_id = ? AND chapter_no = ? LIMIT 1').get(projectId, chapterNo) as any
    const existingChapter = existingChapterRow ? chapterFromRow(existingChapterRow) : null
    const outlines = (db.query("SELECT * FROM outlines WHERE project_id = ? AND outline_type = 'chapter'").all(projectId) as any[]).map(outlineFromRow)
    const preferredOutlineId = Number(data.outline_id || existingChapter?.outline_id || 0)
    const existingOutline = outlines.find(outline => Number(outline.id) === preferredOutlineId && String(outline.outline_type || '') === 'chapter')
      || outlines
        .filter(outline => String(outline.outline_type || '') === 'chapter' && outlineChapterNo(outline) === chapterNo)
        .sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')) || Number(b.id || 0) - Number(a.id || 0))[0]
      || null
    const source = options.source || (data.raw_payload as any)?.source || (data.raw_payload as any)?.agent_sync?.source || 'chapter_plan'
    const outlineData: Partial<NovelOutlineRecord> = {
      project_id: projectId,
      outline_type: 'chapter',
      parent_id: options.parent_id ?? existingOutline?.parent_id ?? null,
      title: chapterPlanOutlineTitle(chapterNo, cleanTitle),
      summary: chapterPlanOutlineSummary(data),
      conflict_points: data.conflict ? [String(data.conflict)] : [],
      turning_points: toAnyArray((data.raw_payload as any)?.must_advance ?? (data.raw_payload as any)?.rollingPlan?.payoff ?? []),
      hook: String(data.ending_hook || ''),
      raw_payload: {
        ...(existingOutline?.raw_payload || {}),
        ...(data.raw_payload || {}),
        source,
        chapter_no: chapterNo,
        synced_from_chapter_plan_at: nowIso(),
      },
    }
    let outline: NovelOutlineRecord
    if (existingOutline?.id) {
      outline = normalizeOutlineRecord(outlineData, existingOutline)
      updateOutlineRow(db, outline)
    } else {
      outline = normalizeOutlineRecord(outlineData, { id: nextTableId(db, 'outlines') })
      insertOutlineRow(db, outline)
    }
    if (!outline) return null
    const chapterData = {
      ...data,
      project_id: projectId,
      outline_id: outline.id,
      chapter_no: chapterNo,
      title: cleanTitle,
      raw_payload: {
        ...(data.raw_payload || {}),
        source,
        chapter_outline_id: outline.id,
        chapter_no: chapterNo,
      },
    } as Partial<NovelChapterRecord>
    let chapter: NovelChapterRecord
    if (existingChapter) {
      chapter = { ...existingChapter, ...normalizeChapterRecord(chapterData, { ...existingChapter, id: existingChapter.id, updated_at: nowIso() }), updated_at: nowIso() }
      updateChapterRow(db, chapter)
    } else {
      chapter = normalizeChapterRecord(chapterData, { id: nextTableId(db, 'chapters') })
      insertChapterRow(db, chapter)
    }
    return { outline, chapter }
  })
}

export async function appendChapterVersion(activeWorkspace: string, data: Partial<NovelChapterVersionRecord>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const chapterId = Number(data.chapter_id || 0)
    const record = createChapterVersionRecord({
      ...data,
      id: nextTableId(db, 'chapter_versions'),
      version_no: Number(data.version_no || nextChapterVersionNo(db, chapterId)),
    })
    insertChapterVersionRow(db, record)
    return record
  })
}

export async function listChapterVersions(activeWorkspace: string, chapterId: number) {
  await ensureLegacyNovelStoreImportedForRead(activeWorkspace)
  const db = openDb(activeWorkspace)
  try {
    ensureSqliteSchema(db)
    return (db.query('SELECT * FROM chapter_versions WHERE chapter_id = ? ORDER BY created_at DESC').all(chapterId) as any[])
      .map(chapterVersionFromRow)
      .sort((a, b) => b.version_no - a.version_no)
  } finally {
    db.close()
  }
}

export async function rollbackChapterVersion(activeWorkspace: string, chapterId: number, versionId: number) {
  return withNovelDbWrite(activeWorkspace, db => {
    const chapterRow = db.query('SELECT * FROM chapters WHERE id = ? LIMIT 1').get(chapterId) as any
    const versionRow = db.query('SELECT * FROM chapter_versions WHERE id = ? AND chapter_id = ? LIMIT 1').get(versionId, chapterId) as any
    if (!chapterRow || !versionRow) return null
    const current = chapterFromRow(chapterRow)
    const version = chapterVersionFromRow(versionRow)
    const snapshot = createChapterVersionRecord({
      id: nextTableId(db, 'chapter_versions'),
      chapter_id: current.id,
      project_id: current.project_id,
      version_no: nextChapterVersionNo(db, current.id),
      chapter_text: current.chapter_text || '',
      scene_breakdown: current.scene_breakdown || [],
      continuity_notes: current.continuity_notes || [],
      source: 'rollback',
    })
    insertChapterVersionRow(db, snapshot)
    const next = {
      ...current,
      chapter_text: version.chapter_text,
      scene_breakdown: version.scene_breakdown || [],
      continuity_notes: version.continuity_notes || [],
      updated_at: nowIso(),
    }
    updateChapterRow(db, next)
    return next
  })
}

export async function updateNovelChapter(activeWorkspace: string, chapterId: number, data: Partial<NovelChapterRecord>, options: UpdateNovelChapterOptions = {}) {
  return withNovelDbWrite(activeWorkspace, db => {
    const row = db.query('SELECT * FROM chapters WHERE id = ? LIMIT 1').get(chapterId) as any
    if (!row) return null
    const current = chapterFromRow(row)
    const patch: Partial<NovelChapterRecord> = { ...data }
    if (patch.chapter_text !== undefined) {
      const nextText = String(patch.chapter_text || '')
      const currentText = String(current.chapter_text || '')
      const wiping = !nextText.replace(/\s/g, '') && Boolean(currentText.replace(/\s/g, ''))
      if (wiping && !options.allowEmptyProse && (options.versionSource || 'manual_edit') === 'manual_edit') {
        delete (patch as any).chapter_text
      }
    }
    const updated = normalizeChapterRecord(patch, { ...current, id: current.id, updated_at: nowIso() })
    const next = { ...current, ...updated, updated_at: nowIso() }
    const shouldCreateVersion = options.createVersion !== false && (options.forceVersion || versionedChapterSnapshotChanged(current, next))
    if (shouldCreateVersion) {
      const version = createChapterVersionRecord({
        id: nextTableId(db, 'chapter_versions'),
        chapter_id: current.id,
        project_id: current.project_id,
        version_no: nextChapterVersionNo(db, current.id),
        chapter_text: current.chapter_text || '',
        scene_breakdown: current.scene_breakdown || [],
        continuity_notes: current.continuity_notes || [],
        source: options.versionSource || 'manual_edit',
      })
      insertChapterVersionRow(db, version)
    }
    updateChapterRow(db, next)
    return next
  })
}

export async function mergeNovelChapterRawPayload(activeWorkspace: string, chapterId: number, patch: Record<string, any>) {
  return withNovelDbWrite(activeWorkspace, db => {
    const row = db.query('SELECT raw_payload FROM chapters WHERE id=?').get(chapterId) as any
    if (!row) return null
    const parsed = parseDbJson(row.raw_payload, {})
    const current = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? { ...parsed } : {}
    const sanitized = sanitizeJsonValue(patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {}) as Record<string, any>
    for (const key of NESTED_STORAGE_KEYS) {
      delete current[key]
      delete sanitized[key]
    }
    const merged = compactRawPayloadForStorage({ ...current, ...sanitized })
    for (const key of NESTED_STORAGE_KEYS) delete merged[key]
    db.query('UPDATE chapters SET raw_payload=?, updated_at=? WHERE id=?').run(jsonText(merged, {}), nowIso(), chapterId)
    return merged
  })
}

export async function deleteNovelChapter(activeWorkspace: string, chapterId: number) {
  return withNovelDbWrite(activeWorkspace, db => {
    const chapter = db.query('SELECT id FROM chapters WHERE id = ? LIMIT 1').get(chapterId) as any
    if (!chapter) return false
    db.query('DELETE FROM chapter_versions WHERE chapter_id = ?').run(chapterId)
    db.query('DELETE FROM chapters WHERE id = ?').run(chapterId)
    return true
  })
}
