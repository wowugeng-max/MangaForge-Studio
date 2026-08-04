import {
  proseQualityReviewMaxTokensForAttempt,
  runProseQualityLoop,
  sanitizeProseQualityReviewTransport,
} from '../../novel-writing/prose-quality-loop'
import {
  asArray,
  buildLLMResultDiagnostics,
  getNovelPayload,
} from '../../routes/novel-route-utils'
import {
  buildFocusedQualityCoreContract,
  scanProseForQualityLoop,
} from '../quality/prose-quality-entry'
import {
  proseAdmissionWarning,
} from '../quality/prose-transport-admission'
import {
  executeChapterStage,
  type ChapterTaskStage,
} from '../generation-source/types'

type QualityReviewExecutorArgs = {
  activeWorkspace: string
  executeAgent: (...args: any[]) => any
  getStageModelId: (...args: any[]) => any
  onStage: (...args: any[]) => any
  options: any
  preferredModelId: any
  project: any
  qualityRepairTimeoutMs: number
  stageForRound: (round: number) => Extract<ChapterTaskStage, 'quality_review' | 'quality_recheck'>
  throwIfChapterGenerationAborted: () => void
}

export function createChapterQualityReviewExecutor(input: QualityReviewExecutorArgs) {
  let taskExecutionFailure: unknown

  const review = async ({ prompt, round, attempt }: {
    prompt: string
    round: number
    attempt: number
  }) => {
    input.throwIfChapterGenerationAborted()
    const stage = input.stageForRound(round)
    await input.onStage('review', { status: 'running', phase: stage, round, attempt })
    const reviewPrompt = attempt > 1
      ? `${prompt}\n上一次审查没有返回可用的完整六维 JSON。本次必须完整输出 score、score_scale=\"0-100\"、六个 dimensions 和 findings，不得省略或截断。`
      : prompt
    let result: any
    try {
      result = await executeChapterStage({
        execution: input.options.chapterTaskExecution,
        fallback: input.executeAgent,
        stage,
        responseContract: 'quality_review_json',
        agentId: 'review-agent',
        project: input.project,
        context: { task: reviewPrompt },
        options: {
          activeWorkspace: input.activeWorkspace,
          modelId: input.options.chapterTaskExecution
            ? undefined
            : String(input.getStageModelId(input.project, 'review', input.preferredModelId) || ''),
          maxTokens: proseQualityReviewMaxTokensForAttempt(attempt),
          temperature: 0.15,
          skipMemory: true,
          signal: input.options.abortSignal,
          timeoutMs: input.qualityRepairTimeoutMs,
        },
      })
    } catch (error) {
      if (input.options.chapterTaskExecution) taskExecutionFailure = error
      throw error
    }
    if (result?.error) {
      throw Object.assign(new Error(String(result.error)), {
        code: stage === 'quality_recheck' ? 'PROSE_QUALITY_RECHECK_UNAVAILABLE' : 'PROSE_REVIEW_FAILED',
        llm_diagnostics: buildLLMResultDiagnostics(result),
      })
    }
    const payload = getNovelPayload(result)
    const diagnostics = buildLLMResultDiagnostics(result)
    return {
      ...(payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {}),
      __quality_review_transport: sanitizeProseQualityReviewTransport({
        finish_reason: diagnostics.finish_reason,
        usage: diagnostics.usage,
        content_length: diagnostics.content_length,
      }),
    }
  }

  return {
    review,
    get taskExecutionFailure() { return taskExecutionFailure },
    throwIfTaskExecutionFailed() {
      if (taskExecutionFailure) throw taskExecutionFailure
    },
  }
}

export async function runFinalCandidateQualityRecheck(input: Omit<QualityReviewExecutorArgs, 'stageForRound'> & {
  finalText: string
  generationContract: any
  contextPackage: any
  qualityThreshold: number
  wordTarget: any
  wordTargetCompatibility: any
}) {
  const executor = createChapterQualityReviewExecutor({
    ...input,
    stageForRound: () => 'quality_recheck',
  })
  const qualityLoop = await runProseQualityLoop({
    initialText: input.finalText,
    minScore: input.qualityThreshold,
    coreContract: buildFocusedQualityCoreContract(input.generationContract),
    continuityContext: input.contextPackage,
    project: input.project,
    maxRevisionRounds: 0,
    scan: text => scanProseForQualityLoop(text, input.contextPackage, input.wordTarget, input.wordTargetCompatibility ? {
      word_target_compatibility_pass: true,
      compatibility_ceiling: input.wordTargetCompatibility.compatibility_ceiling,
    } : {}),
    review: executor.review,
    revise: async () => {
      throw new Error('final candidate quality recheck cannot revise prose')
    },
  })
  executor.throwIfTaskExecutionFailed()
  return qualityLoop
}

export function qualityLoopAdmissionWarnings(qualityLoop: any) {
  return [
    ...asArray(qualityLoop?.decision?.advisory_failures)
      .map((message: any) => proseAdmissionWarning('quality', 'quality_advisory', message)),
    ...asArray(qualityLoop?.decision?.hard_failures).map((failure: any) => proseAdmissionWarning(
      'quality',
      failure?.key || 'quality_failure',
      failure?.message || failure?.evidence || failure?.key || '质量诊断未通过',
      failure,
    )),
    ...(qualityLoop?.quality_warning ? [qualityLoop.quality_warning] : []),
  ]
}
