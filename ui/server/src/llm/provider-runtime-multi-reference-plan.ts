import { imageUrlFromLLMContentPart, type LLMRequest } from './types'
import {
  MultiReferenceTransportError,
  resolveMultiReferenceTransport,
  type MultiReferenceTransport,
} from './multi-reference-transport'
import {
  prepareNegativePromptRequest,
  type NegativePromptTransport,
} from './provider-runtime-negative-prompt'
import { isRouteObject, routeDslValue } from './provider-runtime-support-route-dsl'
import type { RuntimeModelSelection } from './provider-runtime-support-types'

type TransportOutputPath = readonly (string | number)[]

type TransportFieldOwner = {
  transport: 'multi_reference' | 'negative_prompt'
  application: 'field' | 'template'
  path: TransportOutputPath
}

export type ProviderRequestTransportPlan = {
  multiReferenceTransport: MultiReferenceTransport
  negativePromptPlan: ReturnType<typeof prepareNegativePromptRequest>
  payloadTemplate: unknown
  fieldOwnership: readonly TransportFieldOwner[]
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

function exactTemplateToken(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim().match(/^\{\{\s*([^}]+?)\s*\}\}$/)?.[1]?.trim() || ''
}

function templateTokenPaths(
  value: unknown,
  tokens: ReadonlySet<string>,
  path: TransportOutputPath = [],
  ancestors = new Set<object>(),
): TransportOutputPath[] {
  const token = exactTemplateToken(value)
  if (token) return tokens.has(token) ? [path] : []
  if (!value || typeof value !== 'object' || ancestors.has(value as object)) return []
  const nextAncestors = new Set(ancestors)
  nextAncestors.add(value as object)
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => templateTokenPaths(item, tokens, [...path, index], nextAncestors))
  }
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, item]) => templateTokenPaths(item, tokens, [...path, key], nextAncestors))
}

function explicitNegativePromptFieldOwnsTransport(transport: NegativePromptTransport) {
  return ['route', 'model', 'provider'].includes(transport.source) && Boolean(transport.field)
}

function resolvedTransportFieldOwnership(
  multiReferenceTransport: MultiReferenceTransport,
  negativePromptTransport: NegativePromptTransport,
  payloadTemplate: unknown,
): TransportFieldOwner[] {
  const owners: TransportFieldOwner[] = []
  if (explicitMultiReferenceFieldOwnsTransport(multiReferenceTransport)) {
    owners.push({ transport: 'multi_reference', application: 'field', path: [multiReferenceTransport.field!] })
  } else if (multiReferenceTransport.source === 'route_template') {
    owners.push(...templateTokenPaths(
      payloadTemplate,
      new Set(['reference_images', 'referenceImages']),
    ).map(path => ({ transport: 'multi_reference' as const, application: 'template' as const, path })))
  }

  if (explicitNegativePromptFieldOwnsTransport(negativePromptTransport)) {
    owners.push({ transport: 'negative_prompt', application: 'field', path: [negativePromptTransport.field!] })
  } else if (negativePromptTransport.source === 'template') {
    owners.push(...templateTokenPaths(
      payloadTemplate,
      new Set(['negative_prompt']),
    ).map(path => ({ transport: 'negative_prompt' as const, application: 'template' as const, path })))
  }
  return owners
}

function samePath(left: TransportOutputPath, right: TransportOutputPath) {
  return left.length === right.length && left.every((part, index) => part === right[index])
}

function fieldOwnersCollide(left: TransportFieldOwner, right: TransportFieldOwner) {
  if (samePath(left.path, right.path)) return true
  if (left.application === 'field' && left.path.length === 1) return left.path[0] === right.path[0]
  if (right.application === 'field' && right.path.length === 1) return right.path[0] === left.path[0]
  return false
}

function outputPathLabel(path: TransportOutputPath) {
  return path.map((part, index) => (
    typeof part === 'number'
      ? `[${part}]`
      : index === 0
        ? part
        : `.${part}`
  )).join('') || '<body>'
}

function assertNoTransportFieldCollision(fieldOwnership: readonly TransportFieldOwner[]) {
  const multiOwners = fieldOwnership.filter(owner => owner.transport === 'multi_reference')
  const negativeOwners = fieldOwnership.filter(owner => owner.transport === 'negative_prompt')
  for (const multiOwner of multiOwners) {
    for (const negativeOwner of negativeOwners) {
      if (!fieldOwnersCollide(multiOwner, negativeOwner)) continue
      const field = multiOwner.application === 'field'
        ? outputPathLabel(multiOwner.path)
        : negativeOwner.application === 'field'
          ? outputPathLabel(negativeOwner.path)
          : outputPathLabel(multiOwner.path)
      throw new MultiReferenceTransportError(
        'MULTI_REFERENCE_UNSUPPORTED',
        `Multi-reference and negative-prompt transports both own provider output field "${field}"`,
      )
    }
  }
}

export function resolveProviderRequestTransportPlan(
  request: LLMRequest,
  selection: RuntimeModelSelection,
  routeType = String(selection.routeType || (request as any).type || (request as any).mode || (request as any).task_type || ''),
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
  const negativePromptPlan = prepareNegativePromptRequest(request, selection, routeType, payloadTemplate)
  const fieldOwnership = resolvedTransportFieldOwnership(
    multiReferenceTransport,
    negativePromptPlan.transport,
    payloadTemplate,
  )
  assertNoTransportFieldCollision(fieldOwnership)
  return { multiReferenceTransport, negativePromptPlan, payloadTemplate, fieldOwnership }
}
