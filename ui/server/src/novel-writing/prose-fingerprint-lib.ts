import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
/**
 * Prose statistical fingerprint library.
 *
 * Legal boundary:
 * - Do NOT bulk-download paid 起点/Qidian full texts.
 * - Ingest only: user-provided samples, free chapters the user legally owns, or open research corpora.
 * - Ranking pages may contribute metadata only (title/rank/genre), never full paid chapter bodies.
 */

export type FingerprintLabel = 'human_webnovel' | 'ai_suspect' | 'ai_pure' | 'mixed' | 'unknown'

export type ProseFingerprintVector = {
  version: 1
  char_count: number
  para_count: number
  mean_para_chars: number
  stdev_para_chars: number
  cv_para: number
  short_ratio: number
  mid_ratio: number
  long_ratio: number
  max_short_streak: number
  max_mid_streak: number
  max_long_streak: number
  single_sentence_para_ratio: number
  two_sentence_para_ratio: number
  multi_sentence_para_ratio: number
  dialogue_para_ratio: number
  mean_sentence_chars: number
  stdev_sentence_chars: number
  cv_sentence: number
  subject_ta_opener_ratio: number
  top_opener_share: number
  comma_per_100_chars: number
  exclaim_per_100_chars: number
  ellipsis_per_100_chars: number
  template_contrast_per_1k: number
  stock_adverb_per_1k: number
  clinical_hit_per_1k: number
  type_token_bigram: number
  unique_char_ratio: number
}

export type FingerprintSample = {
  id: string
  label: FingerprintLabel
  source: string
  title?: string
  genre?: string
  notes?: string
  created_at: string
  text_chars: number
  vector: ProseFingerprintVector
  /** optional raw text path relative to workspace */
  text_path?: string
}

export type ZhuqueNarrativeHardGate = {
  /** Pure-AI / resistance family keys that must be zero (hard fail if any hit). */
  zero_family_keys: string[]
  /** Human-readable bans for model prompt (generation-time). */
  bans: string[]
  /** Required texture deliveries (generation-time). */
  must_deliver: string[]
}

export type FingerprintContract = {
  version: 1
  name: string
  built_from: string[]
  target: {
    cv_para: [number, number]
    single_sentence_para_ratio: [number, number]
    two_sentence_para_ratio: [number, number]
    dialogue_para_ratio: [number, number]
    max_mid_streak_max: number
    template_contrast_per_1k_max: number
    stock_adverb_per_1k_max: number
    clinical_hit_per_1k_max: number
    subject_ta_opener_ratio_max: number
  }
  avoid: string[]
  prefer: string[]
  prompt_directives: string[]
  /** Zhuque narrative mode hard gates (system-level; not statistical shape). */
  narrative_hard?: ZhuqueNarrativeHardGate
}

function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function mean(nums: number[]) {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function pstdev(nums: number[]) {
  if (!nums.length) return 0
  const m = mean(nums)
  const v = nums.reduce((a, b) => a + (b - m) * (b - m), 0) / nums.length
  return Math.sqrt(v)
}

function bandOf(n: number): 'S' | 'M' | 'L' {
  if (n <= 8) return 'S'
  if (n <= 25) return 'M'
  return 'L'
}

function splitParas(text: string) {
  return String(text || '')
    .replace(/\r/g, '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function sentenceLens(para: string) {
  const parts = para.match(/[^。！？!?]+[。！？!?]?/g) || [para]
  return parts.map((s) => s.replace(/\s+/g, '').length).filter((n) => n > 0)
}

function countMatches(text: string, re: RegExp) {
  return (text.match(re) || []).length
}

export function measureProseFingerprintVector(text: string): ProseFingerprintVector {
  const body = String(text || '').replace(/\r/g, '')
  const paras = splitParas(body)
  const plain = body.replace(/\s+/g, '')
  const charCount = plain.length
  const lens = paras.map((p) => p.length)
  const m = mean(lens)
  const sd = pstdev(lens)
  const cv = m > 0 ? sd / m : 0
  const bands = lens.map(bandOf)
  let maxS = 0
  let maxM = 0
  let maxL = 0
  let streak = 0
  let prev = ''
  for (const b of bands) {
    if (b === prev) streak += 1
    else {
      streak = 1
      prev = b
    }
    if (b === 'S') maxS = Math.max(maxS, streak)
    if (b === 'M') maxM = Math.max(maxM, streak)
    if (b === 'L') maxL = Math.max(maxL, streak)
  }
  const n = Math.max(1, paras.length)
  const short = bands.filter((b) => b === 'S').length / n
  const mid = bands.filter((b) => b === 'M').length / n
  const long = bands.filter((b) => b === 'L').length / n

  let single = 0
  let two = 0
  let multi = 0
  let dialogue = 0
  let taOpen = 0
  const openers: string[] = []
  const allSentLens: number[] = []
  for (const p of paras) {
    const sents = (p.match(/[^。！？!?]+[。！？!?]/g) || []).filter((s) => s.replace(/\s+/g, '').length >= 2)
    const sc = sents.length || (p ? 1 : 0)
    if (sc <= 1) single += 1
    else if (sc === 2) two += 1
    else multi += 1
    if (/^[“"「]/.test(p)) dialogue += 1
    const opener = p.replace(/^[“"「『]/, '').slice(0, 2)
    openers.push(opener)
    if (/^(他|她|林)/.test(p) || p.startsWith('他') || p.startsWith('她')) taOpen += 1
    allSentLens.push(...sentenceLens(p))
  }
  const openerCounts = new Map<string, number>()
  for (const o of openers) openerCounts.set(o, (openerCounts.get(o) || 0) + 1)
  const topShare = openers.length
    ? Math.max(...Array.from(openerCounts.values())) / openers.length
    : 0

  const sm = mean(allSentLens)
  const ssd = pstdev(allSentLens)
  const per100 = charCount > 0 ? 100 / charCount : 0
  const per1k = charCount > 0 ? 1000 / charCount : 0

  const template = countMatches(body, /不是[^。！？\n]{0,16}，而是|极其(?:稳健|稳定|诡异|规整)|微微(?:鼓起|泛白|一颤)|缓缓|敏锐地注意/g)
  const stock = countMatches(body, /缓缓|微微|不由自主|眉头紧锁|深吸一口气|毫无疑问|空气里弥漫|死一般/g)
  const clinical = countMatches(body, /瞳孔|心电|对光反射|体温枪|尸僵|尸斑|三十六度|测温|教科书/g)

  // bigram type-token
  let bigrams = 0
  const seen = new Set<string>()
  for (let i = 0; i < plain.length - 1; i += 1) {
    const bg = plain.slice(i, i + 2)
    bigrams += 1
    seen.add(bg)
  }
  const uniqueChars = new Set(plain.split('')).size

  return {
    version: 1,
    char_count: charCount,
    para_count: paras.length,
    mean_para_chars: Number(m.toFixed(2)),
    stdev_para_chars: Number(sd.toFixed(2)),
    cv_para: Number(cv.toFixed(3)),
    short_ratio: Number(short.toFixed(3)),
    mid_ratio: Number(mid.toFixed(3)),
    long_ratio: Number(long.toFixed(3)),
    max_short_streak: maxS,
    max_mid_streak: maxM,
    max_long_streak: maxL,
    single_sentence_para_ratio: Number((single / n).toFixed(3)),
    two_sentence_para_ratio: Number((two / n).toFixed(3)),
    multi_sentence_para_ratio: Number((multi / n).toFixed(3)),
    dialogue_para_ratio: Number((dialogue / n).toFixed(3)),
    mean_sentence_chars: Number(sm.toFixed(2)),
    stdev_sentence_chars: Number(ssd.toFixed(2)),
    cv_sentence: Number((sm > 0 ? ssd / sm : 0).toFixed(3)),
    subject_ta_opener_ratio: Number((taOpen / n).toFixed(3)),
    top_opener_share: Number(topShare.toFixed(3)),
    comma_per_100_chars: Number((countMatches(body, /[，,]/g) * per100).toFixed(3)),
    exclaim_per_100_chars: Number((countMatches(body, /[！!]/g) * per100).toFixed(3)),
    ellipsis_per_100_chars: Number((countMatches(body, /…{1,3}|\.{3,}|……/g) * per100).toFixed(3)),
    template_contrast_per_1k: Number((template * per1k).toFixed(3)),
    stock_adverb_per_1k: Number((stock * per1k).toFixed(3)),
    clinical_hit_per_1k: Number((clinical * per1k).toFixed(3)),
    type_token_bigram: Number((bigrams > 0 ? seen.size / bigrams : 0).toFixed(4)),
    unique_char_ratio: Number((charCount > 0 ? uniqueChars / charCount : 0).toFixed(4)),
  }
}

const VECTOR_KEYS: Array<keyof ProseFingerprintVector> = [
  'cv_para',
  'single_sentence_para_ratio',
  'two_sentence_para_ratio',
  'dialogue_para_ratio',
  'max_mid_streak',
  'subject_ta_opener_ratio',
  'top_opener_share',
  'template_contrast_per_1k',
  'stock_adverb_per_1k',
  'clinical_hit_per_1k',
  'type_token_bigram',
  'unique_char_ratio',
  'mean_para_chars',
  'mid_ratio',
  'long_ratio',
]

/** Normalized L1 distance in approximate [0, +inf). Lower = closer. */
export function fingerprintDistance(a: ProseFingerprintVector, b: ProseFingerprintVector) {
  const scales: Partial<Record<keyof ProseFingerprintVector, number>> = {
    cv_para: 1,
    single_sentence_para_ratio: 1,
    two_sentence_para_ratio: 1,
    dialogue_para_ratio: 1,
    max_mid_streak: 10,
    subject_ta_opener_ratio: 1,
    top_opener_share: 1,
    template_contrast_per_1k: 5,
    stock_adverb_per_1k: 5,
    clinical_hit_per_1k: 5,
    type_token_bigram: 1,
    unique_char_ratio: 1,
    mean_para_chars: 40,
    mid_ratio: 1,
    long_ratio: 1,
  }
  let sum = 0
  for (const key of VECTOR_KEYS) {
    const scale = scales[key] || 1
    const av = Number(a[key] || 0)
    const bv = Number(b[key] || 0)
    sum += Math.abs(av - bv) / scale
  }
  return Number((sum / VECTOR_KEYS.length).toFixed(4))
}

export function createFingerprintSample(input: {
  id: string
  label: FingerprintLabel
  source: string
  text: string
  title?: string
  genre?: string
  notes?: string
  text_path?: string
}): FingerprintSample {
  const vector = measureProseFingerprintVector(input.text)
  return {
    id: input.id,
    label: input.label,
    source: input.source,
    title: input.title,
    genre: input.genre,
    notes: input.notes,
    created_at: new Date().toISOString(),
    text_chars: vector.char_count,
    vector,
    text_path: input.text_path,
  }
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  const next = sorted[base + 1]
  if (next === undefined) return sorted[base]
  return sorted[base] + rest * (next - sorted[base])
}

function bandFromSamples(values: number[], pad = 0.05): [number, number] {
  const sorted = [...values].filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
  if (!sorted.length) return [0, 1]
  const lo = quantile(sorted, 0.2)
  const hi = quantile(sorted, 0.8)
  const span = Math.max(0.02, hi - lo)
  return [Number((lo - span * pad).toFixed(3)), Number((hi + span * pad).toFixed(3))]
}

export function buildHumanFingerprintContract(samples: FingerprintSample[], name = 'human_webnovel_default'): FingerprintContract {
  const human = samples.filter((s) => s.label === 'human_webnovel' && s.vector.char_count >= 400)
  const ai = samples.filter((s) => s.label === 'ai_suspect' || s.label === 'ai_pure')
  const pool = human.length ? human : samples
  const vecs = pool.map((s) => s.vector)

  const cv = bandFromSamples(vecs.map((v) => v.cv_para))
  const single = bandFromSamples(vecs.map((v) => v.single_sentence_para_ratio))
  const two = bandFromSamples(vecs.map((v) => v.two_sentence_para_ratio))
  const dialogue = bandFromSamples(vecs.map((v) => v.dialogue_para_ratio))
  const midMax = Math.max(...vecs.map((v) => v.max_mid_streak), 4)
  const templateMax = Math.max(0.2, ...vecs.map((v) => v.template_contrast_per_1k))
  const stockMax = Math.max(0.3, ...vecs.map((v) => v.stock_adverb_per_1k))
  const clinicalMax = Math.max(0, ...vecs.map((v) => v.clinical_hit_per_1k))
  const taMax = Math.max(...vecs.map((v) => v.subject_ta_opener_ratio), 0.25)

  // If we only have AI samples, invert toward less-AI traits observed as risky in Zhuque campaign.
  const aiOnly = !human.length && ai.length > 0
  const target = aiOnly
    ? {
        cv_para: [0.55, 0.95] as [number, number],
        single_sentence_para_ratio: [0.72, 0.9] as [number, number],
        two_sentence_para_ratio: [0.08, 0.22] as [number, number],
        dialogue_para_ratio: [0.08, 0.22] as [number, number],
        max_mid_streak_max: 5,
        template_contrast_per_1k_max: 0.3,
        stock_adverb_per_1k_max: 0.4,
        clinical_hit_per_1k_max: 0,
        subject_ta_opener_ratio_max: 0.22,
      }
    : {
        cv_para: cv,
        single_sentence_para_ratio: single,
        two_sentence_para_ratio: two,
        dialogue_para_ratio: dialogue,
        max_mid_streak_max: Math.min(6, Math.max(4, Math.round(midMax))),
        template_contrast_per_1k_max: Number(Math.min(1, templateMax * 1.2).toFixed(3)),
        stock_adverb_per_1k_max: Number(Math.min(1.5, stockMax * 1.2).toFixed(3)),
        clinical_hit_per_1k_max: Number(Math.min(0.5, clinicalMax).toFixed(3)),
        subject_ta_opener_ratio_max: Number(Math.min(0.35, taMax * 1.1).toFixed(3)),
      }

  return {
    version: 1,
    name,
    built_from: pool.map((s) => s.id),
    target,
    avoid: [
      '临床/尸温/测温教科书腔（会抬朱雀纯AI）',
      '不是A而是B / 极其/微微/缓缓 模板修辞',
      '中句节拍器：连续 ≥6 个中句同带',
      '全章 100% 一句一段匀速且无双句密段',
      '主语姓名流水线过高',
      '多体同构复检/规程辩论/名册对号/电影尾镜（朱雀叙事硬门槛）',
      '未划定区域lore、银行stamp拼接、半科普因果讲义',
    ],
    prefer: [
      '短触感一句一段 + 关键选择双句密段混排',
      '私心噪声不对称（手套黏/消息没回/改口），禁词表轮换',
      '对白短、独立成段',
      '章末可见动作收束，不升华不宣判',
      '当面推责对白 + 物件阻力 + 私心挂动作（朱雀叙事交付）',
    ],
    prompt_directives: [
      `【人工网文指纹合同 · ${name}】`,
      `句长突发 cv 目标 ${target.cv_para[0]}–${target.cv_para[1]}；中句同带连续 ≤${target.max_mid_streak_max}。`,
      `一句一段占比目标 ${target.single_sentence_para_ratio[0]}–${target.single_sentence_para_ratio[1]}；双句密段 ${target.two_sentence_para_ratio[0]}–${target.two_sentence_para_ratio[1]}。`,
      `对白段占比目标 ${target.dialogue_para_ratio[0]}–${target.dialogue_para_ratio[1]}。`,
      `禁临床命中（每千字 ≤${target.clinical_hit_per_1k_max}）；模板对比每千字 ≤${target.template_contrast_per_1k_max}；套话副词每千字 ≤${target.stock_adverb_per_1k_max}。`,
      `他/姓名起句占比 ≤${target.subject_ta_opener_ratio_max}；优先物件/触感/半截对白起句。`,
      human.length
        ? `合同由 ${human.length} 条 human_webnovel 样本拟合。`
        : '当前缺少 human_webnovel 正样本，合同为朱雀战役反推临时目标；请尽快导入合法网文样章校准。',
    ],
    narrative_hard: DEFAULT_ZHUQUE_NARRATIVE_HARD,
  }
}

export function scoreAgainstContract(vector: ProseFingerprintVector, contract: FingerprintContract) {
  const t = contract.target
  const checks = [
    { key: 'cv_para', ok: vector.cv_para >= t.cv_para[0] && vector.cv_para <= t.cv_para[1], value: vector.cv_para, target: t.cv_para },
    {
      key: 'single_sentence_para_ratio',
      ok: vector.single_sentence_para_ratio >= t.single_sentence_para_ratio[0] && vector.single_sentence_para_ratio <= t.single_sentence_para_ratio[1],
      value: vector.single_sentence_para_ratio,
      target: t.single_sentence_para_ratio,
    },
    {
      key: 'two_sentence_para_ratio',
      ok: vector.two_sentence_para_ratio >= t.two_sentence_para_ratio[0] && vector.two_sentence_para_ratio <= t.two_sentence_para_ratio[1],
      value: vector.two_sentence_para_ratio,
      target: t.two_sentence_para_ratio,
    },
    {
      key: 'dialogue_para_ratio',
      ok: vector.dialogue_para_ratio >= t.dialogue_para_ratio[0] && vector.dialogue_para_ratio <= t.dialogue_para_ratio[1],
      value: vector.dialogue_para_ratio,
      target: t.dialogue_para_ratio,
    },
    { key: 'max_mid_streak', ok: vector.max_mid_streak <= t.max_mid_streak_max, value: vector.max_mid_streak, target: t.max_mid_streak_max },
    { key: 'template_contrast_per_1k', ok: vector.template_contrast_per_1k <= t.template_contrast_per_1k_max, value: vector.template_contrast_per_1k, target: t.template_contrast_per_1k_max },
    { key: 'stock_adverb_per_1k', ok: vector.stock_adverb_per_1k <= t.stock_adverb_per_1k_max, value: vector.stock_adverb_per_1k, target: t.stock_adverb_per_1k_max },
    { key: 'clinical_hit_per_1k', ok: vector.clinical_hit_per_1k <= t.clinical_hit_per_1k_max, value: vector.clinical_hit_per_1k, target: t.clinical_hit_per_1k_max },
    { key: 'subject_ta_opener_ratio', ok: vector.subject_ta_opener_ratio <= t.subject_ta_opener_ratio_max, value: vector.subject_ta_opener_ratio, target: t.subject_ta_opener_ratio_max },
  ]
  const pass = checks.filter((c) => c.ok).length
  return {
    score: Number((pass / checks.length).toFixed(3)),
    pass,
    total: checks.length,
    checks,
  }
}


export const DEFAULT_ZHUQUE_NARRATIVE_HARD: ZhuqueNarrativeHardGate = {
  zero_family_keys: [
    'hw_multi_body_same_death',
    'hw_multi_body_same_temp_chain',
    'hw_symmetry_pipeline',
    'hw_procedure_manual',
    'hw_procedure_debate_conflict',
    'hw_ending_procedure_debate',
    'hw_roster_fate',
    'hw_identity_ticket_reveal',
    'hw_self_name_reveal',
    'hw_identity_halfcode_reveal',
    'hw_ending_cinematic_stack',
    'hw_ending_suspense_template',
    'hw_ending_shadow_stretch',
    'hw_cinematic_transition',
    'hw_abandoned_nobody_cares_spam',
    'hw_abandoned_lore',
    'hw_abandoned_space_lore',
    'hw_semi_science_lecture',
    'hw_clinical_cascade_phrase',
    'hw_clinical_lecture_in_dialog',
    'hw_private_noise_bank_overuse',
    'hw_private_noise_bank_cluster',
    'hw_private_noise_bank_hard_stamp',
    'hw_fate_oracle',
    'hw_rule_ledger',
    'hw_ledger_bill_reveal',
  ],
  bans: [
    '多体同构复检（同样的温热/同样的无脉搏/连续两具/三具带温总结）',
    '规程辩论/合规讲义/签字胁迫收束',
    '名册/核销/处方/身份证对号入座',
    '空电梯/负一搁置室/未划定区域lore/铁门电影尾/不疾不徐敲门（电梯通道lore密度也算）',
    '银行stamp拼接（先不写系统/纸页毛刺/把门扣上没再解释——硬stamp零命中）',
    '半科普因果讲义（按理说/按常理体温应降）',
    '临床连击讲义（瞳孔+心电+铁律并列）',
  ],
  must_deliver: [
    '当面短对白推责（独立成段）',
    '物件阻力触感（立刻接选择）',
    '半截私心挂在动作上（硬bank stamp=0；软stamp≤1）',
    '一句一段底色 + 关键处少量双句密段',
    '章末未完成动作收束（禁电影尾镜）',
  ],
}

export function resolveZhuqueNarrativeHard(contract?: FingerprintContract | null): ZhuqueNarrativeHardGate {
  const nh = contract?.narrative_hard
  if (!nh) return DEFAULT_ZHUQUE_NARRATIVE_HARD
  return {
    zero_family_keys: Array.isArray(nh.zero_family_keys) && nh.zero_family_keys.length
      ? nh.zero_family_keys.map(String)
      : DEFAULT_ZHUQUE_NARRATIVE_HARD.zero_family_keys,
    bans: Array.isArray(nh.bans) && nh.bans.length ? nh.bans.map(String) : DEFAULT_ZHUQUE_NARRATIVE_HARD.bans,
    must_deliver: Array.isArray(nh.must_deliver) && nh.must_deliver.length
      ? nh.must_deliver.map(String)
      : DEFAULT_ZHUQUE_NARRATIVE_HARD.must_deliver,
  }
}

export function formatFingerprintContractPrompt(contract: FingerprintContract | null | undefined) {
  if (!contract) return [] as string[]
  const nh = resolveZhuqueNarrativeHard(contract)
  const narrative = [
    '【朱雀叙事硬门槛 · 合同层 · 高于统计形态】',
    `硬禁止：${nh.bans.join('；')}`,
    `硬交付：${nh.must_deliver.join('；')}`,
    `硬家族零命中：${nh.zero_family_keys.slice(0, 12).join('/')}${nh.zero_family_keys.length > 12 ? '/…' : ''}`,
    '统计合同（cv/一句一段）只作辅证；朱雀叙事模式任一命中=合同硬失败。',
  ]
  return [
    ...narrative,
    ...contract.prompt_directives,
    `规避：${contract.avoid.join('；')}`,
    `优先：${contract.prefer.join('；')}`,
  ]
}


/** Genre slug aliases for fingerprint contracts under contracts/by-genre/. */
const GENRE_SLUG_ALIASES: Record<string, string> = {
  都市: 'urban',
  现实: 'urban',
  urban: 'urban',
  玄幻: 'xuanhuan',
  xuanhuan: 'xuanhuan',
  仙侠: 'xianxia',
  修真: 'xianxia',
  xianxia: 'xianxia',
  科幻: 'scifi',
  scifi: 'scifi',
  悬疑: 'suspense',
  诡秘: 'suspense',
  suspense: 'suspense',
  历史: 'history',
  history: 'history',
  游戏: 'game',
  game: 'game',
  轻小说: 'lightnovel',
  lightnovel: 'lightnovel',
  武侠: 'wuxia',
  wuxia: 'wuxia',
  奇幻: 'fantasy',
  fantasy: 'fantasy',
  诸天无限: 'multiverse',
  无限流: 'multiverse',
  multiverse: 'multiverse',
  军事: 'military',
  military: 'military',
}

export function normalizeFingerprintGenreSlug(raw?: string | null): string | null {
  const text = String(raw || '').trim()
  if (!text) return null
  if (GENRE_SLUG_ALIASES[text]) return GENRE_SLUG_ALIASES[text]
  const lower = text.toLowerCase()
  if (GENRE_SLUG_ALIASES[lower]) return GENRE_SLUG_ALIASES[lower]
  for (const [k, slug] of Object.entries(GENRE_SLUG_ALIASES)) {
    if (k.length >= 2 && text.includes(k)) return slug
  }
  return null
}

function fingerprintContractCandidates(cwd = process.cwd(), genreSlug?: string | null): string[] {
  const roots = [
    resolve(cwd, '../../workspace/fingerprint-lib/contracts'),
    resolve(cwd, '../../../workspace/fingerprint-lib/contracts'),
    resolve(cwd, 'workspace/fingerprint-lib/contracts'),
    resolve('/Users/ruiyaosong/MangaForge-Studio/workspace/fingerprint-lib/contracts'),
  ]
  const out: string[] = []
  const slug = genreSlug ? normalizeFingerprintGenreSlug(genreSlug) : null
  for (const root of roots) {
    if (slug) out.push(resolve(root, 'by-genre', `${slug}.json`))
    out.push(resolve(root, 'active-contract.json'))
  }
  return out
}

/** Load global active contract, or genre-specific contract when available. */
export function loadFingerprintContract(options: { cwd?: string; genre?: string | null } = {}): FingerprintContract | null {
  try {
    const path = fingerprintContractCandidates(options.cwd || process.cwd(), options.genre).find((p) => existsSync(p))
    if (!path) return null
    return JSON.parse(readFileSync(path, 'utf8')) as FingerprintContract
  } catch {
    return null
  }
}
