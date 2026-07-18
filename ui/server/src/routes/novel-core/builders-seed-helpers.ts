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

export function firstSeedArray(...values: any[]) {
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

export function hasObjectText(value: any, keys: string[]) {
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

export function extractJsonProperty(raw: string, key: string) {
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

export function preferSeedArray(primary: any, fallback: any, kind: 'volume' | 'chapter' | 'other') {
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

export function foreshadowingLooksLikeLocalScaffold(item: any) {
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

export function requiredFirst30ChapterCount(lengthTarget: string) {
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

