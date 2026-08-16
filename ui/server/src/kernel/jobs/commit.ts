import { readFileSync } from 'node:fs'
import { createNovelReview, getNovelChapter, updateNovelChapter } from '../../novel'
import { ohStoryChapterTextHash } from '../../novel-writing/oh-story-core/chapter-text-hash'
import { loadKernelContracts } from '../contracts/store'
import { runPostHarvestGates } from './gates'
import { getKernelJobDetail, insertKernelCommit, updateKernelCandidate, updateKernelJob } from './repo'

function readVaultText(artifact: { vault_path?: string; copied_path?: string }): string {
  const path = artifact.vault_path || artifact.copied_path || ''
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return ''
  }
}

export async function commitKernelCandidate(ws: string, jobId: string, candidateId: string): Promise<
  | { ok: true; commits: Array<{ domain_table: string; domain_row_id: number }> }
  | { ok: false; status: 404 | 409 | 500; code: string; message: string }
> {
  const detail = getKernelJobDetail(ws, jobId)
  if (!detail) return { ok: false, status: 404, code: 'JOB_NOT_FOUND', message: `job ${jobId} not found` }
  const candidate = detail.candidates.find(c => c.id === candidateId)
  if (!candidate) return { ok: false, status: 404, code: 'CANDIDATE_NOT_FOUND', message: `candidate ${candidateId} not found` }
  if (detail.job.status === 'committed' || detail.commits.length > 0) {
    return { ok: false, status: 409, code: 'JOB_ALREADY_COMMITTED', message: 'job already committed' }
  }
  if (candidate.status !== 'succeeded') {
    return { ok: false, status: 409, code: 'CANDIDATE_NOT_SUCCEEDED', message: `candidate status is ${candidate.status}` }
  }
  const { contracts } = loadKernelContracts(ws)
  const contract = contracts.find(c => c.id === candidate.contract_id)
  if (!contract) return { ok: false, status: 500, code: 'CONTRACT_INVALID', message: `contract ${candidate.contract_id} not found` }

  const artifacts = detail.artifacts.filter((a: any) => a.candidate_id === candidateId)
  const chapterId = Number(detail.job.subject_id)
  const gate = await runPostHarvestGates({
    workspace: ws, projectId: detail.job.project_id, chapterId, contract,
    artifacts, warnings: [], readArtifactText: readVaultText,
  })
  if (gate.failedCode) return { ok: false, status: 409, code: gate.failedCode, message: 'commit-time gate failed' }

  const chapter = await getNovelChapter(ws, chapterId, detail.job.project_id)
  const commits: Array<{ domain_table: string; domain_row_id: number }> = []
  for (const output of contract.outputs) {
    const artifact = artifacts.find((a: any) => a.artifact_kind === output.artifact_kind)
    if (!artifact) continue
    if (output.binding.startsWith('reviews.')) {
      const reportText = readVaultText(artifact)
      if (!reportText.trim()) {
        return { ok: false, status: 500, code: 'OUTPUT_MISSING', message: 'review report vault is empty or unreadable' }
      }
      const saved = await createNovelReview(ws, {
        project_id: detail.job.project_id,
        review_type: output.binding.slice('reviews.'.length),
        payload: JSON.stringify({
          kernel_job_id: jobId,
          kernel_candidate_id: candidateId,
          kernel_artifact_id: artifact.id,
          chapter_id: chapterId,
          chapter_no: Number(chapter?.chapter_no || 0),
          chapter_text_hash: ohStoryChapterTextHash(String(chapter?.chapter_text || '')),
          report_text: reportText,
        }),
      })
      commits.push({ domain_table: 'reviews', domain_row_id: Number(saved.id) })
    } else if (output.binding === 'chapters.rewrite') {
      await updateNovelChapter(ws, chapterId, { chapter_text: readVaultText(artifact) }, {
        versionSource: String(contract.commit.source || 'kernel_rewrite') as any,
      })
      commits.push({ domain_table: 'chapters', domain_row_id: chapterId })
    }
    // kernel_only：产物已在账本与 vault，跳过
  }
  const now = new Date().toISOString()
  for (const commit of commits) {
    insertKernelCommit(ws, { id: `commit-${crypto.randomUUID()}`, job_id: jobId, candidate_id: candidateId, domain_table: commit.domain_table, domain_row_id: commit.domain_row_id })
  }
  updateKernelCandidate(ws, candidateId, { status: 'committed', finished_at: now })
  updateKernelJob(ws, jobId, { status: 'committed', finished_at: now })
  return { ok: true, commits }
}
