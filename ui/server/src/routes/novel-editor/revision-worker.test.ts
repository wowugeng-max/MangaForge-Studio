import { afterEach, describe, expect, test } from 'bun:test'
import { rm } from 'fs/promises'
import {
  claimEditorRevisionRun,
  commitEditorRevisionChapter,
  createEditorRevisionRun,
  createNovelChapter,
  createNovelProject,
  createNovelReview,
  getNovelProject,
  getNovelChapter,
  getEditorRevisionRun,
  listChapterVersions,
  listNovelReviews,
  listNovelRuns,
  recoverEditorRevisionRuns,
  requireCoherentEditorRevisionCheckpoint,
  requestEditorRevisionCancel,
  writeEditorRevisionCheckpoint,
} from '../../novel'
import { openDb } from '../../novel/db'
import { novelMutationKey, novelMutationLocks } from '../../novel/lock'
import { withNovelDbWrite } from '../../novel/sql-rows'
import { tempWorkspace, workspaces } from '../../novel/test-utils'
import { setNovelMutationTestHook } from '../../novel-test-support'
import { createStoryStateMachineMethods } from '../../novel-writing-service/service/story-state-machine'
import type { EditorRevisionCheckpoint, EditorRevisionPhase } from './editor-revision-contract'
import { revisionTextHash } from './revision-candidate-admission'
import { createEditorRevisionWorker, findOrCreateEditorRevisionReview } from './revision-worker'

const workspace = '/tmp/editor-revision-worker-test'
const sourceText = `${'原正文推进。'.repeat(220)}。`
const candidateText = `${'修订正文推进。'.repeat(190)}。`

afterEach(async () => {
  setNovelMutationTestHook(null)
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

function admittedCheckpoint(status: 'pending' | 'running' = 'pending'): EditorRevisionCheckpoint {
  const checkpoint = initialCheckpoint()
  checkpoint.phase = 'persist_chapter'
  checkpoint.phases.generate_candidate = { status: 'completed', attempt: 1 }
  checkpoint.phases.admit_candidate = { status: 'completed', attempt: 1 }
  checkpoint.phases.persist_chapter = { status, attempt: status === 'pending' ? 0 : 1 }
  checkpoint.candidate = {
    text: candidateText,
    hash: revisionTextHash(candidateText),
    char_count: candidateText.replace(/\s/g, '').length,
    applied_patches: [{ type: 'full_text' }],
    diagnostics: {},
  }
  return checkpoint
}

function completeResult(text = candidateText, extra: Record<string, unknown> = {}) {
  const output = { chapter_text: text, ...extra }
  return { finish_reason: 'stop', content: JSON.stringify(output), output }
}

function canonicalRunInput(projectId: number, chapter: { id: number; chapter_no: number; title: string; updated_at: string }) {
  return {
    schema_version: 1 as const,
    project_id: projectId,
    chapter_id: chapter.id,
    chapter_no: chapter.chapter_no,
    chapter_title: chapter.title,
    review_id: 11,
    source_chapter_updated_at: chapter.updated_at,
    source_text: sourceText,
    source_text_hash: revisionTextHash(sourceText),
    source_char_count: sourceText.replace(/\s/g, '').length,
    source_review: { id: 11, review_type: 'prose_quality', payload: '{}' },
    report: { revision_strategy: 'surgical_patch', must_fix: ['收紧冲突'] },
    context_package: { current_chapter: { chapter_no: chapter.chapter_no } },
    revision_mode: 'from_report',
    revision_strategy: 'surgical_patch',
    user_prompt: '',
    auto_quality_check: true,
    auto_story_state: true,
    created_at: '2030-01-01T00:00:00.000Z',
  }
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

function runDbMutation(workspacePath: string, sql: string, ...params: any[]) {
  const db = openDb(workspacePath)
  try {
    db.query(sql).run(...params)
  } finally {
    db.close()
  }
}

async function cancelBeforeFencedMutation<T>(
  workspacePath: string,
  runId: number,
  holderOperation: string,
  mutation: () => Promise<T>,
): Promise<T> {
  let releaseLock!: () => void
  let lockAcquired!: () => void
  const acquired = new Promise<void>(resolve => { lockAcquired = resolve })
  const release = new Promise<void>(resolve => { releaseLock = resolve })
  setNovelMutationTestHook(async event => {
    if (event.operation !== holderOperation || event.phase !== 'after_mutation_lock_acquired') return
    lockAcquired()
    await release
  })
  const holder = withNovelDbWrite(workspacePath, () => {}, holderOperation)
  await acquired
  const pending = mutation()
  runDbMutation(
    workspacePath,
    'UPDATE runs SET status = ?, cancel_requested_at = ? WHERE id = ?',
    'cancel_requested',
    '2030-01-01T00:00:02.000Z',
    runId,
  )
  releaseLock()
  await holder
  return pending
}

async function installCommitEvidence(
  workspacePath: string,
  projectId: number,
  chapterId: number,
  runId: number,
  sourceHash: string,
) {
  const committedAt = '2030-01-01T00:00:03.000Z'
  const candidateHash = revisionTextHash(candidateText)
  runDbMutation(
    workspacePath,
    'UPDATE chapters SET chapter_text = ?, raw_payload = ?, updated_at = ? WHERE id = ? AND project_id = ?',
    candidateText,
    JSON.stringify({
      editor_revision_commit: {
        run_id: runId,
        source_hash: sourceHash,
        candidate_hash: candidateHash,
        committed_at: committedAt,
      },
    }),
    committedAt,
    chapterId,
    projectId,
  )
  const receipt = await createNovelReview(workspacePath, {
    project_id: projectId,
    review_type: 'editor_revision',
    payload: JSON.stringify({
      source_run_id: runId,
      chapter_id: chapterId,
      candidate_hash: candidateHash,
    }),
  })
  return { candidateHash, committedAt, receipt }
}

async function createCommittedWorkerFixture(
  activeWorkspace: string,
  options: { autoQuality: boolean; autoStoryState: boolean },
) {
  const project = await createNovelProject(activeWorkspace, {
    title: 'parent transaction fence',
    reference_config: { story_state: { current_time: 'before-fence' } },
  })
  const chapter = await createNovelChapter(activeWorkspace, {
    project_id: project.id,
    chapter_no: 1,
    title: '第一章',
    chapter_text: sourceText,
  })
  const input = {
    ...canonicalRunInput(project.id, chapter),
    auto_quality_check: options.autoQuality,
    auto_story_state: options.autoStoryState,
  }
  const run = await createEditorRevisionRun(activeWorkspace, {
    projectId: project.id,
    chapterId: chapter.id,
    inputRef: JSON.stringify(input),
    outputRef: JSON.stringify(initialCheckpoint()),
  })
  const evidence = await installCommitEvidence(
    activeWorkspace,
    project.id,
    chapter.id,
    run.id,
    input.source_text_hash,
  )
  return { project, chapter, input, run, evidence }
}

function storyStateMutationSnapshot(activeWorkspace: string, projectId: number, chapterId: number) {
  const db = openDb(activeWorkspace)
  try {
    return {
      project: db.query('SELECT reference_config FROM projects WHERE id = ?').get(projectId),
      characters: db.query('SELECT id, current_state, relationship_graph, raw_payload FROM characters WHERE project_id = ? ORDER BY id').all(projectId),
      settings: db.query('SELECT id, state_json, payload_json FROM setting_entities WHERE project_id = ? ORDER BY id').all(projectId),
      usages: db.query('SELECT id, actual_state_change FROM chapter_setting_usage WHERE project_id = ? AND chapter_id = ? ORDER BY id').all(projectId, chapterId),
      chapter: db.query('SELECT raw_payload FROM chapters WHERE id = ? AND project_id = ?').get(chapterId, projectId),
      reviews: db.query('SELECT id, review_type, payload FROM reviews WHERE project_id = ? ORDER BY id').all(projectId),
    }
  } finally {
    db.close()
  }
}

function chapterRawPayloadWriteSnapshot(activeWorkspace: string, projectId: number, chapterId: number) {
  const db = openDb(activeWorkspace)
  try {
    return db.query(`
      SELECT raw_payload, updated_at
      FROM chapters
      WHERE id = ? AND project_id = ?
      LIMIT 1
    `).get(chapterId, projectId) as { raw_payload: string; updated_at: string } | null
  } finally {
    db.close()
  }
}

async function holdNovelMutationLock(activeWorkspace: string, operation: string) {
  let releaseLock!: () => void
  let lockAcquired!: () => void
  const acquired = new Promise<void>(resolve => { lockAcquired = resolve })
  const release = new Promise<void>(resolve => { releaseLock = resolve })
  setNovelMutationTestHook(async event => {
    if (event.operation !== operation || event.phase !== 'after_mutation_lock_acquired') return
    lockAcquired()
    await release
  })
  const holder = withNovelDbWrite(activeWorkspace, () => {}, operation)
  await acquired
  return {
    async release() {
      releaseLock()
      await holder
      setNovelMutationTestHook(null)
    },
  }
}

async function createClaimedReviewRun(
  workspacePath: string,
  projectId: number,
  owner: string,
) {
  const run = await createEditorRevisionRun(workspacePath, {
    projectId,
    chapterId: 7,
    inputRef: '{}',
    outputRef: JSON.stringify(initialCheckpoint()),
  })
  await claimEditorRevisionRun(workspacePath, { runId: run.id, owner, leaseMs: 60_000 })
  return run
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
    scope_key: `chapter:${input.chapter_id}`,
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
    releaseClaim: async (_workspace: string, release: any) => {
      const leaseExpiresAt = run.lease_expires_at ? new Date(run.lease_expires_at).getTime() : Number.NaN
      const now = new Date(release.now || '2030-01-01T00:00:01.000Z').getTime()
      if (run.lease_owner !== release.owner || !Number.isFinite(leaseExpiresAt) || leaseExpiresAt <= now) return false
      if (!['running', 'cancel_requested'].includes(run.status)) return false
      run.status = 'queued'
      run.lease_owner = null
      run.lease_expires_at = null
      events.push('release')
      return true
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
    terminalizeInvalidState: async (_workspace: string, terminal: any) => {
      checkpoint = clone(terminal.checkpoint)
      run.output_ref = JSON.stringify(checkpoint)
      if (run.cancel_requested_at) {
        const phase = checkpoint.phase
        checkpoint.phases[phase] = {
          ...checkpoint.phases[phase],
          status: 'canceled',
          completed_at: terminal.now,
        }
        delete checkpoint.error
        run.output_ref = JSON.stringify(checkpoint)
        run.status = 'canceled'
        run.error_message = ''
      } else {
        run.status = 'failed'
        run.error_message = terminal.errorCode
      }
      run.lease_owner = null
      run.lease_expires_at = null
      events.push(`terminal:${terminal.errorCode}`)
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

function completedCheckpoint(): EditorRevisionCheckpoint {
  const checkpoint = persistedCheckpoint()
  checkpoint.phase = 'completed'
  checkpoint.phases.post_quality = { status: 'completed', attempt: 1 }
  checkpoint.phases.sync_current_story_state = { status: 'skipped', attempt: 1 }
  checkpoint.phases.record_continuity_warning = { status: 'completed', attempt: 1 }
  checkpoint.phases.completed = { status: 'completed', attempt: 1 }
  checkpoint.completed_at = '2030-01-01T00:00:04.000Z'
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
  test.each([
    { label: 'malformed JSON', inputRef: '{' },
    {
      label: 'incomplete canonical object',
      inputRef: JSON.stringify({
        schema_version: 1,
        project_id: 4,
        chapter_id: 7,
        source_text_hash: revisionTextHash(sourceText),
      }),
    },
  ])('terminally fails claimed $label input without side effects', async ({ inputRef }) => {
    const harness = createHarness()
    harness.run.input_ref = inputRef
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.run.status).toBe('failed')
    expect(harness.run.error_message).toBe('REVISION_INPUT_INVALID')
    expect(harness.checkpoint().error?.code).toBe('REVISION_INPUT_INVALID')
    expect(harness.revisionCalls).toHaveLength(0)
    expect(harness.commitCalls()).toBe(0)
    expect(harness.qualityCalls).toHaveLength(0)
    expect(harness.prepareCalls).toHaveLength(0)
    expect(harness.applyCalls).toHaveLength(0)
    expect(harness.reviews).toHaveLength(0)
    expect(harness.chapter().chapter_text).toBe(sourceText)
  })

  test('terminally fails canonical input bound to another project without side effects', async () => {
    const harness = createHarness()
    harness.run.input_ref = JSON.stringify({
      ...harness.input,
      project_id: harness.run.project_id + 1,
    })
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.run.status).toBe('failed')
    expect(harness.run.error_message).toBe('REVISION_INPUT_INVALID')
    expect(harness.checkpoint().error?.code).toBe('REVISION_INPUT_INVALID')
    expect(harness.revisionCalls).toHaveLength(0)
    expect(harness.commitCalls()).toBe(0)
    expect(harness.reviews).toHaveLength(0)
    expect(harness.chapter().chapter_text).toBe(sourceText)
  })

  test('terminally fails canonical input bound to another chapter scope without side effects', async () => {
    const harness = createHarness()
    harness.run.input_ref = JSON.stringify({
      ...harness.input,
      chapter_id: harness.input.chapter_id + 1,
    })
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.run.status).toBe('failed')
    expect(harness.run.error_message).toBe('REVISION_INPUT_INVALID')
    expect(harness.checkpoint().error?.code).toBe('REVISION_INPUT_INVALID')
    expect(harness.revisionCalls).toHaveLength(0)
    expect(harness.commitCalls()).toBe(0)
    expect(harness.reviews).toHaveLength(0)
    expect(harness.chapter().chapter_text).toBe(sourceText)
  })

  test.each([
    {
      label: 'source hash',
      mutate: (input: ReturnType<typeof createHarness>['input']) => ({
        ...input,
        source_text_hash: revisionTextHash(`${input.source_text}changed`),
      }),
    },
    {
      label: 'source character count',
      mutate: (input: ReturnType<typeof createHarness>['input']) => ({
        ...input,
        source_char_count: input.source_char_count + 1,
      }),
    },
  ])('terminally fails canonical input with a mismatched $label without side effects', async ({ mutate }) => {
    const harness = createHarness()
    harness.run.input_ref = JSON.stringify(mutate(harness.input))
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.run.status).toBe('failed')
    expect(harness.run.error_message).toBe('REVISION_INPUT_INVALID')
    expect(harness.checkpoint().error?.code).toBe('REVISION_INPUT_INVALID')
    expect(harness.revisionCalls).toHaveLength(0)
    expect(harness.commitCalls()).toBe(0)
    expect(harness.qualityCalls).toHaveLength(0)
    expect(harness.prepareCalls).toHaveLength(0)
    expect(harness.applyCalls).toHaveLength(0)
    expect(harness.reviews).toHaveLength(0)
    expect(harness.chapter().chapter_text).toBe(sourceText)
  })

  test.each([
    { label: 'malformed JSON', outputRef: '{' },
    {
      label: 'noncanonical phase state',
      outputRef: JSON.stringify({
        ...initialCheckpoint(),
        phases: {
          ...initialCheckpoint().phases,
          generate_candidate: { status: 'unknown', attempt: 0 },
        },
      }),
    },
  ])('terminally fails a corrupt claimed checkpoint with $label without side effects', async ({ outputRef }) => {
    const harness = createHarness()
    harness.run.output_ref = outputRef
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.run.status).toBe('failed')
    expect(harness.run.error_message).toBe('REVISION_CHECKPOINT_INVALID')
    expect(harness.checkpoint().error?.code).toBe('REVISION_CHECKPOINT_INVALID')
    expect(harness.revisionCalls).toHaveLength(0)
    expect(harness.commitCalls()).toBe(0)
    expect(harness.qualityCalls).toHaveLength(0)
    expect(harness.prepareCalls).toHaveLength(0)
    expect(harness.applyCalls).toHaveLength(0)
    expect(harness.reviews).toHaveLength(0)
    expect(harness.chapter().chapter_text).toBe(sourceText)
  })

  test.each([
    {
      label: 'persisted prose without an admitted candidate',
      checkpoint: { ...initialCheckpoint(), prose_persisted: true },
    },
    {
      label: 'a post-quality phase with pending predecessors',
      checkpoint: { ...initialCheckpoint(), phase: 'post_quality' as const },
    },
  ])('real worker terminally fails $label after claim', async ({ checkpoint }) => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: 'incoherent claimed checkpoint' })
    const chapter = await createNovelChapter(activeWorkspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: sourceText,
    })
    const run = await createEditorRevisionRun(activeWorkspace, {
      projectId: project.id,
      chapterId: chapter.id,
      inputRef: JSON.stringify(canonicalRunInput(project.id, chapter)),
      outputRef: JSON.stringify(initialCheckpoint()),
    })
    const worker = createEditorRevisionWorker({
      getWorkspace: () => activeWorkspace,
      getProject: async () => project,
    } as any, {
      claimRun: async (workspacePath, input) => {
        const claimed = await claimEditorRevisionRun(workspacePath, input)
        if (claimed) {
          runDbMutation(workspacePath, 'UPDATE runs SET output_ref = ? WHERE id = ?', JSON.stringify(checkpoint), claimed.id)
        }
        return claimed
      },
    })

    await worker.start(activeWorkspace)
    await worker.waitForIdle()

    const failed = await getEditorRevisionRun(activeWorkspace, project.id, run.id)
    const terminalCheckpoint = parsed(failed?.output_ref)
    expect(failed).toMatchObject({
      status: 'failed',
      error_message: 'REVISION_CHECKPOINT_INVALID',
      lease_owner: null,
      lease_expires_at: null,
    })
    expect(terminalCheckpoint.error?.code).toBe('REVISION_CHECKPOINT_INVALID')
    expect(terminalCheckpoint.phases.generate_candidate.status).toBe('failed')
    expect(await listNovelReviews(activeWorkspace, project.id)).toHaveLength(0)
  })

  test.each([
    {
      label: 'an already failed current phase',
      checkpoint: () => {
        const checkpoint = initialCheckpoint()
        checkpoint.phases.generate_candidate = { status: 'failed', attempt: 1 }
        checkpoint.error = { code: 'OLD_FAILURE', message: 'old failure' }
        return checkpoint
      },
    },
    {
      label: 'an already canceled current phase',
      checkpoint: () => {
        const checkpoint = initialCheckpoint()
        checkpoint.phases.generate_candidate = { status: 'canceled', attempt: 1 }
        return checkpoint
      },
    },
    {
      label: 'a completed checkpoint on an active row',
      checkpoint: completedCheckpoint,
    },
  ])('real worker terminalizes $label without automatic orchestration', async ({ checkpoint: buildCheckpoint }) => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: 'active checkpoint context' })
    const chapter = await createNovelChapter(activeWorkspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: sourceText,
    })
    const run = await createEditorRevisionRun(activeWorkspace, {
      projectId: project.id,
      chapterId: chapter.id,
      inputRef: JSON.stringify(canonicalRunInput(project.id, chapter)),
      outputRef: JSON.stringify(initialCheckpoint()),
    })
    let orchestrationCalls = 0
    const checkpoint = buildCheckpoint()
    const worker = createEditorRevisionWorker({
      getWorkspace: () => activeWorkspace,
      getProject: async () => project,
    } as any, {
      claimRun: async (workspacePath, input) => {
        const claimed = await claimEditorRevisionRun(workspacePath, input)
        if (claimed) {
          runDbMutation(workspacePath, 'UPDATE runs SET output_ref = ? WHERE id = ?', JSON.stringify(checkpoint), claimed.id)
        }
        return claimed
      },
      executeRevision: async () => {
        orchestrationCalls += 1
        throw errorWithCode('UNEXPECTED_ORCHESTRATION')
      },
    })

    await worker.start(activeWorkspace)
    await worker.waitForIdle()

    const failed = await getEditorRevisionRun(activeWorkspace, project.id, run.id)
    expect(failed).toMatchObject({
      status: 'failed',
      error_message: 'REVISION_CHECKPOINT_INVALID',
      lease_owner: null,
      lease_expires_at: null,
    })
    expect(parsed(failed?.output_ref).error?.code).toBe('REVISION_CHECKPOINT_INVALID')
    expect(orchestrationCalls).toBe(0)
  })

  test('default invalid-state terminalizer atomically fails a claimed malformed run', async () => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: 'invalid-state terminalization' })
    const run = await createEditorRevisionRun(activeWorkspace, {
      projectId: project.id,
      chapterId: 7,
      inputRef: '{}',
      outputRef: JSON.stringify(initialCheckpoint()),
    })
    runDbMutation(activeWorkspace, 'UPDATE runs SET input_ref = ? WHERE id = ?', '{', run.id)
    const worker = createEditorRevisionWorker({
      getWorkspace: () => activeWorkspace,
      getProject: async () => project,
    } as any)

    await worker.start(activeWorkspace)
    await worker.waitForIdle()

    const failed = await getEditorRevisionRun(activeWorkspace, project.id, run.id)
    expect(failed).toMatchObject({
      status: 'failed',
      error_message: 'REVISION_INPUT_INVALID',
      lease_owner: null,
      lease_expires_at: null,
    })
    expect(parsed(failed?.output_ref).error?.code).toBe('REVISION_INPUT_INVALID')
    expect(parsed(failed?.output_ref).phases.generate_candidate.status).toBe('failed')
  })

  test('default invalid-state terminalizer honors cancellation for malformed claimed input', async () => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: 'invalid-state cancellation' })
    const run = await createEditorRevisionRun(activeWorkspace, {
      projectId: project.id,
      chapterId: 7,
      inputRef: '{}',
      outputRef: JSON.stringify(initialCheckpoint()),
    })
    await requestEditorRevisionCancel(activeWorkspace, project.id, run.id)
    const worker = createEditorRevisionWorker({
      getWorkspace: () => activeWorkspace,
      getProject: async () => project,
    } as any)

    await worker.start(activeWorkspace)
    await worker.waitForIdle()

    const canceled = await getEditorRevisionRun(activeWorkspace, project.id, run.id)
    expect(canceled).toMatchObject({
      status: 'canceled',
      error_message: '',
      lease_owner: null,
      lease_expires_at: null,
    })
    expect(parsed(canceled?.output_ref).error).toBeUndefined()
    expect(parsed(canceled?.output_ref).phases.generate_candidate.status).toBe('canceled')
  })

  test('real invalid-state terminalizer honors cancellation immediately after lease claim', async () => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: 'claimed invalid-state cancellation' })
    const chapter = await createNovelChapter(activeWorkspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: sourceText,
    })
    const run = await createEditorRevisionRun(activeWorkspace, {
      projectId: project.id,
      chapterId: chapter.id,
      inputRef: JSON.stringify(canonicalRunInput(project.id, chapter)),
      outputRef: JSON.stringify(initialCheckpoint()),
    })
    runDbMutation(activeWorkspace, 'UPDATE runs SET input_ref = ? WHERE id = ?', '{', run.id)
    const worker = createEditorRevisionWorker({
      getWorkspace: () => activeWorkspace,
      getProject: async () => project,
    } as any, {
      claimRun: async (workspacePath, input) => {
        const claimed = await claimEditorRevisionRun(workspacePath, input)
        if (claimed) await requestEditorRevisionCancel(workspacePath, project.id, claimed.id)
        return claimed
      },
    })

    await worker.start(activeWorkspace)
    await worker.waitForIdle()

    const canceled = await getEditorRevisionRun(activeWorkspace, project.id, run.id)
    expect(canceled).toMatchObject({
      status: 'canceled',
      error_message: '',
      lease_owner: null,
      lease_expires_at: null,
    })
    expect(parsed(canceled?.output_ref).error).toBeUndefined()
    expect(parsed(canceled?.output_ref).phases.generate_candidate.status).toBe('canceled')
  })

  test('real cancellation of a corrupt checkpoint preserves matching live commit evidence', async () => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: 'claimed corrupt-state cancellation' })
    const chapter = await createNovelChapter(activeWorkspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: sourceText,
    })
    const input = canonicalRunInput(project.id, chapter)
    const run = await createEditorRevisionRun(activeWorkspace, {
      projectId: project.id,
      chapterId: chapter.id,
      inputRef: JSON.stringify(input),
      outputRef: JSON.stringify(initialCheckpoint()),
    })
    const candidateHash = revisionTextHash(candidateText)
    const committedAt = '2030-01-01T00:00:03.000Z'
    runDbMutation(
      activeWorkspace,
      'UPDATE chapters SET chapter_text = ?, raw_payload = ?, updated_at = ? WHERE id = ? AND project_id = ?',
      candidateText,
      JSON.stringify({
        editor_revision_commit: {
          run_id: run.id,
          source_hash: input.source_text_hash,
          candidate_hash: candidateHash,
          committed_at: committedAt,
        },
      }),
      committedAt,
      chapter.id,
      project.id,
    )
    const receipt = await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'editor_revision',
      payload: JSON.stringify({
        source_run_id: run.id,
        chapter_id: chapter.id,
        candidate_hash: candidateHash,
      }),
    })
    const worker = createEditorRevisionWorker({
      getWorkspace: () => activeWorkspace,
      getProject: async () => project,
    } as any, {
      claimRun: async (workspacePath, claimInput) => {
        const claimed = await claimEditorRevisionRun(workspacePath, claimInput)
        if (claimed) {
          runDbMutation(workspacePath, 'UPDATE runs SET output_ref = ? WHERE id = ?', '{', claimed.id)
          await requestEditorRevisionCancel(workspacePath, project.id, claimed.id)
        }
        return claimed
      },
    })

    await worker.start(activeWorkspace)
    await worker.waitForIdle()

    const canceled = await getEditorRevisionRun(activeWorkspace, project.id, run.id)
    const checkpoint = parsed(canceled?.output_ref)
    expect(canceled).toMatchObject({
      status: 'canceled',
      error_message: '',
      lease_owner: null,
      lease_expires_at: null,
    })
    expect(checkpoint.error).toBeUndefined()
    expect(checkpoint.prose_persisted).toBe(true)
    expect(checkpoint.candidate).toMatchObject({ text: candidateText, hash: candidateHash })
    expect(checkpoint.phases.persist_chapter.status).toBe('completed')
    expect(checkpoint.phases.post_quality.status).toBe('canceled')
    expect(checkpoint.committed_chapter_updated_at).toBe(committedAt)
    expect(checkpoint.editor_revision_review_id).toBe(receipt.id)
  })

  test('invalid-state cancellation preserves a completed persist boundary and cancels the first post phase', async () => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: 'completed persist cancellation' })
    const chapter = await createNovelChapter(activeWorkspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: sourceText,
    })
    const run = await createEditorRevisionRun(activeWorkspace, {
      projectId: project.id,
      chapterId: chapter.id,
      inputRef: '{}',
      outputRef: JSON.stringify(initialCheckpoint()),
    })
    const committed = persistedCheckpoint()
    committed.phase = 'persist_chapter'
    const worker = createEditorRevisionWorker({
      getWorkspace: () => activeWorkspace,
      getProject: async () => project,
    } as any, {
      claimRun: async (workspacePath, input) => {
        const claimed = await claimEditorRevisionRun(workspacePath, input)
        if (claimed) {
          runDbMutation(workspacePath, 'UPDATE runs SET output_ref = ? WHERE id = ?', JSON.stringify(committed), claimed.id)
          await requestEditorRevisionCancel(workspacePath, project.id, claimed.id)
        }
        return claimed
      },
    })

    await worker.start(activeWorkspace)
    await worker.waitForIdle()

    const canceled = await getEditorRevisionRun(activeWorkspace, project.id, run.id)
    const checkpoint = parsed(canceled?.output_ref)
    expect(canceled).toMatchObject({
      status: 'canceled',
      error_message: '',
      lease_owner: null,
      lease_expires_at: null,
    })
    expect(checkpoint).toMatchObject({
      phase: 'post_quality',
      prose_persisted: true,
      candidate: { hash: revisionTextHash(candidateText) },
      committed_chapter_updated_at: committed.committed_chapter_updated_at,
      editor_revision_review_id: committed.editor_revision_review_id,
      phases: {
        persist_chapter: { status: 'completed' },
        post_quality: { status: 'canceled' },
        sync_current_story_state: { status: 'pending' },
      },
    })
    expect(checkpoint.error).toBeUndefined()
  })

  test('real invalid-state terminalizer cannot overwrite a taken-over lease', async () => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: 'invalid-state lease takeover' })
    const chapter = await createNovelChapter(activeWorkspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: sourceText,
    })
    const run = await createEditorRevisionRun(activeWorkspace, {
      projectId: project.id,
      chapterId: chapter.id,
      inputRef: JSON.stringify(canonicalRunInput(project.id, chapter)),
      outputRef: JSON.stringify(initialCheckpoint()),
    })
    runDbMutation(activeWorkspace, 'UPDATE runs SET input_ref = ? WHERE id = ?', '{', run.id)
    const worker = createEditorRevisionWorker({
      getWorkspace: () => activeWorkspace,
      getProject: async () => project,
    } as any, {
      claimRun: async (workspacePath, input) => {
        const claimed = await claimEditorRevisionRun(workspacePath, input)
        if (claimed) runDbMutation(workspacePath, 'UPDATE runs SET lease_owner = ? WHERE id = ?', 'worker-takeover', claimed.id)
        return claimed
      },
    })

    await worker.start(activeWorkspace)
    await worker.waitForIdle()

    const owned = await getEditorRevisionRun(activeWorkspace, project.id, run.id)
    expect(owned).toMatchObject({
      status: 'running',
      lease_owner: 'worker-takeover',
    })
    expect(parsed(owned?.output_ref)).toEqual(initialCheckpoint())
  })

  test('real worker terminalizes cancellation persisted immediately before the chapter commit fence', async () => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: 'chapter commit fence cancellation' })
    const chapter = await createNovelChapter(activeWorkspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: sourceText,
    })
    const run = await createEditorRevisionRun(activeWorkspace, {
      projectId: project.id,
      chapterId: chapter.id,
      inputRef: JSON.stringify({
        ...canonicalRunInput(project.id, chapter),
        auto_quality_check: false,
        auto_story_state: false,
      }),
      outputRef: JSON.stringify(admittedCheckpoint()),
    })
    const worker = createEditorRevisionWorker({
      getWorkspace: () => activeWorkspace,
      getProject: async () => project,
    } as any, {
      executeRevision: async () => { throw errorWithCode('UNEXPECTED_ORCHESTRATION') },
      commitChapter: (workspacePath, commitInput) => cancelBeforeFencedMutation(
        workspacePath,
        run.id,
        'worker-chapter-commit-cancel-holder',
        () => commitEditorRevisionChapter(workspacePath, commitInput),
      ),
    })

    await worker.start(activeWorkspace)
    await worker.waitForIdle()

    const canceled = await getEditorRevisionRun(activeWorkspace, project.id, run.id)
    const checkpoint = parsed(canceled?.output_ref)
    expect(canceled).toMatchObject({
      status: 'canceled',
      error_message: '',
      lease_owner: null,
      lease_expires_at: null,
    })
    expect(checkpoint.phases.persist_chapter.status).toBe('canceled')
    expect(() => requireCoherentEditorRevisionCheckpoint(checkpoint, { runStatus: 'canceled' })).not.toThrow()
    expect(await listChapterVersions(activeWorkspace, chapter.id)).toHaveLength(0)
    expect(await listNovelReviews(activeWorkspace, project.id)).toHaveLength(0)
    expect((await getNovelChapter(activeWorkspace, chapter.id, project.id))?.chapter_text).toBe(sourceText)
  })

  test('real worker preserves a successful chapter commit when cancellation reaches its checkpoint fence', async () => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: 'successful commit checkpoint cancellation' })
    const chapter = await createNovelChapter(activeWorkspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: sourceText,
    })
    const input = {
      ...canonicalRunInput(project.id, chapter),
      auto_quality_check: false,
      auto_story_state: false,
    }
    const run = await createEditorRevisionRun(activeWorkspace, {
      projectId: project.id,
      chapterId: chapter.id,
      inputRef: JSON.stringify(input),
      outputRef: JSON.stringify(admittedCheckpoint()),
    })
    let fenced = false
    const worker = createEditorRevisionWorker({
      getWorkspace: () => activeWorkspace,
      getProject: async () => project,
    } as any, {
      executeRevision: async () => { throw errorWithCode('UNEXPECTED_ORCHESTRATION') },
      writeCheckpoint: (workspacePath, checkpointInput) => {
        if (!fenced
          && checkpointInput.phase === 'persist_chapter'
          && checkpointInput.checkpoint.prose_persisted) {
          fenced = true
          return cancelBeforeFencedMutation(
            workspacePath,
            run.id,
            'worker-successful-commit-checkpoint-cancel-holder',
            () => writeEditorRevisionCheckpoint(workspacePath, checkpointInput),
          )
        }
        return writeEditorRevisionCheckpoint(workspacePath, checkpointInput)
      },
    })

    await worker.start(activeWorkspace)
    await worker.waitForIdle()

    const canceled = await getEditorRevisionRun(activeWorkspace, project.id, run.id)
    const checkpoint = parsed(canceled?.output_ref)
    const committedChapter = await getNovelChapter(activeWorkspace, chapter.id, project.id)
    const reviews = await listNovelReviews(activeWorkspace, project.id)
    const revisionReviews = reviews.filter(review => review.review_type === 'editor_revision')
    expect(fenced).toBe(true)
    expect(canceled).toMatchObject({
      status: 'canceled',
      error_message: '',
      lease_owner: null,
      lease_expires_at: null,
    })
    expect(checkpoint).toMatchObject({
      prose_persisted: true,
      candidate: { text: candidateText, hash: revisionTextHash(candidateText) },
      committed_chapter_updated_at: committedChapter?.updated_at,
      editor_revision_review_id: revisionReviews[0]?.id,
      phases: { persist_chapter: { status: 'completed' } },
    })
    expect(() => requireCoherentEditorRevisionCheckpoint(checkpoint, { runStatus: 'canceled' })).not.toThrow()
    expect(await listChapterVersions(activeWorkspace, chapter.id)).toHaveLength(1)
    expect(revisionReviews).toHaveLength(1)
    expect(committedChapter?.chapter_text).toBe(candidateText)
  })

  test('real worker preserves prepared Story State when cancellation reaches its checkpoint fence', async () => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: 'prepared Story State checkpoint cancellation' })
    const chapter = await createNovelChapter(activeWorkspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: sourceText,
    })
    const input = {
      ...canonicalRunInput(project.id, chapter),
      auto_quality_check: false,
      auto_story_state: true,
    }
    const run = await createEditorRevisionRun(activeWorkspace, {
      projectId: project.id,
      chapterId: chapter.id,
      inputRef: JSON.stringify(input),
      outputRef: JSON.stringify(initialCheckpoint()),
    })
    const evidence = await installCommitEvidence(
      activeWorkspace,
      project.id,
      chapter.id,
      run.id,
      input.source_text_hash,
    )
    const startingCheckpoint = persistedCheckpoint()
    startingCheckpoint.phase = 'sync_current_story_state'
    startingCheckpoint.phases.post_quality = { status: 'skipped', attempt: 1 }
    startingCheckpoint.committed_chapter_updated_at = evidence.committedAt
    startingCheckpoint.editor_revision_review_id = evidence.receipt.id
    runDbMutation(activeWorkspace, 'UPDATE runs SET output_ref = ? WHERE id = ?', JSON.stringify(startingCheckpoint), run.id)
    let fenced = false
    let prepareCalls = 0
    let applyCalls = 0
    const worker = createEditorRevisionWorker({
      getWorkspace: () => activeWorkspace,
      getProject: async () => project,
    } as any, {
      executeRevision: async () => { throw errorWithCode('UNEXPECTED_ORCHESTRATION') },
      prepareStoryState: async () => {
        prepareCalls += 1
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
          },
        }
      },
      applyStoryState: async () => {
        applyCalls += 1
        throw errorWithCode('UNEXPECTED_STORY_STATE_APPLY')
      },
      writeCheckpoint: (workspacePath, checkpointInput) => {
        if (!fenced
          && checkpointInput.phase === 'sync_current_story_state'
          && checkpointInput.checkpoint.story_state?.status === 'prepared') {
          fenced = true
          return cancelBeforeFencedMutation(
            workspacePath,
            run.id,
            'worker-prepared-story-state-checkpoint-cancel-holder',
            () => writeEditorRevisionCheckpoint(workspacePath, checkpointInput),
          )
        }
        return writeEditorRevisionCheckpoint(workspacePath, checkpointInput)
      },
    })

    await worker.start(activeWorkspace)
    await worker.waitForIdle()

    const canceled = await getEditorRevisionRun(activeWorkspace, project.id, run.id)
    const checkpoint = parsed(canceled?.output_ref)
    expect(fenced).toBe(true)
    expect(canceled).toMatchObject({
      status: 'canceled',
      error_message: '',
      lease_owner: null,
      lease_expires_at: null,
    })
    expect(checkpoint).toMatchObject({
      phase: 'sync_current_story_state',
      phases: { sync_current_story_state: { status: 'canceled' } },
      story_state: {
        status: 'prepared',
        prepared: { state_delta: { current_time: 'night' } },
        receipt: {
          source_run_id: run.id,
          candidate_hash: evidence.candidateHash,
          chapter_id: chapter.id,
        },
      },
    })
    expect(() => requireCoherentEditorRevisionCheckpoint(checkpoint, { runStatus: 'canceled' })).not.toThrow()
    expect(prepareCalls).toBe(1)
    expect(applyCalls).toBe(0)
  })

  test('real worker preserves matching commit evidence when cancellation reaches the replay fence', async () => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: 'commit replay fence cancellation' })
    const chapter = await createNovelChapter(activeWorkspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: sourceText,
    })
    const input = canonicalRunInput(project.id, chapter)
    const run = await createEditorRevisionRun(activeWorkspace, {
      projectId: project.id,
      chapterId: chapter.id,
      inputRef: JSON.stringify(input),
      outputRef: JSON.stringify(admittedCheckpoint('running')),
    })
    const evidence = await installCommitEvidence(
      activeWorkspace,
      project.id,
      chapter.id,
      run.id,
      input.source_text_hash,
    )
    const worker = createEditorRevisionWorker({
      getWorkspace: () => activeWorkspace,
      getProject: async () => project,
    } as any, {
      executeRevision: async () => { throw errorWithCode('UNEXPECTED_ORCHESTRATION') },
      commitChapter: (workspacePath, commitInput) => cancelBeforeFencedMutation(
        workspacePath,
        run.id,
        'worker-commit-replay-cancel-holder',
        () => commitEditorRevisionChapter(workspacePath, commitInput),
      ),
    })

    await worker.start(activeWorkspace)
    await worker.waitForIdle()

    const canceled = await getEditorRevisionRun(activeWorkspace, project.id, run.id)
    const checkpoint = parsed(canceled?.output_ref)
    expect(canceled).toMatchObject({
      status: 'canceled',
      error_message: '',
      lease_owner: null,
      lease_expires_at: null,
    })
    expect(checkpoint).toMatchObject({
      prose_persisted: true,
      candidate: { text: candidateText, hash: evidence.candidateHash },
      committed_chapter_updated_at: evidence.committedAt,
      editor_revision_review_id: evidence.receipt.id,
      phases: { persist_chapter: { status: 'completed' } },
    })
    expect(() => requireCoherentEditorRevisionCheckpoint(checkpoint, { runStatus: 'canceled' })).not.toThrow()
    expect(await listChapterVersions(activeWorkspace, chapter.id)).toHaveLength(0)
    const reviews = await listNovelReviews(activeWorkspace, project.id)
    expect(reviews.filter(review => review.review_type === 'editor_revision')).toHaveLength(1)
  })

  test('real worker preserves matching commit evidence when cancellation reaches the recovery checkpoint fence', async () => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: 'recovery checkpoint fence cancellation' })
    const chapter = await createNovelChapter(activeWorkspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: sourceText,
    })
    const input = canonicalRunInput(project.id, chapter)
    const run = await createEditorRevisionRun(activeWorkspace, {
      projectId: project.id,
      chapterId: chapter.id,
      inputRef: JSON.stringify(input),
      outputRef: JSON.stringify(admittedCheckpoint('running')),
    })
    const evidence = await installCommitEvidence(
      activeWorkspace,
      project.id,
      chapter.id,
      run.id,
      input.source_text_hash,
    )
    let fenced = false
    const worker = createEditorRevisionWorker({
      getWorkspace: () => activeWorkspace,
      getProject: async () => project,
    } as any, {
      executeRevision: async () => { throw errorWithCode('UNEXPECTED_ORCHESTRATION') },
      writeCheckpoint: (workspacePath, checkpointInput) => {
        if (!fenced
          && checkpointInput.phase === 'persist_chapter'
          && checkpointInput.checkpoint.prose_persisted) {
          fenced = true
          return cancelBeforeFencedMutation(
            workspacePath,
            run.id,
            'worker-recovery-checkpoint-cancel-holder',
            () => writeEditorRevisionCheckpoint(workspacePath, checkpointInput),
          )
        }
        return writeEditorRevisionCheckpoint(workspacePath, checkpointInput)
      },
    })

    await worker.start(activeWorkspace)
    await worker.waitForIdle()

    const canceled = await getEditorRevisionRun(activeWorkspace, project.id, run.id)
    const checkpoint = parsed(canceled?.output_ref)
    expect(fenced).toBe(true)
    expect(canceled).toMatchObject({
      status: 'canceled',
      error_message: '',
      lease_owner: null,
      lease_expires_at: null,
    })
    expect(checkpoint).toMatchObject({
      prose_persisted: true,
      candidate: { text: candidateText, hash: evidence.candidateHash },
      committed_chapter_updated_at: evidence.committedAt,
      editor_revision_review_id: evidence.receipt.id,
      phases: { persist_chapter: { status: 'completed' } },
    })
    expect(() => requireCoherentEditorRevisionCheckpoint(checkpoint, { runStatus: 'canceled' })).not.toThrow()
    expect(await listChapterVersions(activeWorkspace, chapter.id)).toHaveLength(0)
  })

  test('real worker terminalizes cancellation persisted immediately before a deterministic review fence', async () => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: 'deterministic review fence cancellation' })
    const chapter = await createNovelChapter(activeWorkspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: sourceText,
    })
    const input = {
      ...canonicalRunInput(project.id, chapter),
      auto_quality_check: false,
      auto_story_state: false,
    }
    const run = await createEditorRevisionRun(activeWorkspace, {
      projectId: project.id,
      chapterId: chapter.id,
      inputRef: JSON.stringify(input),
      outputRef: JSON.stringify(initialCheckpoint()),
    })
    const evidence = await installCommitEvidence(
      activeWorkspace,
      project.id,
      chapter.id,
      run.id,
      input.source_text_hash,
    )
    const checkpoint = persistedCheckpoint()
    checkpoint.phase = 'record_continuity_warning'
    checkpoint.phases.post_quality = { status: 'skipped', attempt: 1 }
    checkpoint.phases.sync_current_story_state = { status: 'skipped', attempt: 1 }
    checkpoint.committed_chapter_updated_at = evidence.committedAt
    checkpoint.editor_revision_review_id = evidence.receipt.id
    runDbMutation(activeWorkspace, 'UPDATE runs SET output_ref = ? WHERE id = ?', JSON.stringify(checkpoint), run.id)
    const worker = createEditorRevisionWorker({
      getWorkspace: () => activeWorkspace,
      getProject: async () => project,
    } as any, {
      executeRevision: async () => { throw errorWithCode('UNEXPECTED_ORCHESTRATION') },
      findOrCreateReview: (workspacePath, reviewInput) => cancelBeforeFencedMutation(
        workspacePath,
        run.id,
        'worker-deterministic-review-cancel-holder',
        () => findOrCreateEditorRevisionReview(workspacePath, reviewInput),
      ),
    })

    await worker.start(activeWorkspace)
    await worker.waitForIdle()

    const canceled = await getEditorRevisionRun(activeWorkspace, project.id, run.id)
    const canceledCheckpoint = parsed(canceled?.output_ref)
    expect(canceled).toMatchObject({
      status: 'canceled',
      error_message: '',
      lease_owner: null,
      lease_expires_at: null,
    })
    expect(canceledCheckpoint.phases.record_continuity_warning.status).toBe('canceled')
    expect(() => requireCoherentEditorRevisionCheckpoint(canceledCheckpoint, { runStatus: 'canceled' })).not.toThrow()
    const reviews = await listNovelReviews(activeWorkspace, project.id)
    expect(reviews.filter(review => review.review_type === 'editor_revision')).toHaveLength(1)
    expect(reviews.filter(review => review.review_type === 'delivery_risk_convergence')).toHaveLength(0)
  })

  test.each([
    { label: 'a canonical persist checkpoint', checkpointRef: () => JSON.stringify(admittedCheckpoint('running')) },
    { label: 'malformed checkpoint JSON', checkpointRef: () => '{' },
    {
      label: 'a semantically incoherent checkpoint',
      checkpointRef: () => JSON.stringify({ ...initialCheckpoint(), prose_persisted: true }),
    },
  ])('restart cancellation reconstructs matching commit evidence from $label', async ({ checkpointRef }) => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: 'restart commit reconciliation' })
    const chapter = await createNovelChapter(activeWorkspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: sourceText,
    })
    const input = canonicalRunInput(project.id, chapter)
    const run = await createEditorRevisionRun(activeWorkspace, {
      projectId: project.id,
      chapterId: chapter.id,
      inputRef: JSON.stringify(input),
      outputRef: JSON.stringify(initialCheckpoint()),
    })
    await claimEditorRevisionRun(activeWorkspace, {
      runId: run.id,
      owner: 'crashed-worker',
      now: '2000-01-01T00:00:00.000Z',
      leaseMs: 1_000,
    })
    const evidence = await installCommitEvidence(
      activeWorkspace,
      project.id,
      chapter.id,
      run.id,
      input.source_text_hash,
    )
    runDbMutation(activeWorkspace, 'UPDATE runs SET output_ref = ? WHERE id = ?', checkpointRef(), run.id)
    await requestEditorRevisionCancel(activeWorkspace, project.id, run.id)
    const worker = createEditorRevisionWorker({
      getWorkspace: () => activeWorkspace,
      getProject: async () => project,
    } as any, {
      executeRevision: async () => { throw errorWithCode('UNEXPECTED_ORCHESTRATION') },
    })

    await worker.start(activeWorkspace)
    await worker.waitForIdle()

    const canceled = await getEditorRevisionRun(activeWorkspace, project.id, run.id)
    const checkpoint = parsed(canceled?.output_ref)
    expect(canceled).toMatchObject({
      status: 'canceled',
      error_message: '',
      lease_owner: null,
      lease_expires_at: null,
    })
    expect(checkpoint).toMatchObject({
      prose_persisted: true,
      candidate: { text: candidateText, hash: evidence.candidateHash },
      committed_chapter_updated_at: evidence.committedAt,
      editor_revision_review_id: evidence.receipt.id,
      phases: { persist_chapter: { status: 'completed' } },
    })
    expect(() => requireCoherentEditorRevisionCheckpoint(checkpoint, { runStatus: 'canceled' })).not.toThrow()
    expect(await listChapterVersions(activeWorkspace, chapter.id)).toHaveLength(0)
    const reviews = await listNovelReviews(activeWorkspace, project.id)
    expect(reviews.filter(review => review.review_type === 'editor_revision')).toHaveLength(1)
  })

  test('automatically rescans a live startup lease after expiry without enqueueing or regenerating', async () => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: 'lease expiry recovery' })
    const chapter = await createNovelChapter(activeWorkspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: sourceText,
    })
    const input = {
      ...canonicalRunInput(project.id, chapter),
      auto_quality_check: false,
      auto_story_state: false,
    }
    const run = await createEditorRevisionRun(activeWorkspace, {
      projectId: project.id,
      chapterId: chapter.id,
      inputRef: JSON.stringify(input),
      outputRef: JSON.stringify(initialCheckpoint()),
    })
    await claimEditorRevisionRun(activeWorkspace, {
      runId: run.id,
      owner: 'crashed-worker',
      now: '2030-01-01T00:00:00.000Z',
      leaseMs: 30_000,
    })
    let clock = '2030-01-01T00:00:10.000Z'
    const timers: Array<{ callback: () => any; ms: number; cleared: boolean }> = []
    let revisionCalls = 0
    const worker = createEditorRevisionWorker({
      getWorkspace: () => activeWorkspace,
      getProject: async () => project,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
    } as any, {
      now: () => clock,
      recoverRuns: (workspacePath) => recoverEditorRevisionRuns(workspacePath, clock),
      claimRun: (workspacePath, claim) => claimEditorRevisionRun(workspacePath, { ...claim, now: clock }),
      executeRevision: async () => {
        revisionCalls += 1
        return completeResult()
      },
      setTimeout: (callback, ms) => {
        const timer = { callback, ms, cleared: false }
        timers.push(timer)
        return timer
      },
      clearTimeout: timer => { timer.cleared = true },
    })

    await worker.start(activeWorkspace)
    await worker.waitForIdle()

    expect(revisionCalls).toBe(0)
    expect((await getEditorRevisionRun(activeWorkspace, project.id, run.id))?.lease_owner).toBe('crashed-worker')
    const recoveryTimer = timers.find(timer => timer.ms < 30_000 && !timer.cleared)
    expect(recoveryTimer).toBeDefined()

    clock = '2030-01-01T00:00:31.000Z'
    await recoveryTimer!.callback()
    await worker.waitForIdle()

    expect(revisionCalls).toBe(1)
    expect((await getEditorRevisionRun(activeWorkspace, project.id, run.id))?.status).toBe('completed')
    const nextRecoveryTimer = timers.find(timer => timer !== recoveryTimer && timer.ms < 30_000 && !timer.cleared)
    expect(nextRecoveryTimer).toBeDefined()

    await worker.stop()
    expect(nextRecoveryTimer!.cleared).toBe(true)
  })

  test('does not enqueue recovery results that arrive after the worker stops', async () => {
    const harness = createHarness({ autoQuality: false, autoStoryState: false })
    let recoverCalls = 0
    let recoveryEntered!: () => void
    let releaseRecovery!: (value: { queued: number[]; failedLegacy: number[] }) => void
    const entered = new Promise<void>(resolve => { recoveryEntered = resolve })
    const pendingRecovery = new Promise<{ queued: number[]; failedLegacy: number[] }>(resolve => {
      releaseRecovery = resolve
    })
    const worker = harness.worker({
      recoverRuns: async () => {
        recoverCalls += 1
        if (recoverCalls === 1) return { queued: [], failedLegacy: [] }
        recoveryEntered()
        return pendingRecovery
      },
    })

    await worker.start(workspace)
    const recoveryTimer = harness.timeoutRegistrations.find(timer => !timer.cleared)
    expect(recoveryTimer).toBeDefined()
    const recovery = recoveryTimer!.callback()
    await entered

    await worker.stop()
    releaseRecovery({ queued: [harness.run.id], failedLegacy: [] })
    await recovery

    let idle = false
    void worker.waitForIdle().then(() => { idle = true })
    await eventually(() => idle, 'stopped worker retained a recovered run in its idle queue')
    expect(harness.revisionCalls).toHaveLength(0)
    expect(harness.run.status).toBe('queued')
    expect(harness.timeoutRegistrations.filter(timer => timer !== recoveryTimer && !timer.cleared)).toHaveLength(0)
  })

  test('stop while claim is in flight requeues the claim without starting any mutation', async () => {
    const harness = createHarness()
    let claimEntered!: () => void
    let releaseClaim!: () => void
    const entered = new Promise<void>(resolve => { claimEntered = resolve })
    const claimGate = new Promise<void>(resolve => { releaseClaim = resolve })
    const worker = harness.worker({
      claimRun: async (_workspace: string, claim: any) => {
        claimEntered()
        await claimGate
        harness.run.status = 'running'
        harness.run.lease_owner = claim.owner
        harness.run.lease_expires_at = '2099-01-01T00:00:00.000Z'
        harness.events.push('claim')
        return clone(harness.run)
      },
    })

    await worker.start(workspace)
    await entered
    const stopping = worker.stop()
    releaseClaim()
    await stopping

    expect(harness.run.status).toBe('queued')
    expect(harness.run.lease_owner).toBeNull()
    expect(harness.run.lease_expires_at).toBeNull()
    expect(harness.revisionCalls).toHaveLength(0)
    expect(harness.writes).toHaveLength(0)
    expect(harness.commitCalls()).toBe(0)
    expect(harness.versionWrites()).toBe(0)
    expect(harness.qualityCalls).toHaveLength(0)
    expect(harness.prepareCalls).toHaveLength(0)
    expect(harness.applyCalls).toHaveLength(0)
    expect(harness.reviews).toHaveLength(0)
  })

  test('retries a transient claim failure without requiring recovery to rediscover the run', async () => {
    const harness = createHarness({ autoQuality: false, autoStoryState: false })
    let recoverCalls = 0
    let claimAttempts = 0
    const worker = harness.worker({
      recoverRuns: async () => ({
        queued: recoverCalls++ === 0 ? [harness.run.id] : [],
        failedLegacy: [],
      }),
      claimRun: async (_workspace: string, claim: any) => {
        claimAttempts += 1
        if (claimAttempts === 1) throw errorWithCode('SQLITE_BUSY')
        if (harness.run.status !== 'queued') return null
        harness.run.status = 'running'
        harness.run.lease_owner = claim.owner
        harness.run.lease_expires_at = '2099-01-01T00:00:00.000Z'
        harness.events.push('claim')
        return clone(harness.run)
      },
    })

    await worker.start(workspace)
    await worker.waitForIdle()
    expect(claimAttempts).toBe(1)

    const retryTimer = harness.timeoutRegistrations
      .filter(timer => !timer.cleared)
      .sort((left, right) => left.ms - right.ms)[0]
    expect(retryTimer).toBeDefined()
    await retryTimer.callback()
    await worker.waitForIdle()

    expect(claimAttempts).toBe(2)
    expect(harness.revisionCalls).toHaveLength(1)
    expect(harness.run.status).toBe('completed')
  })

  test('rolls back a failed start so the next concurrent start shares one recovery and queue loop', async () => {
    const harness = createHarness({ autoQuality: false, autoStoryState: false })
    let recoverAttempts = 0
    const worker = harness.worker({
      recoverRuns: async () => {
        recoverAttempts += 1
        if (recoverAttempts === 1) throw errorWithCode('SQLITE_BUSY')
        return { queued: [harness.run.id], failedLegacy: [] }
      },
    })

    await expect(worker.start(workspace)).rejects.toMatchObject({ code: 'SQLITE_BUSY' })
    await Promise.all([worker.start(workspace), worker.start(workspace)])
    await worker.waitForIdle()

    expect(recoverAttempts).toBe(2)
    expect(harness.events.filter(event => event === 'claim')).toHaveLength(1)
    expect(harness.revisionCalls).toHaveLength(1)
    expect(harness.run.status).toBe('completed')
  })

  test('keeps one workspace binding across idempotent start and stop calls', async () => {
    const harness = createHarness({ autoQuality: false, autoStoryState: false })
    const worker = harness.worker()

    await Promise.all([worker.start(workspace), worker.start(workspace)])
    await worker.waitForIdle()
    await expect(worker.start('/tmp/different-editor-revision-workspace')).rejects.toMatchObject({
      code: 'REVISION_WORKER_WORKSPACE_MISMATCH',
    })
    await Promise.all([worker.stop(), worker.stop()])

    expect(harness.events.filter(event => event === 'claim')).toHaveLength(1)
    expect(harness.timeoutRegistrations.filter(timer => !timer.cleared)).toHaveLength(0)
  })

  test('corrupt claimed checkpoint honors a concurrent cancellation request', async () => {
    const harness = createHarness()
    harness.run.output_ref = '{'
    harness.run.cancel_requested_at = '2030-01-01T00:00:00.000Z'
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.run.status).toBe('canceled')
    expect(harness.run.error_message).toBe('')
    expect(harness.checkpoint().error).toBeUndefined()
    expect(harness.checkpoint().phases.generate_candidate.status).toBe('canceled')
    expect(harness.revisionCalls).toHaveLength(0)
    expect(harness.commitCalls()).toBe(0)
  })

  test('corrupt checkpoint failure preserves a valid live commit marker and receipt', async () => {
    const harness = createHarness()
    harness.run.output_ref = '{'
    const candidateHash = revisionTextHash(candidateText)
    harness.setChapter({
      ...harness.chapter(),
      chapter_text: candidateText,
      raw_payload: {
        editor_revision_commit: {
          run_id: harness.run.id,
          source_hash: harness.input.source_text_hash,
          candidate_hash: candidateHash,
          committed_at: '2030-01-01T00:00:03.000Z',
        },
      },
      updated_at: '2030-01-01T00:00:03.000Z',
    })
    harness.reviews.push({
      id: 61,
      project_id: harness.run.project_id,
      review_type: 'editor_revision',
      payload: JSON.stringify({
        source_run_id: harness.run.id,
        chapter_id: harness.input.chapter_id,
        candidate_hash: candidateHash,
      }),
    })
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    const checkpoint = harness.checkpoint()
    expect(harness.run.status).toBe('failed')
    expect(checkpoint.error?.code).toBe('REVISION_CHECKPOINT_INVALID')
    expect(checkpoint.prose_persisted).toBe(true)
    expect(checkpoint.candidate).toMatchObject({ text: candidateText, hash: candidateHash })
    expect(checkpoint.phases.persist_chapter.status).toBe('completed')
    expect(checkpoint.committed_chapter_updated_at).toBe('2030-01-01T00:00:03.000Z')
    expect(checkpoint.editor_revision_review_id).toBe(61)
    expect(harness.revisionCalls).toHaveLength(0)
    expect(harness.commitCalls()).toBe(0)
    expect(harness.qualityCalls).toHaveLength(0)
    expect(harness.chapter().chapter_text).toBe(candidateText)
  })

  test('durably writes every phase boundary before its mutation and completes', async () => {
    const harness = createHarness({ followers: [{ chapter_no: 2, chapter_text: '后续正文。' }] })
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.checkpoint().phases.completed.status).toBe('completed')
    expect(harness.run.status).toBe('completed')
    expect(harness.events.indexOf('checkpoint:generate_candidate:running')).toBeLessThan(harness.events.indexOf('execute_revision'))
    expect(harness.events.indexOf('checkpoint:persist_chapter:running')).toBeLessThan(harness.events.indexOf('commit'))
    expect(harness.events.indexOf('checkpoint:post_quality:running')).toBeLessThan(harness.events.indexOf('quality'))
    expect(harness.events.indexOf('checkpoint:sync_current_story_state:running')).toBeLessThan(harness.events.indexOf('prepare_story_state'))
    expect(harness.events.indexOf('prepare_story_state')).toBeLessThan(harness.events.indexOf('apply_story_state'))
    expect(harness.events.indexOf('checkpoint:record_continuity_warning:running'))
      .toBeLessThan(harness.events.indexOf('review:delivery_risk_convergence'))
    expect(harness.events.indexOf('checkpoint:record_continuity_warning:running'))
      .toBeLessThan(harness.events.indexOf('review:downstream_continuity_warning'))
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
    await eventually(() => harness.revisionCalls.length === 1)

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
    await eventually(() => harness.revisionCalls.length === 1)
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

  test('never regenerates from a durable completed generation that has no candidate evidence', async () => {
    const checkpoint = initialCheckpoint()
    checkpoint.phase = 'admit_candidate'
    checkpoint.phases.generate_candidate = { status: 'completed', attempt: 1 }
    const harness = createHarness({ checkpoint })
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.revisionCalls).toHaveLength(0)
    expect(harness.commitCalls()).toBe(0)
    expect(harness.versionWrites()).toBe(0)
    expect(harness.run.status).toBe('failed')
    expect(harness.run.error_message).toBe('REVISION_CHECKPOINT_INVALID')
  })

  test('checkpoints generation completion only together with admitted candidate evidence', async () => {
    const harness = createHarness({ autoQuality: false, autoStoryState: false })
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    const orphanedGeneration = harness.writes.find(checkpoint => (
      checkpoint.phases.generate_candidate.status === 'completed'
      && !checkpoint.candidate
    ))
    expect(orphanedGeneration).toBeUndefined()
    expect(harness.revisionCalls).toHaveLength(1)
    expect(harness.run.status).toBe('completed')
  })

  test.each([
    { invalidation: 'cancellation' as const },
    { invalidation: 'takeover' as const },
  ])('fences a blocked post-quality commit after parent $invalidation', async ({ invalidation }) => {
    const activeWorkspace = await tempWorkspace()
    const fixture = await createCommittedWorkerFixture(activeWorkspace, {
      autoQuality: true,
      autoStoryState: false,
    })
    const checkpoint = persistedCheckpoint()
    checkpoint.committed_chapter_updated_at = fixture.evidence.committedAt
    checkpoint.editor_revision_review_id = fixture.evidence.receipt.id
    runDbMutation(activeWorkspace, 'UPDATE runs SET output_ref = ? WHERE id = ?', JSON.stringify(checkpoint), fixture.run.id)
    let qualityEntered!: () => void
    let releaseQuality!: () => void
    const entered = new Promise<void>(resolve => { qualityEntered = resolve })
    const gate = new Promise<void>(resolve => { releaseQuality = resolve })
    const ctx: any = {
      getWorkspace: () => activeWorkspace,
      getProject: (_workspace: string, projectId: number) => getNovelProject(activeWorkspace, projectId),
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      buildChapterContextPackage: async () => ({}),
      executeAgent: async () => {
        qualityEntered()
        await gate
        return { parsed: { passed: true, score: 96, issues: [], revision_directives: [] }, finish_reason: 'stop' }
      },
    }
    const worker = createEditorRevisionWorker(ctx, {
      executeRevision: async () => { throw errorWithCode('UNEXPECTED_ORCHESTRATION') },
    })

    await worker.start(activeWorkspace)
    await entered
    const holder = await holdNovelMutationLock(activeWorkspace, `quality-parent-fence-${invalidation}`)
    releaseQuality()
    await eventually(
      () => Boolean(novelMutationLocks.get(novelMutationKey(activeWorkspace))?.waiters.length),
      'quality commit did not wait behind the held transaction lock',
    )
    if (invalidation === 'cancellation') {
      runDbMutation(
        activeWorkspace,
        'UPDATE runs SET status = ?, cancel_requested_at = ? WHERE id = ?',
        'cancel_requested',
        new Date().toISOString(),
        fixture.run.id,
      )
    } else {
      runDbMutation(
        activeWorkspace,
        'UPDATE runs SET lease_owner = ?, lease_expires_at = ? WHERE id = ?',
        'takeover-owner',
        '2099-01-01T00:00:00.000Z',
        fixture.run.id,
      )
    }
    await holder.release()
    await worker.waitForIdle()

    const parent = await getEditorRevisionRun(activeWorkspace, fixture.project.id, fixture.run.id)
    const reviews = await listNovelReviews(activeWorkspace, fixture.project.id)
    const qualityRuns = (await listNovelRuns(activeWorkspace, fixture.project.id))
      .filter(run => run.run_type === 'prose_quality')
    expect(reviews.filter(review => review.review_type === 'prose_quality')).toHaveLength(0)
    expect(qualityRuns.filter(run => run.status === 'success')).toHaveLength(0)
    if (invalidation === 'cancellation') {
      expect(parent?.status).toBe('canceled')
      expect(parsed(parent?.output_ref).phases.post_quality.status).toBe('canceled')
    } else {
      expect(parent).toMatchObject({ status: 'running', lease_owner: 'takeover-owner' })
    }
    await worker.stop()
  })

  test.each([
    { invalidation: 'cancellation' as const },
    { invalidation: 'takeover' as const },
  ])('fences blocked Story State apply writes after parent $invalidation', async ({ invalidation }) => {
    const activeWorkspace = await tempWorkspace()
    const fixture = await createCommittedWorkerFixture(activeWorkspace, {
      autoQuality: false,
      autoStoryState: true,
    })
    const checkpoint = persistedCheckpoint()
    checkpoint.phase = 'sync_current_story_state'
    checkpoint.phases.post_quality = { status: 'skipped', attempt: 1 }
    checkpoint.phases.sync_current_story_state = { status: 'running', attempt: 1 }
    checkpoint.committed_chapter_updated_at = fixture.evidence.committedAt
    checkpoint.editor_revision_review_id = fixture.evidence.receipt.id
    checkpoint.story_state = {
      status: 'prepared',
      receipt: {
        source_run_id: fixture.run.id,
        candidate_hash: fixture.evidence.candidateHash,
        chapter_id: fixture.chapter.id,
      },
      prepared: {
        state_delta: { current_time: 'after-fence', character_positions: { '主角': '旧码头' } },
        character_updates: [],
        setting_updates: [],
        storyline_updates: [],
        sync_reports: {},
        hard_failures: [],
        payload: {},
      },
    }
    runDbMutation(activeWorkspace, 'UPDATE runs SET output_ref = ? WHERE id = ?', JSON.stringify(checkpoint), fixture.run.id)
    const methods = createStoryStateMachineMethods({
      executeAgent: async () => { throw errorWithCode('UNEXPECTED_STORY_STATE_MODEL') },
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      refreshFollowingChapterSerialStoryStateReadiness: async () => {},
    })
    let applyEntered!: () => void
    let releaseApply!: () => void
    const entered = new Promise<void>(resolve => { applyEntered = resolve })
    const gate = new Promise<void>(resolve => { releaseApply = resolve })
    const ctx: any = {
      getWorkspace: () => activeWorkspace,
      getProject: (_workspace: string, projectId: number) => getNovelProject(activeWorkspace, projectId),
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      buildChapterContextPackage: async () => ({}),
      updateStoryStateMachine: async (...args: any[]) => {
        applyEntered()
        await gate
        return (methods.updateStoryStateMachine as any)(...args)
      },
    }
    const worker = createEditorRevisionWorker(ctx, {
      executeRevision: async () => { throw errorWithCode('UNEXPECTED_ORCHESTRATION') },
      prepareStoryState: async () => { throw errorWithCode('UNEXPECTED_STORY_STATE_PREPARE') },
    })

    await worker.start(activeWorkspace)
    await entered
    const before = storyStateMutationSnapshot(activeWorkspace, fixture.project.id, fixture.chapter.id)
    const holder = await holdNovelMutationLock(activeWorkspace, `story-state-parent-fence-${invalidation}`)
    releaseApply()
    await eventually(
      () => Boolean(novelMutationLocks.get(novelMutationKey(activeWorkspace))?.waiters.length),
      'Story State apply did not wait behind the held transaction lock',
    )
    if (invalidation === 'cancellation') {
      runDbMutation(
        activeWorkspace,
        'UPDATE runs SET status = ?, cancel_requested_at = ? WHERE id = ?',
        'cancel_requested',
        new Date().toISOString(),
        fixture.run.id,
      )
    } else {
      runDbMutation(
        activeWorkspace,
        'UPDATE runs SET lease_owner = ?, lease_expires_at = ? WHERE id = ?',
        'takeover-owner',
        '2099-01-01T00:00:00.000Z',
        fixture.run.id,
      )
    }
    await holder.release()
    await worker.waitForIdle()

    expect(storyStateMutationSnapshot(activeWorkspace, fixture.project.id, fixture.chapter.id)).toEqual(before)
    const parent = await getEditorRevisionRun(activeWorkspace, fixture.project.id, fixture.run.id)
    if (invalidation === 'cancellation') {
      expect(parent?.status).toBe('canceled')
      expect(parsed(parent?.output_ref)).toMatchObject({
        phases: { sync_current_story_state: { status: 'canceled' } },
        story_state: { status: 'prepared' },
      })
    } else {
      expect(parent).toMatchObject({ status: 'running', lease_owner: 'takeover-owner' })
    }
    await worker.stop()
  })

  test.each([
    { invalidation: 'cancellation' as const },
    { invalidation: 'takeover' as const },
  ])('fences the final Story State raw payload patch after phase B and parent $invalidation', async ({ invalidation }) => {
    const activeWorkspace = await tempWorkspace()
    const fixture = await createCommittedWorkerFixture(activeWorkspace, {
      autoQuality: false,
      autoStoryState: true,
    })
    const checkpoint = persistedCheckpoint()
    checkpoint.phase = 'sync_current_story_state'
    checkpoint.phases.post_quality = { status: 'skipped', attempt: 1 }
    checkpoint.phases.sync_current_story_state = { status: 'running', attempt: 1 }
    checkpoint.committed_chapter_updated_at = fixture.evidence.committedAt
    checkpoint.editor_revision_review_id = fixture.evidence.receipt.id
    checkpoint.story_state = {
      status: 'prepared',
      receipt: {
        source_run_id: fixture.run.id,
        candidate_hash: fixture.evidence.candidateHash,
        chapter_id: fixture.chapter.id,
      },
      prepared: {
        state_delta: { current_time: 'after-final-raw-payload-fence' },
        character_updates: [],
        setting_updates: [],
        storyline_updates: [],
        sync_reports: {},
        hard_failures: [],
        payload: {},
      },
    }
    runDbMutation(activeWorkspace, 'UPDATE runs SET output_ref = ? WHERE id = ?', JSON.stringify(checkpoint), fixture.run.id)
    const receiptKey = `${fixture.run.id}:${fixture.chapter.id}:${fixture.evidence.candidateHash}`
    const methods = createStoryStateMachineMethods({
      executeAgent: async () => { throw errorWithCode('UNEXPECTED_STORY_STATE_MODEL') },
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      refreshFollowingChapterSerialStoryStateReadiness: async () => {},
    })
    const ctx: any = {
      getWorkspace: () => activeWorkspace,
      getProject: (_workspace: string, projectId: number) => getNovelProject(activeWorkspace, projectId),
      getStageModelId: () => 217,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
      buildChapterContextPackage: async () => ({}),
      updateStoryStateMachine: methods.updateStoryStateMachine,
    }
    let releaseRawPatch!: () => void
    let markRawPatchBlocked!: () => void
    const rawPatchBlocked = new Promise<void>(resolve => { markRawPatchBlocked = resolve })
    const rawPatchGate = new Promise<void>(resolve => { releaseRawPatch = resolve })
    let blocked = false
    let phaseBChapter: ReturnType<typeof chapterRawPayloadWriteSnapshot> = null
    setNovelMutationTestHook(async event => {
      if (blocked
        || event.activeWorkspace !== activeWorkspace
        || event.phase !== 'after_mutation_lock_acquired') return
      const db = openDb(activeWorkspace)
      try {
        const phaseBCommitted = Number((db.query(`
          SELECT EXISTS(
            SELECT 1
            FROM reviews
            WHERE project_id = ?
              AND review_type = 'story_state'
          ) AS committed
        `).get(fixture.project.id) as any)?.committed || 0) === 1
        if (!phaseBCommitted) return
        const row = db.query(`
          SELECT raw_payload, updated_at
          FROM chapters
          WHERE id = ? AND project_id = ?
          LIMIT 1
        `).get(fixture.chapter.id, fixture.project.id) as any
        const rawPayload = parsed(row?.raw_payload)
        const admission = rawPayload.prose_admission || rawPayload.proseAdmission || {}
        if (admission.story_state_status === 'synced') return
        blocked = true
        phaseBChapter = row
        markRawPatchBlocked()
        await rawPatchGate
      } finally {
        db.close()
      }
    })
    const worker = createEditorRevisionWorker(ctx, {
      executeRevision: async () => { throw errorWithCode('UNEXPECTED_ORCHESTRATION') },
      prepareStoryState: async () => { throw errorWithCode('UNEXPECTED_STORY_STATE_PREPARE') },
    })

    await worker.start(activeWorkspace)
    await Promise.race([
      rawPatchBlocked,
      worker.waitForIdle().then(async () => {
        const parent = await getEditorRevisionRun(activeWorkspace, fixture.project.id, fixture.run.id)
        throw new Error(`worker stopped before the final raw payload patch: ${JSON.stringify(parent)}`)
      }),
    ])
    expect(phaseBChapter).not.toBeNull()
    const recoveryReceipt = (await getNovelProject(activeWorkspace, fixture.project.id))
      ?.reference_config?.story_state_sync_receipts?.[receiptKey]
    expect(recoveryReceipt).toMatchObject({
      status: 'state_applied',
      source_run_id: fixture.run.id,
      candidate_hash: fixture.evidence.candidateHash,
      chapter_id: fixture.chapter.id,
    })
    expect(recoveryReceipt?.prepared_for_recovery).toBeTruthy()
    if (invalidation === 'cancellation') {
      runDbMutation(
        activeWorkspace,
        'UPDATE runs SET status = ?, cancel_requested_at = ? WHERE id = ?',
        'cancel_requested',
        new Date().toISOString(),
        fixture.run.id,
      )
    } else {
      runDbMutation(
        activeWorkspace,
        'UPDATE runs SET lease_owner = ?, lease_expires_at = ? WHERE id = ?',
        'takeover-owner',
        '2099-01-01T00:00:00.000Z',
        fixture.run.id,
      )
    }
    releaseRawPatch()
    await worker.waitForIdle()
    setNovelMutationTestHook(null)

    expect(chapterRawPayloadWriteSnapshot(activeWorkspace, fixture.project.id, fixture.chapter.id)).toEqual(phaseBChapter)
    const parent = await getEditorRevisionRun(activeWorkspace, fixture.project.id, fixture.run.id)
    const durableReceipt = (await getNovelProject(activeWorkspace, fixture.project.id))
      ?.reference_config?.story_state_sync_receipts?.[receiptKey]
    expect(durableReceipt).toEqual(recoveryReceipt)
    if (invalidation === 'cancellation') {
      expect(parent).toMatchObject({
        status: 'canceled',
        error_message: '',
        lease_owner: null,
        lease_expires_at: null,
      })
      expect(parsed(parent?.output_ref)).toMatchObject({
        phase: 'sync_current_story_state',
        phases: { sync_current_story_state: { status: 'canceled' } },
        story_state: {
          status: 'prepared',
          receipt: {
            source_run_id: fixture.run.id,
            candidate_hash: fixture.evidence.candidateHash,
            chapter_id: fixture.chapter.id,
          },
          prepared: { state_delta: { current_time: 'after-final-raw-payload-fence' } },
        },
      })
    } else {
      expect(parent).toMatchObject({ status: 'running', lease_owner: 'takeover-owner' })
      expect(parsed(parent?.output_ref).story_state).toMatchObject({ status: 'prepared' })
    }
    await worker.stop()
  }, 30_000)

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

  test.each([
    {
      label: 'manually edited prose with the same marker',
      mutate: (harness: ReturnType<typeof createHarness>) => {
        installMatchingCommitMarker(harness)
        harness.setChapter({ ...harness.chapter(), chapter_text: 'manual edit after persisted checkpoint' })
      },
    },
    {
      label: 'missing commit marker',
      mutate: (harness: ReturnType<typeof createHarness>) => {
        harness.setChapter({
          ...harness.chapter(),
          chapter_text: candidateText,
          raw_payload: {},
        })
      },
    },
    {
      label: 'mismatched commit marker hash',
      mutate: (harness: ReturnType<typeof createHarness>) => {
        installMatchingCommitMarker(harness)
        harness.setChapter({
          ...harness.chapter(),
          raw_payload: {
            editor_revision_commit: {
              ...harness.chapter().raw_payload.editor_revision_commit,
              candidate_hash: 'mismatched-marker-hash',
            },
          },
        })
      },
    },
    {
      label: 'mismatched commit marker source hash',
      mutate: (harness: ReturnType<typeof createHarness>) => {
        installMatchingCommitMarker(harness)
        harness.setChapter({
          ...harness.chapter(),
          raw_payload: {
            editor_revision_commit: {
              ...harness.chapter().raw_payload.editor_revision_commit,
              source_hash: revisionTextHash('different source snapshot'),
            },
          },
        })
      },
    },
  ])('supersedes persisted-prose recovery for $label before any post phase', async ({ mutate }) => {
    const harness = createHarness({ checkpoint: persistedCheckpoint() })
    mutate(harness)
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.run.status).toBe('failed')
    expect(harness.checkpoint().error?.code).toBe('REVISION_RUN_SUPERSEDED')
    expect(harness.revisionCalls).toHaveLength(0)
    expect(harness.commitCalls()).toBe(0)
    expect(harness.qualityCalls).toHaveLength(0)
    expect(harness.prepareCalls).toHaveLength(0)
    expect(harness.applyCalls).toHaveLength(0)
    expect(harness.reviews).toHaveLength(0)
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

  test.each([
    {
      kind: 'delivery_risk_convergence' as const,
      invalidate: 'expiry' as const,
      expectedCode: 'REVISION_LEASE_LOST',
    },
    {
      kind: 'downstream_continuity_warning' as const,
      invalidate: 'cancellation' as const,
      expectedCode: 'REVISION_CANCELED',
    },
  ])('rejects a queued $kind review after worker lease $invalidate', async ({ kind, invalidate, expectedCode }) => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: `fenced ${kind}` })
    const owner = `worker-${kind}`
    const run = await createClaimedReviewRun(activeWorkspace, project.id, owner)
    const candidateHash = 'a'.repeat(64)
    const receipt = kind === 'delivery_risk_convergence'
      ? {
          kind,
          sourceRunId: run.id,
          candidateHash,
          chapterId: 7,
        }
      : {
          kind,
          sourceRunId: run.id,
        }
    const request = {
      data: {
        project_id: project.id,
        review_type: kind,
        status: kind === 'delivery_risk_convergence' ? 'ok' : 'warn',
        summary: 'must remain absent after lease loss',
        issues: [],
        payload: JSON.stringify({
          source_run_id: run.id,
          chapter_id: 7,
          candidate_hash: candidateHash,
        }),
      },
      receipt,
      workerLease: { owner },
    }

    let releaseLock!: () => void
    let lockAcquired!: () => void
    const acquired = new Promise<void>(resolve => { lockAcquired = resolve })
    const release = new Promise<void>(resolve => { releaseLock = resolve })
    setNovelMutationTestHook(async event => {
      if (event.operation !== 'review-lease-fence-holder' || event.phase !== 'after_mutation_lock_acquired') return
      lockAcquired()
      await release
    })
    const holder = withNovelDbWrite(activeWorkspace, () => {}, 'review-lease-fence-holder')
    await acquired
    const writing = findOrCreateEditorRevisionReview(activeWorkspace, request as any)
      .then(value => ({ value }), error => ({ error }))

    if (invalidate === 'expiry') {
      runDbMutation(
        activeWorkspace,
        'UPDATE runs SET lease_expires_at = ? WHERE id = ?',
        '2000-01-01T00:00:00.000Z',
        run.id,
      )
    } else {
      runDbMutation(
        activeWorkspace,
        'UPDATE runs SET status = ?, cancel_requested_at = ? WHERE id = ?',
        'cancel_requested',
        '2030-01-01T00:00:00.000Z',
        run.id,
      )
    }
    releaseLock()
    await holder
    const result = await writing

    expect(result).toMatchObject({ error: { code: expectedCode } })
    expect(await listNovelReviews(activeWorkspace, project.id)).toHaveLength(0)
  })

  test('atomically reuses deterministic reviews without changing their exact payload', async () => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: 'atomic worker review' })
    const owner = 'atomic-review-worker'
    const run = await createClaimedReviewRun(activeWorkspace, project.id, owner)
    const payload = {
      source_run_id: run.id,
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
        sourceRunId: run.id,
        candidateHash: 'a'.repeat(64),
        chapterId: 7,
      },
      workerLease: { owner },
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
      source_run_id: run.id,
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
        sourceRunId: run.id,
      },
      workerLease: { owner },
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

  test('oversized rejected candidate evidence stores only bounded head and tail previews', async () => {
    const rejected = `${'首'.repeat(30_001)}${'尾'.repeat(30_001)}`
    const harness = createHarness({ executeRevision: async () => completeResult(rejected) })
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    const evidence = (harness.checkpoint().error?.diagnostics as any)?.rejected_candidate
    expect(harness.checkpoint().error?.code).toBe('REVISION_CANDIDATE_TOO_LONG')
    expect(evidence.text).toBeUndefined()
    expect(evidence.head_preview).toBe('首'.repeat(2_000))
    expect(evidence.tail_preview).toBe('尾'.repeat(2_000))
    expect(evidence.head_preview).toHaveLength(2_000)
    expect(evidence.tail_preview).toHaveLength(2_000)
    expect(evidence.char_count).toBe(rejected.length)
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
