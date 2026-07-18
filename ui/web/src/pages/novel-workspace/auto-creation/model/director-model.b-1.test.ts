import { describe, expect, test } from 'bun:test'
import { buildAutoCreationDirectorModel, buildStyleSampleTaskBookRecheckPlan } from './director-model'
import {
  basePlanning,
  baseWriting,
  safeBatchFutureRoute,
  futureRouteRange,
  readySafeBatchPlanning,
  readySafeBatchWriting,
  recoveryEvidenceFailureRun,
  recoveryEvidenceDeepRepairRun,
  strengthenedRepairReleaseSummary,
  buildStrengthenedRepairAcceptanceInput,
  strengthenedAcceptanceBatchRun,
  expandedSafeBatchRun,
  restoredFiveChapterBatchRun,
  defaultFiveChapterLaneBatchRun,
  expansionStructureVerification,
  expansionStructureValidationBatchRun,
  defaultRegressionValidationBatchRun,
  defaultLaneTemplateValidationBatchRun,
  strengthenedAcceptanceQualityReviews,
} from './director-model.test-fixtures'

describe('buildAutoCreationDirectorModel b 1', () => {
  test('surfaces unresolved governance closure on director front page risk queue', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        {
          id: 91,
          run_type: 'longform_production_repair',
          created_at: '2026-06-13T08:00:00Z',
          output_ref: JSON.stringify({
            audit_summary: {
              status: 'needs_followup',
              recovery_evidence_closure: {
                status: 'needs_followup',
                total: 3,
                resolved: 1,
                single_chapter_count: 1,
                batch_count: 2,
                sources: ['single_chapter_governance_recheck', 'safe_batch_recovery_recheck'],
                failed_evidence: ['样章任务书复检通过 1 项'],
                watch_items: ['下一批继续观察样章策略命中率'],
              },
            },
          }),
        },
        {
          id: 92,
          run_type: 'longform_production_repair',
          created_at: '2026-06-13T09:00:00Z',
          output_ref: JSON.stringify({
            source: 'storyline_diff_decision',
            tasks: [
              {
                source: 'storyline_diff_decision',
                issue_type: 'storyline_diff_revise_prose',
                task_status: 'needs_review',
                title: '第45章剧情线回修',
              },
            ],
          }),
        },
      ],
    })

    expect(model.governanceClosureBrief.status).toBe('block')
    expect(model.governanceClosureBrief.summary).toContain('恢复依据审计')
    expect(model.governanceClosureBrief.summary).toContain('单章治理复查 1')
    expect(model.governanceClosureBrief.summary).toContain('批次恢复复查 2')
    expect(model.governanceClosureBrief.sourceSummary).toBe('单章治理复查 1；批次恢复复查 2')
    expect(model.governanceClosureBrief.summary).toContain('剧情线决策')
    expect(model.governanceClosureBrief.action.key).toBe('review_governance_closure')
    expect(model.governanceClosureBrief.action.label).toBe('治理复查台')
    expect(model.governanceClosureBrief.action.payload).toEqual(expect.objectContaining({
      repairAuditRunId: 91,
      recoveryEvidenceStatus: 'needs_followup',
      storylineDecisionTaskCount: 1,
      storylineDecisionTaskTitles: ['第45章剧情线回修'],
      recoveryEvidenceSourceSummary: '单章治理复查 1；批次恢复复查 2',
    }))
    expect(model.serialCockpit.riskQueue[0]).toEqual(expect.objectContaining({
      key: 'governance_closure',
      label: '治理闭环',
      status: 'block',
    }))
    expect(model.serialCockpit.riskQueue[0].detail).toContain('样章任务书复检通过 1 项')
    expect(model.productionLicense.reasons.join('')).toContain('恢复依据审计')
  })
  test('records closed governance recheck memory in today command deck', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: baseWriting,
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        {
          id: 93,
          run_type: 'longform_production_repair',
          created_at: '2026-06-13T22:00:00Z',
          output_ref: JSON.stringify({
            audit_summary: {
              status: 'closed',
              recovery_evidence_closure: {
                status: 'closed',
                total: 2,
                resolved: 2,
                failed_evidence: ['样章任务书复检通过 1 项'],
                repaired_evidence: ['第42章对白交锋已补回样章节奏', '章末读者回报已兑现'],
                watch_items: ['下一批继续观察样章策略命中率'],
              },
            },
          }),
        },
      ],
    })

    expect(model.governanceClosureBrief.status).toBe('ok')
    expect(model.todayCommandDeck.governanceMemory.visible).toBe(true)
    expect(model.todayCommandDeck.governanceMemory.status).toBe('closed')
    expect(model.todayCommandDeck.governanceMemory.label).toBe('治理复查已记录')
    expect(model.todayCommandDeck.governanceMemory.summary).toContain('恢复依据闭环 2/2')
    expect(model.todayCommandDeck.governanceMemory.evidence).toContain('第42章对白交锋已补回样章节奏')
    expect(model.todayCommandDeck.governanceMemory.watchItems).toContain('下一批继续观察样章策略命中率')
  })
  test('serial cockpit degrades gracefully when chapter material is missing', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        mainline: {
          ...basePlanning.mainline,
          readerPromise: '',
          currentVolumeGoal: '',
        },
      },
      writing: {
        ...baseWriting,
        nextChapter: null,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'blocked',
          statusLabel: '缺少章节',
          reasons: ['还没有可写章节。'],
          recommendedPlannerAction: { key: 'open_outline_panel', label: '打开大纲面板' },
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.serialCockpit.chapterChain.find(item => item.key === 'handoff')?.status).toBe('block')
    expect(model.serialCockpit.chapterChain.find(item => item.key === 'handoff')?.detail).toContain('还没有可写章节')
    expect(model.serialCockpit.guardrails.find(item => item.key === 'core_stability')?.status).toBe('block')
    expect(model.serialCockpit.command.action.key).toBe('open_outline_panel')
  })
  test('today command deck explains why safe batch generation is allowed', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜', chapterTask: '主角拿到试炼资格', conflict: '执事设局阻拦', endingHook: '阵盘亮起第二道裂纹', mainlineProgress: '进入外门试炼核心局', riskTags: [] },
          { chapterNo: 9, title: '阵盘裂纹', chapterTask: '阵盘异常暴露主角潜力', conflict: '同门围堵试探底牌', endingHook: '内门执事点名关注', mainlineProgress: '让宗门高层第一次注意主角', riskTags: [] },
          { chapterNo: 10, title: '外门震动', chapterTask: '试炼结果引发宗门震动', conflict: '旧秩序压制新晋黑马', endingHook: '内门招揽提出苛刻条件', mainlineProgress: '打开内门势力线', riskTags: [] },
        ],
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [
            { title: '压迫升级', goal: '执事逼主角交阵盘' },
            { title: '反向设局', goal: '主角用阵法拿回主动权' },
          ],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        {
          id: 902,
          run_type: 'longform_production_repair',
          created_at: '2026-06-14T09:00:00Z',
          output_ref: {
            audit_summary: {
              status: 'closed',
              recovery_evidence_closure: {
                status: 'closed',
                total: 2,
                resolved: 2,
                tasks: [
                  {
                    chapter_no: 42,
                    task_index: 0,
                    task_status: 'resolved',
                    source: 'single_chapter_governance_recheck',
                    source_label: '单章治理复查',
                    recovery_evidence_review: {
                      status: 'ok',
                      summary: '单章治理复查通过。',
                      failed_evidence: [],
                    },
                  },
                  {
                    chapter_no: 43,
                    task_index: 1,
                    task_status: 'resolved',
                    source: 'safe_batch_recovery_recheck',
                    source_label: '批次恢复复查',
                    recovery_evidence_review: {
                      status: 'ok',
                      summary: '批次恢复复查通过。',
                      failed_evidence: [],
                    },
                  },
                ],
              },
            },
          },
        },
        {
          id: 901,
          run_type: 'longform_production_repair',
          created_at: '2026-06-14T08:00:00Z',
          status: 'ready',
          input_ref: {
            source: 'style_sample_batch_preflight',
          },
          output_ref: {
            report: {
              source: 'style_sample_batch_preflight',
            },
            tasks: [
              {
                issue_type: 'style_sample_task_book_rebuild',
                task_status: 'resolved',
                chapter_no: 9,
                sample_key: '旧高压反打样章',
              },
              {
                issue_type: 'style_sample_task_book_rebuild',
                task_status: 'resolved',
                chapter_no: 10,
                sample_key: '旧对白交锋样章',
              },
            ],
          },
        },
      ],
      storyState: {
        last_updated_chapter: 7,
        global: {
          core_promise: '李超用超人蛮力碰撞规则怪谈，张智负责拆解规则。',
          current_volume_goal: '午夜校园中活过第一轮规则。',
          open_questions: ['广播是谁发出的', '湿漉漉学生为什么敲门'],
          payoff_queue: ['规则边界反制蛮力'],
        },
        characters: [
          { name: '李超', status: '力量觉醒但不懂规则', location: '宿舍楼大厅' },
          { name: '张智', status: '负责推理规则', location: '宿舍楼大厅' },
        ],
      },
    } as any)

    expect(model.productionLicense.status).toBe('batch_allowed')
    expect(model.todayCommandDeck.releaseRationale.mode).toBe('小批量连写')
    expect(model.todayCommandDeck.releaseRationale.allowedCount).toBe(3)
    expect(model.todayCommandDeck.releaseRationale.primaryReason).toContain('可按安全连写放行 3 章')
    expect(model.todayCommandDeck.releaseRationale.checks).toEqual(expect.arrayContaining(['长线材料可用', '交稿风险已清', '下一批任务书可执行']))
    expect(model.todayCommandDeck.releaseRationale.limits).toContain('只放行护栏确认的连续章节')
    expect(model.batchGuardrail.briefRecovery.evidence).toContain('样章任务书复检通过 2 项')
    expect(model.batchGuardrail.briefRecovery.evidence).toContain('第9、10章样章已重审')
    expect(model.batchGuardrail.recommendedAction.payload?.batch_preflight?.recovery_evidence).toEqual(expect.arrayContaining([
      '批次任务书完整',
      '样章任务书复检通过 2 项',
      '第9、10章样章已重审',
    ]))
    expect(model.batchGuardrail.preflight.inputSnapshot.recovery_evidence_production_gate).toMatchObject({
      status: 'ok',
      label: '恢复依据生产闸门',
      sources: [
        expect.objectContaining({
          source: 'single_chapter_governance_recheck',
          status: 'cleared',
          status_label: '生产阻断已解除',
        }),
        expect.objectContaining({
          source: 'safe_batch_recovery_recheck',
          status: 'cleared',
          status_label: '生产阻断已解除',
        }),
      ],
    })
    expect(model.batchGuardrail.recommendedAction.payload?.batch_preflight?.recovery_evidence_production_gate).toMatchObject({
      status: 'ok',
      source_count: 2,
    })
    expect(model.batchGuardrail.preflight.inputSnapshot.recovery_evidence_release_summary).toMatchObject({
      status: 'released',
      source: 'recovery_evidence_governance_queue',
      safe_chapter_count: 3,
      allowed_chapter_nos: [8, 9, 10],
      next_batch_label: '第8-10章',
      cleared_source_count: 2,
    })
    expect(model.batchGuardrail.preflight.inputSnapshot.recovery_evidence_release_summary.evidence).toEqual(expect.arrayContaining([
      '恢复依据治理队列已闭环',
      '单章治理复查：生产阻断已解除',
      '批次恢复复查：生产阻断已解除',
    ]))
    expect(model.batchGuardrail.recommendedAction.payload?.batch_preflight?.recovery_evidence_release_summary).toMatchObject({
      status: 'released',
      cleared_source_count: 2,
    })
    expect(model.batchGuardrail.briefRecovery.evidence).toContain('恢复依据治理队列已闭环')
    expect(model.productionLicense.reasons).toContain('恢复依据治理队列已闭环')
    expect(model.todayCommandDeck.releaseRationale.checks).toContain('恢复依据治理队列已闭环')
  })
  test('blocks safe batching at the director entry when recovery evidence sources still need recheck', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜', chapterTask: '主角拿到试炼资格', conflict: '执事设局阻拦', endingHook: '阵盘亮起第二道裂纹', mainlineProgress: '进入外门试炼核心局', riskTags: [] },
          { chapterNo: 9, title: '阵盘裂纹', chapterTask: '阵盘异常暴露主角潜力', conflict: '同门围堵试探底牌', endingHook: '内门执事点名关注', mainlineProgress: '让宗门高层第一次注意主角', riskTags: [] },
          { chapterNo: 10, title: '外门震动', chapterTask: '试炼结果引发宗门震动', conflict: '旧秩序压制新晋黑马', endingHook: '内门招揽提出苛刻条件', mainlineProgress: '打开内门势力线', riskTags: [] },
        ],
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [
            { title: '压迫升级', goal: '执事逼主角交阵盘' },
            { title: '反向设局', goal: '主角用阵法拿回主动权' },
          ],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        {
          id: 902,
          run_type: 'longform_production_repair',
          created_at: '2026-06-14T09:00:00Z',
          output_ref: {
            audit_summary: {
              status: 'closed',
              governance_recheck_memory: {
                status: 'closed',
                label: '治理复查已记录',
                summary: '恢复依据闭环 2/2，剧情线决策无未关闭项。',
                evidence: ['第42章对白交锋已补回样章节奏'],
                failed_evidence: [],
                watch_items: [],
                storyline_decision_task_count: 0,
                source_run_id: 902,
              },
              recovery_evidence_closure: {
                status: 'closed',
                total: 2,
                resolved: 2,
                tasks: [
                  {
                    chapter_no: 42,
                    task_index: 0,
                    task_status: 'open',
                    source: 'single_chapter_governance_recheck',
                    source_label: '单章治理复查',
                  },
                  {
                    chapter_no: 43,
                    task_index: 1,
                    task_status: 'needs_review',
                    source: 'safe_batch_recovery_recheck',
                    source_label: '批次恢复复查',
                    recovery_evidence_review: {
                      status: 'warn',
                      summary: '批次复盘仍有恢复依据未落地。',
                      failed_evidence: ['第43章读者回报仍未继承'],
                    },
                  },
                ],
              },
            },
          },
        },
      ],
      storyState: {
        last_updated_chapter: 7,
        global: {
          core_promise: '李超用超人蛮力碰撞规则怪谈，张智负责拆解规则。',
          current_volume_goal: '午夜校园中活过第一轮规则。',
        },
      },
    } as any)

    const recoveryGate = model.batchGuardrail.guardrails.find(item => item.label === '恢复依据生产闸门')

    expect(recoveryGate).toEqual(expect.objectContaining({
      status: 'block',
      detail: expect.stringContaining('单章治理复查：等待复检结论'),
    }))
    expect(recoveryGate?.detail).toContain('批次恢复复查：暂缓安全连写')
    expect(recoveryGate?.detail).toContain('第43章读者回报仍未继承')
    expect(model.batchGuardrail.status).toBe('blocked')
    expect(model.batchGuardrail.recommendedAction.key).toBe('create_recovery_evidence_governance_queue')
    expect(model.batchGuardrail.recommendedAction.label).toBe('生成恢复依据治理队列')
    expect(model.batchGuardrail.recommendedAction.payload?.recoveryEvidenceNextAction).toEqual(expect.objectContaining({
      action: 'focus_task',
      label: '定位批次任务',
      source: 'safe_batch_recovery_recheck',
      residualEvidence: ['第43章读者回报仍未继承'],
    }))
    expect(model.batchGuardrail.recommendedAction.payload?.recoveryEvidenceGovernanceQueue).toEqual(expect.objectContaining({
      source: 'recovery_evidence_production_gate',
      summary: expect.stringContaining('定位批次任务'),
      main_action: expect.objectContaining({
        action: 'focus_task',
        label: '定位批次任务',
        source: 'safe_batch_recovery_recheck',
      }),
      source_count: 2,
      tasks: [
        expect.objectContaining({
          issue_type: 'recovery_evidence_governance_queue',
          source: 'single_chapter_governance_recheck',
          action_key: 'recheck_single_chapter',
          recheck_mode: 'single_chapter',
          recheck_source: 'governance_recheck_sync',
          source_task_index: 0,
          chapter_no: 42,
          closure_status: 'blocked_until_recheck',
          auto_recheck: true,
          task_status: 'needs_review',
        }),
        expect.objectContaining({
          issue_type: 'recovery_evidence_governance_queue',
          source: 'safe_batch_recovery_recheck',
          action_key: 'focus_task',
          recheck_mode: 'manual_then_batch_audit',
          recheck_source: 'longform_repair_audit_summary',
          source_task_index: 1,
          chapter_no: 43,
          requires_manual_repair: true,
          closure_status: 'blocked_until_batch_audit',
          task_status: 'needs_review',
          recovery_evidence_review: expect.objectContaining({
            failed_evidence: ['第43章读者回报仍未继承'],
          }),
        }),
      ],
    }))
    expect(model.batchGuardrail.preflight.inputSnapshot.recovery_evidence_production_gate).toMatchObject({
      status: 'block',
      label: '恢复依据生产闸门',
      sources: [
        expect.objectContaining({
          source: 'single_chapter_governance_recheck',
          status: 'pending',
          status_label: '等待复检结论',
        }),
        expect.objectContaining({
          source: 'safe_batch_recovery_recheck',
          status: 'blocked',
          status_label: '暂缓安全连写',
          residual_evidence: ['第43章读者回报仍未继承'],
        }),
      ],
    })
    expect(model.batchGuardrail.recommendedAction.payload?.batch_preflight?.recovery_evidence_production_gate).toMatchObject({
      status: 'block',
      source_count: 2,
      recommended_action: {
        key: 'create_recovery_evidence_governance_queue',
        label: '生成恢复依据治理队列',
      },
    })
    expect(model.todayCommandDeck.releaseRationale.checks.join('；')).toContain('恢复依据生产闸门')
    expect(model.productionLicense.status).toBe('blocked')
  })
  test('routes pending single-chapter recovery evidence gate to the single recheck main action', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜', chapterTask: '主角拿到试炼资格', conflict: '执事设局阻拦', endingHook: '阵盘亮起第二道裂纹', mainlineProgress: '进入外门试炼核心局', riskTags: [] },
        ],
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [
            { title: '压迫升级', goal: '执事逼主角交阵盘' },
          ],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
      runRecords: [
        {
          id: 903,
          run_type: 'longform_production_repair',
          created_at: '2026-06-14T10:00:00Z',
          output_ref: {
            audit_summary: {
              status: 'closed',
              recovery_evidence_closure: {
                status: 'closed',
                total: 1,
                resolved: 1,
                tasks: [
                  {
                    chapter_no: 42,
                    task_index: 0,
                    task_status: 'open',
                    source: 'single_chapter_governance_recheck',
                    source_label: '单章治理复查',
                  },
                ],
              },
            },
          },
        },
      ],
      storyState: {
        last_updated_chapter: 7,
        global: {
          core_promise: '李超用超人蛮力碰撞规则怪谈，张智负责拆解规则。',
          current_volume_goal: '午夜校园中活过第一轮规则。',
        },
      },
    } as any)

    expect(model.batchGuardrail.recommendedAction.key).toBe('create_recovery_evidence_governance_queue')
    expect(model.batchGuardrail.recommendedAction.label).toBe('生成恢复依据治理队列')
    expect(model.batchGuardrail.recommendedAction.payload?.recoveryEvidenceNextAction).toEqual(expect.objectContaining({
      action: 'recheck_single_chapter',
      label: '复检单章',
      source: 'single_chapter_governance_recheck',
    }))
    expect(model.batchGuardrail.recommendedAction.payload?.recoveryEvidenceGovernanceQueue).toEqual(expect.objectContaining({
      source: 'recovery_evidence_production_gate',
      summary: expect.stringContaining('复检单章'),
      main_action: expect.objectContaining({
        action: 'recheck_single_chapter',
        label: '复检单章',
      }),
      tasks: [
        expect.objectContaining({
          source: 'single_chapter_governance_recheck',
          action_key: 'recheck_single_chapter',
          recheck_mode: 'single_chapter',
          recheck_source: 'governance_recheck_sync',
          source_task_index: 0,
          chapter_no: 42,
          closure_status: 'blocked_until_recheck',
          auto_recheck: true,
          task_status: 'needs_review',
        }),
      ],
    }))
  })
  test('today command deck explains why production is downgraded to one chapter', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜', chapterTask: '主角拿到试炼资格', conflict: '执事设局阻拦', endingHook: '阵盘亮起第二道裂纹', mainlineProgress: '进入外门试炼核心局', riskTags: [] },
          { chapterNo: 9, title: '阵盘裂纹', chapterTask: '', conflict: '', endingHook: '内门执事点名关注', mainlineProgress: '', riskTags: ['缺逐章职责'] },
        ],
      },
      writing: {
        ...baseWriting,
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [
            { title: '压迫升级', goal: '执事逼主角交阵盘' },
            { title: '反向设局', goal: '主角用阵法拿回主动权' },
          ],
          recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        },
        topStatus: {
          ...baseWriting.topStatus,
          nextActionLabel: '确认并生成',
          primaryActionKey: 'confirm_plan_and_write_draft',
        },
        primaryActionKey: 'confirm_plan_and_write_draft',
      },
      activeTasks: [],
      selectedModelId: 12,
    } as any)

    expect(model.productionLicense.status).toBe('single_chapter')
    expect(model.todayCommandDeck.releaseRationale.mode).toBe('单章生产')
    expect(model.todayCommandDeck.releaseRationale.allowedCount).toBe(1)
    expect(model.todayCommandDeck.releaseRationale.limits).toEqual(expect.arrayContaining([
      '暂不放行批量自动连写',
      '当前章交稿闭环完成后再评估下一批',
    ]))
    expect(model.todayCommandDeck.releaseRationale.primaryReason).toContain('先推进当前章')
  })
  test('builds a million word runway that explains the current writing course before safe batching', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        topStatus: {
          ...basePlanning.topStatus,
          future100Coverage: { ready: true, planned: 100, required: 100, missingChapters: [], label: '100/100' },
        },
        futureRoute: [
          { chapterNo: 8, title: '试炼前夜', chapterTask: '主角拿到试炼资格', conflict: '执事设局阻拦', endingHook: '阵盘亮起第二道裂纹', mainlineProgress: '主角从被动挨压转为主动入局' },
          { chapterNo: 9, title: '试炼开场', chapterTask: '主角进入外门试炼', conflict: '同门围堵抢阵旗', endingHook: '隐藏阵眼被误触', mainlineProgress: '试炼规则开始反噬反派' },
          { chapterNo: 10, title: '阵眼反杀', chapterTask: '主角公开证明阵法价值', conflict: '执事暗改规则', endingHook: '内门长老点名主角', mainlineProgress: '主角进入内门视野' },
        ],
      },
      writing: {
        ...baseWriting,
        nextChapter: {
          ...baseWriting.nextChapter,
          rawPayload: {
            readerPayoff: '用阵法反制执事设局，拿回试炼主动权',
            mainlineProgress: '主角从被动挨压转为主动入局',
          },
        },
        chapterPlanningDesk: {
          ...baseWriting.chapterPlanningDesk,
          readiness: 'ready',
          statusLabel: '本章可写',
          scenePlanStatus: 'ready',
          sceneCards: [{ scene_no: 1, title: '试炼资格争夺', conflict: '执事设局，主角反制' }],
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

    expect(model.millionWordRunway.status).toBe('ready')
    expect(model.millionWordRunway.bandLabel).toBe('第1个10万字')
    expect(model.millionWordRunway.safeModeLabel).toContain('小批量')
    expect(model.millionWordRunway.fourQuestions.map(item => item.key)).toEqual([
      'why_now',
      'page_turn',
      'mainline_move',
      'freshness',
    ])
    expect(model.millionWordRunway.fourQuestions.find(item => item.key === 'why_now')?.answer).toContain('主角拿到试炼资格')
    expect(model.millionWordRunway.fourQuestions.find(item => item.key === 'page_turn')?.answer).toContain('阵盘亮起第二道裂纹')
    expect(model.millionWordRunway.redLines.join('｜')).toContain('寒门少年以阵法反压宗门秩序')
    expect(model.millionWordRunway.readerFuel.join('｜')).toContain('用阵法反制执事设局')
  })
  test('blocks the million word runway when story state memory is stale', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: {
        ...baseWriting,
        readiness: {
          checks: [],
          blockers: [],
          warnings: [{ key: 'story_state_stale', status: 'warn', label: '故事状态滞后', detail: '第8章未同步到长线记忆。' }],
        },
      },
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.millionWordRunway.status).toBe('blocked')
    expect(model.millionWordRunway.safeModeLabel).toBe('禁止连写')
    expect(model.millionWordRunway.gates.find(item => item.key === 'canon_memory')?.status).toBe('block')
    expect(model.millionWordRunway.recommendedAction.key).toBe('update_canon')
    expect(model.dailyBattlePlan.currentStepKey).toBe('fuel_materials')
  })
  test('blocks chapter drafting when the current chapter no longer serves the core reader promise', () => {
    const model = buildAutoCreationDirectorModel({
      planning: {
        ...basePlanning,
        mainline: {
          ...basePlanning.mainline,
          currentChapterServesVolume: false,
          nextTurn: '',
        },
      },
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

    expect(model.chapterLaunchGate.status).toBe('blocked')
    expect(model.chapterLaunchGate.label).toBe('本章开写门禁未通过')
    expect(model.chapterLaunchGate.signals.find(signal => signal.key === 'mainline_service')?.status).toBe('block')
    expect(model.chapterLaunchGate.signals.find(signal => signal.key === 'reader_promise')?.detail).toContain('寒门少年以阵法反压宗门秩序')
    expect(model.status).toBe('needs_governance')
    expect(model.statusLabel).toBe('开写门禁')
    expect(model.mainAction.area).toBe('planning')
    expect(model.mainAction.key).toBe('update_rolling_plan')
    expect(model.confirmations).toContain('本章开写门禁未通过')
  })
  test('blocks unattended drafting when write preparation still needs confirmation', () => {
    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing: readySafeBatchWriting({
        chapterPlanningDesk: {
          writePreparationBrief: {
            readinessStatus: 'needs_context',
            sourceGaps: ['上一章正文或上一章承接｜状态=missing｜缺少上一章承接'],
            assetRisks: ['旧钥匙(isolated_key_asset)：旧钥匙还没有和禁门规则建立现场关系'],
            deliveryRiskActions: ['前 300 字先接住上一章门外黑影压迫'],
            blueprintFocus: ['开篇钩子：警钟第三响压入筵席'],
            readerPayoffFocus: ['读者回报：失势皇子第一次当众夺回主动权'],
            mustConfirm: ['补上旧钥匙的现场功能和代价。'],
            executionOrder: ['先确认来源就绪，再进入场景卡。'],
          },
          reasons: ['写前准备待确认：上一章正文或旧钥匙资产关系未确认'],
          recommendedPlannerAction: { key: 'open_generation_diagnostics', label: '查看生成诊断' },
        },
      }),
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.chapterLaunchGate.status).toBe('blocked')
    expect(model.chapterLaunchGate.signals.find(signal => signal.key === 'write_preparation')?.status).toBe('block')
    expect(model.chapterLaunchGate.signals.find(signal => signal.key === 'write_preparation')?.detail).toContain('上一章正文')
    expect(model.statusLabel).toBe('开写门禁')
    expect(model.mainAction.key).toBe('open_generation_diagnostics')
    expect(model.confirmations).toContain('本章开写门禁未通过')
  })
  test('keeps execution risks in the chapter contract without blocking the launch gate', () => {
    const writing = readySafeBatchWriting({
      chapterPlanningDesk: {
        reasons: [],
        recommendedPlannerAction: { key: 'confirm_plan_and_write_draft', label: '确认并生成' },
        writePreparationBrief: {
          readinessStatus: 'ready',
          sourceGaps: [],
          assetRisks: ['旧钥匙需要在现场建立触发条件和代价'],
          deliveryRiskActions: ['前300字接住上一章围捕压力'],
          rollingRhythmPreflight: {
            principle: '拉期待速度 > 断期待速度',
            nextActions: ['先铺下一目标，再兑现当前回报'],
          },
          blueprintFocus: ['开篇钩子：山路第一轮截杀'],
          readerPayoffFocus: ['读者回报：现场验证旧方案失效'],
          mustConfirm: ['旧钥匙风险动作必须进入写后回执。'],
          executionOrder: ['按场景顺序执行并核验。'],
        },
      },
    })
    expect(writing.chapterPlanningDesk.readiness).toBe('ready')
    expect(writing.chapterPlanningDesk.scenePlanStatus).toBe('ready')
    expect(writing.chapterPlanningDesk.sceneCards).toHaveLength(2)

    const model = buildAutoCreationDirectorModel({
      planning: basePlanning,
      writing,
      activeTasks: [],
      selectedModelId: 12,
    })

    expect(model.chapterLaunchGate.signals.find(signal => signal.key === 'write_preparation')).toBeUndefined()
    expect(model.chapterLaunchGate.status).toBe('ready')
  })
})
