import { describe, expect, test } from 'bun:test'
import {
  buildOhStoryDirectorForPostDraft,
  buildOhStoryDirectorForPreDraft,
  buildOhStoryDirectorForProjectSeed,
  classifyOhStoryDirectorBlocker,
  selectOhStoryDirectorContracts,
} from './novel-oh-story-director'

describe('oh-story director core', () => {
  test('marks complete project seeds as ready and keeps optional gaps deferred', () => {
    const director = buildOhStoryDirectorForProjectSeed({
      title: '星火令',
      synopsis: '少年带着失效星火令进入边境学院，发现星火令能改写势力手牌。',
      logline: '失效令牌成为改写边境秩序的唯一钥匙。',
      main_conflict: '主角要查清星火令来源，边境三方势力要夺令灭口。',
      protagonist: { name: '林澈', goal: '查明父亲失踪真相' },
      worldbuilding: { world_summary: '边境学院由军府、商盟、旧神教共同控制。', rules: ['星火令只能改写一次阵营手牌'] },
      writing_bible: {
        target_reader_contract: { reader_profile: '男频升级爽文读者' },
        story_power_contract: { quality_checks: ['目标阻碍动作反馈期待'] },
        character_design_contract: { character_pool_tiers: ['protagonist', 'primary_supporting'] },
        longform_structure_contract: { structure_mode: '二级结构' },
      },
      chapter_outlines: [{ chapter_no: 1, title: '失效令牌', summary: '林澈被迫入局', conflict: '军府扣人', ending_hook: '星火令亮起' }],
      character_pool: {
        protagonist: [{ name: '林澈' }],
        primary_supporting: [{ name: '许照夜' }, { name: '唐眉' }, { name: '周砚' }],
        antagonist_primary: [{ name: '沈归墟', antagonist_logic: { desire: '夺回旧神令权' } }],
      },
    })

    expect(director.stage).toBe('project_creation')
    expect(director.readiness).toBe('ready')
    expect(director.primary_action.key).toBe('enter_workspace')
    expect(director.primary_action.mode).toBe('manual')
    expect(director.blocking_summary).toBe('Ready to enter workspace.')
    expect(director.required_repairs).toHaveLength(0)
    expect(director.deferred_repairs.some(item => item.key === 'chapter_runway_depth')).toBe(true)
    expect(director.selected_contracts.map(item => item.key)).toContain('story_power')
    expect(director.prompt_budget_plan.reference).toContain('longform_structure')
    expect(director.evidence.some(item => item.key === 'main_conflict' && item.status === 'ready')).toBe(true)
  })

  test('collapses scattered pre-draft warnings into canonical blocker categories', () => {
    expect(classifyOhStoryDirectorBlocker('文风召回来源缺失：Step 2.3 source_paths_missing')).toBe('missing_source_evidence')
    expect(classifyOhStoryDirectorBlocker('本章 scene card / chapter_blueprint：补齐本章蓝图核心字段')).toBe('missing_blueprint')
    expect(classifyOhStoryDirectorBlocker('handoff 追踪/时间线.md 缺少 current time 和 current place')).toBe('missing_context')
    expect(classifyOhStoryDirectorBlocker('先确认 core direction / 主线方向 / 核心承诺 是否更换')).toBe('manual_confirmation_required')
    expect(classifyOhStoryDirectorBlocker('缺少章节目标')).toBe('missing_materials')
    expect(classifyOhStoryDirectorBlocker('先人工确认本章蓝图是否更换')).toBe('manual_confirmation_required')
    expect(classifyOhStoryDirectorBlocker('场景卡缺目标')).toBe('missing_blueprint')
    expect(classifyOhStoryDirectorBlocker('场景卡戏剧单元缺目标、阻碍、变化')).toBe('missing_blueprint')
  })

  test('requires user confirmation when a project seed lacks the core conflict direction', () => {
    const director = buildOhStoryDirectorForProjectSeed({
      title: '星火令',
      synopsis: '少年带着失效星火令进入边境学院。',
      logline: '失效令牌成为改写边境秩序的唯一钥匙。',
      protagonist: { name: '林澈', goal: '查明父亲失踪真相' },
      worldbuilding: { world_summary: '边境学院由三方势力共同控制。', rules: ['星火令只能改写一次阵营手牌'] },
      writing_bible: {
        target_reader_contract: { reader_profile: '男频升级爽文读者' },
        story_power_contract: { quality_checks: ['目标阻碍动作反馈期待'] },
        character_design_contract: { character_pool_tiers: ['protagonist'] },
        longform_structure_contract: { structure_mode: '二级结构' },
      },
      chapter_outlines: [{ chapter_no: 1, title: '失效令牌' }],
      character_pool: {
        protagonist: [{ name: '林澈' }],
        primary_supporting: [{ name: '许照夜' }],
        antagonist_primary: [{ name: '沈归墟' }],
      },
    })

    expect(director.readiness).toBe('needs_user_confirmation')
    expect(director.primary_action.key).toBe('ask_user_confirmation')
    expect(director.primary_action.mode).toBe('manual')
    expect(director.required_repairs).toContainEqual(expect.objectContaining({
      key: 'main_conflict',
      category: 'manual_confirmation_required',
      blocking: true,
    }))
    expect(director.evidence).toContainEqual(expect.objectContaining({
      key: 'main_conflict',
      status: 'blocked',
    }))
  })

  test('selects compact contracts and omits unrelated longform contracts for a local chapter risk', () => {
    const selection = selectOhStoryDirectorContracts({
      stage: 'drafting',
      chapter_target: {
        conflict: '主角需要当场反制巡考扣押',
        story_power_contract: { quality_checks: ['目标阻碍动作反馈期待'] },
        character_behavior_contract: { quality_checks: ['主角不能因蠢犯错'] },
        longform_structure_contract: { quality_checks: ['五幕因果链'] },
      },
      preflight: { warnings: ['场景卡戏剧单元缺目标、阻碍、变化'] },
    })

    expect(selection.selected_contracts.map(item => item.key)).toContain('story_power')
    expect(selection.selected_contracts.map(item => item.key)).toContain('character_behavior')
    expect(selection.selected_contracts.find(item => item.key === 'story_power')?.detail_level).toBe('compact')
    expect(selection.prompt_budget_plan.compact).toContain('story_power')
    expect(selection.prompt_budget_plan.reference).toEqual([])
    expect(selection.prompt_budget_plan.omit).toContain('longform_structure')
    expect(selection.suppressed_contracts.map(item => item.key)).toContain('longform_structure')
  })

  test('selects at most four canonical risk contracts from the current chapter warnings', () => {
    const selection = selectOhStoryDirectorContracts({
      stage: 'drafting',
      chapter_target: {
        conflict: '追捕队封锁四面出口，主角必须主动破围。',
        story_power_contract: { promise: '超人以行动碾碎怪谈规则' },
        character_behavior_contract: { protagonist: '主动破局' },
        dialogue_contract: { voice: '主角短句压制' },
        chapter_hook_contract: { ending: '更高阶追捕者现身' },
        conflict_structure_contract: { escalation: '封锁升级' },
        prose_craft_contract: { style: '自然中文网文' },
        quality_audit_contract: { language: '简体中文' },
        longform_structure_contract: { direction: '继续怪谈追捕主线' },
      },
      preflight: {
        warnings: ['核心承诺、主角行为、对白口吻和章末钩子必须在本章可见兑现。'],
      },
    })

    const selectedKeys = selection.selected_contracts.map(item => item.key)
    const allBudgetKeys = Object.values(selection.prompt_budget_plan).flat()

    expect(selectedKeys).toHaveLength(4)
    expect(selectedKeys).toEqual(expect.arrayContaining([
      'story_power',
      'character_behavior',
      'dialogue',
      'chapter_hook',
    ]))
    expect([...selectedKeys, ...selection.suppressed_contracts.map(item => item.key), ...allBudgetKeys]
      .some(key => /_contract$/.test(key))).toBe(false)
  })

  test('returns full pre-draft director shape for missing materials and manual confirmation', () => {
    const repairDirector = buildOhStoryDirectorForPreDraft({
      chapter_target: {
        story_power_contract: { quality_checks: ['目标阻碍动作反馈期待'] },
      },
      preflight: { warnings: ['场景卡 scene card 缺目标、阻碍、变化'] },
    })

    expect(repairDirector.stage).toBe('pre_draft')
    expect(repairDirector.readiness).toBe('needs_repair')
    expect(repairDirector.primary_action.key).toBe('repair_pre_draft_materials')
    expect(repairDirector.primary_action.mode).toBe('automatic')
    expect(repairDirector.blocking_summary).toContain('1 blocking')
    expect(repairDirector.required_repairs[0]).toEqual(expect.objectContaining({
      category: 'missing_blueprint',
      blocking: true,
    }))
    expect(repairDirector.prompt_budget_plan.reference).toEqual([])
    expect(repairDirector.evidence[0]).toEqual(expect.objectContaining({ status: 'blocked' }))

    const confirmationDirector = buildOhStoryDirectorForPreDraft({
      preflight: { warnings: ['先人工确认主线方向是否改变'] },
    })

    expect(confirmationDirector.readiness).toBe('blocked')
    expect(confirmationDirector.primary_action.key).toBe('confirm_missing_choice')
    expect(confirmationDirector.primary_action.mode).toBe('manual')
  })

  test('treats pre-draft blockers as canonical blocking repairs', () => {
    const director = buildOhStoryDirectorForPreDraft({
      preflight: {
        blockers: ['本章细纲/蓝图：补齐本章蓝图核心字段'],
        warnings: [],
      },
    })

    expect(director.stage).toBe('pre_draft')
    expect(director.readiness).toBe('needs_repair')
    expect(director.primary_action.key).toBe('repair_pre_draft_materials')
    expect(director.primary_action.mode).toBe('automatic')
    expect(director.required_repairs.map(item => item.category)).toContain('missing_blueprint')
    expect(director.evidence).toContainEqual(expect.objectContaining({
      key: 'pre_draft_missing_blueprint',
      status: 'blocked',
      source: 'preflight.blockers',
    }))
  })

  test('keeps ready pre-draft warnings as deferred evidence instead of blocking drafting', () => {
    const director = buildOhStoryDirectorForPreDraft({
      preflight: {
        ready: true,
        blockers: [],
        warnings: [
          '文风召回缺口：旧版模块可继续写作，但必须在自检中保留优先级。',
          '文风召回来源缺失：Step 2.3 source_paths_missing',
        ],
      },
      chapter_target: {
        story_power_contract: { quality_checks: ['目标阻碍动作反馈期待'] },
      },
    })

    expect(director.readiness).toBe('ready')
    expect(director.primary_action.key).toBe('generate_prose')
    expect(director.required_repairs).toHaveLength(0)
    expect(director.deferred_repairs.map(item => item.category)).toContain('missing_source_evidence')
    expect(director.deferred_repairs.every(item => item.blocking === false)).toBe(true)
    expect(director.evidence).toContainEqual(expect.objectContaining({
      key: 'pre_draft_missing_source_evidence',
      status: 'warn',
      source: 'preflight.warnings',
    }))
  })

  test('treats strict_ready false as a blocking repair even when ready is true', () => {
    const director = buildOhStoryDirectorForPreDraft({
      preflight: {
        ready: true,
        strict_ready: false,
        blockers: [],
        warnings: ['连续性材料不足'],
        checks: [
          {
            key: 'continuity',
            ok: false,
            severity: 'medium',
            label: '连续性材料',
            fix: '补齐上一章尾段和角色当前状态。',
          },
        ],
      },
      chapter_target: {
        story_power_contract: { quality_checks: ['目标阻碍动作反馈期待'] },
      },
    })

    expect(director.readiness).toBe('needs_repair')
    expect(director.primary_action.key).toBe('repair_pre_draft_materials')
    expect(director.required_repairs).toContainEqual(expect.objectContaining({
      key: 'pre_draft_strict_readiness',
      blocking: true,
    }))
    expect(director.evidence).toContainEqual(expect.objectContaining({
      key: 'pre_draft_strict_readiness',
      status: 'blocked',
      source: 'preflight.strict_ready',
    }))
  })

  test('normalizes non-array pre-draft warnings and blockers without dropping categories', () => {
    const director = buildOhStoryDirectorForPreDraft({
      preflight: {
        blockers: '场景卡缺目标',
        warnings: { message: '先人工确认本章蓝图是否更换' },
      },
      chapter_target: {
        story_power_contract: { quality_checks: ['目标阻碍动作反馈期待'] },
      },
    })

    expect(director.readiness).toBe('blocked')
    expect(director.primary_action.key).toBe('confirm_missing_choice')
    expect(director.primary_action.mode).toBe('manual')
    expect(director.required_repairs.map(item => item.category)).toContain('missing_blueprint')
    expect(director.required_repairs.map(item => item.category)).toContain('manual_confirmation_required')
    expect(director.selected_contracts.map(item => item.key)).toContain('story_power')
  })

  test('aggregates duplicate pre-draft issue categories into stable repair keys', () => {
    const director = buildOhStoryDirectorForPreDraft({
      preflight: {
        blockers: [
          '本章细纲/蓝图：补齐本章蓝图核心字段',
          '场景卡戏剧单元缺目标、阻碍、变化',
        ],
        warnings: ['chapter_blueprint 缺少转折'],
      },
    })

    expect(director.required_repairs.filter(item => item.category === 'missing_blueprint')).toHaveLength(1)
    expect(director.required_repairs[0]).toEqual(expect.objectContaining({
      key: 'pre_draft_missing_blueprint',
      category: 'missing_blueprint',
      blocking: true,
    }))
    expect(director.required_repairs[0].detail).toContain('本章细纲/蓝图')
    expect(director.required_repairs[0].detail).toContain('场景卡戏剧单元缺目标')
    expect(director.required_repairs[0].detail).toContain('chapter_blueprint')
    expect(director.evidence.filter(item => item.key === 'pre_draft_missing_blueprint')).toHaveLength(2)
    expect(director.evidence.map(item => item.source)).toContain('preflight.blockers')
    expect(director.evidence.map(item => item.source)).toContain('preflight.warnings')
  })

  test('separates post-draft blockers from next-chapter carry-over', () => {
    const director = buildOhStoryDirectorForPostDraft({
      quality: {
        deslop_gate_diagnostics: { failed_count: 0 },
        story_power_sync: { status: 'warn', missed: [{ key: 'feedback', fix: '下一章开篇补代价反馈' }] },
        delivery_risk_receipt_sync: { missed_count: 1, items: [{ key: 'ending_hook', remaining_risk: '章末钩子未兑现' }] },
      },
      receipts: {
        revision_receipts: [{ required_action: '补对白口吻', applied_fix: '已完成', changed_evidence: '“你别碰那枚令。”' }],
      },
    })

    expect(director.stage).toBe('post_draft')
    expect(director.readiness).toBe('ready')
    expect(director.acceptance).toBe('accepted_with_carryover')
    expect(director.primary_action.key).toBe('continue_next_chapter')
    expect(director.primary_action.mode).toBe('manual')
    expect(director.blocking_summary).toBe('Accepted with next-chapter carry-over.')
    expect(director.prompt_budget_plan.reference).toEqual([])
    expect(director.evidence.map(item => item.key)).toContain('revision_receipts')
    expect(director.resolved_findings.map(item => item.key)).toContain('revision_receipt')
    expect(director.carryover_findings.map(item => item.key)).toContain('story_power')
    expect(director.blocking_findings.map(item => item.key)).not.toContain('story_power')
  })

  test('uses spec post-draft revision acceptance and action for blocking quality failures', () => {
    const director = buildOhStoryDirectorForPostDraft({
      quality: {
        deslop_gate_diagnostics: { failed_count: 2 },
        story_power_sync: { status: 'fail', missed: [{ key: 'action_feedback', fix: '补动作反馈' }] },
      },
      receipts: { revision_receipts: [] },
    })

    expect(director.stage).toBe('post_draft')
    expect(director.readiness).toBe('needs_repair')
    expect(director.acceptance).toBe('needs_revision')
    expect(director.primary_action.key).toBe('run_revision')
    expect(director.primary_action.mode).toBe('automatic')
    expect(director.required_repairs.map(item => item.category)).toContain('quality_revision_required')
    expect(director.blocking_findings.map(item => item.key)).toContain('deslop_gate')
  })

  test('treats real deslop diagnostics concern gates as post-draft revision blockers', () => {
    const director = buildOhStoryDirectorForPostDraft({
      quality: {
        deslop_gate_diagnostics: {
          concern_gate_count: 1,
          gates: [{ gate: 'B', status: 'warn', label: '句式套路' }],
        },
      },
      receipts: { revision_receipts: [] },
    })

    expect(director.stage).toBe('post_draft')
    expect(director.acceptance).toBe('needs_revision')
    expect(director.primary_action.key).toBe('run_revision')
    expect(director.required_repairs).toContainEqual(expect.objectContaining({
      key: 'deslop_gate',
      category: 'quality_revision_required',
    }))
  })

  test('normalizes singleton post-draft story power misses and revision receipts', () => {
    const carryoverDirector = buildOhStoryDirectorForPostDraft({
      quality: {
        story_power_sync: { status: 'warn', missed: { key: 'feedback', fix: '下一章开篇补代价反馈' } },
      },
      receipts: {
        revision_receipts: { required_action: '补对白口吻', applied_fix: '已完成', changed_evidence: '“你别碰那枚令。”' },
      },
    })

    expect(carryoverDirector.acceptance).toBe('accepted_with_carryover')
    expect(carryoverDirector.carryover_findings).toContainEqual(expect.objectContaining({
      key: 'story_power',
      detail: expect.stringContaining('下一章开篇补代价反馈'),
    }))
    expect(carryoverDirector.resolved_findings).toContainEqual(expect.objectContaining({
      key: 'revision_receipt',
      detail: expect.stringContaining('你别碰那枚令'),
    }))

    const blockingDirector = buildOhStoryDirectorForPostDraft({
      quality: {
        story_power_sync: { status: 'fail', missed: '缺少动作反馈闭环' },
      },
      receipts: { revision_receipts: null },
    })

    expect(blockingDirector.acceptance).toBe('needs_revision')
    expect(blockingDirector.blocking_findings).toContainEqual(expect.objectContaining({
      key: 'story_power',
      detail: expect.stringContaining('缺少动作反馈闭环'),
    }))
  })
})
