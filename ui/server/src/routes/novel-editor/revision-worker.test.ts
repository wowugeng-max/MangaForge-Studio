import { afterEach, describe, expect, test } from 'bun:test'
import express from 'express'
import { rm } from 'fs/promises'
import {
  appendChapterVersion,
  appendNovelRun,
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
import { registerNovelRoutes } from '../novel'
import type { EditorRevisionCheckpoint, EditorRevisionPhase } from './editor-revision-contract'
import { revisionTextHash } from './revision-candidate-admission'
import { registerNovelEditorRoutes } from './register'
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

function createWorkerWithTaskExecution(ctx: any, overrides: Record<string, any> = {}) {
  const buildChapterContextPackage = overrides.buildChapterContextPackage
    || ctx.buildChapterContextPackage
    || (async (_workspace: string, _project: any, chapter: any) => ({
      chapter_target: { chapter_id: chapter.id, chapter_no: chapter.chapter_no },
    }))
  const beginChapterTask = overrides.beginChapterTask
    || ctx.beginChapterTask
    || (async (input: any) => {
      const taskId = `test-revision-${input.chapter.id}`
      return {
        taskId,
        source: 'model',
        modelId: input.requestedModelId,
        fingerprint: 'test-revision-source',
        contextVersion: 'test-revision-context',
        provenance: () => ({}),
        generateDraft: async () => { throw new Error('revision worker must not generate a draft') },
        executeAgent: async (
          stage: string,
          _responseContract: string,
          agentId: string,
          project: any,
          context: any,
          options: any,
        ) => {
          const execute = stage === 'revision'
            ? overrides.executeRevision || ctx.executeAgent
            : ctx.executeAgent || overrides.executeRevision
          if (!execute) throw new Error(`missing test execution for ${stage}`)
          return execute(agentId, project, context, options)
        },
        assertCurrent: async () => {},
        close: async () => {},
      }
    })
  return createEditorRevisionWorker(ctx, {
    runWritingSkillHumanizePass: async (
      _workspace: string,
      _project: any,
      _context: any,
      sourceText: string,
    ) => ({
      final_text: sourceText,
      report: {
        version: 'writing_skill_humanize_v1',
        enabled_ids: [],
        enabled: false,
        skipped: true,
        accepted: true,
        reason: 'test_noop',
        before_chars: 0,
        after_chars: 0,
        chunk_count: 0,
      },
    }),
    ...overrides,
    buildChapterContextPackage,
    beginChapterTask,
  })
}

function createHarness(options: {
  autoQuality?: boolean
  autoStoryState?: boolean
  modelId?: number
  sourceReview?: Record<string, unknown>
  followers?: Array<{ chapter_no: number; chapter_text: string }>
  checkpoint?: EditorRevisionCheckpoint
  executeRevision?: (...args: any[]) => Promise<any>
  runWritingSkillHumanizePass?: (...args: any[]) => Promise<any>
  quality?: (...args: any[]) => Promise<any>
  prepareStoryState?: (...args: any[]) => Promise<any>
  applyStoryState?: (...args: any[]) => Promise<any>
  beginChapterTask?: (input: any) => Promise<any>
  executeTaskStage?: (...args: any[]) => Promise<any>
  closeTask?: (outcome: any) => Promise<void>
  reportTaskCloseFailure?: (input: any) => Promise<void> | void
  useDefaultCloseFailureReporter?: boolean
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
    model_id: options.modelId,
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
  const begins: any[] = []
  const stages: Array<{ taskId: string; args: any[] }> = []
  const closeOutcomes: Array<{ taskId: string; outcome: any }> = []
  const generateDraftCalls: any[] = []
  const contextBuildCalls: any[][] = []
  const closeFailureReports: any[] = []
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
    const qualityOptions = args.at(-1)
    await qualityOptions.chapterTaskExecution.executeAgent(
      qualityOptions.qualityStage,
      'quality_review_json',
      'review-agent',
      args[2],
      { task: 'stable post revision quality context' },
      { signal: qualityOptions.signal },
    )
    return {
      review: { passed: true, score: 91, needs_revision: false },
      saved: { id: 71, review_type: 'prose_quality', payload: '{}' },
      reused: false,
    }
  })
  const prepareStoryState = options.prepareStoryState || (async (...args: any[]) => {
    prepareCalls.push(args)
    events.push('prepare_story_state')
    const storyStateInput = args[1]
    await storyStateInput.chapterTaskExecution.executeAgent(
      'story_state_sync',
      'story_state_json',
      'review-agent',
      project,
      { task: 'stable story state context' },
      { signal: storyStateInput.signal },
    )
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
    buildChapterContextPackage: async (...args: any[]) => {
      contextBuildCalls.push(args)
      return { chapter_target: { chapter_id: input.chapter_id }, snapshot: 'stable-worker-context' }
    },
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
      if (run.status !== 'running' || run.cancel_requested_at) return false
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
    listWorldbuilding: async () => [],
    listCharacters: async () => [],
    listOutlines: async () => [],
    listReviews: async () => clone(reviews),
    buildChapterContextPackage: (...args: any[]) => ctx.buildChapterContextPackage(...args),
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
    runWritingSkillHumanizePass: options.runWritingSkillHumanizePass || (async (
      _workspace: string,
      _project: any,
      _context: any,
      sourceText: string,
    ) => ({
      final_text: sourceText,
      report: {
        version: 'writing_skill_humanize_v1',
        enabled_ids: [],
        enabled: false,
        skipped: true,
        accepted: true,
        reason: 'test_noop',
        before_chars: 0,
        after_chars: 0,
        chunk_count: 0,
      },
    })),
    executeRevision: async (...args: any[]) => {
      if (options.executeRevision) revisionCalls.push(args)
      return executeRevision(...args)
    },
    beginChapterTask: async (beginInput: any) => {
      begins.push(beginInput)
      events.push('begin_chapter_task')
      if (options.beginChapterTask) return options.beginChapterTask(beginInput)
      const taskId = 'revision-task-1'
      return {
        taskId,
        source: 'model',
        modelId: 217,
        fingerprint: 'sha256:revision-fixture-fingerprint',
        contextVersion: 'revision-fixture-context-v1',
        provenance: () => ({
          task_id: taskId,
          project_id: project.id,
          chapter_id: input.chapter_id,
          source: 'model',
          source_fingerprint: 'sha256:revision-fixture-fingerprint',
          context_version: 'revision-fixture-context-v1',
          model_id: 217,
        }),
        generateDraft: async (request: any) => {
          generateDraftCalls.push(request)
          throw new Error('revision worker must not call generateDraft')
        },
        executeAgent: async (...args: any[]) => {
          stages.push({ taskId, args })
          events.push(`task_stage:${args[0]}`)
          if (options.executeTaskStage) return options.executeTaskStage(...args)
          if (args[0] === 'revision') {
            if (options.executeRevision) revisionCalls.push([args[2], args[3], args[4], args[5]])
            return executeRevision(args[2], args[3], args[4], args[5])
          }
          if (args[0] === 'post_revision_review') {
            return { parsed: { passed: true, score: 96, issues: [], revision_directives: [] } }
          }
          if (args[0] === 'story_state_sync') {
            return { parsed: { state_delta: {}, character_updates: [], setting_updates: [], storyline_updates: [] } }
          }
          throw new Error(`unexpected revision task stage: ${String(args[0])}`)
        },
        assertCurrent: async () => {},
        close: async (outcome: any) => {
          closeOutcomes.push({ taskId, outcome })
          events.push(`close:${outcome?.status || 'success'}`)
          await options.closeTask?.(outcome)
        },
      }
    },
    reportTaskCloseFailure: async (input: any) => {
      closeFailureReports.push(clone(input))
      await options.reportTaskCloseFailure?.(input)
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
  if (options.useDefaultCloseFailureReporter) delete dependencies.reportTaskCloseFailure

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
    begins,
    stages,
    closeOutcomes,
    generateDraftCalls,
    contextBuildCalls,
    closeFailureReports,
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

function fixedScopeText(label: string, charCount: number) {
  const prefix = `${label}:`
  const bodyCount = Math.max(0, charCount - prefix.length)
  if (!bodyCount) return prefix.slice(0, charCount)
  if (bodyCount === 1) return `${prefix}。`
  const prose = '本章冲突继续推进。'.repeat(Math.ceil(bodyCount / 8))
  return `${prefix}${prose.slice(0, bodyCount - 1)}。`
}

async function createThirtyChapterScopeFixture(options: {
  sourceText?: string
  candidateText?: string
} = {}) {
  const activeWorkspace = await tempWorkspace()
  const project = await createNovelProject(activeWorkspace, {
    title: '三十章单章修订隔离',
    reference_config: {
      story_state: {
        current_time: 'FIXTURE_STORY_STATE_BEFORE',
        open_questions: ['FIXTURE_OPEN_QUESTION'],
      },
      fixture_sentinel: 'PROJECT_REFERENCE_SENTINEL',
    },
  })
  const sourceChapterText = options.sourceText || fixedScopeText('CHAPTER_01_SOURCE_SENTINEL', 900)
  const candidateChapterText = options.candidateText || fixedScopeText('CHAPTER_01_CANDIDATE_SENTINEL', 910)
  const chapters = []
  for (let chapterNo = 1; chapterNo <= 30; chapterNo += 1) {
    const padded = String(chapterNo).padStart(2, '0')
    chapters.push(await createNovelChapter(activeWorkspace, {
      project_id: project.id,
      chapter_no: chapterNo,
      title: `第${padded}章 SCOPE_TITLE_${padded}`,
      chapter_goal: `PLAN_GOAL_${padded}`,
      chapter_summary: `PLAN_SUMMARY_${padded}`,
      conflict: `PLAN_CONFLICT_${padded}`,
      ending_hook: `PLAN_ENDING_HOOK_${padded}`,
      chapter_text: chapterNo === 1
        ? sourceChapterText
        : fixedScopeText(`CHAPTER_${padded}_SOURCE_SENTINEL`, 900 + chapterNo),
      scene_breakdown: [{ scene_id: `SCENE_BREAKDOWN_${padded}`, goal: `SCENE_GOAL_${padded}` }],
      scene_list: [{ scene_id: `SCENE_LIST_${padded}`, beat: `SCENE_BEAT_${padded}` }],
      continuity_notes: [`CONTINUITY_NOTE_${padded}`],
      items_in_play: [`ITEM_IN_PLAY_${padded}`],
      foreshadowing: [{ key: `FORESHADOW_${padded}`, status: 'open' }],
      timeline_note: `TIMELINE_NOTE_${padded}`,
      raw_payload: {
        scope_sentinel: `RAW_PAYLOAD_CHAPTER_${padded}_SENTINEL`,
        plan: {
          chapter_goal: `RAW_PLAN_GOAL_${padded}`,
          required_beats: [`RAW_PLAN_BEAT_${padded}`],
        },
        prose_admission: { story_state_status: 'pending' },
      },
    }))
  }
  return {
    workspace: activeWorkspace,
    project,
    chapters,
    sourceText: sourceChapterText,
    candidateText: candidateChapterText,
  }
}

type SnapshotChapterScope = { chapterId: number | null; hasScope: boolean }

function snapshotScopeContainers(payload: any) {
  const contextPackages = [payload.context_package, payload.contextPackage]
    .filter(value => value && typeof value === 'object')
  const reports = [payload.report]
    .filter(value => value && typeof value === 'object')
  const summaries = [
    payload.summary,
    ...contextPackages.map(value => value.summary),
    ...reports.map(value => value.summary),
  ].filter(value => value && typeof value === 'object')
  const directTargets = [payload.chapter_target, payload.chapterTarget, payload.current_chapter, payload.currentChapter]
    .filter(value => value && typeof value === 'object')
  const nestedTargets = [...contextPackages, ...reports, ...summaries]
    .flatMap(value => [value.chapter_target, value.chapterTarget, value.current_chapter, value.currentChapter])
    .filter(value => value && typeof value === 'object')
  return [
    { value: payload, allowPlainId: false },
    ...contextPackages.map(value => ({ value, allowPlainId: false })),
    ...reports.map(value => ({ value, allowPlainId: false })),
    ...summaries.map(value => ({ value, allowPlainId: false })),
    ...directTargets.map(value => ({ value, allowPlainId: true })),
    ...nestedTargets.map(value => ({ value, allowPlainId: true })),
  ]
}

function payloadChapterScope(
  value: unknown,
  chapterIdSet: Set<number>,
  chapterNoToId: Map<number, number>,
): SnapshotChapterScope {
  const payload = parsed(value)
  let hasScope = false
  for (const container of snapshotScopeContainers(payload)) {
    for (const key of ['chapter_id', 'chapterId', ...(container.allowPlainId ? ['id'] : [])]) {
      if (!Object.prototype.hasOwnProperty.call(container.value, key)) continue
      hasScope = true
      const chapterId = Number(container.value[key] || 0)
      if (Number.isInteger(chapterId) && chapterIdSet.has(chapterId)) return { chapterId, hasScope: true }
    }
    for (const key of ['chapter_no', 'chapterNo']) {
      if (!Object.prototype.hasOwnProperty.call(container.value, key)) continue
      hasScope = true
      const chapterNo = Number(container.value[key] || 0)
      const chapterId = chapterNoToId.get(chapterNo) || null
      if (chapterId) return { chapterId, hasScope: true }
    }
  }
  return { chapterId: null, hasScope }
}

function runScopeKeyChapterScope(
  value: unknown,
  chapterIdSet: Set<number>,
  chapterNoToId: Map<number, number>,
): SnapshotChapterScope {
  const scopeKey = String(value || '')
  const idMatch = scopeKey.match(/^(?:chapter|chapter_id|chapterId):(\d+)$/)
  if (idMatch) {
    const chapterId = Number(idMatch[1])
    return { chapterId: chapterIdSet.has(chapterId) ? chapterId : null, hasScope: true }
  }
  const noMatch = scopeKey.match(/^(?:chapter_no|chapterNo):(\d+)$/)
  if (noMatch) {
    return { chapterId: chapterNoToId.get(Number(noMatch[1])) || null, hasScope: true }
  }
  return { chapterId: null, hasScope: false }
}

function firstResolvedChapterScope(...scopes: SnapshotChapterScope[]) {
  return {
    chapterId: scopes.find(scope => scope.chapterId)?.chapterId || null,
    hasScope: scopes.some(scope => scope.hasScope),
  }
}

async function chapterMutationSnapshot(
  activeWorkspace: string,
  projectId: number,
  chapterIds: number[],
) {
  const db = openDb(activeWorkspace)
  try {
    const chapterRows = db.query('SELECT * FROM chapters WHERE project_id = ? ORDER BY chapter_no, id').all(projectId) as any[]
    const versionRows = db.query('SELECT * FROM chapter_versions WHERE project_id = ? ORDER BY chapter_id, version_no, id').all(projectId) as any[]
    const reviewRows = db.query('SELECT * FROM reviews WHERE project_id = ? ORDER BY id').all(projectId) as any[]
    const runRows = db.query('SELECT * FROM runs WHERE project_id = ? ORDER BY id').all(projectId) as any[]
    const chapterIdSet = new Set(chapterIds)
    const chapterNoToId = new Map(chapterRows
      .filter(chapter => chapterIdSet.has(Number(chapter.id)))
      .map(chapter => [Number(chapter.chapter_no), Number(chapter.id)]))
    const reviewsByChapter = new Map<number, any[]>()
    const runsByChapter = new Map<number, any[]>()
    const tasksByChapter = new Map<number, any[]>()
    for (const review of reviewRows) {
      const chapterId = payloadChapterScope(review.payload, chapterIdSet, chapterNoToId).chapterId
      if (!chapterId || !chapterIdSet.has(chapterId)) continue
      reviewsByChapter.set(chapterId, [...(reviewsByChapter.get(chapterId) || []), review])
    }
    for (const run of runRows) {
      const runScope = firstResolvedChapterScope(
        runScopeKeyChapterScope(run.scope_key, chapterIdSet, chapterNoToId),
        payloadChapterScope(run.input_ref, chapterIdSet, chapterNoToId),
        payloadChapterScope(run.output_ref, chapterIdSet, chapterNoToId),
      )
      const runChapterId = runScope.chapterId
      if (runChapterId && chapterIdSet.has(runChapterId)) {
        runsByChapter.set(runChapterId, [...(runsByChapter.get(runChapterId) || []), run])
      }
      const output = parsed(run.output_ref)
      const tasks = Array.isArray(output.tasks) ? output.tasks : []
      tasks.forEach((task: any, taskIndex: number) => {
        const taskScope = payloadChapterScope(task, chapterIdSet, chapterNoToId)
        const taskChapterId = taskScope.chapterId || (!taskScope.hasScope ? runChapterId : null)
        if (!taskChapterId || !chapterIdSet.has(taskChapterId)) return
        tasksByChapter.set(taskChapterId, [
          ...(tasksByChapter.get(taskChapterId) || []),
          { run_id: run.id, task_index: taskIndex, task },
        ])
      })
    }
    return chapterIds.map(chapterId => ({
      chapter: chapterRows.find(chapter => Number(chapter.id) === chapterId) || null,
      versions: versionRows.filter(version => Number(version.chapter_id) === chapterId),
      reviews: reviewsByChapter.get(chapterId) || [],
      runs: runsByChapter.get(chapterId) || [],
      tasks: tasksByChapter.get(chapterId) || [],
    }))
  } finally {
    db.close()
  }
}

function explicitModelChapterId(task: unknown) {
  const match = String(task || '').match(/"chapter_id"\s*:\s*(\d+)/)
  if (!match) throw new Error('MODEL_CALL_CHAPTER_ID_MISSING')
  return Number(match[1])
}

async function createThirtyChapterWorkerFixture(options: {
  sourceText?: string
  candidateText?: string
} = {}) {
  const fixture = await createThirtyChapterScopeFixture(options)
  const target = fixture.chapters[0]
  const revisionCalls: number[] = []
  const qualityCalls: number[] = []
  const storyStateCalls: number[] = []
  const chapterTaskBegins: Array<{ taskId: string; sessionId: string; input: any }> = []
  const chapterTaskStages: Array<{ taskId: string; sessionId: string; stage: string }> = []
  let chapterTaskSequence = 0
  let followerRefreshCallCount = 0
  const executeAgent = async (agent: string, _project: any, request: any) => {
    const chapterId = explicitModelChapterId(request?.task)
    if (agent === 'prose-agent') {
      revisionCalls.push(chapterId)
      return completeResult(fixture.candidateText, {
        revision_scope_guard: { over_limit: false },
        revision_receipts: [{ affected_chapters: [chapterId] }],
      })
    }
    if (String(request?.task || '').includes('商用小说正文质检')) {
      qualityCalls.push(chapterId)
      return {
        parsed: {
          passed: true,
          score: 96,
          issues: [],
          revision_directives: [],
          craft_metrics: {},
          focused_revision_modes: [],
          needs_revision: false,
        },
        finish_reason: 'stop',
      }
    }
    storyStateCalls.push(chapterId)
    return {
      parsed: {
        state_delta: {
          current_time: 'FIXTURE_STORY_STATE_AFTER',
          open_questions: ['FIXTURE_OPEN_QUESTION_AFTER'],
          next_chapter_priorities: ['FIXTURE_NEXT_PRIORITY'],
        },
        character_updates: [],
        setting_updates: [],
        storyline_updates: [],
      },
      finish_reason: 'stop',
    }
  }
  const methods = createStoryStateMachineMethods({
    executeAgent,
    getStageModelId: () => 217,
    getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
    refreshFollowingChapterSerialStoryStateReadiness: async () => { followerRefreshCallCount += 1 },
  })
  const buildChapterContextPackage = async (
    _activeWorkspace: string,
    _project: any,
    chapter: any,
  ) => ({
    chapter_target: {
      chapter_id: chapter.id,
      id: chapter.id,
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      chapter_goal: chapter.chapter_goal,
      conflict: chapter.conflict,
      ending_hook: chapter.ending_hook,
    },
    continuity: {
      previous_chapter: chapter.chapter_no > 1 ? `PREVIOUS_${chapter.chapter_no - 1}` : '',
      next_chapter: chapter.chapter_no < 30 ? `NEXT_${chapter.chapter_no + 1}` : '',
    },
    story_state: { exact_chapter_id: chapter.id },
  })
  const ctx: any = {
    getWorkspace: () => fixture.workspace,
    getProject: (_activeWorkspace: string, projectId: number) => getNovelProject(fixture.workspace, projectId),
    buildChapterContextPackage,
    getStageModelId: () => 217,
    getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
    buildReferenceUsageReport: async () => ({}),
    buildStructuralSimilarityReport: () => ({}),
    buildReferenceMigrationDryPlan: () => ({}),
    diffTexts: () => ({}),
    beginChapterTask: async (input: any) => {
      chapterTaskSequence += 1
      const taskId = `mcp-${input.chapter.id}-${chapterTaskSequence}`
      const sessionId = `mcp-session-${input.chapter.id}-${chapterTaskSequence}`
      chapterTaskBegins.push({ taskId, sessionId, input })
      return {
        taskId,
        source: 'mcp',
        modelId: input.requestedModelId,
        fingerprint: 'manual-route-fixture',
        contextVersion: 'manual-route-context',
        provenance: () => ({ task_id: taskId, source: 'mcp', session_id: sessionId }),
        generateDraft: async () => { throw new Error('not used') },
        assertCurrent: async () => {},
        executeAgent: async (
          stage: string,
          _responseContract: string,
          agent: string,
          project: any,
          request: any,
          agentOptions: any,
        ) => {
          chapterTaskStages.push({ taskId, sessionId, stage })
          return executeAgent(agent, project, request, agentOptions)
        },
        close: async () => {},
      }
    },
    executeAgent,
    updateStoryStateMachine: methods.updateStoryStateMachine,
  }
  const input = {
    ...canonicalRunInput(fixture.project.id, target),
    source_text: fixture.sourceText,
    source_text_hash: revisionTextHash(fixture.sourceText),
    source_char_count: fixture.sourceText.replace(/\s/g, '').length,
    source_review: {
      id: 11,
      review_type: 'prose_quality',
      payload: JSON.stringify({
        chapter_id: target.id,
        report: { chapter_id: target.id, must_fix: ['只修第一章'] },
      }),
    },
    report: {
      chapter_id: target.id,
      revision_strategy: 'surgical_patch',
      must_fix: ['只修第一章'],
    },
    context_package: await buildChapterContextPackage(fixture.workspace, fixture.project, target),
  }
  const run = await createEditorRevisionRun(fixture.workspace, {
    projectId: fixture.project.id,
    chapterId: target.id,
    inputRef: JSON.stringify(input),
    outputRef: JSON.stringify(initialCheckpoint()),
  })
  return {
    ...fixture,
    ctx,
    input,
    run,
    worker: createWorkerWithTaskExecution(ctx),
    revisionCalls,
    qualityCalls,
    storyStateCalls,
    chapterTaskBegins,
    chapterTaskStages,
    followerRefreshCalls: () => followerRefreshCallCount,
  }
}

function snapshotWithoutRun(snapshot: any[], runId: number) {
  return snapshot.map(item => ({
    ...item,
    runs: item.runs.filter((run: any) => Number(run.id) !== runId),
  }))
}

function durableRunColumns(run: any) {
  const durable = { ...run }
  for (const key of [
    'status',
    'output_ref',
    'error_message',
    'updated_at',
    'lease_owner',
    'lease_expires_at',
    'cancel_requested_at',
  ]) delete durable[key]
  return durable
}

function createRegisteredRouteHarness(): any {
  const handlers = new Map<string, any>()
  const register = (method: string, path: string, handler: any) => {
    handlers.set(`${method.toUpperCase()} ${path}`, handler)
    return app
  }
  const app = {
    get: (path: string, handler: any) => register('GET', path, handler),
    post: (path: string, handler: any) => register('POST', path, handler),
    put: (path: string, handler: any) => register('PUT', path, handler),
    delete: (path: string, handler: any) => register('DELETE', path, handler),
  }
  return { app, handlers }
}

async function callRegisteredRoute(handler: any, request: any = {}) {
  const response: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(body: any) {
      this.body = body
      return this
    },
  }
  await handler({ body: {}, query: {}, params: {}, ...request }, response)
  return response
}

describe('durable editor revision worker', () => {
  test('30 chapter mutation snapshots detect one deliberately changed follower', async () => {
    const fixture = await createThirtyChapterScopeFixture()
    const before = await chapterMutationSnapshot(
      fixture.workspace,
      fixture.project.id,
      fixture.chapters.map((chapter: any) => chapter.id),
    )

    expect(fixture.chapters).toHaveLength(30)
    expect(new Set(fixture.chapters.map((chapter: any) => chapter.chapter_text)).size).toBe(30)
    const planSignatures = before.map(item => JSON.stringify({
      chapter_goal: item.chapter.chapter_goal,
      chapter_summary: item.chapter.chapter_summary,
      conflict: item.chapter.conflict,
      ending_hook: item.chapter.ending_hook,
      scene_breakdown: item.chapter.scene_breakdown,
      scene_list: item.chapter.scene_list,
      timeline_note: item.chapter.timeline_note,
    }))
    const rawPayloadSentinels = before.map(item => parsed(item.chapter.raw_payload).scope_sentinel)
    expect(before.every(item => [
      item.chapter.chapter_goal,
      item.chapter.chapter_summary,
      item.chapter.conflict,
      item.chapter.ending_hook,
      item.chapter.scene_breakdown,
      item.chapter.scene_list,
      item.chapter.timeline_note,
    ].every(value => String(value || '').trim().length > 0))).toBe(true)
    expect(new Set(planSignatures).size).toBe(30)
    expect(rawPayloadSentinels.every(Boolean)).toBe(true)
    expect(new Set(rawPayloadSentinels).size).toBe(30)
    expect(before.every(item => item.versions.length === 0 && item.reviews.length === 0)).toBe(true)

    runDbMutation(
      fixture.workspace,
      'UPDATE chapters SET ending_hook = ? WHERE id = ? AND project_id = ?',
      'DELIBERATE_FOLLOWER_MUTATION',
      fixture.chapters[1].id,
      fixture.project.id,
    )
    const after = await chapterMutationSnapshot(
      fixture.workspace,
      fixture.project.id,
      fixture.chapters.map((chapter: any) => chapter.id),
    )

    expect(after[1]).not.toEqual(before[1])
    expect(after[1].chapter.ending_hook).toBe('DELIBERATE_FOLLOWER_MUTATION')
    expect(after.slice(2)).toEqual(before.slice(2))
  })

  test('30 chapter mutation snapshots attribute follower versions, chapter-no reviews, runs, and nested tasks', async () => {
    const fixture = await createThirtyChapterScopeFixture()
    const [first, second] = fixture.chapters
    const chapterIds = fixture.chapters.map((chapter: any) => chapter.id)
    const carrierRun = await appendNovelRun(fixture.workspace, {
      project_id: fixture.project.id,
      run_type: 'longform_production_repair',
      step_name: 'first-chapter-carrier',
      status: 'ready',
      scope_key: `chapter:${first.id}`,
      input_ref: JSON.stringify({ chapter_id: first.id, chapter_no: first.chapter_no }),
      output_ref: JSON.stringify({
        tasks: [{
          title: 'FOLLOWER_TASK_CHAPTER_NO_ONLY',
          chapter_no: second.chapter_no,
          task_status: 'open',
        }],
      }),
    })
    const before = await chapterMutationSnapshot(fixture.workspace, fixture.project.id, chapterIds)

    await appendChapterVersion(fixture.workspace, {
      chapter_id: second.id,
      project_id: fixture.project.id,
      chapter_text: 'FOLLOWER_VERSION_SENTINEL',
      scene_breakdown: [],
      continuity_notes: [],
      source: 'repair',
    })
    const followerReview = await createNovelReview(fixture.workspace, {
      project_id: fixture.project.id,
      review_type: 'scope_negative_control',
      payload: JSON.stringify({ chapter_no: second.chapter_no, marker: 'FOLLOWER_REVIEW_SENTINEL' }),
    })
    const followerRun = await appendNovelRun(fixture.workspace, {
      project_id: fixture.project.id,
      run_type: 'quality_benchmark',
      step_name: 'follower-chapter-no-run',
      status: 'completed',
      input_ref: JSON.stringify({
        context_package: { chapter_target: { chapterNo: second.chapter_no } },
        marker: 'FOLLOWER_RUN_SENTINEL',
      }),
      output_ref: '{}',
    })
    const after = await chapterMutationSnapshot(fixture.workspace, fixture.project.id, chapterIds)

    expect(before[1].tasks).toEqual([{
      run_id: carrierRun.id,
      task_index: 0,
      task: {
        title: 'FOLLOWER_TASK_CHAPTER_NO_ONLY',
        chapter_no: second.chapter_no,
        task_status: 'open',
      },
    }])
    expect(before[0].tasks).toEqual([])
    expect(after[1].versions).toHaveLength(1)
    expect(after[1].versions[0]).toMatchObject({ chapter_id: second.id, chapter_text: 'FOLLOWER_VERSION_SENTINEL' })
    expect(after[1].reviews.map((review: any) => review.id)).toContain(followerReview.id)
    expect(after[1].runs.map((run: any) => run.id)).toContain(followerRun.id)
    expect(after[1].tasks).toEqual(before[1].tasks)
    expect(after[0]).toEqual(before[0])
    expect(after.slice(2)).toEqual(before.slice(2))
  })

  test('real worker revises chapter one in a 30 chapter project without mutating followers', async () => {
    const fixture = await createThirtyChapterWorkerFixture()
    const chapterIds = fixture.chapters.map((chapter: any) => chapter.id)
    const before = await chapterMutationSnapshot(fixture.workspace, fixture.project.id, chapterIds)

    expect(before.every(item => item.versions.length === 0 && item.reviews.length === 0)).toBe(true)
    await fixture.worker.start(fixture.workspace)
    await fixture.worker.waitForIdle()
    await fixture.worker.stop()

    const after = await chapterMutationSnapshot(fixture.workspace, fixture.project.id, chapterIds)
    const completedRun = await getEditorRevisionRun(fixture.workspace, fixture.project.id, fixture.run.id)
    const checkpoint = parsed(completedRun?.output_ref)
    const commitMarker = parsed(after[0].chapter.raw_payload).editor_revision_commit
    const warnings = (await listNovelReviews(fixture.workspace, fixture.project.id))
      .filter(review => review.review_type === 'downstream_continuity_warning')

    expect(completedRun).toMatchObject({ status: 'completed', error_message: '' })
    expect(fixture.revisionCalls).toEqual([fixture.chapters[0].id])
    expect(fixture.qualityCalls).toEqual([fixture.chapters[0].id])
    expect(fixture.storyStateCalls).toEqual([fixture.chapters[0].id])
    expect(fixture.followerRefreshCalls()).toBe(0)
    expect(after.slice(1)).toEqual(before.slice(1))
    expect(after[0].chapter.chapter_text).toBe(fixture.candidateText)
    expect(after.flatMap(item => item.versions)).toHaveLength(1)
    expect(after[0].versions).toHaveLength(1)
    expect(after[0].versions[0]).toMatchObject({
      chapter_id: fixture.chapters[0].id,
      chapter_text: fixture.sourceText,
      source: 'repair',
    })
    expect(checkpoint.candidate.hash).toBe(revisionTextHash(fixture.candidateText))
    expect(checkpoint.chapter_generation_source).toEqual({
      task_id: `mcp-${fixture.chapters[0].id}-1`,
      source: 'mcp',
      source_fingerprint: 'manual-route-fixture',
      context_version: 'manual-route-context',
    })
    expect(JSON.stringify(checkpoint.chapter_generation_source)).not.toContain('mcp-session')
    expect(commitMarker).toMatchObject({
      run_id: fixture.run.id,
      source_hash: revisionTextHash(fixture.sourceText),
      candidate_hash: checkpoint.candidate.hash,
    })
    expect(warnings).toHaveLength(1)
    expect(parsed(warnings[0].payload)).toMatchObject({
      source_run_id: fixture.run.id,
      chapter_id: fixture.chapters[0].id,
      following_written_range: { first: 2, last: 30, count: 29 },
    })
    expect(after.slice(1).every(item => item.tasks.length === 0)).toBe(true)
  }, 30_000)

  test('manual MCP quality starts a new task and Session after revision worker completion', async () => {
    const fixture = await createThirtyChapterWorkerFixture()
    await fixture.worker.start(fixture.workspace)
    await fixture.worker.waitForIdle()
    await fixture.worker.stop()

    const { app, handlers } = createRegisteredRouteHarness()
    const lifecycle = registerNovelEditorRoutes(app as any, fixture.ctx)
    const proseQuality = handlers.get('POST /api/novel/chapters/:chapterId/prose-quality')
    const response = await callRegisteredRoute(proseQuality, {
      params: { chapterId: String(fixture.chapters[0].id) },
      body: { project_id: fixture.project.id, source: 'task11_manual_quality_scope_test' },
    })
    await lifecycle.stop()

    expect(response.statusCode).toBe(200)
    expect(fixture.chapterTaskBegins).toHaveLength(2)
    const [revisionTask, manualTask] = fixture.chapterTaskBegins
    expect(revisionTask.input.chapter.id).toBe(fixture.chapters[0].id)
    expect(manualTask.input.chapter.id).toBe(fixture.chapters[0].id)
    expect(manualTask.taskId).not.toBe(revisionTask.taskId)
    expect(manualTask.sessionId).not.toBe(revisionTask.sessionId)
    expect(fixture.chapterTaskStages.filter(item => item.taskId === revisionTask.taskId).map(item => item.stage)).toEqual([
      'revision',
      'post_revision_review',
      'story_state_sync',
    ])
    expect(fixture.chapterTaskStages.filter(item => item.taskId === manualTask.taskId).map(item => item.stage)).toEqual([
      'manual_recheck',
    ])
  }, 30_000)

  test('real worker rejects a 5910 to 243 candidate without changing protected chapter or Story State data', async () => {
    const source = fixedScopeText('REJECT_SOURCE_SENTINEL', 5910)
    const candidate = fixedScopeText('REJECT_CANDIDATE_SENTINEL', 243)
    const fixture = await createThirtyChapterWorkerFixture({ sourceText: source, candidateText: candidate })
    const chapterIds = fixture.chapters.map((chapter: any) => chapter.id)
    const before = await chapterMutationSnapshot(fixture.workspace, fixture.project.id, chapterIds)
    const beforeRun = await getEditorRevisionRun(fixture.workspace, fixture.project.id, fixture.run.id)
    const beforeStoryState = storyStateMutationSnapshot(
      fixture.workspace,
      fixture.project.id,
      fixture.chapters[0].id,
    )

    await fixture.worker.start(fixture.workspace)
    await fixture.worker.waitForIdle()
    await fixture.worker.stop()

    const after = await chapterMutationSnapshot(fixture.workspace, fixture.project.id, chapterIds)
    const afterStoryState = storyStateMutationSnapshot(
      fixture.workspace,
      fixture.project.id,
      fixture.chapters[0].id,
    )
    const failedRun = await getEditorRevisionRun(fixture.workspace, fixture.project.id, fixture.run.id)
    const checkpoint = parsed(failedRun?.output_ref)

    expect(source.replace(/\s/g, '')).toHaveLength(5910)
    expect(candidate.replace(/\s/g, '')).toHaveLength(243)
    expect(fixture.revisionCalls).toEqual([fixture.chapters[0].id])
    expect(fixture.qualityCalls).toEqual([])
    expect(fixture.storyStateCalls).toEqual([])
    expect(snapshotWithoutRun(after, fixture.run.id)).toEqual(snapshotWithoutRun(before, fixture.run.id))
    const afterWithInjectedFailedRunTask = after.map((item, index) => index === 0 ? {
      ...item,
      tasks: [...item.tasks, {
        run_id: fixture.run.id,
        task_index: 0,
        task: {
          title: 'FAILED_RUN_TASK_NEGATIVE_CONTROL',
          chapter_id: fixture.chapters[0].id,
          task_status: 'open',
        },
      }],
    } : item)
    expect(snapshotWithoutRun(afterWithInjectedFailedRunTask, fixture.run.id))
      .not.toEqual(snapshotWithoutRun(before, fixture.run.id))
    expect(afterStoryState).toEqual(beforeStoryState)
    expect(beforeRun).not.toBeNull()
    expect(failedRun).not.toBeNull()
    expect(durableRunColumns(failedRun)).toEqual(durableRunColumns(beforeRun))
    expect(failedRun).toMatchObject({ status: 'failed', error_message: 'REVISION_CANDIDATE_TOO_SHORT' })
    expect(Object.keys(checkpoint).sort()).toEqual([
      'chapter_generation_source',
      'error',
      'phase',
      'phases',
      'prose_persisted',
      'runtime_config',
      'schema_version',
      'warnings',
    ])
    expect(checkpoint.runtime_config).toEqual({
      llm_timeout_ms: 600_000,
      story_state_max_tokens: 9_000,
    })
    expect(Object.keys(checkpoint.phases).sort()).toEqual([
      'admit_candidate',
      'completed',
      'generate_candidate',
      'persist_chapter',
      'post_quality',
      'record_continuity_warning',
      'sync_current_story_state',
    ])
    expect(checkpoint.candidate).toBeUndefined()
    expect(checkpoint.tasks).toBeUndefined()
    expect(checkpoint.followers).toBeUndefined()
    expect(checkpoint.follower_payload).toBeUndefined()
    expect(checkpoint.following_written_range).toBeUndefined()
    expect(Object.keys(checkpoint.error).sort()).toEqual(['code', 'diagnostics', 'message'])
    expect(Object.keys(checkpoint.error.diagnostics).sort()).toEqual([
      'applied_patch_count',
      'candidate_char_count',
      'complete_malformed_json_recovered',
      'maximum_char_count',
      'minimum_char_count',
      'rejected_candidate',
      'source_char_count',
      'unapplied_patch_count',
      'unapplied_patch_reasons',
    ])
    expect(checkpoint.error).toEqual({
      code: 'REVISION_CANDIDATE_TOO_SHORT',
      message: 'REVISION_CANDIDATE_TOO_SHORT: 修订候选明显短于原文',
      diagnostics: {
        source_char_count: 5910,
        candidate_char_count: 243,
        minimum_char_count: 4137,
        maximum_char_count: 7683,
        complete_malformed_json_recovered: false,
        applied_patch_count: 1,
        unapplied_patch_count: 0,
        unapplied_patch_reasons: [],
        rejected_candidate: {
          text: candidate,
          hash: revisionTextHash(candidate),
          char_count: 243,
        },
      },
    })
    expect(after.flatMap(item => item.versions)).toHaveLength(0)
    expect(after.flatMap(item => item.reviews)).toHaveLength(0)
  }, 30_000)

  test('registered manual Story State sync writes only chapter one in the same 30 chapter fixture', async () => {
    const fixture = await createThirtyChapterWorkerFixture()
    const chapterIds = fixture.chapters.map((chapter: any) => chapter.id)
    const before = await chapterMutationSnapshot(fixture.workspace, fixture.project.id, chapterIds)
    const { app, handlers } = createRegisteredRouteHarness()
    const lifecycle = registerNovelEditorRoutes(app as any, fixture.ctx)
    const storyStateSync = handlers.get('POST /api/novel/chapters/:chapterId/story-state-sync')

    const response = await callRegisteredRoute(storyStateSync, {
      params: { chapterId: String(fixture.chapters[0].id) },
      body: { project_id: fixture.project.id, source: 'task12_manual_scope_test' },
    })
    await lifecycle.stop()

    const after = await chapterMutationSnapshot(fixture.workspace, fixture.project.id, chapterIds)
    expect(response.statusCode).toBe(200)
    expect(response.body).toMatchObject({ ok: true, chapter_id: fixture.chapters[0].id })
    expect(fixture.revisionCalls).toEqual([])
    expect(fixture.qualityCalls).toEqual([])
    expect(fixture.storyStateCalls).toEqual([fixture.chapters[0].id])
    expect(fixture.followerRefreshCalls()).toBe(0)
    expect(after.slice(1)).toEqual(before.slice(1))
    expect(after[0].runs.filter((run: any) => run.run_type === 'story_state')).toHaveLength(1)
    expect(after[0].reviews.filter((review: any) => review.review_type === 'delivery_risk_convergence')).toHaveLength(1)
    expect(after.slice(1).every(item => item.tasks.length === 0)).toBe(true)
  }, 30_000)

  test('novel route package returns and delegates one editor revision lifecycle', async () => {
    const defaultWorkspace = '/tmp/default-editor-revision-workspace'
    const activeWorkspace = '/tmp/loaded-editor-revision-workspace'
    const lifecycle = registerNovelRoutes(express(), () => defaultWorkspace)
    const startCalls: string[] = []
    let stopCalls = 0

    expect(lifecycle.editorRevisionWorker).toBeDefined()
    lifecycle.editorRevisionWorker.start = async workspacePath => { startCalls.push(workspacePath) }
    lifecycle.editorRevisionWorker.stop = async () => { stopCalls += 1 }

    await lifecycle.start(activeWorkspace)
    await lifecycle.stop()

    expect(startCalls).toEqual([activeWorkspace])
    expect(stopCalls).toBe(1)
  })

  test('editor route lifecycle recovers only the loaded workspace and stops active work idempotently', async () => {
    const defaultWorkspace = await tempWorkspace()
    const activeWorkspace = await tempWorkspace()
    const createQueuedRun = async (workspacePath: string, title: string) => {
      const project = await createNovelProject(workspacePath, { title })
      const chapter = await createNovelChapter(workspacePath, {
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
      const run = await createEditorRevisionRun(workspacePath, {
        projectId: project.id,
        chapterId: chapter.id,
        inputRef: JSON.stringify(input),
        outputRef: JSON.stringify(initialCheckpoint()),
      })
      return { project, run }
    }
    const defaultFixture = await createQueuedRun(defaultWorkspace, 'default workspace project')
    const activeFixture = await createQueuedRun(activeWorkspace, 'active workspace project')
    const projectWorkspaceCalls: string[] = []
    const activeSignals: AbortSignal[] = []
    const executeAgent = async (_agentId: string, _project: any, _context: any, options: any) => {
      const signal = options.signal!
      activeSignals.push(signal)
      return new Promise<never>((_resolve, reject) => {
        if (signal.aborted) {
          reject(signal.reason)
          return
        }
        signal.addEventListener('abort', () => reject(signal.reason), { once: true })
      })
    }
    const lifecycle = registerNovelEditorRoutes(express(), {
      getWorkspace: () => defaultWorkspace,
      getProject: async (workspacePath, projectId) => {
        projectWorkspaceCalls.push(workspacePath)
        return getNovelProject(workspacePath, projectId)
      },
      buildChapterContextPackage: async () => ({}),
      getStageModelId: () => 19,
      getStageTemperature: (_project, _stage, fallback) => fallback,
      buildReferenceUsageReport: async () => ({}),
      buildStructuralSimilarityReport: () => ({}),
      buildReferenceMigrationDryPlan: () => ({}),
      diffTexts: () => ({}),
      beginChapterTask: async (input: any) => ({
        taskId: `lifecycle-${input.chapter.id}`,
        source: 'model',
        modelId: input.requestedModelId,
        fingerprint: 'lifecycle-source',
        contextVersion: 'lifecycle-context',
        provenance: () => ({}),
        generateDraft: async () => { throw new Error('not used') },
        executeAgent: async (_stage: string, _contract: string, agentId: string, project: any, context: any, options: any) => (
          executeAgent(agentId, project, context, options)
        ),
        assertCurrent: async () => {},
        close: async () => {},
      }),
      executeAgent,
      updateStoryStateMachine: async () => ({}),
    })

    expect(lifecycle.editorRevisionWorker).toBeDefined()
    await Promise.all([
      lifecycle.start(activeWorkspace),
      lifecycle.start(activeWorkspace),
    ])
    await eventually(() => activeSignals.length === 1, 'loaded workspace revision did not start')

    expect(projectWorkspaceCalls).toEqual([activeWorkspace])
    expect((await getEditorRevisionRun(defaultWorkspace, defaultFixture.project.id, defaultFixture.run.id))?.status).toBe('queued')
    expect((await getEditorRevisionRun(activeWorkspace, activeFixture.project.id, activeFixture.run.id))?.status).toBe('running')

    await Promise.all([
      lifecycle.stop(),
      lifecycle.stop(),
    ])

    expect(activeSignals).toHaveLength(1)
    expect(activeSignals.every(signal => signal.aborted)).toBe(true)
    expect((await getEditorRevisionRun(activeWorkspace, activeFixture.project.id, activeFixture.run.id))?.status).toBe('queued')
  })

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
    const worker = createWorkerWithTaskExecution({
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
    const worker = createWorkerWithTaskExecution({
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
    const worker = createWorkerWithTaskExecution({
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
    const worker = createWorkerWithTaskExecution({
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
    const worker = createWorkerWithTaskExecution({
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
    const worker = createWorkerWithTaskExecution({
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
    const worker = createWorkerWithTaskExecution({
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
    const worker = createWorkerWithTaskExecution({
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
    const worker = createWorkerWithTaskExecution({
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
    const worker = createWorkerWithTaskExecution({
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
    const worker = createWorkerWithTaskExecution({
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
    const worker = createWorkerWithTaskExecution({
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
    const worker = createWorkerWithTaskExecution({
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
    const worker = createWorkerWithTaskExecution({
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
    const worker = createWorkerWithTaskExecution({
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
    const worker = createWorkerWithTaskExecution({
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

  test('concurrent stop waits for in-flight initial recovery and prevents startup work', async () => {
    const harness = createHarness({ autoQuality: false, autoStoryState: false })
    let recoverEntered!: () => void
    let releaseRecovery!: () => void
    const entered = new Promise<void>(resolve => { recoverEntered = resolve })
    const recoveryGate = new Promise<void>(resolve => { releaseRecovery = resolve })
    let recoverCalls = 0
    const worker = harness.worker({
      recoverRuns: async () => {
        recoverCalls += 1
        recoverEntered()
        await recoveryGate
        return { queued: [harness.run.id], failedLegacy: [] }
      },
    })

    const starting = worker.start(workspace)
    await entered
    let resolvedStops = 0
    const firstStopRequest = worker.stop()
    const secondStopRequest = worker.stop()
    const sharedStop = firstStopRequest === secondStopRequest
    const firstStop = firstStopRequest.then(() => { resolvedStops += 1 })
    const secondStop = secondStopRequest.then(() => { resolvedStops += 1 })
    await new Promise(resolve => setTimeout(resolve, 0))
    const resolvedBeforeRecovery = resolvedStops
    releaseRecovery()
    await Promise.all([starting, firstStop, secondStop])

    expect(sharedStop).toBe(true)
    expect(resolvedBeforeRecovery).toBe(0)
    expect(resolvedStops).toBe(2)
    expect(recoverCalls).toBe(1)
    expect(harness.events.filter(event => event === 'claim')).toHaveLength(0)
    expect(harness.revisionCalls).toHaveLength(0)
    expect(harness.timeoutRegistrations).toHaveLength(0)
  })

  test('stop contains initial recovery failure while preserving the start caller rejection', async () => {
    const harness = createHarness({ autoQuality: false, autoStoryState: false })
    const failure = errorWithCode('SQLITE_BUSY')
    let recoverEntered!: () => void
    let rejectRecovery!: () => void
    const entered = new Promise<void>(resolve => { recoverEntered = resolve })
    const recoveryGate = new Promise<void>((_resolve, reject) => {
      rejectRecovery = () => reject(failure)
    })
    const worker = harness.worker({
      recoverRuns: async () => {
        recoverEntered()
        await recoveryGate
        return { queued: [], failedLegacy: [] }
      },
    })

    const starting = worker.start(workspace)
    await entered
    let stopResolved = false
    const stopping = worker.stop().then(() => { stopResolved = true })
    await new Promise(resolve => setTimeout(resolve, 0))
    const resolvedBeforeRecovery = stopResolved
    rejectRecovery()

    await expect(starting).rejects.toBe(failure)
    await stopping
    expect(resolvedBeforeRecovery).toBe(false)
    expect(stopResolved).toBe(true)
    expect(harness.events.filter(event => event === 'claim')).toHaveLength(0)
    expect(harness.timeoutRegistrations).toHaveLength(0)
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

  test('runs the writing-skill pass after admission and persists the rewritten prose', async () => {
    const skilled = `${'去味修订正文。'.repeat(190)}。`
    const skillCalls: any[][] = []
    const harness = createHarness({
      autoQuality: false,
      autoStoryState: false,
      runWritingSkillHumanizePass: async (...args: any[]) => {
        skillCalls.push(args)
        return {
          final_text: skilled,
          report: {
            version: 'writing_skill_humanize_v1',
            enabled_ids: ['fiction-humanizer-zh', 'remove-ai-flavor'],
            enabled: true,
            skipped: false,
            accepted: true,
            before_chars: candidateText.replace(/\s/g, '').length,
            after_chars: skilled.replace(/\s/g, '').length,
            chunk_count: 1,
          },
        }
      },
    })
    const worker = harness.worker()
    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.run.status).toBe('completed')
    expect(skillCalls).toHaveLength(1)
    expect(skillCalls[0][1]).toEqual(harness.project)
    expect(skillCalls[0][3]).toBe(candidateText)
    expect(skillCalls[0][5]?.writing_skills).toBeUndefined()
    expect(skillCalls[0][5]?.writingSkills).toBeUndefined()
    expect(harness.checkpoint().candidate).toMatchObject({
      text: skilled,
      hash: revisionTextHash(skilled),
    })
    expect(harness.checkpoint().writing_skill_humanize).toMatchObject({
      accepted: true,
      skipped: false,
      enabled_ids: ['fiction-humanizer-zh', 'remove-ai-flavor'],
    })
    expect(harness.chapter().chapter_text).toBe(skilled)
    expect(harness.chapter().raw_payload.writing_skill_humanize).toMatchObject({
      accepted: true,
      enabled_ids: ['fiction-humanizer-zh', 'remove-ai-flavor'],
    })
  })

  test('durably records skill progress while a pass runs and clears it from later checkpoints', async () => {
    const skilled = `${'去味修订正文。'.repeat(190)}。`
    const harness = createHarness({
      autoQuality: false,
      autoStoryState: false,
      runWritingSkillHumanizePass: async (...args: any[]) => {
        await args[5]?.onSkillProgress?.('remove-ai-flavor', { index: 2, total: 2 })
        return {
          final_text: skilled,
          report: {
            version: 'writing_skill_humanize_v1',
            enabled_ids: ['fiction-humanizer-zh', 'remove-ai-flavor'],
            enabled: true,
            skipped: false,
            accepted: true,
            before_chars: candidateText.replace(/\s/g, '').length,
            after_chars: skilled.replace(/\s/g, '').length,
            chunk_count: 1,
          },
        }
      },
    })
    const worker = harness.worker()
    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.run.status).toBe('completed')
    const progressWrites = harness.writes.filter(write => (write as any).skill_progress)
    expect(progressWrites).toHaveLength(1)
    expect((progressWrites[0] as any).skill_progress).toMatchObject({
      skill_id: 'remove-ai-flavor',
      index: 2,
      total: 2,
    })
    expect(typeof (progressWrites[0] as any).skill_progress.started_at).toBe('string')
    expect(progressWrites[0].phase).toBe('generate_candidate')
    expect(progressWrites[0].phases.generate_candidate.status).toBe('running')
    const lastWrite = harness.writes.at(-1) as any
    expect(lastWrite.skill_progress).toBeUndefined()
    expect((harness.checkpoint() as any).skill_progress).toBeUndefined()
    expect(harness.checkpoint().candidate?.text).toBe(skilled)
  })

  test('clears leftover skill progress when a resumed claim re-enters the phase', async () => {
    const resumed = initialCheckpoint()
    resumed.runtime_config = { llm_timeout_ms: 600_000, story_state_max_tokens: 9_000 }
    resumed.phases.generate_candidate = {
      status: 'running',
      attempt: 1,
      started_at: '2030-01-01T00:00:00.000Z',
    }
    resumed.skill_progress = {
      skill_id: 'remove-ai-flavor',
      index: 2,
      total: 2,
      started_at: '2030-01-01T00:00:00.500Z',
    }
    const harness = createHarness({
      autoQuality: false,
      autoStoryState: false,
      checkpoint: resumed,
    })
    const worker = harness.worker()
    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.run.status).toBe('completed')
    expect(harness.writes.length).toBeGreaterThan(0)
    expect((harness.writes[0] as any).skill_progress).toBeUndefined()
    expect(harness.writes.every(write => (write as any).skill_progress === undefined)).toBe(true)
  })

  test('keeps the admitted revision when the writing-skill pass throws', async () => {
    const harness = createHarness({
      autoQuality: false,
      autoStoryState: false,
      runWritingSkillHumanizePass: async () => {
        throw new Error('skill unavailable')
      },
    })
    const worker = harness.worker()
    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.run.status).toBe('completed')
    expect(harness.chapter().chapter_text).toBe(candidateText)
    expect(harness.checkpoint().candidate?.text).toBe(candidateText)
    expect(harness.checkpoint().writing_skill_humanize).toMatchObject({
      accepted: false,
      reason: 'writing_skill_humanize_failed',
    })
  })

  test('aborts the run when the skill pass surfaces a lease-or-state-invalid write failure', async () => {
    const harness = createHarness({
      autoQuality: false,
      autoStoryState: false,
      runWritingSkillHumanizePass: async () => {
        throw errorWithCode('REVISION_LEASE_OR_STATE_INVALID')
      },
    })
    const worker = harness.worker()
    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.run.status).not.toBe('completed')
    expect(harness.commitCalls()).toBe(0)
    expect(harness.checkpoint().writing_skill_humanize).toBeUndefined()
  })

  test('uses one frozen chapter task for revision, post-review, and Story State then closes success once', async () => {
    const harness = createHarness({ modelId: 73 })
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.begins).toHaveLength(1)
    expect(harness.begins[0]).toMatchObject({
      activeWorkspace: workspace,
      project: harness.project,
      chapter: { id: harness.input.chapter_id, chapter_text: sourceText },
      contextPackage: {
        chapter_target: { chapter_id: harness.input.chapter_id },
        snapshot: 'stable-worker-context',
      },
      requestedModelId: 73,
    })
    expect(harness.begins[0].signal).toBeInstanceOf(AbortSignal)
    expect(harness.contextBuildCalls).toHaveLength(1)
    expect(harness.stages.map(item => [item.args[0], item.args[1], item.args[2]])).toEqual([
      ['revision', 'revision_prose', 'prose-agent'],
      ['post_revision_review', 'quality_review_json', 'review-agent'],
      ['story_state_sync', 'story_state_json', 'review-agent'],
    ])
    expect(harness.events.indexOf('begin_chapter_task')).toBeLessThan(harness.events.indexOf('task_stage:revision'))
    expect(harness.stages.map(item => item.taskId)).toEqual([
      'revision-task-1',
      'revision-task-1',
      'revision-task-1',
    ])
    expect(harness.stages[0].args[5]).toMatchObject({
      activeWorkspace: workspace,
      responseMode: 'stream',
      skipMemory: true,
      maxRetries: 1,
    })
    expect(harness.stages[0].args[5].modelId).toBeUndefined()
    expect(harness.qualityCalls[0].at(-1)).toMatchObject({
      qualityStage: 'post_revision_review',
      chapterTaskExecution: expect.objectContaining({ taskId: 'revision-task-1' }),
      preparedContext: expect.objectContaining({
        contextPackage: expect.objectContaining({ snapshot: 'stable-worker-context' }),
      }),
    })
    expect(harness.prepareCalls[0][1]).toMatchObject({
      chapterTaskExecution: expect.objectContaining({ taskId: 'revision-task-1' }),
      exactContext: expect.objectContaining({
        contextPackage: expect.objectContaining({ snapshot: 'stable-worker-context' }),
      }),
    })
    expect(harness.applyCalls[0][1]).toMatchObject({
      chapterTaskExecution: expect.objectContaining({ taskId: 'revision-task-1' }),
      exactContext: expect.objectContaining({
        contextPackage: expect.objectContaining({ snapshot: 'stable-worker-context' }),
      }),
    })
    expect(harness.generateDraftCalls).toHaveLength(0)
    expect(harness.closeOutcomes).toEqual([{
      taskId: 'revision-task-1',
      outcome: { status: 'success' },
    }])
    expect(harness.events.indexOf('checkpoint:completed:completed'))
      .toBeLessThan(harness.events.indexOf('close:success'))
    expect(harness.checkpoint().chapter_generation_source).toEqual({
      task_id: 'revision-task-1',
      source: 'model',
      source_fingerprint: 'sha256:revision-fixture-fingerprint',
      context_version: 'revision-fixture-context-v1',
      model_id: 217,
    })
  })

  test.each([
    { stage: 'revision', expectedPhase: 'generate_candidate' },
    { stage: 'post_revision_review', expectedPhase: 'post_quality' },
    { stage: 'story_state_sync', expectedPhase: 'sync_current_story_state' },
  ] as const)('closes one failed task with the original $stage error', async ({ stage, expectedPhase }) => {
    const failure = errorWithCode(`INJECTED_${stage.toUpperCase()}_FAILURE`)
    const harness = createHarness({
      executeTaskStage: async (actualStage: string) => {
        if (actualStage === stage) throw failure
        if (actualStage === 'revision') return completeResult()
        if (actualStage === 'post_revision_review') return { parsed: { passed: true, score: 96 } }
        return { parsed: { state_delta: {} } }
      },
    })
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.run.status).toBe('failed')
    expect(harness.checkpoint().phase).toBe(expectedPhase)
    expect(harness.closeOutcomes).toHaveLength(1)
    expect(harness.closeOutcomes[0]).toMatchObject({
      taskId: 'revision-task-1',
      outcome: { status: 'failed' },
    })
    expect(harness.closeOutcomes[0].outcome.error).toBe(failure)
    expect(harness.events.indexOf(`checkpoint:${expectedPhase}:failed`))
      .toBeLessThan(harness.events.indexOf('close:failed'))
  })

  test('cancellation while a task stage waits closes cancelled once with the abort reason', async () => {
    let stageEntered!: () => void
    const entered = new Promise<void>(resolve => { stageEntered = resolve })
    let abortReason: unknown
    const harness = createHarness({
      executeTaskStage: async (_stage: string, _contract: string, _agent: string, _project: any, _context: any, callOptions: any) => {
        stageEntered()
        return new Promise((_resolve, reject) => {
          callOptions.signal.addEventListener('abort', () => {
            abortReason = callOptions.signal.reason
            reject(abortReason)
          }, { once: true })
        })
      },
    })
    const worker = harness.worker()

    await worker.start(workspace)
    await entered
    harness.requestCancel(worker)
    await worker.waitForIdle()

    expect(harness.run.status).toBe('canceled')
    expect(harness.closeOutcomes).toHaveLength(1)
    expect(harness.closeOutcomes[0].outcome.status).toBe('cancelled')
    expect(harness.closeOutcomes[0].outcome.error).toBe(abortReason)
    expect(harness.events.indexOf('canceled')).toBeLessThan(harness.events.indexOf('close:cancelled'))
  })

  test('uses durable cancellation when a provider failure races a persisted cancel request', async () => {
    const providerFailure = errorWithCode('INJECTED_PROVIDER_FAILURE')
    let harness!: ReturnType<typeof createHarness>
    harness = createHarness({
      executeTaskStage: async () => {
        harness.run.status = 'cancel_requested'
        harness.run.cancel_requested_at = '2030-01-01T00:00:02.000Z'
        throw providerFailure
      },
    })
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.run.status).toBe('canceled')
    expect(harness.closeOutcomes).toHaveLength(1)
    expect(harness.closeOutcomes[0].outcome).toEqual({
      status: 'cancelled',
      error: providerFailure,
    })
  })

  test('stop closes the active task before requeueing its worker claim', async () => {
    let stageEntered!: () => void
    const entered = new Promise<void>(resolve => { stageEntered = resolve })
    const harness = createHarness({
      executeTaskStage: async (_stage: string, _contract: string, _agent: string, _project: any, _context: any, callOptions: any) => {
        stageEntered()
        return new Promise((_resolve, reject) => {
          callOptions.signal.addEventListener('abort', () => reject(callOptions.signal.reason), { once: true })
        })
      },
    })
    const worker = harness.worker()

    await worker.start(workspace)
    await entered
    await worker.stop()

    expect(harness.closeOutcomes).toHaveLength(1)
    expect(harness.closeOutcomes[0].outcome).toMatchObject({ status: 'cancelled' })
    expect((harness.closeOutcomes[0].outcome.error as any)?.code).toBe('REVISION_WORKER_STOPPED')
    expect(harness.run.status).toBe('queued')
    expect(harness.events.indexOf('close:cancelled')).toBeLessThan(harness.events.indexOf('release'))
  })

  test('contains a close failure after durable success while stop waits for worker cleanup', async () => {
    const closeFailure = errorWithCode('INJECTED_CLOSE_FAILURE')
    let closeEntered!: () => void
    const entered = new Promise<void>(resolve => { closeEntered = resolve })
    let rejectClose!: (error: unknown) => void
    const closeGate = new Promise<void>((_resolve, reject) => { rejectClose = reject })
    const harness = createHarness({
      closeTask: async () => {
        closeEntered()
        return closeGate
      },
    })
    const worker = harness.worker()

    await worker.start(workspace)
    await entered
    const stopping = worker.stop()
    rejectClose(closeFailure)

    await expect(stopping).resolves.toBeUndefined()
    expect(harness.run.status).toBe('completed')
    expect(harness.closeOutcomes).toEqual([{
      taskId: 'revision-task-1',
      outcome: { status: 'success' },
    }])
    expect(harness.closeFailureReports).toEqual([{
      runId: harness.run.id,
      projectId: harness.project.id,
      errorCode: 'INJECTED_CLOSE_FAILURE',
    }])
  })

  test('reports an undefined close rejection after durable success without leaking a message', async () => {
    const warnings: unknown[][] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => { warnings.push(args) }
    try {
      const harness = createHarness({
        closeTask: async () => Promise.reject(undefined),
        useDefaultCloseFailureReporter: true,
      })
      const worker = harness.worker()

      await worker.start(workspace)
      await worker.waitForIdle()
      await expect(worker.stop()).resolves.toBeUndefined()

      expect(harness.run.status).toBe('completed')
      expect(harness.closeOutcomes).toEqual([{
        taskId: 'revision-task-1',
        outcome: { status: 'success' },
      }])
      expect(warnings).toEqual([[
        '[editor-revision-worker] chapter task close failed: REVISION_TASK_CLOSE_FAILED',
      ]])
      expect(JSON.stringify(warnings)).not.toContain('message')
    } finally {
      console.warn = originalWarn
    }
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

  test('serializes overlapping heartbeat ticks and aborts on renewal failure', async () => {
    let renewalEntered!: () => void
    let releaseRenewal!: () => void
    const entered = new Promise<void>(resolve => { renewalEntered = resolve })
    const renewalGate = new Promise<void>(resolve => { releaseRenewal = resolve })
    let renewalAttempts = 0
    let providerAborted = false
    const harness = createHarness({
      executeRevision: async (_agent, _project, _request, callOptions) => new Promise((_resolve, reject) => {
        callOptions.signal.addEventListener('abort', () => {
          providerAborted = true
          reject(callOptions.signal.reason)
        }, { once: true })
      }),
      renewLease: async () => {
        renewalAttempts += 1
        renewalEntered()
        await renewalGate
        throw errorWithCode('SQLITE_BUSY')
      },
    })
    const worker = harness.worker()
    await worker.start(workspace)
    await eventually(() => harness.intervalRegistrations.length === 1)
    await eventually(() => harness.revisionCalls.length === 1)

    const heartbeat = harness.intervalRegistrations[0]
    const first = Promise.resolve(heartbeat.callback())
    const second = Promise.resolve(heartbeat.callback())
    await entered
    const attemptsWhileBlocked = renewalAttempts
    releaseRenewal()
    await Promise.all([first, second])
    await worker.waitForIdle()

    expect(attemptsWhileBlocked).toBe(1)
    expect(renewalAttempts).toBe(1)
    expect(providerAborted).toBe(true)
    expect(harness.run.status).toBe('running')
    expect(harness.commitCalls()).toBe(0)
    expect(heartbeat.cleared).toBe(true)
  })

  test('stop awaits a gated real heartbeat before requeueing the live claim', async () => {
    const activeWorkspace = await tempWorkspace()
    const project = await createNovelProject(activeWorkspace, { title: 'heartbeat stop quiescence' })
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
    const intervals: Array<{ callback: () => void | Promise<void>; ms: number; cleared: boolean }> = []
    const timeouts: Array<{ callback: () => void; ms: number; cleared: boolean }> = []
    let providerEntered!: () => void
    let providerAborted!: () => void
    const entered = new Promise<void>(resolve => { providerEntered = resolve })
    const aborted = new Promise<void>(resolve => { providerAborted = resolve })
    let modelCalls = 0
    let qualityCalls = 0
    let storyPrepareCalls = 0
    let storyApplyCalls = 0
    const worker = createWorkerWithTaskExecution({
      getWorkspace: () => activeWorkspace,
      getProject: async () => project,
      getStageModelId: () => 19,
      getStageTemperature: (_project: any, _stage: string, fallback: number) => fallback,
    } as any, {
      executeRevision: async (_agent, _project, _request, callOptions) => {
        modelCalls += 1
        providerEntered()
        return new Promise((_resolve, reject) => {
          callOptions.signal.addEventListener('abort', () => {
            providerAborted()
            reject(callOptions.signal.reason)
          }, { once: true })
        })
      },
      createQualityReview: async () => {
        qualityCalls += 1
        throw errorWithCode('UNEXPECTED_POST_STOP_QUALITY')
      },
      prepareStoryState: async () => {
        storyPrepareCalls += 1
        throw errorWithCode('UNEXPECTED_POST_STOP_STORY_PREPARE')
      },
      applyStoryState: async () => {
        storyApplyCalls += 1
        throw errorWithCode('UNEXPECTED_POST_STOP_STORY_APPLY')
      },
      setInterval: (callback, ms) => {
        const interval = { callback, ms, cleared: false }
        intervals.push(interval)
        return interval
      },
      clearInterval: interval => { interval.cleared = true },
      setTimeout: (callback, ms) => {
        const timeout = { callback, ms, cleared: false }
        timeouts.push(timeout)
        return timeout
      },
      clearTimeout: timeout => { timeout.cleared = true },
    })

    await worker.start(activeWorkspace)
    const providerStarted = await Promise.race([
      entered.then(() => true),
      worker.waitForIdle().then(() => false),
    ])
    if (!providerStarted) {
      throw new Error(`provider did not enter: ${JSON.stringify(await getEditorRevisionRun(activeWorkspace, project.id, run.id))}`)
    }
    expect(intervals).toHaveLength(1)
    const heartbeat = intervals[0]
    const holder = await holdNovelMutationLock(activeWorkspace, 'heartbeat-stop-holder')
    const renewal = Promise.resolve(heartbeat.callback())
    const lockKey = novelMutationKey(activeWorkspace)
    await eventually(
      () => (novelMutationLocks.get(lockKey)?.waiters.length || 0) === 1,
      'real heartbeat did not enter the workspace mutation lock queue',
    )
    let resolvedStops = 0
    const stopping = Promise.all([
      worker.stop().then(() => { resolvedStops += 1 }),
      worker.stop().then(() => { resolvedStops += 1 }),
    ])
    await aborted
    await new Promise(resolve => setTimeout(resolve, 0))
    const resolvedBeforeHeartbeat = resolvedStops

    await holder.release()
    await renewal
    await stopping

    expect(resolvedBeforeHeartbeat).toBe(0)
    expect(resolvedStops).toBe(2)
    expect(heartbeat.cleared).toBe(true)
    const stoppedRun = await getEditorRevisionRun(activeWorkspace, project.id, run.id)
    expect(stoppedRun).toMatchObject({
      status: 'queued',
      lease_owner: null,
      lease_expires_at: null,
    })
    expect((await recoverEditorRevisionRuns(activeWorkspace)).queued).toContain(run.id)

    const stoppedSnapshot = {
      run: stoppedRun,
      project: await getNovelProject(activeWorkspace, project.id),
      chapter: await getNovelChapter(activeWorkspace, chapter.id, project.id),
      versions: await listChapterVersions(activeWorkspace, chapter.id),
      reviews: await listNovelReviews(activeWorkspace, project.id),
    }
    await heartbeat.callback()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect({
      run: await getEditorRevisionRun(activeWorkspace, project.id, run.id),
      project: await getNovelProject(activeWorkspace, project.id),
      chapter: await getNovelChapter(activeWorkspace, chapter.id, project.id),
      versions: await listChapterVersions(activeWorkspace, chapter.id),
      reviews: await listNovelReviews(activeWorkspace, project.id),
    }).toEqual(stoppedSnapshot)
    expect(modelCalls).toBe(1)
    expect(qualityCalls).toBe(0)
    expect(storyPrepareCalls).toBe(0)
    expect(storyApplyCalls).toBe(0)
    expect(timeouts.filter(timeout => !timeout.cleared)).toHaveLength(0)
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
    expect(harness.closeOutcomes).toHaveLength(1)
    expect(harness.closeOutcomes[0].outcome).toMatchObject({ status: 'failed' })
    expect((harness.closeOutcomes[0].outcome.error as any)?.code).toBe('REVISION_LEASE_LOST')
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
    const worker = createWorkerWithTaskExecution(ctx, {
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
    const worker = createWorkerWithTaskExecution(ctx, {
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
    const worker = createWorkerWithTaskExecution(ctx, {
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

  test('a refreshed Story State retry uses the current budget without repeating committed work', async () => {
    const checkpoint = persistedCheckpoint()
    checkpoint.phase = 'sync_current_story_state'
    checkpoint.phases.post_quality = { status: 'completed', attempt: 1 }
    checkpoint.phases.sync_current_story_state = { status: 'pending', attempt: 1 }
    checkpoint.runtime_config = { llm_timeout_ms: 600_000 }
    const harness = createHarness({ checkpoint })
    harness.project.reference_config = {
      editor_revision: { timeout_seconds: 420, story_state_max_tokens: 12_000 },
    }
    installMatchingCommitMarker(harness)
    const committedChapter = harness.chapter()
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.prepareCalls).toHaveLength(1)
    expect(harness.prepareCalls[0][1]).toMatchObject({
      projectId: harness.run.project_id,
      chapterId: harness.input.chapter_id,
      maxTokens: 12_000,
      receipt: {
        source_run_id: harness.run.id,
        chapter_id: harness.input.chapter_id,
        candidate_hash: checkpoint.candidate?.hash,
      },
    })
    expect(harness.checkpoint().runtime_config).toEqual({
      llm_timeout_ms: 600_000,
      story_state_max_tokens: 12_000,
    })
    expect(harness.revisionCalls).toHaveLength(0)
    expect(harness.qualityCalls).toHaveLength(0)
    expect(harness.commitCalls()).toBe(0)
    expect(harness.versionWrites()).toBe(0)
    expect(harness.chapter()).toEqual(committedChapter)
    expect(harness.chapter().raw_payload.editor_revision_commit).toMatchObject({
      run_id: harness.run.id,
      candidate_hash: checkpoint.candidate?.hash,
    })
  })

  test('freezes the requested model at task begin instead of forwarding it to post-quality', async () => {
    const checkpoint = persistedCheckpoint()
    const harness = createHarness({ checkpoint, modelId: 36 })
    installMatchingCommitMarker(harness)
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.qualityCalls).toHaveLength(1)
    expect(harness.begins[0]).toMatchObject({ requestedModelId: 36 })
    expect(harness.qualityCalls[0].at(-1).model_id).toBeUndefined()
    expect(harness.qualityCalls[0].at(-1).chapterTaskExecution.modelId).toBe(217)
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
    harness.project.reference_config = {
      editor_revision: { timeout_seconds: 420, story_state_max_tokens: 12_000 },
    }
    installMatchingCommitMarker(harness)
    const first = harness.worker()
    await first.start(workspace)
    await first.waitForIdle()
    expect(harness.prepareCalls).toHaveLength(1)
    expect(harness.applyCalls).toHaveLength(0)
    expect(harness.checkpoint().runtime_config).toEqual({
      llm_timeout_ms: 420_000,
      story_state_max_tokens: 12_000,
    })
    expect(harness.prepareCalls[0][1].maxTokens).toBe(12_000)
    expect(JSON.stringify(harness.checkpoint().story_state)).not.toContain('memory-only')

    harness.project.reference_config.editor_revision = {
      timeout_seconds: 600,
      story_state_max_tokens: 64_000,
    }
    harness.requeue()
    harness.setWriteCrash(undefined)
    const restarted = harness.worker()
    await restarted.start(workspace)
    await restarted.waitForIdle()

    expect(harness.prepareCalls).toHaveLength(1)
    expect(harness.applyCalls).toHaveLength(1)
    expect(harness.checkpoint().runtime_config).toEqual({
      llm_timeout_ms: 420_000,
      story_state_max_tokens: 12_000,
    })
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
    expect(harness.closeOutcomes).toHaveLength(1)
    expect(harness.closeOutcomes[0].outcome).toMatchObject({ status: 'cancelled' })
    expect((harness.closeOutcomes[0].outcome.error as any)?.code).toBe('REVISION_CANCELED')
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

  test('aborts a never-resolving revision call at the default 600 seconds', async () => {
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
    await eventually(() => harness.timeoutRegistrations.some(item => item.ms === 600_000))
    const timeout = harness.timeoutRegistrations.find(item => item.ms === 600_000)!
    timeout.callback()
    await worker.waitForIdle()

    expect(providerAborted).toBe(true)
    expect(harness.run.status).toBe('failed')
    expect(harness.checkpoint()).toMatchObject({
      runtime_config: { llm_timeout_ms: 600_000 },
      error: {
        code: 'REVISION_LLM_TIMEOUT',
        message: 'editor revision model call timed out after 600 seconds',
      },
    })
    expect(harness.closeOutcomes).toHaveLength(1)
    expect(harness.closeOutcomes[0].outcome).toMatchObject({ status: 'failed' })
    expect((harness.closeOutcomes[0].outcome.error as any)?.code).toBe('REVISION_LLM_TIMEOUT')
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
    expect(harness.revisionCalls[0][3]).toMatchObject({ timeoutMs: 600_000, maxRetries: 1 })
  })

  test('snapshots the project runtime config and forwards the exact Story State budget and model', async () => {
    const harness = createHarness({ modelId: 73 })
    harness.project.reference_config = {
      editor_revision: { timeout_seconds: 420, story_state_max_tokens: 12_000 },
    }
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.checkpoint().runtime_config).toEqual({
      llm_timeout_ms: 420_000,
      story_state_max_tokens: 12_000,
    })
    expect(harness.revisionCalls[0][3]).toMatchObject({ timeoutMs: 420_000, maxRetries: 1 })
    expect(harness.qualityCalls[0].at(-1)).toMatchObject({ timeoutMs: 420_000, maxRetries: 1 })
    expect(harness.prepareCalls[0][1]).toMatchObject({
      timeoutMs: 420_000,
      maxRetries: 1,
      maxTokens: 12_000,
      chapterTaskExecution: expect.objectContaining({ modelId: 217 }),
    })
    expect(harness.applyCalls[0][1]).toMatchObject({ timeoutMs: 420_000, maxRetries: 1 })
    expect(harness.timeoutRegistrations.filter(item => item.ms === 420_000)).toHaveLength(4)
  })

  test('preserves a legacy timeout snapshot and only fills its missing Story State budget', async () => {
    const checkpoint = initialCheckpoint()
    checkpoint.runtime_config = { llm_timeout_ms: 240_000 }
    const harness = createHarness({ checkpoint })
    harness.project.reference_config = {
      editor_revision: { timeout_seconds: 420, story_state_max_tokens: 12_000 },
    }
    const worker = harness.worker()

    await worker.start(workspace)
    await worker.waitForIdle()

    expect(harness.checkpoint().runtime_config).toEqual({
      llm_timeout_ms: 240_000,
      story_state_max_tokens: 12_000,
    })
    expect(harness.revisionCalls[0][3].timeoutMs).toBe(240_000)
    expect(harness.qualityCalls[0].at(-1).timeoutMs).toBe(240_000)
    expect(harness.prepareCalls[0][1]).toMatchObject({ timeoutMs: 240_000, maxTokens: 12_000 })
  })

  test('keeps committed prose when post-quality reaches the configured timeout', async () => {
    const harness = createHarness({ quality: async () => new Promise(() => {}) })
    const worker = harness.worker()
    await worker.start(workspace)
    await eventually(() => harness.qualityCalls.length === 1)
    const timer = harness.timeoutRegistrations.find(item => item.ms === 600_000 && !item.cleared)
    expect(timer).toBeDefined()

    timer!.callback()
    await worker.waitForIdle()

    expect(harness.run.status).toBe('failed')
    expect(harness.checkpoint()).toMatchObject({
      phase: 'post_quality',
      prose_persisted: true,
      runtime_config: { llm_timeout_ms: 600_000 },
      error: {
        code: 'REVISION_LLM_TIMEOUT',
        message: 'editor revision model call timed out after 600 seconds',
      },
    })
    expect(harness.commitCalls()).toBe(1)
    expect(harness.chapter().chapter_text).toBe(candidateText)
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
