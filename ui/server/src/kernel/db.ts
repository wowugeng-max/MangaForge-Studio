import type { Database } from 'bun:sqlite'
import { ensureSqliteSchema, openDb } from '../novel/db'

export function ensureKernelSchema(db: Database) {
  db.exec(`
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS kernel_jobs (
  id TEXT PRIMARY KEY,
  project_id INTEGER NOT NULL,
  workspace_scope TEXT NOT NULL DEFAULT 'novel',
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  capability TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id INTEGER NOT NULL,
  model_provider_id TEXT NOT NULL DEFAULT '',
  model_id INTEGER DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT DEFAULT NULL,
  error_code TEXT DEFAULT '',
  error_message TEXT DEFAULT '',
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS kernel_candidates (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  contract_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  pack_revision TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  status TEXT NOT NULL,
  thread_id TEXT DEFAULT '',
  turn_id TEXT DEFAULT '',
  started_at TEXT DEFAULT NULL,
  finished_at TEXT DEFAULT NULL,
  error_code TEXT DEFAULT '',
  last_message_excerpt TEXT DEFAULT '',
  gate_results TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (job_id) REFERENCES kernel_jobs(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS kernel_artifacts (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  artifact_kind TEXT NOT NULL,
  rel_path TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  byte_size INTEGER NOT NULL DEFAULT 0,
  vault_path TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (candidate_id) REFERENCES kernel_candidates(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS kernel_commits (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  domain_table TEXT NOT NULL,
  domain_row_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES kernel_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_id) REFERENCES kernel_candidates(id) ON DELETE CASCADE
);
`)
}

export function openKernelDb(activeWorkspace: string): Database {
  const db = openDb(activeWorkspace)
  ensureSqliteSchema(db)
  ensureKernelSchema(db)
  return db
}

export function listCommittedTrackingDocPaths(activeWorkspace: string, projectId: number): Array<{ rel_path: string; vault_path: string }> {
  const db = openKernelDb(activeWorkspace)
  try {
    return db.query(`
      SELECT a.rel_path AS rel_path, a.vault_path AS vault_path
      FROM kernel_artifacts a
      JOIN kernel_commits c ON c.candidate_id = a.candidate_id
      JOIN kernel_jobs j ON j.id = c.job_id
      WHERE j.project_id = ? AND a.artifact_kind = 'tracking_doc'
      ORDER BY c.created_at DESC
    `).all(projectId) as Array<{ rel_path: string; vault_path: string }>
  } finally {
    db.close()
  }
}
