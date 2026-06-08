import type { Express } from 'express'
import { randomUUID } from 'crypto'
import { extname } from 'path'
import { readAssets, writeAssets, type AssetRecord } from '../assets'
import { uploadAssetBuffer } from '../asset-upload'
import { readModels, type ModelRecord } from '../model-store'
import { readProviders, type ProviderRecord } from '../provider-store'
import type { APIKeyRecord } from '../key-store'
import { executeWithRuntimeModel, type RuntimeExecutionOptions } from '../llm/provider-runtime'
import { ConfiguredProviderAdapter } from '../llm/adapter'
import type { LLMRequest, LLMResponse } from '../llm/types'

type DirectExecute = (
  activeWorkspace: string,
  request: LLMRequest,
  preferredModelId?: number,
  options?: RuntimeExecutionOptions,
) => Promise<LLMResponse<any> & { runtimeSelection?: any }>

type DirectTaskDeps = {
  execute?: DirectExecute
  idFactory?: () => string
}

type DirectTaskState = {
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed'
  result?: any
  error?: string
}

const directTasks = new Map<string, DirectTaskState>()

function errorBody(message: unknown) {
  const error = String(message)
  return { error, detail: error }
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
}

function outputKey(step: Record<string, any>, index: number) {
  return String(step.output_var || step.outputVar || step.step || `step_${index + 1}`)
}

function numericId(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function resolvePreferredModelIdFromStep(step: Record<string, any>, models: ModelRecord[]) {
  const explicit = numericId(step.preferred_model_id ?? step.preferredModelId ?? step.model_id ?? step.modelId)
  if (explicit) return explicit

  const apiKeyId = numericId(step.api_key_id ?? step.apiKeyId ?? step.key_id ?? step.keyId)
  const providerId = String(step.provider || step.provider_id || step.providerId || '').trim()
  const modelName = String(step.model || step.model_name || step.modelName || '').trim()

  const sameName = (model: ModelRecord) => model.model_name === modelName || model.display_name === modelName
  const sameKey = (model: ModelRecord) => Number(model.api_key_id || 0) === apiKeyId
  const sameProvider = (model: ModelRecord) => !providerId || model.provider === providerId
  if (modelName) {
    const exact = models.find(model => sameName(model) && sameProvider(model) && (!apiKeyId || sameKey(model)))
    const namedInProvider = models.find(model => sameName(model) && sameProvider(model))
    if (exact || namedInProvider) return (exact || namedInProvider)?.id
    if (!providerId) return models.find(sameName)?.id
  }
  if (providerId) {
    const providerModels = models.filter(sameProvider)
    const available = providerModels.find(model => model.health_status !== 'disabled') || providerModels[0]
    return available?.id
  }
  return undefined
}

function stepProviderId(step: Record<string, any>) {
  return String(step.provider || step.provider_id || step.providerId || '').trim()
}

function directApiKeyValue(apiKeys: unknown, providerId: string) {
  const record = asRecord(apiKeys)
  const rawValue = record[providerId]
  if (typeof rawValue === 'string') return rawValue.trim()
  if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    return String((rawValue as Record<string, any>).key || (rawValue as Record<string, any>).api_key || (rawValue as Record<string, any>).apiKey || '').trim()
  }
  return ''
}

function directApiKeyBaseUrl(apiKeys: unknown, providerId: string, step: Record<string, any>) {
  const record = asRecord(apiKeys)
  const rawValue = record[providerId]
  if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
    const baseUrl = String((rawValue as Record<string, any>).base_url || (rawValue as Record<string, any>).baseUrl || '').trim()
    if (baseUrl) return baseUrl
  }
  return String(step.base_url || step.baseUrl || '').trim()
}

function inferDirectCapabilities(request: LLMRequest): Record<string, boolean> {
  const routeType = String((request as any).type || 'chat')
  return { [routeType]: true, chat: routeType === 'chat' }
}

async function executeDirectStepWithApiKey(
  providers: ProviderRecord[],
  step: Record<string, any>,
  request: LLMRequest,
  apiKeyValue: string,
  apiKeys: unknown,
) {
  const providerId = stepProviderId(step)
  const provider = providers.find(item => item.id === providerId)
  if (!provider) throw new Error(`direct task provider ${providerId || '(empty)'} not found`)
  const modelName = String(step.model || step.model_name || step.modelName || request.model || 'default')
  const key: APIKeyRecord = {
    id: -1,
    provider: provider.id,
    key: apiKeyValue,
    base_url: directApiKeyBaseUrl(apiKeys, provider.id, step),
    description: 'Direct API ephemeral key',
    is_active: true,
  }
  const model: ModelRecord = {
    id: -1,
    api_key_id: -1,
    provider: provider.id,
    display_name: modelName,
    model_name: modelName,
    capabilities: inferDirectCapabilities(request),
    health_status: 'healthy',
    is_active: true,
    is_manual: true,
  }
  const adapter = new ConfiguredProviderAdapter(provider, key, model)
  return adapter.execute(request)
}

function getByPath(value: any, path: string) {
  let cursor = value
  for (const part of path.split('.').filter(Boolean)) {
    if (!cursor || typeof cursor !== 'object') return undefined
    cursor = cursor[part]
  }
  return cursor
}

function defaultAssetReplacement(asset: AssetRecord) {
  if (asset.type === 'prompt') return String(asset.data?.content || (asset as any).content || '')
  if (asset.type === 'character') return String(asset.data?.core_prompt || (asset as any).core_prompt || '')
  if (asset.type === 'workflow') return `workflow_${asset.id}`
  return null
}

export function resolveDirectPipelineString(text: string, context: Record<string, any>, assets: AssetRecord[], visitedAssetIds: Set<number>) {
  const withContext = text.replace(/\{(\w+)\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(context, key) ? String(context[key]) : match
  })

  return withContext.replace(/\{asset:(\d+)(?:\.([\w.]+))?\}/g, (match, rawId, fieldPath) => {
    const id = Number(rawId)
    const asset = assets.find(item => Number(item.id) === id)
    if (!asset) return match
    visitedAssetIds.add(id)
    if (fieldPath) {
      const resolved = getByPath(asset.data || {}, fieldPath) ?? getByPath(asset as any, fieldPath)
      return resolved == null ? match : String(resolved)
    }
    return defaultAssetReplacement(asset) ?? match
  })
}

function resolveStepInputs(step: Record<string, any>, context: Record<string, any>, assets: AssetRecord[], visitedAssetIds: Set<number>) {
  const resolved: Record<string, any> = {}
  for (const [key, value] of Object.entries(step)) {
    resolved[key] = resolveDirectPipelineValue(value, context, assets, visitedAssetIds)
  }
  const inputMap = asRecord(resolved.input_map || resolved.inputMap)
  if (!Object.keys(inputMap).length) return resolved
  const { input_map: _inputMapSnake, inputMap: _inputMapCamel, ...baseInputs } = resolved
  return { ...baseInputs, ...inputMap }
}

function resolveDirectPipelineValue(value: any, context: Record<string, any>, assets: AssetRecord[], visitedAssetIds: Set<number>): any {
  if (typeof value === 'string') return resolveDirectPipelineString(value, context, assets, visitedAssetIds)
  if (Array.isArray(value)) return value.map(item => resolveDirectPipelineValue(item, context, assets, visitedAssetIds))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, resolveDirectPipelineValue(nested, context, assets, visitedAssetIds)])
    )
  }
  return value
}

function buildDirectRequest(step: Record<string, any>, resolvedInputs: Record<string, any>): LLMRequest {
  const text = String(resolvedInputs.prompt || resolvedInputs.text || resolvedInputs.content || resolvedInputs.input || '')
  const extraParams = asRecord(step.extra_params || step.extraParams || {})
  const messages = Array.isArray(resolvedInputs.messages)
    ? resolvedInputs.messages
    : [{ role: 'user', content: text }]
  const request: LLMRequest = {
    model: String(step.model || step.model_name || step.modelName || 'balanced'),
    messages,
    temperature: Number(step.temperature ?? extraParams.temperature ?? 0.7),
    max_tokens: Number(step.max_tokens ?? step.maxTokens ?? extraParams.max_tokens ?? extraParams.maxTokens ?? 4096),
    stream: Boolean(step.stream ?? extraParams.stream ?? false),
    response_mode: String(step.response_mode || extraParams.response_mode || 'auto'),
    response_format: { type: 'text' },
  }
  const routeType = String(step.type || step.mode || step.task_type || step.taskType || '').trim()
  if (routeType) (request as any).type = routeType
  if (resolvedInputs.image) (request as any).image_url = String(resolvedInputs.image)
  const passthroughBlocked = new Set([
    'temperature',
    'max_tokens',
    'maxTokens',
    'stream',
    'response_mode',
    'responseMode',
  ])
  for (const [key, value] of Object.entries(extraParams)) {
    if (value === undefined || value === null || passthroughBlocked.has(key)) continue
    ;(request as any)[key] = value
  }
  const seed = step.seed ?? extraParams.seed
  if (seed !== undefined && seed !== null) (request as any).seed = seed
  return request
}

function parseImageOutput(value: string) {
  const trimmed = value.trim()
  const dataUrl = trimmed.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/s)
  if (dataUrl) {
    const ext = dataUrl[1].toLowerCase().replace('jpeg', 'jpg')
    return { ext, buffer: Buffer.from(dataUrl[2], 'base64') }
  }
  if (trimmed.startsWith('iVBOR')) return { ext: 'png', buffer: Buffer.from(trimmed, 'base64') }
  if (trimmed.startsWith('/9j/')) return { ext: 'jpg', buffer: Buffer.from(trimmed, 'base64') }
  return null
}

async function storeCreatedImageAsset(activeWorkspace: string, outputName: string, value: string, visitedAssetIds: number[], projectId?: number | null) {
  const parsed = parseImageOutput(value)
  if (!parsed) return null

  const filename = `direct-${outputName}.${parsed.ext || 'png'}`
  const filePath = await uploadAssetBuffer(activeWorkspace, filename, parsed.buffer)
  const assets = await readAssets(activeWorkspace)
  const id = assets.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
  const asset: AssetRecord = {
    id,
    name: filename,
    description: 'Direct API task generated image',
    type: 'image',
    tags: ['direct-api'],
    project_id: projectId ?? null,
    thumbnail: filePath,
    source_asset_ids: visitedAssetIds,
    file_path: filePath,
    data: {
      file_path: filePath,
      format: (extname(filename).replace('.', '') || parsed.ext).toLowerCase(),
      source: 'direct_api_task',
      source_output: outputName,
      source_asset_ids: visitedAssetIds,
    },
    updated_at: new Date().toISOString(),
  }
  await writeAssets(activeWorkspace, [...assets, asset])
  return id
}

export async function executeDirectPipeline(activeWorkspace: string, taskDef: any, deps: DirectTaskDeps = {}) {
  const execute = deps.execute || executeWithRuntimeModel
  const assets = await readAssets(activeWorkspace)
  const models = await readModels(activeWorkspace)
  const providers = await readProviders(activeWorkspace)
  const context: Record<string, any> = {}
  const visitedAssetIds = new Set<number>()
  const pipeline = Array.isArray(taskDef?.pipeline) ? taskDef.pipeline : []
  if (!pipeline.length) throw new Error('direct task pipeline is required')

  for (let index = 0; index < pipeline.length; index += 1) {
    const step = asRecord(pipeline[index])
    const resolvedInputs = resolveStepInputs(step, context, assets, visitedAssetIds)
    const request = buildDirectRequest(step, resolvedInputs)
    const providerId = stepProviderId(step)
    const apiKeys = taskDef?.api_keys || taskDef?.apiKeys
    const inlineApiKey = providerId ? directApiKeyValue(apiKeys, providerId) : ''
    const response = inlineApiKey
      ? await executeDirectStepWithApiKey(providers, step, request, inlineApiKey, apiKeys)
      : await execute(activeWorkspace, request, resolvePreferredModelIdFromStep(step, models))
    context[outputKey(step, index)] = response.content
  }

  const visited = Array.from(visitedAssetIds)
  const createdAssets: Record<string, number> = {}
  const projectId = numericId(taskDef?.project_id ?? taskDef?.projectId) ?? null
  for (const [key, value] of Object.entries(context)) {
    if (typeof value !== 'string') continue
    const assetId = await storeCreatedImageAsset(activeWorkspace, key, value, visited, projectId)
    if (assetId) createdAssets[key] = assetId
  }

  return {
    status: 'completed',
    outputs: context,
    visited_asset_ids: visited,
    created_assets: createdAssets,
  }
}

export function registerDirectTaskRoutes(app: Express, getWorkspace: () => string, deps: DirectTaskDeps = {}) {
  const idFactory = deps.idFactory || randomUUID

  app.post(['/api/tasks/direct', '/api/tasks/direct/'], async (req, res) => {
    const taskId = idFactory()
    const taskDef = req.body || {}
    directTasks.set(taskId, { status: 'pending' })
    const run = async () => {
      directTasks.set(taskId, { status: 'running' })
      try {
        const result = await executeDirectPipeline(getWorkspace(), taskDef, deps)
        directTasks.set(taskId, { status: 'completed', result })
        return result
      } catch (error) {
        directTasks.set(taskId, { status: 'failed', error: String(error) })
        throw error
      }
    }

    if (taskDef.sync === false) {
      directTasks.set(taskId, { status: 'queued' })
      void run().catch(() => undefined)
      return res.json({ task_id: taskId, status: 'queued' })
    }

    try {
      return res.json(await run())
    } catch (error) {
      return res.status(500).json(errorBody(error))
    }
  })

  app.get(['/api/tasks/:taskId', '/api/tasks/:taskId/'], async (req, res) => {
    res.json(directTasks.get(String(req.params.taskId)) || { status: 'not found' })
  })
}
