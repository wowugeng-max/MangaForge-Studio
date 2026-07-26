/**
 * Optimize Ch1 from Round3 baseline (0 pure-AI segments).
 * Avoid Round4 forced-slang packing which reintroduced AI segments.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { listNovelChapters, updateNovelChapter } from '../src/novel'
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

const basePath = process.env.BASE_PROSE || '/tmp/mf-ch1-pov-loop-3/after_prose.txt'
let base = readFileSync(basePath, 'utf8')
base = sanitizeCharacterPovAntiAiStock(base)
writeFileSync(`${OUT}/before_prose.txt`, base)

const prompt = [
  '你是网文修订编辑。以下是已经较优的第一章正文（朱雀实测：纯AI段接近0，但仍疑似AI）。',
  '请做“Round3 风格精修”，目标：在不毁掉现有优势的前提下，提高人味、降低病历报告感。',
  '',
  '必须保留：',
  '1) 林序深有限视角',
  '2) 一句一段',
  '3) 核心剧情：温尸异常 → 名单/缩写线索 → 改记录/藏证据/支开人 → 章末可见动作',
  '4) 章末必须是具体动作（锁门/改记录/决定天亮前烧掉证据），禁止命运宣判与比喻升华',
  '',
  '必须改掉/弱化：',
  '1) 遗物盘点流水线（手机钥匙零钱逐项列）→ 只抓最在意的名单/符号证据',
  '2) 临床连击（瞳孔+心电图+测温全上）→ 最多一次检查就接私心选择',
  '3) 硬堆口语包装（这该死/扯着尖儿/冰窟窿/刀子视线）→ 不要写',
  '4) 这说明/这意味着/毫无疑问/深吸一口气/强迫自己冷静/一片死寂/眉头紧锁',
  '',
  '允许增加的轻量人味（服务剧情，不要段子化）：',
  '- 半截对白与改口',
  '- 嫌麻烦/怕担责/想甩锅的半拍耽误',
  '- 咖啡凉了、肩酸等无关紧要的身体烦心事（点到即止）',
  '- 句长参差：有极短句，也有稍长的口语杂质句',
  '',
  '字数 3780-4620。只输出完整正文。',
  '',
  '【原文】',
  base,
].join('\n')

const response = await executeWithRuntimeModel(WORKSPACE, {
  messages: [
    { role: 'system', content: '只输出可直接入库的完整小说正文。' },
    { role: 'user', content: prompt },
  ],
  temperature: 0.72,
  stream: false,
} as any, MODEL_ID)

if (response.error) throw new Error(String(response.error))
let next = String(response.content || '').trim()
next = next.replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '').trim()
next = sanitizeCharacterPovAntiAiStock(next)
if (!next.endsWith('\n')) next += '\n'

const chars = countProseChars(next)
if (chars < 3200) throw new Error(`too short: ${chars}`)

const findings = scanCharacterPovRisks(next, {
  characters: [{ name: '林序', role_type: 'protagonist' }],
  chapter_target: {
    chapter_no: 1,
    scene_cards: [{ density_level: 'dense' }, { density_level: 'medium' }],
  },
})
const hard = findings.filter((f: any) => f.status === 'fail' || f.blocking)
const soft = findings.filter((f: any) => f.status === 'warn')

// if hard remains, try one more sanitize-only fail
if (hard.length) {
  next = sanitizeCharacterPovAntiAiStock(next)
}

writeFileSync(`${OUT}/after_prose.txt`, next)
writeFileSync(`${OUT}/zhuque_input.txt`, next)
writeFileSync(`${OUT}/report.json`, JSON.stringify({
  chars,
  hard,
  soft,
  preview: next.slice(0, 500),
  tail: next.slice(-500),
}, null, 2))

await updateNovelChapter(WORKSPACE, CHAPTER_ID, {
  chapter_text: next,
  word_count: chars,
} as any)

console.log(JSON.stringify({
  ok: true,
  chars,
  hard: hard.map((h: any) => `${h.key}:${h.evidence}`),
  soft: soft.map((h: any) => `${h.key}:${h.evidence}`),
  tail: next.slice(-260),
}, null, 2))
