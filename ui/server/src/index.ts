import express from 'express'
import cors from 'cors'
import JSZip from 'jszip'
import { mkdir, readdir, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { createOrUpdateStoryBible } from '../../../restored-src/src/manga/services/bibleService.js'
import { generatePlotBeat } from '../../../restored-src/src/manga/services/plotService.js'
import { generateStoryboard } from '../../../restored-src/src/manga/services/storyboardService.js'
import { generatePromptPack } from '../../../restored-src/src/manga/services/promptService.js'
import { exportEpisode } from '../../../restored-src/src/manga/services/exportService.js'
import { readJsonFile } from '../../../restored-src/src/manga/services/fileStore.js'
import type { Episode } from '../../../restored-src/src/manga/schemas/episode.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

const serverRoot = process.cwd()
const defaultWorkspace = join(
  serverRoot,
  '..',
  '..',
  'restored-src',
  '.smoke-workspace',
)
const workspaceConfigPath = join(serverRoot, '.workspace-config.json')
const templateStorePath = join(serverRoot, '.templates.json')

type RunHistoryItem = {
  id: number
  endpoint: string
  episodeId: string
  success: boolean
  durationMs: number
  timestamp: string
  error?: string
}

type ParamsTemplate = {
  name: string
  episodeId: string
  title: string
  premise: string
  panelTarget: number
  stylePreset: string
  consistencyLevel: 'low' | 'medium' | 'high'
  beatFramework: 'three-act' | 'five-act'
}

const runHistory: RunHistoryItem[] = []
let runCounter = 1
let activeWorkspace = defaultWorkspace

function now() {
  return Date.now()
}

async function loadWorkspaceConfig() {
  try {
    const text = await readFile(workspaceConfigPath, 'utf8')
    const data = JSON.parse(text) as { activeWorkspace?: string }
    if (data.activeWorkspace) activeWorkspace = data.activeWorkspace
  } catch {
    // ignore
  }
}

async function saveWorkspaceConfig() {
  await writeFile(
    workspaceConfigPath,
    `${JSON.stringify({ activeWorkspace }, null, 2)}\n`,
    'utf8',
  )
}

function getStoryRoot() {
  return join(activeWorkspace, '.story-project')
}

function getEpisodesDir() {
  return join(getStoryRoot(), 'episodes')
}

async function ensureWorkspaceStructure() {
  await mkdir(activeWorkspace, { recursive: true })
  await mkdir(getStoryRoot(), { recursive: true })
  await mkdir(getEpisodesDir(), { recursive: true })
}

function hasExt(files: string[], episodeId: string, ext: string): boolean {
  return files.includes(`${episodeId}.${ext}`)
}

function buildEpisodeStatus(files: string[], episodeId: string) {
  const plot =
    hasExt(files, episodeId, 'episode.json') &&
    hasExt(files, episodeId, 'script.md')
  const storyboard = hasExt(files, episodeId, 'storyboard.json')
  const promptpack =
    hasExt(files, episodeId, 'prompts.json') &&
    hasExt(files, episodeId, 'prompts.md')
  const exportJson = hasExt(files, episodeId, 'export.json')
  const exportMd = hasExt(files, episodeId, 'export.md')
  const exportCsv = hasExt(files, episodeId, 'export.csv')
  const exportZip = hasExt(files, episodeId, 'export.zip')

  return {
    episodeId,
    plot,
    storyboard,
    promptpack,
    exportJson,
    exportMd,
    exportCsv,
    exportZip,
    releaseReady: plot && storyboard && promptpack && exportJson && exportMd && exportCsv && exportZip,
  }
}

function addHistory(
  endpoint: string,
  episodeId: string,
  success: boolean,
  durationMs: number,
  error?: string,
): void {
  runHistory.unshift({
    id: runCounter++,
    endpoint,
    episodeId,
    success,
    durationMs,
    timestamp: new Date().toISOString(),
    error,
  })
  if (runHistory.length > 200) runHistory.length = 200
}

async function collectStatus() {
  const storyRoot = getStoryRoot()
  const episodesDir = getEpisodesDir()
  const files = await readdir(episodesDir).catch(() => [])
  const episodes = Array.from(new Set(files.map(f => f.split('.')[0]))).filter(Boolean)
  const storyFiles = [
    ...files.map(f => join(episodesDir, f)),
    join(storyRoot, 'series.yaml'),
    join(storyRoot, 'style-guide.md'),
  ]
  const episodeStatus = episodes.map(ep => buildEpisodeStatus(files, ep))
  return {
    workspace: activeWorkspace,
    storyRoot,
    episodes,
    files,
    storyFiles,
    episodeStatus,
    runHistory,
  }
}

async function listTemplates(): Promise<ParamsTemplate[]> {
  try {
    const text = await readFile(templateStorePath, 'utf8')
    return JSON.parse(text) as ParamsTemplate[]
  } catch {
    return []
  }
}

async function saveTemplates(templates: ParamsTemplate[]): Promise<void> {
  await writeFile(templateStorePath, `${JSON.stringify(templates, null, 2)}\n`, 'utf8')
}

async function buildEpisodeBundle(episodeId: string): Promise<{ fileName: string; buffer: Uint8Array }> {
  const zip = new JSZip()
  const storyRoot = getStoryRoot()
  const episodesDir = getEpisodesDir()
  const candidates = [
    { source: join(storyRoot, 'series.yaml'), target: 'series.yaml' },
    { source: join(storyRoot, 'style-guide.md'), target: 'style-guide.md' },
    { source: join(episodesDir, `${episodeId}.episode.json`), target: `${episodeId}.episode.json` },
    { source: join(episodesDir, `${episodeId}.script.md`), target: `${episodeId}.script.md` },
    { source: join(episodesDir, `${episodeId}.storyboard.json`), target: `${episodeId}.storyboard.json` },
    { source: join(episodesDir, `${episodeId}.prompts.json`), target: `${episodeId}.prompts.json` },
    { source: join(episodesDir, `${episodeId}.prompts.md`), target: `${episodeId}.prompts.md` },
    { source: join(episodesDir, `${episodeId}.export.json`), target: `${episodeId}.export.json` },
    { source: join(episodesDir, `${episodeId}.export.md`), target: `${episodeId}.export.md` },
    { source: join(episodesDir, `${episodeId}.export.csv`), target: `${episodeId}.export.csv` },
  ]

  for (const file of candidates) {
    try {
      const content = await readFile(file.source)
      zip.file(file.target, content)
    } catch {
      // optional file missing
    }
  }

  const buffer = await zip.generateAsync({ type: 'uint8array' })
  return { fileName: `${episodeId}.bundle.zip`, buffer }
}

app.get('/api/manga/status', async (_req, res) => {
  try {
    await ensureWorkspaceStructure()
    res.json(await collectStatus())
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

app.get('/api/manga/workspaces', async (_req, res) => {
  try {
    const candidates = [defaultWorkspace, activeWorkspace]
    const unique = Array.from(new Set(candidates))
    res.json({ activeWorkspace, workspaces: unique })
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

app.post('/api/manga/workspace', async (req, res) => {
  try {
    const next = String(req.body.workspace || '').trim()
    if (!next) return res.status(400).json({ error: 'workspace is required' })
    activeWorkspace = next
    await ensureWorkspaceStructure()
    await saveWorkspaceConfig()
    return res.json({ ok: true, activeWorkspace })
  } catch (error) {
    return res.status(500).json({ error: String(error) })
  }
})

app.get('/api/manga/templates', async (_req, res) => {
  try {
    res.json({ templates: await listTemplates() })
  } catch (error) {
    res.status(500).json({ error: String(error) })
  }
})

app.post('/api/manga/templates', async (req, res) => {
  try {
    const payload = req.body as ParamsTemplate
    if (!payload?.name) return res.status(400).json({ error: 'template name is required' })
    const templates = await listTemplates()
    const merged = [payload, ...templates.filter(t => t.name !== payload.name)]
    await saveTemplates(merged)
    return res.json({ ok: true, templates: merged })
  } catch (error) {
    return res.status(500).json({ error: String(error) })
  }
})

app.delete('/api/manga/templates/:name', async (req, res) => {
  try {
    const name = req.params.name
    const templates = await listTemplates()
    const filtered = templates.filter(t => t.name !== name)
    await saveTemplates(filtered)
    return res.json({ ok: true, templates: filtered })
  } catch (error) {
    return res.status(500).json({ error: String(error) })
  }
})

app.get('/api/manga/file', async (req, res) => {
  try {
    const storyRoot = getStoryRoot()
    const filePath = String(req.query.path || '')
    if (!filePath.startsWith(storyRoot)) {
      return res.status(400).json({ error: 'path must be inside .story-project' })
    }
    const content = await readFile(filePath, 'utf8')
    return res.json({ path: filePath, content })
  } catch (error) {
    return res.status(500).json({ error: String(error) })
  }
})

app.get('/api/manga/download', async (req, res) => {
  try {
    const storyRoot = getStoryRoot()
    const filePath = String(req.query.path || '')
    if (!filePath.startsWith(storyRoot)) {
      return res.status(400).json({ error: 'path must be inside .story-project' })
    }

    const content = await readFile(filePath)
    const fileName = filePath.split(/[\\/]/).pop() || 'artifact.txt'
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.setHeader('Content-Type', 'application/octet-stream')
    return res.send(content)
  } catch (error) {
    return res.status(500).json({ error: String(error) })
  }
})

app.get('/api/manga/bundle', async (req, res) => {
  try {
    const episodeId = String(req.query.episodeId || '')
    if (!episodeId) return res.status(400).json({ error: 'episodeId is required' })
    const { fileName, buffer } = await buildEpisodeBundle(episodeId)
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.setHeader('Content-Type', 'application/zip')
    return res.send(Buffer.from(buffer))
  } catch (error) {
    return res.status(500).json({ error: String(error) })
  }
})

app.post('/api/manga/init', async (_req, res) => {
  const startedAt = now()
  const episodeId = 'system'
  try {
    await ensureWorkspaceStructure()
    const result = await createOrUpdateStoryBible({
      baseDir: activeWorkspace,
      seriesTitle: '夜雨巷',
      genre: '都市悬疑',
      tone: '冷色、克制',
      themes: ['真相', '记忆', '信任'],
      targetAudience: '青年向',
      characters: [
        {
          id: 'lin',
          name: '林岚',
          role: '主角记者',
          lookAnchor: {
            silhouette: '短发风衣',
            palette: ['#2B2D42'],
            keyProps: ['录音笔'],
          },
          speechStyle: {
            tone: '冷静',
            catchphrases: ['先记下来'],
            bannedPhrases: ['随便啦'],
          },
        },
      ],
    })
    const durationMs = now() - startedAt
    addHistory('init', episodeId, true, durationMs)
    res.json({ durationMs, result })
  } catch (error) {
    const durationMs = now() - startedAt
    addHistory('init', episodeId, false, durationMs, String(error))
    res.status(500).json({ durationMs, error: String(error) })
  }
})

app.post('/api/manga/plot', async (req, res) => {
  const startedAt = now()
  const episodeId = req.body.episodeId ?? 'ep-100'
  try {
    const result = await generatePlotBeat({
      baseDir: activeWorkspace,
      episodeId,
      title: req.body.title ?? '新章节',
      premise: req.body.premise ?? '默认剧情',
      beatFramework: req.body.beatFramework ?? 'three-act',
      targetLength: Number(req.body.targetLength ?? 12),
    })
    const durationMs = now() - startedAt
    addHistory('plot', episodeId, true, durationMs)
    res.json({ durationMs, result })
  } catch (error) {
    const durationMs = now() - startedAt
    addHistory('plot', episodeId, false, durationMs, String(error))
    res.status(500).json({ durationMs, error: String(error) })
  }
})

app.post('/api/manga/storyboard', async (req, res) => {
  const startedAt = now()
  const episodeId = req.body.episodeId ?? 'ep-100'
  try {
    const episodePath = join(getEpisodesDir(), `${episodeId}.episode.json`)
    const episode = await readJsonFile<Episode>(episodePath)
    if (!episode) {
      const durationMs = now() - startedAt
      const error = 'episode json not found'
      addHistory('storyboard', episodeId, false, durationMs, error)
      return res.status(400).json({ durationMs, error })
    }

    const result = await generateStoryboard({
      baseDir: activeWorkspace,
      episodeId,
      title: req.body.title ?? episode.title,
      panelTarget: Number(req.body.panelTarget ?? episode.estimatedPanels ?? 12),
      stylePreset: req.body.stylePreset ?? 'cinematic noir manga',
      scenes: episode.scenes,
    })
    const durationMs = now() - startedAt
    addHistory('storyboard', episodeId, true, durationMs)
    return res.json({ durationMs, result })
  } catch (error) {
    const durationMs = now() - startedAt
    addHistory('storyboard', episodeId, false, durationMs, String(error))
    return res.status(500).json({ durationMs, error: String(error) })
  }
})

app.post('/api/manga/promptpack', async (req, res) => {
  const startedAt = now()
  const episodeId = req.body.episodeId ?? 'ep-100'
  try {
    const result = await generatePromptPack({
      baseDir: activeWorkspace,
      episodeId,
      stylePreset: req.body.stylePreset ?? 'cinematic noir manga',
      consistencyLevel: req.body.consistencyLevel ?? 'high',
    })
    const durationMs = now() - startedAt
    addHistory('promptpack', episodeId, true, durationMs)
    res.json({ durationMs, result })
  } catch (error) {
    const durationMs = now() - startedAt
    addHistory('promptpack', episodeId, false, durationMs, String(error))
    res.status(500).json({ durationMs, error: String(error) })
  }
})

app.post('/api/manga/export', async (req, res) => {
  const startedAt = now()
  const episodeId = req.body.episodeId ?? 'ep-100'
  try {
    const format = req.body.format ?? 'json'
    if (format === 'all') {
      const results = await Promise.all([
        exportEpisode(
          {
            episodeId,
            format: 'json',
            includeDialogue: true,
            includePrompts: true,
          },
          activeWorkspace,
        ),
        exportEpisode(
          {
            episodeId,
            format: 'md',
            includeDialogue: true,
            includePrompts: true,
          },
          activeWorkspace,
        ),
        exportEpisode(
          {
            episodeId,
            format: 'csv',
            includeDialogue: true,
            includePrompts: true,
          },
          activeWorkspace,
        ),
        exportEpisode(
          {
            episodeId,
            format: 'zip',
            includeDialogue: true,
            includePrompts: true,
          },
          activeWorkspace,
        ),
      ])
      const durationMs = now() - startedAt
      addHistory('export(all)', episodeId, true, durationMs)
      return res.json({ durationMs, mode: 'all', results })
    }

    const result = await exportEpisode(
      {
        episodeId,
        format,
        includeDialogue: true,
        includePrompts: true,
      },
      activeWorkspace,
    )
    const durationMs = now() - startedAt
    addHistory(`export(${format})`, episodeId, true, durationMs)
    return res.json({ durationMs, result })
  } catch (error) {
    const durationMs = now() - startedAt
    addHistory('export', episodeId, false, durationMs, String(error))
    return res.status(500).json({ durationMs, error: String(error) })
  }
})

loadWorkspaceConfig().then(async () => {
  await ensureWorkspaceStructure()
  app.listen(8787, () => {
    console.log('Manga UI server on http://localhost:8787')
  })
})
