export type WorkspaceDetailKind = 'chapter' | 'review' | 'run'

export type WorkspaceDetailResult = {
  kind: WorkspaceDetailKind
  id: number
  status: 'ready' | 'degraded'
  record?: any
  error?: string
}

type CacheEntry = WorkspaceDetailResult

const DEFAULT_LIMITS: Record<WorkspaceDetailKind, number> = {
  chapter: 15,
  review: 96,
  run: 48,
}

function detailKey(kind: WorkspaceDetailKind, id: number, version = '') {
  return `${kind}:${id}:${String(version || '')}`
}

function compactError(error: unknown) {
  return (error instanceof Error ? error.message : String(error || 'detail unavailable')).slice(0, 300)
}

export function createWorkspaceDetailCache(
  fetchDetail: (kind: WorkspaceDetailKind, id: number) => Promise<any>,
  limits: Partial<Record<WorkspaceDetailKind, number>> = {},
) {
  const cache = new Map<string, CacheEntry>()
  const inflight = new Map<string, Promise<WorkspaceDetailResult>>()
  let generation = 0

  const touch = (key: string, entry: CacheEntry) => {
    cache.delete(key)
    cache.set(key, entry)
  }

  const evict = (kind: WorkspaceDetailKind) => {
    const limit = Math.max(1, Number(limits[kind] || DEFAULT_LIMITS[kind]))
    const keys = [...cache.entries()]
      .filter(([, entry]) => entry.kind === kind)
      .map(([key]) => key)
    while (keys.length > limit) {
      const key = keys.shift()
      if (key) cache.delete(key)
    }
  }

  const load = (kind: WorkspaceDetailKind, id: number, version = ''): Promise<WorkspaceDetailResult> => {
    const requestGeneration = generation
    const normalizedId = Number(id || 0)
    const key = detailKey(kind, normalizedId, version)
    const cached = cache.get(key)
    if (cached) {
      touch(key, cached)
      return Promise.resolve(cached)
    }
    const active = inflight.get(key)
    if (active) return active

    let detailRequest: Promise<any>
    try {
      detailRequest = Promise.resolve(fetchDetail(kind, normalizedId))
    } catch (error) {
      detailRequest = Promise.reject(error)
    }
    let request: Promise<WorkspaceDetailResult>
    request = detailRequest
      .then(record => ({ kind, id: normalizedId, status: 'ready' as const, record }))
      .catch(error => ({ kind, id: normalizedId, status: 'degraded' as const, error: compactError(error) }))
      .then(result => {
        if (requestGeneration === generation && result.status === 'ready') {
          touch(key, result)
          evict(kind)
        }
        return result
      })
      .finally(() => {
        if (inflight.get(key) === request) inflight.delete(key)
      })
    inflight.set(key, request)
    return request
  }

  return {
    load,
    loadMany: (kind: WorkspaceDetailKind, records: Array<{ id: number; version?: string }>) => Promise.all(
      records.map(record => load(kind, record.id, record.version || '')),
    ),
    clear() {
      generation += 1
      cache.clear()
      inflight.clear()
    },
    stats() {
      return { cached: cache.size, inflight: inflight.size }
    },
  }
}

export function applyWorkspaceDetailResults(summaries: any[], results: WorkspaceDetailResult[]) {
  const byId = new Map(results.map(result => [Number(result.id), result]))
  return summaries.map(summary => {
    const result = byId.get(Number(summary?.id || 0))
    if (!result) return { ...summary, detail_status: 'summary' }
    if (result.status === 'degraded') {
      return { ...summary, detail_status: 'degraded', detail_error: result.error || 'detail unavailable' }
    }
    return { ...summary, ...(result.record || {}), detail_status: 'ready', detail_error: undefined }
  })
}

function newestFirst<T extends { id?: any; created_at?: any; updated_at?: any }>(records: T[]) {
  return [...records].sort((left, right) => {
    const time = String(right.created_at || right.updated_at || '').localeCompare(String(left.created_at || left.updated_at || ''))
    return time || Number(right.id || 0) - Number(left.id || 0)
  })
}

export function selectChapterWorkingSet(chapters: any[], activeChapterId: number | null) {
  if (!Array.isArray(chapters) || chapters.length === 0) return [] as any[]
  const sorted = [...chapters].sort((left, right) => Number(left?.chapter_no || 0) - Number(right?.chapter_no || 0))
  const activeIndex = sorted.findIndex(chapter => Number(chapter?.id || 0) === Number(activeChapterId || 0))
  const index = activeIndex >= 0 ? activeIndex : 0
  return sorted.slice(Math.max(0, index - 1), Math.min(sorted.length, index + 2))
}

export function selectAutomaticChapterDetailRecords(chapters: any[], activeChapterId: number | null, _recentWrittenLimit = 12) {
  const nearby = selectChapterWorkingSet(chapters, activeChapterId)
  const recentWritten = [...chapters]
    .filter(chapter => Boolean(chapter?.has_prose) || Number(chapter?.word_count || 0) > 0 || Boolean(String(chapter?.chapter_text || '').trim()))
    .sort((left, right) => Number(right?.chapter_no || 0) - Number(left?.chapter_no || 0))
    .slice(0, Math.max(0, _recentWrittenLimit))
  const selected = new Map<number, any>()
  for (const chapter of [...nearby, ...recentWritten]) selected.set(Number(chapter?.id || 0), chapter)
  return [...selected.values()].sort((left, right) => Number(left?.chapter_no || 0) - Number(right?.chapter_no || 0))
}

export function selectReviewDetailIds(reviews: any[], chapters: any[], maxDetails = 96) {
  const sorted = newestFirst(Array.isArray(reviews) ? reviews : [])
  const chapterIds = new Set((chapters || []).map((chapter: any) => Number(chapter?.id || 0)).filter(Boolean))
  const chapterNos = new Set((chapters || []).map((chapter: any) => Number(chapter?.chapter_no || 0)).filter(Boolean))
  const selected = new Set<number>()
  const globalTypes = new Set<string>()
  const chapterTypes = new Set<string>()
  const trendCounts = new Map<string, number>()
  const trendLimits: Record<string, number> = {
    storyline_sync: 5,
    delivery_risk_convergence: 5,
    review_annotation_status: 5,
    chapter_core_drift: 5,
    reader_payoff_sync: 5,
    reader_retention_sync: 5,
    governance_recheck_sync: 5,
  }

  for (const review of sorted) {
    const id = Number(review?.id || 0)
    const type = String(review?.review_type || '')
    if (!id || !type) continue
    const trendLimit = trendLimits[type] || 0
    const trendCount = trendCounts.get(type) || 0
    if (trendCount < trendLimit) {
      trendCounts.set(type, trendCount + 1)
      selected.add(id)
    }
    if (!globalTypes.has(type)) {
      globalTypes.add(type)
      selected.add(id)
    }
    const chapterId = Number(review?.chapter_id || 0)
    const chapterNo = Number(review?.chapter_no || 0)
    if (!chapterIds.has(chapterId) && !chapterNos.has(chapterNo)) continue
    const chapterKey = chapterId ? `id:${chapterId}` : `no:${chapterNo}`
    const key = `${chapterKey}:${type}`
    if (!chapterTypes.has(key)) {
      chapterTypes.add(key)
      selected.add(id)
    }
  }
  return sorted.map(review => Number(review?.id || 0)).filter(id => selected.has(id)).slice(0, Math.max(0, maxDetails))
}

const ACTIVE_RUN_STATUSES = new Set(['queued', 'ready', 'running', 'pending', 'in_progress', 'processing'])
const EXCEPTIONAL_RUN_STATUSES = new Set(['failed', 'error', 'paused'])

function operationalCategory(runType: any) {
  const type = String(runType || '').toLowerCase()
  if (type.includes('chapter_group')) return 'chapter_group'
  if (type.includes('batch')) return 'batch'
  if (type.includes('repair')) return 'repair'
  if (/(governance|quality|review|audit)/.test(type)) return 'governance'
  return ''
}

export function selectRunDetailIds(runs: any[], maxDetails = 32) {
  const sorted = newestFirst(Array.isArray(runs) ? runs : [])
  const exceptionalIds: number[] = []
  const categoryIds = new Map<string, number>()
  const trendIds: number[] = []
  const trendCounts = new Map<string, number>()
  for (const run of sorted) {
    const id = Number(run?.id || 0)
    if (!id) continue
    const status = String(run?.status || '').trim().toLowerCase()
    if (ACTIVE_RUN_STATUSES.has(status) || EXCEPTIONAL_RUN_STATUSES.has(status)) exceptionalIds.push(id)
    const runType = String(run?.run_type || '')
    const trendLimit = runType === 'batch_generate_prose' || runType === 'longform_production_repair'
      ? 12
      : runType === 'chapter_group_generation'
        ? 5
        : /(repair|governance|quality|review|audit)/.test(runType)
          ? 5
          : 0
    const trendCount = trendCounts.get(runType) || 0
    if (trendCount < trendLimit) {
      trendCounts.set(runType, trendCount + 1)
      trendIds.push(id)
    }
    const category = operationalCategory(run?.run_type)
    if (category && !categoryIds.has(category)) categoryIds.set(category, id)
  }
  const reservedCategoryIds = [...categoryIds.values()]
  const selected = new Set<number>([...reservedCategoryIds, ...trendIds])
  for (const id of exceptionalIds) {
    if (selected.size >= maxDetails) break
    selected.add(id)
  }
  return sorted.map(run => Number(run?.id || 0)).filter(id => selected.has(id)).slice(0, maxDetails)
}

export function workspacePayloadBytes(value: any) {
  const text = JSON.stringify(value ?? null)
  return new TextEncoder().encode(text).byteLength
}
