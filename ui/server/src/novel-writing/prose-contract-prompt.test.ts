import { describe, expect, test } from 'bun:test'
import {
  compileProseContractPrompt,
  ProseCorePromptBudgetError,
} from './prose-contract-prompt'
import { buildProseGenerationContract } from './prose-generation-contract'
import { selectOhStoryDirectorContracts } from '../routes/novel-oh-story-director'
import { compileParagraphProseContext } from '../routes/novel-writing-service'

const requiredSections = [
  { key: 'task', text: 'CORE_TASK' },
  { key: 'chapter', text: 'CORE_CHAPTER' },
  { key: 'output', text: 'CORE_OUTPUT' },
]

describe('prose contract prompt compiler', () => {
  test('keeps required sections and omits every unselected risk contract', () => {
    const result = compileProseContractPrompt({
      requiredSections,
      contractSections: [
        {
          key: 'dialogue',
          full: 'DIALOGUE_FULL',
          compact: 'DIALOGUE_COMPACT',
          reference: 'DIALOGUE_REFERENCE',
        },
        {
          key: 'quality_audit',
          full: 'QUALITY_FULL',
          compact: 'QUALITY_COMPACT',
          reference: 'QUALITY_REFERENCE',
        },
      ],
      director: {
        selected_contracts: [
          { key: 'dialogue_contract', detail_level: 'compact', reason: '对白风险' },
        ],
        prompt_budget_plan: {
          compact: ['dialogue_contract'],
          omit: ['quality_audit_contract'],
        },
      },
    })

    expect(result.prompt).toContain('CORE_TASK')
    expect(result.prompt).toContain('CORE_CHAPTER')
    expect(result.prompt).toContain('CORE_OUTPUT')
    expect(result.prompt).toContain('DIALOGUE_COMPACT')
    expect(result.prompt).not.toContain('DIALOGUE_FULL')
    expect(result.prompt).not.toContain('QUALITY_')
    expect(result.diagnostics.selected_contract_keys).toEqual(['dialogue'])
    expect(result.diagnostics.omitted_contract_keys).toContain('quality_audit')
    expect(result.diagnostics.prompt_chars).toBe(result.prompt.length)
  })

  test('downgrades optional sections but never truncates required sections', () => {
    const required = 'R'.repeat(70)
    const result = compileProseContractPrompt({
      maxChars: 120,
      requiredSections: [{ key: 'task', text: required }],
      contractSections: [{
        key: 'dialogue',
        full: 'F'.repeat(80),
        compact: 'C'.repeat(30),
        reference: 'DIALOGUE_REF',
      }],
      director: {
        selected_contracts: [{ key: 'dialogue', detail_level: 'full', reason: '对白风险' }],
      },
    })

    expect(result.prompt).toContain(required)
    expect(result.prompt).toContain('C'.repeat(30))
    expect(result.prompt).not.toContain('F'.repeat(80))
    expect(result.prompt.length).toBeLessThanOrEqual(120)
    expect(result.diagnostics.downgrades).toEqual([
      { key: 'dialogue', from: 'full', to: 'compact' },
    ])
  })

  test('fails when required sections alone exceed the budget', () => {
    let thrown: any = null
    try {
      compileProseContractPrompt({
        maxChars: 48_000,
        requiredSections: [{ key: 'chapter', text: '章'.repeat(48_001) }],
        contractSections: [],
        director: { selected_contracts: [] },
      })
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBeInstanceOf(ProseCorePromptBudgetError)
    expect(thrown.code).toBe('PROSE_CORE_PROMPT_BUDGET_EXCEEDED')
    expect(thrown.diagnostics.required_chars).toBe(48_001)
    expect(thrown.diagnostics.budget_chars).toBe(48_000)
  })

  test('production required content preserves a previous handoff beyond the legacy field cap', () => {
    const tailSentinel = 'PRODUCTION_HANDOFF_TAIL_SENTINEL'
    const contract = buildProseGenerationContract({
      chapter_target: {
        chapter_no: 10,
        title: '合围破局',
        goal: '打穿追捕圈',
        conflict: '追捕队封死四面出口',
        ending_hook: '幕后指挥者现身',
        previous_handoff: `${'承接'.repeat(2_101)}${tailSentinel}`,
        scene_cards: [],
      },
      preflight: { ready: true, strict_ready: true, checks: [] },
      oh_story_director: { readiness: 'ready', selected_contracts: [] },
    })

    const compiled = compileParagraphProseContext({ title: '怪谈世界' }, contract)

    expect(compiled.diagnostics.required_chars).toBeLessThan(48_000)
    expect(compiled.prompt).toContain(tailSentinel)
  })

  test('production required content rejects an oversized core instead of returning a truncated prompt', () => {
    const contract = buildProseGenerationContract({
      chapter_target: {
        chapter_no: 10,
        title: '合围破局',
        goal: '打穿追捕圈',
        conflict: '追捕队封死四面出口',
        ending_hook: '幕后指挥者现身',
        previous_handoff: '承'.repeat(48_001),
        scene_cards: [],
      },
      preflight: { ready: true, strict_ready: true, checks: [] },
      oh_story_director: { readiness: 'ready', selected_contracts: [] },
    })
    let compiled: ReturnType<typeof compileParagraphProseContext> | null = null
    let thrown: any = null

    try {
      compiled = compileParagraphProseContext({ title: '怪谈世界' }, contract)
    } catch (error) {
      thrown = error
    }

    expect(compiled).toBeNull()
    expect(thrown).toBeInstanceOf(ProseCorePromptBudgetError)
    expect(thrown.code).toBe('PROSE_CORE_PROMPT_BUDGET_EXCEEDED')
    expect(thrown.diagnostics.required_chars).toBeGreaterThan(48_000)
  })

  test('production required content preserves every scene card within the total budget', () => {
    const tailSentinel = 'PRODUCTION_SCENE_CARD_201_SENTINEL'
    const contract = buildProseGenerationContract({
      chapter_target: {
        chapter_no: 10,
        title: '合围破局',
        goal: '打穿追捕圈',
        conflict: '追捕队封死四面出口',
        ending_hook: '幕后指挥者现身',
        scene_cards: Array.from({ length: 201 }, (_, index) => ({
          scene_no: index + 1,
          goal: index === 200 ? tailSentinel : `场景${index + 1}`,
        })),
      },
      preflight: { ready: true, strict_ready: true, checks: [] },
      oh_story_director: { readiness: 'ready', selected_contracts: [] },
    })

    const compiled = compileParagraphProseContext({ title: '怪谈世界' }, contract)

    expect(compiled.diagnostics.required_chars).toBeLessThan(48_000)
    expect(compiled.prompt).toContain(tailSentinel)
    expect(compiled.prompt).not.toContain('[Truncated 1 items]')
  })

  test('production required content preserves nested values within the total budget', () => {
    const depthSentinel = 'PRODUCTION_REQUIRED_DEPTH_SENTINEL'
    let nested: any = { value: depthSentinel }
    for (let depth = 0; depth < 25; depth += 1) nested = { next: nested }
    const contract = buildProseGenerationContract({
      chapter_target: {
        chapter_no: 10,
        title: '合围破局',
        goal: '打穿追捕圈',
        conflict: '追捕队封死四面出口',
        ending_hook: '幕后指挥者现身',
        scene_cards: [{ scene_no: 1, required_information: nested }],
      },
      preflight: { ready: true, strict_ready: true, checks: [] },
      oh_story_director: { readiness: 'ready', selected_contracts: [] },
    })

    const compiled = compileParagraphProseContext({ title: '怪谈世界' }, contract)

    expect(compiled.diagnostics.required_chars).toBeLessThan(48_000)
    expect(compiled.prompt).toContain(depthSentinel)
    expect(compiled.prompt).not.toContain('[MaxDepth]')
  })

  test('loads no more than four director-selected risk contracts', () => {
    const contractSections = Array.from({ length: 6 }, (_, index) => ({
      key: `risk_${index + 1}`,
      full: `FULL_${index + 1}`,
      compact: `COMPACT_${index + 1}`,
      reference: `REFERENCE_${index + 1}`,
    }))
    const result = compileProseContractPrompt({
      requiredSections,
      contractSections,
      director: {
        selected_contracts: contractSections.map(section => ({
          key: section.key,
          detail_level: 'full',
          reason: '测试风险',
        })),
      },
    })

    expect(result.diagnostics.selected_contract_keys).toHaveLength(4)
    expect(result.prompt).toContain('FULL_4')
    expect(result.prompt).not.toContain('FULL_5')
    expect(result.prompt).not.toContain('FULL_6')
  })

  test('keeps a realistic contract set bounded to the four director risks', () => {
    const contractKeys = [
      'continuity_heat',
      'story_power',
      'character_behavior',
      'dialogue',
      'chapter_hook',
      'conflict_structure',
      'prose_craft',
      'quality_audit',
      'state_tracking',
      'longform_structure',
      ...Array.from({ length: 20 }, (_, index) => `project_risk_${index + 1}`),
    ]
    const chapterTarget = Object.fromEntries(contractKeys.map(key => [
      `${key}_contract`,
      { rule: key === 'project_risk_20' ? 'UNSELECTED_CONTRACT_SENTINEL' : `RULE_${key}` },
    ]))
    const director = selectOhStoryDirectorContracts({
      stage: 'pre_draft',
      preflight: {
        warnings: ['上一章状态承接、主角能动性、核心冲突、章末钩子、对白与正文质量需要复核'],
      },
      chapter_target: {
        ...chapterTarget,
        goal: '江澈主动打穿追捕合围',
        conflict: '追捕队封锁全部出口',
        ending_hook: '幕后指挥者叫出江澈旧名',
      },
    })
    const compiled = compileProseContractPrompt({
      requiredSections: [
        { key: 'handoff', text: '【上一章尾段承接】追捕队从四面合围。' },
        { key: 'scene_cards', text: '【场景卡因果链】破灯制造盲区 -> 夺取通讯器。' },
        { key: 'output', text: '只输出完整章节正文。' },
      ],
      contractSections: contractKeys.map(key => ({
        key,
        full: `FULL_${key}:${'细则'.repeat(900)}`,
        compact: `COMPACT_${key}:${key === 'project_risk_20' ? 'UNSELECTED_CONTRACT_SENTINEL' : '约束'.repeat(180)}`,
        reference: `REFERENCE_${key}`,
      })),
      director,
    })

    expect(compiled.diagnostics.selected_contract_keys.length).toBeLessThanOrEqual(4)
    expect(compiled.diagnostics.prompt_chars).toBeLessThanOrEqual(48_000)
    expect(compiled.prompt).toContain('【上一章尾段承接】')
    expect(compiled.prompt).toContain('【场景卡因果链】')
    expect(compiled.prompt).not.toContain('UNSELECTED_CONTRACT_SENTINEL')
  })
})
