import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  createNovelProject,
  getNovelProject,
  listNovelCharacters,
  listNovelChapters,
  listNovelOutlines,
  listNovelReviews,
  listNovelWorldbuilding,
  upsertNovelChapterByNumber,
} from '../novel'
import { createChapterPlanningEnsureService } from './novel-planning-ensure-service'

let workspaces: string[] = []

async function tempWorkspace() {
  const dir = await mkdtemp(join(tmpdir(), 'mangaforge-planning-ensure-'))
  workspaces.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(workspaces.map(workspace => rm(workspace, { recursive: true, force: true })))
  workspaces = []
})

describe('createChapterPlanningEnsureService', () => {
  test('runs the planning agent chain and stores detail chapters for the requested range', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '自动规划落库', length_target: 'epic', reference_config: {} })
    const calls: any[] = []
    const ensureChapterPlanningForRange = createChapterPlanningEnsureService({
      executeNovelAgentChain: async (...args: any[]) => {
        calls.push(args)
        return {
          results: [
            {
              step: 'detail-outline-agent',
              success: true,
              outputSource: 'llm',
              output: {
                detail_chapters: [
                  {
                    chapter_no: 3,
                    title: '暗潮入城',
                    summary: '主角带着账本进入城中，第一次发现账本牵出旧案。',
                    conflict: '守门人试图夺走账本',
                    ending_hook: '账本夹层露出第二份名单',
                    scenes: [{ title: '城门盘查', goal: '把账本危机推到台前' }],
                    continuity_from_prev: '承接第二章账本失而复得',
                  },
                  {
                    chapter_no: 4,
                    title: '名单上的熟人',
                    summary: '主角确认名单中有熟人名字，决定主动设局。',
                    conflict: '信任对象可能已经背叛',
                    ending_hook: '熟人深夜主动来访',
                    scenes: [{ title: '茶楼试探', goal: '制造信任裂缝' }],
                  },
                  {
                    chapter_no: 5,
                    title: '范围外章节',
                    summary: '不应写入本次范围',
                    conflict: '范围外冲突',
                    ending_hook: '范围外钩子',
                    scenes: [{ title: '范围外场景' }],
                  },
                ],
              },
            },
          ],
        }
      },
    })

    const result = await ensureChapterPlanningForRange(workspace, project, {
      start_chapter: 3,
      target_chapter: 4,
      chapter_count: 2,
      continue_from: 2,
      model_id: 12,
      missing_chapter_nos: [3, 4],
    })
    const chapters = await listNovelChapters(workspace, project.id)

    expect(calls).toHaveLength(1)
    expect(calls[0][0].id).toBe(project.id)
    expect(calls[0][1]).toContain('请为无人值守自动写作补齐')
    expect(calls[0][2]).toBe(workspace)
    expect(calls[0][3]).toBe(12)
    expect(calls[0][5]).toMatchObject({
      chapterCount: 2,
      continueFrom: 2,
      userOutline: '请重点补齐第 3-4 章的章节目标、核心冲突、结尾钩子和场景拆分。',
    })
    expect(result).toMatchObject({ ok: true, status: 'success' })
    expect(result.repaired_chapters.map((chapter: any) => chapter.chapter_no)).toEqual([3, 4])
    expect(chapters.map(chapter => chapter.chapter_no)).toEqual([3, 4])
    expect(chapters[0]).toMatchObject({
      title: '暗潮入城',
      chapter_goal: '主角带着账本进入城中，第一次发现账本牵出旧案。',
      conflict: '守门人试图夺走账本',
      ending_hook: '账本夹层露出第二份名单',
    })
    expect(chapters[0].scene_breakdown).toHaveLength(1)
    expect(chapters[0].continuity_notes).toEqual(['承接第二章账本失而复得'])
  })

  test('syncs full planning agent outputs into the project store', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '完整自动规划', length_target: 'epic', reference_config: {} })
    const ensureChapterPlanningForRange = createChapterPlanningEnsureService({
      executeNovelAgentChain: async () => ({
        results: [
          {
            step: 'market-agent',
            success: true,
            outputSource: 'llm',
            output: {
              genre: '玄幻悬疑',
              target_audience: '男频长篇读者',
              sub_genres: ['权谋'],
              style_tags: ['强情节'],
              commercial_tags: ['悬念'],
            },
          },
          {
            step: 'world-agent',
            success: true,
            outputSource: 'llm',
            output: {
              genre: '东方玄幻',
              world_summary: '九州城邦被旧账本牵出暗线。',
              rules: ['灵契不可违背'],
              factions: [{ name: '烛司' }],
              locations: [{ name: '青门城' }],
              systems: [{ name: '灵契体系' }],
              items: [{ name: '旧账本' }],
              timeline_anchor: '主角入城前夜',
              known_unknowns: ['账本主人是谁'],
            },
          },
          {
            step: 'character-agent',
            success: true,
            outputSource: 'llm',
            output: {
              characters: [
                { name: '林照', role: '主角', motivation: '查清旧案', goal: '保住账本' },
              ],
            },
          },
          {
            step: 'outline-agent',
            success: true,
            outputSource: 'llm',
            output: {
              synopsis: '主角凭旧账本撬动青门城暗线。',
              master_outline: { title: '青门旧账', summary: '从账本入城到第一轮反击。', hook: '账本夹层藏着名单' },
              volume_outlines: [{ title: '第一卷 入城', summary: '主角入城并确认敌人。', hook: '熟人现身' }],
              foreshadowing_plan: [{ description: '账本夹层名单', plant_at: 1, payoff_at: 4 }],
            },
          },
          {
            step: 'detail-outline-agent',
            success: true,
            outputSource: 'llm',
            output: {
              detail_chapters: [
                {
                  chapter_no: 1,
                  title: '账本入城',
                  summary: '主角带账本入城。',
                  conflict: '守门人盘查',
                  ending_hook: '夹层露出名单',
                  scenes: [{ title: '城门', goal: '建立危机' }],
                },
              ],
            },
          },
          {
            step: 'continuity-check-agent',
            success: true,
            outputSource: 'llm',
            output: {
              is_ready_for_prose: true,
              issues: [],
            },
          },
        ],
      }),
    })

    const result = await ensureChapterPlanningForRange(workspace, project, {
      start_chapter: 1,
      target_chapter: 1,
      chapter_count: 1,
      missing_chapter_nos: [1],
    })
    const [storedProject, worldbuilding, characters, outlines, reviews, chapters] = await Promise.all([
      getNovelProject(workspace, project.id),
      listNovelWorldbuilding(workspace, project.id),
      listNovelCharacters(workspace, project.id),
      listNovelOutlines(workspace, project.id),
      listNovelReviews(workspace, project.id),
      listNovelChapters(workspace, project.id),
    ])

    expect(result.status).toBe('success')
    expect(worldbuilding).toHaveLength(1)
    expect(worldbuilding[0].world_summary).toContain('九州城邦')
    expect(characters.map(character => character.name)).toEqual(['林照'])
    expect(outlines.map(outline => outline.outline_type).sort()).toEqual(['foreshadowing', 'master', 'volume'])
    expect(outlines.find(outline => outline.outline_type === 'master')?.summary).toContain('第一轮反击')
    expect(chapters[0]).toMatchObject({
      chapter_no: 1,
      title: '账本入城',
      chapter_goal: '主角带账本入城。',
      conflict: '守门人盘查',
      ending_hook: '夹层露出名单',
    })
    expect(reviews).toHaveLength(1)
    expect(reviews[0]).toMatchObject({ review_type: 'continuity', status: 'ok' })
    expect(storedProject).toMatchObject({
      genre: '东方玄幻',
      synopsis: '从账本入城到第一轮反击。',
      target_audience: '男频长篇读者',
      status: 'draft',
    })
  })

  test('limits existing chapter context to the latest eight chapters', async () => {
    const workspace = await tempWorkspace()
    const project = await createNovelProject(workspace, { title: '长篇上下文保护', length_target: 'epic', reference_config: {} })
    for (let chapterNo = 1; chapterNo <= 12; chapterNo += 1) {
      await upsertNovelChapterByNumber(workspace, {
        project_id: project.id,
        chapter_no: chapterNo,
        title: `第${chapterNo}章`,
        chapter_summary: `第${chapterNo}章摘要`,
        ending_hook: `第${chapterNo}章钩子`,
        chapter_text: `第${chapterNo}章正文`.repeat(300),
      } as any)
    }
    const calls: any[] = []
    const ensureChapterPlanningForRange = createChapterPlanningEnsureService({
      executeNovelAgentChain: async (...args: any[]) => {
        calls.push(args)
        return {
          results: [
            {
              step: 'detail-outline-agent',
              success: true,
              outputSource: 'llm',
              output: {
                detail_chapters: [
                  {
                    chapter_no: 13,
                    title: '新章',
                    summary: '新章摘要',
                    conflict: '新章冲突',
                    ending_hook: '新章钩子',
                    scenes: [{ title: '新章场景' }],
                  },
                ],
              },
            },
          ],
        }
      },
    })

    await ensureChapterPlanningForRange(workspace, project, {
      start_chapter: 13,
      target_chapter: 13,
      model_id: 12,
      missing_chapter_nos: [13],
    })

    const chainOptions = calls[0][5]
    expect(chainOptions.existingChapters.map((chapter: any) => chapter.chapter_no)).toEqual([5, 6, 7, 8, 9, 10, 11, 12])
    expect(chainOptions.existingChapters.every((chapter: any) => chapter.chapter_text.length <= 2000)).toBe(true)
  })
})
