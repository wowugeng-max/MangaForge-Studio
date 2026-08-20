// ui/server/src/kernel/jobs/run-job.ts
import { readModels } from '../../model-store'
import { readProviders } from '../../provider-store'
import { loadOhStoryCoreSuite } from '../../novel-writing/oh-story-core/store'
import { getNovelChapter, listNovelChapters, listNovelOutlines } from '../../novel'
import { chapterHasMatchingOutline, chapterTextHasProse } from './write-chapter-precheck'
import { parseWriteContinueParams, writeContinueWindow } from './write-continue-params'
import { readKernelEvents } from '../codex/events'
import { runKernelCandidate } from '../codex/run-candidate'
import { extractSpawnEvidence } from '../codex/spawn-evidence'
import { loadKernelContracts, type KernelContractView } from '../contracts/store'
import { kernelJobDir } from '../paths'
import { collapseContinueChapterArtifacts } from '../projection/collapse-continue-chapter'
import { collapseRewriteChapterArtifacts } from '../projection/collapse-rewrite-chapter'
import { chapterRelPath } from '../projection/naming'
import { buildCodexConfigToml } from '../providers/translate'
import { checkKernelBinary, loadKernelRuntime } from '../runtime'
import { loadVerbDefaults } from '../verbs/defaults'
import { resolveContractVerb } from '../verbs/infer'
import { getVerbTemplate } from '../verbs/registry'
import { commitKernelCandidate } from './commit'
import { runPostHarvestGates } from './gates'
import {
  getKernelJobDetail, hasActiveKernelJob, insertKernelCandidate, insertKernelJob, listKernelJobs,
  listKernelJobsByStatuses, updateKernelCandidate, updateKernelJob,
} from './repo'
import { persistCandidateArtifacts } from './vault'
import { readFileSync, rmSync } from 'node:fs'
import { join as joinPath } from 'node:path'

export type CreateKernelJobBody = {
  project_id: number; subject_type: string; subject_id: number
  contract_ids?: string[]; model_id: number; title?: string
  verb?: string
  verb_params?: Record<string, unknown>
  user_brief?: { title?: string; genre?: string; idea?: string; length_target?: string; constraints?: string }
}
export type CreateKernelJobError = { ok: false; status: 400 | 409 | 503; code: string; message: string }

export function candidateStatusAfterGate(failedCode: string, failedStatus?: 'gated' | 'failed' | null): 'succeeded' | 'gated' | 'failed' {
  if (!failedCode) return 'succeeded'
  return failedStatus === 'failed' ? 'failed' : 'gated'
}

type LiveJobState = {
  phases: Map<string, string>
  candidateDirs: Map<string, string>
  cancelled: boolean
  closeSessions: Map<string, () => void>
}
const liveJobs = new Map<string, LiveJobState>()

export async function validateCreateKernelJob(
  ws: string, body: CreateKernelJobBody, opts: { skipRuntimeCheck?: boolean } = {},
): Promise<{ ok: true; contracts: KernelContractView[]; providerId: string; verb: string; briefJson: string; subjectType: 'chapter' | 'project'; verbParamsJson: string } | CreateKernelJobError> {
  if (!opts.skipRuntimeCheck) {
    const binary = await checkKernelBinary(loadKernelRuntime(ws))
    if (!binary.ok) return { ok: false, status: 503, code: 'KERNEL_RUNTIME_UNAVAILABLE', message: binary.message }
  }
  const { contracts } = loadKernelContracts(ws)
  const ids = Array.isArray(body.contract_ids) && body.contract_ids.length
    ? body.contract_ids
    : null
  let verb = String(body.verb || '')
  if (!ids && !verb) return { ok: false, status: 400, code: 'CONTRACT_INVALID', message: '需要 verb 或 contract_ids' }
  if (verb && !getVerbTemplate(verb)) return { ok: false, status: 400, code: 'VERB_UNKNOWN', message: `未知动词 ${verb}` }
  const resolvedIds = ids || (loadVerbDefaults(ws)[verb] || [])
  if (!resolvedIds.length) return { ok: false, status: 400, code: 'VERB_DEFAULT_MISSING', message: `动词 ${verb} 无默认实例` }
  if (resolvedIds.length > 8) return { ok: false, status: 400, code: 'CONTRACT_INVALID', message: 'contract_ids 需要 1..8 个' }
  const selected: KernelContractView[] = []
  for (const id of resolvedIds) {
    const contract = contracts.find(c => c.id === id)
    if (!contract) return { ok: false, status: 400, code: 'CONTRACT_INVALID', message: `contract not found: ${id}` }
    if (!contract.implemented) return { ok: false, status: 400, code: 'CONTRACT_NOT_IMPLEMENTED', message: id }
    selected.push(contract)
  }
  const verbs = new Set(selected.map(c => resolveContractVerb(c) || ''))
  if (verbs.has('')) return { ok: false, status: 400, code: 'CONTRACT_INVALID', message: '合同缺 verb 且无法推断' }
  if (verbs.size > 1) return { ok: false, status: 400, code: 'VERB_MIXED', message: '并跑的合同必须同动词' }
  verb = [...verbs][0]
  const template = getVerbTemplate(verb)!
  if (body.subject_type !== template.subject_type) {
    return { ok: false, status: 400, code: 'SUBJECT_TYPE_MISMATCH', message: `动词 ${verb} 主体是 ${template.subject_type}` }
  }
  if (template.subject_type === 'pack') {
    return { ok: false, status: 400, code: 'CONTRACT_NOT_IMPLEMENTED', message: 'adapt_pack 第一期不执行' }
  }
  if (template.subject_type === 'project' && Number(body.subject_id) !== Number(body.project_id)) {
    return { ok: false, status: 400, code: 'SUBJECT_TYPE_MISMATCH', message: 'project 主体要求 subject_id == project_id' }
  }
  let briefJson = ''
  let verbParamsJson = JSON.stringify(body.verb_params || {})
  if (verb === 'open_book') {
    const brief = body.user_brief
    if (!brief || !String(brief.idea || '').trim()) {
      return { ok: false, status: 400, code: 'BRIEF_REQUIRED', message: '深度孵化需要创作创意' }
    }
    briefJson = JSON.stringify(brief)
    if (Buffer.byteLength(briefJson, 'utf8') > 32 * 1024) {
      return { ok: false, status: 400, code: 'BRIEF_REQUIRED', message: '创意超过 32KiB 上限' }
    }
  }
  if (verb === 'expand_outline') {
    const outlines = await listNovelOutlines(ws, body.project_id)
    if (!Array.isArray(outlines) || outlines.length === 0) {
      return { ok: false, status: 400, code: 'FOUNDATION_PRECONDITION', message: '扩纲需要账本里已有大纲' }
    }
  }
  if (verb === 'write_chapter') {
    const chapter = await getNovelChapter(ws, body.subject_id, body.project_id)
    if (!chapter) {
      return { ok: false, status: 400, code: 'CHAPTER_NOT_FOUND', message: '找不到该章' }
    }
    if (chapterTextHasProse(String(chapter.chapter_text || ''))) {
      return { ok: false, status: 400, code: 'CHAPTER_HAS_PROSE', message: '本章已有正文，请用回炉或按建议改稿' }
    }
    const outlines = await listNovelOutlines(ws, body.project_id)
    if (!chapterHasMatchingOutline(chapter, outlines)) {
      return { ok: false, status: 400, code: 'OUTLINE_MISSING', message: '本章还没有细纲' }
    }
    if (body.user_brief) {
      briefJson = JSON.stringify(body.user_brief)
      if (Buffer.byteLength(briefJson, 'utf8') > 32 * 1024) {
        return { ok: false, status: 400, code: 'BRIEF_REQUIRED', message: '创意超过 32KiB 上限' }
      }
    }
  }
  if (verb === 'rewrite_chapter') {
    const chapter = await getNovelChapter(ws, body.subject_id, body.project_id)
    if (!chapter) {
      return { ok: false, status: 400, code: 'CHAPTER_NOT_FOUND', message: '找不到该章' }
    }
    if (!chapterTextHasProse(String(chapter.chapter_text || ''))) {
      return { ok: false, status: 400, code: 'CHAPTER_NO_PROSE', message: '本章还没有正文，请先写草稿' }
    }
    if (body.user_brief) {
      briefJson = JSON.stringify(body.user_brief)
      if (Buffer.byteLength(briefJson, 'utf8') > 32 * 1024) {
        return { ok: false, status: 400, code: 'BRIEF_REQUIRED', message: '创意超过 32KiB 上限' }
      }
    }
  }
  if (verb === 'write_continue') {
    const parsed = parseWriteContinueParams(body.verb_params)
    if (!parsed.ok) return { ok: false, status: 400, code: parsed.code, message: parsed.message }
    const chapters = await listNovelChapters(ws, body.project_id)
    const outlines = await listNovelOutlines(ws, body.project_id)
    for (const no of writeContinueWindow(parsed.value.from_chapter_no, parsed.value.count)) {
      const chapter = chapters.find((row: any) => Number(row.chapter_no) === no)
      if (!chapter) {
        return { ok: false, status: 400, code: 'CHAPTER_NOT_FOUND', message: `找不到第 ${no} 章` }
      }
      if (chapterTextHasProse(String(chapter.chapter_text || ''))) {
        return { ok: false, status: 400, code: 'CHAPTER_HAS_PROSE', message: `第 ${no} 章已有正文` }
      }
      if (!chapterHasMatchingOutline(chapter, outlines)) {
        return { ok: false, status: 400, code: 'OUTLINE_MISSING', message: `第 ${no} 章还没有细纲` }
      }
    }
    if (body.user_brief) {
      briefJson = JSON.stringify(body.user_brief)
      if (Buffer.byteLength(briefJson, 'utf8') > 32 * 1024) {
        return { ok: false, status: 400, code: 'BRIEF_REQUIRED', message: '创意超过 32KiB 上限' }
      }
    }
    verbParamsJson = JSON.stringify(parsed.value)
  }
  const dedupe = template.subject_type === 'project'
    ? { projectId: body.project_id, verb }
    : { projectId: body.project_id, verb, subjectId: body.subject_id }
  if (hasActiveKernelJob(ws, dedupe)) {
    return { ok: false, status: 409, code: 'PROJECT_JOB_RUNNING', message: '同项目同动词任务未结束' }
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
  return { ok: true, contracts: selected, providerId: String(provider.id), verb, briefJson, subjectType: template.subject_type, verbParamsJson }
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
    status: 'queued', capability: validated.contracts[0].capability, subject_type: validated.subjectType,
    subject_id: body.subject_id, model_provider_id: validated.providerId, model_id: body.model_id,
    error_code: '', error_message: '',
    verb: validated.verb, verb_params: validated.verbParamsJson, subject_key: '', brief_json: validated.briefJson,
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
              subjectType: validated.subjectType, briefJson: validated.briefJson,
              verbParams: JSON.parse(validated.verbParamsJson || '{}'),
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
          let collapsed
          if (validated.verb === 'write_continue') {
            const params = JSON.parse(validated.verbParamsJson || '{}')
            const windowNos = writeContinueWindow(Number(params.from_chapter_no), Number(params.count))
            const chapters = await listNovelChapters(ws, body.project_id)
            const projectedRel: Record<number, string> = {}
            for (const no of windowNos) {
              const row = chapters.find((item: any) => Number(item.chapter_no) === no)
              projectedRel[no] = chapterRelPath(no, String(row?.title || ''))
            }
            collapsed = collapseContinueChapterArtifacts({
              windowNos,
              projectedRel,
              artifacts: result.artifacts,
            })
          } else {
            const chapterRow = await getNovelChapter(ws, body.subject_id, body.project_id)
            const currentRel = chapterRow
              ? chapterRelPath(Number(chapterRow.chapter_no), String(chapterRow.title || ''))
              : ''
            collapsed = collapseRewriteChapterArtifacts({
              capability: contract.capability,
              subjectType: validated.subjectType,
              currentRel,
              artifacts: result.artifacts,
            })
          }
          if (!collapsed.ok) {
            updateKernelCandidate(ws, candidateId, {
              status: 'failed',
              error_code: collapsed.code,
              last_message_excerpt: collapsed.message.slice(0, 500),
              finished_at: now,
            })
            return
          }
          const registered = persistCandidateArtifacts(ws, candidateId, collapsed.artifacts)
          live.phases.set(candidateId, 'gating')
          if (live.cancelled) {
            updateKernelCandidate(ws, candidateId, { status: 'failed', error_code: 'CANCELLED', finished_at: new Date().toISOString() })
            return
          }
          const gate = await runPostHarvestGates({
            workspace: ws, projectId: body.project_id, chapterId: body.subject_id, contract,
            artifacts: registered.map(r => ({ rel_path: r.rel_path, artifact_kind: r.artifact_kind, vault_path: r.vault_path })),
            warnings: result.warnings,
            spawnEvidence: result.spawnEvidence,
            continueCount: Number(JSON.parse(validated.verbParamsJson || '{}').count || 0),
            readArtifactText: (artifact) => {
              try { return readFileSync(String(artifact.vault_path || ''), 'utf8') } catch { return '' }
            },
          })
          if (live.cancelled) {
            updateKernelCandidate(ws, candidateId, { status: 'failed', error_code: 'CANCELLED', finished_at: new Date().toISOString() })
            return
          }
          updateKernelCandidate(ws, candidateId, {
            status: candidateStatusAfterGate(gate.failedCode || '', gate.failedStatus),
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
      cleanupKernelJobDirs(ws, jobId)
    } catch (error: any) {
      if (!live.cancelled) {
        updateKernelJob(ws, jobId, {
          status: 'failed',
          finished_at: new Date().toISOString(),
          error_code: 'ENGINE_FAILED',
          error_message: String(error?.message || error),
        })
        cleanupKernelJobDirs(ws, jobId)
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
  cleanupKernelJobDirs(ws, jobId)
  return { ok: true }
}

export function recoverOrphanKernelJobs(ws: string): number {
  const orphans = listKernelJobsByStatuses(ws, ['queued', 'running']).filter(job => !liveJobs.has(job.id))
  const now = new Date().toISOString()
  for (const job of orphans) {
    updateKernelJob(ws, job.id, { status: 'failed', finished_at: now, error_code: 'ENGINE_FAILED', error_message: '进程重启导致任务中断' })
    const detail = getKernelJobDetail(ws, job.id)
    for (const candidate of detail?.candidates || []) {
      if (['queued', 'running'].includes(candidate.status)) {
        updateKernelCandidate(ws, candidate.id, { status: 'failed', error_code: 'ENGINE_FAILED', finished_at: now })
      }
    }
    cleanupKernelJobDirs(ws, job.id)
  }
  return orphans.length
}

export function cleanupKernelJobDirs(ws: string, jobId: string): void {
  try {
    const detail = getKernelJobDetail(ws, jobId)
    for (const candidate of detail?.candidates || []) {
      const dir = kernelJobDir(ws, `${jobId}/candidates/${candidate.id}`)
      for (const sub of ['project', 'codex-home']) {
        try { rmSync(joinPath(dir, sub), { recursive: true, force: true }) } catch { /* 清理失败不得改账本状态 */ }
      }
    }
  } catch { /* 清理失败不得改账本状态 */ }
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
