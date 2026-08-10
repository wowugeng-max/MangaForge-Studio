import { imageUrlFromLLMContentPart, type LLMRequest } from './types'
import {
  MultiReferenceTransportError,
  resolveMultiReferenceTransport,
  type MultiReferenceTransport,
} from './multi-reference-transport'
import { isRouteObject, routeDslValue } from './provider-runtime-support-route-dsl'
import type { RuntimeModelSelection } from './provider-runtime-support-types'

export type ProviderRequestTransportPlan = {
  multiReferenceTransport: MultiReferenceTransport
  payloadTemplate: unknown
}

export function explicitMultiReferenceFieldOwnsTransport(transport: MultiReferenceTransport) {
  return (
    ['model_capability', 'provider_capability'].includes(transport.source)
    && Boolean(transport.field)
    && transport.count > 1
  )
}

function assertSafeExplicitMultiReferenceField(transport: MultiReferenceTransport) {
  if (
    explicitMultiReferenceFieldOwnsTransport(transport)
    && ['__proto__', 'prototype', 'constructor'].includes(transport.field!)
  ) {
    throw new MultiReferenceTransportError(
      'MULTI_REFERENCE_UNSUPPORTED',
      'Multi-reference provider field is unsafe',
    )
  }
}

export function applyExplicitMultiReferenceField(
  body: Record<string, any>,
  request: LLMRequest,
  transport: MultiReferenceTransport,
) {
  if (!explicitMultiReferenceFieldOwnsTransport(transport)) return
  assertSafeExplicitMultiReferenceField(transport)
  const value = transport.shape === 'urls'
    ? request.reference_images!.map(reference => reference.url)
    : request.reference_images!.map(reference => ({
      ...reference,
      ...(reference.source_asset_ids ? { source_asset_ids: [...reference.source_asset_ids] } : {}),
    }))
  Object.defineProperty(body, transport.field!, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  })
}

export function requestWithoutNativeImageParts(request: LLMRequest): LLMRequest {
  const messages = (request.messages || []).map(message => ({
    ...message,
    content: Array.isArray(message.content)
      ? message.content
        .filter(part => !imageUrlFromLLMContentPart(part))
        .map(part => part && typeof part === 'object' ? { ...part } : part)
      : message.content,
  }))
  return { ...request, messages }
}

export function resolveProviderRequestTransportPlan(
  request: LLMRequest,
  selection: RuntimeModelSelection,
): ProviderRequestTransportPlan {
  const multiReferenceTransport = resolveMultiReferenceTransport(request, selection)
  assertSafeExplicitMultiReferenceField(multiReferenceTransport)
  const payloadTemplate = routeDslValue(selection.routeConfig, 'payload_template', 'payloadTemplate')
  if (
    payloadTemplate
    && multiReferenceTransport.count > 1
    && !isRouteObject(payloadTemplate)
  ) {
    throw new MultiReferenceTransportError(
      'MULTI_REFERENCE_UNSUPPORTED',
      'Multi-reference payload templates must render an object body',
    )
  }
  return { multiReferenceTransport, payloadTemplate }
}
