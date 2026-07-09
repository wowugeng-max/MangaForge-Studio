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

function assetText(item: any) {
  if (!item) return ''
  if (typeof item === 'string') return compactBriefText(item)
  return compactBriefText(item.name || item.title || item.summary || item.description || item.entity_type || item.type)
}

function stateTrackingArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => assetText(item) || compactBriefText(item)).filter(Boolean), 24)
}

function stateTrackingAnchorScore(values: string[], chapterText: string, threshold = 28) {
  const checked = values.map(text => {
    const match = anchorMatchScore(text, chapterText)
    return {
      text,
      score: match.score,
      evidence: match.matched,
      delivered: match.score >= threshold,
    }
  })
  return {
    checked,
    missed: checked.filter(item => !item.delivered),
    score: checked.length ? Math.round(checked.reduce((sum, item) => sum + Number(item.score || 0), 0) / checked.length) : 82,
    evidence: checked.flatMap(item => item.evidence).filter(Boolean).slice(0, 8),
  }
}

export function normalizeStateSourceReadiness(rows: any[] = []) {
  return asArray(rows)
    .map((item: any) => ({
      key: compactBriefText(item?.key || item?.name),
      label: compactBriefText(item?.label || item?.title || item?.key || item?.name),
      status: ['ready', 'missing', 'optional', 'warn'].includes(String(item?.status || '').toLowerCase())
        ? String(item.status).toLowerCase()
        : item?.ready === true ? 'ready' : item?.optional === true ? 'optional' : 'missing',
      evidence: compactBriefText(item?.evidence || item?.summary || item?.source),
      fix: compactBriefText(item?.fix || item?.repair_action || item?.repairAction),
    }))
    .filter((item: any) => item.key && item.label)
}

export function normalizeStateTrackingSourceReadinessCheck(rows: any[]) {
  const normalized = normalizeStateSourceReadiness(rows)
  if (!normalized.length) return null
  const missed = normalized.filter((item: any) => ['missing', 'warn'].includes(String(item.status || '').toLowerCase()))
  return {
    key: 'source_readiness',
    label: '来源就绪',
    text: normalized.map((item: any) => `${item.label}:${item.status}`).join('；'),
    expected: normalized.map((item: any) => `${item.label}:${item.status}`).join('；'),
    score: missed.length ? Math.max(0, 100 - missed.length * 24) : 88,
    evidence: normalized.map((item: any) => `${item.label}:${item.status}${item.evidence ? `(${item.evidence})` : ''}`).slice(0, 8),
    delivered: missed.length === 0,
    status: missed.length === 0 ? 'ok' : 'warn',
    missed_items: missed.map((item: any) => `${item.label}:${item.status}`),
    issue: missed.length === 0 ? '' : `有 ${missed.length} 项写前来源未就绪或带警告。`,
    repair_instruction: missed.length === 0 ? '' : '补齐 missing/warn 来源；如果来源未就绪，正文不得把该来源当成既定事实使用。',
  }
}

export function normalizeStateTrackingFilterRuleCheck(values: any[], chapterText: string) {
  const planned = stateTrackingArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const overload = /三百年历史|十二支旁系|完整来历|制度分为|一整套背景|无关背景|纯百科|顺便介绍/.test(text)
  return {
    key: 'filter_rules',
    label: '上下文筛选',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: overload ? 28 : 86,
    evidence: overload ? ['无关背景/百科说明'] : ['未发现明显上下文过载'],
    delivered: !overload,
    status: overload ? 'warn' : 'ok',
    missed_items: overload ? planned : [],
    issue: overload ? '正文塞入本章不会使用的无关背景、纯百科设定或来源未筛选信息。' : '',
    repair_instruction: overload ? '按本节速记过滤：只保留不知道就会写错的信息，删掉不改变本章行动选择的背景。' : '',
  }
}

export function normalizeStateTrackingCharacterCheck(values: any[], chapterText: string) {
  const planned = stateTrackingArray(values)
  if (!planned.length) return null
  const anchor = stateTrackingAnchorScore(planned, chapterText, 24)
  const text = String(chapterText || '')
  const hasStateEvidence = /左臂旧伤|残阵[^。！？!?]{0,12}三息|持有旧钥匙|公开作证|被周家盯上|只能用封条事实|关系态度|公众形象|认知边界/.test(text)
  const contradiction = /左臂完全好了|残阵可以一直维持|像从没作证一样|没有被[^。！？!?]{0,12}盯上|早就知道/.test(text)
  const delivered = !contradiction && (anchor.missed.length === 0 || hasStateEvidence)
  return {
    key: 'character_states',
    label: '角色状态',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, anchor.score) : Math.min(anchor.score, contradiction ? 18 : 52),
    evidence: uniqueBriefStrings([...anchor.evidence, hasStateEvidence ? '角色状态可见' : '', contradiction ? '状态写反' : ''], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : anchor.missed.map(item => item.text),
    issue: delivered ? '' : '角色位置、能力/伤势、持有物、关系态度、公众形象或知识边界没有接住，或被正文写反。',
    repair_instruction: delivered ? '' : '补角色状态：只写本章会影响行动选择的最新位置、能力限制、伤势、持有物、关系态度、公众形象和知识边界。',
  }
}

export function normalizeStateTrackingHistoricalCheck(values: any[], chapterText: string) {
  const planned = stateTrackingArray(values)
  if (!planned.length) return null
  const anchor = stateTrackingAnchorScore(planned, chapterText, 22)
  const text = String(chapterText || '')
  const hasCausality = /上一章|旧钥匙[^。！？!?]{0,30}缺口|裂开[^。！？!?]{0,30}缺口|指向祠堂地砖|第13章|血契封条|红印[^。！？!?]{0,20}记录|开门人/.test(text)
  const dismissed = /上一章发生了什么并不重要|没有任何影响|前文都不重要|忽然承认|突然知道/.test(text)
  const delivered = !dismissed && (anchor.missed.length === 0 || hasCausality)
  return {
    key: 'historical_causality',
    label: '前史因果',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, anchor.score) : Math.min(anchor.score, dismissed ? 16 : 50),
    evidence: uniqueBriefStrings([...anchor.evidence, hasCausality ? '前史因果可见' : '', dismissed ? '前史断裂' : ''], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : anchor.missed.map(item => item.text),
    issue: delivered ? '' : '上一章钩子、待回收伏笔或前史规则没有变成本章开场/冲突的可见因果。',
    repair_instruction: delivered ? '' : '补前史因果：把上一章钩子、伏笔缺口、规则来源写成当前选择、阻碍、证据或代价的原因。',
  }
}

export function normalizeStateTrackingWorldConstraintCheck(values: any[], chapterText: string) {
  const planned = stateTrackingArray(values)
  if (!planned.length) return null
  const anchor = stateTrackingAnchorScore(planned, chapterText, 22)
  const text = String(chapterText || '')
  const hasConstraint = /禁门规则|血契封条|三息|锁死|退出|开门人|不知道[^。！？!?]{0,40}第二枚血契编号|知识边界|只能先/.test(text)
  const violation = /规则[^。！？!?]{0,20}没有生效|想待多久就待多久|早就知道[^。！？!?]{0,30}第二枚血契编号|随便打开|毫无限制/.test(text)
  const delivered = !violation && (anchor.missed.length === 0 || hasConstraint)
  return {
    key: 'world_constraints',
    label: '世界约束',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, anchor.score) : Math.min(anchor.score, violation ? 14 : 48),
    evidence: uniqueBriefStrings([...anchor.evidence, hasConstraint ? '规则/知识边界生效' : '', violation ? '世界约束失效' : ''], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : anchor.missed.map(item => item.text),
    issue: delivered ? '' : '世界约束、规则触发、地点限制、能力代价或知识边界没有影响本章行动选择，或被正文写反。',
    repair_instruction: delivered ? '' : '补世界约束：让规则、地点限制、能力代价和知识边界改变角色选择、行动成本、信息释放或章尾风险。',
  }
}

export function buildStateTrackingDeterministicCheck(chapterText: string) {
  const text = String(chapterText || '')
  const risks = [
    /左臂完全好了|残阵可以一直维持|像从没作证一样|没有被[^。！？!?]{0,12}盯上/.test(text) ? {
      key: 'character_state_drift',
      label: '角色状态漂移',
      evidence: '正文把已知伤势、能力限制、关系后果或公众形象写反。',
      fix: '恢复角色最新状态，让伤势、能力限制、关系压力和公众形象影响行动。',
    } : null,
    /上一章发生了什么并不重要|没有任何影响|前文都不重要/.test(text) ? {
      key: 'historical_causality_break',
      label: '前史因果断裂',
      evidence: '正文切断上一章钩子、伏笔缺口或前史规则。',
      fix: '把上一章留下的状态、伏笔和规则变成本章选择、阻碍或代价。',
    } : null,
    /规则[^。！？!?]{0,20}没有生效|想待多久就待多久|随便打开|毫无限制/.test(text) ? {
      key: 'world_constraint_ignored',
      label: '世界约束失效',
      evidence: '正文让已确认规则、地点限制或能力代价失效。',
      fix: '恢复世界约束，让规则触发、能力代价、知识边界和地点限制改变行动。',
    } : null,
    /早就知道[^。！？!?]{0,30}第二枚血契编号/.test(text) ? {
      key: 'knowledge_boundary_leak',
      label: '知识边界泄漏',
      evidence: '角色知道了当前知识边界之外的信息。',
      fix: '恢复知识边界：角色只能通过本章证据、对话或行动逐步获得新信息。',
    } : null,
    /三百年历史|十二支旁系|完整来历|制度分为|一整套背景|顺便介绍/.test(text) ? {
      key: 'state_context_overload',
      label: '上下文过载',
      evidence: '正文塞入本章不会使用的背景或百科设定。',
      fix: '删除不会改变本章行动选择的信息，只保留本节会写错的状态。',
    } : null,
  ].filter(Boolean)
  if (!risks.length) return null
  return {
    key: 'state_tracking_forbidden',
    label: '状态跟踪硬伤',
    text: '状态跟踪不得写反角色状态、切断前史因果、无视世界约束、泄漏知识边界或塞无关背景。',
    expected: '状态跟踪不得写反角色状态、切断前史因果、无视世界约束、泄漏知识边界或塞无关背景。',
    score: Math.max(0, 100 - risks.length * 22),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项状态跟踪确定性风险。`,
    repair_instruction: '按 oh-story 本节速记修复：只保留会影响本章行动选择的状态，并让角色状态、前史因果、世界约束和知识边界在正文中生效。',
  }
}

export function stateTrackingPriority(missed: any[]) {
  if (missed.some(item => item.key === 'state_tracking_forbidden')) return '优先清状态硬伤'
  if (missed.some(item => item.key === 'world_constraints')) return '优先补世界约束'
  if (missed.some(item => item.key === 'character_states')) return '优先补角色状态'
  if (missed.some(item => item.key === 'historical_causality')) return '优先接前史因果'
  if (missed.some(item => item.key === 'source_readiness')) return '优先补来源就绪'
  if (missed.some(item => item.key === 'filter_rules')) return '优先删无关背景'
  return ''
}
