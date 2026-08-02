/** Free-text ending hook continuity: opening must surface ending_hook / last-line anchors. */

import {
  chapterTextOf,
  compactText,
  endingHookOf,
  uniqueTexts,
} from './chapter-continuity-guard-basics'

const FREE_TEXT_RAW_SOURCE_LIMIT = 1200
const FREE_TEXT_CHAPTER_TAIL_LIMIT = FREE_TEXT_RAW_SOURCE_LIMIT * 3
const NON_CURRENT_FREE_TEXT_CONTENT_CARRIER_PATTERN = /(?:消息|短信|来信|档案|记录)\s*(?:(?:里|中|内|上)|(?:(?:内容|正文|原文|条目)\s*)?(?:显示|写着|写道|记载着?|记着|提到|称|指出|说明|表明|说(?:道)?|载明|注明|标明)|(?:内容|正文|原文|条目)\s*(?:为|是)|(?:内容|正文|原文|条目)?\s*(?=[：:,，。！？!?；;“”"'‘’「」『』《》\n]|$))/u
const NON_CURRENT_FREE_TEXT_SENTENCE_PATTERN = new RegExp(
  `${NON_CURRENT_FREE_TEXT_CONTENT_CARRIER_PATTERN.source}|照片|相片|旧照|旧档案|梦里|梦中|梦境|(?:多|几|数|[一二三四五六七八九十百千万两0-9]+)年前|旧事|往事|已经是.{0,16}(?:年前|过去|往事|旧事)|成了过去`,
  'u',
)
const CURRENT_ACTION_FREE_TEXT_SENTENCE_START_PATTERN = /^\s*(醒来后|回过神来?|此刻|现在|眼下|这时)/u

function currentActionFreeTextOpening(value: any) {
  const sentences = String(value || '')
    .slice(0, 900)
    .split(/(?<=[。！？!?；;\n])/u)
  const currentSentences: string[] = []
  let nonCurrentScope = false
  for (const sentence of sentences) {
    let currentPart = sentence
    if (nonCurrentScope) {
      const transition = sentence.match(CURRENT_ACTION_FREE_TEXT_SENTENCE_START_PATTERN)
      if (!transition) continue
      currentPart = sentence.slice(transition[0].length - transition[1].length)
      nonCurrentScope = false
    }
    const marker = currentPart.match(NON_CURRENT_FREE_TEXT_SENTENCE_PATTERN)
    if (!marker) {
      currentSentences.push(currentPart)
      continue
    }
    const markerIndex = marker.index || 0
    if (markerIndex > 0) currentSentences.push(currentPart.slice(0, markerIndex))
    nonCurrentScope = true
  }
  return currentSentences.join('')
}

function compactHanText(value: any, limit: number) {
  const bounded = String(value || '').slice(0, FREE_TEXT_RAW_SOURCE_LIMIT)
  return (bounded.match(/\p{Script=Han}/gu) || [])
    .join('')
    .slice(0, Math.max(0, limit))
}

function longestSharedHanFragment(source: any, opening: any) {
  const boundedSource = compactHanText(source, 80)
  const boundedOpening = compactHanText(opening, 900)
  const maxLength = Math.min(12, boundedSource.length)
  for (let length = maxLength; length >= 3; length -= 1) {
    for (let index = 0; index + length <= boundedSource.length; index += 1) {
      const fragment = boundedSource.slice(index, index + length)
      if (boundedOpening.includes(fragment)) return fragment
    }
  }
  return ''
}

function independentSharedHanFragments(fragments: string[], opening: string) {
  const boundedOpening = compactHanText(opening, 900)
  const independent: Array<{ fragment: string; start: number; end: number }> = []
  const ranked = fragments
    .filter(fragment => fragment.length >= 3)
    .sort((left, right) => right.length - left.length)
  for (const fragment of ranked) {
    const start = boundedOpening.indexOf(fragment)
    const end = start + fragment.length
    const dependsOnSelected = independent.some(selected => {
      for (let index = 0; index + 2 <= fragment.length; index += 1) {
        if (selected.fragment.includes(fragment.slice(index, index + 2))) return true
      }
      return start >= 0 && selected.start >= 0 && start < selected.end && selected.start < end
    })
    if (!dependsOnSelected) independent.push({ fragment, start, end })
  }
  return independent.map(item => item.fragment)
}

function freeTextEventClauseHit(
  opening: string,
  sources: Array<{ value: any; tailAware?: boolean }>,
) {
  const clauses = uniqueTexts(
    sources.flatMap(source => {
      const raw = String(source?.value || '')
      const bounded = source?.tailAware
        ? raw.slice(-FREE_TEXT_RAW_SOURCE_LIMIT)
        : raw.slice(0, FREE_TEXT_RAW_SOURCE_LIMIT)
      return bounded.split(/[，,。！？!?；;：:“”"'‘’「」『』《》\n]+/u)
    }),
    40,
  )
  const fragments = independentSharedHanFragments(
    clauses.map(clause => longestSharedHanFragment(clause, opening)),
    opening,
  )
  return fragments.length >= 2 && fragments.some(fragment => fragment.length >= 4)
}

export function freeTextEndingHookHit(opening: string, previousChapter: any = {}, primary: any = {}) {
  const open = currentActionFreeTextOpening(opening)
  if (!open.trim()) return false
  const endingHook = endingHookOf(previousChapter)
  const text = chapterTextOf(previousChapter)
  const lastLines = String(text || '')
    .slice(-FREE_TEXT_CHAPTER_TAIL_LIMIT)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  const lastLine = lastLines[lastLines.length - 1] || ''
  const anchors = uniqueTexts([
    endingHook,
    primary?.evidence,
    lastLine,
    ...lastLines.slice(-3),
  ], 10).filter((item) => item && item.length >= 2)
  // Direct full/partial anchor inclusion
  for (const anchor of anchors) {
    const a = compactText(anchor, 80)
    if (!a) continue
    if (open.includes(a)) return true
    // Sliding 4-6 char distinctive fragments from short anchors (e.g. 脚步声在门外停了)
    if (a.length >= 4 && a.length <= 24) {
      for (let i = 0; i <= a.length - 4; i++) {
        const frag = a.slice(i, i + 4)
        if (/[\u4e00-\u9fff]{4}/.test(frag) && open.includes(frag)) return true
      }
    }
  }
  // Conservative event paraphrase: require two independently shared clauses, one strong.
  if (freeTextEventClauseHit(open, [
    { value: endingHook },
    { value: primary?.evidence },
    { value: lastLine, tailAware: true },
    ...lastLines.slice(-3).map(value => ({ value, tailAware: true })),
  ])) return true
  // Keyword overlap: need >=2 content words from ending hook / last line
  const source = compactText([endingHook, lastLine, primary?.evidence].filter(Boolean).join('。'), 160)
  const words = (source.match(/[\u4e00-\u9fff]{2,}/g) || []).filter((w) => !/然后|接着|于是|自己|他们|一个/.test(w))
  const hits = words.filter((w) => open.includes(w))
  const uniqueHits = [...new Set(hits)]
  return uniqueHits.length >= 2
}
