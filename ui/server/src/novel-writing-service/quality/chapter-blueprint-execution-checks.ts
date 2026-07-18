import { asArray, compactText } from '../../routes/novel-route-utils'
import { sceneBriefFromCard } from '../../novel-writing/scene-briefs'
import { buildGoldenThreeBrief, normalizeGoldenThreeBrief } from '../../novel-writing/golden-three-brief'
import { countProseChars } from '../../novel-writing/word-target'
import { anchorMatchScore } from '../../novel-writing/text-matching'
import { buildOhStoryMainlineDefinitionContract } from '../../routes/novel-mainline-definition-contract'
import { proseBodyWithoutTitleLine, proseParagraphsWithoutTitle } from './prose-expansion'
import { platformCheckNeedsCarryOver } from './platform-carry-over'
import { compactBriefText, uniqueBriefStrings } from './text-utils'
import {
  buildChapterBlueprintBeatDensityContract,
  normalizeChapterBlueprintSmallOutlineContract,
} from './outline-blueprint-contracts'
import { normalizeStoredOhStoryDeliveryReceipts } from '../post-delivery/delivery-risk-carry-over'

import {
  buildChapterBlueprintBeatDensityCheck,
  buildChapterBlueprintBeatFunctionDetailCheck,
  chapterBlueprintFirstPayoffIndex,
  isCompressedBeatOverwritten,
  normalizeChapterBlueprintCausalChainContract,
} from './chapter-blueprint-execution-basics'

export function buildChapterBlueprintCraftChecks(blueprint: any, chapterText: string) {
  const body = proseBodyWithoutTitleLine(chapterText)
  const compactBody = body.replace(/\s+/g, '')
  const paragraphs = proseParagraphsWithoutTitle(chapterText)
  const checks: any[] = []
  const hasBlueprint = Boolean(blueprint && typeof blueprint === 'object' && Object.keys(blueprint).length > 0)
  if (!hasBlueprint) return checks

  const beatDensityCheck = buildChapterBlueprintBeatDensityCheck(blueprint, chapterText)
  if (beatDensityCheck) checks.push(beatDensityCheck)
  const beatFunctionDetailCheck = buildChapterBlueprintBeatFunctionDetailCheck(blueprint, chapterText)
  if (beatFunctionDetailCheck) checks.push(beatFunctionDetailCheck)

  const payoffIndex = chapterBlueprintFirstPayoffIndex(blueprint, body)
  const setupText = payoffIndex > 0 ? compactBody.slice(0, payoffIndex) : compactBody.slice(0, 220)
  const hasSetupPressure = /危机|期待|逼|压|承压|定罪|质问|威胁|抢|杀|倒计时|矛盾|代价|选择|阻止|不能|必须/.test(setupText)
  const setupLongEnough = countProseChars(setupText) >= 70
  checks.push({
    key: 'payoff_setup',
    label: '爽点铺垫',
    status: hasSetupPressure && setupLongEnough ? 'ok' : 'warn',
    evidence: compactBriefText(setupText || body, 180),
    fix: hasSetupPressure && setupLongEnough
      ? ''
      : '爽点/高潮出手前必须先铺可指认的危机、期待、阻碍或代价；不能刚点到矛盾就立刻反证、打脸或揭露。',
  })

  const blueprintText = compactBriefText([
    blueprint?.target_emotion,
    blueprint?.core_payoff,
    blueprint?.content_outline?.climax,
    blueprint?.plot_lines?.logic_line,
  ].filter(Boolean).join('；'))
  const needsReactionCheck = /打脸|揭露|反证|信息差|当众|众目|旁观|倒戈|站队/.test(blueprintText + body)
  const reactionTerms = ['怀疑', '倒戈', '沉默', '退后', '改口', '站队', '震惊', '哗然', '失控', '脸色', '僵住', '低头']
    .filter(term => body.includes(term))
  const genericGroupShock = /(?:众人|所有人|旁观弟子|全场|大家)(?:都|全都|一起|同时)?(?:很)?震惊/.test(body)
  const reactionOk = !needsReactionCheck || (new Set(reactionTerms).size >= 2 && !genericGroupShock)
  checks.push({
    key: 'differentiated_reactions',
    label: '差异化反应',
    status: reactionOk ? 'ok' : 'warn',
    evidence: reactionTerms.length ? reactionTerms.slice(0, 5).join('、') : compactBriefText(body, 160),
    fix: reactionOk
      ? ''
      : '装逼、打脸、揭露或反证章不能只写“众人震惊”；至少补出两类在场配角的不同反应、立场变化、退缩、倒戈、沉默或改口。',
  })

  const payoffParagraphs = paragraphs.filter(paragraph => /反证|证明|改口|洗清|倒戈|站队|禁地钥匙|收益|代价|众目睽睽|旧印章|第二本账册/.test(paragraph))
  const detailSignals = [
    /有人.+有人/.test(body),
    /代价是.+收益是/.test(body),
    /逻辑线|先.+再|又用/.test(body),
    payoffParagraphs.some(paragraph => countProseChars(paragraph) >= 38 && /[；，].+[；，]/.test(paragraph)),
  ].filter(Boolean)
  const detailOk = detailSignals.length >= 2
  checks.push({
    key: 'detail_balance',
    label: '详略分配',
    status: detailOk ? 'ok' : 'warn',
    evidence: compactBriefText(payoffParagraphs.join(' '), 220),
    fix: detailOk
      ? ''
      : '详略必须按目的词分配：过渡点带过，爽点/卖点/回报点展开；补足反证过程、旁观反应、代价收益或章尾钩子的细节层次，避免均匀流水账。',
  })

  return checks
}

export function smallOutlineContractFromBlueprint(blueprint: any) {
  return normalizeChapterBlueprintSmallOutlineContract(blueprint?.small_outline_contract || blueprint?.smallOutlineContract)
}

export function smallOutlineSegmentText(row: any) {
  return compactBriefText([
    row?.segment,
    row?.purpose,
    row?.intended_effect || row?.intendedEffect,
    row?.quick_locator || row?.quickLocator,
  ].filter(Boolean).join('；'))
}

export function smallOutlineEvidenceForSegment(row: any, chapterText: string) {
  const body = proseBodyWithoutTitleLine(chapterText)
  const candidates = [
    ...body.split(/\n+/),
    ...proseParagraphsWithoutTitle(body),
    ...body.split(/(?<=[。！？!?])/),
  ]
    .map(item => compactBriefText(item, 260))
    .filter(Boolean)
  const anchor = compactBriefText(row.quick_locator || row.quickLocator || row.purpose || row.segment)
  const scored = candidates
    .map(evidence => ({ evidence, match: anchorMatchScore(anchor, evidence) }))
    .sort((a, b) => {
      const scoreDelta = b.match.score - a.match.score
      if (a.match.score >= 18 && b.match.score >= 18 && Math.abs(scoreDelta) <= 12) {
        return countProseChars(a.evidence) - countProseChars(b.evidence)
      }
      return scoreDelta || b.match.matched.length - a.match.matched.length
    })
  return scored[0] || { evidence: '', match: { score: 0, matched: [] } }
}

export function smallOutlineHasPurposeEffect(row: any, chapterText: string) {
  const body = proseBodyWithoutTitleLine(chapterText)
  const purpose = compactBriefText(row.purpose)
  const effect = compactBriefText(row.intended_effect || row.intendedEffect)
  const locator = compactBriefText(row.quick_locator || row.quickLocator || row.segment)
  const purposeMatch = purpose ? anchorMatchScore(purpose, body) : { score: 80, matched: [] as string[] }
  const effectMatch = effect ? anchorMatchScore(effect, body) : { score: 80, matched: [] as string[] }
  const locatorMatch = locator ? anchorMatchScore(locator, body) : { score: 80, matched: [] as string[] }
  const purposeSignal = /目的|确认|证明|反证|逼|承认|核对|公开|入口|压力|升级|方向|编号|视野|主线/.test(body)
  const delivered = (purposeMatch.score >= 24 || purposeSignal)
    && (effectMatch.score >= 20 || /压力|升级|视野|读者|公开|证据|编号|钩子|期待|方向/.test(body))
    && locatorMatch.score >= 18
  return {
    delivered,
    purpose_score: purposeMatch.score,
    effect_score: effectMatch.score,
    locator_score: locatorMatch.score,
    matched: uniqueBriefStrings([...purposeMatch.matched, ...effectMatch.matched, ...locatorMatch.matched], 8),
  }
}

export function smallOutlineDetailLevelDelivered(row: any, evidence: string) {
  const detailLevel = compactBriefText(row.detail_level || row.detailLevel)
  if (/compress|略|压缩|带过/.test(detailLevel)) {
    return {
      delivered: !isCompressedBeatOverwritten(evidence),
      issue: '该段应略写/压缩，却被写成装饰性过场或均匀水文。',
    }
  }
  const eventSignals = [
    countProseChars(evidence) >= 38,
    /[“「]/.test(evidence),
    /逼|承认|核对|摊|按|抢|挡|问|答|改口|倒戈|站队|露出|证明|反证|选择|代价/.test(evidence),
    /压力|证据|编号|冲突|信息|关系|状态|钩子|期待/.test(evidence),
  ].filter(Boolean)
  return {
    delivered: eventSignals.length >= 2,
    issue: '该段应详写/展开，却缺少动作、对话、信息变化、压力升级或结果余波。',
  }
}

export function buildChapterBlueprintSmallOutlineCheck(blueprint: any, chapterText: string) {
  const contract = smallOutlineContractFromBlueprint(blueprint)
  const segments = asArray(contract?.segment_cards || contract?.segmentCards)
  if (!contract || !segments.length) return null
  const results = segments.map((row: any, index: number) => {
    const evidence = smallOutlineEvidenceForSegment(row, chapterText)
    const purposeEffect = smallOutlineHasPurposeEffect(row, chapterText)
    const detail = smallOutlineDetailLevelDelivered(row, evidence.evidence)
    const delivered = purposeEffect.delivered && detail.delivered
    return {
      segment_no: Number(row.segment_no || row.segmentNo || index + 1),
      segment: compactBriefText(row.segment),
      purpose: compactBriefText(row.purpose),
      intended_effect: compactBriefText(row.intended_effect || row.intendedEffect),
      detail_level: compactBriefText(row.detail_level || row.detailLevel),
      quick_locator: compactBriefText(row.quick_locator || row.quickLocator),
      evidence: evidence.evidence || `未定位：${smallOutlineSegmentText(row)}`,
      matched: purposeEffect.matched,
      status: delivered ? 'ok' : 'warn',
      delivered,
      issue: delivered
        ? ''
        : [
            purposeEffect.delivered ? '' : '目的和效果没有落成正文证据。',
            detail.delivered ? '' : detail.issue,
          ].filter(Boolean).join('；'),
    }
  })
  const missed = results.filter((item: any) => !item.delivered)
  return {
    key: 'small_outline_contract',
    label: '小纲四步法',
    status: missed.length ? 'warn' : 'ok',
    evidence: results
      .map((item: any) => `S${item.segment_no}${item.detail_level ? `/${item.detail_level}` : ''}：${compactBriefText(item.evidence, 120)}`)
      .join('；'),
    expected_count: results.length,
    missed_count: missed.length,
    missed_items: missed.map((item: any) => `S${item.segment_no} ${item.segment || item.quick_locator || item.purpose}：${item.issue}`).slice(0, 8),
    text: '小纲四步法要求分段判断、标注目的和效果、标注详写/略写、快速定位。',
    fix: missed.length
      ? `按 oh-story 小纲四步法修复：逐段检查分段判断、目的和效果、详写/略写、快速定位；当前缺口：${missed.map((item: any) => `S${item.segment_no} ${item.issue}`).join('；')}。目的/效果必须写成正文动作、对话、信息变化或章尾钩子；详写段补过程和余波，略写段压缩为 1-2 句。`
      : '',
    results,
  }
}

export function mainlineDefinitionContractFromBlueprint(blueprint: any) {
  const explicit = blueprint?.mainline_definition_contract || blueprint?.mainlineDefinitionContract
  if (!explicit) return null
  return buildOhStoryMainlineDefinitionContract({ mainline_definition_contract: explicit })
}

export function buildChapterBlueprintMainlineDefinitionCheck(blueprint: any, chapterText: string) {
  const contract = mainlineDefinitionContractFromBlueprint(blueprint)
  if (!contract) return null
  const body = proseBodyWithoutTitleLine(chapterText)
  const compactBody = body.replace(/\s+/g, '')
  const mainlineEvent = compactBriefText(contract.mainline_event || contract.mainlineEvent)
  const eventMatch = mainlineEvent ? anchorMatchScore(mainlineEvent, body) : { score: 80, matched: [] as string[] }
  const oneThingSignal = /一件事|这一件事|只推进|唯一主线|一条主线/.test(body)
  const upgradeActionSignal = /升级.{0,18}(只是|只作为|行动|工具|没有单独变成主线|不是主线)|不是.{0,12}升级|升级不等于主线|主线不等于升级/.test(body)
  const stateChangeSignal = /推进|查清|查明|证明|反证|证据|承认|改口|揭露|完成|改变|状态|现场|结果|代价|下一步/.test(body)
  const handoffSignal = /第二条主线|下一条主线|铺垫|完结|章末|下一步|自然引出/.test(body)
  const elementListRisk = /突破.*境界|境界.*突破|金手指.*升级|新地图|新阵法|新榜单|新门派|设定.*罗列|元素.*重要/.test(compactBody)
  const deferralRisk = /以后再说|以后再讲|之后再说|以后再处理|暂时不管|先不处理/.test(body)
  const eventDelivered = !mainlineEvent || eventMatch.score >= 22 || oneThingSignal
  const missedItems = [
    eventDelivered && oneThingSignal ? '' : '主线是一件事，不是一个元素；正文必须明确本章只推进哪一件事。',
    upgradeActionSignal ? '' : '主线不等于升级；升级是主角达成目标的行动，不能顶替主线。',
    stateChangeSignal ? '' : '本章必须让 mainline_event 发生可见状态变化。',
    handoffSignal ? '' : '主线完成后必须铺垫第二条主线或选择完结，不能突兀换线。',
    elementListRisk || deferralRisk ? '正文疑似把升级条、金手指、地图/设定罗列或“以后再说”当成主线。' : '',
  ].filter(Boolean)
  const delivered = !missedItems.length
  return {
    key: 'mainline_definition_contract',
    label: '主线定义',
    status: delivered ? 'ok' : 'warn',
    text: '主线是一件事，不是一个元素；主线不等于升级，升级是主角达成目标的行动。',
    expected: mainlineEvent,
    evidence: compactBriefText([
      eventMatch.matched?.length ? `命中：${eventMatch.matched.join('、')}` : '',
      compactBriefText(body, 220),
    ].filter(Boolean).join('；'), 260),
    missed_items: missedItems,
    fix: delivered
      ? ''
      : `按 oh-story 主线定义修复：先写清 mainline_event「${mainlineEvent || '本章那一件事'}」，再把升级/金手指/地图/资源改成达成这个目标的行动或工具；删除只罗列元素却不改变那一件事的段落，并在章末给出状态变化、第二条主线铺垫或完结选择。`,
    results: {
      event_score: eventMatch.score,
      one_thing_signal: oneThingSignal,
      upgrade_action_signal: upgradeActionSignal,
      state_change_signal: stateChangeSignal,
      handoff_signal: handoffSignal,
      element_list_risk: elementListRisk,
      deferral_risk: deferralRisk,
    },
  }
}

export function chapterBlueprintCausalChainCheck(blueprint: any, chapterText: string) {
  const contract = normalizeChapterBlueprintCausalChainContract(blueprint?.causal_chain_contract || blueprint?.causalChainContract)
  if (!contract) return null
  const text = proseBodyWithoutTitleLine(chapterText)
  const compactTextValue = text.replace(/\s+/g, '')
  const actFunctions = contract.act_functions || {}
  const signalRows = [
    {
      key: 'seed',
      label: '开局种子',
      expected: actFunctions.seed,
      pattern: /开局|种子|先埋|第一句|开场|认罪书|旧账册|被告|压成|因必须|埋下/,
      indexPattern: /开局|种子|第一句|开场|认罪书/,
    },
    {
      key: 'growth',
      label: '发展生长',
      expected: actFunctions.growth,
      pattern: /发展|生长|果又变成|下一步|互相矛盾|继续|追问|拖住|页序|因继续/,
      indexPattern: /发展|生长|互相矛盾|拖住|页序/,
    },
    {
      key: 'turn',
      label: '转折质变',
      expected: actFunctions.turn,
      pattern: /转折|质变|冲突性质|更严重|处境.+(更糟|危险)|铁证|从.+变成|抢证|旧印章出现/,
      indexPattern: /转折|质变|冲突性质|旧印章出现|铁证/,
    },
    {
      key: 'rush',
      label: '行动冲刺',
      expected: actFunctions.rush,
      pattern: /行动|冲刺|白热化|当众|按下|抢证失败|改口|反击|爆发/,
      indexPattern: /行动|冲刺|白热化|当众|按下/,
    },
    {
      key: 'completion',
      label: '结局完成',
      expected: actFunctions.completion,
      pattern: /结局|完成|收束|洗清|露出|下一因|下一章|第二扇门|门后|章尾/,
      indexPattern: /结局|完成|收束|洗清|露出|下一因|下一章/,
    },
  ]
  const checked = signalRows.map(row => {
    const expected = compactBriefText(row.expected)
    const match = expected ? anchorMatchScore(expected, text) : { score: 0, matched: [] as string[] }
    const delivered = row.pattern.test(text) || match.score >= 30
    const cueIndex = text.search(row.indexPattern)
    const rawIndex = cueIndex >= 0 ? [cueIndex] : [
      ...match.matched,
      row.label,
      row.label.replace(/[开局发展转折行动结局]/g, ''),
    ]
        .map(item => compactBriefText(item))
        .filter(Boolean)
        .map(item => compactTextValue.indexOf(item.replace(/\s+/g, '')))
        .filter(index => index >= 0)
    return {
      ...row,
      delivered,
      score: delivered ? Math.max(84, match.score) : Math.max(20, match.score),
      evidence: uniqueBriefStrings([...match.matched, delivered ? row.label : ''], 4),
      index: rawIndex.length ? Math.min(...rawIndex) : -1,
    }
  })
  const missing = checked.filter(row => !row.delivered)
  const deliveredWithIndex = checked.filter(row => row.delivered && row.index >= 0)
  const outOfOrder = deliveredWithIndex.some((row, index) => index > 0 && row.index < deliveredWithIndex[index - 1].index)
  const flatSummary = /解释了|听完后觉得有道理|事情顺利完成|大家听完|有些尴尬/.test(text)
  const delivered = missing.length === 0 && !outOfOrder && !flatSummary
  return {
    key: 'causal_chain_contract',
    label: '五幕因果链',
    text: contract.act_order.join(' -> '),
    expected: contract.quality_checks.join('；'),
    score: delivered ? 88 : Math.max(18, Math.round(checked.reduce((sum, row) => sum + row.score, 0) / Math.max(1, checked.length)) - (outOfOrder ? 24 : 0) - (flatSummary ? 24 : 0)),
    evidence: uniqueBriefStrings([
      ...checked.flatMap(row => row.evidence),
      outOfOrder ? '五幕顺序乱序' : '',
      flatSummary ? '正文用解释/顺利完成替代转折质变' : '',
    ], 8),
    delivered,
    status: delivered ? 'ok' : 'warn',
    missed_items: delivered ? [] : uniqueBriefStrings([
      missing.some(row => row.key === 'seed') ? '缺开局种子' : '',
      missing.some(row => row.key === 'growth') ? '缺发展生长' : '',
      missing.some(row => row.key === 'turn') ? '缺转折质变' : '',
      missing.some(row => row.key === 'rush') ? '缺行动冲刺' : '',
      missing.some(row => row.key === 'completion') ? '缺结局完成' : '',
      outOfOrder ? '五幕乱序' : '',
      flatSummary ? '转折被解释/总结抹平' : '',
    ], 8),
    issue: delivered ? '' : '章节蓝图的五幕因果链没有落地，正文可能跳步、乱序，或把转折写成解释后顺利完成。',
    repair_instruction: delivered ? '' : '按 oh-story 五幕式修复：开局埋因，发展让果变下一因，转折让冲突性质质变，行动白热化，结局收束并埋下一因。',
  }
}

