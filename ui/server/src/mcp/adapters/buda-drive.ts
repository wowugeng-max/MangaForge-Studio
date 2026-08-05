import { createHash } from 'crypto'
import { Buffer } from 'node:buffer'
import { McpError } from '../errors'
import type { McpGenerationDeadline } from '../deadline'
import type { McpToolResult } from '../types'
import { buildBudaToolArguments, type BudaToolMap } from './buda-tool-map'
import type { McpClientPort } from './types'

export type BudaDriveSnapshot = {
  files: Record<string, string>
  hashes: Record<string, string>
  snapshotHash: string
}

const LIVE_BUDA_UPSERT_ORDER = [
  '/mangaforge/writing-bible.md',
  '/mangaforge/story-state.json',
  '/mangaforge/continuity.md',
  '/mangaforge/recent-chapters.md',
  'MANGAFORGE_CURRENT_STAGE.md',
  '/mangaforge/manifest.json',
] as const

const BUDA_CURRENT_STAGE_LIMIT = 256 * 1_024
const BUDA_CURRENT_STAGE_INVOCATION_LIMIT = 16_384
const BUDA_CURRENT_STAGE_FIELD_LIMIT = 4_096

function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

function boundedUtf8(value: string, maxBytes: number) {
  if (Buffer.byteLength(value, 'utf8') <= maxBytes) return value
  let output = ''
  let bytes = 0
  for (const character of value) {
    const size = Buffer.byteLength(character, 'utf8')
    if (bytes + size > maxBytes) break
    output += character
    bytes += size
  }
  return output
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
  stage?: string
  responseContract?: string
  prompt?: string
  invocationId?: string
  generatedAt?: string
}): BudaDriveSnapshot {
  const contentFiles: Record<string, string> = {
    '/mangaforge/writing-bible.md': String(input.writingBible || ''),
    '/mangaforge/story-state.json': stableJson(input.storyState || {}),
    '/mangaforge/continuity.md': String(input.continuity || ''),
    '/mangaforge/recent-chapters.md': String(input.recentChapters || ''),
  }
  if (input.stage || input.responseContract || input.prompt || input.invocationId) {
    const prompt = String(input.prompt || '')
    const invocationId = boundedUtf8(String(input.invocationId || ''), BUDA_CURRENT_STAGE_INVOCATION_LIMIT)
    const stage = boundedUtf8(String(input.stage || ''), BUDA_CURRENT_STAGE_FIELD_LIMIT)
    const responseContract = boundedUtf8(String(input.responseContract || ''), BUDA_CURRENT_STAGE_FIELD_LIMIT)
    const stagePrefix = [
      `invocation_id: ${invocationId}`,
      `stage: ${stage}`,
      `response_contract: ${responseContract}`,
      '',
    ].join('\n')
    const promptBudget = Math.max(0, BUDA_CURRENT_STAGE_LIMIT - Buffer.byteLength(stagePrefix, 'utf8'))
    const truncationMarker = '\n[TRUNCATED]'
    const boundedPrompt = Buffer.byteLength(prompt, 'utf8') > promptBudget
      ? `${boundedUtf8(prompt, Math.max(0, promptBudget - Buffer.byteLength(truncationMarker, 'utf8')))}${truncationMarker}`
      : prompt
    contentFiles['MANGAFORGE_CURRENT_STAGE.md'] = `${stagePrefix}${boundedPrompt}`
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

function driveFileState(result: McpToolResult) {
  const data = mcpResultData(result)
  const known = typeof result.structuredContent === 'string'
    || typeof data === 'string'
    || typeof data?.content === 'string'
    || typeof data?.text === 'string'
    || typeof data?.file?.content === 'string'
    || data?.exists === false
  return {
    content: driveText(result),
    exists: typeof data?.exists === 'boolean' ? data.exists : true,
    known,
  }
}

function isLiveBudaNotInitialized(toolName: string, error: unknown) {
  return toolName.startsWith('api_claw_')
    && error instanceof McpError
    && error.details?.reason === 'buda_server_not_initialized'
}

function driveListState(result: McpToolResult) {
  const data = mcpResultData(result)
  const files = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray(data.files)
      ? data.files
      : undefined
  if (!files) return { known: false, paths: new Set<string>() }
  const paths = new Set<string>()
  for (const item of files) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return { known: false, paths: new Set<string>() }
    if (item?.type === 'folder') continue
    const candidatePath = item.path ?? item.filePath
    if (typeof candidatePath !== 'string' || !candidatePath) return { known: false, paths: new Set<string>() }
    paths.add(candidatePath)
  }
  return { known: true, paths }
}

function isKnownAmbiguousMutation(error: unknown) {
  if (error instanceof McpError) {
    return ['MCP_CONNECTION_LOST', 'MCP_CONNECT_TIMEOUT', 'MCP_SEND_UNKNOWN'].includes(error.code)
  }
  const code = String((error as any)?.code || (error as any)?.errno || '').toUpperCase()
  return code === 'ECONNRESET' || code === 'EPIPE'
}

export async function syncBudaDriveSnapshot(input: {
  client: McpClientPort
  tools: Pick<BudaToolMap, 'listDriveFiles' | 'upsertDriveFile' | 'readDriveText'>
  agentId: string
  snapshot: BudaDriveSnapshot
  deadline: McpGenerationDeadline
  toolTimeoutMs: number
  runRead?: <T>(operation: () => Promise<T>) => Promise<T>
  runMutation?: <T>(operation: () => Promise<T>) => Promise<T>
  stabilize?: () => Promise<void>
}) {
  const { client, tools, agentId, snapshot, deadline } = input
  try {
    const runRead = input.runRead || (<T>(operation: () => Promise<T>) => operation())
    const runMutation = input.runMutation || (<T>(operation: () => Promise<T>) => operation())
    const callOptions = (operation: 'read_safe' | 'mutation') => ({
      signal: deadline.signal,
      get timeoutMs() { return deadline.timeoutMs(input.toolTimeoutMs) },
      operation,
    })
    const fullUpsertLiveBuda = tools.upsertDriveFile.startsWith('api_claw_')
      && tools.readDriveText.startsWith('api_claw_')
    const changed: string[] = fullUpsertLiveBuda
      ? LIVE_BUDA_UPSERT_ORDER.filter(path => snapshot.files[path] !== undefined)
      : []
    if (!fullUpsertLiveBuda) {
      const listed = await runRead(() => client.callTool(
        tools.listDriveFiles,
        buildBudaToolArguments('listDriveFiles', tools.listDriveFiles, { agentId, path: '/mangaforge' }),
        callOptions('read_safe'),
      ))
      const listState = driveListState(listed)
      if (!listState.known) throw new McpError('MCP_DRIVE_SYNC_FAILED', 'Buda Drive 列表响应无法确认')
      const remotePaths = listState.paths
      for (const [path, content] of Object.entries(snapshot.files)) {
        if (!remotePaths.has(path)) {
          changed.push(path)
          continue
        }
        const remote = driveFileState(await runRead(() => client.callTool(
          tools.readDriveText,
          buildBudaToolArguments('readDriveText', tools.readDriveText, { agentId, filePath: path, maxBytes: 5_000_000 }),
          callOptions('read_safe'),
        )))
        if (!remote.known) throw new McpError('MCP_DRIVE_SYNC_FAILED', 'Buda Drive 文件读取响应无法确认', { path })
        if (!remote.exists || sha256(remote.content) !== snapshot.hashes[path]) changed.push(path)
      }
    }
    const ordered = changed
      .filter(path => path !== '/mangaforge/manifest.json')
      .concat(changed.includes('/mangaforge/manifest.json') ? ['/mangaforge/manifest.json'] : [])
    for (const path of ordered) {
      const content = snapshot.files[path]!
      const upsertArgs = buildBudaToolArguments('upsertDriveFile', tools.upsertDriveFile, {
        agentId,
        path,
        content,
        mimeType: path.endsWith('.json') ? 'application/json' : 'text/markdown',
      })
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          await runMutation(() => client.callTool(tools.upsertDriveFile, upsertArgs, callOptions('mutation')))
          break
        } catch (writeError) {
          let reconciled = false
          let reconciliationReadSucceeded = false
          try {
            const remote = driveFileState(await runRead(() => client.callTool(tools.readDriveText, buildBudaToolArguments('readDriveText', tools.readDriveText, {
              agentId,
              filePath: path,
              maxBytes: 5_000_000,
            }), callOptions('read_safe'))))
            reconciliationReadSucceeded = remote.known
            reconciled = remote.known && remote.exists && remote.content === content
          } catch (readError) {
            if (readError instanceof McpError && readError.code === 'MCP_SERVER_NOT_READY') throw readError
            /* preserve the original ambiguous mutation error */
          }
          deadline.throwIfAborted()
          if (reconciled) break
          if (!reconciliationReadSucceeded) throw writeError
          if (attempt === 0 && (
            isLiveBudaNotInitialized(tools.upsertDriveFile, writeError)
            || (input.stabilize && isKnownAmbiguousMutation(writeError))
          )) {
            if (input.stabilize) await input.stabilize()
            continue
          }
          throw writeError
        }
      }
      const verified = driveFileState(await runRead(() => client.callTool(
        tools.readDriveText,
        buildBudaToolArguments('readDriveText', tools.readDriveText, { agentId, filePath: path, maxBytes: 5_000_000 }),
        callOptions('read_safe'),
      )))
      if (!verified.known || !verified.exists || sha256(verified.content) !== snapshot.hashes[path] || verified.content !== content) {
        throw new McpError('MCP_DRIVE_SYNC_FAILED', `Buda Drive 文件校验失败：${path}`, { path })
      }
    }
    return { snapshot_hash: snapshot.snapshotHash, uploaded_paths: ordered }
  } catch (error) {
    if (error instanceof McpError && ['MCP_DRIVE_SYNC_FAILED', 'MCP_GENERATION_TIMEOUT', 'MCP_CANCELLED', 'MCP_SERVER_NOT_READY'].includes(error.code)) throw error
    throw new McpError('MCP_DRIVE_SYNC_FAILED', 'Buda Drive 同步失败')
  }
}
