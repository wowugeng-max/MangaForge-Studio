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

export function storyPowerArray(values: any) {
  return asArray(values).map((item: any) => compactBriefText(item)).filter(Boolean)
}

export function storyPowerSignalEvidence(chapterText: string, kind: string) {
  const text = String(chapterText || '')
  const evidence: string[] = []
  const hasAction = /押上|启动|逼出|拆|追|拿到|换一次|当众|反手|验证|反制|选择|证明|亮起|撬开|逼问|追查|行动|动作/.test(text)
  const hasSituationChange = /改变|变成|转为|指向|资格|线索|第一次|局势|状态|亮起|脸色发白|被迫|暴露|从.+变成/.test(text)
  const hasFeedback = /代价|反馈|信息|关系|规则|反制|暴露|奖励|证据|线索|指向|脸色|亮起|因此|于是|导致|让/.test(text)
  const hasExpectation = /章末|下一步|下一章|指向|未解|库房|线索|压力|问题|追查|盯上/.test(text)
  const hasGoalObstacle = /目标|要|必须|想要|封锁|阻碍|不许|不敢|压|拦|堵/.test(text)
  if (kind === 'story_power_dimensions') {
    if (hasGoalObstacle && hasAction && hasFeedback && hasExpectation) evidence.push('目标/阻碍/行动/反馈/期待信号可见')
  } else if (kind === 'action_rules') {
    if (hasAction) evidence.push('可见行动信号可见')
    if (hasAction && hasSituationChange) evidence.push('行动改变局势信号可见')
  } else if (kind === 'beginning_end_rules') {
    if (hasGoalObstacle && hasSituationChange && hasExpectation) evidence.push('开场压力到章末状态变化信号可见')
  } else if (kind === 'causal_feedback_rules') {
    if (hasAction && hasFeedback) evidence.push('行动带来代价/信息/关系/规则/反制反馈信号可见')
  } else if (kind === 'chapter_power_loop') {
    if (hasGoalObstacle && hasAction && hasSituationChange && hasFeedback) evidence.push('本章目标-动作-反馈链路可见')
  }
  return evidence
}

export function normalizeStoryPowerCheck(key: string, label: string, values: any, chapterText: string) {
  const planned = storyPowerArray(values)
  if (!planned.length) return null
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const matchedEvidence = uniqueBriefStrings(scored.flatMap(item => item.match.matched), 8)
  const signalEvidence = storyPowerSignalEvidence(chapterText, key)
  const deliveredItems = scored.filter(item => item.match.score >= 30).length
  const delivered = deliveredItems >= Math.max(1, Math.ceil(planned.length * 0.35)) || signalEvidence.length > 0
  return {
    key,
    label,
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : 22,
    story_power_dimension: key === 'story_power_dimensions' ? planned.join('；') : '',
    action_changed_situation: key === 'action_rules' ? signalEvidence.join('；') : '',
    beginning_to_end_change: key === 'beginning_end_rules' ? signalEvidence.join('；') : '',
    causal_feedback: key === 'causal_feedback_rules' ? signalEvidence.join('；') : '',
    evidence: uniqueBriefStrings([...matchedEvidence, ...signalEvidence], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < 30).slice(0, 8),
    issue: delivered ? '' : `${label}没有落成正文证据。`,
    fix: delivered ? '' : storyPowerRepairInstruction(key),
    repair_instruction: delivered ? '' : storyPowerRepairInstruction(key),
    remaining_risk: delivered ? '' : `${label}缺口会让章节变成解释、旁观或并列事件。`,
  }
}

export function storyPowerRepairInstruction(key: string) {
  if (key === 'action_rules') return '补可见行动：把解释、旁观或内心独白改成角色主动验证、对抗、交易、牺牲、追查或反制，并写出行动改变了什么。'
  if (key === 'beginning_end_rules') return '补有始有终：让开场目标、阻碍或异常在章末形成状态变化、新线索、新代价或下一步选择。'
  if (key === 'causal_feedback_rules') return '补因果反馈：每个关键动作后立刻给代价、奖励、信息变化、关系变化、规则触发或敌方反制。'
  if (key === 'chapter_power_loop') return '补本章故事力循环：目标、阻碍、动作、反馈、期待依次落地，并让上一场结果成为下一场原因。'
  return '补故事五维：目标、阻碍、动作、反馈、期待都必须能在正文中定位。'
}

export function storyPowerPriority(missed: any[]) {
  if (missed.some(item => item.key === 'action_rules')) return '优先补可见行动'
  if (missed.some(item => item.key === 'causal_feedback_rules')) return '优先补因果反馈'
  if (missed.some(item => item.key === 'beginning_end_rules')) return '优先补有始有终'
  if (missed.some(item => item.key === 'story_power_dimensions')) return '优先补故事五维'
  return ''
}
