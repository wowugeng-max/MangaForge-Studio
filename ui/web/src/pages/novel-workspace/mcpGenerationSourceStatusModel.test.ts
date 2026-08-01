import { describe, expect, test } from 'bun:test'
import { buildMcpSourceStatus } from './mcpGenerationSourceStatusModel'

describe('MCP generation source workspace status', () => {
  test('describes the ordinary model source', () => {
    expect(buildMcpSourceStatus({
      source: { version: 'prose_generation_source_v1', type: 'model' },
    })).toEqual({
      kind: 'model',
      label: '模型 API',
      detail: '正文来源：模型 API',
      available: true,
    })
  })

  test('shows the Buda account, Agent, and effective model without exposing a raw key', () => {
    const status = buildMcpSourceStatus({
      source: {
        version: 'prose_generation_source_v1',
        type: 'mcp',
        mcp: {
          server_id: 'buda',
          key_id: 3,
          adapter_id: 'buda',
          agent_id: 'agent-1',
          model: '',
        },
      },
      servers: [{ id: 'buda', display_name: 'Buda' } as any],
      keys: [{
        id: 3,
        mcp_server_id: 'buda',
        description: '测试账号',
        masked_key: 'sk_***',
        key: 'must-not-appear',
        is_active: true,
      } as any],
      agents: [{ id: 'agent-1', name: '正文 Agent' }],
    })

    expect(status).toEqual({
      kind: 'mcp',
      label: 'Buda MCP · 正文 Agent · Auto',
      detail: '正文来源：Buda MCP；账号：测试账号 · sk_***；Agent：正文 Agent；模型：Auto',
      available: true,
    })
    expect(JSON.stringify(status)).not.toContain('must-not-appear')
  })

  test('retains stable MCP binding identity when metadata loading fails', () => {
    expect(buildMcpSourceStatus({
      source: {
        version: 'prose_generation_source_v1',
        type: 'mcp',
        mcp: {
          server_id: 'buda',
          key_id: 3,
          adapter_id: 'buda',
          agent_id: 'agent-1',
          model: 'model-x',
        },
      },
      loadFailed: true,
    })).toEqual({
      kind: 'mcp',
      label: 'buda MCP · agent-1 · model-x',
      detail: '正文来源：buda MCP；账号：#3；Agent：agent-1；模型：model-x；状态信息暂不可用',
      available: false,
    })
  })
})
