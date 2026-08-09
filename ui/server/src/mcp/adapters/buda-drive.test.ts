import { describe, expect, test } from 'bun:test'
import { McpGenerationDeadline } from '../deadline'
import { McpError } from '../errors'
import { buildBudaDriveSnapshot, syncBudaDriveSnapshot } from './buda-drive'

const LIVE_PATH_ORDER = [
  '/mangaforge/writing-bible.md',
  '/mangaforge/story-state.json',
  '/mangaforge/continuity.md',
  '/mangaforge/recent-chapters.md',
  '/mangaforge/manifest.json',
] as const

function result(structuredContent: Record<string, unknown>) {
  return { content: [], structuredContent }
}

function snapshotFixture() {
  return buildBudaDriveSnapshot({
    project: { id: 8, title: '长篇测试' },
    chapter: { chapter_no: 12 },
    writingBible: '# 写作圣经',
    storyState: { chapter_no: 11 },
    continuity: '连续性',
    recentChapters: '最近章节',
    generatedAt: '2026-07-30T12:00:00.000Z',
  })
}

function deadlineOptions() {
  return {
    deadline: new McpGenerationDeadline(60_000, undefined, {
      now: () => 0,
      setTimeout: () => 1,
      clearTimeout: () => {},
    }),
    toolTimeoutMs: 30_000,
  }
}

function expectDriveOperations(calls: Array<{ name: string; options: any }>) {
  for (const call of calls) {
    const mutation = call.name === 'write'
      || call.name === 'writeDrive'
      || call.name === 'api_claw_upsert_api_agent_drive_file'
    expect(call.options.operation).toBe(mutation ? 'mutation' : 'read_safe')
  }
}

describe('Buda Drive authority snapshot', () => {
  test('builds deterministic authority files and a hash manifest', () => {
    const first = buildBudaDriveSnapshot({
      project: { id: 8, title: '长篇测试' },
      chapter: { chapter_no: 12 },
      writingBible: '# 写作圣经',
      storyState: { location: '北城', chapter_no: 11 },
      continuity: '上一章在雨夜结束。',
      recentChapters: '第11章摘要',
      generatedAt: '2026-07-30T12:00:00.000Z',
    })
    const second = buildBudaDriveSnapshot({
      project: { id: 8, title: '长篇测试' },
      chapter: { chapter_no: 12 },
      writingBible: '# 写作圣经',
      storyState: { chapter_no: 11, location: '北城' },
      continuity: '上一章在雨夜结束。',
      recentChapters: '第11章摘要',
      generatedAt: '2026-07-30T12:00:00.000Z',
    })

    expect(Object.keys(first.files).sort()).toEqual([
      '/mangaforge/continuity.md',
      '/mangaforge/manifest.json',
      '/mangaforge/recent-chapters.md',
      '/mangaforge/story-state.json',
      '/mangaforge/writing-bible.md',
    ])
    expect(first.snapshotHash).toBe(second.snapshotHash)
    expect(JSON.parse(first.files['/mangaforge/manifest.json']!)).toMatchObject({
      project_id: 8,
      source_chapter: 11,
      target_chapter: 12,
      files: expect.objectContaining({ '/mangaforge/story-state.json': expect.any(String) }),
    })
  })

  test('uploads only changed files and verifies their remote text', async () => {
    const snapshot = buildBudaDriveSnapshot({
      project: { id: 8, title: '长篇测试' },
      chapter: { chapter_no: 12 },
      writingBible: '# 写作圣经',
      storyState: { chapter_no: 11 },
      continuity: '连续性',
      recentChapters: '最近章节',
      generatedAt: '2026-07-30T12:00:00.000Z',
    })
    const remote = new Map<string, string>()
    remote.set('/mangaforge/writing-bible.md', snapshot.files['/mangaforge/writing-bible.md']!)
    const calls: Array<{ name: string; args: any; options: any }> = []
    const client = {
      async callTool(name: string, args: any, options: any) {
        calls.push({ name, args, options })
        if (name === 'listDrive') {
          return result({ files: [...remote.keys()].map(path => ({ path, type: 'file' })) })
        }
        if (name === 'readDrive') return result({ content: remote.get(args.filePath) || '' })
        if (name === 'writeDrive') {
          remote.set(args.path, args.content)
          return result({ ok: true })
        }
        throw new Error(`unexpected tool ${name}`)
      },
    }

    const synced = await syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: { listDriveFiles: 'listDrive', readDriveText: 'readDrive', upsertDriveFile: 'writeDrive' } as any,
      agentId: 'agent-1',
      snapshot,
    })

    expect(synced.snapshot_hash).toBe(snapshot.snapshotHash)
    expect(synced.uploaded_paths).not.toContain('/mangaforge/writing-bible.md')
    expect(synced.uploaded_paths).toContain('/mangaforge/manifest.json')
    expect(remote.get('/mangaforge/manifest.json')).toBe(snapshot.files['/mangaforge/manifest.json'])
    expectDriveOperations(calls)
  })

  test('full-upserts an empty live Buda Drive without list or pre-upsert reads', async () => {
    const snapshot = snapshotFixture()
    const remote = new Map<string, string>()
    const operations: string[] = []
    const calls: Array<{ name: string; args: any; options: any }> = []
    const client = {
      async callTool(name: string, args: any, options: any) {
        calls.push({ name, args, options })
        if (name === 'api_claw_list_api_agent_drive_files') {
          throw new Error('live Buda Drive list must not be called')
        }
        if (name === 'api_claw_api_agent_drive_text') {
          const path = args.body.filePath
          operations.push(`read:${path}`)
          expect(args).toEqual({
            params: { agentId: 'agent-1' },
            body: { filePath: expect.any(String), maxBytes: 5_000_000 },
          })
          return result({
            content: remote.get(path) || '',
            exists: remote.has(path),
          })
        }
        if (name === 'api_claw_upsert_api_agent_drive_file') {
          const path = args.body.path
          operations.push(`write:${path}`)
          expect(args).toEqual({
            params: { agentId: 'agent-1' },
            body: {
              path,
              content: snapshot.files[path],
              mimeType: path.endsWith('.json') ? 'application/json' : 'text/markdown',
            },
          })
          remote.set(path, args.body.content)
          return result({ ok: true })
        }
        throw new Error(`unexpected tool ${name}`)
      },
    }

    const synced = await syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: {
        listDriveFiles: 'api_claw_list_api_agent_drive_files',
        readDriveText: 'api_claw_api_agent_drive_text',
        upsertDriveFile: 'api_claw_upsert_api_agent_drive_file',
      },
      agentId: 'agent-1',
      snapshot,
    })

    expect(synced.uploaded_paths).toEqual(LIVE_PATH_ORDER)
    expect(operations).toEqual(LIVE_PATH_ORDER.flatMap(path => [`write:${path}`, `read:${path}`]))
    expectDriveOperations(calls)
  })

  test('uses differential discovery unless both Buda mutation and read tools are live', async () => {
    const snapshot = snapshotFixture()
    const remote = new Map(Object.entries(snapshot.files))
    const calls: string[] = []
    const client = {
      async callTool(name: string, args: any) {
        calls.push(name)
        if (name === 'api_claw_list_api_agent_drive_files') {
          return result({ files: [...remote.keys()].map(path => ({ path, type: 'file' })) })
        }
        if (name === 'readDrive') return result({ content: remote.get(args.filePath) || '' })
        if (name === 'api_claw_upsert_api_agent_drive_file') throw new Error('unchanged files must not be written')
        throw new Error(`unexpected tool ${name}`)
      },
    }

    const synced = await syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: {
        listDriveFiles: 'api_claw_list_api_agent_drive_files',
        readDriveText: 'readDrive',
        upsertDriveFile: 'api_claw_upsert_api_agent_drive_file',
      },
      agentId: 'agent-1',
      snapshot,
    })

    expect(synced.uploaded_paths).toEqual([])
    expect(calls[0]).toBe('api_claw_list_api_agent_drive_files')
    expect(calls.filter(name => name === 'readDrive')).toHaveLength(LIVE_PATH_ORDER.length)
  })

  test('reconciles a committed upsert response failure without replaying the mutation', async () => {
    const snapshot = snapshotFixture()
    const changedPath = '/mangaforge/continuity.md'
    const remote = new Map(Object.entries(snapshot.files))
    remote.set(changedPath, 'stale')
    const calls: Array<{ name: string; args: any; options: any }> = []
    const client = {
      async callTool(name: string, args: any, options: any) {
        calls.push({ name, args, options })
        if (name === 'list') return result({ files: [...remote.keys()].map(path => ({ path, type: 'file' })) })
        if (name === 'read') return result({ content: remote.get(args.filePath) || '' })
        if (name === 'write') {
          remote.set(args.path, args.content)
          throw new Error('response lost after commit')
        }
        throw new Error(`unexpected tool ${name}`)
      },
    }

    const synced = await syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: { listDriveFiles: 'list', readDriveText: 'read', upsertDriveFile: 'write' } as any,
      agentId: 'agent-1',
      snapshot,
    })

    const writeIndex = calls.findIndex(call => call.name === 'write')
    const afterWrite = calls.slice(writeIndex + 1)
    expect(synced.uploaded_paths).toEqual([changedPath])
    expect(calls.filter(call => call.name === 'write')).toHaveLength(1)
    expect(afterWrite.filter(call => call.name === 'read')).toHaveLength(2)
    expect(afterWrite.every(call => call.options.operation === 'read_safe')).toBe(true)
    expectDriveOperations(calls)
  })

  test('retries a live upsert only after an exact pre-dispatch rejection is reconciled as uncommitted', async () => {
    const snapshot = snapshotFixture()
    const remote = new Map<string, string>()
    const calls: Array<{ name: string; args: any; options: any }> = []
    let writeAttempts = 0
    const client = {
      async callTool(name: string, args: any, options: any) {
        calls.push({ name, args, options })
        if (name === 'api_claw_list_api_agent_drive_files') throw new Error('live list must not be called')
        if (name === 'api_claw_api_agent_drive_text') {
          const path = args.body.filePath
          return result({ content: remote.get(path) || '', exists: remote.has(path) })
        }
        if (name === 'api_claw_upsert_api_agent_drive_file') {
          writeAttempts += 1
          if (writeAttempts === 1) {
            throw new McpError('MCP_CONNECTION_LOST', 'MCP 连接已失效', {
              reason: 'buda_server_not_initialized',
            })
          }
          remote.set(args.body.path, args.body.content)
          return result({ ok: true })
        }
        throw new Error(`unexpected tool ${name}`)
      },
    }

    const synced = await syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: {
        listDriveFiles: 'api_claw_list_api_agent_drive_files',
        readDriveText: 'api_claw_api_agent_drive_text',
        upsertDriveFile: 'api_claw_upsert_api_agent_drive_file',
      },
      agentId: 'agent-1',
      snapshot,
    })

    expect(synced.uploaded_paths).toEqual(LIVE_PATH_ORDER)
    expect(calls[0]?.name).toBe('api_claw_upsert_api_agent_drive_file')
    expect(writeAttempts).toBe(LIVE_PATH_ORDER.length + 1)
    for (const path of LIVE_PATH_ORDER) expect(remote.get(path)).toBe(snapshot.files[path])
    expectDriveOperations(calls)
  })

  test('does not replay a live upsert when the reconciliation read itself fails', async () => {
    const snapshot = snapshotFixture()
    const writeFailure = new McpError('MCP_CONNECTION_LOST', 'MCP 连接已失效', {
      reason: 'buda_server_not_initialized',
    })
    const calls: string[] = []
    let writeAttempts = 0
    const client = {
      async callTool(name: string, args: any) {
        calls.push(name)
        if (name === 'api_claw_api_agent_drive_text') {
          if (writeAttempts > 0) throw new Error('reconciliation read unavailable')
          return result({ content: '', exists: false })
        }
        if (name === 'api_claw_upsert_api_agent_drive_file') {
          writeAttempts += 1
          throw writeFailure
        }
        throw new Error(`unexpected tool ${name}`)
      },
    }

    const caught = await syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: {
        listDriveFiles: 'api_claw_list_api_agent_drive_files',
        readDriveText: 'api_claw_api_agent_drive_text',
        upsertDriveFile: 'api_claw_upsert_api_agent_drive_file',
      },
      agentId: 'agent-1',
      snapshot,
    }).catch(error => error)

    expect(caught).toMatchObject({ code: 'MCP_DRIVE_SYNC_FAILED' })
    expect(calls).toEqual([
      'api_claw_upsert_api_agent_drive_file',
      'api_claw_api_agent_drive_text',
    ])
    expect(writeAttempts).toBe(1)
  })

  test('does not replay an upsert when reconciliation returns an unknown read shape', async () => {
    const snapshot = snapshotFixture()
    const writeFailure = new Error('write outcome unknown')
    let writes = 0
    const client = {
      async callTool(name: string) {
        if (name === 'list') return result({ files: [] })
        if (name === 'write') {
          writes += 1
          throw writeFailure
        }
        if (name === 'read') return result({})
        throw new Error(`unexpected tool ${name}`)
      },
    }
    await expect(syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: { listDriveFiles: 'list', readDriveText: 'read', upsertDriveFile: 'write' } as any,
      agentId: 'agent-1',
      snapshot,
      stabilize: async () => {},
    })).rejects.toMatchObject({ code: 'MCP_DRIVE_SYNC_FAILED' })
    expect(writes).toBe(1)
  })

  test('fails after one ambiguous upsert when read reconciliation does not match', async () => {
    const snapshot = snapshotFixture()
    const changedPath = '/mangaforge/continuity.md'
    const remote = new Map(Object.entries(snapshot.files))
    remote.delete(changedPath)
    const calls: Array<{ name: string; args: any; options: any }> = []
    const client = {
      async callTool(name: string, args: any, options: any) {
        calls.push({ name, args, options })
        if (name === 'list') return result({ files: [...remote.keys()].map(path => ({ path, type: 'file' })) })
        if (name === 'read') return result({ content: remote.get(args.filePath) || '' })
        if (name === 'write') throw new Error('write outcome unknown')
        throw new Error(`unexpected tool ${name}`)
      },
    }

    await expect(syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: { listDriveFiles: 'list', readDriveText: 'read', upsertDriveFile: 'write' } as any,
      agentId: 'agent-1',
      snapshot,
    })).rejects.toMatchObject({ code: 'MCP_DRIVE_SYNC_FAILED' })

    const writeIndex = calls.findIndex(call => call.name === 'write')
    const afterWrite = calls.slice(writeIndex + 1)
    expect(calls.filter(call => call.name === 'write')).toHaveLength(1)
    expect(afterWrite).toHaveLength(1)
    expect(afterWrite[0]).toMatchObject({ name: 'read', options: { operation: 'read_safe' } })
    expectDriveOperations(calls)
  })

  test('classifies Drive list and read as read-safe and upsert as mutation', async () => {
    const snapshot = snapshotFixture()
    const remote = new Map(Object.entries(snapshot.files))
    remote.set('/mangaforge/continuity.md', 'stale')
    const calls: Array<{ name: string; options: any }> = []
    const client = {
      async callTool(name: string, args: any, options: any) {
        calls.push({ name, options })
        if (name === 'list') return result({ files: [...remote.keys()].map(path => ({ path, type: 'file' })) })
        if (name === 'read') return result({ content: remote.get(args.filePath) || '' })
        if (name === 'write') {
          remote.set(args.path, args.content)
          return result({ ok: true })
        }
        throw new Error(`unexpected tool ${name}`)
      },
    }

    await syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: { listDriveFiles: 'list', readDriveText: 'read', upsertDriveFile: 'write' } as any,
      agentId: 'agent-1',
      snapshot,
    })

    expect(calls.filter(call => call.name === 'list' || call.name === 'read').every(call => call.options.operation === 'read_safe')).toBe(true)
    expect(calls.filter(call => call.name === 'write').every(call => call.options.operation === 'mutation')).toBe(true)
    expectDriveOperations(calls)
  })

  test('blocks generation when remote verification differs', async () => {
    const snapshot = buildBudaDriveSnapshot({
      project: { id: 8 }, chapter: { chapter_no: 1 }, writingBible: 'x', storyState: {}, continuity: '', recentChapters: '', generatedAt: 'now',
    })
    const calls: Array<{ name: string; options: any }> = []
    const client = {
      async callTool(name: string, _args: any, options: any) {
        calls.push({ name, options })
        if (name === 'list') return result({ files: [] })
        if (name === 'write') return result({ ok: true })
        return result({ content: 'stale remote data' })
      },
    }
    await expect(syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: { listDriveFiles: 'list', readDriveText: 'read', upsertDriveFile: 'write' } as any,
      agentId: 'agent-1',
      snapshot,
    })).rejects.toMatchObject({ code: 'MCP_DRIVE_SYNC_FAILED' })
    expect(calls.find(call => call.name === 'write')?.options.operation).toBe('mutation')
    expect(calls.filter(call => call.name !== 'write').every(call => call.options.operation === 'read_safe')).toBe(true)
    expectDriveOperations(calls)
  })

  test('rechecks a mismatched read-back without replaying the Drive write', async () => {
    const snapshot = snapshotFixture()
    const remote = new Map<string, string>()
    const readCounts = new Map<string, number>()
    let writes = 0
    const client = {
      async callTool(name: string, args: any) {
        if (name === 'list') return result({ files: [] })
        if (name === 'write') {
          writes += 1
          remote.set(args.path, args.content)
          return result({ ok: true })
        }
        if (name === 'read') {
          const count = (readCounts.get(args.filePath) || 0) + 1
          readCounts.set(args.filePath, count)
          return result({ content: count === 1 ? 'stale during propagation' : remote.get(args.filePath) || '' })
        }
        throw new Error(`unexpected tool ${name}`)
      },
    }

    const synced = await syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: { listDriveFiles: 'list', readDriveText: 'read', upsertDriveFile: 'write' } as any,
      agentId: 'agent-1',
      snapshot,
    })

    expect(synced.uploaded_paths).toHaveLength(5)
    expect(writes).toBe(5)
    expect(readCounts.get('/mangaforge/writing-bible.md')).toBe(2)
  })

  test('propagates an exact not-ready probe failure from Drive sync unchanged', async () => {
    const snapshot = snapshotFixture()
    const notReady = new McpError('MCP_SERVER_NOT_READY', 'MCP 服务尚未稳定就绪', { phase: 'drive_sync' })
    const client = {
      async callTool(name: string) {
        if (name === 'list') throw notReady
        throw new Error(`unexpected tool ${name}`)
      },
    }
    await expect(syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: { listDriveFiles: 'list', readDriveText: 'read', upsertDriveFile: 'write' } as any,
      agentId: 'agent-1',
      snapshot,
    })).rejects.toMatchObject({ code: 'MCP_SERVER_NOT_READY', details: { phase: 'drive_sync' } })
  })

  test('stabilizes before retrying an upsert whose read-back differs', async () => {
    const snapshot = snapshotFixture()
    const changedPath = '/mangaforge/continuity.md'
    const remote = new Map(Object.entries(snapshot.files))
    remote.set(changedPath, 'stale')
    let writes = 0
    let stabilized = 0
    const client = {
      async callTool(name: string, args: any) {
        if (name === 'list') return result({ files: [...remote.keys()].map(path => ({ path, type: 'file' })) })
        if (name === 'read') return result({ content: remote.get(args.filePath) || '' })
        if (name === 'write') {
          writes += 1
          if (writes === 1) {
            remote.set(args.path, 'different remote content')
            throw new McpError('MCP_CONNECTION_LOST', 'write outcome unknown')
          }
          remote.set(args.path, args.content)
          return result({ ok: true })
        }
        throw new Error(`unexpected tool ${name}`)
      },
    }
    await syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: { listDriveFiles: 'list', readDriveText: 'read', upsertDriveFile: 'write' } as any,
      agentId: 'agent-1',
      snapshot,
      stabilize: async () => { stabilized += 1 },
    })
    expect(writes).toBe(2)
    expect(stabilized).toBe(1)
    expect(remote.get(changedPath)).toBe(snapshot.files[changedPath])
  })

  test('fails closed when Drive list returns an unknown shape and never writes', async () => {
    const snapshot = snapshotFixture()
    let writes = 0
    const client = {
      async callTool(name: string) {
        if (name === 'list') return result({})
        if (name === 'write') { writes += 1; return result({ ok: true }) }
        throw new Error(`unexpected tool ${name}`)
      },
    }
    await expect(syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: { listDriveFiles: 'list', readDriveText: 'read', upsertDriveFile: 'write' } as any,
      agentId: 'agent-1',
      snapshot,
    })).rejects.toMatchObject({ code: 'MCP_DRIVE_SYNC_FAILED' })
    expect(writes).toBe(0)
  })

  test('fails closed when final Drive read-back is unknown even for empty content', async () => {
    const snapshot = buildBudaDriveSnapshot({
      project: { id: 8 }, chapter: { chapter_no: 1 }, writingBible: '', storyState: {}, continuity: '', recentChapters: '', generatedAt: 'now',
    })
    const files = new Map(Object.entries(snapshot.files))
    const client = {
      async callTool(name: string, args: any) {
        if (name === 'list') return result({ files: [] })
        if (name === 'write') return result({ ok: true })
        if (name === 'read') {
          const path = args.filePath
          if (path === '/mangaforge/writing-bible.md') return { content: [{ type: 'text', text: '{}' }] }
          return result({ content: files.get(path) || '' })
        }
        throw new Error(`unexpected tool ${name}`)
      },
    }
    await expect(syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: { listDriveFiles: 'list', readDriveText: 'read', upsertDriveFile: 'write' } as any,
      agentId: 'agent-1',
      snapshot,
    })).rejects.toMatchObject({ code: 'MCP_DRIVE_SYNC_FAILED' })
  })

  test('fails closed when an existing differential Drive file read is unknown', async () => {
    const snapshot = buildBudaDriveSnapshot({
      project: { id: 8 }, chapter: { chapter_no: 1 }, writingBible: '', storyState: {}, continuity: '', recentChapters: '', generatedAt: 'now',
    })
    let writes = 0
    const client = {
      async callTool(name: string, args: any) {
        if (name === 'list') return result({ files: [{ path: '/mangaforge/writing-bible.md', type: 'file' }] })
        if (name === 'read' && args.filePath === '/mangaforge/writing-bible.md') return result({})
        if (name === 'write') { writes += 1; return result({ ok: true }) }
        throw new Error(`unexpected tool ${name}`)
      },
    }
    await expect(syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: { listDriveFiles: 'list', readDriveText: 'read', upsertDriveFile: 'write' } as any,
      agentId: 'agent-1',
      snapshot,
    })).rejects.toMatchObject({ code: 'MCP_DRIVE_SYNC_FAILED' })
    expect(writes).toBe(0)
  })

  test('does not treat exists-only Drive reads as known empty files', async () => {
    const snapshot = buildBudaDriveSnapshot({
      project: { id: 8 }, chapter: { chapter_no: 1 }, writingBible: '', storyState: {}, continuity: '', recentChapters: '', generatedAt: 'now',
    })
    let writes = 0
    const client = {
      async callTool(name: string, args: any) {
        if (name === 'list') return result({ files: [{ path: '/mangaforge/writing-bible.md', type: 'file' }] })
        if (name === 'read' && args.filePath === '/mangaforge/writing-bible.md') return result({ exists: true })
        if (name === 'write') { writes += 1; return result({ ok: true }) }
        throw new Error(`unexpected tool ${name}`)
      },
    }
    await expect(syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: { listDriveFiles: 'list', readDriveText: 'read', upsertDriveFile: 'write' } as any,
      agentId: 'agent-1',
      snapshot,
    })).rejects.toMatchObject({ code: 'MCP_DRIVE_SYNC_FAILED' })
    expect(writes).toBe(0)
  })

  test('fails closed when Drive list contains a malformed item', async () => {
    const snapshot = snapshotFixture()
    let writes = 0
    const client = {
      async callTool(name: string) {
        if (name === 'list') return result({ files: [{}] })
        if (name === 'write') { writes += 1; return result({ ok: true }) }
        throw new Error(`unexpected tool ${name}`)
      },
    }
    await expect(syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: { listDriveFiles: 'list', readDriveText: 'read', upsertDriveFile: 'write' } as any,
      agentId: 'agent-1',
      snapshot,
    })).rejects.toMatchObject({ code: 'MCP_DRIVE_SYNC_FAILED' })
    expect(writes).toBe(0)
  })

  test('accepts a folder entry without a path while listing valid files', async () => {
    const snapshot = snapshotFixture()
    const remote = new Map(Object.entries(snapshot.files))
    let writes = 0
    const client = {
      async callTool(name: string, args: any) {
        if (name === 'list') return result({ files: [{ type: 'folder' }, ...[...remote.keys()].map(path => ({ path, type: 'file' }))] })
        if (name === 'read') return result({ content: remote.get(args.filePath) || '' })
        if (name === 'write') { writes += 1; return result({ ok: true }) }
        throw new Error(`unexpected tool ${name}`)
      },
    }
    const synced = await syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: { listDriveFiles: 'list', readDriveText: 'read', upsertDriveFile: 'write' } as any,
      agentId: 'agent-1',
      snapshot,
    })
    expect(synced.uploaded_paths).toEqual([])
    expect(writes).toBe(0)
  })

  test('bounds the complete current-stage file when stage envelope fields are oversized', () => {
    const snapshot = buildBudaDriveSnapshot({
      project: { id: 8 },
      chapter: { chapter_no: 1 },
      writingBible: '',
      storyState: {},
      continuity: '',
      recentChapters: '',
      stage: 's'.repeat(300_000),
      responseContract: 'c'.repeat(300_000),
      invocationId: 'i'.repeat(300_000),
      prompt: '正文',
      generatedAt: 'now',
    })
    expect(new TextEncoder().encode(snapshot.files['MANGAFORGE_CURRENT_STAGE.md']!).byteLength)
      .toBeLessThanOrEqual(256 * 1_024)
  })

  test('does not retry an arbitrary mutation error merely because stabilization is available', async () => {
    const snapshot = snapshotFixture()
    const changedPath = '/mangaforge/continuity.md'
    const remote = new Map(Object.entries(snapshot.files))
    remote.set(changedPath, 'stale')
    let writes = 0
    const client = {
      async callTool(name: string, args: any) {
        if (name === 'list') return result({ files: [...remote.keys()].map(path => ({ path, type: 'file' })) })
        if (name === 'read') return result({ content: remote.get(args.filePath) || '' })
        if (name === 'write') { writes += 1; throw new Error('arbitrary mutation failure') }
        throw new Error(`unexpected tool ${name}`)
      },
    }
    await expect(syncBudaDriveSnapshot({
      ...deadlineOptions(),
      client: client as any,
      tools: { listDriveFiles: 'list', readDriveText: 'read', upsertDriveFile: 'write' } as any,
      agentId: 'agent-1',
      snapshot,
      stabilize: async () => {},
    })).rejects.toMatchObject({ code: 'MCP_DRIVE_SYNC_FAILED' })
    expect(writes).toBe(1)
  })
})
