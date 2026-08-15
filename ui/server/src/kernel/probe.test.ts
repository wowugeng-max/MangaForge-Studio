import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { kernelProbePath } from './paths'
import { loadKernelProbe, runKernelProbe } from './probe'

function seedProviders(ws: string) {
  writeFileSync(join(ws, 'providers.json'), JSON.stringify([
    { id: 'any', api_format: 'codex_responses', default_base_url: 'https://a/v1', custom_headers: {} },
    { id: 'gemini', api_format: 'openai_compatible', default_base_url: 'https://g/v1', custom_headers: {} },
  ]))
  writeFileSync(join(ws, 'models.json'), '[]')
}

describe('kernel probe', () => {
  test('binary missing marks binary+handshake failed but still evaluates providers', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'probe-ws-'))
    seedProviders(ws)
    const probe = await runKernelProbe(ws, {
      runVersion: async () => { throw new Error('ENOENT') },
      now: () => '2026-08-15T00:00:00Z',
    })
    expect(probe.binary.ok).toBe(false)
    expect(probe.handshake.ok).toBe(false)
    expect(probe.providers['any'].ok).toBe(true)
    expect(probe.providers['gemini']).toEqual({ ok: false, error_code: 'PROVIDER_TRANSLATE_FAILED' })
    expect(probe.skills).toBe('pending')
    expect(probe.agents_spawn).toBe('pending')
    expect(existsSync(kernelProbePath(ws))).toBe(true)
    expect(loadKernelProbe(ws)?.checked_at).toBe('2026-08-15T00:00:00Z')
  })

  test('healthy binary and handshake pass ①②', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'probe-ws-'))
    seedProviders(ws)
    const probe = await runKernelProbe(ws, {
      runVersion: async () => 'codex-cli 1.0.0',
      runHandshake: async () => {},
    })
    expect(probe.binary).toEqual({ ok: true, version: '1.0.0' })
    expect(probe.handshake.ok).toBe(true)
  })
})
