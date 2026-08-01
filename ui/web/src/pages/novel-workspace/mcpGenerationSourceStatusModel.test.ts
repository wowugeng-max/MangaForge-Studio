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

  test('commits the authoritative source before optional metadata settles', async () => {
    const module = await import('./mcpGenerationSourceStatusModel')
    const loadMcpSourceStatusSnapshot = Reflect.get(module, 'loadMcpSourceStatusSnapshot')
    expect(typeof loadMcpSourceStatusSnapshot).toBe('function')
    if (typeof loadMcpSourceStatusSnapshot !== 'function') return

    const source = {
      version: 'prose_generation_source_v1' as const,
      type: 'mcp' as const,
      mcp: {
        server_id: 'buda',
        key_id: 3,
        adapter_id: 'buda',
        agent_id: 'agent-2',
        model: 'model-new',
      },
    }
    const committed: unknown[] = []
    let rejectServers: (error: Error) => void = () => {}
    const servers = new Promise<never>((_resolve, reject) => {
      rejectServers = reject
    })

    const loading = loadMcpSourceStatusSnapshot({
      projectId: 5,
      isActive: () => true,
      onSource: (nextSource: unknown) => committed.push(nextSource),
      loadSource: async () => source,
      loadServers: () => servers,
      loadKeys: async () => [],
      loadAgents: async () => [],
    })

    await Promise.resolve()
    await Promise.resolve()
    expect(committed).toEqual([source])

    rejectServers(new Error('metadata unavailable'))
    expect(await loading).toEqual({
      source,
      servers: [],
      keys: [],
      agents: [],
      loadFailed: true,
    })
  })

  test('does not commit a superseded project load after switching projects', async () => {
    const module = await import('./mcpGenerationSourceStatusModel')
    const loadMcpSourceStatusSnapshot = Reflect.get(module, 'loadMcpSourceStatusSnapshot')
    expect(typeof loadMcpSourceStatusSnapshot).toBe('function')
    if (typeof loadMcpSourceStatusSnapshot !== 'function') return

    const firstSource = {
      version: 'prose_generation_source_v1' as const,
      type: 'mcp' as const,
      mcp: {
        server_id: 'buda',
        key_id: 3,
        adapter_id: 'buda',
        agent_id: 'agent-old',
        model: 'model-old',
      },
    }
    const secondSource = {
      version: 'prose_generation_source_v1' as const,
      type: 'model' as const,
    }
    const committed: unknown[] = []
    let firstActive = true
    let resolveFirst: (source: typeof firstSource) => void = () => {}
    const delayedFirst = new Promise<typeof firstSource>(resolve => {
      resolveFirst = resolve
    })
    const common = {
      loadServers: async () => [],
      loadKeys: async () => [],
      loadAgents: async () => [],
      onSource: (source: unknown) => committed.push(source),
    }

    const firstLoad = loadMcpSourceStatusSnapshot({
      ...common,
      projectId: 5,
      isActive: () => firstActive,
      loadSource: async () => delayedFirst,
    })
    firstActive = false
    const secondLoad = loadMcpSourceStatusSnapshot({
      ...common,
      projectId: 6,
      isActive: () => true,
      loadSource: async () => secondSource,
    })

    expect(await secondLoad).toMatchObject({ source: secondSource, loadFailed: false })
    resolveFirst(firstSource)
    expect(await firstLoad).toBeNull()
    expect(committed).toEqual([secondSource])
  })
})
