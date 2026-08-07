import type { Express } from 'express'
import { getNovelProject } from '../novel'
import { registerNovelAgentExecutionRoutes } from './novel-agent-execution-routes'
import { registerNovelAgentRoutes } from './novel-agent-routes'
import { registerNovelChapterContextRoutes } from './novel-chapter-context-routes'
import { registerNovelCommercialOpsRoutes } from './novel-commercial-ops-routes'
import { registerNovelCreativeAssistRoutes } from './novel-creative-assist-routes'
import { registerNovelCoreRoutes } from './novel-core-routes'
import { createNovelDashboardService } from './novel-dashboard-service'
import { registerNovelEditorRoutes } from './novel-editor-routes'
import { registerNovelGenerationRoutes } from './novel-generation-routes'
import { registerNovelMemoryRoutes } from './novel-memory-routes'
import { registerNovelModuleRoutes } from './novel-module-routes'
import { createNovelOriginalIncubatorService } from './novel-original-incubator-service'
import { registerNovelPipelineRoutes } from './novel-pipeline-routes'
import { ensureChapterPlanningForRange } from './novel-planning-ensure-service'
import { registerNovelPlanningRoutes } from './novel-planning-routes'
import { registerNovelPlanRoutes } from './novel-plan-routes'
import { createNovelProductionService, createNovelRunExecutionService } from './novel-production-service'
import { registerNovelProjectControlRoutes } from './novel-project-control-routes'
import { createNovelReferenceService } from './novel-reference-service'
import { registerNovelReferenceRoutes } from './novel-reference-routes'
import { registerNovelRestructureRoutes } from './novel-restructure-routes'
import { registerNovelRunRoutes } from './novel-run-routes'
import { registerNovelSettingRoutes } from './novel-setting-routes'
import { getQualityGate, getStoryState } from './novel-route-utils'
import { registerNovelTruthRoutes } from './novel-truth-routes'
import { createNovelWritingService } from './novel-writing-service'
import type { McpRuntime } from '../mcp/runtime'
import { ChapterSourceLeaseRegistry } from '../novel-writing-service/generation-source/chapter-source-lease'

export function registerNovelRoutes(app: Express, getWorkspace: () => string, options: { mcpRuntime?: McpRuntime } = {}) {
  registerNovelCoreRoutes(app, getWorkspace)
  registerNovelModuleRoutes(app)
  registerNovelMemoryRoutes(app)

  const getProject = async (workspace: string, id: number) => getNovelProject(workspace, id)
  const referenceService = createNovelReferenceService()
  const productionService = createNovelProductionService()
  const dashboardService = createNovelDashboardService()
  const incubatorService = createNovelOriginalIncubatorService()
  const chapterSourceLeases = new ChapterSourceLeaseRegistry()
  const writingService = createNovelWritingService({
    getProject,
    production: productionService,
    reference: referenceService,
    mcpRuntime: options.mcpRuntime,
    chapterSourceLeases,
  })
  const runExecutionService = createNovelRunExecutionService({
    getProject,
    production: productionService,
    generateChapterForGroup: writingService.generateChapterForGroup,
  })

  registerNovelSettingRoutes(app, {
    getWorkspace,
    getProject,
    buildChapterContextPackage: writingService.buildChapterContextPackage,
  })

  registerNovelChapterContextRoutes(app, {
    getWorkspace,
    getProject,
    buildChapterContextPackage: writingService.buildChapterContextPackage,
    repairChapterMaterials: writingService.repairChapterMaterials,
  })

  registerNovelTruthRoutes(app, {
    getWorkspace,
    getProject,
    buildChapterContextPackage: writingService.buildChapterContextPackage,
  })

  registerNovelCommercialOpsRoutes(app, {
    getWorkspace,
    getProject,
  })

  registerNovelCreativeAssistRoutes(app, {
    getWorkspace,
    getProject,
    buildChapterContextPackage: writingService.buildChapterContextPackage,
  })

  registerNovelPipelineRoutes(app, {
    getWorkspace,
  })

  registerNovelProjectControlRoutes(app, {
    getWorkspace,
    getProject,
    getStoredOrBuiltWritingBible: writingService.getStoredOrBuiltWritingBible,
    getStoryState,
    buildProductionDashboard: dashboardService.buildProductionDashboard,
    buildProductionMetrics: dashboardService.buildProductionMetrics,
    buildCommercialReadiness: dashboardService.buildCommercialReadiness,
    getApprovalPolicy: productionService.getApprovalPolicy,
    getProductionBudget: productionService.getProductionBudget,
    getProductionBudgetDecision: productionService.getProductionBudgetDecision,
    getQualityGate,
    getAgentPromptConfig: productionService.getAgentPromptConfig,
    buildAgentConfigSnapshot: productionService.buildAgentConfigSnapshot,
    buildChapterContextPackage: writingService.buildChapterContextPackage,
    buildReferenceUsageReport: referenceService.buildReferenceUsageReport,
    buildStructuralSimilarityReport: referenceService.buildStructuralSimilarityReport,
    mcpRuntime: options.mcpRuntime,
    chapterSourceLeases,
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
    buildAgentConfigSnapshot: productionService.buildAgentConfigSnapshot,
    buildChapterContextPackage: writingService.buildChapterContextPackage,
    getReferenceMigrationPlanForChapter: referenceService.getReferenceMigrationPlanForChapter,
    buildParagraphProseContext: writingService.buildParagraphProseContext,
    buildProductionMetrics: dashboardService.buildProductionMetrics,
    buildOriginalIncubatorPrompt: incubatorService.buildOriginalIncubatorPrompt,
    normalizeIncubatorPayload: incubatorService.normalizeIncubatorPayload,
    isUsableIncubatorPayload: incubatorService.isUsableIncubatorPayload,
    storeOriginalIncubatorPayload: incubatorService.storeOriginalIncubatorPayload,
  })

  registerNovelGenerationRoutes(app, {
    getWorkspace,
    getProject,
    getModelStrategy: productionService.getModelStrategy,
    getApprovalPolicy: productionService.getApprovalPolicy,
    buildAgentConfigSnapshot: productionService.buildAgentConfigSnapshot,
    buildChapterGroupStages: productionService.buildChapterGroupStages,
    updateChapterStages: productionService.updateChapterStages,
    classifyGenerationFailure: productionService.classifyGenerationFailure,
    executeChapterGroupRunRecord: runExecutionService.executeChapterGroupRunRecord,
    generateChapterForGroup: writingService.generateChapterForGroup,
    buildPipelineSteps: productionService.buildPipelineSteps,
    updatePipelineStep: productionService.updatePipelineStep,
    buildChapterContextPackage: writingService.buildChapterContextPackage,
    autoRepairChapterPreflightGaps: writingService.autoRepairChapterPreflightGaps,
    generateSceneCardsForChapter: writingService.generateSceneCardsForChapter,
    getReferenceMigrationPlanForChapter: referenceService.getReferenceMigrationPlanForChapter,
    buildParagraphProseContext: writingService.buildParagraphProseContext,
    getStageModelId: productionService.getStageModelId,
    runCommercialEditorRewrite: writingService.runCommercialEditorRewrite,
    runProseSelfReviewAndRevision: writingService.runProseSelfReviewAndRevision,
    ensureProseMeetsWordTarget: writingService.ensureProseMeetsWordTarget,
    buildReferenceUsageReport: referenceService.buildReferenceUsageReport,
    getReferenceSafetyDecision: referenceService.getReferenceSafetyDecision,
    explainReferenceSafety: referenceService.explainReferenceSafety,
    buildMigrationAudit: referenceService.buildMigrationAudit,
    updateStoryStateMachine: writingService.updateStoryStateMachine,
    ensureChapterPlanningForRange,
  })

  const editorLifecycle = registerNovelEditorRoutes(app, {
    getWorkspace,
    getProject,
    buildChapterContextPackage: writingService.buildChapterContextPackage,
    beginChapterTask: writingService.beginChapterTask,
    getStageModelId: productionService.getStageModelId,
    getStageTemperature: productionService.getStageTemperature,
    buildReferenceUsageReport: referenceService.buildReferenceUsageReport,
    buildStructuralSimilarityReport: referenceService.buildStructuralSimilarityReport,
    buildReferenceMigrationDryPlan: referenceService.buildReferenceMigrationDryPlan,
    diffTexts: referenceService.diffTexts,
    updateStoryStateMachine: writingService.updateStoryStateMachine,
    chapterSourceLeases,
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

  return {
    start: (workspace: string) => editorLifecycle.start(workspace),
    stop: () => editorLifecycle.stop(),
    editorRevisionWorker: editorLifecycle.editorRevisionWorker,
  }
}
