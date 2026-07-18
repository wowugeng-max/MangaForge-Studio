import type {
  KnowledgeEntry,
  KnowledgeIngestBatch,
  KnowledgeIngestJob,
} from './types'

export function tryParseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function parseJsonLike(value: any): any {
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

export function extractKnowledgeRows(result: any): any[] {
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

export function isProviderUploadFailure(error: unknown) {
  return /upload current user input file|upload file failed|Provider upload failed/i.test(String(error))
}

export function nowIso() {
  return new Date().toISOString()
}

export function normalizeKnowledgeEntry(raw: Partial<KnowledgeEntry>): KnowledgeEntry {
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

export function normalizeDedupeText(value: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，。、“”‘’：:；;,.!?！？（）()[\]【】《》]/g, '')
}

export function mergeStringLists(...lists: Array<string[] | undefined>) {
  return Array.from(new Set(
    lists.flatMap(list => list || []).map(item => String(item).trim()).filter(Boolean),
  ))
}

export function dedupeKnowledgeEntries(entries: KnowledgeEntry[]): KnowledgeEntry[] {
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

export function rebuildIngestJobEntries(job: KnowledgeIngestJob) {
  return dedupeKnowledgeEntries(
    (job.batches || [])
      .filter(batch => batch.status === 'completed')
      .flatMap(batch => batch.entries || []),
  )
}

export function buildChapterBatchText(chapters: any[]) {
  return chapters
    .map(chapter => {
      const title = chapter?.title || `第${chapter?.chapter || '?'}章`
      const text = String(chapter?.text || '').trim()
      return `【${title}】\n${text}`
    })
    .join('\n\n')
}

export function buildIngestBatch(job: KnowledgeIngestJob, index: number, chapters: any[]): KnowledgeIngestBatch {
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

export function mapKnowledgeToMemoryCategory(entry: KnowledgeEntry): 'worldbuilding' | 'character' | 'plot' | 'foreshadowing' | 'prose' | 'general' {
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

export function compactEntryForSynthesis(entry: KnowledgeEntry, index: number) {
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
