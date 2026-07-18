import type {
  KnowledgeEntry,
  KnowledgeIngestBatch,
  KnowledgeIngestBatchStatus,
  KnowledgeIngestJob,
} from './types'
import {
  buildChapterBatchText,
  buildIngestBatch,
  dedupeKnowledgeEntries,
  isProviderUploadFailure,
  nowIso,
  rebuildIngestJobEntries,
} from './pure-helpers'
import {
  analyzeKnowledge,
  synthesizeFullBookKnowledge,
} from './analyze'
import {
  cachedChapterToFetchItem,
  contiguousCachedChapters,
  readSourceCache,
  sourceCacheKey,
  writeSourceCache,
} from './source-cache'
import {
  bindRunKnowledgeIngestJob,
  ingestJobChapters,
  ingestJobControllers,
  ingestJobs,
  makeChapterSeenKey,
  scheduleKnowledgeIngestJob,
  updateIngestJob,
} from './ingest-state'

export async function fetchIngestChapters(jobId: string, job: KnowledgeIngestJob, signal: AbortSignal): Promise<any[]> {
  const projectTitle = String(job.project_title || '').trim()
  const cache = projectTitle ? await readSourceCache(projectTitle, job.url) : null
  const cacheKey = projectTitle ? sourceCacheKey(projectTitle, job.url) : ''
  const maxNeeded = job.full_book ? 0 : Math.max(1, Number(job.max_chapters || 1) || 1)
  const cachedItems = contiguousCachedChapters(cache, job.start_chapter, maxNeeded).map(cachedChapterToFetchItem)
  const useCacheOnly = cachedItems.length > 0 && (
    (job.full_book && Boolean(cache?.complete)) ||
    (!job.full_book && cachedItems.length >= maxNeeded)
  )

  if (useCacheOnly) {
    ingestJobChapters.set(jobId, cachedItems)
    updateIngestJob(jobId, {
      phase: '读取正文缓存',
      progress: job.full_book ? 15 : 30,
      fetched_chapters: cachedItems.length,
      current_chapter: cachedItems[cachedItems.length - 1]?.chapter || job.start_chapter,
      current_chapter_title: String(cachedItems[cachedItems.length - 1]?.title || ''),
      current_range: cachedItems.length
        ? `第${cachedItems[0]?.chapter || job.start_chapter}-${cachedItems[cachedItems.length - 1]?.chapter || job.start_chapter}章`
        : `第${job.start_chapter}章起`,
      source_cache: {
        status: 'hit',
        cache_key: cacheKey,
        cached_chapters: cachedItems.length,
        fetched_chapters: 0,
        complete: Boolean(cache?.complete),
      },
    })
    return cachedItems
  }

  if (!job.full_book) {
    if (projectTitle) {
      updateIngestJob(jobId, {
        phase: cachedItems.length ? '补抓缺失章节' : '抓取章节',
        source_cache: {
          status: cachedItems.length ? 'partial' : 'miss',
          cache_key: cacheKey,
          cached_chapters: cachedItems.length,
          fetched_chapters: 0,
          complete: Boolean(cache?.complete),
        },
      })
    }

    const fetchStartChapter = cachedItems.length
      ? Number(cachedItems[cachedItems.length - 1]?.chapter || job.start_chapter) + 1
      : job.start_chapter
    const fetchMaxChapters = Math.max(0, maxNeeded - cachedItems.length)
    const raw = await playwrightFetchSerial(job.url, fetchMaxChapters, fetchStartChapter, signal, job.fetch_concurrency || 1)
    const fetched = Array.isArray(raw)
      ? raw.filter((item: any) => item?.status === 'ok' && String(item?.text || '').trim())
      : []
    const chapters = [...cachedItems]
    const seen = new Set(chapters.map((item, index) => makeChapterSeenKey(item, index)))
    for (const item of fetched) {
      const key = makeChapterSeenKey(item, chapters.length)
      if (seen.has(key)) continue
      seen.add(key)
      chapters.push(item)
      if (chapters.length >= maxNeeded) break
    }
    if (projectTitle && chapters.length) {
      await writeSourceCache(projectTitle, job.url, chapters, Boolean(cache?.complete))
    }
    updateIngestJob(jobId, {
      fetched_chapters: chapters.length,
      source_cache: projectTitle
        ? {
            status: cachedItems.length ? 'partial' : 'miss',
            cache_key: cacheKey,
            cached_chapters: cachedItems.length,
            fetched_chapters: Math.max(0, chapters.length - cachedItems.length),
            complete: Boolean(cache?.complete),
          }
        : undefined,
    })
    return chapters
  }

  const chapters: any[] = [...cachedItems]
  const seen = new Set<string>(chapters.map((item, index) => makeChapterSeenKey(item, index)))
  const fetchConcurrency = Math.max(1, Math.min(24, Number(job.fetch_concurrency || 1) || 1))
  const chunkSize = job.full_book
    ? Math.max(80, Math.min(240, fetchConcurrency * 30))
    : Math.max(5, Math.min(30, Number(job.batch_size || 5) * 4))
  let nextStart = chapters.length
    ? Number(chapters[chapters.length - 1]?.chapter || job.start_chapter) + 1
    : Math.max(1, Number(job.start_chapter || 1) || 1)
  let fetchedSinceCache = 0
  let reachedEnd = false

  if (projectTitle) {
    updateIngestJob(jobId, {
      phase: cachedItems.length ? '读取正文缓存' : '抓取章节',
      progress: cachedItems.length ? 12 : 5,
      fetched_chapters: chapters.length,
      current_chapter: chapters[chapters.length - 1]?.chapter || nextStart,
      current_chapter_title: String(chapters[chapters.length - 1]?.title || ''),
      current_range: chapters.length
        ? `第${chapters[0]?.chapter || job.start_chapter}-${chapters[chapters.length - 1]?.chapter || job.start_chapter}章`
        : `第${nextStart}章起`,
      source_cache: {
        status: cachedItems.length ? 'partial' : 'miss',
        cache_key: cacheKey,
        cached_chapters: cachedItems.length,
        fetched_chapters: 0,
        complete: Boolean(cache?.complete),
      },
    })
  }

  while (true) {
    if (signal.aborted) throw new Error('任务已中断')
    const currentJob = ingestJobs.get(jobId)
    if (currentJob?.status === 'paused') throw new Error('任务已暂停')
    if (currentJob?.status === 'canceled') throw new Error('任务已取消')

    updateIngestJob(jobId, {
      phase: `抓取章节：从第 ${nextStart} 章继续`,
      progress: Math.min(14, 5 + Math.floor(chapters.length / Math.max(chunkSize, 1))),
      current_chapter: nextStart,
      current_range: `第${nextStart}章起`,
      fetched_chapters: chapters.length,
    })

    const raw = await playwrightFetchSerial(job.url, chunkSize, nextStart, signal, fetchConcurrency)
    if (!Array.isArray(raw)) break

    const okItems = raw.filter((item: any) => item?.status === 'ok' && String(item?.text || '').trim())
    let added = 0
    for (const item of okItems) {
      const key = makeChapterSeenKey(item, nextStart + added)
      if (seen.has(key)) continue
      seen.add(key)
      chapters.push(item)
      added += 1
    }
    fetchedSinceCache += added

    if (projectTitle && added > 0) {
      await writeSourceCache(projectTitle, job.url, chapters, false)
    }

    ingestJobChapters.set(jobId, chapters)
    updateIngestJob(jobId, {
      fetched_chapters: chapters.length,
      current_chapter: chapters[chapters.length - 1]?.chapter || nextStart,
      current_chapter_title: String(chapters[chapters.length - 1]?.title || ''),
      current_range: chapters.length
        ? `第${chapters[0]?.chapter || job.start_chapter}-${chapters[chapters.length - 1]?.chapter || nextStart}章`
        : `第${nextStart}章起`,
      source_cache: projectTitle
        ? {
            status: cachedItems.length ? 'partial' : 'miss',
            cache_key: cacheKey,
            cached_chapters: cachedItems.length,
            fetched_chapters: fetchedSinceCache,
            complete: false,
          }
        : undefined,
    })

    const hasDone = raw.some((item: any) => item?.status === 'done')
    if (added === 0 || okItems.length < chunkSize || hasDone) {
      reachedEnd = true
      break
    }

    const lastChapter = Number(okItems[okItems.length - 1]?.chapter || nextStart + added - 1)
    nextStart = Number.isFinite(lastChapter) && lastChapter >= nextStart
      ? lastChapter + 1
      : nextStart + added
  }

  if (projectTitle && chapters.length) {
    const record = await writeSourceCache(projectTitle, job.url, chapters, reachedEnd)
    updateIngestJob(jobId, {
      source_cache: {
        status: cachedItems.length ? 'partial' : 'miss',
        cache_key: cacheKey,
        cached_chapters: cachedItems.length,
        fetched_chapters: fetchedSinceCache,
        complete: Boolean(record?.complete),
      },
    })
  }

  return chapters
}


export async function runKnowledgeIngestJob(jobId: string) {
  let job = ingestJobs.get(jobId)
  if (!job) return
  const controller = new AbortController()
  ingestJobControllers.set(jobId, controller)
  const ensureActive = () => {
    const status = ingestJobs.get(jobId)?.status
    if (status === 'canceled') {
      throw new Error('任务已取消')
    }
    if (status === 'paused') {
      throw new Error('任务已暂停')
    }
    if (controller.signal.aborted) {
      throw new Error('任务已中断')
    }
  }

  try {
    ensureActive()
    updateIngestJob(jobId, {
      status: 'running',
      phase: '抓取章节',
      progress: 5,
    })

    job = ingestJobs.get(jobId)
    if (!job) return
    let chapters = ingestJobChapters.get(jobId) || []
    if (!chapters.length) {
      chapters = await fetchIngestChapters(jobId, job, controller.signal)
      ensureActive()
      if (chapters.length) ingestJobChapters.set(jobId, chapters)
    }

    if (!chapters.length) {
      throw new Error('未抓取到可分析章节')
    }

    if (job.fetch_only) {
      updateIngestJob(jobId, {
        status: 'completed',
        phase: '正文缓存已完成',
        progress: 100,
        fetched_chapters: chapters.length,
        total_batches: 0,
        analyzed_batches: 0,
        current_chapter: chapters[chapters.length - 1]?.chapter || chapters.length,
        current_chapter_title: String(chapters[chapters.length - 1]?.title || ''),
        current_range: `第${chapters[0]?.chapter || 1}-${chapters[chapters.length - 1]?.chapter || chapters.length}章`,
        entries: [],
        errors: [],
      })
      return
    }

    const totalBatches = Math.ceil(chapters.length / job.batch_size)
    const freshBatches = Array.from({ length: totalBatches }, (_, index) => {
      const start = index * job.batch_size
      return buildIngestBatch(job, index, chapters.slice(start, start + job.batch_size))
    })
    const existingBatches = ingestJobs.get(jobId)?.batches || []
    const batches = freshBatches.map(batch => {
      const existing = existingBatches.find(item => item.index === batch.index)
      if (!existing) return batch
      return existing.status === 'analyzing'
        ? { ...existing, status: 'pending' as KnowledgeIngestBatchStatus, error: existing.error || '上次处理中断，可继续' }
        : existing
    })
    updateIngestJob(jobId, {
      fetched_chapters: chapters.length,
      total_batches: totalBatches,
      batches,
      phase: '分批提炼',
      progress: 15,
      entries: dedupeKnowledgeEntries(batches.flatMap(item => item.entries || [])),
    })

    const errors: string[] = [...(ingestJobs.get(jobId)?.errors || [])].filter(error => !String(error).includes('任务已暂停'))

    for (let index = 0; index < totalBatches; index += 1) {
      ensureActive()
      const currentBeforeBatch = ingestJobs.get(jobId)
      const batchState = currentBeforeBatch?.batches?.find(item => item.index === index)
      if (batchState?.status === 'completed') continue
      const start = index * job.batch_size
      const batch = chapters.slice(start, start + job.batch_size)
      const firstChapter = batch[0]?.chapter || start + 1
      const lastChapter = batch[batch.length - 1]?.chapter || start + batch.length
      const source = batchState?.source || batches[index]?.source || `${job.url}（第${firstChapter}-${lastChapter}章）`
      const nextBatches = (ingestJobs.get(jobId)?.batches || batches).map(item => (
        item.index === index
          ? { ...item, status: 'analyzing' as KnowledgeIngestBatchStatus, error: '', updated_at: nowIso() }
          : item
      ))
      updateIngestJob(jobId, {
        phase: `分批提炼 ${index + 1}/${totalBatches}`,
        analyzed_batches: index,
        current_batch: index,
        current_chapter: lastChapter,
        current_chapter_title: String(batch[batch.length - 1]?.title || ''),
        current_range: `第${firstChapter}-${lastChapter}章`,
        batches: nextBatches,
        progress: Math.min(95, 15 + Math.round((index / Math.max(totalBatches, 1)) * 75)),
      })

      try {
        const entries = await analyzeKnowledge(buildChapterBatchText(batch), source, job.model_id, {
          signal: controller.signal,
        })
        ensureActive()
        const currentJob = ingestJobs.get(jobId)
        const updatedBatches = (currentJob?.batches || nextBatches).map(item => (
          item.index === index
            ? { ...item, status: 'completed' as KnowledgeIngestBatchStatus, entries, error: '', updated_at: nowIso() }
            : item
        ))
        const entriesNow = dedupeKnowledgeEntries(updatedBatches.flatMap(item => item.entries || []))
        const settledBatches = updatedBatches.filter(item => item.status === 'completed' || item.status === 'failed').length
        updateIngestJob(jobId, {
          batches: updatedBatches,
          entries: entriesNow,
          analyzed_batches: settledBatches,
        })
      } catch (error) {
        const status = ingestJobs.get(jobId)?.status
        if (status === 'paused' || status === 'canceled' || String(error).includes('任务已暂停') || String(error).includes('任务已取消')) {
          const interruptedBatches = (ingestJobs.get(jobId)?.batches || nextBatches).map(item => (
            item.index === index && item.status === 'analyzing'
              ? { ...item, status: 'pending' as KnowledgeIngestBatchStatus, error: status === 'paused' ? '已暂停，可继续' : item.error, updated_at: nowIso() }
              : item
          ))
          updateIngestJob(jobId, {
            status: status === 'canceled' ? 'canceled' : 'paused',
            phase: status === 'canceled' ? '已取消' : '已暂停',
            batches: interruptedBatches,
            entries: dedupeKnowledgeEntries(interruptedBatches.flatMap(item => item.entries || [])),
          })
          return
        }
        const errorText = `第${firstChapter}-${lastChapter}章分析失败：${String(error).slice(0, 200)}`
        errors.push(errorText)
        const currentJob = ingestJobs.get(jobId)
        const failedBatches = (currentJob?.batches || nextBatches).map(item => (
          item.index === index
            ? { ...item, status: 'failed' as KnowledgeIngestBatchStatus, error: errorText, updated_at: nowIso() }
            : item
        ))
        const settledBatches = failedBatches.filter(item => item.status === 'completed' || item.status === 'failed').length
        updateIngestJob(jobId, {
          batches: failedBatches,
          analyzed_batches: settledBatches,
        })
        if (isProviderUploadFailure(error)) {
          updateIngestJob(jobId, {
            status: 'failed',
            phase: '模型服务上传失败',
            errors,
            batches: failedBatches,
            entries: dedupeKnowledgeEntries(failedBatches.flatMap(item => item.entries || [])),
          })
          return
        }
      }
    }

    const latestJob = ingestJobs.get(jobId)
    let mergedEntries = latestJob ? rebuildIngestJobEntries(latestJob) : []
    if (!mergedEntries.length) {
      throw new Error(errors[0] || 'AI 未提炼出可入库知识')
    }

    if (job.full_book) {
      updateIngestJob(jobId, {
        phase: '全书画像合并',
        progress: 96,
      })
      try {
        mergedEntries = await synthesizeFullBookKnowledge(job, mergedEntries, chapters, controller.signal)
        ensureActive()
      } catch (error) {
        if (ingestJobs.get(jobId)?.status === 'paused' || String(error).includes('任务已暂停')) throw error
        errors.push(`全书画像合并失败，已保留分批提炼结果：${String(error).slice(0, 200)}`)
      }
    }

    let storedCount = latestJob?.stored_count || 0
    let syncedCount = latestJob?.synced_count || 0
    if (job.auto_store) {
      updateIngestJob(jobId, {
        phase: '写入知识库',
        progress: 98,
      })
      const storeResult = await batchStoreKnowledge(mergedEntries, {
        project_id: job.project_id,
        project_title: job.project_title,
      })
      storedCount = storeResult.stored
      syncedCount = storeResult.synced
      if (storeResult.errors.length) errors.push(...storeResult.errors)
    }

    updateIngestJob(jobId, {
      status: 'completed',
      phase: '完成',
      progress: 100,
      analyzed_batches: totalBatches,
      current_batch: totalBatches - 1,
      current_chapter: chapters[chapters.length - 1]?.chapter || chapters.length,
      current_chapter_title: String(chapters[chapters.length - 1]?.title || ''),
      current_range: `第${chapters[0]?.chapter || 1}-${chapters[chapters.length - 1]?.chapter || chapters.length}章`,
      entries: mergedEntries,
      stored_count: storedCount,
      synced_count: syncedCount,
      errors,
    })
  } catch (error) {
    if (String(error).includes('任务已暂停') || ingestJobs.get(jobId)?.status === 'paused') {
      updateIngestJob(jobId, {
        status: 'paused',
        phase: '已暂停',
        progress: Math.min(100, Math.max(0, ingestJobs.get(jobId)?.progress || 0)),
        entries: rebuildIngestJobEntries(ingestJobs.get(jobId)!),
      })
      return
    }
    if (controller.signal.aborted || String(error).includes('任务已取消') || ingestJobs.get(jobId)?.status === 'canceled') {
      updateIngestJob(jobId, {
        status: 'canceled',
        phase: '已取消',
        progress: Math.min(100, Math.max(0, ingestJobs.get(jobId)?.progress || 0)),
        errors: [...(ingestJobs.get(jobId)?.errors || []), '任务已取消'],
      })
      return
    }
    updateIngestJob(jobId, {
      status: 'failed',
      phase: '失败',
      progress: 100,
      errors: [String(error)],
    })
  } finally {
    ingestJobControllers.delete(jobId)
  }
}

bindRunKnowledgeIngestJob(runKnowledgeIngestJob)


export function startKnowledgeIngestJob(input: {
  url: string
  model_id?: number
  full_book?: boolean
  fetch_only?: boolean
  auto_store?: boolean
  project_id?: number
  project_title?: string
  start_chapter?: number
  max_chapters?: number
  batch_size?: number
  fetch_concurrency?: number
}): KnowledgeIngestJob {
  const url = String(input.url || '').trim()
  if (!url) throw new Error('url 不能为空')
  const modelId = Number(input.model_id || 0) || undefined
  const startChapter = Math.max(1, Math.min(100000, Number(input.start_chapter || 1) || 1))
  const fullBook = Boolean(input.full_book)
  const requestedMaxChapters = Number(input.max_chapters)
  const maxChapters = fullBook || requestedMaxChapters <= 0
    ? 0
    : Math.max(1, Math.min(5000, requestedMaxChapters || 50))
  const batchSize = Math.max(1, Math.min(50, Number(input.batch_size || 10) || 10))
  const fetchConcurrency = Math.max(1, Math.min(24, Number(input.fetch_concurrency || 1) || 1))
  const projectId = Number(input.project_id || 0) || undefined
  const projectTitle = String(input.project_title || '').trim()
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const timestamp = nowIso()
  const job: KnowledgeIngestJob = {
    id,
    status: 'queued',
    phase: '等待开始',
    progress: 0,
    url,
    model_id: modelId,
    full_book: fullBook,
    fetch_only: Boolean(input.fetch_only),
    auto_store: Boolean(input.auto_store),
    project_id: projectId,
    project_title: projectTitle,
    start_chapter: startChapter,
    max_chapters: maxChapters,
    batch_size: batchSize,
    fetch_concurrency: fetchConcurrency,
    fetched_chapters: 0,
    analyzed_batches: 0,
    total_batches: 0,
    entries: [],
    errors: [],
    batches: [],
    created_at: timestamp,
    updated_at: timestamp,
  }
  ingestJobs.set(id, job)
  scheduleKnowledgeIngestJob(id)
  return job
}

export function getKnowledgeIngestJob(id: string): KnowledgeIngestJob | null {
  return ingestJobs.get(id) || null
}

export function listKnowledgeIngestJobs(): KnowledgeIngestJob[] {
  return Array.from(ingestJobs.values())
    .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))
}

export function cancelKnowledgeIngestJob(id: string): KnowledgeIngestJob | null {
  const job = ingestJobs.get(id)
  if (!job) return null
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'canceled') {
    return job
  }
  const controller = ingestJobControllers.get(id)
  if (controller && !controller.signal.aborted) controller.abort()
  updateIngestJob(id, {
    status: 'canceled',
    phase: '已取消',
    errors: [...(job.errors || []), '任务已取消'],
  })
  return ingestJobs.get(id) || null
}

export function pauseKnowledgeIngestJob(id: string): KnowledgeIngestJob | null {
  const job = ingestJobs.get(id)
  if (!job) return null
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'canceled' || job.status === 'paused') {
    return job
  }
  updateIngestJob(id, {
    status: 'paused',
    phase: '已暂停',
    batches: (job.batches || []).map(item => (
      item.status === 'analyzing'
        ? { ...item, status: 'pending' as KnowledgeIngestBatchStatus, error: '已暂停，可继续', updated_at: nowIso() }
        : item
    )),
    entries: rebuildIngestJobEntries(job),
  })
  const controller = ingestJobControllers.get(id)
  if (controller && !controller.signal.aborted) controller.abort()
  return ingestJobs.get(id) || null
}

export function resumeKnowledgeIngestJob(id: string, modelId?: number): KnowledgeIngestJob | null {
  const job = ingestJobs.get(id)
  if (!job) return null
  if (job.status === 'completed') return job
  if (job.status === 'running' || job.status === 'queued') return job
  updateIngestJob(id, {
    status: 'queued',
    phase: '继续任务',
    model_id: Number(modelId || job.model_id || 0) || job.model_id,
    batches: (job.batches || []).map(item => (
      item.status === 'analyzing'
        ? { ...item, status: 'pending' as KnowledgeIngestBatchStatus, error: '上次处理中断，可继续', updated_at: nowIso() }
      : item
    )),
  })
  scheduleKnowledgeIngestJob(id)
  return ingestJobs.get(id) || null
}


