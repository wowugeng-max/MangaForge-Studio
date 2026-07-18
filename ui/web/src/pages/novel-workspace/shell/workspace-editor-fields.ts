export function formatListField(value: any) {
  if (Array.isArray(value)) return value.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join(', ')
  if (value && typeof value === 'object') return JSON.stringify(value)
  return value || ''
}

export function parseListField(value: any) {
  if (Array.isArray(value)) return value
  const text = String(value || '').trim()
  if (!text) return []
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed
  } catch { /* fall back to comma split */ }
  return text.split(/[,，\n]/).map((s: string) => s.trim()).filter(Boolean)
}

export function formatJsonField(value: any) {
  if (value === undefined || value === null || value === '') return ''
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value || '')
  }
}

export function parseJsonField(value: any, fallback: any = []) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value
  const text = String(value || '').trim()
  if (!text) return fallback
  try {
    return JSON.parse(text)
  } catch {
    return fallback
  }
}
