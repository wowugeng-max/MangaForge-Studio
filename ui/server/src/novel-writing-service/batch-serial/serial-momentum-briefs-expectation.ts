import { asArray } from '../../routes/novel-route-utils'
import { firstCompactText } from '../../novel-writing/story-drive-basics'
import { normalizedMatchText } from '../../novel-writing/text-matching'
import { compactBriefText, uniqueBriefStrings } from '../quality/text-utils'
import { reviewTimestamp } from '../quality/review-lookup'
import { inferEndingHookType } from './ending-hook-type'

export function normalizeExpectationItem(value: any, fallback: { key: string; label: string; type: string }) {
  const text = compactBriefText(typeof value === 'string' ? value : value?.text || value?.summary || value?.description || value?.name || value?.title)
  if (!text) return null
  return {
    key: compactBriefText(typeof value === 'object' ? value?.key : '', fallback.key),
    label: compactBriefText(typeof value === 'object' ? value?.label : '', fallback.label),
    type: compactBriefText(typeof value === 'object' ? value?.type : '', fallback.type),
    text,
  }
}

export function uniqueExpectationItems(items: any[]) {
  const seen = new Set<string>()
  const rows: any[] = []
  for (const item of items) {
    if (!item?.text) continue
    const key = `${item.type || 'expectation'}:${normalizedMatchText(item.text)}`
    if (!key || seen.has(key)) continue
    seen.add(key)
    rows.push(item)
  }
  return rows
}

function normalizeDebtExpectationItem(value: any, fallback: { key: string; label: string; type: string }, extra: any = {}) {
  const normalized = normalizeExpectationItem(value, fallback)
  if (!normalized) return null
  const raw = typeof value === 'object' && value ? value : {}
  return {
    ...extra,
    age_chapters: Number(raw.age_chapters ?? raw.ageChapters ?? extra.age_chapters ?? 0) || null,
    overdue: Boolean(raw.overdue ?? extra.overdue ?? false),
    urgency: compactBriefText(raw.urgency || extra.urgency),
    ...normalized,
  }
}

const EXPECTATION_MUST_CARRY_OVERDUE_AFTER_CHAPTERS = 2
const EXPECTATION_KEEP_ALIVE_OVERDUE_AFTER_CHAPTERS = 4

export function applyReaderExpectationDebtAging(context: any, currentChapterNo: number) {
  const chapterNo = Number(currentChapterNo || 0)
  const decorate = (item: any, kind: 'must_carry' | 'keep_alive') => {
    const fromChapterNo = Number(item?.from_chapter_no || item?.fromChapterNo || 0) || null
    const explicitAge = Number(item?.age_chapters ?? item?.ageChapters ?? 0) || null
    const age = chapterNo && fromChapterNo ? Math.max(0, chapterNo - fromChapterNo) : explicitAge
    const overdueAfter = kind === 'keep_alive'
      ? EXPECTATION_KEEP_ALIVE_OVERDUE_AFTER_CHAPTERS
      : EXPECTATION_MUST_CARRY_OVERDUE_AFTER_CHAPTERS
    const overdue = Boolean(item?.overdue) || (age !== null && age >= overdueAfter)
    return {
      ...item,
      from_chapter_no: fromChapterNo,
      age_chapters: age,
      overdue,
      urgency: overdue ? 'overdue' : age !== null && age > 0 ? 'due' : compactBriefText(item?.urgency),
    }
  }
  const mustCarry = uniqueExpectationItems(asArray(context?.must_carry).map((item: any) => decorate(item, 'must_carry')))
  const keepAlive = uniqueExpectationItems(asArray(context?.keep_alive).map((item: any) => decorate(item, 'keep_alive')))
  const overdue = uniqueExpectationItems([
    ...asArray(context?.overdue),
    ...mustCarry.filter((item: any) => item.overdue),
    ...keepAlive.filter((item: any) => item.overdue),
  ]).slice(0, 12)
  const sourceChapters = Array.from(new Set([
    ...mustCarry.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
    ...keepAlive.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
  ])).sort((a, b) => a - b)
  const summary = [
    mustCarry.length ? `待兑现 ${mustCarry.length} 项` : '',
    keepAlive.length ? `继续悬念 ${keepAlive.length} 项` : '',
    overdue.length ? `逾期 ${overdue.length} 项` : '',
  ].filter(Boolean).join('，')
  return {
    ...(context || {}),
    must_carry: mustCarry.slice(0, 12),
    keep_alive: keepAlive.slice(0, 12),
    overdue,
    overdue_count: overdue.length,
    source_chapters: sourceChapters.slice(-8),
    summary: compactBriefText(summary || context?.summary || ''),
  }
}

export function normalizeReaderExpectationDebtContext(value: any) {
  const raw = value || {}
  const mustCarry = uniqueExpectationItems(asArray(raw.must_carry || raw.mustCarry || raw.carry_over || raw.carryOver)
    .map((item: any, index: number) => normalizeDebtExpectationItem(item, { key: `carry_over_${index + 1}`, label: '期待债务', type: 'carry_over' }, {
      from_chapter_no: Number(item?.from_chapter_no || item?.fromChapterNo || 0) || null,
      source_review_id: item?.source_review_id || item?.sourceReviewId || null,
    }))
    .filter(Boolean))
  const keepAlive = uniqueExpectationItems(asArray(raw.keep_alive || raw.keepAlive)
    .map((item: any, index: number) => normalizeDebtExpectationItem(item, { key: `debt_keep_alive_${index + 1}`, label: '继续悬念', type: 'question' }, {
      from_chapter_no: Number(item?.from_chapter_no || item?.fromChapterNo || 0) || null,
      source_review_id: item?.source_review_id || item?.sourceReviewId || null,
    }))
    .filter(Boolean))
  const overdue = uniqueExpectationItems(asArray(raw.overdue || raw.overdue_items || raw.overdueItems)
    .map((item: any, index: number) => normalizeDebtExpectationItem(item, { key: `overdue_${index + 1}`, label: '逾期待补', type: 'overdue' }, {
      from_chapter_no: Number(item?.from_chapter_no || item?.fromChapterNo || 0) || null,
      source_review_id: item?.source_review_id || item?.sourceReviewId || null,
      overdue: true,
      urgency: 'overdue',
    }))
    .filter(Boolean))
  const sourceChapters = Array.from(new Set([
    ...mustCarry.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
    ...keepAlive.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
    ...overdue.map((item: any) => Number(item.from_chapter_no || 0)).filter(Boolean),
  ])).sort((a, b) => a - b)
  return {
    must_carry: mustCarry.slice(0, 12),
    keep_alive: keepAlive.slice(0, 12),
    overdue: overdue.slice(0, 12),
    overdue_count: Number(raw.overdue_count ?? raw.overdueCount ?? overdue.length) || overdue.length,
    source_chapters: sourceChapters.slice(-8),
    summary: compactBriefText(raw.summary || [
      mustCarry.length ? `待兑现 ${mustCarry.length} 项` : '',
      keepAlive.length ? `继续悬念 ${keepAlive.length} 项` : '',
      overdue.length ? `逾期 ${overdue.length} 项` : '',
    ].filter(Boolean).join('，')),
  }
}

export function normalizeReaderExpectationLedgerContract(explicit: any, target: any = {}, brief: any = {}, debtContext: any = {}) {
  if (!explicit || typeof explicit !== 'object') return null
  const carryOver = uniqueExpectationItems([
    ...asArray(explicit.carry_over || explicit.carryOver).map((item: any, index: number) => normalizeExpectationItem(item, { key: `carry_over_${index + 1}`, label: '期待债务', type: 'carry_over' })),
    ...asArray(debtContext?.must_carry),
  ].filter(Boolean))
  return {
    chapter_promise: compactBriefText(explicit.chapter_promise || explicit.chapterPromise || target.reader_promise || target.readerPromise || brief.reader_promise || brief.readerPromise),
    carry_over: carryOver,
    must_deliver: uniqueExpectationItems([
      ...carryOver,
      ...asArray(explicit.must_deliver || explicit.mustDeliver).map((item: any, index: number) => normalizeExpectationItem(item, { key: `expectation_${index + 1}`, label: '读者期待', type: 'expectation' })),
    ].filter(Boolean)),
    keep_alive: uniqueExpectationItems([
      ...asArray(debtContext?.keep_alive),
      ...asArray(explicit.keep_alive || explicit.keepAlive).map((item: any, index: number) => normalizeExpectationItem(item, { key: `keep_alive_${index + 1}`, label: '保留悬念', type: 'question' })),
    ].filter(Boolean)),
    must_not_break: asArray(explicit.must_not_break || explicit.mustNotBreak).map((item: any) => compactBriefText(item)).filter(Boolean),
  }
}

export function buildReaderExpectationDebtContext(chapter: any, chapters: any[] = [], reviews: any[] = []) {
  const chapterNo = Number(chapter?.chapter_no || 0)
  const chapterId = Number(chapter?.id || 0)
  if (!chapterNo && !chapterId) return normalizeReaderExpectationDebtContext(null)
  const previousChapters = asArray(chapters)
    .filter((item: any) => Number(item?.chapter_no || 0) > 0 && Number(item.chapter_no) < chapterNo)
    .sort((a: any, b: any) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))
    .slice(-6)
  const previousChapterNos = new Set(previousChapters.map((item: any) => Number(item.chapter_no || 0)).filter(Boolean))
  const previousChapterIds = new Set(previousChapters.map((item: any) => Number(item.id || 0)).filter(Boolean))
  const latestByChapter = new Map<string, any>()
  for (const review of asArray(reviews)) {
    if (String(review?.review_type || '') !== 'reader_expectation_sync') continue
    const payload = parseJsonLikePayload(review?.payload) || {}
    const reviewChapterNo = Number(payload?.chapter_no || payload?.reader_expectation_sync?.chapter_no || review?.chapter_no || 0)
    const reviewChapterId = Number(payload?.chapter_id || payload?.reader_expectation_sync?.chapter_id || review?.chapter_id || 0)
    const isPrevious = previousChapterNos.has(reviewChapterNo) || previousChapterIds.has(reviewChapterId)
    if (!isPrevious) continue
    const key = reviewChapterId ? `id:${reviewChapterId}` : `no:${reviewChapterNo}`
    const existing = latestByChapter.get(key)
    if (!existing || reviewTimestamp(review) >= reviewTimestamp(existing.review)) {
      latestByChapter.set(key, { review, payload, chapter_no: reviewChapterNo || previousChapters.find((item: any) => Number(item.id || 0) === reviewChapterId)?.chapter_no || null })
    }
  }
  const mustCarry: any[] = []
  const keepAlive: any[] = []
  for (const item of Array.from(latestByChapter.values()).sort((a: any, b: any) => Number(a.chapter_no || 0) - Number(b.chapter_no || 0))) {
    const sync = item.payload?.reader_expectation_sync || item.payload?.result?.reader_expectation_sync || item.payload?.result || item.payload || {}
    const fromChapterNo = Number(sync?.chapter_no || item.chapter_no || 0) || null
    for (const missed of asArray(sync?.missed)) {
      const normalized = normalizeDebtExpectationItem(missed, { key: 'missed_expectation', label: '待补期待', type: 'carry_over' }, {
        from_chapter_no: fromChapterNo,
        source_review_id: item.review?.id || null,
      })
      if (normalized) mustCarry.push(normalized)
    }
    for (const alive of asArray(sync?.keep_alive)) {
      const normalized = normalizeDebtExpectationItem(alive, { key: 'keep_alive', label: '继续悬念', type: 'question' }, {
        from_chapter_no: fromChapterNo,
        source_review_id: item.review?.id || null,
      })
      if (normalized) keepAlive.push(normalized)
    }
  }
  return applyReaderExpectationDebtAging(normalizeReaderExpectationDebtContext({ must_carry: mustCarry, keep_alive: keepAlive }), chapterNo)
}
