import { anchorMatchScore } from './text-matching'

function compactText(value: any, limit = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

export function firstCompactText(...values: any[]) {
  for (const value of values) {
    const text = compactText(value, 220)
    if (text) return text
  }
  return ''
}

export function firstSceneCardText(sceneCards: any[], keys: string[]) {
  for (const card of sceneCards) {
    for (const key of keys) {
      const text = compactText(card?.[key], 220)
      if (text) return text
    }
  }
  return ''
}

export function storyDriveRepairInstruction(key: string) {
  if (key === 'protagonist_choice') return '补出主角在压力下做出的主动选择，必须写成现场行动或对话交锋。'
  if (key === 'choice_cost') return '补出选择带来的即时代价、暴露风险、资源消耗或关系变化。'
  if (key === 'state_change') return '补出本章结束时主角处境、信息、关系或目标状态的明确变化。'
  if (key === 'obstacle') return '补出外部阻碍和冲突压力，让主角不是顺滑完成事件。'
  if (key === 'causal_next_step') return '补出下一步因果，把章末问题、危险或新目标接到下一章。'
  if (key === 'chapter_goal') return '补出本章目标的可见达成、失败或阶段性结果。'
  return '把缺口写成主角选择、冲突阻碍、代价反馈、状态变化和下一步因果。'
}

export function normalizeStoryDriveDimension(key: string, label: string, expected: any, chapterText: string, threshold = 44) {
  const text = compactText(expected, 240)
  if (!text) return null
  const match = anchorMatchScore(text, chapterText)
  const delivered = match.score >= threshold
  return {
    key,
    label,
    text,
    expected: text,
    score: match.score,
    evidence: match.matched,
    delivered,
    status: delivered ? 'ok' : 'warn',
    issue: delivered ? '' : `${label}未充分兑现：${text}`,
    repair_instruction: delivered ? '' : storyDriveRepairInstruction(key),
  }
}

export function storyDrivePriority(missed: any[]) {
  if (missed.some(item => item.key === 'protagonist_choice')) return '优先补主角选择'
  if (missed.some(item => item.key === 'choice_cost')) return '优先补选择代价'
  if (missed.some(item => item.key === 'state_change')) return '优先补状态变化'
  if (missed.some(item => item.key === 'obstacle')) return '优先补明确阻碍'
  if (missed.some(item => item.key === 'causal_next_step')) return '优先补下一步因果'
  if (missed.some(item => item.key === 'chapter_goal')) return '优先补本章目标'
  return ''
}
