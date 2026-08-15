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

export function spawnCodexRpc(input: {
  argv: string[]
  cwd: string
  env: Record<string, string>
  sink?: RpcEventSink
}): CodexRpcClient {
  const sink = input.sink || (() => {})
  const proc = Bun.spawn(input.argv, {
    cwd: input.cwd,
    env: { PATH: process.env.PATH || '', HOME: process.env.HOME || '', ...input.env },
    stdin: 'pipe', stdout: 'pipe', stderr: 'pipe',
  })

  let nextId = 1
  const pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>()
  const notificationHandlers: Array<(method: string, params: any) => void> = []

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

  ;(async () => {
    const decoder = new TextDecoder()
    let buffer = ''
    for await (const chunk of proc.stdout) {
      buffer += decoder.decode(chunk)
      let idx
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim()
        buffer = buffer.slice(idx + 1)
        if (!line) continue
        try {
          dispatch(JSON.parse(line))
        } catch {
          sink('meta', { raw: line })
        }
      }
    }
  })()

  function send(message: Record<string, any>) {
    sink('send', message)
    proc.stdin.write(JSON.stringify(message) + '\n')
    proc.stdin.flush()
  }

  function failAllPending(reason: string) {
    for (const [, entry] of pending) {
      clearTimeout(entry.timer)
      entry.reject(new Error(reason))
    }
    pending.clear()
  }

  return {
    request(method, params = {}, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS) {
      const id = nextId++
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id)
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
        const timer = setTimeout(() => {
          const at = notificationHandlers.indexOf(handler)
          if (at >= 0) notificationHandlers.splice(at, 1)
          reject(new Error('notification timeout'))
        }, timeoutMs)
        function handler(method: string, params: any) {
          if (!match(method, params)) return
          clearTimeout(timer)
          const at = notificationHandlers.indexOf(handler)
          if (at >= 0) notificationHandlers.splice(at, 1)
          resolve({ method, params })
        }
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
