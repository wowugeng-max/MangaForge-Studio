const DEFAULT_API_BASE = 'http://localhost:8787/api'

export function getConfiguredStudioApiBaseURL() {
  return String(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE).replace(/\/+$/, '')
}

export function buildStudioMangaApiBase(apiBaseURL = getConfiguredStudioApiBaseURL()) {
  return `${String(apiBaseURL || DEFAULT_API_BASE).replace(/\/+$/, '')}/manga`
}
