import type { Express } from 'express'
import { listNovelProjects } from '../novel'
import { McpError, isMcpError } from '../mcp/errors'
import { createMcpSecretScrubber } from '../mcp/secret-scrubber'
import {
  createMcpKey,
  deleteMcpKey,
  normalizeMcpKey,
  readMcpKeys,
  toPublicMcpKey,
  updateMcpKey,
} from '../mcp/key-store'
import type { McpRuntime } from '../mcp/runtime'
import {
  deleteMcpServer,
  mergeMcpCustomHeaders,
  normalizeMcpServer,
  readMcpServers,
  toPublicMcpServer,
  upsertMcpServer,
} from '../mcp/server-store'
import type { McpServerUpdateInput } from '../mcp/types'
import { withMcpWorkspaceMutation } from '../mcp/workspace-coordinator'

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

type McpSecretScrubber = ReturnType<typeof createMcpSecretScrubber>

async function createRouteSecretScrubber(req: any, getWorkspace: () => string) {
  const keys: string[] = []
  const headerValues: string[] = []
  try {
    if (req.body?.key !== undefined) keys.push(String(req.body.key))
  } catch {}
  try {
    const submittedHeaders = req.body?.custom_headers
    if (submittedHeaders && typeof submittedHeaders === 'object' && !Array.isArray(submittedHeaders)) {
      headerValues.push(...Object.values(submittedHeaders).map(String))
    }
  } catch {}
  try {
    const activeWorkspace = getWorkspace()
    const [storedKeys, storedServers] = await Promise.allSettled([
      readMcpKeys(activeWorkspace),
      readMcpServers(activeWorkspace),
    ])
    if (storedKeys.status === 'fulfilled') keys.push(...storedKeys.value.map(item => item.key))
    if (storedServers.status === 'fulfilled') {
      headerValues.push(...storedServers.value.flatMap(item => Object.values(item.custom_headers)))
    }
  } catch {}
  return createMcpSecretScrubber({ keys, headerValues })
}

function routeError(error: unknown, scrubber: McpSecretScrubber) {
  if (isMcpError(error)) {
    const originChanged = error.code === 'MCP_BINDING_INVALID' && error.details?.reason === 'server_origin_changed'
    const referencedRecordConflict = error.code === 'MCP_REFERENCED_RECORD_CONFLICT'
    const status = originChanged || referencedRecordConflict ? 409
      : error.code === 'MCP_BINDING_INVALID' ? 400
      : error.code === 'MCP_AUTH_FAILED' ? 401
        : error.code === 'MCP_CAPABILITY_MISSING' ? 422
          : error.code === 'MCP_AGENT_BUSY' ? 409
            : 502
    return scrubber.scrubValue({
      status,
      body: {
        error: scrubber.scrubText(error.message),
        detail: scrubber.scrubText(error.message),
        error_code: originChanged ? 'MCP_SERVER_ORIGIN_CHANGE_REQUIRES_NEW_CREDENTIAL' : error.code,
        ...(referencedRecordConflict && Array.isArray(error.details?.references)
          ? { references: error.details.references }
          : {}),
      },
    })
  }
  const message = scrubber.scrubText((error as any)?.message || error || 'MCP 操作失败')
  return scrubber.scrubValue({ status: 500, body: { error: message.slice(0, 400), detail: message.slice(0, 400) } })
}

function requireHttpServer(input: any) {
  const server = normalizeMcpServer(input)
  if (!server.id) throw new McpError('MCP_BINDING_INVALID', 'MCP Server ID 不能为空')
  if (server.transport !== 'streamable_http') throw new McpError('MCP_BINDING_INVALID', '首期仅支持 Streamable HTTP MCP Server')
  if (!/^https?:\/\//i.test(server.url)) throw new McpError('MCP_BINDING_INVALID', 'MCP Server URL 必须是 HTTP(S) 地址')
  if (!server.adapter_id) throw new McpError('MCP_BINDING_INVALID', 'MCP Adapter 不能为空')
  return server
}

function throwReferencedRecordConflict(message: string, references: ProjectReference[]): never {
  throw new McpError('MCP_REFERENCED_RECORD_CONFLICT', message, { references })
}

export function registerMcpRoutes(
  app: Express,
  getWorkspace: () => string,
  runtime: McpRuntime,
  options: { findProjectReferences?: FindProjectReferences } = {},
) {
  const findReferences = options.findProjectReferences || findMcpProjectReferences
  const safely = (handler: (req: any, res: any) => Promise<any>) => async (req: any, res: any) => {
    const scrubber = await createRouteSecretScrubber(req, getWorkspace)
    const originalJson = res.json
    res.json = function json(body: unknown) {
      return originalJson.call(this, scrubber.scrubValue(body))
    }
    try {
      await handler(req, res)
    } catch (error) {
      const failure = routeError(error, scrubber)
      res.status(failure.status).json(failure.body)
    } finally {
      res.json = originalJson
    }
  }

  app.get(['/api/mcp/servers', '/api/mcp/servers/'], safely(async (_req, res) => {
    res.json((await readMcpServers(getWorkspace())).map(toPublicMcpServer))
  }))

  app.post(['/api/mcp/servers', '/api/mcp/servers/'], safely(async (req, res) => {
    const activeWorkspace = getWorkspace()
    const server = requireHttpServer(req.body || {})
    const created = await withMcpWorkspaceMutation(activeWorkspace, async () => {
      if ((await readMcpServers(activeWorkspace)).some(item => item.id === server.id)) return null
      await upsertMcpServer(activeWorkspace, server)
      return server
    })
    if (!created) {
      return res.status(409).json({ error: 'MCP Server ID 已存在', detail: 'MCP Server ID 已存在' })
    }
    res.status(201).json({ ok: true, server: toPublicMcpServer(created) })
  }))

  app.put(['/api/mcp/servers/:id', '/api/mcp/servers/:id/'], safely(async (req, res) => {
    const activeWorkspace = getWorkspace()
    const input: McpServerUpdateInput = req.body || {}
    const result = await withMcpWorkspaceMutation(activeWorkspace, async () => {
      const previous = (await readMcpServers(activeWorkspace)).find(item => item.id === String(req.params.id))
      if (!previous) return null
      const server = requireHttpServer({
        ...previous,
        ...input,
        id: previous.id,
        custom_headers: mergeMcpCustomHeaders(
          previous.custom_headers,
          input.custom_headers,
          input.remove_custom_headers,
        ),
      })
      const previousOrigin = new URL(previous.url).origin
      const nextOrigin = new URL(server.url).origin
      if (previousOrigin !== nextOrigin) {
        const hasCredential = (await readMcpKeys(activeWorkspace))
          .some(key => key.mcp_server_id === previous.id)
        if (hasCredential) {
          throw new McpError(
            'MCP_BINDING_INVALID',
            '该 Server 已配置凭据；更换来源站点必须新建 Server 或移除后重新配置凭据',
            { reason: 'server_origin_changed' },
          )
        }
      }
      if (!server.is_active) {
        const references = await findReferences(activeWorkspace, { serverId: server.id })
        if (references.length) throwReferencedRecordConflict('该 MCP Server 仍被小说项目引用', references)
      }
      await upsertMcpServer(activeWorkspace, server)
      return { server }
    })
    if (!result) return res.status(404).json({ error: 'MCP Server 不存在' })
    await runtime.invalidateServer?.(result.server.id)
    res.json({ ok: true, server: toPublicMcpServer(result.server) })
  }))

  app.delete(['/api/mcp/servers/:id', '/api/mcp/servers/:id/'], safely(async (req, res) => {
    const activeWorkspace = getWorkspace()
    const id = String(req.params.id)
    const result = await withMcpWorkspaceMutation(activeWorkspace, async () => {
      const previous = (await readMcpServers(activeWorkspace)).find(item => item.id === id)
      if (!previous) return null
      const keys = await readMcpKeys(activeWorkspace)
      const references = await findReferences(activeWorkspace, { serverId: id })
      if (references.length) throwReferencedRecordConflict('该 MCP Server 仍被小说项目引用', references)
      if (keys.some(key => key.mcp_server_id === id)) return { error: '请先删除该 Server 下的 MCP Key' }
      await deleteMcpServer(activeWorkspace, id)
      return { previous }
    })
    if (!result) return res.status(404).json({ error: 'MCP Server 不存在' })
    if ('error' in result) return res.status(409).json(result)
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
    const result = await withMcpWorkspaceMutation(activeWorkspace, async () => {
      const previous = (await readMcpKeys(activeWorkspace)).find(item => item.id === id)
      if (!previous) return null
      const submittedKey = req.body?.key
      const prospective = normalizeMcpKey({
        ...previous,
        ...(req.body || {}),
        id,
        key: submittedKey === undefined || String(submittedKey).trim() === '' ? previous.key : submittedKey,
        mcp_server_id: req.body?.mcp_server_id ?? previous.mcp_server_id,
      })
      if (!(await readMcpServers(activeWorkspace)).some(item => item.id === prospective.mcp_server_id)) {
        throw new McpError('MCP_BINDING_INVALID', 'MCP Server 不存在')
      }
      if (!prospective.is_active || prospective.mcp_server_id !== previous.mcp_server_id) {
        const references = await findReferences(activeWorkspace, { keyId: id })
        if (references.length) throwReferencedRecordConflict('该 MCP Key 仍被小说项目引用', references)
      }
      const updated = await updateMcpKey(activeWorkspace, id, prospective)
      return { previous, updated: updated! }
    })
    if (!result) return res.status(404).json({ error: 'MCP Key 不存在' })
    await runtime.invalidateKey?.(id, result.previous.mcp_server_id)
    res.json({ ok: true, key: toPublicMcpKey(result.updated) })
  }))

  app.delete(['/api/mcp/keys/:id', '/api/mcp/keys/:id/'], safely(async (req, res) => {
    const activeWorkspace = getWorkspace()
    const id = Number(req.params.id)
    const previous = await withMcpWorkspaceMutation(activeWorkspace, async () => {
      if (!Number.isInteger(id) || id <= 0) return null
      const record = (await readMcpKeys(activeWorkspace)).find(item => item.id === id)
      if (!record) return null
      const references = await findReferences(activeWorkspace, { keyId: id })
      if (references.length) throwReferencedRecordConflict('该 MCP Key 仍被小说项目引用', references)
      await deleteMcpKey(activeWorkspace, id)
      return record
    })
    if (!previous) return res.status(404).json({ error: 'MCP Key 不存在' })
    await runtime.invalidateKey?.(id, previous.mcp_server_id)
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
