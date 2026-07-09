import { emotionalArcArray } from './emotional-arc-basics'

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

export function payoffEscalationDimensionEvidence(chapterText: string) {
  const text = String(chapterText || '')
  const impact = /影响范围|个人|群体|全场|全校|全网|社会|宗门|审判庭|公开|扩散|长老|权威|官方|行业/.test(text)
  const depth = /揭示深度|表象|本质|颠覆|黑幕|根源|背后|真相|规则|改写|推翻/.test(text)
  const status = /身份落差|身份|路人|大佬|权威|马甲|掉马|全场震惊|改口|承认|跪|低头/.test(text)
  return [
    impact ? '影响范围递增' : '',
    depth ? '揭示深度递增' : '',
    status ? '身份落差递增' : '',
  ].filter(Boolean)
}

export function normalizePayoffReverseDesignCheck(contract: any, chapterText: string) {
  const reverse = contract.payoff_reverse_design || contract.payoffReverseDesign
  if (!reverse || typeof reverse !== 'object') return null
  const text = String(chapterText || '')
  const payoffPattern = /爽点类型|目标达成|态度转变|收获盘点|能力碾压|隐藏身份|掉马|情感圆满|反证|反击|反制|洗清|改口|态度转变|获得|奖励|收获|证明|翻盘/
  const expectationPattern = /期待点|拉起期待|读者[^。；\n]*(等|期待|想知道)|等待|悬念|信息差|门槛|误判|将满未满|压迫|承压|逼|认罪|压罪|能不能|会不会/
  const setupPattern = /铺垫|先铺|前置|伏笔|底牌|后手|旧印章|账册|证据|袖口|物件|规则漏洞|关系|轻视|嘲笑|误判|公开审判/
  const explicitReverse = /爽点倒推|先[^。；\n]*(爽点类型|让读者满足)[^。；\n]*再[^。；\n]*(期待|期待点)[^。；\n]*最后[^。；\n]*(铺垫|倒推)|爽点类型\s*->\s*期待点\s*->\s*铺垫/.test(text)
  const payoffMatch = text.match(payoffPattern)
  const expectationMatch = text.match(expectationPattern)
  const setupMatch = text.match(setupPattern)
  const payoffIndex = payoffMatch?.index ?? -1
  const expectationIndex = expectationMatch?.index ?? -1
  const setupIndex = setupMatch?.index ?? -1
  const hasPayoffType = payoffIndex >= 0
  const hasExpectationPoint = expectationIndex >= 0
  const hasSetup = setupIndex >= 0
  const hasReverseChain = explicitReverse
    || (hasSetup && hasExpectationPoint && hasPayoffType && setupIndex <= payoffIndex && expectationIndex <= payoffIndex)
  const delivered = hasPayoffType && hasExpectationPoint && hasSetup && hasReverseChain
  const planned = uniqueBriefStrings([
    ...asArray(reverse.design_order || reverse.designOrder),
    ...asArray(reverse.expectation_point_rules || reverse.expectationPointRules),
    ...asArray(reverse.setup_rules || reverse.setupRules),
    ...asArray(reverse.quality_checks || reverse.qualityChecks),
  ].map((item: any) => compactBriefText(item)).filter(Boolean), 12)
  return {
    key: 'payoff_reverse_design',
    label: '爽点倒推法',
    text: planned.join('；') || '先定爽点类型 -> 再定期待点 -> 最后倒推铺垫。',
    expected: planned.join('；') || '先定爽点类型 -> 再定期待点 -> 最后倒推铺垫。',
    score: delivered ? 88 : Math.max(12, [hasPayoffType, hasExpectationPoint, hasSetup, hasReverseChain].filter(Boolean).length * 22),
    evidence: uniqueBriefStrings([
      hasPayoffType ? '爽点类型/释放结果可见' : '',
      hasExpectationPoint ? '期待点/压力拉起可见' : '',
      hasSetup ? '铺垫物件/证据/规则/关系可见' : '',
      hasReverseChain ? '铺垫 -> 期待升高 -> 爽点释放链条可见' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasPayoffType ? '缺先定爽点类型' : '',
      !hasExpectationPoint ? '缺期待点设计' : '',
      !hasSetup ? '缺铺垫倒推' : '',
      !hasReverseChain ? '缺铺垫 -> 期待升高 -> 爽点释放链条' : '',
    ], 8),
    issue: delivered ? '' : '正文没有体现 oh-story 爽点倒推法：需要先明确爽点类型，再设计期待点，最后让铺垫反向服务释放。',
    repair_instruction: delivered ? '' : '按 oh-story 爽点倒推法修复：先确定读者满足方式（能力碾压/目标达成/收获盘点/态度转变/隐藏身份/情感圆满度），再拉起对应期待点，最后补能在释放时回收的物件、证据、关系、规则漏洞或对手误判铺垫。',
  }
}

export function normalizePayoffTierRulesCheck(contract: any, chapterText: string) {
  const planned = emotionalArcArray(contract.payoff_tier_rules, contract.payoffTierRules)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasDailySmallPayoff = /日常小装逼|日常(?:生活)?展示优势|维持读者耐心|随手(?:展示|露一手)|小回报|小爽点|只用一句|轻描淡写/.test(text)
  const hasCoreMainlinePayoff = /核心爽点|主线目标|围绕主线|切在主线|推进主线|服务主线|反证旧账|旧账主线|拿回(?:审判)?资格|破解(?:规则|案件)|洗清|证明|目标达成|主线[^。；\n]*(反证|推进|破解|拿回|改写|完成)/.test(text)
  const offTrackPayoffSignal = /偏离爽点|背离主线|离开主线|和[^。；\n]*主线无关|无关[^。；\n]*装逼|去别处装逼|酒楼[^。；\n]*打脸|路人[^。；\n]*打脸|随手打脸路人|支线[^。；\n]*(装逼|打脸)[^。；\n]*(无关|不影响)|跑去[^。；\n]*(打脸|装逼)/.test(text)
  const offTrackPayoffNegated = /(?:没有|不|避免|删掉|删除|改写|改成)[^。；\n]{0,18}(?:偏离爽点|背离主线|离开主线|去别处装逼|偏离主线)/.test(text)
  const hasOffTrackPayoff = offTrackPayoffSignal && !offTrackPayoffNegated
  const hasEffectiveCoreMainlinePayoff = hasCoreMainlinePayoff && !hasOffTrackPayoff
  const delivered = hasEffectiveCoreMainlinePayoff && !hasOffTrackPayoff
  return {
    key: 'payoff_tier_rules',
    label: '装逼层级',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(12, [hasDailySmallPayoff, hasEffectiveCoreMainlinePayoff, !hasOffTrackPayoff].filter(Boolean).length * 28),
    evidence: uniqueBriefStrings([
      hasDailySmallPayoff ? '日常小装逼控制篇幅/维持耐心' : '',
      hasEffectiveCoreMainlinePayoff ? '核心爽点服务主线目标' : '',
      hasOffTrackPayoff ? '出现偏离主线的装逼/打脸' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasEffectiveCoreMainlinePayoff ? '缺核心爽点服务主线目标' : '',
      hasOffTrackPayoff ? '偏离爽点背离主线' : '',
    ], 8),
    issue: delivered ? '' : '正文没有按 oh-story 装逼层级管理爽点：核心爽点必须切在主线目标，偏离主线的爽点要删或改成主线推进。',
    repair_instruction: delivered ? '' : '按 oh-story 装逼层级修复：日常小装逼只用于大爽点间隙维持耐心；核心爽点必须围绕主线目标推进；删除或改写背离主线去别处装逼的桥段，让每次打脸、反证、能力展示都改变主线目标、关系、资源、规则或下一步行动。',
  }
}
