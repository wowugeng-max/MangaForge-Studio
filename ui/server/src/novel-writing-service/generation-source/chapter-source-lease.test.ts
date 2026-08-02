import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { withMcpWorkspaceMutation } from '../../mcp/workspace-coordinator'
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
    expect(await registry.isActive(workspace, 7)).toBe(true)

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

    expect(await registry.isActive(workspace, 7)).toBe(true)
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

    expect(await registry.isActive(first.workspace, 1)).toBe(true)
    expect(await registry.isActive(first.workspace, 2)).toBe(true)
    expect(await registry.isActive(second.workspace, 1)).toBe(true)
    await Promise.all(leases.map(lease => lease.release()))
  })

  test('treats filesystem aliases as the same workspace identity', async () => {
    const { root, workspace } = await createWorkspace('physical')
    const alias = join(root, 'alias')
    await symlink(workspace, alias, 'dir')
    const registry = new ChapterSourceLeaseRegistry()
    const lease = await registry.acquire(workspace, 11, 'physical-task')

    expect(await registry.isActive(alias, 11)).toBe(true)
    await expect(registry.acquire(alias, 11, 'alias-task')).rejects.toMatchObject({
      code: 'GENERATION_SOURCE_BUSY',
      error_code: 'GENERATION_SOURCE_BUSY',
      details: { project_id: 11 },
    })

    await lease.release()
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
    expect(await registry.isActive(workspace, 13)).toBe(false)
    expect(lease.release()).toBe(firstRelease)
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
    expect(await registry.isActive(workspace, 17)).toBe(true)
    await expect(registry.acquire(workspace, 17, 'blocked-task')).rejects.toMatchObject({
      code: 'GENERATION_SOURCE_BUSY',
    })

    await currentLease.release()
    expect(await registry.isActive(workspace, 17)).toBe(false)
  })

  test('does not corrupt active state when acquire fails', async () => {
    const { workspace } = await createWorkspace()
    const registry = new ChapterSourceLeaseRegistry()
    const lease = await registry.acquire(workspace, 19, 'holder')

    await expect(registry.acquire(workspace, 19, 'rejected')).rejects.toMatchObject({
      code: 'GENERATION_SOURCE_BUSY',
    })
    expect(await registry.isActive(workspace, 19)).toBe(true)

    await lease.release()
    expect(await registry.isActive(workspace, 19)).toBe(false)
    const replacement = await registry.acquire(workspace, 19, 'replacement')
    expect(await registry.isActive(workspace, 19)).toBe(true)
    await replacement.release()
  })

  test.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    'fails closed for invalid project id %p',
    async projectId => {
      const { workspace } = await createWorkspace()
      const registry = new ChapterSourceLeaseRegistry()

      await expect(registry.acquire(workspace, projectId, 'invalid-project')).rejects.toThrow(
        'projectId 必须是正安全整数',
      )
      await expect(registry.isActive(workspace, projectId)).rejects.toThrow(
        'projectId 必须是正安全整数',
      )
      expect(await registry.isActive(workspace, 1)).toBe(false)
    },
  )
})
