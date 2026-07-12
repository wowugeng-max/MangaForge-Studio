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

const MAX_PROSE_QUALITY_EVIDENCE_CHARS = 500

const PROSE_QUALITY_DIMENSIONS = new Set<ProseQualityDimension>([
  'continuity',
  'core_promise_agency',
  'conflict_causality',
  'payoff_hook',
  'prose_style',
  'fact_setting_safety',
])

function compactQualityText(value: any, maxChars = 500) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxChars)
}

const PROSE_EVIDENCE_QUOTE_PAIRS = [
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

function uniqueProseQualityFindings(findings: ProseQualityFinding[]) {
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

const REQUIRED_QUALITY_DIMENSIONS: ProseQualityDimension[] = [
  'continuity',
  'core_promise_agency',
  'conflict_causality',
  'payoff_hook',
  'prose_style',
  'fact_setting_safety',
]

const PROSE_QUALITY_DIMENSION_HARD_FLOOR = 5

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

function deterministicAdvisoryFindings(scan: any) {
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

function classifyProseQualityBlockingFindings(
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

export function buildFocusedProseReviewPrompt(input: {
  coreContract: any
  chapterText: string
  deterministicScan: any
}) {
  return [
    '任务：独立审查小说正文，只判断正文证据，不评价回执是否齐全。',
    `六维：${REQUIRED_QUALITY_DIMENSIONS.join('；')}。`,
    '分制合同：总体分 score 必须使用 0-100 分制，并固定输出 score_scale="0-100"；六个维度分别使用 0-10 分制。不得使用 5 分制或把维度平均值直接写入 score。',
    'S1/S2 必须引用正文中的可定位短句；没有证据只能给 S3 advisory。',
    '确定性扫描标为 advisory 或 status=warn 的词句只保留风格诊断；同一词句已被代码判为 advisory 时，不得仅凭同一词句命中升级为 S1/S2，最多给 S3。',
    '最多 6 个 blocking findings、4 个 advisory findings。分数不能覆盖硬失败。',
    `不可变核心合同：${JSON.stringify(input.coreContract || {}, null, 2)}`,
    `确定性扫描：${JSON.stringify(input.deterministicScan || {}, null, 2)}`,
    `正文：\n${String(input.chapterText || '')}`,
    '只输出 JSON：{"score":0,"score_scale":"0-100","publishable":false,"dimensions":{"continuity":0,"core_promise_agency":0,"conflict_causality":0,"payoff_hook":0,"prose_style":0,"fact_setting_safety":0},"findings":[{"key":"","severity":"S1|S2|S3","dimension":"","evidence":"正文短句","required_change":"可执行改法","acceptance_test":"复检条件"}]}',
  ].join('\n')
}

export function buildFocusedProseRevisionPrompt(input: {
  coreContract: any
  chapterText: string
  blockingFindings: ProseQualityFinding[]
  round: number
}) {
  return [
    `任务：执行第 ${input.round} 轮正文定向修订，返回完整章节正文。`,
    '只修复列出的 blocking findings；保留已经通过的维度、既有事实、角色状态、场景顺序和章末承诺。',
    '修订完成后必须对修订后全文重新扫描，不得只检查 finding 原句；不得新增小写英文粘连词、工程词或非中文正文。',
    '全文残留自检：不得留下“微微鼓胀”“没有一丝多余”“缓缓收回”“轻轻敲击”“犹如实质的毒液”这类已知修订残留；改成具体动作、事实或后果。',
    '不得输出审查说明、工程附录、Markdown 标题或下一章。',
    `不可变核心合同：${JSON.stringify(input.coreContract || {}, null, 2)}`,
    `blocking findings：${JSON.stringify((input.blockingFindings || []).slice(0, 6), null, 2)}`,
    `当前完整正文：\n${String(input.chapterText || '')}`,
    '只输出 JSON：{"chapter_text":"完整修订正文","revision_receipts":[{"key":"finding key","changed_evidence":"修后正文短句"}]}',
  ].join('\n')
}

function isFiniteQualityNumericValue(value: any) {
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value !== 'string' || !value.trim()) return false
  return Number.isFinite(Number(value))
}

export function isUsableProseQualityReviewPayload(value: any) {
  if (!value || typeof value !== 'object' || !isFiniteQualityNumericValue(value.score)) return false
  const score = Number(value.score)
  const scoreScale = compactQualityText(value.score_scale ?? value.scoreScale, 20)
  if (score < 0 || score > 100) return false
  if (scoreScale && scoreScale !== '0-100') return false
  if (!scoreScale && score > 0 && score <= 10) return false
  const dimensions = value.dimensions
  return Boolean(
    dimensions
      && typeof dimensions === 'object'
      && REQUIRED_QUALITY_DIMENSIONS.every(key => {
        if (!isFiniteQualityNumericValue(dimensions[key])) return false
        const dimensionScore = Number(dimensions[key])
        return Number.isFinite(dimensionScore) && dimensionScore >= 0 && dimensionScore <= 10
      }),
  )
}

export function proseQualityReviewMaxTokensForAttempt(attempt: number) {
  const rawAttempt = Number(attempt)
  return Number.isFinite(rawAttempt) && rawAttempt >= 2 ? 10_000 : 5_000
}

function deterministicFindings(scan: any): ProseQualityFinding[] {
  const failures = Array.isArray(scan?.hard_failures) ? scan.hard_failures : []
  return failures.slice(0, 6).map((item: any, index: number) => {
    const key = compactQualityText(item?.key || `deterministic_${index + 1}`, 100)
    return {
      key,
      severity: 'S1',
      dimension: /fact|setting|language|non_chinese/i.test(key)
        ? 'fact_setting_safety'
        : 'prose_style',
      evidence: compactQualityText(item?.evidence || item?.message || item?.key),
      required_change: compactQualityText(item?.required_change || item?.fix || item?.message || '修复确定性硬失败'),
      acceptance_test: `重新运行确定性扫描后不再出现 ${key}`,
    }
  })
}

function proseQualityDiagnosticType(value: any) {
  if (value === undefined) return 'missing'
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  return 'other'
}

function normalizeProseQualityFinishReason(value: any) {
  const reason = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (['stop', 'end_turn', 'stop_sequence', 'completed'].includes(reason)) return 'stop'
  if (['length', 'max_tokens', 'max_output_tokens'].includes(reason)) return 'length'
  if (['content_filter', 'safety', 'recitation', 'blocklist', 'prohibited_content', 'spii', 'image_safety'].includes(reason)) {
    return 'content_filter'
  }
  if (['tool_calls', 'tool_use', 'function_call', 'malformed_function_call', 'unexpected_tool_call'].includes(reason)) {
    return 'tool_calls'
  }
  if (['error', 'failed'].includes(reason)) return 'error'
  if (['cancelled', 'canceled', 'aborted'].includes(reason)) return 'cancelled'
  return 'unknown'
}

export function sanitizeProseQualityReviewTransport(value: any) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const usageSource = value.usage && typeof value.usage === 'object' && !Array.isArray(value.usage)
    ? value.usage
    : null
  const usage = Object.fromEntries(
    ['input_tokens', 'output_tokens', 'total_tokens']
      .filter(key => typeof usageSource?.[key] === 'number' && Number.isFinite(usageSource[key]) && usageSource[key] >= 0)
      .map(key => [key, Math.floor(usageSource[key])]),
  )
  const contentLength = typeof value.content_length === 'number'
    && Number.isFinite(value.content_length)
    && value.content_length >= 0
    ? Math.floor(value.content_length)
    : null
  return {
    finish_reason: normalizeProseQualityFinishReason(value.finish_reason),
    ...(Object.keys(usage).length ? { usage } : {}),
    ...(contentLength != null ? { content_length: contentLength } : {}),
  }
}

function diagnoseProseQualityReviewPayload(value: any, attempt: number) {
  const objectValue = value && typeof value === 'object' && !Array.isArray(value) ? value : null
  const dimensions = objectValue?.dimensions && typeof objectValue.dimensions === 'object' && !Array.isArray(objectValue.dimensions)
    ? objectValue.dimensions
    : null
  return {
    attempt,
    payload_type: proseQualityDiagnosticType(value),
    field_types: {
      score: proseQualityDiagnosticType(objectValue?.score),
      score_scale: proseQualityDiagnosticType(objectValue?.score_scale ?? objectValue?.scoreScale),
      dimensions: proseQualityDiagnosticType(objectValue?.dimensions),
      findings: proseQualityDiagnosticType(objectValue?.findings),
      publishable: proseQualityDiagnosticType(objectValue?.publishable),
    },
    dimension_types: Object.fromEntries(REQUIRED_QUALITY_DIMENSIONS.map(key => [
      key,
      proseQualityDiagnosticType(dimensions && Object.prototype.hasOwnProperty.call(dimensions, key) ? dimensions[key] : undefined),
    ])),
    missing_dimensions: REQUIRED_QUALITY_DIMENSIONS.filter(key => !dimensions || !Object.prototype.hasOwnProperty.call(dimensions, key)),
    transport: sanitizeProseQualityReviewTransport(objectValue?.__quality_review_transport),
  }
}

async function requestUsableProseQualityReview(
  review: (input: { text: string; scan: any; round: number; prompt: string; attempt: number }) => Promise<any>,
  request: { text: string; scan: any; round: number; prompt: string },
) {
  const invalidAttempts: any[] = []
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let payload: any
    try {
      payload = await review({ ...request, attempt })
    } catch (error: any) {
      if (invalidAttempts.length && error && typeof error === 'object') {
        error.review_attempts = invalidAttempts
      }
      throw error
    }
    if (isUsableProseQualityReviewPayload(payload)) return payload
    invalidAttempts.push(diagnoseProseQualityReviewPayload(payload, attempt))
  }
  throw Object.assign(new Error('missing six-dimension review payload'), {
    quality_error_kind: 'invalid_payload',
    review_attempts: invalidAttempts,
  })
}

export async function runProseQualityLoop(input: {
  initialText: string
  minScore: number
  coreContract?: any
  maxRevisionRounds?: number
  scan: (text: string) => any | Promise<any>
  review: (input: { text: string; scan: any; round: number; prompt: string; attempt: number }) => Promise<any>
  revise: (input: {
    text: string
    review: any
    blockingFindings: ProseQualityFinding[]
    round: number
    prompt: string
  }) => Promise<any>
}) {
  const maxRounds = Math.min(1, Math.max(0, Number(input.maxRevisionRounds ?? 1)))
  const rounds: any[] = []
  let qualityWarning: any = null
  let finalText = String(input.initialText || '')
  let scan = await input.scan(finalText)
  let initialPayload: any
  try {
    initialPayload = await requestUsableProseQualityReview(input.review, {
      text: finalText,
      scan,
      round: 0,
      prompt: buildFocusedProseReviewPrompt({
        coreContract: input.coreContract,
        chapterText: finalText,
        deterministicScan: scan,
      }),
    })
  } catch (error) {
    const message = 'quality_review_unavailable：正文独立质检不可用，已保留完整正文'
    const review = normalizeProseQualityReview(null)
    return {
      final_text: finalText,
      final_scan: scan,
      final_review: review,
      decision: {
        passed: false,
        approvable: true,
        score: 0,
        min_score: Number.isFinite(Number(input.minScore)) ? Number(input.minScore) : 0,
        hard_failures: [],
        advisory_failures: [message],
      },
      rounds,
      quality_warning: {
        code: 'quality_review_unavailable',
        source: 'review',
        message,
      },
    }
  }
  let review = normalizeProseQualityReview(initialPayload)
  let classification = classifyProseQualityBlockingFindings(review, finalText, scan)
  let decision = buildProseQualityDecision({
    chapterText: finalText,
    review,
    deterministicScan: scan,
    minScore: input.minScore,
    classification,
  })

  for (let round = 1; !decision.passed && round <= maxRounds; round += 1) {
    const blockingFindings = [
      ...deterministicFindings(scan),
      ...classification.blockingFindings,
    ].slice(0, 6)
    if (blockingFindings.length === 0) break

    const revision = await input.revise({
      text: finalText,
      review,
      blockingFindings,
      round,
      prompt: buildFocusedProseRevisionPrompt({
        coreContract: input.coreContract,
        chapterText: finalText,
        blockingFindings,
        round,
      }),
    })
    const selection = selectUsableRevisionText(finalText, revision, {
      chapterNo: Number(input.coreContract?.chapter_no || input.coreContract?.chapterNo || 0),
      blockingFindings,
    })
    const residueNormalization = selection.accepted
      ? normalizeProseQualityRepairResidue(selection.text)
      : null
    rounds.push({
      round,
      revision,
      selection,
      normalization: residueNormalization
        ? {
            change_count: residueNormalization.change_count || 0,
            rules: residueNormalization.rules || [],
          }
        : null,
    })
    if (!selection.accepted) continue

    finalText = residueNormalization?.text || selection.text
    scan = await input.scan(finalText)
    try {
      const recheckPayload = await requestUsableProseQualityReview(input.review, {
        text: finalText,
        scan,
        round,
        prompt: buildFocusedProseReviewPrompt({
          coreContract: input.coreContract,
          chapterText: finalText,
          deterministicScan: scan,
        }),
      })
      review = normalizeProseQualityReview(recheckPayload)
      classification = classifyProseQualityBlockingFindings(review, finalText, scan)
    } catch (error) {
      const message = `quality_recheck_unavailable：正文第 ${round} 轮修订后的独立复检不可用，已保留完整修订正文`
      decision = {
        passed: false,
        approvable: true,
        score: Number(review?.score || 0),
        min_score: Number.isFinite(Number(input.minScore)) ? Number(input.minScore) : 0,
        hard_failures: [],
        advisory_failures: Array.from(new Set([
          ...decision.advisory_failures,
          message,
        ])),
      }
      qualityWarning = {
        code: 'quality_recheck_unavailable',
        source: 'review',
        message,
      }
      break
    }
    decision = buildProseQualityDecision({
      chapterText: finalText,
      review,
      deterministicScan: scan,
      minScore: input.minScore,
      classification,
    })
  }

  return {
    final_text: finalText,
    final_scan: scan,
    final_review: review,
    decision,
    rounds,
    ...(qualityWarning ? { quality_warning: qualityWarning } : {}),
  }
}
import { selectUsableRevisionText } from './prose-quality-contracts'
import { normalizeProseQualityRepairResidue } from './prose-format'
