import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'fs'
import { join } from 'path'
import { createNovelProductionService, createNovelRunExecutionService } from './novel-production-service'

const makeRunHarness = (output: any) => {
  let currentRun: any = {
    id: 9001,
    project_id: 77,
    run_type: 'chapter_group_generation',
    status: 'ready',
    output_ref: JSON.stringify(output),
  }
  const updates: any[] = []
  const appendedRuns: any[] = []
  return {
    get run() {
      return currentRun
    },
    updates,
    appendedRuns,
    listNovelRuns: async () => [currentRun],
    updateNovelRun: async (_workspace: string, runId: number, patch: any) => {
      expect(runId).toBe(currentRun.id)
      updates.push(patch)
      currentRun = { ...currentRun, ...patch }
      return currentRun
    },
    appendNovelRun: async (_workspace: string, data: any) => {
      const record = { id: 9100 + appendedRuns.length, ...data }
      appendedRuns.push(record)
      return record
    },
  }
}

describe('production service behavior b a', () => {
  test('advances unattended production when chapter handoff sync evidence is still open', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 63, chapter_no: 13, title: '第十三章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 64, chapter_no: 14, title: '第十四章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      unattended: { enabled: true, allow_incomplete: false },
      policy: { quality_threshold: 88, allow_incomplete: false },
    })
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      appendNovelRun: harness.appendNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, _chapterId, options) => {
        await options.onStage('draft', { status: 'success' })
        await options.onStage('review', { status: 'success', score: 92 })
        return {
          score: 92,
          revised: false,
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'ok' },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
            chapter_handoff_sync: { status: 'warn', summary: '开篇前300字没有接住上一章最后一幕和 overdue 待办。' },
          },
        }
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
    })
    const repairQueue = JSON.parse(harness.appendedRuns[0].output_ref)

    expect(result.status).toBe('success')
    expect(result.group.current_index).toBe(2)
    expect(result.group.chapters[0]).toMatchObject({
      status: 'success',
    })
    expect(result.group.chapters[1].status).toBe('success')
    expect(harness.appendedRuns).toHaveLength(2)
    expect(result.group.results[0].post_delivery_quality.checks.filter((check: any) => check.status === 'warn').map((check: any) => check.key)).toEqual([
      'chapter_handoff',
    ])
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual(['chapter_handoff_gap'])
    expect(repairQueue.tasks[0]).toMatchObject({
      title: '第13章章首承接修复',
      action: '补齐章首承接证据，确认 previous_handoff、opening_obligations、must_deliver、keep_alive 和 overdue 已在前300字或对应场景落成正文。',
    })
  })

  test('advances unattended production when state tracking sync evidence is still open', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 65, chapter_no: 15, title: '第十五章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 66, chapter_no: 16, title: '第十六章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      unattended: { enabled: true, allow_incomplete: false },
      policy: { quality_threshold: 88, allow_incomplete: false },
    })
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      appendNovelRun: harness.appendNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, _chapterId, options) => {
        await options.onStage('draft', { status: 'success' })
        await options.onStage('review', { status: 'success', score: 91 })
        return {
          score: 91,
          revised: false,
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'ok' },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
            state_tracking_sync: { status: 'warn', summary: '角色伤势和阵盘裂纹状态没有在正文证据中闭环。' },
          },
        }
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
    })
    const repairQueue = JSON.parse(harness.appendedRuns[0].output_ref)

    expect(result.status).toBe('success')
    expect(result.group.current_index).toBe(2)
    expect(result.group.chapters[0]).toMatchObject({
      status: 'success',
    })
    expect(result.group.chapters[1].status).toBe('success')
    expect(harness.appendedRuns).toHaveLength(2)
    expect(result.group.results[0].post_delivery_quality.checks.filter((check: any) => check.status === 'warn').map((check: any) => check.key)).toEqual([
      'state_tracking',
    ])
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual(['state_tracking_gap'])
    expect(repairQueue.tasks[0]).toMatchObject({
      title: '第15章状态跟踪修复',
      action: '补齐状态跟踪证据，确认角色状态、物品状态、时间线、伏笔状态和关键资产状态已在正文与追踪记录中闭环。',
    })
  })

  test('advances unattended production when punctuation tone sync evidence is still open', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 67, chapter_no: 17, title: '第十七章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 68, chapter_no: 18, title: '第十八章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      unattended: { enabled: true, allow_incomplete: false },
      policy: { quality_threshold: 88, allow_incomplete: false },
    })
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      appendNovelRun: harness.appendNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, _chapterId, options) => {
        await options.onStage('draft', { status: 'success' })
        await options.onStage('review', { status: 'success', score: 90 })
        return {
          score: 90,
          revised: false,
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'ok' },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
            punctuation_tone_sync: { status: 'warn', summary: '正文仍有破折号、长省略和语气标点漂移。' },
          },
        }
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
    })
    const repairQueue = JSON.parse(harness.appendedRuns[0].output_ref)

    expect(result.status).toBe('success')
    expect(result.group.current_index).toBe(2)
    expect(result.group.chapters[0]).toMatchObject({
      status: 'success',
    })
    expect(result.group.chapters[1].status).toBe('success')
    expect(harness.appendedRuns).toHaveLength(2)
    expect(result.group.results[0].post_delivery_quality.checks.filter((check: any) => check.status === 'warn').map((check: any) => check.key)).toEqual([
      'punctuation_tone',
    ])
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual(['punctuation_tone_gap'])
    expect(repairQueue.tasks[0]).toMatchObject({
      title: '第17章语气标点修复',
      action: '按 oh-story 确定性收尾修复语气标点、破折号、省略号、横线、双连字符和高危 AI 句式，复检到 0 个残留。',
    })
  })

  test('advances unattended production when asset linkage sync evidence is still open', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 69, chapter_no: 19, title: '第十九章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 70, chapter_no: 20, title: '第二十章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      unattended: { enabled: true, allow_incomplete: false },
      policy: { quality_threshold: 88, allow_incomplete: false },
    })
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      appendNovelRun: harness.appendNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, _chapterId, options) => {
        await options.onStage('draft', { status: 'success' })
        await options.onStage('review', { status: 'success', score: 90 })
        return {
          score: 90,
          revised: false,
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'ok' },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
            asset_linkage_sync: { status: 'warn', summary: '新资产蓝晶只露名，没有和角色目标、代价或后续承诺挂钩。' },
          },
        }
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
    })
    const repairQueue = JSON.parse(harness.appendedRuns[0].output_ref)

    expect(result.status).toBe('success')
    expect(result.group.current_index).toBe(2)
    expect(result.group.chapters[0]).toMatchObject({
      status: 'success',
    })
    expect(result.group.chapters[1].status).toBe('success')
    expect(harness.appendedRuns).toHaveLength(2)
    expect(result.group.results[0].post_delivery_quality.checks.filter((check: any) => check.status === 'warn').map((check: any) => check.key)).toEqual([
      'asset_linkage',
    ])
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual(['asset_linkage_gap'])
    expect(repairQueue.tasks[0]).toMatchObject({
      title: '第19章资产挂钩修复',
      action: '补齐资产挂钩证据，确认新资产、关键道具、能力、地点或势力已和角色目标、冲突代价、后续承诺或当前卷主线发生可见关系。',
    })
  })

  test('advances unattended production when dialogue sync evidence is still open', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 72, chapter_no: 21, title: '第二十一章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 73, chapter_no: 22, title: '第二十二章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      unattended: { enabled: true, allow_incomplete: false },
      policy: { quality_threshold: 88, allow_incomplete: false },
    })
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      appendNovelRun: harness.appendNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, _chapterId, options) => {
        await options.onStage('draft', { status: 'success' })
        await options.onStage('review', { status: 'success', score: 90 })
        return {
          score: 90,
          revised: false,
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'ok' },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
            dialogue_sync: { status: 'warn', summary: '对白只有说明功能，缺少角色声线、议程和潜台词。' },
          },
        }
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
    })
    const repairQueue = JSON.parse(harness.appendedRuns[0].output_ref)

    expect(result.status).toBe('success')
    expect(result.group.current_index).toBe(2)
    expect(result.group.chapters[0]).toMatchObject({
      status: 'success',
    })
    expect(result.group.chapters[1].status).toBe('success')
    expect(harness.appendedRuns).toHaveLength(2)
    expect(result.group.results[0].post_delivery_quality.checks.filter((check: any) => check.status === 'warn').map((check: any) => check.key)).toEqual([
      'dialogue',
    ])
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual(['dialogue_gap'])
    expect(repairQueue.tasks[0]).toMatchObject({
      title: '第21章对白质量修复',
      action: '修复对白质量，确认每段对白都有角色目标、冲突压力、潜台词和声线差异，删除只解释信息的填充对白。',
    })
  })

  test('advances unattended production when character behavior sync evidence is still open', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 74, chapter_no: 23, title: '第二十三章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 75, chapter_no: 24, title: '第二十四章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      unattended: { enabled: true, allow_incomplete: false },
      policy: { quality_threshold: 88, allow_incomplete: false },
    })
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      appendNovelRun: harness.appendNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, _chapterId, options) => {
        await options.onStage('draft', { status: 'success' })
        await options.onStage('review', { status: 'success', score: 90 })
        return {
          score: 90,
          revised: false,
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'ok' },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
            character_behavior_sync: { status: 'warn', summary: '角色行动缺少动机链，选择和代价没有接上当前场景压力。' },
          },
        }
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
    })
    const repairQueue = JSON.parse(harness.appendedRuns[0].output_ref)

    expect(result.status).toBe('success')
    expect(result.group.current_index).toBe(2)
    expect(result.group.chapters[0]).toMatchObject({
      status: 'success',
    })
    expect(result.group.chapters[1].status).toBe('success')
    expect(harness.appendedRuns).toHaveLength(2)
    expect(result.group.results[0].post_delivery_quality.checks.filter((check: any) => check.status === 'warn').map((check: any) => check.key)).toEqual([
      'character_behavior',
    ])
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual(['character_behavior_gap'])
    expect(repairQueue.tasks[0]).toMatchObject({
      title: '第23章角色行为修复',
      action: '修复角色行为链，确认选择和动作符合角色状态、关系压力、收益代价和当前场景约束，避免降智或无因转向。',
    })
  })

  test('advances unattended production when scene-card receipt sync evidence is still open', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 76, chapter_no: 25, title: '第二十五章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 77, chapter_no: 26, title: '第二十六章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      unattended: { enabled: true, allow_incomplete: false },
      policy: { quality_threshold: 88, allow_incomplete: false },
    })
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      appendNovelRun: harness.appendNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, _chapterId, options) => {
        await options.onStage('draft', { status: 'success' })
        await options.onStage('review', { status: 'success', score: 90 })
        return {
          score: 90,
          revised: false,
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'ok' },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
            scene_card_receipts_sync: { status: 'warn', summary: '场景2回执标记已兑现，但 evidence 不在对应场景正文中。' },
          },
        }
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
    })
    const repairQueue = JSON.parse(harness.appendedRuns[0].output_ref)

    expect(result.status).toBe('success')
    expect(result.group.current_index).toBe(2)
    expect(result.group.chapters[0]).toMatchObject({
      status: 'success',
    })
    expect(result.group.chapters[1].status).toBe('success')
    expect(harness.appendedRuns).toHaveLength(2)
    expect(result.group.results[0].post_delivery_quality.checks.filter((check: any) => check.status === 'warn').map((check: any) => check.key)).toEqual([
      'scene_card_receipts',
    ])
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual(['scene_card_receipts_gap'])
    expect(repairQueue.tasks[0]).toMatchObject({
      title: '第25章场景回执修复',
      action: '修复 scene_card_receipts，确认每个场景的 delivered 字段、场景边界和 evidence 都能在对应场景正文中定位。',
    })
  })

  test('advances unattended production when delivery-risk receipt sync evidence is still open', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 78, chapter_no: 27, title: '第二十七章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 79, chapter_no: 28, title: '第二十八章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      unattended: { enabled: true, allow_incomplete: false },
      policy: { quality_threshold: 88, allow_incomplete: false },
    })
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      appendNovelRun: harness.appendNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, _chapterId, options) => {
        await options.onStage('draft', { status: 'success' })
        await options.onStage('review', { status: 'success', score: 90 })
        return {
          score: 90,
          revised: false,
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'ok' },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
            delivery_risk_receipts_sync: { status: 'warn', summary: '上一章章末追读风险没有在本章开篇形成现场追证压力。' },
          },
        }
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
    })
    const repairQueue = JSON.parse(harness.appendedRuns[0].output_ref)

    expect(result.status).toBe('success')
    expect(result.group.current_index).toBe(2)
    expect(result.group.chapters[0]).toMatchObject({
      status: 'success',
    })
    expect(result.group.chapters[1].status).toBe('success')
    expect(harness.appendedRuns).toHaveLength(2)
    expect(result.group.results[0].post_delivery_quality.checks.filter((check: any) => check.status === 'warn').map((check: any) => check.key)).toEqual([
      'delivery_risk_receipts',
    ])
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual(['delivery_risk_receipts_gap'])
    expect(repairQueue.tasks[0]).toMatchObject({
      title: '第27章交稿回执修复',
      action: '修复 delivery_risk_receipts，确认上一章/批次残留风险的 required_action 已落成开篇承接、中段事件推进、读者回报或章末钩子证据。',
    })
  })

  test('advances unattended production when revision-context receipt sync evidence is still open', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 80, chapter_no: 29, title: '第二十九章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 81, chapter_no: 30, title: '第三十章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      unattended: { enabled: true, allow_incomplete: false },
      policy: { quality_threshold: 88, allow_incomplete: false },
    })
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      appendNovelRun: harness.appendNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, _chapterId, options) => {
        await options.onStage('draft', { status: 'success' })
        await options.onStage('review', { status: 'success', score: 90 })
        return {
          score: 90,
          revised: true,
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'ok' },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
            revision_context_receipts_sync: { status: 'warn', summary: '修订后旧印章归属与下一章上下文不一致。' },
          },
        }
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
    })
    const repairQueue = JSON.parse(harness.appendedRuns[0].output_ref)

    expect(result.status).toBe('success')
    expect(result.group.current_index).toBe(2)
    expect(result.group.chapters[0]).toMatchObject({
      status: 'success',
    })
    expect(result.group.chapters[1].status).toBe('success')
    expect(harness.appendedRuns).toHaveLength(2)
    expect(result.group.results[0].post_delivery_quality.checks.filter((check: any) => check.status === 'warn').map((check: any) => check.key)).toEqual([
      'revision_context_receipts',
    ])
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual(['revision_context_receipts_gap'])
    expect(repairQueue.tasks[0]).toMatchObject({
      title: '第29章修订上下文修复',
      action: '补齐 revision_context_receipts，确认修订前后 previous_chapter、next_chapter、伏笔、角色卡、时间线、设定和关系边界都已对照并闭环。',
    })
  })

  test('persists camelCase sceneCards from unattended stage callbacks', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 71, chapter_no: 4, title: '第四章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      policy: { force_scene_cards: true },
      results: [],
    })
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      appendNovelRun: harness.appendNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, _chapterId, options) => {
        await options.onStage('scene_cards', {
          status: 'success',
          sceneCards: [
            { sceneNo: 3, title: '入城遇阻', purposeTag: 'opening_hook' },
            { sceneNo: 4, title: '旧敌现身', purposeTag: 'conflict_escalation' },
          ],
        })
        return {
          score: 90,
          revised: false,
          story_state_update: {},
          config_snapshot: { snapshot_id: 'camel-scene-cards' },
        }
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 1,
      lock_owner: 'behavior-test',
    })
    const sceneCardsUpdate = harness.updates
      .map(update => JSON.parse(String(update.output_ref || '{}')))
      .find(payload => payload.chapters?.[0]?.scenes?.length === 2)

    expect(result.status).toBe('success')
    expect(sceneCardsUpdate?.chapters?.[0]?.scenes).toHaveLength(2)
    expect(sceneCardsUpdate?.chapters?.[0]?.scenes?.[0]).toMatchObject({ scene_no: 3, title: '入城遇阻', status: 'planned' })
    expect(sceneCardsUpdate?.chapters?.[0]?.scenes?.[1]).toMatchObject({ scene_no: 4, title: '旧敌现身', status: 'planned' })
  })

})
