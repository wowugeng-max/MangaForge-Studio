import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createNovelChapter,
  createNovelOutline,
  createNovelProject,
  listNovelChapters,
  listNovelOutlines,
} from '../novel'
import { syncAgentExecutionToNovelStore } from './novel-agent-sync-service'

let workspaces: string[] = []

async function tempWorkspace() {
  const workspace = await mkdtemp(join(tmpdir(), 'mangaforge-agent-sync-test-'))
  workspaces.push(workspace)
  return workspace
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('syncAgentExecutionToNovelStore', () => {
  test('keeps generated detail outlines and stored chapter titles in sync by chapter number', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '章节标题同步测试', synopsis: '规则怪谈开局。' })
    const staleOutline = await createNovelOutline(workspace, {
      project_id: project.id,
      outline_type: 'chapter',
      title: '第1章 拉入恐惧之隙',
      summary: '旧大纲标题。',
      raw_payload: { chapter_no: 1, source: 'original_incubator' },
    })
    await createNovelChapter(workspace, {
      project_id: project.id,
      outline_id: staleOutline.id,
      chapter_no: 1,
      title: '拉入恐惧之隙',
      chapter_summary: '旧章节摘要。',
      chapter_text: '已经写好的正文不能被细纲覆盖。',
    })

    await syncAgentExecutionToNovelStore(workspace, project, '重新生成前10章细纲', {
      results: [
        {
          step: 'detail-outline-agent',
          success: true,
          outputSource: 'llm',
          output: {
            detail_chapters: [
              {
                chapter_no: 1,
                title: '灰色光幕',
                summary: '主角第一次看见规则怪谈入口。',
                conflict: '必须判断眼前光幕是真是假。',
                ending_hook: '光幕上出现了他的名字。',
              },
            ],
          },
        },
        { step: 'continuity-check-agent', success: true, outputSource: 'llm', output: { is_ready_for_prose: true } },
      ],
    })

    const chapters = await listNovelChapters(workspace, project.id)
    const outlines = await listNovelOutlines(workspace, project.id)
    const chapter = chapters.find(item => item.chapter_no === 1)
    const outline = outlines.find(item => item.outline_type === 'chapter' && Number(item.raw_payload?.chapter_no || 0) === 1)

    expect(chapter?.title).toBe('灰色光幕')
    expect(chapter?.chapter_summary).toBe('主角第一次看见规则怪谈入口。')
    expect(chapter?.chapter_text).toBe('已经写好的正文不能被细纲覆盖。')
    expect(outline?.id).toBe(staleOutline.id)
    expect(outline?.title).toBe('第1章 灰色光幕')
    expect(outline?.summary).toContain('主角第一次看见规则怪谈入口')
    expect(chapter?.outline_id).toBe(outline?.id)
  })
})
