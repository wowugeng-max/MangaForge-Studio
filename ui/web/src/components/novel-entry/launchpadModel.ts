export interface First30PlanFields {
  chapters_1_3: string
  chapters_4_10: string
  chapters_11_30: string
}

export interface LaunchpadFields {
  reader_promise: string
  core_selling_point: string
  protagonist_situation: string
  protagonist_pressure: string
  opening_hook: string
  mainline_goal: string
  long_term_conflict: string
  growth_engine: string
  volume_direction: string
  expandable_assets: string
  future100_note: string
  first_writing_task: string
  first30_plan: First30PlanFields
}

export type ReadinessKey = 'sellable' | 'first30' | 'longform'

export interface ReadinessItem {
  key: ReadinessKey
  title: string
  ready: boolean
  score: number
  missing: string[]
}

export interface LaunchpadReadiness {
  sellable: ReadinessItem
  first30: ReadinessItem
  longform: ReadinessItem
  risks: string[]
  nextAction: string
}

export interface First30Summary {
  outlineCount: number
  hasOpening: boolean
  hasTrialRead: boolean
  hasPaidBuildup: boolean
  sample: string[]
}

type SeedRecord = Record<string, any>
const readyNextActionFallback = '进入故事规划首页。'

function asObject(value: any): SeedRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function asStringArray(value: any): string[] {
  if (!Array.isArray(value)) return []
  return value.map(normalizeListItem).filter(Boolean)
}

function firstText(...values: any[]) {
  return values.map(value => String(value || '').trim()).find(Boolean) || ''
}

function joinList(value: any) {
  return asStringArray(value).join(' / ')
}

function normalizeListItem(item: any) {
  const record = asObject(item)
  const normalized = firstText(
    record.name,
    record.title,
    record.tag,
    record.label,
    record.value,
    record.goal,
    record.summary,
  )
  if (normalized) return normalized
  return typeof item === 'object' ? '' : String(item || '').trim()
}

function summarizeNamedItems(value: any) {
  if (!Array.isArray(value)) return ''
  return value
    .map(item => {
      const record = asObject(item)
      const title = firstText(record.title, record.name, record.tag, record.label, record.value)
      const detail = firstText(record.goal, record.direction, record.summary, record.note)
      if (title && detail) return `${title}: ${detail}`
      return title || detail || normalizeListItem(item)
    })
    .filter(Boolean)
    .join('\n')
}

function summarizeAssetItems(value: any) {
  if (!Array.isArray(value)) return ''
  return value
    .map(item => {
      const record = asObject(item)
      return firstText(record.name, record.title, record.tag, record.label, record.value, record.asset, record.hook, normalizeListItem(item))
    })
    .filter(Boolean)
    .join(' / ')
}

function chapterNumber(chapter: SeedRecord, index: number) {
  const raw = Number(chapter.chapter_no || chapter.chapter_number || chapter.no || chapter.index)
  return Number.isFinite(raw) && raw > 0 ? raw : index + 1
}

function chapterLine(chapter: SeedRecord, index: number) {
  const no = chapterNumber(chapter, index)
  const title = firstText(chapter.title, chapter.name, `第${no}章`)
  const goal = firstText(chapter.chapter_goal, chapter.goal, chapter.summary, chapter.synopsis)
  return goal ? `${title}: ${goal}` : title
}

function summarizeRange(chapters: SeedRecord[], start: number, end: number) {
  return chapters
    .map((chapter, index) => ({ chapter, index, no: chapterNumber(chapter, index) }))
    .filter(item => item.no >= start && item.no <= end)
    .map(item => chapterLine(item.chapter, item.index))
    .join('\n')
}

function coversChapterRange(chapterNumbers: Set<number>, start: number, end: number) {
  for (let no = start; no <= end; no += 1) {
    if (!chapterNumbers.has(no)) return false
  }
  return true
}

export function createEmptyLaunchpadFields(): LaunchpadFields {
  return {
    reader_promise: '',
    core_selling_point: '',
    protagonist_situation: '',
    protagonist_pressure: '',
    opening_hook: '',
    mainline_goal: '',
    long_term_conflict: '',
    growth_engine: '',
    volume_direction: '',
    expandable_assets: '',
    future100_note: '',
    first_writing_task: '',
    first30_plan: {
      chapters_1_3: '',
      chapters_4_10: '',
      chapters_11_30: '',
    },
  }
}

export function summarizeFirst30Plan(seed: any): First30Summary {
  const root = asObject(seed)
  const chapters = Array.isArray(root.chapter_outlines) ? root.chapter_outlines.map(asObject) : []
  const first30 = chapters
    .map((chapter, index) => ({ chapter, index, no: chapterNumber(chapter, index) }))
    .filter(item => item.no >= 1 && item.no <= 30)
  const chapterNumbers = new Set(first30.map(item => item.no))

  return {
    outlineCount: first30.length,
    hasOpening: coversChapterRange(chapterNumbers, 1, 3),
    hasTrialRead: coversChapterRange(chapterNumbers, 4, 10),
    hasPaidBuildup: coversChapterRange(chapterNumbers, 11, 30),
    sample: first30.slice(0, 5).map(item => chapterLine(item.chapter, item.index)),
  }
}

export function extractLaunchpadFieldsFromSeed(seed: any): LaunchpadFields {
  const root = asObject(seed)
  const commercial = asObject(root.commercial_positioning)
  const plotEngine = asObject(root.plot_engine)
  const protagonist = asObject(root.protagonist)
  const chapters = Array.isArray(root.chapter_outlines) ? root.chapter_outlines.map(asObject) : []
  const explicitPlan = asObject(root.first30_plan)

  return {
    reader_promise: firstText(
      root.reader_promise,
      commercial.reader_promise,
      root.logline,
      root.synopsis,
    ),
    core_selling_point: firstText(
      root.core_selling_point,
      joinList(commercial.selling_points),
      joinList(root.commercial_tags),
      root.hook,
    ),
    protagonist_situation: firstText(
      root.protagonist_situation,
      protagonist.situation,
      protagonist.identity,
      protagonist.role,
      protagonist.background,
    ),
    protagonist_pressure: firstText(
      root.protagonist_pressure,
      protagonist.pressure,
      protagonist.dilemma,
      protagonist.goal,
      root.opening_pressure,
    ),
    opening_hook: firstText(
      root.opening_hook,
      root.hook,
      root.logline,
      summarizeRange(chapters, 1, 1),
    ),
    mainline_goal: firstText(
      root.mainline_goal,
      plotEngine.long_term_goal,
      root.main_conflict,
      protagonist.goal,
    ),
    long_term_conflict: firstText(
      root.long_term_conflict,
      plotEngine.long_term_conflict,
      root.main_conflict,
      root.conflict,
    ),
    growth_engine: firstText(
      root.growth_engine,
      plotEngine.growth_engine,
      root.power_system,
      root.progression_engine,
    ),
    volume_direction: firstText(
      root.volume_direction,
      summarizeNamedItems(root.volume_outlines),
    ),
    expandable_assets: firstText(
      root.expandable_assets,
      summarizeAssetItems(root.foreshadowing_plan),
      summarizeAssetItems(root.open_questions),
      summarizeAssetItems(root.characters),
    ),
    future100_note: firstText(root.future100_note, root.future_100_note, root.hundred_chapter_plan),
    first_writing_task: firstText(root.first_writing_task, root.next_writing_task, '完善第1章场景卡'),
    first30_plan: {
      chapters_1_3: firstText(explicitPlan.chapters_1_3, summarizeRange(chapters, 1, 3)),
      chapters_4_10: firstText(explicitPlan.chapters_4_10, summarizeRange(chapters, 4, 10)),
      chapters_11_30: firstText(explicitPlan.chapters_11_30, summarizeRange(chapters, 11, 30)),
    },
  }
}

function readinessItem(key: ReadinessKey, title: string, missing: string[], total: number): ReadinessItem {
  return {
    key,
    title,
    ready: missing.length === 0,
    score: Math.max(0, total - missing.length),
    missing,
  }
}

export function evaluateLaunchpadReadiness(
  fields: LaunchpadFields,
  seed: any,
  lengthTarget: string,
): LaunchpadReadiness {
  const root = asObject(seed)
  const plotEngine = asObject(root.plot_engine)
  const risks: string[] = []
  const sellableMissing: string[] = []
  const first30Missing: string[] = []
  const longformMissing: string[] = []

  if (!firstText(fields.reader_promise)) {
    risks.push('缺读者承诺')
    sellableMissing.push('读者承诺')
  }
  if (!firstText(fields.core_selling_point)) {
    risks.push('缺核心卖点')
    sellableMissing.push('核心卖点')
  }
  if (!firstText(fields.opening_hook)) {
    risks.push('缺第一章开篇钩子')
    sellableMissing.push('第一章开篇钩子')
  }

  if (!firstText(fields.first30_plan.chapters_1_3)) {
    risks.push('缺1-3章开篇承诺')
    first30Missing.push('1-3章开篇承诺')
  }
  if (!firstText(fields.first30_plan.chapters_4_10)) {
    risks.push('缺4-10章试读闭环')
    first30Missing.push('4-10章试读闭环')
  }
  if (!firstText(fields.first30_plan.chapters_11_30)) {
    risks.push('缺11-30章付费蓄势')
    first30Missing.push('11-30章付费蓄势')
  }

  const requiresLongformCapacity = lengthTarget === 'long' || lengthTarget === 'epic'
  if (requiresLongformCapacity) {
    if (!firstText(fields.mainline_goal)) {
      risks.push('缺长篇主线目标')
      longformMissing.push('长篇主线目标')
    }
    if (!firstText(fields.long_term_conflict, plotEngine.long_term_conflict, root.long_term_conflict, root.main_conflict)) {
      risks.push(lengthTarget === 'epic' ? '超长篇缺长线冲突引擎' : '缺长线冲突引擎')
      longformMissing.push('长线冲突引擎')
    }
    if (!firstText(
      fields.growth_engine,
      plotEngine.growth_engine,
      root.growth_engine,
      root.power_system,
      asObject(root.worldbuilding).power_system,
    )) {
      risks.push('缺成长引擎')
      longformMissing.push('成长引擎')
    }
    if (!firstText(fields.volume_direction, root.volume_direction)) {
      risks.push('缺分卷方向')
      longformMissing.push('分卷方向')
    }
    if (lengthTarget === 'epic' && !firstText(fields.expandable_assets, root.expandable_assets)) {
      risks.push('超长篇缺可扩展资产池')
      longformMissing.push('可扩展资产池')
    }
  }

  return {
    sellable: readinessItem('sellable', '商业钩子', sellableMissing, 3),
    first30: readinessItem('first30', '前30章规划', first30Missing, 3),
    longform: readinessItem('longform', '长篇承载', longformMissing, lengthTarget === 'epic' ? 5 : 4),
    risks,
    nextAction: risks[0] || firstText(fields.first_writing_task, readyNextActionFallback),
  }
}

export function buildLaunchpadSeedPatch(seed: any, fields: LaunchpadFields, risks: string[]) {
  return {
    ...asObject(seed),
    reader_promise: fields.reader_promise,
    core_selling_point: fields.core_selling_point,
    protagonist_situation: fields.protagonist_situation,
    protagonist_pressure: fields.protagonist_pressure,
    opening_hook: fields.opening_hook,
    mainline_goal: fields.mainline_goal,
    long_term_conflict: fields.long_term_conflict,
    growth_engine: fields.growth_engine,
    volume_direction: fields.volume_direction,
    expandable_assets: fields.expandable_assets,
    future100_note: fields.future100_note,
    first_writing_task: fields.first_writing_task,
    first30_plan: { ...fields.first30_plan },
    launchpad_risks: [...risks],
  }
}
