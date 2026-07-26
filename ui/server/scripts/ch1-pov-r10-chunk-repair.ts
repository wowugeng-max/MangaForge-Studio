import { readFileSync, writeFileSync, copyFileSync } from 'fs'
import { resolve } from 'path'
import { updateNovelChapter } from '../src/novel'
import { executeWithRuntimeModel } from '../src/llm/provider-runtime'
import { scanCharacterPovRisks } from '../src/novel-writing/character-pov'
import { measureProseFingerprintVector, scoreAgainstContract, type FingerprintContract } from '../src/novel-writing/prose-fingerprint-lib'

const WORKSPACE = resolve(import.meta.dir, '../../../workspace')
const OUT = process.env.OUT_DIR || '/tmp/mf-ch1-pov-36-r10'
const MODEL_ID = Number(process.env.MODEL_ID || 237)
const CHAPTER_ID = 91

const base = readFileSync(`${OUT}/after_prose.txt`, 'utf8').trim()
copyFileSync(`${OUT}/after_prose.txt`, `${OUT}/after_prose.before_chunk_repair.txt`)
const parts = base.split(/\n\n+/)
const chunkSize = Math.ceil(parts.length / 3)
const chunks = [0, 1, 2].map((i) => parts.slice(i * chunkSize, (i + 1) * chunkSize).join('\n\n'))

const common = [
  '角色视角：林序。保持剧情与物件线索，最小必要修订。',
  '段形：一句一段为主，约 1/10 段落写成双句密段（判断+动作同段）。',
  '对白：本段若有对话场景，短对白独立成段，你来我往至少 2–4 次。',
  '禁临床流水线：瞳孔/对光反射/心电直线/听诊心音/测温/十六度/标准死亡体征连击。异常体温只写“还热/不凉”一次，立刻接动作。',
  '禁纯AI：质控起诉讲义、卡片拼字宣判、姓氏预告（L-I-N/下一个是你）、电影脚步压迫、病理总结平行线。',
  '优先：卡片材质/大小/撕裂边+NO编号+拍照藏证+锁门；私心半截（手套黏/这单怎么签/别让主任先看见）。',
  '字数约原文 90%-110%。只输出本段修订正文。',
].join('\n')

async function repairChunk(chunk: string, idx: number) {
  const prompt = [`你在修订第${idx + 1}/3段。`, common, '', '【正文片段】', chunk].join('\n')
  const response = await executeWithRuntimeModel(WORKSPACE, {
    messages: [
      { role: 'system', content: '只输出修订后的小说正文片段，不要解释。' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.55,
    stream: false,
  } as any, MODEL_ID)
  if (response.error) throw new Error(String(response.error))
  let out = String(response.content || '').trim().replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '').trim()
  const inChars = chunk.replace(/\s/g, '').length
  const outChars = out.replace(/\s/g, '').length
  console.log(JSON.stringify({ chunk: idx + 1, inChars, outChars }))
  if (outChars < Math.max(250, inChars * 0.55)) {
    console.warn('chunk too short, keep original', idx + 1)
    return chunk
  }
  return out
}

const rewritten: string[] = []
for (let i = 0; i < chunks.length; i++) {
  rewritten.push(await repairChunk(chunks[i], i))
}
let next = rewritten.join('\n\n').trim() + '\n'

// local scrub residual pure-AI / clinical phrases
const scrub: Array<[RegExp, string]> = [
  [/交易已确认[，,]?代价交割中。?/g, ''],
  [/这根本不符合基本的病理学逻辑。?/g, ''],
  [/构成了一种诡异的平行线。?/g, ''],
  [/以医疗事故或伪造病历起诉他。?/g, ''],
  [/瞳孔散大固定[，,]?[^。！？\n]{0,24}对光反射完全消失。?/g, '眼睛没反应。'],
  [/对光反射完全消失。?/g, ''],
  [/屏幕中央迅速划过一条水平直线。?/g, '监护屏不再跳。'],
  [/心电图拉成直线。?/g, '监护屏不再跳。'],
  [/L-I-N|“林”字的大写拼音缩写：L-I-N。?/g, '半个看不清的字。'],
  [/门把手发出咔嗒一声轻响，开始缓缓向下拧动。?/g, '门把轻轻碰了一下。'],
  [/脚步声极其沉重，一步一步，不急不慢，停在了抢救室的大门外。?/g, '门外有人停了一下。'],
  [/这是极其标准的死亡体征。?/g, '他心里一沉：这单没法按常规交。'],
  [/直径约六毫米。?/g, ''],
  // #60: 左边界排除数字前缀，避免子串命中"三十六度/二十六度"（三+十六度）吞掉整句
  [/(?<![一二三四五六七八九\d])十六度[^。！？\n]{0,20}。?/g, ''],
]
for (const [re, to] of scrub) next = next.replace(re, to)
next = next.replace(/\n{3,}/g, '\n\n').trim() + '\n'

const contract = JSON.parse(readFileSync(resolve(WORKSPACE, 'fingerprint-lib/contracts/active-contract.json'), 'utf8')) as FingerprintContract
const beforeVec = measureProseFingerprintVector(base)
const afterVec = measureProseFingerprintVector(next)
const beforeScore = scoreAgainstContract(beforeVec, contract)
const afterScore = scoreAgainstContract(afterVec, contract)
const afterFindings = scanCharacterPovRisks(next, {
  characters: [{ name: '林序', role_type: 'protagonist' }],
  chapter_target: { chapter_no: 1 },
})
const chars = next.replace(/\s/g, '').length
writeFileSync(`${OUT}/after_prose.txt`, next)
writeFileSync(`${OUT}/zhuque_input.txt`, next)
const summary = {
  phase: 'chunk_repair_done',
  model_id: MODEL_ID,
  chars,
  before: { score: beforeScore, vector: {
    dialogue: beforeVec.dialogue_para_ratio,
    single: beforeVec.single_sentence_para_ratio,
    two: beforeVec.two_sentence_para_ratio,
    clinical: beforeVec.clinical_hit_per_1k,
    cv: beforeVec.cv_para,
    mid: beforeVec.max_mid_streak,
  }},
  after: { score: afterScore, vector: {
    dialogue: afterVec.dialogue_para_ratio,
    single: afterVec.single_sentence_para_ratio,
    two: afterVec.two_sentence_para_ratio,
    clinical: afterVec.clinical_hit_per_1k,
    cv: afterVec.cv_para,
    mid: afterVec.max_mid_streak,
    ta: afterVec.subject_ta_opener_ratio,
  }},
  after_fail: afterFindings.filter((f: any) => f.status === 'fail').map((f: any) => `${f.key}:${f.evidence}`),
  after_warn: afterFindings.filter((f: any) => f.status === 'warn').map((f: any) => `${f.key}:${f.evidence}`).slice(0, 24),
  checks_fail: afterScore.checks.filter((c: any) => !c.ok),
}
writeFileSync(`${OUT}/r10_repair.json`, JSON.stringify({ ...summary, full_after_vector: afterVec, full_after_score: afterScore }, null, 2))
await updateNovelChapter(WORKSPACE, CHAPTER_ID, {
  chapter_text: next,
  word_count: chars,
} as any)
console.log(JSON.stringify({ ...summary, preview: next.slice(0, 280), tail: next.slice(-280) }, null, 2))
