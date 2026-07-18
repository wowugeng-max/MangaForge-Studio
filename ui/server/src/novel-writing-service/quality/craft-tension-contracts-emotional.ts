import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

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

