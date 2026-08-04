import apiClient from './client'

export type McpServerRecord = {
  id: string
  display_name: string
  transport: 'streamable_http' | 'stdio'
  url: string
  auth_type: 'bearer' | 'none'
  adapter_id: string
  is_active: boolean
  startup_timeout_ms: number
  tool_timeout_ms: number
  generation_timeout_ms: number
  poll_initial_ms: number
  poll_max_ms: number
  enabled_tools: string[]
  custom_headers: Array<{ name: string; configured: boolean }>
}

export type McpServerPayload = Partial<Omit<McpServerRecord, 'custom_headers'>> & {
  custom_headers?: Record<string, string>
  remove_custom_headers?: string[]
}

export type McpPublicKey = {
  id: number
  mcp_server_id: string
  description: string
  is_active: boolean
  priority: number
  success_count: number
  failure_count: number
  last_checked?: string
  last_used?: string
  avg_latency?: number
  masked_key: string
  has_key: boolean
  bound_projects?: Array<{ id: number; title?: string }>
}

export type McpAgentSummary = {
  id: string
  name: string
  description?: string
  status?: string
}

export type McpAgentQuarantine = {
  id: string
  server_id: string
  key_id: number
  agent_id: string
  session_id: string
  reason: 'send_unknown' | 'remote_cancel_unknown'
  created_at: string
}

export type McpQuarantineReconciliation = {
  quarantine: McpAgentQuarantine
  status: 'completed' | 'failed' | 'cancelled' | 'waiting_for_input' | 'pending' | 'in_progress' | 'unknown'
  terminal: boolean
  cleared: boolean
  outcome: 'nonterminal' | 'cleared' | 'conflict'
}

export type McpKeyPayload = {
  mcp_server_id?: string
  key?: string
  description?: string
  is_active?: boolean
  priority?: number
}

export type ProseGenerationSourceConfig =
  | { version: 'prose_generation_source_v1'; type: 'model' }
  | { version: 'prose_generation_source_v1'; type: 'mcp'; mcp: { server_id: string; key_id: number; adapter_id: string; agent_id: string; model?: string } }

export type ChapterGenerationSourceState = {
  version: 'chapter_generation_source_v1'
  active: 'model' | 'mcp'
  model: { model_id?: number }
  mcp?: {
    server_id: string
    key_id: number
    adapter_id: string
    agent_id: string
    model: string
  }
}

export type ChapterGenerationSourceView = {
  ok: true
  source: ChapterGenerationSourceState
  fingerprint: string
  locked: boolean
  display: {
    active: 'model' | 'mcp'
    model_id: number | null
    mcp: NonNullable<ChapterGenerationSourceState['mcp']> | null
  }
}

type ChapterMcpBinding = NonNullable<ChapterGenerationSourceState['mcp']>

const INVALID_CHAPTER_SOURCE_VIEW = '章节来源响应无效'
const CHAPTER_SOURCE_FINGERPRINT = /^sha256:[0-9a-f]{64}$/
const CHAPTER_MCP_FIELDS = ['server_id', 'key_id', 'adapter_id', 'agent_id', 'model'] as const
const chapterSourceProtocolFailures = new WeakSet<object>()

function chapterSourceProtocolFailure(message: string): never {
  const failure = new Error(message)
  chapterSourceProtocolFailures.add(failure)
  throw failure
}

function isProtocolRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasExactProtocolKeys(record: Record<string, unknown>, expected: readonly string[]) {
  const keys = Reflect.ownKeys(record)
  return keys.length === expected.length
    && keys.every(key => typeof key === 'string' && expected.includes(key))
    && expected.every(key => Object.prototype.hasOwnProperty.call(record, key))
}

function normalizeChapterMcpBinding(value: unknown): ChapterMcpBinding {
  if (!isProtocolRecord(value) || !hasExactProtocolKeys(value, CHAPTER_MCP_FIELDS)) {
    chapterSourceProtocolFailure('章节 MCP 绑定无效')
  }
  const serverId = value.server_id
  const keyId = value.key_id
  const adapterId = value.adapter_id
  const agentId = value.agent_id
  const model = value.model
  if (typeof serverId !== 'string' || !serverId.trim()
    || !Number.isSafeInteger(keyId) || Number(keyId) <= 0
    || typeof adapterId !== 'string' || !adapterId.trim()
    || typeof agentId !== 'string' || !agentId.trim()
    || typeof model !== 'string' || model.trim().length > 160) {
    chapterSourceProtocolFailure('章节 MCP 绑定无效')
  }
  return {
    server_id: serverId.trim(),
    key_id: Number(keyId),
    adapter_id: adapterId.trim(),
    agent_id: agentId.trim(),
    model: model.trim(),
  }
}

function chapterMcpBindingsEqual(left: ChapterMcpBinding, right: ChapterMcpBinding) {
  return CHAPTER_MCP_FIELDS.every(field => left[field] === right[field])
}

export function normalizeChapterSourceApiView(value: unknown): ChapterGenerationSourceView {
  try {
    if (!isProtocolRecord(value)
      || !hasExactProtocolKeys(value, ['ok', 'source', 'fingerprint', 'locked', 'display'])) {
      chapterSourceProtocolFailure(INVALID_CHAPTER_SOURCE_VIEW)
    }
    if (value.ok !== true || !isProtocolRecord(value.source)) {
      chapterSourceProtocolFailure(INVALID_CHAPTER_SOURCE_VIEW)
    }
    const source = value.source
    const sourceKeys = Object.prototype.hasOwnProperty.call(source, 'mcp')
      ? ['version', 'active', 'model', 'mcp']
      : ['version', 'active', 'model']
    if (!hasExactProtocolKeys(source, sourceKeys)) chapterSourceProtocolFailure(INVALID_CHAPTER_SOURCE_VIEW)
    if (source.version !== 'chapter_generation_source_v1') {
      chapterSourceProtocolFailure('章节来源响应版本无效')
    }
    if (source.active !== 'model' && source.active !== 'mcp') {
      chapterSourceProtocolFailure('章节来源活动状态无效')
    }
    if (!isProtocolRecord(source.model)) chapterSourceProtocolFailure('章节模型无效')
    const modelKeys = Object.prototype.hasOwnProperty.call(source.model, 'model_id') ? ['model_id'] : []
    if (!hasExactProtocolKeys(source.model, modelKeys)) chapterSourceProtocolFailure('章节模型无效')
    const modelId = source.model.model_id
    if (modelId !== undefined && (!Number.isSafeInteger(modelId) || Number(modelId) <= 0)) {
      chapterSourceProtocolFailure('章节模型无效')
    }

    const hasMcp = Object.prototype.hasOwnProperty.call(source, 'mcp')
    if (source.active === 'mcp' && !hasMcp) chapterSourceProtocolFailure('活动 MCP 绑定缺失')
    const mcp = hasMcp ? normalizeChapterMcpBinding(source.mcp) : undefined
    if (typeof value.fingerprint !== 'string') chapterSourceProtocolFailure('章节来源指纹无效')
    const fingerprint = value.fingerprint.trim()
    if (!CHAPTER_SOURCE_FINGERPRINT.test(fingerprint)) chapterSourceProtocolFailure('章节来源指纹无效')

    if (!isProtocolRecord(value.display)
      || !hasExactProtocolKeys(value.display, ['active', 'model_id', 'mcp'])) {
      chapterSourceProtocolFailure('章节来源展示无效')
    }
    const display = value.display
    if (display.active !== source.active
      || display.model_id !== (modelId === undefined ? null : modelId)) {
      chapterSourceProtocolFailure('章节来源展示无效')
    }
    if (!mcp && display.mcp !== null) chapterSourceProtocolFailure('章节来源展示无效')
    if (mcp) {
      let displayMcp: ChapterMcpBinding
      try {
        displayMcp = normalizeChapterMcpBinding(display.mcp)
      } catch {
        chapterSourceProtocolFailure('章节来源展示无效')
      }
      if (!chapterMcpBindingsEqual(mcp, displayMcp)) chapterSourceProtocolFailure('章节来源展示无效')
    }

    return {
      ok: true,
      source: {
        version: 'chapter_generation_source_v1',
        active: source.active,
        model: modelId === undefined ? {} : { model_id: Number(modelId) },
        ...(mcp ? { mcp: { ...mcp } } : {}),
      },
      fingerprint,
      locked: value.locked === true,
      display: {
        active: source.active,
        model_id: modelId === undefined ? null : Number(modelId),
        mcp: mcp ? { ...mcp } : null,
      },
    }
  } catch (error) {
    if (((typeof error === 'object' && error !== null) || typeof error === 'function')
      && chapterSourceProtocolFailures.has(error)) throw error
    chapterSourceProtocolFailure(INVALID_CHAPTER_SOURCE_VIEW)
  }
}

type ChapterSourceHttpFailureDetails = Readonly<{
  status: number
  code: string
  message: string
}>

const chapterSourceHttpFailures = new WeakMap<object, ChapterSourceHttpFailureDetails>()

function ownDataValue(value: unknown, field: string) {
  if (!isProtocolRecord(value)) return undefined
  try {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, field)
    return descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')
      ? descriptor.value
      : undefined
  } catch {
    return undefined
  }
}

function chapterSourceHttpFailure(status: number, data: unknown) {
  const rawCode = ownDataValue(data, 'error_code') ?? ownDataValue(data, 'code')
  const rawMessage = ownDataValue(data, 'error')
    ?? ownDataValue(data, 'detail')
    ?? ownDataValue(data, 'message')
  const details = Object.freeze({
    status,
    code: typeof rawCode === 'string' ? rawCode : '',
    message: typeof rawMessage === 'string' ? rawMessage : '',
  })
  const failure = new Error('章节来源操作失败')
  chapterSourceHttpFailures.set(failure, details)
  return failure
}

export function chapterSourceHttpFailureDetails(value: unknown) {
  return ((typeof value === 'object' && value !== null) || typeof value === 'function')
    ? chapterSourceHttpFailures.get(value) ?? null
    : null
}

const chapterSourceNoResponseFailures = new WeakSet<object>()
const chapterSourceTransportCauses = new WeakMap<object, unknown>()

function chapterSourceNoResponseFailure(cause: unknown) {
  const failure = new Error('章节来源请求未收到响应')
  chapterSourceNoResponseFailures.add(failure)
  chapterSourceTransportCauses.set(failure, cause)
  return failure
}

export function isChapterSourceNoResponseFailure(value: unknown) {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
    ? chapterSourceNoResponseFailures.has(value)
    : false
}

async function chapterSourceRequest<T>(
  request: () => PromiseLike<{ data: unknown; status?: unknown }>,
  project: (data: unknown) => T,
) {
  let response: { data: unknown; status?: unknown }
  try {
    response = await request()
  } catch (cause) {
    throw chapterSourceNoResponseFailure(cause)
  }
  const status = response.status
  const data = response.data
  if (typeof status === 'number' && (status < 200 || status >= 300)) {
    throw chapterSourceHttpFailure(status, data)
  }
  return project(data)
}

const acceptChapterSourceHttpStatus = { validateStatus: () => true }

function normalizeChapterMcpTestView(value: unknown) {
  try {
    if (!isProtocolRecord(value) || !hasExactProtocolKeys(value, ['ok', 'validation']) || value.ok !== true) {
      chapterSourceProtocolFailure('章节 MCP 测试响应无效')
    }
    const validation = value.validation
    if (!isProtocolRecord(validation)
      || !hasExactProtocolKeys(validation, ['server_id', 'key_id', 'agent'])) {
      chapterSourceProtocolFailure('章节 MCP 测试响应无效')
    }
    const agent = validation.agent
    if (!isProtocolRecord(agent)) chapterSourceProtocolFailure('章节 MCP 测试响应无效')
    const allowedAgentFields = ['id', 'name', 'description', 'status', 'spaceId']
    const agentKeys = Reflect.ownKeys(agent)
    if (agentKeys.some(key => typeof key !== 'string' || !allowedAgentFields.includes(key))
      || !Object.prototype.hasOwnProperty.call(agent, 'id')
      || !Object.prototype.hasOwnProperty.call(agent, 'name')
      || typeof agent.id !== 'string' || typeof agent.name !== 'string'
      || (agent.description !== undefined && typeof agent.description !== 'string')
      || (agent.status !== undefined && typeof agent.status !== 'string')
      || (agent.spaceId !== undefined && typeof agent.spaceId !== 'string')
      || typeof validation.server_id !== 'string' || !validation.server_id
      || !Number.isSafeInteger(validation.key_id) || Number(validation.key_id) <= 0) {
      chapterSourceProtocolFailure('章节 MCP 测试响应无效')
    }
    return {
      ok: true as const,
      validation: {
        server_id: validation.server_id,
        key_id: Number(validation.key_id),
        agent: {
          id: agent.id,
          name: agent.name,
          ...(agent.description === undefined ? {} : { description: agent.description }),
          ...(agent.status === undefined ? {} : { status: agent.status }),
          ...(agent.spaceId === undefined ? {} : { spaceId: agent.spaceId }),
        },
      },
    }
  } catch (error) {
    if (((typeof error === 'object' && error !== null) || typeof error === 'function')
      && chapterSourceProtocolFailures.has(error)) throw error
    chapterSourceProtocolFailure('章节 MCP 测试响应无效')
  }
}

export const chapterSourceApi = {
  get: (projectId: number, options: { signal?: AbortSignal } = {}) => chapterSourceRequest(
    () => apiClient.get<ChapterGenerationSourceView>(
      `/novel/projects/${projectId}/chapter-generation-source`,
      { ...acceptChapterSourceHttpStatus, ...options },
    ),
    normalizeChapterSourceApiView,
  ),
  activate: (projectId: number, active: 'model' | 'mcp') => chapterSourceRequest(
    () => apiClient.post<ChapterGenerationSourceView>(`/novel/projects/${projectId}/chapter-generation-source/activate`, { active }, acceptChapterSourceHttpStatus),
    normalizeChapterSourceApiView,
  ),
  saveModel: (projectId: number, modelId: number) => chapterSourceRequest(
    () => apiClient.put<ChapterGenerationSourceView>(`/novel/projects/${projectId}/chapter-generation-source/model`, { model_id: modelId }, acceptChapterSourceHttpStatus),
    normalizeChapterSourceApiView,
  ),
  testMcp: (projectId: number, mcp: ChapterMcpBinding) => chapterSourceRequest(
    () => apiClient.post(`/novel/projects/${projectId}/chapter-generation-source/mcp/test`, { mcp }, acceptChapterSourceHttpStatus),
    normalizeChapterMcpTestView,
  ),
  saveMcp: (projectId: number, mcp: ChapterMcpBinding) => chapterSourceRequest(
    () => apiClient.put<ChapterGenerationSourceView>(`/novel/projects/${projectId}/chapter-generation-source/mcp`, { mcp }, acceptChapterSourceHttpStatus),
    normalizeChapterSourceApiView,
  ),
}

export const mcpApi = {
  listQuarantines: () => apiClient.get<McpAgentQuarantine[]>('/mcp/quarantines'),
  reconcileQuarantine: (id: string) => apiClient.post<McpQuarantineReconciliation>(`/mcp/quarantines/${encodeURIComponent(id)}/reconcile`),
  forceClearQuarantine: (id: string) => apiClient.delete(`/mcp/quarantines/${encodeURIComponent(id)}`, { data: { acknowledge_remote_work_may_continue: true } }),
  listServers: () => apiClient.get<McpServerRecord[]>('/mcp/servers'),
  createServer: (data: McpServerPayload) => apiClient.post<{ ok: true; server: McpServerRecord }>('/mcp/servers', data),
  updateServer: (id: string, data: McpServerPayload) => apiClient.put<{ ok: true; server: McpServerRecord }>(`/mcp/servers/${encodeURIComponent(id)}`, data),
  deleteServer: (id: string) => apiClient.delete(`/mcp/servers/${encodeURIComponent(id)}`),
  listKeys: () => apiClient.get<McpPublicKey[]>('/mcp/keys'),
  createKey: (data: McpKeyPayload) => apiClient.post<{ ok: true; key: McpPublicKey }>('/mcp/keys', data),
  updateKey: (id: number, data: McpKeyPayload) => apiClient.put<{ ok: true; key: McpPublicKey }>(`/mcp/keys/${id}`, data),
  deleteKey: (id: number) => apiClient.delete(`/mcp/keys/${id}`),
  testKey: (id: number) => apiClient.post<{ ok: true; latency_ms: number; agent_count: number }>(`/mcp/keys/${id}/test`),
  listAgents: (id: number) => apiClient.get<{ agents: McpAgentSummary[] }>(`/mcp/keys/${id}/agents`),
  createAgent: (id: number, data: { name: string; space_id?: string }) => apiClient.post<{ ok: true; agent: McpAgentSummary }>(`/mcp/keys/${id}/agents`, data),
  diagnostics: (serverId: string, keyId: number) => apiClient.get<Record<string, any>>(`/mcp/servers/${encodeURIComponent(serverId)}/diagnostics`, { params: { key_id: keyId } }),
  getProjectSource: (projectId: number) => apiClient.get<{ ok: true; source: ProseGenerationSourceConfig }>(`/novel/projects/${projectId}/prose-generation-source`),
  saveProjectSource: (projectId: number, source: ProseGenerationSourceConfig) => apiClient.put(`/novel/projects/${projectId}/prose-generation-source`, { source }),
  testProjectSource: (projectId: number, source: ProseGenerationSourceConfig) => apiClient.post(`/novel/projects/${projectId}/prose-generation-source/test`, { source }),
  listProjectAgents: (projectId: number, serverId: string, keyId: number) => apiClient.get<{ agents: McpAgentSummary[] }>(`/novel/projects/${projectId}/prose-generation-source/agents`, { params: { server_id: serverId, key_id: keyId } }),
  createProjectAgent: (projectId: number, data: { server_id: string; key_id: number; name: string; space_id?: string }) => apiClient.post<{ ok: true; agent: McpAgentSummary }>(`/novel/projects/${projectId}/prose-generation-source/agents`, data),
}
