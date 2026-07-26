export const FINGERPRINT_SCORE_REVIEW_TYPE = 'fingerprint_contract_score'

export type FingerprintScoreCheck = { key: string; ok: boolean; value: number; target: number | [number, number] }

export type ParsedFingerprintScore = {
  set_id: string
  set_label: string
  contract_name: string | null
  chapter_id: number | null
  chapter_no: number | null
  score: number
  pass: number
  total: number
  checks: FingerprintScoreCheck[]
}

function normalizeChecks(raw: any): FingerprintScoreCheck[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((item) => item && typeof item.key === 'string')
    .map((item) => ({
      key: String(item.key),
      ok: Boolean(item.ok),
      value: Number(item.value ?? 0),
      target: Array.isArray(item.target) ? [Number(item.target[0]), Number(item.target[1])] as [number, number] : Number(item.target ?? 0),
    }))
}

export function buildFingerprintScoreReviewRecord(input: {
  projectId: number
  chapterId: number
  chapterNo: number
  setId: string
  setLabel: string
  contractName: string | null
  locked: boolean
  contractScore: any
  textChars: number
  createdAt: string
}) {
  const checks = normalizeChecks(input.contractScore?.checks)
  const statChecks = checks.filter((check) => check.key !== 'zhuque_narrative_hard')
  const pass = Number(input.contractScore?.pass ?? 0)
  const total = Number(input.contractScore?.total ?? 0) || statChecks.length || 1
  const failing = checks.filter((check) => !check.ok)
  const payload = {
    chapter_id: input.chapterId,
    chapter_no: input.chapterNo,
    project_id: input.projectId,
    set_id: input.setId,
    set_label: input.setLabel,
    contract_name: input.contractName,
    locked: input.locked,
    score: Number(input.contractScore?.score ?? 0),
    pass,
    total,
    checks,
    narrative_hard_pass: Boolean(input.contractScore?.narrative_hard_pass),
    narrative_hard_hit: Number(input.contractScore?.narrative_hard_hit ?? 0),
    text_chars: input.textChars,
    created_at: input.createdAt,
  }
  return {
    project_id: input.projectId,
    review_type: FINGERPRINT_SCORE_REVIEW_TYPE,
    status: pass / total >= 2 / 3 ? 'passed' : 'attention',
    summary: `指纹 ${pass}/${total} · ${input.setLabel} · 第${input.chapterNo}章`,
    issues: failing.map((check) => `${check.key}=${check.value} 目标=${JSON.stringify(check.target)}`),
    payload: JSON.stringify(payload),
  }
}

export function parseFingerprintScoreRow(row: { payload?: string | null }): ParsedFingerprintScore | null {
  try {
    const parsed = JSON.parse(String(row?.payload || ''))
    if (!parsed || typeof parsed !== 'object') return null
    const checks = normalizeChecks(parsed.checks)
    const statChecks = checks.filter((check) => check.key !== 'zhuque_narrative_hard')
    const total = statChecks.length || Number(parsed.total ?? 0) || 1
    const pass = statChecks.length ? statChecks.filter((check) => check.ok).length : Number(parsed.pass ?? 0)
    return {
      set_id: String(parsed.set_id || 'builtin'),
      set_label: String(parsed.set_label || parsed.set_id || 'builtin'),
      contract_name: parsed.contract_name == null ? null : String(parsed.contract_name),
      chapter_id: parsed.chapter_id == null ? null : Number(parsed.chapter_id),
      chapter_no: parsed.chapter_no == null ? null : Number(parsed.chapter_no),
      score: total ? Number((pass / total).toFixed(3)) : 0,
      pass,
      total,
      checks,
    }
  } catch {
    return null
  }
}

export function aggregateFingerprintScores(rows: Array<{ payload?: string | null }>) {
  const groups = new Map<string, { label: string; scores: number[]; checks: Map<string, { pass: number; total: number }> }>()
  for (const row of rows) {
    const parsed = parseFingerprintScoreRow(row)
    if (!parsed) continue
    if (!groups.has(parsed.set_id)) groups.set(parsed.set_id, { label: parsed.set_label, scores: [], checks: new Map() })
    const group = groups.get(parsed.set_id)!
    group.scores.push(parsed.score)
    for (const check of parsed.checks) {
      if (!group.checks.has(check.key)) group.checks.set(check.key, { pass: 0, total: 0 })
      const stat = group.checks.get(check.key)!
      stat.total += 1
      if (check.ok) stat.pass += 1
    }
  }
  return [...groups.entries()].map(([setId, group]) => ({
    set_id: setId,
    set_label: group.label,
    chapter_count: group.scores.length,
    average_score: group.scores.length
      ? Number((group.scores.reduce((a, b) => a + b, 0) / group.scores.length).toFixed(3))
      : 0,
    check_pass_rates: [...group.checks.entries()].map(([key, stat]) => ({
      key,
      pass_rate: stat.total ? Number((stat.pass / stat.total).toFixed(3)) : 0,
      sample_count: stat.total,
    })),
  }))
}
