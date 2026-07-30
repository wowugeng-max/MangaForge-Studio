import type { Express } from 'express'
import { listNovelProjects } from '../novel'
import { McpError, isMcpError } from '../mcp/errors'
import {
  createMcpKey,
  deleteMcpKey,
  readMcpKeys,
  toPublicMcpKey,
  updateMcpKey,
} from '../mcp/key-store'
import type { McpRuntime } from '../mcp/runtime'
import {
  deleteMcpServer,
  normalizeMcpServer,
  readMcpServers,
  upsertMcpServer,
} from '../mcp/server-store'

type ProjectReference = { id: number; title?: string }
type FindProjectReferences = (
  activeWorkspace: string,
  target: { serverId?: string; keyId?: number },
) => Promise<ProjectReference[]>

function projectMcpBinding(project: any) {
  const source = project?.reference_config?.prose_generation_source
  return source?.type === 'mcp' ? source.mcp : null
}

export const findMcpProjectReferences: FindProjectReferences = async (activeWorkspace, target) => {
  const projects = await listNovelProjects(activeWorkspace)
  return projects.filter(project => {
    const binding = projectMcpBinding(project)
    if (!binding) return false
    if (target.serverId && String(binding.server_id) !== target.serverId) return false
    if (target.keyId && Number(binding.key_id) !== target.keyId) return false
    return true
  }).map(project => ({ id: project.id, title: project.title }))
}

function routeError(error: unknown) {
  if (isMcpError(error)) {
    const status = error.code === 'MCP_BINDING_INVALID' ? 400
      : error.code === 'MCP_AUTH_FAILED' ? 401
        : error.code === 'MCP_CAPABILITY_MISSING' ? 422
          : error.code === 'MCP_AGENT_BUSY' ? 409
            : 502
    return { status, body: { error: error.message, detail: error.message, error_code: error.code } }
  }
  const message = String((error as any)?.message || error || 'MCP 操作失败')
  return { status: 500, body: { error: message.slice(0, 400), detail: message.slice(0, 400) } }
}

function requireHttpServer(input: any) {
  const server = normalizeMcpServer(input)
  if (!server.id) throw new McpError('MCP_BINDING_INVALID', 'MCP Server ID 不能为空')
  if (server.transport !== 'streamable_http') throw new McpError('MCP_BINDING_INVALID', '首期仅支持 Streamable HTTP MCP Server')
  if (!/^https?:\/\//i.test(server.url)) throw new McpError('MCP_BINDING_INVALID', 'MCP Server URL 必须是 HTTP(S) 地址')
  if (!server.adapter_id) throw new McpError('MCP_BINDING_INVALID', 'MCP Adapter 不能为空')
  return server
}

export function registerMcpRoutes(
  app: Express,
  getWorkspace: () => string,
  runtime: McpRuntime,
  options: { findProjectReferences?: FindProjectReferences } = {},
) {
  const findReferences = options.findProjectReferences || findMcpProjectReferences
  const safely = (handler: (req: any, res: any) => Promise<any>) => async (req: any, res: any) => {
    try { await handler(req, res) } catch (error) {
      const failure = routeError(error)
      res.status(failure.status).json(failure.body)
    }
  }

  app.get(['/api/mcp/servers', '/api/mcp/servers/'], safely(async (_req, res) => {
    res.json(await readMcpServers(getWorkspace()))
  }))

  app.post(['/api/mcp/servers', '/api/mcp/servers/'], safely(async (req, res) => {
    const activeWorkspace = getWorkspace()
    const server = requireHttpServer(req.body || {})
    if ((await readMcpServers(activeWorkspace)).some(item => item.id === server.id)) {
      return res.status(409).json({ error: 'MCP Server ID 已存在', detail: 'MCP Server ID 已存在' })
    }
    await upsertMcpServer(activeWorkspace, server)
    res.status(201).json({ ok: true, server })
  }))

  app.put(['/api/mcp/servers/:id', '/api/mcp/servers/:id/'], safely(async (req, res) => {
    const activeWorkspace = getWorkspace()
    const previous = (await readMcpServers(activeWorkspace)).find(item => item.id === String(req.params.id))
    if (!previous) return res.status(404).json({ error: 'MCP Server 不存在' })
    const server = requireHttpServer({ ...previous, ...(req.body || {}), id: previous.id })
    if (!server.is_active && previous.is_active && req.body?.allow_referenced_disable !== true) {
      const refs = await findReferences(activeWorkspace, { serverId: server.id })
      if (refs.length) return res.status(409).json({ error: '该 MCP Server 仍被小说项目引用', references: refs })
    }
    await upsertMcpServer(activeWorkspace, server)
    await runtime.invalidateServer?.(server.id)
    res.json({ ok: true, server })
  }))

  app.delete(['/api/mcp/servers/:id', '/api/mcp/servers/:id/'], safely(async (req, res) => {
    const activeWorkspace = getWorkspace()
    const id = String(req.params.id)
    const refs = await findReferences(activeWorkspace, { serverId: id })
    if (refs.length) return res.status(409).json({ error: '该 MCP Server 仍被小说项目引用', references: refs })
    const keys = await readMcpKeys(activeWorkspace)
    if (keys.some(key => key.mcp_server_id === id)) return res.status(409).json({ error: '请先删除该 Server 下的 MCP Key' })
    await deleteMcpServer(activeWorkspace, id)
    await runtime.invalidateServer?.(id)
    res.json({ ok: true })
  }))

  app.get(['/api/mcp/keys', '/api/mcp/keys/'], safely(async (_req, res) => {
    const activeWorkspace = getWorkspace()
    const records = await readMcpKeys(activeWorkspace)
    const output = await Promise.all(records.map(async record => ({
      ...toPublicMcpKey(record),
      bound_projects: await findReferences(activeWorkspace, { keyId: record.id }),
    })))
    res.json(output)
  }))

  app.post(['/api/mcp/keys', '/api/mcp/keys/'], safely(async (req, res) => {
    const activeWorkspace = getWorkspace()
    const serverId = String(req.body?.mcp_server_id || '')
    if (!(await readMcpServers(activeWorkspace)).some(item => item.id === serverId)) {
      throw new McpError('MCP_BINDING_INVALID', 'MCP Server 不存在')
    }
    if (!String(req.body?.key || '').trim()) throw new McpError('MCP_AUTH_FAILED', 'MCP Key 不能为空')
    const record = await createMcpKey(activeWorkspace, {
      ...req.body,
      mcp_server_id: serverId,
      key: String(req.body.key),
    })
    res.status(201).json({ ok: true, key: toPublicMcpKey(record) })
  }))

  app.put(['/api/mcp/keys/:id', '/api/mcp/keys/:id/'], safely(async (req, res) => {
    const activeWorkspace = getWorkspace()
    const id = Number(req.params.id)
    const previous = (await readMcpKeys(activeWorkspace)).find(item => item.id === id)
    if (!previous) return res.status(404).json({ error: 'MCP Key 不存在' })
    const serverId = String(req.body?.mcp_server_id || previous.mcp_server_id)
    if (!(await readMcpServers(activeWorkspace)).some(item => item.id === serverId)) {
      throw new McpError('MCP_BINDING_INVALID', 'MCP Server 不存在')
    }
    if (req.body?.is_active === false && previous.is_active && req.body?.allow_referenced_disable !== true) {
      const refs = await findReferences(activeWorkspace, { keyId: id })
      if (refs.length) return res.status(409).json({ error: '该 MCP Key 仍被小说项目引用', references: refs })
    }
    const updated = await updateMcpKey(activeWorkspace, id, { ...req.body, mcp_server_id: serverId })
    await runtime.invalidateKey?.(id, previous.mcp_server_id)
    res.json({ ok: true, key: toPublicMcpKey(updated!) })
  }))

  app.delete(['/api/mcp/keys/:id', '/api/mcp/keys/:id/'], safely(async (req, res) => {
    const activeWorkspace = getWorkspace()
    const id = Number(req.params.id)
    const previous = (await readMcpKeys(activeWorkspace)).find(item => item.id === id)
    const refs = await findReferences(activeWorkspace, { keyId: id })
    if (refs.length) return res.status(409).json({ error: '该 MCP Key 仍被小说项目引用', references: refs })
    await deleteMcpKey(activeWorkspace, id)
    if (previous) await runtime.invalidateKey?.(id, previous.mcp_server_id)
    res.json({ ok: true })
  }))

  app.post(['/api/mcp/keys/:id/test', '/api/mcp/keys/:id/test/'], safely(async (req, res) => {
    res.json(await runtime.testKey(Number(req.params.id), req.signal))
  }))

  app.get(['/api/mcp/keys/:id/agents', '/api/mcp/keys/:id/agents/'], safely(async (req, res) => {
    res.json({ agents: await runtime.listAgents(Number(req.params.id), req.signal) })
  }))

  app.post(['/api/mcp/keys/:id/agents', '/api/mcp/keys/:id/agents/'], safely(async (req, res) => {
    const name = String(req.body?.name || 'MangaForge 小说正文 Agent').trim()
    if (!name) throw new McpError('MCP_BINDING_INVALID', 'Agent 名称不能为空')
    const agent = await runtime.createAgent(Number(req.params.id), {
      name,
      ...(req.body?.space_id ? { spaceId: String(req.body.space_id) } : {}),
    }, req.signal)
    res.json({ ok: true, agent })
  }))

  app.get(['/api/mcp/servers/:id/diagnostics', '/api/mcp/servers/:id/diagnostics/'], safely(async (req, res) => {
    const keyId = Number(req.query?.key_id || 0)
    if (!keyId) throw new McpError('MCP_BINDING_INVALID', '诊断需要选择 MCP Key')
    res.json(await runtime.diagnostics(String(req.params.id), keyId, req.signal))
  }))
}
