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

function deliveryRiskStyleDirectiveActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /文风指纹|文风\.md|句长|碎句|中长句|逗号结巴|style_fingerprint|style drift/i.test(item)), 8)
}

function deliveryRiskDialogueGoalActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /对白|对话|台词|科普嘴|问答式|声线|潜台词|dialogue|情绪承接|逐句承接/i.test(item)), 8)
}

function deliveryRiskCharacterBehaviorActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /角色行为|character_behavior|动机链|动机具体|行为逻辑|行为证据|主角行为|起因具体|起因.{0,16}(?:意图|动机|约束|风险)|意图.{0,16}(?:约束|风险)|约束.{0,8}风险|反派逻辑|反派内在逻辑|反派分量|终极意图时机|保住账本来源|主角逼格|配角功能|反派降智|自我叙事|人设强关联|层级退场/i.test(item)), 8)
}

function deliveryRiskBenchmarkRecallDirectiveActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /文风召回|样章策略|对标|benchmark|benchmark_recall|matched|节奏参照|匹配章技法|只学习节奏|不复制桥段|不复制原句|三轮压问|半拍亮证据/i.test(item)), 8)
}

function deliveryRiskProseCraftDirectiveActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /正文工艺|prose_craft|word_count_checks|current_count|target_count|min_required_count|字数下限|字数不足|深度限知|身体细节|抽象情绪|道具\/数字|剧情功能|上帝视角|无交互环境|三维度揉进|一动一静|小节结构|小节密度|反凑字|段落碎片|环境描写/i.test(item)), 8)
}

function deliveryRiskWordCountActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /word_count_checks|current_count|target_count|min_required_count|字数执行|字数下限|字数不足|低于字数|扩写动作过程|选择代价|对话交锋|章末钩子铺垫|不得靠环境描写|凑字数/i.test(item)), 8)
}

function deliveryRiskQualityAuditDirectiveActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /质量诊断|quality_audit|本章不可删除|章节推进|事件内容比重|事件含量|信息负载|信息跟冲突走|水文|复述|目的词|五维|卖点表达/i.test(item)), 8)
}

function deliveryRiskAssetLinkageActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /资产挂钩|asset_linkage|setting_violations|设定违规|能力代价|物品归属|规则触发|角色认知边界|禁揭设定|孤立资产|功能链|关键资产|旧钥匙|账本|禁门规则|触发条件|限制|后果|归属|贯穿道具|状态变化|设定信息/i.test(item)), 8)
}

function deliveryRiskSettingViolationActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /setting_violations|设定违规|能力代价|物品归属|规则触发|角色认知边界|禁揭设定|禁揭|不得泄露|不能提前知道|修复设定/i.test(item)), 8)
}

function deliveryRiskAssetIntakeActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /新资产入库|资产入库|asset_intake|待确认.{0,12}资产|pending_assets|新增资产|先给正文证据|可见性|后续状态|设定表/i.test(item)), 8)
}

function deliveryRiskIpSceneIntakeActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /IP场面延展|ip_scene_intake|visualHook|adaptationValue|spreadPoint|强画面|封面|短视频|传播点|可见动作链|读者能复述的场面/i.test(item)), 8)
}

function deliveryRiskStateTrackingActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /状态跟踪|状态写回|state_tracking|story_state_update|update_path|before_state|after_state|角色状态|世界约束|状态变化|旧伤|限制|三息|锁死规则|继续生效|状态漂移|前史因果|知识边界|来源边界/i.test(item)), 8)
}

function deliveryRiskStatusFilterActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /状态筛选|status_filter|status_filter_receipts|used_in_chapter|excluded_reason|source_requirements|filter_rules|上下文过载|影响本章正确性/i.test(item)), 8)
}

function deliveryRiskInformationFlowActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /信息流|information_flow|信息团|揭示顺序|信息随冲突|随冲突释放|背景说明书|无信息量过渡|悬念回应|先让|再让|最后亮|递进/i.test(item)), 8)
}

function deliveryRiskExpectationHookActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /期待阈值|expectation_threshold|两长一短|下一开环|旧期待|章级钩子|chapter_hook|章钩质量|hook_position|trigger_type|concrete_question|danger_or_choice|next_action_link|现场触发|危险选择|下一章行动压力|章首钩子|章尾钩子|前100|最后100|翻页|下一章必须处理|低风险钩|假悬念/i.test(item)), 8)
}

function deliveryRiskChapterHookQualityActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /章钩质量|chapter_hook_quality_checks|hook_position|trigger_type|concrete_question|danger_or_choice|next_action_link|现场异常|危险选择|现场触发|下一章行动压力|低风险空钩子|低风险钩/i.test(item)), 8)
}

function deliveryRiskSuspenseActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /悬念编排|suspense|信息顺序|悬念强度|期待接力|可信提示|提示或误导|公布答案|立起新期待|谜语人|短期紧张|伏笔边界/i.test(item)), 8)
}

function deliveryRiskReversalActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /反转设计|reversal|铺垫暗示|公平误导|揭示后影响|打脸节奏|3处暗示|三处暗示|身份反转|信息反转/i.test(item)), 8)
}

function deliveryRiskShowdownActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /高潮对抗|showdown|舞台层级|震惊分层|底牌压制|急-缓-急|爽点释放|核心层震惊|压制传递/i.test(item)), 8)
}

function deliveryRiskBridgeUnitActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /桥段节奏|bridge_unit|连续期待|章尾新目标|高潮中埋钩子|承接余波|阶段衔接|下一步要争什么|新投资人目标/i.test(item)), 8)
}

function deliveryRiskBeatCoolingActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /轮换桥段类型|节奏冷却|beat_cooling|大冲突后|关系深化|世界观展开|势力建设|冲突余波|五章调剂|conflict_thrill/i.test(item)), 8)
}

function deliveryRiskPlotDynamicsActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /剧情动力|plot_dynamics|目标.{0,12}阻碍.{0,12}行动|行动.{0,12}代价反馈|代价反馈|新的章末期待|驱动方式|多线错峰|假胜崩解|目标阻碍行动反馈/i.test(item)), 8)
}

function deliveryRiskCharacterRelationActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /角色关系|character_relation|关系弧线|关系考验|合作互信.{0,16}边界|仍有边界|独立目标|主动作证|目标归属|配角期待枢纽|人物扣|配角攻略缓冲区|信息差|地位差距|亲密度差距|信任程度|NPC|站桩|态度变化|旁观\/质疑|关系角色/i.test(item)), 8)
}

function characterRelationSceneProgressionPlan(actions: string[], index: number, firstIndex: number, middleIndex: number, lastIndex: number) {
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

function deliveryRiskStoryLoopActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /故事循环|story_loop|setup\s*->\s*escalation\s*->\s*payoff\s*->\s*carry_over|循环燃料|循环模式|承接期待|换地图承接|nested_loop|小循环|大循环/i.test(item)), 8)
}

function deliveryRiskEmotionalArcActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /情绪弧|emotional_arc|平静\s*->\s*调动\s*->\s*释放\s*->\s*爽|安全感|兑现释放|情绪转向|情绪三板斧|爽点释放|下行情节安全感|期待升高/i.test(item)), 8)
}

function emotionalArcSceneExecutionPlan(actions: string[], index: number, firstIndex: number, middleIndex: number, lastIndex: number) {
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

function deliveryRiskReaderRetentionActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /追读留存|reader_retention|章末追读|留存双引擎|Hook上瘾|触发\s*->\s*行动\s*->\s*奖励\s*->\s*投入|情绪\s*\+\s*饥饿|信息差植入问号|剥洋葱|奖励随机性|翻页问题/i.test(item)), 8)
}

function deliveryRiskReaderPayoffActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /读者回报|reader_payoff|回报欠账|待回收|显性回报|可见回报|阶段结算|兑现爽点|不能只推进设定|payoff_queue/i.test(item)), 8)
}

function deliveryRiskChapterAttractionActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /修吸引力|吸引力缺口|chapter_attraction|开篇钩子|场景推进|目标阻碍转折回报|爽点密度|章末翻页|传播场面|读者拉力|非看不可/i.test(item)), 8)
}

function deliveryRiskStoryDriveActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /故事力|故事驱动|story_drive|主角选择|主动选择|明确阻碍|选择代价|状态变化|下一步因果|不可逆的小选择|现场行动|对话交锋/i.test(item)), 8)
}

function deliveryRiskStorylineActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /校剧情线|剧情线|storyline_sync|主线节点|missed|unplanned|forbidden_touched|禁用支线|旁支悬疑|主线目标|主线钩子/i.test(item)), 8)
}

function deliveryRiskCharacterArcActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /人物弧光|character_arc|角色欲望|人物欲望|主角欲望|[^，。；;、\s]{1,12}的欲望|缺陷受压|关系变化|成长节点|口吻锚点|voice_anchor|growth_beat|flaw_pressure/i.test(item)), 8)
}

function deliveryRiskInnovationActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /补创新|innovation_sync|创新执行|创新角度|执行点|差异护栏|IP化场面|IP场面|规则反差|机制反差|可视化场面|读者能复述|reader_retellable|differentiating_mechanism|visualized_scene/i.test(item)), 8)
}

function deliveryRiskVolumeBeatActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /补爆点|volume_beat|卷级爆点|卷级目标|卷目标|高潮承诺|爆点动作|小高潮|中高潮|卷末爆点|阶段收束|现场破局|climax_promise|current_chapter_role|volume_goal/i.test(item)), 8)
}

function deliveryRiskCoreDriftActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /守核心|核心守恒|核心偏移|核心漂移|chapter_core_drift|core_drift|读者承诺|主角驱动|阶段目标|核心方向|旁支悬疑/i.test(item)), 8)
}

function deliveryRiskTimelineDeltaActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /补时间线|timeline_delta|时间线增量|当前时间|活动地点|事件顺序|先.{0,12}再|追踪\/时间线/i.test(item)), 8)
}

function deliveryRiskCharacterStateDeltaActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /补角色状态|character_state_delta|角色状态增量|位置|能力\/伤势|伤势|持有物|关系态度|公众形象|知识边界|角色状态.*source_excerpt|source_excerpt.*角色状态/i.test(item)), 8)
}

function deliveryRiskAssetStateDeltaActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /补资产状态|asset_state_delta|资产状态增量|关键资产|归属|可见性|触发条件|限制|风险和后果|资产状态.*source_excerpt|source_excerpt.*资产状态/i.test(item)), 8)
}

function deliveryRiskRelationshipDeltaActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /补关系增量|relationship_delta|关系增量|信任|敌意|亏欠|联盟|阶段边界|关系图|关系线|门规人情/i.test(item)), 8)
}

function deliveryRiskChapterHandoffDeltaActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /补章末交接|chapter_handoff_delta|章末交接|最后一幕|开放问题|下一章拉力|开篇承接义务|下一章优先事项|open_questions|next_chapter_priorities|payoff_queue/i.test(item)), 8)
}

function deliveryRiskRevisionCascadeActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /修订级联|级联修订|revision_cascade|cascade_impact|cascade_impacts|affected_chapters|修订后正史|后续状态边界|不能回滚|回滚旧状态|连锁影响|同步修订/i.test(item)), 8)
}

function deliveryRiskRevisionContextActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /修订上下文|revision_context|revision_context_receipts|previous_chapter|next_chapter|foreshadowing|character_cards|timeline|setting_context|资产归属|关系边界|上下文缺口|上下文核对/i.test(item)), 8)
}

function deliveryRiskProseRevisionReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /修订回执|prose_revision_receipt|revision_receipts|revision_receipt_checks|required_action|repair_segment|changed_evidence|applied_fix|delivered=false|remaining_risk|证据泛化|修订残留|可验证的现场证据|修订后仍/i.test(item)), 8)
}

function deliveryRiskRevisionReceiptCheckActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /revision_receipt_checks|required_action|repair_segment|changed_evidence|applied_fix|重做破局过程|现场动作|可定位动作|证据变化/i.test(item)), 8)
}

function deliveryRiskDeliveryReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /复核承接|delivery_risk_receipts|delivered=false|risk_item|required_action|remaining_risk|承接风险|上一章.{0,12}风险|交稿风险/i.test(item)), 8)
}

function deliveryRiskRevisionScopeGuardActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /修订幅度|revision_scope_guard|allowed_delta_word_count|scope_warning|局部补证据|不能新增支线|替换核心梗|删除伏笔|删除.*钩子|角色特征|保留项|不得大幅/i.test(item)), 8)
}

function deliveryRiskRevisionDirectiveActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /revision_directives|revisionDirectives|修订指令|明确指令|directive/i.test(item)), 8)
}

function deliveryRiskFocusedRevisionModeActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /focused_revision_modes|focusedRevisionModes|expand_action|cut_description|tighten_pacing|add_consequence|restore_hook|repair_setting_violation|定向修订|修订模式/i.test(item)), 8)
}

function deliveryRiskCraftMetricActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /craft_metrics|craftMetrics|action_detail_score|description_overuse_score|event_density_score|combat_process_score|setting_consistency_score|正文工艺指标|动作细节|环境描写过量|事件密度|战斗过程|设定一致性/i.test(item)), 8)
}

function deliveryRiskFiveDimensionScoreActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /five_dimension_scores|fiveDimensionScores|core_consistency|surface_rewrite|format_consistency|readability|logic_coherence|质量五维|五维评分|核心一致度|表层重写度|格式一致度|可读性|逻辑连贯/i.test(item)), 8)
}

function deliveryRiskQualitySpecialtyActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /structure_checks|structureChecks|progression_checks|progressionChecks|information_checks|informationChecks|opening_hook|middle_progression|situation_change|ending_page_turn|non_deletable_change|mainline_shift|relationship_or_state_change|compressed_water|new_concept_count|action_bound_info|conflict_release|reader_first_scene|章节结构|章节推进|信息传递|信息负载/i.test(item)), 8)
}

function deliveryRiskPlatformContentRubricActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /platform_checks|platformChecks|content_rubric_checks|contentRubricChecks|opening_pace|payoff_density|reader_expectation|page_turn_pull|core_selling_point|conflict_progression|chapter_change|page_turn_reason|平台检查|内容基准|平台适配|黄金三问/i.test(item)), 8)
}

function deliveryRiskDeterministicCleanupActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /确定性清理|deterministic_prose_cleanup|硬扫残留|Gate\s*[A-G]|禁用词|模板表达|AI签名|去AI味|抽象总结|动作反应|prose format|format violations/i.test(item)), 8)
}

function deliveryRiskBannedWordActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /banned_words_checks|bannedWordsChecks|matched_word|matchedWord|remaining_risk|remainingRisk|replacement|禁用词|硬禁词|禁用表达|模板表达|AI签名|万能抽象|此时此刻|命运齿轮/i.test(item)), 8)
}

function deliveryRiskDeslopRepairReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /去AI回执|deslop_repair_receipts|deslop_repair|changed_evidence|Gate\s*[A-G]|模板表达|AI味|去AI味|抽象总结|动作反应|短对白|解释腔/i.test(item)), 8)
}

function deliveryRiskReadabilityActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /可读性|readability_review|readability_score|梗感|meme_sense|长句|句子切短|短句|动作和对白|解释腔|复述爽点|能复述|高密场景/i.test(item)), 8)
}

function deliveryRiskGovernanceRecheckActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /治理复查|governance_recheck|恢复依据|failed_evidence|watch_items|继续观察|节奏恢复|样章策略|可见冲突推进|修后证据/i.test(item)), 8)
}

function deliveryRiskChapterTitleActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /修标题|章节标题|chapter_title_uniqueness|标题重复|标题承诺|标题差异化|标题卖点|标题回收|标题.*正文|正文.*标题/i.test(item)), 8)
}

function deliveryRiskQualityGateActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /质量门禁|prose_quality|复盘审稿|质量五维|低分未过|平台适配|内容基准|S1\s*问题|S2\s*问题|清晰冲突|短周期回报|可见角色选择/i.test(item)), 8)
}

function deliveryRiskQualityAuditRepairReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /质量修复回执|quality_audit_repair_receipts|quality_audit_repair|quality_audit_checks|事件内容比重|changed_evidence|remaining_risk|短周期回报|现场冲突|信息变化|可定位事件/i.test(item)), 8)
}

function deliveryRiskQualityPlanReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /复检质量续航|质量续航回执|质量续航计划|next_chapter_quality_plan_receipts|next_chapter_quality_plan|quality_focus|evidence_basis|avoid_repetition/i.test(item)), 8)
}

function deliveryRiskSerialRiskRepairActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /近章风险修复|serial_risk_repair|serial_risk_repair_checks|scene_cards\.serial_risk_repairs|recent_fatigue_action|目标推进|阻碍升级|新信息|关系\/世界调剂|冲突冷却/i.test(item)), 8)
}

function deliveryRiskSceneCardReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /场景回执|场景卡回执|scene_card_receipts|scene_card_receipt|scene_start_anchor|scene_end_anchor|goal_obstacle_change_delivered|purpose_tag_delivered|serial_risk_repairs_delivered|required_beats_delivered|action_beats_delivered|场景边界|证据跨场景|scene_goal|state_delta/i.test(item)), 8)
}

function deliveryRiskPerspectiveReviewActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /多视角审查|perspective_review|perspective_verdict|reviewer|CONCERNS|REJECT|商业编辑|读者视角|审查视角|现场阻碍|可复述读者回报/i.test(item)), 8)
}

function deliveryRiskTargetReaderActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /目标读者|target_reader|读者欲望|本章吸引点|规则反制|现场行动|可感知回报|平台口味|自嗨判定/i.test(item)), 8)
}

function deliveryRiskConflictStructureActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /冲突结构|conflict_structure|真实阻止|阻止者|有进无出|行动阻拦|胜负变化|明确胜负|压力源|阻碍升级|矛盾网|下一冲突种子/i.test(item)), 8)
}

function deliveryRiskGenrePositioningActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /题材定位|genre_positioning|品类卖点|题材承诺|类型承诺|卖点偏移|不能偏成|赛博修仙|门派规则|法器交易/i.test(item)), 8)
}

function deliveryRiskUpgradeRhythmActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /升级节奏|upgrade_rhythm|小目标升级|资源增量|能力反馈|新门槛|升级压力|升级闭环|阶段升级|成长反馈/i.test(item)), 8)
}

function deliveryRiskContinuityHeatActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /连续性热度|continuity_heat|爆点余温|旧热度|新压力|高热未解|热度承接|热度断档|上一章爆点|章末留高热/i.test(item)), 8)
}

function deliveryRiskSourceReadinessActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /来源就绪|source_readiness|来源依据|资料来源|信息来源|缺口必须先写入|不能靠正文临时编|旧印编号|禁库权限|证词/i.test(item)), 8)
}

function deliveryRiskWritePreparationActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /写前准备|write_preparation|write_preparation_checks|source_gaps|asset_risks|blueprint_focus|reader_payoff_focus|must_confirm|creation_contract_checklist|执行缺口|准备卡/i.test(item)), 8)
}

function deliveryRiskIntentConfirmationActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /意图确认|intent_confirmation|本章目标|服务本章目标|目标推进|验证目标|不能偏去|偏离章节意图|章节意图/i.test(item)), 8)
}

function deliveryRiskChapterBlueprintActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /章节细纲|chapter_blueprint|blueprint_consumption|blueprint_field|missing_gap|细纲兑现|细纲顺序|beat sequence|线索确认|行动受阻|付出代价|小胜奖励|不能跳过代价|只给奖励/i.test(item)), 8)
}

function deliveryRiskBlueprintConsumptionActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /blueprint_consumption_checks|blueprint_consumption|blueprint_field|missing_gap|delivered_evidence|细纲兑现|正文只给结果|只给结果没有代价|可见事件|章尾承接/i.test(item)), 8)
}

function deliveryRiskCoreContractActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /核心契约|core_contract|创作契约|核心承诺|核心冲突|不得漂移|漂移红线|核心卖点|核心爽点|读者回报/i.test(item)), 8)
}

function deliveryRiskFemaleAudienceActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /女频长篇|female_audience|女性视角|关系张力|情感选择|安全感|尊严感|情绪价值|关系推进|关系变化/i.test(item)), 8)
}

function deliveryRiskChapterBenchmarkActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /章节基准|chapter_benchmark|对标章节|节奏基准|结构基准|开局压迫|三段升级|章尾回收|只学节奏/i.test(item)), 8)
}

function deliveryRiskRunwayActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /航线|runway|longform_checks|长篇专项|recent_5_chapter_progress|payoff_interval|stage_goal_shift|next_stage_pull|长线方向|长线目标|主线终点|主线推进|支线.{0,12}带偏|新航点|黑塔许可|阶段目标|下一阶段牵引/i.test(item)), 8)
}

function deliveryRiskLongformActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /longform_checks|长篇专项|recent_5_chapter_progress|payoff_interval|stage_goal_shift|next_stage_pull|最近5章|最近五章|爽点间隔|阶段目标|阶段换挡|下一阶段牵引|上下文层断裂/i.test(item)), 8)
}

function deliveryRiskSignatureSceneActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /招牌场面|signature_scene|名场面|强画面|可传播动作|读者记忆点|视觉爽点|高光场面|场面记忆点/i.test(item)), 8)
}

function deliveryRiskStoryUnitActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /剧情单元|story_unit|目标建立|阻碍升级|代价选择|结果回收|单元闭合|未闭合部分|下一章承接/i.test(item)), 8)
}

function deliveryRiskChapterHandoffActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => !/补章末交接|chapter_handoff_delta|章末交接/i.test(item) && /章首承接|chapter_handoff(?!_delta)|上一章.{0,16}余波|角色状态|未解债务|转成新目标|开篇承接/i.test(item)), 8)
}

function deliveryRiskOpeningActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /开篇设计|opening_sync|前50字|前100字|第一段|异常|冲突|对话逼问|不能慢写环境|慢热开头/i.test(item)), 8)
}

function deliveryRiskParagraphHookActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /段落钩子|paragraph_hook|段落级推进|段尾|新动作|新问题|反应差异|连续三段平铺|小节钩子/i.test(item)), 8)
}

function deliveryRiskProseMetaActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /正文元信息|prose_meta|章节标题说明|创作提示|作者备注|本章将|元叙述|角色当场感知/i.test(item)), 8)
}

function deliveryRiskPunctuationToneActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /语气标点|punctuation_tone|感叹号|破折号|省略号|动作打断|情绪压迫|信息转折|假高能|连续堆叠/i.test(item)), 8)
}

function deliveryRiskStyleBoundaryActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /文风边界|style_boundary|风格样本|style_sample|冷静短句|动作后果|不能复制样本|复制样本文句|叙述视角|限知/i.test(item)), 8)
}

function deliveryRiskStyleSampleReceiptActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /样章策略回执|style_sample_checks|style_sample_strategy|样章策略缺口|叙述节奏|对白比例|角色口吻|情绪转折|抽象表达策略|不得复制样章|复制样章桥段|复制样章.*原句/i.test(item)), 8)
}

function deliveryRiskPayoffSetupActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /爽点铺垫|payoff_setup|payoff|打脸.{0,12}铺|先铺|对手施压|规则限制|主角暗手|突然给证据爽点/i.test(item)), 8)
}

function deliveryRiskSpectatorReactionActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /围观反应|spectator_reaction|旁观者|分层震惊|专家读懂|对手失声|观众反应|反应分层/i.test(item)), 8)
}

function deliveryRiskForeshadowingDeltaActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /伏笔增量|foreshadowing_delta|新伏笔|可见线索|伏笔入场|章尾.{0,12}问题|半枚纹路|缺编号/i.test(item)), 8)
}

function deliveryRiskConceptAnchorActions(carryOvers: any[]) {
  return uniqueBriefStrings(carryOvers.flatMap(carryOver => [
    ...asArray(carryOver?.required_actions),
    ...asArray(carryOver?.opening_actions),
    ...asArray(carryOver?.middle_actions),
    ...asArray(carryOver?.ending_actions),
  ])
    .map((item: any) => deliveryRiskItemText(item))
    .filter((item: string) => /新概念|新名词|新设定|新道具|首次出现|动作反应|物理后果|作用锚点|concept_anchor|零信息生词|整段来历|等级说明/i.test(item)), 8)
}

export function applyDeliveryRiskCarryOverToSceneCards(sceneCards: any[], contextPackage: any = {}) {
  if (!sceneCards.length) return sceneCards
  const carryOvers = deliveryRiskCarryOversFromContext(contextPackage)
  if (!carryOvers.length) return sceneCards

  const openingActions = uniqueBriefStrings(carryOvers.flatMap(carryOver => asArray(carryOver?.opening_actions)), 12)
  const middleActions = uniqueBriefStrings(carryOvers.flatMap(carryOver => asArray(carryOver?.middle_actions)), 12)
  const endingActions = uniqueBriefStrings(carryOvers.flatMap(carryOver => asArray(carryOver?.ending_actions)), 12)
  const forbiddenRepeats = uniqueBriefStrings(carryOvers.flatMap(carryOver => asArray(carryOver?.forbidden_repeats)), 12)
  const styleDirectiveActions = deliveryRiskStyleDirectiveActions(carryOvers)
  const dialogueGoalActions = deliveryRiskDialogueGoalActions(carryOvers)
  const characterBehaviorActions = deliveryRiskCharacterBehaviorActions(carryOvers)
  const benchmarkRecallDirectiveActions = deliveryRiskBenchmarkRecallDirectiveActions(carryOvers)
  const proseCraftDirectiveActions = deliveryRiskProseCraftDirectiveActions(carryOvers)
  const wordCountActions = deliveryRiskWordCountActions(carryOvers)
  const qualityAuditDirectiveActions = deliveryRiskQualityAuditDirectiveActions(carryOvers)
  const assetLinkageActions = deliveryRiskAssetLinkageActions(carryOvers)
  const settingViolationActions = deliveryRiskSettingViolationActions(carryOvers)
  const assetIntakeActions = deliveryRiskAssetIntakeActions(carryOvers)
  const ipSceneIntakeActions = deliveryRiskIpSceneIntakeActions(carryOvers)
  const stateTrackingActions = deliveryRiskStateTrackingActions(carryOvers)
  const statusFilterActions = deliveryRiskStatusFilterActions(carryOvers)
  const informationFlowActions = deliveryRiskInformationFlowActions(carryOvers)
  const expectationHookActions = deliveryRiskExpectationHookActions(carryOvers)
  const chapterHookQualityActions = deliveryRiskChapterHookQualityActions(carryOvers)
  const suspenseActions = deliveryRiskSuspenseActions(carryOvers)
  const reversalActions = deliveryRiskReversalActions(carryOvers)
  const showdownActions = deliveryRiskShowdownActions(carryOvers)
  const bridgeUnitActions = deliveryRiskBridgeUnitActions(carryOvers)
  const beatCoolingActions = deliveryRiskBeatCoolingActions(carryOvers)
  const plotDynamicsActions = deliveryRiskPlotDynamicsActions(carryOvers)
  const characterRelationActions = deliveryRiskCharacterRelationActions(carryOvers)
  const storyLoopActions = deliveryRiskStoryLoopActions(carryOvers)
  const emotionalArcActions = deliveryRiskEmotionalArcActions(carryOvers)
  const readerRetentionActions = deliveryRiskReaderRetentionActions(carryOvers)
  const readerPayoffActions = deliveryRiskReaderPayoffActions(carryOvers)
  const chapterAttractionActions = deliveryRiskChapterAttractionActions(carryOvers)
  const storyDriveActions = deliveryRiskStoryDriveActions(carryOvers)
  const storylineActions = deliveryRiskStorylineActions(carryOvers)
  const characterArcActions = deliveryRiskCharacterArcActions(carryOvers)
  const innovationActions = deliveryRiskInnovationActions(carryOvers)
  const volumeBeatActions = deliveryRiskVolumeBeatActions(carryOvers)
  const coreDriftActions = deliveryRiskCoreDriftActions(carryOvers)
  const timelineDeltaActions = deliveryRiskTimelineDeltaActions(carryOvers)
  const characterStateDeltaActions = deliveryRiskCharacterStateDeltaActions(carryOvers)
  const assetStateDeltaActions = deliveryRiskAssetStateDeltaActions(carryOvers)
  const relationshipDeltaActions = deliveryRiskRelationshipDeltaActions(carryOvers)
  const chapterHandoffDeltaActions = deliveryRiskChapterHandoffDeltaActions(carryOvers)
  const revisionCascadeActions = deliveryRiskRevisionCascadeActions(carryOvers)
  const revisionContextActions = deliveryRiskRevisionContextActions(carryOvers)
  const proseRevisionReceiptActions = deliveryRiskProseRevisionReceiptActions(carryOvers)
  const revisionReceiptCheckActions = deliveryRiskRevisionReceiptCheckActions(carryOvers)
  const deliveryReceiptActions = deliveryRiskDeliveryReceiptActions(carryOvers)
  const revisionScopeGuardActions = deliveryRiskRevisionScopeGuardActions(carryOvers)
  const revisionDirectiveActions = deliveryRiskRevisionDirectiveActions(carryOvers)
  const focusedRevisionModeActions = deliveryRiskFocusedRevisionModeActions(carryOvers)
  const focusedRevisionHookActions = focusedRevisionModeActions.filter(item => /restore_hook|ending pull|章末|钩子|hook/i.test(item))
  const focusedRevisionSettingActions = focusedRevisionModeActions.filter(item => /repair_setting_violation|ability cost|item ownership|rule trigger|knowledge boundary|设定|能力代价|物品归属|规则触发|认知边界/i.test(item))
  const craftMetricActions = deliveryRiskCraftMetricActions(carryOvers)
  const craftMetricActionActions = craftMetricActions.filter(item => /action_detail_score|event_density_score|combat_process_score|start|reaction|space change|resource loss|counter|result|paragraphs|choice|information|relationship|动作细节|事件密度|战斗过程/i.test(item))
  const craftMetricDescriptionActions = craftMetricActions.filter(item => /description_overuse_score|description|danger judgment|action space|环境描写过量|环境描写|危险判断/i.test(item))
  const craftMetricSettingActions = craftMetricActions.filter(item => /setting_consistency_score|ability cost|item ownership|rule trigger|knowledge boundary|设定一致性|能力代价|物品归属|规则触发|认知边界/i.test(item))
  const fiveDimensionScoreActions = deliveryRiskFiveDimensionScoreActions(carryOvers)
  const fiveDimensionCoreActions = fiveDimensionScoreActions.filter(item => /core_consistency|core conflict|visible payoff|核心一致度|核心冲突|读者回报/i.test(item))
  const fiveDimensionSurfaceActions = fiveDimensionScoreActions.filter(item => /surface_rewrite|readability|summary prose|sentence rhythm|clipped dialogue|表层重写度|可读性|总结|句子|对白/i.test(item))
  const fiveDimensionLogicActions = fiveDimensionScoreActions.filter(item => /format_consistency|logic_coherence|cause|consequence|state change|clue handoff|格式一致度|逻辑连贯|因果|后果|状态变化|线索交接/i.test(item))
  const qualitySpecialtyActions = deliveryRiskQualitySpecialtyActions(carryOvers)
  const qualityStructureActions = qualitySpecialtyActions.filter(item => /structure_checks|structureChecks|opening_hook|middle_progression|situation_change|ending_page_turn|章节结构|开头钩子|中段推进|局势变化|章尾翻页/i.test(item))
  const qualityProgressionActions = qualitySpecialtyActions.filter(item => /progression_checks|progressionChecks|non_deletable_change|mainline_shift|relationship_or_state_change|compressed_water|章节推进|不可删除|主线变化|关系变化|状态变化|水文/i.test(item))
  const qualityInformationActions = qualitySpecialtyActions.filter(item => /information_checks|informationChecks|new_concept_count|action_bound_info|conflict_release|reader_first_scene|信息传递|信息负载|新概念|信息跟冲突|冲突释放/i.test(item))
  const platformContentRubricActions = deliveryRiskPlatformContentRubricActions(carryOvers)
  const platformRubricActions = platformContentRubricActions.filter(item => /platform_checks|platformChecks|opening_pace|payoff_density|reader_expectation|page_turn_pull|平台检查|平台适配|开篇节奏|回报密度|读者期待|翻页拉力/i.test(item))
  const contentRubricActions = platformContentRubricActions.filter(item => /content_rubric_checks|contentRubricChecks|core_selling_point|conflict_progression|chapter_change|page_turn_reason|内容基准|黄金三问|核心卖点|冲突推进|章节变化|翻页理由/i.test(item))
  const deterministicCleanupActions = deliveryRiskDeterministicCleanupActions(carryOvers)
  const bannedWordActions = deliveryRiskBannedWordActions(carryOvers)
  const deslopRepairReceiptActions = deliveryRiskDeslopRepairReceiptActions(carryOvers)
  const readabilityActions = deliveryRiskReadabilityActions(carryOvers)
  const governanceRecheckActions = deliveryRiskGovernanceRecheckActions(carryOvers)
  const chapterTitleActions = deliveryRiskChapterTitleActions(carryOvers)
  const qualityGateActions = deliveryRiskQualityGateActions(carryOvers)
  const qualityAuditRepairReceiptActions = deliveryRiskQualityAuditRepairReceiptActions(carryOvers)
  const qualityPlanReceiptActions = deliveryRiskQualityPlanReceiptActions(carryOvers)
  const serialRiskRepairActions = deliveryRiskSerialRiskRepairActions(carryOvers)
  const sceneCardReceiptActions = deliveryRiskSceneCardReceiptActions(carryOvers)
  const perspectiveReviewActions = deliveryRiskPerspectiveReviewActions(carryOvers)
  const targetReaderActions = deliveryRiskTargetReaderActions(carryOvers)
  const conflictStructureActions = deliveryRiskConflictStructureActions(carryOvers)
  const genrePositioningActions = deliveryRiskGenrePositioningActions(carryOvers)
  const upgradeRhythmActions = deliveryRiskUpgradeRhythmActions(carryOvers)
  const continuityHeatActions = deliveryRiskContinuityHeatActions(carryOvers)
  const sourceReadinessActions = deliveryRiskSourceReadinessActions(carryOvers)
  const writePreparationActions = deliveryRiskWritePreparationActions(carryOvers)
  const intentConfirmationActions = deliveryRiskIntentConfirmationActions(carryOvers)
  const chapterBlueprintActions = deliveryRiskChapterBlueprintActions(carryOvers)
  const blueprintConsumptionActions = deliveryRiskBlueprintConsumptionActions(carryOvers)
  const coreContractActions = deliveryRiskCoreContractActions(carryOvers)
  const femaleAudienceActions = deliveryRiskFemaleAudienceActions(carryOvers)
  const chapterBenchmarkActions = deliveryRiskChapterBenchmarkActions(carryOvers)
  const runwayActions = deliveryRiskRunwayActions(carryOvers)
  const longformActions = deliveryRiskLongformActions(carryOvers)
  const signatureSceneActions = deliveryRiskSignatureSceneActions(carryOvers)
  const storyUnitActions = deliveryRiskStoryUnitActions(carryOvers)
  const chapterHandoffActions = deliveryRiskChapterHandoffActions(carryOvers)
  const openingDesignActions = deliveryRiskOpeningActions(carryOvers)
  const paragraphHookActions = deliveryRiskParagraphHookActions(carryOvers)
  const proseMetaActions = deliveryRiskProseMetaActions(carryOvers)
  const punctuationToneActions = deliveryRiskPunctuationToneActions(carryOvers)
  const styleBoundaryActions = deliveryRiskStyleBoundaryActions(carryOvers)
  const styleSampleReceiptActions = deliveryRiskStyleSampleReceiptActions(carryOvers)
  const payoffSetupActions = deliveryRiskPayoffSetupActions(carryOvers)
  const spectatorReactionActions = deliveryRiskSpectatorReactionActions(carryOvers)
  const foreshadowingDeltaActions = deliveryRiskForeshadowingDeltaActions(carryOvers)
  const conceptAnchorActions = deliveryRiskConceptAnchorActions(carryOvers)
  if (!openingActions.length && !middleActions.length && !endingActions.length && !forbiddenRepeats.length && !styleDirectiveActions.length && !dialogueGoalActions.length && !characterBehaviorActions.length && !characterRelationActions.length && !benchmarkRecallDirectiveActions.length && !proseCraftDirectiveActions.length && !qualityAuditDirectiveActions.length && !assetLinkageActions.length && !assetIntakeActions.length && !ipSceneIntakeActions.length && !stateTrackingActions.length && !statusFilterActions.length && !informationFlowActions.length && !expectationHookActions.length && !suspenseActions.length && !reversalActions.length && !showdownActions.length && !bridgeUnitActions.length && !beatCoolingActions.length && !plotDynamicsActions.length && !storyLoopActions.length && !emotionalArcActions.length && !readerRetentionActions.length && !readerPayoffActions.length && !chapterAttractionActions.length && !storyDriveActions.length && !storylineActions.length && !characterArcActions.length && !innovationActions.length && !volumeBeatActions.length && !coreDriftActions.length && !timelineDeltaActions.length && !characterStateDeltaActions.length && !assetStateDeltaActions.length && !relationshipDeltaActions.length && !chapterHandoffDeltaActions.length && !revisionCascadeActions.length && !revisionContextActions.length && !proseRevisionReceiptActions.length && !deliveryReceiptActions.length && !revisionScopeGuardActions.length && !revisionDirectiveActions.length && !focusedRevisionModeActions.length && !craftMetricActions.length && !fiveDimensionScoreActions.length && !qualitySpecialtyActions.length && !platformContentRubricActions.length && !deterministicCleanupActions.length && !bannedWordActions.length && !deslopRepairReceiptActions.length && !readabilityActions.length && !governanceRecheckActions.length && !chapterTitleActions.length && !qualityGateActions.length && !qualityAuditRepairReceiptActions.length && !qualityPlanReceiptActions.length && !serialRiskRepairActions.length && !sceneCardReceiptActions.length && !perspectiveReviewActions.length && !targetReaderActions.length && !conflictStructureActions.length && !genrePositioningActions.length && !upgradeRhythmActions.length && !continuityHeatActions.length && !sourceReadinessActions.length && !writePreparationActions.length && !intentConfirmationActions.length && !chapterBlueprintActions.length && !coreContractActions.length && !femaleAudienceActions.length && !chapterBenchmarkActions.length && !runwayActions.length && !signatureSceneActions.length && !storyUnitActions.length && !chapterHandoffActions.length && !openingDesignActions.length && !paragraphHookActions.length && !proseMetaActions.length && !punctuationToneActions.length && !styleBoundaryActions.length && !styleSampleReceiptActions.length && !payoffSetupActions.length && !spectatorReactionActions.length && !foreshadowingDeltaActions.length && !conceptAnchorActions.length) return sceneCards

  const firstIndex = 0
  const middleIndex = sceneCards.length >= 3 ? Math.floor(sceneCards.length / 2) : Math.min(1, sceneCards.length - 1)
  const lastIndex = sceneCards.length - 1
  const qualityTags = ['delivery_risk_carry_over', '质量续航']
  const actionIndexes = new Set<number>([
    ...(openingActions.length ? [firstIndex] : []),
    ...(middleActions.length ? [middleIndex] : []),
    ...(endingActions.length ? [lastIndex] : []),
    ...(forbiddenRepeats.length ? [firstIndex, middleIndex, lastIndex] : []),
  ])

  return sceneCards.map((card, index) => {
    if (!actionIndexes.has(index) && !styleDirectiveActions.length && !dialogueGoalActions.length && !characterBehaviorActions.length && !characterRelationActions.length && !benchmarkRecallDirectiveActions.length && !proseCraftDirectiveActions.length && !qualityAuditDirectiveActions.length && !assetLinkageActions.length && !assetIntakeActions.length && !ipSceneIntakeActions.length && !stateTrackingActions.length && !statusFilterActions.length && !informationFlowActions.length && !expectationHookActions.length && !suspenseActions.length && !reversalActions.length && !showdownActions.length && !bridgeUnitActions.length && !beatCoolingActions.length && !plotDynamicsActions.length && !storyLoopActions.length && !emotionalArcActions.length && !readerRetentionActions.length && !readerPayoffActions.length && !chapterAttractionActions.length && !storyDriveActions.length && !storylineActions.length && !characterArcActions.length && !innovationActions.length && !volumeBeatActions.length && !coreDriftActions.length && !timelineDeltaActions.length && !characterStateDeltaActions.length && !assetStateDeltaActions.length && !relationshipDeltaActions.length && !chapterHandoffDeltaActions.length && !revisionCascadeActions.length && !revisionContextActions.length && !proseRevisionReceiptActions.length && !deliveryReceiptActions.length && !revisionScopeGuardActions.length && !revisionDirectiveActions.length && !focusedRevisionModeActions.length && !craftMetricActions.length && !fiveDimensionScoreActions.length && !qualitySpecialtyActions.length && !platformContentRubricActions.length && !deterministicCleanupActions.length && !bannedWordActions.length && !deslopRepairReceiptActions.length && !readabilityActions.length && !governanceRecheckActions.length && !chapterTitleActions.length && !qualityGateActions.length && !qualityAuditRepairReceiptActions.length && !qualityPlanReceiptActions.length && !serialRiskRepairActions.length && !sceneCardReceiptActions.length && !perspectiveReviewActions.length && !targetReaderActions.length && !conflictStructureActions.length && !genrePositioningActions.length && !upgradeRhythmActions.length && !continuityHeatActions.length && !sourceReadinessActions.length && !writePreparationActions.length && !intentConfirmationActions.length && !chapterBlueprintActions.length && !coreContractActions.length && !femaleAudienceActions.length && !chapterBenchmarkActions.length && !runwayActions.length && !signatureSceneActions.length && !storyUnitActions.length && !chapterHandoffActions.length && !openingDesignActions.length && !paragraphHookActions.length && !proseMetaActions.length && !punctuationToneActions.length && !styleBoundaryActions.length && !styleSampleReceiptActions.length && !payoffSetupActions.length && !spectatorReactionActions.length && !foreshadowingDeltaActions.length && !conceptAnchorActions.length) return card
    const next = { ...card }
    const stagedActions = [
      ...(index === firstIndex ? openingActions : []),
      ...(index === middleIndex ? middleActions : []),
      ...(index === lastIndex ? endingActions : []),
    ]
    next.serial_risk_repairs = mergeSceneCardStringList(
      next.serial_risk_repairs,
      [
        ...qualityTags,
        ...(styleDirectiveActions.length ? ['文风指纹'] : []),
        ...(dialogueGoalActions.length ? ['对白质量'] : []),
        ...(characterBehaviorActions.length ? ['角色行为'] : []),
        ...(characterRelationActions.length ? ['角色关系'] : []),
        ...(benchmarkRecallDirectiveActions.length ? ['文风召回'] : []),
        ...(proseCraftDirectiveActions.length ? ['正文工艺'] : []),
        ...(wordCountActions.length ? ['字数执行'] : []),
        ...(qualityAuditDirectiveActions.length ? ['质量诊断'] : []),
        ...(assetLinkageActions.length ? ['资产挂钩'] : []),
        ...(settingViolationActions.length ? ['设定违规'] : []),
        ...(assetIntakeActions.length ? ['新资产入库'] : []),
        ...(ipSceneIntakeActions.length ? ['IP场面延展'] : []),
        ...(stateTrackingActions.length ? ['状态跟踪'] : []),
        ...(statusFilterActions.length ? ['状态筛选'] : []),
        ...(informationFlowActions.length ? ['信息流'] : []),
        ...(expectationHookActions.length ? ['期待/钩子'] : []),
        ...(chapterHookQualityActions.length ? ['章钩质量'] : []),
        ...(suspenseActions.length ? ['悬念编排'] : []),
        ...(reversalActions.length ? ['反转设计'] : []),
        ...(showdownActions.length ? ['高潮对抗'] : []),
        ...(bridgeUnitActions.length ? ['桥段节奏'] : []),
        ...(beatCoolingActions.length ? ['节奏冷却'] : []),
        ...(plotDynamicsActions.length ? ['剧情动力'] : []),
        ...(storyLoopActions.length ? ['故事循环'] : []),
        ...(emotionalArcActions.length ? ['情绪弧'] : []),
        ...(readerRetentionActions.length ? ['追读留存'] : []),
        ...(readerPayoffActions.length ? ['读者回报'] : []),
        ...(chapterAttractionActions.length ? ['章节吸引力'] : []),
        ...(storyDriveActions.length ? ['故事驱动'] : []),
        ...(storylineActions.length ? ['剧情线'] : []),
        ...(characterArcActions.length ? ['人物弧光'] : []),
        ...(innovationActions.length ? ['创新'] : []),
        ...(volumeBeatActions.length ? ['卷级爆点'] : []),
        ...(coreDriftActions.length ? ['核心守恒'] : []),
        ...(timelineDeltaActions.length ? ['时间线'] : []),
        ...(characterStateDeltaActions.length ? ['角色状态'] : []),
        ...(assetStateDeltaActions.length ? ['资产状态'] : []),
        ...(relationshipDeltaActions.length ? ['关系增量'] : []),
        ...(chapterHandoffDeltaActions.length ? ['章末交接'] : []),
        ...(revisionCascadeActions.length ? ['修订级联'] : []),
        ...(revisionContextActions.length ? ['修订上下文'] : []),
        ...(proseRevisionReceiptActions.length ? ['修订回执'] : []),
        ...(revisionReceiptCheckActions.length ? ['修订回执检查'] : []),
        ...(deliveryReceiptActions.length ? ['交稿回执'] : []),
        ...(revisionScopeGuardActions.length ? ['修订幅度'] : []),
        ...(revisionDirectiveActions.length ? ['修订指令'] : []),
        ...(focusedRevisionModeActions.length ? ['定向修订'] : []),
        ...(craftMetricActions.length ? ['正文工艺指标'] : []),
        ...(fiveDimensionScoreActions.length ? ['质量五维'] : []),
        ...(qualitySpecialtyActions.length ? ['质量专项'] : []),
        ...(platformContentRubricActions.length ? ['平台/内容基准'] : []),
        ...(deterministicCleanupActions.length ? ['确定性清理'] : []),
        ...(bannedWordActions.length ? ['禁用词'] : []),
        ...(deslopRepairReceiptActions.length ? ['去AI回执'] : []),
        ...(readabilityActions.length ? ['可读性'] : []),
        ...(governanceRecheckActions.length ? ['治理复查'] : []),
        ...(chapterTitleActions.length ? ['章节标题'] : []),
        ...(qualityGateActions.length ? ['质量门禁'] : []),
        ...(qualityAuditRepairReceiptActions.length ? ['质量修复回执'] : []),
        ...(qualityPlanReceiptActions.length ? ['质量续航回执'] : []),
        ...(serialRiskRepairActions.length ? ['近章风险修复'] : []),
        ...(sceneCardReceiptActions.length ? ['场景回执'] : []),
        ...(perspectiveReviewActions.length ? ['多视角审查'] : []),
        ...(targetReaderActions.length ? ['目标读者'] : []),
        ...(conflictStructureActions.length ? ['冲突结构'] : []),
        ...(genrePositioningActions.length ? ['题材定位'] : []),
        ...(upgradeRhythmActions.length ? ['升级节奏'] : []),
        ...(continuityHeatActions.length ? ['连续性热度'] : []),
        ...(sourceReadinessActions.length ? ['来源就绪'] : []),
        ...(writePreparationActions.length ? ['写前准备'] : []),
        ...(intentConfirmationActions.length ? ['意图确认'] : []),
        ...(chapterBlueprintActions.length ? ['章节细纲'] : []),
        ...(blueprintConsumptionActions.length ? ['细纲兑现'] : []),
        ...(coreContractActions.length ? ['核心契约'] : []),
        ...(femaleAudienceActions.length ? ['女频长篇'] : []),
        ...(chapterBenchmarkActions.length ? ['章节基准'] : []),
        ...(runwayActions.length ? ['航线'] : []),
        ...(longformActions.length ? ['长篇专项'] : []),
        ...(signatureSceneActions.length ? ['招牌场面'] : []),
        ...(storyUnitActions.length ? ['剧情单元'] : []),
        ...(chapterHandoffActions.length ? ['章首承接'] : []),
        ...(openingDesignActions.length ? ['开篇设计'] : []),
        ...(paragraphHookActions.length ? ['段落钩子'] : []),
        ...(proseMetaActions.length ? ['正文元信息'] : []),
        ...(punctuationToneActions.length ? ['语气标点'] : []),
        ...(styleBoundaryActions.length ? ['文风边界', '风格样本'] : []),
        ...(styleSampleReceiptActions.length ? ['样章策略回执'] : []),
        ...(payoffSetupActions.length ? ['爽点铺垫'] : []),
        ...(spectatorReactionActions.length ? ['围观反应'] : []),
        ...(foreshadowingDeltaActions.length ? ['伏笔增量'] : []),
        ...(conceptAnchorActions.length ? ['新概念锚点'] : []),
        ...(forbiddenRepeats.length ? forbiddenRepeats : []),
      ],
    )
    if (styleDirectiveActions.length) {
      next.style_directives = mergeSceneCardStringList(next.style_directives, styleDirectiveActions)
    }
    if (dialogueGoalActions.length) {
      next.dialogue_goals = mergeSceneCardStringList(next.dialogue_goals, dialogueGoalActions)
    }
    if (characterBehaviorActions.length) {
      next.action_beats = mergeSceneCardStringList(next.action_beats, characterBehaviorActions)
      next.character_voice = appendSceneCardText(next.character_voice, characterBehaviorActions)
    }
    if (benchmarkRecallDirectiveActions.length) {
      next.benchmark_recall_directives = mergeSceneCardStringList(next.benchmark_recall_directives, benchmarkRecallDirectiveActions)
    }
    if (proseCraftDirectiveActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, proseCraftDirectiveActions)
    }
    if (wordCountActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, wordCountActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, wordCountActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, wordCountActions)
      next.dialogue_goals = mergeSceneCardStringList(next.dialogue_goals, wordCountActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, wordCountActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, wordCountActions)
    }
    if (qualityAuditDirectiveActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, qualityAuditDirectiveActions)
    }
    if (assetLinkageActions.length) {
      next.used_settings = mergeSceneCardStringList(next.used_settings, assetLinkageActions)
      next.revealed_settings = mergeSceneCardStringList(next.revealed_settings, assetLinkageActions)
    }
    if (settingViolationActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, settingViolationActions)
      next.used_settings = mergeSceneCardStringList(next.used_settings, settingViolationActions)
      next.forbidden_settings = mergeSceneCardStringList(next.forbidden_settings, settingViolationActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, settingViolationActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, settingViolationActions)
    }
    if (assetIntakeActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, assetIntakeActions)
      next.used_settings = mergeSceneCardStringList(next.used_settings, assetIntakeActions)
      next.revealed_settings = mergeSceneCardStringList(next.revealed_settings, assetIntakeActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, assetIntakeActions)
    }
    if (ipSceneIntakeActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, ipSceneIntakeActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, ipSceneIntakeActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, ipSceneIntakeActions)
      next.sensory_anchor = appendSceneCardText(next.sensory_anchor, ipSceneIntakeActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, ipSceneIntakeActions)
    }
    if (stateTrackingActions.length) {
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, stateTrackingActions)
    }
    if (statusFilterActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, statusFilterActions)
      next.used_settings = mergeSceneCardStringList(next.used_settings, statusFilterActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, statusFilterActions)
      if (index === firstIndex) next.transition_from_previous = appendSceneCardText(next.transition_from_previous, statusFilterActions)
    }
    if (informationFlowActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, informationFlowActions)
    }
    if (expectationHookActions.length) {
      next.information_gap = appendSceneCardText(next.information_gap, expectationHookActions)
      if (index === firstIndex) next.opening_hook = appendSceneCardText(next.opening_hook, expectationHookActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, expectationHookActions)
    }
    if (chapterHookQualityActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, chapterHookQualityActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, chapterHookQualityActions)
      if (index === firstIndex) next.opening_hook = appendSceneCardText(next.opening_hook, chapterHookQualityActions)
      if (index === lastIndex) {
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, chapterHookQualityActions)
        next.reader_payoff = appendSceneCardText(next.reader_payoff, chapterHookQualityActions)
      }
    }
    if (suspenseActions.length) {
      next.information_gap = appendSceneCardText(next.information_gap, suspenseActions)
      next.required_information = mergeSceneCardStringList(next.required_information, suspenseActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, suspenseActions)
    }
    if (reversalActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, reversalActions)
      if (index === lastIndex) {
        next.reversal = appendSceneCardText(next.reversal, reversalActions)
        next.reader_payoff = appendSceneCardText(next.reader_payoff, reversalActions)
      }
    }
    if (showdownActions.length) {
      next.action_beats = mergeSceneCardStringList(next.action_beats, showdownActions)
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, showdownActions)
        next.turning_point = appendSceneCardText(next.turning_point, showdownActions)
      }
    }
    if (bridgeUnitActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, bridgeUnitActions)
      next.information_gap = appendSceneCardText(next.information_gap, bridgeUnitActions)
      if (index === firstIndex) next.transition_from_previous = appendSceneCardText(next.transition_from_previous, bridgeUnitActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, bridgeUnitActions)
    }
    if (beatCoolingActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, beatCoolingActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, beatCoolingActions)
      if (index === firstIndex) next.transition_from_previous = appendSceneCardText(next.transition_from_previous, beatCoolingActions)
    }
    if (plotDynamicsActions.length) {
      next.action_beats = mergeSceneCardStringList(next.action_beats, plotDynamicsActions)
      next.conflict = appendSceneCardText(next.conflict, plotDynamicsActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, plotDynamicsActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, plotDynamicsActions)
    }
    if (characterRelationActions.length) {
      const relationPlan = characterRelationSceneProgressionPlan(characterRelationActions, index, firstIndex, middleIndex, lastIndex)
      next.relationship_progression_plan = appendSceneCardText(next.relationship_progression_plan, [relationPlan.progression], 360)
      if (relationPlan.buffer) next.relationship_buffer_zone = appendSceneCardText(next.relationship_buffer_zone, [relationPlan.buffer], 280)
      if (relationPlan.action) next.supporting_character_action = appendSceneCardText(next.supporting_character_action, [relationPlan.action], 280)
      if (relationPlan.shift) next.attitude_shift_checkpoint = appendSceneCardText(next.attitude_shift_checkpoint, [relationPlan.shift], 280)
      if (relationPlan.nextHook) next.relationship_next_hook = appendSceneCardText(next.relationship_next_hook, [relationPlan.nextHook], 300)
      next.action_beats = mergeSceneCardStringList(next.action_beats, characterRelationActions)
      next.character_voice = appendSceneCardText(next.character_voice, characterRelationActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, characterRelationActions)
      if (index === firstIndex) next.required_information = mergeSceneCardStringList(next.required_information, [relationPlan.buffer])
      if (index === middleIndex) next.action_beats = mergeSceneCardStringList(next.action_beats, [relationPlan.action, relationPlan.shift])
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, [relationPlan.nextHook])
    }
    if (storyLoopActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, storyLoopActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, storyLoopActions)
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, storyLoopActions)
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, storyLoopActions)
      }
    }
    if (emotionalArcActions.length) {
      const emotionalArcPlan = emotionalArcSceneExecutionPlan(emotionalArcActions, index, firstIndex, middleIndex, lastIndex)
      next.emotional_arc_stage = appendSceneCardText(next.emotional_arc_stage, [emotionalArcPlan.stage], 120)
      next.reader_emotion_goal = appendSceneCardText(next.reader_emotion_goal, [emotionalArcPlan.readerGoal], 360)
      next.reaction_structure = appendSceneCardText(next.reaction_structure, [emotionalArcPlan.reaction], 320)
      if (emotionalArcPlan.expectation) next.expectation_bridge = appendSceneCardText(next.expectation_bridge, [emotionalArcPlan.expectation], 260)
      next.emotional_tone = appendSceneCardText(next.emotional_tone, emotionalArcActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, emotionalArcActions)
      if (index === firstIndex) next.required_beats = mergeSceneCardStringList(next.required_beats, [emotionalArcPlan.reaction])
      if (index === middleIndex) next.action_beats = mergeSceneCardStringList(next.action_beats, [emotionalArcPlan.reaction])
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, emotionalArcActions)
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, [emotionalArcPlan.expectation])
      }
    }
    if (readerRetentionActions.length) {
      next.information_gap = appendSceneCardText(next.information_gap, readerRetentionActions)
      if (index === firstIndex) next.opening_hook = appendSceneCardText(next.opening_hook, readerRetentionActions)
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, readerRetentionActions)
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, readerRetentionActions)
      }
    }
    if (readerPayoffActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, readerPayoffActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, readerPayoffActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, readerPayoffActions)
    }
    if (chapterAttractionActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, chapterAttractionActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, chapterAttractionActions)
      if (index === firstIndex) next.opening_hook = appendSceneCardText(next.opening_hook, chapterAttractionActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, chapterAttractionActions)
    }
    if (storyDriveActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, storyDriveActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, storyDriveActions)
      next.conflict = appendSceneCardText(next.conflict, storyDriveActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, storyDriveActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, storyDriveActions)
    }
    if (storylineActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, storylineActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, storylineActions)
      next.conflict = appendSceneCardText(next.conflict, storylineActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, storylineActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, storylineActions)
    }
    if (characterArcActions.length) {
      next.action_beats = mergeSceneCardStringList(next.action_beats, characterArcActions)
      next.character_voice = appendSceneCardText(next.character_voice, characterArcActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, characterArcActions)
      next.emotional_tone = appendSceneCardText(next.emotional_tone, characterArcActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, characterArcActions)
    }
    if (innovationActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, innovationActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, innovationActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, innovationActions)
      next.sensory_anchor = appendSceneCardText(next.sensory_anchor, innovationActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, innovationActions)
    }
    if (volumeBeatActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, volumeBeatActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, volumeBeatActions)
      next.turning_point = appendSceneCardText(next.turning_point, volumeBeatActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, volumeBeatActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, volumeBeatActions)
    }
    if (coreDriftActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, coreDriftActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, coreDriftActions)
      next.conflict = appendSceneCardText(next.conflict, coreDriftActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, coreDriftActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, coreDriftActions)
    }
    if (timelineDeltaActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, timelineDeltaActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, timelineDeltaActions)
      if (index === firstIndex) next.transition_from_previous = appendSceneCardText(next.transition_from_previous, timelineDeltaActions)
    }
    if (characterStateDeltaActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, characterStateDeltaActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, characterStateDeltaActions)
      next.character_voice = appendSceneCardText(next.character_voice, characterStateDeltaActions)
      if (index === firstIndex) next.transition_from_previous = appendSceneCardText(next.transition_from_previous, characterStateDeltaActions)
    }
    if (assetStateDeltaActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, assetStateDeltaActions)
      next.used_settings = mergeSceneCardStringList(next.used_settings, assetStateDeltaActions)
      next.revealed_settings = mergeSceneCardStringList(next.revealed_settings, assetStateDeltaActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, assetStateDeltaActions)
    }
    if (relationshipDeltaActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, relationshipDeltaActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, relationshipDeltaActions)
      next.character_voice = appendSceneCardText(next.character_voice, relationshipDeltaActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, relationshipDeltaActions)
    }
    if (chapterHandoffDeltaActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, chapterHandoffDeltaActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, chapterHandoffDeltaActions)
      if (index === firstIndex) next.transition_from_previous = appendSceneCardText(next.transition_from_previous, chapterHandoffDeltaActions)
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, chapterHandoffDeltaActions)
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, chapterHandoffDeltaActions)
      }
    }
    if (revisionCascadeActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, revisionCascadeActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, revisionCascadeActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, revisionCascadeActions)
      if (index === firstIndex) next.transition_from_previous = appendSceneCardText(next.transition_from_previous, revisionCascadeActions)
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, revisionCascadeActions)
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, revisionCascadeActions)
      }
    }
    if (revisionContextActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, revisionContextActions)
      next.used_settings = mergeSceneCardStringList(next.used_settings, revisionContextActions)
      next.revealed_settings = mergeSceneCardStringList(next.revealed_settings, revisionContextActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, revisionContextActions)
      if (index === firstIndex) next.transition_from_previous = appendSceneCardText(next.transition_from_previous, revisionContextActions)
    }
    if (proseRevisionReceiptActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, proseRevisionReceiptActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, proseRevisionReceiptActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, proseRevisionReceiptActions)
      next.required_information = mergeSceneCardStringList(next.required_information, proseRevisionReceiptActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, proseRevisionReceiptActions)
    }
    if (revisionReceiptCheckActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, revisionReceiptCheckActions)
      next.required_information = mergeSceneCardStringList(next.required_information, revisionReceiptCheckActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, revisionReceiptCheckActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, revisionReceiptCheckActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, revisionReceiptCheckActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, revisionReceiptCheckActions)
    }
    if (deliveryReceiptActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, deliveryReceiptActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, deliveryReceiptActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, deliveryReceiptActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, deliveryReceiptActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, deliveryReceiptActions)
    }
    if (revisionScopeGuardActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, revisionScopeGuardActions)
      next.required_information = mergeSceneCardStringList(next.required_information, revisionScopeGuardActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, revisionScopeGuardActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, revisionScopeGuardActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, revisionScopeGuardActions)
    }
    if (revisionDirectiveActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, revisionDirectiveActions)
      next.required_information = mergeSceneCardStringList(next.required_information, revisionDirectiveActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, revisionDirectiveActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, revisionDirectiveActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, revisionDirectiveActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, revisionDirectiveActions)
    }
    if (focusedRevisionModeActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, focusedRevisionModeActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, focusedRevisionModeActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, focusedRevisionModeActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, focusedRevisionModeActions)
      if (focusedRevisionSettingActions.length) {
        next.required_information = mergeSceneCardStringList(next.required_information, focusedRevisionSettingActions)
        next.used_settings = mergeSceneCardStringList(next.used_settings, focusedRevisionSettingActions)
        next.forbidden_settings = mergeSceneCardStringList(next.forbidden_settings, focusedRevisionSettingActions)
        next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, focusedRevisionSettingActions)
      }
      if (index === lastIndex && focusedRevisionHookActions.length) {
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, focusedRevisionHookActions)
        next.reader_payoff = appendSceneCardText(next.reader_payoff, focusedRevisionHookActions)
      }
    }
    if (craftMetricActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, craftMetricActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, craftMetricActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, craftMetricActions)
      if (craftMetricActionActions.length) {
        next.action_beats = mergeSceneCardStringList(next.action_beats, craftMetricActionActions)
      }
      if (craftMetricDescriptionActions.length) {
        next.style_directives = mergeSceneCardStringList(next.style_directives, craftMetricDescriptionActions)
      }
      if (craftMetricSettingActions.length) {
        next.required_information = mergeSceneCardStringList(next.required_information, craftMetricSettingActions)
        next.used_settings = mergeSceneCardStringList(next.used_settings, craftMetricSettingActions)
        next.forbidden_settings = mergeSceneCardStringList(next.forbidden_settings, craftMetricSettingActions)
        next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, craftMetricSettingActions)
      }
    }
    if (fiveDimensionScoreActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, fiveDimensionScoreActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, fiveDimensionScoreActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, fiveDimensionScoreActions)
      if (fiveDimensionCoreActions.length) {
        next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, fiveDimensionCoreActions)
        next.conflict = appendSceneCardText(next.conflict, fiveDimensionCoreActions)
        next.reader_payoff = appendSceneCardText(next.reader_payoff, fiveDimensionCoreActions)
      }
      if (fiveDimensionSurfaceActions.length) {
        next.style_directives = mergeSceneCardStringList(next.style_directives, fiveDimensionSurfaceActions)
      }
      if (fiveDimensionLogicActions.length) {
        next.required_information = mergeSceneCardStringList(next.required_information, fiveDimensionLogicActions)
        next.action_beats = mergeSceneCardStringList(next.action_beats, fiveDimensionLogicActions)
        next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, fiveDimensionLogicActions)
      }
    }
    if (qualitySpecialtyActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, qualitySpecialtyActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, qualitySpecialtyActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, qualitySpecialtyActions)
      if (qualityStructureActions.length) {
        next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, qualityStructureActions)
        if (index === firstIndex) next.opening_hook = appendSceneCardText(next.opening_hook, qualityStructureActions)
        if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, qualityStructureActions)
      }
      if (qualityProgressionActions.length) {
        next.required_beats = mergeSceneCardStringList(next.required_beats, qualityProgressionActions)
        next.action_beats = mergeSceneCardStringList(next.action_beats, qualityProgressionActions)
        next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, qualityProgressionActions)
        if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, qualityProgressionActions)
      }
      if (qualityInformationActions.length) {
        next.required_information = mergeSceneCardStringList(next.required_information, qualityInformationActions)
        next.information_gap = appendSceneCardText(next.information_gap, qualityInformationActions)
        next.action_beats = mergeSceneCardStringList(next.action_beats, qualityInformationActions)
      }
    }
    if (platformContentRubricActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, platformContentRubricActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, platformContentRubricActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, platformContentRubricActions)
      if (platformRubricActions.length) {
        if (index === firstIndex) next.opening_hook = appendSceneCardText(next.opening_hook, platformRubricActions)
        next.reader_payoff = appendSceneCardText(next.reader_payoff, platformRubricActions)
        if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, platformRubricActions)
      }
      if (contentRubricActions.length) {
        next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, contentRubricActions)
        next.conflict = appendSceneCardText(next.conflict, contentRubricActions)
        next.action_beats = mergeSceneCardStringList(next.action_beats, contentRubricActions)
        next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, contentRubricActions)
        if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, contentRubricActions)
      }
    }
    if (deterministicCleanupActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, deterministicCleanupActions)
      next.style_directives = mergeSceneCardStringList(next.style_directives, deterministicCleanupActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, deterministicCleanupActions)
    }
    if (bannedWordActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, bannedWordActions)
      next.style_directives = mergeSceneCardStringList(next.style_directives, bannedWordActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, bannedWordActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, bannedWordActions)
    }
    if (deslopRepairReceiptActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, deslopRepairReceiptActions)
      next.style_directives = mergeSceneCardStringList(next.style_directives, deslopRepairReceiptActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, deslopRepairReceiptActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, deslopRepairReceiptActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, deslopRepairReceiptActions)
    }
    if (readabilityActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, readabilityActions)
      next.style_directives = mergeSceneCardStringList(next.style_directives, readabilityActions)
      next.dialogue_goals = mergeSceneCardStringList(next.dialogue_goals, readabilityActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, readabilityActions)
    }
    if (governanceRecheckActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, governanceRecheckActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, governanceRecheckActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, governanceRecheckActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, governanceRecheckActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, governanceRecheckActions)
    }
    if (chapterTitleActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, chapterTitleActions)
      next.required_information = mergeSceneCardStringList(next.required_information, chapterTitleActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, chapterTitleActions)
      if (index === firstIndex) next.opening_hook = appendSceneCardText(next.opening_hook, chapterTitleActions)
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, chapterTitleActions)
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, chapterTitleActions)
      }
    }
    if (qualityGateActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, qualityGateActions)
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, qualityGateActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, qualityGateActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, qualityGateActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, qualityGateActions)
    }
    if (qualityAuditRepairReceiptActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, qualityAuditRepairReceiptActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, qualityAuditRepairReceiptActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, qualityAuditRepairReceiptActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, qualityAuditRepairReceiptActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, qualityAuditRepairReceiptActions)
    }
    if (qualityPlanReceiptActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, qualityPlanReceiptActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, qualityPlanReceiptActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, qualityPlanReceiptActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, qualityPlanReceiptActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, qualityPlanReceiptActions)
    }
    if (serialRiskRepairActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, serialRiskRepairActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, serialRiskRepairActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, serialRiskRepairActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, serialRiskRepairActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, serialRiskRepairActions)
    }
    if (sceneCardReceiptActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, sceneCardReceiptActions)
      next.required_information = mergeSceneCardStringList(next.required_information, sceneCardReceiptActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, sceneCardReceiptActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, sceneCardReceiptActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, sceneCardReceiptActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, sceneCardReceiptActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, sceneCardReceiptActions)
    }
    if (perspectiveReviewActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, perspectiveReviewActions)
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, perspectiveReviewActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, perspectiveReviewActions)
      next.conflict = appendSceneCardText(next.conflict, perspectiveReviewActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, perspectiveReviewActions)
    }
    if (targetReaderActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, targetReaderActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, targetReaderActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, targetReaderActions)
    }
    if (conflictStructureActions.length) {
      next.conflict = appendSceneCardText(next.conflict, conflictStructureActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, conflictStructureActions)
      if (index === lastIndex) next.turning_point = appendSceneCardText(next.turning_point, conflictStructureActions)
    }
    if (genrePositioningActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, genrePositioningActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, genrePositioningActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, genrePositioningActions)
    }
    if (upgradeRhythmActions.length) {
      next.action_beats = mergeSceneCardStringList(next.action_beats, upgradeRhythmActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, upgradeRhythmActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, upgradeRhythmActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, upgradeRhythmActions)
    }
    if (continuityHeatActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, continuityHeatActions)
      next.information_gap = appendSceneCardText(next.information_gap, continuityHeatActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, continuityHeatActions)
    }
    if (sourceReadinessActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, sourceReadinessActions)
      next.used_settings = mergeSceneCardStringList(next.used_settings, sourceReadinessActions)
    }
    if (writePreparationActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, writePreparationActions)
      next.required_information = mergeSceneCardStringList(next.required_information, writePreparationActions)
      next.used_settings = mergeSceneCardStringList(next.used_settings, writePreparationActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, writePreparationActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, writePreparationActions)
    }
    if (intentConfirmationActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, intentConfirmationActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, intentConfirmationActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, intentConfirmationActions)
    }
    if (chapterBlueprintActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, chapterBlueprintActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, chapterBlueprintActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, chapterBlueprintActions)
    }
    if (blueprintConsumptionActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, blueprintConsumptionActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, blueprintConsumptionActions)
      next.action_beats = mergeSceneCardStringList(next.action_beats, blueprintConsumptionActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, blueprintConsumptionActions)
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, blueprintConsumptionActions)
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, blueprintConsumptionActions)
      }
    }
    if (coreContractActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, coreContractActions)
      next.conflict = appendSceneCardText(next.conflict, coreContractActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, coreContractActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, coreContractActions)
    }
    if (femaleAudienceActions.length) {
      next.emotional_tone = appendSceneCardText(next.emotional_tone, femaleAudienceActions)
      next.character_voice = appendSceneCardText(next.character_voice, femaleAudienceActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, femaleAudienceActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, femaleAudienceActions)
    }
    if (chapterBenchmarkActions.length) {
      next.benchmark_recall_directives = mergeSceneCardStringList(next.benchmark_recall_directives, chapterBenchmarkActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, chapterBenchmarkActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, chapterBenchmarkActions)
    }
    if (runwayActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, runwayActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, runwayActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, runwayActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, runwayActions)
    }
    if (longformActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, longformActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, longformActions)
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, longformActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, longformActions)
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, longformActions)
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, longformActions)
      }
    }
    if (signatureSceneActions.length) {
      next.action_beats = mergeSceneCardStringList(next.action_beats, signatureSceneActions)
      next.sensory_anchor = appendSceneCardText(next.sensory_anchor, signatureSceneActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, signatureSceneActions)
    }
    if (storyUnitActions.length) {
      next.purpose_tags = mergeSceneCardStringList(next.purpose_tags, storyUnitActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, storyUnitActions)
      if (index === lastIndex) {
        next.reader_payoff = appendSceneCardText(next.reader_payoff, storyUnitActions)
        next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, storyUnitActions)
      }
    }
    if (chapterHandoffActions.length) {
      if (index === firstIndex) {
        next.transition_from_previous = appendSceneCardText(next.transition_from_previous, chapterHandoffActions)
        next.required_beats = mergeSceneCardStringList(next.required_beats, chapterHandoffActions)
      }
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, chapterHandoffActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, chapterHandoffActions)
    }
    if (openingDesignActions.length) {
      if (index === firstIndex) {
        next.opening_hook = appendSceneCardText(next.opening_hook, openingDesignActions)
        next.required_beats = mergeSceneCardStringList(next.required_beats, openingDesignActions)
        next.conflict = appendSceneCardText(next.conflict, openingDesignActions)
      }
    }
    if (paragraphHookActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, paragraphHookActions)
      next.information_gap = appendSceneCardText(next.information_gap, paragraphHookActions)
    }
    if (proseMetaActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, proseMetaActions)
    }
    if (punctuationToneActions.length) {
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, punctuationToneActions)
      next.style_directives = mergeSceneCardStringList(next.style_directives, punctuationToneActions)
    }
    if (styleBoundaryActions.length) {
      next.style_directives = mergeSceneCardStringList(next.style_directives, styleBoundaryActions)
      next.benchmark_recall_directives = mergeSceneCardStringList(next.benchmark_recall_directives, styleBoundaryActions)
    }
    if (styleSampleReceiptActions.length) {
      next.style_directives = mergeSceneCardStringList(next.style_directives, styleSampleReceiptActions)
      next.benchmark_recall_directives = mergeSceneCardStringList(next.benchmark_recall_directives, styleSampleReceiptActions)
      next.prose_craft_directives = mergeSceneCardStringList(next.prose_craft_directives, styleSampleReceiptActions)
      next.dialogue_goals = mergeSceneCardStringList(next.dialogue_goals, styleSampleReceiptActions)
      next.required_beats = mergeSceneCardStringList(next.required_beats, styleSampleReceiptActions)
      next.character_voice = appendSceneCardText(next.character_voice, styleSampleReceiptActions)
      next.emotional_tone = appendSceneCardText(next.emotional_tone, styleSampleReceiptActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, styleSampleReceiptActions)
    }
    if (payoffSetupActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, payoffSetupActions)
      if (index === lastIndex) next.reader_payoff = appendSceneCardText(next.reader_payoff, payoffSetupActions)
    }
    if (spectatorReactionActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, spectatorReactionActions)
      next.character_voice = appendSceneCardText(next.character_voice, spectatorReactionActions)
      next.reader_payoff = appendSceneCardText(next.reader_payoff, spectatorReactionActions)
    }
    if (foreshadowingDeltaActions.length) {
      next.required_information = mergeSceneCardStringList(next.required_information, foreshadowingDeltaActions)
      next.information_gap = appendSceneCardText(next.information_gap, foreshadowingDeltaActions)
      if (index === lastIndex) next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, foreshadowingDeltaActions)
    }
    if (conceptAnchorActions.length) {
      next.concept_anchor_rules = mergeSceneCardStringList(next.concept_anchor_rules, conceptAnchorActions)
    }
    if (stagedActions.length) {
      next.required_beats = mergeSceneCardStringList(next.required_beats, stagedActions)
      next.recent_fatigue_action = appendSceneCardText(next.recent_fatigue_action, stagedActions)
    }
    if (index === firstIndex && openingActions.length) {
      next.opening_hook = appendSceneCardText(next.opening_hook, openingActions)
    }
    if (index === middleIndex && middleActions.length) {
      next.state_changes_expected = mergeSceneCardStringList(next.state_changes_expected, middleActions)
      if (!compactBriefText(next.conflict)) next.conflict = compactBriefText(middleActions.join('；'), 180)
    }
    if (index === lastIndex && endingActions.length) {
      next.ending_hook_seed = appendSceneCardText(next.ending_hook_seed, endingActions)
    }
    return next
  })
}
