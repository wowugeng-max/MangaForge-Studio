import { mkdir } from 'fs/promises'
import { join } from 'path'
import { createOrUpdateStoryBible } from '../src/manga/services/bibleService.js'

const workspace = join(process.cwd(), '.smoke-workspace')

async function main() {
  await mkdir(workspace, { recursive: true })

  const result = await createOrUpdateStoryBible({
    baseDir: workspace,
    seriesTitle: '夜雨巷',
    genre: '都市悬疑',
    tone: '冷色、克制',
    themes: ['真相', '记忆', '信任'],
    targetAudience: '青年向',
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
      },
    ],
  })

  console.log('Manga init done')
  console.log('Workspace:', workspace)
  console.log('Series:', result.seriesPath)
}

main().catch(err => {
  console.error(err)
  process.exitCode = 1
})
