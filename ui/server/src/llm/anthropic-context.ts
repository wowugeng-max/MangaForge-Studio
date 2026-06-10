export const ANTHROPIC_1M_CONTEXT_BETA = 'context-1m-2025-08-07'
export const ANTHROPIC_CLAUDE_CODE_BETA = 'claude-code-20250219'
export const ANTHROPIC_INTERLEAVED_THINKING_BETA = 'interleaved-thinking-2025-05-14'

type ModelWithContextParams = {
  model_name?: string
  modelName?: string
  display_name?: string
  displayName?: string
  context_ui_params?: Record<string, unknown>
}

function finitePositiveNumber(value: unknown) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : 0
}

function defaultFromParamArray(params: unknown, name: string) {
  if (!Array.isArray(params)) return undefined
  return params.find((item: any) => item?.name === name)?.default
}

function contextParamNumber(params: Record<string, unknown>, name: string) {
  return finitePositiveNumber(
    params[name]
      ?? defaultFromParamArray(params.chat, name)
      ?? defaultFromParamArray(params.vision, name),
  )
}

export function modelRequestsAnthropic1mContext(model?: ModelWithContextParams) {
  const name = [
    model?.model_name,
    model?.modelName,
    model?.display_name,
    model?.displayName,
  ].map(value => String(value || '').toLowerCase()).join(' ')
  if (/\[1m\]|\b1m_context\b|-1m\b/.test(name)) return true

  const params = model?.context_ui_params
  if (!params || typeof params !== 'object') return false
  const preset = String(params.context_window_preset ?? params.contextWindowPreset ?? '').toLowerCase()
  if (preset === '1m' || preset === '1m_context') return true
  const contextWindow = Math.max(
    contextParamNumber(params, 'context_window'),
    contextParamNumber(params, 'contextWindow'),
    contextParamNumber(params, 'max_context'),
    contextParamNumber(params, 'maxContext'),
    contextParamNumber(params, 'max_context_tokens'),
    contextParamNumber(params, 'maxContextTokens'),
  )
  return contextWindow >= 1_000_000
}

export function stripAnthropicLocal1mMarker(modelName: unknown) {
  return String(modelName || '').replace(/\s*\[1m\]\s*$/i, '').trim()
}

function existingHeaderKey(headers: Record<string, string>, name: string) {
  const lowerName = name.toLowerCase()
  return Object.keys(headers).find(key => key.toLowerCase() === lowerName)
}

export function appendHeaderValue(headers: Record<string, string>, name: string, value: string) {
  const key = existingHeaderKey(headers, name) || name
  const existing = String(headers[key] || '')
  const values = existing
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
  if (!values.some(item => item.toLowerCase() === value.toLowerCase())) values.push(value)
  headers[key] = values.join(',')
  return headers
}

export function setHeaderIfMissing(headers: Record<string, string>, name: string, value: string) {
  const key = existingHeaderKey(headers, name)
  if (!key) headers[name] = value
  return headers
}

export function applyClaudeCodeHeaders(headers: Record<string, string>, model?: ModelWithContextParams) {
  setHeaderIfMissing(headers, 'anthropic-version', '2023-06-01')
  setHeaderIfMissing(headers, 'x-app', 'cli')
  setHeaderIfMissing(headers, 'anthropic-dangerous-direct-browser-access', 'true')
  setHeaderIfMissing(headers, 'accept-encoding', 'identity')
  setHeaderIfMissing(headers, 'accept-language', '*')
  setHeaderIfMissing(headers, 'user-agent', 'claude-cli/2.1.2 (external, cli)')
  setHeaderIfMissing(headers, 'x-stainless-lang', 'js')
  setHeaderIfMissing(headers, 'x-stainless-package-version', '0.70.0')
  setHeaderIfMissing(headers, 'x-stainless-runtime', 'node')
  setHeaderIfMissing(headers, 'x-stainless-runtime-version', 'v22.20.0')
  setHeaderIfMissing(headers, 'x-stainless-retry-count', '0')
  setHeaderIfMissing(headers, 'x-stainless-timeout', '600')
  setHeaderIfMissing(headers, 'sec-fetch-mode', 'cors')
  appendHeaderValue(headers, 'anthropic-beta', ANTHROPIC_CLAUDE_CODE_BETA)
  appendHeaderValue(headers, 'anthropic-beta', ANTHROPIC_INTERLEAVED_THINKING_BETA)
  if (modelRequestsAnthropic1mContext(model)) {
    appendHeaderValue(headers, 'anthropic-beta', ANTHROPIC_1M_CONTEXT_BETA)
  }
  return headers
}
