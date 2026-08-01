export type QualityPrestoreSetupArgs = {
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
}
