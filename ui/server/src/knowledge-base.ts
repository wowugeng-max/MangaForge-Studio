import { execFile } from 'child_process'
import { createHash } from 'crypto'
import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'
import { Database } from 'bun:sqlite'

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

function tryParseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function parseJsonLike(value: any): any {
  if (!value) return null
  if (typeof value === 'object') return value
  const raw = String(value || '').trim()
  if (!raw) return null
  const candidates = [
    raw,
    raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || '',
    raw.match(/\[[\s\S]*\]/)?.[0] || '',
    raw.match(/\{[\s\S]*\}/)?.[0] || '',
  ].filter(Boolean)
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate)
    } catch {
      // try next candidate
    }
  }
  return null
}

function extractKnowledgeRows(result: any): any[] {
  const candidates = [
    result?.parsed,
    result?.content,
    result?.raw?.content,
    result?.raw?.choices?.[0]?.message?.content,
  ]
  for (const candidate of candidates) {
    const parsed = parseJsonLike(candidate)
    if (Array.isArray(parsed)) return parsed
    if (Array.isArray(parsed?.entries)) return parsed.entries
    if (Array.isArray(parsed?.knowledge_entries)) return parsed.knowledge_entries
    if (Array.isArray(parsed?.items)) return parsed.items
  }
  return []
}

function isProviderUploadFailure(error: unknown) {
  return /upload current user input file|upload file failed|Provider upload failed/i.test(String(error))
}

// ── Knowledge Table Operations ──

export interface KnowledgeEntry {
  id: string
  category: string
  project_id?: number
  project_title?: string
  source: string
  source_title?: string
  title?: string
  content: string
  tags: string[]
  genre_tags?: string[]
  trope_tags?: string[]
  use_case?: string
  evidence?: string
  chapter_range?: string
  entities?: string[]
  confidence?: number
  weight: number
  created_at: string
}

export interface KnowledgeSummary {
  [category: string]: { label: string; count: number }
}

export type KnowledgeIngestJobStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'canceled'
export type KnowledgeIngestBatchStatus = 'pending' | 'analyzing' | 'completed' | 'failed'

export interface KnowledgeIngestBatch {
  index: number
  status: KnowledgeIngestBatchStatus
  first_chapter: number | string
  last_chapter: number | string
  chapter_count: number
  title: string
  source: string
  entries: KnowledgeEntry[]
  error?: string
  updated_at: string
}

export interface KnowledgeIngestJob {
  id: string
  status: KnowledgeIngestJobStatus
  phase: string
  progress: number
  url: string
  model_id?: number
  full_book?: boolean
  fetch_only?: boolean
  auto_store?: boolean
  project_id?: number
  project_title?: string
  start_chapter: number
  max_chapters: number
  batch_size: number
  fetch_concurrency?: number
  fetched_chapters: number
  analyzed_batches: number
  total_batches: number
  current_batch?: number
  current_chapter?: number | string
  current_chapter_title?: string
  current_range?: string
  batches: KnowledgeIngestBatch[]
  entries: KnowledgeEntry[]
  stored_count?: number
  synced_count?: number
  source_cache?: {
    status: 'miss' | 'hit' | 'partial'
    cache_key: string
    cached_chapters: number
    fetched_chapters: number
    complete?: boolean
  }
  errors: string[]
  created_at: string
  updated_at: string
}

const ingestJobs = new Map<string, KnowledgeIngestJob>()
const ingestJobChapters = new Map<string, any[]>()
const ingestJobControllers = new Map<string, AbortController>()

type SourceCachedChapter = {
  chapter: number
  title: string
  text: string
  url: string
  length?: number
  content_hash: string
  fetched_at: string
}

type SourceCacheRecord = {
  cache_key: string
  project_title: string
  source_url: string
  canonical_source_url: string
  complete: boolean
  chapters: SourceCachedChapter[]
  created_at: string
  updated_at: string
}

export type SourceCacheSummary = {
  cache_key: string
  project_title: string
  source_url: string
  canonical_source_url: string
  complete: boolean
  chapter_count: number
  first_chapter: number
  last_chapter: number
  total_chars: number
  updated_at: string
  chapters: Array<{
    chapter: number
    title: string
    length: number
    url: string
  }>
}

function canonicalSourceUrl(url: string) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    parsed.hash = ''
    parsed.search = ''
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return raw.replace(/[?#].*$/, '').replace(/\/$/, '')
  }
}

function sourceCacheKey(projectTitle: string, sourceUrl: string) {
  return createHash('sha1')
    .update(`${String(projectTitle || '').trim()}\n${canonicalSourceUrl(sourceUrl)}`)
    .digest('hex')
    .slice(0, 20)
}

async function activeWorkspacePath() {
  const { loadActiveWorkspace } = await import('./workspace')
  return loadActiveWorkspace()
}

async function legacySourceCacheRoot() {
  const workspace = await activeWorkspacePath()
  return join(workspace, 'source-cache')
}

function sqliteDbPathFromEnv() {
  const raw = process.env.SQLITE_DATABASE_URL || process.env.DATABASE_URL || ''
  if (!raw) return ''
  if (raw.startsWith('file:')) return raw.slice(5).split('?', 1)[0]
  return raw
}

async function openSourceCacheDb() {
  const workspace = await activeWorkspacePath()
  const db = new Database(sqliteDbPathFromEnv() || join(workspace, 'novel.sqlite'))
  ensureSourceCacheSchema(db)
  await importLegacySourceCacheJson(db)
  return db
}

function ensureSourceCacheSchema(db: Database) {
  db.exec(`
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS source_books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cache_key TEXT NOT NULL UNIQUE,
  project_title TEXT NOT NULL,
  source_url TEXT NOT NULL,
  canonical_source_url TEXT NOT NULL,
  complete INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_source_books_project_source
  ON source_books(project_title, canonical_source_url);
CREATE TABLE IF NOT EXISTS source_chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  chapter_no INTEGER NOT NULL,
  title TEXT DEFAULT '',
  url TEXT DEFAULT '',
  text TEXT NOT NULL,
  length INTEGER DEFAULT 0,
  content_hash TEXT DEFAULT '',
  fetched_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  fetch_status TEXT DEFAULT 'ok',
  FOREIGN KEY(book_id) REFERENCES source_books(id) ON DELETE CASCADE,
  UNIQUE(book_id, chapter_no)
);
CREATE INDEX IF NOT EXISTS idx_source_chapters_book_chapter
  ON source_chapters(book_id, chapter_no);
CREATE TABLE IF NOT EXISTS source_cache_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`)
}

async function importLegacySourceCacheJson(db: Database) {
  const imported = db.query("SELECT value FROM source_cache_meta WHERE key = 'legacy_json_imported'").get() as any
  if (String(imported?.value || '') === '1') return

  try {
    const root = await legacySourceCacheRoot()
    if (existsSync(root)) {
      const files = readdirSync(root).filter(file => /^[a-f0-9]{20}\.json$/i.test(file))
      for (const file of files) {
        try {
          const key = file.replace(/\.json$/i, '')
          const parsed = JSON.parse(readFileSync(join(root, file), 'utf8'))
          const record = parseSourceCacheRecord(parsed, { cache_key: key })
          if (record.cache_key && record.project_title) upsertSourceCacheRecord(db, record)
        } catch {
          // Ignore malformed legacy cache files; new writes go to SQLite only.
        }
      }
    }
  } finally {
    db.query(`
INSERT INTO source_cache_meta (key, value, updated_at)
VALUES ('legacy_json_imported', '1', ?)
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
`).run(nowIso())
  }
}

function parseSourceCacheRecord(parsed: any, fallback?: {
  cache_key?: string
  project_title?: string
  source_url?: string
}): SourceCacheRecord {
  const projectTitle = String(parsed.project_title || fallback?.project_title || '').trim()
  const sourceUrl = String(parsed.source_url || fallback?.source_url || '')
  return {
    cache_key: String(parsed.cache_key || fallback?.cache_key || sourceCacheKey(projectTitle, sourceUrl)),
    project_title: projectTitle,
    source_url: sourceUrl,
    canonical_source_url: String(parsed.canonical_source_url || canonicalSourceUrl(sourceUrl)),
    complete: Boolean(parsed.complete),
    chapters: Array.isArray(parsed.chapters)
      ? parsed.chapters
          .map((item: any) => ({
            chapter: Number(item.chapter || 0),
            title: String(item.title || ''),
            text: String(item.text || ''),
            url: String(item.url || ''),
            length: Number(item.length || String(item.text || '').length),
            content_hash: String(item.content_hash || ''),
            fetched_at: String(item.fetched_at || ''),
          }))
          .filter((item: SourceCachedChapter) => item.chapter > 0 && item.text)
          .sort((a: SourceCachedChapter, b: SourceCachedChapter) => a.chapter - b.chapter)
      : [],
    created_at: String(parsed.created_at || nowIso()),
    updated_at: String(parsed.updated_at || nowIso()),
  }
}

async function readSourceCache(projectTitle: string, sourceUrl: string): Promise<SourceCacheRecord | null> {
  const title = String(projectTitle || '').trim()
  if (!title) return null
  const db = await openSourceCacheDb()
  try {
    const canonical = canonicalSourceUrl(sourceUrl)
    const book = db.query(`
SELECT * FROM source_books
WHERE project_title = ? AND canonical_source_url = ?
LIMIT 1
`).get(title, canonical) as any
    return book ? sourceCacheRecordFromBook(db, book) : null
  } catch {
    return null
  } finally {
    db.close()
  }
}

async function readSourceCacheByKey(cacheKey: string): Promise<SourceCacheRecord | null> {
  const key = String(cacheKey || '').trim()
  if (!/^[a-f0-9]{20}$/i.test(key)) return null
  const db = await openSourceCacheDb()
  try {
    const book = db.query('SELECT * FROM source_books WHERE cache_key = ? LIMIT 1').get(key) as any
    return book ? sourceCacheRecordFromBook(db, book) : null
  } catch {
    return null
  } finally {
    db.close()
  }
}

function sourceCacheRecordFromBook(db: Database, book: any): SourceCacheRecord {
  const chapters = db.query(`
SELECT chapter_no, title, text, url, length, content_hash, fetched_at
FROM source_chapters
WHERE book_id = ?
ORDER BY chapter_no ASC
`).all(Number(book.id || 0)) as any[]

  return {
    cache_key: String(book.cache_key || ''),
    project_title: String(book.project_title || ''),
    source_url: String(book.source_url || ''),
    canonical_source_url: String(book.canonical_source_url || ''),
    complete: Boolean(Number(book.complete || 0)),
    chapters: chapters
      .map(row => ({
        chapter: Number(row.chapter_no || 0),
        title: String(row.title || ''),
        text: String(row.text || ''),
        url: String(row.url || ''),
        length: Number(row.length || String(row.text || '').length),
        content_hash: String(row.content_hash || ''),
        fetched_at: String(row.fetched_at || ''),
      }))
      .filter(item => item.chapter > 0 && item.text),
    created_at: String(book.created_at || ''),
    updated_at: String(book.updated_at || ''),
  }
}

function summarizeSourceCache(record: SourceCacheRecord): SourceCacheSummary {
  const chapters = [...record.chapters].sort((a, b) => a.chapter - b.chapter)
  return {
    cache_key: record.cache_key,
    project_title: record.project_title,
    source_url: record.source_url,
    canonical_source_url: record.canonical_source_url,
    complete: record.complete,
    chapter_count: chapters.length,
    first_chapter: Number(chapters[0]?.chapter || 0),
    last_chapter: Number(chapters[chapters.length - 1]?.chapter || 0),
    total_chars: chapters.reduce((sum, chapter) => sum + Number(chapter.length || chapter.text.length || 0), 0),
    updated_at: record.updated_at,
    chapters: chapters.map(chapter => ({
      chapter: chapter.chapter,
      title: chapter.title || `第${chapter.chapter}章`,
      length: Number(chapter.length || chapter.text.length || 0),
      url: chapter.url,
    })),
  }
}

export async function listSourceCaches(): Promise<SourceCacheSummary[]> {
  const db = await openSourceCacheDb()
  try {
    const books = db.query('SELECT * FROM source_books ORDER BY updated_at DESC').all() as any[]
    return books.map(book => summarizeSourceCache(sourceCacheRecordFromBook(db, book)))
  } finally {
    db.close()
  }
}

export async function getSourceCache(cacheKey: string): Promise<SourceCacheSummary | null> {
  const record = await readSourceCacheByKey(cacheKey)
  return record ? summarizeSourceCache(record) : null
}

export async function getSourceCachedChapter(cacheKey: string, chapterNo: number): Promise<any | null> {
  const record = await readSourceCacheByKey(cacheKey)
  if (!record) return null
  const chapter = record.chapters.find(item => item.chapter === chapterNo)
  if (!chapter) return null
  return {
    cache_key: record.cache_key,
    project_title: record.project_title,
    source_url: record.source_url,
    complete: record.complete,
    chapter: chapter.chapter,
    title: chapter.title || `第${chapter.chapter}章`,
    text: chapter.text,
    length: Number(chapter.length || chapter.text.length || 0),
    url: chapter.url,
    content_hash: chapter.content_hash,
    fetched_at: chapter.fetched_at,
    updated_at: record.updated_at,
  }
}

function normalizeCachedChapter(item: any): SourceCachedChapter | null {
  const text = String(item?.text || '').trim()
  const chapter = Number(item?.chapter || 0)
  if (!chapter || !text) return null
  return {
    chapter,
    title: String(item?.title || `第${chapter}章`),
    text,
    url: String(item?.url || ''),
    length: Number(item?.length || text.length),
    content_hash: String(item?.content_hash || createHash('sha1').update(text).digest('hex')),
    fetched_at: String(item?.fetched_at || nowIso()),
  }
}

function upsertSourceCacheRecord(db: Database, record: SourceCacheRecord) {
  const timestamp = nowIso()
  const createdAt = record.created_at || timestamp
  const updatedAt = record.updated_at || timestamp
  const transaction = db.transaction(() => {
    db.query(`
INSERT INTO source_books (
  cache_key, project_title, source_url, canonical_source_url, complete, created_at, updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(cache_key) DO UPDATE SET
  project_title = excluded.project_title,
  source_url = excluded.source_url,
  canonical_source_url = excluded.canonical_source_url,
  complete = CASE WHEN source_books.complete = 1 OR excluded.complete = 1 THEN 1 ELSE 0 END,
  updated_at = excluded.updated_at
`).run(
      record.cache_key,
      record.project_title,
      record.source_url,
      record.canonical_source_url,
      record.complete ? 1 : 0,
      createdAt,
      updatedAt,
    )

    const book = db.query('SELECT id, complete FROM source_books WHERE cache_key = ? LIMIT 1').get(record.cache_key) as any
    const bookId = Number(book?.id || 0)
    if (!bookId) return

    const insertChapter = db.query(`
INSERT INTO source_chapters (
  book_id, chapter_no, title, url, text, length, content_hash, fetched_at, updated_at, fetch_status
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ok')
ON CONFLICT(book_id, chapter_no) DO UPDATE SET
  title = excluded.title,
  url = excluded.url,
  text = excluded.text,
  length = excluded.length,
  content_hash = excluded.content_hash,
  fetched_at = excluded.fetched_at,
  updated_at = excluded.updated_at,
  fetch_status = 'ok'
`)

    for (const raw of record.chapters || []) {
      const chapter = normalizeCachedChapter(raw)
      if (!chapter) continue
      insertChapter.run(
        bookId,
        chapter.chapter,
        chapter.title,
        chapter.url,
        chapter.text,
        Number(chapter.length || chapter.text.length || 0),
        chapter.content_hash,
        chapter.fetched_at || updatedAt,
        updatedAt,
      )
    }
  })
  transaction()
}

async function writeSourceCache(
  projectTitle: string,
  sourceUrl: string,
  chapters: any[],
  complete: boolean,
): Promise<SourceCacheRecord | null> {
  const title = String(projectTitle || '').trim()
  if (!title) return null
  const db = await openSourceCacheDb()
  try {
    const existingBook = db.query(`
SELECT * FROM source_books
WHERE project_title = ? AND canonical_source_url = ?
LIMIT 1
`).get(title, canonicalSourceUrl(sourceUrl)) as any
    const existing = existingBook ? sourceCacheRecordFromBook(db, existingBook) : null
    const chapterMap = new Map<number, SourceCachedChapter>()
    for (const item of existing?.chapters || []) chapterMap.set(item.chapter, item)
    for (const raw of chapters) {
      const item = normalizeCachedChapter(raw)
      if (item) chapterMap.set(item.chapter, item)
    }
    const timestamp = nowIso()
    const record: SourceCacheRecord = {
      cache_key: sourceCacheKey(title, sourceUrl),
      project_title: title,
      source_url: sourceUrl,
      canonical_source_url: canonicalSourceUrl(sourceUrl),
      complete: Boolean(complete || existing?.complete),
      chapters: Array.from(chapterMap.values()).sort((a, b) => a.chapter - b.chapter),
      created_at: existing?.created_at || timestamp,
      updated_at: timestamp,
    }
    upsertSourceCacheRecord(db, record)
    const saved = db.query('SELECT * FROM source_books WHERE cache_key = ? LIMIT 1').get(record.cache_key) as any
    return saved ? sourceCacheRecordFromBook(db, saved) : record
  } finally {
    db.close()
  }
}

function contiguousCachedChapters(cache: SourceCacheRecord | null, startChapter: number, maxChapters: number) {
  if (!cache?.chapters?.length) return []
  const byNo = new Map(cache.chapters.map(chapter => [chapter.chapter, chapter]))
  const result: SourceCachedChapter[] = []
  let expected = Math.max(1, Number(startChapter || 1) || 1)
  while (byNo.has(expected) && (maxChapters <= 0 || result.length < maxChapters)) {
    result.push(byNo.get(expected)!)
    expected += 1
  }
  return result
}

function cachedChapterToFetchItem(item: SourceCachedChapter) {
  return {
    status: 'ok',
    chapter: item.chapter,
    title: item.title,
    text: item.text,
    length: item.length || item.text.length,
    url: item.url,
    cached: true,
  }
}

function makeChapterSeenKey(item: any, fallback: number | string) {
  return String(item?.url || item?.chapter || fallback)
}

function scheduleKnowledgeIngestJob(jobId: string) {
  const start = () => {
    if (ingestJobControllers.has(jobId)) {
      setTimeout(start, 200)
      return
    }
    const job = ingestJobs.get(jobId)
    if (!job || job.status === 'completed' || job.status === 'running') return
    void runKnowledgeIngestJob(jobId)
  }
  setTimeout(start, 0)
}

function normalizeKnowledgeEntry(raw: Partial<KnowledgeEntry>): KnowledgeEntry {
  const normalizeList = (value: any): string[] => {
    if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean)
    if (typeof value === 'string') {
      const parsed = tryParseJson<any>(value, null)
      if (Array.isArray(parsed)) return parsed.map(item => String(item).trim()).filter(Boolean)
      return value.split(/[,，\n]/).map(item => item.trim()).filter(Boolean)
    }
    return []
  }

  return {
    id: String(raw.id || ''),
    category: String(raw.category || 'general').trim() || 'general',
    project_id: Number(raw.project_id || 0) || 0,
    project_title: String(raw.project_title || '').trim(),
    source: String(raw.source || '知识库导入').trim() || '知识库导入',
    source_title: String(raw.source_title || raw.source || '知识库导入').trim() || '知识库导入',
    title: String(raw.title || '').trim(),
    content: String(raw.content || '').trim(),
    tags: normalizeList(raw.tags),
    genre_tags: normalizeList(raw.genre_tags),
    trope_tags: normalizeList(raw.trope_tags),
    use_case: String(raw.use_case || '').trim(),
    evidence: String(raw.evidence || '').trim(),
    chapter_range: String(raw.chapter_range || '').trim(),
    entities: normalizeList(raw.entities),
    confidence: Math.max(0, Math.min(1, Number(raw.confidence || 0) || 0)),
    weight: Math.max(1, Math.min(5, Number(raw.weight || 3) || 3)),
    created_at: String(raw.created_at || ''),
  }
}

function nowIso() {
  return new Date().toISOString()
}

function updateIngestJob(id: string, patch: Partial<KnowledgeIngestJob>) {
  const existing = ingestJobs.get(id)
  if (!existing) return
  ingestJobs.set(id, {
    ...existing,
    ...patch,
    updated_at: nowIso(),
  })
}

function normalizeDedupeText(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，。、“”‘’：:；;,.!?！？（）()[\]【】《》]/g, '')
}

function mergeStringLists(...lists: Array<string[] | undefined>) {
  return Array.from(new Set(
    lists.flatMap(list => list || []).map(item => String(item).trim()).filter(Boolean),
  ))
}

function dedupeKnowledgeEntries(entries: KnowledgeEntry[]): KnowledgeEntry[] {
  const merged = new Map<string, KnowledgeEntry>()

  for (const raw of entries) {
    const entry = normalizeKnowledgeEntry(raw)
    if (!entry.content) continue
    const titleKey = normalizeDedupeText(entry.title || '').slice(0, 40)
    const contentKey = normalizeDedupeText(entry.content).slice(0, 120)
    const key = `${entry.category}:${titleKey || contentKey}`
    const existing = merged.get(key)

    if (!existing) {
      merged.set(key, entry)
      continue
    }

    const tags = mergeStringLists(existing.tags, entry.tags)
    const genreTags = mergeStringLists(existing.genre_tags, entry.genre_tags)
    const tropeTags = mergeStringLists(existing.trope_tags, entry.trope_tags)
    const entities = mergeStringLists(existing.entities, entry.entities)

    merged.set(key, {
      ...existing,
      title: existing.title || entry.title,
      content: entry.content.length > existing.content.length ? entry.content : existing.content,
      tags,
      genre_tags: genreTags,
      trope_tags: tropeTags,
      use_case: existing.use_case || entry.use_case,
      evidence: existing.evidence || entry.evidence,
      chapter_range: existing.chapter_range || entry.chapter_range,
      entities,
      confidence: Math.max(existing.confidence || 0, entry.confidence || 0),
      weight: Math.max(existing.weight || 3, entry.weight || 3),
      source: existing.source || entry.source,
      source_title: existing.source_title || entry.source_title,
    })
  }

  return Array.from(merged.values()).sort((a, b) => (b.weight || 3) - (a.weight || 3))
}

function rebuildIngestJobEntries(job: KnowledgeIngestJob) {
  return dedupeKnowledgeEntries(
    (job.batches || [])
      .filter(batch => batch.status === 'completed')
      .flatMap(batch => batch.entries || []),
  )
}

function buildChapterBatchText(chapters: any[]) {
  return chapters
    .map(chapter => {
      const title = chapter?.title || `第${chapter?.chapter || '?'}章`
      const text = String(chapter?.text || '').trim()
      return `【${title}】\n${text}`
    })
    .join('\n\n')
}

function buildIngestBatch(job: KnowledgeIngestJob, index: number, chapters: any[]): KnowledgeIngestBatch {
  const firstChapter = chapters[0]?.chapter || index * job.batch_size + 1
  const lastChapter = chapters[chapters.length - 1]?.chapter || index * job.batch_size + chapters.length
  const firstTitle = String(chapters[0]?.title || `第${firstChapter}章`)
  const lastTitle = String(chapters[chapters.length - 1]?.title || `第${lastChapter}章`)
  const range = `第${firstChapter}-${lastChapter}章`
  return {
    index,
    status: 'pending',
    first_chapter: firstChapter,
    last_chapter: lastChapter,
    chapter_count: chapters.length,
    title: firstTitle === lastTitle ? firstTitle : `${firstTitle} → ${lastTitle}`,
    source: `${job.url}（${range}）`,
    entries: [],
    updated_at: nowIso(),
  }
}

function mapKnowledgeToMemoryCategory(entry: KnowledgeEntry): 'worldbuilding' | 'character' | 'plot' | 'foreshadowing' | 'prose' | 'general' {
  const corpus = [
    entry.category,
    entry.title,
    entry.content,
    ...(entry.tags || []),
  ].join(' ').toLowerCase()

  if (/character|character_design|character_craft|人物|角色|人设|群像/.test(corpus)) return 'character'
  if (/foreshadow|伏笔|悬念|钩子|回收/.test(corpus)) return 'foreshadowing'
  if (/writing_style|style_profile|文风|语言|叙事|视角|修辞|笔触/.test(corpus)) return 'prose'
  if (/world|worldbuilding|ability_design|realm_design|resource_economy|体系|设定|世界观|能力|境界|资源|经济|价格|装备|realm|power|cultivation|faction|宗门|势力/.test(corpus)) return 'worldbuilding'
  if (/pace|reference_profile|chapter_beat_template|character_function_matrix|story_pacing|story_design|volume_design|volume_architecture|genre_positioning|trope_design|selling_point|reader_hook|emotion_design|scene_design|conflict_design|节奏|题材|套路|卖点|爽点|情绪|场景|故事|剧情|story|plot|结构|分卷|章纲|冲突|推进|反转|角色功能|蓝图/.test(corpus)) return 'plot'
  return 'general'
}

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
  const fetchConcurrency = Math.max(1, Math.min(12, Number(concurrency || 1) || 1))
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

async function fetchIngestChapters(jobId: string, job: KnowledgeIngestJob, signal: AbortSignal): Promise<any[]> {
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
  const chunkSize = Math.max(5, Math.min(30, Number(job.batch_size || 5) * 4))
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

    const raw = await playwrightFetchSerial(job.url, chunkSize, nextStart, signal, job.fetch_concurrency || 1)
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

/**
 * Analyze text using LLM to extract writing knowledge.
 */
export async function analyzeKnowledge(text: string, source: string, modelId?: number, options?: {
  signal?: AbortSignal
  timeoutMs?: number
  maxRetries?: number
}): Promise<KnowledgeEntry[]> {
  const { buildNovelAnalysisPrompt } = await import('./llm/prompts')
  const { executeWithRuntimeModel } = await import('./llm/provider-runtime')
  const { loadActiveWorkspace } = await import('./workspace')

  const workspace = await loadActiveWorkspace()
  const preferredModelId = Number(modelId || 0) || undefined
  const limits = [12000, 8000, 5000, 3000]
  let lastError: unknown = null

  for (const limit of limits) {
    if (options?.signal?.aborted) throw new Error('Request canceled')
    const prompt = buildNovelAnalysisPrompt(source, text.slice(0, limit))
    try {
      const result = await executeWithRuntimeModel<any[]>(
        workspace,
        {
          model: 'balanced',
          messages: [
            { role: 'system', content: '你是一位资深的文学评论家和写作导师。你只输出合法 JSON 数组。' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: limit <= 5000 ? 3072 : 4096,
          response_format: 'json',
        },
        preferredModelId,
        {
          signal: options?.signal,
          timeoutMs: options?.timeoutMs,
          maxRetries: options?.maxRetries ?? 2,
        },
      )

      if (result.error) {
        throw new Error(result.error)
      }

      const parsed = extractKnowledgeRows(result)
      return parsed
        .filter(Boolean)
        .map((row: any) => normalizeKnowledgeEntry({
          category: row?.category,
          title: row?.title,
          content: row?.content,
          tags: row?.tags,
          genre_tags: row?.genre_tags,
          trope_tags: row?.trope_tags,
          use_case: row?.use_case,
          evidence: row?.evidence,
          chapter_range: row?.chapter_range,
          entities: row?.entities,
          confidence: row?.confidence,
          weight: row?.weight,
          source,
          source_title: source,
        }))
        .filter(entry => Boolean(entry.content))
    } catch (error) {
      lastError = error
      if (isProviderUploadFailure(error)) {
        throw new Error(`Provider upload failed：模型服务上传输入失败，请切换模型或检查当前模型代理。${String(error).slice(0, 300)}`)
      }
      if (limit === limits[limits.length - 1]) {
        throw error
      }
      console.warn(`[knowledge-ingest] Analyze failed for ${source}; retrying with smaller prompt (${limit} -> next): ${String(error).slice(0, 160)}`)
    }
  }

  throw new Error(String(lastError || 'AI 未提炼出可入库知识'))
}

function compactEntryForSynthesis(entry: KnowledgeEntry, index: number) {
  return {
    index: index + 1,
    category: entry.category,
    title: entry.title,
    content: entry.content.slice(0, 650),
    tags: entry.tags || [],
    genre_tags: entry.genre_tags || [],
    trope_tags: entry.trope_tags || [],
    use_case: entry.use_case || '',
    evidence: entry.evidence || '',
    chapter_range: entry.chapter_range || entry.source_title || '',
    entities: entry.entities || [],
    weight: entry.weight || 3,
    confidence: entry.confidence || 0,
  }
}

async function synthesizeFullBookKnowledge(
  job: KnowledgeIngestJob,
  entries: KnowledgeEntry[],
  chapters: any[],
  signal?: AbortSignal,
): Promise<KnowledgeEntry[]> {
  if (!entries.length) return []

  const { executeWithRuntimeModel } = await import('./llm/provider-runtime')
  const { loadActiveWorkspace } = await import('./workspace')
  const workspace = await loadActiveWorkspace()

  const firstChapter = chapters[0]?.chapter || job.start_chapter || 1
  const lastChapter = chapters[chapters.length - 1]?.chapter || chapters.length
  const chapterRange = `第${firstChapter}-${lastChapter}章`
  const chapterSamples = chapters.slice(0, 12).map(ch => ({
    chapter: ch.chapter,
    title: String(ch.title || '').slice(0, 80),
  }))
  const compactEntries = entries.slice(0, 120).map(compactEntryForSynthesis)

  const prompt = `你是一位资深网文拆书策划和小说知识库架构师。现在有一部小说的分批提炼结果，请你做“全书级合并、去重、画像总结”。

任务目标：
1. 合并重复或高度相似的知识点，保留更抽象、更可复用的写作规则。
2. 补齐全书画像：题材定位、核心卖点、套路模板、读者钩子、情绪设计、资源经济、长期冲突、能力/境界/世界观体系。
3. 额外抽象成可用于“参考仿写”的结构蓝图：全书公式、分卷架构、章节节拍模板、角色功能矩阵、文风画像、资源经济模型。
4. 每条知识必须可用于后续创作检索，不要只做剧情摘要。
5. 重要信息不要丢：如果多个批次都支持同一条规则，把证据和章节范围合并概括。

来源：${job.url}
章节范围：${chapterRange}
章节样本：${JSON.stringify(chapterSamples, null, 2)}
分批知识候选：
${JSON.stringify(compactEntries, null, 2).slice(0, 52000)}

请输出纯 JSON 数组，每个元素字段如下：
- category: 固定类别优先，可用 reference_profile/volume_architecture/chapter_beat_template/character_function_matrix/resource_economy_model/style_profile/character_design/story_design/story_pacing/foreshadowing/ability_design/realm_design/worldbuilding/writing_style/technique/volume_design/genre_positioning/trope_design/selling_point/reader_hook/emotion_design/scene_design/conflict_design/resource_economy
- title: 简短标题
- content: 200-500 字，写成可复用规则，包含具体例子
- tags: 普通标签数组
- genre_tags: 题材/子类型标签数组
- trope_tags: 套路/卖点标签数组
- use_case: 适用写作任务
- evidence: 支撑该规则的原文/情节证据概括，不超过 120 字
- chapter_range: 该知识主要依据的章节范围
- entities: 涉及角色、物品、能力、势力、地点数组
- confidence: 0-1
- weight: 1-5

数量要求：输出 22-52 条。必须覆盖 reference_profile、chapter_beat_template、character_function_matrix、style_profile、genre_positioning、selling_point、reader_hook、emotion_design、conflict_design；如果文本涉及金钱、装备、修炼成本或资源流转，必须包含 resource_economy_model 和 resource_economy；如果存在明显阶段/分卷推进，必须包含 volume_architecture。
profile 类条目必须写成“可迁移蓝图”，明确说明可借鉴结构、使用场景、避免照搬点，不要复述源作品专名。
不要返回 markdown，不要解释，只返回 JSON 数组。`

  const result = await executeWithRuntimeModel<any[]>(
    workspace,
    {
      model: 'balanced',
      messages: [
        { role: 'system', content: '你只输出合法 JSON 数组，不输出 markdown。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.25,
      max_tokens: 8192,
      response_format: 'json',
    },
    Number(job.model_id || 0) || undefined,
    {
      signal,
    },
  )

  if (result.error) throw new Error(result.error)
  const parsed = extractKnowledgeRows(result)

  const synthesized = parsed
    .filter(Boolean)
    .map((row: any) => normalizeKnowledgeEntry({
      category: row?.category,
      title: row?.title,
      content: row?.content,
      tags: row?.tags,
      genre_tags: row?.genre_tags,
      trope_tags: row?.trope_tags,
      use_case: row?.use_case,
      evidence: row?.evidence,
      chapter_range: row?.chapter_range || chapterRange,
      entities: row?.entities,
      confidence: row?.confidence,
      weight: row?.weight,
      source: `${job.url}（全书画像）`,
      source_title: `${job.url}（全书画像）`,
    }))
    .filter(entry => Boolean(entry.content))

  return synthesized.length ? dedupeKnowledgeEntries(synthesized) : entries
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

async function runKnowledgeIngestJob(jobId: string) {
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
  const fetchConcurrency = Math.max(1, Math.min(12, Number(input.fetch_concurrency || 1) || 1))
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
