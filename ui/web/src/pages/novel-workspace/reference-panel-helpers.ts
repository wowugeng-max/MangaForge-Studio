/** Pure helpers for ReferencePanel quality/review views. */

export function parseReviewPayload(review: any) {
  if (!review?.payload) return {}
  if (typeof review.payload === 'object') return review.payload
  try {
    return JSON.parse(review.payload)
  } catch {
    return {}
  }
}

export function statusColor(status?: string) {
  if (status === 'success' || status === 'ok') return 'green'
  if (status === 'warn') return 'gold'
  if (status === 'failed' || status === 'error') return 'red'
  if (status === 'running') return 'blue'
  return 'default'
}

export function issueLabel(issue: any) {
  if (typeof issue === 'string') return issue
  return issue?.description || issue?.message || issue?.type || displayValue(issue)
}

export function issueSeverity(issue: any) {
  if (typeof issue === 'string') {
    const severity = issue.split('｜')[0]
    return ['critical', 'high', 'medium', 'low'].includes(severity) ? severity : 'medium'
  }
  return String(issue?.severity || 'medium').toLowerCase()
}

function parseQualitySummaryScore(summary: any) {
  const text = String(summary || '')
  const scoreMatch = text.match(/(?:评分|score)\s*[:：]?\s*(\d+(?:\.\d+)?)/i) || text.match(/(\d+(?:\.\d+)?)\s*分/)
  return scoreMatch ? Number(scoreMatch[1]) : 0
}

function qualityReportIssues(report: any, review: any) {
  if (Array.isArray(review?.issues) && review.issues.length > 0) return review.issues
  if (Array.isArray(report?.issues) && report.issues.length > 0) return report.issues
  if (typeof report?.issues === 'string') {
    try {
      const parsed = JSON.parse(report.issues)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return report.issues ? [report.issues] : []
    }
  }
  return []
}

function compactedPreviewChapterTarget(payload: any) {
  const preview = typeof payload?.preview === 'string' ? payload.preview : ''
  if (!payload?.truncated || !preview) return {}
  const chapterId = Number(preview.match(/"chapter_id"\s*:\s*(\d+)/)?.[1] || 0)
  const chapterNo = Number(preview.match(/"chapter_no"\s*:\s*(\d+)/)?.[1] || chapterId || 0)
  const title = preview.match(/"chapter_title"\s*:\s*"([^"]+)"/)?.[1] || preview.match(/"title"\s*:\s*"([^"]+)"/)?.[1] || ''
  return {
    ...(chapterId ? { id: chapterId, chapter_id: chapterId } : {}),
    ...(chapterNo ? { chapter_no: chapterNo } : {}),
    ...(title ? { title } : {}),
  }
}

export function resolveQualityReportView(report: any) {
  const payload = parseReviewPayload(report)
  const selfCheck = payload.self_check || {}
  const review = selfCheck.review || payload.review || {}
  const contextPackage = payload.context_package || {}
  const chapterTarget = {
    ...compactedPreviewChapterTarget(payload),
    ...(contextPackage.chapter_target || {}),
  }
  const score = Number(review.score ?? payload.score ?? parseQualitySummaryScore(report?.summary) ?? 0)
  const craftMetrics = review.craft_metrics || {}
  const focusedModes = Array.isArray(review.focused_revision_modes) ? review.focused_revision_modes : []
  const issues = qualityReportIssues(report, review)
  const pipeline = Array.isArray(payload.pipeline) ? payload.pipeline : []
  const preflight = contextPackage.preflight || {}
  const checks = Array.isArray(preflight.checks) ? preflight.checks : []
  const warnings = Array.isArray(preflight.warnings) ? preflight.warnings : []
  const previousChapter = contextPackage.continuity?.previous_chapter || null
  return {
    payload,
    selfCheck,
    review,
    score,
    craftMetrics,
    focusedModes,
    issues,
    pipeline,
    contextPackage,
    chapterTarget,
    preflight,
    checks,
    warnings,
    previousChapter,
  }
}

export function scoreColor(score: number) {
  if (score >= 85) return 'green'
  if (score >= 78) return 'blue'
  if (score >= 65) return 'gold'
  return 'red'
}

export function timeValue(value?: string) {
  const time = Date.parse(value || '')
  return Number.isFinite(time) ? time : 0
}

export function currentVersionNo(chapterVersions: any[]) {
  return Math.max(0, ...chapterVersions.map(version => Number(version.version_no || 0))) + 1
}

function reviewTextSnapshot(payload: any) {
  return String(payload?.self_check?.final_text || payload?.final_text || payload?.chapter_text || '').trim()
}

export function resolveReviewVersionLabel(report: any, activeChapter: any | null, activeChapterId: number | null, chapterVersions: any[]) {
  const payload = parseReviewPayload(report)
  const chapterId = Number(payload.chapter_id || payload.context_package?.chapter_target?.id || 0)
  if (!activeChapterId || chapterId !== Number(activeChapterId)) return ''
  const snapshot = reviewTextSnapshot(payload)
  if (snapshot && snapshot === String(activeChapter?.chapter_text || '').trim()) return `当前 v${currentVersionNo(chapterVersions)}`
  const textMatched = chapterVersions.find(version => snapshot && snapshot === String(version.chapter_text || '').trim())
  if (textMatched) return `v${textMatched.version_no}`
  const reportTime = timeValue(report.created_at)
  const historical = chapterVersions
    .slice()
    .sort((a, b) => timeValue(a.created_at) - timeValue(b.created_at) || Number(a.version_no || 0) - Number(b.version_no || 0))
  const matched = historical.find(version => reportTime > 0 && timeValue(version.created_at) > 0 && reportTime <= timeValue(version.created_at))
  if (matched) return `v${matched.version_no}`
  return `当前 v${currentVersionNo(chapterVersions)}`
}

export function reviewMatchesCurrentText(report: any, activeChapter: any | null) {
  const snapshot = reviewTextSnapshot(parseReviewPayload(report))
  return Boolean(snapshot && snapshot === String(activeChapter?.chapter_text || '').trim())
}

export function buildRevisionUsageMap(revisionReports: any[]) {
  const map = new Map<number, any[]>()
  revisionReports.forEach(report => {
    const payload = parseReviewPayload(report)
    const sourceId = Number(payload.source_review_id || 0)
    if (!sourceId) return
    const list = map.get(sourceId) || []
    list.push({ report, payload })
    map.set(sourceId, list)
  })
  return map
}

