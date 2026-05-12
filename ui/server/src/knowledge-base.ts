import { execFile } from 'child_process'
import { existsSync, unlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'

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

export type KnowledgeIngestJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled'
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
  auto_store?: boolean
  project_id?: number
  project_title?: string
  start_chapter: number
  max_chapters: number
  batch_size: number
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
  errors: string[]
  created_at: string
  updated_at: string
}

const ingestJobs = new Map<string, KnowledgeIngestJob>()
const ingestJobChapters = new Map<string, any[]>()
const ingestJobControllers = new Map<string, AbortController>()

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
export async function playwrightFetchSerial(url: string, maxChapters: number = 500, startChapter: number = 1, signal?: AbortSignal): Promise<any> {
  const py = getPythonPath()
  const fullBook = Number(maxChapters || 0) <= 0
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
  const prompt = buildNovelAnalysisPrompt(source, text.slice(0, 12000))
  const preferredModelId = Number(modelId || 0) || undefined

  const result = await executeWithRuntimeModel<any[]>(
    workspace,
    {
      model: 'balanced',
      messages: [
        { role: 'system', content: '你是一位资深的文学评论家和写作导师。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      response_format: 'json',
    },
    preferredModelId,
    {
      signal: options?.signal,
      timeoutMs: options?.timeoutMs,
      maxRetries: options?.maxRetries,
    },
  )

  if (result.error) {
    throw new Error(result.error)
  }

  const parsed = Array.isArray(result.parsed)
    ? result.parsed
    : tryParseJson<any[]>(result.content, [])

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
  const parsed = Array.isArray(result.parsed)
    ? result.parsed
    : tryParseJson<any[]>(result.content, [])

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

async function runKnowledgeIngestJob(jobId: string) {
  const job = ingestJobs.get(jobId)
  if (!job) return
  const controller = new AbortController()
  ingestJobControllers.set(jobId, controller)
  const ensureNotCanceled = () => {
    if (controller.signal.aborted || ingestJobs.get(jobId)?.status === 'canceled') {
      throw new Error('任务已取消')
    }
  }

  try {
    ensureNotCanceled()
    updateIngestJob(jobId, {
      status: 'running',
      phase: '抓取章节',
      progress: 5,
    })

    const raw = await playwrightFetchSerial(job.url, job.max_chapters, job.start_chapter, controller.signal)
    ensureNotCanceled()
    const chapters = Array.isArray(raw)
      ? raw.filter((item: any) => item?.status === 'ok' && String(item?.text || '').trim())
      : []

    if (!chapters.length) {
      throw new Error('未抓取到可分析章节')
    }

    const totalBatches = Math.ceil(chapters.length / job.batch_size)
    ingestJobChapters.set(jobId, chapters)
    const batches = Array.from({ length: totalBatches }, (_, index) => {
      const start = index * job.batch_size
      return buildIngestBatch(job, index, chapters.slice(start, start + job.batch_size))
    })
    updateIngestJob(jobId, {
      fetched_chapters: chapters.length,
      total_batches: totalBatches,
      batches,
      phase: '分批提炼',
      progress: 15,
    })

    const errors: string[] = []

    for (let index = 0; index < totalBatches; index += 1) {
      ensureNotCanceled()
      const start = index * job.batch_size
      const batch = chapters.slice(start, start + job.batch_size)
      const firstChapter = batch[0]?.chapter || start + 1
      const lastChapter = batch[batch.length - 1]?.chapter || start + batch.length
      const source = batches[index]?.source || `${job.url}（第${firstChapter}-${lastChapter}章）`
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
        ensureNotCanceled()
        const currentJob = ingestJobs.get(jobId)
        const updatedBatches = (currentJob?.batches || nextBatches).map(item => (
          item.index === index
            ? { ...item, status: 'completed' as KnowledgeIngestBatchStatus, entries, error: '', updated_at: nowIso() }
            : item
        ))
        const entriesNow = dedupeKnowledgeEntries(updatedBatches.flatMap(item => item.entries || []))
        updateIngestJob(jobId, {
          batches: updatedBatches,
          entries: entriesNow,
        })
      } catch (error) {
        const errorText = `第${firstChapter}-${lastChapter}章分析失败：${String(error).slice(0, 200)}`
        errors.push(errorText)
        const currentJob = ingestJobs.get(jobId)
        updateIngestJob(jobId, {
          batches: (currentJob?.batches || nextBatches).map(item => (
            item.index === index
              ? { ...item, status: 'failed' as KnowledgeIngestBatchStatus, error: errorText, updated_at: nowIso() }
              : item
          )),
        })
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
        ensureNotCanceled()
      } catch (error) {
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
  auto_store?: boolean
  project_id?: number
  project_title?: string
  start_chapter?: number
  max_chapters?: number
  batch_size?: number
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
    auto_store: Boolean(input.auto_store),
    project_id: projectId,
    project_title: projectTitle,
    start_chapter: startChapter,
    max_chapters: maxChapters,
    batch_size: batchSize,
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
  void runKnowledgeIngestJob(id)
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
