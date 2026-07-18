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

export function chapterBlueprintFromContext(contextPackage: any, chapter: any = {}) {
  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const contextDeliveryReceipts = normalizeStoredOhStoryDeliveryReceipts({
    ...(contextPackage?.delivery_receipts || contextPackage?.deliveryReceipts || {}),
    ...(contextPackage?.oh_story_delivery_receipts || contextPackage?.ohStoryDeliveryReceipts || {}),
    ...(target?.delivery_receipts || target?.deliveryReceipts || {}),
    ...(target?.oh_story_delivery_receipts || target?.ohStoryDeliveryReceipts || {}),
  })
  const chapterDeliveryReceipts = normalizeStoredOhStoryDeliveryReceipts(chapter?.raw_payload || chapter?.rawPayload || {})
  const brief = {
    ...(target?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
    ...(chapter?.raw_payload?.pre_draft_brief || {}),
    ...(chapter?.raw_payload?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(contextPackage?.preDraftBrief || {}),
  }
  return target.chapter_blueprint
    || target.chapterBlueprint
    || brief.chapter_blueprint
    || brief.chapterBlueprint
    || contextPackage?.chapter_blueprint
    || contextPackage?.chapterBlueprint
    || contextDeliveryReceipts?.chapter_blueprint
    || chapterDeliveryReceipts?.chapter_blueprint
    || {}
}

export function chapterBlueprintText(value: any, keys: string[] = []) {
  if (typeof value === 'string') return compactBriefText(value)
  if (!value || typeof value !== 'object') return compactBriefText(value)
  const values = keys.length
    ? keys.map(key => value?.[key]).filter(Boolean)
    : Object.values(value).filter(item => typeof item !== 'object' || Array.isArray(item))
  return Array.from(new Set(values.flatMap(item => Array.isArray(item) ? item : [item]).map(item => compactBriefText(item)).filter(Boolean))).join('；')
}

export function normalizeChapterBlueprintCausalChainContract(value: any) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const rawFunctions = value.act_functions || value.actFunctions || {}
  const actFunctions = {
    seed: compactBriefText(rawFunctions.seed || rawFunctions.opening || rawFunctions.cause),
    growth: compactBriefText(rawFunctions.growth || rawFunctions.development),
    turn: compactBriefText(rawFunctions.turn || rawFunctions.twist),
    rush: compactBriefText(rawFunctions.rush || rawFunctions.action || rawFunctions.climax),
    completion: compactBriefText(rawFunctions.completion || rawFunctions.ending || rawFunctions.complete),
  }
  const actOrder = uniqueBriefStrings(asArray(value.act_order || value.actOrder || value.order).map((item: any) => compactBriefText(item)).filter(Boolean), 8)
  const qualityChecks = uniqueBriefStrings(asArray(value.quality_checks || value.qualityChecks).map((item: any) => compactBriefText(item)).filter(Boolean), 8)
  if (!actOrder.length && !Object.values(actFunctions).some(Boolean) && !qualityChecks.length) return null
  return {
    version: value.version || 'oh_story_five_act_causal_chain_v1',
    source: value.source || 'oh_story_outline_structure_theory',
    act_order: actOrder.length ? actOrder : ['开局/种子', '发展/生长', '转折/质变', '行动/冲刺', '结局/完成'],
    act_functions: actFunctions,
    quality_checks: qualityChecks.length
      ? qualityChecks
      : ['五幕因果链必须五环齐全，不能跳步、不能乱序；转折必须让冲突性质质变，主角处境更糟或压力升级。'],
  }
}

export function buildChapterBlueprintCausalChainContract(contentOutline: any = {}, explicitValue: any = null) {
  const explicit = normalizeChapterBlueprintCausalChainContract(explicitValue)
  if (explicit) return explicit
  const cause = compactBriefText(contentOutline.cause)
  const development = compactBriefText(contentOutline.development)
  const turn = compactBriefText(contentOutline.turn)
  const climax = compactBriefText(contentOutline.climax)
  const ending = compactBriefText(contentOutline.ending)
  if (![cause, development, turn, climax, ending].some(Boolean)) return null
  return {
    version: 'oh_story_five_act_causal_chain_v1',
    source: 'oh_story_outline_structure_theory',
    act_order: ['开局/种子', '发展/生长', '转折/质变', '行动/冲刺', '结局/完成'],
    act_functions: {
      seed: `开局/种子：${cause || '开局必须埋下本章因'}；因必须在此埋下。`,
      growth: `发展/生长：${development || '第二幕承接前因并长出下一因'}；果+因，发展为下一幕的因。`,
      turn: `转折/质变：${turn || '第三幕必须让冲突性质质变'}；冲突变得更严重，主角处境更糟。`,
      rush: `行动/冲刺：${climax || '第四幕进入白热化行动'}；果+因，冲突白热化。`,
      completion: `结局/完成：${ending || '第五幕收束结果并埋下一因'}；果收束，并把章尾钩子转成下一段的因。`,
    },
    quality_checks: [
      '五幕因果链必须五环齐全，不能跳步、不能乱序。',
      '每一幕都要承担固定功能：种子、生长、转折、冲刺、完成。',
      '转折必须是冲突性质质变，不能只是“大家解释后理解”。',
    ],
  }
}

export function chapterBlueprintBeat(key: string, label: string, value: any, matchScope: 'opening' | 'tail' | 'full' = 'full') {
  const text = compactBriefText(value)
  return text ? { key, label, text, match_scope: matchScope } : null
}

export function chapterBlueprintBeatMatch(beat: any, chapterText: string) {
  const scopedText = beat.match_scope === 'opening'
    ? chapterText.slice(0, 1000)
    : beat.match_scope === 'tail'
      ? chapterText.slice(-1400)
      : chapterText
  if (beat.key === 'target_emotion') {
    const expected = String(beat.text || '')
    const text = String(scopedText || '')
    const emotionSignals = [
      /压迫|承压|逼|压人/.test(expected) && /压迫|承压|逼|压人|定罪/.test(text),
      /反证|证明|揭露|真相|翻案/.test(expected) && /反证|证明|旧印章|账册|改口|真相/.test(text),
      /爆发|释放|爽|打脸|倒戈/.test(expected) && /爆发|改口|倒戈|站队|众目睽睽|洗清/.test(text),
    ].filter(Boolean)
    if (emotionSignals.length >= 2) {
      return {
        ...beat,
        score: 84,
        evidence: ['情绪压力', '反证回报'],
        delivered: true,
      }
    }
  }
  const match = anchorMatchScore(beat.text, scopedText, { tailOnly: beat.match_scope === 'tail' })
  const threshold = beat.match_scope === 'opening'
    ? 24
    : beat.match_scope === 'tail'
      ? 26
      : beat.key.startsWith('content_outline_')
        ? 24
        : 28
  return {
    ...beat,
    score: match.score,
    evidence: match.matched,
    delivered: match.score >= threshold,
  }
}

export function chapterBlueprintFirstPayoffIndex(blueprint: any, chapterText: string) {
  const text = String(chapterText || '').replace(/\s+/g, '')
  const corePayoff = String(blueprint?.core_payoff || blueprint?.corePayoff || '')
  const candidates = [
    ...['第二本账册', '旧印章', '禁地钥匙'].filter(term => corePayoff.includes(term)),
    '第二本账册',
    '反证',
    '证明',
    '改口',
    '洗清',
    '打脸',
    '揭露',
    '倒戈',
    '站队',
  ]
  const indexes = candidates
    .map(term => text.indexOf(term))
    .filter(index => index >= 0)
  return indexes.length ? Math.min(...indexes) : -1
}

const BLUEPRINT_BEAT_DENSITY_EVENT_PATTERN = /[“「]|逼|问|答|说|喊|吼|拿|取|递|交|按|握|抓|扣|抢|夺|拦|挡|推|拉|撤|退|站|跪|倒|抬|低|看|听|发现|看见|听见|露出|显出|浮出|滑出|掉出|亮出|压上|毁|撕|烧|打开|进入|潜入|追|查|证明|反证|揭露|改口|倒戈|站队|选择|决定|必须|否则|代价|收益|洗清|暴露|改变|触发|阻止|失败|完成/
const BLUEPRINT_BEAT_DENSITY_SUMMARY_PATTERN = /解释了|有些尴尬|众人都知道|所有人都知道|大家都知道|事情进入下一阶段|进入下一阶段|暂时继续|顺利完成|问题解决|告一段落|由此可见|这说明/
const BLUEPRINT_EXPANDED_BEAT_FUNCTION_PATTERN = /爽点|打脸|高潮|卖点|关键揭露|揭露|反转|回报|破局|爆点|冲刺|强冲突/
const BLUEPRINT_COMPRESSED_BEAT_FUNCTION_PATTERN = /过渡|赶路|信息交代|时间跳转|转场|过场/
const BLUEPRINT_FUNCTION_PADDING_PATTERN = /回廊很长|灯很冷|墙上|影子|风从|窗缝|想起很多|心里非常复杂|脚步.*沉重|环境|景色|天色|月光|微风|落叶/

export function chapterBlueprintBeatDensityContractFromBlueprint(blueprint: any) {
  const explicit = blueprint?.beat_density_contract || blueprint?.beatDensityContract
  if (!explicit) return null
  return buildChapterBlueprintBeatDensityContract(null, asArray(blueprint?.beat_sequence || blueprint?.beatSequence), explicit)
}

export function countDeliveredBeatDensityEvents(chapterText: string) {
  const clauses = proseBodyWithoutTitleLine(chapterText)
    .split(/[。！？!?；;\n]+/)
    .map(clause => compactBriefText(clause, 120))
    .filter(Boolean)
  const eventClauses = clauses.filter(clause => {
    if (countProseChars(clause) < 6) return false
    BLUEPRINT_BEAT_DENSITY_SUMMARY_PATTERN.lastIndex = 0
    if (BLUEPRINT_BEAT_DENSITY_SUMMARY_PATTERN.test(clause)) return false
    BLUEPRINT_BEAT_DENSITY_EVENT_PATTERN.lastIndex = 0
    return BLUEPRINT_BEAT_DENSITY_EVENT_PATTERN.test(clause)
  })
  return {
    count: eventClauses.length,
    evidence: eventClauses.slice(0, 10),
  }
}

export function buildChapterBlueprintBeatDensityCheck(blueprint: any, chapterText: string) {
  const contract = chapterBlueprintBeatDensityContractFromBlueprint(blueprint)
  if (!contract) return null
  const minBeatCount = Number(contract.min_beat_count || contract.minBeatCount || 0)
  if (!minBeatCount) return null
  const actual = countDeliveredBeatDensityEvents(chapterText)
  const delivered = actual.count >= minBeatCount
  return {
    key: 'beat_density',
    label: '情节点密度',
    status: delivered ? 'ok' : 'warn',
    expected_count: minBeatCount,
    actual_count: actual.count,
    evidence: actual.evidence.length
      ? `事件化情节点 ${actual.count}/${minBeatCount}：${actual.evidence.join('；')}`
      : `事件化情节点 ${actual.count}/${minBeatCount}，正文偏摘要。`,
    fix: delivered
      ? ''
      : `按 oh-story 情节细化修复：${contract.rule || OH_STORY_BEAT_DENSITY_RULE} 当前正文只有 ${actual.count}/${minBeatCount} 个可见动作/对话/信息变化情节点；补足动作过程、对话交锋、信息变化、选择代价、收益兑现和章尾钩子铺垫，不得用环境描写或重复心理凑字数。`,
  }
}

export function chapterBlueprintBeatFunctionTagFromText(value: any) {
  const text = compactBriefText(value)
  const match = text.match(/[【\[]([^】\]]+)[】\]]|功能标签[:：]\s*([^；，。]+)/)
  return compactBriefText(match?.[1] || match?.[2] || '')
}

export function stripChapterBlueprintBeatFunctionMarkers(value: any) {
  return compactBriefText(value)
    .replace(/[【\[][^】\]]+[】\]]/g, '')
    .replace(/功能标签[:：][^；，。]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeChapterBlueprintBeatFunctionRows(blueprint: any) {
  return asArray(blueprint?.beat_sequence || blueprint?.beatSequence)
    .map((item: any, index: number) => {
      const rawText = typeof item === 'string'
        ? item
        : item?.beat || item?.text || item?.event || item?.action || item?.summary || item?.title || item?.description || ''
      const tag = compactBriefText(
        typeof item === 'string'
          ? chapterBlueprintBeatFunctionTagFromText(item)
          : item?.function_tag
            || item?.functionTag
            || item?.purpose_tag
            || item?.purposeTag
            || asArray(item?.purpose_tags || item?.purposeTags)[0]
            || item?.tag
            || chapterBlueprintBeatFunctionTagFromText(rawText),
      )
      const text = stripChapterBlueprintBeatFunctionMarkers(rawText)
      const expectation = BLUEPRINT_EXPANDED_BEAT_FUNCTION_PATTERN.test(tag)
        ? 'expand'
        : BLUEPRINT_COMPRESSED_BEAT_FUNCTION_PATTERN.test(tag)
          ? 'compress'
          : ''
      return text && expectation ? {
        index,
        text,
        tag,
        expectation,
      } : null
    })
    .filter(Boolean)
}

export function chapterBlueprintBeatFunctionEvidence(row: any, chapterText: string) {
  const body = proseBodyWithoutTitleLine(chapterText)
  const lineCandidates = body
    .split(/\n+/)
    .map(line => compactBriefText(line, 360))
    .filter(Boolean)
  const sentenceCandidates = body
    .split(/(?<=[。！？!?])/)
    .map(clause => compactBriefText(clause, 220))
    .filter(Boolean)
  const paragraphCandidates = proseParagraphsWithoutTitle(chapterText)
    .map(paragraph => compactBriefText(paragraph, 360))
    .filter(Boolean)
  const candidates = Array.from(new Set([
    ...lineCandidates,
    ...sentenceCandidates,
    ...paragraphCandidates,
  ]))
  const scored = candidates
    .map(evidence => ({ evidence, match: anchorMatchScore(row.text, evidence) }))
    .sort((a, b) => {
      const scoreDelta = b.match.score - a.match.score
      if (Math.abs(scoreDelta) <= 20 && a.match.score >= 24 && b.match.score >= 24) {
        return countProseChars(a.evidence) - countProseChars(b.evidence)
      }
      return scoreDelta || b.match.matched.length - a.match.matched.length
    })
  const best = scored[0] || { evidence: '', match: { score: 0, matched: [] } }
  return {
    evidence: best.evidence,
    score: best.match.score,
    matched: best.match.matched,
  }
}

export function hasExpandedBeatDetail(evidence: string) {
  const punctuationCount = (String(evidence || '').match(/[，；。！？!?“「]/g) || []).length
  return [
    countProseChars(evidence) >= 70,
    /[“「]/.test(evidence),
    /先|又|再|却|因为|否则|压上|反扣|扣住|抢|挡|问|改口|倒戈|站队|退后/.test(evidence),
    /(有人|旁观|执事|证人|林青禾|弟子).*(退后|改口|倒戈|站队|抢|挡|沉默|僵住|低头)/.test(evidence),
    /代价|收益|暴露|洗清|结果|余波/.test(evidence),
    punctuationCount >= 4,
  ].filter(Boolean).length >= 2
}

export function isCompressedBeatOverwritten(evidence: string) {
  if (!evidence) return false
  return countProseChars(evidence) > 70 || BLUEPRINT_FUNCTION_PADDING_PATTERN.test(evidence)
}

export function buildChapterBlueprintBeatFunctionDetailCheck(blueprint: any, chapterText: string) {
  const rows = normalizeChapterBlueprintBeatFunctionRows(blueprint)
  if (!rows.length) return null
  const results = rows.map((row: any) => {
    const evidence = chapterBlueprintBeatFunctionEvidence(row, chapterText)
    const matched = evidence.score >= 24 || evidence.matched.length >= 2
    const delivered = row.expectation === 'expand'
      ? matched && hasExpandedBeatDetail(evidence.evidence)
      : !matched || !isCompressedBeatOverwritten(evidence.evidence)
    return {
      ...row,
      status: delivered ? 'ok' : 'warn',
      delivered,
      evidence: evidence.evidence || `未定位：${row.text}`,
      score: evidence.score,
      issue: delivered
        ? ''
        : row.expectation === 'expand'
          ? `${row.tag}情节点被写成摘要，缺少出手过程、对话交锋、配角反应或结果余波。`
          : `${row.tag}情节点被过度展开，疑似用环境/心理/装饰描写水字数。`,
    }
  })
  const missed = results.filter((item: any) => !item.delivered)
  return {
    key: 'beat_function_detail_balance',
    label: '目的词详略',
    status: missed.length ? 'warn' : 'ok',
    evidence: results
      .map((item: any) => `${item.tag}(${item.expectation === 'expand' ? '展开' : '带过'})：${compactBriefText(item.evidence, 120)}`)
      .join('；'),
    expected_count: rows.length,
    missed_count: missed.length,
    missed_items: missed.map((item: any) => `${item.tag}：${item.text}`).slice(0, 8),
    fix: missed.length
      ? `按 oh-story 情节点功能标签修复目的词详略：${missed.map((item: any) => `${item.tag}《${item.text}》`).join('；')}。爽点/打脸/高潮/卖点/关键揭露/反转必须展开危机期待、出手过程、对话交锋、配角差异化反应和结果余波；过渡/赶路/信息交代/时间跳转压成 1-2 句，不能用环境描写、重复情绪或内心独白凑字数。`
      : '',
  }
}

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

export function scanChapterBlueprintCraftRisks(contextPackage: any = {}, chapterText: string) {
  const blueprint = chapterBlueprintFromContext(contextPackage, contextPackage?.chapter_target || {})
  return buildChapterBlueprintCraftChecks(blueprint, chapterText)
    .filter((item: any) => platformCheckNeedsCarryOver(item))
    .map((item: any) => ({
      ...item,
      key: `blueprint_craft_${item.key}`,
      source: 'chapter_blueprint_craft',
    }))
}

export function scanCharacterOrderExecutionRisks(contextPackage: any = {}, chapterText: string) {
  const blueprint = chapterBlueprintFromContext(contextPackage, contextPackage?.chapter_target || {})
  const plannedOrder = asArray(blueprint?.character_order || blueprint?.characterOrder)
    .map((item: any) => compactBriefText(item))
    .filter(Boolean)
    .slice(0, 8)
  if (plannedOrder.length < 2) return []
  const body = proseBodyWithoutTitleLine(chapterText).replace(/\s+/g, '')
  const seen = plannedOrder
    .map(name => ({ name, index: body.indexOf(name) }))
    .filter(item => item.index >= 0)
  if (seen.length < 2) return []
  const actualOrder = [...seen].sort((a, b) => a.index - b.index).map(item => item.name)
  const plannedSeenOrder = plannedOrder.filter(name => seen.some(item => item.name === name))
  if (actualOrder.join('\u0001') === plannedSeenOrder.join('\u0001')) return []
  return [{
    key: 'character_order_mismatch',
    label: '人物出场顺序扫描',
    status: 'warn' as const,
    evidence: `计划：${plannedSeenOrder.join(' -> ')}；实际：${actualOrder.join(' -> ')}。`,
    fix: '按 oh-story 意图确认修复：人物关系和出场顺序决定镜头进入顺序；重排开场镜头、对话触发和信息差曝光顺序，让正文首次聚焦顺序服务细纲里的关系变化和反应放大。',
    source: 'chapter_blueprint_character_order',
  }]
}

export function normalizeBlueprintBeatSequenceItem(raw: any, index: number) {
  const beatNo = Number(raw?.beat_no ?? raw?.beatNo ?? raw?.scene_no ?? raw?.sceneNo ?? index + 1) || index + 1
  const action = compactBriefText(
    typeof raw === 'string'
      ? raw
      : raw?.action || raw?.beat || raw?.event || raw?.summary || raw?.title || raw?.purpose,
  )
  const functionTag = compactBriefText(
    typeof raw === 'string'
      ? ''
      : raw?.function_tag || raw?.functionTag || raw?.tag || raw?.role || raw?.payoff,
  )
  const text = compactBriefText([action, functionTag].filter(Boolean).join('；'))
  if (!text) return null
  return {
    beat_no: beatNo,
    action,
    function_tag: functionTag,
    text,
    label: `${beatNo}.${functionTag || action}`,
  }
}

export function blueprintBeatActionNegated(action: string, chapterText: string) {
  const verbs = ['交出', '拿出', '递出', '公开', '压问', '反证', '夺回', '打开', '进入', '找到', '揭露', '承认', '改口', '站队', '潜入']
    .filter(verb => String(action || '').includes(verb))
  if (!verbs.length) return false
  return verbs.some(verb => new RegExp(`(?:没有|没能|未|并未|始终[^。！？!?]{0,18}没有)[^。！？!?]{0,8}${verb}`).test(chapterText))
}

export function blueprintBeatSequenceMatch(beat: any, chapterText: string) {
  const body = String(chapterText || '')
  const match = anchorMatchScore(beat.text, body)
  const actionMatch = beat.action ? anchorMatchScore(beat.action, body) : { score: 0, matched: [] as string[] }
  const negated = blueprintBeatActionNegated(beat.action, body)
  const delivered = !negated && (match.score >= 22 || actionMatch.score >= 24 || actionMatch.matched.length >= 2)
  const candidateIndexes = [
    ...match.matched,
    ...actionMatch.matched,
    beat.action,
    beat.function_tag,
  ]
    .map(item => compactBriefText(item))
    .filter(Boolean)
    .map(item => body.indexOf(item))
    .filter(index => index >= 0)
  return {
    ...beat,
    delivered,
    index: candidateIndexes.length ? Math.min(...candidateIndexes) : -1,
    evidence: uniqueBriefStrings([...match.matched, ...actionMatch.matched], 6).join('、'),
  }
}

export function scanBeatSequenceExecutionRisks(contextPackage: any = {}, chapterText: string) {
  const blueprint = chapterBlueprintFromContext(contextPackage, contextPackage?.chapter_target || {})
  const planned = asArray(blueprint?.beat_sequence || blueprint?.beatSequence)
    .map((item: any, index: number) => normalizeBlueprintBeatSequenceItem(item, index))
    .filter(Boolean)
    .slice(0, 12)
  if (planned.length < 2) return []

  const body = proseBodyWithoutTitleLine(chapterText)
  const matched = planned.map((beat: any) => blueprintBeatSequenceMatch(beat, body))
  const missing = matched.filter((beat: any) => !beat.delivered)
  const delivered = matched.filter((beat: any) => beat.delivered && beat.index >= 0)
  const outOfOrderPairs: string[] = []
  for (let index = 1; index < delivered.length; index += 1) {
    if (delivered[index].index < delivered[index - 1].index) {
      outOfOrderPairs.push(`${delivered[index - 1].label} -> ${delivered[index].label}`)
    }
  }
  if (!missing.length && !outOfOrderPairs.length) return []
  const keyParts = [
    missing.length ? 'missing' : '',
    outOfOrderPairs.length ? 'out_of_order' : '',
  ].filter(Boolean).join('_and_')
  return [{
    key: `beat_sequence_${keyParts || 'execution_gap'}`,
    label: '情节点序列扫描',
    status: 'warn' as const,
    evidence: [
      missing.length ? `缺失：${missing.map((beat: any) => beat.label).join('、')}` : '',
      outOfOrderPairs.length ? `乱序：${outOfOrderPairs.join('；')}` : '',
      `已命中：${delivered.map((beat: any) => `${beat.label}@${beat.index}`).join('、') || '无'}`,
    ].filter(Boolean).join('；'),
    fix: '按 oh-story 情节细化修复：情节点序列必须逐点落到“谁做了什么 + 功能标签”；补回缺失情节点，并按细纲顺序重排压力铺垫、信息差、转折、爽点兑现和承接，不要只写结果摘要。',
    source: 'chapter_blueprint_beat_sequence',
  }]
}

export function parseCostRewardPlan(value: any) {
  const text = compactBriefText(value)
  if (!text) return null
  const costMatch = text.match(/代价[:：]?\s*([^；;。]+)[；;。]?/)
  const rewardMatch = text.match(/收益[:：]?\s*([^；;。]+)/)
  const cost = compactBriefText(costMatch?.[1])
  const reward = compactBriefText(rewardMatch?.[1])
  if (!cost && !reward) return null
  return { cost, reward, text }
}

const COST_EXECUTION_SIGNAL_PATTERN = /公开|得罪|开罪|暴露|失去|牺牲|付出|代价|风险|反噬|受伤|消耗|损耗|站队|背叛|记恨|冻结|取消|追杀|惩罚|敌视/
const REWARD_EXECUTION_SIGNAL_PATTERN = /收益|拿到|获得|夺回|洗清|证明|改口|解锁|得到|赢|胜|解释权|资格|线索|奖励|阶段结算/

export function plannedBeatDelivered(expected: string, chapterText: string, signalPattern: RegExp) {
  if (!expected) return true
  const signalRegex = new RegExp(signalPattern.source, 'g')
  const expectedSignals = Array.from(new Set(Array.from(expected.matchAll(signalRegex)).map(match => match[0])))
  const hasExpectedSignal = !expectedSignals.length || expectedSignals.some(signal => String(chapterText || '').includes(signal))
  if (!hasExpectedSignal) return false
  const match = anchorMatchScore(expected, chapterText)
  return match.score >= 24 || match.matched.length >= 2
}

export function scanCostRewardExecutionRisks(contextPackage: any = {}, chapterText: string) {
  const blueprint = chapterBlueprintFromContext(contextPackage, contextPackage?.chapter_target || {})
  const plan = parseCostRewardPlan(blueprint?.cost_and_reward || blueprint?.costAndReward)
  if (!plan) return []
  const body = proseBodyWithoutTitleLine(chapterText)
  const costDelivered = plannedBeatDelivered(plan.cost, body, COST_EXECUTION_SIGNAL_PATTERN)
  const rewardDelivered = plannedBeatDelivered(plan.reward, body, REWARD_EXECUTION_SIGNAL_PATTERN)
  if (costDelivered && rewardDelivered) return []
  const missing = [
    !costDelivered && plan.cost ? 'cost' : '',
    !rewardDelivered && plan.reward ? 'reward' : '',
  ].filter(Boolean)
  return [{
    key: `cost_reward_missing_${missing.join('_and_') || 'execution'}`,
    label: '代价/收益兑现扫描',
    status: 'warn' as const,
    evidence: `计划代价：${plan.cost || '未声明'}；计划收益：${plan.reward || '未声明'}。`,
    fix: '按 oh-story 情节细化修复：代价兑现/收益兑现必须拆开落地，写清谁付出代价、谁获得收益、后续账是什么；不能只写主角拿到好处而跳过暴露风险、关系损耗、资源消耗或敌方反扑。',
    source: 'chapter_blueprint_cost_reward',
  }]
}

const LOCAL_VICTORY_SIGNAL_PATTERN = /终于(?:通过|解决|赢|成功)|总算(?:通过|解决|赢|成功)|赢了|赢下|胜了|成功|解决(?:了)?|通过|拿到|获得|夺回|洗清|红光熄灭|资格(?:门槛)?(?:终于)?通过|考核通过|阶段结算|奖励/
const LOCAL_VICTORY_CLOSURE_PATTERN = /松了(?:一口气|口气)|休息|回到(?:住处|房间|屋里)|终于可以|尘埃落定|到这里(?:总算)?结束|事情(?:终于|总算)?结束|不必再|安全了/
const LOCAL_VICTORY_COST_OR_RISK_PATTERN = /但|却|然而|随即|下一|新的?(?:代价|风险|危机|门槛|敌人|目标|任务|名单|规则|问题)|更高|更大|暴露|失去|牺牲|反噬|受伤|消耗|损耗|追杀|惩罚|冻结|取消|记恨|记下|敌视|必须|不能|否则|倒计时|提前|十息|十秒|禁库|作证资格|审查|核验/

export function scanLocalVictoryCostRisks(text: string) {
  const paragraphs = proseParagraphsWithoutTitle(text)
    .filter(paragraph => countProseChars(paragraph) >= 10)
  const hits: Array<{ key: string; label: string; status: 'warn'; evidence: string; fix: string }> = []
  for (let index = 0; index < paragraphs.length; index += 1) {
    const paragraph = paragraphs[index]
    LOCAL_VICTORY_SIGNAL_PATTERN.lastIndex = 0
    if (!LOCAL_VICTORY_SIGNAL_PATTERN.test(paragraph)) continue
    const window = paragraphs.slice(index, Math.min(paragraphs.length, index + 4))
    const windowText = window.join(' ')
    LOCAL_VICTORY_COST_OR_RISK_PATTERN.lastIndex = 0
    if (LOCAL_VICTORY_COST_OR_RISK_PATTERN.test(windowText)) continue
    LOCAL_VICTORY_CLOSURE_PATTERN.lastIndex = 0
    if (!LOCAL_VICTORY_CLOSURE_PATTERN.test(windowText)) continue
    hits.push({
      key: `local_victory_without_cost_${index + 1}_${index + window.length}`,
      label: '局部胜利代价扫描',
      status: 'warn',
      evidence: `第${index + 1}-${index + window.length}段完成局部胜利但缺少新代价/风险：${compactBriefText(windowText, 280)}`,
      fix: '按 oh-story 剧情动力修复：局部胜利必须伴随新的代价、风险、信息暴露、关系压力或下一步行动门槛；把“赢了/拿到奖励/回去休息”改成目标→阻碍→行动→代价反馈→新期待的闭环。',
    })
    break
  }
  return hits
}

const ENDING_FINAL_STATE_SIGNAL_PATTERN = /公开|逐出|失去|获得|夺回|留下|摘下|关闭|打开|封死|改变|身份|名单|候选|玉牌|倒下|受伤|死亡|带走|站队|被迫|成为/
const UNRESOLVED_QUESTION_SIGNAL_PATTERN = /谁|为何|为什么|哪里|哪|真相|秘密|缺页|账册|名单|身份|禁库|门后|幕后|问|[？?]/
const NEXT_CHAPTER_PULL_SIGNAL_PATTERN = /必须|子时|天亮|倒计时|潜入|查|追|赶往|进入|打开|找到|带走|阻止|否则|立刻|马上|下一步|禁库|门后|第二本账册/
const NEXT_CHAPTER_PULL_ACTION_PATTERN = /必须|子时|天亮|倒计时|潜入|查|追|赶往|进入|打开|找到|带走|阻止|否则|立刻|马上|下一步/

export function endingContractFromContext(contextPackage: any = {}) {
  const blueprint = chapterBlueprintFromContext(contextPackage, contextPackage?.chapter_target || {})
  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const brief = contextPackage?.pre_draft_brief || contextPackage?.preDraftBrief || {}
  return blueprint?.ending_contract
    || blueprint?.endingContract
    || target?.ending_contract
    || target?.endingContract
    || brief?.ending_contract
    || brief?.endingContract
    || {}
}

export function scanEndingContractExecutionRisks(contextPackage: any = {}, chapterText: string) {
  const contract = endingContractFromContext(contextPackage)
  const finalState = compactBriefText(contract?.final_state || contract?.finalState)
  const unresolvedQuestion = compactBriefText(contract?.unresolved_question || contract?.unresolvedQuestion)
  const nextChapterPull = compactBriefText(contract?.next_chapter_pull || contract?.nextChapterPull)
  if (!finalState && !unresolvedQuestion && !nextChapterPull) return []

  const body = proseBodyWithoutTitleLine(chapterText)
  const tail = body.slice(-900)
  const nextPullDelivered = plannedBeatDelivered(nextChapterPull, tail, NEXT_CHAPTER_PULL_SIGNAL_PATTERN)
    && (!NEXT_CHAPTER_PULL_ACTION_PATTERN.test(nextChapterPull) || NEXT_CHAPTER_PULL_ACTION_PATTERN.test(tail))
  NEXT_CHAPTER_PULL_ACTION_PATTERN.lastIndex = 0
  const checks = [
    {
      key: 'final_state',
      label: '收束状态',
      expected: finalState,
      delivered: plannedBeatDelivered(finalState, tail, ENDING_FINAL_STATE_SIGNAL_PATTERN),
    },
    {
      key: 'unresolved_question',
      label: '未解决问题',
      expected: unresolvedQuestion,
      delivered: plannedBeatDelivered(unresolvedQuestion, tail, UNRESOLVED_QUESTION_SIGNAL_PATTERN),
    },
    {
      key: 'next_chapter_pull',
      label: '下一章推动力',
      expected: nextChapterPull,
      delivered: nextPullDelivered,
    },
  ].filter(item => item.expected)

  const missing = checks.filter(item => !item.delivered)
  if (!missing.length) return []
  return [{
    key: `ending_contract_missing_${missing.map(item => item.key).join('_and_')}`,
    label: '结尾设定和钩子扫描',
    status: 'warn' as const,
    evidence: `计划：${checks.map(item => `${item.label}=${item.expected}`).join('；')}。章尾证据：${compactBriefText(tail, 240)}`,
    fix: `按 oh-story 结尾设定修复：最后300-900字必须同时交代${checks.map(item => item.label).join('、')}；当前缺少${missing.map(item => item.label).join('、')}，不要只抛一句疑问，要把章尾落到状态变化、未解问题和下一章行动压力。`,
    source: 'chapter_blueprint_ending_contract',
  }]
}

const GOLDEN_THREE_WORLDBUILDING_PATTERN = /世界观|大陆|王朝|宗门|体系|境界|等级|历史|设定|规矩|规则|传承|三百年|千年|外门|内门|阵修|修炼|魔法|异能/
const GOLDEN_THREE_HOOK_SIGNAL_PATTERN = /死|血|痛|伤|尸|刀|枪|火|爆炸|撞|追查|追问|追杀|追上|追来|逃|杀|危险|警报|广播(?:响|炸|停|变)|倒计时|失控|突然|威胁|逼|发现|选择|代价|冲突|问题|门响|敲门|尖叫|喊|吼|问|[？！!?“「]/
const GOLDEN_THREE_EVENT_SIGNAL_PATTERN = /[“「]|死|血|痛|伤|尸|爆炸|撞|追查|追问|追杀|追上|追来|逃|杀|救|广播(?:响|炸|停|变)|警报(?:响|亮|炸)|铃声(?:响|炸)|倒计时(?:开始|归零|跳)|门(?:响|开|关|撞)|敲门|尖叫|喊|吼|问|答|说|抓|握|按|推|拉|撕|砸|踢|冲|跑|退|躲|跪|倒|站|抬|低|转身|打开|关上|掉|落|响|亮|熄|出现|消失|露出|发现|看见|听见|递|拿|放|抢|夺|拦|阻止|威胁|逼|选择|决定|触发|否则|[？！!?]/
const GOLDEN_THREE_ESCALATION_PATTERN = /升级|加深|更|反制|逼|代价|危险|倒计时|失去|暴露|新阻碍|新敌人|第二|加码|翻脸|撕破|追杀|封死|惩罚/
const GOLDEN_THREE_PURSUIT_PATTERN = /为什么|为何|谁|真相|秘密|身份|下一步|必须|否则|倒计时|追|查|找到|打开|门后|名单|缺页|第二|第三|[？?]/
const GOLDEN_THREE_SUMMARY_ENDING_PATTERN = /故事才刚刚开始|一切才刚刚开始|拉开序幕|新的生活才刚刚开始|未来还有很长的路|这只是开始|属于[他她我]的故事/

export function goldenThreeBriefFromContext(contextPackage: any = {}) {
  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const chapterNo = Number(target.chapter_no || contextPackage?.chapter_no || 0)
  return normalizeGoldenThreeBrief(
    target.golden_three_brief
    || target.goldenThreeBrief
    || contextPackage?.golden_three_brief
    || contextPackage?.goldenThreeBrief
    || contextPackage?.pre_draft_brief?.golden_three_brief
    || contextPackage?.preDraftBrief?.goldenThreeBrief,
    chapterNo,
  ) || buildGoldenThreeBrief({}, contextPackage, asArray(target.scene_cards || target.sceneCards).map(sceneBriefFromCard))
}

export function goldenThreeCheck(key: string, evidence: string, fix: string) {
  return {
    key,
    label: '黄金三章启动扫描',
    status: 'warn' as const,
    evidence: compactBriefText(evidence, '正文缺少可定位证据。'),
    fix,
    source: 'oh_story_golden_three_execution',
  }
}

export function scanGoldenThreeExecutionRisks(contextPackage: any = {}, chapterText: string) {
  const brief = goldenThreeBriefFromContext(contextPackage)
  if (!brief) return []
  const chapterNo = Number(brief.chapter_no || contextPackage?.chapter_target?.chapter_no || 0)
  if (chapterNo < 1 || chapterNo > 3) return []

  const body = proseBodyWithoutTitleLine(chapterText)
  if (!body) return []
  const compactBody = body.replace(/\s+/g, '')
  const opening500 = compactBody.slice(0, 500)
  const opening300 = compactBody.slice(0, 300)
  const openingEvidence = compactText(body, 360)
  const tail = body.slice(-700)
  const tailCompact = tail.replace(/\s+/g, '')
  const checks: any[] = []

  GOLDEN_THREE_HOOK_SIGNAL_PATTERN.lastIndex = 0
  if (!GOLDEN_THREE_HOOK_SIGNAL_PATTERN.test(opening500)) {
    checks.push(goldenThreeCheck(
      'golden_three_opening_hook_missing',
      `前 500 字缺少事故、异常、危险、欲望、对话逼问或反常信息：${openingEvidence}`,
      '按 oh-story 黄金三章修第一章前 500 字：直接给事故、异常、危险、欲望、对话逼问、规则触发或反常信息，不要先铺背景。',
    ))
  }

  if (chapterNo === 1) {
    const clauses = opening300.split(/[。！？!?；;]/).map(clause => clause.trim()).filter(Boolean)
    const hasProtagonistAction = clauses.some(clause => {
      OPENING_NON_PROTAGONIST_SUBJECT_PATTERN.lastIndex = 0
      if (OPENING_NON_PROTAGONIST_SUBJECT_PATTERN.test(clause)) return false
      OPENING_PROTAGONIST_ACTION_PATTERN.lastIndex = 0
      return OPENING_PROTAGONIST_ACTION_PATTERN.test(clause)
    })
    if (!hasProtagonistAction && countProseChars(opening300) >= 80) {
      checks.push(goldenThreeCheck(
        'golden_three_protagonist_missing',
        `前 300 字缺少主角动作锚点：${openingEvidence}`,
        '第一章必须让主角在前 300 字内用动作、选择、身体反应或对白进入现场；不能只有规则、世界观、环境或旁白介绍。',
      ))
    }
  }

  const eventClauses = opening500
    .split(/[。！？!?；;，,]/)
    .map(clause => clause.trim())
    .filter(clause => {
      if (!clause) return false
      GOLDEN_THREE_EVENT_SIGNAL_PATTERN.lastIndex = 0
      return GOLDEN_THREE_EVENT_SIGNAL_PATTERN.test(clause)
    })
  if (chapterNo === 1 && eventClauses.length < 3 && countProseChars(opening500) >= 60) {
    checks.push(goldenThreeCheck(
      'golden_three_event_missing',
      `前 500 字事件信号 ${eventClauses.length} 个：${openingEvidence}`,
      '第一章有事件，不得纯铺垫；前 500 字至少落下异常、动作、对话、冲突、选择、代价或信息变化组成的现场事件链。',
    ))
  }

  GOLDEN_THREE_WORLDBUILDING_PATTERN.lastIndex = 0
  GOLDEN_THREE_EVENT_SIGNAL_PATTERN.lastIndex = 0
  const openingWorldbuildingParagraph = body
    .split(/\n+/)
    .map(paragraph => paragraph.trim())
    .find(paragraph => {
      const compactParagraph = paragraph.replace(/\s+/g, '')
      if (!compactParagraph || compactBody.indexOf(compactParagraph.slice(0, 20)) > 520) return false
      return countProseChars(compactParagraph) >= 36
        && GOLDEN_THREE_WORLDBUILDING_PATTERN.test(compactParagraph)
        && !GOLDEN_THREE_EVENT_SIGNAL_PATTERN.test(compactParagraph)
    })
  if (openingWorldbuildingParagraph) {
    checks.push(goldenThreeCheck(
      'golden_three_worldbuilding_infodump',
      compactText(openingWorldbuildingParagraph, 260),
      '黄金三章不得用大段世界观说明开局；把体系、规矩、历史、境界等信息拆进现场冲突、角色选择和代价反馈里。',
    ))
  }

  if (chapterNo === 2) {
    GOLDEN_THREE_ESCALATION_PATTERN.lastIndex = 0
    if (!GOLDEN_THREE_ESCALATION_PATTERN.test(compactBody)) {
      checks.push(goldenThreeCheck(
        'golden_three_chapter_two_escalation_missing',
        compactText(body, 300),
        '第二章必须有升级：矛盾加深、阻碍变强、代价增加、规则反制或对手加码，不能只延续第一章的解释和过场。',
      ))
    }
  }

  if (chapterNo === 3) {
    GOLDEN_THREE_PURSUIT_PATTERN.lastIndex = 0
    if (!GOLDEN_THREE_PURSUIT_PATTERN.test(tailCompact)) {
      checks.push(goldenThreeCheck(
        'golden_three_chapter_three_pursuit_missing',
        compactText(tail, 260),
        '第三章必须给追读理由：章末留下新问题、新代价、新目标、下一步行动或更大的未解真相，不能只做阶段总结。',
      ))
    }
  }

  const plannedPayoffs = uniqueBriefStrings(brief.current_chapter_payoffs || brief.currentChapterPayoffs || [], 5)
  const matchedPayoffs = plannedPayoffs.filter(payoff => anchorMatchScore(payoff, body).score >= 45)
  const fallbackPayoffSignals = (compactBody.match(/反证|打脸|赢|夺回|证明|揭露|奖励|解锁|升级|改口|倒戈|站队|爽点/g) || []).length
  if (plannedPayoffs.length && matchedPayoffs.length === 0 && fallbackPayoffSignals < 1) {
    checks.push(goldenThreeCheck(
      'golden_three_payoff_missing',
      `计划爽点：${plannedPayoffs.join('；')}；正文未命中可见回报。`,
      '前三章至少两个爽点；本章计划爽点必须写成可见行动、反转、打脸、发现、奖励、关系变化或局势收益，不能只在设定里承诺。',
    ))
  }

  OPENING_HOOK_SIGNAL_PATTERN.lastIndex = 0
  GOLDEN_THREE_SUMMARY_ENDING_PATTERN.lastIndex = 0
  GOLDEN_THREE_PURSUIT_PATTERN.lastIndex = 0
  const hasEndingHook = GOLDEN_THREE_PURSUIT_PATTERN.test(tailCompact) || OPENING_HOOK_SIGNAL_PATTERN.test(tailCompact)
  const isSummaryEnding = GOLDEN_THREE_SUMMARY_ENDING_PATTERN.test(tailCompact)
  if (!hasEndingHook || isSummaryEnding) {
    checks.push(goldenThreeCheck(
      'golden_three_ending_hook_missing',
      compactText(tail, 260),
      '黄金三章每章结尾必须有悬念、危机、发现、决定或反转；删掉“故事才刚刚开始/拉开序幕”式总结，改成现场未解问题和下一章行动压力。',
    ))
  }

  return checks
}
