// ui/server/src/kernel/codex/run-candidate.ts
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join } from 'node:path'
import { readKeys } from '../../key-store'
import { readModels } from '../../model-store'
import type { KernelContract } from '../contracts/schema'
import { kernelJobDir } from '../paths'
import { deployKernelPackMounts } from '../projection/pack-mounts'
import { projectKernelSubject } from '../projection/project'
import { harvestKernelArtifacts, writeKernelSnapshot, type HarvestedArtifact } from '../projection/snapshot'
import { writeCodexHome } from '../providers/translate'
import { loadKernelRuntime } from '../runtime'
import { renderKernelTemplate } from '../template'
import { createKernelEventsRecorder, readKernelEvents, writeKernelLastMessage } from './events'
import { startCodexSession, type CodexSession } from './session'
import { extractSpawnEvidence, type SpawnEvidence } from './spawn-evidence'

export type RunKernelCandidateInput = {
  workspace: string
  projectId: number
  chapterId: number
  contract: KernelContract
  modelId: number
  subjectType?: 'chapter' | 'project'
  briefJson?: string
  jobId?: string
  idleTimeoutMs?: number
  hardTimeoutMs?: number
  sessionArgv?: string[]
  sessionExtraEnv?: Record<string, string>
  onSession?: (session: CodexSession) => void
  onPhase?: (phase: 'projecting' | 'starting' | 'running' | 'harvesting') => void
}

export type RunKernelCandidateResult =
  | {
      ok: true
      jobDir: string
      projectDir: string
      threadId: string
      turnId: string
      artifacts: HarvestedArtifact[]
      warnings: Array<{ warning: string; rel_path: string }>
      lastMessage: string
      spawnEvidence: SpawnEvidence
      eventsPath: string
    }
  | { ok: false; error_code: string; message: string; jobDir?: string }

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

export async function runKernelCandidate(input: RunKernelCandidateInput): Promise<RunKernelCandidateResult> {
  const { workspace, projectId, chapterId, contract, modelId } = input
  const jobId = input.jobId || `cand-${Date.now()}`
  const jobDir = kernelJobDir(workspace, jobId)
  const projectDir = join(jobDir, 'project')
  const artifactsDir = join(jobDir, 'artifacts')
  mkdirSync(projectDir, { recursive: true })

  // 1. 投影
  input.onPhase?.('projecting')
  let vars
  try {
    ;({ vars } = await projectKernelSubject({
      workspace, projectId, chapterId, contract, projectDir,
      subjectType: input.subjectType, briefJson: input.briefJson,
    }))
  } catch (error: any) {
    return { ok: false, error_code: String(error?.code || 'ENGINE_FAILED'), message: String(error?.message || error), jobDir }
  }

  // 2. Pack 挂载 + reviewer 前提门
  const mounts = deployKernelPackMounts({ workspace, projectDir, skillName: contract.skill_name, mounts: contract.projection.mounts })
  const missingReviewers = (input as any).__testForceMissingReviewers || mounts.missingReviewers
  if (contract.gates.includes('require_reviewer_agents') && missingReviewers.length > 0) {
    return { ok: false, error_code: 'REVIEWERS_MISSING', message: `缺少 reviewer：${missingReviewers.join(', ')}`, jobDir }
  }

  // 3. 快照
  const manifest = writeKernelSnapshot(projectDir, join(jobDir, 'snapshot'))

  // 4. key 解析 + 隔离 CODEX_HOME
  const models = await readModels(workspace)
  const model = models.find(item => Number(item.id) === Number(modelId))
  if (!model) return { ok: false, error_code: 'CONTRACT_INVALID', message: `model ${modelId} not found`, jobDir }
  const keys = await readKeys(workspace)
  const key = keys.find(item => Number(item.id) === Number(model.api_key_id))
  if (!key?.key) return { ok: false, error_code: 'PROVIDER_TRANSLATE_FAILED', message: `api key ${model.api_key_id} not found or empty`, jobDir }
  const home = await writeCodexHome({
    workspace, jobDir, modelId,
    agents: mounts.deployedAgents.map(name => ({ name, configFile: join(projectDir, '.codex', 'agents', `${name}.toml`) })),
    supportsChatWireApi: loadKernelRuntime(workspace).supports_chat_wire_api,
  })
  if (!home.ok) return { ok: false, error_code: home.error_code, message: home.message, jobDir }

  // 5. 会话
  const recorder = createKernelEventsRecorder(jobDir)
  const runtime = loadKernelRuntime(workspace)
  let session: CodexSession
  input.onPhase?.('starting')
  try {
    session = await startCodexSession({
      binary: runtime.binary,
      projectDir,
      codexHome: join(jobDir, 'codex-home'),
      envKey: key.key,
      sandbox: contract.sandbox,
      argv: input.sessionArgv,
      extraEnv: input.sessionExtraEnv,
      sink: recorder.sink,
    })
  } catch (error: any) {
    return { ok: false, error_code: 'ENGINE_FAILED', message: String(error?.message || error), jobDir }
  }
  input.onSession?.(session)

  try {
    // 6. skills/list 预检
    let skillItem: { name: string; path: string } | undefined
    if (contract.invoke.mention) {
      const skills = await session.listSkills()
      skillItem = skills.find(skill => skill.name === contract.skill_name)
      if (!skillItem) {
        return { ok: false, error_code: 'SKILL_NOT_FOUND', message: `skills/list 未发现 ${contract.skill_name}`, jobDir }
      }
      if (!isAbsolute(skillItem.path)) skillItem = { ...skillItem, path: join(projectDir, skillItem.path) }
    }

    // 7. turn
    const prompt = renderKernelTemplate(contract.invoke.prompt, vars)
    const text = contract.invoke.mention ? `${contract.invoke.mention}\n${prompt}` : prompt
    let turn
    input.onPhase?.('running')
    try {
      turn = await session.runTurn({
        text,
        skill: skillItem,
        idleTimeoutMs: input.idleTimeoutMs,
        hardTimeoutMs: input.hardTimeoutMs,
      })
    } catch (error: any) {
      return { ok: false, error_code: String(error?.code || 'ENGINE_FAILED'), message: String(error?.message || error), jobDir }
    }
    writeKernelLastMessage(jobDir, turn.lastAgentMessage)

    // 8. 收回 + last_message 兜底
    input.onPhase?.('harvesting')
    const harvest = harvestKernelArtifacts({ projectDir, artifactsDir, manifest, contract, vars })
    const artifacts = [...harvest.artifacts]
    let missingRequired = [...harvest.missingRequired]
    for (const output of contract.outputs) {
      if (!output.required || output.fallback !== 'last_message') continue
      const rendered = renderKernelTemplate(output.glob, vars)
      if (!missingRequired.includes(rendered) || rendered.includes('*') || !turn.lastAgentMessage) continue
      const copied = join(artifactsDir, rendered)
      mkdirSync(dirname(copied), { recursive: true })
      writeFileSync(copied, turn.lastAgentMessage)
      artifacts.push({
        rel_path: rendered,
        artifact_kind: output.artifact_kind,
        sha256: sha256Hex(turn.lastAgentMessage),
        byte_size: Buffer.byteLength(turn.lastAgentMessage, 'utf8'),
        copied_path: copied,
      })
      missingRequired = missingRequired.filter(glob => glob !== rendered)
    }
    if (missingRequired.length > 0) {
      return { ok: false, error_code: 'OUTPUT_MISSING', message: `缺少约定产物：${missingRequired.join(', ')}`, jobDir }
    }

    return {
      ok: true,
      jobDir,
      projectDir,
      threadId: session.threadId,
      turnId: turn.turnId,
      artifacts,
      warnings: harvest.warnings,
      lastMessage: turn.lastAgentMessage,
      spawnEvidence: extractSpawnEvidence(readKernelEvents(jobDir)),
      eventsPath: recorder.path,
    }
  } finally {
    session.close()
  }
}
