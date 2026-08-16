import { describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createNovelChapter, createNovelCharacter, createNovelOutline, createNovelProject,
  createNovelReview, createNovelWorldbuilding,
} from '../../novel'
import { ohStoryChapterTextHash } from '../../novel-writing/oh-story-core/chapter-text-hash'
import { BUILTIN_KERNEL_CONTRACTS } from '../contracts/builtin'
import { projectKernelSubject } from './project'

const reviewContract = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-review.full')!
const applyContract = BUILTIN_KERNEL_CONTRACTS.find(c => c.id === 'oh-story-core.story-apply.surgical')!

async function seedWorkspace() {
  const ws = mkdtempSync(join(tmpdir(), 'kernel-proj-'))
  const project = await createNovelProject(ws, { title: '怪谈世界' })
  await createNovelOutline(ws, { project_id: project.id, outline_type: 'master', title: '总纲', summary: '主角以超人身份进入怪谈世界。' })
  await createNovelCharacter(ws, { project_id: project.id, name: '楚弦', role: '主角', motivation: '活下去' })
  await createNovelWorldbuilding(ws, { project_id: project.id, world_summary: '规则怪谈世界观。' })
  const ch1 = await createNovelChapter(ws, { project_id: project.id, chapter_no: 1, title: '第一章', chapter_text: '第一章正文。\n\n猫叫了一声。' })
  const ch2 = await createNovelChapter(ws, { project_id: project.id, chapter_no: 2, title: '违背规则的绝对防御', chapter_text: '第二章正文段一。\n\n段二。', chapter_goal: '立防御规则', ending_hook: '枯手伸来' })
  return { ws, project, ch1, ch2 }
}

describe('projectKernelSubject', () => {
  test('review contract projects chapter/outline/characters/world/tracking and fills vars', async () => {
    const { ws, project, ch2 } = await seedWorkspace()
    const projectDir = mkdtempSync(join(tmpdir(), 'kernel-proj-dir-'))
    const { vars, files } = await projectKernelSubject({ workspace: ws, projectId: project.id, chapterId: ch2.id, contract: reviewContract, projectDir })
    expect(vars.chapter_pad).toBe('002')
    expect(vars.chapter_title).toBe('违背规则的绝对防御')
    expect(vars.scope_files).toBe('正文/第002章_违背规则的绝对防御.md')
    expect(vars.previous_chapter_file).toBe('正文/第001章_第一章.md')
    expect(vars.report_path).toBe('审稿/第002章.md')
    expect(readFileSync(join(projectDir, '正文/第002章_违背规则的绝对防御.md'), 'utf8')).toContain('第二章正文段一。')
    expect(existsSync(join(projectDir, '正文/第001章_第一章.md'))).toBe(true)
    expect(readFileSync(join(projectDir, '大纲/总纲.md'), 'utf8')).toContain('主角以超人身份')
    expect(readFileSync(join(projectDir, '大纲/第002章.md'), 'utf8')).toContain('立防御规则')
    expect(existsSync(join(projectDir, '设定/角色/楚弦.md'))).toBe(true)
    expect(existsSync(join(projectDir, '设定/世界观.md'))).toBe(true)
    expect(readFileSync(join(projectDir, '追踪/伏笔.md'), 'utf8')).toContain('开放项：无')
    expect(files.length).toBeGreaterThan(5)
  })

  test('chapter 1 has no previous chapter file and empty var', async () => {
    const { ws, project, ch1 } = await seedWorkspace()
    const projectDir = mkdtempSync(join(tmpdir(), 'kernel-proj-dir-'))
    const { vars } = await projectKernelSubject({ workspace: ws, projectId: project.id, chapterId: ch1.id, contract: reviewContract, projectDir })
    expect(vars.previous_chapter_file).toBe('')
  })

  test('apply contract without review -> OH_STORY_APPLY_NO_REVIEW; stale hash -> OH_STORY_APPLY_STALE_REVIEW', async () => {
    const { ws, project, ch2 } = await seedWorkspace()
    const dirA = mkdtempSync(join(tmpdir(), 'kernel-proj-dir-'))
    await expect(projectKernelSubject({ workspace: ws, projectId: project.id, chapterId: ch2.id, contract: applyContract, projectDir: dirA }))
      .rejects.toMatchObject({ code: 'OH_STORY_APPLY_NO_REVIEW' })
    await createNovelReview(ws, {
      project_id: project.id, review_type: 'oh_story_review',
      payload: JSON.stringify({ chapter_id: ch2.id, chapter_no: 2, chapter_text_hash: 'stale-hash', report_text: '## 修改建议\n- 改一处' }),
    })
    await expect(projectKernelSubject({ workspace: ws, projectId: project.id, chapterId: ch2.id, contract: applyContract, projectDir: dirA }))
      .rejects.toMatchObject({ code: 'OH_STORY_APPLY_STALE_REVIEW' })
  })

  test('apply contract with matching review writes 审稿 + 改稿/指令.md and review_path var', async () => {
    const { ws, project, ch2 } = await seedWorkspace()
    await createNovelReview(ws, {
      project_id: project.id, review_type: 'oh_story_review',
      payload: JSON.stringify({
        chapter_id: ch2.id, chapter_no: 2,
        chapter_text_hash: ohStoryChapterTextHash('第二章正文段一。\n\n段二。'),
        report_text: '## 修改建议\n- 段二补动机',
      }),
    })
    const projectDir = mkdtempSync(join(tmpdir(), 'kernel-proj-dir-'))
    const { vars } = await projectKernelSubject({ workspace: ws, projectId: project.id, chapterId: ch2.id, contract: applyContract, projectDir })
    expect(vars.review_path).toBe('审稿/第002章.md')
    expect(readFileSync(join(projectDir, '审稿/第002章.md'), 'utf8')).toContain('段二补动机')
    const instruction = readFileSync(join(projectDir, '改稿/指令.md'), 'utf8')
    expect(instruction).toContain('禁止整章重写')
    expect(instruction).toContain('段二补动机')
  })
})
