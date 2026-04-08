import { readFile } from 'fs/promises'
import { join } from 'path'
import JSZip from 'jszip'
import { SUPPORTED_EXPORT_FORMATS, type SupportedExportFormat } from '../constants.js'
import {
  EpisodeExportRequestSchema,
  EpisodeExportResultSchema,
  type EpisodeExportRequest,
  type EpisodeExportResult,
} from '../schemas/export.js'
import type { Storyboard } from '../schemas/storyboard.js'
import {
  initializeStoryProject,
  readJsonFile,
  readYamlFile,
  writeJsonFile,
  writeMarkdownFile,
} from './fileStore.js'
import { getEpisodeExportPath, getEpisodeStoryboardPath, getStoryProjectPaths } from './projectPaths.js'

function toMarkdownExport(
  episodeId: string,
  storyboard: Storyboard,
  includeDialogue: boolean,
): string {
  const lines: string[] = [`# Export ${episodeId}`, '', `Total Shots: ${storyboard.shots.length}`, '']

  for (const shot of storyboard.shots) {
    lines.push(`## ${shot.shotId}`)
    lines.push(`- Scene: ${shot.sceneId}`)
    lines.push(`- Camera: ${shot.camera}`)
    lines.push(`- Composition: ${shot.composition}`)
    lines.push(`- Action: ${shot.action}`)
    if (includeDialogue && shot.dialogue.length > 0) {
      lines.push(`- Dialogue: ${shot.dialogue.join(' | ')}`)
    }
    lines.push('')
  }

  return `${lines.join('\n')}\n`
}

function toCsvExport(storyboard: Storyboard, includeDialogue: boolean): string {
  const headers = [
    'shotId',
    'sceneId',
    'panelOrder',
    'camera',
    'composition',
    'action',
    ...(includeDialogue ? ['dialogue'] : []),
  ]

  const rows = storyboard.shots.map(shot => {
    const base = [
      shot.shotId,
      shot.sceneId,
      String(shot.panelOrder),
      shot.camera,
      shot.composition,
      shot.action,
    ]
    if (includeDialogue) {
      base.push(shot.dialogue.join(' | '))
    }
    return base.map(value => `"${value.replace(/"/g, '""')}"`).join(',')
  })

  return `${headers.join(',')}\n${rows.join('\n')}\n`
}

async function writeZipExport(
  outputPath: string,
  episodeId: string,
  storyboardPath: string,
  baseDir?: string,
): Promise<void> {
  const zip = new JSZip()
  const storyPaths = getStoryProjectPaths(baseDir)
  const episodeDir = storyPaths.episodesDir

  const candidates = [
    {
      source: storyPaths.seriesFile,
      target: 'series.yaml',
    },
    {
      source: storyboardPath,
      target: `${episodeId}.storyboard.json`,
    },
    {
      source: join(episodeDir, `${episodeId}.episode.json`),
      target: `${episodeId}.episode.json`,
    },
    {
      source: join(episodeDir, `${episodeId}.script.md`),
      target: `${episodeId}.script.md`,
    },
    {
      source: join(episodeDir, `${episodeId}.prompts.json`),
      target: `${episodeId}.prompts.json`,
    },
    {
      source: join(episodeDir, `${episodeId}.prompts.md`),
      target: `${episodeId}.prompts.md`,
    },
  ]

  for (const file of candidates) {
    try {
      const content = await readFile(file.source)
      zip.file(file.target, content)
    } catch {
      // Optional file missing - skip
    }
  }

  const zipBuffer = await zip.generateAsync({ type: 'uint8array' })
  await Bun.write(outputPath, zipBuffer)
}

export async function exportEpisode(
  request: EpisodeExportRequest,
  baseDir?: string,
): Promise<EpisodeExportResult> {
  const input = EpisodeExportRequestSchema.parse(request)
  if (!SUPPORTED_EXPORT_FORMATS.includes(input.format as SupportedExportFormat)) {
    throw new Error(`Unsupported export format: ${input.format}`)
  }

  await initializeStoryProject(baseDir)

  const storyboardPath = getEpisodeStoryboardPath(input.episodeId, baseDir)
  const storyboard = await readJsonFile<Storyboard>(storyboardPath)
  if (!storyboard) {
    throw new Error(`Storyboard not found for episode: ${input.episodeId}`)
  }

  const outputPath = getEpisodeExportPath(input.episodeId, input.format, baseDir)
  const generatedAt = new Date().toISOString()

  if (input.format === 'json') {
    const series = await readYamlFile<Record<string, unknown>>(
      getStoryProjectPaths(baseDir).seriesFile,
    )
    await writeJsonFile(outputPath, {
      episodeId: input.episodeId,
      generatedAt,
      includePrompts: input.includePrompts,
      includeDialogue: input.includeDialogue,
      series,
      storyboard,
    })
  } else if (input.format === 'md') {
    await writeMarkdownFile(
      outputPath,
      toMarkdownExport(input.episodeId, storyboard, input.includeDialogue),
    )
  } else if (input.format === 'csv') {
    await writeMarkdownFile(outputPath, toCsvExport(storyboard, input.includeDialogue))
  } else {
    await writeZipExport(outputPath, input.episodeId, storyboardPath, baseDir)
  }

  return EpisodeExportResultSchema.parse({
    episodeId: input.episodeId,
    format: input.format,
    outputPath,
    generatedAt,
  })
}
