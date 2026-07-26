import { summarizeToxicAiDebt } from './toxic-ai-pattern-scans'

function chapterNoOf(item: any) {
  return Number(item?.chapter_no || item?.chapterNo || 0)
}

function chapterTextOf(item: any) {
  return String(item?.chapter_text || item?.chapterText || item?.text || '')
}

/** Block next-chapter generation when previous chapter still has uncleared toxic AI blocking hits. */
export function evaluateToxicAiDebtGate(args: {
  targetChapterNo?: number
  chapters?: any[]
  previousChapter?: any
  allowSkip?: boolean
}) {
  const chapters = Array.isArray(args.chapters) ? args.chapters : []
  const targetNo = Number(args.targetChapterNo || 0)
  const previous = args.previousChapter
    || chapters
      .filter(item => chapterNoOf(item) > 0 && (!targetNo || chapterNoOf(item) < targetNo))
      .sort((a, b) => chapterNoOf(b) - chapterNoOf(a))[0]
    || null

  if (!previous) {
    return {
      version: 'oh_story_toxic_ai_debt_gate_v1',
      ready: true,
      blocked: false,
      previous_chapter_no: 0,
      debt: null,
      reasons: [],
    }
  }

  const debt = summarizeToxicAiDebt(chapterTextOf(previous))
  const blocked = debt.blocking_count > 0 && !debt.skipped && args.allowSkip !== true
  return {
    version: 'oh_story_toxic_ai_debt_gate_v1',
    ready: !blocked,
    blocked,
    previous_chapter_no: chapterNoOf(previous),
    debt,
    reasons: blocked
      ? [
          `第${chapterNoOf(previous)}章仍有 ${debt.blocking_count} 项毒句式阻塞未清，先修订该章或标注 <!-- 去味:跳过 --> 后再写下一章`,
          ...debt.findings.filter((item: any) => item.severity === 'blocking').slice(0, 3).map((item: any) => `${item.label}: ${item.evidence}`),
        ]
      : [],
  }
}
