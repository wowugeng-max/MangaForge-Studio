export type McpErrorCode =
  | 'MCP_BINDING_INVALID'
  | 'MCP_BINDING_CHANGED'
  | 'MCP_AUTH_FAILED'
  | 'MCP_CONNECT_TIMEOUT'
  | 'MCP_CAPABILITY_MISSING'
  | 'MCP_TOOL_ERROR'
  | 'MCP_DRIVE_SYNC_FAILED'
  | 'MCP_INPUT_TOO_LARGE'
  | 'MCP_AGENT_BUSY'
  | 'MCP_SESSION_FAILED'
  | 'MCP_INPUT_REQUIRED'
  | 'MCP_GENERATION_TIMEOUT'
  | 'MCP_CANCELLED'
  | 'MCP_EMPTY_PROSE'
  | 'MCP_STORE_CORRUPT'
  | 'MCP_STORE_IO_FAILED'

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

export function asMcpError(error: unknown, fallbackCode: McpErrorCode = 'MCP_TOOL_ERROR') {
  if (isMcpError(error)) return error
  return new McpError(fallbackCode, String((error as any)?.message || error || 'MCP 操作失败'))
}
