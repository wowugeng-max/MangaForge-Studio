import { imageUrlFromLLMContentPart, stringifyLLMMessageContent, textFromLLMContentPart, type LLMRequest } from './types'
import { randomUUID } from 'crypto'

export type CodexResponsesBuildOptions = {
  baseUrl?: string
  reasoning?: unknown
  reasoningEffort?: unknown
}

export function normalizeCodexModelName(modelName: string, options: CodexResponsesBuildOptions = {}) {
  void options
  return String(modelName || '').trim()
}

function toCodexContentParts(message: LLMRequest['messages'][number]) {
  if (!Array.isArray(message.content)) {
    const text = stringifyLLMMessageContent(message.content)
    return [{ type: message.role === 'assistant' ? 'output_text' : 'input_text', text }]
  }
  const parts = message.content.flatMap(part => {
    const filePart = toCodexInputFilePart(part)
    if (filePart) return [filePart]
    const imagePart = toCodexInputImagePart(part)
    if (imagePart) return [imagePart]
    const text = textFromLLMContentPart(part).trim()
    if (text) return [{ type: message.role === 'assistant' ? 'output_text' : 'input_text', text }]
    return []
  })
  return parts.length ? parts : [{ type: message.role === 'assistant' ? 'output_text' : 'input_text', text: stringifyLLMMessageContent(message.content) }]
}

function compactPart(value: Record<string, any>) {
  const compacted: Record<string, any> = {}
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined || item === null || item === '') continue
    compacted[key] = item
  }
  return compacted
}

function toCodexInputImagePart(part: unknown) {
  if (!part || typeof part !== 'object') return null
  const record = part as Record<string, any>
  const imageUrl = imageUrlFromLLMContentPart(record)
  const fileId = typeof record.file_id === 'string' ? record.file_id : ''
  if (!imageUrl && !fileId) return null
  return compactPart({
    type: 'input_image',
    image_url: imageUrl,
    file_id: fileId,
    detail: record.detail,
  })
}

function toCodexInputFilePart(part: unknown) {
  if (!part || typeof part !== 'object') return null
  const record = part as Record<string, any>
  const hasFile = ['input_file', 'file'].includes(String(record.type || ''))
    || record.file_id
    || record.file_url
    || record.file_data
    || record.filename
  if (!hasFile) return null
  return compactPart({
    type: 'input_file',
    detail: record.detail,
    file_data: record.file_data ?? record.fileData,
    file_id: record.file_id ?? record.fileId,
    file_url: record.file_url ?? record.fileUrl ?? record.url,
    filename: record.filename ?? record.name,
  })
}

function toCodexInputItem(message: LLMRequest['messages'][number]) {
  if (message.role === 'tool') {
    return compactPart({
      type: 'function_call_output',
      call_id: (message as any).call_id || message.tool_call_id || message.name,
      output: stringifyLLMMessageContent(message.content),
    })
  }
  if (message.role === 'assistant') {
    return compactPart({
      type: 'message',
      role: 'assistant',
      phase: message.phase,
      content: toCodexContentParts(message),
    })
  }
  return {
    type: 'message',
    role: message.role === 'developer' ? 'developer' : message.role === 'system' ? 'system' : 'user',
    content: toCodexContentParts(message),
  }
}

function compactObject(value: Record<string, any>) {
  const compacted: Record<string, any> = {}
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined || item === null || item === '') continue
    compacted[key] = item
  }
  return Object.keys(compacted).length ? compacted : undefined
}

function codexReasoningFromRequest(request: LLMRequest, options: CodexResponsesBuildOptions, resolvedModelName: string) {
  const rawReasoning = (request as any).reasoning
    ?? (request as any).metadata?.reasoning
    ?? options.reasoning
  if (rawReasoning && typeof rawReasoning === 'object' && !Array.isArray(rawReasoning)) {
    return compactObject(rawReasoning as Record<string, any>)
  }
  if (typeof rawReasoning === 'string' && rawReasoning.trim()) {
    return { effort: rawReasoning.trim() }
  }

  const effort = (request as any).reasoning_effort
    ?? (request as any).metadata?.reasoning_effort
    ?? (request as any).metadata?.model_reasoning_effort
    ?? options.reasoningEffort
  if (typeof effort === 'string' && effort.trim()) return { effort: effort.trim() }
  return defaultCodexReasoning(options, resolvedModelName)
}

function defaultCodexReasoning(options: CodexResponsesBuildOptions, resolvedModelName: string) {
  const baseUrl = String(options.baseUrl || '').toLowerCase()
  const modelName = String(resolvedModelName || '').toLowerCase()
  if (isAnyRouterTopGpt55(options, resolvedModelName)) {
    return { effort: 'xhigh' }
  }
  return undefined
}

function isAnyRouterTopGpt55(options: CodexResponsesBuildOptions, resolvedModelName: string) {
  const baseUrl = String(options.baseUrl || '').toLowerCase()
  const modelName = String(resolvedModelName || '').toLowerCase()
  return baseUrl.includes('anyrouter.top') && /^gpt-5\.5(?:$|[-_:/.])/.test(modelName)
}

function codexClientMetadata(request: LLMRequest, fallbackSessionId?: string) {
  const sessionId = String(optionalRequestValue(request, 'session_id') || fallbackSessionId || randomUUID())
  const threadId = String(optionalRequestValue(request, 'thread_id') || sessionId)
  const turnId = String(optionalRequestValue(request, 'turn_id') || randomUUID())
  const windowId = String(optionalRequestValue(request, 'window_id') || `${threadId}:0`)
  const turnMetadata = {
    installation_id: String(optionalRequestValue(request, 'installation_id') || 'mangaforge'),
    session_id: sessionId,
    thread_id: threadId,
    turn_id: turnId,
    window_id: windowId,
    request_kind: 'turn',
    sandbox: 'mangaforge',
    turn_started_at_unix_ms: Date.now(),
  }
  return {
    'x-codex-installation-id': turnMetadata.installation_id,
    thread_id: threadId,
    turn_id: turnId,
    'x-codex-window-id': windowId,
    'x-codex-turn-metadata': JSON.stringify(turnMetadata),
    session_id: sessionId,
  }
}

export function withCodexClientCompatibilityBody(body: Record<string, any>, source: LLMRequest | Record<string, any> = body) {
  const next = { ...body }
  next.parallel_tool_calls = true
  if (!next.instructions) next.instructions = 'You are Codex, a coding agent based on GPT-5.'
  const sessionId = String(next.prompt_cache_key || optionalRequestValue(source as LLMRequest, 'session_id') || randomUUID())
  if (!next.prompt_cache_key) next.prompt_cache_key = sessionId
  if (!next.text) next.text = { format: { type: 'text' } }
  if (!next.client_metadata) next.client_metadata = codexClientMetadata(source as LLMRequest, sessionId)
  return next
}

function applyAnyRouterCodexCompatibility(body: Record<string, any>, request: LLMRequest) {
  Object.assign(body, withCodexClientCompatibilityBody(body, request))
}

function codexTextFromResponseFormat(format: unknown) {
  if (!format || format === 'text') return undefined
  if (typeof format === 'string') {
    if (format === 'json_object' || format === 'json') return { format: { type: 'json_object' } }
    return undefined
  }
  if (typeof format !== 'object' || Array.isArray(format)) return undefined
  const record = format as Record<string, any>
  if (record.type === 'json_object') return { format: { type: 'json_object' } }
  if (record.type !== 'json_schema') return undefined
  return {
    format: compactPart({
      type: 'json_schema',
      name: record.name || record.schema?.title || 'response',
      schema: record.schema || { type: 'object', properties: {} },
      strict: typeof record.strict === 'boolean' ? record.strict : undefined,
    }),
  }
}

function toCodexTool(tool: Record<string, any>) {
  if (tool.type && tool.type !== 'function') return compactPart({ ...tool })
  return compactPart({
    type: 'function',
    name: tool.name,
    description: tool.description,
    parameters: tool.input_schema || tool.parameters || { type: 'object', properties: {} },
    strict: typeof tool.strict === 'boolean' ? tool.strict : undefined,
  })
}

function optionalRequestValue(request: LLMRequest, key: string) {
  const direct = (request as any)[key]
  if (direct !== undefined && direct !== null && direct !== '') return direct
  const metadataValue = (request as any).metadata?.[key]
  return metadataValue !== undefined && metadataValue !== null && metadataValue !== '' ? metadataValue : undefined
}

export function buildCodexResponsesBody(request: LLMRequest, modelName: string, stream = false, options: CodexResponsesBuildOptions = {}): Record<string, any> {
  const resolvedModelName = normalizeCodexModelName(modelName || request.model, options)
  const systemMessages = request.messages
    .filter(message => message.role === 'system')
    .map(message => stringifyLLMMessageContent(message.content))
    .filter(Boolean)
  const inputMessages = request.messages
    .filter(message => message.role !== 'system')
    .map(message => toCodexInputItem(message))
  const tools = request.tools?.length
    ? request.tools.map((tool: any) => toCodexTool(tool))
    : []
  const body: Record<string, any> = {
    model: resolvedModelName,
    input: inputMessages,
    tools,
    tool_choice: request.tool_choice || 'auto',
    parallel_tool_calls: tools.length > 0,
    store: false,
    stream: stream || isAnyRouterTopGpt55(options, resolvedModelName),
    include: ['reasoning.encrypted_content'],
  }
  const reasoning = codexReasoningFromRequest(request, options, resolvedModelName)
  if (reasoning) body.reasoning = reasoning
  const text = codexTextFromResponseFormat(request.response_format)
  if (text) body.text = text
  const passthroughKeys = [
    'background',
    'conversation',
    'context_management',
    'max_output_tokens',
    'max_tool_calls',
    'previous_response_id',
    'prompt',
    'prompt_cache_key',
    'prompt_cache_retention',
    'safety_identifier',
    'service_tier',
    'top_logprobs',
    'top_p',
    'truncation',
    'user',
  ]
  for (const key of passthroughKeys) {
    const value = optionalRequestValue(request, key)
    if (value !== undefined) body[key] = value
  }
  const responseMetadata = optionalRequestValue(request, 'response_metadata')
  if (responseMetadata && typeof responseMetadata === 'object' && !Array.isArray(responseMetadata)) body.metadata = responseMetadata
  if (systemMessages.length) body.instructions = systemMessages.join('\n\n')
  if (isAnyRouterTopGpt55(options, resolvedModelName)) applyAnyRouterCodexCompatibility(body, request)
  return body
}
