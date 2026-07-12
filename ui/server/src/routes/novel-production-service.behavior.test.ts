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

describe('executeChapterGroupRunRecord behavior', () => {
  test('does not execute an existing approval blocker before repair and gate recheck', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        {
          id: 101,
          chapter_no: 9,
          title: '第九章',
          status: 'needs_approval',
          approval_stage: 'approval_blocker',
          approval_context: { type: 'reference_safety_blocked', label: '仿写安全阻断' },
          error_code: 'APPROVAL_BLOCKER',
          error: '仿写安全阻断：参考桥段相似度过高',
          stages: production.buildChapterGroupStages(),
        },
        { id: 102, chapter_no: 10, title: '第十章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      phase: '第9章入库阻断未解除，已暂停',
      last_error: {
        id: 101,
        chapter_no: 9,
        approval_stage: 'approval_blocker',
        error_code: 'APPROVAL_BLOCKER',
        recovery_plan: {
          type: 'approval_blocker',
          actions: ['按入库阻断原因修订正文', '重新运行正文质检和入库门禁'],
        },
      },
    })
    const generateCalls: any[] = []
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      generateChapterForGroup: async () => {
        generateCalls.push(true)
        throw new Error('approval blocker should not be regenerated directly')
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, { ...harness.run, status: 'paused' }, {
      max_chapters: 1,
      lock_owner: 'behavior-test',
    })

    expect(result.status).toBe('paused')
    expect(result.processed).toBe(0)
    expect(result.error_code).toBe('APPROVAL_BLOCKER_REQUIRES_REPAIR')
    expect(generateCalls).toHaveLength(0)
    expect(harness.updates).toHaveLength(0)
    expect(result.group.current_index).toBe(0)
    expect(result.group.chapters[0]).toMatchObject({
      status: 'needs_approval',
      approval_stage: 'approval_blocker',
      error_code: 'APPROVAL_BLOCKER',
    })
  })

  test('does not regenerate a stale legacy quality-gate approval item', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        {
          id: 105,
          chapter_no: 11,
          title: '第十一章',
          status: 'needs_approval',
          approval_stage: 'quality_gate',
          error_code: 'APPROVAL_REQUIRED',
          error: '旧调用方留下的质量门禁审批项',
          attempts: 0,
          next_run_at: '',
          stages: production.buildChapterGroupStages(),
        },
        { id: 106, chapter_no: 12, title: '第十二章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      last_error: {
        id: 105,
        chapter_no: 11,
        approval_stage: 'quality_gate',
        error_code: 'APPROVAL_REQUIRED',
      },
    })
    const generateCalls: number[] = []
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, chapterId) => {
        generateCalls.push(chapterId)
        throw new Error('must not regenerate stale approval')
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
    })

    expect(result.status).toBe('paused')
    expect(result.processed).toBe(0)
    expect(result.error_code).toBe('APPROVAL_REQUIRED')
    expect(result.group.current_index).toBe(0)
    expect(generateCalls).toEqual([])
    expect(harness.updates).toHaveLength(0)
  })

  test('advances through multiple unattended chapters only after successful chapter generation', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 11, chapter_no: 1, title: '第一章', status: 'pending', attempts: 2, next_run_at: '2020-01-01T00:00:00.000Z', stages: production.buildChapterGroupStages() },
        { id: 12, chapter_no: 2, title: '第二章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      model_strategy: { preferred_model_id: 136 },
      unattended: {
        enabled: true,
        auto_repair_missing_material: true,
        auto_repair_quality_gate: false,
        advance_rule: 'prose_admitted_then_next_chapter',
        force_scene_cards: true,
        allow_incomplete: false,
      },
      policy: {
        quality_threshold: 88,
        auto_repair_missing_material: true,
        auto_repair_quality_gate: false,
        force_scene_cards: true,
        allow_incomplete: false,
      },
    })
    const generateCalls: any[] = []
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, chapterId, options) => {
        generateCalls.push({ chapterId, options })
        await options.onStage('draft', { status: 'success', scene_status: 'generated' })
        await options.onStage('review', { status: 'success', score: 91 })
        return chapterId === 11 ? {
          admission_status: 'accepted_with_warnings',
          score: 72,
          revised: false,
          quality_gate: { passed: false, score: 72, reasons: ['章尾钩子偏弱'] },
          quality_warnings: ['质量分 72 低于阈值 88'],
          post_commit_warnings: ['正文已入库，索引同步稍后完成'],
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'ok' },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
          },
          config_snapshot: { snapshot_id: `chapter-${chapterId}` },
        } : {
          admission_status: 'accepted',
          score: 91,
          revised: false,
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'ok' },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
          },
          config_snapshot: { snapshot_id: `chapter-${chapterId}` },
        }
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
    })
    const group = result.group

    expect(result.status).toBe('success')
    expect(result.processed).toBe(2)
    expect(group.current_index).toBe(2)
    expect(group.chapters.map((chapter: any) => chapter.status)).toEqual(['success', 'success'])
    expect(group.chapters[0]).toMatchObject({
      admission_status: 'accepted_with_warnings',
      quality_warnings: ['质量分 72 低于阈值 88'],
      post_commit_warnings: ['正文已入库，索引同步稍后完成'],
    })
    expect(group.chapters[0].attempts).toBe(2)
    expect(group.chapters[0].next_run_at).toBe('')
    expect(group.chapters[0].warnings).toEqual(expect.arrayContaining([
      '质量分 72 低于阈值 88',
      '正文已入库，索引同步稍后完成',
    ]))
    expect(group.chapters[0].warning_count).toBeGreaterThanOrEqual(2)
    expect(group.results).toHaveLength(2)
    expect(group.post_batch_quality_check).toMatchObject({
      status: 'ok',
      source: 'oh_story_step_3',
      completed_count: 2,
      chapter_nos: [1, 2],
    })
    expect(group.post_batch_quality_check.checks.map((check: any) => check.key)).toEqual(expect.arrayContaining([
      'title_uniqueness',
      'prose_meta',
      'chapter_hook',
      'blueprint_consumption',
      'foreshadowing_delta',
      'deterministic_cleanup',
      'story_state',
    ]))
    expect(generateCalls.map(call => call.chapterId)).toEqual([11, 12])
    expect(generateCalls[0].options).toMatchObject({
      production_mode: 'full_auto',
      quality_threshold: 88,
      allow_incomplete: false,
      force_scene_cards: true,
      auto_repair_missing_material: true,
      auto_repair_quality_gate: false,
    })
    expect(generateCalls[0].options.approval_policy.allow_full_auto).toBe(true)
  })

  test('persists unattended run progress when chapter diagnostics contain circular references', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 31, chapter_no: 5, title: '第五章', status: 'pending', stages: production.buildChapterGroupStages() },
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
      generateChapterForGroup: async (_workspace, _projectId, _chapterId, options) => {
        await options.onStage('draft', { status: 'success' })
        const configSnapshot: any = { snapshot_id: 'cyclic-config' }
        configSnapshot.self = configSnapshot
        return {
          score: 92,
          revised: false,
          config_snapshot: configSnapshot,
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
      max_chapters: 1,
      lock_owner: 'behavior-test',
    })
    const group = result.group

    expect(result.status).toBe('success')
    expect(group.results[0].config_snapshot).toMatchObject({
      snapshot_id: 'cyclic-config',
      self: '[Circular]',
    })
  })

  test('builds agent config snapshots when writing bible contains circular references', () => {
    const production = createNovelProductionService()
    const writingBible: any = { tone: '紧凑' }
    writingBible.self = writingBible

    const snapshot = production.buildAgentConfigSnapshot({
      id: 77,
      title: '长篇项目',
      reference_config: { writing_bible: writingBible },
    }, 136)

    expect(snapshot.snapshot_id).toMatch(/^agentcfg-v1-/)
    expect(snapshot.writing_bible_hash).toMatch(/^[0-9a-f]{8}$/)
  })

  test('uses safe json for release repair reviews that include context packages', () => {
    const source = readFileSync(join(import.meta.dir, 'novel-delivery-repair-runner.ts'), 'utf8')

    expect(source).not.toContain("payload: JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, context_package: contextPackage")
  })

  test('advances unattended production and queues repair when a chapter returns unknown post-delivery sync evidence', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 21, chapter_no: 3, title: '第三章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 22, chapter_no: 4, title: '第四章', status: 'pending', stages: production.buildChapterGroupStages() },
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
      generateChapterForGroup: async (_workspace, _projectId, chapterId, options) => {
        await options.onStage('draft', { status: 'success' })
        await options.onStage('review', { status: 'success', score: 90 })
        const baseSync = {
          chapter_title_uniqueness_sync: { status: 'ok' },
          prose_meta_sync: { status: 'ok' },
          chapter_hook_sync: { status: 'ok' },
          chapter_blueprint_sync: { status: 'ok' },
          foreshadowing_delta_sync: { status: 'ok' },
          deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
        }
        return {
          score: 90,
          revised: false,
          story_state_update: chapterId === 22
            ? { ...baseSync, prose_meta_sync: undefined }
            : baseSync,
        }
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
    })
    const proseMetaCheck = result.group.results[1].post_delivery_quality.checks.find((check: any) => check.key === 'prose_meta')

    expect(result.status).toBe('success')
    expect(result.processed).toBe(2)
    expect(result.group.current_index).toBe(2)
    expect(result.group.chapters[1]).toMatchObject({
      status: 'success',
    })
    expect(result.group.results[1].recovery_plan).toMatchObject({
      type: 'post_delivery_quality_warn',
      summary: expect.stringContaining('正文已入库'),
    })
    expect(result.group.results[1].repair_run_id).toBe(harness.appendedRuns[0].id)
    expect(harness.appendedRuns).toHaveLength(1)
    expect(harness.appendedRuns[0]).toMatchObject({
      project_id: 77,
      run_type: 'longform_production_repair',
      status: 'ready',
    })
    const repairQueue = JSON.parse(harness.appendedRuns[0].output_ref)
    expect(repairQueue.report).toMatchObject({
      source: 'unattended_post_delivery_quality',
      chapter_no: 4,
      status: 'needs_repair',
    })
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual(['prose_meta_gap'])
    expect(repairQueue.tasks[0]).toMatchObject({
      task_type: 'repair_quality',
      source: 'unattended_post_delivery_quality',
      chapter_no: 4,
      title: '第4章正文元信息修复',
      task_status: 'open',
    })
    expect(repairQueue.tasks[0].post_delivery_quality.check.key).toBe('prose_meta')
    expect(result.group.post_batch_quality_check.status).toBe('warn')
    expect(proseMetaCheck).toMatchObject({
      key: 'prose_meta',
      label: '正文元信息',
      status: 'unknown',
      summary: '第4章未返回正文元信息复检证据。',
    })
  })

  test('queues post-delivery repair and advances when allow_incomplete is enabled', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 23, chapter_no: 31, title: '第三十一章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 24, chapter_no: 32, title: '第三十二章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      unattended: { enabled: true, allow_incomplete: true },
      policy: { quality_threshold: 88, allow_incomplete: true },
    })
    const generateCalls: number[] = []
    const baseSync = {
      chapter_title_uniqueness_sync: { status: 'ok' },
      prose_meta_sync: { status: 'ok' },
      chapter_hook_sync: { status: 'ok' },
      chapter_blueprint_sync: { status: 'ok' },
      foreshadowing_delta_sync: { status: 'ok' },
      deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
    }
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      appendNovelRun: harness.appendNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, chapterId) => {
        generateCalls.push(chapterId)
        return {
          admission_status: 'accepted_with_warnings',
          score: 88,
          revised: false,
          story_state_update: chapterId === 23 ? { ...baseSync, prose_meta_sync: undefined } : baseSync,
        }
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
      allow_incomplete: true,
    })

    expect(result.status).toBe('success')
    expect(result.processed).toBe(2)
    expect(result.group.current_index).toBe(2)
    expect(result.group.chapters.map((chapter: any) => chapter.status)).toEqual(['success', 'success'])
    expect(generateCalls).toEqual([23, 24])
    expect(harness.appendedRuns).toHaveLength(1)
    expect(harness.appendedRuns[0]).toMatchObject({
      run_type: 'longform_production_repair',
      status: 'ready',
    })
    expect(JSON.parse(harness.appendedRuns[0].output_ref).tasks.map((task: any) => task.issue_type)).toEqual(['prose_meta_gap'])
    expect(result.group.results[0].repair_queue.task_count).toBe(1)
  })

  test('advances unattended production when required quality-continuity receipts are missing', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 31, chapter_no: 5, title: '第五章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 32, chapter_no: 6, title: '第六章', status: 'pending', stages: production.buildChapterGroupStages() },
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
          requires_next_chapter_quality_plan_receipts: true,
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
    const qualityContinuityCheck = result.group.results[0].post_delivery_quality.checks.find((check: any) => check.key === 'next_chapter_quality_plan_receipts')
    const repairQueue = JSON.parse(harness.appendedRuns[0].output_ref)

    expect(result.status).toBe('success')
    expect(result.group.current_index).toBe(2)
    expect(result.group.chapters[0]).toMatchObject({
      status: 'success',
    })
    expect(result.group.chapters[1].status).toBe('success')
    expect(harness.appendedRuns).toHaveLength(2)
    expect(qualityContinuityCheck).toMatchObject({
      key: 'next_chapter_quality_plan_receipts',
      label: '质量续航回执',
      status: 'unknown',
      summary: '第5章未返回质量续航回执复检证据。',
    })
    expect(repairQueue.tasks.map((task: any) => task.issue_type)).toEqual(['next_chapter_quality_plan_receipts_gap'])
    expect(repairQueue.tasks[0]).toMatchObject({
      task_type: 'repair_quality',
      source: 'unattended_post_delivery_quality',
      chapter_no: 5,
      title: '第5章质量续航回执修复',
      task_status: 'open',
      action: '补齐 next_chapter_quality_plan_receipts，证明上一章质量续航计划已落成正文证据。',
    })
  })

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

  test('keeps an aborted unattended chapter ready without adding a retry result', async () => {
    const production = createNovelProductionService()
    const abortController = new AbortController()
    abortController.abort()
    const harness = makeRunHarness({
      chapters: [
        { id: 21, chapter_no: 3, title: '第三章', status: 'pending', attempts: 1, stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      policy: { quality_threshold: 80 },
      results: [],
    })
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      generateChapterForGroup: async () => {
        throw Object.assign(new Error('Request canceled'), { code: 'REQUEST_CANCELED' })
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      abortSignal: abortController.signal,
      max_chapters: 1,
      lock_owner: 'behavior-test',
    })
    const group = result.group

    expect(result.status).toBe('ready')
    expect(result.processed).toBe(0)
    expect(group.current_index).toBe(0)
    expect(group.chapters[0]).toMatchObject({
      status: 'ready',
      attempts: 1,
      next_run_at: '',
      error: '',
      error_code: 'REQUEST_CANCELED',
    })
    expect(group.results).toEqual([])
    expect(group.last_error).toBeNull()
  })

  test('pauses blocked_invalid admissions without retries or advancing the next chapter', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 45, chapter_no: 7, title: '第七章', status: 'pending', attempts: 1, stages: production.buildChapterGroupStages() },
        { id: 46, chapter_no: 8, title: '第八章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      unattended: { enabled: true, auto_repair_quality_gate: false },
      policy: { quality_threshold: 88, auto_repair_quality_gate: false },
      results: [],
    })
    const generateCalls: number[] = []
    const primaryRecovery = {
      type: 'blocked_invalid',
      summary: '正文未通过结构有效性检查，未入库。',
      actions: ['检查缺失正文段落和硬约束', '人工修复后重新提交当前章'],
    }
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, chapterId) => {
        generateCalls.push(chapterId)
        throw Object.assign(new Error('正文结构无效，未入库'), {
          code: 'PROSE_ADMISSION_BLOCKED_INVALID',
          admission_status: 'blocked_invalid',
          recovery_plan: primaryRecovery,
        })
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
      retry_limit: 3,
    })
    const group = result.group

    expect(result.status).toBe('paused')
    expect(result.processed).toBe(0)
    expect(group.current_index).toBe(0)
    expect(generateCalls).toEqual([45])
    expect(group.chapters[0]).toMatchObject({
      status: 'failed',
      admission_status: 'blocked_invalid',
      attempts: 1,
      next_run_at: '',
      error: '正文结构无效，未入库',
      error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
      recovery_plan: primaryRecovery,
    })
    expect(group.chapters[1].status).toBe('pending')
    expect(JSON.stringify(group)).not.toContain('QUALITY_GATE_RETRY_REQUIRED')
  })

  test('does not advance when material repair still leaves the current chapter preflight blocked', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 51, chapter_no: 9, title: '第九章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 52, chapter_no: 10, title: '第十章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      policy: {
        quality_threshold: 88,
        auto_repair_missing_material: true,
        auto_repair_quality_gate: true,
        force_scene_cards: true,
        allow_incomplete: false,
      },
      results: [],
    })
    const generateCalls: number[] = []
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, chapterId) => {
        generateCalls.push(chapterId)
        throw Object.assign(new Error('章节生成前置检查未通过'), {
          code: 'PROSE_PREFLIGHT_BLOCKED',
          contextPackage: { preflight: { ready: false, blockers: ['缺少章节蓝图'] } },
        })
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
      retry_limit: 2,
    })
    const group = result.group

    expect(result.status).toBe('ready')
    expect(result.processed).toBe(0)
    expect(group.current_index).toBe(0)
    expect(generateCalls).toEqual([51])
    expect(group.chapters[0]).toMatchObject({
      status: 'ready',
      attempts: 1,
      error_code: 'PROSE_PREFLIGHT_BLOCKED',
    })
    expect(group.chapters[0].next_run_at).toBeTruthy()
    expect(group.chapters[0].recovery_plan).toMatchObject({ type: 'preflight_blocked' })
    expect(group.chapters[1].status).toBe('pending')
    expect(group.results).toHaveLength(1)
  })

  test('does not enable quality-gate regeneration while advancing admitted chapters', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 41, chapter_no: 7, title: '第七章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 42, chapter_no: 8, title: '第八章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      policy: {
        quality_threshold: 89,
        auto_repair_missing_material: true,
        auto_repair_quality_gate: false,
        force_scene_cards: true,
        allow_incomplete: false,
      },
      results: [],
    })
    const generateCalls: any[] = []
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      appendNovelRun: harness.appendNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, chapterId, options) => {
        generateCalls.push({ chapterId, options })
        await options.onStage('review', {
          status: 'success',
          score: chapterId === 41 ? 91 : 90,
          quality_gate_repair: chapterId === 41,
        })
        return {
          admission_status: 'accepted',
          score: chapterId === 41 ? 91 : 90,
          revised: chapterId === 41,
          story_state_update: {},
          config_snapshot: { snapshot_id: `quality-repaired-${chapterId}` },
        }
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
    })
    const group = result.group

    expect(result.status).toBe('success')
    expect(result.processed).toBe(2)
    expect(group.current_index).toBe(2)
    expect(generateCalls.map(call => call.chapterId)).toEqual([41, 42])
    expect(generateCalls.every(call => call.options.auto_repair_quality_gate === false)).toBe(true)
    expect(generateCalls.every(call => call.options.quality_threshold === 89)).toBe(true)
    expect(group.chapters[0]).toMatchObject({ status: 'success', revised: true, score: 91 })
    expect(group.chapters[1]).toMatchObject({ status: 'success', revised: false, score: 90 })
  })

  test('treats legacy APPROVAL_REQUIRED quality-gate errors as terminal and non-retryable', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 91, chapter_no: 21, title: '第二十一章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 92, chapter_no: 22, title: '第二十二章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      unattended: {
        enabled: true,
        auto_repair_quality_gate: true,
        allow_incomplete: false,
      },
      policy: {
        quality_threshold: 90,
        auto_repair_quality_gate: true,
        allow_incomplete: false,
      },
      results: [],
    })
    const generateCalls: number[] = []
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, chapterId) => {
        generateCalls.push(chapterId)
        throw Object.assign(new Error('章节质量门禁未通过，正文未入库'), {
          code: 'APPROVAL_REQUIRED',
          approval_stage: 'quality_gate',
          approval_context: { passed: false, score: 72, min_score: 90, reasons: ['钩子弱'] },
        })
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
      retry_limit: 2,
    })
    const group = result.group

    expect(result.status).toBe('paused')
    expect(result.processed).toBe(0)
    expect(generateCalls).toEqual([91])
    expect(group.current_index).toBe(0)
    expect(group.chapters[0]).toMatchObject({
      status: 'needs_approval',
      attempts: 0,
      approval_stage: 'quality_gate',
      error_code: 'APPROVAL_REQUIRED',
    })
    expect(group.chapters[0].next_run_at || '').toBe('')
    expect(group.chapters[1].status).toBe('pending')
    expect(group.last_error.error_code).toBe('APPROVAL_REQUIRED')
    expect(JSON.stringify(group)).not.toContain('QUALITY_GATE_RETRY_REQUIRED')
  })

  test('compacts bulky unattended stage payloads while preserving resumable group state', async () => {
    const production = createNovelProductionService()
    const hugeText = '质量诊断重复文本'.repeat(20000)
    const harness = makeRunHarness({
      chapters: [
        { id: 95, chapter_no: 25, title: '第二十五章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      policy: {
        quality_threshold: 88,
        auto_repair_quality_gate: true,
        allow_incomplete: false,
      },
      results: [],
    })
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, _chapterId, options) => {
        await options.onStage('scene_cards', {
          status: 'success',
          scene_cards: [
            {
              scene_no: 1,
              title: '巨量场景卡',
              purpose: hugeText,
              conflict: hugeText,
              goal: hugeText,
              obstacle: hugeText,
              change: hugeText,
            },
          ],
          diagnostics: { raw_prompt: hugeText, model_response: hugeText },
        })
        throw new Error('模拟后续失败')
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 1,
      lock_owner: 'behavior-test',
      retry_limit: 0,
    })
    const persisted = JSON.parse(harness.run.output_ref)

    expect(result.status).toBe('paused')
    expect(harness.run.output_ref.length).toBeLessThan(30000)
    expect(persisted.chapters).toHaveLength(1)
    expect(persisted.chapters[0]).toMatchObject({
      id: 95,
      chapter_no: 25,
      status: 'failed',
      error: '模拟后续失败',
    })
    expect(JSON.stringify(persisted)).not.toContain(hugeText.slice(0, 2000))
  })

  test('preserves a returned blocked_invalid admission as terminal instead of approval', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 97, chapter_no: 27, title: '第二十七章', status: 'pending', attempts: 0, stages: production.buildChapterGroupStages() },
        { id: 98, chapter_no: 28, title: '第二十八章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      unattended: { enabled: true, auto_repair_quality_gate: false },
      policy: { quality_threshold: 88, auto_repair_quality_gate: false },
      results: [],
    })
    const generateCalls: number[] = []
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, chapterId) => {
        generateCalls.push(chapterId)
        return {
          admission_status: 'blocked_invalid',
          error: '正文传输不完整，未入库',
          score: 0,
        }
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
      retry_limit: 3,
    })

    expect(result.status).toBe('paused')
    expect(result.processed).toBe(0)
    expect(result.group.current_index).toBe(0)
    expect(generateCalls).toEqual([97])
    expect(result.group.chapters[0]).toMatchObject({
      status: 'failed',
      admission_status: 'blocked_invalid',
      attempts: 0,
      next_run_at: '',
      error_code: 'PROSE_ADMISSION_BLOCKED_INVALID',
    })
    expect(result.group.chapters[0].approval_stage || '').toBe('')
    expect(result.group.chapters[1].status).toBe('pending')
  })

  test('pauses unattended continuation when a returned chapter result still has an approval blocker', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 81, chapter_no: 14, title: '第十四章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 82, chapter_no: 15, title: '第十五章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      policy: {
        quality_threshold: 88,
        auto_repair_missing_material: true,
        auto_repair_quality_gate: true,
        force_scene_cards: true,
        allow_incomplete: false,
      },
      results: [],
    })
    const generateCalls: number[] = []
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, chapterId, options) => {
        generateCalls.push(chapterId)
        await options.onStage('draft', { status: 'success', scene_status: 'generated' })
        await options.onStage('review', { status: 'success', score: 92 })
        return {
          score: 92,
          revised: true,
          approval_blocker: {
            type: 'reference_safety_blocked',
            label: '仿写安全阻断',
            detail: '参考桥段相似度过高',
            score_label: '入库阻断 92',
            reasons: ['连续事件节奏过近'],
          },
          story_state_update: {},
          config_snapshot: { snapshot_id: `approval-blocker-${chapterId}` },
        }
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
    })
    const group = result.group

    expect(result.status).toBe('paused')
    expect(result.processed).toBe(0)
    expect(group.current_index).toBe(0)
    expect(generateCalls).toEqual([81])
    expect(group.chapters[0]).toMatchObject({
      status: 'needs_approval',
      approval_stage: 'approval_blocker',
      error_code: 'APPROVAL_BLOCKER',
    })
    expect(group.chapters[0].approval_context).toMatchObject({
      type: 'reference_safety_blocked',
      label: '仿写安全阻断',
    })
    expect(group.chapters[1].status).toBe('pending')
    expect(group.results).toHaveLength(1)
    expect(group.last_error.error_code).toBe('APPROVAL_BLOCKER')
  })

  test('advances when Story State is pending and persists warning evidence through compact output', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 61, chapter_no: 12, title: '第十二章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 62, chapter_no: 13, title: '第十三章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      policy: {
        quality_threshold: 88,
        auto_repair_missing_material: true,
        auto_repair_quality_gate: true,
        force_scene_cards: true,
        allow_incomplete: false,
      },
      results: [],
    })
    const generateCalls: number[] = []
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      appendNovelRun: harness.appendNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, chapterId, options) => {
        generateCalls.push(chapterId)
        await options.onStage('draft', { status: 'success', scene_status: 'generated' })
        await options.onStage('review', { status: 'success', score: 92 })
        if (chapterId === 61) await options.onStage('story_state', { status: 'pending', warning: '状态机异步同步排队中' })
        return chapterId === 61 ? {
          admission_status: 'accepted_with_warnings',
          score: 92,
          revised: false,
          story_state_status: 'pending',
          story_state_warning: '状态机异步同步排队中',
          story_state_update: { skipped: true },
          config_snapshot: { snapshot_id: `story-state-pending-${chapterId}` },
        } : {
          admission_status: 'accepted',
          score: 92,
          revised: false,
          story_state_status: 'success',
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'ok' },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
          },
          config_snapshot: { snapshot_id: `story-state-success-${chapterId}` },
        }
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
    })
    const group = result.group

    expect(result.status).toBe('success')
    expect(result.processed).toBe(2)
    expect(group.current_index).toBe(2)
    expect(generateCalls).toEqual([61, 62])
    expect(group.chapters[0]).toMatchObject({
      status: 'success',
      admission_status: 'accepted_with_warnings',
      story_state_status: 'pending',
    })
    expect(group.chapters[0].warnings).toContain('状态机异步同步排队中')
    expect(group.chapters[0].warning_count).toBeGreaterThanOrEqual(1)
    expect(group.chapters[0].stages.find((stage: any) => stage.key === 'story_state').status).not.toBe('failed')
    expect(group.chapters[1].status).toBe('success')
    expect(group.results).toHaveLength(2)
    expect(group.last_error).toBeNull()
  })

  test('pauses at the current chapter for an explicit legacy safety approval blocker', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 31, chapter_no: 5, title: '第五章', status: 'pending', stages: production.buildChapterGroupStages() },
        { id: 32, chapter_no: 6, title: '第六章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      policy: {
        quality_threshold: 90,
        auto_repair_missing_material: true,
        auto_repair_quality_gate: true,
        force_scene_cards: true,
        allow_incomplete: false,
      },
      results: [],
    })
    const generateCalls: number[] = []
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: harness.listNovelRuns,
      updateNovelRun: harness.updateNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, chapterId) => {
        generateCalls.push(chapterId)
        throw Object.assign(new Error('仿写安全需要人工确认，正文未入库'), {
          code: 'APPROVAL_REQUIRED',
          approval_stage: 'safety',
          approval_context: { risk_level: 'high', copy_hit_count: 1 },
        })
      },
    } as any)

    const result = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test',
    })
    const group = result.group

    expect(result.status).toBe('paused')
    expect(result.processed).toBe(0)
    expect(group.current_index).toBe(0)
    expect(generateCalls).toEqual([31])
    expect(group.chapters[0]).toMatchObject({
      status: 'needs_approval',
      attempts: 0,
      approval_stage: 'safety',
      error_code: 'APPROVAL_REQUIRED',
    })
    expect(group.chapters[1].status).toBe('pending')
    expect(group.results).toHaveLength(1)
    expect(group.last_error.approval_stage).toBe('safety')
  })
})
