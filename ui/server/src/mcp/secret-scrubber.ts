import { types } from 'node:util'

const SENSITIVE_FIELD = /^(authorization|proxy-authorization|cookie|set-cookie|api[-_]?key|token|secret)$/i
const GENERIC_PATTERNS = [
  /\bBearer\s+[^\s,;]+/gi,
  /\bsk_[A-Za-z0-9_-]{8,}\b/g,
  /\b(authorization|proxy-authorization)\s*[:=]\s*[^\r\n,;]+/gi,
  /\b(set-cookie|cookie)\s*[:=]\s*[^\r\n]+/gi,
]

function escaped(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const COOKIE_ATTRIBUTES = new Set([
  'domain', 'expires', 'httponly', 'max-age', 'partitioned', 'path', 'priority', 'samesite', 'secure',
])

function derivedSecret(value: string) {
  return value.trim()
}

function authenticationPayload(value: string) {
  const match = value.match(/^\s*[A-Za-z][A-Za-z0-9+.-]*\s+(.+?)\s*$/)
  return derivedSecret(match?.[1] || '')
}

function cookieSecrets(value: string, isSetCookie: boolean) {
  const candidates: string[] = []
  for (const [index, segment] of value.split(';').entries()) {
    const pair = segment.trim()
    const separator = pair.indexOf('=')
    if (separator <= 0) continue
    const name = pair.slice(0, separator).trim()
    const cookieValue = pair.slice(separator + 1).trim()
    if (!name || !cookieValue) continue
    if (isSetCookie && index > 0 && COOKIE_ATTRIBUTES.has(name.toLowerCase())) continue
    const completePair = derivedSecret(`${name}=${cookieValue}`)
    const bareValue = derivedSecret(cookieValue)
    if (completePair) candidates.push(completePair)
    if (bareValue) candidates.push(bareValue)
    if (
      cookieValue.length >= 2
      && ((cookieValue.startsWith('"') && cookieValue.endsWith('"'))
        || (cookieValue.startsWith("'") && cookieValue.endsWith("'")))
    ) {
      const unquotedValue = derivedSecret(cookieValue.slice(1, -1))
      if (unquotedValue) candidates.push(unquotedValue)
    }
  }
  return candidates
}

function mcpHeaderEntrySnapshot(value: unknown): Array<[string, string]> | null {
  if (!value || typeof value !== 'object' || types.isProxy(value)) return null
  try {
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) return null
    const keys = Reflect.ownKeys(value)
    if (keys.some(key => typeof key === 'symbol')) return null
    const entries: Array<[string, string]> = []
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (!descriptor || !descriptor.enumerable || !('value' in descriptor) || typeof descriptor.value !== 'string') {
        return null
      }
      entries.push([key as string, descriptor.value])
    }
    return entries
  } catch {
    return null
  }
}

export function isSafeMcpHeaderRecord(value: unknown): value is Record<string, string> {
  return mcpHeaderEntrySnapshot(value) !== null
}

export function safeMcpHeaderEntries(value: unknown): Array<[string, string]> {
  return mcpHeaderEntrySnapshot(value) || []
}

function configuredSecrets(input: {
  keys?: string[]
  headerValues?: string[]
  headers?: Record<string, string>
}) {
  const headerEntries = safeMcpHeaderEntries(input.headers)
  const explicit = [...(input.keys || []), ...(input.headerValues || []), ...headerEntries.map(([, value]) => value)]
    .map(value => String(value || '').trim())
    .filter(Boolean)
  const derived: string[] = []
  for (const key of input.keys || []) {
    if (!/^\s*Bearer\s+/i.test(key)) continue
    const payload = authenticationPayload(key)
    if (payload) derived.push(payload)
  }
  for (const [name, value] of headerEntries) {
    if (/^(authorization|proxy-authorization)$/i.test(name)) {
      const payload = authenticationPayload(value)
      if (payload) derived.push(payload)
    } else if (/^(cookie|set-cookie)$/i.test(name)) {
      derived.push(...cookieSecrets(value, /^set-cookie$/i.test(name)))
    }
  }
  return [...new Set([...explicit, ...derived])].sort((left, right) => right.length - left.length)
}

export function createMcpSecretScrubber(input: {
  keys?: string[]
  headerValues?: string[]
  headers?: Record<string, string>
} = {}) {
  const secrets = configuredSecrets(input)
  const configuredPattern = secrets.length
    ? new RegExp(secrets.map(escaped).join('|'), 'g')
    : null

  const scrubText = (value: unknown) => {
    let text = String(value ?? '')
    if (configuredPattern) text = text.replace(configuredPattern, '[REDACTED]')
    for (const pattern of GENERIC_PATTERNS) text = text.replace(pattern, '[REDACTED]')
    return text
  }

  const scrubValue = (value: unknown, seen = new WeakSet<object>()): any => {
    if (typeof value === 'string') return scrubText(value)
    if (value === null || value === undefined || typeof value !== 'object') return value
    if (seen.has(value as object)) return '[Circular]'
    seen.add(value as object)
    try {
      if (Array.isArray(value)) return value.map(item => scrubValue(item, seen))
      if (value instanceof Error) {
        const output: Record<string, unknown> = {
          name: scrubText(value.name),
          message: scrubText(value.message),
        }
        for (const [key, item] of Object.entries(value as Error & Record<string, unknown>)) {
          if (/^stack$/i.test(key)) continue
          output[key] = SENSITIVE_FIELD.test(key) ? '[REDACTED]' : scrubValue(item, seen)
        }
        return output
      }
      return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_FIELD.test(key) ? '[REDACTED]' : scrubValue(item, seen),
      ]))
    } finally {
      seen.delete(value as object)
    }
  }

  return { scrubText, scrubValue }
}
