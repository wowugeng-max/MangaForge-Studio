import { describe, expect, test } from 'bun:test'
import { buildProbeRequest } from './models'

describe('model health probes', () => {
  test('uses plain text response format for chat probes', () => {
    expect(buildProbeRequest('chat', 'gpt-5-codex')).toMatchObject({
      model: 'gpt-5-codex',
      response_format: 'text',
    })
  })
})
