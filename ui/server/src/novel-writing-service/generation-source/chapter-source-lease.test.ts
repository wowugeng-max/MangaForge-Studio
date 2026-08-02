import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, symlink, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { withMcpWorkspaceMutation } from '../../mcp/workspace-coordinator'
import { withNovelWorkspaceMutation } from '../../novel/lock'
import {
  ChapterGenerationSourceError,
  type ChapterGenerationSourceErrorCode,
  isChapterGenerationSourceError,
} from './errors'
import { ChapterSourceLeaseRegistry } from './chapter-source-lease'

const tempRoots: string[] = []

async function createWorkspace(name = 'workspace') {
  const root = await mkdtemp(join(tmpdir(), 'chapter-source-lease-'))
  tempRoots.push(root)
  const workspace = join(root, name)
  await mkdir(workspace)
  return { root, workspace }
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(resolvePromise => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('ChapterGenerationSourceError', () => {
  test('preserves its stable code contract and identifies only its own errors', () => {
    const codes: ChapterGenerationSourceErrorCode[] = [
      'GENERATION_SOURCE_BUSY',
      'GENERATION_SOURCE_CHANGED',
      'GENERATION_SOURCE_OVERRIDE_FORBIDDEN',
      'CHAPTER_MODEL_REQUIRED',
    ]
    const details = { project_id: 7 }

    for (const code of codes) {
      const error = new ChapterGenerationSourceError(code, 'message', details)
      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe('ChapterGenerationSourceError')
      expect(error.code).toBe(code)
      expect(error.error_code).toBe(code)
      expect(error.message).toBe('message')
      expect(error.details).toBe(details)
      expect(isChapterGenerationSourceError(error)).toBe(true)
    }

    expect(isChapterGenerationSourceError(new Error('message'))).toBe(false)
    expect(isChapterGenerationSourceError(null)).toBe(false)
  })
})

describe('ChapterSourceLeaseRegistry', () => {
  test('locks the same workspace and project with the documented busy error', async () => {
    const { workspace } = await createWorkspace()
    const registry = new ChapterSourceLeaseRegistry()
    const lease = await registry.acquire(workspace, 7, 'task-first')

    expect(lease.taskId).toBe('task-first')
    expect(lease.projectId).toBe(7)
    expect(registry.isActive(workspace, 7)).toBe(true)

    try {
      await registry.acquire(workspace, 7, 'task-second')
      throw new Error('expected acquire to reject')
    } catch (error) {
      expect(error).toBeInstanceOf(ChapterGenerationSourceError)
      expect(isChapterGenerationSourceError(error)).toBe(true)
      expect((error as ChapterGenerationSourceError).code).toBe('GENERATION_SOURCE_BUSY')
      expect((error as ChapterGenerationSourceError).error_code).toBe('GENERATION_SOURCE_BUSY')
      expect((error as ChapterGenerationSourceError).message)
        .toBe('当前章节任务正在运行，结束后可切换来源')
      expect((error as ChapterGenerationSourceError).details).toEqual({ project_id: 7 })
    }

    expect(registry.isActive(workspace, 7)).toBe(true)
    await lease.release()
  })

  test('allows different projects and different workspaces to run concurrently', async () => {
    const first = await createWorkspace('first')
    const second = await createWorkspace('second')
    const registry = new ChapterSourceLeaseRegistry()

    const leases = await Promise.all([
      registry.acquire(first.workspace, 1, 'first-project'),
      registry.acquire(first.workspace, 2, 'second-project'),
      registry.acquire(second.workspace, 1, 'other-workspace'),
    ])

    expect(registry.isActive(first.workspace, 1)).toBe(true)
    expect(registry.isActive(first.workspace, 2)).toBe(true)
    expect(registry.isActive(second.workspace, 1)).toBe(true)
    await Promise.all(leases.map(lease => lease.release()))
  })

  test('treats filesystem aliases as the same workspace identity', async () => {
    const { root, workspace } = await createWorkspace('physical')
    const alias = join(root, 'alias')
    await symlink(workspace, alias, 'dir')
    const registry = new ChapterSourceLeaseRegistry()
    const lease = await registry.acquire(workspace, 11, 'physical-task')

    expect(registry.isActive(alias, 11)).toBe(true)
    await expect(registry.acquire(alias, 11, 'alias-task')).rejects.toMatchObject({
      code: 'GENERATION_SOURCE_BUSY',
      error_code: 'GENERATION_SOURCE_BUSY',
      details: { project_id: 11 },
    })

    await lease.release()
  })

  test('keeps a nonexistent lexical workspace locked after it becomes a symlink', async () => {
    const { root, workspace: physical } = await createWorkspace('physical')
    const lateAlias = join(root, 'late-alias')
    const otherAlias = join(root, 'other-alias')
    const registry = new ChapterSourceLeaseRegistry()
    const lease = await registry.acquire(lateAlias, 12, 'pre-symlink-task')

    expect(registry.isActive(lateAlias, 12)).toBe(true)
    await symlink(physical, lateAlias, 'dir')
    await symlink(physical, otherAlias, 'dir')

    expect(registry.isActive(lateAlias, 12)).toBe(true)
    expect(registry.isActive(physical, 12)).toBe(true)
    expect(registry.isActive(otherAlias, 12)).toBe(true)
    await expect(registry.acquire(physical, 12, 'physical-bypass')).rejects.toMatchObject({
      code: 'GENERATION_SOURCE_BUSY',
    })

    await lease.release()
    expect(registry.isActive(lateAlias, 12)).toBe(false)
    expect(registry.isActive(physical, 12)).toBe(false)
  })

  test('conservatively locks the lexical path and both physical targets after symlink retargeting', async () => {
    const { root, workspace: oldPhysical } = await createWorkspace('old-physical')
    const newPhysical = join(root, 'new-physical')
    const movingAlias = join(root, 'moving-alias')
    const oldAlias = join(root, 'old-alias')
    const newAlias = join(root, 'new-alias')
    await mkdir(newPhysical)
    await symlink(oldPhysical, movingAlias, 'dir')
    await symlink(oldPhysical, oldAlias, 'dir')
    await symlink(newPhysical, newAlias, 'dir')
    const registry = new ChapterSourceLeaseRegistry()
    const lease = await registry.acquire(movingAlias, 14, 'retargeted-task')

    await unlink(movingAlias)
    await symlink(newPhysical, movingAlias, 'dir')

    for (const workspace of [movingAlias, oldPhysical, oldAlias, newPhysical, newAlias]) {
      expect(registry.isActive(workspace, 14)).toBe(true)
      await expect(registry.acquire(workspace, 14, `bypass:${workspace}`)).rejects.toMatchObject({
        code: 'GENERATION_SOURCE_BUSY',
      })
    }

    await lease.release()
    for (const workspace of [movingAlias, oldPhysical, oldAlias, newPhysical, newAlias]) {
      expect(registry.isActive(workspace, 14)).toBe(false)
    }
  })

  test('serializes release through the workspace coordinator and caches one release promise', async () => {
    const { workspace } = await createWorkspace()
    const registry = new ChapterSourceLeaseRegistry()
    const lease = await registry.acquire(workspace, 13, 'ordered-release')
    const blockerEntered = deferred()
    const unblock = deferred()
    const blocker = withMcpWorkspaceMutation(workspace, async () => {
      blockerEntered.resolve()
      await unblock.promise
    })
    await blockerEntered.promise

    let released = false
    const firstRelease = lease.release()
    firstRelease.then(() => { released = true })
    const concurrentRelease = lease.release()

    expect(concurrentRelease).toBe(firstRelease)
    await Promise.resolve()
    expect(released).toBe(false)

    unblock.resolve()
    await blocker
    await firstRelease
    expect(released).toBe(true)
    expect(registry.isActive(workspace, 13)).toBe(false)
    expect(lease.release()).toBe(firstRelease)
  })

  test('allows release to retry after an invalid lock-order rejection', async () => {
    const { workspace } = await createWorkspace()
    const registry = new ChapterSourceLeaseRegistry()
    const lease = await registry.acquire(workspace, 15, 'retry-release')
    let rejectedRelease!: Promise<void>

    await withNovelWorkspaceMutation(workspace, async () => {
      rejectedRelease = lease.release()
      expect(lease.release()).toBe(rejectedRelease)
      await expect(rejectedRelease).rejects.toThrow(
        'MCP coordinator must be acquired before novel mutation lock',
      )
    })

    expect(registry.isActive(workspace, 15)).toBe(true)
    const retriedRelease = lease.release()
    expect(retriedRelease).not.toBe(rejectedRelease)
    expect(lease.release()).toBe(retriedRelease)
    await retriedRelease
    expect(registry.isActive(workspace, 15)).toBe(false)
    expect(lease.release()).toBe(retriedRelease)
  })

  test('an old released lease cannot release a later lease for the same project', async () => {
    const { workspace } = await createWorkspace()
    const registry = new ChapterSourceLeaseRegistry()
    const oldLease = await registry.acquire(workspace, 17, 'old-task')
    const oldRelease = oldLease.release()
    await oldRelease
    const currentLease = await registry.acquire(workspace, 17, 'current-task')

    expect(oldLease.release()).toBe(oldRelease)
    await oldLease.release()
    expect(registry.isActive(workspace, 17)).toBe(true)
    await expect(registry.acquire(workspace, 17, 'blocked-task')).rejects.toMatchObject({
      code: 'GENERATION_SOURCE_BUSY',
    })

    await currentLease.release()
    expect(registry.isActive(workspace, 17)).toBe(false)
  })

  test('does not corrupt active state when acquire fails', async () => {
    const { workspace } = await createWorkspace()
    const registry = new ChapterSourceLeaseRegistry()
    const lease = await registry.acquire(workspace, 19, 'holder')

    await expect(registry.acquire(workspace, 19, 'rejected')).rejects.toMatchObject({
      code: 'GENERATION_SOURCE_BUSY',
    })
    expect(registry.isActive(workspace, 19)).toBe(true)

    await lease.release()
    expect(registry.isActive(workspace, 19)).toBe(false)
    const replacement = await registry.acquire(workspace, 19, 'replacement')
    expect(registry.isActive(workspace, 19)).toBe(true)
    await replacement.release()
  })

  test('does not publish active state when freezing the completed lease fails', async () => {
    const { workspace } = await createWorkspace()
    const registry = new ChapterSourceLeaseRegistry()
    const originalFreeze = Object.freeze
    Object.freeze = ((value: any) => {
      if (value?.taskId === 'freeze-failure' && value?.projectId === 21) {
        throw new Error('injected Object.freeze failure')
      }
      return originalFreeze(value)
    }) as typeof Object.freeze

    try {
      await expect(registry.acquire(workspace, 21, 'freeze-failure')).rejects.toThrow(
        'injected Object.freeze failure',
      )
    } finally {
      Object.freeze = originalFreeze
    }

    expect(registry.isActive(workspace, 21)).toBe(false)
    const lease = await registry.acquire(workspace, 21, 'after-freeze-failure')
    await lease.release()
  })

  test('reports active state synchronously without entering the workspace coordinator', async () => {
    const { workspace } = await createWorkspace()
    const registry = new ChapterSourceLeaseRegistry()

    const inactive = registry.isActive(workspace, 23)
    expect(inactive).toBe(false)
    expect(inactive).not.toBeInstanceOf(Promise)

    const lease = await registry.acquire(workspace, 23, 'sync-state')
    const active = registry.isActive(workspace, 23)
    expect(active).toBe(true)
    expect(active).not.toBeInstanceOf(Promise)

    await lease.release()
    expect(registry.isActive(workspace, 23)).toBe(false)
  })

  test('waits for the workspace coordinator before acquiring and exposing active state', async () => {
    const { root, workspace } = await createWorkspace()
    const alias = join(root, 'coordinator-alias')
    await symlink(workspace, alias, 'dir')
    const registry = new ChapterSourceLeaseRegistry()
    const blockerEntered = deferred()
    const unblock = deferred()
    const blocker = withMcpWorkspaceMutation(alias, async () => {
      blockerEntered.resolve()
      await unblock.promise
    })
    await blockerEntered.promise

    let settled = false
    const acquisition = registry.acquire(workspace, 29, 'coordinated-acquire')
    acquisition.then(() => { settled = true }, () => { settled = true })
    await Promise.resolve()

    expect(settled).toBe(false)
    expect(registry.isActive(workspace, 29)).toBe(false)

    unblock.resolve()
    await blocker
    const lease = await acquisition
    expect(settled).toBe(true)
    expect(registry.isActive(workspace, 29)).toBe(true)
    await lease.release()
  })

  test('fails closed when workspace identity changes while acquire waits for its initial coordinator', async () => {
    const { root, workspace: oldPhysical } = await createWorkspace('identity-old')
    const newPhysical = join(root, 'identity-new')
    const movingAlias = join(root, 'identity-moving-alias')
    await mkdir(newPhysical)
    await symlink(oldPhysical, movingAlias, 'dir')
    const registry = new ChapterSourceLeaseRegistry()
    const oldEntered = deferred()
    const newEntered = deferred()
    const unblockOld = deferred()
    const unblockNew = deferred()
    const oldBlocker = withMcpWorkspaceMutation(oldPhysical, async () => {
      oldEntered.resolve()
      await unblockOld.promise
    })
    const newBlocker = withMcpWorkspaceMutation(newPhysical, async () => {
      newEntered.resolve()
      await unblockNew.promise
    })
    await Promise.all([oldEntered.promise, newEntered.promise])

    const acquisition = registry.acquire(movingAlias, 30, 'identity-drift')
    let outcome:
      | { status: 'fulfilled'; lease: Awaited<typeof acquisition> }
      | { status: 'rejected'; error: unknown }
      | undefined
    acquisition.then(
      lease => { outcome = { status: 'fulfilled', lease } },
      error => { outcome = { status: 'rejected', error } },
    )
    await unlink(movingAlias)
    await symlink(newPhysical, movingAlias, 'dir')

    let newReleased = false
    try {
      unblockOld.resolve()
      await oldBlocker
      await new Promise<void>(resolveImmediate => setImmediate(resolveImmediate))

      expect(outcome?.status).toBe('rejected')
      if (outcome?.status !== 'rejected') throw new Error('expected identity drift rejection')
      expect(outcome.error).toMatchObject({
        code: 'GENERATION_SOURCE_CHANGED',
        error_code: 'GENERATION_SOURCE_CHANGED',
        message: '章节来源工作区身份已变化，请重试',
      })
      const details = (outcome.error as ChapterGenerationSourceError).details || {}
      expect(String(details.initial_workspace_identity || '').length).toBeGreaterThan(0)
      expect(String(details.initial_workspace_identity || '').length).toBeLessThanOrEqual(512)
      expect(String(details.current_workspace_identity || '').length).toBeGreaterThan(0)
      expect(String(details.current_workspace_identity || '').length).toBeLessThanOrEqual(512)
      expect(registry.isActive(movingAlias, 30)).toBe(false)
      expect(registry.isActive(oldPhysical, 30)).toBe(false)
      expect(registry.isActive(newPhysical, 30)).toBe(false)

      unblockNew.resolve()
      await newBlocker
      newReleased = true
      const retry = await registry.acquire(movingAlias, 30, 'identity-retry')
      expect(registry.isActive(newPhysical, 30)).toBe(true)
      await retry.release()
    } finally {
      if (!newReleased) {
        unblockNew.resolve()
        await newBlocker
      }
      if (outcome?.status === 'fulfilled') await outcome.lease.release()
    }
  })

  test('admits exactly one winner when the same key is acquired concurrently', async () => {
    const { workspace } = await createWorkspace()
    const registry = new ChapterSourceLeaseRegistry()

    const outcomes = await Promise.allSettled([
      registry.acquire(workspace, 31, 'contender-a'),
      registry.acquire(workspace, 31, 'contender-b'),
    ])
    const fulfilled = outcomes.filter(
      (outcome): outcome is PromiseFulfilledResult<Awaited<ReturnType<typeof registry.acquire>>> => (
        outcome.status === 'fulfilled'
      ),
    )
    const rejected = outcomes.filter(
      (outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected',
    )

    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect(rejected[0]?.reason).toMatchObject({
      code: 'GENERATION_SOURCE_BUSY',
      error_code: 'GENERATION_SOURCE_BUSY',
      details: { project_id: 31 },
    })
    expect(registry.isActive(workspace, 31)).toBe(true)

    await fulfilled[0]!.value.release()
    expect(registry.isActive(workspace, 31)).toBe(false)
  })

  test.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'fails closed for invalid project id %p',
    async projectId => {
      const { workspace } = await createWorkspace()
      const registry = new ChapterSourceLeaseRegistry()

      await expect(registry.acquire(workspace, projectId, 'invalid-project')).rejects.toThrow(
        'projectId 必须是正安全整数',
      )
      expect(() => registry.isActive(workspace, projectId)).toThrow('projectId 必须是正安全整数')
      expect(registry.isActive(workspace, 1)).toBe(false)
    },
  )
})
