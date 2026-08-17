import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelProject } from '../novel'
import { openKernelDb } from '../kernel/db'
import { insertKernelCandidate, insertKernelCommit, insertKernelJob, insertKernelArtifact } from '../kernel/jobs/repo'
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

describe('oh-story bridge to kernel jobs', () => {
  test('review button returns old shape from committed kernel job', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'bridge-'))
    const project = await createNovelProject(ws, { title: '书' })
    const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: '正文。' })
    const vaultFile = join(mkdtempSync(join(tmpdir(), 'bridge-vault-')), 'r.md')
    writeFileSync(vaultFile, 'Fallback: none\n报告正文')
    const createKernelJob = async (workspace: string, body: any) => {
      expect(body.contract_ids).toEqual(['oh-story-core.story-review.full'])
      insertKernelJob(workspace, { id: 'job-1', project_id: body.project_id, workspace_scope: 'novel', title: '', status: 'committed', capability: 'review', subject_type: 'chapter', subject_id: body.subject_id, model_provider_id: '', model_id: body.model_id, error_code: '', error_message: '', verb: '', verb_params: '{}', subject_key: '', brief_json: '' })
      insertKernelCandidate(workspace, { id: 'cand-1', job_id: 'job-1', contract_id: body.contract_ids[0], pack_id: 'oh-story-core', pack_revision: 'r', skill_name: 'story-review', status: 'committed' })
      insertKernelArtifact(workspace, { id: 'art-1', candidate_id: 'cand-1', artifact_kind: 'review_report', rel_path: '审稿/第002章.md', sha256: 'h', byte_size: 8, vault_path: vaultFile })
      insertKernelCommit(workspace, { id: 'commit-1', job_id: 'job-1', candidate_id: 'cand-1', domain_table: 'reviews', domain_row_id: 42 })
      return { ok: true, jobId: 'job-1', done: Promise.resolve() }
    }
    const handlers = harness(ws, createKernelJob)
    const res = await callRoute(handlers.get('POST /api/novel/oh-story/core/review'), {
      body: { project_id: project.id, chapter_id: chapter.id, model_id: 9 },
    })
    expect(res.statusCode).toBe(200)
    expect(res.body).toMatchObject({ ok: true, changed: false, review_id: 42, kernel_job_id: 'job-1' })
    expect(res.body.report_text).toContain('报告正文')
  })

  test('failed job maps error codes to legacy statuses', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'bridge-'))
    const project = await createNovelProject(ws, { title: '书' })
    const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: '正文。' })
    const createKernelJob = async (workspace: string, body: any) => {
      insertKernelJob(workspace, { id: 'job-2', project_id: body.project_id, workspace_scope: 'novel', title: '', status: 'failed', capability: 'rewrite', subject_type: 'chapter', subject_id: body.subject_id, model_provider_id: '', model_id: body.model_id, error_code: 'OH_STORY_APPLY_STALE_REVIEW', error_message: '', verb: '', verb_params: '{}', subject_key: '', brief_json: '' })
      return { ok: true, jobId: 'job-2', done: Promise.resolve() }
    }
    const handlers = harness(ws, createKernelJob)
    const res = await callRoute(handlers.get('POST /api/novel/oh-story/core/apply'), {
      body: { project_id: project.id, chapter_id: chapter.id },
    })
    expect(res.statusCode).toBe(409)
    expect(res.body.code).toBe('OH_STORY_APPLY_STALE_REVIEW')
    expect(res.body.error).toBe('先对本稿重新审稿')
    expect(res.body.kernel_job_id).toBe('job-2')
  })

  test('runtime unavailable surfaces 503 without fallback', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'bridge-'))
    const project = await createNovelProject(ws, { title: '书' })
    const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: '正文。' })
    const handlers = harness(ws, async () => ({ ok: false, status: 503, code: 'KERNEL_RUNTIME_UNAVAILABLE', message: 'no codex' }))
    const res = await callRoute(handlers.get('POST /api/novel/oh-story/core/deslop'), {
      body: { project_id: project.id, chapter_id: chapter.id },
    })
    expect(res.statusCode).toBe(503)
    expect(res.body.code).toBe('KERNEL_RUNTIME_UNAVAILABLE')
  })

  test('bridge tags kernel jobs with the workbench verb', async () => {
    const expected: Record<string, string> = {
      review: 'review_chapter',
      deslop: 'deslop_chapter',
      apply: 'apply_review',
    }
    for (const action of Object.keys(expected)) {
      const ws = mkdtempSync(join(tmpdir(), 'bridge-verb-'))
      const project = await createNovelProject(ws, { title: '书' })
      const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: '正文。' })
      const createKernelJob = async (workspace: string, body: any) => {
        insertKernelJob(workspace, {
          id: 'job-verb', project_id: body.project_id, workspace_scope: 'novel', title: '',
          status: 'failed', capability: 'review', subject_type: 'chapter', subject_id: body.subject_id,
          model_provider_id: '', model_id: body.model_id, error_code: 'ENGINE_FAILED', error_message: '',
          verb: String(body.verb || ''), verb_params: '{}', subject_key: '', brief_json: '',
        })
        return { ok: true, jobId: 'job-verb', done: Promise.resolve() }
      }
      const handlers = harness(ws, createKernelJob)
      await callRoute(handlers.get(`POST /api/novel/oh-story/core/${action}`), {
        body: { project_id: project.id, chapter_id: chapter.id, model_id: 9 },
      })
      const db = openKernelDb(ws)
      const row = db.query(`SELECT verb FROM kernel_jobs ORDER BY created_at DESC LIMIT 1`).get() as any
      db.close()
      expect(row.verb).toBe(expected[action])
    }
  })
})
