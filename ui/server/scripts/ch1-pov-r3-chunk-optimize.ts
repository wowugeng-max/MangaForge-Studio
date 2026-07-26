import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { updateNovelChapter } from '../src/novel'
import { executeWithRuntimeModel } from '../src/llm/provider-runtime'
import {
  sanitizeCharacterPovAntiAiStock,
  scanCharacterPovRisks,
} from '../src/novel-writing/character-pov'
import { countProseChars } from '../src/novel-writing/word-target'

const WORKSPACE = resolve(import.meta.dir, '../../../workspace')
const CHAPTER_ID = 91
const MODEL_ID = 217
const OUT = process.env.OUT_DIR || '/tmp/mf-ch1-pov-loop-5'
mkdirSync(OUT, { recursive: true })

const base = sanitizeCharacterPovAntiAiStock(readFileSync('/tmp/mf-ch1-pov-loop-3/after_prose.txt', 'utf8').trim())
writeFileSync(`${OUT}/before_prose.txt`, base + '\n')
const parts = base.split(/\n\n+/)
const size = Math.ceil(parts.length / 3)
const chunks = [0, 1, 2].map((i) => parts.slice(i * size, (i + 1) * size).join('\n\n'))

async function optimizeChunk(chunk: string, idx: number) {
  const isLast = idx === 2
  const prompt = [
    `修订第${idx + 1}/3段正文。Round3风格精修：保留剧情与一句一段，弱化病历/盘点腔，增加轻量私心动作。`,
    '禁止：这说明/这意味着/命运宣判/毫无疑问/深吸一口气/强迫自己冷静/一片死寂/眉头紧锁/这该死/扯着尖儿/冰窟窿/刀子视线',
    '禁止把手机钥匙零钱逐项盘点；临床检查不要连击，一次异常后立刻选择。',
    isLast
      ? '本段是章末：必须落到可见动作（改记录/藏证据/锁门/决定天亮前烧掉），禁止比喻升华。'
      : '本段不是章末，不要提前升华。',
    '字数约等于原文的 95%-110%。只输出修订后正文片段。',
    '',
    chunk,
  ].join('\n')
  const response = await executeWithRuntimeModel(WORKSPACE, {
    messages: [
      { role: 'system', content: '只输出修订后的小说正文片段。' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.65,
    stream: false,
  } as any, MODEL_ID)
  if (response.error) throw new Error(String(response.error))
  let out = String(response.content || '').trim().replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '').trim()
  out = sanitizeCharacterPovAntiAiStock(out)
  const minKeep = Math.max(180, Math.floor(countProseChars(chunk) * 0.55))
  if (countProseChars(out) < minKeep) {
    console.warn(`[chunk ${idx + 1}] short ${countProseChars(out)} < ${minKeep}, keep original`)
    return chunk
  }
  return out
}

const rewritten: string[] = []
for (let i = 0; i < chunks.length; i++) {
  console.log(`[chunk ${i + 1}] in=${countProseChars(chunks[i])}`)
  rewritten.push(await optimizeChunk(chunks[i], i))
  console.log(`[chunk ${i + 1}] out=${countProseChars(rewritten[i])}`)
}

let next = rewritten.join('\n\n')
next = sanitizeCharacterPovAntiAiStock(next)
if (!next.endsWith('\n')) next += '\n'
const chars = countProseChars(next)
const findings = scanCharacterPovRisks(next, {
  characters: [{ name: '林序', role_type: 'protagonist' }],
  chapter_target: { chapter_no: 1, scene_cards: [{ density_level: 'dense' }, { density_level: 'medium' }] },
})
const hard = findings.filter((f: any) => f.status === 'fail' || f.blocking)
const soft = findings.filter((f: any) => f.status === 'warn')
writeFileSync(`${OUT}/after_prose.txt`, next)
writeFileSync(`${OUT}/zhuque_input.txt`, next)
writeFileSync(`${OUT}/report.json`, JSON.stringify({ chars, hard, soft, preview: next.slice(0, 450), tail: next.slice(-450) }, null, 2))
await updateNovelChapter(WORKSPACE, CHAPTER_ID, { chapter_text: next, word_count: chars } as any)
console.log(JSON.stringify({
  ok: true,
  chars,
  hard: hard.map((h: any) => `${h.key}:${h.evidence}`),
  soft: soft.map((h: any) => `${h.key}:${h.evidence}`),
  tail: next.slice(-240),
}, null, 2))
