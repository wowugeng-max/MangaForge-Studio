import { createHash } from 'crypto'
import { countProseChars } from '../../novel-writing/word-target'
import { assertCompleteProseTransportResult } from '../../novel-writing-service/quality/prose-transport-admission'
import { asArray, extractLLMText, getNovelPayload } from '../novel-route-utils'

export type RevisionCandidateAdmission = {
  chapterText: string
  candidateHash: string
  sourceCharCount: number
  candidateCharCount: number
  minimumCharCount: number
  maximumCharCount: number
  appliedPatches: unknown[]
  diagnostics: Record<string, unknown>
}

export class RevisionCandidateAdmissionError extends Error {
  constructor(
    public code: string,
    message: string,
    public diagnostics: Record<string, unknown> = {},
  ) {
    super(`${code}: ${message}`)
    this.name = 'RevisionCandidateAdmissionError'
  }
}

type PatchAnchorMatch = {
  index: number
  anchor: string
  match: 'exact' | 'trimmed' | 'normalized_whitespace' | 'none'
  reason?: 'anchor_not_found' | 'anchor_not_unique'
}

type PlannedPatchOperation = {
  order: number
  type: 'replacement' | 'insertion'
  start: number
  end: number
  anchorStart?: number
  anchorEnd?: number
  replacementText: string
  applied: Record<string, unknown>
  failure: Record<string, unknown>
}

function firstPatchText(...values: any[]) {
  return values.map(value => String(value || '').trim()).find(Boolean) || ''
}

function firstReplacementText(...values: any[]) {
  for (const value of values) {
    if (value === undefined || value === null) continue
    const text = String(value)
    if (text.trim()) return text.trim()
    if (typeof value === 'string') return ''
  }
  return null
}

function firstAnchorText(...values: any[]) {
  for (const value of values) {
    if (value === undefined || value === null) continue
    const text = String(value)
    if (text.trim()) return text
  }
  return ''
}

function uniqueTextIndex(source: string, anchor: string) {
  const index = source.indexOf(anchor)
  if (index < 0) return { index: -1, unique: false }
  return { index, unique: source.indexOf(anchor, index + 1) < 0 }
}

function whitespaceInsensitiveIndex(source: string, anchor: string): PatchAnchorMatch {
  const sourceMap: number[] = []
  let normalizedSource = ''
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (/\s/.test(char)) continue
    sourceMap.push(i)
    normalizedSource += char
  }
  const normalizedAnchor = anchor.replace(/\s+/g, '')
  if (!normalizedAnchor) {
    return { index: -1, anchor, match: 'none', reason: 'anchor_not_found' }
  }
  const normalizedIndex = normalizedSource.indexOf(normalizedAnchor)
  if (normalizedIndex < 0) {
    return { index: -1, anchor, match: 'none', reason: 'anchor_not_found' }
  }
  if (normalizedSource.indexOf(normalizedAnchor, normalizedIndex + 1) >= 0) {
    return { index: -1, anchor, match: 'none', reason: 'anchor_not_unique' }
  }
  const start = sourceMap[normalizedIndex]
  const end = sourceMap[normalizedIndex + normalizedAnchor.length - 1] + 1
  return { index: start, anchor: source.slice(start, end), match: 'normalized_whitespace' }
}

function findPatchAnchor(source: string, anchor: string): PatchAnchorMatch {
  const whitespaceMatch = whitespaceInsensitiveIndex(source, anchor)
  const exact = uniqueTextIndex(source, anchor)
  if (exact.index >= 0) {
    if (!exact.unique || whitespaceMatch.reason === 'anchor_not_unique') {
      return { index: -1, anchor, match: 'none', reason: 'anchor_not_unique' }
    }
    return { index: exact.index, anchor, match: 'exact' }
  }

  const trimmed = anchor.trim()
  if (trimmed && trimmed !== anchor) {
    const trimmedMatch = uniqueTextIndex(source, trimmed)
    if (trimmedMatch.index >= 0) {
      if (!trimmedMatch.unique || whitespaceMatch.reason === 'anchor_not_unique') {
        return { index: -1, anchor: trimmed, match: 'none', reason: 'anchor_not_unique' }
      }
      return { index: trimmedMatch.index, anchor: trimmed, match: 'trimmed' }
    }
  }
  return whitespaceMatch
}

function plannedOperationsOverlap(left: PlannedPatchOperation, right: PlannedPatchOperation) {
  if (left.start === left.end && right.start === right.end && left.start === right.start) return true
  if (left.anchorStart !== undefined && left.anchorEnd !== undefined
    && right.anchorStart !== undefined && right.anchorEnd !== undefined) {
    return left.anchorStart < right.anchorEnd && right.anchorStart < left.anchorEnd
  }
  if (left.start === left.end) return left.start > right.start && left.start < right.end
  if (right.start === right.end) return right.start > left.start && right.start < left.end
  return left.start < right.end && right.start < left.end
}

function assemblePlannedPatches(source: string, operations: PlannedPatchOperation[]) {
  let chapterText = source
  const descending = [...operations].sort((left, right) => (
    right.start - left.start
    || right.end - left.end
    || right.order - left.order
  ))
  for (const operation of descending) {
    chapterText = `${chapterText.slice(0, operation.start)}${operation.replacementText}${chapterText.slice(operation.end)}`
  }
  return chapterText
}

export function applySurgicalRevisionPatch(originalText: string, payload: any) {
  const fullText = firstPatchText(payload?.chapter_text, payload?.prose_chapters?.[0]?.chapter_text)
  if (fullText) {
    return { chapterText: fullText, applied: [{ type: 'full_text', chars: fullText.length }], unapplied: [] as any[] }
  }

  const openingRewrite = firstPatchText(
    payload?.opening_rewrite,
    payload?.opening_text,
    payload?.new_opening,
    payload?.prose_chapters?.[0]?.opening_rewrite,
  )
  if (openingRewrite) {
    const source = String(originalText || '')
    const keepFrom = firstAnchorText(
      payload?.keep_from,
      payload?.keep_from_anchor,
      payload?.resume_from,
      payload?.resume_anchor,
      payload?.keep_tail_from,
    )
    if (keepFrom) {
      const match = findPatchAnchor(source, keepFrom)
      if (match.index < 0) {
        return {
          chapterText: source,
          applied: [] as any[],
          unapplied: [{
            type: 'opening_rewrite',
            reason: match.reason === 'anchor_not_unique' ? 'keep_from_not_unique' : 'keep_from_not_found',
            keep_from: String(keepFrom).slice(0, 120),
          }],
        }
      }
      const chapterText = `${openingRewrite.replace(/\s+$/g, '')}\n\n${source.slice(match.index)}`
      return {
        chapterText,
        applied: [{ type: 'opening_rewrite', chars: openingRewrite.length, keep_from: match.anchor.slice(0, 80), match: match.match }],
        unapplied: [] as any[],
      }
    }

    const cut = Math.min(Math.max(900, Math.floor(source.length * 0.28)), 1800, Math.max(0, source.length - 400))
    const chapterText = source.length > cut
      ? `${openingRewrite.replace(/\s+$/g, '')}\n\n${source.slice(cut).replace(/^\s+/, '')}`
      : openingRewrite
    return {
      chapterText,
      applied: [{ type: 'opening_rewrite', chars: openingRewrite.length, keep_from: cut ? `offset:${cut}` : 'full', match: 'offset_cut' }],
      unapplied: [] as any[],
    }
  }

  const source = String(originalText || '')
  const planned: PlannedPatchOperation[] = []
  const unapplied: any[] = []
  const replacements = asArray(payload?.replacements || payload?.replace || payload?.patches)
  for (const [index, item] of replacements.entries()) {
    const find = firstAnchorText(item?.find, item?.old_text, item?.original, item?.target)
    const replace = firstReplacementText(item?.replace, item?.new_text, item?.replacement, item?.text)
    if (!find || replace === null) {
      unapplied.push({ type: 'replacement', reason: 'missing_find_or_replace', item })
      continue
    }
    const match = findPatchAnchor(source, find)
    if (match.index < 0) {
      unapplied.push({ type: 'replacement', reason: match.reason || 'anchor_not_found', find: find.slice(0, 120) })
      continue
    }
    planned.push({
      order: index,
      type: 'replacement',
      start: match.index,
      end: match.index + match.anchor.length,
      anchorStart: match.index,
      anchorEnd: match.index + match.anchor.length,
      replacementText: replace,
      applied: { type: 'replacement', match: match.match, find: match.anchor.slice(0, 80), replace: replace.slice(0, 80) },
      failure: { type: 'replacement', find: find.slice(0, 120) },
    })
  }

  const insertions = asArray(payload?.insertions || payload?.insert)
  for (const [index, item] of insertions.entries()) {
    const text = firstPatchText(item?.text, item?.insert, item?.content)
    const anchor = firstPatchText(item?.anchor, item?.after, item?.before, item?.near)
    const position = String(item?.position || (item?.before ? 'before' : 'after')).toLowerCase()
    if (!text) {
      unapplied.push({ type: 'insertion', reason: 'missing_text', item })
      continue
    }
    if (!anchor) {
      const prepend = position === 'start' || position === 'before'
      planned.push({
        order: replacements.length + index,
        type: 'insertion',
        start: prepend ? 0 : source.length,
        end: prepend ? 0 : source.length,
        replacementText: prepend ? `${text}\n\n` : `\n\n${text}`,
        applied: { type: 'insertion', position: 'append_or_prepend', text: text.slice(0, 80) },
        failure: { type: 'insertion', text: text.slice(0, 120) },
      })
      continue
    }
    const match = findPatchAnchor(source, anchor)
    if (match.index < 0) {
      unapplied.push({ type: 'insertion', reason: match.reason || 'anchor_not_found', anchor: anchor.slice(0, 120), text: text.slice(0, 120) })
      continue
    }
    const offset = position === 'before' ? match.index : match.index + match.anchor.length
    const prefix = position === 'before' ? '' : '\n\n'
    const suffix = position === 'before' ? '\n\n' : ''
    planned.push({
      order: replacements.length + index,
      type: 'insertion',
      start: offset,
      end: offset,
      anchorStart: match.index,
      anchorEnd: match.index + match.anchor.length,
      replacementText: `${prefix}${text}${suffix}`,
      applied: { type: 'insertion', position, match: match.match, anchor: match.anchor.slice(0, 80), text: text.slice(0, 80) },
      failure: { type: 'insertion', anchor: anchor.slice(0, 120), text: text.slice(0, 120) },
    })
  }

  const overlapping = new Set<number>()
  for (let left = 0; left < planned.length; left += 1) {
    for (let right = left + 1; right < planned.length; right += 1) {
      if (!plannedOperationsOverlap(planned[left], planned[right])) continue
      overlapping.add(left)
      overlapping.add(right)
    }
  }
  for (const index of [...overlapping].sort((left, right) => planned[left].order - planned[right].order)) {
    unapplied.push({ ...planned[index].failure, reason: 'anchor_overlap' })
  }

  if (unapplied.length) return { chapterText: source, applied: [] as any[], unapplied }
  const chapterText = assemblePlannedPatches(source, planned)
  const applied = [...planned].sort((left, right) => left.order - right.order).map(operation => operation.applied)
  return { chapterText, applied, unapplied }
}

export function revisionTextHash(text: string) {
  return createHash('sha256').update(String(text || '')).digest('hex')
}

function admissionError(code: string, message: string, diagnostics: Record<string, unknown> = {}) {
  return new RevisionCandidateAdmissionError(code, message, diagnostics)
}

function compactTransportDiagnostics(result: any, error?: any) {
  const raw = result?.raw && typeof result.raw === 'object' ? result.raw : null
  const usageSource = result?.usage || raw?.usage || raw?.response?.usage
  const usage = usageSource && typeof usageSource === 'object'
    ? Object.fromEntries(
      ['input_tokens', 'prompt_tokens', 'output_tokens', 'completion_tokens', 'total_tokens', 'cached_tokens']
        .filter(key => Number.isFinite(Number(usageSource[key])) && Number(usageSource[key]) >= 0)
        .map(key => [key, Math.floor(Number(usageSource[key]))]),
    )
    : null
  const finishReason = String(
    error?.finish_reason
    || result?.finish_reason
    || raw?.finish_reason
    || raw?.stop_reason
    || raw?.status
    || raw?.choices?.[0]?.finish_reason
    || '',
  ).trim().toLowerCase()
  return {
    finish_reason: finishReason,
    incomplete_reason: error?.incomplete_reason || null,
    incomplete_details_present: Boolean(error?.incomplete_details_present),
    usage: usage && Object.keys(usage).length ? usage : null,
    content_length: extractLLMText(result).length,
  }
}

function normalizeTransportAdmissionError(error: any, result: any) {
  const code = String(error?.code || 'PROSE_REVISION_TRUNCATED')
  const normalized = admissionError(
    code,
    '正文修订输出不完整，不能作为完整章节正文入库',
    compactTransportDiagnostics(result, error),
  ) as RevisionCandidateAdmissionError & {
    admission_status?: unknown
    admission_failure?: unknown
  }
  if (error?.admission_status !== undefined) normalized.admission_status = error.admission_status
  if (error?.admission_failure !== undefined) normalized.admission_failure = error.admission_failure
  return normalized
}

function providerTransportFailure(result: any) {
  const error = result?.error || result?.raw?.error || result?.raw?.response?.error
  const status = String(
    result?.status
    || result?.raw?.status
    || result?.raw?.response?.status
    || '',
  ).trim().toLowerCase().replace(/[\s-]+/g, '_')
  const failedStatus = /^(?:error|failed|failure|timeout|timed_out|aborted|cancelled|canceled|incomplete)$/.test(status)
  const failedFlag = result?.timeout === true
    || result?.timed_out === true
    || result?.aborted === true
    || result?.raw?.timeout === true
    || result?.raw?.timed_out === true
    || result?.raw?.aborted === true
  if (!error && !failedStatus && !failedFlag) return null
  return admissionError(
    'PROSE_REVISION_TRUNCATED',
    '正文修订传输失败，不能作为完整章节正文入库',
    compactTransportDiagnostics(result),
  )
}

function outputItemContainsProse(item: any) {
  const type = String(item?.type || '').trim().toLowerCase()
  if (['output_text', 'text'].includes(type)) {
    return Boolean(String(item?.text || item?.content || item?.value || '').trim())
  }
  if (type === 'message' && typeof item?.content === 'string') return Boolean(item.content.trim())
  if (!Array.isArray(item?.content)) return false
  return item.content.some((part: any) => (
    ['output_text', 'text'].includes(String(part?.type || '').trim().toLowerCase())
    && Boolean(String(part?.text || part?.content || part?.value || '').trim())
  ))
}

function hasUsableProseTransportBody(result: any) {
  const rawOutput = Array.isArray(result?.raw?.output)
    ? result.raw.output
    : Array.isArray(result?.raw?.response?.output)
      ? result.raw.response.output
      : []
  if (rawOutput.length && !rawOutput.some(outputItemContainsProse)) return false

  const structuredPayload = [result?.output, result?.parsed]
    .some(value => value && typeof value === 'object' && !Array.isArray(value))
  if (structuredPayload) return true

  return Boolean(extractLLMText(result).trim())
}

function assertNoRevisionWrapper(chapterText: string, rawText: string) {
  const prose = String(chapterText || '').trim()
  const raw = String(rawText || '').trim()
  const leadingChatWrapper = /^(?:以下(?:是|为)?(?:修订稿|修订结果)|(?:修订稿|修订结果)(?:如下所示|如下)?)/
  const codeFence = /```/
  const jsonProseShell = (/^\{[\s\S]*\}$/.test(prose) || /^\[[\s\S]*\]$/.test(prose))
  if (codeFence.test(prose) || codeFence.test(raw) || leadingChatWrapper.test(prose) || leadingChatWrapper.test(raw) || jsonProseShell) {
    throw admissionError('REVISION_OUTPUT_WRAPPER', '修订候选包含代码块、聊天说明或 JSON 正文外壳')
  }
}

function assertCompleteRevisionEnding(chapterText: string) {
  const proseEnding = String(chapterText || '')
    .trimEnd()
    .replace(/[”’」』）》】]+$/g, '')
    .trimEnd()
  if (!/[。！？!?….]$/.test(proseEnding)) {
    throw admissionError('REVISION_INCOMPLETE_ENDING', '修订候选没有完整的正文结尾')
  }
}

export function admitRevisionCandidate(input: { sourceText: string; result: any }): RevisionCandidateAdmission {
  try {
    assertCompleteProseTransportResult(input.result, 'PROSE_REVISION_TRUNCATED')
  } catch (error) {
    throw normalizeTransportAdmissionError(error, input.result)
  }
  const transportError = providerTransportFailure(input.result)
  if (transportError) throw transportError
  if (!hasUsableProseTransportBody(input.result)) {
    throw admissionError('REVISION_NO_PROSE_BODY', '修订结果没有可用正文', compactTransportDiagnostics(input.result))
  }

  const payload = getNovelPayload(input.result)
  if (payload.recovered_from_partial_json || payload.partial_json_open_string_recovered) {
    throw admissionError('REVISION_PARTIAL_JSON_RECOVERY', '修订结果来自不完整 JSON 恢复')
  }

  const patch = applySurgicalRevisionPatch(input.sourceText, payload)
  const patchDiagnostics = {
    applied_patch_count: patch.applied.length,
    unapplied_patch_count: patch.unapplied.length,
    unapplied_patch_reasons: patch.unapplied.map((item: any) => ({
      type: String(item?.type || ''),
      reason: String(item?.reason || ''),
    })),
  }
  if (patch.unapplied.length) {
    throw admissionError('REVISION_PATCH_INCOMPLETE', '修订补丁未完整应用', patchDiagnostics)
  }
  if (!patch.applied.length) {
    throw admissionError('REVISION_NO_APPLICABLE_PATCH', '修订未返回可应用正文', patchDiagnostics)
  }

  const sourceCharCount = countProseChars(input.sourceText)
  const candidateCharCount = countProseChars(patch.chapterText)
  const minimumCharCount = Math.max(800, Math.ceil(sourceCharCount * 0.70))
  const maximumCharCount = Math.floor(sourceCharCount * 1.30)
  const diagnostics = {
    source_char_count: sourceCharCount,
    candidate_char_count: candidateCharCount,
    minimum_char_count: minimumCharCount,
    maximum_char_count: maximumCharCount,
    ...patchDiagnostics,
  }
  if (candidateCharCount < minimumCharCount) {
    throw admissionError('REVISION_CANDIDATE_TOO_SHORT', '修订候选明显短于原文', diagnostics)
  }
  if (candidateCharCount > maximumCharCount) {
    throw admissionError('REVISION_CANDIDATE_TOO_LONG', '修订候选明显长于原文', diagnostics)
  }

  assertNoRevisionWrapper(patch.chapterText, extractLLMText(input.result))
  assertCompleteRevisionEnding(patch.chapterText)

  return {
    chapterText: patch.chapterText,
    candidateHash: revisionTextHash(patch.chapterText),
    sourceCharCount,
    candidateCharCount,
    minimumCharCount,
    maximumCharCount,
    appliedPatches: patch.applied,
    diagnostics,
  }
}
