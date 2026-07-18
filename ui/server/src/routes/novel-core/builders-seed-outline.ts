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



export function asSeedArray(value: any) {
  return Array.isArray(value) ? value : []
}

function firstSeedArray(...values: any[]) {
  return values.find(Array.isArray) || []
}

export function firstSeedText(...values: any[]) {
  return values.map(value => String(value || '').trim()).find(Boolean) || ''
}

export function inferSeedGenre(text: string) {
  const raw = String(text || '')
  if (/修仙|仙门|仙道|天尊|长生|古神|外神|神祇|王朝|皇子/.test(raw)) return '仙侠'
  if (/异能|灵气|武魂|斗气|神魔|玄幻/.test(raw)) return '玄幻'
  if (/都市|公司|学校|职场/.test(raw)) return '都市'
  if (/末世|丧尸|灾变/.test(raw)) return '末世'
  if (/星际|飞船|AI|人工智能|科幻/.test(raw)) return '科幻'
  if (/悬疑|推理|凶案|诡案/.test(raw)) return '悬疑'
  return ''
}

export function parseNestedSeed(value: any): any {
  if (typeof value === 'string') return parseJsonLikePayload(value) || {}
  if (value && typeof value === 'object') return value
  return {}
}

export function normalizeLengthTarget(value: any) {
  const raw = String(value || '').trim()
  return ['short', 'medium', 'long', 'epic'].includes(raw) ? raw : ''
}

export function describeLengthTarget(lengthTarget: string) {
  switch (normalizeLengthTarget(lengthTarget)) {
    case 'short':
      return '用户指定篇幅：short。按短篇/小体量项目孵化，聚焦单一核心冲突、少量关键人物和1个主副本/主事件；不要强行扩展为多卷长篇，chapter_outlines 可按10-20章规划。'
    case 'medium':
      return '用户指定篇幅：medium。按20-80万字中篇孵化，保留清晰主线、2-3个阶段目标和可完整收束的副本/事件链，chapter_outlines 至少30章。'
    case 'long':
      return '用户指定篇幅：long。按80-300万字长篇连载孵化，必须设计3-5个分卷、长期冲突引擎、成长体系、反派阶梯和前30章追读节奏。'
    case 'epic':
      return '用户指定篇幅：epic。按300万字以上超长篇连载孵化，必须设计5卷以上长线结构、可扩展人物/势力/地图资产池、长期追读钩子、100章以后方向和主线升级阶梯。'
    default:
      return '用户指定篇幅：medium。按20-80万字中篇孵化；如果用户想法明显更适合短篇或长篇，可在 open_questions 中提示确认。'
  }
}

function hasObjectText(value: any, keys: string[]) {
  const record = parseNestedSeed(value)
  return keys.some(key => firstSeedText(record[key]))
}

export function compactSeedText(value: any, maxLength = 240) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength)
}

export function uniqueSeedTexts(values: any[], limit = 8) {
  const seen = new Set<string>()
  const output: string[] = []
  values
    .flatMap(value => {
      if (!value) return []
      if (typeof value === 'string') return value.split(/\r?\n/)
      if (typeof value === 'object') return [safeJsonStringify(value, undefined, 0)]
      return [String(value)]
    })
    .map(value => compactSeedText(value, 260))
    .filter(Boolean)
    .forEach(value => {
      if (seen.has(value) || output.length >= limit) return
      seen.add(value)
      output.push(value)
    })
  return output
}

export function seedFieldMissing(seed: any) {
  const root = parseNestedSeed(seed)
  const missing: string[] = []
  if (!firstSeedText(root.synopsis, root.project_summary, root.summary)) missing.push('synopsis')
  if (!firstSeedText(root.logline, root.hook)) missing.push('logline')
  if (!firstSeedText(root.core_premise, root.premise, root.setting)) missing.push('core_premise')
  if (!firstSeedText(root.main_conflict, root.conflict)) missing.push('main_conflict')
  if (!hasObjectText(root.protagonist, ['name', 'identity', 'goal', 'power_or_cheat'])
    && !asSeedArray(root.characters).some(character => hasObjectText(character, ['name', 'identity', 'role_type', 'goal', 'summary']))) {
    missing.push('protagonist')
  }
  if (!hasObjectText(root.worldbuilding, ['world_summary', 'summary', 'power_system', 'rules'])) missing.push('worldbuilding')
  if (!asSeedArray(root.volume_outlines).length) missing.push('volume_outlines')
  if (!asSeedArray(root.chapter_outlines).length) missing.push('chapter_outlines')
  return missing
}

export function resultContentPreview(result: any) {
  return compactSeedText(
    resultContentText(result),
    3000,
  )
}

export function resultContentText(result: any) {
  if (!result) return ''
  return String(
    result?.content
    || (typeof result?.output === 'string' ? result.output : '')
    || extractLLMText(result)
    || result?.raw?.choices?.[0]?.message?.content
    || result?.raw?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text).filter(Boolean).join('\n')
    || '',
  )
}

const INVALID_SEED_CHARACTER_NAMES = new Set([
  '怎么',
  '如何',
  '什么',
  '为何',
  '为什么',
  '哪里',
  '哪个',
  '这些',
  '已有',
  '根据',
  '主角',
  '反派',
  '阶段对手',
  '竞争者',
  '反派/竞争者',
])

export function cleanSeedCharacterName(value: any) {
  const raw = firstSeedText(value).trim()
  if (!raw || INVALID_SEED_CHARACTER_NAMES.has(raw)) return ''
  if (/^(怎么|如何|什么|为何|为什么|哪里|哪个)/.test(raw)) return ''
  return raw
}

export function inferSeedCharacterName(text: string) {
  const match = String(text || '').match(/([一-龥]{2,4})(?:靠|在|从|因|发现|望|说|必须|要|与|和|被|将|进入|来到)/)
  return cleanSeedCharacterName(match?.[1] || '')
}

function extractBalancedJsonValue(raw: string, key: string) {
  const match = new RegExp(`["']?${key}["']?\\s*:`, 'i').exec(raw)
  if (!match) return null
  let cursor = match.index + match[0].length
  while (cursor < raw.length && /\s/.test(raw[cursor])) cursor += 1
  const opener = raw[cursor]
  const closer = opener === '{' ? '}' : opener === '[' ? ']' : opener
  if (!['{', '[', '"'].includes(opener)) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = cursor; index < raw.length; index += 1) {
    const char = raw[index]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === '"') {
        inString = false
        if (opener === '"' && depth === 0) return raw.slice(cursor, index + 1)
      }
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === opener && opener !== '"') depth += 1
    if (char === closer && opener !== '"') {
      depth -= 1
      if (depth === 0) return raw.slice(cursor, index + 1)
    }
  }
  return null
}

function extractJsonProperty(raw: string, key: string) {
  const value = extractBalancedJsonValue(raw, key)
  if (!value) return undefined
  try {
    return JSON.parse(value)
  } catch {
    return parseJsonLikePayload(value) ?? undefined
  }
}

export function extractProjectSeedFactsFromText(rawText: string) {
  const raw = String(rawText || '').trim()
  if (!raw) return {}
  const parsed = parseJsonLikePayload(raw) || parseJsonLikePayload(`{${raw}}`)
  const facts = parseNestedSeed(parsed)
  const extracted: any = Object.keys(facts).length ? { ...facts } : {}
  for (const key of [
    'protagonist',
    'antagonist',
    'worldbuilding',
    'plot_engine',
    'writing_bible',
    'master_outline',
    'commercial_positioning',
  ]) {
    if (!extracted[key]) {
      const value = extractJsonProperty(raw, key)
      if (value !== undefined) extracted[key] = value
    }
  }
  for (const key of [
    'characters',
    'volume_outlines',
    'chapter_outlines',
    'foreshadowing_plan',
    'open_questions',
    'next_steps',
  ]) {
    if (!Array.isArray(extracted[key])) {
      const value = extractJsonProperty(raw, key)
      if (Array.isArray(value)) extracted[key] = value
    }
  }
  return extracted
}

function seedOutlineLooksTemplate(value: any, kind: 'volume' | 'chapter') {
  const record = parseNestedSeed(value)
  const textValue = compactSeedText([
    record.title,
    record.name,
    record.summary,
    record.goal,
    record.chapter_goal,
  ].join(' '), 500)
  if (!textValue) return false
  if (/开篇承诺验证|第\d+阶段长线扩容/.test(textValue)) return true
  if (/开局规则验证|第一敌手入局|地图与势力扩容|核心秘密反噬|大荒主线开门/.test(textValue)) return true
  if (/异象开端|第\d+章压力升级/.test(textValue)) return true
  if (/主角在已有线索基础上|围绕.+继续扩展地图/.test(textValue)) return true
  if (kind === 'chapter' && chapterTitleLooksStructural(record.title || record.name)) return true
  return kind === 'chapter' && /主角接触.+第一条异常规则/.test(textValue)
}

const STRUCTURAL_CHAPTER_TITLES = new Set([
  '异象开端',
  '旧识断口',
  '第一条规则',
  '首次反击',
  '公开破局',
  '第一场败仗',
  '楚影照面',
  '逼问真相',
  '反向设局',
  '伏笔回收',
  '镇外大火',
  '首卷决战',
  '更大地图',
  '大荒开门',
])

const SHANHAI_FALLBACK_CHAPTER_TITLES = [
  '蛾虫入药',
  '旧经生疑',
  '药性初验',
  '药铺夜问',
  '伏藏试蛾',
  '小镇追索',
  '禁忌反噬',
  '残篇显影',
  '镇中反击',
  '镇门封锁',
  '山路截杀',
  '缺页交易',
  '临时盟约',
  '旧案翻面',
  '宗门试探',
  '代价失控',
  '假线入局',
  '残篇争夺',
  '众目破局',
  '第一败',
  '夜入禁地',
  '双规互噬',
  '首敌照面',
  '残篇口供',
  '药铺反局',
  '蛾虫旧债',
  '镇外火线',
  '剑烛照荒台',
  '荒门债契',
  '门后异文',
]

const GENERIC_FALLBACK_CHAPTER_TITLES = [
  '异常入局',
  '旧法失准',
  '初次验证',
  '夜半问答',
  '低险试验',
  '追索入城',
  '代价显形',
  '核心线索',
  '第一次反击',
  '封锁危局',
  '路上截杀',
  '暗线交易',
  '临时盟约',
  '旧案翻面',
  '高层试探',
  '副作用失控',
  '假线入局',
  '核心争夺',
  '众目破局',
  '第一败',
  '夜入禁地',
  '规则互噬',
  '敌手现身',
  '真相口供',
  '反局落子',
  '旧线回响',
  '城外火线',
  '阶段决局',
  '新图债契',
  '门后答案',
]

export function chapterTitleLooksStructural(value: any) {
  const title = firstSeedText(value)
  return Boolean(title && (STRUCTURAL_CHAPTER_TITLES.has(title) || /^第\d+章压力升级$/.test(title)))
}

export function fallbackChapterDisplayTitle(
  beatTitle: any,
  index: number,
  title: string,
  protagonistName: string,
  summary = '',
  contextText = '',
) {
  const context = `${title} ${protagonistName} ${summary} ${contextText}`
  const titles = /山海|蛾虫|异兽|大荒|残篇|药铺|剑烛/.test(context)
    ? SHANHAI_FALLBACK_CHAPTER_TITLES
    : GENERIC_FALLBACK_CHAPTER_TITLES
  const fallback = titles[index] || `${compactSeedText(title, 8) || '主线'}第${index + 1}局`
  const explicit = firstSeedText(beatTitle)
  return chapterTitleLooksStructural(explicit) ? fallback : firstSeedText(explicit, fallback)
}

function preferSeedArray(primary: any, fallback: any, kind: 'volume' | 'chapter' | 'other') {
  const primaryArray = asSeedArray(primary)
  const fallbackArray = asSeedArray(fallback)
  if (!primaryArray.length) return fallbackArray
  if (fallbackArray.length && kind !== 'other' && primaryArray.every(item => seedOutlineLooksTemplate(item, kind))) {
    return fallbackArray
  }
  return primaryArray
}


const LOCAL_SCAFFOLD_CHAPTER_TITLES = new Set([
  ...STRUCTURAL_CHAPTER_TITLES,
  ...SHANHAI_FALLBACK_CHAPTER_TITLES,
  ...GENERIC_FALLBACK_CHAPTER_TITLES,
  '伏藏试验',
  '禁忌代价',
  '第一次反击',
  '药铺夜问',
  '残篇显影',
  '小镇追索',
])

const LOCAL_SCAFFOLD_SUMMARY_PATTERNS = [
  /在日常位置撞见第一条异常规则/,
  /试图按旧经验处理危机/,
  /完成第一次小规模验证/,
  /安全地点在夜里变成审问场/,
  /主动设计低风险试验/,
  /第一批追索者进入/,
  /开篇承诺验证/,
  /第\d+阶段长线扩容/,
  /根据已有线索建立可升级/,
]

export function projectSeedOutlinesLookLikeLocalScaffold(seed: any) {
  const root = parseNestedSeed(seed)
  const chapters = asSeedArray(root.chapter_outlines)
  const volumes = asSeedArray(root.volume_outlines)
  if (!chapters.length && !volumes.length) return true
  if (chapters.length) {
    const scaffoldHits = chapters.filter((item, index) => {
      const record = parseNestedSeed(item)
      const title = firstSeedText(record.title, record.name)
      const summary = firstSeedText(record.summary, record.chapter_goal, record.goal, record.conflict)
      if (title && LOCAL_SCAFFOLD_CHAPTER_TITLES.has(title)) return true
      if (seedOutlineLooksTemplate(record, 'chapter')) return true
      if (LOCAL_SCAFFOLD_SUMMARY_PATTERNS.some(pattern => pattern.test(summary))) return true
      // generic "第N章压力升级" / empty unique identity
      if (/^第\d+章$/.test(title) && !summary) return true
      return false
    }).length
    if (scaffoldHits / chapters.length >= 0.6) return true
  }
  if (volumes.length) {
    const volumeHits = volumes.filter(item => seedOutlineLooksTemplate(item, 'volume')).length
    if (volumeHits / volumes.length >= 0.6) return true
  }
  return false
}

export function projectSeedNeedsOutlineExpansion(seed: any) {
  const root = parseNestedSeed(seed)
  if (!hasUsableProjectSeed(root)) return true
  const chapters = asSeedArray(root.chapter_outlines)
  if (chapters.length < 8) return true
  return projectSeedOutlinesLookLikeLocalScaffold(root)
}

export function mergeRecoveredSeedPreferModelOutlines(recoveredSeed: any, expandedSeed: any) {
  const recovered = parseNestedSeed(recoveredSeed)
  const expanded = parseNestedSeed(expandedSeed)
  const expandedChapters = asSeedArray(expanded.chapter_outlines)
  const recoveredChapters = asSeedArray(recovered.chapter_outlines)
  const expandedVolumes = asSeedArray(expanded.volume_outlines)
  const recoveredVolumes = asSeedArray(recovered.volume_outlines)
  const preferExpandedChapters = expandedChapters.length > 0 && (
    !projectSeedOutlinesLookLikeLocalScaffold({ chapter_outlines: expandedChapters })
    || projectSeedOutlinesLookLikeLocalScaffold({ chapter_outlines: recoveredChapters })
  )
  const preferExpandedVolumes = expandedVolumes.length > 0 && (
    !projectSeedOutlinesLookLikeLocalScaffold({ volume_outlines: expandedVolumes, chapter_outlines: [] })
    || projectSeedOutlinesLookLikeLocalScaffold({ volume_outlines: recoveredVolumes, chapter_outlines: [] })
  )
  return {
    ...recovered,
    ...expanded,
    writing_bible: {
      ...parseNestedSeed(recovered.writing_bible),
      ...parseNestedSeed(expanded.writing_bible),
    },
    worldbuilding: {
      ...parseNestedSeed(recovered.worldbuilding),
      ...parseNestedSeed(expanded.worldbuilding),
    },
    plot_engine: {
      ...parseNestedSeed(recovered.plot_engine),
      ...parseNestedSeed(expanded.plot_engine),
    },
    commercial_positioning: {
      ...parseNestedSeed(recovered.commercial_positioning),
      ...parseNestedSeed(expanded.commercial_positioning),
    },
    character_pool: {
      ...parseNestedSeed(recovered.character_pool),
      ...parseNestedSeed(expanded.character_pool),
    },
    chapter_outlines: preferExpandedChapters ? expandedChapters : (expandedChapters.length ? expandedChapters : recoveredChapters),
    volume_outlines: preferExpandedVolumes ? expandedVolumes : (expandedVolumes.length ? expandedVolumes : recoveredVolumes),
    characters: asSeedArray(expanded.characters).length ? asSeedArray(expanded.characters) : asSeedArray(recovered.characters),
    foreshadowing_plan: asSeedArray(expanded.foreshadowing_plan).length ? asSeedArray(expanded.foreshadowing_plan) : asSeedArray(recovered.foreshadowing_plan),
  }
}

export function annotateOutlineScaffoldDiagnostics(seed: any, diagnostics: any = {}) {
  const scaffolded = projectSeedOutlinesLookLikeLocalScaffold(seed)
  return {
    ...parseNestedSeed(diagnostics),
    outlines_are_local_scaffold: scaffolded,
    suggestion: scaffolded
      ? (firstSeedText(diagnostics?.suggestion) || '当前分卷/细纲仍是本地兜底模板，尚未按你的创意差异化。请重新生成详细草稿，或手动改写分卷与前30章。')
      : diagnostics?.suggestion,
  }
}


const LOCAL_SCAFFOLD_FORESHADOWING_NAMES = new Set([
  '异兽/规则异常',
  '知识来源破绽',
  '规则代价',
  '禁忌边界',
  '反派旧识',
  '第一位见证者',
  '残缺地图/残篇',
  '错误答案',
  '爽点债务',
  '全书级谜面',
])

function foreshadowingLooksLikeLocalScaffold(item: any) {
  const record = parseNestedSeed(item)
  if (record.scaffold || record.source === 'local_scaffold' || record.source === 'auto_gap_repair' || record.source === 'deep_draft_review') {
    const name = firstSeedText(record.name, record.title)
    if (!name || LOCAL_SCAFFOLD_FORESHADOWING_NAMES.has(name)) return true
    // deep_draft_review lines that are just the fixed short labels
    if (LOCAL_SCAFFOLD_FORESHADOWING_NAMES.has(name.split(/[｜|]/)[0].trim())) return true
  }
  const name = firstSeedText(record.name, record.title)
  if (name && LOCAL_SCAFFOLD_FORESHADOWING_NAMES.has(name)) {
    const description = firstSeedText(record.description, record.surface, record.true_meaning)
    if (!description || /并不完全符合常识|此世不该知道|轻微反噬|不能触碰的禁忌|残篇、前史|不完整地图/.test(description)) return true
  }
  if (typeof item === 'string') {
    const line = firstSeedText(item)
    const head = line.split(/[｜|]/)[0].trim()
    if (LOCAL_SCAFFOLD_FORESHADOWING_NAMES.has(head)) return true
  }
  return false
}

function chapterLooksLikeLocalScaffold(item: any) {
  const record = parseNestedSeed(item)
  // 模型刚生成的细纲不要被模板指纹误杀
  if (record.source === 'model' && record.scaffold !== true) return false
  if (record.scaffold || record.source === 'local_scaffold') return true
  const title = firstSeedText(record.title, record.name)
  const summary = firstSeedText(record.summary, record.chapter_goal, record.goal, record.conflict)
  if (LOCAL_SCAFFOLD_SUMMARY_PATTERNS.some(pattern => pattern.test(summary))) return true
  // 仅标题命中模板词表不够；必须同时像结构模板或摘要空洞
  if (title && LOCAL_SCAFFOLD_CHAPTER_TITLES.has(title)) {
    if (seedOutlineLooksTemplate(record, 'chapter')) return true
    if (!summary || summary.length < 12) return true
    if (/规则验证|阶段冲突|已有线索|本地兜底|模板/.test(summary)) return true
  }
  if (seedOutlineLooksTemplate(record, 'chapter') && (!summary || /压力升级|开篇承诺验证/.test(summary + title))) return true
  return false
}

export function stripLocalScaffoldOutlines(seed: any) {
  const root = parseNestedSeed(seed)
  const rawChapters = asSeedArray(root.chapter_outlines)
  const chapters = rawChapters.filter(item => !chapterLooksLikeLocalScaffold(item) && firstSeedText(parseNestedSeed(item).title, parseNestedSeed(item).summary, parseNestedSeed(item).chapter_goal))
  // 如果绝大多数都是模板，整组丢弃，避免“半模板半真”污染审阅台
  const finalChapters = rawChapters.length && chapters.length / rawChapters.length < 0.4 ? [] : chapters
  const rawVolumes = asSeedArray(root.volume_outlines)
  const volumes = rawVolumes.filter(item => {
    const record = parseNestedSeed(item)
    if (record.source === 'model' && record.scaffold !== true) return true
    if (record.scaffold || record.source === 'local_scaffold') return false
    return !seedOutlineLooksTemplate(record, 'volume')
  })
  const finalVolumes = rawVolumes.length && volumes.length / rawVolumes.length < 0.4 ? [] : volumes
  const rawForeshadowing = asSeedArray(root.foreshadowing_plan)
  const foreshadowing = rawForeshadowing.filter(item => !foreshadowingLooksLikeLocalScaffold(item))
  const finalForeshadowing = rawForeshadowing.length && foreshadowing.length / rawForeshadowing.length < 0.4 ? [] : foreshadowing
  return {
    ...root,
    chapter_outlines: finalChapters,
    volume_outlines: finalVolumes,
    foreshadowing_plan: finalForeshadowing,
  }
}

function requiredFirst30ChapterCount(lengthTarget: string) {
  switch (normalizeLengthTarget(lengthTarget)) {
    case 'short':
      return 12
    case 'epic':
    case 'long':
    case 'medium':
    default:
      return 30
  }
}

export function buildProjectSeedFirst30OutlinePrompt(seed: any, idea = '', requestedTitle = '', lengthTarget = 'medium') {
  const root = stripLocalScaffoldOutlines(seed)
  const count = requiredFirst30ChapterCount(lengthTarget)
  const storyCard = {
    title: firstSeedText(requestedTitle, root.title),
    genre: root.genre,
    sub_genres: root.sub_genres,
    logline: root.logline,
    synopsis: root.synopsis,
    core_premise: root.core_premise,
    main_conflict: root.main_conflict,
    protagonist: root.protagonist,
    antagonist: root.antagonist,
    characters: asSeedArray(root.characters).slice(0, 12),
    character_pool: root.character_pool,
    worldbuilding: root.worldbuilding,
    plot_engine: root.plot_engine,
    commercial_positioning: root.commercial_positioning,
    writing_bible: root.writing_bible,
    existing_volume_outlines: asSeedArray(root.volume_outlines).slice(0, 8),
    existing_chapter_outlines: asSeedArray(root.chapter_outlines).slice(0, 8),
  }
  return [
    '任务：只为当前小说项目生成“分卷大纲 + 前N章细纲”。只输出 JSON object，不要 Markdown，不要解释。',
    requestedTitle ? `作品名：${requestedTitle}` : '',
    describeLengthTarget(lengthTarget),
    '',
    '【用户原始想法】',
    String(idea || root.raw_idea || '').slice(0, 8000),
    '',
    '【已确定的项目骨架（不要推翻主角名/核心因果/金手指限制）】',
    safeJsonStringify(storyCard, 2, 18000),
    '',
    '输出字段：',
    `{`,
    `  "volume_outlines": [ { "title","goal","summary","hook","chapter_count" } ],`,
    `  "chapter_outlines": [ { "chapter_no","title","summary","conflict","ending_hook","must_advance","forbidden_repeats" } ],`,
    `  "first30_plan": { "chapters_1_3","chapters_4_10","chapters_11_30" }`,
    `}`,
    '',
    '硬性要求：',
    `1. 本轮优先完整输出 volume_outlines + chapter_outlines；chapter_outlines 必须覆盖第1-${count}章，chapter_no 从 1 连续递增。`,
    '2. 每一章标题、summary、conflict、ending_hook 必须只属于本故事，禁止通用模板章名（如：异常入局、旧法失准、药铺夜问、开局规则验证、第N章压力升级）。',
    '3. 1-3章兑现开篇承诺；4-10章完成试读闭环；11-30章抬高赌注并蓄势付费点（短篇按对应章数压缩）。',
    '4. 章与章必须因果递进：上一章 ending_hook 要能自然接下一章。',
    '5. volume_outlines 至少按篇幅给出完整分卷方向，标题与摘要不得套用“开局规则验证/第一敌手入局”等本地模板。',
    '6. 本轮不要输出 foreshadowing_plan（伏笔会另一次调用生成）。',
    '7. 不要生成正文；输出必须是可解析 JSON。',
  ].filter(Boolean).join('\n')
}


export function extractOutlineFieldsFromModelPayload(payload: any) {
  const root = parseNestedSeed(payload)
  const bags = [
    root,
    parseNestedSeed(root.data),
    parseNestedSeed(root.result),
    parseNestedSeed(root.output),
    parseNestedSeed(root.seed),
    parseNestedSeed(root.project_seed),
    parseNestedSeed(root.outline),
    parseNestedSeed(root.outlines),
    parseNestedSeed(root.master_outline),
    parseNestedSeed(root.project),
  ]
  let chapter_outlines: any[] = []
  let volume_outlines: any[] = []
  let foreshadowing_plan: any[] = []
  let first30_plan: any = {}
  for (const bag of bags) {
    if (!bag || typeof bag !== 'object') continue
    const chapters = firstSeedArray(
      bag.chapter_outlines,
      bag.chapters,
      bag.first_30_chapters,
      bag.first30_chapters,
      bag.detail_chapters,
    )
    const volumes = firstSeedArray(bag.volume_outlines, bag.volumes, bag.volumeOutlines)
    const foreshadowing = asSeedArray(bag.foreshadowing_plan).length
      ? asSeedArray(bag.foreshadowing_plan)
      : asSeedArray(bag.foreshadowing)
    const plan = parseNestedSeed(bag.first30_plan || bag.first_30_plan)
    if (chapters.length && chapters.length >= chapter_outlines.length) chapter_outlines = chapters
    if (volumes.length && volumes.length >= volume_outlines.length) volume_outlines = volumes
    if (foreshadowing.length && foreshadowing.length >= foreshadowing_plan.length) foreshadowing_plan = foreshadowing
    if (Object.keys(plan).length) first30_plan = { ...first30_plan, ...plan }
  }

  const tryExtractFromText = (raw: string) => {
    if (!raw || typeof raw !== 'string') return
    const chapterProp = extractJsonProperty(raw, 'chapter_outlines') || extractJsonProperty(raw, 'chapters')
    const volumeProp = extractJsonProperty(raw, 'volume_outlines') || extractJsonProperty(raw, 'volumes')
    const foreshadowProp = extractJsonProperty(raw, 'foreshadowing_plan') || extractJsonProperty(raw, 'foreshadowing')
    const planProp = extractJsonProperty(raw, 'first30_plan') || extractJsonProperty(raw, 'first_30_plan')
    if (Array.isArray(chapterProp) && chapterProp.length > chapter_outlines.length) chapter_outlines = chapterProp
    if (Array.isArray(volumeProp) && volumeProp.length > volume_outlines.length) volume_outlines = volumeProp
    if (Array.isArray(foreshadowProp) && foreshadowProp.length > foreshadowing_plan.length) foreshadowing_plan = foreshadowProp
    const plan = parseNestedSeed(planProp)
    if (Object.keys(plan).length) first30_plan = { ...first30_plan, ...plan }
  }

  // 文本兜底：从 raw string / content 字段抽数组（截断 JSON 时 partial parse 常会丢数组）
  if (!chapter_outlines.length || !volume_outlines.length || !foreshadowing_plan.length) {
    if (typeof payload === 'string') tryExtractFromText(payload)
    if (root && typeof root === 'object') {
      tryExtractFromText(firstSeedText(root.raw_content, root.content, root.text, root.message))
      // 对象 stringify 后再抽一次，兼容嵌套奇怪但仍含字段的返回
      try {
        tryExtractFromText(JSON.stringify(root))
      } catch {
        // ignore
      }
    }
  }
  return { chapter_outlines, volume_outlines, foreshadowing_plan, first30_plan }
}

function buildProjectSeedChapterOutlineOnlyPrompt(seed: any, idea = '', requestedTitle = '', lengthTarget = 'medium', startNo = 1, endNo = 30) {
  const root = stripLocalScaffoldOutlines(seed)
  const storyCard = {
    title: firstSeedText(requestedTitle, root.title),
    genre: root.genre,
    logline: root.logline,
    synopsis: root.synopsis,
    main_conflict: root.main_conflict,
    protagonist: root.protagonist,
    antagonist: root.antagonist,
    worldbuilding: root.worldbuilding,
    plot_engine: root.plot_engine,
    volume_outlines: asSeedArray(root.volume_outlines).slice(0, 8),
  }
  return [
    `任务：只生成第${startNo}-${endNo}章 chapter_outlines。只输出 JSON object，不要 Markdown。`,
    requestedTitle ? `作品名：${requestedTitle}` : '',
    describeLengthTarget(lengthTarget),
    '',
    '【故事骨架】',
    safeJsonStringify(storyCard, 2, 14000),
    '',
    '【用户想法】',
    String(idea || root.raw_idea || '').slice(0, 6000),
    '',
    '输出：',
    `{ "chapter_outlines": [ { "chapter_no","title","summary","conflict","ending_hook","must_advance" } ] }`,
    '',
    `硬性要求：必须输出 chapter_no=${startNo} 到 ${endNo} 的连续章节；标题和摘要必须只属于本故事；禁止异常入局/药铺夜问/开局规则验证等模板章名；不要输出伏笔、分卷、正文。`,
  ].filter(Boolean).join('\n')
}


export function buildProjectSeedVolumeOutlineOnlyPrompt(seed: any, idea = '', requestedTitle = '', lengthTarget = 'medium') {
  const root = stripLocalScaffoldOutlines(seed)
  const minVolumes = normalizeLengthTarget(lengthTarget) === 'short' ? 2 : 3
  return [
    '任务：只为当前小说生成 volume_outlines。只输出 JSON object，不要 Markdown，不要解释。',
    requestedTitle || root.title ? `作品名：${firstSeedText(requestedTitle, root.title)}` : '',
    describeLengthTarget(lengthTarget),
    '',
    '【用户原始想法】',
    String(idea || root.raw_idea || '').slice(0, 6000),
    '',
    '【故事骨架】',
    safeJsonStringify({
      title: firstSeedText(requestedTitle, root.title),
      genre: root.genre,
      logline: root.logline,
      synopsis: root.synopsis,
      core_premise: root.core_premise,
      main_conflict: root.main_conflict,
      protagonist: root.protagonist,
      antagonist: root.antagonist,
      worldbuilding: root.worldbuilding,
      plot_engine: root.plot_engine,
      existing_chapter_outlines: asSeedArray(root.chapter_outlines).slice(0, 10),
    }, 2, 14000),
    '',
    '输出：',
    '{ "volume_outlines": [ { "title","goal","summary","hook","chapter_count" } ] }',
    '',
    '硬性要求：',
    `1. 至少 ${minVolumes} 卷，标题与摘要必须只属于本故事，禁止“开局规则验证 / 第一敌手入局 / 阶段决局”等本地模板卷名。`,
    '2. 每卷写清阶段目标、阶段冲突、本卷结尾钩子；chapter_count 合理。',
    '3. 本轮不要输出 chapter_outlines、foreshadowing_plan、正文。',
  ].filter(Boolean).join('\n')
}

async function generateProjectSeedFirst30OutlinesWithModel(
  activeWorkspace: string,
  seed: any,
  idea: string,
  modelId: string,
  requestedTitle = '',
  requestedLengthTarget = '',
  onProgress?: ProjectSeedProgressReporter,
) {
  const base = stripLocalScaffoldOutlines(seed)
  const lengthTarget = normalizeLengthTarget(requestedLengthTarget || base.length_target) || 'medium'
  const count = requiredFirst30ChapterCount(lengthTarget)
  const projectStub = {
    id: 0,
    title: requestedTitle || base.title || '前30章细纲生成',
    genre: base.genre || '',
    sub_genres: base.sub_genres || [],
    synopsis: base.synopsis || idea.slice(0, 500),
    length_target: lengthTarget,
    target_audience: base.target_audience || '',
    style_tags: base.style_tags || [],
    commercial_tags: base.commercial_tags || [],
    reference_config: {},
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const runOutlineAgent = async (prompt: string, maxTokens = 12000, temperature = 0.42) => {
    return executeNovelAgent('outline-agent', projectStub as any, {
      // 完整任务 prompt，禁止再套 buildOutlinePrompt（会重新塞回伏笔/总纲，挤掉分卷与章纲）
      task: prompt,
      authoritativeTask: true,
    }, {
      activeWorkspace,
      modelId,
      maxTokens,
      temperature,
      skipMemory: true,
      responseMode: 'non_stream',
    })
  }

  const payloadFromResult = (result: any) => {
    const content = resultContentText(result)
    const fromOutput = (result as any)?.output
    if (fromOutput && typeof fromOutput === 'object' && !Array.isArray(fromOutput)) return fromOutput
    return parseJsonLikePayload(fromOutput)
      || parseJsonLikePayload(content)
      || (typeof fromOutput === 'string' ? fromOutput : null)
      || content
      || {}
  }

  const normalizeChapters = (items: any[]) => asSeedArray(items)
    .map((item, index) => {
      const record = parseNestedSeed(item)
      return {
        ...record,
        chapter_no: Number(record.chapter_no || record.chapter_number || record.chapterNo || index + 1) || index + 1,
        title: firstSeedText(record.title, record.name),
        summary: firstSeedText(record.summary, record.chapter_goal, record.goal, record.synopsis),
        conflict: firstSeedText(record.conflict),
        ending_hook: firstSeedText(record.ending_hook, record.hook),
        must_advance: firstSeedText(record.must_advance, record.summary, record.chapter_goal),
        source: 'model',
        scaffold: false,
      }
    })
    .filter(item => firstSeedText(item.title, item.summary))
    .sort((a, b) => Number(a.chapter_no) - Number(b.chapter_no))

  const normalizeVolumes = (items: any[]) => asSeedArray(items)
    .map(item => ({ ...parseNestedSeed(item), source: 'model', scaffold: false }))
    .filter(item => firstSeedText(item.title, item.summary, item.goal))

  const normalizeForeshadowing = (items: any[]) => asSeedArray(items)
    .map(item => {
      if (typeof item === 'string') {
        return { name: firstSeedText(item), description: firstSeedText(item), source: 'model', scaffold: false }
      }
      const record = parseNestedSeed(item)
      return {
        ...record,
        name: firstSeedText(record.name, record.title),
        plant_at: firstSeedText(record.plant_at, record.plant_chapter, record.plant),
        payoff_at: firstSeedText(record.payoff_at, record.payoff_chapter, record.payoff),
        description: firstSeedText(record.description, record.surface, record.summary),
        true_meaning: firstSeedText(record.true_meaning, record.truth),
        source: 'model',
        scaffold: false,
      }
    })
    .filter(item => firstSeedText(item.name, item.description) && !foreshadowingLooksLikeLocalScaffold(item))

  const passNotes: string[] = []
  const passErrors: string[] = []

  // Pass A: 分卷 + 前N章细纲（不带伏笔，避免长输出互相挤掉）
  safeReportProjectSeedProgress(onProgress, {
    stage: 'outlines',
    status: 'running',
    progress: 0.3,
    detail: 'pass_a',
  })
  const outlinePrompt = buildProjectSeedFirst30OutlinePrompt(base, idea, requestedTitle || base.title, lengthTarget)
  let outlineResult: any = null
  try {
    outlineResult = await runOutlineAgent(outlinePrompt, 14000, 0.42)
    if ((outlineResult as any)?.error) passErrors.push(`pass_a:${String((outlineResult as any).error).slice(0, 240)}`)
  } catch (error: any) {
    passErrors.push(`pass_a_throw:${String(error?.message || error).slice(0, 240)}`)
    outlineResult = { error: String(error?.message || error), content: '' }
  }
  const outlineRaw = payloadFromResult(outlineResult)
  const outlineExtracted = extractOutlineFieldsFromModelPayload(outlineRaw)
  // 兼容 normalize 路径
  const outlineNormalized = normalizeProjectSeedPayload(outlineRaw, idea, lengthTarget)
  let modelChapters = normalizeChapters(
    outlineExtracted.chapter_outlines.length ? outlineExtracted.chapter_outlines : outlineNormalized.chapter_outlines,
  )
  let modelVolumes = normalizeVolumes(
    outlineExtracted.volume_outlines.length ? outlineExtracted.volume_outlines : outlineNormalized.volume_outlines,
  )
  let first30Plan = {
    ...parseNestedSeed(base.first30_plan),
    ...parseNestedSeed(outlineExtracted.first30_plan),
    ...parseNestedSeed(outlineNormalized.first30_plan),
  }
  passNotes.push(`pass_a chapters=${modelChapters.length} volumes=${modelVolumes.length}`)
  safeReportProjectSeedProgress(onProgress, {
    stage: 'outlines',
    status: 'running',
    progress: 0.45,
    detail: 'pass_a',
    outline_chapter_count: modelChapters.length,
    outline_volume_count: modelVolumes.length,
  })

  // Pass A2: 若章纲仍不足，拆段补生成（oh-story 细纲分步思路）
  if (modelChapters.length < Math.min(12, count)) {
    safeReportProjectSeedProgress(onProgress, {
      stage: 'outlines',
      status: 'running',
      progress: 0.5,
      detail: 'pass_a2',
      outline_chapter_count: modelChapters.length,
      outline_volume_count: modelVolumes.length,
    })
    const mid = Math.ceil(count / 2)
    try {
      const part1Result = await runOutlineAgent(
        buildProjectSeedChapterOutlineOnlyPrompt(base, idea, requestedTitle || base.title, lengthTarget, 1, mid),
        10000,
        0.4,
      )
      if ((part1Result as any)?.error) passErrors.push(`pass_a2_1:${String((part1Result as any).error).slice(0, 200)}`)
      const part1 = extractOutlineFieldsFromModelPayload(payloadFromResult(part1Result))
      const part1Chapters = normalizeChapters(part1.chapter_outlines)

      const part2Result = await runOutlineAgent(
        buildProjectSeedChapterOutlineOnlyPrompt(
          { ...base, chapter_outlines: part1Chapters, volume_outlines: modelVolumes },
          idea,
          requestedTitle || base.title,
          lengthTarget,
          mid + 1,
          count,
        ),
        10000,
        0.4,
      )
      if ((part2Result as any)?.error) passErrors.push(`pass_a2_2:${String((part2Result as any).error).slice(0, 200)}`)
      const part2 = extractOutlineFieldsFromModelPayload(payloadFromResult(part2Result))
      const part2Chapters = normalizeChapters(part2.chapter_outlines)
      const merged = [...part1Chapters, ...part2Chapters]
      if (merged.length > modelChapters.length) modelChapters = merged
      passNotes.push(`pass_a2 chapters=${modelChapters.length} (p1=${part1Chapters.length}, p2=${part2Chapters.length})`)
      safeReportProjectSeedProgress(onProgress, {
        stage: 'outlines',
        status: 'running',
        progress: 0.55,
        detail: 'pass_a2',
        outline_chapter_count: modelChapters.length,
        outline_volume_count: modelVolumes.length,
      })
    } catch (error: any) {
      passErrors.push(`pass_a2_throw:${String(error?.message || error).slice(0, 240)}`)
    }
  }

  // Pass A3: 分卷仍空时单独生成（不与 30 章挤同一响应）
  if (!modelVolumes.length) {
    safeReportProjectSeedProgress(onProgress, {
      stage: 'volumes',
      status: 'running',
      progress: 0.6,
      detail: 'pass_a3',
      outline_chapter_count: modelChapters.length,
      outline_volume_count: modelVolumes.length,
    })
    try {
      const volumeResult = await runOutlineAgent(
        buildProjectSeedVolumeOutlineOnlyPrompt(
          { ...base, chapter_outlines: modelChapters },
          idea,
          requestedTitle || base.title,
          lengthTarget,
        ),
        5000,
        0.4,
      )
      if ((volumeResult as any)?.error) passErrors.push(`pass_a3:${String((volumeResult as any).error).slice(0, 200)}`)
      const volumeExtracted = extractOutlineFieldsFromModelPayload(payloadFromResult(volumeResult))
      const volumeNormalized = normalizeProjectSeedPayload(payloadFromResult(volumeResult), idea, lengthTarget)
      const nextVolumes = normalizeVolumes(
        volumeExtracted.volume_outlines.length ? volumeExtracted.volume_outlines : volumeNormalized.volume_outlines,
      )
      if (nextVolumes.length) modelVolumes = nextVolumes
      passNotes.push(`pass_a3 volumes=${modelVolumes.length}`)
    } catch (error: any) {
      passErrors.push(`pass_a3_throw:${String(error?.message || error).slice(0, 240)}`)
    }
    const a3Status = resolvePassA3VolumeStageStatus(modelVolumes.length)
    safeReportProjectSeedProgress(onProgress, {
      stage: 'volumes',
      status: a3Status,
      progress: 0.65,
      detail: modelVolumes.length > 0 ? 'pass_a3' : 'pass_a3 volumes still empty',
      outline_chapter_count: modelChapters.length,
      outline_volume_count: modelVolumes.length,
    })
  }

  // Pass B: 伏笔单独生成（不挤占章纲 token）
  let modelForeshadowing = normalizeForeshadowing(asSeedArray(base.foreshadowing_plan))
  safeReportProjectSeedProgress(onProgress, {
    stage: 'foreshadowing',
    status: 'running',
    progress: 0.75,
    detail: 'pass_b',
    outline_chapter_count: modelChapters.length,
    outline_volume_count: modelVolumes.length,
    outline_foreshadowing_count: modelForeshadowing.length,
  })
  try {
    const foreshadowPrompt = [
      '任务：只为当前小说生成 foreshadowing_plan。只输出 JSON object。',
      `作品：${firstSeedText(requestedTitle, base.title)}`,
      '',
      '【故事骨架】',
      safeJsonStringify({
        title: firstSeedText(requestedTitle, base.title),
        logline: base.logline,
        synopsis: base.synopsis,
        protagonist: base.protagonist,
        antagonist: base.antagonist,
        worldbuilding: base.worldbuilding,
        volume_outlines: modelVolumes.slice(0, 6),
        chapter_outlines: modelChapters.slice(0, 12),
      }, 2, 12000),
      '',
      '输出：{ "foreshadowing_plan": [ { "name","plant_at","payoff_at","description","true_meaning" } ] }',
      '要求：至少 6 条；必须绑定本故事专有人物/规则/地点；禁止异兽/规则异常、知识来源破绽、规则代价、禁忌边界等模板伏笔名。',
      '本轮不要输出 volume_outlines、chapter_outlines、正文。',
    ].join('\n')
    const foreshadowResult = await runOutlineAgent(foreshadowPrompt, 5000, 0.4)
    if ((foreshadowResult as any)?.error) passErrors.push(`pass_b:${String((foreshadowResult as any).error).slice(0, 200)}`)
    const foreshadowExtracted = extractOutlineFieldsFromModelPayload(payloadFromResult(foreshadowResult))
    const nextForeshadowing = normalizeForeshadowing(foreshadowExtracted.foreshadowing_plan)
    if (nextForeshadowing.length) modelForeshadowing = nextForeshadowing
    passNotes.push(`pass_b foreshadowing=${modelForeshadowing.length}`)
    safeReportProjectSeedProgress(onProgress, {
      stage: 'foreshadowing',
      status: 'completed',
      progress: 0.85,
      detail: 'pass_b',
      outline_chapter_count: modelChapters.length,
      outline_volume_count: modelVolumes.length,
      outline_foreshadowing_count: modelForeshadowing.length,
    })
  } catch (error: any) {
    passErrors.push(`pass_b_throw:${String(error?.message || error).slice(0, 240)}`)
  }

  let nextSeed = {
    ...base,
    volume_outlines: modelVolumes.length ? modelVolumes : asSeedArray(base.volume_outlines),
    chapter_outlines: modelChapters.length ? modelChapters : [],
    foreshadowing_plan: modelForeshadowing.length ? modelForeshadowing : asSeedArray(base.foreshadowing_plan).filter(item => !foreshadowingLooksLikeLocalScaffold(item)),
    first30_plan: first30Plan,
  }
  // 只剥离明确本地模板，不误杀 source=model
  nextSeed = stripLocalScaffoldOutlines(nextSeed)
  nextSeed = repairProjectSeedGaps(nextSeed, idea)
  nextSeed = attachProjectSeedDirector(nextSeed)

  const chapterCount = asSeedArray(nextSeed.chapter_outlines).length
  const volumeCount = asSeedArray(nextSeed.volume_outlines).length
  const ok = chapterCount >= Math.min(8, count) && volumeCount > 0 && !projectSeedOutlinesLookLikeLocalScaffold(nextSeed)
  const diagnostics = annotateOutlineScaffoldDiagnostics(nextSeed, {
    ...buildProjectSeedDiagnostics(nextSeed, idea, outlineResult),
    status: ok ? 'outlines_generated_by_model' : 'needs_model_outline',
    usable: hasUsableProjectSeed(nextSeed),
    outlines_generated_by_model: ok,
    outline_chapter_count: chapterCount,
    outline_volume_count: volumeCount,
    outline_foreshadowing_count: asSeedArray(nextSeed.foreshadowing_plan).length,
    outline_raw_preview: resultContentPreview(outlineResult).slice(0, 1500),
    outline_pass_notes: passNotes,
    outline_pass_errors: passErrors,
    required_outline_chapter_count: count,
    recovery_strategy: 'dedicated_first30_outline_model_pass_split',
    suggestion: ok
      ? `已由模型生成分卷 ${volumeCount} 个、前30章细纲 ${chapterCount} 章。`
      : `模型细纲仍不足（当前章纲 ${chapterCount}/${count}，分卷 ${volumeCount}）。${passErrors.length ? `调用异常：${passErrors[0]}。` : ''}系统未使用本地模板填充。请重试或换更强模型。`,
  })
  return {
    seed: attachProjectSeedDirector({ ...nextSeed, seed_diagnostics: diagnostics }),
    result: outlineResult,
    seed_diagnostics: diagnostics,
    ok,
  }
}

export async function ensureProjectSeedModelOutlines(
  activeWorkspace: string,
  seed: any,
  idea: string,
  modelId: string | undefined,
  requestedTitle = '',
  requestedLengthTarget = '',
  previousResult: any = null,
  onProgress?: ProjectSeedProgressReporter,
) {
  let current = stripLocalScaffoldOutlines(seed)
  let diagnostics = annotateOutlineScaffoldDiagnostics(current, current.seed_diagnostics || buildProjectSeedDiagnostics(current, idea, previousResult))
  if (!projectSeedNeedsOutlineExpansion(current)) {
    return {
      seed: attachProjectSeedDirector({ ...current, seed_diagnostics: diagnostics }),
      result: previousResult,
      seed_diagnostics: diagnostics,
    }
  }
  if (!modelId) {
    diagnostics = annotateOutlineScaffoldDiagnostics(current, {
      ...diagnostics,
      status: 'needs_model_outline',
      suggestion: '缺少模型，无法生成前30章细纲。请选择模型后重新生成。',
    })
    return {
      seed: attachProjectSeedDirector({ ...current, chapter_outlines: [], volume_outlines: asSeedArray(current.volume_outlines), seed_diagnostics: diagnostics }),
      result: previousResult,
      seed_diagnostics: diagnostics,
    }
  }
  const generated = await generateProjectSeedFirst30OutlinesWithModel(
    activeWorkspace,
    current,
    idea,
    modelId,
    requestedTitle,
    requestedLengthTarget || current.length_target,
    onProgress,
  )
  return {
    seed: generated.seed,
    result: generated.result || previousResult,
    seed_diagnostics: generated.seed_diagnostics,
  }
}

export function mergeProjectSeedInput(primary: any, fallback: any) {
  const source = parseNestedSeed(primary)
  const extracted = parseNestedSeed(fallback)
  const sourceProtagonist = parseNestedSeed(source.protagonist)
  const extractedProtagonist = parseNestedSeed(extracted.protagonist)
  const sourceAntagonist = parseNestedSeed(source.antagonist)
  const extractedAntagonist = parseNestedSeed(extracted.antagonist)
  const sourceProtagonistName = firstSeedText(sourceProtagonist.name, sourceProtagonist.title)
  const sourceAntagonistName = firstSeedText(sourceAntagonist.name, sourceAntagonist.title)
  return {
    ...extracted,
    ...source,
    protagonist: sourceProtagonistName && !cleanSeedCharacterName(sourceProtagonistName) && cleanSeedCharacterName(firstSeedText(extractedProtagonist.name, extractedProtagonist.title))
      ? { ...sourceProtagonist, ...extractedProtagonist }
      : { ...extractedProtagonist, ...sourceProtagonist },
    antagonist: sourceAntagonistName && !cleanSeedCharacterName(sourceAntagonistName) && cleanSeedCharacterName(firstSeedText(extractedAntagonist.name, extractedAntagonist.title))
      ? { ...sourceAntagonist, ...extractedAntagonist }
      : { ...extractedAntagonist, ...sourceAntagonist },
    worldbuilding: { ...parseNestedSeed(extracted.worldbuilding), ...parseNestedSeed(source.worldbuilding) },
    plot_engine: { ...parseNestedSeed(extracted.plot_engine), ...parseNestedSeed(source.plot_engine) },
    master_outline: { ...parseNestedSeed(extracted.master_outline), ...parseNestedSeed(source.master_outline) },
    characters: preferSeedArray(source.characters, extracted.characters, 'other'),
    volume_outlines: preferSeedArray(source.volume_outlines, extracted.volume_outlines, 'volume'),
    chapter_outlines: preferSeedArray(source.chapter_outlines, extracted.chapter_outlines, 'chapter'),
    foreshadowing_plan: preferSeedArray(source.foreshadowing_plan, extracted.foreshadowing_plan, 'other'),
    open_questions: preferSeedArray(source.open_questions, extracted.open_questions, 'other'),
    raw_payload: {
      ...parseNestedSeed(source.raw_payload),
      ...extracted,
    },
  }
}

function fallbackVolumeCount(lengthTarget: string) {
  switch (normalizeLengthTarget(lengthTarget)) {
    case 'epic':
      return 5
    case 'long':
      return 4
    case 'short':
      return 1
    default:
      return 3
  }
}

function fallbackChapterCount(lengthTarget: string) {
  switch (normalizeLengthTarget(lengthTarget)) {
    case 'epic':
    case 'long':
      return 30
    case 'short':
      return 12
    default:
      return 20
  }
}

function buildFallbackVolumeOutlines(title: string, protagonistName: string, lengthTarget: string, pitch: string) {
  const count = fallbackVolumeCount(lengthTarget)
  const chapterCount = lengthTarget === 'epic' ? 60 : lengthTarget === 'long' ? 40 : 20
  return [
    {
      title: '开局规则验证',
      summary: `${protagonistName}在${title}的第一处高压现场验证核心规则，建立读者承诺、能力代价和第一批敌意。`,
      hook: pitch,
      chapter_count: chapterCount,
      source: 'local_scaffold',
      scaffold: true,
    },
    {
      title: '第一敌手入局',
      summary: `${protagonistName}带着开局收益离开安全区，遭遇更高层势力试探，核心线索从生存工具变成争夺目标。`,
      hook: `${protagonistName}发现第一阶段胜利只是更大规则的入口。`,
      chapter_count: chapterCount,
      source: 'local_scaffold',
      scaffold: true,
    },
    {
      title: '地图与势力扩容',
      summary: `故事从局部事件扩展到组织、地图和资源链，盟友、债务、禁忌与反派阶梯同时加压。`,
      hook: '旧规则在新地图失效，主角必须付出更高代价重新破局。',
      chapter_count: chapterCount,
      source: 'local_scaffold',
      scaffold: true,
    },
    {
      title: '核心秘密反噬',
      summary: `${protagonistName}接近${title}底层真相，早期收益开始反噬，人物关系和主线目标出现不可逆选择。`,
      hook: '主角得到答案，也暴露了真正的长线敌人。',
      chapter_count: chapterCount,
      source: 'local_scaffold',
      scaffold: true,
    },
    {
      title: '大荒主线开门',
      summary: `第一轮世界规则、敌人和资产池完成升级，故事打开更大地图，为百万字以后持续连载预留主线引擎。`,
      hook: '首卷答案引出全书级问题，主角必须主动进入更危险的棋局。',
      chapter_count: chapterCount,
      source: 'local_scaffold',
      scaffold: true,
    },
  ].slice(0, count)
}

function buildFallbackChapterOutlines(
  title: string,
  protagonistName: string,
  lengthTarget: string,
  mainConflict: string,
  pitch: string,
  diagnostics: any,
) {
  const retained = asSeedArray(diagnostics?.retained_fragments).slice(0, 3).join('、') || title
  const beats = [
    ['异象开端', `${protagonistName}在日常位置撞见第一条异常规则，${retained}从传闻变成可验证危机。`, mainConflict, '异常规则留下第二个未解口。'],
    ['旧识断口', `${protagonistName}试图按旧经验处理危机，却发现这个世界的常识与自己认知互相矛盾。`, '旧认知不能直接套用，新世界规则要求主角付出试错成本。', '旧答案指向一处更危险的证据。'],
    ['第一条规则', `${protagonistName}完成第一次小规模验证，得到收益，也暴露能力线索。`, '收益和暴露同时发生，主角必须决定藏拙还是继续追查。', '有人开始追踪主角的异常判断。'],
    ['药铺夜问', `安全地点在夜里变成审问场，${protagonistName}被迫解释线索来源。`, '主角需要保护秘密，又要说服关键人物暂时合作。', '对方提出一个无法回避的现场验证。'],
    ['伏藏试验', `${protagonistName}主动设计低风险试验，把碎片知识变成可重复使用的破局方法。`, '试验需要诱饵、时间和旁人信任，任何一步失败都会招来惩罚。', '试验结果比主角预想的更像禁术。'],
    ['小镇追索', `第一批追索者进入小镇，${protagonistName}的收益开始变成明面资源。`, '外部压力压缩主角的活动空间，迫使他做出第一次反击。', '追索者说出一个主角不该知道的名字。'],
    ['禁忌代价', `${protagonistName}发现使用规则会留下代价，早期爽点不再是免费能力。`, '继续使用能救人也会留下后患，放弃使用则会失去关键证据。', '代价在最不该出现的对象身上显形。'],
    ['残篇显影', `核心物品或线索第一次显形，把${title}的局部危机连到更大势力。`, '主角必须在公开抢夺前判断残篇真假。', '残篇背面出现反派势力印记。'],
    ['首次反击', `${protagonistName}不再被动逃避，利用已验证规则打出第一场有回报的反击。`, '反击会救下眼前人，也会让敌人确认主角价值。', '敌人没有退走，而是换了更高权限的人来。'],
    ['镇门危局', `危机从私下试探升级到公开封锁，主角的小世界第一次被外力挤压。`, '主角要同时保住身份、线索和身边人的安全。', '封锁令背后藏着一次诱捕。'],
    ['山路截杀', `${protagonistName}离开熟悉地点，第一场移动战暴露规则在野外的限制。`, '环境变化让旧方案失效，主角必须临场重组信息。', '截杀者带着主角熟悉却变形的知识。'],
    ['异兽交易', `主角把线索变成交易筹码，第一次接触更大的资源网络。`, '交易能换来破局资源，也会把主角挂上明面名单。', '交易对象交出一份故意缺页的资料。'],
    ['盟友入局', `潜在盟友因利益或旧案靠近${protagonistName}，关系从利用开始。`, '双方都不完全信任，却必须共同处理眼前危机。', '盟友知道主角秘密的一小部分。'],
    ['旧案翻面', `早期看似独立的异常事件翻出旧案，证明敌人的布局早已开始。`, '主角发现自己不是第一个验证规则的人。', '旧案幸存者留下反向警告。'],
    ['宗门试探', `更高层势力正式试探${protagonistName}，奖励、威胁和招揽同时出现。`, '主角要拿到入场资格，又不能交出核心秘密。', '试探结果被送到真正反派手里。'],
    ['代价失控', `主角连续使用规则导致副作用扩大，能力边界第一次压到人物关系。`, '继续推进会伤害身边人，停下则会错过追查窗口。', '副作用暴露了规则源头的一角。'],
    ['假线索', `敌人抛出一条看似吻合的线索，引诱${protagonistName}犯经验主义错误。`, '主角必须分辨证据、诱饵和自己的执念。', '假线索背后藏着真目标。'],
    ['残篇争夺', `多方势力围绕残篇正式碰撞，主角从旁观者变成争夺焦点。`, '主角没有绝对武力，只能用信息差制造局部优势。', '残篇选择了主角无法拒绝的开启方式。'],
    ['公开破局', `${protagonistName}在众目睽睽下完成一次破局，建立第一阶段名声。`, '名声带来保护，也带来更高层审视。', '有人当场指出主角知识来源不属于此世。'],
    ['第一场败仗', `敌人用更完整的规则压制主角，打碎他对金手指的过度自信。`, '主角必须承认现有知识不够，付出实质损失换逃生机会。', '失败留下一个可回收的反制缺口。'],
    ['夜入禁地', `主角带着失败教训潜入禁地，寻找能解释规则差异的证据。`, '禁地规则和主角记忆相似却不相同，错误判断会立刻致命。', '禁地深处有人提前等他。'],
    ['规则互咬', `两条规则在同一事件里互相冲突，${protagonistName}发现可以借冲突反杀。`, '借力会放大风险，也可能改变规则归属。', '反杀成功后，规则留下新的债务。'],
    ['敌手现身', `阶段敌手正面出现，明确其目标、方法和对主角的认知优势。`, '敌手掌握更多世界资源，主角只能守住关键秘密。', '敌手说出与主角前世记忆有关的词。'],
    ['逼问真相', `主角抓住一个敌方节点，第一次逼近残篇和世界真相的因果链。`, '逼问对象可能撒谎、反咬或主动求死。', '真相指向主角穿越并非偶然。'],
    ['反向设局', `${protagonistName}用前几章积累的线索反向布置一场局，准备夺回主动权。`, '设局需要牺牲一部分安全感，逼敌人按他的节奏行动。', '敌人踩局，却带来计划外变量。'],
    ['伏笔回收', `开篇留下的小线索第一次回收，证明主角不是靠巧合赢，而是靠规则理解。`, '回收能建立爽点，但也会把更深伏笔暴露出来。', '回收结果打开首卷决战入口。'],
    ['镇外大火', `敌人将冲突升级为不可隐藏的公共灾难，逼主角在秘密和救人之间选择。`, '主角必须公开一部分能力，换取保住核心人物。', '大火中出现不属于当前地图的力量。'],
    ['首卷决战', `${protagonistName}把信息差、盟友和规则代价压进第一场阶段决战。`, '胜利不能只靠力量，必须兑现前文承诺并解决阶段敌人。', '阶段敌人败退前交出更大敌人的坐标。'],
    ['更大地图', `决战后的小世界秩序改变，主角获得进入更大地图的资格和债务。`, '新资格不是奖励，而是被迫承担更危险的身份。', '新地图的第一条规则已经盯上主角。'],
    ['大荒开门', `前30章完成开局闭环，${protagonistName}带着秘密、盟友、敌意和代价进入长线主线。`, '主角必须主动选择继续深入，而不是被剧情推着走。', '真正的全书级问题在门后露出第一行字。'],
  ]
  return beats.slice(0, fallbackChapterCount(lengthTarget)).map(([beatTitle, summary, conflict, endingHook], index) => ({
    chapter_no: index + 1,
    title: fallbackChapterDisplayTitle(beatTitle, index, title, protagonistName, summary, `${retained} ${pitch}`),
    story_function: beatTitle,
    summary,
    conflict,
    ending_hook: endingHook,
    must_advance: index === 0 ? pitch : summary,
    forbidden_repeats: '不得重复上一章的信息揭示、震惊反应或单纯解释设定。',
    source: 'local_scaffold',
    scaffold: true,
  }))
}

function chapterAnchor(chapters: any[], index: number, fallbackNo: number) {
  const record = parseNestedSeed(chapters[index] || {})
  const chapterNo = Number(record.chapter_no || record.chapter_number || record.no || fallbackNo) || fallbackNo
  const title = firstSeedText(record.title, record.name)
  return title ? `第${chapterNo}章《${title}》` : `第${chapterNo}章`
}

function volumeAnchor(volumes: any[], index: number, fallbackName: string) {
  const record = parseNestedSeed(volumes[index] || {})
  return firstSeedText(record.title, record.name, fallbackName)
}

function buildFallbackForeshadowingPlan(seed: any, idea = '') {
  const root = parseNestedSeed(seed)
  const protagonist = parseNestedSeed(root.protagonist)
  const antagonist = parseNestedSeed(root.antagonist)
  const world = parseNestedSeed(root.worldbuilding)
  const chapters = asSeedArray(root.chapter_outlines)
  const volumes = asSeedArray(root.volume_outlines)
  const title = firstSeedText(root.title, root.logline, '本书')
  const protagonistName = firstSeedText(cleanSeedCharacterName(protagonist.name), cleanSeedCharacterName(protagonist.title), '主角')
  const antagonistName = firstSeedText(cleanSeedCharacterName(antagonist.name), cleanSeedCharacterName(antagonist.title), '阶段对手')
  const ruleName = firstSeedText(world.power_system, world.rules?.[0], root.core_premise, root.main_conflict, idea, `${title}核心规则`)
  const firstVolume = volumeAnchor(volumes, 0, '第一卷')
  const secondVolume = volumeAnchor(volumes, 1, '第二卷')
  const anchors = [
    chapterAnchor(chapters, 0, 1),
    chapterAnchor(chapters, 2, 3),
    chapterAnchor(chapters, 4, 5),
    chapterAnchor(chapters, 7, 8),
    chapterAnchor(chapters, 10, 11),
    chapterAnchor(chapters, 14, 15),
    chapterAnchor(chapters, 18, 19),
    chapterAnchor(chapters, 23, 24),
    chapterAnchor(chapters, 27, 28),
    chapterAnchor(chapters, 29, 30),
  ]
  const payoffAnchors = [
    chapterAnchor(chapters, 8, 9),
    chapterAnchor(chapters, 12, 13),
    chapterAnchor(chapters, 16, 17),
    chapterAnchor(chapters, 20, 21),
    chapterAnchor(chapters, 24, 25),
    chapterAnchor(chapters, 27, 28),
    chapterAnchor(chapters, 29, 30),
    `${firstVolume}结尾`,
    `${secondVolume}中段`,
    `${secondVolume}结尾`,
  ]
  return [
    ['异兽/规则异常', `${protagonistName}第一次发现${ruleName}并不完全符合常识。`, '看似是开局奇遇，真实含义是世界规则存在被篡改或缺页。', '证明主角的信息差不是外挂摆设，而是后续破局方法。'],
    ['知识来源破绽', `${protagonistName}说出一个此世不该知道的词。`, `${antagonistName}或更高层势力由此锁定主角的异常来源。`, '让主角每次使用知识都伴随暴露风险。'],
    ['规则代价', `第一次成功利用${ruleName}后留下身体、记忆或因果上的轻微反噬。`, '力量不是免费升级，代价会在首卷决战前集中爆发。', '给爽点增加限制，避免无限开挂。'],
    ['禁忌边界', `旁人提到一个不能触碰的禁忌，却没有解释原因。`, '禁忌其实是长期扩容边界，触碰后会打开更大地图。', '把第一卷事件接到超长篇主线。'],
    ['反派旧识', `${antagonistName}对${protagonistName}的判断快得反常。`, '反派并非单纯追杀者，而是掌握残篇、前史或多重身份。', '为后期身份反转和长线敌意埋线。'],
    ['第一位见证者', `同盟或路人记住${protagonistName}一次看似随手的选择。`, '这次选择会变成主角道德底线的公开证据。', '帮助读者确认主角不是只靠利益驱动。'],
    ['残缺地图/残篇', '出现一块不完整地图、残页、药方、符号或旧物。', '它对应第二卷入口，也解释第一卷很多异常不是孤立事件。', '提供首卷胜利后的下一步追读理由。'],
    ['错误答案', `${protagonistName}用错误理解得到一次小胜。`, '小胜会误导主角，直到回收时才发现真正规则更残酷。', '制造反转和失败后的二次爽点。'],
    ['爽点债务', '首卷中段给出一次明显爽点，但故意留下未完全兑现的债务。', '首卷结尾必须用更大回报偿还，形成读者长期期待。', '把“赢一次”升级成“赢得有代价、有余波”。'],
    ['全书级谜面', `${firstVolume}收束前露出一句和${title}核心真相有关的话。`, '这不是阶段谜题，而是 300 万字以上主线的第一行答案。', '让项目具备超长篇持续扩容方向。'],
  ].map(([name, description, trueMeaning, impact], index) => ({
    name,
    plant_at: anchors[index],
    payoff_at: payoffAnchors[index],
    description,
    surface: description,
    true_meaning: trueMeaning,
    impact,
    source: 'auto_gap_repair',
  }))
}

function buildAuthorConfirmations(seed: any, idea = '') {
  const root = parseNestedSeed(seed)
  const protagonist = parseNestedSeed(root.protagonist)
  const world = parseNestedSeed(root.worldbuilding)
  const volumes = asSeedArray(root.volume_outlines).map(parseNestedSeed)
  const questions = asSeedArray(root.open_questions).map(item => firstSeedText(item)).filter(Boolean)
  const title = firstSeedText(root.title, root.logline, '本书')
  const protagonistName = firstSeedText(cleanSeedCharacterName(protagonist.name), cleanSeedCharacterName(protagonist.title), '主角')
  const protagonistGoal = firstSeedText(protagonist.goal, root.main_conflict, root.logline, idea, `破解${title}的核心规则`)
  const ruleName = firstSeedText(world.power_system, world.rules?.[0], root.core_premise, root.main_conflict, `${title}核心规则`)
  const firstVolume = volumes[0] || {}
  const firstVolumeGoal = firstSeedText(firstVolume.goal, firstVolume.summary, firstVolume.hook, '完成开局承诺并赢下第一阶段对手')
  const base = [
    {
      key: 'protagonist_final_desire',
      label: '最终欲望',
      question: questions.find(item => /最终欲望|不可退让|道德底线/.test(item)) || `请确认${protagonistName}的最终欲望、道德底线和不可退让目标。`,
      answer: `${protagonistName}的最终欲望是${protagonistGoal}；道德底线是不主动牺牲无辜者换取升级；不可退让目标是守住知识来源和第一批重要同伴。`,
    },
    {
      key: 'rule_cost_boundary',
      label: '规则代价',
      question: questions.find(item => /代价|禁忌|扩容边界|核心规则/.test(item)) || '请确认核心规则的代价、禁忌和长期扩容边界。',
      answer: `${ruleName}的代价是每次使用都会增加暴露、反噬或因果债；禁忌是不能无验证地套用旧知识；长期扩容边界是从个人破局扩展到残篇、势力、地图和世界真相。`,
    },
    {
      key: 'first_volume_payoff',
      label: '第一卷爽点回报',
      question: questions.find(item => /第一卷|爽点|回报|期待/.test(item)) || '请确认第一卷读者最期待的爽点回报是什么。',
      answer: `第一卷最核心的爽点回报是：${protagonistName}用前文埋下的规则线索完成公开破局，兑现“${firstVolumeGoal}”，同时打开更大地图和更危险敌意。`,
    },
  ]
  return base.map(item => ({ ...item, source: 'auto_gap_repair' }))
}

export function mergeGeneratedFields(existing: any, additions: string[]) {
  const seen = new Set<string>()
  return [...asSeedArray(existing), ...additions]
    .map(item => String(item || '').trim())
    .filter(item => item && !seen.has(item) && seen.add(item))
}

export function attachProjectSeedDirector(seed: any) {
  if (!seed || typeof seed !== 'object' || Array.isArray(seed) || !Object.keys(seed).length) return seed
  const director = buildOhStoryDirectorForProjectSeed(seed)
  return {
    ...seed,
    oh_story_director: director,
    ohStoryDirector: director,
  }
}

export function repairProjectSeedGaps(seed: any, idea = '') {
  const root = parseNestedSeed(seed)
  if (!root || !Object.keys(root).length) return root
  const generated: string[] = []
  const existingForeshadowing = asSeedArray(root.foreshadowing_plan).filter(item => !foreshadowingLooksLikeLocalScaffold(item))
  const existingConfirmations = asSeedArray(root.author_confirmations)
  const openQuestions = asSeedArray(root.open_questions).map(item => firstSeedText(item)).filter(Boolean)
  // 伏笔必须由模型生成；本地模板只保留给前端“自动补齐”按钮，不再写入项目种子。
  const foreshadowingPlan = existingForeshadowing
  const authorConfirmations = existingConfirmations.length ? existingConfirmations : (openQuestions.length ? buildAuthorConfirmations(root, idea) : [])
  if (!existingConfirmations.length && authorConfirmations.length) generated.push('author_confirmations')
  const seedDiagnostics = parseNestedSeed(root.seed_diagnostics)
  const repaired = {
    ...root,
    foreshadowing_plan: foreshadowingPlan,
    author_confirmations: authorConfirmations,
    open_questions: authorConfirmations.length ? [] : openQuestions,
    seed_diagnostics: {
      ...seedDiagnostics,
      generated_fields: mergeGeneratedFields(seedDiagnostics.generated_fields, generated),
    },
  }
  return attachProjectSeedDirector(repaired)
}

export function buildProjectSeedDiagnostics(seed: any, idea = '', result: any = null) {
  const root = parseNestedSeed(seed)
  const rawPayload = parseNestedSeed(root.raw_payload)
  const rawPreview = resultContentPreview(result)
  const missingFields = seedFieldMissing(root)
  const retainedFragments = uniqueSeedTexts([
    root.title,
    root.genre,
    root.synopsis,
    root.logline,
    root.core_premise,
    root.main_conflict,
    root.worldbuilding,
    root.protagonist,
    root.characters,
    rawPayload,
    idea,
    rawPreview,
  ], 10)
  return {
    status: hasUsableProjectSeed(root) ? 'ready' : 'needs_model_expansion',
    usable: hasUsableProjectSeed(root),
    missing_fields: missingFields,
    retained_fragments: retainedFragments,
    raw_preview: rawPreview.slice(0, 1200),
    suggestion: missingFields.length
      ? '模型返回偏薄。系统已保留有效材料，并会把缺口清单与可编辑草稿交给同一个模型继续补齐。'
      : '模型返回具备项目种子基础结构。',
  }
}

export function projectSeedNeedsReview(diagnostics: any) {
  const status = String(diagnostics?.status || '').trim()
  return status === 'needs_author_review' || status === 'needs_model_expansion'
}

export function hasUsableProjectSeed(seed: any) {
  const root = parseNestedSeed(seed)
  if (!root || !Object.keys(root).length) return false
  const hasCorePitch = Boolean(firstSeedText(root.synopsis, root.logline, root.core_premise, root.main_conflict))
  const hasWorld = hasObjectText(root.worldbuilding, ['world_summary', 'summary', 'power_system', 'rules'])
  const hasCharacter = hasObjectText(root.protagonist, ['name', 'identity', 'goal', 'power_or_cheat'])
    || asSeedArray(root.characters).some(character => hasObjectText(character, ['name', 'identity', 'role_type', 'goal', 'summary']))
  const hasPlan = asSeedArray(root.volume_outlines).length > 0
    || asSeedArray(root.chapter_outlines).length > 0
    || asSeedArray(root.foreshadowing_plan).length > 0
  return hasCorePitch && (hasWorld || hasCharacter || hasPlan)
}

export function normalizeProjectSeedPayload(payload: any, rawIdea: string, requestedLengthTarget = '') {
  const root = parseNestedSeed(payload)
  const candidates = [
    root.project_seed,
    root.seed,
    root.project,
    root.novel_project,
    root.data,
    root.result,
    root,
  ].map(parseNestedSeed)
  const source = candidates.find(item => item && typeof item === 'object' && !Array.isArray(item) && (
    item.title || item.project_title || item.book_title || item.synopsis || item.summary || item.logline || item.core_premise || item.worldbuilding || item.protagonist
  )) || root
  const masterOutline = parseNestedSeed(source.master_outline || root.master_outline)
  const rawForInference = safeJsonStringify(root, undefined, 5000) + rawIdea.slice(0, 5000)
  const commercial = parseNestedSeed(source.commercial_positioning || root.commercial_positioning)
  const worldbuilding = parseNestedSeed(source.worldbuilding || root.worldbuilding)
  const plotEngine = parseNestedSeed(source.plot_engine || root.plot_engine)
  const protagonist = parseNestedSeed(source.protagonist || root.protagonist)
  const antagonist = parseNestedSeed(source.antagonist || root.antagonist)
  const writingBible = parseNestedSeed(source.writing_bible || root.writing_bible)
  const volumeOutlines = firstSeedArray(
    source.volume_outlines,
    source.volumes,
    root.volume_outlines,
    root.volumes,
    masterOutline.volume_outlines,
    masterOutline.volumes,
    plotEngine.volume_outlines,
    plotEngine.volumes,
  )
  const chapterOutlines = firstSeedArray(
    source.chapter_outlines,
    source.chapters,
    source.first_30_chapters,
    root.chapter_outlines,
    root.chapters,
    root.first_30_chapters,
    masterOutline.chapter_outlines,
    masterOutline.chapters,
    plotEngine.chapter_outlines,
    plotEngine.chapters,
    plotEngine.first_30_chapters,
  )
  return {
    title: firstSeedText(source.title, source.project_title, source.book_title, source.name, source.working_title, masterOutline.title),
    genre: firstSeedText(source.genre, source.main_genre, source.category, inferSeedGenre(rawForInference)),
    sub_genres: asSeedArray(source.sub_genres).length ? asSeedArray(source.sub_genres) : asSeedArray(source.genre_tags || source.tags),
    target_audience: firstSeedText(source.target_audience, source.audience, commercial.platform),
    length_target: firstSeedText(normalizeLengthTarget(requestedLengthTarget), normalizeLengthTarget(source.length_target), normalizeLengthTarget(source.length), 'medium'),
    style_tags: asSeedArray(source.style_tags).length ? asSeedArray(source.style_tags) : asSeedArray(source.tone_tags),
    commercial_tags: asSeedArray(source.commercial_tags).length ? asSeedArray(source.commercial_tags) : asSeedArray(commercial.tropes || commercial.selling_points),
    synopsis: firstSeedText(source.synopsis, source.project_summary, source.summary, masterOutline.summary, commercial.reader_promise, source.core_premise, source.logline),
    logline: firstSeedText(source.logline, source.hook, masterOutline.hook, commercial.reader_promise),
    core_premise: firstSeedText(source.core_premise, source.premise, source.setting, source.summary, masterOutline.summary),
    main_conflict: firstSeedText(source.main_conflict, source.conflict, plotEngine.long_term_goal, masterOutline.hook),
    protagonist,
    antagonist,
    worldbuilding,
    plot_engine: plotEngine,
    writing_bible: writingBible,
    commercial_positioning: commercial,
    volume_outlines: volumeOutlines,
    chapter_outlines: chapterOutlines,
    foreshadowing_plan: asSeedArray(source.foreshadowing_plan).length ? asSeedArray(source.foreshadowing_plan) : asSeedArray(root.foreshadowing_plan),
    characters: asSeedArray(source.characters).length ? asSeedArray(source.characters) : asSeedArray(root.characters),
    open_questions: asSeedArray(source.open_questions).length ? asSeedArray(source.open_questions) : asSeedArray(source.questions),
    next_steps: asSeedArray(source.next_steps).length ? asSeedArray(source.next_steps) : asSeedArray(source.suggested_next_steps),
    raw_idea: rawIdea,
    raw_payload: root,
  }
}

