import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises'
import { readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { checkKeysOnce, keyMonitorEnabledFromEnv, startKeyMonitor } from './key-monitor'

let workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-key-monitor-'))
  workspaces.push(workspace)
  return workspace
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('key monitor', () => {
  test('automatic key monitoring is disabled unless explicitly enabled', () => {
    expect(keyMonitorEnabledFromEnv(undefined)).toBe(false)
    expect(keyMonitorEnabledFromEnv('')).toBe(false)
    expect(keyMonitorEnabledFromEnv(' ')).toBe(false)
    expect(keyMonitorEnabledFromEnv('false')).toBe(false)
    expect(keyMonitorEnabledFromEnv('1')).toBe(false)
    expect(keyMonitorEnabledFromEnv('true')).toBe(true)
    expect(keyMonitorEnabledFromEnv('TRUE')).toBe(true)
    expect(keyMonitorEnabledFromEnv(' true ')).toBe(true)
  })

  test('server startup uses the explicit opt-in parser', () => {
    const source = readFileSync(join(import.meta.dir, 'index.ts'), 'utf8')

    expect(source).toContain("import { keyMonitorEnabledFromEnv, startKeyMonitor } from './key-monitor'")
    expect(source).toContain('enabled: keyMonitorEnabledFromEnv(process.env.KEY_MONITOR_ENABLED)')
    expect(source).not.toContain("process.env.KEY_MONITOR_ENABLED || 'true'")
  })

  test('disabled automatic monitoring never probes immediately or on its interval', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      {
        id: 'openai',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        default_base_url: 'https://gateway.example/v1',
        is_active: true,
      },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 1, provider: 'openai', key: 'must-not-run', is_active: true, last_checked: '' },
    ]))
    await writeFile(join(workspace, 'models.json'), '[]')
    const previousFetch = globalThis.fetch
    let calls = 0
    globalThis.fetch = (async () => {
      calls += 1
      return new Response('{}', { status: 200 })
    }) as any

    try {
      const monitor = startKeyMonitor(() => workspace, {
        enabled: false,
        intervalMs: 1,
        runImmediately: true,
      })
      await new Promise(resolve => setTimeout(resolve, 20))
      monitor.stop()
      expect(monitor.started).toBe(false)
      expect(calls).toBe(0)
    } finally {
      globalThis.fetch = previousFetch
    }
  })

  test('checks only stale active keys and applies upstream monitoring state', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      {
        id: 'openai',
        display_name: 'OpenAI',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        supported_modalities: ['chat'],
        default_base_url: 'https://gateway.example/v1',
        is_active: true,
      },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 1, provider: 'openai', key: 'good-key', is_active: true, quota_total: 10, quota_used: 4, failure_count: 2, last_checked: '2026-06-06T21:00:00.000Z' },
      { id: 2, provider: 'openai', key: 'recent-key', is_active: true, quota_total: 10, quota_used: 1, failure_count: 2, last_checked: '2026-06-06T23:30:00.000Z' },
      { id: 3, provider: 'openai', key: 'disabled-key', is_active: false, quota_total: 10, quota_used: 1, failure_count: 0, last_checked: '2026-06-06T20:00:00.000Z' },
      { id: 4, provider: 'openai', key: 'bad-key', is_active: true, quota_total: 10, quota_used: 1, failure_count: 2, last_checked: '2026-06-06T20:00:00.000Z' },
    ]))

    const previousFetch = globalThis.fetch
    const calls: string[] = []
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      const auth = String((init?.headers as any)?.Authorization || '')
      calls.push(auth)
      if (auth.includes('good-key')) return new Response(JSON.stringify({ ok: true }), { status: 200 })
      return new Response(JSON.stringify({ error: 'bad key' }), { status: 401 })
    }) as any

    try {
      const report = await checkKeysOnce(workspace, {
        now: new Date('2026-06-07T00:00:00.000Z'),
        minCheckAgeMs: 60 * 60 * 1000,
      })

      expect(calls).toEqual(['Bearer good-key', 'Bearer bad-key'])
      expect(report.results.map(item => ({ id: item.id, valid: item.valid }))).toEqual([
        { id: 1, valid: true },
        { id: 4, valid: false },
      ])
      expect(report.skipped.map(item => ({ id: item.id, reason: item.reason }))).toEqual([
        { id: 2, reason: 'recently_checked' },
        { id: 3, reason: 'disabled' },
      ])

      const stored = JSON.parse(await readFile(join(workspace, 'keys.json'), 'utf8'))
      expect(stored.find((item: any) => item.id === 1)).toMatchObject({
        is_active: true,
        failure_count: 0,
        quota_remaining: 6,
        last_checked: '2026-06-07T00:00:00.000Z',
      })
      expect(stored.find((item: any) => item.id === 2)).toMatchObject({
        is_active: true,
        failure_count: 2,
        last_checked: '2026-06-06T23:30:00.000Z',
      })
      expect(stored.find((item: any) => item.id === 4)).toMatchObject({
        is_active: false,
        failure_count: 3,
        last_checked: '2026-06-07T00:00:00.000Z',
      })
    } finally {
      globalThis.fetch = previousFetch
    }
  })

  test('uses the bound model probe before fallback checks during background monitoring', async () => {
    const workspace = await tempWorkspace()
    await writeFile(join(workspace, 'providers.json'), JSON.stringify([
      {
        id: 'openai',
        display_name: 'OpenAI',
        service_type: 'llm',
        api_format: 'openai_compatible',
        auth_type: 'bearer',
        supported_modalities: ['chat'],
        default_base_url: 'https://gateway.example/v1',
        is_active: true,
      },
    ]))
    await writeFile(join(workspace, 'keys.json'), JSON.stringify([
      { id: 1, provider: 'openai', key: 'model-key', is_active: true, quota_total: 10, quota_used: 2, failure_count: 2, last_checked: '2026-06-06T20:00:00.000Z' },
    ]))
    await writeFile(join(workspace, 'models.json'), JSON.stringify([
      {
        id: 11,
        api_key_id: 1,
        provider: 'openai',
        display_name: 'Real GPT',
        model_name: 'gpt-real',
        capabilities: { chat: true },
        health_status: 'unknown',
      },
    ]))

    const previousFetch = globalThis.fetch
    const calls: Array<{ url: string, method: string, body: any }> = []
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({
        url: String(url),
        method: String(init?.method || 'GET'),
        body: init?.body ? JSON.parse(String(init.body)) : null,
      })
      if (String(init?.method || 'GET') === 'POST') {
        return new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 })
      }
      return new Response(JSON.stringify({ error: 'fallback should not run' }), { status: 404 })
    }) as any

    try {
      const report = await checkKeysOnce(workspace, {
        now: new Date('2026-06-07T00:00:00.000Z'),
        minCheckAgeMs: 60 * 60 * 1000,
      })

      expect(report.results).toEqual([
        { id: 1, provider: 'openai', valid: true, message: 'Key test passed (gpt-real)', status: undefined },
      ])
      expect(calls).toHaveLength(1)
      expect(calls[0]).toMatchObject({
        url: 'https://gateway.example/v1/chat/completions',
        method: 'POST',
        body: { model: 'gpt-real' },
      })

      const stored = JSON.parse(await readFile(join(workspace, 'keys.json'), 'utf8'))
      expect(stored[0]).toMatchObject({
        is_active: true,
        failure_count: 0,
        quota_remaining: 8,
      })
    } finally {
      globalThis.fetch = previousFetch
    }
  })
})
