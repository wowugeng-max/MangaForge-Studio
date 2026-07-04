import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm, stat, writeFile } from 'fs/promises'
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
