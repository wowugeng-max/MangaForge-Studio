import { types } from 'node:util'

export type ChapterGenerationSourceErrorCode =
  | 'GENERATION_SOURCE_BUSY'
  | 'GENERATION_SOURCE_CHANGED'
  | 'GENERATION_SOURCE_OVERRIDE_FORBIDDEN'
  | 'CHAPTER_MODEL_REQUIRED'

export class ChapterGenerationSourceError extends Error {
  readonly error_code: ChapterGenerationSourceErrorCode

  constructor(
    public readonly code: ChapterGenerationSourceErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ChapterGenerationSourceError'
    this.error_code = code
  }
}

export function isChapterGenerationSourceError(error: unknown): error is ChapterGenerationSourceError {
  return error instanceof ChapterGenerationSourceError
}

const PROVIDER_AVAILABILITY_STAGE_FAILURE_CODES = new Set([
  'CHAPTER_STAGE_ERROR_RESULT',
])

function ownFailureField(error: unknown, field: string) {
  if (!error || (typeof error !== 'object' && typeof error !== 'function')) return undefined
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, field)
    return descriptor && 'value' in descriptor ? descriptor.value : undefined
  } catch {
    return undefined
  }
}

export function isProviderAvailabilityStageFailure(error: unknown) {
  if (!types.isNativeError(error) || types.isProxy(error)) return false
  if (ownFailureField(error, 'admission_status') === 'blocked_invalid') return false
  const code = ownFailureField(error, 'code') || ownFailureField(error, 'error_code')
  if (typeof code === 'string' && code) {
    return PROVIDER_AVAILABILITY_STAGE_FAILURE_CODES.has(code)
  }
  const ownName = ownFailureField(error, 'name')
  if (ownName !== undefined && ownName !== 'Error') return false
  try {
    return Object.getPrototypeOf(error) === Error.prototype
  } catch {
    return false
  }
}
