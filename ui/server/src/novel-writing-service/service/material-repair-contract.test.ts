import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  buildMaterialRepairTask,
  materialRepairExistingIdentity,
  prepareMcpMaterialRepairMutation,
  resolveMaterialRepairTargets,
} from './material-repair-contract'

function expectContractError(action: () => unknown, code: string) {
  try {
    action()
    throw new Error(`expected ${code}`)
  } catch (error: any) {
    expect(error).toMatchObject({ code, error_code: code })
  }
}

describe('material repair target contract', () => {
  test('maps all missing preflight families into one target set', () => {
    expect(resolveMaterialRepairTargets({
      preflight: {
        checks: [
          { key: 'worldbuilding', ok: false },
          { key: 'characters', ok: false },
          { key: 'character_state', ok: false },
          { key: 'setting_workshop', ok: false },
          { key: 'chapter_setting_usage', ok: false },
          { key: 'chapter_blueprint', ok: false },
        ],
      },
    })).toEqual(new Set([
      'worldbuilding',
      'characters',
      'character_updates',
      'settings',
      'chapter_setting_usage',
      'chapter_patch',
    ]))
  })

  test('groups every chapter preparation alias and honors explicit requested keys', () => {
    expect(resolveMaterialRepairTargets({ preflight: { checks: [] } }, [
      'chapter_conflict',
      'ending_hook',
      'plot_points',
      'scene_cards',
      'no_repeat',
      'source_readiness_chapter_blueprint',
      'source_readiness_context_tracking',
      'source_readiness_timeline_tracking',
      'source_readiness_scene_card_goal_obstacle_change',
      'benchmark_recall_source_paths',
      'benchmark_recall_gate',
      'unknown_check',
    ])).toEqual(new Set(['chapter_patch']))
  })

  test('uses only failed checks when no requested key override is provided', () => {
    expect(resolveMaterialRepairTargets({
      preflight: {
        checks: [
          { key: 'worldbuilding', ok: true },
          { key: 'characters', ok: false },
          { key: '', ok: false },
        ],
      },
    })).toEqual(new Set(['characters']))
  })
})

describe('material repair prompt contract', () => {
  test('builds a bounded self-contained authority prompt with an exact JSON envelope', () => {
    const task = buildMaterialRepairTask({
      targets: new Set(['chapter_patch', 'character_updates', 'settings']),
      project: {
        id: 7,
        title: '灰塔回声',
        genre: '悬疑',
        synopsis: '林砚必须在灰塔倒转前找到失踪记录。',
        style_tags: ['克制', '高压'],
      },
      chapter: {
        id: 12,
        project_id: 7,
        chapter_no: 3,
        title: '灰塔底层',
        chapter_goal: '找到旧档案柜',
        raw_payload: { must_advance: ['确认灰塔倒转规律'] },
        chapter_text: '不得进入材料提示词的正文。',
      },
      contextPackage: {
        writing_bible: { reader_promise: '每章推进一个可验证谜面' },
        preflight: { checks: [{ key: 'character_state', ok: false, fix: '补齐林砚位置' }] },
        story_state: { global: { active_locations: ['灰塔'] } },
        continuity: { previous_chapter: { ending_hook: '塔钟逆转。' } },
      },
      chapters: Array.from({ length: 8 }, (_, index) => ({
        id: index + 1,
        chapter_no: index + 1,
        title: `第${index + 1}章`,
        chapter_summary: `摘要${index + 1}`,
        chapter_text: '历史正文不应整段进入提示词。',
      })),
      worldbuilding: [{ id: 1, world_summary: '灰塔每次倒转都会抹去一条登记。' }],
      characters: [{ id: 2, name: '林砚', current_state: { location: '灰塔底层' } }],
      outlines: [{ id: 3, outline_type: 'chapter', title: '第三章', summary: '找到旧档案柜' }],
      reviews: [{ id: 4, summary: '必须承接塔钟逆转。' }],
      settings: [{ id: 5, entity_type: 'location', name: '灰塔', summary: '封闭档案塔' }],
      chapterSettingUsage: [{ entity_id: 5, required: true }],
    })

    expect(task.length).toBeLessThanOrEqual(180000)
    expect(task).toContain('一次性补齐本章写作前置材料')
    expect(task).toContain('只输出 JSON，不生成正文')
    expect(task).toContain('MangaForge 本次请求中的项目材料是权威上下文')
    expect(task).toContain('不得用远端历史覆盖')
    expect(task).toContain('chapter_patch')
    expect(task).toContain('character_updates')
    expect(task).toContain('chapter_setting_usage')
    expect(task).toContain('repair_summary')
    expect(task).toContain('灰塔回声')
    expect(task).toContain('每章推进一个可验证谜面')
    expect(task).toContain('补齐林砚位置')
    expect(task).toContain('active_locations')
    expect(task).toContain('塔钟逆转')
    expect(task).not.toContain('不得进入材料提示词的正文')
    expect(task).not.toContain('历史正文不应整段进入提示词')
    expect(task).not.toContain('摘要1')
    expect(task).toContain('摘要8')
  })

  test('bounds oversized nested context while retaining the output rules at the tail', () => {
    const huge = '资料'.repeat(200000)
    const task = buildMaterialRepairTask({
      targets: new Set(['worldbuilding']),
      project: { title: '有界项目', synopsis: huge },
      chapter: { chapter_no: 1, title: '第一章', raw_payload: { chapter_blueprint: { notes: huge } } },
      contextPackage: {
        writing_bible: { notes: huge },
        preflight: { checks: Array.from({ length: 200 }, (_, index) => ({ key: `check_${index}`, ok: false, evidence: huge })) },
        story_state: { notes: huge },
      },
      chapters: Array.from({ length: 100 }, (_, index) => ({ chapter_no: index + 1, chapter_summary: huge })),
      worldbuilding: Array.from({ length: 100 }, () => ({ world_summary: huge })),
      characters: Array.from({ length: 100 }, (_, index) => ({ name: `角色${index}`, current_state: { notes: huge } })),
      outlines: Array.from({ length: 100 }, (_, index) => ({ title: `大纲${index}`, summary: huge })),
      reviews: Array.from({ length: 100 }, () => ({ summary: huge })),
      settings: Array.from({ length: 100 }, (_, index) => ({ entity_type: 'rule', name: `规则${index}`, summary: huge })),
      chapterSettingUsage: Array.from({ length: 100 }, (_, index) => ({ entity_id: index + 1, expected_state_change: { notes: huge } })),
    })

    expect(task.length).toBeLessThanOrEqual(180000)
    expect(task).toContain('有界项目')
    expect(task).toContain('仅返回必须补齐的分区')
    expect(task).toContain('不得输出 Markdown 代码围栏或解释文字')
  })

  test('keeps the provider-neutral implementation free of an adapter brand identifier', () => {
    const source = readFileSync(new URL('./material-repair-contract.ts', import.meta.url), 'utf8')
    expect(source.toLowerCase()).not.toContain(['bu', 'da'].join(''))
  })
})

describe('material repair mutation preparation', () => {
  test('rejects a response that does not cover every requested target', () => {
    expectContractError(() => prepareMcpMaterialRepairMutation({
      targets: new Set(['worldbuilding', 'characters']),
      payload: { characters: [{ name: '林砚', goal: '找到旧档案柜' }], repair_summary: '只补了角色' },
      existing: { characterNames: new Set(), settingKeys: new Set() },
    }), 'MATERIAL_REPAIR_INCOMPLETE')
  })

  test('does not turn empty remote fields into overwrites', () => {
    const prepared = prepareMcpMaterialRepairMutation({
      targets: new Set(['character_updates']),
      payload: {
        character_updates: [{
          name: '林砚',
          current_state: { location: '灰塔底层', inventory: [], note: '   ' },
          goal: '',
          abilities: [],
        }],
        repair_summary: '更新状态',
      },
      existing: { characterNames: new Set(['林砚']), settingKeys: new Set() },
    })

    expect(prepared.acceptance.character_updates).toEqual([{
      name: '林砚',
      patch: { current_state: { location: '灰塔底层' } },
    }])
    expect(prepared.summary).toBe('更新状态')
  })

  test('prepares one combined result in the real acceptance shape', () => {
    const existing = materialRepairExistingIdentity({
      characters: [{ id: 2, name: '林砚' }],
      settings: [{ id: 5, entity_type: 'location', name: '灰塔' }],
    })
    const prepared = prepareMcpMaterialRepairMutation({
      targets: new Set([
        'chapter_patch',
        'worldbuilding',
        'characters',
        'character_updates',
        'settings',
        'chapter_setting_usage',
      ]),
      payload: {
        chapter_patch: {
          title: '灰塔倒转',
          chapter_goal: '找到旧档案柜',
          chapter_summary: '',
          scene_list: [{ scene_no: 1, goal: '抵达底层', obstacle: '塔门锁死' }],
          raw_payload: {
            chapter_blueprint: { target_emotion: '窒息感' },
            write_preparation_brief: { ready: true },
            source_readiness: [{ key: 'chapter_blueprint', ready: true }],
            must_advance: ['确认灰塔倒转规律'],
            forbidden_repeats: [],
          },
        },
        worldbuilding: [{
          summary: '灰塔每次倒转都会抹去一条登记。',
          rules: ['倒转发生时，塔内记录按楼层逆序消失。'],
        }],
        characters: [{
          name: '许昼',
          role_type: 'supporting',
          motivation: '找回被抹去的值班记录',
        }],
        character_updates: [{
          name: '林砚',
          current_state: { location: '灰塔底层' },
          goal: '',
        }],
        settings: [{
          type: 'item',
          title: '逆时登记册',
          summary: '只在塔钟倒转时显字。',
          constraints: { trigger: '塔钟倒转' },
        }],
        chapter_setting_usage: [
          { entity_id: 5, usage_type: 'required', required: true },
          { entity_name: '逆时登记册', entity_type: 'item', usage_type: 'plant', expected_state_change: { discovered: true } },
        ],
        repair_summary: '补齐本章蓝图、角色状态、世界规则和设定调用。',
      },
      existing,
    })

    expect(prepared.acceptance).toEqual({
      chapter_patch: {
        title: '灰塔倒转',
        chapter_goal: '找到旧档案柜',
        scene_list: [{ scene_no: 1, goal: '抵达底层', obstacle: '塔门锁死' }],
        raw_payload: {
          chapter_blueprint: { target_emotion: '窒息感' },
          write_preparation_brief: { ready: true },
          source_readiness: [{ key: 'chapter_blueprint', ready: true }],
          must_advance: ['确认灰塔倒转规律'],
        },
      },
      worldbuilding_creates: [{
        world_summary: '灰塔每次倒转都会抹去一条登记。',
        rules: ['倒转发生时，塔内记录按楼层逆序消失。'],
      }],
      character_creates: [{
        name: '许昼',
        role_type: 'supporting',
        motivation: '找回被抹去的值班记录',
      }],
      character_updates: [{
        name: '林砚',
        patch: { current_state: { location: '灰塔底层' } },
      }],
      setting_creates: [{
        entity_type: 'item',
        name: '逆时登记册',
        summary: '只在塔钟倒转时显字。',
        constraints_json: { trigger: '塔钟倒转' },
      }],
      chapter_setting_usage_replacement: [
        { entity_id: 5, usage_type: 'required', required: true },
        { entity_name: '逆时登记册', entity_type: 'item', usage_type: 'plant', expected_state_change: { discovered: true } },
      ],
    })
    expect(prepared.applied).toEqual([
      { type: 'chapter_patch' },
      { type: 'worldbuilding_created', count: 1 },
      { type: 'characters_created', count: 1 },
      { type: 'characters_updated', count: 1 },
      { type: 'settings_created', count: 1 },
      { type: 'chapter_setting_usage_replaced', count: 2 },
    ])
  })

  test('rejects non-requested sections and forbidden mutation fields', () => {
    expectContractError(() => prepareMcpMaterialRepairMutation({
      targets: new Set(['worldbuilding']),
      payload: {
        worldbuilding: [{ world_summary: '灰塔有十二层。' }],
        characters: [{ name: '越权角色', goal: '越权创建' }],
      },
      existing: { characterNames: new Set(), settingKeys: new Set() },
    }), 'MATERIAL_REPAIR_FORBIDDEN_FIELD')

    for (const payload of [
      { chapter_patch: { chapter_text: '越权正文' } },
      { chapter_patch: { project_id: 99, title: '越权章节' } },
      { chapter_patch: { raw_payload: { generation_source: { active: 'model' } } } },
      { chapter_patch: { title: '合法字段' }, project_patch: { title: '越权项目' } },
    ]) {
      expectContractError(() => prepareMcpMaterialRepairMutation({
        targets: new Set(['chapter_patch']),
        payload,
        existing: { characterNames: new Set(), settingKeys: new Set() },
      }), 'MATERIAL_REPAIR_FORBIDDEN_FIELD')
    }
  })

  test('rejects duplicate and existing character or setting identities', () => {
    for (const payload of [
      { characters: [{ name: '许昼', goal: '一' }, { name: '许昼', goal: '二' }] },
      { characters: [{ name: '林砚', goal: '重复创建已有角色' }] },
    ]) {
      expectContractError(() => prepareMcpMaterialRepairMutation({
        targets: new Set(['characters']),
        payload,
        existing: { characterNames: new Set(['林砚']), settingKeys: new Set(['location\u0000灰塔']) },
      }), 'MATERIAL_REPAIR_DUPLICATE')
    }

    for (const payload of [
      { settings: [{ entity_type: 'item', name: '登记册', summary: '一' }, { type: 'item', title: '登记册', summary: '二' }] },
      { settings: [{ entity_type: 'location', name: '灰塔', summary: '重复创建已有设定' }] },
    ]) {
      expectContractError(() => prepareMcpMaterialRepairMutation({
        targets: new Set(['settings']),
        payload,
        existing: { characterNames: new Set(['林砚']), settingKeys: new Set(['location\u0000灰塔']) },
      }), 'MATERIAL_REPAIR_DUPLICATE')
    }
  })

  test('rejects duplicate updates, unresolved references, and IDs outside the snapshot', () => {
    expectContractError(() => prepareMcpMaterialRepairMutation({
      targets: new Set(['character_updates']),
      payload: { character_updates: [
        { name: '林砚', goal: '找到记录' },
        { name: '林砚', current_state: { location: '灰塔' } },
      ] },
      existing: { characterNames: new Set(['林砚']), settingKeys: new Set() },
    }), 'MATERIAL_REPAIR_DUPLICATE')

    expectContractError(() => prepareMcpMaterialRepairMutation({
      targets: new Set(['character_updates']),
      payload: { character_updates: [{ name: '不存在的角色', current_state: { location: '灰塔' } }] },
      existing: { characterNames: new Set(['林砚']), settingKeys: new Set() },
    }), 'MATERIAL_REPAIR_REFERENCE_INVALID')

    const existing = materialRepairExistingIdentity({
      characters: [{ id: 2, name: '林砚' }],
      settings: [{ id: 5, entity_type: 'location', name: '灰塔' }],
    })
    for (const usage of [
      { entity_id: 999, usage_type: 'required' },
      { entity_name: '不存在的规则', entity_type: 'rule', usage_type: 'required' },
    ]) {
      expectContractError(() => prepareMcpMaterialRepairMutation({
        targets: new Set(['chapter_setting_usage']),
        payload: { chapter_setting_usage: [usage] },
        existing,
      }), 'MATERIAL_REPAIR_REFERENCE_INVALID')
    }
  })

  test('rejects ambiguous duplicate usage references and oversized output', () => {
    const existing = materialRepairExistingIdentity({
      characters: [],
      settings: [{ id: 5, entity_type: 'location', name: '灰塔' }],
    })
    expectContractError(() => prepareMcpMaterialRepairMutation({
      targets: new Set(['chapter_setting_usage']),
      payload: { chapter_setting_usage: [
        { entity_id: 5, required: true },
        { entity_name: '灰塔', entity_type: 'location', forbidden: true },
      ] },
      existing,
    }), 'MATERIAL_REPAIR_DUPLICATE')

    expectContractError(() => prepareMcpMaterialRepairMutation({
      targets: new Set(['worldbuilding']),
      payload: { worldbuilding: [{ world_summary: '超'.repeat(200000) }] },
      existing: { characterNames: new Set(), settingKeys: new Set() },
    }), 'MATERIAL_REPAIR_LIMIT_EXCEEDED')
  })

  test('requires meaningful content instead of identity-only or empty sections', () => {
    for (const [target, payload] of [
      ['chapter_patch', { chapter_patch: { title: '   ', raw_payload: { must_advance: [] } } }],
      ['worldbuilding', { worldbuilding: [{ world_summary: '', rules: [] }] }],
      ['characters', { characters: [{ name: '只有名字' }] }],
      ['character_updates', { character_updates: [{ name: '林砚', goal: '' }] }],
      ['settings', { settings: [{ entity_type: 'rule', name: '只有名字' }] }],
      ['chapter_setting_usage', { chapter_setting_usage: [{ entity_id: 5 }] }],
    ] as const) {
      expectContractError(() => prepareMcpMaterialRepairMutation({
        targets: new Set([target]),
        payload,
        existing: {
          characterNames: new Set(['林砚']),
          settingKeys: new Set(['location\u0000灰塔']),
          settingIds: new Set([5]),
          settingKeysById: new Map([[5, 'location\u0000灰塔']]),
        },
      }), 'MATERIAL_REPAIR_INCOMPLETE')
    }
  })
})
