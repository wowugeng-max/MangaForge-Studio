import { cleanChapterPlanTitle } from '../../novel/chapter-helpers'
import { openKernelDb } from '../db'

const SUMMARY_MAX = 4000

export function parseChapterNoFromRelPath(relPath: string, text = ''): number | null {
  const name = relPath.split('/').pop() || relPath
  const fromName = name.match(/第\s*(\d+)\s*章/)
  if (fromName) return Number(fromName[1])
  const heading = firstHeadingOf(text)
  const fromHeading = heading.match(/第\s*(\d+)\s*章/)
  if (fromHeading) return Number(fromHeading[1])
  return null
}

export function firstHeadingOf(text: string): string {
  const match = String(text || '').match(/^#+\s*(.+)$/m)
  return match ? match[1].trim() : ''
}

type KernelDb = ReturnType<typeof openKernelDb>

function withDb<T>(ws: string, fn: (db: KernelDb) => T, db?: KernelDb): T {
  if (db) return fn(db)
  const opened = openKernelDb(ws)
  try { return fn(opened) } finally { opened.close() }
}

export function upsertWorldDoc(ws: string, projectId: number, relPath: string, text: string, db?: KernelDb): number {
  return withDb(ws, conn => {
    const summary = text.length > SUMMARY_MAX ? text.slice(0, SUMMARY_MAX) : text
    const payload = JSON.stringify({ kernel_rel_path: relPath, kernel_full_text: text })
    const existing = conn.query(`
      SELECT id FROM worldbuilding WHERE project_id = ? AND json_extract(raw_payload, '$.kernel_rel_path') = ?
    `).get(projectId, relPath) as any
    if (existing) {
      conn.query(`UPDATE worldbuilding SET world_summary = ?, raw_payload = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(summary, payload, existing.id)
      return Number(existing.id)
    }
    conn.query(`INSERT INTO worldbuilding (project_id, world_summary, raw_payload) VALUES (?,?,?)`)
      .run(projectId, summary, payload)
    return Number((conn.query('SELECT last_insert_rowid() AS id').get() as any).id)
  }, db)
}

export function upsertCharacterSheet(ws: string, projectId: number, relPath: string, text: string, db?: KernelDb): number {
  return withDb(ws, conn => {
    const stem = (relPath.split('/').pop() || '').replace(/\.md$/i, '')
    const name = firstHeadingOf(text) || stem || '未命名'
    const payload = JSON.stringify({ kernel_rel_path: relPath })
    const existing = conn.query(`
      SELECT id FROM characters WHERE project_id = ? AND json_extract(raw_payload, '$.kernel_rel_path') = ?
    `).get(projectId, relPath) as any
    if (existing) {
      conn.query(`UPDATE characters SET name = ?, backstory = ?, raw_payload = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(name, text, payload, existing.id)
      return Number(existing.id)
    }
    conn.query(`INSERT INTO characters (project_id, name, backstory, raw_payload) VALUES (?,?,?,?)`)
      .run(projectId, name, text, payload)
    return Number((conn.query('SELECT last_insert_rowid() AS id').get() as any).id)
  }, db)
}

export function upsertOutlineDoc(ws: string, projectId: number, relPath: string, text: string, db?: KernelDb): { outlineId: number; chapterNo: number | null } {
  return withDb(ws, conn => {
    const chapterNo = parseChapterNoFromRelPath(relPath, text)
    const outlineType = chapterNo === null ? 'master' : 'chapter'
    const title = firstHeadingOf(text) || (relPath.split('/').pop() || relPath).replace(/\.md$/i, '')
    const summary = text.length > SUMMARY_MAX ? text.slice(0, SUMMARY_MAX) : text
    const payload = JSON.stringify({ kernel_rel_path: relPath, ...(chapterNo === null ? {} : { chapter_no: chapterNo }) })
    const byPath = conn.query(`
      SELECT id FROM outlines WHERE project_id = ? AND json_extract(raw_payload, '$.kernel_rel_path') = ?
    `).get(projectId, relPath) as any
    const byChapter = !byPath && chapterNo !== null
      ? conn.query(`SELECT id FROM outlines WHERE project_id = ? AND json_extract(raw_payload, '$.chapter_no') = ?`).get(projectId, chapterNo) as any
      : null
    const byTitle = !byPath && !byChapter
      ? conn.query(`SELECT id FROM outlines WHERE project_id = ? AND title = ?`).get(projectId, title) as any
      : null
    const existing = byPath || byChapter || byTitle
    if (existing) {
      conn.query(`UPDATE outlines SET outline_type = ?, title = ?, summary = ?, raw_payload = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(outlineType, title, summary, payload, existing.id)
      return { outlineId: Number(existing.id), chapterNo }
    }
    conn.query(`INSERT INTO outlines (project_id, outline_type, title, summary, raw_payload) VALUES (?,?,?,?,?)`)
      .run(projectId, outlineType, title, summary, payload)
    return { outlineId: Number((conn.query('SELECT last_insert_rowid() AS id').get() as any).id), chapterNo }
  }, db)
}

export function ensureEmptyChapterRow(ws: string, projectId: number, chapterNo: number, title: string, outlineId: number, db?: KernelDb): number | null {
  return withDb(ws, conn => {
    const existing = conn.query(`SELECT id FROM chapters WHERE project_id = ? AND chapter_no = ?`).get(projectId, chapterNo) as any
    if (existing) return null
    conn.query(`INSERT INTO chapters (project_id, outline_id, chapter_no, title, chapter_text) VALUES (?,?,?,?, '')`)
      .run(projectId, outlineId, chapterNo, cleanChapterPlanTitle(chapterNo, title))
    return Number((conn.query('SELECT last_insert_rowid() AS id').get() as any).id)
  }, db)
}
