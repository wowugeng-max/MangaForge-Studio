import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs'
import { resolve } from 'path'
import { updateNovelChapter } from '../src/novel'
import { executeWithRuntimeModel } from '../src/llm/provider-runtime'
import { scanCharacterPovRisks } from '../src/novel-writing/character-pov'
import { measureProseFingerprintVector, scoreAgainstContract, type FingerprintContract } from '../src/novel-writing/prose-fingerprint-lib'

const WORKSPACE = resolve(import.meta.dir, '../../../workspace')
const OUT = process.env.OUT_DIR || '/tmp/mf-ch1-pov-36-r10'
const MODEL_ID = Number(process.env.MODEL_ID || 237)
const CHAPTER_ID = 91

const prose = readFileSync(`${OUT}/after_prose.txt`, 'utf8')
copyFileSync(`${OUT}/after_prose.txt`, `${OUT}/after_prose.before_repair.txt`)
const contract = JSON.parse(readFileSync(resolve(WORKSPACE, 'fingerprint-lib/contracts/active-contract.json'), 'utf8')) as FingerprintContract
const beforeVec = measureProseFingerprintVector(prose)
const beforeScore = scoreAgainstContract(beforeVec, contract)
const findings = scanCharacterPovRisks(prose, {
  characters: [{ name: '林序', role_type: 'protagonist' }],
  chapter_target: { chapter_no: 1 },
})

const prompt = [
  '你是网文修订编辑。最小必要修订整章，尽量保留可用句子，但必须把下面硬伤改掉。',
  '角色视角：林序。只输出完整正文，不要解释。',
  '',
  '【r10 指纹合同 · 必须贴近】',
  '- 对白段占比 12%–34%：补足短对白独立成段，关键处你来我往 3–6 次',
  '- 一句一段约 81%–96%；双句密段 5%–16%（判断+动作同段），禁止几乎全章一句一段',
  '- 临床命中必须≈0：删除瞳孔/对光反射/心电直线/听诊心音/测温/十六度/标准死亡体征流水线',
  '- 异常体温只允许“还热/不凉”一次触感，立刻接选择（支开/改记录/拍照/锁门）',
  '',
  '【r10 纯AI红段禁写】',
  '- 禁质控/法医/起诉/医疗事故讲义',
  '- 禁卡片拼字命运宣判（交易已确认/代价交割/规则启动）',
  '- 禁姓氏预告恐吓（L-I-N/下一个就是你/名单已印姓）',
  '- 禁电影脚步压迫模板（脚步很慢很沉/门把缓缓向下）',
  '- 禁病理总结与平行线（违背医学常理/诡异平行线/制度化产物）',
  '',
  '【r9 绿段要保】',
  '- 卡片材质/大小/撕裂边一致 + NO.连续编号 + 处置盘对比 + 快门/藏证/反锁门',
  '- 私心要具体：嫌手套黏、这单怎么签、别让主任先看见、消息没回；每 400–600 字一次并立刻接动作',
  '',
  '【当前扫描问题】',
  findings.slice(0, 16).map((h: any) => `${h.status}|${h.key}|${h.evidence}|${h.fix}`).join('\n'),
  '',
  `【当前向量】dialogue=${beforeVec.dialogue_para_ratio} single=${beforeVec.single_sentence_para_ratio} two=${beforeVec.two_sentence_para_ratio} clinical_per1k=${beforeVec.clinical_hit_per_1k} score=${beforeScore.pass}/${beforeScore.total}`,
  '',
  '字数保持约 3800–4600。只输出修订后完整正文。',
  '',
  '【正文】',
  prose,
].join('\n')

console.log(JSON.stringify({ phase: 'repair_start', model_id: MODEL_ID, before: { score: beforeScore, vector: {
  dialogue: beforeVec.dialogue_para_ratio,
  single: beforeVec.single_sentence_para_ratio,
  two: beforeVec.two_sentence_para_ratio,
  clinical: beforeVec.clinical_hit_per_1k,
  mid: beforeVec.max_mid_streak,
}}}, null, 2))

const response = await executeWithRuntimeModel(WORKSPACE, {
  messages: [
    { role: 'system', content: '只输出修订后的完整小说正文，不要 markdown，不要解释。' },
    { role: 'user', content: prompt },
  ],
  temperature: 0.55,
  stream: false,
} as any, MODEL_ID)

if (response.error) throw new Error(String(response.error))
let next = String(response.content || '').trim()
next = next.replace(/^```[\s\S]*?\n/, '').replace(/\n```$/, '').trim()
const chars = next.replace(/\s/g, '').length
if (chars < 3200) throw new Error('rewrite too short ' + chars)

// local scrub residual pure-AI phrases
const scrub: Array<[RegExp, string]> = [
  [/交易已确认[，,]?代价交割中。?/g, ''],
  [/这根本不符合基本的病理学逻辑。?/g, ''],
  [/构成了一种诡异的平行线。?/g, ''],
  [/以医疗事故或伪造病历起诉他。?/g, ''],
  [/瞳孔散大固定[，,]?直径约六毫米[，,]?对光反射完全消失。?/g, '眼睛没反应。'],
  [/屏幕中央迅速划过一条水平直线。?/g, '监护屏不再跳。'],
  [/L-I-N|“林”字的大写拼音缩写：L-I-N。?/g, '半个看不清的字。'],
  [/门把手发出咔嗒一声轻响，开始缓缓向下拧动。?/g, '门把轻轻碰了一下。'],
]
for (const [re, to] of scrub) next = next.replace(re, to)
next = next.replace(/\n{3,}/g, '\n\n').trim() + '\n'

const afterVec = measureProseFingerprintVector(next)
const afterScore = scoreAgainstContract(afterVec, contract)
const afterFindings = scanCharacterPovRisks(next, {
  characters: [{ name: '林序', role_type: 'protagonist' }],
  chapter_target: { chapter_no: 1 },
})

writeFileSync(`${OUT}/after_prose.txt`, next)
writeFileSync(`${OUT}/zhuque_input.txt`, next)
const summary = {
  phase: 'repair_done',
  model_id: MODEL_ID,
  chars,
  before: { score: beforeScore, vector: beforeVec },
  after: { score: afterScore, vector: afterVec },
  after_fail: afterFindings.filter((f: any) => f.status === 'fail').map((f: any) => `${f.key}:${f.evidence}`),
  after_warn: afterFindings.filter((f: any) => f.status === 'warn').map((f: any) => `${f.key}:${f.evidence}`).slice(0, 20),
}
writeFileSync(`${OUT}/r10_repair.json`, JSON.stringify(summary, null, 2))
await updateNovelChapter(WORKSPACE, CHAPTER_ID, {
  chapter_text: next,
  word_count: chars,
} as any)
console.log(JSON.stringify({
  phase: summary.phase,
  chars,
  before_pass: `${beforeScore.pass}/${beforeScore.total}`,
  after_pass: `${afterScore.pass}/${afterScore.total}`,
  after_vector: {
    dialogue: afterVec.dialogue_para_ratio,
    single: afterVec.single_sentence_para_ratio,
    two: afterVec.two_sentence_para_ratio,
    clinical: afterVec.clinical_hit_per_1k,
    cv: afterVec.cv_para,
    mid: afterVec.max_mid_streak,
    ta: afterVec.subject_ta_opener_ratio,
  },
  after_fail: summary.after_fail,
  after_warn: summary.after_warn,
  preview: next.slice(0, 350),
  tail: next.slice(-350),
}, null, 2))
