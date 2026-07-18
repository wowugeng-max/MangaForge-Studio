import { AsyncLocalStorage } from 'node:async_hooks'
import { getNovelMutationTestHook } from '../novel-test-support'
import { dbPathFromEnv, getNovelDbPath, mutationLockTimeoutMs } from './paths'


export const novelMutationLocks = new Map<string, NovelMutationLock>()

export const novelMutationContext = new AsyncLocalStorage<Set<string>>()

export function novelMutationKey(activeWorkspace: string) { return dbPathFromEnv() || getNovelDbPath(activeWorkspace) }

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
  const activeKeys = novelMutationContext.getStore()
  if (activeKeys?.has(key)) return mutation()
  const release = await acquireNovelMutationLock(key)
  const nextKeys = new Set(activeKeys || [])
  nextKeys.add(key)
  try {
    const testHook = getNovelMutationTestHook()
    if (testHook) await testHook({ activeWorkspace, phase: 'after_mutation_lock_acquired', operation })
    return await novelMutationContext.run(nextKeys, mutation)
  } finally {
    release()
  }
}

export function assertNovelWorkspaceMutationHeld(activeWorkspace: string) {
  if (!novelMutationContext.getStore()?.has(novelMutationKey(activeWorkspace))) {
    throw new Error('novel store write attempted outside workspace mutation lock')
  }
}
