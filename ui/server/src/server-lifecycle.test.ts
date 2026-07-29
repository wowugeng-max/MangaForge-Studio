import { describe, expect, test } from 'bun:test'
import {
  attachServerShutdownHandlers,
  createShutdownCoordinator,
  startServerLifecycle,
} from './server-lifecycle'

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

async function eventually(predicate: () => boolean, message: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return
    await new Promise(resolve => setTimeout(resolve, 0))
  }
  throw new Error(message)
}

describe('server lifecycle bootstrap', () => {
  test('does not listen until workspace setup and revision recovery have completed', async () => {
    const activeWorkspace = '/tmp/loaded-server-workspace'
    const server = { name: 'http-server' }
    const ensureGate = deferred()
    const saveGate = deferred()
    const revisionGate = deferred()
    const events: string[] = []
    const errors: unknown[] = []
    let listenCalls = 0

    const startup = startServerLifecycle({
      loadActiveWorkspace: async () => {
        events.push('load')
        return activeWorkspace
      },
      activateWorkspace: workspace => { events.push(`activate:${workspace}`) },
      ensureWorkspaceStructure: async workspace => {
        events.push(`ensure:start:${workspace}`)
        await ensureGate.promise
        events.push(`ensure:end:${workspace}`)
      },
      saveActiveWorkspace: async workspace => {
        events.push(`save:start:${workspace}`)
        await saveGate.promise
        events.push(`save:end:${workspace}`)
      },
      startNovelLifecycle: async workspace => {
        events.push(`revision:start:${workspace}`)
        await revisionGate.promise
        events.push(`revision:end:${workspace}`)
      },
      listen: () => {
        listenCalls += 1
        events.push('listen')
        return server
      },
      onStartupError: error => { errors.push(error) },
    })

    await eventually(() => events.includes(`ensure:start:${activeWorkspace}`), 'ensure did not start')
    expect(listenCalls).toBe(0)
    ensureGate.resolve()
    await eventually(() => events.includes(`save:start:${activeWorkspace}`), 'save did not start')
    expect(listenCalls).toBe(0)
    saveGate.resolve()
    await eventually(() => events.includes(`revision:start:${activeWorkspace}`), 'revision recovery did not start')
    expect(listenCalls).toBe(0)
    revisionGate.resolve()

    expect(await startup).toEqual({ workspace: activeWorkspace, server })
    expect(errors).toEqual([])
    expect(events).toEqual([
      'load',
      `activate:${activeWorkspace}`,
      `ensure:start:${activeWorkspace}`,
      `ensure:end:${activeWorkspace}`,
      `save:start:${activeWorkspace}`,
      `save:end:${activeWorkspace}`,
      `revision:start:${activeWorkspace}`,
      `revision:end:${activeWorkspace}`,
      'listen',
    ])
  })

  test.each(['load', 'ensure', 'save', 'revision'] as const)(
    'contains %s bootstrap failure and never exposes the port',
    async failingStep => {
      const failure = new Error(`${failingStep} failed`)
      const errors: unknown[] = []
      let listenCalls = 0
      const failAt = async (step: typeof failingStep) => {
        if (failingStep === step) throw failure
      }

      const result = await startServerLifecycle({
        loadActiveWorkspace: async () => {
          await failAt('load')
          return '/tmp/loaded-server-workspace'
        },
        activateWorkspace: () => {},
        ensureWorkspaceStructure: async () => { await failAt('ensure') },
        saveActiveWorkspace: async () => { await failAt('save') },
        startNovelLifecycle: async () => { await failAt('revision') },
        listen: () => {
          listenCalls += 1
          return { name: 'unexpected-server' }
        },
        onStartupError: error => { errors.push(error) },
      })

      expect(result).toBeNull()
      expect(listenCalls).toBe(0)
      expect(errors).toEqual([failure])
    },
  )
})

describe('server shutdown lifecycle', () => {
  test('shares one async shutdown that closes intake before stopping monitor and revision work', async () => {
    const revisionGate = deferred()
    const events: string[] = []
    let closeCalls = 0
    let monitorStopCalls = 0
    let revisionStopCalls = 0
    const shutdown = createShutdownCoordinator({
      closeServer: async () => {
        closeCalls += 1
        events.push('server:close')
      },
      stopKeyMonitor: () => {
        monitorStopCalls += 1
        events.push('monitor:stop')
      },
      stopNovelLifecycle: async () => {
        revisionStopCalls += 1
        events.push('revision:stop:start')
        await revisionGate.promise
        events.push('revision:stop:end')
      },
      onShutdownError: () => {},
    })

    const first = shutdown()
    const second = shutdown()
    let settled = 0
    void first.then(() => { settled += 1 })
    void second.then(() => { settled += 1 })
    await eventually(() => revisionStopCalls > 0, 'revision stop did not start')
    await new Promise(resolve => setTimeout(resolve, 0))
    const settledBeforeRevisionStop = settled
    revisionGate.resolve()
    await Promise.all([first, second])

    expect(first).toBe(second)
    expect(settledBeforeRevisionStop).toBe(0)
    expect(closeCalls).toBe(1)
    expect(monitorStopCalls).toBe(1)
    expect(revisionStopCalls).toBe(1)
    expect(events).toEqual([
      'server:close',
      'monitor:stop',
      'revision:stop:start',
      'revision:stop:end',
    ])
  })

  test('external server close skips duplicate close and still awaits cleanup', async () => {
    const events: string[] = []
    const shutdown = createShutdownCoordinator({
      closeServer: async () => { events.push('unexpected:close') },
      stopKeyMonitor: () => { events.push('monitor:stop') },
      stopNovelLifecycle: async () => { events.push('revision:stop') },
      onShutdownError: () => {},
    })

    await shutdown({ serverAlreadyClosed: true })

    expect(events).toEqual(['monitor:stop', 'revision:stop'])
  })

  test('reports one controlled shutdown failure and preserves the shared rejection', async () => {
    const failure = new Error('revision stop failed')
    const errors: unknown[] = []
    const shutdown = createShutdownCoordinator({
      closeServer: async () => {},
      stopKeyMonitor: () => {},
      stopNovelLifecycle: async () => { throw failure },
      onShutdownError: error => { errors.push(error) },
    })

    const first = shutdown()
    const second = shutdown()
    const results = await Promise.allSettled([first, second])

    expect(first).toBe(second)
    expect(results).toEqual([
      { status: 'rejected', reason: failure },
      { status: 'rejected', reason: failure },
    ])
    expect(errors).toEqual([failure])
  })

  test('routes SIGINT, SIGTERM, and explicit close through handled shutdown promises', () => {
    const signalHandlers = new Map<string, () => void>()
    const serverHandlers = new Map<string, () => void>()
    const shutdownCalls: Array<{ serverAlreadyClosed?: boolean } | undefined> = []
    let catchCalls = 0
    const handledPromise = {
      catch(handler: (error: unknown) => void) {
        catchCalls += 1
        handler(new Error('handled shutdown failure'))
        return Promise.resolve()
      },
    } as Promise<void>

    attachServerShutdownHandlers({
      signalSource: {
        once: (event, handler) => { signalHandlers.set(event, handler) },
      },
      server: {
        once: (event, handler) => { serverHandlers.set(event, handler) },
      },
      shutdown: options => {
        shutdownCalls.push(options)
        return handledPromise
      },
    })

    signalHandlers.get('SIGINT')!()
    signalHandlers.get('SIGTERM')!()
    serverHandlers.get('close')!()

    expect(shutdownCalls).toEqual([
      undefined,
      undefined,
      { serverAlreadyClosed: true },
    ])
    expect(catchCalls).toBe(3)
  })
})
