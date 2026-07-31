export type McpErrorCode =
  | 'MCP_BINDING_INVALID'
  | 'MCP_BINDING_CHANGED'
  | 'MCP_REFERENCED_RECORD_CONFLICT'
  | 'MCP_AUTH_FAILED'
  | 'MCP_CONNECT_TIMEOUT'
  | 'MCP_CONNECTION_LOST'
  | 'MCP_CAPABILITY_MISSING'
  | 'MCP_TOOL_ERROR'
  | 'MCP_DRIVE_SYNC_FAILED'
  | 'MCP_INPUT_TOO_LARGE'
  | 'MCP_AGENT_BUSY'
  | 'MCP_AGENT_QUARANTINED'
  | 'MCP_SEND_UNKNOWN'
  | 'MCP_SESSION_FAILED'
  | 'MCP_INPUT_REQUIRED'
  | 'MCP_GENERATION_TIMEOUT'
  | 'MCP_CANCELLED'
  | 'MCP_EMPTY_PROSE'
  | 'MCP_STORE_CORRUPT'
  | 'MCP_STORE_IO_FAILED'
  | 'MCP_RUNTIME_ERROR'

export class McpError extends Error {
  readonly error_code: McpErrorCode

  constructor(
    public readonly code: McpErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'McpError'
    this.error_code = code
  }
}

export function isMcpError(error: unknown): error is McpError {
  return error instanceof McpError
}

export function isAbortRelatedError(error: unknown, signal?: AbortSignal) {
  if (signal && error === signal.reason) return true
  if (isMcpError(error)) {
    return error.code === 'MCP_CANCELLED' || error.code === 'MCP_GENERATION_TIMEOUT'
  }
  if (!error || typeof error !== 'object') return false
  return (error as any).name === 'AbortError' || (error as any).code === 'ABORT_ERR'
}

export function asMcpError(error: unknown, fallbackCode: McpErrorCode = 'MCP_TOOL_ERROR') {
  if (isMcpError(error)) return error
  return new McpError(fallbackCode, String((error as any)?.message || error || 'MCP 操作失败'))
}
