import { mkdir } from 'fs/promises'
import { join } from 'path'
import { createOrUpdateStoryBible } from '../src/manga/services/bibleService.js'
import { generateStoryboard } from '../src/manga/services/storyboardService.js'
import { exportEpisode } from '../src/manga/services/exportService.js'

const projectRoot = process.cwd()
const sandboxBaseDir = join(projectRoot, '.smoke-workspace')

async function ensureSandbox(): Promise<void> {
  await mkdir(sandboxBaseDir, { recursive: true })
}

async function main(): Promise<void> {
  console.log('=== Manga smoke test start ===')
  console.log('Workspace:', sandboxBaseDir)

  await ensureSandbox()

  const bibleResult = await createOrUpdateStoryBible({
    baseDir: sandboxBaseDir,
    seriesTitle: '夜雨巷',
    genre: '都市悬疑',
    tone: '冷色、克制',
    themes: ['真相', '记忆', '信任'],
    targetAudience: '青年向',
    styleGuide: '# 夜雨巷 Style Guide\n\n- 强调雨夜与霓虹反光\n- 人物面部特写要克制\n',
    characters: [
      {
        id: 'lin',
        name: '林岚',
        role: '主角记者',
        lookAnchor: {
          silhouette: '短发风衣',
          palette: ['#2B2D42', '#8D99AE'],
          keyProps: ['录音笔'],
        },
        speechStyle: {
          tone: '冷静',
          catchphrases: ['先记下来'],
          bannedPhrases: ['随便啦'],
        },
        personalityTags: ['克制', '执着'],
      },
      {
        id: 'he',
        name: '何烬',
        role: '线人',
        lookAnchor: {
          silhouette: '高瘦连帽衫',
          palette: ['#1B1B1E', '#E07A5F'],
          keyProps: ['旧怀表'],
        },
        speechStyle: {
          tone: '谨慎',
          catchphrases: ['你没听我说过'],
          bannedPhrases: ['我全知道'],
        },
        personalityTags: ['多疑', '敏锐'],
      },
    ],
  })

  console.log('\n[1/3] Story bible generated')
  console.log('- series:', bibleResult.seriesPath)
  console.log('- style-guide:', bibleResult.styleGuidePath)
  console.log('- characters:', bibleResult.characterPaths.join(', '))

  const storyboardResult = await generateStoryboard({
    baseDir: sandboxBaseDir,
    episodeId: 'ep-001',
    title: '雨夜失踪案',
    panelTarget: 10,
    scenes: [
      {
        sceneId: 'scene-001',
        location: '旧城区巷口',
        summary: '林岚在雨夜追踪失踪者最后出现地点',
        mood: '压抑',
        cast: ['lin'],
      },
      {
        sceneId: 'scene-002',
        location: '废弃钟表店',
        summary: '何烬交付线索后突然失联',
        mood: '紧张',
        cast: ['lin', 'he'],
      },
    ],
    stylePreset: 'neo-noir',
  })

  console.log('\n[2/3] Storyboard generated')
  console.log('- storyboard:', storyboardResult.storyboardPath)
  console.log('- shotCount:', storyboardResult.shotCount)

  const exportJson = await exportEpisode(
    {
      episodeId: 'ep-001',
      format: 'json',
      includeDialogue: true,
      includePrompts: true,
    },
    sandboxBaseDir,
  )
  const exportMd = await exportEpisode(
    {
      episodeId: 'ep-001',
      format: 'md',
      includeDialogue: true,
      includePrompts: true,
    },
    sandboxBaseDir,
  )
  const exportCsv = await exportEpisode(
    {
      episodeId: 'ep-001',
      format: 'csv',
      includeDialogue: true,
      includePrompts: true,
    },
    sandboxBaseDir,
  )

  console.log('\n[3/3] Exports generated')
  console.log('- json:', exportJson.outputPath)
  console.log('- md:', exportMd.outputPath)
  console.log('- csv:', exportCsv.outputPath)

  console.log('\n=== Manga smoke test done ===')
}

main().catch(error => {
  console.error('\nSmoke test failed:')
  console.error(error)
  process.exitCode = 1
})
