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

function normalizeSeverity(value: any): ProseQualitySeverity {
  const severity = String(value || 'S3').toUpperCase()
  return severity === 'S1' || severity === 'S2' ? severity : 'S3'
}

function normalizeFinding(value: any, index: number): ProseQualityFinding | null {
  const evidence = compactQualityText(value?.evidence)
  const severity = normalizeSeverity(value?.severity)
  const finding: ProseQualityFinding = {
    key: compactQualityText(value?.key || `finding_${index + 1}`, 100),
    severity: !evidence && severity !== 'S3' ? 'S3' : severity,
    dimension: PROSE_QUALITY_DIMENSIONS.has(value?.dimension)
      ? value.dimension
      : 'prose_style',
    evidence,
    required_change: compactQualityText(value?.required_change || value?.requiredChange),
    acceptance_test: compactQualityText(value?.acceptance_test || value?.acceptanceTest),
  }
  return finding.key && finding.required_change && finding.acceptance_test ? finding : null
}

export function normalizeProseQualityReview(payload: any) {
  const sourceFindings = Array.isArray(payload?.findings)
    ? payload.findings
    : [
        ...(Array.isArray(payload?.blocking_findings) ? payload.blocking_findings : []),
        ...(Array.isArray(payload?.advisory_findings) ? payload.advisory_findings : []),
      ]
  const findings = sourceFindings
    .map(normalizeFinding)
    .filter((item: ProseQualityFinding | null): item is ProseQualityFinding => Boolean(item))
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
  review: ReturnType<typeof normalizeProseQualityReview> | any
  deterministicScan: any
  minScore: number
}): ProseQualityDecision {
  const deterministic = (Array.isArray(input.deterministicScan?.hard_failures)
    ? input.deterministicScan.hard_failures
    : [])
    .map((item: any) => ({
      key: compactQualityText(item?.key || 'deterministic_prose', 100),
      message: compactQualityText(item?.message || item?.evidence || item?.fix || item?.key || '确定性正文检查未通过'),
      source: 'deterministic' as const,
    }))
  const llm = (Array.isArray(input.review?.blocking_findings)
    ? input.review.blocking_findings
    : [])
    .map((item: ProseQualityFinding) => ({
      key: item.key,
      message: `${item.dimension}：${item.evidence}；${item.required_change}`,
      source: 'llm' as const,
    }))
  const hardFailures = [...deterministic, ...llm]
  const score = Number.isFinite(Number(input.review?.score)) ? Number(input.review.score) : 0
  const minScore = Number.isFinite(Number(input.minScore)) ? Number(input.minScore) : 0
  const advisoryFailures = [
    ...(score < minScore ? [`质检评分 ${score} 低于 ${minScore}`] : []),
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
    advisory_failures: advisoryFailures,
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

export function buildFocusedProseReviewPrompt(input: {
  coreContract: any
  chapterText: string
  deterministicScan: any
}) {
  return [
    '任务：独立审查小说正文，只判断正文证据，不评价回执是否齐全。',
    `六维：${REQUIRED_QUALITY_DIMENSIONS.join('；')}。`,
    'S1/S2 必须引用正文中的可定位短句；没有证据只能给 S3 advisory。',
    '最多 6 个 blocking findings、4 个 advisory findings。分数不能覆盖硬失败。',
    `不可变核心合同：${JSON.stringify(input.coreContract || {}, null, 2)}`,
    `确定性扫描：${JSON.stringify(input.deterministicScan || {}, null, 2)}`,
    `正文：\n${String(input.chapterText || '')}`,
    '只输出 JSON：{"score":0,"publishable":false,"dimensions":{"continuity":0,"core_promise_agency":0,"conflict_causality":0,"payoff_hook":0,"prose_style":0,"fact_setting_safety":0},"findings":[{"key":"","severity":"S1|S2|S3","dimension":"","evidence":"正文短句","required_change":"可执行改法","acceptance_test":"复检条件"}]}',
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
    '不得输出审查说明、工程附录、Markdown 标题或下一章。',
    `不可变核心合同：${JSON.stringify(input.coreContract || {}, null, 2)}`,
    `blocking findings：${JSON.stringify((input.blockingFindings || []).slice(0, 6), null, 2)}`,
    `当前完整正文：\n${String(input.chapterText || '')}`,
    '只输出 JSON：{"chapter_text":"完整修订正文","revision_receipts":[{"key":"finding key","changed_evidence":"修后正文短句"}]}',
  ].join('\n')
}

export function isUsableProseQualityReviewPayload(value: any) {
  if (!value || typeof value !== 'object' || !Number.isFinite(Number(value.score))) return false
  const dimensions = value.dimensions
  return Boolean(
    dimensions
      && typeof dimensions === 'object'
      && REQUIRED_QUALITY_DIMENSIONS.every(key => Number.isFinite(Number(dimensions[key]))),
  )
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

function qualityLoopError(code: string, message: string, details: any = {}) {
  return Object.assign(new Error(message), { code, ...details })
}

export async function runProseQualityLoop(input: {
  initialText: string
  minScore: number
  coreContract?: any
  maxRevisionRounds?: number
  scan: (text: string) => any | Promise<any>
  review: (input: { text: string; scan: any; round: number; prompt: string }) => Promise<any>
  revise: (input: { text: string; review: any; round: number; prompt: string }) => Promise<any>
}) {
  const maxRounds = Math.min(2, Math.max(0, Number(input.maxRevisionRounds ?? 2)))
  const rounds: any[] = []
  let finalText = String(input.initialText || '')
  let scan = await input.scan(finalText)
  let initialPayload: any
  try {
    initialPayload = await input.review({
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
    throw qualityLoopError('PROSE_REVIEW_FAILED', '正文初审不可用', { cause: error })
  }
  if (!isUsableProseQualityReviewPayload(initialPayload)) {
    throw qualityLoopError('PROSE_REVIEW_FAILED', '正文初审没有返回完整六维结果')
  }

  let review = normalizeProseQualityReview(initialPayload)
  let decision = buildProseQualityDecision({
    review,
    deterministicScan: scan,
    minScore: input.minScore,
  })

  for (let round = 1; !decision.passed && round <= maxRounds; round += 1) {
    const blockingFindings = [
      ...deterministicFindings(scan),
      ...review.blocking_findings,
    ].slice(0, 6)
    if (blockingFindings.length === 0) break

    const revision = await input.revise({
      text: finalText,
      review,
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
    rounds.push({ round, revision, selection })
    if (!selection.accepted) continue

    finalText = selection.text
    scan = await input.scan(finalText)
    try {
      const recheckPayload = await input.review({
        text: finalText,
        scan,
        round,
        prompt: buildFocusedProseReviewPrompt({
          coreContract: input.coreContract,
          chapterText: finalText,
          deterministicScan: scan,
        }),
      })
      if (!isUsableProseQualityReviewPayload(recheckPayload)) {
        throw new Error('missing six-dimension review payload')
      }
      review = normalizeProseQualityReview(recheckPayload)
    } catch (error) {
      throw qualityLoopError(
        'PROSE_QUALITY_RECHECK_UNAVAILABLE',
        `正文第 ${round} 轮修订后的独立复检不可用`,
        {
          cause: error,
          candidate_chars: finalText.replace(/\s+/g, '').length,
          rounds,
        },
      )
    }
    decision = buildProseQualityDecision({
      review,
      deterministicScan: scan,
      minScore: input.minScore,
    })
  }

  return {
    final_text: finalText,
    final_scan: scan,
    final_review: review,
    decision,
    rounds,
  }
}
import { selectUsableRevisionText } from './prose-quality-contracts'
