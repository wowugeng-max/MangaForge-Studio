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

export function createMcpSecretScrubber(input: {
  keys?: string[]
  headerValues?: string[]
} = {}) {
  const secrets = [...(input.keys || []), ...(input.headerValues || [])]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)

  const scrubText = (value: unknown) => {
    let text = String(value ?? '')
    for (const secret of secrets) text = text.replace(new RegExp(escaped(secret), 'g'), '[REDACTED]')
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
