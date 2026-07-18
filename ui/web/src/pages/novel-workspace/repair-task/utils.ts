export type AnyRecord = Record<string, any>

export function arrayValue(value: any): any[] {
  return Array.isArray(value) ? value : []
}

export function text(value: any, fallback = '') {
  if (value === null || value === undefined) return fallback
  const normalized = String(value).trim()
  return normalized || fallback
}

export function parseJsonValue(value: any) {
  if (!value) return null
  if (typeof value === 'object') return value
  try {
    return JSON.parse(String(value))
  } catch {
    return null
  }
}

export function firstText(...values: any[]) {
  for (const value of values) {
    const normalized = text(value)
    if (normalized) return normalized
  }
  return ''
}

export function objectValue(value: any): AnyRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

export function limitedArray(...values: any[]) {
  for (const value of values) {
    const items = arrayValue(value).filter(Boolean)
    if (items.length > 0) return items.slice(0, 6)
  }
  return []
}

