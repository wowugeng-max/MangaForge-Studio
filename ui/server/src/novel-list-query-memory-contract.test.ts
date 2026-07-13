import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const source = readFileSync(join(import.meta.dir, 'novel.ts'), 'utf8')

function exportedFunctionSource(name: string, nextName: string) {
  const start = source.indexOf(`export async function ${name}`)
  const end = source.indexOf(`export async function ${nextName}`, start + 1)
  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)
  return source.slice(start, end)
}

describe('novel list query memory contracts', () => {
  for (const [name, nextName, table, order] of [
    ['listNovelChapters', 'createNovelChapter', 'chapters', 'chapter_no'],
    ['listNovelReviews', 'createNovelReview', 'reviews', 'created_at'],
    ['listNovelRuns', 'appendNovelRun', 'runs', 'created_at'],
  ] as const) {
    test(`${name} queries only project ${table} rows instead of materializing the whole novel store`, () => {
      const functionSource = exportedFunctionSource(name, nextName)

      expect(functionSource).not.toContain('readStore(')
      expect(functionSource).toContain('openDb(activeWorkspace)')
      expect(functionSource).toMatch(new RegExp(`SELECT[\\s\\S]+FROM ${table}[\\s\\S]+WHERE project_id\\s*=\\s*\\?`, 'i'))
      expect(functionSource).toContain(order)
    })
  }
})
