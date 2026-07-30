import type { CorsOptions } from 'cors'
import type { RequestHandler } from 'express'

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

function stripIpv6Brackets(value: string) {
  return value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value
}

export function isLoopbackHostname(value: string) {
  return LOOPBACK_HOSTS.has(stripIpv6Brackets(String(value || '').trim().toLowerCase()))
}

export function assertLoopbackListenHost(value: string) {
  const host = String(value || '').trim()
  if (!isLoopbackHostname(host)) {
    throw new Error('MangaForge server HOST must be loopback-only; received ' + (host || '(empty)'))
  }
  return host
}

export function isTrustedLocalOrigin(origin?: string) {
  if (origin === undefined || origin === '') return true
  try {
    const parsed = new URL(origin)
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:')
      && isLoopbackHostname(parsed.hostname)
  } catch {
    return false
  }
}

export function createLocalOriginGuard(): RequestHandler {
  return (req, res, next) => {
    const origin = typeof req.headers.origin === 'string' ? req.headers.origin : undefined
    if (isTrustedLocalOrigin(origin)) return next()
    return res.status(403).json({
      error: '仅允许本机 MangaForge 页面访问本地 API',
      detail: '仅允许本机 MangaForge 页面访问本地 API',
      error_code: 'LOCAL_ORIGIN_FORBIDDEN',
    })
  }
}

export const localCorsOptions: CorsOptions = {
  origin(origin, callback) {
    callback(isTrustedLocalOrigin(origin) ? null : new Error('LOCAL_ORIGIN_FORBIDDEN'), Boolean(origin))
  },
}
