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

export function reversalArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => compactBriefText(item)).filter(Boolean), 20)
}

export function reversalSetupEvidence(planned: string[], chapterText: string) {
  const text = String(chapterText || '')
  const exactMatches = planned
    .map(item => ({ text: item, match: anchorMatchScore(item, text) }))
    .filter(item => item.match.score >= 24 || item.match.matched.length >= 1)
    .map(item => item.text)
  const genericSignals = [
    /页码错位|页码|缺页|撕痕/.test(text) ? '账册页码/缺页暗示' : '',
    /旧部印记|印记|印章|暗纹|袖口/.test(text) ? '身份物件暗示' : '',
    /证人[^。！？!?]{0,40}(?:知道|说出|提到|记得)|知道[^。！？!?]{0,40}(?:账本|账册|细节)/.test(text) ? '证人知识暗示' : '',
    /提前|早就|备份|副本|暗格|红点|录音键|预先/.test(text) ? '提前布局暗示' : '',
  ].filter(Boolean)
  return uniqueBriefStrings([...exactMatches, ...genericSignals], 8)
}

export function normalizeReversalSetupCheck(contract: any, chapterText: string) {
  const planned = reversalArray(contract.setup_plan || contract.setupPlan, contract.setup_requirements || contract.setupRequirements)
  if (!planned.length) return null
  const evidence = reversalSetupEvidence(reversalArray(contract.setup_plan || contract.setupPlan), chapterText)
  const requiredCount = /3|三/.test(planned.join('；')) ? 3 : Math.min(3, Math.max(1, reversalArray(contract.setup_plan || contract.setupPlan).length || 2))
  const delivered = evidence.length >= requiredCount
  return {
    key: 'setup_clues',
    label: '铺垫暗示',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 90 : Math.max(25, Math.round(evidence.length / Math.max(1, requiredCount) * 100)),
    evidence,
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter((item: string) => !evidence.includes(item)).slice(0, 8),
    issue: delivered ? '' : `反转前公平暗示不足：需要 ${requiredCount} 处，当前可识别 ${evidence.length} 处。`,
    repair_instruction: delivered ? '' : '补足反转前至少3处公平暗示：物件、行为、证人知识、时间线或提前布局都要能在揭示后解释前文。',
  }
}

export function reversalTypeDelivered(type: string, chapterText: string) {
  const text = String(chapterText || '')
  if (/身份/.test(type)) return /身份|真正|不是[^。！？!?]{0,24}而是|披着|伪装|调换|冒充|旧部/.test(text)
  if (/信息/.test(type)) return /真相|答案|证明|反证|揭示|原来|不是[^。！？!?]{0,32}而是|账册|缺页|名单/.test(text)
  if (/动机/.test(type)) return /动机|真正想要|并不是为了|只是为了|选择暴露|真动机/.test(text)
  if (/视角/.test(type)) return /视角|换个角度|另一边|他才知道|原来看到的只是|补全/.test(text)
  const match = anchorMatchScore(type, text)
  return match.score >= 24 || match.matched.length >= 1
}

export function normalizeReversalTypeCheck(values: any[], chapterText: string) {
  const planned = reversalArray(values)
  if (!planned.length) return null
  const checked = planned.map(text => ({ text, delivered: reversalTypeDelivered(text, chapterText) }))
  const deliveredRows = checked.filter(item => item.delivered)
  const delivered = deliveredRows.length >= Math.max(1, Math.ceil(checked.length * 0.6))
  return {
    key: 'reversal_types',
    label: '反转类型',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: Math.round(deliveredRows.length / Math.max(1, checked.length) * 100),
    evidence: deliveredRows.map(item => item.text).slice(0, 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: checked.filter(item => !item.delivered).map(item => item.text),
    issue: delivered ? '' : `反转类型未充分落地：${checked.filter(item => !item.delivered).map(item => item.text).join('；')}`,
    repair_instruction: delivered ? '' : '把反转写成清晰类型：信息反转要推翻旧事实，身份反转要有身份证据，动机反转要让选择暴露真动机。',
  }
}

export function normalizeReversalMisdirectionCheck(values: any[], chapterText: string) {
  const planned = reversalArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasMisdirection = /红鲱鱼|误导|假提示|声称|以为|只是|伪装|虫蛀|假线索|看似|几乎都信/.test(text)
  const hasFunction = /后来|却|不是|而是|揭示|证明|反证|真相|答案/.test(text)
  const delivered = hasMisdirection && hasFunction
  return {
    key: 'misdirection',
    label: '公平误导',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : hasMisdirection ? 58 : 28,
    evidence: delivered ? ['误导有正文证据并被揭示改写'] : hasMisdirection ? ['误导有正文证据'] : [],
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '反转缺少公平误导，或误导没有在揭示时发挥剧情功能。',
    repair_instruction: delivered ? '' : '补公平误导：先给可信但错误的解释、红鲱鱼或假提示，再让揭示改写它，不能靠天降新信息。',
  }
}

export function normalizeReversalTimingCheck(values: any[], chapterText: string, setupCheck: any) {
  const planned = reversalArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const revealMatch = /(答案|真相|揭示|原来|真正|不是[^。！？!?]{0,32}而是|身份反转|证明|反证)/.exec(text)
  const ratio = revealMatch ? revealMatch.index / Math.max(1, text.length) : 0
  const hasEnoughSetup = Number(setupCheck?.evidence?.length || 0) >= 3
  const delivered = Boolean(revealMatch) && ratio >= 0.62 && ratio <= 0.92 && hasEnoughSetup
  const percent = Math.round(ratio * 100)
  return {
    key: 'reveal_timing',
    label: '揭示时机',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : revealMatch ? Math.max(35, Math.min(70, percent)) : 24,
    evidence: revealMatch ? [`揭示约在 ${percent}%`] : [],
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : `揭示时机未达标：需要先有3处暗示，再在后段自然揭示；当前约在 ${percent}%。`,
    repair_instruction: delivered ? '' : '把揭示放在章节后段，并保证揭示前已经完成3处暗示和可信误导；不要开头就宣布，也不要结尾突然空降。',
  }
}

export function normalizeReversalImpactCheck(chapterText: string) {
  const text = String(chapterText || '')
  const delivered = /改变|改写|推翻|重新调查|取消资格|资格被取消|规则|局势|审判庭|长老|全场|内库|旧案|主谋|身份.*坐实|牵出/.test(text)
  return {
    key: 'reversal_impact',
    label: '揭示后影响',
    text: '反转揭示后必须改变局势、规则、关系、资源或下一章问题。',
    expected: '反转揭示后必须改变局势、规则、关系、资源或下一章问题。',
    score: delivered ? 86 : 42,
    evidence: delivered ? ['揭示后改变局势/规则/追查方向'] : [],
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : ['揭示后影响'],
    issue: delivered ? '' : '反转只停留在宣布真相，没有造成局势变化或下一步压力。',
    repair_instruction: delivered ? '' : '补揭示后影响：让资格、规则、关系、证据链、追查方向或敌我态势至少改变一项。',
  }
}

export function normalizeReversalFaceSlapCheck(values: any[], chapterText: string) {
  const planned = reversalArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasPressure = /冷笑|逼|压迫|认罪|取消资格|威胁|公开|当众|几乎都信|起哄|质疑/.test(text)
  const hasPayoff = /打脸|反打|反证|改口|露馅|当场|证明|资格.*取消|全场|审判庭/.test(text)
  const delivered = hasPressure && hasPayoff
  return {
    key: 'face_slap_rhythm',
    label: '打脸节奏',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : hasPayoff ? 58 : 32,
    evidence: [hasPressure ? '先压迫' : '', hasPayoff ? '后反证/改口' : ''].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '打脸节奏不完整：缺少先压迫后反证的爽点闭环。',
    repair_instruction: delivered ? '' : '按先扬后抑修复：先让对手公开压迫或误判，再用证据/暗牌/证人短句反打，并写出旁观者反应。',
  }
}

export function reversalPriority(missed: any[]) {
  if (missed.some(item => item.key === 'reversal_forbidden')) return '优先修反转毒点'
  if (missed.some(item => item.key === 'setup_clues')) return '优先补3处暗示'
  if (missed.some(item => item.key === 'misdirection')) return '优先补公平误导'
  if (missed.some(item => item.key === 'reveal_timing')) return '优先调揭示时机'
  if (missed.some(item => item.key === 'reversal_impact')) return '优先补揭示后影响'
  if (missed.some(item => item.key === 'face_slap_rhythm')) return '优先补打脸节奏'
  return ''
}
