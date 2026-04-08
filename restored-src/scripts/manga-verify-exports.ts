import { access } from 'fs/promises'
import { constants } from 'fs'
import { join } from 'path'
import { getArgString, getWorkspace } from './shared-args.js'

async function assertFileExists(path: string): Promise<void> {
  await access(path, constants.F_OK)
}

async function main() {
  const workspace = getWorkspace()
  const episodeId = getArgString('episodeId', 'ep-002')!
  const episodesDir = join(workspace, '.story-project', 'episodes')

  const targets = [
    join(episodesDir, `${episodeId}.export.json`),
    join(episodesDir, `${episodeId}.export.md`),
    join(episodesDir, `${episodeId}.export.csv`),
    join(episodesDir, `${episodeId}.export.zip`),
  ]

  for (const file of targets) {
    await assertFileExists(file)
    console.log(`OK: ${file}`)
  }

  console.log('\nExport verification passed.')
}

main().catch(error => {
  console.error('Export verification failed:')
  console.error(error)
  process.exitCode = 1
})
