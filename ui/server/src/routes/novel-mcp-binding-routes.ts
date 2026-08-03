import type { Express } from 'express'
import { createHash } from 'node:crypto'
import { types } from 'node:util'
import { mutateNovelProjectReferenceConfig } from '../novel'
import { isMcpError, McpError, type McpErrorCode } from '../mcp/errors'
import type { McpRuntime } from '../mcp/runtime'
import { createMcpSecretScrubber } from '../mcp/secret-scrubber'
import type { McpKeyRecord, McpServerRecord } from '../mcp/types'
import { withMcpWorkspaceMutation } from '../mcp/workspace-coordinator'
import { canonicalFilesystemIdentity } from '../workspace-identity'
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
  type LocalMcpProjectBindingValidation,
  validateMcpCredentialSelection,
  validateMcpProjectBindingAgent,
  validateMcpProjectBindingLocally,
} from '../novel-writing-service/generation-source/source-config'

type NovelMcpBindingRoutesContext = {
  getWorkspace: () => string
  getProject: (workspace: string, id: number) => Promise<any>
  mcpRuntime?: McpRuntime
  chapterSourceLeases?: ChapterSourceLeaseRegistry
  mcpValidationTimeoutMs?: number
}

const DEFAULT_MCP_VALIDATION_TIMEOUT_MS = 30_000
const MAX_SOURCE_MUTATION_ATTEMPTS = 3
const projectMutationTails = new Map<string, Promise<void>>()

function remainingValidationBudget(deadline: number) {
  const remaining = Math.ceil(deadline - Date.now())
  if (remaining <= 0) throw new McpError('MCP_CONNECT_TIMEOUT', 'MCP 连接校验超时')
  return remaining
}

class RetryChapterSourceMutation extends Error {
  constructor() {
    super('chapter source changed during optimistic mutation')
    this.name = 'RetryChapterSourceMutation'
  }
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

function invalidExplicitBody() {
  return new McpError('MCP_BINDING_INVALID', '请求体必须使用自有数据字段')
}

function explicitBodyDataValue(body: unknown, key: string) {
  if (!body || typeof body !== 'object' || types.isProxy(body) || Array.isArray(body)) {
    throw invalidExplicitBody()
  }
  try {
    const descriptor = Object.getOwnPropertyDescriptor(body, key)
    if (!descriptor || !('value' in descriptor)) throw invalidExplicitBody()
    return descriptor.value
  } catch (error) {
    if (isMcpError(error)) throw error
    throw invalidExplicitBody()
  }
}

function explicitMcpBindingValue(body: unknown) {
  const value = explicitBodyDataValue(body, 'mcp')
  if (!value || typeof value !== 'object' || types.isProxy(value) || Array.isArray(value)) {
    throw invalidExplicitBody()
  }
  const snapshot: Record<string, unknown> = {}
  for (const field of ['server_id', 'key_id', 'adapter_id', 'agent_id', 'model']) {
    snapshot[field] = explicitBodyDataValue(value, field)
  }
  return snapshot
}

function opaqueFingerprint(value: unknown) {
  return `sha256:${createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex')}`
}

function completeChapterSourceFingerprint(source: ChapterGenerationSourceState) {
  const normalized = normalizeChapterGenerationSource(source)
  return opaqueFingerprint([
    normalized.version,
    normalized.active,
    normalized.model.model_id ?? null,
    normalized.mcp?.server_id ?? null,
    normalized.mcp?.key_id ?? null,
    normalized.mcp?.adapter_id ?? null,
    normalized.mcp?.agent_id ?? null,
    normalized.mcp?.model ?? null,
  ])
}

function projectRowFingerprint(project: any) {
  return opaqueFingerprint([
    Number(project?.id || 0),
    String(project?.created_at || ''),
    String(project?.updated_at || ''),
    String(project?.title || ''),
    String(project?.genre || ''),
    project?.sub_genres || [],
    String(project?.synopsis || ''),
    String(project?.length_target || ''),
    String(project?.target_audience || ''),
    project?.style_tags || [],
    project?.commercial_tags || [],
    String(project?.status || ''),
    project?.reference_config || {},
  ])
}

function stableProjectIdentityFingerprint(project: any) {
  const referenceConfig = { ...(project?.reference_config || {}) }
  delete referenceConfig.prose_generation_source
  delete referenceConfig.chapter_generation_source
  return opaqueFingerprint([
    Number(project?.id || 0),
    String(project?.created_at || ''),
    String(project?.title || ''),
    String(project?.genre || ''),
    project?.sub_genres || [],
    String(project?.synopsis || ''),
    String(project?.length_target || ''),
    String(project?.target_audience || ''),
    project?.style_tags || [],
    project?.commercial_tags || [],
    String(project?.status || ''),
    referenceConfig,
  ])
}

function credentialSelectionFingerprint(selection: LocalMcpProjectBindingValidation) {
  const { server, key } = selection
  return opaqueFingerprint([
    server.id,
    server.display_name,
    server.transport,
    server.url,
    server.auth_type,
    server.adapter_id,
    server.is_active,
    server.startup_timeout_ms,
    server.tool_timeout_ms,
    server.generation_timeout_ms,
    server.poll_initial_ms,
    server.poll_max_ms,
    server.enabled_tools,
    Object.entries(server.custom_headers || {}).sort(([left], [right]) => left.localeCompare(right)),
    key.id,
    key.mcp_server_id,
    key.key,
    key.description,
    key.is_active,
    key.priority,
    key.success_count,
    key.failure_count,
    key.last_checked ?? null,
    key.last_used ?? null,
    key.avg_latency ?? null,
  ])
}

function generationSourceChanged(reason: 'workspace_identity_changed' | 'project_changed' | 'source_changed' | 'credential_changed') {
  return new ChapterGenerationSourceError(
    'GENERATION_SOURCE_CHANGED',
    '章节来源状态已变化，请重试',
    { reason },
  )
}

type RequestLifecycle = ReturnType<typeof createRequestLifecycle>

function createRequestLifecycle(req: any, res: any) {
  const controller = new AbortController()
  let responseFinished = false
  const cancel = () => {
    if (!controller.signal.aborted) {
      controller.abort(new McpError('MCP_CANCELLED', 'MCP 请求已取消'))
    }
  }
  const onRequestAborted = () => cancel()
  const onRequestClose = () => {
    if (req.aborted === true || (req.complete === false && req.readableEnded !== true)) cancel()
  }
  const onResponseFinish = () => { responseFinished = true }
  const onResponseClose = () => {
    if (!responseFinished && res.finished !== true && res.writableEnded !== true) cancel()
  }
  const upstreamSignal = req.signal as AbortSignal | undefined
  const onUpstreamAbort = () => cancel()
  req.on?.('aborted', onRequestAborted)
  req.on?.('close', onRequestClose)
  res.on?.('finish', onResponseFinish)
  res.on?.('close', onResponseClose)
  upstreamSignal?.addEventListener?.('abort', onUpstreamAbort, { once: true })
  if (upstreamSignal?.aborted || req.aborted === true) cancel()

  const throwIfAborted = () => {
    if (controller.signal.aborted) throw controller.signal.reason
  }
  const waitForUntil = async <T>(operation: Promise<T>, deadline?: number) => {
    void operation.catch(() => {})
    throwIfAborted()
    let onAbort: (() => void) | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    const interrupted = new Promise<never>((_, reject) => {
      onAbort = () => reject(controller.signal.reason)
      controller.signal.addEventListener('abort', onAbort, { once: true })
      if (deadline !== undefined) {
        timer = setTimeout(() => {
          reject(new McpError('MCP_CONNECT_TIMEOUT', 'MCP 连接校验超时'))
        }, remainingValidationBudget(deadline))
      }
    })
    try {
      return await Promise.race([operation, interrupted])
    } finally {
      if (timer) clearTimeout(timer)
      if (onAbort) controller.signal.removeEventListener('abort', onAbort)
    }
  }
  const runRemote = async <T>(timeoutMs: number, operation: (signal: AbortSignal) => Promise<T>) => {
    throwIfAborted()
    const remoteController = new AbortController()
    const relayRequestAbort = () => remoteController.abort(controller.signal.reason)
    controller.signal.addEventListener('abort', relayRequestAbort, { once: true })
    const timer = setTimeout(() => {
      remoteController.abort(new McpError('MCP_CONNECT_TIMEOUT', 'MCP 连接校验超时'))
    }, timeoutMs)
    let rejectAbort: (() => void) | undefined
    const aborted = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(remoteController.signal.reason)
      remoteController.signal.addEventListener('abort', rejectAbort, { once: true })
    })
    try {
      return await Promise.race([operation(remoteController.signal), aborted])
    } finally {
      clearTimeout(timer)
      controller.signal.removeEventListener('abort', relayRequestAbort)
      if (rejectAbort) remoteController.signal.removeEventListener('abort', rejectAbort)
    }
  }
  const cleanup = () => {
    req.off?.('aborted', onRequestAborted)
    req.off?.('close', onRequestClose)
    res.off?.('finish', onResponseFinish)
    res.off?.('close', onResponseClose)
    upstreamSignal?.removeEventListener?.('abort', onUpstreamAbort)
  }
  return { signal: controller.signal, throwIfAborted, waitForUntil, runRemote, cleanup }
}

async function withProjectMutationQueue<T>(
  key: string,
  lifecycle: RequestLifecycle,
  validationDeadline: number,
  operation: () => Promise<T>,
) {
  const previous = projectMutationTails.get(key) || Promise.resolve()
  let releaseOperation!: () => void
  const operationFinished = new Promise<void>(resolve => { releaseOperation = resolve })
  const current = previous.catch(() => {}).then(() => operationFinished)
  projectMutationTails.set(key, current)
  void current.then(() => {
    if (projectMutationTails.get(key) === current) projectMutationTails.delete(key)
  })
  try {
    await lifecycle.waitForUntil(previous, validationDeadline)
    lifecycle.throwIfAborted()
    remainingValidationBudget(validationDeadline)
    return await operation()
  } finally {
    releaseOperation()
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

async function validatePinnedMcpProjectBindingAgent(
  ctx: NovelMcpBindingRoutesContext,
  activeWorkspace: string,
  local: LocalMcpProjectBindingValidation,
  lifecycle: RequestLifecycle,
  timeoutMs: number,
) {
  const mcpRuntime = ctx.mcpRuntime
  if (!mcpRuntime) {
    throw new McpError('MCP_CAPABILITY_MISSING', '服务端未配置 MCP Runtime')
  }
  return lifecycle.runRemote(timeoutMs, signal => validateMcpProjectBindingAgent(local, {
    runtime: {
      listAgents: (keyId, options) => mcpRuntime.listAgents(keyId, options, {
        server: local.server,
        key: local.key,
        activeWorkspace,
      }),
    },
    signal,
    timeoutMs,
  }))
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

const MCP_BINDING_ERROR_STATUSES = {
  MCP_BINDING_INVALID: 400,
  MCP_BINDING_CHANGED: 409,
  MCP_REFERENCED_RECORD_CONFLICT: 409,
  MCP_AUTH_FAILED: 401,
  MCP_CONNECT_TIMEOUT: 504,
  MCP_CONNECTION_LOST: 503,
  MCP_CAPABILITY_MISSING: 422,
  MCP_TOOL_ERROR: 502,
  MCP_DRIVE_SYNC_FAILED: 502,
  MCP_INPUT_TOO_LARGE: 413,
  MCP_AGENT_BUSY: 409,
  MCP_AGENT_QUARANTINED: 409,
  MCP_QUARANTINE_ACK_REQUIRED: 400,
  MCP_SEND_UNKNOWN: 502,
  MCP_SESSION_FAILED: 502,
  MCP_INPUT_REQUIRED: 422,
  MCP_GENERATION_TIMEOUT: 504,
  MCP_CANCELLED: 499,
  MCP_EMPTY_PROSE: 502,
  MCP_STORE_CORRUPT: 500,
  MCP_STORE_IO_FAILED: 500,
  MCP_RUNTIME_ERROR: 503,
} satisfies Record<McpErrorCode, number>

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
      : MCP_BINDING_ERROR_STATUSES[error.code] ?? 500
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
  const safely = (handler: (req: any, res: any, lifecycle: RequestLifecycle) => Promise<any>) => async (req: any, res: any) => {
    const lifecycle = createRequestLifecycle(req, res)
    try {
      await handler(req, res, lifecycle)
    } catch (error) {
      const failure = bindingError(error)
      res.status(failure.status).json(failure.body)
    } finally {
      lifecycle.cleanup()
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
  const publicValidation = (validation: Awaited<ReturnType<typeof validatePinnedMcpProjectBindingAgent>>) => ({
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

  const captureWorkspace = () => {
    const lexical = ctx.getWorkspace()
    return { lexical, canonical: canonicalFilesystemIdentity(lexical) }
  }
  const withCheckedWorkspace = async <T>(
    workspace: ReturnType<typeof captureWorkspace>,
    lifecycle: RequestLifecycle,
    validationDeadline: number,
    operation: (activeWorkspace: string) => Promise<T>,
  ) => {
    lifecycle.throwIfAborted()
    remainingValidationBudget(validationDeadline)
    if (canonicalFilesystemIdentity(workspace.lexical) !== workspace.canonical) {
      throw generationSourceChanged('workspace_identity_changed')
    }
    lifecycle.throwIfAborted()
    remainingValidationBudget(validationDeadline)
    const coordinated = withMcpWorkspaceMutation(workspace.canonical, async () => {
      lifecycle.throwIfAborted()
      remainingValidationBudget(validationDeadline)
      if (canonicalFilesystemIdentity(workspace.lexical) !== workspace.canonical) {
        throw generationSourceChanged('workspace_identity_changed')
      }
      const result = await operation(workspace.canonical)
      lifecycle.throwIfAborted()
      remainingValidationBudget(validationDeadline)
      return result
    })
    return lifecycle.waitForUntil(coordinated, validationDeadline)
  }
  const configuredValidationTimeout = Number(ctx.mcpValidationTimeoutMs ?? DEFAULT_MCP_VALIDATION_TIMEOUT_MS)
  const validationTimeoutMs = Number.isFinite(configuredValidationTimeout) && configuredValidationTimeout > 0
    ? Math.min(configuredValidationTimeout, DEFAULT_MCP_VALIDATION_TIMEOUT_MS)
    : DEFAULT_MCP_VALIDATION_TIMEOUT_MS
  const assertStableProjectIdentity = (project: any, snapshot: {
    projectId: number
    stableProjectFingerprint: string
  }) => {
    if (Number(project?.id) !== snapshot.projectId
      || !String(project?.created_at || '')
      || stableProjectIdentityFingerprint(project) !== snapshot.stableProjectFingerprint) {
      throw generationSourceChanged('project_changed')
    }
  }
  const assertExactProjectSnapshot = (project: any, snapshot: {
    projectId: number
    stableProjectFingerprint: string
    projectFingerprint: string
    sourceFingerprint: string
  }) => {
    assertStableProjectIdentity(project, snapshot)
    if (completeChapterSourceFingerprint(resolveChapterGenerationSource(project)) !== snapshot.sourceFingerprint) {
      throw new RetryChapterSourceMutation()
    }
    if (projectRowFingerprint(project) !== snapshot.projectFingerprint) {
      throw generationSourceChanged('project_changed')
    }
  }
  const assertChapterSourceLeaseAvailable = (activeWorkspace: string, projectId: number) => {
    if (chapterSourceLeases.isActive(activeWorkspace, projectId)) {
      throw new ChapterGenerationSourceError(
        'GENERATION_SOURCE_BUSY',
        '当前章节任务正在运行，结束后可切换来源',
        { project_id: projectId },
      )
    }
  }

  type MutationValidation = Awaited<ReturnType<typeof validatePinnedMcpProjectBindingAgent>> | null
  const mutateChapterSource = async (input: {
    req: any
    lifecycle: RequestLifecycle
    operation: string
    mutate: (current: ChapterGenerationSourceState) => ChapterGenerationSourceState
    bindingForValidation?: (input: {
      current: ChapterGenerationSourceState
      source: ChapterGenerationSourceState
    }) => McpProjectBinding | null
    assertLocal?: (input: {
      activeWorkspace: string
      project: any
      current: ChapterGenerationSourceState
      source: ChapterGenerationSourceState
    }) => Promise<void>
  }) => {
    const validationDeadline = Date.now() + validationTimeoutMs
    const workspace = captureWorkspace()
    const projectId = projectIdFromRequest(input.req)
    return withProjectMutationQueue(
      `${workspace.canonical}\u0000${projectId}`,
      input.lifecycle,
      validationDeadline,
      async () => {
        for (let attempt = 1; attempt <= MAX_SOURCE_MUTATION_ATTEMPTS; attempt += 1) {
          try {
            const phaseOne = await withCheckedWorkspace(workspace, input.lifecycle, validationDeadline, async activeWorkspace => {
              const project = await ctx.getProject(activeWorkspace, projectId)
              input.lifecycle.throwIfAborted()
              remainingValidationBudget(validationDeadline)
              if (!project) return null
              if (Number(project.id) !== projectId || !String(project.created_at || '')) {
                throw generationSourceChanged('project_changed')
              }
              assertChapterSourceLeaseAvailable(activeWorkspace, project.id)
              const current = resolveChapterGenerationSource(project)
              const source = normalizeChapterGenerationSource(input.mutate(current))
              await input.assertLocal?.({ activeWorkspace, project, current, source })
              input.lifecycle.throwIfAborted()
              remainingValidationBudget(validationDeadline)
              const binding = input.bindingForValidation?.({ current, source }) || null
              if (binding && !ctx.mcpRuntime) {
                throw new McpError('MCP_CAPABILITY_MISSING', '服务端未配置 MCP Runtime')
              }
              const localValidation = binding
                ? await validateMcpProjectBindingLocally(activeWorkspace, project, binding)
                : null
              input.lifecycle.throwIfAborted()
              remainingValidationBudget(validationDeadline)
              return {
                activeWorkspace,
                projectId,
                stableProjectFingerprint: stableProjectIdentityFingerprint(project),
                projectFingerprint: projectRowFingerprint(project),
                sourceFingerprint: completeChapterSourceFingerprint(current),
                source,
                localValidation,
                credentialFingerprint: localValidation ? credentialSelectionFingerprint(localValidation) : null,
              }
            })
            if (!phaseOne) return null
            input.lifecycle.throwIfAborted()
            const validation: MutationValidation = phaseOne.localValidation
              ? await validatePinnedMcpProjectBindingAgent(
                  ctx,
                  phaseOne.activeWorkspace,
                  phaseOne.localValidation,
                  input.lifecycle,
                  remainingValidationBudget(validationDeadline),
                )
              : null
            input.lifecycle.throwIfAborted()

            return await withCheckedWorkspace(workspace, input.lifecycle, validationDeadline, async activeWorkspace => {
              const project = await ctx.getProject(activeWorkspace, projectId)
              input.lifecycle.throwIfAborted()
              remainingValidationBudget(validationDeadline)
              if (!project) return null
              assertStableProjectIdentity(project, phaseOne)
              assertChapterSourceLeaseAvailable(activeWorkspace, project.id)
              const current = resolveChapterGenerationSource(project)
              await input.assertLocal?.({ activeWorkspace, project, current, source: phaseOne.source })
              input.lifecycle.throwIfAborted()
              remainingValidationBudget(validationDeadline)
              const binding = phaseOne.localValidation?.binding || null
              const localValidation = binding
                ? await validateMcpProjectBindingLocally(activeWorkspace, project, binding)
                : null
              input.lifecycle.throwIfAborted()
              remainingValidationBudget(validationDeadline)
              if ((localValidation ? credentialSelectionFingerprint(localValidation) : null)
                !== phaseOne.credentialFingerprint) {
                throw generationSourceChanged('credential_changed')
              }
              assertExactProjectSnapshot(project, phaseOne)
              input.lifecycle.throwIfAborted()
              remainingValidationBudget(validationDeadline)
              const mutation = await mutateNovelProjectReferenceConfig(activeWorkspace, {
                projectId: project.id,
                operation: input.operation,
                signal: input.lifecycle.signal,
                assertCurrentProject: currentProject => {
                  input.lifecycle.throwIfAborted()
                  remainingValidationBudget(validationDeadline)
                  assertExactProjectSnapshot(currentProject, phaseOne)
                  assertChapterSourceLeaseAvailable(activeWorkspace, currentProject.id)
                },
                mutate: referenceConfig => ({
                  referenceConfig: { ...referenceConfig, chapter_generation_source: phaseOne.source },
                  result: phaseOne.source,
                }),
              })
              input.lifecycle.throwIfAborted()
              remainingValidationBudget(validationDeadline)
              if (!mutation) return null
              return {
                activeWorkspace,
                project: mutation.project,
                source: mutation.result,
                validation,
              }
            })
          } catch (error) {
            if (!(error instanceof RetryChapterSourceMutation)) throw error
            if (attempt === MAX_SOURCE_MUTATION_ATTEMPTS) {
              throw generationSourceChanged('source_changed')
            }
          }
        }
        throw generationSourceChanged('source_changed')
      }
    )
  }

  const validateBindingReadOnly = async (input: {
    req: any
    lifecycle: RequestLifecycle
    bindingForProject: (project: any) => McpProjectBinding
  }) => {
    const validationDeadline = Date.now() + validationTimeoutMs
    const workspace = captureWorkspace()
    const projectId = projectIdFromRequest(input.req)
    const local = await withCheckedWorkspace(workspace, input.lifecycle, validationDeadline, async activeWorkspace => {
      const project = await ctx.getProject(activeWorkspace, projectId)
      input.lifecycle.throwIfAborted()
      remainingValidationBudget(validationDeadline)
      if (!project) return null
      const binding = input.bindingForProject(project)
      if (!ctx.mcpRuntime) {
        throw new McpError('MCP_CAPABILITY_MISSING', '服务端未配置 MCP Runtime')
      }
      const validation = await validateMcpProjectBindingLocally(activeWorkspace, project, binding)
      input.lifecycle.throwIfAborted()
      remainingValidationBudget(validationDeadline)
      return { activeWorkspace, project, validation }
    })
    if (!local) return null
    input.lifecycle.throwIfAborted()
    const validation = await validatePinnedMcpProjectBindingAgent(
      ctx,
      local.activeWorkspace,
      local.validation,
      input.lifecycle,
      remainingValidationBudget(validationDeadline),
    )
    input.lifecycle.throwIfAborted()
    return { ...local, validation }
  }

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

  app.post(`${chapterBase}/activate`, safely(async (req, res, lifecycle) => {
    const target = explicitBodyDataValue(req.body, 'active')
    const result = await mutateChapterSource({
      req,
      lifecycle,
      operation: 'activate-chapter-generation-source',
      mutate: current => {
        if (target !== 'model' && target !== 'mcp') {
          throw new McpError('MCP_BINDING_INVALID', 'active 必须是 model 或 mcp')
        }
        if (target === 'model' && !current.model.model_id) {
          throw new ChapterGenerationSourceError('CHAPTER_MODEL_REQUIRED', '请选择有效的章节模型')
        }
        return { ...current, active: target }
      },
      bindingForValidation: ({ source }) => source.active === 'mcp' ? source.mcp! : null,
    })
    if (!result) return res.status(404).json({ error: 'project not found' })
    res.json(chapterSourceView(result.activeWorkspace, result.project, result.source))
  }))

  app.put(`${chapterBase}/model`, safely(async (req, res, lifecycle) => {
    const modelId = explicitBodyDataValue(req.body, 'model_id')
    const result = await mutateChapterSource({
      req,
      lifecycle,
      operation: 'update-chapter-generation-model',
      mutate: current => {
        if (!Number.isSafeInteger(modelId) || modelId <= 0) {
          throw new ChapterGenerationSourceError('CHAPTER_MODEL_REQUIRED', '请选择有效的章节模型')
        }
        return { ...current, model: { model_id: modelId } }
      },
    })
    if (!result) return res.status(404).json({ error: 'project not found' })
    res.json(chapterSourceView(result.activeWorkspace, result.project, result.source))
  }))

  app.post(`${chapterBase}/mcp/test`, safely(async (req, res, lifecycle) => {
    const requestedMcp = explicitMcpBindingValue(req.body)
    const resolved = await validateBindingReadOnly({
      req,
      lifecycle,
      bindingForProject: project => {
        const current = resolveChapterGenerationSource(project)
        return normalizeChapterGenerationSource({
          ...current,
          active: 'mcp',
          mcp: requestedMcp,
        }).mcp!
      },
    })
    if (!resolved) return res.status(404).json({ error: 'project not found' })
    res.json({ ok: true, validation: publicValidation(resolved.validation) })
  }))

  app.put(`${chapterBase}/mcp`, safely(async (req, res, lifecycle) => {
    const requestedMcp = explicitMcpBindingValue(req.body)
    const result = await mutateChapterSource({
      req,
      lifecycle,
      operation: 'update-chapter-generation-mcp',
      mutate: current => {
        const candidate = normalizeChapterGenerationSource({
          ...current,
          active: 'mcp',
          mcp: requestedMcp,
        })
        return { ...candidate, active: current.active }
      },
      bindingForValidation: ({ source }) => source.mcp!,
    })
    if (!result) return res.status(404).json({ error: 'project not found' })
    res.json(chapterSourceView(result.activeWorkspace, result.project, result.source))
  }))

  app.get(legacyBase, safely(async (req, res) => {
    const resolved = await requireProject(req, res)
    if (!resolved) return
    res.json({ ok: true, source: toLegacyProseGenerationSource(resolveChapterGenerationSource(resolved.project)) })
  }))

  app.put(legacyBase, safely(async (req, res, lifecycle) => {
    const requestedLegacy = normalizeProseGenerationSource(req.body?.source || req.body)
    const result = await mutateChapterSource({
      req,
      lifecycle,
      operation: 'update-prose-generation-source',
      mutate: current => requestedLegacy.type === 'mcp'
        ? { ...current, active: 'mcp', mcp: requestedLegacy.mcp }
        : { ...current, active: 'model' },
      bindingForValidation: ({ source }) => requestedLegacy.type === 'mcp' ? source.mcp! : null,
      assertLocal: ({ activeWorkspace, current, source }) => (
        assertLegacyAgentLeasesAvailable(activeWorkspace, current, source)
      ),
    })
    if (!result) return res.status(404).json({ error: 'project not found' })
    res.json({
      ok: true,
      source: toLegacyProseGenerationSource(result.source),
      project: result.project,
      ...(result.validation ? { validation: publicValidation(result.validation) } : {}),
    })
  }))

  app.post(`${legacyBase}/test`, safely(async (req, res, lifecycle) => {
    const requestedSource = req.body?.source
    const requested = requestedSource ? normalizeProseGenerationSource(requestedSource) : null
    const resolved = await validateBindingReadOnly({
      req,
      lifecycle,
      bindingForProject: project => {
        const retained = resolveChapterGenerationSource(project).mcp
        const source = requested || (retained
          ? { version: 'prose_generation_source_v1' as const, type: 'mcp' as const, mcp: retained }
          : null)
        if (!source || source.type !== 'mcp') {
          throw new McpError('MCP_BINDING_INVALID', '当前项目未保留 MCP 正文来源')
        }
        return source.mcp
      },
    })
    if (!resolved) return res.status(404).json({ error: 'project not found' })
    res.json({ ok: true, ...publicValidation(resolved.validation) })
  }))

  app.get(`${legacyBase}/agents`, safely(async (req, res, lifecycle) => {
    const resolved = await requireProject(req, res)
    if (!resolved) return
    if (!ctx.mcpRuntime) throw new McpError('MCP_CAPABILITY_MISSING', '服务端未配置 MCP Runtime')
    const stored = resolveChapterGenerationSource(resolved.project).mcp
    const serverId = String(req.query?.server_id || stored?.server_id || '')
    const keyId = Number(req.query?.key_id || stored?.key_id || 0)
    if (!serverId || !keyId) throw new McpError('MCP_BINDING_INVALID', '请选择 MCP Server 和 Key')
    const selection = await validateMcpCredentialSelection(resolved.activeWorkspace, { serverId, keyId })
    const projectAgent = publicAgentProjector(selection)
    const agents = await ctx.mcpRuntime.listAgents(keyId, lifecycle.signal, {
      ...selection,
      activeWorkspace: resolved.activeWorkspace,
    })
    res.json({ agents: publicAgentList(agents, projectAgent) })
  }))

  app.post(`${legacyBase}/agents`, safely(async (req, res, lifecycle) => {
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
    }, lifecycle.signal, { ...selection, activeWorkspace: resolved.activeWorkspace })
    res.json({ ok: true, agent: publicAgentProjector(selection)(agent) })
  }))
}
