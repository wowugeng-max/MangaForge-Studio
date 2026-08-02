import type { Express } from 'express'
import { types } from 'node:util'
import { mutateNovelProjectReferenceConfig } from '../novel'
import { isMcpError, McpError } from '../mcp/errors'
import type { McpRuntime } from '../mcp/runtime'
import { createMcpSecretScrubber } from '../mcp/secret-scrubber'
import type { McpKeyRecord, McpServerRecord } from '../mcp/types'
import { withMcpWorkspaceMutation } from '../mcp/workspace-coordinator'
import { ChapterSourceLeaseRegistry } from '../novel-writing-service/generation-source/chapter-source-lease'
import {
  ChapterGenerationSourceError,
  isChapterGenerationSourceError,
} from '../novel-writing-service/generation-source/errors'
import {
  chapterGenerationSourceFingerprint,
  type ChapterGenerationSourceState,
  type McpProjectBinding,
  normalizeChapterGenerationSource,
  normalizeProseGenerationSource,
  resolveChapterGenerationSource,
  toLegacyProseGenerationSource,
  validateMcpCredentialSelection,
  validateMcpProjectBinding,
} from '../novel-writing-service/generation-source/source-config'

type NovelMcpBindingRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  mcpRuntime?: McpRuntime
  chapterSourceLeases?: ChapterSourceLeaseRegistry
}

const PUBLIC_AGENT_STRING_LIMITS = {
  id: 16_384,
  name: 4_096,
  description: 4_096,
  status: 160,
  spaceId: 16_384,
} as const
const PUBLIC_AGENT_LIST_LIMIT = 100
const PUBLIC_AGENT_LIST_SERIALIZED_CHAR_LIMIT = 128 * 1_024
const TRUNCATED_AGENT_FIELD = '[TRUNCATED]'

function ownDataValue(value: unknown, key: string) {
  if (!value || typeof value !== 'object' || types.isProxy(value)) return undefined
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    return descriptor && 'value' in descriptor ? descriptor.value : undefined
  } catch {
    return undefined
  }
}

function ownString(value: unknown, key: string) {
  const candidate = ownDataValue(value, key)
  return typeof candidate === 'string' ? candidate : undefined
}

function publicAgentProjector(selection: { server: McpServerRecord; key: McpKeyRecord }) {
  const scrubber = createMcpSecretScrubber({
    keys: [selection.key.key],
    headers: selection.server.custom_headers || {},
  })
  const bounded = (value: string, limit: number) => (
    value.length > limit ? TRUNCATED_AGENT_FIELD : scrubber.scrubText(value).slice(0, limit)
  )
  return (agent: unknown) => {
    const description = ownString(agent, 'description')
    const status = ownString(agent, 'status')
    const raw = ownDataValue(agent, 'raw')
    const spaceId = ownString(agent, 'spaceId')
      ?? ownString(agent, 'space_id')
      ?? ownString(raw, 'spaceId')
      ?? ownString(raw, 'space_id')
    return {
      id: bounded(ownString(agent, 'id') || '', PUBLIC_AGENT_STRING_LIMITS.id),
      name: bounded(ownString(agent, 'name') || '', PUBLIC_AGENT_STRING_LIMITS.name),
      ...(description !== undefined ? {
        description: bounded(description, PUBLIC_AGENT_STRING_LIMITS.description),
      } : {}),
      ...(status !== undefined ? {
        status: bounded(status, PUBLIC_AGENT_STRING_LIMITS.status),
      } : {}),
      ...(spaceId !== undefined ? {
        spaceId: bounded(spaceId, PUBLIC_AGENT_STRING_LIMITS.spaceId),
      } : {}),
    }
  }
}

function publicAgentList(agents: unknown, projectAgent: ReturnType<typeof publicAgentProjector>) {
  if (!agents || typeof agents !== 'object' || types.isProxy(agents) || !Array.isArray(agents)) return []
  const projected: ReturnType<typeof projectAgent>[] = []
  let serializedChars = '{"agents":[]}'.length
  const count = Math.min(agents.length, PUBLIC_AGENT_LIST_LIMIT)
  for (let index = 0; index < count; index += 1) {
    const sourceAgent = ownDataValue(agents, String(index))
    if (sourceAgent === undefined) continue
    const agent = projectAgent(sourceAgent)
    const agentChars = JSON.stringify(agent).length + (projected.length ? 1 : 0)
    if (serializedChars + agentChars > PUBLIC_AGENT_LIST_SERIALIZED_CHAR_LIMIT) break
    projected.push(agent)
    serializedChars += agentChars
  }
  return projected
}

async function validatePinnedMcpProjectBinding(
  ctx: NovelMcpBindingRoutesContext,
  activeWorkspace: string,
  project: any,
  binding: Parameters<typeof validateMcpProjectBinding>[2],
  signal?: AbortSignal,
) {
  const mcpRuntime = ctx.mcpRuntime
  if (!mcpRuntime) {
    throw new McpError('MCP_CAPABILITY_MISSING', '服务端未配置 MCP Runtime')
  }
  const selection = await validateMcpCredentialSelection(activeWorkspace, {
    serverId: binding.server_id,
    keyId: binding.key_id,
    adapterId: binding.adapter_id,
  })
  return validateMcpProjectBinding(activeWorkspace, project, binding, {
    credentialSnapshot: { servers: [selection.server], keys: [selection.key] },
    runtime: {
      listAgents: (keyId, options) => mcpRuntime.listAgents(keyId, options, {
        ...selection,
        activeWorkspace,
      }),
    },
    signal,
  })
}

function publicMcpErrorMessage(error: McpError) {
  if (error.code === 'MCP_AUTH_FAILED') return 'MCP 认证失败'
  if (error.code === 'MCP_CAPABILITY_MISSING') return '服务端未配置所需的 MCP 能力'
  if (error.code === 'MCP_AGENT_BUSY') return '该 MCP Agent 正在使用中'
  if (error.code === 'MCP_BINDING_INVALID') {
    return error.details?.reason === 'binding_conflict'
      ? '该 MCP 绑定已被其他项目使用'
      : 'MCP 绑定无效'
  }
  return 'MCP 操作失败'
}

function bindingError(error: unknown) {
  if (isChapterGenerationSourceError(error)) {
    const status = error.code === 'GENERATION_SOURCE_BUSY' ? 409
      : error.code === 'CHAPTER_MODEL_REQUIRED' ? 422
        : 409
    return {
      status,
      body: { error: error.message, detail: error.message, error_code: error.code },
    }
  }
  if (isMcpError(error)) {
    const status = error.details?.reason === 'binding_conflict' ? 409
      : error.code === 'MCP_AGENT_BUSY' ? 409
      : error.code === 'MCP_AUTH_FAILED' ? 401
        : error.code === 'MCP_CAPABILITY_MISSING' ? 422
          : 400
    const message = publicMcpErrorMessage(error)
    return { status, body: { error: message, detail: message, error_code: error.code } }
  }
  return { status: 500, body: { error: '项目 MCP 绑定失败', detail: '项目 MCP 绑定失败' } }
}

export type ChapterGenerationSourceView = {
  ok: true
  source: ChapterGenerationSourceState
  fingerprint: string
  locked: boolean
  display: {
    active: 'model' | 'mcp'
    model_id: number | null
    mcp: McpProjectBinding | null
  }
}

export function registerNovelMcpBindingRoutes(app: Express, ctx: NovelMcpBindingRoutesContext) {
  const legacyBase = '/api/novel/projects/:id/prose-generation-source'
  const chapterBase = '/api/novel/projects/:id/chapter-generation-source'
  const chapterSourceLeases = ctx.chapterSourceLeases || new ChapterSourceLeaseRegistry()
  const safely = (handler: (req: any, res: any) => Promise<any>) => async (req: any, res: any) => {
    try { await handler(req, res) } catch (error) {
      const failure = bindingError(error)
      res.status(failure.status).json(failure.body)
    }
  }
  const projectIdFromRequest = (req: any) => {
    const projectId = Number(req.params?.id)
    if (!Number.isSafeInteger(projectId) || projectId <= 0) {
      throw new McpError('MCP_BINDING_INVALID', 'project id 必须是正安全整数')
    }
    return projectId
  }
  const requireProject = async (req: any, res: any) => {
    const activeWorkspace = ctx.getWorkspace()
    const project = await ctx.getProject(activeWorkspace, projectIdFromRequest(req))
    if (!project) {
      res.status(404).json({ error: 'project not found' })
      return null
    }
    return { activeWorkspace, project }
  }
  const publicValidation = (validation: Awaited<ReturnType<typeof validatePinnedMcpProjectBinding>>) => ({
    server_id: validation.server.id,
    key_id: validation.key.id,
    agent: publicAgentProjector(validation)(validation.agent),
  })
  const chapterSourceView = (
    activeWorkspace: string,
    project: any,
    source: ChapterGenerationSourceState,
  ): ChapterGenerationSourceView => ({
    ok: true,
    source,
    fingerprint: chapterGenerationSourceFingerprint(source),
    locked: chapterSourceLeases.isActive(activeWorkspace, project.id),
    display: {
      active: source.active,
      model_id: source.model.model_id ?? null,
      mcp: source.mcp ? {
        server_id: source.mcp.server_id,
        key_id: source.mcp.key_id,
        adapter_id: source.mcp.adapter_id,
        agent_id: source.mcp.agent_id,
        model: source.mcp.model,
      } : null,
    },
  })

  type MutationValidation = Awaited<ReturnType<typeof validatePinnedMcpProjectBinding>> | null
  const mutateChapterSource = async (input: {
    req: any
    operation: string
    mutate: (current: ChapterGenerationSourceState) => ChapterGenerationSourceState
    beforePersist?: (input: {
      activeWorkspace: string
      project: any
      current: ChapterGenerationSourceState
      source: ChapterGenerationSourceState
    }) => Promise<MutationValidation>
  }) => {
    const activeWorkspace = ctx.getWorkspace()
    const projectId = projectIdFromRequest(input.req)
    return withMcpWorkspaceMutation(activeWorkspace, async () => {
      const project = await ctx.getProject(activeWorkspace, projectId)
      if (!project) return null
      if (chapterSourceLeases.isActive(activeWorkspace, project.id)) {
        throw new ChapterGenerationSourceError(
          'GENERATION_SOURCE_BUSY',
          '当前章节任务正在运行，结束后可切换来源',
          { project_id: project.id },
        )
      }
      const current = resolveChapterGenerationSource(project)
      const source = normalizeChapterGenerationSource(input.mutate(current))
      const validation = await input.beforePersist?.({ activeWorkspace, project, current, source }) || null
      const mutation = await mutateNovelProjectReferenceConfig(activeWorkspace, {
        projectId: project.id,
        operation: input.operation,
        signal: input.req.signal,
        mutate: referenceConfig => ({
          referenceConfig: { ...referenceConfig, chapter_generation_source: source },
          result: source,
        }),
      })
      if (!mutation) return null
      return {
        activeWorkspace,
        project: mutation.project,
        source: mutation.result,
        validation,
      }
    })
  }

  const validateBinding = async (input: {
    activeWorkspace: string
    project: any
    binding: McpProjectBinding
    signal?: AbortSignal
  }) => validatePinnedMcpProjectBinding(
    ctx,
    input.activeWorkspace,
    input.project,
    input.binding,
    input.signal,
  )

  const assertLegacyAgentLeasesAvailable = async (
    activeWorkspace: string,
    current: ChapterGenerationSourceState,
    source: ChapterGenerationSourceState,
  ) => {
    const mcpRuntime = ctx.mcpRuntime
    if (!mcpRuntime) return
    const candidates = [
      ...(current.active === 'mcp' && current.mcp ? [current.mcp] : []),
      ...(source.active === 'mcp' && source.mcp ? [source.mcp] : []),
    ]
    const seen = new Set<string>()
    for (const candidate of candidates) {
      const identity = JSON.stringify([candidate.server_id, candidate.key_id, candidate.agent_id])
      if (seen.has(identity)) continue
      seen.add(identity)
      const active = await mcpRuntime.isAgentLeaseActive(activeWorkspace, {
        serverId: candidate.server_id,
        keyId: candidate.key_id,
        agentId: candidate.agent_id,
      })
      if (active) {
        throw new McpError('MCP_AGENT_BUSY', '该 MCP Agent 正在完成正文生产，暂不能修改绑定')
      }
    }
  }

  app.get(chapterBase, safely(async (req, res) => {
    const resolved = await requireProject(req, res)
    if (!resolved) return
    const source = resolveChapterGenerationSource(resolved.project)
    res.json(chapterSourceView(resolved.activeWorkspace, resolved.project, source))
  }))

  app.post(`${chapterBase}/activate`, safely(async (req, res) => {
    const result = await mutateChapterSource({
      req,
      operation: 'activate-chapter-generation-source',
      mutate: current => {
        const target = req.body?.active
        if (target !== 'model' && target !== 'mcp') {
          throw new McpError('MCP_BINDING_INVALID', 'active 必须是 model 或 mcp')
        }
        if (target === 'model' && !current.model.model_id) {
          throw new ChapterGenerationSourceError('CHAPTER_MODEL_REQUIRED', '请选择有效的章节模型')
        }
        return { ...current, active: target }
      },
      beforePersist: async ({ activeWorkspace, project, source }) => (
        source.active === 'mcp'
          ? validateBinding({ activeWorkspace, project, binding: source.mcp!, signal: req.signal })
          : null
      ),
    })
    if (!result) return res.status(404).json({ error: 'project not found' })
    res.json(chapterSourceView(result.activeWorkspace, result.project, result.source))
  }))

  app.put(`${chapterBase}/model`, safely(async (req, res) => {
    const result = await mutateChapterSource({
      req,
      operation: 'update-chapter-generation-model',
      mutate: current => {
        const modelId = req.body?.model_id
        if (!Number.isSafeInteger(modelId) || modelId <= 0) {
          throw new ChapterGenerationSourceError('CHAPTER_MODEL_REQUIRED', '请选择有效的章节模型')
        }
        return { ...current, model: { model_id: modelId } }
      },
    })
    if (!result) return res.status(404).json({ error: 'project not found' })
    res.json(chapterSourceView(result.activeWorkspace, result.project, result.source))
  }))

  app.post(`${chapterBase}/mcp/test`, safely(async (req, res) => {
    const resolved = await requireProject(req, res)
    if (!resolved) return
    const current = resolveChapterGenerationSource(resolved.project)
    const candidate = normalizeChapterGenerationSource({
      ...current,
      active: 'mcp',
      mcp: req.body?.mcp,
    })
    const validation = await validateBinding({
      activeWorkspace: resolved.activeWorkspace,
      project: resolved.project,
      binding: candidate.mcp!,
      signal: req.signal,
    })
    res.json({ ok: true, validation: publicValidation(validation) })
  }))

  app.put(`${chapterBase}/mcp`, safely(async (req, res) => {
    const result = await mutateChapterSource({
      req,
      operation: 'update-chapter-generation-mcp',
      mutate: current => {
        const candidate = normalizeChapterGenerationSource({
          ...current,
          active: 'mcp',
          mcp: req.body?.mcp,
        })
        return { ...candidate, active: current.active }
      },
      beforePersist: ({ activeWorkspace, project, source }) => validateBinding({
        activeWorkspace,
        project,
        binding: source.mcp!,
        signal: req.signal,
      }),
    })
    if (!result) return res.status(404).json({ error: 'project not found' })
    res.json(chapterSourceView(result.activeWorkspace, result.project, result.source))
  }))

  app.get(legacyBase, safely(async (req, res) => {
    const resolved = await requireProject(req, res)
    if (!resolved) return
    res.json({ ok: true, source: toLegacyProseGenerationSource(resolveChapterGenerationSource(resolved.project)) })
  }))

  app.put(legacyBase, safely(async (req, res) => {
    let requestedLegacy: ReturnType<typeof normalizeProseGenerationSource> | undefined
    const result = await mutateChapterSource({
      req,
      operation: 'update-prose-generation-source',
      mutate: current => {
        requestedLegacy = normalizeProseGenerationSource(req.body?.source || req.body)
        return requestedLegacy.type === 'mcp'
          ? { ...current, active: 'mcp', mcp: requestedLegacy.mcp }
          : { ...current, active: 'model' }
      },
      beforePersist: async ({ activeWorkspace, project, current, source }) => {
        if (!requestedLegacy) throw new McpError('MCP_BINDING_INVALID', '正文生成来源配置缺失')
        await assertLegacyAgentLeasesAvailable(activeWorkspace, current, source)
        return requestedLegacy.type === 'mcp'
          ? validateBinding({ activeWorkspace, project, binding: source.mcp!, signal: req.signal })
          : null
      },
    })
    if (!result) return res.status(404).json({ error: 'project not found' })
    res.json({
      ok: true,
      source: toLegacyProseGenerationSource(result.source),
      project: result.project,
      ...(result.validation ? { validation: publicValidation(result.validation) } : {}),
    })
  }))

  app.post(`${legacyBase}/test`, safely(async (req, res) => {
    const resolved = await requireProject(req, res)
    if (!resolved) return
    const retained = resolveChapterGenerationSource(resolved.project).mcp
    const requestedSource = req.body?.source
    const source = requestedSource
      ? normalizeProseGenerationSource(requestedSource)
      : retained
        ? { version: 'prose_generation_source_v1' as const, type: 'mcp' as const, mcp: retained }
        : null
    if (!source || source.type !== 'mcp') {
      throw new McpError('MCP_BINDING_INVALID', '当前项目未保留 MCP 正文来源')
    }
    const validation = await validateBinding({
      activeWorkspace: resolved.activeWorkspace,
      project: resolved.project,
      binding: source.mcp,
      signal: req.signal,
    })
    res.json({ ok: true, ...publicValidation(validation) })
  }))

  app.get(`${legacyBase}/agents`, safely(async (req, res) => {
    const resolved = await requireProject(req, res)
    if (!resolved) return
    if (!ctx.mcpRuntime) throw new McpError('MCP_CAPABILITY_MISSING', '服务端未配置 MCP Runtime')
    const stored = resolveChapterGenerationSource(resolved.project).mcp
    const serverId = String(req.query?.server_id || stored?.server_id || '')
    const keyId = Number(req.query?.key_id || stored?.key_id || 0)
    if (!serverId || !keyId) throw new McpError('MCP_BINDING_INVALID', '请选择 MCP Server 和 Key')
    const selection = await validateMcpCredentialSelection(resolved.activeWorkspace, { serverId, keyId })
    const projectAgent = publicAgentProjector(selection)
    const agents = await ctx.mcpRuntime.listAgents(keyId, req.signal, {
      ...selection,
      activeWorkspace: resolved.activeWorkspace,
    })
    res.json({ agents: publicAgentList(agents, projectAgent) })
  }))

  app.post(`${legacyBase}/agents`, safely(async (req, res) => {
    const resolved = await requireProject(req, res)
    if (!resolved) return
    if (!ctx.mcpRuntime) throw new McpError('MCP_CAPABILITY_MISSING', '服务端未配置 MCP Runtime')
    const stored = resolveChapterGenerationSource(resolved.project).mcp
    const serverId = String(req.body?.server_id || stored?.server_id || '')
    const keyId = Number(req.body?.key_id || stored?.key_id || 0)
    if (!serverId || !keyId) throw new McpError('MCP_BINDING_INVALID', '请选择 MCP Server 和 Key')
    const selection = await validateMcpCredentialSelection(resolved.activeWorkspace, { serverId, keyId })
    const agent = await ctx.mcpRuntime.createAgent(keyId, {
      name: String(req.body?.name || 'MangaForge 小说正文 Agent'),
      ...(req.body?.space_id ? { spaceId: String(req.body.space_id) } : {}),
    }, req.signal, { ...selection, activeWorkspace: resolved.activeWorkspace })
    res.json({ ok: true, agent: publicAgentProjector(selection)(agent) })
  }))
}
