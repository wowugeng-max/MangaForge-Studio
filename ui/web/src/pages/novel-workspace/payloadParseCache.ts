type PayloadOwner = Record<string, any> | null | undefined

export type WorkspacePayloadParseOptions = {
  owner?: PayloadOwner
  kind?: string
  field?: string
}

type CacheEntry = {
  value: any
  sourceBytes: number
}

const MAX_ENTRIES = 192
const MAX_SOURCE_BYTES = 8 * 1024 * 1024
const cache = new Map<string, CacheEntry>()
let sourceBytes = 0

function compactIdentity(value: any) {
  if (value === null || value === undefined) return ''
  const normalized = String(value)
  return normalized.length <= 96 ? normalized : `${normalized.slice(0, 48)}:${normalized.length}`
}

function ownerId(owner: PayloadOwner) {
  return compactIdentity(
    owner?.id
    ?? owner?.review_id
    ?? owner?.reviewId
    ?? owner?.run_id
    ?? owner?.runId
    ?? owner?.chapter_id
    ?? owner?.chapterId
    ?? owner?.entity_id
    ?? owner?.entityId
    ?? owner?.key,
  )
}

function ownerVersion(owner: PayloadOwner) {
  return compactIdentity(
    owner?.updated_at
    ?? owner?.updatedAt
    ?? owner?.modified_at
    ?? owner?.modifiedAt
    ?? owner?.version
    ?? owner?.created_at
    ?? owner?.createdAt,
  )
}

function payloadFingerprint(value: string) {
  let first = 0x811c9dc5
  let second = 0x9e3779b9
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index)
    first = Math.imul(first ^ code, 0x01000193)
    second = Math.imul(second ^ code, 0x85ebca6b)
    second = (second << 13) | (second >>> 19)
  }
  return `${(first >>> 0).toString(36)}.${(second >>> 0).toString(36)}`
}

function cacheKey(value: string, options: WorkspacePayloadParseOptions) {
  return [
    compactIdentity(options.kind || 'json'),
    ownerId(options.owner),
    compactIdentity(options.field || 'payload'),
    ownerVersion(options.owner),
    value.length,
    payloadFingerprint(value),
  ].join(':')
}

function evictToLimit() {
  while (cache.size > MAX_ENTRIES || sourceBytes > MAX_SOURCE_BYTES) {
    const oldestKey = cache.keys().next().value
    if (oldestKey === undefined) break
    const oldest = cache.get(oldestKey)
    cache.delete(oldestKey)
    sourceBytes = Math.max(0, sourceBytes - Number(oldest?.sourceBytes || 0))
  }
}

export function parseWorkspacePayload(value: any, options: WorkspacePayloadParseOptions = {}) {
  if (!value) return null
  if (typeof value === 'object') return value

  const source = String(value)
  const key = cacheKey(source, options)
  const cached = cache.get(key)
  if (cached) {
    cache.delete(key)
    cache.set(key, cached)
    return cached.value
  }

  let parsed: any = null
  try {
    parsed = JSON.parse(source)
  } catch {
    parsed = null
  }

  const entryBytes = source.length * 2
  if (entryBytes <= MAX_SOURCE_BYTES) {
    cache.set(key, { value: parsed, sourceBytes: entryBytes })
    sourceBytes += entryBytes
    evictToLimit()
  }
  return parsed
}

export function clearWorkspacePayloadParseCache() {
  cache.clear()
  sourceBytes = 0
}

export function workspacePayloadParseCacheStats() {
  return {
    entries: cache.size,
    sourceBytes,
    maxEntries: MAX_ENTRIES,
    maxSourceBytes: MAX_SOURCE_BYTES,
  }
}
