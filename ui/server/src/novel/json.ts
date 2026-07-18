/** Pure JSON helpers. */

export function nowIso() { return new Date().toISOString() }

export function toStringArray(value: any, fallback: string[] = []) { return Array.isArray(value) ? value.map(item => String(item)).filter(Boolean) : fallback }

export function toAnyArray(value: any, fallback: any[] = []) { return Array.isArray(value) ? value : fallback }

export function toJsonable(value: any, fallback: any = null) { return value === undefined ? fallback : value }

export function sanitizeJsonValue(value: any, seen = new WeakSet<object>(), depth = 0): any {
  if (value === null || value === undefined) return value
  const valueType = typeof value
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') return value
  if (valueType === 'bigint') return String(value)
  if (valueType === 'function') return '[Function]'
  if (valueType !== 'object') return String(value)
  if (seen.has(value)) return '[Circular]'
  if (depth >= 40) return '[MaxDepth]'
  seen.add(value)
  if (Array.isArray(value)) {
    const items = value.map(item => sanitizeJsonValue(item, seen, depth + 1))
    seen.delete(value)
    return items
  }
  const output: Record<string, any> = {}
  for (const [key, item] of Object.entries(value)) output[key] = sanitizeJsonValue(item, seen, depth + 1)
  seen.delete(value)
  return output
}

export function safeJsonText(value: any, space?: number) {
  try {
    const text = JSON.stringify(sanitizeJsonValue(value), null, space)
    return text === undefined ? 'null' : text
  } catch {
    return JSON.stringify(String(value ?? ''))
  }
}

export function jsonText(value: any, fallback: any = []) { return safeJsonText(value === undefined ? fallback : value) }

export function textValue(value: any, fallback = '') { return value === undefined || value === null ? fallback : (typeof value === 'string' ? value : jsonText(value, fallback)) }

export function parseDbArray(value: any) { try { return value ? JSON.parse(String(value)) : [] } catch { return [] } }

export function parseDbJson(value: any, fallback: any = null) { try { return value ? JSON.parse(String(value)) : fallback } catch { return fallback } }
