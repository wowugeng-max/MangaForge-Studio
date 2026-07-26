/**
 * System-level dual-pass humanize (baibaiAIGC / BypassAIGC architecture,
 * adapted for webnovel — NOT academic paper verbosity).
 *
 * Pass A: structural rewrite (break parallel templates / perfect causal chains / smooth cadence)
 * Pass B: human texture (POV noise, imperfect rhythm, oral short beats)
 *
 * Hard contracts shared with academic tools:
 * - preserve plot/facts/character state
 * - length lock (~±10%)
 * - pure prose output (no chat wrapper)
 * - structure rewrite > synonym swap
 *
 * Forbidden to copy from paper tools:
 * - 进行…工作 / 得以实现 academic padding
 * - synonym bank spam
 * - chapter-specific offline rewrite
 */

import { countProseChars } from './word-target'

export const HUMANIZE_DUAL_PASS_VERSION = 'humanize_dual_pass_v1'

export type HumanizePassId = 'A' | 'B' | 'AB'

export type HumanizeDualPassOptions = {
  /** Which passes to request in a single LLM instruction. Default AB. */
  pass?: HumanizePassId
  /** Optional genre/persona project context. */
  project?: any
  /** Stage label for gates/logs. */
  stage?: string
  /** Soft length tolerance ratio. Default 0.1 (±10%). */
  lengthTolerance?: number
}

/** Shared output contract — mirrors baibai SHARED_OUTPUT_CONTRACT, novel-native. */
export function buildHumanizeSharedOutputContract(options: HumanizeDualPassOptions = {}): string[] {
  const tol = Math.max(0.05, Math.min(0.35, Number(options.lengthTolerance ?? 0.1) || 0.1))
  const pct = Math.round(tol * 100)
  return [
    '【Humanize 输出硬合同 · 系统通用】',
    '1. 只输出小说正文（或任务要求的 JSON 中 chapter_text），禁止“好的/修改后如下/改写说明/多版本候选”。',
    '2. 不改主线事实、角色归属、时间线、物品去向、章末承诺；禁止新增支线/地图/敌人/设定。',
    `3. 字数与原文基本一致（误差 ≤${pct}%）；为删除包装句允许偏短，禁止注水凑字，禁止无故砍半。`,
    '4. 结构重写优先，禁止纯同义词替换墙；禁止论文腔扩展（进行…工作/得以实现/开展…管理）。',
    '5. 保留可用的短对白独立段、物件触感链、双句密段；禁止为了“更整齐”抹平人工纹理。',
    '6. 禁止银行stamp硬塞、全知旁白、判决腔总结、电影定格升华。',
  ]
}

/** Pass A — structural rewrite (novel version of baibai round1 / Bypass polish). */
export function buildHumanizePassADirectives(): string[] {
  return [
    '【Humanize Pass A · 结构重写】目标：打破 AI 句骨，不是换词。',
    'A1. 拆平行：删掉“同样的…/一模一样/依然是/不仅…而且”式并列复读；多对象只留差异触感。',
    'A2. 破平滑因果：删“于是/因此/与此同时/综上所述”堆叠；允许打断、改口、半拍耽误接动作。',
    'A3. 句长不匀：禁止连续 ≥6 个中句同带；混用残句（≤8字）、短句、偶尔双句密段。',
    'A4. 模板开收：开篇禁道具/临床流水线；章末禁电影定格与程序辩论；改未完成动作或半截对白。',
    'A5. 信息密度：把说明书句改成“看见→误判/选择→手部动作”；禁止半科普因果讲义。',
    'A5b. 禁开篇感官流水线：连续 3 段以上“声响/气味/材质特写”开场要砍到 1 段动作+对白。',
    'A5c. 禁临床三联总结：心跳/瞳孔/心音/尸斑并列解释句必须删。',
    'A5d. 禁判决腔总结：删「这不合逻辑/按理说/按常理」类旁白；改成下一步动作或短对白。',
    'A5e. 禁多体汇总句：删「三个有体温/非账上人员/回收品」式总括；只留当前对象触感差异。',
    'A5f. 禁章末电梯电影堆：删井底冷风/轿厢顿寸/应急灯灭叠镜；改未完成动作（拒签/挤门/藏纸）。',
    'A5g. 禁设备讲义特写：走纸直线/尺子画线/微小电信号/毫无波折 → 撕纸塞口袋或喊停，挂半截私心。',
    'A5h. 删包装后不得留下平滑临床流水；每删一处包装，动作上必须挂半截私心（先不写/别背锅/先支开），禁止只加氛围。',
    'A5i. 禁规章第N条/盖章胁迫长辩；禁口袋钥匙+卡清单；禁章末证据复盘+电梯铁链石灰味门缝定格。',
    'A5j. 禁章末厘米倒计时门缝（十/十五/二十厘米）、不可逆收窄、防夹感应器讲义。',
    'A5k. 禁 B1 电梯数字 lore 与「未完结，顺延下一位」命运名单纸全揭；改未完成动作。',
    'A5l. 禁黑洞倒灌+石灰消毒水电影尾叠镜；删包装后不得换一套新镜头。',
    'A5m. 禁 B2/负二电梯按键lore（胶布封键/暗红色油漆渍/显示屏乱跳B2）与合规告示墙。',
    'A5n. 禁感应光幕讲义、金属牌编号+白纸条全揭、合规部运送禁触长辩；章末停在抢纸/挡门未完成动作。',
    'A5o. 禁章末小牌/半截纸条全揭+运送单禁触对白+撕纸贴门缝收束；只保留挡门或半截对白，不写物件编号。',
    'A6. 对白去答疑腔：标准说明改岗位脾气短句；禁止角色齐齐高级书面语。',
    'A7. 禁止学术注水词：进行配置/得以实现/开展…工作/极大程度上 等论文改写腔。',
  ]
}

/** Generation-time hard bans for ending packaging (system-wide). */
export function buildEndingPackagingHardBans(): string[] {
  return [
    '【章末包装硬禁 · 系统通用 · 生成+改写】',
    'E1. 禁止厘米倒计时门缝（十/十五/二十厘米…）与「不可逆收窄」。',
    'E2. 禁止防夹感应器/警报不响/感应灯剧烈闪烁讲义。',
    'E3. 禁止黑洞洞空间 + 风口倒灌 + 石灰消毒水电影尾叠镜。',
    'E4. 禁止 B1 电梯数字跳转 lore 与「未完结，顺延下一位」命运名单纸全揭。',
    'E5. 章末只用未完成动作或半截对白；禁止新套电影镜头替换旧包装。',
    'E6. 禁止 B2/负二按键lore、合规告示墙、感应光幕、金属牌编号白条全揭、合规部禁触讲义。',
    'E7. 禁止石灰冷气冲轿厢 + 门缝贴纸电影尾；改抢纸被拦的半截动作。',
    'E8. 禁止章末小牌/半截纸条/运送单禁触讲义连环；门一合就停在挡门或半截骂声。',
  ]
}

/** Pass B — subtractive de-packaging (Zhuque-oriented; do NOT add cinematic texture). */
export function buildHumanizePassBDirectives(): string[] {
  return [
    '【Humanize Pass B · 去包装减负】目标：删 AI 包装，不是添氛围/感官。',
    'B1. 只删不增：删除临床三联、程序长辩、电影定格、感官堆叠；禁止新增意象/比喻/环境渲染。',
    'B2. 禁止氛围词刷屏：死死/诡异/绿荧荧/刺鼻/牙酸/蜘蛛网/荧光针 等，有则删或改成一次具体动作。',
    'B3. 保留原对白与物件事实；禁止把短动作扩写成特写长镜头。',
    'B4. 章末若有电梯/秒针/十二点/齿轮/定格升华，改成未完成动作或半截对白。',
    'B5. 角色私心只保留半句动作选择（拒签/藏纸/先走开），禁止情绪形容词堆叠。',
    'B6. 字数宁少勿注水；删除比新增更优先；禁止同义扩写。',
    'B7. 禁止医疗说明书句：“心跳停止、瞳孔散大、听诊无心音”式三联总结一律拆掉。',
  ]
}

/** Compact checklist for model self-check before output (baibai checklist idea). */
export function buildHumanizeSelfCheckChecklist(): string[] {
  return [
    '【Humanize 输出前自检】',
    '- 是否仍保留原剧情事实与角色状态？',
    '- 是否存在平行复读/完美因果链/判决腔/电影定格？有则再改。',
    '- 是否句长过匀或全章 100% 一句一段无双句密段？有则打散。',
    '- 是否出现论文腔/工程词/聊天包装？有则删除。',
    '- 是否至少有：打断/改口、短对白脾气、物件触感挂动作？',
    '- 字数是否仍在 ±10% 内？',
  ]
}

export function buildHumanizeDualPassPromptDirectives(
  options: HumanizeDualPassOptions = {},
): string[] {
  const pass = (options.pass || 'AB') as HumanizePassId
  const lines = [
    `【${HUMANIZE_DUAL_PASS_VERSION} · 系统层双轮人性化】参考 baibai/Bypass 的多轮结构重写架构，网文原生规则，全章通用，禁止章节特调。`,
    ...buildHumanizeSharedOutputContract(options),
  ]
  if (pass === 'A' || pass === 'AB') lines.push(...buildHumanizePassADirectives())
  if (pass === 'B' || pass === 'AB') lines.push(...buildHumanizePassBDirectives())
  if (pass === 'AB') {
    lines.push(
      '【执行顺序】同一轮改写内先完成 Pass A（破 AI 句骨），再完成 Pass B（补角色在场纹理）；不要两轮各写一版正文，只输出最终一版。',
    )
  }
  lines.push(...buildHumanizeSelfCheckChecklist())
  return lines
}

/** Block form for revision/polish prompts. */
export function buildHumanizeDualPassPromptBlock(
  options: HumanizeDualPassOptions = {},
): string {
  return buildHumanizeDualPassPromptDirectives(options).join('\n')
}

/** Length gate aligned with Bypass ±10% style. */
export function assessHumanizeLengthLock(
  beforeText: string,
  afterText: string,
  options: { lengthTolerance?: number } = {},
): { ok: boolean; reason: string; beforeChars: number; afterChars: number; min: number; max: number } {
  const beforeChars = countProseChars(beforeText)
  const afterChars = countProseChars(afterText)
  const tol = Math.max(0.05, Math.min(0.35, Number(options.lengthTolerance ?? 0.1) || 0.1))
  if (beforeChars <= 0) {
    return { ok: afterChars > 0, reason: afterChars > 0 ? '' : 'empty_after', beforeChars, afterChars, min: 0, max: 0 }
  }
  const min = Math.floor(beforeChars * (1 - tol))
  const max = Math.ceil(beforeChars * (1 + tol))
  if (afterChars < min) {
    return { ok: false, reason: `humanize_length_too_short:${afterChars}/${beforeChars}`, beforeChars, afterChars, min, max }
  }
  if (afterChars > max) {
    return { ok: false, reason: `humanize_length_too_long:${afterChars}/${beforeChars}`, beforeChars, afterChars, min, max }
  }
  return { ok: true, reason: '', beforeChars, afterChars, min, max }
}

/** Detect chat-wrapper prefixes/suffixes similar to baibai wrapper detection (lightweight). */
const WRAPPER_PREFIX_PATTERNS = [
  /^(好的[，,。！!]?\s*)+/i,
  /^(修改后|改写后|润色后|修订后)(正文|内容|结果|版本)?[如下如下所示]*[：:\s]*/i,
  /^(以下是|下面是)(修改后|改写后|润色后|正文)?[：:\s]*/i,
  /^(修订版|版本[一二三123])[：:\s]*/i,
]
const WRAPPER_SUFFIX_RE = /(\n\s*(希望对你有帮助|如需继续|需要我再|是否还要).{0,80})$/i

export function stripHumanizeChatWrapper(text: string): string {
  let out = String(text || '').trim()
  // strip fenced code if whole body is fenced
  const fence = out.match(/^```(?:json|text|markdown)?\s*([\s\S]*?)\s*```$/i)
  if (fence) out = fence[1].trim()
  // repeatedly peel chat wrappers (baibai-style answer shell)
  for (let i = 0; i < 4; i += 1) {
    const before = out
    for (const re of WRAPPER_PREFIX_PATTERNS) out = out.replace(re, '')
    out = out.replace(WRAPPER_SUFFIX_RE, '')
    out = out.trim()
    if (out === before) break
  }
  return out
}

/**
 * Academic padding markers that paper tools encourage but webnovel must reject.
 * Used as soft scan for revision acceptance diagnostics.
 */
const ACADEMIC_PADDING_MARKERS = [
  /开展[\u4e00-\u9fff]{0,8}工作/,
  /得以实现/,
  /进行配置/,
  /极大程度上/,
  /从[\u4e00-\u9fff]{1,8}方面来讲/,
  /综上所述/,
  /首先[，,]?\s*其次/,
]

export function scanAcademicPaddingHits(text: string): string[] {
  const src = String(text || '')
  const hits: string[] = []
  for (const re of ACADEMIC_PADDING_MARKERS) {
    const m = src.match(re)
    if (m) hits.push(m[0])
  }
  return hits
}

/**
 * Prefer afterText only when length lock + no new academic padding.
 * Fingerprint continuity should still be applied by caller via selectFingerprintSafeProse.
 */
export function selectHumanizeSafeProse(
  beforeText: string,
  afterText: string,
  options: HumanizeDualPassOptions = {},
): {
  text: string
  accepted: boolean
  reason: string
  length: ReturnType<typeof assessHumanizeLengthLock>
  academic_hits: string[]
} {
  const stripped = stripHumanizeChatWrapper(afterText)
  const length = assessHumanizeLengthLock(beforeText, stripped, options)
  if (!stripped.trim()) {
    return { text: beforeText, accepted: false, reason: 'empty_candidate', length, academic_hits: [] }
  }
  if (!length.ok) {
    return { text: beforeText, accepted: false, reason: length.reason, length, academic_hits: [] }
  }
  const academic_hits = scanAcademicPaddingHits(stripped)
  const beforeAcademic = scanAcademicPaddingHits(beforeText)
  if (academic_hits.length > beforeAcademic.length) {
    return {
      text: beforeText,
      accepted: false,
      reason: `humanize_academic_padding:${academic_hits.slice(0, 3).join('|')}`,
      length,
      academic_hits,
    }
  }
  return { text: stripped, accepted: true, reason: '', length, academic_hits }
}

/** Strategy brief snippet for revision_strategy_brief consumers. */
export function buildHumanizeRevisionStrategyAddon(review: any = {}): {
  version: string
  enabled: boolean
  pass: HumanizePassId
  directives: string[]
  reason: string
} {
  const text = JSON.stringify(review || {}).slice(0, 4000)
  const wantsDeAi = /de_ai|deslop|hw_|抗检测|去AI|朱雀|AI腔|解释腔|humanize/i.test(text)
  const wantsPolish = /polish|润色|网感|可读|句式|节奏/i.test(text)
  const enabled = wantsDeAi || wantsPolish || true // always available system-wide as soft order
  return {
    version: HUMANIZE_DUAL_PASS_VERSION,
    enabled,
    pass: wantsDeAi ? 'AB' : 'B',
    directives: buildHumanizeDualPassPromptDirectives({ pass: wantsDeAi ? 'AB' : 'B' }).slice(0, 12),
    reason: wantsDeAi
      ? 'de_ai/抗检测路径：强制 Humanize Pass A+B'
      : wantsPolish
        ? 'polish/润色路径：强化 Pass B 人味，仍可做轻量 Pass A 破平行'
        : '系统默认：修订链路携带双轮 humanize 合同',
  }
}
