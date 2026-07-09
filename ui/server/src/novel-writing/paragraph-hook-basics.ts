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

export function paragraphHookArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => compactBriefText(item)).filter(Boolean), 20)
}

export function paragraphHookTypeDelivered(type: string, chapterText: string) {
  const text = String(chapterText || '')
  const key = String(type || '')
  if (/信息差/.test(key)) return /不知道|隐瞒|误会|真相|读者知道|角色不知道|名单|秘密/.test(text)
  if (/倒计时/.test(key)) return /倒计时|还剩|最后|期限|天亮前|零点前|十秒|立刻|马上/.test(text)
  if (/反转/.test(key)) return /反转|竟然|却|原来|调包|被调换|证明|下一页|露出/.test(text)
  if (/暗牌|底牌/.test(key)) return /暗牌|底牌|录音|证据|旧印|账册|后手|没说话|还没亮/.test(text)
  if (/打脸/.test(key)) return /打脸|反打|当众|证明|改口|态度转变|全场|审判庭|长老看清/.test(text)
  if (/代价/.test(key)) return /代价|取消资格|失去|惩罚|承担|必须马上|完了|消耗|损失/.test(text)
  if (/弱者|孩子/.test(key)) return /孩子|女儿|儿子|四岁|弱者|无辜|新人|受害者|弟子/.test(text)
  if (/灵魂旁观/.test(key)) return /灵魂|魂魄|旁观|只能看|无力改变/.test(text)
  if (/异常物件/.test(key)) return /异常|旧印|钥匙|纸条|账册|名单|缺页|物件|印痕|芒果味|月子中心/.test(text)
  if (/假意顺从/.test(key)) return /假意|顺从|低头|认罪|配合|答应|都给你|疯了/.test(text)
  if (/冷发现/.test(key)) return /冷发现|冷静|笑着点头|看见|发现|名单|预约单|钥匙扣/.test(text)
  const match = anchorMatchScore(key, text)
  return match.score >= 24 || match.matched.length >= 1
}

export function normalizeParagraphHookListCheck(
  key: string,
  label: string,
  values: any[],
  chapterText: string,
  fix: string,
  options: { requireAll?: boolean } = {},
) {
  const planned = paragraphHookArray(values)
  if (!planned.length) return null
  const checked = planned.map(text => ({
    text,
    delivered: paragraphHookTypeDelivered(text, chapterText),
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

export function paragraphHookCombinationDelivered(value: string, chapterText: string) {
  const parts = String(value || '').split('+').map(item => item.trim()).filter(Boolean)
  if (parts.length >= 2) return parts.every(part => paragraphHookTypeDelivered(part, chapterText))
  return paragraphHookTypeDelivered(value, chapterText)
}

export function normalizeParagraphHookCombinationCheck(values: any[], chapterText: string) {
  const planned = paragraphHookArray(values)
  if (!planned.length) return null
  const checked = planned.map(text => ({
    text,
    delivered: paragraphHookCombinationDelivered(text, chapterText),
  }))
  const deliveredRows = checked.filter(item => item.delivered)
  const delivered = deliveredRows.length > 0
  const missed = checked.filter(item => !item.delivered)
  return {
    key: 'hook_combinations',
    label: '钩子组合',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: Math.round(deliveredRows.length / Math.max(1, checked.length) * 100),
    evidence: deliveredRows.map(item => item.text).slice(0, 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: missed.map(item => item.text),
    issue: delivered ? '' : `钩子组合未充分落地：${missed.map(item => item.text).join('；')}`,
    repair_instruction: delivered ? '' : '关键段落至少落一组微钩子组合，例如信息差 + 暗牌、倒计时 + 代价、反转 + 打脸、暗牌 + 打脸或异常物件 + 冷发现。',
  }
}

export function normalizeParagraphHookPresenceCheck(
  key: string,
  label: string,
  values: any[],
  chapterText: string,
  pattern: RegExp,
  fix: string,
) {
  const planned = paragraphHookArray(values)
  if (!planned.length) return null
  pattern.lastIndex = 0
  const delivered = pattern.test(String(chapterText || ''))
  return {
    key,
    label,
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : 42,
    evidence: delivered ? [label] : [],
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : `${label}没有正文证据。`,
    repair_instruction: delivered ? '' : fix,
  }
}

export function buildParagraphHookDeterministicCheck(risks: any[]) {
  if (!risks.length) return null
  return {
    key: 'paragraph_stall',
    label: '段落停滞',
    text: '每 3-5 段必须出现信息、风险、情绪或关系变化。',
    expected: '每 3-5 段必须出现信息、风险、情绪或关系变化。',
    score: Math.max(0, 100 - risks.length * 22),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项段落级钩子确定性风险。`,
    repair_instruction: '按 oh-story 段落级钩子修复：连续段落中必须加入信息差、倒计时、反转、暗牌、打脸、代价、异常物件、冷发现、对话压迫或不公平伤害。',
  }
}

export function paragraphHookPriority(missed: any[]) {
  if (missed.some(item => item.key === 'paragraph_stall')) return '优先补段落推进'
  if (missed.some(item => item.key === 'hook_combinations')) return '优先补钩子组合'
  if (missed.some(item => item.key === 'micro_hook_types')) return '优先补微钩子'
  if (missed.some(item => item.key === 'dialogue_escalation')) return '优先补对话递进'
  if (missed.some(item => item.key === 'spectator_layers')) return '优先补围观者层级'
  return ''
}
