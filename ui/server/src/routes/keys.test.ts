import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { buildFallbackTestUrl } from './keys'

describe('provider key protocol tests', () => {
  test('uses Responses endpoint for Codex-style provider key tests', () => {
    expect(buildFallbackTestUrl('https://api.openai.com/v1', 'codex_responses')).toBe('https://api.openai.com/v1/responses')
    expect(buildFallbackTestUrl('https://gateway.example.com', 'openai_responses')).toBe('https://gateway.example.com/v1/responses')
  })

  test('fallback key probe sends Responses-style request body for codex providers', () => {
    const source = readFileSync(join(import.meta.dir, 'keys.ts'), 'utf8')

    expect(source).toContain("provider.endpoints?.responses")
    expect(source).toContain('max_output_tokens')
    expect(source).toContain("input: [{ role: 'user', content: 'ping' }]")
  })
})
