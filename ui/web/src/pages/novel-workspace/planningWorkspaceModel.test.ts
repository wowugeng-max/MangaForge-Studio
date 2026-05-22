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
    expect(model.topStatus.future10Coverage.ready).toBe(false)
    expect(model.topStatus.future10Coverage.required).toBe(10)
    expect(model.topStatus.future10Coverage.missingChapters).toContain(13)
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
    expect(model.healthIssues.find(issue => issue.key === 'missing_reader_promise')?.actionKey).toBe('open_story_assets')
    expect(model.healthIssues.find(issue => issue.key === 'future10_incomplete')?.actionKey).toBe('update_rolling_plan')
    expect(model.topStatus.longformHealth.status).toBe('needs_planning')
  })

  test('reports incomplete future coverage when fewer than 10 future chapter numbers exist', () => {
    const partialChapters = Array.from({ length: 4 }).map((_, index) => ({
      id: index + 1,
      chapter_no: index + 1,
      title: `第${index + 1}章`,
      chapter_goal: `推进主线 ${index + 1}`,
      conflict: '外门压迫',
      ending_hook: '危机递进',
      raw_payload: { mainline_progress: '外门压迫线' },
    }))

    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters: partialChapters,
      activeChapter: partialChapters[0],
    })

    expect(model.topStatus.future10Coverage.ready).toBe(false)
    expect(model.topStatus.future10Coverage.required).toBe(10)
    expect(model.topStatus.future10Coverage.planned).toBe(4)
    expect(model.topStatus.future10Coverage.missingChapters).toEqual([5, 6, 7, 8, 9, 10])
    expect(model.healthIssues.map(issue => issue.key)).toContain('future10_incomplete')
  })

  test('checks story state freshness against latest written chapter instead of active future chapter', () => {
    const writtenAndPlannedChapters = Array.from({ length: 12 }).map((_, index) => ({
      id: index + 1,
      chapter_no: index + 1,
      title: `第${index + 1}章`,
      chapter_goal: `推进主线 ${index + 1}`,
      conflict: '外门压迫',
      ending_hook: '危机递进',
      chapter_text: index < 3 ? '正文'.repeat(100) : index === 3 ? '【占位正文】' : '',
      raw_payload: { mainline_progress: '外门压迫线' },
    }))
    const currentStoryProject = {
      ...project,
      reference_config: {
        ...project.reference_config,
        story_state: { ...project.reference_config.story_state, last_updated_chapter: 3 },
      },
    }

    const model = buildPlanningWorkspaceModel({
      selectedProject: currentStoryProject,
      outlines,
      chapters: writtenAndPlannedChapters,
      activeChapter: writtenAndPlannedChapters[9],
    })

    expect(model.healthIssues.map(issue => issue.key)).not.toContain('story_state_stale')
  })

  test('does not mark a chapter as serving the volume from story state alone', () => {
    const unplannedChapter = {
      id: 20,
      chapter_no: 20,
      title: '第20章',
      chapter_text: '',
      raw_payload: {},
    }

    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters: [unplannedChapter],
      activeChapter: unplannedChapter,
    })

    expect(model.mainline.currentChapterServesVolume).toBe(false)
  })

  test('uses production outline_type records to locate current volume and stage', () => {
    const productionOutlines = [
      { id: 11, title: '第二卷 内门风暴', outline_type: 'volume', summary: '主角卷入内门派系斗争', start_chapter: 51, end_chapter: 100 },
      { id: 12, title: '内门夺位', outline_type: 'arc', parent_id: 11, summary: '执法堂与丹堂冲突升级', start_chapter: 61, end_chapter: 70 },
      { id: 13, title: '执法堂反噬', outline_type: 'turning_point', parent_id: 12, start_chapter: 66, end_chapter: 66 },
    ]
    const chapter = {
      id: 66,
      chapter_no: 66,
      title: '第66章',
      chapter_goal: '让主角夺回审判主动权',
      conflict: '执法堂逼供',
      ending_hook: '长老亲临',
      raw_payload: { mainline_progress: '内门夺位线' },
    }

    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines: productionOutlines,
      chapters: [chapter],
      activeChapter: chapter,
    })

    expect(model.topStatus.currentVolume).toBe('第二卷 内门风暴')
    expect(model.topStatus.currentStage).toBe('内门夺位')
    expect(model.mainline.currentVolumeGoal).toBe('主角卷入内门派系斗争')
    expect(model.mainline.currentStageConflict).toBe('执法堂逼供')
    expect(model.mainline.nextTurn).toBe('执法堂反噬')
  })

  test('counts applied future 100 skeleton chapter outlines as planned coverage', () => {
    const skeletonOutlines = Array.from({ length: 100 }).map((_, index) => {
      const chapterNo = index + 20
      return {
        id: 1000 + chapterNo,
        outline_type: 'chapter',
        title: `第${chapterNo}章 骨架`,
        summary: `推进长线骨架 ${chapterNo}`,
        conflict_points: ['强敌压迫'],
        hook: '新危机出现',
        raw_payload: {
          source: 'future_100_skeleton',
          chapter_no: chapterNo,
          future100: {
            chapter_no: chapterNo,
            title: `骨架 ${chapterNo}`,
            chapter_goal: `推进长线骨架 ${chapterNo}`,
            conflict: '强敌压迫',
            ending_hook: '新危机出现',
            mainline_progress: '宗门暗线',
          },
        },
      }
    })
    const active = {
      id: 20,
      chapter_no: 20,
      title: '第20章',
      chapter_goal: '进入新卷',
      conflict: '旧敌追击',
      ending_hook: '宗门传令',
      raw_payload: { mainline_progress: '宗门暗线' },
    }

    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines: skeletonOutlines,
      chapters: [active],
      activeChapter: active,
    })

    expect(model.topStatus.future100Coverage.ready).toBe(true)
    expect(model.topStatus.future100Coverage.planned).toBe(100)
    expect(model.topStatus.future100Coverage.missingChapters).toEqual([])
  })
})
