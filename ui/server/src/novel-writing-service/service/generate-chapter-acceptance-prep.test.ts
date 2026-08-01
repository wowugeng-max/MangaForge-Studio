import { describe, expect, test } from 'bun:test'
import { buildChapterAcceptancePrep } from './generate-chapter-acceptance-prep'

describe('buildChapterAcceptancePrep', () => {
  const stagedSetting = {
    id: -1,
    project_id: 7,
    name: '江澈',
    entity_type: 'character',
  }
  const persistedSetting = { ...stagedSetting, id: 12 }
  const prepareAcceptance = ({
    settings = [],
    usageEntityId = -1,
    updateEntityId,
  }: {
    settings?: any[]
    usageEntityId?: number
    updateEntityId?: number
  } = {}) => buildChapterAcceptancePrep({
    projectId: 7,
    project: { id: 7, reference_config: {} },
    chapter: { id: 11, project_id: 7, chapter_no: 4, title: '指挥频道入口' },
    chapterPatch: {},
    finalText: '',
    characters: [],
    chapters: [],
    settings,
    chapterSettingUsage: [],
    stagedContextUsageReplacement: null,
    stagedPreflightRepair: {
      staged_character_creates: [],
      staged_setting_creates: [stagedSetting],
      staged_usage_replacement: [{ entity_id: usageEntityId }],
    },
    preparedStoryStateUpdate: {
      next_reference_config: {},
      character_updates: [],
      setting_updates: [{
        ...(updateEntityId === undefined ? {} : { entity_id: updateEntityId }),
        name: '江澈',
        entity_type: 'character',
        state_delta: { location: '指挥频道入口' },
      }],
      storyline_updates: [],
    },
    storyStateStatus: 'synced',
    contextPackage: {},
    selfCheck: {},
  })

  const expectedUsageUpdate = {
    entity_id: -1,
    name: '江澈',
    entity_type: 'character',
    patch: { actual_state_change: { location: '指挥频道入口' } },
  }

  test('maps a prepared setting usage update to its staged negative entity id', () => {
    const result = prepareAcceptance({ settings: [] })

    expect(result.acceptanceUsageUpdates).toEqual([expectedUsageUpdate])
  })

  test('does not treat the same staged entity id in both candidate sources as ambiguous', () => {
    const result = prepareAcceptance({ settings: [stagedSetting] })

    expect(result.acceptanceUsageUpdates).toEqual([expectedUsageUpdate])
  })

  test('fails closed when different entity ids share the same name and type', () => {
    const result = prepareAcceptance({ settings: [persistedSetting] })

    expect(result.acceptanceUsageUpdates).toEqual([])
  })

  test('preserves direct positive and negative entity ids when name and type are ambiguous', () => {
    for (const entityId of [-1, 12]) {
      const result = prepareAcceptance({
        settings: [persistedSetting],
        usageEntityId: entityId,
        updateEntityId: entityId,
      })

      expect(result.acceptanceUsageUpdates).toEqual([{
        ...expectedUsageUpdate,
        entity_id: entityId,
      }])
    }
  })
})
