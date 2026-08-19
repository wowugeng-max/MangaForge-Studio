// ui/server/src/kernel/jobs/run-job.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelOutline, createNovelProject, listNovelReviewsByType } from '../../novel'
import { getKernelJobDetail, insertKernelJob } from './repo'
import { cancelKernelJob, candidateStatusAfterGate, createAndRunKernelJob, getKernelJobProgress, validateCreateKernelJob } from './run-job'

function seedStores(ws: string) {
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} }]))
  writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'any', display_name: 'm', model_name: 'gpt-5.2' }]))
  writeFileSync(join(ws, 'keys.json'), JSON.stringify([{ id: 5, provider: 'any', key: 'sk', is_active: true }]))
}

async function seed() {
  const ws = mkdtempSync(join(tmpdir(), 'run-job-'))
  const project = await createNovelProject(ws, { title: '书' })
  const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: '正文。' })
  seedStores(ws)
  return { ws, project, chapter }
}

function stubRunner(reportText: string) {
  return async (input: any) => {
    const dir = mkdtempSync(join(tmpdir(), 'stub-art-'))
    mkdirSync(join(dir, '审稿'), { recursive: true })
    writeFileSync(join(dir, '审稿/第002章.md'), reportText)
    input.onPhase?.('projecting'); input.onPhase?.('starting'); input.onPhase?.('running'); input.onPhase?.('harvesting')
    return {
      ok: true, jobDir: dir, projectDir: dir, threadId: 't-1', turnId: 'turn-1',
      artifacts: [{ rel_path: '审稿/第002章.md', artifact_kind: 'review_report', sha256: 'h', byte_size: 8, copied_path: join(dir, '审稿/第002章.md') }],
      warnings: [], lastMessage: '完成', spawnEvidence: { subagent_threads: [{ thread_id: 's', parent_thread_id: 't-1', agent: 'story-architect' }], agent_hints: ['story-architect'] },
      eventsPath: join(dir, 'events.jsonl'),
    }
  }
}

const body = (project: any, chapter: any) => ({
  project_id: project.id, subject_type: 'chapter', subject_id: chapter.id,
  contract_ids: ['oh-story-core.story-review.full'], model_id: 9,
})

describe('kernel job orchestration', () => {
  test('validation: unknown contract, mixed capability, bad provider', async () => {
    const { ws, project, chapter } = await seed()
    const unknown = await validateCreateKernelJob(ws, { ...body(project, chapter), contract_ids: ['a.b.c'] }, { skipRuntimeCheck: true })
    expect(unknown).toMatchObject({ ok: false, status: 400, code: 'CONTRACT_INVALID' })
    const mixed = await validateCreateKernelJob(ws, { ...body(project, chapter), contract_ids: ['oh-story-core.story-review.full', 'oh-story-core.story-deslop.file'] }, { skipRuntimeCheck: true })
    expect(mixed).toMatchObject({ ok: false, code: 'VERB_MIXED' })
    const notImplemented = await validateCreateKernelJob(ws, { ...body(project, chapter), contract_ids: ['oh-story-core.story-long-write.outline'] }, { skipRuntimeCheck: true })
    expect(notImplemented).toMatchObject({ ok: false, code: 'CONTRACT_NOT_IMPLEMENTED' })
    writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'gemini', model_name: 'g' }]))
    writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'gemini', api_format: 'openai_compatible', default_base_url: 'https://g/v1' }]))
    const provider = await validateCreateKernelJob(ws, body(project, chapter), { skipRuntimeCheck: true })
    expect(provider).toMatchObject({ ok: false, code: 'PROVIDER_TRANSLATE_FAILED' })
  })

  test('auto_if_single: single succeeded candidate commits automatically', async () => {
    const { ws, project, chapter } = await seed()
    const created = await createAndRunKernelJob(ws, body(project, chapter), {
      candidateRunner: stubRunner('Fallback: none\n报告正文') as any, skipRuntimeCheck: true,
    })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('committed')
    expect(detail.candidates[0].status).toBe('committed')
    expect(JSON.parse(detail.candidates[0].metadata).spawn_evidence.subagent_threads.length).toBe(1)
    expect((await listNovelReviewsByType(ws, project.id, 'oh_story_review')).length).toBe(1)
  })

  test('solo report gates the candidate and fails the job', async () => {
    const { ws, project, chapter } = await seed()
    const created = await createAndRunKernelJob(ws, body(project, chapter), {
      candidateRunner: stubRunner('Fallback: solo\n报告') as any, skipRuntimeCheck: true,
    })
    if (!created.ok) throw new Error('create failed')
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.candidates[0].status).toBe('gated')
    expect(detail.candidates[0].error_code).toBe('SOLO_FALLBACK')
    expect(detail.job.status).toBe('failed')
    expect((await listNovelReviewsByType(ws, project.id, 'oh_story_review')).length).toBe(0)
  })

  test('runner failure marks candidate and job failed with error code', async () => {
    const { ws, project, chapter } = await seed()
    const created = await createAndRunKernelJob(ws, body(project, chapter), {
      candidateRunner: (async () => ({ ok: false, error_code: 'SKILL_NOT_FOUND', message: 'x' })) as any, skipRuntimeCheck: true,
    })
    if (!created.ok) throw new Error('create failed')
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.candidates[0].status).toBe('failed')
    expect(detail.job.status).toBe('failed')
    expect(detail.job.error_code).toBe('SKILL_NOT_FOUND')
  })

  test('progress reports phase and elapsed; cancel before terminal state', async () => {
    const { ws, project, chapter } = await seed()
    let release!: () => void
    const gatePromise = new Promise<void>(resolve => { release = resolve })
    const created = await createAndRunKernelJob(ws, body(project, chapter), {
      candidateRunner: (async (input: any) => {
        input.onPhase?.('running')
        await gatePromise
        return { ok: false, error_code: 'CANCELLED', message: 'cancelled' }
      }) as any,
      skipRuntimeCheck: true,
    })
    if (!created.ok) throw new Error('create failed')
    await new Promise(resolve => setTimeout(resolve, 20))
    const progress = getKernelJobProgress(ws, created.jobId)!
    expect(progress.phase).toBe('running')
    expect(progress.elapsed_ms).toBeGreaterThanOrEqual(0)
    const cancelled = cancelKernelJob(ws, created.jobId)
    expect(cancelled).toEqual({ ok: true })
    const mid = getKernelJobDetail(ws, created.jobId)!
    expect(mid.job.status).toBe('cancelled')
    expect(mid.candidates[0].status).toBe('failed')
    expect(mid.candidates[0].error_code).toBe('CANCELLED')
    release()
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('cancelled')
    expect(cancelKernelJob(ws, 'nope')).toMatchObject({ ok: false, status: 404 })
  })

  test('cancel before onSession still closes the session and leaves job cancelled', async () => {
    const { ws, project, chapter } = await seed()
    let allowSession!: () => void
    const beforeSession = new Promise<void>(resolve => { allowSession = resolve })
    let allowFinish!: () => void
    const afterSession = new Promise<void>(resolve => { allowFinish = resolve })
    let closed = 0
    const close = () => { closed += 1 }
    const created = await createAndRunKernelJob(ws, body(project, chapter), {
      candidateRunner: (async (input: any) => {
        input.onPhase?.('running')
        await beforeSession
        input.onSession?.({ close })
        await afterSession
        return { ok: false, error_code: 'CANCELLED', message: 'cancelled' }
      }) as any,
      skipRuntimeCheck: true,
    })
    if (!created.ok) throw new Error('create failed')
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(cancelKernelJob(ws, created.jobId)).toEqual({ ok: true })
    allowSession()
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(closed).toBeGreaterThanOrEqual(1)
    allowFinish()
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('cancelled')
  })
})

describe('verb-based job creation', () => {
  test('verb only resolves default instances', async () => {
    const { ws, project, chapter } = await seed()
    const result = await validateCreateKernelJob(ws, {
      project_id: project.id, subject_type: 'chapter', subject_id: chapter.id, verb: 'review_chapter', model_id: 9,
    }, { skipRuntimeCheck: true })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.contracts.map(c => c.id)).toEqual(['oh-story-core.story-review.full'])
  })
  test('unknown verb / missing default / mixed verbs / subject mismatch', async () => {
    const { ws, project, chapter } = await seed()
    const base = { project_id: project.id, subject_type: 'chapter', subject_id: chapter.id, model_id: 9 }
    expect(((await validateCreateKernelJob(ws, { ...base, verb: 'nope' }, { skipRuntimeCheck: true })) as any).code).toBe('VERB_UNKNOWN')
    expect(((await validateCreateKernelJob(ws, { ...base, verb: 'write_continue' }, { skipRuntimeCheck: true })) as any).code).toBe('VERB_DEFAULT_MISSING')
    expect(((await validateCreateKernelJob(ws, {
      ...base, verb: 'review_chapter',
      contract_ids: ['oh-story-core.story-review.full', 'oh-story-core.story-deslop.file'],
    }, { skipRuntimeCheck: true })) as any).code).toBe('VERB_MIXED')
    expect(((await validateCreateKernelJob(ws, {
      ...base, subject_type: 'project', subject_id: project.id, verb: 'review_chapter',
    }, { skipRuntimeCheck: true })) as any).code).toBe('SUBJECT_TYPE_MISMATCH')
  })
  test('open_book requires brief and project_id==subject_id; dedupes per verb', async () => {
    const { ws, project } = await seed()
    const body: any = { project_id: project.id, subject_type: 'project', subject_id: project.id, verb: 'open_book', model_id: 9 }
    expect(((await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })) as any).code).toBe('BRIEF_REQUIRED')
    body.user_brief = { idea: '一句话创意' }
    const ok = await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })
    expect(ok.ok).toBe(true)
    insertKernelJob(ws, { id: 'job-run', project_id: project.id, workspace_scope: 'novel', title: '', status: 'running',
      capability: 'outline', subject_type: 'project', subject_id: project.id, model_provider_id: '', model_id: null,
      error_code: '', error_message: '', verb: 'open_book', verb_params: '{}', subject_key: '', brief_json: '' })
    expect(((await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })) as any).code).toBe('PROJECT_JOB_RUNNING')
  })
  test('legacy body without verb still works via inference', async () => {
    const { ws, project, chapter } = await seed()
    const result = await validateCreateKernelJob(ws, {
      project_id: project.id, subject_type: 'chapter', subject_id: chapter.id, model_id: 9,
      contract_ids: ['oh-story-core.story-review.full'],
    }, { skipRuntimeCheck: true })
    expect(result.ok).toBe(true)
  })

  test('expand_outline requires an existing outline and project subject', async () => {
    const { ws, project } = await seed()
    const body = {
      project_id: project.id, subject_type: 'project' as const, subject_id: project.id,
      verb: 'expand_outline', model_id: 9,
    }
    expect(((await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })) as any).code).toBe('FOUNDATION_PRECONDITION')
    await createNovelOutline(ws, { project_id: project.id, outline_type: 'master', title: '总纲', summary: '已有总纲' })
    const ok = await validateCreateKernelJob(ws, body, { skipRuntimeCheck: true })
    expect(ok.ok).toBe(true)
    if (ok.ok) expect(ok.contracts.map(c => c.id)).toEqual(['oh-story-core.story-long-write.expand'])
    expect(((await validateCreateKernelJob(ws, {
      ...body, subject_type: 'chapter', subject_id: 1,
    }, { skipRuntimeCheck: true })) as any).code).toBe('SUBJECT_TYPE_MISMATCH')
  })

  test('write_chapter requires empty chapter with matching outline', async () => {
    const { ws, project } = await seed()
    const empty = await createNovelChapter(ws, { project_id: project.id, chapter_no: 1, title: '一', chapter_text: '' })
    const base = {
      project_id: project.id, subject_type: 'chapter' as const, subject_id: empty.id, verb: 'write_chapter', model_id: 9,
    }
    expect(((await validateCreateKernelJob(ws, { ...base, subject_id: 999999 }, { skipRuntimeCheck: true })) as any).code)
      .toBe('CHAPTER_NOT_FOUND')
    expect(((await validateCreateKernelJob(ws, base, { skipRuntimeCheck: true })) as any).code).toBe('OUTLINE_MISSING')
    await createNovelOutline(ws, {
      project_id: project.id, outline_type: 'master', title: '第1章 总纲误导', summary: '不是细纲',
    })
    expect(((await validateCreateKernelJob(ws, base, { skipRuntimeCheck: true })) as any).code).toBe('OUTLINE_MISSING')
    const outline = await createNovelOutline(ws, {
      project_id: project.id, outline_type: 'chapter', title: '细纲1', summary: '细',
      raw_payload: { chapter_no: 1, kernel_rel_path: '大纲/细纲_第001章.md' },
    })
    const ok = await validateCreateKernelJob(ws, { ...base, user_brief: { length_target: '自定义 1800 字' } }, { skipRuntimeCheck: true })
    expect(ok.ok).toBe(true)
    if (ok.ok) {
      expect(ok.contracts.map(c => c.id)).toEqual(['oh-story-core.story-long-write.chapter'])
      expect(ok.briefJson).toContain('自定义 1800 字')
    }
    const filled = await createNovelChapter(ws, { project_id: project.id, chapter_no: 3, title: '三', chapter_text: '已有正文' })
    expect(((await validateCreateKernelJob(ws, { ...base, subject_id: filled.id }, { skipRuntimeCheck: true })) as any).code)
      .toBe('CHAPTER_HAS_PROSE')
    const placeholder = await createNovelChapter(ws, {
      project_id: project.id, chapter_no: 4, title: '四', chapter_text: '【占位正文】', outline_id: outline.id,
    })
    expect((await validateCreateKernelJob(ws, { ...base, subject_id: placeholder.id }, { skipRuntimeCheck: true })).ok).toBe(true)
  })
})

describe('candidateStatusAfterGate', () => {
  test('KIND_COUNT_BELOW_MIN maps to failed, not gated', () => {
    expect(candidateStatusAfterGate('KIND_COUNT_BELOW_MIN', 'failed')).toBe('failed')
  })
  test('SOLO_FALLBACK stays gated', () => {
    expect(candidateStatusAfterGate('SOLO_FALLBACK', 'gated')).toBe('gated')
  })
  test('empty failedCode is succeeded', () => {
    expect(candidateStatusAfterGate('', null)).toBe('succeeded')
    expect(candidateStatusAfterGate('', undefined)).toBe('succeeded')
  })
})
