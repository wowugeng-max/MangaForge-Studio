import { describe, expect, test } from 'bun:test'
import {
  buildChapterWritingBrief,
  buildForeshadowLifecycleBoard,
  buildStoryRelationMaster,
  enhanceCharacterStatusWithRelations,
  inferEmotion,
  inferStoryRelationType,
  isChapterHookName,
  parseRelationPairKey,
  relationPairKey,
} from './novel-setting-story-relations'

describe('story relation master (oh-story aligned)', () => {
  test('parses pair keys and infers type/emotion', () => {
    expect(parseRelationPairKey('江哲-顾主任')).toEqual({ party_a: '江哲', party_b: '顾主任' })
    expect(parseRelationPairKey('江哲与邻居')).toEqual({ party_a: '江哲', party_b: '邻居' })
    expect(relationPairKey('顾主任', '江哲')).toBe(relationPairKey('江哲', '顾主任'))
    expect(relationPairKey('顾主任', '江哲')).toContain('↔')
    expect(inferStoryRelationType('绝对支配与恐惧，顾主任被迫交保护费')).toBe('权威')
    expect(inferEmotion('敌对锁定，大业主视江哲为入侵者')).toBe('负面')
  })

  test('builds relation master from story_state.character_relationships', () => {
    const master = buildStoryRelationMaster({
      storyState: {
        character_relationships: {
          '江哲-顾主任': '绝对支配与恐惧，顾主任被迫向江哲交保护费',
          '江哲-大业主': '敌对锁定，大业主视江哲为入侵者',
        },
      },
      characters: [
        { id: 1, name: '江哲', relationships: [{ target: '小林', status: '已击杀出局' }] },
      ],
    })
    expect(master.summary.total).toBeGreaterThanOrEqual(3)
    expect(master.rows.some(row => row.party_a === '江哲' && row.party_b === '顾主任')).toBe(true)
    expect(master.rows.some(row => row.current_status.includes('保护费'))).toBe(true)
    expect(master.rows.some(row => row.party_b === '小林' || row.party_a === '小林')).toBe(true)
  })

  test('splits string relationships at relation descriptor words instead of swallowing them into party_b', () => {
    const master = buildStoryRelationMaster({
      characters: [
        {
          id: 1,
          name: '江哲',
          relationships: ['与小林同盟', '与顾主任是宿敌', '与李云飞亦师亦友', '与张三：盟友'],
        },
      ],
    })
    const partyBs = master.rows
      .filter(row => row.party_a === '江哲' || row.party_b === '江哲')
      .map(row => (row.party_a === '江哲' ? row.party_b : row.party_a))
    expect(partyBs).toEqual(expect.arrayContaining(['小林', '顾主任', '李云飞', '张三']))
    expect(partyBs).not.toEqual(expect.arrayContaining(['小林同']))
    expect(partyBs).not.toEqual(expect.arrayContaining(['顾主任是宿']))
    expect(partyBs).not.toEqual(expect.arrayContaining(['李云飞亦师亦']))
  })

  test('foreshadow lifecycle hides chapter hooks by default and keeps story plants', () => {
    const board = buildForeshadowLifecycleBoard({
      storyState: {
        foreshadowing_status: {
          '妹妹的涂鸦画册': '江哲在404号房发现画册',
          '大业主的规则清洗': '已铺垫，激活通行证后将引来规则清洗',
        },
      },
      settings: [
        {
          id: 44,
          entity_type: 'foreshadowing',
          name: '第14章 超人的反向审讯钩子',
          summary: '章末钩子',
          payload_json: { source: 'outline_hook' },
        },
        {
          id: 1,
          entity_type: 'foreshadowing',
          name: '妹妹的涂鸦画册',
          summary: '旧设定实体',
          state_json: { lifecycle: '已埋' },
        },
      ],
      includeChapterHooks: false,
    })
    expect(board.rows.some(row => row.name.includes('反向审讯钩子'))).toBe(false)
    expect(board.rows.some(row => row.name === '妹妹的涂鸦画册')).toBe(true)
    expect(isChapterHookName('第14章 超人的反向审讯钩子')).toBe(true)
  })

  test('keeps known relation type and emotion when a newer status infers nothing', () => {
    const master = buildStoryRelationMaster({
      storyState: {
        character_relationships: {
          '江哲-顾主任': '重新谈判中，先各退一步再说条件',
        },
      },
      settings: [
        {
          id: 7,
          entity_type: 'relationship',
          name: '江哲↔顾主任',
          state_json: {
            party_a: '江哲',
            party_b: '顾主任',
            story_relation_type: '联盟',
            emotion: '正面',
            current_status: '结成利益同盟，共同对付大业主',
          },
        },
      ],
    })
    const row = master.rows.find(item => item.pair_key === relationPairKey('江哲', '顾主任'))
    expect(row?.current_status).toContain('重新谈判')
    expect(row?.story_relation_type).toBe('联盟')
    expect(row?.emotion).toBe('正面')
    expect(master.summary.alliance).toBe(1)
  })

  test('story_state lifecycle stays authoritative over setting entity defaults', () => {
    const board = buildForeshadowLifecycleBoard({
      storyState: {
        foreshadowing_status: {
          '妹妹的涂鸦画册': '已回收',
          '断裂的怀表': '已回收',
        },
      },
      settings: [
        {
          id: 1,
          entity_type: 'foreshadowing',
          name: '妹妹的涂鸦画册',
          summary: '404号房的画册',
          state_json: {},
        },
        {
          id: 2,
          entity_type: 'foreshadowing',
          name: '断裂的怀表',
          summary: '旧城当铺的怀表',
          state_json: { status: 'planned', plant_chapter_no: 3 },
        },
      ],
      chapters: [
        { chapter_no: 30, chapter_text: 'x'.repeat(120), has_prose: true, word_count: 120 },
      ],
      includeChapterHooks: false,
    })
    const album = board.rows.find(row => row.name === '妹妹的涂鸦画册')
    const watch = board.rows.find(row => row.name === '断裂的怀表')
    expect(album?.lifecycle).toBe('已回收')
    expect(watch?.lifecycle).toBe('已回收')
    expect(board.summary.resolved).toBe(2)
    expect(board.summary.expired).toBe(0)
  })

  test('chapter writing brief keeps only writing-critical slices', () => {
    const brief = buildChapterWritingBrief({
      chapter: { id: 10, chapter_no: 20, chapter_text: 'x'.repeat(100) },
      storyState: {
        character_relationships: {
          '江哲-顾主任': '绝对支配',
        },
        foreshadowing_status: {
          '1号楼通行证代价': '激活会引来大业主',
        },
        unresolved_conflicts: ['规则清洗倒计时'],
        next_chapter_priorities: ['进入1号楼'],
        character_positions: { 江哲: '1号楼门口' },
      },
      characters: [{ id: 1, name: '江哲', role: '主角', current_state: { summary: '持通行证' } }],
      settings: [{ entity_type: 'rule', name: '通行证规则', summary: '激活即标记入侵者' }],
    })
    expect(brief.relations.length).toBeGreaterThan(0)
    expect(brief.foreshadowing.length).toBeGreaterThan(0)
    expect(brief.unresolved_conflicts).toEqual(expect.arrayContaining(['规则清洗倒计时']))
    expect(brief.world_constraints.some(item => item.includes('通行证'))).toBe(true)
  })

  test('character status absorbs story relations into missing-field readiness', () => {
    const enhanced = enhanceCharacterStatusWithRelations(
      {
        characters: [
          { name: '江哲', relationships: [], missing_fields: ['关系', '能力'], readiness: 'thin' },
        ],
        summary: { total: 1, ready: 0, partial: 0, thin: 1 },
      },
      buildStoryRelationMaster({
        storyState: {
          character_relationships: {
            '江哲-顾主任': '绝对支配',
          },
        },
      }),
    )
    const row = enhanced.characters[0]
    expect(row.relationships.length).toBeGreaterThan(0)
    expect(row.missing_fields).not.toEqual(expect.arrayContaining(['关系']))
  })
  test('backfills relation change nodes from established_events', () => {
    const master = buildStoryRelationMaster({
      storyState: {
        character_relationships: {
          '江哲-顾主任': '绝对支配与恐惧',
          '江哲-小林': '借刀杀人后出局',
        },
        established_events: [
          {
            id: 'evt_ch19_小林_死亡',
            chapter_no: 19,
            kind: 'death',
            subject: '小林',
            predicate: '死亡',
            fact: '樱花国天选者小林被顾主任吞噬嚼碎，彻底死亡。',
          },
          {
            id: 'evt_ch19_顾主任_交付',
            chapter_no: 19,
            kind: 'item_transfer',
            subject: '顾主任',
            predicate: '交付',
            fact: '顾主任将1号楼通行证和500枚诡币交给了江哲以求保命。',
          },
        ],
      },
    })
    const gu = master.rows.find(row => (row.party_a === '江哲' && row.party_b === '顾主任') || (row.party_b === '江哲' && row.party_a === '顾主任'))
    expect(gu).toBeTruthy()
    expect((gu?.change_nodes || []).some(item => String(item.note || '').includes('通行证') || String(item.note || '').includes('诡币'))).toBe(true)
    expect(gu?.start_chapter_no).toBe(19)
    expect(master.summary.with_change_nodes).toBeGreaterThan(0)
  })

  test('marks foreshadow expired by chapter window', () => {
    const board = buildForeshadowLifecycleBoard({
      storyState: {
        foreshadowing_status: {
          '旧钟楼倒计时': '第5章埋下，预计第10章回收揭晓真相',
          '刚埋的新线': '第28章出现的新线索，尚未到期',
        },
      },
      chapters: [
        { chapter_no: 30, chapter_text: 'x'.repeat(100), has_prose: true, word_count: 100 },
      ],
      includeChapterHooks: false,
    })
    const expired = board.rows.find(row => row.name === '旧钟楼倒计时')
    const open = board.rows.find(row => row.name === '刚埋的新线')
    expect(expired?.lifecycle).toBe('已过期')
    expect(expired?.plant_chapter_no).toBe(5)
    expect(expired?.expected_resolve_chapter_no).toBe(10)
    expect(open?.lifecycle).not.toBe('已过期')
    expect(board.summary.expired).toBeGreaterThan(0)
  })

})
