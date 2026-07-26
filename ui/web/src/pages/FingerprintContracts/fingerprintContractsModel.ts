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
    const sampleCount = Number(row?.sample_count || 0)
    return {
      key: String(row?.key || ''),
      label: CHECK_LABELS[String(row?.key || '')] || String(row?.key || ''),
      pass_rate: passRate,
      sample_count: sampleCount,
      tone: (passRate >= 0.9 ? 'good' : passRate >= 0.6 ? 'warn' : 'bad') as 'good' | 'warn' | 'bad',
      tooltip: `目标 ${formatTargetValue(row?.target)} · 均值 ${formatTargetValue(row?.mean_value)} · 采样 ${sampleCount} 次`,
    }
  })
}

const TARGET_LABELS: Array<{ key: string; label: string }> = [
  { key: 'cv_para', label: '句长突发 cv' },
  { key: 'single_sentence_para_ratio', label: '一句一段占比' },
  { key: 'two_sentence_para_ratio', label: '双句密段占比' },
  { key: 'dialogue_para_ratio', label: '对白段占比' },
  { key: 'max_mid_streak_max', label: '中句同带连续 上限' },
  { key: 'template_contrast_per_1k_max', label: '模板对比/千字 上限' },
  { key: 'stock_adverb_per_1k_max', label: '套话副词/千字 上限' },
  { key: 'clinical_hit_per_1k_max', label: '临床命中/千字 上限' },
  { key: 'subject_ta_opener_ratio_max', label: '他/姓名起句占比 上限' },
]

function formatTargetValue(value: any): string {
  if (Array.isArray(value) && value.length === 2) return `${value[0]}–${value[1]}`
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

export function buildContractDetailRows(detail: any): Array<{ label: string; value: string }> {
  if (!detail) return []
  const rows: Array<{ label: string; value: string }> = [
    { label: '合同集', value: formatTargetValue(detail.record?.label) },
    { label: '合同名', value: formatTargetValue(detail.contract?.name) },
    { label: '生成方式', value: formatTargetValue(detail.record?.mode) },
    { label: '生成时间', value: formatTargetValue(detail.record?.created_at) },
    { label: '样本数', value: formatTargetValue(detail.meta?.sample_count ?? detail.record?.sample_count) },
    { label: '题材合同数', value: formatTargetValue(detail.meta?.genre_count) },
    { label: '散文字段继承自', value: formatTargetValue(detail.meta?.inherited_prose_from) },
  ]
  for (const item of TARGET_LABELS) {
    rows.push({ label: item.label, value: formatTargetValue(detail.contract?.target?.[item.key]) })
  }
  return rows
}

export function formatSamplesStatusText(status: { available?: boolean; count?: number; by_genre?: Record<string, number> } | null): string {
  if (!status?.available) {
    return '本地样本库为空：离线重拟合不可用（样本因版权未入库，离线重拟合只能在有样本的机器上进行）'
  }
  const count = Number(status.count || 0)
  const byGenre = status.by_genre && typeof status.by_genre === 'object' ? status.by_genre : {}
  const entries = Object.entries(byGenre).sort((a, b) => Number(b[1]) - Number(a[1]))
  if (!entries.length) return `本地样本 ${count} 条可用`
  const shown = entries.slice(0, 6).map(([genre, n]) => `${genre} ${n}`).join(' · ')
  const suffix = entries.length > 6 ? ' …' : ''
  return `本地样本 ${count} 条可用 · 按题材：${shown}${suffix}`
}

export function nextJobPollDelayMs(job: { status: string } | null, failures: number): number | null {
  if (!job) return null
  if (job.status !== 'queued' && job.status !== 'running') return null
  if (failures >= 3) return 15000
  if (failures >= 1) return 5000
  return 2000
}

export function canApplyJobUpdate(mounted: boolean, pollToken: number, currentToken: number): boolean {
  return mounted && pollToken === currentToken
}

export function shouldResumeJobPolling(storedJobId: string | null, activeJobId: string | null): boolean {
  return Boolean(storedJobId) && storedJobId !== activeJobId
}
