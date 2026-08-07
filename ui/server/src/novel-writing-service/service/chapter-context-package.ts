import {
  STORYLINE_TYPES,
} from '../../routes/novel-setting-routes'
import {
  previewNovelKnowledgeInjection,
} from '../../llm'
import {
  listNovelChapterSettingUsage,
  listNovelSettingEntities,
  replaceNovelChapterSettingUsage,
} from '../../novel'
import {
  buildCanonicalSurfaceIndex,
} from '../../novel-writing/canonical-continuity'
import {
  enrichContextWithStrongHandoff,
  readChapterOutgoingHandoff,
} from '../../novel-writing/chapter-handoff-basics'
import {
  enrichContextWithProgressResync,
  readChapterProgressLedger,
} from '../../novel-writing/chapter-progress-ledger'
import {
  selectEstablishedEventsForChapter,
} from '../../novel-writing/established-event-canon'
import {
  normalizeLongformCompass,
} from '../../novel-writing/longform-compass'
import {
  first30RetentionBriefFromContext,
} from '../../novel-writing/reader-retention-brief'
import {
  normalizeRecentFatigueBrief,
} from '../../novel-writing/rolling-rhythm-preflight'
import {
  normalizeSignatureSceneBrief,
} from '../../novel-writing/signature-scene-basics'
import {
  buildChapterTitleUniquenessReport,
} from '../../novel-writing/title-uniqueness'
import {
  resolveChapterWordTarget,
} from '../../novel-writing/word-target'
import {
  applyBenchmarkRecallPreflightChecks,
  asArray,
  buildPreflightChecks,
  compactText,
  deepMergeObjects,
  getSafetyPolicy,
  getStoryState,
  getVolumePlan,
  getStyleLock,
} from '../../routes/novel-route-utils'
import {
  buildSettingRelationshipGraph,
} from '../../routes/novel-setting-relationship-graph'
import {
  buildReaderExpectationDebtContext,
  buildSerialMomentumBrief,
  buildSerialQualityRegressionBrief,
  mergeRecentFatigueBriefs,
  normalizeReaderExpectationDebtContext,
} from '../batch-serial/serial-momentum'
import {
  resolveMemeBank,
  resolveStyleSampleBank,
} from '../post-delivery/asset-banks'
import {
  buildPreviousChapterHandoff,
} from '../post-delivery/chapter-handoff-contracts'
import {
  buildDeliveryRiskCarryOverContext,
  normalizeStoredOhStoryDeliveryReceipts,
} from '../post-delivery/delivery-risk-carry-over'
import {
  normalizeDeliveryRiskCarryOverContext,
} from '../post-delivery/delivery-risk-core'
import {
  normalizeSceneCardsPayload,
} from '../post-delivery/scene-cards'
import {
  buildBenchmarkRecallBrief,
} from '../quality/intent-benchmark-contracts'
import {
  buildFirst30RetentionContext,
  buildLongformMemoryCapsule,
  buildStoryUnitContext,
  latestLongformCompassFromReviews,
  normalizeDailyContextSnapshot,
  normalizeDailyProgressSummary,
  normalizeForeshadowingConsistencyRadar,
  normalizeLayeredMemoryContext,
  normalizeStoryUnitContext,
} from '../quality/memory-longform-contracts'
import {
  mergeConfirmedPreDraftBriefIntoContext,
} from '../quality/pre-draft-brief'
import {
  repairSceneCardsForProseContextHandoff,
} from '../quality/preflight-auto-repair'
import {
  attachOhStoryDirectorToContextPackage,
} from '../quality/prose-quality-entry'
import {
  applySourceReadinessPreflightChecks,
  buildStateTrackingContract,
} from '../quality/state-tracking-contracts'
import {
  buildChapterBenchmarkStrategy,
  buildMemeStrategy,
  buildStyleSampleEffectivenessForSelection,
  buildStyleSampleStrategy,
} from '../quality/style-sample-strategy'
import {
  buildHeuristicSettingUsage,
} from './runtime-helpers'
import {
  buildWritingBible,
} from './writing-bible'

export type ChapterContextPackageOptions = {
  settingEntities?: any[]
  chapterSettingUsage?: any[]
  projectSettingUsage?: any[]
  persistSettingUsage?: boolean
  referencePreview?: any
}

export async function resolveChapterContextReferencePreview(
  project: any,
  contextOptions: ChapterContextPackageOptions,
  preview: typeof previewNovelKnowledgeInjection = previewNovelKnowledgeInjection,
) {
  if (Object.prototype.hasOwnProperty.call(contextOptions, 'referencePreview')
    && contextOptions.referencePreview !== undefined) {
    return contextOptions.referencePreview
  }
  try {
    return await preview(project, '正文创作')
  } catch {
    return null
  }
}

export async function buildChapterContextPackage(
  activeWorkspace: string,
  project: any,
  chapter: any,
  chapters: any[],
  worldbuilding: any[],
  characters: any[],
  outlines: any[],
  reviews: any[] = [],
  contextOptions: ChapterContextPackageOptions = {},
) {
  const sorted = [...chapters].sort((a, b) => a.chapter_no - b.chapter_no)
  const previousChapter = sorted.filter(ch => ch.chapter_no < chapter.chapter_no).slice(-1)[0] || null
  const previousProseChapters = sorted
    .filter(ch => ch.chapter_no < chapter.chapter_no && ch.chapter_text)
    .slice(-3)
    .map(ch => ({
      chapter_no: ch.chapter_no,
      title: ch.title,
      chapter_summary: ch.chapter_summary || compactText(ch.chapter_text, 240),
      ending_hook: ch.ending_hook || '',
      ending_excerpt: String(ch.chapter_text || '').slice(-800),
    }))
  const referencePreview = await resolveChapterContextReferencePreview(project, contextOptions)
  const rawSceneCards = Array.isArray(chapter.scene_list) && chapter.scene_list.length
    ? chapter.scene_list
    : (Array.isArray(chapter.scene_breakdown) ? chapter.scene_breakdown : [])
  const sceneCardContextSeed = {
    chapter_target: {
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      summary: chapter.chapter_summary || '',
      conflict: chapter.conflict || '',
      ending_hook: chapter.ending_hook || '',
    },
  }
  const sceneCards = repairSceneCardsForProseContextHandoff(
    normalizeSceneCardsPayload({ scene_cards: rawSceneCards }, sceneCardContextSeed),
    sceneCardContextSeed,
    chapter,
  )
  const chapterRawPreDraftBrief = {
    ...(chapter.raw_payload?.pre_draft_brief || {}),
    ...(chapter.raw_payload?.preDraftBrief || {}),
  }
  const chapterDeliveryReceipts = normalizeStoredOhStoryDeliveryReceipts(chapter.raw_payload || {})
  const preflight = buildPreflightChecks(project, chapter, previousChapter, worldbuilding, characters, sceneCards, referencePreview, reviews)
  const titleUniquenessReport = buildChapterTitleUniquenessReport(sorted, chapter)
  const wordTarget = resolveChapterWordTarget(project, chapter, {})
  const styleLock = { ...getStyleLock(project), chapter_word_range: wordTarget.rangeText }
  const safetyPolicy = getSafetyPolicy(project)
  const writingBible = project.reference_config?.writing_bible || buildWritingBible(project, worldbuilding, characters, outlines, reviews)
  const memeBank = resolveMemeBank(project, { writing_bible: writingBible })
  const styleSampleBank = resolveStyleSampleBank(project, { writing_bible: writingBible })
  const styleSampleEffectiveness = buildStyleSampleEffectivenessForSelection(styleSampleBank, sorted, reviews)
  const first30RetentionContext = buildFirst30RetentionContext(chapter, reviews)
  const readerExpectationDebtContext = buildReaderExpectationDebtContext(chapter, sorted, reviews)
  const deliveryRiskCarryOverContext = buildDeliveryRiskCarryOverContext(chapter, sorted, reviews)
  const storyUnitContext = buildStoryUnitContext(chapter, sorted, outlines)
  const serialMomentumBrief = buildSerialMomentumBrief(chapter, sorted)
  const serialQualityRegressionBrief = buildSerialQualityRegressionBrief(chapter, sorted, reviews)
  const serialFatigueBrief = mergeRecentFatigueBriefs(serialMomentumBrief, serialQualityRegressionBrief)
  const previousHandoff = buildPreviousChapterHandoff({
    chapter_target: chapterRawPreDraftBrief,
    continuity: {
      previous_chapter: previousChapter ? {
        chapter_no: previousChapter.chapter_no,
        title: previousChapter.title,
        chapter_goal: previousChapter.chapter_goal || '',
        chapter_summary: previousChapter.chapter_summary || '',
        conflict: previousChapter.conflict || '',
        ending_hook: previousChapter.ending_hook || '',
        ending_excerpt: String(previousChapter.chapter_text || '').slice(-800),
        chapter_text: previousChapter.chapter_text || '',
        outgoing_handoff: readChapterOutgoingHandoff(previousChapter),
        chapter_progress_ledger: readChapterProgressLedger(previousChapter),
        raw_payload: {
          must_advance: previousChapter.raw_payload?.must_advance,
          outgoing_handoff: readChapterOutgoingHandoff(previousChapter),
          chapter_progress_ledger: readChapterProgressLedger(previousChapter),
        },
      } : null,
    },
  })
  const fallbackCompass = normalizeLongformCompass({
    reader_promise: writingBible.reader_promise || writingBible.promise || writingBible.core_selling_point || project.synopsis,
    core_conflict: writingBible.core_conflict || writingBible.mainline?.core_conflict,
    innovation_hook: writingBible.innovation_hook || writingBible.core_selling_point,
    payoff_loop: writingBible.payoff_loop || writingBible.style_lock?.payoff_density || writingBible.payoff_density,
    ending_direction: writingBible.ending_direction || writingBible.mainline?.ending_direction,
  })
  const longformCompass = latestLongformCompassFromReviews(reviews) || fallbackCompass
  const longformMemoryCapsule = buildLongformMemoryCapsule(project, writingBible)
  const storyStateForEvents = getStoryState(project) || project?.reference_config?.story_state || {}
  const storyStateGlobalForEvents = storyStateForEvents?.global || storyStateForEvents || {}
  const establishedEventsContract = {
    version: 'established_event_canon_v1',
    events: selectEstablishedEventsForChapter({
      events: [
        ...asArray(storyStateForEvents.established_events),
        ...asArray(storyStateGlobalForEvents.established_events),
        ...asArray(storyStateForEvents.canon_facts),
        ...asArray(storyStateGlobalForEvents.canon_facts),
      ],
      chapterNo: Number(chapter.chapter_no || 0),
      outlineText: [
        chapter.chapter_summary || '',
        chapter.conflict || '',
        chapter.chapter_goal || '',
        JSON.stringify(chapter.raw_payload?.outline || chapter.raw_payload?.blueprint || {}),
      ].join('\n'),
      previousExcerpt: previousChapter
        ? String(previousChapter.ending_hook || '') + '\n' + String(previousChapter.chapter_text || '').slice(-800)
        : '',
      limit: 10,
    }),
    hard_rules: [
      '复述已锁正史事件时，不得改写 cause/mechanism/constraints；只能同义转述。',
      '闪回前任死亡、规则触发、能力代价时必须命中 established_events_contract.events。',
    ],
  }
  const layeredMemoryContext = normalizeLayeredMemoryContext(
    project?.reference_config?.story_state?.layered_memory_context
    || project?.story_state?.layered_memory_context,
  )
  const progressSummary = normalizeDailyProgressSummary(
    project?.reference_config?.story_state?.progress_summary
    || project?.reference_config?.storyState?.progressSummary
    || project?.story_state?.progress_summary
    || project?.storyState?.progressSummary,
  )
  const dailyContextSnapshot = normalizeDailyContextSnapshot(
    project?.reference_config?.story_state?.daily_context_snapshot
    || project?.reference_config?.story_state?.dailyContextSnapshot
    || project?.reference_config?.storyState?.dailyContextSnapshot
    || project?.story_state?.daily_context_snapshot
    || project?.story_state?.dailyContextSnapshot
    || project?.storyState?.dailyContextSnapshot,
  )
  const foreshadowingConsistencyRadar = normalizeForeshadowingConsistencyRadar(
    project?.reference_config?.story_state?.foreshadowing_consistency_radar
    || project?.reference_config?.story_state?.foreshadowingConsistencyRadar
    || project?.reference_config?.storyState?.foreshadowingConsistencyRadar
    || project?.story_state?.foreshadowing_consistency_radar
    || project?.story_state?.foreshadowingConsistencyRadar
    || project?.storyState?.foreshadowingConsistencyRadar
    || {
      foreshadowing_status: project?.reference_config?.story_state?.foreshadowing_status
        || project?.reference_config?.story_state?.foreshadowingStatus
        || project?.reference_config?.storyState?.foreshadowingStatus
        || project?.story_state?.foreshadowing_status
        || project?.story_state?.foreshadowingStatus
        || project?.storyState?.foreshadowingStatus,
      payoff_queue: project?.reference_config?.story_state?.payoff_queue
        || project?.reference_config?.story_state?.payoffQueue
        || project?.reference_config?.storyState?.payoffQueue
        || project?.story_state?.payoff_queue
        || project?.story_state?.payoffQueue
        || project?.storyState?.payoffQueue,
    },
    Number(chapter.chapter_no || 0),
  )
  const [storedSettingEntities, storedChapterSettingUsage, storedProjectSettingUsage] = await Promise.all([
    contextOptions.settingEntities ? Promise.resolve(contextOptions.settingEntities) : listNovelSettingEntities(activeWorkspace, project.id).catch(() => []),
    contextOptions.chapterSettingUsage ? Promise.resolve(contextOptions.chapterSettingUsage) : listNovelChapterSettingUsage(activeWorkspace, project.id, chapter.id).catch(() => []),
    contextOptions.projectSettingUsage ? Promise.resolve(contextOptions.projectSettingUsage) : listNovelChapterSettingUsage(activeWorkspace, project.id).catch(() => []),
  ])
  const settingEntities = storedSettingEntities
  const projectSettingUsage = storedProjectSettingUsage
  let chapterSettingUsage = storedChapterSettingUsage
  let settingUsageAutoMatched = false
  if (chapterSettingUsage.length === 0 && settingEntities.length > 0) {
    const suggestedUsage = buildHeuristicSettingUsage(chapter, settingEntities)
    if (suggestedUsage.length > 0) {
      chapterSettingUsage = contextOptions.persistSettingUsage === false
        ? suggestedUsage as any
        : await replaceNovelChapterSettingUsage(activeWorkspace, project.id, chapter.id, suggestedUsage as any).catch(() => suggestedUsage as any)
      settingUsageAutoMatched = true
    }
  }
  const usageEntityIds = new Set(chapterSettingUsage.map((item: any) => Number(item.entity_id || 0)).filter(Boolean))
  const relatedSettings = settingEntities.filter((item: any) => {
    const first = Number(item.first_chapter_no || 0)
    const last = Number(item.last_chapter_no || 0)
    return usageEntityIds.has(item.id)
      || asArray(item.related_chapter_ids).map(Number).includes(Number(chapter.id))
      || (first > 0 && Number(chapter.chapter_no) >= first && (!last || Number(chapter.chapter_no) <= last))
  })
  const settingById = new Map(settingEntities.map((item: any) => [Number(item.id), item]))
  const relationshipGraph = buildSettingRelationshipGraph({
    settings: settingEntities,
    characters,
    chapters: sorted,
    usage: [
      ...asArray(projectSettingUsage).filter((usage: any) => Number(usage.chapter_id || 0) !== Number(chapter.id)),
      ...chapterSettingUsage,
    ],
  })
  const relationshipGraphContext = {
    summary: relationshipGraph.summary,
    diagnostics: relationshipGraph.diagnostics.slice(0, 30),
  }
  const settingContext = {
    entities: relatedSettings.map((item: any) => ({
      id: item.id,
      type: item.entity_type,
      name: item.name,
      summary: item.summary || '',
      status: item.status || 'active',
      visibility: item.visibility || 'public',
      constraints: item.constraints_json || {},
      state: item.state_json || {},
      first_chapter_no: item.first_chapter_no || null,
      last_chapter_no: item.last_chapter_no || null,
    })),
    chapter_usage: chapterSettingUsage.map((usage: any) => {
      const entity = settingById.get(Number(usage.entity_id || 0))
      return {
        ...usage,
        entity_type: entity?.entity_type || '',
        name: entity?.name || '',
        summary: entity?.summary || '',
        constraints: entity?.constraints_json || {},
        state: entity?.state_json || {},
      }
    }),
    required: chapterSettingUsage.filter((item: any) => item.required && !item.forbidden).map((usage: any) => settingById.get(Number(usage.entity_id))?.name).filter(Boolean),
    forbidden: chapterSettingUsage.filter((item: any) => item.forbidden).map((usage: any) => settingById.get(Number(usage.entity_id))?.name).filter(Boolean),
    auto_matched: settingUsageAutoMatched,
    type_counts: settingEntities.reduce((acc: Record<string, number>, item: any) => {
      const key = item.entity_type || 'rule'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {}),
    relationship_graph: relationshipGraphContext,
  }
  const storylineSettings = relatedSettings.filter((item: any) => STORYLINE_TYPES.includes(item.entity_type))
  const storylineUsage = chapterSettingUsage
    .map((usage: any) => {
      const entity = settingById.get(Number(usage.entity_id || 0))
      if (!entity || !STORYLINE_TYPES.includes(entity.entity_type)) return null
      return {
        ...usage,
        entity_type: entity.entity_type || '',
        name: entity.name || '',
        summary: entity.summary || '',
        constraints: entity.constraints_json || {},
        state: entity.state_json || {},
        payload: entity.payload_json || {},
      }
    })
    .filter(Boolean)
  const storylineContext = {
    entities: storylineSettings.map((item: any) => ({
      id: item.id,
      type: item.entity_type,
      name: item.name,
      summary: item.summary || '',
      status: item.status || 'active',
      visibility: item.visibility || 'public',
      constraints: item.constraints_json || {},
      state: item.state_json || {},
      payload: item.payload_json || {},
      first_chapter_no: item.first_chapter_no || null,
      last_chapter_no: item.last_chapter_no || null,
    })),
    chapter_usage: storylineUsage,
    required: storylineUsage
      .filter((item: any) => ['advance', 'plant', 'payoff', 'required'].includes(String(item.usage_type || '')) || (item.required && !item.forbidden))
      .map((usage: any) => usage.name)
      .filter(Boolean),
    forbidden: storylineUsage
      .filter((item: any) => item.forbidden || item.usage_type === 'forbidden')
      .map((usage: any) => usage.name)
      .filter(Boolean),
    advance: storylineUsage.filter((item: any) => item.usage_type === 'advance'),
    plant: storylineUsage.filter((item: any) => item.usage_type === 'plant'),
    payoff: storylineUsage.filter((item: any) => item.usage_type === 'payoff'),
    pause: storylineUsage.filter((item: any) => item.usage_type === 'pause'),
    forbidden_usage: storylineUsage.filter((item: any) => item.usage_type === 'forbidden' || item.forbidden),
  }
  const settingChecks = [
    { key: 'setting_workshop', ok: settingEntities.length > 0, severity: 'medium', label: '设定工坊', fix: '在右侧“设定”中从项目资料补齐角色、境界、能力、物品、Boss、规则等设定。' },
    { key: 'chapter_setting_usage', ok: chapterSettingUsage.length > 0, severity: 'low', label: '本章设定调用', fix: '在本章设定调用中标记必用、允许或禁揭设定。' },
  ]
  const titleChecks = [
    {
      key: 'chapter_title_unique',
      ok: titleUniquenessReport.status === 'ok',
      severity: 'low',
      label: '章节标题去重',
      fix: titleUniquenessReport.fix || '保持标题唯一。',
      duplicates: titleUniquenessReport.duplicates,
    },
  ]
  preflight.checks.push(...settingChecks, ...titleChecks)
  preflight.warnings.push(...settingChecks.filter(item => !item.ok).map(item => `${item.label}不足`))
  preflight.warnings.push(...titleChecks.filter(item => !item.ok).map(item => `${item.label}：${titleUniquenessReport.duplicates.map((dup: any) => `第${dup.chapter_no}章《${dup.title}》`).join('、')}`))
  preflight.blockers.push(...settingChecks.filter(item => !item.ok && item.severity === 'high'))
  preflight.ready = preflight.blockers.length === 0
  preflight.strict_ready = preflight.checks.every((item: any) => item.ok || item.severity === 'low')
  const chapterRollingPlan = chapter.raw_payload?.rollingPlan || chapter.raw_payload?.rolling_plan || null
  const signatureSceneBrief = normalizeSignatureSceneBrief(chapter.raw_payload?.signature_scene_brief || chapterRollingPlan)
  const storyState = getStoryState(project)
  const storyStateGlobal = storyState?.global || storyState || {}
  const canonicalSurfaceIndex = buildCanonicalSurfaceIndex({
    previous_chapters: sorted
      .filter(ch => ch.chapter_no < chapter.chapter_no && (ch.chapter_text || ch.chapterText))
      .map(ch => ({
        chapter_no: ch.chapter_no,
        chapter_text: ch.chapter_text || ch.chapterText,
      })),
    canon_facts: [
      ...asArray(storyState?.canon_facts),
      ...asArray(storyState?.canonFacts),
      ...asArray(storyStateGlobal?.canon_facts),
      ...asArray(storyStateGlobal?.canonFacts),
      ...asArray(storyState?.facts),
      ...asArray(storyStateGlobal?.facts),
    ],
    setting_entities: settingEntities,
  })
  const chapterBlueprintSeed = chapter.raw_payload?.chapter_blueprint
    || chapter.raw_payload?.chapterBlueprint
    || null
  const handoffContextSeed = enrichContextWithStrongHandoff({
    chapter_target: {
      previous_handoff: previousHandoff,
      goal: chapter.chapter_goal || '',
      summary: chapter.chapter_summary || '',
      scene_cards: sceneCards,
      chapter_blueprint: chapterBlueprintSeed,
    },
    continuity: {
      previous_chapter: previousChapter ? {
        chapter_no: previousChapter.chapter_no,
        title: previousChapter.title,
        chapter_goal: previousChapter.chapter_goal || '',
        chapter_summary: previousChapter.chapter_summary || '',
        conflict: previousChapter.conflict || '',
        ending_hook: previousChapter.ending_hook || '',
        ending_excerpt: String(previousChapter.chapter_text || '').slice(-800),
        chapter_text: previousChapter.chapter_text || '',
        outgoing_handoff: readChapterOutgoingHandoff(previousChapter),
        chapter_progress_ledger: readChapterProgressLedger(previousChapter),
        raw_payload: {
          must_advance: previousChapter.raw_payload?.must_advance,
          outgoing_handoff: readChapterOutgoingHandoff(previousChapter),
          chapter_progress_ledger: readChapterProgressLedger(previousChapter),
        },
      } : null,
    },
  })
  const strongHandoffTarget = handoffContextSeed?.chapter_target || {}
  const strongHandoffAnchors = asArray(strongHandoffTarget?.requiredHandoffAnchors || handoffContextSeed?.requiredHandoffAnchors)
  const strongOpeningObligations = asArray(strongHandoffTarget?.opening_obligations)
  const strongSceneCards = asArray(strongHandoffTarget?.scene_cards).length
    ? asArray(strongHandoffTarget?.scene_cards)
    : sceneCards
  const strongAlignedGoal = strongHandoffTarget?.goal || chapter.chapter_goal || ''
  const strongAlignedSummary = strongHandoffTarget?.summary || chapter.chapter_summary || ''
  const strongAlignedBlueprint = strongHandoffTarget?.chapter_blueprint
    || strongHandoffTarget?.chapterBlueprint
    || chapterBlueprintSeed
  const basePackage = {
    project: {
      id: project.id,
      title: project.title,
      genre: project.genre || '',
      synopsis: project.synopsis || '',
      style_tags: project.style_tags || [],
      length_target: project.length_target || 'medium',
      target_audience: project.target_audience || '',
    },
    chapter_target: {
      id: chapter.id,
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      goal: strongAlignedGoal,
      summary: strongAlignedSummary,
      conflict: chapter.conflict || '',
      ending_hook: chapter.ending_hook || '',
      previous_handoff: previousHandoff,
      requiredHandoffAnchors: strongHandoffAnchors,
      required_handoff_anchors: strongHandoffAnchors,
      opening_obligations: strongOpeningObligations.length ? strongOpeningObligations : asArray(chapter.raw_payload?.opening_obligations),
      handoff_opening_alignment: strongHandoffTarget?.handoff_opening_alignment,
      chapter_blueprint: strongAlignedBlueprint || undefined,
      rollingPlan: chapterRollingPlan || undefined,
      signature_scene_brief: signatureSceneBrief,
      scene_cards: strongSceneCards,
      word_target: wordTarget,
      title_uniqueness_report: titleUniquenessReport,
      meme_strategy: buildMemeStrategy(project, { writing_bible: writingBible, chapter_target: Object.keys(chapterRawPreDraftBrief).length ? { meme_strategy: chapterRawPreDraftBrief.meme_strategy } : {} }),
      style_sample_strategy: buildStyleSampleStrategy(project, {
        writing_bible: writingBible,
        style_sample_effectiveness: styleSampleEffectiveness,
        chapter_target: Object.keys(chapterRawPreDraftBrief).length
          ? { style_sample_strategy: chapterRawPreDraftBrief.style_sample_strategy }
          : {},
      }),
      chapter_benchmark_strategy: buildChapterBenchmarkStrategy(project, { writing_bible: writingBible, chapter_target: Object.keys(chapterRawPreDraftBrief).length ? { chapter_benchmark_strategy: chapterRawPreDraftBrief.chapter_benchmark_strategy } : {} }),
      first30_retention_brief: first30RetentionBriefFromContext(chapter.raw_payload || {}) || first30RetentionContext,
      story_unit_context: normalizeStoryUnitContext(chapterRawPreDraftBrief.story_unit_context || chapterRawPreDraftBrief.storyUnitContext, Number(chapter.chapter_no || 0)) || storyUnitContext,
      recent_fatigue_brief: normalizeRecentFatigueBrief(chapterRawPreDraftBrief.recent_fatigue_brief || chapterRawPreDraftBrief.recentFatigueBrief) || serialFatigueBrief,
      reader_expectation_debt_context: (chapterRawPreDraftBrief.reader_expectation_debt || chapterRawPreDraftBrief.readerExpectationDebt)
        ? normalizeReaderExpectationDebtContext(chapterRawPreDraftBrief.reader_expectation_debt || chapterRawPreDraftBrief.readerExpectationDebt)
        : readerExpectationDebtContext,
      delivery_risk_carry_over: (chapterRawPreDraftBrief.delivery_risk_carry_over || chapterRawPreDraftBrief.deliveryRiskCarryOver)
        ? normalizeDeliveryRiskCarryOverContext(chapterRawPreDraftBrief.delivery_risk_carry_over || chapterRawPreDraftBrief.deliveryRiskCarryOver)
        : deliveryRiskCarryOverContext,
      longform_memory_capsule: longformMemoryCapsule,
      established_events_contract: establishedEventsContract,
      progress_summary: progressSummary,
      daily_context_snapshot: dailyContextSnapshot,
      foreshadowing_consistency_radar: foreshadowingConsistencyRadar,
      continuity_notes: chapter.continuity_notes || [],
      must_advance: asArray(chapter.raw_payload?.must_advance),
      forbidden_repeats: asArray(chapter.raw_payload?.forbidden_repeats),
      delivery_receipts: chapterDeliveryReceipts || undefined,
      oh_story_delivery_receipts: chapterDeliveryReceipts || undefined,
    },
    continuity: {
      previous_chapter: previousChapter ? {
        chapter_no: previousChapter.chapter_no,
        title: previousChapter.title,
        summary: previousChapter.chapter_summary || '',
        chapter_goal: previousChapter.chapter_goal || '',
        chapter_summary: previousChapter.chapter_summary || '',
        conflict: previousChapter.conflict || '',
        ending_hook: previousChapter.ending_hook || '',
        ending_excerpt: String(previousChapter.chapter_text || '').slice(-800),
        chapter_text: previousChapter.chapter_text || '',
        outgoing_handoff: readChapterOutgoingHandoff(previousChapter),
        chapter_progress_ledger: readChapterProgressLedger(previousChapter),
        raw_payload: {
          must_advance: previousChapter.raw_payload?.must_advance,
          outgoing_handoff: readChapterOutgoingHandoff(previousChapter),
          chapter_progress_ledger: readChapterProgressLedger(previousChapter),
        },
      } : null,
      previous_prose_chapters: previousProseChapters,
    },
    story_state: {
      global: getStoryState(project),
      progress_summary: progressSummary,
      daily_context_snapshot: dailyContextSnapshot,
      foreshadowing_consistency_radar: foreshadowingConsistencyRadar,
      recent_state_entries: preflight.recent_state_entries,
      worldbuilding: worldbuilding[0] || null,
      characters: characters.map(char => ({
        id: char.id,
        name: char.name,
        role: char.role || char.role_type || '',
        archetype: char.archetype || '',
        personality: char.personality || [],
        motivation: char.motivation || '',
        goal: char.goal || '',
        conflict: char.conflict || '',
        appearance: char.appearance || '',
        backstory: char.backstory || '',
        secret: char.secret || '',
        relationships: char.relationships || [],
        relationship_graph: char.relationship_graph || {},
        growth_arc: char.growth_arc || '',
        arc_hint: char.arc_hint || '',
        current_state: char.current_state || {},
        abilities: char.abilities || [],
        profile: char.raw_payload?.profile || {},
        items: char.current_state?.items || char.raw_payload?.items || [],
        knowledge_scope: char.current_state?.knowledge_scope || [],
        information_boundaries: char.current_state?.information_boundaries || [],
      })),
      outlines: outlines.slice(0, 20).map(outline => ({
        id: outline.id,
        type: outline.outline_type,
        title: outline.title,
        summary: outline.summary || '',
        hook: outline.hook || '',
      })),
    },
    volume_plan: getVolumePlan(outlines),
    writing_bible: writingBible,
    longform_compass: longformCompass,
    longform_memory_capsule: longformMemoryCapsule,
    established_events_contract: establishedEventsContract,
    layered_memory_context: layeredMemoryContext,
    progress_summary: progressSummary,
    daily_context_snapshot: dailyContextSnapshot,
    foreshadowing_consistency_radar: foreshadowingConsistencyRadar,
    meme_bank: memeBank,
    style_sample_bank: styleSampleBank,
    style_sample_effectiveness: styleSampleEffectiveness,
    first30_retention_context: first30RetentionContext,
    reader_expectation_debt_context: readerExpectationDebtContext,
    delivery_risk_carry_over: deliveryRiskCarryOverContext,
    story_unit_context: storyUnitContext,
    recent_fatigue_radar: serialFatigueBrief,
    delivery_receipts: chapterDeliveryReceipts || undefined,
    oh_story_delivery_receipts: chapterDeliveryReceipts || undefined,
    setting_context: settingContext,
    relationship_graph: relationshipGraphContext,
    storyline_context: storylineContext,
    canonical_surface_index: canonicalSurfaceIndex,
    canonicalSurfaceIndex,
    style_lock: styleLock,
    safety_policy: safetyPolicy,
    reference: referencePreview ? {
      strength_label: referencePreview.strength_label,
      injected_entry_count: Array.isArray(referencePreview.entries) ? referencePreview.entries.length : 0,
      warnings: referencePreview.warnings || [],
    } : null,
    preflight: {
      ready: preflight.ready,
      strict_ready: preflight.strict_ready,
      checks: preflight.checks,
      blockers: preflight.blockers,
      warnings: preflight.warnings,
    },
  }
  const confirmedPackage = mergeConfirmedPreDraftBriefIntoContext(basePackage, Object.keys(chapterRawPreDraftBrief).length ? chapterRawPreDraftBrief : null)
  const confirmedStateTrackingContract = confirmedPackage.chapter_target?.state_tracking_contract || buildStateTrackingContract(confirmedPackage)
  if (confirmedStateTrackingContract) {
    confirmedPackage.chapter_target.state_tracking_contract = confirmedStateTrackingContract
    applySourceReadinessPreflightChecks(confirmedPackage.preflight, {
      ...confirmedPackage,
      chapter_target: {
        ...(confirmedPackage.chapter_target || {}),
        state_tracking_contract: confirmedStateTrackingContract,
      },
    })
  }
  const confirmedBenchmarkRecallBrief = buildBenchmarkRecallBrief(confirmedPackage)
  if (confirmedBenchmarkRecallBrief) {
    confirmedPackage.chapter_target.benchmark_recall_brief = confirmedPackage.chapter_target.benchmark_recall_brief || confirmedBenchmarkRecallBrief
    applyBenchmarkRecallPreflightChecks(confirmedPackage.preflight, { benchmark_recall_brief: confirmedBenchmarkRecallBrief })
  }
  const override = chapter.raw_payload?.context_package_override || null
  const mergedPackage = override ? deepMergeObjects(confirmedPackage, override) : confirmedPackage
  const progressResyncedPackage = enrichContextWithProgressResync(mergedPackage)
  return attachOhStoryDirectorToContextPackage(progressResyncedPackage)
}
