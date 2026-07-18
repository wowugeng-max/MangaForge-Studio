import {
  buildProseReviewPrompt,
  buildProseRevisionPrompt,
} from './prose-self-review-prompts'
import {
  nextChapterQualityPlanNeedsRepair,
  shouldReviseProse,
} from './prose-self-review-policy'
import {
  createProseSelfReviewRunner,
} from './prose-self-review-run'

export function createProseSelfReviewMethods(deps: {
  executeAgent: (...args: any[]) => any
  getStageModelId: (...args: any[]) => any
  getStageTemperature: (...args: any[]) => any
  fillMissingStructuredReviewChecks: (...args: any[]) => any
}) {
  const executeAgent = deps.executeAgent
  const getStageModelId = deps.getStageModelId
  const getStageTemperature = deps.getStageTemperature
  const fillMissingStructuredReviewChecks = deps.fillMissingStructuredReviewChecks

  return {
    buildProseReviewPrompt,
    buildProseRevisionPrompt,
    nextChapterQualityPlanNeedsRepair,
    shouldReviseProse,
    runProseSelfReviewAndRevision: createProseSelfReviewRunner({
      executeAgent,
      getStageModelId,
      getStageTemperature,
      fillMissingStructuredReviewChecks,
    }),
  }
}

