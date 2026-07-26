/**
 * novel-writer-master style anti-AIGC path:
 * local risk heatmap → rewrite only high-risk segments (≤2 rounds).
 *
 * System-wide only. Prefer delete packaging over full-chapter Pass A.
 * Whole-chapter Pass A over-shrink is a known Zhuque regression (R67).
 */

import { countProseChars } from './word-target'
import { scanPureAiPatternFamilies } from './human-webnovel-resistance'
import {
  buildEndingPackagingHardBans,
  buildHumanizePassADirectives,
  buildHumanizeSharedOutputContract,
  stripHumanizeChatWrapper,
} from './humanize-dual-pass'

export { buildEndingPackagingHardBans }
import { buildZhuqueNarrativeRewriteDirectives } from './humanize-postprocess'
import {
  scanDialoguePauseWindows,
  pickDualZoneParagraphTargets,
  DIALOGUE_PAUSE_WINDOW_VERSION,
} from './dialogue-pause-window'

export const HUMANIZE_RISK_SEGMENT_VERSION = 'humanize_risk_segment_v2.5'

/** Max LLM rewrite rounds over high-risk windows (cap). Default R76 uses 1. */
export const HUMANIZE_RISK_MAX_ROUNDS = 2

/** Soft full-chapter shrink cap when using segment path (avoid R67 over-shrink). */
export const HUMANIZE_SEGMENT_PATH_MAX_SHRINK = 0.18

export type RiskHeatCell = {
  index: number
  start: number
  end: number
  text: string
  score: number
  reasons: string[]
  high_risk: boolean
}

export type ZhuqueSegmentHint = {
  label?: string
  className?: string
  text?: string
  length?: number
}

export type RiskHeatmapReport = {
  version: string
  paragraph_count: number
  high_risk_count: number
  cells: RiskHeatCell[]
  total_score: number
}

const PACKAGING_TOKEN_RES: Array<{ key: string; re: RegExp; weight: number }> = [
  { key: 'cm_countdown', re: /十厘米|十五厘米|二十厘米|不到二十厘米/g, weight: 4 },
  { key: 'irreversible_close', re: /不可逆(?:的速度)?收窄|门缝正在以不可逆/g, weight: 4 },
  { key: 'anti_pinch', re: /防夹感应器|感应灯闪烁得更加剧烈/g, weight: 3 },
  { key: 'void_lore', re: /黑洞洞的空间|顺着风口倒灌|阴暗的空间里[，,]?仿佛有什么/g, weight: 3 },
  { key: 'b1_elevator', re: /\bB[12]\b|跳成了[“"]?B[12]|从[“"]?B[12][“"]?往上跳|货运电梯|负二|显示着[“"]?B2/g, weight: 3 },
  { key: 'b2_elevator_lore', re: /B2[”"]?按键|胶布封住|暗红色的油漆渍|黑色胶布封住/g, weight: 4 },
  { key: 'compliance_wall', re: /合规告示|安全注意事项|合规部规定|运送过程中的物品一律不准接触/g, weight: 4 },
  { key: 'light_curtain', re: /感应光幕/g, weight: 3 },
  { key: 'metal_tag_note', re: /金属牌|半折叠的白色小纸条|平车底盘钢架|刻着一串数字|小牌|半截纸条/g, weight: 3 },
  { key: 'tag_note_grab_end', re: /平车底下挂着个小牌|胶带粘着半截纸条|运送单上的东西不能动|争抢间[，,]?那张半截纸条被撕裂/g, weight: 4 },
  { key: 'door_block_stack', re: /缓缓合拢|即将关上的瞬间|挡在门缝前|电梯门受阻[，,]?再次向两侧退开/g, weight: 2 },
  { key: 'lime_cabin_blast', re: /石灰味混杂着冷气|潮湿[、，]冲的石灰|电梯井里吹来的冷风/g, weight: 3 },
  { key: 'fate_paper', re: /未完结[，,]?顺延下一位|顺延下一位|名单纸|精确到分钟的时间[，,]?以及一个体温读数/g, weight: 5 },
  { key: 'lime_end', re: /石灰(?:和消毒水|味的冷风)|消毒水混合的怪味|电梯井深处/g, weight: 3 },
  { key: 'spine_chill_climax', re: /一股寒意瞬间|顺着脊柱直冲|荡然无存|近乎决绝的冷静|取而代之的是一种/g, weight: 3 },
  { key: 'label_reveal_end', re: /洗水标|油性笔写着一串编号|编号下方[，,]?有一行极小的手写字/g, weight: 3 },
  { key: 'third_body_stack', re: /第三张平车|三张平车|第三具/g, weight: 2 },
  { key: 'clinical_triad', re: /心跳停止|瞳孔散大|听诊无心音|尸斑|无心音|病理反射/g, weight: 2 },
  { key: 'procedure_lecture', re: /规章第|流程合规|知情同意|放弃追责|绿色通道|设备合规/g, weight: 3 },
  { key: 'verdict', re: /这不合逻辑|按理说|按常理|绝不是巧合|系统性事件/g, weight: 2 },
  { key: 'cinematic_end', re: /空气凝固|挺直脊梁|电影定格|秒针|齿轮|不疾不徐/g, weight: 2 },
  { key: 'device_lecture', re: /走纸直线|微小电信号|毫无波折|尺子画线/g, weight: 2 },
  { key: 'multi_body', re: /三具|第二具|同样的皮肤|同样的毫无|非账上人员/g, weight: 2 },
]

const HIGH_RISK_SCORE = 2

/** System-wide human-positive cues (genre-agnostic). Missing these → whole-chapter suspected_ai. */
const HUMAN_PRIVATE_NOISE_RE = /绩效|奖金|交班|质控|背锅|甩锅|嫌|麻烦|改口|支开|不该写|别写|安全分|扣绩效|先保|责任|月底|说不清|别往系统|日志|报告|先不|不想|烦|交差|维保|推给|不是我|先记|先别|塞进|藏|锁门|别上报|口误|怕被|怕主任|怕出事|谁担|谁背|别给我/
const HUMAN_OBJECT_FRICTION_RE = /咬|笔帽|锈|漏墨|黏|粘|金属|边框|纸边|毛刺|手套|抽屉|钥匙|锁芯|铁盘|当啷|潮湿|泥斑|拉链|线头|口袋|袖口|指腹|刺手|发涩|发黏|发烫|发僵|冷得|烫手|硌手|起刺|涩响|油污/
const HUMAN_DIALOGUE_RE = /^[“"「]/

function scoreHumanPositiveDeficit(text: string, position: number): { score: number; reasons: string[] } {
  const body = String(text || '').trim()
  if (!body || body.length < 8) return { score: 0, reasons: [] }
  // Early-mid through late-mid (8%–88%): V5 lesson — green windows also need early process-smooth hits.
  // Keep endings mostly for packaging scorers.
  if (position < 0.08 || position > 0.88) return { score: 0, reasons: [] }
  const reasons: string[] = []
  let score = 0
  const isDialogue = HUMAN_DIALOGUE_RE.test(body)
  const hasNoise = HUMAN_PRIVATE_NOISE_RE.test(body)
  const hasFriction = HUMAN_OBJECT_FRICTION_RE.test(body)
  // Smooth narrative with no private noise / dialogue / object friction → human deficit.
  if (!isDialogue && !hasNoise && !hasFriction && body.length >= 18) {
    score += 3
    reasons.push('human_deficit')
  }
  // Long smooth para is worse (pipeline texture).
  if (!isDialogue && !hasNoise && body.length >= 48) {
    score += 1
    reasons.push('human_deficit_long_smooth')
  }
  // Process-smooth he-chain: consecutive 他/她 action sentences without friction (V5 anti-smooth).
  if (!isDialogue) {
    const sentences = body.split(/(?<=[。！？!?])/).map((s) => s.trim()).filter(Boolean)
    const heChain = sentences.filter((s) => /^(他|她|自己|对方)/.test(s)).length
    if (heChain >= 2 && !hasNoise && !hasFriction) {
      score += 2
      reasons.push('process_smooth_he_chain')
    }
  }
  // Early chapter smooth process is high value for first green window placement.
  if (position >= 0.08 && position <= 0.45 && score >= 3) {
    score += 1
    reasons.push('early_mid_smooth_priority')
  }
  return { score, reasons }
}


function splitParagraphs(text: string): string[] {
  return String(text || '')
    .replace(/\r/g, '')
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
}

function countRe(text: string, re: RegExp): number {
  const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`
  const copy = new RegExp(re.source, flags)
  return (String(text || '').match(copy) || []).length
}

/** Score one paragraph for Zhuque packaging risk (genre-agnostic). */
export function scoreParagraphAigcRisk(text: string): { score: number; reasons: string[] } {
  const body = String(text || '').trim()
  if (!body) return { score: 0, reasons: [] }
  let score = 0
  const reasons: string[] = []

  for (const row of PACKAGING_TOKEN_RES) {
    const n = countRe(body, row.re)
    if (n > 0) {
      score += row.weight * Math.min(3, n)
      reasons.push(`${row.key}×${n}`)
    }
  }

  const pure = scanPureAiPatternFamilies(body)
  if (pure.length) {
    score += pure.length * 2
    for (const hit of pure.slice(0, 4)) {
      reasons.push(String(hit.key || 'pure_ai'))
    }
  }

  // Ending-window heuristic: last ~12% of long chapters gets a mild boost when packaging tokens present.
  // Caller can also force via zhuque label overlay.

  // Parallel mid-length sentence cadence (weak signal)
  const sentences = body.split(/(?<=[。！？!?])/).map((s) => s.trim()).filter(Boolean)
  if (sentences.length >= 5) {
    const mid = sentences.filter((s) => {
      const n = countProseChars(s)
      return n >= 18 && n <= 36
    }).length
    if (mid / sentences.length >= 0.7) {
      score += 1
      reasons.push('even_mid_sentences')
    }
  }

  return { score, reasons: Array.from(new Set(reasons)).slice(0, 8) }
}

/** Overlay Zhuque report segments (label=ai / suspected_ai) onto paragraph cells. */
function normalizeForOverlap(text: string): string {
  return String(text || '')
    .replace(/\s+/g, '')
    .replace(/[“”"']/g, '')
    .replace(/…+/g, '...')
}

/**
 * Overlay Zhuque report segments onto paragraphs.
 * IMPORTANT: suspected_ai often spans nearly the whole chapter — never treat
 * "paragraph head appears inside giant segment" as a full-chapter rewrite signal.
 * Prefer: paragraph contained in pure-AI span; or local packaging + ending window.
 */
export function applyZhuqueSegmentHints(
  cells: RiskHeatCell[],
  segments: ZhuqueSegmentHint[] | null | undefined,
): RiskHeatCell[] {
  if (!Array.isArray(segments) || !segments.length) return cells
  const chapterLen = Math.max(1, cells.reduce((n, c) => n + c.text.length, 0))
  return cells.map((cell) => {
    let score = cell.score
    const reasons = [...cell.reasons]
    const cellBody = normalizeForOverlap(cell.text)
    if (cellBody.length < 6) {
      return { ...cell, high_risk: score >= HIGH_RISK_SCORE }
    }
    const position = cell.start / Math.max(1, cells[cells.length - 1]?.end || chapterLen)

    for (const seg of segments) {
      const label = String(seg.label || '').toLowerCase()
      const className = String(seg.className || '').toLowerCase()
      const segText = normalizeForOverlap(seg.text || '')
      if (!segText || segText.length < 8) continue

      const isPureAi = label === 'ai' || label === 'pure_ai' || className.includes('danger')
      const isSuspected = label.includes('suspect') || className.includes('warning')
      if (!isPureAi && !isSuspected) continue

      // Strict containment: paragraph body sits inside segment (or reverse for short para/long seg head).
      const containedInSeg = segText.includes(cellBody)
      const containsSegHead = cellBody.includes(segText.slice(0, Math.min(32, segText.length))) && segText.length <= cellBody.length + 8
      const overlap = containedInSeg || containsSegHead
      if (!overlap) continue

      if (isPureAi) {
        // Pure-AI spans are usually short endings — always boost.
        score += 8
        reasons.push('zhuque_ai_segment')
        continue
      }

      // Suspected spans are often whole-chapter: only boost when local packaging already exists,
      // or the suspected span itself is short (partial rewrite candidate).
      const shortSuspected = segText.length <= 900
      const localPackaging = (cell.score || 0) >= 2
      if (shortSuspected || localPackaging) {
        score += shortSuspected ? 3 : 2
        reasons.push('zhuque_suspected_segment')
      }
    }

    return {
      ...cell,
      score,
      reasons: Array.from(new Set(reasons)).slice(0, 10),
      high_risk: score >= HIGH_RISK_SCORE,
    }
  })
}

export function buildAigcRiskHeatmap(
  text: string,
  options: { zhuqueSegments?: ZhuqueSegmentHint[] | null } = {},
): RiskHeatmapReport {
  const paragraphs = splitParagraphs(text)
  let offset = 0
  const raw = String(text || '').replace(/\r/g, '')
  let cells: RiskHeatCell[] = paragraphs.map((para, index) => {
    const at = raw.indexOf(para, offset)
    const start = at >= 0 ? at : offset
    const end = start + para.length
    offset = end
    const scored = scoreParagraphAigcRisk(para)
    // mild boost for last 15% of chapter when already packaging-positive
    const chapterChars = Math.max(1, countProseChars(raw))
    const position = start / Math.max(1, raw.length)
    let score = scored.score
    const reasons = [...scored.reasons]
    if (position >= 0.85 && score >= 2) {
      score += 2
      reasons.push('ending_window')
    }
    // Human-positive deficit (R71/R72): pure-AI=0 but whole chapter suspected → need mid texture.
    const human = scoreHumanPositiveDeficit(para, position)
    score += human.score
    reasons.push(...human.reasons)
    return {
      index,
      start,
      end,
      text: para,
      score,
      reasons: Array.from(new Set(reasons)),
      high_risk: score >= HIGH_RISK_SCORE,
    }
  })

  cells = applyZhuqueSegmentHints(cells, options.zhuqueSegments)

  // If packaging is diffuse (no single para >= threshold) but chapter still risky,
  // promote top-scoring ending-window cells so segment rewrite can fire (anti no-op).
  const totalScore = cells.reduce((sum, c) => sum + c.score, 0)
  let high = cells.filter((c) => c.high_risk)
  if (!high.length && totalScore >= 4 && cells.length) {
    const lastStart = Math.floor(cells.length * 0.7)
    const ranked = [...cells]
      .filter((c) => c.index >= lastStart || c.score >= 3)
      .sort((a, b) => b.score - a.score || b.index - a.index)
    for (const cell of ranked.slice(0, 2)) {
      if (cell.score <= 0) continue
      cell.high_risk = true
      cell.reasons = Array.from(new Set([...(cell.reasons || []), 'promoted_diffuse_risk']))
    }
  }

  // R72 lesson: packaging cleared (pure AI=0) but whole text still suspected.
  // Promote mid human-deficit windows even when packaging total is low.
  high = cells.filter((c) => c.high_risk)
  const packagingScore = cells.reduce((sum, c) => sum + (c.reasons || []).filter((r) => !String(r).startsWith('human_deficit')).length, 0)
  const humanDeficitCells = cells.filter((c) => (c.reasons || []).some((r) => String(r).startsWith('human_deficit')))
  if (humanDeficitCells.length && high.filter((c) => (c.reasons || []).some((r) => String(r).startsWith('human_deficit'))).length < 2) {
    const midStart = Math.floor(cells.length * 0.08)
    const midEnd = Math.max(midStart + 1, Math.floor(cells.length * 0.88))
    const rankedHuman = [...humanDeficitCells]
      .filter((c) => c.index >= midStart && c.index <= midEnd)
      .sort((a, b) => {
        const aEarly = a.index <= Math.floor(cells.length * 0.55) ? 1 : 0
        const bEarly = b.index <= Math.floor(cells.length * 0.55) ? 1 : 0
        return (b.score - a.score) || (bEarly - aEarly) || (a.index - b.index)
      })
    // Sparse promotion: at most 2 windows; prefer early-mid smooth process for first green window.
    for (const cell of rankedHuman.slice(0, 2)) {
      if (cell.score < 3) continue
      cell.high_risk = true
      cell.score = Math.max(cell.score, HIGH_RISK_SCORE)
      cell.reasons = Array.from(new Set([...(cell.reasons || []), 'promoted_human_deficit']))
    }
  }

  // R76 v1.3: if <2 dialogue-pause windows, force dual-zone human_positive targets.
  {
    const pauseScan = scanDialoguePauseWindows(raw)
    if (pauseScan.window_count < 2 && cells.length >= 6) {
      const targets = pickDualZoneParagraphTargets(
        cells.length,
        pauseScan.windows.map((w) => w.position),
      )
      const claimed = new Set<number>()
      for (const target of targets) {
        // Prefer a smooth/deficit cell near the zone; never claim the same cell for both zones.
        const band = cells.filter((c) => Math.abs(c.index - target.index) <= 2 && !claimed.has(c.index))
        const ranked = [...band].sort((a, b) => {
          const aDef = (a.reasons || []).some((r) => String(r).startsWith('human_deficit') || r === 'process_smooth_he_chain') ? 1 : 0
          const bDef = (b.reasons || []).some((r) => String(r).startsWith('human_deficit') || r === 'process_smooth_he_chain') ? 1 : 0
          return (bDef - aDef) || (b.score - a.score) || (Math.abs(a.index - target.index) - Math.abs(b.index - target.index))
        })
        let cell = ranked[0]
        if (!cell) {
          // fall back to nearest unclaimed cell
          cell = [...cells]
            .filter((c) => !claimed.has(c.index))
            .sort((a, b) => Math.abs(a.index - target.index) - Math.abs(b.index - target.index))[0]
        }
        if (!cell) continue
        claimed.add(cell.index)
        cell.high_risk = true
        cell.score = Math.max(cell.score, HIGH_RISK_SCORE + 2)
        cell.reasons = Array.from(new Set([
          ...(cell.reasons || []),
          'human_deficit_dialogue_pause_window',
          `separated_zone_${target.zone === 'early_mid' ? 'a' : 'b'}`,
          `green_kind_${(target as any).kind || (target.zone === 'early_mid' ? 'dialogue_friction' : 'incomplete_decision')}`,
          'promoted_dual_zone',
          DIALOGUE_PAUSE_WINDOW_VERSION,
        ]))
      }
    }
  }

  return {
    version: HUMANIZE_RISK_SEGMENT_VERSION,
    paragraph_count: cells.length,
    high_risk_count: cells.filter((c) => c.high_risk).length,
    cells,
    total_score: cells.reduce((sum, c) => sum + c.score, 0),
  }
}

/**
 * Merge adjacent high-risk paragraphs into rewrite windows (≤ ~900 chars).
 * Low-risk neighbors stay untouched (novel-writer-master local rewrite).
 */
export function selectHighRiskRewriteWindows(
  heatmap: RiskHeatmapReport,
  options: { maxWindows?: number; maxChars?: number; preferSeparatedZones?: boolean } = {},
): Array<{ id: string; indices: number[]; text: string; score: number; reasons: string[] }> {
  const maxWindows = Math.max(1, Number(options.maxWindows ?? 3) || 3)
  const maxChars = Math.max(200, Number(options.maxChars ?? 900) || 900)
  const preferSeparated = options.preferSeparatedZones !== false
  const cells = heatmap.cells || []
  const windows: Array<{ id: string; indices: number[]; text: string; score: number; reasons: string[] }> = []
  let i = 0
  while (i < cells.length) {
    const cell = cells[i]
    if (!cell.high_risk) {
      i += 1
      continue
    }
    const indices = [cell.index]
    let text = cell.text
    let score = cell.score
    const reasons = [...cell.reasons]
    let j = i + 1
    while (j < cells.length && cells[j].high_risk) {
      const next = cells[j]
      const merged = `${text}\n\n${next.text}`
      if (countProseChars(merged) > maxChars) break
      // Keep dual-zone windows local: do not swallow a huge mid-chapter cluster into one window.
      if (preferSeparated && indices.length >= 3) break
      indices.push(next.index)
      text = merged
      score += next.score
      reasons.push(...next.reasons)
      j += 1
    }
    windows.push({
      id: `risk_${indices[0] + 1}_${indices[indices.length - 1] + 1}`,
      indices,
      text,
      score,
      reasons: Array.from(new Set(reasons)).slice(0, 12),
    })
    i = j
  }

  if (!windows.length) return []

  const paraCount = Math.max(1, cells.length)
  const minGap = Math.max(3, Math.floor(paraCount * 0.18))
  const ranked = [...windows].sort((a, b) => {
    const aDual = (a.reasons || []).some((r) => String(r).includes('separated_zone') || String(r).includes('dialogue_pause')) ? 1 : 0
    const bDual = (b.reasons || []).some((r) => String(r).includes('separated_zone') || String(r).includes('dialogue_pause')) ? 1 : 0
    return (bDual - aDual) || (b.score - a.score) || (a.indices[0] - b.indices[0])
  })

  const picked: typeof windows = []
  // First try to secure one early-half + one late-half when possible.
  if (preferSeparated && maxWindows >= 2) {
    const mid = Math.floor(paraCount * 0.5)
    const early = ranked.find((w) => w.indices[0] < mid)
    const late = ranked.find((w) => w.indices[0] >= mid && (!early || w.indices[0] - early.indices[early.indices.length - 1] >= minGap))
    if (early) picked.push(early)
    if (late) picked.push(late)
  }
  for (const win of ranked) {
    if (picked.length >= maxWindows) break
    if (picked.some((p) => p.id === win.id)) continue
    const ok = !preferSeparated || picked.every((p) => {
      const gap = win.indices[0] - p.indices[p.indices.length - 1]
      const gap2 = p.indices[0] - win.indices[win.indices.length - 1]
      return Math.max(gap, gap2) >= minGap || gap < 0 && gap2 < 0
    })
    // If separation fails but we still have slots and nothing picked from far band, allow.
    if (!ok && picked.length > 0) continue
    picked.push(win)
  }
  if (!picked.length) {
    return ranked.slice(0, maxWindows).sort((a, b) => a.indices[0] - b.indices[0])
  }
  return picked
    .slice(0, maxWindows)
    .sort((a, b) => a.indices[0] - b.indices[0])
}

export function buildHighRiskSegmentRewritePrompt(input: {
  window: { id: string; text: string; score: number; reasons: string[] }
  round: number
  project?: any
}): string {
  const reasonList = input.window.reasons || []
  const reasons = reasonList.slice(0, 8).join('、') || 'packaging'
  const humanPositive = reasonList.some((r) =>
    String(r).startsWith('human_deficit')
    || r === 'promoted_human_deficit'
    || String(r).includes('dialogue_pause')
    || String(r).includes('separated_zone')
    || r === 'promoted_dual_zone'
  )
  if (humanPositive) {
    return [
      `任务：对人工特征不足窗口做「加摩擦」重写（${HUMANIZE_RISK_SEGMENT_VERSION} · human_positive · round ${input.round}/${HUMANIZE_RISK_MAX_ROUNDS}）。只输出改写后正文。`,
      `窗口 id=${input.window.id} risk_score=${input.window.score} reasons=${reasons}`,
      ...buildHumanizeSharedOutputContract({ project: input.project, lengthTolerance: 0.18 }),
      ...buildZhuqueNarrativeRewriteDirectives(),
      '【Human-positive 专用 · 系统级 · 禁止章特调】',
      'H1. 只改本窗口；保留事实与角色归属；尽量等长或微扩（≤18%），禁止整段润色扩写。',
      'H2. 必须并进当前动作交付：半截私心噪声（嫌/烦/先不/改口/背锅/谁担）+ 当面摩擦（推责/甩锅/半截对白）之一。',
      'H3. 私心必须挂在动作上，禁止单独成段宣言；禁止临床体征三联、名单/lore/电影尾。',
      'H4. 优先 R73b 绿段配方（系统实证）：安静配角微互动（端水/放旁边/没说话就走）+ 私心与物件阻力同句 + 物件读不全（洇/划掉/认不出）立刻收手。',
      'H4b. 甩锅乱对白只作辅料，不得单独成段 stamp；若写对白须带代价词且前后挂触感动作。',
      'H5. 禁止银行 stamp 短句连贴；禁止「不是A而是B」判决腔；禁止干净清单盘点。',
      'H6. 无包装可删时以加绿段纹理为主，不要为空删成 vignette。',
      'H7. 证据只写半糊半残，禁止完整读清命运名单/编号全揭。',
      'H8. 若窗口含连续检查（颈动脉/对光/听诊/读数），必须打断：插入安静微互动或私心挂物件，禁止体检流水线。',
      'H9. 禁止“心率：/血氧：/血压：”连续报数行；最多保留一次读数，立刻改成犹豫/私心/物件。',
      'H10. 开篇窗口禁止复测连打与温度讲义腔；一次触感+半截私心即可推进。',
      'H11. 只允许轻改开篇前窗；禁止为清流程而重写中后段已有人味纹理。',
'H12. 稀疏人味：全窗口最多加 1 处摩擦/毛边；保留原句毛刺与不完整信息；禁止把平滑叙述磨成统一润色腔。',
'H13. 角色专名必须与原文一致；禁止近音串名（如把已确立主角名改成只差一字的新名）。',
'H14. 优先交付「半拍停顿对白窗」（V5绿段实证·系统级）：2–5句短对白独立成段 + 一句沉默/停顿/改口 + 一句轻物件触感；禁止成长说明电话腔。',
'H15. 打断流程顺滑：若原文是连续“他做A/他做B”，只保留一个动作，立刻接对白停顿或当面摩擦，不要补成长流水。',
'H16. 输出尽量等长；新增对白用短句独立成段，不要把对白熔进长叙述段。',
'H17. 若 reasons 含 separated_zone_a / dialogue_friction：交付当面摩擦对白窗（静拍 + 2–4 句短成本对白各自成段 + 物件/私心挂动作）；禁止说明腔。',
'H17b. 若 reasons 含 separated_zone_b / incomplete_decision：交付未完成决策窗（物件触感 + 私心压住 + 未完成动作收束），少/不对白；禁止再贴一套推责对白戳章。',
'H17c. 若 reasons 含 boundary_interrupt：只做短环境/社交打断切开（椅子声/对讲/脚步停/灯闪，2–4 个极短段），禁止补第二套推责对白，禁止写成长独白未完成决策。',
'H17d. 若 reasons 含 segment_dialogue_break：交付非推责短对白墙切开（值班/对讲/业务打断，2–4 句短对白各自成段 + 一句停顿动作）；禁止复制锅/责任/谁背；禁止说明腔问答。',
'H18. 私心禁止句末戳章尾巴；必须与动作同句（纸边停/挡人半步/钥匙硌手）。',
      '【原文窗口】',
      input.window.text,
    ].join('\n')
  }
  return [
    `任务：对高风险正文窗口做减负结构重写（${HUMANIZE_RISK_SEGMENT_VERSION} · round ${input.round}/${HUMANIZE_RISK_MAX_ROUNDS}）。只输出改写后正文。`,
    `窗口 id=${input.window.id} risk_score=${input.window.score} reasons=${reasons}`,
    ...buildHumanizeSharedOutputContract({ project: input.project, lengthTolerance: 0.22 }),
    ...buildHumanizePassADirectives(),
    ...buildZhuqueNarrativeRewriteDirectives(),
    '【高风险段专用 · novel-writer-master 局部改】',
    'S1. 只改本窗口；禁止扩写前后文、禁止补全全章。',
    'S2. 优先删除包装：厘米倒计时门缝、防夹感应器、不可逆收窄、黑洞倒灌、B1 电梯 lore、名单命运纸「未完结顺延」、石灰消毒水电影尾。',
    'S3. 改成未完成动作或半截对白收束；禁止换一套新电影镜头。',
    'S4. 不改事实与角色归属；字数允许偏短，禁止注水。',
    'S5. 不得空白；无包装壳时小改后返回原文骨架。',
    '【原文窗口】',
    input.window.text,
  ].join('\n')
}

export function stitchParagraphCellsWithWindows(
  originalText: string,
  heatmap: RiskHeatmapReport,
  rewrittenByIndex: Map<number, string>,
): string {
  const cells = heatmap.cells || []
  if (!cells.length) return String(originalText || '')
  const parts = cells.map((cell) => {
    if (rewrittenByIndex.has(cell.index)) {
      // Explicit mapping wins: an empty mapped value means "delete this paragraph"
      // (window rewrite compressed to fewer paragraphs). Never resurrect cell.text here.
      return String(rewrittenByIndex.get(cell.index) || '').trim()
    }
    // Unmapped cell → untouched original paragraph.
    return cell.text
  })
  return parts.filter(Boolean).join('\n\n')
}

/** Split a rewritten multi-paragraph window back onto original indices. */
export function mapWindowRewriteToParagraphs(
  window: { indices: number[]; text: string },
  rewritten: string,
  originalCells: RiskHeatCell[],
): Map<number, string> {
  const out = new Map<number, string>()
  const cleaned = stripHumanizeChatWrapper(rewritten).trim()
  if (!cleaned) return out
  const indices = window.indices || []
  if (indices.length === 1) {
    out.set(indices[0], cleaned)
    return out
  }
  const parts = splitParagraphs(cleaned)
  if (parts.length === indices.length) {
    indices.forEach((idx, i) => out.set(idx, parts[i]))
    return out
  }
  // Uneven split: put all rewrite on first index, clear middle packaging by leaving others as shortened stubs from original without high packaging if needed.
  // Safer: assign whole rewrite to first, drop redundant middle/end packaging paragraphs only when original window was ending stack.
  if (parts.length < indices.length) {
    parts.forEach((p, i) => out.set(indices[i], p))
    for (let i = parts.length; i < indices.length; i += 1) {
      // Rewrite compressed the window: surplus original paragraphs are explicitly
      // deleted by mapping to '' (stitch drops mapped-empty cells instead of keeping originals).
      out.set(indices[i], '')
    }
    return out
  }
  // more parts than indices: merge extras into last
  const head = parts.slice(0, indices.length - 1)
  const tail = parts.slice(indices.length - 1).join('\n\n')
  head.forEach((p, i) => out.set(indices[i], p))
  out.set(indices[indices.length - 1], tail)
  return out
}

export function acceptRiskSegmentRewrite(input: {
  beforeWindow: string
  afterWindow: string
  beforeChapter: string
  afterChapter: string
  reasons?: string[]
}): { accepted: boolean; text: string; reason: string } {
  const before = String(input.beforeWindow || '').trim()
  const afterRaw = stripHumanizeChatWrapper(input.afterWindow || '').trim()
  if (!afterRaw) return { accepted: false, text: before, reason: 'empty_rewrite' }
  if (afterRaw === before) return { accepted: false, text: before, reason: 'noop' }

  const reasonList = Array.isArray(input.reasons) ? input.reasons.map(String) : []
  const humanPositive = reasonList.some((r) =>
    String(r).startsWith('human_deficit')
    || r === 'promoted_human_deficit'
    || String(r).includes('dialogue_pause')
    || String(r).includes('separated_zone')
    || r === 'promoted_dual_zone'
  )

  const beforeChars = countProseChars(before)
  const afterChars = countProseChars(afterRaw)
  if (beforeChars > 40 && afterChars < beforeChars * 0.45) {
    return { accepted: false, text: before, reason: 'window_over_shrink' }
  }
  // Human-positive: allow modest friction inject, but reject chapter-smoothing expansions (ch2 lesson).
  const expandCap = humanPositive ? 1.55 : 1.28
  const absoluteSlack = humanPositive
    ? Math.max(beforeChars + 72, Math.floor(beforeChars * expandCap))
    : Math.floor(beforeChars * expandCap)
  if (afterChars > absoluteSlack) {
    return { accepted: false, text: before, reason: 'window_over_expand' }
  }

  const beforeRisk = scoreParagraphAigcRisk(before).score
  const afterRisk = scoreParagraphAigcRisk(afterRaw).score
  // Packaging path: reject risk rise. Human-positive path: packaging risk may stay flat.
  if (!humanPositive && afterRisk > beforeRisk + 1) {
    return { accepted: false, text: before, reason: 'risk_worsened' }
  }
  if (humanPositive && afterRisk > beforeRisk + 3) {
    return { accepted: false, text: before, reason: 'risk_worsened_human_positive' }
  }

  // Human-positive: prefer accepting when private noise / dialogue friction / pause-dialogue appears.
  if (humanPositive) {
    const beforeNoise = HUMAN_PRIVATE_NOISE_RE.test(before) || HUMAN_DIALOGUE_RE.test(before)
    const afterHasDialogue = /[“"「]/.test(afterRaw) || HUMAN_DIALOGUE_RE.test(afterRaw)
    const afterHasPause = /沉默|停了|没立刻|改口|半晌|顿了|两秒|三秒|没吭声|先不说/.test(afterRaw)
    const afterNoise = HUMAN_PRIVATE_NOISE_RE.test(afterRaw) || afterHasDialogue || HUMAN_OBJECT_FRICTION_RE.test(afterRaw) || afterHasPause
    if (!beforeNoise && !afterNoise && afterChars <= beforeChars) {
      return { accepted: false, text: before, reason: 'human_positive_no_gain' }
    }
    // Reject pure expansion that stays process-smooth with no dialogue/pause.
    if (!afterHasDialogue && !afterHasPause && !HUMAN_PRIVATE_NOISE_RE.test(afterRaw) && afterChars > beforeChars * 1.2) {
      return { accepted: false, text: before, reason: 'human_positive_smooth_expand' }
    }
  }

  const chapterBefore = countProseChars(input.beforeChapter)
  const chapterAfter = countProseChars(input.afterChapter)
  if (chapterBefore > 200 && chapterAfter < chapterBefore * (1 - HUMANIZE_SEGMENT_PATH_MAX_SHRINK)) {
    return { accepted: false, text: before, reason: 'chapter_over_shrink' }
  }

  return { accepted: true, text: afterRaw, reason: humanPositive ? 'human_positive' : '' }
}


export function assessChapterShrinkGuard(
  beforeText: string,
  afterText: string,
  maxShrink = HUMANIZE_SEGMENT_PATH_MAX_SHRINK,
): { ok: boolean; ratio: number; reason: string } {
  const before = countProseChars(beforeText)
  const after = countProseChars(afterText)
  if (before <= 0) return { ok: true, ratio: 0, reason: '' }
  const ratio = (before - after) / before
  if (ratio > maxShrink) {
    return { ok: false, ratio, reason: `chapter_shrink_${Math.round(ratio * 100)}pct_gt_${Math.round(maxShrink * 100)}` }
  }
  return { ok: true, ratio, reason: '' }
}
