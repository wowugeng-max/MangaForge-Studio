import { anchorMatchScore } from './text-matching'

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function compactText(value: any, limit = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
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

export function normalizeStoryLoopBeat(key: string, label: string, expected: any, chapterText: string, threshold = 38) {
  const text = compactText(expected, 240)
  if (!text) return null
  const match = anchorMatchScore(text, chapterText)
  const delivered = match.score >= threshold
  return {
    key,
    label,
    text,
    expected: text,
    score: match.score,
    evidence: match.matched,
    delivered,
    status: delivered ? 'ok' : 'warn',
    issue: delivered ? '' : `${label}未充分兑现：${text}`,
    repair_instruction: delivered ? '' : '按 oh-story 最小剧情循环补成 setup -> escalation -> payoff -> carry_over，不要让本章变成孤立事件或解释性过场。',
  }
}

export function normalizeStoryLoopNestedLoopCheck(values: any, chapterText: string) {
  const planned = asArray(values).map((item: any) => compactBriefText(item)).filter(Boolean)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasLoopLevels = /小循环|中循环|大循环|次级目标|卷目标/.test(text)
  const hasBigExpectation = /大循环期待|大目标|卷目标|长期期待|更大问题|更大谜团|世界观扩展|资源黑幕|背后/.test(text)
  const hasVariation = /不同角度|不同矛盾|换成|三种角度|新地图|新势力|新规则|证人、印章和账册|世界观扩展/.test(text)
  const repeatedTrap = /反复用同一个梗换对象|核心不扩展|一直打脸不同反派|收不同小弟|本质没新东西|只反复|只是反复/.test(text)
  const delivered = hasLoopLevels && hasBigExpectation && hasVariation && !repeatedTrap
  return {
    key: 'nested_loop_rules',
    label: '循环嵌套期待',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(12, [hasLoopLevels, hasBigExpectation, hasVariation, !repeatedTrap].filter(Boolean).length * 22),
    evidence: uniqueBriefStrings([
      hasLoopLevels ? '小/中/大循环层级可见' : '',
      hasBigExpectation ? '大循环/长期期待可见' : '',
      hasVariation ? '同一核心卖点换角度或矛盾' : '',
      repeatedTrap ? '只反复用同一个梗换对象' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasLoopLevels ? '缺小循环/中循环/大循环层级' : '',
      !hasBigExpectation ? '缺大循环期待/卷目标铺垫' : '',
      !hasVariation ? '缺同一核心卖点的不同角度/不同矛盾' : '',
      repeatedTrap ? '核心不扩展，只换对象重复' : '',
    ], 8),
    issue: delivered ? '' : '故事循环没有形成小循环 -> 中循环 -> 大循环嵌套，或只是在同一个梗上换对象重复。',
    repair_instruction: delivered ? '' : '补循环嵌套：本章小循环必须完成局部反馈，同时铺垫中循环次级目标和大循环卷目标；同一核心卖点要换不同角度/不同矛盾推进。',
  }
}

export function normalizeStoryLoopMapTransitionCheck(values: any, chapterText: string) {
  const planned = asArray(values).map((item: any) => compactBriefText(item)).filter(Boolean)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const oldConflictSettled = /阶段性解决|阶段性收束|告一段落|已阶段性|旧地图[^。；\n]*(阶段性|解决|收束|告一段落)|旧[^。；\n]*(冲突|案|账|仇|目标)[^。；\n]*(阶段性|解决|收束|告一段落)|核心冲突[^。；\n]*(阶段性|解决|收束|告一段落)/.test(text)
  const droppedOldLines = /旧角色[^。；\n]*(一刀切|全部抛弃|全抛|消失)|旧[^。；\n]*(人和事|目标|关系线)[^。；\n]*(全部不再提|不再提|结束了)|一刀切[^。；\n]*抛弃/.test(text)
  const infodump = /新设定[^。；\n]*(一次性|全部倒出|全部介绍|全倒)|设定很多[^。；\n]*(所有|全部)|作者介绍了所有|一次性[^。；\n]*(倒出|讲完|介绍完)|所有[^。；\n]*(宗门|矿脉|历史|规则)[^。；\n]*(介绍|讲完)/.test(text)
  const fivePieceSignals = [
    /新环境|新地图|新地方|陌生|赤炉城|炉烟|矿车|城门|街巷|山门|宗门|地貌|市集|训练场|武馆|药行|商贩|边城|海港|学院/.test(text),
    /新角色|新势力|掌炉人|地头蛇|外来者|管事|执事|守门|同窗|上级|城主|堂主/.test(text),
    /新规则|规矩|法度|城规|门槛|要求|炼炉保|炉牌|通行|试炼|审核|禁令/.test(text),
    /新目标|目标是|要得到|查清|拿到|进入|夺回|争取|换到|寻找|查出/.test(text),
    /新冲突|冲突是|挡路|扣住|阻止|压到|逼|卡住|对手|敌人|破坏者|抢走|拦住/.test(text),
  ]
  const fivePieceCount = fivePieceSignals.filter(Boolean).length
  const hasNewMapFivePieces = fivePieceCount >= 4
  const hasFirstFiveExpectation = /前\s*5\s*章|前五章|五章内|代入感|期待感|期待|让读者[^。；\n]*盼|目标[^。；\n]*明确|第一块|第一场|试炼|门槛[^。；\n]*眼前|压到眼前/.test(text)
  const hasCarryOverMainline = !droppedOldLines && /贯穿主线|主线继续|跨地图|旧日关系线|老角色|带人走|跟来|仍然|继续牵住|未完成|旧[^。；\n]*(目标|关系|角色|账|税契|黑账|证人)[^。；\n]*(继续|牵住|跟来|作证|跨地图|保留)/.test(text)
  const hasEscalation = /更大规模|更高门槛|更强对手|循环[^。；\n]*升级|危险度|规则复杂度|对手层级|上层|更复杂|更高层级|更强[^。；\n]*对手/.test(text)
  const hasBridge = /过渡人物|新旧地图联动|带人走|旧日关系|老角色|跟来|证人|税契|主线继续|跨地图|旧势力[^。；\n]*上级/.test(text)
  const hasRelationshipFirst = /人际关系[^。；\n]*(先|动|推动)|关系线[^。；\n]*(先动|先|触发|牵动|推动)|旧日关系[^。；\n]*(先|动|触发|牵动|带出)|旧关系[^。；\n]*(先|动|触发|牵动|带出)|(?:证人|阿洛|老角色|旧友|同门|旧部|师承)[^。；\n]*(来信|求援|作证|带路|牵线|跟来|先动)|先[^。；\n]*(收到|联系|求援|来信|作证|牵线)[^。；\n]*(主角|沈砚)[^。；\n]*(才|决定|动身|进入)|人际关系动了\s*->\s*主角再动/.test(text)
  const delivered = oldConflictSettled
    && hasNewMapFivePieces
    && hasFirstFiveExpectation
    && hasCarryOverMainline
    && hasEscalation
    && hasBridge
    && hasRelationshipFirst
    && !infodump
    && !droppedOldLines
  const checks = [oldConflictSettled, hasNewMapFivePieces, hasFirstFiveExpectation, hasCarryOverMainline, hasEscalation, hasBridge, hasRelationshipFirst, !infodump, !droppedOldLines]
  return {
    key: 'map_transition_rules',
    label: '换地图承接',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(10, checks.filter(Boolean).length * 11),
    evidence: uniqueBriefStrings([
      oldConflictSettled ? '旧地图核心冲突已阶段性解决' : '',
      hasNewMapFivePieces ? `新地图五件套可见(${fivePieceCount}/5)` : '',
      hasFirstFiveExpectation ? '前5章代入感/期待感已有目标或门槛' : '',
      hasCarryOverMainline ? '贯穿主线或旧关系承接可见' : '',
      hasEscalation ? '循环升级/更高门槛可见' : '',
      hasBridge ? '过渡人物或新旧联动可见' : '',
      hasRelationshipFirst ? '人际关系先行动，主角再动' : '',
      infodump ? '新设定一次性倒出' : '',
      droppedOldLines ? '旧角色/旧线被一刀切抛弃' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !oldConflictSettled ? '旧地图核心冲突未阶段性解决' : '',
      !hasNewMapFivePieces ? '新地图五件套不足' : '',
      !hasFirstFiveExpectation ? '前5章代入感和期待感未建立' : '',
      !hasCarryOverMainline ? '缺贯穿主线或旧关系承接' : '',
      !hasEscalation ? '缺循环升级或更高门槛' : '',
      !hasBridge ? '缺过渡人物或新旧地图联动' : '',
      !hasRelationshipFirst ? '缺人际关系先行铺垫' : '',
      infodump ? '新设定一次性全部倒出' : '',
      droppedOldLines ? '旧角色或旧线一刀切抛弃' : '',
    ], 8),
    issue: delivered ? '' : '换地图/换阶段没有完成旧地图收束、新地图五件套、前5章期待、贯穿主线、人际关系先行和循环升级的承接。',
    repair_instruction: delivered ? '' : '补换地图承接：先让旧地图核心冲突阶段性解决，再让旧关系、过渡人物、求援、来信、作证或利益牵线先动起来，推动主角进入新环境、新角色、新规则、新目标、新冲突；前5章只铺必要门槛和期待，保留贯穿主线，避免旧线全抛或新设定一次性倒完。',
  }
}

export function storyLoopPriority(missed: any[]) {
  if (missed.some(item => item.key === 'payoff')) return '优先补兑现反馈'
  if (missed.some(item => item.key === 'carry_over')) return '优先补承接期待'
  if (missed.some(item => item.key === 'map_transition_rules')) return '优先补换地图承接'
  if (missed.some(item => item.key === 'nested_loop_rules')) return '优先补循环嵌套期待'
  if (missed.some(item => item.key === 'escalation')) return '优先补升级阻碍'
  if (missed.some(item => item.key === 'setup')) return '优先补铺垫入局'
  return ''
}
