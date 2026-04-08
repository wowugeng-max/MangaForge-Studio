import { mkdir } from 'fs/promises'
import { exportEpisode } from '../src/manga/services/exportService.js'
import { getArgString, getWorkspace } from './shared-args.js'

async function main() {
  const workspace = getWorkspace()
  const episodeId = getArgString('episodeId', 'ep-002')!
  await mkdir(workspace, { recursive: true })

  const jsonResult = await exportEpisode(
    {
      episodeId,
      format: 'json',
      includeDialogue: true,
      includePrompts: true,
    },
    workspace,
  )
  const mdResult = await exportEpisode(
    {
      episodeId,
      format: 'md',
      includeDialogue: true,
      includePrompts: true,
    },
    workspace,
  )
  const csvResult = await exportEpisode(
    {
      episodeId,
      format: 'csv',
      includeDialogue: true,
      includePrompts: true,
    },
    workspace,
  )
  const zipResult = await exportEpisode(
    {
      episodeId,
      format: 'zip',
      includeDialogue: true,
      includePrompts: true,
    },
    workspace,
  )

  console.log('Manga export done')
  console.log('JSON:', jsonResult.outputPath)
  console.log('MD:', mdResult.outputPath)
  console.log('CSV:', csvResult.outputPath)
  console.log('ZIP:', zipResult.outputPath)
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
