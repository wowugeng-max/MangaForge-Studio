import { describe, expect, test } from 'bun:test'
import { buildPlanningWorkspaceModel } from './planningWorkspaceModel'

const project = {
  title: '万古长夜',
  target_words: 3000000,
  reference_config: {
    writing_bible: {
      promise: '寒门少年以阵法改写宗门秩序',
      volumes: [
        {
          title: '宗门试炼',
          goal: '让主角从外门杂役进入内门视野',
          stages: [
            { title: '压迫升级', conflict: '执事逼主角交出阵盘', payoff_model: '升级+打脸' },
          ],
        },
      ],
    },
    story_state: {
      last_updated_chapter: 7,
      foreshadowing_status: [{ name: '残缺阵盘', status: 'pending' }],
      mainline_progress: '外门压迫线推进到试炼前夜',
    },
  },
}

const outlines = [
  { id: 1, title: '第一卷 宗门试炼', outline_level: 'volume', start_chapter: 1, end_chapter: 50 },
  { id: 2, title: '压迫升级', outline_level: 'stage', parent_id: 1, start_chapter: 1, end_chapter: 12 },
  { id: 3, title: '试炼前夜转折', outline_level: 'turning_point', parent_id: 2, start_chapter: 10, end_chapter: 10 },
]

const chapters = Array.from({ length: 12 }).map((_, index) => ({
  id: index + 1,
  chapter_no: index + 1,
  title: `第${index + 1}章`,
  chapter_goal: index < 10 ? `推进外门压迫 ${index + 1}` : '',
  conflict: index < 10 ? '执事压迫' : '',
  ending_hook: index < 10 ? '试炼将至' : '',
  chapter_text: index < 7 ? '正文'.repeat(1200) : '',
  raw_payload: {
    payoff: index % 2 === 0 ? '升级' : '打脸',
    mainline_progress: index < 10 ? '外门压迫线' : '',
  },
}))

describe('buildPlanningWorkspaceModel', () => {
  test('derives strategic top status and mainline panel from existing project data', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      materialScore: { score: 74, can_generate: true },
      commercialReadiness: { score: 81 },
    })

    expect(model.topStatus.projectTitle).toBe('万古长夜')
    expect(model.topStatus.currentChapterLabel).toBe('第7章')
    expect(model.topStatus.targetWords).toBe(3000000)
    expect(model.topStatus.writtenWords).toBeGreaterThan(0)
    expect(model.topStatus.future10Coverage.ready).toBe(true)
    expect(model.mainline.readerPromise).toBe('寒门少年以阵法改写宗门秩序')
    expect(model.mainline.currentVolumeGoal).toBe('让主角从外门杂役进入内门视野')
    expect(model.mainline.currentStageConflict).toBe('执事逼主角交出阵盘')
  })

  test('builds a future 10-chapter route from the active chapter position', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
    })

    expect(model.futureRoute).toHaveLength(6)
    expect(model.futureRoute[0]).toMatchObject({
      chapterNo: 7,
      title: '第7章',
      chapterTask: '推进外门压迫 7',
      endingHook: '试炼将至',
    })
    expect(model.futureRoute[3].riskTags).toContain('缺章节任务')
  })

  test('reports planning health issues with direct action keys', () => {
    const sparseProject = {
      title: '空白项目',
      reference_config: {
        writing_bible: { promise: '' },
        story_state: { last_updated_chapter: 1 },
      },
    }

    const model = buildPlanningWorkspaceModel({
      selectedProject: sparseProject,
      outlines: [],
      chapters: [{ id: 1, chapter_no: 1, title: '第一章', chapter_text: '正文' }],
      activeChapter: { id: 1, chapter_no: 1, title: '第一章', chapter_text: '正文' },
    })

    expect(model.healthIssues.map(issue => issue.key)).toContain('missing_volume_goal')
    expect(model.healthIssues.map(issue => issue.actionKey)).toContain('complete_volume_plan')
    expect(model.topStatus.longformHealth.status).toBe('needs_planning')
  })
})
