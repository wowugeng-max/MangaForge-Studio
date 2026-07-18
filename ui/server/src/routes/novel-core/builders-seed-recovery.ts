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
} from './builders-seed-outline'

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

