import type {
  CanvasReferenceAsset,
  CanvasReferenceBinding,
  CanvasReferenceModeHint,
  CanvasReferenceRole,
  CanvasReferenceType,
} from './types'

/** The provider contract currently accepts at most nine image references. */
export const MAX_CANVAS_REFERENCE_IMAGES = 9

export type CanvasReferenceErrorCode =
  | 'REFERENCE_LIMIT_EXCEEDED'
  | 'REFERENCE_ROLE_INVALID'
  | 'REFERENCE_MEDIA_UNSUPPORTED'
  | 'REFERENCE_TYPE_INVALID'
  | 'REFERENCE_ASSET_INVALID'
  | 'REFERENCE_LINEAGE_INVALID'
  | 'REFERENCE_ID_INVALID'

/** Typed validation error shared by the compiler, route, and UI boundaries. */
export class CanvasReferenceError extends Error {
  readonly code: CanvasReferenceErrorCode
  readonly reference_index?: number

  constructor(code: CanvasReferenceErrorCode, message: string, referenceIndex?: number) {
    super(message)
    this.name = 'CanvasReferenceError'
    this.code = code
    this.reference_index = referenceIndex
  }
}

// Descriptive aliases make the contract convenient for callers that use the
// term "binding" rather than "canvas reference" without creating a second
// error shape.
export const ReferenceBindingError = CanvasReferenceError
export const CanvasReferenceBindingError = CanvasReferenceError

const REFERENCE_ROLES: ReadonlySet<CanvasReferenceRole> = new Set([
  'general',
  'first_frame',
  'last_frame',
  'character',
  'scene',
  'style',
  'full_reference',
  'prompt_context',
])

const REFERENCE_TYPES: ReadonlySet<CanvasReferenceType> = new Set([
  'image',
  'prompt',
  'video',
  'audio',
])

type ReferenceAssetInput = CanvasReferenceAsset & {
  /** Backward-compatible spelling accepted at the untrusted boundary. */
  role?: CanvasReferenceRole
  sourceAssetIds?: number[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function referenceError(code: CanvasReferenceErrorCode, message: string, index?: number): CanvasReferenceError {
  return new CanvasReferenceError(code, message, index)
}

function normalizeLineage(value: unknown, index: number): number[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) {
    throw referenceError('REFERENCE_LINEAGE_INVALID', `Reference ${index} source_asset_ids must be an array`, index)
  }
  const seen = new Set<number>()
  const ids: number[] = []
  for (const candidate of value) {
    // Runtime payloads occasionally contain numeric strings after a JSON form
    // submission. Normalize those safely while rejecting fractional/unsafe IDs.
    const id = typeof candidate === 'number' || (typeof candidate === 'string' && candidate.trim() !== '')
      ? Number(candidate)
      : NaN
    if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

function normalizeRole(asset: ReferenceAssetInput, index: number): CanvasReferenceRole {
  const role = asset.reference_role ?? asset.role ?? 'general'
  if (typeof role !== 'string' || !REFERENCE_ROLES.has(role as CanvasReferenceRole)) {
    throw referenceError('REFERENCE_ROLE_INVALID', `Reference ${index} has an invalid reference role`, index)
  }
  return role as CanvasReferenceRole
}

function normalizeType(asset: ReferenceAssetInput, index: number): CanvasReferenceType {
  const type = asset.type
  if (typeof type !== 'string' || !REFERENCE_TYPES.has(type as CanvasReferenceType)) {
    throw referenceError('REFERENCE_TYPE_INVALID', `Reference ${index} has an invalid reference type`, index)
  }
  return type as CanvasReferenceType
}

function optionalString(value: unknown, field: string, index: number): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') {
    throw referenceError('REFERENCE_ASSET_INVALID', `Reference ${index} ${field} must be a string`, index)
  }
  return value
}

function enforceRoleAndImageLimits(bindings: readonly CanvasReferenceBinding[]): void {
  const imageCount = bindings.filter((binding) => binding.type === 'image').length
  if (imageCount > MAX_CANVAS_REFERENCE_IMAGES) {
    throw referenceError(
      'REFERENCE_LIMIT_EXCEEDED',
      `Canvas references may contain at most ${MAX_CANVAS_REFERENCE_IMAGES} images`,
    )
  }

  const firstFrameCount = bindings.filter((binding) => binding.reference_role === 'first_frame').length
  if (firstFrameCount > 1) {
    throw referenceError('REFERENCE_ROLE_INVALID', 'Only one first_frame reference is allowed')
  }
  const lastFrameCount = bindings.filter((binding) => binding.reference_role === 'last_frame').length
  if (lastFrameCount > 1) {
    throw referenceError('REFERENCE_ROLE_INVALID', 'Only one last_frame reference is allowed')
  }
}

/**
 * Normalize an ordered list of incoming canvas assets into the canonical
 * reference binding shape. The caller's array and lineage arrays are never
 * mutated. Reserved video/audio types are retained here so they can be
 * surfaced as a typed execution error by validateCanvasReferenceAssets.
 */
export function normalizeCanvasReferenceAssets(
  assets: readonly ReferenceAssetInput[] | undefined,
): CanvasReferenceBinding[] {
  if (assets === undefined) return []
  if (!Array.isArray(assets)) {
    throw referenceError('REFERENCE_ASSET_INVALID', 'Canvas references must be an array')
  }

  const ids = new Set<string>()
  const bindings = assets.map((rawAsset, arrayIndex): CanvasReferenceBinding => {
    const index = arrayIndex + 1
    if (!isRecord(rawAsset)) {
      throw referenceError('REFERENCE_ASSET_INVALID', `Reference ${index} must be an object`, index)
    }
    const asset = rawAsset as ReferenceAssetInput
    const type = normalizeType(asset, index)
    const referenceRole = normalizeRole(asset, index)
    const suppliedId = typeof asset.reference_id === 'string' && asset.reference_id.trim()
      ? asset.reference_id.trim()
      : `reference-${index}`
    if (ids.has(suppliedId)) {
      throw referenceError('REFERENCE_ID_INVALID', `Duplicate reference id: ${suppliedId}`, index)
    }
    ids.add(suppliedId)

    const binding: CanvasReferenceBinding = {
      reference_index: index,
      reference_id: suppliedId,
      reference_role: referenceRole,
      type,
    }
    const url = optionalString(asset.url, 'url', index)
    const content = optionalString(asset.content, 'content', index)
    const sourceAssetIds = normalizeLineage(asset.source_asset_ids ?? asset.sourceAssetIds, index)
    if (url !== undefined) binding.url = url
    if (content !== undefined) binding.content = content
    if (sourceAssetIds !== undefined) binding.source_asset_ids = sourceAssetIds
    return binding
  })

  enforceRoleAndImageLimits(bindings)
  return bindings
}

/**
 * Validate references for the currently executable compiler/media boundary.
 * Prompt and image references are supported; video and audio are reserved in
 * the serialized contract but intentionally fail until a provider implements
 * their transport.
 */
export function validateCanvasReferenceAssets(
  assets: readonly ReferenceAssetInput[] | undefined,
): CanvasReferenceBinding[] {
  const bindings = normalizeCanvasReferenceAssets(assets)
  enforceRoleAndImageLimits(bindings)
  const unsupported = bindings.find((binding) => binding.type === 'video' || binding.type === 'audio')
  if (unsupported) {
    throw referenceError(
      'REFERENCE_MEDIA_UNSUPPORTED',
      `Reference media type ${unsupported.type} is not executable yet`,
      unsupported.reference_index,
    )
  }
  return bindings
}

/** Derive the MiniMax H3 sub-mode hint from the ordered image roles. */
export function deriveH3ReferenceModeHint(
  assets: readonly Pick<ReferenceAssetInput, 'type' | 'reference_role' | 'role'>[] | undefined,
): CanvasReferenceModeHint {
  const images = (assets ?? []).filter((asset) => asset.type === 'image')
  if (images.length === 0) return 'T2VA'

  const roles = images.map((asset) => asset.reference_role ?? asset.role ?? 'general')
  if (roles.length === 1 && roles[0] === 'first_frame') return 'I2VA'
  if (roles.length === 1 && roles[0] === 'last_frame') return 'L2VA'
  if (roles.length === 2 && roles.includes('first_frame') && roles.includes('last_frame')) return 'FL2VA'
  return 'Ref2VA'
}

