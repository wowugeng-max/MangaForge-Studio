import { afterEach, describe, expect, test } from 'bun:test'
import { rm } from 'fs/promises'
import { openDb } from '../db'
import { revisionTextHash } from '../../routes/novel-editor/revision-candidate-admission'
import { tempWorkspace, workspaces } from '../test-utils'
import {
  commitEditorRevisionChapter,
  createNovelChapter,
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
  const chapter = await createNovelChapter(workspace, {
    project_id: project.id,
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
  return { workspace, project, chapter, follower, input }
}

function createAbortTrigger(workspace: string, sql: string) {
  const db = openDb(workspace)
  try {
    db.exec(sql)
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
      },
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
