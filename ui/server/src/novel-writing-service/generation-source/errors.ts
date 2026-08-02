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
