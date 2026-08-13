/** 质检问题 → 正文批注定位(纯逻辑部分)。evidence 文本匹配,匹配不到降级跳过。 */
import { issueLabel, issueSeverity } from './reference-panel-helpers'

export type ProseAnnotationSeverity = 'critical' | 'high' | 'medium' | 'low'

export type ProseAnnotation = {
  from: number
  to: number
  severity: ProseAnnotationSeverity
  label: string
  fix: string
}

const MIN_EVIDENCE_LENGTH = 4
const SEVERITY_RANK: Record<ProseAnnotationSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function normalizeSeverity(value: string): ProseAnnotationSeverity {
  return (['critical', 'high', 'medium', 'low'] as const).includes(value as ProseAnnotationSeverity)
    ? (value as ProseAnnotationSeverity)
    : 'medium'
}

function evidenceListOf(issue: any): string[] {
  if (typeof issue !== 'object' || issue === null) return []
  const raw = issue.evidence
  const items = Array.isArray(raw) ? raw : [raw]
  return items
    .map(item => String(item || '').trim())
    .filter(item => item.length >= MIN_EVIDENCE_LENGTH)
}

function allIndexesOf(text: string, needle: string): number[] {
  const positions: number[] = []
  let cursor = 0
  while (cursor <= text.length - needle.length) {
    const found = text.indexOf(needle, cursor)
    if (found === -1) break
    positions.push(found)
    cursor = found + needle.length
  }
  return positions
}

export function locateProseAnnotations(text: string, issues: any[]): ProseAnnotation[] {
  if (!text || !Array.isArray(issues) || issues.length === 0) return []

  const candidates: ProseAnnotation[] = []
  for (const issue of issues) {
    const severity = normalizeSeverity(issueSeverity(issue))
    const label = issueLabel(issue)
    const fix = typeof issue === 'object' && issue !== null
      ? String(issue.fix || issue.required_change || issue.suggestion || '')
      : ''
    for (const evidence of evidenceListOf(issue)) {
      for (const from of allIndexesOf(text, evidence)) {
        candidates.push({ from, to: from + evidence.length, severity, label, fix })
      }
    }
  }

  // 严重度优先贪心:重叠区间只保留 severity 更高的批注
  candidates.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.from - b.from)
  const kept: ProseAnnotation[] = []
  for (const candidate of candidates) {
    const overlapping = kept.some(mark => candidate.from < mark.to && candidate.to > mark.from)
    if (!overlapping) kept.push(candidate)
  }

  return kept.sort((a, b) => a.from - b.from)
}
