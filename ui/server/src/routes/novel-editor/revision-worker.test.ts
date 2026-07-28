import { afterEach, describe, expect, test } from 'bun:test'
import { rm } from 'fs/promises'
import { createNovelProject, listNovelReviews } from '../../novel'
import { tempWorkspace, workspaces } from '../../novel/test-utils'
import type { EditorRevisionCheckpoint, EditorRevisionPhase } from './editor-revision-contract'
import { revisionTextHash } from './revision-candidate-admission'
import { createEditorRevisionWorker, findOrCreateEditorRevisionReview } from './revision-worker'

const workspace = '/tmp/editor-revision-worker-test'
const sourceText = `${'原正文推进。'.repeat(220)}。`
const candidateText = `${'修订正文推进。'.repeat(190)}。`

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

function initialCheckpoint(): EditorRevisionCheckpoint {
  return {
    schema_version: 1,
    phase: 'generate_candidate',
    phases: {
      generate_candidate: { status: 'pending', attempt: 0 },
      admit_candidate: { status: 'pending', attempt: 0 },
      persist_chapter: { status: 'pending', attempt: 0 },
      post_quality: { status: 'pending', attempt: 0 },
      sync_current_story_state: { status: 'pending', attempt: 0 },
      record_continuity_warning: { status: 'pending', attempt: 0 },
      completed: { status: 'pending', attempt: 0 },
    },
    prose_persisted: false,
    warnings: [],
  }
}

function completeResult(text = candidateText, extra: Record<string, unknown> = {}) {
  const output = { chapter_text: text, ...extra }
  return { finish_reason: 'stop', content: JSON.stringify(output), output }
}

function parsed(value: unknown) {
  if (value && typeof value === 'object') return value as any
  try {
    return JSON.parse(String(value || '{}'))
  } catch {
    return {}
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function errorWithCode(code: string, message = code) {
  return Object.assign(new Error(message), { code })
}

async function eventually(predicate: () => boolean, message = 'condition was not reached') {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return
    await new Promise(resolve => setTimeout(resolve, 0))
  }
  throw new Error(message)
}

type WriteCrash = (input: any) => 'before' | 'after' | null

function createHarness(options: {
  autoQuality?: boolean
  autoStoryState?: boolean
  sourceReview?: Record<string, unknown>
  followers?: Array<{ chapter_no: number; chapter_text: string }>
  checkpoint?: EditorRevisionCheckpoint
  executeRevision?: (...args: any[]) => Promise<any>
  quality?: (...args: any[]) => Promise<any>
  prepareStoryState?: (...args: any[]) => Promise<any>
  applyStoryState?: (...args: any[]) => Promise<any>
  renewLease?: (...args: any[]) => Promise<boolean>
  writeCrash?: WriteCrash
  commit?: (...args: any[]) => Promise<any>
  afterCheckpoint?: (input: any, persistCancel: () => void) => void
} = {}) {
  const project = { id: 4, title: 'Worker Project', reference_config: {} }
  const input = {
    schema_version: 1 as const,
    project_id: project.id,
    chapter_id: 7,
    chapter_no: 1,
    chapter_title: '第一章',
    review_id: 11,
    source_chapter_updated_at: '2030-01-01T00:00:00.000Z',
    source_text: sourceText,
    source_text_hash: revisionTextHash(sourceText),
    source_char_count: sourceText.replace(/\s/g, '').length,
    source_review: options.sourceReview || { id: 11, review_type: 'prose_quality', payload: '{}' },
    report: { revision_strategy: 'surgical_patch', must_fix: ['收紧冲突'] },
    context_package: { current_chapter: { chapter_no: 1 } },
    revision_mode: 'from_report',
    revision_strategy: 'surgical_patch',
    user_prompt: '',
    auto_quality_check: options.autoQuality ?? true,
    auto_story_state: options.autoStoryState ?? true,
    created_at: '2030-01-01T00:00:00.000Z',
  }
  let checkpoint = clone(options.checkpoint || initialCheckpoint())
  const run: any = {
    id: 41,
    project_id: project.id,
    run_type: 'editor_revision',
    step_name: 'chapter-1',
    status: 'queued',
    input_ref: JSON.stringify(input),
    output_ref: JSON.stringify(checkpoint),
    lease_owner: null,
    lease_expires_at: null,
    cancel_requested_at: null,
    created_at: '2030-01-01T00:00:00.000Z',
    updated_at: '2030-01-01T00:00:00.000Z',
  }
  let chapter: any = {
    id: input.chapter_id,
    project_id: project.id,
    chapter_no: input.chapter_no,
    title: input.chapter_title,
    chapter_text: sourceText,
    raw_payload: {},
    updated_at: input.source_chapter_updated_at,
  }
  const followers = (options.followers || []).map((item, index) => ({
    id: 100 + index,
    project_id: project.id,
    title: `chapter ${item.chapter_no}`,
    updated_at: '2030-01-01T00:00:00.000Z',
    ...item,
  }))
  const reviews: any[] = []
  const events: string[] = []
  const writes: EditorRevisionCheckpoint[] = []
  const revisionCalls: any[][] = []
  const qualityCalls: any[][] = []
  const prepareCalls: any[][] = []
  const applyCalls: any[][] = []
  const renewCalls: any[] = []
  const intervalRegistrations: Array<{ callback: () => any; ms: number; cleared: boolean }> = []
  const timeoutRegistrations: Array<{ callback: () => any; ms: number; cleared: boolean }> = []
  let commitCalls = 0
  let versionWrites = 0
  let writeCrash = options.writeCrash

  const executeRevision = options.executeRevision || (async (...args: any[]) => {
    revisionCalls.push(args)
    events.push('execute_revision')
    return completeResult()
  })
  const quality = options.quality || (async (...args: any[]) => {
    qualityCalls.push(args)
    events.push('quality')
    return {
      review: { passed: true, score: 91, needs_revision: false },
      saved: { id: 71, review_type: 'prose_quality', payload: '{}' },
      reused: false,
    }
  })
  const prepareStoryState = options.prepareStoryState || (async (...args: any[]) => {
    prepareCalls.push(args)
    events.push('prepare_story_state')
    return {
      reused: false,
      prepared: {
        state_delta: { current_time: 'night' },
        character_updates: [],
        setting_updates: [],
        storyline_updates: [],
        sync_reports: {},
        hard_failures: [],
        payload: {},
        receipt_binding: { key: 'memory-only' },
      },
    }
  })
  const applyStoryState = options.applyStoryState || (async (...args: any[]) => {
    applyCalls.push(args)
    events.push('apply_story_state')
    return { reused: false, update: { applied: true }, receipt: { status: 'completed' } }
  })

  const defaultCommit = async (_workspace: string, commitInput: any) => {
    commitCalls += 1
    events.push('commit')
    const marker = chapter.raw_payload?.editor_revision_commit
    if (Number(marker?.run_id || 0) > commitInput.runId) throw errorWithCode('REVISION_RUN_SUPERSEDED')
    if (Number(marker?.run_id || 0) === commitInput.runId) {
      if (revisionTextHash(chapter.chapter_text) !== commitInput.candidateHash) {
        throw errorWithCode('REVISION_RUN_SUPERSEDED')
      }
      return {
        status: 'already_committed',
        chapter: clone(chapter),
        review: { id: 61, review_type: 'editor_revision' },
        versionCreated: false,
      }
    }
    if (revisionTextHash(chapter.chapter_text) !== commitInput.sourceTextHash) {
      throw errorWithCode('SOURCE_VERSION_CHANGED')
    }
    versionWrites += 1
    chapter = {
      ...chapter,
      ...commitInput.chapterPatch,
      chapter_text: commitInput.candidateText,
      raw_payload: {
        ...(chapter.raw_payload || {}),
        ...(commitInput.chapterPatch?.raw_payload || {}),
        editor_revision_commit: {
          run_id: commitInput.runId,
          source_hash: commitInput.sourceTextHash,
          candidate_hash: commitInput.candidateHash,
          committed_at: '2030-01-01T00:00:03.000Z',
        },
      },
      updated_at: '2030-01-01T00:00:03.000Z',
    }
    return {
      status: 'committed',
      chapter: clone(chapter),
      review: { id: 61, review_type: 'editor_revision' },
      versionCreated: true,
    }
  }

  const ctx: any = {
    getWorkspace: () => workspace,
    getProject: async () => project,
    buildChapterContextPackage: async () => ({}),
    getStageModelId: () => 19,
    getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
    buildReferenceUsageReport: async () => ({}),
    buildStructuralSimilarityReport: () => ({}),
    buildReferenceMigrationDryPlan: () => ({}),
    diffTexts: () => ({}),
    updateStoryStateMachine: async () => ({}),
  }

  const dependencies: any = {
    claimRun: async (_workspace: string, claim: any) => {
      if (run.status !== 'queued') return null
      run.status = 'running'
      run.lease_owner = claim.owner
      run.lease_expires_at = '2099-01-01T00:00:00.000Z'
      events.push('claim')
      return clone(run)
    },
    renewLease: async (_workspace: string, renew: any) => {
      renewCalls.push(clone(renew))
      return options.renewLease ? options.renewLease(_workspace, renew) : true
    },
    getRun: async () => clone(run),
    recoverRuns: async () => ({ queued: run.status === 'queued' ? [run.id] : [], failedLegacy: [] }),
    writeCheckpoint: async (_workspace: string, write: any) => {
      const crash = writeCrash?.(write) || null
      if (crash === 'before') throw errorWithCode('SIMULATED_CRASH')
      checkpoint = clone(write.checkpoint)
      run.output_ref = JSON.stringify(checkpoint)
      run.status = write.status
      writes.push(clone(checkpoint))
      events.push(`checkpoint:${write.phase}:${checkpoint.phases[write.phase as EditorRevisionPhase].status}`)
      options.afterCheckpoint?.(write, () => {
        run.status = 'cancel_requested'
        run.cancel_requested_at = '2030-01-01T00:00:02.000Z'
      })
      if (crash === 'after') throw errorWithCode('SIMULATED_CRASH')
      return clone(run)
    },
    finishCancellation: async (_workspace: string, _runId: number, _owner: string, next: EditorRevisionCheckpoint) => {
      checkpoint = clone(next)
      run.output_ref = JSON.stringify(checkpoint)
      run.status = 'canceled'
      events.push('canceled')
      return clone(run)
    },
    getChapter: async () => clone(chapter),
    listChapters: async () => [clone(chapter), ...clone(followers)],
    listReviews: async () => clone(reviews),
    findOrCreateReview: async (_workspace: string, request: any) => {
      const receipt = request.receipt
      const existing = reviews.find(review => {
        const payload = parsed(review.payload)
        if (review.review_type !== receipt.kind || Number(payload.source_run_id || 0) !== receipt.sourceRunId) return false
        if (receipt.kind === 'downstream_continuity_warning') return true
        return String(payload.candidate_hash || '') === receipt.candidateHash
          && Number(payload.chapter_id || 0) === receipt.chapterId
      })
      if (existing) return clone(existing)
      const review = { ...clone(request.data), id: 80 + reviews.length }
      reviews.push(review)
      events.push(`review:${review.review_type}`)
      return clone(review)
    },
    commitChapter: options.commit || defaultCommit,
    executeRevision: async (...args: any[]) => {
      if (options.executeRevision) revisionCalls.push(args)
      return executeRevision(...args)
    },
    createQualityReview: async (...args: any[]) => {
      if (options.quality) qualityCalls.push(args)
      return quality(...args)
    },
    prepareStoryState: async (...args: any[]) => {
      if (options.prepareStoryState) prepareCalls.push(args)
      return prepareStoryState(...args)
    },
    applyStoryState: async (...args: any[]) => {
      if (options.applyStoryState) applyCalls.push(args)
      return applyStoryState(...args)
    },
    now: () => '2030-01-01T00:00:01.000Z',
    setInterval: (callback: () => any, ms: number) => {
      const registration = { callback, ms, cleared: false }
      intervalRegistrations.push(registration)
      return registration
    },
    clearInterval: (registration: any) => { registration.cleared = true },
    setTimeout: (callback: () => any, ms: number) => {
      const registration = { callback, ms, cleared: false }
      timeoutRegistrations.push(registration)
      return registration
    },
    clearTimeout: (registration: any) => { registration.cleared = true },
  }

  function worker(overrides: Record<string, unknown> = {}) {
    return createEditorRevisionWorker(ctx, { ...dependencies, ...overrides })
  }

  function requestCancel(activeWorker: ReturnType<typeof worker>) {
    run.status = 'cancel_requested'
    run.cancel_requested_at = '2030-01-01T00:00:02.000Z'
    activeWorker.cancel(run.id)
  }

  function requeue() {
    run.status = 'queued'
    run.cancel_requested_at = null
    run.lease_owner = null
    run.lease_expires_at = null
  }

  function setCheckpoint(next: EditorRevisionCheckpoint) {
    checkpoint = clone(next)
    run.output_ref = JSON.stringify(checkpoint)
  }

  return {
    input,
    run,
    project,
    ctx,
    worker,
    requestCancel,
    requeue,
    setCheckpoint,
    setWriteCrash(next: WriteCrash | undefined) { writeCrash = next },
    checkpoint: () => clone(checkpoint),
    chapter: () => clone(chapter),
    setChapter(next: any) { chapter = clone(next) },
    reviews,
    events,
    writes,
    revisionCalls,
    qualityCalls,
    prepareCalls,
    applyCalls,
    renewCalls,
    intervalRegistrations,
    timeoutRegistrations,
    commitCalls: () => commitCalls,
    versionWrites: () => versionWrites,
  }
}

function persistedCheckpoint(candidate = candidateText): EditorRevisionCheckpoint {
  const checkpoint = initialCheckpoint()
  checkpoint.phase = 'post_quality'
  checkpoint.phases.generate_candidate = { status: 'completed', attempt: 1 }
  checkpoint.phases.admit_candidate = { status: 'completed', attempt: 1 }
  checkpoint.phases.persist_chapter = { status: 'completed', attempt: 1 }
  checkpoint.candidate = {
    text: candidate,
    hash: revisionTextHash(candidate),
    char_count: candidate.replace(/\s/g, '').length,
    applied_patches: [{ type: 'full_text' }],
    diagnostics: {},
  }
  checkpoint.prose_persisted = true
  checkpoint.committed_chapter_updated_at = '2030-01-01T00:00:03.000Z'
  checkpoint.editor_revision_review_id = 61
  return checkpoint
}

function installMatchingCommitMarker(harness: ReturnType<typeof createHarness>, runId = 41) {
  const checkpoint = harness.checkpoint()
  const candidate = checkpoint.candidate?.text || candidateText
  harness.setChapter({
    ...harness.chapter(),
    chapter_text: candidate,
    raw_payload: {
      editor_revision_commit: {
        run_id: runId,
        source_hash: harness.input.source_text_hash,
        candidate_hash: revisionTextHash(candidate),
        committed_at: '2030-01-01T00:00:03.000Z',
      },
    },
    updated_at: '2030-01-01T00:00:03.000Z',
  })
}

describe('durable editor revision worker', () => {
  test('durably writes every phase boundary before its mutation and completes', async () => {
    const harness = createHarness({ followers: [{ chapter_no: 2, chapter_text: '后续正文。' }] })
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.checkpoint().phases.completed.status).toBe('completed')
    expect(harness.run.status).toBe('completed')
    expect(harness.events.indexOf('checkpoint:persist_chapter:running')).toBeLessThan(harness.events.indexOf('commit'))
    expect(harness.events.indexOf('checkpoint:post_quality:running')).toBeLessThan(harness.events.indexOf('quality'))
    expect(harness.events.indexOf('checkpoint:sync_current_story_state:running')).toBeLessThan(harness.events.indexOf('prepare_story_state'))
    expect(harness.events.indexOf('prepare_story_state')).toBeLessThan(harness.events.indexOf('apply_story_state'))
    expect(harness.writes.some(item => item.story_state?.status === 'prepared')).toBe(true)
  })

  test('builds the revision prompt from delivery risks in the immutable source review', async () => {
    const sourceRisk = 'SOURCE_REVIEW_RISK_SENTINEL'
    const harness = createHarness({
      sourceReview: {
        id: 11,
        review_type: 'prose_quality',
        payload: JSON.stringify({
          chapter_id: 7,
          self_check: { review: { must_fix: [sourceRisk] } },
        }),
      },
    })
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.revisionCalls[0][2].task).toContain(sourceRisk)
  })

  test('renews one stable lease owner every ten seconds before half the lease elapses', async () => {
    let resolveRevision!: (value: any) => void
    const harness = createHarness({
      executeRevision: async () => new Promise(resolve => { resolveRevision = resolve }),
    })
    const worker = harness.worker()
    await worker.start(workspace)
    await eventually(() => harness.intervalRegistrations.length === 1)

    const heartbeat = harness.intervalRegistrations[0]
    expect(heartbeat.ms).toBe(10_000)
    expect(heartbeat.ms).toBeLessThan(15_000)
    await heartbeat.callback()
    expect(harness.renewCalls).toHaveLength(1)
    expect(harness.renewCalls[0].owner).toBe(harness.run.lease_owner)

    resolveRevision(completeResult())
    await worker.waitForIdle()
    expect(heartbeat.cleared).toBe(true)
  })

  test('lease loss aborts the active provider and prevents every later mutation', async () => {
    let providerAborted = false
    const harness = createHarness({
      renewLease: async () => false,
      executeRevision: async (_agent, _project, _request, callOptions) => new Promise((_resolve, reject) => {
        callOptions.signal.addEventListener('abort', () => {
          providerAborted = true
          reject(callOptions.signal.reason)
        }, { once: true })
      }),
    })
    const worker = harness.worker()
    await worker.start(workspace)
    await eventually(() => harness.intervalRegistrations.length === 1)
    await harness.intervalRegistrations[0].callback()
    await worker.waitForIdle()

    expect(providerAborted).toBe(true)
    expect(harness.commitCalls()).toBe(0)
    expect(harness.run.status).toBe('running')
  })

  test('cancel during generation aborts the provider and makes zero chapter or version writes', async () => {
    let providerAborted = false
    const harness = createHarness({
      executeRevision: async (_agent, _project, _request, callOptions) => new Promise((_resolve, reject) => {
        callOptions.signal.addEventListener('abort', () => {
          providerAborted = true
          reject(callOptions.signal.reason)
        }, { once: true })
      }),
    })
    const worker = harness.worker()
    await worker.start(workspace)
    await eventually(() => harness.revisionCalls.length === 1)
    harness.requestCancel(worker)
    await worker.waitForIdle()

    expect(providerAborted).toBe(true)
    expect(harness.run.status).toBe('canceled')
    expect(harness.checkpoint().phases.generate_candidate.status).toBe('canceled')
    expect(harness.commitCalls()).toBe(0)
    expect(harness.versionWrites()).toBe(0)
    expect(harness.chapter().chapter_text).toBe(sourceText)
  })

  test('cancel after commit preserves prose metadata and leaves all post phases incomplete', async () => {
    let worker!: ReturnType<ReturnType<typeof createHarness>['worker']>
    const harness = createHarness()
    const commit = async (_workspace: string, commitInput: any) => {
      const chapter = {
        ...harness.chapter(),
        chapter_text: commitInput.candidateText,
        raw_payload: { editor_revision_commit: { run_id: commitInput.runId, candidate_hash: commitInput.candidateHash } },
        updated_at: '2030-01-01T00:00:03.000Z',
      }
      harness.setChapter(chapter)
      harness.requestCancel(worker)
      return { status: 'committed', chapter, review: { id: 61 }, versionCreated: true }
    }
    worker = harness.worker({ commitChapter: commit })
    await worker.start(workspace)
    await worker.waitForIdle()

    const checkpoint = harness.checkpoint()
    expect(harness.run.status).toBe('canceled')
    expect(checkpoint.prose_persisted).toBe(true)
    expect(checkpoint.committed_chapter_updated_at).toBe('2030-01-01T00:00:03.000Z')
    expect(checkpoint.editor_revision_review_id).toBe(61)
    expect(checkpoint.phases.persist_chapter.status).toBe('completed')
    expect(checkpoint.phases.post_quality.status).toBe('pending')
    expect(harness.qualityCalls).toHaveLength(0)
  })

  test('reuses a durably admitted candidate after restart without regenerating it', async () => {
    let crashOnce = true
    const harness = createHarness({
      writeCrash: input => {
        if (crashOnce && input.phase === 'admit_candidate' && input.checkpoint.phases.admit_candidate.status === 'completed') {
          crashOnce = false
          return 'after'
        }
        return null
      },
    })
    const first = harness.worker()
    await first.start(workspace)
    await first.waitForIdle()
    expect(harness.checkpoint().candidate?.text).toBe(candidateText)
    expect(harness.revisionCalls).toHaveLength(1)

    harness.requeue()
    harness.setWriteCrash(undefined)
    const restarted = harness.worker()
    await restarted.start(workspace)
    await restarted.waitForIdle()

    expect(harness.revisionCalls).toHaveLength(1)
    expect(harness.versionWrites()).toBe(1)
    expect(harness.run.status).toBe('completed')
  })

  test('recovers a commit marker crash window without creating a second version', async () => {
    let crashOnce = true
    const harness = createHarness({
      writeCrash: input => {
        if (crashOnce && input.phase === 'persist_chapter' && input.checkpoint.prose_persisted) {
          crashOnce = false
          return 'before'
        }
        return null
      },
    })
    const first = harness.worker()
    await first.start(workspace)
    await first.waitForIdle()
    expect(harness.versionWrites()).toBe(1)
    expect(harness.checkpoint().prose_persisted).toBe(false)

    harness.requeue()
    harness.setWriteCrash(undefined)
    const restarted = harness.worker()
    await restarted.start(workspace)
    await restarted.waitForIdle()

    expect(harness.versionWrites()).toBe(1)
    expect(harness.revisionCalls).toHaveLength(1)
    expect(harness.checkpoint().prose_persisted).toBe(true)
  })

  test('fails a run superseded by a newer commit marker before any model call', async () => {
    const harness = createHarness()
    harness.setChapter({
      ...harness.chapter(),
      chapter_text: '更新正文。',
      raw_payload: { editor_revision_commit: { run_id: harness.run.id + 1, candidate_hash: 'newer' } },
    })
    const worker = harness.worker()
    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.run.status).toBe('failed')
    expect(harness.checkpoint().error?.code).toBe('REVISION_RUN_SUPERSEDED')
    expect(harness.revisionCalls).toHaveLength(0)
    expect(harness.commitCalls()).toBe(0)
  })

  test('a post-quality retry resumes at post_quality and never regenerates or recommits prose', async () => {
    const checkpoint = persistedCheckpoint()
    const harness = createHarness({ checkpoint })
    installMatchingCommitMarker(harness)
    const worker = harness.worker()
    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.revisionCalls).toHaveLength(0)
    expect(harness.commitCalls()).toBe(0)
    expect(harness.qualityCalls).toHaveLength(1)
    expect(harness.checkpoint().phases.post_quality.status).toBe('completed')
  })

  test('needs_revision is a warning and never triggers a second rewrite or rollback', async () => {
    const harness = createHarness({
      quality: async () => ({
        review: { passed: false, score: 62, needs_revision: true },
        saved: { id: 72, review_type: 'prose_quality' },
        reused: false,
      }),
    })
    const worker = harness.worker()
    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.run.status).toBe('completed')
    expect(harness.revisionCalls).toHaveLength(1)
    expect(harness.versionWrites()).toBe(1)
    expect(harness.checkpoint().warnings).toContainEqual(expect.objectContaining({ code: 'POST_QUALITY_NEEDS_REVISION' }))
  })

  test('checkpoints compact Story State prepare output and reuses it after a crash', async () => {
    const checkpoint = persistedCheckpoint()
    checkpoint.phases.post_quality = { status: 'completed', attempt: 1 }
    checkpoint.phase = 'sync_current_story_state'
    let crashOnce = true
    const harness = createHarness({
      checkpoint,
      writeCrash: input => {
        if (crashOnce && input.phase === 'sync_current_story_state' && input.checkpoint.story_state?.status === 'prepared') {
          crashOnce = false
          return 'after'
        }
        return null
      },
    })
    installMatchingCommitMarker(harness)
    const first = harness.worker()
    await first.start(workspace)
    await first.waitForIdle()
    expect(harness.prepareCalls).toHaveLength(1)
    expect(harness.applyCalls).toHaveLength(0)
    expect(JSON.stringify(harness.checkpoint().story_state)).not.toContain('memory-only')

    harness.requeue()
    harness.setWriteCrash(undefined)
    const restarted = harness.worker()
    await restarted.start(workspace)
    await restarted.waitForIdle()

    expect(harness.prepareCalls).toHaveLength(1)
    expect(harness.applyCalls).toHaveLength(1)
    expect(harness.applyCalls[0][1].prepared.receipt_binding.key).toContain(`${harness.run.id}:${harness.input.chapter_id}`)
  })

  test('honors durable cancellation after Story State prepare checkpoint and before apply', async () => {
    const checkpoint = persistedCheckpoint()
    checkpoint.phases.post_quality = { status: 'completed', attempt: 1 }
    checkpoint.phase = 'sync_current_story_state'
    let canceled = false
    const harness = createHarness({
      checkpoint,
      afterCheckpoint: (write, persistCancel) => {
        if (!canceled
          && write.phase === 'sync_current_story_state'
          && write.checkpoint.story_state?.status === 'prepared') {
          canceled = true
          persistCancel()
        }
      },
    })
    installMatchingCommitMarker(harness)
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.run.status).toBe('canceled')
    expect(harness.prepareCalls).toHaveLength(1)
    expect(harness.applyCalls).toHaveLength(0)
  })

  test.each([
    { followers: [{ chapter_no: 2, chapter_text: '已写第二章。' }], expectedWarnings: 1 },
    { followers: [{ chapter_no: 2, chapter_text: '   ' }], expectedWarnings: 0 },
  ])('creates a deterministic continuity warning only for later written chapters', async ({ followers, expectedWarnings }) => {
    const harness = createHarness({ followers })
    const worker = harness.worker()
    await worker.start(workspace)
    await worker.waitForIdle()

    const warnings = harness.reviews.filter(review => review.review_type === 'downstream_continuity_warning')
    expect(warnings).toHaveLength(expectedWarnings)
    if (warnings.length) {
      expect(parsed(warnings[0].payload)).toEqual({
        source_run_id: harness.run.id,
        chapter_id: harness.input.chapter_id,
        chapter_no: harness.input.chapter_no,
        source_hash: harness.input.source_text_hash,
        candidate_hash: revisionTextHash(candidateText),
        following_written_range: { first: 2, last: 2, count: 1 },
        status: 'manual_review_recommended',
      })
    }
    expect(harness.reviews.filter(review => review.review_type === 'delivery_risk_convergence')).toHaveLength(1)
  })

  test('revalidates lease ownership after a blocked deterministic review read', async () => {
    const harness = createHarness({
      followers: [{ chapter_no: 2, chapter_text: '已写第二章。' }],
      renewLease: async () => false,
    })
    let readStarted = false
    let releaseRead!: () => void
    let reviewReads = 0
    const worker = harness.worker({
      listReviews: async () => {
        reviewReads += 1
        if (reviewReads > 1) return []
        return new Promise(resolve => {
          readStarted = true
          releaseRead = () => resolve([])
        })
      },
    })

    await worker.start(workspace)
    await eventually(() => readStarted)
    await harness.intervalRegistrations[0].callback()
    releaseRead()
    await worker.waitForIdle()

    expect(harness.run.status).toBe('running')
    expect(harness.reviews).toHaveLength(0)
  })

  test('atomically reuses deterministic reviews without changing their exact payload', async () => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: 'atomic worker review' })
    const payload = {
      source_run_id: 41,
      candidate_hash: 'a'.repeat(64),
      chapter_id: 7,
      chapter_no: 1,
      delivery_risk_convergence: { status: 'cleared' },
    }
    const request = {
      data: {
        project_id: project.id,
        review_type: 'delivery_risk_convergence',
        status: 'ok',
        summary: '风险已清零，残留 0',
        issues: [],
        payload: JSON.stringify(payload),
      },
      receipt: {
        kind: 'delivery_risk_convergence' as const,
        sourceRunId: 41,
        candidateHash: 'a'.repeat(64),
        chapterId: 7,
      },
    }

    const [first, replay] = await Promise.all([
      findOrCreateEditorRevisionReview(activeWorkspace, request),
      findOrCreateEditorRevisionReview(activeWorkspace, request),
    ])
    const stored = (await listNovelReviews(activeWorkspace, project.id))
      .filter(review => review.review_type === 'delivery_risk_convergence')

    expect(replay.id).toBe(first.id)
    expect(stored).toHaveLength(1)
    expect(parsed(stored[0].payload)).toEqual(payload)

    const continuityPayload = {
      source_run_id: 41,
      chapter_id: 7,
      chapter_no: 1,
      source_hash: 'b'.repeat(64),
      candidate_hash: 'a'.repeat(64),
      following_written_range: { first: 2, last: 3, count: 2 },
      status: 'manual_review_recommended',
    }
    const continuityRequest = {
      data: {
        project_id: project.id,
        review_type: 'downstream_continuity_warning',
        status: 'warn',
        summary: '后续已写章节建议人工复查',
        issues: ['人工复查'],
        payload: JSON.stringify(continuityPayload),
      },
      receipt: {
        kind: 'downstream_continuity_warning' as const,
        sourceRunId: 41,
      },
    }
    const [firstContinuity, replayContinuity] = await Promise.all([
      findOrCreateEditorRevisionReview(activeWorkspace, continuityRequest),
      findOrCreateEditorRevisionReview(activeWorkspace, continuityRequest),
    ])
    const continuity = (await listNovelReviews(activeWorkspace, project.id))
      .filter(review => review.review_type === 'downstream_continuity_warning')

    expect(replayContinuity.id).toBe(firstContinuity.id)
    expect(continuity).toHaveLength(1)
    expect(parsed(continuity[0].payload)).toEqual(continuityPayload)
  })

  test('disabled post phases are durably skipped without quality or Story State calls', async () => {
    const harness = createHarness({ autoQuality: false, autoStoryState: false })
    const worker = harness.worker()
    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.checkpoint().phases.post_quality).toMatchObject({
      status: 'skipped',
      summary: { reason: 'disabled_by_request' },
    })
    expect(harness.checkpoint().phases.sync_current_story_state).toMatchObject({
      status: 'skipped',
      summary: { reason: 'disabled_by_request' },
    })
    expect(harness.qualityCalls).toHaveLength(0)
    expect(harness.prepareCalls).toHaveLength(0)
  })

  test('aborts a never-resolving revision call at exactly 180 seconds', async () => {
    let providerAborted = false
    const harness = createHarness({
      executeRevision: async (_agent, _project, _request, callOptions) => new Promise((_resolve, reject) => {
        callOptions.signal.addEventListener('abort', () => {
          providerAborted = true
          reject(callOptions.signal.reason)
        }, { once: true })
      }),
    })
    const worker = harness.worker()
    await worker.start(workspace)
    await eventually(() => harness.timeoutRegistrations.some(item => item.ms === 180_000))
    const timeout = harness.timeoutRegistrations.find(item => item.ms === 180_000)!
    timeout.callback()
    await worker.waitForIdle()

    expect(providerAborted).toBe(true)
    expect(harness.run.status).toBe('failed')
    expect(harness.checkpoint().error?.code).toBe('REVISION_LLM_TIMEOUT')
    expect(harness.commitCalls()).toBe(0)
  })

  test('passes one provider retry so transient failure makes at most two total attempts', async () => {
    let providerAttempts = 0
    const harness = createHarness({
      executeRevision: async (_agent, _project, _request, callOptions) => {
        for (let attempt = 0; attempt <= callOptions.maxRetries; attempt += 1) {
          providerAttempts += 1
          if (attempt === callOptions.maxRetries) return completeResult()
        }
      },
    })
    const worker = harness.worker()
    await worker.start(workspace)
    await worker.waitForIdle()

    expect(providerAttempts).toBe(2)
    expect(harness.revisionCalls).toHaveLength(1)
    expect(harness.revisionCalls[0][3]).toMatchObject({ timeoutMs: 180_000, maxRetries: 1 })
  })

  test('truncation makes one application-level attempt and stops before commit', async () => {
    const harness = createHarness({
      executeRevision: async () => ({ ...completeResult(), finish_reason: 'max_tokens' }),
    })
    const worker = harness.worker()
    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.revisionCalls).toHaveLength(1)
    expect(harness.commitCalls()).toBe(0)
    expect(harness.checkpoint().error?.code).toBe('PROSE_REVISION_TRUNCATED')
  })

  test('admission rejection stores bounded candidate evidence after one attempt', async () => {
    const rejected = `${'残 文。 '.repeat(20)}在`
    const harness = createHarness({ executeRevision: async () => completeResult(rejected) })
    const worker = harness.worker()
    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.revisionCalls).toHaveLength(1)
    expect(harness.commitCalls()).toBe(0)
    expect(harness.checkpoint().error).toMatchObject({
      code: 'REVISION_CANDIDATE_TOO_SHORT',
      diagnostics: {
        rejected_candidate: {
          text: rejected,
          char_count: rejected.replace(/\s/g, '').length,
        },
      },
    })
  })

  test('source conflict makes one candidate attempt and never retries or writes a version', async () => {
    const harness = createHarness()
    harness.setChapter({ ...harness.chapter(), chapter_text: `${sourceText}用户修改。` })
    const worker = harness.worker()
    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.revisionCalls).toHaveLength(1)
    expect(harness.commitCalls()).toBe(1)
    expect(harness.versionWrites()).toBe(0)
    expect(harness.checkpoint().error?.code).toBe('SOURCE_VERSION_CHANGED')
  })

  test('fails without chapter writes when the full admitted candidate cannot be checkpointed', async () => {
    let failedCandidateWrite = false
    const harness = createHarness({
      writeCrash: input => {
        if (!failedCandidateWrite && input.phase === 'admit_candidate' && input.checkpoint.candidate) {
          failedCandidateWrite = true
          return 'before'
        }
        return null
      },
    })
    const worker = harness.worker()
    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.run.status).toBe('failed')
    expect(harness.checkpoint().error?.code).toBe('REVISION_CANDIDATE_CHECKPOINT_FAILED')
    expect(harness.commitCalls()).toBe(0)
    expect(harness.chapter().chapter_text).toBe(sourceText)
  })
})
