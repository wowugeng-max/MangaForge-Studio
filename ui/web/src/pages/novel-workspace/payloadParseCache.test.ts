import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

async function loadCacheModule() {
  return import('./payloadParseCache').catch(() => null)
}

describe('workspace payload parse cache', () => {
  test('shares one JSON.parse result for repeated reads of the same record payload', async () => {
    const cache = await loadCacheModule()
    expect(cache).not.toBeNull()
    if (!cache) return

    cache.clearWorkspacePayloadParseCache()
    const nativeParse = JSON.parse
    let parseCalls = 0
    ;(JSON as any).parse = (value: string) => {
      parseCalls += 1
      return nativeParse(value)
    }
    try {
      const review = {
        id: 42,
        updated_at: '2026-07-13T01:02:03.000Z',
        payload: JSON.stringify({ report: { score: 91, findings: ['保留承接'] } }),
      }
      const first = cache.parseWorkspacePayload(review.payload, { owner: review, kind: 'review', field: 'payload' })
      const second = cache.parseWorkspacePayload(review.payload, { owner: review, kind: 'review', field: 'payload' })
      const third = cache.parseWorkspacePayload(review.payload, { owner: review, kind: 'review', field: 'payload' })

      expect(first).toBe(second)
      expect(second).toBe(third)
      expect(first).toEqual({ report: { score: 91, findings: ['保留承接'] } })
      expect(parseCalls).toBe(1)
    } finally {
      ;(JSON as any).parse = nativeParse
      cache.clearWorkspacePayloadParseCache()
    }
  })

  test('does not mix changed same-length payloads that share record metadata', async () => {
    const cache = await loadCacheModule()
    expect(cache).not.toBeNull()
    if (!cache) return

    cache.clearWorkspacePayloadParseCache()
    const owner = { id: 7, updated_at: '2026-07-13T02:00:00.000Z' }
    const first = cache.parseWorkspacePayload('{"a":1}', { owner, kind: 'run', field: 'output_ref' })
    const second = cache.parseWorkspacePayload('{"b":2}', { owner, kind: 'run', field: 'output_ref' })

    expect(first).toEqual({ a: 1 })
    expect(second).toEqual({ b: 2 })
    expect(second).not.toBe(first)
  })

  test('caches parse failures as the safe fallback without retrying JSON.parse', async () => {
    const cache = await loadCacheModule()
    expect(cache).not.toBeNull()
    if (!cache) return

    cache.clearWorkspacePayloadParseCache()
    const nativeParse = JSON.parse
    let parseCalls = 0
    ;(JSON as any).parse = (value: string) => {
      parseCalls += 1
      return nativeParse(value)
    }
    try {
      const run = { id: 9, updated_at: '2026-07-13T03:00:00.000Z' }
      expect(cache.parseWorkspacePayload('{broken', { owner: run, kind: 'run', field: 'output_ref' })).toBeNull()
      expect(cache.parseWorkspacePayload('{broken', { owner: run, kind: 'run', field: 'output_ref' })).toBeNull()
      expect(parseCalls).toBe(1)
    } finally {
      ;(JSON as any).parse = nativeParse
      cache.clearWorkspacePayloadParseCache()
    }
  })

  test('evicts old entries at a bounded LRU limit', async () => {
    const cache = await loadCacheModule()
    expect(cache).not.toBeNull()
    if (!cache) return

    cache.clearWorkspacePayloadParseCache()
    for (let index = 0; index < 400; index += 1) {
      cache.parseWorkspacePayload(JSON.stringify({ index }), {
        owner: { id: index, updated_at: String(index) },
        kind: 'review',
        field: 'payload',
      })
    }
    const stats = cache.workspacePayloadParseCacheStats()
    expect(stats.entries).toBeLessThanOrEqual(stats.maxEntries)
    expect(stats.sourceBytes).toBeLessThanOrEqual(stats.maxSourceBytes)
    expect(stats.parsedBytes).toBeLessThanOrEqual(stats.maxParsedBytes)
    expect(stats.maxEntries).toBeLessThanOrEqual(96)
    expect(stats.maxSourceBytes).toBeLessThanOrEqual(2 * 1024 * 1024)
  })

  test('routes the planning, writing, and auto director payload hotspots through the shared cache', () => {
    const source = (name: string) => readFileSync(join(import.meta.dir, name), 'utf8')
    const planning = source('planningWorkspaceModel.ts')
    const writing = source('writingCockpitModel.ts')
    const director = source('autoCreationDirectorModel.ts')

    for (const modelSource of [planning, writing, director]) {
      expect(modelSource).toContain("from './payloadParseCache'")
    }
    expect(planning).toContain('return parseWorkspacePayload(value, options)')
    expect(writing).toContain("parseWorkspacePayload(value, { owner: review, kind: 'review', field })")
    expect(director).toContain('return parseWorkspacePayload(value, options)')
  })

  test('clears parsed payload objects when the workspace project changes or unmounts', () => {
    const source = readFileSync(join(import.meta.dir, 'useNovelWorkspaceData.ts'), 'utf8')
    expect(source).toContain("import { clearWorkspacePayloadParseCache } from './payloadParseCache'")
    expect(source).toContain('clearWorkspacePayloadParseCache()')
  })
})
