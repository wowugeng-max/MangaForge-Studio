import { createOrUpdateStoryBible } from '../../../restored-src/src/manga/services/bibleService.js'

const DEFAULT_SERIES = {
  seriesTitle: '夜雨巷',
  genre: '都市悬疑',
  tone: '冷色、克制',
  themes: ['真相', '记忆', '信任'],
  targetAudience: '青年向',
}

const DEFAULT_CHARACTERS = [
  {
    id: 'lin',
    name: '林岚',
    role: '主角记者',
    lookAnchor: { silhouette: '短发风衣', palette: ['#2B2D42'], keyProps: ['录音笔'] },
    speechStyle: { tone: '冷静', catchphrases: ['先记下来'], bannedPhrases: ['随便啦'] },
  },
]

export async function runInit(activeWorkspace: string) {
  return createOrUpdateStoryBible({
    baseDir: activeWorkspace,
    ...DEFAULT_SERIES,
    characters: DEFAULT_CHARACTERS,
  })
}
