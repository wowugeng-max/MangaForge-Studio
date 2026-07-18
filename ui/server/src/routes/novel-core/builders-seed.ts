import { ensureWorkspaceStructure } from '../../workspace'
import {
  appendNovelRun,
  createNovelChapter,
  createNovelCharacter,
  createNovelOutline,
  createNovelProject,
  createNovelProjectSeedDraft,
  createNovelSettingEntity,
  createNovelWorldbuilding,
  deleteNovelChapter,
  deleteNovelOutline,
  deleteNovelProject,
  deleteNovelProjectSeedDraft,
  getNovelChapter,
  getNovelProject,
  listChapterVersions,
  listNovelCharacters,
  listNovelChapters,
  listNovelWorkspaceChapters,
  listNovelOutlines,
  listNovelProjects,
  listNovelProjectSeedDrafts,
  listNovelWorldbuilding,
  rollbackChapterVersion,
  syncNovelChapterPlanByNumber,
  updateNovelCharacter,
  updateNovelChapter,
  updateNovelOutline,
  updateNovelProject,
  updateNovelWorldbuilding,
} from '../../novel'
import { executeNovelAgent, previewNovelKnowledgeInjection } from '../../llm'
import { extractLLMText, parseJsonLikePayload, safeJsonStringify } from '../novel-route-utils'
import { purgeMemoryPalaceProject } from '../../memory-service'
import { buildOhStoryGenreCatalogContract, formatOhStoryGenreCatalogPrompt, listOhStoryGenreCatalogGuides, matchOhStoryGenreCatalogGuide } from '../novel-genre-catalog'
import { buildOhStoryGenreCoreMechanicsContract, formatOhStoryGenreCoreMechanicsPrompt } from '../novel-genre-core-mechanics'
import { buildOhStoryPlotSpecialTopicsContract, formatOhStoryPlotSpecialTopicsPrompt } from '../novel-plot-special-topics'
import { buildOhStoryCharacterDesignContract, formatOhStoryCharacterDesignPrompt } from '../novel-character-design-contract'
import { buildOhStoryStoryPowerContract, formatOhStoryStoryPowerPrompt } from '../novel-story-power-contract'
import { buildOhStoryMainlineDefinitionContract, formatOhStoryMainlineDefinitionPrompt } from '../novel-mainline-definition-contract'
import { buildOhStoryLongformStructureContract, formatOhStoryLongformStructurePrompt } from '../novel-longform-structure-contract'
import { buildOhStoryDirectorForProjectSeed } from '../novel-oh-story-director'
import { normalizeSettingAgentPayload } from '../novel-setting-routes'
import { safeReportProjectSeedProgress, resolvePassA3VolumeStageStatus, sseData, type ProjectSeedProgressReporter } from '../novel-project-seed-progress'
import {
  buildProjectSeedFillGapsPrompt,
  extractFillGapsPatch,
  listProjectSeedGapTargets,
  mergeSeedPreferRicher,
} from '../novel-project-seed-fill-gaps'
import {
  annotateOutlineScaffoldDiagnostics,
  asSeedArray,
  attachProjectSeedDirector,
  buildProjectSeedDiagnostics,
  chapterTitleLooksStructural,
  cleanSeedCharacterName,
  compactSeedText,
  describeLengthTarget,
  ensureProjectSeedModelOutlines,
  extractProjectSeedFactsFromText,
  fallbackChapterDisplayTitle,
  firstSeedText,
  hasUsableProjectSeed,
  inferSeedCharacterName,
  inferSeedGenre,
  mergeGeneratedFields,
  mergeProjectSeedInput,
  mergeRecoveredSeedPreferModelOutlines,
  normalizeLengthTarget,
  normalizeProjectSeedPayload,
  parseNestedSeed,
  projectSeedNeedsOutlineExpansion,
  projectSeedOutlinesLookLikeLocalScaffold,
  repairProjectSeedGaps,
  resultContentPreview,
  resultContentText,
  seedFieldMissing,
  stripLocalScaffoldOutlines,
  uniqueSeedTexts,
} from './builders'

export function buildRecoverableProjectSeed(seed: any, idea = '', requestedTitle = '', requestedLengthTarget = '', result: any = null) {
  const lengthTarget = normalizeLengthTarget(requestedLengthTarget) || normalizeLengthTarget(seed?.length_target) || 'medium'
  const rawText = [
    idea,
    resultContentText(result),
    safeJsonStringify(parseNestedSeed(seed?.raw_payload || seed || {}), undefined, 0),
  ].filter(Boolean).join('\n')
  const extractedFacts = extractProjectSeedFactsFromText(rawText)
  const mergedSeed = mergeProjectSeedInput(seed || {}, extractedFacts)
  const normalized = normalizeProjectSeedPayload(mergedSeed, idea, lengthTarget)
  const normalizedProtagonist = parseNestedSeed(normalized.protagonist)
  const normalizedAntagonist = parseNestedSeed(normalized.antagonist)
  const diagnostics = buildProjectSeedDiagnostics(mergedSeed, idea, result)
  const title = firstSeedText(requestedTitle, normalized.title, seed?.title, inferSeedCharacterName(rawText) ? `${inferSeedCharacterName(rawText)}长篇` : '', '未命名小说')
  const protagonistName = firstSeedText(
    cleanSeedCharacterName(normalizedProtagonist.name),
    cleanSeedCharacterName(normalizedProtagonist.title),
    asSeedArray(normalized.characters)
      .map(character => parseNestedSeed(character))
      .map(character => /主角|protagonist/i.test(firstSeedText(character.role_type, character.role, character.identity)) ? cleanSeedCharacterName(character.name || character.title) : '')
      .find(Boolean),
    inferSeedCharacterName(rawText),
    '主角',
  )
  const antagonistName = firstSeedText(
    cleanSeedCharacterName(normalizedAntagonist.name),
    cleanSeedCharacterName(normalizedAntagonist.title),
    asSeedArray(normalized.characters)
      .map(character => parseNestedSeed(character))
      .map(character => /反派|对手|antagonist|rival/i.test(firstSeedText(character.role_type, character.role, character.identity)) ? cleanSeedCharacterName(character.name || character.title) : '')
      .find(Boolean),
  )
  const usableCharacters = asSeedArray(normalized.characters)
    .map(character => parseNestedSeed(character))
    .filter(character => {
      const rawName = firstSeedText(character.name, character.title)
      if (rawName && !cleanSeedCharacterName(rawName)) return false
      return Boolean(firstSeedText(cleanSeedCharacterName(rawName), character.role_type, character.role, character.identity, character.goal, character.summary))
    })
  const worldSummary = firstSeedText(
    normalized.worldbuilding?.world_summary,
    normalized.worldbuilding?.summary,
    normalized.core_premise,
    normalized.synopsis,
    rawText,
    `${title}的世界仍需模型补齐，但已有灵感将作为正史草稿保留。`,
  )
  const corePremise = firstSeedText(
    normalized.core_premise,
    normalized.synopsis,
    normalized.logline,
    `${protagonistName}进入${title}的核心事件，在未知规则、力量代价和长期敌意中寻找破局方式。`,
  )
  const mainConflict = firstSeedText(
    normalized.main_conflict,
    `${protagonistName}必须利用已知线索破解世界规则，同时面对资源、敌人和认知差带来的连续压力。`,
  )
  const pitch = firstSeedText(
    normalized.logline,
    `${protagonistName}凭借独特线索闯入${title}，把看似零散的世界规则变成持续升级的生存与修炼优势。`,
  )
  const synopsis = firstSeedText(
    normalized.synopsis,
    compactSeedText(`${corePremise} ${mainConflict} 已有材料：${diagnostics.retained_fragments.join('；')}`, 500),
  )
  // 前30章/分卷必须由模型生成。本地兜底不再写入可返回给作者的种子。
  const cleaned = stripLocalScaffoldOutlines({
    volume_outlines: normalized.volume_outlines,
    chapter_outlines: normalized.chapter_outlines,
  })
  const volumes = asSeedArray(cleaned.volume_outlines)
  const chapters = asSeedArray(cleaned.chapter_outlines)
  const recoveredSeed = repairProjectSeedGaps({
    ...normalized,
    title,
    genre: firstSeedText(normalized.genre, inferSeedGenre(rawText), '其他'),
    length_target: lengthTarget,
    synopsis,
    logline: pitch,
    core_premise: corePremise,
    main_conflict: mainConflict,
    worldbuilding: {
      ...parseNestedSeed(normalized.worldbuilding),
      world_summary: worldSummary,
      power_system: firstSeedText(normalized.worldbuilding?.power_system, '根据已有线索建立可升级、有限制、可反复制造选择压力的能力/规则体系。'),
      rules: asSeedArray(normalized.worldbuilding?.rules).length ? asSeedArray(normalized.worldbuilding?.rules) : diagnostics.retained_fragments.slice(0, 5),
    },
    protagonist: {
      ...normalizedProtagonist,
      name: protagonistName,
      identity: firstSeedText(normalizedProtagonist.identity, '持有关键线索的开局主角'),
      goal: firstSeedText(normalizedProtagonist.goal, `在${title}里活下来、理解核心规则并打开大荒级长线主线。`),
      limitation: firstSeedText(normalizedProtagonist.limitation, '对世界真相掌握不足，每次使用线索都要付出代价或暴露风险。'),
    },
    antagonist: antagonistName ? {
      ...normalizedAntagonist,
      name: antagonistName,
      identity: firstSeedText(normalizedAntagonist.identity, normalizedAntagonist.role_type, '阶段反派/竞争者'),
      goal: firstSeedText(normalizedAntagonist.goal, '阻止主角取得第一阶段真相或资源'),
    } : normalizedAntagonist,
    characters: usableCharacters.length ? usableCharacters : [
      { name: protagonistName, role_type: '主角', goal: `破解${title}的核心规则`, current_state: '待作者审阅补强' },
      antagonistName
        ? { name: antagonistName, role_type: firstSeedText(normalizedAntagonist.role_type, normalizedAntagonist.identity, '反派/竞争者'), goal: firstSeedText(normalizedAntagonist.goal, '阻止主角取得第一阶段真相或资源'), current_state: '待作者审阅补强' }
        : { role_type: '反派/竞争者', goal: '阻止主角取得第一阶段真相或资源', current_state: '由模型二次补种子细化' },
    ].filter(character => firstSeedText(character.name, character.role_type, character.goal)),
    volume_outlines: volumes,
    chapter_outlines: chapters,
    open_questions: asSeedArray(normalized.open_questions).length ? asSeedArray(normalized.open_questions) : [
      `请确认${protagonistName}的最终欲望、道德底线和不可退让目标。`,
      '请确认核心规则的代价、禁忌和长期扩容边界。',
      '请确认第一卷读者最期待的爽点回报是什么。',
    ],
    next_steps: [
      '先让模型根据这份恢复草稿补齐商业钩子、人物池、世界规则；分卷与前30章细纲必须由模型单独生成，禁止使用本地模板章名。',
      '作者审阅深度孵化草稿，保留有效灵感，删掉不符合口味的自动补位。',
      '定稿前检查核心承诺、主线矛盾、前30章追读和超长篇扩容引擎。',
    ],
  }, idea)
  const generatedFields = mergeGeneratedFields(
    seedFieldMissing(seed || {}).filter(field => !seedFieldMissing(recoveredSeed).includes(field)),
    recoveredSeed.seed_diagnostics?.generated_fields || [],
  )
  const recoveredDiagnostics = annotateOutlineScaffoldDiagnostics(recoveredSeed, {
    ...diagnostics,
    status: 'needs_model_expansion',
    usable: hasUsableProjectSeed(recoveredSeed),
    generated_fields: generatedFields,
    recovery_strategy: 'local_scaffold_then_same_model_expansion',
    suggestion: '模型首轮返回偏薄。系统已保留有效灵感为可编辑草稿；分卷/前30章细纲将继续请求同一模型生成，不会使用本地模板细纲冒充创作结果。',
  })
  return {
    seed: {
      ...recoveredSeed,
      seed_diagnostics: recoveredDiagnostics,
    },
    diagnostics: recoveredDiagnostics,
  }
}

export function buildProjectSeedRecoveryPrompt(seed: any, diagnostics: any, idea = '', requestedTitle = '', requestedLengthTarget = '') {
  const lengthTarget = normalizeLengthTarget(requestedLengthTarget || seed?.length_target) || 'medium'
  const genreCatalogContract = buildOhStoryGenreCatalogContract(
    idea,
    requestedTitle,
    seed?.title,
    seed?.genre,
    seed?.sub_genres,
    seed?.commercial_tags,
    seed?.writing_bible?.genre_positioning_contract,
  )
  const genreCoreMechanicsContract = buildOhStoryGenreCoreMechanicsContract(
    idea,
    requestedTitle,
    seed?.title,
    seed?.genre,
    seed?.sub_genres,
    seed?.commercial_tags,
    seed?.writing_bible?.genre_positioning_contract,
  )
  const plotSpecialTopicsContract = buildOhStoryPlotSpecialTopicsContract(
    idea,
    requestedTitle,
    seed?.title,
    seed?.genre,
    seed?.sub_genres,
    seed?.commercial_tags,
    seed?.writing_bible?.genre_positioning_contract,
    seed?.writing_bible?.plot_special_topics_contract,
    seed?.plot_engine,
    seed?.worldbuilding,
    seed?.protagonist,
  )
  const characterDesignContract = buildOhStoryCharacterDesignContract(
    idea,
    requestedTitle,
    seed,
    seed?.writing_bible,
  )
  const storyPowerContract = buildOhStoryStoryPowerContract(
    idea,
    requestedTitle,
    seed,
    seed?.writing_bible,
  )
  const mainlineDefinitionContract = buildOhStoryMainlineDefinitionContract(
    idea,
    requestedTitle,
    seed,
    seed?.writing_bible,
  )
  const longformStructureContract = buildOhStoryLongformStructureContract(
    idea,
    requestedTitle,
    seed,
    { length_target: lengthTarget },
    seed?.writing_bible,
  )
  return [
    '任务：上一次项目种子输出偏薄，但里面有可用灵感。请基于这些有效信息补齐小说项目种子。只输出 JSON object，不要 Markdown，不要解释。',
    '关键原则：不要要求作者更换模型；不要丢弃已有线索；不要重新开一个无关故事；必须保留已有有效信息，并围绕缺口清单补齐。',
    '特别注意：若当前草稿 chapter_outlines/volume_outlines 带有 local_scaffold、或章名像“异常入局/旧法失准/药铺夜问/开局规则验证”这类通用模板，必须全部重写为只属于本故事的分卷与前30章，禁止原样保留模板章名和模板摘要。',
    requestedTitle ? `用户指定作品名：${requestedTitle}` : '',
    describeLengthTarget(lengthTarget),
    '',
    '【用户原始想法】',
    idea.slice(0, 12000) || '用户只提供了标题或很短的灵感，请在不推翻标题/灵感的前提下原创扩写。',
    '',
    '【已有可用信息/恢复草稿】',
    safeJsonStringify(seed || {}, 2, 26000),
    '',
    formatOhStoryGenreCatalogPrompt(genreCatalogContract),
    '',
    formatOhStoryGenreCoreMechanicsPrompt(genreCoreMechanicsContract),
    '',
    formatOhStoryPlotSpecialTopicsPrompt(plotSpecialTopicsContract),
    '',
    formatOhStoryMainlineDefinitionPrompt(mainlineDefinitionContract),
    '',
    formatOhStoryStoryPowerPrompt(storyPowerContract),
    '',
    formatOhStoryCharacterDesignPrompt(characterDesignContract),
    '',
    formatOhStoryLongformStructurePrompt(longformStructureContract),
    '',
    '【缺口清单】',
    asSeedArray(diagnostics?.missing_fields).length ? asSeedArray(diagnostics.missing_fields).join('、') : '请复查所有必填字段是否足够支撑项目创建。',
    '',
    '【必须补齐】',
    'title, genre, sub_genres, target_audience, length_target, style_tags, commercial_tags',
    'synopsis, logline, core_premise, main_conflict',
    'protagonist, antagonist, worldbuilding, plot_engine, writing_bible, characters, character_pool',
    'writing_bible 必须包含 target_reader_contract, genre_positioning_contract, plot_special_topics_contract, mainline_definition_contract, story_power_contract, character_design_contract, longform_structure_contract, core_contract_radar, reader_retention_contract, opening_strategy_contract',
    'commercial_positioning 必须包含 platform, reader_promise, selling_points, risks',
    'master_outline, volume_outlines, chapter_outlines, foreshadowing_plan, open_questions, next_steps',
    '',
    '要求：',
    '1. synopsis 至少150字，必须包含主角、世界、核心矛盾、长期爽点和读者期待。',
    '2. protagonist 必须有 name, identity, goal, wound_or_need, power_or_cheat, limitation。',
    '3. worldbuilding 必须有 world_summary, power_system, rules, taboos。',
    '4. 超长篇至少5卷，长篇至少3卷；中篇至少2卷；短篇可1卷。',
    '5. 长篇/超长篇 chapter_outlines 至少前30章，每章包含 chapter_no,title,summary,conflict,ending_hook。',
    '6. target_reader_contract 必须回答“写给谁看、读者想看什么、本章给什么”，并给出 reader_profile, reader_desires, emotional_gap, chapter_value_test, quality_checks。',
    '7. genre_positioning_contract 必须给出题材标签、平台口味、核心梗、卖点、创新边界、genre_catalog_contract、genre_core_mechanics_contract 和“拉长板而非补短板”的质量检查。',
    '8. plot_special_topics_contract 必须包含上方 oh-story 特殊题材操作契约，特别是金手指、题材边界、扫榜对标、都市高武、三万字卡点和阵营手牌规则。',
    '9. mainline_definition_contract 必须包含主线不等于升级、主线是一件事、升级是主角达成目标的行动、不是一个元素和主线完成后的承接规则。',
    '10. story_power_contract 必须包含故事五维、有动作才是故事、有始有终、因果反馈和行动改变局势检查。',
    '11. character_design_contract 必须包含三层标签、强/中/弱关联、角色卡、角色池分层、配角功能化、反派自我叙事、antagonist_logic、金手指绑架人设、代入感和安全感规则。',
    '11.1 characters/character_pool 必须覆盖 protagonist, primary_supporting, secondary_supporting, cameo_supporting, antagonist_primary, antagonist_arc, antagonist_minor, faction_agent；每个角色包含 tier, narrative_function, relationship_to_protagonist, first_appearance_chapter, active_range, voice_anchor, signature_action, secret_or_pressure, exit_or_turning_point；反派层必须包含 antagonist_logic。',
    '12. longform_structure_contract 必须包含一级/二级/三级结构选择、五幕因果链、五级大纲不超过3级、每卷目的+高潮、主线+支线/暗线布局、换地图顶层势力柱子和人际关系先行规则。',
    '13. core_contract_radar 必须给出 must_serve, no_drift, theme_unity_rules, repair_focus，并包含“当初吸引读者的卖点还在吗”的十章复核问题。',
    '14. reader_retention_contract 必须要求前300字承接上一章压力，章末留下下一章动作压力。',
    '15. 不要生成正文；不要照搬任何现有作品专有设定、角色名、桥段或原句。',
  ].filter(Boolean).join('\n')
}

export function buildProjectSeedPrompt(
  idea: string,
  requestedTitle = '',
  requestedLengthTarget = '',
  options: { preferredGenre?: string; preferredFramework?: string } = {},
) {
  const normalizedLengthTarget = normalizeLengthTarget(requestedLengthTarget) || 'medium'
  const preferredGenre = String(options.preferredGenre || '').trim()
  const preferredFramework = String(options.preferredFramework || '').trim()
  const genreCatalogContract = buildOhStoryGenreCatalogContract(
    idea,
    requestedTitle,
    preferredGenre,
    preferredFramework,
    preferredFramework ? { force_framework: preferredFramework } : null,
  )
  const genreCoreMechanicsContract = buildOhStoryGenreCoreMechanicsContract(idea, requestedTitle, preferredFramework, preferredGenre)
  const plotSpecialTopicsContract = buildOhStoryPlotSpecialTopicsContract(idea, requestedTitle, preferredFramework, preferredGenre)
  const mainlineDefinitionContract = buildOhStoryMainlineDefinitionContract(idea, requestedTitle)
  const storyPowerContract = buildOhStoryStoryPowerContract(idea, requestedTitle)
  const characterDesignContract = buildOhStoryCharacterDesignContract(idea, requestedTitle)
  const longformStructureContract = buildOhStoryLongformStructureContract(idea, requestedTitle, { length_target: normalizedLengthTarget })
  return [
    '任务：把用户碎片化小说想法整理成可创建项目的结构化项目种子。只输出 JSON object，不要 Markdown，不要解释。',
    requestedTitle ? `用户指定作品名：${requestedTitle}` : '',
    preferredGenre ? `用户指定主题材（硬约束）：${preferredGenre}。genre 字段必须输出该主类，禁止漂到无关主类（尤其禁止无故写成仙侠/修真）。` : '',
    preferredFramework ? `用户指定类型框架：${preferredFramework}。分卷、细纲与卖点必须服务该玩法。` : '',
    describeLengthTarget(normalizedLengthTarget),
    '',
    '用户原始想法：',
    idea.slice(0, 20000) || '用户只提供了作品名。请基于作品名生成一个原创、可商业连载的项目种子，不要套用现有作品。',
    '',
    formatOhStoryGenreCatalogPrompt(genreCatalogContract),
    '',
    formatOhStoryGenreCoreMechanicsPrompt(genreCoreMechanicsContract),
    '',
    formatOhStoryPlotSpecialTopicsPrompt(plotSpecialTopicsContract),
    '',
    formatOhStoryMainlineDefinitionPrompt(mainlineDefinitionContract),
    '',
    formatOhStoryStoryPowerPrompt(storyPowerContract),
    '',
    formatOhStoryCharacterDesignPrompt(characterDesignContract),
    '',
    formatOhStoryLongformStructurePrompt(longformStructureContract),
    '',
    '硬性要求：即使用户只提供作品名，也必须原创扩写完整项目种子；synopsis、logline、core_premise、main_conflict、protagonist、worldbuilding、volume_outlines、chapter_outlines 不得为空。',
    '',
    '请输出字段：',
    'title: 作品暂定名，必须短而有辨识度；如果用户指定作品名，优先使用用户指定作品名',
    'genre: 主类型，从玄幻/仙侠/悬疑/都市/历史/科幻/奇幻/武侠/言情/末世/穿越/系统/其他中选择最接近的一项',
    'sub_genres: array，子类型标签',
    'target_audience: 男频/女频/全向/轻小说/漫剧/Z世代/其他',
    `length_target: 必须输出 "${normalizedLengthTarget}"`,
    'style_tags: array，文风标签',
    'commercial_tags: array，商业定位标签',
    'synopsis: 150-300字项目简介，清楚说明主角、世界、核心冲突和看点',
    'logline: 一句话钩子',
    'core_premise: 核心设定',
    'main_conflict: 主线矛盾',
    'protagonist: {name, identity, goal, wound_or_need, power_or_cheat, limitation}',
    'antagonist: {name, identity, goal, method, hidden_truth}',
    'worldbuilding: {world_summary, history_secret, power_system, ancient_gods, outer_gods, rules, taboos}',
    'plot_engine: {inciting_incident, long_term_goal, volume_arc_suggestions, first_10_chapters_direction}',
    'writing_bible: {promise, mainline, world_rules, style_lock, forbidden, safety_policy, target_reader_contract, genre_positioning_contract, plot_special_topics_contract, mainline_definition_contract, story_power_contract, character_design_contract, longform_structure_contract, core_contract_radar, reader_retention_contract, opening_strategy_contract}',
    'writing_bible.target_reader_contract: {reader_profile, reader_desires, emotional_gap, chapter_value_test, quality_checks}，必须回答“写给谁看、读者想看什么、本章给什么”',
    'writing_bible.genre_positioning_contract: {genre_tags, platform, reader_psychology, core_hook, type_formula, selling_points, long_board, innovation_boundary, genre_catalog_contract, genre_core_mechanics_contract, quality_checks}，必须包含“拉长板而非补短板”和上方 oh-story 题材目录/核心机制契约',
    'writing_bible.plot_special_topics_contract: 必须完整写入上方 oh-story 特殊题材操作契约，按 matched_topics 约束金手指、题材边界、扫榜对标、都市高武、三万字卡点、阵营手牌等专题',
    'writing_bible.mainline_definition_contract: 必须完整写入上方 oh-story 主线定义合同，覆盖主线不等于升级、主线是一件事、升级是主角达成目标的行动、不是一个元素和主线完成后的承接规则',
    'writing_bible.story_power_contract: 必须完整写入上方 oh-story 故事力合同，覆盖故事五维、有动作才是故事、有始有终、因果反馈和行动改变局势',
    'writing_bible.character_design_contract: 必须完整写入上方 oh-story 角色设计合同，覆盖三层标签、强/中/弱关联、角色卡、角色池分层、配角功能、反派自我叙事、antagonist_logic、金手指绑架人设、代入感和安全感',
    'writing_bible.longform_structure_contract: 必须完整写入上方 oh-story 长篇结构骨架合同，覆盖一级/二级/三级结构选择、五幕因果链、五级大纲、每卷目的+高潮、支线服务主线、顶层势力柱子和人际关系先行换地图',
    'writing_bible.core_contract_radar: {must_serve, no_drift, theme_unity_rules, repair_focus, periodic_drift_check}，periodic_drift_check.question 必须包含“当初吸引读者的卖点还在吗”',
    'writing_bible.reader_retention_contract: {retention_double_engine, opening_hook_rule, ending_hook_rule, reward_randomness_rule, quality_checks}，opening_hook_rule 必须包含“前300字”',
    'writing_bible.opening_strategy_contract: {hook_type, opening_flow, mainline_graft, first_5_chapter_promise, threshold_ladder, forbidden_mixing, quality_checks}，hook_type 只能取“事件噱头/金手指噱头/人设噱头”之一；事件/金手指/人设噱头不能混用；写清前5章吸量承诺与主线嫁接时机',
    'commercial_positioning: {platform, reader_promise, selling_points, tropes, risks}',
    'characters: array，列出关键人物 name, role_type, tier, narrative_function, motivation, goal, conflict, relationship_to_protagonist, first_appearance_chapter, active_range, voice_anchor, signature_action, secret_or_pressure, current_state, role_card, layered_tags, strong_associations, memory_anchor, supporting_function, exit_or_turning_point, antagonist_logic',
    'character_pool: object，可按角色池分层输出 protagonist, primary_supporting, secondary_supporting, cameo_supporting, antagonist_primary, antagonist_arc, antagonist_minor, faction_agent；每项角色字段同 characters，反派层必须填写 antagonist_logic',
    'master_outline: {title, summary, hook}',
    'volume_outlines: array，按用户指定篇幅决定分卷数量；短篇可1卷，中篇2-3卷，长篇3-5卷，超长篇5卷以上。每项 title, summary, hook, chapter_count',
    'chapter_outlines: array，按用户指定篇幅决定细纲范围；短篇可10-20章，中篇/长篇/超长篇至少前30章。每项 chapter_no,title,summary,conflict,ending_hook',
    'foreshadowing_plan: array，输出关键伏笔 plant_at,payoff_at,description',
    'open_questions: array，需要用户后续确认的问题',
    'next_steps: array，进入工作台后建议优先做什么',
    '',
    '要求：保留用户设定中的核心因果；补齐缺失但不要推翻原意；创建阶段必须先立清目标读者、题材定位、核心承诺雷达、追读留存契约和角色池分层；如果名字缺失可以给暂定名；不要直接生成正文；避免照搬任何现有作品的专有设定、角色名、桥段或原句；不要返回只有标题、题材、标签的稀薄 JSON。',
  ].filter(Boolean).join('\n')
}

function buildFinalizeProjectSeedPrompt(draft: any, idea: string, requestedTitle = '') {
  return [
    '任务：把用户人工修改后的项目草稿整理成“确定版小说项目种子”。只输出 JSON object，不要 Markdown，不要解释。',
    requestedTitle ? `用户指定作品名：${requestedTitle}` : '',
    '',
    '【用户原始想法】',
    idea.slice(0, 12000),
    '',
    '【用户确认/修改后的草稿】',
    safeJsonStringify(draft || {}, 2, 24000),
    '',
    '请在不推翻用户修改的前提下，补齐并规范以下字段：',
    'title, genre, sub_genres, target_audience, length_target, style_tags, commercial_tags, synopsis, logline, core_premise, main_conflict',
    'protagonist, antagonist, worldbuilding, plot_engine, writing_bible, characters, character_pool',
    'master_outline, volume_outlines, chapter_outlines, foreshadowing_plan, open_questions, next_steps',
    '',
    '要求：',
    '1. 用户草稿中明确写出的名字、因果、限制、角色关系必须保留。',
    '2. characters 要尽量包含年龄、身份、外貌、能力、物品、认知范围、信息边界、当前状态。',
    '2.1 character_pool/characters 必须按角色池分层覆盖 protagonist, primary_supporting, secondary_supporting, cameo_supporting, antagonist_primary, antagonist_arc, antagonist_minor, faction_agent；每个角色包含 tier, narrative_function, relationship_to_protagonist, first_appearance_chapter, active_range, voice_anchor, signature_action, secret_or_pressure, exit_or_turning_point；反派层必须包含 antagonist_logic。',
    '3. worldbuilding 要包含核心规则、力量体系、禁忌、地点、势力、关键物品。',
    '4. chapter_outlines 至少 30 章；每章包含 chapter_no,title,summary,conflict,ending_hook,must_advance,forbidden_repeats。',
    '5. 不要生成正文；不要照搬任何现有作品专有设定、角色名、桥段或原句。',
  ].filter(Boolean).join('\n')
}


export async function deriveProjectSeedWithModel(
  activeWorkspace: string,
  idea: string,
  modelId: string,
  requestedTitle = '',
  requestedLengthTarget = '',
  onProgress?: ProjectSeedProgressReporter,
  options: { preferredGenre?: string; preferredFramework?: string } = {},
) {
  safeReportProjectSeedProgress(onProgress, {
    stage: 'skeleton',
    status: 'running',
    progress: 0.08,
    detail: 'derive_skeleton',
  })
  const lengthTarget = normalizeLengthTarget(requestedLengthTarget) || 'medium'
  const preferredGenre = String(options.preferredGenre || '').trim()
  const preferredFramework = String(options.preferredFramework || '').trim()
  const prompt = buildProjectSeedPrompt(idea, requestedTitle, lengthTarget, {
    preferredGenre,
    preferredFramework,
  })
  const projectStub = {
    id: 0,
    title: requestedTitle || '创意草稿解析',
    genre: preferredGenre || '',
    sub_genres: preferredFramework ? [preferredFramework] : [],
    synopsis: idea.slice(0, 500),
    length_target: lengthTarget,
    target_audience: '',
    style_tags: [],
    commercial_tags: [],
    reference_config: {},
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const result = await executeNovelAgent('outline-agent', projectStub as any, { task: prompt, authoritativeTask: true }, {
    activeWorkspace,
    modelId,
    maxTokens: 12000,
    temperature: 0.42,
    skipMemory: true,
    responseMode: 'non_stream',
  })
  let seed = repairProjectSeedGaps(normalizeProjectSeedPayload((result as any).output || parseJsonLikePayload((result as any).content) || {}, idea, lengthTarget), idea)
  if (requestedTitle && !seed.title) seed.title = requestedTitle
  if (preferredGenre) seed.genre = preferredGenre
  if (preferredFramework) {
    const subs = Array.isArray(seed.sub_genres) ? seed.sub_genres.map((item: any) => String(item || '').trim()).filter(Boolean) : []
    if (!subs.includes(preferredFramework)) seed.sub_genres = [preferredFramework, ...subs].slice(0, 8)
  }
  seed = attachProjectSeedDirector(seed)
  safeReportProjectSeedProgress(onProgress, {
    stage: 'skeleton',
    status: 'completed',
    progress: 0.22,
    detail: 'derive_skeleton',
  })
  return { seed, result }
}

export async function finalizeProjectSeedWithModel(activeWorkspace: string, draft: any, idea: string, modelId: string, requestedTitle = '') {
  const prompt = buildFinalizeProjectSeedPrompt(draft, idea, requestedTitle)
  const projectStub = {
    id: 0,
    title: requestedTitle || draft?.title || '项目种子定稿',
    genre: draft?.genre || '',
    sub_genres: draft?.sub_genres || [],
    synopsis: draft?.synopsis || idea.slice(0, 500),
    length_target: draft?.length_target || 'medium',
    target_audience: draft?.target_audience || '',
    style_tags: draft?.style_tags || [],
    commercial_tags: draft?.commercial_tags || [],
    reference_config: {},
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const result = await executeNovelAgent('outline-agent', projectStub as any, { task: prompt, authoritativeTask: true }, {
    activeWorkspace,
    modelId,
    maxTokens: 10000,
    temperature: 0.35,
    skipMemory: true,
    responseMode: 'non_stream',
  })
  let seed = repairProjectSeedGaps(normalizeProjectSeedPayload((result as any).output || parseJsonLikePayload((result as any).content) || {}, idea, draft?.length_target), idea)
  if (requestedTitle && !seed.title) seed.title = requestedTitle
  seed = attachProjectSeedDirector(seed)
  return { seed, result }
}

export async function expandThinProjectSeedWithModel(
  activeWorkspace: string,
  seed: any,
  result: any,
  idea: string,
  modelId: string,
  requestedTitle = '',
  requestedLengthTarget = '',
  onProgress?: ProjectSeedProgressReporter,
) {
  const recovered = buildRecoverableProjectSeed(seed, idea, requestedTitle, requestedLengthTarget, result)
  // 恢复草稿中不携带本地模板细纲，避免模型抄模板。
  recovered.seed = stripLocalScaffoldOutlines(recovered.seed)
  const lengthTarget = normalizeLengthTarget(requestedLengthTarget || recovered.seed?.length_target) || 'medium'
  const prompt = buildProjectSeedRecoveryPrompt(recovered.seed, recovered.diagnostics, idea, requestedTitle, lengthTarget)
  const projectStub = {
    id: 0,
    title: requestedTitle || recovered.seed.title || '项目种子补全',
    genre: recovered.seed.genre || '',
    sub_genres: recovered.seed.sub_genres || [],
    synopsis: recovered.seed.synopsis || idea.slice(0, 500),
    length_target: lengthTarget,
    target_audience: recovered.seed.target_audience || '',
    style_tags: recovered.seed.style_tags || [],
    commercial_tags: recovered.seed.commercial_tags || [],
    reference_config: {},
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  try {
    const recoveryResult = await executeNovelAgent('outline-agent', projectStub as any, { task: prompt, authoritativeTask: true }, {
      activeWorkspace,
      modelId,
      maxTokens: 10000,
      temperature: 0.36,
      skipMemory: true,
      responseMode: 'non_stream',
    })
    let expandedSeed = repairProjectSeedGaps(normalizeProjectSeedPayload((recoveryResult as any).output || parseJsonLikePayload((recoveryResult as any).content) || {}, idea, lengthTarget), idea)
    if (requestedTitle && !expandedSeed.title) expandedSeed.title = requestedTitle
    expandedSeed = repairProjectSeedGaps(mergeRecoveredSeedPreferModelOutlines(recovered.seed, expandedSeed), idea)
    expandedSeed = attachProjectSeedDirector(expandedSeed)
    if (!(recoveryResult as any).error && hasUsableProjectSeed(expandedSeed)) {
      const stillScaffold = projectSeedOutlinesLookLikeLocalScaffold(expandedSeed)
      const diagnostics = annotateOutlineScaffoldDiagnostics(expandedSeed, {
        ...buildProjectSeedDiagnostics(expandedSeed, idea, recoveryResult),
        status: stillScaffold ? 'needs_author_review' : 'recovered_by_model',
        usable: true,
        initial_missing_fields: recovered.diagnostics.missing_fields,
        retained_fragments: recovered.diagnostics.retained_fragments,
        recovery_strategy: 'same_model_second_pass',
        suggestion: stillScaffold
          ? '二次补种子后分卷/细纲仍像本地模板。请更换更具体的创意描述后重试，或手动改写分卷与前30章细纲。'
          : '首轮返回偏薄，系统已保留有效线索并让同一模型补齐为可审阅项目种子。',
      })
      let ensured = {
        seed: attachProjectSeedDirector({ ...expandedSeed, seed_diagnostics: diagnostics }),
        result: recoveryResult,
        seed_diagnostics: diagnostics,
      }
      if (projectSeedNeedsOutlineExpansion(ensured.seed)) {
        ensured = await ensureProjectSeedModelOutlines(
          activeWorkspace,
          ensured.seed,
          idea,
          modelId,
          requestedTitle,
          lengthTarget,
          recoveryResult,
          onProgress,
        )
      }
      return {
        seed: ensured.seed,
        result: {
          ...(ensured.result || recoveryResult),
          seed_recovery: {
            attempted: true,
            status: projectSeedOutlinesLookLikeLocalScaffold(ensured.seed) ? 'needs_model_outline' : 'recovered_by_model',
            initial_result: result,
          },
        },
        seed_diagnostics: annotateOutlineScaffoldDiagnostics(ensured.seed, ensured.seed_diagnostics || diagnostics),
      }
    }

    const diagnostics = annotateOutlineScaffoldDiagnostics(stripLocalScaffoldOutlines(recovered.seed), {
      ...recovered.diagnostics,
      status: 'needs_author_review',
      recovery_model_error: String((recoveryResult as any).error || ''),
      recovery_model_preview: resultContentPreview(recoveryResult).slice(0, 1200),
      suggestion: '同一模型二次补种子仍偏薄。系统将继续尝试单独生成前30章细纲；不会用本地模板章纲冒充。',
    })
    let ensured = await ensureProjectSeedModelOutlines(
      activeWorkspace,
      stripLocalScaffoldOutlines(recovered.seed),
      idea,
      modelId,
      requestedTitle,
      lengthTarget,
      recoveryResult,
      onProgress,
    )
    return {
      seed: attachProjectSeedDirector({ ...ensured.seed, seed_diagnostics: annotateOutlineScaffoldDiagnostics(ensured.seed, ensured.seed_diagnostics || diagnostics) }),
      result: {
        ...(ensured.result || recoveryResult),
        seed_recovery: {
          attempted: true,
          status: projectSeedNeedsOutlineExpansion(ensured.seed) ? 'needs_model_outline' : 'needs_author_review',
          initial_result: result,
        },
      },
      seed_diagnostics: annotateOutlineScaffoldDiagnostics(ensured.seed, ensured.seed_diagnostics || diagnostics),
    }
  } catch (error: any) {
    const diagnostics = annotateOutlineScaffoldDiagnostics(stripLocalScaffoldOutlines(recovered.seed), {
      ...recovered.diagnostics,
      status: 'needs_author_review',
      recovery_model_error: String(error?.message || error),
      suggestion: '同一模型二次补种子调用失败。系统将尝试单独生成前30章细纲；不会回填本地模板章纲。',
    })
    try {
      const ensured = await ensureProjectSeedModelOutlines(
        activeWorkspace,
        stripLocalScaffoldOutlines(recovered.seed),
        idea,
        modelId,
        requestedTitle,
        requestedLengthTarget || recovered.seed?.length_target,
        { error: String(error?.message || error) },
        onProgress,
      )
      return {
        seed: ensured.seed,
        result: {
          ...(ensured.result || {}),
          error: String(error?.message || error),
          seed_recovery: {
            attempted: true,
            status: projectSeedNeedsOutlineExpansion(ensured.seed) ? 'needs_model_outline' : 'needs_author_review',
            initial_result: result,
          },
        },
        seed_diagnostics: annotateOutlineScaffoldDiagnostics(ensured.seed, ensured.seed_diagnostics || diagnostics),
      }
    } catch {
      // fall through to stripped seed without local scaffold outlines
    }
    return {
      seed: attachProjectSeedDirector({ ...stripLocalScaffoldOutlines(recovered.seed), seed_diagnostics: diagnostics }),
      result: {
        error: String(error?.message || error),
        seed_recovery: {
          attempted: true,
          status: 'needs_author_review',
          initial_result: result,
        },
      },
      seed_diagnostics: diagnostics,
    }
  }
}

function getSeedRaw(seed: any) {
  const raw = parseNestedSeed(seed?.raw_payload)
  return Object.keys(raw).length ? raw : parseNestedSeed(seed)
}

function firstNonEmptySeedArray(...values: any[]) {
  return values.find(value => Array.isArray(value) && value.length > 0) || []
}

function getSeedChapterOutlines(seed: any) {
  const raw = getSeedRaw(seed)
  return firstNonEmptySeedArray(
    raw.chapter_outlines,
    raw.chapters,
    seed?.chapter_outlines,
    seed?.chapters,
  )
}

function getSeedVolumeOutlines(seed: any) {
  const raw = getSeedRaw(seed)
  return firstNonEmptySeedArray(
    raw.volume_outlines,
    raw.volumes,
    seed?.volume_outlines,
    seed?.volumes,
  )
}

function normalizeChapterSeed(chapter: any, index: number, seed: any = {}) {
  const chapterNo = Number(chapter?.chapter_no || chapter?.no || index + 1)
  const rawTitle = firstSeedText(chapter?.title, chapter?.name)
  const protagonist = parseNestedSeed(seed?.protagonist)
  const title = chapterTitleLooksStructural(rawTitle)
    ? fallbackChapterDisplayTitle(
      rawTitle,
      index,
      firstSeedText(seed?.title, seed?.logline, '本书'),
      firstSeedText(cleanSeedCharacterName(protagonist.name), cleanSeedCharacterName(protagonist.title), '主角'),
      firstSeedText(chapter?.chapter_summary, chapter?.summary, chapter?.chapter_goal, chapter?.goal),
      compactSeedText(safeJsonStringify(seed || {}, undefined, 1200), 1200),
    )
    : firstSeedText(rawTitle, `第${chapterNo}章`)
  return {
    chapter_no: chapterNo,
    title,
    chapter_goal: firstSeedText(chapter?.chapter_goal, chapter?.goal, chapter?.summary),
    chapter_summary: firstSeedText(chapter?.chapter_summary, chapter?.summary),
    conflict: firstSeedText(chapter?.conflict),
    ending_hook: firstSeedText(chapter?.ending_hook, chapter?.hook),
    raw_payload: {
      ...(chapter || {}),
      story_function: firstSeedText(chapter?.story_function, chapterTitleLooksStructural(rawTitle) ? rawTitle : ''),
    },
  }
}

function hasUsableWritingBible(value: any) {
  const bible = parseNestedSeed(value)
  return Boolean(firstSeedText(
    bible.promise,
    bible.reader_promise,
    bible.mainline?.title,
    bible.mainline?.hook,
    bible.mainline_title,
    bible.mainline_hook,
  ))
}

function buildFallbackWritingBible(seed: any, project: any = {}) {
  const root = parseNestedSeed(seed)
  const world = parseNestedSeed(root.worldbuilding)
  const plotEngine = parseNestedSeed(root.plot_engine)
  const existing = parseNestedSeed(root.writing_bible)
  const promise = firstSeedText(root.logline, root.synopsis, root.core_premise, project.synopsis, `${root.title || project.title || '本书'}的核心读者承诺待补齐`)
  const mainlineGoal = firstSeedText(root.main_conflict, plotEngine.long_term_goal, root.core_premise, promise)
  const volumePlan = asSeedArray(existing.volume_plan).length ? asSeedArray(existing.volume_plan) : asSeedArray(root.volume_outlines).map((volume: any, index: number) => ({
    title: firstSeedText(volume?.title, volume?.name, `第${index + 1}卷`),
    goal: firstSeedText(volume?.goal, volume?.summary, volume?.hook, `完成第${index + 1}卷阶段承诺`),
    chapter_count: volume?.chapter_count || '',
  }))
  const firstVolume = volumePlan[0] || {}
  const protagonist = parseNestedSeed(root.protagonist)
  const protagonistDrive = firstSeedText(
    existing.protagonist_drive,
    existing.mainline?.protagonist_drive,
    protagonist.goal,
    protagonist.motivation,
    protagonist.wound_or_need,
    asSeedArray(root.characters).find((item: any) => item?.goal || item?.motivation)?.goal,
  )
  const coreConflict = firstSeedText(existing.core_conflict, existing.mainline?.core_conflict, root.main_conflict, plotEngine.long_term_goal, root.synopsis, mainlineGoal)
  const currentVolumeGoal = firstSeedText(
    existing.current_volume_goal,
    existing.volume_goal,
    firstVolume.title && firstVolume.goal ? `${firstVolume.title}：${firstVolume.goal}` : '',
    firstVolume.goal,
    firstVolume.summary,
  )
  const innovationHook = firstSeedText(existing.innovation_hook, root.logline, root.core_premise, asSeedArray(root.commercial_tags)[0], promise)
  const first30Plan = firstSeedText(
    existing.first30_plan,
    plotEngine.first_10_chapters_direction,
    asSeedArray(root.chapter_outlines).length ? `前30章围绕「${promise}」推进，完成开局压迫、能力验证、敌对势力亮相和阶段钩子。` : '',
  )
  const longformCapacity = firstSeedText(
    existing.longform_capacity,
    existing.mainline?.longform_capacity,
    `${project.length_target || root.length_target || 'longform'}：${volumePlan.map((volume: any) => firstSeedText(volume.title, volume.goal)).filter(Boolean).join(' / ')}`,
  )
  const commercial = parseNestedSeed(root.commercial_positioning)
  const platform = firstSeedText(commercial.platform, root.platform, project.platform, '未指定平台')
  const targetAudience = firstSeedText(root.target_audience, project.target_audience, commercial.target_audience, '目标读者画像待补齐')
  const readerPromise = firstSeedText(commercial.reader_promise, existing.reader_promise, promise)
  const genreTags = uniqueSeedTexts([
    root.genre,
    project.genre,
    ...asSeedArray(root.sub_genres),
    ...asSeedArray(project.sub_genres),
    ...asSeedArray(root.commercial_tags),
  ], 10)
  const sellingPoints = uniqueSeedTexts([
    ...asSeedArray(commercial.selling_points),
    ...asSeedArray(root.selling_points),
    ...asSeedArray(root.commercial_tags),
    innovationHook,
  ], 8)
  const positioningRisks = uniqueSeedTexts([
    ...asSeedArray(commercial.risks),
    '不能偏离核心读者承诺、主角驱动力和题材长板。',
    '不能把核心卖点写成解释性设定，必须落到行动、选择、代价和回报。',
  ], 8)
  const genreCatalogContract = buildOhStoryGenreCatalogContract(
    root.title,
    project.title,
    root.genre,
    project.genre,
    asSeedArray(root.sub_genres),
    asSeedArray(project.sub_genres),
    asSeedArray(root.commercial_tags),
    root.synopsis,
    root.logline,
    root.core_premise,
  )
  const genreCoreMechanicsContract = buildOhStoryGenreCoreMechanicsContract(
    root.title,
    project.title,
    root.genre,
    project.genre,
    asSeedArray(root.sub_genres),
    asSeedArray(project.sub_genres),
    asSeedArray(root.commercial_tags),
    root.synopsis,
    root.logline,
    root.core_premise,
    root.plot_engine,
    root.worldbuilding,
    root.protagonist,
  )
  const plotSpecialTopicsContract = {
    ...buildOhStoryPlotSpecialTopicsContract(
      root.title,
      project.title,
      root.genre,
      project.genre,
      asSeedArray(root.sub_genres),
      asSeedArray(project.sub_genres),
      asSeedArray(root.commercial_tags),
      root.synopsis,
      root.logline,
      root.core_premise,
      root.plot_engine,
      root.worldbuilding,
      root.protagonist,
      existing.genre_positioning_contract,
    ),
    ...parseNestedSeed(existing.plot_special_topics_contract),
  }
  const readerDesires = uniqueSeedTexts([
    readerPromise,
    ...sellingPoints,
    protagonistDrive,
    coreConflict,
  ], 8)
  const targetReaderContract = {
    source: 'oh_story_creation_contract_v1',
    reader_profile: targetAudience,
    reader_desires: readerDesires,
    emotional_gap: uniqueSeedTexts([
      `核心痛苦/未满足需求：${targetAudience}`,
      coreConflict,
      protagonistDrive,
    ], 5),
    chapter_value_test: [
      '写给谁看：每章开写前必须能说清目标读者画像。',
      '读者想看什么：每章必须服务 reader_desires 中至少一个明确欲望。',
      '本章给什么：正文必须给出可感知的行动、信息、代价、爽点或情绪回报。',
    ],
    quality_checks: [
      '目标读者、读者欲望和本章回报必须在正文证据中闭环。',
      '不能只写作者自嗨设定，必须让读者承诺落成可见事件。',
    ],
    ...parseNestedSeed(existing.target_reader_contract),
  }
  const genrePositioningContract = {
    source: 'oh_story_creation_contract_v1',
    genre_tags: genreTags,
    platform,
    reader_psychology: uniqueSeedTexts([
      targetAudience,
      readerPromise,
      ...sellingPoints,
    ], 8),
    core_hook: innovationHook,
    type_formula: uniqueSeedTexts([
      root.logline,
      root.core_premise,
      `${firstSeedText(root.genre, project.genre, '题材')} + ${firstSeedText(sellingPoints[0], innovationHook, '核心卖点')} + ${firstSeedText(protagonistDrive, '主角驱动力')}`,
    ], 5),
    selling_points: sellingPoints,
    long_board: firstSeedText(sellingPoints[0], innovationHook, readerPromise),
    innovation_boundary: '微创新必须服务核心卖点和目标读者，不新增会稀释主线的复杂机制。',
    genre_catalog_contract: genreCatalogContract,
    genre_core_mechanics_contract: genreCoreMechanicsContract,
    quality_checks: [
      '题材标签、读者心理、核心梗、平台口味和章节场景必须一致。',
      '拉长板而非补短板：优先强化最能吸引目标读者的核心卖点。',
      '书名、简介、内容承诺必须三位一体。',
    ],
    ...parseNestedSeed(existing.genre_positioning_contract),
  }
  const coreContractRadar = {
    source: 'oh_story_creation_contract_v1',
    summary: firstSeedText(readerPromise, promise),
    must_serve: uniqueSeedTexts([
      readerPromise,
      promise,
      protagonistDrive,
      coreConflict,
      currentVolumeGoal,
      innovationHook,
      ...sellingPoints,
    ], 10),
    no_drift: positioningRisks,
    theme_unity_rules: [
      '一本书从头到尾必须服务同一核心情绪和读者承诺。',
      '支线、升级、日常和新资产只能放大核心卖点，不能替换核心卖点。',
      '每10章复核一次：当初吸引读者的卖点还在吗？',
    ],
    repair_focus: [
      '缺主线时，优先补核心冲突的行动推进。',
      '缺爽点时，优先补目标读者能感知的选择、代价、反制或奖励。',
      '缺题材味时，优先补题材长板和核心梗的场景证据。',
    ],
    ...parseNestedSeed(existing.core_contract_radar),
  }
  const readerRetentionContract = {
    source: 'oh_story_creation_contract_v1',
    retention_double_engine: uniqueSeedTexts([
      '外部问题持续升级，内部回报持续兑现。',
      readerPromise,
      currentVolumeGoal,
    ], 5),
    opening_hook_rule: '每章前300字必须接住上一章状态、未解问题、读者期待债或新的行动压力。',
    ending_hook_rule: '章末必须留下下一章可执行压力：新问题、新代价、新敌意、新奖励或新选择。',
    reward_randomness_rule: '奖励和反转要有意外感，但必须由已知规则、角色选择或伏笔触发。',
    quality_checks: [
      '开头不能另起炉灶，必须承接上一章读者期待。',
      '结尾不能只总结情绪，必须交出下一章追读理由。',
      '回报必须可感知，不能停留在解释设定。',
    ],
    ...parseNestedSeed(existing.reader_retention_contract),
  }
  const storyPowerContract = buildOhStoryStoryPowerContract(root, project, existing)
  const mainlineDefinitionContract = buildOhStoryMainlineDefinitionContract(root, project, existing)
  const characterDesignContract = buildOhStoryCharacterDesignContract(root, project, existing)
  const longformStructureContract = buildOhStoryLongformStructureContract(root, project, existing)
  const commercialPositioning = {
    platform,
    reader_promise: readerPromise,
    selling_points: sellingPoints,
    target_audience: targetAudience,
    risks: positioningRisks,
    ...parseNestedSeed(existing.commercial_positioning),
  }
  const openingStrategyContract = {
    source: 'oh_story_creation_contract_v1',
    hook_type: /金手指|系统|外挂/.test(`${promise} ${firstSeedText(protagonist.power_or_cheat, world.power_system)}`) ? '金手指噱头' : '事件噱头',
    opening_flow: `开篇用具体事件压住读者，再露出「${firstSeedText(root.title, project.title, '本书')}」的规则代价。`,
    mainline_graft: `前5章完成吸量承诺后，嫁接到主线冲突：${firstSeedText(coreConflict, mainlineGoal, promise)}。`,
    first_5_chapter_promise: firstSeedText(first30Plan, `前5章兑现「${readerPromise}」并让主角完成一次小规模验证。`),
    threshold_ladder: '用信息差、资源门槛、身份门槛和对手反制逐级抬高行动成本。',
    forbidden_mixing: '事件噱头、金手指噱头、人设噱头三选一，不在开篇混用。',
    quality_checks: [
      '开篇第一屏必须是剧情推进，而不是设定说明书。',
      '前5章承诺必须可在细纲中核对。',
      '主线嫁接时机必须明确。',
    ],
    ...parseNestedSeed(existing.opening_strategy_contract),
  }
  return {
    ...existing,
    promise,
    reader_promise: firstSeedText(existing.reader_promise, promise),
    protagonist_drive: protagonistDrive,
    core_conflict: coreConflict,
    current_volume_goal: currentVolumeGoal,
    innovation_hook: innovationHook,
    first30_plan: first30Plan,
    longform_capacity: longformCapacity,
    mainline: {
      ...parseNestedSeed(existing.mainline),
      title: firstSeedText(existing.mainline?.title, root.title, project.title, '全书主线'),
      hook: firstSeedText(existing.mainline?.hook, root.logline, root.main_conflict, promise),
      goal: firstSeedText(existing.mainline?.goal, mainlineGoal),
      protagonist_drive: firstSeedText(existing.mainline?.protagonist_drive, protagonistDrive),
      core_conflict: firstSeedText(existing.mainline?.core_conflict, coreConflict),
      longform_capacity: firstSeedText(existing.mainline?.longform_capacity, longformCapacity),
    },
    world_rules: firstSeedText(existing.world_rules, world.power_system, asSeedArray(world.rules).join('；'), world.world_summary, root.core_premise),
    volume_plan: volumePlan,
    style_lock: firstSeedText(existing.style_lock, asSeedArray(root.style_tags).join('、'), '保持强情节推进、清晰因果、持续悬念和商业连载节奏。'),
    forbidden: firstSeedText(existing.forbidden, '不得推翻已确认主角动机、世界规则、章节细纲和伏笔回收计划；不得用无代价巧合解决核心冲突。'),
    safety_policy: firstSeedText(existing.safety_policy, '生成内容必须服务原创设定，避免照搬现有作品专有表达、角色关系和桥段。'),
    target_reader_contract: targetReaderContract,
    genre_positioning_contract: genrePositioningContract,
    plot_special_topics_contract: plotSpecialTopicsContract,
    mainline_definition_contract: mainlineDefinitionContract,
    story_power_contract: storyPowerContract,
    character_design_contract: characterDesignContract,
    longform_structure_contract: longformStructureContract,
    core_contract_radar: coreContractRadar,
    reader_retention_contract: readerRetentionContract,
    opening_strategy_contract: openingStrategyContract,
    commercial_positioning: commercialPositioning,
    source: firstSeedText(existing.source, 'project_seed_fallback'),
  }
}

function normalizeSeedCurrentState(value: any, fallback: any = {}) {
  if (typeof value === 'string') {
    const parsed = parseNestedSeed(value)
    return Object.keys(parsed).length ? parsed : { summary: value }
  }
  const parsed = parseNestedSeed(value)
  return Object.keys(parsed).length ? parsed : parseNestedSeed(fallback)
}

function seedCharacterName(character: any) {
  return firstSeedText(character?.name, character?.title, character?.alias)
}

const SEED_CHARACTER_POOL_TIERS = [
  'protagonist',
  'primary_supporting',
  'secondary_supporting',
  'cameo_supporting',
  'antagonist_primary',
  'antagonist_arc',
  'antagonist_minor',
  'faction_agent',
]

function seedTierCamelKey(tier: string) {
  return tier.replace(/_([a-z])/g, (_, letter) => String(letter || '').toUpperCase())
}

function seedArrayOrSingle(value: any) {
  if (Array.isArray(value)) return value
  const parsed = parseNestedSeed(value)
  return Object.keys(parsed).length ? [parsed] : []
}

function seedValueMissing(value: any) {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return !value.trim()
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

function mergeMissingSeedCharacterFields(target: any, source: any) {
  for (const [key, value] of Object.entries(source || {})) {
    if (key === 'name') continue
    if (seedValueMissing(value)) continue
    if (seedValueMissing(target[key])) {
      target[key] = value
    } else if (
      target[key]
      && value
      && typeof target[key] === 'object'
      && typeof value === 'object'
      && !Array.isArray(target[key])
      && !Array.isArray(value)
    ) {
      target[key] = { ...value, ...target[key] }
    }
  }
}

function inferSeedCharacterTier(character: any, fallbackTier = '') {
  const raw = firstSeedText(
    character?.tier,
    character?.role_type,
    character?.role,
    character?.identity,
    character?.supporting_function,
    fallbackTier,
  )
  const normalized = raw.toLowerCase()
  if (SEED_CHARACTER_POOL_TIERS.includes(normalized)) return normalized
  if (/主角|protagonist|视角/.test(raw)) return 'protagonist'
  if (/核心反派|最终反派|primary.*antagonist|antagonist.*primary|boss|大boss|总boss/i.test(raw)) return 'antagonist_primary'
  if (/阶段反派|分卷反派|arc.*antagonist|antagonist.*arc|阶段对手/i.test(raw)) return 'antagonist_arc'
  if (/小反派|反派配角|minor.*antagonist|antagonist.*minor|局部阻碍|喽啰/i.test(raw)) return 'antagonist_minor'
  if (/势力执行|组织执行|faction.*agent|agent|执事|巡考|守卫|管事/i.test(raw)) return 'faction_agent'
  if (/主要配角|核心配角|primary.*support|support.*primary/i.test(raw)) return 'primary_supporting'
  if (/次要配角|secondary.*support|support.*secondary/i.test(raw)) return 'secondary_supporting'
  if (/龙套|功能配角|cameo|walk.?on|证人|路人/i.test(raw)) return 'cameo_supporting'
  return fallbackTier
}

function collectGroupedSeedCharacters(root: any) {
  const grouped: any[] = []
  const containers = [
    root.character_pool,
    root.characterPool,
    root.role_pool,
    root.rolePool,
    root.characters_by_tier,
    root.charactersByTier,
    root.role_groups,
    root.roleGroups,
    root,
  ]
  for (const container of containers) {
    const parsed = parseNestedSeed(container)
    if (!Object.keys(parsed).length) continue
    for (const tier of SEED_CHARACTER_POOL_TIERS) {
      const rows = [
        ...seedArrayOrSingle(parsed[tier]),
        ...seedArrayOrSingle(parsed[seedTierCamelKey(tier)]),
      ]
      for (const row of rows) {
        grouped.push({ tier, character: row })
      }
    }
  }
  return grouped
}

function buildMaterializedSeedCharacters(seed: any) {
  const root = parseNestedSeed(seed)
  const byName = new Map<string, any>()
  const output: any[] = []
  const add = (character: any, defaults: any = {}, roleGroup = '') => {
    const parsed = { ...defaults, ...parseNestedSeed(character) }
    const tier = inferSeedCharacterTier(parsed, roleGroup)
    if (tier) {
      if (!firstSeedText(parsed.tier)) parsed.tier = tier
      if (!firstSeedText(parsed.role_type, parsed.role)) parsed.role_type = tier
    }
    if (roleGroup) parsed.raw_role_group = firstSeedText(parsed.raw_role_group, roleGroup)
    const name = seedCharacterName(parsed)
    if (!name) return
    const existing = byName.get(name)
    if (existing) {
      mergeMissingSeedCharacterFields(existing, parsed)
      return
    }
    const next = { ...parsed, name }
    byName.set(name, next)
    output.push(next)
  }
  asSeedArray(root.characters).forEach(character => add(character))
  collectGroupedSeedCharacters(root).forEach(item => add(item.character, { role_type: item.tier, tier: item.tier }, item.tier))
  add(root.protagonist, { role_type: 'protagonist' })
  add(root.antagonist, { role_type: 'antagonist' })
  return output
}

export function buildMaterializedSeedCharactersForTest(seed: any) {
  return buildMaterializedSeedCharacters(seed)
}

function buildProjectSeedStoryState(seed: any, project: any, characters: any[]) {
  const existing = parseNestedSeed(project?.reference_config?.story_state)
  const currentPhase = firstSeedText(
    existing.current_phase,
    seed?.opening_phase,
    asSeedArray(seed?.chapter_outlines)[0]?.title,
    '开篇准备',
  )
  const stateCharacters = characters.map((character: any) => {
    const currentState = normalizeSeedCurrentState(character.current_state, {
      status: '待写入正文',
      goal: character.goal || '',
      pressure: character.conflict || '',
    })
    return {
      name: seedCharacterName(character),
      role_type: firstSeedText(character.role_type, character.role),
      goal: firstSeedText(character.goal, character.motivation),
      motivation: firstSeedText(character.motivation),
      conflict: firstSeedText(character.conflict),
      current_state: currentState,
      source: 'project_seed_materialization',
    }
  }).filter((character: any) => character.name)
  const foreshadowingStatus = { ...(parseNestedSeed(existing.foreshadowing_status) || {}) }
  for (const item of asSeedArray(seed?.foreshadowing_plan)) {
    const record = parseNestedSeed(item)
    const name = firstSeedText(record.name, record.title)
    if (!name || foreshadowingStatus[name]) continue
    foreshadowingStatus[name] = firstSeedText(
      record.description,
      record.summary,
      record.true_meaning,
      `埋设：${firstSeedText(record.plant_at, record.plantAt, '待定')}；回收：${firstSeedText(record.payoff_at, record.payoffAt, '待定')}`,
    )
  }
  const world = parseNestedSeed(seed?.worldbuilding)
  return {
    ...existing,
    source: existing.source || 'project_seed_materialization',
    current_phase: currentPhase,
    progress_summary: firstSeedText(existing.progress_summary, seed?.synopsis, project?.synopsis),
    active_threads: asSeedArray(existing.active_threads).length
      ? existing.active_threads
      : uniqueSeedTexts([
        seed?.main_conflict,
        seed?.logline,
        seed?.core_premise,
      ], 5),
    characters: asSeedArray(existing.characters).length ? existing.characters : stateCharacters,
    foreshadowing_status: Object.keys(foreshadowingStatus).length
      ? foreshadowingStatus
      : (existing.foreshadowing_status || {}),
    world_rules: asSeedArray(existing.world_rules).length
      ? existing.world_rules
      : uniqueSeedTexts([
        ...asSeedArray(world.rules),
        world.power_system,
        seed?.writing_bible?.world_rules,
      ], 8),
    updated_at: new Date().toISOString(),
  }
}

function normalizeSeedSceneCards(chapter: any, characters: any[]) {
  const rawCards = firstNonEmptySeedArray(
    chapter.scene_cards,
    chapter.sceneCards,
    chapter.scene_breakdown,
    chapter.sceneBreakdown,
    chapter.scene_list,
    chapter.sceneList,
    chapter.scenes,
  )
  const characterNames = characters.map(seedCharacterName).filter(Boolean).slice(0, 4)
  if (rawCards.length) {
    return rawCards.map((card: any, index: number) => ({
      scene_no: Number(card?.scene_no || card?.sceneNo || index + 1),
      title: firstSeedText(card?.title, card?.name, `场景${index + 1}`),
      purpose: firstSeedText(card?.purpose, card?.goal, card?.function_tag, chapter.chapter_goal, '推进本章目标'),
      summary: firstSeedText(card?.summary, card?.content, card?.beats, chapter.chapter_summary),
      conflict: firstSeedText(card?.conflict, card?.obstacle, chapter.conflict),
      characters: asSeedArray(card?.characters).length ? asSeedArray(card.characters) : characterNames,
      expected_state_change: firstSeedText(card?.expected_state_change, card?.state_change, chapter.raw_payload?.must_advance),
      ending_hook_seed: firstSeedText(card?.ending_hook_seed, card?.hook, index === rawCards.length - 1 ? chapter.ending_hook : ''),
      density_level: firstSeedText(card?.density_level, card?.densityLevel, index === rawCards.length - 1 ? 'dense' : 'medium'),
      purpose_tag: firstSeedText(card?.purpose_tag, card?.purposeTag, index === rawCards.length - 1 ? '章尾钩子' : '推进'),
      source: firstSeedText(card?.source, 'project_seed'),
      raw_payload: card,
    }))
  }
  const goal = firstSeedText(chapter.chapter_goal, chapter.raw_payload?.goal, '推进本章核心目标')
  const summary = firstSeedText(chapter.chapter_summary, chapter.raw_payload?.summary, goal)
  const conflict = firstSeedText(chapter.conflict, chapter.raw_payload?.conflict, '让目标遭遇明确阻碍')
  const endingHook = firstSeedText(chapter.ending_hook, chapter.raw_payload?.ending_hook, chapter.raw_payload?.hook)
  const cards = [
    {
      scene_no: 1,
      title: '目标入场',
      purpose: goal,
      summary,
      conflict,
      characters: characterNames,
      expected_state_change: goal,
      density_level: 'medium',
      purpose_tag: '开场承接',
      source: 'project_seed_materialization',
    },
    {
      scene_no: 2,
      title: endingHook ? '章尾钩子' : '目标推进',
      purpose: endingHook ? '把本章冲突推到章尾追读压力' : '完成本章目标推进',
      summary: endingHook ? `${summary}；章尾留下：${endingHook}` : summary,
      conflict,
      characters: characterNames,
      expected_state_change: firstSeedText(endingHook, conflict, goal),
      ending_hook_seed: endingHook,
      density_level: endingHook ? 'dense' : 'medium',
      purpose_tag: endingHook ? '章尾钩子' : '推进',
      source: 'project_seed_materialization',
    },
  ]
  return cards
}

export async function materializeProjectSeed(activeWorkspace: string, project: any, seed: any) {
  const raw = getSeedRaw(seed)
  const master = parseNestedSeed(raw.master_outline || seed.master_outline)
  const volumeOutlines = getSeedVolumeOutlines(seed)
  const chapterOutlines = getSeedChapterOutlines(seed).map((chapter: any, index: number) => normalizeChapterSeed(chapter, index, seed))
  const writingBible = buildFallbackWritingBible(seed, project)
  const materializedCharacters = buildMaterializedSeedCharacters(seed)
  const created: any = { worldbuilding: 0, characters: 0, outlines: 0, chapters: 0, setting_entities: 0 }

  const world = parseNestedSeed(seed.worldbuilding)
  const worldSummary = firstSeedText(world.world_summary, world.history_secret, world.power_system, seed.core_premise, master.summary, project.synopsis)
  if (worldSummary) {
    await createNovelWorldbuilding(activeWorkspace, {
      project_id: project.id,
      world_summary: worldSummary,
      rules: asSeedArray(world.rules),
      systems: [
        world.power_system ? { name: '力量体系', content: world.power_system } : null,
        world.ancient_gods ? { name: '古神', content: world.ancient_gods } : null,
        world.outer_gods ? { name: '外神', content: world.outer_gods } : null,
      ].filter(Boolean),
      known_unknowns: asSeedArray(seed.open_questions),
      raw_payload: { ...world, source: 'project_seed' },
    })
    created.worldbuilding += 1
  }

  for (const character of materializedCharacters) {
    if (!character?.name) continue
    await createNovelCharacter(activeWorkspace, {
      project_id: project.id,
      name: String(character.name),
      role_type: character.role_type || character.role || '',
      archetype: character.archetype || '',
      motivation: character.motivation || '',
      goal: character.goal || '',
      conflict: character.conflict || '',
      growth_arc: character.growth_arc || '',
      current_state: character.current_state || {},
      raw_payload: { ...character, source: 'project_seed' },
    })
    created.characters += 1
  }

  const settingEntities = firstNonEmptySeedArray(raw.setting_entities, seed.setting_entities)
  for (const entity of normalizeSettingAgentPayload({ settings: settingEntities }, project.id)) {
    await createNovelSettingEntity(activeWorkspace, {
      ...entity,
      project_id: project.id,
      payload_json: { ...(entity.payload_json || {}), source: entity.payload_json?.source || 'project_seed_materialization' },
    } as any)
    created.setting_entities += 1
  }

  // Materialize foreshadowing plan and world rules so chapter-1 preflight can read them as source readiness.
  for (const item of asSeedArray(seed.foreshadowing_plan)) {
    const record = parseNestedSeed(item)
    const name = firstSeedText(record.name, record.title)
    if (!name) continue
    await createNovelSettingEntity(activeWorkspace, {
      project_id: project.id,
      entity_type: 'foreshadowing',
      name,
      summary: firstSeedText(record.description, record.summary, record.true_meaning, `${name} 待埋设/回收`),
      state_json: {
        planted_chapter: firstSeedText(record.plant_at, record.plantAt, '1'),
        payoff_chapter: firstSeedText(record.payoff_at, record.payoffAt, ''),
        true_meaning: firstSeedText(record.true_meaning, record.trueMeaning, ''),
        status: 'planted_pending',
      },
      payload_json: { ...record, source: 'project_seed_materialization' },
    } as any)
    created.setting_entities += 1
  }
  for (const rule of asSeedArray(world.rules)) {
    const ruleText = firstSeedText(rule)
    if (!ruleText) continue
    await createNovelSettingEntity(activeWorkspace, {
      project_id: project.id,
      entity_type: 'rule',
      name: compactSeedText(ruleText, 24) || '世界规则',
      summary: ruleText,
      constraints_json: { rule: ruleText, source: 'project_seed_worldbuilding' },
      payload_json: { source: 'project_seed_materialization', kind: 'world_rule' },
    } as any)
    created.setting_entities += 1
  }
  if (firstSeedText(world.power_system)) {
    await createNovelSettingEntity(activeWorkspace, {
      project_id: project.id,
      entity_type: 'system',
      name: '力量体系',
      summary: firstSeedText(world.power_system),
      constraints_json: { power_system: firstSeedText(world.power_system), source: 'project_seed_worldbuilding' },
      payload_json: { source: 'project_seed_materialization', kind: 'power_system' },
    } as any)
    created.setting_entities += 1
  }

  const masterOutline = await createNovelOutline(activeWorkspace, {
    project_id: project.id,
    outline_type: 'master',
    title: firstSeedText(master.title, seed.title, project.title, '全书主线'),
    summary: firstSeedText(master.summary, seed.synopsis, seed.core_premise, project.synopsis),
    hook: firstSeedText(master.hook, seed.logline, seed.main_conflict),
    target_length: project.length_target || '',
    raw_payload: { ...master, source: 'project_seed' },
  })
  created.outlines += 1

  for (const volume of volumeOutlines) {
    if (!volume?.title && !volume?.summary) continue
    await createNovelOutline(activeWorkspace, {
      project_id: project.id,
      outline_type: 'volume',
      parent_id: masterOutline.id,
      title: firstSeedText(volume.title, `分卷 ${created.outlines}`),
      summary: firstSeedText(volume.summary),
      hook: firstSeedText(volume.hook),
      target_length: volume.chapter_count ? `${volume.chapter_count}章` : '',
      raw_payload: { ...volume, source: 'project_seed' },
    })
    created.outlines += 1
  }

  for (const chapter of chapterOutlines) {
    if (!chapter.chapter_no) continue
    const sceneCards = normalizeSeedSceneCards(chapter, materializedCharacters)
    await syncNovelChapterPlanByNumber(activeWorkspace, {
      project_id: project.id,
      chapter_no: chapter.chapter_no,
      title: chapter.title,
      chapter_goal: chapter.chapter_goal,
      chapter_summary: chapter.chapter_summary,
      conflict: chapter.conflict,
      ending_hook: chapter.ending_hook,
      scene_breakdown: sceneCards,
      scene_list: sceneCards,
      raw_payload: { ...chapter.raw_payload, scene_cards_source: 'project_seed_materialization', source: 'project_seed' },
    }, { parent_id: masterOutline.id, source: 'project_seed' })
    created.chapters += 1
  }

  const nextReferenceConfig = {
    ...(project.reference_config || {}),
    project_seed: {
      ...seed,
      materialized_at: new Date().toISOString(),
      materialized_counts: created,
    },
    writing_bible: {
      ...writingBible,
      updated_at: new Date().toISOString(),
    },
    story_state: buildProjectSeedStoryState(seed, project, materializedCharacters),
    commercial_positioning: Object.keys(parseNestedSeed(project.reference_config?.commercial_positioning)).length
      && project.reference_config?.commercial_positioning?.seed !== true
      ? project.reference_config?.commercial_positioning
      : writingBible.commercial_positioning || {
      reader_promise: seed.logline || seed.synopsis || '',
      selling_points: asSeedArray(seed.commercial_tags),
      seed: true,
    },
    foreshadowing_plan: raw.foreshadowing_plan || seed.foreshadowing_plan || [],
    creation_pipeline: {
      mode: 'seed_auto_materialized',
      created,
      next_steps: seed.next_steps || [],
      updated_at: new Date().toISOString(),
    },
  }
  const updated = await updateNovelProject(activeWorkspace, project.id, {
    reference_config: nextReferenceConfig,
  } as any)
  await appendNovelRun(activeWorkspace, {
    project_id: project.id,
    run_type: 'project_seed_materialize',
    step_name: 'create-project-from-seed',
    status: 'success',
    input_ref: safeJsonStringify({ seed_title: seed.title || '', source: 'project_seed' }, undefined, 0),
    output_ref: safeJsonStringify({ created }, undefined, 0),
  })
  return { created, project: updated }
}

export async function createProjectFromSeed(activeWorkspace: string, seed: any, options: { title?: string; idea?: string } = {}) {
  const repairedSeed = repairProjectSeedGaps(seed, options.idea || seed.raw_idea || '')
  const title = firstSeedText(options.title, repairedSeed.title, repairedSeed.logline, '未命名小说').slice(0, 64)
  const seedForProject = attachProjectSeedDirector({
    ...repairedSeed,
    title,
    raw_idea: options.idea || repairedSeed.raw_idea || '',
    derived_at: repairedSeed.derived_at || new Date().toISOString(),
  })
  const project = await createNovelProject(activeWorkspace, {
    title,
    genre: repairedSeed.genre || '',
    sub_genres: asSeedArray(repairedSeed.sub_genres),
    length_target: repairedSeed.length_target || 'medium',
    target_audience: repairedSeed.target_audience || '',
    style_tags: asSeedArray(repairedSeed.style_tags),
    commercial_tags: asSeedArray(repairedSeed.commercial_tags),
    synopsis: repairedSeed.synopsis || repairedSeed.logline || repairedSeed.core_premise || '',
    status: 'draft',
    reference_config: {
      project_seed: seedForProject,
      writing_bible: repairedSeed.writing_bible || {},
      commercial_positioning: {
        ...(repairedSeed.commercial_positioning || {}),
        reader_promise: repairedSeed.commercial_positioning?.reader_promise || repairedSeed.logline || repairedSeed.synopsis || '',
        selling_points: asSeedArray(repairedSeed.commercial_positioning?.selling_points).length
          ? asSeedArray(repairedSeed.commercial_positioning?.selling_points)
          : asSeedArray(repairedSeed.commercial_tags),
        seed: true,
      },
    },
  })
  const materialized = await materializeProjectSeed(activeWorkspace, project, seedForProject)
  return { project: materialized.project || project, seed: seedForProject, created: materialized.created }
}


export async function fillProjectSeedGapsWithModel(
  activeWorkspace: string,
  seed: any,
  idea: string,
  modelId: string,
  requestedTitle = '',
  risks: string[] = [],
  gapHints: string[] = [],
) {
  const baseSeed = parseNestedSeed(seed)
  const gaps = listProjectSeedGapTargets(baseSeed, [...risks, ...gapHints])
  if (!gaps.length) {
    return {
      seed: attachProjectSeedDirector(baseSeed),
      filled: [] as string[],
      skipped: [] as string[],
      gaps,
      result: null as any,
      seed_diagnostics: {
        ...buildProjectSeedDiagnostics(baseSeed, idea, null),
        status: 'no_gaps',
        suggestion: '未检测到可补缺口，已保留当前种子。',
      },
    }
  }
  const prompt = buildProjectSeedFillGapsPrompt({
    seed: baseSeed,
    idea,
    title: requestedTitle || baseSeed.title || '',
    gaps,
    risks: [...risks, ...gapHints],
  })
  const projectStub = {
    id: 0,
    title: requestedTitle || baseSeed.title || '项目种子补缺口',
    genre: baseSeed.genre || '',
    sub_genres: baseSeed.sub_genres || [],
    synopsis: baseSeed.synopsis || idea.slice(0, 500),
    length_target: baseSeed.length_target || 'medium',
    target_audience: baseSeed.target_audience || '',
    style_tags: baseSeed.style_tags || [],
    commercial_tags: baseSeed.commercial_tags || [],
    reference_config: {},
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const result = await executeNovelAgent('outline-agent', projectStub as any, { task: prompt, authoritativeTask: true }, {
    activeWorkspace,
    modelId,
    maxTokens: 7000,
    temperature: 0.34,
    skipMemory: true,
    responseMode: 'non_stream',
  })
  // Even if model fails, continue to local deterministic fill below with empty model patch.
  const modelFailed = Boolean((result as any)?.error)
  // Robust extract: output may be string/empty object; content may hold JSON.
  const payloadCandidates = [
    (result as any)?.parsed,
    (result as any)?.output,
    (result as any)?.content,
    result,
  ]
  let rawPatch: Record<string, any> = {}
  for (const candidate of payloadCandidates) {
    const extracted = extractFillGapsPatch(candidate)
    if (extracted && Object.keys(extracted).length) {
      rawPatch = extracted
      break
    }
  }
  // Build a narrow patch only. Do NOT full-normalize against the whole seed,
  // or fields like character_pool / first30_plan can be dropped.
  const modelPatch: Record<string, any> = {}
  for (const key of [
    'writing_bible',
    'commercial_positioning',
    'worldbuilding',
    'plot_engine',
    'protagonist',
    'antagonist',
    'characters',
    'character_pool',
    'reader_promise',
    'core_selling_point',
    'opening_hook',
    'mainline_goal',
    'long_term_conflict',
    'growth_engine',
    'target_audience',
    'foreshadowing_plan',
  ]) {
    if (rawPatch[key] !== undefined) modelPatch[key] = rawPatch[key]
  }
  // nested convenience: allow top-level contract objects
  if (!modelPatch.writing_bible) {
    const bibleKeys = [
      'target_reader_contract',
      'opening_strategy_contract',
      'reader_retention_contract',
      'story_power_contract',
      'core_contract_radar',
      'character_design_contract',
      'longform_structure_contract',
      'plot_special_topics_contract',
      'genre_positioning_contract',
      'mainline_definition_contract',
    ]
    const nested: Record<string, any> = {}
    for (const key of bibleKeys) {
      if (rawPatch[key] !== undefined) nested[key] = rawPatch[key]
    }
    if (Object.keys(nested).length) modelPatch.writing_bible = nested
  }
  // Never accept outline rewrites from fill-gaps unless foreshadowing was empty.
  delete modelPatch.chapter_outlines
  delete modelPatch.volume_outlines
  delete modelPatch.title
  delete modelPatch.genre
  if (asSeedArray(baseSeed.foreshadowing_plan).length) delete modelPatch.foreshadowing_plan

  const merged = mergeSeedPreferRicher(baseSeed, modelPatch)
  const filled = Array.from(new Set([...(merged.filled || [])]))
  const skipped = Array.from(new Set([...(merged.skipped || [])]))

  let nextSeed = repairProjectSeedGaps(merged.seed, idea)
  nextSeed = {
    ...nextSeed,
    // hard preserve protected fields
    title: firstSeedText(baseSeed.title, nextSeed.title),
    genre: firstSeedText(baseSeed.genre, nextSeed.genre),
    chapter_outlines: asSeedArray(baseSeed.chapter_outlines).length ? baseSeed.chapter_outlines : nextSeed.chapter_outlines,
    volume_outlines: asSeedArray(baseSeed.volume_outlines).length ? baseSeed.volume_outlines : nextSeed.volume_outlines,
    foreshadowing_plan: asSeedArray(baseSeed.foreshadowing_plan).length
      ? baseSeed.foreshadowing_plan
      : nextSeed.foreshadowing_plan,
    character_pool: nextSeed.character_pool || baseSeed.character_pool,
    raw_idea: baseSeed.raw_idea || idea,
  }
  nextSeed = attachProjectSeedDirector(nextSeed)
  const remaining = listProjectSeedGapTargets(nextSeed, [...risks, ...gapHints])
  const modelPatchKeys = Object.keys(modelPatch)
  const diagnostics = {
    ...buildProjectSeedDiagnostics(nextSeed, idea, result),
    status: remaining.length ? (filled.length ? 'gaps_partially_filled' : 'gaps_unchanged') : 'gaps_filled',
    usable: true,
    filled_fields: filled,
    skipped_fields: skipped,
    requested_gaps: gaps,
    remaining_gaps: remaining,
    model_patch_keys: modelPatchKeys,
    model_patch_empty: modelPatchKeys.length === 0,
    raw_preview: resultContentPreview(result).slice(0, 1200),
    model_error: modelFailed ? String((result as any)?.error || '').slice(0, 300) : '',
    suggestion: !filled.length
      ? (
          modelFailed
            ? `模型调用失败：${String((result as any)?.error || '').slice(0, 120)}。已完整保留原种子，可换模型后重试补齐。`
            : modelPatchKeys.length === 0
              ? '模型未返回可解析补丁，已完整保留原种子。可重试补齐或换更强模型。'
              : '模型补丁未优于现有内容，已保留原种子。'
        )
      : remaining.length
        ? `已用模型安全补齐 ${filled.length} 项，仍有 ${remaining.length} 项可继续补。原有优质内容已保留。`
        : `已用模型安全补齐缺口（${filled.length} 项），未覆盖已有优质内容。`,
  }
  nextSeed = attachProjectSeedDirector({ ...nextSeed, seed_diagnostics: diagnostics })
  return {
    seed: nextSeed,
    filled,
    skipped,
    gaps,
    remaining,
    result,
    seed_diagnostics: diagnostics,
  }
}
