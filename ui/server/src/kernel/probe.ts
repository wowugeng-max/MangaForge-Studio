import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { readProviders } from '../provider-store'
import { kernelProbePath } from './paths'
import { buildCodexConfigToml } from './providers/translate'
import { checkKernelBinary, loadKernelRuntime } from './runtime'

export type KernelProbeResult = {
  checked_at: string
  binary: { ok: boolean; version?: string; message?: string }
  handshake: { ok: boolean; message?: string }
  providers: Record<string, { ok: boolean; error_code?: string }>
  skills: 'pending'
  agents_spawn: 'pending'
}

async function defaultRunHandshake(binary: string): Promise<void> {
  const proc = Bun.spawn([binary, 'app-server'], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' })
  const request = JSON.stringify({
    id: 0,
    method: 'initialize',
    params: { clientInfo: { name: 'mangaforge', title: 'MangaForge Studio', version: 'probe' } },
  }) + '\n'
  proc.stdin.write(request)
  proc.stdin.flush()
  const reader = proc.stdout.getReader()
  const deadline = Date.now() + 8000
  let buffer = ''
  try {
    while (Date.now() < deadline) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += new TextDecoder().decode(value)
      if (buffer.split('\n').some(line => line.includes('"id":0') || line.includes('"id": 0'))) return
    }
    throw new Error('no initialize response before timeout')
  } finally {
    proc.kill()
  }
}

export async function runKernelProbe(
  activeWorkspace: string,
  opts: {
    runVersion?: (binary: string) => Promise<string>
    runHandshake?: (binary: string) => Promise<void>
    now?: () => string
  } = {},
): Promise<KernelProbeResult> {
  const runtime = loadKernelRuntime(activeWorkspace)
  const binary = await checkKernelBinary(runtime, { runVersion: opts.runVersion })
  const result: KernelProbeResult = {
    checked_at: (opts.now || (() => new Date().toISOString()))(),
    binary: binary.ok ? { ok: true, version: binary.version } : { ok: false, message: binary.message },
    handshake: { ok: false },
    providers: {},
    skills: 'pending',
    agents_spawn: 'pending',
  }
  if (binary.ok) {
    try {
      await (opts.runHandshake || defaultRunHandshake)(runtime.binary)
      result.handshake = { ok: true }
    } catch (error: any) {
      result.handshake = { ok: false, message: String(error?.message || error) }
    }
  } else {
    result.handshake = { ok: false, message: 'binary unavailable' }
  }
  for (const provider of await readProviders(activeWorkspace)) {
    const built = buildCodexConfigToml({
      provider: provider as any,
      model: { model_name: 'probe' },
      agents: [],
      supportsChatWireApi: runtime.supports_chat_wire_api,
    })
    result.providers[String((provider as any).id)] = built.ok ? { ok: true } : { ok: false, error_code: built.error_code }
  }
  mkdirSync(dirname(kernelProbePath(activeWorkspace)), { recursive: true })
  writeFileSync(kernelProbePath(activeWorkspace), JSON.stringify(result, null, 2))
  return result
}

export function loadKernelProbe(activeWorkspace: string): KernelProbeResult | null {
  try {
    return JSON.parse(readFileSync(kernelProbePath(activeWorkspace), 'utf8'))
  } catch {
    return null
  }
}
