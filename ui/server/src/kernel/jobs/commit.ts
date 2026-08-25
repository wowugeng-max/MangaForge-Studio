import { readFileSync } from 'node:fs'
import { createNovelReview, getNovelChapter, listNovelChapters, updateNovelChapter } from '../../novel'
import { ohStoryChapterTextHash } from '../../novel-writing/oh-story-core/chapter-text-hash'
import { loadKernelContracts, saveUserKernelContract } from '../contracts/store'
import { openKernelDb } from '../db'
import {
  ensureEmptyChapterRow, firstHeadingOf, parseChapterNoFromRelPath, upsertCharacterSheet, upsertOutlineDoc, upsertWorldDoc,
} from './domain-upsert'
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
  | { ok: false; status: 400 | 404 | 409 | 500; code: string; message: string }
> {
  const detail = getKernelJobDetail(ws, jobId)
  if (!detail) return { ok: false, status: 404, code: 'JOB_NOT_FOUND', message: `job ${jobId} not found` }
  const candidate = detail.candidates.find(c => c.id === candidateId)
  if (!candidate) return { ok: false, status: 404, code: 'CANDIDATE_NOT_FOUND', message: `candidate ${candidateId} not found` }
  if (detail.job.status === 'committed' || detail.commits.length > 0) {
    return { ok: false, status: 409, code: 'JOB_ALREADY_COMMITTED', message: 'job already committed' }
  }
  if (detail.job.status === 'cancelled' || detail.job.status === 'failed') {
    return { ok: false, status: 409, code: 'JOB_ALREADY_COMMITTED', message: 'job is ' + detail.job.status }
  }
  if (candidate.status !== 'succeeded') {
    return { ok: false, status: 409, code: 'CANDIDATE_NOT_SUCCEEDED', message: `candidate status is ${candidate.status}` }
  }
  const { contracts } = loadKernelContracts(ws)
  const contract = contracts.find(c => c.id === candidate.contract_id)
  if (!contract) return { ok: false, status: 500, code: 'CONTRACT_INVALID', message: `contract ${candidate.contract_id} not found` }

  const artifacts = detail.artifacts.filter((a: any) => a.candidate_id === candidateId)
  const chapterId = Number(detail.job.subject_id)
  let spawnEvidence = { subagent_threads: [] as Array<{ thread_id: string; parent_thread_id: string; agent: string }>, agent_hints: [] as string[] }
  try {
    const meta = JSON.parse(candidate.metadata || '{}')
    if (meta.spawn_evidence) spawnEvidence = meta.spawn_evidence
  } catch { /* 缺 metadata 视为零 spawn */ }
  const gate = await runPostHarvestGates({
    workspace: ws, projectId: detail.job.project_id, chapterId, contract,
    artifacts, warnings: [], spawnEvidence, readArtifactText: readVaultText,
    continueCount: Number(JSON.parse(detail.job.verb_params || '{}').count || 0),
  })
  if (gate.failedCode) return { ok: false, status: 409, code: gate.failedCode, message: 'commit-time gate failed' }

  if (detail.job.verb === 'adapt_pack') {
    const commits: Array<{ domain_table: string; domain_row_id: number }> = []
    const jsonArtifacts = artifacts.filter((a: any) => a.artifact_kind === 'contract_json')
    for (const artifact of jsonArtifacts) {
      const text = readVaultText(artifact)
      let parsed: unknown
      try { parsed = JSON.parse(text) } catch {
        return { ok: false, status: 500, code: 'OUTPUT_MISSING', message: 'contract_json vault is not JSON' }
      }
      const saved = saveUserKernelContract(ws, parsed)
      if (!saved.ok) {
        return {
          ok: false,
          status: saved.status,
          code: saved.code,
          message: saved.code === 'CONTRACT_BUILTIN' ? 'cannot overwrite builtin contract' : 'contract rejected',
        }
      }
      commits.push({ domain_table: 'kernel_contracts', domain_row_id: 0 })
    }
    const db = openKernelDb(ws)
    try {
      db.exec('BEGIN IMMEDIATE')
      try {
        const now = new Date().toISOString()
        for (const commit of commits) {
          insertKernelCommit(ws, {
            id: `commit-${crypto.randomUUID()}`,
            job_id: jobId,
            candidate_id: candidateId,
            domain_table: commit.domain_table,
            domain_row_id: commit.domain_row_id,
          }, db)
        }
        updateKernelCandidate(ws, candidateId, { status: 'committed', finished_at: now }, db)
        updateKernelJob(ws, jobId, { status: 'committed', finished_at: now }, db)
        db.exec('COMMIT')
      } catch (error) {
        try { db.exec('ROLLBACK') } catch { /* ignore */ }
        throw error
      }
    } finally {
      db.close()
    }
    return { ok: true, commits }
  }

  const isProjectSubject = detail.job.subject_type === 'project'
  const chapter = isProjectSubject ? null : await getNovelChapter(ws, chapterId, detail.job.project_id)
  const commits: Array<{ domain_table: string; domain_row_id: number }> = []
  const outlineRows: Array<{ outlineId: number; chapterNo: number | null; title: string }> = []

  // reviews / chapter rewrites use novel APIs on a separate connection; do them
  // before BEGIN so they cannot deadlock against an IMMEDIATE lock.
  for (const output of contract.outputs) {
    const matched = artifacts.filter((a: any) => a.artifact_kind === output.artifact_kind)
    for (const artifact of matched) {
      const text = readVaultText(artifact)
      if (output.binding.startsWith('reviews.')) {
        if (!text.trim()) return { ok: false, status: 500, code: 'OUTPUT_MISSING', message: 'review report vault is empty or unreadable' }
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
            report_text: text,
          }),
        })
        commits.push({ domain_table: 'reviews', domain_row_id: Number(saved.id) })
      } else if (output.binding === 'chapters.rewrite') {
        if (detail.job.verb === 'write_continue') {
          const no = parseChapterNoFromRelPath(String(artifact.rel_path))
          const chapters = await listNovelChapters(ws, detail.job.project_id)
          const row = chapters.find((item: any) => Number(item.chapter_no) === no)
          if (!row) return { ok: false, status: 500, code: 'CHAPTER_NOT_FOUND', message: `找不到第 ${no} 章` }
          await updateNovelChapter(ws, row.id, { chapter_text: text }, {
            versionSource: String(contract.commit.source || 'kernel_rewrite') as any,
          })
          commits.push({ domain_table: 'chapters', domain_row_id: Number(row.id) })
        } else {
          await updateNovelChapter(ws, chapterId, { chapter_text: text }, {
            versionSource: String(contract.commit.source || 'kernel_rewrite') as any,
          })
          commits.push({ domain_table: 'chapters', domain_row_id: chapterId })
        }
      }
    }
  }

  const db = openKernelDb(ws)
  try {
    db.exec('BEGIN IMMEDIATE')
    try {
      for (const output of contract.outputs) {
        const matched = artifacts.filter((a: any) => a.artifact_kind === output.artifact_kind)
        for (const artifact of matched) {
          const text = readVaultText(artifact)
          if (output.binding === 'worldbuilding.upsert') {
            const id = upsertWorldDoc(ws, detail.job.project_id, String(artifact.rel_path), text, db)
            commits.push({ domain_table: 'worldbuilding', domain_row_id: id })
          } else if (output.binding === 'characters.upsert') {
            const id = upsertCharacterSheet(ws, detail.job.project_id, String(artifact.rel_path), text, db)
            commits.push({ domain_table: 'characters', domain_row_id: id })
          } else if (output.binding === 'outlines.upsert') {
            const row = upsertOutlineDoc(ws, detail.job.project_id, String(artifact.rel_path), text, db)
            outlineRows.push({ ...row, title: firstHeadingOf(text) })
            commits.push({ domain_table: 'outlines', domain_row_id: row.outlineId })
          }
        }
      }
      if (detail.job.verb === 'open_book') {
        for (const row of outlineRows) {
          if (row.chapterNo === null) continue
          const chapterId2 = ensureEmptyChapterRow(ws, detail.job.project_id, row.chapterNo, row.title, row.outlineId, db)
          if (chapterId2) commits.push({ domain_table: 'chapters', domain_row_id: chapterId2 })
        }
      }
      const now = new Date().toISOString()
      for (const commit of commits) {
        insertKernelCommit(ws, {
          id: `commit-${crypto.randomUUID()}`,
          job_id: jobId,
          candidate_id: candidateId,
          domain_table: commit.domain_table,
          domain_row_id: commit.domain_row_id,
        }, db)
      }
      updateKernelCandidate(ws, candidateId, { status: 'committed', finished_at: now }, db)
      updateKernelJob(ws, jobId, { status: 'committed', finished_at: now }, db)
      db.exec('COMMIT')
    } catch (error) {
      try { db.exec('ROLLBACK') } catch { /* ignore */ }
      throw error
    }
  } finally {
    db.close()
  }
  return { ok: true, commits }
}
