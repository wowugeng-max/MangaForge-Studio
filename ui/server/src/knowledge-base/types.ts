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

export type SourceCachedChapter = {
  chapter: number
  title: string
  text: string
  url: string
  length?: number
  content_hash: string
  fetched_at: string
}

export type SourceCacheRecord = {
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
