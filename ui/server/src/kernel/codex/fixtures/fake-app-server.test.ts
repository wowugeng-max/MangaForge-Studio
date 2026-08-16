// ui/server/src/kernel/codex/fixtures/fake-app-server.test.ts
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnCodexRpc } from '../rpc'

const FIXTURE = join(import.meta.dir, 'fake-app-server.ts')

function client(cwd: string, env: Record<string, string> = {}) {
  return spawnCodexRpc({ argv: [process.execPath, FIXTURE], cwd, env })
}

describe('fake app-server', () => {
  test('rejects thread/start before initialized notification', async () => {
    const rpc = client(mkdtempSync(join(tmpdir(), 'fake-cwd-')))
    await rpc.request('initialize', { clientInfo: { name: 'mangaforge' } })
    await expect(rpc.request('thread/start', { cwd: '/x' })).rejects.toThrow('not initialized')
    rpc.kill()
  })

  test('full happy path: thread, skills, turn with spawn + file write + agent message', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'fake-cwd-'))
    const rpc = client(cwd, {
      FAKE_SKILLS: JSON.stringify([{ name: 'story-review', path: join(cwd, '.agents/skills/story-review') }]),
      FAKE_SPAWN: '1',
      FAKE_WRITE_FILE: '审稿/第002章.md',
      FAKE_WRITE_CONTENT: 'Fallback: none\n报告',
      FAKE_AGENT_MESSAGE: '审稿完成',
    })
    await rpc.request('initialize', { clientInfo: { name: 'mangaforge' } })
    rpc.notify('initialized')
    const thread = await rpc.request('thread/start', { cwd, sandbox: 'workspaceWrite', approvalPolicy: 'never' })
    expect(thread.threadId).toBe('fake-thread-1')
    const skills = await rpc.request('skills/list', { cwds: [cwd] })
    expect(skills.skills[0].name).toBe('story-review')
    const seen: string[] = []
    rpc.onNotification((method) => { seen.push(method) })
    const completed = rpc.waitForNotification((m) => m === 'turn/completed', 5000)
    const turn = await rpc.request('turn/start', { threadId: thread.threadId, input: [{ type: 'text', text: 'x' }] })
    expect(turn.turnId).toBe('fake-turn-1')
    await completed
    expect(seen).toEqual(['turn/started', 'thread/started', 'item/completed', 'turn/completed'])
    expect(existsSync(join(cwd, '审稿/第002章.md'))).toBe(true)
    expect(readFileSync(join(cwd, '审稿/第002章.md'), 'utf8')).toContain('Fallback: none')
    rpc.kill()
  })

  test('hang mode answers turn/start but sends nothing; interrupt completes with aborted', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'fake-cwd-'))
    const rpc = client(cwd, { FAKE_HANG_TURN: '1' })
    await rpc.request('initialize', {})
    rpc.notify('initialized')
    const thread = await rpc.request('thread/start', { cwd })
    const turn = await rpc.request('turn/start', { threadId: thread.threadId, input: [] })
    const completed = rpc.waitForNotification((m, p) => m === 'turn/completed' && p.aborted === true, 5000)
    await rpc.request('turn/interrupt', { threadId: thread.threadId, turnId: turn.turnId })
    await completed
    rpc.kill()
  })
})
