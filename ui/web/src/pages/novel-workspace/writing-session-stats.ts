/** 写作会话统计:本次新增字数与近 10 分钟码字速度。纯内存,不落盘。 */

const SPEED_WINDOW_MS = 10 * 60_000
const MIN_SPEED_SPAN_MS = 60_000

type Sample = { at: number; wordCount: number }

export type WritingSessionStats = {
  sessionAdded: number
  wordsPerHour: number | null
}

export function createWritingSessionTracker() {
  let chapterId: number | null = null
  let baseline = 0
  let peak = 0
  let samples: Sample[] = []

  const record = (nextChapterId: number, wordCount: number, now: number) => {
    if (chapterId !== nextChapterId) {
      chapterId = nextChapterId
      baseline = wordCount
      peak = wordCount
      samples = []
    }
    peak = Math.max(peak, wordCount)
    samples.push({ at: now, wordCount })
    const cutoff = now - SPEED_WINDOW_MS
    // 保留窗口外最后一个样本作为速度基准点
    let firstInWindow = samples.findIndex(sample => sample.at >= cutoff)
    if (firstInWindow > 0) samples = samples.slice(firstInWindow - 1)
  }

  const stats = (forChapterId: number, now: number): WritingSessionStats => {
    if (chapterId !== forChapterId || samples.length === 0) {
      return { sessionAdded: 0, wordsPerHour: null }
    }
    const latest = samples[samples.length - 1]
    const sessionAdded = Math.max(0, latest.wordCount - baseline)

    const cutoff = now - SPEED_WINDOW_MS
    const windowStart = samples.find(sample => sample.at >= cutoff) || samples[0]
    const spanMs = latest.at - windowStart.at
    const delta = latest.wordCount - windowStart.wordCount
    const wordsPerHour = spanMs >= MIN_SPEED_SPAN_MS && delta > 0
      ? Math.round((delta / spanMs) * 3_600_000)
      : null

    return { sessionAdded, wordsPerHour }
  }

  return { record, stats }
}

export function formatWritingSessionLabel(stats: WritingSessionStats): string {
  if (stats.sessionAdded <= 0) return ''
  const added = `本次 +${stats.sessionAdded.toLocaleString('en-US')} 字`
  if (stats.wordsPerHour == null) return added
  return `${added} · ${stats.wordsPerHour.toLocaleString('en-US')} 字/时`
}
