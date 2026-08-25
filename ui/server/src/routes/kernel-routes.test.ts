import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { registerKernelRoutes } from './kernel-routes'

function routeHarness(ws: string) {
  const handlers = new Map<string, any>()
  const app: any = {}
  for (const method of ['get', 'put', 'post', 'delete']) {
    app[method] = (path: string, handler: any) => { handlers.set(`${method.toUpperCase()} ${path}`, handler); return app }
  }
  registerKernelRoutes(app, { getWorkspace: () => ws })
  return handlers
}

async function callRoute(handler: any, req: any = {}) {
  const res: any = {
    statusCode: 200, body: null,
    status(code: number) { this.statusCode = code; return this },
    json(body: any) { this.body = body; return this },
  }
  await handler(req, res)
  return res
}

describe('kernel contract routes', () => {
  test('GET /api/kernel/contracts lists builtins with runtime state', async () => {
    const handlers = routeHarness(mkdtempSync(join(tmpdir(), 'kernel-routes-')))
    const res = await callRoute(handlers.get('GET /api/kernel/contracts'))
    expect(res.statusCode).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.contracts.map((c: { id: string }) => c.id).sort()).toEqual([
      'mangaforge.adapt-pack.meta',
      'oh-story-core.story-apply.surgical',
      'oh-story-core.story-deslop.file',
      'oh-story-core.story-long-write.chapter',
      'oh-story-core.story-long-write.continue',
      'oh-story-core.story-long-write.expand',
      'oh-story-core.story-long-write.open',
      'oh-story-core.story-long-write.outline',
      'oh-story-core.story-long-write.rewrite',
      'oh-story-core.story-review.full',
    ])
    expect(typeof res.body.runtime.available).toBe('boolean')
  })

  test('POST rejects builtin override with 400 CONTRACT_BUILTIN', async () => {
    const handlers = routeHarness(mkdtempSync(join(tmpdir(), 'kernel-routes-')))
    const list = await callRoute(handlers.get('GET /api/kernel/contracts'))
    const res = await callRoute(handlers.get('POST /api/kernel/contracts'), { body: list.body.contracts[0] })
    expect(res.statusCode).toBe(400)
    expect(res.body.code).toBe('CONTRACT_BUILTIN')
  })

  test('POST invalid body -> 400 CONTRACT_INVALID', async () => {
    const handlers = routeHarness(mkdtempSync(join(tmpdir(), 'kernel-routes-')))
    const res = await callRoute(handlers.get('POST /api/kernel/contracts'), { body: { schema_version: 1 } })
    expect(res.statusCode).toBe(400)
    expect(res.body.code).toBe('CONTRACT_INVALID')
  })

  test('DELETE builtin -> 400, unknown -> 404', async () => {
    const handlers = routeHarness(mkdtempSync(join(tmpdir(), 'kernel-routes-')))
    const builtin = await callRoute(handlers.get('DELETE /api/kernel/contracts/:id'), { params: { id: 'oh-story-core.story-review.full' } })
    expect(builtin.statusCode).toBe(400)
    const missing = await callRoute(handlers.get('DELETE /api/kernel/contracts/:id'), { params: { id: 'a.b.c' } })
    expect(missing.statusCode).toBe(404)
  })

  test('GET /api/kernel/runtime reports availability and null probe initially', async () => {
    const handlers = routeHarness(mkdtempSync(join(tmpdir(), 'kernel-routes-')))
    const res = await callRoute(handlers.get('GET /api/kernel/runtime'))
    expect(res.statusCode).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.probe).toBeNull()
  })

  test('POST /api/kernel/runtime/probe writes and returns probe result', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'kernel-routes-'))
    writeFileSync(join(ws, 'providers.json'), '[]')
    mkdirSync(join(ws, '.mangaforge', 'kernel'), { recursive: true })
    writeFileSync(join(ws, '.mangaforge', 'kernel', 'runtime.json'), JSON.stringify({
      binary: 'codex-definitely-missing-binary',
    }))
    const handlers = routeHarness(ws)
    const res = await callRoute(handlers.get('POST /api/kernel/runtime/probe'))
    expect(res.statusCode).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.probe.binary.ok).toBe(false)
    expect(res.body.probe.skills).toBe('pending')
    expect(res.body.probe.agents_spawn).toBe('pending')
  })

  test('GET contracts flips implemented when probe skills failed', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'kernel-routes-'))
    const probe = {
      checked_at: 'x', binary: { ok: true }, handshake: { ok: true }, providers: {},
      skills: { ok: false, message: 'pack 未安装' }, agents_spawn: 'pending',
    }
    mkdirSync(join(ws, '.mangaforge', 'kernel'), { recursive: true })
    writeFileSync(join(ws, '.mangaforge', 'kernel', 'probe.json'), JSON.stringify(probe))
    const handlers = routeHarness(ws)
    const res = await callRoute(handlers.get('GET /api/kernel/contracts'))
    const review = res.body.contracts.find((c: any) => c.id === 'oh-story-core.story-review.full')
    expect(review.implemented).toBe(false)
    expect(review.implemented_reason).toBe('SKILLS_PROBE_FAILED')
  })
})
