import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { updateNovelChapter } from '../src/novel'
import { executeWithRuntimeModel } from '../src/llm/provider-runtime'
import { scanCharacterPovRisks } from '../src/novel-writing/character-pov'

const WORKSPACE = resolve(import.meta.dir, '../../../workspace')
const OUT = process.env.OUT_DIR || '/tmp/mf-ch1-pov-loop-4'
const MODEL_ID = 217
const CHAPTER_ID = 91

const base = readFileSync('/tmp/mf-ch1-pov-loop-3/after_prose.txt', 'utf8').trim()
const parts = base.split(/\n\n+/)
const chunkSize = Math.ceil(parts.length / 3)
const chunks = [0,1,2].map(i => parts.slice(i*chunkSize, (i+1)*chunkSize).join('\n\n'))

async function humanizeChunk(chunk: string, idx: number) {
  const prompt = [
    `你在修订第${idx+1}/3段小说正文。保持剧情与物件线索，增加人工写作毛刺。`,
    '要求：角色视角林序；一句一段但句长参差；加入半截对白/改口/嫌加班/怕担责；',
    '禁止：这说明/这意味着/这代表着/命运宣判/毫无疑问/深吸一口气/强迫自己冷静/空气里弥漫/一片死寂/眉头紧锁/盘点手机钥匙零钱。',
    '不要扩写超过原文太多，字数约在原文的 90%-110%。只输出修订后正文。',
    '',
    chunk,
  ].join('\n')
  const response = await executeWithRuntimeModel(WORKSPACE, {
    messages: [
      { role: 'system', content: '只输出修订后的小说正文片段。' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.8,
    stream: false,
  } as any, MODEL_ID)
  if (response.error) throw new Error(String(response.error))
  let out = String(response.content || '').trim().replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '').trim()
  if (out.replace(/\s/g, '').length < Math.max(200, chunk.replace(/\s/g, '').length * 0.45)) {
    console.warn('chunk short, keep original', idx, out.replace(/\s/g, '').length)
    return chunk
  }
  return out
}

const rewritten: string[] = []
for (let i = 0; i < chunks.length; i++) {
  console.log('[humanize] chunk', i + 1, 'in', chunks[i].replace(/\s/g, '').length)
  rewritten.push(await humanizeChunk(chunks[i], i))
}
let next = rewritten.join('\n\n') + '\n'
const repls: Array<[RegExp, string]> = [
  [/这说明/g, '他心里一沉，觉得'],
  [/这意味着/g, '他心里一沉，觉得'],
  [/这代表着/g, '他怀疑这是'],
  [/命运的下一次宣判/g, '他还得先把门反锁'],
  [/毫无疑问/g, '他不愿多想'],
  [/深吸一口气/g, '嗓子发紧'],
  [/强迫自己冷静/g, '把话咽回去'],
  [/空气里弥漫着/g, '空气里有'],
  [/一片死寂/g, '什么动静都没有'],
  [/眉头紧锁/g, '下意识揉了下眉心'],
]
for (const [a, b] of repls) next = next.replace(a, b)

const findings = scanCharacterPovRisks(next, {
  characters: [{ name: '林序', role_type: 'protagonist' }],
  chapter_target: { chapter_no: 1, scene_cards: [{ density_level: 'dense' }, { density_level: 'medium' }] },
})
writeFileSync(`${OUT}/after_prose.txt`, next)
writeFileSync(`${OUT}/zhuque_input.txt`, next)
writeFileSync(`${OUT}/humanize_report.json`, JSON.stringify({
  chars: next.replace(/\s/g, '').length,
  hard: findings.filter((f: any) => f.status === 'fail' || f.blocking),
  soft: findings.filter((f: any) => f.status === 'warn'),
  preview: next.slice(0, 500),
  tail: next.slice(-500),
}, null, 2))
await updateNovelChapter(WORKSPACE, CHAPTER_ID, {
  chapter_text: next,
  word_count: next.replace(/\s/g, '').length,
} as any)
console.log(JSON.stringify({
  ok: true,
  chars: next.replace(/\s/g, '').length,
  hard: findings.filter((f: any) => f.status === 'fail' || f.blocking).map((f: any) => f.key + ':' + f.evidence),
  soft: findings.filter((f: any) => f.status === 'warn').map((f: any) => f.key + ':' + f.evidence),
  tail: next.slice(-240),
}, null, 2))
