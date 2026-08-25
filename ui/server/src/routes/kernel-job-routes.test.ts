import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelProject } from '../novel'
import { registerKernelJobRoutes } from './kernel-job-routes'

function routeHarness(ws: string, createJob?: any) {
  const handlers = new Map<string, any>()
  const app: any = {}
  for (const method of ['get', 'put', 'post', 'delete']) {
    app[method] = (path: string, handler: any) => { handlers.set(`${method.toUpperCase()} ${path}`, handler); return app }
  }
  registerKernelJobRoutes(app, { getWorkspace: () => ws, ...(createJob ? { createJob } : {}) })
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

function stubCreateJob(result: any) {
  return async () => result
}

describe('kernel job routes', () => {
  test('POST /jobs returns 202 with job id on success', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'job-routes-'))
    const handlers = routeHarness(ws, stubCreateJob({ ok: true, jobId: 'job-1', done: Promise.resolve() }))
    const res = await callRoute(handlers.get('POST /api/kernel/jobs'), { body: { project_id: 1, subject_type: 'chapter', subject_id: 2, contract_ids: ['x.y.z'], model_id: 9 } })
    expect(res.statusCode).toBe(202)
    expect(res.body).toEqual({ ok: true, job: { id: 'job-1', status: 'queued' } })
  })

  test('POST /jobs maps validation error status and code', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'job-routes-'))
    const handlers = routeHarness(ws, stubCreateJob({ ok: false, status: 503, code: 'KERNEL_RUNTIME_UNAVAILABLE', message: 'no codex' }))
    const res = await callRoute(handlers.get('POST /api/kernel/jobs'), { body: {} })
    expect(res.statusCode).toBe(503)
    expect(res.body.code).toBe('KERNEL_RUNTIME_UNAVAILABLE')
  })

  test('GET /jobs/:id returns detail with progress; 404 when missing', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'job-routes-'))
    const project = await createNovelProject(ws, { title: '书' })
    const { insertKernelJob } = await import('../kernel/jobs/repo')
    insertKernelJob(ws, { id: 'job-1', project_id: project.id, workspace_scope: 'novel', title: '', status: 'failed', capability: 'review', subject_type: 'chapter', subject_id: 2, model_provider_id: '', model_id: null, error_code: 'SKILL_NOT_FOUND', error_message: '', verb: '', verb_params: '{}', subject_key: '', brief_json: '' })
    const handlers = routeHarness(ws)
    const found = await callRoute(handlers.get('GET /api/kernel/jobs/:id'), { params: { id: 'job-1' } })
    expect(found.body.job.status).toBe('failed')
    expect(found.body.progress.error_code).toBe('SKILL_NOT_FOUND')
    const missing = await callRoute(handlers.get('GET /api/kernel/jobs/:id'), { params: { id: 'nope' } })
    expect(missing.statusCode).toBe(404)
  })

  test('GET /jobs lists by filters; cancel and commit surface repo results', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'job-routes-'))
    const project = await createNovelProject(ws, { title: '书' })
    const { insertKernelJob } = await import('../kernel/jobs/repo')
    insertKernelJob(ws, { id: 'job-1', project_id: project.id, workspace_scope: 'novel', title: '', status: 'committed', capability: 'review', subject_type: 'chapter', subject_id: 2, model_provider_id: '', model_id: null, error_code: '', error_message: '', verb: '', verb_params: '{}', subject_key: '', brief_json: '' })
    const handlers = routeHarness(ws)
    const list = await callRoute(handlers.get('GET /api/kernel/jobs'), { query: { project_id: String(project.id) } })
    expect(list.body.jobs.length).toBe(1)
    const cancelled = await callRoute(handlers.get('POST /api/kernel/jobs/:id/cancel'), { params: { id: 'job-1' } })
    expect(cancelled.statusCode).toBe(409)
    expect(cancelled.body.code).toBe('JOB_ALREADY_COMMITTED')
    const commit = await callRoute(handlers.get('POST /api/kernel/jobs/:id/commit'), { params: { id: 'job-1' }, body: { candidate_id: 'cand-x' } })
    expect([404, 409]).toContain(commit.statusCode)
  })

  test('GET /jobs lists adapt_pack by verb and subject_key', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'job-routes-'))
    const project = await createNovelProject(ws, { title: '书' })
    const { insertKernelJob } = await import('../kernel/jobs/repo')
    insertKernelJob(ws, {
      id: 'job-pack', project_id: project.id, workspace_scope: 'novel', title: '',
      status: 'running', capability: 'attachment', subject_type: 'pack', subject_id: 0,
      model_provider_id: '', model_id: null, error_code: '', error_message: '',
      verb: 'adapt_pack', verb_params: '{"skill_id":"my-style"}', subject_key: 'my-style', brief_json: '',
    })
    insertKernelJob(ws, {
      id: 'job-other', project_id: project.id, workspace_scope: 'novel', title: '',
      status: 'running', capability: 'attachment', subject_type: 'pack', subject_id: 0,
      model_provider_id: '', model_id: null, error_code: '', error_message: '',
      verb: 'adapt_pack', verb_params: '{"skill_id":"other-style"}', subject_key: 'other-style', brief_json: '',
    })
    const handlers = routeHarness(ws)
    const list = await callRoute(handlers.get('GET /api/kernel/jobs'), { query: { verb: 'adapt_pack', subject_key: 'my-style' } })
    expect(list.body.jobs.map((job: any) => job.id)).toEqual(['job-pack'])
  })

  test('artifact content endpoint reads vault file and 404s on unknown id', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'job-routes-'))
    const project = await createNovelProject(ws, { title: '书' })
    const { insertKernelArtifact, insertKernelCandidate, insertKernelJob } = await import('../kernel/jobs/repo')
    insertKernelJob(ws, {
      id: 'job-1', project_id: project.id, workspace_scope: 'novel', title: '',
      status: 'awaiting_selection', capability: 'outline', subject_type: 'project', subject_id: project.id,
      model_provider_id: '', model_id: null, error_code: '', error_message: '',
      verb: '', verb_params: '{}', subject_key: '', brief_json: '',
    })
    insertKernelCandidate(ws, {
      id: 'cand-1', job_id: 'job-1', contract_id: 'oh-story-core.story-long-write.open',
      pack_id: 'oh-story-core', pack_revision: 'rev', skill_name: 'story-long-write', status: 'succeeded',
    })
    const vaultPath = join(ws, 'world.md')
    writeFileSync(vaultPath, '# 世界观\n正文')
    insertKernelArtifact(ws, {
      id: 'art-1', candidate_id: 'cand-1', artifact_kind: 'world_doc',
      rel_path: '设定/世界观.md', sha256: 'h', byte_size: 20, vault_path: vaultPath,
    })
    const handlers = routeHarness(ws)
    const ok = await callRoute(handlers.get('GET /api/kernel/artifacts/:id/content'), { params: { id: 'art-1' } })
    expect(ok.statusCode).toBe(200)
    expect(ok.body.content).toContain('世界观')
    expect(ok.body.artifact).toEqual({
      id: 'art-1', rel_path: '设定/世界观.md', artifact_kind: 'world_doc', byte_size: 20,
    })
    const missing = await callRoute(handlers.get('GET /api/kernel/artifacts/:id/content'), { params: { id: 'art-nope' } })
    expect(missing.statusCode).toBe(404)
    expect(missing.body.code).toBe('ARTIFACT_NOT_FOUND')
  })

  test('artifact content endpoint truncates files over 256KiB', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'job-routes-'))
    const project = await createNovelProject(ws, { title: '书' })
    const { insertKernelArtifact, insertKernelCandidate, insertKernelJob } = await import('../kernel/jobs/repo')
    insertKernelJob(ws, {
      id: 'job-1', project_id: project.id, workspace_scope: 'novel', title: '',
      status: 'awaiting_selection', capability: 'outline', subject_type: 'project', subject_id: project.id,
      model_provider_id: '', model_id: null, error_code: '', error_message: '',
      verb: '', verb_params: '{}', subject_key: '', brief_json: '',
    })
    insertKernelCandidate(ws, {
      id: 'cand-1', job_id: 'job-1', contract_id: 'oh-story-core.story-long-write.open',
      pack_id: 'oh-story-core', pack_revision: 'rev', skill_name: 'story-long-write', status: 'succeeded',
    })
    const LIMIT = 256 * 1024
    const vaultPath = join(ws, 'big.md')
    writeFileSync(vaultPath, 'x'.repeat(LIMIT + 1))
    insertKernelArtifact(ws, {
      id: 'art-big', candidate_id: 'cand-1', artifact_kind: 'world_doc',
      rel_path: '设定/大文件.md', sha256: 'h', byte_size: LIMIT + 1, vault_path: vaultPath,
    })
    const handlers = routeHarness(ws)
    const res = await callRoute(handlers.get('GET /api/kernel/artifacts/:id/content'), { params: { id: 'art-big' } })
    expect(res.statusCode).toBe(200)
    expect(res.body.truncated).toBe(true)
    expect(res.body.content.length).toBe(LIMIT)
  })
})
