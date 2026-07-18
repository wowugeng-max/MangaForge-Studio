import { describe, expect, test } from 'bun:test'
import {
  buildGenerationPreflightRepairActionSpecs,
  extractStoryStateChapterNo,
} from './generationPreflightRepairModel'

describe('generation preflight repair action specs', () => {
  test('maps serial story state, style sample, timeline and blueprint blockers to direct buttons', () => {
    const payload = {
      error: '先完成第11章状态机更新，再继续第12章；文风召回来源缺失：Step 2.3 source_paths_missing；追踪/时间线：补齐追踪/时间线.md；本章细纲/蓝图：旧版细纲缺新版蓝图字段',
      preflight: {
        ready: false,
        blockers: [
          '先完成第11章状态机更新，再继续第12章，避免下一章读取旧角色状态、伏笔、时间线或资产状态。',
          '文风召回来源缺失： Step 2.3 source_paths_missing',
          '串行连续性/状态机：先完成第11章状态机更新，再继续第12章',
          '追踪/时间线：补齐追踪/时间线.md，至少确认本章当前时间、地点和关键事件顺序后再写正文。',
          '本章细纲/蓝图：旧版细纲缺新版蓝图字段不阻塞日更；本轮需要改纲/补纲时按新版模板回填',
        ],
        checks: [
          { key: 'source_readiness_serial_story_state', ok: false, label: '串行连续性/状态机', severity: 'high' },
          { key: 'source_readiness_timeline_tracking', ok: false, label: '追踪/时间线', severity: 'medium' },
          { key: 'source_readiness_chapter_blueprint', ok: false, label: '本章细纲/蓝图', severity: 'medium' },
        ],
      },
    }

    expect(extractStoryStateChapterNo(payload)).toBe(11)
    const actions = buildGenerationPreflightRepairActionSpecs(payload)
    const kinds = actions.map(item => item.kind)
    expect(kinds).toContain('sync_story_state')
    expect(kinds).toContain('replace_style_samples')
    expect(kinds).toContain('build_pre_draft_brief')
    expect(kinds).toContain('generate_scene_cards')
    expect(kinds).toContain('open_story_state_editor')
    expect(actions.find(item => item.kind === 'sync_story_state')?.label).toContain('第11章')
    expect(actions.some(item => item.primary)).toBe(true)
  })

  test('keeps character and setting auto-repair buttons', () => {
    const payload = {
      preflight: {
        checks: [
          { key: 'characters', ok: false },
          { key: 'setting_workshop', ok: false },
          { key: 'chapter_setting_usage', ok: false },
        ],
      },
    }
    const actions = buildGenerationPreflightRepairActionSpecs(payload, { includeContinueRepairAll: true })
    expect(actions.map(item => item.kind)).toEqual(expect.arrayContaining([
      'repair_all_auto',
      'repair_character_cards',
      'incubate_setting_workshop',
      'match_chapter_setting_usage',
      'open_story_assets',
    ]))
  })
})


  test('maps foreshadowing/history and world constraint blockers to direct buttons', () => {
    const payload = {
      error: '伏笔/前史：补齐上一章钩子、待回收伏笔或本章必须承接的前史因果。；世界约束：补齐本章会改变行动选择的规则、地点、能力限制、触发条件或代价。',
      preflight: {
        ready: false,
        blockers: [
          '伏笔/前史：补齐上一章钩子、待回收伏笔或本章必须承接的前史因果。',
          '世界约束：补齐本章会改变行动选择的规则、地点、能力限制、触发条件或代价。',
        ],
        checks: [
          { key: 'source_readiness_foreshadowing_history', ok: false, label: '伏笔/前史', severity: 'medium' },
          { key: 'source_readiness_world_constraints', ok: false, label: '世界约束', severity: 'medium' },
        ],
      },
    }
    const actions = buildGenerationPreflightRepairActionSpecs(payload)
    const kinds = actions.map(item => item.kind)
    expect(kinds).toContain('open_story_state_editor')
    expect(kinds).toContain('open_story_assets')
    expect(kinds).toContain('incubate_setting_workshop')
    expect(actions.some(item => item.reason === '伏笔/前史')).toBe(true)
    expect(actions.some(item => item.reason === '世界约束')).toBe(true)
  })
