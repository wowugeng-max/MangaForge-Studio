export type ModelTier = 'fast' | 'balanced' | 'creative' | 'review'

export type LLMTextContentPart = {
  type: 'text' | 'input_text' | 'output_text'
  text?: string
  content?: string
}

export type LLMImageContentPart = {
  type: 'image_url' | 'input_image'
  image_url?: string | { url?: string }
  url?: string
  file_id?: string
  detail?: 'low' | 'high' | 'auto' | 'original'
}

export type LLMFileContentPart = {
  type: 'input_file' | 'file'
  detail?: 'low' | 'high'
  file_data?: string
  file_id?: string
  file_url?: string
  filename?: string
}

export type LLMMessageContentPart = LLMTextContentPart | LLMImageContentPart | LLMFileContentPart | Record<string, any>
export type LLMMessageContent = string | LLMMessageContentPart[]

export interface LLMMessage {
  role: 'system' | 'developer' | 'user' | 'assistant' | 'tool'
  content: LLMMessageContent
  tool_call_id?: string
  name?: string
  phase?: 'commentary' | 'final_answer'
}

export function imageUrlFromLLMContentPart(part: unknown): string {
  if (!part || typeof part !== 'object') return ''
  const record = part as Record<string, any>
  const imageUrl = record.image_url
  if (typeof imageUrl === 'string') return imageUrl
  if (imageUrl && typeof imageUrl === 'object') return String(imageUrl.url || '')
  return String(record.url || record.file_uri || record.fileUri || record.fileData?.fileUri || '')
}

export function textFromLLMContentPart(part: unknown): string {
  if (typeof part === 'string') return part
  if (!part || typeof part !== 'object') return ''
  const record = part as Record<string, any>
  if (typeof record.text === 'string') return record.text
  if (typeof record.content === 'string') return record.content
  return ''
}

export function stringifyLLMMessageContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map(part => textFromLLMContentPart(part) || imageUrlFromLLMContentPart(part))
      .filter(Boolean)
      .join('\n')
  }
  if (content === undefined || content === null) return ''
  return String(content)
}

export function stringifyLLMMessageTextContent(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map(part => textFromLLMContentPart(part))
      .filter(Boolean)
      .join('\n')
  }
  if (content === undefined || content === null) return ''
  return String(content)
}

export function hasLLMMessageContent(content: unknown): boolean {
  return stringifyLLMMessageContent(content).trim().length > 0
}

export interface LLMToolCall {
  id: string
  name: string
  arguments: Record<string, any>
}

export type LLMReferenceImage = {
  url: string
  reference_index: number
  reference_id?: string
  reference_role?: string
  source_asset_ids?: number[]
}

export interface LLMRequest {
  model: string
  type?: string
  prompt?: string
  messages: LLMMessage[]
  /** Ordered canvas image references. `image_url` remains a legacy first-image compatibility field. */
  reference_images?: LLMReferenceImage[]
  /** Optional negative prompt. Provider body builders only forward this on media routes. */
  negative_prompt?: string
  temperature?: number
  max_tokens?: number
  stream?: boolean
  response_mode?: 'auto' | 'stream' | 'non_stream'
  tools?: Array<{ name: string; description: string; parameters: Record<string, any>; strict?: boolean; type?: string } | Record<string, any>>
  tool_choice?: 'auto' | 'none' | Record<string, any>
  response_format?: LLMResponseFormat
}

export type LLMResponseFormat =
  | { type: 'json_schema'; name?: string; schema: { type: 'object' } | Record<string, any>; strict?: boolean }
  | { type: 'json_object' }
  | { type: 'text' }

export interface LLMUsage {
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
}

export interface LLMResponse<T = any> {
  content: string
  tool_calls?: LLMToolCall[]
  usage?: LLMUsage
  finish_reason?: string
  parsed?: T
  output?: T
  error?: string
}

export interface NovelStrategySpec {
  agent_id: string
  model_tier: ModelTier
  temperature: number
  max_tokens: number
  retries: number
  response_schema?: string[]
  fallback_agent?: string
}

export interface NovelAgentOutputSchemas {
  market: Array<string>
  world: Array<string>
  characters: Array<string>
  outline: Array<string>
  detail_outline: Array<string>
  continuity_check: Array<string>
  prose: Array<string>
  review: Array<string>
  market_review: Array<string>
  platform_fit: Array<string>
}
