// ui/server/src/kernel/codex/session.test.ts
import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
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
    expect(mapContractSandbox('workspace-write')).toBe('workspaceWrite')
    expect(mapContractSandbox('read-only')).toBe('readOnly')
    expect(mapContractSandbox('danger-full-access')).toBe('dangerFullAccess')
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
})
