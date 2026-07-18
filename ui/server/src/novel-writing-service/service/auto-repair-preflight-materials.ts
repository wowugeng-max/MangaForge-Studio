import {
  createNovelCharacter,
  createNovelReview,
  createNovelSettingEntity,
  createNovelWorldbuilding,
  listNovelChapters,
  listNovelChapterSettingUsage,
  listNovelCharacters,
  listNovelOutlines,
  listNovelReviews,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  replaceNovelChapterSettingUsage,
  updateNovelChapter,
} from '../../novel'
import {
  buildUnattendedPreflightRepairReviewRecord,
} from '../../novel-writing/service-review-record'
import {
  asArray,
  getNovelPayload,
} from '../../routes/novel-route-utils'
import {
  inferCharacterRepairTier,
  selectTierAwareCharacterRepairCandidates,
} from '../quality/paragraph-prose-context'
import {
  autoRepairStateTrackingSourceReadiness,
  mergeFinalBenchmarkRecallBriefAliases,
  mergeFinalRepairPreDraftRawPayload,
  repairBenchmarkRecallSourcePathState,
} from '../quality/preflight-auto-repair'
import {
  applySourceReadinessPreflightChecks,
  buildStateTrackingContract,
  mergeFinalStateTrackingContract,
  mergeStoredStateTrackingContractAliases,
} from '../quality/state-tracking-contracts'
import {
  compactBriefText,
} from '../quality/text-utils'
import {
  buildWritePreparationBrief,
} from '../quality/write-preparation-contracts'
import {
  buildHeuristicSettingUsage,
  isAbortError,
  throwIfAborted,
} from './runtime-helpers'

export async function runAutoRepairPreflightMaterials(ctx: any) {
  const activeWorkspace = ctx.activeWorkspace
  const project = ctx.project
  const modelId = ctx.modelId
  const options = ctx.options
  const persist = ctx.persist
  const missingKeys = ctx.missingKeys
  const needsWorldbuilding = ctx.needsWorldbuilding
  const needsCharacters = ctx.needsCharacters
  const needsSettings = ctx.needsSettings
  const outlines = ctx.outlines
  const reviews = ctx.reviews
  const chapters = ctx.chapters
  const contextPackage = ctx.contextPackage
  const repaired = ctx.repaired
  const errors = ctx.errors
  const stagedWorldbuildingCreates = ctx.stagedWorldbuildingCreates
  const stagedCharacterCreates = ctx.stagedCharacterCreates
  const stagedSettingCreates = ctx.stagedSettingCreates
  const stagedReviews = ctx.stagedReviews
  const stagedChapterPatch = ctx.stagedChapterPatch
  const executeAgent = ctx.executeAgent
  const buildChapterContextPackage = ctx.buildChapterContextPackage
  let chapter = ctx.chapter
  let worldbuilding = ctx.worldbuilding
  let characters = ctx.characters
  let settings = ctx.settings
  let nextTemporaryId = ctx.nextTemporaryId
  let stagedUsageReplacement = ctx.stagedUsageReplacement
  const applyStagedChapterPatchOuter = ctx.applyStagedChapterPatch
  const applyStagedChapterPatch = (patch: any) => {
    chapter = applyStagedChapterPatchOuter(patch)
    ctx.chapter = chapter
    return chapter
  }

  if (needsWorldbuilding) {
    let payload: any = {}
    if (modelId) {
      try {
        throwIfAborted(options)
        const result = await executeAgent('outline-agent', project, {
          task: [
            '任务：为无人值守章节写作补齐最小可用世界观。只输出 JSON，不写正文。',
            '输出 worldbuilding 对象，字段包含 world_summary, rules(array), factions(array), locations(array), systems(array), items(array), known_unknowns(array)。',
            '要求：世界观必须服务当前章节和后续连载，不要泛泛而谈；规则要能制造选择压力、代价和后续冲突。',
            JSON.stringify({
              project: { title: project.title, genre: project.genre, synopsis: project.synopsis, style_tags: project.style_tags || [] },
              chapter: { chapter_no: chapter.chapter_no, title: chapter.title, goal: chapter.chapter_goal, summary: chapter.chapter_summary, conflict: chapter.conflict, ending_hook: chapter.ending_hook },
              outlines: outlines.slice(0, 60).map(item => ({ type: item.outline_type, title: item.title, summary: item.summary, hook: item.hook })),
              existing_characters: characters.slice(0, 20).map(item => ({ name: item.name, role_type: item.role_type, motivation: item.motivation, goal: item.goal })),
              preflight_warnings: contextPackage?.preflight?.warnings || [],
            }, null, 2).slice(0, 10000),
          ].join('\n'),
        }, {
          activeWorkspace,
          modelId: String(modelId),
          maxTokens: 3200,
          temperature: 0.3,
          skipMemory: true,
          signal: options.abortSignal,
          timeoutMs: options.llmTimeoutMs,
        })
        payload = getNovelPayload(result)
      } catch (error) {
        if (isAbortError(error)) throw error
        errors.push(`世界观补齐失败：${String(error).slice(0, 200)}`)
      }
    }
    const world = payload?.worldbuilding && typeof payload.worldbuilding === 'object' ? payload.worldbuilding : payload
    const worldbuildingCreate = {
      project_id: project.id,
      world_summary: compactBriefText(world?.world_summary || world?.summary || project.synopsis || `${project.title || '本作品'}的核心世界观围绕当前主线冲突展开。`),
      rules: asArray(world?.rules).length ? asArray(world.rules) : ['核心规则必须有触发条件、代价和可被角色利用或反制的空间。'],
      factions: asArray(world?.factions),
      locations: asArray(world?.locations),
      systems: asArray(world?.systems),
      items: asArray(world?.items),
      known_unknowns: asArray(world?.known_unknowns),
      raw_payload: { source: 'unattended_preflight_repair', original: world },
    }
    const createdWorldbuilding: any = persist
      ? await createNovelWorldbuilding(activeWorkspace, worldbuildingCreate as any)
      : { ...worldbuildingCreate, id: nextTemporaryId--, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    if (!persist) stagedWorldbuildingCreates.push(createdWorldbuilding)
    worldbuilding.push(createdWorldbuilding)
    repaired.push({ type: 'worldbuilding_created', id: createdWorldbuilding.id, world_summary: createdWorldbuilding.world_summary })
  }

  if (needsCharacters) {
    let payload: any = {}
    if (modelId) {
      try {
        throwIfAborted(options)
        const result = await executeAgent('outline-agent', project, {
          task: [
            '任务：为无人值守章节写作自动补齐前置材料。只输出 JSON。',
            '只补材料，不写正文。输出 characters, character_updates, forbidden_repeats, must_advance, repair_summary。',
            'characters 只输出缺失或明显欠完整的角色；必须按角色池分层补齐 primary_supporting, secondary_supporting, cameo_supporting, antagonist_minor, antagonist_arc, faction_agent，必要时补 protagonist 或 antagonist_primary。',
            '每个角色必须包含 name, role_type, tier, narrative_function, motivation, goal, conflict, relationship_to_protagonist, first_appearance_chapter, active_range, voice_anchor, signature_action, secret_or_pressure, exit_or_turning_point；反派层必须包含 antagonist_logic。',
            '不要改写 existing_characters 里已有角色名；同名角色只输出 character_updates，不要重复创建。',
            JSON.stringify({
              project: { title: project.title, genre: project.genre, synopsis: project.synopsis },
              chapter: { chapter_no: chapter.chapter_no, title: chapter.title, goal: chapter.chapter_goal, summary: chapter.chapter_summary, conflict: chapter.conflict, ending_hook: chapter.ending_hook },
              existing_characters: characters.slice(0, 24).map(item => ({ name: item.name, role_type: item.role_type, tier: item.raw_payload?.tier || item.raw_payload?.original?.tier, motivation: item.motivation, goal: item.goal, current_state: item.current_state })),
              recent_chapters: chapters.filter(item => item.chapter_no <= chapter.chapter_no).slice(-4).map(item => ({ chapter_no: item.chapter_no, title: item.title, summary: item.chapter_summary, ending_hook: item.ending_hook })),
              preflight_warnings: contextPackage?.preflight?.warnings || [],
            }, null, 2).slice(0, 9000),
          ].join('\n'),
        }, {
          activeWorkspace,
          modelId: String(modelId),
          maxTokens: 2600,
          temperature: 0.3,
          skipMemory: true,
          signal: options.abortSignal,
          timeoutMs: options.llmTimeoutMs,
        })
        payload = getNovelPayload(result)
      } catch (error) {
        if (isAbortError(error)) throw error
        errors.push(`角色材料补齐失败：${String(error).slice(0, 200)}`)
      }
    }
    const existingNames = new Set(characters.map(item => String(item.name || '').trim()).filter(Boolean))
    const characterCandidates = asArray(payload?.characters)
      .map((item: any) => {
        const tier = inferCharacterRepairTier(item)
        return {
          project_id: project.id,
          name: String(item?.name || '').trim(),
          role_type: String(item?.role_type || item?.role || tier || 'supporting'),
          archetype: String(item?.archetype || item?.narrative_function || ''),
          motivation: String(item?.motivation || item?.goal || chapter.chapter_goal || ''),
          goal: String(item?.goal || chapter.chapter_goal || ''),
          conflict: String(item?.conflict || chapter.conflict || ''),
          appearance: String(item?.appearance || ''),
          personality: asArray(item?.personality).map(String),
          abilities: asArray(item?.abilities).map(String),
          current_state: item?.current_state && typeof item.current_state === 'object' ? item.current_state : { last_seen_chapter: chapter.chapter_no },
          tier,
          narrative_function: item?.narrative_function,
          relationship_to_protagonist: item?.relationship_to_protagonist,
          first_appearance_chapter: item?.first_appearance_chapter,
          active_range: item?.active_range,
          voice_anchor: item?.voice_anchor,
          signature_action: item?.signature_action,
          secret_or_pressure: item?.secret_or_pressure,
          exit_or_turning_point: item?.exit_or_turning_point,
          antagonist_logic: item?.antagonist_logic,
          raw_payload: { source: 'unattended_preflight_repair', tier, original: item },
        }
      })
      .filter((item: any) => item.name && !existingNames.has(item.name))
    if (characterCandidates.length === 0 && characters.length === 0) {
      characterCandidates.push({
        project_id: project.id,
        name: '主角',
        role_type: 'protagonist',
        archetype: '核心视角角色',
        motivation: chapter.chapter_goal || project.synopsis || '推进当前章节目标',
        goal: chapter.chapter_goal || '完成当前章节目标',
        conflict: chapter.conflict || '',
        appearance: '',
        personality: [],
        abilities: [],
        current_state: { last_seen_chapter: chapter.chapter_no, location: '当前章节现场' },
        tier: 'protagonist',
        raw_payload: { source: 'unattended_preflight_repair_fallback', tier: 'protagonist' },
      })
    }
    for (const candidate of selectTierAwareCharacterRepairCandidates(characterCandidates, characters)) {
      const created: any = persist
        ? await createNovelCharacter(activeWorkspace, candidate as any)
        : { ...candidate, id: nextTemporaryId--, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      if (!persist) {
        stagedCharacterCreates.push(created)
        characters.push(created)
      }
      existingNames.add(created.name)
      repaired.push({ type: 'character_created', id: created.id, name: created.name })
    }
    const forbiddenRepeats = [...new Set([
      ...asArray(chapter.raw_payload?.forbidden_repeats),
      ...asArray(payload?.forbidden_repeats),
      `${chapter.title || `第${chapter.chapter_no}章`}不要重复解释已交代背景，直接推进本章冲突。`,
    ].map((item: any) => String(item || '').trim()).filter(Boolean))].slice(0, 12)
    const mustAdvance = [...new Set([
      ...asArray(chapter.raw_payload?.must_advance),
      ...asArray(payload?.must_advance),
      chapter.chapter_goal,
    ].map((item: any) => String(item || '').trim()).filter(Boolean))].slice(0, 12)
    const chapterContextPatch = {
      raw_payload: {
        ...(chapter.raw_payload || {}),
        forbidden_repeats: forbiddenRepeats,
        must_advance: mustAdvance,
        unattended_preflight_repaired_at: new Date().toISOString(),
        unattended_preflight_repair_summary: payload?.repair_summary || '无人值守自动补齐章节生成材料',
      },
    }
    if (persist) await updateNovelChapter(activeWorkspace, chapter.id, chapterContextPatch as any, { createVersion: false })
    else applyStagedChapterPatch(chapterContextPatch)
    repaired.push({ type: 'chapter_context_updated', chapter_id: chapter.id, forbidden_repeats: forbiddenRepeats.length, must_advance: mustAdvance.length })
  }

  let latestSettings = settings
  if (needsSettings) {
    let modelSettings: any[] = []
    if (modelId) {
      try {
        throwIfAborted(options)
        const result = await executeAgent('setting-agent', project, {
          task: [
            '任务：为无人值守章节写作补齐设定工坊。只输出 JSON。',
            '输出 settings(array)，每项包含 entity_type,name,summary,constraints_json,state_json,payload_json。',
            'entity_type 可用 character,realm,ability,item,boss,rule,faction,location,foreshadowing,mainline,subplot。',
            JSON.stringify({
              project: { title: project.title, genre: project.genre, synopsis: project.synopsis },
              chapter: { chapter_no: chapter.chapter_no, title: chapter.title, goal: chapter.chapter_goal, summary: chapter.chapter_summary, conflict: chapter.conflict, ending_hook: chapter.ending_hook },
              worldbuilding: worldbuilding.slice(0, 3).map(item => ({ summary: item.world_summary, rules: item.rules })),
              characters: characters.slice(0, 20).map(item => ({ name: item.name, role_type: item.role_type, abilities: item.abilities })),
              outlines: outlines.slice(0, 30).map(item => ({ type: item.outline_type, title: item.title, summary: item.summary, hook: item.hook })),
            }, null, 2).slice(0, 10000),
          ].join('\n'),
        }, {
          activeWorkspace,
          modelId: String(modelId),
          maxTokens: 3600,
          temperature: 0.25,
          skipMemory: true,
          signal: options.abortSignal,
          timeoutMs: options.llmTimeoutMs,
        })
        modelSettings = asArray(getNovelPayload(result)?.settings)
      } catch (error) {
        if (isAbortError(error)) throw error
        errors.push(`设定工坊补齐失败：${String(error).slice(0, 200)}`)
      }
    }
    const fallbackSettings = [
      ...characters.slice(0, 8).map(item => ({ entity_type: 'character', name: item.name, summary: item.motivation || item.goal || item.role_type || '' })),
      ...outlines.filter(item => ['master', 'volume', 'chapter'].includes(String(item.outline_type || ''))).slice(0, 12).map(item => ({ entity_type: item.outline_type === 'chapter' ? 'foreshadowing_arc' : item.outline_type === 'volume' ? 'subplot' : 'mainline', name: item.title, summary: item.summary || item.hook || '' })),
      ...(chapter.chapter_goal ? [{ entity_type: 'mainline', name: `${chapter.title || `第${chapter.chapter_no}章`}推进线`, summary: chapter.chapter_goal }] : []),
    ]
    const existingSettingKeys = new Set(latestSettings.map((item: any) => `${item.entity_type}:${item.name}`))
    for (const raw of [...modelSettings, ...fallbackSettings].slice(0, 30)) {
      const entityType = String(raw?.entity_type || raw?.type || 'rule').trim()
      const name = String(raw?.name || raw?.title || '').trim()
      if (!name || existingSettingKeys.has(`${entityType}:${name}`)) continue
      const settingCreate = {
        project_id: project.id,
        entity_type: entityType,
        name,
        summary: String(raw?.summary || raw?.description || ''),
        status: 'active',
        visibility: raw?.visibility || 'public',
        constraints_json: raw?.constraints_json || raw?.constraints || {},
        state_json: raw?.state_json || raw?.state || {},
        payload_json: { ...(raw?.payload_json || raw?.payload || {}), source: 'unattended_preflight_repair' },
      }
      const created: any = persist
        ? await createNovelSettingEntity(activeWorkspace, settingCreate as any)
        : { ...settingCreate, id: nextTemporaryId--, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      if (!persist) stagedSettingCreates.push(created)
      latestSettings.push(created)
      existingSettingKeys.add(`${created.entity_type}:${created.name}`)
      repaired.push({ type: 'setting_created', id: created.id, name: created.name, entity_type: created.entity_type })
    }
  }

  if (persist) latestSettings = await listNovelSettingEntities(activeWorkspace, project.id).catch(() => latestSettings)
  if (latestSettings.length > 0) {
    const usage = await listNovelChapterSettingUsage(activeWorkspace, project.id, chapter.id).catch(() => [])
    if (usage.length === 0 || missingKeys.includes('chapter_setting_usage')) {
      const suggestedUsage = buildHeuristicSettingUsage(chapter, latestSettings)
      if (suggestedUsage.length > 0) {
        const records: any[] = persist
          ? await replaceNovelChapterSettingUsage(activeWorkspace, project.id, chapter.id, suggestedUsage as any)
          : suggestedUsage.map((item: any) => ({ ...item, id: nextTemporaryId--, project_id: project.id, chapter_id: chapter.id }))
        if (!persist) stagedUsageReplacement = records
        repaired.push({ type: 'chapter_setting_usage_matched', chapter_id: chapter.id, total: records.length })
      }
    }
  }

  const [finalChapters, finalWorldbuilding, finalCharacters, finalOutlines, finalReviews] = persist
    ? await Promise.all([
        listNovelChapters(activeWorkspace, project.id),
        listNovelWorldbuilding(activeWorkspace, project.id),
        listNovelCharacters(activeWorkspace, project.id),
        listNovelOutlines(activeWorkspace, project.id),
        listNovelReviews(activeWorkspace, project.id),
      ])
    : [
        chapters.map(item => item.id === chapter.id ? chapter : item),
        worldbuilding,
        characters,
        outlines,
        reviews,
      ]
  const finalChapter = finalChapters.find(item => item.id === chapter.id) || chapter
  const finalPreDraftBriefSnake = finalChapter.raw_payload?.pre_draft_brief || {}
  const finalPreDraftBriefCamel = finalChapter.raw_payload?.preDraftBrief || {}
  const unnormalizedFinalPreDraftBriefBase = {
    ...finalPreDraftBriefCamel,
    ...finalPreDraftBriefSnake,
  }
  const storedFinalStateTrackingContract = mergeStoredStateTrackingContractAliases(
    finalPreDraftBriefSnake.state_tracking_contract,
    finalPreDraftBriefSnake.stateTrackingContract,
    finalPreDraftBriefCamel.state_tracking_contract,
    finalPreDraftBriefCamel.stateTrackingContract,
  )
  const finalBenchmarkRecallBriefBase = mergeFinalBenchmarkRecallBriefAliases(
    finalPreDraftBriefSnake,
    finalPreDraftBriefCamel,
  )
  const finalBenchmarkRecallState = repairBenchmarkRecallSourcePathState(
    finalChapter,
    finalBenchmarkRecallBriefBase,
    finalPreDraftBriefSnake.benchmark_recall_gaps,
    finalPreDraftBriefSnake.benchmarkRecallGaps,
    finalPreDraftBriefCamel.benchmark_recall_gaps,
    finalPreDraftBriefCamel.benchmarkRecallGaps,
  )
  const finalBenchmarkRecallBrief = finalBenchmarkRecallState.benchmark_recall_brief
  const finalBenchmarkRecallGaps = finalBenchmarkRecallState.benchmark_recall_gaps
  const finalPreDraftBriefBase = {
    ...unnormalizedFinalPreDraftBriefBase,
    benchmark_recall_brief: finalBenchmarkRecallBrief,
    benchmarkRecallBrief: finalBenchmarkRecallBrief,
    benchmark_recall_gaps: finalBenchmarkRecallGaps,
    benchmarkRecallGaps: finalBenchmarkRecallGaps,
    state_tracking_contract: storedFinalStateTrackingContract,
    stateTrackingContract: storedFinalStateTrackingContract,
  }
  const finalChapterForContext = {
    ...finalChapter,
    raw_payload: {
      ...(finalChapter.raw_payload || {}),
      pre_draft_brief: finalPreDraftBriefBase,
      ...(finalChapter.raw_payload?.preDraftBrief !== undefined
        ? { preDraftBrief: finalPreDraftBriefBase }
        : {}),
    },
  }
  const finalChaptersForContext = finalChapters.map(item => item.id === finalChapter.id ? finalChapterForContext : item)
  const finalContextPackage = await buildChapterContextPackage(
    activeWorkspace,
    project,
    finalChapterForContext,
    finalChaptersForContext,
    finalWorldbuilding,
    finalCharacters,
    finalOutlines,
    finalReviews,
    persist ? {} : {
      settingEntities: latestSettings,
      chapterSettingUsage: stagedUsageReplacement || [],
      projectSettingUsage: stagedUsageReplacement || [],
      persistSettingUsage: false,
    },
  )
  const derivedFinalStateTrackingContract = autoRepairStateTrackingSourceReadiness(
    buildStateTrackingContract(finalContextPackage, { ignoreExplicit: true }),
    finalChapter,
    finalContextPackage,
  )
  const finalStateTrackingContract = mergeFinalStateTrackingContract(
    storedFinalStateTrackingContract,
    derivedFinalStateTrackingContract,
  )
  const finalWritePreparationBrief = buildWritePreparationBrief(finalContextPackage, {
    ...(finalContextPackage?.pre_draft_brief || {}),
    ...(finalContextPackage?.chapter_target || {}),
    state_tracking_contract: finalStateTrackingContract,
  })
  const finalStoredPreDraftBrief = {
    ...finalPreDraftBriefBase,
    state_tracking_contract: finalStateTrackingContract,
    ...(finalPreDraftBriefBase.stateTrackingContract !== undefined
      ? { stateTrackingContract: finalStateTrackingContract }
      : {}),
    write_preparation_brief: finalWritePreparationBrief,
    ...(finalPreDraftBriefBase.writePreparationBrief !== undefined
      ? { writePreparationBrief: finalWritePreparationBrief }
      : {}),
  }
  // Keep returned context_package aligned with the repaired brief/contracts. buildChapterContextPackage
  // above still saw the pre-repair snapshot; without this handoff, cockpit generate reuses stale
  // write_preparation_brief + launch-gate blockers after material_repair.
  const repairedContextPackage = {
    ...finalContextPackage,
    pre_draft_brief: {
      ...(finalContextPackage?.pre_draft_brief || {}),
      ...finalStoredPreDraftBrief,
    },
    ...(finalContextPackage?.preDraftBrief !== undefined ? {
      preDraftBrief: {
        ...(finalContextPackage?.preDraftBrief || {}),
        ...finalStoredPreDraftBrief,
      },
    } : {}),
    write_preparation_brief: finalWritePreparationBrief,
    chapter_target: {
      ...(finalContextPackage?.chapter_target || {}),
      state_tracking_contract: finalStateTrackingContract,
      write_preparation_brief: finalWritePreparationBrief,
      ...(finalContextPackage?.chapter_target?.stateTrackingContract !== undefined
        ? { stateTrackingContract: finalStateTrackingContract }
        : {}),
      ...(finalContextPackage?.chapter_target?.writePreparationBrief !== undefined
        ? { writePreparationBrief: finalWritePreparationBrief }
        : {}),
    },
  }
  if (repairedContextPackage?.preflight) {
    applySourceReadinessPreflightChecks(repairedContextPackage.preflight, {
      ...repairedContextPackage,
      chapter_target: {
        ...(repairedContextPackage.chapter_target || {}),
        state_tracking_contract: finalStateTrackingContract,
      },
    })
  }
  const latestFinalChapter = persist
    ? (await listNovelChapters(activeWorkspace, project.id)).find(item => item.id === finalChapter.id) || finalChapter
    : finalChapter
  const finalChapterPatch = {
    raw_payload: mergeFinalRepairPreDraftRawPayload(latestFinalChapter.raw_payload, finalStoredPreDraftBrief),
  }
  if (persist) {
    const finalUpdatedChapter = await updateNovelChapter(activeWorkspace, latestFinalChapter.id, finalChapterPatch as any, { createVersion: false })
    if (finalUpdatedChapter) chapter = finalUpdatedChapter
  } else {
    applyStagedChapterPatch(finalChapterPatch)
  }

  if (repaired.length || errors.length) {
    const repairReview = buildUnattendedPreflightRepairReviewRecord({
      projectId: project.id,
      chapter,
      missingKeys,
      repaired,
      errors,
    })
    if (persist) await createNovelReview(activeWorkspace, repairReview)
    else stagedReviews.push(repairReview)
  }
  ctx.chapter = chapter
  ctx.worldbuilding = worldbuilding
  ctx.characters = characters
  ctx.settings = settings
  ctx.nextTemporaryId = nextTemporaryId
  ctx.stagedUsageReplacement = stagedUsageReplacement
  return {
    ok: errors.length === 0,
    missing_keys: missingKeys,
    repaired,
    errors,
    chapter,
    chapter_patch: stagedChapterPatch,
    worldbuilding: finalWorldbuilding,
    characters: finalCharacters,
    settings: latestSettings,
    context_package: repairedContextPackage,
    staged_worldbuilding_creates: stagedWorldbuildingCreates,
    staged_character_creates: stagedCharacterCreates,
    staged_setting_creates: stagedSettingCreates,
    staged_usage_replacement: stagedUsageReplacement,
    staged_reviews: stagedReviews,
    staged: !persist,
  }
}
