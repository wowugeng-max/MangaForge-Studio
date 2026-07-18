import { asArray } from '../../routes/novel-route-utils'
import {
  buildCharacterRelationDeterministicCheck,
  characterRelationArray,
  characterRelationPriority,
  normalizeCharacterRelationBufferZoneCheck,
  normalizeCharacterRelationCheck,
  normalizeCharacterRelationExpectationHubCheck,
  normalizeCharacterRelationGoalOwnershipCheck,
  normalizeCharacterRelationLifeRuleCheck,
  normalizeCharacterRelationQualityCheck,
} from '../../novel-writing/character-relation-basics'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

export function buildCharacterBehaviorContract(contextPackage: any = {}) {
  const explicit = characterBehaviorExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildCharacterBehaviorContract({
      ...(contextPackage || {}),
      character_behavior_contract: null,
      characterBehaviorContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            character_behavior_contract: null,
            characterBehaviorContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            character_behavior_contract: null,
            characterBehaviorContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            character_behavior_contract: null,
            characterBehaviorContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const explicitMotivationChain = asArray(explicit.motivation_chain || explicit.motivationChain).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitMotivationSpecificityRules = asArray(explicit.motivation_specificity_rules || explicit.motivationSpecificityRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitLayeredTags = asArray(explicit.layered_tags || explicit.layeredTags).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitBehaviorRules = asArray(explicit.behavior_rules || explicit.behaviorRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitProtagonistComposureRules = asArray(explicit.protagonist_composure_rules || explicit.protagonistComposureRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitStrongAssociationRules = asArray(explicit.strong_association_rules || explicit.strongAssociationRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitMemoryAnchors = asArray(explicit.memory_anchors || explicit.memoryAnchors).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSupportingRoleFunctions = asArray(explicit.supporting_role_functions || explicit.supportingRoleFunctions).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitRoleCardRequirements = asArray(explicit.role_card_requirements || explicit.roleCardRequirements).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitSupportingRoleExitRules = asArray(explicit.supporting_role_exit_rules || explicit.supportingRoleExitRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitBehaviorRepeatRules = asArray(explicit.behavior_repeat_rules || explicit.behaviorRepeatRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitCharacterDrivenEventRules = asArray(explicit.character_driven_event_rules || explicit.characterDrivenEventRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitProtagonistRedLineRules = asArray(explicit.protagonist_red_line_rules || explicit.protagonistRedLineRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitIdentityGoldfingerAlignmentRules = asArray(explicit.identity_goldfinger_alignment_rules || explicit.identityGoldfingerAlignmentRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitAntagonistLogic = asArray(explicit.antagonist_logic || explicit.antagonistLogic).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitAntagonistWeightRules = asArray(explicit.antagonist_weight_rules || explicit.antagonistWeightRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitAntagonistSelfStoryRules = asArray(explicit.antagonist_self_story_rules || explicit.antagonistSelfStoryRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitAntagonistTierExitRules = asArray(explicit.antagonist_tier_exit_rules || explicit.antagonistTierExitRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_character_behavior_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      motivation_chain: explicitMotivationChain.length ? explicitMotivationChain : asArray(derived.motivation_chain),
      motivation_specificity_rules: explicitMotivationSpecificityRules.length
        ? explicitMotivationSpecificityRules
        : asArray(derived.motivation_specificity_rules).length ? asArray(derived.motivation_specificity_rules) : OH_STORY_CHARACTER_MOTIVATION_SPECIFICITY_RULES,
      layered_tags: explicitLayeredTags.length
        ? explicitLayeredTags
        : asArray(derived.layered_tags).length ? asArray(derived.layered_tags) : OH_STORY_CHARACTER_LAYERED_TAG_RULES,
      behavior_rules: explicitBehaviorRules.length
        ? explicitBehaviorRules
        : asArray(derived.behavior_rules).length ? asArray(derived.behavior_rules) : OH_STORY_CHARACTER_BEHAVIOR_RULES,
      protagonist_composure_rules: explicitProtagonistComposureRules.length
        ? explicitProtagonistComposureRules
        : asArray(derived.protagonist_composure_rules || derived.protagonistComposureRules).length ? asArray(derived.protagonist_composure_rules || derived.protagonistComposureRules) : OH_STORY_CHARACTER_PROTAGONIST_COMPOSURE_RULES,
      strong_association_rules: explicitStrongAssociationRules.length
        ? explicitStrongAssociationRules
        : asArray(derived.strong_association_rules || derived.strongAssociationRules).length ? asArray(derived.strong_association_rules || derived.strongAssociationRules) : OH_STORY_CHARACTER_STRONG_ASSOCIATION_RULES,
      memory_anchors: explicitMemoryAnchors.length ? explicitMemoryAnchors : asArray(derived.memory_anchors),
      supporting_role_functions: explicitSupportingRoleFunctions.length ? explicitSupportingRoleFunctions : asArray(derived.supporting_role_functions),
      role_card_requirements: explicitRoleCardRequirements.length
        ? explicitRoleCardRequirements
        : asArray(derived.role_card_requirements || derived.roleCardRequirements).length ? asArray(derived.role_card_requirements || derived.roleCardRequirements) : OH_STORY_CHARACTER_ROLE_CARD_REQUIREMENTS,
      supporting_role_exit_rules: explicitSupportingRoleExitRules.length
        ? explicitSupportingRoleExitRules
        : asArray(derived.supporting_role_exit_rules || derived.supportingRoleExitRules).length ? asArray(derived.supporting_role_exit_rules || derived.supportingRoleExitRules) : OH_STORY_CHARACTER_SUPPORTING_ROLE_EXIT_RULES,
      behavior_repeat_rules: explicitBehaviorRepeatRules.length
        ? explicitBehaviorRepeatRules
        : asArray(derived.behavior_repeat_rules || derived.behaviorRepeatRules).length ? asArray(derived.behavior_repeat_rules || derived.behaviorRepeatRules) : OH_STORY_CHARACTER_BEHAVIOR_REPEAT_RULES,
      character_driven_event_rules: explicitCharacterDrivenEventRules.length
        ? explicitCharacterDrivenEventRules
        : asArray(derived.character_driven_event_rules || derived.characterDrivenEventRules).length ? asArray(derived.character_driven_event_rules || derived.characterDrivenEventRules) : OH_STORY_CHARACTER_DRIVEN_EVENT_RULES,
      protagonist_red_line_rules: explicitProtagonistRedLineRules.length
        ? explicitProtagonistRedLineRules
        : asArray(derived.protagonist_red_line_rules || derived.protagonistRedLineRules).length ? asArray(derived.protagonist_red_line_rules || derived.protagonistRedLineRules) : OH_STORY_CHARACTER_PROTAGONIST_RED_LINE_RULES,
      identity_goldfinger_alignment_rules: explicitIdentityGoldfingerAlignmentRules.length
        ? explicitIdentityGoldfingerAlignmentRules
        : asArray(derived.identity_goldfinger_alignment_rules || derived.identityGoldfingerAlignmentRules).length ? asArray(derived.identity_goldfinger_alignment_rules || derived.identityGoldfingerAlignmentRules) : OH_STORY_CHARACTER_IDENTITY_GOLDFINGER_ALIGNMENT_RULES,
      antagonist_logic: explicitAntagonistLogic.length
        ? explicitAntagonistLogic
        : asArray(derived.antagonist_logic).length ? asArray(derived.antagonist_logic) : OH_STORY_CHARACTER_ANTAGONIST_LOGIC,
      antagonist_weight_rules: explicitAntagonistWeightRules.length
        ? explicitAntagonistWeightRules
        : asArray(derived.antagonist_weight_rules || derived.antagonistWeightRules).length ? asArray(derived.antagonist_weight_rules || derived.antagonistWeightRules) : OH_STORY_CHARACTER_ANTAGONIST_WEIGHT_RULES,
      antagonist_self_story_rules: explicitAntagonistSelfStoryRules.length
        ? explicitAntagonistSelfStoryRules
        : asArray(derived.antagonist_self_story_rules || derived.antagonistSelfStoryRules).length ? asArray(derived.antagonist_self_story_rules || derived.antagonistSelfStoryRules) : OH_STORY_CHARACTER_ANTAGONIST_SELF_STORY_RULES,
      antagonist_tier_exit_rules: explicitAntagonistTierExitRules.length
        ? explicitAntagonistTierExitRules
        : asArray(derived.antagonist_tier_exit_rules || derived.antagonistTierExitRules).length ? asArray(derived.antagonist_tier_exit_rules || derived.antagonistTierExitRules) : OH_STORY_CHARACTER_ANTAGONIST_TIER_EXIT_RULES,
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_CHARACTER_BEHAVIOR_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : ['补动机链', '用行为展示人设', '补主角逼格反应', '补三层标签反差', '补人设强关联', '补记忆锚点', '补反派分量', '补反派自我叙事', '补反派层级退场', '修反派降智'],
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const characterArc = target.character_arc_brief || contextPackage?.character_arc_context || {}
  const characters = [
    ...asArray(contextPackage?.story_state?.characters),
    ...asArray(contextPackage?.setting_context?.characters),
    ...asArray(contextPackage?.setting_context?.entities).filter((item: any) => ['character', 'protagonist', 'antagonist'].includes(String(item?.entity_type || item?.type || ''))),
  ]
  const protagonist = characters[0] || {}
  const protagonistName = compactBriefText(protagonist?.name || protagonist?.profile?.name || protagonist?.role || '主角')
  const traits = uniqueBriefStrings([
    ...asArray(protagonist?.traits),
    ...asArray(protagonist?.profile?.traits),
    characterArc.voice_anchor,
    characterArc.flaw_pressure,
  ], 8)
  const motivationChain = uniqueBriefStrings([
    characterArc.desire ? `意图：${characterArc.desire}` : '',
    characterArc.goal ? `意图：${characterArc.goal}` : '',
    characterArc.flaw_pressure ? `约束：${characterArc.flaw_pressure}` : '',
    characterArc.growth_beat ? `风险/选择：${characterArc.growth_beat}` : '',
    target.conflict ? `起因：${target.conflict}` : '',
    target.ending_hook ? `风险：${target.ending_hook}` : '',
    protagonist?.goal ? `意图：${protagonist.goal}` : '',
    protagonist?.flaw ? `约束：${protagonist.flaw}` : '',
  ], 10)
  const layeredTags = uniqueBriefStrings([
    `身份标签：${compactBriefText(protagonist?.role || protagonist?.identity || protagonist?.profile?.identity || protagonistName)}`,
    traits.length ? `表现标签：${traits.join('、')}` : '',
    characterArc.growth_beat ? `内核标签：${characterArc.growth_beat}` : '',
    characterArc.desire ? `内核目标：${characterArc.desire}` : '',
    ...OH_STORY_CHARACTER_LAYERED_TAG_RULES,
  ], 12)
  const memoryAnchors = uniqueBriefStrings([
    characterArc.voice_anchor,
    characterArc.voiceAnchor,
    characterArc.signature_action,
    characterArc.signatureAction,
    ...sceneCards.flatMap((scene: any) => [
      scene.character_voice,
      scene.characterVoice,
      scene.key_dialogue,
      scene.keyDialogue,
      scene.reader_payoff,
      scene.title && /旧夹克|录音|口头禅|标志|动作|左手|疤|烟|刀|伞|铃/.test(String(scene.title)) ? scene.title : '',
      ...asArray(scene.action_beats || scene.actionBeats).filter((item: any) => /旧夹克|录音|短句|反问|动作|挂|按|摸|笑/.test(String(item))),
    ]),
  ], 12)
  const strongAssociationRules = uniqueBriefStrings([
    ...OH_STORY_CHARACTER_STRONG_ASSOCIATION_RULES,
    protagonist?.goal ? `主角目标强关联：${protagonist.goal}` : '',
    protagonist?.role ? `身份/职业强关联：${protagonist.role}` : '',
    characterArc.desire ? `欲望强关联：${characterArc.desire}` : '',
    characterArc.flaw_pressure ? `弱点强关联：${characterArc.flaw_pressure}` : '',
    target.conflict ? `冲突强关联：${target.conflict}` : '',
    ...sceneCards.flatMap((scene: any) => [
      scene.reader_payoff ? `爽点强关联：${scene.reader_payoff}` : '',
      scene.reversal ? `反转强关联：${scene.reversal}` : '',
      scene.conflict ? `碰撞强关联：${scene.conflict}` : '',
    ]),
  ], 16)
  const supportingRoleFunctions = uniqueBriefStrings([
    ...characters.slice(1).map((item: any) => {
      const name = compactBriefText(item?.name || item?.profile?.name || item?.role)
      const role = compactBriefText(item?.role || item?.function || item?.profile?.role)
      return name && role ? `${name}：${role}` : name || role
    }),
    ...sceneCards.flatMap((scene: any) => asArray(scene.characters_present || scene.charactersPresent).map((name: any) => `出场功能待验证：${name}`)),
  ], 12)
  const roleCardRequirements = uniqueBriefStrings([
    ...OH_STORY_CHARACTER_ROLE_CARD_REQUIREMENTS,
    protagonistName ? `主角姓名/角色定位：${protagonistName}` : '',
    protagonist?.role || protagonist?.identity || protagonist?.profile?.identity ? `身份标签：${compactBriefText(protagonist?.role || protagonist?.identity || protagonist?.profile?.identity)}` : '',
    traits.length ? `性格关键词：${traits.join('、')}` : '',
    protagonist?.goal ? `核心目标：${protagonist.goal}` : '',
    characterArc.desire ? `核心动机：${characterArc.desire}` : '',
    protagonist?.flaw || characterArc.flaw_pressure ? `致命弱点：${compactBriefText(protagonist?.flaw || characterArc.flaw_pressure)}` : '',
    memoryAnchors.length ? `口头禅/标志动作：${memoryAnchors.slice(0, 3).join('、')}` : '',
  ], 16)
  const supportingRoleExitRules = uniqueBriefStrings([
    ...OH_STORY_CHARACTER_SUPPORTING_ROLE_EXIT_RULES,
    ...characters.slice(1).map((item: any) => {
      const name = compactBriefText(item?.name || item?.profile?.name || item?.role)
      const role = compactBriefText(item?.role || item?.function || item?.profile?.role)
      const exitPlan = compactBriefText(item?.exit_plan || item?.exitPlan || item?.departure || item?.profile?.exit_plan)
      return name ? `${name}：功能=${role || '待明确'}；退场方式=${exitPlan || '待规划'}` : ''
    }),
  ], 14)
  const behaviorRepeatRules = uniqueBriefStrings([
    ...OH_STORY_CHARACTER_BEHAVIOR_REPEAT_RULES,
    memoryAnchors.length ? `本章优先重复的行为/记忆点：${memoryAnchors.slice(0, 4).join('、')}` : '',
    ...sceneCards.flatMap((scene: any) => asArray(scene.action_beats || scene.actionBeats).filter((item: any) => /按|摸|看|笑|问|短句|反问|沉默|旧夹克|录音|标志/.test(String(item))).map((item: any) => `场景行为重复点：${compactBriefText(item)}`)),
  ], 14)
  return {
    version: 'oh_story_character_behavior_v1',
    source: 'oh_story_embedded_fallback',
    motivation_chain: motivationChain.length ? motivationChain : uniqueBriefStrings([target.summary, target.conflict], 8),
    motivation_specificity_rules: OH_STORY_CHARACTER_MOTIVATION_SPECIFICITY_RULES,
    layered_tags: layeredTags,
    behavior_rules: OH_STORY_CHARACTER_BEHAVIOR_RULES,
    protagonist_composure_rules: OH_STORY_CHARACTER_PROTAGONIST_COMPOSURE_RULES,
    strong_association_rules: strongAssociationRules.length ? strongAssociationRules : OH_STORY_CHARACTER_STRONG_ASSOCIATION_RULES,
    memory_anchors: memoryAnchors,
    supporting_role_functions: supportingRoleFunctions,
    role_card_requirements: roleCardRequirements,
    supporting_role_exit_rules: supportingRoleExitRules,
    behavior_repeat_rules: behaviorRepeatRules,
    character_driven_event_rules: OH_STORY_CHARACTER_DRIVEN_EVENT_RULES,
    protagonist_red_line_rules: OH_STORY_CHARACTER_PROTAGONIST_RED_LINE_RULES,
    identity_goldfinger_alignment_rules: OH_STORY_CHARACTER_IDENTITY_GOLDFINGER_ALIGNMENT_RULES,
    antagonist_logic: OH_STORY_CHARACTER_ANTAGONIST_LOGIC,
    antagonist_weight_rules: OH_STORY_CHARACTER_ANTAGONIST_WEIGHT_RULES,
    antagonist_self_story_rules: OH_STORY_CHARACTER_ANTAGONIST_SELF_STORY_RULES,
    antagonist_tier_exit_rules: OH_STORY_CHARACTER_ANTAGONIST_TIER_EXIT_RULES,
    quality_checks: OH_STORY_CHARACTER_BEHAVIOR_CHECKS,
    revision_priorities: ['补动机链', '用行为展示人设', '补主角逼格反应', '补三层标签反差', '补人设强关联', '补记忆锚点', '补反派分量', '补反派自我叙事', '补反派层级退场', '修反派降智'],
  }
}

const OH_STORY_ASSET_LINKAGE_RULES = [
  '信息跟着冲突走：设定、物件、能力、势力必须通过事件、选择、阻碍或对话压力释放，不能整段说明。',
  '每个关键资产必须绑定功能、归属、触发条件、限制、后果，缺任一项就不能当作破局答案。',
  '孤立资产禁止：本章出现的资产必须推进目标、制造阻碍、兑现伏笔、改变关系或打开章尾钩子。',
  '新设定量可控：一章不要同时塞入超过 3 个全新概念；已有资产优先用状态变化产生新鲜感。',
  '禁揭资产不得误触；允许资产只能按当前角色知识边界使用。',
]

const OH_STORY_ASSET_THREE_APPEARANCE_RULES = [
  '贯穿物件三次出现：第1次建立初始意义，第2次在中段转折颠覆意义，第3次在结尾兑现情绪或证据冲击。',
  '同一资产每次出现都要改变读者已知信息、角色处境或关系状态，不能只是重复点名。',
  '关键资产的视觉/物理变化要优先于抽象解释，用可见变化承载震惊、反转或余韵。',
]

const OH_STORY_ASSET_PROP_ABILITY_EXPECTATION_RULES = [
  '道具能力展示的8步期待模板：展示宝物功能强大 -> 配角因信息不足认为鸡肋 -> 展示反派且宝物恰好克制反派 -> 配角拿更强装备失败 -> 主角做针对性方案 -> 主角上场众人不看好 -> 主角用道具压制反派，鸡肋成神器 -> 结果留下新目标或新钩子。',
  '关键资产承担破局或金手指功能时，必须先制造误判、克制关系和他人失败，再让主角出手兑现期待。',
  '道具变化要可视化：功能释放必须造成明确的视觉、物理、规则或关系状态变化，不能只写“众人震惊”。',
]

const OH_STORY_ASSET_LINKAGE_CHECKS = [
  '孤立资产检查：每个关键资产都必须与本章目标、冲突、回报或章尾钩子至少一项相连。',
  '功能链完整：功能、归属、触发条件、限制、后果必须有正文证据。',
  '状态变化可见：资产从开场到结尾至少产生一次意义、归属、可见性或风险变化。',
  '信息跟着冲突走：设定信息必须由事件/对话/行动压力带出，不能大段说明。',
  '贯穿道具按三次出现或本章片段职责执行，不能只点名不使用。',
  '道具能力展示：关键资产破局时必须按“强大功能 -> 鸡肋误判 -> 克制反派 -> 他人失败 -> 主角方案 -> 众人不看好 -> 鸡肋成神器 -> 新钩子”拉期待。',
  '禁揭/知识边界准确：forbidden 资产不泄漏，角色不能知道 knowledge_scope 外的信息。',
  '新概念不过载：本章新增设定超过 3 个或抢走主线时必须压缩。',
]

