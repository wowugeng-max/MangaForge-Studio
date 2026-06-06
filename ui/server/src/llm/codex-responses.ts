import type { LLMRequest } from './types'

export type CodexResponsesBuildOptions = {
  baseUrl?: string
}

export function normalizeCodexModelName(modelName: string, options: CodexResponsesBuildOptions = {}) {
  void options
  return String(modelName || '').trim()
}

function toCodexInputItem(message: LLMRequest['messages'][number]) {
  const text = String(message.content || '')
  if (message.role === 'assistant') {
    return {
      type: 'message',
      role: 'assistant',
      content: [{ type: 'output_text', text }],
    }
  }
  return {
    type: 'message',
    role: 'user',
    content: [{ type: 'input_text', text }],
  }
}

export function buildCodexResponsesBody(request: LLMRequest, modelName: string, stream = false, options: CodexResponsesBuildOptions = {}): Record<string, any> {
  const systemMessages = request.messages
    .filter(message => message.role === 'system')
    .map(message => message.content)
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
