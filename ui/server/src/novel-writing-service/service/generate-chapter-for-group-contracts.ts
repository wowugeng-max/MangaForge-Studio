import type { ChapterTaskExecution } from '../generation-source/types'

export type GenerateChapterForGroupOptions = Record<string, any> & {
  chapter_task_id?: string
}

export type GenerateChapterForGroupDeps = {
  executeAgent: (...args: any[]) => any
  getProject: (...args: any[]) => any
  runtime?: any
  getStageModelId: (...args: any[]) => any
  getStageTemperature: (...args: any[]) => any
  getApprovalPolicy: (...args: any[]) => any
  approvalRequired: (...args: any[]) => any
  buildAgentConfigSnapshot: (...args: any[]) => any
  buildApprovalError: (...args: any[]) => any
  buildMigrationAudit: (...args: any[]) => any
  buildReferenceUsageReport: (...args: any[]) => any
  explainReferenceSafety: (...args: any[]) => any
  getReferenceMigrationPlanForChapter: (...args: any[]) => any
  getReferenceSafetyDecision: (...args: any[]) => any
  generationSourceResolver: {
    beginTask: (input: any) => Promise<ChapterTaskExecution>
  }
  storeChapterProseMemory: (...args: any[]) => any
  mergeChapterRawPayload: (...args: any[]) => any
  buildChapterContextPackage: (...args: any[]) => any
  repairChapterMaterials: (...args: any[]) => any
  autoRepairChapterPreflightGaps: (...args: any[]) => any
  generateSceneCardsBySource: (...args: any[]) => any
  ensureProseMeetsWordTarget: (...args: any[]) => any
  runCommercialEditorRewrite: (...args: any[]) => any
  runMemePolish: (...args: any[]) => any
  runReadabilityReview: (...args: any[]) => any
  runHumanizePostProcess: (...args: any[]) => any
  prepareStoryStateUpdate: (...args: any[]) => any
  trustedWordTargetContractionBudgets: WeakSet<object>
}
