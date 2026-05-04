import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCRIPT_DIR = join(__dirname, '..', '..', '..', 'scripts')
const PALACE_DIR_ENV = process.env.MEMPALACE_DIR || join(__dirname, '..', '..', '..', 'mempalace-data')

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

interface MemoryResult {
  status: string
  count?: number
  memory_id?: string
  results?: Array<Partial<MemoryRecord>>
  memories?: Array<Partial<MemoryRecord>>
  mode?: string
  error?: string
}

function pythonPath() {
  return process.env.PYTHON_PATH || 'python3'
}

async function runMemoryCommand(args: string[]): Promise<MemoryResult> {
  const script = join(SCRIPT_DIR, 'novel-memory.py')
  try {
    const { stdout } = await execFileAsync(pythonPath(), [script, ...args], {
      env: { ...process.env, MEMPALACE_DIR: PALACE_DIR_ENV },
      timeout: 10000,
      maxBuffer: 1024 * 1024,
    })
    return JSON.parse(stdout.trim()) as MemoryResult
  } catch (error) {
    console.error(`[memory-service] command failed: python3 ${script} ${args.join(' ')}`, String(error).slice(0, 200))
    throw error
  }
}

/** Initialize the memory palace for a project */
export async function initMemoryPalace(): Promise<void> {
  try {
    await runMemoryCommand(['init', '--palace-dir', PALACE_DIR_ENV])
  } catch {
    // Non-fatal: the Python helper will create on first store
  }
}

/** Store a memory for a novel project */
export async function storeMemory(
  projectId: number,
  content: string,
  category: MemoryCategory = 'general',
  tags: string[] = [],
): Promise<string> {
  const result = await runMemoryCommand([
    'store',
    '--project', String(projectId),
    '--content', content,
    '--category', category,
    '--tags', tags.join(','),
  ])
  return result.memory_id || ''
}

/** Recall memories relevant to a query for a specific project */
export async function recallMemories(
  projectId: number,
  query: string,
  topK = 5,
  category?: MemoryCategory,
): Promise<MemoryRecord[]> {
  const args = ['recall', '--project', String(projectId), '--query', query, '--top-k', String(topK)]
  if (category) args.push('--category', category)
  const result = await runMemoryCommand(args)
  return (result.results || []).map(r => ({
    id: r.id,
    project_id: r.project_id,
    content: r.content,
    tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : (r.tags || []),
    category: r.category || 'general',
    timestamp: r.timestamp,
  }))
}

/** List all memories for a project, optionally filtered */
export async function listMemories(
  projectId: number,
  category?: MemoryCategory,
): Promise<MemoryRecord[]> {
  const args = ['list', '--project', String(projectId)]
  if (category) args.push('--category', category)
  const result = await runMemoryCommand(args)
  return (result.memories || []).map(r => ({
    id: r.id,
    project_id: r.project_id,
    content: r.content,
    tags: typeof r.tags === 'string' ? JSON.parse(r.tags) : (r.tags || []),
    category: r.category || 'general',
    timestamp: r.timestamp,
  }))
}

/**
 * Build a "memory injection" text block for the Agent prompt.
 * Recalls relevant memories across multiple dimensions and formats them.
 */
export async function buildMemoryInjection(
  projectId: number,
  context: {
    worldbuilding?: any
    characters?: any[]
    outline?: any
    chapterTitle?: string
    chapterSummary?: string
    prevChapters?: Array<Record<string, any>>
  },
): Promise<string> {
  const parts: string[] = []

  // 1. Recall worldbuilding memories
  const worldQueries = [
    context.worldbuilding?.world_summary || '',
    ...((context.worldbuilding?.rules || []) as string[]).slice(0, 3),
  ].filter(Boolean)
  if (worldQueries.length > 0) {
    const worldMemories = await recallMemories(projectId, worldQueries.join(' '), 3, 'worldbuilding')
    if (worldMemories.length > 0) {
      parts.push('### 世界观记忆\n' + worldMemories.map(m => `• [${m.category}] ${m.content.slice(0, 300)}`).join('\n'))
    }
  }

  // 2. Recall character memories
  const charNames = (context.characters || []).map((c: any) => c.name).filter(Boolean)
  if (charNames.length > 0) {
    const charMemories = await recallMemories(projectId, charNames.join(' '), 5, 'character')
    if (charMemories.length > 0) {
      parts.push('### 角色记忆\n' + charMemories.map(m => `• [${m.timestamp}] ${m.content.slice(0, 300)}`).join('\n'))
    }
  }

  // 3. Recall plot/foreshadowing memories
  const plotQuery = [context.chapterTitle, context.chapterSummary, ...((context.outline?.conflict_points || []) as string[])].filter(Boolean).join(' ')
  if (plotQuery) {
    const plotMemories = await recallMemories(projectId, plotQuery, 4, 'plot')
    const foreshadowMemories = await recallMemories(projectId, plotQuery, 3, 'foreshadowing')
    if (plotMemories.length > 0 || foreshadowMemories.length > 0) {
      parts.push('### 情节与伏笔记忆\n' + [...plotMemories, ...foreshadowMemories].map(m => `• ${m.content.slice(0, 300)}`).join('\n'))
    }
  }

  // 4. Recall recent prose memories (from prev chapters)
  if (context.prevChapters && context.prevChapters.length > 0) {
    const proseQuery = context.prevChapters.map((ch: any) => ch.chapter_text || '').filter(Boolean).slice(0, 2).join(' ')
    if (proseQuery) {
      const proseMemories = await recallMemories(projectId, proseQuery, 3, 'prose')
      if (proseMemories.length > 0) {
        parts.push('### 近期正文记忆\n' + proseMemories.map(m => m.content.slice(0, 300)).join('\n'))
      }
    }
  }

  if (parts.length === 0) return ''

  return `\n### 🧠 记忆宫殿注入（Memory Palace Injection）\n以下是从项目记忆库中检索到的相关信息，请确保生成的内容与这些记忆保持一致：\n\n${parts.join('\n\n')}\n`
}

/**
 * Auto-store key information after Agent execution.
 * Extracts and stores important facts from the agent output.
 */
export async function storeAgentOutput(
  projectId: number,
  agentId: string,
  output: any,
): Promise<string[]> {
  const stored: string[] = []
  try {
    // World agent → store worldbuilding
    if (agentId === 'world-agent' && output.world_summary) {
      const id = await storeMemory(projectId, output.world_summary, 'worldbuilding', ['world', 'setting'])
      stored.push(id)
      if (Array.isArray(output.rules)) {
        for (const rule of output.rules) {
          const rid = await storeMemory(projectId, rule, 'worldbuilding', ['rule'])
          stored.push(rid)
        }
      }
    }

    // Character agent → store character profiles
    if (agentId === 'character-agent' && Array.isArray(output.characters)) {
      for (const char of output.characters) {
        const content = `${char.name}（${char.role_type || '角色'}）原型：${char.archetype || ''}。动机：${char.motivation || ''}。目标：${char.goal || ''}。冲突：${char.conflict || ''}`
        const cid = await storeMemory(projectId, content, 'character', ['character', char.name])
        stored.push(cid)
      }
    }

    // Outline agent → store plot structure
    if (agentId === 'outline-agent') {
      if (output.master_outline?.summary) {
        const oid = await storeMemory(projectId, `总纲：${output.master_outline.summary}`, 'plot', ['outline', 'master'])
        stored.push(oid)
      }
      if (output.hook) {
        const hid = await storeMemory(projectId, `核心钩子：${output.hook}`, 'foreshadowing', ['hook'])
        stored.push(hid)
      }
      if (Array.isArray(output.turning_points)) {
        for (const tp of output.turning_points) {
          const tid = await storeMemory(projectId, `转折点：${tp}`, 'foreshadowing', ['turning_point'])
          stored.push(tid)
        }
      }
    }

    // Chapter agent → store chapter outlines
    if (agentId === 'chapter-agent' && Array.isArray(output.chapters)) {
      for (const ch of output.chapters) {
        const content = `${ch.title || '章节'}（第${ch.chapter_no}章）：${ch.chapter_summary || ''}。冲突：${ch.conflict || ''}。钩子：${ch.ending_hook || ''}`
        const chid = await storeMemory(projectId, content, 'plot', ['chapter', String(ch.chapter_no)])
        stored.push(chid)
      }
    }

    // Prose agent → store prose excerpts and continuity notes
    if (agentId === 'prose-agent' && Array.isArray(output.prose_chapters)) {
      for (const pc of output.prose_chapters) {
        const chapterNo = pc.chapter_no || '?'
        if (pc.chapter_text) {
          // Store key events (first 500 chars of each chapter)
          const summary = pc.chapter_text.slice(0, 500)
          const pid = await storeMemory(projectId, `第${chapterNo}章正文摘要：${summary}`, 'prose', ['prose', String(chapterNo)])
          stored.push(pid)
        }
        if (pc.ending_hook) {
          const eid = await storeMemory(projectId, `第${chapterNo}章结尾钩子：${pc.ending_hook}`, 'foreshadowing', ['hook', String(chapterNo)])
          stored.push(eid)
        }
        if (Array.isArray(pc.continuity_notes)) {
          for (const note of pc.continuity_notes) {
            const nid = await storeMemory(projectId, `第${chapterNo}章连贯性备注：${note}`, 'plot', ['continuity', String(chapterNo)])
            stored.push(nid)
          }
        }
      }
    }
  } catch (error) {
    console.error(`[memory-service] storeAgentOutput failed for ${agentId}:`, String(error).slice(0, 200))
  }
  return stored
}
