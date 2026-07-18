import type { Database } from 'bun:sqlite'
import type { NovelOutlineRecord, NovelChapterRecord, NovelChapterVersionRecord } from './types'
import { nowIso, toAnyArray, toStringArray, jsonText } from './json'

export function outlineChapterNo(outline: Partial<NovelOutlineRecord>) {
  const raw = outline.raw_payload || {}
  const rawNo = Number((raw as any).chapter_no || (raw as any).chapterNo || (raw as any).future100?.chapter_no || (raw as any).rollingPlan?.chapter_no || 0)
  if (rawNo) return rawNo
  const match = String(outline.title || '').match(/第\s*(\d+)\s*章/)
  return match ? Number(match[1]) : 0
}

export function cleanChapterPlanTitle(chapterNo: number, title: any) {
  const text = String(title || '').trim()
  if (!text) return `第${chapterNo}章`
  return text
    .replace(new RegExp(`^第\\s*${chapterNo}\\s*章[\\s:：、-]*`), '')
    .replace(/^第\s*\d+\s*章[\s:：、-]*/, '')
    .trim() || `第${chapterNo}章`
}

export function chapterPlanOutlineTitle(chapterNo: number, title: any) {
  const cleanTitle = cleanChapterPlanTitle(chapterNo, title)
  return cleanTitle === `第${chapterNo}章` ? cleanTitle : `第${chapterNo}章 ${cleanTitle}`
}

export function chapterPlanOutlineSummary(data: Partial<NovelChapterRecord>) {
  return [
    data.chapter_goal ? `目标：${data.chapter_goal}` : '',
    data.chapter_summary ? `摘要：${data.chapter_summary}` : '',
  ].filter(Boolean).join('\n')
}

export function versionedChapterSnapshotChanged(current: NovelChapterRecord, next: NovelChapterRecord) {
  return (
    String(current.chapter_text || '') !== String(next.chapter_text || '') ||
    jsonText(current.scene_breakdown || []) !== jsonText(next.scene_breakdown || []) ||
    jsonText(current.continuity_notes || []) !== jsonText(next.continuity_notes || [])
  )
}

export function createChapterVersionRecord(data: Partial<NovelChapterVersionRecord> & { id?: number }): NovelChapterVersionRecord { return { id: Number(data.id || 0), chapter_id: Number(data.chapter_id || 0), project_id: Number(data.project_id || 0), version_no: Number(data.version_no || 1), chapter_text: String(data.chapter_text || ''), scene_breakdown: toAnyArray(data.scene_breakdown), continuity_notes: toStringArray(data.continuity_notes), source: data.source || 'manual_edit', created_at: String(data.created_at || nowIso()) } }

export function nextChapterVersionNo(db: Database, chapterId: number): number {
  return Number((db.query('SELECT COALESCE(MAX(version_no), 0) + 1 AS n FROM chapter_versions WHERE chapter_id = ?').get(chapterId) as any)?.n || 1)
}
