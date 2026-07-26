/**
 * System-wide human-green window scanner + sparse dual-zone ensure.
 *
 * Zhuque lessons (system-wide, not chapter-tuned):
 * - V5/V6: mid 「半拍停顿对白窗」(cost short-turns + object/private) can green.
 * - V7 READY: cloning a second blame-dialogue window mid/late stayed suspected;
 *   second green came from late incomplete-decision (pause + object + unfinished action).
 * - v1.3 dual-window: mid friction green + ending incomplete green (~23% human).
 * - v1.4 regression: mid-late incomplete monologue inject was swallowed into one
 *   giant suspected segment; second blame's value was SEGMENT SPLIT, not content.
 * - v1.5: ambient boundary_interrupt failed (~8% human); short env beats swallowed.
 * - v1.6: mid-late segment split uses NON-BLAME short dialogue wall (job/business
 *   interrupt). v1.3 taught us dialogue-rhythm walls split Zhuque segments; v1.3's
 *   second blame content itself stayed suspected — so second wall must not clone 锅/责任.
 *
 * Goal: ≥2 separated green-class windows with DIFFERENT functions:
 *   early/mid = face friction dialogue-pause (cost short-turns)
 *   mid-late  = segment_dialogue_break (non-blame short dialogue wall) when needed
 *   late      = incomplete-decision (little/no dialogue)
 */

import { countProseChars } from './word-target'

export const DIALOGUE_PAUSE_WINDOW_VERSION = 'dialogue-pause-window-v1.6'
export const MIN_DIALOGUE_PAUSE_WINDOWS = 2

export type HumanGreenWindowKind =
  | 'dialogue_friction'
  | 'incomplete_decision'
  | 'boundary_interrupt'
  | 'segment_dialogue_break'

export type DialoguePauseWindowHit = {
  kind: HumanGreenWindowKind
  start_para: number
  end_para: number
  start_char: number
  end_char: number
  position: number
  quote_count: number
  has_pause_cue: boolean
  has_object_cue: boolean
  has_private_cost: boolean
  score: number
  sample: string
}

export type DialoguePauseScanReport = {
  version: string
  paragraph_count: number
  window_count: number
  dialogue_friction_count: number
  incomplete_decision_count: number
  boundary_interrupt_count: number
  segment_dialogue_break_count: number
  windows: DialoguePauseWindowHit[]
  short_quote_paragraphs: number
  exposition_quote_paragraphs: number
}

export type DialoguePauseEnsureReport = {
  version: string
  before_count: number
  after_count: number
  injected: number
  zones: Array<'early_mid' | 'late'>
  kinds: HumanGreenWindowKind[]
  changed: boolean
  skip_reason?: string
}

const PAUSE_CUE_RE = /沉默|停了|停顿|静了|安静|改口|没说话|顿了|半拍|先不|先别|没动|话音断|静了一|重新安静|不吭声|没回头|愣了|先等|没急|站了一下|停了一下|停住|多停/
const OBJECT_CUE_RE = /纸边|指腹|袖口|口袋|钥匙|手套|金属|毛刺|笔帽|抽屉|锁|门|台面|文件夹|导联|杯子|手机|屏|夹子|纸角|硌|黏|粘|涩|湿|把手|窗|纸条|椅子|对讲|电梯|鞋底|地砖|指节/
const PRIVATE_COST_RE = /先不写|先不往|别上报|别扩散|不是我的锅|谁背|谁担|责任|先压|先糊|别写进|别往系统|推给|甩锅|嫌麻烦|先别走|别全推|交差|背锅|先等|去不了|瞎找|不确定/
/** Quote body cost friction (V6 green). Pure info Q&A does not count. */
const COST_IN_QUOTE_RE = /锅|责任|谁背|谁担|上报|别走|推我|推给|先压|先糊|交差|甩锅|不是我的锅|别全推|别扩散|别传|先别走|背锅|算谁的|谁担/
const INCOMPLETE_DECISION_RE = /先等|去不了|不知道看什么|不确定|瞎找|没急着|想了想|念头|推开了门|抬手|站了一下|停了一下|先把班|先不想|没走过去|退回去/
/** Ambient / social micro-interrupt that can split long monologue spans (v1.5).
 * Tight patterns only — static “坐在椅子上/窗外雨” ambient is NOT a segment break.
 */
const BOUNDARY_INTERRUPT_RE = /拖了一下椅子|椅子腿|对讲嘶|对讲.{0,6}没人|脚步停|脚步又远|电梯口灯|灯闪了一下|声又没了|没人接|没人下来|走廊那头有人|那头有人|嘶了一声|鞋底.{0,8}停住|那头脚步/
/** Non-blame short dialogue wall content (v1.6). Business/job interrupt, not 锅/责任 stamp. */
const SEGMENT_DIALOGUE_BREAK_RE = /还值班|值班呢|二号床|血压呢|先别念|先别说|你还在|慢点|走了|叫你|对讲|应了一下|没抬头|按掉|知道了|嗯。|那你/
const QUOTE_OPEN_RE = /^[“"「']/

function splitParagraphs(text: string): string[] {
  return String(text || '')
    .replace(/\r/g, '')
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
}

function simpleHash(input: string): number {
  let h = 2166136261
  const s = String(input || '')
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Short independent dialogue para (not exposition lecture). */
export function isShortDialogueParagraph(text: string): boolean {
  const body = String(text || '').trim()
  if (!body || !QUOTE_OPEN_RE.test(body)) return false
  const chars = countProseChars(body)
  if (chars < 2 || chars > 28) return false
  const clauseMarks = (body.match(/[，,；;：:]/g) || []).length
  if (clauseMarks >= 3 && chars > 16) return false
  const sentences = (body.match(/[。！？!?]/g) || []).length
  if (sentences >= 2 && chars > 18) return false
  if (/[”"」].{10,}/.test(body) && chars > 22) return false
  return true
}

export function isExpositionDialogueParagraph(text: string): boolean {
  const body = String(text || '').trim()
  if (!body || !QUOTE_OPEN_RE.test(body)) return false
  if (isShortDialogueParagraph(body)) return false
  return countProseChars(body) >= 24
}

function isBoundaryBeatParagraph(text: string): boolean {
  const body = String(text || '').trim()
  if (!body) return false
  if (isShortDialogueParagraph(body) || isExpositionDialogueParagraph(body)) return false
  const chars = countProseChars(body)
  // Keep beats short so Zhuque can treat them as a rhythm break, not monologue glue.
  if (chars < 2 || chars > 28) return false
  return true
}

function nearbyCueScore(paras: string[], index: number): {
  has_pause_cue: boolean
  has_object_cue: boolean
  has_private_cost: boolean
  score: number
} {
  const from = Math.max(0, index - 2)
  const to = Math.min(paras.length - 1, index + 2)
  let has_pause_cue = false
  let has_object_cue = false
  let has_private_cost = false
  for (let i = from; i <= to; i += 1) {
    const p = paras[i]
    if (PAUSE_CUE_RE.test(p)) has_pause_cue = true
    if (OBJECT_CUE_RE.test(p)) has_object_cue = true
    if (PRIVATE_COST_RE.test(p)) has_private_cost = true
  }
  let score = 0
  if (has_pause_cue) score += 2
  if (has_object_cue) score += 2
  if (has_private_cost) score += 2
  return { has_pause_cue, has_object_cue, has_private_cost, score }
}

function paraStarts(raw: string, paras: string[]): number[] {
  const starts: number[] = []
  let offset = 0
  for (const p of paras) {
    const at = raw.indexOf(p, offset)
    const start = at >= 0 ? at : offset
    starts.push(start)
    offset = start + p.length
  }
  return starts
}

function pushMerged(windows: DialoguePauseWindowHit[], hit: DialoguePauseWindowHit): void {
  const overlap = windows.find((w) => !(hit.end_para < w.start_para || hit.start_para > w.end_para))
  if (!overlap) {
    windows.push(hit)
    return
  }
  // Prefer higher score; keep denser kind priority: friction > boundary > incomplete on equal score ties by kind rank
  const rank = (k: HumanGreenWindowKind) => (k === 'dialogue_friction' ? 4 : k === 'segment_dialogue_break' ? 3 : k === 'boundary_interrupt' ? 2 : 1)
  if (hit.score > overlap.score || (hit.score === overlap.score && rank(hit.kind) > rank(overlap.kind))) {
    Object.assign(overlap, hit)
  }
}

/**
 * Scan human-green window candidates:
 * 1) dialogue_friction: short cost quotes + nearby pause/object/private
 * 2) incomplete_decision: late-ish unfinished action + object + private/pause (little dialogue)
 * 3) boundary_interrupt: mid/late short ambient-social beats (weak; kept for detection)
 * 4) segment_dialogue_break: mid/late NON-blame short dialogue wall (v1.6 segment geometry)
 */
export function scanDialoguePauseWindows(text: string): DialoguePauseScanReport {
  const raw = String(text || '').replace(/\r/g, '')
  const paras = splitParagraphs(raw)
  const starts = paraStarts(raw, paras)
  const windows: DialoguePauseWindowHit[] = []
  let shortQuotes = 0
  let expoQuotes = 0
  let i = 0

  // 1) dialogue friction clusters
  while (i < paras.length) {
    if (!isShortDialogueParagraph(paras[i])) {
      if (isExpositionDialogueParagraph(paras[i])) expoQuotes += 1
      i += 1
      continue
    }
    shortQuotes += 1
    let j = i
    while (j < paras.length && isShortDialogueParagraph(paras[j]) && j - i < 5) {
      if (j > i) shortQuotes += 1
      j += 1
    }
    const quoteCount = j - i
    if (quoteCount >= 2) {
      const mid = i + Math.floor((quoteCount - 1) / 2)
      const cues = nearbyCueScore(paras, mid)
      const cluster = paras.slice(i, j)
      const costQuotes = cluster.filter((p) => COST_IN_QUOTE_RE.test(p)).length
      const greenClass = (
        (costQuotes >= 1 && (cues.has_pause_cue || cues.has_object_cue || cues.has_private_cost || quoteCount >= 3))
        || (cues.has_private_cost && cues.has_object_cue && quoteCount >= 2)
      )
      if (greenClass) {
        const start_char = starts[i] ?? 0
        const end_char = (starts[j - 1] ?? start_char) + paras[j - 1].length
        const position = raw.length > 0 ? (start_char + end_char) / 2 / raw.length : 0
        pushMerged(windows, {
          kind: 'dialogue_friction',
          start_para: i,
          end_para: j - 1,
          start_char,
          end_char,
          position,
          quote_count: quoteCount,
          has_pause_cue: cues.has_pause_cue,
          has_object_cue: cues.has_object_cue,
          has_private_cost: cues.has_private_cost,
          score: quoteCount + cues.score + costQuotes * 2,
          sample: cluster.join(' / ').slice(0, 120),
        })
      } else if (costQuotes === 0 && quoteCount >= 2) {
        // v1.6: non-blame short dialogue wall can still act as segment geometry break.
        const bandFrom = Math.max(0, i - 1)
        const bandTo = Math.min(paras.length - 1, j)
        const band = paras.slice(bandFrom, bandTo + 1)
        const bandText = band.join('\n')
        const breakCue = SEGMENT_DIALOGUE_BREAK_RE.test(bandText) || cues.has_pause_cue || BOUNDARY_INTERRUPT_RE.test(bandText)
        const start_char = starts[i] ?? 0
        const end_char = (starts[j - 1] ?? start_char) + paras[j - 1].length
        const position = raw.length > 0 ? (start_char + end_char) / 2 / raw.length : 0
        if (breakCue && position >= 0.55) {
          pushMerged(windows, {
            kind: 'segment_dialogue_break',
            start_para: bandFrom,
            end_para: Math.min(paras.length - 1, j),
            start_char: starts[bandFrom] ?? start_char,
            end_char: (starts[Math.min(paras.length - 1, j)] ?? end_char) + paras[Math.min(paras.length - 1, j)].length,
            position,
            quote_count: quoteCount,
            has_pause_cue: cues.has_pause_cue,
            has_object_cue: cues.has_object_cue,
            has_private_cost: false,
            score: 7 + quoteCount + cues.score,
            sample: band.join(' / ').slice(0, 120),
          })
        }
      }
      i = j
      continue
    }
    i = Math.max(i + 1, j)
  }

  // 2) incomplete-decision bands — late only, must look like unfinished action close (V7 green-2).
  // Mid monologue with "不确定" alone is NOT enough (over-count blocked ensure on V6).
  for (let idx = 0; idx < paras.length; idx += 1) {
    const position = raw.length > 0 ? ((starts[idx] ?? 0) + paras[idx].length / 2) / raw.length : 0
    if (position < 0.68) continue
    const body = paras[idx]
    if (isShortDialogueParagraph(body) || isExpositionDialogueParagraph(body)) continue
    const bandFrom = Math.max(0, idx - 1)
    const bandTo = Math.min(paras.length - 1, idx + 3)
    const band = paras.slice(bandFrom, bandTo + 1)
    const bandText = band.join('\n')
    // Require concrete unfinished close + halt, not just uncertainty lore.
    const hasUnfinishedClose = /(推开了门|抬手|先等|先等天亮|没急着|站了一下|停了一下|往回走|先把班)/.test(bandText)
    const hasHaltThought = /(愣了|想了想|去不了|不知道看什么|不确定|瞎找|先压着|念头)/.test(bandText)
    const objectish = band.some((p) => OBJECT_CUE_RE.test(p))
    const pauseish = band.some((p) => PAUSE_CUE_RE.test(p))
    if (!(hasUnfinishedClose && hasHaltThought && objectish)) continue
    const quoteHeavy = band.filter((p) => isShortDialogueParagraph(p)).length >= 2
    if (quoteHeavy) continue
    // Prefer denser late bands; skip long lore paragraphs as anchors
    if (countProseChars(body) > 120 && !hasUnfinishedClose) continue
    const start_char = starts[bandFrom] ?? 0
    const end_char = (starts[bandTo] ?? start_char) + paras[bandTo].length
    const midPos = raw.length > 0 ? (start_char + end_char) / 2 / raw.length : 0
    const cues = nearbyCueScore(paras, idx)
    pushMerged(windows, {
      kind: 'incomplete_decision',
      start_para: bandFrom,
      end_para: bandTo,
      start_char,
      end_char,
      position: midPos,
      quote_count: band.filter((p) => isShortDialogueParagraph(p)).length,
      has_pause_cue: pauseish,
      has_object_cue: objectish,
      has_private_cost: cues.has_private_cost || PRIVATE_COST_RE.test(bandText),
      score: 8 + cues.score + (hasUnfinishedClose ? 3 : 0) + (hasHaltThought ? 2 : 0),
      sample: band.join(' / ').slice(0, 120),
    })
  }

  // 3) boundary interrupt clusters — short ambient/social beats that break monologue glue.
  i = 0
  while (i < paras.length) {
    if (!isBoundaryBeatParagraph(paras[i]) || !BOUNDARY_INTERRUPT_RE.test(paras[i])) {
      i += 1
      continue
    }
    let j = i + 1
    while (j < paras.length && j - i < 5) {
      const p = paras[j]
      if (!isBoundaryBeatParagraph(p)) break
      // Do not glue ordinary narrative into the interrupt cluster.
      const shortEnough = countProseChars(p) <= 18
      const textured = BOUNDARY_INTERRUPT_RE.test(p) || PAUSE_CUE_RE.test(p) || OBJECT_CUE_RE.test(p)
      if (!(shortEnough || textured)) break
      j += 1
    }
    const cluster = paras.slice(i, j)
    if (cluster.length < 2) {
      i += 1
      continue
    }
    const clusterText = cluster.join('\n')
    const interruptHits = cluster.filter((p) => BOUNDARY_INTERRUPT_RE.test(p)).length
    const pauseHits = cluster.filter((p) => PAUSE_CUE_RE.test(p)).length
    const objectHits = cluster.filter((p) => OBJECT_CUE_RE.test(p)).length
    // Need real interrupt action beats, not static ambient description.
    if (interruptHits < 1) {
      i += 1
      continue
    }
    if (pauseHits + objectHits < 1 && interruptHits < 2) {
      i += 1
      continue
    }
    // Reject if this is just incomplete-decision monologue texture (want different function).
    const incompleteHeavy = INCOMPLETE_DECISION_RE.test(clusterText) && cluster.some((p) => countProseChars(p) > 28)
    if (incompleteHeavy) {
      i = Math.max(i + 1, j)
      continue
    }
    const start_char = starts[i] ?? 0
    const end_char = (starts[j - 1] ?? start_char) + paras[j - 1].length
    const position = raw.length > 0 ? (start_char + end_char) / 2 / raw.length : 0
    // Boundary only useful mid/late after early story settles.
    if (position < 0.45) {
      i = Math.max(i + 1, j)
      continue
    }
    const cues = nearbyCueScore(paras, i + Math.floor((j - i - 1) / 2))
    pushMerged(windows, {
      kind: 'boundary_interrupt',
      start_para: i,
      end_para: j - 1,
      start_char,
      end_char,
      position,
      quote_count: 0,
      has_pause_cue: cues.has_pause_cue || pauseHits > 0,
      has_object_cue: cues.has_object_cue || objectHits > 0,
      has_private_cost: cues.has_private_cost,
      score: 6 + interruptHits * 2 + pauseHits + objectHits,
      sample: cluster.join(' / ').slice(0, 120),
    })
    i = j
  }

  windows.sort((a, b) => a.start_para - b.start_para)
  const dialogue_friction_count = windows.filter((w) => w.kind === 'dialogue_friction').length
  const incomplete_decision_count = windows.filter((w) => w.kind === 'incomplete_decision').length
  const boundary_interrupt_count = windows.filter((w) => w.kind === 'boundary_interrupt').length
  const segment_dialogue_break_count = windows.filter((w) => w.kind === 'segment_dialogue_break').length

  return {
    version: DIALOGUE_PAUSE_WINDOW_VERSION,
    paragraph_count: paras.length,
    window_count: windows.length,
    dialogue_friction_count,
    incomplete_decision_count,
    boundary_interrupt_count,
    segment_dialogue_break_count,
    windows,
    short_quote_paragraphs: shortQuotes,
    exposition_quote_paragraphs: expoQuotes,
  }
}

type ScaffoldPack = {
  kind: HumanGreenWindowKind
  lines: string[]
}

/** Genre-agnostic rotating scaffolds. */
function scaffoldPack(kind: HumanGreenWindowKind, seed: number): ScaffoldPack {
  if (kind === 'dialogue_friction') {
    const packs = [
      [
        '外头静了一拍。',
        '他指腹在纸边停了一下，先不往系统里写。',
        '“责任算谁的，说清楚。”',
        '“不是我的锅。”',
        '“那谁背？先别走。”',
        '“我先压一笔，别上报。”',
        '他嫌袖口黏，又把人往门口挡了半步。',
      ],
      [
        '话音断了一下。',
        '钥匙在口袋里硌着手指，他没急着掏。',
        '“这事谁担？”',
        '“别全推我这。”',
        '“你先别走。”',
        '“先糊着，别扩散。”',
        '他改了口，肩却没让开。',
      ],
    ]
    return { kind, lines: packs[seed % packs.length] }
  }

  if (kind === 'boundary_interrupt') {
    // v1.5 legacy ambient beats (weak alone). Prefer segment_dialogue_break for ensure.
    const packs = [
      [
        '走廊那头有人拖了一下椅子腿。',
        '他没回头。',
        '声又没了。',
        '指节还按在口袋外，热的。',
      ],
      [
        '对讲嘶了一声，没人接。',
        '他在原地多停了半拍。',
        '没回。',
        '鞋底在地砖上停住。',
      ],
    ]
    return { kind, lines: packs[seed % packs.length] }
  }

  if (kind === 'segment_dialogue_break') {
    // v1.6: non-blame short dialogue wall for Zhuque segment geometry.
    // Must NOT clone cost/blame stamps (锅/责任/谁背).
    const packs = [
      [
        '对讲里忽然有人。',
        '“二号床呢？”',
        '“先别念了。”',
        '“知道了。”',
        '他按掉对讲，手还停在半空。',
      ],
      [
        '走廊那头有人喊了一声。',
        '“还值班呢？”',
        '“嗯。”',
        '“那你慢点。”',
        '他没抬头，只应了一下。',
      ],
      [
        '身后有人停了半步。',
        '“你还在啊？”',
        '“马上走。”',
        '“行。”',
        '脚步远了，他指腹还按在纸边。',
      ],
      [
        '手机震了一下，他没立刻接。',
        '“血压呢？”',
        '“先别说这个。”',
        '“……行。”',
        '他挂断，屏幕光在指节上停了一拍。',
      ],
    ]
    return { kind, lines: packs[seed % packs.length] }
  }

  // incomplete decision — little/no dialogue (V7 green-2 lesson)
  // Prefer short independent paras so ending can stand as its own span after a boundary break.
  const packs = [
    [
      '他在窗口站了一会儿。',
      '口袋里的东西压了压，手掌从外面压进去，那一点厚度不厚，但硌手。',
      '他想现在就去看一眼。',
      '念头出来时他自己也愣了一下。',
      '时候不对，去了也不知道看什么。',
      '先等天亮。',
      '他转身往回走。',
      '走到一半又停了一下。',
      '没把话说出口。',
      '抬手摸了摸门边金属把手上的浅划痕。',
      '然后才推开门。',
    ],
    [
      '他没急着往前。',
      '指腹在口袋外按了一下，纸边硌着。',
      '他先不把这事写全。',
      '想过去核一眼。',
      '又觉得现在过去只会把自己卷进去。',
      '先压着。',
      '走廊比刚才更安静。',
      '他走到门口站了一下。',
      '把手放在金属边框上，没立刻推。',
      '停了半拍，才抬手推开。',
    ],
    [
      '他在原地多停了一拍。',
      '物件在掌心下发硬。',
      '他不确定这是不是该现在碰的东西。',
      '去，还是先回去把班上完。',
      '两个念头顶在一起，哪个都没赢。',
      '先等。',
      '他往回走，鞋底声很轻。',
      '走到拐角又停住，像是被自己叫住。',
      '没解释。',
      '只是抬手推开了门。',
    ],
  ]
  return { kind, lines: packs[seed % packs.length] }
}

function renderScaffold(pack: ScaffoldPack): string {
  return pack.lines.join('\n\n')
}

function targetInsertIndex(paras: string[], ratio: number, avoid: number[]): number {
  if (!paras.length) return 0
  let idx = Math.max(1, Math.min(paras.length - 2, Math.floor(paras.length * ratio)))
  for (let delta = 0; delta < paras.length; delta += 1) {
    for (const sign of [1, -1]) {
      const j = idx + delta * sign
      if (j < 1 || j >= paras.length - 1) continue
      if (avoid.some((a) => Math.abs(a - j) <= 2)) continue
      if (isShortDialogueParagraph(paras[j])) continue
      if (isExpositionDialogueParagraph(paras[j])) continue
      return j
    }
  }
  return Math.max(1, Math.min(paras.length - 2, idx))
}

/**
 * Ensure dual-function green windows:
 * - need ≥1 dialogue_friction (prefer early-mid)
 * - need ≥1 incomplete_decision (prefer late)
 * - if friction is early and incomplete only sits at the very end, inject a
 *   mid-late segment_dialogue_break (non-blame short dialogue wall) (v1.6)
 * Do not inject two identical blame-dialogue stamps.
 * Do not inject a second monologue incomplete as a "fake" second island.
 * Ambient boundary alone is not enough for Zhuque segment split.
 */
export function ensureDialoguePauseWindows(
  text: string,
  options: { minWindows?: number; enabled?: boolean } = {},
): { text: string; report: DialoguePauseEnsureReport; scan: DialoguePauseScanReport } {
  const minWindows = Math.max(1, Number(options.minWindows ?? MIN_DIALOGUE_PAUSE_WINDOWS) || MIN_DIALOGUE_PAUSE_WINDOWS)
  const enabled = options.enabled !== false
  const source = String(text || '')
  const beforeScan = scanDialoguePauseWindows(source)
  if (!enabled) {
    return {
      text: source,
      scan: beforeScan,
      report: {
        version: DIALOGUE_PAUSE_WINDOW_VERSION,
        before_count: beforeScan.window_count,
        after_count: beforeScan.window_count,
        injected: 0,
        zones: [],
        kinds: [],
        changed: false,
        skip_reason: 'disabled',
      },
    }
  }

  const hasFriction = beforeScan.dialogue_friction_count >= 1
  const lateIncompleteWindows = beforeScan.windows.filter((w) => w.kind === 'incomplete_decision' && w.position >= 0.68)
  const hasIncomplete = lateIncompleteWindows.length >= 1
  const frictionPos = beforeScan.windows.find((w) => w.kind === 'dialogue_friction')?.position ?? 0
  const earliestLateIncomplete = lateIncompleteWindows.map((w) => w.position).sort((a, b) => a - b)[0] ?? 1
  // v1.6: prefer non-blame short dialogue wall in the monologue gap (true segment split zone).
  // Ambient boundary alone failed on Zhuque; dialogue-rhythm walls from v1.3 did split.
  const midLateSegmentBreaks = beforeScan.windows.filter(
    (w) => (
      (w.kind === 'segment_dialogue_break' || w.kind === 'boundary_interrupt')
      && w.position >= 0.62
      && w.position <= 0.84
    ),
  )
  const hasSegmentDialogueBreak = midLateSegmentBreaks.some((w) => w.kind === 'segment_dialogue_break')
  // v1.4/v1.5 lesson: monologue incomplete + ambient beats get swallowed.
  // Need a mid-late NON-blame short dialogue wall when ending incomplete is too far.
  const needsBoundaryBreak = hasFriction
    && hasIncomplete
    && frictionPos <= 0.55
    && earliestLateIncomplete >= 0.84
    && !hasSegmentDialogueBreak

  const satisfied = beforeScan.window_count >= minWindows
    && hasFriction
    && hasIncomplete
    && !needsBoundaryBreak
  if (satisfied) {
    return {
      text: source,
      scan: beforeScan,
      report: {
        version: DIALOGUE_PAUSE_WINDOW_VERSION,
        before_count: beforeScan.window_count,
        after_count: beforeScan.window_count,
        injected: 0,
        zones: [],
        kinds: [],
        changed: false,
        skip_reason: 'already_satisfied',
      },
    }
  }
  if (beforeScan.paragraph_count < 4 || countProseChars(source) < 400) {
    return {
      text: source,
      scan: beforeScan,
      report: {
        version: DIALOGUE_PAUSE_WINDOW_VERSION,
        before_count: beforeScan.window_count,
        after_count: beforeScan.window_count,
        injected: 0,
        zones: [],
        kinds: [],
        changed: false,
        skip_reason: 'text_too_short',
      },
    }
  }

  const plan: Array<{ zone: 'early_mid' | 'late'; kind: HumanGreenWindowKind; ratio: number }> = []
  if (!hasFriction) plan.push({ zone: 'early_mid', kind: 'dialogue_friction', ratio: 0.32 })
  if (!hasIncomplete) plan.push({ zone: 'late', kind: 'incomplete_decision', ratio: 0.82 })
  if (needsBoundaryBreak) plan.push({ zone: 'late', kind: 'segment_dialogue_break', ratio: 0.72 })
  // If only total count short but kinds ok, inject missing kind by position farthest from existing.
  if (!plan.length && beforeScan.window_count < minWindows) {
    if (hasFriction) plan.push({ zone: 'late', kind: 'incomplete_decision', ratio: 0.82 })
    else plan.push({ zone: 'early_mid', kind: 'dialogue_friction', ratio: 0.32 })
  }

  let paras = splitParagraphs(source)
  const avoid = beforeScan.windows.flatMap((w) => [w.start_para, w.end_para])
  let injected = 0
  const zones: Array<'early_mid' | 'late'> = []
  const kinds: HumanGreenWindowKind[] = []

  for (const cand of plan) {
    // Skip zone if existing window already covers band with same kind.
    if (beforeScan.windows.some((w) => Math.abs(w.position - cand.ratio) < 0.12 && w.kind === cand.kind)) continue
    const insertAt = targetInsertIndex(paras, cand.ratio, avoid)
    const seed = simpleHash(`${cand.kind}:${cand.zone}:${paras[insertAt] || ''}:${injected}`)
    const block = renderScaffold(scaffoldPack(cand.kind, seed + injected))
    const addedParas = splitParagraphs(block)
    paras = [
      ...paras.slice(0, insertAt + 1),
      ...addedParas,
      ...paras.slice(insertAt + 1),
    ]
    const added = addedParas.length
    for (let k = 0; k < avoid.length; k += 1) {
      if (avoid[k] > insertAt) avoid[k] += added
    }
    avoid.push(insertAt + 1, insertAt + added)
    zones.push(cand.zone)
    kinds.push(cand.kind)
    injected += 1
  }

  const next = paras.join('\n\n')
  const afterScan = scanDialoguePauseWindows(next)
  return {
    text: next,
    scan: afterScan,
    report: {
      version: DIALOGUE_PAUSE_WINDOW_VERSION,
      before_count: beforeScan.window_count,
      after_count: afterScan.window_count,
      injected,
      zones,
      kinds,
      changed: injected > 0 && next !== source,
    },
  }
}

/** Target paragraph indices near dual zones for humanize promotion. */
export function pickDualZoneParagraphTargets(
  paragraphCount: number,
  existingWindowPositions: number[] = [],
): Array<{ index: number; zone: 'early_mid' | 'late'; ratio: number; kind: HumanGreenWindowKind }> {
  const n = Math.max(0, Number(paragraphCount) || 0)
  if (n < 4) return []
  const specs: Array<{ zone: 'early_mid' | 'late'; ratio: number; kind: HumanGreenWindowKind }> = [
    { zone: 'early_mid', ratio: 0.32, kind: 'dialogue_friction' },
    { zone: 'late', ratio: 0.72, kind: 'segment_dialogue_break' },
    { zone: 'late', ratio: 0.82, kind: 'incomplete_decision' },
  ]
  const out: Array<{ index: number; zone: 'early_mid' | 'late'; ratio: number; kind: HumanGreenWindowKind }> = []
  for (const spec of specs) {
    if (existingWindowPositions.some((p) => Math.abs(p - spec.ratio) < 0.12)) continue
    const index = Math.max(1, Math.min(n - 2, Math.floor(n * spec.ratio)))
    out.push({ index, zone: spec.zone, ratio: spec.ratio, kind: spec.kind })
  }
  // Keep at most 2 humanize targets (sparse); prefer friction + incomplete, drop boundary if both exist.
  if (out.length <= 2) return out
  const friction = out.find((t) => t.kind === 'dialogue_friction')
  const incomplete = out.find((t) => t.kind === 'incomplete_decision')
  const segBreak = out.find((t) => t.kind === 'segment_dialogue_break')
  const picked = [friction, incomplete, segBreak].filter(Boolean) as Array<{
    index: number
    zone: 'early_mid' | 'late'
    ratio: number
    kind: HumanGreenWindowKind
  }>
  return picked.slice(0, 2)
}
