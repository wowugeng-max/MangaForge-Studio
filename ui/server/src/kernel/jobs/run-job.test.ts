// ui/server/src/kernel/jobs/run-job.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelProject, listNovelReviewsByType } from '../../novel'
import { getKernelJobDetail } from './repo'
import { cancelKernelJob, createAndRunKernelJob, getKernelJobProgress, validateCreateKernelJob } from './run-job'

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
    expect(mixed).toMatchObject({ ok: false, code: 'CAPABILITY_MIXED' })
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
    release()
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('cancelled')
    expect(cancelKernelJob(ws, 'nope')).toMatchObject({ ok: false, status: 404 })
  })
})
