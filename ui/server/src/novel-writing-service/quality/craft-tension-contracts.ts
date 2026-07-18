import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from './text-utils'
import { inferEndingHookType } from '../batch-serial/ending-hook-type'

type AnyFn = (...args: any[]) => any

let nextBatchBriefFromContext: AnyFn = (_contextPackage: any = {}) => null
let normalizeSuspenseExpectationChainContract: AnyFn = (value: any = {}) => value || {}

export function bindCraftTensionContractDeps(deps: {
  nextBatchBriefFromContext?: AnyFn
  normalizeSuspenseExpectationChainContract?: AnyFn
} = {}) {
  if (deps.nextBatchBriefFromContext) nextBatchBriefFromContext = deps.nextBatchBriefFromContext
  if (deps.normalizeSuspenseExpectationChainContract) normalizeSuspenseExpectationChainContract = deps.normalizeSuspenseExpectationChainContract
}

const OH_STORY_EMOTIONAL_ARC_CHECKS = [
  '弧线类型必须匹配本章情绪效果：V形、倒V形、W形、递进形、延迟满足或急转形不能混乱套用。',
  '每个核心场景必须标明当前是调动还是释放，不能只有调动没有释放，也不能只有释放没有铺垫。',
  '平静 -> 调动 -> 释放 -> 爽 的链条必须落成正文证据，爽点前要有可感知的压力、期待或不该如此。',
  '情绪三板斧必须有执行证据：前段羁绊铺设用具体物件/具体数字/重复动作，中段情感撕裂用反差法/错位法/延迟真相法，结尾余韵钝痛用安静细节收束。',
  '情绪拉扯曲线必须按题材和章节阶段选用，不能机械走完整曲线；完整曲线可参考温暖 -> 残忍 -> 善意 -> 真相 -> 原谅 -> 来不及 -> 释然 -> 细节暴击。',
  '题材情感策略必须匹配目标读者：世情/爽文重反弹和解气，情感/虐心重羁绊和余韵，古言/复仇重因果报应，悬疑/推理重信息差，年代/亲情重代际和遗憾。',
  '连续爽点必须逐级递增，至少在影响范围、揭示深度、身份落差或关系变化上有一项升级。',
  '戏剧性会磨损，情绪不会磨损：同一种爽感可以重复，但复用套路时必须换场景、换对手、加新情绪或提高 stakes/奖励复杂度。',
  '先入为主：前100字必须让读者知道核心矛盾或情绪判断，先呈现的信息影响力更大；否定提前会放大否定感，必须谨慎排序。',
  '峰终定律：结尾情绪必须高于起点，结尾情绪强度按题材校验，虐≥8、爽≥7、治愈≥6；章尾必须是具体动作/对话/画面，禁止总结式反思。',
  '三层情绪必须分离：角色自己的情绪、文本传递的情绪、读者实际感受不能混为一谈；负面角色情绪必须转成读者收益。',
  '情绪反应结构必须按题材选型：虐/悲壮/遗憾用前反应 -> 复现 -> 后反应，热血/逆袭用以小搏大 -> 士气如虹。',
  '递进对抗必须是角力而非碾压：主角小胜、对手加码、最后王炸一锤定音。',
  '梗四段式必须完整：发生 -> 发展 -> 转折 -> 高潮，不能缺转折直接跳高潮。',
  '读者欲望四步公式必须走完：生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿。',
  '断期待禁止：闭合一个期待时，下一个开环必须已经在运行。',
  '下行情节要给读者安全感：锅是别人的，功是主角的，并保留潜在解法、底牌或收获。',
  '情绪表达优先写行为、动作、对话和场面反应，避免只用抽象心理词告诉读者该怎么感受。',
]

const OH_STORY_EMOTIONAL_SCENE_EXECUTION_RULES = [
  '每个场景必须标注读者当前情绪阶段：调动、复现、释放或后反应，不能只写剧情功能。',
  '虐/悲壮/遗憾场景按前反应 -> 复现 -> 后反应执行：先让读者提前知道坏结果，再让坏结果真的发生，最后让主角真情流露并作出改变。',
  '热血/逆袭场景按以小搏大 -> 士气如虹执行：先铺弱者之苦，再让强者到来，最后让弱势方被拯救并整体气势转变。',
  '闭环当前期待时必须同时开启下一开环，章尾要留下新问题、新目标、新代价或更大关系压力。',
]

const OH_STORY_EMOTIONAL_EXPECTATION_RULES = [
  '期待最大化定律：爽点到来前一刻是张力最高处，不要提前泄气。',
  '断期待禁止：下一个期待立起来之前，不能结束当前期待。',
  '闭环一个期待时，必须同时开启新的期待或更大问题。',
  '下行情节安全原则：锅是别人的，功是主角的，读者要看见潜在解法或收获。',
]

const OH_STORY_PROGRESSIVE_CONFRONTATION_RULES = [
  '递进对抗写法：主角与反派是角力而非碾压，不能一路平推。',
  '每次小角力主角稍占上风，反派必须继续加码，最后主角王炸一锤定音。',
  '对抗过程要有“主角对三 -> 反派对四 -> 主角对A -> 反派对2 -> 主角王炸”的递进感。',
]

const OH_STORY_MEME_PLOT_FORMULA_RULES = [
  '以梗构建剧情法：发生 -> 发展 -> 转折 -> 高潮。',
  '发生建立梗的前提条件，发展用挫败或积累推向触发点，转折用金手指或关键手段反转，高潮释放前后反差。',
  '用梗作为高潮点倒推剧情，天然避免流水账。',
]

const OH_STORY_READER_DESIRE_FORMULA_RULES = [
  '驱动读者欲望四步公式：生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿。',
  '生产诉求要用低地位、困境、迫在眉睫的威胁、不曾拥有或不公平，让读者生出“不该如此”。',
  '给予希望必须让读者看见金手指、底牌、潜在解法、盟友或规则漏洞。',
  '努力解决要有行动过程和代价，不断解决现有矛盾并制造新矛盾。',
  '得偿所愿要兑现阶段回报，同时抛出新困境或更高层级目标。',
]

const OH_STORY_EMOTIONAL_PRESSURE_METHODS = [
  '公开升级：把私下伤害搬到公开场合。',
  '双重背叛：已知一层背叛后再加一层。',
  '代价加速：不行动的代价不断升高。',
  '战略性沉默：主角暂不反击，沉默本身持续加压。',
]

const OH_STORY_EMOTIONAL_PAYOFF_TYPES = [
  '能力碾压',
  '目标达成',
  '收获盘点',
  '态度转变',
  '隐藏身份/掉马甲',
  '情感圆满度',
]

const OH_STORY_PAYOFF_REVERSE_DESIGN = {
  version: 'oh_story_payoff_reverse_design_v1',
  design_order: [
    '先确定用什么方式让读者满足（爽点类型）。',
    '再设计如何拉起期待（期待点）。',
    '最后设计如何铺垫（铺垫）。',
  ],
  expectation_point_rules: [
    '期待点必须服务所选爽点类型：读者要知道自己在等什么满足。',
    '期待点要用压力、信息差、门槛、误判或将满未满的动作拉起，不能提前泄气。',
  ],
  setup_rules: [
    '铺垫必须反向服务期待点：物件、证据、关系、规则漏洞或对手轻视都要能在释放时回收。',
    '章纲设计顺序按爽点类型 -> 期待点 -> 铺垫，正文呈现顺序按铺垫 -> 期待升高 -> 爽点释放。',
  ],
  quality_checks: [
    '章纲必须先定爽点类型，再定期待点，最后倒推铺垫。',
    '正文必须让铺垫、期待点和爽点释放形成可回收链条。',
  ],
}

const OH_STORY_PAYOFF_TIER_RULES = [
  '日常小装逼：距离下个大爽点远时，用日常生活展示优势，维持读者耐心。',
  '核心爽点：必须切在主线上，围绕主线目标装逼，推进主线同时让读者爽。',
  '偏离爽点：背离主线去别处装逼会浪费读者耐心，必须避免。',
]

const OH_STORY_PAYOFF_DENSITY_RULES = [
  '不要拉长单个爽点的铺垫，而是多想几个爽点。',
  '每 800-1200 字至少交付一次信息增量、能力展示、危机反制、关系变化或小回收。',
  '长铺垫必须拆成多个小回报：发现、确认、反制、站队、收益结算或新期待至少落一个。',
]

const OH_STORY_EMOTION_MODULE_RECOMPOSITION_RULES = [
  '戏剧性会磨损，情绪不会磨损；同一种爽感可以重复，但不能重复同一个戏剧单元。',
  '套路重复时必须至少换场景、换对手、加新情绪、提高 stakes/奖励复杂度之一。',
  '读者不怕反复获得相似情绪，怕的是场景、对手、情绪角度和代价奖励都不变。',
]

const OH_STORY_PAYOFF_ESCALATION_RULES = [
  '影响范围：个人 -> 群体 -> 社会。',
  '揭示深度：表象 -> 本质 -> 颠覆。',
  '身份落差：路人 -> 大佬 -> 全场震惊。',
]

const OH_STORY_EMOTIONAL_BONDING_SETUP_RULES = [
  '羁绊铺设：前 1/3 用具体物件、具体数字和重复动作建立关系质感，不能只写“他们很相爱/很重要”。',
  '具体数字建立时间和重量：年限、金额、次数、距离、日期要承担情绪意义。',
  '具体物件承载感情：信物、账本、旧衣、工具、伤痕或日常用品要能在后文被重新理解。',
  '重复动作建立习惯：每天、每周、每年或关键时刻反复出现的动作要能让读者相信关系。',
]

const OH_STORY_EMOTIONAL_TEAR_RULES = [
  '情感撕裂：中后段制造反差、错位或延迟真相，让读者以为 A 实际是 B。',
  '反差法：先展示温暖/可靠/正确的一面，再用残酷真相击碎。',
  '错位法：角色以为在保护、补偿或成全，实际正在伤害、误解或错过。',
  '延迟真相法：关键信息在读者最不期待的位置揭示，但必须有前文物件、数字、习惯或行为铺垫。',
]

const OH_STORY_EMOTIONAL_AFTERTASTE_RULES = [
  '余韵钝痛：结尾不用大哭大闹，用安静细节、物件回声或“不解释/不回头/不流泪”的留白击穿读者。',
  '日常动作承载巨大情感：继续喂粥、叠衣服、收起旧物、擦掉血迹、合上账本等动作要替代大段抒情。',
  '物件细节制造余韵：坏掉的信物、磨旧的物件、改动后的数字或残留痕迹要让读者回想前文羁绊。',
  '反转或爆点后 500 字内收束，不把余韵拖成解释、总结或升华。',
]

const OH_STORY_EMOTIONAL_TURNING_RULES = [
  '每 3-5 个小节有一次情绪转向，不能一路虐到底或一路爽到底。',
  '每次情绪转向都必须由事件触发，不能无理由从愤怒跳到释然、从压迫跳到爽感。',
  '最后一次情绪转向决定章尾余韵基调：痛快、释然、意难平、细思极恐或温暖遗憾。',
  '爽文允许快速反弹，虐文需要更长铺垫；题材节奏必须匹配目标读者。',
]

const OH_STORY_EMOTIONAL_RHYTHM_CURVE_RULES = [
  '情绪拉扯曲线参考：温暖 -> 残忍 -> 善意 -> 真相 -> 原谅 -> 来不及 -> 释然 -> 细节暴击。',
  '不是所有故事都走完整曲线；按题材、章节位置和目标读者选取需要的情绪段落，不要为了完整而拖慢节奏。',
  '每一次温暖、残忍、善意、真相或释然都必须绑定具体事件、物件、动作、对话或关系变化，不能只靠抽象心理词。',
]

const OH_STORY_GENRE_EMOTION_STRATEGY_RULES = [
  '世情/爽文：快速情绪反弹，打脸密度高，反派傲慢逐级升级，结尾追求痛快/解气。',
  '情感/虐心：羁绊细节密度高，温暖到冷却形成反差，结尾用安静物件细节收束，追求意难平/释然。',
  '古言/复仇：铺垫简洁，反打直接，暴力美学或权谋反证要落到具体动作，最大底牌放在后 1/4，结尾追求因果报应/大快人心。',
  '悬疑/推理：用信息差和排除结构推进，先揭发生了什么再揭为什么，结尾追求细思极恐/原来如此。',
  '年代/亲情：代际冲突不要简单站队，使用时代物件和习俗承载情感，慢速和解，结尾温暖中带遗憾。',
]

const OH_STORY_EMOTIONAL_FIRST_IMPRESSION_RULES = [
  '先入为主：塑造认知时先呈现的信息影响力更大，开篇必须先给读者正确的情绪判断。',
  '前100字必须让读者知道核心矛盾、主角处境或本章最重要的不公平/异常，不能先用无关铺陈稀释第一印象。',
  '否定提前：否定元素放前面会放大否定感；如果要否定配角、规则或关系，必须确认它服务本章情绪而不是误伤读者期待。',
]

const OH_STORY_EMOTIONAL_PEAK_END_RULES = [
  '峰终定律：读者对章节的记忆主要由情绪峰值和结尾决定，高潮与章尾不能平掉。',
  '结尾情绪必须高于起点；结尾情绪强度按题材校验：虐≥8、爽≥7、治愈≥6。',
  '结尾必须是具体动作、对话或画面，禁止用总结、反思或作者预告替代最后一击。',
  '结尾要有余韵和翻页压力：读者应带着未解问题、情绪回声或下一动作冲动继续读。',
]

const OH_STORY_EMOTIONAL_LAYER_RULES = [
  '三层情绪必须分离：角色自己的情绪、文本传递的情绪、读者实际感受要分别设计。',
  '同一场景三层可以完全不同：角色在哭，文本在撩，读者在爽。',
  '负面角色情绪要转成读者收益：屈辱、压迫、恐惧或难过必须让读者得到爽前蓄力、安全感、尊严感、期待感或余韵。',
  '自检时不能把“角色很痛苦”当成读者已被打动，必须指出文本如何让读者产生真正体验。',
]

const OH_STORY_EMOTIONAL_REACTION_STRUCTURE_RULES = [
  '前反应-复现-后反应：用于虐、悲壮、遗憾类场景；先让读者提前知道坏结果，再描写美好事物。',
  '复现：让坏结果真的发生，不能只靠旁白宣布结果。',
  '后反应：主角真情流露并作出改变，愤怒、拼命、振作或新选择必须成为后续行动。',
  '以小搏大：用于热血、逆袭类场景；先铺垫弱者的苦并用对比强化，再让强者到来承接“我知道你们苦，我来了”。',
  '士气如虹：以小搏大结构最后必须让弱势方被拯救，并让整体气势发生可见转变。',
]

const OH_STORY_EMOTIONAL_IDEOLOGICAL_CONFLICT_RULES = [
  '理念矛盾：理念之争比利益之争更能引发读者深层共鸣，关键冲突不能只停在资源争夺。',
  '少量关键场景即可，不需要大量笔墨；把原则、信念或世界观差异落到具体选择和代价上。',
  '理想主义与现实的冲突可用于塑造配角高光，让理念型角色承担追求和牺牲。',
  '理念认同 = 人设认同 = 读者情感投入；角色的立场必须能让读者理解其价值。',
  '在主线中穿插理念型角色，用他们的追求和牺牲拔高全书情绪上限。',
]

const OH_STORY_EMOTIONAL_FAILURE_MODE_GUARDS = [
  '太平：连续 5+ 小节没有情绪转折时，必须插入意外事件或新信息。',
  '太赶：重大转折只用 1 小节铺垫时，必须补至少 3 个铺垫点。',
  '假虐：读者不心疼只觉得难受时，必须回补具体羁绊细节。',
  '割裂：前后像两篇故事时，必须用伏笔、物件或主题贯穿。',
  '烂尾：反转后 500 字内收束，避免 2000 字继续解释。',
  '人设崩：关键行为必须符合前置人设、动机和关系状态。',
]

function emotionalArcExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.emotional_arc_contract
    || contextPackage?.chapter_target?.emotionalArcContract
    || contextPackage?.emotional_arc_contract
    || contextPackage?.emotionalArcContract
    || contextPackage?.pre_draft_brief?.emotional_arc_contract
    || contextPackage?.preDraftBrief?.emotionalArcContract
}

function inferEmotionalArcShape(text: string) {
  if (/虐|谷底|治愈|重新站起来|翻盘治愈/.test(text)) return 'V形'
  if (/BE|坠落|信任崩塌|背叛|甜.*刀|幸福.*破碎/.test(text)) return '倒V形'
  if (/多反转|反复拉扯|你来我往|又翻盘|多起伏|猜不到/.test(text)) return 'W形'
  if (/递进|层层|打脸|反证|反击|升级|压迫|公开|当众|爽感|翻盘/.test(text)) return '递进形'
  if (/隐忍|等待证据|等待底牌|延迟满足|铺垫.*爆发|最后.*爆发/.test(text)) return '延迟满足'
  if (/急转|颠覆|真相浮现|回看说通|身份错位/.test(text)) return '急转形'
  return '递进形'
}

function inferEmotionalPressureMethods(text: string) {
  const methods = []
  if (/公开|当众|审判|直播|典礼|会议|家宴|围观/.test(text)) methods.push('公开升级：把私下伤害搬到公开场合。')
  if (/背叛|调包|篡改|证据.*假|证人.*倒戈|第二层/.test(text)) methods.push('双重背叛：已知一层背叛后再加一层。')
  if (/代价|不行动|逼|认罪|失去|连累|倒计时|必须/.test(text)) methods.push('代价加速：不行动的代价不断升高。')
  if (/隐忍|沉默|等待|忍住|暂不反击/.test(text)) methods.push('战略性沉默：主角暂不反击，沉默本身持续加压。')
  return methods.length ? uniqueBriefStrings(methods, 4) : OH_STORY_EMOTIONAL_PRESSURE_METHODS.slice(0, 2)
}

function inferEmotionalPayoffTypes(text: string) {
  const types = []
  if (/碾压|实力|能力|轻松|降维/.test(text)) types.push('能力碾压')
  if (/目标|完成|达成|反证|破解|洗清|证明/.test(text)) types.push('目标达成')
  if (/资源|奖励|获得|收获|账本|证据|补给/.test(text)) types.push('收获盘点')
  if (/态度转变|震惊|敬佩|旁观者|全场|观众|改口/.test(text)) types.push('态度转变')
  if (/身份|掉马|马甲|幕后|真实/.test(text)) types.push('隐藏身份/掉马甲')
  if (/和解|圆满|喜欢|好感|关系修复/.test(text)) types.push('情感圆满度')
  return types.length ? uniqueBriefStrings(types, 6) : ['目标达成', '态度转变']
}

function normalizePayoffReverseDesignContract(value: any, payoffTypes: any[] = []) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const payoffTypeCandidates = asArray(source.payoff_type_candidates || source.payoffTypeCandidates)
    .map((item: any) => compactBriefText(item))
    .filter(Boolean)
  const designOrder = asArray(source.design_order || source.designOrder)
    .map((item: any) => compactBriefText(item))
    .filter(Boolean)
  const expectationPointRules = asArray(source.expectation_point_rules || source.expectationPointRules)
    .map((item: any) => compactBriefText(item))
    .filter(Boolean)
  const setupRules = asArray(source.setup_rules || source.setupRules)
    .map((item: any) => compactBriefText(item))
    .filter(Boolean)
  const qualityChecks = asArray(source.quality_checks || source.qualityChecks)
    .map((item: any) => compactBriefText(item))
    .filter(Boolean)
  return {
    version: source.version || OH_STORY_PAYOFF_REVERSE_DESIGN.version,
    design_order: designOrder.length ? designOrder : OH_STORY_PAYOFF_REVERSE_DESIGN.design_order,
    payoff_type_candidates: payoffTypeCandidates.length
      ? payoffTypeCandidates
      : asArray(payoffTypes).map((item: any) => compactBriefText(item)).filter(Boolean).length
        ? asArray(payoffTypes).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_EMOTIONAL_PAYOFF_TYPES,
    expectation_point_rules: expectationPointRules.length ? expectationPointRules : OH_STORY_PAYOFF_REVERSE_DESIGN.expectation_point_rules,
    setup_rules: setupRules.length ? setupRules : OH_STORY_PAYOFF_REVERSE_DESIGN.setup_rules,
    quality_checks: qualityChecks.length ? qualityChecks : OH_STORY_PAYOFF_REVERSE_DESIGN.quality_checks,
  }
}

function buildEmotionalSceneSteps(sceneCards: any[], fallbackCurve = '') {
  const steps = sceneCards.map((scene: any, index: number) => {
    const role = index === sceneCards.length - 1
      ? '释放'
      : index === 0
        ? '调动'
        : /reversal|turning_point|reader_payoff/.test(Object.keys(scene || {}).join('|')) || scene?.reversal || scene?.reader_payoff
          ? '释放前加压'
          : '调动'
    const text = compactBriefText(scene?.emotional_tone || scene?.reader_payoff || scene?.conflict || scene?.purpose || scene?.title)
    return compactBriefText(`场景${scene?.scene_no || index + 1}：${role}${text ? `｜${text}` : ''}`)
  }).filter(Boolean)
  if (steps.length) return steps
  return compactBriefText(fallbackCurve)
    ? [`情绪曲线：${compactBriefText(fallbackCurve)}`]
    : ['调动：制造压力/期待/不该如此', '释放：用行动结果、反应差异或新信息完成爽点']
}

export function buildEmotionalArcContract(project: any = {}, contextPackage: any = {}) {
  const explicit = emotionalArcExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildEmotionalArcContract(project, {
      ...(contextPackage || {}),
      emotional_arc_contract: null,
      emotionalArcContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            emotional_arc_contract: null,
            emotionalArcContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            emotional_arc_contract: null,
            emotionalArcContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            emotional_arc_contract: null,
            emotionalArcContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitSceneEmotionSteps = asArray(explicit.scene_emotion_steps || explicit.sceneEmotionSteps).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitPressureMethods = asArray(explicit.pressure_methods || explicit.pressureMethods).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitPayoffTypes = asArray(explicit.payoff_types || explicit.payoffTypes).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitPayoffEscalationRules = asArray(explicit.payoff_escalation_rules || explicit.payoffEscalationRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitPayoffTierRules = asArray(explicit.payoff_tier_rules || explicit.payoffTierRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitPayoffDensityRules = asArray(explicit.payoff_density_rules || explicit.payoffDensityRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitEmotionModuleRecompositionRules = asArray(explicit.emotion_module_recomposition_rules || explicit.emotionModuleRecompositionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const hydratedPayoffTypes = explicitPayoffTypes.length
      ? explicitPayoffTypes
      : asArray(derived.payoff_types).length ? asArray(derived.payoff_types) : OH_STORY_EMOTIONAL_PAYOFF_TYPES
    const explicitSceneExecutionRules = asArray(explicit.scene_execution_rules || explicit.sceneExecutionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitExpectationRules = asArray(explicit.expectation_rules || explicit.expectationRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSafetyRules = asArray(explicit.safety_rules || explicit.safetyRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitBondingSetupRules = asArray(explicit.bonding_setup_rules || explicit.bondingSetupRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitEmotionalTearRules = asArray(explicit.emotional_tear_rules || explicit.emotionalTearRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitLingeringAftertasteRules = asArray(explicit.lingering_aftertaste_rules || explicit.lingeringAftertasteRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitEmotionalTurningRules = asArray(explicit.emotional_turning_rules || explicit.emotionalTurningRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitEmotionalRhythmCurveRules = asArray(explicit.emotional_rhythm_curve_rules || explicit.emotionalRhythmCurveRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitGenreEmotionStrategyRules = asArray(explicit.genre_emotion_strategy_rules || explicit.genreEmotionStrategyRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitFirstImpressionRules = asArray(explicit.first_impression_rules || explicit.firstImpressionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitPeakEndRules = asArray(explicit.peak_end_rules || explicit.peakEndRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitEmotionLayerRules = asArray(explicit.emotion_layer_rules || explicit.emotionLayerRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitReactionStructureRules = asArray(explicit.reaction_structure_rules || explicit.reactionStructureRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitIdeologicalConflictRules = asArray(explicit.ideological_conflict_rules || explicit.ideologicalConflictRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitFailureModeGuards = asArray(explicit.failure_mode_guards || explicit.failureModeGuards).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitProgressiveConfrontationRules = asArray(explicit.progressive_confrontation_rules || explicit.progressiveConfrontationRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitMemePlotFormulaRules = asArray(explicit.meme_plot_formula_rules || explicit.memePlotFormulaRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitReaderDesireFormulaRules = asArray(explicit.reader_desire_formula_rules || explicit.readerDesireFormulaRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_emotional_arc_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      emotion_formula: compactBriefText(explicit.emotion_formula || explicit.emotionFormula, '平静 -> 调动 -> 释放 -> 爽'),
      arc_shape: compactBriefText(explicit.arc_shape || explicit.arcShape, derived.arc_shape || inferEmotionalArcShape(String(explicit.arc_shape || explicit.arcShape || ''))),
      scene_emotion_steps: explicitSceneEmotionSteps.length ? explicitSceneEmotionSteps : asArray(derived.scene_emotion_steps),
      pressure_methods: explicitPressureMethods.length
        ? explicitPressureMethods
        : asArray(derived.pressure_methods).length ? asArray(derived.pressure_methods) : OH_STORY_EMOTIONAL_PRESSURE_METHODS,
      payoff_types: hydratedPayoffTypes,
      payoff_reverse_design: normalizePayoffReverseDesignContract(explicit.payoff_reverse_design || explicit.payoffReverseDesign, hydratedPayoffTypes),
      payoff_tier_rules: explicitPayoffTierRules.length
        ? explicitPayoffTierRules
        : asArray(derived.payoff_tier_rules).length ? asArray(derived.payoff_tier_rules) : OH_STORY_PAYOFF_TIER_RULES,
      payoff_density_rules: explicitPayoffDensityRules.length
        ? explicitPayoffDensityRules
        : asArray(derived.payoff_density_rules).length ? asArray(derived.payoff_density_rules) : OH_STORY_PAYOFF_DENSITY_RULES,
      emotion_module_recomposition_rules: explicitEmotionModuleRecompositionRules.length
        ? explicitEmotionModuleRecompositionRules
        : asArray(derived.emotion_module_recomposition_rules).length ? asArray(derived.emotion_module_recomposition_rules) : OH_STORY_EMOTION_MODULE_RECOMPOSITION_RULES,
      payoff_escalation_rules: explicitPayoffEscalationRules.length
        ? explicitPayoffEscalationRules
        : asArray(derived.payoff_escalation_rules).length ? asArray(derived.payoff_escalation_rules) : OH_STORY_PAYOFF_ESCALATION_RULES,
      scene_execution_rules: explicitSceneExecutionRules.length
        ? explicitSceneExecutionRules
        : asArray(derived.scene_execution_rules).length ? asArray(derived.scene_execution_rules) : OH_STORY_EMOTIONAL_SCENE_EXECUTION_RULES,
      expectation_rules: explicitExpectationRules.length
        ? explicitExpectationRules
        : asArray(derived.expectation_rules).length ? asArray(derived.expectation_rules) : OH_STORY_EMOTIONAL_EXPECTATION_RULES,
      safety_rules: explicitSafetyRules.length ? explicitSafetyRules : asArray(derived.safety_rules),
      bonding_setup_rules: explicitBondingSetupRules.length
        ? explicitBondingSetupRules
        : asArray(derived.bonding_setup_rules).length ? asArray(derived.bonding_setup_rules) : OH_STORY_EMOTIONAL_BONDING_SETUP_RULES,
      emotional_tear_rules: explicitEmotionalTearRules.length
        ? explicitEmotionalTearRules
        : asArray(derived.emotional_tear_rules).length ? asArray(derived.emotional_tear_rules) : OH_STORY_EMOTIONAL_TEAR_RULES,
      lingering_aftertaste_rules: explicitLingeringAftertasteRules.length
        ? explicitLingeringAftertasteRules
        : asArray(derived.lingering_aftertaste_rules).length ? asArray(derived.lingering_aftertaste_rules) : OH_STORY_EMOTIONAL_AFTERTASTE_RULES,
      emotional_turning_rules: explicitEmotionalTurningRules.length
        ? explicitEmotionalTurningRules
        : asArray(derived.emotional_turning_rules).length ? asArray(derived.emotional_turning_rules) : OH_STORY_EMOTIONAL_TURNING_RULES,
      emotional_rhythm_curve_rules: explicitEmotionalRhythmCurveRules.length
        ? explicitEmotionalRhythmCurveRules
        : asArray(derived.emotional_rhythm_curve_rules).length ? asArray(derived.emotional_rhythm_curve_rules) : OH_STORY_EMOTIONAL_RHYTHM_CURVE_RULES,
      genre_emotion_strategy_rules: explicitGenreEmotionStrategyRules.length
        ? explicitGenreEmotionStrategyRules
        : asArray(derived.genre_emotion_strategy_rules).length ? asArray(derived.genre_emotion_strategy_rules) : OH_STORY_GENRE_EMOTION_STRATEGY_RULES,
      first_impression_rules: explicitFirstImpressionRules.length
        ? explicitFirstImpressionRules
        : asArray(derived.first_impression_rules).length ? asArray(derived.first_impression_rules) : OH_STORY_EMOTIONAL_FIRST_IMPRESSION_RULES,
      peak_end_rules: explicitPeakEndRules.length
        ? explicitPeakEndRules
        : asArray(derived.peak_end_rules).length ? asArray(derived.peak_end_rules) : OH_STORY_EMOTIONAL_PEAK_END_RULES,
      emotion_layer_rules: explicitEmotionLayerRules.length
        ? explicitEmotionLayerRules
        : asArray(derived.emotion_layer_rules).length ? asArray(derived.emotion_layer_rules) : OH_STORY_EMOTIONAL_LAYER_RULES,
      reaction_structure_rules: explicitReactionStructureRules.length
        ? explicitReactionStructureRules
        : asArray(derived.reaction_structure_rules).length ? asArray(derived.reaction_structure_rules) : OH_STORY_EMOTIONAL_REACTION_STRUCTURE_RULES,
      ideological_conflict_rules: explicitIdeologicalConflictRules.length
        ? explicitIdeologicalConflictRules
        : asArray(derived.ideological_conflict_rules).length ? asArray(derived.ideological_conflict_rules) : OH_STORY_EMOTIONAL_IDEOLOGICAL_CONFLICT_RULES,
      failure_mode_guards: explicitFailureModeGuards.length
        ? explicitFailureModeGuards
        : asArray(derived.failure_mode_guards).length ? asArray(derived.failure_mode_guards) : OH_STORY_EMOTIONAL_FAILURE_MODE_GUARDS,
      progressive_confrontation_rules: explicitProgressiveConfrontationRules.length
        ? explicitProgressiveConfrontationRules
        : asArray(derived.progressive_confrontation_rules).length ? asArray(derived.progressive_confrontation_rules) : OH_STORY_PROGRESSIVE_CONFRONTATION_RULES,
      meme_plot_formula_rules: explicitMemePlotFormulaRules.length
        ? explicitMemePlotFormulaRules
        : asArray(derived.meme_plot_formula_rules).length ? asArray(derived.meme_plot_formula_rules) : OH_STORY_MEME_PLOT_FORMULA_RULES,
      reader_desire_formula_rules: explicitReaderDesireFormulaRules.length
        ? explicitReaderDesireFormulaRules
        : asArray(derived.reader_desire_formula_rules).length ? asArray(derived.reader_desire_formula_rules) : OH_STORY_READER_DESIRE_FORMULA_RULES,
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_EMOTIONAL_ARC_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : ['补调动铺垫', '补释放爽点', '修断期待', '补下行情节安全感', '让爽点递增'],
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const text = [
    project?.genre,
    project?.synopsis,
    contextPackage?.writing_bible?.style_lock?.emotional_curve,
    target.emotional_curve,
    target.summary,
    target.conflict,
    target.ending_hook,
    ...sceneCards.flatMap((scene: any) => [scene.title, scene.purpose, scene.conflict, scene.emotional_tone, scene.reader_payoff, scene.reversal, scene.ending_hook_seed]),
  ].filter(Boolean).join(' ')
  const payoffTypes = inferEmotionalPayoffTypes(text)
  return {
    version: 'oh_story_emotional_arc_v1',
    source: 'oh_story_embedded_fallback',
    emotion_formula: '平静 -> 调动 -> 释放 -> 爽',
    arc_shape: inferEmotionalArcShape(text),
    scene_emotion_steps: buildEmotionalSceneSteps(sceneCards, target.emotional_curve),
    pressure_methods: inferEmotionalPressureMethods(text),
    payoff_types: payoffTypes,
    payoff_reverse_design: normalizePayoffReverseDesignContract(null, payoffTypes),
    payoff_tier_rules: OH_STORY_PAYOFF_TIER_RULES,
    payoff_density_rules: OH_STORY_PAYOFF_DENSITY_RULES,
    emotion_module_recomposition_rules: OH_STORY_EMOTION_MODULE_RECOMPOSITION_RULES,
    payoff_escalation_rules: OH_STORY_PAYOFF_ESCALATION_RULES,
    scene_execution_rules: OH_STORY_EMOTIONAL_SCENE_EXECUTION_RULES,
    expectation_rules: OH_STORY_EMOTIONAL_EXPECTATION_RULES,
    safety_rules: [
      '下行情节中必须给读者看见潜在解法、底牌、收获或反击窗口。',
      '读者未代入主角前，不要把对手写得过于可怜。',
    ],
    bonding_setup_rules: OH_STORY_EMOTIONAL_BONDING_SETUP_RULES,
    emotional_tear_rules: OH_STORY_EMOTIONAL_TEAR_RULES,
    lingering_aftertaste_rules: OH_STORY_EMOTIONAL_AFTERTASTE_RULES,
    emotional_turning_rules: OH_STORY_EMOTIONAL_TURNING_RULES,
    emotional_rhythm_curve_rules: OH_STORY_EMOTIONAL_RHYTHM_CURVE_RULES,
    genre_emotion_strategy_rules: OH_STORY_GENRE_EMOTION_STRATEGY_RULES,
    first_impression_rules: OH_STORY_EMOTIONAL_FIRST_IMPRESSION_RULES,
    peak_end_rules: OH_STORY_EMOTIONAL_PEAK_END_RULES,
    emotion_layer_rules: OH_STORY_EMOTIONAL_LAYER_RULES,
    reaction_structure_rules: OH_STORY_EMOTIONAL_REACTION_STRUCTURE_RULES,
    ideological_conflict_rules: OH_STORY_EMOTIONAL_IDEOLOGICAL_CONFLICT_RULES,
    failure_mode_guards: OH_STORY_EMOTIONAL_FAILURE_MODE_GUARDS,
    progressive_confrontation_rules: OH_STORY_PROGRESSIVE_CONFRONTATION_RULES,
    meme_plot_formula_rules: OH_STORY_MEME_PLOT_FORMULA_RULES,
    reader_desire_formula_rules: OH_STORY_READER_DESIRE_FORMULA_RULES,
    quality_checks: OH_STORY_EMOTIONAL_ARC_CHECKS,
    revision_priorities: ['补调动铺垫', '补释放爽点', '修断期待', '补下行情节安全感', '让爽点递增'],
  }
}

const OH_STORY_CHAPTER_OPENING_HOOK_RULES = [
  '章首 7 式：悬念对话开局、闪前碎片、倒计时开局、神秘独白、反差场景、未完成动作开局、意象预示。',
  '章首前 100 字必须有钩子，不能用纯风景、天气、醒来、赶路或背景介绍开头。',
  '开篇钩子要服务本章目标：直接冲击、制造好奇或对比冲击三选一，不要为悬念而悬念。',
]

const OH_STORY_CHAPTER_ENDING_HOOK_RULES = [
  '章尾 13 式：突然揭示、紧急危机、未完成动作、身份反转、两难抉择、神秘物品、倒计时、承诺/威胁、离奇消失、隐藏含义、意象钩子、回声钩子、留白钩子。',
  '章末约 100 字点到即止，最后一幕必须留下读者想翻下一页的问题、危险、反转、选择或未完成收益。',
  '章尾钩子必须由本章现场触发，不能用“更大的风暴即将来临”等作者预告替代。',
]

const OH_STORY_CHAPTER_HOOK_FORBIDDEN = [
  '假悬念：威胁不存在或立刻解除。',
  '机械降神：章尾抛危机，下章靠巧合解决。',
  '过度留白：连续多章不揭示任何信息。',
  '低风险钩：用无关紧要的事制造悬念。',
  '同类型连用：连续 3 章以上用同一种钩子类型。',
]

const OH_STORY_CHAPTER_HOOK_CHECKS = [
  '章首前 100 字必须落地一个明确钩子，且能归入章首 7 式之一。',
  '章尾必须落地一个明确翻页钩子，且能归入章尾 13 式之一。',
  '钩子强度必须匹配章节阶段：第1章必须强，2-3章强，中期日常中，高高潮前强，大结局收束。',
  '章首钩子、场景推进和章尾钩子必须服务同一章目标，不能互相断裂。',
  '钩子必须有兑现路径：不能是假悬念、低风险钩、机械降神或过度留白。',
  '连续章节不能机械重复同一种钩子类型；重复时必须改变信息、风险、情绪或兑现方式。',
]

function chapterHookExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.chapter_hook_contract
    || contextPackage?.chapter_target?.chapterHookContract
    || contextPackage?.chapter_hook_contract
    || contextPackage?.chapterHookContract
    || contextPackage?.pre_draft_brief?.chapter_hook_contract
    || contextPackage?.preDraftBrief?.chapterHookContract
}

function inferOpeningHookType(text: string) {
  if (/倒计时|三分钟|零点|午夜|期限|还剩|最后\d|最后[一二三四五六七八九十]?天|时间不够/.test(text)) return '倒计时开局'
  if (/^\s*[“"']|对话|他说|她说|问道|回答/.test(text)) return '悬念对话开局'
  if (/后来|多年后|事后|才知道|那天/.test(text)) return '闪前碎片'
  if (/我一直|独白|心里|梦见|回忆/.test(text)) return '神秘独白'
  if (/一边|另一边|反差|婚礼|医院|同时/.test(text)) return '反差场景'
  if (/刚|正要|伸手|开门|插进|突然|打断/.test(text)) return '未完成动作开局'
  if (/天边|窗台|花|钟|雨|血|影子|意象/.test(text)) return '意象预示'
  return '未完成动作开局'
}

function inferChapterHookStrength(chapterNo: number, text: string) {
  if (chapterNo === 1) return '必须强'
  if (chapterNo >= 2 && chapterNo <= 3) return '强'
  if (/高潮前|决战|卷末|危机升级|真相|反转/.test(text)) return '强'
  if (/大结局|完结|收束|尾声/.test(text)) return '收束'
  return '中'
}

export function buildChapterHookContract(project: any = {}, contextPackage: any = {}) {
  const explicit = chapterHookExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildChapterHookContract(project, {
      ...(contextPackage || {}),
      chapter_hook_contract: null,
      chapterHookContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            chapter_hook_contract: null,
            chapterHookContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            chapter_hook_contract: null,
            chapterHookContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            chapter_hook_contract: null,
            chapterHookContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitOpeningHookRules = asArray(explicit.opening_hook_rules || explicit.openingHookRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitEndingHookRules = asArray(explicit.ending_hook_rules || explicit.endingHookRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitForbiddenPatterns = asArray(explicit.forbidden_patterns || explicit.forbiddenPatterns).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_chapter_hook_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      opening_hook_type: compactBriefText(explicit.opening_hook_type || explicit.openingHookType, derived.opening_hook_type || '未完成动作开局'),
      ending_hook_type: compactBriefText(explicit.ending_hook_type || explicit.endingHookType, derived.ending_hook_type || '突然揭示'),
      hook_strength: compactBriefText(explicit.hook_strength || explicit.hookStrength, derived.hook_strength || '中'),
      opening_hook_rules: explicitOpeningHookRules.length ? explicitOpeningHookRules : asArray(derived.opening_hook_rules),
      ending_hook_rules: explicitEndingHookRules.length ? explicitEndingHookRules : asArray(derived.ending_hook_rules),
      forbidden_patterns: explicitForbiddenPatterns.length ? explicitForbiddenPatterns : asArray(derived.forbidden_patterns),
      quality_checks: explicitQualityChecks.length ? explicitQualityChecks : asArray(derived.quality_checks),
      revision_priorities: explicitRevisionPriorities.length ? explicitRevisionPriorities : asArray(derived.revision_priorities),
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const firstScene = sceneCards[0] || {}
  const lastScene = sceneCards[sceneCards.length - 1] || {}
  const openingText = [
    target.opening_hook,
    firstScene.opening_hook,
    firstScene.title,
    firstScene.purpose,
    firstScene.conflict,
  ].filter(Boolean).join(' ')
  const endingText = [
    target.ending_hook,
    lastScene.ending_hook_seed,
    lastScene.reader_payoff,
    lastScene.reversal,
    lastScene.purpose,
  ].filter(Boolean).join(' ')
  const allText = [project?.genre, project?.synopsis, target.summary, target.conflict, openingText, endingText].filter(Boolean).join(' ')
  return {
    version: 'oh_story_chapter_hook_v1',
    source: 'oh_story_embedded_fallback',
    opening_hook_type: inferOpeningHookType(openingText || allText),
    ending_hook_type: inferEndingHookType(endingText || allText),
    hook_strength: inferChapterHookStrength(Number(target.chapter_no || 0), allText),
    opening_hook_rules: OH_STORY_CHAPTER_OPENING_HOOK_RULES,
    ending_hook_rules: OH_STORY_CHAPTER_ENDING_HOOK_RULES,
    forbidden_patterns: OH_STORY_CHAPTER_HOOK_FORBIDDEN,
    quality_checks: OH_STORY_CHAPTER_HOOK_CHECKS,
    revision_priorities: ['补前100字钩子', '重做章尾翻页钩子', '修假悬念/低风险钩', '避免同类型连用', '让钩子服务本章目标'],
  }
}

const OH_STORY_PARAGRAPH_HOOK_TYPES = [
  '信息差',
  '倒计时',
  '反转',
  '暗牌',
  '打脸',
  '代价',
  '弱者/孩子',
  '灵魂旁观',
  '异常物件',
  '假意顺从',
  '冷发现',
]

const OH_STORY_PARAGRAPH_HOOK_COMBINATIONS = [
  '信息差 + 暗牌',
  '倒计时 + 代价',
  '反转 + 打脸',
  '弱者 + 代价',
  '暗牌 + 打脸',
  '异常物件 + 冷发现',
  '灵魂旁观 + 弱者',
  '假意顺从 + 暗牌',
  '阶梯背叛 + 冷发现',
]

const OH_STORY_PARAGRAPH_HOOK_FORBIDDEN = [
  '假悬念：只摆姿态，不给真实问题、危险、信息差或代价。',
  '机械降神：段落制造危机，下一段靠巧合或外力无代价解除。',
  '过度留白：连续留谜但不给读者可推理的新信息。',
  '低风险钩：用无关痛痒的小事假装紧张。',
  '同类型连用：连续段落只重复同一种钩子，信息、风险和情绪没有递进。',
]

const OH_STORY_DIALOGUE_ESCALATION = [
  '对话情绪五级递增：客观陈述事实 -> 客观陈述 + 提出建议 -> 主观指责 -> 主观指责 + 强制命令 -> 主观指责 + PUA抬升自己。',
]

const OH_STORY_SPECTATOR_LAYERS = [
  '低质量：路人只喊震惊、厉害、怎么可能，不能替代剧情反应。',
  '中质量：旁观者有身份、立场和利益，反应能证明主角行动影响局面。',
  '高质量：熟人、权威、敌对者、受害者或受益者分层反应，分别改变舆论、权力、关系或下一步选择。',
]

const OH_STORY_UNFAIR_INJURY_HOOKS = [
  '利益转移型：主角被迫承担别人获利后的后果。',
  '损失转嫁型：对手把错误、成本或惩罚甩到主角身上。',
  '针锋相对型：主角被当众压迫后用证据、规则或行动反打。',
]

const OH_STORY_PARAGRAPH_HOOK_CHECKS = [
  '每 3-5 段必须出现一个段落级钩子，能归入段落级钩子 11 种之一，并带来信息、风险、情绪或关系变化。',
  '关键段落必须使用钩子组合，优先信息差 + 暗牌、倒计时 + 代价、反转 + 打脸、暗牌 + 打脸或异常物件 + 冷发现。',
  '对话冲突必须体现对话情绪五级递增，不能全程平铺直叙或只互相解释设定。',
  '打脸、揭露、反证或公开冲突场景必须有围观者质量层级，至少出现一层中/高质量旁观反应。',
  '不公平伤害必须有利益转移、损失转嫁或针锋相对的可见伤害，并让读者看到主角反击窗口。',
  '段落钩子不能是假悬念、机械降神、过度留白、低风险钩或同类型连用。',
]

function paragraphHookExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.paragraph_hook_contract
    || contextPackage?.chapter_target?.paragraphHookContract
    || contextPackage?.paragraph_hook_contract
    || contextPackage?.paragraphHookContract
    || contextPackage?.pre_draft_brief?.paragraph_hook_contract
    || contextPackage?.preDraftBrief?.paragraphHookContract
}

function inferParagraphHookTypes(text: string) {
  const hits: string[] = []
  if (/不知道|隐瞒|真相|以为|误会|信息差|是否|为什么/.test(text)) hits.push('信息差')
  if (/倒计时|还剩|零点|期限|最后|立刻|马上/.test(text)) hits.push('倒计时')
  if (/反转|竟然|却|原来|调包|证明|露出/.test(text)) hits.push('反转')
  if (/暗牌|底牌|账本|证据|屏风|藏着|后手/.test(text)) hits.push('暗牌')
  if (/打脸|反打|当众|围观|态度转变|审判|逼.*认罪/.test(text)) hits.push('打脸')
  if (/代价|损失|惩罚|承担|受伤|消耗/.test(text)) hits.push('代价')
  if (/孩子|弱者|无辜|弟子|新人|受害者/.test(text)) hits.push('弱者/孩子')
  if (/旁观|灵魂|围观者|众人|长老|熟人/.test(text)) hits.push('灵魂旁观')
  if (/物件|钥匙|账本|戒指|屏风|异常|残骨|符/.test(text)) hits.push('异常物件')
  if (/顺从|认罪|低头|假意|配合|答应/.test(text)) hits.push('假意顺从')
  if (/冷发现|忽然发现|才发现|无声|冰冷|名单/.test(text)) hits.push('冷发现')
  return uniqueBriefStrings(hits.length ? hits : ['信息差', '暗牌', '打脸'], 8)
}

function inferHookCombinations(types: string[], text: string) {
  const normalized = types.join(' ')
  const combinations = OH_STORY_PARAGRAPH_HOOK_COMBINATIONS.filter(item => {
    const [left, right] = item.split(' + ')
    return normalized.includes(left) && normalized.includes(right)
  })
  if (/暗牌|底牌|证据|账本/.test(text) && /打脸|反打|当众|态度转变/.test(text)) combinations.push('暗牌 + 打脸')
  if (/倒计时|期限|立刻/.test(text) && /代价|惩罚|损失/.test(text)) combinations.push('倒计时 + 代价')
  if (/异常|物件|账本|钥匙|戒指/.test(text) && /发现|揭示|露出/.test(text)) combinations.push('异常物件 + 冷发现')
  return uniqueBriefStrings(combinations.length ? combinations : ['信息差 + 暗牌'], 6)
}

export function buildParagraphHookContract(project: any = {}, contextPackage: any = {}) {
  const explicit = paragraphHookExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildParagraphHookContract(project, {
      ...(contextPackage || {}),
      paragraph_hook_contract: null,
      paragraphHookContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            paragraph_hook_contract: null,
            paragraphHookContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            paragraph_hook_contract: null,
            paragraphHookContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            paragraph_hook_contract: null,
            paragraphHookContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitMicroHookTypes = asArray(explicit.micro_hook_types || explicit.microHookTypes).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitHookCombinations = asArray(explicit.hook_combinations || explicit.hookCombinations).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitDialogueEscalation = asArray(explicit.dialogue_escalation || explicit.dialogueEscalation).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSpectatorLayers = asArray(explicit.spectator_layers || explicit.spectatorLayers).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitUnfairInjuryHooks = asArray(explicit.unfair_injury_hooks || explicit.unfairInjuryHooks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitForbiddenPatterns = asArray(explicit.forbidden_patterns || explicit.forbiddenPatterns).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_paragraph_hook_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      micro_hook_types: explicitMicroHookTypes.length ? explicitMicroHookTypes : asArray(derived.micro_hook_types),
      hook_combinations: explicitHookCombinations.length ? explicitHookCombinations : asArray(derived.hook_combinations),
      dialogue_escalation: explicitDialogueEscalation.length ? explicitDialogueEscalation : asArray(derived.dialogue_escalation),
      spectator_layers: explicitSpectatorLayers.length ? explicitSpectatorLayers : asArray(derived.spectator_layers),
      unfair_injury_hooks: explicitUnfairInjuryHooks.length ? explicitUnfairInjuryHooks : asArray(derived.unfair_injury_hooks),
      forbidden_patterns: explicitForbiddenPatterns.length ? explicitForbiddenPatterns : asArray(derived.forbidden_patterns),
      quality_checks: explicitQualityChecks.length ? explicitQualityChecks : asArray(derived.quality_checks),
      revision_priorities: explicitRevisionPriorities.length ? explicitRevisionPriorities : asArray(derived.revision_priorities),
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const text = [
    project?.genre,
    project?.synopsis,
    target.summary,
    target.conflict,
    target.ending_hook,
    ...sceneCards.flatMap((scene: any) => [
      scene.title,
      scene.purpose,
      scene.conflict,
      scene.information_gap,
      scene.reversal,
      scene.reader_payoff,
      scene.key_dialogue,
      scene.ending_hook_seed,
      ...asArray(scene.characters_present),
    ]),
  ].filter(Boolean).join(' ')
  const microHookTypes = inferParagraphHookTypes(text)
  return {
    version: 'oh_story_paragraph_hook_v1',
    source: 'oh_story_embedded_fallback',
    micro_hook_types: microHookTypes,
    hook_combinations: inferHookCombinations(microHookTypes, text),
    dialogue_escalation: OH_STORY_DIALOGUE_ESCALATION,
    spectator_layers: OH_STORY_SPECTATOR_LAYERS,
    unfair_injury_hooks: OH_STORY_UNFAIR_INJURY_HOOKS,
    forbidden_patterns: OH_STORY_PARAGRAPH_HOOK_FORBIDDEN,
    quality_checks: OH_STORY_PARAGRAPH_HOOK_CHECKS,
    revision_priorities: ['补段落级钩子', '补钩子组合', '补对话情绪递进', '补围观者分层反应', '修假悬念/低风险钩'],
  }
}

const OH_STORY_SUSPENSE_INFORMATION_TEMPLATES = [
  '直白剧情：提出疑问 -> 公布答案。',
  '探索剧情：提出疑问 -> 正常提示 -> 公布答案。',
  '意外剧情：提出疑问 -> 虚假提示 -> 公布答案。',
  '意外+反转：提出疑问 -> 虚假提示1 -> 虚假对立提示2 -> 公布答案。',
]

const OH_STORY_SUSPENSE_STRENGTH_LEVELS = [
  '1 微悬念：好奇，过渡章至少达到。',
  '2 小悬念：想看下一段，正文章至少达到。',
  '3 中悬念：想看下一章，关键章至少达到。',
  '4 大悬念：放不下书，爆发章使用。',
  '5 极悬念：睡不着，卷末高潮使用。',
]

const OH_STORY_SUSPENSE_TRIGGER_LAYERS = [
  '第1层：展示初步成果 -> 观众初步反应。',
  '第2层：揭示这还不是最终结果 -> 观众期待升级。',
  '第3层：展示超出预期的元素 -> 观众震惊。',
  '第4层：主角还能进一步提升 -> 留下钩子，开启下一段。',
]

const OH_STORY_SUSPENSE_EXPECTATION_LAYERS = [
  '两长一短：短期下章期待、中期本卷期待、远期全书期待必须同时至少保留两条。',
  '期待接力：长期待回收前先铺好下一层期待，短期期待爆发后立刻生成新问题。',
  '不间断钩子链：主角得到答案、资源或爽点之前，必须套上另一个更具体的钩子。',
]

const OH_STORY_SUSPENSE_MULTI_LINE_RULES = [
  '多线悬念：短弧2-3章，中弧5-8章，长弧贯穿整卷。',
  '任何时刻至少两条悬念线运行，不能在当前谜题兑现后清空期待。',
  '短弧给下章翻页，中弧给剧情单元牵引，长弧给卷目标或主线谜团持续存在感。',
]

const OH_STORY_SUSPENSE_READER_PREKNOWLEDGE_RULES = [
  '读者预知法：提前告诉读者将发生大事件，让读者知道但主角不知道。',
  '倒计时变体：每隔1-2章放一小段进展，让读者持续等主角撞上真相。',
  '预知信息必须转化为压力、误判或行动选择，不能只做旁白剧透。',
]

const OH_STORY_SUSPENSE_INFORMATION_GAP_RULES = [
  '信息差运用：读者知道主角获得强力物品或底牌，但配角/反派不知道。',
  '反派恰好被主角底牌或规则理解克制，读者提前知道克制关系。',
  '别人拿更好装备却失败，主角用信息差或规则理解反杀。',
  '信息差抹平时 = 爽点爆发，必须让角色反应和局势变化同时兑现。',
]

const OH_STORY_SUSPENSE_TRUMP_CARD_PREPOSITION_RULES = [
  '底牌前置法：先展示主角底牌，再安排找事冲突。',
  '必须同时准备两对信息组合：底牌 + 即将发生的冲突。',
  '底牌展示不能直接剧透结果，要让读者知道有反制可能，但还想看怎样兑现。',
]

const OH_STORY_SUSPENSE_FORESHADOWING_BOUNDARY_RULES = [
  '谜语人是故意不说明，伏笔是巧妙融入剧情、自然不刻意。',
  '信息延迟超过3章且中间无任何推进，就是谜语人，必须删掉或提前给。',
  '短期紧张用悬念，长期线索用伏笔，两者不能混淆。',
  '伏笔要藏进动作、物件、误判、环境回声或角色习惯里，后续揭示时让读者觉得原来如此。',
]

const OH_STORY_SUSPENSE_SHOCK_LAYERS = [
  '点震惊：单个角色出现即时反应。',
  '网震惊：关系网多人、多立场反应，证明事件影响面。',
  '深度震惊：成就1震惊 -> 成就2震惊 -> 更强成就3引爆，并伴随道具、环境或权力结构变化。',
  '高位者震惊：权威/高阶角色反应拉高读者对主角后续的期待。',
]

const OH_STORY_SUSPENSE_FORBIDDEN = [
  '悬念和伏笔不能混淆：短期紧张是悬念，长期线索才是伏笔。',
  '虚假提示必须可信，不能为了反转而硬骗读者。',
  '每个悬念点必须有角色反应验证力度，没有反应等于落空。',
  '下行只制造小波折，不能让主角真憋屈到读者弃读。',
  '解决一个麻烦后必须引出新困境，不能让麻烦消失。',
]

const OH_STORY_SUSPENSE_CHECKS = [
  '悬念等级必须达标：过渡章至少微悬念，正文章至少小悬念，关键章至少中悬念，爆发章至少大悬念。',
  '四种悬念信息顺序模板必须清晰，疑问、提示、虚假提示、答案不能乱序或缺失。',
  '期待链不能断裂：章末至少保留一个未解问题或未达成期待，并维持短/中/远至少两条期待线。',
  '三段钩子要完成种、养、收：前30%埋种，中50%加压，末20%引爆或延迟引爆。',
  '伏笔不是谜语人：长期线索要自然融入并持续推进，信息延迟超过3章且中间无推进时必须提前给或删除。',
  '触发型分层钩子必须有角色反应验证力度，不能只靠旁白说紧张。',
  '震惊分层必须从点、网、深度或高位者反应中选择合适层级，并用可视化变化支撑。',
  '信息差必须存在且有兑现路径，读者/角色/反派之间的信息差抹平时要形成爽点释放。',
  '读者预知法必须给出“读者知道但主角不知道”的压力，并在1-2章内推进倒计时或后果。',
  '底牌前置法必须同时交代底牌 + 即将发生的冲突，让读者期待底牌如何兑现。',
  '多线悬念必须保持短弧、中弧、长弧至少两条同时运行。',
  '麻烦不能消失：每次解决后必须留下新困境、新问题或更高层期待。',
]

function suspenseExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.suspense_contract
    || contextPackage?.chapter_target?.suspenseContract
    || contextPackage?.suspense_contract
    || contextPackage?.suspenseContract
    || contextPackage?.pre_draft_brief?.suspense_contract
    || contextPackage?.preDraftBrief?.suspenseContract
}

function inferSuspenseInformationTemplates(text: string) {
  const hits: string[] = []
  if (/假提示|虚假|误导|以为|伪装/.test(text)) hits.push('意外剧情')
  if (/反转|对立提示|却|原来|背面|第二行/.test(text)) hits.push('意外+反转')
  if (/线索|追查|提示|探索|调查|缺页/.test(text)) hits.push('探索剧情')
  if (/疑问|问题|答案|公布|揭示|发现/.test(text)) hits.push('直白剧情')
  return uniqueBriefStrings(hits.length ? hits : ['探索剧情'], 4)
}

function inferSuspenseStrength(chapterNo: number, text: string) {
  if (/卷末|决战|终极|大反转|睡不着/.test(text)) return '5 极悬念'
  if (/爆发|高潮|大危机/.test(text)) return '4 大悬念'
  if (chapterNo <= 3 || /关键|缺页|规则|身份|反转|谜题|真相|零点|倒计时/.test(text)) return '3 中悬念'
  if (/过渡|日常|赶路/.test(text)) return '1 微悬念'
  return '2 小悬念'
}

function buildSuspenseCycle(sceneCards: any[], target: any) {
  const first = sceneCards[0] || {}
  const middle = sceneCards.length > 2 ? sceneCards[Math.floor(sceneCards.length / 2)] : sceneCards[1] || first
  const last = sceneCards[sceneCards.length - 1] || middle || first
  return [
    `种：${compactBriefText(first.information_gap || first.opening_hook || first.purpose || target.summary, '前30%提出读者要追的问题')}`,
    `养：${compactBriefText(middle.reversal || middle.conflict || middle.reader_payoff || target.conflict, '中50%用提示/误导/加压让读者意识到不对劲')}`,
    `收：${compactBriefText(last.ending_hook_seed || target.ending_hook || last.reversal, '末20%引爆或延迟引爆到下一章')}`,
  ]
}

export function buildSuspenseContract(project: any = {}, contextPackage: any = {}) {
  const explicit = suspenseExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildSuspenseContract(project, {
      ...(contextPackage || {}),
      suspense_contract: null,
      suspenseContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            suspense_contract: null,
            suspenseContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            suspense_contract: null,
            suspenseContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            suspense_contract: null,
            suspenseContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitInformationOrderTemplates = asArray(explicit.information_order_templates || explicit.informationOrderTemplates).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSuspenseCycle = asArray(explicit.suspense_cycle || explicit.suspenseCycle).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitTriggerLayers = asArray(explicit.trigger_layers || explicit.triggerLayers).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitExpectationLayers = asArray(explicit.expectation_layers || explicit.expectationLayers).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitExpectationChain = normalizeSuspenseExpectationChainContract(explicit.expectation_chain || explicit.expectationChain)
    const explicitMultiLineSuspenseRules = asArray(explicit.multi_line_suspense_rules || explicit.multiLineSuspenseRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitReaderPreknowledgeRules = asArray(explicit.reader_preknowledge_rules || explicit.readerPreknowledgeRules || explicit.reader_precognition_rules || explicit.readerPrecognitionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitInformationGapRules = asArray(explicit.information_gap_rules || explicit.informationGapRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitTrumpCardPrepositionRules = asArray(explicit.trump_card_preposition_rules || explicit.trumpCardPrepositionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitForeshadowingBoundaryRules = asArray(explicit.foreshadowing_boundary_rules || explicit.foreshadowingBoundaryRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitShockLayers = asArray(explicit.shock_layers || explicit.shockLayers).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitForbiddenPatterns = asArray(explicit.forbidden_patterns || explicit.forbiddenPatterns).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_suspense_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      information_order_templates: explicitInformationOrderTemplates.length ? explicitInformationOrderTemplates : asArray(derived.information_order_templates),
      suspense_strength: compactBriefText(explicit.suspense_strength || explicit.suspenseStrength, derived.suspense_strength || '2 小悬念'),
      suspense_cycle: explicitSuspenseCycle.length ? explicitSuspenseCycle : asArray(derived.suspense_cycle),
      trigger_layers: explicitTriggerLayers.length ? explicitTriggerLayers : asArray(derived.trigger_layers),
      expectation_layers: explicitExpectationLayers.length ? explicitExpectationLayers : asArray(derived.expectation_layers),
      expectation_chain: explicitExpectationChain || normalizeSuspenseExpectationChainContract(derived.expectation_chain || derived.expectationChain),
      multi_line_suspense_rules: explicitMultiLineSuspenseRules.length
        ? explicitMultiLineSuspenseRules
        : asArray(derived.multi_line_suspense_rules).length ? asArray(derived.multi_line_suspense_rules) : OH_STORY_SUSPENSE_MULTI_LINE_RULES,
      reader_preknowledge_rules: explicitReaderPreknowledgeRules.length
        ? explicitReaderPreknowledgeRules
        : asArray(derived.reader_preknowledge_rules).length ? asArray(derived.reader_preknowledge_rules) : OH_STORY_SUSPENSE_READER_PREKNOWLEDGE_RULES,
      information_gap_rules: explicitInformationGapRules.length
        ? explicitInformationGapRules
        : asArray(derived.information_gap_rules).length ? asArray(derived.information_gap_rules) : OH_STORY_SUSPENSE_INFORMATION_GAP_RULES,
      trump_card_preposition_rules: explicitTrumpCardPrepositionRules.length
        ? explicitTrumpCardPrepositionRules
        : asArray(derived.trump_card_preposition_rules).length ? asArray(derived.trump_card_preposition_rules) : OH_STORY_SUSPENSE_TRUMP_CARD_PREPOSITION_RULES,
      foreshadowing_boundary_rules: explicitForeshadowingBoundaryRules.length
        ? explicitForeshadowingBoundaryRules
        : asArray(derived.foreshadowing_boundary_rules).length ? asArray(derived.foreshadowing_boundary_rules) : OH_STORY_SUSPENSE_FORESHADOWING_BOUNDARY_RULES,
      shock_layers: explicitShockLayers.length ? explicitShockLayers : asArray(derived.shock_layers),
      forbidden_patterns: explicitForbiddenPatterns.length ? explicitForbiddenPatterns : asArray(derived.forbidden_patterns),
      quality_checks: explicitQualityChecks.length ? explicitQualityChecks : asArray(derived.quality_checks),
      revision_priorities: explicitRevisionPriorities.length ? explicitRevisionPriorities : asArray(derived.revision_priorities),
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const text = [
    project?.genre,
    project?.synopsis,
    target.summary,
    target.conflict,
    target.ending_hook,
    ...sceneCards.flatMap((scene: any) => [
      scene.title,
      scene.purpose,
      scene.conflict,
      scene.information_gap,
      scene.reversal,
      scene.reader_payoff,
      scene.opening_hook,
      scene.ending_hook_seed,
    ]),
  ].filter(Boolean).join(' ')
  return {
    version: 'oh_story_suspense_v1',
    source: 'oh_story_embedded_fallback',
    information_order_templates: inferSuspenseInformationTemplates(text),
    suspense_strength: inferSuspenseStrength(Number(target.chapter_no || 0), text),
    suspense_cycle: buildSuspenseCycle(sceneCards, target),
    trigger_layers: OH_STORY_SUSPENSE_TRIGGER_LAYERS,
    expectation_layers: OH_STORY_SUSPENSE_EXPECTATION_LAYERS,
    expectation_chain: {
      active_lines: [
        '短期期待：解决本章当前疑问或危险。',
        '中期期待：追查当前线索背后的更大规则、名单、势力或资源。',
        '长期期待：保留主线谜团、身份真相、旧案、终极敌人或终局目标。',
      ],
      carry_rules: ['至少两条期待线必须同时运行，当前谜题兑现后不能清空期待。'],
      next_open_loop: ['每章结尾至少留下一个未解决问题、未达成期待、新门槛、新线索或新困境。'],
    },
    multi_line_suspense_rules: OH_STORY_SUSPENSE_MULTI_LINE_RULES,
    reader_preknowledge_rules: OH_STORY_SUSPENSE_READER_PREKNOWLEDGE_RULES,
    information_gap_rules: OH_STORY_SUSPENSE_INFORMATION_GAP_RULES,
    trump_card_preposition_rules: OH_STORY_SUSPENSE_TRUMP_CARD_PREPOSITION_RULES,
    foreshadowing_boundary_rules: OH_STORY_SUSPENSE_FORESHADOWING_BOUNDARY_RULES,
    shock_layers: OH_STORY_SUSPENSE_SHOCK_LAYERS,
    forbidden_patterns: OH_STORY_SUSPENSE_FORBIDDEN,
    quality_checks: OH_STORY_SUSPENSE_CHECKS,
    revision_priorities: ['补悬念等级', '重排信息顺序', '补期待接力', '修悬念伏笔边界', '补角色反应', '补震惊分层', '防止麻烦消失'],
  }
}

const OH_STORY_REVERSAL_TYPES = [
  '身份反转',
  '视角反转',
  '动机反转',
  '时间线反转',
  '信息反转',
  '认知反转',
  '无反转',
]

const OH_STORY_REVERSAL_SETUP_REQUIREMENTS = [
  '身份反转：必须埋3处暗示（行为细节），禁止靠叙述者直接说明。',
  '视角反转：所有叙述都是真实事实，但不是全部事实；引入另一角色视角打破认知。',
  '动机反转：给表面动机，同时埋下与表面动机不一致的小行为。',
  '时间线反转：不撒谎，只调整叙述顺序，用时态、季节、物品新旧做天然线索。',
  '信息反转：先给可靠来源的旧事实，再用新证据直接否定旧事实。',
  '认知反转：全程积累一种感情色彩，结尾用遗物、证据或行动翻转情感判断。',
]

const OH_STORY_REVERSAL_MISDIRECTION_METHODS = [
  '选择性叙述：主角只关注某些信息，读者跟着走错方向。',
  '情绪引导：用情绪场景引导读者判断。',
  '红鲱鱼：可疑角色或事件必须有自己的剧情功能，只是不是答案。',
  '刻板印象利用：利用社会认知偏见，但不能欺骗读者。',
  '信息分层：真相和假信息混在一起，揭示时让前文获得新解读。',
]

const OH_STORY_REVERSAL_TIMING_RULES = [
  '单层反转最优区间 70-85%，禁止50%之前揭示，禁止95%之后才揭示。',
  '双层反转：第一层55-65%，第二层80-90%。',
  '揭示不超过300字，要快速、干脆；揭示后必须展示影响。',
  '双层反转第一层后给1-2段消化时间，第二层必须能同时解释A和B。',
]

const OH_STORY_REVERSAL_FACE_SLAP_RHYTHM = [
  '打脸节奏：压抑不能太长，压的同时必须给读者信心暗示。',
  '主动挑衅->打脸：简单粗暴，适合小白爽点。',
  '对手挑衅->被打脸：压主角同时给安全感和反击暗示。',
  '借他人之手打脸：支持者代为回击，保持主角高逼格。',
  '高潮部分要拉长，最大化球迷/旁观者/赛后跟进等反应。',
]

const OH_STORY_REVERSAL_FORBIDDEN = [
  '天降反转：前面完全没铺垫。',
  '解释过多：大段文字解释反转。',
  '反转太弱：读者早就猜到且没有情绪升级。',
  '反转太多：3个以上反转堆在一起。',
  '反转无感：只改变信息，不改变情绪。',
  '反转作弊：引入前面不存在的新信息或对读者撒谎。',
]

const OH_STORY_REVERSAL_CHECKS = [
  '回看铺垫至少有3处暗示指向反转，且暗示来自行为、物件、时间线、证据或反常选择。',
  '反转不依赖巧合，必须由角色选择、证据变化、视角补全或旧信息被否定推动。',
  '反转后情绪强度必须高于反转前，并改变读者对前面剧情的理解。',
  '读者有可能在反转前猜到：没有撒谎，只是没说出全部真相。',
  '揭示方式自然，不靠角色大段独白解释；揭示不超过300字。',
  '揭示后必须有足够篇幅展示影响：关系变化、局势翻盘、身份后果或下一层冲突。',
  '误导技巧必须公平：红鲱鱼有剧情功能，选择性叙述和情绪引导不能欺骗读者。',
  '打脸节奏必须有信心暗示、压迫长度控制和高潮反应，不能让主角长时间自暴自弃。',
]

function reversalExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.reversal_contract
    || contextPackage?.chapter_target?.reversalContract
    || contextPackage?.reversal_contract
    || contextPackage?.reversalContract
    || contextPackage?.pre_draft_brief?.reversal_contract
    || contextPackage?.preDraftBrief?.reversalContract
}

function inferReversalTypes(text: string) {
  const hits: string[] = []
  if (/账本|证据|伪证|调包|旧事实|新证据|否定|DNA|遗嘱/.test(text)) hits.push('信息反转')
  if (/身份|面具|旧部|真身|马甲|证人不是|陌生人/.test(text)) hits.push('身份反转')
  if (/视角|证词|另一.*角度|没看到|旁观/.test(text)) hits.push('视角反转')
  if (/动机|二选一|真正原因|表面.*真正|选择/.test(text)) hits.push('动机反转')
  if (/时间线|时间戳|顺序|之前|之后|旧.*新/.test(text)) hits.push('时间线反转')
  if (/认知|原来一直|恨|亏欠|感情色彩|重新理解/.test(text)) hits.push('认知反转')
  return uniqueBriefStrings(hits.length ? hits : ['信息反转'], 4)
}

function buildReversalSetupPlan(types: string[], sceneCards: any[], target: any) {
  const sceneHints = sceneCards
    .flatMap((scene: any, index: number) => [
      scene.information_gap ? `铺垫${index + 1}：${compactBriefText(scene.information_gap)}` : '',
      scene.reversal ? `揭示${index + 1}：${compactBriefText(scene.reversal)}` : '',
    ])
    .filter(Boolean)
  const typeHints = types.map(type => {
    if (type === '身份反转') return '身份反转铺垫：至少3处行为细节暗示真实身份。'
    if (type === '信息反转') return '信息反转铺垫：可靠旧事实必须被后果中的矛盾证据逐步动摇。'
    if (type === '动机反转') return '动机反转铺垫：高压二选一时让角色选择暴露真动机。'
    if (type === '视角反转') return '视角反转铺垫：先给片面事实，再用另一角色视角补全。'
    return `${type}铺垫：反转前必须有公平线索，反转后能解释前文。`
  })
  return uniqueBriefStrings([...typeHints, ...sceneHints, target.ending_hook ? `章末影响：${target.ending_hook}` : ''], 10)
}

export function buildReversalContract(project: any = {}, contextPackage: any = {}) {
  const explicit = reversalExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildReversalContract(project, {
      ...(contextPackage || {}),
      reversal_contract: null,
      reversalContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            reversal_contract: null,
            reversalContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            reversal_contract: null,
            reversalContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            reversal_contract: null,
            reversalContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitReversalTypes = asArray(explicit.reversal_types || explicit.reversalTypes).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSetupRequirements = asArray(explicit.setup_requirements || explicit.setupRequirements).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSetupPlan = asArray(explicit.setup_plan || explicit.setupPlan).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitMisdirectionMethods = asArray(explicit.misdirection_methods || explicit.misdirectionMethods).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitTimingRules = asArray(explicit.timing_rules || explicit.timingRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitFaceSlapRhythm = asArray(explicit.face_slap_rhythm || explicit.faceSlapRhythm).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitForbiddenPatterns = asArray(explicit.forbidden_patterns || explicit.forbiddenPatterns).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_reversal_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      reversal_types: explicitReversalTypes.length ? explicitReversalTypes : asArray(derived.reversal_types),
      setup_requirements: explicitSetupRequirements.length ? explicitSetupRequirements : asArray(derived.setup_requirements),
      setup_plan: explicitSetupPlan.length ? explicitSetupPlan : asArray(derived.setup_plan),
      misdirection_methods: explicitMisdirectionMethods.length ? explicitMisdirectionMethods : asArray(derived.misdirection_methods),
      timing_rules: explicitTimingRules.length ? explicitTimingRules : asArray(derived.timing_rules),
      face_slap_rhythm: explicitFaceSlapRhythm.length ? explicitFaceSlapRhythm : asArray(derived.face_slap_rhythm),
      forbidden_patterns: explicitForbiddenPatterns.length ? explicitForbiddenPatterns : asArray(derived.forbidden_patterns),
      quality_checks: explicitQualityChecks.length ? explicitQualityChecks : asArray(derived.quality_checks),
      revision_priorities: explicitRevisionPriorities.length ? explicitRevisionPriorities : asArray(derived.revision_priorities),
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const text = [
    project?.genre,
    project?.synopsis,
    target.summary,
    target.conflict,
    target.ending_hook,
    ...sceneCards.flatMap((scene: any) => [
      scene.title,
      scene.purpose,
      scene.conflict,
      scene.information_gap,
      scene.reversal,
      scene.reader_payoff,
      scene.ending_hook_seed,
    ]),
  ].filter(Boolean).join(' ')
  const reversalTypes = inferReversalTypes(text)
  return {
    version: 'oh_story_reversal_v1',
    source: 'oh_story_embedded_fallback',
    reversal_types: reversalTypes,
    setup_requirements: OH_STORY_REVERSAL_SETUP_REQUIREMENTS,
    setup_plan: buildReversalSetupPlan(reversalTypes, sceneCards, target),
    misdirection_methods: OH_STORY_REVERSAL_MISDIRECTION_METHODS,
    timing_rules: OH_STORY_REVERSAL_TIMING_RULES,
    face_slap_rhythm: OH_STORY_REVERSAL_FACE_SLAP_RHYTHM,
    forbidden_patterns: OH_STORY_REVERSAL_FORBIDDEN,
    quality_checks: OH_STORY_REVERSAL_CHECKS,
    revision_priorities: ['补3处暗示', '补公平误导', '压缩解释独白', '展示反转影响', '强化打脸节奏'],
  }
}

const OH_STORY_SHOWDOWN_PAYOFF_RELEASE_RULES = [
  '该爽不爽，比毒点还毒；主角该赢、该亮底牌、该压制时必须让读者看到结果。',
  '底牌释放后，反派就要受到对应的压制，不能立刻反打主角或让主角继续委屈。',
  '寸止可以，拉扯可以，但别让主角委屈；延迟释放必须同时给读者明确胜利信号。',
  '爽点不是解释设定，而是压迫解除、地位反转、证据落地、资源到手或关系态度改变。',
]

const OH_STORY_SHOWDOWN_TRUMP_CARD_RESERVE_RULES = [
  '底牌管理：手里始终保持2-3个未揭示的底牌，不能把后续章节的牌一次性倒空。',
  '每次只出1个底牌；一次出牌只解决当前矛盾的关键扣，不顺手清掉所有后续期待。',
  '出牌后必须补新牌、新技能、新资源、新限制或更高门槛，让读者知道下一轮还有可期待的后手。',
  '底牌释放后既要有压制效果，也要留下未揭示底牌或新后手，避免爽点落地后长线期待断档。',
]

const OH_STORY_SHOWDOWN_INVINCIBLE_PROTAGONIST_RULES = [
  '无敌文唯一铁律：主角登场时一点都不能拖拉，该出手就直接压制。',
  '开头塑造主角杀伐果断的性格 + 战力前置无敌，形成主角登场就会大杀四方的期待。',
  '不一击必杀时必须有明确理由：保留线索、钓出幕后、规则限制或更大目标，不能嘴炮磨叽。',
  '读者已经不爽时，主角登场必须给强势解决信号，不能为了拖字数降智绕圈。',
]

const OH_STORY_SHOWDOWN_THREE_PRESSURE_SHOCK_RULES = [
  '三压一爆三震：一压友好势力，让他们先觉得主角是大佬或值得期待。',
  '二压敌方势力，至少两次铺垫不服、挑衅或逼主角上场，压力要递进。',
  '三压中立势力，让评判者、旁观权威或规则方观望/加压，形成第三重压力。',
  '一爆是主角出手碾压；三震必须分别写友方、敌方、中立方的不同震动，不能只写“众人震惊”。',
]

const OH_STORY_SHOWDOWN_STAGE_CHAIN_RULES = [
  '装逼打脸要有舞台：先铺人际关系铺垫，再铺利益压力，再让主角在公开场合完成反压。',
  '围观层级按群众层 -> 中间层 -> 核心层递进；每一层反应必须推动声望、利益或局势变化。',
  '群众层负责直观震惊，中间层负责专业判断，核心层负责权力/资源/规则层面的重新评估。',
  '公开审判、擂台、会议、直播、宗门大殿、宴会和比赛等场景必须让舞台服务爽点，而不是只当背景。',
]

const OH_STORY_SHOWDOWN_TRANSMISSION_CHANNEL_RULES = [
  '装逼前必须先铺设人际关系，否则没有传递通道。',
  '主角与群众层、中间层或核心层至少建立一种可见联系：救助、利益、师承、欠债、旧情、认可或共同目标。',
  '爽点释放后，传递通道必须让态度、利益计算、声望、资源或规则评价发生变化。',
  '震惊不仅正向上行，也可以由核心层反向传回群众层，形成装逼闭环。',
]

const OH_STORY_SHOWDOWN_SHOCK_CHAIN_RULES = [
  '主角行动 -> 第一层震惊 -> 传递到第二层 -> 传递到核心层；震惊必须形成传递链。',
  '震惊不只是“好厉害”，而是“这跟我有关系”；每层反应要基于自身利益和目标。',
  '震惊不是统一的“倒吸一口凉气”；不同身份、知识水平和利害关系的人必须有不同反应。',
  '震惊反应要反过来放大主角收益：名望、资源、关系、规则权限或敌人破防。',
]

const OH_STORY_SHOWDOWN_COMBAT_DESIGN_RULES = [
  '打斗是一场表演，是主角展示收获的舞台，必须服务于爽点。',
  '动作过程必须让读者看懂：起手、试探、受阻、代价、反制、结果至少形成清晰链条。',
  '战斗/智斗不只写输赢，要写主角新能力、新资源、新认知或新关系如何改变局面。',
  '智斗的本质是信息差的博弈；证据、时机、视角、规则、心理和利益计算都要进入对抗。',
]

const OH_STORY_SHOWDOWN_WEAK_OVER_STRONG_RULES = [
  '以弱胜强必须有逻辑：信息差、环境利用、心理博弈至少命中一项。',
  '可以超越极限强行使用高阶能力，但要付出明确代价，并让代价进入后续状态。',
  '强敌不能降智送赢；主角赢要来自准备、规则理解、证据链、资源调度或关键选择。',
  '反派压迫越强，主角反制越要给可见依据，不能靠天降设定或旁白宣布。',
]

const OH_STORY_SHOWDOWN_COUNTERPLAY_LAYERS = [
  '反派强时三层破局：硬碰硬、预判反制、反预判。',
  '预判反制：反派出A，主角早准备B克制A。',
  '反预判：反派精心准备针对A，主角不仅避开A，还利用A作陷阱引导反派落入预设B。',
  '核心爽点是主角在更高层面的思考、准备和掌控力；计谋要比反派更早一层。',
]

const OH_STORY_SHOWDOWN_EMOTION_RHYTHM_RULES = [
  '情绪节奏执行急 -> 缓 -> 急：先压迫，再给短暂判断/铺垫，最后集中释放。',
  '压迫段不能过长；压的同时必须给读者信心暗示、底牌影子或反制可能。',
  '释放后要有回响：群众、对手、核心人物和主角状态都要发生变化。',
  '高潮后需要短冷却承接下一钩子，不能爽点落地后直接散场。',
]

const OH_STORY_SHOWDOWN_QUALITY_CHECKS = [
  '爽点到位：该赢、该压、该亮底牌时必须给足结果。',
  '底牌管理：每次只出1个底牌，保留2-3个未揭示后手，并在出牌后补新技能、新资源或新门槛。',
  '三压一爆三震：友方、敌方、中立方先各自形成压力，主角一爆碾压后，三方都要有差异震动。',
  '主角不委屈：拉扯可以，但不能长期让主角被动挨打或被反派反压。',
  '铺垫充分：舞台、人际关系、利益压力和反制依据必须提前落地。',
  '传递通道：装逼前必须有人际关系或利益关系，爽点释放后能改变他人态度、利益或规则评价。',
  '震惊分层：群众层、中间层、核心层反应必须不同，并基于各自利益。',
  '舞台够大：公开场合、权力结构或关系网络必须放大结果。',
  '战斗服务于爽点：打斗/智斗展示主角收获，而不是空转动作。',
  '三层破局：强敌越强，越要写出主角提前准备、预判反制和反预判陷阱。',
  '无敌文主角不拖拉：该压制时直接压制，不能为了拖字数降智绕圈。',
  '情绪节奏：急 -> 缓 -> 急，压迫、判断、释放和回响要清楚。',
  '以弱胜强有逻辑：信息差、环境利用、心理博弈或明确代价必须成立。',
  '装逼闭环：挑衅、压迫、亮点、反打、反应、局势变化必须闭环。',
]

export function showdownExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.showdown_contract
    || contextPackage?.chapter_target?.showdownContract
    || contextPackage?.showdown_contract
    || contextPackage?.showdownContract
    || contextPackage?.pre_draft_brief?.showdown_contract
    || contextPackage?.preDraftBrief?.showdownContract
}

function hasShowdownSignals(text: string) {
  return /打脸|爽点|底牌|审判|公开|反压|反制|战斗|打斗|智斗|斗法|秒杀|碾压|破防|震惊|群众|观众|长老席|会长|反派|擂台|直播|亮牌|亮底/.test(text)
}

export function buildShowdownContract(project: any = {}, contextPackage: any = {}) {
  const explicit = showdownExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildShowdownContract(project, {
      ...(contextPackage || {}),
      showdown_contract: null,
      showdownContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            showdown_contract: null,
            showdownContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            showdown_contract: null,
            showdownContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            showdown_contract: null,
            showdownContract: null,
          }
        : contextPackage?.chapter_target,
    }) || {}
    const list = (snake: string, camel: string, fallback: any[]) => {
      const explicitList = asArray(explicit?.[snake] || explicit?.[camel]).map((item: any) => compactBriefText(item)).filter(Boolean)
      return explicitList.length ? explicitList : (asArray(derived?.[snake]).length ? asArray(derived?.[snake]) : fallback)
    }
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_showdown_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      payoff_release_rules: list('payoff_release_rules', 'payoffReleaseRules', OH_STORY_SHOWDOWN_PAYOFF_RELEASE_RULES),
      trump_card_reserve_rules: list('trump_card_reserve_rules', 'trumpCardReserveRules', OH_STORY_SHOWDOWN_TRUMP_CARD_RESERVE_RULES),
      invincible_protagonist_rules: list('invincible_protagonist_rules', 'invincibleProtagonistRules', OH_STORY_SHOWDOWN_INVINCIBLE_PROTAGONIST_RULES),
      three_pressure_shock_rules: list('three_pressure_shock_rules', 'threePressureShockRules', OH_STORY_SHOWDOWN_THREE_PRESSURE_SHOCK_RULES),
      stage_chain_rules: list('stage_chain_rules', 'stageChainRules', OH_STORY_SHOWDOWN_STAGE_CHAIN_RULES),
      transmission_channel_rules: list('transmission_channel_rules', 'transmissionChannelRules', OH_STORY_SHOWDOWN_TRANSMISSION_CHANNEL_RULES),
      shock_chain_rules: list('shock_chain_rules', 'shockChainRules', OH_STORY_SHOWDOWN_SHOCK_CHAIN_RULES),
      combat_design_rules: list('combat_design_rules', 'combatDesignRules', OH_STORY_SHOWDOWN_COMBAT_DESIGN_RULES),
      weak_over_strong_rules: list('weak_over_strong_rules', 'weakOverStrongRules', OH_STORY_SHOWDOWN_WEAK_OVER_STRONG_RULES),
      counterplay_layers: list('counterplay_layers', 'counterplayLayers', OH_STORY_SHOWDOWN_COUNTERPLAY_LAYERS),
      emotion_rhythm_rules: list('emotion_rhythm_rules', 'emotionRhythmRules', OH_STORY_SHOWDOWN_EMOTION_RHYTHM_RULES),
      quality_checks: explicitQualityChecks.length ? explicitQualityChecks : (asArray(derived.quality_checks).length ? asArray(derived.quality_checks) : OH_STORY_SHOWDOWN_QUALITY_CHECKS),
      revision_priorities: explicitRevisionPriorities.length
        ? explicitRevisionPriorities
        : (asArray(derived.revision_priorities).length
            ? asArray(derived.revision_priorities)
            : ['补爽点释放强度', '补底牌管理', '补三压一爆三震', '补舞台层级', '补震惊分层', '补战斗/智斗逻辑', '补急-缓-急情绪节奏']),
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const text = [
    project?.genre,
    project?.synopsis,
    target.title,
    target.summary,
    target.conflict,
    target.ending_hook,
    ...sceneCards.flatMap((scene: any) => [
      scene.title,
      scene.purpose,
      scene.conflict,
      scene.reader_payoff,
      scene.reversal,
      scene.turning_point,
      scene.ending_hook_seed,
      scene.showoff_stage_chain,
      scene.showoffStageChain,
      scene.spectator_interest_shift,
      scene.spectatorInterestShift,
      scene.secondary_showoff_effect,
      scene.secondaryShowoffEffect,
      scene.combat_result_type,
      scene.combatResultType,
      scene.combat_dimension_plan,
      scene.combatDimensionPlan,
      scene.combat_reversal_plan,
      scene.combatReversalPlan,
      ...asArray(scene.action_beats || scene.actionBeats),
    ]),
  ].filter(Boolean).join(' ')
  if (!hasShowdownSignals(text)) return null
  return {
    version: 'oh_story_showdown_v1',
    source: 'oh_story_embedded_fallback',
    payoff_release_rules: OH_STORY_SHOWDOWN_PAYOFF_RELEASE_RULES,
    trump_card_reserve_rules: OH_STORY_SHOWDOWN_TRUMP_CARD_RESERVE_RULES,
    invincible_protagonist_rules: OH_STORY_SHOWDOWN_INVINCIBLE_PROTAGONIST_RULES,
    three_pressure_shock_rules: OH_STORY_SHOWDOWN_THREE_PRESSURE_SHOCK_RULES,
    stage_chain_rules: OH_STORY_SHOWDOWN_STAGE_CHAIN_RULES,
    transmission_channel_rules: OH_STORY_SHOWDOWN_TRANSMISSION_CHANNEL_RULES,
    shock_chain_rules: OH_STORY_SHOWDOWN_SHOCK_CHAIN_RULES,
    combat_design_rules: OH_STORY_SHOWDOWN_COMBAT_DESIGN_RULES,
    weak_over_strong_rules: OH_STORY_SHOWDOWN_WEAK_OVER_STRONG_RULES,
    counterplay_layers: OH_STORY_SHOWDOWN_COUNTERPLAY_LAYERS,
    emotion_rhythm_rules: OH_STORY_SHOWDOWN_EMOTION_RHYTHM_RULES,
    quality_checks: OH_STORY_SHOWDOWN_QUALITY_CHECKS,
    revision_priorities: ['补爽点释放强度', '补底牌管理', '补三压一爆三震', '补舞台层级', '补震惊分层', '补战斗/智斗逻辑', '补急-缓-急情绪节奏'],
  }
}

const OH_STORY_BRIDGE_UNIT_FOUR_CHAPTER_ROLES = [
  '四章一桥段：第一章上负责代入，写日常、熟悉角色互动和 N+1 原则。',
  '第一章下负责信息差，展示对手、困境、规则压力或更高门槛。',
  '第二章负责拉扯增强，放大配角反应、利益压力和行动阻碍；结尾必须让主角开始装。',
  '第三章负责兑现，把爽感写透，是桥段里最好写、也最该展开的一章。',
  '第四章负责承上启下，收尾当前阶段，或在旧期待兑现前开启下个目标。',
]

const OH_STORY_BRIDGE_UNIT_EXPECTATION_CHAIN_RULES = [
  '不间断期待：即将得到但还没得到时期待感最高，正文要持续保留未完成动作或未落地回报。',
  '高潮中埋钩子：兑现当前爽点前，先埋下新问题、新门槛、新敌意或新收益。',
  '得到之前套上另一个钩子，形成“兑现旧期待 -> 开启新期待”的循环。',
  '一本书随时保持两条以上期待线：大期待稳定牵引，小支线穿插提供即时反馈。',
]

const OH_STORY_BRIDGE_UNIT_CLIMAX_DURATION_RULES = [
  '大高潮应在 7-10 天阅读节奏内完成，超过 10 天容易让读者反感或疲劳。',
  '小高潮约 3 天阅读节奏内完成，不能无限拖延一个局部问题。',
  '高潮结束后允许 1-2 章日常过渡，但过渡必须推进关系、伏笔、状态或下一目标。',
  '金手指刚好解决当前矛盾后，必须暴露更大矛盾，形成层层递进。',
]

const OH_STORY_BRIDGE_UNIT_TRANSITION_RULES = [
  '阶段衔接三解法：高潮中埋钩子、尾巴给目标、连续小期待。',
  '尾巴给目标：章末必须让读者知道下一步要争什么、怕什么或等什么。',
  '连续小期待：大目标之间用小门槛、小胜负、小信息差维持阅读牵引。',
  '兑现不能散场：旧期待落地后，立刻让新目标、新代价或新关系变化进入正文。',
]

const OH_STORY_BRIDGE_UNIT_FATIGUE_REPAIR_RULES = [
  '连续 2 章没有目标推进、阻碍升级或新信息，下一章必须提高冲突密度。',
  '连续 2 章只爆点不留反应余波，必须插入 1-2 个承接场景，但承接场景必须推进关系、伏笔或状态。',
  '连续铺垫无回报时，优先补短回报、阶段性胜利或明确倒计时。',
  '连续兑现无新门槛时，优先补新目标、新资源限制或更大矛盾。',
]

const OH_STORY_BRIDGE_UNIT_QUALITY_CHECKS = [
  '桥段位置清楚：本章属于四章一桥段的代入、信息差、拉扯增强、兑现或承上启下。',
  '连续期待不断：旧期待兑现前必须挂上新期待，不能爽点落地后空窗。',
  '目标推进可见：目标、阻碍、行动、反馈、提升、新目标至少推进一项。',
  '疲劳修复有效：连续 2 章无推进要提高冲突密度，连续 2 章只爆点要补承接余波。',
  '高潮时长可控：小高潮不拖，大高潮不无限延期，高潮后过渡必须有功能。',
  '阶段衔接有效：高潮中埋钩子、尾巴给目标或连续小期待至少命中一项。',
]

function bridgeUnitExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.bridge_unit_contract
    || contextPackage?.chapter_target?.bridgeUnitContract
    || contextPackage?.bridge_unit_contract
    || contextPackage?.bridgeUnitContract
    || contextPackage?.pre_draft_brief?.bridge_unit_contract
    || contextPackage?.preDraftBrief?.bridgeUnitContract
}

function inferBridgePosition(chapterNo: number) {
  if (!chapterNo) return '未定位：按当前 scene_cards 和 next_batch_brief 判断桥段位置。'
  const position = ((chapterNo - 1) % 4) + 1
  if (position === 1) return '四章桥段第1章：代入与信息差，先稳住角色互动，再抛出对手/困境。'
  if (position === 2) return '四章桥段第2章：拉扯增强，阻碍升级，章尾让主角开始装。'
  if (position === 3) return '四章桥段第3章：兑现爽点，把阶段回报写透。'
  return '四章桥段第4章：承上启下，收束旧期待并开启下个目标。'
}

function buildBridgeUnitPlan(contextPackage: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const nextBatch = nextBatchBriefFromContext(contextPackage) || {}
  const storyUnit = target.story_unit_context || target.storyUnitContext || contextPackage?.story_unit_context || contextPackage?.storyUnitContext || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  return uniqueBriefStrings([
    compactBriefText(nextBatch.batch_goal || nextBatch.batchGoal || storyUnit.unit_goal || storyUnit.unitGoal),
    ...asArray(nextBatch.chapters).map((item: any) => compactBriefText([item.chapter_no ? `第${item.chapter_no}章` : '', item.role, item.goal || item.summary].filter(Boolean).join('：'))),
    ...sceneCards.map((scene: any) => compactBriefText([scene.title, scene.purpose, scene.reader_payoff, scene.ending_hook_seed].filter(Boolean).join('：'))),
    target.ending_hook ? `章尾目标：${compactBriefText(target.ending_hook)}` : '',
  ], 10)
}

export function buildBridgeUnitContract(project: any = {}, contextPackage: any = {}) {
  const explicit = bridgeUnitExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildBridgeUnitContract(project, {
      ...(contextPackage || {}),
      bridge_unit_contract: null,
      bridgeUnitContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            bridge_unit_contract: null,
            bridgeUnitContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            bridge_unit_contract: null,
            bridgeUnitContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            bridge_unit_contract: null,
            bridgeUnitContract: null,
          }
        : contextPackage?.chapter_target,
    }) || {}
    const list = (snake: string, camel: string, fallback: any[]) => {
      const explicitList = asArray(explicit?.[snake] || explicit?.[camel]).map((item: any) => compactBriefText(item)).filter(Boolean)
      return explicitList.length ? explicitList : (asArray(derived?.[snake]).length ? asArray(derived?.[snake]) : fallback)
    }
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_bridge_unit_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      bridge_position: compactBriefText(explicit.bridge_position || explicit.bridgePosition, derived.bridge_position),
      bridge_unit_plan: list('bridge_unit_plan', 'bridgeUnitPlan', asArray(derived.bridge_unit_plan)),
      four_chapter_roles: list('four_chapter_roles', 'fourChapterRoles', OH_STORY_BRIDGE_UNIT_FOUR_CHAPTER_ROLES),
      expectation_chain_rules: list('expectation_chain_rules', 'expectationChainRules', OH_STORY_BRIDGE_UNIT_EXPECTATION_CHAIN_RULES),
      climax_duration_rules: list('climax_duration_rules', 'climaxDurationRules', OH_STORY_BRIDGE_UNIT_CLIMAX_DURATION_RULES),
      transition_rules: list('transition_rules', 'transitionRules', OH_STORY_BRIDGE_UNIT_TRANSITION_RULES),
      fatigue_repair_rules: list('fatigue_repair_rules', 'fatigueRepairRules', OH_STORY_BRIDGE_UNIT_FATIGUE_REPAIR_RULES),
      quality_checks: explicitQualityChecks.length ? explicitQualityChecks : (asArray(derived.quality_checks).length ? asArray(derived.quality_checks) : OH_STORY_BRIDGE_UNIT_QUALITY_CHECKS),
      revision_priorities: explicitRevisionPriorities.length
        ? explicitRevisionPriorities
        : (asArray(derived.revision_priorities).length
            ? asArray(derived.revision_priorities)
            : ['补连续期待', '补桥段位置', '补章尾新目标', '提高冲突密度', '补承接余波']),
    }
  }

  const target = contextPackage?.chapter_target || {}
  const chapterNo = Number(target.chapter_no || target.chapterNo || 0)
  return {
    version: 'oh_story_bridge_unit_v1',
    source: 'oh_story_embedded_fallback',
    bridge_position: inferBridgePosition(chapterNo),
    bridge_unit_plan: buildBridgeUnitPlan(contextPackage),
    four_chapter_roles: OH_STORY_BRIDGE_UNIT_FOUR_CHAPTER_ROLES,
    expectation_chain_rules: OH_STORY_BRIDGE_UNIT_EXPECTATION_CHAIN_RULES,
    climax_duration_rules: OH_STORY_BRIDGE_UNIT_CLIMAX_DURATION_RULES,
    transition_rules: OH_STORY_BRIDGE_UNIT_TRANSITION_RULES,
    fatigue_repair_rules: OH_STORY_BRIDGE_UNIT_FATIGUE_REPAIR_RULES,
    quality_checks: OH_STORY_BRIDGE_UNIT_QUALITY_CHECKS,
    revision_priorities: ['补连续期待', '补桥段位置', '补章尾新目标', '提高冲突密度', '补承接余波'],
  }
}
