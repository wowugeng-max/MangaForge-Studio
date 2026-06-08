import { describe, expect, test } from 'bun:test'
import { buildSSEUrl } from './sse'

describe('SSE client URL resolution', () => {
  test('uses the configured API base URL instead of a hard-coded localhost port', () => {
    expect(buildSSEUrl('node-1', 'http://127.0.0.1:18787/api')).toBe('http://127.0.0.1:18787/api/sse/node-1')
    expect(buildSSEUrl('node-1', 'http://127.0.0.1:18787/api/')).toBe('http://127.0.0.1:18787/api/sse/node-1')
  })
})
