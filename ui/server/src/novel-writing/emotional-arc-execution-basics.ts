import { emotionalArcArray } from './emotional-arc-basics'
import { payoffEscalationDimensionEvidence } from './payoff-design-basics'
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

export function normalizeEmotionModuleRecompositionRulesCheck(contract: any, chapterText: string) {
  const planned = emotionalArcArray(
    contract.emotion_module_recomposition_rules,
    contract.emotionModuleRecompositionRules,
  )
  if (!planned.length) return null
  const text = String(chapterText || '')
  const repeatSignal = /重复|套路|模板|同一个(?:戏剧单元|英雄救美|退婚打脸|打脸模板)|同样结构|反复使用|继续使用/.test(text)
  const noSceneChange = /没有换场景|未换场景|场景没有变化|还是同一场景/.test(text)
  const noOpponentChange = /没有换对手|未换对手|对手没有变化|还是同一对手/.test(text)
  const noNewEmotion = /没有新情绪|没加新情绪|未加新情绪|情绪没有变化/.test(text)
  const noStakesChange = /stakes[^。；\n]{0,20}没有变化|奖励[^。；\n]{0,20}没有变化|代价[^。；\n]{0,20}没有变化|复杂度[^。；\n]{0,20}没有变化/.test(text)
  const negatedRepeatUnit = /没有重复同一个戏剧单元|并未重复同一个戏剧单元|不再重复同一个戏剧单元/.test(text)
  const explicitNoVariation = !negatedRepeatUnit && /重复同一个戏剧单元|同样结构|没有换场景|没有换对手|没有新情绪|stakes[^。；\n]{0,20}没有变化|奖励[^。；\n]{0,20}没有变化/.test(text)
  const hasSceneChange = !noSceneChange && /换场景|场景从[^。；\n]{0,30}换到|换到[^。；\n]{0,16}(审判庭|酒楼|战场|家宴|直播间|擂台)|新场景/.test(text)
  const hasOpponentChange = !noOpponentChange && /换对手|对手从[^。；\n]{0,30}换成|新对手|从路人换成|从小反派换成/.test(text)
  const hasNewEmotion = !noNewEmotion && /加新情绪|新增[^。；\n]{0,18}情绪|新情绪|愧疚|遗憾|心疼|羞耻|安全感|掌控感|旧痛|歉意/.test(text)
  const hasStakesChange = !noStakesChange && /stakes|提高[^。；\n]{0,20}(代价|奖励|风险|门槛|复杂度)|代价[^。；\n]{0,20}(提高|升级|扩大)|奖励[^。；\n]{0,20}(提高|升级|变复杂)|从[^。；\n]{0,24}提高到|从[^。；\n]{0,24}扩大到/.test(text)
  const variationEvidence = uniqueBriefStrings([
    hasSceneChange ? '场景变化' : '',
    hasOpponentChange ? '对手变化' : '',
    hasNewEmotion ? '新增情绪角度' : '',
    hasStakesChange ? 'stakes/奖励复杂度提高' : '',
  ], 8)
  const delivered = !explicitNoVariation && (!repeatSignal || variationEvidence.length > 0)
  return {
    key: 'emotion_module_recomposition_rules',
    label: '情绪模块重组',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(12, variationEvidence.length * 22),
    evidence: uniqueBriefStrings([
      repeatSignal ? '检测到套路/模板复用信号' : '未检测到同一戏剧单元重复',
      ...variationEvidence,
      explicitNoVariation ? '正文显式承认重复模板无变化' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : ['重复戏剧单元没有换场景/对手/新情绪/stakes'],
    issue: delivered ? '' : '正文复用同一套路时没有完成情绪模块重组，读者会感到戏剧单元重复磨损。',
    repair_instruction: delivered ? '' : '按 oh-story 情绪模块重组修复：同一爽感可以重复，但不能重复同一个戏剧单元；至少换场景、换对手、加新情绪或提高 stakes/奖励复杂度之一。',
  }
}

export function normalizeProgressiveConfrontationRulesCheck(contract: any, chapterText: string) {
  const planned = emotionalArcArray(
    contract.progressive_confrontation_rules,
    contract.progressiveConfrontationRules,
  )
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasAngleNotCrush = /角力而非碾压|不是一路碾压|不能一路平推|不是平推|不是一路平推|主角与反派是角力/.test(text)
  const hasSmallWin = /小胜|稍占上风|第一轮|第一回合|只用|对三|对A|先赢一手|顶住压力/.test(text)
  const hasOpponentEscalation = /反派.*加码|对手.*加码|会长.*加码|继续加码|加压|升级|停业单|更高门槛|反派对四|反派对2|逼到/.test(text)
  const hasFinalTrump = /王炸|一锤定音|最后才|最终.*底牌|备份订单|公开备份|底牌.*定音|大胜利/.test(text)
  const delivered = hasAngleNotCrush && hasSmallWin && hasOpponentEscalation && hasFinalTrump
  return {
    key: 'progressive_confrontation_rules',
    label: '递进对抗',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(12, [hasAngleNotCrush, hasSmallWin, hasOpponentEscalation, hasFinalTrump].filter(Boolean).length * 22),
    evidence: uniqueBriefStrings([
      hasAngleNotCrush ? '角力而非碾压' : '',
      hasSmallWin ? '主角小胜/稍占上风' : '',
      hasOpponentEscalation ? '对手继续加码' : '',
      hasFinalTrump ? '最后王炸/一锤定音' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasAngleNotCrush ? '缺角力而非碾压' : '',
      !hasSmallWin ? '缺主角小胜/稍占上风' : '',
      !hasOpponentEscalation ? '缺反派继续加码' : '',
      !hasFinalTrump ? '缺最后王炸一锤定音' : '',
    ], 8),
    issue: delivered ? '' : '正文没有形成 oh-story 递进对抗：主角不能一上来碾压，需要小胜、对手加码、最后王炸。',
    repair_instruction: delivered ? '' : '按 oh-story 递进对抗修复：把对抗改成角力而非碾压；先让主角小胜或稍占上风，再让对手继续加码，最后才释放底牌/王炸一锤定音。',
  }
}

export function normalizeMemePlotFormulaRulesCheck(contract: any, chapterText: string) {
  const planned = emotionalArcArray(
    contract.meme_plot_formula_rules,
    contract.memePlotFormulaRules,
  )
  if (!planned.length) return null
  const text = String(chapterText || '')
  const explicitFormula = /发生\s*[-—>→]+\s*发展\s*[-—>→]+\s*转折\s*[-—>→]+\s*高潮|梗四段式/.test(text)
  const hasOccur = /发生|前提条件|初始情境|压到门口|停业单|开局情境|引出梗/.test(text)
  const hasDevelop = /发展|反复挫败|积累|撤单|误判|不断|推向触发点|围观/.test(text)
  const hasTurn = /转折|关键手段|金手指|系统订单|反向证明|反转|记录反证|规则漏洞/.test(text)
  const hasClimax = /高潮|完整释放|前后反差|当场改口|公开.*记录|全场|释放/.test(text)
  const delivered = (explicitFormula || (hasOccur && hasDevelop && hasTurn && hasClimax)) && hasTurn && hasClimax
  return {
    key: 'meme_plot_formula_rules',
    label: '梗四段式',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(12, [hasOccur, hasDevelop, hasTurn, hasClimax].filter(Boolean).length * 22),
    evidence: uniqueBriefStrings([
      hasOccur ? '发生/前提条件可见' : '',
      hasDevelop ? '发展/挫败积累可见' : '',
      hasTurn ? '转折/关键手段可见' : '',
      hasClimax ? '高潮/完整释放可见' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasOccur ? '缺发生/前提条件' : '',
      !hasDevelop ? '缺发展/挫败积累' : '',
      !hasTurn ? '缺转折/关键手段' : '',
      !hasClimax ? '缺高潮/完整释放' : '',
    ], 8),
    issue: delivered ? '' : '正文没有完成 oh-story 以梗构建剧情四段式，容易从前提直接跳到高潮或写成流水账。',
    repair_instruction: delivered ? '' : '按 oh-story 梗四段式修复：发生 -> 发展 -> 转折 -> 高潮。先建立梗的前提条件，再用挫败或积累推向触发点，中段用金手指/关键手段转折，最后完整释放前后反差。',
  }
}

export function normalizeReaderDesireFormulaRulesCheck(contract: any, chapterText: string) {
  const planned = emotionalArcArray(
    contract.reader_desire_formula_rules,
    contract.readerDesireFormulaRules,
  )
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasDemand = /生产诉求|低地位|困境|迫在眉睫|不曾拥有|不公|不该如此|失业|强权|被.*停业|被.*诬/.test(text)
  const hasHope = /给予希望|希望|金手指|底牌|潜在解法|检测笔|备份订单|提前露面|盟友|规则漏洞/.test(text)
  const hasEffort = /努力解决|行动过程|逐项|核对|顶住|承压|代价|中段|一步步|不断解决/.test(text)
  const hasFulfilled = /得偿所愿|阶段回报|兑现|作废|恢复授权|收获|完成|拿到|态度转变|客户恢复|停业单作废/.test(text)
  const hasCarry = /新困境|新矛盾|新目标|更高层级|医院备用电源|下一|抛出/.test(text)
  const delivered = hasDemand && hasHope && hasEffort && hasFulfilled
  return {
    key: 'reader_desire_formula_rules',
    label: '读者欲望四步公式',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(12, [hasDemand, hasHope, hasEffort, hasFulfilled].filter(Boolean).length * 22 + (hasCarry ? 6 : 0)),
    evidence: uniqueBriefStrings([
      hasDemand ? '生产诉求/不该如此可见' : '',
      hasHope ? '给予希望/潜在解法可见' : '',
      hasEffort ? '努力解决/行动过程可见' : '',
      hasFulfilled ? '得偿所愿/阶段回报可见' : '',
      hasCarry ? '得偿后新困境/新目标可见' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasDemand ? '缺生产诉求' : '',
      !hasHope ? '缺给予希望' : '',
      !hasEffort ? '缺努力解决' : '',
      !hasFulfilled ? '缺得偿所愿' : '',
    ], 8),
    issue: delivered ? '' : '正文没有走完 oh-story 驱动读者欲望四步公式，读者可能没有先产生诉求就看到结果。',
    repair_instruction: delivered ? '' : '按 oh-story 读者欲望四步公式修复：生产诉求 -> 给予希望 -> 努力解决 -> 得偿所愿。先写低地位/困境/不公让读者生出“不该如此”，再给希望或潜在解法，中段写行动过程和代价，最后兑现阶段回报并抛出新困境。',
  }
}

type EmotionalArcExecutionScanners = {
  scanEmotionalStasisRisks?: (text: string) => any[]
  scanDownwardSafetyRisks?: (text: string) => any[]
  scanOppressionPurposeRisks?: (text: string) => any[]
  scanPayoffDensityRisks?: (text: string) => any[]
  scanPayoffEscalationRisks?: (text: string) => any[]
  scanTrumpCardEffectRisks?: (text: string) => any[]
}

export function normalizePayoffDensityRulesCheck(
  contract: any,
  chapterText: string,
  scanners: EmotionalArcExecutionScanners = {},
) {
  const planned = emotionalArcArray(contract.payoff_density_rules, contract.payoffDensityRules)
  if (!planned.length) return null
  const text = String(chapterText || '')
  const densityRisks = asArray(scanners.scanPayoffDensityRisks?.(text))
  const explicitSinglePayoffStretch = /拉长单个爽点|单个爽点[^。；\n]*(铺垫|拖|拉长)|反复铺垫同一个大爽点|一千多字[^。；\n]*(没有|缺少)[^。；\n]*(信息增量|能力展示|危机反制|关系变化|小回收)/.test(text)
  const payoffSignals = uniqueBriefStrings([
    /信息增量|发现|确认|揭开|线索/.test(text) ? '信息增量' : '',
    /能力展示|辨伪|露一手|展示优势/.test(text) ? '能力展示' : '',
    /危机反制|反制|反击|破局|规则漏洞/.test(text) ? '危机反制' : '',
    /关系变化|站到|站队|支持|改口|态度转变/.test(text) ? '关系变化' : '',
    /小回收|小回报|收益结算|拿到|获得|奖励|阶段结算/.test(text) ? '小回收' : '',
  ], 8)
  const delivered = densityRisks.length === 0 && !explicitSinglePayoffStretch && payoffSignals.length >= 2
  return {
    key: 'payoff_density_rules',
    label: '多爽点密度',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(12, payoffSignals.length * 18 + (densityRisks.length ? 0 : 18) + (!explicitSinglePayoffStretch ? 16 : 0)),
    evidence: uniqueBriefStrings([
      ...payoffSignals,
      ...densityRisks.map((item: any) => compactBriefText(item.evidence || item.fix)).filter(Boolean),
      explicitSinglePayoffStretch ? '长铺垫只等一个爽点' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      payoffSignals.length < 2 ? '小回报数量不足' : '',
      densityRisks.length ? '存在 800-1200 字回报密度缺口' : '',
      explicitSinglePayoffStretch ? '拉长单个爽点铺垫' : '',
    ], 8),
    issue: delivered ? '' : '正文没有按 oh-story 爽点密度规则拆出多个小回报，可能把单个爽点铺垫拉得过长。',
    repair_instruction: delivered ? '' : '按 oh-story 爽点密度修复：不要拉长单个爽点的铺垫，而是多想几个爽点；每 800-1200 字至少落一次信息增量、能力展示、危机反制、关系变化或小回收，把长铺垫拆成发现、确认、反制、站队、收益结算或新期待。',
  }
}

export function normalizePayoffEscalationRulesCheck(
  contract: any,
  chapterText: string,
  scanners: EmotionalArcExecutionScanners = {},
) {
  const planned = emotionalArcArray(
    contract.payoff_escalation_rules,
    contract.payoffEscalationRules,
  )
  if (!planned.length) return null
  const risks = asArray(scanners.scanPayoffEscalationRisks?.(chapterText))
  const dimensionEvidence = payoffEscalationDimensionEvidence(chapterText)
  const checked = planned.map(text => {
    const match = anchorMatchScore(text, chapterText)
    const deliveredByDimension =
      (/影响范围/.test(text) && dimensionEvidence.some(item => /影响范围/.test(item)))
      || (/揭示深度/.test(text) && dimensionEvidence.some(item => /揭示深度/.test(item)))
      || (/身份落差/.test(text) && dimensionEvidence.some(item => /身份落差/.test(item)))
    return {
      text,
      score: Math.max(match.score, deliveredByDimension ? 86 : 0),
      evidence: [...match.matched, ...(deliveredByDimension ? dimensionEvidence : [])],
      delivered: deliveredByDimension || match.score >= 26,
    }
  })
  const missed = checked.filter(item => !item.delivered)
  const delivered = risks.length === 0 && missed.length === 0
  return {
    key: 'payoff_escalation_rules',
    label: '爽点递增对比',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(38, Math.round(checked.reduce((sum, item) => sum + Number(item.score || 0), 0) / Math.max(1, checked.length)) - risks.length * 18),
    evidence: uniqueBriefStrings([
      ...checked.flatMap(item => item.evidence),
      ...risks.map((item: any) => item.evidence || item.fix),
    ].filter(Boolean), 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: risks.length
      ? risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8)
      : missed.map(item => item.text),
    issue: delivered ? '' : '爽点递增对比未充分落地：连续爽点需要逐级增加影响范围、揭示深度或身份落差。',
    repair_instruction: delivered ? '' : '按 oh-story 爽点递增对比修复：连续爽点必须逐级增加影响范围、揭示深度或身份落差；把重复的“震惊/打脸/赢了”改成个人 -> 群体 -> 社会，表象 -> 本质 -> 颠覆，或路人 -> 大佬 -> 全场震惊。',
  }
}

export function buildEmotionalArcDeterministicCheck(
  chapterText: string,
  scanners: EmotionalArcExecutionScanners = {},
) {
  const risks = [
    ...asArray(scanners.scanEmotionalStasisRisks?.(chapterText)),
    ...asArray(scanners.scanDownwardSafetyRisks?.(chapterText)),
    ...asArray(scanners.scanOppressionPurposeRisks?.(chapterText)),
    ...asArray(scanners.scanPayoffDensityRisks?.(chapterText)),
    ...asArray(scanners.scanPayoffEscalationRisks?.(chapterText)),
    ...asArray(scanners.scanTrumpCardEffectRisks?.(chapterText)),
  ]
  if (!risks.length) return null
  const hasDownward = risks.some((item: any) => /下行情节|压制目的/.test(String(item.label || item.key || '')))
  const label = hasDownward ? '下行情节安全感' : '情绪弧确定性扫描'
  return {
    key: 'deterministic_emotional_arc',
    label,
    text: '情绪弧必须避免原地打转、连续下压无安全感、无回报长段和爽点不递增。',
    expected: '情绪弧必须避免原地打转、连续下压无安全感、无回报长段和爽点不递增。',
    score: Math.max(0, 100 - risks.length * 18),
    evidence: risks.map((item: any) => compactBriefText(item.evidence || item.fix)).filter(Boolean).slice(0, 8),
    delivered: false,
    status: 'warn',
    missed_items: risks.map((item: any) => compactBriefText(item.label || item.key)).filter(Boolean).slice(0, 8),
    issue: `正文触发 ${risks.length} 项情绪弧确定性风险。`,
    repair_instruction: '按 oh-story 情绪弧修复：补调动 -> 行动/转折 -> 释放；下压时给安全感，爽点要有递进和可见读者收益。',
  }
}

export function normalizeEmotionalSceneExecutionRulesCheck(contract: any, chapterText: string) {
  const planned = emotionalArcArray(
    contract.scene_execution_rules,
    contract.sceneExecutionRules,
    contract.reaction_structure_rules,
    contract.reactionStructureRules,
    contract.expectation_rules,
    contract.expectationRules,
  )
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasStageLabel = /(场景|scene|小节)[^。！？\n]{0,24}(标注|阶段|当前)[^。！？\n]{0,30}(调动|复现|释放|后反应)|情绪阶段[:：][^。！？\n]{0,40}(调动|复现|释放|后反应)/i.test(text)
  const hasPreReaction = /前反应|读者提前知道坏结果|提前知道坏结果|预知坏结果|先让读者知道/.test(text)
  const hasReenactment = /复现|坏结果真的发生|真的发生|现场发生|压迫从预知落到现场|被当众摔碎|当众摔碎/.test(text)
  const hasPostReaction = /后反应|真情流露|作出改变|决定查|决定[^。！？\n]{0,18}(追|查|救|反击|振作)|拼命|振作|新选择/.test(text)
  const hasSmallAgainstBig = /以小搏大|弱者的苦|强者到来|我知道你们苦|弱势方被救|士气如虹|整体气势转变/.test(text)
  const hasReactionChain = (hasPreReaction && hasReenactment && hasPostReaction) || hasSmallAgainstBig
  const hasExpectationRelay = /下一开环|新开环|开启[^。！？\n]{0,12}(下一|新|新的)期待|新的期待|更大问题|新问题|新目标|新代价|更大关系压力/.test(text)
  const delivered = hasStageLabel && hasReactionChain && hasExpectationRelay
  return {
    key: 'scene_execution_rules',
    label: '场景情绪执行',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(12, [hasStageLabel, hasReactionChain, hasExpectationRelay].filter(Boolean).length * 28),
    evidence: delivered
      ? uniqueBriefStrings([
          hasStageLabel ? '场景情绪阶段已标注' : '',
          hasPreReaction && hasReenactment && hasPostReaction ? '前反应 -> 复现 -> 后反应链条可见' : '',
          hasSmallAgainstBig ? '以小搏大 -> 士气如虹链条可见' : '',
          hasExpectationRelay ? '下一开环已开启' : '',
        ], 8)
      : uniqueBriefStrings([
          !hasStageLabel ? '缺场景情绪阶段标注' : '',
          !hasReactionChain ? '缺前反应-复现-后反应链条或以小搏大链条' : '',
          !hasExpectationRelay ? '缺闭环期待后的下一开环' : '',
        ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasStageLabel ? '缺场景情绪阶段标注' : '',
      !hasReactionChain ? '缺前反应-复现-后反应链条' : '',
      !hasExpectationRelay ? '缺闭环期待后的下一开环' : '',
    ], 8),
    issue: delivered ? '' : '正文没有把 oh-story 情绪弧落实到场景级执行：缺少情绪阶段标注、反应结构链条或闭环后的下一开环。',
    repair_instruction: delivered ? '' : '按 oh-story emotional-arc-design 修复场景卡：每个场景标注调动/复现/释放/后反应；虐/悲壮/遗憾按前反应 -> 复现 -> 后反应执行，热血/逆袭按以小搏大 -> 士气如虹执行；闭环当前期待时同步开启下一开环。',
  }
}

export function normalizeEmotionalTurningRulesCheck(contract: any, chapterText: string) {
  const planned = emotionalArcArray(
    contract.emotional_turning_rules,
    contract.emotionalTurningRules,
    contract.failure_mode_guards,
    contract.failureModeGuards,
  )
  if (!planned.length) return null
  const text = String(chapterText || '')
  const hasTransition = /情绪转向|情绪转折|从[^。！？\n]{0,18}(?:变成|转成|跳到)|压迫[^。！？\n]{0,24}(?:释放|爽感|反击)|愤怒[^。！？\n]{0,24}(?:释然|冷静|爽感)|不安[^。！？\n]{0,24}(?:真相|震惊)/.test(text)
  const explicitNoTrigger = /没有(?:任何)?(?:新证据|新信息|新动作|新代价|新关系压力|触发事件|任何人改口)|无理由|只是忽然|莫名其妙|突然(?:变好|释然|高兴|爽了)|没有遇到任何事件/.test(text)
  const triggerSignals = uniqueBriefStrings([
    /新证据|第二份账册|账册|尾号|袖口墨痕|旧印章|线索|真相|缺页|证人/.test(text) ? '新证据/线索触发' : '',
    /新信息|发现|揭开|暴露|指向|对上|浮出/.test(text) ? '新信息触发' : '',
    /递出|按住|翻开|拿出|出手|拦住|改口|站到|退开|公开承认|反击|反证/.test(text) ? '新动作/关系变化触发' : '',
    /代价|失去|风险|逼认罪|承压|压迫升级|公开升级|站队|审判资格/.test(text) ? '新代价/压力触发' : '',
    /事件触发|触发情绪转向|由[^。！？\n]{0,24}触发/.test(text) ? '事件触发自检' : '',
  ], 8)
  const hasTrigger = !explicitNoTrigger && triggerSignals.length > 0
  const longFlatEmotion = /一直很(?:压抑|痛苦|愤怒|难受|沉默)|连续\s*5\+?\s*小节没有情绪转折|一路(?:虐到底|爽到底)|场面停住|众人也一直沉默/.test(text)
  const delivered = hasTransition && hasTrigger && !explicitNoTrigger && !longFlatEmotion
  return {
    key: 'emotional_turning_rules',
    label: '情绪转向',
    text: planned.join('；'),
    expected: planned.join('；'),
    score: delivered ? 88 : Math.max(12, [hasTransition, hasTrigger, !explicitNoTrigger, !longFlatEmotion].filter(Boolean).length * 22),
    evidence: delivered
      ? uniqueBriefStrings(['事件触发情绪转向', ...triggerSignals], 8)
      : uniqueBriefStrings([
          hasTransition ? '有情绪转向自述' : '缺情绪转向',
          !hasTrigger ? '缺新证据/新信息/新动作/新代价触发' : '',
          explicitNoTrigger ? '存在无触发转向或忽然释然' : '',
          longFlatEmotion ? '情绪长期太平或原地压抑' : '',
        ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      !hasTransition ? '缺每 3-5 小节一次情绪转向' : '',
      !hasTrigger ? '缺触发事件：新证据/新信息/新动作/新代价/新关系压力' : '',
      explicitNoTrigger ? '情绪无理由跳步' : '',
      longFlatEmotion ? '连续小节没有有效情绪转折' : '',
    ], 8),
    issue: delivered ? '' : '情绪转向没有可见触发事件，或正文只自述“情绪转向”但缺少新证据、新信息、新动作、新代价或新关系压力。',
    repair_instruction: delivered ? '' : '按 oh-story 情绪转向修复：每次情绪转向都必须由事件触发；给转向前补新证据、新信息、新动作、新代价或新关系压力，例如第二份账册、证人改口、盟友站队、规则漏洞暴露、压迫升级后的反证动作，再让角色从愤怒/压迫逐步转到冷静反击/爽感释放。',
  }
}

export function emotionalArcPriority(missed: any[]) {
  if (missed.some(item => item.label === '下行情节安全感')) return '优先补下行情节安全感'
  if (missed.some(item => item.key === 'payoff_reverse_design')) return '优先补爽点倒推链'
  if (missed.some(item => item.key === 'payoff_tier_rules')) return '优先修正装逼层级'
  if (missed.some(item => item.key === 'payoff_density_rules')) return '优先补多爽点密度'
  if (missed.some(item => item.key === 'emotion_module_recomposition_rules')) return '优先重组情绪模块'
  if (missed.some(item => item.key === 'payoff_escalation_rules')) return '优先补爽点递增'
  if (missed.some(item => item.key === 'progressive_confrontation_rules')) return '优先补递进对抗'
  if (missed.some(item => item.key === 'meme_plot_formula_rules')) return '优先补梗四段式'
  if (missed.some(item => item.key === 'reader_desire_formula_rules')) return '优先补读者欲望四步公式'
  if (missed.some(item => item.key === 'scene_execution_rules')) return '优先补场景情绪执行'
  if (missed.some(item => item.key === 'scene_emotion_steps')) return '优先补调动释放'
  if (missed.some(item => item.key === 'emotion_formula')) return '优先补情绪公式'
  if (missed.some(item => item.key === 'payoff_types')) return '优先补爽点释放'
  return ''
}
