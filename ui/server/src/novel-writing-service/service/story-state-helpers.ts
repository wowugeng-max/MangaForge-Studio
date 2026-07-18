import { mergeEstablishedEvents, projectCanonFactsFromEvents } from '../../novel-writing/established-event-canon'
import { asArray } from '../../routes/novel-route-utils'
import { buildMergedLayeredMemoryContext, normalizeDailyContextSnapshot } from '../quality/memory-longform-contracts'

export function normalizeStoryStateDeltaForStorage(delta: any = {}) {
  const objectValue = (value: any) => value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const source = delta || {}
  return {
    ...source,
    current_time: source.current_time ?? source.currentTime,
    character_positions: { ...objectValue(source.character_positions), ...objectValue(source.characterPositions) },
    character_relationships: { ...objectValue(source.character_relationships), ...objectValue(source.characterRelationships) },
    relationship_graph: { ...objectValue(source.relationship_graph), ...objectValue(source.relationshipGraph) },
    known_secrets: { ...objectValue(source.known_secrets), ...objectValue(source.knownSecrets) },
    secret_visibility: { ...objectValue(source.secret_visibility), ...objectValue(source.secretVisibility) },
    item_ownership: { ...objectValue(source.item_ownership), ...objectValue(source.itemOwnership) },
    resource_status: { ...objectValue(source.resource_status), ...objectValue(source.resourceStatus) },
    foreshadowing_status: { ...objectValue(source.foreshadowing_status), ...objectValue(source.foreshadowingStatus) },
    payoff_queue: asArray(source.payoff_queue || source.payoffQueue),
    active_locations: asArray(source.active_locations || source.activeLocations),
    open_questions: asArray(source.open_questions || source.openQuestions),
    recent_repeated_information: asArray(source.recent_repeated_information || source.recentRepeatedInformation),
    next_chapter_priorities: asArray(source.next_chapter_priorities || source.nextChapterPriorities),
    layered_memory_context: source.layered_memory_context || source.layeredMemoryContext,
    progress_summary: source.progress_summary || source.progressSummary,
    daily_context_snapshot: normalizeDailyContextSnapshot(source.daily_context_snapshot || source.dailyContextSnapshot),
    style_fingerprint: source.style_fingerprint ?? source.styleFingerprint,
    style_fingerprint_contract: source.style_fingerprint_contract || source.styleFingerprintContract,
  }
}

export function mergeStoryState(prev: any, delta: any, chapter: any) {
  const establishedEvents = mergeEstablishedEvents(
    [
      ...asArray((prev || {}).established_events),
      ...asArray((prev || {}).canon_facts),
    ],
    [
      ...asArray((delta || {}).established_events),
      ...asArray((delta || {}).canon_facts),
    ],
    { chapterNo: chapter?.chapter_no },
  )
  const projectedFacts = projectCanonFactsFromEvents(establishedEvents)
  return {
    ...(prev || {}),
    ...(delta || {}),
    character_positions: { ...((prev || {}).character_positions || {}), ...((delta || {}).character_positions || {}) },
    character_relationships: { ...((prev || {}).character_relationships || {}), ...((delta || {}).character_relationships || {}) },
    relationship_graph: { ...((prev || {}).relationship_graph || {}), ...((delta || {}).relationship_graph || {}) },
    known_secrets: { ...((prev || {}).known_secrets || {}), ...((delta || {}).known_secrets || {}) },
    secret_visibility: { ...((prev || {}).secret_visibility || {}), ...((delta || {}).secret_visibility || {}) },
    item_ownership: { ...((prev || {}).item_ownership || {}), ...((delta || {}).item_ownership || {}) },
    resource_status: { ...((prev || {}).resource_status || {}), ...((delta || {}).resource_status || {}) },
    foreshadowing_status: { ...((prev || {}).foreshadowing_status || {}), ...((delta || {}).foreshadowing_status || {}) },
    payoff_queue: asArray((delta || {}).payoff_queue).length ? asArray((delta || {}).payoff_queue) : asArray((prev || {}).payoff_queue),
    active_locations: asArray((delta || {}).active_locations).length ? asArray((delta || {}).active_locations) : asArray((prev || {}).active_locations),
    open_questions: asArray((delta || {}).open_questions).length ? asArray((delta || {}).open_questions) : asArray((prev || {}).open_questions),
    next_chapter_priorities: asArray((delta || {}).next_chapter_priorities).length ? asArray((delta || {}).next_chapter_priorities) : asArray((prev || {}).next_chapter_priorities),
    layered_memory_context: buildMergedLayeredMemoryContext((prev || {}).layered_memory_context, (delta || {}).layered_memory_context, chapter),
    progress_summary: (delta || {}).progress_summary || (prev || {}).progress_summary || null,
    daily_context_snapshot: (delta || {}).daily_context_snapshot || (prev || {}).daily_context_snapshot || null,
    established_events: establishedEvents,
    canon_facts: projectedFacts.length
      ? projectedFacts
      : (asArray((delta || {}).canon_facts).length ? asArray((delta || {}).canon_facts) : asArray((prev || {}).canon_facts)),
    last_updated_chapter: chapter.chapter_no,
    last_updated_at: new Date().toISOString(),
  }
}
