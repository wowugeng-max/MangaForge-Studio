import { afterEach, describe, expect, test } from 'bun:test'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { Database } from 'bun:sqlite'
import {
  appendNovelRun,
  compactNovelStorage,
  createNovelChapter,
  createNovelProject,
  createNovelReview,
  listNovelChapters,
  listNovelReviews,
  listNovelRuns,
} from '../novel'
import { setNovelMutationTestHook } from '../novel-test-support'
import {
  workspaces,
  tempWorkspace,
  exists,
  holdSqliteWriteLock,
  spawnBarrieredChapterUpdate,
  waitForPath,
  snapshotNovelAcceptanceStore,
  snapshotNovelReferenceStore,
} from './test-utils'

afterEach(async () => {
  const { rm } = await import('fs/promises')
  await Promise.all(workspaces.splice(0).map(workspace => rm(workspace, { recursive: true, force: true })))
  setNovelMutationTestHook(null)
})

describe('novel diagnostic payload compaction', () => {
  test('caps oversized run refs and review payloads before persistence', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '日志压缩测试' })
    const hugeText = '上下文'.repeat(40000)

    await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'generate_prose',
      step_name: 'chapter-1',
      status: 'success',
      input_ref: hugeText,
      output_ref: JSON.stringify({ context_package: { hugeText }, final_text: '正文' }),
    })
    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'prose_quality',
      status: 'ok',
      summary: '诊断摘要',
      payload: JSON.stringify({ context_package: { hugeText }, issues: [] }),
    })

    const [run] = await listNovelRuns(workspace, project.id)
    const [review] = await listNovelReviews(workspace, project.id)

    expect(run.input_ref.length).toBeLessThan(70000)
    expect(run.output_ref.length).toBeLessThan(70000)
    expect(review.payload?.length || 0).toBeLessThan(70000)
    expect(run.input_ref).toContain('"truncated":true')
    expect(run.output_ref).toContain('"omitted":true')
    expect(review.payload).toContain('"omitted":true')
    expect(run.output_ref).not.toContain(hugeText)
    expect(review.payload).not.toContain(hugeText)
  })

  test('preserves admission summary fields when run output is storage-truncated', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '入库摘要保留' })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 13,
      title: '盟友入局',
      chapter_text: '正文'.repeat(3000),
    })
    // Keep two near-limit diagnostic strings so compacted JSON still exceeds the storage budget.
    const hugePayload = {
      chapter: {
        id: chapter.id,
        chapter_no: 13,
        title: '盟友入局',
        chapter_text: '正文字符'.repeat(2000),
      },
      admission_status: 'accepted_with_warnings',
      quality_score: 92,
      quality_warnings: [{ source: 'quality', code: 'quality_advisory', message: '替换一级禁用词' }],
      story_state_status: 'pending',
      prose_admission: {
        status: 'accepted_with_warnings',
        quality_score: 92,
        quality_warnings: [{ source: 'quality', code: 'quality_advisory', message: '替换一级禁用词' }],
        story_state_status: 'pending',
      },
      diagnostic_a: 'A'.repeat(50000),
      diagnostic_b: 'B'.repeat(50000),
    }
    const run = await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'generate_prose',
      step_name: 'chapter-13',
      status: 'success',
      output_ref: JSON.stringify(hugePayload),
    })
    const stored = JSON.parse(String(run.output_ref || '{}'))
    expect(stored.truncated).toBe(true)
    expect(stored.admission_status).toBe('accepted_with_warnings')
    expect(Number(stored.chapter_id || 0)).toBe(chapter.id)
    expect(Number(stored.chapter_no || 0)).toBe(13)
    expect(stored.prose_admission?.status || stored.quality_score).toBeTruthy()
  })


  test('keeps prose quality review payload readable after compaction', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '质检摘要压缩测试' })
    const hugeFinding = '这一项质检问题需要保留为可读摘要，但不能把整段模型诊断都塞进数据库。'.repeat(2000)

    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'prose_quality',
      status: 'warn',
      summary: '章节自检评分 72',
      payload: JSON.stringify({
        chapter_id: 9,
        chapter_updated_at: '2026-07-05T01:00:00.000Z',
        content_hash: 'abcdef1234567890',
        source: 'manual_refresh',
        context_package: {
          preflight: {
            ready: false,
            warnings: ['上下文缺口：追踪/时间线缺失', hugeFinding],
            checks: [
              { key: 'timeline_tracking', label: '追踪/时间线', ok: false, severity: 'medium', fix: hugeFinding },
            ],
          },
          chapter_target: {
            id: 9,
            chapter_no: 9,
            title: '第九章',
            scene_cards: [{ title: '巨量场景', purpose: hugeFinding }],
          },
          continuity: {
            previous_chapter: { chapter_no: 8, title: '第八章', ending_hook: hugeFinding },
          },
        },
        self_check: {
          final_text: '正文全文'.repeat(30000),
          revised: false,
          review: {
            passed: false,
            score: 72,
            needs_revision: true,
            craft_metrics: {
              action_detail_score: 41,
              event_density_score: 52,
              description_overuse_score: 88,
            },
            focused_revision_modes: ['expand_action', 'tighten_pacing', 'add_consequence'],
            revision_directives: [hugeFinding, '补足主角动作选择。'],
            issues: Array.from({ length: 10 }, (_, index) => ({
              severity: index < 2 ? 'high' : 'medium',
              type: `issue_${index}`,
              message: hugeFinding,
              fix: hugeFinding,
            })),
            platform_checks: Array.from({ length: 12 }, (_, index) => ({ key: `platform_${index}`, label: hugeFinding, status: 'warn', evidence: hugeFinding })),
            content_rubric_checks: Array.from({ length: 12 }, (_, index) => ({ key: `rubric_${index}`, label: hugeFinding, status: 'warn', fix: hugeFinding })),
          },
        },
        pipeline: [{ key: 'review', label: '章节级自检', status: 'failed', detail: hugeFinding }],
      }),
    })

    const [review] = await listNovelReviews(workspace, project.id)
    const payload = JSON.parse(String(review.payload || '{}'))
    const payloadText = JSON.stringify(payload)

    expect(payload.truncated).toBeUndefined()
    expect(payloadText.length).toBeLessThan(60000)
    expect(payloadText).not.toContain(hugeFinding.slice(0, 2000))
    expect(payload.chapter_id).toBe(9)
    expect(payload.context_package.chapter_target.chapter_no).toBe(9)
    expect(payload.context_package.chapter_target.title).toBe('第九章')
    expect(payload.context_package.preflight.ready).toBe(false)
    expect(payload.context_package.preflight.warnings[0]).toContain('上下文缺口')
    expect(payload.self_check.review.score).toBe(72)
    expect(payload.self_check.review.issues[0].severity).toBe('high')
    expect(payload.self_check.review.revision_directives[1]).toBe('补足主角动作选择。')
    expect(payload.self_check.final_text).toEqual({ omitted: true, reason: 'storage_compaction' })
    expect(payload.pipeline[0]).toMatchObject({ key: 'review', label: '章节级自检', status: 'failed' })
  })

  test('preserves exact prose quality receipt keys without persisting source or candidate prose', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '质检回执压缩测试' })
    const prose = '不应持久化的候选正文'.repeat(1000)

    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'prose_quality',
      status: 'ok',
      payload: JSON.stringify({
        chapter_id: 2,
        source_run_id: 44,
        candidate_hash: 'candidate-44',
        current_chapter_only: true,
        source_text: prose,
        candidate_text: prose,
        self_check: { final_text: prose, review: { score: 90 } },
      }),
    })
    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'prose_quality',
      status: 'ok',
      payload: JSON.stringify({
        chapterId: 3,
        sourceRunId: 45,
        candidateHash: 'candidate-45',
        currentChapterOnly: true,
        sourceText: prose,
        candidateText: prose,
        selfCheck: { finalText: prose, review: { score: 91 } },
      }),
    })

    const payloads = (await listNovelReviews(workspace, project.id))
      .map(review => JSON.parse(String(review.payload || '{}')))
      .sort((a, b) => Number(a.chapter_id) - Number(b.chapter_id))
    expect(payloads[0]).toMatchObject({
      chapter_id: 2,
      source_run_id: 44,
      candidate_hash: 'candidate-44',
      current_chapter_only: true,
    })
    expect(payloads[1]).toMatchObject({
      chapter_id: 3,
      source_run_id: 45,
      candidate_hash: 'candidate-45',
      current_chapter_only: true,
    })
    expect(JSON.stringify(payloads)).not.toContain(prose.slice(0, 100))
    expect(payloads.every(payload => payload.source_text === undefined && payload.candidate_text === undefined)).toBe(true)
    expect(payloads.every(payload => payload.self_check.final_text?.omitted === true)).toBe(true)
  })

  test('keeps unrecoverable prose quality preview payloads intact', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '历史质检预览保护测试' })
    const compactedPreview = {
      truncated: true,
      reason: 'storage_compaction',
      original_chars: 143327,
      preview: '{"chapter_id":6,"context_package":{"summary":{"chapter_title":"小镇追索"}',
    }

    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'prose_quality',
      status: 'warn',
      summary: '章节自检评分 80',
      payload: JSON.stringify(compactedPreview),
    })

    const [review] = await listNovelReviews(workspace, project.id)
    const payload = JSON.parse(String(review.payload || '{}'))

    expect(payload).toMatchObject(compactedPreview)
    expect(payload.self_check).toBeUndefined()
    expect(payload.context_package).toBeUndefined()
  })

  test('compacts existing oversized sqlite payload columns without loading the full store', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '历史清理测试' })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      raw_payload: { keep: '章节蓝图', context_package: { hugeText: '旧上下文'.repeat(50000) } },
    })
    await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'generate_prose',
      step_name: 'chapter-1',
      status: 'success',
      output_ref: '旧输出'.repeat(50000),
    })
    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'prose_quality',
      status: 'ok',
      payload: '旧诊断'.repeat(50000),
    })

    const db = new Database(join(workspace, 'novel.sqlite'))
    try {
      db.query('UPDATE runs SET output_ref=?, pipeline_chapter_failure_count=9, pipeline_open_task_count=9, pipeline_task_count=9').run(JSON.stringify({
        chapters: [{ status: 'completed' }],
        tasks: [{ task_status: ['failed'] }],
        context_package: { hugeText: '历史 run'.repeat(50000) },
      }))
      db.query('UPDATE reviews SET payload=?').run('历史 review'.repeat(50000))
      db.query('UPDATE chapters SET raw_payload=? WHERE id=?').run(JSON.stringify({
        keep: '章节蓝图',
        context_package: { hugeText: '历史上下文'.repeat(50000) },
      }), chapter.id)
    } finally {
      db.close()
    }

    const result = await compactNovelStorage(workspace)
    const dbAfter = new Database(join(workspace, 'novel.sqlite'))
    try {
      const lengths = dbAfter.query(`
        SELECT
          (SELECT length(output_ref) FROM runs LIMIT 1) AS run_bytes,
          (SELECT length(payload) FROM reviews LIMIT 1) AS review_bytes,
          (SELECT length(raw_payload) FROM chapters WHERE id=? LIMIT 1) AS chapter_bytes
      `).get(chapter.id) as any
      const chapterPayload = JSON.parse(String((dbAfter.query('SELECT raw_payload FROM chapters WHERE id=?').get(chapter.id) as any).raw_payload || '{}'))

      expect(result.compacted).toBeGreaterThanOrEqual(3)
      expect(lengths.run_bytes).toBeLessThan(70000)
      expect(lengths.review_bytes).toBeLessThan(70000)
      expect(lengths.chapter_bytes).toBeLessThan(70000)
      expect(chapterPayload.keep).toBe('章节蓝图')
      expect(chapterPayload.context_package).toMatchObject({ omitted: true, reason: 'storage_compaction' })
      expect(dbAfter.query(`
        SELECT pipeline_chapter_failure_count, pipeline_open_task_count, pipeline_task_count
        FROM runs LIMIT 1
      `).get()).toMatchObject({
        pipeline_chapter_failure_count: 0,
        pipeline_open_task_count: 1,
        pipeline_task_count: 1,
      })
    } finally {
      dbAfter.close()
    }
  })

  test('does not persist nested raw payload or chapter text copies inside chapter raw payload', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '章节原始载荷去重测试' })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: '正文内容'.repeat(1000),
      raw_payload: {
        blueprint: '保留蓝图',
        raw_payload: { nested: '不应该继续嵌套' },
      },
    })

    const updated = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 2,
      title: '第二章',
      raw_payload: {
        previous: chapter.raw_payload,
        chapter_text: '正文副本'.repeat(1000),
      },
    })
    const chapters = await listNovelChapters(workspace, project.id)
    const second = chapters.find(item => item.id === updated.id)!

    expect(second.raw_payload.previous.blueprint).toBe('保留蓝图')
    expect(second.raw_payload.raw_payload).toBeUndefined()
    expect(second.raw_payload.previous.raw_payload).toBeUndefined()
    expect(second.raw_payload.chapter_text).toEqual({ omitted: true, reason: 'storage_compaction' })
    expect(JSON.stringify(second.raw_payload).length).toBeLessThan(5000)
  })

  test('compacts repeated scene diagnostics inside chapter raw payload', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '场景诊断压缩测试' })
    const mediumDiagnostic = '上一章交付风险必须在本章承接。'.repeat(6000)
    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      raw_payload: {
        blueprint: '保留蓝图',
        scene_breakdown: [
          {
            scene_no: 1,
            title: '目标入场',
            purpose: mediumDiagnostic,
            conflict: mediumDiagnostic,
            change: mediumDiagnostic,
            purpose_tags: Array.from({ length: 18 }, (_, index) => `${index}-${mediumDiagnostic}`),
          },
        ],
        generated_scene_breakdown: [
          {
            scene_no: 1,
            title: '生成场景',
            purpose: mediumDiagnostic,
            conflict: mediumDiagnostic,
          },
        ],
      },
    })

    const [chapter] = await listNovelChapters(workspace, project.id)
    const rawText = JSON.stringify(chapter.raw_payload)

    expect(chapter.raw_payload.blueprint).toBe('保留蓝图')
    expect(rawText.length).toBeLessThan(20000)
    expect(rawText).not.toContain(mediumDiagnostic.slice(0, 2000))
    expect(chapter.raw_payload.scene_breakdown[0].title).toBe('目标入场')
    expect(chapter.raw_payload.scene_breakdown[0].purpose.length).toBeLessThan(500)
    expect(chapter.raw_payload.scene_breakdown[0].purpose_tags.length).toBeLessThanOrEqual(6)
  })

  test('compacts oversized pre draft brief contracts while preserving writing cues', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '写前准备压缩测试' })
    const hugeContract = '合同细则必须在正文中逐项兑现。'.repeat(30000)
    const hugeSceneText = '场景目标、阻碍、变化需要持续跟踪。'.repeat(8000)

    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      raw_payload: {
        pre_draft_brief: {
          chapter_goal: '确认主角进入禁区的代价',
          reader_promise: '本章兑现一次明确的冒险回报',
          core_conflict: '主角必须在救人和保密之间选择',
          emotional_curve: '紧张 -> 侥幸 -> 代价显现',
          chapter_blueprint: {
            target_emotion: hugeContract,
            opening_hook: '禁区钟声提前响起',
            core_payoff: hugeContract,
            content_outline: [hugeContract, hugeContract, hugeContract],
          },
          next_chapter_quality_plan: { quality_focus: hugeContract },
          write_preparation_brief: { checklist: [hugeContract, hugeContract] },
          style_sample_strategy: { sample: hugeContract },
          chapter_benchmark_strategy: { benchmark: hugeContract },
          scene_briefs: [
            {
              scene_no: 1,
              title: '禁区入口',
              purpose: hugeSceneText,
              obstacle: hugeSceneText,
              change: hugeSceneText,
            },
          ],
          character_behavior_contract: { rules: hugeContract, evidence: hugeContract },
          plot_framework_contract: { rules: hugeContract, evidence: hugeContract },
          plot_dynamics_contract: { rules: hugeContract, evidence: hugeContract },
          target_reader_contract: { rules: hugeContract, evidence: hugeContract },
          dialogue_contract: { rules: hugeContract, evidence: hugeContract },
          continuity_heat_contract: { rules: hugeContract, evidence: hugeContract },
          asset_linkage_contract: { rules: hugeContract, evidence: hugeContract },
          information_flow_contract: { rules: hugeContract, evidence: hugeContract },
        },
      },
    })

    const [chapter] = await listNovelChapters(workspace, project.id)
    const rawText = JSON.stringify(chapter.raw_payload)
    const brief = chapter.raw_payload.pre_draft_brief

    expect(rawText.length).toBeLessThan(30000)
    expect(rawText).not.toContain(hugeContract.slice(0, 2000))
    expect(rawText).not.toContain(hugeSceneText.slice(0, 2000))
    expect(brief.chapter_goal).toBe('确认主角进入禁区的代价')
    expect(brief.reader_promise).toBe('本章兑现一次明确的冒险回报')
    expect(brief.core_conflict).toBe('主角必须在救人和保密之间选择')
    expect(brief.scene_briefs[0].title).toBe('禁区入口')
    expect(brief.scene_briefs[0].purpose.length).toBeLessThan(500)
    expect(brief.character_behavior_contract).toMatchObject({ omitted: true, reason: 'storage_compaction' })
  })

  test('preserves confirmation metadata while compacting oversized pre draft briefs', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '写前确认元数据压缩测试' })
    const confirmedAt = '2026-07-11T01:00:00.000Z'
    const updatedAt = '2026-07-11T01:01:00.000Z'
    const oversizedContracts = Object.fromEntries(
      Array.from({ length: 44 }, (_, index) => [
        `extended_${index}_contract`,
        { rules: `第 ${index + 1} 份写前合同必须保留执行摘要。`.repeat(200) },
      ]),
    )

    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      raw_payload: {
        pre_draft_brief: {
          ...oversizedContracts,
          confirmed_at: confirmedAt,
          confirmation_source: 'manual_author_confirmation',
          updated_at: updatedAt,
        },
      },
    })

    const [chapter] = await listNovelChapters(workspace, project.id)
    const brief = chapter.raw_payload.pre_draft_brief

    expect(brief.confirmed_at).toBe(confirmedAt)
    expect(brief.confirmation_source).toBe('manual_author_confirmation')
    expect(brief.updated_at).toBe(updatedAt)
  })

  test('preserves state tracking source readiness rows while compacting pre draft briefs', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '写前来源就绪压缩测试' })
    const standardSourceRows = [
      'chapter_blueprint',
      'previous_chapter',
      'context_tracking',
      'serial_story_state',
      'timeline_tracking',
      'delivery_risk_carry_over',
      'character_state',
      'foreshadowing_history',
      'world_constraints',
    ].map(key => ({ key, status: 'ready', evidence: `${key} 已读取` }))
    const customMissingRow = {
      key: 'custom_editorial_source',
      status: 'missing',
      evidence: '编辑自定义来源尚未补齐',
    }
    const sourceRows = [...standardSourceRows, customMissingRow]
    const hugeDiagnostic = '写前压缩仍需保留关键来源就绪行。'.repeat(30000)

    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      raw_payload: {
        pre_draft_brief: {
          chapter_goal: hugeDiagnostic,
          state_tracking_contract: {
            source_readiness: sourceRows,
            sourceReadiness: sourceRows,
            unrelated_rows: sourceRows,
          },
        },
      },
    })

    const [chapter] = await listNovelChapters(workspace, project.id)
    const brief = chapter.raw_payload.pre_draft_brief
    const stateTracking = brief.state_tracking_contract

    expect(stateTracking.source_readiness).toHaveLength(10)
    expect(stateTracking.source_readiness.at(-1)).toMatchObject(customMissingRow)
    expect(stateTracking.sourceReadiness).toHaveLength(10)
    expect(stateTracking.sourceReadiness.at(-1)).toMatchObject(customMissingRow)
    expect(stateTracking.unrelated_rows).toHaveLength(9)
    expect(stateTracking.unrelated_rows.at(-1)).toMatchObject({
      omitted: true,
      reason: 'storage_compaction',
      truncated: true,
      original_count: 2,
    })
    expect(JSON.stringify(chapter.raw_payload)).not.toContain(hugeDiagnostic.slice(0, 2000))
  })
})
