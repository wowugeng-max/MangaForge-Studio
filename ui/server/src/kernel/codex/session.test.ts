// ui/server/src/kernel/codex/session.test.ts
import { describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mapContractSandbox, startCodexSession } from './session'

const FIXTURE = join(import.meta.dir, 'fixtures', 'fake-app-server.ts')

function sessionInput(cwd: string, env: Record<string, string> = {}) {
  return {
    binary: 'codex-not-used',
    projectDir: cwd,
    codexHome: mkdtempSync(join(tmpdir(), 'sess-home-')),
    envKey: 'test-key',
    argv: [process.execPath, FIXTURE],
    extraEnv: env,
  }
}

describe('codex session', () => {
  test('sandbox mapping', () => {
    expect(mapContractSandbox('workspace-write')).toBe('workspace-write')
    expect(mapContractSandbox('read-only')).toBe('read-only')
    expect(mapContractSandbox('danger-full-access')).toBe('danger-full-access')
    expect(mapContractSandbox('workspaceWrite')).toBe('workspace-write')
  })

  test('start → listSkills → runTurn returns last agent message and completed params', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'sess-cwd-'))
    const session = await startCodexSession(sessionInput(cwd, {
      FAKE_SKILLS: JSON.stringify([{ name: 'story-review', path: join(cwd, '.agents/skills/story-review') }]),
      FAKE_AGENT_MESSAGE: '最终审稿回复',
    }))
    expect(session.threadId).toBe('fake-thread-1')
    const skills = await session.listSkills()
    expect(skills[0].name).toBe('story-review')
    const turn = await session.runTurn({ text: '$story-review\n审查', skill: skills[0] })
    expect(turn.turnId).toBe('fake-turn-1')
    expect(turn.lastAgentMessage).toBe('最终审稿回复')
    session.close()
  })

  test('idle timeout interrupts hung turn with ENGINE_FAILED', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'sess-cwd-'))
    const session = await startCodexSession(sessionInput(cwd, { FAKE_HANG_TURN: '1' }))
    const started = Date.now()
    try {
      await session.runTurn({ text: 'x', idleTimeoutMs: 300, hardTimeoutMs: 5000 })
      throw new Error('should have timed out')
    } catch (error: any) {
      expect(String(error.message)).toContain('turn timeout')
      expect(error.code).toBe('ENGINE_FAILED')
    }
    expect(Date.now() - started).toBeLessThan(3000)
    session.close()
  })

  test('handshake failure kills the child process', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'sess-cwd-'))
    const dir = mkdtempSync(join(tmpdir(), 'sess-peer-'))
    const flagPath = join(dir, 'dead.flag')
    const scriptPath = join(dir, 'refuse-init.ts')
    writeFileSync(scriptPath, `
import { writeFileSync } from 'node:fs'
process.on('exit', () => writeFileSync(${JSON.stringify(flagPath)}, 'dead'))
process.on('SIGTERM', () => process.exit(0))
const decoder = new TextDecoder()
let buffer = ''
process.stdin.on('data', (chunk: Uint8Array) => {
  buffer += decoder.decode(chunk)
  let idx
  while ((idx = buffer.indexOf('\\n')) >= 0) {
    const line = buffer.slice(0, idx).trim()
    buffer = buffer.slice(idx + 1)
    if (!line) continue
    let msg: any
    try { msg = JSON.parse(line) } catch { continue }
    if (msg.method === 'initialize') {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: 'init refused' } }) + '\\n')
    }
  }
})
`)
    try {
      await startCodexSession({
        ...sessionInput(cwd),
        argv: [process.execPath, scriptPath],
      })
      throw new Error('should have rejected')
    } catch (error: any) {
      expect(String(error.message)).toMatch(/init refused/)
      expect(error.code).toBe('ENGINE_FAILED')
    }
    const deadline = Date.now() + 2000
    while (!existsSync(flagPath) && Date.now() < deadline) {
      await Bun.sleep(50)
    }
    expect(existsSync(flagPath)).toBe(true)
  })

  test('mid-turn child exit rejects runTurn without waiting idle timeout', async () => {
    const cwd = mkdtempSync(join(tmpdir(), 'sess-cwd-'))
    const dir = mkdtempSync(join(tmpdir(), 'sess-peer-'))
    const scriptPath = join(dir, 'exit-after-turn.ts')
    writeFileSync(scriptPath, `
function send(message: Record<string, any>) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\\n')
}
const decoder = new TextDecoder()
let buffer = ''
process.stdin.on('data', (chunk: Uint8Array) => {
  buffer += decoder.decode(chunk)
  let idx
  while ((idx = buffer.indexOf('\\n')) >= 0) {
    const line = buffer.slice(0, idx).trim()
    buffer = buffer.slice(idx + 1)
    if (!line) continue
    let msg: any
    try { msg = JSON.parse(line) } catch { continue }
    if (msg.method === 'initialize') send({ id: msg.id, result: {} })
    else if (msg.method === 'thread/start') send({ id: msg.id, result: { threadId: 'fake-thread-1' } })
    else if (msg.method === 'turn/start') {
      send({ id: msg.id, result: { turnId: 'fake-turn-1' } })
      setTimeout(() => process.exit(0), 50)
    }
  }
})
`)
    const session = await startCodexSession({
      ...sessionInput(cwd),
      argv: [process.execPath, scriptPath],
    })
    const started = Date.now()
    try {
      await session.runTurn({ text: 'x', idleTimeoutMs: 10_000, hardTimeoutMs: 20_000 })
      throw new Error('should have rejected')
    } catch (error: any) {
      expect(String(error.message)).toMatch(/app-server exited/)
      expect(error.code).toBe('ENGINE_FAILED')
    }
    expect(Date.now() - started).toBeLessThan(5000)
    session.close()
  })
})
