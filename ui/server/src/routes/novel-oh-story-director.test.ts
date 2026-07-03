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
    expect(director.required_repairs).toHaveLength(0)
    expect(director.deferred_repairs.some(item => item.key === 'chapter_runway_depth')).toBe(true)
  })

  test('collapses scattered pre-draft warnings into canonical blocker categories', () => {
    expect(classifyOhStoryDirectorBlocker('文风召回来源缺失：Step 2.3 source_paths_missing')).toBe('missing_source_evidence')
    expect(classifyOhStoryDirectorBlocker('本章细纲/蓝图：补齐本章蓝图核心字段')).toBe('missing_blueprint')
    expect(classifyOhStoryDirectorBlocker('追踪/时间线.md 缺少本章当前时间地点')).toBe('missing_context')
    expect(classifyOhStoryDirectorBlocker('先确认主角是否更换阵营后再写')).toBe('manual_confirmation_required')
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
    expect(selection.prompt_budget_plan.compact).toContain('story_power')
    expect(selection.prompt_budget_plan.omit).toContain('longform_structure_contract')
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
    expect(director.acceptance).toBe('accepted_with_carryover')
    expect(director.primary_action.key).toBe('continue_next_chapter')
    expect(director.carryover_findings.map(item => item.key)).toContain('story_power')
    expect(director.blocking_findings.map(item => item.key)).not.toContain('story_power')
  })
})
