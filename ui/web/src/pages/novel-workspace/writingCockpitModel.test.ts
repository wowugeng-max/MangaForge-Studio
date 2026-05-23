import { describe, expect, test } from 'bun:test'
import { buildWritingCockpitModel } from './writingCockpitModel'

const project = {
  title: '大益武夫',
  reference_config: {
    writing_bible: {
      promise: '看失势皇子以武道和权谋守住镜州',
      volumes: [
        {
          title: '第一卷 镜州风雷',
          goal: '让谢怀安在镜州立住武夫根基并摸清王府人心',
        },
      ],
    },
    story_state: {
      last_updated_chapter: 1,
      mainline_progress: '谢怀安断臂归来，王府旧部观望',
    },
  },
}

const outlines = [
  {
    id: 1,
    title: '第一卷 镜州风雷',
    outline_level: 'volume',
    summary: '失势皇子回到镜州，在边军、王府和朝堂暗线之间重建威望。',
    raw_payload: {
      start_chapter: 1,
      end_chapter: 60,
    },
  },
]

const chapters = [
  {
    id: 101,
    chapter_no: 1,
    title: '断臂归来',
    chapter_goal: '让谢怀安带伤回府，逼出王府众人的第一轮站队',
    conflict: '旧部想迎，新贵想压，太妃只肯给半分体面',
    ending_hook: '城外烽烟未熄，王府内钟声先乱',
    chapter_text: '谢怀安在雨里踏入王府，断臂处的布带仍渗着血。'.repeat(40),
    raw_payload: {
      must_advance: ['王府旧部认出谢怀安的军中信物'],
      forbidden_repeats: ['不要重复解释镜州地理'],
    },
  },
  {
    id: 102,
    chapter_no: 2,
    title: '警钟入城',
    chapter_goal: '用一口警钟把边军危机压到王府筵席上',
    conflict: '谢怀安要借钟声验人心，王府管事试图把警讯压成误传',
    ending_hook: '警钟第三响后，城门守将递来带血腰牌',
    chapter_text: '',
    raw_payload: {
      must_advance: ['迟正确认王府人心'],
      forbidden_repeats: ['不要重复解释穿越设定'],
    },
  },
]

describe('buildWritingCockpitModel', () => {
  test('ready project data chooses the first planned unwritten chapter as daily target', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      materialScore: { score: 82, can_generate: true },
      activeRuns: [],
    })

    expect(model.nextChapter?.chapterNo).toBe(2)
    expect(model.nextChapter?.goal).toBe('用一口警钟把边军危机压到王府筵席上')
    expect(model.nextChapter?.previousEnding).toBe('城外烽烟未熄，王府内钟声先乱')
    expect(model.nextChapter?.whyItMatters).toContain('让谢怀安在镜州立住武夫根基并摸清王府人心')
    expect(model.previousChapter?.chapterNo).toBe(1)
    expect(model.primaryActionKey).toBe('write_draft')
    expect(model.topStatus.primaryActionKey).toBe('write_draft')
    expect(model.recommendedRole).toBe('draft_writer')
    expect(model.modelTeam.recommendedRole).toBe('draft_writer')
    expect(model.blockers).toEqual([])
    expect(model.readiness.blockers).toEqual([])
    expect(model.nextChapter?.mustAdvance).toContain('迟正确认王府人心')
    expect(model.nextChapter?.forbiddenRepeats).toContain('不要重复解释穿越设定')
  })

  test('missing writing bible blocks draft generation', () => {
    const model = buildWritingCockpitModel({
      selectedProject: { title: '大益武夫', reference_config: { story_state: { last_updated_chapter: 1 } } },
      outlines,
      chapters,
      materialScore: { score: 82, can_generate: true },
      runs: [],
    })

    expect(model.readiness.blockers.map(check => check.key)).toContain('writing_bible_missing')
    expect(model.primaryActionKey).toBe('open_writing_bible')
    expect(model.topStatus.primaryActionKey).toBe('open_writing_bible')
    expect(model.recommendedRole).toBe('chief_editor')
    expect(model.modelTeam.recommendedRole).toBe('chief_editor')
  })

  test('material score not ready blocks generation', () => {
    const model = buildWritingCockpitModel({
      selectedProject: project,
      outlines,
      chapters,
      commercialReadiness: { score: 52, can_generate: false },
      runs: [],
    })

    expect(model.readiness.blockers.map(check => check.key)).toContain('materials_not_ready')
    expect(model.primaryActionKey).toBe('repair_materials')
    expect(model.topStatus.primaryActionKey).toBe('repair_materials')
    expect(model.recommendedRole).toBe('episode_planner')
    expect(model.modelTeam.recommendedRole).toBe('episode_planner')
  })

  test('an active chapter that already has prose selects revision', () => {
    const model = buildWritingCockpitModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      runs: [],
    })

    expect(model.nextChapter?.chapterNo).toBe(1)
    expect(model.draftPipeline.state).toBe('draft_generated')
    expect(model.recommendedRole).toBe('revision_editor')
    expect(model.modelTeam.recommendedRole).toBe('revision_editor')
    expect(model.primaryActionKey).toBe('review_draft')
    expect(model.topStatus.primaryActionKey).toBe('review_draft')
  })

  test('no chapter starts with planning', () => {
    const model = buildWritingCockpitModel({
      selectedProject: project,
      outlines,
      chapters: [],
      materialScore: { score: 82, can_generate: true },
      runs: [],
    })

    expect(model.nextChapter).toBeNull()
    expect(model.primaryActionKey).toBe('open_outline_panel')
    expect(model.topStatus.primaryActionKey).toBe('open_outline_panel')
    expect(model.readiness.blockers.map(check => check.key)).toContain('chapter_missing')
  })

  test('sparse chapter with valid chapter outline hydrates plan fields and allows draft writing', () => {
    const sparseChapter = {
      id: 103,
      chapter_no: 3,
      title: '夜审旧账',
      chapter_text: '',
    }
    const chapterOutlines = [
      ...outlines,
      {
        id: 3,
        title: '第3章 夜审旧账',
        outline_type: 'chapter',
        raw_payload: {
          future100: {
            chapter_no: 3,
            chapter_goal: '逼王府账房交出军饷流向',
            conflict: '账房以太妃手令拖延，谢怀安以军法逼供',
            ending_hook: '账册夹层露出京城密印',
          },
        },
      },
    ]

    const model = buildWritingCockpitModel({
      project,
      outlines: chapterOutlines,
      chapters: [chapters[0], sparseChapter],
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.nextChapter?.chapterNo).toBe(3)
    expect(model.nextChapter?.goal).toBe('逼王府账房交出军饷流向')
    expect(model.nextChapter?.conflict).toBe('账房以太妃手令拖延，谢怀安以军法逼供')
    expect(model.nextChapter?.endingHook).toBe('账册夹层露出京城密印')
    expect(model.readiness.blockers).toEqual([])
    expect(model.primaryActionKey).toBe('write_draft')
    expect(model.recommendedRole).toBe('draft_writer')
  })

  test('sparse chapter with invalid chapter outline blocks scene planning', () => {
    const sparseChapter = {
      id: 104,
      chapter_no: 4,
      title: '空钟回响',
      chapter_text: '',
    }
    const invalidOutlines = [
      ...outlines,
      {
        id: 4,
        title: '第4章 空钟回响',
        outline_level: 'chapter',
        raw_payload: {
          skeleton: {
            chapter_no: 4,
            chapter_goal: '让警钟余波扩散到边军',
          },
        },
      },
    ]

    const model = buildWritingCockpitModel({
      project,
      outlines: invalidOutlines,
      chapters: [chapters[0], sparseChapter],
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.nextChapter?.chapterNo).toBe(4)
    expect(model.readiness.blockers.map(check => check.key)).toContain('chapter_outline_missing')
    expect(model.primaryActionKey).toBe('build_scene_plan')
    expect(model.recommendedRole).toBe('episode_planner')
  })

  test('stale story state recommends canon update when draft blockers are clear', () => {
    const staleProject = {
      ...project,
      reference_config: {
        ...project.reference_config,
        story_state: {
          ...project.reference_config.story_state,
          last_updated_chapter: 0,
        },
      },
    }

    const model = buildWritingCockpitModel({
      project: staleProject,
      outlines,
      chapters,
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.nextChapter?.chapterNo).toBe(2)
    expect(model.readiness.blockers).toEqual([])
    expect(model.readiness.warnings.map(check => check.key)).toContain('story_state_stale')
    expect(model.primaryActionKey).toBe('update_canon')
    expect(model.topStatus.primaryActionKey).toBe('update_canon')
    expect(model.recommendedRole).toBe('continuity_auditor')
    expect(model.modelTeam.recommendedRole).toBe('continuity_auditor')
  })
})
