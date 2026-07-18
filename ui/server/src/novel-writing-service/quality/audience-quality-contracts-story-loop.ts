import { asArray } from '../../routes/novel-route-utils'
import { compactBriefText, uniqueBriefStrings } from './text-utils'

const OH_STORY_STORY_LOOP_CHECKS = [
  '循环模式必须由题材 + 金手指 + 主角身份共同推出，三者不能互相打架。',
  '每章必须至少推进一次循环：进入问题/资源/挑战 -> 行动验证 -> 获得反馈 -> 抛出下一轮燃料。',
  '循环燃料必须清楚：信息差、资源、震惊反馈、反转收益、组织信息交换或人物塑造力至少命中一种。',
  '新手村或当前地图要有资源闭环：学习/训练、变现/补给、敌人靶子、管理/上升通道至少不互相断裂。',
  '地位升高必须同步提高环境危险度、规则复杂度、对手层级或代价，否则读者会觉得无聊。',
  '换地图或换阶段时必须保留至少一条贯穿主线，并提前铺垫新地图吸引力。',
]

const OH_STORY_STORY_LOOP_MAP_TRANSITION_RULES = [
  '换地图前旧地图核心冲突至少阶段性解决。',
  '新地图 = 新环境 + 新角色 + 新规则 + 新目标 + 新冲突。',
  '换地图后前5章必须快速建立新的代入感和期待感。',
  '保留至少一条贯穿主线，不能旧角色一刀切全部抛弃。',
  '新设定不能一次性全部倒出；每次换地图循环要升级：更大规模、更高门槛、更强对手。',
  '优先用过渡人物、新旧地图联动或旧日关系线连接新旧地图。',
  '人际关系先行：换地图前先让人际关系动了 -> 主角再动，不能让主角突然跳进新地图。',
]

const OH_STORY_STORY_LOOP_NESTED_LOOP_RULES = [
  '多级嵌套：小循环 -> 中循环（次级目标）-> 大循环（卷目标）。',
  '小循环中必须铺垫大循环的期待，不能只完成本章局部事件。',
  '在重复中变化：同一核心卖点的不同角度/不同矛盾要持续推进，避免只反复用同一个梗换对象。',
]

const OH_STORY_STORY_LOOP_MODES = [
  {
    mode: '案件串循环',
    pattern: /规则|案件|推理|谜|线索|真相|调查|怪谈|诡异|悬疑/,
    fuel: '信息差+推理',
    steps: ['案件', '解谜', '部分真相', '更大谜团', '新案件'],
  },
  {
    mode: '扮猪吃虎循环',
    pattern: /扮猪吃虎|挑衅|碾压|震惊|装逼|打脸|反打/,
    fuel: '读者-角色信息差',
    steps: ['默默发育', '挑衅', '碾压', '震惊', '继续发育'],
  },
  {
    mode: '资源积累循环',
    pattern: /修炼|升级|资源|境界|技能|装备|副本|地图|灵石|经验/,
    fuel: '资源与能力螺旋上升',
    steps: ['资源', '技能', '实力', '新地图', '新资源'],
  },
  {
    mode: '戏剧性反转循环',
    pattern: /亏钱|投资|经营|反转|赚钱|商业|系统奖励/,
    fuel: '不依赖数值膨胀的反转收益',
    steps: ['亏钱', '反转赚更多', '拿更多钱去亏', '又赚'],
  },
  {
    mode: '组织枢纽循环',
    pattern: /组织|公会|门派|团队|势力|信息汇聚|多线/,
    fuel: '信息交换+多线',
    steps: ['各自冒险', '信息汇聚', '衍生新剧情'],
  },
  {
    mode: '公路片循环',
    pattern: /旅行|公路|路上|走一段|新地点|遇见|游历/,
    fuel: '人物塑造力',
    steps: ['走一段路', '遇一个人', '又走', '又遇'],
  },
]





function storyLoopExplicitContract(contextPackage: any = {}) {
  return contextPackage?.chapter_target?.story_loop_contract
    || contextPackage?.chapter_target?.storyLoopContract
    || contextPackage?.story_loop_contract
    || contextPackage?.storyLoopContract
    || contextPackage?.pre_draft_brief?.story_loop_contract
    || contextPackage?.preDraftBrief?.storyLoopContract
}

function inferStoryLoopMode(text: string) {
  return OH_STORY_STORY_LOOP_MODES.find(item => item.pattern.test(text)) || OH_STORY_STORY_LOOP_MODES[2]
}

export function buildStoryLoopContract(project: any = {}, contextPackage: any = {}) {
  const explicit = storyLoopExplicitContract(contextPackage)
  if (explicit && typeof explicit === 'object' && !Array.isArray(explicit)) {
    const derived = buildStoryLoopContract(project, {
      ...(contextPackage || {}),
      story_loop_contract: null,
      storyLoopContract: null,
      pre_draft_brief: contextPackage?.pre_draft_brief
        ? {
            ...(contextPackage.pre_draft_brief || {}),
            story_loop_contract: null,
            storyLoopContract: null,
          }
        : contextPackage?.pre_draft_brief,
      preDraftBrief: contextPackage?.preDraftBrief
        ? {
            ...(contextPackage.preDraftBrief || {}),
            story_loop_contract: null,
            storyLoopContract: null,
          }
        : contextPackage?.preDraftBrief,
      chapter_target: contextPackage?.chapter_target
        ? {
            ...(contextPackage.chapter_target || {}),
            story_loop_contract: null,
            storyLoopContract: null,
          }
        : contextPackage?.chapter_target,
    })
    const mode = compactBriefText(explicit.loop_mode || explicit.loopMode)
    const fallback = inferStoryLoopMode(mode)
    const explicitCoreElements = asArray(explicit.core_elements || explicit.coreElements).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitLoopSteps = asArray(explicit.loop_steps || explicit.loopSteps).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitMapResourceLoop = asArray(explicit.map_resource_loop || explicit.mapResourceLoop).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitEscalationRules = asArray(explicit.escalation_rules || explicit.escalationRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitMapTransitionRules = asArray(explicit.map_transition_rules || explicit.mapTransitionRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    const explicitNestedLoopRules = asArray(explicit.nested_loop_rules || explicit.nestedLoopRules).map((item: any) => compactBriefText(item)).filter(Boolean)
    return {
      version: explicit.version || 'oh_story_story_loop_v1',
      source: explicit.source || 'oh_story_embedded_fallback',
      loop_formula: compactBriefText(explicit.loop_formula || explicit.loopFormula, '题材 + 金手指 + 主角身份 = 循环模式'),
      core_elements: explicitCoreElements.length ? explicitCoreElements : asArray(derived.core_elements),
      loop_mode: mode || derived.loop_mode || fallback.mode,
      loop_fuel: compactBriefText(explicit.loop_fuel || explicit.loopFuel, derived.loop_fuel || fallback.fuel),
      loop_steps: explicitLoopSteps.length ? explicitLoopSteps : asArray(derived.loop_steps).length ? asArray(derived.loop_steps) : fallback.steps,
      map_resource_loop: explicitMapResourceLoop.length ? explicitMapResourceLoop : asArray(derived.map_resource_loop),
      escalation_rules: explicitEscalationRules.length ? explicitEscalationRules : asArray(derived.escalation_rules),
      map_transition_rules: explicitMapTransitionRules.length
        ? explicitMapTransitionRules
        : asArray(derived.map_transition_rules).length ? asArray(derived.map_transition_rules) : OH_STORY_STORY_LOOP_MAP_TRANSITION_RULES,
      nested_loop_rules: explicitNestedLoopRules.length
        ? explicitNestedLoopRules
        : asArray(derived.nested_loop_rules).length ? asArray(derived.nested_loop_rules) : OH_STORY_STORY_LOOP_NESTED_LOOP_RULES,
      quality_checks: asArray(explicit.quality_checks || explicit.qualityChecks).length
        ? asArray(explicit.quality_checks || explicit.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean)
        : OH_STORY_STORY_LOOP_CHECKS,
      revision_priorities: asArray(explicit.revision_priorities || explicit.revisionPriorities).length
        ? asArray(explicit.revision_priorities || explicit.revisionPriorities).map((item: any) => compactBriefText(item)).filter(Boolean)
        : ['统一题材/金手指/主角身份', '补循环燃料', '补反馈与下一轮燃料', '补资源闭环', '同步提高环境危险度'],
    }
  }

  const target = contextPackage?.chapter_target || {}
  const sceneCards = asArray(target.scene_cards || target.sceneCards)
  const writingBible = contextPackage?.writing_bible || project?.reference_config?.writing_bible || {}
  const commercial = writingBible?.commercial_positioning || project?.reference_config?.writing_bible?.commercial_positioning || {}
  const genre = compactBriefText(project?.genre || contextPackage?.project?.genre || writingBible?.genre)
  const goldenFinger = compactBriefText(
    writingBible?.golden_finger
    || writingBible?.goldenFinger
    || writingBible?.core_hook
    || writingBible?.coreHook
    || commercial?.innovation_hook
    || asArray(commercial?.selling_points || commercial?.sellingPoints)[0],
  )
  const protagonistIdentity = compactBriefText(
    writingBible?.protagonist_identity
    || writingBible?.protagonistIdentity
    || contextPackage?.story_state?.characters?.[0]?.role
    || contextPackage?.story_state?.characters?.[0]?.profile?.identity
    || contextPackage?.story_state?.characters?.[0]?.name,
  )
  const text = [
    genre,
    goldenFinger,
    protagonistIdentity,
    project?.synopsis,
    target.summary,
    target.conflict,
    target.ending_hook,
    ...sceneCards.flatMap((scene: any) => [scene.title, scene.purpose, scene.conflict, scene.information_gap, scene.reader_payoff, scene.reversal]),
  ].filter(Boolean).join(' ')
  const inferred = inferStoryLoopMode(text)
  const loopSteps = uniqueBriefStrings([
    ...inferred.steps,
    ...sceneCards.flatMap((scene: any) => [
      scene.information_gap ? `信息差：${scene.information_gap}` : '',
      scene.reader_payoff ? `反馈：${scene.reader_payoff}` : '',
      scene.ending_hook_seed ? `下一轮燃料：${scene.ending_hook_seed}` : '',
    ]),
  ], 12)
  return {
    version: 'oh_story_story_loop_v1',
    source: 'oh_story_embedded_fallback',
    loop_formula: '题材 + 金手指 + 主角身份 = 循环模式',
    core_elements: uniqueBriefStrings([
      genre ? `题材：${genre}` : '',
      goldenFinger ? `金手指/核心卖点：${goldenFinger}` : '',
      protagonistIdentity ? `主角身份：${protagonistIdentity}` : '',
    ], 8),
    loop_mode: inferred.mode,
    loop_fuel: inferred.fuel,
    loop_steps: loopSteps,
    map_resource_loop: [
      '地图资源闭环：学习/训练渠道、变现/补给渠道、敌人靶子、管理/上升通道不能全部缺席。',
      '新手村要尽量形成四势力闭环；换地图可以简化，但资源变现渠道不能丢。',
    ],
    escalation_rules: [
      '地位升高必须同步提高环境危险度、规则复杂度、对手层级或代价。',
      '每次解决一个矛盾，必须激活或加深另一个矛盾。',
      '换地图前提前铺垫吸引力，并保留至少一条贯穿主线。',
    ],
    map_transition_rules: OH_STORY_STORY_LOOP_MAP_TRANSITION_RULES,
    nested_loop_rules: OH_STORY_STORY_LOOP_NESTED_LOOP_RULES,
    quality_checks: OH_STORY_STORY_LOOP_CHECKS,
    revision_priorities: ['统一题材/金手指/主角身份', '补循环燃料', '补反馈与下一轮燃料', '补资源闭环', '补换地图承接', '同步提高环境危险度'],
  }
}

