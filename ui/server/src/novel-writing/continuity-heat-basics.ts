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

function assetText(item: any) {
  if (!item) return ''
  if (typeof item === 'string') return compactBriefText(item)
  return compactBriefText(item.name || item.title || item.summary || item.description || item.entity_type || item.type)
}

function normalizeMemoryTextItem(value: any) {
  if (typeof value === 'string') return compactBriefText(value)
  if (!value || typeof value !== 'object') return ''
  const name = compactBriefText(value.name || value.title || value.key)
  const state = compactBriefText(value.state || value.current_state || value.currentState || value.summary || value.description || value.text)
  const chapterNo = Number(value.chapter_no || value.chapterNo || value.last_updated_chapter || value.lastUpdatedChapter || 0)
  const chapterLabel = chapterNo ? `@第${chapterNo}章` : ''
  return compactBriefText([name, state].filter(Boolean).join('：') + chapterLabel)
}

export function continuityHeatItemText(value: any) {
  if (typeof value === 'string') return compactBriefText(value)
  if (!value || typeof value !== 'object') return ''
  return compactBriefText(
    normalizeMemoryTextItem(value)
    || value.text
    || value.summary
    || value.name
    || value.title
    || value.label
    || value.key,
  )
}

export function continuityHeatArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => continuityHeatItemText(item) || assetText(item) || compactBriefText(item)).filter(Boolean), 24)
}

export function continuityHeatAnchorScore(values: string[], chapterText: string, threshold = 22) {
  const checked = values.map(text => {
    const match = anchorMatchScore(text, chapterText)
    return {
      text,
      score: match.score,
      evidence: match.matched,
      delivered: match.score >= threshold,
    }
  })
  return {
    checked,
    missed: checked.filter(item => !item.delivered),
    score: checked.length ? Math.round(checked.reduce((sum, item) => sum + Number(item.score || 0), 0) / checked.length) : 82,
    evidence: checked.flatMap(item => item.evidence).filter(Boolean).slice(0, 8),
  }
}

export function normalizeContinuityHeatStateCheck(values: any[], chapterText: string) {
  const planned = continuityHeatArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasHot = /hot|热|门外水声|继续施压|当场压力|倒计时|十息|逼[^。！？!?]{0,20}(开门|换路|行动)/i.test(text)
  const hasWarm = /warm|温|旧钥匙缺口|触达|卡住|线索往前推|没有消失/i.test(text)
  const hasCold = /cold|冷|镜中脚印|湿鞋印|升温|没有立刻揭开|先把这条冷线/i.test(text)
  const hasArchived = /archived|休眠|夜巡司令牌|始终躺|没有突然|不得误激活/i.test(text)
  const deferral = /暂时不重要|以后再说|本章只是过渡|不必处理|没有必要处理/.test(text)
  const delivered = !deferral && [hasHot, hasWarm, hasCold, hasArchived].filter(Boolean).length >= 3
  return {
    key: 'heat_states',
    label: '热度状态',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : (deferral ? 18 : 52),
    evidence: uniqueBriefStrings([
      hasHot ? 'hot 推进可见' : '',
      hasWarm ? 'warm 触达可见' : '',
      hasCold ? 'cold 升温可见' : '',
      hasArchived ? 'archived/休眠边界可见' : '',
      deferral ? '热度处理被推迟' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : 'hot/warm/cold/archived 热度状态没有被区分处理，或被正文推迟成“以后再说”。',
    repair_instruction: delivered ? '' : '补热度状态：hot 必须推进，warm 必须触达，cold 回收前先升温，archived 不得误激活。',
  }
}

export function normalizeContinuityActiveExpectationCheck(values: any[], chapterText: string) {
  const planned = continuityHeatArray(values)
  if (!planned.length) return null
  const anchor = continuityHeatAnchorScore(planned, chapterText, 20)
  const text = String(chapterText || '')
  const hasPressure = /门外水声|继续施压|十息|倒计时|逼[^。！？!?]{0,24}(开门|换路|行动|进入|放弃)|被迫/.test(text)
  const dropped = /门外水声暂时不重要|以后再说|换了话题|不重要/.test(text)
  const delivered = !dropped && (anchor.missed.length === 0 || hasPressure)
  return {
    key: 'active_expectations',
    label: '活跃期待',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, anchor.score) : Math.min(anchor.score, dropped ? 16 : 50),
    evidence: uniqueBriefStrings([...anchor.evidence, hasPressure ? '活跃期待转成当场压力/行动' : '', dropped ? '活跃期待被丢开' : ''], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : anchor.missed.map(item => item.text),
    issue: delivered ? '' : '活跃期待没有继续施压，也没有转成本章行动或选择。',
    repair_instruction: delivered ? '' : '补活跃期待：把 hot 问题写成当场压力、行动门槛、选择代价或新目标。',
  }
}

export function normalizeContinuityWatchItemsCheck(values: any[], chapterText: string) {
  const planned = continuityHeatArray(values)
  if (!planned.length) return null
  const anchor = continuityHeatAnchorScore(planned, chapterText, 18)
  const text = String(chapterText || '')
  const hasKey = /旧钥匙缺口|缺口|旧钥匙/.test(text)
  const hasFootprint = /镜中脚印|湿鞋印|脚印|玻璃/.test(text)
  const hasRelation = /室友|互信|替李辰|争来三息|关系/.test(text)
  const deferred = /旧钥匙缺口、镜中脚印和室友关系以后再说|以后再说|暂且不提|后面再讲/.test(text)
  const delivered = !deferred && (anchor.missed.length === 0 || [hasKey, hasFootprint, hasRelation].filter(Boolean).length >= Math.min(2, planned.length))
  return {
    key: 'watch_items',
    label: '关注项',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, anchor.score) : Math.min(anchor.score, deferred ? 18 : 48),
    evidence: uniqueBriefStrings([...anchor.evidence, hasKey ? '旧钥匙/缺口触达' : '', hasFootprint ? '脚印线升温' : '', hasRelation ? '关系线触达' : '', deferred ? '关注项被推迟' : ''], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : anchor.missed.map(item => item.text),
    issue: delivered ? '' : '关注项、开放问题、待回收伏笔或关系线没有获得推进、触达、升温或明确休眠理由。',
    repair_instruction: delivered ? '' : '补关注项：每个 watch item 至少推进、触达、升温或明确休眠，不能只点名后推迟。',
  }
}

export function normalizeContinuityDormantBoundaryCheck(values: any[], chapterText: string) {
  const planned = continuityHeatArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const negatedActivation = /没有突然[^。！？!?]{0,20}解决|不能突然[^。！？!?]{0,20}解决|不得误激活|不能使用|不能解决/.test(text)
  const forbiddenActivated = !negatedActivation && /忽然掏出[^。！？!?]{0,20}夜巡司令牌|夜巡司令牌[^。！？!?]{0,30}(亮了|解决|水声立刻消失|消失)|令牌[^。！？!?]{0,20}解决/.test(text)
  const hasBoundary = /夜巡司令牌[^。！？!?]{0,30}(始终躺|不能使用|没有突然|不得误激活|不能解决)|休眠|抽屉/.test(text)
  const match = anchorMatchScore(planned.join('；'), chapterText)
  const delivered = !forbiddenActivated && (hasBoundary || match.score >= 20)
  return {
    key: 'dormant_allowed',
    label: '休眠边界',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, match.score) : Math.min(match.score, forbiddenActivated ? 12 : 48),
    evidence: uniqueBriefStrings([...match.matched, hasBoundary ? '休眠/禁激活边界可见' : '', forbiddenActivated ? '休眠物被误激活' : ''], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '允许休眠或归档的元素被误激活，或缺少为什么暂不处理的正文理由。',
    repair_instruction: delivered ? '' : '补休眠边界：明确哪些元素暂不处理，并让它们不能突然解决当前危机。',
  }
}

export function buildContinuityHeatDeterministicCheck(chapterText: string) {
  const text = String(chapterText || '')
  const negatedActivation = /没有突然[^。！？!?]{0,20}解决|不能突然[^。！？!?]{0,20}解决|不得误激活|不能使用|不能解决/.test(text)
  const risks = [
    /暂时不重要|以后再说|本章只是过渡|没有必要处理/.test(text) ? {
      key: 'heat_deferral',
      label: '热度推迟',
      evidence: '正文把活跃期待、伏笔或关系线推迟处理。',
      fix: '把 hot/warm/cold 元素转成当场压力、触达、升温或明确休眠理由。',
    } : null,
    /大家讨论了一会儿就换了话题|事情就解决了/.test(text) ? {
      key: 'empty_callback',
      label: '空回调',
      evidence: '正文用讨论/总结替代伏笔推进或回收。',
      fix: '让伏笔通过行动、限制、证据、误判或章尾问题产生变化。',
    } : null,
    !negatedActivation && /忽然掏出[^。！？!?]{0,20}夜巡司令牌|夜巡司令牌[^。！？!?]{0,30}(亮了|解决|水声立刻消失|消失)|令牌[^。！？!?]{0,20}解决/.test(text) ? {
      key: 'archived_element_reactivated',
      label: '休眠误激活',
      evidence: '休眠/归档元素突然激活并解决当前危机。',
      fix: '恢复休眠边界；如果必须使用，先升温并付出代价，不能直接解题。',
    } : null,
    /伏笔[^。！？!?]{0,20}(以后再说|不处理|没必要)/.test(text) ? {
      key: 'foreshadowing_named_not_used',
      label: '伏笔只点名',
      evidence: '正文把伏笔当写作术语点名，没有转成故事内证据或压力。',
      fix: '把“伏笔”改成角色可感知的物件、线索、反应或未解问题。',
    } : null,
  ].filter(Boolean)
  if (!risks.length) return null
  return {
    key: 'continuity_heat_forbidden',
    label: '连续性热度硬伤',
    text: '连续性热度不得把 hot/warm/cold 元素推迟成以后再说，不得让 archived 元素突然解题，不得只点名伏笔。',
    expected: '连续性热度不得把 hot/warm/cold 元素推迟成以后再说，不得让 archived 元素突然解题，不得只点名伏笔。',
    score: Math.max(0, 100 - risks.length * 24),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项连续性热度确定性风险。`,
    repair_instruction: '按 oh-story 连续性热度修复：hot 推进、warm 触达、cold 升温、archived 不误激活，避免空 callback。',
  }
}

export function continuityHeatPriority(missed: any[]) {
  if (missed.some(item => item.key === 'continuity_heat_forbidden')) return '优先清热度硬伤'
  if (missed.some(item => item.key === 'active_expectations')) return '优先推进 hot 期待'
  if (missed.some(item => item.key === 'dormant_allowed')) return '优先修休眠边界'
  if (missed.some(item => item.key === 'watch_items')) return '优先触达关注项'
  if (missed.some(item => item.key === 'heat_states')) return '优先补热度分层'
  return ''
}
