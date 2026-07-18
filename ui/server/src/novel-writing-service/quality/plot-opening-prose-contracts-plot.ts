import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

const OH_STORY_PLOT_FRAMEWORK_STAGE_OWNERSHIP = {
  creation: [
    '题材→框架路由：创建/重建作品时先确认题材核心循环，再选主用框架和辅助框架。',
    '核心梗与细化法：一句话主线必须能继续拆成卷纲、章纲和正文，不把框架当摆设。',
    '大结构设计：确定欺骗式主线、大期待和阶段循环，避免主线过早彻底解决。',
  ],
  outline: [
    '单段剧情结构模板：每段 10-40 章按起因→发展→铺垫→高潮→转折→结局/收获组织。',
    '多线穿插：战力/装备/情感/声望线错开推进，铺垫线和收获线交替。',
    '故事本质与六幕结构：事件必须筛选、排序、因果化，并保留第六幕余波。',
  ],
  scene_card: [
    '阵营手牌法：每个主要场景标注主角阵营、敌人阵营、观众阵营分别出什么牌。',
    '分步骤与缓冲区：把目标拆成阶段动作，给主角非处理不可的近端理由。',
    '冲突黏结剂：场景卡必须说明杀人理由、工作职责、道德责任或实体场所等有进无出理由。',
  ],
  prose: [
    '任务→奖励→兑换→新任务：系统/升级文正文必须让任务、奖励、兑换或下一任务至少一项可见。',
    '装逼五步法/三压一爆三震：打脸章按铺压、出手、分层反应和状态变化展开。',
    '双线法与信息差：主线做事，副线让配角发现或误判，信息差兑现时形成情绪收益。',
  ],
  revision: [
    '五不崩：目标不缺失、卖点不减少、社会关系不空白、上层地位不缺失、成长不停止。',
    '剧情流检查：主线、世界线、升级线必须交织推进，不能单线空转。',
    '套路重复检查：同一核心要素组合不能连续重复，重复时必须换场景、人物、情绪或奖励。',
  ],
}

const OH_STORY_PLOT_FRAMEWORK_RPG_RULES = [
  'RPG结构与奖励设计：升级文的核心是反馈点，读者在什么位置获得满足感必须提前设计。',
  '任务→奖励→兑换→新任务必须形成循环；奖励之后要立刻给新任务、新门槛或新兑换欲望。',
  '奖励形式要多样化：升级、装备、认可、揭秘、权限、关系态度和环境变化都可以是奖励。',
  '飞升/换地图必须带来新信息、新人设展开空间和新冲突，不能只是换地名重复。',
]

const OH_STORY_PLOT_FRAMEWORK_FACTION_HAND_RULES = [
  '框架与阵营手牌法：框架本质是主线、支线、日常的比重与排列组合。',
  '主角阵营、敌人阵营、观众阵营按回合出牌；每张牌必须带来反应、后果和下一张牌。',
  '主角吃瘪时必须从其他角度拉回情绪，例如揭示深层逻辑、意外收获或新底牌影子。',
  '高阶用螺旋并线：两条以上主线轮流推进，每轮都比上轮升一级，避免单线打到天花板。',
]

const OH_STORY_PLOT_FRAMEWORK_DOUBLE_LINE_RULES = [
  '双线法与信息差：主线让主角做事，副线让配角挖掘主角身份、态度、人脉或背后故事。',
  '主角知道、读者知道、配角不知道的信息差，必须在配角发现时转成震惊、改态或关系变化。',
  '现实线和副本线/事业线和感情线交替推进，不得长期只有一条线有结果。',
  '感情线要有明确戏剧性和阶段性，必须与事业线目标绑定或交叉，不能独立漂浮。',
]

const OH_STORY_PLOT_FRAMEWORK_ROUTINE_RULES = [
  '套路模板重复法：可以重复核心看点，但必须做场景更换、人物更换、情绪更换或奖励更换，让读者看不出模板。',
  '通用升级装逼模板：烘托高逼格反派 -> 主角扮猪被看低 -> 最后一刻吃虎超越预期。',
  '看点重复、人物重复、剧情重复要合并使用；人物固定行为特质必须在不同场景重复展现。',
  '套路使用要重构或微调，不能直接套经典故事情节；重构时保留情绪模块，换故事构型。',
]

const OH_STORY_PLOT_FRAMEWORK_LARGE_STRUCTURE_RULES = [
  '大结构是欺骗式主线：每次接近完成又差一点，悬念永不断。',
  '起承转合的大框架：起建立世界/主角/金手指，承填充小剧情，转引入更大危机，合解决核心矛盾。',
  '热门书单段结构：起因、发展、铺垫、高潮、转折、结局/收获，段落结束必须清点收获并铺垫下一段。',
  '卷末同时解决当前矛盾并开启新地图，卷最后一幕应成为下一卷第一幕。',
]

const OH_STORY_PLOT_FRAMEWORK_SIX_ACT_RULES = [
  '故事 = 对事件进行选择、排序、因果化；静态事实不等于故事。',
  '开篇要找到最有戏剧张力的事件放在最前面。',
  '转折目的在增加冲突和情绪，必须让冲突性质质变，并做到意料之外、情理之中。',
  '第六幕余波：明线实力与暗线社会认知每次失衡，都是装逼和地位提升机会。',
]

const OH_STORY_PLOT_FRAMEWORK_NO_COLLAPSE_CHECKS = [
  '目标不缺失：主角始终有当前小目标和长线大目标。',
  '卖点不减少：核心卖点不能中途消失。',
  '社会关系不空白：主角必须有互动的人际网络。',
  '上层地位不缺失：要有对上位者、上层资源或更高规则的追求和接触。',
  '成长不停止：实力、地位、资源、关系或认知的提升持续给出。',
]

const OH_STORY_PLOT_FRAMEWORK_QUALITY_CHECKS = [
  '主线和支线错开节奏推进，没有同时爆完也没有同时空转。',
  '当前段落有起因→发展→高潮→收获的完整闭环。',
  '段落结尾同时完成收获清点和下一段铺垫。',
  '冲突有明确黏结剂，读者相信主角不可能随时退出。',
  '期待感 > 爽点，铺垫篇幅不能明显少于释放篇幅。',
  '套路重复时更换场景、人物、情绪或奖励。',
  '没有连续两段使用相同核心要素组合。',
]

function plotFrameworkExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.plot_framework_contract
    || contextPackage?.chapter_target?.plotFrameworkContract
    || contextPackage?.plot_framework_contract
    || contextPackage?.plotFrameworkContract
    || contextPackage?.pre_draft_brief?.plot_framework_contract
    || contextPackage?.preDraftBrief?.plotFrameworkContract
}

function inferPlotFrameworkRoute(project: any = {}, contextPackage: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const text = compactBriefText([
    project?.genre,
    project?.target_platform,
    project?.synopsis,
    project?.reference_config?.writing_bible?.golden_finger,
    project?.reference_config?.writing_bible?.commercial_positioning?.selling_points,
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
      scene.ending_hook_seed,
    ]),
  ].flat().filter(Boolean).join('；'))

  if (/系统|无限|任务|奖励|兑换|副本/.test(text)) {
    return {
      genre_hint: '系统文/无限流/升级循环',
      core_loop: '任务→奖励→兑换→新任务',
      primary_framework: 'RPG结构与奖励设计',
      auxiliary_frameworks: ['核心梗循环法', '套路模板重复法', '框架与阵营手牌法'],
      routing_reason: '文本含系统、任务、奖励或兑换信号，优先用反馈点和奖励循环保证读者获得感。',
    }
  }
  if (/升级|玄幻|修仙|异能|战力|境界|飞升/.test(text)) {
    return {
      genre_hint: '升级文/玄幻修仙',
      core_loop: '夺宝+比武+女性/关系/声望三要素轮换',
      primary_framework: '玄幻框架拆解',
      auxiliary_frameworks: ['RPG结构与奖励设计', '阵营手牌法', '套路模板重复法'],
      routing_reason: '文本含升级、境界或战力信号，优先保证奖励、比武/夺宝和声望线错峰。',
    }
  }
  if (/追妻|虐|感情|恋爱|甜宠|先婚|女主|男主/.test(text)) {
    return {
      genre_hint: '感情线/追妻/甜宠',
      core_loop: '伤害/误解→追悔/拉扯→挽回/确认→新情感阻碍',
      primary_framework: '双线法与信息差',
      auxiliary_frameworks: ['结构与人物的关系', '悬念与冲突深化', '结构化拆书法'],
      routing_reason: '文本含感情线或关系拉扯信号，优先让事业线/情感线绑定推进。',
    }
  }
  if (/打脸|装逼|逆袭|公开|审判|震惊|扮猪|吃虎|都市/.test(text)) {
    return {
      genre_hint: '都市装逼/打脸逆袭',
      core_loop: '扮猪→吃虎→震惊→换地图/更高门槛',
      primary_framework: '套路模板重复法',
      auxiliary_frameworks: ['框架与阵营手牌法', '装逼五步法', '三压一爆三震'],
      routing_reason: '文本含打脸、装逼或都市逆袭信号，优先搭舞台、阵营和分层反应。',
    }
  }
  if (/悬疑|解谜|线索|真相|规则怪谈|谜题/.test(text)) {
    return {
      genre_hint: '悬疑/解谜/规则',
      core_loop: '线索→推理→反转→新谜题',
      primary_framework: '故事本质与六幕结构',
      auxiliary_frameworks: ['悬念与冲突深化', '双线法与信息差', '核心梗与细化法'],
      routing_reason: '文本含线索、真相或规则谜题信号，优先保证因果链、悬念和新谜题接力。',
    }
  }
  return {
    genre_hint: '通用长篇剧情流',
    core_loop: '目标→阻碍→行动→反馈→新目标',
    primary_framework: '核心梗与细化法',
    auxiliary_frameworks: ['故事本质与六幕结构', '分步骤与缓冲区', '剧情流五不崩'],
    routing_reason: '未命中特定题材框架，使用通用剧情流和因果链框架保证长线不崩。',
  }
}

function buildPlotFrameworkRewardPoints(contextPackage: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  return uniqueBriefStrings([
    ...sceneCards.map((scene: any) => compactBriefText(scene.reader_payoff || scene.readerPayoff || scene.payoff)),
    target.ending_hook ? `下一任务/下一门槛：${compactBriefText(target.ending_hook)}` : '',
    target.summary ? `本章任务：${compactBriefText(target.summary)}` : '',
  ], 8)
}

function buildPlotFrameworkFactionCards(contextPackage: any = {}) {
  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const enemyCards = sceneCards.map((scene: any) => compactBriefText(scene.conflict)).filter(Boolean)
  const protagonistCards = sceneCards.map((scene: any) => compactBriefText(scene.reader_payoff || scene.reversal || scene.purpose)).filter(Boolean)
  return {
    protagonist_cards: uniqueBriefStrings(protagonistCards.length ? protagonistCards : [target.summary], 6),
    enemy_cards: uniqueBriefStrings(enemyCards.length ? enemyCards : [target.conflict], 6),
    audience_cards: uniqueBriefStrings([
      ...sceneCards.map((scene: any) => compactBriefText(scene.reader_payoff || scene.ending_hook_seed)).filter(Boolean),
      target.ending_hook,
    ], 6),
  }
}

function plotFrameworkList(explicit: any, snake: string, camel: string, fallback: any[], limit = 12) {
  const rows = asArray(explicit?.[snake] || explicit?.[camel]).map((item: any) => compactBriefText(item)).filter(Boolean)
  return uniqueBriefStrings(rows.length ? rows : fallback, limit)
}

export function buildPlotFrameworkContract(project: any = {}, contextPackage: any = {}, options: any = {}) {
  const explicit = plotFrameworkExplicitContract(contextPackage)
  const derivedRoute = inferPlotFrameworkRoute(project, contextPackage)
  const explicitRoute = explicit && typeof explicit === 'object' && !Array.isArray(explicit)
    ? explicit.genre_framework_route || explicit.genreFrameworkRoute || {}
    : {}
  const route = {
    genre_hint: compactBriefText(explicitRoute.genre_hint || explicitRoute.genreHint || derivedRoute.genre_hint),
    core_loop: compactBriefText(explicitRoute.core_loop || explicitRoute.coreLoop || derivedRoute.core_loop),
    primary_framework: compactBriefText(explicitRoute.primary_framework || explicitRoute.primaryFramework || derivedRoute.primary_framework),
    auxiliary_frameworks: uniqueBriefStrings([
      ...asArray(explicitRoute.auxiliary_frameworks || explicitRoute.auxiliaryFrameworks),
      ...derivedRoute.auxiliary_frameworks,
    ].map((item: any) => compactBriefText(item)).filter(Boolean), 8),
    routing_reason: compactBriefText(explicitRoute.routing_reason || explicitRoute.routingReason || derivedRoute.routing_reason),
  }
  const explicitObject = explicit && typeof explicit === 'object' && !Array.isArray(explicit) ? explicit : {}
  const selectedFrameworks = plotFrameworkList(explicitObject, 'selected_frameworks', 'selectedFrameworks', [
    route.primary_framework,
    ...route.auxiliary_frameworks,
    options.showdown_contract ? '装逼五步法/三压一爆三震' : '',
    options.bridge_unit_contract ? '结构化拆书法（单桥段四章结构）' : '',
    options.suspense_contract ? '悬念与冲突深化技巧' : '',
    options.conflict_structure_contract ? '有进无出原则与冲突黏结剂' : '',
  ].filter(Boolean), 12)
  const explicitStage = explicitObject.stage_ownership || explicitObject.stageOwnership || {}
  const rewardExplicit = explicitObject.rpg_reward_loop || explicitObject.rpgRewardLoop || {}
  const factionExplicit = explicitObject.faction_hand_framework || explicitObject.factionHandFramework || {}
  const factionCards = buildPlotFrameworkFactionCards(contextPackage)
  return {
    version: explicitObject.version || 'oh_story_plot_framework_v1',
    source: explicitObject.source || 'oh_story_plot_frameworks',
    genre_framework_route: route,
    selected_frameworks: selectedFrameworks,
    stage_ownership: {
      creation: plotFrameworkList(explicitStage, 'creation', 'creation', OH_STORY_PLOT_FRAMEWORK_STAGE_OWNERSHIP.creation, 8),
      outline: plotFrameworkList(explicitStage, 'outline', 'outline', OH_STORY_PLOT_FRAMEWORK_STAGE_OWNERSHIP.outline, 8),
      scene_card: plotFrameworkList(explicitStage, 'scene_card', 'sceneCard', OH_STORY_PLOT_FRAMEWORK_STAGE_OWNERSHIP.scene_card, 8),
      prose: plotFrameworkList(explicitStage, 'prose', 'prose', OH_STORY_PLOT_FRAMEWORK_STAGE_OWNERSHIP.prose, 8),
      revision: plotFrameworkList(explicitStage, 'revision', 'revision', OH_STORY_PLOT_FRAMEWORK_STAGE_OWNERSHIP.revision, 8),
    },
    rpg_reward_loop: {
      loop: compactBriefText(rewardExplicit.loop || rewardExplicit.core_loop || rewardExplicit.coreLoop || route.core_loop),
      reward_points: plotFrameworkList(rewardExplicit, 'reward_points', 'rewardPoints', buildPlotFrameworkRewardPoints(contextPackage), 8),
      rules: plotFrameworkList(rewardExplicit, 'rules', 'rules', OH_STORY_PLOT_FRAMEWORK_RPG_RULES, 8),
    },
    faction_hand_framework: {
      factions: plotFrameworkList(factionExplicit, 'factions', 'factions', ['主角阵营', '敌人阵营', '观众阵营'], 6),
      rules: plotFrameworkList(factionExplicit, 'rules', 'rules', OH_STORY_PLOT_FRAMEWORK_FACTION_HAND_RULES, 8),
      cards: factionExplicit.cards || factionExplicit.scene_cards || factionExplicit.sceneCards || factionCards,
    },
    double_line_info_gap_rules: plotFrameworkList(explicitObject, 'double_line_info_gap_rules', 'doubleLineInfoGapRules', OH_STORY_PLOT_FRAMEWORK_DOUBLE_LINE_RULES, 8),
    routine_variation_rules: plotFrameworkList(explicitObject, 'routine_variation_rules', 'routineVariationRules', OH_STORY_PLOT_FRAMEWORK_ROUTINE_RULES, 8),
    large_structure_rules: plotFrameworkList(explicitObject, 'large_structure_rules', 'largeStructureRules', OH_STORY_PLOT_FRAMEWORK_LARGE_STRUCTURE_RULES, 8),
    six_act_story_rules: plotFrameworkList(explicitObject, 'six_act_story_rules', 'sixActStoryRules', OH_STORY_PLOT_FRAMEWORK_SIX_ACT_RULES, 8),
    global_no_collapse_checks: plotFrameworkList(explicitObject, 'global_no_collapse_checks', 'globalNoCollapseChecks', OH_STORY_PLOT_FRAMEWORK_NO_COLLAPSE_CHECKS, 8),
    quality_checks: plotFrameworkList(explicitObject, 'quality_checks', 'qualityChecks', OH_STORY_PLOT_FRAMEWORK_QUALITY_CHECKS, 10),
    revision_priorities: plotFrameworkList(explicitObject, 'revision_priorities', 'revisionPriorities', ['补题材框架路由', '补奖励循环', '补阵营出牌', '补双线信息差', '补五不崩检查'], 8),
  }
}

export const OH_STORY_OPENING_REQUIRED_BEATS = [
  '从故事最精彩、最有冲突的地方写起。',
  '主角三种状态选一：身处危机 / 令人羡慕 / 被丢入陌生环境。',
  '300 字内主角登场，1000 字内出现爽点或期待点。',
  '三个基点前 3 章内全部完成：人设基点 / 切入点基点 / 金手指基点。',
  '第一个冲突影响重大，事先点明解决的好处和不解决的坏处。',
  '第一章必须说明：主角目标 + 本文卖点。',
]

export const OH_STORY_OPENING_FOUNDATION_POINTS = [
  '人设基点：展示主角核心性格和处境，建立代入感和共情。',
  '切入点基点：主角遭遇的第一个冲突/机遇，最好第 1 章完成。',
  '金手指基点：展示主角独特优势，前 3 章内完成。',
]

export const OH_STORY_OPENING_FIVE_ESSENTIALS_RULES = [
  '简单点：简明扼要交代谁、在哪里、有什么、为什么、要做什么，第一章就点明。',
  '不能偏：开头剧情必须符合主线和本文卖点，跑偏就是零分开头。',
  '要快：切入剧情速度要快，磨磨蹭蹭交代背景就是啰嗦。',
  '要爽：开头第一个小剧情必须有爽点或强期待，不能只有设定铺垫。',
  '不能平：文似看山不喜平，开头必须有冲突矛盾，不能平淡如水。',
]

export const OH_STORY_OPENING_FORBIDDEN = [
  '大段背景介绍：开头全是缓没有冲突。',
  '天气/风景开头：除非反差极大。',
  '出场 3 个以上主要角色：信息过载。',
  '序章/楔子/引：除非足够短且与第一章逻辑紧密。',
  '插叙/切视角/回忆梦境：开篇以正叙为主。',
  '世界观详细解说：至少等到第一个一级结构结束。',
]

export const OH_STORY_OPENING_INFORMATION_PRIORITY = [
  '背景融入冲突，用旁人议论或现场压力同时完成背景和冲突。',
  '背景信息分批释放，优先级：危机感 > 人设 > 金手指暗示 > 世界观。',
  '两个紧张场景间可以缓和，但缓和不等于无冲突。',
  '每个情报都要有期待价值，关键情报拉起“然后呢？”。',
]

export const OH_STORY_OPENING_QUALITY_CHECKS = [
  '300 字内主角必须登场，且带着危机、优势或陌生环境进入现场。',
  '1000 字内必须出现爽点或期待点，不能只铺背景和世界观。',
  '三大基点必须可追踪：人设基点、切入点基点、金手指基点。',
  '第一章必须说明主角目标 + 本文卖点，并让第一个冲突影响重大。',
  '开头不得以大段背景、纯天气风景、序章楔子、详细世界观、回忆梦境或过多主要角色拖慢。',
  '信息释放必须服务当前情绪目标，按危机感、人设、金手指暗示、世界观分批进入。',
]

