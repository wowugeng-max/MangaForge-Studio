import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('provider matrix protocol UI', () => {
  test('offers Codex Responses protocol in provider configuration', () => {
    const source = readFileSync(join(import.meta.dir, 'index.tsx'), 'utf8')

    expect(source).toContain("value=\"codex_responses\"")
    expect(source).toContain('Codex / OpenAI Responses')
    expect(source).toContain('CODEX')
    expect(source).toContain("responses: '/responses'")
  })
})
