// ui/server/src/kernel/codex/rpc.ts
export type RpcEventSink = (direction: 'send' | 'recv' | 'meta', message: Record<string, any>) => void

export type CodexRpcClient = {
  request(method: string, params?: any, timeoutMs?: number): Promise<any>
  notify(method: string, params?: any): void
  onNotification(handler: (method: string, params: any) => void): void
  waitForNotification(match: (method: string, params: any) => boolean, timeoutMs: number): Promise<{ method: string; params: any }>
  kill(): void
  exited: Promise<number>
}

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000

export function mergeCodexRpcEnv(inputEnv: Record<string, string>): Record<string, string> {
  return { PATH: process.env.PATH || '', HOME: process.env.HOME || '', ...inputEnv }
}

export function spawnCodexRpc(input: {
  argv: string[]
  cwd: string
  env: Record<string, string>
  sink?: RpcEventSink
}): CodexRpcClient {
  const sink = input.sink || (() => {})
  const proc = Bun.spawn(input.argv, {
    cwd: input.cwd,
    env: mergeCodexRpcEnv(input.env),
    stdin: 'pipe', stdout: 'pipe', stderr: 'pipe',
  })

  let nextId = 1
  const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>()
  const notificationHandlers: Array<(method: string, params: any) => void> = []
  const waiters: Array<{ handler: (method: string, params: any) => void; timer: ReturnType<typeof setTimeout>; reject: (e: Error) => void }> = []

  function dispatch(message: Record<string, any>) {
    sink('recv', message)
    if (message.id !== undefined && (message.result !== undefined || message.error !== undefined)) {
      const entry = pending.get(Number(message.id))
      if (!entry) return
      pending.delete(Number(message.id))
      clearTimeout(entry.timer)
      if (message.error) entry.reject(Object.assign(new Error(String(message.error.message || 'rpc error')), { rpc_code: message.error.code }))
      else entry.resolve(message.result)
      return
    }
    if (typeof message.method === 'string') {
      for (const handler of [...notificationHandlers]) handler(message.method, message.params)
    }
  }

  function failAllPending(reason: string) {
    for (const [, entry] of pending) {
      clearTimeout(entry.timer)
      entry.reject(new Error(reason))
    }
    pending.clear()
    for (const waiter of waiters) {
      clearTimeout(waiter.timer)
      const at = notificationHandlers.indexOf(waiter.handler)
      if (at >= 0) notificationHandlers.splice(at, 1)
      waiter.reject(new Error(reason))
    }
    waiters.length = 0
  }

  ;(async () => {
    const decoder = new TextDecoder()
    let buffer = ''
    const consumeLines = () => {
      let idx
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim()
        buffer = buffer.slice(idx + 1)
        if (!line) continue
        let parsed: Record<string, any>
        try {
          parsed = JSON.parse(line)
        } catch {
          sink('meta', { raw: line })
          continue
        }
        dispatch(parsed)
      }
    }
    try {
      for await (const chunk of proc.stdout) {
        buffer += decoder.decode(chunk, { stream: true })
        consumeLines()
      }
      buffer += decoder.decode()
      consumeLines()
    } finally {
      failAllPending('rpc stdout closed')
    }
  })()

  ;(async () => { for await (const _ of proc.stderr) { /* drain */ } })().catch(() => {})

  function send(message: Record<string, any>) {
    sink('send', message)
    proc.stdin.write(JSON.stringify(message) + '\n')
    proc.stdin.flush()
  }

  return {
    request(method, params = {}, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
      const id = nextId++
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (!pending.delete(id)) return
          reject(new Error(`rpc timeout: ${method}`))
        }, timeoutMs)
        pending.set(id, { resolve, reject, timer })
        send({ jsonrpc: '2.0', id, method, params })
      })
    },
    notify(method, params = {}) {
      send({ jsonrpc: '2.0', method, params })
    },
    onNotification(handler) {
      notificationHandlers.push(handler)
    },
    waitForNotification(match, timeoutMs) {
      return new Promise((resolve, reject) => {
        function handler(method: string, params: any) {
          if (!match(method, params)) return
          clearTimeout(timer)
          removeWaiter()
          resolve({ method, params })
        }
        const timer = setTimeout(() => {
          removeWaiter()
          reject(new Error('notification timeout'))
        }, timeoutMs)
        const waiter = { handler, timer, reject }
        function removeWaiter() {
          const at = notificationHandlers.indexOf(handler)
          if (at >= 0) notificationHandlers.splice(at, 1)
          const wi = waiters.indexOf(waiter)
          if (wi >= 0) waiters.splice(wi, 1)
        }
        waiters.push(waiter)
        notificationHandlers.push(handler)
      })
    },
    kill() {
      failAllPending('rpc client killed')
      proc.kill()
    },
    exited: proc.exited,
  }
}
