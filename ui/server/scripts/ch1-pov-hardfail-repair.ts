import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { updateNovelChapter } from '../src/novel'
import { executeWithRuntimeModel } from '../src/llm/provider-runtime'
import { scanCharacterPovRisks } from '../src/novel-writing/character-pov'

const WORKSPACE = resolve(import.meta.dir, '../../../workspace')
const CHAPTER_ID = 91
const MODEL_ID = 217
const OUT = process.env.OUT_DIR || '/tmp/mf-ch1-pov-loop-3'

let prose = readFileSync(`${OUT}/after_prose.txt`, 'utf8')
const findings = scanCharacterPovRisks(prose, {
  characters: [{ name: '林序', role_type: 'protagonist' }],
  chapter_target: { chapter_no: 1 },
})
const hard = findings.filter((f: any) => f.status === 'fail' || f.blocking)
const soft = findings.filter((f: any) => f.status === 'warn')

const prompt = [
  '你是网文修订编辑。下面是一整章正文。请做最小必要修订，只改有问题的句子/段落，尽量保留其余原文。',
  '必须删除或改写：这说明/这意味着/这代表着/科学的逻辑/规则已经启动/命运的下一次宣判/等待着命运/他不知道的是',
  '尽量改写（若出现）：一片死寂/眉头紧锁/深吸一口气/强迫自己冷静/空气里弥漫/毫无疑问',
  '保持：角色视角林序、一句一段、剧情与物件线索不变、私心动作（藏证据/改记录/支开人）',
  '只输出完整正文，不要解释。',
  '',
  '【问题】',
  [...hard, ...soft].slice(0, 12).map((h: any) => `${h.key}: ${h.evidence} -> ${h.fix}`).join('\n'),
  '',
  '【正文】',
  prose,
].join('\n')

const response = await executeWithRuntimeModel(WORKSPACE, {
  messages: [
    { role: 'system', content: '只输出修订后的完整小说正文。' },
    { role: 'user', content: prompt },
  ],
  temperature: 0.55,
  stream: false,
} as any, MODEL_ID)
if (response.error) throw new Error(String(response.error))
let next = String(response.content || '').trim()
next = next.replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '').trim()
if (next.replace(/\s/g, '').length < 3000) throw new Error('rewrite too short ' + next.replace(/\s/g, '').length)

const afterFindings = scanCharacterPovRisks(next, {
  characters: [{ name: '林序', role_type: 'protagonist' }],
  chapter_target: { chapter_no: 1 },
})
writeFileSync(`${OUT}/after_prose.txt`, next.endsWith('\n') ? next : next + '\n')
writeFileSync(`${OUT}/zhuque_input.txt`, next.endsWith('\n') ? next : next + '\n')
writeFileSync(`${OUT}/hardfail_repair.json`, JSON.stringify({
  before_hard: hard,
  after_hard: afterFindings.filter((f: any) => f.status === 'fail' || f.blocking),
  after_soft: afterFindings.filter((f: any) => f.status === 'warn'),
  chars: next.replace(/\s/g, '').length,
}, null, 2))
await updateNovelChapter(WORKSPACE, CHAPTER_ID, {
  chapter_text: next.endsWith('\n') ? next : next + '\n',
  word_count: next.replace(/\s/g, '').length,
} as any)
console.log(JSON.stringify({
  ok: true,
  chars: next.replace(/\s/g, '').length,
  before_hard: hard.map((h: any) => h.key + ':' + h.evidence),
  after_hard: afterFindings.filter((f: any) => f.status === 'fail' || f.blocking).map((h: any) => h.key + ':' + h.evidence),
  after_soft: afterFindings.filter((f: any) => f.status === 'warn').map((h: any) => h.key + ':' + h.evidence),
}, null, 2))
