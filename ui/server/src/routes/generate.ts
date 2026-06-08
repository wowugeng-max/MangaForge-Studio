import type { Express } from 'express'
import { readModels, type ModelRecord } from '../model-store'
import { readKeys, type APIKeyRecord } from '../key-store'
import { readProviders, type ProviderRecord } from '../provider-store'
import { executeWithRuntimeModel, type RuntimeExecutionOptions } from '../llm/provider-runtime'
import { hasLLMMessageContent, imageUrlFromLLMContentPart, stringifyLLMMessageContent, type LLMMessage, type LLMMessageContentPart, type LLMRequest, type LLMResponse } from '../llm/types'
import { registerTask, taskMessageManager, unregisterTask, type CancelToken } from '../ws-manager'
import { executeLocalComfyWorkflow, interruptLocalComfy, type ExecuteLocalComfyWorkflowOptions, type LocalComfyResult } from '../comfy-local'

type ExecuteGenerate = (
  activeWorkspace: string,
  request: LLMRequest,
  preferredModelId?: number,
  options?: RuntimeExecutionOptions,
) => Promise<LLMResponse<any> & { runtimeSelection?: any }>

type GenerateRouteDeps = {
  execute?: ExecuteGenerate
  comfyExecute?: (options: ExecuteLocalComfyWorkflowOptions) => Promise<LocalComfyResult>
  comfyInterrupt?: (options: ExecuteLocalComfyWorkflowOptions) => Promise<boolean> | boolean
  sendMessage?: (clientId: string, message: Record<string, any>) => Promise<boolean> | boolean
  registerTask?: (clientId: string, adapterId: string, cancelToken: CancelToken) => void
  unregisterTask?: (clientId: string) => void
}

function errorBody(message: unknown, extra: Record<string, any> = {}) {
  const error = String(message)
  return { error, detail: error, ...extra }
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

type IncomingCanvasAsset = {
  id?: number
  type: string
  content?: string
  file_path?: string
  url?: string
  source_asset_ids?: number[]
}

function normalizeStructuredMessageContent(content: unknown): string | LLMMessageContentPart[] {
  if (!Array.isArray(content)) return stringifyLLMMessageContent(content)
  return content
    .map(part => {
      if (typeof part === 'string') return { type: 'text', text: part }
      if (!part || typeof part !== 'object') return null
      const record = part as Record<string, any>
      const text = typeof record.text === 'string' ? record.text : typeof record.content === 'string' ? record.content : ''
      if (text) return { ...record, type: record.type || 'text', text }
      const imageUrl = imageUrlFromLLMContentPart(record)
      if (imageUrl) return { type: 'image_url', image_url: { url: imageUrl } }
      return record
    })
    .filter((part): part is LLMMessageContentPart => Boolean(part && hasLLMMessageContent([part])))
}

function normalizeMessages(payload: any): LLMMessage[] {
  if (Array.isArray(payload?.messages) && payload.messages.length > 0) {
    return payload.messages
      .map((message: any) => ({
        role: ['system', 'assistant', 'tool'].includes(message?.role) ? message.role : 'user',
        content: normalizeStructuredMessageContent(message?.content),
      }))
      .filter((message: LLMMessage) => hasLLMMessageContent(message.content))
  }

  const messages: LLMMessage[] = []
  const systemPrompt = stringifyLLMMessageContent(payload?.system || payload?.systemPrompt || payload?.system_prompt)
  if (systemPrompt.trim()) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: stringifyLLMMessageContent(payload?.prompt || payload?.content || '开始执行') })
  return messages
}

function normalizeCanvasAssetImageUrl(value: unknown) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^(https?:|data:|blob:)/i.test(text)) return text
  if (text.startsWith('/api/assets/media/')) return text
  if (text.startsWith('/api/files/')) return text
  return `/api/assets/media/${encodeURIComponent(text.replace(/^\/+/, ''))}`
}

function normalizeIncomingAssets(value: unknown): IncomingCanvasAsset[] {
  const rawAssets = Array.isArray(value) ? value : []
  return rawAssets
    .map((item: any) => {
      if (!item || typeof item !== 'object') return null
      const type = String(item.type || item.asset_type || '').toLowerCase()
      const id = Number.isFinite(Number(item.id)) ? Number(item.id) : undefined
      const lineage = Array.from(new Set([
        ...(id ? [id] : []),
        ...normalizeSourceAssetIds(item.source_asset_ids ?? item.sourceAssetIds),
      ]))
      const rawImageUrl = item.url || item.file_path || item.filePath || item.data?.url || item.data?.file_path || item.data?.content
      if (type === 'image' || (rawImageUrl && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(String(rawImageUrl)))) {
        const url = normalizeCanvasAssetImageUrl(rawImageUrl)
        return {
          id,
          type: 'image',
          file_path: url,
          url,
          ...(lineage.length ? { source_asset_ids: lineage } : {}),
        }
      }
      const content = stringifyLLMMessageContent(item.content || item.text || item.data?.content || item.data?.text)
      if (!content.trim()) return null
      return {
        id,
        type: type || 'prompt',
        content,
        ...(lineage.length ? { source_asset_ids: lineage } : {}),
      }
    })
    .filter((item): item is IncomingCanvasAsset => Boolean(item))
}

function messageContentImageUrls(content: LLMMessage['content']) {
  return Array.isArray(content)
    ? content.map(part => imageUrlFromLLMContentPart(part)).filter(Boolean)
    : []
}

function appendIncomingAssetsToMessages(messages: LLMMessage[], assets: IncomingCanvasAsset[]): LLMMessage[] {
  if (!assets.length) return messages
  const imageAssets = assets.filter(asset => asset.type === 'image' && asset.url)
  const textAssets = assets
    .filter(asset => asset.type !== 'image' && asset.content)
    .map(asset => String(asset.content).trim())
    .filter(Boolean)
  if (!imageAssets.length && !textAssets.length) return messages

  const nextMessages = messages.map(message => ({ ...message, content: Array.isArray(message.content) ? [...message.content] : message.content }))
  let userIndex = nextMessages.findLastIndex(message => message.role === 'user')
  if (userIndex < 0) {
    nextMessages.push({ role: 'user', content: '开始执行' })
    userIndex = nextMessages.length - 1
  }

  const userMessage = nextMessages[userIndex]
  const baseText = stringifyLLMMessageContent(userMessage.content).trim()
  const existingImages = new Set(messageContentImageUrls(userMessage.content))
  const incomingText = textAssets.length ? `[连线素材]:\n${textAssets.join('\n')}` : ''
  const text = [baseText, incomingText].filter(Boolean).join('\n\n') || '描述这些参考素材'
  const imageParts = imageAssets
    .map(asset => String(asset.url || '').trim())
    .filter(url => url && !existingImages.has(url))
    .map(url => ({ type: 'image_url', image_url: { url } }))

  if (Array.isArray(userMessage.content)) {
    const existingTextIndex = userMessage.content.findIndex(part => typeof part === 'object' && (part as any).type !== 'image_url' && (part as any).type !== 'input_image')
    if (existingTextIndex >= 0) userMessage.content[existingTextIndex] = { ...userMessage.content[existingTextIndex], type: 'text', text }
    else userMessage.content.unshift({ type: 'text', text })
    userMessage.content.push(...imageParts)
  } else if (imageParts.length) {
    userMessage.content = [{ type: 'text', text }, ...imageParts]
  } else {
    userMessage.content = text
  }
  return nextMessages
}

const CANVAS_CONTROL_PARAM_KEYS = new Set([
  'client_id',
  'temperature',
  'max_tokens',
  'maxTokens',
  'stream',
  'response_mode',
  'incoming_assets',
])

function extractCanvasRuntimeParams(params: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(params).filter(([key, value]) => {
      if (CANVAS_CONTROL_PARAM_KEYS.has(key)) return false
      if (value === undefined || value === null || value === '') return false
      return true
    }),
  )
}

export function buildCanvasGenerateLLMRequest(payload: any): LLMRequest {
  const params = payload?.params && typeof payload.params === 'object' ? payload.params : {}
  const incomingAssets = normalizeIncomingAssets(params.incoming_assets ?? payload?.incoming_assets ?? payload?.incomingAssets)
  const firstIncomingImage = incomingAssets.find(asset => asset.type === 'image' && asset.url)?.url || ''
  const request: any = {
    ...extractCanvasRuntimeParams(params),
    model: String(payload?.model || payload?.model_name || 'balanced'),
    type: String(payload?.type || payload?.mode || '').trim() || undefined,
    messages: appendIncomingAssetsToMessages(normalizeMessages(payload), incomingAssets),
    temperature: toNumber(params.temperature ?? payload?.temperature, 0.3),
    max_tokens: toNumber(params.max_tokens ?? params.maxTokens ?? payload?.max_tokens ?? payload?.maxTokens, 4096),
    stream: Boolean(params.stream ?? payload?.stream ?? false),
    response_mode: params.response_mode || payload?.response_mode || 'auto',
    response_format: { type: 'text' },
  }
  const routingStrategy = String(payload?.routing_strategy || payload?.routingStrategy || params.routing_strategy || params.routingStrategy || '').trim()
  if (routingStrategy) request.routing_strategy = routingStrategy
  const imageUrl = String(payload?.image_url || payload?.imageUrl || firstIncomingImage || '').trim()
  if (imageUrl) request.image_url = imageUrl
  const sourceAssetIds = Array.from(new Set(incomingAssets.flatMap(incomingAssetSourceIds)))
  if (sourceAssetIds.length) request.source_asset_ids = sourceAssetIds
  return request
}

async function resolvePreferredModelId(activeWorkspace: string, payload: any): Promise<number | undefined> {
  const apiKeyId = Number(payload?.api_key_id ?? payload?.keyId ?? payload?.key_id ?? 0)
  const providerId = String(payload?.provider || payload?.provider_id || payload?.providerId || '').trim()
  const modelName = String(payload?.model || payload?.model_name || '')
  if (!modelName) return undefined

  const models = await readModels(activeWorkspace)
  const sameKey = (model: ModelRecord) => Number(model.api_key_id || 0) === apiKeyId
  const sameProvider = (model: ModelRecord) => !providerId || model.provider === providerId
  const sameName = (model: ModelRecord) => model.model_name === modelName || model.display_name === modelName
  const exact = models.find(model => sameName(model) && sameProvider(model) && (!apiKeyId || sameKey(model)))
  if (exact) return exact.id
  if (providerId) {
    const providerModels = models.filter(sameProvider)
    const namedInProvider = providerModels.find(sameName)
    if (namedInProvider) return namedInProvider.id
    const available = providerModels.find(model => model.health_status !== 'disabled' && model.is_active !== false) || providerModels[0]
    return available?.id
  }
  return models.find(sameName)?.id
}

function extractClientId(payload: any): string {
  return String(payload?.client_id || payload?.clientId || payload?.params?.client_id || payload?.params?.clientId || '').trim()
}

function normalizeSourceAssetIds(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value.map(item => Number(item)).filter(id => Number.isFinite(id))
}

function incomingAssetSourceIds(asset: IncomingCanvasAsset): number[] {
  return Array.from(new Set([
    ...(asset.id ? [asset.id] : []),
    ...normalizeSourceAssetIds(asset.source_asset_ids),
  ]))
}

function responsePayload(response: LLMResponse<any> & { runtimeSelection?: any }, sourceAssetIds: number[] = []) {
  const lineage = sourceAssetIds.length ? { source_asset_ids: sourceAssetIds } : {}
  return {
    success: true,
    content: response.content,
    ...lineage,
    result: { content: response.content, ...lineage },
    output: response.output,
    parsed: response.parsed,
    usage: response.usage,
    finish_reason: response.finish_reason,
    runtimeSelection: response.runtimeSelection,
  }
}

function parseWorkflowPayload(payload: any): Record<string, any> {
  const params = payload?.params && typeof payload.params === 'object' ? payload.params : {}
  const candidate = payload?.workflow_json || payload?.workflowJson || payload?.workflow
    || params?.workflow_json || params?.workflowJson || params?.workflow
    || payload?.prompt
  if (candidate && typeof candidate === 'object') return candidate
  if (typeof candidate === 'string' && candidate.trim()) {
    try {
      const parsed = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      throw new Error('ComfyUI workflow must be valid JSON')
    }
  }
  throw new Error('ComfyUI workflow is required')
}

function buildComfyHeaders(provider: ProviderRecord, key?: APIKeyRecord, baseUrl = '', payload?: any) {
  const headers: Record<string, string> = { ...(provider.custom_headers || {}) }
  const authType = String(provider.auth_type || 'bearer').toLowerCase()
  const secret = String(key?.key || payload?.api_key || payload?.apiKey || payload?.runninghub_api_key || payload?.runninghubApiKey || '').trim()
  if (!secret || authType === 'none') return headers
  if (/runninghub/i.test(baseUrl)) return headers
  if (authType === 'x-api-key' || authType === 'api-key') headers['x-api-key'] = secret
  else headers.Authorization = secret.toLowerCase().startsWith('bearer ') ? secret : `Bearer ${secret}`
  return headers
}

function normalizeComfyBaseUrl(baseUrl: string, key?: APIKeyRecord, payload?: any) {
  const normalized = String(baseUrl || '').replace(/\/+$/, '')
  const secret = String(key?.key || payload?.api_key || payload?.apiKey || payload?.runninghub_api_key || payload?.runninghubApiKey || '').trim()
  if (/runninghub/i.test(normalized) && secret && !normalized.endsWith(`/${secret}`) && !normalized.endsWith(secret)) {
    return `${normalized}/${secret}`
  }
  return normalized
}

async function resolveComfyExecutionOptions(activeWorkspace: string, payload: any): Promise<ExecuteLocalComfyWorkflowOptions | null> {
  const apiKeyId = Number(payload?.api_key_id ?? payload?.keyId ?? payload?.key_id ?? 0)
  const providers = await readProviders(activeWorkspace)
  const keys = await readKeys(activeWorkspace)
  const key = apiKeyId ? keys.find(item => Number(item.id) === apiKeyId) : undefined
  const providerId = String(payload?.provider || key?.provider || '')
  const provider = providers.find(item => item.id === providerId)
  const modelName = String(payload?.model || payload?.model_name || '')
  const modelAsComfy = modelName === 'comfyui-workflow'
  const providerAsComfy = String(provider?.service_type || '').toLowerCase() === 'comfyui'

  if (!providerAsComfy && !modelAsComfy) return null
  if (!provider) throw new Error('ComfyUI provider not found')
  if (key && key.is_active === false) throw new Error('ComfyUI key is disabled')

  const baseUrl = normalizeComfyBaseUrl((key as any)?.base_url || payload?.base_url || payload?.baseUrl || payload?.comfy_base_url || payload?.comfyBaseUrl || provider.default_base_url || '', key, payload)
  if (!baseUrl) throw new Error('ComfyUI base URL is not configured')

  return {
    workspace: activeWorkspace,
    baseUrl,
    workflow: parseWorkflowPayload(payload),
    inputFiles: payload?.input_files && typeof payload.input_files === 'object'
      ? payload.input_files
      : payload?.inputFiles && typeof payload.inputFiles === 'object'
        ? payload.inputFiles
        : undefined,
    comfyInputDir: String(payload?.comfy_input_dir || payload?.comfyInputDir || '').trim() || undefined,
    headers: buildComfyHeaders(provider, key, baseUrl, payload),
  }
}

function comfyResponsePayload(response: LocalComfyResult) {
  const firstOutput = response.output_files[0]
  const content = firstOutput?.media_url || firstOutput?.path || ''
  return {
    success: true,
    content,
    result: {
      content,
      prompt_id: response.prompt_id,
      output_files: response.output_files,
      history: response.history,
    },
  }
}

export function registerGenerateRoutes(app: Express, getWorkspace: () => string, deps: GenerateRouteDeps = {}) {
  const execute = deps.execute || executeWithRuntimeModel
  const comfyExecute = deps.comfyExecute || executeLocalComfyWorkflow
  const comfyInterrupt = deps.comfyInterrupt || ((options: ExecuteLocalComfyWorkflowOptions) => interruptLocalComfy({ baseUrl: options.baseUrl, headers: options.headers }))
  const sendMessage = deps.sendMessage || ((clientId, message) => taskMessageManager.sendMessage(clientId, message))
  const addTask = deps.registerTask || registerTask
  const removeTask = deps.unregisterTask || unregisterTask

  app.post(['/api/generate', '/api/generate/'], async (req, res) => {
    const activeWorkspace = getWorkspace()
    const payload = req.body || {}
    const clientId = extractClientId(payload)
    let comfyOptions: ExecuteLocalComfyWorkflowOptions | null = null

    try {
      comfyOptions = await resolveComfyExecutionOptions(activeWorkspace, payload)
    } catch (error) {
      return res.status(400).json(errorBody(error))
    }

    if (comfyOptions) {
      if (!clientId) {
        try {
          const response = await comfyExecute(comfyOptions)
          return res.json(comfyResponsePayload(response))
        } catch (error) {
          return res.status(500).json(errorBody(error))
        }
      }

      const abortController = new AbortController()
      const cancelToken: CancelToken = {
        cancelled: false,
        interrupt: async () => {
          cancelToken.cancelled = true
          abortController.abort()
          return comfyInterrupt(comfyOptions)
        },
      }
      addTask(clientId, 'local-comfy', cancelToken)
      await sendMessage(clientId, { type: 'status', message: 'ComfyUI 工作流已提交', phase: 'comfyui' })
      void (async () => {
        try {
          const response = await comfyExecute({
            ...comfyOptions,
            abortSignal: abortController.signal,
            isCancelled: () => cancelToken.cancelled,
            onStatus: async status => {
              if (!cancelToken.cancelled) await sendMessage(clientId, { type: 'status', ...status })
            },
          })
          if (cancelToken.cancelled) return
          await sendMessage(clientId, { type: 'result', data: comfyResponsePayload(response) })
          await sendMessage(clientId, { type: 'done' })
        } catch (error) {
          if (!cancelToken.cancelled) await sendMessage(clientId, { type: 'error', message: String(error) })
        } finally {
          removeTask(clientId)
        }
      })()

      return res.json({ success: true, client_id: clientId, message: 'ComfyUI 任务已交由后台引擎处理' })
    }

    const request = buildCanvasGenerateLLMRequest(payload)
    const sourceAssetIds = normalizeSourceAssetIds((request as any).source_asset_ids)
    const preferredModelId = await resolvePreferredModelId(activeWorkspace, payload)

    if (!clientId) {
      try {
        const response = await execute(activeWorkspace, request, preferredModelId)
        if (response.error) return res.status(500).json(errorBody(response.error, { runtimeSelection: response.runtimeSelection }))
        return res.json(responsePayload(response, sourceAssetIds))
      } catch (error) {
        return res.status(500).json(errorBody(error))
      }
    }

    const abortController = new AbortController()
    const cancelToken: CancelToken = {
      cancelled: false,
      interrupt: () => {
        cancelToken.cancelled = true
        abortController.abort()
        return true
      },
    }
    addTask(clientId, 'canvas-generate', cancelToken)
    await sendMessage(clientId, { type: 'status', message: '生成任务已开始', phase: 'generate' })

    void (async () => {
      try {
        const response = await execute(activeWorkspace, request, preferredModelId, { signal: abortController.signal })
        if (cancelToken.cancelled) return
        if (response.error) {
          await sendMessage(clientId, { type: 'error', message: response.error, runtimeSelection: response.runtimeSelection })
          return
        }
        await sendMessage(clientId, { type: 'result', data: responsePayload(response, sourceAssetIds) })
        await sendMessage(clientId, { type: 'done' })
      } catch (error) {
        if (!cancelToken.cancelled) await sendMessage(clientId, { type: 'error', message: String(error) })
      } finally {
        removeTask(clientId)
      }
    })()

    return res.json({ success: true, client_id: clientId, message: '任务已交由后台引擎处理' })
  })
}
