import {
  Client,
  ProtocolError,
  SdkError,
  SdkErrorCode,
  StreamableHTTPClientTransport,
  type CallToolResult,
  type StreamableHTTPClientTransportOptions,
} from '@modelcontextprotocol/client'
import { isAbortRelatedError, McpError } from './errors'
import { createMcpSecretScrubber } from './secret-scrubber'
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
  createTransport: (url: URL, options: StreamableHTTPClientTransportOptions) => TransportLike
}

const defaultSdkFactory: McpSdkFactory = {
  createClient: () => new Client({ name: 'mangaforge-studio', version: '1.0.0' }),
  createTransport: (url, options) => new StreamableHTTPClientTransport(url, options),
}

export function buildMcpHeaders(server: McpServerRecord, key: McpKeyRecord) {
  const headers: Record<string, string> = { ...server.custom_headers }
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
  }) {
    this.scrubber = createMcpSecretScrubber({
      keys: [options.key.key],
      headerValues: Object.values(options.server.custom_headers),
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
    })
    this.sdk = sdk
    this.transport = transport
    const startupTimeout = Math.max(1, Math.min(
      this.options.server.startup_timeout_ms,
      timeoutMs ?? this.options.server.startup_timeout_ms,
    ))
    try {
      await sdk.connect(transport as any, {
        signal,
        timeout: startupTimeout,
        maxTotalTimeout: startupTimeout,
      })
      await this.refreshTools({ signal, timeoutMs: startupTimeout }, sdk)
      this.state = 'Ready'
      return this
    } catch (error) {
      this.state = 'Closed'
      await this.close().catch(() => {})
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
      const result = normalizeToolResult(await sdk.callTool(
        { name, arguments: args },
        { signal: options.signal, timeout, maxTotalTimeout: timeout },
      ))
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
}) {
  return new GenericMcpClient({ ...options, sdkFactory: options.sdkFactory || defaultSdkFactory })
}
