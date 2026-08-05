import { isAbortRelatedError, McpError } from './errors'
import type {
  McpAdapterOperationOptions,
  McpClientPort,
  McpFailureClass,
  McpStabilityController,
  McpStabilityInput,
  McpStabilityPolicy,
} from './adapters/types'
import type { McpOperationKind } from './types'

type Sleep = (ms: number, signal: AbortSignal) => Promise<void>

const systemSleep: Sleep = (ms, signal) => new Promise((resolve, reject) => {
  if (signal.aborted) {
    reject(signal.reason)
    return
  }
  const timer = setTimeout(done, ms)
  ;(timer as any)?.unref?.()
  function done() {
    signal.removeEventListener('abort', aborted)
    resolve()
  }
  function aborted() {
    clearTimeout(timer)
    reject(signal.reason)
  }
  signal.addEventListener('abort', aborted, { once: true })
})

function positiveInteger(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? Math.max(1, Math.floor(value)) : fallback
}

function serverNotReady(input: McpStabilityInput): McpError {
  return new McpError('MCP_SERVER_NOT_READY', 'MCP 服务尚未稳定就绪', {
    phase: input.phase,
  })
}

function remainingOrThrow(input: McpStabilityInput) {
  try {
    input.deadline.throwIfAborted()
  } catch (error) {
    if (error instanceof McpError && error.code === 'MCP_GENERATION_TIMEOUT') {
      throw serverNotReady(input)
    }
    throw error
  }
  const remaining = input.deadline.remainingMs()
  if (remaining <= 0) throw serverNotReady(input)
  return remaining
}

function remoteOptions(input: McpStabilityInput): McpAdapterOperationOptions {
  return {
    signal: input.deadline.signal,
    timeoutMs: Math.max(1, Math.min(
      positiveInteger(input.toolTimeoutMs, 1),
      remainingOrThrow(input),
    )),
  }
}

function throwDeadlineCauseForAbort(error: unknown, input: McpStabilityInput) {
  if (input.deadline.signal.aborted && isAbortRelatedError(error, input.deadline.signal)) {
    remainingOrThrow(input)
  }
}

export function createMcpStabilityController(dependencies: {
  reacquire: (options: McpAdapterOperationOptions) => Promise<McpClientPort>
  invalidateCurrent: () => Promise<void>
  sleep?: Sleep
}): McpStabilityController {
  const sleep = dependencies.sleep || systemSleep

  const boundedSleep = async (requestedMs: number, input: McpStabilityInput) => {
    const duration = Math.min(positiveInteger(requestedMs, 1), remainingOrThrow(input))
    try {
      await sleep(duration, input.deadline.signal)
    } catch (error) {
      remainingOrThrow(input)
      throw error
    }
    remainingOrThrow(input)
  }

  const progress = async (
    input: McpStabilityInput,
    round: number,
    startedWithRemainingMs: number,
  ) => {
    if (!input.onProgress) return
    await input.onProgress({
      stage: 'mcp_transport_stabilizing',
      status: 'running',
      detail: `phase=${input.phase}; recovery_round=${round}`,
      elapsed_ms: Math.max(0, startedWithRemainingMs - input.deadline.remainingMs()),
    })
  }

  const ensureReady = async (policy: McpStabilityPolicy | undefined, input: McpStabilityInput) => {
    if (!policy) return
    const requiredSuccesses = positiveInteger(policy.requiredConsecutiveSuccesses, 1)
    const warmupWindowMs = positiveInteger(policy.warmupWindowMs, 1)
    const initialDelay = positiveInteger(input.pollInitialMs, 1)
    const maximumDelay = Math.max(initialDelay, positiveInteger(input.pollMaxMs, initialDelay))
    const startedWithRemainingMs = remainingOrThrow(input)
    let windowStartedWithRemainingMs = startedWithRemainingMs
    let recoveryRound = 1
    let consecutiveSuccesses = 0
    let retryDelay = initialDelay
    let client: McpClientPort | undefined

    while (true) {
      const remaining = remainingOrThrow(input)
      const windowElapsed = windowStartedWithRemainingMs - remaining
      if (windowElapsed >= warmupWindowMs && consecutiveSuccesses < requiredSuccesses) {
        if (client) await dependencies.invalidateCurrent()
        client = undefined
        consecutiveSuccesses = 0
        retryDelay = initialDelay
        recoveryRound += 1
        windowStartedWithRemainingMs = remainingOrThrow(input)
      }

      await progress(input, recoveryRound, startedWithRemainingMs)
      try {
        client ||= await dependencies.reacquire(remoteOptions(input))
        await policy.probe(client, remoteOptions(input))
        const remainingAfterProbe = remainingOrThrow(input)
        if (windowStartedWithRemainingMs - remainingAfterProbe >= warmupWindowMs) continue
        consecutiveSuccesses += 1
        if (consecutiveSuccesses >= requiredSuccesses) return
        continue
      } catch (error) {
        throwDeadlineCauseForAbort(error, input)
        const failureClass = policy.classify(error, 'read_safe')
        consecutiveSuccesses = 0
        if (failureClass === 'transient_read_failure') {
          if (client) await dependencies.invalidateCurrent()
          client = undefined
          recoveryRound += 1
          windowStartedWithRemainingMs = remainingOrThrow(input)
        } else if (failureClass !== 'not_ready_pre_dispatch') {
          throw error
        }
      }

      const remainingInWindow = Math.max(
        1,
        warmupWindowMs - (windowStartedWithRemainingMs - input.deadline.remainingMs()),
      )
      await boundedSleep(Math.min(retryDelay, remainingInWindow), input)
      retryDelay = Math.min(maximumDelay, retryDelay * 2)
    }
  }

  const runRecoverable = async <T>(
    policy: McpStabilityPolicy | undefined,
    input: McpStabilityInput,
    operationKind: McpOperationKind,
    operation: () => Promise<T>,
  ): Promise<T> => {
    if (!policy) return operation()
    const initialDelay = positiveInteger(input.pollInitialMs, 1)
    const maximumDelay = Math.max(initialDelay, positiveInteger(input.pollMaxMs, initialDelay))
    let retryDelay = initialDelay
    await ensureReady(policy, input)
    while (true) {
      remainingOrThrow(input)
      try {
        const result = await operation()
        remainingOrThrow(input)
        return result
      } catch (error) {
        throwDeadlineCauseForAbort(error, input)
        const failureClass: McpFailureClass = policy.classify(error, operationKind)
        const replayable = failureClass === 'not_ready_pre_dispatch'
          || (operationKind === 'read_safe' && failureClass === 'transient_read_failure')
        if (!replayable) throw error
        if (failureClass === 'transient_read_failure') await dependencies.invalidateCurrent()
        await boundedSleep(retryDelay, input)
        retryDelay = Math.min(maximumDelay, retryDelay * 2)
        await ensureReady(policy, input)
      }
    }
  }

  return {
    ensureReady,
    runRead: <T>(
      policy: McpStabilityPolicy | undefined,
      input: McpStabilityInput,
      operation: () => Promise<T>,
    ) => runRecoverable(policy, input, 'read_safe', operation),
    runMutation: <T>(
      policy: McpStabilityPolicy | undefined,
      input: McpStabilityInput,
      operation: () => Promise<T>,
    ) => runRecoverable(policy, input, 'mutation', operation),
  }
}
