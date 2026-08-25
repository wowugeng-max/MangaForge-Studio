import { describe, expect, test } from 'bun:test'
import { CHAPTER_KERNEL_VERBS, createKernelJobApi } from './client'

function fakeRequest(handler: (method: string, path: string, body?: any) => { status: number; data: any }) {
  return async (method: 'GET' | 'POST' | 'PUT', path: string, body?: unknown) => handler(method, path, body)
}

describe('createKernelJobApi', () => {
  test('createJob posts verb-mapped kernel job and returns 202 job id', async () => {
    const seen: any[] = []
    const api = createKernelJobApi(fakeRequest((method, path, body) => {
      seen.push({ method, path, body })
      return { status: 202, data: { ok: true, job: { id: 'job-1', status: 'queued' } } }
    }))
    const result = await api.createJob({ projectId: 3, chapterId: 11, modelId: 7, action: 'review' })
    expect(result).toEqual({ ok: true, jobId: 'job-1' })
    expect(seen[0]).toEqual({
      method: 'POST',
      path: '/kernel/jobs',
      body: {
        project_id: 3,
        subject_type: 'chapter',
        subject_id: 11,
        verb: CHAPTER_KERNEL_VERBS.review,
        model_id: 7,
      },
    })
  })

  test('createJob includes contract_ids only when provided', async () => {
    const seen: any[] = []
    const api = createKernelJobApi(fakeRequest((_m, _p, body) => {
      seen.push(body)
      return { status: 202, data: { ok: true, job: { id: 'job-2', status: 'queued' } } }
    }))
    await api.createJob({
      projectId: 3, chapterId: 11, modelId: 7, action: 'deslop',
      contractIds: ['oh-story-core.story-deslop.file', 'user.deslop.alt'],
    })
    expect(seen[0].contract_ids).toEqual(['oh-story-core.story-deslop.file', 'user.deslop.alt'])
    expect(seen[0].verb).toBe('deslop_chapter')
  })

  test('createJob maps 503 KERNEL_RUNTIME_UNAVAILABLE', async () => {
    const api = createKernelJobApi(fakeRequest(() => ({
      status: 503,
      data: { code: 'KERNEL_RUNTIME_UNAVAILABLE', error: 'no codex' },
    })))
    const result = await api.createJob({ projectId: 3, chapterId: 11, modelId: 7, action: 'apply' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('KERNEL_RUNTIME_UNAVAILABLE')
  })

  test('getJob / cancel / commit / artifact / contracts hit the spec paths', async () => {
    const seen: string[] = []
    const api = createKernelJobApi(fakeRequest((method, path, body) => {
      seen.push(`${method} ${path}`)
      if (path === '/kernel/jobs/job-9') return { status: 200, data: { ok: true, job: { id: 'job-9', status: 'running' }, candidates: [], artifacts: [], progress: { elapsed_ms: 12000, phase: 'running', hint: 'story-architect', job_id: 'job-9', candidate_id: 'cand-1', error_code: '' } } }
      if (path.endsWith('/cancel')) return { status: 200, data: { ok: true } }
      if (path.endsWith('/commit')) {
        expect(body).toEqual({ candidate_id: 'cand-1' })
        return { status: 200, data: { ok: true, commits: [] } }
      }
      if (path.startsWith('/kernel/artifacts/')) return { status: 200, data: { ok: true, content: 'hi', truncated: false, artifact: { id: 'art-1', rel_path: '审稿/第001章.md', artifact_kind: 'review_report' } } }
      if (path === '/kernel/contracts') return { status: 200, data: { ok: true, contracts: [{ id: 'oh-story-core.story-review.full', label: '完整审稿', verb: 'review_chapter', implemented: true }] } }
      return { status: 404, data: { code: 'JOB_NOT_FOUND' } }
    }))
    await api.getJob('job-9')
    await api.cancelJob('job-9')
    await api.commitJob('job-9', 'cand-1')
    await api.getArtifactContent('art-1')
    await api.listContracts()
    expect(seen).toEqual([
      'GET /kernel/jobs/job-9',
      'POST /kernel/jobs/job-9/cancel',
      'POST /kernel/jobs/job-9/commit',
      'GET /kernel/artifacts/art-1/content',
      'GET /kernel/contracts',
    ])
  })

  test('createJobByVerb posts write_chapter verb and user_brief when length_target is set', async () => {
    const seen: any[] = []
    const api = createKernelJobApi(fakeRequest((method, path, body) => {
      seen.push({ method, path, body })
      return { status: 202, data: { ok: true, job: { id: 'job-w', status: 'queued' } } }
    }))
    const result = await api.createJobByVerb({
      projectId: 3,
      chapterId: 11,
      modelId: 7,
      verb: 'write_chapter',
      userBrief: { title: 't', genre: 'g', idea: 'i', length_target: '自定义 1800 字', constraints: 'c' },
    })
    expect(result).toEqual({ ok: true, jobId: 'job-w' })
    expect(seen[0]).toEqual({
      method: 'POST',
      path: '/kernel/jobs',
      body: {
        project_id: 3,
        subject_type: 'chapter',
        subject_id: 11,
        verb: 'write_chapter',
        model_id: 7,
        user_brief: { title: 't', genre: 'g', idea: 'i', length_target: '自定义 1800 字', constraints: 'c' },
      },
    })
  })

  test('createJobByVerb omits user_brief without length_target', async () => {
    const seen: any[] = []
    const api = createKernelJobApi(fakeRequest((_m, _p, body) => {
      seen.push(body)
      return { status: 202, data: { ok: true, job: { id: 'job-w2', status: 'queued' } } }
    }))
    await api.createJobByVerb({
      projectId: 3,
      chapterId: 11,
      modelId: 7,
      verb: 'write_chapter',
      userBrief: { title: 't', idea: 'i' },
    })
    expect(seen[0].verb).toBe('write_chapter')
    expect(seen[0].subject_type).toBe('chapter')
    expect(seen[0].user_brief).toBeUndefined()
  })

  test('createJobByVerb posts write_continue as a project subject with verb_params', async () => {
    const seen: any[] = []
    const api = createKernelJobApi(fakeRequest((method, path, body) => {
      seen.push({ method, path, body })
      return { status: 202, data: { ok: true, job: { id: 'job-c', status: 'queued' } } }
    }))
    const result = await api.createJobByVerb({
      projectId: 3,
      chapterId: 0,
      modelId: 7,
      verb: 'write_continue',
      subjectType: 'project',
      subjectId: 3,
      verbParams: { from_chapter_no: 2, count: 2 },
    })
    expect(result).toEqual({ ok: true, jobId: 'job-c' })
    expect(seen[0].method).toBe('POST')
    expect(seen[0].path).toBe('/kernel/jobs')
    expect(seen[0].body.subject_type).toBe('project')
    expect(seen[0].body.subject_id).toBe(3)
    expect(seen[0].body.verb).toBe('write_continue')
    expect(seen[0].body.verb_params.count).toBe(2)
    expect(seen[0].body.verb_params.from_chapter_no).toBe(2)
  })

  test('createJobByVerb posts adapt_pack as a pack subject with skill_id', async () => {
    const seen: any[] = []
    const api = createKernelJobApi(fakeRequest((method, path, body) => {
      seen.push({ method, path, body })
      return { status: 202, data: { ok: true, job: { id: 'job-p', status: 'queued' } } }
    }))
    const result = await api.createJobByVerb({
      projectId: 3,
      chapterId: 0,
      modelId: 7,
      verb: 'adapt_pack',
      subjectType: 'pack',
      subjectKey: 'my-style',
      verbParams: { skill_id: 'user.my-style' },
    })
    expect(result).toEqual({ ok: true, jobId: 'job-p' })
    expect(seen[0].method).toBe('POST')
    expect(seen[0].path).toBe('/kernel/jobs')
    expect(seen[0].body.subject_type).toBe('pack')
    expect(seen[0].body.subject_id).toBe(0)
    expect(seen[0].body.subject_key).toBe('my-style')
    expect(seen[0].body.verb).toBe('adapt_pack')
    expect(seen[0].body.verb_params.skill_id).toBe('user.my-style')
  })

  test('listJobs GETs jobs filtered by verb and subject_key', async () => {
    const seen: string[] = []
    const api = createKernelJobApi(fakeRequest((method, path) => {
      seen.push(`${method} ${path}`)
      return { status: 200, data: { ok: true, jobs: [{ id: 'job-p', verb: 'adapt_pack' }] } }
    }))
    const result = await api.listJobs({ verb: 'adapt_pack', subjectKey: 'my-style' })
    expect(result).toEqual({ ok: true, jobs: [{ id: 'job-p', verb: 'adapt_pack' }] })
    expect(seen[0]).toBe('GET /kernel/jobs?verb=adapt_pack&subject_key=my-style')
  })

  test('getVerbDefaults GETs /kernel/verb-defaults', async () => {
    const seen: string[] = []
    const api = createKernelJobApi(fakeRequest((method, path) => {
      seen.push(`${method} ${path}`)
      return { status: 200, data: { ok: true, defaults: { write_chapter: ['user.my-style'] } } }
    }))
    const result = await api.getVerbDefaults()
    expect(result).toEqual({ ok: true, defaults: { write_chapter: ['user.my-style'] } })
    expect(seen[0]).toBe('GET /kernel/verb-defaults')
  })

  test('putVerbDefaults PUTs defaults to /kernel/verb-defaults', async () => {
    const seen: any[] = []
    const api = createKernelJobApi(fakeRequest((method, path, body) => {
      seen.push({ method, path, body })
      return { status: 200, data: { ok: true, defaults: { write_chapter: ['user.my-style'] } } }
    }))
    const result = await api.putVerbDefaults({ write_chapter: ['user.my-style'] })
    expect(result).toEqual({ ok: true, defaults: { write_chapter: ['user.my-style'] } })
    expect(seen[0].method).toBe('PUT')
    expect(seen[0].path).toBe('/kernel/verb-defaults')
    expect(seen[0].body).toEqual({ defaults: { write_chapter: ['user.my-style'] } })
  })
})
