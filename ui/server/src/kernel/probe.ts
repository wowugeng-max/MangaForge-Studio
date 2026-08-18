import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { readKeys } from '../key-store'
import { readModels } from '../model-store'
import { readProviders } from '../provider-store'
import { createKernelEventsRecorder, readKernelEvents } from './codex/events'
import { startCodexSession } from './codex/session'
import { extractSpawnEvidence } from './codex/spawn-evidence'
import { kernelProbePath } from './paths'
import { deployKernelPackMounts } from './projection/pack-mounts'
import { buildCodexConfigToml, writeCodexHome } from './providers/translate'
import { checkKernelBinary, loadKernelRuntime, type KernelRuntimeInfo } from './runtime'

export type KernelProbeStage = { ok: boolean; message?: string } | 'pending'

export type KernelProbeResult = {
  checked_at: string
  binary: { ok: boolean; version?: string; message?: string }
  handshake: { ok: boolean; message?: string }
  providers: Record<string, { ok: boolean; error_code?: string }>
  skills: KernelProbeStage
  agents_spawn: KernelProbeStage
}

async function readWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('no initialize response before timeout')), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}

export async function defaultRunHandshake(
  binary: string,
  { timeoutMs = 8000, argv }: { timeoutMs?: number; argv?: string[] } = {},
): Promise<void> {
  // Isolated CODEX_HOME: Codex 0.147 app-server can hang on initialize when it
  // inherits the user's interactive ~/.codex (ChatGPT login / desktop lock).
  const home = mkdtempSync(join(tmpdir(), 'kernel-probe-hs-'))
  const proc = Bun.spawn(argv ?? [binary, 'app-server'], {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, CODEX_HOME: home },
  })
  const request = JSON.stringify({
    id: 0,
    method: 'initialize',
    params: { clientInfo: { name: 'mangaforge', title: 'MangaForge Studio', version: 'probe' } },
  }) + '\n'
  proc.stdin.write(request)
  proc.stdin.flush()
  const reader = proc.stdout.getReader()
  const deadline = Date.now() + timeoutMs
  let buffer = ''
  try {
    while (Date.now() < deadline) {
      const remaining = deadline - Date.now()
      if (remaining <= 0) throw new Error('no initialize response before timeout')
      const { value, done } = await readWithTimeout(reader.read(), remaining)
      if (done) break
      buffer += new TextDecoder().decode(value)
      if (buffer.split('\n').some(line => line.includes('"id":0') || line.includes('"id": 0'))) return
    }
    throw new Error('no initialize response before timeout')
  } finally {
    proc.kill()
    rmSync(home, { recursive: true, force: true })
  }
}

export async function runKernelProbe(
  activeWorkspace: string,
  opts: {
    runVersion?: (binary: string) => Promise<string>
    runHandshake?: (binary: string) => Promise<void>
    now?: () => string
    modelId?: number
    runSkillsProbe?: () => Promise<{ ok: boolean; message?: string }>
    runAgentsSpawnProbe?: () => Promise<{ ok: boolean; message?: string }>
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
  if (result.binary.ok && result.handshake.ok) {
    const skillsProbe = opts.runSkillsProbe || (() => defaultRunSkillsProbe(activeWorkspace, runtime))
    try {
      result.skills = await skillsProbe()
    } catch (error: any) {
      result.skills = { ok: false, message: String(error?.message || error) }
    }
    if (typeof result.skills === 'object' && result.skills.ok && opts.modelId) {
      const agentsProbe = opts.runAgentsSpawnProbe || (() => defaultRunAgentsSpawnProbe(activeWorkspace, runtime, opts.modelId!))
      try {
        result.agents_spawn = await agentsProbe()
      } catch (error: any) {
        result.agents_spawn = { ok: false, message: String(error?.message || error) }
      }
    }
  }
  mkdirSync(dirname(kernelProbePath(activeWorkspace)), { recursive: true })
  writeFileSync(kernelProbePath(activeWorkspace), JSON.stringify(result, null, 2))
  return result
}

async function defaultRunSkillsProbe(ws: string, runtime: KernelRuntimeInfo): Promise<{ ok: boolean; message?: string }> {
  const dir = mkdtempSync(join(tmpdir(), 'kernel-probe3-'))
  const mounts = deployKernelPackMounts({ workspace: ws, projectDir: dir, skillName: 'story-review', mounts: ['skill_tree'] })
  if (!mounts.skillPath) return { ok: false, message: 'oh-story pack 未安装' }
  const provider = (await readProviders(ws)).find(p => p.api_format === 'codex_responses' && p.is_active !== false)
  if (!provider) return { ok: false, message: '无 codex_responses 供应商' }
  const built = buildCodexConfigToml({
    provider: provider as any, model: { model_name: 'probe' }, agents: [],
    supportsChatWireApi: runtime.supports_chat_wire_api,
  })
  if (!built.ok) return { ok: false, message: built.message }
  const home = join(dir, 'codex-home')
  mkdirSync(home, { recursive: true })
  writeFileSync(join(home, 'config.toml'), built.toml)
  const session = await startCodexSession({
    binary: runtime.binary, projectDir: dir, codexHome: home, envKey: 'probe', isolatedHome: dirname(home),
  })
  try {
    const skills = await session.listSkills()
    return skills.some(skill => skill.name === 'story-review')
      ? { ok: true }
      : { ok: false, message: 'skills/list 未发现投影 skill' }
  } finally {
    session.close()
  }
}

async function defaultRunAgentsSpawnProbe(ws: string, runtime: KernelRuntimeInfo, modelId: number): Promise<{ ok: boolean; message?: string }> {
  const jobDir = mkdtempSync(join(tmpdir(), 'kernel-probe4-'))
  const projectDir = join(jobDir, 'project')
  mkdirSync(projectDir, { recursive: true })
  const mounts = deployKernelPackMounts({ workspace: ws, projectDir, skillName: '', mounts: ['agents'] })
  if (mounts.missingReviewers.length) return { ok: false, message: `缺 reviewer：${mounts.missingReviewers.join(', ')}` }
  const model = (await readModels(ws)).find(m => Number(m.id) === Number(modelId))
  if (!model) return { ok: false, message: `model ${modelId} not found` }
  const key = (await readKeys(ws)).find(k => Number(k.id) === Number(model.api_key_id))
  if (!key?.key) return { ok: false, message: 'api key 缺失' }
  const home = await writeCodexHome({
    workspace: ws, jobDir, modelId,
    agents: mounts.deployedAgents.map(name => ({ name, configFile: join(projectDir, '.codex', 'agents', `${name}.toml`) })),
    supportsChatWireApi: runtime.supports_chat_wire_api,
  })
  if (!home.ok) return { ok: false, message: home.message }
  const effort = String((model as any).context_ui_params?.reasoning_effort || (model as any).context_ui_params?.model_reasoning_effort || '').trim()
  appendFileSync(join(jobDir, 'codex-home', 'config.toml'), '\n[features]\nmulti_agent = true\n')
  const recorder = createKernelEventsRecorder(jobDir)
  const session = await startCodexSession({
    binary: runtime.binary, projectDir, codexHome: join(jobDir, 'codex-home'), envKey: key.key, sink: recorder.sink,
    isolatedHome: jobDir,
  })
  try {
    const xhigh = effort === 'xhigh'
    const turn = await session.runTurn({
      text: 'You MUST call spawn_agent with agent_type="consistency-checker". Child message: reply with only OK then stop. Do not answer yourself. If spawn_agent is unavailable, reply exactly NO_SPAWN_TOOL.',
      effort: effort || undefined,
      idleTimeoutMs: xhigh ? 300_000 : 60_000,
      hardTimeoutMs: xhigh ? 720_000 : 120_000,
    })
    const evidence = extractSpawnEvidence(readKernelEvents(jobDir))
    if (evidence.subagent_threads.length > 0) return { ok: true }
    const last = String(turn.lastAgentMessage || '').trim().slice(0, 200)
    const status = String(turn.completedParams?.turn?.status || '')
    const bits = ['未观察到 subagent thread']
    if (status && status !== 'completed') bits.push(`turn=${status}`)
    if (last) bits.push(`模型回复：${last}`)
    return { ok: false, message: bits.join('；') }
  } finally {
    session.close()
  }
}

export function loadKernelProbe(activeWorkspace: string): KernelProbeResult | null {
  try {
    return JSON.parse(readFileSync(kernelProbePath(activeWorkspace), 'utf8'))
  } catch {
    return null
  }
}
