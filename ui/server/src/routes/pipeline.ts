import type { Express } from 'express'
import { runInit } from '../pipeline-init'
import { runPlot } from '../pipeline-plot'
import { runStoryboard } from '../pipeline-storyboard'
import { runPromptPack } from '../pipeline-promptpack'
import { runExport } from '../pipeline-export'
import { runPipelineAll } from '../pipeline-runner'
import { appendLog } from '../status'

export function registerPipelineRoutes(app: Express, getWorkspace: () => string) {
  app.post('/api/pipeline/init', async (_req, res) => {
    try {
      const result = await runInit(getWorkspace())
      await appendLog(getWorkspace(), { id: Date.now(), level: 'info', message: 'pipeline init executed', createdAt: new Date().toISOString() })
      res.json({ ok: true, result })
    } catch (error) {
      await appendLog(getWorkspace(), { id: Date.now(), level: 'error', message: 'pipeline init failed', createdAt: new Date().toISOString(), meta: { error: String(error) } })
      res.status(500).json({ ok: false, error: String(error) })
    }
  })

  app.post('/api/pipeline/plot', async (req, res) => {
    try {
      const result = await runPlot(getWorkspace(), req.body ?? {})
      await appendLog(getWorkspace(), { id: Date.now(), level: 'info', message: 'pipeline plot executed', createdAt: new Date().toISOString() })
      res.json({ ok: true, result })
    } catch (error) {
      await appendLog(getWorkspace(), { id: Date.now(), level: 'error', message: 'pipeline plot failed', createdAt: new Date().toISOString(), meta: { error: String(error) } })
      res.status(500).json({ ok: false, error: String(error) })
    }
  })

  app.post('/api/pipeline/storyboard', async (req, res) => {
    try {
      const result = await runStoryboard(getWorkspace(), req.body ?? {})
      await appendLog(getWorkspace(), { id: Date.now(), level: 'info', message: 'pipeline storyboard executed', createdAt: new Date().toISOString() })
      res.json({ ok: true, result })
    } catch (error) {
      await appendLog(getWorkspace(), { id: Date.now(), level: 'error', message: 'pipeline storyboard failed', createdAt: new Date().toISOString(), meta: { error: String(error) } })
      res.status(500).json({ ok: false, error: String(error) })
    }
  })

  app.post('/api/pipeline/promptpack', async (req, res) => {
    try {
      const result = await runPromptPack(getWorkspace(), req.body ?? {})
      await appendLog(getWorkspace(), { id: Date.now(), level: 'info', message: 'pipeline promptpack executed', createdAt: new Date().toISOString() })
      res.json({ ok: true, result })
    } catch (error) {
      await appendLog(getWorkspace(), { id: Date.now(), level: 'error', message: 'pipeline promptpack failed', createdAt: new Date().toISOString(), meta: { error: String(error) } })
      res.status(500).json({ ok: false, error: String(error) })
    }
  })

  app.post('/api/pipeline/export', async (req, res) => {
    try {
      const result = await runExport(getWorkspace(), req.body ?? {})
      await appendLog(getWorkspace(), { id: Date.now(), level: 'info', message: 'pipeline export executed', createdAt: new Date().toISOString() })
      res.json({ ok: true, result })
    } catch (error) {
      await appendLog(getWorkspace(), { id: Date.now(), level: 'error', message: 'pipeline export failed', createdAt: new Date().toISOString(), meta: { error: String(error) } })
      res.status(500).json({ ok: false, error: String(error) })
    }
  })

  app.post('/api/pipeline/run-all', async (req, res) => {
    try {
      res.json(await runPipelineAll(getWorkspace(), req.body ?? {}))
    } catch (error) {
      res.status(500).json({ ok: false, message: 'run-all failed', workspace: getWorkspace(), payload: req.body ?? {}, preflight: { ok: false, workspace: getWorkspace(), missing: [] }, autoRepair: [], createdAt: new Date().toISOString(), durationMs: 0, steps: [], error: String(error) })
    }
  })
}
