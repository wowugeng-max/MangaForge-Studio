import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { listNovelChapters, updateNovelChapter } from '../src/novel'
import { executeWithRuntimeModel } from '../src/llm/provider-runtime'
import { scanCharacterPovRisks } from '../src/novel-writing/character-pov'

const WORKSPACE = resolve(import.meta.dir, '../../../workspace')
const PROJECT_ID = 4
const CHAPTER_ID = 91
const MODEL_ID = 217
const OUT = process.env.OUT_DIR || '/tmp/mf-ch1-pov-loop-2'

const prose0 = readFileSync(`${OUT}/after_prose.txt`, 'utf8')
const parts = prose0.trimEnd().split(/\n\n+/)
const keepN = Math.max(8, parts.length - 8)
const head = parts.slice(0, keepN).join('\n\n')
const tail = parts.slice(keepN).join('\n\n')

const findings = scanCharacterPovRisks(prose0, {
  characters: [{ name: '林序', role_type: 'protagonist' }],
  chapter_target: {
    chapter_no: 1,
    goal: '确认带温尸体并藏名单',
    scene_cards: [{ density_level: 'dense' }, { density_level: 'medium' }],
  },
})
const hard = findings.filter((f: any) => f.status === 'fail' || f.blocking)

const prompt = [
  '你是网文修订编辑。只重写【待改尾段】，保留上文信息与角色视角（林序深有限第三人称）。',
  '硬约束：',
  '1) 禁止：这意味着/这说明/规则已经启动/命运的下一次宣判/静静地等待着/更大的风暴/空气里弥漫/无法形容的压迫感',
  '2) 章末必须落到林序可见动作：例如把纸条藏进抽屉、把门锁死、改死亡记录措辞、决定天亮前先去哪，不要作者宣判命运',
  '3) 情绪来自怕担责/想甩锅/嫌麻烦/怕名单指向自己，用动作与对白半拍耽误交付',
  '4) 一句一段；不要标题；不要解释你在修订；只输出修订后的尾段正文',
  `5) 尾段字数大约 ${Math.max(280, Math.min(900, tail.replace(/\s/g, '').length))} 字`,
  '',
  '【上文末截】',
  head.slice(-700),
  '',
  '【待改尾段】',
  tail,
  '',
  '【扫描问题】',
  hard.map((h: any) => `${h.key}: ${h.evidence} -> ${h.fix}`).join('\n') || '章末作者宣判/解释腔',
].join('\n')

const response = await executeWithRuntimeModel(WORKSPACE, {
  messages: [
    { role: 'system', content: '只输出可直接粘贴的小说正文尾段。' },
    { role: 'user', content: prompt },
  ],
  temperature: 0.7,
  stream: false,
} as any, MODEL_ID)

if (response.error) throw new Error(String(response.error))
let rewritten = String(response.content || '').trim()
rewritten = rewritten.replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '').trim()
if (rewritten.length < 80) throw new Error('rewrite too short: ' + rewritten)

const next = `${head}\n\n${rewritten}\n`
const afterFindings = scanCharacterPovRisks(next, {
  characters: [{ name: '林序', role_type: 'protagonist' }],
  chapter_target: { chapter_no: 1 },
})
const afterHard = afterFindings.filter((f: any) => f.status === 'fail' || f.blocking)
writeFileSync(`${OUT}/after_prose.txt`, next)
writeFileSync(`${OUT}/ending_repair.json`, JSON.stringify({
  before_tail: tail,
  after_tail: rewritten,
  before_hard: hard,
  after_hard: afterHard,
  chars: next.replace(/\s/g, '').length,
}, null, 2))
writeFileSync(`${OUT}/zhuque_input.txt`, next)

const chapters = await listNovelChapters(WORKSPACE, PROJECT_ID)
const ch = chapters.find((c: any) => c.id === CHAPTER_ID)
if (!ch) throw new Error('chapter missing')
await updateNovelChapter(WORKSPACE, CHAPTER_ID, {
  chapter_text: next,
  word_count: next.replace(/\s/g, '').length,
} as any)

console.log(JSON.stringify({
  ok: true,
  chars: next.replace(/\s/g, '').length,
  before_hard: hard.map((h: any) => `${h.key}:${h.evidence}`),
  after_hard: afterHard.map((h: any) => `${h.key}:${h.evidence}`),
  soft_after: afterFindings.filter((f: any) => f.status === 'warn').map((h: any) => `${h.key}:${h.evidence}`),
  tail: rewritten.slice(-260),
}, null, 2))
