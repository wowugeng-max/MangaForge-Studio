import { imageUrlFromLLMContentPart, type LLMRequest } from './types'

export type MultiReferenceTransportErrorCode =
  | 'MULTI_REFERENCE_UNSUPPORTED'
  | 'MULTI_REFERENCE_MAPPING_REQUIRED'

export class MultiReferenceTransportError extends Error {
  readonly code: MultiReferenceTransportErrorCode
  readonly status = 422

  constructor(code: MultiReferenceTransportErrorCode, message: string) {
    super(message)
    this.name = 'MultiReferenceTransportError'
    this.code = code
  }
}

export type MultiReferenceFieldShape = 'metadata' | 'urls'

export type MultiReferenceTransport = {
  supported: true
  source: 'legacy_single' | 'model_capability' | 'route_template' | 'native_multimodal'
  count: number
  max: number
  field?: string
  shape?: MultiReferenceFieldShape
}

export type MultiReferenceTransportSelection = {
  apiFormat?: string
  api_format?: string
  endpoint?: string
  routeConfig?: unknown
  route_config?: unknown
  contextUiParams?: Record<string, unknown>
  context_ui_params?: Record<string, unknown>
  model?: {
    contextUiParams?: Record<string, unknown>
    context_ui_params?: Record<string, unknown>
  }
}

const DEFAULT_MULTI_REFERENCE_MAX = 9

function objectRecord(value: unknown): Record<string, any> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : null
}

function explicitCapability(selection: MultiReferenceTransportSelection): Record<string, any> | null {
  const contexts = [
    selection.model?.context_ui_params,
    selection.model?.contextUiParams,
    selection.context_ui_params,
    selection.contextUiParams,
  ]
  for (const value of contexts) {
    const context = objectRecord(value)
    if (!context) continue
    const capability = objectRecord(context.multi_reference) || objectRecord(context.multiReference)
    if (capability) return capability
  }
  return null
}

function positiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

function normalizeShape(value: unknown): MultiReferenceFieldShape {
  const normalized = String(value || '').trim().toLowerCase()
  if (['url', 'urls', 'url_array', 'url-array'].includes(normalized)) return 'urls'
  return 'metadata'
}

function routePayloadTemplate(selection: MultiReferenceTransportSelection) {
  const route = objectRecord(selection.routeConfig) || objectRecord(selection.route_config)
  return route?.payload_template ?? route?.payloadTemplate
}

function templateReferencesCollection(value: unknown, seen = new Set<object>()): boolean {
  if (typeof value === 'string') {
    return /^\s*\{\{\s*(?:reference_images|referenceImages)\s*\}\}\s*$/.test(value)
  }
  if (!value || typeof value !== 'object') return false
  if (seen.has(value as object)) return false
  seen.add(value as object)
  if (Array.isArray(value)) return value.some(item => templateReferencesCollection(item, seen))
  return Object.values(value as Record<string, unknown>).some(item => templateReferencesCollection(item, seen))
}

function messageImageUrls(request: LLMRequest) {
  return (request.messages || []).flatMap(message => {
    if (!Array.isArray(message.content)) return []
    return message.content.map(imageUrlFromLLMContentPart).filter(Boolean)
  })
}

function containsOrderedMultiplicity(actual: readonly string[], expected: readonly string[]) {
  let cursor = 0
  for (const value of actual) {
    if (value === expected[cursor]) cursor += 1
    if (cursor === expected.length) return true
  }
  return expected.length === 0
}

function nativeMultimodalFormat(selection: MultiReferenceTransportSelection) {
  const apiFormat = String(selection.apiFormat ?? selection.api_format ?? '').trim().toLowerCase()
  if (apiFormat === 'gemini_native') return true
  if (apiFormat.includes('anthropic') || apiFormat.includes('claude')) return true
  return String(selection.endpoint || '').toLowerCase().includes('chat/completions')
}

function transportError(code: MultiReferenceTransportErrorCode, message: string): never {
  throw new MultiReferenceTransportError(code, message)
}

export function isMultiReferenceTransportError(error: unknown): error is MultiReferenceTransportError {
  return Boolean(
    error
    && typeof error === 'object'
    && typeof (error as any).code === 'string'
    && String((error as any).code).startsWith('MULTI_REFERENCE_'),
  )
}

export function resolveMultiReferenceTransport(
  request: LLMRequest,
  selection: MultiReferenceTransportSelection,
): MultiReferenceTransport {
  const references = Array.isArray(request.reference_images) ? request.reference_images : []
  const count = references.length
  if (count <= 1) {
    return { supported: true, source: 'legacy_single', count, max: 1 }
  }

  const capability = explicitCapability(selection)
  if (capability) {
    if (capability.supported !== true) {
      return transportError(
        'MULTI_REFERENCE_UNSUPPORTED',
        `Model transport explicitly disables multiple reference images (received ${count})`,
      )
    }
    const max = Math.min(
      positiveInteger(capability.max ?? capability.max_images ?? capability.maxImages, DEFAULT_MULTI_REFERENCE_MAX),
      DEFAULT_MULTI_REFERENCE_MAX,
    )
    if (count > max) {
      return transportError(
        'MULTI_REFERENCE_UNSUPPORTED',
        `Model transport supports at most ${max} reference images (received ${count})`,
      )
    }
    const field = String(capability.field || capability.field_name || capability.fieldName || '').trim() || undefined
    if (
      !field
      && !nativeMultimodalFormat(selection)
      && !templateReferencesCollection(routePayloadTemplate(selection))
    ) {
      return transportError(
        'MULTI_REFERENCE_UNSUPPORTED',
        'Model transport must declare an array field for multiple reference images',
      )
    }
    return {
      supported: true,
      source: 'model_capability',
      count,
      max,
      ...(field ? { field } : {}),
      shape: normalizeShape(capability.shape ?? capability.field_shape ?? capability.fieldShape),
    }
  }

  if (templateReferencesCollection(routePayloadTemplate(selection))) {
    if (count > DEFAULT_MULTI_REFERENCE_MAX) {
      return transportError(
        'MULTI_REFERENCE_UNSUPPORTED',
        `Route transport supports at most ${DEFAULT_MULTI_REFERENCE_MAX} reference images (received ${count})`,
      )
    }
    return {
      supported: true,
      source: 'route_template',
      count,
      max: DEFAULT_MULTI_REFERENCE_MAX,
      field: 'reference_images',
      shape: 'metadata',
    }
  }

  const expectedUrls = references.map(reference => String(reference.url || '').trim())
  if (
    nativeMultimodalFormat(selection)
    && expectedUrls.every(Boolean)
    && containsOrderedMultiplicity(messageImageUrls(request), expectedUrls)
  ) {
    if (count > DEFAULT_MULTI_REFERENCE_MAX) {
      return transportError(
        'MULTI_REFERENCE_UNSUPPORTED',
        `Native multimodal transport supports at most ${DEFAULT_MULTI_REFERENCE_MAX} reference images (received ${count})`,
      )
    }
    return {
      supported: true,
      source: 'native_multimodal',
      count,
      max: DEFAULT_MULTI_REFERENCE_MAX,
    }
  }

  return transportError(
    'MULTI_REFERENCE_UNSUPPORTED',
    `Provider transport does not explicitly preserve all ${count} ordered reference images`,
  )
}
