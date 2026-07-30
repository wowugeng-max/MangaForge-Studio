export type ServerLifecycleBootstrapDependencies<TServer> = {
  loadActiveWorkspace(): Promise<string>
  activateWorkspace(workspace: string): void
  ensureWorkspaceStructure(workspace: string): Promise<void>
  saveActiveWorkspace(workspace: string): Promise<void>
  startNovelLifecycle(workspace: string): Promise<void>
  shouldListen?(): boolean
  listen(): TServer | Promise<TServer>
  onStartupError(error: unknown): void | Promise<void>
}

export async function startServerLifecycle<TServer>(
  deps: ServerLifecycleBootstrapDependencies<TServer>,
): Promise<{ workspace: string; server: TServer } | null> {
  try {
    const workspace = await deps.loadActiveWorkspace()
    deps.activateWorkspace(workspace)
    await deps.ensureWorkspaceStructure(workspace)
    await deps.saveActiveWorkspace(workspace)
    await deps.startNovelLifecycle(workspace)
    if (deps.shouldListen && !deps.shouldListen()) return null
    const server = await deps.listen()
    return { workspace, server }
  } catch (error) {
    await deps.onStartupError(error)
    return null
  }
}

export type ServerShutdownOptions = {
  serverAlreadyClosed?: boolean
}

type ShutdownCoordinatorDependencies = {
  closeServer(): Promise<void>
  stopBackgroundServices(): void | Promise<void>
  stopNovelLifecycle(): Promise<void>
  stopMcpRuntime?(): void | Promise<void>
  onShutdownError(error: unknown): void
}

type BackgroundServiceMonitor = {
  stop(): void | Promise<void>
}

type BackgroundServiceLifecycleDependencies<TMonitor extends BackgroundServiceMonitor> = {
  bootstrap(signal: AbortSignal): Promise<void>
  shouldStartMonitor(): boolean
  startMonitor(): TMonitor
}

export function createBackgroundServiceLifecycle<TMonitor extends BackgroundServiceMonitor>(
  deps: BackgroundServiceLifecycleDependencies<TMonitor>,
) {
  const controller = new AbortController()
  let monitor: TMonitor | null = null
  let startPromise: Promise<void> | null = null
  let stopPromise: Promise<void> | null = null

  return {
    start() {
      if (startPromise) return startPromise
      startPromise = (async () => {
        if (controller.signal.aborted) return
        try {
          await deps.bootstrap(controller.signal)
        } catch (error) {
          if (controller.signal.aborted) return
          throw error
        }
        if (controller.signal.aborted || !deps.shouldStartMonitor()) return
        monitor = deps.startMonitor()
      })()
      return startPromise
    },
    stop() {
      if (stopPromise) return stopPromise
      controller.abort()
      stopPromise = (async () => {
        if (startPromise) await startPromise
        const activeMonitor = monitor
        monitor = null
        if (activeMonitor) await activeMonitor.stop()
      })()
      return stopPromise
    },
  }
}

type HttpServerCloseTarget = {
  close(callback: (error?: Error) => void): unknown
}

type HttpServerBindTarget = {
  once(event: string, handler: (...args: any[]) => void): unknown
  off(event: string, handler: (...args: any[]) => void): unknown
}

export function bindHttpServer<TServer extends HttpServerBindTarget>(deps: {
  createServer(): TServer
  onServer(server: TServer): void
}): Promise<TServer> {
  return new Promise((resolve, reject) => {
    let server: TServer | null = null
    const cleanup = () => {
      if (!server) return
      server.off('listening', onListening)
      server.off('error', onError)
      server.off('close', onClose)
    }
    const onListening = () => {
      cleanup()
      resolve(server!)
    }
    const onError = (error: unknown) => {
      cleanup()
      reject(error)
    }
    const onClose = () => {
      cleanup()
      reject(Object.assign(new Error('server closed before listening'), {
        code: 'SERVER_BIND_CLOSED',
      }))
    }

    try {
      server = deps.createServer()
      server.once('listening', onListening)
      server.once('error', onError)
      server.once('close', onClose)
      deps.onServer(server)
    } catch (error) {
      cleanup()
      reject(error)
    }
  })
}

export function closeHttpServer(server: HttpServerCloseTarget | null | undefined): Promise<void> {
  if (!server) return Promise.resolve()
  return new Promise((resolve, reject) => {
    try {
      server.close(error => {
        if (error) reject(error)
        else resolve()
      })
    } catch (error) {
      reject(error)
    }
  })
}

export function createShutdownCoordinator(deps: ShutdownCoordinatorDependencies) {
  let shutdownPromise: Promise<void> | null = null
  return (options: ServerShutdownOptions = {}) => {
    if (shutdownPromise) return shutdownPromise
    const pending = Promise.resolve().then(async () => {
      const closePromise = options.serverAlreadyClosed
        ? Promise.resolve()
        : Promise.resolve().then(() => deps.closeServer())
      const backgroundStopPromise = Promise.resolve().then(() => deps.stopBackgroundServices())
      const revisionStopPromise = Promise.resolve().then(() => deps.stopNovelLifecycle())
      const operations = [
        closePromise,
        backgroundStopPromise,
        revisionStopPromise,
      ]
      if (deps.stopMcpRuntime) operations.push(Promise.resolve().then(() => deps.stopMcpRuntime!()))
      const results = await Promise.allSettled(operations)
      const errors = results.flatMap(result => (
        result.status === 'rejected' ? [result.reason] : []
      ))
      if (errors.length === 1) throw errors[0]
      if (errors.length > 1) throw new AggregateError(errors, 'server shutdown failed')
    })
    shutdownPromise = pending.catch(error => {
      deps.onShutdownError(error)
      throw error
    })
    return shutdownPromise
  }
}

type ShutdownEventSource = {
  once(event: string, handler: () => void): unknown
}

type ShutdownHandler = (options?: ServerShutdownOptions) => Promise<void>

function runHandledShutdown(shutdown: ShutdownHandler, options?: ServerShutdownOptions) {
  void shutdown(options).catch(() => {})
}

export function attachSignalShutdownHandlers(input: {
  signalSource: ShutdownEventSource
  shutdown: ShutdownHandler
}) {
  input.signalSource.once('SIGINT', () => { runHandledShutdown(input.shutdown) })
  input.signalSource.once('SIGTERM', () => { runHandledShutdown(input.shutdown) })
}

export function attachServerCloseShutdownHandler(input: {
  server: ShutdownEventSource
  shutdown: ShutdownHandler
}) {
  input.server.once('close', () => {
    runHandledShutdown(input.shutdown, { serverAlreadyClosed: true })
  })
}

export function attachServerShutdownHandlers(input: {
  signalSource: ShutdownEventSource
  server: ShutdownEventSource
  shutdown: ShutdownHandler
}) {
  attachSignalShutdownHandlers(input)
  attachServerCloseShutdownHandler(input)
}
