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

function isExplanationOnly(text: string) {
  return /^(?:下面|以下)(?:是|为).{0,80}(?:生成|创作|提供).{0,40}(?:小说|章节|正文)/.test(text)
}

function isErrorPayload(text: string) {
  return /^(?:(?:生成|写作|请求|模型|系统).{0,24}(?:失败|错误|异常|超时)|抱歉.{0,40}(?:不能|无法|不可提供|请稍后重试)|(?:模型|系统).{0,24}(?:不能|无法|不可提供)|(?:error|failed|failure)\b)/i.test(text)
}

function isJsonLikePayload(text: string) {
  const unwrapped = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
  return (unwrapped.startsWith('{') && unwrapped.endsWith('}'))
    || (unwrapped.startsWith('[') && unwrapped.endsWith(']'))
}

export function validateMinimalChapterProse(text: any): {
  valid: boolean
  failures: ProseAdmissionHardFailure[]
} {
  const normalized = String(text ?? '').replace(/\s+/g, ' ').trim()
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

  try {
    return Object.assign(candidate, {
      admission_status: 'blocked_invalid' as const,
      admission_failure: failure,
    })
  } catch {
    return Object.assign(new Error(candidate.message), {
      admission_status: 'blocked_invalid' as const,
      admission_failure: failure,
    })
  }
}
