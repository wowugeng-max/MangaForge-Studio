import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, stat, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { Database } from 'bun:sqlite'
import {
  appendNovelRun,
  compactNovelStorage,
  createNovelChapter,
  createNovelProject,
  createNovelReview,
  listNovelChapters,
  listNovelProjects,
  listNovelReviews,
  listNovelRuns,
  upsertNovelChapterByNumber,
} from './novel'

let workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-novel-test-'))
  workspaces.push(workspace)
  return workspace
}

async function exists(path: string) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('novel sqlite persistence', () => {
  test('does not create the legacy json mirror during normal writes', async () => {
    const workspace = await tempWorkspace()

    await createNovelProject(workspace, { title: '只写 SQLite' })

    expect(await exists(join(workspace, 'novel.sqlite'))).toBe(true)
    expect(await exists(join(workspace, 'novel-store.json'))).toBe(false)
  })

  test('imports legacy json only when sqlite is empty', async () => {
    const workspace = await tempWorkspace()
    const legacyStore = {
      projects: [{ id: 77, title: '旧 JSON 项目', updated_at: '2026-01-01T00:00:00.000Z' }],
      worldbuilding: [],
      characters: [],
      outlines: [],
      chapters: [],
      chapter_versions: [],
      reviews: [],
      runs: [],
      setting_entities: [],
      chapter_setting_usage: [],
    }
    await writeFile(join(workspace, 'novel-store.json'), `${JSON.stringify(legacyStore)}\n`, 'utf8')

    const projects = await listNovelProjects(workspace)
    await writeFile(join(workspace, 'novel-store.json'), `${JSON.stringify({
      ...legacyStore,
      projects: [{ id: 88, title: '不应覆盖 SQLite', updated_at: '2026-01-02T00:00:00.000Z' }],
    })}\n`, 'utf8')
    const projectsAfterJsonChange = await listNovelProjects(workspace)

    expect(projects.map(item => item.title)).toEqual(['旧 JSON 项目'])
    expect(projectsAfterJsonChange.map(item => item.title)).toEqual(['旧 JSON 项目'])
  })

  test('appends reviews and runs through sqlite without reloading the full novel store', async () => {
    const source = await readFile(join(import.meta.dir, 'novel.ts'), 'utf8')
    const createReviewStart = source.indexOf('export async function createNovelReview')
    const createReviewEnd = source.indexOf('export async function listNovelRuns', createReviewStart)
    const createReviewBlock = source.slice(createReviewStart, createReviewEnd)
    const appendRunStart = source.indexOf('export async function appendNovelRun')
    const appendRunEnd = source.indexOf('export async function updateNovelRun', appendRunStart)
    const appendRunBlock = source.slice(appendRunStart, appendRunEnd)

    expect(createReviewStart).toBeGreaterThanOrEqual(0)
    expect(createReviewEnd).toBeGreaterThan(createReviewStart)
    expect(appendRunStart).toBeGreaterThanOrEqual(0)
    expect(appendRunEnd).toBeGreaterThan(appendRunStart)
    expect(createReviewBlock).toContain('INSERT INTO reviews')
    expect(createReviewBlock).not.toContain('readStore(activeWorkspace)')
    expect(createReviewBlock).not.toContain('writeStore(activeWorkspace')
    expect(appendRunBlock).toContain('INSERT INTO runs')
    expect(appendRunBlock).not.toContain('readStore(activeWorkspace)')
    expect(appendRunBlock).not.toContain('writeStore(activeWorkspace')
  })
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
      db.query('UPDATE runs SET output_ref=?').run('历史 run'.repeat(50000))
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
})

describe('upsertNovelChapterByNumber', () => {
  test('updates generated outline fields for an existing chapter number without duplicating or clearing prose', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '大纲重复生成测试' })
    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '旧第1章',
      chapter_summary: '旧摘要',
      chapter_text: '已经写好的正文',
      scene_breakdown: [{ title: '旧场景' }],
    })

    const updated = await upsertNovelChapterByNumber(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '新第1章',
      chapter_summary: '新摘要',
      scene_breakdown: [{ title: '新场景' }],
    })
    const created = await upsertNovelChapterByNumber(workspace, {
      project_id: project.id,
      chapter_no: 2,
      title: '第2章',
      chapter_summary: '第二章摘要',
    })

    const chapters = await listNovelChapters(workspace, project.id)

    expect(updated.id).toBe(chapters[0].id)
    expect(created.chapter_no).toBe(2)
    expect(chapters).toHaveLength(2)
    expect(chapters[0].title).toBe('新第1章')
    expect(chapters[0].chapter_summary).toBe('新摘要')
    expect(chapters[0].chapter_text).toBe('已经写好的正文')
    expect(chapters[0].scene_breakdown).toEqual([{ title: '新场景' }])
  })
})

describe('novel persistence json safety', () => {
  test('sanitizes circular chapter planning payloads before persistence', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '循环载荷测试' })
    const scene: any = { title: '循环场景' }
    scene.self = scene

    await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '循环章节',
      scene_breakdown: [scene],
      raw_payload: { source: 'test', scene },
    })

    const chapters = await listNovelChapters(workspace, project.id)

    expect(chapters[0].scene_breakdown[0]).toMatchObject({
      title: '循环场景',
      self: '[Circular]',
    })
    expect(chapters[0].raw_payload.scene.self).toBe('[Circular]')
  })
})
