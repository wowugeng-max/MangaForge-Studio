import type { Express } from 'express'
import { readTemplates, writeTemplates, type ParamsTemplate } from '../templates-store'

export function registerTemplateRoutes(app: Express) {
  app.get(['/manga/templates', '/api/manga/templates'], async (_req, res) => {
    try {
      res.json({ templates: await readTemplates() })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post(['/manga/templates', '/api/manga/templates'], async (req, res) => {
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

  app.delete(['/manga/templates/:name', '/api/manga/templates/:name'], async (req, res) => {
    try {
      const name = String(req.params?.name || '').trim()
      const templates = await readTemplates()
      const next = templates.filter(item => item.name !== name)
      await writeTemplates(next)
      res.json({ ok: true, templates: next })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get(['/manga/templates/export', '/api/manga/templates/export'], async (_req, res) => {
    try {
      const payload = { templates: await readTemplates() }
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename="mangaforge-templates.json"')
      res.send(`${JSON.stringify(payload, null, 2)}\n`)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post(['/manga/templates/import', '/api/manga/templates/import'], async (req, res) => {
    try {
      const incoming = Array.isArray(req.body?.templates) ? req.body.templates as ParamsTemplate[] : []
      if (!incoming.length) {
        res.status(400).json({ error: 'templates must be a non-empty array' })
        return
      }
      const templates = await readTemplates()
      const incomingNames = new Set(incoming.map(item => item.name))
      const next = [...incoming, ...templates.filter(item => !incomingNames.has(item.name))]
      await writeTemplates(next)
      res.json({ ok: true, imported: incoming.length, templates: next })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put(['/manga/templates', '/api/manga/templates'], async (req, res) => {
    try {
      const templates = Array.isArray(req.body?.templates) ? req.body.templates as ParamsTemplate[] : []
      await writeTemplates(templates)
      res.json({ ok: true, templates })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
