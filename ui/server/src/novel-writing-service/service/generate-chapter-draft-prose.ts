import {
  enrichContextWithStrongHandoff,
} from '../../novel-writing/chapter-handoff-basics'
import {
  enrichContextWithProgressResync,
} from '../../novel-writing/chapter-progress-ledger'
import {
  markBlockedInvalidError,
  validateMinimalChapterProse,
} from '../../novel-writing/prose-admission-policy'
import {
  assessInitialProseOpeningContinuity,
} from '../../novel-writing/prose-candidate-continuity'
import {
  buildGeneratedChapterTitlePatch,
} from '../../novel-writing/title-uniqueness'
import {
  countProseChars,
  proseMaxTokensForWordTarget,
} from '../../novel-writing/word-target'
import {
  asArray,
  buildLLMResultDiagnostics,
  compactPreviousChaptersForProse,
  extractPlainProseFallback,
  getNovelPayload,
} from '../../routes/novel-route-utils'
import {
  normalizeStoredOhStoryDeliveryReceipts,
} from '../post-delivery/delivery-risk-carry-over'
import {
  compileParagraphProseContext,
} from '../quality/paragraph-prose-context'
import {
  assertCompleteProseTransportResult,
} from '../quality/prose-transport-admission'
import {
  selectProseForChapter,
} from './runtime-helpers'

export async function runGenerateChapterDraftProse(args: {
  activeWorkspace: string
  project: any
  chapter: any
  chapters: any[]
  worldbuilding: any
  characters: any[]
  outlines: any[]
  contextPackage: any
  generationContract: any
  wordTarget: any
  preferredModelId: any
  options: any
  getStageModelId: (...a: any[]) => any
  generateNovelChapterProse: (...a: any[]) => any
  getReferenceMigrationPlanForChapter: (...a: any[]) => any
  throwIfChapterGenerationAborted: () => void
  onStage: (...a: any[]) => any
}): Promise<{
  finalText: string
  finalSceneBreakdown: any
  finalContinuityNotes: any
  ohStoryDeliveryReceipts: any
  generatedTitlePatch: any
  draftPromptDiagnostics: any
  editorRewrite: any
  memePolish: any
  readabilityReview: any
}> {
  let {
    activeWorkspace,
    project,
    chapter,
    chapters,
    worldbuilding,
    characters,
    outlines,
    contextPackage,
    generationContract,
    wordTarget,
    preferredModelId,
    options,
    getStageModelId,
    generateNovelChapterProse,
    getReferenceMigrationPlanForChapter,
    throwIfChapterGenerationAborted,
    onStage,
  } = args

const prevChapters = compactPreviousChaptersForProse(chapters, chapter.chapter_no)
throwIfChapterGenerationAborted()
await onStage('migration_plan', { status: 'running' })
const migrationPlan = await getReferenceMigrationPlanForChapter(activeWorkspace, project, chapter).catch(error => ({ error: String(error) }))
await onStage('migration_plan', { status: (migrationPlan as any)?.error ? 'warn' : 'success', active_reference_count: (migrationPlan as any)?.chapter_specific_plan?.active_reference_count || 0 })
throwIfChapterGenerationAborted()
const compiledPrompt = compileParagraphProseContext(project, generationContract, migrationPlan, chapter)
await onStage('draft', { status: 'running', prompt_diagnostics: compiledPrompt.diagnostics })
const draftResult = await generateNovelChapterProse(project, chapter, {
  worldbuilding,
  characters,
  outline: outlines,
  prompt: String(options.prompt || ''),
  prevChapters,
  contextPackage,
  migrationPlan,
  paragraphTask: compiledPrompt.prompt,
  promptDiagnostics: compiledPrompt.diagnostics,
  boundedProseContract: true,
  maxTokens: proseMaxTokensForWordTarget(wordTarget),
  abortSignal: options.abortSignal,
  llmTimeoutMs: options.llmTimeoutMs,
} as any, {
  activeWorkspace,
  modelId: String(getStageModelId(project, 'draft', preferredModelId) || ''),
  skipMemoryStore: true,
})
assertCompleteProseTransportResult(draftResult, 'PROSE_DRAFT_TRUNCATED')
const draftPromptDiagnostics = {
  ...compiledPrompt.diagnostics,
  model_usage: (draftResult as any)?.prose_prompt_diagnostics?.model_usage
    || (draftResult as any)?.usage
    || (draftResult as any)?.raw?.usage
    || null,
}
const resultPayload = getNovelPayload(draftResult)
const draftProseChapters = Array.isArray(resultPayload?.prose_chapters)
  ? resultPayload.prose_chapters
  : Array.isArray(resultPayload?.proseChapters)
    ? resultPayload.proseChapters
    : []
let targetProse: any
try {
  targetProse = selectProseForChapter(resultPayload, chapter)
    || draftProseChapters.find((item: any) => Number(item?.chapter_no ?? item?.chapterNo) === Number(chapter.chapter_no))
    || draftProseChapters[0]
} catch (error) {
  throw markBlockedInvalidError(error, {
    code: 'prose_wrong_chapter',
    source: 'prose_shape',
    message: '模型返回的正文不属于目标章节。',
  })
}
const generatedTitlePatch = buildGeneratedChapterTitlePatch(
  chapter,
  contextPackage?.chapter_target?.title_uniqueness_report,
  targetProse?.title || resultPayload?.title,
)
const plainProseFallback = extractPlainProseFallback(draftResult, 800)
const chapterText = targetProse?.chapter_text || targetProse?.chapterText || resultPayload?.chapter_text || resultPayload?.chapterText || plainProseFallback
if (!chapterText) {
  await onStage('draft', {
    status: 'failed',
    error: String((draftResult as any).error || (draftResult as any).fallbackReason || '模型未返回正文'),
    llm_diagnostics: buildLLMResultDiagnostics(draftResult),
  })
  const error = new Error(String((draftResult as any).error || (draftResult as any).fallbackReason || '模型未返回正文'))
  throw markBlockedInvalidError(error, validateMinimalChapterProse('').failures[0])
}
await onStage('draft', { status: 'success', word_count: countProseChars(chapterText), modelName: (draftResult as any).modelName, scene_status: 'generated', prompt_diagnostics: draftPromptDiagnostics, plain_text_fallback_used: Boolean(plainProseFallback && !targetProse?.chapter_text && !targetProse?.chapterText && !resultPayload?.chapter_text && !resultPayload?.chapterText) })
let finalText = String(chapterText || '')
const initialOpeningContinuityAssessment = assessInitialProseOpeningContinuity(finalText, enrichContextWithProgressResync(enrichContextWithStrongHandoff(contextPackage)))
if (initialOpeningContinuityAssessment.failure) {
  const failure = initialOpeningContinuityAssessment.failure
  throw markBlockedInvalidError(Object.assign(new Error(failure.message), {
    code: 'PROSE_ADMISSION_BLOCKED_INVALID',
  }), failure)
}
let finalSceneBreakdown = targetProse?.scene_breakdown || targetProse?.sceneBreakdown || resultPayload?.scene_breakdown || resultPayload?.sceneBreakdown || []
let ohStoryDeliveryReceipts = normalizeStoredOhStoryDeliveryReceipts({
  ...(resultPayload || {}),
  ...(targetProse || {}),
  chapter_blueprint: targetProse?.chapter_blueprint
    || targetProse?.chapterBlueprint
    || resultPayload?.chapter_blueprint
    || resultPayload?.chapterBlueprint
    || contextPackage?.chapter_target?.chapter_blueprint
    || contextPackage?.chapter_target?.chapterBlueprint,
  scene_card_receipts: [
    ...asArray(resultPayload?.scene_card_receipts || resultPayload?.sceneCardReceipts),
    ...asArray(targetProse?.scene_card_receipts || targetProse?.sceneCardReceipts),
    ...asArray(finalSceneBreakdown)
      .map((scene: any) => scene?.scene_card_receipts || scene?.sceneCardReceipts)
      .filter(Boolean),
  ],
  delivery_risk_receipts: [
    ...asArray(resultPayload?.delivery_risk_receipts || resultPayload?.deliveryRiskReceipts),
    ...asArray(targetProse?.delivery_risk_receipts || targetProse?.deliveryRiskReceipts),
  ],
  revision_context_receipts: [
    ...asArray(resultPayload?.revision_context_receipts || resultPayload?.revisionContextReceipts),
    ...asArray(targetProse?.revision_context_receipts || targetProse?.revisionContextReceipts),
  ],
  revision_receipts: [
    ...asArray(resultPayload?.revision_receipts || resultPayload?.revisionReceipts),
    ...asArray(targetProse?.revision_receipts || targetProse?.revisionReceipts),
  ],
  artifact_protocol_receipts: [
    ...asArray(resultPayload?.artifact_protocol_receipts || resultPayload?.artifactProtocolReceipts),
    ...asArray(targetProse?.artifact_protocol_receipts || targetProse?.artifactProtocolReceipts),
  ],
  pre_draft_execution_receipts: resultPayload?.pre_draft_execution_receipts
    || resultPayload?.preDraftExecutionReceipts
    || targetProse?.pre_draft_execution_receipts
    || targetProse?.preDraftExecutionReceipts,
}) || { chapter_blueprint: null, scene_card_receipts: [], delivery_risk_receipts: [], revision_context_receipts: [], revision_receipts: [], deslop_repair_receipts: [], quality_audit_repair_receipts: [], artifact_protocol_receipts: [], pre_draft_execution_receipts: null }
let finalContinuityNotes = targetProse?.continuity_notes || targetProse?.continuityNotes || resultPayload?.continuity_notes || resultPayload?.continuityNotes || chapter.continuity_notes || []

  const editorRewrite: any = null
  const memePolish: any = null
  const readabilityReview: any = null
  return {
    finalText,
    finalSceneBreakdown,
    finalContinuityNotes,
    ohStoryDeliveryReceipts,
    generatedTitlePatch,
    draftPromptDiagnostics,
    editorRewrite,
    memePolish,
    readabilityReview,
  }
}
