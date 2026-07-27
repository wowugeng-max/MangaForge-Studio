import { afterEach, describe, expect, test } from 'bun:test'
import { Database } from 'bun:sqlite'
import { join } from 'path'
import type {
  EditorRevisionCheckpoint,
  EditorRevisionPhase,
  EditorRevisionPhaseState,
} from '../../routes/novel-editor/editor-revision-contract'
import { ensureSqliteSchema } from '../db'
import { tempWorkspace, workspaces } from '../test-utils'
import {
  appendNovelRun,
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
    const advanced = checkpointAt('admit_candidate', {
      generate_candidate: 'completed',
      admit_candidate: 'running',
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
        admit_candidate: { status: 'running' },
      },
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

  test('persists cancellation and lets the lease owner make it terminal', async () => {
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
      checkpoint: checkpointAt('generate_candidate', { generate_candidate: 'failed' }),
      errorMessage: 'must-not-overwrite-cancel',
    }).then(() => null, caught => caught)
    expect(canceledWrite).toMatchObject({ code: 'REVISION_LEASE_OR_STATE_INVALID' })

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

  test('retries failed runs in place from the correct durable resume point', async () => {
    const { workspace, project, chapters } = await createFixture([1, 2, 3])
    const checkpoints = [
      checkpointAt('post_quality', {
        generate_candidate: 'completed',
        admit_candidate: 'completed',
        persist_chapter: 'completed',
        post_quality: 'failed',
      }, {
        candidate: { text: 'persisted', hash: 'hash-1', char_count: 9, applied_patches: [], diagnostics: {} },
        prose_persisted: true,
        committed_chapter_updated_at: '2030-07-27T10:00:01.000Z',
        error: { code: 'POST_QUALITY_FAILED', message: 'quality unavailable' },
      }),
      checkpointAt('persist_chapter', {
        generate_candidate: 'completed',
        admit_candidate: 'completed',
        persist_chapter: 'failed',
      }, {
        candidate: { text: 'admitted', hash: 'hash-2', char_count: 8, applied_patches: [], diagnostics: {} },
        error: { code: 'PERSIST_FAILED', message: 'commit unavailable' },
      }),
      checkpointAt('admit_candidate', {
        generate_candidate: 'completed',
        admit_candidate: 'failed',
      }, {
        candidate: { text: 'rejected', hash: 'hash-3', char_count: 8, applied_patches: [], diagnostics: {} },
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
      candidate: { hash: 'hash-1' },
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
      candidate: { hash: 'hash-2' },
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
        candidate: { text: 'candidate', hash: `hash-${index}`, char_count: 9, applied_patches: [], diagnostics: {} },
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
})
