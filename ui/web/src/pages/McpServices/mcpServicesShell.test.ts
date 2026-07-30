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

    expect(api).toContain('custom_headers: Array<{ name: string; configured: boolean }>')
    expect(api).toContain('remove_custom_headers?: string[]')
    expect(page).toContain('custom_headers_list: (server.custom_headers || []).map(header => ({')
    expect(page).toContain('name: header.name')
    expect(page).toContain("value: ''")
    expect(page).toContain('configured: header.configured')
    expect(page).not.toContain('Object.entries(server.custom_headers')
    expect(page).toContain('已配置；留空保持不变')
    expect(page).toContain('remove(field.name)')
    expect(page).toContain('buildMcpServerPayload(await serverForm.validateFields(), editingServer || undefined)')
    expect(page).toContain('更改协议、主机或端口')
    expect(page).toContain('新建 Server 或重新配置凭据')
  })
})
