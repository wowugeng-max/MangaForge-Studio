import { describe, expect, test } from 'bun:test'
import { createServer } from 'node:http'
import {
  attachServerCloseShutdownHandler,
  attachServerShutdownHandlers,
  attachSignalShutdownHandlers,
  closeHttpServer,
  createShutdownCoordinator,
  startServerLifecycle,
} from './server-lifecycle'

type CloseableHttpServer = {
  readonly listening: boolean
  close(callback: (error?: Error) => void): void
}

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

  test('a pre-listen signal stops revision recovery and prevents the port from opening', async () => {
    const revisionGate = deferred()
    const signalHandlers = new Map<string, () => void>()
    const events: string[] = []
    const errors: unknown[] = []
    let shutdownRequested = false
    let stopCalls = 0
    let listenCalls = 0
    const shutdown = createShutdownCoordinator({
      closeServer: async () => { events.push('server:unavailable') },
      stopKeyMonitor: () => { events.push('monitor:stop') },
      stopNovelLifecycle: async () => {
        stopCalls += 1
        events.push('revision:stop:start')
        await revisionGate.promise
        events.push('revision:stop:end')
      },
      onShutdownError: error => { errors.push(error) },
    })
    const requestShutdown = (options?: { serverAlreadyClosed?: boolean }) => {
      shutdownRequested = true
      return shutdown(options)
    }
    attachSignalShutdownHandlers({
      signalSource: {
        once: (event, handler) => { signalHandlers.set(event, handler) },
      },
      shutdown: requestShutdown,
    })

    const startup = startServerLifecycle({
      loadActiveWorkspace: async () => '/tmp/loaded-server-workspace',
      activateWorkspace: () => {},
      ensureWorkspaceStructure: async () => {},
      saveActiveWorkspace: async () => {},
      startNovelLifecycle: async () => {
        events.push('revision:start')
        await revisionGate.promise
        events.push('revision:started')
      },
      listen: () => {
        listenCalls += 1
        events.push('listen')
        return { name: 'unexpected-server' }
      },
      onStartupError: error => { errors.push(error) },
      shouldListen: () => !shutdownRequested,
    })

    await eventually(() => events.includes('revision:start'), 'revision recovery did not start')
    signalHandlers.get('SIGINT')!()
    signalHandlers.get('SIGTERM')!()
    const sharedShutdown = shutdown()
    await eventually(() => stopCalls > 0, 'revision stop did not start')

    expect(listenCalls).toBe(0)
    expect(stopCalls).toBe(1)
    expect(errors).toEqual([])

    revisionGate.resolve()
    await sharedShutdown

    expect(await startup).toBeNull()
    expect(listenCalls).toBe(0)
    expect(stopCalls).toBe(1)
    expect(errors).toEqual([])
    expect(events).toEqual([
      'revision:start',
      'server:unavailable',
      'monitor:stop',
      'revision:stop:start',
      'revision:started',
      'revision:stop:end',
    ])
  })
})

describe('server shutdown lifecycle', () => {
  test('a signal closes a late-bound binding server before it can listen', async () => {
    const bindGate = deferred()
    const signalHandlers = new Map<string, () => void>()
    let binding = true
    let listening = false
    let closeCalls = 0
    const bindingServer: CloseableHttpServer = {
      get listening() { return listening },
      close(callback) {
        closeCalls += 1
        binding = false
        callback()
      },
    }
    let activeServer: CloseableHttpServer | null = null
    const shutdown = createShutdownCoordinator({
      closeServer: () => closeHttpServer(activeServer),
      stopKeyMonitor: () => {},
      stopNovelLifecycle: async () => {},
      onShutdownError: () => {},
    })
    attachSignalShutdownHandlers({
      signalSource: {
        once: (event, handler) => { signalHandlers.set(event, handler) },
      },
      shutdown,
    })
    activeServer = bindingServer
    const bindingAttempt = (async () => {
      await bindGate.promise
      if (binding) listening = true
    })()

    signalHandlers.get('SIGTERM')!()
    await shutdown()
    bindGate.resolve()
    await bindingAttempt

    expect(closeCalls).toBe(1)
    expect(listening).toBe(false)
  })

  test('closes a real Bun HTTP server before its listening event', async () => {
    const events: string[] = []
    const server = createServer((_request, response) => { response.end('ok') })
    server.once('listening', () => { events.push('listening') })
    server.listen(0, '127.0.0.1')

    expect(server.listening).toBe(false)
    try {
      await closeHttpServer(server)
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(events).toEqual([])
      expect(server.listening).toBe(false)
    } finally {
      if (server.listening) {
        await new Promise<void>(resolve => { server.close(() => { resolve() }) })
      }
    }
  })

  test('an absent server remains a safe close no-op', async () => {
    await expect(closeHttpServer(null)).resolves.toBeUndefined()
  })

  test.each(['callback', 'throw'] as const)(
    'reports a non-null server %s close failure',
    async failureMode => {
      const failure = Object.assign(new Error('server was not running'), {
        code: 'ERR_SERVER_NOT_RUNNING',
      })
      const server: CloseableHttpServer = {
        listening: false,
        close(callback) {
          if (failureMode === 'throw') throw failure
          callback(failure)
        },
      }

      expect(await Promise.allSettled([closeHttpServer(server)])).toEqual([
        { status: 'rejected', reason: failure },
      ])
    },
  )

  test('early signal wiring closes a later server through the same coordinator once', async () => {
    const signalHandlers = new Map<string, () => void>()
    const serverHandlers = new Map<string, () => void>()
    let serverAvailable = false
    let signalRegistrations = 0
    let serverRegistrations = 0
    let closeCalls = 0
    let monitorStopCalls = 0
    let revisionStopCalls = 0
    const shutdown = createShutdownCoordinator({
      closeServer: async () => {
        if (serverAvailable) closeCalls += 1
      },
      stopKeyMonitor: () => { monitorStopCalls += 1 },
      stopNovelLifecycle: async () => { revisionStopCalls += 1 },
      onShutdownError: () => {},
    })

    attachSignalShutdownHandlers({
      signalSource: {
        once: (event, handler) => {
          signalRegistrations += 1
          signalHandlers.set(event, handler)
        },
      },
      shutdown,
    })
    serverAvailable = true
    attachServerCloseShutdownHandler({
      server: {
        once: (event, handler) => {
          serverRegistrations += 1
          serverHandlers.set(event, handler)
        },
      },
      shutdown,
    })

    signalHandlers.get('SIGTERM')!()
    serverHandlers.get('close')!()
    await shutdown()

    expect(signalRegistrations).toBe(2)
    expect(serverRegistrations).toBe(1)
    expect(closeCalls).toBe(1)
    expect(monitorStopCalls).toBe(1)
    expect(revisionStopCalls).toBe(1)
  })

  test('shares one async shutdown while HTTP drain and worker cleanup settle concurrently', async () => {
    const closeGate = deferred()
    const revisionGate = deferred()
    const events: string[] = []
    let closeCalls = 0
    let monitorStopCalls = 0
    let revisionStopCalls = 0
    const shutdown = createShutdownCoordinator({
      closeServer: async () => {
        closeCalls += 1
        events.push('server:close:start')
        await closeGate.promise
        events.push('server:close:end')
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
    const settledBeforeEitherGate = settled
    closeGate.resolve()
    await eventually(() => events.includes('server:close:end'), 'server close did not finish')
    await new Promise(resolve => setTimeout(resolve, 0))
    const settledBeforeRevisionStop = settled
    revisionGate.resolve()
    await Promise.all([first, second])

    expect(first).toBe(second)
    expect(settledBeforeEitherGate).toBe(0)
    expect(settledBeforeRevisionStop).toBe(0)
    expect(closeCalls).toBe(1)
    expect(monitorStopCalls).toBe(1)
    expect(revisionStopCalls).toBe(1)
    expect(events).toEqual([
      'server:close:start',
      'monitor:stop',
      'revision:stop:start',
      'server:close:end',
      'revision:stop:end',
    ])
  })

  test('handles worker-stop rejection while HTTP connections are still draining', async () => {
    const closeGate = deferred()
    const failure = new Error('revision stop failed during drain')
    const errors: unknown[] = []
    let settled = false
    const shutdown = createShutdownCoordinator({
      closeServer: async () => { await closeGate.promise },
      stopKeyMonitor: () => {},
      stopNovelLifecycle: async () => { throw failure },
      onShutdownError: error => { errors.push(error) },
    })

    const pending = shutdown()
    void pending.then(
      () => { settled = true },
      () => { settled = true },
    )
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(settled).toBe(false)
    expect(errors).toEqual([])

    closeGate.resolve()
    expect(await Promise.allSettled([pending])).toEqual([
      { status: 'rejected', reason: failure },
    ])
    expect(errors).toEqual([failure])
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
