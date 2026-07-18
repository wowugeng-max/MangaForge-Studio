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
