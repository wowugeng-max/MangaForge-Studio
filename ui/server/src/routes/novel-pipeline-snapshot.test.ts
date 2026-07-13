import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { Database } from 'bun:sqlite'
import {
  appendNovelRun,
  createNovelChapter,
  createNovelCharacter,
  createNovelOutline,
  createNovelProject,
  createNovelReview,
  createNovelWorldbuilding,
  getNovelPipelineSnapshot,
  getNovelProject,
  listNovelChapters,
  listNovelCharacters,
  listNovelOutlines,
  listNovelReviews,
  listNovelRuns,
  listNovelWorldbuilding,
} from '../novel'
import { buildNovelPipelineSummary } from './novel-pipeline-service'

const workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-pipeline-snapshot-'))
  workspaces.push(workspace)
  return workspace
}

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map(workspace => rm(workspace, { recursive: true, force: true })))
})

function stablePipeline(summary: any) {
  return {
    current_stage: summary.current_stage,
    primary_action: summary.primary_action,
    summary: summary.summary,
    stages: summary.stages,
  }
}

async function createAcceptedPipelineFixture(workspace: string, title: string) {
  const project = await createNovelProject(workspace, {
    title,
    reference_config: {
      writing_bible: {
        reader_promise: '每章都有破局推进',
        protagonist_drive: '主角必须夺回火种',
        core_conflict: '新火与旧规对抗',
        current_volume_goal: '进入大荒门',
        innovation_hook: '符火审案',
        first30_plan: '前三十章完成入门破局',
        longform_capacity: '九卷火种谜团',
      },
      story_state: { last_updated_chapter: 1 },
    },
  })
  const chapter = await createNovelChapter(workspace, {
    project_id: project.id,
    chapter_no: 1,
    title: '火种复明',
    chapter_goal: '夺回火种',
    conflict: '旧规拦截',
    chapter_text: '主角在旧门前夺回火种。'.repeat(200),
    raw_payload: { scene_cards: [{ purpose: '公开破局' }] },
  })
  await createNovelOutline(workspace, { project_id: project.id, title: '第1章 火种复明', raw_payload: { chapter_no: 1 } })
  await createNovelWorldbuilding(workspace, { project_id: project.id, world_summary: '大荒门以旧规约束符火。' })
  await createNovelCharacter(workspace, { project_id: project.id, name: '丁松言', goal: '夺回火种' })
  return { project, chapter }
}

describe('novel pipeline snapshot', () => {
  test('preserves pipeline stages, blockers, and actions while projecting only bounded project data', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, {
      title: '定向流水线',
      reference_config: {
        writing_bible: {
          reader_promise: '每章都有破局推进',
          protagonist_drive: '主角必须夺回火种',
          core_conflict: '新火与旧规对抗',
          current_volume_goal: '进入大荒门',
          innovation_hook: '符火审案',
          first30_plan: '前三十章完成入门破局',
          longform_capacity: '九卷火种谜团',
        },
        story_state: { last_updated_chapter: 1 },
      },
    })
    const unrelated = await createNovelProject(workspace, { title: '无关项目' })
    const huge = '不应进入 pipeline 快照。'.repeat(20_000)

    const written = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '旧门',
      chapter_text: huge,
      raw_payload: { unrelated_source_chapter: huge },
    })
    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 2,
      title: '新火',
      chapter_goal: '通过旧规审查',
      conflict: '执事拒绝新火',
      raw_payload: {
        scene_cards: [{ purpose: '主角公开破局' }],
        unrelated_generation_payload: huge,
      },
    })
    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 3,
      title: '空白草稿',
      chapter_text: ' \t\n\u00a0\u3000 ',
    })
    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 4,
      title: '占位草稿',
      chapter_text: '【占位正文】等待生成',
    })
    await createNovelChapter(workspace, {
      project_id: unrelated.id,
      chapter_no: 1,
      title: '无关正文',
      chapter_text: huge,
    })
    await createNovelOutline(workspace, {
      project_id: project.id,
      title: '第2章 新火',
      raw_payload: { chapter_no: 2, unrelated_outline_payload: huge },
    })
    await createNovelWorldbuilding(workspace, {
      project_id: project.id,
      world_summary: '大荒门以旧规约束符火。',
      raw_payload: { unrelated_world_payload: huge },
    })
    await createNovelCharacter(workspace, {
      project_id: project.id,
      name: '丁松言',
      goal: '夺回火种',
      raw_payload: { unrelated_character_payload: huge },
    })
    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'book_review',
      status: 'ok',
      summary: '已有长线复盘',
      payload: JSON.stringify({ unrelated_review_payload: huge }),
    })
    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'irrelevant_diagnostic',
      status: 'ok',
      summary: huge,
      payload: JSON.stringify({ huge }),
    })
    await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'chapter_group_generation',
      step_name: 'batch-1',
      status: 'completed',
      output_ref: JSON.stringify({ chapters: [{ chapter_no: 1, status: 'completed' }] }),
    })
    await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'irrelevant_generation_trace',
      step_name: 'unused',
      status: 'completed',
      output_ref: huge,
    })

    const db = new Database(join(workspace, 'novel.sqlite'))
    db.query(`
      INSERT INTO chapter_versions (chapter_id, project_id, version_no, chapter_text, scene_breakdown, continuity_notes, source, created_at)
      VALUES (?, ?, 1, ?, '[]', '[]', 'manual_edit', datetime('now'))
    `).run(written.id, project.id, huge)
    db.close()

    const legacyInput = {
      project: await getNovelProject(workspace, project.id),
      chapters: await listNovelChapters(workspace, project.id),
      outlines: await listNovelOutlines(workspace, project.id),
      worldbuilding: await listNovelWorldbuilding(workspace, project.id),
      characters: await listNovelCharacters(workspace, project.id),
      reviews: await listNovelReviews(workspace, project.id),
      runs: await listNovelRuns(workspace, project.id),
    }
    const snapshot = await getNovelPipelineSnapshot(workspace, project.id)

    expect(snapshot).not.toBeNull()
    expect(stablePipeline(buildNovelPipelineSummary(snapshot!))).toEqual(
      stablePipeline(buildNovelPipelineSummary(legacyInput)),
    )
    expect(snapshot!.chapters.map((chapter: any) => chapter.project_id)).toEqual([project.id, project.id, project.id, project.id])
    expect(snapshot!.chapters[0].chapter_text).toBe('[pipeline-prose-present]')
    expect(snapshot!.chapters[2].chapter_text).toBe('')
    expect(snapshot!.chapters[3].chapter_text).toBe('【占位正文】')
    expect(JSON.stringify(snapshot)).not.toContain(huge.slice(0, 200))
    expect(snapshot!.reviews.map((review: any) => review.review_type)).toEqual(['book_review'])
    expect(snapshot!.runs.map((run: any) => run.run_type)).toEqual(['chapter_group_generation'])
  })

  test('bounds historical review and completed run payloads without changing pipeline decisions', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, {
      title: '历史工作集',
      reference_config: {
        writing_bible: {
          reader_promise: '每章都有破局推进',
          protagonist_drive: '主角必须夺回火种',
          core_conflict: '新火与旧规对抗',
          current_volume_goal: '进入大荒门',
          innovation_hook: '符火审案',
          first30_plan: '前三十章完成入门破局',
          longform_capacity: '九卷火种谜团',
        },
        story_state: { last_updated_chapter: 8 },
      },
    })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 8,
      title: '火种复明',
      chapter_goal: '夺回火种',
      conflict: '旧规拦截',
      chapter_text: '主角在旧门前夺回火种。'.repeat(200),
      raw_payload: { scene_cards: [{ purpose: '公开破局' }] },
    })
    await createNovelOutline(workspace, { project_id: project.id, title: '第8章 火种复明', raw_payload: { chapter_no: 8 } })
    await createNovelWorldbuilding(workspace, { project_id: project.id, world_summary: '大荒门以旧规约束符火。' })
    await createNovelCharacter(workspace, { project_id: project.id, name: '丁松言', goal: '夺回火种' })

    const hugeHistory = '历史 payload 不得进入快照。'.repeat(12_000)
    const db = new Database(join(workspace, 'novel.sqlite'))
    const insertReview = db.prepare(`
      INSERT INTO reviews (project_id, review_type, status, summary, issues, payload, created_at)
      VALUES (?, ?, ?, '', '[]', ?, ?)
    `)
    for (let index = 0; index < 80; index += 1) {
      insertReview.run(
        project.id,
        ['prose_quality', 'editor_report', 'editor_revision'][index % 3],
        'ok',
        JSON.stringify({ chapter_id: chapter.id, chapter_no: chapter.chapter_no, score: 60, history: hugeHistory }),
        `2026-01-${String((index % 28) + 1).padStart(2, '0')}T00:00:${String(index % 60).padStart(2, '0')}.000Z`,
      )
    }
    insertReview.run(project.id, 'editor_report', 'warn', JSON.stringify({
      chapter_id: chapter.id,
      chapter_no: chapter.chapter_no,
      report: { status: 'needs_revision', issues: ['补足回报'] },
    }), '2026-07-01T00:00:00.000Z')
    insertReview.run(project.id, 'editor_revision', 'ok', JSON.stringify({
      chapter_id: chapter.id,
      chapter_no: chapter.chapter_no,
      result: { status: 'completed' },
    }), '2026-07-01T00:01:00.000Z')
    insertReview.run(project.id, 'prose_quality', 'ok', JSON.stringify({
      chapter_id: chapter.id,
      chapter_no: chapter.chapter_no,
      self_check: { review: { score: 88, passed: true } },
    }), '2026-07-01T00:02:00.000Z')
    for (let index = 0; index < 24; index += 1) {
      insertReview.run(project.id, 'prose_quality', 'ok', JSON.stringify({
        chapter_id: chapter.id + 100 + index,
        chapter_no: chapter.chapter_no,
        self_check: { review: { score: 99, passed: true } },
        history: hugeHistory,
      }), `2026-07-01T01:${String(index).padStart(2, '0')}:00.000Z`)
    }
    for (let index = 0; index < 40; index += 1) {
      insertReview.run(project.id, 'quality_benchmark', 'ok', JSON.stringify({ history: hugeHistory }), `2026-06-${String((index % 28) + 1).padStart(2, '0')}T01:00:00.000Z`)
    }

    const insertRun = db.prepare(`
      INSERT INTO runs (project_id, run_type, step_name, status, input_ref, output_ref, duration_ms, error_message, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, '', ?)
    `)
    for (let index = 0; index < 60; index += 1) {
      insertRun.run(
        project.id,
        'chapter_group_generation',
        `completed-${index}`,
        'completed',
        '',
        JSON.stringify({ chapters: [{ chapter_no: 8, status: 'completed' }], history: hugeHistory }),
        `2026-05-${String((index % 28) + 1).padStart(2, '0')}T00:00:${String(index % 60).padStart(2, '0')}.000Z`,
      )
    }
    insertRun.run(project.id, 'chapter_group_generation', 'failed-batch', 'failed', '', JSON.stringify({ chapters: [{ chapter_no: 8, status: 'failed' }], history: hugeHistory }), '2026-07-02T00:00:00.000Z')
    insertRun.run(project.id, 'chapter_group_generation', 'active-batch', 'paused', '', JSON.stringify({ chapters: [{ chapter_no: 8, status: 'pending' }], history: hugeHistory }), '2026-07-02T00:01:00.000Z')
    insertRun.run(project.id, 'batch_generate_prose', 'active-batch-with-failure', 'paused', '', JSON.stringify({ chapters: [{ chapter_no: 8, status: 'failed' }], history: hugeHistory }), '2026-07-02T00:01:30.000Z')
    insertRun.run(project.id, 'chapter_group_generation', 'unknown-batch-with-failure', 'mystery', '', JSON.stringify({ chapters: [{ chapter_no: 8, status: 'blocked' }], history: hugeHistory }), '2026-07-02T00:01:45.000Z')
    insertRun.run(project.id, 'longform_production_repair', 'open-repair', 'completed', '', JSON.stringify({ tasks: [{ status: 'open' }, { task_status: 'resolved' }] }), '2026-07-02T00:02:00.000Z')
    insertRun.run(project.id, 'longform_production_repair', 'paused-repair', 'paused', '', JSON.stringify({ tasks: [{ status: 'open' }, { status: 'resolved' }], history: hugeHistory }), '2026-07-02T00:03:00.000Z')
    insertRun.run(project.id, 'release_repair_queue', 'failed-repair', 'failed', JSON.stringify({ repair_tasks: [{ task_status: 'open' }], history: hugeHistory }), '', '2026-07-02T00:04:00.000Z')
    for (let index = 0; index < 40; index += 1) {
      const suffix = String(index).padStart(2, '0')
      insertRun.run(project.id, 'chapter_group_generation', `historical-failed-${index}`, 'failed', '', hugeHistory, `2026-03-01T00:${suffix}:00.000Z`)
      insertRun.run(project.id, 'batch_generate_prose', `historical-paused-${index}`, 'paused', '', hugeHistory, `2026-03-02T00:${suffix}:00.000Z`)
      insertRun.run(project.id, 'longform_production_repair', `historical-repair-failed-${index}`, 'failed', hugeHistory, '', `2026-03-03T00:${suffix}:00.000Z`)
      insertRun.run(project.id, 'release_repair_queue', `historical-repair-paused-${index}`, 'paused', '', hugeHistory, `2026-03-04T00:${suffix}:00.000Z`)
    }
    insertRun.run(project.id, 'chapter_group_generation', 'ninth-completed-failure', 'completed', '', JSON.stringify({ chapters: [{ chapter_no: 8, status: 'needs_repair' }], history: hugeHistory }), '2026-01-01T00:00:00.000Z')
    insertRun.run(project.id, 'longform_production_repair', 'seventeenth-open-repair', 'completed', '', JSON.stringify({ tasks: [{ status: 'open' }], history: hugeHistory }), '2026-01-02T00:00:00.000Z')
    for (let index = 0; index < 30; index += 1) {
      insertRun.run(project.id, 'quality_benchmark', `governance-${index}`, 'completed', '', hugeHistory, `2026-04-${String((index % 28) + 1).padStart(2, '0')}T00:00:00.000Z`)
    }
    db.close()

    const legacyInput = {
      project: await getNovelProject(workspace, project.id),
      chapters: await listNovelChapters(workspace, project.id),
      outlines: await listNovelOutlines(workspace, project.id),
      worldbuilding: await listNovelWorldbuilding(workspace, project.id),
      characters: await listNovelCharacters(workspace, project.id),
      reviews: await listNovelReviews(workspace, project.id),
      runs: await listNovelRuns(workspace, project.id),
    }
    const snapshot = await getNovelPipelineSnapshot(workspace, project.id)
    const legacySummary = buildNovelPipelineSummary(legacyInput)
    const snapshotSummary = buildNovelPipelineSummary(snapshot!)

    expect(stablePipeline(snapshotSummary)).toEqual(stablePipeline(legacySummary))
    expect(snapshotSummary.current_stage).toBe('batch_scaling')
    expect(snapshotSummary.primary_action.key).toBe('open_longform_governance')
    expect(snapshot!.reviews.length).toBeLessThanOrEqual(13)
    expect(snapshot!.runs.length).toBeLessThanOrEqual(12)
    expect(JSON.stringify(snapshot)).not.toContain(hugeHistory.slice(0, 200))
    expect(JSON.stringify(snapshot).length).toBeLessThan(1_000_000)
    expect(snapshot!.reviews.filter((review: any) => review.review_type === 'quality_benchmark')).toHaveLength(1)
    expect(snapshot!.reviews.filter((review: any) => review.chapter_id === chapter.id).map((review: any) => review.review_type).sort()).toEqual([
      'editor_report',
      'editor_revision',
      'prose_quality',
    ])
    expect(snapshot!.runs.filter((run: any) => run.run_type === 'quality_benchmark')).toHaveLength(1)
    expect(snapshot!.runs.find((run: any) => run.step_name === 'pipeline-completed-batch')).toMatchObject({
      run_type: 'chapter_group_generation',
      pipeline_run_count: 60,
      pipeline_chapter_failure_count: 0,
    })
    expect(snapshot!.runs.some((run: any) => run.status === 'paused')).toBe(true)
    expect(snapshot!.runs.some((run: any) => run.status === 'failed')).toBe(true)
    expect(snapshot!.runs.some((run: any) => Number(run.pipeline_open_task_count || 0) === 1)).toBe(true)
    expect(snapshot!.runs.filter((run: any) => ['paused', 'failed'].includes(run.status)).map((run: any) => `${run.run_type}:${run.status}`).sort()).toEqual([
      'batch_generate_prose:failed',
      'batch_generate_prose:paused',
      'chapter_group_generation:failed',
      'chapter_group_generation:paused',
      'longform_production_repair:failed',
      'longform_production_repair:paused',
      'release_repair_queue:failed',
      'release_repair_queue:paused',
    ])
    expect(snapshot!.runs.every((run: any) => !run.input_ref && !run.output_ref)).toBe(true)
  })

  test('matches legacy JavaScript string truthiness for writing-bible array values', async () => {
    const cases = [
      { label: 'empty', value: [], ready: false },
      { label: 'single-null', value: [null], ready: false },
      { label: 'single-empty-text', value: [''], ready: false },
      { label: 'single-zero', value: [0], ready: true },
      { label: 'single-false', value: [false], ready: true },
      { label: 'two-empty-values', value: [null, null], ready: true },
      { label: 'text', value: ['每章都有破局推进'], ready: true },
    ]

    for (const item of cases) {
      const workspace = await tempWorkspace()
      const project = await createNovelProject(workspace, {
        title: `数组 truthy-${item.label}`,
        reference_config: {
          writing_bible: {
            reader_promise: item.value,
            protagonist_drive: '主角必须夺回火种',
            core_conflict: '新火与旧规对抗',
            current_volume_goal: '进入大荒门',
            innovation_hook: '符火审案',
            first30_plan: '前三十章完成入门破局',
            longform_capacity: '九卷火种谜团',
            world_summary: '大荒门以旧规约束符火',
            characters: [{ name: '丁松言', goal: '夺回火种' }],
          },
        },
      })
      const legacyInput = {
        project: await getNovelProject(workspace, project.id),
        chapters: await listNovelChapters(workspace, project.id),
        outlines: await listNovelOutlines(workspace, project.id),
        worldbuilding: await listNovelWorldbuilding(workspace, project.id),
        characters: await listNovelCharacters(workspace, project.id),
        reviews: await listNovelReviews(workspace, project.id),
        runs: await listNovelRuns(workspace, project.id),
      }
      const snapshot = await getNovelPipelineSnapshot(workspace, project.id)
      const legacySummary = buildNovelPipelineSummary(legacyInput)
      const snapshotSummary = buildNovelPipelineSummary(snapshot!)

      expect(stablePipeline(snapshotSummary)).toEqual(stablePipeline(legacySummary))
      const readerPromiseCheck = legacySummary.stages[0].checks.find(check => check.key === 'reader_promise')
      expect(readerPromiseCheck?.status === 'pass').toBe(item.ready)
    }
  })

  test('matches legacy array-only run payload semantics and trimmed task status fallback', async () => {
    const workspace = await tempWorkspace()
    const { project, chapter } = await createAcceptedPipelineFixture(workspace, '数组语义')
    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'prose_quality',
      status: 'ok',
      created_at: '2026-07-03T00:00:00.000Z',
      payload: JSON.stringify({ chapter_id: chapter.id, self_check: { review: { score: 88, passed: true } } }),
    })
    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'editor_report',
      status: 'ok',
      created_at: '2026-07-03T00:01:00.000Z',
      payload: JSON.stringify({ chapter_id: chapter.id, report: { status: 'accepted', issues: [] } }),
    })
    await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'chapter_group_generation',
      step_name: 'clean-batch',
      status: 'completed',
      output_ref: JSON.stringify({ chapters: [{ status: 'completed' }] }),
    })
    await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'chapter_group_generation',
      step_name: 'object-chapters',
      status: 'completed',
      output_ref: JSON.stringify({ chapters: { only: { status: 'failed' } } }),
    })
    await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'batch_generate_prose',
      step_name: 'scalar-chapters',
      status: 'completed',
      output_ref: JSON.stringify({ chapters: 'failed' }),
    })
    await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'batch_generate_prose',
      step_name: 'scalar-chapter-items',
      status: 'completed',
      output_ref: JSON.stringify({ chapters: ['failed', 1, null] }),
    })
    await appendNovelRun(workspace, {
      project_id: project.id,
      run_type: 'longform_production_repair',
      step_name: 'non-array-and-trimmed-tasks',
      status: 'completed',
      input_ref: JSON.stringify({ repair_tasks: { only: { status: 'open' } } }),
      output_ref: JSON.stringify({
        tasks: [
          { task_status: '', status: 'resolved' },
          { task_status: '   ', taskStatus: ' resolved ' },
          { task_status: ' completed ' },
          { task_status: '\t\n', status: 'resolved' },
          { task_status: '\u00a0', taskStatus: 'resolved' },
          { task_status: '\u1680', status: 'resolved' },
          { task_status: '\u2003', status: '\u2028resolved\u2029' },
          { task_status: '\u202f', taskStatus: 'resolved' },
          { task_status: '\u205f', status: 'completed' },
          { task_status: '\u3000', taskStatus: ' resolved ' },
          { task_status: '\ufeff', status: 'completed' },
          { task_status: ['failed'] },
          { task_status: [], status: 'resolved' },
          { task_status: ['resolved'] },
        ],
        repair_tasks: 'open',
      }),
    })

    const legacyInput = {
      project: await getNovelProject(workspace, project.id),
      chapters: await listNovelChapters(workspace, project.id),
      outlines: await listNovelOutlines(workspace, project.id),
      worldbuilding: await listNovelWorldbuilding(workspace, project.id),
      characters: await listNovelCharacters(workspace, project.id),
      reviews: await listNovelReviews(workspace, project.id),
      runs: await listNovelRuns(workspace, project.id),
    }
    const snapshot = await getNovelPipelineSnapshot(workspace, project.id)
    const legacySummary = buildNovelPipelineSummary(legacyInput)
    const snapshotSummary = buildNovelPipelineSummary(snapshot!)

    expect(legacySummary.current_stage).toBe('batch_scaling')
    expect(stablePipeline(snapshotSummary)).toEqual(stablePipeline(legacySummary))
  })

  test('keeps active project chapter and winner review payloads compact without changing decisions', async () => {
    const workspace = await tempWorkspace()
    const { project, chapter } = await createAcceptedPipelineFixture(workspace, '活跃大对象')
    const hugeActivePayload = '活跃 payload 不得进入快照。'.repeat(25_000)
    const db = new Database(join(workspace, 'novel.sqlite'))
    db.query('UPDATE projects SET reference_config = ? WHERE id = ?').run(JSON.stringify({
      writing_bible: {
        reader_promise: '每章都有破局推进',
        protagonist_drive: '主角必须夺回火种',
        core_conflict: '新火与旧规对抗',
        current_volume_goal: '进入大荒门',
        innovation_hook: '符火审案',
        first30_plan: '前三十章完成入门破局',
        longform_capacity: '九卷火种谜团',
        diagnostics: hugeActivePayload,
      },
      story_state: { last_updated_chapter: 1 },
      unrelated_diagnostics: hugeActivePayload,
    }), project.id)
    db.query('UPDATE chapters SET raw_payload = ? WHERE id = ?').run(JSON.stringify({
      scene_cards: Array.from({ length: 8 }, (_, index) => ({ purpose: `推进${index}`, diagnostics: hugeActivePayload })),
      pre_draft_brief: { ready: true, diagnostics: hugeActivePayload },
    }), chapter.id)
    const insertReview = db.prepare(`
      INSERT INTO reviews (project_id, review_type, status, summary, issues, payload, created_at)
      VALUES (?, ?, ?, '', '[]', ?, ?)
    `)
    insertReview.run(project.id, 'prose_quality', 'ok', JSON.stringify({
      chapter_id: chapter.id,
      self_check: { review: { score: 88, passed: true } },
      diagnostics: hugeActivePayload,
    }), '2026-07-05T00:00:00.000Z')
    insertReview.run(project.id, 'editor_report', 'ok', JSON.stringify({
      chapter_id: chapter.id,
      report: { status: 'accepted', issues: [] },
      diagnostics: hugeActivePayload,
    }), '2026-07-05T00:01:00.000Z')
    db.close()

    const legacyInput = {
      project: await getNovelProject(workspace, project.id),
      chapters: await listNovelChapters(workspace, project.id),
      outlines: await listNovelOutlines(workspace, project.id),
      worldbuilding: await listNovelWorldbuilding(workspace, project.id),
      characters: await listNovelCharacters(workspace, project.id),
      reviews: await listNovelReviews(workspace, project.id),
      runs: await listNovelRuns(workspace, project.id),
    }
    const snapshot = await getNovelPipelineSnapshot(workspace, project.id)

    expect(stablePipeline(buildNovelPipelineSummary(snapshot!))).toEqual(stablePipeline(buildNovelPipelineSummary(legacyInput)))
    expect(JSON.stringify(snapshot)).not.toContain(hugeActivePayload.slice(0, 200))
    expect(JSON.stringify(snapshot).length).toBeLessThan(100_000)
    expect(snapshot!.chapters[0].raw_payload.scene_cards).toHaveLength(1)
    expect(snapshot!.chapters[0].raw_payload.pre_draft_brief).toBeTruthy()
  })

  test('always selects reviews for the explicit target id when chapter numbers are duplicated', async () => {
    const workspace = await tempWorkspace()
    const { project } = await createAcceptedPipelineFixture(workspace, '重复章号')
    let target: any = null
    for (let index = 0; index < 3; index += 1) {
      target = await createNovelChapter(workspace, {
        project_id: project.id,
        chapter_no: 1,
        title: `重复章${index + 2}`,
        chapter_goal: '夺回火种',
        conflict: '旧规拦截',
        chapter_text: `第${index + 2}份正文`.repeat(300),
      })
    }
    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'prose_quality',
      status: 'ok',
      payload: JSON.stringify({ chapter_id: target.id, self_check: { review: { score: 88, passed: true } } }),
      created_at: '2026-07-06T00:00:00.000Z',
    })
    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'editor_report',
      status: 'ok',
      payload: JSON.stringify({ chapter_id: target.id, report: { status: 'accepted', issues: [] } }),
      created_at: '2026-07-06T00:01:00.000Z',
    })

    const legacyInput = {
      project: await getNovelProject(workspace, project.id),
      chapters: await listNovelChapters(workspace, project.id),
      outlines: await listNovelOutlines(workspace, project.id),
      worldbuilding: await listNovelWorldbuilding(workspace, project.id),
      characters: await listNovelCharacters(workspace, project.id),
      reviews: await listNovelReviews(workspace, project.id),
      runs: await listNovelRuns(workspace, project.id),
    }
    const snapshot = await getNovelPipelineSnapshot(workspace, project.id)
    const legacySummary = buildNovelPipelineSummary(legacyInput)
    const snapshotSummary = buildNovelPipelineSummary(snapshot!)

    expect(legacySummary.current_stage).toBe('batch_scaling')
    expect(stablePipeline(snapshotSummary)).toEqual(stablePipeline(legacySummary))
    expect(snapshot!.reviews.filter((review: any) => Number(review.chapter_id) === Number(target.id))).toHaveLength(2)
  })

  test('keeps the earlier review id on equal timestamps like the legacy stable ordering', async () => {
    const workspace = await tempWorkspace()
    const { project, chapter } = await createAcceptedPipelineFixture(workspace, '同秒复检')
    const tiedAt = '2026-07-04T00:00:00.000Z'
    const passing = await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'prose_quality',
      status: 'ok',
      created_at: tiedAt,
      payload: JSON.stringify({ chapter_id: chapter.id, self_check: { review: { score: 88, passed: true } } }),
    })
    const failing = await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'prose_quality',
      status: 'warn',
      created_at: tiedAt,
      payload: JSON.stringify({ chapter_id: chapter.id, self_check: { review: { score: 40, passed: false } } }),
    })
    await createNovelReview(workspace, {
      project_id: project.id,
      review_type: 'editor_report',
      status: 'ok',
      created_at: '2026-07-04T00:01:00.000Z',
      payload: JSON.stringify({ chapter_id: chapter.id, report: { status: 'accepted', issues: [] } }),
    })

    const legacyInput = {
      project: await getNovelProject(workspace, project.id),
      chapters: await listNovelChapters(workspace, project.id),
      outlines: await listNovelOutlines(workspace, project.id),
      worldbuilding: await listNovelWorldbuilding(workspace, project.id),
      characters: await listNovelCharacters(workspace, project.id),
      reviews: await listNovelReviews(workspace, project.id),
      runs: await listNovelRuns(workspace, project.id),
    }
    const snapshot = await getNovelPipelineSnapshot(workspace, project.id)
    const legacySummary = buildNovelPipelineSummary(legacyInput)
    const snapshotSummary = buildNovelPipelineSummary(snapshot!)

    expect(passing.id).toBeLessThan(failing.id)
    expect(legacySummary.current_stage).toBe('batch_scaling')
    expect(legacySummary.primary_action.key).toBe('start_safe_batch')
    expect(stablePipeline(snapshotSummary)).toEqual(stablePipeline(legacySummary))
  })

  test('uses one bounded projection per required table and never reads versions or full rows', async () => {
    const source = await readFile(join(import.meta.dir, '../novel.ts'), 'utf8')
    const start = source.indexOf('export async function getNovelPipelineSnapshot')
    const end = source.indexOf('\nexport async function', start + 1)
    const block = source.slice(start, end)

    expect(start).toBeGreaterThanOrEqual(0)
    expect(block).not.toContain('SELECT *')
    expect(block).not.toContain('chapter_versions')
    expect(block).not.toContain('readStore(activeWorkspace)')
    expect(block).not.toContain('listNovel')
    expect(block).not.toContain('MATERIALIZED')
    expect(block).not.toContain('ROW_NUMBER')
    expect(block).toContain('WITH target_review_times AS')
    expect(block).toContain('chapter_review_winners AS')
    expect(block).toContain('JOIN reviews AS review ON review.id = winner.id')
    expect(block).toContain("CAST(json_extract(payload, '$.chapter_id') AS INTEGER) = ?")
    expect(block).toContain('targetChapterId')
    expect(block).toContain('WITH governance_run_times AS')
    expect(block).toContain('governance_run_winners AS')
    expect(block).not.toContain('WITH run_base AS')
    const projectProjection = block.slice(
      block.indexOf('const projectRow ='),
      block.indexOf('if (!projectRow)'),
    )
    const chapterProjection = block.slice(
      block.indexOf('const chapters ='),
      block.indexOf('const targetChapter ='),
    )
    const targetReviewQuery = block.slice(
      block.indexOf('WITH target_review_times AS'),
      block.indexOf('const governanceReviews'),
    )
    const batchSemanticQuery = block.slice(
      block.indexOf('const batchSemanticRows ='),
      block.indexOf('const batchRows:'),
    )
    const repairSemanticQuery = block.slice(
      block.indexOf('const repairSemanticRows ='),
      block.indexOf('const repairRows:'),
    )
    const governanceRunQuery = block.slice(
      block.indexOf('WITH governance_run_times AS'),
      block.indexOf('const governanceRuns:'),
    )
    expect(projectProjection).not.toContain('SELECT id, title, synopsis, reference_config')
    expect(projectProjection).toContain('AS pipeline_reader_promise')
    expect(projectProjection).toContain('AS pipeline_story_state_chapter')
    expect(chapterProjection).toContain("json_object('pipeline_signal', 1)")
    expect(chapterProjection).not.toContain("json_extract(raw_payload, '$.scene_cards')")
    expect(targetReviewQuery).toContain('SELECT MIN(review.id) AS id')
    expect(targetReviewQuery).toContain('review.payload')
    expect(block).toContain('projectNovelPipelineReview(reviewFromRow(row))')
    expect(batchSemanticQuery).not.toContain('input_ref')
    expect(batchSemanticQuery).not.toContain('output_ref')
    expect(batchSemanticQuery).not.toContain('json_each')
    expect(batchSemanticQuery).toContain('pipeline_chapter_failure_count')
    expect(repairSemanticQuery).not.toContain('input_ref')
    expect(repairSemanticQuery).not.toContain('output_ref')
    expect(repairSemanticQuery).not.toContain('json_each')
    expect(repairSemanticQuery).toContain('pipeline_open_task_count')
    expect(repairSemanticQuery).toContain('pipeline_task_count')
    for (const codePoint of [9, 10, 11, 12, 13, 32, 160, 5760, 8192, 8193, 8194, 8195, 8196, 8197, 8198, 8199, 8200, 8201, 8202, 8232, 8233, 8239, 8287, 12288, 65279]) {
      expect(source).toContain(`char(${codePoint})`)
    }
    expect(source).toContain("for (const key of ['task_status', 'taskStatus', 'status'])")
    expect(source).toContain("String(task?.[key] ?? '').trim().toLowerCase()")
    expect(governanceRunQuery).not.toContain('input_ref')
    expect(governanceRunQuery).not.toContain('output_ref')
    expect(governanceRunQuery).not.toContain('json_each')
    expect(governanceRunQuery).toContain('MAX(created_at) AS created_at')
    expect(governanceRunQuery).toContain('SELECT MIN(run.id) AS id')
    expect(block).toContain('AS chapter_text')
    expect(block).toContain('WHERE project_id = ?')
  })
})
