import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { registerFingerprintContractRoutes } from './fingerprint-contracts'

let dirs: string[] = []

function createRouteHarness() {
  const handlers = new Map<string, any>()
  const app: any = {
    get: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`GET ${path}`, handler)
      return app
    },
    post: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`POST ${path}`, handler)
      return app
    },
    put: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`PUT ${path}`, handler)
      return app
    },
    delete: (paths: string | string[], handler: any) => {
      for (const path of Array.isArray(paths) ? paths : [paths]) handlers.set(`DELETE ${path}`, handler)
      return app
    },
  }
  return { app, handlers, order: () => [...handlers.keys()] }
}

async function call(handler: any, req: any = {}) {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) { this.statusCode = code; return this },
    json(body: any) { this.body = body; return this },
  }
  await handler(req, res)
  return res
}

/** 工作区目录（假仓库根），库路径为 <ws>/workspace/fingerprint-lib。 */
async function tempWorkspace() {
  const root = await mkdtemp(join(tmpdir(), 'mangaforge-fp-routes-'))
  dirs.push(root)
  const lib = join(root, 'workspace', 'fingerprint-lib')
  await mkdir(join(lib, 'contracts', 'by-genre'), { recursive: true })
  await writeFile(
    join(lib, 'contracts', 'active-contract.json'),
    JSON.stringify({
      version: 1,
      name: 'qidian_free_rank_human',
      built_from: ['a'],
      target: {
        cv_para: [0.5, 0.7], single_sentence_para_ratio: [0.8, 0.97], two_sentence_para_ratio: [0.02, 0.15],
        dialogue_para_ratio: [0.1, 0.33], max_mid_streak_max: 6, template_contrast_per_1k_max: 1,
        stock_adverb_per_1k_max: 1.5, clinical_hit_per_1k_max: 0.5, subject_ta_opener_ratio_max: 0.35,
      },
      avoid: ['a'], prefer: ['p'], prompt_directives: ['他/姓名起句占比 ≤0.35；优先物件/触感/半截对白起句。'],
    }),
    'utf8',
  )
  return root
}

afterEach(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })))
  dirs = []
})

describe('fingerprint contract routes', () => {
  test('registers literal routes before the :id parameter route', async () => {
    const { app, order } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => '/tmp/none')
    const keys = order()
    const idIndex = keys.findIndex((k) => k === 'GET /api/fingerprint-contracts/:id')
    for (const literal of ['GET /api/fingerprint-contracts/active', 'GET /api/fingerprint-contracts/samples-status', 'GET /api/fingerprint-contracts/scores']) {
      expect(keys.indexOf(literal)).toBeGreaterThanOrEqual(0)
      expect(keys.indexOf(literal)).toBeLessThan(idIndex)
    }
  })

  test('GET list returns the builtin set', async () => {
    const ws = await tempWorkspace()
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => join(ws, 'workspace'))
    const res = await call(handlers.get('GET /api/fingerprint-contracts'), {})
    expect(res.statusCode).toBe(200)
    expect(res.body.sets[0].id).toBe('builtin')
    expect(res.body.selection.active_set_id).toBe('builtin')
  })

  test('GET active reports the resolved contract', async () => {
    const ws = await tempWorkspace()
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => join(ws, 'workspace'))
    const res = await call(handlers.get('GET /api/fingerprint-contracts/active'), {})
    expect(res.body.contract_name).toBe('qidian_free_rank_human')
    expect(res.body.set_id).toBe('builtin')
    expect(res.body.locked).toBe(false)
  })

  test('GET samples-status reports an empty corpus', async () => {
    const ws = await tempWorkspace()
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => join(ws, 'workspace'))
    const res = await call(handlers.get('GET /api/fingerprint-contracts/samples-status'), {})
    expect(res.body.available).toBe(false)
    expect(res.body.count).toBe(0)
  })

  test('PUT selection rejects an unknown set and accepts a known one', async () => {
    const ws = await tempWorkspace()
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => join(ws, 'workspace'))
    const bad = await call(handlers.get('PUT /api/fingerprint-contracts/selection'), { body: { active_set_id: 'ghost' } })
    expect(bad.statusCode).toBe(400)
    const ok = await call(handlers.get('PUT /api/fingerprint-contracts/selection'), { body: { active_set_id: 'builtin' } })
    expect(ok.statusCode).toBe(200)
    expect(ok.body.selection.active_set_id).toBe('builtin')
  })

  test('DELETE refuses to remove the builtin set', async () => {
    const ws = await tempWorkspace()
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => join(ws, 'workspace'))
    const res = await call(handlers.get('DELETE /api/fingerprint-contracts/:id'), { params: { id: 'builtin' } })
    expect(res.statusCode).toBe(400)
    expect(String(res.body.error)).toContain('内置')
  })

  test('POST generate rejects offline mode without samples', async () => {
    const ws = await tempWorkspace()
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => join(ws, 'workspace'))
    const res = await call(handlers.get('POST /api/fingerprint-contracts/generate'), { body: { mode: 'offline_refit' } })
    expect(res.statusCode).toBe(400)
    expect(String(res.body.error)).toContain('样本')
  })

  test('every handler answers 500 instead of throwing when the workspace is broken', async () => {
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => { throw new Error('workspace exploded') })
    for (const key of ['GET /api/fingerprint-contracts', 'GET /api/fingerprint-contracts/active', 'GET /api/fingerprint-contracts/samples-status', 'GET /api/fingerprint-contracts/scores']) {
      const res = await call(handlers.get(key), {})
      expect(res.statusCode).toBe(500)
    }
  })
})
