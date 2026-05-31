import {
  createNovelReview,
  listNovelChapterSettingUsage,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelSettingEntities,
  listNovelWorldbuilding,
  replaceNovelChapterSettingUsage,
  updateNovelChapter,
  updateNovelCharacter,
  updateNovelChapterSettingUsage,
  updateNovelProject,
  updateNovelSettingEntity,
} from '../novel'
import { executeNovelAgent, generateNovelChapterProse, previewNovelKnowledgeInjection } from '../llm'
import type { NovelProductionService } from './novel-production-service'
import type { NovelReferenceService } from './novel-reference-service'
import {
  asArray,
  buildPreflightChecks,
  collectRecentFacts,
  compactText,
  deepMergeObjects,
  getNovelPayload,
  getQualityGateDecision,
  getSafetyPolicy,
  getStoryState,
  getStyleLock,
  getVolumePlan,
  normalizeIssue,
} from './novel-route-utils'

export type ChapterWordTarget = {
  mode: 'standard' | 'long' | 'custom'
  label: string
  target: number
  min: number
  max: number
  rangeText: string
}

function clampWordTarget(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 3000
  return Math.min(12000, Math.max(1000, Math.round(value)))
}

export function resolveChapterWordTarget(project: any, chapter: any, options: any = {}): ChapterWordTarget {
  const raw = options.word_target || chapter?.raw_payload?.word_target || project?.reference_config?.chapter_word_target || {}
  const requestedMode = String(options.word_target_mode || raw.mode || raw.word_target_mode || '').toLowerCase()
  const requestedTarget = Number(options.target_word_count || raw.target || raw.target_word_count || 0)

  if (requestedMode === 'long') {
    return {
      mode: 'long',
      label: '长章',
      target: 10000,
      min: 9000,
      max: 11000,
      rangeText: '9000-11000 字',
    }
  }

  if (requestedMode === 'custom' || requestedTarget > 0) {
    const target = clampWordTarget(requestedTarget)
    const min = Math.max(800, Math.round(target * 0.9))
    const max = Math.round(target * 1.1)
    return {
      mode: 'custom',
      label: `自定义 ${target} 字`,
      target,
      min,
      max,
      rangeText: `${min}-${max} 字`,
    }
  }

  return {
    mode: 'standard',
    label: '标准章',
    target: 3000,
    min: 2800,
    max: 3500,
    rangeText: '2800-3500 字',
  }
}

export function applyChapterWordTargetToContext(contextPackage: any, target: ChapterWordTarget) {
  return {
    ...(contextPackage || {}),
    chapter_target: {
      ...((contextPackage || {}).chapter_target || {}),
      word_target: target,
    },
    style_lock: {
      ...((contextPackage || {}).style_lock || {}),
      chapter_word_range: target.rangeText,
    },
  }
}

export function proseMaxTokensForWordTarget(target: ChapterWordTarget | null | undefined) {
  const targetWords = Number(target?.target || 3000)
  if (targetWords >= 9000) return 18000
  if (targetWords >= 6000) return 14000
  return 8000
}

export function normalizeSceneCardsPayload(payload: any, contextPackage: any = {}) {
  const directCards = Array.isArray(payload?.scene_cards) ? payload.scene_cards : Array.isArray(payload?.scenes) ? payload.scenes : []
  const targetNo = Number(contextPackage?.chapter_target?.chapter_no || 0)
  const outlineCards = directCards.length
    ? []
    : asArray(payload?.chapter_outlines)
      .filter((outline: any) => {
        const outlineNo = Number(outline?.chapter_no || outline?.chapter_number || outline?.no || 0)
        return targetNo ? outlineNo === targetNo : true
      })
      .map((outline: any, index: number) => ({
        scene_no: index + 1,
        title: outline?.title || contextPackage?.chapter_target?.title || `场景${index + 1}`,
        scene_type: outline?.scene_type || 'investigation',
        location: outline?.location || '',
        characters_present: asArray(outline?.characters_present || outline?.characters),
        purpose: outline?.purpose || outline?.summary || outline?.chapter_goal || contextPackage?.chapter_target?.summary || '',
        conflict: outline?.conflict || contextPackage?.chapter_target?.conflict || '',
        required_beats: asArray(outline?.required_beats || outline?.beats).length
          ? asArray(outline?.required_beats || outline?.beats)
          : [outline?.summary, outline?.conflict, outline?.ending_hook].filter(Boolean),
        beat: outline?.beat || outline?.summary || '',
        turning_point: outline?.turning_point || outline?.ending_hook || '',
        exit_state: outline?.exit_state || outline?.ending_hook || '',
      }))
  const cards = directCards.length ? directCards : outlineCards
  return cards.map((card: any, index: number) => ({
    scene_no: Number(card?.scene_no || index + 1),
    title: String(card?.title || `场景${index + 1}`),
    scene_type: String(card?.scene_type || card?.type || ''),
    location: String(card?.location || ''),
    characters_present: asArray(card?.characters_present).map((item: any) => String(item)).filter(Boolean),
    purpose: String(card?.purpose || ''),
    conflict: String(card?.conflict || ''),
    required_beats: asArray(card?.required_beats || card?.beats).map((item: any) => String(item)).filter(Boolean),
    action_beats: asArray(card?.action_beats || card?.combat_beats).map((item: any) => String(item)).filter(Boolean),
    beat: String(card?.beat || card?.action || card?.description || ''),
    emotional_tone: String(card?.emotional_tone || card?.tone || ''),
    key_dialogue: String(card?.key_dialogue || card?.dialogue_focus || ''),
    dialogue_goal: String(card?.dialogue_goal || ''),
    required_information: asArray(card?.required_information).map((item: any) => String(item)).filter(Boolean),
    used_settings: asArray(card?.used_settings).map((item: any) => String(item)).filter(Boolean),
    revealed_settings: asArray(card?.revealed_settings).map((item: any) => String(item)).filter(Boolean),
    forbidden_settings: asArray(card?.forbidden_settings).map((item: any) => String(item)).filter(Boolean),
    ability_beats: asArray(card?.ability_beats).map((item: any) => String(item)).filter(Boolean),
    item_beats: asArray(card?.item_beats).map((item: any) => String(item)).filter(Boolean),
    boss_move: String(card?.boss_move || ''),
    rule_trigger: String(card?.rule_trigger || ''),
    state_changes_expected: asArray(card?.state_changes_expected).map((item: any) => String(typeof item === 'string' ? item : JSON.stringify(item))).filter(Boolean),
    turning_point: String(card?.turning_point || ''),
    description_budget: String(card?.description_budget || card?.sensory_budget || 'low'),
    transition_from_previous: String(card?.transition_from_previous || ''),
    exit_state: String(card?.exit_state || ''),
  })).filter((card: any) => card.beat || card.purpose || card.title)
}

export function createNovelWritingService(ctx: {
  getProject: (workspace: string, id: number) => Promise<any>
  production: NovelProductionService
  reference: NovelReferenceService
}) {
  const buildSceneCardsPrompt = (project: any, contextPackage: any) => [
    '任务：为当前章节生成可人工确认的场景卡。场景卡是正文生成前的蓝图，不要写完整正文。',
    `作品标题：${project.title}`,
    `目标章节：第${contextPackage?.chapter_target?.chapter_no || '?'}章《${contextPackage?.chapter_target?.title || '无标题'}》`,
    '必须以 chapter_target.summary、chapter_target.conflict、chapter_target.ending_hook 为准重建本章场景卡。',
    '如果上下文里已有 scene_cards 与本章目标不一致，视为旧草稿，必须忽略。',
    '本次不是生成总纲、分卷或章节大纲。严禁输出 master_outline、volume_outlines、chapter_outlines、foreshadowing_plan。',
    '只允许围绕目标章节生成 2-6 个 scene_cards；不得输出其他章节内容。',
    '',
    '【结构化上下文包】',
    JSON.stringify(contextPackage, null, 2).slice(0, 9000),
    '',
    '输出 JSON，字段 scene_cards(array)。每个场景卡包含：scene_no, title, scene_type, location, characters_present(array), purpose, conflict, required_beats(array), action_beats(array), beat, emotional_tone, key_dialogue, dialogue_goal, required_information(array), used_settings(array), revealed_settings(array), forbidden_settings(array), ability_beats(array), item_beats(array), boss_move, rule_trigger, state_changes_expected(array), turning_point, description_budget, transition_from_previous, exit_state。',
    'scene_type 只能取：action/combat/chase/investigation/dialogue/reveal/emotion/transition/hook。凡是本章有战斗、追逐、灾祸、清剿、冲突升级，必须至少有一个 action/combat/chase 场景。',
    'action_beats 必须写成可见动作链：起手/试探/受阻/受伤或代价/反制/结果。非动作场景也要写 required_beats，避免只写氛围。',
    'description_budget 写 low/medium/high。默认 low；只有新地点首次登场或诡异规则首次显形时才允许 medium/high。',
    '设定工坊约束：必须优先使用 setting_context.chapter_usage.required；allowed 可按需使用；forbidden_settings 不得揭露或误用；能力、物品、Boss、规则、境界和角色认知必须服从 setting_context.entities 的 constraints_json/state_json。',
    '要求：2-6 个场景；每个场景必须服务本章目标；最后一个场景必须到达 ending_hook；不要复制参考作品专名、桥段或原句；只返回 JSON object，顶层只能包含 scene_cards。',
  ].join('\n')

  const buildHeuristicSettingUsage = (chapter: any, settings: any[]) => {
    const chapterText = [
      chapter.title,
      chapter.chapter_goal,
      chapter.chapter_summary,
      chapter.conflict,
      chapter.ending_hook,
      JSON.stringify(chapter.raw_payload || {}),
    ].join(' ')
    return settings.map((setting: any) => {
      const settingText = [
        setting.name,
        setting.summary,
        JSON.stringify(setting.constraints_json || {}),
        JSON.stringify(setting.state_json || {}),
      ].join(' ')
      let score = 0
      const name = String(setting.name || '')
      if (name && chapterText.includes(name)) score += 40
      for (const token of settingText.split(/[\s,，。；;、/|]+/).filter(item => item.length >= 2).slice(0, 50)) {
        if (chapterText.includes(token)) score += 2
      }
      if (['character', 'boss', 'rule'].includes(setting.entity_type)) score += 4
      if (['ability', 'item', 'foreshadowing'].includes(setting.entity_type)) score += 2
      return { setting, score }
    })
      .filter(item => item.score >= 6)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map(({ setting, score }, index) => ({
        entity_id: setting.id,
        usage_type: index < 4 || score >= 30 ? 'required' : 'allowed',
        required: index < 4 || score >= 30,
        allowed: true,
        forbidden: false,
        reveal_level: setting.visibility === 'hidden' || setting.visibility === 'spoiler' ? 'hint' : 'partial',
        expected_state_change: { reason: `生成前自动匹配：与本章目标/摘要/冲突相似度 ${score}` },
      }))
  }

  const selectProseForChapter = (payload: any, chapter: any) => {
    const targetNo = Number(chapter?.chapter_no || 0)
    const proseArr = Array.isArray(payload?.prose_chapters) ? payload.prose_chapters : []
    const matched = proseArr.find((item: any) => Number(item?.chapter_no || 0) === targetNo)
    if (matched) return matched
    if (proseArr.length === 1) {
      const onlyNo = Number(proseArr[0]?.chapter_no || 0)
      if (!onlyNo || onlyNo === targetNo) return proseArr[0]
      throw new Error(`模型返回的正文章节与目标不一致：目标第${targetNo}章，返回第${onlyNo}章`)
    }
    if (proseArr.length > 1) {
      const foundNos = proseArr.map((item: any) => item?.chapter_no).filter(Boolean).join('、') || '无'
      throw new Error(`模型返回的正文章节与目标不一致：目标第${targetNo}章，返回章节号为：${foundNos}`)
    }
    const topLevelNo = Number(payload?.chapter_no || 0)
    if (topLevelNo && topLevelNo !== targetNo) {
      throw new Error(`模型返回的正文章节与目标不一致：目标第${targetNo}章，返回第${topLevelNo}章`)
    }
    return payload || {}
  }

  const generateSceneCardsForChapter = async (activeWorkspace: string, project: any, contextPackage: any, modelId?: number) => {
    const stageModelId = ctx.production.getStageModelId(project, 'scene_cards', modelId)
    const result = await executeNovelAgent('outline-agent', project, {
      task: buildSceneCardsPrompt(project, contextPackage),
      upstreamContext: contextPackage,
    }, { activeWorkspace, modelId: stageModelId ? String(stageModelId) : undefined, maxTokens: 3000, temperature: ctx.production.getStageTemperature(project, 'scene_cards', 0.45), skipMemory: true })
    const payload = getNovelPayload(result)
    return { result, sceneCards: normalizeSceneCardsPayload(payload, contextPackage) }
  }

  const buildParagraphProseContext = (project: any, contextPackage: any, migrationPlan: any = null, chapterDraft: any = null) => [
    '任务：按场景卡生成章节正文。请先在心中按场景组织段落，再输出完整正文。',
    `作品标题：${project.title}`,
    chapterDraft?.chapter_no ? `目标章节：第${chapterDraft.chapter_no}章《${chapterDraft.title || '无标题'}》` : '',
    chapterDraft?.chapter_no ? `只允许输出这一章的正文，不得混入其他章节内容。chapter_no 必须严格等于 ${chapterDraft.chapter_no}` : '',
    contextPackage?.chapter_target?.word_target ? `本章目标字数：约 ${contextPackage.chapter_target.word_target.target} 字；可接受范围：${contextPackage.chapter_target.word_target.min}-${contextPackage.chapter_target.word_target.max} 字；类型：${contextPackage.chapter_target.word_target.label}。` : '',
    contextPackage?.chapter_target?.word_target ? '字数执行要求：每个场景分配明确字数预算，正文不得只写剧情摘要；如果低于目标范围，必须扩写动作过程、选择代价、对话交锋和章末钩子铺垫，而不是堆砌环境描写。' : '',
    '必须以 chapter_target.summary、chapter_target.conflict、chapter_target.ending_hook 和 scene_cards 为准；如果已有正文或旧场景分解与目标不一致，不得沿用。',
    '',
    '【结构化上下文包】',
    JSON.stringify(contextPackage, null, 2).slice(0, 12000),
    '',
    '【参考迁移计划】',
    JSON.stringify(migrationPlan || {}, null, 2).slice(0, 5000),
    '',
    '【段落级写作要求】',
    '1. 严格按 scene_cards 顺序生成，每个场景至少 3-8 个自然段。',
    '2. 每个场景必须完成 purpose、conflict、required_beats、required_information、turning_point 和 exit_state；不能只写气氛、设定说明或心理总结。',
    '3. 如果 scene_type 是 action/combat/chase，必须逐条落实 action_beats：写出动作起手、空间位置、对手反应、受伤/损耗/暴露信息、反制动作和结果。战斗不能一笔带过。',
    '4. 段落预算：动作/冲突场景中可见行动与直接反应不少于 60%；环境描写最多 15%；心理描写最多 20%；解释性信息最多 15%。',
    '5. 禁止连续 2 段纯环境描写；每 3-5 段必须出现一次可见行动、选择、信息变化或关系变化。',
    '6. description_budget=low 的场景只允许 1-2 句环境描写；medium 最多 1 个短段；high 也必须服务危险、规则或动作空间。',
    '7. 场景之间必须有过渡，不能硬切。',
    '8. 保持 style_lock 中的人称、句长、对话比例、吐槽密度、爽点密度、描写浓度和禁用词约束。',
    '9. 只能学习参考作品的节奏、结构、爽点安排和信息密度；不得复制具体桥段、专有设定、原句、角色名和核心梗。',
    '10. 执行 setting_context：required 设定必须在正文中落地；forbidden 设定不得泄漏；ability_beats 必须写清代价/限制；item_beats 必须符合物品归属和位置；boss_move 必须符合 Boss 行动逻辑；rule_trigger 必须写出触发条件、代价和后果；角色只能知道 knowledge_scope 允许的信息。',
    '11. 如果参考迁移计划包含 transferable_model，只能采用其中 allowed_learning 的抽象功能；rewrite_requirements 必须执行；copy_guard_terms 和 forbidden_transfer 禁止出现在正文里。',
    migrationPlan?.generation_prompt_addendum ? `10. ${migrationPlan.generation_prompt_addendum}` : '',
    chapterDraft?.chapter_no ? `11. 本次只生成第${chapterDraft.chapter_no}章，不得输出其他章节或续章内容。` : '',
    '',
    '输出 JSON，包含 prose_chapters 数组。数组只能有一项，且必须包含 chapter_no, title, chapter_text, scene_breakdown, continuity_notes。scene_breakdown 要回填每个场景的 scene_type、required_beats/action_beats 完成情况和 description_budget 执行情况。chapter_text 是完整正文，不要 markdown 标题。',
  ].filter(Boolean).join('\n')

  const buildStoryStatePrompt = (project: any, contextPackage: any, chapterText: string) => [
    '任务：从刚入库的章节正文中提取故事状态机增量，用于后续章节续写。只提取事实，不要推测。',
    '重点：角色状态必须是“全状态增量”，用于防止后续章节出现年龄、外貌、能力、持有物、认知范围、位置和伤势漂移。',
    `作品标题：${project.title}`,
    '',
    '【生成上下文】',
    JSON.stringify(contextPackage, null, 2).slice(0, 6000),
    '',
    '【章节正文】',
    chapterText.slice(0, 14000),
    '',
    '输出 JSON，字段：',
    'state_delta: {timeline, current_time, active_locations, character_positions, character_relationships, relationship_graph, known_secrets, secret_visibility, item_ownership, resource_status, foreshadowing_status, payoff_queue, mainline_progress, volume_progress, unresolved_conflicts, open_questions, recent_repeated_information, next_chapter_priorities}',
    'character_updates: array，每项包含 name,current_state。current_state 可包含 age, location, physical_condition, appearance_delta, outfit, items, item_changes, ability_status, resource_status, emotional_state, relationship_attitudes, knowledge_scope, newly_learned, information_boundaries, secrets_known, injuries, goals, next_intent, last_seen_chapter。',
    'setting_updates: array，每项包含 entity_id 或 name, entity_type, state_delta, actual_state_change。用于更新设定工坊里的境界、能力、物品、Boss、规则、伏笔、地点、时间线等状态。',
    '只写正文明确出现或可由本章直接确定的状态；不知道就不要补。',
    'next_chapter_priorities: array',
    '只返回 JSON。',
  ].join('\n')

  const mergeStoryState = (prev: any, delta: any, chapter: any) => ({
    ...(prev || {}),
    ...(delta || {}),
    character_positions: { ...((prev || {}).character_positions || {}), ...((delta || {}).character_positions || {}) },
    character_relationships: { ...((prev || {}).character_relationships || {}), ...((delta || {}).character_relationships || {}) },
    relationship_graph: { ...((prev || {}).relationship_graph || {}), ...((delta || {}).relationship_graph || {}) },
    known_secrets: { ...((prev || {}).known_secrets || {}), ...((delta || {}).known_secrets || {}) },
    secret_visibility: { ...((prev || {}).secret_visibility || {}), ...((delta || {}).secret_visibility || {}) },
    item_ownership: { ...((prev || {}).item_ownership || {}), ...((delta || {}).item_ownership || {}) },
    resource_status: { ...((prev || {}).resource_status || {}), ...((delta || {}).resource_status || {}) },
    foreshadowing_status: { ...((prev || {}).foreshadowing_status || {}), ...((delta || {}).foreshadowing_status || {}) },
    payoff_queue: asArray((delta || {}).payoff_queue).length ? asArray((delta || {}).payoff_queue) : asArray((prev || {}).payoff_queue),
    active_locations: asArray((delta || {}).active_locations).length ? asArray((delta || {}).active_locations) : asArray((prev || {}).active_locations),
    open_questions: asArray((delta || {}).open_questions).length ? asArray((delta || {}).open_questions) : asArray((prev || {}).open_questions),
    next_chapter_priorities: asArray((delta || {}).next_chapter_priorities).length ? asArray((delta || {}).next_chapter_priorities) : asArray((prev || {}).next_chapter_priorities),
    last_updated_chapter: chapter.chapter_no,
    last_updated_at: new Date().toISOString(),
  })

  const updateStoryStateMachine = async (activeWorkspace: string, project: any, chapter: any, contextPackage: any, chapterText: string, modelId?: number) => {
    const stageModelId = ctx.production.getStageModelId(project, 'review', modelId)
    const result = await executeNovelAgent('review-agent', project, {
      task: buildStoryStatePrompt(project, contextPackage, chapterText),
    }, { activeWorkspace, modelId: stageModelId ? String(stageModelId) : undefined, maxTokens: 2500, temperature: ctx.production.getStageTemperature(project, 'review', 0.15), skipMemory: true })
    const payload = getNovelPayload(result)
    const stateDelta = payload?.state_delta || {}
    const nextReferenceConfig = {
      ...(project.reference_config || {}),
      story_state: mergeStoryState(project.reference_config?.story_state || {}, stateDelta, chapter),
    }
    await updateNovelProject(activeWorkspace, project.id, { reference_config: nextReferenceConfig } as any)
    const characterUpdates = Array.isArray(payload?.character_updates) ? payload.character_updates : []
    if (characterUpdates.length > 0) {
      const characters = await listNovelCharacters(activeWorkspace, project.id)
      for (const update of characterUpdates) {
        const name = String(update?.name || '').trim()
        if (!name) continue
        const character = characters.find(item => item.name === name)
        if (!character) continue
        await updateNovelCharacter(activeWorkspace, character.id, {
          current_state: {
            ...(character.current_state || {}),
            ...(update.current_state || {}),
            last_seen_chapter: chapter.chapter_no,
          },
        } as any)
      }
    }
    const settingUpdates = Array.isArray(payload?.setting_updates) ? payload.setting_updates : []
    if (settingUpdates.length > 0) {
      const settings = await listNovelSettingEntities(activeWorkspace, project.id)
      const usages = await listNovelChapterSettingUsage(activeWorkspace, project.id, chapter.id)
      for (const update of settingUpdates) {
        const entityId = Number(update?.entity_id || 0)
        const name = String(update?.name || '').trim()
        const entity = settings.find(item => (entityId && item.id === entityId) || (!!name && item.name === name && (!update?.entity_type || item.entity_type === update.entity_type)))
        if (!entity) continue
        const stateDelta = update.state_delta || update.actual_state_change || {}
        await updateNovelSettingEntity(activeWorkspace, entity.id, {
          state_json: {
            ...(entity.state_json || {}),
            ...(stateDelta || {}),
            last_seen_chapter: chapter.chapter_no,
          },
        } as any)
        const usage = usages.find(item => item.entity_id === entity.id)
        if (usage) {
          await updateNovelChapterSettingUsage(activeWorkspace, usage.id, {
            actual_state_change: {
              ...(usage.actual_state_change || {}),
              ...(update.actual_state_change || stateDelta || {}),
            },
          } as any)
        }
      }
    }
    await createNovelReview(activeWorkspace, {
      project_id: project.id,
      review_type: 'story_state',
      status: 'ok',
      summary: `故事状态已更新至第${chapter.chapter_no}章`,
      issues: [],
      payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, ...payload }),
    })
    return payload
  }

  const buildWritingBible = (project: any, worldbuilding: any[], characters: any[], outlines: any[], reviews: any[] = []) => {
    const storyState = getStoryState(project)
    const styleLock = getStyleLock(project)
    const safety = getSafetyPolicy(project)
    const masterOutline = outlines.find(outline => outline.outline_type === 'master') || null
    const volumePlan = getVolumePlan(outlines)
    return {
      project: {
        title: project.title,
        genre: project.genre || '',
        synopsis: project.synopsis || '',
        target_audience: project.target_audience || '',
        style_tags: project.style_tags || [],
        length_target: project.length_target || '',
      },
      promise: masterOutline?.summary || project.synopsis || '',
      world_rules: worldbuilding[0]?.rules || [],
      world_summary: worldbuilding[0]?.world_summary || '',
      mainline: masterOutline ? {
        title: masterOutline.title,
        hook: masterOutline.hook || '',
        conflict_points: masterOutline.conflict_points || [],
        turning_points: masterOutline.turning_points || [],
      } : null,
      volume_plan: volumePlan,
      characters: characters.map(char => ({
        name: char.name,
        role: char.role_type || char.role || '',
        goal: char.goal || '',
        motivation: char.motivation || '',
        conflict: char.conflict || '',
        growth_arc: char.growth_arc || '',
        current_state: char.current_state || {},
      })),
      style_lock: styleLock,
      safety_policy: safety,
      story_state: storyState,
      latest_state_entries: collectRecentFacts(reviews),
      forbidden: safety.forbidden,
      preferred_words: styleLock.preferred_words || [],
      banned_words: styleLock.banned_words || [],
      updated_at: new Date().toISOString(),
    }
  }

  const hasMeaningfulWritingBible = (value: any) => {
    if (!value || typeof value !== 'object') return false
    return Boolean(
      String(value.promise || value.world_summary || '').trim() ||
      (Array.isArray(value.world_rules) && value.world_rules.length > 0) ||
      (Array.isArray(value.volume_plan) && value.volume_plan.length > 0) ||
      (Array.isArray(value.characters) && value.characters.length > 0) ||
      (value.mainline && Object.keys(value.mainline || {}).length > 0) ||
      (value.style_lock && Object.values(value.style_lock || {}).some(item => Array.isArray(item) ? item.length > 0 : Boolean(String(item || '').trim())))
    )
  }

  const getStoredOrBuiltWritingBible = async (activeWorkspace: string, project: any) => {
    const [worldbuilding, characters, outlines, reviews] = await Promise.all([
      listNovelWorldbuilding(activeWorkspace, project.id),
      listNovelCharacters(activeWorkspace, project.id),
      listNovelOutlines(activeWorkspace, project.id),
      listNovelReviews(activeWorkspace, project.id),
    ])
    const stored = project.reference_config?.writing_bible
    return hasMeaningfulWritingBible(stored) ? stored : buildWritingBible(project, worldbuilding, characters, outlines, reviews)
  }

  const buildChapterContextPackage = async (
    activeWorkspace: string,
    project: any,
    chapter: any,
    chapters: any[],
    worldbuilding: any[],
    characters: any[],
    outlines: any[],
    reviews: any[] = [],
  ) => {
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
    let referencePreview: any = null
    try {
      referencePreview = await previewNovelKnowledgeInjection(project, '正文创作')
    } catch {
      referencePreview = null
    }
    const sceneCards = Array.isArray(chapter.scene_list) && chapter.scene_list.length
      ? chapter.scene_list
      : (Array.isArray(chapter.scene_breakdown) ? chapter.scene_breakdown : [])
    const preflight = buildPreflightChecks(project, chapter, previousChapter, worldbuilding, characters, sceneCards, referencePreview, reviews)
    const wordTarget = resolveChapterWordTarget(project, chapter, {})
    const styleLock = { ...getStyleLock(project), chapter_word_range: wordTarget.rangeText }
    const safetyPolicy = getSafetyPolicy(project)
    const writingBible = project.reference_config?.writing_bible || buildWritingBible(project, worldbuilding, characters, outlines, reviews)
    const [settingEntities, storedChapterSettingUsage] = await Promise.all([
      listNovelSettingEntities(activeWorkspace, project.id).catch(() => []),
      listNovelChapterSettingUsage(activeWorkspace, project.id, chapter.id).catch(() => []),
    ])
    let chapterSettingUsage = storedChapterSettingUsage
    let settingUsageAutoMatched = false
    if (chapterSettingUsage.length === 0 && settingEntities.length > 0) {
      const suggestedUsage = buildHeuristicSettingUsage(chapter, settingEntities)
      if (suggestedUsage.length > 0) {
        chapterSettingUsage = await replaceNovelChapterSettingUsage(activeWorkspace, project.id, chapter.id, suggestedUsage as any).catch(() => suggestedUsage as any)
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
    }
    const settingChecks = [
      { key: 'setting_workshop', ok: settingEntities.length > 0, severity: 'medium', label: '设定工坊', fix: '在右侧“设定”中从项目资料补齐角色、境界、能力、物品、Boss、规则等设定。' },
      { key: 'chapter_setting_usage', ok: chapterSettingUsage.length > 0, severity: 'low', label: '本章设定调用', fix: '在本章设定调用中标记必用、允许或禁揭设定。' },
    ]
    preflight.checks.push(...settingChecks)
    preflight.warnings.push(...settingChecks.filter(item => !item.ok).map(item => `${item.label}不足`))
    preflight.blockers.push(...settingChecks.filter(item => !item.ok && item.severity === 'high'))
    preflight.ready = preflight.blockers.length === 0
    preflight.strict_ready = preflight.checks.every((item: any) => item.ok || item.severity === 'low')
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
        goal: chapter.chapter_goal || '',
        summary: chapter.chapter_summary || '',
        conflict: chapter.conflict || '',
        ending_hook: chapter.ending_hook || '',
        scene_cards: sceneCards,
        word_target: wordTarget,
        continuity_notes: chapter.continuity_notes || [],
        must_advance: asArray(chapter.raw_payload?.must_advance),
        forbidden_repeats: asArray(chapter.raw_payload?.forbidden_repeats),
      },
      continuity: {
        previous_chapter: previousChapter ? {
          chapter_no: previousChapter.chapter_no,
          title: previousChapter.title,
          summary: previousChapter.chapter_summary || '',
          ending_hook: previousChapter.ending_hook || '',
          ending_excerpt: String(previousChapter.chapter_text || '').slice(-800),
        } : null,
        previous_prose_chapters: previousProseChapters,
      },
      story_state: {
        global: getStoryState(project),
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
      setting_context: settingContext,
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
    const override = chapter.raw_payload?.context_package_override || null
    return override ? deepMergeObjects(basePackage, override) : basePackage
  }

  const buildProseReviewPrompt = (project: any, contextPackage: any, chapterText: string) => [
    '任务：对刚生成的小说章节进行章节级自检。',
    `作品标题：${project.title}`,
    '',
    '请重点检查：',
    '1. 是否完成本章目标、冲突和章末钩子。',
    '2. 是否自然衔接上一章结尾状态。',
    '3. 角色行为是否符合角色卡与当前状态。',
    '4. 是否有设定冲突、时间线跳跃、物品凭空出现或消失。',
    '5. 是否有水文、重复、空泛总结、机械说明。',
    '6. 是否疑似照搬参考项目的专名、桥段或原句。',
    '7. 场景卡承诺的战斗、追逐、清剿、灾祸或强冲突是否真正写出过程，而不是只有结果。',
    '8. action_beats 是否有起手、反应、受阻、代价、反制、结果；是否缺少空间位置、伤势、资源损耗或信息暴露。',
    '9. 是否存在过度环境描写、连续纯氛围段落、用阴冷/压抑/雨雾等描写替代剧情推进。',
    '10. 每 3-5 段是否有可见行动、选择、信息变化或关系变化。',
    '11. 是否违反 setting_context：境界/战力矛盾、能力代价缺失、物品归属错误、Boss行动逻辑不一致、禁揭设定泄漏、规则触发没有代价、角色知识越界、伏笔误用、预期状态变化缺失。',
    '',
    '【结构化上下文包】',
    JSON.stringify(contextPackage, null, 2).slice(0, 6000),
    '',
    '【待审校正文】',
    chapterText.slice(0, 16000),
    '',
    '输出 JSON，字段：passed(boolean), score(0-100), craft_metrics({action_detail_score,description_overuse_score,event_density_score,combat_process_score,setting_consistency_score}), focused_revision_modes(array，可取 expand_action/cut_description/tighten_pacing/add_consequence/restore_hook/repair_setting_violation), setting_violations(array), issues(array: severity/type/description/suggestion), revision_directives(array), needs_revision(boolean)。只返回 JSON。',
  ].join('\n')

  const buildProseRevisionPrompt = (project: any, contextPackage: any, chapterText: string, review: any) => [
    '任务：根据自检结果修订本章正文，保留可用内容，修复连续性、角色、节奏、章末钩子和正文工艺问题。',
    `作品标题：${project.title}`,
    '定向修订要求：',
    '1. expand_action：补足战斗/追逐/清剿/灾祸现场的动作链，写出出手、反应、空间变化、受伤或资源损耗、反制和结果。',
    '2. cut_description：压缩不推动剧情的环境描写，尤其是连续氛围段落；保留能影响动作空间、诡异规则和危险判断的描写。',
    '3. tighten_pacing：提高事件密度，删掉空泛总结，让每 3-5 段都有行动、选择、信息变化或关系变化。',
    '4. add_consequence：补充行动后果，包括伤势、物品损耗、暴露秘密、角色关系变化、规则代价。',
    '5. restore_hook：保留并强化章末钩子，不要削弱下一章推动力。',
    '6. repair_setting_violation：修复设定工坊违规，确保境界、能力代价、物品归属、Boss行动、规则触发、角色认知边界和禁揭设定全部一致。',
    '',
    '【结构化上下文包】',
    JSON.stringify(contextPackage, null, 2).slice(0, 6000),
    '',
    '【自检结果】',
    JSON.stringify(review, null, 2).slice(0, 4000),
    '',
    '【初稿正文】',
    chapterText.slice(0, 16000),
    '',
    '请输出 JSON，包含 prose_chapters 数组。数组第一项必须包含 chapter_no, title, chapter_text, scene_breakdown, continuity_notes。chapter_text 是修订后的完整正文，不要 markdown 标题。',
  ].join('\n')

  const shouldReviseProse = (review: any) => {
    const issues = Array.isArray(review?.issues) ? review.issues.map(normalizeIssue) : []
    const hasHighIssue = issues.some(issue => ['high', 'critical'].includes(issue.severity.toLowerCase()))
    return Boolean(review?.needs_revision) || Number(review?.score || 100) < 78 || hasHighIssue
  }

  const runProseSelfReviewAndRevision = async (activeWorkspace: string, project: any, contextPackage: any, chapterText: string, modelId?: number, options: any = {}) => {
    const reviewModelId = ctx.production.getStageModelId(project, 'review', modelId)
    const reviseModelId = ctx.production.getStageModelId(project, 'revise', modelId)
    const reviewResult = await executeNovelAgent('review-agent', project, {
      task: buildProseReviewPrompt(project, contextPackage, chapterText),
    }, { activeWorkspace, modelId: reviewModelId ? String(reviewModelId) : undefined, maxTokens: 3000, temperature: ctx.production.getStageTemperature(project, 'review', 0.2), skipMemory: true })
    const reviewPayload = getNovelPayload(reviewResult)
    const normalizedReview = {
      passed: reviewPayload?.passed !== false,
      score: Number(reviewPayload?.score || 80),
      issues: Array.isArray(reviewPayload?.issues) ? reviewPayload.issues.map(normalizeIssue) : [],
      revision_directives: Array.isArray(reviewPayload?.revision_directives) ? reviewPayload.revision_directives.map((item: any) => String(item)) : [],
      craft_metrics: reviewPayload?.craft_metrics || {},
      focused_revision_modes: Array.isArray(reviewPayload?.focused_revision_modes) ? reviewPayload.focused_revision_modes.map((item: any) => String(item)) : [],
      setting_violations: Array.isArray(reviewPayload?.setting_violations) ? reviewPayload.setting_violations : [],
      needs_revision: Boolean(reviewPayload?.needs_revision),
      modelName: (reviewResult as any).modelName,
    }
    if (options.revise === false || !shouldReviseProse(normalizedReview)) {
      return { review: normalizedReview, revision: null, final_text: chapterText, revised: false }
    }
    const revisionResult = await executeNovelAgent('prose-agent', project, {
      task: buildProseRevisionPrompt(project, contextPackage, chapterText, normalizedReview),
      upstreamContext: contextPackage,
    }, { activeWorkspace, modelId: reviseModelId ? String(reviseModelId) : undefined, maxTokens: 8000, temperature: ctx.production.getStageTemperature(project, 'revise', 0.65), skipMemory: true })
    const revisionPayload = getNovelPayload(revisionResult)
    const revisedFirst = Array.isArray(revisionPayload?.prose_chapters) ? revisionPayload.prose_chapters[0] : revisionPayload
    const revisedText = revisedFirst?.chapter_text || revisionPayload?.chapter_text || ''
    if (!revisedText) {
      return { review: normalizedReview, revision: { error: revisionResult.error || '修订未返回正文' }, final_text: chapterText, revised: false }
    }
    return {
      review: normalizedReview,
      revision: {
        scene_breakdown: revisedFirst?.scene_breakdown || revisionPayload?.scene_breakdown || [],
        continuity_notes: revisedFirst?.continuity_notes || revisionPayload?.continuity_notes || [],
        modelName: (revisionResult as any).modelName,
      },
      final_text: revisedText,
      revised: true,
    }
  }

  const generateChapterForGroup = async (activeWorkspace: string, projectId: number, chapterId: number, options: any = {}) => {
    const preferredModelId = Number(options.model_id || 0) || undefined
    const onStage = typeof options.onStage === 'function' ? options.onStage : async () => {}
    const project = await ctx.getProject(activeWorkspace, projectId)
    if (!project) throw new Error('project not found')
    const configSnapshot = ctx.production.buildAgentConfigSnapshot(project, preferredModelId)
    const approvalPolicy = options.approval_policy || ctx.production.getApprovalPolicy(project)
    const approvals = options.approvals || {}
    const productionMode = String(options.production_mode || 'draft_review_revise_store')
    const isSceneCardsOnly = productionMode === 'scene_cards_only'
    const isDraftOnly = productionMode === 'draft_only'
    const isDraftReviewOnly = productionMode === 'draft_review'
    let chapters = await listNovelChapters(activeWorkspace, projectId)
    let chapter = chapters.find(item => item.id === chapterId)
    if (!chapter) throw new Error('chapter not found')
    const [worldbuilding, characters, outlines, reviews] = await Promise.all([
      listNovelWorldbuilding(activeWorkspace, projectId),
      listNovelCharacters(activeWorkspace, projectId),
      listNovelOutlines(activeWorkspace, projectId),
      listNovelReviews(activeWorkspace, projectId),
    ])
    let wordTarget = resolveChapterWordTarget(project, chapter, options)
    let contextPackage = applyChapterWordTargetToContext(
      await buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews),
      wordTarget,
    )
    await onStage('context', {
      status: contextPackage.preflight.ready ? 'success' : 'failed',
      score: contextPackage.preflight.ready ? 100 : 0,
      warnings: contextPackage.preflight.warnings || [],
      blockers: contextPackage.preflight.blockers || [],
    })
    if (!contextPackage.preflight.ready && options.allow_incomplete !== true) {
      throw Object.assign(new Error('章节生成前置检查未通过'), { code: 'PROSE_PREFLIGHT_BLOCKED', contextPackage })
    }
    await onStage('scene_cards', { status: 'running' })
    if (!contextPackage.chapter_target.scene_cards.length || options.force_scene_cards === true) {
      const sceneResult = await generateSceneCardsForChapter(activeWorkspace, project, contextPackage, preferredModelId)
      if (sceneResult.sceneCards.length > 0) {
        const updatedSceneChapter = await updateNovelChapter(activeWorkspace, chapter.id, {
          scene_breakdown: sceneResult.sceneCards,
          scene_list: sceneResult.sceneCards,
          raw_payload: { ...(chapter.raw_payload || {}), scene_cards_source: 'chapter_group' },
        } as any, { createVersion: false })
        if (updatedSceneChapter) chapter = updatedSceneChapter
        chapters = await listNovelChapters(activeWorkspace, projectId)
        wordTarget = resolveChapterWordTarget(project, chapter, options)
        contextPackage = applyChapterWordTargetToContext(
          await buildChapterContextPackage(activeWorkspace, project, chapter, chapters, worldbuilding, characters, outlines, reviews),
          wordTarget,
        )
      }
    }
    await onStage('scene_cards', { status: 'success', count: contextPackage.chapter_target.scene_cards.length, scene_cards: contextPackage.chapter_target.scene_cards })
    if (ctx.production.approvalRequired(approvalPolicy, 'scene_cards', approvals, { count: contextPackage.chapter_target.scene_cards.length })) {
      await onStage('scene_cards', { status: 'needs_confirmation', count: contextPackage.chapter_target.scene_cards.length })
      throw ctx.production.buildApprovalError('scene_cards', '场景卡等待人工确认', { count: contextPackage.chapter_target.scene_cards.length })
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
        chapter,
        score: null,
        revised: false,
        production_mode: productionMode,
        completed_stage: 'scene_cards',
        story_state_update: { skipped: true },
        config_snapshot: configSnapshot,
      }
    }
    const prevChapters = chapters
      .filter(ch => ch.chapter_no < chapter.chapter_no && ch.chapter_text)
      .slice(-3)
      .map(ch => ({ chapter_no: ch.chapter_no, title: ch.title, chapter_summary: ch.chapter_summary || '', ending_hook: ch.ending_hook || '', chapter_text: ch.chapter_text }))
    await onStage('migration_plan', { status: 'running' })
    const migrationPlan = await ctx.reference.getReferenceMigrationPlanForChapter(activeWorkspace, project, chapter).catch(error => ({ error: String(error) }))
    await onStage('migration_plan', { status: (migrationPlan as any)?.error ? 'warn' : 'success', active_reference_count: (migrationPlan as any)?.chapter_specific_plan?.active_reference_count || 0 })
    await onStage('draft', { status: 'running' })
    const draftResult = await generateNovelChapterProse(project, chapter, {
      worldbuilding,
      characters,
      outline: outlines,
      prompt: String(options.prompt || ''),
      prevChapters,
      contextPackage,
      migrationPlan,
      paragraphTask: buildParagraphProseContext(project, contextPackage, migrationPlan, chapter),
      maxTokens: proseMaxTokensForWordTarget(wordTarget),
    } as any, activeWorkspace, ctx.production.getStageModelId(project, 'draft', preferredModelId))
    const resultPayload = getNovelPayload(draftResult)
    const targetProse = selectProseForChapter(resultPayload, chapter)
    const chapterText = targetProse?.chapter_text || resultPayload?.chapter_text
    if ((draftResult as any).error || !chapterText) {
      await onStage('draft', { status: 'failed', error: String((draftResult as any).error || (draftResult as any).fallbackReason || '模型未返回正文') })
      throw new Error(String((draftResult as any).error || (draftResult as any).fallbackReason || '模型未返回正文'))
    }
    await onStage('draft', { status: 'success', word_count: String(chapterText || '').replace(/\s/g, '').length, modelName: (draftResult as any).modelName, scene_status: 'generated' })
    let finalText = String(chapterText || '')
    let finalSceneBreakdown = targetProse?.scene_breakdown || resultPayload?.scene_breakdown || []
    let finalContinuityNotes = targetProse?.continuity_notes || resultPayload?.continuity_notes || chapter.continuity_notes || []
    if (isDraftOnly) {
      await onStage('review', { status: 'skipped', reason: '生产模式：只生成正文初稿' })
      await onStage('revise', { status: 'skipped', reason: '生产模式：只生成正文初稿' })
      await onStage('safety', { status: 'skipped', reason: '生产模式：只生成正文初稿' })
      await onStage('store', { status: 'running' })
      const updatedDraft = await updateNovelChapter(activeWorkspace, chapter.id, {
        chapter_text: finalText,
        continuity_notes: finalContinuityNotes,
        raw_payload: { ...(chapter.raw_payload || {}), generated_scene_breakdown: finalSceneBreakdown },
        status: 'draft',
      }, { versionSource: 'agent_execute' })
      await onStage('store', { status: 'success', word_count: String(finalText || '').replace(/\s/g, '').length, scene_status: 'accepted' })
      await onStage('story_state', { status: 'skipped', reason: '初稿模式不更新状态机，避免低质草稿污染长期记忆' })
      return {
        chapter: updatedDraft,
        score: null,
        revised: false,
        production_mode: productionMode,
        completed_stage: 'store',
        story_state_update: { skipped: true },
        config_snapshot: configSnapshot,
      }
    }
    await onStage('review', { status: 'running' })
    const selfCheck = await runProseSelfReviewAndRevision(activeWorkspace, project, contextPackage, finalText, preferredModelId, { revise: !isDraftReviewOnly })
    await onStage('review', { status: selfCheck?.review?.passed === false ? 'warn' : 'success', score: selfCheck?.review?.score ?? null, issues: selfCheck?.review?.issues || [], scene_status: 'reviewed' })
    await onStage('revise', { status: selfCheck.revised ? 'success' : 'skipped', revised: Boolean(selfCheck.revised), scene_status: selfCheck.revised ? 'revised' : '' })
    if (isDraftReviewOnly) {
      await onStage('safety', { status: 'skipped', reason: '生产模式：生成并自检，不执行仿写安全门禁' })
      await onStage('store', { status: 'running' })
      const updatedReviewedDraft = await updateNovelChapter(activeWorkspace, chapter.id, {
        chapter_text: finalText,
        continuity_notes: finalContinuityNotes,
        raw_payload: { ...(chapter.raw_payload || {}), generated_scene_breakdown: finalSceneBreakdown },
        status: 'draft',
      }, { versionSource: 'agent_execute' })
      await onStage('store', { status: 'success', word_count: String(finalText || '').replace(/\s/g, '').length, scene_status: 'accepted' })
      await onStage('story_state', { status: 'skipped', reason: '自检模式不更新状态机，确认后可继续完整流水线' })
      await createNovelReview(activeWorkspace, {
        project_id: projectId,
        review_type: 'prose_quality',
        status: selfCheck?.review?.passed === false || Number(selfCheck?.review?.score || 100) < 78 ? 'warn' : 'ok',
        summary: `章节群质检评分 ${selfCheck?.review?.score ?? '-'}`,
        issues: Array.isArray(selfCheck?.review?.issues) ? selfCheck.review.issues.map((issue: any) => `${issue.severity || 'medium'}｜${issue.description || issue}`) : [],
        payload: JSON.stringify({ chapter_id: chapter.id, context_package: contextPackage, self_check: selfCheck, production_mode: productionMode, config_snapshot: configSnapshot }),
      })
      return {
        chapter: updatedReviewedDraft,
        score: selfCheck?.review?.score ?? null,
        revised: false,
        production_mode: productionMode,
        completed_stage: 'store',
        story_state_update: { skipped: true },
        config_snapshot: configSnapshot,
      }
    }
    const preStoreQualityDecision = getQualityGateDecision(project, { ...(selfCheck?.review || {}), revised: Boolean(selfCheck.revised) })
    if (!preStoreQualityDecision.passed && !approvals?.quality_gate?.approved) {
      await onStage('review', { status: 'needs_confirmation', score: selfCheck?.review?.score ?? null, quality_gate: preStoreQualityDecision })
      throw ctx.production.buildApprovalError('quality_gate', '章节质量门禁未通过，正文未入库', preStoreQualityDecision)
    }
    if (ctx.production.approvalRequired(approvalPolicy, 'low_score', approvals, { score: selfCheck?.review?.score ?? null, issues: selfCheck?.review?.issues || [] })) {
      await onStage('review', { status: 'needs_confirmation', score: selfCheck?.review?.score ?? null, issues: selfCheck?.review?.issues || [] })
      throw ctx.production.buildApprovalError('low_score', '章节质检低于阈值，等待人工确认', { score: selfCheck?.review?.score ?? null, issues: selfCheck?.review?.issues || [] })
    }
    if (ctx.production.approvalRequired(approvalPolicy, 'draft', approvals, { score: selfCheck?.review?.score ?? null, revised: Boolean(selfCheck.revised) })) {
      await onStage('draft', { status: 'needs_confirmation', score: selfCheck?.review?.score ?? null, revised: Boolean(selfCheck.revised) })
      throw ctx.production.buildApprovalError('draft', '正文入库前等待人工确认', { score: selfCheck?.review?.score ?? null, revised: Boolean(selfCheck.revised) })
    }
    finalText = selfCheck.final_text || finalText
    if (selfCheck.revised && selfCheck.revision) {
      finalSceneBreakdown = selfCheck.revision.scene_breakdown?.length ? selfCheck.revision.scene_breakdown : finalSceneBreakdown
      finalContinuityNotes = selfCheck.revision.continuity_notes?.length ? selfCheck.revision.continuity_notes : finalContinuityNotes
    }
    const referenceReport = await ctx.reference.buildReferenceUsageReport(activeWorkspace, project, '正文创作', finalText)
    const safetyDecision = ctx.reference.getReferenceSafetyDecision(project, referenceReport)
    const safetyExplanation = ctx.reference.explainReferenceSafety(referenceReport, safetyDecision)
    const migrationAudit = ctx.reference.buildMigrationAudit(project, referenceReport, safetyExplanation)
    await onStage('safety', { status: safetyDecision.blocked ? 'failed' : 'success', score: safetyDecision.score, copy_hit_count: safetyDecision.copy_hit_count, risk_level: referenceReport?.quality_assessment?.risk_level })
    const finalQualityDecision = getQualityGateDecision(project, { ...(selfCheck?.review || {}), revised: Boolean(selfCheck.revised) }, safetyDecision)
    if (safetyDecision.blocked) {
      throw Object.assign(new Error('仿写安全阈值未通过'), { code: 'REFERENCE_SAFETY_BLOCKED', referenceReport, safetyDecision, safetyExplanation, migrationAudit })
    }
    if (!finalQualityDecision.passed && !approvals?.quality_gate?.approved) {
      await onStage('safety', { status: 'needs_confirmation', score: safetyDecision.score, quality_gate: finalQualityDecision })
      throw ctx.production.buildApprovalError('quality_gate', '章节质量门禁未通过，正文未入库', finalQualityDecision)
    }
    if (ctx.production.approvalRequired(approvalPolicy, 'safety', approvals, { score: safetyDecision.score, copy_hit_count: safetyDecision.copy_hit_count, risk_level: referenceReport?.quality_assessment?.risk_level })) {
      await onStage('safety', { status: 'needs_confirmation', score: safetyDecision.score, copy_hit_count: safetyDecision.copy_hit_count, risk_level: referenceReport?.quality_assessment?.risk_level })
      throw ctx.production.buildApprovalError('safety', '仿写安全报告等待人工确认', { score: safetyDecision.score, copy_hit_count: safetyDecision.copy_hit_count, risk_level: referenceReport?.quality_assessment?.risk_level })
    }
    await onStage('store', { status: 'running' })
    const updated = await updateNovelChapter(activeWorkspace, chapter.id, {
      chapter_text: finalText,
      continuity_notes: finalContinuityNotes,
      raw_payload: { ...(chapter.raw_payload || {}), generated_scene_breakdown: finalSceneBreakdown },
      status: 'draft',
    }, { versionSource: selfCheck?.revised ? 'repair' : 'agent_execute' })
    await onStage('store', { status: 'success', word_count: String(finalText || '').replace(/\s/g, '').length, scene_status: 'accepted' })
    await onStage('story_state', { status: 'running' })
    const storyStateUpdate = await updateStoryStateMachine(activeWorkspace, project, chapter, contextPackage, finalText, preferredModelId).catch(error => ({ error: String(error) }))
    await onStage('story_state', { status: (storyStateUpdate as any)?.error ? 'failed' : 'success', error: (storyStateUpdate as any)?.error || '' })
    await createNovelReview(activeWorkspace, {
      project_id: projectId,
      review_type: 'prose_quality',
      status: selfCheck?.review?.passed === false || Number(selfCheck?.review?.score || 100) < 78 ? 'warn' : 'ok',
      summary: `章节群质检评分 ${selfCheck?.review?.score ?? '-'}`,
      issues: Array.isArray(selfCheck?.review?.issues) ? selfCheck.review.issues.map((issue: any) => `${issue.severity || 'medium'}｜${issue.description || issue}`) : [],
      payload: JSON.stringify({ chapter_id: chapter.id, context_package: contextPackage, self_check: selfCheck, reference_report: referenceReport, safety_decision: safetyDecision, migration_audit: migrationAudit, production_mode: productionMode, config_snapshot: configSnapshot }),
    })
    const settingViolations = Array.isArray(selfCheck?.review?.setting_violations) ? selfCheck.review.setting_violations : []
    if (contextPackage?.setting_context?.chapter_usage?.length || settingViolations.length > 0) {
      await createNovelReview(activeWorkspace, {
        project_id: projectId,
        review_type: 'setting_consistency',
        status: settingViolations.length > 0 ? 'warn' : 'ok',
        summary: settingViolations.length > 0 ? `设定一致性发现 ${settingViolations.length} 项风险` : '设定一致性随章节质检通过',
        issues: settingViolations.map((issue: any) => `${issue.severity || 'medium'}｜${issue.description || issue.setting_name || issue.type || '设定风险'}`),
        payload: JSON.stringify({
          chapter_id: chapter.id,
          chapter_no: chapter.chapter_no,
          source: 'prose_quality_self_check',
          setting_context: contextPackage.setting_context,
          setting_violations: settingViolations,
          craft_metrics: selfCheck?.review?.craft_metrics || {},
        }),
      })
    }
    return {
      chapter: updated,
      score: selfCheck?.review?.score ?? null,
      revised: Boolean(selfCheck?.revised),
      production_mode: productionMode,
      completed_stage: 'story_state',
      reference_report: referenceReport,
      safety_decision: safetyDecision,
      migration_audit: migrationAudit,
      story_state_update: storyStateUpdate,
      config_snapshot: configSnapshot,
    }
  }

  return {
    buildParagraphProseContext,
    buildChapterContextPackage,
    generateSceneCardsForChapter,
    updateStoryStateMachine,
    getStoredOrBuiltWritingBible,
    runProseSelfReviewAndRevision,
    generateChapterForGroup,
  }
}

export type NovelWritingService = ReturnType<typeof createNovelWritingService>
