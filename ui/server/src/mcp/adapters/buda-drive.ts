import { createHash } from 'crypto'
import { McpError } from '../errors'
import type { McpGenerationDeadline } from '../deadline'
import type { McpToolResult } from '../types'
import type { BudaToolMap } from './buda-tool-map'
import type { McpClientPort } from './types'

export type BudaDriveSnapshot = {
  files: Record<string, string>
  hashes: Record<string, string>
  snapshotHash: string
}

function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => [key, sortJson(item)]))
}

export function stableJson(value: unknown) {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`
}

export function buildBudaDriveSnapshot(input: {
  project: Record<string, any>
  chapter: Record<string, any>
  writingBible: string
  storyState: unknown
  continuity: string
  recentChapters: string
  generatedAt?: string
}): BudaDriveSnapshot {
  const contentFiles: Record<string, string> = {
    '/mangaforge/writing-bible.md': String(input.writingBible || ''),
    '/mangaforge/story-state.json': stableJson(input.storyState || {}),
    '/mangaforge/continuity.md': String(input.continuity || ''),
    '/mangaforge/recent-chapters.md': String(input.recentChapters || ''),
  }
  const hashes = Object.fromEntries(Object.entries(contentFiles).map(([path, content]) => [path, sha256(content)]))
  const manifest = stableJson({
    version: 'mangaforge_buda_snapshot_v1',
    project_id: Number(input.project?.id || 0),
    project_title: String(input.project?.title || ''),
    source_chapter: Math.max(0, Number(input.chapter?.chapter_no || 0) - 1),
    target_chapter: Number(input.chapter?.chapter_no || 0),
    generated_at: input.generatedAt || new Date().toISOString(),
    files: hashes,
  })
  const files = { ...contentFiles, '/mangaforge/manifest.json': manifest }
  const allHashes = { ...hashes, '/mangaforge/manifest.json': sha256(manifest) }
  return { files, hashes: allHashes, snapshotHash: sha256(manifest) }
}

function textBlocks(result: McpToolResult) {
  return result.content
    .filter((item: any) => item?.type === 'text')
    .map((item: any) => String(item.text || ''))
    .filter(Boolean)
}

export function mcpResultData(result: McpToolResult): any {
  if (result.structuredContent !== undefined) return result.structuredContent
  for (const text of textBlocks(result)) {
    try { return JSON.parse(text) } catch { /* plain text remains a valid result */ }
  }
  return textBlocks(result).join('\n')
}

function driveText(result: McpToolResult) {
  const data = mcpResultData(result)
  if (typeof data === 'string') return data
  return String(data?.content ?? data?.text ?? data?.file?.content ?? '')
}

export async function syncBudaDriveSnapshot(input: {
  client: McpClientPort
  tools: Pick<BudaToolMap, 'listDriveFiles' | 'upsertDriveFile' | 'readDriveText'>
  agentId: string
  snapshot: BudaDriveSnapshot
  deadline: McpGenerationDeadline
  toolTimeoutMs: number
}) {
  const { client, tools, agentId, snapshot, deadline } = input
  try {
    const callOptions = (operation: 'read_safe' | 'mutation') => ({
      signal: deadline.signal,
      get timeoutMs() { return deadline.timeoutMs(input.toolTimeoutMs) },
      operation,
    })
    const listed = mcpResultData(await client.callTool(tools.listDriveFiles, { agentId, path: '/mangaforge' }, callOptions('read_safe')))
    const remotePaths = new Set((Array.isArray(listed?.files) ? listed.files : [])
      .filter((item: any) => item?.type !== 'folder')
      .map((item: any) => String(item?.path || item?.filePath || ''))
      .filter(Boolean))
    const changed: string[] = []
    for (const [path, content] of Object.entries(snapshot.files)) {
      if (!remotePaths.has(path)) {
        changed.push(path)
        continue
      }
      const remote = driveText(await client.callTool(tools.readDriveText, { agentId, filePath: path, maxBytes: 5_000_000 }, callOptions('read_safe')))
      if (sha256(remote) !== snapshot.hashes[path]) changed.push(path)
    }
    const ordered = changed
      .filter(path => path !== '/mangaforge/manifest.json')
      .concat(changed.includes('/mangaforge/manifest.json') ? ['/mangaforge/manifest.json'] : [])
    for (const path of ordered) {
      const content = snapshot.files[path]!
      try {
        await client.callTool(tools.upsertDriveFile, {
          agentId,
          path,
          content,
          mimeType: path.endsWith('.json') ? 'application/json' : 'text/markdown',
        }, callOptions('mutation'))
      } catch (writeError) {
        let reconciled = false
        try {
          const remote = driveText(await client.callTool(tools.readDriveText, {
            agentId,
            filePath: path,
            maxBytes: 5_000_000,
          }, callOptions('read_safe')))
          reconciled = remote === content
        } catch { /* preserve the original ambiguous mutation error */ }
        deadline.throwIfAborted()
        if (!reconciled) throw writeError
      }
      const verified = driveText(await client.callTool(tools.readDriveText, { agentId, filePath: path, maxBytes: 5_000_000 }, callOptions('read_safe')))
      if (verified !== content) {
        throw new McpError('MCP_DRIVE_SYNC_FAILED', `Buda Drive 文件校验失败：${path}`, { path })
      }
    }
    return { snapshot_hash: snapshot.snapshotHash, uploaded_paths: ordered }
  } catch (error) {
    if (error instanceof McpError && ['MCP_DRIVE_SYNC_FAILED', 'MCP_GENERATION_TIMEOUT', 'MCP_CANCELLED'].includes(error.code)) throw error
    throw new McpError('MCP_DRIVE_SYNC_FAILED', `Buda Drive 同步失败：${String((error as any)?.message || error).slice(0, 240)}`)
  }
}
