import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { registerOhStoryCoreRoutes } from './novel-oh-story-core-routes'

function harness(ws: string, createKernelJob: any) {
  const handlers = new Map<string, any>()
  const app: any = {}
  for (const method of ['get', 'post']) {
    app[method] = (path: string, handler: any) => { handlers.set(`${method.toUpperCase()} ${path}`, handler); return app }
  }
  registerOhStoryCoreRoutes(app, {
    getWorkspace: () => ws,
    getProject: async () => ({ id: 1 }),
    createKernelJob,
  } as any)
  return handlers
}

async function callRoute(handler: any, req: any) {
  const res: any = {
    statusCode: 200, body: null,
    status(code: number) { this.statusCode = code; return this },
    json(body: any) { this.body = body; return this },
  }
  await handler(req, res)
  return res
}

const goneBody = {
  ok: false,
  code: 'ROUTE_REMOVED',
  error: '请改用 POST /api/kernel/jobs',
}

describe('oh-story bridge to kernel jobs', () => {
  test('legacy core action routes are gone and do not start kernel jobs', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'bridge-'))
    let created = 0
    const handlers = harness(ws, async () => { created += 1; return { ok: true, jobId: 'x', done: Promise.resolve() } })
    const res = await callRoute(handlers.get('POST /api/novel/oh-story/core/review'), {
      body: { project_id: 1, chapter_id: 1, model_id: 9 },
    })
    expect(res.statusCode).toBe(410)
    expect(res.body.code).toBe('ROUTE_REMOVED')
    expect(created).toBe(0)
  })

  test('review/deslop/apply all return 410 ROUTE_REMOVED', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'bridge-'))
    const handlers = harness(ws, async () => { throw new Error('should not create job') })
    for (const path of [
      'POST /api/novel/oh-story/core/review',
      'POST /api/novel/oh-story/core/deslop',
      'POST /api/novel/oh-story/core/apply',
    ]) {
      const res = await callRoute(handlers.get(path), { body: { project_id: 1, chapter_id: 1 } })
      expect(res.statusCode).toBe(410)
      expect(res.body).toEqual(goneBody)
    }
  })
})
