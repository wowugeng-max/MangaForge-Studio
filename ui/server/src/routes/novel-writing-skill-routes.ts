import type { Express } from 'express'
import {
  buildWritingSkillCatalog,
  isBuiltinWritingSkillId,
  listInstalledWritingSkillPacks,
} from '../novel-writing/writing-skills'
import {
  WritingSkillInstallError,
  installWritingSkillPackFromGitHub,
  uninstallWritingSkillPack,
} from '../novel-writing/writing-skills/install-github'

type WritingSkillRoutesContext = {
  getWorkspace: () => string
  fetchImpl?: typeof fetch
}

function installErrorStatus(code: string): number {
  if (code === 'DOWNLOAD_FAILED') return 502
  if (code === 'NOT_INSTALLED') return 404
  if (['INVALID_URL', 'ID_CONFLICT_BUILTIN', 'SKILL_MD_MISSING', 'BOUNDS_EXCEEDED', 'BUILTIN_NOT_REMOVABLE'].includes(code)) {
    return 400
  }
  return 500
}

export function registerNovelWritingSkillRoutes(app: Express, ctx: WritingSkillRoutesContext) {
  app.get('/api/novel/writing-skills/catalog', async (_req, res) => {
    try {
      const installed = await listInstalledWritingSkillPacks(ctx.getWorkspace())
      res.json({ ok: true, skills: buildWritingSkillCatalog(installed) })
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/novel/writing-skills/install', async (req, res) => {
    try {
      const pack = await installWritingSkillPackFromGitHub({
        url: String(req.body?.url || ''),
        workspace: ctx.getWorkspace(),
        ...(ctx.fetchImpl ? { fetchImpl: ctx.fetchImpl } : {}),
      })
      const skill = buildWritingSkillCatalog([pack]).find(entry => !entry.builtin)
      res.json({ ok: true, skill })
    } catch (error) {
      if (error instanceof WritingSkillInstallError) {
        return res.status(installErrorStatus(error.code)).json({
          ok: false,
          error_code: error.code,
          error: error.message,
        })
      }
      res.status(500).json({ error: String(error) })
    }
  })

  app.delete('/api/novel/writing-skills/:id', async (req, res) => {
    try {
      const id = String(req.params.id || '')
      if (isBuiltinWritingSkillId(id)) {
        return res.status(400).json({
          ok: false,
          error_code: 'BUILTIN_NOT_REMOVABLE',
          error: 'builtin writing skills cannot be removed',
        })
      }
      // Uninstall never touches project configs; stale enabled ids are
      // silently filtered by resolveWritingSkillsEnabled.
      await uninstallWritingSkillPack(ctx.getWorkspace(), id)
      res.json({ ok: true })
    } catch (error) {
      if (error instanceof WritingSkillInstallError) {
        return res.status(installErrorStatus(error.code)).json({
          ok: false,
          error_code: error.code,
          error: error.message,
        })
      }
      res.status(500).json({ error: String(error) })
    }
  })
}
