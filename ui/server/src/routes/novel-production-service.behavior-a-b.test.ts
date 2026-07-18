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

describe('production service behavior a b', () => {
  test('advances unattended production when required status-filter receipts are missing', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 41, chapter_no: 7, title: '第七章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 42, chapter_no: 8, title: '第八章', status: 'pending', stages: production.buildChapterGroupStages() },
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
          requires_status_filter_receipts: true,
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'ok' },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
          },
        }
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
    })
    const statusFilterCheck = result.group.results[0].post_delivery_quality.checks.find((check: any) => check.key === 'status_filter_receipts')
    const repairQueue = JSON.parse(harness.appendedRuns[0].output_ref)

    expect(result.status).toBe('success')
    expect(result.group.current_index).toBe(2)
    expect(result.group.chapters[0]).toMatchObject({
      status: 'success',
    })
    expect(result.group.chapters[1].status).toBe('success')
    expect(harness.appendedRuns).toHaveLength(2)
    expect(statusFilterCheck).toMatchObject({
      key: 'status_filter_receipts',
      label: '状态筛选回执',
      status: 'unknown',
      summary: '第7章未返回状态筛选回执复检证据。',
    })
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual(['status_filter_receipts_gap'])
    expect(repairQueue.tasks[0]).toMatchObject({
      task_type: 'repair_quality',
      source: 'unattended_post_delivery_quality',
      chapter_no: 7,
      title: '第7章状态筛选回执修复',
      task_status: 'open',
      action: '补齐 status_filter_receipts，证明状态筛选只加载/只使用会影响本章正确性的状态。',
    })
  })

  test('advances unattended production when write-preparation sync evidence is still open', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 51, chapter_no: 9, title: '第九章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 52, chapter_no: 10, title: '第十章', status: 'pending', stages: production.buildChapterGroupStages() },
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
            source_readiness_sync: { status: 'warn', summary: '上一章正文和角色状态来源仍未闭环。' },
            intent_confirmation_sync: { status: 'warn', summary: '本章意图没有把情绪、节奏、模块和文风指令合成一句话。' },
            benchmark_recall_sync: { status: 'warn', summary: '文风召回没有落成节奏证据。' },
            style_sample_sync: { status: 'warn', summary: '样章对白策略没有落到正文。' },
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
      'source_readiness',
      'intent_confirmation',
      'benchmark_recall',
      'style_sample',
    ])
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual([
      'source_readiness_gap',
      'intent_confirmation_gap',
      'benchmark_recall_gap',
      'style_sample_gap',
    ])
    expect(repairQueue.tasks.map((task: any) => task.action)).toEqual([
      '补齐来源就绪证据，确认上一章正文、追踪上下文、伏笔、时间线、角色状态和本章细纲已读取或刚更新。',
      '补齐意图确认，明确本章情绪、节奏、模块、文风指令和新版细纲职责如何落成正文。',
      '补齐文风/标杆召回证据，确认情绪模块、节奏参考、匹配章技巧和锚点片段已落成正文。',
      '补齐样章/风格执行证据，确认样章策略、对白节奏、停顿方式和禁照搬边界已落成正文。',
    ])
  })

  test('advances unattended production when write-preparation receipt sync evidence is still open', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 55, chapter_no: 19, title: '第十九章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 56, chapter_no: 20, title: '第二十章', status: 'pending', stages: production.buildChapterGroupStages() },
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
            write_preparation_receipts_sync: {
              status: 'warn',
              summary: '写前准备卡的读者回报焦点没有落成正文证据。',
            },
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
    expect(result.group.chapters.map((chapter: any) => chapter.status)).toEqual(['success', 'success'])
    expect(harness.appendedRuns).toHaveLength(2)
    expect(result.group.results[0].post_delivery_quality.checks.filter((check: any) => check.status === 'warn').map((check: any) => check.key)).toEqual([
      'write_preparation_receipts',
    ])
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual(['write_preparation_receipts_gap'])
    expect(repairQueue.tasks[0]).toMatchObject({
      task_type: 'repair_quality',
      source: 'unattended_post_delivery_quality',
      chapter_no: 19,
      title: '第19章写前准备回执修复',
      task_status: 'open',
      action: '补齐 write_preparation_checks，证明来源缺口、资产风险、蓝图焦点、读者回报焦点和执行顺序已落成正文证据。',
    })
  })

  test('advances unattended production when prose craft step-3 sync evidence is still open', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 61, chapter_no: 11, title: '第十一章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 62, chapter_no: 12, title: '第十二章', status: 'pending', stages: production.buildChapterGroupStages() },
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
        await options.onStage('review', { status: 'success', score: 93 })
        return {
          score: 93,
          revised: false,
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'ok' },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
            prose_craft_sync: { status: 'warn', summary: 'dense 场景写成摘要，缺少动作、感知和对话交锋。' },
            payoff_setup_sync: { status: 'warn', summary: '爽点出手前缺少可指认危机和期待铺垫。' },
            spectator_reaction_sync: { status: 'warn', summary: '揭露章围观配角反应统一，没有差异化。' },
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
      'prose_craft',
      'payoff_setup',
      'spectator_reaction',
    ])
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual([
      'prose_craft_gap',
      'payoff_setup_gap',
      'spectator_reaction_gap',
    ])
    expect(repairQueue.tasks.map((task: any) => task.action)).toEqual([
      '按 oh-story 正文工艺修复深度限知、身体细节、疏密分配、小节结构、新概念锚点和非胶水转场，并用正文证据复检。',
      '补齐爽点/打脸/揭露前的危机、期待和代价铺垫，确认出手前读者能指认可期待的 payoff。',
      '补齐在场配角的差异化反应，让立场、信息差、利益受损和情绪变化各自可见。',
    ])
  })

  test('advances unattended production when story quality step-3 sync evidence is still open', async () => {
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
        await options.onStage('review', { status: 'success', score: 93 })
        return {
          score: 93,
          revised: false,
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'ok' },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
            story_loop_sync: { status: 'warn', summary: '本章只推进事件，没有形成问题-行动-代价-新问题闭环。' },
            information_flow_sync: { status: 'warn', summary: '关键设定一次性说明，没有随冲突分层释放。' },
            expectation_threshold_sync: { status: 'warn', summary: '爽点前没有建立危机、代价和可期待回报。' },
            emotional_arc_sync: { status: 'warn', summary: '情绪变化只靠旁白宣布，没有压力、选择和余波。' },
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
      'story_loop',
      'information_flow',
      'expectation_threshold',
      'emotional_arc',
    ])
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual([
      'story_loop_gap',
      'information_flow_gap',
      'expectation_threshold_gap',
      'emotional_arc_gap',
    ])
    expect(repairQueue.tasks.map((task: any) => task.action)).toEqual([
      '补齐故事闭环，确认本章问题、行动、代价、回报和新问题形成可追踪循环。',
      '调整信息流，确认关键信息随冲突推进分层释放，不用整段设定说明替代剧情。',
      '补齐期待阈值，确认危机、代价、承诺和可期待回报在爽点前建立。',
      '补齐情绪弧，确认压力、选择、爆发、余波和角色反应形成可感知变化。',
    ])
  })

  test('advances unattended production when narrative technique step-3 sync evidence is still open', async () => {
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
        await options.onStage('review', { status: 'success', score: 93 })
        return {
          score: 93,
          revised: false,
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'ok' },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
            paragraph_hook_sync: { status: 'warn', summary: '段落之间只是顺序叙述，没有问题牵引。' },
            suspense_sync: { status: 'warn', summary: '悬念只遮蔽不释放线索，读者没有可推理抓手。' },
            reversal_sync: { status: 'warn', summary: '反转突然出现，缺少前置误导和证据链。' },
            showdown_sync: { status: 'warn', summary: '高潮对抗没有反制、代价和结果升级。' },
            opening_sync: { status: 'warn', summary: '开篇前300字没有抛出冲突、异常或目标。' },
            bridge_unit_sync: { status: 'warn', summary: '桥段只做过渡，没有事件推进和情绪换挡。' },
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
      'paragraph_hook',
      'suspense',
      'reversal',
      'showdown',
      'opening',
      'bridge_unit',
    ])
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual([
      'paragraph_hook_gap',
      'suspense_gap',
      'reversal_gap',
      'showdown_gap',
      'opening_gap',
      'bridge_unit_gap',
    ])
    expect(repairQueue.tasks.map((task: any) => task.action)).toEqual([
      '补齐段落级钩子，确认段落之间有信息推进、情绪变化或问题牵引。',
      '补齐悬念编排，确认疑问、线索、遮蔽和揭示节奏形成持续牵引。',
      '补齐反转设计，确认误导、证据链、认知翻转和后果落点成立。',
      '补齐高潮对抗，确认目标、阻力、反制、代价和结果逐层升级。',
      '修复开篇设计，确认前300字抛出冲突、异常、目标或代价压力。',
      '补齐桥段节奏，确认过渡桥段也有事件推进、情绪换挡或信息变化。',
    ])
  })

  test('advances unattended production when long-form contract sync evidence is still open', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 71, chapter_no: 21, title: '第二十一章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 72, chapter_no: 22, title: '第二十二章', status: 'pending', stages: production.buildChapterGroupStages() },
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
        await options.onStage('review', { status: 'success', score: 93 })
        return {
          score: 93,
          revised: false,
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'ok' },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
            continuity_heat_sync: { status: 'warn', summary: '连续三章没有兑现前文热度或 keep_alive 承诺。' },
            conflict_structure_sync: { status: 'warn', summary: '本章只有行动流水，缺少对抗、代价和压力层级。' },
            upgrade_rhythm_sync: { status: 'warn', summary: '升级回报跳过训练、限制和代价，只给结果。' },
            target_reader_sync: { status: 'warn', summary: '章节选择偏作者解释，缺少目标读者可感知的期待回报。' },
            genre_positioning_sync: { status: 'warn', summary: '题材承诺偏移，主类型爽点没有落到正文事件。' },
            female_audience_sync: { status: 'warn', summary: '关系情绪和女性主体选择没有形成推进。' },
            plot_dynamics_sync: { status: 'warn', summary: '剧情动力不足，角色只是被动接收消息。' },
            character_relation_sync: { status: 'warn', summary: '角色关系没有利益变化、情绪推进或权力位移。' },
            reader_retention_sync: { status: 'warn', summary: '章末没有追读问题、未兑现承诺或下一章期待。' },
            core_contract_sync: { status: 'warn', summary: '核心创作契约没有在本章关键场景兑现。' },
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
      'continuity_heat',
      'conflict_structure',
      'upgrade_rhythm',
      'target_reader',
      'genre_positioning',
      'female_audience',
      'plot_dynamics',
      'character_relation',
      'reader_retention',
      'core_contract',
    ])
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual([
      'continuity_heat_gap',
      'conflict_structure_gap',
      'upgrade_rhythm_gap',
      'target_reader_gap',
      'genre_positioning_gap',
      'female_audience_gap',
      'plot_dynamics_gap',
      'character_relation_gap',
      'reader_retention_gap',
      'core_contract_gap',
    ])
    expect(repairQueue.tasks.map((task: any) => task.action)).toEqual([
      '补齐连续性热度，确认前文承诺、keep_alive、未兑现风险和本章推进形成追读牵引。',
      '补齐冲突结构，确认目标、阻力、升级、代价和结果不是平铺事件流水。',
      '补齐升级节奏，确认能力、地位、资源或关系收益有训练/限制/代价/验证过程。',
      '补齐目标读者契约，确认本章选择服务目标读者期待，而不是作者自我解释。',
      '校正题材定位，确认主类型承诺、爽点/情绪钩子和市场定位落到正文事件。',
      '补齐女频长篇体验，确认女性主体选择、关系张力、情绪推进和安全感/价值感回报可见。',
      '补齐剧情动力，确认角色主动目标、阻碍反馈、选择压力和下一步推动力可见。',
      '修复角色关系线，确认关系中的利益、情绪、权力或信任状态发生可追踪变化。',
      '补齐追读留存，确认章末问题、未兑现承诺、下一章期待和读者回报焦点成立。',
      '修复核心创作契约，确认本章兑现作品核心卖点、主角承诺、题材承诺和读者回报。',
    ])
  })

  test('advances unattended production when serial quality assurance sync evidence is still open', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 73, chapter_no: 23, title: '第二十三章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 74, chapter_no: 24, title: '第二十四章', status: 'pending', stages: production.buildChapterGroupStages() },
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
        await options.onStage('review', { status: 'success', score: 93 })
        return {
          score: 93,
          revised: false,
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'ok' },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
            story_drive_sync: { status: 'warn', summary: '本章缺少主动目标和阻碍反馈，故事力不足。' },
            character_arc_sync: { status: 'warn', summary: '主角选择没有带来认知、关系或能力变化。' },
            style_boundary_sync: { status: 'warn', summary: '文风边界漂移，样章节奏和禁照搬边界没有执行。' },
            innovation_sync: { status: 'warn', summary: '创新点只在设定里出现，没有落成具体桥段。' },
            runway_sync: { status: 'warn', summary: '连载航线缺少后续三章可接的承诺和风险。' },
            reader_expectation_sync: { status: 'warn', summary: '读者期待没有在章首、章中、章尾持续维护。' },
            quality_audit_sync: { status: 'warn', summary: '质量诊断发现水段、空洞爽点和均匀节奏。' },
            beat_cooling_sync: { status: 'warn', summary: '连续高压冲突没有冷却桥段或关系换挡。' },
            reader_payoff_sync: { status: 'warn', summary: '本章承诺的读者回报没有落成正文证据。' },
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
      'story_drive',
      'character_arc',
      'style_boundary',
      'innovation',
      'runway',
      'reader_expectation',
      'quality_audit',
      'beat_cooling',
      'reader_payoff',
    ])
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual([
      'story_drive_gap',
      'character_arc_gap',
      'style_boundary_gap',
      'innovation_missed',
      'runway_gap',
      'reader_expectation_debt',
      'quality_audit_gap',
      'beat_cooling_gap',
      'reader_payoff_debt',
    ])
    expect(repairQueue.tasks.map((task: any) => task.action)).toEqual([
      '补齐故事驱动力，确认角色主动目标、阻碍反馈、选择代价和下一步推动力可见。',
      '补齐人物弧光，确认角色认知、能力、关系或公众形象发生可追踪变化。',
      '修复文风边界，确认样章节奏、声线约束、禁照搬边界和当前场景基调已经落成正文。',
      '补齐创新执行，确认创新点不是设定说明，而是进入角色选择、冲突策略或爽点桥段。',
      '补齐连载航线，确认后续三章承诺、风险、钩子和可持续推进路径成立。',
      '补齐读者期待，确认章首承诺、章中加压、章尾悬念和下一章期待持续维护。',
      '按质量诊断修复水段、空洞爽点、均匀节奏、设定堆叠和低效桥段，并复检。',
      '补齐冷却节奏，确认连续高压后有关系、信息、情绪或世界观换挡，不让冲突疲劳。',
      '补齐读者回报，确认本章承诺的爽点、情绪价值、信息揭示或关系推进已落成正文证据。',
    ])
  })

  test('advances unattended production when revision-closure sync evidence is still open', async () => {
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
        await options.onStage('review', { status: 'success', score: 94 })
        return {
          score: 94,
          revised: true,
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'ok' },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
            prose_revision_receipt_sync: { status: 'warn', summary: '修订后仍有一条 issue 没有 changed_evidence。' },
            deslop_repair_receipt_sync: { status: 'warn', summary: 'Gate F 修复后仍有章末总结升华。' },
            quality_audit_repair_receipt_sync: { status: 'warn', summary: '质量诊断修复没有逐条引用修订后正文。' },
            revision_cascade_impact_sync: { status: 'warn', summary: '新增设定影响下一章伏笔，但没有级联说明。' },
            revision_scope_guard_sync: { status: 'warn', summary: '修订删掉 1100 字但没有说明幅度原因。' },
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
      'prose_revision_receipt_sync',
      'deslop_repair_receipt_sync',
      'quality_audit_repair_receipt_sync',
      'revision_cascade_impact_sync',
      'revision_scope_guard_sync',
    ])
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual([
      'prose_revision_receipt_sync',
      'deslop_repair_receipt_sync',
      'quality_audit_repair_receipt_sync',
      'revision_cascade_impact_sync',
      'revision_scope_guard_sync',
    ])
    expect(repairQueue.tasks.map((task: any) => task.action)).toEqual([
      '补齐 revision_receipts，逐条对应自检问题、修订动作和 changed_evidence。',
      '补齐 deslop_repair_receipts，逐条证明 Gate A-G 去AI味修复后的正文证据。',
      '补齐 quality_audit_repair_receipts，逐条证明质量诊断缺口已经修复并引用修订后正文。',
      '补齐 revision_receipts.cascade_impacts，说明修订对后续伏笔、时间线、角色状态、资产和关系边界的影响。',
      '补齐 revision_scope_guard，说明修订字数变化、允许幅度、scope_warning 和原因，避免修订越界。',
    ])
  })

})
