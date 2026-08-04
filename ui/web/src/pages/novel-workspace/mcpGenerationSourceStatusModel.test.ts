import { describe, expect, test } from 'bun:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { buildMcpSourceStatus } from './mcpGenerationSourceStatusModel'

const binding = {
  server_id: 'buda',
  key_id: 3,
  adapter_id: 'buda',
  agent_id: 'agent-1',
  model: 'model-x',
}

describe('MCP generation source workspace status', () => {
  test('shows the controlled active Buda account, Agent, and effective model without exposing a raw key', () => {
    const status = buildMcpSourceStatus({
      binding: { ...binding, model: '' },
      active: true,
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
      label: 'Buda MCP · 正文 Agent · Auto · 已启用',
      detail: '章节来源：Buda MCP；账号：测试账号 · sk_***；Adapter：buda；Agent：正文 Agent；模型：Auto；已启用',
      available: true,
      active: true,
    })
    expect(JSON.stringify(status)).not.toContain('must-not-appear')
  })

  test('retains stable MCP binding identity when metadata loading fails', () => {
    expect(buildMcpSourceStatus({
      binding,
      active: false,
      loadFailed: true,
    })).toEqual({
      kind: 'mcp',
      label: 'buda MCP · agent-1 · model-x · 已停用',
      detail: '章节来源：buda MCP；账号：#3；Adapter：buda；Agent：agent-1；模型：model-x；已停用；状态信息暂不可用',
      available: false,
      active: false,
    })
  })

  test('loads optional display metadata without fetching or committing a source', async () => {
    const module = await import('./mcpGenerationSourceStatusModel')
    const loadMetadata = Reflect.get(module, 'loadMcpSourceStatusMetadata')
    expect(typeof loadMetadata).toBe('function')
    if (typeof loadMetadata !== 'function') return
    let rejectServers: (error: Error) => void = () => {}
    const servers = new Promise<never>((_resolve, reject) => {
      rejectServers = reject
    })

    const loading = loadMetadata({
      binding,
      isActive: () => true,
      loadServers: () => servers,
      loadKeys: async () => [],
      loadAgents: async (nextBinding: unknown) => {
        expect(nextBinding).toBe(binding)
        return []
      },
    })
    rejectServers(new Error('metadata unavailable'))
    expect(await loading).toEqual({
      servers: [],
      keys: [],
      agents: [],
      loadFailed: true,
    })
  })

  test('drops superseded optional metadata after switching projects', async () => {
    const module = await import('./mcpGenerationSourceStatusModel')
    const loadMetadata = Reflect.get(module, 'loadMcpSourceStatusMetadata')
    expect(typeof loadMetadata).toBe('function')
    if (typeof loadMetadata !== 'function') return
    let firstActive = true
    let resolveFirst: (servers: any[]) => void = () => {}
    const delayedFirst = new Promise<any[]>(resolve => {
      resolveFirst = resolve
    })
    const common = {
      loadKeys: async () => [],
      loadAgents: async () => [],
    }

    const firstLoad = loadMetadata({
      ...common,
      binding,
      isActive: () => firstActive,
      loadServers: async () => delayedFirst,
    })
    firstActive = false
    const secondLoad = loadMetadata({
      ...common,
      binding: { ...binding, agent_id: 'agent-2' },
      isActive: () => true,
      loadServers: async () => [],
    })

    expect(await secondLoad).toMatchObject({ loadFailed: false })
    resolveFirst([])
    expect(await firstLoad).toBeNull()
  })

  test('status component source has no independent source GET', async () => {
    const component = await Bun.file(new URL('./McpGenerationSourceStatus.tsx', import.meta.url)).text()
    expect(component).not.toContain('getProjectSource')
    expect(component).not.toContain('loadSource')
    expect(component).toContain('binding')
    expect(component).toContain('active')
  })

  test('renders stable controlled identifiers accessibly before optional metadata loads', async () => {
    const component = await import('./McpGenerationSourceStatus')
    const html = renderToStaticMarkup(React.createElement(component.McpGenerationSourceStatus, {
      projectId: 5,
      binding,
      active: false,
      compact: false,
      onOpenSettings: () => {},
    }))
    expect(html).toContain('buda MCP')
    expect(html).toContain('agent-1')
    expect(html).toContain('model-x')
    expect(html).toContain('账号：#3')
    expect(html).toContain('Adapter：buda')
    expect(html).toContain('已停用')
  })
})
