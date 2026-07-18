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

describe('production service behavior b b', () => {
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

    const resumed = await service.executeChapterGroupRunRecord('test-workspace', { id: 77, reference_config: {} }, harness.run, {
      max_chapters: 2,
      lock_owner: 'behavior-test-resume',
      retry_limit: 3,
    })

    expect(resumed.status).toBe('paused')
    expect(resumed.processed).toBe(0)
    expect(resumed.group.current_index).toBe(0)
    expect(generateCalls).toEqual([45])
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
