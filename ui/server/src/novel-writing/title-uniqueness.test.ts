import { describe, expect, test } from 'bun:test'
import {
  buildChapterTitleUniquenessReport,
  buildChapterTitleUniquenessSyncReport,
  buildGeneratedChapterTitlePatch,
} from './title-uniqueness'

describe('chapter title uniqueness helpers', () => {
  test('detects duplicate chapter titles after stripping chapter number prefixes', () => {
    const report = buildChapterTitleUniquenessReport([
      { id: 1, chapter_no: 1, title: '第1章 门外学生' },
      { id: 2, chapter_no: 2, title: '守则初读' },
      { id: 3, chapter_no: 3, title: '门外学生' },
    ], { id: 3, chapter_no: 3, title: '门外学生' })

    expect(report.status).toBe('warn')
    expect(report.normalized_title).toBe('门外学生')
    expect(report.duplicates).toEqual([{ id: 1, chapter_no: 1, title: '第1章 门外学生' }])
    expect(report.fix).toContain('本章核心事件')
  })

  test('builds sync report for ok, duplicate, and missing title cases', () => {
    const okReport = buildChapterTitleUniquenessSyncReport([
      { id: 1, chapter_no: 1, title: '第1章 门外学生' },
      { id: 2, chapter_no: 2, title: '第2章 校徽敲门' },
    ], { id: 2, chapter_no: 2, title: '第2章 校徽敲门' })
    const warnReport = buildChapterTitleUniquenessSyncReport([
      { id: 1, chapter_no: 1, title: '第1章 门外学生' },
      { id: 2, chapter_no: 2, title: '守则初读' },
      { id: 3, chapter_no: 3, title: '门外学生' },
    ], { id: 3, chapter_no: 3, title: '门外学生' })
    const missingReport = buildChapterTitleUniquenessSyncReport([], { id: 9, chapter_no: 9, title: '' })

    expect(okReport.status).toBe('ok')
    expect(okReport.label).toBe('章节标题去重 OK')
    expect(warnReport.status).toBe('warn')
    expect(warnReport.missed_count).toBe(1)
    expect(warnReport.missed[0].title).toBe('第1章 门外学生')
    expect(missingReport.status).toBe('warn')
    expect(missingReport.missed[0].issue).toContain('标题为空')
  })

  test('builds generated title patch only for active duplicate-title repairs', () => {
    const titleReport = {
      status: 'warn',
      normalized_title: '门外学生',
      duplicates: [{ id: 1, chapter_no: 1, title: '第1章 门外学生' }],
    }

    expect(buildGeneratedChapterTitlePatch({ title: '门外学生' }, titleReport, '校徽敲门')).toEqual({ title: '校徽敲门' })
    expect(buildGeneratedChapterTitlePatch({ title: '门外学生' }, titleReport, '门外学生')).toEqual({})
    expect(buildGeneratedChapterTitlePatch({ title: '门外学生' }, titleReport, '第2章 门外学生')).toEqual({})
    expect(buildGeneratedChapterTitlePatch({ title: '门外学生' }, { status: 'ok' }, '校徽敲门')).toEqual({})
  })
})
