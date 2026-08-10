import type { LLMMessage, LLMMessageContentPart, LLMRequest } from './types'
import type { RuntimeModelSelection } from './provider-runtime-support-types'

export type NegativePromptTransport = {
  source: 'empty' | 'non_media' | 'template' | 'route' | 'model' | 'provider' | 'merged'
  field?: string
}

type NegativePromptDeclaration = {
  supported: boolean
  field?: string
}

const DEFAULT_NEGATIVE_PROMPT_FIELD = 'negative_prompt'
const UNSAFE_FIELDS = new Set(['__proto__', 'prototype', 'constructor'])

function objectRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : null
}

function hasOwn(value: Record<string, any>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key)
}

function safeField(value: unknown, fallback = DEFAULT_NEGATIVE_PROMPT_FIELD): string | undefined {
  const field = String(value ?? fallback).trim()
  if (!field || UNSAFE_FIELDS.has(field)) return undefined
  return field
}

function normalizedParamName(value: unknown) {
  return String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '')
}

function isNegativePromptParamName(value: unknown) {
  return normalizedParamName(value) === 'negativeprompt'
}

function declarationValue(value: unknown, fallbackField = DEFAULT_NEGATIVE_PROMPT_FIELD): NegativePromptDeclaration {
  if (value === false || value === null) return { supported: false }
  if (value === true) return { supported: true, field: safeField(fallbackField) }
  if (typeof value === 'string') {
    const field = safeField(value)
    return field ? { supported: true, field } : { supported: false }
  }
  const record = objectRecord(value)
  if (!record) return { supported: false }
  if (record.supported === false || record.enabled === false) return { supported: false }
  const field = safeField(
    record.field
      ?? record.field_name
      ?? record.fieldName
      ?? record.request_field
      ?? record.requestField
      ?? record.provider_field
      ?? record.providerField
      ?? fallbackField,
  )
  return field ? { supported: true, field } : { supported: false }
}

function declarationFromParamList(value: unknown): NegativePromptDeclaration | null {
  if (!Array.isArray(value)) return null
  const param = value.find(item => {
    const record = objectRecord(item)
    return Boolean(record && isNegativePromptParamName(record.name ?? record.key ?? record.param))
  })
  if (!param) return null
  const record = objectRecord(param)!
  return declarationValue(record, String(
    record.field
      ?? record.field_name
      ?? record.fieldName
      ?? record.request_field
      ?? record.requestField
      ?? record.provider_field
      ?? record.providerField
      ?? record.name
      ?? DEFAULT_NEGATIVE_PROMPT_FIELD,
  ))
}

function directDeclaration(record: Record<string, any>): NegativePromptDeclaration | null {
  for (const key of ['negative_prompt_field', 'negativePromptField']) {
    if (hasOwn(record, key)) return declarationValue(record[key])
  }
  for (const key of ['negative_prompt', 'negativePrompt']) {
    if (hasOwn(record, key)) return declarationValue(record[key])
  }
  if (isNegativePromptParamName(record.name ?? record.key ?? record.param)) {
    return declarationValue(record, String(record.name ?? DEFAULT_NEGATIVE_PROMPT_FIELD))
  }
  return null
}

function modeDeclaration(context: unknown, mode: string): NegativePromptDeclaration | null {
  const record = objectRecord(context)
  if (!record || !mode || !hasOwn(record, mode)) return null
  const value = record[mode]
  return declarationFromParamList(value) ?? (objectRecord(value) ? directDeclaration(objectRecord(value)!) : null)
}

function rootDeclaration(context: unknown): NegativePromptDeclaration | null {
  const record = objectRecord(context)
  return record ? directDeclaration(record) : null
}

function scopedDeclaration(mode: string, ...contexts: unknown[]): NegativePromptDeclaration | null {
  for (const context of contexts) {
    const declaration = modeDeclaration(context, mode)
    if (declaration) return declaration
  }
  for (const context of contexts) {
    const declaration = rootDeclaration(context)
    if (declaration) return declaration
  }
  return null
}

function templateConsumesNegativePrompt(value: unknown, seen = new Set<object>()): boolean {
  if (typeof value === 'string') return /^\s*\{\{\s*negative_prompt\s*\}\}\s*$/.test(value)
  if (!value || typeof value !== 'object') return false
  if (seen.has(value as object)) return false
  seen.add(value as object)
  if (Array.isArray(value)) return value.some(item => templateConsumesNegativePrompt(item, seen))
  return Object.values(value as Record<string, unknown>).some(item => templateConsumesNegativePrompt(item, seen))
}

function isMediaRouteType(routeType: string) {
  return ['image', 'video', 'text_to_image', 'image_to_image', 'text_to_video', 'image_to_video'].includes(routeType)
}

function resolvedDeclaration(
  selection: RuntimeModelSelection,
  routeType: string,
): { source: 'route' | 'model' | 'provider'; declaration: NegativePromptDeclaration } | null {
  const route = objectRecord(selection.routeConfig)
  const routeDeclaration = scopedDeclaration(routeType, route, route?.context_ui_params, route?.contextUiParams)
  if (routeDeclaration) return { source: 'route', declaration: routeDeclaration }

  const modelDeclaration = scopedDeclaration(
    routeType,
    selection.model.context_ui_params,
    (selection.model as any).contextUiParams,
  ) ?? rootDeclaration(selection.model.capabilities)
  if (modelDeclaration) return { source: 'model', declaration: modelDeclaration }

  const providerDeclaration = scopedDeclaration(
    routeType,
    selection.provider.context_ui_params,
    (selection.provider as any).contextUiParams,
  )
  if (providerDeclaration) return { source: 'provider', declaration: providerDeclaration }
  return null
}

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => cloneValue(item)) as T
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, cloneValue(item)])) as T
}

function textPart(part: unknown): boolean {
  if (typeof part === 'string') return true
  const record = objectRecord(part)
  if (!record) return false
  const type = String(record.type || '').trim().toLowerCase()
  if (['text', 'input_text', 'output_text'].includes(type)) return true
  return !type && (typeof record.text === 'string' || typeof record.content === 'string')
}

function messageText(content: LLMMessage['content']): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map(part => {
      if (typeof part === 'string') return part
      const record = objectRecord(part)
      if (!record || !textPart(record)) return ''
      return String(record.text ?? record.content ?? '')
    })
    .filter(Boolean)
    .join('\n')
}

function mergeNegativePromptOnce(prompt: string, negativePrompt: string) {
  const suffix = `Negative prompt: ${negativePrompt}`
  if (prompt === suffix || prompt.endsWith(`\n\n${suffix}`)) return prompt
  return prompt ? `${prompt}\n\n${suffix}` : suffix
}

function messagesWithMergedNegativePrompt(messages: readonly LLMMessage[], prompt: string): LLMMessage[] {
  const next = messages.map(message => cloneValue(message))
  let userIndex = next.findLastIndex(message => message.role === 'user')
  if (userIndex < 0) {
    next.push({ role: 'user', content: prompt })
    return next
  }
  const message = next[userIndex]
  if (!Array.isArray(message.content)) {
    message.content = prompt
    return next
  }
  const content: LLMMessageContentPart[] = []
  let inserted = false
  for (const part of message.content) {
    if (textPart(part)) {
      if (!inserted) {
        const record = objectRecord(part)
        content.push(record ? { ...record, type: record.type || 'text', text: prompt, ...(hasOwn(record, 'content') ? { content: undefined } : {}) } : { type: 'text', text: prompt })
        inserted = true
      }
      continue
    }
    content.push(cloneValue(part) as LLMMessageContentPart)
  }
  if (!inserted) content.unshift({ type: 'text', text: prompt })
  message.content = content
  return next
}

export function prepareNegativePromptRequest(
  request: LLMRequest,
  selection: RuntimeModelSelection,
  routeType: string,
  payloadTemplate?: unknown,
): { request: LLMRequest; transport: NegativePromptTransport } {
  const negativePrompt = typeof request.negative_prompt === 'string' ? request.negative_prompt : ''
  if (!negativePrompt.trim()) return { request, transport: { source: 'empty' } }
  if (!isMediaRouteType(routeType)) return { request, transport: { source: 'non_media' } }
  if (templateConsumesNegativePrompt(payloadTemplate)) return { request, transport: { source: 'template' } }

  const explicit = resolvedDeclaration(selection, routeType)
  if (explicit?.declaration.supported && explicit.declaration.field) {
    return {
      request,
      transport: { source: explicit.source, field: explicit.declaration.field },
    }
  }

  const lastUser = [...(request.messages || [])].reverse().find(message => message.role === 'user')
  const positivePrompt = typeof request.prompt === 'string' && request.prompt.length > 0
    ? request.prompt
    : messageText(lastUser?.content ?? '')
  const mergedPrompt = mergeNegativePromptOnce(positivePrompt, negativePrompt)
  const { negative_prompt: _negativePrompt, ...baseRequest } = request
  return {
    request: {
      ...baseRequest,
      prompt: mergedPrompt,
      messages: messagesWithMergedNegativePrompt(request.messages || [], mergedPrompt),
    },
    transport: { source: 'merged' },
  }
}

export function applyNegativePromptTransport(
  body: unknown,
  request: LLMRequest,
  transport: NegativePromptTransport,
) {
  if (!['route', 'model', 'provider'].includes(transport.source)) return body
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body
  const negativePrompt = typeof request.negative_prompt === 'string' ? request.negative_prompt : ''
  if (!negativePrompt.trim() || !transport.field) return body
  Object.defineProperty(body, transport.field, {
    value: negativePrompt,
    enumerable: true,
    configurable: true,
    writable: true,
  })
  return body
}
