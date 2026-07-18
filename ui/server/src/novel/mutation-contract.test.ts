import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const novelDir = import.meta.dir

function walkTs(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walkTs(full))
    else if (name.endsWith('.ts') && !name.endsWith('.test.ts')) out.push(full)
  }
  return out
}

function packageSource() {
  return walkTs(novelDir).map(file => readFileSync(file, 'utf8')).join('\n\n')
}

const HOT_EXPORT_FILES = [
  'repos/projects.ts',
  'repos/worldbuilding.ts',
  'repos/characters.ts',
  'repos/settings.ts',
  'repos/outlines.ts',
  'repos/chapters.ts',
  'repos/reviews.ts',
  'repos/runs.ts',
  'repos/seed-drafts.ts',
  'acceptance.ts',
  'compaction.ts',
]

describe('novel point-SQL mutation contracts', () => {
  test('production write modules do not full-store rewrite', () => {
    const all = packageSource()
    expect(all).not.toContain('async function mutateNovelStore')
    expect(all).toContain('async function withNovelDbWrite')
    for (const rel of HOT_EXPORT_FILES) {
      const source = readFileSync(join(novelDir, rel), 'utf8')
      expect(source).not.toContain('loadStoreFromOpenDb(')
      expect(source).not.toContain('replaceStoreInOpenDb(')
      expect(source).not.toContain('mutateNovelStore(')
      if (rel === 'acceptance.ts') {
        expect(source).toContain('loadAcceptanceWorkingSet(')
      }
    }
  })

  test('legacy bulk replace remains only in legacy-import path', () => {
    const legacy = readFileSync(join(novelDir, 'legacy-import.ts'), 'utf8')
    expect(legacy).toContain('function replaceStoreInOpenDb')
    expect(legacy).toContain('importLegacyNovelStoreIfNeeded')
    for (const rel of HOT_EXPORT_FILES) {
      const source = readFileSync(join(novelDir, rel), 'utf8')
      expect(source).not.toContain('replaceStoreInOpenDb(')
    }
  })
})
