import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  createNovelChapter,
  createNovelProject,
  listNovelChapters,
  upsertNovelChapterByNumber,
} from './novel'

let workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-novel-test-'))
  workspaces.push(workspace)
  return workspace
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
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
