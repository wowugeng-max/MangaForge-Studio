import {
  mergeIdentityCanonIntoStoryState,
  mergeNameCanonIntoStoryState,
  planCharacterCardSync,
} from '../../novel-writing/character-card-sync'
import {
  buildSettingConsistencyReviewRecord,
} from '../../novel-writing/service-review-record'
import {
  asArray,
  getStoryState,
} from '../../routes/novel-route-utils'

export function buildChapterAcceptancePrep(args: {
  projectId: number
  project: any
  chapter: any
  chapterPatch: any
  finalText: string
  characters: any[]
  chapters: any[]
  settings: any[]
  chapterSettingUsage: any
  stagedContextUsageReplacement: any
  stagedPreflightRepair: any
  preparedStoryStateUpdate: any
  storyStateStatus: string
  contextPackage: any
  selfCheck: any
}) {
  const {
    projectId,
    project,
    chapter,
    chapterPatch,
    finalText,
    characters,
    chapters,
    settings,
    chapterSettingUsage,
    stagedContextUsageReplacement,
    stagedPreflightRepair,
    storyStateStatus,
    contextPackage,
    selfCheck,
  } = args
  let preparedStoryStateUpdate = args.preparedStoryStateUpdate

  // Auto-create missing named cast cards and sync current_state from prose + story-state updates.
  const characterCardSync = planCharacterCardSync({
    projectId,
    chapter: { ...chapter, ...chapterPatch, chapter_text: finalText },
    existingCharacters: characters,
    previousChapters: asArray(chapters).filter((item: any) => Number(item?.chapter_no || 0) < Number(chapter.chapter_no || 0)),
    characterUpdates: preparedStoryStateUpdate.character_updates,
    contextPackage,
  })
  const acceptanceCharacterCreates = [
    ...asArray(stagedPreflightRepair?.staged_character_creates),
    ...asArray(characterCardSync.character_creates),
  ]
  const acceptanceCharacterUpdates = (() => {
    const byKey = new Map<string, any>()
    for (const update of characterCardSync.character_updates) {
      const key = String(update?.id || update?.name || '')
      if (!key) continue
      byKey.set(key, update)
    }
    for (const update of asArray(preparedStoryStateUpdate.character_updates)) {
      const name = String(update?.name || '').trim()
      const id = Number(update?.character_id || update?.characterId || update?.id || 0) || undefined
      const key = String(id || name || '')
      if (!key) continue
      const prev = byKey.get(key) || { id, name, patch: { current_state: {} } }
      byKey.set(key, {
        id: id || prev.id,
        name: name || prev.name,
        patch: {
          current_state: {
            ...(prev.patch?.current_state || {}),
            ...(update?.current_state || update?.currentState || {}),
            last_seen_chapter: chapter.chapter_no,
          },
        },
      })
    }
    return [...byKey.values()]
  })()
  if (storyStateStatus === 'synced' && (characterCardSync.title_name_canon.length || characterCardSync.identity_canon?.length)) {
    const nextConfig = preparedStoryStateUpdate.next_reference_config || project.reference_config || {}
    let nextStoryState = mergeNameCanonIntoStoryState(
      nextConfig.story_state || nextConfig.storyState || getStoryState(project) || {},
      characterCardSync.title_name_canon,
    )
    if (characterCardSync.identity_canon?.length) {
      nextStoryState = mergeIdentityCanonIntoStoryState(nextStoryState, characterCardSync.identity_canon)
    }
    preparedStoryStateUpdate = {
      ...preparedStoryStateUpdate,
      next_reference_config: {
        ...nextConfig,
        story_state: {
          ...nextStoryState,
          character_card_sync: {
            version: characterCardSync.version,
            created_names: characterCardSync.created_names,
            updated_names: characterCardSync.updated_names,
            name_drifts: characterCardSync.name_drifts,
            identity_drifts: characterCardSync.identity_drifts || [],
          },
        },
      },
    }
  }
  const acceptanceSettingUpdates = [
    ...asArray(preparedStoryStateUpdate.setting_updates).map((update: any) => ({ update, storyline: false })),
    ...asArray(preparedStoryStateUpdate.storyline_updates).map((update: any) => ({ update, storyline: true })),
  ].map(({ update, storyline }) => ({
    entity_id: Number(update?.entity_id || update?.entityId || update?.id || 0) || undefined,
    name: String(update?.name || '').trim() || undefined,
    entity_type: String(update?.entity_type || update?.entityType || '').trim() || undefined,
    patch: {
      state_json: {
        ...(update?.state_delta || update?.stateDelta || update?.actual_state_change || update?.actualStateChange || {}),
        last_seen_chapter: chapter.chapter_no,
        ...(storyline ? {
          last_checked_chapter_id: chapter.id,
          last_checked_chapter_no: chapter.chapter_no,
        } : {}),
      },
    },
  }))
  const finalCandidateChapterUsage = asArray(
    stagedPreflightRepair?.staged_usage_replacement
      ?? stagedContextUsageReplacement
      ?? chapterSettingUsage,
  )
  const resolveCandidateSettingId = (reference: any) => {
    const directId = Number(reference?.entity_id || reference?.entityId || reference?.id || 0)
    if (directId) return directId
    const name = String(reference?.entity_name || reference?.name || '').trim()
    const entityType = String(reference?.entity_type || reference?.entityType || '').trim()
    if (!name) return 0
    const matches = asArray(settings).filter((setting: any) => (
      String(setting?.name || '').trim() === name
      && (!entityType || String(setting?.entity_type || '').trim() === entityType)
    ))
    return matches.length === 1 ? Number(matches[0]?.id || 0) : 0
  }
  const finalCandidateUsageEntityIds = new Set(
    finalCandidateChapterUsage
      .map((usage: any) => resolveCandidateSettingId(usage))
      .filter((entityId: number) => entityId !== 0),
  )
  const acceptanceUsageUpdates = [
    ...asArray(preparedStoryStateUpdate.setting_updates),
    ...asArray(preparedStoryStateUpdate.storyline_updates),
  ].map((update: any) => ({ update, entityId: resolveCandidateSettingId(update) }))
    .filter(({ entityId }) => finalCandidateUsageEntityIds.has(entityId))
    .map(({ update, entityId }) => ({
      entity_id: entityId || undefined,
      name: String(update?.name || '').trim() || undefined,
      entity_type: String(update?.entity_type || update?.entityType || '').trim() || undefined,
      patch: {
        actual_state_change: update?.actual_state_change
          || update?.actualStateChange
          || update?.state_delta
          || update?.stateDelta
          || {},
      },
    }))
  const settingConsistencyReview = buildSettingConsistencyReviewRecord({
    projectId,
    chapter: { ...chapter, ...chapterPatch },
    contextPackage,
    selfCheck,
  })

  return {
    preparedStoryStateUpdate,
    characterCardSync,
    acceptanceCharacterCreates,
    acceptanceCharacterUpdates,
    acceptanceSettingUpdates,
    acceptanceUsageUpdates,
    settingConsistencyReview,
  }
}
