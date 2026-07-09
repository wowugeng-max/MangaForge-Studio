import { anchorMatchScore } from './text-matching'

function compactText(value: any, limit = 800) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > limit ? `${text.slice(0, limit)}...` : text
}

export function normalizeAttractionDimension(
  key: string,
  label: string,
  expected: any,
  chapterText: string,
  options: { tailOnly?: boolean; openingOnly?: boolean; threshold?: number } = {},
) {
  const expectedText = compactText(expected, 240)
  const scopeText = options.openingOnly ? chapterText.slice(0, 900) : chapterText
  const match = anchorMatchScore(expectedText, scopeText, { tailOnly: options.tailOnly })
  const threshold = Number(options.threshold || 50)
  const status = !expectedText || match.score >= threshold ? 'ok' : 'warn'
  return {
    key,
    label,
    status,
    score: expectedText ? match.score : 82,
    expected: expectedText,
    evidence: match.matched,
    issue: status === 'ok' ? '' : `${label}未充分兑现：${expectedText}`,
    repair_instruction: status === 'ok' ? '' : attractionRepairInstruction(key),
  }
}

export function attractionRepairInstruction(key: string) {
  if (key === 'opening_hook') return '重写或补写前300字，先给异常、危险、欲望或反常信息。'
  if (key === 'scene_drive') return '补齐场景目标、阻碍、转折、回报，把说明改成现场行动链。'
  if (key === 'payoff_density') return '补出可见反制结果、信息增量、能力展示或情绪回报。'
  if (key === 'page_turn') return '重做最后300字，留下下一章非看不可的危险、选择、反转或未解答案。'
  if (key === 'spread_scene') return '补成可视化传播场面，让读者能复述画面、机制反差或公开反转。'
  return '把缺口写成可见冲突、行动结果、信息增量或章末问题。'
}

export function chapterAttractionPriority(dimensions: any[]) {
  const weak = dimensions.filter(item => item.status === 'warn')
  if (weak.some(item => item.key === 'page_turn')) return '优先修章末翻页'
  if (weak.some(item => item.key === 'opening_hook')) return '优先修开篇钩子'
  if (weak.some(item => item.key === 'payoff_density')) return '优先补爽点密度'
  if (weak.some(item => item.key === 'scene_drive')) return '优先修场景推进'
  if (weak.some(item => item.key === 'spread_scene')) return '优先补传播场面'
  return ''
}
