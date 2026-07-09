import { anchorMatchScore } from './text-matching'

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function compactBriefText(value: any, fallback: any = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function uniqueBriefStrings(values: any, limit = 12) {
  const seen = new WeakSet<object>()
  const flattenBriefValues = (value: any, depth = 0): any[] => {
    if (depth > 6) return []
    if (Array.isArray(value)) return value.flatMap(item => flattenBriefValues(item, depth + 1))
    if (value && typeof value === 'object') {
      if (seen.has(value)) return []
      seen.add(value)
      return Object.values(value).flatMap(item => flattenBriefValues(item, depth + 1))
    }
    return value ? [value] : []
  }
  return Array.from(new Set(flattenBriefValues(values)
    .map(value => compactBriefText(value))
    .filter(Boolean))).slice(0, limit)
}

export function plotDynamicsArray(values: any) {
  return asArray(values).map((item: any) => compactBriefText(item)).filter(Boolean)
}

export function countPlotDynamicsSignals(chapterText: string, patterns: RegExp[]) {
  const text = String(chapterText || '')
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0)
}

export function normalizePlotLoopCheck(values: any[], chapterText: string) {
  const planned = plotDynamicsArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const loopSignals = countPlotDynamicsSignals(text, [
    /目标.*明确|目标很明确|必须.*找到|必须.*完成/,
    /阻碍|封锁|冻结|压上来|挡住/,
    /行动|拆开|核验|追查|没有等/,
    /代价\/反馈|代价|反馈|暴露|信任提高|追责升级/,
    /新期待|章末|指向|留下/,
  ])
  const flat = /没有明确目标|没有真正阻碍|一路顺利解决|没有代价反馈|没有新期待|事情自然结束/.test(text)
  const deliveredItems = scored.filter(item => item.match.score >= 30).length
  const delivered = !flat && (deliveredItems >= Math.max(2, Math.ceil(planned.length * 0.45)) || loopSignals >= 4)
  return {
    key: 'plot_loop',
    label: '剧情闭环',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.min(Math.max(14, loopSignals * 16), flat ? 22 : 66),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      loopSignals >= 4 ? '目标-阻碍-行动-代价/反馈-新期待信号可见' : '',
      flat ? '剧情闭环显式缺失' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 30).slice(0, 8),
    issue: delivered ? '' : '目标、阻碍、行动、代价/反馈、新期待没有形成剧情闭环。',
    repair_instruction: delivered ? '' : '补剧情闭环：先立目标，再压阻碍，让主角行动产生代价/反馈，并在章末留下新期待。',
  }
}

export function normalizeClimaxFormulaCheck(values: any[], chapterText: string) {
  const planned = plotDynamicsArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const missingFormula = /没有假胜|没有.*崩解|没有.*交叉死磕|高潮没有/.test(text)
  const formulaSignals = countPlotDynamicsSignals(text, [
    /蓄能|倒计时|压低|蓄压/,
    /假胜|先显示|先.*恢复|小胜/,
    /崩解|下一秒|反向|烧红/,
    /交叉死磕|一边.*一边|死磕/,
    /悬置收尾|没有关门|留下新期待|章末/,
  ])
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const deliveredItems = scored.filter(item => item.match.score >= 32).length
  const delivered = !missingFormula && (deliveredItems >= Math.max(2, Math.ceil(planned.length * 0.45)) || formulaSignals >= 4)
  return {
    key: 'climax_formula',
    label: '高潮公式',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.min(Math.max(12, formulaSignals * 16), missingFormula ? 18 : 64),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      formulaSignals >= 4 ? '高潮公式链路可见' : '',
      missingFormula ? '高潮公式显式缺失' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 32).slice(0, 8),
    issue: delivered ? '' : '高潮缺少蓄能、假胜、崩解、交叉死磕或悬置收尾的情绪落差。',
    repair_instruction: delivered ? '' : '补高潮公式：蓄能后给假胜，再崩解，把主角推入交叉死磕，最后悬置收尾。',
  }
}

export function normalizePlotAbOutlineCheck(values: any[], chapterText: string) {
  const planned = plotDynamicsArray(values)
  if (!planned.length) return null
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const signalCount = countPlotDynamicsSignals(chapterText, [
    /A\s*蓄压|A\s*蓄能|蓄压/,
    /B\s*抬情绪|B\s*抬|小反转|抬情绪/,
    /交替|交错/,
    /阻碍.*反转|压.*回报/,
  ])
  const deliveredItems = scored.filter(item => item.match.score >= 30).length
  const delivered = deliveredItems >= 1 || signalCount >= 2
  return {
    key: 'ab_outline',
    label: 'A/B节奏',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.max(18, signalCount * 18),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      signalCount >= 2 ? 'A/B蓄压抬情绪信号可见' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 30).slice(0, 8),
    issue: delivered ? '' : 'A/B蓄压和抬情绪没有形成交替，剧情容易变成均匀流水账。',
    repair_instruction: delivered ? '' : '补A/B节奏：一段蓄压提高阻碍，一段抬情绪给小反转或阶段回报。',
  }
}

export function normalizePlotScenePurposeCheck(values: any[], chapterText: string) {
  const planned = plotDynamicsArray(values)
  if (!planned.length) return null
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const signalCount = countPlotDynamicsSignals(chapterText, [
    /场景|红色阀门|账本线索|账本编号/,
    /暴露|指向|留下/,
    /功能|推进|交付/,
  ])
  const deliveredItems = scored.filter(item => item.match.score >= 30).length
  const delivered = deliveredItems >= 1 || signalCount >= 2
  return {
    key: 'scene_purpose_map',
    label: '场景功能',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.max(18, signalCount * 18),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      signalCount >= 2 ? '场景功能/信息交付可见' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 30).slice(0, 8),
    issue: delivered ? '' : '场景没有交付明确功能、信息变化或读者回报。',
    repair_instruction: delivered ? '' : '补场景功能：每个场景都要写清它推进了什么、暴露了什么、改变了什么。',
  }
}

export function normalizePlotDriveModeRulesCheck(values: any[], chapterText: string) {
  const planned = plotDynamicsArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const explicitMixedMode = /混合模式|主线用事件|每\s*3-5\s*章|情感停顿/.test(text)
  const explicitEmotionMode = !explicitMixedMode && /追妻|虐心|世情|情感驱动|人物驱动/.test(text)
  const explicitEventMode = !explicitMixedMode && !explicitEmotionMode && (/番茄|爽文|打脸|事件驱动/.test(text) || planned.some(item => /番茄|爽文|打脸|事件驱动/.test(item)))
  const negatedOutcome = /没有赢|没有升级|没有对手栽|没有任何外部结果|只有内心独白|坐着闲谈/.test(text)
  const eventOutcome = !negatedOutcome && /外部结果|赢下|赢了|阶段胜利|升级|解锁|对手栽|栽了一回|当众失败|资格到手|拿到|客户信任提高|处置权|反制成功/.test(text)
  const emotionalHook = /人物心结|后悔了没|原谅了没|心结|关系裂缝|独处|回忆|试探|误会|亏欠|情感停顿/.test(text)
  const eventDelivered = !explicitEventMode || eventOutcome
  const emotionDelivered = !explicitEmotionMode || emotionalHook
  const mixedDelivered = !explicitMixedMode || (eventOutcome && emotionalHook)
  const delivered = eventDelivered && emotionDelivered && mixedDelivered
  return {
    key: 'drive_mode_rules',
    label: '驱动方式',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(12, [eventDelivered, emotionDelivered, mixedDelivered].filter(Boolean).length * 28),
    evidence: [
      explicitEventMode ? '事件驱动/番茄爽文规则' : '',
      eventOutcome ? '外部结果可见' : '',
      explicitEmotionMode || explicitMixedMode ? '情感/混合驱动规则' : '',
      emotionalHook ? '人物心结或情感停顿可见' : '',
      negatedOutcome ? '缺外部结果或只有闲谈内心' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !eventDelivered ? '番茄爽文/打脸文每章必须给外部结果：赢了、升级了、对手栽了至少一项' : '',
      !emotionDelivered ? '情感驱动必须保留人物心结，不能只闲谈或内心独白' : '',
      !mixedDelivered ? '混合模式必须主线事件推进，并用情感停顿透出人物心结' : '',
    ], 8),
    issue: delivered ? '' : '驱动方式与题材不匹配：事件驱动章节缺外部结果，或情感/混合章节缺人物心结。',
    repair_instruction: delivered ? '' : '按 oh-story 驱动方式修复：番茄爽文/打脸文补一个外部结果（赢、升级、对手栽）；追妻/虐心/世情保留人物心结；混合模式主线用事件往前推，每 3-5 章插情感停顿。',
  }
}

export function normalizeLineStaggerRulesCheck(values: any[], chapterText: string) {
  const planned = plotDynamicsArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const deliveredItems = scored.filter(item => item.match.score >= 28).length
  const lineTypes = [
    /主线|核心线|主任务/.test(text) ? '主线' : '',
    /支线|副线|侧线/.test(text) ? '支线' : '',
    /战力|升级|实力|能力/.test(text) ? '战力提升线' : '',
    /装备|道具|工具箱|技能|收获/.test(text) ? '装备收获线' : '',
    /情感|关系|女性角色|感情线/.test(text) ? '情感线' : '',
    /声望|客户信任|旁观者|认可|名声/.test(text) ? '声望线' : '',
  ].filter(Boolean)
  const staggerSignals = [
    /多线错峰|错峰推进|错开节奏|不同步推进|线.*错开/.test(text) ? '多线错峰' : '',
    /没有同时爆|没有同时空转|避免同质化|保留.*燃料|待推进/.test(text) ? '非同时爆/非同时空转' : '',
    lineTypes.length >= 2 ? `${lineTypes.slice(0, 4).join('、')}可见` : '',
  ].filter(Boolean)
  const flatText = text
    .replace(/没有同时(?:爆|爆完|爆发|空转)/g, '')
    .replace(/不能同时(?:爆|爆完|爆发|空转)/g, '')
  const flat = /(?:主线|支线|情感线|声望线|战力线|装备线)[^。！？!?]{0,36}(?:同时|一起)(?:爆完|爆掉|爆发|空转)|(?:同时|一起)(?:爆完|爆掉|爆发|空转)|全部空转/.test(flatText)
  const delivered = !flat && (deliveredItems >= 1 || staggerSignals.length >= 2)
  return {
    key: 'line_stagger_rules',
    label: '多线错峰',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.max(18, staggerSignals.length * 20),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      ...staggerSignals,
      flat ? '多线同时爆或同时空转' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 28).slice(0, 8),
    issue: delivered ? '' : '主线和支线没有错开节奏推进，容易同时爆完或一起空转。',
    repair_instruction: delivered ? '' : '按 oh-story 多线穿插节奏修复：主线、支线、战力提升线、装备收获线、情感线、声望线要错峰推进；本章至少推进一条线，保留另一条线做下一段燃料，避免同时爆完或同时空转。',
  }
}

export function buildPlotDynamicsDeterministicCheck(chapterText: string) {
  const text = String(chapterText || '')
  const risks = [
    /没有明确目标/.test(text) ? {
      key: 'no_goal',
      label: '缺目标',
      evidence: '正文直接承认没有明确目标。',
      fix: '补本章可见目标，并让目标约束主角行动。',
    } : null,
    /没有真正阻碍|一路顺利解决/.test(text) ? {
      key: 'no_obstacle',
      label: '缺阻碍',
      evidence: '正文缺少真正阻碍，主角一路顺利解决。',
      fix: '补外部阻碍、规则压制、资源限制或对手行动。',
    } : null,
    /没有代价反馈|事情自然结束/.test(text) ? {
      key: 'no_cost_feedback',
      label: '缺代价反馈',
      evidence: '行动后没有代价、信息反馈、关系变化或局势变化。',
      fix: '让行动带来代价、反馈或新的压力。',
    } : null,
    /没有新期待|事情到这里结束/.test(text) ? {
      key: 'no_next_expectation',
      label: '缺新期待',
      evidence: '章末没有新期待，事情直接关闭。',
      fix: '章末留下新问题、新线索、新危机或下一目标。',
    } : null,
    /高潮没有|没有假胜|没有.*崩解|没有.*交叉死磕/.test(text) ? {
      key: 'flat_climax',
      label: '高潮平滑',
      evidence: '高潮缺少假胜、崩解和交叉死磕。',
      fix: '按蓄能、假胜、崩解、交叉死磕、悬置收尾重构高潮。',
    } : null,
  ].filter(Boolean)
  if (!risks.length) return null
  return {
    key: 'plot_dynamics_forbidden',
    label: '剧情动力硬伤',
    text: '剧情动力不得缺目标、缺阻碍、缺代价反馈、缺新期待或高潮平滑结束。',
    expected: '剧情动力不得缺目标、缺阻碍、缺代价反馈、缺新期待或高潮平滑结束。',
    score: Math.max(0, 100 - risks.length * 22),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项剧情动力确定性风险。`,
    repair_instruction: '按 oh-story 剧情动力法修复：补目标、阻碍、行动、代价/反馈、新期待，并重构高潮情绪落差。',
  }
}

export function plotDynamicsPriority(missed: any[]) {
  if (missed.some(item => item.key === 'plot_dynamics_forbidden')) return '优先清剧情硬伤'
  if (missed.some(item => item.key === 'drive_mode_rules')) return '优先修驱动方式'
  if (missed.some(item => item.key === 'plot_loop')) return '优先补剧情闭环'
  if (missed.some(item => item.key === 'climax_formula')) return '优先补高潮公式'
  if (missed.some(item => item.key === 'line_stagger_rules')) return '优先补多线错峰'
  if (missed.some(item => item.key === 'ab_outline')) return '优先补A/B节奏'
  if (missed.some(item => item.key === 'scene_purpose_map')) return '优先补场景功能'
  return ''
}
