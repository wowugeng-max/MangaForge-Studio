import { asArray, compactText } from '../../routes/novel-route-utils'
import { sceneBriefFromCard } from '../../novel-writing/scene-briefs'
import { buildGoldenThreeBrief, normalizeGoldenThreeBrief } from '../../novel-writing/golden-three-brief'
import { countProseChars } from '../../novel-writing/word-target'
import { anchorMatchScore } from '../../novel-writing/text-matching'
import { buildOhStoryMainlineDefinitionContract } from '../../routes/novel-mainline-definition-contract'
import { proseBodyWithoutTitleLine, proseParagraphsWithoutTitle } from './prose-expansion'
import { platformCheckNeedsCarryOver } from './platform-carry-over'
import { compactBriefText, uniqueBriefStrings } from './text-utils'
import {
  buildChapterBlueprintBeatDensityContract,
  normalizeChapterBlueprintSmallOutlineContract,
} from './outline-blueprint-contracts'
import { normalizeStoredOhStoryDeliveryReceipts } from '../post-delivery/delivery-risk-carry-over'

import {
  chapterBlueprintFromContext,
} from './chapter-blueprint-execution-basics'

import {
  buildChapterBlueprintCraftChecks,
} from './chapter-blueprint-execution-checks'

export function scanChapterBlueprintCraftRisks(contextPackage: any = {}, chapterText: string) {
  const blueprint = chapterBlueprintFromContext(contextPackage, contextPackage?.chapter_target || {})
  return buildChapterBlueprintCraftChecks(blueprint, chapterText)
    .filter((item: any) => platformCheckNeedsCarryOver(item))
    .map((item: any) => ({
      ...item,
      key: `blueprint_craft_${item.key}`,
      source: 'chapter_blueprint_craft',
    }))
}

export function scanCharacterOrderExecutionRisks(contextPackage: any = {}, chapterText: string) {
  const blueprint = chapterBlueprintFromContext(contextPackage, contextPackage?.chapter_target || {})
  const plannedOrder = asArray(blueprint?.character_order || blueprint?.characterOrder)
    .map((item: any) => compactBriefText(item))
    .filter(Boolean)
    .slice(0, 8)
  if (plannedOrder.length < 2) return []
  const body = proseBodyWithoutTitleLine(chapterText).replace(/\s+/g, '')
  const seen = plannedOrder
    .map(name => ({ name, index: body.indexOf(name) }))
    .filter(item => item.index >= 0)
  if (seen.length < 2) return []
  const actualOrder = [...seen].sort((a, b) => a.index - b.index).map(item => item.name)
  const plannedSeenOrder = plannedOrder.filter(name => seen.some(item => item.name === name))
  if (actualOrder.join('\u0001') === plannedSeenOrder.join('\u0001')) return []
  return [{
    key: 'character_order_mismatch',
    label: '人物出场顺序扫描',
    status: 'warn' as const,
    evidence: `计划：${plannedSeenOrder.join(' -> ')}；实际：${actualOrder.join(' -> ')}。`,
    fix: '按 oh-story 意图确认修复：人物关系和出场顺序决定镜头进入顺序；重排开场镜头、对话触发和信息差曝光顺序，让正文首次聚焦顺序服务细纲里的关系变化和反应放大。',
    source: 'chapter_blueprint_character_order',
  }]
}

export function normalizeBlueprintBeatSequenceItem(raw: any, index: number) {
  const beatNo = Number(raw?.beat_no ?? raw?.beatNo ?? raw?.scene_no ?? raw?.sceneNo ?? index + 1) || index + 1
  const action = compactBriefText(
    typeof raw === 'string'
      ? raw
      : raw?.action || raw?.beat || raw?.event || raw?.summary || raw?.title || raw?.purpose,
  )
  const functionTag = compactBriefText(
    typeof raw === 'string'
      ? ''
      : raw?.function_tag || raw?.functionTag || raw?.tag || raw?.role || raw?.payoff,
  )
  const text = compactBriefText([action, functionTag].filter(Boolean).join('；'))
  if (!text) return null
  return {
    beat_no: beatNo,
    action,
    function_tag: functionTag,
    text,
    label: `${beatNo}.${functionTag || action}`,
  }
}

export function blueprintBeatActionNegated(action: string, chapterText: string) {
  const verbs = ['交出', '拿出', '递出', '公开', '压问', '反证', '夺回', '打开', '进入', '找到', '揭露', '承认', '改口', '站队', '潜入']
    .filter(verb => String(action || '').includes(verb))
  if (!verbs.length) return false
  return verbs.some(verb => new RegExp(`(?:没有|没能|未|并未|始终[^。！？!?]{0,18}没有)[^。！？!?]{0,8}${verb}`).test(chapterText))
}

export function blueprintBeatSequenceMatch(beat: any, chapterText: string) {
  const body = String(chapterText || '')
  const match = anchorMatchScore(beat.text, body)
  const actionMatch = beat.action ? anchorMatchScore(beat.action, body) : { score: 0, matched: [] as string[] }
  const negated = blueprintBeatActionNegated(beat.action, body)
  const delivered = !negated && (match.score >= 22 || actionMatch.score >= 24 || actionMatch.matched.length >= 2)
  const candidateIndexes = [
    ...match.matched,
    ...actionMatch.matched,
    beat.action,
    beat.function_tag,
  ]
    .map(item => compactBriefText(item))
    .filter(Boolean)
    .map(item => body.indexOf(item))
    .filter(index => index >= 0)
  return {
    ...beat,
    delivered,
    index: candidateIndexes.length ? Math.min(...candidateIndexes) : -1,
    evidence: uniqueBriefStrings([...match.matched, ...actionMatch.matched], 6).join('、'),
  }
}

export function scanBeatSequenceExecutionRisks(contextPackage: any = {}, chapterText: string) {
  const blueprint = chapterBlueprintFromContext(contextPackage, contextPackage?.chapter_target || {})
  const planned = asArray(blueprint?.beat_sequence || blueprint?.beatSequence)
    .map((item: any, index: number) => normalizeBlueprintBeatSequenceItem(item, index))
    .filter(Boolean)
    .slice(0, 12)
  if (planned.length < 2) return []

  const body = proseBodyWithoutTitleLine(chapterText)
  const matched = planned.map((beat: any) => blueprintBeatSequenceMatch(beat, body))
  const missing = matched.filter((beat: any) => !beat.delivered)
  const delivered = matched.filter((beat: any) => beat.delivered && beat.index >= 0)
  const outOfOrderPairs: string[] = []
  for (let index = 1; index < delivered.length; index += 1) {
    if (delivered[index].index < delivered[index - 1].index) {
      outOfOrderPairs.push(`${delivered[index - 1].label} -> ${delivered[index].label}`)
    }
  }
  if (!missing.length && !outOfOrderPairs.length) return []
  const keyParts = [
    missing.length ? 'missing' : '',
    outOfOrderPairs.length ? 'out_of_order' : '',
  ].filter(Boolean).join('_and_')
  return [{
    key: `beat_sequence_${keyParts || 'execution_gap'}`,
    label: '情节点序列扫描',
    status: 'warn' as const,
    evidence: [
      missing.length ? `缺失：${missing.map((beat: any) => beat.label).join('、')}` : '',
      outOfOrderPairs.length ? `乱序：${outOfOrderPairs.join('；')}` : '',
      `已命中：${delivered.map((beat: any) => `${beat.label}@${beat.index}`).join('、') || '无'}`,
    ].filter(Boolean).join('；'),
    fix: '按 oh-story 情节细化修复：情节点序列必须逐点落到“谁做了什么 + 功能标签”；补回缺失情节点，并按细纲顺序重排压力铺垫、信息差、转折、爽点兑现和承接，不要只写结果摘要。',
    source: 'chapter_blueprint_beat_sequence',
  }]
}

export function parseCostRewardPlan(value: any) {
  const text = compactBriefText(value)
  if (!text) return null
  const costMatch = text.match(/代价[:：]?\s*([^；;。]+)[；;。]?/)
  const rewardMatch = text.match(/收益[:：]?\s*([^；;。]+)/)
  const cost = compactBriefText(costMatch?.[1])
  const reward = compactBriefText(rewardMatch?.[1])
  if (!cost && !reward) return null
  return { cost, reward, text }
}

const COST_EXECUTION_SIGNAL_PATTERN = /公开|得罪|开罪|暴露|失去|牺牲|付出|代价|风险|反噬|受伤|消耗|损耗|站队|背叛|记恨|冻结|取消|追杀|惩罚|敌视/
const REWARD_EXECUTION_SIGNAL_PATTERN = /收益|拿到|获得|夺回|洗清|证明|改口|解锁|得到|赢|胜|解释权|资格|线索|奖励|阶段结算/

export function plannedBeatDelivered(expected: string, chapterText: string, signalPattern: RegExp) {
  if (!expected) return true
  const signalRegex = new RegExp(signalPattern.source, 'g')
  const expectedSignals = Array.from(new Set(Array.from(expected.matchAll(signalRegex)).map(match => match[0])))
  const hasExpectedSignal = !expectedSignals.length || expectedSignals.some(signal => String(chapterText || '').includes(signal))
  if (!hasExpectedSignal) return false
  const match = anchorMatchScore(expected, chapterText)
  return match.score >= 24 || match.matched.length >= 2
}

export function scanCostRewardExecutionRisks(contextPackage: any = {}, chapterText: string) {
  const blueprint = chapterBlueprintFromContext(contextPackage, contextPackage?.chapter_target || {})
  const plan = parseCostRewardPlan(blueprint?.cost_and_reward || blueprint?.costAndReward)
  if (!plan) return []
  const body = proseBodyWithoutTitleLine(chapterText)
  const costDelivered = plannedBeatDelivered(plan.cost, body, COST_EXECUTION_SIGNAL_PATTERN)
  const rewardDelivered = plannedBeatDelivered(plan.reward, body, REWARD_EXECUTION_SIGNAL_PATTERN)
  if (costDelivered && rewardDelivered) return []
  const missing = [
    !costDelivered && plan.cost ? 'cost' : '',
    !rewardDelivered && plan.reward ? 'reward' : '',
  ].filter(Boolean)
  return [{
    key: `cost_reward_missing_${missing.join('_and_') || 'execution'}`,
    label: '代价/收益兑现扫描',
    status: 'warn' as const,
    evidence: `计划代价：${plan.cost || '未声明'}；计划收益：${plan.reward || '未声明'}。`,
    fix: '按 oh-story 情节细化修复：代价兑现/收益兑现必须拆开落地，写清谁付出代价、谁获得收益、后续账是什么；不能只写主角拿到好处而跳过暴露风险、关系损耗、资源消耗或敌方反扑。',
    source: 'chapter_blueprint_cost_reward',
  }]
}

const LOCAL_VICTORY_SIGNAL_PATTERN = /终于(?:通过|解决|赢|成功)|总算(?:通过|解决|赢|成功)|赢了|赢下|胜了|成功|解决(?:了)?|通过|拿到|获得|夺回|洗清|红光熄灭|资格(?:门槛)?(?:终于)?通过|考核通过|阶段结算|奖励/
const LOCAL_VICTORY_CLOSURE_PATTERN = /松了(?:一口气|口气)|休息|回到(?:住处|房间|屋里)|终于可以|尘埃落定|到这里(?:总算)?结束|事情(?:终于|总算)?结束|不必再|安全了/
const LOCAL_VICTORY_COST_OR_RISK_PATTERN = /但|却|然而|随即|下一|新的?(?:代价|风险|危机|门槛|敌人|目标|任务|名单|规则|问题)|更高|更大|暴露|失去|牺牲|反噬|受伤|消耗|损耗|追杀|惩罚|冻结|取消|记恨|记下|敌视|必须|不能|否则|倒计时|提前|十息|十秒|禁库|作证资格|审查|核验/

export function scanLocalVictoryCostRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 10)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index]
    LOCAL_VICTORY_SIGNAL_PATTERN.lastIndex = 0
    if (!LOCAL_VICTORY_SIGNAL_PATTERN.test(paragraph)) continue
    const window = paragraphs.slice(index, Math.min(paragraphs.length, index + 4))
    const windowText = window.join(' ')
    LOCAL_VICTORY_COST_OR_RISK_PATTERN.lastIndex = 0
    if (LOCAL_VICTORY_COST_OR_RISK_PATTERN.test(windowText)) continue
    LOCAL_VICTORY_CLOSURE_PATTERN.lastIndex = 0
    if (!LOCAL_VICTORY_CLOSURE_PATTERN.test(windowText)) continue
    hits.push({
      key: `local_victory_without_cost_${index + 1}_${index + window.length}`,
      label: '局部胜利代价扫描',
      status: 'warn',
      evidence: `第${index + 1}-${index + window.length}段完成局部胜利但缺少新代价/风险：${compactBriefText(windowText, 280)}`,
      fix: '按 oh-story 剧情动力修复：局部胜利必须伴随新的代价、风险、信息暴露、关系压力或下一步行动门槛；把“赢了/拿到奖励/回去休息”改成目标→阻碍→行动→代价反馈→新期待的闭环。',
    })
    break
  }
  return hits
}

const ENDING_FINAL_STATE_SIGNAL_PATTERN = /公开|逐出|失去|获得|夺回|留下|摘下|关闭|打开|封死|改变|身份|名单|候选|玉牌|倒下|受伤|死亡|带走|站队|被迫|成为/
const UNRESOLVED_QUESTION_SIGNAL_PATTERN = /谁|为何|为什么|哪里|哪|真相|秘密|缺页|账册|名单|身份|禁库|门后|幕后|问|[？?]/
const NEXT_CHAPTER_PULL_SIGNAL_PATTERN = /必须|子时|天亮|倒计时|潜入|查|追|赶往|进入|打开|找到|带走|阻止|否则|立刻|马上|下一步|禁库|门后|第二本账册/
const NEXT_CHAPTER_PULL_ACTION_PATTERN = /必须|子时|天亮|倒计时|潜入|查|追|赶往|进入|打开|找到|带走|阻止|否则|立刻|马上|下一步/

export function endingContractFromContext(contextPackage: any = {}) {
  const blueprint = chapterBlueprintFromContext(contextPackage, contextPackage?.chapter_target || {})
  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const brief = contextPackage?.pre_draft_brief || contextPackage?.preDraftBrief || {}
  return blueprint?.ending_contract
    || blueprint?.endingContract
    || target?.ending_contract
    || target?.endingContract
    || brief?.ending_contract
    || brief?.endingContract
    || {}
}

export function scanEndingContractExecutionRisks(contextPackage: any = {}, chapterText: string) {
  const contract = endingContractFromContext(contextPackage)
  const finalState = compactBriefText(contract?.final_state || contract?.finalState)
  const unresolvedQuestion = compactBriefText(contract?.unresolved_question || contract?.unresolvedQuestion)
  const nextChapterPull = compactBriefText(contract?.next_chapter_pull || contract?.nextChapterPull)
  if (!finalState && !unresolvedQuestion && !nextChapterPull) return []

  const body = proseBodyWithoutTitleLine(chapterText)
  const tail = body.slice(-900)
  const nextPullDelivered = plannedBeatDelivered(nextChapterPull, tail, NEXT_CHAPTER_PULL_SIGNAL_PATTERN)
    && (!NEXT_CHAPTER_PULL_ACTION_PATTERN.test(nextChapterPull) || NEXT_CHAPTER_PULL_ACTION_PATTERN.test(tail))
  NEXT_CHAPTER_PULL_ACTION_PATTERN.lastIndex = 0
  const checks = [
    {
      key: 'final_state',
      label: '收束状态',
      expected: finalState,
      delivered: plannedBeatDelivered(finalState, tail, ENDING_FINAL_STATE_SIGNAL_PATTERN),
    },
    {
      key: 'unresolved_question',
      label: '未解决问题',
      expected: unresolvedQuestion,
      delivered: plannedBeatDelivered(unresolvedQuestion, tail, UNRESOLVED_QUESTION_SIGNAL_PATTERN),
    },
    {
      key: 'next_chapter_pull',
      label: '下一章推动力',
      expected: nextChapterPull,
      delivered: nextPullDelivered,
    },
  ].filter(item => item.expected)

  const missing = checks.filter(item => !item.delivered)
  if (!missing.length) return []
  return [{
    key: `ending_contract_missing_${missing.map(item => item.key).join('_and_')}`,
    label: '结尾设定和钩子扫描',
    status: 'warn' as const,
    evidence: `计划：${checks.map(item => `${item.label}=${item.expected}`).join('；')}。章尾证据：${compactBriefText(tail, 240)}`,
    fix: `按 oh-story 结尾设定修复：最后300-900字必须同时交代${checks.map(item => item.label).join('、')}；当前缺少${missing.map(item => item.label).join('、')}，不要只抛一句疑问，要把章尾落到状态变化、未解问题和下一章行动压力。`,
    source: 'chapter_blueprint_ending_contract',
  }]
}

const OPENING_NON_PROTAGONIST_SUBJECT_PATTERN = /^(?:广播|警报|铃声|校规|规则|名单|红光|黑点|钟声|楼梯|安全门|规则册|惩罚栏|雨水|风|门|窗|灯|走廊|教学楼|宿舍|城市|天空|月光|阳光)/
const OPENING_PROTAGONIST_ACTION_PATTERN = /(?:我|他|她|少年|少女|男人|女人|孩子|学生|弟子|队长|警员|医生|老师|父亲|母亲|哥哥|姐姐|妹妹|弟弟|[赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜谢邹喻柏水窦章云苏潘葛奚范彭郎鲁韦昌马苗凤花方俞任袁柳鲍史唐费廉岑薛雷贺倪汤滕殷罗毕郝邬安常乐于时傅皮卞齐康伍余元卜顾孟平黄和穆萧尹][一-龥]{1,3})(?:[^。！？!?]{0,18})(?:醒|坐起|站起|抬头|低头|睁眼|闭眼|回头|转身|伸手|抓|握|按|推|拉|跑|冲|退|躲|跪|看见|听见|发现|开口|说道|问|喊|吼|笑|咬|攥|拿|递|打开|关上|盯|望|摸|踢|撞|撕|挡|拦|选择|决定)/
const GOLDEN_THREE_WORLDBUILDING_PATTERN = /世界观|大陆|王朝|宗门|体系|境界|等级|历史|设定|规矩|规则|传承|三百年|千年|外门|内门|阵修|修炼|魔法|异能/
const GOLDEN_THREE_HOOK_SIGNAL_PATTERN = /死|血|痛|伤|尸|刀|枪|火|爆炸|撞|追查|追问|追杀|追上|追来|逃|杀|危险|警报|广播(?:响|炸|停|变)|倒计时|失控|突然|威胁|逼|发现|选择|代价|冲突|问题|门响|敲门|尖叫|喊|吼|问|[？！!?“「]/
const GOLDEN_THREE_EVENT_SIGNAL_PATTERN = /[“「]|死|血|痛|伤|尸|爆炸|撞|追查|追问|追杀|追上|追来|逃|杀|救|广播(?:响|炸|停|变)|警报(?:响|亮|炸)|铃声(?:响|炸)|倒计时(?:开始|归零|跳)|门(?:响|开|关|撞)|敲门|尖叫|喊|吼|问|答|说|抓|握|按|推|拉|撕|砸|踢|冲|跑|退|躲|跪|倒|站|抬|低|转身|打开|关上|掉|落|响|亮|熄|出现|消失|露出|发现|看见|听见|递|拿|放|抢|夺|拦|阻止|威胁|逼|选择|决定|触发|否则|[？！!?]/
const GOLDEN_THREE_ESCALATION_PATTERN = /升级|加深|更|反制|逼|代价|危险|倒计时|失去|暴露|新阻碍|新敌人|第二|加码|翻脸|撕破|追杀|封死|惩罚/
const GOLDEN_THREE_PURSUIT_PATTERN = /为什么|为何|谁|真相|秘密|身份|下一步|必须|否则|倒计时|追|查|找到|打开|门后|名单|缺页|第二|第三|[？?]/
const GOLDEN_THREE_SUMMARY_ENDING_PATTERN = /故事才刚刚开始|一切才刚刚开始|拉开序幕|新的生活才刚刚开始|未来还有很长的路|这只是开始|属于[他她我]的故事/
const OPENING_HOOK_SIGNAL_PATTERN = GOLDEN_THREE_HOOK_SIGNAL_PATTERN

export function goldenThreeBriefFromContext(contextPackage: any = {}) {
  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const chapterNo = Number(target.chapter_no || contextPackage?.chapter_no || 0)
  return normalizeGoldenThreeBrief(
    target.golden_three_brief
    || target.goldenThreeBrief
    || contextPackage?.golden_three_brief
    || contextPackage?.goldenThreeBrief
    || contextPackage?.pre_draft_brief?.golden_three_brief
    || contextPackage?.preDraftBrief?.goldenThreeBrief,
    chapterNo,
  ) || buildGoldenThreeBrief({}, contextPackage, asArray(target.scene_cards || target.sceneCards).map(sceneBriefFromCard))
}

export function goldenThreeCheck(key: string, evidence: string, fix: string) {
  return {
    key,
    label: '黄金三章启动扫描',
    status: 'warn' as const,
    evidence: compactBriefText(evidence, '正文缺少可定位证据。'),
    fix,
    source: 'oh_story_golden_three_execution',
  }
}

export function scanGoldenThreeExecutionRisks(contextPackage: any = {}, chapterText: string) {
  const brief = goldenThreeBriefFromContext(contextPackage)
  if (!brief) return []
  const chapterNo = Number(brief.chapter_no || contextPackage?.chapter_target?.chapter_no || 0)
  if (chapterNo < 1 || chapterNo > 3) return []

  const body = proseBodyWithoutTitleLine(chapterText)
  if (!body) return []
  const compactBody = body.replace(/\s+/g, '')
  const opening500 = compactBody.slice(0, 500)
  const opening300 = compactBody.slice(0, 300)
  const openingEvidence = compactText(body, 360)
  const tail = body.slice(-700)
  const tailCompact = tail.replace(/\s+/g, '')
  const checks: any[] = []

  GOLDEN_THREE_HOOK_SIGNAL_PATTERN.lastIndex = 0
  if (!GOLDEN_THREE_HOOK_SIGNAL_PATTERN.test(opening500)) {
    checks.push(goldenThreeCheck(
      'golden_three_opening_hook_missing',
      `前 500 字缺少事故、异常、危险、欲望、对话逼问或反常信息：${openingEvidence}`,
      '按 oh-story 黄金三章修第一章前 500 字：直接给事故、异常、危险、欲望、对话逼问、规则触发或反常信息，不要先铺背景。',
    ))
  }

  if (chapterNo === 1) {
    const clauses = opening300.split(/[。！？!?；;]/).map(clause => clause.trim()).filter(Boolean)
    const hasProtagonistAction = clauses.some(clause => {
      OPENING_NON_PROTAGONIST_SUBJECT_PATTERN.lastIndex = 0
      if (OPENING_NON_PROTAGONIST_SUBJECT_PATTERN.test(clause)) return false
      OPENING_PROTAGONIST_ACTION_PATTERN.lastIndex = 0
      return OPENING_PROTAGONIST_ACTION_PATTERN.test(clause)
    })
    if (!hasProtagonistAction && countProseChars(opening300) >= 80) {
      checks.push(goldenThreeCheck(
        'golden_three_protagonist_missing',
        `前 300 字缺少主角动作锚点：${openingEvidence}`,
        '第一章必须让主角在前 300 字内用动作、选择、身体反应或对白进入现场；不能只有规则、世界观、环境或旁白介绍。',
      ))
    }
  }

  const eventClauses = opening500
    .split(/[。！？!?；;，,]/)
    .map(clause => clause.trim())
    .filter(clause => {
      if (!clause) return false
      GOLDEN_THREE_EVENT_SIGNAL_PATTERN.lastIndex = 0
      return GOLDEN_THREE_EVENT_SIGNAL_PATTERN.test(clause)
    })
  if (chapterNo === 1 && eventClauses.length < 3 && countProseChars(opening500) >= 60) {
    checks.push(goldenThreeCheck(
      'golden_three_event_missing',
      `前 500 字事件信号 ${eventClauses.length} 个：${openingEvidence}`,
      '第一章有事件，不得纯铺垫；前 500 字至少落下异常、动作、对话、冲突、选择、代价或信息变化组成的现场事件链。',
    ))
  }

  GOLDEN_THREE_WORLDBUILDING_PATTERN.lastIndex = 0
  GOLDEN_THREE_EVENT_SIGNAL_PATTERN.lastIndex = 0
  const openingWorldbuildingParagraph = body
    .split(/\n+/)
    .map(paragraph => paragraph.trim())
    .find(paragraph => {
      const compactParagraph = paragraph.replace(/\s+/g, '')
      if (!compactParagraph || compactBody.indexOf(compactParagraph.slice(0, 20)) > 520) return false
      return countProseChars(compactParagraph) >= 36
        && GOLDEN_THREE_WORLDBUILDING_PATTERN.test(compactParagraph)
        && !GOLDEN_THREE_EVENT_SIGNAL_PATTERN.test(compactParagraph)
    })
  if (openingWorldbuildingParagraph) {
    checks.push(goldenThreeCheck(
      'golden_three_worldbuilding_infodump',
      compactText(openingWorldbuildingParagraph, 260),
      '黄金三章不得用大段世界观说明开局；把体系、规矩、历史、境界等信息拆进现场冲突、角色选择和代价反馈里。',
    ))
  }

  if (chapterNo === 2) {
    GOLDEN_THREE_ESCALATION_PATTERN.lastIndex = 0
    if (!GOLDEN_THREE_ESCALATION_PATTERN.test(compactBody)) {
      checks.push(goldenThreeCheck(
        'golden_three_chapter_two_escalation_missing',
        compactText(body, 300),
        '第二章必须有升级：矛盾加深、阻碍变强、代价增加、规则反制或对手加码，不能只延续第一章的解释和过场。',
      ))
    }
  }

  if (chapterNo === 3) {
    GOLDEN_THREE_PURSUIT_PATTERN.lastIndex = 0
    if (!GOLDEN_THREE_PURSUIT_PATTERN.test(tailCompact)) {
      checks.push(goldenThreeCheck(
        'golden_three_chapter_three_pursuit_missing',
        compactText(tail, 260),
        '第三章必须给追读理由：章末留下新问题、新代价、新目标、下一步行动或更大的未解真相，不能只做阶段总结。',
      ))
    }
  }

  const plannedPayoffs = uniqueBriefStrings(brief.current_chapter_payoffs || brief.currentChapterPayoffs || [], 5)
  const matchedPayoffs = plannedPayoffs.filter(payoff => anchorMatchScore(payoff, body).score >= 45)
  const fallbackPayoffSignals = (compactBody.match(/反证|打脸|赢|夺回|证明|揭露|奖励|解锁|升级|改口|倒戈|站队|爽点/g) || []).length
  if (plannedPayoffs.length && matchedPayoffs.length === 0 && fallbackPayoffSignals < 1) {
    checks.push(goldenThreeCheck(
      'golden_three_payoff_missing',
      `计划爽点：${plannedPayoffs.join('；')}；正文未命中可见回报。`,
      '前三章至少两个爽点；本章计划爽点必须写成可见行动、反转、打脸、发现、奖励、关系变化或局势收益，不能只在设定里承诺。',
    ))
  }

  OPENING_HOOK_SIGNAL_PATTERN.lastIndex = 0
  GOLDEN_THREE_SUMMARY_ENDING_PATTERN.lastIndex = 0
  GOLDEN_THREE_PURSUIT_PATTERN.lastIndex = 0
  const hasEndingHook = GOLDEN_THREE_PURSUIT_PATTERN.test(tailCompact) || OPENING_HOOK_SIGNAL_PATTERN.test(tailCompact)
  const isSummaryEnding = GOLDEN_THREE_SUMMARY_ENDING_PATTERN.test(tailCompact)
  if (!hasEndingHook || isSummaryEnding) {
    checks.push(goldenThreeCheck(
      'golden_three_ending_hook_missing',
      compactText(tail, 260),
      '黄金三章每章结尾必须有悬念、危机、发现、决定或反转；删掉“故事才刚刚开始/拉开序幕”式总结，改成现场未解问题和下一章行动压力。',
    ))
  }

  return checks
}
