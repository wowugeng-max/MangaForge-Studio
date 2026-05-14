import type { Express } from 'express'
import { getNovelProject } from '../novel'
import { registerNovelAgentExecutionRoutes } from './novel-agent-execution-routes'
import { registerNovelAgentRoutes } from './novel-agent-routes'
import { registerNovelChapterContextRoutes } from './novel-chapter-context-routes'
import { registerNovelCoreRoutes } from './novel-core-routes'
import { createNovelDashboardService } from './novel-dashboard-service'
import { registerNovelEditorRoutes } from './novel-editor-routes'
import { registerNovelGenerationRoutes } from './novel-generation-routes'
import { registerNovelMemoryRoutes } from './novel-memory-routes'
import { registerNovelModuleRoutes } from './novel-module-routes'
import { createNovelOriginalIncubatorService } from './novel-original-incubator-service'
import { registerNovelPlanningRoutes } from './novel-planning-routes'
import { registerNovelPlanRoutes } from './novel-plan-routes'
import { createNovelProductionService, createNovelRunExecutionService } from './novel-production-service'
import { registerNovelProjectControlRoutes } from './novel-project-control-routes'
import { createNovelReferenceService } from './novel-reference-service'
import { registerNovelReferenceRoutes } from './novel-reference-routes'
import { registerNovelRestructureRoutes } from './novel-restructure-routes'
import { registerNovelRunRoutes } from './novel-run-routes'
import { getQualityGate, getStoryState } from './novel-route-utils'
import { createNovelWritingService } from './novel-writing-service'

export function registerNovelRoutes(app: Express, getWorkspace: () => string) {
  registerNovelCoreRoutes(app, getWorkspace)
  registerNovelModuleRoutes(app)
  registerNovelMemoryRoutes(app)

  const getProject = async (workspace: string, id: number) => getNovelProject(workspace, id)
  const referenceService = createNovelReferenceService()
  const productionService = createNovelProductionService()
  const dashboardService = createNovelDashboardService()
  const incubatorService = createNovelOriginalIncubatorService()
  const writingService = createNovelWritingService({
    getProject,
    production: productionService,
    reference: referenceService,
  })
  const runExecutionService = createNovelRunExecutionService({
    getProject,
    production: productionService,
    generateChapterForGroup: writingService.generateChapterForGroup,
  })

  registerNovelChapterContextRoutes(app, {
    getWorkspace,
    getProject,
    buildChapterContextPackage: writingService.buildChapterContextPackage,
  })

  registerNovelProjectControlRoutes(app, {
    getWorkspace,
    getProject,
    getStoredOrBuiltWritingBible: writingService.getStoredOrBuiltWritingBible,
    getStoryState,
    buildProductionDashboard: dashboardService.buildProductionDashboard,
    buildProductionMetrics: dashboardService.buildProductionMetrics,
    getApprovalPolicy: productionService.getApprovalPolicy,
    getProductionBudget: productionService.getProductionBudget,
    getProductionBudgetDecision: productionService.getProductionBudgetDecision,
    getQualityGate,
    getAgentPromptConfig: productionService.getAgentPromptConfig,
  })

  registerNovelReferenceRoutes(app, {
    getWorkspace,
    getProject,
    buildReferenceCoverageReport: referenceService.buildReferenceCoverageReport,
  })

  registerNovelPlanningRoutes(app, {
    getWorkspace,
    getProject,
    getStageModelId: productionService.getStageModelId,
    getStageTemperature: productionService.getStageTemperature,
    getModelStrategy: productionService.getModelStrategy,
    buildProductionMetrics: dashboardService.buildProductionMetrics,
    buildOriginalIncubatorPrompt: incubatorService.buildOriginalIncubatorPrompt,
    normalizeIncubatorPayload: incubatorService.normalizeIncubatorPayload,
    storeOriginalIncubatorPayload: incubatorService.storeOriginalIncubatorPayload,
  })

  registerNovelGenerationRoutes(app, {
    getWorkspace,
    getProject,
    getModelStrategy: productionService.getModelStrategy,
    getApprovalPolicy: productionService.getApprovalPolicy,
    buildChapterGroupStages: productionService.buildChapterGroupStages,
    updateChapterStages: productionService.updateChapterStages,
    classifyGenerationFailure: productionService.classifyGenerationFailure,
    executeChapterGroupRunRecord: runExecutionService.executeChapterGroupRunRecord,
    buildPipelineSteps: productionService.buildPipelineSteps,
    updatePipelineStep: productionService.updatePipelineStep,
    buildChapterContextPackage: writingService.buildChapterContextPackage,
    generateSceneCardsForChapter: writingService.generateSceneCardsForChapter,
    getReferenceMigrationPlanForChapter: referenceService.getReferenceMigrationPlanForChapter,
    buildParagraphProseContext: writingService.buildParagraphProseContext,
    getStageModelId: productionService.getStageModelId,
    runProseSelfReviewAndRevision: writingService.runProseSelfReviewAndRevision,
    buildReferenceUsageReport: referenceService.buildReferenceUsageReport,
    getReferenceSafetyDecision: referenceService.getReferenceSafetyDecision,
    explainReferenceSafety: referenceService.explainReferenceSafety,
    buildMigrationAudit: referenceService.buildMigrationAudit,
    updateStoryStateMachine: writingService.updateStoryStateMachine,
  })

  registerNovelEditorRoutes(app, {
    getWorkspace,
    getProject,
    buildChapterContextPackage: writingService.buildChapterContextPackage,
    getStageModelId: productionService.getStageModelId,
    getStageTemperature: productionService.getStageTemperature,
    buildReferenceUsageReport: referenceService.buildReferenceUsageReport,
    buildStructuralSimilarityReport: referenceService.buildStructuralSimilarityReport,
    buildReferenceMigrationDryPlan: referenceService.buildReferenceMigrationDryPlan,
    diffTexts: referenceService.diffTexts,
  })

  registerNovelRunRoutes(app, {
    getWorkspace,
    getProject,
    runQueueWorkers: productionService.runQueueWorkers,
    getProductionBudgetDecision: productionService.getProductionBudgetDecision,
    buildPipelineSteps: productionService.buildPipelineSteps,
    executeChapterGroupRunRecord: runExecutionService.executeChapterGroupRunRecord,
  })

  registerNovelAgentRoutes(app, {
    getWorkspace,
    getProject,
  })

  registerNovelAgentExecutionRoutes(app, {
    getWorkspace,
    getProject,
  })

  registerNovelRestructureRoutes(app, {
    getWorkspace,
    getProject,
  })

  registerNovelPlanRoutes(app, {
    getWorkspace,
    getProject,
  })
}
