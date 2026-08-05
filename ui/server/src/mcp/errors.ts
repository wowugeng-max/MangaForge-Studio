import { types } from 'node:util'

export type McpErrorCode =
  | 'MCP_BINDING_INVALID'
  | 'MCP_BINDING_CHANGED'
  | 'MCP_REFERENCED_RECORD_CONFLICT'
  | 'MCP_AUTH_FAILED'
  | 'MCP_CONNECT_TIMEOUT'
  | 'MCP_CONNECTION_LOST'
  | 'MCP_SERVER_NOT_READY'
  | 'MCP_CAPABILITY_MISSING'
  | 'MCP_TOOL_ERROR'
  | 'MCP_DRIVE_SYNC_FAILED'
  | 'MCP_INPUT_TOO_LARGE'
  | 'MCP_AGENT_BUSY'
  | 'MCP_AGENT_QUARANTINED'
  | 'MCP_QUARANTINE_ACK_REQUIRED'
  | 'MCP_SEND_UNKNOWN'
  | 'MCP_SESSION_FAILED'
  | 'MCP_INPUT_REQUIRED'
  | 'MCP_GENERATION_TIMEOUT'
  | 'MCP_CANCELLED'
  | 'MCP_EMPTY_PROSE'
  | 'MCP_STAGE_CONTRACT_INVALID'
  | 'MCP_STORE_CORRUPT'
  | 'MCP_STORE_IO_FAILED'
  | 'MCP_RUNTIME_ERROR'

export type McpFailureEvidence = {
  kind: 'jsonrpc_http_rejection'
  http_status: number
  jsonrpc_code?: number
  response_id?: string | number | null
  reason?: 'server_not_initialized'
}

const FAILURE_RESPONSE_ID_MAX_CHARS = 16_384

function ownDataValue(value: unknown, field: string) {
  if (!value || typeof value !== 'object' || types.isProxy(value)) return undefined
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, field)
    return descriptor && 'value' in descriptor ? descriptor.value : undefined
  } catch {
    return undefined
  }
}

function optionalOwnDataValue(value: unknown, field: string) {
  if (!value || typeof value !== 'object' || types.isProxy(value)) return { present: false as const }
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, field)
    if (!descriptor) return { present: false as const }
    if (!('value' in descriptor)) return { present: true as const, valid: false as const }
    return { present: true as const, valid: true as const, value: descriptor.value }
  } catch {
    return { present: false as const }
  }
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

export function mcpFailureEvidence(error: unknown): McpFailureEvidence | undefined {
  const details = ownDataValue(error, 'details')
  const candidate = ownDataValue(details, 'failure_evidence')
  if (ownDataValue(candidate, 'kind') !== 'jsonrpc_http_rejection') return undefined
  const httpStatus = ownDataValue(candidate, 'http_status')
  if (!finiteNumber(httpStatus)) return undefined

  const evidence: McpFailureEvidence = {
    kind: 'jsonrpc_http_rejection',
    http_status: httpStatus,
  }
  const jsonrpcCode = optionalOwnDataValue(candidate, 'jsonrpc_code')
  if (jsonrpcCode.present) {
    if (!jsonrpcCode.valid || !finiteNumber(jsonrpcCode.value)) return undefined
    evidence.jsonrpc_code = jsonrpcCode.value
  }
  const responseId = optionalOwnDataValue(candidate, 'response_id')
  if (responseId.present) {
    if (!responseId.valid) return undefined
    const value = responseId.value
    if (value !== null
      && !finiteNumber(value)
      && !(typeof value === 'string' && value.length <= FAILURE_RESPONSE_ID_MAX_CHARS)) {
      return undefined
    }
    evidence.response_id = value as string | number | null
  }
  const reason = optionalOwnDataValue(candidate, 'reason')
  if (reason.present) {
    if (!reason.valid || reason.value !== 'server_not_initialized') return undefined
    if (evidence.http_status !== 400
      || evidence.jsonrpc_code !== -32000
      || evidence.response_id !== null) {
      return undefined
    }
    evidence.reason = reason.value
  }
  return evidence
}

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
