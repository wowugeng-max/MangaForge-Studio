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

describe('buildWritingCockpitModel a', () => {
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


})
