import { AsyncLocalStorage } from 'node:async_hooks'
import { getNovelMutationTestHook } from '../novel-test-support'
import { canonicalFilesystemIdentity } from '../workspace-identity'
import { dbPathFromEnv, getNovelDbPath, mutationLockTimeoutMs } from './paths'


export const novelMutationLocks = new Map<string, NovelMutationLock>()

type NovelWorkspaceLease = { active: boolean }

export const novelMutationContext = new AsyncLocalStorage<Map<string, NovelWorkspaceLease>>()

export function novelMutationKey(activeWorkspace: string) {
  return canonicalFilesystemIdentity(dbPathFromEnv() || getNovelDbPath(activeWorkspace))
}

export function releaseNovelMutationLock(key: string, lock: NovelMutationLock) {
  const next = lock.waiters.shift()
  if (next) {
    clearTimeout(next.timer)
    next.resolve(() => releaseNovelMutationLock(key, lock))
    return
  }
  lock.locked = false
  novelMutationLocks.delete(key)
}

export function acquireNovelMutationLock(key: string) {
  let lock = novelMutationLocks.get(key)
  if (!lock) {
    lock = { locked: false, waiters: [] }
    novelMutationLocks.set(key, lock)
  }
  if (!lock.locked) {
    lock.locked = true
    return Promise.resolve(() => releaseNovelMutationLock(key, lock!))
  }
  return new Promise<() => void>((resolve, reject) => {
    const timeoutMs = mutationLockTimeoutMs()
    const waiter: NovelMutationWaiter = {
      resolve,
      reject,
      timer: setTimeout(() => {
        const index = lock!.waiters.indexOf(waiter)
        if (index >= 0) lock!.waiters.splice(index, 1)
        reject(new Error(`novel workspace mutation lock timeout after ${timeoutMs}ms`))
      }, timeoutMs),
    }
    lock!.waiters.push(waiter)
  })
}

export async function withNovelWorkspaceMutation<T>(activeWorkspace: string, mutation: () => Promise<T>, operation = 'mutation'): Promise<T> {
  const key = novelMutationKey(activeWorkspace)
  const active = novelMutationContext.getStore()
  if (active?.get(key)?.active) return mutation()
  const release = await acquireNovelMutationLock(key)
  const lease = { active: true }
  const next = new Map(active || [])
  next.set(key, lease)
  try {
    const testHook = getNovelMutationTestHook()
    if (testHook) await testHook({ activeWorkspace, phase: 'after_mutation_lock_acquired', operation })
    return await novelMutationContext.run(next, mutation)
  } finally {
    lease.active = false
    release()
  }
}

export function isNovelWorkspaceMutationHeld(activeWorkspace: string) {
  return Boolean(novelMutationContext.getStore()?.get(novelMutationKey(activeWorkspace))?.active)
}

export function assertNovelWorkspaceMutationHeld(activeWorkspace: string) {
  if (!isNovelWorkspaceMutationHeld(activeWorkspace)) {
    throw new Error('novel store write attempted outside workspace mutation lock')
  }
}
