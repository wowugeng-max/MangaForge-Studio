import { describe, expect, test } from 'bun:test'
import {
  buildWritingCockpitModel,
  resolveEditorRevisionChapterId,
  selectTargetChapterForWriting,
} from './writingCockpitModel'

import {
  project,
  outlines,
  chapters,
  contextPackage,
  sceneCardChapter,
  acceptedProject,
  proseQualityReview,
  editorReportReview,
  editorRevisionReview,
  storylineSyncReview,
  qualityAuditSyncReview,
  qualityAuditRepairReceiptSyncReview,
  chapterHandoffSyncReview,
  chapterHandoffDeltaSyncReview,
  intentConfirmationSyncReview,
  benchmarkRecallSyncReview,
  storyUnitSyncReview,
  assetIntakeReview,
  ipSceneIntakeReview,
  readabilityReview,
  chapterAttractionReview,
  storyDriveSyncReview,
  characterArcSyncReview,
  coreDriftReview,
  readerPayoffSyncReview,
  readerRetentionSyncReview,
  chapterBenchmarkSyncReview,
  styleSampleSyncReview,
  readerExpectationSyncReview,
  runwaySyncReview,
  innovationSyncReview,
  signatureSceneSyncReview,
  volumeBeatSyncReview,
  first30RetentionReview,
  deliveryRiskConvergenceReview,
  governanceRecheckSyncReview,
} from './writingCockpitModel.test-fixtures'

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
    expect(model.chapterAcceptanceDesk.visible).toBe(true)
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
    expect(model.topStatus.primaryActionKey).toBe('refresh_current_quality')
  })

  test('summarizes oh-story longform workflow into four production stages', () => {
    const reviewedChapter = {
      ...chapters[0],
      scene_list: [
        {
          scene_no: 1,
          title: '断臂入府',
          purpose: '把失势皇子的回府压成公开站队',
          conflict: '新贵压席，旧臣观望',
          turn: '谢怀安拿出军中信物',
          ending_hook: '王府内钟声先乱',
        },
      ],
    }
    const model = buildWritingCockpitModel({
      selectedProject: {
        ...acceptedProject,
        reference_config: {
          ...acceptedProject.reference_config,
          story_state: { last_updated_chapter: 0 },
        },
      },
      outlines,
      chapters: [reviewedChapter, chapters[1]],
      activeChapter: reviewedChapter,
      contextPackage,
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        chapterAttractionReview(),
        readerRetentionSyncReview(),
        qualityAuditRepairReceiptSyncReview(),
      ],
    })

    expect(model.longformWorkflow.stages.map(stage => stage.key)).toEqual([
      'creation_setup',
      'pre_draft',
      'post_draft_review',
      'quality_continuity',
    ])
    expect(model.longformWorkflow.stages.find(stage => stage.key === 'creation_setup')?.status).toBe('ready')
    expect(model.longformWorkflow.stages.find(stage => stage.key === 'pre_draft')?.status).toBe('ready')
    expect(model.longformWorkflow.stages.find(stage => stage.key === 'post_draft_review')?.status).toBe('needs_action')
    expect(model.longformWorkflow.stages.find(stage => stage.key === 'post_draft_review')?.evidence.join('｜')).toContain('吸引力缺口 3')
    expect(model.longformWorkflow.stages.find(stage => stage.key === 'quality_continuity')?.status).toBe('needs_action')
    expect(model.longformWorkflow.stages.find(stage => stage.key === 'quality_continuity')?.evidence.join('｜')).toContain('故事状态待同步')
    expect(model.longformWorkflow.currentStage.key).toBe('post_draft_review')
    expect(model.longformWorkflow.primaryAction.key).toBe('open_task_center')
    expect(model.longformWorkflow.riskCount).toBeGreaterThan(0)
  })

  test('ready delivered chapter exposes a handoff into the next chapter', () => {
    const model = buildWritingCockpitModel({
      selectedProject: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        readerExpectationSyncReview(),
        storylineSyncReview({
          payload: {
            storyline_sync: {
              status: 'ok',
              completed: [{ name: '夺回镜州主线' }],
              missed: [],
              unplanned: [],
              forbidden_touched: [],
            },
          },
        }),
      ],
    })

    expect(model.chapterHandoffDesk.visible).toBe(true)
    expect(model.chapterHandoffDesk.status).toBe('ready')
    expect(model.chapterHandoffDesk.label).toBe('可接下一章')
    expect(model.chapterHandoffDesk.fromChapterNo).toBe(1)
    expect(model.chapterHandoffDesk.toChapterNo).toBe(2)
    expect(model.chapterHandoffDesk.previousEnding).toBe('城外烽烟未熄，王府内钟声先乱')
    expect(model.chapterHandoffDesk.expectationCarryOver).toContain('纸条是谁塞进来的')
    expect(model.chapterHandoffDesk.nextOpeningObligations).toContain('幕后敲门者是谁')
    expect(model.chapterHandoffDesk.storyStateSynced).toBe(true)
    expect(model.chapterHandoffDesk.actionKey).toBe('accept_chapter_and_continue')
    expect(model.chapterHandoffDesk.actionLabel).toBe('进入下一章开写')
  })

  test('chapter handoff carries unresolved delivery risks into the next chapter warning', () => {
    const model = buildWritingCockpitModel({
      selectedProject: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [
        proseQualityReview(),
        chapterAttractionReview(),
        innovationSyncReview(),
      ],
    })

    expect(model.chapterHandoffDesk.visible).toBe(true)
    expect(model.chapterHandoffDesk.status).toBe('ready')
    expect(model.chapterHandoffDesk.deliveryRiskCarryOver?.label).toBe('待修复 5')
    expect(model.chapterHandoffDesk.deliveryRiskCarryOver?.priorityLabel).toBe('优先修章末翻页')
    expect(model.chapterHandoffDesk.deliveryRiskCarryOver?.items).toContain('修吸引力：吸引力缺口 3')
    expect(model.chapterHandoffDesk.deliveryRiskCarryOver?.items).toContain('补创新：创新缺口 2')
  })

  test('handoff asks to finish delivery before moving to the next chapter', () => {
    const model = buildWritingCockpitModel({
      selectedProject: acceptedProject,
      outlines,
      chapters,
      activeChapter: chapters[0],
      materialScore: { score: 82, can_generate: true },
      reviews: [],
    })

    expect(model.chapterHandoffDesk.visible).toBe(true)
    expect(model.chapterHandoffDesk.status).toBe('needs_delivery')
    expect(model.chapterHandoffDesk.label).toBe('先完成交稿')
    expect(model.chapterHandoffDesk.fromChapterNo).toBe(1)
    expect(model.chapterHandoffDesk.toChapterNo).toBe(2)
    expect(model.chapterHandoffDesk.previousEnding).toBe('城外烽烟未熄，王府内钟声先乱')
    expect(model.chapterHandoffDesk.expectationCarryOver).toEqual([])
    expect(model.chapterHandoffDesk.actionKey).toBe('refresh_current_quality')
    expect(model.chapterHandoffDesk.actionLabel).toBe('先完成交稿')
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

  test('writing queue shows rolling-plan chapter placeholders from the current target onward', () => {
    const rollingChapters = [
      ...chapters,
      {
        id: 103,
        chapter_no: 3,
        title: '夜审旧账',
        chapter_text: '',
        raw_payload: {
          source: 'rolling_plan',
          rollingPlan: {
            chapter_no: 3,
            chapter_goal: '逼王府账房交出军饷流向',
            conflict: '账房以太妃手令拖延，谢怀安以军法逼供',
            ending_hook: '账册夹层露出京城密印',
          },
        },
      },
      {
        id: 104,
        chapter_no: 4,
        title: '空钟回响',
        chapter_text: '',
        raw_payload: {
          source: 'rolling_plan',
          rollingPlan: {
            chapter_no: 4,
            chapter_goal: '让警钟余波扩散到边军',
          },
        },
      },
      {
        id: 105,
        chapter_no: 5,
        title: '暗门听雨',
        chapter_text: '',
        raw_payload: {
          source: 'rolling_plan',
          rollingPlan: {
            chapter_no: 5,
            ending_hook: '雨声里传来第二口钟',
          },
        },
      },
    ]

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: rollingChapters,
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.writingQueue.items.map(item => item.chapterNo)).toEqual([2, 3, 4, 5])
    expect(model.writingQueue.readyCount).toBe(2)
    expect(model.writingQueue.blockedCount).toBe(2)
    expect(model.writingQueue.items[1]).toMatchObject({
      chapterNo: 3,
      title: '夜审旧账',
      sourceLabel: '滚动规划',
      status: 'ready_to_draft',
      statusLabel: '可开写',
      actionLabel: '开写',
      actionHint: '进入本章任务书、场景卡和正文生成。',
      goal: '逼王府账房交出军饷流向',
      endingHook: '账册夹层露出京城密印',
    })
    expect(model.writingQueue.items[2]).toMatchObject({
      id: 104,
      chapterNo: 4,
      status: 'needs_plan',
      statusLabel: '缺计划',
      actionLabel: '补计划',
      actionHint: '先补核心冲突、章末钩子。',
      sourceLabel: '滚动规划',
      missingPlanFields: ['conflict', 'ending_hook'],
      missingPlanLabels: ['核心冲突', '章末钩子'],
      repairIntent: {
        source: 'writing_queue_plan_repair',
        chapter_id: 104,
        chapter_no: 4,
        missing_fields: ['conflict', 'ending_hook'],
        missing_labels: ['核心冲突', '章末钩子'],
      },
    })
    expect(model.writingQueue.planRepair).toMatchObject({
      visible: true,
      label: '补齐队列计划',
      chapterCount: 2,
      missingCount: 4,
      chapterNos: [4, 5],
      intent: {
        source: 'writing_queue_batch_plan_repair',
        chapter_nos: [4, 5],
      },
    })
    expect(model.writingQueue.items[0]).toMatchObject({
      status: 'ready_to_draft',
      actionLabel: '开写',
    })
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

  test('stale story state on active prose chapter still requires quality check first', () => {
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
    expect(model.chapterAcceptanceDesk.acceptanceStatus).toBe('needs_quality_check')
    expect(model.primaryActionKey).toBe('refresh_current_quality')
    expect(model.recommendedRole).toBe('revision_editor')
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

  test('director needs_repair owns the single planning desk status and action', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      contextPackage: {
        ...contextPackage,
        preflight: {
          ready: false,
          blockers: ['旧预检缺少章节目标'],
        },
        oh_story_director: {
          stage: 'pre_draft',
          readiness: 'needs_repair',
          primary_action: {
            key: 'repair_pre_draft_materials',
            label: '补齐并继续',
            mode: 'automatic',
          },
          blocking_summary: '本章蓝图缺核心字段',
          required_repairs: [
            { detail: '补齐 chapter_blueprint.core_conflict' },
            { label: '确认章末钩子' },
          ],
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.statusLabel).toBe('需要修复')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('repair_materials')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.label).toBe('补齐并继续')
    expect(model.chapterPlanningDesk.reasons.join('｜')).toContain('本章蓝图缺核心字段')
    expect(model.chapterPlanningDesk.reasons.join('｜')).toContain('补齐 chapter_blueprint.core_conflict')
    expect(model.chapterPlanningDesk.reasons.join('｜')).not.toContain('旧预检缺少章节目标')
  })

  test('director needs_repair overrides legacy diagnostics blockers', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      contextPackage: {
        ...contextPackage,
        oh_story_director: {
          stage: 'pre_draft',
          readiness: 'needs_repair',
          primary_action: {
            key: 'repair_pre_draft_materials',
            label: '总导演修复',
            mode: 'automatic',
          },
          blocking_summary: '总导演要求补齐写前材料',
          required_repairs: [
            { detail: '补齐本章蓝图的核心冲突' },
          ],
        },
      },
      diagnostics: {
        preflight: {
          ready: false,
          blockers: ['旧诊断缺少上一章承接'],
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.statusLabel).toBe('需要修复')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('repair_materials')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.label).toBe('总导演修复')
    expect(model.chapterPlanningDesk.reasons.join('｜')).toContain('总导演要求补齐写前材料')
    expect(model.chapterPlanningDesk.reasons.join('｜')).not.toContain('诊断阻塞')
    expect(model.chapterPlanningDesk.reasons.join('｜')).not.toContain('旧诊断缺少上一章承接')
  })

  test.each([
    {
      wrapperKey: 'context_package',
      readiness: 'needs_repair',
      actionKey: 'repair_pre_draft_materials',
      expectedReadiness: 'needs_context',
      expectedStatus: '需要修复',
      expectedAction: 'repair_materials',
    },
    {
      wrapperKey: 'contextPackage',
      readiness: 'blocked',
      actionKey: 'manual_confirmation_required',
      expectedReadiness: 'blocked',
      expectedStatus: '需要确认',
      expectedAction: 'open_generation_diagnostics',
    },
  ])('planning desk honors $readiness director inside $wrapperKey response wrappers', ({
    wrapperKey,
    readiness,
    actionKey,
    expectedReadiness,
    expectedStatus,
    expectedAction,
  }) => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ok: true,
        [wrapperKey]: {
          ...contextPackage,
          oh_story_director: {
            readiness,
            primary_action: { key: actionKey, label: '处理写前缺口' },
            blocking_summary: '包装响应中的总导演要求先处理缺口',
          },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe(expectedReadiness)
    expect(model.chapterPlanningDesk.statusLabel).toBe(expectedStatus)
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe(expectedAction)
    expect(model.chapterPlanningDesk.reasons).toContain('包装响应中的总导演要求先处理缺口')
  })

  test('planning desk skips empty director aliases before a wrapped camel director', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ok: true,
        oh_story_director: {},
        context_package: {
          ...contextPackage,
          oh_story_director: {},
          ohStoryDirector: {
            readiness: 'blocked',
            primaryAction: { key: 'manual_confirmation_required', label: '确认角色选择' },
            blockingSummary: '包装响应中的角色选择仍待确认',
          },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('blocked')
    expect(model.chapterPlanningDesk.statusLabel).toBe('需要确认')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
    expect(model.chapterPlanningDesk.reasons).toContain('包装响应中的角色选择仍待确认')
  })

  test('director ready owns the single planning desk action without repair prompts', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ...contextPackage,
        preflight: { ready: true, blockers: [] },
        oh_story_director: {
          stage: 'pre_draft',
          readiness: 'ready',
          primary_action: {
            key: 'generate_prose',
            label: '生成正文',
            mode: 'automatic',
          },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.statusLabel).toBe('可继续')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('confirm_plan_and_write_draft')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.label).toBe('生成正文')
    expect(model.chapterPlanningDesk.shouldAutoExpandPlanner).toBe(false)
    expect(model.chapterPlanningDesk.reasons.join('｜')).not.toContain('修复')
  })

  test('director ready does not override diagnostics blockers', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ...contextPackage,
        oh_story_director: {
          readiness: 'ready',
          primary_action: { key: 'generate_prose', label: '生成正文' },
        },
      },
      diagnostics: {
        preflight: { ready: false, blockers: ['缺少上一章承接'] },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('blocked')
    expect(model.chapterPlanningDesk.statusLabel).toBe('诊断阻塞')
    expect(model.chapterPlanningDesk.reasons).toContain('生成诊断阻塞：缺少上一章承接')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
  })

  test('director ready does not override context preflight blockers', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ...contextPackage,
        preflight: { ready: false, blockers: ['缺少章节目标'] },
        oh_story_director: {
          readiness: 'ready',
          primary_action: { key: 'generate_prose', label: '生成正文' },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('needs_context')
    expect(model.chapterPlanningDesk.statusLabel).toBe('上下文不足')
    expect(model.chapterPlanningDesk.reasons).toContain('上下文包预检未通过：缺少章节目标')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
  })

  test.each(['strict_ready', 'strictReady'])('director ready does not override %s=false', strictReadyKey => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ...contextPackage,
        preflight: {
          ready: true,
          [strictReadyKey]: false,
          blockers: [],
        },
        oh_story_director: {
          readiness: 'ready',
          primary_action: { key: 'generate_prose', label: '生成正文' },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('needs_context')
    expect(model.chapterPlanningDesk.statusLabel).toBe('上下文不足')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
  })

  test('director ready does not override a present preflight without ready=true', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ...contextPackage,
        preflight: {
          strict_ready: true,
          blockers: [],
        },
        oh_story_director: {
          readiness: 'ready',
          primary_action: { key: 'generate_prose', label: '生成正文' },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.contextPackageStatus).toBe('insufficient')
    expect(model.chapterPlanningDesk.readiness).toBe('needs_context')
    expect(model.chapterPlanningDesk.statusLabel).toBe('上下文不足')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
  })

  test('planning desk keeps legacy target-only context ready when preflight is absent', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        chapter_target: contextPackage.chapter_target,
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.contextPackageStatus).toBe('ready')
    expect(model.chapterPlanningDesk.readiness).toBe('ready')
  })

  test('director ready does not override write preparation source gaps', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ...contextPackage,
        chapter_target: {
          ...contextPackage.chapter_target,
          write_preparation_brief: {
            readiness_status: 'needs_context',
            source_gaps: ['上一章正文或上一章承接｜状态=missing'],
          },
        },
        oh_story_director: {
          readiness: 'ready',
          primary_action: { key: 'generate_prose', label: '生成正文' },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('needs_context')
    expect(model.chapterPlanningDesk.statusLabel).toBe('写前准备待确认')
    expect(model.chapterPlanningDesk.reasons.join('｜')).toContain('来源缺口')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
  })

  test('planning desk preserves camel hard gaps behind empty snake wrapper aliases', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ok: true,
        context_package: {
          ...contextPackage,
          chapter_target: {
            ...contextPackage.chapter_target,
            write_preparation_brief: {
              source_gaps: [],
              asset_risks: [],
              delivery_risk_actions: [],
            },
            writePreparationBrief: {
              sourceGaps: ['上一章承接｜状态=missing｜缺少上一章正文承接'],
              assetRisks: ['旧钥匙触发代价待落到现场'],
              deliveryRiskActions: ['开篇动作：前300字接住围捕压力'],
            },
            state_tracking_contract: {
              source_readiness: [],
            },
          },
          pre_draft_brief: {
            write_preparation_brief: {},
            state_tracking_contract: {
              source_readiness: [],
            },
          },
          preDraftBrief: {
            stateTrackingContract: {
              sourceReadiness: [
                {
                  label: '世界约束',
                  status: 'missing',
                  evidence: '红雾裂缝规则尚未就绪',
                },
              ],
            },
          },
          oh_story_director: {
            readiness: 'ready',
            primary_action: { key: 'generate_prose', label: '生成正文' },
          },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('needs_context')
    expect(model.chapterPlanningDesk.statusLabel).toBe('写前准备待确认')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
    expect(model.chapterPlanningDesk.writePreparationBrief?.sourceGaps).toContain('上一章承接｜状态=missing｜缺少上一章正文承接')
    expect(model.chapterPlanningDesk.writePreparationBrief?.sourceGaps.join('｜')).toContain('世界约束｜状态=missing')
    expect(model.chapterPlanningDesk.writePreparationBrief?.assetRisks).toContain('旧钥匙触发代价待落到现场')
    expect(model.chapterPlanningDesk.writePreparationBrief?.deliveryRiskActions).toContain('开篇动作：前300字接住围捕压力')
  })

  test('director ready does not override unmapped quality continuity actions', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ...contextPackage,
        chapter_target: {
          ...contextPackage.chapter_target,
          delivery_risk_carry_over: {
            opening_actions: ['前300字先接住上一章追兵压迫'],
            middle_actions: ['中段让新证据改变盟友立场'],
            ending_actions: ['章末留下幕后主使的新问题'],
          },
        },
        oh_story_director: {
          readiness: 'ready',
          primary_action: { key: 'generate_prose', label: '生成正文' },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.qualityContinuitySceneMap).toEqual([])
    expect(model.chapterPlanningDesk.readiness).toBe('needs_scene_plan')
    expect(model.chapterPlanningDesk.statusLabel).toBe('需补质量续航落点')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('build_scene_plan')
  })

  test('director ready does not override a missing scene plan', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      contextPackage: {
        ...contextPackage,
        oh_story_director: {
          readiness: 'ready',
          primary_action: { key: 'generate_prose', label: '生成正文' },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.scenePlanStatus).toBe('missing')
    expect(model.chapterPlanningDesk.readiness).toBe('needs_scene_plan')
    expect(model.chapterPlanningDesk.statusLabel).toBe('需补场景计划')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('build_scene_plan')
  })

  test('camelCase director action and repairs are supported', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      contextPackage: {
        ...contextPackage,
        ohStoryDirector: {
          stage: 'pre_draft',
          readiness: 'blocked',
          primaryAction: {
            key: 'manual_confirmation_required',
            label: '查看缺口',
            mode: 'manual',
          },
          blockingSummary: '需要人工确认角色选择',
          requiredRepairs: [
            { detail: '确认谢怀安是否公开旧臣身份' },
          ],
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.statusLabel).toBe('需要确认')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.label).toBe('查看缺口')
    expect(model.chapterPlanningDesk.reasons.join('｜')).toContain('需要人工确认角色选择')
    expect(model.chapterPlanningDesk.reasons.join('｜')).toContain('确认谢怀安是否公开旧臣身份')
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

  test('planning desk keeps relationship graph risks visible without treating them as missing context', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ...contextPackage,
        chapter_target: {
          ...contextPackage.chapter_target,
          asset_linkage_contract: {
            relationship_graph_risks: [
              '旧钥匙还没有和主角、禁门规则或章末钩子建立关系',
              '禁门规则缺少拥有者或触发方',
            ],
          },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('ready')
    expect(model.chapterPlanningDesk.statusLabel).toBe('本章可写')
    expect(model.chapterPlanningDesk.writePreparationBrief?.assetRisks.join('｜')).toContain('旧钥匙')
  })

  test('planning desk keeps pure execution risks advisory when sources and scene cards are ready', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], sceneCardChapter],
      activeChapter: sceneCardChapter,
      contextPackage: {
        ...contextPackage,
        chapter_target: {
          ...contextPackage.chapter_target,
          asset_linkage_contract: {
            relationship_graph_risks: ['旧钥匙需要在现场建立触发条件和代价'],
          },
          write_preparation_brief: {
            version: 'oh_story_write_preparation_v1',
            readiness_status: 'ready',
            source_gaps: [],
            asset_risks: ['旧钥匙需要在现场建立触发条件和代价'],
            delivery_risk_actions: ['开篇动作：前300字接住上一章围捕压力'],
            rolling_rhythm_preflight: {
              principle: '拉期待速度 > 断期待速度',
              next_actions: ['先铺下一目标，再兑现当前回报'],
            },
            must_confirm: ['关系图风险：旧钥匙需要在现场建立触发条件和代价'],
            execution_order: ['把风险动作写进正文并在写后回执核验。'],
          },
        },
      },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('ready')
    expect(model.chapterPlanningDesk.statusLabel).toBe('本章可写')
    expect(model.chapterPlanningDesk.writePreparationBrief?.sourceGaps).toEqual([])
    expect(model.chapterPlanningDesk.writePreparationBrief?.assetRisks).toContain('旧钥匙需要在现场建立触发条件和代价')
    expect(model.chapterPlanningDesk.writePreparationBrief?.deliveryRiskActions).toContain('开篇动作：前300字接住上一章围捕压力')
  })

  test('planning desk surfaces write preparation brief before drafting', () => {
    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters,
      activeChapter: chapters[1],
      contextPackage: {
        ...contextPackage,
        chapter_target: {
          ...contextPackage.chapter_target,
          write_preparation_brief: {
            version: 'oh_story_write_preparation_v1',
            readiness_status: 'needs_context',
            source_gaps: ['上一章正文或上一章承接｜状态=missing｜缺少上一章承接'],
            asset_risks: ['旧钥匙(isolated_key_asset)：旧钥匙还没有和禁门规则建立现场关系'],
            delivery_risk_actions: ['前 300 字先接住上一章门外黑影压迫'],
            blueprint_focus: ['开篇钩子：警钟第三响压入筵席'],
            reader_payoff_focus: ['读者回报：失势皇子第一次当众夺回主动权'],
            must_confirm: ['补上旧钥匙的现场功能和代价。'],
            execution_order: ['先确认来源就绪，再进入场景卡。'],
          },
        },
      },
      materialScore: { score: 82, can_generate: true },
    })

    expect(model.chapterPlanningDesk.readiness).toBe('needs_context')
    expect(model.chapterPlanningDesk.statusLabel).toBe('写前准备待确认')
    expect(model.chapterPlanningDesk.reasons.join('｜')).toContain('来源缺口')
    expect(model.chapterPlanningDesk.reasons.join('｜')).toContain('旧钥匙')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('open_generation_diagnostics')
    expect(model.chapterPlanningDesk.writePreparationBrief?.sourceGaps.join('｜')).toContain('上一章正文')
    expect(model.chapterPlanningDesk.writePreparationBrief?.assetRisks.join('｜')).toContain('旧钥匙')
    expect(model.chapterPlanningDesk.writePreparationBrief?.mustConfirm.join('｜')).toContain('补上旧钥匙')
  })

  test('planning desk reads backend-style context target aliases', () => {
    const backendContextPackage = {
      chapter_target: {
        goal: '把警钟危机转成谢怀安的第一次主动试探',
        conflict: '王府管事要压警讯，谢怀安要逼众人表态',
        ending_hook: '带血腰牌递到谢怀安掌心',
        core_contract_radar: {
          summary: '本章必须服务失势皇子夺回镜州主动权。',
          must_serve: ['失势皇子以武道和权谋守住镜州', '边军危机压入王府权斗'],
          no_drift: ['不能把主线写成纯宅斗'],
          repair_focus: ['补足谢怀安主动选择和代价'],
        },
        reader_drop_risk_brief: {
          status: 'needs_repair',
          drop_points: ['第2章中段解释王府派系过密，试读用户可能弃读。'],
          opening_guardrail: '开篇 300 字先接住警钟压席。',
          middle_guardrail: '中段用当众验腰牌推进，不堆派系解释。',
          ending_guardrail: '章末留下带血腰牌背后的旧臣身份问题。',
        },
        story_pressure_brief: {
          status: 'needs_attention',
          pressure_sources: ['王府管事压席', '边军警钟逼近'],
          conflict_escalation_guardrail: '中段必须让压席变成公开站队。',
          stakes_growth_guardrail: '赌注要落到谢怀安是否失去王府号令权。',
          reversal_pressure_guardrail: '章末用带血腰牌反转局势。',
          required_actions: ['把压力源、赌注升级和反转逼迫写成可见行动。'],
        },
        story_drive_brief: {
          protagonist_choice: '谢怀安当众选择撕开王府管事的遮掩。',
          choice_cost: '暴露自己仍能调动旧部，招来王府内线反扑。',
          state_change: '谢怀安从被动受宴转为公开夺回审判主动权。',
          obstacle: '王府管事压下警讯并逼众人表态。',
          causal_next_step: '带血腰牌把旧臣身份问题推到下一章。',
        },
        serial_rhythm_brief: {
          status: 'ready',
          opening_hook_deadline: '前 300 字必须接住警钟压席。',
          payoff_interval: '每 800-1200 字至少给一次信息增量或局势反转。',
          middle_guardrail: '中段不能堆王府派系解释，要用验腰牌逼站队。',
          ending_hook_guardrail: '最后一幕压到带血腰牌背后的旧臣身份。',
          scene_payoff_budget: [
            {
              scene_no: 1,
              title: '警钟压席',
              word_budget: '900 字',
              required_payoff: '众人第一次看见谢怀安还能控场。',
              turn: '太妃沉默等于放任管事试探。',
            },
          ],
          anti_drag_rules: ['连续两段必须出现行动、信息或关系变化。'],
        },
        page_turn_hook_brief: {
          hook_type: '身份反转',
          core_question: '带血腰牌背后的旧臣到底站哪边。',
          visible_trigger: '守将把带血腰牌递到谢怀安掌心。',
          withheld_answer: '旧臣身份和真实站队不能在本章解释完。',
          next_chapter_pull: '下一章逼谢怀安审问守将并判断旧臣是否可信。',
          final_image: '谢怀安掌心压着带血腰牌，钟声在府门外停住。',
          forbidden_resolution: ['不得在本章解释完整答案。'],
        },
        volume_climax_brief: {
          status: 'needs_attention',
          current_volume_title: '第一卷 镜州风雷',
          chapter_range: '第1-60章',
          current_chapter_role: '完成卷中小高潮：谢怀安第一次公开夺回王府审判主动权。',
          volume_goal: '让谢怀安在镜州立住武夫根基并摸清王府人心。',
          climax_promise: '用带血腰牌和公开站队给读者阶段性回报。',
          required_beats: ['王府管事当众失势', '旧部第一次表态'],
          forbidden_payoff: ['不得提前解决京城幕后黑手', '不得提前消费卷末军权爆点'],
          nearby_beats: [
            { chapter_no: 2, type: '小高潮', label: '王府审判夺权', detail: '谢怀安用警钟和腰牌逼王府站队。' },
          ],
        },
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
    expect(model.chapterPlanningDesk.episodePlan.coreContract.summary).toContain('夺回镜州主动权')
    expect(model.chapterPlanningDesk.episodePlan.coreContract.mustServe).toContain('失势皇子以武道和权谋守住镜州')
    expect(model.chapterPlanningDesk.episodePlan.coreContract.noDrift).toContain('不能把主线写成纯宅斗')
    expect(model.chapterPlanningDesk.episodePlan.coreContract.repairFocus).toContain('补足谢怀安主动选择和代价')
    expect(model.chapterPlanningDesk.episodePlan.readerDropRisk.dropPoints[0]).toContain('试读用户可能弃读')
    expect(model.chapterPlanningDesk.episodePlan.readerDropRisk.openingGuardrail).toContain('开篇 300 字')
    expect(model.chapterPlanningDesk.episodePlan.readerDropRisk.middleGuardrail).toContain('不堆派系解释')
    expect(model.chapterPlanningDesk.episodePlan.readerDropRisk.endingGuardrail).toContain('旧臣身份问题')
    expect(model.chapterPlanningDesk.episodePlan.storyPressure.pressureSources).toContain('王府管事压席')
    expect(model.chapterPlanningDesk.episodePlan.storyPressure.conflictEscalationGuardrail).toContain('公开站队')
    expect(model.chapterPlanningDesk.episodePlan.storyPressure.stakesGrowthGuardrail).toContain('王府号令权')
    expect(model.chapterPlanningDesk.episodePlan.storyPressure.reversalPressureGuardrail).toContain('带血腰牌')
    expect(model.chapterPlanningDesk.episodePlan.storyDrive.protagonistChoice).toContain('当众选择')
    expect(model.chapterPlanningDesk.episodePlan.storyDrive.choiceCost).toContain('旧部')
    expect(model.chapterPlanningDesk.episodePlan.storyDrive.stateChange).toContain('主动权')
    expect(model.chapterPlanningDesk.episodePlan.storyDrive.causalNextStep).toContain('旧臣身份')
    expect(model.chapterPlanningDesk.episodePlan.serialRhythm.openingHookDeadline).toContain('前 300 字')
    expect(model.chapterPlanningDesk.episodePlan.serialRhythm.payoffInterval).toContain('800-1200')
    expect(model.chapterPlanningDesk.episodePlan.serialRhythm.middleGuardrail).toContain('验腰牌')
    expect(model.chapterPlanningDesk.episodePlan.serialRhythm.endingHookGuardrail).toContain('旧臣身份')
    expect(model.chapterPlanningDesk.episodePlan.serialRhythm.scenePayoffBudget[0].requiredPayoff).toContain('控场')
    expect(model.chapterPlanningDesk.episodePlan.serialRhythm.antiDragRules[0]).toContain('连续两段')
    expect(model.chapterPlanningDesk.episodePlan.pageTurnHook.coreQuestion).toContain('旧臣')
    expect(model.chapterPlanningDesk.episodePlan.pageTurnHook.visibleTrigger).toContain('带血腰牌')
    expect(model.chapterPlanningDesk.episodePlan.pageTurnHook.nextChapterPull).toContain('审问守将')
    expect(model.chapterPlanningDesk.episodePlan.pageTurnHook.forbiddenResolution[0]).toContain('不得在本章解释')
    expect(model.chapterPlanningDesk.episodePlan.volumeClimax.currentChapterRole).toContain('公开夺回')
    expect(model.chapterPlanningDesk.episodePlan.volumeClimax.volumeGoal).toContain('镜州')
    expect(model.chapterPlanningDesk.episodePlan.volumeClimax.climaxPromise).toContain('阶段性回报')
    expect(model.chapterPlanningDesk.episodePlan.volumeClimax.forbiddenPayoff[0]).toContain('京城幕后黑手')
    expect(model.chapterPlanningDesk.episodePlan.volumeClimax.nearbyBeats[0].label).toContain('王府审判夺权')
  })

  test('planning desk turns delivery risk carry-over into next chapter writing actions', () => {
    const backendContextPackage = {
      chapter_target: {
        goal: '把上一章缺失的吸引力和创新补进规则边界试探',
        conflict: '李超想硬闯，张智要用规则反制黑影',
        ending_hook: '门外校服男生说出李超车祸前最后一句话',
        delivery_risk_carry_over: {
          label: '待修复 5',
          priority_label: '优先修章末翻页',
          items: ['修吸引力：吸引力缺口 3', '补创新：创新缺口 2'],
          required_actions: ['前 300 字先兑现门外黑影压迫', '中段用规则边界反制黑影', '章末必须留下身份反转问题'],
          evidence: ['上一章章末只总结黑影逼近，没有留下身份反转问题。'],
        },
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

    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.label).toBe('待修复 5')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.priorityLabel).toBe('优先修章末翻页')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.items).toContain('修吸引力：吸引力缺口 3')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.items).toContain('补创新：创新缺口 2')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.requiredActions).toContain('前 300 字先兑现门外黑影压迫')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.openingActions).toContain('前 300 字先兑现门外黑影压迫')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.middleActions).toContain('中段用规则边界反制黑影')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.endingActions).toContain('章末必须留下身份反转问题')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.evidence).toContain('上一章章末只总结黑影逼近，没有留下身份反转问题。')
  })

  test('planning desk preserves structured delivery risk stage actions in write preparation', () => {
    const backendContextPackage = {
      chapter_target: {
        goal: '把上一章交稿风险拆成开篇、中段、章末三段修复',
        conflict: '李超想硬闯，张智要用规则边界反制黑影',
        ending_hook: '门外校服男生说出李超车祸前最后一句话',
        delivery_risk_carry_over: {
          label: '待修复 3',
          priority_label: '优先修分段承接',
          items: ['修开篇承接', '补中段事件推进', '补章末翻页'],
          opening_actions: ['前 300 字先兑现门外黑影压迫'],
          middle_actions: ['中段用规则边界反制黑影'],
          ending_actions: ['章末必须留下身份反转问题'],
          forbidden_repeats: ['不要再用“他知道，这只是开始”总结体收尾。'],
          evidence: ['上一章章末只总结黑影逼近，没有留下身份反转问题。'],
        },
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

    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.openingActions).toContain('前 300 字先兑现门外黑影压迫')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.middleActions).toContain('中段用规则边界反制黑影')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.endingActions).toContain('章末必须留下身份反转问题')
    expect(model.chapterPlanningDesk.episodePlan.deliveryRiskCarryOver.forbiddenRepeats).toContain('不要再用“他知道，这只是开始”总结体收尾。')
    expect(model.chapterPlanningDesk.writePreparationBrief?.deliveryRiskActions.join('｜')).toContain('前 300 字先兑现门外黑影压迫')
    expect(model.chapterPlanningDesk.writePreparationBrief?.deliveryRiskActions.join('｜')).toContain('中段用规则边界反制黑影')
    expect(model.chapterPlanningDesk.writePreparationBrief?.deliveryRiskActions.join('｜')).toContain('章末必须留下身份反转问题')
    expect(model.chapterPlanningDesk.writePreparationBrief?.deliveryRiskActions.join('｜')).toContain('禁用重复：不要再用“他知道，这只是开始”总结体收尾。')
  })

  test('planning desk surfaces scene-level quality continuity mapping before drafting', () => {
    const qualityMappedChapter = {
      ...chapters[1],
      scene_list: [
        {
          scene_no: 1,
          title: '旧账压门',
          purpose: '主角带着账册入场',
          required_beats: ['前300字先让旧账压迫重新逼近主角'],
          serial_risk_repairs: ['delivery_risk_carry_over', '质量续航'],
          recent_fatigue_action: '前300字先让旧账压迫重新逼近主角',
        },
        {
          scene_no: 2,
          title: '证据翻面',
          purpose: '主角逼执事回应证据',
          conflict: '执事拒认旧账',
          state_changes_expected: ['中段用新证据推动目标并改变盟友立场'],
          serial_risk_repairs: ['质量续航'],
          recent_fatigue_action: '中段用新证据推动目标并改变盟友立场',
        },
        {
          scene_no: 3,
          title: '新名单落地',
          purpose: '用名单留下下一章追问',
          ending_hook: '章末抛出第三个名字作为追读钩子',
          required_beats: ['章末抛出第三个名字作为追读钩子'],
          serial_risk_repairs: ['delivery_risk_carry_over', '不要再用旁白宣布风险已修复'],
        },
      ],
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], qualityMappedChapter],
      activeChapter: qualityMappedChapter,
      contextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.sceneCards).toHaveLength(3)
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap).toHaveLength(3)
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap[0]).toMatchObject({
      sceneNo: 1,
      title: '旧账压门',
      stage: 'opening',
      action: '前300字先让旧账压迫重新逼近主角',
    })
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap[1]).toMatchObject({
      stage: 'middle',
      action: '中段用新证据推动目标并改变盟友立场',
    })
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap[2]).toMatchObject({
      stage: 'ending',
      action: '章末抛出第三个名字作为追读钩子',
    })
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap[2].forbiddenRepeats).toContain('不要再用旁白宣布风险已修复')
  })

  test('planning desk blocks drafting when delivery risk carry-over is not mapped into scene cards', () => {
    const unmappedSceneCardChapter = {
      ...chapters[1],
      scene_list: [
        {
          scene_no: 1,
          title: '审判厅入场',
          purpose: '主角进入审判厅',
          conflict: '执事拒认旧账',
          ending_hook: '第三个名字出现',
        },
      ],
    }
    const backendContextPackage = {
      chapter_target: {
        goal: '把上一章交稿风险拆成开篇、中段、章末三段修复',
        conflict: '主角要用旧账反制执事',
        ending_hook: '第三个名字出现',
        delivery_risk_carry_over: {
          label: '待修复 3',
          opening_actions: ['前300字先让旧账压迫重新逼近主角'],
          middle_actions: ['中段用新证据推动目标并改变盟友立场'],
          ending_actions: ['章末抛出第三个名字作为追读钩子'],
          forbidden_repeats: ['不要再用旁白宣布风险已修复'],
        },
      },
      preflight: { ready: true, blockers: [] },
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], unmappedSceneCardChapter],
      activeChapter: unmappedSceneCardChapter,
      contextPackage: backendContextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.scenePlanStatus).toBe('ready')
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap).toEqual([])
    expect(model.chapterPlanningDesk.readiness).toBe('needs_scene_plan')
    expect(model.chapterPlanningDesk.statusLabel).toBe('需补质量续航落点')
    expect(model.chapterPlanningDesk.reasons.join('｜')).toContain('delivery_risk_carry_over')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('build_scene_plan')
    expect(model.chapterPlanningDesk.shouldAutoExpandPlanner).toBe(true)
  })

  test('planning desk still blocks unmapped delivery risk carry-over when asset risks are advisory', () => {
    const unmappedSceneCardChapter = {
      ...chapters[1],
      scene_list: [
        {
          scene_no: 1,
          title: '审判厅入场',
          purpose: '主角进入审判厅',
          conflict: '执事拒认旧账',
          ending_hook: '第三个名字出现',
        },
      ],
    }
    const backendContextPackage = {
      chapter_target: {
        goal: '把上一章交稿风险拆成开篇、中段、章末三段修复',
        conflict: '主角要用旧账反制执事',
        ending_hook: '第三个名字出现',
        asset_linkage_contract: {
          relationship_graph_risks: ['旧钥匙需要在现场建立触发条件和代价'],
        },
        delivery_risk_carry_over: {
          label: '待修复 3',
          opening_actions: ['前300字先让旧账压迫重新逼近主角'],
          middle_actions: ['中段用新证据推动目标并改变盟友立场'],
          ending_actions: ['章末抛出第三个名字作为追读钩子'],
        },
      },
      preflight: { ready: true, blockers: [] },
      oh_story_director: {
        readiness: 'ready',
        primary_action: { key: 'generate_prose', label: '生成正文' },
      },
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], unmappedSceneCardChapter],
      activeChapter: unmappedSceneCardChapter,
      contextPackage: backendContextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.writePreparationBrief?.assetRisks).toContain('旧钥匙需要在现场建立触发条件和代价')
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap).toEqual([])
    expect(model.chapterPlanningDesk.readiness).toBe('needs_scene_plan')
    expect(model.chapterPlanningDesk.statusLabel).toBe('需补质量续航落点')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('build_scene_plan')
  })

  test('planning desk reads quality continuity scene cards from backend context package', () => {
    const backendContextPackage = {
      chapter_target: {
        goal: '把上一章交稿风险拆成开篇、中段、章末三段修复',
        conflict: '主角要用旧账反制执事',
        ending_hook: '第三个名字出现',
        delivery_risk_carry_over: {
          label: '待修复 3',
          opening_actions: ['前300字先让旧账压迫重新逼近主角'],
          middle_actions: ['中段用新证据推动目标并改变盟友立场'],
          ending_actions: ['章末抛出第三个名字作为追读钩子'],
          forbidden_repeats: ['不要再用旁白宣布风险已修复'],
        },
        scene_cards: [
          {
            scene_no: 1,
            title: '旧账压门',
            purpose: '主角带着账册入场',
            required_beats: ['前300字先让旧账压迫重新逼近主角'],
            serial_risk_repairs: ['delivery_risk_carry_over', '质量续航'],
          },
          {
            scene_no: 2,
            title: '证据翻面',
            purpose: '主角逼执事回应证据',
            state_changes_expected: ['中段用新证据推动目标并改变盟友立场'],
            serial_risk_repairs: ['质量续航'],
          },
          {
            scene_no: 3,
            title: '新名单落地',
            purpose: '用名单留下下一章追问',
            ending_hook: '章末抛出第三个名字作为追读钩子',
            serial_risk_repairs: ['delivery_risk_carry_over', '不要再用旁白宣布风险已修复'],
          },
        ],
      },
      preflight: { ready: true, blockers: [] },
    }

    const model = buildWritingCockpitModel({
      project,
      outlines,
      chapters: [chapters[0], chapters[1]],
      activeChapter: chapters[1],
      contextPackage: backendContextPackage,
      diagnostics: { preflight: { ready: true, blockers: [] }, material_score: { score: 88, can_generate: true } },
      materialScore: { score: 88, can_generate: true },
    })

    expect(model.chapterPlanningDesk.scenePlanStatus).toBe('ready')
    expect(model.chapterPlanningDesk.sceneCards).toHaveLength(3)
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap).toHaveLength(3)
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap[0]).toMatchObject({
      sceneNo: 1,
      stage: 'opening',
      action: '前300字先让旧账压迫重新逼近主角',
    })
    expect(model.chapterPlanningDesk.qualityContinuitySceneMap[2].forbiddenRepeats).toContain('不要再用旁白宣布风险已修复')
    expect(model.chapterPlanningDesk.readiness).toBe('ready')
    expect(model.chapterPlanningDesk.recommendedPlannerAction.key).toBe('confirm_plan_and_write_draft')
  })

})
