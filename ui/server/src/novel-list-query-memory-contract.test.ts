import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const novelDir = join(import.meta.dir, 'novel')

function walkTs(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walkTs(full))
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) out.push(full)
  }
  return out
}

const sources = walkTs(novelDir).map(file => ({ file, source: readFileSync(file, 'utf8') }))

function exportedFunctionSource(name: string) {
  for (const { source } of sources) {
    const start = source.indexOf(`export async function ${name}`)
    if (start < 0) continue
    const end = source.indexOf('export async function ', start + 1)
    return source.slice(start, end < 0 ? source.length : end)
  }
  throw new Error(`export async function ${name} not found in novel package`)
}

describe('novel list query memory contracts', () => {
  for (const [name, table, filter] of [
    ['listNovelWorldbuilding', 'worldbuilding', 'project_id'],
    ['listNovelCharacters', 'characters', 'project_id'],
    ['listNovelSettingEntities', 'setting_entities', 'project_id'],
    ['listNovelChapterSettingUsage', 'chapter_setting_usage', 'project_id'],
    ['listNovelOutlines', 'outlines', 'project_id'],
    ['listNovelChapters', 'chapters', 'chapter_no'],
    ['listNovelReviews', 'reviews', 'created_at'],
    ['listNovelRuns', 'runs', 'created_at'],
  ] as const) {
    test(`${name} queries only project ${table} rows instead of materializing the whole novel store`, () => {
      const functionSource = exportedFunctionSource(name)
      expect(functionSource).not.toContain('readStore(')
      expect(functionSource).toMatch(/openDb\s*\(/)
      expect(functionSource).toMatch(new RegExp(`SELECT[\\s\\S]+FROM ${table}[\\s\\S]+WHERE project_id\\s*=\\s*\\?`, 'i'))
      expect(functionSource).toContain(filter)
      for (const unrelatedTable of ['projects', 'worldbuilding', 'characters', 'outlines', 'chapters', 'chapter_versions', 'reviews', 'runs', 'setting_entities', 'chapter_setting_usage']) {
        if (unrelatedTable === table) continue
        expect(functionSource).not.toMatch(new RegExp(`\\b(FROM|JOIN)\\s+${unrelatedTable}\\b`, 'i'))
      }
    })
  }

  test('project workspace reads query projects directly', () => {
    for (const name of ['listNovelProjects', 'getNovelProject']) {
      const functionSource = exportedFunctionSource(name)
      expect(functionSource).not.toContain('readStore(')
      expect(functionSource).toMatch(/openDb\s*\(/)
      expect(functionSource).toMatch(/SELECT[\s\S]+FROM projects/i)
      expect(functionSource).not.toMatch(/\b(FROM|JOIN)\s+chapter_versions\b/i)
    }
  })

  test('project-scoped ordered list queries have matching composite indexes', () => {
    const all = sources.map(item => item.source).join('\n')
    expect(all).toContain('idx_chapters_project_chapter_no ON chapters(project_id, chapter_no)')
    expect(all).toContain('idx_runs_project_created_at ON runs(project_id, created_at DESC)')
    expect(all).toContain('idx_chapter_setting_usage_project_chapter ON chapter_setting_usage(project_id, chapter_id)')
  })
})
