import { AsyncLocalStorage } from 'node:async_hooks'
import type { Database } from 'bun:sqlite'
import { nowIso } from './json'

export type EditorRevisionWorkerFence = {
  workspace: string
  projectId: number
  runId: number
  owner: string
}

const workerFenceContext = new AsyncLocalStorage<EditorRevisionWorkerFence>()

function workerFenceError(code: 'REVISION_CANCELED' | 'REVISION_LEASE_LOST') {
  return Object.assign(new Error(code), { code })
}

export function assertEditorRevisionWorkerLease(
  db: Database,
  input: { projectId: number; runId: number; owner: string; now?: string },
) {
  const timestamp = input.now || nowIso()
  const lease = db.query(`
    SELECT status, cancel_requested_at, lease_owner,
      CASE
        WHEN lease_expires_at IS NOT NULL AND julianday(lease_expires_at) > julianday(?) THEN 1
        ELSE 0
      END AS lease_live
    FROM runs
    WHERE id = ? AND project_id = ? AND run_type = 'editor_revision'
    LIMIT 1
  `).get(timestamp, input.runId, input.projectId) as any
  const ownedLiveLease = lease?.lease_owner === input.owner && Number(lease?.lease_live || 0) === 1
  if (ownedLiveLease && (lease.status === 'cancel_requested' || lease.cancel_requested_at)) {
    throw workerFenceError('REVISION_CANCELED')
  }
  if (!ownedLiveLease || lease.status !== 'running') throw workerFenceError('REVISION_LEASE_LOST')
}

export function assertEditorRevisionWorkerFenceForWrite(db: Database, workspace: string) {
  const fence = workerFenceContext.getStore()
  if (!fence) return
  if (fence.workspace !== workspace) throw workerFenceError('REVISION_LEASE_LOST')
  assertEditorRevisionWorkerLease(db, fence)
}

export function withEditorRevisionWorkerFence<T>(
  fence: EditorRevisionWorkerFence,
  operation: () => Promise<T>,
): Promise<T> {
  const existing = workerFenceContext.getStore()
  if (existing && (
    existing.workspace !== fence.workspace
    || existing.projectId !== fence.projectId
    || existing.runId !== fence.runId
    || existing.owner !== fence.owner
  )) {
    return Promise.reject(workerFenceError('REVISION_LEASE_LOST'))
  }
  return workerFenceContext.run(fence, operation)
}
