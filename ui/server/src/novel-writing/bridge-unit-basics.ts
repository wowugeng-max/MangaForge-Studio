import { anchorMatchScore } from './text-matching'

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null || value === '') return []
  return [value]
}

function compactBriefText(value: any, limit = 500) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim().slice(0, limit)
  try {
    return JSON.stringify(value).replace(/\s+/g, ' ').trim().slice(0, limit)
  } catch {
    return String(value).replace(/\s+/g, ' ').trim().slice(0, limit)
  }
}

function uniqueBriefStrings(values: any[], limit = 20) {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    const text = compactBriefText(value)
    if (!text || seen.has(text)) continue
    seen.add(text)
    output.push(text)
    if (output.length >= limit) break
  }
  return output
}

export function bridgeUnitArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => compactBriefText(item)).filter(Boolean), 20)
}

export function normalizeBridgePositionCheck(value: any, chapterText: string) {
  const expected = compactBriefText(value)
  if (!expected) return null
  const text = String(chapterText || '')
  const wantsPayoff = /第3章|第三章|兑现/.test(expected)
  const wantsTransition = /第4章|第四章|承上启下|收尾/.test(expected)
  const wantsPull = /第2章|第二章|拉扯|开始装/.test(expected)
  const genericPosition = /四章|桥段|第[一二三四1234]章|兑现位|承上启下|代入|信息差|拉扯增强/.test(text)
  const delivered = genericPosition
    && (!wantsPayoff || /兑现|回报|爽点|阶段回报|终于|落地/.test(text))
    && (!wantsTransition || /承上启下|收束|新目标|下一步|开启/.test(text))
    && (!wantsPull || /拉扯|阻碍升级|开始装|章尾|反压/.test(text))
  return {
    key: 'bridge_position',
    label: '桥段位置',
    text: expected,
    expected,
    score: delivered ? 88 : genericPosition ? 58 : 28,
    evidence: delivered ? ['桥段位置有正文标记'] : genericPosition ? ['有桥段位置弱标记'] : [],
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : [expected],
    issue: delivered ? '' : `桥段位置未充分落地：${expected}`,
    repair_instruction: delivered ? '' : '先确认本章属于四章一桥段的哪一位，并把对应功能写进正文：代入、信息差、拉扯增强、兑现或承上启下。',
  }
}

export function normalizeBridgePlanCheck(values: any[], chapterText: string) {
  const planned = bridgeUnitArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const deliveredRows = planned.filter(item => {
    const match = anchorMatchScore(item, text)
    return match.score >= 24 || match.matched.length >= 1
  })
  const hasPlanSignals = /账本|旧城|会审|投资人|资金|项目资格|项目|旧期待|新目标/.test(text)
  const delivered = deliveredRows.length > 0 || hasPlanSignals
  return {
    key: 'bridge_unit_plan',
    label: '桥段计划',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 84 : 36,
    evidence: deliveredRows.length ? deliveredRows.slice(0, 8) : hasPlanSignals ? ['桥段计划核心名词落地'] : [],
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '桥段计划没有正文证据，读者看不出本章在服务哪段连续桥。',
    repair_instruction: delivered ? '' : '把 bridge_unit_plan 写成正文可见的目标、阻碍、兑现或章尾目标，不要只在旁白里说“进入下一阶段”。',
  }
}

export function normalizeBridgeExpectationChainCheck(values: any[], chapterText: string) {
  const planned = bridgeUnitArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasOldExpectation = /旧期待|上一章|账本|旧账|会审|兑现|回报|落地/.test(text)
  const hasNewExpectation = /新期待|新目标|下一步|接下来|投资人|资金入口|名单|三日后|必须|否则|新钩子|新门槛/.test(text)
  const hasBeforeOrDuring = /兑现前|先抛出|先挂|高潮中埋|埋下|只露出一半|连续小期待|没有立刻收束/.test(text)
  const delivered = hasOldExpectation && hasNewExpectation && hasBeforeOrDuring
  return {
    key: 'expectation_chain',
    label: '连续期待',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 90 : Math.max(25, [hasOldExpectation, hasNewExpectation, hasBeforeOrDuring].filter(Boolean).length * 26),
    evidence: [hasOldExpectation ? '旧期待兑现' : '', hasNewExpectation ? '新期待/新目标' : '', hasBeforeOrDuring ? '兑现前或高潮中挂钩子' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '连续期待断档：旧期待兑现前没有挂新期待，或高潮中没有埋钩子。',
    repair_instruction: delivered ? '' : '补连续期待：兑现旧期待前先挂新目标、新门槛或新敌意；高潮中埋钩子，爽点落地后不能空窗。',
  }
}

export function normalizeBridgeTargetProgressCheck(chapterText: string) {
  const text = String(chapterText || '')
  const hasGoal = /目标|要争|要拿|必须|项目|资格|资金|签字|名单|旧城/.test(text)
  const hasObstacle = /阻碍|对手|截断|门槛|否则|执事|会审|抢先|压|要求/.test(text)
  const hasAction = /推进|拿回|打开|抛出|压在|落章|给出|争到|追查|签字|提交|反馈/.test(text)
  const hasNewState = /从[^。！？!?]{0,24}推进到|新目标|新门槛|资源门槛|资格|反馈|打开|下一步|章尾/.test(text)
  const delivered = hasGoal && hasObstacle && hasAction && hasNewState
  return {
    key: 'target_progress',
    label: '目标推进',
    text: '目标、阻碍、行动、反馈、提升、新目标至少推进一项。',
    expected: '目标、阻碍、行动、反馈、提升、新目标至少推进一项。',
    score: delivered ? 88 : Math.max(24, [hasGoal, hasObstacle, hasAction, hasNewState].filter(Boolean).length * 22),
    evidence: [hasGoal ? '目标' : '', hasObstacle ? '阻碍' : '', hasAction ? '行动/反馈' : '', hasNewState ? '新状态' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : ['目标推进'],
    issue: delivered ? '' : '目标推进不可见：本章没有形成目标、阻碍、行动、反馈、新状态的链条。',
    repair_instruction: delivered ? '' : '补目标推进：让目标、阻碍、行动、反馈、提升或新目标至少一项发生可见变化。',
  }
}

export function normalizeBridgeClimaxDurationCheck(values: any[], chapterText: string) {
  const planned = bridgeUnitArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasDurationControl = /当天|三日|小高潮|大高潮|没有无限拖延|不拖|完成|收束|落地|节奏内/.test(text)
  const hasUncontrolledDelay = /一直拖|(?<!没有)无限拖延|迟迟没有|还没开始|再等等/.test(text)
  const delivered = hasDurationControl && !hasUncontrolledDelay
  return {
    key: 'climax_duration',
    label: '高潮时长',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 82 : 44,
    evidence: delivered ? ['高潮时长/收束有正文证据'] : [],
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '高潮时长不可控：局部问题没有明确收束或兑现节奏。',
    repair_instruction: delivered ? '' : '控制高潮时长：小高潮要及时完成，大高潮不能无限延期；高潮后过渡必须推进关系、伏笔、状态或下一目标。',
  }
}

export function normalizeBridgeTransitionCheck(values: any[], chapterText: string) {
  const planned = bridgeUnitArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasTailGoal = /章尾|尾声|下一步|新目标|要争什么|三日后|必须|否则|下一章|接下来/.test(text)
  const hasTransitionMethod = /高潮中埋|埋下新钩子|尾巴给目标|连续小期待|新门槛|新敌意|新收益|承上启下/.test(text)
  const delivered = hasTailGoal && hasTransitionMethod
  return {
    key: 'transition_rules',
    label: '阶段衔接',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(30, [hasTailGoal, hasTransitionMethod].filter(Boolean).length * 35),
    evidence: [hasTailGoal ? '章尾目标' : '', hasTransitionMethod ? '阶段衔接手法' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '阶段衔接不足：爽点落地后没有章尾新目标、高潮中钩子或连续小期待。',
    repair_instruction: delivered ? '' : '补阶段衔接：高潮中埋钩子、尾巴给目标或连续小期待至少命中一项，让读者知道下一步争什么。',
  }
}

export function normalizeBridgeFatigueRepairCheck(values: any[], chapterText: string) {
  const planned = bridgeUnitArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const delivered = /提高冲突密度|阻碍升级|承接余波|关系余波|伏笔|状态|新目标|新代价|新门槛|资源门槛|继续推进/.test(text)
  return {
    key: 'fatigue_repair',
    label: '疲劳修复',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 82 : 46,
    evidence: delivered ? ['冲突升级/承接余波/新门槛'] : [],
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '缺少疲劳修复信号：连续桥段没有提高冲突密度、承接余波或打开新门槛。',
    repair_instruction: delivered ? '' : '补疲劳修复：连续无推进时提高冲突密度，连续只爆点时补关系/伏笔/状态承接余波。',
  }
}

export function bridgeUnitPriority(missed: any[]) {
  if (missed.some(item => item.key === 'bridge_forbidden')) return '优先修桥段断档'
  if (missed.some(item => item.key === 'expectation_chain')) return '优先补连续期待'
  if (missed.some(item => item.key === 'transition_rules')) return '优先补章尾新目标'
  if (missed.some(item => item.key === 'target_progress')) return '优先补目标推进'
  if (missed.some(item => item.key === 'bridge_position')) return '优先补桥段位置'
  if (missed.some(item => item.key === 'fatigue_repair')) return '优先补承接余波'
  if (missed.some(item => item.key === 'climax_duration')) return '优先控高潮时长'
  return ''
}
