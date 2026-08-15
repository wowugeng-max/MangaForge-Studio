import { describe, expect, test } from 'bun:test'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { kernelContractsDir, kernelJobDir, kernelRoot, kernelRuntimePath } from './paths'
import { checkKernelBinary, loadKernelRuntime } from './runtime'

function tempWs() { return mkdtempSync(join(tmpdir(), 'kernel-ws-')) }

describe('kernel paths', () => {
  test('paths derive from workspace', () => {
    expect(kernelRoot('/ws')).toBe('/ws/.mangaforge/kernel')
    expect(kernelContractsDir('/ws')).toBe('/ws/.mangaforge/kernel/contracts')
    expect(kernelJobDir('/ws', 'j1')).toBe('/ws/.mangaforge/kernel/jobs/j1')
  })
})

describe('kernel runtime', () => {
  test('missing runtime.json falls back to defaults', () => {
    const runtime = loadKernelRuntime(tempWs())
    expect(runtime).toEqual({
      engine: 'codex-app-server',
      codex_version: '',
      binary: 'codex',
      protocol: 'app-server-stdio',
      supports_chat_wire_api: false,
    })
  })

  test('runtime.json overrides defaults', () => {
    const ws = tempWs()
    mkdirSync(kernelRoot(ws), { recursive: true })
    writeFileSync(kernelRuntimePath(ws), JSON.stringify({ codex_version: '0.99.0', supports_chat_wire_api: true }))
    const runtime = loadKernelRuntime(ws)
    expect(runtime.codex_version).toBe('0.99.0')
    expect(runtime.supports_chat_wire_api).toBe(true)
  })

  test('binary missing -> KERNEL_RUNTIME_UNAVAILABLE', async () => {
    const result = await checkKernelBinary(loadKernelRuntime(tempWs()), {
      runVersion: async () => { throw new Error('ENOENT') },
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error_code).toBe('KERNEL_RUNTIME_UNAVAILABLE')
  })

  test('version mismatch -> KERNEL_RUNTIME_UNAVAILABLE, match -> ok', async () => {
    const runtime = { ...loadKernelRuntime(tempWs()), codex_version: '0.99.0' }
    const bad = await checkKernelBinary(runtime, { runVersion: async () => 'codex-cli 0.98.0' })
    expect(bad.ok).toBe(false)
    const good = await checkKernelBinary(runtime, { runVersion: async () => 'codex-cli 0.99.0' })
    expect(good.ok).toBe(true)
    if (good.ok) expect(good.version).toBe('0.99.0')
  })

  test('empty codex_version pins nothing, any binary version passes', async () => {
    const result = await checkKernelBinary(loadKernelRuntime(tempWs()), { runVersion: async () => 'codex-cli 1.2.3' })
    expect(result.ok).toBe(true)
  })
})
