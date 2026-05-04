import { AnthropicCompatibleAdapter, ClaudeCompatibleAdapter, CustomOpenAICompatibleAdapter, GeminiCompatibleAdapter, LocalCompatibleAdapter, OpenAICompatibleAdapter, QwenCompatibleAdapter, AnthropicProxyAdapter, type NovelLLMAdapter } from './adapter'

export type LLMProviderId = 'openai-compatible' | 'qwen-compatible' | 'anthropic-compatible' | 'custom-openai-compatible' | 'anthropic-proxy' | 'claude-compatible' | 'gemini-compatible' | 'cliproxyapi'

export function createLLMAdapter(provider: LLMProviderId): NovelLLMAdapter {
  switch (provider) {
    case 'openai-compatible': return new OpenAICompatibleAdapter()
    case 'qwen-compatible': return new QwenCompatibleAdapter()
    case 'anthropic-compatible': return new AnthropicCompatibleAdapter()
    case 'custom-openai-compatible': return new CustomOpenAICompatibleAdapter()
    case 'anthropic-proxy': return new AnthropicProxyAdapter()
    case 'claude-compatible': return new ClaudeCompatibleAdapter()
    case 'gemini-compatible': return new GeminiCompatibleAdapter()
    case 'cliproxyapi': return new LocalCompatibleAdapter()
    default: return new OpenAICompatibleAdapter()
  }
}
