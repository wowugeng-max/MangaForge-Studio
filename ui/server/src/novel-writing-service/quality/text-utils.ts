export function camelizeSnakeField(field: string) {
  return String(field || '').replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

export function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

