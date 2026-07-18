import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const source = readFileSync(join(import.meta.dir, 'novel/store.ts'), 'utf8')

function exportedFunctionSource(name: string, nextName: string) {
  const start = source.indexOf(`export async function ${name}`)
  const end = source.indexOf(`export async function ${nextName}`, start + 1)
  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)
  return source.slice(start, end)
}

describe('novel list query memory contracts', () => {
  for (const [name, nextName, table, filter] of [
    ['listNovelWorldbuilding', 'createNovelWorldbuilding', 'worldbuilding', 'project_id'],
    ['listNovelCharacters', 'createNovelCharacter', 'characters', 'project_id'],
    ['listNovelSettingEntities', 'createNovelSettingEntity', 'setting_entities', 'project_id'],
    ['listNovelChapterSettingUsage', 'replaceNovelChapterSettingUsage', 'chapter_setting_usage', 'project_id'],
    ['listNovelOutlines', 'createNovelOutline', 'outlines', 'project_id'],
    ['listNovelChapters', 'createNovelChapter', 'chapters', 'chapter_no'],
    ['listNovelReviews', 'createNovelReview', 'reviews', 'created_at'],
    ['listNovelRuns', 'appendNovelRun', 'runs', 'created_at'],
  ] as const) {
    test(`${name} queries only project ${table} rows instead of materializing the whole novel store`, () => {
      const functionSource = exportedFunctionSource(name, nextName)

      expect(functionSource).not.toContain('readStore(')
      expect(functionSource).toContain('openDb(activeWorkspace)')
      expect(functionSource).toMatch(new RegExp(`SELECT[\\s\\S]+FROM ${table}[\\s\\S]+WHERE project_id\\s*=\\s*\\?`, 'i'))
      expect(functionSource).toContain(filter)
      for (const unrelatedTable of ['projects', 'worldbuilding', 'characters', 'outlines', 'chapters', 'chapter_versions', 'reviews', 'runs', 'setting_entities', 'chapter_setting_usage']) {
        if (unrelatedTable === table) continue
        expect(functionSource).not.toMatch(new RegExp(`\\b(FROM|JOIN)\\s+${unrelatedTable}\\b`, 'i'))
      }
    })
  }

  test('project workspace reads query projects directly', () => {
    const listSource = exportedFunctionSource('listNovelProjects', 'createNovelProject')
    const getSource = exportedFunctionSource('getNovelProject', 'updateNovelProject')

    for (const functionSource of [listSource, getSource]) {
      expect(functionSource).not.toContain('readStore(')
      expect(functionSource).toContain('openDb(activeWorkspace)')
      expect(functionSource).toMatch(/SELECT[\s\S]+FROM projects/i)
      expect(functionSource).not.toMatch(/\b(FROM|JOIN)\s+chapter_versions\b/i)
    }
  })

  test('project-scoped ordered list queries have matching composite indexes', () => {
    expect(source).toContain('idx_chapters_project_chapter_no ON chapters(project_id, chapter_no)')
    expect(source).toContain('idx_runs_project_created_at ON runs(project_id, created_at DESC)')
    expect(source).toContain('idx_chapter_setting_usage_project_chapter ON chapter_setting_usage(project_id, chapter_id)')
  })
})
