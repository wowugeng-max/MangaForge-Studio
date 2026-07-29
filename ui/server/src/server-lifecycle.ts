export type ServerLifecycleBootstrapDependencies<TServer> = {
  loadActiveWorkspace(): Promise<string>
  activateWorkspace(workspace: string): void
  ensureWorkspaceStructure(workspace: string): Promise<void>
  saveActiveWorkspace(workspace: string): Promise<void>
  startNovelLifecycle(workspace: string): Promise<void>
  shouldListen?(): boolean
  listen(): TServer
  onStartupError(error: unknown): void
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
    const server = deps.listen()
    return { workspace, server }
  } catch (error) {
    deps.onStartupError(error)
    return null
  }
}

export type ServerShutdownOptions = {
  serverAlreadyClosed?: boolean
}

type ShutdownCoordinatorDependencies = {
  closeServer(): Promise<void>
  stopKeyMonitor(): void | Promise<void>
  stopNovelLifecycle(): Promise<void>
  onShutdownError(error: unknown): void
}

type HttpServerCloseTarget = {
  close(callback: (error?: Error) => void): unknown
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
      const cleanupPromise = Promise.resolve().then(async () => {
        await deps.stopKeyMonitor()
        await deps.stopNovelLifecycle()
      })
      const [closeResult, cleanupResult] = await Promise.allSettled([
        closePromise,
        cleanupPromise,
      ])
      if (closeResult.status === 'rejected') throw closeResult.reason
      if (cleanupResult.status === 'rejected') throw cleanupResult.reason
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
