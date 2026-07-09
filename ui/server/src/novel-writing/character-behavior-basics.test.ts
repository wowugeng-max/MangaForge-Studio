import { describe, expect, test } from 'bun:test'
import {
  buildCharacterBehaviorDeterministicCheck,
  characterBehaviorPriority,
  normalizeCharacterBehaviorAntagonistLogicCheck,
  normalizeCharacterBehaviorAntagonistSelfStoryCheck,
  normalizeCharacterBehaviorAntagonistTierExitCheck,
  normalizeCharacterBehaviorAntagonistWeightCheck,
  normalizeCharacterBehaviorProtagonistComposureCheck,
  normalizeCharacterBehaviorRepeatCheck,
  normalizeCharacterBehaviorRoleCardCheck,
  normalizeCharacterBehaviorStrongAssociationCheck,
  normalizeCharacterBehaviorSupportingRoleCheck,
  normalizeCharacterBehaviorSupportingRoleExitCheck,
  normalizeCharacterBehaviorLayeredTagsCheck,
  normalizeCharacterBehaviorMotivationCheck,
  normalizeCharacterBehaviorMotivationSpecificityCheck,
  normalizeCharacterBehaviorRulesCheck,
  normalizeCharacterDrivenEventCheck,
  normalizeIdentityGoldfingerAlignmentCheck,
  normalizeProtagonistRedLineCheck,
} from './character-behavior-basics'

describe('character behavior basic sync checks', () => {
  test('confirms motivation chain when cause intent constraint and risk are visible', () => {
    const check = normalizeCharacterBehaviorMotivationCheck(
      ['行动必须有起因、意图、约束和风险。'],
      [
        '起因是周薄森当众把旧账压到李玄面前，逼他在宗祠里退让。',
        '李玄想保住母亲旧铺，也必须证明伪账本不是他做的。',
        '但他的证人身份不能暴露，否则旁观者会重新倒向周家。',
      ].join('\n'),
    )

    expect(check?.key).toBe('motivation_chain')
    expect(check?.label).toBe('动机链')
    expect(check?.delivered).toBe(true)
    expect(check?.status).toBe('ok')
    expect(check?.evidence).toEqual(expect.arrayContaining(['起因可见', '意图可见', '约束可见', '风险可见']))
  })

  test('warns when motivation chain has an unexplained sudden behavior change', () => {
    const check = normalizeCharacterBehaviorMotivationCheck(
      ['行动必须有起因、意图、约束和风险。'],
      '李玄毫无理由突然答应放弃旧铺，什么也没想。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.missed_items).toContain('行动必须有起因、意图、约束和风险。')
    expect(check?.repair_instruction).toContain('补动机链')
  })

  test('confirms motivation specificity when concrete cause emotion and setup are visible', () => {
    const check = normalizeCharacterBehaviorMotivationSpecificityCheck(
      ['起因不能只写被欺负，动机不能只写想变强。'],
      [
        '具体起因是母亲旧铺的封条被周薄森当众撕开，伪账本压到长老席前。',
        '李玄不是因为想变强，而是被亲情、羞辱和亏欠推着守住旧铺。',
        '这次触发事件从旧痛递上新封条，让他不再退让，后续才变成公开核账。',
      ].join('\n'),
    )

    expect(check?.key).toBe('motivation_specificity_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['起因具体', '情感层面动机', '动机演变有铺垫']))
  })

  test('warns when motivation specificity is vague or only about becoming strong', () => {
    const check = normalizeCharacterBehaviorMotivationSpecificityCheck(
      ['起因不能只写被欺负，动机不能只写想变强。'],
      '起因就是被欺负，动机就是要成为最强。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toContain('起因不能只写“被欺负/被针对/被压迫”')
    expect(check?.missed_items).toContain('缺情感层面动机，不能只写“要成为最强/想变强”')
    expect(check?.repair_instruction).toContain('动机检查修复')
  })

  test('confirms layered tags when identity surface behavior and core action are dramatized', () => {
    const check = normalizeCharacterBehaviorLayeredTagsCheck(
      ['身份标签、表现标签、内核标签必须行动化。'],
      [
        '李玄作为账房学徒站在宗祠证人席边，只抬眼看了周薄森一眼。',
        '他没有立刻争辩，而是按住封条，寸步不让地逼对方说漏旧账。',
      ].join('\n'),
    )

    expect(check?.key).toBe('layered_tags')
    expect(check?.label).toBe('三层标签')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['身份/关系语境', '表现标签行动化', '内核目标行动化']))
  })

  test('warns when layered tags are only told by narration', () => {
    const check = normalizeCharacterBehaviorLayeredTagsCheck(
      ['身份标签、表现标签、内核标签必须行动化。'],
      '大家都知道他很聪明，他的人设很复杂。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.repair_instruction).toContain('写成可见行为')
  })

  test('confirms behavior rules when action dialogue and reaction show character intent', () => {
    const check = normalizeCharacterBehaviorRulesCheck(
      ['目的、态度和弱点必须用行动、对话、反应展示。'],
      [
        '李玄把封条递到案上，按住账册。',
        '“说漏了。”',
        '周薄森脸色一变，旁观者的低声议论停住。',
      ].join('\n'),
    )

    expect(check?.key).toBe('behavior_rules')
    expect(check?.label).toBe('行为规则')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['动作展示', '对白展示', '反应展示']))
  })

  test('warns when behavior rules rely on abstract telling', () => {
    const check = normalizeCharacterBehaviorRulesCheck(
      ['目的、态度和弱点必须用行动、对话、反应展示。'],
      '大家都知道李玄做得对，性格很复杂，显得十分聪明。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.status).toBe('warn')
    expect(check?.issue).toContain('抽象说明')
  })

  test('confirms protagonist composure when low provocation is answered with calm control', () => {
    const check = normalizeCharacterBehaviorProtagonistComposureCheck(
      ['低级挑衅不能拖垮主角逼格。'],
      [
        '周薄森用废物二字挑衅李玄。',
        '李玄没有立刻争辩，只抬眼看字，用短句和动作压制把封条推回去。',
        '升级线只提升验印能力，不能改变他的从容反应。',
      ].join('\n'),
    )

    expect(check?.key).toBe('protagonist_composure_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['从容/轻描淡写反应', '升级线与主角反应线分开', '低级挑衅场景']))
  })

  test('warns when protagonist is dragged into toxic reaction by provocation', () => {
    const check = normalizeCharacterBehaviorProtagonistComposureCheck(
      ['低级挑衅不能拖垮主角逼格。'],
      '李玄被低级挑衅牵着走，立刻暴怒反击，面红耳赤地吼回去。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toContain('低级挑衅不能把主角拖成暴怒、面红耳赤或歇斯底里')
    expect(check?.repair_instruction).toContain('角色逼格管理')
  })

  test('confirms strong association when character settings drive plot function', () => {
    const check = normalizeCharacterBehaviorStrongAssociationCheck(
      ['重要角色至少有3个强关联设定。'],
      [
        '这组强关联设定会影响剧情走向：旧铺账权、账房审证技能和伪账本证据都直接推动反转。',
        '李玄的身份、人脉和封条线索会制造人物碰撞，也提供装逼爽点和核心梗。',
      ].join('\n'),
    )

    expect(check?.key).toBe('strong_association_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['强关联框架可见', '强关联影响剧情/爽点/碰撞', '至少3个剧情功能关联']))
  })

  test('warns when weak association replaces plot-driving character settings', () => {
    const check = normalizeCharacterBehaviorStrongAssociationCheck(
      ['重要角色至少有3个强关联设定。'],
      '角色只有身高、体重、外貌和喜欢甜糕这些弱关联，没有任何影响剧情走向的强关联。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toContain('弱关联喧宾夺主：外貌、爱好、身高体重不能替代强关联')
    expect(check?.repair_instruction).toContain('补人设强关联')
  })

  test('confirms supporting role function when side characters provide facts or stance changes', () => {
    const check = normalizeCharacterBehaviorSupportingRoleCheck(
      ['配角必须承担现场功能。'],
      [
        '林青禾没有替李玄解释，只把封条放到案上。',
        '证人上堂作证，旁观者低声停住后退开半步。',
      ].join('\n'),
    )

    expect(check?.key).toBe('supporting_role_functions')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toContain('配角提供事实/证据/立场变化')
  })

  test('warns when supporting role only praises the protagonist', () => {
    const check = normalizeCharacterBehaviorSupportingRoleCheck(
      ['配角必须承担现场功能。'],
      '林青禾只在旁边说：“你真厉害。”',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.evidence).toContain('空泛夸赞')
    expect(check?.repair_instruction).toContain('删掉空泛夸赞')
  })

  test('confirms role card requirements when core identity motive goal flaw and anchor are visible', () => {
    const check = normalizeCharacterBehaviorRoleCardCheck(
      ['角色卡必备项要完整。'],
      [
        '角色定位是落魄账房学徒，身份标签是证人。',
        '他的旧夹克袖口和短句反问是外貌特征与标志动作。',
        '核心目标是夺回旧铺，核心动机来自母亲、尊严和亏欠。',
        '致命弱点是关键情节里会藏招退让，造成选择压力。',
      ].join('\n'),
    )

    expect(check?.key).toBe('role_card_requirements')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['角色定位/身份标签', '外貌/口头禅/标志动作', '核心目标', '核心动机', '致命弱点']))
  })

  test('warns when role card fields are explicitly missing', () => {
    const check = normalizeCharacterBehaviorRoleCardCheck(
      ['角色卡必备项要完整。'],
      '角色卡缺失，没有角色定位，核心目标不清，核心动机不清，致命弱点没有。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toContain('角色卡必备项被正文显式否定')
    expect(check?.repair_instruction).toContain('补角色卡必备项')
  })

  test('confirms supporting role exit when function and exit plan are explicit', () => {
    const check = normalizeCharacterBehaviorSupportingRoleExitCheck(
      ['配角要有功能和退场方式。'],
      [
        '林青禾的配角功能是事实证人和情报源，她与主角关系是临时盟友。',
        '她保留核心特质和标志性特征后主动退到人群边缘，后续退场方式是暂退。',
      ].join('\n'),
    )

    expect(check?.key).toBe('supporting_role_exit_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['配角功能/特质可见', '退场方式可见']))
  })

  test('warns when supporting roles over-speak or have no exit plan', () => {
    const check = normalizeCharacterBehaviorSupportingRoleExitCheck(
      ['配角要有功能和退场方式。'],
      '五个配角一直发言，配角退场方式没有规划，还留下没有功能的角色。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toContain('同一场景配角有台词人数超过 3 个')
    expect(check?.repair_instruction).toContain('同场超过3个配角')
  })

  test('confirms behavior repeat when signature actions recur with a frame', () => {
    const check = normalizeCharacterBehaviorRepeatCheck(
      ['主要角色需要行为重复点。'],
      '行为重复点在不同场景重复：开场旧夹克袖口，中段短句反问，章尾按住封条，每到关键就重复出现。',
    )

    expect(check?.key).toBe('behavior_repeat_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['行为重复框架可见', '记忆动作多次出现']))
  })

  test('warns when behavior repeat points are forgotten', () => {
    const check = normalizeCharacterBehaviorRepeatCheck(
      ['主要角色需要行为重复点。'],
      '没有行为重复点，口头禅和标志动作写着写着忘了。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toContain('口头禅或标志动作写着写着忘了')
    expect(check?.repair_instruction).toContain('补行为重复点')
  })

  test('confirms character-driven event when motive and choice push the plot', () => {
    const check = normalizeCharacterDrivenEventCheck(
      ['事件必须由人物动机和选择推出。'],
      '李玄因为亲情和尊严想要守住旧铺，他选择反问并行动，人物性格自然推出冲突和代价。',
    )

    expect(check?.key).toBe('character_driven_event_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['人物动机可见', '人物选择/行动可见']))
  })

  test('warns when plot is pushed by hard external events', () => {
    const check = normalizeCharacterDrivenEventCheck(
      ['事件必须由人物动机和选择推出。'],
      '这是剧情需要，外部事件突然硬砸下来，和他的动机无关，事情自己解决。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toContain('事件靠外部硬砸或作者硬编')
    expect(check?.repair_instruction).toContain('改成人推事件')
  })

  test('confirms protagonist red line when no violation is present', () => {
    const check = normalizeProtagonistRedLineCheck(
      ['主角不能圣母、无脑或自暴自弃。'],
      '李玄选择智斗，守住底线和尊严，从容不被挑衅牵着走。',
    )

    expect(check?.key).toBe('protagonist_red_line_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.score).toBeGreaterThanOrEqual(80)
  })

  test('warns when protagonist red lines are violated', () => {
    const check = normalizeProtagonistRedLineCheck(
      ['主角不能圣母、无脑或自暴自弃。'],
      '主角变成圣母型主角和无脑战斗机器，因蠢犯错后自暴自弃，让读者看不起。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toContain('触碰圣母、无脑战斗机器、内核邪恶、因蠢/圣母犯错或自暴自弃等主角红线')
    expect(check?.repair_instruction).toContain('修主角红线')
  })

  test('confirms identity and goldfinger alignment when identity lineage and abilities are tied together', () => {
    const check = normalizeIdentityGoldfingerAlignmentCheck(
      ['身份、身世、金手指、性格必须统一。'],
      '身份/金手指对齐：显性身份是账房学徒，隐性身世牵出旧铺血契金手指，显性金手指与隐性金手指都贴合审证性格。',
    )

    expect(check?.key).toBe('identity_goldfinger_alignment_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toContain('社会身份/身世/金手指/性格对齐')
  })

  test('warns when identity and goldfinger are mismatched', () => {
    const check = normalizeIdentityGoldfingerAlignmentCheck(
      ['身份、身世、金手指、性格必须统一。'],
      '社会身份不统一，金手指脱离账房身份，李玄突然靠系统解决问题。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.evidence).toContain('身份与金手指不统一')
    expect(check?.repair_instruction).toContain('补身份/金手指对齐')
  })

  test('confirms antagonist logic when goal method and consequence are visible', () => {
    const check = normalizeCharacterBehaviorAntagonistLogicCheck(
      ['反派行动要有目标、手段和后果。'],
      '周薄森为了保住账房资源，先用身份压人，又急着转移证据焦点，反倒露出破绽并说漏封口来源。',
    )

    expect(check?.key).toBe('antagonist_logic')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['反派目标', '反派手段', '手段后果']))
  })

  test('warns when antagonist logic is dumb-villain behavior', () => {
    const check = normalizeCharacterBehaviorAntagonistLogicCheck(
      ['反派行动要有目标、手段和后果。'],
      '反派站在原地嘲讽，主动把秘密告诉主角，明显降智送赢。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.evidence).toContain('反派降智')
    expect(check?.repair_instruction).toContain('反派视角')
  })

  test('confirms antagonist weight when strength motive threat and hidden purpose are present', () => {
    const check = normalizeCharacterBehaviorAntagonistWeightCheck(
      ['反派要有实力、动机、真实威胁和终极意图时机。'],
      [
        '周薄森亮出手段和身份压人，为了保住账房资源才连续施压。',
        '资格封锁造成真实威胁，李玄一度失去主动。',
        '真实目的暂不暴露，留到关键反转；他借规则压人，也照出主角弱点。',
      ].join('\n'),
    )

    expect(check?.key).toBe('antagonist_weight_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['实力/手段展示', '动机可信', '真实威胁或阶段压制', '终极意图时机']))
  })

  test('warns when antagonist weight is weakened or dumb', () => {
    const check = normalizeCharacterBehaviorAntagonistWeightCheck(
      ['反派要有实力、动机、真实威胁和终极意图时机。'],
      '反派很弱，只是纯粹的坏，主动泄密，赢了也没意义。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.evidence).toContain('反派弱化或降智送赢')
    expect(check?.repair_instruction).toContain('补反派分量')
  })

  test('confirms antagonist self story when dream pain flaw and ideology are visible', () => {
    const check = normalizeCharacterBehaviorAntagonistSelfStoryCheck(
      ['反派要有自己的故事。'],
      [
        '在他眼中自己才是主人公，他也有梦想和信念。',
        '当年失去旧铺账权的旧痛让他避免再次被伤害。',
        '他的长处也是致命缺陷，越守规则越强化缺陷，并和主角形成理念冲突。',
      ].join('\n'),
    )

    expect(check?.key).toBe('antagonist_self_story_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['反派自己的故事/梦想', '旧痛或避免的痛苦', '优势即致命缺陷', '理念冲突']))
  })

  test('warns when antagonist is only a flat tool', () => {
    const check = normalizeCharacterBehaviorAntagonistSelfStoryCheck(
      ['反派要有自己的故事。'],
      '反派只是制造障碍的纯工具人，没有自己的目标，脸谱化得像NPC。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.evidence).toContain('反派工具人/脸谱化')
    expect(check?.repair_instruction).toContain('补反派自我叙事')
  })

  test('confirms antagonist tier exit when scope function means and exit match the tier', () => {
    const check = normalizeCharacterBehaviorAntagonistTierExitCheck(
      ['反派层级、篇幅、功能和退场方式要匹配。'],
      [
        '按反派层级定位为中等反派，10-30章，作为一卷主要对手和阶段核心矛盾。',
        '他使用权谋、资源和手段连续施压，承担主题反面。',
        '退场规划是被主角正面击败并揭穿，干脆利落留下爽感和仪式感。',
      ].join('\n'),
    )

    expect(check?.key).toBe('antagonist_tier_exit_rules')
    expect(check?.delivered).toBe(true)
    expect(check?.evidence).toEqual(expect.arrayContaining(['反派层级定位', '篇幅/层级匹配', '层级功能与手段', '退场或击败规划']))
  })

  test('warns when antagonist tier exit mismatches scope or foreshadowing', () => {
    const check = normalizeCharacterBehaviorAntagonistTierExitCheck(
      ['反派层级、篇幅、功能和退场方式要匹配。'],
      '最终 Boss 没有第一章伏笔，突然冒出来的怪物；小反派拖成三十章，层级和篇幅不匹配。',
    )

    expect(check?.delivered).toBe(false)
    expect(check?.evidence).toContain('层级篇幅或退场错配')
    expect(check?.repair_instruction).toContain('补反派层级与退场')
  })

  test('builds deterministic character behavior risks for hard failures', () => {
    const check = buildCharacterBehaviorDeterministicCheck(
      '李玄忽然性格大变，大家都知道他很聪明。林青禾只在旁边说：“你真厉害。”反派站在原地嘲讽。',
    )

    expect(check?.key).toBe('character_behavior_forbidden')
    expect(check?.delivered).toBe(false)
    expect(check?.missed_items).toEqual(expect.arrayContaining(['行为突变', '旁白贴人设', '配角空夸', '反派降智']))
    expect(check?.repair_instruction).toContain('角色行为口径')
  })

  test('returns null deterministic character behavior check when no hard risk is found', () => {
    const check = buildCharacterBehaviorDeterministicCheck(
      '李玄因为证据压力选择反问，林青禾递出封条，周薄森为了保住账权转移证据焦点。',
    )

    expect(check).toBeNull()
  })

  test('prioritizes character behavior repairs by highest-impact missed checks', () => {
    expect(characterBehaviorPriority([
      { key: 'antagonist_logic' },
      { key: 'antagonist_weight_rules' },
    ])).toBe('优先补反派分量')

    expect(characterBehaviorPriority([
      { key: 'layered_tags' },
      { key: 'memory_anchors' },
    ])).toBe('优先补记忆锚点')
  })
})
