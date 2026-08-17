// ui/server/src/kernel/jobs/run-job.compete.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelProject } from '../../novel'
import { saveUserKernelContract } from '../contracts/store'
import { BUILTIN_KERNEL_CONTRACTS } from '../contracts/builtin'
import { getKernelJobDetail } from './repo'
import { cancelKernelJob, createAndRunKernelJob } from './run-job'

function seedStores(ws: string) {
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} }]))
  writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'any', model_name: 'gpt-5.2', display_name: 'm' }]))
  writeFileSync(join(ws, 'keys.json'), JSON.stringify([{ id: 5, provider: 'any', key: 'sk', is_active: true }]))
}

// 与内置 review.full 同 capability 的用户合同（“假审稿”，spec 验收 6 的载体）
function fakeReviewContract() {
  const base = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-review.full')!
  return { ...base, id: 'oh-story-core.story-review.fast', variant: 'fast', verb: 'review_chapter', label: '假审稿（并跑对照）' }
}

function stubRunner(reportByContract: Record<string, string>) {
  const started: string[] = []
  const runner = async (input: any) => {
    started.push(input.contract.id)
    await new Promise(resolve => setTimeout(resolve, 30))
    const dir = mkdtempSync(join(tmpdir(), 'compete-art-'))
    mkdirSync(join(dir, '审稿'), { recursive: true })
    const text = reportByContract[input.contract.id] ?? 'Fallback: none\n默认报告'
    writeFileSync(join(dir, '审稿/第002章.md'), text)
    return {
      ok: true, jobDir: dir, projectDir: dir, threadId: 't', turnId: 'u',
      artifacts: [{ rel_path: '审稿/第002章.md', artifact_kind: 'review_report', sha256: 'h', byte_size: 8, copied_path: join(dir, '审稿/第002章.md') }],
      warnings: [], lastMessage: text, spawnEvidence: { subagent_threads: [], agent_hints: [] }, eventsPath: join(dir, 'e.jsonl'),
    }
  }
  return { runner, started }
}

async function seed() {
  const ws = mkdtempSync(join(tmpdir(), 'compete-'))
  const project = await createNovelProject(ws, { title: '书' })
  const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: '正文。' })
  seedStores(ws)
  const saved = saveUserKernelContract(ws, fakeReviewContract())
  if (!saved.ok) throw new Error('seed contract failed')
  return { ws, project, chapter }
}

describe('compete execution', () => {
  test('two same-capability contracts run in parallel and job awaits selection', async () => {
    const { ws, project, chapter } = await seed()
    const { runner, started } = stubRunner({})
    const created = await createAndRunKernelJob(ws, {
      project_id: project.id, subject_type: 'chapter', subject_id: chapter.id,
      contract_ids: ['oh-story-core.story-review.full', 'oh-story-core.story-review.fast'], model_id: 9,
    }, { candidateRunner: runner as any, skipRuntimeCheck: true })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    await created.done
    expect(started.sort()).toEqual(['oh-story-core.story-review.fast', 'oh-story-core.story-review.full'])
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('awaiting_selection')
    expect(detail.candidates.map(c => c.status)).toEqual(['succeeded', 'succeeded'])
  })

  test('one gated + one succeeded still auto-commits the single succeeded (auto_if_single)', async () => {
    const { ws, project, chapter } = await seed()
    const { runner } = stubRunner({ 'oh-story-core.story-review.fast': 'Fallback: solo\n报告' })
    const created = await createAndRunKernelJob(ws, {
      project_id: project.id, subject_type: 'chapter', subject_id: chapter.id,
      contract_ids: ['oh-story-core.story-review.full', 'oh-story-core.story-review.fast'], model_id: 9,
    }, { candidateRunner: runner as any, skipRuntimeCheck: true })
    if (!created.ok) throw new Error('create failed')
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('committed')
    const statuses = detail.candidates.map(c => c.status).sort()
    expect(statuses).toEqual(['committed', 'gated'])
  })

  test('cancel closes every active session and fails running candidates', async () => {
    const { ws, project, chapter } = await seed()
    const closed: string[] = []
    let releaseAll!: () => void
    const gate = new Promise<void>(resolve => { releaseAll = resolve })
    const runner = async (input: any) => {
      input.onSession?.({ close: () => closed.push(input.contract.id) })
      await gate
      return { ok: false, error_code: 'CANCELLED', message: 'x' }
    }
    const created = await createAndRunKernelJob(ws, {
      project_id: project.id, subject_type: 'chapter', subject_id: chapter.id,
      contract_ids: ['oh-story-core.story-review.full', 'oh-story-core.story-review.fast'], model_id: 9,
    }, { candidateRunner: runner as any, skipRuntimeCheck: true })
    if (!created.ok) throw new Error('create failed')
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(cancelKernelJob(ws, created.jobId)).toEqual({ ok: true })
    releaseAll()
    await created.done
    expect(closed.length).toBe(2)
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('cancelled')
    expect(detail.candidates.every(c => c.status === 'failed' && c.error_code === 'CANCELLED')).toBe(true)
  })

  test('persist throw marks that candidate failed ENGINE_FAILED and does not leave it running', async () => {
    const { ws, project, chapter } = await seed()
    const runner = async (input: any) => {
      const dir = mkdtempSync(join(tmpdir(), 'compete-art-'))
      return {
        ok: true, jobDir: dir, projectDir: dir, threadId: 't', turnId: 'u',
        artifacts: [{ rel_path: '审稿/第002章.md', artifact_kind: 'review_report', sha256: 'h', byte_size: 8, copied_path: join(dir, 'missing.md') }],
        warnings: [], lastMessage: '', spawnEvidence: { subagent_threads: [], agent_hints: [] }, eventsPath: join(dir, 'e.jsonl'),
      }
    }
    const created = await createAndRunKernelJob(ws, {
      project_id: project.id, subject_type: 'chapter', subject_id: chapter.id,
      contract_ids: ['oh-story-core.story-review.full', 'oh-story-core.story-review.fast'], model_id: 9,
    }, { candidateRunner: runner as any, skipRuntimeCheck: true })
    if (!created.ok) throw new Error('create failed')
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.candidates.every(c => c.status === 'failed' && c.error_code === 'ENGINE_FAILED')).toBe(true)
    expect(detail.job.status).toBe('failed')
    expect(detail.job.error_code).toBe('ENGINE_FAILED')
  })
})
