import { describe, expect, test } from 'bun:test'
import { buildAutoCreationDirectorModel } from './autoCreationDirectorModel'

const basePlanning = {
  topStatus: {
    projectTitle: '万古长夜',
    currentVolume: '第一卷 宗门试炼',
    currentStage: '压迫升级',
    currentChapterLabel: '第8章',
    writtenWords: 21000,
    targetWords: 3000000,
    future10Coverage: { ready: true, planned: 10, required: 10, missingChapters: [], label: '10/10' },
    future100Coverage: { ready: false, planned: 28, required: 100, missingChapters: [], label: '28/100' },
    longformHealth: { status: 'healthy', label: '规划健康' },
  },
  mainline: {
    readerPromise: '寒门少年以阵法反压宗门秩序',
    currentVolumeGoal: '进入内门视野',
    currentStageConflict: '执事逼主角交出阵盘',
    payoffModel: '升级+打脸',
    previousTurn: '',
    nextTurn: '试炼前夜',
    currentChapterServesVolume: true,
    risks: [],
  },
  futureRoute: [],
  first30Retention: {
    status: 'ready',
    score: 84,
    summary: '前30章留存达标。',
    promiseReady: true,
    stale: false,
    actionKey: 'run_first30_retention',
    segments: [],
    chapterCards: [],
    risks: [],
    nextActions: [],
  },
  storylineBoard: {
    status: 'ready',
    summary: '剧情线调度正常。',
    total: 6,
    overdueCount: 0,
    debtCount: 0,
    retentionRiskCount: 0,
    groups: [],
  },
  volumeTree: [],
  healthIssues: [],
} as any

const baseWriting = {
  topStatus: {
    projectTitle: '万古长夜',
    currentVolume: '第一卷 宗门试炼',
    writtenWords: 21000,
    currentRoleLabel: '分集策划',
    nextActionLabel: '补章节场景计划',
    primaryActionKey: 'build_scene_plan',
  },
  nextChapter: {
    id: 8,
    chapterNo: 8,
    title: '试炼前夜',
    wordCount: 0,
    hasProse: false,
    chapterGoal: '主角拿到试炼资格',
    conflict: '执事设局阻拦',
    endingHook: '阵盘亮起第二道裂纹',
    mustAdvance: [],
    forbiddenRepeats: [],
    rawPayload: {},
  },
  previousChapter: { chapterNo: 7, title: '执事加码', wordCount: 3100, hasProse: true },
  chapterPlanningDesk: {
    readiness: 'needs_scene_plan',
    statusLabel: '需补场景计划',
    contextPackageStatus: 'ready',
    scenePlanStatus: 'missing',
    reasons: ['本章还没有可用场景卡。'],
    recommendedPlannerAction: { key: 'build_scene_plan', label: '补章节场景计划' },
    shouldAutoExpandPlanner: true,
    episodePlan: {},
    sceneCards: [],
  },
  chapterAcceptanceDesk: {
    visible: false,
    acceptanceStatus: 'hidden',
    statusLabel: '等待正文',
    acceptanceReasons: [],
    qualityScore: null,
    storyStateSynced: false,
    recommendedAcceptanceAction: { key: 'write_draft', label: '生成本章初稿' },
  },
  primaryActionKey: 'build_scene_plan',
  recommendedRole: 'episode_planner',
  readiness: { checks: [], blockers: [], warnings: [] },
  blockers: [],
  readinessChecks: [],
  modelTeam: { recommendedRole: 'episode_planner', roles: [] },
  draftPipeline: { state: 'no_draft', label: '等待生成初稿' },
  canonUpdatePreview: [],
} as any

describe('buildAutoCreationDirectorModel', () => {
  test('prioritizes running background work and routes the user to the task center', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [{ id: 91, run_type: 'chapter_generation_pipeline', type_label: '章节流水线', status: 'running', progress: 42 }],
      selectedModelId: 12,
    })

    expect(model.status).toBe('running')
    expect(model.mainAction.area).toBe('ops')
    expect(model.mainAction.key).toBe('open_task_center')
    expect(model.mainAction.label).toBe('查看任务中心')
    expect(model.queue.activeCount).toBe(1)
    expect(model.pipeline.find(step => step.key === 'async_tasks')?.status).toBe('active')
  })

  test('recommends strategic repair before drafting when longform planning is not ready', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          longformHealth: { status: 'needs_planning', label: '需要补规划' },
          future10Coverage: { ready: false, planned: 5, required: 10, missingChapters: [9, 10, 11, 12, 13], label: '5/10' },
        },
        healthIssues: [
          { key: 'future10_incomplete', severity: 'critical', title: '未来十章规划不足', detail: '当前覆盖 5/10。', actionKey: 'update_rolling_plan' },
        ],
      },
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.status).toBe('blocked')
    expect(model.mainAction.area).toBe('planning')
    expect(model.mainAction.key).toBe('update_rolling_plan')
    expect(model.mainAction.modelCall).toBe(true)
    expect(model.blockers).toContain('未来十章规划不足')
    expect(model.pipeline.find(step => step.key === 'longform_planning')?.status).toBe('blocked')
  })

  test('surfaces retention and storyline governance before chapter generation', () => {
    const retentionModel = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        first30Retention: {
          ...basePlanning.first30Retention,
          status: 'stale',
          score: 62,
          summary: '前30章内容已变化，需重新诊断。',
          actionKey: 'run_first30_retention',
        },
      },
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(retentionModel.status).toBe('needs_governance')
    expect(retentionModel.mainAction.area).toBe('planning')
    expect(retentionModel.mainAction.key).toBe('run_first30_retention')
    expect(retentionModel.mainAction.label).toBe('运行前30章诊断')

    const storylineModel = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        storylineBoard: {
          ...basePlanning.storylineBoard,
          status: 'needs_attention',
          overdueCount: 2,
          summary: '2 条剧情线逾期未推。',
        },
      },
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(storylineModel.status).toBe('needs_governance')
    expect(storylineModel.mainAction.area).toBe('planning')
    expect(storylineModel.mainAction.key).toBe('open_story_assets')
    expect(storylineModel.confirmations).toContain('剧情线需要调度确认')
  })

  test('builds a longform creation contract for core, story, innovation and reader pull', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.creationContract.map(item => item.key)).toEqual(['core', 'story', 'innovation', 'reader_pull'])
    expect(model.creationContract.find(item => item.key === 'core')?.label).toBe('核心不偏')
    expect(model.creationContract.find(item => item.key === 'story')?.label).toBe('故事强度')
    expect(model.creationContract.find(item => item.key === 'innovation')?.label).toBe('创新差异')
    expect(model.creationContract.find(item => item.key === 'reader_pull')?.label).toBe('读者吸引')
    expect(model.creationContract.every(item => item.status === 'ok')).toBe(true)
    expect(model.pipeline.find(step => step.key === 'creation_contract')?.status).toBe('done')
  })

  test('marks the creation contract risky when promise, conflict, or retention are weak', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        mainline: {
          ...basePlanning.mainline,
          readerPromise: '',
          currentStageConflict: '',
          payoffModel: '',
          currentChapterServesVolume: false,
          risks: ['当前章没有服务卷目标'],
        },
        first30Retention: {
          ...basePlanning.first30Retention,
          status: 'needs_repair',
          score: 58,
          promiseReady: false,
          summary: '前30章吸引力不足。',
          actionKey: 'create_first30_repair',
        },
        healthIssues: [
          { key: 'missing_reader_promise', severity: 'critical', title: '缺读者承诺', detail: '项目缺少长篇核心承诺。', actionKey: 'open_story_assets' },
        ],
      },
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.creationContract.find(item => item.key === 'core')?.status).toBe('block')
    expect(model.creationContract.find(item => item.key === 'story')?.status).toBe('warn')
    expect(model.creationContract.find(item => item.key === 'innovation')?.status).toBe('warn')
    expect(model.creationContract.find(item => item.key === 'reader_pull')?.status).toBe('block')
    expect(model.pipeline.find(step => step.key === 'creation_contract')?.status).toBe('blocked')
  })

  test('uses chapter writing desk action when project governance is ready', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认计划，进入初稿' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认计划，进入初稿',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.status).toBe('ready')
    expect(model.targetChapter?.chapterNo).toBe(8)
    expect(model.mainAction.area).toBe('writing')
    expect(model.mainAction.key).toBe('confirm_plan_and_write_draft')
    expect(model.mainAction.modelCall).toBe(true)
    expect(model.pipeline.find(step => step.key === 'chapter_execution')?.status).toBe('active')
  })

  test('keeps acceptance workflow as the only next step after prose exists', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: {
        ...baseWriting,
        nextChapter: { ...baseWriting.nextChapter, wordCount: 3200, hasProse: true },
        chapterAcceptanceDesk: {
          ...baseWriting.chapterAcceptanceDesk,
          visible: true,
          acceptanceStatus: 'needs_quality_check',
          statusLabel: '需复检',
          acceptanceReasons: ['本章已有正文，但还没有当前章节的质量复检记录。'],
          recommendedAcceptanceAction: { key: 'refresh_current_quality', label: '复检当前版本' },
        },
        topStatus: { ...baseWriting.topStatus, nextActionLabel: '复检当前版本', primaryActionKey: 'refresh_current_quality' },
        primaryActionKey: 'refresh_current_quality',
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.status).toBe('needs_acceptance')
    expect(model.mainAction.area).toBe('writing')
    expect(model.mainAction.key).toBe('refresh_current_quality')
    expect(model.mainAction.label).toBe('复检当前版本')
    expect(model.pipeline.find(step => step.key === 'quality_gate')?.status).toBe('active')
  })
})
