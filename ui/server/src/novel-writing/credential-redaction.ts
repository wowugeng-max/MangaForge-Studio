const CREDENTIAL_KEY_SOURCE = [
  'access[-_]?token',
  'refresh[-_]?token',
  'client[-_]?secret',
  'api[-_]?key',
  'session(?:[-_]?id)?',
  'password',
  'passwd',
  'authorization',
  'auth',
  'token',
  'secret',
].join('|')

const AUTHORIZATION_HEADER_RE = /\b((?:proxy-)?authorization)\s*[:=]\s*[^\r\n]*/gi
const COOKIE_HEADER_RE = /\b((?:set-)?cookie)\s*[:=]\s*[^\r\n]*/gi
const BEARER_RE = /\b(Bearer)\s+[^\s,;]+/gi
const CREDENTIAL_QUERY_RE = new RegExp(`([?&](?:${CREDENTIAL_KEY_SOURCE})=)[^&#\\s,;]*`, 'gi')
const CREDENTIAL_KEY_VALUE_RE = new RegExp(
  `\\b(${CREDENTIAL_KEY_SOURCE})\\s*[:=]\\s*(?:"[^"\\r\\n]*"|'[^'\\r\\n]*'|[^\\s,;&}]+)`,
  'gi',
)

export function redactAndBoundCredentialText(value: unknown, maxLength = 240) {
  const outputLimit = Math.max(1, Math.min(2000, Number(maxLength) || 240))
  const inspectionLimit = Math.max(outputLimit, Math.min(8192, outputLimit * 8))
  const input = (typeof value === 'string' ? value : String(value ?? '')).slice(0, inspectionLimit)
  return input
    .replace(/\bhttps?:\/\/[^\s,;]+/gi, '[REDACTED_URL]')
    .replace(AUTHORIZATION_HEADER_RE, '$1: [REDACTED]')
    .replace(COOKIE_HEADER_RE, '$1: [REDACTED]')
    .replace(BEARER_RE, '$1 [REDACTED]')
    .replace(CREDENTIAL_QUERY_RE, '$1[REDACTED]')
    .replace(CREDENTIAL_KEY_VALUE_RE, '$1=[REDACTED]')
    .slice(0, outputLimit)
}
