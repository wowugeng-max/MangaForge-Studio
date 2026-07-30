import { expect, test } from 'bun:test'
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
