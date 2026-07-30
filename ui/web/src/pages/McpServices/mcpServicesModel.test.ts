import { describe, expect, test } from 'bun:test'
import {
  buildMcpKeyPayload,
  buildMcpServerPayload,
  defaultBudaServerForm,
  summarizeMcpDiagnostics,
} from './mcpServicesModel'

describe('MCP Services UI model', () => {
  test('provides the approved Buda Streamable HTTP defaults', () => {
    expect(defaultBudaServerForm()).toMatchObject({
      id: 'buda',
      display_name: 'Buda',
      transport: 'streamable_http',
      url: 'https://buda.im/api/mcp',
      auth_type: 'bearer',
      adapter_id: 'buda',
      startup_timeout_ms: 30_000,
      tool_timeout_ms: 60_000,
      generation_timeout_ms: 600_000,
      poll_initial_ms: 1_000,
      poll_max_ms: 10_000,
      is_active: true,
    })
  })

  test('keeps an existing secret when the edit field is blank', () => {
    const payload = buildMcpKeyPayload({
      mcp_server_id: 'buda',
      description: '账号一',
      key: '   ',
      is_active: true,
      priority: 2,
    }, { id: 3, masked_key: 'sk_b***test', has_key: true } as any)

    expect(payload).toEqual({
      mcp_server_id: 'buda',
      description: '账号一',
      is_active: true,
      priority: 2,
    })
    expect(buildMcpKeyPayload({ mcp_server_id: 'buda', key: 'sk_new' })).toMatchObject({ key: 'sk_new' })
  })

  test('normalizes headers and enabled tools without empty entries', () => {
    expect(buildMcpServerPayload({
      ...defaultBudaServerForm(),
      custom_headers_list: [{ key: 'X-Space', value: 'fiction' }, { key: '', value: 'ignored' }],
      enabled_tools_text: 'listApiAgents\n\ncreateApiAgentSession',
    })).toMatchObject({
      custom_headers: { 'X-Space': 'fiction' },
      enabled_tools: ['listApiAgents', 'createApiAgentSession'],
    })
  })

  test('builds a bounded diagnostics summary', () => {
    expect(summarizeMcpDiagnostics({
      state: 'Ready',
      adapter_id: 'buda',
      adapter_ready: true,
      agent_count: 2,
      tools: [{ name: 'one' }, { name: 'two' }],
      instructions: 'remote instructions',
    })).toEqual({ state: 'Ready', adapter_id: 'buda', adapter_ready: true, agent_count: 2, tool_count: 2 })
  })
})
