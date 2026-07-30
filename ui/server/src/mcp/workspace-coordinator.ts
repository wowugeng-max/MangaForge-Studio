import { AsyncLocalStorage } from 'node:async_hooks'
import { resolve } from 'node:path'

type Waiter = {
  resolve(release: () => void): void
}

type WorkspaceLock = {
  locked: boolean
  waiters: Waiter[]
}

type WorkspaceLease = {
  active: boolean
}

const locks = new Map<string, WorkspaceLock>()
const held = new AsyncLocalStorage<Map<string, WorkspaceLease>>()

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
  if (active?.get(key)?.active) return mutation()
  const release = await acquire(key)
  const lease = { active: true }
  const next = new Map(active || [])
  next.set(key, lease)
  try {
    return await held.run(next, mutation)
  } finally {
    lease.active = false
    release()
  }
}

export function assertMcpWorkspaceMutationHeld(activeWorkspace: string) {
  if (!held.getStore()?.get(keyForWorkspace(activeWorkspace))?.active) {
    throw new Error('MCP workspace mutation coordinator is not held')
  }
}
