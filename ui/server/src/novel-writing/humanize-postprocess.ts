/**
 * True post-process dual-pass humanize for finished chapter prose.
 *
 * Architecture (novel-writer-master + baibai/Bypass):
 *   finished prose → deterministic shell cleanup
 *   → local risk heatmap → rewrite ONLY high-risk segments (≤2 rounds)
 *   → optional full Pass A only when explicitly enabled (capped shrink)
 *   → Pass B OFF by default (texture pass raised Zhuque AI)
 *   → stitch → length/fingerprint gates
 *
 * Also absorbs B1lli/remove-ai-flavor-writing-skill shell rules:
 * binary contrast / staged sequence / essence claims / fiction cliches.
 * System-wide only — never chapter-specific offline tuning.
 */

import {
  HUMANIZE_DUAL_PASS_VERSION,
  buildHumanizeDualPassPromptDirectives,
  buildHumanizePassADirectives,
  buildHumanizePassBDirectives,
  buildHumanizeSharedOutputContract,
  selectHumanizeSafeProse,
  stripHumanizeChatWrapper,
  type HumanizeDualPassOptions,
} from './humanize-dual-pass'
import { countProseChars } from './word-target'

export const HUMANIZE_POSTPROCESS_VERSION = 'humanize_postprocess_v4'
export const HUMANIZE_CHUNK_LIMIT = 900

export type HumanizeChunk = {
  id: string
  index: number
  text: string
}

/** remove-ai-flavor high-priority shells (deterministic, preservation-first). */
const BINARY_CONTRAST_RE = /这?不是([^，。！？\n]{1,24})，?而是([^。！？\n]{1,40})[。！？]?/g
const NOT_BUT_RE = /并非([^，。！？\n]{1,24})，?而是([^。！？\n]{1,40})[。！？]?/g
const RATHER_RE = /与其说([^，。！？\n]{1,24})，?不如说([^。！？\n]{1,40})[。！？]?/g
const ESSENCE_RE = /真正(重要的是|决定[^，。]{0,12}的是|打动人的是)|本质上[，,]?|核心在于|底层逻辑/g
const SEQUENCE_RE = /先([^，。]{1,20})，再([^。！？]{1,30})[。！？]?/g
const ROUTE_MARKERS = [
  '下面我们来',
  '接下来我会',
  '我们可以看到',
  '希望这能帮到你',
  '总的来说',
  '值得注意的是',
  '不可否认的是',
  '在这个过程中',
  '这背后其实',
  '划重点',
  '说白了，',
]
const FICTION_CLICHES: Array<[RegExp, string]> = [
  [/不禁/g, ''],
  [/缓缓说道/g, '说'],
  [/淡淡地说/g, '说'],
  [/嘴角微扬/g, '嘴角动了一下'],
  [/勾起一抹弧度/g, '笑了一下'],
  [/心中暗道/g, ''],
  [/暗自思忖/g, ''],
  [/身形一顿/g, '脚步顿住'],
  [/脸色一变/g, '脸色沉了'],
]

/** Zhuque narrative packaging targets for Pass A structure rewrite (system-wide). */
export function buildZhuqueNarrativeRewriteDirectives(): string[] {
  return [
    '【朱雀叙事结构硬改 · 系统通用 · 成稿后处理】',
    'Z1. 临床讲义：删“常规死亡后体温每小时下降/指压充血/死僵/强直”科普句；改成一次触感 + 立刻选择/拒签动作。',
    'Z2. 否定连击：禁“没有心跳+没有呼吸+没有任何搏动”三联；只留一种否定，立刻接私心或对白。',
    'Z3. 多体包装：全章最多一次异常触感对象；禁止第三张平车/三具并排复检；后到对象只留差异点或被打断。',
    'Z4. 身份对号：禁止表格编号红叉+姓氏对号（姓林）；改成看不清残字立刻藏/被抢。',
    'Z5. 合规程序：压缩“知情同意/封控程序/放弃追责”长辩；改成当面推责短对白+未完成动作。',
    'Z6. 电梯lore/电影尾：禁止负一楼问号电梯定格、时间不多了升华；章末用未完成动作或半截对白收。',
    'Z7. 结构优先：宁可局部重写句骨，也不要同义替换保留模板包。',
    'Z8. 若本段含“生理学规律/病理反射/尸斑/合规交接/绿色通道/给你的时间不多了/秒针停住”，必须删除并改成一次触感+对白/未完成动作。',
    'Z9. 全章禁英文单词混入叙述；出现英文立即改成中文口语。',
    'Z10. 禁止氛围词刷屏（死死/绿荧荧/刺鼻/牙酸/蜘蛛网）；章末禁十二点/齿轮/秒针定格。',
    'Z11. 禁止临床三联总结句（心跳停止+瞳孔散大+无心音）；改一次触感后立刻对白/动作。',
    'Z12. Pass B 只删不增：不得为“更有人味”添加电影镜头与感官堆叠。',
    'Z13. 设备特写包装：删“走纸/尺子画直线/微小电信号/毫无波折”讲义；改一刀动作（撕纸/塞口袋/喊停）+半截私心。',
    'Z14. 多体复检流水线：禁止第二具/第三具同构复检（再摸温/再对尸斑/再比刚才那具）；后到对象最多一句差异后立刻被打断。',
    'Z15. 删包装后必须挂半截私心噪声在动作上（先别写进系统/这锅别背上/先把人支开），禁止删完只剩平滑临床流水。',
    'Z16. 禁规章条文号（规章第N条）与盖章胁迫长辩；改当面短推责+未完成动作。',
    'Z17. 禁口袋清点流水线（钥匙+卡+证件并列表）；最多留一件物件并立刻接藏/被抢动作。',
    'Z18. 禁章末证据复盘句（卡片、没心跳却热…）+电梯铁链/石灰味/门缝定格；改肩膀硬挤或半截对白收。',
    'Z19. 禁厘米倒计时门缝/不可逆收窄/防夹感应器；禁 B1 数字跳转与「顺延下一位」命运纸。',
    'Z20. 高风险只改局部：禁止为清包装而全文重写砍半（防 R67 回归）。',
    'Z21. 禁 B2 按键lore/合规告示墙/感应光幕/金属牌白条全揭/合规部运送禁触；章末只留未完成抢纸或挡门。',
    'Z22. 禁章末小牌/半截纸条/运送单禁触连环；门合时只挡门或半截骂声，不写物件编号。',
  ]
}

export function buildRemoveAiFlavorDirectives(): string[] {
  return [
    '【remove-ai-flavor 句壳清理 · 保留原意】',
    'R1. 二分对照壳：不是A而是B / 并非A而是B / 与其说A不如说B → 直接写具体关系或只留B。',
    'R2. 机械顺序壳：先A再B / 第一步第二步 → 无必要顺序时改成实际动作/条件/后果。',
    'R3. 本质拔高壳：真正重要的是/本质上/核心在于 → 直接点名对象与后果。',
    'R4. 助手路标/讲义腔：总的来说/值得注意的是/下面我们来 等删掉，直接进内容。',
    'R5. 小说套话：不禁/缓缓说道/淡淡地说/嘴角微扬/心中暗道 → 改成动作或对白，禁止评论腔。',
    'R6. 禁止同义词墙；只拆外壳，不改事实。',
  ]
}

/** Deterministic shell cleanup (free pass before LLM). */
export function sanitizeRemoveAiFlavorShells(text: string): string {
  let out = String(text || '')
  if (!out.trim()) return out

  out = out
    .replace(BINARY_CONTRAST_RE, '$2。')
    .replace(NOT_BUT_RE, '$2。')
    .replace(RATHER_RE, '$2。')
    .replace(ESSENCE_RE, '')
    .replace(SEQUENCE_RE, '$1，$2。')

  for (const marker of ROUTE_MARKERS) {
    out = out.split(marker).join('')
  }
  for (const [re, rep] of FICTION_CLICHES) {
    out = out.replace(re, rep)
  }

  // light tidy after deletions
  out = out
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/，{2,}/g, '，')
    .replace(/。{2,}/g, '。')
    .replace(/，。/g, '。')
    .replace(/^\s*。/gm, '')
    .trim()
  return out
}

export function chunkTextForHumanize(text: string, chunkLimit = HUMANIZE_CHUNK_LIMIT): HumanizeChunk[] {
  const src = String(text || '').replace(/\r/g, '').trim()
  if (!src) return []
  const paras = src.split(/\n\n+/)
  const chunks: HumanizeChunk[] = []
  let buf: string[] = []
  let bufChars = 0
  let index = 0

  const flush = () => {
    if (!buf.length) return
    const body = buf.join('\n\n').trim()
    if (!body) return
    chunks.push({ id: `c${index + 1}`, index, text: body })
    index += 1
    buf = []
    bufChars = 0
  }

  for (const para of paras) {
    const p = String(para || '').trim()
    if (!p) continue
    const chars = countProseChars(p)
    if (bufChars > 0 && bufChars + chars > chunkLimit) flush()
    // oversized single para: hard split by sentences
    if (chars > chunkLimit * 1.4) {
      flush()
      const parts = p.split(/(?<=[。！？!?])/)
      let local = ''
      for (const part of parts) {
        if (!part) continue
        if (countProseChars(local + part) > chunkLimit && local) {
          chunks.push({ id: `c${index + 1}`, index, text: local.trim() })
          index += 1
          local = part
        } else {
          local += part
        }
      }
      if (local.trim()) {
        chunks.push({ id: `c${index + 1}`, index, text: local.trim() })
        index += 1
      }
      continue
    }
    buf.push(p)
    bufChars += chars
  }
  flush()
  return chunks
}

export function stitchHumanizeChunks(chunks: HumanizeChunk[]): string {
  return chunks.map((c) => String(c.text || '').trim()).filter(Boolean).join('\n\n')
}

export function buildHumanizePostProcessPassPrompt(input: {
  pass: 'A' | 'B'
  chunk: HumanizeChunk
  totalChunks: number
  project?: any
}): string {
  const pass = input.pass
  const lines = [
    pass === 'A'
      ? '任务：对小说正文片段执行 Humanize Pass A（结构重写）。只输出改写后正文。'
      : '任务：对小说正文片段执行 Humanize Pass B（人味增强）。只输出改写后正文。',
    `片段 ${input.chunk.index + 1}/${input.totalChunks} id=${input.chunk.id}`,
    ...buildHumanizeSharedOutputContract({ project: input.project }),
    ...(pass === 'A'
      ? [
          ...buildHumanizePassADirectives(),
          ...buildZhuqueNarrativeRewriteDirectives(),
          ...buildRemoveAiFlavorDirectives(),
        ]
      : buildHumanizePassBDirectives()),
    '禁止输出说明、前后缀、markdown。若本段有包装壳（临床三联/程序合规/电影定格/感官流水线/章末升华），必须删改；仅当无包装壳时才可小改后返回。不得空白。',
    '【原文片段】',
    input.chunk.text,
  ]
  return lines.join('\n')
}

export function buildHumanizePostProcessStageBrief(): string[] {
  return [
    `【${HUMANIZE_POSTPROCESS_VERSION}】成稿后双轮人性化（baibai/Bypass 架构 + remove-ai-flavor 句壳）。`,
    '先确定性清句壳，再分段 Pass A 结构重写，再分段 Pass B 人味增强。',
    '不改事实；字数±10%；结构重写优先同义替换。',
    ...buildHumanizeDualPassPromptDirectives({ pass: 'AB' }).slice(0, 6),
  ]
}

export type HumanizeCandidateProvenance = ({
  scope: 'pre_quality'
  stage: 'pre_quality'
} | {
  scope: 'post_quality'
  stage: 'post_quality'
}) & {
  humanize_input_hash: string
  humanize_output_hash: string
  final_candidate_hash: string
  superseded_by_quality_revision: boolean
}

export type HumanizePostProcessReport = {
  version: string
  dual_pass_version: string
  enabled: boolean
  skipped?: boolean
  reason?: string
  before_chars: number
  after_chars: number
  chunk_count: number
  pass_a_applied: boolean
  pass_b_applied: boolean
  deterministic_shells: boolean
  accepted: boolean
  reject_reason?: string
  stages: Array<Record<string, any>>
  /** Locked default anti-AIGC stack id (R76 high-water baseline). */
  r76_zhuque_stack?: string
  candidate_provenance?: HumanizeCandidateProvenance
}

export function buildEmptyHumanizePostProcessReport(
  text: string,
  extra: Partial<HumanizePostProcessReport> = {},
): HumanizePostProcessReport {
  const chars = countProseChars(text)
  return {
    version: HUMANIZE_POSTPROCESS_VERSION,
    dual_pass_version: HUMANIZE_DUAL_PASS_VERSION,
    enabled: false,
    before_chars: chars,
    after_chars: chars,
    chunk_count: 0,
    pass_a_applied: false,
    pass_b_applied: false,
    deterministic_shells: false,
    accepted: true,
    stages: [],
    ...extra,
  }
}

/** Accept candidate after dual-pass with humanize length + optional fingerprint caller. */
export function acceptHumanizePostProcessCandidate(
  beforeText: string,
  afterText: string,
  options: HumanizeDualPassOptions = {},
): { text: string; accepted: boolean; reason: string } {
  const stripped = stripHumanizeChatWrapper(afterText)
  const gate = selectHumanizeSafeProse(beforeText, stripped, options)
  if (!gate.accepted) {
    return { text: beforeText, accepted: false, reason: gate.reason }
  }
  // Reject empty-ish collapse
  if (countProseChars(gate.text) < Math.max(40, Math.floor(countProseChars(beforeText) * 0.5))) {
    return { text: beforeText, accepted: false, reason: 'humanize_postprocess_collapsed' }
  }
  return { text: gate.text, accepted: true, reason: '' }
}
