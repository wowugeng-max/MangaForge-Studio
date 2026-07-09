import { anchorMatchScore } from './text-matching'

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null || value === '') return []
  return [value]
}

function compactBriefText(value: any, limit = 500) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim().slice(0, limit)
  try {
    return JSON.stringify(value).replace(/\s+/g, ' ').trim().slice(0, limit)
  } catch {
    return String(value).replace(/\s+/g, ' ').trim().slice(0, limit)
  }
}

function uniqueBriefStrings(values: any[], limit = 20) {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    const text = compactBriefText(value)
    if (!text || seen.has(text)) continue
    seen.add(text)
    output.push(text)
    if (output.length >= limit) break
  }
  return output
}

export function suspenseArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => compactBriefText(item)).filter(Boolean), 20)
}

export function suspenseSignalDelivered(value: string, chapterText: string) {
  const text = String(chapterText || '')
  const expected = String(value || '')
  if (/疑问|提出疑问|问题/.test(expected) && /[？?]|到底|为什么|是谁|什么规则|藏着什么/.test(text)) return true
  if (/虚假|误导|假提示/.test(expected) && /假提示|误导|以为|只是|声称|虫蛀|伪装|不是真/.test(text)) return true
  if (/答案|公布答案|揭示|收/.test(expected) && /答案|公布|揭示|证明|指向|真相|露出|终于|原来/.test(text)) return true
  if (/期待|两长一短|短期|中期|长期/.test(expected) && /短期|中期|长期|还没|下一|新期待|重新拉起|第三个证人|内库名单|父亲旧案/.test(text)) return true
  if (/震惊|反应|观众|旁观|高位者|深度/.test(expected) && /震惊|脸色变|改口|上前|长老|全场|旁观|反应|松了口气/.test(text)) return true
  if (/种|前30/.test(expected) && /缺页到底|到底|疑问|问题|撕痕/.test(text)) return true
  if (/养|中50|提示|加压/.test(expected) && /假提示|声称|冷笑|加压|还不是最终结果/.test(text)) return true
  const match = anchorMatchScore(expected, text)
  return match.score >= 24 || match.matched.length >= 2
}

export function suspenseInformationOrderDelivered(value: string, chapterText: string) {
  const expected = String(value || '')
  const text = String(chapterText || '')
  const hasQuestion = /[？?]|到底|为什么|是谁|什么规则|藏着什么|疑问/.test(text)
  const hasHint = /线索|提示|印痕|撕痕|缺页|旧印|证据|调查|追查/.test(text)
  const hasFalseHint = /假提示|误导|以为|只是|声称|虫蛀|伪装|不是真/.test(text)
  const hasAnswer = /答案|公布|揭示|证明|指向|真相|露出|终于|原来/.test(text)
  if (/意外\+反转|虚假提示1|虚假对立提示/.test(expected)) {
    return hasQuestion && hasFalseHint && /对立|第二行|却|反转|不是/.test(text) && hasAnswer
  }
  if (/意外剧情|虚假提示/.test(expected)) return hasQuestion && hasFalseHint && hasAnswer
  if (/探索剧情|正常提示/.test(expected)) return hasQuestion && hasHint && hasAnswer
  if (/直白剧情|提出疑问/.test(expected)) return hasQuestion && hasAnswer
  return suspenseSignalDelivered(expected, chapterText)
}

export function normalizeSuspenseListCheck(
  key: string,
  label: string,
  values: any[],
  chapterText: string,
  fix: string,
  options: { requireAll?: boolean } = {},
) {
  const planned = suspenseArray(values)
  if (!planned.length) return null
  const checked = planned.map(text => ({
    text,
    delivered: key === 'information_order'
      ? suspenseInformationOrderDelivered(text, chapterText)
      : suspenseSignalDelivered(text, chapterText),
  }))
  const deliveredRows = checked.filter(item => item.delivered)
  const requiredCount = options.requireAll === false ? Math.max(1, Math.ceil(checked.length * 0.6)) : checked.length
  const delivered = deliveredRows.length >= requiredCount
  const missed = checked.filter(item => !item.delivered)
  return {
    key,
    label,
    text: planned.join('；'),
    expected: planned.join('；'),
    score: Math.round(deliveredRows.length / Math.max(1, checked.length) * 100),
    evidence: deliveredRows.map(item => item.text).slice(0, 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: missed.map(item => item.text),
    issue: delivered ? '' : `${label}未充分落地：${missed.map(item => item.text).join('；')}`,
    repair_instruction: delivered ? '' : fix,
  }
}

export function normalizeSuspenseStrengthCheck(value: any, chapterText: string) {
  const expected = compactBriefText(value)
  if (!expected) return null
  const text = String(chapterText || '')
  const hasQuestion = /[？?]|到底|为什么|是谁|什么规则|藏着什么/.test(text)
  const hasPressure = /倒计时|天亮前|必须|否则|威胁|逼|不能|危机|代价/.test(text)
  const hasAnswerOrReveal = /答案|公布|揭示|证明|指向|真相|露出|原来|第三个证人/.test(text)
  const hasNextExpectation = /下一|还没|新期待|重新拉起|长期|中期|短期|内库名单|父亲旧案/.test(text)
  const wantsMediumOrAbove = /3|中悬念|4|大悬念|5|极悬念/.test(expected)
  const delivered = wantsMediumOrAbove
    ? hasQuestion && hasPressure && hasAnswerOrReveal && hasNextExpectation
    : hasQuestion && (hasAnswerOrReveal || hasNextExpectation)
  const evidence = [
    hasQuestion ? '疑问' : '',
    hasPressure ? '压力' : '',
    hasAnswerOrReveal ? '答案/揭示' : '',
    hasNextExpectation ? '新期待' : '',
  ].filter(Boolean)
  return {
    key: 'suspense_strength',
    label: '悬念强度',
    text: expected,
    expected,
    score: delivered ? 86 : Math.max(28, evidence.length * 18),
    evidence,
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : [expected],
    issue: delivered ? '' : `悬念强度未达到 ${expected}。`,
    repair_instruction: delivered ? '' : '补足疑问、压力、答案路径和新期待；关键章至少达到中悬念，不能只说“很神秘”。',
  }
}

export function suspensePriority(missed: any[]) {
  if (missed.some(item => item.key === 'foreshadowing_boundary_rules')) return '优先修悬念伏笔边界'
  if (missed.some(item => item.key === 'suspense_forbidden')) return '优先修悬念禁忌'
  if (missed.some(item => item.key === 'expectation_chain')) return '优先补期待链'
  if (missed.some(item => item.key === 'information_order')) return '优先重排信息顺序'
  if (missed.some(item => item.key === 'expectation_layers')) return '优先补期待接力'
  if (missed.some(item => item.key === 'suspense_cycle')) return '优先补种养收'
  if (missed.some(item => item.key === 'shock_layers')) return '优先补震惊分层'
  return ''
}
