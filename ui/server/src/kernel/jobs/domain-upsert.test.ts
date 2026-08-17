import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openKernelDb } from '../db'
import {
  ensureEmptyChapterRow, parseChapterNoFromRelPath,
  upsertCharacterSheet, upsertOutlineDoc, upsertWorldDoc,
} from './domain-upsert'

function makeWs(): string {
  const ws = mkdtempSync(join(tmpdir(), 'kernel-upsert-'))
  const db = openKernelDb(ws)
  db.query(`INSERT INTO projects (id, title) VALUES (1, '试作')`).run()
  db.close()
  return ws
}

describe('domain upserts', () => {
  test('parseChapterNoFromRelPath', () => {
    expect(parseChapterNoFromRelPath('大纲/细纲_第003章.md')).toBe(3)
    expect(parseChapterNoFromRelPath('大纲/卷纲_第1卷.md')).toBeNull()
    expect(parseChapterNoFromRelPath('大纲/大纲.md')).toBeNull()
    expect(parseChapterNoFromRelPath('大纲/细纲.md')).toBeNull()
  })
  test('outline upsert parses chapter no from first heading when filename lacks it', () => {
    const ws = makeWs()
    const { chapterNo } = upsertOutlineDoc(ws, 1, '大纲/细纲.md', '# 第003章 初入怪谈\n细纲内容')
    expect(chapterNo).toBe(3)
  })
  test('world upsert keyed by kernel_rel_path, second call updates in place', () => {
    const ws = makeWs()
    const id1 = upsertWorldDoc(ws, 1, '设定/势力/铁誓盟.md', '全文A')
    const id2 = upsertWorldDoc(ws, 1, '设定/势力/铁誓盟.md', '全文B')
    expect(id2).toBe(id1)
    const db = openKernelDb(ws)
    const rows = db.query(`SELECT world_summary, raw_payload FROM worldbuilding WHERE project_id = 1`).all() as any[]
    db.close()
    expect(rows.length).toBe(1)
    expect(JSON.parse(rows[0].raw_payload).kernel_full_text).toBe('全文B')
  })
  test('character upsert keyed by filename stem as name', () => {
    const ws = makeWs()
    upsertCharacterSheet(ws, 1, '设定/角色/楚弦.md', '# 楚弦\n档案1')
    upsertCharacterSheet(ws, 1, '设定/角色/楚弦.md', '# 楚弦\n档案2')
    const db = openKernelDb(ws)
    const rows = db.query(`SELECT name, backstory FROM characters WHERE project_id = 1`).all() as any[]
    db.close()
    expect(rows.length).toBe(1)
    expect(rows[0].name).toBe('楚弦')
    expect(rows[0].backstory).toContain('档案2')
  })
  test('outline upsert: chapter-parsable becomes outline_type=chapter; empty chapter row created once', () => {
    const ws = makeWs()
    const { outlineId, chapterNo } = upsertOutlineDoc(ws, 1, '大纲/细纲_第001章.md', '# 第001章 初入怪谈\n细纲内容')
    expect(chapterNo).toBe(1)
    const created = ensureEmptyChapterRow(ws, 1, 1, '初入怪谈', outlineId)
    expect(created).toBeGreaterThan(0)
    expect(ensureEmptyChapterRow(ws, 1, 1, '初入怪谈', outlineId)).toBeNull()
    const db = openKernelDb(ws)
    const outline = db.query(`SELECT outline_type FROM outlines WHERE id = ?`).get(outlineId) as any
    const chapter = db.query(`SELECT chapter_text, outline_id, title FROM chapters WHERE project_id = 1 AND chapter_no = 1`).get() as any
    db.close()
    expect(outline.outline_type).toBe('chapter')
    expect(chapter.chapter_text).toBe('')
    expect(chapter.outline_id).toBe(outlineId)
  })
})
