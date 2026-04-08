import type { Storyboard } from '../schemas/storyboard.js'
import { PromptPackSchema, type PromptPack } from '../schemas/promptPack.js'
import {
  initializeStoryProject,
  readJsonFile,
  writeJsonFile,
  writeMarkdownFile,
} from './fileStore.js'
import {
  getEpisodeStoryboardPath,
  getStoryProjectPaths,
} from './projectPaths.js'

export type GeneratePromptPackInput = {
  episodeId: string
  stylePreset: string
  consistencyLevel?: 'low' | 'medium' | 'high'
  baseDir?: string
}

export type GeneratePromptPackResult = {
  promptPackPath: string
  promptMarkdownPath: string
  shotCount: number
}

function toPromptMarkdown(promptPack: PromptPack): string {
  const lines: string[] = [
    `# Prompt Pack ${promptPack.episodeId}`,
    '',
    `Style Preset: ${promptPack.stylePreset}`,
    `Consistency: ${promptPack.consistencyLevel}`,
    '',
  ]

  for (const shot of promptPack.shots) {
    lines.push(`## ${shot.shotId}`)
    lines.push(`Positive: ${shot.positivePrompt}`)
    lines.push(`Negative: ${shot.negativePrompt}`)
    lines.push(`Character Locks: ${shot.characterLocks.join(', ') || 'none'}`)
    lines.push(`Camera Tags: ${shot.cameraTags.join(', ') || 'none'}`)
    lines.push('')
  }

  return `${lines.join('\n')}\n`
}

export async function generatePromptPack(
  input: GeneratePromptPackInput,
): Promise<GeneratePromptPackResult> {
  await initializeStoryProject(input.baseDir)

  const storyboardPath = getEpisodeStoryboardPath(input.episodeId, input.baseDir)
  const storyboard = await readJsonFile<Storyboard>(storyboardPath)

  if (!storyboard) {
    throw new Error(`Storyboard not found for episode: ${input.episodeId}`)
  }

  const generatedAt = new Date().toISOString()
  const promptPack = PromptPackSchema.parse({
    episodeId: input.episodeId,
    stylePreset: input.stylePreset,
    consistencyLevel: input.consistencyLevel ?? 'high',
    generatedAt,
    shots: storyboard.shots.map(shot => ({
      shotId: shot.shotId,
      positivePrompt: `${input.stylePreset}, ${shot.camera}, ${shot.composition}, ${shot.action}`,
      negativePrompt: 'lowres, anatomy error, extra fingers, oversaturated, blurry text',
      characterLocks: shot.dialogue,
      cameraTags: [shot.camera, shot.composition],
    })),
  })

  const episodesDir = getStoryProjectPaths(input.baseDir).episodesDir
  const promptPackPath = `${episodesDir}/${input.episodeId}.prompts.json`
  const promptMarkdownPath = `${episodesDir}/${input.episodeId}.prompts.md`

  await writeJsonFile(promptPackPath, promptPack)
  await writeMarkdownFile(promptMarkdownPath, toPromptMarkdown(promptPack))

  return {
    promptPackPath,
    promptMarkdownPath,
    shotCount: promptPack.shots.length,
  }
}
