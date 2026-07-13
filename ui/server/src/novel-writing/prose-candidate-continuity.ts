function normalized(value: any) {
  return String(value || '').toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '')
}

const ANCHOR_ALIASES = [
  ['地下通道', '地底甬道', '地下甬道', '地道'],
  ['老陈', '陈叔'],
  ['暗金绢册', '金色旧册', '绢册', '旧册'],
  ['发热', '升温', '烫'],
  ['铁链', '锁链'],
] as const

function anchorGroups(context: any) {
  const source = normalized([
    context?.previous_handoff || context?.previousHandoff,
    context?.scene_cards?.[0]?.transition_from_previous || context?.sceneCards?.[0]?.transitionFromPrevious,
  ].filter(Boolean).join(' '))
  const explicit = Array.isArray(context?.requiredHandoffAnchors)
    ? context.requiredHandoffAnchors.map((anchor: any) => [String(anchor)] as const)
    : []
  return [...explicit, ...ANCHOR_ALIASES.filter(group => group.some(alias => source.includes(normalized(alias))))]
}

function openingAnchorCount(text: string, groups: readonly (readonly string[])[]) {
  const openingText = candidateOpeningText(text)
  const opening = normalized(openingText)
  return groups.filter(group => group.some(alias => opening.includes(normalized(alias)))).length
}

function candidateOpeningText(text: string) {
  return String(text || '').split(/\n\s*\n/)[0].slice(0, 500)
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
  const transition = normalized(context?.scene_cards?.[0]?.transition_from_previous || context?.sceneCards?.[0]?.transitionFromPrevious)
  const candidateOpening = normalized(candidateOpeningText(candidate))
  const transitionMatched = Boolean(transition) && groups.some(group => group.some(alias => transition.includes(normalized(alias)) && candidateOpening.includes(normalized(alias))))
  const regressed = originalAnchors >= 2
    && candidateAnchors <= Math.max(0, originalAnchors - 2)
    && !transitionMatched
    && !(candidateAnchors >= 1 && hasExplicitCausalBridge(candidate))
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
