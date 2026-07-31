import { describe, expect, test } from 'bun:test'
import {
  buildMcpKeyPayload,
  buildMcpServerPayload,
  defaultBudaServerForm,
  summarizeMcpDiagnostics,
} from './mcpServicesModel'
import * as mcpServicesModel from './mcpServicesModel'

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

  test('builds overwrite-only Header edits with explicit deletion and preserves enabled tools', () => {
    const existing = {
      ...defaultBudaServerForm(),
      custom_headers: [
        { name: 'X-Keep', configured: true },
        { name: 'X-Replace', configured: true },
        { name: 'X-Remove', configured: true },
      ],
    } as any

    const payload = buildMcpServerPayload({
      ...defaultBudaServerForm(),
      custom_headers_list: [
        { name: 'X-Keep', value: '' },
        { name: 'X-Replace', value: 'new-value' },
        { name: 'X-New', value: 'new-header' },
        { name: '', value: 'ignored' },
      ],
      enabled_tools_text: 'listApiAgents\n\ncreateApiAgentSession',
    }, existing)

    expect(payload).toMatchObject({
      custom_headers: { 'X-Replace': 'new-value', 'X-New': 'new-header' },
      remove_custom_headers: ['X-Remove'],
      enabled_tools: ['listApiAgents', 'createApiAgentSession'],
    })
    expect(payload.custom_headers).not.toHaveProperty('X-Keep')
  })

  test('formats stable MCP service failure codes without losing fallback behavior', () => {
    const formatMcpServiceFailure = (mcpServicesModel as any).formatMcpServiceFailure
    expect(formatMcpServiceFailure({ error_code: 'MCP_STORE_CORRUPT' }, 'fallback')).toContain('没有覆盖原文件')
    expect(formatMcpServiceFailure({ error_code: 'MCP_STORE_IO_FAILED' }, 'fallback')).toContain('工作区权限和磁盘状态')
    expect(formatMcpServiceFailure({ error_code: 'MCP_SERVER_ORIGIN_CHANGE_REQUIRES_NEW_CREDENTIAL' }, 'fallback')).toContain('不能直接更换来源站点')
    expect(formatMcpServiceFailure({ error_code: 'MCP_REFERENCED_RECORD_CONFLICT' }, 'fallback')).toContain('小说项目引用')
    expect(formatMcpServiceFailure({ error: 'server detail' }, 'fallback')).toBe('server detail')
    expect(formatMcpServiceFailure({}, 'fallback')).toBe('fallback')
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

  test('builds an empty diagnostics summary before a connection is selected', () => {
    expect(summarizeMcpDiagnostics(null)).toEqual({
      state: 'Unknown',
      adapter_id: '',
      adapter_ready: false,
      agent_count: 0,
      tool_count: 0,
    })
  })
})
