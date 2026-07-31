import {
  Client,
  isInitializedNotification,
  ProtocolError,
  SdkError,
  SdkErrorCode,
  StreamableHTTPClientTransport,
  type CallToolResult,
  type FetchLike,
  type StreamableHTTPClientTransportOptions,
} from '@modelcontextprotocol/client'
import { isAbortRelatedError, McpError } from './errors'
import { createMcpSecretScrubber, safeMcpHeaderEntries } from './secret-scrubber'
import type {
  McpClientState,
  McpDiagnostics,
  McpKeyRecord,
  McpOperationOptions,
  McpServerRecord,
  McpToolDescriptor,
  McpToolResult,
} from './types'

type SdkClientLike = Pick<Client,
  | 'connect'
  | 'listTools'
  | 'callTool'
  | 'getServerVersion'
  | 'getServerCapabilities'
  | 'getInstructions'
  | 'close'
>

type TransportLike = Pick<StreamableHTTPClientTransport, 'terminateSession'>

export type McpSdkFactory = {
  createClient: () => SdkClientLike
  createTransport: (
    url: URL,
    options: StreamableHTTPClientTransportOptions,
    server?: McpServerRecord,
  ) => TransportLike
}

class BudaStreamableHTTPClientTransport extends StreamableHTTPClientTransport {
  async send(
    message: Parameters<StreamableHTTPClientTransport['send']>[0],
    options?: Parameters<StreamableHTTPClientTransport['send']>[1],
  ) {
    const messages = Array.isArray(message) ? message : [message]
    if (messages.length && messages.every(candidate => isInitializedNotification(candidate))) return
    return super.send(message, options)
  }
}

const defaultSdkFactory: McpSdkFactory = {
  createClient: () => new Client({ name: 'mangaforge-studio', version: '1.0.0' }),
  createTransport: (url, options, server) => server?.adapter_id === 'buda'
    ? new BudaStreamableHTTPClientTransport(url, options)
    : new StreamableHTTPClientTransport(url, options),
}

export const MCP_RESPONSE_BYTE_LIMIT = 16 * 1024 * 1024
export const MCP_SSE_EVENT_BYTE_LIMIT = 16 * 1024 * 1024

export type McpResponseBudgets = {
  responseBytes?: number
  sseEventBytes?: number
}

function responseTooLarge() {
  return new McpError('MCP_TOOL_ERROR', 'MCP 服务响应超过安全上限', {
    reason: 'response_too_large',
  })
}

function positiveBudget(value: number | undefined, fallback: number) {
  return Number.isSafeInteger(value) && (value || 0) > 0 ? value! : fallback
}

function contentLengthExceeds(value: string | null, limit: number) {
  const candidate = value?.trim() || ''
  if (!/^\d+$/.test(candidate)) return false
  try { return BigInt(candidate) > BigInt(limit) } catch { return false }
}

export function createBoundedMcpFetch(
  upstreamFetch: FetchLike,
  budgets: McpResponseBudgets = {},
): FetchLike {
  const responseByteLimit = positiveBudget(budgets.responseBytes, MCP_RESPONSE_BYTE_LIMIT)
  const sseEventByteLimit = positiveBudget(budgets.sseEventBytes, MCP_SSE_EVENT_BYTE_LIMIT)
  return async (input, init) => {
    const response = await upstreamFetch(input, init)
    const isEventStream = response.headers.get('content-type')
      ?.split(';', 1)[0]?.trim().toLowerCase() === 'text/event-stream'
    if (!isEventStream && contentLengthExceeds(response.headers.get('content-length'), responseByteLimit)) {
      const error = responseTooLarge()
      await response.body?.cancel(error).catch(() => {})
      throw error
    }
    if (!response.body) return response

    const reader = response.body.getReader()
    let responseBytes = 0
    let eventBytes = 0
    let pendingCarriageReturn = false
    let pendingLineEndingBytes = 0
    const acceptLineEnding = (bytes: number) => {
      if (pendingLineEndingBytes) {
        eventBytes = 0
        pendingLineEndingBytes = 0
      } else {
        pendingLineEndingBytes = bytes
      }
    }
    const acceptEventByte = () => {
      eventBytes += pendingLineEndingBytes + 1
      pendingLineEndingBytes = 0
      return eventBytes > sseEventByteLimit
    }
    const acceptSseByte = (byte: number) => {
      if (pendingCarriageReturn) {
        pendingCarriageReturn = false
        if (byte === 10) {
          acceptLineEnding(2)
          return false
        }
        acceptLineEnding(1)
      }
      if (byte === 13) {
        pendingCarriageReturn = true
        return false
      }
      if (byte === 10) {
        acceptLineEnding(1)
        return false
      }
      return acceptEventByte()
    }
    const boundedBody = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await reader.read()
          if (done) {
            if (isEventStream) {
              if (pendingCarriageReturn) acceptLineEnding(1)
              if (eventBytes + pendingLineEndingBytes > sseEventByteLimit) {
                controller.error(responseTooLarge())
                return
              }
            }
            controller.close()
            return
          }
          let overflow = false
          if (isEventStream) {
            for (const byte of value) {
              if (acceptSseByte(byte)) {
                overflow = true
                break
              }
            }
          } else {
            responseBytes += value.byteLength
            overflow = responseBytes > responseByteLimit
          }
          if (overflow) {
            const error = responseTooLarge()
            await reader.cancel(error).catch(() => {})
            controller.error(error)
            return
          }
          controller.enqueue(value)
        } catch (error) {
          controller.error(error)
        }
      },
      cancel(reason) { return reader.cancel(reason) },
    })
    return new Response(boundedBody, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  }
}

export function buildMcpHeaders(server: McpServerRecord, key: McpKeyRecord) {
  const headers: Record<string, string> = Object.fromEntries(safeMcpHeaderEntries(server.custom_headers))
  if (server.auth_type === 'bearer') {
    headers.Authorization = key.key.toLowerCase().startsWith('bearer ')
      ? key.key
      : `Bearer ${key.key}`
  }
  return headers
}

function errorMessage(error: unknown) {
  return String((error as any)?.message || error || 'MCP 操作失败')
}

function isBudaSessionNotReady(server: McpServerRecord, error: unknown) {
  return server.adapter_id === 'buda' && /\bServer not initialized\b/i.test(errorMessage(error))
}

function waitForMcpRetry(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) return Promise.reject(signal.reason || new Error('MCP connection aborted'))
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer)
      reject(signal?.reason || new Error('MCP connection aborted'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function isBrokenTransportMessage(message: string) {
  return /\b(?:ECONNRESET|EPIPE)\b|^\s*not connected\s*$|socket hang up|connection reset by peer|\b(?:session|transport|connection|channel|stream)\b.{0,80}\b(?:expired|closed|terminated|not found|disconnected|lost)\b/i
    .test(message)
}

const BROKEN_SDK_CODES = new Set<string>([
  SdkErrorCode.NotConnected,
  SdkErrorCode.ConnectionClosed,
])

const BROKEN_SYSTEM_CODES = new Set([
  'ECONNRESET',
  'EPIPE',
])

function errorCodeField(error: unknown, field: 'code' | 'errno') {
  if (!error || typeof error !== 'object') return ''
  try {
    const value = Reflect.get(error, field)
    return typeof value === 'string' || typeof value === 'number' ? value : ''
  } catch {
    return ''
  }
}

function isBrokenTransportError(
  error: unknown,
  message: string,
) {
  if (error instanceof ProtocolError || error instanceof McpError) return false
  if (error instanceof SdkError) return BROKEN_SDK_CODES.has(error.code)

  const structuredCodes = [
    errorCodeField(error, 'code'),
    errorCodeField(error, 'errno'),
  ].filter(code => code !== '')
  if (structuredCodes.length > 0) {
    return structuredCodes.some(code => (
      typeof code === 'string' && BROKEN_SYSTEM_CODES.has(code.toUpperCase())
    ))
  }
  return isBrokenTransportMessage(message)
}

function mapConnectionError(error: unknown, scrubText: (value: unknown) => string) {
  const message = errorMessage(error)
  if (/\b(401|403)\b|unauthori[sz]ed|forbidden|authentication/i.test(message)) {
    return new McpError('MCP_AUTH_FAILED', 'MCP 身份验证失败')
  }
  if (/timeout|timed out|aborted/i.test(message)) {
    return new McpError('MCP_CONNECT_TIMEOUT', '连接 MCP 服务超时')
  }
  return new McpError('MCP_TOOL_ERROR', `连接 MCP 服务失败：${scrubText(message).slice(0, 240)}`)
}

function normalizeToolResult(result: CallToolResult): McpToolResult {
  return {
    content: Array.isArray(result.content) ? result.content : [],
    ...(result.structuredContent !== undefined ? { structuredContent: result.structuredContent as any } : {}),
    ...(result.isError !== undefined ? { isError: result.isError } : {}),
    ...(result._meta !== undefined ? { _meta: result._meta as any } : {}),
  }
}

export class GenericMcpClient {
  state: McpClientState = 'Closed'
  private sdk?: SdkClientLike
  private transport?: TransportLike
  private tools: McpToolDescriptor[] = []
  private readonly scrubber: ReturnType<typeof createMcpSecretScrubber>

  constructor(private readonly options: {
    server: McpServerRecord
    key: McpKeyRecord
    sdkFactory: McpSdkFactory
    fetch?: FetchLike
    responseBudgets?: McpResponseBudgets
  }) {
    this.scrubber = createMcpSecretScrubber({
      keys: [options.key.key],
      headers: options.server.custom_headers,
    })
  }

  private scrubMcpError(error: McpError) {
    return new McpError(
      error.code,
      this.scrubber.scrubText(error.message),
      error.details ? this.scrubber.scrubValue(error.details) : undefined,
    )
  }

  async connect(signal?: AbortSignal, timeoutMs?: number) {
    if (this.state === 'Ready') return this
    if (this.options.server.transport !== 'streamable_http') {
      throw new McpError('MCP_BINDING_INVALID', '首期正文生成只支持 Streamable HTTP MCP 服务')
    }
    if (!this.options.server.url) throw new McpError('MCP_BINDING_INVALID', 'MCP Server URL 不能为空')
    if (this.options.server.auth_type === 'bearer' && !this.options.key.key) {
      throw new McpError('MCP_AUTH_FAILED', 'MCP Key 为空')
    }
    this.state = 'Connecting'
    const sdk = this.options.sdkFactory.createClient()
    const transport = this.options.sdkFactory.createTransport(new URL(this.options.server.url), {
      requestInit: { headers: buildMcpHeaders(this.options.server, this.options.key) },
      fetch: createBoundedMcpFetch(
        this.options.fetch || globalThis.fetch.bind(globalThis),
        this.options.responseBudgets,
      ),
    }, this.options.server)
    this.sdk = sdk
    this.transport = transport
    const startupTimeout = Math.max(1, Math.min(
      this.options.server.startup_timeout_ms,
      timeoutMs ?? this.options.server.startup_timeout_ms,
    ))
    const startupStartedAt = Date.now()
    try {
      await sdk.connect(transport as any, {
        signal,
        timeout: startupTimeout,
        maxTotalTimeout: startupTimeout,
      })
      let retryDelay = Math.max(1, this.options.server.poll_initial_ms)
      while (true) {
        const remaining = Math.max(1, startupTimeout - (Date.now() - startupStartedAt))
        try {
          await this.refreshTools({ signal, timeoutMs: remaining }, sdk)
          break
        } catch (error) {
          const retryBudget = startupTimeout - (Date.now() - startupStartedAt)
          if (!isBudaSessionNotReady(this.options.server, error)) throw error
          if (retryBudget <= 0) {
            throw new McpError('MCP_CONNECT_TIMEOUT', '连接 MCP 服务超时', {
              reason: 'buda_server_not_initialized',
            })
          }
          await waitForMcpRetry(Math.min(retryDelay, retryBudget), signal)
          retryDelay = Math.min(
            Math.max(1, this.options.server.poll_max_ms),
            Math.max(retryDelay + 1, retryDelay * 2),
          )
        }
      }
      this.state = 'Ready'
      return this
    } catch (error) {
      this.state = 'Closed'
      await this.close().catch(() => {})
      if (signal?.aborted && isAbortRelatedError(error, signal)) {
        if (signal.reason instanceof McpError) throw this.scrubMcpError(signal.reason)
        throw new McpError('MCP_CANCELLED', 'MCP 连接已取消')
      }
      if (error instanceof McpError) throw this.scrubMcpError(error)
      throw mapConnectionError(error, this.scrubber.scrubText)
    }
  }

  private requireReady() {
    if (this.state !== 'Ready' || !this.sdk) throw new McpError('MCP_TOOL_ERROR', 'MCP Client 尚未连接')
    return this.sdk
  }

  private allowedTools(tools: McpToolDescriptor[]) {
    const allowList = this.options.server.enabled_tools
    if (!allowList.length) return tools
    const allowed = new Set(allowList)
    return tools.filter(tool => allowed.has(tool.name))
  }

  private async refreshTools(
    options: Omit<McpOperationOptions, 'operation'>,
    sdk: SdkClientLike = this.requireReady(),
  ) {
    const timeout = options.timeoutMs || this.options.server.tool_timeout_ms
    const listed = await sdk.listTools(undefined, {
      signal: options.signal,
      timeout,
      maxTotalTimeout: timeout,
      cacheMode: 'refresh',
    })
    const tools = (listed.tools || []).map(tool => ({
      name: tool.name,
      ...(tool.description ? { description: tool.description } : {}),
      ...(tool.inputSchema ? { inputSchema: tool.inputSchema as Record<string, unknown> } : {}),
      ...(tool.outputSchema ? { outputSchema: tool.outputSchema as Record<string, unknown> } : {}),
      ...(tool.annotations ? { annotations: tool.annotations as Record<string, unknown> } : {}),
    }))
    this.tools = this.allowedTools(this.scrubber.scrubValue(tools) as McpToolDescriptor[])
    return this.tools
  }

  async listTools(options: Omit<McpOperationOptions, 'operation'>) {
    this.requireReady()
    if (!this.tools.length) return this.refreshTools(options)
    return this.tools.map(tool => ({ ...tool }))
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
    options: McpOperationOptions,
  ): Promise<McpToolResult> {
    const sdk = this.requireReady()
    if (!this.tools.some(tool => tool.name === name)) {
      throw new McpError('MCP_CAPABILITY_MISSING', `MCP 工具不可用：${name}`, { tool_name: name })
    }
    if (options.signal?.aborted) {
      if (options.signal.reason instanceof McpError) throw options.signal.reason
      throw new McpError('MCP_CANCELLED', 'MCP 工具调用已取消', { tool_name: name })
    }
    const timeout = options.timeoutMs || this.options.server.tool_timeout_ms
    try {
      const startedAt = Date.now()
      let retryDelay = Math.max(1, this.options.server.poll_initial_ms)
      let result: McpToolResult
      while (true) {
        const remaining = Math.max(1, timeout - (Date.now() - startedAt))
        try {
          result = normalizeToolResult(await sdk.callTool(
            { name, arguments: args },
            { signal: options.signal, timeout: remaining, maxTotalTimeout: remaining },
          ))
          break
        } catch (error) {
          const retryBudget = timeout - (Date.now() - startedAt)
          const retryable = options.operation === 'read_safe'
            && isBudaSessionNotReady(this.options.server, error)
          const waitMs = Math.min(retryDelay, Math.max(0, retryBudget - 1))
          if (!retryable || waitMs <= 0) throw error
          await waitForMcpRetry(waitMs, options.signal)
          retryDelay = Math.min(
            Math.max(1, this.options.server.poll_max_ms),
            Math.max(retryDelay + 1, retryDelay * 2),
          )
        }
      }
      if (result.isError) {
        throw new McpError('MCP_TOOL_ERROR', `MCP 工具执行失败：${name}`, {
          tool_name: name,
          content: this.scrubber.scrubValue(result.content.slice(0, 3)),
        })
      }
      return result
    } catch (error) {
      if (options.signal?.aborted && isAbortRelatedError(error, options.signal)) {
        if (options.signal.reason instanceof McpError) throw options.signal.reason
        throw new McpError('MCP_CANCELLED', 'MCP 工具调用已取消', { tool_name: name })
      }
      if (isBudaSessionNotReady(this.options.server, error)) {
        void this.close().catch(() => {})
        throw new McpError('MCP_CONNECTION_LOST', 'MCP 连接已失效', {
          tool_name: name,
          reason: 'buda_server_not_initialized',
        })
      }
      const rawMessage = errorMessage(error)
      const message = this.scrubber.scrubText(rawMessage)
      if (error instanceof ProtocolError) {
        throw new McpError('MCP_TOOL_ERROR', `MCP 工具调用失败：${message.slice(0, 240)}`, { tool_name: name })
      }
      if (error instanceof McpError) throw this.scrubMcpError(error)
      if (/\b(401|403)\b|unauthori[sz]ed|forbidden/i.test(message)) {
        throw new McpError('MCP_AUTH_FAILED', 'MCP 身份验证失败', { tool_name: name })
      }
      if (isBrokenTransportError(error, rawMessage)) {
        void this.close().catch(() => {})
        throw new McpError('MCP_CONNECTION_LOST', 'MCP 连接已失效', { tool_name: name })
      }
      if (/abort/i.test(message)) {
        throw new McpError('MCP_CANCELLED', 'MCP 工具调用已取消', { tool_name: name })
      }
      throw new McpError('MCP_TOOL_ERROR', `MCP 工具调用失败：${message.slice(0, 240)}`, { tool_name: name })
    }
  }

  diagnostics(): McpDiagnostics {
    return this.scrubber.scrubValue({
      state: this.state,
      server_id: this.options.server.id,
      key_id: this.options.key.id,
      ...(this.sdk?.getServerVersion() ? { server_info: this.sdk.getServerVersion() as any } : {}),
      ...(this.sdk?.getServerCapabilities() ? { capabilities: this.sdk.getServerCapabilities() as any } : {}),
      ...(this.sdk?.getInstructions() ? { instructions: this.sdk.getInstructions() } : {}),
      tools: this.tools.map(tool => ({ ...tool })),
      adapter_id: this.options.server.adapter_id,
    }) as McpDiagnostics
  }

  async close() {
    const transport = this.transport
    const sdk = this.sdk
    this.state = 'Closed'
    this.transport = undefined
    this.sdk = undefined
    this.tools = []
    await transport?.terminateSession().catch(() => {})
    await sdk?.close().catch(() => {})
  }
}

export function createMcpClient(options: {
  server: McpServerRecord
  key: McpKeyRecord
  sdkFactory?: McpSdkFactory
  fetch?: FetchLike
  responseBudgets?: McpResponseBudgets
}) {
  return new GenericMcpClient({ ...options, sdkFactory: options.sdkFactory || defaultSdkFactory })
}
