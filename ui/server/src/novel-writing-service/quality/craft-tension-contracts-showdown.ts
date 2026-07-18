import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText } from './text-utils'

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

