import { createHash } from 'crypto'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { Database } from 'bun:sqlite'
import type {
  SourceCachedChapter,
  SourceCacheRecord,
  SourceCacheSummary,
} from './types'
import { nowIso } from './pure-helpers'

export function canonicalSourceUrl(url: string) {
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

export function sourceCacheKey(projectTitle: string, sourceUrl: string) {
  return createHash('sha1')
    .update(`${String(projectTitle || '').trim()}\n${canonicalSourceUrl(sourceUrl)}`)
    .digest('hex')
    .slice(0, 20)
}

async function activeWorkspacePath() {
  const { loadActiveWorkspace } = await import('../workspace')
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

export async function readSourceCache(projectTitle: string, sourceUrl: string): Promise<SourceCacheRecord | null> {
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

export async function writeSourceCache(
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

export function contiguousCachedChapters(cache: SourceCacheRecord | null, startChapter: number, maxChapters: number) {
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

export function cachedChapterToFetchItem(item: SourceCachedChapter) {
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

