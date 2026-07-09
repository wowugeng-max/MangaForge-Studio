import { anchorMatchScore } from './text-matching'

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
  return [value]
}

function compactBriefText(value: any, fallback: any = '') {
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

export function femaleAudienceArray(values: any) {
  return asArray(values).map((item: any) => compactBriefText(item)).filter(Boolean)
}

export function countFemaleAudienceSignals(chapterText: string, patterns: RegExp[]) {
  const text = String(chapterText || '')
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0)
}

export function normalizeFemaleCorePrinciplesCheck(values: any[], chapterText: string) {
  const planned = femaleAudienceArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const signalCount = countFemaleAudienceSignals(text, [
    /安全感|退路|能力|同盟|边界/,
    /代入|被轻视|处境|选择|反应/,
    /女主.*自己|亲自|主动|自己做决定|自己推进/,
    /主情绪|委屈|反击|成长|事业/,
  ])
  const hardPassive = /女主被安排着赢|关键选择都由男主安排|男主.*解决所有/.test(text)
  const deliveredItems = scored.filter(item => item.match.score >= 28).length
  const delivered = !hardPassive && (deliveredItems >= Math.max(1, Math.ceil(planned.length * 0.35)) || signalCount >= 3)
  return {
    key: 'core_principles',
    label: '核心原则',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.min(Math.max(14, signalCount * 16), hardPassive ? 22 : 64),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      signalCount >= 3 ? '安全感/代入/主动性/主情绪信号可见' : '',
      hardPassive ? '女主主动性断裂' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 28).slice(0, 8),
    issue: delivered ? '' : '女频核心原则没有落地：安全感、代入感、女主主动性或主情绪断裂。',
    repair_instruction: delivered ? '' : '补核心原则：给女主退路/能力/同盟锚点，让关键选择由女主自己做决定、自己推进。',
  }
}

export function normalizeFemaleReaderNeedCheck(values: any[], chapterText: string) {
  const planned = femaleAudienceArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const signalCount = countFemaleAudienceSignals(text, [
    /被认可|认可/,
    /被珍视|珍视/,
    /被尊重|尊重/,
    /边界|反击|不再只是|投射/,
  ])
  const deliveredItems = scored.filter(item => item.match.score >= 28).length
  const delivered = deliveredItems >= 1 || signalCount >= 2
  return {
    key: 'reader_need_rules',
    label: '读者深层需求',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.max(16, signalCount * 20),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      signalCount >= 2 ? '被认可/珍视/尊重信号可见' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 28).slice(0, 8),
    issue: delivered ? '' : '女性向深层需求没有落成被认可、被珍视、被尊重或边界被看见。',
    repair_instruction: delivered ? '' : '补读者深层需求：让女主的行动换来认可、珍视、尊重或明确边界。',
  }
}

export function normalizeFemaleCopyPromiseCheck(values: any[], chapterText: string) {
  const planned = femaleAudienceArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const signalCount = countFemaleAudienceSignals(text, [
    /状态|被压价|困境|被抢/,
    /行动|亲自|谈判|拒绝/,
    /成功|签回|拿回|成功暗示/,
    /事业翻盘|成长|翻盘/,
  ])
  const mismatch = /书名简介.*女主事业翻盘.*正文却只写她被迫等待|货不对板/.test(text)
  const deliveredItems = scored.filter(item => item.match.score >= 28).length
  const delivered = !mismatch && (deliveredItems >= 1 || signalCount >= 3)
  return {
    key: 'copy_promise_rules',
    label: '文案承诺',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.min(Math.max(16, signalCount * 18), mismatch ? 24 : 68),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      signalCount >= 3 ? '状态-困境-行动-成功链路可见' : '',
      mismatch ? '文案承诺与正文交付错位' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 28).slice(0, 8),
    issue: delivered ? '' : '文案承诺没有兑现状态、困境、行动、成功，或女主成功暗示缺失。',
    repair_instruction: delivered ? '' : '补文案承诺：按状态 -> 困境 -> 女主行动 -> 成功结果重排本章交付。',
  }
}

export function normalizeFemaleLongformGenreCheck(values: any[], chapterText: string) {
  const planned = femaleAudienceArray(values)
  if (!planned.length) return null
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const signalCount = countFemaleAudienceSignals(chapterText, [
    /长篇|主线|阶段/,
    /成长|事业|关系/,
    /成长节点|事业进展|合同|条款/,
    /伏笔|旧案|线索/,
    /下一章|章尾|新问题/,
  ])
  const deliveredItems = scored.filter(item => item.match.score >= 28).length
  const delivered = deliveredItems >= 1 || signalCount >= 2
  return {
    key: 'longform_genre_rules',
    label: '长篇品类',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.max(18, signalCount * 18),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      signalCount >= 2 ? '长篇成长/伏笔/下一章信号可见' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 28).slice(0, 8),
    issue: delivered ? '' : '女频长篇品类承接不足，成长、关系、伏笔或后续期待不清。',
    repair_instruction: delivered ? '' : '补长篇品类：把本章选择接到成长、事业、关系或下一条伏笔。',
  }
}

export function normalizeFemaleRomanceAxisCheck(values: any[], chapterText: string) {
  const planned = femaleAudienceArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const signalCount = countFemaleAudienceSignals(text, [
    /感情线|暧昧|男主/,
    /事业线|事业进展|成长节点|成长/,
    /递来一杯|热茶|升温|升级/,
    /没有抢走|踩在.*节点/,
  ])
  const detached = /感情线脱离成长线|男主出面解决所有事业问题/.test(text)
  const deliveredItems = scored.filter(item => item.match.score >= 28).length
  const delivered = !detached && (deliveredItems >= 1 || signalCount >= 3)
  return {
    key: 'romance_axis_rules',
    label: '感情线双轴',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.min(Math.max(16, signalCount * 18), detached ? 22 : 66),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      signalCount >= 3 ? '感情升级踩在成长/事业节点' : '',
      detached ? '感情线脱离成长线' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 28).slice(0, 8),
    issue: delivered ? '' : '感情线没有踩在女主事业或成长节点上，或男主替代女主解决核心问题。',
    repair_instruction: delivered ? '' : '补感情线双轴：感情升级必须发生在女主事业进展或成长节点之后，不能替代女主行动。',
  }
}

export function normalizeFemaleAbuseDosageCheck(values: any[], chapterText: string) {
  const planned = femaleAudienceArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const signalCount = countFemaleAudienceSignals(text, [
    /反转|糖|热茶|回甜/,
    /受委屈后|前面受委屈|委屈后/,
    /没有连续只虐|不连续只虐/,
    /安全感|回报/,
  ])
  const negatesContinuousAbuse = /没有连续只虐|不连续只虐|避免连续只虐/.test(text)
  const overAbuse = /一直被虐|没有反转或糖|没有安全感/.test(text) || (/连续只虐/.test(text) && !negatesContinuousAbuse)
  const deliveredItems = scored.filter(item => item.match.score >= 28).length
  const delivered = !overAbuse && (deliveredItems >= 1 || signalCount >= 2)
  return {
    key: 'abuse_dosage_rules',
    label: '虐戏剂量',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.min(Math.max(12, signalCount * 20), overAbuse ? 18 : 62),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      signalCount >= 2 ? '虐后反转/糖/安全感可见' : '',
      overAbuse ? '连续只虐或无安全感' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 28).slice(0, 8),
    issue: delivered ? '' : '虐戏剂量失控，受委屈后没有反转、糖或安全感回补。',
    repair_instruction: delivered ? '' : '补虐戏剂量：每段受虐后必须给反转、糖、退路或能力回报，避免连续只虐。',
  }
}

export function normalizeFemalePlatformFitCheck(values: any[], chapterText: string) {
  const planned = femaleAudienceArray(values)
  if (!planned.length) return null
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const signalCount = countFemaleAudienceSignals(chapterText, [
    /番茄女生|女性读者|女频/,
    /安全感.*早给|安全感/,
    /节奏.*快|快回报|快节奏/,
    /回报.*清楚|清楚回报|货板一致/,
  ])
  const deliveredItems = scored.filter(item => item.match.score >= 28).length
  const delivered = deliveredItems >= 1 || signalCount >= 3
  return {
    key: 'platform_fit_rules',
    label: '平台适配',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.max(16, signalCount * 18),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      signalCount >= 3 ? '女性向平台安全感/快回报信号可见' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 28).slice(0, 8),
    issue: delivered ? '' : '平台适配不足，安全感、快节奏或清晰回报没有按女性向平台口味落地。',
    repair_instruction: delivered ? '' : '补平台适配：安全感早给、回报清楚、节奏更快，避免长时间只压女主。',
  }
}

export function normalizeFemaleQualityCheck(values: any[], chapterText: string) {
  const planned = femaleAudienceArray(values)
  if (!planned.length) return null
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const mismatch = /货不对板|书名简介.*正文却|简介说.*正文却/.test(String(chapterText || ''))
  const deliveredItems = scored.filter(item => item.match.score >= 28).length
  const delivered = !mismatch && (deliveredItems >= 1 || /货板一致|书名简介|正文交付/.test(String(chapterText || '')))
  return {
    key: 'quality_checks',
    label: '货板一致',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : (mismatch ? 18 : 50),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      delivered ? '货板一致信号可见' : '',
      mismatch ? '货板不一致' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 28).slice(0, 8),
    issue: delivered ? '' : '书名、简介、题材卖点和正文交付不一致。',
    repair_instruction: delivered ? '' : '修货板一致：让书名简介承诺、女性向卖点和正文场景交付统一。',
  }
}

export function buildFemaleAudienceDeterministicCheck(chapterText: string) {
  const text = String(chapterText || '')
  const risks = [
    /一直被虐|没有退路|没有安全感/.test(text) ? {
      key: 'safety_break',
      label: '安全感断裂',
      evidence: '正文让女主持续被虐，缺少退路、能力、同盟或安全感。',
      fix: '补退路、能力、同盟或边界，让安全感早给。',
    } : null,
    /关键选择都由男主安排|女主被安排着赢|男主.*解决所有/.test(text) ? {
      key: 'passive_heroine',
      label: '女主被安排着赢',
      evidence: '关键选择或胜利由男主安排，女主主动性断裂。',
      fix: '改成女主自己做决定、自己推进、自己承担后果并拿到结果。',
    } : null,
    /感情线脱离成长线|男主出面解决所有事业问题/.test(text) ? {
      key: 'romance_detached',
      label: '感情线脱离成长线',
      evidence: '感情线替代事业/成长线，没有踩在女主成长节点上。',
      fix: '让感情升温发生在女主完成事业进展或成长选择之后。',
    } : null,
    (/没有连续只虐|不连续只虐|避免连续只虐/.test(text) ? false : /连续只虐/.test(text)) || /没有反转或糖/.test(text) ? {
      key: 'abuse_overdose',
      label: '连续只虐',
      evidence: '正文连续只虐，没有反转、糖或安全感回补。',
      fix: '每段虐后立刻给反转、糖、退路或阶段性胜利。',
    } : null,
    /书名简介说.*正文却|货不对板/.test(text) ? {
      key: 'promise_mismatch',
      label: '货板不一致',
      evidence: '书名简介承诺与正文交付错位。',
      fix: '统一书名、简介、卖点和正文交付。',
    } : null,
  ].filter(Boolean)
  if (!risks.length) return null
  return {
    key: 'female_audience_forbidden',
    label: '女频长篇硬伤',
    text: '女频长篇不得安全感断裂、女主被安排着赢、感情线脱离成长线、连续只虐或货板不一致。',
    expected: '女频长篇不得安全感断裂、女主被安排着赢、感情线脱离成长线、连续只虐或货板不一致。',
    score: Math.max(0, 100 - risks.length * 24),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项女频长篇确定性风险。`,
    repair_instruction: '按 oh-story 女频长篇口径修复：补安全感、女主主动选择、成长节点上的感情升级、虐后反转或糖，并修货板一致。',
  }
}

export function femaleAudiencePriority(missed: any[]) {
  if (missed.some(item => item.key === 'female_audience_forbidden')) return '优先清女频硬伤'
  if (missed.some(item => item.key === 'core_principles')) return '优先补安全感和女主主动'
  if (missed.some(item => item.key === 'abuse_dosage_rules')) return '优先控虐戏剂量'
  if (missed.some(item => item.key === 'romance_axis_rules')) return '优先修感情线双轴'
  if (missed.some(item => item.key === 'copy_promise_rules')) return '优先补文案承诺'
  if (missed.some(item => item.key === 'reader_need_rules')) return '优先补深层需求'
  if (missed.some(item => item.key === 'platform_fit_rules')) return '优先补平台适配'
  if (missed.some(item => item.key === 'quality_checks')) return '优先修货板一致'
  if (missed.some(item => item.key === 'longform_genre_rules')) return '优先补长篇承接'
  return ''
}
