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

const OH_STORY_OPENING_REQUIRED_BEATS = [
  '从故事最精彩、最有冲突的地方写起。',
  '主角三种状态选一：身处危机 / 令人羡慕 / 被丢入陌生环境。',
  '300 字内主角登场，1000 字内出现爽点或期待点。',
  '三个基点前 3 章内全部完成：人设基点 / 切入点基点 / 金手指基点。',
  '第一个冲突影响重大，事先点明解决的好处和不解决的坏处。',
  '第一章必须说明：主角目标 + 本文卖点。',
]

const OH_STORY_OPENING_FOUNDATION_POINTS = [
  '人设基点：展示主角核心性格和处境，建立代入感和共情。',
  '切入点基点：主角遭遇的第一个冲突/机遇，最好第 1 章完成。',
  '金手指基点：展示主角独特优势，前 3 章内完成。',
]

const OH_STORY_OPENING_FIVE_ESSENTIALS_RULES = [
  '简单点：简明扼要交代谁、在哪里、有什么、为什么、要做什么，第一章就点明。',
  '不能偏：开头剧情必须符合主线和本文卖点，跑偏就是零分开头。',
  '要快：切入剧情速度要快，磨磨蹭蹭交代背景就是啰嗦。',
  '要爽：开头第一个小剧情必须有爽点或强期待，不能只有设定铺垫。',
  '不能平：文似看山不喜平，开头必须有冲突矛盾，不能平淡如水。',
]

const OH_STORY_OPENING_FORBIDDEN = [
  '大段背景介绍：开头全是缓没有冲突。',
  '天气/风景开头：除非反差极大。',
  '出场 3 个以上主要角色：信息过载。',
  '序章/楔子/引：除非足够短且与第一章逻辑紧密。',
  '插叙/切视角/回忆梦境：开篇以正叙为主。',
  '世界观详细解说：至少等到第一个一级结构结束。',
]

const OH_STORY_OPENING_INFORMATION_PRIORITY = [
  '背景融入冲突，用旁人议论或现场压力同时完成背景和冲突。',
  '背景信息分批释放，优先级：危机感 > 人设 > 金手指暗示 > 世界观。',
  '两个紧张场景间可以缓和，但缓和不等于无冲突。',
  '每个情报都要有期待价值，关键情报拉起“然后呢？”。',
]

const OH_STORY_OPENING_QUALITY_CHECKS = [
  '300 字内主角必须登场，且带着危机、优势或陌生环境进入现场。',
  '1000 字内必须出现爽点或期待点，不能只铺背景和世界观。',
  '三大基点必须可追踪：人设基点、切入点基点、金手指基点。',
  '第一章必须说明主角目标 + 本文卖点，并让第一个冲突影响重大。',
  '开头不得以大段背景、纯天气风景、序章楔子、详细世界观、回忆梦境或过多主要角色拖慢。',
  '信息释放必须服务当前情绪目标，按危机感、人设、金手指暗示、世界观分批进入。',
]

function openingExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.opening_contract
    || contextPackage?.chapter_target?.openingContract
    || contextPackage?.opening_contract
    || contextPackage?.openingContract
    || contextPackage?.pre_draft_brief?.opening_contract
    || contextPackage?.preDraftBrief?.openingContract
    || contextPackage?.writing_bible?.opening_strategy_contract
    || contextPackage?.writing_bible?.openingStrategyContract
}

function inferOpeningStrategy(text: string) {
  if (/危机|倒计时|系统|裁员|压迫|生死|报名|任务|被迫/.test(text)) return '危机开局'
  if (/悬疑|怪谈|谜|缺页|身份|谁才|真相|血缘/.test(text)) return '悬疑开局'
  if (/重生|穿越|反转|回归|认知|颠覆/.test(text)) return '反转开局'
  return '危机开局'
}

function buildOpeningPlan(sceneCards: any[], target: any) {
  const firstScene = sceneCards[0] || {}
  const secondScene = sceneCards[1] || {}
  const thirdScene = sceneCards[2] || {}
  return uniqueBriefStrings([
    firstScene.opening_hook ? `300字内主角登场：${compactBriefText(firstScene.opening_hook)}` : '',
    firstScene.conflict ? `人设/处境压力：${compactBriefText(firstScene.conflict)}` : '',
    secondScene.reader_payoff || secondScene.purpose ? `1000字内爽点/期待点：${compactBriefText(secondScene.reader_payoff || secondScene.purpose)}` : '',
    target.conflict ? `切入点基点：${compactBriefText(target.conflict)}` : '',
    thirdScene.reader_payoff || thirdScene.ending_hook_seed ? `金手指/独特优势基点：${compactBriefText(thirdScene.reader_payoff || thirdScene.ending_hook_seed)}` : '',
    target.ending_hook ? `第一章翻页钩子：${compactBriefText(target.ending_hook)}` : '',
  ], 8)
}

export function buildOpeningContract(project: any = {}, contextPackage: any = {}) {
  const explicit = openingExplicitContract(contextPackage)
    || (!contextPackage?.__ignoreProjectOpeningStrategy
      ? (
          project?.reference_config?.writing_bible?.opening_strategy_contract
          || project?.reference_config?.writing_bible?.openingStrategyContract
        )
      : null)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildOpeningContract(project, {
      ...(contextPackage || {}),
      __ignoreProjectOpeningStrategy: true,
      opening_contract: null,
      openingContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            opening_contract: null,
            openingContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            opening_contract: null,
            openingContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            opening_contract: null,
            openingContract: null,
          }
        : contextPackage?.chapter_target,
      writing_bible: contextPackage?.writing_bible
        ? {
            ...(contextPackage.writing_bible || {}),
            opening_strategy_contract: null,
            openingStrategyContract: null,
          }
        : contextPackage?.writing_bible,
    }) || {}
    const explicitRequiredBeats = asArray(explicit.required_beats || explicit.requiredBeats).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitFoundationPoints = asArray(explicit.foundation_points || explicit.foundationPoints).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitOpeningPlan = asArray(explicit.opening_plan || explicit.openingPlan).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitFiveEssentialsRules = asArray(explicit.five_essentials_rules || explicit.fiveEssentialsRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitInformationPriority = asArray(explicit.information_priority || explicit.informationPriority).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitForbiddenPatterns = asArray(explicit.forbidden_patterns || explicit.forbiddenPatterns).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitForbiddenMixing = asArray(explicit.forbidden_mixing || explicit.forbiddenMixing).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitFirst5Promise = asArray(explicit.first_5_chapter_promise || explicit.first5ChapterPromise || explicit.first_five_chapter_promise || explicit.firstFiveChapterPromise).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitThresholdLadder = asArray(explicit.threshold_ladder || explicit.thresholdLadder).map((item: any) => compactBriefText(item)).filter(Boolean)
    const hookType = compactBriefText(explicit.hook_type || explicit.hookType)
    const openingFlow = compactBriefText(explicit.opening_flow || explicit.openingFlow)
    return {
      version: explicit.version || 'oh_story_opening_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      activation_scope: compactBriefText(explicit.activation_scope || explicit.activationScope, derived.activation_scope || '前3章强制执行；第4章后仅作为新书承诺记忆。'),
      hook_type: hookType,
      opening_flow: openingFlow,
      mainline_graft: compactBriefText(explicit.mainline_graft || explicit.mainlineGraft),
      first_5_chapter_promise: explicitFirst5Promise,
      threshold_ladder: explicitThresholdLadder,
      opening_strategy: compactBriefText(explicit.opening_strategy || explicit.openingStrategy || openingFlow || hookType, derived.opening_strategy || '危机开局'),
      required_beats: explicitRequiredBeats.length ? explicitRequiredBeats : (asArray(derived.required_beats).length ? asArray(derived.required_beats) : OH_STORY_OPENING_REQUIRED_BEATS),
      foundation_points: explicitFoundationPoints.length ? explicitFoundationPoints : (asArray(derived.foundation_points).length ? asArray(derived.foundation_points) : OH_STORY_OPENING_FOUNDATION_POINTS),
      opening_plan: explicitOpeningPlan.length ? explicitOpeningPlan : uniqueBriefStrings([
        ...explicitFirst5Promise,
        openingFlow,
        explicit.mainline_graft || explicit.mainlineGraft,
      ], 8).length ? uniqueBriefStrings([
          ...explicitFirst5Promise,
          openingFlow,
          explicit.mainline_graft || explicit.mainlineGraft,
        ], 8) : asArray(derived.opening_plan),
      five_essentials_rules: explicitFiveEssentialsRules.length ? explicitFiveEssentialsRules : (asArray(derived.five_essentials_rules).length ? asArray(derived.five_essentials_rules) : OH_STORY_OPENING_FIVE_ESSENTIALS_RULES),
      information_priority: explicitInformationPriority.length ? explicitInformationPriority : (asArray(derived.information_priority).length ? asArray(derived.information_priority) : OH_STORY_OPENING_INFORMATION_PRIORITY),
      forbidden_patterns: uniqueBriefStrings([
        ...(explicitForbiddenPatterns.length ? explicitForbiddenPatterns : (asArray(derived.forbidden_patterns).length ? asArray(derived.forbidden_patterns) : OH_STORY_OPENING_FORBIDDEN)),
        ...explicitForbiddenMixing,
      ], 12),
      quality_checks: explicitQualityChecks.length ? explicitQualityChecks : (asArray(derived.quality_checks).length ? asArray(derived.quality_checks) : OH_STORY_OPENING_QUALITY_CHECKS),
      revision_priorities: explicitRevisionPriorities.length
        ? explicitRevisionPriorities
        : (asArray(derived.revision_priorities).length
            ? asArray(derived.revision_priorities)
            : ['重做前300字主角登场', '补1000字内爽点/期待点', '补三大基点', '删背景和世界观水文', '明确主角目标和本文卖点']),
    }
  }

  const target = contextPackage?.chapter_target || {}
  const chapterNo = Number(target.chapter_no || target.chapterNo || 0)
  if (chapterNo > 3) return null
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
      scene.opening_hook,
      scene.reader_payoff,
      scene.information_gap,
      scene.ending_hook_seed,
    ]),
  ].filter(Boolean).join(' ')
  return {
    version: 'oh_story_opening_v1',
    source: 'oh_story_embedded_fallback',
    activation_scope: '前3章强制执行；第4章后仅作为新书承诺记忆。',
    opening_strategy: inferOpeningStrategy(text),
    required_beats: OH_STORY_OPENING_REQUIRED_BEATS,
    foundation_points: OH_STORY_OPENING_FOUNDATION_POINTS,
    opening_plan: buildOpeningPlan(sceneCards, target),
    five_essentials_rules: OH_STORY_OPENING_FIVE_ESSENTIALS_RULES,
    information_priority: OH_STORY_OPENING_INFORMATION_PRIORITY,
    forbidden_patterns: OH_STORY_OPENING_FORBIDDEN,
    quality_checks: OH_STORY_OPENING_QUALITY_CHECKS,
    revision_priorities: ['重做前300字主角登场', '补1000字内爽点/期待点', '补三大基点', '删背景和世界观水文', '明确主角目标和本文卖点'],
  }
}

const OH_STORY_PROSE_CRAFT_POV_RULES = [
  '深度限知：镜头锁在主视角角色的此刻感知里，只写他此刻看到、听到、闻到、摸到和身体感到的东西。',
  '读者与角色同步获知：角色不知道的不提前写，不用“他不知道的是”“如果她知道真相”等上帝预告。',
  '念头是动作的一部分：心理只允许闪念 + 身体反应，不写完整理性的内心分析。',
  '主观偏差代替客观定性：场景被角色当下情绪染色，但不能让作者跳出来盖棺断言。',
]

const OH_STORY_PROSE_CRAFT_EXPRESSION_RULES = [
  '身体细节替代情绪词：不用心痛、悲伤、愤怒、害怕、委屈、绝望直接告诉情绪。',
  '情绪表达优先级：动作 > 神态 > 思想 > 情绪词，能写手、眼、呼吸、嘴唇、肩背、伤疤就不写抽象感受。',
  '动态描写优于静态描写：人物特征用动作和反应展现，不靠形容词堆叠。',
  '环境必须与角色交互：没有物理、精神或题材功能的环境描写直接压缩。',
]

const OH_STORY_PROSE_CRAFT_SCENE_WEAVING_RULES = [
  '三维度揉进：每个详写子事件同时包含发生了什么、主角注意到什么、身体怎么回应。',
  '三个维度必须织进连续正文，不按“发生/感知/反应”分段堆叠。',
  '详写子事件约100-150字；过场、赶路、信息交代类子事件1-2句带过，把字数留给情绪节点。',
  '每个段落是一个镜头，必须有明确拍摄对象：动作、物件、表情、空间变化或关键信息。',
]

const OH_STORY_PROSE_CRAFT_SUBJECT_NAME_RHYTHM_RULES = [
  '主语与名字节奏：段首、场景切换、多人同场、视角重置时，用角色名建立主语。',
  '同一动作链/同一段内部，段中用代词/省略流动，优先用“他/她”、动作承接或省略主语。',
  '关键转折、情绪爆点、身份反差或读者需要重新盯住主角时，再点名强化。',
  '反面信号：连续多句或连续多段都以同一角色名开头，读起来像每句都在报名字。',
  '不要为了省主语造成指代不清；多人同场必须在段首、场景切换或视角重置处点名。',
]

const OH_STORY_PROSE_CRAFT_INDIRECT_DESCRIPTION_RULES = [
  '间接描写法：正面描写只是铺垫，侧面反应才是爽点；不要直接宣布“很厉害/很震撼/宇宙第一”。',
  '用配角动作、环境变化、围观者判断或对手失态证明爽点，例如嚼饼吃相、哄抢、停筷、改口、后退。',
  '强设定、强道具、强证据或强能力必须先给可见使用结果，再让懂行者/熟人/反派的差异化反应放大价值。',
  '侧面反应必须带来信息、关系、立场或风险变化，不能只写统一震惊。',
]

const OH_STORY_PROSE_CRAFT_THREE_CAMERA_RULES = [
  '三机位法：机位1近景写主角动作、表情、闪念和身体感受，负责推进主线与读者代入。',
  '三机位法：机位2远景写配角反应、环境变化和围观者判断，负责扩展信息面、制造反差并放大爽点。',
  '三机位法：机位3旁白只补必要设定、背景或人物关系；设定都由冲突引出，不能单独铺说明书。',
  '机位交替以机位1和机位2为核心，机位3穿插；每个详写小节至少有一次主角近景和一次外部反应或环境反馈。',
]

const OH_STORY_PROSE_CRAFT_THEN_WHAT_RULES = [
  '“然后呢”基点法：每一段文字都要回答读者心中的“然后呢”。',
  '写完一个信息点，立刻用下一个信息点接上：动作、发现、反应、选择、风险或新疑问。',
  '段尾不能停在静态总结、情绪判断或环境描写；必须留下可继续推进的因果钩、状态变化或下一步压力。',
  '连续信息点必须有承接关系，避免孤立设定、孤立心理和无后续的装饰句。',
]

const OH_STORY_PROSE_CRAFT_CORE_EMOTION_ALIGNMENT_RULES = [
  '围绕核心情绪设计全部情节：动笔前确定目标读者的核心情绪需求（被认可/复仇/恋爱/升级）。',
  '所有情节、人设、冲突和细节都必须围绕这根弦演奏，不能写成旁枝情绪、装饰细节或孤立互动。',
  '每个动作、物件、冲突和反应都要服务本章情绪目标、读者回报或全书核心情绪。',
  '宏观把控整体节奏和情绪走向，微观把控每段文字的细节和张力。',
]

const OH_STORY_PROSE_CRAFT_BAIMIAO_SENSORY_RULES = [
  '白描：用最少的字 + 最准确的信息和情绪勾勒画面，优先精准动词和名词。',
  '五感描写法：每个关键场景至少调动两到三种感官（视觉/听觉/触觉/嗅觉/味觉），但只写主角此刻主动感受到的细节。',
  '五感必须服务情绪：恐惧写冷、暗、静；兴奋写亮、快、响；感官锚点必须推动动作、规则、危险或对话判断。',
  '感官细节不能当装饰风景或堆砌氛围；删掉不改变信息、情绪或选择的描写。',
]

const OH_STORY_PROSE_CRAFT_DYNAMIC_DESCRIPTION_RULES = [
  '动态描写优于静态描写：人物特征必须用动作和反应展现，不用形容词堆。',
  '角色能力、身份、压力或魅力要通过他人停顿、退让、误判、抢答、改口或行动变化显出来。',
  '环境不要大段铺陈，必须在角色行动中穿插点染：碰到、推开、踩过、闻到、被光线拦住或被声音逼停。',
  '静态描述必须转成动作链、反应链或环境交互；删掉不改变局势、关系、信息或情绪的形容词堆叠。',
]

const OH_STORY_PROSE_CRAFT_SHOT_RHYTHM_RULES = [
  '镜头与分镜思维：每个段落 = 一个镜头，必须有明确拍摄对象。',
  '镜头类型要按功能切换：远景写环境/氛围，中景写人物关系，近景写表情/身体细节，特写写关键物品或情绪触发点。',
  '快节奏场面用短句、短段、密集动作和快速切换，适合冲突、追逐、打脸、揭露和危险升级。',
  '慢节奏场面可用长句、环境交互、心理闪念和静止镜头，适合余波、试探、关系变化和情绪沉淀。',
  '禁止连续远景铺环境或连续特写堆情绪；镜头变化必须带来信息、关系、风险或情绪强度变化。',
]

const OH_STORY_PROSE_CRAFT_TRANSITION_BRIDGE_RULES = [
  '场景切换与转场：用相似物、相似五感或相似情绪把两个场景接起来。',
  '时间跳转必须用动作或物件衔接，例如推门、翻账本、封条变软、钥匙落入掌心。',
  '空间跳转必须用声音或光影衔接，例如铃声、脚步声、门缝光、灯影或风声把镜头带到新地点。',
  '转场句必须带来位移、时间变化、情绪余波或新风险；没有功能的过渡句压缩或删除。',
]

const OH_STORY_PROSE_CRAFT_RHYTHM_RULES = [
  '一动一静：每个小节至少有1个动和1个静，动后必静，静后可动。',
  '不连续两节全动，避免暴力疲劳；不连续两节全静，避免节奏拖沓。',
  '情绪最高点用动：打脸、反转、揭露、冲突爆发要写具体动作。',
  '情绪最低点用静：心死、余韵、释然要写日常微动作或安静观察。',
]

const OH_STORY_PROSE_CRAFT_OBJECT_NUMBER_RULES = [
  '具体数字替代模糊描述：金额、年限、次数和时间要承载情感重量。',
  '数字变化推动情节：建立重量、伤害递增、反差暴击或时间重量必须有可见变化。',
  '贯穿道具三次出现：前1/4建立初始意义，中段转折颠覆意义，结尾形成情感暴击。',
  '道具类型可用信物型、工具型、痕迹型、数字型；每次出现都要改变读者理解。',
]

const OH_STORY_PROSE_CRAFT_SECTION_STRUCTURE_RULES = [
  '小节内部结构：每个小节必须有一个主事件 + 3-5 个子事件；主事件推进核心情节，子事件丰富层次。',
  '小节内部结构：每个小节必须有一个情绪变化和一条读者新获知的信息，不能只有环境、心情或设定说明。',
  '小节内部结构：常规冲突小节需要 3-5 轮对话交锋；独自发现、翻阅材料等场景可标零，但必须用动作/发现/反应补足。',
  '小节之间衔接：小节结尾留一个钩子，下一节开头快速接续，不重新铺垫，不另起无关天气、环境或背景。',
  '小节之间衔接：情绪跨节递进，每一节情绪强度不低于上一节；峰值后最多维持一节，不允许骤降。',
]

const OH_STORY_PROSE_CRAFT_SECTION_DENSITY_RULES = [
  '小节密度诊断：场景或小节偏短时先查子事件三维度、感官细节、身体动作和对话交锋是否缺失。',
  '冲突/对抗偏短时补阻碍；涉及配角时补反应；空间移动时补发现；连续动作时补递进。',
  '只有主事件触发回忆时，才补 2-3 句简短回忆；回忆必须服务当下选择或信息变化。',
  '扩写优先补动作过程、选择代价、信息增量和关系变化，不把字数摊给无功能描写。',
]

const OH_STORY_PROSE_CRAFT_ANTI_PADDING_RULES = [
  '不得为凑字数加环境描写、天气风景、室内摆设或氛围句。',
  '不得为凑字数重复已表达的情绪、重复已知信息或复述上一段结论。',
  '不得为凑字数追加角色内心独白总结、自言自语解释或作者评语。',
  '不得让角色做无意义动作；动作必须改变空间、信息、关系、情绪或危险判断。',
]

const OH_STORY_PROSE_CRAFT_CONCEPT_ANCHOR_RULES = [
  '新名词/新设定/新道具首次出现时，必须靠角色动作反应、对话半句或场景物理后果给读者一个当下作用锚点。',
  '删解释腔不等于把读者读懵：不要整段讲来历/原理/等级，也不要只甩零信息生词。',
  '锚点必须是角色此刻撞上的可感知后果：按上、触发、炸开、浮出、刺痛、亮起、暴露证据或改变选择。',
]

const OH_STORY_PROSE_CRAFT_DESCRIPTION_LIMITS = [
  '水分控制：水分 = 不推动剧情也不塑造人物的内容；合理的水必须承担伏笔铺垫、氛围营造或角色互动中的暗流。',
  '检验法：删掉这段后读者会不会困惑；如果读者不会困惑 = 水，必须删除或压缩。',
  '环境、心理、旁白和回忆都必须服务动作、信息、关系、风险或情绪变化；不能单独成装饰段。',
  '一个词能说清的不用一句话；描写优先保留精准动词、名词和有效感官。',
]

const OH_STORY_PROSE_CRAFT_ANTI_AI_SMELL_RULES = [
  '高危词扫描：仿佛、犹如、一丝、一抹、深吸一口气、缓缓、不禁、眼中闪过、嘴角勾起、眉头微皱、不容置疑、不易察觉高频出现时必须替换或删除。',
  '章末总结体禁止：不用总结性感悟、升华式感叹、哲理式收尾或“他不知道的是/更大的风暴”预告，章尾用动作、对话或悬念收束。',
  '叠加式描写禁止：不要把同一动作拆成发生、感知、身体反应三段重复，必须揉进同一段连续画面。',
  '心理告知和公式化对话标签要降频：不用“他感到/他觉得/带着一丝...”替代表现，普通“说”可保留，高频机械标签用动作、语气或上下文承接。',
]

const OH_STORY_PROSE_CRAFT_FORBIDDEN = [
  '他不知道的是、如果她知道真相、此时的他还不知道等上帝视角预告。',
  '直接写心痛、悲伤、愤怒、害怕、委屈、绝望等抽象情绪词替代正文证据。',
  '堆叠式描写：发生、感知、反应拆成三段依次解释，同一个动作被掰开写三遍。',
  '无意义环境描写、重复已知信息、角色自言自语总结、万能比喻和作者下场解释。',
  '高频公式词：仿佛、犹如、一丝、一抹、深吸一口气、缓缓、不禁、眼中闪过、嘴角勾起、眉头微皱。',
]

const OH_STORY_PROSE_CRAFT_CHECKS = [
  '每个详写子事件必须完成三维度揉进：发生、感知、身体反应都有正文证据。',
  '正文必须保持深度限知，不能出现角色不知道的信息、上帝预告或作者总结式解释。',
  '情绪必须落到身体细节、动作、对话或场面反应，不能用抽象情绪词替代。',
  '强度、爽点、设定价值和证据价值必须用间接描写法证明，先给可见结果，再给侧面反应，不能直接宣布很厉害。',
  '三机位法必须可见：机位1贴主角近景，机位2给外部反应或环境变化，机位3只在冲突触发时补必要旁白。',
  '每段必须执行“然后呢”基点法，信息点之后立刻接下一动作、发现、反应、选择、风险或新疑问。',
  '每个动作、物件、冲突和反应都必须服务核心情绪、读者回报或本章情绪目标，不能脱线成旁枝情绪。',
  '白描与五感必须服务正文功能：用最少的字写准信息和情绪，关键场景至少调动两到三种感官但不得装饰化。',
  '动态描写优于静态描写：人物特征必须用动作和反应展现，环境必须在角色行动中穿插点染。',
  '镜头与分镜思维必须可见：段落有明确拍摄对象，远景/中景/近景/特写服务信息、关系、风险或情绪变化。',
  '场景切换与转场必须有桥：相似物/相似五感/相似情绪、动作或物件、声音或光影至少一项可见。',
  '一动一静节奏必须可见，不能连续全动造成疲劳，也不能连续全静拖沓。',
  '关键物件或具体数字必须承担剧情/情绪功能，不能只是装饰性细节。',
  '小节内部结构必须可见：一个主事件、3-5 个子事件、一个情绪变化、一条新信息和必要的 3-5 轮对话交锋。',
  '小节之间必须钩子接续：上一节末尾留问题/动作/情绪钩子，下一节开头快速接住，不重新铺垫，情绪跨节递进。',
  '偏短小节必须先执行小节密度诊断，只能补感官细节、身体动作、对话交锋、阻碍/反应/发现/递进或简短回忆。',
  '新概念首次出现必须有当下作用锚点：动作反应、对话半句或物理后果至少一项可见。',
  '环境描写必须与角色行动、危险、规则、关系或情绪发生交互；无交互环境要删或压缩。',
  '水分控制必须可见：删掉后读者不会困惑的环境、心理、旁白、回忆或重复信息必须删除或压缩。',
  'anti_ai_smell_rules 必须执行：高危词、章末总结体、叠加式描写和心理告知不得残留为正文主要表达方式。',
  '段落镜头必须有明确拍摄对象，不能连续空泛解释、心理总结或信息水文。',
]

const OH_STORY_PUNCTUATION_TONE_MAP = [
  '压迫 / 冷静 / 克制：用短句、逗号、句号或冒号压出判断落点；不为了变化乱加感叹号。',
  '质问 / 试探 / 反问：关键问题用问号和短促追问片段，配合动作停顿；避免连续多句全以问号结尾。',
  '惊讶 / 爆发 / 打脸：真正爆点只保留少量感叹号，爆点前后用短句或单句成段承接；禁止整段喊叫。',
  '犹豫 / 吞咽 / 未说完：用逗号、句号、短句、换行或动作 beat 表达停顿；不用省略号或破折号硬造停顿。',
]

const OH_STORY_PUNCTUATION_FORBIDDEN = [
  '正文不使用 ……、...、——、—、-- 或独立行 --- 作为停顿工具。',
  '禁止无功能堆砌 ???、！！！、?!、!?；问号和感叹号必须服务质问、爆发或人物声线。',
  '不要把质问、爆发、迟疑全部压成句号；通篇句号化会抹平人物声线和情绪节奏。',
  '对话被打断、吞回去或拖长时，优先用动作停顿、短句断开或换行承接。',
]

const OH_STORY_PUNCTUATION_TONE_CHECKS = [
  '标点必须服务语气、人物声线和情绪节奏，不能通篇句号化。',
  '质问、试探、反问必须有功能性问号或短促追问，不能被全部压平成陈述句。',
  '爆发、打脸和揭露只在峰值保留少量感叹号，不能随机标点堆砌或整段喊叫。',
  '犹豫、打断和未尽必须改成动作、短句、逗号、句号或换行，不得残留 ……、——、—、--。',
  '每个关键对话 beat 的标点要匹配关系、场合和目的；不同角色不能说话节奏完全一样。',
]

function punctuationToneExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.punctuation_tone_contract
    || contextPackage?.chapter_target?.punctuationToneContract
    || contextPackage?.punctuation_tone_contract
    || contextPackage?.punctuationToneContract
    || contextPackage?.pre_draft_brief?.punctuation_tone_contract
    || contextPackage?.preDraftBrief?.punctuationToneContract
}

function inferSceneTonePlan(scene: any, index: number) {
  const text = [
    scene?.title,
    scene?.purpose,
    scene?.conflict,
    scene?.reader_payoff,
    scene?.reversal,
    scene?.turning_point,
    scene?.key_dialogue,
  ].filter(Boolean).join(' ')
  let tone = '压迫 / 冷静 / 克制'
  let instruction = '用短句、逗号和句号压出现场判断，不把克制写成通篇平铺句号。'
  if (/问|质问|反问|试探|逼问|追问|盘问/.test(text)) {
    tone = '质问 / 试探 / 反问'
    instruction = '关键问题保留功能性问号，追问用短句或动作停顿承接，避免连续满屏问号。'
  } else if (/爆发|打脸|揭露|反杀|失控|震惊|怒|喊|崩/.test(text)) {
    tone = '惊讶 / 爆发 / 打脸'
    instruction = '只在情绪峰值保留少量感叹号，爆点前后用短句或单句成段承接。'
  } else if (/犹豫|迟疑|吞|不敢|心虚|打断|沉默/.test(text)) {
    tone = '犹豫 / 吞咽 / 未说完'
    instruction = '用动作、短句、逗号、句号或换行表现停顿，不用省略号或破折号。'
  }
  return `场景${scene?.scene_no || index + 1}：${tone}；${instruction}`
}

export function buildPunctuationToneContract(project: any = {}, contextPackage: any = {}) {
  const explicit = punctuationToneExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildPunctuationToneContract(project, {
      ...(contextPackage || {}),
      punctuation_tone_contract: null,
      punctuationToneContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            punctuation_tone_contract: null,
            punctuationToneContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            punctuation_tone_contract: null,
            punctuationToneContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            punctuation_tone_contract: null,
            punctuationToneContract: null,
          }
        : contextPackage?.chapter_target,
    }) || {}
    const explicitTonePunctuationMap = asArray(explicit.tone_punctuation_map || explicit.tonePunctuationMap).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitForbiddenMarks = asArray(explicit.forbidden_marks || explicit.forbiddenMarks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSceneTonePlan = asArray(explicit.scene_tone_plan || explicit.sceneTonePlan).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_punctuation_tone_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      tone_punctuation_map: explicitTonePunctuationMap.length
        ? explicitTonePunctuationMap
        : (asArray(derived.tone_punctuation_map).length ? asArray(derived.tone_punctuation_map) : OH_STORY_PUNCTUATION_TONE_MAP),
      forbidden_marks: explicitForbiddenMarks.length
        ? explicitForbiddenMarks
        : (asArray(derived.forbidden_marks).length ? asArray(derived.forbidden_marks) : OH_STORY_PUNCTUATION_FORBIDDEN),
      scene_tone_plan: explicitSceneTonePlan.length ? explicitSceneTonePlan : asArray(derived.scene_tone_plan),
      quality_checks: explicitQualityChecks.length
        ? explicitQualityChecks
        : (asArray(derived.quality_checks).length ? asArray(derived.quality_checks) : OH_STORY_PUNCTUATION_TONE_CHECKS),
      revision_priorities: explicitRevisionPriorities.length
        ? explicitRevisionPriorities
        : (asArray(derived.revision_priorities).length
            ? asArray(derived.revision_priorities)
            : ['修通篇句号化', '清理随机标点堆砌', '删除省略号/破折号停顿', '按角色关系重排问号/感叹号', '用动作和短句替代硬停顿']),
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  return {
    version: 'oh_story_punctuation_tone_v1',
    source: 'oh_story_embedded_fallback',
    tone_punctuation_map: OH_STORY_PUNCTUATION_TONE_MAP,
    forbidden_marks: OH_STORY_PUNCTUATION_FORBIDDEN,
    scene_tone_plan: uniqueBriefStrings(sceneCards.map(inferSceneTonePlan), 10),
    quality_checks: OH_STORY_PUNCTUATION_TONE_CHECKS,
    revision_priorities: ['修通篇句号化', '清理随机标点堆砌', '删除省略号/破折号停顿', '按角色关系重排问号/感叹号', '用动作和短句替代硬停顿'],
  }
}

function proseCraftExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.prose_craft_contract
    || contextPackage?.chapter_target?.proseCraftContract
    || contextPackage?.prose_craft_contract
    || contextPackage?.proseCraftContract
    || contextPackage?.pre_draft_brief?.prose_craft_contract
    || contextPackage?.preDraftBrief?.proseCraftContract
}

function buildProseCraftAnchors(sceneCards: any[], target: any) {
  const actionAnchors = sceneCards
    .flatMap((scene: any, index: number) => asArray(scene.action_beats || scene.required_beats || scene.requiredBeats)
      .map((beat: any) => `场景${scene.scene_no || index + 1}动作/身体锚点：${compactBriefText(beat)}`))
  const objectAnchors = sceneCards
    .flatMap((scene: any, index: number) => [
      scene.reader_payoff ? `场景${scene.scene_no || index + 1}读者回报要写成可见动作/物件：${compactBriefText(scene.reader_payoff)}` : '',
      scene.conflict ? `场景${scene.scene_no || index + 1}冲突要落到身体、空间或道具：${compactBriefText(scene.conflict)}` : '',
    ])
    .filter(Boolean)
  return uniqueBriefStrings([
    ...actionAnchors,
    ...objectAnchors,
    target.ending_hook ? `章尾钩子必须落到一个动作、物件、数字或身体反应：${compactBriefText(target.ending_hook)}` : '',
  ], 10)
}

export function buildProseCraftContract(project: any = {}, contextPackage: any = {}) {
  const explicit = proseCraftExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildProseCraftContract(project, {
      ...(contextPackage || {}),
      prose_craft_contract: null,
      proseCraftContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            prose_craft_contract: null,
            proseCraftContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            prose_craft_contract: null,
            proseCraftContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            prose_craft_contract: null,
            proseCraftContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitPovRules = asArray(explicit.pov_rules || explicit.povRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitExpressionRules = asArray(explicit.expression_rules || explicit.expressionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSceneWeavingRules = asArray(explicit.scene_weaving_rules || explicit.sceneWeavingRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSubjectNameRhythmRules = asArray(explicit.subject_name_rhythm_rules || explicit.subjectNameRhythmRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitIndirectDescriptionRules = asArray(explicit.indirect_description_rules || explicit.indirectDescriptionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitThreeCameraRules = asArray(explicit.three_camera_rules || explicit.threeCameraRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitThenWhatRules = asArray(explicit.then_what_rules || explicit.thenWhatRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitCoreEmotionAlignmentRules = asArray(explicit.core_emotion_alignment_rules || explicit.coreEmotionAlignmentRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitBaimiaoSensoryRules = asArray(explicit.baimiao_sensory_rules || explicit.baimiaoSensoryRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitDynamicDescriptionRules = asArray(explicit.dynamic_description_rules || explicit.dynamicDescriptionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitShotRhythmRules = asArray(explicit.shot_rhythm_rules || explicit.shotRhythmRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitTransitionBridgeRules = asArray(explicit.transition_bridge_rules || explicit.transitionBridgeRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRhythmRules = asArray(explicit.rhythm_rules || explicit.rhythmRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitObjectNumberRules = asArray(explicit.object_number_rules || explicit.objectNumberRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSectionStructureRules = asArray(explicit.section_structure_rules || explicit.sectionStructureRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSectionDensityRules = asArray(explicit.section_density_rules || explicit.sectionDensityRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitAntiPaddingRules = asArray(explicit.anti_padding_rules || explicit.antiPaddingRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitConceptAnchorRules = asArray(explicit.concept_anchor_rules || explicit.conceptAnchorRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitDescriptionLimits = asArray(explicit.description_limits || explicit.descriptionLimits).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitAntiAiSmellRules = asArray(explicit.anti_ai_smell_rules || explicit.antiAiSmellRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSceneAnchors = asArray(explicit.scene_anchors || explicit.sceneAnchors).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitForbiddenPatterns = asArray(explicit.forbidden_patterns || explicit.forbiddenPatterns).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitQualityChecks = asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRevisionPriorities = asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_prose_craft_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      pov_rules: explicitPovRules.length ? explicitPovRules : asArray(derived.pov_rules),
      expression_rules: explicitExpressionRules.length ? explicitExpressionRules : asArray(derived.expression_rules),
      scene_weaving_rules: explicitSceneWeavingRules.length ? explicitSceneWeavingRules : asArray(derived.scene_weaving_rules),
      subject_name_rhythm_rules: explicitSubjectNameRhythmRules.length ? explicitSubjectNameRhythmRules : asArray(derived.subject_name_rhythm_rules),
      indirect_description_rules: explicitIndirectDescriptionRules.length ? explicitIndirectDescriptionRules : asArray(derived.indirect_description_rules),
      three_camera_rules: explicitThreeCameraRules.length ? explicitThreeCameraRules : asArray(derived.three_camera_rules),
      then_what_rules: explicitThenWhatRules.length ? explicitThenWhatRules : asArray(derived.then_what_rules),
      core_emotion_alignment_rules: explicitCoreEmotionAlignmentRules.length ? explicitCoreEmotionAlignmentRules : asArray(derived.core_emotion_alignment_rules),
      baimiao_sensory_rules: explicitBaimiaoSensoryRules.length ? explicitBaimiaoSensoryRules : asArray(derived.baimiao_sensory_rules),
      dynamic_description_rules: explicitDynamicDescriptionRules.length ? explicitDynamicDescriptionRules : asArray(derived.dynamic_description_rules),
      shot_rhythm_rules: explicitShotRhythmRules.length ? explicitShotRhythmRules : asArray(derived.shot_rhythm_rules),
      transition_bridge_rules: explicitTransitionBridgeRules.length ? explicitTransitionBridgeRules : asArray(derived.transition_bridge_rules),
      rhythm_rules: explicitRhythmRules.length ? explicitRhythmRules : asArray(derived.rhythm_rules),
      object_number_rules: explicitObjectNumberRules.length ? explicitObjectNumberRules : asArray(derived.object_number_rules),
      section_structure_rules: explicitSectionStructureRules.length ? explicitSectionStructureRules : asArray(derived.section_structure_rules),
      section_density_rules: explicitSectionDensityRules.length ? explicitSectionDensityRules : asArray(derived.section_density_rules),
      anti_padding_rules: explicitAntiPaddingRules.length ? explicitAntiPaddingRules : asArray(derived.anti_padding_rules),
      concept_anchor_rules: explicitConceptAnchorRules.length ? explicitConceptAnchorRules : asArray(derived.concept_anchor_rules),
      description_limits: explicitDescriptionLimits.length ? explicitDescriptionLimits : asArray(derived.description_limits),
      anti_ai_smell_rules: explicitAntiAiSmellRules.length ? explicitAntiAiSmellRules : asArray(derived.anti_ai_smell_rules),
      scene_anchors: explicitSceneAnchors.length ? explicitSceneAnchors : asArray(derived.scene_anchors),
      forbidden_patterns: explicitForbiddenPatterns.length ? explicitForbiddenPatterns : asArray(derived.forbidden_patterns),
      quality_checks: explicitQualityChecks.length ? explicitQualityChecks : asArray(derived.quality_checks),
      revision_priorities: explicitRevisionPriorities.length ? explicitRevisionPriorities : asArray(derived.revision_priorities),
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  return {
    version: 'oh_story_prose_craft_v1',
    source: 'oh_story_embedded_fallback',
    pov_rules: OH_STORY_PROSE_CRAFT_POV_RULES,
    expression_rules: OH_STORY_PROSE_CRAFT_EXPRESSION_RULES,
    scene_weaving_rules: OH_STORY_PROSE_CRAFT_SCENE_WEAVING_RULES,
    subject_name_rhythm_rules: OH_STORY_PROSE_CRAFT_SUBJECT_NAME_RHYTHM_RULES,
    indirect_description_rules: OH_STORY_PROSE_CRAFT_INDIRECT_DESCRIPTION_RULES,
    three_camera_rules: OH_STORY_PROSE_CRAFT_THREE_CAMERA_RULES,
    then_what_rules: OH_STORY_PROSE_CRAFT_THEN_WHAT_RULES,
    core_emotion_alignment_rules: OH_STORY_PROSE_CRAFT_CORE_EMOTION_ALIGNMENT_RULES,
    baimiao_sensory_rules: OH_STORY_PROSE_CRAFT_BAIMIAO_SENSORY_RULES,
    dynamic_description_rules: OH_STORY_PROSE_CRAFT_DYNAMIC_DESCRIPTION_RULES,
    shot_rhythm_rules: OH_STORY_PROSE_CRAFT_SHOT_RHYTHM_RULES,
    transition_bridge_rules: OH_STORY_PROSE_CRAFT_TRANSITION_BRIDGE_RULES,
    rhythm_rules: OH_STORY_PROSE_CRAFT_RHYTHM_RULES,
    object_number_rules: OH_STORY_PROSE_CRAFT_OBJECT_NUMBER_RULES,
    section_structure_rules: OH_STORY_PROSE_CRAFT_SECTION_STRUCTURE_RULES,
    section_density_rules: OH_STORY_PROSE_CRAFT_SECTION_DENSITY_RULES,
    anti_padding_rules: OH_STORY_PROSE_CRAFT_ANTI_PADDING_RULES,
    concept_anchor_rules: OH_STORY_PROSE_CRAFT_CONCEPT_ANCHOR_RULES,
    description_limits: OH_STORY_PROSE_CRAFT_DESCRIPTION_LIMITS,
    anti_ai_smell_rules: OH_STORY_PROSE_CRAFT_ANTI_AI_SMELL_RULES,
    scene_anchors: buildProseCraftAnchors(sceneCards, target),
    forbidden_patterns: OH_STORY_PROSE_CRAFT_FORBIDDEN,
    quality_checks: OH_STORY_PROSE_CRAFT_CHECKS,
    revision_priorities: ['替换抽象情绪词', '补三维度揉进', '补间接描写/侧面反应', '补三机位法', '补“然后呢”推进', '收束核心情绪', '补白描/五感服务情绪', '补动态描写', '补镜头节奏', '补转场桥', '控水去AI味', '修深度限知', '补一动一静', '补数字/道具功能', '删上帝视角和无交互环境描写'],
  }
}
