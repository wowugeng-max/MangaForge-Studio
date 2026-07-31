import { describe, expect, test } from 'bun:test'
import { McpGenerationDeadline } from './deadline'

function manualTime(start = 1_000) {
  let now = start
  let nextId = 1
  const timers = new Map<number, { at: number, callback: () => void }>()
  const listeners = { added: 0, removed: 0 }
  return {
    now: () => now,
    setTimeout(callback: () => void, delay: number) {
      const id = nextId++
      timers.set(id, { at: now + delay, callback })
      return id
    },
    clearTimeout(id: unknown) { timers.delete(Number(id)) },
    advance(ms: number) {
      now += ms
      for (const [id, timer] of [...timers]) {
        if (timer.at <= now) {
          timers.delete(id)
          timer.callback()
        }
      }
    },
    timerCount: () => timers.size,
    listeners,
  }
}

describe('McpGenerationDeadline', () => {
  test('maps a caller abort to MCP_CANCELLED and removes its resources on close', () => {
    const time = manualTime()
    const caller = new AbortController()
    let added = 0
    let removed = 0
    const callerSignal = {
      get aborted() { return caller.signal.aborted },
      get reason() { return caller.signal.reason },
      addEventListener: (...args: Parameters<AbortSignal['addEventListener']>) => {
        added += 1
        return caller.signal.addEventListener(...args)
      },
      removeEventListener: (...args: Parameters<AbortSignal['removeEventListener']>) => {
        removed += 1
        return caller.signal.removeEventListener(...args)
      },
    } as AbortSignal
    const deadline = new McpGenerationDeadline(60_000, callerSignal, time)

    caller.abort()

    expect(() => deadline.throwIfAborted()).toThrow(expect.objectContaining({ code: 'MCP_CANCELLED' }))
    expect(deadline.signal.reason).toMatchObject({ code: 'MCP_CANCELLED' })
    deadline.close()
    deadline.close()
    expect(time.timerCount()).toBe(0)
    expect({ added, removed }).toEqual({ added: 1, removed: 1 })
  })

  test('maps total expiry to MCP_GENERATION_TIMEOUT and preserves the first cause', () => {
    const time = manualTime()
    const caller = new AbortController()
    const deadline = new McpGenerationDeadline(100, caller.signal, time)

    time.advance(100)
    caller.abort()

    expect(() => deadline.throwIfAborted()).toThrow(expect.objectContaining({ code: 'MCP_GENERATION_TIMEOUT' }))
    expect(deadline.signal.reason).toMatchObject({ code: 'MCP_GENERATION_TIMEOUT' })
  })

  test('caps every SDK timeout to the remaining total budget', () => {
    const time = manualTime()
    const deadline = new McpGenerationDeadline(10_000, undefined, time)

    time.advance(7_500)

    expect(deadline.remainingMs()).toBe(2_500)
    expect(deadline.timeoutMs(60_000)).toBe(2_500)
    expect(deadline.timeoutMs(1_000)).toBe(1_000)
    deadline.close()
  })

  test('distinguishes an already-aborted caller from an already-expired deadline', () => {
    const time = manualTime()
    const caller = new AbortController()
    caller.abort()
    const cancelled = new McpGenerationDeadline(100, caller.signal, time)
    expect(() => cancelled.throwIfAborted()).toThrow(expect.objectContaining({ code: 'MCP_CANCELLED' }))

    const expired = new McpGenerationDeadline(100, undefined, time)
    time.advance(101)
    expect(() => expired.throwIfAborted()).toThrow(expect.objectContaining({ code: 'MCP_GENERATION_TIMEOUT' }))
  })

  test('creates a cleanup signal independent from an expired generation signal', () => {
    const time = manualTime()
    const deadline = new McpGenerationDeadline(100, undefined, time)
    time.advance(100)

    const cleanup = deadline.cleanupSignal(50)

    expect(deadline.signal.aborted).toBe(true)
    expect(cleanup).not.toBe(deadline.signal)
    expect(cleanup.aborted).toBe(false)
    time.advance(50)
    expect(cleanup.aborted).toBe(true)
  })

  test('handles a timer that fires synchronously during construction without retaining it', () => {
    const cleared: unknown[] = []
    const deadline = new McpGenerationDeadline(10, undefined, {
      now: () => 0,
      setTimeout(callback: () => void) {
        callback()
        return 42
      },
      clearTimeout(handle: unknown) { cleared.push(handle) },
    })

    expect(() => deadline.throwIfAborted()).toThrow(expect.objectContaining({ code: 'MCP_GENERATION_TIMEOUT' }))
    deadline.close()
    expect(cleared).toEqual([42])
  })
})
