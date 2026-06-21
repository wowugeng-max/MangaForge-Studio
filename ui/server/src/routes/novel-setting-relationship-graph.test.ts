import { describe, expect, test } from 'bun:test'
import { buildSettingRelationshipGraph } from './novel-setting-relationship-graph'

describe('buildSettingRelationshipGraph', () => {
  test('infers character-centered relations from setting state and chapter usage', () => {
    const graph = buildSettingRelationshipGraph({
      settings: [
        {
          id: 1,
          project_id: 7,
          entity_type: 'character',
          name: '迟正',
          summary: '断臂少年，主角。',
          first_chapter_no: 1,
          state_json: {
            age: 17,
            realm: '炼骨境',
            abilities: ['食兽感应'],
            faction: '荒门',
            relationships: [{ target: '鹿九', type: '盟友', state: '初步信任' }],
          },
          constraints_json: { taboo: '不能提前揭露断臂神纹来源' },
          payload_json: { protagonist: true },
        },
        { id: 2, project_id: 7, entity_type: 'ability', name: '食兽感应', state_json: { owner: '迟正' } },
        { id: 3, project_id: 7, entity_type: 'realm', name: '炼骨境' },
        { id: 4, project_id: 7, entity_type: 'faction', name: '荒门' },
        { id: 5, project_id: 7, entity_type: 'mainline', name: '追查断臂神纹', payload_json: { related_characters: ['迟正'] } },
        { id: 6, project_id: 7, entity_type: 'character', name: '鹿九' },
      ],
      chapters: [
        { id: 11, project_id: 7, chapter_no: 5, title: '食兽感应' },
      ],
      usage: [
        { id: 31, project_id: 7, chapter_id: 11, entity_id: 1, usage_type: 'required', expected_state_change: { note: '首次主动感应异兽残痕' } },
      ],
    })

    const protagonist = graph.nodes.find(node => node.id === 'setting-1')

    expect(protagonist?.metadata).toMatchObject({
      age: 17,
      realm: '炼骨境',
      faction: '荒门',
      abilities: ['食兽感应'],
    })
    expect(graph.edges.map(edge => edge.relation_type)).toEqual(expect.arrayContaining([
      'has_ability',
      'in_realm',
      'member_of',
      'in_storyline',
      'used_in_chapter',
      'character_relation',
    ]))
    expect(graph.edges).toContainEqual(expect.objectContaining({
      source: 'setting-1',
      target: 'chapter-11',
      relation_type: 'used_in_chapter',
      start_chapter_no: 5,
      state: { note: '首次主动感应异兽残痕' },
    }))
  })

  test('diagnoses missing owners, dangling ids, and isolated key assets', () => {
    const graph = buildSettingRelationshipGraph({
      settings: [
        { id: 1, project_id: 7, entity_type: 'character', name: '迟正', related_entity_ids: [999] },
        { id: 2, project_id: 7, entity_type: 'ability', name: '无主异能', state_json: {} },
        { id: 3, project_id: 7, entity_type: 'item', name: '孤立骨片', state_json: {} },
      ],
    })

    expect(graph.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'dangling_relation', entity_id: 1, evidence: 'related_entity_ids' }),
      expect.objectContaining({ type: 'missing_owner', entity_id: 2 }),
      expect.objectContaining({ type: 'isolated_key_asset', entity_id: 3 }),
    ]))
    expect(graph.summary).toMatchObject({
      isolated_key_asset_count: 3,
      missing_owner_count: 1,
    })
  })
})
