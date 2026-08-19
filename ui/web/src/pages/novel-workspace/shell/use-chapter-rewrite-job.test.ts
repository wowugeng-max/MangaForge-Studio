import { describe, expect, mock, test } from 'bun:test'
import type { KernelJobDetail } from '../../../kernel/jobs/types'
import {
  cancelRewriteChapterJob,
  pickRewriteChapterPreview,
  reduceChapterRewriteProgress,
  runRewriteChapterJob,
} from './use-chapter-rewrite-job'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function jobDetail(status: string, id = 'job-1', extra: Partial<KernelJobDetail> = {}): KernelJobDetail {
  return {
    ok: true,
    job: { id, status },
    candidates: extra.candidates || [],
    artifacts: extra.artifacts || [],
    progress: {
      job_id: id,
      candidate_id: 'c',
      phase: status,
      elapsed_ms: 1000,
      hint: '',
      error_code: '',
    },
    ...extra,
  }
}

describe('reduceChapterRewriteProgress', () => {
  test('keeps running elapsed from progress.elapsed_ms', () => {
    const next = reduceChapterRewriteProgress(
      { phase: 'running', jobId: 'job-1', hint: '', elapsedSec: 0 },
      {
        ok: true,
        job: { id: 'job-1', status: 'running' },
        candidates: [],
        artifacts: [],
        progress: {
          job_id: 'job-1',
          candidate_id: 'c',
          phase: 'running',
          elapsed_ms: 12000,
          hint: 'story-architect',
          error_code: '',
        },
      },
    )
    expect(next).toEqual({
      phase: 'running', jobId: 'job-1', hint: 'story-architect', elapsedSec: 12,
    })
  })

  test('maps failed status to failed phase', () => {
    const next = reduceChapterRewriteProgress(
      { phase: 'running', jobId: 'job-1', hint: '', elapsedSec: 8 },
      {
        ok: true,
        job: { id: 'job-1', status: 'failed', error_code: 'CHAPTER_NO_PROSE' },
        candidates: [],
        artifacts: [],
        progress: {
          job_id: 'job-1',
          candidate_id: 'c',
          phase: 'failed',
          elapsed_ms: 8000,
          hint: '',
          error_code: 'CHAPTER_NO_PROSE',
        },
      },
    )
    expect(next).toEqual({
      phase: 'failed', jobId: 'job-1', errorCode: 'CHAPTER_NO_PROSE',
    })
  })

  test('does not map awaiting_selection to failed', () => {
    const next = reduceChapterRewriteProgress(
      { phase: 'running', jobId: 'job-1', hint: '', elapsedSec: 8 },
      {
        ok: true,
        job: { id: 'job-1', status: 'awaiting_selection' },
        candidates: [{ id: 'cand-1', contract_id: 'a', status: 'succeeded' }],
        artifacts: [],
        progress: {
          job_id: 'job-1',
          candidate_id: 'cand-1',
          phase: 'awaiting_selection',
          elapsed_ms: 8000,
          hint: '',
          error_code: '',
        },
      },
    )
    expect(next.phase).not.toBe('failed')
  })
})

describe('pickRewriteChapterPreview', () => {
  test('returns succeeded candidate and chapter_text artifact ids', () => {
    expect(pickRewriteChapterPreview({
      ok: true,
      job: { id: 'job-1', status: 'awaiting_selection' },
      candidates: [{ id: 'cand-1', contract_id: 'a', status: 'succeeded' }],
      artifacts: [{
        id: 'art-1',
        candidate_id: 'cand-1',
        rel_path: '正文/第01章.md',
        artifact_kind: 'chapter_text',
      }],
    })).toEqual({ candidateId: 'cand-1', artifactId: 'art-1' })
  })

  test('returns null when succeeded candidate has no chapter_text artifact', () => {
    expect(pickRewriteChapterPreview({
      ok: true,
      job: { id: 'job-1', status: 'awaiting_selection' },
      candidates: [{ id: 'cand-1', contract_id: 'a', status: 'succeeded' }],
      artifacts: [{
        id: 'art-2',
        candidate_id: 'cand-1',
        rel_path: '追踪/note.md',
        artifact_kind: 'tracking_doc',
      }],
    })).toBeNull()
  })
})

describe('runRewriteChapterJob', () => {
  test('stop during createJobByVerb cancels the job id that returns', async () => {
    const createStarted = deferred<void>()
    const createResult = deferred<{ ok: true; jobId: string }>()
    const cancelJob = mock(async () => ({ ok: true as const }))
    const getJob = mock(async () => {
      throw new Error('should not poll')
    })
    const commitJob = mock(async () => ({ ok: true as const, commits: [] }))
    const getArtifactContent = mock(async () => {
      throw new Error('should not load artifact')
    })
    const loadProjectModules = mock(async () => {})
    const jobIdRef = { current: '' }
    const controller = new AbortController()

    const runPromise = runRewriteChapterJob({
      api: {
        createJobByVerb: async () => {
          createStarted.resolve()
          return createResult.promise
        },
        getJob,
        cancelJob,
        commitJob,
        getArtifactContent,
      },
      projectId: 7,
      chapterId: 11,
      modelId: 3,
      flushPendingSave: async () => true,
      loadProjectModules,
      signal: controller.signal,
      jobIdRef,
    })

    await createStarted.promise
    await cancelRewriteChapterJob({
      abort: () => controller.abort(),
      cancelJob,
      jobIdRef,
      stateJobId: '',
    })
    createResult.resolve({ ok: true, jobId: 'job-late' })

    expect(await runPromise).toEqual({ kind: 'aborted' })
    expect(cancelJob).toHaveBeenCalledWith('job-late')
    expect(getJob).not.toHaveBeenCalled()
    expect(loadProjectModules).not.toHaveBeenCalled()
  })

  test('poll awaiting_selection loads preview and does not commit', async () => {
    const createInputs: Array<{ verb: string }> = []
    const getArtifactContent = mock(async () => ({
      ok: true as const,
      content: '回炉预览',
      truncated: false,
      artifact: { id: 'art-1', rel_path: '正文/第01章.md', artifact_kind: 'chapter_text' },
    }))
    const commitJob = mock(async () => ({ ok: true as const, commits: [] }))
    const loadProjectModules = mock(async () => {})
    const jobIdRef = { current: '' }

    const result = await runRewriteChapterJob({
      api: {
        createJobByVerb: async (input) => {
          createInputs.push(input)
          return { ok: true as const, jobId: 'job-1' }
        },
        getJob: async () => jobDetail('awaiting_selection', 'job-1', {
          candidates: [{ id: 'cand-1', contract_id: 'a', status: 'succeeded' }],
          artifacts: [{
            id: 'art-1',
            candidate_id: 'cand-1',
            rel_path: '正文/第01章.md',
            artifact_kind: 'chapter_text',
          }],
        }),
        cancelJob: async () => ({ ok: true as const }),
        commitJob,
        getArtifactContent,
      },
      projectId: 7,
      chapterId: 11,
      modelId: 3,
      flushPendingSave: async () => true,
      loadProjectModules,
      signal: new AbortController().signal,
      jobIdRef,
    })

    expect(createInputs[0]?.verb).toBe('rewrite_chapter')
    expect(getArtifactContent).toHaveBeenCalledWith('art-1')
    expect(result).toEqual({
      kind: 'awaiting_selection',
      jobId: 'job-1',
      candidateId: 'cand-1',
      preview: '回炉预览',
      truncated: false,
    })
    expect(commitJob).toHaveBeenCalledTimes(0)
    expect(loadProjectModules).toHaveBeenCalledTimes(0)
  })

  test('createJobByVerb uses rewrite_chapter verb', async () => {
    const verbs: string[] = []
    await runRewriteChapterJob({
      api: {
        createJobByVerb: async (input) => {
          verbs.push(input.verb)
          return { ok: false as const, status: 400, code: 'CHAPTER_NO_PROSE', message: '' }
        },
        getJob: async () => jobDetail('running'),
        cancelJob: async () => ({ ok: true as const }),
        commitJob: async () => ({ ok: true as const, commits: [] }),
        getArtifactContent: async () => ({
          ok: true as const,
          content: '',
          truncated: false,
          artifact: { id: '', rel_path: '', artifact_kind: '' },
        }),
      },
      projectId: 7,
      chapterId: 11,
      modelId: 3,
      flushPendingSave: async () => true,
      loadProjectModules: async () => {},
      signal: new AbortController().signal,
      jobIdRef: { current: '' },
    })
    expect(verbs).toEqual(['rewrite_chapter'])
  })
})
