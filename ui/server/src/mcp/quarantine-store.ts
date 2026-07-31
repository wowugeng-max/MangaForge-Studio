import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { canonicalFilesystemIdentity } from '../workspace-identity'
import { readJsonArrayFailClosed, writeJsonArrayAtomic } from './atomic-json-store'
import { McpError } from './errors'
import type { McpAgentQuarantineReason, McpAgentQuarantineRecord } from './types'
import { assertMcpWorkspaceMutationHeld, withMcpWorkspaceMutation } from './workspace-coordinator'

const PROVENANCE_ID_MAX_CHARS = 160
const FULL_ID_MAX_CHARS = 16_384
const QUARANTINE_STORE_MAX_BYTES = 5 * 1024 * 1024
const QUARANTINE_RECORD_MAX_COUNT = 10_000
const DURABLE_KEYS = [
  'agent_id', 'created_at', 'id', 'key_id', 'reason', 'request_id',
  'server_id', 'session_id', 'workspace_key',
] as const

export type McpAgentQuarantineInput = {
  serverId: string
  keyId: number
  agentId: string
  requestId: string
  sessionId: string
  reason: McpAgentQuarantineReason
}

export function getMcpAgentQuarantinePath(activeWorkspace: string) {
  return join(canonicalFilesystemIdentity(activeWorkspace), 'mcp-agent-quarantines.json')
}

function bounded(value: unknown) {
  return String(value ?? '').trim().slice(0, PROVENANCE_ID_MAX_CHARS)
}

function validReason(value: unknown): value is McpAgentQuarantineReason {
  return value === 'send_unknown' || value === 'remote_cancel_unknown'
}

function normalizeStoredRecord(raw: unknown, workspaceKey: string): McpAgentQuarantineRecord {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new McpError('MCP_STORE_CORRUPT', 'MCP Agent 隔离记录损坏')
  }
  const item = raw as Record<string, unknown>
  const keys = Object.keys(item).sort()
  if (keys.length !== DURABLE_KEYS.length || keys.some((key, index) => key !== DURABLE_KEYS[index])) {
    throw new McpError('MCP_STORE_CORRUPT', 'MCP Agent 隔离记录损坏')
  }
  if (typeof item.id !== 'string' || typeof item.workspace_key !== 'string'
    || typeof item.server_id !== 'string' || typeof item.key_id !== 'number'
    || typeof item.agent_id !== 'string' || typeof item.request_id !== 'string'
    || typeof item.session_id !== 'string' || typeof item.reason !== 'string'
    || typeof item.created_at !== 'string') {
    throw new McpError('MCP_STORE_CORRUPT', 'MCP Agent 隔离记录损坏')
  }
  const record: McpAgentQuarantineRecord = {
    id: item.id.trim(),
    workspace_key: item.workspace_key,
    server_id: item.server_id.trim(),
    key_id: item.key_id,
    agent_id: item.agent_id.trim(),
    request_id: item.request_id.trim(),
    session_id: item.session_id.trim(),
    reason: item.reason as McpAgentQuarantineReason,
    created_at: item.created_at.trim(),
  }
  if (!record.id || record.workspace_key !== workspaceKey || !record.server_id
    || !Number.isInteger(record.key_id) || record.key_id <= 0 || !record.agent_id
    || record.id.length > FULL_ID_MAX_CHARS || record.workspace_key.length > FULL_ID_MAX_CHARS
    || record.server_id.length > FULL_ID_MAX_CHARS || record.agent_id.length > FULL_ID_MAX_CHARS
    || !record.request_id || record.request_id.length > PROVENANCE_ID_MAX_CHARS
    || !record.session_id || record.session_id.length > PROVENANCE_ID_MAX_CHARS || !validReason(record.reason)
    || !record.created_at || !Number.isFinite(Date.parse(record.created_at))
    || new Date(record.created_at).toISOString() !== record.created_at) {
    throw new McpError('MCP_STORE_CORRUPT', 'MCP Agent 隔离记录损坏')
  }
  return record
}

function normalizeInput(activeWorkspace: string, input: McpAgentQuarantineInput) {
  if (!input || typeof input.serverId !== 'string' || typeof input.keyId !== 'number'
    || typeof input.agentId !== 'string' || typeof input.requestId !== 'string'
    || typeof input.sessionId !== 'string') {
    throw new McpError('MCP_BINDING_INVALID', 'MCP Agent 隔离记录缺少可核对的 Session 或绑定标识')
  }
  const record = {
    workspace_key: canonicalFilesystemIdentity(activeWorkspace),
    server_id: input.serverId.trim(),
    key_id: input.keyId,
    agent_id: input.agentId.trim(),
    request_id: bounded(input.requestId),
    session_id: bounded(input.sessionId),
    reason: input.reason,
  }
  if (!record.server_id || !Number.isInteger(record.key_id) || record.key_id <= 0
    || !record.agent_id || record.server_id.length > FULL_ID_MAX_CHARS
    || record.agent_id.length > FULL_ID_MAX_CHARS || !record.request_id || !record.session_id
    || !validReason(record.reason)) {
    throw new McpError('MCP_BINDING_INVALID', 'MCP Agent 隔离记录缺少可核对的 Session 或绑定标识')
  }
  return record
}

export async function readMcpAgentQuarantines(activeWorkspace: string) {
  const workspaceKey = canonicalFilesystemIdentity(activeWorkspace)
  const parsed = await readJsonArrayFailClosed(getMcpAgentQuarantinePath(activeWorkspace), {
    maxBytes: QUARANTINE_STORE_MAX_BYTES,
  })
  if (parsed.length > QUARANTINE_RECORD_MAX_COUNT) {
    throw new McpError('MCP_STORE_CORRUPT', 'MCP Agent 隔离记录损坏')
  }
  const records = parsed.map(item => normalizeStoredRecord(item, workspaceKey))
  const ids = new Set<string>()
  const tuples = new Set<string>()
  for (const record of records) {
    const tuple = JSON.stringify([
      record.workspace_key, record.server_id, record.key_id, record.agent_id,
    ])
    if (ids.has(record.id) || tuples.has(tuple)) {
      throw new McpError('MCP_STORE_CORRUPT', 'MCP Agent 隔离记录损坏')
    }
    ids.add(record.id)
    tuples.add(tuple)
  }
  return records
}

async function writeUnlocked(activeWorkspace: string, records: McpAgentQuarantineRecord[]) {
  assertMcpWorkspaceMutationHeld(activeWorkspace)
  await writeJsonArrayAtomic(getMcpAgentQuarantinePath(activeWorkspace), records, {
    maxBytes: QUARANTINE_STORE_MAX_BYTES,
  })
}

export function upsertMcpAgentQuarantine(activeWorkspace: string, input: McpAgentQuarantineInput) {
  return withMcpWorkspaceMutation(activeWorkspace, async () => {
    const normalized = normalizeInput(activeWorkspace, input)
    const records = await readMcpAgentQuarantines(activeWorkspace)
    const index = records.findIndex(item => item.workspace_key === normalized.workspace_key
      && item.server_id === normalized.server_id && item.key_id === normalized.key_id
      && item.agent_id === normalized.agent_id)
    const previous = index >= 0 ? records[index] : undefined
    if (!previous && records.length >= QUARANTINE_RECORD_MAX_COUNT) {
      throw new McpError('MCP_BINDING_INVALID', 'MCP Agent 隔离记录数量超过限制')
    }
    const record: McpAgentQuarantineRecord = {
      id: previous?.id || randomUUID(),
      ...normalized,
      created_at: previous?.created_at || new Date().toISOString(),
    }
    if (index >= 0) records[index] = record
    else records.push(record)
    await writeUnlocked(activeWorkspace, records)
    return record
  })
}

export function clearMcpAgentQuarantine(activeWorkspace: string, quarantineId: string) {
  return withMcpWorkspaceMutation(activeWorkspace, async () => {
    const id = typeof quarantineId === 'string' ? quarantineId.trim() : ''
    if (!id) return false
    const records = await readMcpAgentQuarantines(activeWorkspace)
    const index = records.findIndex(item => item.id === id)
    if (index < 0) return false
    records.splice(index, 1)
    await writeUnlocked(activeWorkspace, records)
    return true
  })
}
