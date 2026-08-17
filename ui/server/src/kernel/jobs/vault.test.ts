// ui/server/src/kernel/jobs/vault.test.ts
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelProject } from '../../novel'
import { insertKernelCandidate, insertKernelJob, getKernelJobDetail } from './repo'
import { persistCandidateArtifacts } from './vault'

test('persists artifact copies under vault and registers ledger rows', async () => {
  const ws = mkdtempSync(join(tmpdir(), 'vault-'))
  const project = await createNovelProject(ws, { title: '书' })
  insertKernelJob(ws, { id: 'job-1', project_id: project.id, workspace_scope: 'novel', title: '', status: 'running', capability: 'review', subject_type: 'chapter', subject_id: 1, model_provider_id: '', model_id: null, error_code: '', error_message: '', verb: '', verb_params: '{}', subject_key: '', brief_json: '' })
  insertKernelCandidate(ws, { id: 'cand-1', job_id: 'job-1', contract_id: 'a.b.c', pack_id: 'a', pack_revision: 'r', skill_name: 'b', status: 'running' })
  const src = mkdtempSync(join(tmpdir(), 'vault-src-'))
  mkdirSync(join(src, '审稿'), { recursive: true })
  writeFileSync(join(src, '审稿/第002章.md'), '报告正文')
  const rows = persistCandidateArtifacts(ws, 'cand-1', [
    { rel_path: '审稿/第002章.md', artifact_kind: 'review_report', sha256: 'h', byte_size: 12, copied_path: join(src, '审稿/第002章.md') },
  ])
  expect(rows.length).toBe(1)
  expect(rows[0].artifact_id.startsWith('art-')).toBe(true)
  expect(existsSync(rows[0].vault_path)).toBe(true)
  expect(readFileSync(rows[0].vault_path, 'utf8')).toBe('报告正文')
  const detail = getKernelJobDetail(ws, 'job-1')!
  expect(detail.artifacts[0].vault_path).toBe(rows[0].vault_path)
})
