import {
  executeNovelAgent,
  generateNovelChapterProse as defaultGenerateNovelChapterProse,
  storeNovelChapterProseMemory as defaultStoreNovelChapterProseMemory,
} from '../../llm'
import {
  listNovelWorldbuilding,
  listNovelCharacters,
  listNovelOutlines,
  listNovelReviews,
  commitNovelChapterAcceptance,
  loadNovelMaterialRepairSnapshot,
  mergeNovelChapterRawPayload,
} from '../../novel'
import type { NovelProductionService } from '../../routes/novel-production-service'
import type { NovelReferenceService } from '../../routes/novel-reference-service'
import type { McpRuntime } from '../../mcp/runtime'
import { ChapterSourceLeaseRegistry } from '../generation-source/chapter-source-lease'
import { createGenerationSourceResolver } from '../generation-source/create-generation-source'
import { McpGenerationSource } from '../generation-source/mcp-generation-source'
import { ModelGenerationSource } from '../generation-source/model-generation-source'
import { createChapterStageRecorder } from '../generation-source/stage-receipts'
import { formatAdmissionError } from '../quality/admission-error'
import { refreshFollowingChapterSerialStoryStateReadiness } from '../quality/state-tracking-contracts'
import { createAutoRepairChapterPreflightMethods } from './auto-repair-preflight-methods'
import { buildChapterContextPackage as buildChapterContextPackageFromModule } from './chapter-context-package'
import { createGenerateChapterForGroupMethods } from './generate-chapter-for-group-methods'
import { buildParagraphProseContext as buildParagraphProseContextFromModule } from './paragraph-prose-context'
import { createProsePolishMethods } from './prose-polish-methods'
import { createProseHumanizePostprocessMethods } from './prose-humanize-postprocess-methods'
import { createProseSelfReviewMethods } from './prose-self-review-methods'
import { createProseWordTargetMethods } from './prose-word-target-methods'
import { createSceneCardsMethods } from './scene-cards-methods'
import { createStoryStateMachineMethods } from './story-state-machine'
import { createStructuredReviewFillMethods } from './structured-review-fill-methods'
import { getStoredOrBuiltWritingBible as getStoredOrBuiltWritingBibleCore } from './writing-bible'
import { createMaterialRepairService } from './material-repair-service'

type RunHumanizePostProcess = ReturnType<typeof createProseHumanizePostprocessMethods>['runHumanizePostProcess']

export type NovelWritingRuntime = {
  generateChapterProse?: typeof defaultGenerateNovelChapterProse
  storeChapterProseMemory?: typeof defaultStoreNovelChapterProseMemory
  mergeChapterRawPayload?: typeof mergeNovelChapterRawPayload
  executeAgent?: typeof executeNovelAgent
  runHumanizePostProcess?: RunHumanizePostProcess
  buildChapterContext?: (input: {
    workspace: string
    project: any
    chapter: any
    chapters: any[]
    worldbuilding: any[]
    characters: any[]
    outlines: any[]
    reviews: any[]
    settings: any[]
    chapterSettingUsage: any[]
    projectSettingUsage: any[]
  }) => Promise<any>
  hooks?: {
    beforeChapterStore?: (input: { chapterId: number; finalText: string }) => void | Promise<void>
    beforeStoryState?: (input: { chapterId: number; finalText: string }) => void | Promise<void>
    afterChapterCommit?: (input: { chapterId: number; finalText: string }) => void | Promise<void>
    beforePostCommitSync?: (input: { chapterId: number; finalText: string }) => void | Promise<void>
  }
}

export function createNovelWritingService(ctx: {
  getProject: (workspace: string, id: number) => Promise<any>
  production: NovelProductionService
  reference: NovelReferenceService
  runtime?: NovelWritingRuntime
  mcpRuntime?: McpRuntime
  chapterSourceLeases?: ChapterSourceLeaseRegistry
}) {
  const trustedWordTargetContractionBudgets = new WeakSet<object>()
  const executeAgent = ctx.runtime?.executeAgent || executeNovelAgent
  const {
    buildStoryStatePrompt,
    prepareStoryStateUpdate,
    updateStoryStateMachine,
  } = createStoryStateMachineMethods({
    executeAgent,
    getStageModelId: (project: any, stage: any, modelId?: any) => ctx.production.getStageModelId(project, stage, modelId),
    getStageTemperature: (project: any, stage: any, fallback?: any) => ctx.production.getStageTemperature(project, stage, fallback),
    refreshFollowingChapterSerialStoryStateReadiness,
  })
  const prosePolishMethods = createProsePolishMethods({
    executeAgent,
    getStageModelId: (project: any, stage: any, modelId?: any) => ctx.production.getStageModelId(project, stage, modelId),
    getStageTemperature: (project: any, stage: any, fallback?: any) => ctx.production.getStageTemperature(project, stage, fallback),
  })
  const runCommercialEditorRewrite = prosePolishMethods.runCommercialEditorRewrite
  const runMemePolish = prosePolishMethods.runMemePolish
  const runReadabilityReview = prosePolishMethods.runReadabilityReview
  const humanizePostprocessMethods = createProseHumanizePostprocessMethods({
    executeAgent,
    getStageModelId: (project: any, stage: any, modelId?: any) => ctx.production.getStageModelId(project, stage, modelId),
    getStageTemperature: (project: any, stage: any, fallback?: any) => ctx.production.getStageTemperature(project, stage, fallback),
  })
  const runHumanizePostProcess = ctx.runtime?.runHumanizePostProcess
    || humanizePostprocessMethods.runHumanizePostProcess
  const sceneCardsMethods = createSceneCardsMethods({
    executeAgent,
    getStageModelId: (project: any, stage: any, modelId?: any) => ctx.production.getStageModelId(project, stage, modelId),
    getStageTemperature: (project: any, stage: any, fallback?: any) => ctx.production.getStageTemperature(project, stage, fallback),
  })
  const buildSceneCardsPrompt = sceneCardsMethods.buildSceneCardsPrompt
  const generateSceneCardsForChapter = sceneCardsMethods.generateSceneCardsForChapter
  const structuredReviewFillMethods = createStructuredReviewFillMethods({
    executeAgent,
    getStageModelId: (project: any, stage: any, modelId?: any) => ctx.production.getStageModelId(project, stage, modelId),
    getStageTemperature: (project: any, stage: any, fallback?: any) => ctx.production.getStageTemperature(project, stage, fallback),
  })
  const proseSelfReviewMethods = createProseSelfReviewMethods({
    executeAgent,
    getStageModelId: (project: any, stage: any, modelId?: any) => ctx.production.getStageModelId(project, stage, modelId),
    getStageTemperature: (project: any, stage: any, fallback?: any) => ctx.production.getStageTemperature(project, stage, fallback),
    fillMissingStructuredReviewChecks: (...args: any[]) => structuredReviewFillMethods.fillMissingStructuredReviewChecks(...args),
  })
  const proseWordTargetMethods = createProseWordTargetMethods({
    executeAgent,
    formatAdmissionError,
    getStageModelId: (project: any, stage: any, modelId?: any) => ctx.production.getStageModelId(project, stage, modelId),
    getStageTemperature: (project: any, stage: any, fallback?: any) => ctx.production.getStageTemperature(project, stage, fallback),
    trustedWordTargetContractionBudgets,
  })

  const autoRepairChapterPreflightMethods = createAutoRepairChapterPreflightMethods({
    executeAgent,
    generateSceneCardsForChapter,
    buildChapterContextPackage: buildChapterContextPackageFromModule,
  })


  const generateNovelChapterProse = ctx.runtime?.generateChapterProse || defaultGenerateNovelChapterProse
  const mcpGenerationSource = ctx.mcpRuntime ? new McpGenerationSource(ctx.mcpRuntime) : undefined
  const chapterGenerationSource = createGenerationSourceResolver({
    chapterSourceLeases: ctx.chapterSourceLeases || new ChapterSourceLeaseRegistry(),
    readProject: ctx.getProject,
    createModelExecution: input => {
      const provenance = {
        task_id: input.taskId,
        project_id: input.project.id,
        chapter_id: input.chapter.id,
        source: 'model' as const,
        source_fingerprint: input.fingerprint,
        authority_fingerprint: input.authorityFingerprint,
        context_version: input.contextVersion,
        model_id: input.modelId,
      }
      return new ModelGenerationSource({
        modelId: input.modelId,
        provenance,
        generateChapterProse: generateNovelChapterProse,
        executeAgent,
        recordStage: createChapterStageRecorder({
          activeWorkspace: input.activeWorkspace,
          provenance: () => provenance,
        }),
        assertCurrent: input.assertCurrent,
      })
    },
    ...(mcpGenerationSource ? { mcpSource: mcpGenerationSource } : {}),
  })
  const beginChapterTask = (input: Parameters<typeof chapterGenerationSource.beginTask>[0]) => chapterGenerationSource.beginTask(input)
  const materialRepairService = createMaterialRepairService({
    beginChapterTask,
    buildChapterContextPackage: buildChapterContextPackageFromModule,
    commitAcceptance: commitNovelChapterAcceptance,
    loadSnapshot: loadNovelMaterialRepairSnapshot,
  })
  const repairChapterMaterials = materialRepairService.repairChapterMaterials
  const storeChapterProseMemory = ctx.runtime?.storeChapterProseMemory || defaultStoreNovelChapterProseMemory
  const mergeChapterRawPayload = ctx.runtime?.mergeChapterRawPayload || mergeNovelChapterRawPayload
  const buildParagraphProseContext = buildParagraphProseContextFromModule

  const getStoredOrBuiltWritingBible = async (activeWorkspace: string, project: any) => getStoredOrBuiltWritingBibleCore({
    activeWorkspace,
    project,
    listNovelWorldbuilding,
    listNovelCharacters,
    listNovelOutlines,
    listNovelReviews,
  })

  const buildChapterContextPackage = buildChapterContextPackageFromModule

  const buildProseReviewPrompt = proseSelfReviewMethods.buildProseReviewPrompt
  const buildProseRevisionPrompt = proseSelfReviewMethods.buildProseRevisionPrompt
  const nextChapterQualityPlanNeedsRepair = proseSelfReviewMethods.nextChapterQualityPlanNeedsRepair
  const shouldReviseProse = proseSelfReviewMethods.shouldReviseProse
  const fillMissingStructuredReviewChecks = structuredReviewFillMethods.fillMissingStructuredReviewChecks
  const runProseSelfReviewAndRevision = proseSelfReviewMethods.runProseSelfReviewAndRevision

  const ensureProseMeetsWordTarget = proseWordTargetMethods.ensureProseMeetsWordTarget

  const autoRepairChapterPreflightGaps = autoRepairChapterPreflightMethods.autoRepairChapterPreflightGaps

  const generateChapterForGroupMethods = createGenerateChapterForGroupMethods({
    executeAgent,
    getProject: ctx.getProject,
    runtime: ctx.runtime,
    getStageModelId: (project: any, stage: any, modelId?: any) => ctx.production.getStageModelId(project, stage, modelId),
    getStageTemperature: (project: any, stage: any, fallback?: any) => ctx.production.getStageTemperature(project, stage, fallback),
    getApprovalPolicy: (project: any) => ctx.production.getApprovalPolicy(project),
    approvalRequired: (...args: any[]) => ctx.production.approvalRequired(...args),
    buildAgentConfigSnapshot: (...args: any[]) => ctx.production.buildAgentConfigSnapshot(...args),
    buildApprovalError: (...args: any[]) => ctx.production.buildApprovalError(...args),
    buildMigrationAudit: (...args: any[]) => ctx.reference.buildMigrationAudit(...args),
    buildReferenceUsageReport: (...args: any[]) => ctx.reference.buildReferenceUsageReport(...args),
    explainReferenceSafety: (...args: any[]) => ctx.reference.explainReferenceSafety(...args),
    getReferenceMigrationPlanForChapter: (...args: any[]) => ctx.reference.getReferenceMigrationPlanForChapter(...args),
    getReferenceSafetyDecision: (...args: any[]) => ctx.reference.getReferenceSafetyDecision(...args),
    generationSourceResolver: chapterGenerationSource,
    storeChapterProseMemory,
    mergeChapterRawPayload,
    buildChapterContextPackage,
    repairChapterMaterials,
    autoRepairChapterPreflightGaps,
    generateSceneCardsForChapter,
    ensureProseMeetsWordTarget,
    runCommercialEditorRewrite,
    runMemePolish,
    runReadabilityReview,
    runHumanizePostProcess,
    prepareStoryStateUpdate,
    trustedWordTargetContractionBudgets,
  })
  const generateChapterForGroup = generateChapterForGroupMethods.generateChapterForGroup

  return {
    beginChapterTask,
    repairChapterMaterials,
    buildParagraphProseContext,
    buildChapterContextPackage,
    autoRepairChapterPreflightGaps,
    generateSceneCardsForChapter,
    prepareStoryStateUpdate,
    updateStoryStateMachine,
    getStoredOrBuiltWritingBible,
    runCommercialEditorRewrite,
    runMemePolish,
    runReadabilityReview,
    runHumanizePostProcess,
    runProseSelfReviewAndRevision,
    ensureProseMeetsWordTarget,
    generateChapterForGroup,
  }
}

export type NovelWritingService = ReturnType<typeof createNovelWritingService>
