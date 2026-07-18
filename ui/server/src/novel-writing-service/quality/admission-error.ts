export function formatAdmissionError(error: any, maxLength = 300) {
  const boundedLength = Math.max(1, Math.min(2000, Number(maxLength) || 300))
  return String(error?.message || error || 'unknown error')
    .replace(/\bhttps?:\/\/[^\s,;]+/gi, '[REDACTED_URL]')
    .replace(/([?&](?:api[_-]?key|token|access[_-]?token|auth|authorization)=)[^&\s]*/gi, '$1[REDACTED]')
    .replace(/\b(Bearer)\s+[^\s,;]+/gi, '$1 [REDACTED]')
    .replace(/\b(api[_-]?key|token|access[_-]?token|auth|authorization)\s*[:=]\s*["']?[^\s,"';}&]+/gi, '$1=[REDACTED]')
    .slice(0, boundedLength)
}
