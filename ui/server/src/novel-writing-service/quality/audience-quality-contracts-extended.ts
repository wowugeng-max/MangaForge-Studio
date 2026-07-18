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

export function buildFemaleAudienceContract(project: any = {}, contextPackage: any = {}) {
  const explicit = femaleAudienceExplicitContract(contextPackage)
  const activation = resolveFemaleAudienceActivation(project, contextPackage)
  const explicitActivationMode = explicit && typeof explicit === 'object' && !Array.isArray(explicit)
    ? normalizeFemaleAudienceActivationMode(explicit.activation_mode ?? explicit.activationMode ?? explicit.female_audience_mode ?? explicit.femaleAudienceMode ?? explicit.enabled)
    : 'auto'
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit) && explicitActivationMode === 'disabled') return null
  if (activation.mode === 'disabled' && explicitActivationMode !== 'enabled') return null
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildFemaleAudienceContract(project, {
      ...(contextPackage || {}),
      female_audience_contract: null,
      femaleAudienceContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            female_audience_contract: null,
            femaleAudienceContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            female_audience_contract: null,
            femaleAudienceContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            female_audience_contract: null,
            femaleAudienceContract: null,
          }
        : contextPackage?.chapter_target,
    }) || {}
    const explicitCorePrinciples = asArray(explicit.core_principles || explicit.corePrinciples).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitReaderNeedRules = asArray(explicit.reader_need_rules || explicit.readerNeedRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitCopyPromiseRules = asArray(explicit.copy_promise_rules || explicit.copyPromiseRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitLongformGenreRules = asArray(explicit.longform_genre_rules || explicit.longformGenreRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRomanceAxisRules = asArray(explicit.romance_axis_rules || explicit.romanceAxisRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitAbuseDosageRules = asArray(explicit.abuse_dosage_rules || explicit.abuseDosageRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitPlatformFitRules = asArray(explicit.platform_fit_rules || explicit.platformFitRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_female_audience_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      activation_mode: explicitActivationMode === 'enabled' ? 'enabled' : activation.mode,
      activation_source: explicitActivationMode === 'enabled' ? 'explicit.female_audience_contract' : activation.source,
      activation_reason: explicitActivationMode === 'enabled' ? '显式女频长篇合同已启用。' : activation.reason,
      audience_mode: compactBriefText(explicit.audience_mode || explicit.audienceMode || derived.audience_mode || 'female_longform'),
      core_principles: explicitCorePrinciples.length ? explicitCorePrinciples : asArray(derived.core_principles),
      reader_need_rules: explicitReaderNeedRules.length ? explicitReaderNeedRules : asArray(derived.reader_need_rules),
      copy_promise_rules: explicitCopyPromiseRules.length ? explicitCopyPromiseRules : asArray(derived.copy_promise_rules),
      longform_genre_rules: explicitLongformGenreRules.length ? explicitLongformGenreRules : asArray(derived.longform_genre_rules),
      romance_axis_rules: explicitRomanceAxisRules.length ? explicitRomanceAxisRules : asArray(derived.romance_axis_rules),
      abuse_dosage_rules: explicitAbuseDosageRules.length ? explicitAbuseDosageRules : asArray(derived.abuse_dosage_rules),
      platform_fit_rules: explicitPlatformFitRules.length ? explicitPlatformFitRules : asArray(derived.platform_fit_rules),
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_FEMALE_AUDIENCE_QUALITY_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : ['补安全感锚点', '补女主主动选择', '让感情升级踩到事业/成长节点', '控制虐戏剂量', '修货板一致'],
    }
  }

  const autoDetected = detectFemaleAudienceContext(project, contextPackage)
  if (activation.mode !== 'enabled' && !autoDetected) return null
  const platformText = [
    project?.target_platform,
    project?.target_audience,
    contextPackage?.chapter_target?.target_platform,
    contextPackage?.writing_bible?.target_platform,
  ].filter(Boolean).join(' ')
  const platformFitRules = /番茄|fanqie/.test(platformText)
    ? OH_STORY_FEMALE_AUDIENCE_PLATFORM_FIT_RULES
    : OH_STORY_FEMALE_AUDIENCE_PLATFORM_FIT_RULES
  return {
    version: 'oh_story_female_audience_v1',
    source: 'oh_story_embedded_fallback',
    activation_mode: activation.mode,
    activation_source: activation.source,
    activation_reason: activation.mode === 'enabled' ? activation.reason : '关键词自动识别命中女频/女生频道/女主导向信号。',
    audience_mode: 'female_longform',
    core_principles: OH_STORY_FEMALE_AUDIENCE_CORE_PRINCIPLES,
    reader_need_rules: OH_STORY_FEMALE_AUDIENCE_READER_NEED_RULES,
    copy_promise_rules: OH_STORY_FEMALE_AUDIENCE_COPY_PROMISE_RULES,
    longform_genre_rules: OH_STORY_FEMALE_AUDIENCE_LONGFORM_GENRE_RULES,
    romance_axis_rules: OH_STORY_FEMALE_AUDIENCE_ROMANCE_AXIS_RULES,
    abuse_dosage_rules: OH_STORY_FEMALE_AUDIENCE_ABUSE_DOSAGE_RULES,
    platform_fit_rules: platformFitRules,
    quality_checks: OH_STORY_FEMALE_AUDIENCE_QUALITY_CHECKS,
    revision_priorities: ['补安全感锚点', '补女主主动选择', '让感情升级踩到事业/成长节点', '控制虐戏剂量', '修货板一致'],
  }
}

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

const OH_STORY_CONFLICT_STRUCTURE_LADDER = [
  '冲突必须升级：言语->行动->激烈对抗->决定胜负。',
  '冲突必须有明确结果，不能只停在争吵、误会或气氛压迫。',
  '本质是有人阻止主角得到他想要的东西；没有阻止者就没有有效冲突。',
]

const OH_STORY_CONFLICT_MOTIVATION_RULES = [
  '三种动机来源至少命中其一：世界背景、金手指、人物关系；强章节最好命中两种以上。',
  '危机解除后，必须通过配角/反派/环境强调更强力量、更大资源或新限制，过渡到下一阶段。',
  '上一危机解决时必须埋下下一个危机的伏笔。',
]

const OH_STORY_ANTAGONIST_PRESSURE_RULES = [
  '压势不压人：反派或阻力优先针对地区、阶层、规则、资源或群体，客观上让主角陷入困境。',
  '反派视角或阻力逻辑要清楚，不要谜语人；读者可以知道部分计划，从而期待打脸。',
  '对手不能只站桩嘲讽，必须有能阻止主角目标的动作、资源、规则或信息优势。',
]

const OH_STORY_PROTAGONIST_AGENCY_RULES = [
  '做别人不敢做的事：反抗权威、挑战强者或打破默认规则。',
  '做别人做不到的事：死局中找到生路，突破当前能力/资源限制。',
  '做别人没想到可以这么做的事：用曲线救国、信息差或非常规方法破局。',
  '戏剧性服务人设，不能为了意外让主角行为崩人设。',
]

const OH_STORY_CONFLICT_NO_EXIT_RULES = [
  '有进无出：读者必须相信主角非踏入不可，不能随时退出。',
  '死亡赌注必须明确：肉体死亡、身份/职场死亡或心理死亡至少一种贯穿。',
  '冲突必须有黏结剂：杀人理由、工作职责、道德责任或实体场所至少命中一种。',
  '对立双方都要无法轻易脱身，不能只有主角被迫、对手随时可撤。',
]

const OH_STORY_CONFLICT_NETWORK_LAYER_RULES = {
  vertical_conflict: '纵向矛盾：上下级、控制服从、压制反抗、师徒或君臣等权力/规则压制必须可见。',
  horizontal_conflict: '横向矛盾：理念冲突、资源争夺、同行竞争、情敌或竞争对手等同层冲突必须可见。',
  cross_conflict: '交叉矛盾：A-B、B-C、A-C 互相牵连，解决一条矛盾必须牵动另一条。',
  weaving_order: [
    '定地图→定阵营→定角色：先确定冲突发生地图、阵营和角色，再填充纵向/横向/交叉矛盾。',
    '对齐阵营填充纵向+横向矛盾，再推理角色之间的交叉矛盾。',
  ],
}

const OH_STORY_CONFLICT_STRUCTURE_QUALITY_CHECKS = [
  '冲突必须升级，至少能看到言语/规则压迫、行动阻拦、对抗升级、决定胜负中的三层。',
  '每个主要场景必须有明确阻力：有人、规则、资源或环境阻止主角得到目标。',
  '有进无出必须成立：读者相信主角非踏入不可，死亡赌注/退出代价和黏结剂清楚。',
  '冲突必须有明确结果：胜负、资格、关系、信息、资源或局势至少一项发生变化。',
  '对抗设计应优先压势不压人，让阻力有地区/阶层/规则/资源根基。',
  '主角必须主动破局，至少体现“做别人不敢做/做不到/想不到”的一类行动力。',
  '同一时刻保持2-3条矛盾线同时运行，矛盾线之间要有因果、利益冲突或信息差；每次解决一个矛盾，必须激活或加深另一个矛盾。',
  '长篇冲突网络必须同时保留纵向矛盾、横向矛盾和交叉矛盾，按定地图→定阵营→定角色编织。',
  '结尾必须留下下一冲突种子，不能在解决后让麻烦消失。',
]

function conflictStructureExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.conflict_structure_contract
    || contextPackage?.chapter_target?.conflictStructureContract
    || contextPackage?.conflict_structure_contract
    || contextPackage?.conflictStructureContract
    || contextPackage?.pre_draft_brief?.conflict_structure_contract
    || contextPackage?.preDraftBrief?.conflictStructureContract
}

function inferConflictMotivationSources(project: any = {}, contextPackage: any = {}, text = '') {
  const writingBible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  return uniqueBriefStrings([
    /协会|规则|阶层|地区|世界|环境|旧城|宗门|公司|平台|制度/.test(text) ? '世界背景：规则/地区/阶层环境迫使主角处理冲突。' : '',
    writingBible?.golden_finger || writingBible?.goldenFinger || /系统|金手指|技能|面板|奖励|能力/.test(text) ? '金手指：能力反馈或特殊信息成为破局驱动力。' : '',
    /前妻|客户|会长|亲友|关系|家族|同伴|师门/.test(text) ? '人物关系：客户、亲友、反派或群体态度变化推动主角行动。' : '',
  ], 8)
}

function inferConflictWebContract(target: any = {}, sceneCards: any[] = []) {
  const activeLines = uniqueBriefStrings([
    ...sceneCards.map((scene: any, index: number) => {
      const conflict = compactBriefText(scene.conflict || scene.purpose || scene.title)
      return conflict ? `${conflict}${/线$/.test(conflict) ? '' : '线'}` : `场景${scene.scene_no || index + 1}矛盾线`
    }),
    target.conflict ? `${compactBriefText(target.conflict)}线` : '',
    target.ending_hook ? `${compactBriefText(target.ending_hook)}线` : '',
  ].filter(Boolean), 3)
  if (!activeLines.length) return null
  const nextSeeds = uniqueBriefStrings([
    target.ending_hook,
    ...sceneCards.map((scene: any) => scene.ending_hook_seed || scene.information_gap || scene.reversal),
  ].map((item: any) => compactBriefText(item)).filter(Boolean), 3)
  return {
    active_lines: activeLines,
    link_rules: [
      '2-3条矛盾线必须通过因果、利益冲突或信息差互相牵连。',
      '当前阻力、人物关系和章尾新压力不能各自无关。',
    ],
    activation_rules: uniqueBriefStrings([
      '解决一条矛盾线后，必须激活或加深另一条矛盾线。',
      nextSeeds.length ? `章尾用${nextSeeds.join('、')}接力下一条矛盾线。` : '',
    ], 4),
  }
}

function inferConflictNetworkLayersContract(target: any = {}, sceneCards: any[] = []) {
  const sceneConflicts = sceneCards.map((scene: any) => compactBriefText(scene.conflict || scene.purpose || scene.title)).filter(Boolean)
  const sceneTitles = sceneCards.map((scene: any) => compactBriefText(scene.title)).filter(Boolean)
  const rawText = [
    target.title,
    target.summary,
    target.conflict,
    target.ending_hook,
    ...sceneConflicts,
    ...sceneTitles,
  ].filter(Boolean).join(' ')
  if (!rawText.trim() && !sceneConflicts.length) return null
  const verticalSource = uniqueBriefStrings([
    target.conflict,
    ...sceneConflicts.filter((item: string) => /会长|协会|规则|权限|资质|上级|领导|宗门|师徒|公司|平台|封单|不许|挡住|压/.test(item)),
    sceneConflicts[0],
  ].map((item: any) => compactBriefText(item)).filter(Boolean), 3)[0]
  const horizontalSource = uniqueBriefStrings([
    ...sceneConflicts.filter((item: string) => /客户|同业|同行|竞争|争夺|抢|订单|资源|情敌|对手/.test(item)),
    /客户|同业|竞争|争夺|订单|资源|授权/.test(rawText) ? target.conflict : '',
    sceneConflicts[1],
  ].map((item: any) => compactBriefText(item)).filter(Boolean), 3)[0]
  const crossSource = uniqueBriefStrings([
    target.ending_hook,
    ...sceneCards.flatMap((scene: any) => [scene.ending_hook_seed, scene.reversal, scene.information_gap, ...asArray(scene.state_changes_expected || scene.stateChangesExpected)]),
    sceneConflicts[2],
  ].map((item: any) => compactBriefText(item)).filter(Boolean), 3)[0]
  return {
    vertical_conflict: verticalSource
      ? `纵向矛盾：${verticalSource}；必须体现权力/规则压制和服从-反抗关系。`
      : OH_STORY_CONFLICT_NETWORK_LAYER_RULES.vertical_conflict,
    horizontal_conflict: horizontalSource
      ? `横向矛盾：${horizontalSource}；必须体现资源、理念、客户、订单或同层竞争。`
      : OH_STORY_CONFLICT_NETWORK_LAYER_RULES.horizontal_conflict,
    cross_conflict: crossSource
      ? `交叉矛盾：${crossSource}；必须让解决一条矛盾牵动另一条。`
      : OH_STORY_CONFLICT_NETWORK_LAYER_RULES.cross_conflict,
    weaving_order: OH_STORY_CONFLICT_NETWORK_LAYER_RULES.weaving_order,
  }
}

export function buildConflictStructureContract(project: any = {}, contextPackage: any = {}) {
  const explicit = conflictStructureExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildConflictStructureContract(project, {
      ...(contextPackage || {}),
      conflict_structure_contract: null,
      conflictStructureContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            conflict_structure_contract: null,
            conflictStructureContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            conflict_structure_contract: null,
            conflictStructureContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            conflict_structure_contract: null,
            conflictStructureContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitConflictLadder = asArray(explicit.conflict_ladder || explicit.conflictLadder).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitMotivationSources = asArray(explicit.motivation_sources || explicit.motivationSources).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitAntagonistPressureRules = asArray(explicit.antagonist_pressure_rules || explicit.antagonistPressureRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitProtagonistAgencyRules = asArray(explicit.protagonist_agency_rules || explicit.protagonistAgencyRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitEventValueChanges = asArray(explicit.event_value_changes || explicit.eventValueChanges).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitNextConflictSeeds = asArray(explicit.next_conflict_seeds || explicit.nextConflictSeeds).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitConflictWeb = normalizeConflictWebContract(explicit.conflict_web || explicit.conflictWeb)
    const explicitConflictNetworkLayers = normalizeConflictNetworkLayersContract(explicit.conflict_network_layers || explicit.conflictNetworkLayers)
    const explicitNoExitRules = asArray(explicit.no_exit_rules || explicit.noExitRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_conflict_structure_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      conflict_ladder: explicitConflictLadder.length
        ? explicitConflictLadder
        : asArray(derived.conflict_ladder).length ? asArray(derived.conflict_ladder) : OH_STORY_CONFLICT_STRUCTURE_LADDER,
      motivation_sources: explicitMotivationSources.length ? explicitMotivationSources : asArray(derived.motivation_sources),
      antagonist_pressure_rules: explicitAntagonistPressureRules.length
        ? explicitAntagonistPressureRules
        : asArray(derived.antagonist_pressure_rules).length ? asArray(derived.antagonist_pressure_rules) : OH_STORY_ANTAGONIST_PRESSURE_RULES,
      protagonist_agency_rules: explicitProtagonistAgencyRules.length
        ? explicitProtagonistAgencyRules
        : asArray(derived.protagonist_agency_rules).length ? asArray(derived.protagonist_agency_rules) : OH_STORY_PROTAGONIST_AGENCY_RULES,
      event_value_changes: explicitEventValueChanges.length ? explicitEventValueChanges : asArray(derived.event_value_changes),
      next_conflict_seeds: explicitNextConflictSeeds.length ? explicitNextConflictSeeds : asArray(derived.next_conflict_seeds),
      conflict_web: explicitConflictWeb || normalizeConflictWebContract(derived.conflict_web || derived.conflictWeb),
      conflict_network_layers: explicitConflictNetworkLayers || normalizeConflictNetworkLayersContract(derived.conflict_network_layers || derived.conflictNetworkLayers),
      no_exit_rules: explicitNoExitRules.length
        ? explicitNoExitRules
        : asArray(derived.no_exit_rules).length ? asArray(derived.no_exit_rules) : OH_STORY_CONFLICT_NO_EXIT_RULES,
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_CONFLICT_STRUCTURE_QUALITY_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : ['补阻止者', '补有进无出', '补冲突升级阶梯', '补明确胜负结果', '补主角主动破局', '补下一冲突种子'],
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const rawText = [
    project?.title,
    project?.genre,
    project?.synopsis,
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
  const eventValueChanges = uniqueBriefStrings([
    ...sceneCards.flatMap((scene: any) => asArray(scene.state_changes_expected || scene.stateChangesExpected)),
    ...sceneCards.map((scene: any) => scene.reversal ? `反转改变局势：${scene.reversal}` : ''),
    target.ending_hook ? `章尾局势变化：${target.ending_hook}` : '',
  ], 12)
  const nextConflictSeeds = uniqueBriefStrings([
    target.ending_hook,
    ...sceneCards.map((scene: any) => scene.ending_hook_seed || scene.information_gap),
  ], 8)
  const conflictWeb = inferConflictWebContract(target, sceneCards)
  const conflictNetworkLayers = inferConflictNetworkLayersContract(target, sceneCards)
  const sceneConflictLadder = uniqueBriefStrings([
    ...OH_STORY_CONFLICT_STRUCTURE_LADDER,
    ...sceneCards.map((scene: any, index: number) => {
      const conflict = compactBriefText(scene.conflict || scene.purpose)
      return conflict ? `场景${scene.scene_no || index + 1}阻力：${conflict}` : ''
    }),
  ], 18)
  return {
    version: 'oh_story_conflict_structure_v1',
    source: 'oh_story_embedded_fallback',
    conflict_ladder: sceneConflictLadder,
    motivation_sources: inferConflictMotivationSources(project, contextPackage, rawText),
    antagonist_pressure_rules: OH_STORY_ANTAGONIST_PRESSURE_RULES,
    protagonist_agency_rules: OH_STORY_PROTAGONIST_AGENCY_RULES,
    event_value_changes: eventValueChanges.length ? eventValueChanges : ['本章结束时必须让胜负、资格、关系、信息、资源或局势至少一项发生变化。'],
    next_conflict_seeds: nextConflictSeeds,
    conflict_web: conflictWeb,
    conflict_network_layers: conflictNetworkLayers,
    no_exit_rules: OH_STORY_CONFLICT_NO_EXIT_RULES,
    quality_checks: OH_STORY_CONFLICT_STRUCTURE_QUALITY_CHECKS,
    revision_priorities: ['补阻止者', '补有进无出', '补冲突升级阶梯', '补明确胜负结果', '补主角主动破局', '补下一冲突种子'],
  }
}

function expectationThresholdExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.expectation_threshold_contract
    || contextPackage?.chapter_target?.expectationThresholdContract
    || contextPackage?.expectation_threshold_contract
    || contextPackage?.expectationThresholdContract
    || contextPackage?.pre_draft_brief?.expectation_threshold_contract
    || contextPackage?.preDraftBrief?.expectationThresholdContract
}

function sceneThresholds(scene: any) {
  return [
    ...asArray(scene?.required_thresholds || scene?.requiredThresholds),
    scene?.threshold,
    scene?.threshold_gate,
    scene?.thresholdGate,
    scene?.condition,
    scene?.condition_gate,
    scene?.conditionGate,
  ].map((item: any) => compactBriefText(item)).filter(Boolean)
}

export function buildExpectationThresholdContract(contextPackage: any = {}) {
  const explicit = expectationThresholdExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildExpectationThresholdContract({
      ...(contextPackage || {}),
      expectation_threshold_contract: null,
      expectationThresholdContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            expectation_threshold_contract: null,
            expectationThresholdContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            expectation_threshold_contract: null,
            expectationThresholdContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            expectation_threshold_contract: null,
            expectationThresholdContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitShortExpectation = compactBriefText(explicit.short_expectation || explicit.shortExpectation)
    const explicitMediumExpectations = asArray(explicit.medium_expectations || explicit.mediumExpectations).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitLongExpectations = asArray(explicit.long_expectations || explicit.longExpectations).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitThresholds = asArray(explicit.thresholds || explicit.gates || explicit.conditions).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitDynamicThresholds = asArray(explicit.dynamic_thresholds || explicit.dynamicThresholds).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitNestedUnits = asArray(explicit.nested_units || explicit.nestedUnits).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitExpectationBeforePayoffRules = asArray(explicit.expectation_before_payoff_rules || explicit.expectationBeforePayoffRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitExpectationRelayRules = asArray(explicit.expectation_relay_rules || explicit.expectationRelayRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitThreeLines = explicit.three_expectation_lines || explicit.threeExpectationLines || {}
    return {
      version: explicit.version || 'oh_story_expectation_threshold_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      short_expectation: explicitShortExpectation || derived.short_expectation,
      medium_expectations: explicitMediumExpectations.length ? explicitMediumExpectations : asArray(derived.medium_expectations),
      long_expectations: explicitLongExpectations.length ? explicitLongExpectations : asArray(derived.long_expectations),
      thresholds: explicitThresholds.length ? explicitThresholds : asArray(derived.thresholds),
      dynamic_thresholds: explicitDynamicThresholds.length ? explicitDynamicThresholds : asArray(derived.dynamic_thresholds),
      nested_units: explicitNestedUnits.length ? explicitNestedUnits : asArray(derived.nested_units),
      expectation_before_payoff_rules: explicitExpectationBeforePayoffRules.length
        ? explicitExpectationBeforePayoffRules
        : asArray(derived.expectation_before_payoff_rules).length
          ? asArray(derived.expectation_before_payoff_rules)
          : OH_STORY_EXPECTATION_BEFORE_PAYOFF_RULES,
      expectation_relay_rules: explicitExpectationRelayRules.length
        ? explicitExpectationRelayRules
        : asArray(derived.expectation_relay_rules).length
          ? asArray(derived.expectation_relay_rules)
          : OH_STORY_EXPECTATION_RELAY_RULES,
      three_expectation_lines: {
        plot_expectation: compactBriefText(explicitThreeLines.plot_expectation || explicitThreeLines.plotExpectation || explicitThreeLines.story_expectation || explicitThreeLines.storyExpectation)
          || derived.three_expectation_lines?.plot_expectation
          || '',
        theme_payoff: compactBriefText(explicitThreeLines.theme_payoff || explicitThreeLines.themePayoff || explicitThreeLines.theme_sweetener || explicitThreeLines.themeSweetener)
          || derived.three_expectation_lines?.theme_payoff
          || '',
        freshness_hook: compactBriefText(explicitThreeLines.freshness_hook || explicitThreeLines.freshnessHook || explicitThreeLines.novelty_hook || explicitThreeLines.noveltyHook)
          || derived.three_expectation_lines?.freshness_hook
          || '',
      },
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_EXPECTATION_THRESHOLD_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : ['补两长一短期待', '拆分系统性门槛', '补动态加码', '补跨单元期待线', '避免一步解决'],
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const expectationDebt = normalizeReaderExpectationDebtContext(
    target.reader_expectation_debt_context
    || contextPackage?.reader_expectation_debt_context,
  )
  const storylineContext = contextPackage?.storyline_context || {}
  const shortExpectation = compactBriefText(
    sceneCards.map((scene: any) => scene.reader_payoff || scene.readerPayoff).filter(Boolean)[0]
    || target.short_expectation
    || target.shortExpectation
    || target.summary
    || target.goal,
  )
  const mediumExpectations = uniqueBriefStrings([
    ...asArray(storylineContext.required).map(continuityHeatItemText),
    ...storylineUsageByAnyType(storylineContext, ['advance']),
    target.conflict,
  ], 10)
  const longExpectations = uniqueBriefStrings([
    ...asArray(expectationDebt.keep_alive).map(continuityHeatItemText),
    ...asArray(expectationDebt.must_carry).map(continuityHeatItemText),
    ...asArray(expectationDebt.overdue).map(continuityHeatItemText),
    ...storylineUsageByAnyType(storylineContext, ['plant']),
    target.ending_hook,
  ], 10)
  const thresholds = uniqueBriefStrings([
    ...sceneCards.flatMap(sceneThresholds),
    ...asArray(target.thresholds || target.gates || target.conditions),
    target.conflict && /条件|资格|门槛|达标|收集|取回|证明|验明|比赛|前五|资源|灵石|气血/.test(String(target.conflict)) ? target.conflict : '',
  ], 16)
  const dynamicThresholds = uniqueBriefStrings([
    ...sceneCards.flatMap((scene: any) => [
      scene.dynamic_threshold,
      scene.dynamicThreshold,
      scene.escalation_gate,
      scene.escalationGate,
      scene.reversal,
    ]),
    ...asArray(target.dynamic_thresholds || target.dynamicThresholds),
  ], 10)
  const nestedUnits = uniqueBriefStrings([
    target.summary,
    ...sceneCards.map((scene: any) => scene.title || scene.purpose),
    target.ending_hook ? `完成当前目标前提前露出下一步：${target.ending_hook}` : '',
  ], 12)
  const threeExpectationLines = {
    plot_expectation: compactBriefText(firstDefined(
      longExpectations.find((item: string) => /谁|为何|为什么|真相|幕后|来源|背后|第三|源头|答案/.test(item)),
      longExpectations[0],
      target.ending_hook,
      target.summary,
    )),
    theme_payoff: compactBriefText(firstDefined(
      shortExpectation,
      sceneCards.map((scene: any) => scene.reader_payoff || scene.readerPayoff).filter(Boolean)[0],
      target.reader_payoff,
      target.payoff,
    )),
    freshness_hook: compactBriefText(firstDefined(
      dynamicThresholds[0],
      thresholds.find((item: string) => /暴露|新|反转|异常|第一次|未知|旧案|血缘|规则|源头/.test(item)),
      target.innovation_hook,
      target.ending_hook,
    )),
  }
  return {
    version: 'oh_story_expectation_threshold_v1',
    source: 'oh_story_embedded_fallback',
    short_expectation: shortExpectation,
    medium_expectations: mediumExpectations,
    long_expectations: longExpectations,
    thresholds: thresholds.length ? thresholds : uniqueBriefStrings([target.conflict, target.summary], 8),
    dynamic_thresholds: dynamicThresholds,
    nested_units: nestedUnits,
    expectation_before_payoff_rules: OH_STORY_EXPECTATION_BEFORE_PAYOFF_RULES,
    expectation_relay_rules: OH_STORY_EXPECTATION_RELAY_RULES,
    three_expectation_lines: threeExpectationLines,
    quality_checks: OH_STORY_EXPECTATION_THRESHOLD_CHECKS,
    revision_priorities: ['补期待铺垫', '补两长一短期待', '拆分系统性门槛', '补动态加码', '补跨单元期待线', '避免一步解决'],
  }
}

function informationFlowExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.information_flow_contract
    || contextPackage?.chapter_target?.informationFlowContract
    || contextPackage?.information_flow_contract
    || contextPackage?.informationFlowContract
    || contextPackage?.pre_draft_brief?.information_flow_contract
    || contextPackage?.preDraftBrief?.informationFlowContract
}

function sceneInformationUnit(scene: any, index: number) {
  return compactBriefText(
    scene?.information_unit
    || scene?.informationUnit
    || scene?.reader_payoff
    || scene?.readerPayoff
    || scene?.reversal
    || scene?.turning_point
    || scene?.turningPoint
    || asArray(scene?.required_information || scene?.requiredInformation).join('；')
    || scene?.purpose
    || scene?.title
    || `场景${index + 1}信息团`,
  )
}

export function buildInformationFlowContract(contextPackage: any = {}) {
  const explicit = informationFlowExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildInformationFlowContract({
      ...(contextPackage || {}),
      information_flow_contract: null,
      informationFlowContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            information_flow_contract: null,
            informationFlowContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            information_flow_contract: null,
            informationFlowContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            information_flow_contract: null,
            informationFlowContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitInformationUnits = asArray(explicit.information_units || explicit.informationUnits).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitProgressionChain = asArray(explicit.progression_chain || explicit.progressionChain).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitTransitionRules = asArray(explicit.transition_rules || explicit.transitionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitTransitionCompressionRules = asArray(explicit.transition_compression_rules || explicit.transitionCompressionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitNextObjectiveRules = asArray(explicit.next_objective_rules || explicit.nextObjectiveRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitWaterRiskGuards = asArray(explicit.water_risk_guards || explicit.waterRiskGuards).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_information_flow_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      information_units: explicitInformationUnits.length ? explicitInformationUnits : asArray(derived.information_units),
      progression_chain: explicitProgressionChain.length ? explicitProgressionChain : asArray(derived.progression_chain),
      transition_rules: explicitTransitionRules.length
        ? explicitTransitionRules
        : asArray(derived.transition_rules).length ? asArray(derived.transition_rules) : OH_STORY_INFORMATION_TRANSITION_RULES,
      transition_compression_rules: explicitTransitionCompressionRules.length
        ? explicitTransitionCompressionRules
        : asArray(derived.transition_compression_rules).length ? asArray(derived.transition_compression_rules) : OH_STORY_INFORMATION_TRANSITION_COMPRESSION_RULES,
      next_objective_rules: explicitNextObjectiveRules.length
        ? explicitNextObjectiveRules
        : asArray(derived.next_objective_rules).length ? asArray(derived.next_objective_rules) : OH_STORY_INFORMATION_NEXT_OBJECTIVE_RULES,
      water_risk_guards: explicitWaterRiskGuards.length ? explicitWaterRiskGuards : asArray(derived.water_risk_guards),
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_INFORMATION_FLOW_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : ['压缩无关信息团', '补场景间递进', '回应上一场悬念', '修情绪衔接', '删无信息量过渡'],
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const informationUnits = uniqueBriefStrings(sceneCards.map(sceneInformationUnit), 16)
  const progressionChain = sceneCards.map((scene: any, index: number) => {
    const unit = sceneInformationUnit(scene, index)
    const nextScene = sceneCards[index + 1]
    const nextUnit = nextScene ? sceneInformationUnit(nextScene, index + 1) : compactBriefText(target.ending_hook || target.endingHook)
    const bridge = compactBriefText(
      scene?.ending_hook_seed
      || scene?.endingHookSeed
      || scene?.information_gap
      || scene?.informationGap
      || scene?.reversal
      || scene?.reader_payoff
      || '',
    )
    return compactBriefText([
      `场景${scene.scene_no || index + 1}`,
      scene?.title,
      unit,
      nextUnit ? `递进到：${nextUnit}` : '',
      bridge ? `衔接点：${bridge}` : '',
    ].filter(Boolean).join('｜'))
  }).filter(Boolean)
  const waterRiskGuards = uniqueBriefStrings([
    target.conflict && /背景|解释|闲聊|环境|寒暄|拖延/.test(String(target.conflict)) ? target.conflict : '',
    ...sceneCards.flatMap((scene: any) => [
      scene.water_risk,
      scene.waterRisk,
      scene.forbidden_filler,
      scene.forbiddenFiller,
      scene.background_dump,
      scene.backgroundDump,
    ]),
    '无关背景必须改成证据、压力、代价或下一步目标。',
    '纯过渡、纯移动、纯寒暄和纯环境描写没有信息量时直接删除或压缩。',
  ], 10)
  return {
    version: 'oh_story_information_flow_v1',
    source: 'oh_story_embedded_fallback',
    information_units: informationUnits.length ? informationUnits : uniqueBriefStrings([target.summary, target.conflict, target.ending_hook], 8),
    progression_chain: progressionChain,
    transition_rules: OH_STORY_INFORMATION_TRANSITION_RULES,
    transition_compression_rules: OH_STORY_INFORMATION_TRANSITION_COMPRESSION_RULES,
    next_objective_rules: OH_STORY_INFORMATION_NEXT_OBJECTIVE_RULES,
    water_risk_guards: waterRiskGuards,
    quality_checks: OH_STORY_INFORMATION_FLOW_CHECKS,
    revision_priorities: ['压缩无关信息团', '补场景间递进', '回应上一场悬念', '修情绪衔接', '删无信息量过渡'],
  }
}
