import {
  asArray,
  buildLLMResultDiagnostics,
  getNovelPayload,
} from '../../routes/novel-route-utils'
import {
  isAbortError,
  throwIfAborted,
} from './runtime-helpers'
import {
  buildProseReviewPrompt,
  buildProseRevisionPrompt,
} from './prose-self-review-prompts'
import {
  nextChapterQualityPlanNeedsRepair,
  shouldReviseProse,
} from './prose-self-review-policy'
import {
  buildFallbackNextChapterQualityPlan,
} from '../quality/prose-quality-risks'
import {
  mergeStructuredReviewFillPayload,
} from '../quality/review-fill'
import {
  hasReviewChecksNeedingRepair,
  missingStructuredReviewCheckFields,
} from '../quality/review-merge'
import {
  hasFailingReviewChecks,
} from '../quality/review-status'
import {
  revisionReceiptRemainingRisk,
} from '../quality/revision-receipt-risk'
import {
  buildNormalizedProseSelfReview,
} from './prose-self-review-run-normalize'
import {
  resolveProseRevisionOutcome,
} from './prose-self-review-run-revision'

export function createProseSelfReviewRunner(deps: {
  executeAgent: (...args: any[]) => any
  getStageModelId: (...args: any[]) => any
  getStageTemperature: (...args: any[]) => any
  fillMissingStructuredReviewChecks: (...args: any[]) => any
}) {
  const executeAgent = deps.executeAgent
  const getStageModelId = deps.getStageModelId
  const getStageTemperature = deps.getStageTemperature
  const fillMissingStructuredReviewChecks = deps.fillMissingStructuredReviewChecks

const runProseSelfReviewAndRevision = async (activeWorkspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options: any = {}) => {
  const reviewModelId = getStageModelId(project, 'review', modelId)
  const reviseModelId = getStageModelId(project, 'revise', modelId)
  const emitReviewProgress = async (phase: string, payload: any = {}) => {
    const callback = typeof options.onReviewProgress === 'function' ? options.onReviewProgress : null
    if (!callback) return
    await callback({
      phase,
      at: new Date().toISOString(),
      ...payload,
    })
  }
  const reviewMaxTokens = Math.max(5000, Math.min(9000, Number(
    options.reviewMaxTokens
    || options.review_max_tokens
    || (options.quality_gate_repair || options.deterministic_cleanup_repair ? 8000 : 6500),
  )))
  const reviewLlmTimeoutMs = Math.max(30000, Math.min(
    Number(options.llmTimeoutMs || options.timeoutMs || 600000) || 600000,
    Number(options.reviewLlmTimeoutMs || options.review_llm_timeout_ms || options.llmTimeoutMs || options.timeoutMs || 600000) || 600000,
  ))
  throwIfAborted(options)
  await emitReviewProgress('self_review_llm', {
    status: 'running',
    max_tokens: reviewMaxTokens,
    repair_mode: Boolean(options.quality_gate_repair || options.deterministic_cleanup_repair),
    review_llm_timeout_ms: reviewLlmTimeoutMs,
  })
  const reviewResult = await executeAgent('review-agent', project, {
    task: buildProseReviewPrompt(project, contextPackage, chapterText),
  }, {
    activeWorkspace,
    modelId: reviewModelId ? String(reviewModelId) : undefined,
    maxTokens: reviewMaxTokens,
    temperature: getStageTemperature(project, 'review', 0.2),
    skipMemory: true,
    signal: options.abortSignal,
    timeoutMs: reviewLlmTimeoutMs,
  })
  if ((reviewResult as any).error) {
    await emitReviewProgress('self_review_llm', {
      status: 'failed',
      error: String((reviewResult as any).error).slice(0, 240),
      llm_diagnostics: buildLLMResultDiagnostics(reviewResult),
    })
    throw Object.assign(new Error(String((reviewResult as any).error)), {
      code: 'PROSE_REVIEW_FAILED',
      llm_diagnostics: buildLLMResultDiagnostics(reviewResult),
    })
  }
  const reviewPayload = getNovelPayload(reviewResult)
  await emitReviewProgress('self_review_llm', {
    status: 'success',
    modelName: (reviewResult as any).modelName,
    raw_keys: Object.keys(reviewPayload || {}).slice(0, 20),
  })
  let normalizedReview = buildNormalizedProseSelfReview({
    project,
    contextPackage,
    chapterText,
    reviewPayload,
    reviewResult,
    options,
  })
  await emitReviewProgress('structured_review_fill', {
    status: 'running',
    missing_field_count: missingStructuredReviewCheckFields(normalizedReview).length,
    structured_review_llm_timeout_ms: Math.max(30000, Math.min(
      Number(options.llmTimeoutMs || options.timeoutMs || 600000) || 600000,
      Number(options.structuredReviewLlmTimeoutMs || options.structured_review_llm_timeout_ms || 90000) || 90000,
    )),
  })
  const structuredFillReview = await fillMissingStructuredReviewChecks(activeWorkspace, project, contextPackage, chapterText, normalizedReview, modelId, options)
  if (structuredFillReview?.payload) {
    normalizedReview = mergeStructuredReviewFillPayload(normalizedReview, {
      ...structuredFillReview.payload,
      structured_fill_diagnostics: {
        missing_fields: structuredFillReview.missing_fields,
        llm_diagnostics: structuredFillReview.diagnostics,
        modelName: structuredFillReview.modelName,
      },
    }, contextPackage, chapterText)
    if (nextChapterQualityPlanNeedsRepair(normalizedReview)) {
      normalizedReview.next_chapter_quality_plan = buildFallbackNextChapterQualityPlan(normalizedReview, contextPackage, chapterText)
    }
  }
  await emitReviewProgress('structured_review_fill', {
    status: structuredFillReview?.diagnostics?.some((item: any) => item?.status === 'structured_fill_failed') ? 'warn' : (structuredFillReview ? 'success' : 'skipped'),
    missing_field_count: structuredFillReview?.missing_fields?.length || 0,
    filled_field_count: Object.keys(structuredFillReview?.payload || {}).length,
    diagnostics_count: structuredFillReview?.diagnostics?.length || 0,
  })
  const hasDeliveryRiskReceiptConcern = asArray(normalizedReview.delivery_risk_receipts)
    .some((receipt: any) => receipt?.delivered === false || revisionReceiptRemainingRisk(receipt))
  const hasNextChapterQualityPlanConcern = nextChapterQualityPlanNeedsRepair(normalizedReview)
  normalizedReview.passed = normalizedReview.passed && !hasFailingReviewChecks(normalizedReview)
  normalizedReview.needs_revision = normalizedReview.needs_revision || hasReviewChecksNeedingRepair(normalizedReview) || hasDeliveryRiskReceiptConcern || hasNextChapterQualityPlanConcern
  if (options.revise === false || !shouldReviseProse(normalizedReview, options)) {
    await emitReviewProgress('revision_llm', {
      status: 'skipped',
      reason: options.revise === false ? '本轮只复核，不执行修订。' : '自检未要求修订。',
    })
    return { review: normalizedReview, revision: null, final_text: chapterText, revised: false }
  }
  const revisionMaxTokens = Math.max(8000, Math.min(18000, Number(
    options.revisionMaxTokens
    || options.revision_max_tokens
    || (options.quality_gate_repair || options.deterministic_cleanup_repair ? 16000 : 10000),
  )))
  const revisionLlmTimeoutMs = Math.max(30000, Math.min(
    Number(options.llmTimeoutMs || options.timeoutMs || 600000) || 600000,
    Number(options.revisionLlmTimeoutMs || options.revision_llm_timeout_ms || (options.quality_gate_repair || options.deterministic_cleanup_repair ? 240000 : 180000)) || 180000,
  ))
  await emitReviewProgress('revision_llm', {
    status: 'running',
    max_tokens: revisionMaxTokens,
    repair_mode: Boolean(options.quality_gate_repair || options.deterministic_cleanup_repair),
    revision_llm_timeout_ms: revisionLlmTimeoutMs,
  })
  let revisionResult: any
  try {
    revisionResult = await executeAgent('prose-agent', project, {
      task: buildProseRevisionPrompt(project, contextPackage, chapterText, normalizedReview),
      upstreamContext: contextPackage,
    }, {
      activeWorkspace,
      modelId: reviseModelId ? String(reviseModelId) : undefined,
      maxTokens: revisionMaxTokens,
      temperature: getStageTemperature(project, 'revise', 0.65),
      skipMemory: true,
      signal: options.abortSignal,
      timeoutMs: revisionLlmTimeoutMs,
    })
  } catch (revisionError) {
    if (isAbortError(revisionError)) throw revisionError
    const revisionErrorMessage = String((revisionError as any)?.message || revisionError || '修订请求失败')
    await emitReviewProgress('revision_llm', {
      status: 'warn',
      error: revisionErrorMessage.slice(0, 240),
      revision_llm_timeout_ms: revisionLlmTimeoutMs,
    })
    return {
      review: normalizedReview,
      revision: { error: revisionErrorMessage, llm_diagnostics: { error: revisionErrorMessage } },
      final_text: chapterText,
      revised: false,
    }
  }
  return resolveProseRevisionOutcome({
    revisionResult,
    normalizedReview,
    chapterText,
    contextPackage,
    emitReviewProgress,
  })
}

  return runProseSelfReviewAndRevision
}
