import { EpisodeSchema, type Episode } from '../schemas/episode.js'
import {
  initializeStoryProject,
  writeJsonFile,
  writeMarkdownFile,
} from './fileStore.js'
import {
  getEpisodeScriptPath,
  getStoryProjectPaths,
} from './projectPaths.js'

export type GeneratePlotBeatInput = {
  episodeId: string
  title: string
  premise: string
  beatFramework?: 'three-act' | 'five-act'
  targetLength?: number
  baseDir?: string
}

export type GeneratePlotBeatResult = {
  episode: Episode
  episodeJsonPath: string
  scriptPath: string
}

function createEpisodeDraft(input: GeneratePlotBeatInput): Episode {
  const framework = input.beatFramework ?? 'three-act'

  const beats =
    framework === 'five-act'
      ? [
          {
            beatId: 'beat-1',
            title: 'Setup',
            summary: 'Establish world and protagonist status quo.',
          },
          {
            beatId: 'beat-2',
            title: 'Rising Pressure',
            summary: 'A clue escalates stakes and narrows options.',
          },
          {
            beatId: 'beat-3',
            title: 'Midpoint Reveal',
            summary: 'A revelation reframes the main conflict.',
          },
          {
            beatId: 'beat-4',
            title: 'Collapse',
            summary: 'Plan fails and protagonist absorbs a heavy cost.',
          },
          {
            beatId: 'beat-5',
            title: 'Resolution',
            summary: 'A decisive move resolves the immediate episode arc.',
          },
        ]
      : [
          {
            beatId: 'beat-1',
            title: 'Act I - Setup',
            summary: 'Introduce protagonist, tone, and inciting incident.',
          },
          {
            beatId: 'beat-2',
            title: 'Act II - Confrontation',
            summary: 'Escalate conflict through investigation and setbacks.',
          },
          {
            beatId: 'beat-3',
            title: 'Act III - Resolution',
            summary: 'Deliver climax and hook for the next episode.',
          },
        ]

  const scenes = beats.map((beat, index) => ({
    sceneId: `scene-${String(index + 1).padStart(3, '0')}`,
    location: index === 0 ? 'Opening location' : 'Key conflict location',
    summary: beat.summary,
    mood: index === beats.length - 1 ? 'charged' : 'tense',
    cast: [],
  }))

  return EpisodeSchema.parse({
    episodeId: input.episodeId,
    title: input.title,
    premise: input.premise,
    estimatedPanels: input.targetLength,
    beats,
    scenes,
  })
}

function toScriptMarkdown(episode: Episode): string {
  const lines: string[] = [
    `# ${episode.episodeId} ${episode.title}`,
    '',
    `Premise: ${episode.premise}`,
    '',
    '## Beats',
    '',
  ]

  for (const beat of episode.beats) {
    lines.push(`- ${beat.beatId} | ${beat.title}: ${beat.summary}`)
  }

  lines.push('', '## Scenes', '')

  for (const scene of episode.scenes) {
    lines.push(`### ${scene.sceneId}`)
    lines.push(`- Location: ${scene.location}`)
    lines.push(`- Mood: ${scene.mood ?? 'neutral'}`)
    lines.push(`- Summary: ${scene.summary}`)
    lines.push('')
  }

  return `${lines.join('\n')}\n`
}

export async function generatePlotBeat(
  input: GeneratePlotBeatInput,
): Promise<GeneratePlotBeatResult> {
  const paths = await initializeStoryProject(input.baseDir)
  const episode = createEpisodeDraft(input)

  const scriptPath = getEpisodeScriptPath(input.episodeId, input.baseDir)
  const episodeJsonPath = `${getStoryProjectPaths(input.baseDir).episodesDir}/${input.episodeId}.episode.json`

  await writeMarkdownFile(scriptPath, toScriptMarkdown(episode))
  await writeJsonFile(episodeJsonPath, episode)

  return {
    episode,
    episodeJsonPath,
    scriptPath,
  }
}
