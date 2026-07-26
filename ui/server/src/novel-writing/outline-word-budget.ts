import { asArray } from '../routes/novel-route-utils'

function compactText(value: any, limit = 200) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function densityBudget(level: string, chapterTarget: number) {
  const normalized = String(level || '').toLowerCase()
  if (normalized === 'dense' || normalized === '密') return Math.max(250, Math.round(chapterTarget * 0.18))
  if (normalized === 'sparse' || normalized === '疏') return Math.max(40, Math.round(chapterTarget * 0.03))
  if (normalized === 'slow' || normalized === '慢镜头') return Math.max(400, Math.round(chapterTarget * 0.24))
  return Math.max(120, Math.round(chapterTarget * 0.08))
}

export function buildOutlineWordBudget(input: any = {}) {
  const chapterTarget = Number(input.chapter_word_target || input.chapterWordTarget || input.word_target || 2000) || 2000
  const points = asArray(input.plot_points || input.plotPoints || input.beats || input.outline_points || input.points)
    .map((item: any, index: number) => {
      if (typeof item === 'string') {
        return {
          id: `p${index + 1}`,
          label: compactText(item, 80),
          density_level: /高潮|打脸|反转|决战|揭晓/.test(item) ? 'dense' : /过渡|赶路|交代/.test(item) ? 'sparse' : 'medium',
        }
      }
      return {
        id: String(item?.id || `p${index + 1}`),
        label: compactText(item?.label || item?.title || item?.summary || item?.text || `情节点${index + 1}`, 80),
        density_level: String(item?.density_level || item?.densityLevel || item?.density || 'medium'),
      }
    })

  const budgeted = (points.length ? points : [
    { id: 'p1', label: '开篇承接', density_level: 'medium' },
    { id: 'p2', label: '中段推进', density_level: 'dense' },
    { id: 'p3', label: '章末钩子', density_level: 'medium' },
  ]).map((point: any) => ({
    ...point,
    word_budget: Number(point.word_budget || point.wordBudget || densityBudget(point.density_level, chapterTarget)),
  }))

  const sum = budgeted.reduce((acc: number, item: any) => acc + Number(item.word_budget || 0), 0)
  const min = chapterTarget
  const max = Math.round(chapterTarget * 1.1)
  const status = sum < min ? 'under' : sum > max ? 'over' : 'ok'

  return {
    version: 'oh_story_outline_word_budget_v1',
    chapter_word_target: chapterTarget,
    min_sum: min,
    max_sum: max,
    sum,
    status,
    points: budgeted,
    note: status === 'ok'
      ? `情节点预算 Σ=${sum}，落在 [${min}, ${max}]`
      : status === 'under'
        ? `情节点预算 Σ=${sum} 低于章目标 ${min}，dense 点需加预算`
        : `情节点预算 Σ=${sum} 超过章目标上限 ${max}，需压缩 sparse/medium`,
  }
}

export function locateOutlineWordBudgetDebt(args: {
  budget?: any
  actual_words?: number
  actualWords?: number
}) {
  const budget = args.budget || {}
  const actual = Number(args.actual_words || args.actualWords || 0) || 0
  const target = Number(budget.chapter_word_target || 0) || 0
  if (!target) {
    return { version: 'oh_story_outline_word_budget_debt_v1', ready: true, underwritten: [], note: '无章目标' }
  }
  const points = asArray(budget.points)
  const ratio = actual / target
  const underwritten = points
    .filter((item: any) => String(item.density_level || '') === 'dense' && ratio < 0.9)
    .map((item: any) => ({
      id: item.id,
      label: item.label,
      word_budget: item.word_budget,
      fix: `dense 点《${item.label}》疑似欠字，按预算 ${item.word_budget} 补感知/动作/对话交锋，不要挤牙膏逐点回炉`,
    }))
  return {
    version: 'oh_story_outline_word_budget_debt_v1',
    ready: underwritten.length === 0 || actual >= target,
    actual_words: actual,
    chapter_word_target: target,
    ratio,
    underwritten,
    note: underwritten.length
      ? `正文 ${actual}/${target}，定位到 ${underwritten.length} 个 dense 欠账点`
      : `正文 ${actual}/${target}，未发现 dense 欠账点`,
  }
}
