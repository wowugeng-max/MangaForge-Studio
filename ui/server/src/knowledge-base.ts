import { execFile } from 'child_process'
import { existsSync, unlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'
import type {
  KnowledgeEntry,
  KnowledgeIngestBatch,
  KnowledgeIngestJob,
} from './knowledge-base/types'
export type {
  KnowledgeEntry,
  KnowledgeIngestBatch,
  KnowledgeIngestJob,
  KnowledgeIngestBatchStatus,
  KnowledgeIngestJobStatus,
  KnowledgeSummary,
  SourceCacheSummary,
} from './knowledge-base/types'
import {
  buildChapterBatchText,
  buildIngestBatch,
  compactEntryForSynthesis,
  dedupeKnowledgeEntries,
  extractKnowledgeRows,
  mapKnowledgeToMemoryCategory,
  normalizeKnowledgeEntry,
  nowIso,
  tryParseJson,
} from './knowledge-base/pure-helpers'
export {
  getSourceCache,
  getSourceCachedChapter,
  listSourceCaches,
} from './knowledge-base/source-cache'
import { analyzeKnowledge } from './knowledge-base/analyze'
export { analyzeKnowledge } from './knowledge-base/analyze'
import {
  ingestJobChapters,
  ingestJobs,
  updateIngestJob,
} from './knowledge-base/ingest-state'
import {
  cancelKnowledgeIngestJob,
  getKnowledgeIngestJob,
  listKnowledgeIngestJobs,
  pauseKnowledgeIngestJob,
  resumeKnowledgeIngestJob,
  startKnowledgeIngestJob,
} from './knowledge-base/ingest-runtime'
export {
  cancelKnowledgeIngestJob,
  getKnowledgeIngestJob,
  listKnowledgeIngestJobs,
  pauseKnowledgeIngestJob,
  resumeKnowledgeIngestJob,
  startKnowledgeIngestJob,
} from './knowledge-base/ingest-runtime'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Resolve Python paths
const SCRIPT_DIR = join(__dirname, '..', '..', '..', 'scripts')
const VENV_PYTHON = process.env.VENV_PYTHON || join(SCRIPT_DIR, 'venv', 'bin', 'python3')
const SCRIPT_PATH = join(SCRIPT_DIR, 'novel-memory.py')
const PLAYWRIGHT_FETCH_PATH = join(SCRIPT_DIR, 'playwright-fetch.py')

const execFileAsync = promisify(execFile)

const getPythonPath = () => {
  if (existsSync(VENV_PYTHON)) return VENV_PYTHON
  return 'python3'
}

async function execScript(args: string[]): Promise<string> {
  const py = getPythonPath()
  try {
    const { stdout } = await execFileAsync(py, [SCRIPT_PATH, ...args], {
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024,
    })
    return String(stdout || '')
  } catch (error: any) {
    if (error && typeof error === 'object' && 'stderr' in error) {
      throw new Error(`script error: ${String(error.stderr || error.message).slice(0, 500)}`)
    }
    throw error
  }
}

// ── Knowledge Table Operations ──





async function syncKnowledgeEntryToMemoryPalace(
  projectId: number,
  projectTitle: string | undefined,
  entry: KnowledgeEntry,
): Promise<string> {
  if (!projectId) return ''

  try {
    const { storeMemory, storeFacts } = await import('./memory-service')
    const memoryCategory = mapKnowledgeToMemoryCategory(entry)
    const tags = Array.from(new Set([
      ...entry.tags,
      entry.category,
      memoryCategory,
      ...(entry.title ? [entry.title] : []),
    ].map(tag => String(tag).trim()).filter(Boolean)))

    const titlePrefix = entry.title ? `${entry.title}：` : ''
    const memoryText = `知识库/${entry.category}${projectTitle ? `/${projectTitle}` : ''} ${titlePrefix}${entry.content}`.trim()
    const memoryId = await storeMemory(projectId, memoryText, memoryCategory, tags)
    if (memoryId) {
      await storeFacts(projectId, memoryText, memoryId)
    }
    return memoryId
  } catch (error) {
    console.warn('[knowledge-base] Failed to sync knowledge to memory palace:', String(error).slice(0, 200))
    return ''
  }
}

/**
 * Store a knowledge entry
 */
export async function storeKnowledge(input: {
  category: string
  content: string
  source: string
  source_title?: string
  title?: string
  tags?: string[]
  genre_tags?: string[]
  trope_tags?: string[]
  use_case?: string
  evidence?: string
  chapter_range?: string
  entities?: string[]
  confidence?: number
  weight?: number
  project_id?: number
  project_title?: string
}): Promise<any> {
  const entry = normalizeKnowledgeEntry({
    category: input.category,
    content: input.content,
    source: input.source,
    source_title: input.source_title,
    title: input.title,
    tags: input.tags,
    genre_tags: input.genre_tags,
    trope_tags: input.trope_tags,
    use_case: input.use_case,
    evidence: input.evidence,
    chapter_range: input.chapter_range,
    entities: input.entities,
    confidence: input.confidence,
    weight: input.weight,
    project_id: input.project_id,
    project_title: input.project_title,
  })

  const args: string[] = ['store-knowledge', '--category', entry.category, '--content', entry.content, '--source', entry.source]
  if (entry.project_id) args.push('--project-id', String(entry.project_id))
  if (entry.project_title) args.push('--project-title', entry.project_title)
  if (entry.source_title) args.push('--source-title', entry.source_title)
  if (entry.title) args.push('--title', entry.title)
  if (entry.tags.length) args.push('--tags', JSON.stringify(entry.tags))
  if (entry.genre_tags?.length) args.push('--genre-tags', JSON.stringify(entry.genre_tags))
  if (entry.trope_tags?.length) args.push('--trope-tags', JSON.stringify(entry.trope_tags))
  if (entry.use_case) args.push('--use-case', entry.use_case)
  if (entry.evidence) args.push('--evidence', entry.evidence)
  if (entry.chapter_range) args.push('--chapter-range', entry.chapter_range)
  if (entry.entities?.length) args.push('--entities', JSON.stringify(entry.entities))
  if (entry.confidence) args.push('--confidence', String(entry.confidence))
  if (entry.weight) args.push('--weight', String(entry.weight))

  const output = await execScript(args)
  const parsed = tryParseJson<any>(output, { ok: true, raw: output })

  let memory_id = ''
  if (input.project_id) {
    memory_id = await syncKnowledgeEntryToMemoryPalace(input.project_id, input.project_title, {
      ...entry,
      id: String(parsed?.id || parsed?.entry_id || ''),
      created_at: String(parsed?.created_at || ''),
    })
  }

  return memory_id ? { ...parsed, memory_id } : parsed
}

/**
 * Query knowledge entries by text
 */
export async function queryKnowledge(query: string, options?: {
  category?: string
  top_k?: number
  project_id?: number
  project_title?: string
}): Promise<KnowledgeEntry[]> {
  const args: string[] = ['query-knowledge', '--query', query]
  if (options?.category) args.push('--category', options.category)
  if (options?.top_k) args.push('--top-k', String(options.top_k))
  if (options?.project_id) args.push('--project-id', String(options.project_id))
  if (options?.project_title) args.push('--project-title', options.project_title)

  const output = await execScript(args)
  const parsed = tryParseJson<any>(output, [])
  const rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.results) ? parsed.results : [])
  return rows.map((row: any) => normalizeKnowledgeEntry(row))
}

/**
 * List knowledge entries, optionally filtered by project and category
 */
export async function listKnowledge(category?: string, options?: {
  project_id?: number
  project_title?: string
}): Promise<KnowledgeEntry[]> {
  const args: string[] = ['list-knowledge']
  if (category) args.push('--category', category)
  if (options?.project_id) args.push('--project-id', String(options.project_id))
  if (options?.project_title) args.push('--project-title', options.project_title)

  const output = await execScript(args)
  const parsed = tryParseJson<any>(output, [])
  const rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.entries) ? parsed.entries : [])
  return rows.map((row: any) => normalizeKnowledgeEntry(row))
}

/**
 * Purge knowledge entries by IDs
 */
export async function purgeKnowledge(ids: string[]): Promise<any> {
  const args: string[] = ['purge-knowledge', '--ids', JSON.stringify(ids)]
  const output = await execScript(args)
  return tryParseJson<any>(output, { ok: true, raw: output })
}

/**
 * Purge knowledge entries by source
 */
export async function purgeKnowledgeBySource(source: string): Promise<any> {
  const args: string[] = ['purge-knowledge', '--source', source]
  const output = await execScript(args)
  return tryParseJson<any>(output, { ok: true, raw: output })
}

/**
 * Fetch text content from a URL
 */
export async function fetchUrlText(url: string): Promise<any> {
  const args: string[] = ['fetch-url', '--url', url]
  const output = await execScript(args)
  return tryParseJson<any>(output, { ok: true, raw: output })
}

/**
 * Read a local file (TXT or PDF) and extract text
 */
export async function readLocalFile(file_path: string): Promise<any> {
  const args: string[] = ['read-local-file', '--file', file_path]
  const output = await execScript(args)
  return tryParseJson<any>(output, { ok: true, raw: output })
}

/**
 * Read uploaded local content (txt direct text or pdf base64) and extract text.
 */
export async function readUploadedLocalFile(input: {
  filename: string
  mime_type?: string
  text?: string
  base64?: string
}): Promise<any> {
  const filename = String(input.filename || 'uploaded.txt')
  const mimeType = String(input.mime_type || '').toLowerCase()

  if (typeof input.text === 'string' && input.text.trim()) {
    return {
      status: 'ok',
      text: input.text,
      length: input.text.length,
      source: filename,
    }
  }

  if (!input.base64) {
    return { status: 'error', message: '缺少文件内容' }
  }

  const ext = filename.toLowerCase().endsWith('.pdf') || mimeType.includes('pdf') ? '.pdf' : '.txt'
  const tempPath = join(tmpdir(), `mangaforge-knowledge-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)

  try {
    writeFileSync(tempPath, Buffer.from(input.base64, 'base64'))
    return await readLocalFile(tempPath)
  } finally {
    try {
      if (existsSync(tempPath)) unlinkSync(tempPath)
    } catch {
      // ignore temp cleanup errors
    }
  }
}

/**
 * Fetch URL text using Playwright (SPA-aware). Uses system Chrome.
 */
export async function playwrightFetchUrl(url: string): Promise<any> {
  const py = getPythonPath()
  try {
    const { stdout } = await execFileAsync(py, [PLAYWRIGHT_FETCH_PATH, 'fetch-url', '--url', url], {
      timeout: 90000,
      maxBuffer: 10 * 1024 * 1024,
    })
    return JSON.parse(String(stdout || '{}'))
  } catch (error: any) {
    if (error && typeof error === 'object' && 'stderr' in error) {
      return { status: 'error', message: String(error.stderr || error.message).slice(0, 500) }
    }
    return { status: 'error', message: String(error) }
  }
}

/**
 * Fetch novel chapters serially using Playwright. Follows "next chapter" links.
 */
export async function playwrightFetchSerial(
  url: string,
  maxChapters: number = 500,
  startChapter: number = 1,
  signal?: AbortSignal,
  concurrency: number = 1,
): Promise<any> {
  const py = getPythonPath()
  const fullBook = Number(maxChapters || 0) <= 0
  const fetchConcurrency = Math.max(1, Math.min(24, Number(concurrency || 1) || 1))
  try {
    const { stdout } = await execFileAsync(py, [
      PLAYWRIGHT_FETCH_PATH,
      'fetch-serial',
      '--url',
      url,
      '--max-chapters',
      String(maxChapters),
      '--start-chapter',
      String(startChapter),
      '--concurrency',
      String(fetchConcurrency),
    ], {
      timeout: fullBook ? 0 : 600000,
      maxBuffer: fullBook ? 300 * 1024 * 1024 : 20 * 1024 * 1024,
      signal,
    })
    return JSON.parse(String(stdout || '[]'))
  } catch (error: any) {
    if (error && typeof error === 'object' && 'stderr' in error) {
      return { status: 'error', message: String(error.stderr || error.message).slice(0, 500) }
    }
    return { status: 'error', message: String(error) }
  }
}

export async function synthesizeProjectProfileKnowledge(input: {
  project_title: string
  missing_categories?: string[]
  model_id?: number
}): Promise<{ ok: boolean; entries: KnowledgeEntry[]; stored: number; missing_categories: string[] }> {
  const projectTitle = String(input.project_title || '').trim()
  if (!projectTitle) throw new Error('project_title 不能为空')

  const allowed = new Set([
    'reference_profile',
    'volume_architecture',
    'chapter_beat_template',
    'character_function_matrix',
    'resource_economy_model',
    'style_profile',
  ])
  const existing = await listKnowledge(undefined, { project_title: projectTitle })
  if (!existing.length) throw new Error(`未找到投喂项目「${projectTitle}」的知识条目`)

  const existingCategories = new Set(existing.map(entry => entry.category).filter(Boolean))
  const requested = (Array.isArray(input.missing_categories) ? input.missing_categories : [])
    .map(item => String(item || '').trim())
    .filter(item => allowed.has(item))
  const missingCategories = requested.length
    ? requested
    : Array.from(allowed).filter(category => !existingCategories.has(category))
  if (!missingCategories.length) return { ok: true, entries: [], stored: 0, missing_categories: [] }

  const { executeWithRuntimeModel } = await import('./llm/provider-runtime')
  const { loadActiveWorkspace } = await import('./workspace')
  const workspace = await loadActiveWorkspace()
  const compactEntries = existing.slice(0, 140).map(compactEntryForSynthesis)

  const prompt = `你是一位资深网文拆书策划。现在已有投喂项目「${projectTitle}」的知识库条目，但缺少若干“参考仿写画像”分类。请只基于已有知识进行二次综合，不要编造原文没有支撑的内容。

需要补齐的分类：${missingCategories.join('、')}

已有知识：
${JSON.stringify(compactEntries, null, 2).slice(0, 52000)}

请输出纯 JSON 数组，每个元素字段如下：
- category: 必须是 ${missingCategories.join(' 或 ')} 之一
- title: 简短标题
- content: 200-500 字，写成可迁移蓝图，明确“可借鉴结构”和“避免照搬点”
- tags: 标签数组
- genre_tags: 题材标签数组
- trope_tags: 套路/卖点标签数组
- use_case: 适用写作任务
- evidence: 来自已有知识的证据概括，不超过 120 字
- chapter_range: 依据范围，不确定可写“全书综合”
- entities: 涉及角色/势力/物品/能力等实体数组
- confidence: 0-1
- weight: 1-5

每个缺失分类至少输出 1 条，最多 2 条。禁止输出 markdown，只返回 JSON 数组。`

  const result = await executeWithRuntimeModel<any[]>(
    workspace,
    {
      model: 'balanced',
      messages: [
        { role: 'system', content: '你只输出合法 JSON 数组，不输出 markdown。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.25,
      max_tokens: 4096,
      response_format: 'json',
    },
    Number(input.model_id || 0) || undefined,
  )

  if (result.error) throw new Error(result.error)
  const parsed = extractKnowledgeRows(result)
  const entries = dedupeKnowledgeEntries(parsed
    .filter(Boolean)
    .map((row: any) => normalizeKnowledgeEntry({
      category: allowed.has(String(row?.category || '')) ? row.category : missingCategories[0],
      title: row?.title,
      content: row?.content,
      tags: row?.tags,
      genre_tags: row?.genre_tags,
      trope_tags: row?.trope_tags,
      use_case: row?.use_case,
      evidence: row?.evidence,
      chapter_range: row?.chapter_range || '全书综合',
      entities: row?.entities,
      confidence: row?.confidence,
      weight: row?.weight,
      source: `${projectTitle}（画像补提炼）`,
      source_title: `${projectTitle}（画像补提炼）`,
      project_title: projectTitle,
    }))
    .filter(entry => entry.content && missingCategories.includes(entry.category)))

  const stored = entries.length
    ? (await batchStoreKnowledge(entries, { project_title: projectTitle })).stored || entries.length
    : 0
  return { ok: true, entries, stored, missing_categories: missingCategories }
}

export async function reanalyzeKnowledgeIngestBatch(
  jobId: string,
  batchIndex: number,
  modelId?: number,
): Promise<KnowledgeIngestJob> {
  const job = ingestJobs.get(jobId)
  if (!job) throw new Error('任务不存在或已过期')

  const chapters = ingestJobChapters.get(jobId)
  if (!chapters?.length) throw new Error('该任务的章节缓存不存在，无法重新提炼')

  const index = Number(batchIndex)
  if (!Number.isInteger(index) || index < 0 || index >= Math.max(job.total_batches, 1)) {
    throw new Error('batch_index 无效')
  }

  const start = index * job.batch_size
  const batchChapters = chapters.slice(start, start + job.batch_size)
  if (!batchChapters.length) throw new Error('该批次没有可分析章节')

  const batchMeta = job.batches?.[index] || buildIngestBatch(job, index, batchChapters)
  const preferredModelId = Number(modelId || job.model_id || 0) || undefined
  const firstChapter = batchMeta.first_chapter
  const lastChapter = batchMeta.last_chapter

  updateIngestJob(jobId, {
    status: 'running',
    phase: `重新提炼 ${index + 1}/${job.total_batches || 1}`,
    current_batch: index,
    current_chapter: lastChapter,
    current_chapter_title: String(batchChapters[batchChapters.length - 1]?.title || ''),
    current_range: `第${firstChapter}-${lastChapter}章`,
    batches: (job.batches || []).map(item => (
      item.index === index
        ? { ...item, status: 'analyzing' as KnowledgeIngestBatchStatus, error: '', updated_at: nowIso() }
        : item
    )),
  })

  try {
    const entries = await analyzeKnowledge(buildChapterBatchText(batchChapters), batchMeta.source, preferredModelId)
    const currentJob = ingestJobs.get(jobId)
    if (!currentJob) throw new Error('任务不存在或已过期')
    const updatedBatches = (currentJob.batches || []).map(item => (
      item.index === index
        ? { ...item, status: 'completed' as KnowledgeIngestBatchStatus, entries, error: '', updated_at: nowIso() }
        : item
    ))
    const updatedJob: Partial<KnowledgeIngestJob> = {
      status: 'completed',
      phase: '完成',
      progress: 100,
      batches: updatedBatches,
      entries: dedupeKnowledgeEntries(updatedBatches.flatMap(item => item.entries || [])),
      errors: updatedBatches.map(item => item.error).filter(Boolean) as string[],
    }
    updateIngestJob(jobId, updatedJob)
  } catch (error) {
    const currentJob = ingestJobs.get(jobId)
    const errorText = `第${firstChapter}-${lastChapter}章重新提炼失败：${String(error).slice(0, 200)}`
    updateIngestJob(jobId, {
      status: 'completed',
      phase: '完成',
      progress: 100,
      batches: (currentJob?.batches || job.batches || []).map(item => (
        item.index === index
          ? { ...item, status: 'failed' as KnowledgeIngestBatchStatus, error: errorText, updated_at: nowIso() }
          : item
      )),
      errors: [...(currentJob?.errors || job.errors || []), errorText],
    })
    throw new Error(errorText)
  }

  const refreshed = ingestJobs.get(jobId)
  if (!refreshed) throw new Error('任务不存在或已过期')
  return refreshed
}

/**
 * Batch store knowledge entries and optionally sync into a project's memory palace.
 */
export async function batchStoreKnowledge(
  entries: KnowledgeEntry[],
  options?: { project_id?: number; project_title?: string },
): Promise<{ stored: number; synced: number; errors: string[] }> {
  const errors: string[] = []
  let stored = 0
  let synced = 0

  for (const rawEntry of entries) {
    const entry = normalizeKnowledgeEntry(rawEntry)
    try {
      const result = await storeKnowledge({
        category: entry.category,
        content: entry.content,
        source: entry.source,
        source_title: entry.source_title,
        title: entry.title,
        tags: entry.tags,
        genre_tags: entry.genre_tags,
        trope_tags: entry.trope_tags,
        use_case: entry.use_case,
        evidence: entry.evidence,
        chapter_range: entry.chapter_range,
        entities: entry.entities,
        confidence: entry.confidence,
        weight: entry.weight,
        project_id: options?.project_id || entry.project_id,
        project_title: options?.project_title || entry.project_title,
      })
      stored += 1
      if (result?.memory_id) synced += 1
    } catch (e: any) {
      errors.push(`${entry.title || entry.category}: ${String(e.message || e).slice(0, 100)}`)
    }
  }

  return { stored, synced, errors }
}
