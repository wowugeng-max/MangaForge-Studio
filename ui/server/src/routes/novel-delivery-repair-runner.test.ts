import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('novel delivery repair runner source guards', () => {
  test('uses safe json for release quality payloads that include context packages', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-delivery-repair-runner.ts'), 'utf8')

    expect(source).not.toContain('payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, context_package')
  })
})
