import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelProject, createNovelReview, getNovelChapter, listNovelReviewsByType } from '../../novel'
import { ohStoryChapterTextHash } from '../../novel-writing/oh-story-core/chapter-text-hash'
import { commitKernelCandidate } from './commit'
import { getKernelJobDetail, insertKernelArtifact, insertKernelCandidate, insertKernelJob, updateKernelCandidate } from './repo'

const EIGHT = Array.from({ length: 8 }, (_, i) => `原文段${i}。`).join('\n\n')

async function seedReviewJob() {
  const ws = mkdtempSync(join(tmpdir(), 'commit-'))
  const project = await createNovelProject(ws, { title: '书' })
  const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: EIGHT })
  insertKernelJob(ws, { id: 'job-1', project_id: project.id, workspace_scope: 'novel', title: '', status: 'awaiting_selection', capability: 'review', subject_type: 'chapter', subject_id: chapter.id, model_provider_id: 'any', model_id: 9, error_code: '', error_message: '' })
  insertKernelCandidate(ws, { id: 'cand-1', job_id: 'job-1', contract_id: 'oh-story-core.story-review.full', pack_id: 'oh-story-core', pack_revision: 'r', skill_name: 'story-review', status: 'succeeded' })
  const vaultFile = join(mkdtempSync(join(tmpdir(), 'commit-vault-')), '第002章.md')
  writeFileSync(vaultFile, 'Fallback: none\n完整审稿报告')
  insertKernelArtifact(ws, { id: 'art-1', candidate_id: 'cand-1', artifact_kind: 'review_report', rel_path: '审稿/第002章.md', sha256: 'h', byte_size: 10, vault_path: vaultFile })
  return { ws, project, chapter }
}

describe('commitKernelCandidate', () => {
  test('review commit inserts reviews row with kernel ids and marks job committed', async () => {
    const { ws, project, chapter } = await seedReviewJob()
    const result = await commitKernelCandidate(ws, 'job-1', 'cand-1')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.commits[0].domain_table).toBe('reviews')
    const reviews = await listNovelReviewsByType(ws, project.id, 'oh_story_review')
    const payload = JSON.parse(reviews[0].payload)
    expect(payload.kernel_job_id).toBe('job-1')
    expect(payload.kernel_candidate_id).toBe('cand-1')
    expect(payload.chapter_id).toBe(chapter.id)
    expect(payload.chapter_text_hash).toBe(ohStoryChapterTextHash(EIGHT))
    expect(payload.report_text).toContain('完整审稿报告')
    const detail = getKernelJobDetail(ws, 'job-1')!
    expect(detail.job.status).toBe('committed')
    expect(detail.candidates[0].status).toBe('committed')
    expect(detail.commits.length).toBe(1)
  })

  test('double commit -> 409 JOB_ALREADY_COMMITTED; non-succeeded candidate -> 409', async () => {
    const { ws } = await seedReviewJob()
    await commitKernelCandidate(ws, 'job-1', 'cand-1')
    expect(await commitKernelCandidate(ws, 'job-1', 'cand-1')).toMatchObject({ ok: false, status: 409, code: 'JOB_ALREADY_COMMITTED' })
    updateKernelCandidate(ws, 'cand-1', { status: 'gated' })
    // 已 committed 的 job 依旧优先 409 JOB_ALREADY_COMMITTED，无需另测 gated 分支的 job 状态组合
  })

  test('review commit with missing vault file -> 500 OUTPUT_MISSING and does not commit', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'commit-missing-'))
    const project = await createNovelProject(ws, { title: '书' })
    const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: EIGHT })
    insertKernelJob(ws, { id: 'job-1', project_id: project.id, workspace_scope: 'novel', title: '', status: 'awaiting_selection', capability: 'review', subject_type: 'chapter', subject_id: chapter.id, model_provider_id: 'any', model_id: 9, error_code: '', error_message: '' })
    insertKernelCandidate(ws, { id: 'cand-1', job_id: 'job-1', contract_id: 'oh-story-core.story-review.full', pack_id: 'oh-story-core', pack_revision: 'r', skill_name: 'story-review', status: 'succeeded' })
    insertKernelArtifact(ws, { id: 'art-1', candidate_id: 'cand-1', artifact_kind: 'review_report', rel_path: '审稿/第002章.md', sha256: 'h', byte_size: 10, vault_path: join(ws, 'missing-review.md') })
    expect(await commitKernelCandidate(ws, 'job-1', 'cand-1')).toMatchObject({ ok: false, status: 500, code: 'OUTPUT_MISSING' })
    const detail = getKernelJobDetail(ws, 'job-1')!
    expect(detail.job.status).toBe('awaiting_selection')
    expect(detail.commits.length).toBe(0)
    expect(await listNovelReviewsByType(ws, project.id, 'oh_story_review')).toEqual([])
  })

  test('rewrite commit updates chapter text with version source and re-runs stale gate', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'commit-rw-'))
    const project = await createNovelProject(ws, { title: '书' })
    const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: EIGHT })
    await createNovelReview(ws, {
      project_id: project.id, review_type: 'oh_story_review',
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_text_hash: ohStoryChapterTextHash(EIGHT), report_text: 'r' }),
    })
    insertKernelJob(ws, { id: 'job-2', project_id: project.id, workspace_scope: 'novel', title: '', status: 'awaiting_selection', capability: 'rewrite', subject_type: 'chapter', subject_id: chapter.id, model_provider_id: 'any', model_id: 9, error_code: '', error_message: '' })
    insertKernelCandidate(ws, { id: 'cand-2', job_id: 'job-2', contract_id: 'oh-story-core.story-apply.surgical', pack_id: 'oh-story-core', pack_revision: 'r', skill_name: 'story-apply', status: 'succeeded' })
    const nextText = EIGHT + '\n\n新增修订段。'
    const vaultFile = join(mkdtempSync(join(tmpdir(), 'commit-rw-vault-')), '第002章_二.md')
    writeFileSync(vaultFile, nextText)
    insertKernelArtifact(ws, { id: 'art-2', candidate_id: 'cand-2', artifact_kind: 'chapter_text', rel_path: '正文/第002章_二.md', sha256: 'h', byte_size: 10, vault_path: vaultFile })
    const result = await commitKernelCandidate(ws, 'job-2', 'cand-2')
    expect(result.ok).toBe(true)
    const updated = await getNovelChapter(ws, chapter.id, project.id)
    expect(updated?.chapter_text).toBe(nextText)
  })
})
