import { asArray, compactText, parseJsonLikePayload } from '../../routes/novel-route-utils'
import { compactBriefText } from './text-utils'

export function storylineUsageName(item: any) {
  return String(item?.name || item?.summary || item?.entity_type || '').trim()
}

export function storylineUsageByType(storylineContext: any, types: string[]) {
  return asArray(storylineContext?.chapter_usage)
    .filter((item: any) => types.includes(String(item?.usage_type || '')))
    .map(storylineUsageName)
    .filter(Boolean)
}

export function settingJsonObject(value: any) {
  const parsed = parseJsonLikePayload(value)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
}

export function characterArcText(...values: any[]) {
  for (const value of values) {
    const text = compactText(value, 260)
    if (text) return text
  }
  return ''
}

export function characterArcListText(...values: any[]) {
  return Array.from(new Set(values.flatMap(value => asArray(value).map((item: any) => compactText(item, 80)).filter(Boolean))))
}

export function characterArcJoinedText(...values: any[]) {
  return Array.from(new Set(values.map(value => compactText(value, 220)).filter(Boolean))).join('；')
}

export function characterArcUsageKey(item: any) {
  const id = Number(item?.entity_id || item?.id || 0)
  const name = compactBriefText(item?.name || item?.title)
  return id ? `id:${id}` : name ? `name:${name}` : ''
}

export function characterArcEntityKeys(entity: any) {
  const id = Number(entity?.id || entity?.entity_id || 0)
  const name = compactBriefText(entity?.name || entity?.title)
  return [id ? `id:${id}` : '', name ? `name:${name}` : ''].filter(Boolean)
}

export function characterArcTypeLabel(type: string) {
  return type === 'relationship_arc' ? '关系线' : '角色线'
}

export function buildCharacterArcBriefFromContext(contextPackage: any) {
  const target = contextPackage?.chapter_target || {}
  const explicit = target.character_arc_brief
    || target.characterArcBrief
    || contextPackage?.pre_draft_brief?.character_arc_brief
    || contextPackage?.pre_draft_brief?.characterArcBrief
    || contextPackage?.character_arc_context
    || contextPackage?.characterArcContext
  if (explicit && typeof explicit === 'object' && Object.keys(explicit).length > 0) return explicit

  const chapterNo = Number(target.chapter_no || 0)
  const chapterText = [
    target.title,
    target.summary,
    target.goal,
    target.chapter_goal,
    target.conflict,
    target.ending_hook,
  ].map(item => compactBriefText(item)).filter(Boolean).join(' ')
  const entities = [
    ...asArray(contextPackage?.setting_context?.entities),
    ...asArray(contextPackage?.storyline_context?.entities),
  ]
  const usages = [
    ...asArray(contextPackage?.setting_context?.chapter_usage),
    ...asArray(contextPackage?.storyline_context?.chapter_usage),
  ].filter((item: any) => ['advance', 'plant', 'payoff', 'required'].includes(String(item?.usage_type || 'advance')))
  const usageMap = new Map<string, any>()
  for (const usage of usages) {
    const key = characterArcUsageKey(usage)
    if (key && !usageMap.has(key)) usageMap.set(key, usage)
  }

  const arcs = entities
    .filter((entity: any) => ['character_arc', 'relationship_arc'].includes(String(entity?.entity_type || entity?.type || '')))
    .map((entity: any) => {
      const entityType = String(entity?.entity_type || entity?.type || 'character_arc')
      const payload = settingJsonObject(entity?.payload_json || entity?.payload || {})
      const constraints = settingJsonObject(entity?.constraints_json || entity?.constraints || {})
      const state = settingJsonObject(entity?.state_json || entity?.state || {})
      const keys = characterArcEntityKeys(entity)
      const usage = keys.map(key => usageMap.get(key)).find(Boolean)
        || usages.find((item: any) => compactBriefText(item?.name) && compactBriefText(entity?.name).includes(compactBriefText(item?.name)))
        || null
      const expected = settingJsonObject(usage?.expected_state_change || usage?.expectedStateChange || {})
      const relatedCharacters = characterArcListText(payload?.related_characters, payload?.characters, payload?.related_names, payload?.relatedNames)
      const nextAdvanceChapter = Number(state?.next_advance_chapter || payload?.next_advance_chapter || 0)
      const due = Boolean(chapterNo && nextAdvanceChapter && nextAdvanceChapter <= chapterNo)
      const mentioned = Boolean(chapterText && [
        compactBriefText(entity?.name),
        ...relatedCharacters,
      ].some(token => token && chapterText.includes(token)))
      if (!usage && !due && !mentioned) return null
      const growthBeat = characterArcJoinedText(
        expected?.growth_beat,
        expected?.growthBeat,
        expected?.character_growth,
        expected?.characterGrowth,
        expected?.next,
        payload?.growth_beat,
        payload?.growthBeat,
        payload?.growth_target,
        payload?.growthTarget,
        payload?.expected_payoff,
      )
      const relationshipShift = characterArcJoinedText(
        expected?.relationship_shift,
        expected?.relationshipShift,
        expected?.relationship_change,
        expected?.relationshipChange,
        expected?.next,
        payload?.relationship_shift,
        payload?.relationshipShift,
        state?.relationship_shift,
      )
      return {
        entity_id: Number(entity?.id || entity?.entity_id || 0) || null,
        entity_type: entityType,
        type_label: characterArcTypeLabel(entityType),
        name: compactBriefText(entity?.name || entity?.title, entityType === 'relationship_arc' ? '未命名关系线' : '未命名角色线'),
        summary: compactBriefText(entity?.summary || payload?.summary),
        usage_type: compactBriefText(usage?.usage_type || (due ? 'advance' : 'required')),
        related_characters: relatedCharacters,
        current_state: characterArcText(state?.current_state, entity?.status),
        desire: characterArcText(payload?.desire, payload?.character_desire, state?.desire, expected?.desire),
        flaw_pressure: characterArcText(payload?.flaw_pressure, payload?.flawPressure, payload?.inner_conflict, state?.flaw_pressure, expected?.flaw_pressure),
        growth_beat: growthBeat,
        relationship_shift: relationshipShift,
        voice_anchor: characterArcText(payload?.voice_anchor, payload?.voiceAnchor, state?.voice_anchor),
        forbidden_reveal: characterArcText(constraints?.forbidden_reveal, constraints?.taboo, payload?.forbidden_reveal),
        expected_state_change: expected,
        next_advance_chapter: nextAdvanceChapter || null,
      }
    })
    .filter(Boolean)
    .slice(0, 8)

  if (!arcs.length) return null
  const listFromArcs = (key: string) => Array.from(new Set(arcs.map((arc: any) => compactBriefText(arc?.[key])).filter(Boolean))).slice(0, 6)
  return {
    desire: listFromArcs('desire').join('；'),
    flaw_pressure: listFromArcs('flaw_pressure').join('；'),
    relationship_shift: listFromArcs('relationship_shift').join('；'),
    growth_beat: listFromArcs('growth_beat').join('；'),
    voice_anchor: listFromArcs('voice_anchor').join('；'),
    forbidden_reveal: listFromArcs('forbidden_reveal').join('；'),
    arcs,
  }
}
