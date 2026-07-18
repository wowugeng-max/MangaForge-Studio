import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from './text-utils'
import { inferEndingHookType } from '../batch-serial/ending-hook-type'

type AnyFn = (...args: any[]) => any

let nextBatchBriefFromContext: AnyFn = (_contextPackage: any = {}) => null
let normalizeSuspenseExpectationChainContract: AnyFn = (value: any = {}) => value || {}

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
