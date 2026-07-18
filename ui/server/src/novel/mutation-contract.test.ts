import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const novelSource = readFileSync(join(import.meta.dir, 'store.ts'), 'utf8')

const HOT_EXPORTS = [
  'createNovelProject', 'updateNovelProject',
  'createNovelWorldbuilding', 'updateNovelWorldbuilding',
  'createNovelCharacter', 'updateNovelCharacter',
  'createNovelSettingEntity', 'updateNovelSettingEntity', 'deleteNovelSettingEntity',
  'replaceNovelChapterSettingUsage', 'updateNovelChapterSettingUsage',
  'createNovelOutline', 'updateNovelOutline',
  'createNovelChapter', 'upsertNovelChapterByNumber', 'syncNovelChapterPlanByNumber',
  'appendChapterVersion', 'rollbackChapterVersion', 'updateNovelChapter',
  'deleteNovelChapter', 'deleteNovelOutline', 'deleteNovelProject',
  'updateNovelRun',
  'commitNovelChapterAcceptance',
] as const

function exportBlock(name: string) {
  const start = novelSource.indexOf(`export async function ${name}`)
  const next = novelSource.indexOf('export async function ', start + 1)
  expect(start).toBeGreaterThanOrEqual(0)
  return novelSource.slice(start, next < 0 ? novelSource.length : next)
}

describe('novel point-SQL mutation contracts', () => {
  test('production write APIs do not full-store rewrite', () => {
    expect(novelSource).not.toContain('async function mutateNovelStore')
    expect(novelSource).toContain('async function withNovelDbWrite')
    for (const name of HOT_EXPORTS) {
      const block = exportBlock(name)
      expect(block).not.toContain('loadStoreFromOpenDb(')
      expect(block).not.toContain('replaceStoreInOpenDb(')
      expect(block).not.toContain('mutateNovelStore(')
      if (name === 'commitNovelChapterAcceptance') {
        expect(block).toContain('loadAcceptanceWorkingSet(')
        expect(block).not.toContain('loadStoreFromOpenDb(')
      } else {
        expect(
          block.includes('withNovelDbWrite(')
          || block.includes('withNovelWorkspaceMutation('),
        ).toBe(true)
      }
    }
  })

  test('legacy bulk replace remains only for import path', () => {
    expect(novelSource).toContain('function replaceStoreInOpenDb')
    const importStart = novelSource.indexOf('async function importLegacyNovelStoreIfNeeded')
    expect(importStart).toBeGreaterThanOrEqual(0)
    // business hot exports must not call replaceStoreInOpenDb
    for (const name of HOT_EXPORTS) {
      expect(exportBlock(name)).not.toContain('replaceStoreInOpenDb(')
    }
  })
})
