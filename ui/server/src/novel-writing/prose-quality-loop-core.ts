import { selectContinuitySafeProseCandidate } from './prose-candidate-continuity'

export type ProseQualityDimension =
  | 'continuity'
  | 'core_promise_agency'
  | 'conflict_causality'
  | 'payoff_hook'
  | 'prose_style'
  | 'fact_setting_safety'

export type ProseQualitySeverity = 'S1' | 'S2' | 'S3'

export interface ProseQualityFinding {
  key: string
  severity: ProseQualitySeverity
  dimension: ProseQualityDimension
  evidence: string
  required_change: string
  acceptance_test: string
}

export interface ProseQualityDecision {
  passed: boolean
  approvable: boolean
  score: number
  min_score: number
  hard_failures: Array<{
    key: string
    message: string
    source: 'deterministic' | 'llm' | 'recheck'
  }>
  advisory_failures: string[]
}

export const MAX_PROSE_QUALITY_EVIDENCE_CHARS = 500

export const PROSE_QUALITY_DIMENSIONS = new Set<ProseQualityDimension>([
  'continuity',
  'core_promise_agency',
  'conflict_causality',
  'payoff_hook',
  'prose_style',
  'fact_setting_safety',
])

export function compactQualityText(value: any, maxChars = 500) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxChars)
}

export const PROSE_EVIDENCE_QUOTE_PAIRS = [
  ['“', '”'],
  ['‘', '’'],
  ['「', '」'],
  ['『', '』'],
  ['"', '"'],
  ["'", "'"],
] as const

function normalizeProseEvidenceWhitespace(value: any) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function locatableProseEvidenceText(value: any) {
  const normalized = normalizeProseEvidenceWhitespace(value)
  if (!normalized) return ''
  const pair = PROSE_EVIDENCE_QUOTE_PAIRS.find(([opening, closing]) => (
    normalized.startsWith(opening) && normalized.endsWith(closing)
  ))
  if (pair) return normalizeProseEvidenceWhitespace(normalized.slice(1, -1))
  return normalized
}

function isProseFindingEvidenceLocatable(finding: ProseQualityFinding, chapterText: string) {
  const evidence = locatableProseEvidenceText(finding?.evidence)
  const prose = normalizeProseEvidenceWhitespace(chapterText)
  return Boolean(evidence && prose.includes(evidence))
}

function normalizeSeverity(value: any): ProseQualitySeverity {
  const severity = String(value || 'S3').toUpperCase()
  return severity === 'S1' || severity === 'S2' ? severity : 'S3'
}

function normalizeFinding(value: any, index: number): ProseQualityFinding | null {
  const normalizedEvidence = normalizeProseEvidenceWhitespace(value?.evidence)
  const evidence = normalizedEvidence.slice(0, MAX_PROSE_QUALITY_EVIDENCE_CHARS)
  const evidenceTooLong = normalizedEvidence.length > MAX_PROSE_QUALITY_EVIDENCE_CHARS
  const severity = normalizeSeverity(value?.severity)
  const finding: ProseQualityFinding = {
    key: compactQualityText(value?.key || `finding_${index + 1}`, 100),
    severity: (!evidence || evidenceTooLong) && severity !== 'S3' ? 'S3' : severity,
    dimension: PROSE_QUALITY_DIMENSIONS.has(value?.dimension)
      ? value.dimension
      : 'prose_style',
    evidence,
    required_change: compactQualityText(value?.required_change || value?.requiredChange),
    acceptance_test: compactQualityText(value?.acceptance_test || value?.acceptanceTest),
  }
  return finding.key && finding.required_change && finding.acceptance_test ? finding : null
}

function proseQualityFindingFingerprint(finding: ProseQualityFinding) {
  return JSON.stringify([
    finding.key,
    finding.severity,
    finding.dimension,
    finding.evidence,
    finding.required_change,
    finding.acceptance_test,
  ])
}

export function uniqueProseQualityFindings(findings: ProseQualityFinding[]) {
  const seen = new Set<string>()
  return findings.filter(finding => {
    const fingerprint = proseQualityFindingFingerprint(finding)
    if (seen.has(fingerprint)) return false
    seen.add(fingerprint)
    return true
  })
}

export function normalizeProseQualityReview(payload: any) {
  const sourceFindings = Array.isArray(payload?.findings)
    ? payload.findings
    : [
        ...(Array.isArray(payload?.blocking_findings) ? payload.blocking_findings : []),
        ...(Array.isArray(payload?.advisory_findings) ? payload.advisory_findings : []),
      ]
  const findings = uniqueProseQualityFindings(sourceFindings
    .map(normalizeFinding)
    .filter((item: ProseQualityFinding | null): item is ProseQualityFinding => Boolean(item)))
  const rawScore = Number(payload?.score ?? 0)
  const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, rawScore)) : 0

  return {
    score,
    publishable: payload?.publishable === true,
    dimensions: payload?.dimensions && typeof payload.dimensions === 'object'
      ? payload.dimensions
      : {},
    blocking_findings: findings
      .filter(item => item.severity === 'S1' || item.severity === 'S2')
      .slice(0, 6),
    advisory_findings: findings
      .filter(item => item.severity === 'S3')
      .slice(0, 4),
  }
}

export function buildProseQualityDecision(input: {
  chapterText: string
  review: ReturnType<typeof normalizeProseQualityReview> | any
  deterministicScan: any
  minScore: number
  classification?: ProseQualityFindingClassification
}): ProseQualityDecision {
  const deterministic = (Array.isArray(input.deterministicScan?.hard_failures)
    ? input.deterministicScan.hard_failures
    : [])
    .map((item: any) => ({
      key: compactQualityText(item?.key || 'deterministic_prose', 100),
      message: compactQualityText(item?.message || item?.evidence || item?.fix || item?.key || '确定性正文检查未通过'),
      source: 'deterministic' as const,
    }))
  const {
    blockingFindings,
    deterministicAdvisoryDowngrades: downgradedFindings,
    unlocatableFindings,
  } = input.classification
    || classifyProseQualityBlockingFindings(input.review, input.chapterText, input.deterministicScan)
  const llm = blockingFindings
    .map((item: ProseQualityFinding) => ({
      key: item.key,
      message: `${item.dimension}：${item.evidence}；${item.required_change}`,
      source: 'llm' as const,
    }))
  const hardFailures = [
    ...deterministic,
    ...proseQualityVerdictHardFailures(input.review),
    ...llm,
  ]
  const score = Number.isFinite(Number(input.review?.score)) ? Number(input.review.score) : 0
  const minScore = Number.isFinite(Number(input.minScore)) ? Number(input.minScore) : 0
  const advisoryFailures = [
    ...(score < minScore ? [`质检评分 ${score} 低于 ${minScore}`] : []),
    ...deterministicAdvisoryFindings(input.deterministicScan)
      .map((item: any) => `${compactQualityText(item?.pattern || item?.key || 'deterministic_advisory', 100)}：${compactQualityText(item?.fix || item?.message || item?.evidence)}`),
    ...downgradedFindings.map((item: ProseQualityFinding) => `${item.key}：${item.required_change}`),
    ...unlocatableFindings.map((item: ProseQualityFinding) => `${item.key}：证据无法在当前正文定位；${item.required_change}`),
    ...(Array.isArray(input.review?.advisory_findings)
      ? input.review.advisory_findings.map((item: ProseQualityFinding) => `${item.key}：${item.required_change}`)
      : []),
  ]

  return {
    passed: hardFailures.length === 0 && score >= minScore,
    approvable: hardFailures.length === 0,
    score,
    min_score: minScore,
    hard_failures: hardFailures,
    advisory_failures: Array.from(new Set(advisoryFailures)),
  }
}

export function assertProseQualityCanStore(
  decision: ProseQualityDecision,
  approval: any = {},
) {
  if (decision.passed) return true
  if (approval?.approved === true && decision.approvable) return true
  const code = decision.hard_failures.some(item => item.key === 'quality_recheck_unavailable')
    ? 'PROSE_QUALITY_RECHECK_UNAVAILABLE'
    : 'PROSE_QUALITY_GATE_BLOCKED'
  throw Object.assign(
    new Error(decision.approvable
      ? '章节质量评分未获批准，正文未入库'
      : '章节硬质量门禁未通过，正文未入库'),
    { code, qualityDecision: decision },
  )
}

export const REQUIRED_QUALITY_DIMENSIONS: ProseQualityDimension[] = [
  'continuity',
  'core_promise_agency',
  'conflict_causality',
  'payoff_hook',
  'prose_style',
  'fact_setting_safety',
]

export const PROSE_QUALITY_DIMENSION_HARD_FLOOR = 5

function proseQualityVerdictHardFailures(review: any): ProseQualityDecision['hard_failures'] {
  const failures: ProseQualityDecision['hard_failures'] = []
  if (review?.publishable !== true) {
    failures.push({
      key: 'quality_publishable_verdict',
      message: '独立质检未明确判定正文可发布',
      source: 'llm',
    })
  }
  for (const dimension of REQUIRED_QUALITY_DIMENSIONS) {
    const rawScore = review?.dimensions?.[dimension]
    const score = isFiniteQualityNumericValue(rawScore) ? Number(rawScore) : Number.NaN
    if (!Number.isFinite(score) || score < PROSE_QUALITY_DIMENSION_HARD_FLOOR) {
      failures.push({
        key: `quality_dimension_${dimension}`,
        message: `${dimension} 维度分数必须为有限数且不低于 ${PROSE_QUALITY_DIMENSION_HARD_FLOOR}/10`,
        source: 'llm',
      })
    }
  }
  return failures
}

export function deterministicAdvisoryFindings(scan: any) {
  return Array.isArray(scan?.advisory_findings) ? scan.advisory_findings : []
}

function isDeterministicAdvisoryCoveredProseStyleFinding(finding: ProseQualityFinding, scan: any) {
  if (finding?.dimension !== 'prose_style') return false
  const evidence = compactQualityText(finding?.evidence)
  if (!evidence) return false
  return deterministicAdvisoryFindings(scan).some((item: any) => {
    const advisoryEvidence = compactQualityText(item?.evidence)
    const advisoryPattern = compactQualityText(item?.pattern)
    const matchedText = compactQualityText(item?.matched_text)
    return advisoryEvidence.length > 0
      && advisoryPattern.length > 0
      && matchedText.length > 0
      && advisoryEvidence.includes(evidence)
      && evidence.includes(matchedText)
      && isAtomicDeterministicAdvisoryStyleRepair(finding, advisoryPattern, matchedText)
  })
}

function splitProseQualityRepairClauses(value: any) {
  return compactQualityText(value, 1_500)
    .split(/[，,；;。]+|(?:并且|并|且)(?=(?:删除|去掉|移除|替换|改写|改成|改为|换成|直写|直接写|保留|让|补|修复))/)
    .map(item => item.replace(/^[\s：:]+|[\s：:]+$/g, ''))
    .filter(Boolean)
}

function clauseReferencesDeterministicAdvisory(clause: string, advisoryPattern: string, matchedText: string) {
  const normalized = clause.replace(/[“”‘’「」『』"']/g, '')
  return normalized.includes(matchedText) || normalized.includes(advisoryPattern)
}

function isProvenStyleRewriteClause(clause: string) {
  const rewrite = clause.match(/^(?:改成|改为|换成|改写成?|直写|直接写|保留)(.+)$/)?.[1] || ''
  if (!rewrite) return false
  return rewrite
    .replace(/(?:更|直接|具体|现场|可见|口语化|的|声音|动作|事实|后果|焦味|证据|感官|画面|细节|句式|描写|表达|\/|、|或)/g, '')
    .trim().length === 0
}

function isProvenDeterministicAdvisoryClause(clause: string, advisoryPattern: string, matchedText: string) {
  if (isProvenStyleRewriteClause(clause)) return true
  if (!clauseReferencesDeterministicAdvisory(clause, advisoryPattern, matchedText)) return false
  const residual = clause
    .replace(/[“”‘’「」『』"']/g, '')
    .split(matchedText).join('')
    .split(advisoryPattern).join('')
    .replace(/\s+/g, '')
  return /^(?:正文)?(?:已)?(?:删除|去掉|移除|替换|改写|不再出现|不得出现|消除|避免)(?:(?:该|这一|这一刻|的|词|词句|措辞|表达|比喻|句式|总结句式|模板|套话))*$/.test(residual)
}

function isAtomicDeterministicAdvisoryStyleRepair(
  finding: ProseQualityFinding,
  advisoryPattern: string,
  matchedText: string,
) {
  const requiredClauses = splitProseQualityRepairClauses(finding?.required_change)
  const acceptanceClauses = splitProseQualityRepairClauses(finding?.acceptance_test)
  const clauses = [...requiredClauses, ...acceptanceClauses]
  return requiredClauses.length > 0
    && acceptanceClauses.length > 0
    && clauses.every(clause => isProvenDeterministicAdvisoryClause(clause, advisoryPattern, matchedText))
}

interface ProseQualityFindingClassification {
  blockingFindings: ProseQualityFinding[]
  deterministicAdvisoryDowngrades: ProseQualityFinding[]
  unlocatableFindings: ProseQualityFinding[]
}

export function classifyProseQualityBlockingFindings(
  review: any,
  chapterText: string,
  scan: any,
): ProseQualityFindingClassification {
  const findings = uniqueProseQualityFindings(Array.isArray(review?.blocking_findings)
    ? review.blocking_findings
    : [])
  const blockingFindings: ProseQualityFinding[] = []
  const deterministicAdvisoryDowngrades: ProseQualityFinding[] = []
  const unlocatableFindings: ProseQualityFinding[] = []
  for (const finding of findings) {
    if (!isProseFindingEvidenceLocatable(finding, chapterText)) {
      unlocatableFindings.push(finding)
    } else if (isDeterministicAdvisoryCoveredProseStyleFinding(finding, scan)) {
      deterministicAdvisoryDowngrades.push(finding)
    } else {
      blockingFindings.push(finding)
    }
  }
  const locatableKeys = new Set([
    ...blockingFindings,
    ...deterministicAdvisoryDowngrades,
  ].map(finding => finding.key))
  return {
    blockingFindings,
    deterministicAdvisoryDowngrades,
    unlocatableFindings: unlocatableFindings.filter(finding => !locatableKeys.has(finding.key)),
  }
}

export function isFiniteQualityNumericValue(value: any) {
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value !== 'string' || !value.trim()) return false
  return Number.isFinite(Number(value))
}

