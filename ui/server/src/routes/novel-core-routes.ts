import type { Express } from 'express'
import { ensureWorkspaceStructure } from '../workspace'
import {
  createNovelChapter,
  createNovelCharacter,
  createNovelOutline,
  createNovelProject,
  createNovelWorldbuilding,
  deleteNovelChapter,
  deleteNovelOutline,
  deleteNovelProject,
  getNovelProject,
  listChapterVersions,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelProjects,
  listNovelWorldbuilding,
  rollbackChapterVersion,
  updateNovelCharacter,
  updateNovelChapter,
  updateNovelOutline,
  updateNovelProject,
  updateNovelWorldbuilding,
} from '../novel'
import { previewNovelKnowledgeInjection } from '../llm'

function parseOptionalBoolean(value: any) {
  if (value === undefined) return undefined
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const raw = String(value).trim().toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(raw)) return true
  if (['false', '0', 'no', 'off'].includes(raw)) return false
  return Boolean(value)
}

export function registerNovelCoreRoutes(app: Express, getWorkspace: () => string) {
  app.get('/api/novel/projects', async (_req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      await ensureWorkspaceStructure(activeWorkspace)
      res.json(await listNovelProjects(activeWorkspace))
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      await ensureWorkspaceStructure(activeWorkspace)
      res.json(await createNovelProject(activeWorkspace, req.body))
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.delete('/api/novel/projects/:id', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const ok = await deleteNovelProject(activeWorkspace, Number(req.params.id))
      if (!ok) return res.status(404).json({ error: 'project not found' })
      res.json({ ok: true })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getNovelProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json(project)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const updated = await updateNovelProject(activeWorkspace, Number(req.params.id), req.body)
      if (!updated) return res.status(404).json({ error: 'project not found' })
      res.json(updated)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/reference-config', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const project = await getNovelProject(activeWorkspace, Number(req.params.id))
      if (!project) return res.status(404).json({ error: 'project not found' })
      res.json(project.reference_config || { references: [], notes: '' })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.put('/api/novel/projects/:id/reference-config', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const updated = await updateNovelProject(activeWorkspace, Number(req.params.id), { reference_config: req.body || {} } as any)
      if (!updated) return res.status(404).json({ error: 'project not found' })
      res.json(updated.reference_config || { references: [], notes: '' })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/projects/:id/reference-preview', async (req, res) => {
    try {
      const activeWorkspace = getWorkspace()
      const baseProject = await getNovelProject(activeWorkspace, Number(req.params.id))
      if (!baseProject) return res.status(404).json({ error: 'project not found' })
      const project = { ...baseProject, reference_config: req.body?.reference_config || baseProject.reference_config || {} }
      res.json(await previewNovelKnowledgeInjection(project, String(req.body?.task_type || '大纲生成')))
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/novel/projects/:id/worldbuilding', async (req, res) => {
    try { res.json(await listNovelWorldbuilding(getWorkspace(), Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.post('/api/novel/projects/:id/worldbuilding', async (req, res) => {
    try { res.json(await createNovelWorldbuilding(getWorkspace(), { ...req.body, project_id: Number(req.params.id) })) } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.put('/api/novel/worldbuilding/:worldbuildingId', async (req, res) => {
    try {
      const updated = await updateNovelWorldbuilding(getWorkspace(), Number(req.params.worldbuildingId), req.body)
      if (!updated) return res.status(404).json({ error: 'worldbuilding not found' })
      res.json(updated)
    } catch (error) { res.status(500).json({ error: String(error) }) }
  })

  app.get('/api/novel/projects/:id/characters', async (req, res) => {
    try { res.json(await listNovelCharacters(getWorkspace(), Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.post('/api/novel/characters', async (req, res) => {
    try { res.json(await createNovelCharacter(getWorkspace(), req.body)) } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.put('/api/novel/characters/:characterId', async (req, res) => {
    try {
      const updated = await updateNovelCharacter(getWorkspace(), Number(req.params.characterId), req.body)
      if (!updated) return res.status(404).json({ error: 'character not found' })
      res.json(updated)
    } catch (error) { res.status(500).json({ error: String(error) }) }
  })

  app.get('/api/novel/projects/:id/outlines', async (req, res) => {
    try { res.json(await listNovelOutlines(getWorkspace(), Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.post('/api/novel/outlines', async (req, res) => {
    try { res.json(await createNovelOutline(getWorkspace(), req.body)) } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.put('/api/novel/outlines/:outlineId', async (req, res) => {
    try {
      const updated = await updateNovelOutline(getWorkspace(), Number(req.params.outlineId), req.body)
      if (!updated) return res.status(404).json({ error: 'outline not found' })
      res.json(updated)
    } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.delete('/api/novel/outlines/:outlineId', async (req, res) => {
    try {
      const ok = await deleteNovelOutline(getWorkspace(), Number(req.params.outlineId))
      if (!ok) return res.status(404).json({ error: 'outline not found' })
      res.json({ ok: true })
    } catch (error) { res.status(500).json({ error: String(error) }) }
  })

  app.get('/api/novel/projects/:id/chapters', async (req, res) => {
    try { res.json(await listNovelChapters(getWorkspace(), Number(req.params.id))) } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.post('/api/novel/chapters', async (req, res) => {
    try { res.json(await createNovelChapter(getWorkspace(), req.body)) } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.delete('/api/novel/chapters/:chapterId', async (req, res) => {
    try {
      const ok = await deleteNovelChapter(getWorkspace(), Number(req.params.chapterId))
      if (!ok) return res.status(404).json({ error: 'chapter not found' })
      res.json({ ok: true })
    } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.get('/api/novel/chapters/:chapterId/versions', async (req, res) => {
    try { res.json(await listChapterVersions(getWorkspace(), Number(req.params.chapterId))) } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.post('/api/novel/chapters/:chapterId/rollback', async (req, res) => {
    try {
      const updated = await rollbackChapterVersion(getWorkspace(), Number(req.params.chapterId), Number(req.body.version_id))
      if (!updated) return res.status(404).json({ error: 'chapter or version not found' })
      res.json(updated)
    } catch (error) { res.status(500).json({ error: String(error) }) }
  })
  app.put('/api/novel/chapters/:chapterId', async (req, res) => {
    try {
      const { create_version, createVersion, version_source, versionSource, force_version, forceVersion, ...patch } = req.body || {}
      const updated = await updateNovelChapter(getWorkspace(), Number(req.params.chapterId), patch, {
        createVersion: parseOptionalBoolean(create_version ?? createVersion),
        versionSource: version_source || versionSource || 'manual_edit',
        forceVersion: parseOptionalBoolean(force_version ?? forceVersion),
      })
      if (!updated) return res.status(404).json({ error: 'chapter not found' })
      res.json(updated)
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })
}
