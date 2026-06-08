import { imageUrlFromLLMContentPart, stringifyLLMMessageContent, textFromLLMContentPart, type LLMRequest } from './types'

export type CodexResponsesBuildOptions = {
  baseUrl?: string
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
    const text = textFromLLMContentPart(part).trim()
    if (text) return [{ type: message.role === 'assistant' ? 'output_text' : 'input_text', text }]
    const imageUrl = imageUrlFromLLMContentPart(part)
    if (imageUrl) return [{ type: 'input_image', image_url: imageUrl }]
    return []
  })
  return parts.length ? parts : [{ type: message.role === 'assistant' ? 'output_text' : 'input_text', text: stringifyLLMMessageContent(message.content) }]
}

function toCodexInputItem(message: LLMRequest['messages'][number]) {
  if (message.role === 'assistant') {
    return {
      type: 'message',
      role: 'assistant',
      content: toCodexContentParts(message),
    }
  }
  return {
    type: 'message',
    role: 'user',
    content: toCodexContentParts(message),
  }
}

export function buildCodexResponsesBody(request: LLMRequest, modelName: string, stream = false, options: CodexResponsesBuildOptions = {}): Record<string, any> {
  const systemMessages = request.messages
    .filter(message => message.role === 'system')
    .map(message => stringifyLLMMessageContent(message.content))
    .filter(Boolean)
  const inputMessages = request.messages
    .filter(message => message.role !== 'system')
    .map(message => toCodexInputItem(message))
  const tools = request.tools?.length
    ? request.tools.map((tool: any) => ({
      type: 'function',
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema || tool.parameters || { type: 'object', properties: {} },
    }))
    : []
  const body: Record<string, any> = {
    model: normalizeCodexModelName(modelName || request.model, options),
    input: inputMessages,
    tools,
    tool_choice: request.tool_choice || 'auto',
    parallel_tool_calls: tools.length > 0,
    reasoning: null,
    store: false,
    stream,
    include: ['reasoning.encrypted_content'],
  }
  if (systemMessages.length) body.instructions = systemMessages.join('\n\n')
  return body
}
