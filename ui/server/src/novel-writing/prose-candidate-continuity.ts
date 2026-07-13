function normalized(value: any) {
  return String(value || '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '')
}

function boundedAnchor(value: any) {
  const text = String(value || '').replace(/\s+/g, '').trim()
  return text.length >= 2 && text.length <= 24 ? text : ''
}

function structuredAnchorValues(context: any) {
  const first = context?.scene_cards?.[0] || context?.sceneCards?.[0] || {}
  return [
    ...(Array.isArray(context?.requiredHandoffAnchors) ? context.requiredHandoffAnchors : []),
    first.location,
    ...(Array.isArray(first.characters_present || first.charactersPresent) ? first.characters_present || first.charactersPresent : []),
    ...(Array.isArray(first.used_settings || first.usedSettings) ? first.used_settings || first.usedSettings : []),
    ...(Array.isArray(first.item_beats || first.itemBeats) ? first.item_beats || first.itemBeats : []),
    ...(Array.isArray(first.required_information || first.requiredInformation) ? first.required_information || first.requiredInformation : []),
  ]
}

function textualAnchorValues(context: any) {
  const source = [
    context?.previous_handoff || context?.previousHandoff,
    context?.scene_cards?.[0]?.transition_from_previous || context?.sceneCards?.[0]?.transitionFromPrevious,
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
  return [...structuredAnchorValues(context), ...textualAnchorValues(context)]
    .map(boundedAnchor)
    .filter(anchor => anchor && !seen.has(normalized(anchor)) && seen.add(normalized(anchor)))
    .slice(0, 12)
    .map(anchor => [anchor] as const)
}

function openingAnchorCount(text: string, groups: readonly (readonly string[])[]) {
  const openingText = candidateOpeningText(text)
  const opening = normalized(openingText)
  return groups.filter(group => group.some(alias => opening.includes(normalized(alias)))).length
}

function candidateOpeningText(text: string) {
  return String(text || '').slice(0, 500)
}

function hasExplicitCausalBridge(text: string) {
  const opening = String(text || '').slice(0, 500)
  return /(?:\d+|一|两|三|数)(?:分钟|小时|天|日|刻钟)后|(?:随后|之后|次日|翌日|当晚|转移到|离开.{0,20}(?:来到|到了)|从.{0,40}(?:转移|赶到|来到))/u.test(opening)
}

function hasDirectContinuationLanguage(text: string) {
  const opening = candidateOpeningText(text)
  return (opening.match(/再次|仍(?:然|旧)?|继续|接着|循着|还在|越来越/g) || []).length >= 2
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
  const transition = normalized(context?.scene_cards?.[0]?.transition_from_previous || context?.sceneCards?.[0]?.transitionFromPrevious)
  const candidateOpening = normalized(candidateOpeningText(candidate))
  const transitionMatched = Boolean(transition)
    && candidateAnchors >= 2
    && groups.filter(group => group.some(alias => transition.includes(normalized(alias)) && candidateOpening.includes(normalized(alias)))).length >= 2
  const regressed = originalAnchors >= 2
    && candidateAnchors <= Math.max(0, originalAnchors - 2)
    && !transitionMatched
    && !(candidateAnchors >= 2 && hasExplicitCausalBridge(candidate))
    && !hasDirectContinuationLanguage(candidate)
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
