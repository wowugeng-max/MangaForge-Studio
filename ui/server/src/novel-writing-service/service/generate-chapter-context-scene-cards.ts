import {
  listNovelChapters,
  updateNovelChapter,
} from '../../novel'
import {
  enrichContextWithStrongHandoff,
} from '../../novel-writing/chapter-handoff-basics'
import {
  enrichContextWithProgressResync,
} from '../../novel-writing/chapter-progress-ledger'
import {
  resolveStrictPreflightReadiness,
} from '../../novel-writing/prose-generation-contract'
import {
  applyChapterWordTargetToContext,
  resolveChapterWordTarget,
} from '../../novel-writing/word-target'
import {
  asArray,
} from '../../routes/novel-route-utils'
import {
  formatAdmissionError,
} from '../quality/admission-error'
import {
  chapterGenerationSourceFingerprint,
  resolveChapterGenerationSource,
} from '../generation-source/source-config'
import { ChapterGenerationSourceError } from '../generation-source/errors'
import {
  prepareProseGenerationContract,
} from '../quality/prose-quality-entry'

export async function runGenerateChapterContextAndSceneCards(args: {
  activeWorkspace: string
  projectId: number
  project: any
  expectedAuthorityFingerprint: string
  getProject: (workspace: string, projectId: number) => Promise<any>
  chapter: any
  chapters: any[]
  worldbuilding: any
  characters: any[]
  outlines: any[]
  reviews: any[]
  settings: any[]
  chapterSettingUsage: any[]
  projectSettingUsage: any[]
  options: any
  preferredModelId: any
  llmControlOptions: any
  productionMode: string
  isSceneCardsOnly: boolean
  approvalPolicy: any
  approvals: any
  configSnapshot: any
  runtime: any
  buildChapterContextPackage: (...a: any[]) => any
  repairChapterMaterials: (...a: any[]) => any
  autoRepairChapterPreflightGaps: (...a: any[]) => any
  generateSceneCardsForChapter: (...a: any[]) => any
  approvalRequired: (...a: any[]) => any
  buildApprovalError: (...a: any[]) => any
  throwIfChapterGenerationAborted: () => void
  onStage: (...a: any[]) => any
}): Promise<any> {
  let {
    activeWorkspace,
    projectId,
    project,
    expectedAuthorityFingerprint,
    getProject,
    chapter,
    chapters,
    worldbuilding,
    characters,
    outlines,
    reviews,
    settings,
    chapterSettingUsage,
    projectSettingUsage,
    options,
    preferredModelId,
    llmControlOptions,
    productionMode,
    isSceneCardsOnly,
    approvalPolicy,
    approvals,
    configSnapshot,
    runtime,
    buildChapterContextPackage,
    repairChapterMaterials,
    autoRepairChapterPreflightGaps,
    generateSceneCardsForChapter,
    approvalRequired,
    buildApprovalError,
    throwIfChapterGenerationAborted,
    onStage,
  } = args

const buildGenerationContext = async () => runtime?.buildChapterContext
  ? runtime.buildChapterContext({
      workspace: activeWorkspace,
      project,
      chapter,
      chapters,
      worldbuilding,
      characters,
      outlines,
      reviews,
      settings,
      chapterSettingUsage,
      projectSettingUsage,
    })
  : buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews, {
      settingEntities: settings,
      chapterSettingUsage,
      projectSettingUsage,
      persistSettingUsage: false,
    })
let wordTarget = resolveChapterWordTarget(project, chapter, options)
const persistedChapterSettingUsage = chapterSettingUsage
const persistedProjectSettingUsage = projectSettingUsage
const initialContextPackage = applyChapterWordTargetToContext(
  await buildGenerationContext(),
  wordTarget,
)
let stagedContextUsageReplacement = initialContextPackage?.setting_context?.auto_matched
  ? asArray(initialContextPackage?.setting_context?.chapter_usage)
  : null
if (stagedContextUsageReplacement) {
  chapterSettingUsage = stagedContextUsageReplacement
  projectSettingUsage = [
    ...projectSettingUsage.filter((usage: any) => Number(usage?.chapter_id || 0) !== chapter.id),
    ...chapterSettingUsage,
  ]
}
let preparedGeneration = prepareProseGenerationContract(initialContextPackage, options)
let contextPackage = preparedGeneration.contextPackage
let generationContract = preparedGeneration.contract
let strictPreflightReadiness = resolveStrictPreflightReadiness(contextPackage.preflight)
let stagedPreflightRepair: any = null
let propagatePersistedMaterials = false
const enforcePreparedGate = async (requireSceneCards: boolean) => {
  try {
    await preparedGeneration.runAfterGate(async () => undefined, requireSceneCards)
  } catch (error: any) {
    await onStage(requireSceneCards ? 'scene_cards' : 'context', {
      status: 'failed',
      code: error?.code,
      reasons: error?.gateDecision?.reasons || [],
      gate_decision: error?.gateDecision,
    })
    throw error
  }
}
const contextPreflightReady = contextPackage.preflight.ready === true && strictPreflightReadiness.ready
await onStage('context', {
  status: contextPreflightReady ? 'success' : 'failed',
  score: contextPreflightReady ? 100 : 0,
  warnings: contextPackage.preflight.warnings || [],
  blockers: contextPackage.preflight.blockers || [],
  director_readiness: generationContract.director?.readiness,
})
const preflightNeedsMaterialRepair = contextPackage.preflight.ready !== true || !strictPreflightReadiness.ready
if (preflightNeedsMaterialRepair && options.auto_repair_missing_material === true) {
  const authorityProject = await getProject(activeWorkspace, projectId)
  let authorityFingerprint = ''
  if (authorityProject) {
    try {
      authorityFingerprint = chapterGenerationSourceFingerprint(resolveChapterGenerationSource(authorityProject))
    } catch {
      throw new ChapterGenerationSourceError(
        'GENERATION_SOURCE_CHANGED',
        '章节生成来源已变化，请重试',
        { reason: 'source_changed' },
      )
    }
  }
  if (authorityFingerprint !== expectedAuthorityFingerprint) {
    throw new ChapterGenerationSourceError(
      'GENERATION_SOURCE_CHANGED',
      '章节生成来源已变化，请重试',
      { reason: 'source_changed' },
    )
  }
  const activeGenerationSource = resolveChapterGenerationSource(authorityProject).active
  await onStage('material_repair', { status: 'running', warnings: contextPackage.preflight.warnings || [], blockers: contextPackage.preflight.blockers || [] })
  if (activeGenerationSource === 'mcp') {
    let repaired: any
    try {
      repaired = await repairChapterMaterials({
        activeWorkspace,
        projectId,
        chapterId: chapter.id,
        signal: options.abortSignal,
      })
      if (!repaired || typeof repaired !== 'object'
        || !repaired.context_package || typeof repaired.context_package !== 'object') {
        throw Object.assign(new Error('MCP 材料补齐未返回权威章节上下文'), {
          code: 'MATERIAL_REPAIR_RESULT_INVALID',
          error_code: 'MATERIAL_REPAIR_RESULT_INVALID',
        })
      }
    } catch (error: any) {
      try {
        await onStage('material_repair', {
          status: 'failed',
          code: error?.code || error?.error_code,
          ...(error?.committed === true ? { committed: true } : {}),
        })
      } catch {
        // Preserve the source/commit outcome as the primary production failure.
      }
      throw error
    }

    const skipped = repaired.skipped === true
    stagedContextUsageReplacement = null
    if (!skipped) {
      propagatePersistedMaterials = true
      if (repaired.chapter && typeof repaired.chapter === 'object') chapter = repaired.chapter
      if (Array.isArray(repaired.chapters)) chapters = repaired.chapters
      if (Array.isArray(repaired.worldbuilding)) worldbuilding = repaired.worldbuilding
      if (Array.isArray(repaired.characters)) characters = repaired.characters
      if (Array.isArray(repaired.settings)) settings = repaired.settings
    }
    chapterSettingUsage = Array.isArray(repaired.chapter_setting_usage)
      ? repaired.chapter_setting_usage
      : skipped ? persistedChapterSettingUsage : chapterSettingUsage
    projectSettingUsage = Array.isArray(repaired.project_setting_usage)
      ? repaired.project_setting_usage
      : skipped ? persistedProjectSettingUsage : projectSettingUsage
    projectSettingUsage = [
      ...projectSettingUsage.filter((usage: any) => Number(usage?.chapter_id || 0) !== chapter.id),
      ...chapterSettingUsage,
    ]
    stagedPreflightRepair = null
    wordTarget = resolveChapterWordTarget(project, chapter, options)
    const repairedContextPackage = applyChapterWordTargetToContext(
      repaired.context_package,
      wordTarget,
    )
    preparedGeneration = prepareProseGenerationContract(repairedContextPackage, {
      ...(options || {}),
      allow_incomplete: false,
      allowIncomplete: false,
    })
    contextPackage = preparedGeneration.contextPackage
    if (contextPackage?.setting_context?.auto_matched && chapterSettingUsage.length === 0) {
      stagedContextUsageReplacement = asArray(contextPackage.setting_context.chapter_usage)
    }
    generationContract = preparedGeneration.contract
    strictPreflightReadiness = resolveStrictPreflightReadiness(contextPackage.preflight)
    await onStage('material_repair', {
      status: contextPackage.preflight.ready === true && strictPreflightReadiness.ready ? 'success' : 'warn',
      repaired: asArray(repaired.applied),
      errors: [],
      skipped,
      remaining_warnings: contextPackage.preflight.warnings || [],
      remaining_blockers: contextPackage.preflight.blockers || [],
    })
  } else {
    const repairResult = await autoRepairChapterPreflightGaps(activeWorkspace, project, chapter, contextPackage, preferredModelId, { ...llmControlOptions, persist: false })
    stagedPreflightRepair = repairResult
    chapter = repairResult.chapter || chapter
    chapters = chapters.map(item => item.id === chapter.id ? chapter : item)
    worldbuilding = repairResult.worldbuilding || worldbuilding
    characters = repairResult.characters || characters
    settings = repairResult.settings || settings
    chapterSettingUsage = repairResult.staged_usage_replacement || chapterSettingUsage
    projectSettingUsage = [
      ...projectSettingUsage.filter((usage: any) => Number(usage?.chapter_id || 0) !== chapter.id),
      ...chapterSettingUsage,
    ]
    reviews = [...reviews, ...asArray(repairResult.staged_reviews)]
    wordTarget = resolveChapterWordTarget(project, chapter, options)
    const repairedContextPackage = applyChapterWordTargetToContext(
      runtime?.buildChapterContext ? await buildGenerationContext() : repairResult.context_package,
      wordTarget,
    )
    const repairedWritePrep = repairedContextPackage?.chapter_target?.write_preparation_brief
      || repairedContextPackage?.chapter_target?.writePreparationBrief
      || repairedContextPackage?.pre_draft_brief?.write_preparation_brief
      || repairedContextPackage?.write_preparation_brief
    const repairedWritePrepReady = ['ready', 'ok', 'pass'].includes(String(
      repairedWritePrep?.readiness_status
      || repairedWritePrep?.readinessStatus
      || '',
    ).toLowerCase())
    const postRepairOptions = repairedWritePrepReady
      ? {
          ...(options || {}),
          // Drop stale cockpit launch-gate snapshots after local material repair succeeded.
          chapter_launch_gate: undefined,
          chapterLaunchGate: undefined,
        }
      : options
    preparedGeneration = prepareProseGenerationContract(repairedContextPackage, postRepairOptions)
    contextPackage = preparedGeneration.contextPackage
    if (contextPackage?.setting_context?.auto_matched) stagedContextUsageReplacement = asArray(contextPackage.setting_context.chapter_usage)
    generationContract = preparedGeneration.contract
    strictPreflightReadiness = resolveStrictPreflightReadiness(contextPackage.preflight)
    await onStage('material_repair', {
      status: contextPackage.preflight.ready === true && strictPreflightReadiness.ready ? 'success' : 'warn',
      repaired: repairResult.repaired,
      errors: repairResult.errors,
      remaining_warnings: contextPackage.preflight.warnings || [],
      remaining_blockers: contextPackage.preflight.blockers || [],
    })
  }
}
await enforcePreparedGate(false)
throwIfChapterGenerationAborted()
await onStage('scene_cards', { status: 'running' })
let generatedSceneCardsThisRun = false
if (!generationContract.chapter.scene_cards.length || options.force_scene_cards === true) {
  const sceneResult = await generateSceneCardsForChapter(activeWorkspace, project, contextPackage, preferredModelId, llmControlOptions)
  if (sceneResult.sceneCards.length > 0) {
    generatedSceneCardsThisRun = true
    // Re-align strong handoff onto newly generated scene cards before any persist/use.
    const alignedSceneContext = enrichContextWithStrongHandoff({
      ...contextPackage,
      chapter_target: {
        ...(contextPackage?.chapter_target || {}),
        scene_cards: sceneResult.sceneCards,
        sceneCards: sceneResult.sceneCards,
      },
      ...(contextPackage?.chapterTarget ? {
        chapterTarget: {
          ...contextPackage.chapterTarget,
          scene_cards: sceneResult.sceneCards,
          sceneCards: sceneResult.sceneCards,
        },
      } : {}),
    })
    const alignedSceneCards = asArray(alignedSceneContext?.chapter_target?.scene_cards || sceneResult.sceneCards)
    const sceneChapterPatch = {
      scene_breakdown: alignedSceneCards,
      scene_list: alignedSceneCards,
      raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'chapter_group' },
    }
    if (isSceneCardsOnly) {
      const updatedSceneChapter = await updateNovelChapter(activeWorkspace, chapter.id, sceneChapterPatch as any, { createVersion: false })
      if (updatedSceneChapter) chapter = updatedSceneChapter
      chapters = await listNovelChapters(activeWorkspace, projectId)
    } else {
      chapter = { ...chapter, ...sceneChapterPatch }
      chapters = chapters.map(item => item.id === chapter.id ? chapter : item)
    }
    wordTarget = resolveChapterWordTarget(project, chapter, options)
    const sceneContextPackage = applyChapterWordTargetToContext(
      {
        ...alignedSceneContext,
        chapter_target: {
          ...(alignedSceneContext?.chapter_target || {}),
          scene_cards: alignedSceneCards,
          sceneCards: alignedSceneCards,
        },
        ...(alignedSceneContext?.chapterTarget ? {
          chapterTarget: {
            ...alignedSceneContext.chapterTarget,
            scene_cards: alignedSceneCards,
            sceneCards: alignedSceneCards,
          },
        } : {}),
      },
      wordTarget,
    )
    preparedGeneration = prepareProseGenerationContract(sceneContextPackage, options)
    // Contract merge may reshuffle target fields; keep strong handoff alignment authoritative.
    contextPackage = enrichContextWithProgressResync(enrichContextWithStrongHandoff(preparedGeneration.contextPackage))
    if (contextPackage?.chapter_target?.plan_stale) {
      try {
        const staleTarget = contextPackage.chapter_target || {}
        await updateNovelChapter(activeWorkspace, chapter.id, {
          chapter_goal: staleTarget.goal || staleTarget.chapter_goal || chapter.chapter_goal,
          chapter_summary: staleTarget.summary || staleTarget.chapter_summary || chapter.chapter_summary,
          conflict: staleTarget.conflict || chapter.conflict,
          raw_payload: {
            ...(chapter.raw_payload || {}),
            must_advance: staleTarget.must_advance || [],
            forbidden_repeats: staleTarget.forbidden_repeats || [],
            progress_resync: staleTarget.progress_resync || { plan_stale: true },
            plan_stale: true,
          },
        } as any, { createVersion: false })
        chapter = {
          ...chapter,
          chapter_goal: staleTarget.goal || chapter.chapter_goal,
          chapter_summary: staleTarget.summary || chapter.chapter_summary,
          conflict: staleTarget.conflict || chapter.conflict,
          raw_payload: {
            ...(chapter.raw_payload || {}),
            must_advance: staleTarget.must_advance || [],
            forbidden_repeats: staleTarget.forbidden_repeats || [],
            progress_resync: staleTarget.progress_resync || { plan_stale: true },
            plan_stale: true,
          },
        }
      } catch {
        // seed persist is best-effort; live context already carries resynced plan
      }
    }
    generationContract = prepareProseGenerationContract(contextPackage, options).contract
  }
}
await enforcePreparedGate(true)
await onStage('scene_cards', {
  status: 'success',
  count: generationContract.chapter.scene_cards.length,
  scene_card_titles: generationContract.chapter.scene_cards
    .slice(0, 6)
    .map((card: any) => String(card?.title || card?.scene_title || card?.sceneTitle || `场景${card?.scene_no || card?.sceneNo || ''}`).trim())
    .filter(Boolean),
})
if (generatedSceneCardsThisRun && approvalRequired(approvalPolicy, 'scene_cards', approvals, { count: generationContract.chapter.scene_cards.length })) {
  await onStage('scene_cards', { status: 'needs_confirmation', count: generationContract.chapter.scene_cards.length })
  throw buildApprovalError('scene_cards', '新生成的场景卡等待人工确认', { count: generationContract.chapter.scene_cards.length })
}
if (isSceneCardsOnly) {
  await onStage('migration_plan', { status: 'skipped', reason: '生产模式：只生成场景卡' })
  await onStage('draft', { status: 'skipped', reason: '生产模式：只生成场景卡' })
  await onStage('review', { status: 'skipped', reason: '生产模式：只生成场景卡' })
  await onStage('revise', { status: 'skipped', reason: '生产模式：只生成场景卡' })
  await onStage('safety', { status: 'skipped', reason: '生产模式：只生成场景卡' })
  await onStage('store', { status: 'skipped', reason: '场景卡已保存到章节元数据' })
  await onStage('story_state', { status: 'skipped', reason: '未生成正文，无需更新状态机' })
  return {
    earlyReturn: {
      chapter,
      score: null,
      revised: false,
      production_mode: productionMode,
      completed_stage: 'scene_cards',
      story_state_update: { skipped: true },
      config_snapshot: configSnapshot,
    },
  }
}

return {
  earlyReturn: null,
  chapter,
  chapters,
  worldbuilding,
  characters,
  settings,
  chapterSettingUsage,
  projectSettingUsage,
  wordTarget,
  stagedContextUsageReplacement,
  stagedPreflightRepair: typeof stagedPreflightRepair === 'undefined' ? null : stagedPreflightRepair,
  contextPackage,
  generationContract,
  strictPreflightReadiness,
  generatedSceneCardsThisRun: typeof generatedSceneCardsThisRun === 'undefined' ? false : generatedSceneCardsThisRun,
  propagatePersistedMaterials,
}

}
