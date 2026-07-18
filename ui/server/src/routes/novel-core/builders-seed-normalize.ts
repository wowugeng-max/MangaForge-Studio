import { safeJsonStringify } from '../novel-route-utils'
import { buildOhStoryDirectorForProjectSeed } from '../novel-oh-story-director'
import {
  asSeedArray,
  cleanSeedCharacterName,
  fallbackChapterDisplayTitle,
  firstSeedArray,
  firstSeedText,
  foreshadowingLooksLikeLocalScaffold,
  hasObjectText,
  inferSeedGenre,
  normalizeLengthTarget,
  parseNestedSeed,
  preferSeedArray,
  projectSeedOutlinesLookLikeLocalScaffold,
  resultContentPreview,
  seedFieldMissing,
  uniqueSeedTexts,
} from './builders-seed-helpers'

export function projectSeedNeedsOutlineExpansion(seed: any) {
  const root = parseNestedSeed(seed)
  if (!hasUsableProjectSeed(root)) return true
  const chapters = asSeedArray(root.chapter_outlines)
  if (chapters.length < 8) return true
  return projectSeedOutlinesLookLikeLocalScaffold(root)
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

