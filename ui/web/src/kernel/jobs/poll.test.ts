import { describe, expect, test } from 'bun:test'
import { KERNEL_JOB_POLL_MS, pollKernelJob } from './poll'
import type { KernelJobDetail } from './types'

function detail(status: string, extra: Partial<KernelJobDetail> = {}): KernelJobDetail {
  return {
    ok: true,
    job: { id: 'job-1', status },
    candidates: extra.candidates || [],
    artifacts: extra.artifacts || [],
    progress: { job_id: 'job-1', candidate_id: 'c1', phase: status, elapsed_ms: 4000, hint: 'story-architect', error_code: '' },
    ...extra,
  }
}

describe('pollKernelJob', () => {
  test('returns when status becomes awaiting_selection and delays 1s between polls', async () => {
    const statuses = ['running', 'running', 'awaiting_selection']
    const delays: number[] = []
    const progressPhases: string[] = []
    const result = await pollKernelJob({
      jobId: 'job-1',
      getJob: async () => detail(statuses.shift() || 'awaiting_selection'),
      delay: async (ms) => { delays.push(ms) },
      onProgress: (d) => progressPhases.push(d.job.status),
    })
    expect(result.job.status).toBe('awaiting_selection')
    expect(delays).toEqual([KERNEL_JOB_POLL_MS, KERNEL_JOB_POLL_MS])
    expect(progressPhases[0]).toBe('running')
  })

  test('stops on committed without treating it as error', async () => {
    const result = await pollKernelJob({
      jobId: 'job-1',
      getJob: async () => detail('committed'),
      delay: async () => { throw new Error('should not delay') },
    })
    expect(result.job.status).toBe('committed')
  })

  test('aborts between polls', async () => {
    const controller = new AbortController()
    await expect(pollKernelJob({
      jobId: 'job-1',
      signal: controller.signal,
      getJob: async () => detail('running'),
      delay: async () => { controller.abort() },
    })).rejects.toMatchObject({ name: 'AbortError' })
  })
})
