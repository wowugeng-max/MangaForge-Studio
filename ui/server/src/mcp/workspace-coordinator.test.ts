import { expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { relative, resolve } from 'node:path'
import {
  assertNovelWorkspaceMutationHeld,
  isNovelWorkspaceMutationHeld,
  novelMutationKey,
  withNovelWorkspaceMutation,
} from '../novel/lock'
import { assertMcpWorkspaceMutationHeld, withMcpWorkspaceMutation } from './workspace-coordinator'

test('serializes mutations for the same workspace', async () => {
  const events: string[] = []
  let signalFirstEntered!: () => void
  let releaseFirst!: () => void
  const firstEntered = new Promise<void>(resolve => {
    signalFirstEntered = resolve
  })
  const firstMayFinish = new Promise<void>(resolve => {
    releaseFirst = resolve
  })

  const first = withMcpWorkspaceMutation('/tmp/mcp-coordinator-test', async () => {
    events.push('first entered')
    signalFirstEntered()
    await firstMayFinish
    events.push('first finished')
  })
  await firstEntered

  let secondEntered = false
  const second = withMcpWorkspaceMutation('/tmp/mcp-coordinator-test', async () => {
    secondEntered = true
    events.push('second entered')
  })
  await Promise.resolve()

  expect(secondEntered).toBe(false)
  expect(events).toEqual(['first entered'])

  releaseFirst()
  await Promise.all([first, second])

  expect(events).toEqual(['first entered', 'first finished', 'second entered'])
})

test('allows nested mutations for the same workspace without deadlock', async () => {
  const events: string[] = []

  await withMcpWorkspaceMutation('/tmp/mcp-coordinator-nested-test', async () => {
    events.push('outer entered')
    await withMcpWorkspaceMutation('/tmp/mcp-coordinator-nested-test', async () => {
      events.push('nested entered')
    })
    events.push('outer finished')
  })

  expect(events).toEqual(['outer entered', 'nested entered', 'outer finished'])
})

test('allows MCP then novel locking and rejects the reverse lock order', async () => {
  const workspace = '/tmp/mcp-coordinator-lock-order-test'

  const result = await withMcpWorkspaceMutation(workspace, () => (
    withNovelWorkspaceMutation(workspace, async () => 'ok')
  ))
  expect(result).toBe('ok')

  await expect(withNovelWorkspaceMutation(workspace, () => (
    withMcpWorkspaceMutation(workspace, async () => 'unreachable')
  ))).rejects.toThrow('MCP coordinator must be acquired before novel mutation lock')
})

test('invalidates ownership inherited by a detached async descendant after release', async () => {
  const workspace = '/tmp/mcp-coordinator-detached-test'
  const events: string[] = []
  let openDetachedGate!: () => void
  let signalDetachedChecked!: () => void
  let signalSecondEntered!: () => void
  let releaseSecond!: () => void
  const detachedGate = new Promise<void>(resolve => {
    openDetachedGate = resolve
  })
  const detachedChecked = new Promise<void>(resolve => {
    signalDetachedChecked = resolve
  })
  const secondEntered = new Promise<void>(resolve => {
    signalSecondEntered = resolve
  })
  const secondMayFinish = new Promise<void>(resolve => {
    releaseSecond = resolve
  })
  let detached!: Promise<void>
  let staleAuthorizationRejected = false
  let detachedEntered = false

  await withMcpWorkspaceMutation(workspace, async () => {
    events.push('first entered')
    detached = (async () => {
      await detachedGate
      try {
        assertMcpWorkspaceMutationHeld(workspace)
      } catch {
        staleAuthorizationRejected = true
      }
      signalDetachedChecked()
      await withMcpWorkspaceMutation(workspace, async () => {
        detachedEntered = true
        events.push('detached entered')
      })
    })()
    events.push('first finished')
  })

  const second = withMcpWorkspaceMutation(workspace, async () => {
    events.push('second entered')
    signalSecondEntered()
    await secondMayFinish
    events.push('second finished')
  })
  await secondEntered

  openDetachedGate()
  await detachedChecked
  const detachedEnteredBeforeSecondRelease = detachedEntered

  releaseSecond()
  await Promise.all([second, detached])

  expect(staleAuthorizationRejected).toBe(true)
  expect(detachedEnteredBeforeSecondRelease).toBe(false)
  expect(events).toEqual([
    'first entered',
    'first finished',
    'second entered',
    'second finished',
    'detached entered',
  ])
})

test('invalidates novel ownership inherited by a detached descendant and lets MCP queue normally', async () => {
  const workspace = '/tmp/novel-coordinator-detached-test'
  let openDetachedGate!: () => void
  let signalDetachedChecked!: () => void
  let signalHolderEntered!: () => void
  let releaseHolder!: () => void
  const detachedGate = new Promise<void>(resolve => { openDetachedGate = resolve })
  const detachedChecked = new Promise<void>(resolve => { signalDetachedChecked = resolve })
  const holderEntered = new Promise<void>(resolve => { signalHolderEntered = resolve })
  const holderMayFinish = new Promise<void>(resolve => { releaseHolder = resolve })
  let inheritedHeld = true
  let inheritedAssertionRejected = false
  let detachedMcpEntered = false
  let detachedMcpError: unknown
  let detached!: Promise<void>

  await withNovelWorkspaceMutation(workspace, async () => {
    detached = (async () => {
      await detachedGate
      inheritedHeld = isNovelWorkspaceMutationHeld(workspace)
      try {
        assertNovelWorkspaceMutationHeld(workspace)
      } catch {
        inheritedAssertionRejected = true
      }
      signalDetachedChecked()
      try {
        await withMcpWorkspaceMutation(workspace, async () => {
          detachedMcpEntered = true
        })
      } catch (error) {
        detachedMcpError = error
      }
    })()
  })

  const holder = withMcpWorkspaceMutation(workspace, async () => {
    signalHolderEntered()
    await holderMayFinish
  })
  await holderEntered
  openDetachedGate()
  await detachedChecked
  await Promise.resolve()
  const enteredBeforeHolderRelease = detachedMcpEntered

  releaseHolder()
  await Promise.all([holder, detached])

  expect(inheritedHeld).toBe(false)
  expect(inheritedAssertionRejected).toBe(true)
  expect(enteredBeforeHolderRelease).toBe(false)
  expect(detachedMcpEntered).toBe(true)
  expect(detachedMcpError).toBeUndefined()
})

test('treats relative and absolute aliases as the same workspace without conflating distinct workspaces', async () => {
  const previousSqlite = process.env.SQLITE_DATABASE_URL
  const previousDatabase = process.env.DATABASE_URL
  delete process.env.SQLITE_DATABASE_URL
  delete process.env.DATABASE_URL
  try {
    const absoluteWorkspace = resolve('/tmp/mcp-coordinator-workspace-alias')
    const relativeWorkspace = relative(process.cwd(), absoluteWorkspace)
    const distinctWorkspace = resolve('/tmp/mcp-coordinator-distinct-workspace')

    await withNovelWorkspaceMutation(relativeWorkspace, async () => {
      await expect(withMcpWorkspaceMutation(absoluteWorkspace, async () => 'unreachable'))
        .rejects.toThrow('MCP coordinator must be acquired before novel mutation lock')
      await expect(withMcpWorkspaceMutation(distinctWorkspace, async () => 'ok')).resolves.toBe('ok')
    })
  } finally {
    if (previousSqlite === undefined) delete process.env.SQLITE_DATABASE_URL
    else process.env.SQLITE_DATABASE_URL = previousSqlite
    if (previousDatabase === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = previousDatabase
  }
})

test('canonicalizes relative SQLite database paths from either supported environment variable', () => {
  const previousSqlite = process.env.SQLITE_DATABASE_URL
  const previousDatabase = process.env.DATABASE_URL
  try {
    process.env.SQLITE_DATABASE_URL = 'relative/sqlite-database.sqlite'
    delete process.env.DATABASE_URL
    expect(novelMutationKey('/tmp/ignored-workspace')).toBe(resolve('relative/sqlite-database.sqlite'))

    delete process.env.SQLITE_DATABASE_URL
    process.env.DATABASE_URL = 'file:relative/database-url.sqlite?mode=rwc'
    expect(novelMutationKey('/tmp/ignored-workspace')).toBe(resolve('relative/database-url.sqlite'))
  } finally {
    if (previousSqlite === undefined) delete process.env.SQLITE_DATABASE_URL
    else process.env.SQLITE_DATABASE_URL = previousSqlite
    if (previousDatabase === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = previousDatabase
  }
})

test('canonicalizes a nonexistent database leaf beneath a symlinked physical parent', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'mangaforge-lock-symlink-'))
  try {
    const realWorkspace = resolve(root, 'real')
    const aliasWorkspace = resolve(root, 'alias')
    await mkdir(realWorkspace)
    await symlink(realWorkspace, aliasWorkspace, 'dir')

    expect(novelMutationKey(realWorkspace)).toBe(novelMutationKey(aliasWorkspace))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
