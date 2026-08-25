import type { Express } from 'express'
import { readFileSync } from 'node:fs'
import { commitKernelCandidate } from '../kernel/jobs/commit'
import { getKernelArtifact, getKernelJobDetail, listKernelJobs } from '../kernel/jobs/repo'
import { cancelKernelJob, createAndRunKernelJob, getKernelJobProgress } from '../kernel/jobs/run-job'

export type KernelJobRoutesDeps = {
  getWorkspace: () => string
  createJob?: typeof createAndRunKernelJob
}

export function registerKernelJobRoutes(app: Express, deps: KernelJobRoutesDeps) {
  const createJob = deps.createJob || createAndRunKernelJob

  app.post('/api/kernel/jobs', async (req, res) => {
    try {
      const result = await createJob(deps.getWorkspace(), req.body || {})
      if (!result.ok) return res.status(result.status).json({ error: result.message, code: result.code })
      void result.done.catch(() => {})
      res.status(202).json({ ok: true, job: { id: result.jobId, status: 'queued' } })
    } catch (error: any) {
      res.status(500).json({ error: String(error?.message || error) })
    }
  })

  app.get('/api/kernel/jobs/:id', (req, res) => {
    const ws = deps.getWorkspace()
    const jobId = String(req.params?.id || '')
    const detail = getKernelJobDetail(ws, jobId)
    if (!detail) return res.status(404).json({ error: 'job not found', code: 'JOB_NOT_FOUND' })
    res.json({ ok: true, ...detail, progress: getKernelJobProgress(ws, jobId) })
  })

  app.get('/api/kernel/jobs', (req, res) => {
    const query = (req as any).query || {}
    res.json({
      ok: true,
      jobs: listKernelJobs(deps.getWorkspace(), {
        projectId: Number(query.project_id || 0) || undefined,
        subjectType: query.subject_type ? String(query.subject_type) : undefined,
        subjectId: Number(query.subject_id || 0) || undefined,
        verb: query.verb ? String(query.verb) : undefined,
        subjectKey: query.subject_key ? String(query.subject_key) : undefined,
      }),
    })
  })

  app.post('/api/kernel/jobs/:id/cancel', (req, res) => {
    const result = cancelKernelJob(deps.getWorkspace(), String(req.params?.id || ''))
    if (!result.ok) return res.status(result.status).json({ error: 'cannot cancel', code: result.code })
    res.json({ ok: true })
  })

  app.get('/api/kernel/artifacts/:id/content', (req, res) => {
    const artifact = getKernelArtifact(deps.getWorkspace(), String(req.params?.id || ''))
    if (!artifact) return res.status(404).json({ error: 'artifact not found', code: 'ARTIFACT_NOT_FOUND' })
    let content = ''
    try { content = readFileSync(String(artifact.vault_path), 'utf8') } catch { content = '' }
    const LIMIT = 256 * 1024
    const truncated = content.length > LIMIT
    res.json({
      ok: true,
      artifact: { id: artifact.id, rel_path: artifact.rel_path, artifact_kind: artifact.artifact_kind, byte_size: artifact.byte_size },
      content: truncated ? content.slice(0, LIMIT) : content,
      truncated,
    })
  })

  app.post('/api/kernel/jobs/:id/commit', async (req, res) => {
    try {
      const result = await commitKernelCandidate(deps.getWorkspace(), String(req.params?.id || ''), String(req.body?.candidate_id || ''))
      if (!result.ok) return res.status(result.status).json({ error: result.message, code: result.code })
      res.json({ ok: true, commits: result.commits })
    } catch (error: any) {
      res.status(500).json({ error: String(error?.message || error) })
    }
  })
}
