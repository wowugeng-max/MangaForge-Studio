function asArray<T = any>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value
  return value === undefined || value === null || value === '' ? [] : [value]
}

function compactBriefText(value: any) {
  return String(value || '').trim()
}

function storylineUsageName(item: any) {
  return compactBriefText(item?.name || item?.summary || item?.entity_type || '')
}

function storylineUsageByType(storylineContext: any, types: string[]) {
  return asArray(storylineContext?.chapter_usage)
    .filter((item: any) => types.includes(String(item?.usage_type || '')))
    .map(storylineUsageName)
    .filter(Boolean)
}

export function buildPreDraftSettingScope(contextPackage: any = {}, chapterTarget: any = {}) {
  const keySettings = [
    ...asArray(contextPackage?.setting_context?.required),
    ...asArray(contextPackage?.setting_context?.chapter_usage)
      .filter((item: any) => item.required && !item.forbidden)
      .map((item: any) => item.name),
  ].map((item: any) => compactBriefText(item)).filter(Boolean)
  const forbiddenContent = [
    ...asArray(contextPackage?.setting_context?.forbidden),
    ...asArray(chapterTarget.forbidden_repeats),
    ...asArray(contextPackage?.safety_policy?.forbidden),
  ].map((item: any) => compactBriefText(item)).filter(Boolean)
  return {
    key_settings: keySettings,
    forbidden_content: forbiddenContent,
  }
}

export function buildPreDraftStorylineScope(storylineContext: any = {}) {
  const storylineAdvances = [
    ...asArray(storylineContext.required),
    ...storylineUsageByType(storylineContext, ['advance']),
  ].map((item: any) => compactBriefText(item)).filter(Boolean)
  const storylinePlants = storylineUsageByType(storylineContext, ['plant'])
  const storylinePayoffs = storylineUsageByType(storylineContext, ['payoff'])
  const storylineForbidden = [
    ...asArray(storylineContext.forbidden),
    ...storylineUsageByType(storylineContext, ['forbidden']),
  ].map((item: any) => compactBriefText(item)).filter(Boolean)
  return {
    storyline_advances: storylineAdvances,
    storyline_plants: storylinePlants,
    storyline_payoffs: storylinePayoffs,
    storyline_forbidden: storylineForbidden,
  }
}
