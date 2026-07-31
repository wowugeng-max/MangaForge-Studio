import { McpError } from '../errors'
import type { McpToolDescriptor } from '../types'

export type BudaLogicalOperation =
  | 'listAgents'
  | 'createAgent'
  | 'listDriveFiles'
  | 'upsertDriveFile'
  | 'readDriveText'
  | 'createSession'
  | 'getSession'
  | 'sendSessionMessage'
  | 'cancelSession'

export type BudaToolMap = Omit<Record<BudaLogicalOperation, string>, 'createAgent'> & { createAgent?: string }

export const BUDA_TOOL_ALIASES: Record<BudaLogicalOperation, readonly string[]> = {
  listAgents: ['api_claw_list_api_agents', 'apiClaw.listApiAgents', 'listApiAgents'],
  createAgent: ['api_claw_create_api_agent', 'apiClaw.createApiAgent', 'createApiAgent'],
  listDriveFiles: ['api_claw_list_api_agent_drive_files', 'apiClaw.listApiAgentDriveFiles', 'listApiAgentDriveFiles'],
  upsertDriveFile: ['api_claw_upsert_api_agent_drive_file', 'apiClaw.upsertApiAgentDriveFile', 'upsertApiAgentDriveFile'],
  readDriveText: ['api_claw_api_agent_drive_text', 'apiClaw.apiAgentDriveText', 'apiAgentDriveText'],
  createSession: ['api_claw_create_api_agent_session', 'apiClaw.createApiAgentSession', 'createApiAgentSession'],
  getSession: ['api_claw_get_api_agent_session', 'apiClaw.getApiAgentSession', 'getApiAgentSession'],
  sendSessionMessage: ['api_claw_post_api_agent_session_message', 'apiClaw.postApiAgentSessionMessage', 'postApiAgentSessionMessage'],
  cancelSession: ['api_claw_cancel_api_agent_session_run', 'apiClaw.cancelApiAgentSessionRun', 'cancelApiAgentSessionRun'],
}

function selectedArguments(args: Record<string, unknown>, names: string[]) {
  return Object.fromEntries(names
    .filter(name => args[name] !== undefined)
    .map(name => [name, args[name]]))
}

export function buildBudaToolArguments(
  operation: BudaLogicalOperation,
  toolName: string,
  args: Record<string, unknown>,
) {
  if (!toolName.startsWith('api_claw_')) return args
  switch (operation) {
    case 'listAgents': return {}
    case 'createAgent': return {
      body: selectedArguments(args, ['spaceId', 'name', 'emoji', 'instructions', 'storageType']),
    }
    case 'listDriveFiles': return {
      params: selectedArguments(args, ['agentId']),
      query: selectedArguments(args, ['path']),
    }
    case 'upsertDriveFile': return {
      params: selectedArguments(args, ['agentId']),
      body: selectedArguments(args, ['path', 'content', 'mimeType']),
    }
    case 'readDriveText': return {
      params: selectedArguments(args, ['agentId']),
      body: selectedArguments(args, ['filePath', 'maxBytes']),
    }
    case 'createSession': return {
      params: selectedArguments(args, ['agentId']),
      body: selectedArguments(args, ['message', 'title', 'mode', 'model', 'startRun', 'attachments']),
    }
    case 'getSession':
    case 'cancelSession': return {
      params: selectedArguments(args, ['agentId', 'sessionId']),
    }
    case 'sendSessionMessage': return {
      params: selectedArguments(args, ['agentId', 'sessionId']),
      body: selectedArguments(args, ['message', 'title', 'mode', 'model', 'startRun', 'attachments']),
    }
  }
}

function schemaProperties(tool: McpToolDescriptor) {
  const properties = tool.inputSchema?.properties
  return properties && typeof properties === 'object' && !Array.isArray(properties)
    ? new Set(Object.keys(properties))
    : new Set<string>()
}

function fallbackScore(operation: BudaLogicalOperation, tool: McpToolDescriptor) {
  const haystack = `${tool.name} ${tool.description || ''}`.toLowerCase()
  const properties = schemaProperties(tool)
  const has = (...names: string[]) => names.every(name => properties.has(name))
  switch (operation) {
    case 'listAgents': return /list.*agent/.test(haystack) && !properties.has('agentId') ? 2 : 0
    case 'createAgent': return /create.*agent/.test(haystack) && properties.has('name') ? 2 : 0
    case 'listDriveFiles': return /drive.*file|file.*drive/.test(haystack) && has('agentId') && !properties.has('content') ? 2 : 0
    case 'upsertDriveFile': return has('agentId', 'path', 'content') ? 3 : 0
    case 'readDriveText': return has('agentId', 'filePath') ? 3 : 0
    case 'createSession': return /create.*session/.test(haystack) && has('agentId', 'message') && !properties.has('sessionId') ? 3 : 0
    case 'getSession': return /get.*session/.test(haystack) && has('agentId', 'sessionId') && !properties.has('message') ? 3 : 0
    case 'sendSessionMessage': return has('agentId', 'sessionId', 'message') ? 3 : 0
    case 'cancelSession': return /cancel/.test(haystack) && has('agentId', 'sessionId') ? 3 : 0
  }
}

function resolveOne(operation: BudaLogicalOperation, tools: McpToolDescriptor[]) {
  for (const alias of BUDA_TOOL_ALIASES[operation]) {
    const exact = tools.find(tool => tool.name === alias)
    if (exact) return exact.name
  }
  const fallback = tools
    .map(tool => ({ tool, score: fallbackScore(operation, tool) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
  if (fallback.length === 1 || (fallback[0] && fallback[0].score > (fallback[1]?.score || 0))) return fallback[0]!.tool.name
  return ''
}

export function resolveBudaTools(
  tools: McpToolDescriptor[],
  options: { requireCreateAgent?: boolean } = {},
): BudaToolMap {
  const output = {} as BudaToolMap
  const missing: BudaLogicalOperation[] = []
  for (const operation of Object.keys(BUDA_TOOL_ALIASES) as BudaLogicalOperation[]) {
    const name = resolveOne(operation, tools)
    if (!name) {
      if (operation !== 'createAgent' || options.requireCreateAgent) missing.push(operation)
      continue
    }
    output[operation] = name
  }
  if (missing.length) {
    throw new McpError('MCP_CAPABILITY_MISSING', `Buda MCP 缺少必要能力：${missing.join(', ')}`, {
      missing_operations: missing,
      discovered_tools: tools.map(tool => tool.name),
    })
  }
  return output
}
