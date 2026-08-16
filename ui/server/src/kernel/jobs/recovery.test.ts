// ui/server/src/kernel/jobs/recovery.test.ts
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelProject } from '../../novel'
import { kernelJobDir } from '../paths'
import { getKernelJobDetail, insertKernelCandidate, insertKernelJob } from './repo'
import { cleanupKernelJobDirs, recoverOrphanKernelJobs } from './run-job'

test('orphan running job is failed with ENGINE_FAILED on recovery', async () => {
  const ws = mkdtempSync(join(tmpdir(), 'recover-'))
  const project = await createNovelProject(ws, { title: '书' })
  insertKernelJob(ws, { id: 'job-1', project_id: project.id, workspace_scope: 'novel', title: '', status: 'running', capability: 'review', subject_type: 'chapter', subject_id: 1, model_provider_id: '', model_id: null, error_code: '', error_message: '' })
  insertKernelCandidate(ws, { id: 'cand-1', job_id: 'job-1', contract_id: 'a.b.c', pack_id: 'a', pack_revision: 'r', skill_name: 'b', status: 'running' })
  expect(recoverOrphanKernelJobs(ws)).toBe(1)
  const detail = getKernelJobDetail(ws, 'job-1')!
  expect(detail.job.status).toBe('failed')
  expect(detail.job.error_code).toBe('ENGINE_FAILED')
  expect(detail.candidates[0].status).toBe('failed')
  expect(recoverOrphanKernelJobs(ws)).toBe(0)
})

test('cleanup removes project and codex-home but keeps events and artifacts', async () => {
  const ws = mkdtempSync(join(tmpdir(), 'cleanup-'))
  const project = await createNovelProject(ws, { title: '书' })
  insertKernelJob(ws, { id: 'job-2', project_id: project.id, workspace_scope: 'novel', title: '', status: 'committed', capability: 'review', subject_type: 'chapter', subject_id: 1, model_provider_id: '', model_id: null, error_code: '', error_message: '' })
  insertKernelCandidate(ws, { id: 'cand-2', job_id: 'job-2', contract_id: 'a.b.c', pack_id: 'a', pack_revision: 'r', skill_name: 'b', status: 'committed' })
  const dir = kernelJobDir(ws, 'job-2/candidates/cand-2')
  for (const sub of ['project', 'codex-home', 'snapshot', 'artifacts']) mkdirSync(join(dir, sub), { recursive: true })
  writeFileSync(join(dir, 'project', 'x.md'), 'x')
  writeFileSync(join(dir, 'events.jsonl'), '{}')
  cleanupKernelJobDirs(ws, 'job-2')
  expect(existsSync(join(dir, 'project'))).toBe(false)
  expect(existsSync(join(dir, 'codex-home'))).toBe(false)
  expect(existsSync(join(dir, 'events.jsonl'))).toBe(true)
  expect(existsSync(join(dir, 'snapshot'))).toBe(true)
  expect(existsSync(join(dir, 'artifacts'))).toBe(true)
})
