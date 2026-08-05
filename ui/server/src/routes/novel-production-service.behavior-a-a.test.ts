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

describe('production service behavior a a', () => {
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

  test('reuses one deterministic post-delivery repair queue when source execution is replayed', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 25, chapter_no: 33, title: '第三十三章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      unattended: { enabled: true, allow_incomplete: true },
      policy: { quality_threshold: 88, allow_incomplete: true },
      results: [],
    })
    const originalOutput = harness.run.output_ref
    const generateCalls: number[] = []
    let repairEvidence = '段落 3'
    const listRunsWithRepairs = async () => [harness.run, ...harness.appendedRuns]
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: listRunsWithRepairs,
      updateNovelRun: harness.updateNovelRun,
      appendNovelRun: harness.appendNovelRun,
      generateChapterForGroup: async (_workspace, _projectId, chapterId) => {
        generateCalls.push(chapterId)
        return {
          admission_status: 'accepted_with_warnings',
          score: 87,
          revised: false,
          quality_warnings: [{ source: 'quality', code: 'hook_weak', message: '章尾钩子偏弱' }],
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: {
              status: 'warn',
              summary: '正文元信息复检仍有开放项。',
              missed_count: 1,
              evidence: [repairEvidence],
              next_actions: [`修复 ${repairEvidence}`],
            },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
          },
        }
      },
    } as any)

    const first = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 1,
      lock_owner: 'repair-replay-first',
      allow_incomplete: true,
    })
    await harness.updateNovelRun('test-workspace', harness.run.id, {
      status: 'ready',
      output_ref: originalOutput,
      error_message: '',
    })
    const second = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 1,
      lock_owner: 'repair-replay-second',
      allow_incomplete: true,
    })
    repairEvidence = '段落 7'
    await harness.updateNovelRun('test-workspace', harness.run.id, {
      status: 'ready',
      output_ref: originalOutput,
      error_message: '',
    })
    const third = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 1,
      lock_owner: 'repair-replay-changed-detail',
      allow_incomplete: true,
    })

    expect(first.status).toBe('success')
    expect(second.status).toBe('success')
    expect(third.status).toBe('success')
    expect(generateCalls).toEqual([25, 25, 25])
    expect(harness.appendedRuns).toHaveLength(2)
    expect(first.group.results[0].repair_fingerprint).toBeTruthy()
    expect(second.group.results[0].repair_fingerprint).toBe(first.group.results[0].repair_fingerprint)
    expect(second.group.results[0].repair_run_id).toBe(first.group.results[0].repair_run_id)
    expect(third.group.results[0].repair_fingerprint).not.toBe(first.group.results[0].repair_fingerprint)
    expect(third.group.results[0].repair_run_id).not.toBe(first.group.results[0].repair_run_id)
    const repairPayload = JSON.parse(harness.appendedRuns[0].output_ref)
    expect(repairPayload.repair_fingerprint).toBe(first.group.results[0].repair_fingerprint)
    expect(repairPayload.tasks).toHaveLength(1)
    const changedRepairPayload = JSON.parse(harness.appendedRuns[1].output_ref)
    expect(changedRepairPayload.tasks[0].post_delivery_quality.check.evidence).toEqual(['段落 7'])
  })

  test('claims one concurrent run before creating its deterministic repair', async () => {
    const production = createNovelProductionService()
    const harness = makeRunHarness({
      chapters: [
        { id: 26, chapter_no: 34, title: '第三十四章', status: 'pending', stages: production.buildChapterGroupStages() },
      ],
      current_index: 0,
      production_mode: 'full_auto',
      unattended: { enabled: true, allow_incomplete: true },
      policy: { quality_threshold: 88, allow_incomplete: true },
      results: [],
    })
    const initialRun = { ...harness.run }
    const generateCalls: number[] = []
    const service = createNovelRunExecutionService({
      getProject: async () => ({ id: 77, title: '长篇项目', reference_config: {} }),
      production,
      listNovelRuns: async () => [harness.run, ...harness.appendedRuns],
      updateNovelRun: harness.updateNovelRun,
      appendNovelRun: async (workspace, data) => {
        await new Promise(resolve => setTimeout(resolve, 20))
        return harness.appendNovelRun(workspace, data)
      },
      generateChapterForGroup: async (_workspace, _projectId, chapterId) => {
        generateCalls.push(chapterId)
        return {
          admission_status: 'accepted_with_warnings',
          score: 86,
          revised: false,
          story_state_update: {
            chapter_title_uniqueness_sync: { status: 'ok' },
            prose_meta_sync: { status: 'warn', summary: '正文元信息复检仍有开放项。', evidence: ['段落 3'] },
            chapter_hook_sync: { status: 'ok' },
            chapter_blueprint_sync: { status: 'ok' },
            foreshadowing_delta_sync: { status: 'ok' },
            deterministic_prose_cleanup: { status: 'ok', risk_count: 0 },
          },
        }
      },
    } as any)

    const [first, second] = await Promise.all([
      service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, initialRun, {
        max_chapters: 1,
        lock_owner: 'concurrent-repair-first',
        allow_incomplete: true,
      }),
      service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, initialRun, {
        max_chapters: 1,
        lock_owner: 'concurrent-repair-second',
        allow_incomplete: true,
      }),
    ])

    expect([first.status, second.status].sort()).toEqual(['locked', 'success'])
    expect(generateCalls).toEqual([26])
    expect(harness.appendedRuns).toHaveLength(1)
    const winner = [first, second].find(result => result.status === 'success')
    expect(winner.group.results[0].repair_fingerprint).toBeTruthy()
    expect(winner.group.results[0].repair_run_id).toBe(harness.appendedRuns[0].id)
    expect(winner.group.results[0].repair_queue.reused).toBe(false)
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

})
