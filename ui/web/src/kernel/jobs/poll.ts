import type { KernelJobDetail } from './types'

export const KERNEL_JOB_POLL_MS = 1000
export const KERNEL_JOB_TERMINAL = ['committed', 'failed', 'cancelled', 'awaiting_selection'] as const

export function isKernelJobTerminal(status: string): boolean {
  return (KERNEL_JOB_TERMINAL as readonly string[]).includes(status)
}

function abortError(): Error {
  const error = new Error('Aborted')
  error.name = 'AbortError'
  return error
}

export async function pollKernelJob(input: {
  getJob: (jobId: string) => Promise<KernelJobDetail | { ok: false; status?: number; code?: string; message?: string }>
  jobId: string
  intervalMs?: number
  signal?: AbortSignal
  delay?: (ms: number) => Promise<void>
  onProgress?: (detail: KernelJobDetail) => void
}): Promise<KernelJobDetail> {
  const intervalMs = input.intervalMs ?? KERNEL_JOB_POLL_MS
  const delay = input.delay || ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)))
  while (true) {
    if (input.signal?.aborted) throw abortError()
    const result = await input.getJob(input.jobId)
    if (input.signal?.aborted) throw abortError()
    if (result && 'ok' in result && result.ok && result.job && isKernelJobTerminal(result.job.status)) {
      return result
    }
    if (result && 'ok' in result && result.ok && result.job) input.onProgress?.(result)
    await delay(intervalMs)
    if (input.signal?.aborted) throw abortError()
  }
}
