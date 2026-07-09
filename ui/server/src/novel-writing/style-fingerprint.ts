function asArray<T = any>(value: T | T[] | null | undefined): T[] {
  if (value === undefined || value === null) return []
  return Array.isArray(value) ? value : [value]
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

export function styleFingerprintTextFromContext(contextPackage: any, strategy: any) {
  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const brief = {
    ...(contextPackage?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
    ...(target?.pre_draft_brief || {}),
  }
  const storyState = {
    ...(contextPackage?.storyState || {}),
    ...(contextPackage?.story_state || {}),
  }
  return uniqueBriefStrings([
    storyState.style_fingerprint,
    storyState.styleFingerprint,
    storyState.style_profile_summary,
    storyState.styleProfileSummary,
    target.style_fingerprint,
    target.styleFingerprint,
    target.style_profile_summary,
    target.styleProfileSummary,
    target.benchmark_recall_brief?.style_profile_summary,
    target.benchmarkRecallBrief?.styleProfileSummary,
    brief.style_fingerprint,
    brief.styleFingerprint,
    brief.style_profile_summary,
    brief.styleProfileSummary,
    brief.benchmark_recall_brief?.style_profile_summary,
    brief.benchmarkRecallBrief?.styleProfileSummary,
    strategy?.style_fingerprint,
    strategy?.styleFingerprint,
    strategy?.style_profile_summary,
    strategy?.styleProfileSummary,
  ].map((item: any) => compactBriefText(item, '')).filter(Boolean), 8).join('；')
}

function styleFingerprintContractCandidates(contextPackage: any, project: any) {
  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const brief = {
    ...(contextPackage?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
    ...(target?.pre_draft_brief || {}),
  }
  const storyState = {
    ...(project?.referenceConfig?.storyState || {}),
    ...(project?.reference_config?.story_state || {}),
    ...(project?.storyState || {}),
    ...(project?.story_state || {}),
    ...(contextPackage?.storyState || {}),
    ...(contextPackage?.story_state || {}),
  }
  return [
    target.style_fingerprint_contract,
    target.styleFingerprintContract,
    brief.style_fingerprint_contract,
    brief.styleFingerprintContract,
    storyState.style_fingerprint_contract,
    storyState.styleFingerprintContract,
  ].filter((item: any) => item && typeof item === 'object')
}

export function styleFingerprintSentenceBand(text: string) {
  const source = compactBriefText(text, '')
  if (!source) return null
  const explicit = source.match(/(?:目标)?(?:句长带|句长|句子长度|平均句长)[^\d]{0,12}(\d{1,3})\s*[-~至到]\s*(\d{1,3})\s*字?/)
    || source.match(/(\d{1,3})\s*[-~至到]\s*(\d{1,3})\s*字[^\n。；;]{0,16}(?:句长|句子|文风|呼吸)/)
  if (explicit) {
    const low = Number(explicit[1])
    const high = Number(explicit[2])
    if (Number.isFinite(low) && Number.isFinite(high) && Math.max(low, high) >= 12) {
      return {
        min: Math.min(low, high),
        max: Math.max(low, high),
        source,
      }
    }
  }

  if (/短句为主|短中句|短促|解释压短|短句推进/.test(source)) return null
  if (/中长句|长句呼吸|长句为主|句子舒展|舒展句|长短交错/.test(source)) {
    return { min: 16, max: 48, source }
  }
  return null
}

export function buildStyleFingerprintPromptHandoff(contextPackage: any = {}, project: any = {}, strategy: any = null) {
  const projectStoryState = {
    ...(project?.referenceConfig?.storyState || {}),
    ...(project?.reference_config?.story_state || {}),
    ...(project?.storyState || {}),
    ...(project?.story_state || {}),
  }
  const sourceText = uniqueBriefStrings([
    styleFingerprintTextFromContext(contextPackage, strategy),
    projectStoryState.style_fingerprint,
    projectStoryState.styleFingerprint,
    projectStoryState.style_profile_summary,
    projectStoryState.styleProfileSummary,
  ].map((item: any) => compactBriefText(item, '')).filter(Boolean), 8).join('；')
  const contract = styleFingerprintContractCandidates(contextPackage, project)[0] || {}
  const contractBand = compactBriefText(contract.target_sentence_band || contract.targetSentenceBand, '')
  const band = styleFingerprintSentenceBand([contractBand, sourceText].filter(Boolean).join('；'))
  if (!sourceText && !contractBand && !Object.keys(contract).length) return null
  const policy = compactBriefText(
    contract.policy,
    '每章写前按文风指纹/文风.md/原文锚点确定句长节奏；续写衔接剧情，不以可能已漂移的上一章句式节奏为准。',
  )
  const sourceExcerpt = compactBriefText(contract.source_excerpt || contract.sourceExcerpt || sourceText, 360)
  return {
    source: compactBriefText(contract.source, 'story_state_style_fingerprint'),
    style_fingerprint: sourceText,
    target_sentence_band: contractBand || (band ? `${band.min}-${band.max}字` : ''),
    min_sentence_chars: Number(contract.min_sentence_chars ?? contract.minSentenceChars ?? band?.min) || null,
    max_sentence_chars: Number(contract.max_sentence_chars ?? contract.maxSentenceChars ?? band?.max) || null,
    policy,
    source_excerpt: sourceExcerpt,
  }
}

export function styleFingerprintSentenceBeat(contextPackage: any, strategy: any) {
  const band = styleFingerprintSentenceBand(styleFingerprintTextFromContext(contextPackage, strategy))
  if (!band) return null
  return {
    key: 'style_drift_sentence_fingerprint',
    label: '文风指纹句长带',
    text: `目标句长 ${band.min}-${band.max} 字；${compactBriefText(band.source, '').slice(0, 180)}`,
    min_sentence_chars: band.min,
    max_sentence_chars: band.max,
  }
}

export function styleFingerprintSceneDirective(contextPackage: any = {}) {
  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const brief = {
    ...(contextPackage?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
    ...(target?.pre_draft_brief || {}),
  }
  const strategy = target.style_sample_strategy
    || target.styleSampleStrategy
    || brief.style_sample_strategy
    || brief.styleSampleStrategy
  const source = styleFingerprintTextFromContext(contextPackage, strategy)
  const band = styleFingerprintSentenceBand(source)
  if (!band) return ''
  return compactBriefText(
    `按文风指纹/文风.md 目标句长带 ${band.min}-${band.max} 字合并逗号碎句，恢复中长句呼吸；不要模仿可能已漂移的上一章句式节奏。来源：${compactBriefText(band.source, '')}`,
    320,
  )
}

export function buildStyleFingerprintStateSnapshot(contextPackage: any = {}, project: any = {}, existingStoryState: any = {}) {
  const existingState = {
    ...(project?.reference_config?.story_state || {}),
    ...(project?.referenceConfig?.storyState || {}),
    ...(existingStoryState || {}),
  }
  const existingText = compactBriefText(existingState.style_fingerprint || existingState.styleFingerprint, '')
  if (existingText) {
    const existingBand = styleFingerprintSentenceBand(existingText)
    return {
      style_fingerprint: existingText,
      style_fingerprint_contract: existingState.style_fingerprint_contract || existingState.styleFingerprintContract || {
        source: 'existing_story_state',
        target_sentence_band: existingBand ? `${existingBand.min}-${existingBand.max}字` : '',
        min_sentence_chars: existingBand?.min || null,
        max_sentence_chars: existingBand?.max || null,
        policy: '每章写前按文风指纹确定句长节奏，不以可能已漂移的上一章句式节奏为准。',
      },
    }
  }

  const target = {
    ...(contextPackage?.chapterTarget || {}),
    ...(contextPackage?.chapter_target || {}),
  }
  const brief = {
    ...(contextPackage?.preDraftBrief || {}),
    ...(contextPackage?.pre_draft_brief || {}),
    ...(target?.preDraftBrief || {}),
    ...(target?.pre_draft_brief || {}),
  }
  const strategy = target.style_sample_strategy
    || target.styleSampleStrategy
    || brief.style_sample_strategy
    || brief.styleSampleStrategy
  const source = styleFingerprintTextFromContext(contextPackage, strategy)
  const band = styleFingerprintSentenceBand(source)
  if (!band) return null

  const sourceExcerpt = compactBriefText(band.source || source, 220)
  return {
    style_fingerprint: compactBriefText(
      `文风指纹：目标句长带 ${band.min}-${band.max} 字；${sourceExcerpt}；每章写前按此定句长节奏，不照抄可能已漂移的上一章。`,
      360,
    ),
    style_fingerprint_contract: {
      source: 'context_style_fingerprint',
      target_sentence_band: `${band.min}-${band.max}字`,
      min_sentence_chars: band.min,
      max_sentence_chars: band.max,
      source_excerpt: sourceExcerpt,
      policy: '每章写前按文风指纹/文风.md/原文锚点确定句长节奏；续写衔接剧情，不以可能已漂移的上一章句式节奏为准。',
    },
  }
}
