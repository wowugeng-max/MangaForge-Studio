import { mkdir } from 'fs/promises'
import { join } from 'path'
import { readJsonFile } from '../src/manga/services/fileStore.js'
import { generateStoryboard } from '../src/manga/services/storyboardService.js'
import type { Episode } from '../src/manga/schemas/episode.js'
import { getArgNumber, getArgString, getWorkspace } from './shared-args.js'

async function main() {
  const workspace = getWorkspace()
  const episodeId = getArgString('episodeId', 'ep-002')!
  await mkdir(workspace, { recursive: true })

  const episodePath = join(
    workspace,
    '.story-project',
    'episodes',
    `${episodeId}.episode.json`,
  )
  const episode = await readJsonFile<Episode>(episodePath)

  if (!episode) {
    throw new Error(`Episode data not found: ${episodePath}. Run manga:plot first.`)
  }

  const result = await generateStoryboard({
    baseDir: workspace,
    episodeId: episode.episodeId,
    title: getArgString('title', episode.title) ?? episode.title,
    panelTarget: getArgNumber('panels', episode.estimatedPanels ?? 12),
    stylePreset: getArgString('style', 'cinematic noir manga'),
    scenes: episode.scenes,
  })

  console.log('Manga storyboard done')
  console.log('Storyboard:', result.storyboardPath)
  console.log('Shots:', result.shotCount)
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
