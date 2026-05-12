export type ModelTier = 'fast' | 'balanced' | 'creative' | 'review'

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
  name?: string
}

export interface LLMToolCall {
  id: string
  name: string
  arguments: Record<string, any>
}

export interface LLMRequest {
  model: string
  messages: LLMMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
  tools?: Array<{ name: string; description: string; parameters: Record<string, any> }>
  tool_choice?: 'auto' | 'none'
  response_format?: LLMResponseFormat
}

export type LLMResponseFormat =
  | { type: 'json_schema'; schema: { type: 'object' } }
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
