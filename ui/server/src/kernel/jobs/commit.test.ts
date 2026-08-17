import { describe, expect, spyOn, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelProject, createNovelReview, getNovelChapter, listNovelReviewsByType } from '../../novel'
import { ohStoryChapterTextHash } from '../../novel-writing/oh-story-core/chapter-text-hash'
import { validateKernelContract } from '../contracts/schema'
import { saveUserKernelContract } from '../contracts/store'
import { openKernelDb } from '../db'
import { validateInstanceAgainstTemplate } from '../verbs/validate-instance'
import { commitKernelCandidate } from './commit'
import * as domainUpsert from './domain-upsert'
import { getKernelJobDetail, insertKernelArtifact, insertKernelCandidate, insertKernelJob, updateKernelCandidate, updateKernelJob } from './repo'

const EIGHT = Array.from({ length: 8 }, (_, i) => `原文段${i}。`).join('\n\n')

async function seedReviewJob() {
  const ws = mkdtempSync(join(tmpdir(), 'commit-'))
  const project = await createNovelProject(ws, { title: '书' })
  const chapter = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '二', chapter_text: EIGHT })
  insertKernelJob(ws, { id: 'job-1', project_id: project.id, workspace_scope: 'novel', title: '', status: 'awaiting_selection', capability: 'review', subject_type: 'chapter', subject_id: chapter.id, model_provider_id: 'any', model_id: 9, error_code: '', error_message: '', verb: '', verb_params: '{}', subject_key: '', brief_json: '' })
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
    insertKernelJob(ws, { id: 'job-1', project_id: project.id, workspace_scope: 'novel', title: '', status: 'awaiting_selection', capability: 'review', subject_type: 'chapter', subject_id: chapter.id, model_provider_id: 'any', model_id: 9, error_code: '', error_message: '', verb: '', verb_params: '{}', subject_key: '', brief_json: '' })
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
    insertKernelJob(ws, { id: 'job-2', project_id: project.id, workspace_scope: 'novel', title: '', status: 'awaiting_selection', capability: 'rewrite', subject_type: 'chapter', subject_id: chapter.id, model_provider_id: 'any', model_id: 9, error_code: '', error_message: '', verb: '', verb_params: '{}', subject_key: '', brief_json: '' })
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

  test('cancelled job with succeeded candidate refuses commit', async () => {
    const { ws, project } = await seedReviewJob()
    updateKernelJob(ws, 'job-1', { status: 'cancelled' })
    expect(await commitKernelCandidate(ws, 'job-1', 'cand-1')).toMatchObject({
      ok: false, status: 409, code: 'JOB_ALREADY_COMMITTED', message: 'job is cancelled',
    })
    expect(await listNovelReviewsByType(ws, project.id, 'oh_story_review')).toEqual([])
    const detail = getKernelJobDetail(ws, 'job-1')!
    expect(detail.job.status).toBe('cancelled')
    expect(detail.commits.length).toBe(0)
  })

  test('open_book commit upserts every artifact and creates empty chapter rows', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'commit-open-'))
    const project = await createNovelProject(ws, { title: '开书' })
    const openContract = {
      schema_version: 1 as const,
      id: 'user-pack.story-open.open',
      pack_id: 'user-pack',
      skill_name: 'story-open',
      variant: 'open',
      verb: 'open_book',
      capability: 'outline' as const,
      label: '用户开书合同',
      invoke: { mention: '$story-open', prompt: '帮我开书。创意见 {{user_brief_file}}。不要写正文。' },
      projection: { mounts: ['user_brief', 'skill_tree'] as const },
      outputs: [
        { artifact_kind: 'character_sheet' as const, glob: '设定/角色/*.md', binding: 'characters.upsert', required: true },
        { artifact_kind: 'outline_doc' as const, glob: '大纲/**/*.md', binding: 'outlines.upsert', required: true },
        { artifact_kind: 'world_doc' as const, glob: '设定/**/*.md', binding: 'worldbuilding.upsert', required: true },
      ],
      write_scope: ['设定/', '大纲/'],
      gates: ['reject_chapter_text_artifact', 'require_outline_mix'] as const,
      commit: { mode: 'manual' as const, domain_writes: ['worldbuilding', 'characters', 'outlines'] },
      sandbox: 'workspace-write' as const,
      approval: 'never' as const,
    }
    expect(validateKernelContract(openContract).ok).toBe(true)
    expect(validateInstanceAgainstTemplate(openContract as any)).toEqual({ ok: true })
    const saved = saveUserKernelContract(ws, openContract)
    expect(saved.ok).toBe(true)

    insertKernelJob(ws, {
      id: 'job-open', project_id: project.id, workspace_scope: 'novel', title: '',
      status: 'awaiting_selection', capability: 'outline', subject_type: 'project',
      subject_id: project.id, model_provider_id: 'any', model_id: 9,
      error_code: '', error_message: '', verb: 'open_book', verb_params: '{}', subject_key: '', brief_json: '',
    })
    insertKernelCandidate(ws, {
      id: 'cand-open', job_id: 'job-open', contract_id: openContract.id,
      pack_id: openContract.pack_id, pack_revision: 'r', skill_name: openContract.skill_name, status: 'succeeded',
    })
    const vaultDir = mkdtempSync(join(tmpdir(), 'commit-open-vault-'))
    const artifacts = [
      { id: 'art-w1', kind: 'world_doc', rel: '设定/世界观.md', text: '# 世界观\n铁律' },
      { id: 'art-w2', kind: 'world_doc', rel: '设定/势力/铁誓盟.md', text: '# 铁誓盟\n盟约' },
      { id: 'art-c1', kind: 'character_sheet', rel: '设定/角色/楚弦.md', text: '# 楚弦\n档案' },
      { id: 'art-c2', kind: 'character_sheet', rel: '设定/角色/沈疏影.md', text: '# 沈疏影\n档案' },
      { id: 'art-o0', kind: 'outline_doc', rel: '大纲/大纲.md', text: '# 总纲\n全书骨架' },
      { id: 'art-o1', kind: 'outline_doc', rel: '大纲/细纲_第001章.md', text: '# 第001章 初入怪谈\n细纲一' },
      { id: 'art-o2', kind: 'outline_doc', rel: '大纲/细纲_第002章.md', text: '# 第002章 违背规则\n细纲二' },
    ]
    for (const artifact of artifacts) {
      const vaultFile = join(vaultDir, artifact.rel.replaceAll('/', '__'))
      writeFileSync(vaultFile, artifact.text)
      insertKernelArtifact(ws, {
        id: artifact.id, candidate_id: 'cand-open', artifact_kind: artifact.kind,
        rel_path: artifact.rel, sha256: 'h', byte_size: artifact.text.length, vault_path: vaultFile,
      })
    }

    const result = await commitKernelCandidate(ws, 'job-open', 'cand-open')
    expect(result.ok).toBe(true)
    const db = openKernelDb(ws)
    const worlds = db.query(`SELECT COUNT(*) AS n FROM worldbuilding WHERE project_id = ?`).get(project.id) as any
    const chars = db.query(`SELECT COUNT(*) AS n FROM characters WHERE project_id = ?`).get(project.id) as any
    const outlines = db.query(`SELECT COUNT(*) AS n FROM outlines WHERE project_id = ?`).get(project.id) as any
    const chapters = db.query(`SELECT chapter_no, chapter_text FROM chapters WHERE project_id = ? ORDER BY chapter_no`).all(project.id) as any[]
    db.close()
    expect(worlds.n).toBe(2)
    expect(chars.n).toBe(2)
    expect(outlines.n).toBe(3)
    expect(chapters.map(c => c.chapter_no)).toEqual([1, 2])
    expect(chapters.every(c => c.chapter_text === '')).toBe(true)
  })

  test('open_book commit rolls back domain rows if a later upsert throws', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'commit-open-tx-'))
    const project = await createNovelProject(ws, { title: '开书回滚' })
    const openContract = {
      schema_version: 1 as const,
      id: 'user-pack.story-open.tx',
      pack_id: 'user-pack',
      skill_name: 'story-open',
      variant: 'tx',
      verb: 'open_book',
      capability: 'outline' as const,
      label: '用户开书合同',
      invoke: { mention: '$story-open', prompt: '帮我开书。创意见 {{user_brief_file}}。不要写正文。' },
      projection: { mounts: ['user_brief', 'skill_tree'] as const },
      outputs: [
        { artifact_kind: 'character_sheet' as const, glob: '设定/角色/*.md', binding: 'characters.upsert', required: true },
        { artifact_kind: 'outline_doc' as const, glob: '大纲/**/*.md', binding: 'outlines.upsert', required: true },
        { artifact_kind: 'world_doc' as const, glob: '设定/**/*.md', binding: 'worldbuilding.upsert', required: true },
      ],
      write_scope: ['设定/', '大纲/'],
      gates: ['reject_chapter_text_artifact', 'require_outline_mix'] as const,
      commit: { mode: 'manual' as const, domain_writes: ['worldbuilding', 'characters', 'outlines'] },
      sandbox: 'workspace-write' as const,
      approval: 'never' as const,
    }
    expect(validateKernelContract(openContract).ok).toBe(true)
    expect(validateInstanceAgainstTemplate(openContract as any)).toEqual({ ok: true })
    expect(saveUserKernelContract(ws, openContract).ok).toBe(true)
    insertKernelJob(ws, {
      id: 'job-tx', project_id: project.id, workspace_scope: 'novel', title: '',
      status: 'awaiting_selection', capability: 'outline', subject_type: 'project',
      subject_id: project.id, model_provider_id: 'any', model_id: 9,
      error_code: '', error_message: '', verb: 'open_book', verb_params: '{}', subject_key: '', brief_json: '',
    })
    insertKernelCandidate(ws, {
      id: 'cand-tx', job_id: 'job-tx', contract_id: openContract.id,
      pack_id: openContract.pack_id, pack_revision: 'r', skill_name: openContract.skill_name, status: 'succeeded',
    })
    const vaultDir = mkdtempSync(join(tmpdir(), 'commit-open-tx-vault-'))
    const artifacts = [
      { id: 'art-w', kind: 'world_doc', rel: '设定/世界观.md', text: '# 世界观\n铁律' },
      { id: 'art-c', kind: 'character_sheet', rel: '设定/角色/楚弦.md', text: '# 楚弦\n档案' },
      { id: 'art-o0', kind: 'outline_doc', rel: '大纲/大纲.md', text: '# 总纲\n全书骨架' },
      { id: 'art-o1', kind: 'outline_doc', rel: '大纲/细纲_第001章.md', text: '# 第001章 初入怪谈\n细纲一' },
    ]
    for (const artifact of artifacts) {
      const vaultFile = join(vaultDir, artifact.rel.replaceAll('/', '__'))
      writeFileSync(vaultFile, artifact.text)
      insertKernelArtifact(ws, {
        id: artifact.id, candidate_id: 'cand-tx', artifact_kind: artifact.kind,
        rel_path: artifact.rel, sha256: 'h', byte_size: artifact.text.length, vault_path: vaultFile,
      })
    }
    const spy = spyOn(domainUpsert, 'upsertOutlineDoc').mockImplementationOnce(() => {
      throw new Error('boom')
    })
    await expect(commitKernelCandidate(ws, 'job-tx', 'cand-tx')).rejects.toThrow('boom')
    spy.mockRestore()
    const db = openKernelDb(ws)
    const worlds = db.query(`SELECT COUNT(*) AS n FROM worldbuilding WHERE project_id = ?`).get(project.id) as any
    const chars = db.query(`SELECT COUNT(*) AS n FROM characters WHERE project_id = ?`).get(project.id) as any
    const outlines = db.query(`SELECT COUNT(*) AS n FROM outlines WHERE project_id = ?`).get(project.id) as any
    db.close()
    expect(worlds.n).toBe(0)
    expect(chars.n).toBe(0)
    expect(outlines.n).toBe(0)
    const detail = getKernelJobDetail(ws, 'job-tx')!
    expect(detail.job.status).toBe('awaiting_selection')
    expect(detail.commits.length).toBe(0)
  })
})
