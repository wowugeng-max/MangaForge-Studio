import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  commitNovelChapterAcceptance,
  createNovelChapter,
  createNovelCharacter,
  createNovelProject,
  listNovelCharacters,
} from '../../novel'
import { normalizeChapterRecord } from '../../novel/normalize'
import { validateMcpStageResponse } from '../generation-source/stage-response-contract'
import { buildSourceReadinessPreflightChecks } from '../quality/state-tracking-contracts-readiness'
import {
  buildMaterialRepairTask,
  materialRepairExistingSnapshot,
  prepareMcpMaterialRepairMutation as prepareMcpMaterialRepairMutationContract,
  resolveMaterialRepairPlan,
  resolveMaterialRepairTargets,
  type ExistingMaterialSnapshot,
  type ResolvedMaterialRepairPlan,
  type MaterialRepairTarget,
} from './material-repair-contract'

const TEST_CONFIRMATION_TIMESTAMP = '2026-08-07T09:30:00.000Z'

function prepareMcpMaterialRepairMutation(
  input: Omit<Parameters<typeof prepareMcpMaterialRepairMutationContract>[0], 'confirmationTimestamp'> & {
    confirmationTimestamp?: string
  },
) {
  return prepareMcpMaterialRepairMutationContract({
    ...input,
    confirmationTimestamp: input.confirmationTimestamp ?? TEST_CONFIRMATION_TIMESTAMP,
  })
}

function expectContractError(action: () => unknown, code: string) {
  try {
    action()
    throw new Error(`expected ${code}`)
  } catch (error: any) {
    expect(error).toMatchObject({ code, error_code: code })
  }
}

const CHECK_BY_TARGET: Record<MaterialRepairTarget, string> = {
  chapter_patch: 'chapter_blueprint',
  worldbuilding: 'worldbuilding',
  characters: 'characters',
  character_updates: 'character_state',
  settings: 'setting_workshop',
  chapter_setting_usage: 'chapter_setting_usage',
}

function requestForTargets(targets: Iterable<MaterialRepairTarget>): ResolvedMaterialRepairPlan {
  const keys = [...targets].map(target => CHECK_BY_TARGET[target])
  return resolveMaterialRepairPlan({
    preflight: {
      checks: keys.map(key => ({ key, ok: false, severity: 'high', fix: `repair ${key}` })),
    },
  }, keys)
}

function completeChapterBlueprint(overrides: Record<string, unknown> = {}) {
  return {
    target_emotion: '紧张追查',
    opening_hook: '塔钟倒转，旧档案柜自行弹开。',
    core_payoff: '确认倒转会抹去一条登记。',
    content_outline: {
      cause: '塔钟倒转',
      development: '核对旧登记',
      turn: '时间戳提前',
      climax: '规则阻止取走档案',
      ending: '新登记浮现',
    },
    plot_lines: {
      mainline: '追查灰塔倒转规律',
      logic_line: '塔钟倒转 -> 登记消失 -> 新时间戳浮现',
    },
    character_order: ['林砚', '许昼'],
    beat_sequence: ['进入底层', '核对登记', '发现新时间戳'],
    cost_and_reward: '代价：暴露位置；收益：确认规则。',
    ending_contract: { next_chapter_pull: '新时间戳指向封闭楼层。' },
    ...overrides,
  }
}

function existingSnapshot(overrides: Partial<ExistingMaterialSnapshot> = {}): ExistingMaterialSnapshot {
  return {
    characterNames: new Set(),
    settingKeys: new Set(),
    project: {},
    chapter: { id: 1, project_id: 1, chapter_no: 1, title: '第一章', raw_payload: {} },
    contextPackage: {},
    chapters: [],
    worldbuilding: [],
    characters: [],
    sceneCards: [],
    referencePreview: {},
    reviews: [],
    settings: [],
    chapterSettingUsage: [],
    ...overrides,
  }
}

function sourceReadinessRepairFixture() {
  const existingStateTrackingContract = {
    source_requirements: ['追踪/上下文.md'],
    source_readiness: [{
      key: 'context_tracking',
      status: 'missing',
      evidence: '缺少本章开始时的上下文跟踪锚点。',
    }],
  }
  const contextPackage = {
    preflight: { checks: [{
      key: 'source_readiness_context_tracking', ok: false, severity: 'high', fix: '补齐上下文跟踪来源',
    }] },
    chapter_target: { state_tracking_contract: existingStateTrackingContract },
  }
  const readiness = [{
    key: 'context_tracking', status: 'ready',
    evidence: '追踪/上下文.md：上一章在灰塔底层结束，林砚仍持有异常档案。',
  }]
  const canonicalPayload = {
    chapter_patch: { raw_payload: { pre_draft_brief: {
      state_tracking_contract: { source_readiness: readiness },
    } } },
    repair_summary: '补齐本章上下文跟踪来源。',
  }
  const existing = existingSnapshot({
    chapter: {
      id: 1, project_id: 1, chapter_no: 3, title: '第三章',
      raw_payload: { pre_draft_brief: {
        confirmed_at: null,
        state_tracking_contract: existingStateTrackingContract,
      } },
    },
    contextPackage,
  })
  return { plan: resolveMaterialRepairPlan(contextPackage), existing, readiness, canonicalPayload }
}

function materialSnapshot(input: {
  characters: Array<{ id?: number; name?: string }>
  settings: Array<{ id?: number; entity_type?: string; name?: string }>
}) {
  const snapshot = existingSnapshot()
  return materialRepairExistingSnapshot({
    ...input,
    project: snapshot.project,
    chapter: snapshot.chapter,
    contextPackage: snapshot.contextPackage,
    chapters: snapshot.chapters,
    worldbuilding: snapshot.worldbuilding,
    sceneCards: snapshot.sceneCards,
    referencePreview: snapshot.referencePreview,
    reviews: snapshot.reviews,
    chapterSettingUsage: snapshot.chapterSettingUsage,
  })
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
    const keys = [
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
    ]
    expect(resolveMaterialRepairTargets({
      preflight: { checks: keys.map(key => ({ key, ok: false })) },
    }, keys)).toEqual(new Set(['chapter_patch']))
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

  test('preserves every repairable production preflight key as a typed obligation', () => {
    const expected: Record<string, MaterialRepairTarget[]> = {
      chapter_blueprint: ['chapter_patch'],
      scene_cards: ['chapter_patch'],
      chapter_conflict: ['chapter_patch'],
      ending_hook: ['chapter_patch'],
      worldbuilding: ['worldbuilding'],
      characters: ['characters'],
      character_state: ['character_updates'],
      plot_points: ['chapter_patch'],
      no_repeat: ['chapter_patch'],
      benchmark_recall_source_paths: ['chapter_patch'],
      setting_workshop: ['settings'],
      chapter_setting_usage: ['chapter_setting_usage'],
      chapter_title_unique: ['chapter_patch'],
      source_readiness_chapter_blueprint: ['chapter_patch'],
      source_readiness_context_tracking: ['chapter_patch'],
      source_readiness_foreshadowing_tracking: ['chapter_patch'],
      source_readiness_foreshadowing_history: ['chapter_patch'],
      source_readiness_timeline_tracking: ['chapter_patch'],
      source_readiness_character_state: ['chapter_patch', 'character_updates'],
      source_readiness_world_constraints: ['chapter_patch'],
      source_readiness_scene_card_goal_obstacle_change: ['chapter_patch'],
    }
    const checks = Object.keys(expected).map((key, index) => ({
      key,
      ok: false,
      severity: index % 2 ? 'medium' : 'high',
      label: `label:${key}`,
      fix: `fix:${key}`,
      evidence: `evidence:${key}`,
      gaps: [`gap:${key}`],
    }))
    const request = resolveMaterialRepairPlan({ preflight: { checks } })

    expect(request.obligations.map(item => ({
      key: item.key,
      targets: [...item.targets],
      label: item.label,
      fix: item.fix,
      evidence: item.evidence,
      gaps: item.gaps,
    }))).toEqual(checks.map(check => ({
      key: check.key,
      targets: expected[check.key],
      label: check.label,
      fix: check.fix,
      evidence: check.evidence,
      gaps: check.gaps,
    })))
  })

  test('rejects production preflight keys that this mutation cannot safely repair', () => {
    for (const key of [
      'previous_continuity',
      'source_readiness_previous_chapter',
      'source_readiness_serial_story_state',
      'source_readiness_delivery_risk_carry_over',
      'reference_knowledge',
      'copy_safety_policy',
      'benchmark_recall_gate',
      'benchmark_recall_gaps',
      'source_readiness_custom_remote_memory',
    ]) {
      expectContractError(() => resolveMaterialRepairPlan({
        preflight: { checks: [{ key, ok: false, fix: `cannot repair ${key}` }] },
      }), 'MATERIAL_REPAIR_UNREPAIRABLE')
    }
  })

  test('rejects unknown explicit repair keys instead of silently returning no target', () => {
    expectContractError(() => resolveMaterialRepairPlan({ preflight: { checks: [] } }, ['future_unknown_key']), 'MATERIAL_REPAIR_KEY_UNSUPPORTED')
    expectContractError(() => resolveMaterialRepairTargets({ preflight: { checks: [] } }, ['future_unknown_key']), 'MATERIAL_REPAIR_KEY_UNSUPPORTED')
  })

  test('rejects explicit known keys unless they are currently failed server preflight checks', () => {
    expectContractError(() => resolveMaterialRepairPlan({
      preflight: { checks: [{ key: 'ending_hook', ok: true }] },
    }, ['ending_hook']), 'MATERIAL_REPAIR_KEY_NOT_FAILED')
    expectContractError(() => resolveMaterialRepairPlan({
      preflight: { checks: [{ key: 'ending_hook', ok: false }] },
    }, ['chapter_conflict']), 'MATERIAL_REPAIR_KEY_NOT_FAILED')
  })

  test('classifies every repairable standard source-readiness row emitted by production', () => {
    for (const rowKey of ['foreshadowing_history', 'world_constraints']) {
      const contextPackage = {
        chapter_target: {
          state_tracking_contract: {
            source_readiness: [{ key: rowKey, status: 'missing', evidence: `${rowKey} 缺失` }],
          },
        },
      }
      const checks = buildSourceReadinessPreflightChecks(contextPackage)
      const key = `source_readiness_${rowKey}`
      expect(checks.map(item => item.key)).toContain(key)
      expect(resolveMaterialRepairPlan({ preflight: { checks } }).obligations.map(item => item.key)).toContain(key)
    }

    const deliveryRiskContext = {
      chapter_target: {
        state_tracking_contract: {
          source_readiness: [{ key: 'delivery_risk_carry_over', status: 'missing', evidence: '缺少上章交付风险承接' }],
        },
      },
    }
    const deliveryRiskChecks = buildSourceReadinessPreflightChecks(deliveryRiskContext)
    expect(deliveryRiskChecks.map(item => item.key)).toContain('source_readiness_delivery_risk_carry_over')
    expectContractError(() => resolveMaterialRepairPlan({
      preflight: { checks: deliveryRiskChecks },
    }), 'MATERIAL_REPAIR_UNREPAIRABLE')
  })
})

describe('material repair prompt contract', () => {
  test('builds a bounded self-contained authority prompt with an exact JSON envelope', () => {
    const task = buildMaterialRepairTask({
      plan: resolveMaterialRepairPlan({ preflight: { checks: [
        { key: 'ending_hook', ok: false, severity: 'high', label: '章末钩子', fix: '补齐章末钩子', evidence: '当前为空' },
        { key: 'character_state', ok: false, severity: 'medium', label: '角色状态', fix: '补齐林砚位置', evidence: '未读到 current_state' },
        { key: 'setting_workshop', ok: false, severity: 'medium', label: '设定工坊', fix: '补齐设定', evidence: '设定为空' },
      ] } }),
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
        chapter_target: {
          goal: '计算后的章节目标哨兵',
          chapter_blueprint: { target_emotion: '窒息感哨兵' },
          scene_cards: [{ scene_no: 1, goal: '抵达底层', obstacle: '塔门锁死', change: '发现暗门' }],
          state_tracking_contract: { source_readiness: [{ key: 'character_state', status: 'missing' }] },
          benchmark_recall_brief: { selected_emotion_module: '高压倒计时' },
        },
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
      projectSettingUsage: [{ chapter_id: 2, entity_id: 5, usage_type: 'allowed', expected_state_change: { clock: 'reverse' } }],
      identity: {
        project_identity_hash: 'sha256:project-authority-sentinel',
        chapter_identity_hash: 'sha256:chapter-authority-sentinel',
        source_identity_hash: 'sha256:source-authority-sentinel',
        context_identity_hash: 'sha256:context-authority-sentinel',
      },
    })
    const outputContractMatch = task.match(/【输出合同】\n([\s\S]*?)\n只输出一个 JSON 对象。/)
    expect(outputContractMatch).not.toBeNull()
    const outputContract = JSON.parse(outputContractMatch?.[1] || '{}')
    const chapterBlueprintContract = outputContract.chapter_patch.raw_payload.chapter_blueprint

    expect(task.length).toBeLessThanOrEqual(180000)
    expect(task).toContain('一次性补齐本章写作前置材料')
    expect(task).toContain('只输出 JSON，不生成正文')
    expect(task).toContain('MangaForge 本次请求中的项目材料是权威上下文')
    expect(task).toContain('不得用远端历史覆盖')
    expect(task).toContain('chapter_patch')
    expect(task).toContain('character_updates')
    expect(task).toContain('chapter_setting_usage')
    expect(task).toContain('source_readiness 必须是 JSON 对象数组；数组元素不得是字符串化 JSON。')
    expect(task).toContain('repair_summary')
    expect(JSON.stringify(outputContract)).not.toContain('benchmark_recall_gaps')
    expect(chapterBlueprintContract).toEqual({
      target_emotion: 'non-empty string',
      opening_hook: 'non-empty string',
      core_payoff: 'non-empty string',
      content_outline: {
        cause: 'non-empty string',
        development: 'non-empty string',
        turn: 'non-empty string',
        climax: 'non-empty string',
        ending: 'non-empty string',
      },
      plot_lines: {
        mainline: 'non-empty string',
        logic_line: 'non-empty string',
      },
      character_order: ['character name'],
      beat_sequence: ['beat with function tag'],
      cost_and_reward: 'non-empty string',
      ending_contract: { next_chapter_pull: 'non-empty string' },
    })
    const serializedChapterBlueprintContract = JSON.stringify(chapterBlueprintContract)
    for (const alias of [
      'five_part_summary', 'multi_line_progression', 'character_appearance_order',
      'event_function_tags', 'cost_benefit', 'unknowns',
    ]) {
      expect(serializedChapterBlueprintContract).not.toContain(`"${alias}"`)
    }
    expect(task).toContain('chapter_blueprint 返回时必须使用输出合同中的标准 snake_case 字段；five_part_summary、multi_line_progression、character_appearance_order、event_function_tags、cost_benefit 和根级 unknowns 均不能替代标准字段。')
    expect(task).toContain('chapter_blueprint 仅在原始缺失项包含 chapter_blueprint 或 source_readiness_chapter_blueprint 时返回；其他 chapter_patch 修复必须省略该字段。')
    expect(task).toContain('灰塔回声')
    expect(task).toContain('每章推进一个可验证谜面')
    expect(task).toContain('补齐林砚位置')
    expect(task).toContain('active_locations')
    expect(task).toContain('塔钟逆转')
    expect(task).toContain('project_setting_usage')
    expect(task).toContain('clock')
    expect(task).toContain('sha256:project-authority-sentinel')
    expect(task).toContain('sha256:chapter-authority-sentinel')
    expect(task).toContain('sha256:source-authority-sentinel')
    expect(task).toContain('sha256:context-authority-sentinel')
    expect(task).toContain('ending_hook')
    expect(task).toContain('当前为空')
    expect(task).toContain('计算后的章节目标哨兵')
    expect(task).toContain('窒息感哨兵')
    expect(task).toContain('发现暗门')
    expect(task).toContain('高压倒计时')
    expect(task).not.toContain('不得进入材料提示词的正文')
    expect(task).not.toContain('历史正文不应整段进入提示词')
    expect(task).not.toContain('摘要1')
    expect(task).toContain('摘要8')
  })

  test('bounds oversized nested context while retaining the output rules at the tail', () => {
    const huge = '资料'.repeat(200000)
    const task = buildMaterialRepairTask({
      plan: requestForTargets(new Set(['worldbuilding'])),
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
      projectSettingUsage: Array.from({ length: 100 }, (_, index) => ({ chapter_id: index + 1, entity_id: index + 1, expected_state_change: { notes: huge } })),
      identity: {
        project_identity_hash: `sha256:${'a'.repeat(64)}`,
        chapter_identity_hash: `sha256:${'b'.repeat(64)}`,
        source_identity_hash: `sha256:${'c'.repeat(64)}`,
        context_identity_hash: `sha256:${'d'.repeat(64)}`,
      },
    })

    expect(task.length).toBeLessThanOrEqual(180000)
    expect(task).toContain('有界项目')
    expect(task).toContain('仅返回必须补齐的分区')
    expect(task).toContain('不得输出 Markdown 代码围栏或解释文字')
  })

  test('does not request a character update when a new character can satisfy character-state readiness', () => {
    const contextPackage = {
      preflight: { checks: [
        { key: 'characters', ok: false },
        { key: 'source_readiness_character_state', ok: false },
      ] },
    }
    const task = buildMaterialRepairTask({
      plan: resolveMaterialRepairPlan(contextPackage),
      project: { title: '空角色项目' },
      chapter: { chapter_no: 1, title: '第一章', raw_payload: {} },
      contextPackage,
      chapters: [],
      worldbuilding: [],
      characters: [],
      outlines: [],
      reviews: [],
      settings: [],
      chapterSettingUsage: [],
      projectSettingUsage: [],
      identity: {
        project_identity_hash: 'sha256:project',
        chapter_identity_hash: 'sha256:chapter',
        source_identity_hash: 'sha256:source',
        context_identity_hash: 'sha256:context',
      },
    })

    expect(task).toContain('必须补齐的分区：["chapter_patch","characters"]')
    expect(task).not.toContain('必须补齐的分区：["chapter_patch","characters","character_updates"]')
  })

  test('requires all provider-neutral authority identity hashes', () => {
    expectContractError(() => buildMaterialRepairTask({
      plan: requestForTargets(new Set(['worldbuilding'])),
      project: { title: '缺少权威身份' },
      chapter: { chapter_no: 1 },
      contextPackage: {},
      chapters: [],
      worldbuilding: [],
      characters: [],
      outlines: [],
      reviews: [],
      settings: [],
      chapterSettingUsage: [],
      projectSettingUsage: [],
      identity: {
        project_identity_hash: 'sha256:project',
        chapter_identity_hash: 'sha256:chapter',
        source_identity_hash: '',
        context_identity_hash: 'sha256:context',
      },
    }), 'MATERIAL_REPAIR_IDENTITY_REQUIRED')
  })

  test('keeps the provider-neutral implementation free of an adapter brand identifier', () => {
    const source = readFileSync(new URL('./material-repair-contract.ts', import.meta.url), 'utf8')
    expect(source.toLowerCase()).not.toContain(['bu', 'da'].join(''))
  })
})

describe('material repair mutation preparation', () => {
  test('recovers canonical source readiness JSON object strings without mutating the input', () => {
    const { plan, existing, readiness, canonicalPayload } = sourceReadinessRepairFixture()
    const stringPayload = structuredClone(canonicalPayload)
    stringPayload.chapter_patch.raw_payload.pre_draft_brief.state_tracking_contract.source_readiness = readiness.map(JSON.stringify)
    const stageOutput = validateMcpStageResponse('material_repair', 'material_repair_json', {
      content: JSON.stringify(stringPayload),
    }).output
    const originalStageOutput = structuredClone(stageOutput)
    const originalCanonicalPayload = structuredClone(canonicalPayload)
    const chapterPatch = stageOutput.chapter_patch
    const rawPayload = chapterPatch.raw_payload
    const preDraftBrief = rawPayload.pre_draft_brief
    const stateTrackingContract = preDraftBrief.state_tracking_contract
    const sourceReadiness = stateTrackingContract.source_readiness

    const recovered = prepareMcpMaterialRepairMutation({ plan, payload: stageOutput, existing })
    const canonical = prepareMcpMaterialRepairMutation({ plan, payload: canonicalPayload, existing })

    expect(recovered).toEqual(canonical)
    expect(recovered.acceptance.chapter_patch.raw_payload.pre_draft_brief.state_tracking_contract.source_readiness).toEqual(readiness)
    expect(stageOutput).toEqual(originalStageOutput)
    expect(stageOutput.chapter_patch).toBe(chapterPatch)
    expect(stageOutput.chapter_patch.raw_payload).toBe(rawPayload)
    expect(stageOutput.chapter_patch.raw_payload.pre_draft_brief).toBe(preDraftBrief)
    expect(stageOutput.chapter_patch.raw_payload.pre_draft_brief.state_tracking_contract).toBe(stateTrackingContract)
    expect(stageOutput.chapter_patch.raw_payload.pre_draft_brief.state_tracking_contract.source_readiness).toBe(sourceReadiness)
    expect(canonicalPayload).toEqual(originalCanonicalPayload)
    expect(canonicalPayload.chapter_patch.raw_payload.pre_draft_brief.state_tracking_contract.source_readiness).toBe(readiness)
  })

  test('rejects invalid canonical source readiness string row shapes with a typed error', () => {
    const { plan, existing, readiness, canonicalPayload } = sourceReadinessRepairFixture()
    const invalidRows = [
      ['{'],
      ['   '],
      [JSON.stringify([])],
      [JSON.stringify(null)],
      [JSON.stringify('context_tracking')],
      [JSON.stringify(1)],
      [JSON.stringify(true)],
      [readiness[0], JSON.stringify(readiness[0])],
      [readiness[0], 7],
    ]

    for (const sourceReadiness of invalidRows) {
      const payload = structuredClone(canonicalPayload) as any
      payload.chapter_patch.raw_payload.pre_draft_brief.state_tracking_contract.source_readiness = sourceReadiness
      expectContractError(() => prepareMcpMaterialRepairMutation({ plan, payload, existing }), 'MATERIAL_REPAIR_INVALID')
    }
  })

  test('rejects a non-array canonical source readiness value', () => {
    const { plan, existing, canonicalPayload } = sourceReadinessRepairFixture()
    const payload = structuredClone(canonicalPayload) as any
    payload.chapter_patch.raw_payload.pre_draft_brief.state_tracking_contract.source_readiness = { key: 'context_tracking' }

    expectContractError(() => prepareMcpMaterialRepairMutation({ plan, payload, existing }), 'MATERIAL_REPAIR_INVALID')
  })

  test('rejects forbidden keys recovered from canonical source readiness JSON rows', () => {
    const { plan, existing, readiness, canonicalPayload } = sourceReadinessRepairFixture()
    const payload = structuredClone(canonicalPayload) as any
    payload.chapter_patch.raw_payload.pre_draft_brief.state_tracking_contract.source_readiness = [JSON.stringify({
      ...readiness[0], session_id: 'remote-controlled-session',
    })]

    expectContractError(() => prepareMcpMaterialRepairMutation({ plan, payload, existing }), 'MATERIAL_REPAIR_FORBIDDEN_FIELD')
  })

  test('keeps an empty canonical source readiness array for the existing obligation check', () => {
    const { plan, existing, canonicalPayload } = sourceReadinessRepairFixture()
    const payload = structuredClone(canonicalPayload) as any
    payload.chapter_patch.chapter_goal = '抵达灰塔底层并核对异常档案。'
    payload.chapter_patch.raw_payload.pre_draft_brief.state_tracking_contract.source_readiness = []

    expectContractError(() => prepareMcpMaterialRepairMutation({ plan, payload, existing }), 'MATERIAL_REPAIR_OBLIGATION_UNMET')
  })

  test('does not recover source readiness strings outside the exact canonical path', () => {
    const { plan, existing, readiness, canonicalPayload } = sourceReadinessRepairFixture()
    const row = JSON.stringify(readiness[0])
    const payloads = [
      {
        payload: {
          ...canonicalPayload,
          chapter_patch: {
            ...canonicalPayload.chapter_patch,
            raw_payload: { source_readiness: [row] },
          },
        },
        code: 'MATERIAL_REPAIR_INVALID',
      },
      {
        payload: {
          ...canonicalPayload,
          chapter_patch: {
            ...canonicalPayload.chapter_patch,
            raw_payload: { preDraftBrief: { state_tracking_contract: { source_readiness: [row] } } },
          },
        },
        code: 'MATERIAL_REPAIR_OBLIGATION_UNMET',
      },
      {
        payload: {
          ...canonicalPayload,
          chapter_patch: {
            ...canonicalPayload.chapter_patch,
            raw_payload: { pre_draft_brief: { stateTrackingContract: { source_readiness: [row] } } },
          },
        },
        code: 'MATERIAL_REPAIR_OBLIGATION_UNMET',
      },
      {
        payload: {
          ...canonicalPayload,
          chapter_patch: {
            ...canonicalPayload.chapter_patch,
            raw_payload: { pre_draft_brief: { state_tracking_contract: { sourceReadiness: [row] } } },
          },
        },
        code: 'MATERIAL_REPAIR_OBLIGATION_UNMET',
      },
    ]

    for (const { payload, code } of payloads) {
      expectContractError(() => prepareMcpMaterialRepairMutation({ plan, payload, existing }), code)
    }
  })

  test('rejects non-plain canonical source readiness rows', () => {
    const { plan, existing, readiness, canonicalPayload } = sourceReadinessRepairFixture()
    const payload = structuredClone(canonicalPayload) as any
    payload.chapter_patch.raw_payload.pre_draft_brief.state_tracking_contract.source_readiness = [
      Object.assign(Object.create({ inherited: true }), readiness[0]),
    ]

    expectContractError(() => prepareMcpMaterialRepairMutation({ plan, payload, existing }), 'MATERIAL_REPAIR_INVALID')
  })

  test('preserves forbidden raw payload field precedence over malformed source readiness JSON rows', () => {
    const { plan, existing, canonicalPayload } = sourceReadinessRepairFixture()
    const invalidPayload = {
      ...canonicalPayload,
      chapter_patch: {
        ...canonicalPayload.chapter_patch,
        raw_payload: {
          ...canonicalPayload.chapter_patch.raw_payload,
          unknown_material_field: true,
          pre_draft_brief: {
            ...canonicalPayload.chapter_patch.raw_payload.pre_draft_brief,
            state_tracking_contract: {
              ...canonicalPayload.chapter_patch.raw_payload.pre_draft_brief.state_tracking_contract,
              source_readiness: ['{'],
            },
          },
        },
      },
    }

    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan,
      payload: invalidPayload,
      existing,
    }), 'MATERIAL_REPAIR_FORBIDDEN_FIELD')
  })

  test('lifts exact material root sections nested under the sole chapter patch after root closure recovery', () => {
    const plan = resolveMaterialRepairPlan({
      preflight: { checks: [
        { key: 'ending_hook', ok: false, severity: 'high', fix: '补齐章末钩子' },
        { key: 'worldbuilding', ok: false, severity: 'high', fix: '补齐世界规则' },
        { key: 'characters', ok: false, severity: 'high', fix: '补齐角色卡' },
        { key: 'setting_workshop', ok: false, severity: 'high', fix: '补齐设定实体' },
        { key: 'chapter_setting_usage', ok: false, severity: 'high', fix: '补齐章节设定调用' },
      ] },
    }, [
      'ending_hook', 'worldbuilding', 'characters', 'setting_workshop', 'chapter_setting_usage',
    ])
    const canonicalPayload = {
      chapter_patch: { ending_hook: '倒计时归零后，档案上的字迹变成林砚自己的笔迹。' },
      worldbuilding: [{ world_summary: '零点会出现一页来自未来的死亡记录。', rules: ['记录只能在天亮前改写一次。'] }],
      characters: [{ name: '林砚', role_type: '主角', motivation: '查明失忆与零点档案的关系。', current_state: { location: '市档案馆地下档案室' } }],
      character_updates: [],
      settings: [{ entity_type: 'item', name: '异常档案文件', summary: '一份会显示未来死亡记录的纸质档案。' }],
      chapter_setting_usage: [{ entity_name: '异常档案文件', entity_type: 'item', usage_type: 'required', required: true }],
      repair_summary: '补齐第一章开写前的世界、角色、设定和调用材料。',
    }
    const misnestedPayload = {
      chapter_patch: {
        ...canonicalPayload.chapter_patch,
        worldbuilding: canonicalPayload.worldbuilding,
        characters: canonicalPayload.characters,
        character_updates: canonicalPayload.character_updates,
        settings: canonicalPayload.settings,
        chapter_setting_usage: canonicalPayload.chapter_setting_usage,
        repair_summary: canonicalPayload.repair_summary,
      },
    }
    const missingRootClosure = JSON.stringify(misnestedPayload).slice(0, -1)
    const stageOutput = validateMcpStageResponse('material_repair', 'material_repair_json', { content: missingRootClosure }).output
    const originalStageOutput = structuredClone(stageOutput)
    const existing = existingSnapshot({ characterNames: new Set(), settingKeys: new Set() })
    const recovered = prepareMcpMaterialRepairMutation({ plan, payload: stageOutput, existing })
    const canonical = prepareMcpMaterialRepairMutation({ plan, payload: canonicalPayload, existing })
    expect(recovered).toEqual(canonical)
    expect(stageOutput).toEqual(originalStageOutput)
  })

  test('lifts a requested existing character update nested under the sole chapter patch after root closure recovery', () => {
    const plan = resolveMaterialRepairPlan({
      preflight: { checks: [
        { key: 'ending_hook', ok: false, severity: 'high', fix: '补齐章末钩子' },
        { key: 'character_state', ok: false, severity: 'high', fix: '补齐已有角色状态' },
      ] },
    }, ['ending_hook', 'character_state'])
    const canonicalPayload = {
      chapter_patch: { ending_hook: '倒计时归零后，档案上的字迹变成林砚自己的笔迹。' },
      character_updates: [{
        name: '林砚',
        current_state: { location: '市档案馆地下档案室' },
      }],
      repair_summary: '补齐章末钩子与已有角色状态。',
    }
    const misnestedPayload = {
      chapter_patch: {
        ...canonicalPayload.chapter_patch,
        character_updates: canonicalPayload.character_updates,
        repair_summary: canonicalPayload.repair_summary,
      },
    }
    const missingRootClosure = JSON.stringify(misnestedPayload).slice(0, -1)
    const stageOutput = validateMcpStageResponse('material_repair', 'material_repair_json', { content: missingRootClosure }).output
    const originalStageOutput = structuredClone(stageOutput)
    const existing = existingSnapshot({
      characterNames: new Set(['林砚']),
      settingKeys: new Set(),
      characters: [{
        id: 1,
        name: '林砚',
        goal: '查明失忆与零点档案的关系。',
        current_state: {},
      }],
    })
    const recovered = prepareMcpMaterialRepairMutation({ plan, payload: stageOutput, existing })
    const canonical = prepareMcpMaterialRepairMutation({ plan, payload: canonicalPayload, existing })
    expect(recovered).toEqual(canonical)
    expect(recovered.acceptance.character_updates).toEqual([{
      name: '林砚',
      patch: { current_state: { location: '市档案馆地下档案室' } },
    }])
    expect(stageOutput).toEqual(originalStageOutput)
  })

  test('does not lift partial, unknown, wrong-type, or empty material section shapes', () => {
    const plan = resolveMaterialRepairPlan({
      preflight: { checks: [
        { key: 'ending_hook', ok: false, severity: 'high', fix: '补齐章末钩子' },
        { key: 'worldbuilding', ok: false, severity: 'high', fix: '补齐世界规则' },
      ] },
    }, ['ending_hook', 'worldbuilding'])
    const existing = existingSnapshot({
      characterNames: new Set(),
      settingKeys: new Set(),
    })
    const worldbuilding = [{ world_summary: '零点档案会显示未来死亡记录。' }]

    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan,
      payload: {
        chapter_patch: {
          ending_hook: '字迹变成林砚自己的笔迹。',
          worldbuilding,
        },
        repair_summary: '根级摘要与误嵌套分区混用。',
      },
      existing,
    }), 'MATERIAL_REPAIR_FORBIDDEN_FIELD')

    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan,
      payload: {
        chapter_patch: {
          ending_hook: '字迹变成林砚自己的笔迹。',
          worldbuilding,
          mystery_section: [],
        },
      },
      existing,
    }), 'MATERIAL_REPAIR_FORBIDDEN_FIELD')

    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan,
      payload: {
        chapter_patch: {
          ending_hook: '字迹变成林砚自己的笔迹。',
          worldbuilding: '不是数组',
        },
      },
      existing,
    }), 'MATERIAL_REPAIR_INVALID')

    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan,
      payload: { chapter_patch: { worldbuilding } },
      existing,
    }), 'MATERIAL_REPAIR_INCOMPLETE')
  })

  test('preserves a __proto__ unknown field for downstream forbidden-field rejection', () => {
    const plan = resolveMaterialRepairPlan({
      preflight: { checks: [
        { key: 'ending_hook', ok: false, severity: 'high', fix: '补齐章末钩子' },
        { key: 'worldbuilding', ok: false, severity: 'high', fix: '补齐世界规则' },
      ] },
    }, ['ending_hook', 'worldbuilding'])
    const payload = JSON.parse(JSON.stringify({
      chapter_patch: {
        ending_hook: '字迹变成林砚自己的笔迹。',
        worldbuilding: [{ world_summary: '零点档案会显示未来死亡记录。' }],
      },
    }).replace('"worldbuilding"', '"__proto__":null,"worldbuilding"'))

    expect(Object.prototype.hasOwnProperty.call(payload.chapter_patch, '__proto__')).toBe(true)
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan,
      payload,
      existing: existingSnapshot({ characterNames: new Set(), settingKeys: new Set() }),
    }), 'MATERIAL_REPAIR_FORBIDDEN_FIELD')
  })

  test('rejects wrong-type character updates lifted for an empty character project', () => {
    const plan = resolveMaterialRepairPlan({
      preflight: { checks: [
        { key: 'ending_hook', ok: false, severity: 'high', fix: '补齐章末钩子' },
        { key: 'characters', ok: false, severity: 'high', fix: '补齐角色卡' },
      ] },
    }, ['ending_hook', 'characters'])

    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan,
      payload: {
        chapter_patch: {
          ending_hook: '字迹变成林砚自己的笔迹。',
          characters: [{
            name: '林砚',
            role_type: '主角',
            motivation: '查明失忆与零点档案的关系。',
            current_state: { location: '市档案馆地下档案室' },
          }],
          character_updates: '不是数组',
        },
      },
      existing: existingSnapshot({ characterNames: new Set(), settingKeys: new Set() }),
    }), 'MATERIAL_REPAIR_INVALID')
  })

  test('rejects chapter changes that do not satisfy the exact missing obligation', () => {
    const endingRequest = resolveMaterialRepairPlan({
      preflight: { checks: [{ key: 'ending_hook', ok: false, fix: '补齐章末钩子' }] },
    })
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: endingRequest,
      payload: { chapter_patch: { title: '只改了标题' } },
      existing: existingSnapshot({ characterNames: new Set(), settingKeys: new Set() }),
    }), 'MATERIAL_REPAIR_OBLIGATION_UNMET')

    const blueprintRequest = resolveMaterialRepairPlan({
      preflight: { checks: [{ key: 'chapter_blueprint', ok: false, fix: '补齐蓝图' }] },
    })
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: blueprintRequest,
      payload: { chapter_patch: { title: '仍然只改标题' } },
      existing: existingSnapshot({ characterNames: new Set(), settingKeys: new Set() }),
    }), 'MATERIAL_REPAIR_OBLIGATION_UNMET')

    const stateRequest = resolveMaterialRepairPlan({
      preflight: { checks: [{ key: 'character_state', ok: false, fix: '补齐角色 current_state' }] },
    })
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: stateRequest,
      payload: { character_updates: [{ name: '林砚', goal: '只修改目标' }] },
      existing: existingSnapshot({ characterNames: new Set(['林砚']), settingKeys: new Set() }),
    }), 'MATERIAL_REPAIR_OBLIGATION_UNMET')
  })

  test('rejects unrelated fields even when the requested section is otherwise satisfied', () => {
    const request = resolveMaterialRepairPlan({
      preflight: { checks: [{ key: 'ending_hook', ok: false, fix: '补齐章末钩子' }] },
    })
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: request,
      payload: { chapter_patch: { ending_hook: '灰塔开始倒转。', title: '返回了无关标题' } },
      existing: existingSnapshot({ characterNames: new Set(), settingKeys: new Set() }),
    }), 'MATERIAL_REPAIR_UNRELATED_MUTATION')
  })

  test('accepts source readiness only from the persisted pre-draft tracking path', () => {
    const contextPackage = {
      preflight: { checks: [{ key: 'source_readiness_context_tracking', ok: false, fix: '补齐上下文跟踪来源' }] },
      chapter_target: {
        state_tracking_contract: {
          source_requirements: ['追踪/上下文.md'],
          source_readiness: [{ key: 'context_tracking', status: 'missing', evidence: '缺追踪文件锚点' }],
        },
      },
    }
    const request = resolveMaterialRepairPlan(contextPackage)
    const readiness = [{
      key: 'context_tracking',
      status: 'ready',
      evidence: '已读取本次权威上下文摘要',
    }]

    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: request,
      payload: {
        chapter_patch: {
          raw_payload: {
            state_tracking_contract: { source_readiness: readiness },
          },
        },
      },
      existing: existingSnapshot({
        characterNames: new Set(),
        settingKeys: new Set(),
        chapter: { chapter_no: 3, raw_payload: {} },
        contextPackage,
      }),
    }), 'MATERIAL_REPAIR_OBLIGATION_UNMET')

    const prepared = prepareMcpMaterialRepairMutation({
      plan: request,
      payload: {
        chapter_patch: {
          raw_payload: {
            pre_draft_brief: {
              state_tracking_contract: { source_readiness: readiness },
            },
          },
        },
      },
      existing: existingSnapshot({
        characterNames: new Set(),
        settingKeys: new Set(),
        chapter: { chapter_no: 3, raw_payload: {} },
        contextPackage,
      }),
    })

    expect(prepared.acceptance.chapter_patch).toMatchObject({
      raw_payload: {
        pre_draft_brief: {
          state_tracking_contract: { source_readiness: readiness },
        },
      },
    })
  })

  test('locally confirms a new pre-draft repair so production reconstruction can consume it', () => {
    const stateTrackingContract = {
      source_requirements: ['追踪/上下文.md'],
      source_readiness: [{ key: 'context_tracking', status: 'missing', evidence: '缺追踪文件锚点' }],
    }
    const contextPackage = {
      preflight: { checks: [{ key: 'source_readiness_context_tracking', ok: false }] },
      chapter_target: { state_tracking_contract: stateTrackingContract },
    }
    const prepared = prepareMcpMaterialRepairMutation({
      plan: resolveMaterialRepairPlan(contextPackage),
      confirmationTimestamp: '2026-08-07T09:30:00.000Z',
      payload: {
        chapter_patch: {
          raw_payload: {
            pre_draft_brief: {
              state_tracking_contract: {
                source_readiness: [{
                  key: 'context_tracking',
                  status: 'ready',
                  evidence: '追踪/上下文.md：最后完成第2章；林砚已抵达灰塔底层。',
                }],
              },
            },
          },
        },
      },
      existing: existingSnapshot({
        chapter: {
          chapter_no: 3,
          raw_payload: {
            pre_draft_brief: {
              confirmed_at: null,
              state_tracking_contract: stateTrackingContract,
            },
          },
        },
        contextPackage,
      }),
    } as any)

    expect(prepared.acceptance.chapter_patch.raw_payload.pre_draft_brief.confirmed_at).toBe('2026-08-07T09:30:00.000Z')
    expect(prepared.acceptance.chapter_patch.raw_payload.pre_draft_brief.confirmation_source).toBe('generation_source_material_repair')
  })

  test('rejects a remote attempt to choose the trusted pre-draft confirmation metadata', () => {
    const stateTrackingContract = {
      source_requirements: ['追踪/上下文.md'],
      source_readiness: [{ key: 'context_tracking', status: 'missing', evidence: '缺追踪文件锚点' }],
    }
    const contextPackage = {
      preflight: { checks: [{ key: 'source_readiness_context_tracking', ok: false }] },
      chapter_target: { state_tracking_contract: stateTrackingContract },
    }
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: resolveMaterialRepairPlan(contextPackage),
      payload: {
        chapter_patch: {
          raw_payload: {
            pre_draft_brief: {
              confirmed_at: '2099-01-01T00:00:00.000Z',
              confirmation_source: 'remote_claim',
              state_tracking_contract: {
                source_readiness: [{
                  key: 'context_tracking',
                  status: 'ready',
                  evidence: '追踪/上下文.md：最后完成第2章；林砚已抵达灰塔底层。',
                }],
              },
            },
          },
        },
      },
      existing: existingSnapshot({
        chapter: {
          chapter_no: 3,
          raw_payload: { pre_draft_brief: { confirmed_at: null, state_tracking_contract: stateTrackingContract } },
        },
        contextPackage,
      }),
    }), 'MATERIAL_REPAIR_UNRELATED_MUTATION')
  })

  test('cannot satisfy source obligations by dropping an existing source requirement', () => {
    const stateTrackingContract = {
      source_requirements: ['追踪/上下文.md', '追踪/时间线.md'],
      source_readiness: [],
    }
    const contextPackage = {
      chapter_target: { state_tracking_contract: stateTrackingContract },
    }
    const checks = buildSourceReadinessPreflightChecks(contextPackage)
    const plan = resolveMaterialRepairPlan({ preflight: { checks } })
    const contextReady = [{
      key: 'context_tracking',
      status: 'ready',
      evidence: '追踪/上下文.md：最后完成第2章；林砚已抵达灰塔底层。',
    }]
    const existing = existingSnapshot({
      chapter: {
        chapter_no: 3,
        raw_payload: { pre_draft_brief: { confirmed_at: null, state_tracking_contract: stateTrackingContract } },
      },
      contextPackage,
    })

    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan,
      payload: {
        chapter_patch: {
          raw_payload: {
            pre_draft_brief: { state_tracking_contract: { source_readiness: contextReady } },
          },
        },
      },
      existing,
    }), 'MATERIAL_REPAIR_OBLIGATION_UNMET')

    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan,
      payload: {
        chapter_patch: {
          raw_payload: {
            pre_draft_brief: {
              state_tracking_contract: {
                source_requirements: ['追踪/上下文.md'],
                source_readiness: contextReady,
              },
            },
          },
        },
      },
      existing,
    }), 'MATERIAL_REPAIR_OBLIGATION_UNMET')

    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: resolveMaterialRepairPlan({ preflight: { checks } }, ['source_readiness_context_tracking']),
      payload: {
        chapter_patch: {
          raw_payload: {
            pre_draft_brief: {
              state_tracking_contract: {
                source_requirements: ['追踪/上下文.md'],
                source_readiness: contextReady,
              },
            },
          },
        },
      },
      existing,
    }), 'MATERIAL_REPAIR_UNRELATED_MUTATION')
  })

  test('repairs production foreshadowing and world-constraint source rows', () => {
    for (const rowKey of ['foreshadowing_tracking', 'foreshadowing_history', 'world_constraints']) {
      const stateTrackingContract = {
        source_readiness: [{ key: rowKey, status: 'missing', evidence: `${rowKey} 缺失` }],
      }
      const contextPackage = {
        chapter_target: { state_tracking_contract: stateTrackingContract },
      }
      const checks = buildSourceReadinessPreflightChecks(contextPackage)
      const prepared = prepareMcpMaterialRepairMutation({
        plan: resolveMaterialRepairPlan({ preflight: { checks } }),
        payload: {
          chapter_patch: {
            raw_payload: {
              pre_draft_brief: {
                state_tracking_contract: {
                  source_readiness: [{
                    key: rowKey,
                    status: 'ready',
                    evidence: rowKey.startsWith('foreshadowing')
                      ? '追踪/伏笔.md：第2章埋下的灰塔登记缺口将在本章推进。'
                      : '世界约束：塔钟倒转时任何登记只能被读取，不能被带离灰塔。',
                  }],
                },
              },
            },
          },
        },
        existing: existingSnapshot({
          chapter: {
            chapter_no: 3,
            raw_payload: {
              pre_draft_brief: { confirmed_at: null, state_tracking_contract: stateTrackingContract },
            },
          },
          contextPackage,
        }),
      })

      expect(prepared.acceptance.chapter_patch.raw_payload.pre_draft_brief.state_tracking_contract.source_readiness)
        .toContainEqual(expect.objectContaining({ key: rowKey, status: 'ready' }))
    }
  })

  test('uses a newly created character state when no existing character can be updated', () => {
    const stateTrackingContract = {
      source_requirements: ['追踪/角色状态.md'],
      source_readiness: [{ key: 'character_state', status: 'missing', evidence: '缺少角色状态锚点' }],
    }
    const contextPackage = {
      preflight: { checks: [
        { key: 'characters', ok: false },
        { key: 'source_readiness_character_state', ok: false },
      ] },
      chapter_target: { state_tracking_contract: stateTrackingContract },
    }
    const plan = resolveMaterialRepairPlan(contextPackage)
    const prepared = prepareMcpMaterialRepairMutation({
      plan,
      payload: {
        characters: [{
          name: '林砚',
          role_type: '主角',
          current_state: { location: '灰塔底层', goal: '查清倒转规律' },
          limits: ['不能凭空恢复失忆内容'],
        }],
        character_updates: [{
          name: '林砚',
          current_state: { location: '灰塔底层' },
        }],
        chapter_patch: {
          raw_payload: {
            pre_draft_brief: {
              state_tracking_contract: {
                source_readiness: [{
                  key: 'character_state',
                  status: 'ready',
                  evidence: '角色设定：林砚位于灰塔底层，当前目标是查清倒转规律。',
                }],
              },
            },
          },
        },
      },
      existing: existingSnapshot({
        chapter: {
          chapter_no: 3,
          raw_payload: { pre_draft_brief: { confirmed_at: null, state_tracking_contract: stateTrackingContract } },
        },
        contextPackage,
        characters: [],
        characterNames: new Set(),
      }),
    })

    expect(prepared.acceptance.character_creates).toContainEqual(expect.objectContaining({
      name: '林砚',
      current_state: { location: '灰塔底层', goal: '查清倒转规律' },
      abilities: ['限制：不能凭空恢复失忆内容'],
    }))
    expect(prepared.acceptance.character_updates).toBeUndefined()
  })

  test('still requires a character update when an existing character lacks current state', () => {
    const stateTrackingContract = {
      source_requirements: ['追踪/角色状态.md'],
      source_readiness: [{ key: 'character_state', status: 'missing', evidence: '缺少角色状态锚点' }],
    }
    const contextPackage = {
      preflight: { checks: [{ key: 'source_readiness_character_state', ok: false }] },
      chapter_target: { state_tracking_contract: stateTrackingContract },
    }
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: resolveMaterialRepairPlan(contextPackage),
      payload: {
        chapter_patch: {
          raw_payload: {
            pre_draft_brief: {
              state_tracking_contract: {
                source_readiness: [{
                  key: 'character_state',
                  status: 'ready',
                  evidence: '角色设定：林砚位于灰塔底层。',
                }],
              },
            },
          },
        },
      },
      existing: existingSnapshot({
        chapter: {
          chapter_no: 3,
          raw_payload: { pre_draft_brief: { confirmed_at: null, state_tracking_contract: stateTrackingContract } },
        },
        contextPackage,
        characters: [{ id: 2, name: '林砚', current_state: {} }],
        characterNames: new Set(['林砚']),
      }),
    }), 'MATERIAL_REPAIR_INCOMPLETE')
  })

  test('completes nested character state before the real acceptance shallow merge persists it', async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-material-repair-'))
    try {
      const project = await createNovelProject(workspace, { title: '角色状态持久化等价测试' })
      const chapter = await createNovelChapter(workspace, {
        project_id: project.id,
        chapter_no: 3,
        title: '灰塔底层',
        raw_payload: {},
      } as any)
      const character = await createNovelCharacter(workspace, {
        project_id: project.id,
        name: '林砚',
        current_state: {
          position: { floor: 1, room: 'A' },
          inventory: { key: true },
        },
      } as any)
      const stateTrackingContract = {
        source_requirements: ['追踪/角色状态.md'],
        source_readiness: [{ key: 'character_state', status: 'missing', evidence: '缺少角色状态锚点' }],
      }
      const contextPackage = {
        preflight: { checks: [{ key: 'source_readiness_character_state', ok: false }] },
        chapter_target: { state_tracking_contract: stateTrackingContract },
      }
      const prepared = prepareMcpMaterialRepairMutation({
        plan: resolveMaterialRepairPlan(contextPackage),
        payload: {
          chapter_patch: {
            raw_payload: {
              pre_draft_brief: {
                state_tracking_contract: {
                  source_readiness: [{
                    key: 'character_state',
                    status: 'ready',
                    evidence: '角色设定：林砚已从 A 房间转移到 B 房间。',
                  }],
                },
              },
            },
          },
          character_updates: [{
            name: '林砚',
            current_state: { position: { room: 'B' } },
          }],
        },
        existing: existingSnapshot({
          project,
          chapter,
          contextPackage,
          characters: [character],
          characterNames: new Set(['林砚']),
        }),
      })

      await commitNovelChapterAcceptance(workspace, {
        chapter_id: chapter.id,
        ...prepared.acceptance,
      })

      const [storedCharacter] = await listNovelCharacters(workspace, project.id)
      expect(storedCharacter.current_state).toEqual({
        position: { floor: 1, room: 'B' },
        inventory: { key: true },
      })
    } finally {
      await rm(workspace, { recursive: true, force: true })
    }
  })

  test('preserves the complete raw payload when a minimal tracking repair is normalized for persistence', () => {
    const existingChapter = normalizeChapterRecord({
      id: 12,
      project_id: 7,
      chapter_no: 3,
      title: '灰塔底层',
      raw_payload: {
        root_custom_sibling: { keep: 'root' },
        preDraftBrief: {
          camel_custom_sibling: { keep: 'camel' },
          benchmarkRecallBrief: {
            custom_nested: { camel_only: 'keep-camel' },
          },
          stateTrackingContract: {
            custom_nested: { camel_only: 'keep-camel' },
          },
          writePreparationBrief: {
            custom_nested: { camel_only: 'keep-camel' },
          },
        },
        pre_draft_brief: {
          confirmed_at: '2026-07-01T00:00:00.000Z',
          confirmation_source: 'manual_confirmation',
          chapter_blueprint: completeChapterBlueprint(),
          benchmark_recall_brief: {
            custom_nested: { snake_only: 'keep-snake' },
          },
          style_sample_strategy: { mode: 'locked', source_path: '追踪/文风样本.md' },
          custom_sibling: { keep: 'snake' },
          state_tracking_contract: {
            source_requirements: ['追踪/上下文.md', '追踪/时间线.md'],
            custom_contract_sibling: { keep: 'contract' },
            custom_nested: { snake_only: 'keep-snake' },
            source_readiness: [
              { key: 'context_tracking', status: 'missing', evidence: '缺追踪文件锚点' },
              { key: 'timeline_tracking', status: 'ready', evidence: '追踪/时间线.md：塔钟在午夜前倒转。' },
            ],
          },
          write_preparation_brief: {
            custom_nested: { snake_only: 'keep-snake' },
          },
        },
      },
    } as any)
    const contextPackage = {
      preflight: { checks: [{ key: 'source_readiness_context_tracking', ok: false }] },
      chapter_target: {
        state_tracking_contract: existingChapter.raw_payload.pre_draft_brief.state_tracking_contract,
      },
    }
    const plan = resolveMaterialRepairPlan(contextPackage)
    const prepared = prepareMcpMaterialRepairMutation({
      plan: plan,
      payload: {
        chapter_patch: {
          raw_payload: {
            pre_draft_brief: {
              state_tracking_contract: {
                source_readiness: [{
                  key: 'context_tracking',
                  status: 'ready',
                  evidence: '追踪/上下文.md：最后完成第2章；林砚已抵达灰塔底层。',
                }],
              },
            },
          },
        },
      },
      existing: existingSnapshot({
        characterNames: new Set(),
        settingKeys: new Set(),
        chapter: existingChapter,
        contextPackage,
        chapters: [existingChapter],
      }),
    })
    const normalized = normalizeChapterRecord(prepared.acceptance.chapter_patch, existingChapter)

    expect(normalized.raw_payload.root_custom_sibling).toEqual({ keep: 'root' })
    expect(normalized.raw_payload.pre_draft_brief.chapter_blueprint).toEqual(completeChapterBlueprint())
    expect(normalized.raw_payload.pre_draft_brief.confirmed_at).toBe('2026-07-01T00:00:00.000Z')
    expect(normalized.raw_payload.pre_draft_brief.confirmation_source).toBe('manual_confirmation')
    expect(normalized.raw_payload.pre_draft_brief.benchmark_recall_brief.custom_nested).toEqual({
      camel_only: 'keep-camel',
      snake_only: 'keep-snake',
    })
    expect(normalized.raw_payload.pre_draft_brief.style_sample_strategy).toEqual({ mode: 'locked', source_path: '追踪/文风样本.md' })
    expect(normalized.raw_payload.pre_draft_brief.custom_sibling).toEqual({ keep: 'snake' })
    expect(normalized.raw_payload.pre_draft_brief.state_tracking_contract.source_requirements).toEqual(['追踪/上下文.md', '追踪/时间线.md'])
    expect(normalized.raw_payload.pre_draft_brief.state_tracking_contract.source_readiness).toContainEqual({
      key: 'timeline_tracking',
      status: 'ready',
      evidence: '追踪/时间线.md：塔钟在午夜前倒转。',
    })
    expect(normalized.raw_payload.pre_draft_brief.state_tracking_contract.custom_nested).toEqual({
      camel_only: 'keep-camel',
      snake_only: 'keep-snake',
    })
    expect(normalized.raw_payload.preDraftBrief.camel_custom_sibling).toEqual({ keep: 'camel' })
    expect(normalized.raw_payload.preDraftBrief.stateTrackingContract.custom_nested).toEqual({
      camel_only: 'keep-camel',
      snake_only: 'keep-snake',
    })
    expect(normalized.raw_payload.preDraftBrief.writePreparationBrief.custom_nested).toEqual({
      camel_only: 'keep-camel',
      snake_only: 'keep-snake',
    })
    expect(buildSourceReadinessPreflightChecks({
      ...contextPackage,
      chapter_target: {
        ...contextPackage.chapter_target,
        state_tracking_contract: normalized.raw_payload.pre_draft_brief.state_tracking_contract,
      },
    }).map(item => item.key)).not.toContain('source_readiness_context_tracking')
    expect(buildSourceReadinessPreflightChecks({
      ...contextPackage,
      chapter_target: {
        ...contextPackage.chapter_target,
        state_tracking_contract: normalized.raw_payload.pre_draft_brief.state_tracking_contract,
      },
    }).map(item => item.key)).not.toContain('source_readiness_timeline_tracking')
  })

  test('deep-merges a same-key source-readiness row before acceptance normalization', () => {
    const existingChapter = normalizeChapterRecord({
      id: 12,
      project_id: 7,
      chapter_no: 3,
      title: '灰塔底层',
      raw_payload: {
        pre_draft_brief: {
          confirmed_at: '2026-07-01T00:00:00.000Z',
          state_tracking_contract: {
            source_requirements: ['追踪/上下文.md'],
            source_readiness: [{
              key: 'context_tracking',
              status: 'missing',
              evidence: '缺少上下文锚点',
              label: '上下文追踪',
              fix: '补齐最近章节锚点',
              custom: { path: '追踪/上下文.md' },
            }],
          },
        },
      },
    } as any)
    const contextPackage = {
      preflight: { checks: [{ key: 'source_readiness_context_tracking', ok: false }] },
      chapter_target: {
        state_tracking_contract: existingChapter.raw_payload.pre_draft_brief.state_tracking_contract,
      },
    }
    const prepared = prepareMcpMaterialRepairMutation({
      plan: resolveMaterialRepairPlan(contextPackage),
      payload: {
        chapter_patch: {
          raw_payload: {
            pre_draft_brief: {
              state_tracking_contract: {
                source_readiness: [{
                  key: 'context_tracking',
                  status: 'ready',
                  evidence: '追踪/上下文.md：林砚已抵达灰塔底层。',
                  custom: { scope: 'chapter' },
                }],
              },
            },
          },
        },
      },
      existing: existingSnapshot({
        chapter: existingChapter,
        contextPackage,
        chapters: [existingChapter],
      }),
    })
    const normalized = normalizeChapterRecord(prepared.acceptance.chapter_patch, existingChapter)
    const [row] = normalized.raw_payload.pre_draft_brief.state_tracking_contract.source_readiness

    expect(row).toEqual({
      key: 'context_tracking',
      status: 'ready',
      evidence: '追踪/上下文.md：林砚已抵达灰塔底层。',
      label: '上下文追踪',
      fix: '补齐最近章节锚点',
      custom: {
        path: '追踪/上下文.md',
        scope: 'chapter',
      },
    })
  })

  test('deep-merges partial blueprint and benchmark repairs without dropping existing aliases', () => {
    const existingChapter = normalizeChapterRecord({
      id: 12,
      project_id: 7,
      chapter_no: 3,
      title: '灰塔底层',
      raw_payload: {
        chapter_blueprint: {
          target_emotion: '紧张追查',
          opening_hook: '塔钟倒转。',
          custom_blueprint_sibling: { keep: true },
        },
        benchmarkRecallBrief: {
          matched_chapter: '第7章',
          camel_custom_sibling: 'keep-camel',
        },
        benchmark_recall_brief: {
          selected_emotion_module: '高压倒计时',
          gaps: ['source_paths_missing'],
          custom_benchmark_sibling: 'keep-snake',
        },
        pre_draft_brief: {
          style_sample_strategy: { mode: 'locked' },
          state_tracking_contract: {
            source_readiness: [{ key: 'chapter_blueprint', status: 'missing', evidence: '蓝图字段不完整' }],
          },
        },
      },
    } as any)
    const blueprintContext = {
      preflight: { checks: [{ key: 'source_readiness_chapter_blueprint', ok: false }] },
      chapter_target: {
        chapter_blueprint: existingChapter.raw_payload.chapter_blueprint,
        state_tracking_contract: existingChapter.raw_payload.pre_draft_brief.state_tracking_contract,
      },
    }
    const {
      target_emotion: _existingTargetEmotion,
      opening_hook: _existingOpeningHook,
      ...blueprintCompletion
    } = completeChapterBlueprint()
    const blueprintPrepared = prepareMcpMaterialRepairMutation({
      plan: resolveMaterialRepairPlan(blueprintContext),
      payload: {
        chapter_patch: {
          raw_payload: {
            chapter_blueprint: blueprintCompletion,
            pre_draft_brief: {
              state_tracking_contract: {
                source_readiness: [{ key: 'chapter_blueprint', status: 'ready', evidence: '第3章细纲：五段结构、多线推进与章尾承接已逐项核对。' }],
              },
            },
          },
        },
      },
      existing: existingSnapshot({
        characterNames: new Set(),
        settingKeys: new Set(),
        chapter: existingChapter,
        contextPackage: blueprintContext,
        chapters: [existingChapter],
      }),
    })
    const blueprintRaw = normalizeChapterRecord(blueprintPrepared.acceptance.chapter_patch, existingChapter).raw_payload
    expect(blueprintRaw.chapter_blueprint.target_emotion).toBe('紧张追查')
    expect(blueprintRaw.chapter_blueprint.opening_hook).toBe('塔钟倒转。')
    expect(blueprintRaw.chapter_blueprint.custom_blueprint_sibling).toEqual({ keep: true })
    expect(blueprintRaw.pre_draft_brief.style_sample_strategy).toEqual({ mode: 'locked' })

    const benchmarkContext = {
      preflight: { checks: [{ key: 'benchmark_recall_source_paths', ok: false }] },
      chapter_target: {
        benchmark_recall_brief: existingChapter.raw_payload.benchmark_recall_brief,
      },
    }
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: resolveMaterialRepairPlan(benchmarkContext),
      payload: {
        chapter_patch: {
          raw_payload: { benchmark_recall_brief: { unrelated: '不能冒充真实来源路径' } },
        },
      },
      existing: existingSnapshot({
        chapter: existingChapter,
        contextPackage: benchmarkContext,
        chapters: [existingChapter],
      }),
    }), 'MATERIAL_REPAIR_OBLIGATION_UNMET')
    const benchmarkPrepared = prepareMcpMaterialRepairMutation({
      plan: resolveMaterialRepairPlan(benchmarkContext),
      payload: {
        chapter_patch: {
          raw_payload: {
            benchmark_recall_brief: { source_paths: ['追踪/文风样本.md#高压倒计时'] },
          },
        },
      },
      existing: existingSnapshot({
        characterNames: new Set(),
        settingKeys: new Set(),
        chapter: existingChapter,
        contextPackage: benchmarkContext,
        chapters: [existingChapter],
      }),
    })
    const benchmarkRaw = normalizeChapterRecord(benchmarkPrepared.acceptance.chapter_patch, existingChapter).raw_payload
    expect(benchmarkRaw.benchmark_recall_brief.selected_emotion_module).toBe('高压倒计时')
    expect(benchmarkRaw.benchmark_recall_brief.custom_benchmark_sibling).toBe('keep-snake')
    expect(benchmarkRaw.benchmarkRecallBrief.matched_chapter).toBe('第7章')
    expect(benchmarkRaw.benchmarkRecallBrief.camel_custom_sibling).toBe('keep-camel')
  })

  test('uses production predicates instead of approximate chapter, scene, tracking, benchmark, and title checks', () => {
    const basicPlan = resolveMaterialRepairPlan({
      preflight: { checks: [{ key: 'chapter_blueprint', ok: false }] },
    })
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: basicPlan,
      payload: { chapter_patch: { raw_payload: { chapter_blueprint: completeChapterBlueprint() } } },
      existing: existingSnapshot({ chapter: { chapter_no: 3, title: '灰塔底层', raw_payload: {} } }),
    }), 'MATERIAL_REPAIR_OBLIGATION_UNMET')

    const sceneContext = {
      preflight: { checks: [{ key: 'source_readiness_scene_card_goal_obstacle_change', ok: false }] },
      chapter_target: { scene_cards: [{ goal: '', obstacle: '', change: '' }] },
    }
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: resolveMaterialRepairPlan(sceneContext),
      payload: { chapter_patch: { scene_list: [{ goal: '抵达底层', obstacle: '塔门锁死', change: '气氛不同' }] } },
      existing: existingSnapshot({ chapter: { chapter_no: 3, raw_payload: {} }, contextPackage: sceneContext }),
    }), 'MATERIAL_REPAIR_OBLIGATION_UNMET')
    const scenePrepared = prepareMcpMaterialRepairMutation({
      plan: resolveMaterialRepairPlan(sceneContext),
      payload: { chapter_patch: { scene_list: [{ goal: '必须进入底层', obstacle: '塔门锁死', turning_point: '发现新名单' }] } },
      existing: existingSnapshot({ chapter: { chapter_no: 3, raw_payload: {} }, contextPackage: sceneContext }),
    })
    expect(scenePrepared.acceptance.chapter_patch.scene_list).toHaveLength(1)

    const trackingContext = {
      preflight: { checks: [{ key: 'source_readiness_context_tracking', ok: false }] },
      chapter_target: {
        state_tracking_contract: {
          source_requirements: ['追踪/上下文.md'],
          source_readiness: [{ key: 'context_tracking', status: 'missing', evidence: '缺来源锚点' }],
        },
      },
    }
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: resolveMaterialRepairPlan(trackingContext),
      payload: { chapter_patch: { raw_payload: { pre_draft_brief: { state_tracking_contract: {
        source_readiness: [{ key: 'context_tracking', status: 'ready', evidence: '已读取' }],
      } } } } },
      existing: existingSnapshot({ chapter: { chapter_no: 3, raw_payload: {} }, contextPackage: trackingContext }),
    }), 'MATERIAL_REPAIR_OBLIGATION_UNMET')

    const titleContext = { preflight: { checks: [{ key: 'chapter_title_unique', ok: false }] } }
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: resolveMaterialRepairPlan(titleContext),
      payload: { chapter_patch: { title: '灰塔回声' } },
      existing: existingSnapshot({
        characterNames: new Set(),
        settingKeys: new Set(),
        chapter: { id: 12, chapter_no: 3, title: '旧标题', raw_payload: {} },
        contextPackage: titleContext,
        chapters: [
          { id: 10, chapter_no: 1, title: '旧标题' },
          { id: 11, chapter_no: 2, title: '灰塔回声' },
        ],
      }),
    }), 'MATERIAL_REPAIR_OBLIGATION_UNMET')
    const titlePrepared = prepareMcpMaterialRepairMutation({
      plan: resolveMaterialRepairPlan(titleContext),
      payload: { chapter_patch: { title: '倒转登记' } },
      existing: existingSnapshot({
        chapter: { id: 12, chapter_no: 3, title: '旧标题', raw_payload: {} },
        contextPackage: titleContext,
        chapters: [
          { id: 10, chapter_no: 1, title: '旧标题' },
          { id: 11, chapter_no: 2, title: '灰塔回声' },
        ],
      }),
    })
    expect(titlePrepared.acceptance.chapter_patch.title).toBe('倒转登记')
  })

  test('repairs the production chapter blueprint check through its actual goal or summary fields', () => {
    const plan = resolveMaterialRepairPlan({
      preflight: { checks: [
        { key: 'chapter_blueprint', ok: false },
        { key: 'plot_points', ok: true },
      ] },
    })
    const prepared = prepareMcpMaterialRepairMutation({
      plan,
      payload: { chapter_patch: { chapter_goal: '查清灰塔倒转为何会抹去登记。' } },
      existing: existingSnapshot({
        chapter: {
          chapter_no: 3,
          title: '灰塔底层',
          chapter_goal: '',
          chapter_summary: '',
          raw_payload: { must_advance: ['确认灰塔倒转规律'] },
        },
      }),
    })

    expect(prepared.acceptance.chapter_patch.chapter_goal).toBe('查清灰塔倒转为何会抹去登记。')
  })

  test('rejects a response that does not cover every requested target', () => {
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: requestForTargets(new Set(['worldbuilding', 'characters'])),
      payload: { characters: [{ name: '林砚', goal: '找到旧档案柜' }], repair_summary: '只补了角色' },
      existing: existingSnapshot({ characterNames: new Set(), settingKeys: new Set() }),
    }), 'MATERIAL_REPAIR_INCOMPLETE')
  })

  test('does not turn empty remote fields into overwrites', () => {
    const prepared = prepareMcpMaterialRepairMutation({
      plan: requestForTargets(new Set(['character_updates'])),
      payload: {
        character_updates: [{
          name: '林砚',
          current_state: { location: '灰塔底层', inventory: [], note: '   ' },
          goal: '',
          abilities: [],
        }],
        repair_summary: '更新状态',
      },
      existing: existingSnapshot({ characterNames: new Set(['林砚']), settingKeys: new Set() }),
    })

    expect(prepared.acceptance.character_updates).toEqual([{
      name: '林砚',
      patch: { current_state: { location: '灰塔底层' } },
    }])
    expect(prepared.summary).toBe('更新状态')
  })

  test('prepares one combined result in the real acceptance shape', () => {
    const existing = materialSnapshot({
      characters: [{ id: 2, name: '林砚' }],
      settings: [{ id: 5, entity_type: 'location', name: '灰塔' }],
    })
    const request = resolveMaterialRepairPlan({ preflight: { checks: [
      { key: 'chapter_blueprint', ok: false },
      { key: 'scene_cards', ok: false },
      { key: 'plot_points', ok: false },
      { key: 'worldbuilding', ok: false },
      { key: 'character_state', ok: false },
      { key: 'chapter_setting_usage', ok: false },
    ] } })
    const prepared = prepareMcpMaterialRepairMutation({
      plan: request,
      payload: {
        chapter_patch: {
          chapter_goal: '找到旧档案柜',
          chapter_summary: '',
          scene_list: [{ scene_no: 1, goal: '抵达底层', obstacle: '塔门锁死' }],
          raw_payload: {
            chapter_blueprint: { target_emotion: '窒息感' },
            must_advance: ['确认灰塔倒转规律'],
          },
        },
        worldbuilding: [{
          summary: '灰塔每次倒转都会抹去一条登记。',
          rules: ['倒转发生时，塔内记录按楼层逆序消失。'],
        }],
        character_updates: [{
          name: '林砚',
          current_state: { location: '灰塔底层' },
          goal: '',
        }],
        chapter_setting_usage: [
          { entity_id: 5, usage_type: 'required', required: true },
        ],
        repair_summary: '补齐本章蓝图、角色状态、世界规则和设定调用。',
      },
      existing,
    })

    expect(prepared.acceptance).toEqual({
      chapter_patch: {
        chapter_goal: '找到旧档案柜',
        scene_list: [{ scene_no: 1, goal: '抵达底层', obstacle: '塔门锁死' }],
        raw_payload: {
          chapter_blueprint: { target_emotion: '窒息感' },
          must_advance: ['确认灰塔倒转规律'],
        },
      },
      worldbuilding_creates: [{
        world_summary: '灰塔每次倒转都会抹去一条登记。',
        rules: ['倒转发生时，塔内记录按楼层逆序消失。'],
      }],
      character_updates: [{
        name: '林砚',
        patch: { current_state: { location: '灰塔底层' } },
      }],
      chapter_setting_usage_replacement: [
        { entity_id: 5, usage_type: 'required', required: true },
      ],
    })
    expect(prepared.applied).toEqual([
      { type: 'chapter_patch' },
      { type: 'worldbuilding_created', count: 1 },
      { type: 'characters_updated', count: 1 },
      { type: 'chapter_setting_usage_replaced', count: 1 },
    ])
  })

  test('rejects non-requested sections and forbidden mutation fields', () => {
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: requestForTargets(new Set(['worldbuilding'])),
      payload: {
        worldbuilding: [{ world_summary: '灰塔有十二层。' }],
        characters: [{ name: '越权角色', goal: '越权创建' }],
      },
      existing: existingSnapshot({ characterNames: new Set(), settingKeys: new Set() }),
    }), 'MATERIAL_REPAIR_FORBIDDEN_FIELD')

    for (const payload of [
      { chapter_patch: { chapter_text: '越权正文' } },
      { chapter_patch: { project_id: 99, title: '越权章节' } },
      { chapter_patch: { raw_payload: { generation_source: { active: 'model' } } } },
      { chapter_patch: { title: '合法字段' }, project_patch: { title: '越权项目' } },
    ]) {
      expectContractError(() => prepareMcpMaterialRepairMutation({
        plan: requestForTargets(new Set(['chapter_patch'])),
        payload,
        existing: existingSnapshot({ characterNames: new Set(), settingKeys: new Set() }),
      }), 'MATERIAL_REPAIR_FORBIDDEN_FIELD')
    }
  })

  test('rejects duplicate and existing character or setting identities', () => {
    for (const payload of [
      { characters: [{ name: '许昼', goal: '一' }, { name: '许昼', goal: '二' }] },
      { characters: [{ name: '林砚', goal: '重复创建已有角色' }] },
    ]) {
      expectContractError(() => prepareMcpMaterialRepairMutation({
        plan: requestForTargets(new Set(['characters'])),
        payload,
        existing: existingSnapshot({ characterNames: new Set(['林砚']), settingKeys: new Set(['location\u0000灰塔']) }),
      }), 'MATERIAL_REPAIR_DUPLICATE')
    }

    for (const payload of [
      { settings: [{ entity_type: 'item', name: '登记册', summary: '一' }, { type: 'item', title: '登记册', summary: '二' }] },
      { settings: [{ entity_type: 'location', name: '灰塔', summary: '重复创建已有设定' }] },
    ]) {
      expectContractError(() => prepareMcpMaterialRepairMutation({
        plan: requestForTargets(new Set(['settings'])),
        payload,
        existing: existingSnapshot({ characterNames: new Set(['林砚']), settingKeys: new Set(['location\u0000灰塔']) }),
      }), 'MATERIAL_REPAIR_DUPLICATE')
    }
  })

  test('rejects duplicate updates, unresolved references, and IDs outside the snapshot', () => {
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: requestForTargets(new Set(['character_updates'])),
      payload: { character_updates: [
        { name: '林砚', goal: '找到记录' },
        { name: '林砚', current_state: { location: '灰塔' } },
      ] },
      existing: existingSnapshot({ characterNames: new Set(['林砚']), settingKeys: new Set() }),
    }), 'MATERIAL_REPAIR_DUPLICATE')

    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: requestForTargets(new Set(['character_updates'])),
      payload: { character_updates: [{ name: '不存在的角色', current_state: { location: '灰塔' } }] },
      existing: existingSnapshot({ characterNames: new Set(['林砚']), settingKeys: new Set() }),
    }), 'MATERIAL_REPAIR_REFERENCE_INVALID')

    const existing = materialSnapshot({
      characters: [{ id: 2, name: '林砚' }],
      settings: [{ id: 5, entity_type: 'location', name: '灰塔' }],
    })
    for (const usage of [
      { entity_id: 999, usage_type: 'required' },
      { entity_name: '不存在的规则', entity_type: 'rule', usage_type: 'required' },
    ]) {
      expectContractError(() => prepareMcpMaterialRepairMutation({
        plan: requestForTargets(new Set(['chapter_setting_usage'])),
        payload: { chapter_setting_usage: [usage] },
        existing,
      }), 'MATERIAL_REPAIR_REFERENCE_INVALID')
    }
  })

  test('materializes an unresolved forbidden named usage as a scoped setting placeholder', () => {
    const prepared = prepareMcpMaterialRepairMutation({
      plan: requestForTargets(new Set(['chapter_setting_usage'])),
      payload: {
        chapter_setting_usage: [{
          entity_name: '失忆真相',
          entity_type: 'mystery',
          forbidden: true,
          reveal_level: '不得揭示',
        }],
      },
      existing: materialSnapshot({ characters: [], settings: [] }),
    })

    expect(prepared.acceptance.setting_creates).toEqual([{
      entity_type: 'mystery',
      name: '失忆真相',
      summary: '本章禁揭的未解析设定：失忆真相',
      status: 'active',
      visibility: 'limited',
      constraints_json: { reveal_level: '不得揭示' },
      state_json: { status: 'unresolved', reveal_level: '不得揭示' },
      payload_json: { source: 'mcp_material_repair_forbidden_usage' },
    }])
    expect(prepared.acceptance.chapter_setting_usage_replacement).toEqual([{
      entity_name: '失忆真相',
      entity_type: 'mystery',
      forbidden: true,
      reveal_level: '不得揭示',
    }])
  })

  test('rejects ambiguous duplicate usage references and oversized output', () => {
    const existing = materialSnapshot({
      characters: [],
      settings: [{ id: 5, entity_type: 'location', name: '灰塔' }],
    })
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: requestForTargets(new Set(['chapter_setting_usage'])),
      payload: { chapter_setting_usage: [
        { entity_id: 5, required: true },
        { entity_name: '灰塔', entity_type: 'location', forbidden: true },
      ] },
      existing,
    }), 'MATERIAL_REPAIR_DUPLICATE')

    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: requestForTargets(new Set(['worldbuilding'])),
      payload: { worldbuilding: [{ world_summary: '超'.repeat(200000) }] },
      existing: existingSnapshot({ characterNames: new Set(), settingKeys: new Set() }),
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
        plan: requestForTargets(new Set([target])),
        payload,
        existing: existingSnapshot({
          characterNames: new Set(['林砚']),
          settingKeys: new Set(['location\u0000灰塔']),
          settingIds: new Set([5]),
          settingKeysById: new Map([[5, 'location\u0000灰塔']]),
        }),
      }), 'MATERIAL_REPAIR_INCOMPLETE')
    }
  })

  test('rejects wrong primitive and collection types for every acceptance section', () => {
    const existing = materialSnapshot({
      characters: [{ id: 2, name: '林砚' }],
      settings: [{ id: 5, entity_type: 'location', name: '灰塔' }],
    })
    const invalidCases: Array<{
      target: any
      payload: any
    }> = [
      { target: 'chapter_patch', payload: { chapter_patch: { title: false } } },
      { target: 'chapter_patch', payload: { chapter_patch: { scene_list: ['不是场景对象'] } } },
      { target: 'chapter_patch', payload: { chapter_patch: { raw_payload: { chapter_blueprint: '不是对象' } } } },
      { target: 'worldbuilding', payload: { worldbuilding: [{ world_summary: false }] } },
      { target: 'worldbuilding', payload: { worldbuilding: [{ world_summary: '灰塔', factions: {} }] } },
      { target: 'characters', payload: { characters: [{ name: '许昼', goal: false }] } },
      { target: 'characters', payload: { characters: [{ name: '许昼', goal: '找到记录', abilities: {} }] } },
      { target: 'characters', payload: { characters: [{ name: '许昼', goal: '找到记录', first_appearance_chapter: 1.5 }] } },
      { target: 'character_updates', payload: { character_updates: [{ name: '林砚', current_state: [] }] } },
      { target: 'character_updates', payload: { character_updates: [{ name: '林砚', patch: { motivation: 7 } }] } },
      { target: 'settings', payload: { settings: [{ entity_type: 'rule', name: '倒转规则', summary: false }] } },
      { target: 'settings', payload: { settings: [{ entity_type: 'rule', name: '倒转规则', first_chapter_no: 1.5 }] } },
      { target: 'settings', payload: { settings: [{ entity_type: 'rule', name: '倒转规则', constraints_json: [] }] } },
      { target: 'chapter_setting_usage', payload: { chapter_setting_usage: [{ entity_id: 5, required: 'false' }] } },
      { target: 'chapter_setting_usage', payload: { chapter_setting_usage: [{ entity_id: '5', required: true }] } },
      { target: 'chapter_setting_usage', payload: { chapter_setting_usage: [{ entity_id: 5, expected_state_change: [] }] } },
    ]
    for (const invalid of invalidCases) {
      expectContractError(() => prepareMcpMaterialRepairMutation({
        plan: requestForTargets(new Set([invalid.target])),
        payload: invalid.payload,
        existing,
      }), 'MATERIAL_REPAIR_INVALID')
    }
  })

  test('rejects nested values with non-plain prototypes instead of stripping them', () => {
    const inherited = Object.create({ inherited: true })
    inherited.rule = '倒转时不可离塔'
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: requestForTargets(new Set(['worldbuilding'])),
      payload: { worldbuilding: [{ world_summary: '灰塔规则', rules: [inherited] }] },
      existing: existingSnapshot({ characterNames: new Set(), settingKeys: new Set() }),
    }), 'MATERIAL_REPAIR_INVALID')
  })

  test('rejects invalid setting type before applying the missing-field default', () => {
    for (const entityType of [false, 0]) {
      const request = requestForTargets(new Set(['settings']))
      expectContractError(() => prepareMcpMaterialRepairMutation({
        plan: request,
        payload: { settings: [{ entity_type: entityType, name: '倒转规则', summary: '倒转时记录逆序消失。' }] },
        existing: existingSnapshot({ characterNames: new Set(), settingKeys: new Set() }),
      }), 'MATERIAL_REPAIR_INVALID')
    }
  })

  test('requires a complete transaction snapshot at the prepare boundary', () => {
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: requestForTargets(new Set(['worldbuilding'])),
      payload: { worldbuilding: [{ world_summary: '灰塔每次倒转都会抹去一条登记。' }] },
      existing: { characterNames: new Set(), settingKeys: new Set() } as any,
    }), 'MATERIAL_REPAIR_SNAPSHOT_INVALID')
  })

  test('accepts the production null reference preview in a complete transaction snapshot', () => {
    const prepared = prepareMcpMaterialRepairMutation({
      plan: requestForTargets(new Set(['worldbuilding'])),
      payload: { worldbuilding: [{ world_summary: '灰塔每次倒转都会抹去一条登记。' }] },
      existing: existingSnapshot({ referencePreview: null }),
    })

    expect(prepared.acceptance.worldbuilding_creates).toHaveLength(1)
  })

  test('requires a trusted canonical ISO confirmation timestamp at the prepare boundary', () => {
    for (const confirmationTimestamp of [undefined, '', '2026-08-07', 'not-a-date']) {
      expectContractError(() => prepareMcpMaterialRepairMutationContract({
        plan: requestForTargets(new Set(['worldbuilding'])),
        payload: { worldbuilding: [{ world_summary: '灰塔每次倒转都会抹去一条登记。' }] },
        existing: existingSnapshot(),
        confirmationTimestamp,
      } as any), 'MATERIAL_REPAIR_CONFIRMATION_INVALID')
    }
  })

  test('uses the plan error code for every malformed resolved plan shape', () => {
    const invalidPlans = [
      { targets: new Set(['chapter_patch']), obligations: [null] },
      {
        targets: new Set(['chapter_patch']),
        obligations: [
          { key: 'ending_hook', targets: ['chapter_patch'] },
          { key: 'ending_hook', targets: ['chapter_patch'] },
        ],
      },
      { targets: new Set(['chapter_patch']), obligations: [{ key: 'ending_hook', targets: ['characters'] }] },
      { targets: new Set(), obligations: [{ key: 'ending_hook', targets: ['chapter_patch'] }] },
      { targets: new Set(['chapter_patch']), obligations: [{ key: 'future_unknown_key', targets: ['chapter_patch'] }] },
    ]
    for (const plan of invalidPlans) {
      expectContractError(() => prepareMcpMaterialRepairMutation({
        plan: plan as any,
        payload: {},
        existing: existingSnapshot(),
      }), 'MATERIAL_REPAIR_PLAN_INVALID')
    }
  })

  test('rejects runtime unknown targets at both public contract boundaries', () => {
    const invalidRequest = {
      targets: new Set(['runtime_unknown_target']),
      obligations: [{ key: 'ending_hook', targets: ['chapter_patch'] }],
    } as any
    expectContractError(() => buildMaterialRepairTask({
      plan: invalidRequest,
      project: {},
      chapter: {},
      contextPackage: {},
      chapters: [],
      worldbuilding: [],
      characters: [],
      outlines: [],
      reviews: [],
      settings: [],
      chapterSettingUsage: [],
      projectSettingUsage: [],
      identity: {
        project_identity_hash: 'sha256:project',
        chapter_identity_hash: 'sha256:chapter',
        source_identity_hash: 'sha256:source',
        context_identity_hash: 'sha256:context',
      },
    } as any), 'MATERIAL_REPAIR_TARGET_INVALID')
    expectContractError(() => prepareMcpMaterialRepairMutation({
      plan: invalidRequest,
      payload: {},
      existing: existingSnapshot({ characterNames: new Set(), settingKeys: new Set() }),
    } as any), 'MATERIAL_REPAIR_TARGET_INVALID')
  })
})
