import { McpError } from '../errors'
import { BudaAdapter } from './buda-adapter'
import type { McpClientPort, McpGenerationAdapter } from './types'

export function createMcpAdapter(adapterId: string, client: McpClientPort): McpGenerationAdapter {
  if (adapterId === 'buda') return new BudaAdapter(client)
  throw new McpError('MCP_BINDING_INVALID', `未注册的 MCP Adapter：${adapterId}`)
}

export function hasMcpAdapter(adapterId: string) {
  return adapterId === 'buda'
}
