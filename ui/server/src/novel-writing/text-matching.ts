function compactText(value: any, limit = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

export function normalizedMatchText(value: any) {
  return String(value || '')
    .toLowerCase()
    .replace(/[\s"'“”‘’`.,，。:：;；!?！？()[\]{}<>《》【】、|/\\_-]+/g, '')
}

export function anchorTerms(value: any) {
  const text = normalizedMatchText(value)
  const terms = new Set<string>()
  const latin = String(value || '').toLowerCase().match(/[a-z0-9]{2,}/g) || []
  latin.forEach(term => terms.add(term))
  const cjk = text.replace(/[^\u4e00-\u9fa5]/g, '')
  for (let i = 0; i < cjk.length - 1; i += 1) {
    const term = cjk.slice(i, i + 2)
    if (term.length === 2) terms.add(term)
  }
  return Array.from(terms).slice(0, 80)
}

export function anchorMatchScore(expected: any, chapterText: string, options: { tailOnly?: boolean } = {}) {
  const expectedText = normalizedMatchText(expected)
  if (!expectedText) return { score: 55, matched: [] as string[], total: 0 }
  const rawText = options.tailOnly ? chapterText.slice(-1000) : chapterText
  const normalizedText = normalizedMatchText(rawText)
  if (normalizedText.includes(expectedText)) return { score: 100, matched: [compactText(expected, 40)], total: 1 }
  const terms = anchorTerms(expected)
  if (!terms.length) return { score: 55, matched: [] as string[], total: 0 }
  const matched = terms.filter(term => normalizedText.includes(term))
  const ratio = matched.length / Math.max(1, Math.min(terms.length, 24))
  return {
    score: Math.max(0, Math.min(100, Math.round(ratio * 115))),
    matched: matched.slice(0, 8),
    total: terms.length,
  }
}
