import { afterEach, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { join } from 'path'
import type {
  EditorRevisionCheckpoint,
  EditorRevisionPhase,
  EditorRevisionPhaseState,
} from '../../routes/novel-editor/editor-revision-contract'
import { ensureSqliteSchema } from '../db'
import { revisionTextHash } from '../revision-hash'
import { tempWorkspace, workspaces } from '../test-utils'
import {
  appendNovelRun,
  compactNovelStorage,
  createNovelChapter,
  createNovelProject,
  getNovelRun,
  listNovelRuns,
  listNovelRunSummaries,
  updateNovelRun,
} from '../store'
import {
  claimEditorRevisionRun,
  createEditorRevisionRun,
  finishEditorRevisionCancellation,
  getEditorRevisionRun,
  recoverEditorRevisionRuns,
  requeueEditorRevisionRun,
  renewEditorRevisionLease,
  requestEditorRevisionCancel,
  retryEditorRevisionRun,
  writeEditorRevisionCheckpoint,
} from './editor-revision-runs'

const PHASES = [
  'generate_candidate',
  'admit_candidate',
  'persist_chapter',
  'post_quality',
  'sync_current_story_state',
  'record_continuity_warning',
  'completed',
] as const

function initialCheckpoint(): EditorRevisionCheckpoint {
  return {
    schema_version: 1,
    phase: 'generate_candidate',
    phases: Object.fromEntries(PHASES.map(phase => [phase, {
      status: 'pending',
      attempt: 0,
    }])) as Record<EditorRevisionPhase, EditorRevisionPhaseState>,
    prose_persisted: false,
    warnings: [],
  }
}

function checkpointAt(
  phase: EditorRevisionPhase,
  statuses: Partial<Record<EditorRevisionPhase, EditorRevisionPhaseState['status']>>,
  extra: Partial<EditorRevisionCheckpoint> = {},
): EditorRevisionCheckpoint {
  const checkpoint = initialCheckpoint()
  checkpoint.phase = phase
  for (const [name, status] of Object.entries(statuses)) {
    checkpoint.phases[name as EditorRevisionPhase] = {
      status: status!,
      attempt: status === 'pending' ? 0 : 1,
    }
  }
  return { ...checkpoint, ...extra }
}

function runInput(chapterId: number) {
  return JSON.stringify({ schema_version: 1, chapter_id: chapterId, source_text: `source-${chapterId}` })
}

function runOutput(checkpoint = initialCheckpoint()) {
  return JSON.stringify(checkpoint)
}

async function createFixture(chapterNumbers = [1]) {
  const workspace = await tempWorkspace()
  const project = await createNovelProject(workspace, { title: 'editor revision repository' })
  const chapters = []
  for (const chapterNo of chapterNumbers) {
    chapters.push(await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: chapterNo,
      title: `chapter ${chapterNo}`,
      chapter_text: `source ${chapterNo}`,
    }))
  }
  return { workspace, project, chapters }
}

async function createRun(workspace: string, projectId: number, chapterId: number) {
  return createEditorRevisionRun(workspace, {
    projectId,
    chapterId,
    inputRef: runInput(chapterId),
    outputRef: runOutput(),
  })
}

afterEach(async () => {
  const { rm } = await import('fs/promises')
  await Promise.all(workspaces.splice(0).map(workspace => rm(workspace, { recursive: true, force: true })))
})

describe('editor revision run repository', () => {
  test('creates one active run per chapter while allowing different chapter scopes', async () => {
    const { workspace, project, chapters: [chapter1, chapter2] } = await createFixture([3, 4])

    const attempts = await Promise.allSettled([
      createRun(workspace, project.id, chapter1.id),
      createRun(workspace, project.id, chapter1.id),
    ])
    const fulfilled = attempts.filter(result => result.status === 'fulfilled')
    const rejected = attempts.filter(result => result.status === 'rejected') as PromiseRejectedResult[]

    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    const first = (fulfilled[0] as PromiseFulfilledResult<any>).value
    expect(first).toMatchObject({
      run_type: 'editor_revision',
      step_name: 'chapter-3',
      status: 'queued',
      scope_key: `chapter:${chapter1.id}`,
      lease_owner: null,
    })
    expect(first.updated_at).toBe(first.created_at)
    expect(rejected[0].reason).toMatchObject({
      code: 'REVISION_ALREADY_ACTIVE',
      existingRunId: first.id,
      statusUrl: `/api/novel/editor-revisions/${first.id}?project_id=${project.id}`,
    })

    const other = await createRun(workspace, project.id, chapter2.id)
    expect(other.id).not.toBe(first.id)
    expect(other.scope_key).toBe(`chapter:${chapter2.id}`)
  })

  test('preserves the exact immutable source and bounded context input on create', async () => {
    const { workspace, project, chapters: [chapter] } = await createFixture()
    const inputRef = JSON.stringify({
      schema_version: 1,
      project_id: project.id,
      chapter_id: chapter.id,
      source_text: 'immutable-source'.repeat(6_000),
      source_text_hash: 'source-hash',
      context_package: {
        chapter_target: { id: chapter.id, title: chapter.title },
        continuity: { required_anchor: 'must-survive-byte-for-byte' },
      },
    })
    const outputRef = runOutput()

    const run = await createEditorRevisionRun(workspace, {
      projectId: project.id,
      chapterId: chapter.id,
      inputRef,
      outputRef,
    })

    expect(run.input_ref).toBe(inputRef)
    expect(run.output_ref).toBe(outputRef)
    expect((await getEditorRevisionRun(workspace, project.id, run.id))?.input_ref).toBe(inputRef)
  })

  test('keeps an admitted candidate checkpoint exact through persistence and maintenance compaction', async () => {
    const { workspace, project, chapters: [chapter] } = await createFixture()
    const inputRef = JSON.stringify({
      schema_version: 1,
      project_id: project.id,
      chapter_id: chapter.id,
      source_text: 'source'.repeat(12_000),
      source_text_hash: 'source-hash',
      context_package: { exact_receipt: 'bounded-context-must-survive' },
    })
    const run = await createEditorRevisionRun(workspace, {
      projectId: project.id,
      chapterId: chapter.id,
      inputRef,
      outputRef: runOutput(),
    })
    await claimEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-a',
      now: '2030-07-27T10:00:00.000Z',
      leaseMs: 60_000,
    })
    const admittedCandidateText = 'admitted-candidate'.repeat(5_000)
    const admitted = checkpointAt('persist_chapter', {
      generate_candidate: 'completed',
      admit_candidate: 'completed',
      persist_chapter: 'running',
    }, {
      candidate: {
        text: admittedCandidateText,
        hash: revisionTextHash(admittedCandidateText),
        char_count: admittedCandidateText.length,
        applied_patches: [{ anchor: 'exact-patch-receipt' }],
        diagnostics: { provider_receipt: 'exact-provider-receipt' },
      },
    })
    const checkpointRef = JSON.stringify(admitted)

    const written = await writeEditorRevisionCheckpoint(workspace, {
      runId: run.id,
      owner: 'worker-a',
      status: 'running',
      phase: 'persist_chapter',
      checkpoint: admitted,
    })
    expect(written.output_ref).toBe(checkpointRef)

    await compactNovelStorage(workspace, { vacuum: false, maxChars: 1_000 })
    const after = await getEditorRevisionRun(workspace, project.id, run.id)
    expect(after?.input_ref).toBe(inputRef)
    expect(after?.output_ref).toBe(checkpointRef)
    expect(JSON.parse(after?.output_ref || '{}')).toMatchObject({
      phase: 'persist_chapter',
      candidate: {
        text: admitted.candidate?.text,
        hash: revisionTextHash(admittedCandidateText),
        applied_patches: [{ anchor: 'exact-patch-receipt' }],
        diagnostics: { provider_receipt: 'exact-provider-receipt' },
      },
    })
  })

  test.each([
    {
      label: 'candidate evidence before completed admission',
      mutate: (checkpoint: EditorRevisionCheckpoint) => {
        checkpoint.candidate = {
          text: 'candidate text',
          hash: revisionTextHash('candidate text'),
          char_count: 13,
          applied_patches: [],
          diagnostics: {},
        }
      },
    },
    {
      label: 'candidate hash mismatch',
      mutate: (checkpoint: EditorRevisionCheckpoint) => {
        checkpoint.phase = 'admit_candidate'
        checkpoint.phases.generate_candidate = { status: 'completed', attempt: 1 }
        checkpoint.phases.admit_candidate = { status: 'completed', attempt: 1 }
        checkpoint.candidate = {
          text: 'candidate text',
          hash: revisionTextHash('different text'),
          char_count: 13,
          applied_patches: [],
          diagnostics: {},
        }
      },
    },
    {
      label: 'candidate character-count mismatch',
      mutate: (checkpoint: EditorRevisionCheckpoint) => {
        checkpoint.phase = 'admit_candidate'
        checkpoint.phases.generate_candidate = { status: 'completed', attempt: 1 }
        checkpoint.phases.admit_candidate = { status: 'completed', attempt: 1 }
        checkpoint.candidate = {
          text: 'candidate text',
          hash: revisionTextHash('candidate text'),
          char_count: 999,
          applied_patches: [],
          diagnostics: {},
        }
      },
    },
  ])('rejects $label in a canonical run checkpoint', async ({ mutate }) => {
    const { workspace, project, chapters: [chapter] } = await createFixture()
    const checkpoint = initialCheckpoint()
    mutate(checkpoint)

    await expect(createEditorRevisionRun(workspace, {
      projectId: project.id,
      chapterId: chapter.id,
      inputRef: runInput(chapter.id),
      outputRef: JSON.stringify(checkpoint),
    })).rejects.toMatchObject({ code: 'REVISION_CHECKPOINT_INVALID' })
  })

  test('enforces the active chapter scope across two concurrent Bun processes', async () => {
    const { workspace, project, chapters: [chapter] } = await createFixture()
    const repositoryModule = join(import.meta.dir, 'editor-revision-runs.ts')
    const childSource = `
      import { createEditorRevisionRun } from ${JSON.stringify(repositoryModule)}
      try {
        const run = await createEditorRevisionRun(process.argv[1], {
          projectId: Number(process.argv[2]),
          chapterId: Number(process.argv[3]),
          inputRef: process.argv[4],
          outputRef: process.argv[5],
        })
        console.log(JSON.stringify({ ok: true, id: run.id }))
      } catch (error) {
        console.log(JSON.stringify({ ok: false, code: error?.code, existingRunId: error?.existingRunId }))
      }
    `
    const args = [workspace, String(project.id), String(chapter.id), runInput(chapter.id), runOutput()]
    const children = [0, 1].map(() => Bun.spawn({
      cmd: [process.execPath, '-e', childSource, ...args],
      stdout: 'pipe',
      stderr: 'pipe',
    }))
    const results = await Promise.all(children.map(async child => {
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])
      expect(exitCode, stderr).toBe(0)
      return JSON.parse(stdout.trim())
    }))

    expect(results.filter(result => result.ok)).toHaveLength(1)
    expect(results.filter(result => !result.ok)).toHaveLength(1)
    expect(results.find(result => !result.ok)).toMatchObject({
      code: 'REVISION_ALREADY_ACTIVE',
      existingRunId: results.find(result => result.ok).id,
    })
  })

  test('does not translate unrelated database constraints into an active-run error', async () => {
    const workspace = await tempWorkspace()
    const error = await createEditorRevisionRun(workspace, {
      projectId: 999_999,
      chapterId: 1,
      inputRef: '{}',
      outputRef: runOutput(),
    }).then(() => null, caught => caught)

    expect(error).toBeTruthy()
    expect(error?.code).not.toBe('REVISION_ALREADY_ACTIVE')
    expect(String(error)).toContain('FOREIGN KEY constraint failed')
  })

  test('claims queued work and permits lease stealing only after expiry', async () => {
    const { workspace, project, chapters: [chapter] } = await createFixture()
    const run = await createRun(workspace, project.id, chapter.id)

    const claimed = await claimEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-a',
      now: '2030-07-27T10:00:00.000Z',
      leaseMs: 30_000,
    })
    expect(claimed).toMatchObject({
      status: 'running',
      lease_owner: 'worker-a',
      lease_expires_at: '2030-07-27T10:00:30.000Z',
      updated_at: '2030-07-27T10:00:00.000Z',
    })
    expect(await claimEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-b',
      now: '2030-07-27T10:00:10.000Z',
      leaseMs: 30_000,
    })).toBeNull()
    expect(await claimEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-b',
      now: '2030-07-27T10:00:31.000Z',
      leaseMs: 30_000,
    })).toMatchObject({
      status: 'running',
      lease_owner: 'worker-b',
      lease_expires_at: '2030-07-27T10:01:01.000Z',
    })
  })

  test('requeues only a same-owner live claim and never clears a takeover or expired lease', async () => {
    const { workspace, project, chapters: [chapter] } = await createFixture()
    const run = await createRun(workspace, project.id, chapter.id)

    await claimEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-a',
      now: '2030-07-27T10:00:00.000Z',
      leaseMs: 30_000,
    })
    expect(await requeueEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-b',
      now: '2030-07-27T10:00:10.000Z',
    })).toBe(false)
    expect(await getEditorRevisionRun(workspace, project.id, run.id)).toMatchObject({
      status: 'running',
      lease_owner: 'worker-a',
      lease_expires_at: '2030-07-27T10:00:30.000Z',
    })

    expect(await requeueEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-a',
      now: '2030-07-27T10:00:10.000Z',
    })).toBe(true)
    expect(await getEditorRevisionRun(workspace, project.id, run.id)).toMatchObject({
      status: 'queued',
      lease_owner: null,
      lease_expires_at: null,
    })

    await claimEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-a',
      now: '2030-07-27T10:01:00.000Z',
      leaseMs: 30_000,
    })
    await updateNovelRun(workspace, run.id, {
      lease_owner: 'takeover-owner',
      lease_expires_at: '2030-07-27T10:02:00.000Z',
    })
    expect(await requeueEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-a',
      now: '2030-07-27T10:01:10.000Z',
    })).toBe(false)
    expect(await getEditorRevisionRun(workspace, project.id, run.id)).toMatchObject({
      status: 'running',
      lease_owner: 'takeover-owner',
      lease_expires_at: '2030-07-27T10:02:00.000Z',
    })

    await updateNovelRun(workspace, run.id, {
      lease_owner: 'worker-a',
      lease_expires_at: '2030-07-27T10:01:05.000Z',
    })
    expect(await requeueEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-a',
      now: '2030-07-27T10:01:10.000Z',
    })).toBe(false)
    expect(await getEditorRevisionRun(workspace, project.id, run.id)).toMatchObject({
      status: 'running',
      lease_owner: 'worker-a',
      lease_expires_at: '2030-07-27T10:01:05.000Z',
    })
  })

  test('never requeues a cancel-requested claim', async () => {
    const { workspace, project, chapters: [chapter] } = await createFixture()
    const run = await createRun(workspace, project.id, chapter.id)
    await claimEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-a',
      now: '2030-07-27T10:00:00.000Z',
      leaseMs: 30_000,
    })
    const canceled = await requestEditorRevisionCancel(workspace, project.id, run.id)

    expect(await requeueEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-a',
      now: '2030-07-27T10:00:10.000Z',
    })).toBe(false)
    expect(await getEditorRevisionRun(workspace, project.id, run.id)).toMatchObject({
      status: 'cancel_requested',
      cancel_requested_at: canceled.cancel_requested_at,
      lease_owner: 'worker-a',
      lease_expires_at: '2030-07-27T10:00:30.000Z',
    })

    expect(await claimEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-b',
      now: '2030-07-27T10:00:31.000Z',
      leaseMs: 30_000,
    })).toMatchObject({
      status: 'running',
      cancel_requested_at: canceled.cancel_requested_at,
      lease_owner: 'worker-b',
    })
    expect(await requeueEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-b',
      now: '2030-07-27T10:00:40.000Z',
    })).toBe(false)
    expect(await getEditorRevisionRun(workspace, project.id, run.id)).toMatchObject({
      status: 'running',
      cancel_requested_at: canceled.cancel_requested_at,
      lease_owner: 'worker-b',
      lease_expires_at: '2030-07-27T10:01:01.000Z',
    })
  })

  test('renews only a current unexpired lease owner', async () => {
    const { workspace, project, chapters: [chapter] } = await createFixture()
    const run = await createRun(workspace, project.id, chapter.id)
    await claimEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-a',
      now: '2030-07-27T10:00:00.000Z',
      leaseMs: 30_000,
    })

    expect(await renewEditorRevisionLease(workspace, {
      runId: run.id,
      owner: 'worker-b',
      now: '2030-07-27T10:00:10.000Z',
      leaseMs: 60_000,
    })).toBe(false)
    expect(await renewEditorRevisionLease(workspace, {
      runId: run.id,
      owner: 'worker-a',
      now: '2030-07-27T10:00:10.000Z',
      leaseMs: 60_000,
    })).toBe(true)
    expect(await getEditorRevisionRun(workspace, project.id, run.id)).toMatchObject({
      lease_owner: 'worker-a',
      lease_expires_at: '2030-07-27T10:01:10.000Z',
      updated_at: '2030-07-27T10:00:10.000Z',
    })
    expect(await renewEditorRevisionLease(workspace, {
      runId: run.id,
      owner: 'worker-a',
      now: '2030-07-27T10:01:11.000Z',
      leaseMs: 60_000,
    })).toBe(false)
  })

  test('persists checkpoint progress only for the valid lease and rejects phase regression', async () => {
    const { workspace, project, chapters: [chapter] } = await createFixture()
    const run = await createRun(workspace, project.id, chapter.id)
    await claimEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-a',
      now: '2030-07-27T10:00:00.000Z',
      leaseMs: 60_000,
    })
    const candidateText = 'admitted candidate'
    const advanced = checkpointAt('admit_candidate', {
      generate_candidate: 'completed',
      admit_candidate: 'completed',
    }, {
      candidate: {
        text: candidateText,
        hash: revisionTextHash(candidateText),
        char_count: candidateText.replace(/\s/g, '').length,
        applied_patches: [],
        diagnostics: {},
      },
    })

    const written = await writeEditorRevisionCheckpoint(workspace, {
      runId: run.id,
      owner: 'worker-a',
      status: 'running',
      phase: 'admit_candidate',
      checkpoint: advanced,
    })
    expect(JSON.parse(written.output_ref || '{}')).toMatchObject({
      phase: 'admit_candidate',
      phases: {
        generate_candidate: { status: 'completed' },
        admit_candidate: { status: 'completed' },
      },
      candidate: { text: candidateText, hash: revisionTextHash(candidateText) },
    })

    const wrongOwner = await writeEditorRevisionCheckpoint(workspace, {
      runId: run.id,
      owner: 'worker-b',
      status: 'running',
      phase: 'admit_candidate',
      checkpoint: advanced,
    }).then(() => null, caught => caught)
    expect(wrongOwner).toMatchObject({ code: 'REVISION_LEASE_OR_STATE_INVALID' })

    const regressed = initialCheckpoint()
    const regressionError = await writeEditorRevisionCheckpoint(workspace, {
      runId: run.id,
      owner: 'worker-a',
      status: 'running',
      phase: 'generate_candidate',
      checkpoint: regressed,
    }).then(() => null, caught => caught)
    expect(regressionError).toMatchObject({ code: 'REVISION_CHECKPOINT_REGRESSION' })
    expect(JSON.parse((await getEditorRevisionRun(workspace, project.id, run.id))?.output_ref || '{}').phase).toBe('admit_candidate')
  })

  test('rejects admitted candidate mutation and incoherent completed run status', async () => {
    const { workspace, project, chapters: [chapter1, chapter2] } = await createFixture([1, 2])
    const admittedRun = await createRun(workspace, project.id, chapter1.id)
    await claimEditorRevisionRun(workspace, {
      runId: admittedRun.id,
      owner: 'worker-a',
      now: '2030-07-27T10:00:00.000Z',
      leaseMs: 60_000,
    })
    const admitted = checkpointAt('persist_chapter', {
      generate_candidate: 'completed',
      admit_candidate: 'completed',
      persist_chapter: 'running',
    }, {
      candidate: {
        text: 'accepted-text',
        hash: revisionTextHash('accepted-text'),
        char_count: 13,
        applied_patches: [],
        diagnostics: {},
      },
    })
    await writeEditorRevisionCheckpoint(workspace, {
      runId: admittedRun.id,
      owner: 'worker-a',
      status: 'running',
      phase: 'persist_chapter',
      checkpoint: admitted,
    })
    const mutatedCandidate = JSON.parse(JSON.stringify(admitted)) as EditorRevisionCheckpoint
    mutatedCandidate.candidate = { ...mutatedCandidate.candidate!, text: 'different-text', hash: 'different-hash' }

    await expect(writeEditorRevisionCheckpoint(workspace, {
      runId: admittedRun.id,
      owner: 'worker-a',
      status: 'running',
      phase: 'persist_chapter',
      checkpoint: mutatedCandidate,
    })).rejects.toMatchObject({ code: 'REVISION_CHECKPOINT_REGRESSION' })
    expect(JSON.parse((await getEditorRevisionRun(workspace, project.id, admittedRun.id))?.output_ref || '{}').candidate).toMatchObject({
      text: 'accepted-text',
      hash: revisionTextHash('accepted-text'),
    })

    const incompleteRun = await createRun(workspace, project.id, chapter2.id)
    await claimEditorRevisionRun(workspace, {
      runId: incompleteRun.id,
      owner: 'worker-a',
      now: '2030-07-27T10:00:00.000Z',
      leaseMs: 60_000,
    })
    await expect(writeEditorRevisionCheckpoint(workspace, {
      runId: incompleteRun.id,
      owner: 'worker-a',
      status: 'completed',
      phase: 'generate_candidate',
      checkpoint: initialCheckpoint(),
    })).rejects.toMatchObject({ code: 'REVISION_CHECKPOINT_INVALID' })
    expect((await getEditorRevisionRun(workspace, project.id, incompleteRun.id))?.status).toBe('running')
  })

  test('keeps failed and running run statuses coherent with the current checkpoint phase', async () => {
    const { workspace, project, chapters } = await createFixture([1, 2, 3, 4, 5])
    const claimedRuns = []
    for (const chapter of chapters) {
      const run = await createRun(workspace, project.id, chapter.id)
      await claimEditorRevisionRun(workspace, {
        runId: run.id,
        owner: 'worker-a',
        now: '2030-07-27T10:00:00.000Z',
        leaseMs: 60_000,
      })
      claimedRuns.push(run)
    }

    const pendingFailure = initialCheckpoint()
    pendingFailure.error = { code: 'REVISION_PROVIDER_FAILED', message: 'provider unavailable' }
    await expect(writeEditorRevisionCheckpoint(workspace, {
      runId: claimedRuns[0].id,
      owner: 'worker-a',
      status: 'failed',
      phase: 'generate_candidate',
      checkpoint: pendingFailure,
    })).rejects.toMatchObject({ code: 'REVISION_CHECKPOINT_INVALID' })

    const runningFailure = checkpointAt('generate_candidate', { generate_candidate: 'running' }, {
      error: { code: 'REVISION_PROVIDER_FAILED', message: 'provider unavailable' },
    })
    await expect(writeEditorRevisionCheckpoint(workspace, {
      runId: claimedRuns[1].id,
      owner: 'worker-a',
      status: 'failed',
      phase: 'generate_candidate',
      checkpoint: runningFailure,
    })).rejects.toMatchObject({ code: 'REVISION_CHECKPOINT_INVALID' })

    const failedPhase = checkpointAt('generate_candidate', { generate_candidate: 'failed' }, {
      error: { code: 'REVISION_PROVIDER_FAILED', message: 'provider unavailable' },
    })
    await expect(writeEditorRevisionCheckpoint(workspace, {
      runId: claimedRuns[2].id,
      owner: 'worker-a',
      status: 'running',
      phase: 'generate_candidate',
      checkpoint: failedPhase,
    })).rejects.toMatchObject({ code: 'REVISION_CHECKPOINT_INVALID' })

    const canceledPhase = checkpointAt('generate_candidate', { generate_candidate: 'canceled' })
    await expect(writeEditorRevisionCheckpoint(workspace, {
      runId: claimedRuns[3].id,
      owner: 'worker-a',
      status: 'running',
      phase: 'generate_candidate',
      checkpoint: canceledPhase,
    })).rejects.toMatchObject({ code: 'REVISION_CHECKPOINT_INVALID' })

    const validFailure = checkpointAt('generate_candidate', { generate_candidate: 'failed' }, {
      error: { code: 'REVISION_PROVIDER_FAILED', message: 'provider unavailable', diagnostics: { attempt: 1 } },
    })
    const failed = await writeEditorRevisionCheckpoint(workspace, {
      runId: claimedRuns[4].id,
      owner: 'worker-a',
      status: 'failed',
      phase: 'generate_candidate',
      checkpoint: validFailure,
      errorMessage: 'REVISION_PROVIDER_FAILED',
    })
    expect(failed.status).toBe('failed')
    expect(JSON.parse(failed.output_ref || '{}').error).toEqual(validFailure.error)
  })

  test('reports same-owner live cancellation at the checkpoint fence and lets the lease owner make it terminal', async () => {
    const { workspace, project, chapters: [chapter] } = await createFixture()
    const run = await createRun(workspace, project.id, chapter.id)
    await claimEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-a',
      now: '2030-07-27T10:00:00.000Z',
      leaseMs: 60_000,
    })

    const requested = await requestEditorRevisionCancel(workspace, project.id, run.id)
    expect(requested.status).toBe('cancel_requested')
    expect(requested.cancel_requested_at).toBeTruthy()
    expect(requested.lease_owner).toBe('worker-a')
    await expect(requestEditorRevisionCancel(workspace, project.id, run.id)).rejects.toMatchObject({
      code: 'REVISION_LEASE_OR_STATE_INVALID',
    })

    const canceledWrite = await writeEditorRevisionCheckpoint(workspace, {
      runId: run.id,
      owner: 'worker-a',
      status: 'failed',
      phase: 'generate_candidate',
      checkpoint: checkpointAt('generate_candidate', { generate_candidate: 'failed' }, {
        error: { code: 'MUST_NOT_OVERWRITE_CANCEL', message: 'must not overwrite cancellation' },
      }),
      errorMessage: 'must-not-overwrite-cancel',
    }).then(() => null, caught => caught)
    expect(canceledWrite).toMatchObject({ code: 'REVISION_CANCELED' })

    const canceledCheckpoint = checkpointAt('generate_candidate', {
      generate_candidate: 'canceled',
    })
    const canceled = await finishEditorRevisionCancellation(workspace, run.id, 'worker-a', canceledCheckpoint)
    expect(canceled).toMatchObject({
      id: run.id,
      status: 'canceled',
      lease_owner: null,
      lease_expires_at: null,
    })
    expect(JSON.parse(canceled.output_ref || '{}').phases.generate_candidate.status).toBe('canceled')
  })

  test('can claim and terminalize cancellation requested before a worker acquired the run', async () => {
    const { workspace, project, chapters: [chapter] } = await createFixture()
    const run = await createRun(workspace, project.id, chapter.id)
    const requested = await requestEditorRevisionCancel(workspace, project.id, run.id)
    expect(requested).toMatchObject({ status: 'cancel_requested', lease_owner: null })

    const claimed = await claimEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-a',
      now: '2030-07-27T10:00:00.000Z',
      leaseMs: 60_000,
    })
    expect(claimed).toMatchObject({ status: 'running', lease_owner: 'worker-a' })
    expect(claimed?.cancel_requested_at).toBe(requested.cancel_requested_at)

    const canceled = await finishEditorRevisionCancellation(
      workspace,
      run.id,
      'worker-a',
      checkpointAt('generate_candidate', { generate_candidate: 'canceled' }),
    )
    expect(canceled.status).toBe('canceled')
  })

  test('preserves committed evidence when cancellation happens after prose persistence', async () => {
    const { workspace, project, chapters: [chapter] } = await createFixture()
    const run = await createRun(workspace, project.id, chapter.id)
    await claimEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-a',
      now: '2030-07-27T10:00:00.000Z',
      leaseMs: 60_000,
    })
    const committed = checkpointAt('post_quality', {
      generate_candidate: 'completed',
      admit_candidate: 'completed',
      persist_chapter: 'completed',
      post_quality: 'running',
    }, {
      candidate: {
        text: 'committed-text',
        hash: revisionTextHash('committed-text'),
        char_count: 14,
        applied_patches: [],
        diagnostics: {},
      },
      prose_persisted: true,
      committed_chapter_updated_at: '2030-07-27T10:00:01.000Z',
      editor_revision_review_id: 42,
    })
    await writeEditorRevisionCheckpoint(workspace, {
      runId: run.id,
      owner: 'worker-a',
      status: 'running',
      phase: 'post_quality',
      checkpoint: committed,
    })
    await requestEditorRevisionCancel(workspace, project.id, run.id)

    const destructiveCancellation = checkpointAt('post_quality', {
      generate_candidate: 'completed',
      admit_candidate: 'completed',
      persist_chapter: 'completed',
      post_quality: 'canceled',
      sync_current_story_state: 'canceled',
    })
    await expect(finishEditorRevisionCancellation(workspace, run.id, 'worker-a', destructiveCancellation)).rejects.toMatchObject({
      code: 'REVISION_CHECKPOINT_REGRESSION',
    })

    const validCancellation = JSON.parse(JSON.stringify(committed)) as EditorRevisionCheckpoint
    validCancellation.phases.post_quality.status = 'canceled'
    const canceled = await finishEditorRevisionCancellation(workspace, run.id, 'worker-a', validCancellation)
    const canceledCheckpoint = JSON.parse(canceled.output_ref || '{}')
    expect(canceledCheckpoint).toMatchObject({
      phase: 'post_quality',
      prose_persisted: true,
      committed_chapter_updated_at: '2030-07-27T10:00:01.000Z',
      editor_revision_review_id: 42,
      candidate: { text: 'committed-text', hash: revisionTextHash('committed-text') },
      phases: {
        persist_chapter: { status: 'completed' },
        post_quality: { status: 'canceled' },
        sync_current_story_state: { status: 'pending' },
      },
    })

    const retried = await retryEditorRevisionRun(workspace, project.id, run.id)
    const retriedCheckpoint = JSON.parse(retried.output_ref || '{}')
    expect(retriedCheckpoint).toMatchObject({
      phase: 'post_quality',
      prose_persisted: true,
      candidate: { text: 'committed-text', hash: revisionTextHash('committed-text') },
      phases: {
        generate_candidate: { status: 'completed' },
        admit_candidate: { status: 'completed' },
        persist_chapter: { status: 'completed' },
        post_quality: { status: 'pending' },
      },
    })
  })

  test('records commit evidence when cancellation lands before the persist checkpoint write', async () => {
    const { workspace, project, chapters: [chapter] } = await createFixture()
    const run = await createRun(workspace, project.id, chapter.id)
    await claimEditorRevisionRun(workspace, {
      runId: run.id,
      owner: 'worker-a',
      now: '2030-07-27T10:00:00.000Z',
      leaseMs: 60_000,
    })
    const committing = checkpointAt('persist_chapter', {
      generate_candidate: 'completed',
      admit_candidate: 'completed',
      persist_chapter: 'running',
    }, {
      candidate: {
        text: 'committed-text',
        hash: revisionTextHash('committed-text'),
        char_count: 14,
        applied_patches: [],
        diagnostics: {},
      },
    })
    await writeEditorRevisionCheckpoint(workspace, {
      runId: run.id,
      owner: 'worker-a',
      status: 'running',
      phase: 'persist_chapter',
      checkpoint: committing,
    })
    await requestEditorRevisionCancel(workspace, project.id, run.id)

    const cancellationAfterCommit = JSON.parse(JSON.stringify(committing)) as EditorRevisionCheckpoint
    cancellationAfterCommit.prose_persisted = true
    cancellationAfterCommit.committed_chapter_updated_at = '2030-07-27T10:00:01.000Z'
    cancellationAfterCommit.editor_revision_review_id = 43
    cancellationAfterCommit.phases.persist_chapter.status = 'completed'
    const canceled = await finishEditorRevisionCancellation(workspace, run.id, 'worker-a', cancellationAfterCommit)
    expect(JSON.parse(canceled.output_ref || '{}')).toMatchObject({
      phase: 'persist_chapter',
      prose_persisted: true,
      committed_chapter_updated_at: '2030-07-27T10:00:01.000Z',
      editor_revision_review_id: 43,
      candidate: { hash: revisionTextHash('committed-text') },
      phases: { persist_chapter: { status: 'completed' } },
    })

    const retried = await retryEditorRevisionRun(workspace, project.id, run.id)
    expect(JSON.parse(retried.output_ref || '{}')).toMatchObject({
      phase: 'post_quality',
      prose_persisted: true,
      candidate: { hash: revisionTextHash('committed-text') },
      phases: { post_quality: { status: 'pending' } },
    })
  })

  test('retries failed runs in place from the correct durable resume point', async () => {
    const { workspace, project, chapters } = await createFixture([1, 2, 3])
    const checkpoints = [
      checkpointAt('post_quality', {
        generate_candidate: 'completed',
        admit_candidate: 'completed',
        persist_chapter: 'completed',
        post_quality: 'failed',
      }, {
        candidate: {
          text: 'persisted',
          hash: revisionTextHash('persisted'),
          char_count: 9,
          applied_patches: [],
          diagnostics: {},
        },
        prose_persisted: true,
        committed_chapter_updated_at: '2030-07-27T10:00:01.000Z',
        error: { code: 'POST_QUALITY_FAILED', message: 'quality unavailable' },
      }),
      checkpointAt('persist_chapter', {
        generate_candidate: 'completed',
        admit_candidate: 'completed',
        persist_chapter: 'failed',
      }, {
        candidate: {
          text: 'admitted',
          hash: revisionTextHash('admitted'),
          char_count: 8,
          applied_patches: [],
          diagnostics: {},
        },
        error: { code: 'PERSIST_FAILED', message: 'commit unavailable' },
      }),
      checkpointAt('admit_candidate', {
        generate_candidate: 'completed',
        admit_candidate: 'failed',
      }, {
        error: { code: 'REVISION_CANDIDATE_REJECTED', message: 'not admitted' },
      }),
    ]

    const runs = []
    for (let index = 0; index < chapters.length; index += 1) {
      const run = await createRun(workspace, project.id, chapters[index].id)
      await claimEditorRevisionRun(workspace, {
        runId: run.id,
        owner: 'worker-a',
        now: '2030-07-27T10:00:00.000Z',
        leaseMs: 60_000,
      })
      runs.push(await writeEditorRevisionCheckpoint(workspace, {
        runId: run.id,
        owner: 'worker-a',
        status: 'failed',
        phase: checkpoints[index].phase,
        checkpoint: checkpoints[index],
        errorMessage: checkpoints[index].error?.code,
      }))
    }

    const persistedRetry = await retryEditorRevisionRun(workspace, project.id, runs[0].id)
    const persistedCheckpoint = JSON.parse(persistedRetry.output_ref || '{}')
    expect(persistedRetry).toMatchObject({ id: runs[0].id, status: 'queued', lease_owner: null, cancel_requested_at: null, error_message: '' })
    expect(persistedCheckpoint).toMatchObject({
      phase: 'post_quality',
      prose_persisted: true,
      candidate: { hash: revisionTextHash('persisted') },
      phases: {
        persist_chapter: { status: 'completed' },
        post_quality: { status: 'pending' },
      },
    })

    const admittedRetry = await retryEditorRevisionRun(workspace, project.id, runs[1].id)
    const admittedCheckpoint = JSON.parse(admittedRetry.output_ref || '{}')
    expect(admittedRetry.id).toBe(runs[1].id)
    expect(admittedCheckpoint).toMatchObject({
      phase: 'persist_chapter',
      candidate: { hash: revisionTextHash('admitted') },
      phases: {
        generate_candidate: { status: 'completed' },
        admit_candidate: { status: 'completed' },
        persist_chapter: { status: 'pending' },
      },
    })

    const rejectedRetry = await retryEditorRevisionRun(workspace, project.id, runs[2].id)
    const rejectedCheckpoint = JSON.parse(rejectedRetry.output_ref || '{}')
    expect(rejectedRetry.id).toBe(runs[2].id)
    expect(rejectedCheckpoint.phase).toBe('generate_candidate')
    expect(rejectedCheckpoint.candidate).toBeUndefined()
    expect(rejectedCheckpoint.phases.generate_candidate.status).toBe('pending')
  })

  test('requires a fresh run after source conflict or supersession', async () => {
    const { workspace, project, chapters } = await createFixture([1, 2])
    for (const [index, errorCode] of ['SOURCE_VERSION_CHANGED', 'REVISION_RUN_SUPERSEDED'].entries()) {
      const run = await createRun(workspace, project.id, chapters[index].id)
      await claimEditorRevisionRun(workspace, {
        runId: run.id,
        owner: 'worker-a',
        now: '2030-07-27T10:00:00.000Z',
        leaseMs: 60_000,
      })
      const failed = checkpointAt('persist_chapter', {
        generate_candidate: 'completed',
        admit_candidate: 'completed',
        persist_chapter: 'failed',
      }, {
        candidate: {
          text: 'candidate',
          hash: revisionTextHash('candidate'),
          char_count: 9,
          applied_patches: [],
          diagnostics: {},
        },
        error: { code: errorCode, message: errorCode },
      })
      await writeEditorRevisionCheckpoint(workspace, {
        runId: run.id,
        owner: 'worker-a',
        status: 'failed',
        phase: 'persist_chapter',
        checkpoint: failed,
        errorMessage: errorCode,
      })

      await expect(retryEditorRevisionRun(workspace, project.id, run.id)).rejects.toMatchObject({
        code: 'REVISION_RESTART_REQUIRED',
      })
      expect((await getEditorRevisionRun(workspace, project.id, run.id))?.status).toBe('failed')
    }
  })

  test('translates retry collision with a newer active run into the stable active-run error', async () => {
    const { workspace, project, chapters: [chapter] } = await createFixture()
    const oldRun = await createRun(workspace, project.id, chapter.id)
    await claimEditorRevisionRun(workspace, {
      runId: oldRun.id,
      owner: 'worker-a',
      now: '2030-07-27T10:00:00.000Z',
      leaseMs: 60_000,
    })
    const failed = checkpointAt('generate_candidate', { generate_candidate: 'failed' }, {
      error: { code: 'REVISION_PROVIDER_FAILED', message: 'provider unavailable' },
    })
    await writeEditorRevisionCheckpoint(workspace, {
      runId: oldRun.id,
      owner: 'worker-a',
      status: 'failed',
      phase: 'generate_candidate',
      checkpoint: failed,
      errorMessage: 'REVISION_PROVIDER_FAILED',
    })
    const newer = await createRun(workspace, project.id, chapter.id)

    await expect(retryEditorRevisionRun(workspace, project.id, oldRun.id)).rejects.toMatchObject({
      code: 'REVISION_ALREADY_ACTIVE',
      existingRunId: newer.id,
      statusUrl: `/api/novel/editor-revisions/${newer.id}?project_id=${project.id}`,
    })
    expect((await getEditorRevisionRun(workspace, project.id, oldRun.id))?.status).toBe('failed')
  })

  test('migrates old run rows idempotently and backfills updated_at from created_at', async () => {
    const workspace = await tempWorkspace()
    const db = new Database(join(workspace, 'novel.sqlite'))
    try {
      db.exec(`
        CREATE TABLE runs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          run_type TEXT NOT NULL,
          step_name TEXT NOT NULL,
          status TEXT NOT NULL,
          input_ref TEXT DEFAULT '',
          output_ref TEXT DEFAULT '',
          duration_ms INTEGER DEFAULT 0,
          error_message TEXT DEFAULT '',
          created_at TEXT NOT NULL
        );
        INSERT INTO runs (project_id, run_type, step_name, status, created_at)
        VALUES (1, 'legacy', 'step', 'completed', '2020-01-02T03:04:05.000Z');
      `)

      ensureSqliteSchema(db)
      ensureSqliteSchema(db)

      const row = db.query('SELECT scope_key, updated_at, lease_owner, lease_expires_at, cancel_requested_at FROM runs WHERE id = 1').get() as any
      expect(row).toEqual({
        scope_key: null,
        updated_at: '2020-01-02T03:04:05.000Z',
        lease_owner: null,
        lease_expires_at: null,
        cancel_requested_at: null,
      })
      const indexes = db.query("SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_runs_%revision%'").all() as any[]
      expect(indexes.map(item => item.name).sort()).toEqual([
        'idx_runs_active_editor_revision_scope',
        'idx_runs_editor_revision_recovery',
      ])
    } finally {
      db.close()
    }
  })

  test('round-trips nullable run fields without making legacy NULL scopes conflict', async () => {
    const { workspace, project } = await createFixture()
    const generic = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'generic',
      step_name: 'round-trip',
      status: 'running',
      scope_key: 'generic:scope',
      updated_at: '2030-01-01T00:00:00.000Z',
      lease_owner: 'generic-worker',
      lease_expires_at: '2030-01-01T00:01:00.000Z',
      cancel_requested_at: '2030-01-01T00:00:30.000Z',
    })
    const reloaded = await getNovelRun(workspace, generic.id, project.id)
    const listed = (await listNovelRuns(workspace, project.id)).find(item => item.id === generic.id)
    const summary = (await listNovelRunSummaries(workspace, project.id)).find(item => item.id === generic.id)
    expect(reloaded).toMatchObject({
      scope_key: 'generic:scope',
      updated_at: '2030-01-01T00:00:00.000Z',
      lease_owner: 'generic-worker',
      lease_expires_at: '2030-01-01T00:01:00.000Z',
      cancel_requested_at: '2030-01-01T00:00:30.000Z',
    })
    expect(listed).toMatchObject(reloaded!)
    expect(summary).toMatchObject({
      scope_key: 'generic:scope',
      updated_at: '2030-01-01T00:00:00.000Z',
      lease_owner: 'generic-worker',
    })

    const updated = await updateNovelRun(workspace, generic.id, {
      status: 'completed',
      updated_at: '2030-01-01T00:02:00.000Z',
    })
    expect(updated).toMatchObject({
      created_at: generic.created_at,
      updated_at: '2030-01-01T00:02:00.000Z',
    })

    const firstLegacy = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'editor_revision',
      step_name: 'legacy-1',
      status: 'queued',
      scope_key: null,
    })
    const secondLegacy = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'editor_revision',
      step_name: 'legacy-2',
      status: 'queued',
      scope_key: null,
    })
    expect(secondLegacy.id).not.toBe(firstLegacy.id)
    expect(firstLegacy.scope_key).toBeNull()
    expect(secondLegacy.scope_key).toBeNull()
  })

  test('recovers resumable work and terminalizes legacy active rows without a canonical checkpoint', async () => {
    const { workspace, project, chapters: [queuedChapter, expiredChapter] } = await createFixture([1, 2])
    const queued = await createRun(workspace, project.id, queuedChapter.id)
    const expired = await createRun(workspace, project.id, expiredChapter.id)
    await claimEditorRevisionRun(workspace, {
      runId: expired.id,
      owner: 'dead-worker',
      now: '2020-01-01T00:00:00.000Z',
      leaseMs: 30_000,
    })
    const legacy = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'editor_revision',
      step_name: 'chapter-legacy',
      status: 'running',
      output_ref: '',
      scope_key: null,
      lease_owner: 'legacy-worker',
      lease_expires_at: '2020-01-01T00:00:30.000Z',
    })

    const recovered = await recoverEditorRevisionRuns(workspace, '2020-01-01T00:01:00.000Z')
    expect(recovered.queued.sort((a, b) => a - b)).toEqual([queued.id, expired.id].sort((a, b) => a - b))
    expect(recovered.failedLegacy).toEqual([legacy.id])
    expect(await getEditorRevisionRun(workspace, project.id, expired.id)).toMatchObject({
      status: 'queued',
      lease_owner: null,
      lease_expires_at: null,
      updated_at: '2020-01-01T00:01:00.000Z',
    })
    expect(await getEditorRevisionRun(workspace, project.id, legacy.id)).toMatchObject({
      status: 'failed',
      error_message: 'LEGACY_REVISION_RUN_NOT_RESUMABLE',
      lease_owner: null,
      lease_expires_at: null,
    })
  })

  test('recovery queues scoped invalid checkpoints only when their worker lease is recoverable', async () => {
    const { workspace, project, chapters: [liveChapter, incoherentChapter, malformedChapter] } = await createFixture([1, 2, 3])
    const live = await createRun(workspace, project.id, liveChapter.id)
    const incoherent = await createRun(workspace, project.id, incoherentChapter.id)
    const malformed = await createRun(workspace, project.id, malformedChapter.id)
    await claimEditorRevisionRun(workspace, {
      runId: live.id,
      owner: 'live-worker',
      now: '2030-07-27T10:00:00.000Z',
      leaseMs: 60_000,
    })
    await claimEditorRevisionRun(workspace, {
      runId: incoherent.id,
      owner: 'expired-worker',
      now: '2030-07-27T10:00:00.000Z',
      leaseMs: 5_000,
    })
    await claimEditorRevisionRun(workspace, {
      runId: malformed.id,
      owner: 'malformed-worker',
      now: '2030-07-27T10:00:00.000Z',
      leaseMs: 5_000,
    })
    const incoherentRef = JSON.stringify({ ...initialCheckpoint(), prose_persisted: true })
    const malformedRef = '{'
    const db = new Database(join(workspace, 'novel.sqlite'))
    try {
      db.query('UPDATE runs SET output_ref = ? WHERE id IN (?, ?)').run(incoherentRef, live.id, incoherent.id)
      db.query('UPDATE runs SET output_ref = ? WHERE id = ?').run(malformedRef, malformed.id)
    } finally {
      db.close()
    }

    const recovered = await recoverEditorRevisionRuns(workspace, '2030-07-27T10:00:10.000Z')

    expect(recovered.failedLegacy).toEqual([])
    expect(recovered.queued).toEqual([incoherent.id, malformed.id])
    expect(await getEditorRevisionRun(workspace, project.id, live.id)).toMatchObject({
      status: 'running',
      lease_owner: 'live-worker',
      lease_expires_at: '2030-07-27T10:01:00.000Z',
      output_ref: incoherentRef,
    })
    expect(await getEditorRevisionRun(workspace, project.id, incoherent.id)).toMatchObject({
      status: 'queued',
      lease_owner: null,
      lease_expires_at: null,
      output_ref: incoherentRef,
    })
    expect(await getEditorRevisionRun(workspace, project.id, malformed.id)).toMatchObject({
      status: 'queued',
      lease_owner: null,
      lease_expires_at: null,
      output_ref: malformedRef,
    })
  })
})
