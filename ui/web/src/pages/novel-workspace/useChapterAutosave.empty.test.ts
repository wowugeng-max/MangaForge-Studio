import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { workspaceCenterSource } from './workspaceUiShellSource'

describe('useChapterAutosave empty prose guard', () => {
  test('skips persisting blank chapter_text autosaves', () => {
    const source = readFileSync(join(import.meta.dir, 'useChapterAutosave.ts'), 'utf8')
    expect(source).toContain("if (!String(next.text || '').replace(/\\s/g, ''))")
    expect(source).toContain('Autosave must not wipe an existing chapter with a blank editor state')
  })
})

describe('ProseEditor external sync guard', () => {
  test('does not notify onChange while applying external value sync', () => {
    const source = workspaceCenterSource()
    expect(source).toContain('syncingExternalValueRef')
    expect(source).toContain('if (syncingExternalValueRef.current) return')
  })
})
