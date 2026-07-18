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

const OH_STORY_CHARACTER_BEHAVIOR_RULES = [
  '展示优于告知：角色目的通过行动展示，态度通过对话和反应体现，不用旁白贴标签。',
  '主角行为三必须：必须可理解、可共鸣、可接受。',
  '角色行动必须由动机链驱动：起因、意图、约束、风险不能缺席。',
  '弱点必须在关键情节导致选择压力或犯错，否则不是有效弱点。',
  '行为要符合人设逻辑，不能为了剧情方便让角色突然降智或换性格。',
]

const OH_STORY_CHARACTER_PROTAGONIST_COMPOSURE_RULES = [
  '角色逼格管理：升级线与主角反应线分开管理。',
  '升级提升的是实力，不自动改变主角的从容反应。',
  '面对低级挑衅时，主角不能被牵着走；高实力/高阅历角色应轻描淡写、短句反锁或行动压制。',
  '同样被骂，主角暴怒反击是毒点；主角微微一笑、不动声色处理，才是逼格。',
]

const OH_STORY_CHARACTER_STRONG_ASSOCIATION_RULES = [
  '人设关联分层：每个重要角色至少 3 个强关联设定。',
  '强关联必须直接影响剧情走向、核心梗装逼爽点或人物碰撞。',
  '主角的实力、钱财、人脉、背景、技能、证据、资源等影响剧情走向的属性归为强关联。',
  '弱关联不喧宾夺主：外貌、爱好、身高体重只能丰富记忆点，不能替代强关联。',
]

const OH_STORY_CHARACTER_ROLE_CARD_REQUIREMENTS = [
  '主角卡必备项：角色定位、身份标签、外貌特征、性格关键词、核心目标、核心动机、致命弱点、口头禅/标志动作。',
  '核心动机必须是情感驱动，不用“要成为最强/想变强”这种空话。',
  '致命弱点必须会在关键情节导致选择压力或犯错，否则不是有效弱点。',
  '外貌特征、口头禅和标志动作必须成为读者能秒认的记忆锚点。',
]

const OH_STORY_CHARACTER_SUPPORTING_ROLE_EXIT_RULES = [
  '配角卡必备项：角色功能、与主角关系、核心特质、标志性特征、退场方式。',
  '每个配角必须有明确功能：导师、盟友、情报源、牺牲品、镜像对照、阻碍或证据承接。',
  '配角退场要主动规划，不能写着写着忘了。',
  '同一场景配角不超过 3 个有台词；没有功能的角色合并为旁观反应、动作或叙事概括。',
]

const OH_STORY_CHARACTER_BEHAVIOR_REPEAT_RULES = [
  '人物行为重复点：抓住一个读者喜欢的人物行为特质反复写。',
  '构建方法：确定读者喜欢什么类型 -> 具体化为行为 -> 不同场景重复。',
  '人物看点和核心看点要循环产生差异化；反派/配角也需要可重复看点。',
  '行为、语言、思维必须围绕人设展开；为了剧情需要违背人设时，先改剧情，不改人设。',
]

const OH_STORY_CHARACTER_DRIVEN_EVENT_RULES = [
  '人推事件优先：情节是人物性格、动机和选择的自然结果，用事件深化人物弧光。',
  '事件推人只用于打破平衡并暴露真实自我，不能替代角色主动选择。',
  '卡文时从人物动机找方向，不要硬编剧情。',
  '矛盾来源必须来自角色利益、三观、成长环境或世界观差异，不靠反派莫名其妙针对主角。',
]

const OH_STORY_CHARACTER_PROTAGONIST_RED_LINE_RULES = [
  '主角红线：不写圣母型主角、无脑战斗机器、内核邪恶、因蠢/圣母犯错、自暴自弃。',
  '主角可以不完美，但不能让读者看不起；压势不压人，压低气势和期待，不打压主角能力和尊严。',
  '主角开篇必须用选择立人设，智斗型选择优先于单纯暴力。',
  '成长不只体现在实力上，也体现在心智和选择上；每次成长要有触发事件和内在反思。',
]

const OH_STORY_CHARACTER_IDENTITY_GOLDFINGER_ALIGNMENT_RULES = [
  '身份/金手指对齐：主角人设必须与世界基调相符，社会身份、身世、金手指、性格高度统一。',
  '显性身份负责汇集前期矛盾，必须能不断升级或更换；隐性身份负责汇集中后期矛盾。',
  '显性金手指负责开局贯穿全书，隐性金手指是主角性格中让他与众不同的部分。',
  '前期以金手指装逼，剧情推进中逐步把人设写清楚，不能让金手指脱离主角职业、身份或生活困境。',
]

const OH_STORY_CHARACTER_MOTIVATION_SPECIFICITY_RULES = [
  '起因必须具体：不能写“被欺负”这种模糊说法，要写成“在众目睽睽下被打耳光”这类可见事件。',
  '动机必须是情感层面的：为母亲复仇、守住尊严、保护具体的人，优于“要成为最强”这种空话。',
  '动机演变有铺垫：每次改变都要有触发事件、关系压力或代价，不能说变就变。',
]

const OH_STORY_CHARACTER_LAYERED_TAG_RULES = [
  '三层标签反差：身份标签、表现标签、内核标签必须能形成反差。',
  '身份标签和表现标签可以强化刻板印象，内核标签必须提供亮牌时刻。',
  '反差必须用行为对比体现，不要直接解释角色其实如何。',
]

const OH_STORY_CHARACTER_ANTAGONIST_LOGIC = [
  '反派的行为必须有内在逻辑，从他的视角说得通。',
  '反派不能降智送赢；反派越强，主角破局越需要高级、智慧或出乎意料。',
  '小反派要有鲜明特征和干脆退场，中等反派要有可信动机、手段和至少一次有效威胁。',
]

const OH_STORY_CHARACTER_ANTAGONIST_WEIGHT_RULES = [
  '反派建立四要素：实力展示、动机可信、真实威胁、终极意图时机缺一不可。',
  '反派的智商/实力决定主角的含金量；反派弱，主角赢没意义。',
  '中等反派及以上必须至少赢主角一次，或在本章造成真实损失、压制、封锁、资格威胁、证据反咬等有效威胁。',
  '反派真实目的不要开场说尽，终极意图应留到关键反转点暴露。',
  '反派是主角的镜子：反派长处要照出主角弱点，冲突不能只是纯坏或纯利益。',
]

const OH_STORY_CHARACTER_ANTAGONIST_SELF_STORY_RULES = [
  '反派也有梦想：在反派眼中他是自己故事的主人公。',
  '反派要有自己的目标、旧痛和避免的痛苦，不能只是纯工具人或纯粹的坏。',
  '反派的优势本身也是致命缺陷；遭遇逆境时会强化缺陷，而不是突然悔悟或降智。',
  '大弧 Boss 要有让读者恨不起来的侧面，并和主角形成理念冲突，不只是利益冲突。',
]

const OH_STORY_CHARACTER_ANTAGONIST_TIER_EXIT_RULES = [
  '按反派层级表设计，出场篇幅必须与层级匹配。',
  '小反派 1-5 章，只承担单个小弧线障碍，1-2 个鲜明特征即可，退场要被打败或揭穿、干脆利落。',
  '中等反派 10-30 章，是一卷主要对手，必须有动机、武力/权谋/资源手段、至少赢主角一次，退场要被主角正面击败并有爽感。',
  '大弧 Boss 代表阶段核心矛盾，要有完整人弧、理念冲突、绝境对决、让人恨不起来的侧面和有仪式感的终战落幕。',
  '最终 Boss 是全书核心矛盾具象化，必须从第一章就有伏笔，代表主题反面，实力碾压且有信念。',
]

const OH_STORY_CHARACTER_BEHAVIOR_CHECKS = [
  '主角行为三必须：行为可理解、可共鸣、可接受，并有正文证据。',
  '动机链完整：起因、意图、约束、风险至少三项在本章可见。',
  '动机检查：起因必须具体，不写“被欺负”这种模糊说法；动机必须是情感层面的，不写“要成为最强”这种空话；动机演变必须有铺垫。',
  '三层标签反差必须落成行为：身份标签、表现标签、内核标签不能只停留在设定表。',
  '展示优于告知：角色目的、态度、弱点、成长要通过行动/对话/反应体现。',
  '主角逼格反应必须可见：升级线与主角反应线分开管理，面对低级挑衅不暴怒失态，改用轻描淡写、短句或行动压制。',
  '人设强关联必须可见：每个重要角色至少3个强关联设定，直接影响剧情走向、核心梗装逼爽点或人物碰撞。',
  '每个有台词配角必须有功能；无功能角色不得占用冲突段落。',
  '角色卡必备项必须可见：角色定位、身份标签、外貌特征、核心目标、核心动机、致命弱点、口头禅/标志动作至少要有正文证据或写前合同。',
  '配角退场规划必须清楚：角色功能、关系、核心特质、标志性特征和退场方式不能缺，同一场景配角不超过 3 个有台词。',
  '行为重复点必须可见：主要角色、反派或关键配角要在不同场景重复可识别行为。',
  '人推事件优先：情节应从人物动机和选择自然推出，不要靠外部事件硬砸或作者硬编剧情。',
  '主角红线不得触碰：圣母、无脑战斗机器、内核邪恶、因蠢/圣母犯错、自暴自弃必须修掉。',
  '身份/金手指对齐：社会身份、身世、金手指、性格要和世界基调统一。',
  '反派行为有内在逻辑，不能降智送赢或只站桩嘲讽。',
  '反派分量必须可见：实力展示、动机可信、真实威胁和终极意图时机要有正文证据。',
  '反派自我叙事必须可见：他在自己故事里的梦想、旧痛、致命缺陷和理念冲突要有正文证据。',
  '反派层级退场必须匹配：小反派/中等反派/大弧 Boss/最终 Boss 的篇幅、功能和退场方式不能混用。',
  '记忆锚点要反复可见：口头禅、标志动作、外物或行为习惯至少出现一个。',
]

function characterBehaviorExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.character_behavior_contract
    || contextPackage?.chapter_target?.characterBehaviorContract
    || contextPackage?.character_behavior_contract
    || contextPackage?.characterBehaviorContract
    || contextPackage?.pre_draft_brief?.character_behavior_contract
    || contextPackage?.preDraftBrief?.characterBehaviorContract
}

function characterBriefText(item: any) {
  if (!item) return ''
  if (typeof item === 'string') return compactBriefText(item)
  return compactBriefText(
    item.name
    || item.title
    || item.role
    || item.summary
    || item.profile?.name
    || item.profile?.identity
    || item.profile?.role,
  )
}

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

