import { types } from 'node:util'
import { ChapterGenerationSourceError } from '../novel-writing-service/generation-source/errors'
import {
  chapterGenerationSourceFingerprint,
  resolveChapterGenerationSource,
} from '../novel-writing-service/generation-source/source-config'

export const CHAPTER_GENERATION_SOURCE_FINGERPRINT_HEADER = 'x-chapter-generation-source-fingerprint'

function generationSourceChanged(reason: string) {
  return new ChapterGenerationSourceError(
    'GENERATION_SOURCE_CHANGED',
    '章节生成来源凭证无效，请重新读取项目状态后重试',
    { reason },
  )
}

function ownHeaderValue(req: unknown) {
  if (!req || typeof req !== 'object' || types.isProxy(req)) throw generationSourceChanged('invalid_request_headers')
  try {
    const headers = Reflect.get(req, 'headers')
    if (headers === undefined) return undefined
    if (!headers || typeof headers !== 'object' || types.isProxy(headers)) {
      throw generationSourceChanged('invalid_request_headers')
    }
    const valueDescriptor = Object.getOwnPropertyDescriptor(headers, CHAPTER_GENERATION_SOURCE_FINGERPRINT_HEADER)
    return valueDescriptor && 'value' in valueDescriptor ? valueDescriptor.value : undefined
  } catch (error) {
    if (error instanceof ChapterGenerationSourceError) throw error
    throw generationSourceChanged('invalid_request_headers')
  }
}

export function resolveChapterAuthorityRequestFingerprint(req: unknown, project: unknown) {
  const header = ownHeaderValue(req)
  if (header !== undefined) {
    if (typeof header !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(header)) {
      throw generationSourceChanged('invalid_expected_fingerprint')
    }
    return header
  }
  try {
    return chapterGenerationSourceFingerprint(resolveChapterGenerationSource(project))
  } catch {
    throw generationSourceChanged('invalid_current_source')
  }
}

export function projectChapterAuthorityRouteError(error: unknown) {
  if (types.isProxy(error) || !types.isNativeError(error)) return null
  let code: unknown
  try {
    const descriptor = Object.getOwnPropertyDescriptor(error, 'code')
      || Object.getOwnPropertyDescriptor(error, 'error_code')
    code = descriptor && 'value' in descriptor ? descriptor.value : undefined
  } catch {
    return null
  }
  if (code === 'GENERATION_SOURCE_BUSY') {
    return {
      status: 409,
      body: { error: '章节生成来源正在使用中', error_code: code },
    }
  }
  if (code === 'GENERATION_SOURCE_CHANGED') {
    return {
      status: 409,
      body: { error: '章节生成来源已变化，请重新读取项目状态后重试', error_code: code },
    }
  }
  return null
}
