import { expect, test } from 'bun:test'
import { withMcpWorkspaceMutation } from './workspace-coordinator'

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
