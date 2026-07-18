import { selectContinuitySafeProseCandidate } from './prose-candidate-continuity'
import type {
  ProseQualityDecision,
  ProseQualityFinding,
} from './prose-quality-loop-core'
import {
  MAX_PROSE_QUALITY_EVIDENCE_CHARS,
  REQUIRED_QUALITY_DIMENSIONS,
  buildProseQualityDecision,
  classifyProseQualityBlockingFindings,
  compactQualityText,
  deterministicAdvisoryFindings,
  normalizeProseQualityReview,
  uniqueProseQualityFindings,
} from './prose-quality-loop-core'
import {
  buildFocusedProseReviewPrompt,
  buildFocusedProseRevisionPrompt,
  isUsableProseQualityReviewPayload,
} from './prose-quality-loop-prompts'

export function proseQualityReviewMaxTokensForAttempt(attempt: number) {
  const rawAttempt = Number(attempt)
  return Number.isFinite(rawAttempt) && rawAttempt >= 2 ? 10_000 : 5_000
}

function deterministicFindings(scan: any): ProseQualityFinding[] {
  const failures = Array.isArray(scan?.hard_failures) ? scan.hard_failures : []
  return failures.slice(0, 6).map((item: any, index: number) => {
    const key = compactQualityText(item?.key || `deterministic_${index + 1}`, 100)
    return {
      key,
      severity: 'S1',
      dimension: /fact|setting|language|non_chinese/i.test(key)
        ? 'fact_setting_safety'
        : 'prose_style',
      evidence: compactQualityText(item?.evidence || item?.message || item?.key),
      required_change: compactQualityText(item?.required_change || item?.fix || item?.message || '修复确定性硬失败'),
      acceptance_test: `重新运行确定性扫描后不再出现 ${key}`,
    }
  })
}

const CRAFT_ADVISORY_REVISION_KEY_PATTERN = /^(?:paragraph_wall_text_line_|paragraph_comma_chain_density_line_|prose_static_environment$|prose_decorative_detail$)/

function deterministicCraftAdvisoryFindings(scan: any): ProseQualityFinding[] {
  const findings = deterministicAdvisoryFindings(scan)
    .filter((item: any) => CRAFT_ADVISORY_REVISION_KEY_PATTERN.test(compactQualityText(item?.key || item?.pattern, 100)))
    .map((item: any, index: number): ProseQualityFinding | null => {
      const key = compactQualityText(item?.key || item?.pattern || `craft_advisory_${index + 1}`, 100)
      const evidence = compactQualityText(item?.evidence, MAX_PROSE_QUALITY_EVIDENCE_CHARS)
      const requiredChange = compactQualityText(item?.fix || item?.message, 500)
      if (!key || !evidence || !requiredChange) return null
      return {
        key,
        severity: 'S3',
        dimension: 'prose_style',
        evidence,
        required_change: requiredChange,
        acceptance_test: `重新运行确定性 craft 扫描后不再出现 ${key}；人物、事件、因果和章节承接保持不变`,
      }
    })
    .filter((item: ProseQualityFinding | null): item is ProseQualityFinding => Boolean(item))
  return uniqueProseQualityFindings(findings).slice(0, 5)
}

function proseQualityDiagnosticType(value: any) {
  if (value === undefined) return 'missing'
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'other'
}

function normalizeProseQualityDiagnosticType(value: any) {
  return ['missing', 'null', 'array', 'object', 'string', 'number', 'boolean', 'other'].includes(value)
    ? value
    : 'other'
}

function normalizeProseQualityCallbackErrorKind(error: any) {
  if (error?.quality_error_kind === 'invalid_payload') return 'invalid_payload'
  const name = typeof error?.name === 'string' ? error.name.trim().toLowerCase() : ''
  const code = typeof error?.code === 'string' ? error.code.trim().toLowerCase() : ''
  const message = typeof error?.message === 'string' ? error.message.toLowerCase() : ''
  if (['aborterror', 'aborted', 'abort_err'].includes(name) || ['aborted', 'abort_err'].includes(code)) return 'aborted'
  if (['timeouterror', 'timeout'].includes(name) || ['etimedout', 'timeout'].includes(code) || /\btime(?:d)?\s*out\b/.test(message)) {
    return 'timeout'
  }
  return 'callback_error'
}

function sanitizeProseQualityReviewAttemptDiagnostic(value: any) {
  const fieldTypes = value?.field_types && typeof value.field_types === 'object' && !Array.isArray(value.field_types)
    ? value.field_types
    : {}
  const dimensionTypes = value?.dimension_types && typeof value.dimension_types === 'object' && !Array.isArray(value.dimension_types)
    ? value.dimension_types
    : {}
  return {
    attempt: value?.attempt === 2 ? 2 : 1,
    payload_type: normalizeProseQualityDiagnosticType(value?.payload_type),
    field_types: {
      score: normalizeProseQualityDiagnosticType(fieldTypes.score),
      score_scale: normalizeProseQualityDiagnosticType(fieldTypes.score_scale),
      dimensions: normalizeProseQualityDiagnosticType(fieldTypes.dimensions),
      findings: normalizeProseQualityDiagnosticType(fieldTypes.findings),
      publishable: normalizeProseQualityDiagnosticType(fieldTypes.publishable),
    },
    dimension_types: Object.fromEntries(REQUIRED_QUALITY_DIMENSIONS.map(key => [
      key,
      normalizeProseQualityDiagnosticType(dimensionTypes[key]),
    ])),
    missing_dimensions: REQUIRED_QUALITY_DIMENSIONS.filter(key => Array.isArray(value?.missing_dimensions) && value.missing_dimensions.includes(key)),
    transport: sanitizeProseQualityReviewTransport(value?.transport),
  }
}

function compactProseQualityWarningDiagnostics(error: any) {
  const reviewAttempts = Array.isArray(error?.review_attempts)
    ? error.review_attempts.slice(0, 2).map(sanitizeProseQualityReviewAttemptDiagnostic)
    : []
  return {
    kind: normalizeProseQualityCallbackErrorKind(error),
    field_types: {
      name: proseQualityDiagnosticType(error?.name),
      message: proseQualityDiagnosticType(error?.message),
      code: proseQualityDiagnosticType(error?.code),
    },
    ...(reviewAttempts.length ? { review_attempts: reviewAttempts } : {}),
  }
}

function isAbortLikeProseQualityError(error: any) {
  const name = String(error?.name || '').trim().toLowerCase()
  const code = String(error?.code || '').trim().toLowerCase()
  const message = String(error?.message || '').trim().toLowerCase()
  return name === 'aborterror'
    || ['abort_err', 'aborted', 'err_canceled', 'err_cancelled', 'request_canceled', 'request_cancelled'].includes(code)
    || /(?:request|operation) (?:was )?(?:canceled|cancelled|aborted)/.test(message)
}

function deterministicProseQualityHardFailures(scan: any): ProseQualityDecision['hard_failures'] {
  return (Array.isArray(scan?.hard_failures) ? scan.hard_failures : []).map((item: any) => ({
    key: compactQualityText(item?.key || 'deterministic_prose', 100),
    message: compactQualityText(item?.message || item?.evidence || item?.fix || item?.key || '确定性正文检查未通过'),
    source: 'deterministic' as const,
  }))
}

function normalizeProseQualityFinishReason(value: any) {
  const reason = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (['stop', 'end_turn', 'stop_sequence', 'completed'].includes(reason)) return 'stop'
  if (['length', 'max_tokens', 'max_output_tokens'].includes(reason)) return 'length'
  if (['content_filter', 'safety', 'recitation', 'blocklist', 'prohibited_content', 'spii', 'image_safety'].includes(reason)) {
    return 'content_filter'
  }
  if (['tool_calls', 'tool_use', 'function_call', 'malformed_function_call', 'unexpected_tool_call'].includes(reason)) {
    return 'tool_calls'
  }
  if (['error', 'failed'].includes(reason)) return 'error'
  if (['cancelled', 'canceled', 'aborted'].includes(reason)) return 'cancelled'
  return 'unknown'
}

export function sanitizeProseQualityReviewTransport(value: any) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const usageSource = value.usage && typeof value.usage === 'object' && !Array.isArray(value.usage)
    ? value.usage
    : null
  const usage = Object.fromEntries(
    ['input_tokens', 'output_tokens', 'total_tokens']
      .filter(key => typeof usageSource?.[key] === 'number' && Number.isFinite(usageSource[key]) && usageSource[key] >= 0)
      .map(key => [key, Math.floor(usageSource[key])]),
  )
  const contentLength = typeof value.content_length === 'number'
    && Number.isFinite(value.content_length)
    && value.content_length >= 0
    ? Math.floor(value.content_length)
    : null
  return {
    finish_reason: normalizeProseQualityFinishReason(value.finish_reason),
    ...(Object.keys(usage).length ? { usage } : {}),
    ...(contentLength != null ? { content_length: contentLength } : {}),
  }
}

function diagnoseProseQualityReviewPayload(value: any, attempt: number) {
  const objectValue = value && typeof value === 'object' && !Array.isArray(value) ? value : null
  const dimensions = objectValue?.dimensions && typeof objectValue.dimensions === 'object' && !Array.isArray(objectValue.dimensions)
    ? objectValue.dimensions
    : null
  return {
    attempt,
    payload_type: proseQualityDiagnosticType(value),
    field_types: {
      score: proseQualityDiagnosticType(objectValue?.score),
      score_scale: proseQualityDiagnosticType(objectValue?.score_scale ?? objectValue?.scoreScale),
      dimensions: proseQualityDiagnosticType(objectValue?.dimensions),
      findings: proseQualityDiagnosticType(objectValue?.findings),
      publishable: proseQualityDiagnosticType(objectValue?.publishable),
    },
    dimension_types: Object.fromEntries(REQUIRED_QUALITY_DIMENSIONS.map(key => [
      key,
      proseQualityDiagnosticType(dimensions && Object.prototype.hasOwnProperty.call(dimensions, key) ? dimensions[key] : undefined),
    ])),
    missing_dimensions: REQUIRED_QUALITY_DIMENSIONS.filter(key => !dimensions || !Object.prototype.hasOwnProperty.call(dimensions, key)),
    transport: sanitizeProseQualityReviewTransport(objectValue?.__quality_review_transport),
  }
}

async function requestUsableProseQualityReview(
  review: (input: { text: string; scan: any; round: number; prompt: string; attempt: number }) => Promise<any>,
  request: { text: string; scan: any; round: number; prompt: string },
) {
  const invalidAttempts: any[] = []
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let payload: any
    try {
      payload = await review({ ...request, attempt })
    } catch (error: any) {
      if (invalidAttempts.length && error && typeof error === 'object') {
        error.review_attempts = invalidAttempts
      }
      throw error
    }
    if (isUsableProseQualityReviewPayload(payload)) return payload
    invalidAttempts.push(diagnoseProseQualityReviewPayload(payload, attempt))
  }
  throw Object.assign(new Error('missing six-dimension review payload'), {
    quality_error_kind: 'invalid_payload',
    review_attempts: invalidAttempts,
  })
}

export async function runProseQualityLoop(input: {
  initialText: string
  minScore: number
  coreContract?: any
  continuityContext?: any
  maxRevisionRounds?: number
  scan: (text: string) => any | Promise<any>
  review: (input: { text: string; scan: any; round: number; prompt: string; attempt: number }) => Promise<any>
  revise: (input: {
    text: string
    review: any
    blockingFindings: ProseQualityFinding[]
    round: number
    prompt: string
  }) => Promise<any>
}) {
  const maxRounds = Math.min(1, Math.max(0, Number(input.maxRevisionRounds ?? 1)))
  const rounds: any[] = []
  let qualityWarning: any = null
  let finalText = String(input.initialText || '')
  let scan = await input.scan(finalText)
  let initialPayload: any
  try {
    initialPayload = await requestUsableProseQualityReview(input.review, {
      text: finalText,
      scan,
      round: 0,
      prompt: buildFocusedProseReviewPrompt({
        coreContract: input.coreContract,
        chapterText: finalText,
        deterministicScan: scan,
      }),
    })
  } catch (error) {
    if (isAbortLikeProseQualityError(error)) throw error
    const message = 'quality_review_unavailable：正文独立质检不可用，已保留完整正文'
    const review = normalizeProseQualityReview(null)
    const hardFailures = deterministicProseQualityHardFailures(scan)
    return {
      final_text: finalText,
      final_scan: scan,
      final_review: review,
      decision: {
        passed: false,
        approvable: hardFailures.length === 0,
        score: 0,
        min_score: Number.isFinite(Number(input.minScore)) ? Number(input.minScore) : 0,
        hard_failures: hardFailures,
        advisory_failures: [message],
      },
      rounds,
      quality_warning: {
        code: 'quality_review_unavailable',
        source: 'review',
        message,
        details: { diagnostics: compactProseQualityWarningDiagnostics(error) },
      },
    }
  }
  let review = normalizeProseQualityReview(initialPayload)
  let classification = classifyProseQualityBlockingFindings(review, finalText, scan)
  let decision = buildProseQualityDecision({
    chapterText: finalText,
    review,
    deterministicScan: scan,
    minScore: input.minScore,
    classification,
  })

  for (let round = 1; round <= maxRounds; round += 1) {
    const craftAdvisoryFindings = deterministicCraftAdvisoryFindings(scan)
    if (decision.passed && craftAdvisoryFindings.length === 0) break
    const blockingFindings = [
      ...deterministicFindings(scan),
      ...classification.blockingFindings,
      ...craftAdvisoryFindings,
    ].slice(0, 6)
    if (blockingFindings.length === 0) break

    let revision: any
    try {
      revision = await input.revise({
        text: finalText,
        review,
        blockingFindings,
        round,
        prompt: buildFocusedProseRevisionPrompt({
          coreContract: input.coreContract,
          chapterText: finalText,
          blockingFindings,
          round,
        }),
      })
    } catch (error: any) {
      if (
        isAbortLikeProseQualityError(error)
        || error?.admission_status === 'blocked_invalid'
        || ['PROSE_DRAFT_TRUNCATED', 'PROSE_REVISION_TRUNCATED'].includes(String(error?.code || ''))
      ) throw error
      const message = 'quality_revision_unavailable：可选正文修订不可用，已保留修订前的完整正文'
      decision = {
        ...decision,
        advisory_failures: Array.from(new Set([...decision.advisory_failures, message])),
      }
      qualityWarning = {
        code: 'quality_revision_unavailable',
        source: 'review',
        message,
        details: { diagnostics: compactProseQualityWarningDiagnostics(error) },
      }
      rounds.push({
        round,
        revision: { unavailable: true },
        selection: { accepted: false, reason: 'quality_revision_unavailable', text: finalText },
        normalization: null,
      })
      break
    }
    const usableSelection = selectUsableRevisionText(finalText, revision, {
      chapterNo: Number(input.coreContract?.chapter_no || input.coreContract?.chapterNo || 0),
      blockingFindings,
      candidateStage: 'quality_revision',
      previousChapterTail: input.coreContract?.previous_handoff || input.coreContract?.previousHandoff,
      sceneCards: input.coreContract?.scene_cards || input.coreContract?.sceneCards,
      continuityContext: input.continuityContext,
    })
    const continuitySelection = usableSelection.accepted
      ? selectContinuitySafeProseCandidate(finalText, usableSelection.text, input.continuityContext || input.coreContract, { candidate_stage: 'quality_revision' })
      : null
    const selection = continuitySelection?.accepted === false
      ? { ...usableSelection, accepted: false, reason: 'opening_continuity_regression', text: finalText, warning: continuitySelection.warning }
      : usableSelection
    const residueNormalization = selection.accepted
      ? normalizeProseQualityRepairResidue(selection.text)
      : null
    rounds.push({
      round,
      revision,
      selection,
      normalization: residueNormalization
        ? {
            change_count: residueNormalization.change_count || 0,
            rules: residueNormalization.rules || [],
          }
        : null,
    })
    if (!selection.accepted) {
      if (selection.warning) {
        decision = {
          ...decision,
          advisory_failures: Array.from(new Set([...decision.advisory_failures, selection.warning.message])),
        }
        qualityWarning = selection.warning
      }
      continue
    }

    finalText = residueNormalization?.text || selection.text
    scan = await input.scan(finalText)
    try {
      const recheckPayload = await requestUsableProseQualityReview(input.review, {
        text: finalText,
        scan,
        round,
        prompt: buildFocusedProseReviewPrompt({
          coreContract: input.coreContract,
          chapterText: finalText,
          deterministicScan: scan,
        }),
      })
      review = normalizeProseQualityReview(recheckPayload)
      classification = classifyProseQualityBlockingFindings(review, finalText, scan)
    } catch (error) {
      if (isAbortLikeProseQualityError(error)) throw error
      const message = `quality_recheck_unavailable：正文第 ${round} 轮修订后的独立复检不可用，已保留完整修订正文`
      const hardFailures = deterministicProseQualityHardFailures(scan)
      decision = {
        passed: false,
        approvable: hardFailures.length === 0,
        score: Number(review?.score || 0),
        min_score: Number.isFinite(Number(input.minScore)) ? Number(input.minScore) : 0,
        hard_failures: hardFailures,
        advisory_failures: Array.from(new Set([
          ...decision.advisory_failures,
          message,
        ])),
      }
      qualityWarning = {
        code: 'quality_recheck_unavailable',
        source: 'review',
        message,
        details: { diagnostics: compactProseQualityWarningDiagnostics(error) },
      }
      break
    }
    decision = buildProseQualityDecision({
      chapterText: finalText,
      review,
      deterministicScan: scan,
      minScore: input.minScore,
      classification,
    })
  }

  return {
    final_text: finalText,
    final_scan: scan,
    final_review: review,
    decision,
    rounds,
    ...(qualityWarning ? { quality_warning: qualityWarning } : {}),
  }
}
import { selectUsableRevisionText } from './prose-quality-contracts'
import { normalizeProseQualityRepairResidue } from './prose-format'
