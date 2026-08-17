import { cleanChapterPlanTitle } from '../../novel/chapter-helpers'
import { openKernelDb } from '../db'

const SUMMARY_MAX = 4000

export function parseChapterNoFromRelPath(relPath: string): number | null {
  const name = relPath.split('/').pop() || relPath
  const match = name.match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : null
}

export function firstHeadingOf(text: string): string {
  const match = String(text || '').match(/^#+\s*(.+)$/m)
  return match ? match[1].trim() : ''
}

function withDb<T>(ws: string, fn: (db: ReturnType<typeof openKernelDb>) => T): T {
  const db = openKernelDb(ws)
  try { return fn(db) } finally { db.close() }
}

export function upsertWorldDoc(ws: string, projectId: number, relPath: string, text: string): number {
  return withDb(ws, db => {
    const summary = text.length > SUMMARY_MAX ? text.slice(0, SUMMARY_MAX) : text
    const payload = JSON.stringify({ kernel_rel_path: relPath, kernel_full_text: text })
    const existing = db.query(`
      SELECT id FROM worldbuilding WHERE project_id = ? AND json_extract(raw_payload, '$.kernel_rel_path') = ?
    `).get(projectId, relPath) as any
    if (existing) {
      db.query(`UPDATE worldbuilding SET world_summary = ?, raw_payload = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(summary, payload, existing.id)
      return Number(existing.id)
    }
    db.query(`INSERT INTO worldbuilding (project_id, world_summary, raw_payload) VALUES (?,?,?)`)
      .run(projectId, summary, payload)
    return Number((db.query('SELECT last_insert_rowid() AS id').get() as any).id)
  })
}

export function upsertCharacterSheet(ws: string, projectId: number, relPath: string, text: string): number {
  return withDb(ws, db => {
    const stem = (relPath.split('/').pop() || '').replace(/\.md$/i, '')
    const name = stem || firstHeadingOf(text) || '未命名'
    const payload = JSON.stringify({ kernel_rel_path: relPath })
    const existing = db.query(`SELECT id FROM characters WHERE project_id = ? AND name = ?`).get(projectId, name) as any
    if (existing) {
      db.query(`UPDATE characters SET backstory = ?, raw_payload = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(text, payload, existing.id)
      return Number(existing.id)
    }
    db.query(`INSERT INTO characters (project_id, name, backstory, raw_payload) VALUES (?,?,?,?)`)
      .run(projectId, name, text, payload)
    return Number((db.query('SELECT last_insert_rowid() AS id').get() as any).id)
  })
}

export function upsertOutlineDoc(ws: string, projectId: number, relPath: string, text: string): { outlineId: number; chapterNo: number | null } {
  return withDb(ws, db => {
    const chapterNo = parseChapterNoFromRelPath(relPath)
    const outlineType = chapterNo === null ? 'master' : 'chapter'
    const title = firstHeadingOf(text) || (relPath.split('/').pop() || relPath).replace(/\.md$/i, '')
    const summary = text.length > SUMMARY_MAX ? text.slice(0, SUMMARY_MAX) : text
    const payload = JSON.stringify({ kernel_rel_path: relPath, ...(chapterNo === null ? {} : { chapter_no: chapterNo }) })
    const byPath = db.query(`
      SELECT id FROM outlines WHERE project_id = ? AND json_extract(raw_payload, '$.kernel_rel_path') = ?
    `).get(projectId, relPath) as any
    const byChapter = !byPath && chapterNo !== null
      ? db.query(`SELECT id FROM outlines WHERE project_id = ? AND json_extract(raw_payload, '$.chapter_no') = ?`).get(projectId, chapterNo) as any
      : null
    const byTitle = !byPath && !byChapter
      ? db.query(`SELECT id FROM outlines WHERE project_id = ? AND title = ?`).get(projectId, title) as any
      : null
    const existing = byPath || byChapter || byTitle
    if (existing) {
      db.query(`UPDATE outlines SET outline_type = ?, title = ?, summary = ?, raw_payload = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(outlineType, title, summary, payload, existing.id)
      return { outlineId: Number(existing.id), chapterNo }
    }
    db.query(`INSERT INTO outlines (project_id, outline_type, title, summary, raw_payload) VALUES (?,?,?,?,?)`)
      .run(projectId, outlineType, title, summary, payload)
    return { outlineId: Number((db.query('SELECT last_insert_rowid() AS id').get() as any).id), chapterNo }
  })
}

export function ensureEmptyChapterRow(ws: string, projectId: number, chapterNo: number, title: string, outlineId: number): number | null {
  return withDb(ws, db => {
    const existing = db.query(`SELECT id FROM chapters WHERE project_id = ? AND chapter_no = ?`).get(projectId, chapterNo) as any
    if (existing) return null
    db.query(`INSERT INTO chapters (project_id, outline_id, chapter_no, title, chapter_text) VALUES (?,?,?,?, '')`)
      .run(projectId, outlineId, chapterNo, cleanChapterPlanTitle(chapterNo, title))
    return Number((db.query('SELECT last_insert_rowid() AS id').get() as any).id)
  })
}
