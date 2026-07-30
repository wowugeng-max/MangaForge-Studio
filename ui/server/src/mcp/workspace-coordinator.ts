import { AsyncLocalStorage } from 'node:async_hooks'
import { resolve } from 'node:path'

type Waiter = {
  resolve(release: () => void): void
}

type WorkspaceLock = {
  locked: boolean
  waiters: Waiter[]
}

const locks = new Map<string, WorkspaceLock>()
const held = new AsyncLocalStorage<Set<string>>()

function keyForWorkspace(activeWorkspace: string) {
  return resolve(activeWorkspace)
}

async function acquire(key: string) {
  let lock = locks.get(key)
  if (!lock) {
    lock = { locked: false, waiters: [] }
    locks.set(key, lock)
  }
  const release = () => {
    const next = lock!.waiters.shift()
    if (next) return next.resolve(release)
    lock!.locked = false
    locks.delete(key)
  }
  if (!lock.locked) {
    lock.locked = true
    return release
  }
  return new Promise<() => void>(resolveRelease => {
    lock!.waiters.push({ resolve: resolveRelease })
  })
}

export async function withMcpWorkspaceMutation<T>(
  activeWorkspace: string,
  mutation: () => Promise<T>,
): Promise<T> {
  const key = keyForWorkspace(activeWorkspace)
  const active = held.getStore()
  if (active?.has(key)) return mutation()
  const release = await acquire(key)
  const next = new Set(active || [])
  next.add(key)
  try {
    return await held.run(next, mutation)
  } finally {
    release()
  }
}

export function assertMcpWorkspaceMutationHeld(activeWorkspace: string) {
  if (!held.getStore()?.has(keyForWorkspace(activeWorkspace))) {
    throw new Error('MCP workspace mutation coordinator is not held')
  }
}
