export {
  runQualityLoopPhase,
} from './generate-chapter-quality-prestore-loop'
export {
  runQualityPrestoreFinalize,
} from './generate-chapter-quality-prestore-finalize'

import {
  runQualityLoopPhase,
} from './generate-chapter-quality-prestore-loop'
import {
  runQualityPrestoreFinalize,
} from './generate-chapter-quality-prestore-finalize'

export async function runQualityLoopAndPrestoreSetup(args: {
  options: any
  project: any
  chapter: any
  projectId: number
  activeWorkspace: string
  preferredModelId: any
  llmControlOptions: any
  qualityRepairTimeoutMs: number
  qualityThreshold: number
  isDraftOnly: boolean
  isDraftReviewOnly: boolean
  isZhuqueFast?: boolean
  generationContract: any
  contextPackage: any
  wordTarget: any
  wordTargetCompatibility: any
  wordTargetExpansionPatches: any[]
  finalText: string
  finalSceneBreakdown: any
  finalContinuityNotes: any
  ohStoryDeliveryReceipts: any
  qualityWarningCandidates: any[]
  editorRewrite: any
  memePolish: any
  readabilityReview: any
  draftPromptDiagnostics: any
  productionMode: any
  configSnapshot: any
  qualityGateProject: any
  executeAgent: (...a: any[]) => any
  getStageModelId: (...a: any[]) => any
  runReadabilityReview: (...a: any[]) => any
  throwIfChapterGenerationAborted: () => void
  onStage: (...a: any[]) => any
}): Promise<any> {
  const state = await runQualityLoopPhase(args)
  return runQualityPrestoreFinalize(state)
}
