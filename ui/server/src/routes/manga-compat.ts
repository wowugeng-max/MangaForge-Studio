import type { Express } from 'express'
import { readFile, readdir, realpath, stat } from 'fs/promises'
import { basename, isAbsolute, join, relative, resolve } from 'path'
import { runInit as defaultRunInit } from '../pipeline-init'
import { runPlot as defaultRunPlot } from '../pipeline-plot'
import { runStoryboard as defaultRunStoryboard } from '../pipeline-storyboard'
import { runPromptPack as defaultRunPromptPack } from '../pipeline-promptpack'
import { runExport as defaultRunExport } from '../pipeline-export'
import {
  WORKSPACE_SWITCH_RESTART_REQUIRED,
  ensureWorkspaceStructure as defaultEnsureWorkspaceStructure,
  saveActiveWorkspace as defaultSaveActiveWorkspace,
} from '../workspace'

type MangaCompatDeps = {
  runInit?: (workspace: string) => Promise<any>
  runPlot?: (workspace: string, payload: any) => Promise<any>
  runStoryboard?: (workspace: string, payload: any) => Promise<any>
  runPromptPack?: (workspace: string, payload: any) => Promise<any>
  runExport?: (workspace: string, payload: any) => Promise<any>
  ensureWorkspaceStructure?: typeof defaultEnsureWorkspaceStructure
  saveActiveWorkspace?: typeof defaultSaveActiveWorkspace
}

type EpisodeFlags = {
  script: boolean
  episode: boolean
  storyboard: boolean
  promptsJson: boolean
  promptsMd: boolean
  exportJson: boolean
  exportMd: boolean
  exportCsv: boolean
  exportZip: boolean
}

const EMPTY_FLAGS: EpisodeFlags = {
  script: false,
  episode: false,
  storyboard: false,
  promptsJson: false,
  promptsMd: false,
  exportJson: false,
  exportMd: false,
  exportCsv: false,
  exportZip: false,
}

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await collectFiles(fullPath))
    else files.push(fullPath)
  }
  return files.sort()
}

function flagForEpisodeFile(filename: string): { episodeId: string; flag: keyof EpisodeFlags } | null {
  const patterns: Array<[RegExp, keyof EpisodeFlags]> = [
    [/^(.+)\.script\.md$/, 'script'],
    [/^(.+)\.episode\.json$/, 'episode'],
    [/^(.+)\.storyboard\.json$/, 'storyboard'],
    [/^(.+)\.prompts\.json$/, 'promptsJson'],
    [/^(.+)\.prompts\.md$/, 'promptsMd'],
    [/^(.+)\.export\.json$/, 'exportJson'],
    [/^(.+)\.export\.md$/, 'exportMd'],
    [/^(.+)\.export\.csv$/, 'exportCsv'],
    [/^(.+)\.export\.zip$/, 'exportZip'],
  ]
  for (const [pattern, flag] of patterns) {
    const match = filename.match(pattern)
    if (match?.[1]) return { episodeId: match[1], flag }
  }
  return null
}

async function createStudioHomeStatus(workspace: string) {
  await defaultEnsureWorkspaceStructure(workspace)
  const storyRoot = join(workspace, '.story-project')
  const episodesDir = join(storyRoot, 'episodes')
  const storyFiles = await collectFiles(storyRoot)
  const episodeFiles = await readdir(episodesDir).catch(() => [])
  const byEpisode = new Map<string, EpisodeFlags>()

  for (const filename of episodeFiles) {
    const parsed = flagForEpisodeFile(filename)
    if (!parsed) continue
    const flags = byEpisode.get(parsed.episodeId) || { ...EMPTY_FLAGS }
    flags[parsed.flag] = true
    byEpisode.set(parsed.episodeId, flags)
  }

  const episodes = [...byEpisode.keys()].sort()
  const episodeStatus = episodes.map(episodeId => {
    const flags = byEpisode.get(episodeId) || { ...EMPTY_FLAGS }
    const promptpack = flags.promptsJson || flags.promptsMd
    const exportJson = flags.exportJson
    const exportMd = flags.exportMd
    const exportCsv = flags.exportCsv
    const exportZip = flags.exportZip
    return {
      episodeId,
      plot: flags.script || flags.episode,
      storyboard: flags.storyboard,
      promptpack,
      exportJson,
      exportMd,
      exportCsv,
      exportZip,
      releaseReady: Boolean((flags.script || flags.episode) && flags.storyboard && promptpack && exportJson && exportMd && exportCsv && exportZip),
    }
  })

  return {
    workspace,
    storyRoot,
    episodes,
    files: await readdir(workspace).catch(() => []),
    storyFiles,
    episodeStatus,
    runHistory: [],
  }
}

async function runCompatStep(res: any, workspace: string, execute: () => Promise<any>) {
  const startedAt = Date.now()
  try {
    const result = await execute()
    res.json({ ok: true, durationMs: Date.now() - startedAt, result })
  } catch (error) {
    res.status(500).json({ ok: false, durationMs: Date.now() - startedAt, error: String(error) })
  }
}

function createHttpError(statusCode: number, message: string) {
  const error = new Error(message) as Error & { statusCode?: number }
  error.statusCode = statusCode
  return error
}

function isContainedPath(root: string, candidate: string) {
  const child = relative(root, candidate)
  return child === '' || (!child.startsWith('..') && !isAbsolute(child))
}

function legacyDownloadMime(filePath: string) {
  const lower = filePath.toLowerCase()
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8'
  if (lower.endsWith('.md') || lower.endsWith('.txt')) return 'text/plain; charset=utf-8'
  if (lower.endsWith('.csv')) return 'text/csv; charset=utf-8'
  if (lower.endsWith('.zip')) return 'application/zip'
  return 'application/octet-stream'
}

function setLegacyDownloadHeaders(res: any, filePath: string) {
  res.setHeader('Content-Type', legacyDownloadMime(filePath))
  res.setHeader('Content-Disposition', `attachment; filename="${basename(filePath).replace(/"/g, '')}"`)
}

async function resolveWorkspaceFile(workspace: string, requestedPath: unknown) {
  const requested = String(requestedPath || '').trim()
  if (!requested) throw createHttpError(400, 'path is required')

  const workspaceRoot = resolve(workspace)
  const candidate = isAbsolute(requested) ? resolve(requested) : resolve(workspaceRoot, requested)
  if (!isContainedPath(workspaceRoot, candidate)) throw createHttpError(403, 'path is outside workspace')

  const info = await stat(candidate).catch(() => null)
  if (!info?.isFile()) throw createHttpError(404, 'file not found')

  const [realWorkspace, realCandidate] = await Promise.all([realpath(workspaceRoot), realpath(candidate)])
  if (!isContainedPath(realWorkspace, realCandidate)) throw createHttpError(403, 'path is outside workspace')

  return candidate
}

function sendCompatError(res: any, error: unknown) {
  const statusCode = Number((error as any)?.statusCode || 500)
  const message = String((error as any)?.message || error)
  res.status(statusCode).json({ error: message })
}

export function registerMangaCompatRoutes(
  app: Express,
  getWorkspace: () => string,
  setWorkspace: (value: string) => void,
  deps: MangaCompatDeps = {},
) {
  const runInit = deps.runInit || defaultRunInit
  const runPlot = deps.runPlot || defaultRunPlot
  const runStoryboard = deps.runStoryboard || defaultRunStoryboard
  const runPromptPack = deps.runPromptPack || defaultRunPromptPack
  const runExport = deps.runExport || defaultRunExport
  const ensureWorkspaceStructure = deps.ensureWorkspaceStructure || defaultEnsureWorkspaceStructure
  const saveActiveWorkspace = deps.saveActiveWorkspace || defaultSaveActiveWorkspace

  app.get('/api/manga/status', async (_req, res) => {
    try {
      res.json(await createStudioHomeStatus(getWorkspace()))
    } catch (error) {
      res.status(500).json({ error: String(error) })
    }
  })

  app.get('/api/manga/workspaces', async (_req, res) => {
    res.json({ workspaces: [getWorkspace()] })
  })

  app.post('/api/manga/workspace', async (req, res) => {
    try {
      const next = String(req.body?.workspace || '').trim()
      if (!next) {
        res.status(400).json({ error: 'workspace is required' })
        return
      }
      setWorkspace(next)
      await ensureWorkspaceStructure(next)
      await saveActiveWorkspace(next)
      res.json({ ok: true, workspace: next })
    } catch (error) {
      if ((error as any)?.code === WORKSPACE_SWITCH_RESTART_REQUIRED) {
        res.status(409).json({
          error: String((error as any)?.message || error),
          error_code: WORKSPACE_SWITCH_RESTART_REQUIRED,
        })
        return
      }
      res.status(500).json({ error: String(error) })
    }
  })

  app.post('/api/manga/init', async (_req, res) => {
    await runCompatStep(res, getWorkspace(), () => runInit(getWorkspace()))
  })

  app.post('/api/manga/plot', async (req, res) => {
    await runCompatStep(res, getWorkspace(), () => runPlot(getWorkspace(), req.body ?? {}))
  })

  app.post('/api/manga/storyboard', async (req, res) => {
    await runCompatStep(res, getWorkspace(), () => runStoryboard(getWorkspace(), req.body ?? {}))
  })

  app.post('/api/manga/promptpack', async (req, res) => {
    await runCompatStep(res, getWorkspace(), () => runPromptPack(getWorkspace(), req.body ?? {}))
  })

  app.post('/api/manga/export', async (req, res) => {
    await runCompatStep(res, getWorkspace(), () => runExport(getWorkspace(), req.body ?? {}))
  })

  app.get('/api/manga/file', async (req, res) => {
    try {
      const filePath = await resolveWorkspaceFile(getWorkspace(), req.query?.path)
      res.json({ path: filePath, content: await readFile(filePath, 'utf8') })
    } catch (error) {
      sendCompatError(res, error)
    }
  })

  app.get('/api/manga/download', async (req, res) => {
    try {
      const filePath = await resolveWorkspaceFile(getWorkspace(), req.query?.path)
      setLegacyDownloadHeaders(res, filePath)
      res.send(await readFile(filePath))
    } catch (error) {
      sendCompatError(res, error)
    }
  })

  app.get('/api/manga/bundle', async (req, res) => {
    try {
      const episodeId = String(req.query?.episodeId || '').trim()
      if (!episodeId) throw createHttpError(400, 'episodeId is required')
      if (episodeId.includes('/') || episodeId.includes('\\') || episodeId.includes('\0')) {
        throw createHttpError(400, 'episodeId is invalid')
      }
      const bundlePath = join(getWorkspace(), '.story-project', 'episodes', `${episodeId}.export.zip`)
      const filePath = await resolveWorkspaceFile(getWorkspace(), bundlePath)
      setLegacyDownloadHeaders(res, filePath)
      res.send(await readFile(filePath))
    } catch (error) {
      sendCompatError(res, error)
    }
  })
}
