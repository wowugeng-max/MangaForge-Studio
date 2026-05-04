import type { Express } from 'express'
import { readTemplates, writeTemplates, type ParamsTemplate } from '../templates-store'

export function registerTemplateRoutes(app: Express) {
  app.get('/manga/templates', async (_req, res) => {
    try {
      res.json({ templates: await readTemplates() })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/manga/templates', async (req, res) => {
    try {
      const templates = await readTemplates()
      const payload = req.body as ParamsTemplate
      const next = [payload, ...templates.filter(item => item.name !== payload.name)]
      await writeTemplates(next)
      res.json({ ok: true, templates: next })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/manga/templates', async (req, res) => {
    try {
      const templates = Array.isArray(req.body?.templates) ? req.body.templates as ParamsTemplate[] : []
      await writeTemplates(templates)
      res.json({ ok: true, templates })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
