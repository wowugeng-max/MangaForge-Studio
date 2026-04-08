import { mkdir } from 'fs/promises'
import { generatePlotBeat } from '../src/manga/services/plotService.js'
import { getArgNumber, getArgString, getWorkspace } from './shared-args.js'

async function main() {
  const workspace = getWorkspace()
  await mkdir(workspace, { recursive: true })

  const result = await generatePlotBeat({
    baseDir: workspace,
    episodeId: getArgString('episodeId', 'ep-002')!,
    title: getArgString('title', '雨夜失踪案·上')!,
    premise:
      getArgString(
        'premise',
        '记者林岚在旧城区调查连续失踪案，线人何烬提供关键线索后突然失联，林岚必须在凌晨前锁定钟表店地下密室。',
      )!,
    beatFramework: (getArgString('framework', 'three-act') as 'three-act' | 'five-act') ?? 'three-act',
    targetLength: getArgNumber('panels', 12),
  })

  console.log('Manga plot done')
  console.log('Episode JSON:', result.episodeJsonPath)
  console.log('Script:', result.scriptPath)
  console.log('Beats:', result.episode.beats.length)
  console.log('Scenes:', result.episode.scenes.length)
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
