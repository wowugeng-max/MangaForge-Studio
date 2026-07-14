import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNovelChapter, createNovelProject, getNovelChapter, updateNovelChapter } from './novel'

const workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'novel-empty-prose-'))
  workspaces.push(workspace)
  return workspace
}

afterEach(async () => {
  while (workspaces.length) {
    const workspace = workspaces.pop()
    if (workspace) await rm(workspace, { recursive: true, force: true })
  }
})

describe('updateNovelChapter empty prose guard', () => {
  test('manual_edit does not wipe existing prose with blank chapter_text', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '空正文保护' })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: '这是已经写好的正文。',
    })

    const updated = await updateNovelChapter(workspace, chapter.id, { chapter_text: '' }, {
      createVersion: true,
      versionSource: 'manual_edit',
    })

    expect(updated?.chapter_text).toBe('这是已经写好的正文。')
    const reloaded = await getNovelChapter(workspace, chapter.id, project.id)
    expect(reloaded?.chapter_text).toBe('这是已经写好的正文。')
  })

  test('allowEmptyProse can intentionally clear chapter text', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '允许清空' })
    const chapter = await createNovelChapter(workspace, {
      project_id: project.id,
      chapter_no: 1,
      title: '第一章',
      chapter_text: '可清空正文',
    })

    const updated = await updateNovelChapter(workspace, chapter.id, { chapter_text: '' }, {
      createVersion: true,
      versionSource: 'manual_edit',
      allowEmptyProse: true,
    })

    expect(updated?.chapter_text).toBe('')
  })
})
