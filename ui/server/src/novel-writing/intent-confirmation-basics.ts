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

export function intentConfirmationArray(...values: any[]) {
  return uniqueBriefStrings(values.flatMap(value => asArray(value)).map((item: any) => assetText(item) || compactBriefText(item)).filter(Boolean), 24)
}

export function intentConfirmationAnchorScore(values: string[], chapterText: string, threshold = 24) {
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

export function normalizeIntentConfirmedCheck(value: any, chapterText: string) {
  const expected = compactBriefText(value)
  if (!expected) return null
  const match = anchorMatchScore(expected, chapterText)
  const text = String(chapterText || '')
  const hasIntentEvidence = /信息差|反杀|反证|第二枚血契编号|夺回[^。！？!?]{0,20}解释权|解释权|压问|逼问|改口|说漏/.test(text)
  const generic = /大家讨论很久|事情就解决了|本章只是过渡|陆续表达了自己的想法|之后再说/.test(text)
  const delivered = !generic && (match.score >= 22 || hasIntentEvidence)
  return {
    key: 'confirmed_intent',
    label: '确认意图',
    text: expected,
    expected,
    score: delivered ? Math.max(84, match.score) : Math.min(match.score, generic ? 18 : 52),
    evidence: uniqueBriefStrings([...match.matched, hasIntentEvidence ? '本章意图信号可见' : '', generic ? '泛化过渡叙事' : ''], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : [expected],
    issue: delivered ? '' : '正文看不出本章确认过的核心意图，或把意图写成泛化过渡/结果摘要。',
    repair_instruction: delivered ? '' : '补本章意图：用现场压力、信息差、反证或角色选择证明正文按确认意图执行。',
  }
}

export function normalizeIntentRhythmStyleCheck(values: any[], chapterText: string) {
  const planned = intentConfirmationArray(values)
  if (!planned.length) return null
  const anchor = intentConfirmationAnchorScore(planned, chapterText, 22)
  const text = String(chapterText || '')
  const rhythmEvidence = /三轮|第一轮|第二轮|第三轮|压问|短句|反击|爆发|冷却|承接|停顿|静了/.test(text)
  const flat = /均匀叙事|大家讨论很久|本章只是过渡|事情就解决了|说了很多背景/.test(text)
  const delivered = !flat && (anchor.missed.length === 0 || rhythmEvidence)
  return {
    key: 'rhythm_and_style',
    label: '节奏/文风',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? Math.max(84, anchor.score) : Math.min(anchor.score, flat ? 20 : 52),
    evidence: uniqueBriefStrings([...anchor.evidence, rhythmEvidence ? '节奏/停顿/爆发信号可见' : '', flat ? '均匀过渡叙事' : ''], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : anchor.missed.map(item => item.text),
    issue: delivered ? '' : '节奏、停顿、蓄势爆发或文风指令没有进入正文，或正文被均匀叙事冲淡。',
    repair_instruction: delivered ? '' : '补节奏/文风：把蓄势、短句、爆发、冷却和承接写成可见段落节拍。',
  }
}

export function intentCostRewardPlan(contract: any) {
  return compactBriefText(
    contract?.cost_and_reward
    || contract?.costAndReward
    || intentConfirmationArray(contract?.structure_inputs || contract?.structureInputs).find(item => /代价|收益|cost|reward/i.test(item)),
  )
}

function intentEndingPlan(contract: any) {
  return compactBriefText(
    contract?.ending_handoff
    || contract?.endingHandoff
    || intentConfirmationArray(contract?.structure_inputs || contract?.structureInputs).find(item => /章尾|承接|下一章|ending|hook|handoff/i.test(item)),
  )
}

export function normalizeIntentEndingHandoffCheck(contract: any, chapterText: string) {
  const plan = intentEndingPlan(contract)
  if (!plan) return null
  const match = anchorMatchScore(plan, chapterText, { tailOnly: true })
  const tail = String(chapterText || '').slice(-1000)
  const hasHandoff = /章尾|下一章|下一问|追问|未解|指向|来源|谁给|第三个证人|封条来源/.test(tail)
  const dropped = /之后再说|没有接到|暂且不提|以后再讲/.test(tail)
  const delivered = !dropped && (match.score >= 18 || hasHandoff)
  return {
    key: 'ending_handoff',
    label: '章尾承接',
    text: plan,
    expected: plan,
    score: delivered ? Math.max(84, match.score) : Math.min(match.score, dropped ? 14 : 50),
    evidence: uniqueBriefStrings([...match.matched, hasHandoff ? '章尾追问/承接可见' : '', dropped ? '章尾承接被推迟' : ''], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : [plan],
    issue: delivered ? '' : '章尾没有把本章爆发后的信息、编号、反证或问题接成下一章追问。',
    repair_instruction: delivered ? '' : '补章尾承接：爆发后用一段冷却承接下一钩子，把本章信息差转成下一章问题。',
  }
}

export function normalizeIntentReactionCheck(values: any[], chapterText: string) {
  const planned = intentConfirmationArray(values).filter(item => /反应|信息差|爽点|期待|危机|reaction/i.test(item))
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasReaction = /脸色|沉默|静了|看懂|旁听席|在场|反应|变了|改口|站队|差异化/.test(text)
  const generic = /大家讨论很久|陆续表达了自己的想法|没有人有什么反应/.test(text)
  return {
    key: 'information_gap_reaction',
    label: '信息差反应',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: hasReaction && !generic ? 86 : 46,
    evidence: uniqueBriefStrings([hasReaction ? '信息差反应可见' : '', generic ? '反应泛化' : ''], 8),
    delivered: hasReaction && !generic,
    status: hasReaction && !generic ? 'ok' : 'warn',
    missed_items: hasReaction && !generic ? [] : planned,
    issue: hasReaction && !generic ? '' : '信息差、揭露、打脸或反证后，在场角色缺少差异化反应。',
    repair_instruction: hasReaction && !generic ? '' : '补信息差反应：让旁观者、对手、盟友分别给出不同反应，放大爽点。',
  }
}

export function normalizeIntentDialogueToneBaselineCheck(values: any[], chapterText: string) {
  const planned = intentConfirmationArray(values)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasToneEvidence = /压问|逼问|短句|冷静|停顿|沉默|脸色|看懂|反问|质问|情绪|承接/.test(text)
  const infotalk = /科普|说明书|解释了很多|介绍了很多|说了很多背景|大量背景|完整来历|制度和来历/.test(text)
  const lightToneLeak = /轻快吐槽|搞笑担当|开玩笑|插科打诨|嬉皮笑脸/.test(text)
  const emotionJump = /突然轻松|马上轻松|情绪跳过|没有情绪承接|直接转笑/.test(text)
  const delivered = hasToneEvidence && !infotalk && !lightToneLeak && !emotionJump
  return {
    key: 'dialogue_tone_baseline',
    label: '对白基调',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 86 : 42,
    evidence: uniqueBriefStrings([
      hasToneEvidence ? '对白基调/情绪承接信号可见' : '',
      infotalk ? '信息型配角或对白出现科普嘴/说明书化' : '',
      lightToneLeak ? '轻快/搞笑声线冲淡高压基调' : '',
      emotionJump ? '对话情绪跳步或没有承接' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : planned,
    issue: delivered ? '' : '对白声线没有服从本章基调，或信息型配角变成科普嘴、轻快声线冲淡高压/悲痛/生死 beat。',
    repair_instruction: delivered ? '' : '补对白基调：高压/生死/悲痛 beat 中让轻快声线让位，把信息改成立场、追问、误导、证据或行动承接，并逐句接住对方情绪。',
  }
}

export function buildIntentConfirmationDeterministicCheck(chapterText: string) {
  const text = String(chapterText || '')
  const risks = [
    /大家讨论很久|事情就解决了|陆续表达了自己的想法/.test(text) ? {
      key: 'generic_resolution',
      label: '泛化解决',
      evidence: '正文用讨论/总结替代本章意图的现场执行。',
      fix: '把讨论结果改成压力、选择、反证、反应和后果链。',
    } : null,
    /本章只是过渡|之后再说|暂且不提/.test(text) ? {
      key: 'transition_only',
      label: '过渡章空转',
      evidence: '正文承认本章只是过渡或把关键承接推迟。',
      fix: '本章必须有明确意图、代价收益和章尾问题，不能只当连接段。',
    } : null,
    /没有代价|没有收益|毫无代价|不需要付出/.test(text) ? {
      key: 'no_cost_reward',
      label: '代价收益跳过',
      evidence: '正文直接否定代价或收益。',
      fix: '补出谁付出代价、谁获得收益、后续账是什么。',
    } : null,
    /说了很多背景|介绍了很多背景|大量背景/.test(text) ? {
      key: 'background_dilution',
      label: '背景冲淡意图',
      evidence: '正文用背景说明稀释情绪、节奏和模块意图。',
      fix: '删掉不服务本章意图的背景，把信息放入冲突和反应。',
    } : null,
  ].filter(Boolean)
  if (!risks.length) return null
  return {
    key: 'intent_confirmation_forbidden',
    label: '意图确认硬伤',
    text: '意图确认不得写成泛化过渡、讨论后解决、无代价收益、无章尾承接或背景说明。',
    expected: '意图确认不得写成泛化过渡、讨论后解决、无代价收益、无章尾承接或背景说明。',
    score: Math.max(0, 100 - risks.length * 24),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix || item.label)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项意图确认确定性风险。`,
    repair_instruction: '按 oh-story 意图确认修复：重申本章意图，校准情绪节奏，补信息差反应、代价/收益和章尾承接。',
  }
}

export function buildIntentConfirmationSelfReportCheck(chapterText: string) {
  const text = String(chapterText || '')
  const selfReportMatches = uniqueBriefStrings(
    [...text.matchAll(/(?:确认意图|本章意图|信息差反杀|节奏\/文风|节奏|文风|三轮压问|短句反击|结构输入|内容概括|逻辑线|出场顺序|代价\/?收益|章尾承接|对白基调|信息差反应)[^。！？!?\n]{0,28}(?:已确认|已经确认|已完成|已经完成|已落地|已经落地|可见)/g)]
      .map(match => compactBriefText(match[0])),
    8,
  )
  if (!selfReportMatches.length) return null
  return {
    key: 'intent_confirmation_self_report',
    label: '意图确认自证',
    text: '意图确认不能只写“已确认/已完成/已落地/可见”，必须用正文动作、对白、信息变化、关系变化或章尾问题证明。',
    expected: '意图确认必须有正文证据，而不是回执式自证。',
    score: 18,
    evidence: selfReportMatches,
    delivered: false,
    status: 'warn',
    missed_items: selfReportMatches,
    issue: '正文或回执式文本用泛化自证替代了意图确认的现场执行证据。',
    repair_instruction: '把“已确认/已完成/已落地/可见”改成可定位的现场动作、对白交锋、信息差反应、代价收益和章尾追问。',
  }
}

export function intentConfirmationPriority(missed: any[]) {
  if (missed.some(item => item.key === 'intent_confirmation_forbidden')) return '优先清意图硬伤'
  if (missed.some(item => item.key === 'intent_confirmation_self_report')) return '优先删自证回执'
  if (missed.some(item => item.key === 'confirmed_intent')) return '优先重申本章意图'
  if (missed.some(item => item.key === 'cost_reward')) return '优先补代价收益'
  if (missed.some(item => item.key === 'ending_handoff')) return '优先补章尾承接'
  if (missed.some(item => item.key === 'dialogue_tone_baseline')) return '优先校准对白基调'
  if (missed.some(item => item.key === 'rhythm_and_style')) return '优先校准节奏文风'
  if (missed.some(item => item.key === 'structure_inputs')) return '优先补结构输入'
  if (missed.some(item => item.key === 'information_gap_reaction')) return '优先补信息差反应'
  return ''
}
