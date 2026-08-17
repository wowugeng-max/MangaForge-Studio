// ui/server/src/kernel/jobs/repo.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelProject } from '../../novel'
import {
  getKernelJobDetail, hasActiveKernelJob, insertKernelArtifact, insertKernelCandidate, insertKernelCommit,
  insertKernelJob, listKernelJobs, listKernelJobsByStatuses, updateKernelCandidate, updateKernelJob,
} from './repo'

async function seed() {
  const ws = mkdtempSync(join(tmpdir(), 'jobs-repo-'))
  const project = await createNovelProject(ws, { title: '书' })
  insertKernelJob(ws, {
    id: 'job-1', project_id: project.id, workspace_scope: 'novel', title: '第2章审稿',
    status: 'queued', capability: 'review', subject_type: 'chapter', subject_id: 62,
    model_provider_id: 'any', model_id: 9, error_code: '', error_message: '',
    verb: '', verb_params: '{}', subject_key: '', brief_json: '',
  })
  insertKernelCandidate(ws, {
    id: 'cand-1', job_id: 'job-1', contract_id: 'oh-story-core.story-review.full',
    pack_id: 'oh-story-core', pack_revision: 'rev', skill_name: 'story-review', status: 'queued',
  })
  return { ws, project }
}

describe('kernel jobs repo', () => {
  test('insert + detail round-trip with candidates/artifacts/commits', async () => {
    const { ws } = await seed()
    insertKernelArtifact(ws, { id: 'art-1', candidate_id: 'cand-1', artifact_kind: 'review_report', rel_path: '审稿/第002章.md', sha256: 'h', byte_size: 10, vault_path: '/v/art-1/第002章.md' })
    insertKernelCommit(ws, { id: 'commit-1', job_id: 'job-1', candidate_id: 'cand-1', domain_table: 'reviews', domain_row_id: 7 })
    const detail = getKernelJobDetail(ws, 'job-1')!
    expect(detail.job.status).toBe('queued')
    expect(detail.candidates.length).toBe(1)
    expect(detail.artifacts[0].rel_path).toBe('审稿/第002章.md')
    expect(detail.commits[0].domain_row_id).toBe(7)
    expect(getKernelJobDetail(ws, 'nope')).toBeNull()
  })

  test('updates patch status and metadata', async () => {
    const { ws } = await seed()
    updateKernelJob(ws, 'job-1', { status: 'running' })
    updateKernelCandidate(ws, 'cand-1', { status: 'succeeded', thread_id: 't1', gate_results: '[{"gate":"x","ok":true}]', metadata: '{"a":1}' })
    const detail = getKernelJobDetail(ws, 'job-1')!
    expect(detail.job.status).toBe('running')
    expect(detail.candidates[0].thread_id).toBe('t1')
    expect(JSON.parse(detail.candidates[0].gate_results)[0].ok).toBe(true)
  })

  test('list filters by project/subject and orders newest first', async () => {
    const { ws, project } = await seed()
    insertKernelJob(ws, {
      id: 'job-2', project_id: project.id, workspace_scope: 'novel', title: '',
      status: 'queued', capability: 'rewrite', subject_type: 'chapter', subject_id: 63,
      model_provider_id: 'any', model_id: 9, error_code: '', error_message: '',
      verb: '', verb_params: '{}', subject_key: '', brief_json: '',
    })
    expect(listKernelJobs(ws, { projectId: project.id }).length).toBe(2)
    expect(listKernelJobs(ws, { projectId: project.id, subjectId: 62 }).map(j => j.id)).toEqual(['job-1'])
    expect(listKernelJobs(ws, { projectId: 999 })).toEqual([])
  })

  test('listKernelJobsByStatuses returns all matching jobs without LIMIT 50', async () => {
    const { ws, project } = await seed()
    for (let i = 0; i < 51; i++) {
      insertKernelJob(ws, {
        id: `job-extra-${i}`, project_id: project.id, workspace_scope: 'novel', title: '',
        status: 'running', capability: 'review', subject_type: 'chapter', subject_id: 1,
        model_provider_id: 'any', model_id: 9, error_code: '', error_message: '',
        verb: '', verb_params: '{}', subject_key: '', brief_json: '',
      })
    }
    expect(listKernelJobs(ws, { projectId: project.id }).length).toBe(50)
    expect(listKernelJobsByStatuses(ws, ['running']).length).toBe(51)
    expect(listKernelJobsByStatuses(ws, ['queued']).map(j => j.id)).toEqual(['job-1'])
  })

  test('hasActiveKernelJob dedupes per verb, chapter verbs per subject', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'kernel-verb-repo-'))
    const project = await createNovelProject(ws, { title: '书' })
    insertKernelJob(ws, {
      id: 'job-a', project_id: project.id, workspace_scope: 'novel', title: '', status: 'running',
      capability: 'review', subject_type: 'chapter', subject_id: 62, model_provider_id: '', model_id: null,
      error_code: '', error_message: '', verb: 'review_chapter', verb_params: '{}', subject_key: '', brief_json: '',
    })
    expect(hasActiveKernelJob(ws, { projectId: project.id, verb: 'review_chapter', subjectId: 62 })).toBe(true)
    expect(hasActiveKernelJob(ws, { projectId: project.id, verb: 'review_chapter', subjectId: 63 })).toBe(false)
    expect(hasActiveKernelJob(ws, { projectId: project.id, verb: 'open_book' })).toBe(false)
  })
})
