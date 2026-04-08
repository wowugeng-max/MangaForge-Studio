import { STORYBOARD_VERSION } from '../constants.js'
import type { Episode } from '../schemas/episode.js'
import {
  ShotSchema,
  StoryboardSchema,
  type Shot,
  type Storyboard,
} from '../schemas/storyboard.js'
import { initializeStoryProject, writeJsonFile } from './fileStore.js'
import { getEpisodeStoryboardPath } from './projectPaths.js'

export type GenerateStoryboardInput = {
  episodeId: string
  title: string
  scenes: Episode['scenes']
  panelTarget?: number
  stylePreset?: string
  baseDir?: string
}

export type GenerateStoryboardResult = {
  storyboardPath: string
  shotCount: number
  storyboard: Storyboard
}

function normalizeScenes(
  scenes: Episode['scenes'],
): Array<Episode['scenes'][number]> {
  return scenes.length > 0
    ? scenes
    : [
        {
          sceneId: 'scene-001',
          location: 'TBD',
          summary: 'Open with the core conflict in motion.',
          mood: 'dynamic',
          cast: [],
        },
      ]
}

function createShotsFromScenes(
  scenes: Episode['scenes'],
  panelTarget: number,
): Shot[] {
  const safeScenes = normalizeScenes(scenes)
  const basePanelsPerScene = Math.max(1, Math.floor(panelTarget / safeScenes.length))

  const shots: Shot[] = []
  let panelOrder = 1

  for (const scene of safeScenes) {
    const panelCount = Math.max(1, basePanelsPerScene)
    for (let i = 0; i < panelCount; i++) {
      const shotDraft = {
        shotId: `${scene.sceneId}-shot-${String(i + 1).padStart(2, '0')}`,
        sceneId: scene.sceneId,
        panelOrder,
        camera: i % 3 === 0 ? 'wide shot' : i % 3 === 1 ? 'medium shot' : 'close-up',
        composition: i % 2 === 0 ? 'rule of thirds' : 'center composition',
        action: i === 0 ? scene.summary : `Continue scene tension beat ${i + 1}.`,
        dialogue: [],
        sfx: [],
        emotion: scene.mood,
      }
      shots.push(ShotSchema.parse(shotDraft))
      panelOrder += 1
    }
  }

  return shots.slice(0, Math.max(1, panelTarget))
}

export async function generateStoryboard(
  input: GenerateStoryboardInput,
): Promise<GenerateStoryboardResult> {
  await initializeStoryProject(input.baseDir)

  const panelTarget = Math.max(1, input.panelTarget ?? 12)
  const shots = createShotsFromScenes(input.scenes, panelTarget)
  const now = new Date().toISOString()

  const storyboard = StoryboardSchema.parse({
    version: STORYBOARD_VERSION,
    episodeId: input.episodeId,
    title: input.title,
    stylePreset: input.stylePreset,
    shots,
    createdAt: now,
    updatedAt: now,
  })

  const storyboardPath = getEpisodeStoryboardPath(input.episodeId, input.baseDir)
  await writeJsonFile(storyboardPath, storyboard)

  return {
    storyboardPath,
    shotCount: storyboard.shots.length,
    storyboard,
  }
}
