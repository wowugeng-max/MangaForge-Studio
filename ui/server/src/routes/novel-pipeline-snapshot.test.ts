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
          { task_status: '\u3000', taskStatus: ' resolved ' },
          { task_status: '\ufeff', status: 'completed' },
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

    expect(legacySummary.current_stage).toBe('serial_governance')
    expect(stablePipeline(snapshotSummary)).toEqual(stablePipeline(legacySummary))
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
    expect(block).toContain('WITH chapter_review_index AS MATERIALIZED')
    expect(block).toContain('chapter_review_winners AS')
    expect(block).toContain('JOIN reviews AS review ON review.id = winner.id')
    expect(block).toContain('WITH batch_run_semantics AS MATERIALIZED')
    expect(block).toContain('WITH repair_run_semantics AS MATERIALIZED')
    expect(block).toContain('WITH governance_run_index AS')
    expect(block).not.toContain('WITH run_base AS')
    const chapterReviewRanking = block.slice(
      block.indexOf('WITH chapter_review_index AS'),
      block.indexOf('const governanceReviews'),
    )
    const batchSemanticQuery = block.slice(
      block.indexOf('WITH batch_run_semantics AS'),
      block.indexOf('const batchRows:'),
    )
    const repairSemanticQuery = block.slice(
      block.indexOf('WITH repair_run_semantics AS'),
      block.indexOf('const repairRows:'),
    )
    const governanceRunQuery = block.slice(
      block.indexOf('WITH governance_run_index AS'),
      block.indexOf('const governanceRuns:'),
    )
    expect(chapterReviewRanking).not.toContain('\n          payload,')
    expect(chapterReviewRanking.indexOf('WHERE pipeline_rank = 1')).toBeLessThan(chapterReviewRanking.indexOf('JOIN reviews AS review'))
    expect(chapterReviewRanking).toContain('ORDER BY created_at DESC, id ASC')
    expect(batchSemanticQuery.slice(0, batchSemanticQuery.indexOf('CASE WHEN EXISTS'))).not.toContain('output_ref')
    expect(batchSemanticQuery).not.toContain('ROW_NUMBER')
    expect(batchSemanticQuery).toContain('END AS has_chapter_failure')
    expect(batchSemanticQuery).toContain("json_type(run.output_ref, '$.chapters') = 'array'")
    const repairNarrowProjection = repairSemanticQuery.slice(0, repairSemanticQuery.indexOf('COALESCE(json_array_length'))
    expect(repairNarrowProjection).not.toContain('input_ref')
    expect(repairNarrowProjection).not.toContain('output_ref')
    expect(repairSemanticQuery).not.toContain('ROW_NUMBER')
    expect(repairSemanticQuery).toContain('AS open_task_count')
    for (const path of ['$.tasks', '$.repair_tasks']) {
      expect(repairSemanticQuery).toContain(`json_type(run.output_ref, '${path}') = 'array'`)
      expect(repairSemanticQuery).toContain(`json_type(run.input_ref, '${path}') = 'array'`)
    }
    expect(source).toContain("const NOVEL_PIPELINE_SQL_TRIM_CHARS = 'char(9) || char(10) || char(11) || char(12) || char(13) || char(32) || char(160) || char(12288) || char(65279)'")
    expect(repairSemanticQuery).toContain("NULLIF(TRIM(CASE WHEN json_valid(repair_task.value) THEN json_extract(repair_task.value, '$.task_status') END, ${NOVEL_PIPELINE_SQL_TRIM_CHARS}), '')")
    expect(governanceRunQuery).not.toContain('input_ref')
    expect(governanceRunQuery).not.toContain('output_ref')
    expect(governanceRunQuery).not.toContain('json_each')
    expect(block).toContain('AS chapter_text')
    expect(block).toContain('WHERE project_id = ?')
  })
})
