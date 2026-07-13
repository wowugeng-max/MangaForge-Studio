function normalized(value: any) {
  return String(value || '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '')
}

function boundedAnchor(value: any) {
  const text = String(value || '').replace(/\s+/g, '').trim()
  return text.length >= 2 && text.length <= 24 ? text : ''
}

const TEMPERATURE_STATE_PATTERN = /发热|升温|变烫|烫热/u

function isTemperatureStateAnchor(value: any) {
  return TEMPERATURE_STATE_PATTERN.test(String(value || ''))
}

function structuredAnchorValues(context: any) {
  const target = context?.chapter_target || context?.chapterTarget || context
  const first = target?.scene_cards?.[0] || target?.sceneCards?.[0] || {}
  return [
    ...(Array.isArray(context?.requiredHandoffAnchors || target?.requiredHandoffAnchors) ? context?.requiredHandoffAnchors || target?.requiredHandoffAnchors : []),
    first.location,
    ...(Array.isArray(first.characters_present || first.charactersPresent) ? first.characters_present || first.charactersPresent : []),
    ...(Array.isArray(first.used_settings || first.usedSettings) ? first.used_settings || first.usedSettings : []),
    ...(Array.isArray(first.item_beats || first.itemBeats) ? first.item_beats || first.itemBeats : []),
    ...(Array.isArray(first.required_information || first.requiredInformation) ? first.required_information || first.requiredInformation : []),
  ]
}

function aliasGroups(context: any) {
  const target = context?.chapter_target || context?.chapterTarget || context
  const first = target?.scene_cards?.[0] || target?.sceneCards?.[0] || {}
  const canonical = context?.canonical_surface_index || context?.canonicalSurfaceIndex || {}
  const setting = context?.setting_context || context?.settingContext || {}
  const groupValues = [
    ...(context?.requiredHandoffAnchorGroups || target?.requiredHandoffAnchorGroups || []),
    ...(first?.required_handoff_anchor_groups || first?.requiredHandoffAnchorGroups || []),
    ...(canonical?.stable_entities || canonical?.stableEntities || []),
    ...(setting?.entities || []),
    ...(context?.characters || []),
  ]
  return groupValues.map((item: any) => {
    if (Array.isArray(item)) return item
    return [item?.name, item?.canonical_name, item?.canonicalName, ...(item?.aliases || item?.alias_names || item?.aliasNames || [])]
  }).map((group: any[]) => group.map(boundedAnchor).filter(Boolean).slice(0, 6))
    .filter((group: string[]) => group.length > 1)
    .slice(0, 12)
}

function textualAnchorValues(context: any) {
  const target = context?.chapter_target || context?.chapterTarget || context
  const source = [
    target?.previous_handoff || target?.previousHandoff,
    target?.scene_cards?.[0]?.transition_from_previous || target?.sceneCards?.[0]?.transitionFromPrevious,
  ].filter(Boolean).join('；')
  const values: string[] = []
  const patterns = [
    /([\p{Script=Han}]{2,4})(?=留在|守在|退到|来到|攥|握|扶|听见|看见|必须)/gu,
    /(?:留在|守在|退到|来到|困在|位于)([\p{Script=Han}]{2,10})/gu,
    /([\p{Script=Han}]{2,8})(?=突然|开始|正在|再次|继续|倒转|发热|裂开)/gu,
    /(?:攥紧|拿着|握住|抱着|贴着)([\p{Script=Han}]{2,8})/gu,
  ]
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) values.push(match[1])
  }
  return values
}

function anchorGroups(context: any) {
  const seen = new Set<string>()
  const structured = structuredAnchorValues(context).map(boundedAnchor).filter(Boolean)
  const equivalents = aliasGroups(context).filter(group => !group.every(isTemperatureStateAnchor))
  const itemAnchor = structured.findLast(anchor => !isTemperatureStateAnchor(anchor)
    && /^[\p{Script=Han}]{3,8}$/u.test(anchor)
    && !/地下|地底|通道|甬道/u.test(anchor)
    && !/^老[\p{Script=Han}]$/u.test(anchor))
  const hasTemperatureState = structured.some(isTemperatureStateAnchor)
    || aliasGroups(context).some(group => group.some(isTemperatureStateAnchor))
  const itemAliases = itemAnchor
    ? equivalents.find(group => group.some(alias => normalized(alias) === normalized(itemAnchor))) || [itemAnchor]
    : []
  const compoundGroups = itemAliases.length && hasTemperatureState ? [[`__item_temperature__:${itemAliases.join('|')}`]] : []
  const singles = [...structured, ...textualAnchorValues(context)]
    .map(boundedAnchor)
    .filter(anchor => !isTemperatureStateAnchor(anchor))
    .filter(anchor => anchor && !seen.has(normalized(anchor)) && seen.add(normalized(anchor)))
    .slice(0, 12)
    .map(anchor => [anchor] as const)
  return [...compoundGroups, ...equivalents, ...singles.filter(group => !equivalents.some(equivalent => equivalent.some(alias => normalized(alias) === normalized(group[0]))))].slice(0, 12)
}

function conservativeAnchorMatch(anchor: string, opening: string) {
  if (anchor.startsWith('__item_temperature__:')) {
    const items = anchor.slice(anchor.indexOf(':') + 1).split('|').filter(Boolean)
    const stateMatches = Array.from(opening.matchAll(new RegExp(TEMPERATURE_STATE_PATTERN.source, 'gu')))
    return stateMatches.some(match => {
      const start = Math.max(0, Number(match.index || 0) - 24)
      const nearby = opening.slice(start, Number(match.index || 0) + match[0].length)
      return items.some(item => nearby.includes(item))
    })
  }
  const exact = normalized(anchor)
  if (!exact) return false
  const normalizedOpening = normalized(opening)
  if (normalizedOpening.includes(exact)) return true
  if (/^老[\p{Script=Han}]$/u.test(anchor)) {
    const core = anchor.slice(1)
    if (new RegExp(`${core}[叔伯哥姐姨婶爷]`, 'u').test(opening)) return true
  }
  if (/^[\p{Script=Han}][叔伯哥姐姨婶爷]$/u.test(anchor)) {
    const core = anchor[0]
    if (opening.includes(`老${core}`)) return true
  }
  return false
}

const RELATIVE_FRAGMENT_STOPWORDS = new Set(['一个', '这个', '那个', '已经', '正在', '还是', '没有', '必须', '开始', '突然', '随后', '他们', '自己', '什么', '一样'])

function exactHandoffFragments(value: any) {
  const output = new Set<string>()
  for (const run of String(value || '').match(/[\p{Script=Han}]+/gu) || []) {
    for (let length = 2; length <= 4; length += 1) for (let index = 0; index + length <= run.length; index += 1) {
      const fragment = run.slice(index, index + length)
      if (!RELATIVE_FRAGMENT_STOPWORDS.has(fragment) && !/^(?:他的|她的|里的|已经|正在)/u.test(fragment)) output.add(fragment)
      if (output.size >= 80) return output
    }
  }
  return output
}

function relativeExactCoverageRegression(handoff: string, originalText: string, candidateText: string) {
  const fragments = exactHandoffFragments(handoff)
  if (fragments.size < 6) return false
  const originalOpening = candidateOpeningText(originalText)
  const candidateOpening = candidateOpeningText(candidateText)
  const originalHits = Array.from(fragments).filter(fragment => originalOpening.includes(fragment)).length
  const candidateHits = Array.from(fragments).filter(fragment => candidateOpening.includes(fragment)).length
  const originalCoverage = originalHits / fragments.size
  return originalHits >= 2
    && originalCoverage >= 0.08
    && originalHits - candidateHits >= 2
    && candidateHits / Math.max(1, originalHits) <= 0.4
}

function openingAnchorCount(text: string, groups: readonly (readonly string[])[]) {
  const openingText = candidateOpeningText(text)
  return groups.filter(group => group.some(alias => conservativeAnchorMatch(alias, openingText))).length
}

function candidateOpeningText(text: string) {
  return String(text || '').slice(0, 500)
}

function hasExplicitCausalBridge(text: string) {
  const opening = String(text || '').slice(0, 500)
  return /(?:\d+|一|两|三|数)(?:分钟|小时|天|日|刻钟)后|(?:随后|之后|次日|翌日|当晚|转移到|离开.{0,20}(?:来到|到了)|从.{0,40}(?:转移|赶到|来到))/u.test(opening)
}

export function selectContinuitySafeProseCandidate(
  originalText: string,
  candidateText: string,
  context: any = {},
  options: any = {},
) {
  const original = String(originalText || '')
  const candidate = String(candidateText || '')
  if (!candidate || candidate === original) return { text: candidate || original, accepted: Boolean(candidate), warning: null }
  const groups = anchorGroups(context)
  const originalAnchors = openingAnchorCount(original, groups)
  const candidateAnchors = openingAnchorCount(candidate, groups)
  const compoundItemStateGroup = groups.find(group => group.some(anchor => anchor.startsWith('__item_temperature__:')))
  const originalHasCompoundItemState = Boolean(compoundItemStateGroup?.some(anchor => conservativeAnchorMatch(anchor, candidateOpeningText(original))))
  const candidateHasCompoundItemState = Boolean(compoundItemStateGroup?.some(anchor => conservativeAnchorMatch(anchor, candidateOpeningText(candidate))))
  const target = context?.chapter_target || context?.chapterTarget || context
  const transition = normalized(target?.scene_cards?.[0]?.transition_from_previous || target?.sceneCards?.[0]?.transitionFromPrevious)
  const candidateOpening = normalized(candidateOpeningText(candidate))
  const transitionMatched = Boolean(transition)
    && candidateAnchors >= 2
    && groups.filter(group => group.some(alias => transition.includes(normalized(alias)) && candidateOpening.includes(normalized(alias)))).length >= 2
  const preservesEnoughIndependentState = candidateAnchors >= Math.min(3, originalAnchors)
    && candidateAnchors / Math.max(1, originalAnchors) >= 0.5
  const structuredRegression = originalAnchors >= 2
    && candidateAnchors <= Math.max(0, originalAnchors - 2)
    && !preservesEnoughIndependentState
    && !transitionMatched
    && !(candidateAnchors >= 2 && hasExplicitCausalBridge(candidate))
  const handoff = String(target?.previous_handoff || target?.previousHandoff || '')
  const relativeRegression = candidateAnchors < 3 && relativeExactCoverageRegression(handoff, original, candidate)
  const compoundItemStateRegression = originalAnchors >= 2 && originalHasCompoundItemState && !candidateHasCompoundItemState
  const regressed = structuredRegression || relativeRegression || compoundItemStateRegression
  if (!regressed) return { text: candidate, accepted: true, warning: null }
  return {
    text: original,
    accepted: false,
    warning: {
      code: 'opening_continuity_regression',
      source: 'quality',
      message: `${options.candidate_stage || 'revision'} 候选丢失上一章章末交接，已保留修订前正文`,
      details: { original_anchor_count: originalAnchors, candidate_anchor_count: candidateAnchors },
    },
  }
}
