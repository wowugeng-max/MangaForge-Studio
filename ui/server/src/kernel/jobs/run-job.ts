// ui/server/src/kernel/jobs/run-job.ts
import { readModels } from '../../model-store'
import { readProviders } from '../../provider-store'
import { loadOhStoryCoreSuite } from '../../novel-writing/oh-story-core/store'
import { readKernelEvents } from '../codex/events'
import { runKernelCandidate } from '../codex/run-candidate'
import { extractSpawnEvidence } from '../codex/spawn-evidence'
import { loadKernelContracts, type KernelContractView } from '../contracts/store'
import { kernelJobDir } from '../paths'
import { buildCodexConfigToml } from '../providers/translate'
import { checkKernelBinary, loadKernelRuntime } from '../runtime'
import { commitKernelCandidate } from './commit'
import { runPostHarvestGates } from './gates'
import {
  getKernelJobDetail, insertKernelCandidate, insertKernelJob, listKernelJobs,
  updateKernelCandidate, updateKernelJob,
} from './repo'
import { persistCandidateArtifacts } from './vault'
import { readFileSync } from 'node:fs'

export type CreateKernelJobBody = {
  project_id: number; subject_type: string; subject_id: number
  contract_ids: string[]; model_id: number; title?: string
}
export type CreateKernelJobError = { ok: false; status: 400 | 503; code: string; message: string }

type LiveJobState = {
  phases: Map<string, string>
  candidateDirs: Map<string, string>
  cancelled: boolean
  closeSessions: Map<string, () => void>
}
const liveJobs = new Map<string, LiveJobState>()

export async function validateCreateKernelJob(
  ws: string, body: CreateKernelJobBody, opts: { skipRuntimeCheck?: boolean } = {},
): Promise<{ ok: true; contracts: KernelContractView[]; providerId: string } | CreateKernelJobError> {
  if (!opts.skipRuntimeCheck) {
    const binary = await checkKernelBinary(loadKernelRuntime(ws))
    if (!binary.ok) return { ok: false, status: 503, code: 'KERNEL_RUNTIME_UNAVAILABLE', message: binary.message }
  }
  if (body.subject_type !== 'chapter') return { ok: false, status: 400, code: 'CONTRACT_INVALID', message: '第一期只支持 subject_type=chapter' }
  const ids = Array.isArray(body.contract_ids) ? body.contract_ids : []
  if (ids.length < 1 || ids.length > 8) return { ok: false, status: 400, code: 'CONTRACT_INVALID', message: 'contract_ids 需要 1..8 个' }
  const { contracts } = loadKernelContracts(ws)
  const selected: KernelContractView[] = []
  for (const id of ids) {
    const contract = contracts.find(c => c.id === id)
    if (!contract) return { ok: false, status: 400, code: 'CONTRACT_INVALID', message: `contract not found: ${id}` }
    if (!contract.implemented) return { ok: false, status: 400, code: 'CONTRACT_NOT_IMPLEMENTED', message: id }
    selected.push(contract)
  }
  if (new Set(selected.map(c => c.capability)).size > 1) {
    return { ok: false, status: 400, code: 'CAPABILITY_MIXED', message: '并跑的合同必须同 capability' }
  }
  const model = (await readModels(ws)).find(m => Number(m.id) === Number(body.model_id))
  if (!model) return { ok: false, status: 400, code: 'CONTRACT_INVALID', message: `model ${body.model_id} not found` }
  const provider = (await readProviders(ws)).find(p => String(p.id) === String(model.provider))
  if (!provider) return { ok: false, status: 400, code: 'PROVIDER_TRANSLATE_FAILED', message: `provider ${model.provider} not found` }
  const translated = buildCodexConfigToml({
    provider: provider as any, model: { model_name: String(model.model_name || '') }, agents: [],
    supportsChatWireApi: loadKernelRuntime(ws).supports_chat_wire_api,
  })
  if (!translated.ok) return { ok: false, status: 400, code: 'PROVIDER_TRANSLATE_FAILED', message: translated.message }
  return { ok: true, contracts: selected, providerId: String(provider.id) }
}

export async function createAndRunKernelJob(
  ws: string, body: CreateKernelJobBody,
  opts: {
    candidateRunner?: typeof runKernelCandidate
    engineArgv?: string[]; engineEnv?: Record<string, string>
    skipRuntimeCheck?: boolean
  } = {},
): Promise<{ ok: true; jobId: string; done: Promise<void> } | CreateKernelJobError> {
  const validated = await validateCreateKernelJob(ws, body, opts)
  if (!validated.ok) return validated
  const jobId = `job-${crypto.randomUUID()}`
  const packRevision = loadOhStoryCoreSuite(ws)?.revision || ''
  insertKernelJob(ws, {
    id: jobId, project_id: body.project_id, workspace_scope: 'novel', title: body.title || '',
    status: 'queued', capability: validated.contracts[0].capability, subject_type: 'chapter',
    subject_id: body.subject_id, model_provider_id: validated.providerId, model_id: body.model_id,
    error_code: '', error_message: '',
  })
  const candidateIds: string[] = []
  for (const contract of validated.contracts) {
    const candidateId = `cand-${crypto.randomUUID()}`
    candidateIds.push(candidateId)
    insertKernelCandidate(ws, {
      id: candidateId, job_id: jobId, contract_id: contract.id, pack_id: contract.pack_id,
      pack_revision: packRevision, skill_name: contract.skill_name, status: 'queued',
    })
  }
  const live: LiveJobState = { phases: new Map(), candidateDirs: new Map(), cancelled: false, closeSessions: new Map() }
  liveJobs.set(jobId, live)

  const runner = opts.candidateRunner || runKernelCandidate
  const done = (async () => {
    try {
      updateKernelJob(ws, jobId, { status: 'running' })
      const runOne = async (index: number) => {
        const contract = validated.contracts[index]
        const candidateId = candidateIds[index]
        if (live.cancelled) return
        const candidateJobId = `${jobId}/candidates/${candidateId}`
        live.candidateDirs.set(candidateId, kernelJobDir(ws, candidateJobId))
        updateKernelCandidate(ws, candidateId, { status: 'running', started_at: new Date().toISOString() })
        try {
          let result
          try {
            result = await runner({
              workspace: ws, projectId: body.project_id, chapterId: body.subject_id,
              contract, modelId: body.model_id, jobId: candidateJobId,
              sessionArgv: opts.engineArgv, sessionExtraEnv: opts.engineEnv,
              onPhase: (phase: string) => { live.phases.set(candidateId, phase) },
              onSession: (session: { close: () => void }) => {
                live.closeSessions.set(candidateId, () => session.close())
                if (live.cancelled) {
                  try { session.close() } catch { /* already closed */ }
                }
              },
            } as any)
          } catch (error: any) {
            result = { ok: false as const, error_code: 'ENGINE_FAILED', message: String(error?.message || error) }
          }
          live.closeSessions.delete(candidateId)
          const now = new Date().toISOString()
          if (live.cancelled) {
            updateKernelCandidate(ws, candidateId, { status: 'failed', error_code: 'CANCELLED', finished_at: now })
            return
          }
          if (!result.ok) {
            updateKernelCandidate(ws, candidateId, { status: 'failed', error_code: result.error_code, finished_at: now })
            return
          }
          const registered = persistCandidateArtifacts(ws, candidateId, result.artifacts)
          live.phases.set(candidateId, 'gating')
          if (live.cancelled) {
            updateKernelCandidate(ws, candidateId, { status: 'failed', error_code: 'CANCELLED', finished_at: new Date().toISOString() })
            return
          }
          const gate = await runPostHarvestGates({
            workspace: ws, projectId: body.project_id, chapterId: body.subject_id, contract,
            artifacts: registered.map(r => ({ rel_path: r.rel_path, artifact_kind: r.artifact_kind, vault_path: r.vault_path })),
            warnings: result.warnings,
            readArtifactText: (artifact) => {
              try { return readFileSync(String(artifact.vault_path || ''), 'utf8') } catch { return '' }
            },
          })
          if (live.cancelled) {
            updateKernelCandidate(ws, candidateId, { status: 'failed', error_code: 'CANCELLED', finished_at: new Date().toISOString() })
            return
          }
          updateKernelCandidate(ws, candidateId, {
            status: gate.failedCode ? 'gated' : 'succeeded',
            error_code: gate.failedCode || '',
            thread_id: result.threadId, turn_id: result.turnId,
            last_message_excerpt: String(result.lastMessage || '').slice(0, 500),
            gate_results: JSON.stringify(gate.results),
            metadata: JSON.stringify({ spawn_evidence: result.spawnEvidence }),
            finished_at: new Date().toISOString(),
          })
        } catch (error: any) {
          live.closeSessions.delete(candidateId)
          const now = new Date().toISOString()
          if (live.cancelled) {
            updateKernelCandidate(ws, candidateId, { status: 'failed', error_code: 'CANCELLED', finished_at: now })
            return
          }
          updateKernelCandidate(ws, candidateId, {
            status: 'failed',
            error_code: 'ENGINE_FAILED',
            finished_at: now,
          })
        }
      }
      await Promise.allSettled(validated.contracts.map((_, index) => runOne(index)))
      // 收敛 job
      if (live.cancelled) return
      const detail = getKernelJobDetail(ws, jobId)!
      const succeeded = detail.candidates.filter(c => c.status === 'succeeded')
      const now = new Date().toISOString()
      const succeededContract = validated.contracts.find(c => c.id === succeeded[0]?.contract_id)
      if (succeeded.length === 0) {
        const first = detail.candidates.find(c => c.error_code)
        updateKernelJob(ws, jobId, { status: 'failed', finished_at: now, error_code: first?.error_code || 'OUTPUT_MISSING' })
      } else if (succeeded.length === 1 && succeededContract?.commit.mode === 'auto_if_single') {
        live.phases.set(succeeded[0].id, 'committing')
        if (live.cancelled) return
        const committed = await commitKernelCandidate(ws, jobId, succeeded[0].id)
        if (live.cancelled) return
        if (!committed.ok) updateKernelJob(ws, jobId, { status: 'awaiting_selection', error_code: committed.code })
      } else {
        updateKernelJob(ws, jobId, { status: 'awaiting_selection' })
      }
    } catch (error: any) {
      if (!live.cancelled) {
        updateKernelJob(ws, jobId, {
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_code: 'ENGINE_FAILED',
          error_message: String(error?.message || error),
        })
      }
    } finally {
      liveJobs.delete(jobId)
    }
  })()
  return { ok: true, jobId, done }
}

export function cancelKernelJob(ws: string, jobId: string): { ok: true } | { ok: false; status: 404 | 409; code: string } {
  const detail = getKernelJobDetail(ws, jobId)
  if (!detail) return { ok: false, status: 404, code: 'JOB_NOT_FOUND' }
  if (detail.job.status === 'committed' || detail.commits.length > 0) {
    return { ok: false, status: 409, code: 'JOB_ALREADY_COMMITTED' }
  }
  const live = liveJobs.get(jobId)
  if (live) {
    live.cancelled = true
    for (const close of live.closeSessions.values()) {
      try { close() } catch { /* 会话可能已结束 */ }
    }
  }
  const now = new Date().toISOString()
  for (const candidate of detail.candidates) {
    if (candidate.status === 'queued' || candidate.status === 'running') {
      updateKernelCandidate(ws, candidate.id, { status: 'failed', error_code: 'CANCELLED', finished_at: now })
    }
  }
  updateKernelJob(ws, jobId, { status: 'cancelled', finished_at: now })
  return { ok: true }
}

export function getKernelJobProgress(ws: string, jobId: string) {
  const detail = getKernelJobDetail(ws, jobId)
  if (!detail) return null
  const live = liveJobs.get(jobId)
  const running = detail.candidates.find(c => !['succeeded', 'gated', 'failed', 'committed'].includes(c.status))
  const candidateId = running?.id || detail.candidates[0]?.id || ''
  const terminal = detail.job.status === 'cancelled' || detail.job.status === 'failed'
    || detail.job.status === 'committed' || detail.job.status === 'awaiting_selection'
  const phase = terminal
    ? detail.job.status
    : (live?.phases.get(candidateId) || (live ? 'running' : detail.job.status))
  let hint = ''
  if (live) {
    const dir = live.candidateDirs.get(candidateId)
    if (dir) {
      const hints = extractSpawnEvidence(readKernelEvents(dir)).agent_hints
      hint = hints[hints.length - 1] || ''
    }
  }
  return {
    job_id: jobId,
    candidate_id: candidateId,
    phase,
    elapsed_ms: Math.max(0, Date.now() - new Date(detail.job.created_at + 'Z').getTime()) || 0,
    hint,
    error_code: detail.job.error_code || '',
  }
}

export { listKernelJobs }
