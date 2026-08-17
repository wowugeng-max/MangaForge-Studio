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
import { projectKernelSubject, renderUserBriefMarkdown } from './project'

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

  test('project subject: no chapter required, brief.md written, chapter vars empty', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'kernel-proj-'))
    const project = await createNovelProject(ws, { title: '试作' })
    const contract: any = {
      ...reviewContract,
      verb: 'open_book',
      capability: 'outline',
      projection: { mounts: ['user_brief', 'skill_tree'] },
      invoke: { mention: '$story-long-write', prompt: '开书：{{user_brief_file}}' },
    }
    const dir = mkdtempSync(join(tmpdir(), 'proj-open-'))
    const { vars, files } = await projectKernelSubject({
      workspace: ws, projectId: project.id, chapterId: 0, contract, projectDir: dir,
      subjectType: 'project',
      briefJson: JSON.stringify({ title: '试作', genre: '玄幻', idea: '一句话创意', length_target: 'long', constraints: '无' }),
    })
    expect(files).toContain('brief.md')
    expect(readFileSync(join(dir, 'brief.md'), 'utf8')).toContain('一句话创意')
    expect(vars.user_brief_file).toBe('brief.md')
    expect(vars.chapter_no).toBe('')
    expect(vars.chapter_pad).toBe('')
    expect(vars.report_path).toBe('')
  })

  test('world mount replays committed world_doc by kernel_rel_path', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'kernel-proj-'))
    const project = await createNovelProject(ws, { title: '试作' })
    await createNovelWorldbuilding(ws, {
      project_id: project.id,
      world_summary: '摘要A',
      raw_payload: { kernel_rel_path: '设定/势力/铁誓盟.md', kernel_full_text: '# 铁誓盟\n全文A' },
    })
    await createNovelWorldbuilding(ws, { project_id: project.id, world_summary: '旧行摘要' })
    const contract: any = { ...reviewContract, projection: { mounts: ['world', 'skill_tree'] } }
    const dir = mkdtempSync(join(tmpdir(), 'proj-world-'))
    await projectKernelSubject({
      workspace: ws, projectId: project.id, chapterId: 0, contract, projectDir: dir, subjectType: 'project',
    })
    expect(readFileSync(join(dir, '设定/势力/铁誓盟.md'), 'utf8')).toContain('全文A')
    expect(readFileSync(join(dir, '设定/世界观.md'), 'utf8')).toContain('旧行摘要')
  })

  test('world mount does not write empty 世界观.md when other 设定 files were replayed', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'kernel-proj-'))
    const project = await createNovelProject(ws, { title: '试作' })
    await createNovelWorldbuilding(ws, {
      project_id: project.id,
      world_summary: '摘要',
      raw_payload: { kernel_rel_path: '设定/世界观/力量体系.md', kernel_full_text: '# 力量体系\n内核全文' },
    })
    const contract: any = { ...reviewContract, projection: { mounts: ['world', 'skill_tree'] } }
    const dir = mkdtempSync(join(tmpdir(), 'proj-world-no-placeholder-'))
    await projectKernelSubject({
      workspace: ws, projectId: project.id, chapterId: 0, contract, projectDir: dir, subjectType: 'project',
    })
    expect(readFileSync(join(dir, '设定/世界观/力量体系.md'), 'utf8')).toContain('内核全文')
    expect(existsSync(join(dir, '设定/世界观.md'))).toBe(false)
  })

  test('world fallback does not overwrite a replayed 设定/世界观.md', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'kernel-proj-'))
    const project = await createNovelProject(ws, { title: '试作' })
    await createNovelWorldbuilding(ws, {
      project_id: project.id,
      world_summary: '摘要A',
      raw_payload: { kernel_rel_path: '设定/世界观.md', kernel_full_text: '# 世界观\n内核全文' },
    })
    await createNovelWorldbuilding(ws, { project_id: project.id, world_summary: '旧行摘要' })
    const contract: any = { ...reviewContract, projection: { mounts: ['world', 'skill_tree'] } }
    const dir = mkdtempSync(join(tmpdir(), 'proj-world-keep-'))
    await projectKernelSubject({
      workspace: ws, projectId: project.id, chapterId: 0, contract, projectDir: dir, subjectType: 'project',
    })
    const body = readFileSync(join(dir, '设定/世界观.md'), 'utf8')
    expect(body).toContain('内核全文')
    expect(body).not.toBe('旧行摘要')
  })

  test('renderUserBriefMarkdown renders all five fields', () => {
    const md = renderUserBriefMarkdown(JSON.stringify({ title: 'T', genre: 'G', idea: 'I', length_target: 'long', constraints: 'C' }))
    for (const s of ['T', 'G', 'I', 'long', 'C']) expect(md).toContain(s)
  })
})
