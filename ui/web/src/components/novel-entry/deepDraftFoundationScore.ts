import type { LaunchpadFields } from './launchpadModel'
import { evaluateLaunchpadReadiness } from './launchpadModel'
import type { DeepDraftReviewModel } from './deepDraftReviewModel'

export type FoundationDimensionKey =
  | 'commercial_hook'
  | 'story_power'
  | 'character_design'
  | 'world_system'
  | 'opening_first30'
  | 'longform_capacity'
  | 'writing_bible'

export type FoundationGrade = 'S' | 'A' | 'B' | 'C' | 'D'

export interface FoundationCheck {
  key: string
  label: string
  passed: boolean
  weight: number
  guidance: string
}

export interface FoundationDimensionScore {
  key: FoundationDimensionKey
  title: string
  score: number
  maxScore: number
  status: 'strong' | 'ok' | 'weak'
  summary: string
  checks: FoundationCheck[]
  missing: string[]
  nextAction: string
}

export interface DeepDraftFoundationScore {
  overall: number
  grade: FoundationGrade
  gradeLabel: string
  recommendCreate: boolean
  allowCreateWithWarning: boolean
  statusLabel: string
  headline: string
  summary: string
  dimensions: FoundationDimensionScore[]
  topRisks: string[]
  nextActions: string[]
  threshold: {
    recommend: number
    warning: number
  }
}

type AnyRecord = Record<string, any>

function asObject(value: any): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function firstText(...values: any[]) {
  return values.map(value => String(value || '').trim()).find(Boolean) || ''
}

function hasText(value: any) {
  return Boolean(firstText(value))
}

function asArray(value: any) {
  return Array.isArray(value) ? value : []
}

function chapterNoOf(item: any, index: number) {
  const raw = Number(item?.chapter_no || item?.chapter_number || item?.chapterNo || item?.no || item?.index)
  return Number.isFinite(raw) && raw > 0 ? raw : index + 1
}

function hasChapterRange(chapters: any[], reviewChapters: any[], start: number, end: number) {
  const seedHit = chapters.some((item, index) => {
    const no = chapterNoOf(item, index)
    return no >= start && no <= end && Boolean(String(item?.chapter_goal || item?.goal || item?.summary || item?.title || '').trim())
  })
  if (seedHit) return true
  return reviewChapters.some((item: any) => {
    const no = Number(item?.chapterNo || item?.chapter_no || 0)
    return no >= start && no <= end && Boolean(String(item?.goal || item?.title || '').trim())
  })
}


function hasContract(value: any) {
  if (!value) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return false
}

function scoreFromChecks(checks: FoundationCheck[]) {
  const totalWeight = checks.reduce((sum, item) => sum + item.weight, 0) || 1
  const earned = checks.reduce((sum, item) => sum + (item.passed ? item.weight : 0), 0)
  return Math.round((earned / totalWeight) * 100)
}

function statusFromScore(score: number): FoundationDimensionScore['status'] {
  if (score >= 80) return 'strong'
  if (score >= 60) return 'ok'
  return 'weak'
}

function gradeFromOverall(score: number): { grade: FoundationGrade; gradeLabel: string } {
  if (score >= 90) return { grade: 'S', gradeLabel: '开书级' }
  if (score >= 80) return { grade: 'A', gradeLabel: '优质可开' }
  if (score >= 70) return { grade: 'B', gradeLabel: '基本可开' }
  if (score >= 55) return { grade: 'C', gradeLabel: '建议再打磨' }
  return { grade: 'D', gradeLabel: '基础偏弱' }
}

function dimension(
  key: FoundationDimensionKey,
  title: string,
  checks: FoundationCheck[],
  nextActionFallback: string,
): FoundationDimensionScore {
  const score = scoreFromChecks(checks)
  const missing = checks.filter(item => !item.passed).map(item => item.label)
  const nextFailed = checks.find(item => !item.passed)
  return {
    key,
    title,
    score,
    maxScore: 100,
    status: statusFromScore(score),
    summary: missing.length === 0
      ? '该维度已基本达标。'
      : `待补：${missing.slice(0, 3).join('、')}${missing.length > 3 ? '…' : ''}`,
    checks,
    missing,
    nextAction: nextFailed?.guidance || nextActionFallback,
  }
}

export function buildDeepDraftFoundationScore(args: {
  seed?: any
  launchpad?: LaunchpadFields | null
  review?: DeepDraftReviewModel | null
  lengthTarget?: string
}): DeepDraftFoundationScore {
  const seed = asObject(args.seed)
  const bible = asObject(seed.writing_bible)
  const world = asObject(seed.worldbuilding)
  const protagonist = asObject(seed.protagonist)
  const plotEngine = asObject(seed.plot_engine)
  const commercial = asObject(seed.commercial_positioning)
  const characterPool = asObject(seed.character_pool)
  const review = args.review || null
  const launchpad = args.launchpad || null
  const lengthTarget = String(args.lengthTarget || seed.length_target || 'medium')
  const readiness = launchpad
    ? evaluateLaunchpadReadiness(launchpad, seed, lengthTarget)
    : null

  const characters = asArray(seed.characters)
  const chapterOutlines = asArray(seed.chapter_outlines)
  const volumeOutlines = asArray(seed.volume_outlines)
  const foreshadowing = asArray(seed.foreshadowing_plan)
  const reviewCharacters = asArray(review?.characters)
  const reviewChapters = asArray(review?.chapters)
  const reviewVolumes = asArray(review?.volumes)

  const commercialChecks: FoundationCheck[] = [
    {
      key: 'reader_promise',
      label: '读者承诺',
      weight: 3,
      passed: hasText(launchpad?.reader_promise || seed.reader_promise || commercial.reader_promise || seed.logline || review?.basics.pitch),
      guidance: '补一句读者为什么愿意追：情绪兑现点，而不是空泛简介。',
    },
    {
      key: 'selling_point',
      label: '核心卖点',
      weight: 3,
      passed: hasText(launchpad?.core_selling_point || seed.core_selling_point || commercial.selling_points || seed.hook || review?.basics.pitch),
      guidance: '写清差异化卖点：人设、金手指、冲突或设定里最能扫榜的那一点。',
    },
    {
      key: 'opening_hook',
      label: '开篇钩子',
      weight: 3,
      passed: hasText(launchpad?.opening_hook || seed.opening_hook || bible.opening_strategy_contract || launchpad?.first30_plan?.chapters_1_3),
      guidance: '明确第1章前300字钩子：事件/人设/金手指三选一，并写清压迫点。',
    },
    {
      key: 'target_reader',
      label: '目标读者契约',
      weight: 2,
      passed: hasContract(bible.target_reader_contract) || hasText(seed.target_audience || commercial.platform),
      guidance: '补目标读者：写给谁、想看什么、本章价值检验标准。',
    },
  ]

  const storyPowerChecks: FoundationCheck[] = [
    {
      key: 'logline',
      label: '一句话故事',
      weight: 2,
      passed: hasText(seed.logline || review?.basics.pitch),
      guidance: '用一句话写清主角、欲望、障碍与代价。',
    },
    {
      key: 'main_conflict',
      label: '核心冲突',
      weight: 3,
      passed: hasText(seed.main_conflict || seed.core_premise || launchpad?.long_term_conflict || plotEngine.long_term_conflict),
      guidance: '写明长期对抗轴：谁拦谁、拦什么、失败会怎样。',
    },
    {
      key: 'story_power_contract',
      label: '故事力合同',
      weight: 3,
      passed: hasContract(bible.story_power_contract),
      guidance: '补齐 oh-story 故事力合同：动作改变局势、因果反馈、有始有终。',
    },
    {
      key: 'core_radar',
      label: '核心承诺雷达',
      weight: 2,
      passed: hasContract(bible.core_contract_radar),
      guidance: '补核心承诺雷达：must_serve / no_drift，避免写飘。',
    },
  ]

  const characterChecks: FoundationCheck[] = [
    {
      key: 'protagonist',
      label: '主角姓名与目标',
      weight: 3,
      passed: (hasText(protagonist.name) && hasText(protagonist.goal))
        || reviewCharacters.some(item => hasText(item?.name) && hasText(item?.goal)),
      guidance: '主角至少要有名字、当前处境和可执行目标。',
    },
    {
      key: 'cast_size',
      label: '关键人物阵容',
      weight: 2,
      passed: Math.max(characters.length, reviewCharacters.length) >= 3,
      guidance: '至少补齐主角、对手、核心同盟三类人物。',
    },
    {
      key: 'antagonist',
      label: '主要对手',
      weight: 2,
      passed: asArray(characterPool.antagonist_primary).length > 0
        || characters.some(item => /反派|对手|敌|boss|antagonist/i.test(String(item?.role_type || item?.role || '')))
        || reviewCharacters.some(item => /反派|对手|敌|boss/i.test(String(item?.role || ''))),
      guidance: '明确主要对手的自我叙事和压迫方式，不要只写“坏人”。',
    },
    {
      key: 'character_design_contract',
      label: '角色设计合同',
      weight: 3,
      passed: hasContract(bible.character_design_contract),
      guidance: '补角色设计合同：三层标签、配角功能、金手指与人设绑定。',
    },
  ]

  const worldChecks: FoundationCheck[] = [
    {
      key: 'world_summary',
      label: '世界观摘要',
      weight: 3,
      passed: hasText(world.world_summary || review?.world.summary),
      guidance: '用一段话说明世界运行逻辑，而不是词条堆砌。',
    },
    {
      key: 'power_system',
      label: '力量/规则体系',
      weight: 3,
      passed: hasText(world.power_system || review?.world.powerSystem || launchpad?.growth_engine || seed.power_system),
      guidance: '写清升级路径与代价，避免“想强就强”。',
    },
    {
      key: 'world_rules',
      label: '硬规则',
      weight: 2,
      passed: asArray(world.rules).length > 0,
      guidance: '至少写 2-3 条会持续制造冲突的世界硬规则。',
    },
    {
      key: 'genre_positioning',
      label: '题材定位合同',
      weight: 2,
      passed: hasContract(bible.genre_positioning_contract) || hasText(seed.genre || review?.basics.genre),
      guidance: '明确题材长板与创新边界，拉长板而不是平均补短板。',
    },
  ]

  const first30Checks: FoundationCheck[] = [
    {
      key: 'chapters_1_3',
      label: '1-3章开篇承诺',
      weight: 3,
      passed: hasText(launchpad?.first30_plan?.chapters_1_3) || hasChapterRange(chapterOutlines, reviewChapters, 1, 3),
      guidance: '写清 1-3 章如何兑现吸量承诺。',
    },
    {
      key: 'chapters_4_10',
      label: '4-10章试读闭环',
      weight: 3,
      passed: hasText(launchpad?.first30_plan?.chapters_4_10) || hasChapterRange(chapterOutlines, reviewChapters, 4, 10),
      guidance: '写清 4-10 章试读闭环：验证能力、建立关系、抛出更大压力。',
    },
    {
      key: 'chapters_11_30',
      label: '11-30章付费蓄势',
      weight: 3,
      passed: hasText(launchpad?.first30_plan?.chapters_11_30) || hasChapterRange(chapterOutlines, reviewChapters, 11, 30),
      guidance: '写清 11-30 章如何抬高赌注、扩展地图并蓄势付费点。',
    },
    {
      key: 'chapter_outlines',
      label: '章节细纲厚度',
      weight: 2,
      passed: Math.max(chapterOutlines.length, reviewChapters.length) >= 8,
      guidance: '至少准备 8 章以上可执行细纲，方便开写不断档。',
    },
  ]

  const needsLongform = lengthTarget === 'long' || lengthTarget === 'epic' || lengthTarget === 'medium'
  const longformChecks: FoundationCheck[] = [
    {
      key: 'mainline_goal',
      label: '长篇主线目标',
      weight: 3,
      passed: hasText(launchpad?.mainline_goal || seed.mainline_goal || plotEngine.mainline_goal),
      guidance: '写贯穿全书的主线目标，不能只写第一卷。',
    },
    {
      key: 'long_term_conflict',
      label: '长线冲突引擎',
      weight: 3,
      passed: hasText(launchpad?.long_term_conflict || plotEngine.long_term_conflict || seed.long_term_conflict),
      guidance: '补可长期加压的冲突引擎：制度、宿敌、资源、身份或规则。',
    },
    {
      key: 'growth_engine',
      label: '成长引擎',
      weight: 2,
      passed: hasText(launchpad?.growth_engine || plotEngine.growth_engine || seed.growth_engine || world.power_system),
      guidance: '明确成长节奏与成本，保证中后段不空转。',
    },
    {
      key: 'volumes',
      label: '分卷方向',
      weight: 2,
      passed: hasText(launchpad?.volume_direction) || volumeOutlines.length > 0 || reviewVolumes.length > 0,
      guidance: '至少写第一卷目标与后续卷方向。',
    },
    {
      key: 'expandable_assets',
      label: '可扩展资产',
      weight: needsLongform && lengthTarget === 'epic' ? 2 : 1,
      passed: hasText(launchpad?.expandable_assets) || foreshadowing.length > 0 || hasText(review?.continuity.foreshadowing),
      guidance: '准备人物/地图/伏笔/组织等可扩展资产池。',
    },
  ]

  const bibleChecks: FoundationCheck[] = [
    {
      key: 'reader_retention',
      label: '追读留存契约',
      weight: 2,
      passed: hasContract(bible.reader_retention_contract),
      guidance: '补追读契约：前300字钩子、章末拉力、奖励随机性。',
    },
    {
      key: 'opening_strategy',
      label: '开篇策略契约',
      weight: 2,
      passed: hasContract(bible.opening_strategy_contract),
      guidance: '补开篇策略：噱头类型、前5章承诺、主线嫁接时机。',
    },
    {
      key: 'longform_structure',
      label: '长篇结构合同',
      weight: 2,
      passed: hasContract(bible.longform_structure_contract),
      guidance: '补长篇结构合同：分卷节奏、高潮预算、疲劳规避。',
    },
    {
      key: 'plot_special_topics',
      label: '情节专题合同',
      weight: 1,
      passed: hasContract(bible.plot_special_topics_contract),
      guidance: '按题材补齐情节专题边界（金手指、卡点、阵营等）。',
    },
    {
      key: 'foreshadowing',
      label: '伏笔计划',
      weight: 2,
      passed: foreshadowing.length > 0 || hasText(review?.continuity.foreshadowing),
      guidance: '至少埋 3 条可回收伏笔，写清触发章与回收章。',
    },
  ]

  const dimensions = [
    dimension('commercial_hook', '商业钩子', commercialChecks, '先把读者承诺和核心卖点写死。'),
    dimension('story_power', '故事力', storyPowerChecks, '先把核心冲突与故事力合同补齐。'),
    dimension('character_design', '角色设计', characterChecks, '先立主角目标与主要对手。'),
    dimension('world_system', '世界与规则', worldChecks, '先补世界观摘要和规则代价。'),
    dimension('opening_first30', '前30章启动', first30Checks, '先补 1-30 章追读分段计划。'),
    dimension('longform_capacity', '长线承载', longformChecks, '先补主线、冲突引擎和分卷方向。'),
    dimension('writing_bible', 'oh-story 契约', bibleChecks, '先补写作圣经关键契约，避免开写后漂移。'),
  ]

  const weights: Record<FoundationDimensionKey, number> = {
    commercial_hook: 1.3,
    story_power: 1.2,
    character_design: 1.2,
    world_system: 1.0,
    opening_first30: 1.3,
    longform_capacity: lengthTarget === 'epic' ? 1.3 : 1.1,
    writing_bible: 1.0,
  }
  const totalWeight = dimensions.reduce((sum, item) => sum + weights[item.key], 0)
  const overall = Math.round(
    dimensions.reduce((sum, item) => sum + item.score * weights[item.key], 0) / totalWeight,
  )
  const { grade, gradeLabel } = gradeFromOverall(overall)
  const recommend = 72
  const warning = 55
  const gapDims = dimensions
    .filter(item => item.missing.length > 0)
    .sort((a, b) => a.score - b.score || b.missing.length - a.missing.length)
  const weakDims = gapDims.filter(item => item.status === 'weak')
  const topRisks = gapDims.flatMap(item => item.missing.slice(0, 2)).slice(0, 8)
  // Use dimension-local guidance only; never surface unrelated launchpad risk text as "下一步".
  const nextActions = gapDims
    .map(item => item.missing.length ? `【${item.title}】${item.nextAction}` : item.nextAction)
    .filter(Boolean)
    .slice(0, 5)

  let headline = ''
  let summary = ''
  let statusLabel = ''
  if (overall >= recommend) {
    statusLabel = '建议可开书'
    headline = `基础评分 ${overall}（${grade} · ${gradeLabel}）`
    summary = '核心卖点、开篇与长线骨架已基本达标。若你认可当前版本，可以定稿开书。'
  } else if (overall >= warning) {
    statusLabel = '建议再打磨'
    headline = `基础评分 ${overall}（${grade} · ${gradeLabel}）`
    summary = '已经有可写骨架，但关键维度仍弱。优先补齐下方缺口，再决定是否开书。'
  } else {
    statusLabel = '暂不建议开书'
    headline = `基础评分 ${overall}（${grade} · ${gradeLabel}）`
    summary = '当前更像半成品种子。先按引导补强商业钩子、角色与前30章，再开书更稳。'
  }

  return {
    overall,
    grade,
    gradeLabel,
    recommendCreate: overall >= recommend,
    allowCreateWithWarning: overall >= warning,
    statusLabel,
    headline,
    summary,
    dimensions,
    topRisks: topRisks.length ? topRisks : readiness?.risks.slice(0, 6) || [],
    nextActions: nextActions.length
      ? nextActions
      : [readiness?.nextAction || '进入故事规划首页继续细化。'],
    threshold: { recommend, warning },
  }
}

