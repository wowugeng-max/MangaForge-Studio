import { generateStoryboard } from '../../../restored-src/src/manga/services/storyboardService.js'
import { readJsonFile } from '../../../restored-src/src/manga/services/fileStore.js'
import { join } from 'path'
import type { Episode } from '../../../restored-src/src/manga/schemas/episode.js'

export async function readEpisode(activeWorkspace: string, episodeId: string): Promise<Episode | null> {
  return await readJsonFile<Episode>(join(activeWorkspace, '.story-project', 'episodes', `${episodeId}.episode.json`))
}

export async function runStoryboard(activeWorkspace: string, payload: any) {
  const episodeId = payload.episodeId ?? 'ep-002'
  const episode = await readEpisode(activeWorkspace, episodeId)
  if (!episode) throw new Error(`Episode data not found: ${episodeId}`)
  return generateStoryboard({
    baseDir: activeWorkspace,
    episodeId,
    title: payload.title ?? episode.title,
    panelTarget: Number(payload.panels ?? payload.panelTarget ?? episode.estimatedPanels ?? 12),
    stylePreset: payload.stylePreset ?? payload.style ?? 'cinematic noir manga',
    scenes: episode.scenes,
  })
}
