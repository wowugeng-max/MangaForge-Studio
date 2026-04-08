import { mkdir } from 'fs/promises'
import { generatePromptPack } from '../src/manga/services/promptService.js'
import { getArgString, getWorkspace } from './shared-args.js'

async function main() {
  const workspace = getWorkspace()
  await mkdir(workspace, { recursive: true })

  const result = await generatePromptPack({
    baseDir: workspace,
    episodeId: getArgString('episodeId', 'ep-002')!,
    stylePreset: getArgString('style', 'cinematic noir manga')!,
    consistencyLevel:
      (getArgString('consistency', 'high') as 'low' | 'medium' | 'high') ?? 'high',
  })

  console.log('Manga promptpack done')
  console.log('Prompt JSON:', result.promptPackPath)
  console.log('Prompt Markdown:', result.promptMarkdownPath)
  console.log('Shots:', result.shotCount)
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
