import { anchorMatchScore } from './text-matching'
import { buildHardOpeningObligationsFromPrevious } from './chapter-continuity-guard'

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null || value === '') return []
  return [value]
}

function compactBriefText(value: any, fallback = '') {
  return String(value || fallback || '').replace(/\s+/g, ' ').trim()
}

function uniqueBriefStrings(values: any, limit = 12) {
  const seen = new WeakSet<object>()
  const flattenBriefValues = (value: any, depth = 0): any[] => {
    if (depth > 6) return []
    if (Array.isArray(value)) return value.flatMap(item => flattenBriefValues(item, depth + 1))
    if (value && typeof value === 'object') {
      if (seen.has(value)) return []
      seen.add(value)
      return Object.values(value).flatMap(item => flattenBriefValues(item, depth + 1))
    }
    return value ? [value] : []
  }
  return Array.from(new Set(flattenBriefValues(values)
    .map(value => compactBriefText(value))
    .filter(Boolean))).slice(0, limit)
}

function handoffContractItemText(item: any) {
  if (typeof item === 'string') return compactBriefText(item)
  return compactBriefText(item?.text || item?.label || item?.name || item?.summary || item?.detail || item?.title || item?.issue)
}

export function chapterHandoffItems(values: any) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const item of asArray(values)) {
    const normalized = handoffContractItemText(item)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
    if (result.length >= 12) break
  }
  return result
}

export function chapterHandoffNegativeScope(text: string) {
  return /没有处理上一章|没有接住|暂时不重要|忘在一边|新剧情直接开始|直接重开新场景|重开新场景|没有立刻处理/.test(text)
}

export function normalizeChapterHandoffDeliveryCheck(
  key: string,
  label: string,
  values: any,
  chapterText: string,
  options: { openingOnly?: boolean; threshold?: number; minDelivered?: number } = {},
) {
  const planned = chapterHandoffItems(values)
  if (!planned.length) return null
  const scopedText = options.openingOnly ? String(chapterText || '').slice(0, 900) : String(chapterText || '')
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, scopedText) }))
  const deliveredItems = scored.filter(item => item.match.score >= Number(options.threshold || 36)).length
  const blocked = chapterHandoffNegativeScope(scopedText)
  const delivered = !blocked && deliveredItems >= Number(options.minDelivered || Math.max(1, Math.ceil(planned.length * 0.4)))
  return {
    key,
    label,
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.min(Math.max(12, deliveredItems * 24), blocked ? 22 : 66),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      blocked ? '正文出现未承接上一章的负向信号' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, scopedText).score < Number(options.threshold || 36)).slice(0, 8),
    issue: delivered ? '' : `${label}没有按安全连写契约落地，章节衔接可能断裂。`,
    repair_instruction: delivered ? '' : `${options.openingOnly ? '开篇前300字' : '正文'}必须补${label}：用现场动作、对话、规则判定、线索推进或章末问题接住上一章，不要重开无关新场景。`,
    match_scope: options.openingOnly ? 'opening' : 'full',
  }
}

export function buildChapterHandoffDeterministicCheck(chapterText: string) {
  const text = String(chapterText || '')
  const risks = [
    /没有处理上一章|没有接住/.test(text) ? {
      key: 'no_previous_handoff',
      label: '未接上一章',
      evidence: '正文直接承认没有处理或没有接住上一章。',
      fix: '开篇先处理上一章最后一幕、角色反应和连续危机。',
    } : null,
    /暂时不重要|忘在一边/.test(text) ? {
      key: 'expectation_dropped',
      label: '期待债断线',
      evidence: '正文把上一章期待债务写成暂时不重要或忘在一边。',
      fix: '把期待债转成现场追问、规则判定、线索推进或保活提示。',
    } : null,
    /新剧情直接开始|直接重开新场景|重开新场景/.test(text) ? {
      key: 'new_scene_without_bridge',
      label: '无桥接重开',
      evidence: '正文直接开始新剧情或新场景，缺少章首桥接。',
      fix: '先用上一章最后一幕和本章开篇义务建立桥接，再进入新场景。',
    } : null,
  ].filter(Boolean)
  if (!risks.length) return null
  return {
    key: 'chapter_handoff_forbidden',
    label: '章首承接硬伤',
    text: '安全连写不得无视上一章最后一幕、丢弃期待债或无桥接重开新场景。',
    expected: '安全连写不得无视上一章最后一幕、丢弃期待债或无桥接重开新场景。',
    score: Math.max(0, 100 - risks.length * 28),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项章首承接确定性风险。`,
    repair_instruction: '按 oh-story workflow-daily 修复：下一章必须读取上一章正文和追踪更新，开篇先承接上一章最后一幕、角色反应和期待欠账。',
  }
}

export function chapterHandoffPriority(missed: any[]) {
  if (missed.some(item => item.key === 'chapter_handoff_forbidden')) return '优先清章首硬伤'
  if (missed.some(item => item.key === 'previous_handoff')) return '优先接上一章最后一幕'
  if (missed.some(item => item.key === 'opening_obligations')) return '优先补开篇义务'
  if (missed.some(item => item.key === 'overdue')) return '优先补逾期待办'
  if (missed.some(item => item.key === 'must_deliver')) return '优先补必兑现项'
  return ''
}


const HANDOFF_ANCHOR_STOPWORDS = new Set([
  '上一章', '最后一幕', '章末钩子', '然后', '已经', '正在', '突然', '这个', '那个', '一个', '没有', '什么', '自己', '他们', '我们', '继续', '开始', '随后', '之后',
  '迎面', '高高', '狠狠', '手里', '手中', '走来', '逼近', '站在', '看着', '走出', '时间',
])

const PRIORITY_HANDOFF_TOKENS = [
  '医生办公室', '电击棍', '暗金绢册', '地下通道', '世界权柄碎片', '权柄碎片', '古老意志', '医院改制声明',
  '钥匙', '融化', '护士', '保安', '铁链', '绢册', '发热', '老陈',
  '电击', '宵禁', '走廊', '病房', '注射器', '药丸', '怪物', '院长', '巨眼', '金光',
]

function isQualityHandoffAnchor(value: string) {
  if (!value || value.length < 2 || value.length > 8) return false
  if (HANDOFF_ANCHOR_STOPWORDS.has(value)) return false
  if (!/^[\p{Script=Han}]{2,8}$/u.test(value)) return false
  if (/^[了着的在把被将与和及上向下对从向它他她]/u.test(value)) return false
  if (/(?:着向|巡逻的|狞笑|迎面|高高|狠狠|手里|手中|认路|追上来)/u.test(value)) return false
  if (/(?:开始|痛苦|然后|已经|正在|走来|逼近|认路|上来)$/u.test(value)) return false
  // Drop pure onomatopoeia / filler speech crumbs from ending excerpts.
  if (/^(?:滋|啊|哦|嗯|哈|嘿){2,}$/u.test(value)) return false
  if (/小耗子|玩具|愚蠢|地瘫倒|瘫倒/.test(value)) return false
  if (/^[地得了着把被]/.test(value)) return false
  // Prefer short concrete tokens; long free phrases must be known priority entities.
  if (value.length > 4 && !PRIORITY_HANDOFF_TOKENS.includes(value)) return false
  return true
}


function scopeContainsHandoffAnchor(scope: string, anchor: string) {
  const text = compactBriefText(scope)
  const token = compactBriefText(anchor)
  if (!text || !token) return false
  if (text.includes(token)) return true
  if (token === '巨眼' && text.includes('巨大眼睛')) return true
  if (token === '巨大眼睛' && text.includes('巨眼')) return true
  if (token === '权柄碎片' && (text.includes('金色碎片') || text.includes('世界权柄碎片'))) return true
  if (token === '世界权柄碎片' && text.includes('权柄碎片')) return true
  if (token === '金色碎片' && (text.includes('权柄碎片') || text.includes('世界权柄碎片'))) return true
  return false
}

function preferHandoffAnchor(existing: string, incoming: string) {
  const existingPriority = PRIORITY_HANDOFF_TOKENS.includes(existing)
  const incomingPriority = PRIORITY_HANDOFF_TOKENS.includes(incoming)
  if (existingPriority !== incomingPriority) return incomingPriority ? incoming : existing
  // For known priority tokens, keep the more complete phrase (电击棍 > 电击).
  if (existingPriority && incomingPriority && existing.length !== incoming.length) {
    return existing.length >= incoming.length ? existing : incoming
  }
  // Prefer shorter canonical tokens for generic overlapping captures.
  if (existing.length !== incoming.length) return existing.length <= incoming.length ? existing : incoming
  return existing
}

function pushUniqueAnchor(list: string[], value: any, limit = 8) {
  let text = compactBriefText(value)
  text = text.replace(/^[了着的在把被将]+/u, '').replace(/[的地得了着过]$/u, '').trim()
  if (!isQualityHandoffAnchor(text)) return
  const overlapIdx = list.findIndex(item => item === text || item.includes(text) || text.includes(item))
  if (overlapIdx >= 0) {
    list[overlapIdx] = preferHandoffAnchor(list[overlapIdx], text)
    return
  }
  list.push(text)
  if (list.length > limit) list.length = limit
}

export function extractStrongHandoffAnchors(input: {
  previousHandoff?: any
  endingHook?: any
  endingExcerpt?: any
  existing?: any
} = {}): string[] {
  const existing = chapterHandoffItems(input.existing)
  const anchors: string[] = []
  for (const item of existing) pushUniqueAnchor(anchors, item)

  const hook = compactBriefText(input.endingHook)
  const handoff = compactBriefText(input.previousHandoff)
  const excerpt = compactBriefText(input.endingExcerpt)
  const hookFromHandoff = compactBriefText((handoff.match(/章末钩子：([^；;]+)/) || [])[1] || '')
  const excerptTail = excerpt
    ? compactBriefText(excerpt.slice(Math.max(0, excerpt.length - 360)))
    : ''
  const sources = [
    hook,
    hookFromHandoff,
    handoff.slice(0, 220),
    excerptTail,
  ].filter(Boolean)
  if (!sources.length) return anchors.slice(0, 8)

  for (const source of sources) {
    // Priority tokens first so weak phrase captures cannot dominate the budget.
    for (const token of PRIORITY_HANDOFF_TOKENS) {
      if (source.includes(token)) pushUniqueAnchor(anchors, token)
    }

    for (const match of source.matchAll(/[“"『「]([^”"』」]{2,16})[”"』」]/g)) {
      const quoted = compactBriefText(match[1])
      for (const part of quoted.split(/[，。！？、；：\s]+/).filter(Boolean)) {
        if (part.length >= 2 && part.length <= 6) pushUniqueAnchor(anchors, part)
      }
      if (/钥匙/.test(quoted)) pushUniqueAnchor(anchors, '钥匙')
      if (/办公室/.test(quoted)) pushUniqueAnchor(anchors, '办公室')
    }

    const targeted = [
      /([\p{Script=Han}]{2,6})钥匙/gu,
      /医生办公室/gu,
      /电击棍/gu,
      /世界权柄碎片/gu,
      /权柄碎片/gu,
      /古老意志/gu,
      /巨大眼睛/gu,
      /([\p{Script=Han}]{2,3})(?=在地上|爬行|融化)/gu,
      /(?:一脚踩在|踩住|扶着|护着|追着)([\p{Script=Han}]{1,4})/gu,
      /(?:迎面撞上了?|撞上了?)([\p{Script=Han}]{2,4})/gu,
      /(?:拿着|握住|举起)([\p{Script=Han}]{2,4})/gu,
    ]
    for (const pattern of targeted) {
      for (const match of source.matchAll(pattern)) {
        if (match[0] === '医生办公室' || match[0] === '电击棍' || match[0] === '世界权柄碎片' || match[0] === '权柄碎片' || match[0] === '古老意志') {
          pushUniqueAnchor(anchors, match[0])
        } else if (match[0] === '巨大眼睛') {
          pushUniqueAnchor(anchors, '巨眼')
        } else if (match[1]) {
          pushUniqueAnchor(anchors, match[1])
        } else {
          pushUniqueAnchor(anchors, match[0])
        }
      }
    }
    if (source.includes('巨大眼睛') || source.includes('巨眼')) {
      pushUniqueAnchor(anchors, '巨眼')
      if (source.includes('巨大眼睛')) pushUniqueAnchor(anchors, '巨大眼睛')
    }
    if (source.includes('权柄碎片')) pushUniqueAnchor(anchors, source.includes('世界权柄碎片') ? '世界权柄碎片' : '权柄碎片')
    if (source.includes('金色碎片')) pushUniqueAnchor(anchors, '金色碎片')
    if (source.includes('古老意志')) pushUniqueAnchor(anchors, '古老意志')
    if (source.includes('江哲')) pushUniqueAnchor(anchors, '江哲')
    if (source.includes('阿奇姆')) pushUniqueAnchor(anchors, '阿奇姆')
    if (source.includes('青铜巨门')) pushUniqueAnchor(anchors, '青铜巨门')
    if (source.includes('血肉王座')) pushUniqueAnchor(anchors, '血肉王座')
    if (source.includes('1号楼')) pushUniqueAnchor(anchors, '1号楼')

    for (const match of source.matchAll(/([\p{Script=Han}]{2})(?=一脚|冷冷|逼问|追问|扶着|退到|握住|压进|走出|撞上|站在)/gu)) {
      pushUniqueAnchor(anchors, match[1])
    }
  }

  // Stable order: priority tokens, then remaining short anchors.
  const priority = PRIORITY_HANDOFF_TOKENS.filter(token => anchors.includes(token))
  const rest = anchors.filter(item => !priority.includes(item))
  return [...priority, ...rest].slice(0, 8)
}

export function compactHandoffObligation(previousHandoff: any, transition = '') {
  const handoff = compactBriefText(previousHandoff)
  const bridge = compactBriefText(transition)
  if (!handoff && !bridge) return ''

  // Already a compact unresolved action without labeled sections.
  if (!/章末钩子：|最后一幕：/.test(handoff)) {
    const short = handoff.length > 180 ? `${handoff.slice(0, 120)}…${handoff.slice(-50)}` : handoff
    return bridge ? `${short}；${bridge}` : short
  }

  const hook = compactBriefText((handoff.match(/章末钩子：([^；;]+)/) || [])[1] || '')
  const lastActRaw = compactBriefText((handoff.match(/最后一幕：([\s\S]*)/) || [])[1] || '')
  // Strip trailing labeled noise if any.
  const lastAct = compactBriefText(lastActRaw.split(/；\s*章末钩子：/)[0] || lastActRaw)
  const core = pickCoreHandoffObligation(hook, lastAct) || hook || lastAct || handoff
  const short = core.length > 180 ? `${core.slice(0, 120)}…${core.slice(-50)}` : core
  return bridge ? `${short}；${bridge}` : short
}

function isInformativeHandoffTail(text: string) {
  const value = compactBriefText(text)
  if (!value || value.length < 12) return false
  if (extractStrongHandoffAnchors({ endingExcerpt: value }).length >= 1) return true
  return /[“"『「]|突然|瞬间|然而|可是|却|竟|砸|睁|降临|追问|问道|触碰|摸了过去|悬浮|剥离|举起|走来|逼近|锁定|异变/.test(value)
}

function pickCoreHandoffObligation(hook: string, lastAct: string) {
  if (!hook) return lastAct
  if (!lastAct) return hook
  if (!isInformativeHandoffTail(lastAct)) return hook

  const hookAnchors = extractStrongHandoffAnchors({ endingHook: hook })
  const lastAnchors = extractStrongHandoffAnchors({ endingExcerpt: lastAct })
  const shared = hookAnchors.filter(anchor => (
    lastAct.includes(anchor)
    || lastAnchors.some(item => item === anchor || item.includes(anchor) || anchor.includes(item))
  ))
  const diverged = hookAnchors.length >= 2 && shared.length < Math.min(2, hookAnchors.length)
  if (diverged) return lastAct
  if (lastAct.length >= 48 && (shared.length >= 1 || lastAnchors.length >= 2)) return lastAct
  if (hook.length <= 120 && shared.length >= 1 && lastAct.length > hook.length * 1.8) return lastAct
  return hook
}

function extractUnresolvedActionFromTail(excerpt: any) {
  const text = compactBriefText(excerpt)
  if (!text) return ''
  const sentences = text
    .split(/(?<=[。！？!?])/)
    .map(item => compactBriefText(item))
    .filter(Boolean)
  if (!sentences.length) return text.slice(-160)
  let output = ''
  for (let index = sentences.length - 1; index >= 0; index -= 1) {
    output = `${sentences[index]}${output}`
    if (output.length >= 60 && sentences.length - index >= 2) break
    if (output.length >= 180) break
  }
  const compact = compactBriefText(output)
  if (compact.length > 200) return `${compact.slice(0, 140)}…${compact.slice(-50)}`
  return compact || text.slice(-160)
}

export type OutgoingChapterHandoff = {
  version: 'chapter_outgoing_handoff_v1'
  source: 'chapter_text_tail' | 'ending_hook_fallback' | 'merged'
  unresolved_action: string
  anchors: string[]
  ending_excerpt: string
  declared_hook: string
  hook_tail_divergence: boolean
  confidence: number
}

export function resolveOutgoingChapterHandoff(input: {
  chapterText?: any
  endingHook?: any
  existingAnchors?: any
} = {}): OutgoingChapterHandoff | null {
  const chapterText = String(input.chapterText || '')
  const declaredHook = compactBriefText(input.endingHook)
  const endingExcerpt = chapterText
    ? compactBriefText(chapterText.slice(Math.max(0, chapterText.length - 800)))
    : ''
  if (!endingExcerpt && !declaredHook) return null

  const tailAction = extractUnresolvedActionFromTail(endingExcerpt)
  const actionWindow = compactBriefText(tailAction || endingExcerpt.slice(-320))
  const hookAnchors = extractStrongHandoffAnchors({ endingHook: declaredHook })
  const tailAnchors = extractStrongHandoffAnchors({
    endingExcerpt: actionWindow || endingExcerpt,
    existing: input.existingAnchors,
  })
  const sharedInAction = hookAnchors.filter(anchor => actionWindow.includes(anchor))
  const informativeTail = isInformativeHandoffTail(actionWindow || endingExcerpt)
  const hook_tail_divergence = Boolean(
    declaredHook
    && informativeTail
    && (
      (hookAnchors.length >= 1 && sharedInAction.length < Math.min(2, Math.max(1, hookAnchors.length)))
      || !hookAnchors.slice(0, 3).some(anchor => actionWindow.includes(anchor))
    ),
  )

  let unresolved_action = ''
  let source: OutgoingChapterHandoff['source'] = 'ending_hook_fallback'
  if (endingExcerpt) {
    unresolved_action = hook_tail_divergence
      ? (tailAction || endingExcerpt.slice(-160))
      : pickCoreHandoffObligation(declaredHook, tailAction || endingExcerpt.slice(-160))
    source = declaredHook && !hook_tail_divergence ? 'merged' : 'chapter_text_tail'
  } else {
    unresolved_action = declaredHook
    source = 'ending_hook_fallback'
  }
  unresolved_action = compactBriefText(unresolved_action)

  // Anchors must come from the obligation actually enforced next chapter, not stale hook-only tokens.
  const anchors = extractStrongHandoffAnchors({
    endingHook: '',
    endingExcerpt: unresolved_action || actionWindow,
    previousHandoff: `最后一幕：${unresolved_action || actionWindow}`,
    existing: asArray(input.existingAnchors),
  }).filter(anchor => scopeContainsHandoffAnchor(unresolved_action || actionWindow, anchor)).slice(0, 8)

  return {
    version: 'chapter_outgoing_handoff_v1',
    source,
    unresolved_action,
    anchors,
    ending_excerpt: endingExcerpt.slice(-420),
    declared_hook: declaredHook,
    hook_tail_divergence,
    confidence: endingExcerpt
      ? (hook_tail_divergence ? 0.92 : (declaredHook ? 0.86 : 0.8))
      : 0.42,
  }
}

export function formatOutgoingHandoffAsPrevious(outgoing: any, label = '') {
  if (!outgoing || typeof outgoing !== 'object') return ''
  const unresolved = compactBriefText(outgoing.unresolved_action || outgoing.unresolvedAction)
  if (!unresolved) return ''
  const declared = compactBriefText(outgoing.declared_hook || outgoing.declaredHook)
  const diverged = Boolean(outgoing.hook_tail_divergence || outgoing.hookTailDivergence)
  const body = diverged || !declared
    ? `最后一幕：${unresolved}`
    : `章末钩子：${declared}；最后一幕：${unresolved}`
  const prefix = compactBriefText(label)
  return prefix ? `${prefix} ${body}` : body
}

export function readChapterOutgoingHandoff(chapter: any = {}): OutgoingChapterHandoff | null {
  const raw = chapter?.raw_payload || chapter?.rawPayload || {}
  const stored = raw.outgoing_handoff || raw.outgoingHandoff || chapter?.outgoing_handoff || chapter?.outgoingHandoff
  if (stored && typeof stored === 'object' && compactBriefText(stored.unresolved_action || stored.unresolvedAction)) {
    return {
      version: 'chapter_outgoing_handoff_v1',
      source: stored.source || 'chapter_text_tail',
      unresolved_action: compactBriefText(stored.unresolved_action || stored.unresolvedAction),
      anchors: chapterHandoffItems(stored.anchors),
      ending_excerpt: compactBriefText(stored.ending_excerpt || stored.endingExcerpt),
      declared_hook: compactBriefText(stored.declared_hook || stored.declaredHook),
      hook_tail_divergence: Boolean(stored.hook_tail_divergence || stored.hookTailDivergence),
      confidence: Number(stored.confidence || 0) || 0.8,
    }
  }
  return resolveOutgoingChapterHandoff({
    chapterText: chapter?.chapter_text || chapter?.chapterText || '',
    endingHook: chapter?.ending_hook || chapter?.endingHook || '',
  })
}

const MULTI_BEAT_JUMP_PATTERN = /一路来到|随后|然后|接着|紧接着|准备开始|直接来到|来到.{0,12}(?:室|房|厅|办公室|通道|楼梯|门口)|转身离开|离开后|进入.{0,8}(?:室|房|厅)/u
const RESULT_SKIP_PATTERN = /成功夺取|已成功|已经夺取|完美通关|宣告.{0,8}通关|通关条件|迷雾.{0,10}退散|举国狂欢|全球直播间|重见天日|获得.{0,10}(?:身份|权柄|奖励|碎片)|瞬间获得|副本判定|达成完美/u
const OPENING_HANDOFF_PRIORITY_PATTERN = /先承接|先处理|开篇先|接住上一章|未完成动作|交接锚点|因果桥/u

export function openingPlanSkipsStrongHandoff(planText: any, anchors: string[] = [], previousHandoff: any = '') {
  const text = compactBriefText(planText)
  if (!text) return false
  if (OPENING_HANDOFF_PRIORITY_PATTERN.test(text)) return false
  const compact = compactHandoffObligation(previousHandoff)
  const source = compact || compactBriefText(previousHandoff)
  if (!source) return false

  const hitAnchors = anchors.filter(anchor => anchor && text.includes(anchor)).length
  const multiBeatJump = MULTI_BEAT_JUMP_PATTERN.test(text)
  const resultSkip = RESULT_SKIP_PATTERN.test(text)
  const earlyWindow = text.slice(0, Math.min(48, text.length))
  const earlyAnchorHit = anchors.some(anchor => anchor && earlyWindow.includes(anchor))
  const sourceTokens = Array.from(new Set(
    (source.match(/[\p{Script=Han}]{2,6}/gu) || [])
      .filter(token => !/第\d+章|章末|钩子|最后|一幕/.test(token)),
  )).slice(0, 12)
  const earlySourceHit = sourceTokens.some(token => earlyWindow.includes(token))

  // Multi-beat seeds pack "resolve previous crisis + jump to new setpiece" into one plan line.
  if (multiBeatJump) return true
  // Result-skip seeds treat the previous unresolved climax as already finished.
  if (resultSkip) return true
  // Pure new-setpiece open with no shared anchors/source tokens.
  if (!earlyAnchorHit && !earlySourceHit && hitAnchors === 0 && text.length >= 12) {
    return true
  }
  return false
}

export function buildHandoffFirstOpeningPurpose(previousHandoff: any, anchors: string[] = [], originalPurpose: any = '') {
  const compact = compactHandoffObligation(previousHandoff) || compactBriefText(previousHandoff)
  const anchorText = anchors.slice(0, 4).join('、')
  const original = compactBriefText(originalPurpose)
  const head = compact
    ? `开篇先接住上一章未完成动作：${compact}`
    : '开篇先接住上一章未完成动作与现场危机'
  const anchorPart = anchorText ? `；必须保留交接锚点：${anchorText}` : ''
  const later = original && !openingPlanSkipsStrongHandoff(original, anchors, previousHandoff)
    ? `；完成承接后再推进：${original}`
    : original
      ? `；完成承接后再进入本章后续目标，不得开篇直接跳到新地点/新副本`
      : '；完成承接后再进入本章后续目标，不得开篇直接跳到新地点/新副本'
  return compactBriefText(`${head}${anchorPart}${later}`)
}

export function alignChapterOpeningToPreviousHandoff(input: {
  target?: any
  previousHandoff?: any
  anchors?: string[]
  endingHook?: any
  endingExcerpt?: any
} = {}) {
  const target = input.target && typeof input.target === 'object' ? { ...input.target } : {}
  const previousHandoff = compactBriefText(input.previousHandoff || target.previous_handoff || target.previousHandoff)
  const anchors = chapterHandoffItems(input.anchors || target.requiredHandoffAnchors || target.required_handoff_anchors)
  if (!previousHandoff && !anchors.length) return target

  const compact = compactHandoffObligation(previousHandoff)
  const forcedTransition = compact || previousHandoff
  const blueprint = {
    ...(target.chapter_blueprint || target.chapterBlueprint || {}),
  }
  const goal = compactBriefText(target.goal || target.chapter_goal || target.chapterGoal)
  const summary = compactBriefText(target.summary || target.chapter_summary || target.chapterSummary)
  const openingHook = compactBriefText(blueprint.opening_hook || blueprint.openingHook || target.opening_hook || target.openingHook)
  const needsGoalAlign = openingPlanSkipsStrongHandoff(goal, anchors, previousHandoff)
  const needsSummaryAlign = openingPlanSkipsStrongHandoff(summary, anchors, previousHandoff)
  const needsHookAlign = openingPlanSkipsStrongHandoff(openingHook, anchors, previousHandoff)

  const sceneCards = asArray(target.scene_cards || target.sceneCards).map((card: any, index: number) => {
    if (!card || typeof card !== 'object' || index !== 0) return card
    const purpose = compactBriefText(card.purpose || card.scene_purpose || card.scenePurpose)
    const title = compactBriefText(card.title || card.scene_title || card.sceneTitle)
    const transition = compactBriefText(card.transition_from_previous || card.transitionFromPrevious)
    const purposeSkips = openingPlanSkipsStrongHandoff(purpose, anchors, previousHandoff)
      || openingPlanSkipsStrongHandoff(title, anchors, previousHandoff)
    const next: any = {
      ...card,
      transition_from_previous: transition || forcedTransition,
      transitionFromPrevious: transition || forcedTransition,
    }
    if (purposeSkips || !purpose) {
      next.purpose = buildHandoffFirstOpeningPurpose(previousHandoff, anchors, purpose)
      next.scene_purpose = next.purpose
    }
    if (purposeSkips && title && openingPlanSkipsStrongHandoff(title, anchors, previousHandoff)) {
      next.title = '承接上一章未完成动作'
      next.scene_title = next.title
    }
    return next
  })

  if (needsGoalAlign && goal) {
    target.goal = buildHandoffFirstOpeningPurpose(previousHandoff, anchors, goal)
    target.chapter_goal = target.goal
  }
  if (needsSummaryAlign && summary) {
    target.summary = buildHandoffFirstOpeningPurpose(previousHandoff, anchors, summary)
    target.chapter_summary = target.summary
  }
  if ((needsHookAlign || !openingHook) && (previousHandoff || anchors.length)) {
    const alignedHook = buildHandoffFirstOpeningPurpose(previousHandoff, anchors, openingHook)
    blueprint.opening_hook = alignedHook
    blueprint.openingHook = alignedHook
    target.chapter_blueprint = blueprint
    target.chapterBlueprint = blueprint
    target.opening_hook = alignedHook
  } else if (Object.keys(blueprint).length) {
    target.chapter_blueprint = blueprint
    target.chapterBlueprint = blueprint
  }

  if (sceneCards.length) {
    target.scene_cards = sceneCards
    target.sceneCards = sceneCards
  }

  target.handoff_opening_alignment = {
    aligned: needsGoalAlign || needsSummaryAlign || needsHookAlign || sceneCards.some((card: any, index: number) => {
      if (index !== 0 || !card || typeof card !== 'object') return false
      return Boolean(card.transition_from_previous)
    }),
    multi_beat_goal_realigned: needsGoalAlign,
    result_skip_realigned: needsGoalAlign && RESULT_SKIP_PATTERN.test(goal),
    required_anchors: anchors.slice(0, 8),
  }

  return target
}

export function buildOpeningObligationsFromHandoff(previousHandoff: any, anchors: string[] = []) {
  const compact = compactHandoffObligation(previousHandoff)
  const obligations: string[] = []
  if (compact) obligations.push(`开篇前300字先承接：${compact}`)
  if (anchors.length) obligations.push(`开篇必须保留交接锚点：${anchors.slice(0, 6).join('、')}`)
  obligations.push('不得跳过上一章未完成动作直接开新目标；若时空转移，必须写出明确因果桥。')
  obligations.push('若本章目标包含“解决上一章危机后进入新地点/新副本/通关结算”，必须先完整写完上一章未完成动作，再转移场景或宣布结果。')
  return obligations
}

export function enrichContextWithStrongHandoff(contextPackage: any = {}) {
  const context = contextPackage && typeof contextPackage === 'object' ? contextPackage : {}
  const target = {
    ...(context.chapter_target || {}),
    ...(context.chapterTarget || {}),
  }
  const previous = context.continuity?.previous_chapter || context.continuity?.previousChapter || {}
  const outgoing = previous?.outgoing_handoff || previous?.outgoingHandoff || context.previous_outgoing_handoff || context.previousOutgoingHandoff || null
  const formattedOutgoing = formatOutgoingHandoffAsPrevious(outgoing)
  const previousHandoff = compactBriefText(
    formattedOutgoing
    || target.previous_handoff
    || target.previousHandoff
    || context.previous_handoff
    || context.previousHandoff,
  )
  const endingHook = compactBriefText(
    (outgoing && !outgoing.hook_tail_divergence ? outgoing.declared_hook : '')
    || previous?.ending_hook
    || previous?.endingHook,
  )
  const endingExcerpt = compactBriefText(
    outgoing?.ending_excerpt
    || outgoing?.unresolved_action
    || previous?.ending_excerpt
    || previous?.endingExcerpt,
  )
  if (!previousHandoff && !endingHook && !endingExcerpt) {
    return context
  }

  const resolvedOutgoing = outgoing?.unresolved_action
    ? outgoing
    : resolveOutgoingChapterHandoff({
      chapterText: previous?.chapter_text || previous?.chapterText || endingExcerpt,
      endingHook: previous?.ending_hook || previous?.endingHook || endingHook,
    })

  const preferredHandoff = compactBriefText(
    formatOutgoingHandoffAsPrevious(resolvedOutgoing)
    || previousHandoff
    || endingHook,
  )

  const obligationCore = compactHandoffObligation(preferredHandoff) || preferredHandoff
  const anchors = chapterHandoffItems([
    ...(asArray(resolvedOutgoing?.anchors)),
    ...extractStrongHandoffAnchors({
      previousHandoff: preferredHandoff,
      endingHook: resolvedOutgoing?.hook_tail_divergence ? '' : '',
      endingExcerpt: resolvedOutgoing?.unresolved_action || obligationCore,
      existing: asArray(target.requiredHandoffAnchors || target.required_handoff_anchors || context.requiredHandoffAnchors),
    }),
  ]).filter(anchor => scopeContainsHandoffAnchor(obligationCore, anchor) || scopeContainsHandoffAnchor(String(resolvedOutgoing?.unresolved_action || ''), anchor))
  const alignedTarget = alignChapterOpeningToPreviousHandoff({
    target: {
      ...target,
      previous_handoff: preferredHandoff,
      requiredHandoffAnchors: anchors,
      required_handoff_anchors: anchors,
    },
    previousHandoff: preferredHandoff,
    anchors,
    endingHook,
    endingExcerpt: resolvedOutgoing?.ending_excerpt || endingExcerpt,
  })
  const openingObligations = chapterHandoffItems([
    ...(asArray(alignedTarget.opening_obligations || alignedTarget.openingObligations)),
    ...buildOpeningObligationsFromHandoff(preferredHandoff, anchors),
    ...buildHardOpeningObligationsFromPrevious(previous),
  ])

  const enrichedTarget = {
    ...alignedTarget,
    previous_handoff: preferredHandoff,
    previousHandoff: preferredHandoff,
    previous_outgoing_handoff: resolvedOutgoing || null,
    requiredHandoffAnchors: anchors,
    required_handoff_anchors: anchors,
    opening_obligations: openingObligations,
    openingObligations,
  }

  return {
    ...context,
    chapter_target: enrichedTarget,
    chapterTarget: enrichedTarget,
    requiredHandoffAnchors: anchors,
    previous_handoff: enrichedTarget.previous_handoff,
    previous_outgoing_handoff: resolvedOutgoing || null,
  }
}
