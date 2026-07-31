import type { Express } from 'express'
import { mutateNovelProjectReferenceConfig } from '../novel'
import { isMcpError, McpError } from '../mcp/errors'
import type { McpRuntime } from '../mcp/runtime'
import { withMcpWorkspaceMutation } from '../mcp/workspace-coordinator'
import {
  normalizeProseGenerationSource,
  resolveProseGenerationSource,
  validateMcpCredentialSelection,
  validateMcpProjectBinding,
} from '../novel-writing-service/generation-source/source-config'

type NovelMcpBindingRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  mcpRuntime: McpRuntime
}

function bindingError(error: unknown) {
  if (isMcpError(error)) {
    const status = error.details?.reason === 'binding_conflict' ? 409
      : error.code === 'MCP_AGENT_BUSY' ? 409
      : error.code === 'MCP_AUTH_FAILED' ? 401
        : error.code === 'MCP_CAPABILITY_MISSING' ? 422
          : 400
    return { status, body: { error: error.message, detail: error.message, error_code: error.code } }
  }
  const message = String((error as any)?.message || error || '项目 MCP 绑定失败')
  return { status: 500, body: { error: message.slice(0, 400), detail: message.slice(0, 400) } }
}

export function registerNovelMcpBindingRoutes(app: Express, ctx: NovelMcpBindingRoutesContext) {
  const base = '/api/novel/projects/:id/prose-generation-source'
  const safely = (handler: (req: any, res: any) => Promise<any>) => async (req: any, res: any) => {
    try { await handler(req, res) } catch (error) {
      const failure = bindingError(error)
      res.status(failure.status).json(failure.body)
    }
  }
  const requireProject = async (req: any, res: any) => {
    const activeWorkspace = ctx.getWorkspace()
    const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
    if (!project) {
      res.status(404).json({ error: 'project not found' })
      return null
    }
    return { activeWorkspace, project }
  }

  app.get(base, safely(async (req, res) => {
    const resolved = await requireProject(req, res)
    if (!resolved) return
    res.json({ ok: true, source: resolveProseGenerationSource(resolved.project) })
  }))

  app.put(base, safely(async (req, res) => {
    const activeWorkspace = ctx.getWorkspace()
    const result = await withMcpWorkspaceMutation(activeWorkspace, async () => {
      const project = await ctx.getProject(activeWorkspace, Number(req.params.id))
      if (!project) return null
      const source = normalizeProseGenerationSource(req.body?.source || req.body)
      const currentSource = resolveProseGenerationSource(project)
      for (const candidate of [currentSource, source]) {
        if (candidate.type !== 'mcp') continue
        const active = await ctx.mcpRuntime.isAgentLeaseActive(activeWorkspace, {
          serverId: candidate.mcp.server_id,
          keyId: candidate.mcp.key_id,
          agentId: candidate.mcp.agent_id,
        })
        if (active) {
          throw new McpError('MCP_AGENT_BUSY', '该 MCP Agent 正在完成正文生产，暂不能修改绑定')
        }
      }
      let validation: any = null
      if (source.type === 'mcp') {
        validation = await validateMcpProjectBinding(
          activeWorkspace,
          project,
          source.mcp,
          { runtime: ctx.mcpRuntime, signal: req.signal },
        )
      }
      const mutation = await mutateNovelProjectReferenceConfig(activeWorkspace, {
        projectId: project.id,
        operation: 'update-prose-generation-source',
        mutate: current => ({
          referenceConfig: { ...current, prose_generation_source: source },
          result: source,
        }),
      })
      if (!mutation) return null
      return { source, validation, mutation }
    })
    if (!result) return res.status(404).json({ error: 'project not found' })
    res.json({
      ok: true,
      source: result.source,
      project: result.mutation?.project,
      ...(result.validation ? {
        validation: {
          server_id: result.validation.server.id,
          key_id: result.validation.key.id,
          agent: result.validation.agent,
        },
      } : {}),
    })
  }))

  app.post(`${base}/test`, safely(async (req, res) => {
    const resolved = await requireProject(req, res)
    if (!resolved) return
    const source = req.body?.source
      ? normalizeProseGenerationSource(req.body.source)
      : resolveProseGenerationSource(resolved.project)
    if (source.type !== 'mcp') throw new McpError('MCP_BINDING_INVALID', '当前项目未选择 MCP 正文来源')
    const validation = await validateMcpProjectBinding(
      resolved.activeWorkspace,
      resolved.project,
      source.mcp,
      { runtime: ctx.mcpRuntime, signal: req.signal },
    )
    res.json({ ok: true, server_id: validation.server.id, key_id: validation.key.id, agent: validation.agent })
  }))

  app.get(`${base}/agents`, safely(async (req, res) => {
    const resolved = await requireProject(req, res)
    if (!resolved) return
    const stored = resolveProseGenerationSource(resolved.project)
    const serverId = String(req.query?.server_id || (stored.type === 'mcp' ? stored.mcp.server_id : ''))
    const keyId = Number(req.query?.key_id || (stored.type === 'mcp' ? stored.mcp.key_id : 0))
    if (!serverId || !keyId) throw new McpError('MCP_BINDING_INVALID', '请选择 MCP Server 和 Key')
    await validateMcpCredentialSelection(resolved.activeWorkspace, { serverId, keyId })
    res.json({ agents: await ctx.mcpRuntime.listAgents(keyId, req.signal) })
  }))

  app.post(`${base}/agents`, safely(async (req, res) => {
    const resolved = await requireProject(req, res)
    if (!resolved) return
    const serverId = String(req.body?.server_id || '')
    const keyId = Number(req.body?.key_id || 0)
    if (!serverId || !keyId) throw new McpError('MCP_BINDING_INVALID', '请选择 MCP Server 和 Key')
    await validateMcpCredentialSelection(resolved.activeWorkspace, { serverId, keyId })
    const agent = await ctx.mcpRuntime.createAgent(keyId, {
      name: String(req.body?.name || 'MangaForge 小说正文 Agent'),
      ...(req.body?.space_id ? { spaceId: String(req.body.space_id) } : {}),
    }, req.signal)
    res.json({ ok: true, agent })
  }))
}
