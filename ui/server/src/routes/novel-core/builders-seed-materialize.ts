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

import {
  asSeedArray,
  attachProjectSeedDirector,
  chapterTitleLooksStructural,
  cleanSeedCharacterName,
  compactSeedText,
  fallbackChapterDisplayTitle,
  firstSeedText,
  parseNestedSeed,
  repairProjectSeedGaps,
  uniqueSeedTexts,
} from './builders-seed-outline'

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


