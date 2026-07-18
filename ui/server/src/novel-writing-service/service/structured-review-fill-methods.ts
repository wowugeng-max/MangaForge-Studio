import {
  buildLLMResultDiagnostics,
  getNovelPayload,
} from '../../routes/novel-route-utils'
import {
  buildMissingStructuredReviewChecksPrompt,
} from '../quality/paragraph-prose-context'
import {
  chunkStructuredReviewFields,
} from '../quality/prose-expansion'
import {
  missingStructuredReviewCheckFields,
} from '../quality/review-merge'
import {
  STRUCTURED_REVIEW_CHECK_FIELDS,
} from '../quality/structured-review-fields'
import {
  throwIfAborted,
} from './runtime-helpers'

export function createStructuredReviewFillMethods(deps: {
  executeAgent: (...args: any[]) => any
  getStageModelId: (...args: any[]) => any
  getStageTemperature: (...args: any[]) => any
}) {
  const executeAgent = deps.executeAgent
  const getStageModelId = deps.getStageModelId
  const getStageTemperature = deps.getStageTemperature

const fillMissingStructuredReviewChecks = async (
  activeWorkspace: string,
  project: any,
  contextPackage: any,
  chapterText: string,
  review: any,
  modelId?: number,
  options: any = {},
) => {
  const missingFields = missingStructuredReviewCheckFields(review)
  if (!missingFields.length || options.fill_missing_structured_checks === false) return null
  const reviewModelId = getStageModelId(project, 'review', modelId)
  const batches = chunkStructuredReviewFields(missingFields, options.structuredReviewBatchSize || options.structured_review_batch_size || 4)
  const structuredReviewLlmTimeoutMs = Math.max(30000, Math.min(
    Number(options.llmTimeoutMs || options.timeoutMs || 600000) || 600000,
    Number(options.structuredReviewLlmTimeoutMs || options.structured_review_llm_timeout_ms || 90000) || 90000,
  ))
  const mergedPayload: any = {}
  const diagnostics: any[] = []
  let modelName = ''
  for (const batchFields of batches) {
    throwIfAborted(options)
    const result = await executeAgent('review-agent', project, {
      task: buildMissingStructuredReviewChecksPrompt(project, contextPackage, chapterText, review, batchFields),
    }, {
      activeWorkspace,
      modelId: reviewModelId ? String(reviewModelId) : undefined,
      maxTokens: Math.max(8000, Math.min(14000, Number(options.structuredReviewMaxTokens || options.structured_review_max_tokens || 12000))),
      temperature: getStageTemperature(project, 'review', 0.15),
      skipMemory: true,
      signal: options.abortSignal,
      timeoutMs: structuredReviewLlmTimeoutMs,
    })
    if ((result as any).error) {
      diagnostics.push({
        missing_fields: batchFields,
        status: 'structured_fill_failed',
        error: String((result as any).error),
        llm_diagnostics: buildLLMResultDiagnostics(result),
        modelName: (result as any).modelName,
      })
      modelName = (result as any).modelName || modelName
      break
    }
    const payload = getNovelPayload(result)
    diagnostics.push({
      missing_fields: batchFields,
      llm_diagnostics: buildLLMResultDiagnostics(result),
      modelName: (result as any).modelName,
    })
    modelName = (result as any).modelName || modelName
    for (const [snakeField, camelField] of STRUCTURED_REVIEW_CHECK_FIELDS) {
      const value = payload?.[snakeField] || payload?.[camelField]
      if (Array.isArray(value)) mergedPayload[snakeField] = value
    }
    for (const key of ['delivery_risk_receipts', 'deliveryRiskReceipts', 'next_chapter_quality_plan_receipts', 'nextChapterQualityPlanReceipts', 'issues', 'findings']) {
      if (Array.isArray(payload?.[key])) mergedPayload[key] = payload[key]
    }
    for (const key of ['next_chapter_quality_plan', 'nextChapterQualityPlan', 'passed', 'score', 'needs_revision', 'needsRevision']) {
      if (payload?.[key] !== undefined) mergedPayload[key] = payload[key]
    }
  }
  return {
    payload: mergedPayload,
    diagnostics,
    missing_fields: missingFields,
    modelName,
  }
}

  return {
    fillMissingStructuredReviewChecks,
  }
}
