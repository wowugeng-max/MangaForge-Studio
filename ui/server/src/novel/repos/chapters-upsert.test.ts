import { afterEach, describe, expect, test } from 'bun:test'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { Database } from 'bun:sqlite'
import {
  createNovelChapter,
  createNovelProject,
  listNovelChapters,
  upsertNovelChapterByNumber,
} from '../../novel'
import { setNovelMutationTestHook } from '../../novel-test-support'
import {
  workspaces,
  tempWorkspace,
  exists,
  holdSqliteWriteLock,
  spawnBarrieredChapterUpdate,
  waitForPath,
  snapshotNovelAcceptanceStore,
  snapshotNovelReferenceStore,
} from '../test-utils'

afterEach(async () => {
  const { rm } = await import('fs/promises')
  await Promise.all(workspaces.splice(0).map(workspace => rm(workspace, { recursive: true, force: true })))
  setNovelMutationTestHook(null)
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
