export type ContractSetRow = {
  id: string
  label: string
  mode: string
  created_at: string
  sample_count: number
  is_active: boolean
  is_locked: boolean
  is_builtin: boolean
  average_score: number | null
  chapter_count: number
  ta_max: number | null
}

export const CHECK_LABELS: Record<string, string> = {
  cv_para: '句长突发 cv',
  single_sentence_para_ratio: '一句一段占比',
  two_sentence_para_ratio: '双句密段占比',
  dialogue_para_ratio: '对白段占比',
  max_mid_streak: '中句同带连续',
  template_contrast_per_1k: '模板对比/千字',
  stock_adverb_per_1k: '套话副词/千字',
  clinical_hit_per_1k: '临床命中/千字',
  subject_ta_opener_ratio: '他/姓名起句占比',
  zhuque_narrative_hard: '朱雀叙事硬门槛',
}

export function buildContractSetRows(input: {
  sets: any[]
  selection: any
  aggregates: any[]
  targets?: Record<string, any>
}): ContractSetRow[] {
  const aggregates = new Map<string, any>((input.aggregates || []).map((item: any) => [String(item?.set_id), item]))
  const activeId = String(input.selection?.active_set_id || 'builtin')
  const lockedId = input.selection?.locked?.set_id ? String(input.selection.locked.set_id) : ''
  return (input.sets || []).map((set: any) => {
    const id = String(set?.id || '')
    const aggregate = aggregates.get(id)
    const target = input.targets?.[id]
    return {
      id,
      label: String(set?.label || id),
      mode: String(set?.mode || 'offline_refit'),
      created_at: String(set?.created_at || ''),
      sample_count: Number(set?.sample_count || 0),
      is_active: id === activeId,
      is_locked: Boolean(lockedId) && id === lockedId,
      is_builtin: id === 'builtin',
      average_score: aggregate ? Number(aggregate.average_score) : null,
      chapter_count: aggregate ? Number(aggregate.chapter_count) : 0,
      ta_max: target?.subject_ta_opener_ratio_max == null ? null : Number(target.subject_ta_opener_ratio_max),
    }
  })
}

export function buildCheckPassRateItems(aggregate: any) {
  const rows = Array.isArray(aggregate?.check_pass_rates) ? aggregate.check_pass_rates : []
  return rows.map((row: any) => {
    const passRate = Number(row?.pass_rate || 0)
    return {
      key: String(row?.key || ''),
      label: CHECK_LABELS[String(row?.key || '')] || String(row?.key || ''),
      pass_rate: passRate,
      sample_count: Number(row?.sample_count || 0),
      tone: (passRate >= 0.9 ? 'good' : passRate >= 0.6 ? 'warn' : 'bad') as 'good' | 'warn' | 'bad',
    }
  })
}

export function nextJobPollDelayMs(job: { status: string } | null, failures: number): number | null {
  if (!job) return null
  if (job.status !== 'queued' && job.status !== 'running') return null
  if (failures >= 3) return 15000
  if (failures >= 1) return 5000
  return 2000
}
