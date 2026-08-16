// ui/server/src/kernel/jobs/repo.ts
import { openKernelDb } from '../db'

export type KernelJobRow = {
  id: string; project_id: number; workspace_scope: string; title: string; status: string
  capability: string; subject_type: string; subject_id: number
  model_provider_id: string; model_id: number | null
  created_at: string; updated_at: string; finished_at: string | null
  error_code: string; error_message: string
}
export type KernelCandidateRow = {
  id: string; job_id: string; contract_id: string; pack_id: string; pack_revision: string
  skill_name: string; status: string; thread_id: string; turn_id: string
  started_at: string | null; finished_at: string | null; error_code: string
  last_message_excerpt: string; gate_results: string; metadata: string
}

function withDb<T>(ws: string, fn: (db: ReturnType<typeof openKernelDb>) => T): T {
  const db = openKernelDb(ws)
  try {
    return fn(db)
  } finally {
    db.close()
  }
}

export function insertKernelJob(ws: string, row: Omit<KernelJobRow, 'created_at' | 'updated_at' | 'finished_at'>): void {
  withDb(ws, db => db.query(`
    INSERT INTO kernel_jobs (id, project_id, workspace_scope, title, status, capability, subject_type, subject_id, model_provider_id, model_id, error_code, error_message)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(row.id, row.project_id, row.workspace_scope, row.title, row.status, row.capability, row.subject_type, row.subject_id, row.model_provider_id, row.model_id, row.error_code, row.error_message))
}

export function insertKernelCandidate(ws: string, row: Pick<KernelCandidateRow, 'id' | 'job_id' | 'contract_id' | 'pack_id' | 'pack_revision' | 'skill_name' | 'status'>): void {
  withDb(ws, db => db.query(`
    INSERT INTO kernel_candidates (id, job_id, contract_id, pack_id, pack_revision, skill_name, status)
    VALUES (?,?,?,?,?,?,?)
  `).run(row.id, row.job_id, row.contract_id, row.pack_id, row.pack_revision, row.skill_name, row.status))
}

const JOB_PATCH_COLUMNS = ['status', 'finished_at', 'error_code', 'error_message'] as const
const CANDIDATE_PATCH_COLUMNS = ['status', 'thread_id', 'turn_id', 'started_at', 'finished_at', 'error_code', 'last_message_excerpt', 'gate_results', 'metadata'] as const

export function updateKernelJob(ws: string, id: string, patch: Partial<Pick<KernelJobRow, typeof JOB_PATCH_COLUMNS[number]>>): void {
  const sets: string[] = ["updated_at = datetime('now')"]
  const values: any[] = []
  for (const column of JOB_PATCH_COLUMNS) {
    if (patch[column] === undefined) continue
    sets.push(`${column} = ?`)
    values.push(patch[column])
  }
  withDb(ws, db => db.query(`UPDATE kernel_jobs SET ${sets.join(', ')} WHERE id = ?`).run(...values, id))
}

export function updateKernelCandidate(ws: string, id: string, patch: Partial<Pick<KernelCandidateRow, typeof CANDIDATE_PATCH_COLUMNS[number]>>): void {
  const sets: string[] = []
  const values: any[] = []
  for (const column of CANDIDATE_PATCH_COLUMNS) {
    if (patch[column] === undefined) continue
    sets.push(`${column} = ?`)
    values.push(patch[column])
  }
  if (!sets.length) return
  withDb(ws, db => db.query(`UPDATE kernel_candidates SET ${sets.join(', ')} WHERE id = ?`).run(...values, id))
}

export function insertKernelArtifact(ws: string, row: { id: string; candidate_id: string; artifact_kind: string; rel_path: string; sha256: string; byte_size: number; vault_path: string; metadata?: string }): void {
  withDb(ws, db => db.query(`
    INSERT INTO kernel_artifacts (id, candidate_id, artifact_kind, rel_path, sha256, byte_size, vault_path, metadata)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(row.id, row.candidate_id, row.artifact_kind, row.rel_path, row.sha256, row.byte_size, row.vault_path, row.metadata ?? '{}'))
}

export function insertKernelCommit(ws: string, row: { id: string; job_id: string; candidate_id: string; domain_table: string; domain_row_id: number }): void {
  withDb(ws, db => db.query(`
    INSERT INTO kernel_commits (id, job_id, candidate_id, domain_table, domain_row_id) VALUES (?,?,?,?,?)
  `).run(row.id, row.job_id, row.candidate_id, row.domain_table, row.domain_row_id))
}

export function getKernelJobDetail(ws: string, jobId: string) {
  return withDb(ws, db => {
    const job = db.query('SELECT * FROM kernel_jobs WHERE id = ?').get(jobId) as KernelJobRow | null
    if (!job) return null
    const candidates = db.query('SELECT * FROM kernel_candidates WHERE job_id = ? ORDER BY id').all(jobId) as KernelCandidateRow[]
    const candidateIds = candidates.map(c => c.id)
    const placeholders = candidateIds.map(() => '?').join(',')
    const artifacts = candidateIds.length
      ? db.query(`SELECT * FROM kernel_artifacts WHERE candidate_id IN (${placeholders}) ORDER BY id`).all(...candidateIds)
      : []
    const commits = db.query('SELECT * FROM kernel_commits WHERE job_id = ? ORDER BY created_at').all(jobId)
    return { job, candidates, artifacts, commits }
  })
}

export function listKernelJobs(ws: string, filter: { projectId?: number; subjectType?: string; subjectId?: number }): KernelJobRow[] {
  const where: string[] = []
  const values: any[] = []
  if (filter.projectId) { where.push('project_id = ?'); values.push(filter.projectId) }
  if (filter.subjectType) { where.push('subject_type = ?'); values.push(filter.subjectType) }
  if (filter.subjectId) { where.push('subject_id = ?'); values.push(filter.subjectId) }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  return withDb(ws, db => db.query(`SELECT * FROM kernel_jobs ${clause} ORDER BY created_at DESC, id DESC LIMIT 50`).all(...values) as KernelJobRow[])
}
