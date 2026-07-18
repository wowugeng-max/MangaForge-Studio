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

import type {
  MemoryCategory,
  MemoryRecord,
  FactRecord,
  ContinuityIssue,
  VerifyResult,
  ReconcileResult,
  MemoryInjection,
  MemoryPalaceProjectSummary,
} from './memory-service-types'

type MemoryProjectIndexRecord = {
  project_id: number
  project_title: string
  last_updated_at: string
}

export function nowIso() {
  return new Date().toISOString()
}

export function ensurePalaceDir() {
  if (!existsSync(PALACE_DIR_ENV)) mkdirSync(PALACE_DIR_ENV, { recursive: true })
}

export function readProjectIndex(): MemoryProjectIndexRecord[] {
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

export function writeProjectIndex(records: MemoryProjectIndexRecord[]) {
  ensurePalaceDir()
  const indexFile = join(PALACE_DIR_ENV, 'project-index.json')
  writeFileSync(indexFile, `${JSON.stringify(records, null, 2)}\n`, 'utf8')
}

export function upsertProjectIndex(projectId: number, projectTitle?: string) {
  const normalizedTitle = String(projectTitle || '').trim()
  if (!projectId || !normalizedTitle) return
  const records = readProjectIndex()
  const idx = records.findIndex(item => item.project_id === projectId)
  const next = { project_id: projectId, project_title: normalizedTitle, last_updated_at: nowIso() }
  if (idx >= 0) records[idx] = next
  else records.push(next)
  writeProjectIndex(records.sort((a, b) => a.project_id - b.project_id))
}

export function removeProjectIndex(projectId: number) {
  writeProjectIndex(readProjectIndex().filter(item => item.project_id !== projectId))
}

export function assertProjectIdentity(projectId: number, projectTitle?: string) {
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

export function scriptPath(): string | null {
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

export function pythonPath(): string {
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

export function cachePythonPath(p: string): void {
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

export async function ensureDbInit(): Promise<void> {
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

export async function runMemoryCommand(args: string[]): Promise<any> {
  const script = join(SCRIPT_DIR, 'novel-memory.py')
  if (!existsSync(script)) {
    return { status: 'error', error: 'novel-memory.py not found' }
  }

  // Ensure DB tables exist before any operation
  await ensureDbInit()

  try {
    const command = String(args[0] || '')
    const maxBuffer = command === 'dump' ? 64 * 1024 * 1024 : 4 * 1024 * 1024
    const result = await execFileAsync(pythonPath(), [script, ...args], {
      env: { ...process.env, MEMPALACE_DIR: PALACE_DIR_ENV },
      timeout: 15000,
      maxBuffer,
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

export async function summarizeProject(projectId: number): Promise<any> {
  try {
    const result = await runMemoryCommand(['summary', '--project', String(projectId)])
    return result
  } catch {
    return { status: 'error' }
  }
}

export async function listMemoryPalaceProjects(): Promise<MemoryPalaceProjectSummary[]> {
  const records = readProjectIndex()
  const summaries = await Promise.all(records.map(async (record) => {
    const dump = await summarizeProject(record.project_id)
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

