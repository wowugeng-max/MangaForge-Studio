import { createHash } from 'crypto'
import { types as utilTypes } from 'node:util'
import { McpError } from '../../mcp/errors'
import { readMcpKeys } from '../../mcp/key-store'
import type { McpRuntime } from '../../mcp/runtime'
import { readMcpServers } from '../../mcp/server-store'
import { hasMcpAdapter } from '../../mcp/adapters/registry'
import type { McpKeyRecord, McpServerRecord } from '../../mcp/types'
import { listNovelProjects } from '../../novel'

const SOURCE_VERSION = 'prose_generation_source_v1' as const
export const CHAPTER_GENERATION_SOURCE_VERSION = 'chapter_generation_source_v1' as const

export type ModelProseGenerationSourceConfig = {
  version: typeof SOURCE_VERSION
  type: 'model'
}

export type McpProjectBinding = {
  server_id: string
  key_id: number
  adapter_id: string
  agent_id: string
  model: string
}

export type McpProseGenerationSourceConfig = {
  version: typeof SOURCE_VERSION
  type: 'mcp'
  mcp: McpProjectBinding
}

export type ProseGenerationSourceConfig = ModelProseGenerationSourceConfig | McpProseGenerationSourceConfig

export type ChapterGenerationSourceState = {
  version: typeof CHAPTER_GENERATION_SOURCE_VERSION
  active: 'model' | 'mcp'
  model: {
    model_id?: number
  }
  mcp?: McpProjectBinding
}

export const MODEL_PROSE_GENERATION_SOURCE: ModelProseGenerationSourceConfig = Object.freeze({
  version: SOURCE_VERSION,
  type: 'model',
})

function unsafeGenerationSourceMutationInput() {
  return new McpError(
    'MCP_BINDING_INVALID',
    '无法安全检查通用项目写入中的章节来源字段',
    { reason: 'unsafe_generic_mutation_input' },
  )
}

export function assertNoGenerationSourceMutation(referenceConfig: unknown) {
  if (!referenceConfig || typeof referenceConfig !== 'object') return
  if (utilTypes.isProxy(referenceConfig)) throw unsafeGenerationSourceMutationInput()
  try {
    if (Array.isArray(referenceConfig)) return
    for (const field of ['prose_generation_source', 'chapter_generation_source']) {
      if (!Object.prototype.hasOwnProperty.call(referenceConfig, field)) continue
      throw new McpError(
        'MCP_BINDING_INVALID',
        `${field} 只能通过专用章节来源接口修改`,
        { reason: 'dedicated_binding_route_required', field },
      )
    }
  } catch (error) {
    if (error instanceof McpError) throw error
    throw unsafeGenerationSourceMutationInput()
  }
}

export function normalizeMcpProjectBinding(value: any): McpProjectBinding {
  const model = String(value?.model ?? '').trim()
  if (model.length > 160) {
    throw new McpError('MCP_BINDING_INVALID', 'MCP model 最多 160 个字符')
  }
  const binding = {
    server_id: String(value?.server_id ?? value?.serverId ?? '').trim(),
    key_id: Number(value?.key_id ?? value?.keyId ?? 0),
    adapter_id: String(value?.adapter_id ?? value?.adapterId ?? '').trim(),
    agent_id: String(value?.agent_id ?? value?.agentId ?? '').trim(),
    model,
  }
  const missing = Object.entries({
    server_id: binding.server_id,
    key_id: binding.key_id,
    adapter_id: binding.adapter_id,
    agent_id: binding.agent_id,
  })
    .filter(([, item]) => !item)
    .map(([key]) => key)
  if (missing.length) {
    throw new McpError('MCP_BINDING_INVALID', `MCP 项目绑定不完整：缺少 ${missing.join(', ')}`, {
      missing_fields: missing,
    })
  }
  if (!Number.isInteger(binding.key_id) || binding.key_id <= 0) {
    throw new McpError('MCP_BINDING_INVALID', 'MCP key_id 必须是正整数')
  }
  return binding
}

export function normalizeProseGenerationSource(value: unknown): ProseGenerationSourceConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new McpError('MCP_BINDING_INVALID', '正文生成来源配置必须是对象')
  }
  const record = value as Record<string, unknown>
  if (record.version !== SOURCE_VERSION) {
    throw new McpError('MCP_BINDING_INVALID', '正文生成来源版本缺失或不受支持')
  }
  if (record.type === 'model') return { ...MODEL_PROSE_GENERATION_SOURCE }
  if (record.type !== 'mcp') {
    throw new McpError('MCP_BINDING_INVALID', '正文生成来源类型缺失或不受支持')
  }
  return {
    version: SOURCE_VERSION,
    type: 'mcp',
    mcp: normalizeMcpProjectBinding(record.mcp),
  }
}

export function resolveProseGenerationSource(project: any): ProseGenerationSourceConfig {
  const config = project?.reference_config
  if (!config || !Object.prototype.hasOwnProperty.call(config, 'prose_generation_source')) {
    return { ...MODEL_PROSE_GENERATION_SOURCE }
  }
  return normalizeProseGenerationSource(config.prose_generation_source)
}

export function proseGenerationSourceFingerprint(source: ProseGenerationSourceConfig) {
  const normalized = normalizeProseGenerationSource(source)
  const identity = normalized.type === 'model'
    ? [normalized.version, normalized.type]
    : [
        normalized.version,
        normalized.type,
        normalized.mcp.server_id,
        normalized.mcp.key_id,
        normalized.mcp.adapter_id,
        normalized.mcp.agent_id,
        normalized.mcp.model,
      ]
  return `sha256:${createHash('sha256').update(JSON.stringify(identity), 'utf8').digest('hex')}`
}

function ownChapterField(record: Record<string, unknown>, field: string, message: string) {
  if (!Object.prototype.hasOwnProperty.call(record, field)) {
    throw new McpError('MCP_BINDING_INVALID', message)
  }
  return record[field]
}

function normalizeStrictChapterMcpBinding(value: unknown): McpProjectBinding {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new McpError('MCP_BINDING_INVALID', '章节生成 MCP 绑定必须是对象')
  }
  const record = value as Record<string, unknown>
  const rawServerId = ownChapterField(record, 'server_id', '章节生成 MCP 绑定缺少 server_id')
  const rawKeyId = ownChapterField(record, 'key_id', '章节生成 MCP 绑定缺少 key_id')
  const rawAdapterId = ownChapterField(record, 'adapter_id', '章节生成 MCP 绑定缺少 adapter_id')
  const rawAgentId = ownChapterField(record, 'agent_id', '章节生成 MCP 绑定缺少 agent_id')
  const rawModel = ownChapterField(record, 'model', '章节生成 MCP 绑定缺少 model')

  if (typeof rawServerId !== 'string'
    || typeof rawAdapterId !== 'string'
    || typeof rawAgentId !== 'string'
    || typeof rawModel !== 'string') {
    throw new McpError('MCP_BINDING_INVALID', '章节生成 MCP 文本字段必须是字符串')
  }
  if (!Number.isSafeInteger(rawKeyId) || Number(rawKeyId) <= 0) {
    throw new McpError('MCP_BINDING_INVALID', '章节生成 MCP key_id 必须是正安全整数')
  }

  const binding = {
    server_id: rawServerId.trim(),
    key_id: Number(rawKeyId),
    adapter_id: rawAdapterId.trim(),
    agent_id: rawAgentId.trim(),
    model: rawModel.trim(),
  }
  const missing = Object.entries({
    server_id: binding.server_id,
    adapter_id: binding.adapter_id,
    agent_id: binding.agent_id,
  })
    .filter(([, item]) => !item)
    .map(([key]) => key)
  if (missing.length) {
    throw new McpError('MCP_BINDING_INVALID', `章节生成 MCP 绑定不完整：缺少 ${missing.join(', ')}`, {
      missing_fields: missing,
    })
  }
  if (binding.model.length > 160) {
    throw new McpError('MCP_BINDING_INVALID', 'MCP model 最多 160 个字符')
  }
  return binding
}

function normalizeChapterGenerationSourceUnchecked(value: unknown): ChapterGenerationSourceState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new McpError('MCP_BINDING_INVALID', '章节生成来源配置必须是对象')
  }
  const record = value as Record<string, unknown>
  const version = ownChapterField(record, 'version', '章节生成来源版本缺失或不受支持')
  const active = ownChapterField(record, 'active', '章节生成活动来源缺失或不受支持')
  const rawModel = ownChapterField(record, 'model', '章节生成模型配置必须是对象')
  const rawMcp = Object.prototype.hasOwnProperty.call(record, 'mcp') ? record.mcp : undefined

  if (version !== CHAPTER_GENERATION_SOURCE_VERSION) {
    throw new McpError('MCP_BINDING_INVALID', '章节生成来源版本缺失或不受支持')
  }
  if (active !== 'model' && active !== 'mcp') {
    throw new McpError('MCP_BINDING_INVALID', '章节生成活动来源缺失或不受支持')
  }
  if (!rawModel || typeof rawModel !== 'object' || Array.isArray(rawModel)) {
    throw new McpError('MCP_BINDING_INVALID', '章节生成模型配置必须是对象')
  }

  const modelRecord = rawModel as Record<string, unknown>
  const hasOwnModelId = Object.prototype.hasOwnProperty.call(modelRecord, 'model_id')
  if (!hasOwnModelId && 'model_id' in modelRecord) {
    throw new McpError('MCP_BINDING_INVALID', '章节生成 model_id 必须是自有字段')
  }
  const rawModelId = hasOwnModelId ? modelRecord.model_id : undefined
  if (hasOwnModelId && (!Number.isSafeInteger(rawModelId) || Number(rawModelId) <= 0)) {
    throw new McpError('MCP_BINDING_INVALID', '章节生成 model_id 必须是正安全整数')
  }
  const model = hasOwnModelId ? { model_id: Number(rawModelId) } : {}
  const mcp = rawMcp === undefined ? undefined : normalizeStrictChapterMcpBinding(rawMcp)
  if (active === 'mcp' && !mcp) {
    throw new McpError('MCP_BINDING_INVALID', 'MCP 章节生成来源缺少项目绑定')
  }

  return {
    version: CHAPTER_GENERATION_SOURCE_VERSION,
    active,
    model,
    ...(mcp ? { mcp } : {}),
  }
}

export function normalizeChapterGenerationSource(value: unknown): ChapterGenerationSourceState {
  try {
    return normalizeChapterGenerationSourceUnchecked(value)
  } catch (error) {
    if (error instanceof McpError && error.code === 'MCP_BINDING_INVALID') throw error
    throw new McpError('MCP_BINDING_INVALID', '章节生成来源配置无效')
  }
}

export function resolveChapterGenerationSource(project: any): ChapterGenerationSourceState {
  const config = project?.reference_config
  if (config && Object.prototype.hasOwnProperty.call(config, 'chapter_generation_source')) {
    return normalizeChapterGenerationSource(config.chapter_generation_source)
  }

  const legacy = resolveProseGenerationSource(project)
  if (legacy.type === 'mcp') {
    return normalizeChapterGenerationSource({
      version: CHAPTER_GENERATION_SOURCE_VERSION,
      active: 'mcp',
      model: {},
      mcp: legacy.mcp,
    })
  }
  return {
    version: CHAPTER_GENERATION_SOURCE_VERSION,
    active: 'model',
    model: {},
  }
}

export function retainedMcpProjectBinding(project: any): McpProjectBinding | null {
  const config = project?.reference_config
  if (!config || typeof config !== 'object' || Array.isArray(config)) return null

  const record = config as Record<string, unknown>
  if (Object.prototype.hasOwnProperty.call(record, 'chapter_generation_source')) {
    return normalizeChapterGenerationSource(record.chapter_generation_source).mcp || null
  }
  if (!Object.prototype.hasOwnProperty.call(record, 'prose_generation_source')) return null

  const legacy = normalizeProseGenerationSource(record.prose_generation_source)
  return legacy.type === 'mcp' ? legacy.mcp : null
}

export function chapterGenerationSourceFingerprint(state: ChapterGenerationSourceState) {
  const normalized = normalizeChapterGenerationSource(state)
  const identity = normalized.active === 'model'
    ? [normalized.version, normalized.active, normalized.model.model_id ?? null]
    : [
        normalized.version,
        normalized.active,
        normalized.mcp!.server_id,
        normalized.mcp!.key_id,
        normalized.mcp!.adapter_id,
        normalized.mcp!.agent_id,
        normalized.mcp!.model,
      ]
  return `sha256:${createHash('sha256').update(JSON.stringify(identity), 'utf8').digest('hex')}`
}

export function toLegacyProseGenerationSource(state: ChapterGenerationSourceState): ProseGenerationSourceConfig {
  const normalized = normalizeChapterGenerationSource(state)
  if (normalized.active === 'mcp') {
    return {
      version: SOURCE_VERSION,
      type: 'mcp',
      mcp: normalized.mcp!,
    }
  }
  return { ...MODEL_PROSE_GENERATION_SOURCE }
}

export type McpCredentialSnapshot = {
  servers: McpServerRecord[]
  keys: McpKeyRecord[]
}

export type LocalMcpProjectBindingValidation = {
  binding: McpProjectBinding
  server: McpServerRecord
  key: McpKeyRecord
}

export function validateMcpCredentialSelectionSnapshot(snapshot: McpCredentialSnapshot, input: {
  serverId: string
  keyId: number
  adapterId?: string
}) {
  const server = snapshot.servers.find(item => item.id === input.serverId)
  if (!server) throw new McpError('MCP_BINDING_INVALID', `MCP Server 不存在：${input.serverId}`)
  if (!server.is_active) throw new McpError('MCP_BINDING_INVALID', `MCP Server 已禁用：${server.id}`)
  if (server.transport !== 'streamable_http') throw new McpError('MCP_BINDING_INVALID', '首期正文生成只支持 Streamable HTTP')
  const key = snapshot.keys.find(item => item.id === input.keyId)
  if (!key) throw new McpError('MCP_BINDING_INVALID', `MCP Key 不存在：${input.keyId}`)
  if (!key.is_active) throw new McpError('MCP_BINDING_INVALID', `MCP Key 已禁用：${input.keyId}`)
  if (key.mcp_server_id !== server.id) throw new McpError('MCP_BINDING_INVALID', 'MCP Key 不属于所选 Server')
  if (input.adapterId && input.adapterId !== server.adapter_id) throw new McpError('MCP_BINDING_INVALID', '项目 Adapter 与 Server Adapter 不一致')
  if (!hasMcpAdapter(server.adapter_id)) throw new McpError('MCP_BINDING_INVALID', `本地未注册 Adapter：${server.adapter_id}`)
  return { server, key }
}

export async function validateMcpCredentialSelection(activeWorkspace: string, input: {
  serverId: string
  keyId: number
  adapterId?: string
}) {
  const [servers, keys] = await Promise.all([readMcpServers(activeWorkspace), readMcpKeys(activeWorkspace)])
  return validateMcpCredentialSelectionSnapshot({ servers, keys }, input)
}

export async function validateMcpProjectBindingLocally(
  activeWorkspace: string,
  project: any,
  input: McpProjectBinding,
  options: {
    listProjects?: typeof listNovelProjects
    credentialSnapshot?: McpCredentialSnapshot
  } = {},
): Promise<LocalMcpProjectBindingValidation> {
  const binding = normalizeMcpProjectBinding(input)
  const selectionInput = {
    serverId: binding.server_id,
    keyId: binding.key_id,
    adapterId: binding.adapter_id,
  }
  const { server, key } = options.credentialSnapshot
    ? validateMcpCredentialSelectionSnapshot(options.credentialSnapshot, selectionInput)
    : await validateMcpCredentialSelection(activeWorkspace, selectionInput)
  const projects = await (options.listProjects || listNovelProjects)(activeWorkspace)
  const conflict = projects.find(item => {
    if (Number(item.id) === Number(project?.id)) return false
    let other: McpProjectBinding | undefined
    try {
      other = resolveChapterGenerationSource(item).mcp
    } catch (error) {
      if (error instanceof McpError && error.code === 'MCP_BINDING_INVALID') return false
      throw error
    }
    return Boolean(other
      && other.server_id === binding.server_id
      && other.key_id === binding.key_id
      && other.adapter_id === binding.adapter_id
      && other.agent_id === binding.agent_id)
  })
  if (conflict) {
    throw new McpError('MCP_BINDING_INVALID', `该 Agent 已绑定项目《${conflict.title || conflict.id}》`, {
      reason: 'binding_conflict',
      project_id: conflict.id,
      project_title: conflict.title,
    })
  }
  return { binding, server, key }
}

export async function validateMcpProjectBindingAgent(
  local: LocalMcpProjectBindingValidation,
  options: {
    runtime: Pick<McpRuntime, 'listAgents'>
    signal?: AbortSignal
    timeoutMs?: number
  },
) {
  const agents = await options.runtime.listAgents(local.binding.key_id, {
    signal: options.signal,
    timeoutMs: options.timeoutMs,
  })
  const agent = agents.find(item => String(item.id) === local.binding.agent_id)
  if (!agent) {
    throw new McpError(
      'MCP_BINDING_INVALID',
      `所选 Agent 不存在或当前账号不可见：${local.binding.agent_id}`,
    )
  }
  return { ...local, agent }
}

export async function validateMcpProjectBinding(
  activeWorkspace: string,
  project: any,
  input: McpProjectBinding,
  options: {
    runtime: Pick<McpRuntime, 'listAgents'>
    listProjects?: typeof listNovelProjects
    credentialSnapshot?: McpCredentialSnapshot
    signal?: AbortSignal
    timeoutMs?: number
  },
) {
  const local = await validateMcpProjectBindingLocally(activeWorkspace, project, input, options)
  return validateMcpProjectBindingAgent(local, options)
}
