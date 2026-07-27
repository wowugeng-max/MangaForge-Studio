import { afterEach, describe, expect, test } from 'bun:test'
import { rm } from 'fs/promises'
import { openDb } from '../db'
import { revisionTextHash } from '../revision-hash'
import { tempWorkspace, workspaces } from '../test-utils'
import {
  commitEditorRevisionChapter,
  createNovelChapter,
  createNovelOutline,
  createNovelProject,
  getNovelChapter,
  listChapterVersions,
  listNovelChapters,
  listNovelReviews,
  updateNovelChapter,
} from '../store'

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map(workspace => rm(workspace, { recursive: true, force: true })))
})

async function createFixture() {
  const workspace = await tempWorkspace()
  const project = await createNovelProject(workspace, { title: 'atomic editor revision' })
  const outline = await createNovelOutline(workspace, {
    project_id: project.id,
    outline_type: 'chapter',
    title: 'source outline',
  })
  const alternateOutline = await createNovelOutline(workspace, {
    project_id: project.id,
    outline_type: 'chapter',
    title: 'alternate outline',
  })
  const chapter = await createNovelChapter(workspace, {
    project_id: project.id,
    outline_id: outline.id,
    chapter_no: 1,
    title: 'source chapter',
    chapter_text: 'source prose',
    scene_breakdown: [{ title: 'source scene' }],
    continuity_notes: ['source continuity'],
    raw_payload: { keep_me: { value: 1 } },
  })
  const follower = await createNovelChapter(workspace, {
    project_id: project.id,
    chapter_no: 2,
    title: 'follower chapter',
    chapter_text: 'follower prose',
  })
  const input = {
    projectId: project.id,
    chapterId: chapter.id,
    runId: 41,
    sourceTextHash: revisionTextHash('source prose'),
    candidateText: 'accepted candidate prose',
    candidateHash: revisionTextHash('accepted candidate prose'),
    chapterPatch: {
      chapter_goal: 'Align only the current chapter.',
      raw_payload: { alignment_source: 'current-only' },
    },
    reviewPayload: {
      source_review_id: 9,
      applied_patches: [{ type: 'full_text' }],
      revision_receipts: [
        { chapter_id: chapter.id, applied_fix: 'current chapter only' },
        { chapter_id: follower.id, applied_fix: 'must not persist follower receipt' },
      ],
    },
  }
  return { workspace, project, outline, alternateOutline, chapter, follower, input }
}

function createAbortTrigger(workspace: string, sql: string) {
  const db = openDb(workspace)
  try {
    db.exec(sql)
  } finally {
    db.close()
  }
}

function runDbMutation(workspace: string, sql: string, ...params: any[]) {
  const db = openDb(workspace)
  try {
    db.query(sql).run(...params)
  } finally {
    db.close()
  }
}

describe('commitEditorRevisionChapter', () => {
  test('atomically snapshots the source, writes the candidate and marker, and creates one exact receipt', async () => {
    const { workspace, project, chapter, follower, input } = await createFixture()

    const committed = await commitEditorRevisionChapter(workspace, {
      ...input,
      chapterPatch: {
        ...input.chapterPatch,
        id: follower.id,
        project_id: project.id + 999,
        chapter_text: 'chapterPatch must not win',
        raw_payload: {
          alignment_source: 'current-only',
          storage_normalized: BigInt(1) as any,
          editor_revision_commit: { run_id: 999 },
        },
      } as any,
      reviewPayload: {
        ...input.reviewPayload,
        chapter_id: follower.id,
        chapter_no: 2,
        source_run_id: 999,
        candidate_hash: 'wrong',
      },
    })

    expect(committed.status).toBe('committed')
    expect(committed.versionCreated).toBe(true)
    expect(committed.chapter).toMatchObject({
      id: chapter.id,
      project_id: project.id,
      chapter_no: 1,
      chapter_text: input.candidateText,
      chapter_goal: 'Align only the current chapter.',
    })
    expect(committed.chapter.raw_payload).toMatchObject({
      keep_me: { value: 1 },
      alignment_source: 'current-only',
      storage_normalized: '1',
      editor_revision_commit: {
        run_id: input.runId,
        source_hash: input.sourceTextHash,
        candidate_hash: input.candidateHash,
      },
    })
    expect(committed.chapter.raw_payload.editor_revision_commit.committed_at).toBeTruthy()
    expect(committed.chapter).toEqual(await getNovelChapter(workspace, chapter.id, project.id))

    const versions = await listChapterVersions(workspace, chapter.id)
    expect(versions).toHaveLength(1)
    expect(versions[0]).toMatchObject({
      chapter_id: chapter.id,
      project_id: project.id,
      version_no: 1,
      chapter_text: 'source prose',
      scene_breakdown: [{ title: 'source scene' }],
      continuity_notes: ['source continuity'],
      source: 'repair',
    })

    expect(committed.review).toMatchObject({
      project_id: project.id,
      chapter_id: chapter.id,
      chapter_no: 1,
      review_type: 'editor_revision',
      status: 'ok',
      issues: [],
    })
    const reviewPayload = JSON.parse(String(committed.review.payload || '{}'))
    expect(reviewPayload).toMatchObject({
      source_review_id: 9,
      chapter_id: chapter.id,
      chapter_no: 1,
      source_run_id: input.runId,
      candidate_hash: input.candidateHash,
    })
    expect(reviewPayload.revision_receipts).toEqual([
      { chapter_id: chapter.id, applied_fix: 'current chapter only' },
    ])
    expect(JSON.stringify(reviewPayload)).not.toContain(`\"chapter_id\":${follower.id}`)
    expect((await getNovelChapter(workspace, follower.id, project.id))?.chapter_text).toBe('follower prose')
  })

  test('returns the same receipt on identical replay without creating another version or review', async () => {
    const { workspace, project, chapter, input } = await createFixture()
    const committed = await commitEditorRevisionChapter(workspace, input)

    const replay = await commitEditorRevisionChapter(workspace, input)

    expect(replay.status).toBe('already_committed')
    expect(replay.versionCreated).toBe(false)
    expect(replay.chapter).toEqual(committed.chapter)
    expect(replay.review).toEqual(committed.review)
    expect(await listChapterVersions(workspace, chapter.id)).toHaveLength(1)
    expect((await listNovelReviews(workspace, project.id)).filter(review => review.review_type === 'editor_revision')).toHaveLength(1)
  })

  test('recursively merges a stale raw patch over transaction-current metadata and replaces arrays', async () => {
    const { workspace, project, chapter, input } = await createFixture()
    const stalePatch = {
      chapter_goal: 'stale plan goal still applies',
      raw_payload: {
        planning: {
          alignment: { rebuilt: true },
          metadata: {
            patch_owned: 'patch value',
            keep_on_undefined: undefined,
            clear_on_null: null,
          },
          ordered_steps: ['patch replacement'],
          mode: 'patch scalar',
        },
      },
    }
    await updateNovelChapter(workspace, chapter.id, {
      raw_payload: {
        planning: {
          alignment: { previous: 'keep me' },
          metadata: {
            concurrent_key: 'newer same-text update',
            keep_on_undefined: 'transaction-current value',
            clear_on_null: 'transaction-current value',
          },
          ordered_steps: ['concurrent value must be replaced'],
          mode: 'concurrent scalar must be replaced',
        },
      },
    }, { createVersion: false })

    const committed = await commitEditorRevisionChapter(workspace, {
      ...input,
      chapterPatch: stalePatch,
    })

    expect(committed.chapter.chapter_goal).toBe('stale plan goal still applies')
    expect(committed.chapter.raw_payload.planning).toEqual({
      alignment: { previous: 'keep me', rebuilt: true },
      metadata: {
        concurrent_key: 'newer same-text update',
        patch_owned: 'patch value',
        keep_on_undefined: 'transaction-current value',
        clear_on_null: null,
      },
      ordered_steps: ['patch replacement'],
      mode: 'patch scalar',
    })
    expect((await getNovelChapter(workspace, chapter.id, project.id))?.raw_payload.planning)
      .toEqual(committed.chapter.raw_payload.planning)
  })

  test('applies only current-plan fields from a contaminated chapter patch', async () => {
    const { workspace, project, outline, alternateOutline, chapter, follower, input } = await createFixture()
    const before = await getNovelChapter(workspace, chapter.id, project.id)
    const contaminatedPatch = {
      id: follower.id,
      project_id: project.id + 999,
      chapter_no: 99,
      title: 'redirected title',
      outline_id: alternateOutline.id,
      chapter_text: 'patch prose must not win',
      created_at: '1999-01-01T00:00:00.000Z',
      updated_at: '1999-01-02T00:00:00.000Z',
      published_at: '1999-01-03T00:00:00.000Z',
      version: 999,
      status: 'published',
      scene_breakdown: [{ title: 'unauthorized scene' }],
      chapter_goal: 'allowed goal',
      chapter_summary: 'allowed summary',
      conflict: 'allowed conflict',
      ending_hook: 'allowed hook',
      raw_payload: { allowed_plan_metadata: true },
    } as any

    const committed = await commitEditorRevisionChapter(workspace, {
      ...input,
      chapterPatch: contaminatedPatch,
    })

    expect(committed.chapter).toMatchObject({
      id: chapter.id,
      project_id: project.id,
      chapter_no: before?.chapter_no,
      title: before?.title,
      outline_id: outline.id,
      chapter_text: input.candidateText,
      created_at: before?.created_at,
      published_at: before?.published_at,
      version: before?.version,
      status: before?.status,
      scene_breakdown: before?.scene_breakdown,
      chapter_goal: 'allowed goal',
      chapter_summary: 'allowed summary',
      conflict: 'allowed conflict',
      ending_hook: 'allowed hook',
    })
    expect(committed.chapter.updated_at).not.toBe(contaminatedPatch.updated_at)
    expect(committed.chapter.raw_payload.allowed_plan_metadata).toBe(true)
    expect((await getNovelChapter(workspace, follower.id, project.id))?.title).toBe('follower chapter')
  })

  test('does not accept a legacy run_id-only review as the canonical replay receipt', async () => {
    const { workspace, project, chapter, input } = await createFixture()
    const committed = await commitEditorRevisionChapter(workspace, input)
    runDbMutation(
      workspace,
      'UPDATE reviews SET payload = ? WHERE id = ?',
      JSON.stringify({
        run_id: input.runId,
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        candidate_hash: input.candidateHash,
      }),
      committed.review.id,
    )

    const error = await commitEditorRevisionChapter(workspace, input).then(() => null, caught => caught)

    expect(error).toMatchObject({ code: 'REVISION_COMMIT_RECEIPT_MISSING' })
    expect(await listChapterVersions(workspace, chapter.id)).toHaveLength(1)
    expect(await listNovelReviews(workspace, project.id)).toHaveLength(1)
  })

  test('rejects replay receipts whose canonical fields have non-canonical JSON types', async () => {
    const invalidReceipts = [
      {
        label: 'junk string source_run_id',
        mutate: (payload: Record<string, unknown>) => ({
          ...payload,
          source_run_id: `${payload.source_run_id}junk`,
        }),
      },
      {
        label: 'real source_run_id',
        mutate: (payload: Record<string, unknown>) => ({
          ...payload,
          source_run_id: Number(payload.source_run_id) + 0.5,
        }),
      },
      {
        label: 'malformed chapter_id',
        mutate: (payload: Record<string, unknown>) => ({
          ...payload,
          chapter_id: `${payload.chapter_id}junk`,
        }),
      },
      {
        label: 'non-text candidate_hash',
        mutate: (payload: Record<string, unknown>) => ({
          ...payload,
          candidate_hash: { value: payload.candidate_hash },
        }),
      },
    ]

    for (const { label, mutate } of invalidReceipts) {
      const { workspace, project, chapter, input } = await createFixture()
      const committed = await commitEditorRevisionChapter(workspace, input)
      const canonicalPayload = {
        source_run_id: input.runId,
        chapter_id: chapter.id,
        chapter_no: chapter.chapter_no,
        candidate_hash: input.candidateHash,
      }
      runDbMutation(
        workspace,
        'UPDATE reviews SET payload = ? WHERE id = ?',
        JSON.stringify(mutate(canonicalPayload)),
        committed.review.id,
      )

      const error = await commitEditorRevisionChapter(workspace, input).then(() => null, caught => caught)

      expect(error, label).toMatchObject({ code: 'REVISION_COMMIT_RECEIPT_MISSING' })
      expect(await listChapterVersions(workspace, chapter.id), label).toHaveLength(1)
      expect(await listNovelReviews(workspace, project.id), label).toHaveLength(1)
    }
  })

  test('fails with a stable error when the matching marker has no canonical receipt', async () => {
    const { workspace, project, chapter, input } = await createFixture()
    const committed = await commitEditorRevisionChapter(workspace, input)
    runDbMutation(workspace, 'DELETE FROM reviews WHERE id = ?', committed.review.id)

    const error = await commitEditorRevisionChapter(workspace, input).then(() => null, caught => caught)

    expect(error).toMatchObject({ code: 'REVISION_COMMIT_RECEIPT_MISSING' })
    expect(await listChapterVersions(workspace, chapter.id)).toHaveLength(1)
    expect(await listNovelReviews(workspace, project.id)).toHaveLength(0)
  })

  test('allows only one of two concurrent runs to commit the same source', async () => {
    const { workspace, project, chapter, input } = await createFixture()
    const secondCandidate = 'competing candidate prose'
    const results = await Promise.allSettled([
      commitEditorRevisionChapter(workspace, input),
      commitEditorRevisionChapter(workspace, {
        ...input,
        runId: input.runId + 1,
        candidateText: secondCandidate,
        candidateHash: revisionTextHash(secondCandidate),
      }),
    ])

    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1)
    const rejected = results.find(result => result.status === 'rejected') as PromiseRejectedResult
    expect(['SOURCE_VERSION_CHANGED', 'REVISION_RUN_SUPERSEDED']).toContain(rejected.reason?.code)
    expect(await listChapterVersions(workspace, chapter.id)).toHaveLength(1)
    expect((await listNovelReviews(workspace, project.id)).filter(review => review.review_type === 'editor_revision')).toHaveLength(1)
    expect([input.candidateText, secondCandidate]).toContain(
      (await getNovelChapter(workspace, chapter.id, project.id))?.chapter_text,
    )
  })

  test('allows a newer run to revise the current candidate while an older marker remains', async () => {
    const { workspace, project, chapter, input } = await createFixture()
    await commitEditorRevisionChapter(workspace, input)
    const nextCandidate = 'candidate prose from the newer run'

    const committed = await commitEditorRevisionChapter(workspace, {
      ...input,
      runId: input.runId + 1,
      sourceTextHash: input.candidateHash,
      candidateText: nextCandidate,
      candidateHash: revisionTextHash(nextCandidate),
    })

    expect(committed.status).toBe('committed')
    expect(committed.chapter.chapter_text).toBe(nextCandidate)
    expect(committed.chapter.raw_payload.editor_revision_commit.run_id).toBe(input.runId + 1)
    expect(await listChapterVersions(workspace, chapter.id)).toHaveLength(2)
    expect((await listNovelReviews(workspace, project.id)).filter(review => review.review_type === 'editor_revision')).toHaveLength(2)
  })

  test('rejects a candidate hash that does not describe the candidate text without writing anything', async () => {
    const { workspace, project, chapter, input } = await createFixture()

    const error = await commitEditorRevisionChapter(workspace, {
      ...input,
      candidateHash: revisionTextHash('different candidate'),
    }).then(() => null, caught => caught)

    expect(error).toMatchObject({ code: 'CANDIDATE_HASH_MISMATCH' })
    expect(await listChapterVersions(workspace, chapter.id)).toHaveLength(0)
    expect(await listNovelReviews(workspace, project.id)).toHaveLength(0)
    expect((await getNovelChapter(workspace, chapter.id, project.id))?.chapter_text).toBe('source prose')
  })

  test('rejects a changed source before the first commit without writing anything', async () => {
    const { workspace, project, chapter, input } = await createFixture()
    await updateNovelChapter(workspace, chapter.id, { chapter_text: 'manual edit before commit' }, { createVersion: false })

    const error = await commitEditorRevisionChapter(workspace, input).then(() => null, caught => caught)

    expect(error).toMatchObject({ code: 'SOURCE_VERSION_CHANGED' })
    expect(await listChapterVersions(workspace, chapter.id)).toHaveLength(0)
    expect(await listNovelReviews(workspace, project.id)).toHaveLength(0)
    const current = await getNovelChapter(workspace, chapter.id, project.id)
    expect(current?.chapter_text).toBe('manual edit before commit')
    expect(current?.raw_payload?.editor_revision_commit).toBeUndefined()
  })

  test('rejects replay after a newer revision marker without restoring the old candidate', async () => {
    const { workspace, project, chapter, input } = await createFixture()
    await commitEditorRevisionChapter(workspace, input)
    const newerText = 'newer manually accepted revision'
    await updateNovelChapter(workspace, chapter.id, {
      chapter_text: newerText,
      raw_payload: {
        editor_revision_commit: {
          run_id: input.runId + 1,
          source_hash: input.candidateHash,
          candidate_hash: revisionTextHash(newerText),
          committed_at: new Date().toISOString(),
        },
      },
    }, { createVersion: false })

    const error = await commitEditorRevisionChapter(workspace, input).then(() => null, caught => caught)

    expect(error).toMatchObject({ code: 'REVISION_RUN_SUPERSEDED' })
    expect((await getNovelChapter(workspace, chapter.id, project.id))?.chapter_text).toBe(newerText)
    expect(await listChapterVersions(workspace, chapter.id)).toHaveLength(1)
    expect((await listNovelReviews(workspace, project.id)).filter(review => review.review_type === 'editor_revision')).toHaveLength(1)
  })

  test('rolls back the version, chapter, marker, and review when an update or insert fails', async () => {
    for (const stage of ['chapter_update', 'review_insert'] as const) {
      const { workspace, project, chapter, input } = await createFixture()
      if (stage === 'chapter_update') {
        createAbortTrigger(workspace, `
          CREATE TRIGGER fail_editor_revision_chapter_update
          BEFORE UPDATE ON chapters WHEN OLD.id = ${chapter.id}
          BEGIN SELECT RAISE(ABORT, 'injected chapter update failure'); END;
        `)
      } else {
        createAbortTrigger(workspace, `
          CREATE TRIGGER fail_editor_revision_review_insert
          BEFORE INSERT ON reviews
          BEGIN SELECT RAISE(ABORT, 'injected review insert failure'); END;
        `)
      }

      const error = await commitEditorRevisionChapter(workspace, input).then(() => null, caught => caught)

      expect(String(error), stage).toContain('injected')
      expect(await listChapterVersions(workspace, chapter.id), stage).toHaveLength(0)
      expect(await listNovelReviews(workspace, project.id), stage).toHaveLength(0)
      const current = await getNovelChapter(workspace, chapter.id, project.id)
      expect(current?.chapter_text, stage).toBe('source prose')
      expect(current?.raw_payload?.editor_revision_commit, stage).toBeUndefined()
    }
  })

  test('treats a project and chapter mismatch as not found', async () => {
    const { workspace, project, chapter, input } = await createFixture()
    const otherProject = await createNovelProject(workspace, { title: 'other project' })

    const error = await commitEditorRevisionChapter(workspace, {
      ...input,
      projectId: otherProject.id,
    }).then(() => null, caught => caught)

    expect(error).toMatchObject({ code: 'CHAPTER_NOT_FOUND' })
    expect(await listChapterVersions(workspace, chapter.id)).toHaveLength(0)
    expect(await listNovelReviews(workspace, project.id)).toHaveLength(0)
    expect(await listNovelReviews(workspace, otherProject.id)).toHaveLength(0)
    expect((await listNovelChapters(workspace, project.id))[0].chapter_text).toBe('source prose')
  })
})
