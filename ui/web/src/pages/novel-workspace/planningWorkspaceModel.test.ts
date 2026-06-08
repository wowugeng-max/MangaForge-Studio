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

const storylineSettings = [
  {
    id: 201,
    entity_type: 'mainline',
    name: '外门压迫主线',
    summary: '主角在外门压迫中建立反击能力。',
    first_chapter_no: 1,
    last_chapter_no: 30,
    constraints_json: {
      advance_rule: '每三章必须推进一次压迫升级或反击回报。',
      forbidden_reveal: '不得提前揭露宗主真正身份。',
    },
    state_json: {
      current_state: '执事已经开始针对主角。',
      last_advanced_chapter: 4,
      next_advance_chapter: 6,
      payoff_status: 'pending',
    },
    payload_json: {
      priority: 'high',
      related_characters: ['李玄', '赵执事'],
      expected_payoff: '试炼前夜完成第一次公开打脸。',
    },
  },
  {
    id: 202,
    entity_type: 'foreshadowing_arc',
    name: '残缺阵盘伏笔',
    summary: '阵盘缺口指向宗门旧案。',
    first_chapter_no: 2,
    last_chapter_no: 18,
    constraints_json: {
      advance_rule: '只给线索，不解释旧案全貌。',
      forbidden_reveal: '第18章前不得说出旧案凶手。',
    },
    state_json: {
      current_state: '只露出阵盘缺口。',
      last_advanced_chapter: 3,
      next_advance_chapter: 9,
      payoff_status: 'debt',
    },
    payload_json: {
      priority: 'medium',
      related_foreshadowing: ['残缺阵盘'],
      expected_payoff: '内门试炼中回收阵盘来历。',
    },
  },
  {
    id: 203,
    entity_type: 'item',
    name: '玄铁阵钉',
    summary: '普通物品设定，不进入剧情线看板。',
  },
]

function first30Review(overrides: Record<string, any> = {}) {
  const report = {
    score: 76,
    status: 'needs_repair',
    summary: '前30章有商业化雏形，但关键留存点需要补强。',
    positioning: {
      promise_ready: true,
      reader_promise: '寒门少年靠阵法反压宗门秩序。',
    },
    segments: [
      { key: '1-3', label: '开篇三章', score: 82, coverage: 100, hook_rate: 80, payoff_average: 2.3, chapter_count: 3 },
      { key: '4-10', label: '试读十章', score: 68, coverage: 100, hook_rate: 57, payoff_average: 1.4, chapter_count: 7 },
      { key: '11-30', label: '付费前蓄势', score: 60, coverage: 40, hook_rate: 45, payoff_average: 1.1, chapter_count: 8 },
    ],
    chapter_cards: [
      { chapter_id: 1, chapter_no: 1, title: '第一章', score: 84, word_count: 3200, flags: [] },
      { chapter_id: 7, chapter_no: 7, title: '第七章', score: 61, word_count: 2600, flags: ['章末钩子弱', '爽点/悬念信号少'] },
    ],
    risks: [{ severity: 'high', segment: '4-10', issue: '章末追读钩子覆盖率偏低。', action: '补未解决问题。' }],
    next_actions: ['优先重做第4-10章试读闭环。'],
    ...overrides.report,
  }
  return {
    id: overrides.id || 100,
    review_type: 'first30_retention_diagnosis',
    status: overrides.status || 'warn',
    summary: overrides.summary || `前30章留存诊断：${report.score} 分`,
    created_at: overrides.created_at || '2026-06-03T10:00:00.000Z',
    payload: JSON.stringify({ report }),
    ...overrides.record,
  }
}

function coreDriftReview(overrides: Record<string, any> = {}) {
  const report = {
    status: 'warn',
    score: 66,
    label: '核心偏移 1',
    drift_risks: ['核心冲突未充分落地'],
    ...overrides.report,
  }
  return {
    id: overrides.id || 301,
    review_type: 'chapter_core_drift',
    status: overrides.status || 'warn',
    summary: overrides.summary || report.label,
    created_at: overrides.created_at || '2026-06-04T10:00:00.000Z',
    payload: JSON.stringify({ chapter_id: 7, chapter_no: 7, core_drift: report }),
    ...overrides.record,
  }
}

function readerPayoffReview(overrides: Record<string, any> = {}) {
  const report = {
    status: 'warn',
    score: 62,
    label: '回报欠账 2',
    debt_count: 2,
    missed: [{ text: '阵盘裂纹的回报' }],
    debts: [{ text: '试炼资格伏笔待回收' }],
    ...overrides.report,
  }
  return {
    id: overrides.id || 302,
    review_type: 'reader_payoff_sync',
    status: overrides.status || 'warn',
    summary: overrides.summary || report.label,
    created_at: overrides.created_at || '2026-06-04T10:05:00.000Z',
    payload: JSON.stringify({ chapter_id: 7, chapter_no: 7, reader_payoff_sync: report }),
    ...overrides.record,
  }
}

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
    expect(model.first30Retention.status).toBe('missing')
    expect(model.first30Retention.actionKey).toBe('run_first30_retention')
  })

  test('parses latest first30 retention diagnosis review into planning model', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      reviews: [
        first30Review({ id: 1, created_at: '2026-06-03T09:00:00.000Z', report: { score: 62, status: 'blocked' } }),
        first30Review({ id: 2, created_at: '2026-06-03T10:00:00.000Z' }),
      ],
    })

    expect(model.first30Retention.status).toBe('needs_repair')
    expect(model.first30Retention.score).toBe(76)
    expect(model.first30Retention.summary).toContain('商业化雏形')
    expect(model.first30Retention.promiseReady).toBe(true)
    expect(model.first30Retention.segments.map(item => item.key)).toEqual(['1-3', '4-10', '11-30'])
    expect(model.first30Retention.chapterCards[1].riskLevel).toBe('high')
    expect(model.first30Retention.chapterCards[1].flags).toContain('章末钩子弱')
    expect(model.first30Retention.nextActions).toContain('优先重做第4-10章试读闭环。')
    expect(model.first30Retention.actionKey).toBe('create_first30_repair')
  })

  test('builds storyline board from setting entities and first30 risks', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      settingEntities: storylineSettings,
      reviews: [first30Review()],
    })

    expect(model.storylineBoard.status).toBe('needs_attention')
    expect(model.storylineBoard.total).toBe(2)
    expect(model.storylineBoard.overdueCount).toBe(1)
    expect(model.storylineBoard.debtCount).toBe(1)
    expect(model.storylineBoard.summary).toContain('1 条逾期')
    expect(model.storylineBoard.groups.map(group => group.key)).toContain('mainline')
    expect(model.storylineBoard.groups.map(group => group.key)).toContain('foreshadowing_arc')

    const mainline = model.storylineBoard.groups.find(group => group.key === 'mainline')?.items[0]
    expect(mainline?.name).toBe('外门压迫主线')
    expect(mainline?.typeLabel).toBe('主线')
    expect(mainline?.riskTags).toContain('逾期未推')
    expect(mainline?.retentionImpacts).toContain('第7章 61分')
    expect(mainline?.actionChapterNo).toBe(6)

    const foreshadowing = model.storylineBoard.groups.find(group => group.key === 'foreshadowing_arc')?.items[0]
    expect(foreshadowing?.riskTags).toContain('回收债务')
    expect(foreshadowing?.forbiddenReveal).toContain('第18章前')
  })

  test('summarizes longform rhythm risks from core drift, payoff debt and storyline debt', () => {
    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters,
      activeChapter: chapters[6],
      settingEntities: storylineSettings,
      reviews: [first30Review(), coreDriftReview(), readerPayoffReview()],
    })

    expect(model.longformRhythm.status).toBe('needs_attention')
    expect(model.longformRhythm.score).toBeLessThan(80)
    expect(model.longformRhythm.currentBandLabel).toContain('10万字')
    expect(model.longformRhythm.signals.map(item => item.key)).toEqual(['core', 'volume', 'payoff', 'fatigue'])
    expect(model.longformRhythm.signals.find(item => item.key === 'core')?.detail).toContain('核心偏移')
    expect(model.longformRhythm.signals.find(item => item.key === 'payoff')?.detail).toContain('回报欠账 2')
    expect(model.longformRhythm.signals.find(item => item.key === 'fatigue')?.detail).toContain('剧情线债务')
    expect(model.longformRhythm.nextActions).toContain('先处理核心偏移、回报欠账和剧情线债务，再连续生成下一批章节。')
  })

  test('marks first30 retention report stale when early chapters changed later', () => {
    const changedChapters = chapters.map(chapter => chapter.chapter_no === 7
      ? { ...chapter, updated_at: '2026-06-03T11:00:00.000Z' }
      : { ...chapter, updated_at: '2026-06-03T09:30:00.000Z' })

    const model = buildPlanningWorkspaceModel({
      selectedProject: project,
      outlines,
      chapters: changedChapters,
      activeChapter: changedChapters[6],
      reviews: [first30Review({ created_at: '2026-06-03T10:00:00.000Z' })],
    })

    expect(model.first30Retention.status).toBe('stale')
    expect(model.first30Retention.stale).toBe(true)
    expect(model.first30Retention.actionKey).toBe('run_first30_retention')
    expect(model.first30Retention.summary).toContain('需重新诊断')
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
