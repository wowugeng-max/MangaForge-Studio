import { asArray } from '../../routes/novel-route-utils'
import { styleFingerprintSceneDirective } from '../../novel-writing/style-fingerprint'
import { sceneCardMentionsConcept } from '../../novel-writing/scene-card-readiness'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import {
  deliveryRiskItemText,
  deliveryRiskCarryOversFromContext,
} from './delivery-risk-core'

type AnyFn = (...args: any[]) => any

let explicitNewConceptNames: AnyFn = (_contextPackage: any = {}) => []

export function bindSceneCardDeliveryRiskDeps(deps: {
  explicitNewConceptNames?: AnyFn
} = {}) {
  if (deps.explicitNewConceptNames) explicitNewConceptNames = deps.explicitNewConceptNames
}

export function mergeSceneCardStringList(existing: any, additions: any, limit = 18) {
  return uniqueBriefStrings([
    ...asArray(existing).map((item: any) => String(item)).filter(Boolean),
    ...asArray(additions).map((item: any) => String(item)).filter(Boolean),
  ], limit)
}

export function appendSceneCardText(existing: any, additions: any, limit = 260) {
  const parts = uniqueBriefStrings([
    compactBriefText(existing),
    ...asArray(additions).map((item: any) => compactBriefText(item)).filter(Boolean),
  ], 8)
  return compactBriefText(parts.join('；'), limit)
}

export function applyStyleFingerprintToSceneCards(sceneCards: any[], contextPackage: any = {}) {
  const directive = styleFingerprintSceneDirective(contextPackage)
  if (!directive) return sceneCards
  return sceneCards.map(card => ({
    ...card,
    style_directives: mergeSceneCardStringList(card.style_directives, [directive]),
    serial_risk_repairs: mergeSceneCardStringList(card.serial_risk_repairs, ['文风指纹']),
  }))
}

export function applyExplicitNewConceptAnchorsToSceneCards(sceneCards: any[], contextPackage: any = {}) {
  if (!sceneCards.length) return sceneCards
  const names = explicitNewConceptNames(contextPackage)
  if (!names.length) return sceneCards

  return sceneCards.map(card => {
    const matchedNames = names.filter(name => sceneCardMentionsConcept(card, name))
    if (!matchedNames.length) return card
    const conceptAnchorRules = matchedNames.map(name => `“${name}”首次出现必须用角色动作反应、对话半句或物理后果带出当下作用；不得整段讲来历、原理或等级。`)
    return {
      ...card,
      concept_anchor_rules: mergeSceneCardStringList(card.concept_anchor_rules, conceptAnchorRules),
      serial_risk_repairs: mergeSceneCardStringList(card.serial_risk_repairs, ['新概念锚点']),
    }
  })
}

export function deliveryRiskStyleDirectiveActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /文风指纹|文风\.md|句长|碎句|中长句|逗号结巴|style_fingerprint|style drift/i.test(item)), 8)
}

export function deliveryRiskDialogueGoalActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /对白|对话|台词|科普嘴|问答式|声线|潜台词|dialogue|情绪承接|逐句承接/i.test(item)), 8)
}

export function deliveryRiskCharacterBehaviorActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /角色行为|character_behavior|动机链|动机具体|行为逻辑|行为证据|主角行为|起因具体|起因.{0,16}(?:意图|动机|约束|风险)|意图.{0,16}(?:约束|风险)|约束.{0,8}风险|反派逻辑|反派内在逻辑|反派分量|终极意图时机|保住账本来源|主角逼格|配角功能|反派降智|自我叙事|人设强关联|层级退场/i.test(item)), 8)
}

export function deliveryRiskBenchmarkRecallDirectiveActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /文风召回|样章策略|对标|benchmark|benchmark_recall|matched|节奏参照|匹配章技法|只学习节奏|不复制桥段|不复制原句|三轮压问|半拍亮证据/i.test(item)), 8)
}

export function deliveryRiskProseCraftDirectiveActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /正文工艺|prose_craft|word_count_checks|current_count|target_count|min_required_count|字数下限|字数不足|深度限知|身体细节|抽象情绪|道具\/数字|剧情功能|上帝视角|无交互环境|三维度揉进|一动一静|小节结构|小节密度|反凑字|段落碎片|环境描写/i.test(item)), 8)
}

export function deliveryRiskWordCountActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /word_count_checks|current_count|target_count|min_required_count|字数执行|字数下限|字数不足|低于字数|扩写动作过程|选择代价|对话交锋|章末钩子铺垫|不得靠环境描写|凑字数/i.test(item)), 8)
}

export function deliveryRiskQualityAuditDirectiveActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /质量诊断|quality_audit|本章不可删除|章节推进|事件内容比重|事件含量|信息负载|信息跟冲突走|水文|复述|目的词|五维|卖点表达/i.test(item)), 8)
}

export function deliveryRiskAssetLinkageActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /资产挂钩|asset_linkage|setting_violations|设定违规|能力代价|物品归属|规则触发|角色认知边界|禁揭设定|孤立资产|功能链|关键资产|旧钥匙|账本|禁门规则|触发条件|限制|后果|归属|贯穿道具|状态变化|设定信息/i.test(item)), 8)
}

export function deliveryRiskSettingViolationActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /setting_violations|设定违规|能力代价|物品归属|规则触发|角色认知边界|禁揭设定|禁揭|不得泄露|不能提前知道|修复设定/i.test(item)), 8)
}

export function deliveryRiskAssetIntakeActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /新资产入库|资产入库|asset_intake|待确认.{0,12}资产|pending_assets|新增资产|先给正文证据|可见性|后续状态|设定表/i.test(item)), 8)
}

export function deliveryRiskIpSceneIntakeActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /IP场面延展|ip_scene_intake|visualHook|adaptationValue|spreadPoint|强画面|封面|短视频|传播点|可见动作链|读者能复述的场面/i.test(item)), 8)
}

export function deliveryRiskStateTrackingActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /状态跟踪|状态写回|state_tracking|story_state_update|update_path|before_state|after_state|角色状态|世界约束|状态变化|旧伤|限制|三息|锁死规则|继续生效|状态漂移|前史因果|知识边界|来源边界/i.test(item)), 8)
}

export function deliveryRiskStatusFilterActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /状态筛选|status_filter|status_filter_receipts|used_in_chapter|excluded_reason|source_requirements|filter_rules|上下文过载|影响本章正确性/i.test(item)), 8)
}

export function deliveryRiskInformationFlowActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /信息流|information_flow|信息团|揭示顺序|信息随冲突|随冲突释放|背景说明书|无信息量过渡|悬念回应|先让|再让|最后亮|递进/i.test(item)), 8)
}

export function deliveryRiskExpectationHookActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /期待阈值|expectation_threshold|两长一短|下一开环|旧期待|章级钩子|chapter_hook|章钩质量|hook_position|trigger_type|concrete_question|danger_or_choice|next_action_link|现场触发|危险选择|下一章行动压力|章首钩子|章尾钩子|前100|最后100|翻页|下一章必须处理|低风险钩|假悬念/i.test(item)), 8)
}

export function deliveryRiskChapterHookQualityActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /章钩质量|chapter_hook_quality_checks|hook_position|trigger_type|concrete_question|danger_or_choice|next_action_link|现场异常|危险选择|现场触发|下一章行动压力|低风险空钩子|低风险钩/i.test(item)), 8)
}

export function deliveryRiskSuspenseActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /悬念编排|suspense|信息顺序|悬念强度|期待接力|可信提示|提示或误导|公布答案|立起新期待|谜语人|短期紧张|伏笔边界/i.test(item)), 8)
}

export function deliveryRiskReversalActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /反转设计|reversal|铺垫暗示|公平误导|揭示后影响|打脸节奏|3处暗示|三处暗示|身份反转|信息反转/i.test(item)), 8)
}

export function deliveryRiskShowdownActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /高潮对抗|showdown|舞台层级|震惊分层|底牌压制|急-缓-急|爽点释放|核心层震惊|压制传递/i.test(item)), 8)
}

export function deliveryRiskBridgeUnitActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /桥段节奏|bridge_unit|连续期待|章尾新目标|高潮中埋钩子|承接余波|阶段衔接|下一步要争什么|新投资人目标/i.test(item)), 8)
}

export function deliveryRiskBeatCoolingActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /轮换桥段类型|节奏冷却|beat_cooling|大冲突后|关系深化|世界观展开|势力建设|冲突余波|五章调剂|conflict_thrill/i.test(item)), 8)
}

export function deliveryRiskPlotDynamicsActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /剧情动力|plot_dynamics|目标.{0,12}阻碍.{0,12}行动|行动.{0,12}代价反馈|代价反馈|新的章末期待|驱动方式|多线错峰|假胜崩解|目标阻碍行动反馈/i.test(item)), 8)
}

export function deliveryRiskCharacterRelationActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /角色关系|character_relation|关系弧线|关系考验|合作互信.{0,16}边界|仍有边界|独立目标|主动作证|目标归属|配角期待枢纽|人物扣|配角攻略缓冲区|信息差|地位差距|亲密度差距|信任程度|NPC|站桩|态度变化|旁观\/质疑|关系角色/i.test(item)), 8)
}

export function characterRelationSceneProgressionPlan(actions: string[], index: number, firstIndex: number, middleIndex: number, lastIndex: number) {
  const actionText = compactBriefText(actions.join('；'), 240)
  if (firstIndex === lastIndex) {
    return {
      progression: `关系类型/边界：明确当前关系类型、互信程度和阶段边界；${actionText}`,
      buffer: '配角攻略缓冲区：保留信息差、地位差距、亲密度差距或信任程度之一，不能一次性交出全部信任。',
      action: '配角主动行动：带着自己的目标、责任或风险行动，不站桩等主角触发。',
      shift: '态度变化拐点：从旁观/质疑/拒绝/试探转为行动/协助/设限，并写出代价。',
      nextHook: '关系下一轮期待：主角解决事件后回到配角任务基地，开启下一轮任务、线索或关系压力。',
    }
  }
  if (index === firstIndex) {
    return {
      progression: `关系类型/边界：先让读者知道当前是冲突/联盟/亲密/权威哪一类，以及互信但仍有边界；${actionText}`,
      buffer: '配角攻略缓冲区：保留信息差、地位差距、亲密度差距或信任程度之一，给后续态度变化留期待。',
      action: '',
      shift: '',
      nextHook: '',
    }
  }
  if (index === middleIndex) {
    return {
      progression: `关系压力测试：让双方独立目标在同一场事件里互相摩擦或互补；${actionText}`,
      buffer: '配角攻略缓冲区：不要让关系一步到位，关键资料、信任、身份或亲密动作至少留一个未完全开放。',
      action: '配角主动行动：配角带着自己的目标、动机、资源或代价先行动，而不是站在旁边等主角触发。',
      shift: '态度变化拐点：写清从旁观/质疑/拒绝/试探到行动/协助/设限的变化。',
      nextHook: '',
    }
  }
  if (index === lastIndex) {
    return {
      progression: `关系阶段收束：交付本章态度变化、信任变化、利益变化或阶段边界；${actionText}`,
      buffer: '',
      action: '配角主动行动后必须留下代价、责任或新限制，不能只负责夸赞和陪伴。',
      shift: '态度变化拐点：用动作、证词、边界或代价证明关系已经变化。',
      nextHook: '关系下一轮期待：主角解决事件后回到配角任务基地，开启下一轮任务、线索或关系压力；人物下线时带来更大好处。',
    }
  }
  return {
    progression: `关系过渡：承接上一场边界，补一处新信息、关系压力或独立目标摩擦；${actionText}`,
    buffer: '配角攻略缓冲区：保留信息差、地位差距、亲密度差距或信任程度。',
    action: '配角主动行动：不能只是被主角带着走。',
    shift: '',
    nextHook: '',
  }
}

export function deliveryRiskStoryLoopActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /故事循环|story_loop|setup\s*->\s*escalation\s*->\s*payoff\s*->\s*carry_over|循环燃料|循环模式|承接期待|换地图承接|nested_loop|小循环|大循环/i.test(item)), 8)
}

export function deliveryRiskEmotionalArcActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /情绪弧|emotional_arc|平静\s*->\s*调动\s*->\s*释放\s*->\s*爽|安全感|兑现释放|情绪转向|情绪三板斧|爽点释放|下行情节安全感|期待升高/i.test(item)), 8)
}

export function emotionalArcSceneExecutionPlan(actions: string[], index: number, firstIndex: number, middleIndex: number, lastIndex: number) {
  const actionText = compactBriefText(actions.join('；'), 220)
  if (firstIndex === lastIndex) {
    return {
      stage: '情绪阶段：调动 -> 复现 -> 后反应/释放',
      readerGoal: `读者先知道压力或坏结果，再看见坏结果发生，最后获得安全感、尊严感、爽点或余韵；${actionText}`,
      reaction: '前反应 -> 复现 -> 后反应；热血/逆袭场景改用以小搏大 -> 士气如虹。',
      expectation: '闭环当前期待时必须开启下一开环，留下新问题、新目标、新代价或更大关系压力。',
    }
  }
  if (index === firstIndex) {
    return {
      stage: '情绪阶段：调动/前反应',
      readerGoal: `读者提前知道坏结果、压力或不该如此，并看见底牌/潜在解法/安全感信号；${actionText}`,
      reaction: '前反应：先让读者知道坏结果或压力，再描写美好事物、羁绊物件、具体数字或将满未满的期待。',
      expectation: '',
    }
  }
  if (index === lastIndex) {
    return {
      stage: '情绪阶段：后反应/释放',
      readerGoal: `把调动转成读者回报：安全感、尊严感、爽点、余韵钝痛或关系变化；${actionText}`,
      reaction: '后反应：让主角真情流露并作出改变，愤怒、拼命、振作或新选择必须成为后续行动。',
      expectation: '闭环当前期待时必须开启下一开环，留下新问题、新目标、新代价或更大关系压力。',
    }
  }
  if (index === middleIndex) {
    return {
      stage: '情绪阶段：复现/反制',
      readerGoal: `让坏结果真的发生或让压力升级，再用主角行动、信息揭示或关系变化推到释放前；${actionText}`,
      reaction: '复现：坏结果必须在现场发生；热血/逆袭场景在这里执行以小搏大，让弱势方被看见并等待拯救。',
      expectation: '',
    }
  }
  return {
    stage: '情绪阶段：调动 -> 释放过渡',
    readerGoal: `承接前一场压力，补新证据、新动作、新代价或新关系压力，避免情绪原地打转；${actionText}`,
    reaction: '过渡场景必须有事件触发情绪转向，不能只用旁白宣布难过或释然。',
    expectation: '',
  }
}

export function deliveryRiskReaderRetentionActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /追读留存|reader_retention|章末追读|留存双引擎|Hook上瘾|触发\s*->\s*行动\s*->\s*奖励\s*->\s*投入|情绪\s*\+\s*饥饿|信息差植入问号|剥洋葱|奖励随机性|翻页问题/i.test(item)), 8)
}

export function deliveryRiskReaderPayoffActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /读者回报|reader_payoff|回报欠账|待回收|显性回报|可见回报|阶段结算|兑现爽点|不能只推进设定|payoff_queue/i.test(item)), 8)
}

export function deliveryRiskChapterAttractionActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /修吸引力|吸引力缺口|chapter_attraction|开篇钩子|场景推进|目标阻碍转折回报|爽点密度|章末翻页|传播场面|读者拉力|非看不可/i.test(item)), 8)
}

export function deliveryRiskStoryDriveActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /故事力|故事驱动|story_drive|主角选择|主动选择|明确阻碍|选择代价|状态变化|下一步因果|不可逆的小选择|现场行动|对话交锋/i.test(item)), 8)
}

export function deliveryRiskStorylineActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /校剧情线|剧情线|storyline_sync|主线节点|missed|unplanned|forbidden_touched|禁用支线|旁支悬疑|主线目标|主线钩子/i.test(item)), 8)
}

export function deliveryRiskCharacterArcActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /人物弧光|character_arc|角色欲望|人物欲望|主角欲望|[^，。；;、\s]{1,12}的欲望|缺陷受压|关系变化|成长节点|口吻锚点|voice_anchor|growth_beat|flaw_pressure/i.test(item)), 8)
}

export function deliveryRiskInnovationActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /补创新|innovation_sync|创新执行|创新角度|执行点|差异护栏|IP化场面|IP场面|规则反差|机制反差|可视化场面|读者能复述|reader_retellable|differentiating_mechanism|visualized_scene/i.test(item)), 8)
}

export function deliveryRiskVolumeBeatActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /补爆点|volume_beat|卷级爆点|卷级目标|卷目标|高潮承诺|爆点动作|小高潮|中高潮|卷末爆点|阶段收束|现场破局|climax_promise|current_chapter_role|volume_goal/i.test(item)), 8)
}

export function deliveryRiskCoreDriftActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /守核心|核心守恒|核心偏移|核心漂移|chapter_core_drift|core_drift|读者承诺|主角驱动|阶段目标|核心方向|旁支悬疑/i.test(item)), 8)
}

export function deliveryRiskTimelineDeltaActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /补时间线|timeline_delta|时间线增量|当前时间|活动地点|事件顺序|先.{0,12}再|追踪\/时间线/i.test(item)), 8)
}

export function deliveryRiskCharacterStateDeltaActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /补角色状态|character_state_delta|角色状态增量|位置|能力\/伤势|伤势|持有物|关系态度|公众形象|知识边界|角色状态.*source_excerpt|source_excerpt.*角色状态/i.test(item)), 8)
}

export function deliveryRiskAssetStateDeltaActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /补资产状态|asset_state_delta|资产状态增量|关键资产|归属|可见性|触发条件|限制|风险和后果|资产状态.*source_excerpt|source_excerpt.*资产状态/i.test(item)), 8)
}

export function deliveryRiskRelationshipDeltaActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /补关系增量|relationship_delta|关系增量|信任|敌意|亏欠|联盟|阶段边界|关系图|关系线|门规人情/i.test(item)), 8)
}

export function deliveryRiskChapterHandoffDeltaActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /补章末交接|chapter_handoff_delta|章末交接|最后一幕|开放问题|下一章拉力|开篇承接义务|下一章优先事项|open_questions|next_chapter_priorities|payoff_queue/i.test(item)), 8)
}

export function deliveryRiskRevisionCascadeActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /修订级联|级联修订|revision_cascade|cascade_impact|cascade_impacts|affected_chapters|修订后正史|后续状态边界|不能回滚|回滚旧状态|连锁影响|同步修订/i.test(item)), 8)
}

export function deliveryRiskRevisionContextActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /修订上下文|revision_context|revision_context_receipts|previous_chapter|next_chapter|foreshadowing|character_cards|timeline|setting_context|资产归属|关系边界|上下文缺口|上下文核对/i.test(item)), 8)
}

export function deliveryRiskProseRevisionReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /修订回执|prose_revision_receipt|revision_receipts|revision_receipt_checks|required_action|repair_segment|changed_evidence|applied_fix|delivered=false|remaining_risk|证据泛化|修订残留|可验证的现场证据|修订后仍/i.test(item)), 8)
}

export function deliveryRiskRevisionReceiptCheckActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /revision_receipt_checks|required_action|repair_segment|changed_evidence|applied_fix|重做破局过程|现场动作|可定位动作|证据变化/i.test(item)), 8)
}

export function deliveryRiskDeliveryReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /复核承接|delivery_risk_receipts|delivered=false|risk_item|required_action|remaining_risk|承接风险|上一章.{0,12}风险|交稿风险/i.test(item)), 8)
}

export function deliveryRiskRevisionScopeGuardActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /修订幅度|revision_scope_guard|allowed_delta_word_count|scope_warning|局部补证据|不能新增支线|替换核心梗|删除伏笔|删除.*钩子|角色特征|保留项|不得大幅/i.test(item)), 8)
}

export function deliveryRiskRevisionDirectiveActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /revision_directives|revisionDirectives|修订指令|明确指令|directive/i.test(item)), 8)
}

export function deliveryRiskFocusedRevisionModeActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /focused_revision_modes|focusedRevisionModes|expand_action|cut_description|tighten_pacing|add_consequence|restore_hook|repair_setting_violation|定向修订|修订模式/i.test(item)), 8)
}

export function deliveryRiskCraftMetricActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /craft_metrics|craftMetrics|action_detail_score|description_overuse_score|event_density_score|combat_process_score|setting_consistency_score|正文工艺指标|动作细节|环境描写过量|事件密度|战斗过程|设定一致性/i.test(item)), 8)
}

export function deliveryRiskFiveDimensionScoreActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /five_dimension_scores|fiveDimensionScores|core_consistency|surface_rewrite|format_consistency|readability|logic_coherence|质量五维|五维评分|核心一致度|表层重写度|格式一致度|可读性|逻辑连贯/i.test(item)), 8)
}

export function deliveryRiskQualitySpecialtyActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /structure_checks|structureChecks|progression_checks|progressionChecks|information_checks|informationChecks|opening_hook|middle_progression|situation_change|ending_page_turn|non_deletable_change|mainline_shift|relationship_or_state_change|compressed_water|new_concept_count|action_bound_info|conflict_release|reader_first_scene|章节结构|章节推进|信息传递|信息负载/i.test(item)), 8)
}

export function deliveryRiskPlatformContentRubricActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /platform_checks|platformChecks|content_rubric_checks|contentRubricChecks|opening_pace|payoff_density|reader_expectation|page_turn_pull|core_selling_point|conflict_progression|chapter_change|page_turn_reason|平台检查|内容基准|平台适配|黄金三问/i.test(item)), 8)
}

export function deliveryRiskDeterministicCleanupActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /确定性清理|deterministic_prose_cleanup|硬扫残留|Gate\s*[A-G]|禁用词|模板表达|AI签名|去AI味|抽象总结|动作反应|prose format|format violations/i.test(item)), 8)
}

export function deliveryRiskBannedWordActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /banned_words_checks|bannedWordsChecks|matched_word|matchedWord|remaining_risk|remainingRisk|replacement|禁用词|硬禁词|禁用表达|模板表达|AI签名|万能抽象|此时此刻|命运齿轮/i.test(item)), 8)
}

export function deliveryRiskDeslopRepairReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /去AI回执|deslop_repair_receipts|deslop_repair|changed_evidence|Gate\s*[A-G]|模板表达|AI味|去AI味|抽象总结|动作反应|短对白|解释腔/i.test(item)), 8)
}

export function deliveryRiskReadabilityActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /可读性|readability_review|readability_score|梗感|meme_sense|长句|句子切短|短句|动作和对白|解释腔|复述爽点|能复述|高密场景/i.test(item)), 8)
}

export function deliveryRiskGovernanceRecheckActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /治理复查|governance_recheck|恢复依据|failed_evidence|watch_items|继续观察|节奏恢复|样章策略|可见冲突推进|修后证据/i.test(item)), 8)
}

export function deliveryRiskChapterTitleActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /修标题|章节标题|chapter_title_uniqueness|标题重复|标题承诺|标题差异化|标题卖点|标题回收|标题.*正文|正文.*标题/i.test(item)), 8)
}

export function deliveryRiskQualityGateActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /质量门禁|prose_quality|复盘审稿|质量五维|低分未过|平台适配|内容基准|S1\s*问题|S2\s*问题|清晰冲突|短周期回报|可见角色选择/i.test(item)), 8)
}

export function deliveryRiskQualityAuditRepairReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /质量修复回执|quality_audit_repair_receipts|quality_audit_repair|quality_audit_checks|事件内容比重|changed_evidence|remaining_risk|短周期回报|现场冲突|信息变化|可定位事件/i.test(item)), 8)
}

export function deliveryRiskQualityPlanReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /复检质量续航|质量续航回执|质量续航计划|next_chapter_quality_plan_receipts|next_chapter_quality_plan|quality_focus|evidence_basis|avoid_repetition/i.test(item)), 8)
}

export function deliveryRiskSerialRiskRepairActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /近章风险修复|serial_risk_repair|serial_risk_repair_checks|scene_cards\.serial_risk_repairs|recent_fatigue_action|目标推进|阻碍升级|新信息|关系\/世界调剂|冲突冷却/i.test(item)), 8)
}

export function deliveryRiskSceneCardReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /场景回执|场景卡回执|scene_card_receipts|scene_card_receipt|scene_start_anchor|scene_end_anchor|goal_obstacle_change_delivered|purpose_tag_delivered|serial_risk_repairs_delivered|required_beats_delivered|action_beats_delivered|场景边界|证据跨场景|scene_goal|state_delta/i.test(item)), 8)
}

export function deliveryRiskPerspectiveReviewActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /多视角审查|perspective_review|perspective_verdict|reviewer|CONCERNS|REJECT|商业编辑|读者视角|审查视角|现场阻碍|可复述读者回报/i.test(item)), 8)
}

export function deliveryRiskTargetReaderActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /目标读者|target_reader|读者欲望|本章吸引点|规则反制|现场行动|可感知回报|平台口味|自嗨判定/i.test(item)), 8)
}

export function deliveryRiskConflictStructureActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /冲突结构|conflict_structure|真实阻止|阻止者|有进无出|行动阻拦|胜负变化|明确胜负|压力源|阻碍升级|矛盾网|下一冲突种子/i.test(item)), 8)
}

export function deliveryRiskGenrePositioningActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /题材定位|genre_positioning|品类卖点|题材承诺|类型承诺|卖点偏移|不能偏成|赛博修仙|门派规则|法器交易/i.test(item)), 8)
}

export function deliveryRiskUpgradeRhythmActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /升级节奏|upgrade_rhythm|小目标升级|资源增量|能力反馈|新门槛|升级压力|升级闭环|阶段升级|成长反馈/i.test(item)), 8)
}

export function deliveryRiskContinuityHeatActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /连续性热度|continuity_heat|爆点余温|旧热度|新压力|高热未解|热度承接|热度断档|上一章爆点|章末留高热/i.test(item)), 8)
}

export function deliveryRiskSourceReadinessActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /来源就绪|source_readiness|来源依据|资料来源|信息来源|缺口必须先写入|不能靠正文临时编|旧印编号|禁库权限|证词/i.test(item)), 8)
}

export function deliveryRiskWritePreparationActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /写前准备|write_preparation|write_preparation_checks|source_gaps|asset_risks|blueprint_focus|reader_payoff_focus|must_confirm|creation_contract_checklist|执行缺口|准备卡/i.test(item)), 8)
}

export function deliveryRiskIntentConfirmationActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /意图确认|intent_confirmation|本章目标|服务本章目标|目标推进|验证目标|不能偏去|偏离章节意图|章节意图/i.test(item)), 8)
}

export function deliveryRiskChapterBlueprintActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /章节细纲|chapter_blueprint|blueprint_consumption|blueprint_field|missing_gap|细纲兑现|细纲顺序|beat sequence|线索确认|行动受阻|付出代价|小胜奖励|不能跳过代价|只给奖励/i.test(item)), 8)
}

export function deliveryRiskBlueprintConsumptionActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /blueprint_consumption_checks|blueprint_consumption|blueprint_field|missing_gap|delivered_evidence|细纲兑现|正文只给结果|只给结果没有代价|可见事件|章尾承接/i.test(item)), 8)
}

export function deliveryRiskCoreContractActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /核心契约|core_contract|创作契约|核心承诺|核心冲突|不得漂移|漂移红线|核心卖点|核心爽点|读者回报/i.test(item)), 8)
}

export function deliveryRiskFemaleAudienceActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /女频长篇|female_audience|女性视角|关系张力|情感选择|安全感|尊严感|情绪价值|关系推进|关系变化/i.test(item)), 8)
}

export function deliveryRiskChapterBenchmarkActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /章节基准|chapter_benchmark|对标章节|节奏基准|结构基准|开局压迫|三段升级|章尾回收|只学节奏/i.test(item)), 8)
}

export function deliveryRiskRunwayActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /航线|runway|longform_checks|长篇专项|recent_5_chapter_progress|payoff_interval|stage_goal_shift|next_stage_pull|长线方向|长线目标|主线终点|主线推进|支线.{0,12}带偏|新航点|黑塔许可|阶段目标|下一阶段牵引/i.test(item)), 8)
}

export function deliveryRiskLongformActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /longform_checks|长篇专项|recent_5_chapter_progress|payoff_interval|stage_goal_shift|next_stage_pull|最近5章|最近五章|爽点间隔|阶段目标|阶段换挡|下一阶段牵引|上下文层断裂/i.test(item)), 8)
}

export function deliveryRiskSignatureSceneActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /招牌场面|signature_scene|名场面|强画面|可传播动作|读者记忆点|视觉爽点|高光场面|场面记忆点/i.test(item)), 8)
}

export function deliveryRiskStoryUnitActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /剧情单元|story_unit|目标建立|阻碍升级|代价选择|结果回收|单元闭合|未闭合部分|下一章承接/i.test(item)), 8)
}

export function deliveryRiskChapterHandoffActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => !/补章末交接|chapter_handoff_delta|章末交接/i.test(item) && /章首承接|chapter_handoff(?!_delta)|上一章.{0,16}余波|角色状态|未解债务|转成新目标|开篇承接/i.test(item)), 8)
}

export function deliveryRiskOpeningActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /开篇设计|opening_sync|前50字|前100字|第一段|异常|冲突|对话逼问|不能慢写环境|慢热开头/i.test(item)), 8)
}

export function deliveryRiskParagraphHookActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /段落钩子|paragraph_hook|段落级推进|段尾|新动作|新问题|反应差异|连续三段平铺|小节钩子/i.test(item)), 8)
}

export function deliveryRiskProseMetaActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /正文元信息|prose_meta|章节标题说明|创作提示|作者备注|本章将|元叙述|角色当场感知/i.test(item)), 8)
}

export function deliveryRiskPunctuationToneActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /语气标点|punctuation_tone|感叹号|破折号|省略号|动作打断|情绪压迫|信息转折|假高能|连续堆叠/i.test(item)), 8)
}

export function deliveryRiskStyleBoundaryActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /文风边界|style_boundary|风格样本|style_sample|冷静短句|动作后果|不能复制样本|复制样本文句|叙述视角|限知/i.test(item)), 8)
}

export function deliveryRiskStyleSampleReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /样章策略回执|style_sample_checks|style_sample_strategy|样章策略缺口|叙述节奏|对白比例|角色口吻|情绪转折|抽象表达策略|不得复制样章|复制样章桥段|复制样章.*原句/i.test(item)), 8)
}

export function deliveryRiskPayoffSetupActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /爽点铺垫|payoff_setup|payoff|打脸.{0,12}铺|先铺|对手施压|规则限制|主角暗手|突然给证据爽点/i.test(item)), 8)
}

export function deliveryRiskSpectatorReactionActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /围观反应|spectator_reaction|旁观者|分层震惊|专家读懂|对手失声|观众反应|反应分层/i.test(item)), 8)
}

export function deliveryRiskForeshadowingDeltaActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /伏笔增量|foreshadowing_delta|新伏笔|可见线索|伏笔入场|章尾.{0,12}问题|半枚纹路|缺编号/i.test(item)), 8)
}

export function deliveryRiskConceptAnchorActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /新概念|新名词|新设定|新道具|首次出现|动作反应|物理后果|作用锚点|concept_anchor|零信息生词|整段来历|等级说明/i.test(item)), 8)
}

export * from './scene-card-delivery-risk-apply'
