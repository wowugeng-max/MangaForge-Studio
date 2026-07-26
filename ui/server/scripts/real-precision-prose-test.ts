/**
 * Real Gemini 3.5 Flash precision loop for 4 pain points.
 * Keeps memory low: no full project load, isolated prompt + scoring.
 */
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import {
  buildWritingPrecisionPlan,
  formatWritingPrecisionPrompt,
} from '../src/novel-writing/writing-precision-prompt'
import { buildChapterProgressBudget } from '../src/novel-writing/chapter-progress-budget'
import { countProseChars, evaluateProseWordTarget, resolveChapterWordTarget } from '../src/novel-writing/word-target'
import { scanWebNovelParagraphShapeRisks, scanParagraphWallTextRisks } from '../src/novel-writing/prose-craft-scans'
import { scanBannedWordLeaks } from '../src/novel-writing/deslop-scans'
import { scanToxicAiPatterns } from '../src/novel-writing/toxic-ai-pattern-scans'

const BASE = process.env.GEMINI_BASE_URL || 'http://127.0.0.1:7860/v1'
const KEY = process.env.GEMINI_API_KEY || ''
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash'
const OUT_DIR = process.env.PRECISION_OUT_DIR || '/tmp/mf-precision-prose'
const EXTRA_RULES = process.env.PRECISION_EXTRA_RULES || ''

const wordTarget = resolveChapterWordTarget({}, {}, { word_target_mode: 'standard' })

const fixture = {
  chapter_no: 12,
  title: '电梯里的无脸住户',
  goal: '击破电梯怪谈，救出被困住户，拿到负一层线索',
  conflict: '无脸电梯怪压迫，规则倒计时',
  ending_hook: '电梯停在负一层，门缝里渗出黑水',
  must_advance: ['击破电梯怪谈', '救出被困住户', '拿到负一层线索'],
  summary: '江哲进入故障电梯，用超能力识破无脸住户规则，救出一名被困者，并在章末发现负一层线索。',
  previous_tail: '江哲收起特权卡，走廊应急灯闪了两下。他听见电梯井里传来细碎摩擦声，像指甲刮金属。',
  future_forbidden: ['物业下发清理通知', '召开业主大会', '1号楼血肉王座终局对决'],
  scene_cards: [
    { scene_no: 1, title: '进电梯', goal: '进入故障电梯并触发规则提示', word_budget: 760 },
    { scene_no: 2, title: '对峙无脸', goal: '识破无脸住户规则并反击', word_budget: 2300 },
    { scene_no: 3, title: '救出与负一层', goal: '救出被困者并发现负一层线索', word_budget: 1140 },
  ],
}

function buildPrompt() {
  const plan = buildWritingPrecisionPlan({
    contextPackage: {
      chapter_target: {
        chapter_no: fixture.chapter_no,
        title: fixture.title,
        goal: fixture.goal,
        summary: fixture.summary,
        conflict: fixture.conflict,
        ending_hook: fixture.ending_hook,
        must_advance: fixture.must_advance,
        word_target: wordTarget,
        scene_cards: fixture.scene_cards,
      },
      runtime_model: {
        model_name: MODEL,
        provider_id: /gemini|google/i.test(MODEL) ? 'gemini' : undefined,
      },
      future_chapters: [
        {
          chapter_no: 13,
          chapter_goal: '物业下发清理通知，召开业主大会',
          conflict: '物业合规清理',
          raw_payload: { must_advance: ['物业下发清理通知', '召开业主大会'] },
        },
        {
          chapter_no: 20,
          chapter_goal: '1号楼血肉王座终局对决',
          conflict: '终局对决',
        },
      ],
    },
    chapterDraft: {
      chapter_no: fixture.chapter_no,
      title: fixture.title,
      chapter_goal: fixture.goal,
      conflict: fixture.conflict,
      ending_hook: fixture.ending_hook,
      must_advance: fixture.must_advance,
    },
    wordTarget,
  })

  return [
    '你是中文网文作者。只输出正文，不要解释、不要JSON、不要标题外的元信息。',
    `写第${fixture.chapter_no}章《${fixture.title}》。`,
    `章节目标：${fixture.goal}`,
    `冲突：${fixture.conflict}`,
    `章末钩子：${fixture.ending_hook}`,
    `必须交付：${fixture.must_advance.join('｜')}`,
    `上一章尾段承接：${fixture.previous_tail}`,
    `禁止提前结算：${fixture.future_forbidden.join('｜')}`,
    `场景卡：${JSON.stringify(fixture.scene_cards)}`,
    ...formatWritingPrecisionPrompt(plan),
    EXTRA_RULES ? `【本轮加严规则】\n${EXTRA_RULES}` : '',
    '输出格式：',
    `第${fixture.chapter_no}章 ${fixture.title}`,
    '然后直接写正文。一句一段，对话独立成段。',
    '最终正文去掉空白后必须落在 3780-4620 字；若写完不够，继续补当前场景动作回合，禁止提前完结。',
    '禁止：淡淡/冰冷/缓缓/仿佛/没有A没有B没有C/……/——/这就是线索。',
  ].filter(Boolean).join('\n')
}

function extractProse(raw: string) {
  let text = String(raw || '').replace(/\r/g, '').trim()
  text = text.replace(/^```(?:text|markdown)?\n?/i, '').replace(/\n?```$/i, '').trim()
  return text
}

function scoreProse(prose: string) {
  const chars = countProseChars(prose)
  const word = evaluateProseWordTarget(prose, wordTarget)
  const progress = buildChapterProgressBudget({
    chapterText: prose,
    currentChapter: {
      chapter_no: fixture.chapter_no,
      chapter_goal: fixture.goal,
      conflict: fixture.conflict,
      ending_hook: fixture.ending_hook,
      raw_payload: { must_advance: fixture.must_advance },
    },
    futureChapters: [
      {
        chapter_no: 13,
        chapter_goal: '物业下发清理通知，召开业主大会',
        raw_payload: { must_advance: ['物业下发清理通知', '召开业主大会'] },
      },
      {
        chapter_no: 20,
        chapter_goal: '1号楼血肉王座终局对决',
      },
    ],
  })
  const para = scanWebNovelParagraphShapeRisks(prose)
  const walls = scanParagraphWallTextRisks(prose)
  const banned = scanBannedWordLeaks(prose)
  const toxic = scanToxicAiPatterns(prose)

  const lines = prose.split(/\n/).map(l => l.trim()).filter(Boolean)
  const bodyLines = lines.filter(l => !/^第\d+章/.test(l))
  const singleSentenceRatio = bodyLines.length
    ? bodyLines.filter(l => (l.match(/[。！？!?]/g) || []).length <= 1).length / bodyLines.length
    : 0

  const futureHits = fixture.future_forbidden.filter(item => prose.includes(item) || prose.includes(item.slice(0, 6)))
  const deliverHits = fixture.must_advance.filter(item => {
    return prose.includes(item) || (
      (item.includes('电梯') && /电梯/.test(prose))
      && (
        (item.includes('击破') && /击破|识破|破除|反杀|压住|反制|无效/.test(prose))
        || (item.includes('救出') && /救出|拖出|拉开|带出|扶出|抱出/.test(prose))
        || (item.includes('负一') && /负一|B1|地下/.test(prose))
      )
    )
  })

  const scores = {
    word_count: chars,
    word_pass: word.passed,
    word_target: word,
    progress_overrun: progress.overrun || futureHits.length > 0,
    progress_underrun: progress.underrun,
    progress_pass: !progress.overrun && !progress.underrun && futureHits.length === 0 && deliverHits.length >= 2,
    deliver_hits: deliverHits,
    future_hits: futureHits,
    paragraph_shape_hits: para.length + walls.length,
    single_sentence_ratio: Number(singleSentenceRatio.toFixed(3)),
    paragraph_pass: singleSentenceRatio >= 0.72 && para.filter((i: any) => i.status === 'fail').length === 0 && walls.length <= 1,
    deai_hits: [
      ...banned.filter((i: any) => i.status === 'fail' || i.status === 'warn').map((i: any) => i.pattern || i.key || i.label),
      ...toxic.map((i: any) => i.key || i.label),
    ],
    deai_pass: banned.filter((i: any) => i.status === 'fail').length === 0 && toxic.filter((i: any) => i.severity === 'blocking' || i.status === 'fail').length === 0,
  }

  const passCount = [scores.word_pass, scores.progress_pass, scores.paragraph_pass, scores.deai_pass].filter(Boolean).length
  return {
    ...scores,
    pass_count: passCount,
    overall_pass: passCount === 4,
    progress_summary: progress.summary,
    banned_sample: banned.slice(0, 5),
    toxic_sample: toxic.slice(0, 5),
    para_sample: [...para, ...walls].slice(0, 5),
  }
}

async function callGemini(prompt: string) {
  const started = Date.now()
  const memBefore = process.memoryUsage()
  const res = await fetch(`${BASE.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.7,
      max_tokens: 24000,
      messages: [
        { role: 'system', content: '你是专业中文网文作者，严格按用户约束写正文。' },
        { role: 'user', content: prompt },
      ],
    }),
  })
  const raw = await res.text()
  const memAfter = process.memoryUsage()
  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}: ${raw.slice(0, 500)}`)
  }
  let data: any
  try { data = JSON.parse(raw) } catch {
    throw new Error(`Non-JSON response: ${raw.slice(0, 300)}`)
  }
  const content = data?.choices?.[0]?.message?.content
    || data?.choices?.[0]?.text
    || data?.content
    || ''
  return {
    content: String(content || ''),
    latency_ms: Date.now() - started,
    usage: data?.usage || null,
    mem: {
      before_rss_mb: Math.round(memBefore.rss / 1024 / 1024),
      after_rss_mb: Math.round(memAfter.rss / 1024 / 1024),
      delta_rss_mb: Math.round((memAfter.rss - memBefore.rss) / 1024 / 1024),
      after_heap_mb: Math.round(memAfter.heapUsed / 1024 / 1024),
    },
  }
}

async function main() {
  if (!KEY) throw new Error('GEMINI_API_KEY missing')
  mkdirSync(OUT_DIR, { recursive: true })
  const prompt = buildPrompt()
  writeFileSync(join(OUT_DIR, 'prompt.txt'), prompt)
  console.log(JSON.stringify({
    phase: 'start',
    model: MODEL,
    prompt_chars: prompt.length,
    word_target: wordTarget,
    rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  }, null, 2))

  const result = await callGemini(prompt)
  const prose = extractProse(result.content)
  writeFileSync(join(OUT_DIR, 'raw.txt'), result.content)
  writeFileSync(join(OUT_DIR, 'prose.txt'), prose)
  const scored = scoreProse(prose)
  const report = {
    model: MODEL,
    latency_ms: result.latency_ms,
    usage: result.usage,
    mem: result.mem,
    prompt_chars: prompt.length,
    prose_preview: prose.slice(0, 400),
    score: scored,
  }
  writeFileSync(join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  if (!scored.overall_pass) process.exitCode = 2
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
