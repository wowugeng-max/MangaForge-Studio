import { anchorMatchScore } from './text-matching'

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
