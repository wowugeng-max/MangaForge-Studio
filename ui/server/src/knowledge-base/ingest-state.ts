import type { KnowledgeIngestJob } from './types'
import { nowIso } from './pure-helpers'

export const ingestJobs = new Map<string, KnowledgeIngestJob>()
export const ingestJobChapters = new Map<string, any[]>()
export const ingestJobControllers = new Map<string, AbortController>()

let runKnowledgeIngestJobImpl: ((jobId: string) => Promise<void>) | null = null

export function bindRunKnowledgeIngestJob(fn: (jobId: string) => Promise<void>) {
  runKnowledgeIngestJobImpl = fn
}

export function makeChapterSeenKey(item: any, fallback: number | string) {
  return String(item?.url || item?.chapter || fallback)
}

export function scheduleKnowledgeIngestJob(jobId: string) {
  const start = () => {
    if (ingestJobControllers.has(jobId)) {
      setTimeout(start, 200)
      return
    }
    const job = ingestJobs.get(jobId)
    if (!job || job.status === 'completed' || job.status === 'running') return
    void runKnowledgeIngestJobImpl?.(jobId)
  }
  setTimeout(start, 0)
}

export function updateIngestJob(id: string, patch: Partial<KnowledgeIngestJob>) {
  const existing = ingestJobs.get(id)
  if (!existing) return
  ingestJobs.set(id, {
    ...existing,
    ...patch,
    updated_at: nowIso(),
  })
}
