/** Pure helpers and request/response normalization for LLM adapters. */
import { imageUrlFromLLMContentPart, stringifyLLMMessageContent, stringifyLLMMessageTextContent, textFromLLMContentPart, type LLMRequest, type LLMResponse, type LLMToolCall } from './types'
import { buildCodexResponsesBody } from './codex-responses'
import { createOpenAIResponseViaSdk } from './openai-responses-sdk'
import {
  applyClaudeCodeAuthHeaders,
  anthropicModelNameForRequest,
  anyRouterOfficialMessagesEndpoint,
  applyClaudeCodeBodyMetadata,
  applyClaudeCodeHeaders,
} from './anthropic-context'
import {
  mergeHeadersCaseInsensitive,
  modelCustomHeaders,
  shouldStreamWithModelOverride,
} from './model-runtime-overrides'
import type { APIKeyRecord } from '../key-store'
import type { ModelRecord } from '../model-store'
import type { ProviderRecord } from '../provider-store'

export interface NovelLLMAdapter {
  name: string
  execute<T = any>(request: LLMRequest): Promise<LLMResponse<T>>
}

export function normalizeToolCalls(rawToolCalls: any[]): LLMToolCall[] {
  return (rawToolCalls || []).map((item, index) => {
    const rawArgs = item.arguments ?? item.function?.arguments ?? {}
    let parsedArgs: Record<string, any> = {}
    if (typeof rawArgs === 'string') {
      try { parsedArgs = JSON.parse(rawArgs) } catch { parsedArgs = { _raw: rawArgs } }
    } else if (rawArgs && typeof rawArgs === 'object') {
      parsedArgs = rawArgs
    }
    return {
      id: String(item.id || item.tool_call_id || `${index}`),
      name: String(item.name || item.function?.name || ''),
      arguments: parsedArgs,
    }
  })
}

export function tryParseJson(content: string) {
  try { return JSON.parse(content) } catch {
    const match = content.match(/```json\s*([\s\S]*?)\s*```/i)
    if (match) {
      try { return JSON.parse(match[1]) } catch { return null }
    }
    return null
  }
}

export function parseStructuredContent<T = any>(content: string, parsed?: T) {
  if (parsed && typeof parsed === 'object') return parsed
  const json = tryParseJson(content)
  return json || (parsed as T) || null
}

export function normalizeLLMResponse<T = any>(raw: any) {
  const content = String(contentTextFromProviderValue(raw?.content || raw?.message?.content || raw?.choices?.[0]?.message?.content || raw?.choices?.[0]?.text) || '')
  const rawToolCalls = raw?.tool_calls || raw?.message?.tool_calls || raw?.choices?.[0]?.message?.tool_calls || []
  const choice = raw?.choices?.[0]?.message || raw?.choices?.[0]
  const contentText = String(contentTextFromProviderValue(raw?.content || raw?.message?.content || choice?.content || choice?.text) || '')
  const parsed = parseStructuredContent<T>(contentText, raw?.parsed || choice?.parsed)
  return {
    content: contentText,
    tool_calls: normalizeToolCalls(rawToolCalls),
    usage: raw?.usage ? { input_tokens: raw.usage.input_tokens ?? raw.usage.prompt_tokens, output_tokens: raw.usage.output_tokens ?? raw.usage.completion_tokens, total_tokens: raw.usage.total_tokens ?? (raw.usage.prompt_tokens || 0) + (raw.usage.completion_tokens || 0) } : undefined,
    finish_reason: raw?.finish_reason || raw?.stop_reason || raw?.choices?.[0]?.finish_reason || undefined,
    raw,
    parsed,
  }
}

function contentTextFromProviderValue(value: any): string {
  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          if (typeof item.text === 'string') return item.text
          if (typeof item.content === 'string') return item.content
        }
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  if (value === undefined || value === null) return ''
  return String(value)
}

export function classifyLLMError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (message.includes('timeout')) return 'timeout'
    if (message.includes('401') || message.includes('403') || message.includes('auth')) return 'auth'
    if (message.includes('429') || message.includes('rate limit')) return 'rate_limit'
    if (message.includes('fetch') || message.includes('network') || message.includes('econnreset') || message.includes('econnrefused') || message.includes('connectionrefused') || message.includes('connection refused') || message.includes('socket')) return 'network'
    if (message.includes('json') || message.includes('parse')) return 'parse_error'
  }
  return 'unknown'
}

function normalizeLLMRequest(request: LLMRequest): LLMRequest {
  return {
    model: String(request.model || 'balanced'),
    messages: Array.isArray(request.messages) ? request.messages : [],
    temperature: typeof request.temperature === 'number' ? request.temperature : 0.3,
    max_tokens: typeof request.max_tokens === 'number' ? request.max_tokens : 4096,
    tools: Array.isArray(request.tools) ? request.tools : [],
    tool_choice: request.tool_choice || 'auto',
    response_format: request.response_format || 'json',
    metadata: request.metadata && typeof request.metadata === 'object' ? request.metadata : {},
  }
}

export function normalizeToolCallsFromResponse<T = any>(response: LLMResponse<T>): LLMResponse<T> {
  return { ...response, tool_calls: normalizeToolCalls(response.tool_calls || []) }
}

export function normalizeResponsesPayload(raw: any) {
  const output = Array.isArray(raw?.output) ? raw.output : []
  const text = output
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .map((part: any) => String(part?.text || part?.content || ''))
    .filter(Boolean)
    .join('\n')
  const tool_calls = output
    .flatMap((item: any) => Array.isArray(item?.content) ? item.content : [])
    .filter((part: any) => part?.type === 'tool_call' || part?.type === 'function_call')
    .map((part: any, index: number) => ({ id: String(part?.id || `${index}`), name: String(part?.name || part?.function?.name || ''), arguments: part?.arguments || part?.function?.arguments || {} }))
  const choice = raw?.output_text || text || raw?.content || ''
  return { content: choice, tool_calls, parsed: raw?.parsed || null, usage: raw?.usage, finish_reason: raw?.status || raw?.finish_reason || undefined, raw }
}

export function isResponsesPayload(raw: any) {
  return Boolean(raw && (Array.isArray(raw?.output) || raw?.output_text || raw?.type === 'response' || raw?.response?.output))
}

export function buildOpenAIChatBody(request: LLMRequest) {
  const normalized = normalizeLLMRequest(request)
  const body: Record<string, any> = { model: normalized.model, messages: normalized.messages, temperature: normalized.temperature, max_tokens: normalized.max_tokens }
  if (normalized.tools?.length) {
    body.tools = normalized.tools.map(tool => ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.input_schema } }))
    body.tool_choice = normalized.tool_choice
  }
  if (normalized.response_format) {
    body.response_format = typeof normalized.response_format === 'object' && normalized.response_format.type === 'json_schema'
      ? { type: 'json_object' }
      : normalized.response_format
  }
  const passthroughBlocked = new Set([
    'model',
    'messages',
    'prompt',
    'type',
    'mode',
    'task_type',
    'image_url',
    'response_format',
    'tools',
    'tool_choice',
    'metadata',
    'stream',
    'response_mode',
  ])
  for (const [key, value] of Object.entries(request as any)) {
    if (value === undefined || value === null) continue
    if (passthroughBlocked.has(key)) continue
    body[key] = value
  }
  return body
}

export function isMediaRouteType(routeType?: string) {
  return ['image', 'video', 'text_to_image', 'image_to_image', 'text_to_video', 'image_to_video'].includes(String(routeType || ''))
}

export function buildOpenAIMediaBody(request: LLMRequest) {
  const normalized = normalizeLLMRequest(request)
  const body: Record<string, any> = {
    model: normalized.model,
    prompt: (request as any).prompt || textPromptFromMessages(normalized.messages),
  }
  if ((request as any).image_url) body.image_url = (request as any).image_url
  for (const [key, value] of Object.entries(request as any)) {
    if (value === undefined || value === null) continue
    if (['model', 'messages', 'prompt', 'type', 'mode', 'task_type', 'image_url', 'response_format', 'tools', 'tool_choice', 'metadata', 'stream', 'response_mode'].includes(key)) continue
    body[key] = value
  }
  return body
}

export function buildOpenAIResponsesBody(request: LLMRequest) {
  const normalized = normalizeLLMRequest(request)
  const body: Record<string, any> = { model: normalized.model, input: normalized.messages.map(msg => ({ role: msg.role, content: msg.content })), temperature: normalized.temperature, max_output_tokens: normalized.max_tokens }
  if (normalized.tools?.length) {
    body.tools = normalized.tools.map(tool => ({ type: 'function', name: tool.name, description: tool.description, parameters: tool.input_schema }))
    body.tool_choice = normalized.tool_choice
  }
  if (normalized.response_format && normalized.response_format !== 'text') body.text = { format: { type: 'json_object' } }
  return body
}

export function buildAnthropicMessagesBody(request: LLMRequest, model?: ModelRecord, provider?: ProviderRecord, baseUrl = '') {
  const normalized = normalizeLLMRequest(request)
  const systemMsg = normalized.messages.find(m => m.role === 'system')
  const body: Record<string, any> = {
    model: anthropicModelNameForRequest(normalized.model, model, { provider, baseUrl }),
    max_tokens: normalized.max_tokens,
    temperature: normalized.temperature,
  }
  // Anthropic requires 'system' as a top-level field, NOT in messages array
  if (systemMsg?.content) body.system = stringifyLLMMessageContent(systemMsg.content)
  const nonSystemMessages = normalized.messages.filter(m => m.role !== 'system')
  body.messages = nonSystemMessages.map(msg => ({
    role: msg.role === 'assistant' ? 'assistant' : (msg.role === 'tool' ? 'assistant' : 'user'),
    content: msg.content,
  }))
  if (normalized.tools?.length) {
    body.tools = normalized.tools.map((tool: any) => ({ name: tool.name, description: tool.description, input_schema: tool.input_schema || tool.parameters || {} }))
    if (normalized.tool_choice === 'auto') body.tool_choice = { type: 'auto' }
  }
  return body
}

export function buildGeminiGenerateContentBody(request: LLMRequest) {
  const normalized = normalizeLLMRequest(request)
  const systemText = normalized.messages
    .filter(message => message.role === 'system')
    .map(message => stringifyLLMMessageContent(message.content))
    .filter(Boolean)
    .join('\n')
  const contents = normalized.messages
    .filter(message => message.role !== 'system')
    .map(message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: geminiPartsFromMessageContent(message.content),
    }))
  const body: Record<string, any> = {
    contents: contents.length ? contents : [{ role: 'user', parts: [{ text: promptFromMessages(normalized.messages) }] }],
    generationConfig: {
      temperature: normalized.temperature,
      maxOutputTokens: normalized.max_tokens,
    },
  }
  if (systemText) body.systemInstruction = { parts: [{ text: systemText }] }
  return body
}

export function normalizeGeminiGenerateContentPayload(raw: any) {
  const candidate = Array.isArray(raw?.candidates) ? raw.candidates[0] : null
  const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : []
  const content = parts.map((part: any) => String(part?.text || '')).filter(Boolean).join('\n')
  const usage = raw?.usageMetadata
    ? {
        input_tokens: raw.usageMetadata.promptTokenCount,
        output_tokens: raw.usageMetadata.candidatesTokenCount,
        total_tokens: raw.usageMetadata.totalTokenCount,
      }
    : undefined
  return {
    content,
    usage,
    finish_reason: candidate?.finishReason || raw?.finishReason,
    raw,
  }
}

export function isGeminiNativeFormat(apiFormat: string) {
  return String(apiFormat || '').toLowerCase() === 'gemini_native'
}

function isGeminiNativeProvider(provider: ProviderRecord) {
  return isGeminiNativeFormat(provider.api_format || '')
}

export function effectiveApiFormat(provider: ProviderRecord, model?: ModelRecord) {
  const modelFormat = String(model?.api_format || '').trim().toLowerCase()
  if (modelFormat) return modelFormat
  return String(provider.api_format || 'openai_compatible').trim().toLowerCase()
}

export function isClaudeCodeFormat(apiFormat: string) {
  const normalized = String(apiFormat || '').toLowerCase()
  return normalized === 'claude_code' || normalized.includes('anthropic')
}


export function promptFromMessages(messages: LLMRequest['messages']) {
  const lastUser = [...(messages || [])].reverse().find(message => message.role === 'user')
  return lastUser
    ? stringifyLLMMessageContent(lastUser.content)
    : (messages || []).map(message => stringifyLLMMessageContent(message.content)).filter(Boolean).join('\n')
}

export function textPromptFromMessages(messages: LLMRequest['messages']) {
  const lastUser = [...(messages || [])].reverse().find(message => message.role === 'user')
  return lastUser
    ? stringifyLLMMessageTextContent(lastUser.content)
    : (messages || []).map(message => stringifyLLMMessageTextContent(message.content)).filter(Boolean).join('\n')
}

export function geminiPartsFromMessageContent(content: LLMRequest['messages'][number]['content']) {
  if (!Array.isArray(content)) return [{ text: stringifyLLMMessageContent(content) }]
  const parts = content.flatMap(part => {
    const text = textFromLLMContentPart(part).trim()
    if (text) return [{ text }]
    const imageUrl = imageUrlFromLLMContentPart(part)
    if (imageUrl) return [{ fileData: { mimeType: 'image/png', fileUri: imageUrl } }]
    return []
  })
  return parts.length ? parts : [{ text: stringifyLLMMessageContent(content) }]
}

