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
    expect(snapshot!.chapters.map((chapter: any) => chapter.project_id)).toEqual([project.id, project.id])
    expect(snapshot!.chapters[0].chapter_text).toBe('[pipeline-prose-present]')
    expect(JSON.stringify(snapshot)).not.toContain(huge.slice(0, 200))
    expect(snapshot!.reviews.map((review: any) => review.review_type)).toEqual(['book_review'])
    expect(snapshot!.runs.map((run: any) => run.run_type)).toEqual(['chapter_group_generation'])
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
    for (const table of ['projects', 'chapters', 'outlines', 'worldbuilding', 'characters', 'reviews', 'runs']) {
      expect(block.match(new RegExp(`FROM ${table}\\b`, 'g'))?.length || 0).toBe(1)
    }
    expect(block).toContain('AS chapter_text')
    expect(block).toContain('WHERE project_id = ?')
  })
})
