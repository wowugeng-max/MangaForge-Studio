import {
  asArray,
  compactText,
  extractPrimaryEndingHooks,
  uniqueTexts,
} from './chapter-continuity-guard-basics'

/**
 * Drop recycled early-chapter seed fragments that conflict with previous ending hooks.
 */
export function decontaminateChapterSeedFields(input: {
  chapter_goal?: any
  chapter_summary?: any
  conflict?: any
  ending_hook?: any
  must_advance?: any
  previousChapter?: any
} = {}) {
  const previous = input.previousChapter
  const primary = extractPrimaryEndingHooks(previous)
  const primaryKeys = new Set(primary.map(item => item.key))
  const stalePatterns = [
    /十点邻居敲门借火/,
    /妈妈空碗\/厨房规则压迫/,
    /江哲主动开门迎敌/,
    /反制邻居并炼化规则核心破局/,
    /厨房实体被血腥味唤醒/,
    /爸爸利爪|耳光|能好好说话/,
  ]
  const shouldStrip = (text: string) => {
    const value = compactText(text, 400)
    if (!value) return false
    if (!stalePatterns.some(pattern => pattern.test(value))) return false
    // If previous ending already moved to property/elevator/etc, strip early recycled chains.
    if (primaryKeys.has('property_enforcement') || primaryKeys.has('elevator_anomaly') || primaryKeys.has('wang_nainai_capture')) {
      return true
    }
    // If seed is almost pure early chain and previous prose no longer about kitchen open, strip.
    if (primary.length && !primaryKeys.has('neighbor_knock') && !primaryKeys.has('kitchen_entity')) return true
    return false
  }

  const cleanField = (value: any, fallback = '') => {
    const text = compactText(value, 260)
    if (!text) return compactText(fallback, 240)
    if (!shouldStrip(text)) return text
    if (primary[0]) {
      return compactText(`承接上一章进度，优先推进：${primary.map(item => item.label).join('；')}；${primary[0].evidence}`, 240)
    }
    return compactText(fallback || text, 240)
  }

  const goal = cleanField(input.chapter_goal, primary[0]?.obligation || '')
  const summary = cleanField(input.chapter_summary, goal)
  const conflict = cleanField(input.conflict, primary.map(item => item.label).join('；'))
  const ending_hook = compactText(input.ending_hook, 200)
  const must_advance = uniqueTexts([
    ...primary.map(item => item.label),
    ...asArray(input.must_advance).map(item => compactText(item, 120)).filter(item => item && !shouldStrip(item)),
  ], 8)

  return {
    chapter_goal: goal,
    chapter_summary: summary,
    conflict,
    ending_hook,
    must_advance,
    decontaminated: shouldStrip(String(input.chapter_goal || '')) || shouldStrip(String(input.chapter_summary || '')),
    primary_hooks: primary,
  }
}
