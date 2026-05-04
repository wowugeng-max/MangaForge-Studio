export type ModelTier = 'fast' | 'balanced' | 'creative' | 'review'

export type LLMMessageRole = 'system' | 'user' | 'assistant' | 'tool'

export interface LLMMessage {
  role: LLMMessageRole
  content: string
  name?: string
  tool_call_id?: string
}

export interface LLMToolDefinition {
  name: string
  description: string
  input_schema: Record<string, any>
  output_schema?: Record<string, any>
}

export interface LLMToolCall {
  id: string
  name: string
  arguments: Record<string, any>
}

export interface LLMUsage {
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
}

export type LLMResponseFormat =
  | 'text'
  | 'json'
  | { type: 'json_schema'; schema: Record<string, any> }

export type LLMToolChoice =
  | 'auto'
  | 'required'
  | 'none'
  | { name: string }

export interface LLMRequest {
  model: string
  messages: LLMMessage[]
  temperature?: number
  max_tokens?: number
  tools?: LLMToolDefinition[]
  tool_choice?: LLMToolChoice
  response_format?: LLMResponseFormat
  metadata?: Record<string, any>
}

export interface LLMResponse<T = any> {
  content: string
  tool_calls?: LLMToolCall[]
  usage?: LLMUsage
  finish_reason?: string
  raw?: unknown
  parsed?: T
  error?: string
}

export interface NovelAgentOutputSchemas {
  market: {
    preferred_hook: string
    pace_hint: string
    tone_hint: string
    market_tags: string[]
  }
  market_review: {
    is_market_ready: boolean
    score: number
    strengths: string[]
    risks: string[]
    platform_fit: string
    recommendations: string[]
  }
  platform_fit: {
    is_platform_ready: boolean
    score: number
    platform_type: 'male_serial' | 'female_serial' | 'short_serial' | 'mid_serial' | 'unknown'
    market_positioning: {
      genre_fit: string
      audience_fit: string
      hook_fit: string
      pacing_fit: string
    }
    strengths: string[]
    risks: string[]
    blocking_issues: string[]
    recommendations: string[]
    launch_advice: {
      verdict: 'ready' | 'needs_revision' | 'not_ready'
      priority_actions: string[]
      expected_improvement: string
    }
    chapter_checks: Array<{
      chapter_no: number
      opening_strength: number
      hook_strength: number
      conflict_strength: number
      retention_strength: number
      notes: string[]
    }>
  }
  world: {
    world_summary: string
    rules: string[]
    factions: Array<Record<string, any>>
    locations: Array<Record<string, any>>
    systems: Array<Record<string, any>>
    timeline_anchor: string
    known_unknowns: string[]
  }
  characters: {
    characters: Array<Record<string, any>>
  }
  outline: {
    master_outline: Record<string, any>
    volume_outlines: Array<Record<string, any>>
    chapter_outlines: Array<Record<string, any>>
  }
  chapter: {
    chapters: Array<Record<string, any>>
  }
  prose: {
    prose_chapters: Array<Record<string, any>>
  }
  review: {
    issues: string[]
    repair_suggestions: string[]
  }
}
