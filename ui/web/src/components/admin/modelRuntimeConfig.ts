export type RuntimeConfigValues = {
  api_format?: string
  context_window_preset?: string
  context_window?: number
  max_tokens?: number
  temperature?: number
}

export type RuntimeConfigBase = {
  api_format?: string
  context_ui_params?: Record<string, any>
  capabilities?: Record<string, boolean>
}

export const DEFAULT_CONTEXT_WINDOW = 1_000_000
export const DEFAULT_CONTEXT_WINDOW_PRESET = '1m'
export const DEFAULT_MAX_TOKENS = 8192
export const DEFAULT_TEMPERATURE = 0.7

export const CONTEXT_WINDOW_PRESETS = [
  { label: '1M', value: '1m', tokens: 1_000_000 },
  { label: '256K', value: '256k', tokens: 256_000 },
  { label: '128K', value: '128k', tokens: 128_000 },
  { label: '32K', value: '32k', tokens: 32_000 },
  { label: '手动输入', value: 'custom', tokens: null },
] as const

export const API_FORMAT_OPTIONS = [
  { label: '跟随厂商默认协议', value: '' },
  { label: 'OpenAI 标准兼容 (V1)', value: 'openai_compatible' },
  { label: 'Codex / OpenAI Responses', value: 'codex_responses' },
  { label: 'Claude Code / Anthropic Messages', value: 'claude_code' },
  { label: 'Google Gemini 原生', value: 'gemini_native' },
] as const

export const CONTEXT_WINDOW_SELECT_OPTIONS = CONTEXT_WINDOW_PRESETS
  .filter(item => item.tokens)
  .map(item => ({ label: item.label, value: item.tokens as number }))

function objectOrEmpty(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}
}

function finiteNumber(value: unknown, fallback: number) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback
}

function defaultFromParamArray(params: unknown, name: string): unknown {
  if (!Array.isArray(params)) return undefined
  return params.find((item: any) => item?.name === name)?.default
}

function pickRuntimeParam(params: Record<string, any>, name: string, fallback: number) {
  return finiteNumber(
    params[name]
      ?? defaultFromParamArray(params.chat, name)
      ?? defaultFromParamArray(params.vision, name),
    fallback,
  )
}

export function resolveContextWindowPreset(contextWindow: number, preset?: string) {
  if (preset && CONTEXT_WINDOW_PRESETS.some(item => item.value === preset)) {
    if (preset === 'custom') return 'custom'
    const matched = CONTEXT_WINDOW_PRESETS.find(item => item.value === preset)
    if (matched?.tokens === contextWindow) return preset
  }
  const matched = CONTEXT_WINDOW_PRESETS.find(item => item.tokens === contextWindow)
  return matched?.value || 'custom'
}

export function buildTextRuntimeParams(input: {
  contextWindow?: number
  maxTokens?: number
  temperature?: number
}) {
  const contextWindow = finiteNumber(input.contextWindow, DEFAULT_CONTEXT_WINDOW)
  const maxTokens = finiteNumber(input.maxTokens, DEFAULT_MAX_TOKENS)
  const temperature = Number.isFinite(Number(input.temperature)) ? Number(input.temperature) : DEFAULT_TEMPERATURE
  return [
    {
      name: 'context_window',
      label: '上下文窗口',
      type: 'select',
      options: CONTEXT_WINDOW_SELECT_OPTIONS,
      default: contextWindow,
    },
    {
      name: 'max_tokens',
      label: '输出长度限制',
      type: 'number',
      default: maxTokens,
      min: 1,
      max: 262144,
      step: 1,
    },
    {
      name: 'temperature',
      label: '随机性 (Temp)',
      type: 'number',
      default: temperature,
      min: 0,
      max: 2,
      step: 0.1,
    },
  ]
}

export function buildModelRuntimeInitialValues(record?: RuntimeConfigBase): RuntimeConfigValues {
  const params = objectOrEmpty(record?.context_ui_params)
  const contextWindow = pickRuntimeParam(params, 'context_window', finiteNumber(params.max_context, DEFAULT_CONTEXT_WINDOW))
  const maxTokens = pickRuntimeParam(params, 'max_tokens', DEFAULT_MAX_TOKENS)
  const temperature = pickRuntimeParam(params, 'temperature', DEFAULT_TEMPERATURE)
  return {
    api_format: record?.api_format || '',
    context_window_preset: resolveContextWindowPreset(contextWindow, String(params.context_window_preset || '')),
    context_window: contextWindow,
    max_tokens: maxTokens,
    temperature,
  }
}

function shouldExposeTextMode(capabilities: Record<string, boolean>, params: Record<string, any>, mode: 'chat' | 'vision') {
  if (capabilities[mode]) return true
  if (Array.isArray(params[mode])) return true
  return mode === 'chat' && Object.keys(capabilities).length === 0
}

export function buildModelRuntimeSavePayload(values: RuntimeConfigValues, base?: RuntimeConfigBase) {
  const params = objectOrEmpty(base?.context_ui_params)
  const capabilities = objectOrEmpty(base?.capabilities) as Record<string, boolean>
  const contextWindow = finiteNumber(values.context_window, DEFAULT_CONTEXT_WINDOW)
  const maxTokens = finiteNumber(values.max_tokens, DEFAULT_MAX_TOKENS)
  const temperature = Number.isFinite(Number(values.temperature)) ? Number(values.temperature) : DEFAULT_TEMPERATURE
  const preset = resolveContextWindowPreset(contextWindow, values.context_window_preset)
  const nextParams: Record<string, any> = {
    ...params,
    context_window: contextWindow,
    max_context: contextWindow,
    context_window_preset: preset,
    max_tokens: maxTokens,
    temperature,
  }
  const textParams = buildTextRuntimeParams({ contextWindow, maxTokens, temperature })
  if (shouldExposeTextMode(capabilities, params, 'chat')) nextParams.chat = textParams
  if (shouldExposeTextMode(capabilities, params, 'vision')) nextParams.vision = textParams
  return {
    api_format: values.api_format || '',
    context_ui_params: nextParams,
  }
}
