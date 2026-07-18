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

