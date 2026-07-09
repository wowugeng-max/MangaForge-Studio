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

function assetText(item: any) {
  if (!item) return ''
  if (typeof item === 'string') return compactBriefText(item)
  return compactBriefText(item.name || item.title || item.summary || item.description || item.entity_type || item.type)
}

function assetLinkageArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => assetText(item) || compactBriefText(item)).filter(Boolean), 24)
}

export function normalizeAssetLinkageFunctionChainCheck(values: any[], chapterText: string) {
  const planned = assetLinkageArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasFunction = /打开|撬开|触发|证明|证据|制造阻碍|逼出|改变|兑现|卡进|锁死|留下|指向/.test(text)
  const hasOwnershipOrSource = /归属|私藏|见证|来源|谁拿|从[^。！？!?]{0,20}变成|交给|带走|失去|获得/.test(text)
  const hasTriggerOrLimit = /触发|条件|限制|不能|若|如果|一瞬间|规则|封条|代价|锁死|红印/.test(text)
  const hasConsequence = /代价|后果|旁观者|站位|局势|改了|露出|打开|指向|下一次|章尾/.test(text)
  const isolated = /没有人真的使用|只被反复提起|只被点名|顺便介绍|复杂来历|一整套设定/.test(text)
  const delivered = !isolated && [hasFunction, hasOwnershipOrSource, hasTriggerOrLimit, hasConsequence].filter(Boolean).length >= 3
  return {
    key: 'function_chain',
    label: '功能链',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(16, [hasFunction, hasOwnershipOrSource, hasTriggerOrLimit, hasConsequence].filter(Boolean).length * 22),
    evidence: [hasFunction ? '功能/使用' : '', hasOwnershipOrSource ? '归属/来源' : '', hasTriggerOrLimit ? '触发/限制' : '', hasConsequence ? '后果/回报' : '', isolated ? '只点名未使用' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '关键资产缺少功能、归属、触发条件、限制或后果，不能作为可信破局答案。',
    repair_instruction: delivered ? '' : '补资产功能链：写清它能做什么、归谁、怎样触发、有什么限制、用了会带来什么后果。',
  }
}

export function normalizeAssetLinkageStateChangeCheck(values: any[], chapterText: string) {
  const planned = assetLinkageArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasStateChange = /从[^。！？!?]{0,40}变成|归属|私藏变成|红印|裂开|缺口|露出|留下|锁死|可见|被触发|暗格被撬开/.test(text)
  const repeatedOnly = /反复提起|一直很重要|仍然只是|没有变化|事情就解决了/.test(text)
  return {
    key: 'state_tracking',
    label: '状态变化',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: hasStateChange && !repeatedOnly ? 86 : 22,
    evidence: [hasStateChange ? '状态/归属/可见性变化' : '', repeatedOnly ? '只重复点名' : ''].filter(Boolean),
    delivered: hasStateChange && !repeatedOnly,
    status: hasStateChange && !repeatedOnly ? 'ok' : 'warn',
    missed_items: hasStateChange && !repeatedOnly ? [] : planned,
    issue: hasStateChange && !repeatedOnly ? '' : '资产没有产生归属、可见性、限制、风险或意义变化。',
    repair_instruction: hasStateChange && !repeatedOnly ? '' : '补资产状态变化：让资产从开场到结尾至少改变一次归属、意义、可见性、触发状态、风险或限制。',
  }
}

export function normalizeAssetLinkageInformationCheck(values: any[], chapterText: string) {
  const planned = assetLinkageArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasConflictRelease = /逼问|抢封|冲突|对话|按上去|触发|当堂|长老席|阻碍|选择|行动压力|继续逼问/.test(text)
  const hasActionRelease = /滑到掌心|撞上|卡进|撬开|按上去|放到|递给|亮出|露出|锁死/.test(text)
  const infodump = /复杂来历|一整套设定|顺便介绍|有很多年历史|规则非常复杂|完整解释|大家终于明白规则/.test(text)
  const delivered = !infodump && (hasConflictRelease || hasActionRelease)
  return {
    key: 'information_through_conflict',
    label: '信息随冲突',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : Math.max(18, [!infodump, hasConflictRelease, hasActionRelease].filter(Boolean).length * 28),
    evidence: delivered ? [hasConflictRelease ? '冲突释放信息' : '', hasActionRelease ? '行动释放信息' : ''].filter(Boolean) : (infodump ? ['设定说明'] : []),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '资产信息没有跟着冲突、选择、阻碍、对话压力或动作释放，存在设定说明书风险。',
    repair_instruction: delivered ? '' : '把资产设定拆进现场冲突：让角色使用、质疑、触发、误判或付出代价，不要整段解释来历和规则。',
  }
}

export function assetLinkagePriority(missed: any[]) {
  if (missed.some(item => item.key === 'relationship_graph_risks')) return '优先处理关系图风险'
  if (missed.some(item => item.key === 'asset_linkage_forbidden')) return '优先清资产硬伤'
  if (missed.some(item => item.key === 'isolated_assets')) return '优先消灭孤立资产'
  if (missed.some(item => item.key === 'function_chain')) return '优先补资产功能链'
  if (missed.some(item => item.key === 'state_tracking')) return '优先补状态变化'
  if (missed.some(item => item.key === 'information_through_conflict')) return '优先把设定塞进冲突'
  if (missed.some(item => item.key === 'three_appearance_plan')) return '优先补三次出现'
  return ''
}
