import { McpError } from './errors'

export type McpGenerationDeadlineClock = {
  now: () => number
  setTimeout: (callback: () => void, delayMs: number) => unknown
  clearTimeout: (handle: unknown) => void
}

const systemClock: McpGenerationDeadlineClock = {
  now: Date.now,
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

export class McpGenerationDeadline {
  private readonly controller = new AbortController()
  private readonly deadlineAt: number
  private readonly callerSignal?: AbortSignal
  private readonly clock: McpGenerationDeadlineClock
  private timer: unknown
  private closed = false
  private cause?: McpError
  private readonly onCallerAbort = () => {
    this.abort(new McpError('MCP_CANCELLED', 'MCP 正文生成已取消'))
  }

  constructor(
    totalMs: number,
    callerSignal?: AbortSignal,
    clock: McpGenerationDeadlineClock = systemClock,
  ) {
    this.clock = clock
    this.callerSignal = callerSignal
    this.deadlineAt = clock.now() + Math.max(1, Number(totalMs) || 0)
    if (callerSignal?.aborted) {
      this.onCallerAbort()
      return
    }
    callerSignal?.addEventListener('abort', this.onCallerAbort, { once: true })
    const handle = clock.setTimeout(() => {
      this.abort(new McpError('MCP_GENERATION_TIMEOUT', 'MCP 正文生成超过总时限'))
    }, Math.max(1, this.deadlineAt - clock.now()))
    ;(handle as any)?.unref?.()
    if (this.controller.signal.aborted) clock.clearTimeout(handle)
    else this.timer = handle
  }

  get signal() { return this.controller.signal }

  private abort(cause: McpError) {
    if (this.controller.signal.aborted) return
    this.cause = cause
    this.controller.abort(cause)
  }

  remainingMs() {
    return Math.max(0, this.deadlineAt - this.clock.now())
  }

  timeoutMs(configuredMs: number) {
    this.throwIfAborted()
    return Math.max(1, Math.min(Math.max(1, Number(configuredMs) || 0), this.remainingMs()))
  }

  throwIfAborted() {
    if (!this.controller.signal.aborted && this.remainingMs() <= 0) {
      this.abort(new McpError('MCP_GENERATION_TIMEOUT', 'MCP 正文生成超过总时限'))
    }
    if (this.controller.signal.aborted) {
      throw this.cause || this.controller.signal.reason
    }
  }

  cleanupSignal(timeoutMs = 5_000) {
    const controller = new AbortController()
    const handle = this.clock.setTimeout(() => controller.abort(), Math.max(1, Number(timeoutMs) || 0))
    ;(handle as any)?.unref?.()
    return controller.signal
  }

  close() {
    if (this.closed) return
    this.closed = true
    if (this.timer !== undefined) {
      this.clock.clearTimeout(this.timer)
      this.timer = undefined
    }
    this.callerSignal?.removeEventListener('abort', this.onCallerAbort)
  }
}
