import {
  anchorMatchScore,
  normalizedMatchText,
} from '../../novel-writing/text-matching'
import {
  asArray,
  compactText,
} from '../../routes/novel-route-utils'
import {
  contextWithChapterRawPreDraftForSync,
} from './quality-sync-reports-benchmark'

export function millionWordRunwayFromContext(contextPackage: any = {}, preDraftBrief: any = null) {
  const chapterTarget = contextPackage?.chapter_target || {}
  const brief = preDraftBrief || contextPackage?.pre_draft_brief || contextPackage?.preDraftBrief || {}
  return chapterTarget.million_word_runway
    || chapterTarget.millionWordRunway
    || brief.million_word_runway
    || brief.millionWordRunway
    || contextPackage?.million_word_runway
    || contextPackage?.millionWordRunway
    || null
}

export function runwayFromContext(contextPackage: any, chapter: any = {}) {
  const syncContextPackage = contextWithChapterRawPreDraftForSync(contextPackage, chapter)
  return millionWordRunwayFromContext(syncContextPackage) || {}
}

export function normalizeRunwayQuestion(item: any, index: number) {
  const text = compactText(item?.answer || item?.text || item?.summary || item?.value || '', 180)
  if (!text) return null
  return {
    key: String(item?.key || `question_${index + 1}`),
    label: compactText(item?.label || item?.title || `本章四问 ${index + 1}`, 60),
    text,
  }
}

export function normalizeRunwayFuel(item: any, index: number) {
  const text = compactText(typeof item === 'string' ? item : item?.text || item?.name || item?.title || item?.summary || item?.description || '', 180)
  return text ? { key: `reader_fuel_${index + 1}`, text } : null
}

export function runwayBeatMatch(beat: any, chapterText: string) {
  const match = anchorMatchScore(beat.text, chapterText)
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered: match.score >= 44,
  }
}

export function runwayRedlineTouched(redLines: any[], chapterText: string) {
  const normalizedChapterText = normalizedMatchText(chapterText)
  return redLines
    .map((item: any) => ({ text: compactText(typeof item === 'string' ? item : item?.text || item?.name || item?.title || item?.summary || item?.description || '', 180) }))
    .filter((item: any) => item.text && normalizedChapterText.includes(normalizedMatchText(item.text)))
}

export function buildRunwaySyncReport(project: any, chapter: any, contextPackage: any, chapterText: string) {
  const runway = runwayFromContext(contextPackage, chapter)
  const fourQuestions = [
    ...asArray(runway?.fourQuestions),
    ...asArray(runway?.four_questions),
  ]
    .map(normalizeRunwayQuestion)
    .filter(Boolean)
  const readerFuel = [
    ...asArray(runway?.readerFuel),
    ...asArray(runway?.reader_fuel),
  ]
    .map(normalizeRunwayFuel)
    .filter(Boolean)
  const redLines = [
    ...asArray(runway?.redLines),
    ...asArray(runway?.red_lines),
  ]

  const questionChecks = fourQuestions.map(item => runwayBeatMatch(item, chapterText))
  const fuelChecks = readerFuel.map(item => runwayBeatMatch(item, chapterText))
  const fourQuestionDelivered = questionChecks.filter(item => item.delivered)
  const fourQuestionMissed = questionChecks.filter(item => !item.delivered)
  const readerFuelDelivered = fuelChecks.filter(item => item.delivered)
  const readerFuelMissed = fuelChecks.filter(item => !item.delivered)
  const redlineTouched = runwayRedlineTouched(redLines, chapterText)
  const riskCount = fourQuestionMissed.length + readerFuelMissed.length + redlineTouched.length
  const plannedCount = fourQuestions.length + readerFuel.length
  const deliveredCount = fourQuestionDelivered.length + readerFuelDelivered.length
  const score = Math.max(0, Math.min(100, Math.round(
    plannedCount
      ? (deliveredCount / plannedCount) * 100 - redlineTouched.length * 22
      : redlineTouched.length ? 62 - redlineTouched.length * 12 : 82,
  )))
  const status = riskCount > 0 || score < 78 ? 'warn' : 'ok'

  return {
    report_id: `runway-sync-${chapter?.id || chapter?.chapter_no || Date.now()}`,
    chapter_id: chapter?.id || null,
    chapter_no: chapter?.chapter_no || null,
    score,
    status,
    label: status === 'ok' ? '航线 OK' : `航线风险 ${riskCount}`,
    summary: status === 'ok'
      ? '本章已基本兑现百万字航线的本章四问、读者燃料和红线约束。'
      : `百万字航线存在 ${riskCount} 项兑现风险。`,
    risk_count: riskCount,
    four_questions: questionChecks,
    four_question_delivered: fourQuestionDelivered,
    four_question_missed: fourQuestionMissed,
    reader_fuel: fuelChecks,
    reader_fuel_delivered: readerFuelDelivered,
    reader_fuel_missed: readerFuelMissed,
    redline_touched: redlineTouched,
    next_actions: status === 'ok'
      ? ['保持百万字航线：本章四问、读者燃料、禁用红线要继续进入开写任务书和交稿复盘。']
      : [
          '下一次修订优先补足 four_question_missed 和 reader_fuel_missed，避免章节只完成事件但不服务长期追读。',
          '如果 redline_touched 有内容，必须改掉提前揭露、越级回收或破坏长期核心的段落。',
        ],
  }
}

