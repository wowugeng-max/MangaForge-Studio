import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { listCommittedTrackingDocPaths, openKernelDb } from './db'

function tempWs() { return mkdtempSync(join(tmpdir(), 'kernel-db-')) }

describe('kernel db', () => {
  test('openKernelDb creates the four kernel tables', () => {
    const db = openKernelDb(tempWs())
    const names = (db.query("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]).map(r => r.name)
    for (const table of ['kernel_jobs', 'kernel_candidates', 'kernel_artifacts', 'kernel_commits']) {
      expect(names).toContain(table)
    }
    const candidateCols = (db.query('PRAGMA table_info(kernel_candidates)').all() as any[]).map(c => c.name)
    expect(candidateCols).toContain('metadata')
    db.close()
  })

  test('kernel job insert honors defaults and cascade delete', () => {
    const ws = tempWs()
    const db = openKernelDb(ws)
    db.exec("INSERT INTO projects (id, title) VALUES (3, 't')")
    db.exec("INSERT INTO kernel_jobs (id, project_id, status, capability, subject_type, subject_id) VALUES ('j1', 3, 'queued', 'review', 'chapter', 62)")
    db.exec("INSERT INTO kernel_candidates (id, job_id, contract_id, pack_id, pack_revision, skill_name, status) VALUES ('c1', 'j1', 'a.b.c', 'a', 'rev', 'b', 'queued')")
    db.exec("DELETE FROM kernel_jobs WHERE id='j1'")
    expect((db.query('SELECT COUNT(*) AS n FROM kernel_candidates').get() as any).n).toBe(0)
    db.close()
  })

  test('listCommittedTrackingDocPaths returns [] when nothing committed', () => {
    const ws = tempWs()
    openKernelDb(ws).close()
    expect(listCommittedTrackingDocPaths(ws, 3)).toEqual([])
  })
})
