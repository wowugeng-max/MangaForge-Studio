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

export function expectationThresholdArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => Array.isArray(value) ? value : value ? [value] : []).map((item: any) => compactBriefText(item)).filter(Boolean), 20)
}

export function normalizeExpectationThresholdCheck(key: string, label: string, values: any[], chapterText: string, fix: string, threshold = 32) {
  const planned = expectationThresholdArray(values)
  if (!planned.length) return null
  const checked = planned.map(text => {
    const match = anchorMatchScore(text, chapterText)
    return {
      text,
      score: match.score,
      evidence: match.matched,
      delivered: match.score >= threshold,
    }
  })
  const missed = checked.filter(item => !item.delivered)
  return {
    key,
    label,
    text: planned.join('；'),
    expected: planned.join('；'),
    score: Math.round(checked.reduce((sum, item) => sum + Number(item.score || 0), 0) / Math.max(1, checked.length)),
    evidence: checked.flatMap(item => item.evidence).filter(Boolean).slice(0, 8),
    delivered: missed.length === 0,
    status: missed.length === 0 ? 'ok' : 'warn',
    missed_items: missed.map(item => item.text),
    issue: missed.length === 0 ? '' : `${label}未充分落地：${missed.map(item => item.text).join('；')}`,
    repair_instruction: missed.length === 0 ? '' : fix,
  }
}

type ExpectationThresholdScanners = {
  scanExpectationVacuumRisks?: (text: string) => any[]
}

export function buildExpectationThresholdNextOpenLoopCheck(contract: any, chapterText: string, scanners: ExpectationThresholdScanners = {}) {
  const planned = expectationThresholdArray(
    contract.nested_units,
    contract.nestedUnits,
    contract.next_open_loop,
    contract.nextOpenLoop,
    contract.vacuum_guardrails,
    contract.vacuumGuardrails,
  )
  const anchorCheck = normalizeExpectationThresholdCheck(
    'next_open_loop',
    '下一开环',
    planned,
    chapterText,
    '闭环当前目标前后必须立起下一目标、新门槛、新线索、新困境或新期待。',
    28,
  )
  const vacuumRisks = asArray(scanners.scanExpectationVacuumRisks?.(chapterText))
  if (!anchorCheck && !vacuumRisks.length) return null
  if (!vacuumRisks.length) return anchorCheck
  const base = anchorCheck || {
    key: 'next_open_loop',
    label: '下一开环',
    text: '闭环当前目标前后必须立起下一目标、新门槛、新线索、新困境或新期待。',
    expected: '闭环当前目标前后必须立起下一目标、新门槛、新线索、新困境或新期待。',
    evidence: [],
    missed_items: [],
    issue: '',
    repair_instruction: '',
  }
  return {
    ...base,
    score: Math.min(Number(base.score || 100), Math.max(0, 100 - vacuumRisks.length * 35)),
    delivered: false,
    status: 'warn',
    evidence: [...asArray(base.evidence), ...vacuumRisks.map((item: any) => compactBriefText(item.evidence))].filter(Boolean).slice(0, 8),
    missed_items: [...asArray(base.missed_items), ...vacuumRisks.map((item: any) => compactBriefText(item.evidence))].filter(Boolean).slice(0, 8),
    issue: '章尾闭合当前麻烦但缺少下一开环。',
    repair_instruction: '闭环当前目标前后必须立起下一目标、新门槛、新线索、新困境或新期待。',
  }
}

export function buildExpectationBeforePayoffCheck(contract: any, chapterText: string) {
  const planned = expectationThresholdArray(
    contract.expectation_before_payoff_rules,
    contract.expectationBeforePayoffRules,
  )
  if (!planned.length) return null
  const text = String(chapterText || '')
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const tensionSignals = [
    /期待感\s*(?:>|大于|高于)\s*爽点|铺垫[^。！？!?]{0,24}(?:不少于|多于|长于|拉长)|延迟满足|将满未满|满足而未满足/.test(text) ? '期待感大于爽点' : '',
    /先[^。！？!?]{0,24}(?:铺垫|拉长|加压|设门槛|吊起|种下)[^。！？!?]{0,48}(?:再|才|最后)[^。！？!?]{0,24}(?:兑现|释放|爽点|反证|打脸)/.test(text) ? '先铺垫再释放' : '',
    /释放前一刻|爽点到来前|需求最大|张力最高|没有立刻兑现/.test(text) ? '释放前张力可见' : '',
  ].filter(Boolean)
  const rushed = /没有期待铺垫|缺少期待铺垫|爽点立刻释放|没铺垫就兑现|没有铺垫就兑现|马上兑现|读者还没开始等|提前泄气|铺垫不足/.test(text)
  const deliveredItems = scored.filter(item => item.match.score >= 28).length
  const delivered = !rushed && (deliveredItems >= 1 || tensionSignals.length >= 2)
  return {
    key: 'expectation_before_payoff',
    label: '期待大于爽点',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(86, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.max(18, tensionSignals.length * 24),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      ...tensionSignals,
      rushed ? '爽点立刻释放/期待铺垫不足' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 28).slice(0, 8),
    issue: delivered ? '' : '期待铺垫不足：爽点释放太快，读者需求还没有被拉到最高点。',
    repair_instruction: delivered ? '' : '按 oh-story 期待感 > 爽点修复：铺垫期待远比展现爽点重要；爽点前必须先用危机、门槛、信息差、延迟满足或将满未满的动作拉长需求，铺垫篇幅不少于释放篇幅，不要提前泄气。',
  }
}

export function expectationThresholdPriority(missed: any[]) {
  if (missed.some(item => item.key === 'three_expectation_lines')) return '优先补三种期待线'
  if (missed.some(item => item.key === 'expectation_before_payoff')) return '优先补期待铺垫'
  if (missed.some(item => item.key === 'next_open_loop')) return '优先补下一开环'
  if (missed.some(item => item.key === 'two_long_one_short')) return '优先补两长一短'
  if (missed.some(item => item.key === 'thresholds')) return '优先拆门槛'
  if (missed.some(item => item.key === 'dynamic_thresholds')) return '优先补动态加码'
  return ''
}

export function expectationThreeLinesArray(value: any) {
  const raw = value || {}
  if (Array.isArray(raw)) return expectationThresholdArray(raw)
  return uniqueBriefStrings([
    raw.plot_expectation,
    raw.plotExpectation,
    raw.story_expectation,
    raw.storyExpectation,
    raw.theme_payoff,
    raw.themePayoff,
    raw.theme_sweetener,
    raw.themeSweetener,
    raw.freshness_hook,
    raw.freshnessHook,
    raw.novelty_hook,
    raw.noveltyHook,
  ].map((item: any) => compactBriefText(item)).filter(Boolean), 8)
}
