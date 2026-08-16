// ui/server/src/kernel/jobs/selection.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelProject, listNovelReviewsByType } from '../../novel'
import { BUILTIN_KERNEL_CONTRACTS } from '../contracts/builtin'
import { saveUserKernelContract } from '../contracts/store'
import { commitKernelCandidate } from './commit'
import { getKernelJobDetail } from './repo'
import { createAndRunKernelJob } from './run-job'

// seedStores / fakeReviewContract / stubRunner 与 run-job.compete.test.ts 相同，此处内联同一份实现
function seedStores(ws: string) {
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([{ id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} }]))
  writeFileSync(join(ws, 'models.json'), JSON.stringify([{ id: 9, api_key_id: 5, provider: 'any', model_name: 'gpt-5.2', display_name: 'm' }]))
  writeFileSync(join(ws, 'keys.json'), JSON.stringify([{ id: 5, provider: 'any', key: 'sk', is_active: true }]))
}

function fakeReviewContract() {
  const base = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-review.full')!
  return { ...base, id: 'oh-story-core.story-review.fast', variant: 'fast', label: '假审稿' }
}

function stubRunner() {
  return async (input: any) => {
    const dir = mkdtempSync(join(tmpdir(), 'sel-art-'))
    mkdirSync(join(dir, '审稿'), { recursive: true })
    writeFileSync(join(dir, '审稿/第002章.md'), `Fallback: none\n来自 ${input.contract.id} 的报告`)
    return {
      ok: true, jobDir: dir, projectDir: dir, threadId: 't', turnId: 'u',
      artifacts: [{ rel_path: '审稿/第002章.md', artifact_kind: 'review_report', sha256: 'h', byte_size: 8, copied_path: join(dir, '审稿/第002章.md') }],
      warnings: [], lastMessage: '', spawnEvidence: { subagent_threads: [], agent_hints: [] }, eventsPath: join(dir, 'e.jsonl'),
    }
  }
}

describe('selection commit (spec acceptance 5 & 6)', () => {
  test('two succeeded candidates: committing one writes exactly one domain row; second commit 409', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'sel-'))
    const project = await createNovelProject(ws, { title: '书' })
    const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: '正文。' })
    seedStores(ws)
    expect(saveUserKernelContract(ws, fakeReviewContract()).ok).toBe(true)  // 验收 6：只加 JSON，无网关改动
    const created = await createAndRunKernelJob(ws, {
      project_id: project.id, subject_type: 'chapter', subject_id: chapter.id,
      contract_ids: ['oh-story-core.story-review.full', 'oh-story-core.story-review.fast'], model_id: 9,
    }, { candidateRunner: stubRunner() as any, skipRuntimeCheck: true })
    if (!created.ok) throw new Error('create failed')
    await created.done
    const detail = getKernelJobDetail(ws, created.jobId)!
    expect(detail.job.status).toBe('awaiting_selection')
    const fastCandidate = detail.candidates.find(c => c.contract_id === 'oh-story-core.story-review.fast')!
    const committed = await commitKernelCandidate(ws, created.jobId, fastCandidate.id)
    expect(committed.ok).toBe(true)
    const reviews = await listNovelReviewsByType(ws, project.id, 'oh_story_review')
    expect(reviews.length).toBe(1)  // 只有一份进领域表（验收 5）
    expect(JSON.parse(reviews[0].payload).report_text).toContain('story-review.fast')
    const other = detail.candidates.find(c => c.id !== fastCandidate.id)!
    const again = await commitKernelCandidate(ws, created.jobId, other.id)
    expect(again).toMatchObject({ ok: false, status: 409, code: 'JOB_ALREADY_COMMITTED' })
    const after = getKernelJobDetail(ws, created.jobId)!
    expect(after.candidates.find(c => c.id === other.id)!.status).toBe('succeeded')  // 未选候选留档
  })
})
