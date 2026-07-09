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

export function informationFlowArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => compactBriefText(item)).filter(Boolean), 20)
}

export function normalizeInformationFlowCheck(key: string, label: string, values: any[], chapterText: string, fix: string, threshold = 34) {
  const planned = informationFlowArray(values)
  if (!planned.length) return null
  const checked = planned.map(text => {
    const match = anchorMatchScore(text, chapterText)
    return {
      text,
      score: match.score,
      evidence: match.matched,
      delivered: match.score >= threshold,
    }
  })
  const missed = checked.filter(item => !item.delivered)
  return {
    key,
    label,
    text: planned.join('；'),
    expected: planned.join('；'),
    score: Math.round(checked.reduce((sum, item) => sum + Number(item.score || 0), 0) / Math.max(1, checked.length)),
    evidence: checked.flatMap(item => item.evidence).filter(Boolean).slice(0, 8),
    delivered: missed.length === 0,
    status: missed.length === 0 ? 'ok' : 'warn',
    missed_items: missed.map(item => item.text),
    issue: missed.length === 0 ? '' : `${label}未充分落地：${missed.map(item => item.text).join('；')}`,
    repair_instruction: missed.length === 0 ? '' : fix,
  }
}

type InformationFlowScanners = {
  scanInfodumpRisks?: (text: string) => any[]
  scanDialogueInfodumpRisks?: (text: string) => any[]
}

export function buildInformationFlowInfodumpCheck(contract: any, chapterText: string, scanners: InformationFlowScanners = {}) {
  const guardrails = informationFlowArray(
    contract.no_infodump_guardrails,
    contract.noInfodumpGuardrails,
    contract.water_risk_guards,
    contract.waterRiskGuards,
  )
  const infodumpRisks: any[] = [
    ...asArray(scanners.scanInfodumpRisks?.(chapterText)),
    ...asArray(scanners.scanDialogueInfodumpRisks?.(chapterText)),
  ]
  if (
    /解释了很多(?:背景|规则|设定|制度)|制度分为|体系分为|漫长历史|大家终于明白规则|事情进入下一阶段/.test(String(chapterText || ''))
  ) {
    infodumpRisks.push({
      key: 'information_flow_summary_infodump',
      label: '短水文说明扫描',
      evidence: '正文用解释背景、制度分层或“事情进入下一阶段”概括信息推进。',
      fix: '把背景说明改成审问、证据、规则触发、代价反馈或角色判断中的可见信息释放。',
    })
  }
  if (!guardrails.length && !infodumpRisks.length) return null
  return {
    key: 'no_infodump_guardrails',
    label: '背景说明书',
    text: guardrails.join('；') || '信息必须随冲突释放，不写背景说明书。',
    expected: guardrails.join('；') || '信息必须随冲突释放，不写背景说明书。',
    score: infodumpRisks.length ? Math.max(0, 100 - infodumpRisks.length * 28) : 92,
    evidence: infodumpRisks.map((item: any) => compactBriefText(item.evidence || item.fix)).filter(Boolean).slice(0, 8),
    delivered: infodumpRisks.length === 0,
    status: infodumpRisks.length === 0 ? 'ok' : 'warn',
    missed_items: infodumpRisks.map((item: any) => compactBriefText(item.evidence || item.label)).filter(Boolean).slice(0, 8),
    issue: infodumpRisks.length === 0 ? '' : `正文存在 ${infodumpRisks.length} 处背景说明书/设定说明风险。`,
    repair_instruction: infodumpRisks.length === 0 ? '' : '把设定信息拆进冲突、动作、对话、规则触发、代价反馈或角色判断里；删掉不影响当前选择的背景说明。',
  }
}

export function buildInformationFlowTransitionCompressionCheck(contract: any, chapterText: string) {
  const planned = informationFlowArray(
    contract.transition_compression_rules,
    contract.transitionCompressionRules,
  )
  if (!planned.length) return null
  const text = String(chapterText || '')
  const fillerRisks = [
    /走过(?:长廊|街道|路口|院子|走廊)|穿过(?:长廊|街道|院子|人群)/.test(text) ? '纯移动过渡' : '',
    /寒暄(?:了几句|片刻|一番)|互相寒暄|闲聊(?:了几句|片刻|一番)/.test(text) ? '寒暄过渡' : '',
    /看了窗外(?:天气|雨|天色)|望着窗外|天色渐暗|阳光洒在/.test(text) ? '环境过渡' : '',
    /事情进入下一阶段|一切告一段落|接下来就是|随后他们来到了|时间很快过去/.test(text) ? '概括式换场' : '',
    /没有信息量|拖字数|纯过渡/.test(text) ? '正文承认无信息过渡' : '',
  ].filter(Boolean)
  const compressionSignals = /过渡不是填充|没有信息量就(?:删掉|删除)|直接跳过|一句带过|压缩|带过|删无信息量过渡|不拖泥带水/.test(text)
  const usefulTransitionSignals = /余韵|后果|压力延续|回应悬念|验证|反转|升级|下一步目标|信息差|风险|代价/.test(text)
  const delivered = fillerRisks.length === 0 && (compressionSignals || usefulTransitionSignals)
  return {
    key: 'transition_compression_rules',
    label: '过渡压缩',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(12, [fillerRisks.length === 0, compressionSignals, usefulTransitionSignals].filter(Boolean).length * 28),
    evidence: uniqueBriefStrings([
      compressionSignals ? '过渡压缩信号可见' : '',
      usefulTransitionSignals ? '过渡承担信息/风险/情绪/目标' : '',
      ...fillerRisks,
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      ...fillerRisks,
      !compressionSignals && !usefulTransitionSignals ? '缺过渡压缩或有效信息承载' : '',
    ], 8),
    issue: delivered ? '' : '过渡场景没有被压缩：纯移动、寒暄、环境描写或概括式换场正在拖慢信息流。',
    repair_instruction: delivered ? '' : '按 oh-story 信息流修复：过渡不是填充，没有信息量就删掉；纯移动/寒暄/环境描写直接跳过或压成一句，并把过场改成信息、风险、情绪余波或下一步目标。',
  }
}

export function buildInformationFlowNextObjectiveCheck(contract: any, chapterText: string) {
  const planned = informationFlowArray(
    contract.next_objective_rules,
    contract.nextObjectiveRules,
  )
  if (!planned.length) return null
  const text = String(chapterText || '')
  const gainSignals = uniqueBriefStrings([
    /突破|晋升|升级|升阶|实力提升|境界提升|身份提升|资源到账|奖励到账|收获/.test(text) ? '实力/身份/资源提升' : '',
    /拿到(?:资格|名额|令牌|资源|灵石|法器|权限)|获得(?:资格|名额|令牌|资源|权限)|通过(?:考核|门槛|试炼|测试)/.test(text) ? '阶段性目标达成' : '',
    /赢下|取胜|胜利|达成目标|完成目标|过关|破局|解封|觉醒|掌握/.test(text) ? '胜利/破局信号' : '',
  ], 6)
  if (!gainSignals.length) return null
  const nextObjectiveSignals = uniqueBriefStrings([
    /下一步|下一关|新目标|新挑战|新门槛|更高门槛|新的代价|下一目标/.test(text) ? '下一目标明示' : '',
    /三日内|七日内|期限|资格作废|否则|必须[^。！？!?]{0,36}(?:取回|查明|赶往|面对|完成|证明|拿到|通过)/.test(text) ? '目标带期限/代价' : '',
    /禁库|试炼|追查|赶往|面对(?:新|更强|下一)|更强(?:对手|敌人)|新任务|新线索|更大问题/.test(text) ? '新挑战/新线索可见' : '',
  ], 8)
  const vacuumRisks = uniqueBriefStrings([
    /事情进入下一阶段|一切告一段落|暂时没有新的目标|没有新的目标|之后再说|暂无下一步/.test(text) ? '提升后只写概括或目标真空' : '',
    /欢呼许久|庆祝了许久|终于可以休息|众人散去/.test(text) && !nextObjectiveSignals.length ? '提升后停在庆祝/休息' : '',
  ], 6)
  const delivered = nextObjectiveSignals.length > 0 && !vacuumRisks.length
  return {
    key: 'next_objective_after_gain',
    label: '提升后下一目标',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(12, nextObjectiveSignals.length * 28),
    evidence: uniqueBriefStrings([
      ...gainSignals,
      ...nextObjectiveSignals,
      ...vacuumRisks,
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      ...vacuumRisks,
      !nextObjectiveSignals.length ? '缺提升后的新挑战/目标/代价/更高门槛' : '',
    ], 8),
    issue: delivered ? '' : '主角实力、身份、资源或阶段性目标提升后，正文没有立刻给出下一步要争什么。',
    repair_instruction: delivered ? '' : '按 oh-story 剧情过渡修复：每次提升后立即引入新的挑战、目标、代价或更高门槛；把“事情进入下一阶段”改成场景内可见的下一步行动。',
  }
}

export function informationFlowPriority(missed: any[]) {
  if (missed.some(item => item.key === 'next_objective_after_gain')) return '优先补提升后下一目标'
  if (missed.some(item => item.key === 'no_infodump_guardrails')) return '优先删背景说明书'
  if (missed.some(item => item.key === 'transition_compression_rules')) return '优先删无信息量过渡'
  if (missed.some(item => item.key === 'reveal_order')) return '优先修揭示顺序'
  if (missed.some(item => item.key === 'suspense_responses')) return '优先补悬念回应'
  if (missed.some(item => item.key === 'information_units')) return '优先补信息团'
  return ''
}
