import { describe, expect, mock, test } from 'bun:test'
import { kernelJobUserMessage } from '../../../kernel/jobs/messages'
import type { KernelJobDetail } from '../../../kernel/jobs/types'
import {
  adaptPackCommitSuccessText,
  adaptPackCreateFailureText,
  commitAdaptPackJob,
  reduceAdaptPackProgress,
  resumeAdaptPackJob,
  runAdaptPackJob,
} from './use-adapt-pack-job'

function jobDetail(status: string, extra: Partial<KernelJobDetail> = {}): KernelJobDetail {
  return {
    ok: true,
    job: { id: extra.job?.id || 'job-1', status, error_code: extra.job?.error_code },
    candidates: extra.candidates || [],
    artifacts: extra.artifacts || [],
    progress: extra.progress || {
      job_id: extra.job?.id || 'job-1',
      candidate_id: 'c1',
      phase: status,
      elapsed_ms: 4000,
      hint: 'harvest',
      error_code: extra.job?.error_code || '',
    },
    ...extra,
  }
}

describe('reduceAdaptPackProgress', () => {
  test('keeps awaiting_selection as a preview phase instead of failed', () => {
    const next = reduceAdaptPackProgress(
      { phase: 'running', jobId: 'job-1', hint: '', elapsedSec: 4 },
      jobDetail('awaiting_selection', {
        candidates: [{ id: 'cand-1', contract_id: 'mangaforge.adapt-pack.meta', status: 'succeeded' }],
        artifacts: [{
          id: 'art-1',
          candidate_id: 'cand-1',
          rel_path: 'contracts/write_chapter.json',
          artifact_kind: 'contract_json',
        }],
      }),
    )
    expect(next.phase).toBe('awaiting_selection')
    expect(next.phase).not.toBe('failed')
    if (next.phase === 'awaiting_selection') {
      expect(next.jobId).toBe('job-1')
      expect(next.candidateId).toBe('cand-1')
    }
  })

  test('keeps ADAPT_NO_VALID_CONTRACT detail on failed', () => {
    const detail = jobDetail('failed', {
      job: { id: 'job-fail', status: 'failed', error_code: 'ADAPT_NO_VALID_CONTRACT' },
      candidates: [{
        id: 'cand-1',
        contract_id: 'mangaforge.adapt-pack.meta',
        status: 'failed',
        metadata: JSON.stringify({
          adapt_unsatisfied: [{ rel_path: 'contracts/write_chapter.json', verb: 'write_chapter', errors: ['CONTRACT_BUILTIN'] }],
        }),
      }],
    })
    const next = reduceAdaptPackProgress({ phase: 'running', jobId: 'job-fail', hint: '', elapsedSec: 2 }, detail)
    expect(next).toMatchObject({
      phase: 'failed',
      jobId: 'job-fail',
      errorCode: 'ADAPT_NO_VALID_CONTRACT',
    })
    if (next.phase === 'failed') expect(next.detail).toEqual(detail)
  })
})

describe('runAdaptPackJob', () => {
  test('createJobByVerb sends matching pack subjectKey and skill_id', async () => {
    const seen: any[] = []
    const result = await runAdaptPackJob({
      api: {
        createJobByVerb: async (input) => {
          seen.push(input)
          return { ok: true as const, jobId: 'job-p' }
        },
        getJob: async () => jobDetail('awaiting_selection', {
          job: { id: 'job-p', status: 'awaiting_selection' },
          candidates: [{ id: 'cand-1', contract_id: 'mangaforge.adapt-pack.meta', status: 'succeeded' }],
        }),
        cancelJob: async () => ({ ok: true as const }),
        commitJob: async () => ({ ok: true as const, commits: [] }),
        listJobs: async () => ({ ok: true as const, jobs: [] }),
      },
      projectId: 3,
      modelId: 7,
      skillId: 'my-style',
      signal: new AbortController().signal,
      jobIdRef: { current: '' },
      pollJob: async ({ getJob, jobId }) => await getJob(jobId) as KernelJobDetail,
    })
    expect(seen[0]).toMatchObject({
      projectId: 3,
      chapterId: 0,
      modelId: 7,
      verb: 'adapt_pack',
      subjectType: 'pack',
      subjectId: 0,
      subjectKey: 'my-style',
      verbParams: { skill_id: 'my-style' },
    })
    expect(seen[0].subjectKey).toBe(seen[0].verbParams.skill_id)
    expect(result.kind).toBe('awaiting_selection')
  })

  test('poll awaiting_selection is not folded to failed', async () => {
    const result = await runAdaptPackJob({
      api: {
        createJobByVerb: async () => ({ ok: true as const, jobId: 'job-1' }),
        getJob: async () => jobDetail('awaiting_selection', {
          candidates: [{ id: 'cand-1', contract_id: 'mangaforge.adapt-pack.meta', status: 'succeeded' }],
        }),
        cancelJob: async () => ({ ok: true as const }),
        commitJob: async () => ({ ok: true as const, commits: [] }),
        listJobs: async () => ({ ok: true as const, jobs: [] }),
      },
      projectId: 3,
      modelId: 7,
      skillId: 'my-style',
      signal: new AbortController().signal,
      jobIdRef: { current: '' },
      pollJob: async ({ getJob, jobId }) => await getJob(jobId) as KernelJobDetail,
    })
    expect(result.kind).toBe('awaiting_selection')
    expect(result.kind).not.toBe('failed')
  })

  test('failed ADAPT_NO_VALID_CONTRACT keeps detail', async () => {
    const detail = jobDetail('failed', {
      job: { id: 'job-1', status: 'failed', error_code: 'ADAPT_NO_VALID_CONTRACT' },
      candidates: [{
        id: 'cand-1',
        contract_id: 'mangaforge.adapt-pack.meta',
        status: 'failed',
        metadata: '{"adapt_unsatisfied":[]}',
      }],
    })
    const result = await runAdaptPackJob({
      api: {
        createJobByVerb: async () => ({ ok: true as const, jobId: 'job-1' }),
        getJob: async () => detail,
        cancelJob: async () => ({ ok: true as const }),
        commitJob: async () => ({ ok: true as const, commits: [] }),
        listJobs: async () => ({ ok: true as const, jobs: [] }),
      },
      projectId: 3,
      modelId: 7,
      skillId: 'my-style',
      signal: new AbortController().signal,
      jobIdRef: { current: '' },
      pollJob: async () => detail,
    })
    expect(result).toMatchObject({
      kind: 'failed',
      jobId: 'job-1',
      errorCode: 'ADAPT_NO_VALID_CONTRACT',
    })
    if (result.kind === 'failed') expect(result.detail).toEqual(detail)
  })
})

describe('commitAdaptPackJob', () => {
  test('calls commitJob and does not call putVerbDefaults', async () => {
    const commitJob = mock(async () => ({
      ok: true as const,
      commits: [
        { domain_table: 'kernel_contracts', domain_row_id: 0 },
        { domain_table: 'kernel_contracts', domain_row_id: 0 },
      ],
    }))
    const putVerbDefaults = mock(async () => ({ ok: true as const, defaults: {} }))
    const result = await commitAdaptPackJob({
      api: { commitJob, putVerbDefaults },
      jobId: 'job-1',
      candidateId: 'cand-1',
    })
    expect(commitJob).toHaveBeenCalledWith('job-1', 'cand-1')
    expect(putVerbDefaults).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true, count: 2 })
    expect(adaptPackCommitSuccessText(2)).toBe('已写入 2 份合同，默认绑定未改')
  })
})

describe('adaptPackCreateFailureText', () => {
  test('settings 409 uses skill copy without changing the global PROJECT_JOB_RUNNING toast', () => {
    expect(adaptPackCreateFailureText('PROJECT_JOB_RUNNING')).toBe('该 skill 适配未结束')
    expect(kernelJobUserMessage('PROJECT_JOB_RUNNING')).toEqual({
      kind: 'warning',
      text: '同项目同动词任务未结束',
    })
    expect(kernelJobUserMessage('VERB_PARAMS_INVALID')).toEqual({
      kind: 'warning',
      text: '续写参数无效',
    })
  })
})

describe('resumeAdaptPackJob', () => {
  test('gets the latest non-terminal adapt_pack job for the skill', async () => {
    const getJob = mock(async () => jobDetail('awaiting_selection', {
      job: { id: 'job-new', status: 'awaiting_selection' },
      candidates: [{ id: 'cand-2', contract_id: 'mangaforge.adapt-pack.meta', status: 'succeeded' }],
    }))
    const listJobs = mock(async () => ({
      ok: true as const,
      jobs: [
        { id: 'job-old', status: 'committed', created_at: '2026-08-24T00:00:00Z' },
        { id: 'job-new', status: 'awaiting_selection', created_at: '2026-08-25T00:00:00Z' },
        { id: 'job-run', status: 'running', created_at: '2026-08-23T00:00:00Z' },
      ],
    }))
    const result = await resumeAdaptPackJob({
      api: {
        createJobByVerb: async () => ({ ok: true as const, jobId: 'nope' }),
        getJob,
        cancelJob: async () => ({ ok: true as const }),
        commitJob: async () => ({ ok: true as const, commits: [] }),
        listJobs,
      },
      skillId: 'my-style',
      signal: new AbortController().signal,
      jobIdRef: { current: '' },
    })
    expect(listJobs).toHaveBeenCalledWith({ verb: 'adapt_pack', subjectKey: 'my-style' })
    expect(getJob).toHaveBeenCalledWith('job-new')
    expect(result.kind).toBe('awaiting_selection')
  })
})
