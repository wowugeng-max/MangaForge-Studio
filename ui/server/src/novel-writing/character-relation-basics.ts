import { anchorMatchScore } from './text-matching'

function asArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (value == null || value === '') return []
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

export function characterRelationArray(values: any) {
  return asArray(values).map((item: any) => compactBriefText(item)).filter(Boolean)
}

export function countCharacterRelationSignals(chapterText: string, patterns: RegExp[]) {
  const text = String(chapterText || '')
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0)
}

export function normalizeCharacterRelationCheck(
  key: string,
  label: string,
  values: any,
  chapterText: string,
  patterns: RegExp[],
  issue: string,
  repairInstruction: string,
  options: { minSignals?: number; threshold?: number } = {},
) {
  const planned = characterRelationArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const scored = planned.map(item => ({ text: item, match: anchorMatchScore(item, chapterText) }))
  const deliveredItems = scored.filter(item => item.match.score >= Number(options.threshold || 30)).length
  const signalCount = countCharacterRelationSignals(chapterText, patterns)
  const blockedByExplicitRisk = (
    (key === 'important_relationships' && /只是互相支持|关系没有变化|没有变化/.test(text))
    || (key === 'independent_goals' && /只围着主角转|没有自己的目标|没有独立目标/.test(text))
    || (key === 'tests_or_pressure' && /只是互相支持|关系没有变化/.test(text))
    || (key === 'attitude_shifts' && /关系没有变化|没有变化/.test(text))
  )
  const delivered = !blockedByExplicitRisk && (deliveredItems >= Math.max(1, Math.ceil(planned.length * 0.35)) || signalCount >= Number(options.minSignals || 2))
  return {
    key,
    label,
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, Math.round((deliveredItems / Math.max(1, planned.length)) * 100)) : Math.max(18, signalCount * 18),
    evidence: uniqueBriefStrings([
      ...scored.flatMap(item => item.match.matched),
      signalCount >= Number(options.minSignals || 2) ? `${label}信号可见` : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.filter(item => anchorMatchScore(item, chapterText).score < Number(options.threshold || 30)).slice(0, 8),
    issue: delivered ? '' : issue,
    repair_instruction: delivered ? '' : repairInstruction,
  }
}

export function normalizeCharacterRelationGoalOwnershipCheck(values: any, chapterText: string) {
  const planned = characterRelationArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const rawHelperOnly = /主角(?:整章|全程|只是|只是在|一路)?[^。！？\n]{0,18}(?:只是|只是在|全程|一路)?帮[^。！？\n]{0,30}(?:洗清|完成|调查|找证据|实现|作证)|只是帮[^。！？\n]{0,30}(?:洗清|完成|调查|找证据|实现)|没有自己的[^。！？\n]{0,12}(?:目标|诉求)|变成(?:配角|工具人)/.test(text)
  const negatesHelperOnly = /不是帮|不只是帮|不能只是帮|不能只是替|不只是替|并非只是帮/.test(text)
  const helperOnly = rawHelperOnly && !negatesHelperOnly
  const hasOwnGoal = /主角目标属于自己的|主角的独立目标|自己的目标|为了自己的|自己的(?:客户授权|试炼资格|维修资格|维修铺|后续接单资格)|保住(?:客户授权|试炼资格|维修资格)|拿回|守住|主动追责|主动要求/.test(text)
  const hasAgency = /主动|要求|选择|承担|代价|诉求|追责|复核|保住|拿回|守住/.test(text)
  const delivered = !helperOnly && hasOwnGoal && hasAgency
  return {
    key: 'goal_ownership_rules',
    label: '目标归属',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(16, [!helperOnly, hasOwnGoal, hasAgency].filter(Boolean).length * 28),
    evidence: [
      hasOwnGoal ? '主角自己的目标' : '',
      hasAgency ? '主动选择/代价' : '',
      helperOnly ? '主角只是帮别人目标' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      helperOnly ? '主角目标被写成帮别人实现目标' : '',
      !hasOwnGoal ? '缺主角自己的诉求或目标' : '',
      !hasAgency ? '缺主角主动选择、行动或代价' : '',
    ], 8),
    issue: delivered ? '' : '主角目标归属不清：主角像是在帮别人实现目标，容易沦为关系线里的配角/工具人。',
    repair_instruction: delivered ? '' : '按 oh-story 主角目标独立性修复：把行动改成主角自己的诉求驱动，明确他要保住/拿回/证明什么，并让配角目标与主角目标摩擦或互补，而不是吞掉主角行动归属。',
  }
}

export function normalizeCharacterRelationLifeRuleCheck(values: any, chapterText: string) {
  const planned = characterRelationArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const rawToolRisk = /只(?:负责|剩下|用来|会)?(?:恋爱|发糖|陪伴|情绪支持|被爱|被需要)|单薄的情感工具人|恋爱工具人|情感工具人|只围着(?:恋爱|感情线|主角)转/.test(text)
  const negatesToolRisk = /不能只是|不是单薄|不只是|不能只|不得只|并非只是/.test(text)
  const toolRisk = rawToolRisk && !negatesToolRisk
  const hasBeyondRomance = /恋爱之外|感情之外|除了(?:恋爱|感情|关系线)|独立目标|自己的目标|自己的(?:事业|责任|任务|账册|家族|案子|风险|代价|行动线|资源|身份|前途|名声)|洗清|守住|承担|作证后果|保住|争取|追查|处理/.test(text)
  const hasActiveLife = /主动|选择|承担|洗清|守住|追查|作证|争取|保住|处理|安排|负责|得罪|代价|风险|责任/.test(text)
  const delivered = !toolRisk && hasBeyondRomance && hasActiveLife
  return {
    key: 'relationship_life_rules',
    label: '角色不止恋爱',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(16, [!toolRisk, hasBeyondRomance, hasActiveLife].filter(Boolean).length * 28),
    evidence: [
      hasBeyondRomance ? '恋爱之外的目标/责任/行动线' : '',
      hasActiveLife ? '角色主动行动或承担代价' : '',
      toolRisk ? '角色被写成恋爱/情绪工具人' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      toolRisk ? '角色被写成单薄的恋爱/情绪工具人' : '',
      !hasBeyondRomance ? '缺恋爱之外的事业、责任、资源、身份、风险或行动线' : '',
      !hasActiveLife ? '缺角色自己的主动行动、选择或代价' : '',
    ], 8),
    issue: delivered ? '' : '关系角色缺少恋爱之外的生活内容：角色容易只剩情感支持、发糖或被需要感。',
    repair_instruction: delivered ? '' : '按 oh-story 关系线修复：给重要关系角色补恋爱之外的目标、责任、资源、身份风险或行动线，并让亲密推进踩在自己的选择、代价和主动行动上。',
  }
}

export function normalizeCharacterRelationExpectationHubCheck(values: any, chapterText: string) {
  const planned = characterRelationArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const onlyPraise = /只在旁边夸|只是夸|只(?:负责|剩下)?(?:夸赞|称赞|鼓掌|陪伴)|没有(?:短期|长期)期待|没有回到[^。！？\n]{0,18}开启新任务|没有(?:开启|递出|带来)[^。！？\n]{0,18}(?:新任务|新剧情|下一轮|更大好处)|只是消失/.test(text)
  const hasHub = /配角期待枢纽|人物扣|任务基地|期待枢纽/.test(text)
  const hasShortAndLong = /短期[^。！？\n]{0,24}长期|长期[^。！？\n]{0,24}短期|短期期待[^。！？\n]{0,30}长期期待|长期期待[^。！？\n]{0,30}短期期待/.test(text)
  const hasReturnLoop = /(?:解决|完成|装完逼|兑现)[^。！？\n]{0,36}(?:后|之后)[^。！？\n]{0,36}(?:回到|去找|找到)|(?:回到|去找|找到)[^。！？\n]{0,24}(?:开启|开始|递出)[^。！？\n]{0,28}(?:新一轮|下一轮|新任务|新剧情|线索)|开启[^。！？\n]{0,20}(?:新一轮装逼|下一轮新任务|新剧情)/.test(text)
  const hasExitBenefit = /(?:下线|暂时离场|离开)[^。！？\n]{0,40}(?:更大好处|更多|收获|钥匙|授权|线索)|损失厌恶|歪打误撞[^。！？\n]{0,20}收获更多|更大好处/.test(text)
  const delivered = !onlyPraise && hasHub && hasShortAndLong && hasReturnLoop && hasExitBenefit
  return {
    key: 'expectation_hub_rules',
    label: '配角期待枢纽',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 90 : Math.max(16, [hasHub, hasShortAndLong, hasReturnLoop, hasExitBenefit].filter(Boolean).length * 22 - (onlyPraise ? 12 : 0)),
    evidence: [
      hasHub ? '任务基地/期待枢纽可见' : '',
      hasShortAndLong ? '短期和长期期待同时承载' : '',
      hasReturnLoop ? '事件解决后回到该人物开启下一轮' : '',
      hasExitBenefit ? '下线/离场转化为更大好处' : '',
      onlyPraise ? '配角只夸赞/消失，没有新期待' : '',
    ].filter(Boolean),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      onlyPraise ? '配角只夸赞、陪伴或消失，没有承担任务基地功能' : '',
      !hasHub ? '缺配角期待枢纽/人物扣/任务基地定位' : '',
      !hasShortAndLong ? '缺同一配角同时承载短期和长期期待' : '',
      !hasReturnLoop ? '缺主角解决事件后回到该人物开启新一轮装逼、新任务或新剧情' : '',
      !hasExitBenefit ? '缺人物下线时带来更大好处，无法转化损失厌恶' : '',
    ], 8),
    issue: delivered ? '' : '配角没有承担期待枢纽功能：关系角色只停在陪伴、夸赞或一次性出场，无法把当前单元接到下一轮剧情。',
    repair_instruction: delivered ? '' : '按 oh-story 人物扣修复：选一个关键配角做任务基地，同时挂短期期待和长期期待；主角解决事件装完逼后回到该人物处，由他/她递出新任务、新线索或新剧情；如果该人物暂时下线，必须带来更大好处来转化损失厌恶。',
  }
}

export function normalizeCharacterRelationBufferZoneCheck(values: any, chapterText: string) {
  const planned = characterRelationArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const noBuffer = /没有(?:信息差|地位差距|亲密度差距|信任程度|缓冲区)|完全信任|所有信息一次性交出来|没有[^。！？\n]{0,24}信任程度变化/.test(text)
  const rawNpcRisk = /NPC|站桩|等主角|等待(?:主角)?触发|站在旁边等/.test(text)
  const negatedNpcRisk = /(?:不是|不能|不再|避免|不得)[^。！？\n]{0,12}(?:NPC|站桩|等主角|等待(?:主角)?触发|站在旁边等)/.test(text)
  const npcRisk = rawNpcRisk && !negatedNpcRisk
  const noAttitudeShift = /没有[^。！？\n]{0,24}(?:态度变化|从旁观|从质疑|协助|设限)/.test(text)
  const hasBuffer = !noBuffer && /配角攻略缓冲区|信息差|地位差距|亲密度差距|信任程度|仍有边界|保留[^。！？\n]{0,16}边界|半页账册|钥匙来源|不共享/.test(text)
  const hasActiveAction = !npcRisk && /主动|先联系|拿到证词|作证|协助|设下|洗清|为了[^。！？\n]{0,20}(?:目标|责任|授权|账册)|带着[^。！？\n]{0,18}(?:目标|责任|动机)/.test(text)
  const hasAttitudeShift = !noAttitudeShift && /从[^。！？\n]{0,18}(?:旁观|质疑|拒绝|试探)[^。！？\n]{0,28}转为[^。！？\n]{0,24}(?:行动|协助|设限|主动作证)|(?:旁观|质疑|拒绝|试探)[^。！？\n]{0,24}(?:随后|终于|转为)[^。！？\n]{0,24}(?:行动|协助|设限|主动作证)|态度变化/.test(text)
  const delivered = hasBuffer && hasActiveAction && hasAttitudeShift
  return {
    key: 'buffer_zone_rules',
    label: '配角攻略缓冲区',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 90 : Math.max(12, [hasBuffer, hasActiveAction, hasAttitudeShift].filter(Boolean).length * 28 - [noBuffer, npcRisk, noAttitudeShift].filter(Boolean).length * 8),
    evidence: delivered
      ? uniqueBriefStrings([
          hasBuffer ? '信息差/边界缓冲区可见' : '',
          hasActiveAction ? '配角带着自己的目标主动行动' : '',
          hasAttitudeShift ? '旁观/质疑/拒绝/试探到行动/协助/设限的态度变化可见' : '',
        ], 8)
      : uniqueBriefStrings([
          noBuffer ? '关系缺少缓冲区或一次性交出全部信息' : '',
          npcRisk ? '配角像 NPC 一样站桩等待触发' : '',
          noAttitudeShift ? '正文显式缺少态度变化' : '',
        ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasBuffer ? '缺信息差/地位差距/亲密度差距/信任程度缓冲区' : '',
      !hasActiveAction ? '配角像 NPC 一样站桩等待触发' : '',
      !hasAttitudeShift ? '缺旁观/质疑/拒绝/试探到行动/协助/设限的态度变化' : '',
    ], 8),
    issue: delivered ? '' : '配角攻略缓冲区没有落成正文证据：配角可能一次性交出全部信任，或只是站桩等待主角触发。',
    repair_instruction: delivered ? '' : '按 oh-story 配角攻略缓冲区修复：始终保留信息差、地位差距、亲密度差距或信任程度之一；让配角带着自己的目标主动行动；在关键拐点写清从旁观/质疑/拒绝/试探到行动/协助/设限的态度变化。',
  }
}

export function normalizeCharacterRelationQualityCheck(values: any, chapterText: string) {
  const planned = characterRelationArray(values)
  if (!planned.length) return null
  const signalCount = countCharacterRelationSignals(chapterText, [
    /关系类型|合作互信|边界|联盟|竞争|师徒|上下级/,
    /独立目标|自己的目标|主角.*目标|配角.*目标|洗清|保住/,
    /压力测试|追责|背锅|撤授权|考验|冲突/,
    /态度变化|转为|不再|主动作证|愿意协助/,
    /阶段|亲密|好感|边界/,
  ])
  const delivered = signalCount >= 4
  return {
    key: 'quality_checks',
    label: '阶段匹配',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(18, signalCount * 16),
    evidence: delivered ? ['关系类型、独立目标、压力测试、态度变化和阶段匹配信号可见'] : [],
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned.slice(0, 8),
    issue: delivered ? '' : '关系线质量检查没有落成正文证据，容易只停留在设定表。',
    repair_instruction: delivered ? '' : '补关系阶段匹配：用行动、对话和选择写出关系类型、独立目标、压力测试、态度变化和阶段边界。',
  }
}

export function buildCharacterRelationDeterministicCheck(chapterText: string) {
  const text = String(chapterText || '')
  const risks = [
    /只是互相支持|互相支持/.test(text) ? {
      key: 'only_mutual_support',
      label: '只有互相支持',
      evidence: '正文把关系写成只是互相支持，没有考验和变化。',
      fix: '补关系压力测试，让支持变成一次有代价的选择。',
    } : null,
    /关系没有变化|没有变化/.test(text) ? {
      key: 'no_relation_shift',
      label: '关系无变化',
      evidence: '正文直接承认关系没有变化。',
      fix: '补从旁观/质疑到行动/协助的态度变化。',
    } : null,
    /只围着主角转|没有自己的目标|没有独立目标/.test(text) ? {
      key: 'no_independent_goal',
      label: '缺独立目标',
      evidence: '配角只围着主角转，没有自己的目标。',
      fix: '给关系对手或重要配角补独立目标和主动行动。',
    } : null,
    /男主替主角解决全部问题|替主角解决全部问题|替她解决全部问题/.test(text) ? {
      key: 'rescuer_solves_all',
      label: '替主角解决',
      evidence: '男主或配角替主角解决全部问题，削弱主角主体性。',
      fix: '让主角保留关键判断、行动和代价，配角只能提供压力、证据或协助。',
    } : null,
    /只(?:负责|剩下|用来|会)?(?:恋爱|发糖|陪伴|情绪支持|被爱|被需要)|单薄的情感工具人|恋爱工具人|情感工具人|只围着(?:恋爱|感情线|主角)转/.test(text) ? {
      key: 'romance_tool_role',
      label: '情感工具人',
      evidence: '关系角色只剩恋爱、发糖、陪伴或情绪支持，没有恋爱之外的内容。',
      fix: '给关系角色补事业、责任、资源、身份风险或行动线，让关系推进踩在自己的选择和代价上。',
    } : null,
  ].filter(Boolean)
  if (!risks.length) return null
  return {
    key: 'character_relation_forbidden',
    label: '角色关系硬伤',
    text: '角色关系不得只是互相支持、没有变化、配角只围着主角转或替主角解决全部问题。',
    expected: '角色关系不得只是互相支持、没有变化、配角只围着主角转或替主角解决全部问题。',
    score: Math.max(0, 100 - risks.length * 24),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项角色关系确定性风险。`,
    repair_instruction: '按 oh-story 角色关系口径修复：明确关系类型，补双方独立目标、压力测试、主动行动、态度变化和阶段边界。',
  }
}

export function characterRelationPriority(missed: any[]) {
  if (missed.some(item => item.key === 'buffer_zone_rules')) return '优先补配角攻略缓冲区'
  if (missed.some(item => item.key === 'expectation_hub_rules')) return '优先补配角期待枢纽'
  if (missed.some(item => item.key === 'character_relation_forbidden')) return '优先清关系硬伤'
  if (missed.some(item => item.key === 'goal_ownership_rules')) return '优先补目标归属'
  if (missed.some(item => item.key === 'relationship_life_rules')) return '优先补角色非恋爱行动线'
  if (missed.some(item => item.key === 'important_relationships')) return '优先补关系弧线'
  if (missed.some(item => item.key === 'independent_goals')) return '优先补独立目标'
  if (missed.some(item => item.key === 'tests_or_pressure')) return '优先补关系压力'
  if (missed.some(item => item.key === 'attitude_shifts')) return '优先补态度变化'
  if (missed.some(item => item.key === 'relationship_types')) return '优先明关系类型'
  return ''
}
