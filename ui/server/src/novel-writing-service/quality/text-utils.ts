export function camelizeSnakeField(field: string) {
  return String(field || '').replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

export function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}



export function uniqueBriefStrings(values: any, limit = 12) {
  const seen = new WeakSet<object>()
  const flattenBriefValues = (value: any, depth = 0): any[] => {
    if (depth > 6) return []
    if (Array.isArray(value)) return value.flatMap(item => flattenBriefValues(item, depth + 1))
    if (value && typeof value === 'object') {
      if (seen.has(value)) return []
      seen.add(value)
      return Object.values(value).flatMap(item => flattenBriefValues(item, depth + 1))
    }
    return value ? [value] : []
  }
  return Array.from(new Set(flattenBriefValues(values)
    .map(value => compactBriefText(value))
    .filter(Boolean))).slice(0, limit)
}
