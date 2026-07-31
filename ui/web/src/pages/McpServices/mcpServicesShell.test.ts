import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('MCP Services page wiring', () => {
  test('registers a dedicated route and navigation item', () => {
    const root = join(import.meta.dir, '../..')
    const router = readFileSync(join(root, 'router.tsx'), 'utf8')
    const layout = readFileSync(join(root, 'components/Layout.tsx'), 'utf8')

    expect(router).toContain("const McpServices = lazy(() => import('./pages/McpServices'))")
    expect(router).toContain("path: 'mcp-services'")
    expect(layout).toContain('to="/mcp-services"')
    expect(layout).toContain('MCP Services')
  })

  test('keeps secrets masked and makes remote Agent creation explicit', () => {
    const page = readFileSync(join(import.meta.dir, 'index.tsx'), 'utf8')
    const api = readFileSync(join(import.meta.dir, '../../api/mcp.ts'), 'utf8')
    const publicKeyType = api.match(/export type McpPublicKey = \{([\s\S]*?)\n\}/)?.[1] || ''

    expect(api).toContain('masked_key: string')
    expect(api).toContain('has_key: boolean')
    expect(publicKeyType).not.toMatch(/\n\s+key\??:/)
    expect(page).toContain('新建远端 Agent')
    expect(page).toContain('Popconfirm')
    expect(page).toContain('现有 Key：')
    expect(page).toContain('连接诊断')
  })

  test('hydrates configured Headers safely and submits overwrite-only edits', () => {
    const page = readFileSync(join(import.meta.dir, 'index.tsx'), 'utf8')
    const api = readFileSync(join(import.meta.dir, '../../api/mcp.ts'), 'utf8')
    const configuredHeaderFlag = "serverForm.getFieldValue(['custom_headers_list', field.name, 'configured'])"

    expect(api).toContain('custom_headers: Array<{ name: string; configured: boolean }>')
    expect(api).toContain('remove_custom_headers?: string[]')
    expect(page).toContain('custom_headers_list: (server.custom_headers || []).map(header => ({')
    expect(page).toContain('name: header.name')
    expect(page).toContain("value: ''")
    expect(page).toContain('configured: header.configured')
    expect(page).not.toContain('Object.entries(server.custom_headers')
    expect(page).toContain(`<Input placeholder="Header" disabled={Boolean(${configuredHeaderFlag})} />`)
    expect(page).toContain(`<Input placeholder="Value" />`)
    expect(page).toContain(`extra={${configuredHeaderFlag} ? '已配置；留空保持不变' : undefined}`)
    expect(page).toContain("add({ name: '', value: '', configured: false })")
    expect(page).toContain('remove(field.name)')
    expect(page).toContain('buildMcpServerPayload(await serverForm.validateFields(), editingServer || undefined)')
    expect(page).toContain('更改协议、主机或端口')
    expect(page).toContain('新建 Server 或重新配置凭据')
  })

  test('loads public quarantines and wires terminal inspection plus acknowledged forced clear', () => {
    const page = readFileSync(join(import.meta.dir, 'index.tsx'), 'utf8')
    const api = readFileSync(join(import.meta.dir, '../../api/mcp.ts'), 'utf8')
    const quarantineType = api.match(/export type McpAgentQuarantine = \{([\s\S]*?)\n\}/)?.[1] || ''

    expect(quarantineType).toContain('id: string')
    expect(quarantineType).toContain('server_id: string')
    expect(quarantineType).toContain('key_id: number')
    expect(quarantineType).toContain('agent_id: string')
    expect(quarantineType).toContain('session_id: string')
    expect(quarantineType).toContain("reason: 'send_unknown' | 'remote_cancel_unknown'")
    expect(quarantineType).toContain('created_at: string')
    expect(quarantineType).not.toContain('workspace_key')
    expect(quarantineType).not.toContain('request_id')
    expect(api).toContain("listQuarantines: () => apiClient.get<McpAgentQuarantine[]>('/mcp/quarantines')")
    expect(api).toContain('reconcileQuarantine: (id: string) => apiClient.post<McpQuarantineReconciliation>')
    expect(api).toContain("forceClearQuarantine: (id: string) => apiClient.delete(`/mcp/quarantines/${encodeURIComponent(id)}`, { data: { acknowledge_remote_work_may_continue: true } })")

    expect(page).toContain('mcpApi.listQuarantines()')
    expect(page).toContain('setQuarantines(quarantineResponse.data)')
    expect(page).toContain('检查远端状态')
    expect(page).toContain('强制解除隔离')
    expect(page).toContain('远端 Agent 可能仍在工作')
    expect(page).toContain('请稍后再次检查')
    expect(page).toContain('mcpApi.reconcileQuarantine(record.id)')
    expect(page).toContain('mcpApi.forceClearQuarantine(record.id)')
    expect(page).toContain("const warning = failureMessage(error, '远端状态尚未确认；请稍后再次检查。')")
    expect(page).not.toContain("const warning = '远端 Session 尚未终止；请稍后再次检查，或在确认风险后强制解除隔离。'")
    expect(page).toContain('setDiagnosticsOpen(true)\n      await loadData()')
    expect(page).toContain('record.session_id')
    expect(page).toContain('record.agent_id')
    expect(page).toContain('record.created_at')
    expect(page).not.toContain('generation_source_override')
    expect(page).not.toContain('model fallback')
  })
})
