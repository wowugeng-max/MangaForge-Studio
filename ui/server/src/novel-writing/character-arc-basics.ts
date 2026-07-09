import { anchorMatchScore } from './text-matching'

function compactText(value: any, limit = 800) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > limit ? `${text.slice(0, limit)}...` : text
}

export function characterArcRepairInstruction(key: string) {
  if (key === 'growth_beat') return '补出角色在本章发生的可见成长节点，必须体现认知、选择、关系或行动方式变化。'
  if (key === 'desire') return '补出角色本章想要什么，让欲望推动行动，而不是只被事件推着走。'
  if (key === 'flaw_pressure') return '补出角色缺陷、恐惧或旧习惯被冲突压迫的瞬间。'
  if (key === 'relationship_shift') return '补出人物关系的可见变化，例如信任、敌意、亏欠、试探或结盟。'
  if (key === 'voice_anchor') return '补出角色稳定口吻和行动风格，避免所有人物说话像同一个旁白。'
  return '把人物弧光缺口写成角色欲望、缺陷受压、关系变化、成长节点或口吻锚点。'
}

export function normalizeCharacterArcDimension(key: string, label: string, expected: any, chapterText: string, threshold = 42) {
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
    repair_instruction: delivered ? '' : characterArcRepairInstruction(key),
  }
}

export function characterArcPriority(missed: any[]) {
  if (missed.some(item => item.key === 'growth_beat')) return '优先补成长节点'
  if (missed.some(item => item.key === 'desire')) return '优先补角色欲望'
  if (missed.some(item => item.key === 'flaw_pressure')) return '优先补缺陷受压'
  if (missed.some(item => item.key === 'relationship_shift')) return '优先补关系变化'
  if (missed.some(item => item.key === 'voice_anchor')) return '优先补人物口吻'
  return ''
}
