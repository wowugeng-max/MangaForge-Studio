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

const contextPackage = {
  chapter_target: {
    chapter_goal: '用警钟把边军危机压到王府筵席上',
    previous_handoff: '王府内钟声先乱',
    core_conflict: '谢怀安要借钟声验人心，王府管事试图把警讯压成误传',
    emotional_movement: '从压抑回府转为当众夺回主动权',
    payoff: '读者看到失势皇子第一次反压王府新贵',
    ending_hook: '城门守将递来带血腰牌',
    forbidden_repeats: ['不要重复解释穿越设定'],
  },
  preflight: {
    ready: true,
    blockers: [],
  },
}

const sceneCardChapter = {
  ...chapters[1],
  scene_list: [
    {
      scene_no: 'not-a-number',
      title: '警钟入席',
      purpose: '把边军警讯压到王府筵席上',
      conflict: '管事试图把警讯压成误传',
      turn: '谢怀安当众点出腰牌血迹',
      ending_hook: '第三声钟响后，守将闯入',
    },
  ],
}

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

  test('stale story state routes active prose chapter to canon update before revision', () => {
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
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.nextChapter?.chapterNo).toBe(1)
    expect(model.draftPipeline.state).toBe('draft_generated')
    expect(model.readiness.blockers).toEqual([])
    expect(model.readiness.warnings.map(check => check.key)).toContain('story_state_stale')
    expect(model.primaryActionKey).toBe('update_canon')
    expect(model.recommendedRole).toBe('continuity_auditor')
  })

  test('sparse chapter with outline_id matching a valid manual outline hydrates plan fields', () => {
    const sparseChapter = {
      id: 105,
      outline_id: 805,
      chapter_no: 5,
      title: '密印归案',
      chapter_text: '',
    }
    const manualOutlines = [
      ...outlines,
      {
        id: 805,
        title: '密印归案',
        outline_level: 'chapter',
        summary: '让谢怀安把账册密印和军饷案扣回王府主线',
        conflict_points: ['太妃近侍试图销毁账册夹层'],
        hook: '密印背面出现京中旧臣的私记',
      },
    ]

    const model = buildWritingCockpitModel({
      project,
      outlines: manualOutlines,
      chapters: [chapters[0], sparseChapter],
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.nextChapter?.chapterNo).toBe(5)
    expect(model.nextChapter?.goal).toBe('让谢怀安把账册密印和军饷案扣回王府主线')
    expect(model.nextChapter?.conflict).toBe('太妃近侍试图销毁账册夹层')
    expect(model.nextChapter?.endingHook).toBe('密印背面出现京中旧臣的私记')
    expect(model.readiness.blockers).toEqual([])
    expect(model.primaryActionKey).toBe('write_draft')
  })

  test('sparse chapter with manual outline title chapter number hydrates plan fields', () => {
    const sparseChapter = {
      id: 106,
      chapter_no: 6,
      title: '霜夜点将',
      chapter_text: '',
    }
    const manualOutlines = [
      ...outlines,
      {
        id: 806,
        title: '第6章 霜夜点将',
        outline_type: 'chapter',
        summary: '让谢怀安在霜夜点出第一批可信边军',
        conflict_points: ['老校尉怀疑谢怀安断臂后已无统军之力'],
        hook: '点将名册最后一页被人提前撕走',
      },
    ]

    const model = buildWritingCockpitModel({
      project,
      outlines: manualOutlines,
      chapters: [chapters[0], sparseChapter],
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.nextChapter?.chapterNo).toBe(6)
    expect(model.nextChapter?.goal).toBe('让谢怀安在霜夜点出第一批可信边军')
    expect(model.nextChapter?.conflict).toBe('老校尉怀疑谢怀安断臂后已无统军之力')
    expect(model.nextChapter?.endingHook).toBe('点将名册最后一页被人提前撕走')
    expect(model.readiness.blockers).toEqual([])
    expect(model.primaryActionKey).toBe('write_draft')
  })

  test('planning desk shows empty state without an active chapter', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [],
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('blocked')
    expect(model.chapterPlanningDesk.statusLabel).toBe('缺目标章节')
    expect(model.chapterPlanningDesk.shouldAutoExpandPlanner).toBe(true)
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_outline_panel')
  })

  test('planning desk requires context package before scene planning', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('needs_context')
    expect(model.chapterPlanningDesk.contextPackageStatus).toBe('missing')
    expect(model.chapterPlanningDesk.shouldAutoExpandPlanner).toBe(true)
    expect(model.chapterPlanningDesk.reasons).toContain('本章还没有加载上下文包。')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('refresh_context_package')
  })

  test('planning desk treats failed context preflight as insufficient context', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      contextPackage: {
        ...contextPackage,
        preflight: {
          ready: false,
          blockers: ['缺少章节目标'],
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('needs_context')
    expect(model.chapterPlanningDesk.contextPackageStatus).toBe('insufficient')
    expect(model.chapterPlanningDesk.reasons).toContain('上下文包预检未通过：缺少章节目标')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
  })

  test('planning desk asks for scene cards when context is ready but scene plan is missing', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      contextPackage,
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('needs_scene_plan')
    expect(model.chapterPlanningDesk.contextPackageStatus).toBe('ready')
    expect(model.chapterPlanningDesk.scenePlanStatus).toBe('missing')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('build_scene_plan')
  })

  test('planning desk reads backend-style context target aliases', () => {
    const backendContextPackage = {
      chapter_target: {
        goal: '把警钟危机转成谢怀安的第一次主动试探',
        conflict: '王府管事要压警讯，谢怀安要逼众人表态',
        ending_hook: '带血腰牌递到谢怀安掌心',
      },
      preflight: { ready: true, blockers: [] },
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: backendContextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.contextPackageStatus).toBe('ready')
    expect(model.chapterPlanningDesk.episodePlan.chapterObjective).toBe('把警钟危机转成谢怀安的第一次主动试探')
    expect(model.chapterPlanningDesk.episodePlan.coreConflict).toBe('王府管事要压警讯，谢怀安要逼众人表态')
  })

  test('planning desk does not treat empty scene cards as ready', () => {
    const emptySceneCardChapter = {
      ...chapters[1],
      scene_list: [{}],
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], emptySceneCardChapter],
      activeChapter: emptySceneCardChapter,
      contextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.scenePlanStatus).toBe('missing')
    expect(model.chapterPlanningDesk.sceneCards).toEqual([])
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('build_scene_plan')
  })

  test('planning desk blocks drafting when diagnostics report blockers', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage,
      diagnostics: {
        preflight: {
          ready: false,
          blockers: ['缺少上一章承接'],
        },
        material_score: { score: 88, can_generate: true },
      },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('blocked')
    expect(model.chapterPlanningDesk.reasons).toContain('生成诊断阻塞：缺少上一章承接')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
    expect(model.chapterPlanningDesk.shouldAutoExpandPlanner).toBe(true)
  })

  test('planning desk is ready when context and scene cards are usable', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage,
      diagnostics: {
        preflight: { ready: true, blockers: [] },
        material_score: { score: 88, can_generate: true },
      },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('ready')
    expect(model.chapterPlanningDesk.statusLabel).toBe('本章可写')
    expect(model.chapterPlanningDesk.shouldAutoExpandPlanner).toBe(false)
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('confirm_plan_and_write_draft')
    expect(model.chapterPlanningDesk.episodePlan.chapterObjective).toBe('用警钟把边军危机压到王府筵席上')
    expect(model.chapterPlanningDesk.sceneCards).toHaveLength(1)
    expect(model.chapterPlanningDesk.sceneCards[0].sceneNo).toBe(1)
    expect(model.chapterPlanningDesk.sceneCards[0].endingHook).toBe('第三声钟响后，守将闯入')
  })
})
