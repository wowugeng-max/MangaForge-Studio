import { readFileSync } from 'node:fs'
import { kernelRuntimePath } from './paths'

export type KernelRuntimeInfo = {
  engine: string
  codex_version: string
  binary: string
  protocol: string
  supports_chat_wire_api: boolean
}

const RUNTIME_DEFAULTS: KernelRuntimeInfo = {
  engine: 'codex-app-server',
  codex_version: '',
  binary: 'codex',
  protocol: 'app-server-stdio',
  supports_chat_wire_api: false,
}

export function loadKernelRuntime(activeWorkspace: string): KernelRuntimeInfo {
  try {
    const raw = JSON.parse(readFileSync(kernelRuntimePath(activeWorkspace), 'utf8'))
    return {
      engine: String(raw?.engine || RUNTIME_DEFAULTS.engine),
      codex_version: String(raw?.codex_version || ''),
      binary: String(raw?.binary || RUNTIME_DEFAULTS.binary),
      protocol: String(raw?.protocol || RUNTIME_DEFAULTS.protocol),
      supports_chat_wire_api: raw?.supports_chat_wire_api === true,
    }
  } catch {
    return { ...RUNTIME_DEFAULTS }
  }
}

async function defaultRunVersion(binary: string): Promise<string> {
  const proc = Bun.spawn([binary, '--version'], { stdout: 'pipe', stderr: 'pipe' })
  const out = await new Response(proc.stdout).text()
  const code = await proc.exited
  if (code !== 0) throw new Error(`${binary} --version exited ${code}`)
  return out.trim()
}

export async function checkKernelBinary(
  runtime: KernelRuntimeInfo,
  opts: { runVersion?: (binary: string) => Promise<string> } = {},
): Promise<{ ok: true; version: string } | { ok: false; error_code: 'KERNEL_RUNTIME_UNAVAILABLE'; message: string }> {
  const runVersion = opts.runVersion || defaultRunVersion
  let output = ''
  try {
    output = await runVersion(runtime.binary)
  } catch (error: any) {
    return { ok: false, error_code: 'KERNEL_RUNTIME_UNAVAILABLE', message: `codex binary not available: ${String(error?.message || error)}` }
  }
  const version = (output.match(/(\d+\.\d+\.\S+)/) || [])[1] || output.trim()
  if (runtime.codex_version && version !== runtime.codex_version) {
    return { ok: false, error_code: 'KERNEL_RUNTIME_UNAVAILABLE', message: `codex version ${version} != pinned ${runtime.codex_version}` }
  }
  return { ok: true, version }
}
