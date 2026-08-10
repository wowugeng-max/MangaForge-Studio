import { describe, expect, spyOn, test } from 'bun:test'

import {
  H3AcceptanceError,
  localImageAssetUrl,
  normalizeLocalApiBase,
  redactSensitive,
  runH3Acceptance,
} from './accept-h3-prompt-skill.mjs'

const REVISION = '0123456789abcdef0123456789abcdef01234567'
const REFERENCES = ['references/base-en.txt', 'references/ref-en.txt']
const IMAGE_FIXTURES = [
  { id: 42, filePath: 'assets/first.png' },
  { id: 43, filePath: 'assets/character.png' },
  { id: 44, filePath: 'assets/last.png' },
] as const
const ORDERED_IMAGE_ASSETS = [
  { type: 'image', url: '/api/assets/media/assets%2Ffirst.png', source_asset_ids: [42], reference_index: 1, reference_role: 'first_frame' },
  { type: 'image', url: '/api/assets/media/assets%2Fcharacter.png', source_asset_ids: [43], reference_index: 2, reference_role: 'character' },
  { type: 'image', url: '/api/assets/media/assets%2Flast.png', source_asset_ids: [44], reference_index: 3, reference_role: 'last_frame' },
]
const ORDERED_REFERENCE_BINDINGS = ORDERED_IMAGE_ASSETS.map((asset, index) => ({
  ...asset,
  source_asset_ids: [...asset.source_asset_ids],
  reference_id: `reference-${index + 1}`,
}))

function expectedImageAcceptancePrompt(
  alias: 'I2VA' | 'FL2VA' | 'Ref2VA',
  assets: Array<{ reference_index: number; reference_role: string }>,
) {
  const roleSummary = assets.map(asset => `reference ${asset.reference_index} (${asset.reference_role})`).join(', ')
  return `${alias}: Use every supplied image reference in this exact order: ${roleSummary}. Create a coherent 8-second cinematic action that visibly incorporates every reference.`
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

type AssertionFaults = {
  revision?: string
  references?: string[]
  textHash?: string
  imageHash?: string
  repeatedImageHash?: string
  imageReferenceModeHint?: string
  imageReferenceBindings?: any[]
}

function assertionFlowFetch(faults: AssertionFaults = {}): typeof fetch {
  const revision = faults.revision ?? REVISION
  let imagePreviewCalls = 0
  return (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input)
    const method = String(init.method || 'GET').toUpperCase()
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined
    if (url.endsWith('/api/status')) return json({ ok: true })
    if (url.endsWith('/api/skills/settings')) return json({ skill_compiler_model_id: 7 })
    if (url.endsWith('/api/models')) return json([{ id: 7, capabilities: { chat: true, vision: true } }])
    for (const fixture of IMAGE_FIXTURES) {
      if (url.endsWith(`/api/assets/${fixture.id}`)) return json({ id: fixture.id, type: 'image', data: { file_path: fixture.filePath } })
      if (url.endsWith(`/api/assets/media/${encodeURIComponent(fixture.filePath)}`)) {
        return new Response(new Uint8Array([0x89]), { headers: { 'content-type': 'image/png' } })
      }
    }
    if (url.endsWith('/api/skills/packs') && method === 'POST') return json({ record: { id: 'MiniMax-H3', revision } }, 201)
    if (url.endsWith('/api/skills') && method === 'GET') {
      return json({ skills: [{ packId: 'MiniMax-H3', name: 'h3-prompt-writing', revision, compatibility: 'prompt_ready', mediaModes: ['text_to_video', 'image_to_video'] }] })
    }
    if (url.endsWith('/api/skills/compile-preview') && method === 'POST') {
      const isImage = body.mode === 'image_to_video'
      if (isImage) imagePreviewCalls += 1
      const canonicalBindings = (body.assets ?? []).map((asset: any, index: number) => ({
        ...asset,
        reference_id: `reference-${index + 1}`,
      }))
      const imageReferenceModeHint = canonicalBindings.length === 1 ? 'I2VA' : canonicalBindings.length === 2 ? 'FL2VA' : 'Ref2VA'
      const cacheKey = isImage
        ? imagePreviewCalls > 1 ? faults.repeatedImageHash ?? faults.imageHash ?? '2'.repeat(64) : faults.imageHash ?? '2'.repeat(64)
        : faults.textHash ?? '1'.repeat(64)
      return json({
        result: {
          skill_name: 'h3-prompt-writing', skill_version: revision, mode: body.mode,
          prompt: 'compiled prompt', negative_prompt: '', parameters: {},
          references_used: faults.references ?? REFERENCES, warnings: [],
          reference_mode_hint: isImage ? faults.imageReferenceModeHint ?? imageReferenceModeHint : 'T2VA',
          reference_bindings: isImage ? faults.imageReferenceBindings ?? canonicalBindings : [],
        },
        cache_key: cacheKey,
      })
    }
    return json({ error: 'unexpected request' }, 500)
  }) as typeof fetch
}

describe('MiniMax H3 live acceptance harness', () => {
  test('skips by default without making any HTTP request', async () => {
    const logs: string[] = []
    let fetchCalls = 0
    const result = await runH3Acceptance({
      env: {},
      fetchImpl: async () => { fetchCalls += 1; throw new Error('must not fetch') },
      log: message => logs.push(message),
    })

    expect(result).toEqual({ skipped: true })
    expect(fetchCalls).toBe(0)
    expect(logs.join('\n').toLowerCase()).toContain('skipped')
  })

  test('rejects a missing image asset id before contacting the API', async () => {
    let fetchCalls = 0
    await expect(runH3Acceptance({
      env: { MANGAFORGE_H3_E2E: '1' },
      fetchImpl: async () => { fetchCalls += 1; return json({ ok: true }) },
      log: () => {},
    })).rejects.toMatchObject({ code: 'H3_E2E_CONFIGURATION' })
    expect(fetchCalls).toBe(0)
  })

  test('rejects ten plural image asset ids before any network or Pack installation side effect', async () => {
    let fetchCalls = 0
    await expect(runH3Acceptance({
      env: {
        MANGAFORGE_H3_E2E: '1',
        MANGAFORGE_H3_IMAGE_ASSET_IDS: Array.from({ length: 10 }, (_, index) => index + 1).join(','),
        MANGAFORGE_H3_IMAGE_ASSET_ID: '42',
      },
      fetchImpl: async () => { fetchCalls += 1; return json({ ok: true }) },
      log: () => {},
    })).rejects.toMatchObject({ code: 'H3_E2E_CONFIGURATION' })
    expect(fetchCalls).toBe(0)
  })

  test.each([
    ['empty', '42,'],
    ['zero', '42,0'],
    ['negative', '42,-1'],
    ['fractional', '42,1.5'],
    ['unsafe', '42,9007199254740992'],
    ['non-numeric', '42,nope'],
  ])('rejects an invalid (%s) second plural image asset id before contacting the API', async (_label, assetIds) => {
    let fetchCalls = 0
    await expect(runH3Acceptance({
      env: {
        MANGAFORGE_H3_E2E: '1',
        MANGAFORGE_H3_IMAGE_ASSET_IDS: assetIds,
        MANGAFORGE_H3_IMAGE_ASSET_ID: '42',
      },
      fetchImpl: async () => { fetchCalls += 1; return json({ ok: true }) },
      log: () => {},
    })).rejects.toMatchObject({ code: 'H3_E2E_CONFIGURATION' })
    expect(fetchCalls).toBe(0)
  })

  test('accepts only loopback API bases and converts an API-resolved image asset into a local media URL', () => {
    expect(normalizeLocalApiBase('http://127.0.0.1:8787/api/')).toBe('http://127.0.0.1:8787/api')
    expect(normalizeLocalApiBase('https://localhost:18787/api')).toBe('https://localhost:18787/api')
    for (const unsafe of [
      'https://example.com/api',
      'http://user:password@127.0.0.1:8787/api',
      'http://127.0.0.1:8787/api?token=secret',
      'file:///tmp/api',
    ]) expect(() => normalizeLocalApiBase(unsafe)).toThrow(expect.objectContaining({ code: 'H3_E2E_CONFIGURATION' }))

    expect(localImageAssetUrl({ id: 42, type: 'image', data: { file_path: 'assets/ref image.png' } }, 42))
      .toBe('/api/assets/media/assets%2Fref%20image.png')
    expect(localImageAssetUrl({ id: 42, type: 'image', file_path: '/api/assets/media/assets%2Fref.png' }, 42))
      .toBe('/api/assets/media/assets%2Fref.png')
    for (const unsafeAsset of [
      { id: 42, type: 'image', data: { file_path: 'file:///tmp/ref.png' } },
      { id: 42, type: 'image', data: { file_path: 'https://cdn.example/ref.png' } },
      { id: 42, type: 'video', data: { file_path: 'assets/ref.mp4' } },
    ]) expect(() => localImageAssetUrl(unsafeAsset, 42)).toThrow(expect.objectContaining({ code: 'H3_E2E_CONFIGURATION' }))
  })

  test('fails configuration preflight before installing a Pack', async () => {
    const calls: Array<{ url: string; method: string }> = []
    const fetchImpl = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = String(input)
      const method = String(init.method || 'GET').toUpperCase()
      calls.push({ url, method })
      if (url.endsWith('/api/status')) return json({ ok: true })
      if (url.endsWith('/api/skills/settings')) return json({ skill_compiler_model_id: null })
      return json({ error: 'unexpected request' }, 500)
    }

    await expect(runH3Acceptance({
      env: { MANGAFORGE_H3_E2E: '1', MANGAFORGE_H3_IMAGE_ASSET_ID: '42' },
      fetchImpl: fetchImpl as typeof fetch,
      log: () => {},
    })).rejects.toMatchObject({ code: 'H3_E2E_CONFIGURATION' })
    expect(calls.some(call => call.method === 'POST' && call.url.endsWith('/api/skills/packs'))).toBe(false)
  })

  test.each([
    ['missing asset record', 'missing', 'H3_E2E_API'],
    ['mismatched asset record', 'id', 'H3_E2E_CONFIGURATION'],
    ['non-image asset record', 'record', 'H3_E2E_CONFIGURATION'],
    ['non-image media response', 'media', 'H3_E2E_CONFIGURATION'],
  ] as const)('fails on a %s for the second image before installing a Pack', async (_label, fault, expectedCode) => {
    const calls: Array<{ url: string; method: string }> = []
    const validFetch = assertionFlowFetch()
    const fetchImpl = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = String(input)
      const method = String(init.method || 'GET').toUpperCase()
      calls.push({ url, method })
      if (url.endsWith('/api/assets/43') && fault === 'missing') {
        return json({ error_code: 'ASSET_NOT_FOUND', detail: 'Asset 43 was not found' }, 404)
      }
      if (url.endsWith('/api/assets/43') && fault === 'record') {
        return json({ id: 43, type: 'video', data: { file_path: 'assets/character.mp4' } })
      }
      if (url.endsWith('/api/assets/43') && fault === 'id') {
        return json({ id: 99, type: 'image', data: { file_path: 'assets/character.png' } })
      }
      if (url.endsWith('/api/assets/media/assets%2Fcharacter.png') && fault === 'media') {
        return new Response('not an image', { headers: { 'content-type': 'text/plain' } })
      }
      return validFetch(input, init)
    }

    let caught: unknown
    try {
      await runH3Acceptance({
        env: {
          MANGAFORGE_H3_E2E: '1',
          MANGAFORGE_H3_IMAGE_ASSET_IDS: ' 42, 43 , 44 ',
          MANGAFORGE_H3_IMAGE_ASSET_ID: '42',
        },
        fetchImpl: fetchImpl as typeof fetch,
        log: () => {},
      })
    } catch (error) { caught = error }

    expect(caught).toMatchObject({ code: expectedCode })
    expect(calls.some(call => call.url.endsWith('/api/assets/43'))).toBe(true)
    expect(calls.some(call => call.method === 'POST' && call.url.endsWith('/api/skills/packs'))).toBe(false)
  })

  test('cancels a non-OK media preflight response body before returning the typed API error', async () => {
    let cancelCalls = 0
    const validFetch = assertionFlowFetch()
    const fetchImpl = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      if (String(input).endsWith('/api/assets/media/assets%2Ffirst.png')) {
        return new Response(new ReadableStream<Uint8Array>({
          cancel() { cancelCalls += 1 },
        }), { status: 404, headers: { 'content-type': 'image/png' } })
      }
      return validFetch(input, init)
    }

    await expect(runH3Acceptance({
      env: { MANGAFORGE_H3_E2E: '1', MANGAFORGE_H3_IMAGE_ASSET_ID: '42' },
      fetchImpl: fetchImpl as typeof fetch,
      log: () => {},
    })).rejects.toMatchObject({ code: 'H3_E2E_API' })
    expect(cancelCalls).toBe(1)
  })

  test('cancels a wrong-MIME media preflight response body before returning the typed configuration error', async () => {
    let cancelCalls = 0
    const validFetch = assertionFlowFetch()
    const fetchImpl = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      if (String(input).endsWith('/api/assets/media/assets%2Ffirst.png')) {
        return new Response(new ReadableStream<Uint8Array>({
          cancel() { cancelCalls += 1 },
        }), { status: 200, headers: { 'content-type': 'text/plain' } })
      }
      return validFetch(input, init)
    }

    await expect(runH3Acceptance({
      env: { MANGAFORGE_H3_E2E: '1', MANGAFORGE_H3_IMAGE_ASSET_ID: '42' },
      fetchImpl: fetchImpl as typeof fetch,
      log: () => {},
    })).rejects.toMatchObject({ code: 'H3_E2E_CONFIGURATION' })
    expect(cancelCalls).toBe(1)
  })

  test('rejects loopback API redirects without allowing fetch to follow them', async () => {
    const calls: Array<{ url: string; redirect?: RequestRedirect }> = []
    const fetchImpl = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      calls.push({ url: String(input), redirect: init.redirect })
      return json({ error: 'redirect blocked' }, 302)
    }

    await expect(runH3Acceptance({
      env: { MANGAFORGE_H3_E2E: '1', MANGAFORGE_H3_IMAGE_ASSET_ID: '42' },
      fetchImpl: fetchImpl as typeof fetch,
      log: () => {},
    })).rejects.toMatchObject({ code: 'H3_E2E_API' })
    expect(calls).toEqual([{ url: 'http://127.0.0.1:8787/api/status', redirect: 'manual' }])
  })

  test('keeps the short timeout active while reading a response body', async () => {
    const realSetTimeout = globalThis.setTimeout
    let streamController: ReadableStreamDefaultController<Uint8Array> | undefined
    const timeoutSpy = spyOn(globalThis, 'setTimeout').mockImplementation(((handler: any, timeout?: number, ...args: any[]) => (
      realSetTimeout(handler, Number(timeout) === 15_000 ? 5 : Number(timeout), ...args)
    )) as typeof setTimeout)
    const fetchImpl = async (_input: RequestInfo | URL, init: RequestInit = {}) => {
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          streamController = controller
          init.signal?.addEventListener('abort', () => controller.error(new Error('body read aborted')), { once: true })
        },
      })
      return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const acceptance = runH3Acceptance({
      env: { MANGAFORGE_H3_E2E: '1', MANGAFORGE_H3_IMAGE_ASSET_ID: '42' },
      fetchImpl: fetchImpl as typeof fetch,
      log: () => {},
    })
    const watchdog = new Promise(resolve => realSetTimeout(() => resolve({ code: 'TEST_BODY_READ_WATCHDOG' }), 75))
    let outcome: any
    try {
      outcome = await Promise.race([acceptance.then(value => value, error => error), watchdog])
      expect(outcome).toMatchObject({ code: 'H3_E2E_NETWORK' })
    } finally {
      timeoutSpy.mockRestore()
      if (outcome?.code === 'TEST_BODY_READ_WATCHDOG') streamController?.error(new Error('test cleanup'))
      await acceptance.catch(() => undefined)
    }
  })

  test('converts response body stream failures into typed network errors', async () => {
    const fetchImpl = async () => new Response(new ReadableStream<Uint8Array>({
      start(controller) { controller.error(new Error('response body stream failed')) },
    }), { status: 200, headers: { 'content-type': 'application/json' } })

    await expect(runH3Acceptance({
      env: { MANGAFORGE_H3_E2E: '1', MANGAFORGE_H3_IMAGE_ASSET_ID: '42' },
      fetchImpl: fetchImpl as typeof fetch,
      log: () => {},
    })).rejects.toMatchObject({ code: 'H3_E2E_NETWORK' })
  })

  test('rejects an oversized API response body with a typed network error', async () => {
    const oversized = JSON.stringify({ ok: true, padding: 'x'.repeat(3 * 1024 * 1024) })
    await expect(runH3Acceptance({
      env: { MANGAFORGE_H3_E2E: '1', MANGAFORGE_H3_IMAGE_ASSET_ID: '42' },
      fetchImpl: async () => new Response(oversized, { status: 200, headers: { 'content-type': 'application/json' } }),
      log: () => {},
    })).rejects.toMatchObject({ code: 'H3_E2E_NETWORK' })
  })

  test('cancels an API response body rejected by its declared oversized content length', async () => {
    let cancelCalls = 0
    const fetchImpl = async () => new Response(new ReadableStream<Uint8Array>({
      cancel() { cancelCalls += 1 },
    }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'content-length': String(2 * 1024 * 1024 + 1),
      },
    })

    await expect(runH3Acceptance({
      env: { MANGAFORGE_H3_E2E: '1', MANGAFORGE_H3_IMAGE_ASSET_ID: '42' },
      fetchImpl: fetchImpl as typeof fetch,
      log: () => {},
    })).rejects.toMatchObject({ code: 'H3_E2E_NETWORK' })
    expect(cancelCalls).toBe(1)
  })

  test.each([
    ['a non-40-character revision', { revision: 'not-a-locked-revision' }],
    ['a result missing the base reference', { references: ['references/ref-en.txt'] }],
    ['a result missing the full-reference guide', { references: ['references/base-en.txt'] }],
    ['a malformed compile hash', { textHash: 'not-a-64-character-hash' }],
    ['a changed repeated I2V hash', { repeatedImageHash: '3'.repeat(64) }],
    ['an I2VA hint for three ordered images', { imageReferenceModeHint: 'I2VA' }],
    ['a missing second reference binding', { imageReferenceBindings: [ORDERED_REFERENCE_BINDINGS[0], ORDERED_REFERENCE_BINDINGS[2]] }],
    ['reordered reference bindings', { imageReferenceBindings: [ORDERED_REFERENCE_BINDINGS[1], ORDERED_REFERENCE_BINDINGS[0], ORDERED_REFERENCE_BINDINGS[2]] }],
    ['mismatched reference lineage', { imageReferenceBindings: [
      ORDERED_REFERENCE_BINDINGS[0],
      { ...ORDERED_REFERENCE_BINDINGS[1], source_asset_ids: [999] },
      ORDERED_REFERENCE_BINDINGS[2],
    ] }],
    ['a missing canonical reference id', { imageReferenceBindings: [
      ORDERED_REFERENCE_BINDINGS[0],
      { ...ORDERED_REFERENCE_BINDINGS[1], reference_id: undefined },
      ORDERED_REFERENCE_BINDINGS[2],
    ] }],
    ['a corrupted canonical reference id', { imageReferenceBindings: [
      ORDERED_REFERENCE_BINDINGS[0],
      { ...ORDERED_REFERENCE_BINDINGS[1], reference_id: 'CORRUPTED-ID' },
      ORDERED_REFERENCE_BINDINGS[2],
    ] }],
    ['a duplicate canonical reference id', { imageReferenceBindings: [
      ORDERED_REFERENCE_BINDINGS[0],
      { ...ORDERED_REFERENCE_BINDINGS[1], reference_id: 'reference-1' },
      ORDERED_REFERENCE_BINDINGS[2],
    ] }],
  ] as Array<[string, AssertionFaults]>)('rejects %s with a typed assertion error', async (_label, faults) => {
    await expect(runH3Acceptance({
      env: {
        MANGAFORGE_H3_E2E: '1',
        MANGAFORGE_H3_IMAGE_ASSET_IDS: '42,43,44',
        MANGAFORGE_H3_IMAGE_ASSET_ID: '42',
      },
      fetchImpl: assertionFlowFetch(faults),
      log: () => {},
    })).rejects.toMatchObject({ code: 'H3_E2E_ASSERTION' })
  })

  test('retains the singular image asset id as a compatibility alias with first-frame metadata', async () => {
    const imagePreviewBodies: any[] = []
    const validFetch = assertionFlowFetch()
    const fetchImpl = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      if (String(input).endsWith('/api/skills/compile-preview') && typeof init.body === 'string') {
        const body = JSON.parse(init.body)
        if (body.mode === 'image_to_video') imagePreviewBodies.push(body)
      }
      return validFetch(input, init)
    }

    await runH3Acceptance({
      env: { MANGAFORGE_H3_E2E: '1', MANGAFORGE_H3_IMAGE_ASSET_ID: '42' },
      fetchImpl: fetchImpl as typeof fetch,
      log: () => {},
    })

    const expectedAssets = [
      { type: 'image', url: '/api/assets/media/assets%2Ffirst.png', source_asset_ids: [42], reference_index: 1, reference_role: 'first_frame' },
    ]
    expect(imagePreviewBodies.map(body => body.assets)).toEqual([expectedAssets, expectedAssets])
    expect(imagePreviewBodies.map(body => body.prompt)).toEqual([
      expectedImageAcceptancePrompt('I2VA', expectedAssets),
      expectedImageAcceptancePrompt('I2VA', expectedAssets),
    ])
  })

  test('preserves repeated plural ids as distinct ordered references instead of deduplicating them', async () => {
    const calls: string[] = []
    const imagePreviewBodies: any[] = []
    const validFetch = assertionFlowFetch()
    const fetchImpl = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith('/api/skills/compile-preview') && typeof init.body === 'string') {
        const body = JSON.parse(init.body)
        if (body.mode === 'image_to_video') imagePreviewBodies.push(body)
      }
      return validFetch(input, init)
    }

    await runH3Acceptance({
      env: {
        MANGAFORGE_H3_E2E: '1',
        MANGAFORGE_H3_IMAGE_ASSET_IDS: '42,42',
        MANGAFORGE_H3_IMAGE_ASSET_ID: '44',
      },
      fetchImpl: fetchImpl as typeof fetch,
      log: () => {},
    })

    const expected = [
      { type: 'image', url: '/api/assets/media/assets%2Ffirst.png', source_asset_ids: [42], reference_index: 1, reference_role: 'first_frame' },
      { type: 'image', url: '/api/assets/media/assets%2Ffirst.png', source_asset_ids: [42], reference_index: 2, reference_role: 'last_frame' },
    ]
    expect(imagePreviewBodies.map(body => body.assets)).toEqual([expected, expected])
    expect(imagePreviewBodies.map(body => body.prompt)).toEqual([
      expectedImageAcceptancePrompt('FL2VA', expected),
      expectedImageAcceptancePrompt('FL2VA', expected),
    ])
    expect(calls.filter(url => url.endsWith('/api/assets/42'))).toHaveLength(2)
    expect(calls.filter(url => url.endsWith('/api/assets/media/assets%2Ffirst.png'))).toHaveLength(2)
  })

  test('runs the API-only install and deterministic ordered multi-reference preview acceptance flow with fake HTTP responses', async () => {
    const calls: Array<{ url: string; method: string; body?: any }> = []
    const logs: string[] = []
    const timeoutDelays: number[] = []
    const realSetTimeout = globalThis.setTimeout
    const timeoutSpy = spyOn(globalThis, 'setTimeout').mockImplementation(((handler: any, timeout?: number, ...args: any[]) => {
      timeoutDelays.push(Number(timeout))
      return realSetTimeout(handler, 2_147_483_647, ...args)
    }) as typeof setTimeout)
    let imagePreviewCalls = 0
    const fetchImpl = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = String(input)
      const method = String(init.method || 'GET').toUpperCase()
      const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined
      calls.push({ url, method, body })

      if (url.endsWith('/api/status')) return json({ ok: true })
      if (url.endsWith('/api/skills/settings')) return json({ skill_compiler_model_id: 7 })
      if (url.endsWith('/api/models')) return json([{ id: 7, model_name: 'vision-chat', capabilities: { chat: true, vision: true } }])
      for (const fixture of IMAGE_FIXTURES) {
        if (url.endsWith(`/api/assets/${fixture.id}`)) return json({ id: fixture.id, type: 'image', data: { file_path: fixture.filePath } })
        if (url.endsWith(`/api/assets/media/${encodeURIComponent(fixture.filePath)}`)) {
          return new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), { headers: { 'content-type': 'image/png' } })
        }
      }
      if (url.endsWith('/api/skills/packs') && method === 'POST') {
        return json({
          record: { id: 'MiniMax-H3', sourceUrl: 'https://github.com/MiniMax-AI/MiniMax-H3', revision: REVISION, installedAt: '2026-08-09T00:00:00.000Z', status: 'installed' },
          skills: [{ packId: 'MiniMax-H3', name: 'h3-prompt-writing', revision: REVISION, compatibility: 'prompt_ready', mediaModes: ['text_to_video', 'image_to_video'] }],
        }, 201)
      }
      if (url.endsWith('/api/skills') && method === 'GET') {
        return json({
          skills: [{ packId: 'MiniMax-H3', name: 'h3-prompt-writing', revision: REVISION, compatibility: 'prompt_ready', mediaModes: ['text_to_video', 'image_to_video'] }],
          packs: [{ id: 'MiniMax-H3', sourceUrl: 'https://github.com/MiniMax-AI/MiniMax-H3', revision: REVISION, installedAt: '2026-08-09T00:00:00.000Z', status: 'installed' }],
          settings: { skill_compiler_model_id: 7 },
        })
      }
      if (url.endsWith('/api/skills/compile-preview') && method === 'POST') {
        const isImage = body.mode === 'image_to_video'
        if (isImage) imagePreviewCalls += 1
        return json({
          result: {
            skill_name: 'h3-prompt-writing', skill_version: REVISION, mode: body.mode,
            prompt: isImage ? 'Ref2VA compiled prompt' : 'T2VA compiled prompt', negative_prompt: '', parameters: {},
            references_used: REFERENCES, warnings: [],
            reference_mode_hint: isImage ? 'Ref2VA' : 'T2VA',
            reference_bindings: isImage ? ORDERED_REFERENCE_BINDINGS : [],
          },
          cache_key: isImage ? '2'.repeat(64) : '1'.repeat(64),
          cached: isImage && imagePreviewCalls > 1,
        })
      }
      return json({ error: 'unexpected request' }, 500)
    }

    let result: Awaited<ReturnType<typeof runH3Acceptance>>
    try {
      result = await runH3Acceptance({
        env: {
          MANGAFORGE_H3_E2E: '1',
          MANGAFORGE_H3_IMAGE_ASSET_IDS: '42,43,44',
          MANGAFORGE_H3_IMAGE_ASSET_ID: '42',
          MANGAFORGE_H3_API_BASE: 'http://127.0.0.1:8787/api',
        },
        fetchImpl: fetchImpl as typeof fetch,
        log: message => logs.push(message),
      })
    } finally {
      timeoutSpy.mockRestore()
    }

    expect(result).toEqual({
      skipped: false,
      revision: REVISION,
      references: REFERENCES,
      hashes: { text_to_video: '1'.repeat(64), image_to_video: '2'.repeat(64) },
    })
    const installIndex = calls.findIndex(call => call.method === 'POST' && call.url.endsWith('/api/skills/packs'))
    expect(installIndex).toBeGreaterThanOrEqual(0)
    for (const path of [
      '/api/status',
      '/api/skills/settings',
      '/api/models',
      '/api/assets/42',
      '/api/assets/43',
      '/api/assets/44',
      '/api/assets/media/assets%2Ffirst.png',
      '/api/assets/media/assets%2Fcharacter.png',
      '/api/assets/media/assets%2Flast.png',
    ]) {
      const preflightIndex = calls.findIndex(call => call.url.endsWith(path))
      expect(preflightIndex).toBeGreaterThanOrEqual(0)
      expect(preflightIndex).toBeLessThan(installIndex)
    }
    expect(calls[installIndex]?.body).toEqual({ url: 'https://github.com/MiniMax-AI/MiniMax-H3' })
    const previews = calls.filter(call => call.url.endsWith('/api/skills/compile-preview')).map(call => call.body)
    expect(previews).toHaveLength(3)
    expect(previews.map(body => body.skill_revision)).toEqual([REVISION, REVISION, REVISION])
    expect(previews[0]).toMatchObject({ pack_id: 'MiniMax-H3', skill_name: 'h3-prompt-writing', skill_revision: REVISION, mode: 'text_to_video', compiler_model_id: 7 })
    expect(previews[0].assets).toEqual([])
    expect(previews[1]).toMatchObject({ mode: 'image_to_video' })
    expect(previews[1].assets).toEqual(ORDERED_IMAGE_ASSETS)
    expect(previews[1].prompt).toBe(expectedImageAcceptancePrompt('Ref2VA', ORDERED_IMAGE_ASSETS))
    expect(previews[2]).toEqual(previews[1])
    expect(timeoutDelays).toEqual([
      15_000, 15_000, 15_000,
      15_000, 15_000, 15_000,
      15_000, 15_000, 15_000,
      660_000,
      15_000,
      660_000, 660_000, 660_000,
    ])
    expect(logs.join('\n')).toContain(`revision: ${REVISION}`)
    expect(logs.join('\n')).toContain(`references: ${REFERENCES.join(', ')}`)
  })

  test('redacts credentials from typed network errors and printable text', async () => {
    const secret = 'sk-super-secret-token-123456'
    expect(redactSensitive(`Authorization: Bearer abc.def api_key=${secret} token=raw-token`)).not.toContain(secret)
    expect(redactSensitive('Authorization: Bearer abc.def api_key=secret token=raw-token')).not.toContain('abc.def')
    const jsonSecrets = redactSensitive('{"api_key":"json-key","access_token":"json-token","authorization":"Bearer json-auth"}')
    expect(jsonSecrets).not.toContain('json-key')
    expect(jsonSecrets).not.toContain('json-token')
    expect(jsonSecrets).not.toContain('json-auth')
    const prefixedKeys = redactSensitive('x-api-key: header-secret\nX-API-Key=equals-secret OPENAI_API_KEY=env-secret')
    expect(prefixedKeys).not.toContain('header-secret')
    expect(prefixedKeys).not.toContain('equals-secret')
    expect(prefixedKeys).not.toContain('env-secret')

    let caught: unknown
    try {
      await runH3Acceptance({
        env: { MANGAFORGE_H3_E2E: '1', MANGAFORGE_H3_IMAGE_ASSET_ID: '42' },
        fetchImpl: async () => { throw new Error(`Authorization: Bearer abc.def api_key=${secret}`) },
        log: () => {},
      })
    } catch (error) { caught = error }
    expect(caught).toBeInstanceOf(H3AcceptanceError)
    expect(caught).toMatchObject({ code: 'H3_E2E_NETWORK' })
    expect(String((caught as Error).message)).not.toContain(secret)
    expect(String((caught as Error).message)).not.toContain('abc.def')
  })

  test('redacts URL userinfo and signing parameters from typed response-body errors', async () => {
    const credentialUrl = 'https://client-user:client-pass@api.example.test/v1/compile?X-Amz-Credential=credential%2Fvalue&X-Amz-Signature=amz-value&signature=plain-value&sig=encoded%2Fvalue'
    const errorText = `POST ${credentialUrl} failed with HTTP 502`
    const assertRedactedDiagnostic = (value: string) => {
      for (const leaked of [
        'client-user', 'client-pass', 'credential/value', 'credential%2Fvalue',
        'amz-value', 'plain-value', 'encoded/value', 'encoded%2Fvalue',
      ]) expect(value).not.toContain(leaked)
      expect(value).toContain('api.example.test/v1/compile')
      expect(value).toContain('HTTP 502')
    }

    assertRedactedDiagnostic(redactSensitive(errorText))

    let caught: unknown
    try {
      await runH3Acceptance({
        env: { MANGAFORGE_H3_E2E: '1', MANGAFORGE_H3_IMAGE_ASSET_ID: '42' },
        fetchImpl: async () => new Response(new ReadableStream<Uint8Array>({
          start(controller) { controller.error(new Error(errorText)) },
        }), { status: 200, headers: { 'content-type': 'application/json' } }),
        log: () => {},
      })
    } catch (error) { caught = error }
    expect(caught).toBeInstanceOf(H3AcceptanceError)
    expect(caught).toMatchObject({ code: 'H3_E2E_NETWORK' })
    assertRedactedDiagnostic(String((caught as Error).message))
  })
})
