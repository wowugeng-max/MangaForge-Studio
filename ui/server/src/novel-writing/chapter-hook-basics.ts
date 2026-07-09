import { anchorMatchScore } from './text-matching'

export type ChapterHookScope = 'opening' | 'ending' | 'full'

function compactBriefText(value: any, limit = 500) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim().slice(0, limit)
  try {
    return JSON.stringify(value).replace(/\s+/g, ' ').trim().slice(0, limit)
  } catch {
    return String(value).replace(/\s+/g, ' ').trim().slice(0, limit)
  }
}

function proseBodyWithoutTitleLine(text: string) {
  const lines = String(text || '').split(/\r?\n/)
  if (lines.length > 1 && /^第.{1,12}[章节回幕卷部集]/.test(lines[0].trim())) return lines.slice(1).join('\n')
  return String(text || '')
}

export function chapterHookScopedText(chapterText: string, scope: ChapterHookScope) {
  const body = proseBodyWithoutTitleLine(chapterText)
  if (scope === 'opening') return body.slice(0, 900)
  if (scope === 'ending') return body.slice(-900)
  return body
}

export function normalizeChapterHookCheck(
  key: string,
  label: string,
  expected: any,
  chapterText: string,
  scope: Exclude<ChapterHookScope, 'full'>,
  fix: string,
  threshold = 24,
) {
  const text = compactBriefText(expected, 220)
  if (!text) return null
  const scopedText = chapterHookScopedText(chapterText, scope)
  const match = anchorMatchScore(text, scopedText)
  const delivered = match.score >= threshold || match.matched.length >= 2
  return {
    key,
    label,
    text,
    expected: text,
    score: delivered ? Math.max(match.score, 82) : match.score,
    evidence: match.matched,
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : [text],
    issue: delivered ? '' : `${label}未充分兑现：${text}`,
    repair_instruction: delivered ? '' : fix,
  }
}

export function buildChapterHookDeterministicCheck(
  key: string,
  label: string,
  risks: any[],
  expected: string,
  fix: string,
) {
  if (!risks.length) return null
  return {
    key,
    label,
    text: expected,
    expected,
    score: Math.max(0, 100 - risks.length * 18),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项${label}确定性风险。`,
    repair_instruction: fix,
  }
}

export function chapterHookPriority(missed: any[]) {
  if (missed.some(item => item.key === 'opening_hook' || item.key === 'deterministic_opening_hook')) return '优先修章首钩子'
  if (missed.some(item => item.key === 'ending_hook' || item.key === 'deterministic_ending_hook')) return '优先修章尾钩子'
  if (missed.some(item => item.key === 'ending_contract')) return '优先补章尾合同'
  if (missed.some(item => item.key === 'opening_hook_echo')) return '优先回收开篇钩子'
  return ''
}
