export type ProseAdmissionStatus = 'accepted' | 'accepted_with_warnings' | 'blocked_invalid'

export type ProseAdmissionWarningSource =
  | 'quality'
  | 'word_target'
  | 'story_state'
  | 'review'
  | 'memory'
  | 'post_commit'

export type ProseAdmissionHardFailureSource =
  | 'prose_shape'
  | 'transport'
  | 'canonical_continuity'
  | 'safety'
  | 'atomic'

export type ProseAdmissionWarning = {
  code: string
  source: ProseAdmissionWarningSource
  message: string
  details?: any
}

export type ProseAdmissionHardFailure = {
  code: string
  source: ProseAdmissionHardFailureSource
  message: string
  details?: any
}

export type ProseAdmissionDecision = {
  status: ProseAdmissionStatus
  hard_failures: ProseAdmissionHardFailure[]
  warnings: ProseAdmissionWarning[]
}

function deduplicateEvidence<T extends { source: string; code: string; message: string }>(items: T[]) {
  const seen = new Set<string>()
  return items.filter(item => {
    const fingerprint = `${item.source}\u0000${item.code}\u0000${item.message}`
    if (seen.has(fingerprint)) return false
    seen.add(fingerprint)
    return true
  })
}

export function classifyProseAdmission(input: {
  hard_failures?: ProseAdmissionHardFailure[]
  warnings?: ProseAdmissionWarning[]
}): ProseAdmissionDecision {
  const hardFailures = deduplicateEvidence(Array.isArray(input?.hard_failures) ? input.hard_failures : [])
  const warnings = deduplicateEvidence(Array.isArray(input?.warnings) ? input.warnings : [])
  const status: ProseAdmissionStatus = hardFailures.length
    ? 'blocked_invalid'
    : warnings.length
      ? 'accepted_with_warnings'
      : 'accepted'

  return {
    status,
    hard_failures: hardFailures,
    warnings,
  }
}

function proseShapeFailure(
  code: string,
  message: string,
  details?: any,
): ProseAdmissionHardFailure {
  return {
    code,
    source: 'prose_shape',
    message,
    ...(details === undefined ? {} : { details }),
  }
}

function isTitleOnly(text: string) {
  return text.length <= 80 && /^(?:第.{0,24}[章节回幕卷集篇]|chapter\s+\d+)(?:[：:].*)?$/i.test(text)
}

function isLabelOnly(text: string) {
  return /^(?:(?:小说|章节)?正文(?:内容)?|标题|章节|内容)[：:]?$/.test(text)
}

function payloadSegments(text: string) {
  return text
    .split(/[。！？!?]+/)
    .map(item => item.trim().replace(/^[“”「」『』'"\s]+/, ''))
    .filter(Boolean)
}

function isDominatedBy(text: string, predicate: (segment: string) => boolean) {
  const segments = payloadSegments(text)
  if (!segments.length) return false
  const matching = segments.filter(predicate).length
  return matching > 0 && matching / segments.length >= 0.6
}

function isExplanationOnly(text: string) {
  return isDominatedBy(text, segment => (
    /^(?:好的[，,]?|当然可以[，,]?)?(?:下面|以下)(?:是|为).{0,80}(?:生成|创作|提供|整理)/.test(segment)
    || /^(?:好的[，,]?|当然可以[，,]?).{0,60}(?:生成|创作|提供|整理).{0,40}(?:小说|章节|正文|结果)/.test(segment)
  ))
}

function isErrorPayload(text: string) {
  return isDominatedBy(text, segment => (
    /^(?:(?:生成|写作|请求|模型|系统).{0,24}(?:失败|错误|异常|超时)|抱歉.{0,40}(?:不能|无法|不可提供|请稍后重试)|(?:模型|系统).{0,24}(?:不能|无法|不可提供)|(?:error|failed|failure)\b)/i.test(segment)
  ))
}

function isLabelDominantPayload(text: string) {
  const entries = text
    .split(/[\n。；;]+/)
    .map(item => item.trim())
    .filter(Boolean)
  if (entries.length < 2) return false
  const labels = entries.filter(entry => (
    /^(?:标题|角色|人物|地点|时间|摘要|场景|大纲|类型|视角|章节|正文)[：:]/.test(entry)
  )).length
  return labels >= 2 && labels / entries.length >= 0.6
}

function parsesAsJsonContainer(candidate: string) {
  try {
    const parsed = JSON.parse(candidate)
    return parsed !== null && typeof parsed === 'object'
  } catch {
    return false
  }
}

function findJsonContainerEnd(text: string, start: number) {
  const opening = text[start]
  if (opening !== '{' && opening !== '[') return -1
  const stack: string[] = [opening === '{' ? '}' : ']']
  let inString = false
  let escaped = false

  for (let index = start + 1; index < text.length; index += 1) {
    const char = text[index]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }
    if (char === '"') {
      inString = true
    } else if (char === '{') {
      stack.push('}')
    } else if (char === '[') {
      stack.push(']')
    } else if (char === '}' || char === ']') {
      if (stack.at(-1) !== char) return -1
      stack.pop()
      if (!stack.length) return index
    }
  }
  return -1
}

function isApprovedJsonPrefix(prefix: string) {
  const unwrapped = prefix.trim().replace(/```(?:json)?\s*$/i, '').trim()
  if (!unwrapped) return true
  if (/^(?:\[结果\]|【结果】|结果)\s*[：:]?$/.test(unwrapped)) return true
  return /^(?:好的[，,]?\s*)?(?:(?:以下|下面)(?:是|为)?\s*)?(?:json|结构化结果|输出结果|结果)(?:如下)?\s*[：:]?$/i.test(unwrapped)
}

function isApprovedJsonSuffix(suffix: string) {
  const unwrapped = suffix.trim().replace(/^```\s*/, '').trim()
  return !unwrapped || /^以上(?:是|为).{0,20}(?:结果|内容)[。.]?$/.test(unwrapped)
}

function isJsonLikePayload(text: string) {
  const trimmed = text.trim()
  for (let start = 0; start < trimmed.length; start += 1) {
    if (trimmed[start] !== '{' && trimmed[start] !== '[') continue
    const end = findJsonContainerEnd(trimmed, start)
    if (end < 0) continue
    const candidate = trimmed.slice(start, end + 1)
    if (
      parsesAsJsonContainer(candidate)
      && isApprovedJsonPrefix(trimmed.slice(0, start))
      && isApprovedJsonSuffix(trimmed.slice(end + 1))
    ) return true
  }
  return false
}

export function validateMinimalChapterProse(text: any): {
  valid: boolean
  failures: ProseAdmissionHardFailure[]
} {
  const rawText = String(text ?? '').replace(/\r\n?/g, '\n').trim()
  const normalized = rawText.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    return {
      valid: false,
      failures: [proseShapeFailure('prose_empty', 'Chapter prose is empty.')],
    }
  }

  const failures: ProseAdmissionHardFailure[] = []
  const nonWhitespaceChars = normalized.replace(/\s+/g, '').length
  const sentenceTerminators = normalized.match(/[。！？!?]/g)?.length || 0

  if (nonWhitespaceChars < 200) {
    failures.push(proseShapeFailure(
      'prose_too_short',
      'Chapter prose must contain at least 200 non-whitespace characters.',
      { non_whitespace_chars: nonWhitespaceChars, minimum: 200 },
    ))
  }
  if (isTitleOnly(normalized)) {
    failures.push(proseShapeFailure('prose_title_only', 'Generated payload contains only a chapter title.'))
  }
  if (isLabelOnly(normalized)) {
    failures.push(proseShapeFailure('prose_label_only', 'Generated payload contains only a prose label.'))
  }
  if (isLabelDominantPayload(rawText)) {
    failures.push(proseShapeFailure('prose_label_only', 'Generated payload is dominated by labeled metadata instead of chapter prose.'))
  }
  if (isExplanationOnly(normalized)) {
    failures.push(proseShapeFailure('prose_explanation_only', 'Generated payload contains an explanation instead of chapter prose.'))
  }
  if (isErrorPayload(normalized)) {
    failures.push(proseShapeFailure('prose_error_payload', 'Generated payload contains an error message instead of chapter prose.'))
  }
  if (isJsonLikePayload(normalized)) {
    failures.push(proseShapeFailure('prose_json_payload', 'Generated payload is JSON-like instead of chapter prose.'))
  }
  if (sentenceTerminators < 4) {
    failures.push(proseShapeFailure(
      'prose_too_few_sentences',
      'Chapter prose must contain at least four sentence terminators.',
      { sentence_terminators: sentenceTerminators, minimum: 4 },
    ))
  }

  return {
    valid: failures.length === 0,
    failures,
  }
}

function messageFromUnknown(error: any, failure: ProseAdmissionHardFailure) {
  if (typeof error === 'string' && error.trim()) return error
  try {
    if (typeof error?.message === 'string' && error.message.trim()) return error.message
  } catch {
    // Fall through to the curated failure message.
  }
  return failure.message
}

function causeFromUnknown(error: any) {
  try {
    return error?.cause
  } catch {
    return undefined
  }
}

export function markBlockedInvalidError(
  error: any,
  failure: ProseAdmissionHardFailure,
): Error & {
  admission_status: 'blocked_invalid'
  admission_failure: ProseAdmissionHardFailure
} {
  const candidate = error instanceof Error
    ? error
    : new Error(messageFromUnknown(error, failure))
  const safeMessage = messageFromUnknown(candidate, failure)
  const cause = causeFromUnknown(candidate)

  try {
    return Object.assign(candidate, {
      admission_status: 'blocked_invalid' as const,
      admission_failure: failure,
    })
  } catch {
    const fallback = new Error(safeMessage)
    if (cause !== undefined) fallback.cause = cause
    return Object.assign(fallback, {
      admission_status: 'blocked_invalid' as const,
      admission_failure: failure,
    })
  }
}
