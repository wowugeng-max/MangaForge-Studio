const DEFAULT_API_BASE = 'http://localhost:8787/api'

function getConfiguredApiBaseURL() {
  return String(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE).replace(/\/+$/, '')
}

function isAbsoluteFilesystemPath(value: string) {
  return value.startsWith('/Users/') || value.startsWith('/private/') || /^[A-Za-z]:[\\/]/.test(value)
}

const TS_MEDIA_PREFIX = '/api/assets/media/'
const LEGACY_FILES_PREFIX = '/api/files/'

function extractPersistedApiMediaRoute(value: string) {
  const matchPath = (pathname: string, suffix = '') => {
    if (pathname.startsWith(TS_MEDIA_PREFIX)) {
      return { route: 'assets/media', path: `${pathname.slice(TS_MEDIA_PREFIX.length)}${suffix}` }
    }
    if (pathname.startsWith(LEGACY_FILES_PREFIX)) {
      return { route: 'files', path: `${pathname.slice(LEGACY_FILES_PREFIX.length)}${suffix}` }
    }
    return null
  }
  const localMatch = matchPath(value)
  if (localMatch) return localMatch
  try {
    const url = new URL(value)
    return matchPath(url.pathname, `${url.search}${url.hash}`)
  } catch {
    return null
  }
}

export function buildAssetMediaUrl(value: string, apiBaseURL = getConfiguredApiBaseURL()) {
  const mediaPath = String(value || '').trim()
  if (!mediaPath) return ''

  const base = String(apiBaseURL || DEFAULT_API_BASE).replace(/\/+$/, '')
  const persistedApiRoute = extractPersistedApiMediaRoute(mediaPath)
  if (persistedApiRoute) {
    return `${base}/${persistedApiRoute.route}/${persistedApiRoute.path}`
  }
  if (/^(https?:|data:|blob:)/i.test(mediaPath)) return mediaPath

  const normalizedPath = isAbsoluteFilesystemPath(mediaPath) ? mediaPath : mediaPath.replace(/^\/+/, '')
  return `${base}/assets/media/${encodeURIComponent(normalizedPath)}`
}
