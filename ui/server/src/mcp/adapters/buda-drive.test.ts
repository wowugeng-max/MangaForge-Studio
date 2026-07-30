import { describe, expect, test } from 'bun:test'
import { buildBudaDriveSnapshot, syncBudaDriveSnapshot } from './buda-drive'

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

function expectDriveOperations(calls: Array<{ name: string; options: any }>) {
  for (const call of calls) {
    expect(call.options.operation).toBe(call.name === 'write' || call.name === 'writeDrive' ? 'mutation' : 'read_safe')
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
      client: client as any,
      tools: { listDriveFiles: 'list', readDriveText: 'read', upsertDriveFile: 'write' } as any,
      agentId: 'agent-1',
      snapshot,
    })).rejects.toMatchObject({ code: 'MCP_DRIVE_SYNC_FAILED' })
    expect(calls.find(call => call.name === 'write')?.options.operation).toBe('mutation')
    expect(calls.filter(call => call.name !== 'write').every(call => call.options.operation === 'read_safe')).toBe(true)
    expectDriveOperations(calls)
  })
})
