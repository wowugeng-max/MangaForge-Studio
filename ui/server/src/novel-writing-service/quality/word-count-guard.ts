import { asArray, normalizeIssue } from '../../routes/novel-route-utils'
import { countProseChars } from '../../novel-writing/word-target'
import { compactBriefText } from './text-utils'

function issueTextForDeterministicGuard(issue: any) {
  return [
    issue?.severity,
    issue?.type,
    issue?.category,
    issue?.location,
    issue?.evidence,
    issue?.description,
    issue?.message,
    issue?.issue,
    issue?.fix,
    issue?.suggestion,
  ].map(item => compactBriefText(item)).filter(Boolean).join('；')
}

function isContradictedWordCountShortageIssue(issue: any, actualCount: number, minCount: number) {
  if (!minCount || actualCount < minCount) return false
  const text = issueTextForDeterministicGuard(issue)
  if (!/(?:字数|篇幅|word_count|current_count|target_count|min_required_count|目标字数)/i.test(text)) return false
  if (!/(?:不足|严重不足|过短|未达到|低于|少于|扩写|补足|下限)/.test(text)) return false
  return true
}

export function applyDeterministicWordCountIssueGuard(rawIssues: any[], rawScore: any, chapterText = '', wordTarget: any = {}, qualityThreshold = 0) {
  const issues = asArray(rawIssues).map(normalizeIssue)
  const actualCount = countProseChars(chapterText)
  const minCount = Number(
    wordTarget?.min
    || wordTarget?.min_word_count
    || wordTarget?.minWordCount
    || wordTarget?.min_required_count
    || wordTarget?.minRequiredCount
    || 0,
  )
  const ignoredIssues: any[] = []
  const filteredIssues = issues.filter((issue: any) => {
    if (!isContradictedWordCountShortageIssue(issue, actualCount, minCount)) return true
    ignoredIssues.push({
      ...issue,
      deterministic_actual_count: actualCount,
      deterministic_min_count: minCount,
    })
    return false
  })
  const scoreValue = Number(rawScore)
  const threshold = Number(qualityThreshold || 0)
  const hasHighSeverityRemaining = filteredIssues.some((issue: any) => {
    const severity = String(issue?.severity || '').toLowerCase()
    return ['critical', 'high', 's1', 's2'].includes(severity)
  })
  const score = ignoredIssues.length > 0
    && Number.isFinite(scoreValue)
    && threshold > 0
    && scoreValue < threshold
    && !hasHighSeverityRemaining
      ? threshold
      : rawScore
  return {
    issues: filteredIssues,
    ignored_issues: ignoredIssues,
    score,
    actual_word_count: actualCount,
    min_word_count: minCount,
  }
}

