export const ANTHROPIC_1M_CONTEXT_BETA = 'context-1m-2025-08-07'
export const ANTHROPIC_CLAUDE_CODE_BETA = 'claude-code-20250219'
export const ANTHROPIC_INTERLEAVED_THINKING_BETA = 'interleaved-thinking-2025-05-14'
export const ANYROUTER_MESSAGES_ENDPOINT = 'https://anyrouter.dev/api/v1/messages'

type ModelWithContextParams = {
  model_name?: string
  modelName?: string
  display_name?: string
  displayName?: string
  provider?: string
  context_ui_params?: Record<string, unknown>
}

type ClaudeCodeRequestContext = {
  provider?: {
    id?: string
    display_name?: string
    displayName?: string
    default_base_url?: string
    defaultBaseUrl?: string
  }
  baseUrl?: string
  base_url?: string
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

function contextFlag(params: Record<string, unknown> | undefined, names: string[]) {
  if (!params || typeof params !== 'object') return undefined
  for (const name of names) {
    if (!(name in params)) continue
    const value = params[name]
    if (typeof value === 'boolean') return value
    const text = String(value ?? '').trim().toLowerCase()
    if (['1', 'true', 'yes', 'on', 'preserve', 'keep'].includes(text)) return true
    if (['0', 'false', 'no', 'off', 'strip', 'remove'].includes(text)) return false
  }
  return undefined
}

function contextText(params: Record<string, unknown> | undefined, names: string[]) {
  if (!params || typeof params !== 'object') return ''
  for (const name of names) {
    if (!(name in params)) continue
    const value = String(params[name] ?? '').trim()
    if (value) return value
  }
  return ''
}

function claudeCodeContextFingerprint(model?: ModelWithContextParams, context?: ClaudeCodeRequestContext) {
  return [
    model?.provider,
    model?.model_name,
    model?.modelName,
    model?.display_name,
    model?.displayName,
    context?.baseUrl,
    context?.base_url,
    context?.provider?.id,
    context?.provider?.display_name,
    context?.provider?.displayName,
    context?.provider?.default_base_url,
    context?.provider?.defaultBaseUrl,
  ].map(value => String(value || '').toLowerCase()).join(' ')
}

export function isAnyRouterClaudeCodeContext(model?: ModelWithContextParams, context?: ClaudeCodeRequestContext) {
  return claudeCodeContextFingerprint(model, context).includes('anyrouter.top')
    || claudeCodeContextFingerprint(model, context).includes('anyrouter.dev')
    || /\banyrouter\b|\bany\b/.test(claudeCodeContextFingerprint(model, context))
}

function isAnyRouterDevApiUrl(value: unknown) {
  const text = String(value || '').trim()
  if (!text) return false
  try {
    const url = new URL(text)
    if (!/(^|\.)anyrouter\.dev$/i.test(url.hostname)) return false
    const path = url.pathname.replace(/\/+$/, '')
    return path === '/api' || path === '/api/v1' || path === '/api/v1/messages'
  } catch {
    return /^https?:\/\/([^/]+\.)?anyrouter\.dev(?::\d+)?\/api(?:\/v1(?:\/messages)?)?\/?$/i.test(text)
  }
}

export function anyRouterOfficialMessagesEndpoint(...values: unknown[]) {
  return values.some(isAnyRouterDevApiUrl) ? ANYROUTER_MESSAGES_ENDPOINT : ''
}

function isAnyRouterOfficialMessagesApiContext(context?: ClaudeCodeRequestContext) {
  return Boolean(anyRouterOfficialMessagesEndpoint(
    context?.baseUrl,
    context?.base_url,
    context?.provider?.default_base_url,
    context?.provider?.defaultBaseUrl,
  ))
}

export function shouldPreserveAnthropicLocal1mMarker(model?: ModelWithContextParams, context?: ClaudeCodeRequestContext) {
  const mode = contextText(model?.context_ui_params, [
    'claude_code_model_suffix_mode',
    'claudeCodeModelSuffixMode',
    'anthropic_model_suffix_mode',
    'anthropicModelSuffixMode',
  ]).toLowerCase()
  if (['preserve', 'keep', 'raw'].includes(mode)) return true
  if (['strip', 'remove', 'clean'].includes(mode)) return false
  const explicit = contextFlag(model?.context_ui_params, [
    'claude_code_preserve_model_suffix',
    'claudeCodePreserveModelSuffix',
    'preserve_model_context_marker',
    'preserveModelContextMarker',
    'keep_model_context_marker',
    'keepModelContextMarker',
    'keep_model_suffix',
    'keepModelSuffix',
  ])
  if (explicit !== undefined) return explicit
  if (isAnyRouterClaudeCodeContext(model, context) && !isAnyRouterOfficialMessagesApiContext(context)) return true
  return false
}

export function anthropicModelNameForRequest(modelName: unknown, model?: ModelWithContextParams, context?: ClaudeCodeRequestContext) {
  const raw = String(modelName || '').trim()
  if (isAnyRouterClaudeCodeContext(model, context)) {
    return isAnyRouterOfficialMessagesApiContext(context)
      ? normalizeAnyRouterAnthropicModelName(raw)
      : normalizeAnyRouterClaudeCodeGatewayModelName(raw, model, context)
  }
  return shouldPreserveAnthropicLocal1mMarker(model, context) ? raw : stripAnthropicLocal1mMarker(raw)
}

export function normalizeAnyRouterAnthropicModelName(modelName: unknown) {
  const raw = stripAnthropicLocal1mMarker(modelName).trim()
  const withoutProvider = raw.replace(/^anthropic\//i, '')
  const dottedVersion = withoutProvider.replace(
    /^(claude-(?:opus|sonnet|haiku)-\d+)-(\d{1,2})$/i,
    '$1.$2',
  )
  if (/^claude-/i.test(dottedVersion)) return `anthropic/${dottedVersion}`
  if (/^anthropic\//i.test(raw)) return `anthropic/${dottedVersion}`
  return raw
}

export function normalizeAnyRouterClaudeCodeGatewayModelName(modelName: unknown, model?: ModelWithContextParams, context?: ClaudeCodeRequestContext) {
  const raw = String(modelName || '').trim()
  const wantsOneMillion = /\[1m\]\s*$/i.test(raw) || modelRequestsAnthropic1mContext(model)
  const preserveSuffix = shouldPreserveAnthropicLocal1mMarker(model, context)
  let local = stripAnthropicLocal1mMarker(raw).trim()
  local = local
    .replace(/^global\.anthropic\./i, '')
    .replace(/^anthropic[/.]/i, '')
    .replace(/^(claude-(?:opus|sonnet|haiku)-\d+)\.(\d{1,2})(.*)$/i, '$1-$2$3')
  if (preserveSuffix && wantsOneMillion && /^claude-/i.test(local) && !/\[1m\]\s*$/i.test(local)) return `${local}[1m]`
  return local
}

export function shouldDisableClaudeCodeExperimentalBetas(model?: ModelWithContextParams, context?: ClaudeCodeRequestContext) {
  const explicit = contextFlag(model?.context_ui_params, [
    'claude_code_disable_experimental_betas',
    'claudeCodeDisableExperimentalBetas',
    'disable_experimental_betas',
    'disableExperimentalBetas',
  ])
  if (explicit !== undefined) return explicit
  return isAnyRouterClaudeCodeContext(model, context)
}

export function shouldApplyClaudeCodeNonEssentialHeaders(model?: ModelWithContextParams, context?: ClaudeCodeRequestContext) {
  const mode = contextText(model?.context_ui_params, [
    'claude_code_header_mode',
    'claudeCodeHeaderMode',
    'anthropic_header_mode',
    'anthropicHeaderMode',
  ]).toLowerCase()
  if (['minimal', 'essential', 'lean', 'none'].includes(mode)) return false
  if (['full', 'sdk', 'claude_cli', 'claude-code', 'claude_code'].includes(mode)) return true

  const disable = contextFlag(model?.context_ui_params, [
    'claude_code_disable_nonessential_headers',
    'claudeCodeDisableNonessentialHeaders',
    'claude_code_disable_nonessential_traffic',
    'claudeCodeDisableNonessentialTraffic',
    'disable_nonessential_headers',
    'disableNonessentialHeaders',
  ])
  if (disable !== undefined) return !disable

  return !isAnyRouterClaudeCodeContext(model, context)
}

export function shouldApplyClaudeCodeBodyMetadata(model?: ModelWithContextParams, context?: ClaudeCodeRequestContext) {
  const explicit = contextFlag(model?.context_ui_params, [
    'claude_code_body_beta',
    'claudeCodeBodyBeta',
    'anthropic_body_beta',
    'anthropicBodyBeta',
    'include_anthropic_beta_body',
    'includeAnthropicBetaBody',
  ])
  if (explicit !== undefined) return explicit
  return !isAnyRouterClaudeCodeContext(model, context)
}

function existingHeaderKey(headers: Record<string, string>, name: string) {
  const lowerName = name.toLowerCase()
  return Object.keys(headers).find(key => key.toLowerCase() === lowerName)
}

function deleteHeader(headers: Record<string, string>, name: string) {
  const lowerName = name.toLowerCase()
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lowerName) delete headers[key]
  }
  return headers
}

function setHeader(headers: Record<string, string>, name: string, value: string) {
  deleteHeader(headers, name)
  headers[name] = value
  return headers
}

export function applyClaudeCodeAuthHeaders(
  headers: Record<string, string>,
  apiKey?: string,
  authType = 'bearer',
  model?: ModelWithContextParams,
  context?: ClaudeCodeRequestContext,
) {
  const key = String(apiKey || '').trim()
  const normalizedAuthType = String(authType || 'bearer').toLowerCase()
  if (!key || normalizedAuthType === 'none') return headers

  deleteHeader(headers, 'Authorization')
  deleteHeader(headers, 'x-api-key')
  const useBearer = isAnyRouterClaudeCodeContext(model, context)
    || !(normalizedAuthType === 'x-api-key' || normalizedAuthType === 'api-key')
  if (useBearer) return setHeader(headers, 'Authorization', key.toLowerCase().startsWith('bearer ') ? key : `Bearer ${key}`)
  return setHeader(headers, 'x-api-key', key)
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

export function applyClaudeCodeHeaders(headers: Record<string, string>, model?: ModelWithContextParams, context?: ClaudeCodeRequestContext) {
  setHeaderIfMissing(headers, 'anthropic-version', '2023-06-01')
  if (shouldApplyClaudeCodeNonEssentialHeaders(model, context)) {
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
  }
  appendHeaderValue(headers, 'anthropic-beta', ANTHROPIC_CLAUDE_CODE_BETA)
  if (!shouldDisableClaudeCodeExperimentalBetas(model, context)) {
    appendHeaderValue(headers, 'anthropic-beta', ANTHROPIC_INTERLEAVED_THINKING_BETA)
  }
  if (modelRequestsAnthropic1mContext(model)) {
    appendHeaderValue(headers, 'anthropic-beta', ANTHROPIC_1M_CONTEXT_BETA)
  }
  return headers
}

export function appendAnthropicBetaBodyValue(body: Record<string, any>, value: string) {
  const current = Array.isArray(body.anthropic_beta) ? body.anthropic_beta : []
  const values = current
    .map((item: any) => String(item || '').trim())
    .filter(Boolean)
  if (!values.some(item => item.toLowerCase() === value.toLowerCase())) values.push(value)
  body.anthropic_beta = values
  return body
}

export function applyClaudeCodeBodyMetadata(body: Record<string, any>, model?: ModelWithContextParams, context?: ClaudeCodeRequestContext) {
  if (!shouldApplyClaudeCodeBodyMetadata(model, context)) return body
  if (modelRequestsAnthropic1mContext(model)) {
    appendAnthropicBetaBodyValue(body, ANTHROPIC_1M_CONTEXT_BETA)
  }
  return body
}
