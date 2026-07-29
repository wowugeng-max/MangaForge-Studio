export type ServerLifecycleBootstrapDependencies<TServer> = {
  loadActiveWorkspace(): Promise<string>
  activateWorkspace(workspace: string): void
  ensureWorkspaceStructure(workspace: string): Promise<void>
  saveActiveWorkspace(workspace: string): Promise<void>
  startNovelLifecycle(workspace: string): Promise<void>
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

export function createShutdownCoordinator(deps: ShutdownCoordinatorDependencies) {
  let shutdownPromise: Promise<void> | null = null
  return (options: ServerShutdownOptions = {}) => {
    if (shutdownPromise) return shutdownPromise
    const pending = Promise.resolve().then(async () => {
      if (!options.serverAlreadyClosed) await deps.closeServer()
      await deps.stopKeyMonitor()
      await deps.stopNovelLifecycle()
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

export function attachServerShutdownHandlers(input: {
  signalSource: ShutdownEventSource
  server: ShutdownEventSource
  shutdown(options?: ServerShutdownOptions): Promise<void>
}) {
  const runShutdown = (options?: ServerShutdownOptions) => {
    void input.shutdown(options).catch(() => {})
  }
  input.signalSource.once('SIGINT', () => { runShutdown() })
  input.signalSource.once('SIGTERM', () => { runShutdown() })
  input.server.once('close', () => { runShutdown({ serverAlreadyClosed: true }) })
}
