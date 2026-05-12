import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCRIPT_DIR = join(__dirname, '..', '..', '..', 'scripts')
const PROJECT_ROOT = join(__dirname, '..', '..', '..')
const VENV_PYTHON = join(SCRIPT_DIR, 'venv', 'bin', 'python3')
const PALACE_DIR_ENV = process.env.MEMPALACE_DIR || join(PROJECT_ROOT, 'mempalace-data')
const LOCK_FILE = join(PROJECT_ROOT, 'mempalace-bootstrap.json')
const PROJECT_INDEX_FILE = join(PALACE_DIR_ENV, 'project-index.json')

export type MemoryCategory = 'worldbuilding' | 'character' | 'plot' | 'foreshadowing' | 'prose' | 'general'

export interface MemoryRecord {
  id: string
  project_id: string
  content: string
  tags: string[]
  category: MemoryCategory
  timestamp: string
  similarity?: number
  distance?: number
}

export interface FactRecord {
  id: string
  project_id: number
  entity: string
  attribute: string
  value: string
  source_memory_id?: string
  chapter_from?: number
  chapter_to?: number
  confidence?: number
}

export interface ContinuityIssue {
  id: string
  project_id: number
  chapter_no?: number
  issue_type: string
  description: string
  severity: string
  status: string
  resolution?: string
}

export interface VerifyResult {
  is_consistent: boolean
  issue_count: number
  issues: Array<{
    type: string
    entity: string
    attribute: string
    new_value: string
    existing_value: string
    source_chapter?: number | string
    severity: string
    description: string
  }>
  related_memories: Array<{ id: string; content: string; category: string; similarity: number }>
}

export interface ReconcileResult {
  total_facts: number
  contradiction_count: number
  contradictions: Array<{
    entity: string
    attribute: string
    values: Array<{ value: string; chapter?: number; source_id?: string }>
  }>
}

export interface MemoryInjection {
  text: string
  memories: MemoryRecord[]
  facts: FactRecord[]
  contradictions: Array<any>
}

export interface MemoryPalaceProjectSummary {
  project_id: number
  project_title: string
  memory_count: number
  fact_count: number
  continuity_issue_count: number
  last_updated_at?: string
}

type MemoryProjectIndexRecord = {
  project_id: number
  project_title: string
  last_updated_at: string
}

function nowIso() {
  return new Date().toISOString()
}

function ensurePalaceDir() {
  if (!existsSync(PALACE_DIR_ENV)) mkdirSync(PALACE_DIR_ENV, { recursive: true })
}

function readProjectIndex(): MemoryProjectIndexRecord[] {
  try {
    ensurePalaceDir()
    const indexFile = join(PALACE_DIR_ENV, 'project-index.json')
    if (!existsSync(indexFile)) return []
    const raw = readFileSync(indexFile, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed
          .map((item: any) => ({
            project_id: Number(item?.project_id || 0),
            project_title: String(item?.project_title || ''),
            last_updated_at: String(item?.last_updated_at || nowIso()),
          }))
          .filter((item: MemoryProjectIndexRecord) => item.project_id > 0 && item.project_title)
      : []
  } catch {
    return []
  }
}

function writeProjectIndex(records: MemoryProjectIndexRecord[]) {
  ensurePalaceDir()
  const indexFile = join(PALACE_DIR_ENV, 'project-index.json')
  writeFileSync(indexFile, `${JSON.stringify(records, null, 2)}\n`, 'utf8')
}

function upsertProjectIndex(projectId: number, projectTitle?: string) {
  const normalizedTitle = String(projectTitle || '').trim()
  if (!projectId || !normalizedTitle) return
  const records = readProjectIndex()
  const idx = records.findIndex(item => item.project_id === projectId)
  const next = { project_id: projectId, project_title: normalizedTitle, last_updated_at: nowIso() }
  if (idx >= 0) records[idx] = next
  else records.push(next)
  writeProjectIndex(records.sort((a, b) => a.project_id - b.project_id))
}

function removeProjectIndex(projectId: number) {
  writeProjectIndex(readProjectIndex().filter(item => item.project_id !== projectId))
}

function assertProjectIdentity(projectId: number, projectTitle?: string) {
  const normalizedTitle = String(projectTitle || '').trim()
  const existing = readProjectIndex().find(item => item.project_id === projectId)
  if (!existing) return { ok: true, normalizedTitle, reason: '' }
  if (!normalizedTitle) return { ok: false, normalizedTitle, reason: 'project title required for memory palace access' }
  if (existing.project_title !== normalizedTitle) {
    return {
      ok: false,
      normalizedTitle,
      reason: `memory palace identity mismatch: expected "${existing.project_title}", received "${normalizedTitle}"`,
    }
  }
  return { ok: true, normalizedTitle, reason: '' }
}

// ─── Python path resolution ───────────────────────────────────────────

let _pythonPath: string | null = null
let _scriptPath: string | null = null
let _mempalaceDisabled = false

function scriptPath(): string | null {
  if (_scriptPath !== undefined) return _scriptPath
  const script = join(SCRIPT_DIR, 'novel-memory.py')
  if (existsSync(script)) {
    _scriptPath = script
    return script
  }
  _scriptPath = null
  _mempalaceDisabled = true
  console.warn('[memory-service] novel-memory.py not found at', script, '— memory palace disabled')
  return null
}

function pythonPath(): string {
  if (_pythonPath) return _pythonPath

  if (process.env.PYTHON_PATH) {
    _pythonPath = process.env.PYTHON_PATH
    return _pythonPath
  }

  try {
    const raw = readFileSync(LOCK_FILE, 'utf8')
    const cached: { python?: string } = JSON.parse(raw)
    if (cached.python && existsSync(cached.python)) {
      _pythonPath = cached.python
      return _pythonPath
    }
  } catch { /* stale or missing */ }

  const candidates: string[] = [
    '/Users/' + process.env.USER + '/.pyenv/shims/python3',
    '/Users/' + process.env.USER + '/.pyenv/versions/3.13.5/bin/python3',
    VENV_PYTHON,
    '/usr/local/bin/python3',
    '/opt/homebrew/bin/python3',
  ]
  for (const c of candidates) {
    if (existsSync(c)) {
      _pythonPath = c
      return _pythonPath
    }
  }

  _pythonPath = 'python3'
  return _pythonPath
}

function cachePythonPath(p: string): void {
  try {
    writeFileSync(LOCK_FILE, JSON.stringify({ python: p }), 'utf8')
  } catch { /* non-fatal */ }
}

// ─── Bootstrap ────────────────────────────────────────────────

let _bootstrapDone = false
let _mempalaceAvailable = false

export async function bootstrapMempalace(): Promise<boolean> {
  if (_bootstrapDone) return _mempalaceAvailable
  _bootstrapDone = true

  const py = pythonPath()
  const bootstrap = join(SCRIPT_DIR, 'ensure-mempalace.py')
  if (!existsSync(bootstrap)) {
    console.warn('[memory-service] ensure-mempalace.py not found, skipping bootstrap')
    return false
  }

  try {
    const { stdout } = await execFileAsync(py, [bootstrap, '--palace-dir', PALACE_DIR_ENV], {
      env: { ...process.env, MEMPALACE_DIR: PALACE_DIR_ENV },
      timeout: 360000,
      maxBuffer: 4 * 1024 * 1024,
    })
    const result: { ok: boolean; python?: string; error?: string } = JSON.parse(stdout.trim())
    if (result.ok) {
      _mempalaceAvailable = true
      if (result.python && result.python !== py) {
        _pythonPath = result.python
        cachePythonPath(result.python)
      }
      console.log(`[memory-service] mempalace bootstrap OK — using ${result.python || py}`)
    } else {
      console.warn('[memory-service] mempalace bootstrap failed:', result.error)
    }
  } catch (error) {
    console.warn('[memory-service] mempalace bootstrap error:', String(error).slice(0, 200))
  }

  return _mempalaceAvailable
}

// ═══════════════════════════════════════════════════════════════
//  Auto-init: ensure DB tables exist before any operation
// ═══════════════════════════════════════════════════════════════

let _dbInitialized = false

async function ensureDbInit(): Promise<void> {
  if (_dbInitialized) return
  const script = join(SCRIPT_DIR, 'novel-memory.py')
  if (!existsSync(script)) { _dbInitialized = true; return } // nothing to init

  try {
    await execFileAsync(pythonPath(), [script, 'init', '--palace-dir', PALACE_DIR_ENV], {
      env: { ...process.env, MEMPALACE_DIR: PALACE_DIR_ENV },
      timeout: 10000,
      maxBuffer: 1024 * 1024,
    })
    _dbInitialized = true
    console.log('[memory-service] DB auto-initialized (tables created)')
  } catch (error) {
    // If init fails, mark as initialized anyway so we don't keep retrying.
    // Individual commands will handle their own errors.
    console.warn('[memory-service] DB init failed (will retry on next command):', String(error).slice(0, 100))
    _dbInitialized = true
  }
}

// ─── Low-level command runner ─────────────────────────────────

async function runMemoryCommand(args: string[]): Promise<any> {
  const script = join(SCRIPT_DIR, 'novel-memory.py')
  if (!existsSync(script)) {
    return { status: 'error', error: 'novel-memory.py not found' }
  }

  // Ensure DB tables exist before any operation
  await ensureDbInit()

  try {
    const result = await execFileAsync(pythonPath(), [script, ...args], {
      env: { ...process.env, MEMPALACE_DIR: PALACE_DIR_ENV },
      timeout: 15000,
      maxBuffer: 1024 * 1024,
    })
    return JSON.parse(result.stdout.trim())
  } catch (error: any) {
    const stderr = error.stderr || ''
    const stdout = error.stdout || ''
    // Log more context for debugging
    const detail = stderr ? stderr.slice(0, 200).replace(/\n/g, ' ') : String(error).slice(0, 120)
    console.error(`[memory-service] command failed: ${args.slice(0, 3).join(' ')} → ${detail}${stdout ? ' | stdout: ' + stdout.slice(0, 100) : ''}`)
    return { status: 'error', error: detail, stdout, stderr }
  }
}

// ═══════════════════════════════════════════════════════════════
//  1. 存入 — Store (memories + facts)
// ═══════════════════════════════════════════════════════════════

export async function initMemoryPalace(): Promise<void> {
  try {
    await runMemoryCommand(['init', '--palace-dir', PALACE_DIR_ENV])
  } catch { /* Non-fatal */ }
}

/** Store a single memory record */
export async function storeMemory(
  projectId: number,
  content: string,
  category: MemoryCategory = 'general',
  tags: string[] = [],
  chapterNo?: number,
): Promise<string> {
  try {
    const cmd: string[] = [
      'store',
      '--project', String(projectId),
      '--content', content,
      '--category', category,
      '--tags', tags.join(','),
    ]
    if (chapterNo !== undefined) cmd.push('--chapter', String(chapterNo))
    const result = await runMemoryCommand(cmd)
    return result.memory_id || ''
  } catch {
    return ''
  }
}

/** Extract and store structured facts from content */
export async function storeFacts(
  projectId: number,
  content: string,
  sourceMemoryId?: string,
  chapterNo?: number,
): Promise<string[]> {
  try {
    const cmd: string[] = [
      'store-facts',
      '--project', String(projectId),
      '--content', content,
    ]
    if (sourceMemoryId) cmd.push('--source-id', sourceMemoryId)
    if (chapterNo !== undefined) cmd.push('--chapter', String(chapterNo))
    const result = await runMemoryCommand(cmd)
    return result.facts?.map((f: any) => f.id) || []
  } catch {
    return []
  }
}

// ═══════════════════════════════════════════════════════════════
//  2. 提取 — Recall (memories + facts)
// ═══════════════════════════════════════════════════════════════

/** Recall memories by semantic similarity */
export async function recallMemories(
  projectId: number,
  query: string,
  topK = 5,
  category?: MemoryCategory,
): Promise<MemoryRecord[]> {
  try {
    const args = ['recall', '--project', String(projectId), '--query', query, '--top-k', String(topK)]
    if (category) args.push('--category', category)
    const result = await runMemoryCommand(args)
    if (result.status === 'error') return []
    return (result.results || []).map(r => ({
      id: r.id || '',
      project_id: r.project_id || String(projectId),
      content: r.content || '',
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : (r.tags || []),
      category: r.category || 'general',
      timestamp: r.timestamp || '',
      similarity: r.similarity,
    }))
  } catch {
    return []
  }
}

/** List all memories for a project */
export async function listMemories(
  projectId: number,
  category?: MemoryCategory,
): Promise<MemoryRecord[]> {
  try {
    const args = ['list', '--project', String(projectId)]
    if (category) args.push('--category', category)
    const result = await runMemoryCommand(args)
    if (result.status === 'error') return []
    return (result.memories || []).map(r => ({
      id: r.id || '',
      project_id: r.project_id || String(projectId),
      content: r.content || '',
      tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : (r.tags || []),
      category: r.category || 'general',
      timestamp: r.timestamp || '',
    }))
  } catch {
    return []
  }
}

/** Query structured facts by entity */
export async function queryFacts(
  projectId: number,
  entity?: string,
  attribute?: string,
): Promise<FactRecord[]> {
  try {
    const args = ['query-facts', '--project', String(projectId)]
    if (entity) args.push('--entity', entity)
    if (attribute) args.push('--attribute', attribute)
    const result = await runMemoryCommand(args)
    if (result.status === 'error') return []
    return (result.facts || [])
  } catch {
    return []
  }
}

/** List all facts for a project */
export async function listAllFacts(projectId: number): Promise<FactRecord[]> {
  try {
    const result = await runMemoryCommand(['list-facts', '--project', String(projectId)])
    if (result.status === 'error') return []
    return (result.facts || [])
  } catch {
    return []
  }
}

// ═══════════════════════════════════════════════════════════════
//  3. 核对 — Verify (content consistency check)
// ═══════════════════════════════════════════════════════════════

/**
 * Verify a piece of content against stored memories & facts.
 * Returns contradictions and related memories.
 */
export async function verifyContent(
  projectId: number,
  content: string,
  category: MemoryCategory = 'general',
): Promise<VerifyResult> {
  try {
    const result = await runMemoryCommand([
      'verify',
      '--project', String(projectId),
      '--content', content,
      '--category', category,
    ])
    if (result.status === 'error') {
      return {
        is_consistent: true,
        issue_count: 0,
        issues: [],
        related_memories: [],
      }
    }
    return {
      is_consistent: result.is_consistent ?? true,
      issue_count: result.issue_count ?? 0,
      issues: result.issues || [],
      related_memories: result.related_memories || [],
    }
  } catch {
    return { is_consistent: true, issue_count: 0, issues: [], related_memories: [] }
  }
}

// ═══════════════════════════════════════════════════════════════
//  4. 连贯性修复 — Reconcile (find & flag contradictions)
// ═══════════════════════════════════════════════════════════════

/**
 * Reconcile all facts for a project — find contradictions where
 * the same entity+attribute has different values across chapters.
 */
export async function reconcileFacts(
  projectId: number,
  category?: MemoryCategory,
): Promise<ReconcileResult> {
  try {
    const args = ['reconcile', '--project', String(projectId)]
    if (category) args.push('--category', category)
    const result = await runMemoryCommand(args)
    if (result.status === 'error') {
      return { total_facts: 0, contradiction_count: 0, contradictions: [] }
    }
    return {
      total_facts: result.total_facts ?? 0,
      contradiction_count: result.contradiction_count ?? 0,
      contradictions: result.contradictions || [],
    }
  } catch {
    return { total_facts: 0, contradiction_count: 0, contradictions: [] }
  }
}

/** Log a continuity issue */
export async function logContinuityIssue(
  projectId: number,
  issueType: string,
  description: string,
  severity: string = 'medium',
  chapterNo?: number,
  resolution?: string,
): Promise<string> {
  try {
    const args = [
      'log-continuity',
      '--project', String(projectId),
      '--issue-type', issueType,
      '--description', description,
      '--severity', severity,
    ]
    if (chapterNo !== undefined) args.push('--chapter', String(chapterNo))
    if (resolution) args.push('--resolution', resolution)
    const result = await runMemoryCommand(args)
    return result.log_id || ''
  } catch {
    return ''
  }
}

/** List continuity issues */
export async function listContinuityIssues(
  projectId: number,
  status?: string,
): Promise<ContinuityIssue[]> {
  try {
    const args = ['list-continuity', '--project', String(projectId)]
    if (status) args.push('--status', status)
    const result = await runMemoryCommand(args)
    if (result.status === 'error') return []
    return (result.issues || [])
  } catch {
    return []
  }
}

/** Dump all project data */
export async function dumpProject(projectId: number): Promise<any> {
  try {
    const result = await runMemoryCommand(['dump', '--project', String(projectId)])
    return result
  } catch {
    return { status: 'error' }
  }
}

export async function listMemoryPalaceProjects(): Promise<MemoryPalaceProjectSummary[]> {
  const records = readProjectIndex()
  const summaries = await Promise.all(records.map(async (record) => {
    const dump = await dumpProject(record.project_id)
    return {
      project_id: record.project_id,
      project_title: record.project_title,
      memory_count: Number(dump?.memory_count || 0),
      fact_count: Number(dump?.fact_count || 0),
      continuity_issue_count: Number(dump?.continuity_issue_count || 0),
      last_updated_at: String(dump?.last_updated_at || record.last_updated_at || ''),
    }
  }))
  return summaries.sort((a, b) => a.project_id - b.project_id)
}

export async function dumpProjectScoped(projectId: number, projectTitle?: string): Promise<any> {
  const identity = assertProjectIdentity(projectId, projectTitle)
  if (!identity.ok) {
    return {
      status: 'skipped',
      project_id: projectId,
      project_title: projectTitle || '',
      reason: identity.reason,
      memory_count: 0,
      fact_count: 0,
      continuity_issue_count: 0,
      memories: [],
      facts: [],
      continuity_log: [],
    }
  }
  if (identity.normalizedTitle) upsertProjectIndex(projectId, identity.normalizedTitle)
  const result = await dumpProject(projectId)
  return { ...result, project_title: identity.normalizedTitle || result?.project_title || '' }
}

export async function purgeMemoryPalaceProject(projectId: number, projectTitle?: string): Promise<{ ok: boolean; error?: string }> {
  const identity = assertProjectIdentity(projectId, projectTitle)
  if (projectTitle && !identity.ok) return { ok: false, error: identity.reason }
  const result = await runMemoryCommand(['purge-project', '--project', String(projectId)])
  if (result?.status === 'error') return { ok: false, error: String(result.error || 'purge failed') }
  removeProjectIndex(projectId)
  return { ok: true }
}

export async function buildMemoryInjectionForProject(
  projectId: number,
  projectTitle: string | undefined,
  context: Parameters<typeof buildMemoryInjection>[1],
): Promise<MemoryInjection> {
  const identity = assertProjectIdentity(projectId, projectTitle)
  if (!identity.ok) return { text: '', memories: [], facts: [], contradictions: [] }
  if (identity.normalizedTitle) upsertProjectIndex(projectId, identity.normalizedTitle)
  return buildMemoryInjection(projectId, context)
}

function normalizeAgentOutputFromResponse(
  agentId: string,
  output: any,
  response?: any,
  context?: any,
): any {
  if (!Array.isArray(output) || !response || typeof response !== 'object') {
    return output
  }

  if (response.parsed && typeof response.parsed === 'object') {
    return response.parsed
  }

  const content = typeof response.content === 'string' ? response.content.trim() : ''
  if (!content) return {}

  try {
    const direct = JSON.parse(content)
    if (direct && typeof direct === 'object') return direct
  } catch {
    // ignore and try extracting JSON payload below
  }

  const objectMatch = content.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0])
    } catch {
      // ignore
    }
  }

  const arrayMatch = content.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0])
    } catch {
      // ignore
    }
  }

  if (agentId === 'prose-agent') {
    const chapterNo = Number(
      context?.chapter_no
        || context?.chapterDraft?.chapter_no
        || context?.upstreamContext?.chapter_no
        || 0,
    ) || 0

    return {
      prose_chapters: [
        {
          chapter_no: chapterNo,
          chapter_text: content,
        },
      ],
    }
  }

  return { raw_content: content }
}

export async function verifyAndStoreAgentOutputForProject(
  projectId: number,
  projectTitle: string | undefined,
  agentId: string,
  output: any,
  response?: any,
  context?: any,
) {
  const identity = assertProjectIdentity(projectId, projectTitle)
  if (!identity.ok) return { storedIds: [], verificationIssues: [], contradictions: [] }
  if (identity.normalizedTitle) upsertProjectIndex(projectId, identity.normalizedTitle)

  if (agentId.startsWith('prose-chapter-') && typeof output === 'string') {
    const match = agentId.match(/prose-chapter-(\d+)/)
    const chapterNo = match ? Number(match[1]) : undefined
    const summary = output.length > 1000 ? `${output.slice(0, 800)}……${output.slice(-200)}` : output
    const memoryId = await storeMemory(projectId, `第${chapterNo || '?'}章正文：${summary}`, 'prose', ['prose', String(chapterNo || '')], chapterNo)
    if (memoryId) {
      await storeFacts(projectId, output, memoryId, chapterNo)
    }
    const verifyResult = await verifyContent(projectId, output, 'prose')
    const reconcileResult = await reconcileFacts(projectId)
    return {
      storedIds: memoryId ? [memoryId] : [],
      verificationIssues: verifyResult.is_consistent ? [] : (verifyResult.issues || []),
      contradictions: reconcileResult.contradictions || [],
    }
  }

  const normalizedOutput = normalizeAgentOutputFromResponse(agentId, output, response, context)
  return verifyAndStoreAgentOutput(projectId, agentId, normalizedOutput)
}

export async function storeAgentOutputForProject(
  projectId: number,
  projectTitle: string | undefined,
  agentId: string,
  output: any,
  response?: any,
  context?: any,
) {
  const identity = assertProjectIdentity(projectId, projectTitle)
  if (!identity.ok) return []
  if (identity.normalizedTitle) upsertProjectIndex(projectId, identity.normalizedTitle)
  const normalizedOutput = normalizeAgentOutputFromResponse(agentId, output, response, context)
  return storeAgentOutput(projectId, agentId, normalizedOutput)
}

// ═══════════════════════════════════════════════════════════════
//  Memory Injection — 综合提取 (跨维度召回 + 事实查询 + 矛盾检测)
// ═══════════════════════════════════════════════════════════════

/**
 * Build a comprehensive memory injection block for the Agent prompt.
 *
 * 四步提取：
 * 1. 按 category 召回相关记忆（TF-IDF 语义检索）
 * 2. 按实体查询结构化事实
 * 3. 检测当前矛盾（reconcile）
 * 4. 组合成注入文本
 */
export async function buildMemoryInjection(
  projectId: number,
  context: {
    query?: string
    categories?: MemoryCategory[]
    topK?: number
    worldbuilding?: any
    characters?: any[]
    outline?: any
    chapterTitle?: string
    chapterSummary?: string
    prevChapters?: Array<Record<string, any>>
    contentToVerify?: string
  },
): Promise<MemoryInjection> {
  const parts: string[] = []
  const allMemories: MemoryRecord[] = []
  const allFacts: FactRecord[] = []
  const allContradictions: Array<any> = []

  // ── 1. 通用语义召回（供调用方按 query/categories 直接取记忆）──
  try {
    const genericQuery = String(context.query || '').trim()
    if (genericQuery) {
      const categories = context.categories && context.categories.length
        ? context.categories
        : ['plot', 'worldbuilding', 'character', 'foreshadowing', 'prose', 'general'] as MemoryCategory[]
      const topK = Math.max(1, Math.min(20, Number(context.topK || 5) || 5))
      const labels: Record<MemoryCategory, string> = {
        plot: '情节',
        worldbuilding: '世界观/体系',
        character: '角色',
        foreshadowing: '伏笔',
        prose: '正文/文风',
        general: '通用',
      }
      const genericMemories: MemoryRecord[] = []
      const seen = new Set<string>()
      for (const category of categories) {
        const memories = await recallMemories(projectId, genericQuery, topK, category)
        for (const memory of memories) {
          if (seen.has(memory.id)) continue
          seen.add(memory.id)
          genericMemories.push(memory)
        }
      }
      if (genericMemories.length > 0) {
        allMemories.push(...genericMemories)
        parts.push('### 🧠 相关记忆\n' + genericMemories
          .map(m => `• [${labels[m.category] || m.category}] ${m.content.slice(0, 400)}`)
          .join('\n'))
      }
    }
  } catch { /* non-fatal */ }

  // ── 2. 世界观记忆 ──
  try {
    const worldQueries = [
      context.worldbuilding?.world_summary || '',
      ...((context.worldbuilding?.rules || []) as string[]).slice(0, 3),
    ].filter(Boolean)
    if (worldQueries.length > 0) {
      const memories = await recallMemories(projectId, worldQueries.join(' '), 5, 'worldbuilding')
      if (memories.length > 0) {
        allMemories.push(...memories)
        parts.push('### 🏰 世界观记忆\n' + memories.map(m => `• ${m.content.slice(0, 400)}`).join('\n'))
      }
    }
  } catch { /* non-fatal */ }

  // ── 3. 角色记忆 ──
  try {
    const charNames = (context.characters || []).map((c: any) => c.name).filter(Boolean)
    if (charNames.length > 0) {
      const memories = await recallMemories(projectId, charNames.join(' '), 8, 'character')
      if (memories.length > 0) {
        allMemories.push(...memories)
        parts.push('### 👤 角色记忆\n' + memories.map(m => `• ${m.content.slice(0, 400)}`).join('\n'))
      }

      // 按角色名查询事实
      for (const name of charNames.slice(0, 5)) {
        const facts = await queryFacts(projectId, name)
        if (facts.length > 0) {
          allFacts.push(...facts)
          parts.push(`### 📋 角色「${name}」的已知事实\n` +
            facts.map(f => `• ${f.attribute}: ${f.value}${f.chapter_from ? `（第${f.chapter_from}章）` : ''}`).join('\n'))
        }
      }
    }
  } catch { /* non-fatal */ }

  // ── 4. 情节与伏笔记忆 ──
  try {
    const plotQuery = [
      context.chapterTitle,
      context.chapterSummary,
      ...((context.outline?.conflict_points || []) as string[]),
    ].filter(Boolean).join(' ')
    if (plotQuery) {
      const plotMemories = await recallMemories(projectId, plotQuery, 5, 'plot')
      const foreshadowMemories = await recallMemories(projectId, plotQuery, 5, 'foreshadowing')
      if (plotMemories.length > 0 || foreshadowMemories.length > 0) {
        const combined = [...plotMemories, ...foreshadowMemories]
        allMemories.push(...combined)
        parts.push('### 📖 情节与伏笔记忆\n' + combined.map(m => `• ${m.content.slice(0, 400)}`).join('\n'))
      }
    }
  } catch { /* non-fatal */ }

  // ── 5. 近期正文记忆 ──
  try {
    if (context.prevChapters && context.prevChapters.length > 0) {
      const recentTexts = context.prevChapters
        .slice(-2)
        .map((ch: any) => ch.chapter_text || '')
        .filter(Boolean)
      if (recentTexts.length > 0) {
        const memories = await recallMemories(projectId, recentTexts.join(' '), 3, 'prose')
        if (memories.length > 0) {
          allMemories.push(...memories)
          parts.push('### 📝 近期正文记忆\n' + memories.map(m => m.content.slice(0, 400)).join('\n'))
        }
      }
    }
  } catch { /* non-fatal */ }

  // ── 6. 矛盾检测（reconcile）──
  try {
    const reconcileResult = await reconcileFacts(projectId)
    if (reconcileResult.contradiction_count > 0) {
      allContradictions.push(...reconcileResult.contradictions)
      const warning = reconcileResult.contradictions.map(c => {
        const vals = c.values.map((v: any) => `「${v.value}」${v.chapter ? `(第${v.chapter}章)` : ''}`).join(' vs ')
        return `⚠️ ${c.entity} · ${c.attribute}: ${vals}`
      }).join('\n')
      parts.push(`### ⚠️ 已知矛盾（${reconcileResult.contradiction_count}个）\n${warning}\n注意：生成内容时请避免与已有事实产生冲突。`)
    }
  } catch { /* non-fatal */ }

  // ── 7. 连续性日志（未解决的问题）──
  try {
    const openIssues = await listContinuityIssues(projectId, 'open')
    if (openIssues.length > 0) {
      const issueText = openIssues.map(i => `• [${i.severity}] 第${i.chapter_no ?? '?'}章: ${i.description}`).join('\n')
      parts.push(`### 🔓 未解决的连续性问题\n${issueText}`)
    }
  } catch { /* non-fatal */ }

  if (parts.length === 0) {
    return { text: '', memories: [], facts: [], contradictions: [] }
  }

  return {
    text: `\n### 🧠 记忆宫殿注入（Memory Palace Injection）\n以下是从项目记忆库中提取的信息，请确保生成内容与这些记忆保持一致：\n\n${parts.join('\n\n')}\n`,
    memories: allMemories,
    facts: allFacts,
    contradictions: allContradictions,
  }
}

// ═══════════════════════════════════════════════════════════════
//  核对 + 存储 + 修复 — verifyAndStoreAgentOutput 闭环
// ═══════════════════════════════════════════════════════════════

/**
 * 闭环：Agent 输出 → store(存入) → verify(核对) → reconcile(扫描矛盾)
 *
 * 在每个 Agent 执行后调用，发现冲突自动记录到连续性日志。
 */
export async function verifyAndStoreAgentOutput(
  projectId: number,
  agentId: string,
  output: any,
): Promise<{
  storedIds: string[]
  verificationIssues: Array<any>
  contradictions: Array<any>
}> {
  const result = {
    storedIds: [] as string[],
    verificationIssues: [] as Array<any>,
    contradictions: [] as Array<any>,
  }

  try {
    // Step 1: 存入
    result.storedIds = await storeAgentOutput(projectId, agentId, output)

    // Step 2: 核对 — 仅 prose-agent 和 detail-outline-agent 需要核对正文/细纲
    if (agentId === 'prose-agent' && Array.isArray(output.prose_chapters)) {
      for (const pc of output.prose_chapters) {
        if (pc.chapter_text) {
          const verifyResult = await verifyContent(projectId, pc.chapter_text, 'prose')
          if (!verifyResult.is_consistent && verifyResult.issues.length > 0) {
            result.verificationIssues.push(...verifyResult.issues)
            // 将核对问题写入连续性日志
            for (const issue of verifyResult.issues) {
              await logContinuityIssue(
                projectId,
                'verify_conflict',
                `${issue.description || issue.entity}: ${issue.new_value} vs ${issue.existing_value}`,
                issue.severity || 'medium',
                typeof pc.chapter_no === 'number' ? pc.chapter_no : undefined,
                null,
              )
            }
          }
        }
      }
    }

    if (agentId === 'detail-outline-agent' && Array.isArray(output.detail_chapters)) {
      const detailText = JSON.stringify(output.detail_chapters.slice(0, 3))
      const verifyResult = await verifyContent(projectId, detailText, 'plot')
      if (!verifyResult.is_consistent && verifyResult.issues.length > 0) {
        result.verificationIssues.push(...verifyResult.issues)
        for (const issue of verifyResult.issues) {
          await logContinuityIssue(
            projectId,
            'verify_conflict',
            issue.description || JSON.stringify(issue),
            issue.severity || 'medium',
            issue.chapter_no || undefined,
            null,
          )
        }
      }
    }

    // Step 3: 全局矛盾扫描
    const reconcileResult = await reconcileFacts(projectId)
    if (reconcileResult.contradiction_count > 0) {
      result.contradictions = reconcileResult.contradictions
    }

  } catch (error) {
    console.error(`[memory-service] verifyAndStoreAgentOutput failed for ${agentId}:`, String(error).slice(0, 200))
  }

  return result
}

// ═══════════════════════════════════════════════════════════════
//  Agent 输出存储 — 结构化存入记忆 + 事实
// ═══════════════════════════════════════════════════════════════

/**
 * Auto-store key information after Agent execution.
 *
 * 两步存入：
 * 1. storeMemory — 存入语义记忆（TF-IDF 可检索）
 * 2. storeFacts — 提取并存储结构化事实（实体-属性-值）
 */
export async function storeAgentOutput(
  projectId: number,
  agentId: string,
  output: any,
): Promise<string[]> {
  const stored: string[] = []

  try {
    // ── world-agent ──
    if (agentId === 'world-agent' && output.world_summary) {
      const id = await storeMemory(projectId, output.world_summary, 'worldbuilding', ['world', 'setting'])
      if (id) stored.push(id)
      await storeFacts(projectId, output.world_summary, id)

      if (Array.isArray(output.rules)) {
        for (const rule of output.rules) {
          const rid = await storeMemory(projectId, rule, 'worldbuilding', ['rule'])
          if (rid) stored.push(rid)
        }
      }
      if (Array.isArray(output.factions)) {
        for (const faction of output.factions) {
          const name = faction.name || faction
          const desc = typeof faction === 'string' ? faction : (faction.role || faction.description || '')
          if (name) {
            const fid = await storeMemory(projectId, `势力：${name}${desc ? ' — ' + desc : ''}`, 'worldbuilding', ['faction', String(name)])
            if (fid) stored.push(fid)
          }
        }
      }
      if (Array.isArray(output.items)) {
        for (const item of output.items) {
          const name = item.name || item
          const desc = typeof item === 'string' ? item : (item.description || item.ability || '')
          if (name) {
            const iid = await storeMemory(projectId, `物品：${name}${desc ? ' — ' + desc : ''}`, 'worldbuilding', ['item', String(name)])
            if (iid) stored.push(iid)
          }
        }
      }
      if (output.timeline_anchor) {
        const tid = await storeMemory(projectId, `时间锚点：${output.timeline_anchor}`, 'worldbuilding', ['timeline'])
        if (tid) stored.push(tid)
      }
      if (Array.isArray(output.known_unknowns)) {
        for (const unknown of output.known_unknowns) {
          const kid = await storeMemory(projectId, `伏笔（已知未知）：${unknown}`, 'foreshadowing', ['unknown'])
          if (kid) stored.push(kid)
        }
      }
    }

    // ── character-agent ──
    if (agentId === 'character-agent' && Array.isArray(output.characters)) {
      for (const char of output.characters) {
        const name = char.name || '未知角色'
        const content = `${name}（${char.role || '角色'}）性格：${Array.isArray(char.personality) ? char.personality.join('，') : (char.personality || '')}。动机：${char.motivation || ''}。目标：${char.goal || ''}。能力：${Array.isArray(char.abilities) ? char.abilities.join('、') : (char.abilities || '')}。背景：${char.backstory || ''}`
        const cid = await storeMemory(projectId, content, 'character', ['character', name])
        if (cid) stored.push(cid)
        await storeFacts(projectId, content, cid)
      }
    }

    // ── outline-agent ──
    if (agentId === 'outline-agent') {
      if (output.master_outline?.summary || output.master_outline) {
        const mo = typeof output.master_outline === 'string' ? output.master_outline : output.master_outline.summary || ''
        const oid = await storeMemory(projectId, `总纲：${mo}`, 'plot', ['outline', 'master'])
        if (oid) stored.push(oid)
      }
      if (output.hook) {
        const hid = await storeMemory(projectId, `核心钩子：${output.hook}`, 'foreshadowing', ['hook'])
        if (hid) stored.push(hid)
      }
      if (Array.isArray(output.turning_points)) {
        for (const tp of output.turning_points) {
          const tid = await storeMemory(projectId, `转折点：${tp}`, 'foreshadowing', ['turning_point'])
          if (tid) stored.push(tid)
        }
      }
      if (Array.isArray(output.foreshadowing_plan)) {
        for (const fp of output.foreshadowing_plan) {
          const desc = typeof fp === 'string' ? fp : fp.description || ''
          const plant = fp.plant_at || '?'
          const payoff = fp.payoff_at || '?'
          const fpid = await storeMemory(projectId, `伏笔：第${plant}章埋→第${payoff}章收：${desc}`, 'foreshadowing', ['foreshadow', String(plant)])
          if (fpid) stored.push(fpid)
        }
      }
    }

    // ── detail-outline-agent ──
    if (agentId === 'detail-outline-agent' && Array.isArray(output.detail_chapters)) {
      for (const ch of output.detail_chapters) {
        const chapterNo = ch.chapter_no
        const title = ch.title || ''
        const summary = ch.summary || ch.chapter_summary || ''
        const hook = ch.ending_hook || ''
        const continuity = ch.continuity_from_prev || ''
        const items = Array.isArray(ch.items_in_play) ? ch.items_in_play.join('、') : ''
        const content = `${title}（第${chapterNo}章）：${summary}。冲突：${ch.conflict || ''}。衔接：${continuity}。钩子：${hook}。物品：${items}`
        const chid = await storeMemory(projectId, content, 'plot', ['chapter', String(chapterNo)])
        if (chid) stored.push(chid)
        await storeFacts(projectId, content, chid, chapterNo)
      }
    }

    // ── chapter-agent（backward compat）──
    if (agentId === 'chapter-agent' && Array.isArray(output.chapters)) {
      for (const ch of output.chapters) {
        const content = `${ch.title || '章节'}（第${ch.chapter_no}章）：${ch.chapter_summary || ''}。冲突：${ch.conflict || ''}。钩子：${ch.ending_hook || ''}`
        const chid = await storeMemory(projectId, content, 'plot', ['chapter', String(ch.chapter_no)])
        if (chid) stored.push(chid)
        await storeFacts(projectId, content, chid, ch.chapter_no)
      }
    }

    // ── prose-agent ──
    if (agentId === 'prose-agent' && Array.isArray(output.prose_chapters)) {
      for (const pc of output.prose_chapters) {
        const chapterNo = pc.chapter_no || 0
        if (pc.chapter_text) {
          // 存入正文摘要（完整正文太长，存前 800 字 + 结尾 200 字）
          const fullText = pc.chapter_text
          const summary = fullText.length > 1000
            ? fullText.slice(0, 800) + '……' + fullText.slice(-200)
            : fullText
          const pid = await storeMemory(projectId, `第${chapterNo}章正文：${summary}`, 'prose', ['prose', String(chapterNo)])
          if (pid) stored.push(pid)
          // 提取事实 —— 这是连贯性核对的关键！
          await storeFacts(projectId, fullText, pid, chapterNo)
        }
        if (pc.ending_hook) {
          const eid = await storeMemory(projectId, `第${chapterNo}章结尾钩子：${pc.ending_hook}`, 'foreshadowing', ['hook', String(chapterNo)])
          if (eid) stored.push(eid)
        }
        if (Array.isArray(pc.continuity_notes)) {
          for (const note of pc.continuity_notes) {
            const nid = await storeMemory(projectId, `第${chapterNo}章连贯性备注：${note}`, 'plot', ['continuity', String(chapterNo)])
            if (nid) stored.push(nid)
          }
        }
        if (Array.isArray(pc.scene_breakdown)) {
          for (const scene of pc.scene_breakdown) {
            const loc = typeof scene === 'string' ? scene : (scene.description || '')
            const chars = typeof scene === 'object' && scene.characters_present
              ? scene.characters_present.join('、')
              : ''
            if (loc) {
              const sid = await storeMemory(projectId, `第${chapterNo}章场景：${loc}${chars ? ' [人物：' + chars + ']' : ''}`, 'plot', ['scene', String(chapterNo)])
              if (sid) stored.push(sid)
            }
          }
        }
      }
    }

    // ── continuity-check-agent ──
    if (agentId === 'continuity-check-agent') {
      if (Array.isArray(output.continuity_issues)) {
        for (const issue of output.continuity_issues) {
          const severity = issue.severity || 'medium'
          const desc = typeof issue === 'string' ? issue : (issue.description || '')
          const chapterNo = issue.chapter_no
          const issueType = typeof issue === 'string' ? 'continuity_check' : (issue.issue_type || 'continuity_check')
          if (desc) {
            await logContinuityIssue(
              projectId,
              issueType,
              desc,
              severity,
              chapterNo,
              issue.suggested_fix || null,
            )
          }
        }
      }
    }

  } catch (error) {
    console.error(`[memory-service] storeAgentOutput failed for ${agentId}:`, String(error).slice(0, 200))
  }

  return stored
}
