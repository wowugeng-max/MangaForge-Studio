import { describe, expect, mock, test } from 'bun:test'
import { assertOhStoryApplyReady, startChapterKernelJob } from './start-chapter-kernel-job'

describe('startChapterKernelJob', () => {
  test('flushes save then creates a kernel job without waiting for terminal status', async () => {
    const createJob = mock(async () => ({ ok: true as const, jobId: 'job-9' }))
    const flushPendingSave = mock(async () => true)
    const result = await startChapterKernelJob({
      flushPendingSave,
      createJob,
      input: { projectId: 3, chapterId: 11, modelId: 7, action: 'review' },
    })
    expect(flushPendingSave).toHaveBeenCalledTimes(1)
    expect(createJob).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ ok: true, jobId: 'job-9' })
  })

  test('does not create a job when save fails', async () => {
    const createJob = mock(async () => ({ ok: true as const, jobId: 'job-9' }))
    const result = await startChapterKernelJob({
      flushPendingSave: async () => false,
      createJob,
      input: { projectId: 3, chapterId: 11, modelId: 7, action: 'deslop' },
    })
    expect(result.ok).toBe(false)
    expect(createJob).not.toHaveBeenCalled()
  })
})

describe('assertOhStoryApplyReady', () => {
  test('warns when there is no review', () => {
    const result = assertOhStoryApplyReady({ reviews: [], chapter: { id: 11, chapter_text: '正文' } })
    expect(result.ok).toBe(false)
  })
  test('allows apply when review exists but hash is not hydrated', () => {
    const result = assertOhStoryApplyReady({
      reviews: [{ review_type: 'oh_story_review', payload: { chapter_id: 11 } }],
      chapter: { id: 11, chapter_text: '楚弦咽气的时候。' },
    })
    expect(result.ok).toBe(true)
  })
})
