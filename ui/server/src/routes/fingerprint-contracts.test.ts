import { afterEach, describe, expect, mock, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { registerFingerprintContractRoutes } from './fingerprint-contracts'
import { createNovelProject, createNovelReview } from '../novel'
import { buildFingerprintScoreReviewRecord } from '../fingerprint-contract-scores'
import * as workspaceModule from '../workspace'

// Captured before any mock.module() call touches '../workspace', so the
// 'GET active' test below can restore the real module exactly.
const realWorkspaceModule = { ...workspaceModule }

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
      name: 'ROUTE_FIXTURE_CONTRACT',
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

function sampleText(seed: number) {
  const paras: string[] = []
  for (let i = 0; i < 30; i += 1) {
    if (i % 4 === 0) paras.push('“先别动。”他把手电递过去。')
    else paras.push(`他伸手摸了一下门框第${seed}-${i}道。`)
  }
  return `${paras.join('\n\n')}\n`
}

/** 在 <libRoot>/human/urban/ 下写 n 个 .txt 样本，供离线重拟合任务消费。 */
async function writeSamples(libRoot: string, n: number) {
  const dir = join(libRoot, 'human', 'urban')
  await mkdir(dir, { recursive: true })
  for (let i = 0; i < n; i += 1) {
    await writeFile(join(dir, `human_qd_${i}.txt`), sampleText(i), 'utf8')
  }
}

/** 落库一条可被 parseFingerprintScoreRow 解析的指纹打分评审，workspace 取自 tempWorkspace()/'workspace'。 */
async function seedFingerprintScoreReview(
  workspace: string,
  opts: { setId: string; chapterNo: number; createdAt: string },
) {
  const project = await createNovelProject(workspace, { title: `proj-${opts.setId}-${opts.chapterNo}` })
  const record = buildFingerprintScoreReviewRecord({
    projectId: project.id,
    chapterId: opts.chapterNo,
    chapterNo: opts.chapterNo,
    setId: opts.setId,
    setLabel: opts.setId,
    contractName: 'test_contract',
    locked: false,
    contractScore: {
      checks: [
        { key: 'cv_para', ok: true, value: 0.6, target: [0.5, 0.7] },
        { key: 'stock_adverb_per_1k_max', ok: false, value: 2, target: 1.5 },
      ],
    },
    textChars: 1000,
    createdAt: opts.createdAt,
  })
  await createNovelReview(workspace, { ...record, created_at: opts.createdAt })
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
    // resolveFingerprintContractInfo() (called with no cwd, matching production) resolves
    // through loadActiveWorkspaceSync(), not through the getWorkspace() callback below — so
    // this must mock the former to actually exercise the injected workspace. Without it, the
    // fixture's distinctive name (ROUTE_FIXTURE_CONTRACT) would never match, proving the two
    // are wired together instead of just coincidentally sharing the real repo's contract name.
    mock.module('../workspace', () => ({ ...realWorkspaceModule, loadActiveWorkspaceSync: () => join(ws, 'workspace') }))
    try {
      const { app, handlers } = createRouteHarness()
      registerFingerprintContractRoutes(app, () => join(ws, 'workspace'))
      const res = await call(handlers.get('GET /api/fingerprint-contracts/active'), {})
      expect(res.body.contract_name).toBe('ROUTE_FIXTURE_CONTRACT')
      expect(res.body.set_id).toBe('builtin')
      expect(res.body.locked).toBe(false)
    } finally {
      mock.module('../workspace', () => realWorkspaceModule)
    }
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

  test('GET scores with set_id filters rows to that contract set only', async () => {
    const ws = await tempWorkspace()
    const workspace = join(ws, 'workspace')
    await seedFingerprintScoreReview(workspace, { setId: 'set-alpha', chapterNo: 1, createdAt: '2026-01-01T00:00:00.000Z' })
    await seedFingerprintScoreReview(workspace, { setId: 'set-alpha', chapterNo: 2, createdAt: '2026-01-02T00:00:00.000Z' })
    await seedFingerprintScoreReview(workspace, { setId: 'set-beta', chapterNo: 50, createdAt: '2026-01-03T00:00:00.000Z' })
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => workspace)
    const res = await call(handlers.get('GET /api/fingerprint-contracts/scores'), { query: { set_id: 'set-alpha' } })
    expect(res.statusCode).toBe(200)
    const chapterNos = res.body.rows.map((row: any) => row.chapter_no).sort()
    expect(chapterNos).toEqual([1, 2])
    expect(chapterNos).not.toContain(50)
  })

  test('GET scores without set_id returns rows from every contract set', async () => {
    const ws = await tempWorkspace()
    const workspace = join(ws, 'workspace')
    await seedFingerprintScoreReview(workspace, { setId: 'set-alpha', chapterNo: 1, createdAt: '2026-01-01T00:00:00.000Z' })
    await seedFingerprintScoreReview(workspace, { setId: 'set-beta', chapterNo: 50, createdAt: '2026-01-02T00:00:00.000Z' })
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => workspace)
    const res = await call(handlers.get('GET /api/fingerprint-contracts/scores'), {})
    const chapterNos = res.body.rows.map((row: any) => row.chapter_no).sort()
    expect(chapterNos).toEqual([1, 50])
  })

  test('GET scores with set_id still aggregates across every contract set', async () => {
    const ws = await tempWorkspace()
    const workspace = join(ws, 'workspace')
    await seedFingerprintScoreReview(workspace, { setId: 'set-alpha', chapterNo: 1, createdAt: '2026-01-01T00:00:00.000Z' })
    await seedFingerprintScoreReview(workspace, { setId: 'set-beta', chapterNo: 50, createdAt: '2026-01-02T00:00:00.000Z' })
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => workspace)
    const res = await call(handlers.get('GET /api/fingerprint-contracts/scores'), { query: { set_id: 'set-alpha' } })
    const setIds = res.body.aggregates.map((group: any) => group.set_id).sort()
    expect(setIds).toEqual(['set-alpha', 'set-beta'])
  })

  test('GET scores with an unknown set_id returns an empty row list without erroring', async () => {
    const ws = await tempWorkspace()
    const workspace = join(ws, 'workspace')
    await seedFingerprintScoreReview(workspace, { setId: 'set-alpha', chapterNo: 1, createdAt: '2026-01-01T00:00:00.000Z' })
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => workspace)
    const res = await call(handlers.get('GET /api/fingerprint-contracts/scores'), { query: { set_id: 'no-such-set' } })
    expect(res.statusCode).toBe(200)
    expect(res.body.rows).toEqual([])
  })

  test('generate job records the produced set id when it completes', async () => {
    const ws = await tempWorkspace()
    await writeSamples(join(ws, 'workspace', 'fingerprint-lib'), 4)
    const { app, handlers } = createRouteHarness()
    registerFingerprintContractRoutes(app, () => join(ws, 'workspace'))
    const started = await call(handlers.get('POST /api/fingerprint-contracts/generate'), {
      body: { mode: 'offline_refit', label: '回填测试' },
    })
    expect(started.statusCode).toBe(200)
    const jobId = started.body.job.id
    let job = started.body.job
    for (let i = 0; i < 60 && job.status !== 'completed' && job.status !== 'failed'; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      job = (await call(handlers.get('GET /api/fingerprint-contracts/jobs/:jobId'), { params: { jobId } })).body.job
    }
    expect(job.status).toBe('completed')
    expect(job.set_id).toBe(jobId)
  })
})
