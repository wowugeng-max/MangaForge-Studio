import { asArray } from '../../routes/novel-route-utils'
import {
  normalizeConflictNetworkLayersContract,
  normalizeConflictWebContract,
} from '../../novel-writing/conflict-structure-basics'
import { continuityHeatItemText } from '../../novel-writing/continuity-heat-basics'
import { normalizeReaderExpectationDebtContext } from '../batch-serial/serial-momentum'
import { firstDefined } from '../post-delivery/core-handoff-sync-reports'
import { compactBriefText, uniqueBriefStrings } from './text-utils'
import { storylineUsageByAnyType } from './continuity-dialogue-contracts'

import {
  OH_STORY_EXPECTATION_BEFORE_PAYOFF_RULES,
  OH_STORY_EXPECTATION_RELAY_RULES,
  OH_STORY_EXPECTATION_THRESHOLD_CHECKS,
  OH_STORY_FEMALE_AUDIENCE_ABUSE_DOSAGE_RULES,
  OH_STORY_FEMALE_AUDIENCE_COPY_PROMISE_RULES,
  OH_STORY_FEMALE_AUDIENCE_CORE_PRINCIPLES,
  OH_STORY_FEMALE_AUDIENCE_LONGFORM_GENRE_RULES,
  OH_STORY_FEMALE_AUDIENCE_PLATFORM_FIT_RULES,
  OH_STORY_FEMALE_AUDIENCE_QUALITY_CHECKS,
  OH_STORY_FEMALE_AUDIENCE_READER_NEED_RULES,
  OH_STORY_FEMALE_AUDIENCE_ROMANCE_AXIS_RULES,
  OH_STORY_INFORMATION_FLOW_CHECKS,
  OH_STORY_INFORMATION_NEXT_OBJECTIVE_RULES,
  OH_STORY_INFORMATION_TRANSITION_COMPRESSION_RULES,
  OH_STORY_INFORMATION_TRANSITION_RULES,
  detectFemaleAudienceContext,
  femaleAudienceExplicitContract,
  normalizeFemaleAudienceActivationMode,
  resolveFemaleAudienceActivation
} from './audience-quality-contracts'

const OH_STORY_UPGRADE_RHYTHM_QUALITY_CHECKS = [
  '升级感三步法必须完整：列起点、列终点、反向设置情绪缺口。',
  '升级前必须铺垫待遇差距、资源难度、被轻视或能力限制。',
  '升级后能完成以前做不到的事，并展示战力/技能/地位/资源/社交态度中的至少一项变化。',
  '每次行动要有即时反馈；延迟反馈要积累到可期待的大奖励或新阶段。',
  '榜单/排名出现时必须提供升级动力、新对手和装逼余震，不能只写名次数字。',
  '升级不能太快也不能太慢，兑现后必须引入更大危机、新门槛或下一目标。',
  '桥段功能位要清楚：代入、信息差、拉扯增强、兑现、承上启下不能混成均匀流水账。',
]

const OH_STORY_UPGRADE_RHYTHM_FEEDBACK_RULES = [
  '即时反馈：行动后立刻给经验值、技能熟练度、资源、态度变化或局势变化。',
  '延迟反馈：把经验、资源、人脉或隐藏奖励积累到后续爆发，形成下一章期待。',
  '升级后必须展示新能力威力，同时引入更大危机或更高门槛。',
]

const OH_STORY_UPGRADE_RHYTHM_BRIDGE_RULES = [
  '四章一桥段：第一章上代入，第一章下展示信息差，第二章拉扯增强，第三章兑现爽感，第四章承上启下。',
  '高潮前要提高冲突密度，高潮章要写透兑现，高潮后1-2章日常过渡也必须推进关系、伏笔或新目标。',
  '圈内不圈外：桥段只写核心卖点相关内容，过渡也要服务升级、期待或关系变化。',
]

const OH_STORY_UPGRADE_RHYTHM_RANKING_LADDER_RULES = [
  '排行榜提供升级动力：排名提升不是结算数字，而是让读者期待下一名次、下一门槛和下一次公开验证。',
  '通过排行榜介绍新对手：榜单刷新时必须露出前一名、下一名或同榜竞争者，制造碰撞期待。',
  '排行榜出现后要有装逼余震：排名变化必须影响态度、报价、资源、权限、规则评价或后续挑战。',
]

const OH_STORY_UPGRADE_RHYTHM_GOLDFINGER_CONFLICT_BALANCE_RULES = [
  '金手指 + 矛盾 = 剧情：金手指刚好解决当前矛盾，才有爽感和行动价值。',
  '金手指太强 + 矛盾不够 = 无聊，不能一键清场或让所有阻碍自动消失。',
  '金手指太弱 + 矛盾太强 = 读者焦虑，必须让能力至少改变局势或拿到阶段收益。',
  '金手指解决当前矛盾后必须暴露更大矛盾、更高门槛或下一目标，形成层层递进。',
]

const OH_STORY_UPGRADE_RHYTHM_GOLDFINGER_FEEDBACK_RULES = [
  '金手指反馈法：给出金手指后必须有即时变化，不能只写绑定成功或说明规则。',
  '把金手指带来变化的过程掺杂在故事里：通过动作、判断、物件变化、角色反应或局势变化展示反馈。',
  '金手指必须契合主角当前职业、身份或生活困境，作为打开困境的钥匙。',
  '金手指可以替换故事流程中的一个环节，但不能替代全部行动链；仍要保留目标、阻碍、行动、代价和新期待。',
]

const OH_STORY_UPGRADE_RHYTHM_GOLDFINGER_SIMPLICITY_RULES = [
  '金手指简单是核心：游戏化面板一眼就懂最好。',
  '功能、触发条件、奖励反馈和升级规则必须清晰，读者不需要看说明书也能理解。',
  '本章只展示一种核心用法，避免把系统写成说明书、规则树或万能外挂。',
]

const OH_STORY_UPGRADE_RHYTHM_GOLDFINGER_MULTI_DIMENSION_GROWTH_RULES = [
  '金手指提升要有多维度，不能只靠单一维度。',
  '词条、功能、品质至少两条线同时成长，避免后期只剩品质或数值提升。',
  '条件-反馈模型要保留：条件升级后，反馈可解锁新功能、子能力或新的应用场景。',
]

function upgradeRhythmExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.upgrade_rhythm_contract
    || contextPackage?.chapter_target?.upgradeRhythmContract
    || contextPackage?.upgrade_rhythm_contract
    || contextPackage?.upgradeRhythmContract
    || contextPackage?.pre_draft_brief?.upgrade_rhythm_contract
    || contextPackage?.preDraftBrief?.upgradeRhythmContract
}

function inferUpgradeEmotionModules(text: string) {
  const modules = []
  if (/嘲讽|质疑|看不起|打脸|震惊|展示|反转/.test(text)) {
    modules.push('装逼：被打压嘲讽（可选）+ 展示能力 + 打造落差 + 震惊。')
  }
  if (/危机|接手|无法解决|放弃|临危|救场/.test(text)) {
    modules.push('临危受命：危机超出现场能力 + 配角穷尽办法无法解决 + 主角接手 + 完成任务。')
  }
  if (/报废|不被看好|改造|修好|产生价值/.test(text)) {
    modules.push('点石成金：不被看好的某物/某人 + 主角改造 + 产生价值。')
  }
  if (/小代价|捡漏|便宜|低价|超额|隐藏/.test(text)) {
    modules.push('以小博大：小代价 + 入水之鱼的环境 + 获得大收获。')
  }
  return modules.length ? uniqueBriefStrings(modules, 6) : ['升级爽点：铺垫缺口 -> 行动尝试 -> 即时反馈 -> 展示变化 -> 新期待。']
}

export function buildUpgradeRhythmContract(project: any = {}, contextPackage: any = {}) {
  const explicit = upgradeRhythmExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildUpgradeRhythmContract(project, {
      ...(contextPackage || {}),
      upgrade_rhythm_contract: null,
      upgradeRhythmContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            upgrade_rhythm_contract: null,
            upgradeRhythmContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            upgrade_rhythm_contract: null,
            upgradeRhythmContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            upgrade_rhythm_contract: null,
            upgradeRhythmContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitUpgradeGap = asArray(explicit.upgrade_gap || explicit.upgradeGap).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitUpgradeGainPlan = asArray(explicit.upgrade_gain_plan || explicit.upgradeGainPlan).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitFeedbackLoop = asArray(explicit.feedback_loop || explicit.feedbackLoop).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitEmotionModules = asArray(explicit.emotion_modules || explicit.emotionModules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitBridgeRhythm = asArray(explicit.bridge_rhythm || explicit.bridgeRhythm).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitGoldfingerConflictBalanceRules = asArray(explicit.goldfinger_conflict_balance_rules || explicit.goldfingerConflictBalanceRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitGoldfingerFeedbackRules = asArray(explicit.goldfinger_feedback_rules || explicit.goldfingerFeedbackRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitGoldfingerSimplicityRules = asArray(explicit.goldfinger_simplicity_rules || explicit.goldfingerSimplicityRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitGoldfingerMultiDimensionGrowthRules = asArray(explicit.goldfinger_multi_dimension_growth_rules || explicit.goldfingerMultiDimensionGrowthRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRankingLadderRules = asArray(explicit.ranking_ladder_rules || explicit.rankingLadderRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitGoldfingerEvolution = explicit.goldfinger_evolution || explicit.goldfingerEvolution || explicit.golden_finger_evolution || explicit.goldenFingerEvolution
    return {
      version: explicit.version || 'oh_story_upgrade_rhythm_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      upgrade_gap: explicitUpgradeGap.length ? explicitUpgradeGap : asArray(derived.upgrade_gap),
      upgrade_gain_plan: explicitUpgradeGainPlan.length ? explicitUpgradeGainPlan : asArray(derived.upgrade_gain_plan),
      feedback_loop: explicitFeedbackLoop.length
        ? explicitFeedbackLoop
        : asArray(derived.feedback_loop).length ? asArray(derived.feedback_loop) : OH_STORY_UPGRADE_RHYTHM_FEEDBACK_RULES,
      emotion_modules: explicitEmotionModules.length ? explicitEmotionModules : asArray(derived.emotion_modules),
      bridge_rhythm: explicitBridgeRhythm.length
        ? explicitBridgeRhythm
        : asArray(derived.bridge_rhythm).length ? asArray(derived.bridge_rhythm) : OH_STORY_UPGRADE_RHYTHM_BRIDGE_RULES,
      goldfinger_conflict_balance_rules: explicitGoldfingerConflictBalanceRules.length
        ? explicitGoldfingerConflictBalanceRules
        : asArray(derived.goldfinger_conflict_balance_rules).length ? asArray(derived.goldfinger_conflict_balance_rules) : OH_STORY_UPGRADE_RHYTHM_GOLDFINGER_CONFLICT_BALANCE_RULES,
      goldfinger_feedback_rules: explicitGoldfingerFeedbackRules.length
        ? explicitGoldfingerFeedbackRules
        : asArray(derived.goldfinger_feedback_rules).length ? asArray(derived.goldfinger_feedback_rules) : OH_STORY_UPGRADE_RHYTHM_GOLDFINGER_FEEDBACK_RULES,
      goldfinger_simplicity_rules: explicitGoldfingerSimplicityRules.length
        ? explicitGoldfingerSimplicityRules
        : asArray(derived.goldfinger_simplicity_rules).length ? asArray(derived.goldfinger_simplicity_rules) : OH_STORY_UPGRADE_RHYTHM_GOLDFINGER_SIMPLICITY_RULES,
      goldfinger_multi_dimension_growth_rules: explicitGoldfingerMultiDimensionGrowthRules.length
        ? explicitGoldfingerMultiDimensionGrowthRules
        : asArray(derived.goldfinger_multi_dimension_growth_rules).length ? asArray(derived.goldfinger_multi_dimension_growth_rules) : OH_STORY_UPGRADE_RHYTHM_GOLDFINGER_MULTI_DIMENSION_GROWTH_RULES,
      ranking_ladder_rules: explicitRankingLadderRules.length
        ? explicitRankingLadderRules
        : asArray(derived.ranking_ladder_rules).length ? asArray(derived.ranking_ladder_rules) : OH_STORY_UPGRADE_RHYTHM_RANKING_LADDER_RULES,
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_UPGRADE_RHYTHM_QUALITY_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : ['补升级前缺口', '补即时反馈', '补升级后变化展示', '补延迟奖励/新门槛', '校准桥段功能位'],
      goldfinger_evolution: explicitGoldfingerEvolution || derived.goldfinger_evolution || null,
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const writingBible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const commercial = writingBible?.commercial_positioning || project?.reference_config?.writing_bible?.commercial_positioning || {}
  const rawText = [
    project?.title,
    project?.genre,
    project?.synopsis,
    writingBible?.golden_finger,
    writingBible?.goldenFinger,
    writingBible?.protagonist_identity,
    writingBible?.protagonistIdentity,
    ...asArray(commercial?.selling_points || commercial?.sellingPoints),
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
      ...asArray(scene.action_beats || scene.actionBeats),
      ...asArray(scene.state_changes_expected || scene.stateChangesExpected),
    ]),
  ].filter(Boolean).join(' ')
  const upgradeGap = uniqueBriefStrings([
    writingBible?.protagonist_identity ? `起点：${writingBible.protagonist_identity}` : '',
    writingBible?.protagonistIdentity ? `起点：${writingBible.protagonistIdentity}` : '',
    target.conflict ? `情绪缺口：${target.conflict}` : '',
    ...sceneCards.map((scene: any) => {
      const text = scene.conflict || scene.purpose || scene.reader_payoff
      return text ? `升级前铺垫：${compactBriefText(text)}` : ''
    }),
  ], 10)
  const upgradeGainPlan = uniqueBriefStrings([
    target.ending_hook ? `终点/新门槛：${target.ending_hook}` : '',
    ...sceneCards.flatMap((scene: any) => [
      scene.reader_payoff ? `回报：${scene.reader_payoff}` : '',
      scene.reversal ? `能力展示：${scene.reversal}` : '',
      scene.ending_hook_seed ? `延迟反馈：${scene.ending_hook_seed}` : '',
      ...asArray(scene.state_changes_expected || scene.stateChangesExpected).map((item: any) => `状态变化：${compactBriefText(item)}`),
    ]),
  ], 12)
  const actionFeedback = uniqueBriefStrings([
    ...sceneCards.flatMap((scene: any) => asArray(scene.action_beats || scene.actionBeats)),
    ...sceneCards.map((scene: any) => scene.reader_payoff),
  ], 10)
  return {
    version: 'oh_story_upgrade_rhythm_v1',
    source: 'oh_story_embedded_fallback',
    upgrade_gap: upgradeGap.length ? upgradeGap : ['起点：主角当前身份/地位/资源限制必须先被正文看见。'],
    upgrade_gain_plan: upgradeGainPlan.length ? upgradeGainPlan : ['终点：本章至少展示一个能力、资源、地位或关系变化。'],
    feedback_loop: uniqueBriefStrings([
      ...OH_STORY_UPGRADE_RHYTHM_FEEDBACK_RULES,
      ...actionFeedback.map((item: any) => `本章反馈：${compactBriefText(item)}`),
    ], 14),
    emotion_modules: inferUpgradeEmotionModules(rawText),
    bridge_rhythm: OH_STORY_UPGRADE_RHYTHM_BRIDGE_RULES,
    goldfinger_conflict_balance_rules: OH_STORY_UPGRADE_RHYTHM_GOLDFINGER_CONFLICT_BALANCE_RULES,
    goldfinger_feedback_rules: OH_STORY_UPGRADE_RHYTHM_GOLDFINGER_FEEDBACK_RULES,
    goldfinger_simplicity_rules: OH_STORY_UPGRADE_RHYTHM_GOLDFINGER_SIMPLICITY_RULES,
    goldfinger_multi_dimension_growth_rules: OH_STORY_UPGRADE_RHYTHM_GOLDFINGER_MULTI_DIMENSION_GROWTH_RULES,
    ranking_ladder_rules: OH_STORY_UPGRADE_RHYTHM_RANKING_LADDER_RULES,
    quality_checks: OH_STORY_UPGRADE_RHYTHM_QUALITY_CHECKS,
    revision_priorities: ['补升级前缺口', '补即时反馈', '补升级后变化展示', '补延迟奖励/新门槛', '校准桥段功能位'],
    goldfinger_evolution: writingBible?.golden_finger || writingBible?.goldenFinger
      ? {
          core_function: compactBriefText(writingBible.golden_finger || writingBible.goldenFinger),
          current_stage: '基础/发展',
          allowed_extensions: upgradeGainPlan,
          forbidden_drifts: ['突然换赛道', '血脉神通', '天道掌控', '完全抛弃核心作用'],
        }
      : null,
  }
}

