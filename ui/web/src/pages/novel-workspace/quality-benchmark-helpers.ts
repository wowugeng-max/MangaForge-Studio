/** Pure helpers for QualityBenchmarkModal. */

export function parsePayload(value: any) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(String(value))
  } catch {
    return {}
  }
}

export function scoreColor(score?: number | null) {
  if (!score) return 'default'
  if (score >= 85) return 'green'
  if (score >= 78) return 'blue'
  if (score >= 65) return 'gold'
  return 'red'
}

export function progressStatus(score?: number | null) {
  if (!score) return 'normal'
  if (score >= 78) return 'success'
  if (score < 65) return 'exception'
  return 'normal'
}

export function findChapterId(payload: any) {
  return Number(
    payload.chapter_id
    || payload.report?.chapter_id
    || payload.quality_card?.chapter_id
    || payload.context_package?.chapter?.id
    || payload.reference_report?.chapter_id
    || 0,
  )
}

export function findChapterNo(payload: any) {
  return Number(
    payload.chapter_no
    || payload.report?.chapter_no
    || payload.quality_card?.chapter_no
    || payload.context_package?.chapter?.chapter_no
    || payload.reference_report?.chapter_no
    || 0,
  )
}

export function extractQualityScore(payload: any) {
  return Number(
    payload.self_check?.review?.score
    || payload.report?.overall_score
    || payload.quality_card?.overall_score
    || 0,
  ) || null
}

export function extractSafetyScore(payload: any) {
  return Number(
    payload.safety_decision?.score
    || payload.reference_report?.quality_assessment?.overall_score
    || payload.quality_assessment?.overall_score
    || 0,
  ) || null
}

export function runMatchesChapter(run: any, chapter: any) {
  const step = String(run.step_name || '')
  const output = String(run.output_ref || '')
  return step.includes(`chapter-${chapter.chapter_no}`)
    || step.includes(`第${chapter.chapter_no}`)
    || output.includes(`"chapter_id":${chapter.id}`)
    || output.includes(`"id":${chapter.id}`)
}

export function splitParagraphs(text?: string) {
  return String(text || '')
    .split(/\n+/)
    .map(item => item.trim())
    .filter(Boolean)
}

