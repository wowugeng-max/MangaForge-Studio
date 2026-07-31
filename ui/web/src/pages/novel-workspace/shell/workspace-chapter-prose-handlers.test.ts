import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { canFinalizeProseRun } from './workspace-chapter-prose-handlers'
import * as proseHandlers from './workspace-chapter-prose-handlers'

describe('MCP generation error propagation', () => {
  test('preserves the stable error code and bounded payload on Error objects', () => {
    const buildMcpGenerationFailureError = Reflect.get(proseHandlers, 'buildMcpGenerationFailureError')
    expect(typeof buildMcpGenerationFailureError).toBe('function')
    if (typeof buildMcpGenerationFailureError !== 'function') return
    const payload = {
      error_code: 'MCP_SEND_UNKNOWN',
      error: '任务发送结果未知',
      receipt_status: 'send_unknown',
    }

    const error = buildMcpGenerationFailureError(payload, 'HTTP 502') as any

    expect(error).toBeInstanceOf(Error)
    expect(error.message).toContain('不要重新发送')
    expect(error.error_code).toBe('MCP_SEND_UNKNOWN')
    expect(error.payload).toBe(payload)
  })

  test('uses the payload-preserving error builder in initial HTTP, SSE, and batch HTTP failures', () => {
    const source = readFileSync(join(import.meta.dir, 'workspace-chapter-prose-handlers.tsx'), 'utf8')

    expect(source.match(/throw buildMcpGenerationFailureError\(/g) || []).toHaveLength(3)
    expect(source).not.toContain("throw new Error(payload?.error || raw || `HTTP ${resp.status}`)")
    expect(source).not.toContain("throw new Error(p.error || '正文生成失败')")
    expect(source).not.toContain("throw new Error(data?.error || data?.detail || raw || `HTTP ${resp.status}`)")
  })
})

describe('canFinalizeProseRun', () => {
  test('the active run may write shared streaming UI state', () => {
    const run = new AbortController()
    expect(canFinalizeProseRun(run, run)).toBe(true)
  })

  test('a run superseded by a newer controller must not write shared state', () => {
    const oldRun = new AbortController()
    const newRun = new AbortController()
    expect(canFinalizeProseRun(newRun, oldRun)).toBe(false)
  })

  test('after cancel/end with no successor the finishing run may clean up', () => {
    const run = new AbortController()
    expect(canFinalizeProseRun(null, run)).toBe(true)
    expect(canFinalizeProseRun(undefined, run)).toBe(true)
  })
})
