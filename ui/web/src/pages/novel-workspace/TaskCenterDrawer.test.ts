import { describe, expect, test } from 'bun:test'
import {
  buildRecoveryEvidenceAuditView,
  buildRecoveryEvidenceReviewActionFeedback,
  buildRecoveryEvidenceReviewActionFeedbackKey,
  buildRecoveryEvidenceReviewRefreshAnchor,
  buildRecoveryEvidenceReviewRefreshFeedback,
  buildRecoveryEvidenceReviewResolvedFeedback,
  buildRecoveryEvidenceReviewRowAction,
  buildRecoveryEvidenceReviewRows,
  buildRecoveryEvidenceRegovernanceSummary,
  buildRecoveryEvidenceSourceRiskProfileSnapshot,
  buildPostBatchQualityCheckSummary,
  buildNextChapterQualityPlanPreview,
  buildRepairClosureHighlights,
  buildRepairTaskIssueTagMeta,
  buildTaskRunCardModel,
  buildSafeBatchExpansionPolicySnapshot,
  buildSafeBatchRecoveryFocusReviewState,
  chapterGroupActionState,
  chapterGroupRunActionState,
  recoveryEvidenceSourceRecheckAction,
  repairTaskActionLabel,
  safeBatchRecoveryFocusMatchesTask,
} from './TaskCenterDrawer'

describe('buildTaskRunCardModel', () => {
  test('summarizes repair runs with lifecycle, operation mode, timeline, closure and one primary action', () => {
    const model = buildTaskRunCardModel({
      id: 17,
      run_type: 'longform_production_repair',
      status: 'ready',
      step_name: 'reader-trial-repair-1',
      created_at: '2026-06-30T08:10:00.000Z',
      updated_at: '2026-06-30T08:15:00.000Z',
      output_ref: JSON.stringify({
        tasks: [
          { task_status: 'open', title: '补章末追读' },
          { task_status: 'needs_review', title: '复查试读修复' },
          { task_status: 'resolved', title: '补开篇钩子' },
        ],
      }),
    }, { canProcessRepairTasks: true })

    expect(model.lifecycle.label).toBe('待启动')
    expect(model.execution.label).toBe('手工处理')
    expect(model.timeline).toEqual([
      { key: 'created', label: '创建', value: '2026-06-30 16:10' },
      { key: 'started', label: '开始', value: '未开始' },
      { key: 'ended', label: '结束', value: '未结束' },
      { key: 'updated', label: '更新', value: '2026-06-30 16:15' },
    ])
    expect(model.closure).toMatchObject({
      total: 3,
      pending: 1,
      needsReview: 1,
      resolved: 1,
      failed: 0,
      summary: '待处理 1 项，需复查 1 项，已完成 1/3',
    })
    expect(model.primaryAction).toEqual({ key: 'process_repair', label: '处理下一项' })
  })

  test('marks unattended and completed runs without adding a primary action', () => {
    const model = buildTaskRunCardModel({
      id: 18,
      run_type: 'chapter_group_generation',
      status: 'completed',
      step_name: 'unattended-to-10',
      input_ref: JSON.stringify({ unattended: { enabled: true } }),
      output_ref: JSON.stringify({ chapters: [{ status: 'success' }, { status: 'success' }] }),
      started_at: '2026-06-30T09:00:00.000Z',
      completed_at: '2026-06-30T09:05:00.000Z',
    })

    expect(model.lifecycle.label).toBe('已完成')
    expect(model.execution.label).toBe('自动运行')
    expect(model.closure.summary).toBe('已完成 2/2')
    expect(model.primaryAction).toEqual({ key: 'none', label: '' })
  })

  test('director stage summarizes oh-story director stage, blocking status and lifecycle metadata', () => {
    const model = buildTaskRunCardModel({
      id: 19,
      run_type: 'generate_prose',
      status: 'completed',
      created_at: '2026-06-30T08:10:00.000Z',
      started_at: '2026-06-30T08:12:00.000Z',
      completed_at: '2026-06-30T08:18:00.000Z',
      input: { unattended: true },
      payload: {
        oh_story_director: {
          stage: 'pre_draft',
          readiness: 'needs_repair',
          primary_action: { key: 'repair_pre_draft_materials', label: '补齐并继续', mode: 'automatic' },
          required_repairs: [{ key: 'blueprint', label: '补蓝图', blocking: true }],
        },
      },
    })

    expect(model.execution.key).toBe('auto')
    expect(model.directorStage?.key).toBe('pre_draft')
    expect(model.directorStage?.label).toBe('写前准备')
    expect(model.blocking.key).toBe('blocking')
    expect(model.timeline.find(item => item.key === 'started')?.value).toContain('2026')
    expect(model.timeline.find(item => item.key === 'ended')?.value).toContain('2026')
  })

  test('director stage marks ready post-draft director runs as non-blocking', () => {
    const model = buildTaskRunCardModel({
      id: 20,
      run_type: 'generate_prose',
      status: 'completed',
      output_ref: JSON.stringify({
        ohStoryDirector: {
          stage: 'post_draft',
          readiness: 'ready',
          requiredRepairs: [],
        },
      }),
    })

    expect(model.directorStage?.label).toBe('写后诊断')
    expect(model.blocking.key).toBe('non_blocking')
    expect(model.blocking.label).toBe('不阻塞')
  })
})

describe('buildPostBatchQualityCheckSummary', () => {
  test('summarizes oh-story batch quality checks from chapter group output', () => {
    const summary = buildPostBatchQualityCheckSummary({
      run_type: 'chapter_group_generation',
      output_ref: JSON.stringify({
        post_batch_quality_check: {
          source: 'oh_story_step_3',
          status: 'warn',
          completed_count: 3,
          chapter_nos: [21, 22, 23],
          revised_count: 1,
          average_score: 82,
          checks: [
            { key: 'title_uniqueness', label: '标题去重', status: 'ok', checked_count: 3, warn_count: 0 },
            { key: 'prose_meta', label: '正文元信息', status: 'warn', checked_count: 3, warn_count: 1, summaries: ['第22章仍残留作者说明'] },
            { key: 'chapter_hook', label: '章尾钩子', status: 'ok', checked_count: 3, warn_count: 0 },
            { key: 'blueprint_consumption', label: '细纲兑现', status: 'ok', checked_count: 3, warn_count: 0 },
            { key: 'foreshadowing_delta', label: '伏笔增量', status: 'warn', checked_count: 3, warn_count: 1 },
            { key: 'deterministic_cleanup', label: '确定性清理', status: 'ok', checked_count: 3, warn_count: 0 },
            { key: 'story_state', label: '状态机更新', status: 'ok', checked_count: 3, warn_count: 0 },
          ],
        },
      }),
    })

    expect(summary).toMatchObject({
      visible: true,
      title: '批次质检',
      source: 'oh_story_step_3',
      status: 'warn',
      statusLabel: '需复核',
      statusColor: 'gold',
      completedCount: 3,
      chapterNos: [21, 22, 23],
      revisedCount: 1,
      averageScore: 82,
      warningCount: 2,
    })
    expect(summary?.chapterText).toBe('第21-23章')
    expect(summary?.checks).toHaveLength(7)
    expect(summary?.checks.find(check => check.key === 'prose_meta')).toMatchObject({
      label: '正文元信息',
      status: 'warn',
      statusLabel: '需复核',
      warningCount: 1,
      summaries: ['第22章仍残留作者说明'],
    })
  })

  test('stays hidden when chapter group output has no post batch quality check', () => {
    expect(buildPostBatchQualityCheckSummary({
      run_type: 'chapter_group_generation',
      output_ref: JSON.stringify({ chapters: [] }),
    })).toBeNull()
  })
})

describe('chapterGroupActionState', () => {
  test('does not offer manual approval for approval-blocker chapters', () => {
    const state = chapterGroupActionState({
      status: 'needs_approval',
      approval_stage: 'approval_blocker',
      error_code: 'APPROVAL_BLOCKER',
      error: '仿写安全阻断：参考桥段相似度过高',
    })

    expect(state.canApprove).toBe(false)
    expect(state.canRetry).toBe(false)
    expect(state.canSkip).toBe(false)
    expect(state.blockedByApprovalBlocker).toBe(true)
    expect(state.actionHint).toContain('先修复入库阻断')
  })

  test('keeps manual confirmation available for ordinary approval stages', () => {
    const state = chapterGroupActionState({
      status: 'needs_approval',
      approval_stage: 'scene_cards',
    })

    expect(state.canApprove).toBe(true)
    expect(state.canRetry).toBe(true)
    expect(state.canSkip).toBe(true)
    expect(state.blockedByApprovalBlocker).toBe(false)
  })
})

describe('chapterGroupRunActionState', () => {
  test('does not offer run-level continue or execute for approval-blocker runs', () => {
    const state = chapterGroupRunActionState({
      run_type: 'chapter_group_generation',
      status: 'paused',
      output_ref: JSON.stringify({
        current_index: 0,
        chapters: [
          {
            id: 901,
            chapter_no: 21,
            status: 'needs_approval',
            approval_stage: 'approval_blocker',
            error_code: 'APPROVAL_BLOCKER',
          },
        ],
        last_error: {
          approval_stage: 'approval_blocker',
          error_code: 'APPROVAL_BLOCKER',
        },
      }),
    })

    expect(state.blockedByApprovalBlocker).toBe(true)
    expect(state.canResume).toBe(false)
    expect(state.canExecute).toBe(false)
    expect(state.actionHint).toContain('先修复入库阻断')
  })

  test('keeps run-level continue and execute available for ordinary paused chapter groups', () => {
    const state = chapterGroupRunActionState({
      run_type: 'chapter_group_generation',
      status: 'paused',
      output_ref: JSON.stringify({
        current_index: 0,
        chapters: [{ id: 902, chapter_no: 22, status: 'needs_approval', approval_stage: 'scene_cards' }],
      }),
    })

    expect(state.blockedByApprovalBlocker).toBe(false)
    expect(state.canResume).toBe(true)
    expect(state.canExecute).toBe(true)
  })
})

describe('buildRepairClosureHighlights', () => {
  test('summarizes resolved delivery risk repair tasks for task center closure evidence', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        issue_type: 'volume_beat_missed',
        task_status: 'resolved',
        chapter_no: 7,
        title: '旧规反噬',
      },
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        issue_type: 'core_drift',
        task_status: 'needs_review',
        chapter_no: 8,
      },
    ], { status: 'closed' })

    expect(highlights).toEqual([
      expect.objectContaining({
        label: '爆点风险已清',
        count: 1,
        chapterNos: [7],
        issueTypes: ['volume_beat_missed'],
      }),
    ])
    expect(highlights[0]?.detail).toContain('第7章')
    expect(highlights[0]?.detail).toContain('修复审计已闭环')
  })

  test('normalizes resolved annotation categories when issue type is missing', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        annotation_category: 'delivery_core',
        task_status: 'resolved',
        chapter_no: 8,
      },
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        annotation_category: 'reader_payoff',
        task_status: 'resolved',
        chapter_no: 9,
      },
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        issue_type: 'volume_beat_missed',
        annotation_category: 'delivery_core',
        task_status: 'resolved',
        chapter_no: 10,
      },
    ])

    expect(highlights).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: '核心偏移风险已清',
        chapterNos: [8],
        issueTypes: ['core_drift'],
      }),
      expect.objectContaining({
        label: '回报欠账风险已清',
        chapterNos: [9],
        issueTypes: ['reader_payoff_debt'],
      }),
      expect.objectContaining({
        label: '爆点风险已清',
        chapterNos: [10],
        issueTypes: ['volume_beat_missed'],
      }),
    ]))
  })

  test('groups resolved safe-batch repair aliases by longform risk category', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'reader_pull_missed',
        task_status: 'resolved',
        chapter_no: 9,
      },
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'reader_expectation_debt',
        task_status: 'resolved',
        chapter_no: 10,
      },
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'innovation_execution_missed',
        task_status: 'resolved',
        chapter_no: 11,
      },
    ])

    expect(highlights.map(item => item.label)).toEqual(['追读风险已清', '创新风险已清'])
    expect(highlights[0]?.count).toBe(2)
    expect(highlights[0]?.chapterNos).toEqual([9, 10])
    expect(highlights[0]?.issueTypes).toEqual(['reader_pull_missed', 'reader_expectation_debt'])
    expect(highlights[0]?.detail).toContain('第9、10章')
  })

  test('summarizes resolved next-chapter quality plan repairs as quality continuity closure', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        issue_type: 'next_chapter_quality_plan',
        task_status: 'resolved',
        chapter_no: 12,
        message: '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan。',
      },
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        annotation_category: 'approval_blocker',
        task_status: 'resolved',
        chapter_no: 13,
        detail: '下一章质量续航计划缺失',
      },
    ], { status: 'closed' })

    expect(highlights).toEqual([
      expect.objectContaining({
        label: '质量续航风险已清',
        color: 'gold',
        count: 2,
        chapterNos: [12, 13],
        issueTypes: ['next_chapter_quality_plan'],
      }),
    ])
    expect(highlights[0]?.detail).toContain('第12、13章')
    expect(highlights[0]?.detail).toContain('修复审计已闭环')
  })

  test('groups resolved scene-card execution directive repairs as scene-card closure evidence', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'review_annotation_risk',
        task_type: 'repair_quality',
        issue_type: 'scene_card_1_forbidden_directives',
        task_status: 'resolved',
        chapter_no: 12,
        message: '场景1《蓝晶灼手》违反场景卡禁令：不得用整段来历/等级解释蓝晶。',
      },
    ], { status: 'closed' })

    expect(highlights).toEqual([
      expect.objectContaining({
        key: 'scene_card_directive',
        label: '场景卡执行风险已清',
        color: 'volcano',
        count: 1,
        chapterNos: [12],
        issueTypes: ['scene_card_1_forbidden_directives'],
      }),
    ])
    expect(highlights[0]?.detail).toContain('第12章')
    expect(highlights[0]?.detail).toContain('场景卡执行风险已处理')
  })

  test('groups resolved safe-batch expansion segment repairs as rollback evidence', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'safe_batch_expansion_segment_hotspot',
        task_status: 'resolved',
        chapter_no: 10,
      },
    ])

    expect(highlights).toEqual([
      expect.objectContaining({
        key: 'batch_expansion_segment',
        label: '扩批分段风险已清',
        count: 1,
        chapterNos: [10],
        issueTypes: ['safe_batch_expansion_segment_hotspot'],
      }),
    ])
  })

  test('groups resolved safe-batch expansion structure repairs as structure governance evidence', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'safe_batch_expansion_structure_repair',
        task_status: 'resolved',
        chapter_no: 15,
      },
    ])

    expect(highlights).toEqual([
      expect.objectContaining({
        key: 'batch_expansion_structure',
        label: '扩批结构风险已清',
        count: 1,
        chapterNos: [15],
        issueTypes: ['safe_batch_expansion_structure_repair'],
      }),
    ])
  })

  test('groups resolved recovery evidence repairs as closure evidence', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'recovery_evidence_mismatch',
        task_status: 'resolved',
        chapter_no: 41,
      },
    ], { status: 'closed' })

    expect(highlights).toEqual([
      expect.objectContaining({
        key: 'recovery_evidence',
        label: '恢复依据风险已清',
        count: 1,
        chapterNos: [41],
        issueTypes: ['recovery_evidence_mismatch'],
      }),
    ])
    expect(highlights[0]?.detail).toContain('恢复依据风险已处理')
    expect(highlights[0]?.detail).toContain('修复审计已闭环')
  })

  test('labels resolved repair receipt and revision guard risks by concrete closure category', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'quality_audit_repair_receipt',
        annotation_category: 'quality_audit_repair_receipt',
        chapter_no: 8,
      },
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'deslop_repair_receipt',
        annotation_category: 'deslop_repair_receipt',
        chapter_no: 8,
      },
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'revision_cascade_impact',
        annotation_category: 'revision_cascade_impact',
        chapter_no: 9,
      },
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'revision_scope_guard',
        annotation_category: 'revision_scope_guard',
        chapter_no: 9,
      },
    ])

    expect(highlights.map(item => item.label)).toEqual(expect.arrayContaining([
      '质量回执风险已清',
      '去AI味回执风险已清',
      '级联修订风险已清',
      '修订幅度风险已清',
    ]))
    expect(highlights).toHaveLength(4)
  })

  test('labels resolved prose revision sync and delivery receipt repairs by closure category', () => {
    const highlights = buildRepairClosureHighlights([
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'prose_revision_receipt',
        annotation_category: 'prose_revision_receipt',
        chapter_no: 12,
      },
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'prose_revision_receipt_sync',
        annotation_category: 'prose_revision_receipt_sync',
        chapter_no: 12,
      },
      {
        source: 'review_annotation_risk',
        task_status: 'resolved',
        issue_type: 'delivery_risk_receipts',
        annotation_category: 'delivery_risk_receipt',
        chapter_no: 12,
      },
    ], { status: 'closed' })

    expect(highlights).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'prose_revision_receipt',
        label: '修订回执风险已清',
        chapterNos: [12],
      }),
      expect.objectContaining({
        key: 'prose_revision_receipt_sync',
        label: '修订回执风险已清',
        chapterNos: [12],
      }),
      expect.objectContaining({
        key: 'delivery_risk_receipt',
        label: '交稿回执风险已清',
        chapterNos: [12],
      }),
    ]))
    expect(highlights.map(item => item.detail).join('\n')).toContain('修订回执风险已处理')
    expect(highlights.map(item => item.detail).join('\n')).toContain('交稿回执风险已处理')
  })

  test('ignores open repair tasks and non-risk maintenance tasks', () => {
    const highlights = buildRepairClosureHighlights([
      { issue_type: 'reader_pull_missed', task_status: 'needs_review', chapter_no: 9 },
      { task_type: 'repair_materials', task_status: 'resolved', chapter_no: 1 },
    ])

    expect(highlights).toEqual([])
  })
})

describe('buildRepairTaskIssueTagMeta', () => {
  test('normalizes annotation categories for task center issue tags', () => {
    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      annotation_category: 'reader_retention',
    })).toEqual({ label: '追读', color: 'orange' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      annotation_category: 'innovation',
    })).toEqual({ label: '创新/IP', color: 'geekblue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'volume_segment_missed',
      annotation_category: 'reader_retention',
    })).toEqual({ label: '卷级阶段', color: 'gold' })
  })

  test('labels pre-draft execution repair tasks by the missed contract', () => {
    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'intent_confirmation_gap',
    })).toEqual({ label: '意图确认', color: 'blue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'benchmark_recall_gap',
    })).toEqual({ label: '文风召回', color: 'purple' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      annotation_category: 'pre_draft_execution',
    })).toEqual({ label: '意图确认', color: 'blue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'source_readiness_gap',
    })).toEqual({ label: '来源就绪', color: 'cyan' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      annotation_category: 'source_readiness',
    })).toEqual({ label: '来源就绪', color: 'cyan' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'state_tracking_gap',
    })).toEqual({ label: '状态跟踪', color: 'blue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      annotation_category: 'state_tracking',
    })).toEqual({ label: '状态跟踪', color: 'blue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'style_boundary_gap',
    })).toEqual({ label: '风格边界', color: 'purple' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'story_drive_gap',
    })).toEqual({ label: '故事驱动力', color: 'blue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'character_arc_gap',
    })).toEqual({ label: '人物弧光', color: 'pink' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'runway_gap',
    })).toEqual({ label: '连载航线', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'quality_audit_gap',
    })).toEqual({ label: '质量诊断', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'beat_cooling_gap',
    })).toEqual({ label: '冷却节奏', color: 'cyan' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'reader_expectation_debt',
    })).toEqual({ label: '读者期待', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'reader_payoff_debt',
    })).toEqual({ label: '读者回报', color: 'orange' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      annotation_category: 'information_flow',
    })).toEqual({ label: '信息流', color: 'geekblue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'expectation_threshold_gap',
    })).toEqual({ label: '期待阈值', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      annotation_category: 'story_loop',
    })).toEqual({ label: '故事闭环', color: 'cyan' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'emotional_arc_gap',
    })).toEqual({ label: '情绪弧', color: 'magenta' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'chapter_hook_gap',
    })).toEqual({ label: '章级钩子', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'paragraph_hook_gap',
    })).toEqual({ label: '段落级钩子', color: 'lime' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'suspense_gap',
    })).toEqual({ label: '悬念编排', color: 'volcano' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'asset_linkage_gap',
    })).toEqual({ label: '资产挂钩', color: 'cyan' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'dialogue_gap',
    })).toEqual({ label: '对白质量', color: 'blue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'scene_card_receipts_gap',
    })).toEqual({ label: '场景回执', color: 'volcano' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'delivery_risk_receipts_gap',
    })).toEqual({ label: '交稿回执', color: 'volcano' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'revision_context_receipts_gap',
    })).toEqual({ label: '修订上下文', color: 'geekblue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'plot_dynamics_gap',
    })).toEqual({ label: '剧情动力', color: 'geekblue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'character_relation_gap',
    })).toEqual({ label: '角色关系', color: 'purple' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'character_behavior_gap',
    })).toEqual({ label: '角色行为', color: 'magenta' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'conflict_structure_gap',
    })).toEqual({ label: '冲突结构', color: 'red' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'opening_gap',
    })).toEqual({ label: '开篇设计', color: 'orange' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'bridge_unit_gap',
    })).toEqual({ label: '桥段节奏', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'reversal_gap',
    })).toEqual({ label: '反转设计', color: 'volcano' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'showdown_gap',
    })).toEqual({ label: '高潮对抗', color: 'red' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'prose_craft_gap',
    })).toEqual({ label: '正文工艺', color: 'purple' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'chapter_handoff_gap',
    })).toEqual({ label: '章首承接', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'payoff_setup_gap',
    })).toEqual({ label: '爽点铺垫', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'spectator_reaction_gap',
    })).toEqual({ label: '围观反应', color: 'magenta' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'punctuation_tone_gap',
    })).toEqual({ label: '语气标点', color: 'geekblue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'content_rubric_gap',
    })).toEqual({ label: '内容基准', color: 'orange' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'reader_retention_gap',
    })).toEqual({ label: '追读雷达', color: 'orange' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'target_reader_gap',
    })).toEqual({ label: '目标读者', color: 'magenta' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'genre_positioning_gap',
    })).toEqual({ label: '题材定位', color: 'purple' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'female_audience_gap',
    })).toEqual({ label: '女频长篇', color: 'magenta' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'upgrade_rhythm_gap',
    })).toEqual({ label: '升级节奏', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'chapter_structure_gap',
    })).toEqual({ label: '章节结构', color: 'blue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'chapter_progression_gap',
    })).toEqual({ label: '章节推进', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'information_load_gap',
    })).toEqual({ label: '信息负载', color: 'cyan' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'longform_continuity_gap',
    })).toEqual({ label: '长篇连续性', color: 'blue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'core_contract_gap',
    })).toEqual({ label: '核心契约', color: 'red' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'continuity_heat_gap',
    })).toEqual({ label: '连续性热度', color: 'orange' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'revision_receipt_gap',
    })).toEqual({ label: '修订回执', color: 'purple' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'deslop_repair_gap',
    })).toEqual({ label: '去AI味修复', color: 'red' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'prose_meta_gap',
    })).toEqual({ label: '正文元叙事', color: 'red' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'serial_risk_repair_gap',
    })).toEqual({ label: '连续风险修复', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'chapter_hook_quality_gap',
    })).toEqual({ label: '章钩质量', color: 'orange' })
  })

  test('labels oh-story revision closure sync tasks from annotation category fallback', () => {
    expect(buildRepairTaskIssueTagMeta({
      source: 'review_annotation_risk',
      annotation_category: 'prose_revision_receipt',
    })).toEqual({ label: '修订回执', color: 'geekblue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'review_annotation_risk',
      annotation_category: 'deslop_repair_receipt_sync',
    })).toEqual({ label: '去AI味回执', color: 'cyan' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'review_annotation_risk',
      annotation_category: 'revision_cascade_impact_sync',
    })).toEqual({ label: '级联修订', color: 'geekblue' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'review_annotation_risk',
      annotation_category: 'revision_scope_guard_sync',
    })).toEqual({ label: '修订幅度', color: 'orange' })
  })

  test('labels missing next-chapter quality plans as quality continuity work', () => {
    expect(buildRepairTaskIssueTagMeta({
      source: 'review_annotation_risk',
      issue_type: 'next_chapter_quality_plan',
      message: '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan。',
    })).toEqual({ label: '质量续航', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'review_annotation_risk',
      annotation_category: 'approval_blocker',
      detail: '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan。',
    })).toEqual({ label: '质量续航', color: 'gold' })

    expect(buildRepairTaskIssueTagMeta({
      source: 'review_annotation_risk',
      issue_type: 'next_chapter_quality_plan_receipts_gap',
      detail: '质量续航回执缺失：必须输出 next_chapter_quality_plan_receipts。',
    })).toEqual({ label: '质量续航', color: 'gold' })
  })
})

describe('buildNextChapterQualityPlanPreview', () => {
  test('extracts nested next-chapter quality plans for task detail previews', () => {
    const preview = buildNextChapterQualityPlanPreview({
      source: 'review_annotation_risk',
      issue_type: 'next_chapter_quality_plan',
      payload: {
        oh_story_delivery_receipts: {
          next_chapter_quality_plan: {
            quality_focus: ['守住上章公审后的压迫余波'],
            opening_actions: ['前300字先让证据反噬到家族长辈'],
            middle_actions: ['中段必须让女主主动选择公开下一份证据'],
            ending_actions: ['章末留下新证人倒戈钩子'],
            avoid_repetition: ['不要再用“这只是开始”收尾'],
            evidence_basis: ['第12章结尾证据链已公开但代价未落地'],
          },
        },
      },
    })

    expect(preview).toMatchObject({
      visible: true,
      label: '质量续航计划',
      qualityFocus: ['守住上章公审后的压迫余波'],
      openingActions: ['前300字先让证据反噬到家族长辈'],
      middleActions: ['中段必须让女主主动选择公开下一份证据'],
      endingActions: ['章末留下新证人倒戈钩子'],
      avoidRepetition: ['不要再用“这只是开始”收尾'],
      evidenceBasis: ['第12章结尾证据链已公开但代价未落地'],
    })
  })

  test('keeps the missing quality plan reason visible when no plan exists yet', () => {
    const preview = buildNextChapterQualityPlanPreview({
      source: 'review_annotation_risk',
      annotation_category: 'approval_blocker',
      detail: '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan。',
    })

    expect(preview).toMatchObject({
      visible: true,
      label: '质量续航计划',
      missingReason: '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan。',
    })
    expect(preview?.qualityFocus).toEqual([])
  })

  test('keeps the missing quality receipt reason visible when no receipt exists yet', () => {
    const preview = buildNextChapterQualityPlanPreview({
      source: 'review_annotation_risk',
      issue_type: 'next_chapter_quality_plan_receipts_gap',
      detail: '质量续航回执缺失：必须输出 next_chapter_quality_plan_receipts。',
    })

    expect(preview).toMatchObject({
      visible: true,
      label: '质量续航计划',
      missingReason: '质量续航回执缺失：必须输出 next_chapter_quality_plan_receipts。',
    })
    expect(preview?.qualityFocus).toEqual([])
  })
})

describe('buildRecoveryEvidenceAuditView', () => {
  test('maps recovery evidence closure into task center audit rows', () => {
    const view = buildRecoveryEvidenceAuditView({
      status: 'closed',
      governance_recheck_memory: {
        source_run_id: 44,
        status: 'closed',
        label: '治理复查已记录',
        summary: '恢复依据闭环 1/1，批次验收结果已写入次日生产记忆。',
        evidence: ['批次验收确认对白交锋已继承'],
        watch_items: ['下一批继续观察样章策略命中率'],
      },
      recovery_evidence_closure: {
        status: 'closed',
        total: 3,
        resolved: 3,
        single_chapter_count: 1,
        batch_count: 2,
        sources: ['single_chapter_governance_recheck', 'safe_batch_recovery_recheck'],
        failed_evidence: ['样章任务书复检通过 1 项'],
        repaired_evidence: ['第42章对白交锋已补回样章节奏'],
        watch_items: ['下一批继续观察样章策略命中率'],
        tasks: [
          {
            chapter_id: 420,
            chapter_no: 42,
            task_index: 0,
            task_status: 'resolved',
            source: 'single_chapter_governance_recheck',
            source_label: '单章治理复查',
            title: '第42章恢复依据失效回修',
            summary: '恢复依据复检通过。',
          },
          {
            chapter_id: 421,
            chapter_no: 43,
            task_index: 1,
            task_status: 'resolved',
            source: 'safe_batch_recovery_recheck',
            source_label: '批次恢复复查',
            title: '第43章批次恢复依据回修',
            summary: '批次恢复复查通过。',
          },
        ],
      },
    })

    expect(view).toEqual(expect.objectContaining({
      status: 'closed',
      label: '恢复依据审计',
      total: 3,
      resolved: 3,
      sourceSummary: '单章治理复查 1；批次恢复复查 2',
      sourceRunId: 44,
      memoryLabel: '治理复查已记录',
      memorySummary: '恢复依据闭环 1/1，批次验收结果已写入次日生产记忆。',
      failedEvidence: ['样章任务书复检通过 1 项'],
      repairedEvidence: ['批次验收确认对白交锋已继承', '第42章对白交锋已补回样章节奏'],
      watchItems: ['下一批继续观察样章策略命中率'],
    }))
    expect(view?.sourceGroups).toEqual([
      expect.objectContaining({
        source: 'single_chapter_governance_recheck',
        label: '单章治理复查',
        count: 1,
        taskIndexes: [0],
        chapterNos: [42],
        recheckAction: 'single_chapter_governance_recheck',
        recheckLabel: '复检单章',
      }),
      expect.objectContaining({
        source: 'safe_batch_recovery_recheck',
        label: '批次恢复复查',
        count: 1,
        taskIndexes: [1],
        chapterNos: [43],
        recheckAction: 'safe_batch_recovery_recheck',
        recheckLabel: '复盘批次',
      }),
    ])
    expect(view?.relatedTasks).toEqual([
      expect.objectContaining({
        chapterId: 420,
        chapterNo: 42,
        taskIndex: 0,
        status: 'resolved',
        source: 'single_chapter_governance_recheck',
        sourceLabel: '单章治理复查',
        title: '第42章恢复依据失效回修',
      }),
      expect.objectContaining({
        chapterId: 421,
        chapterNo: 43,
        taskIndex: 1,
        status: 'resolved',
        source: 'safe_batch_recovery_recheck',
        sourceLabel: '批次恢复复查',
        title: '第43章批次恢复依据回修',
      }),
    ])
  })

  test('merges latest task recheck results into source groups', () => {
    const audit = {
      recovery_evidence_closure: {
        status: 'needs_followup',
        total: 2,
        resolved: 0,
        tasks: [
          {
            chapter_id: 420,
            chapter_no: 42,
            task_index: 0,
            task_status: 'needs_review',
            source: 'single_chapter_governance_recheck',
            source_label: '单章治理复查',
            title: '第42章恢复依据失效回修',
            recovery_evidence_review: {
              status: 'warn',
              summary: '单章仍缺少样章对白执行。',
              failed_evidence: ['样章对白执行仍未落地'],
            },
          },
          {
            chapter_id: 421,
            chapter_no: 43,
            task_index: 1,
            task_status: 'needs_review',
            source: 'safe_batch_recovery_recheck',
            source_label: '批次恢复复查',
            title: '第43章批次恢复依据回修',
            recovery_evidence_review: {
              status: 'warn',
              summary: '批次复盘仍有恢复依据未落地。',
              failed_evidence: ['第43章读者回报仍未继承'],
            },
          },
        ],
      },
    }
    const latestTasks = [
      {
        chapter_id: 420,
        chapter_no: 42,
        task_status: 'resolved',
        source: 'review_annotation_risk',
        issue_type: 'recovery_evidence_mismatch',
        annotation_source: 'governance_recheck_sync',
        annotation_category: 'recovery_evidence',
        status_note: '单章治理复查通过，governance_recheck_sync failed_evidence 已清空。',
        recovery_evidence_review: {
          status: 'ok',
          summary: '单章治理复查通过，证据已写入正文。',
          failed_evidence: [],
          repaired_evidence: ['第42章对白交锋已补回样章节奏'],
        },
      },
      {
        chapter_id: 421,
        chapter_no: 43,
        task_status: 'needs_review',
        source: 'auto_creation_safe_batch_risk',
        issue_type: 'recovery_evidence_mismatch',
        segment: '第43-45章',
        recovery_evidence_review: {
          status: 'warn',
          summary: '批次复盘仍有恢复依据未落地。',
          failed_evidence: ['第43章读者回报仍未继承'],
        },
      },
    ]

    const view = buildRecoveryEvidenceAuditView(audit, latestTasks)
    const singleGroup = view?.sourceGroups.find(group => group.source === 'single_chapter_governance_recheck')
    const batchGroup = view?.sourceGroups.find(group => group.source === 'safe_batch_recovery_recheck')

    expect(singleGroup).toEqual(expect.objectContaining({
      resultStatus: 'closed',
      resultLabel: '已闭环',
      latestSummary: '单章治理复查通过，证据已写入正文。',
      residualEvidence: [],
      productionBlockStatus: 'cleared',
      productionBlockLabel: '生产阻断已解除',
      productionBlockDetail: '该来源已复检闭环，可作为恢复安全连写依据。',
    }))
    expect(batchGroup).toEqual(expect.objectContaining({
      resultStatus: 'needs_followup',
      resultLabel: '仍需复查',
      latestSummary: '批次复盘仍有恢复依据未落地。',
      residualEvidence: ['第43章读者回报仍未继承'],
      productionBlockStatus: 'blocked',
      productionBlockLabel: '暂缓安全连写',
      productionBlockDetail: '残留依据未闭环，先定位批次任务并完成批次回修，再复盘后继续安全连写。',
    }))
  })

  test('marks pending source rechecks as waiting before safe batching resumes', () => {
    const view = buildRecoveryEvidenceAuditView({
      recovery_evidence_closure: {
        status: 'needs_followup',
        total: 1,
        resolved: 0,
        tasks: [
          {
            chapter_id: 420,
            chapter_no: 42,
            task_index: 0,
            task_status: 'open',
            source: 'single_chapter_governance_recheck',
            source_label: '单章治理复查',
          },
        ],
      },
    })

    expect(view?.sourceGroups[0]).toEqual(expect.objectContaining({
      resultStatus: 'pending',
      productionBlockStatus: 'pending',
      productionBlockLabel: '等待复检结论',
      productionBlockDetail: '先完成来源复检，再决定是否恢复安全连写。',
    }))
  })

  test('exposes the next residual action for each source group', () => {
    const view = buildRecoveryEvidenceAuditView({
      recovery_evidence_closure: {
        status: 'needs_followup',
        total: 2,
        resolved: 0,
        tasks: [
          {
            chapter_id: 420,
            chapter_no: 42,
            task_index: 0,
            task_status: 'needs_review',
            source: 'single_chapter_governance_recheck',
            source_label: '单章治理复查',
            recovery_evidence_review: {
              status: 'warn',
              failed_evidence: ['样章对白执行仍未落地'],
            },
          },
          {
            chapter_id: 421,
            chapter_no: 43,
            task_index: 1,
            task_status: 'needs_review',
            source: 'safe_batch_recovery_recheck',
            source_label: '批次恢复复查',
            recovery_evidence_review: {
              status: 'warn',
              failed_evidence: ['第43章读者回报仍未继承'],
            },
          },
        ],
      },
    })

    expect(view?.sourceGroups.find(group => group.source === 'single_chapter_governance_recheck')).toEqual(expect.objectContaining({
      residualAction: 'revision',
      residualActionLabel: '回修依据',
    }))
    expect(view?.sourceGroups.find(group => group.source === 'safe_batch_recovery_recheck')).toEqual(expect.objectContaining({
      residualAction: 'focus_task',
      residualActionLabel: '定位批次任务',
    }))
  })

  test('exposes a single main action for unresolved recovery evidence sources', () => {
    const view = buildRecoveryEvidenceAuditView({
      recovery_evidence_closure: {
        status: 'needs_followup',
        total: 2,
        resolved: 0,
        tasks: [
          {
            chapter_id: 420,
            chapter_no: 42,
            task_index: 0,
            task_status: 'open',
            source: 'single_chapter_governance_recheck',
            source_label: '单章治理复查',
          },
          {
            chapter_id: 421,
            chapter_no: 43,
            task_index: 1,
            task_status: 'needs_review',
            source: 'safe_batch_recovery_recheck',
            source_label: '批次恢复复查',
            recovery_evidence_review: {
              status: 'warn',
              failed_evidence: ['第43章读者回报仍未继承'],
            },
          },
        ],
      },
    })

    expect(view?.nextAction).toEqual(expect.objectContaining({
      action: 'focus_task',
      label: '定位批次任务',
      source: 'safe_batch_recovery_recheck',
      sourceLabel: '批次恢复复查',
      taskIndex: 1,
      residualEvidence: ['第43章读者回报仍未继承'],
    }))
  })

  test('uses single-chapter recheck as the main action when the source is waiting for a conclusion', () => {
    const view = buildRecoveryEvidenceAuditView({
      recovery_evidence_closure: {
        status: 'needs_followup',
        total: 1,
        resolved: 0,
        tasks: [
          {
            chapter_id: 420,
            chapter_no: 42,
            task_index: 0,
            task_status: 'open',
            source: 'single_chapter_governance_recheck',
            source_label: '单章治理复查',
          },
        ],
      },
    })

    expect(view?.nextAction).toEqual(expect.objectContaining({
      action: 'recheck_single_chapter',
      label: '复检单章',
      source: 'single_chapter_governance_recheck',
      taskIndex: 0,
    }))
  })

  test('hides recovery evidence audit when there is no closure payload', () => {
    expect(buildRecoveryEvidenceAuditView({ status: 'closed' })).toBeNull()
  })
})

describe('recoveryEvidenceSourceRecheckAction', () => {
  test('routes source groups to the natural recheck action', () => {
    expect(recoveryEvidenceSourceRecheckAction('single_chapter_governance_recheck')).toEqual({
      action: 'single_chapter_governance_recheck',
      label: '复检单章',
    })
    expect(recoveryEvidenceSourceRecheckAction('safe_batch_recovery_recheck')).toEqual({
      action: 'safe_batch_recovery_recheck',
      label: '复盘批次',
    })
    expect(recoveryEvidenceSourceRecheckAction('recovery_evidence_recheck')).toEqual({
      action: '',
      label: '',
    })
  })
})

describe('buildRecoveryEvidenceReviewRows', () => {
  test('keeps source details and source actions visible for failed recovery evidence', () => {
    const rows = buildRecoveryEvidenceReviewRows({
      issue_type: 'recovery_evidence_mismatch',
      recovery_evidence_review: {
        status: 'warn',
        failed_items: [
          {
            evidence: '单章治理复查：生产阻断已解除',
            source: 'recovery_evidence_production_gate',
            source_label: '入口生产闸门',
            source_detail: '单章治理复查 · 生产阻断已解除',
            source_action_label: '复检单章',
            risk_labels: ['恢复依据来源继承风险 2 项'],
          },
          {
            evidence: '第42章对白交锋已补回样章节奏',
            source: 'governance_recheck_memory',
            source_label: '治理复查记忆',
            source_detail: '治理复查记忆 · 修后证据',
            source_action_label: '治理复查台',
            risk_labels: ['风格样章缺口 1 项'],
          },
        ],
      },
    })

    expect(rows).toEqual([
      expect.objectContaining({
        evidence: '单章治理复查：生产阻断已解除',
        source: 'recovery_evidence_production_gate',
        sourceLabel: '入口生产闸门',
        sourceDetail: '单章治理复查 · 生产阻断已解除',
        sourceActionLabel: '复检单章',
        riskLabels: ['恢复依据来源继承风险 2 项'],
      }),
      expect.objectContaining({
        evidence: '第42章对白交锋已补回样章节奏',
        source: 'governance_recheck_memory',
        sourceLabel: '治理复查记忆',
        sourceDetail: '治理复查记忆 · 修后证据',
        sourceActionLabel: '治理复查台',
        riskLabels: ['风格样章缺口 1 项'],
      }),
    ])
  })
})

describe('buildRecoveryEvidenceRegovernanceSummary', () => {
  test('summarizes release summary regovernance queue drafts on recovery evidence tasks', () => {
    expect(buildRecoveryEvidenceRegovernanceSummary({
      issue_type: 'recovery_evidence_mismatch',
      recovery_evidence_regovernance_queue: {
        label: '安全连写放行摘要再治理',
        summary: '第41-43章 放行摘要验收未通过，需回到恢复依据治理队列重新闭环。',
        task_count: 3,
        tasks: [
          { action_label: '治理复查台' },
          { action_label: '复检单章' },
          { action_label: '复盘批次' },
        ],
      },
    })).toEqual({
      label: '安全连写放行摘要再治理',
      summary: '第41-43章 放行摘要验收未通过，需回到恢复依据治理队列重新闭环。',
      taskCount: 3,
      actionLabel: '生成再治理队列',
      actionLabels: ['治理复查台', '复检单章', '复盘批次'],
    })

    expect(buildRecoveryEvidenceRegovernanceSummary({
      issue_type: 'core_drift',
    })).toBeNull()
  })
})

describe('buildRecoveryEvidenceSourceRiskProfileSnapshot', () => {
  test('summarizes safe-batch preflight recovery evidence source trend for task details', () => {
    const snapshot = buildRecoveryEvidenceSourceRiskProfileSnapshot({
      recovery_evidence_source_risk_profile: {
        status: 'warn',
        total_failure_count: 3,
        repeat_source_count: 1,
        sources: [
          {
            source: 'single_chapter_governance_recheck',
            label: '单章治理复查',
            release_failure_count: 2,
            evidence: ['单章治理复查：生产阻断已解除'],
            deep_repair_effect: {
              status: 'observing',
              label: '深修后暂无再失效',
              summary: '单章治理复查最近一次深修后暂无新的放行后失效，继续观察下一批正文继承。',
              latest_repair_action_label: '深修单章任务书',
              post_repair_failure_count: 0,
              strengthened_repair_closure: {
                status: 'converged',
                label: '强化深修已收敛',
                summary: '单章治理复查强化深修后暂无新的同源放行后失效，可恢复小批量安全连写。',
              },
            },
          },
          {
            source: 'safe_batch_recovery_recheck',
            label: '批次恢复复查',
            release_failure_count: 1,
            evidence: ['批次恢复复查：生产阻断已解除'],
          },
        ],
      },
    })
    const singleDeepRepairDirection = snapshot?.sources[0]?.deepRepairDirection || ''
    const batchDeepRepairDirection = snapshot?.sources[1]?.deepRepairDirection || ''

    expect(snapshot).toMatchObject({
      visible: true,
      status: 'warn',
      label: '恢复依据画像趋势',
      summary: '单章治理复查近2轮放行后失效，任务中心应先处理深层创作修复，再恢复多章安全连写。',
      sources: [
        expect.objectContaining({
          source: 'single_chapter_governance_recheck',
          label: '单章治理复查',
          releaseFailureCount: 2,
          trendLabel: '近2轮失败',
          deepRepairEffect: expect.objectContaining({
            status: 'observing',
            label: '深修后暂无再失效',
            latestRepairActionLabel: '深修单章任务书',
            postRepairFailureCount: 0,
            strengthenedClosure: expect.objectContaining({
              status: 'converged',
              label: '强化深修已收敛',
            }),
          }),
        }),
        expect.objectContaining({
          source: 'safe_batch_recovery_recheck',
          label: '批次恢复复查',
          releaseFailureCount: 1,
          trendLabel: '近1轮失败',
        }),
      ],
    })
    expect(singleDeepRepairDirection.includes('回到单章任务书')).toBe(true)
    expect(batchDeepRepairDirection.includes('批次任务书')).toBe(true)
  })

  test('keeps strengthened recovery acceptance trend in batch task details', () => {
    const snapshot = buildRecoveryEvidenceSourceRiskProfileSnapshot({
      recovery_evidence_source_risk_profile: {
        status: 'ok',
        total_failure_count: 2,
        repeat_source_count: 1,
        sources: [
          {
            source: 'single_chapter_governance_recheck',
            label: '单章治理复查',
            release_failure_count: 2,
          },
        ],
      },
      strengthened_repair_acceptance_trend: {
        visible: true,
        status: 'warn',
        label: '强化恢复验收趋势',
        summary: '强化恢复验收最近 1 批未通过：核心守恒风险 1 项、读者拉力风险 2 项；本轮回到单章治理。',
        accepted_batch_count: 2,
        failed_batch_count: 1,
        pass_streak: 0,
        latest_status: 'warn',
        latest_batch_label: '第41-43章',
        latest_run_id: 9001,
        source_evidence: ['单章治理复查：强化深修已收敛'],
        dimensions: {
          core: { label: '核心守恒', failed_count: 1 },
          payoff: { label: '读者回报', failed_count: 0 },
          reader_pull: { label: '读者拉力', failed_count: 2 },
        },
      },
    })

    expect(snapshot?.strengthenedAcceptanceTrend).toMatchObject({
      visible: true,
      status: 'warn',
      label: '强化恢复验收趋势',
      acceptedBatchCount: 2,
      failedBatchCount: 1,
      passStreak: 0,
      latestStatus: 'warn',
      latestBatchLabel: '第41-43章',
      latestRunId: 9001,
      sourceEvidence: ['单章治理复查：强化深修已收敛'],
      dimensions: {
        core: { label: '核心守恒', failedCount: 1 },
        payoff: { label: '读者回报', failedCount: 0 },
        readerPull: { label: '读者拉力', failedCount: 2 },
      },
    })
  })
})

describe('buildSafeBatchExpansionPolicySnapshot', () => {
  test('summarizes explicit expansion policy from safe-batch preflight', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'expanded',
        label: '强化扩批规则',
        summary: '强化恢复验收连续 3/3 批通过，本轮可从 3 章扩到 5 章安全连写。',
        target_chapter_count: 5,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
      },
    })

    expect(snapshot).toEqual({
      visible: true,
      status: 'expanded',
      label: '强化扩批规则',
      summary: '强化恢复验收连续 3/3 批通过，本轮可从 3 章扩到 5 章安全连写。',
      targetChapterCount: 5,
      baseChapterCount: 3,
      expandedChapterCount: 5,
      requiredPassStreak: 3,
      passStreak: 3,
      acceptedBatchCount: 3,
      failedBatchCount: 0,
      latestStatus: 'ok',
      expansionFeedback: null,
      recoveryRoadmap: null,
      recoveryValidation: null,
      recoveryRestoreStabilityLane: null,
    })
  })

  test('summarizes expansion feedback from safe-batch preflight', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '最近一次5章扩批存在扩批分段热区，下一轮保持 3 章以内安全连写。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'rollback_to_small_batch',
          label: '扩批热区反馈',
          summary: '中段第10、11章出现扩批热区，下一轮回退到 2-3 章安全连写。',
          target_chapter_count: 3,
          latest_chapter_nos: [8, 9, 10, 11, 12],
          risk_count: 3,
        },
      },
    })

    expect(snapshot).toMatchObject({
      status: 'recovering',
      targetChapterCount: 3,
      expansionFeedback: {
        status: 'rollback_to_small_batch',
        label: '扩批热区待修',
        summary: '中段第10、11章出现扩批热区，下一轮回退到 2-3 章安全连写。',
        targetChapterCount: 3,
        latestChapterNos: [8, 9, 10, 11, 12],
        riskCount: 3,
      },
    })
  })

  test('summarizes expansion stability and repeated hotspot segment from preflight', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '中段连续 2 次扩批热区，先做中段固定段落治理和批次结构改写。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'rollback_to_small_batch',
          label: '扩批热区反馈',
          summary: '中段连续 2 次扩批热区，先做中段固定段落治理和批次结构改写。',
          target_chapter_count: 3,
          latest_chapter_nos: [13, 14, 15, 16, 17],
          risk_count: 3,
          stable_pass_streak: 0,
          recent_expanded_batch_count: 2,
          repeated_hotspot_segment: {
            key: 'middle',
            label: '中段',
            count: 2,
            summary: '中段连续 2 次扩批热区，先做中段固定段落治理和批次结构改写。',
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback).toMatchObject({
      status: 'rollback_to_small_batch',
      stablePassStreak: 0,
      recentExpandedBatchCount: 2,
      repeatedHotspotSegment: {
        key: 'middle',
        label: '中段',
        count: 2,
      },
    })
  })

  test('keeps recovery restore stability evidence in expansion feedback snapshot', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'expanded',
        label: '强化扩批规则',
        summary: '恢复5章扩批稳定观察通过，长期扩批稳定证据已沉淀。',
        target_chapter_count: 5,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 1,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'passed',
          label: '扩批热区反馈',
          summary: '恢复5章扩批稳定观察通过：第50、51、52章验证批之后，第53、54、55、56、57章继续保持稳定。',
          target_chapter_count: 5,
          latest_chapter_nos: [53, 54, 55, 56, 57],
          risk_count: 0,
          stable_pass_streak: 1,
          recent_expanded_batch_count: 1,
          recovery_restore_stability_evidence: {
            status: 'passed',
            source: 'safe_batch_recovery_restore_five_batch',
            restored_batch_created_at: '2026-06-15T00:00:00.000Z',
            restore_chapter_nos: [53, 54, 55, 56, 57],
            validation_chapter_nos: [50, 51, 52],
            stable_pass_streak: 1,
            summary: '恢复5章扩批稳定观察通过：第50、51、52章验证批之后，第53、54、55、56、57章继续保持核心守恒、显性回报和章末追读稳定。',
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback?.recoveryRestoreStabilityEvidence).toMatchObject({
      status: 'passed',
      source: 'safe_batch_recovery_restore_five_batch',
      restoredBatchCreatedAt: '2026-06-15T00:00:00.000Z',
      restoreChapterNos: [53, 54, 55, 56, 57],
      validationChapterNos: [50, 51, 52],
      stablePassStreak: 1,
    })
    expect(snapshot?.expansionFeedback?.recoveryRestoreStabilityEvidence?.summary).toContain('恢复5章扩批稳定观察通过')
  })

  test('keeps recovery restore stability lane for task-center batch review filtering', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_recovery_restore_stability_lane: {
        visible: true,
        status: 'observing',
        label: '5章观察批',
        source: 'recovery_restore_stability_evidence',
        stable_pass_streak: 1,
        required_stable_pass_streak: 2,
        default_five_chapter_ready: false,
        restore_chapter_nos: [53, 54, 55, 56, 57],
        validation_chapter_nos: [50, 51, 52],
        summary: '恢复5章扩批已稳定 1/2 批，继续观察。',
      },
      safe_batch_expansion_policy: {
        status: 'expanded',
        label: '强化扩批规则',
        summary: '恢复5章扩批已进入观察批。',
        target_chapter_count: 5,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 1,
        latest_status: 'ok',
      },
    })

    expect(snapshot?.recoveryRestoreStabilityLane).toMatchObject({
      visible: true,
      status: 'observing',
      label: '5章观察批',
      source: 'recovery_restore_stability_evidence',
      stablePassStreak: 1,
      requiredStablePassStreak: 2,
      defaultFiveChapterReady: false,
      restoreChapterNos: [53, 54, 55, 56, 57],
      validationChapterNos: [50, 51, 52],
      taskCenterFilterLabel: '批次复盘筛选：5章观察批',
    })
    expect(snapshot?.recoveryRestoreStabilityLane?.summary).toContain('继续观察')
  })

  test('keeps default five-chapter regression evidence for task-center rollback review', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '默认5章档位复发，回到3章验证批。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 1,
        latest_status: 'warn',
        expansion_feedback: {
          status: 'rollback_to_small_batch',
          label: '扩批热区反馈',
          summary: '默认5章档位回退原因：第63、64、65、66、67章默认档位在中段复发。',
          target_chapter_count: 3,
          latest_chapter_nos: [63, 64, 65, 66, 67],
          risk_count: 3,
          default_five_chapter_regression: {
            visible: true,
            status: 'regressed',
            label: '默认5章档位回退原因',
            source: 'default_five_chapter_lane',
            stable_pass_streak: 2,
            required_stable_pass_streak: 2,
            default_batch_chapter_nos: [63, 64, 65, 66, 67],
            restore_chapter_nos: [58, 59, 60, 61, 62],
            validation_chapter_nos: [50, 51, 52],
            repeated_hotspot_segment: { key: 'middle', label: '中段', risk_count: 3 },
            failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
            template_version_id: 'safe_batch_expansion_structure_repair:668',
            template_version: {
              id: 'safe_batch_expansion_structure_repair:668',
              label: '默认5章档位模板重构',
              status: 'relapsed',
              pass_streak: 2,
              required_pass_streak: 2,
            },
            template_version_failed_requirements: [
              { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移' },
              { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账' },
              { key: 'default_lane_ending_hook_template', label: '章末追读模板', failure_reason: '追读拉力' },
            ],
            summary: '默认5章档位回退原因：连续 2 批恢复稳定后，第63、64、65、66、67章默认档位在中段复发。',
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback?.defaultFiveChapterRegression).toMatchObject({
      visible: true,
      status: 'regressed',
      label: '默认5章档位回退原因',
      stablePassStreak: 2,
      requiredStablePassStreak: 2,
      defaultBatchChapterNos: [63, 64, 65, 66, 67],
      restoreChapterNos: [58, 59, 60, 61, 62],
      validationChapterNos: [50, 51, 52],
      repeatedHotspotSegment: {
        key: 'middle',
        label: '中段',
      },
      failureReasons: ['核心偏移', '回报欠账', '追读拉力'],
      templateVersionId: 'safe_batch_expansion_structure_repair:668',
      templateVersion: {
        id: 'safe_batch_expansion_structure_repair:668',
        status: 'relapsed',
        passStreak: 2,
        requiredPassStreak: 2,
      },
      templateVersionFailedRequirements: [
        { key: 'default_lane_segment_duty', label: '默认档位段位职责', failureReason: '核心偏移' },
        { key: 'default_lane_payoff_density', label: '回报密度', failureReason: '回报欠账' },
        { key: 'default_lane_ending_hook_template', label: '章末追读模板', failureReason: '追读拉力' },
      ],
    })
    expect(snapshot?.expansionFeedback?.defaultFiveChapterRegression?.summary).toContain('默认5章档位回退原因')
  })

  test('keeps default recovery verdict relapse evidence for task-center rollback review', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '恢复判定失效，回到3章验证批。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 1,
        latest_status: 'warn',
        expansion_feedback: {
          status: 'rollback_to_small_batch',
          label: '扩批热区反馈',
          summary: '恢复判定失效 -> 回到3章验证批：核心偏移、回报欠账、追读拉力在中段复发。',
          target_chapter_count: 3,
          latest_chapter_nos: [76, 77, 78, 79, 80],
          risk_count: 3,
          default_five_chapter_recovery_verdict_relapse: {
            visible: true,
            status: 'relapsed',
            label: '恢复判定失效',
            source: 'default_five_chapter_recovery_verdict',
            summary: '恢复判定失效 -> 回到3章验证批：核心偏移、回报欠账、追读拉力在中段第78、79章复发。',
            default_batch_chapter_nos: [63, 64, 65, 66, 67],
            restore_chapter_nos: [58, 59, 60, 61, 62],
            previous_validation_chapter_nos: [50, 51, 52],
            validation_chapter_nos: [68, 69, 70],
            relapse_batch_chapter_nos: [76, 77, 78, 79, 80],
            relapsed_chapter_nos: [78, 79],
            repeated_hotspot_segment: { key: 'middle', label: '中段', risk_count: 3 },
            failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
            relapsed_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
            stable_failure_reasons: [],
            failure_reason_statuses: [
              { reason: '核心偏移', status: 'relapsed', risk_count: 1 },
              { reason: '回报欠账', status: 'relapsed', risk_count: 1 },
              { reason: '追读拉力', status: 'relapsed', risk_count: 1 },
            ],
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback?.defaultFiveChapterRecoveryVerdictRelapse).toMatchObject({
      visible: true,
      status: 'relapsed',
      label: '恢复判定失效',
      source: 'default_five_chapter_recovery_verdict',
      validationChapterNos: [68, 69, 70],
      relapseBatchChapterNos: [76, 77, 78, 79, 80],
      relapsedChapterNos: [78, 79],
      repeatedHotspotSegment: {
        key: 'middle',
        label: '中段',
        riskCount: 3,
      },
      failureReasons: ['核心偏移', '回报欠账', '追读拉力'],
      relapsedFailureReasons: ['核心偏移', '回报欠账', '追读拉力'],
    })
    expect(snapshot?.expansionFeedback?.defaultFiveChapterRecoveryVerdictRelapse?.summary).toContain('恢复判定失效 -> 回到3章验证批')
  })

  test('keeps expansion structure validation trend in the task-center snapshot', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '扩批结构验证趋势显示中段仍有惯性风险。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'rollback_to_small_batch',
          label: '扩批热区反馈',
          summary: '中段验证通过率 67%，恢复5章后第1个扩批批次复发。',
          target_chapter_count: 3,
          latest_chapter_nos: [59, 60, 61, 62, 63],
          risk_count: 1,
          expansion_structure_validation_trend: {
            visible: true,
            status: 'warn',
            label: '扩批结构验证趋势',
            summary: '中段验证通过率 67%（2/3批），失败主因：核心偏移1、回报欠账1、追读拉力1，恢复5章后第1个扩批批次复发。',
            segment_key: 'middle',
            segment_label: '中段',
            validation_batch_count: 3,
            passed_batch_count: 2,
            failed_batch_count: 1,
            pass_rate: 67,
            latest_status: 'ok',
            latest_chapter_nos: [56, 57, 58],
            failure_reasons: [
              { key: 'core', label: '核心偏移', count: 1 },
              { key: 'payoff', label: '回报欠账', count: 1 },
              { key: 'reader_pull', label: '追读拉力', count: 1 },
            ],
            recurrence_after_restore: {
              visible: true,
              interval_batch_count: 1,
              interval_label: '恢复5章后第1个扩批批次复发',
              recurrence_chapter_nos: [59, 60, 61, 62, 63],
            },
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback?.structureValidationTrend).toMatchObject({
      visible: true,
      status: 'warn',
      label: '扩批结构验证趋势',
      segmentLabel: '中段',
      validationBatchCount: 3,
      passedBatchCount: 2,
      failedBatchCount: 1,
      passRate: 67,
      latestStatus: 'ok',
      latestChapterNos: [56, 57, 58],
      recurrenceAfterRestore: {
        visible: true,
        intervalBatchCount: 1,
        intervalLabel: '恢复5章后第1个扩批批次复发',
      },
    })
    expect(snapshot?.expansionFeedback?.structureValidationTrend?.failureReasons).toEqual([
      { key: 'core', label: '核心偏移', count: 1 },
      { key: 'payoff', label: '回报欠账', count: 1 },
      { key: 'reader_pull', label: '追读拉力', count: 1 },
    ])
  })

  test('keeps expansion structure repair effectiveness in the task-center snapshot', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'expanded',
        label: '强化扩批规则',
        summary: '结构修复有效后恢复5章扩批。',
        target_chapter_count: 5,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'passed',
          label: '扩批热区反馈',
          summary: '结构修复后观察稳定。',
          target_chapter_count: 5,
          latest_chapter_nos: [70, 71, 72, 73, 74],
          risk_count: 0,
          expansion_structure_repair_effectiveness: {
            visible: true,
            status: 'ok',
            label: '结构修复有效性',
            summary: '中段结构修复有效性：通过率 67% -> 100%，失败主因 3 -> 0，修复后暂无同段复发。',
            source_run_id: 625,
            segment_key: 'middle',
            segment_label: '中段',
            baseline_pass_rate: 67,
            current_pass_rate: 100,
            pass_rate_delta: 33,
            baseline_failure_reason_count: 3,
            current_failure_reason_count: 0,
            failure_reason_delta: -3,
            recommendation: 'restore_five_chapter',
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback?.structureRepairEffectiveness).toMatchObject({
      visible: true,
      status: 'ok',
      label: '结构修复有效性',
      sourceRunId: 625,
      segmentLabel: '中段',
      baselinePassRate: 67,
      currentPassRate: 100,
      passRateDelta: 33,
      baselineFailureReasonCount: 3,
      currentFailureReasonCount: 0,
      failureReasonDelta: -3,
      recommendation: 'restore_five_chapter',
    })
  })

  test('keeps default recovery verdict relapse trend in repair effectiveness snapshot', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '连续恢复判定失效，升级默认档位结构重构。',
        target_chapter_count: 1,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 1,
        latest_status: 'warn',
        expansion_feedback: {
          status: 'rollback_to_single_chapter',
          label: '扩批热区反馈',
          summary: '连续 2 次恢复判定失效，默认档位结构重构。',
          target_chapter_count: 1,
          latest_chapter_nos: [84, 85, 86, 87, 88],
          risk_count: 3,
          expansion_structure_repair_effectiveness: {
            visible: true,
            status: 'warn',
            label: '结构修复有效性',
            summary: '中段结构修复有效性：连续 2 次恢复判定失效，默认档位结构重构。',
            source_run_id: 643,
            segment_key: 'middle',
            segment_label: '中段',
            baseline_pass_rate: 100,
            current_pass_rate: 100,
            pass_rate_delta: 0,
            baseline_failure_reason_count: 0,
            current_failure_reason_count: 0,
            failure_reason_delta: 0,
            recommendation: 'escalate_structure_redesign',
            default_five_chapter_recovery_verdict_relapse_trend: {
              visible: true,
              baseline_relapse_count: 1,
              current_relapse_count: 1,
              repeated_relapse_count: 2,
              repeated_failure_reasons: [
                { reason: '核心偏移', count: 2 },
                { reason: '回报欠账', count: 2 },
                { reason: '追读拉力', count: 2 },
              ],
              recommendation: 'escalate_structure_redesign',
              summary: '连续 2 次恢复判定失效：核心偏移、回报欠账、追读拉力同维复发，默认档位结构重构。',
            },
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback?.structureRepairEffectiveness?.defaultFiveChapterRecoveryVerdictRelapseTrend).toMatchObject({
      visible: true,
      baselineRelapseCount: 1,
      currentRelapseCount: 1,
      repeatedRelapseCount: 2,
      repeatedFailureReasons: [
        { reason: '核心偏移', count: 2 },
        { reason: '回报欠账', count: 2 },
        { reason: '追读拉力', count: 2 },
      ],
      recommendation: 'escalate_structure_redesign',
    })
    expect(snapshot?.expansionFeedback?.structureRepairEffectiveness?.defaultFiveChapterRecoveryVerdictRelapseTrend?.summary).toContain('默认档位结构重构')
  })

  test('keeps expansion structure decision execution trend in the task-center snapshot', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '结构决策执行趋势未稳，下一轮保持 3 章以内安全连写。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'passed',
          label: '扩批热区反馈',
          summary: '结构决策执行趋势未稳，先补齐中段职责。',
          target_chapter_count: 3,
          latest_chapter_nos: [70, 71, 72, 73, 74],
          risk_count: 0,
          expansion_structure_decision_trend: {
            visible: true,
            status: 'warn',
            label: '扩批结构决策执行趋势',
            summary: '结构决策执行趋势未稳：恢复5章扩批最近复盘仍有漏项。',
            total_batch_count: 1,
            passed_batch_count: 0,
            failed_batch_count: 1,
            latest_status: 'warn',
            latest_batch_created_at: '2026-06-20T00:00:00.000Z',
            latest_chapter_nos: [70, 71, 72, 73, 74],
            latest_segment_key: 'middle',
            latest_segment_label: '中段',
            top_failed_recommendation: { key: 'restore_five_chapter', label: '恢复5章扩批', count: 1 },
            top_failed_requirement: { key: 'segment_role', label: '中段职责', count: 1 },
            suggested_target_chapter_count: 3,
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback?.structureDecisionTrend).toMatchObject({
      visible: true,
      status: 'warn',
      label: '扩批结构决策执行趋势',
      totalBatchCount: 1,
      failedBatchCount: 1,
      latestStatus: 'warn',
      latestSegmentLabel: '中段',
      topFailedRecommendation: { key: 'restore_five_chapter', label: '恢复5章扩批', count: 1 },
      topFailedRequirement: { key: 'segment_role', label: '中段职责', count: 1 },
      suggestedTargetChapterCount: 3,
    })
  })

  test('keeps default lane redesign missing template items in the batch summary snapshot', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '默认档位结构重构未落地，下一轮保持单章治理。',
        target_chapter_count: 1,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 1,
        latest_status: 'warn',
        expansion_feedback: {
          status: 'rollback_to_single_chapter',
          label: '扩批热区反馈',
          summary: '默认档位结构重构漏项，需要补齐四项模板。',
          target_chapter_count: 1,
          latest_chapter_nos: [89],
          risk_count: 4,
          expansion_structure_decision_trend: {
            visible: true,
            status: 'warn',
            label: '扩批结构决策执行趋势',
            summary: '默认5章档位模板未落地：段位职责、冲突轮换、回报密度、章末追读模板缺失。',
            total_batch_count: 1,
            passed_batch_count: 0,
            failed_batch_count: 1,
            latest_status: 'warn',
            latest_batch_created_at: '2026-06-24T00:00:00.000Z',
            latest_chapter_nos: [89],
            latest_segment_key: 'middle',
            latest_segment_label: '中段',
            top_failed_recommendation: { key: 'escalate_structure_redesign', label: '单章结构重构', count: 1 },
            top_failed_requirement: { key: 'default_lane_segment_duty', label: '默认档位段位职责', count: 1 },
            failed_requirements: [
              { key: 'default_lane_segment_duty', label: '默认档位段位职责', count: 1 },
              { key: 'default_lane_conflict_rotation', label: '冲突轮换', count: 1 },
              { key: 'default_lane_payoff_density', label: '回报密度', count: 1 },
              { key: 'default_lane_ending_hook_template', label: '章末追读模板', count: 1 },
            ],
            suggested_target_chapter_count: 1,
            default_five_chapter_lane_redesign: {
              reason: 'repeated_recovery_verdict_relapse',
              relapse_count: 2,
              repeated_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
            },
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback?.structureDecisionTrend).toMatchObject({
      suggestedTargetChapterCount: 1,
      failedRequirements: [
        { key: 'default_lane_segment_duty', label: '默认档位段位职责', count: 1 },
        { key: 'default_lane_conflict_rotation', label: '冲突轮换', count: 1 },
        { key: 'default_lane_payoff_density', label: '回报密度', count: 1 },
        { key: 'default_lane_ending_hook_template', label: '章末追读模板', count: 1 },
      ],
      defaultFiveChapterLaneRedesign: {
        visible: true,
        reason: 'repeated_recovery_verdict_relapse',
        relapseCount: 2,
        repeatedFailureReasons: ['核心偏移', '回报欠账', '追读拉力'],
        missedRequirements: [
          { key: 'default_lane_segment_duty', label: '默认档位段位职责', count: 1 },
          { key: 'default_lane_conflict_rotation', label: '冲突轮换', count: 1 },
          { key: 'default_lane_payoff_density', label: '回报密度', count: 1 },
          { key: 'default_lane_ending_hook_template', label: '章末追读模板', count: 1 },
        ],
      },
    })
  })

  test('keeps safe batch recovery roadmap in the task-center snapshot', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '结构决策执行趋势未稳，下一轮保持 3 章以内安全连写。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
        safe_batch_recovery_roadmap: {
          visible: true,
          label: '安全连写恢复路线图',
          current_lane: 'small_batch',
          current_lane_label: '3章验证',
          current_target_chapter_count: 3,
          current_reason: '结构决策执行趋势未稳，下一轮保持 3 章以内安全连写。',
          next_repair_layer: {
            key: 'structure_decision_execution',
            label: '结构决策执行',
            status: 'warn',
            action_label: '补齐结构决策执行',
            detail: '中段职责漏项 1 次。',
          },
          route_nodes: [
            { key: 'strengthened_acceptance', label: '强化验收', status: 'ok', target_chapter_count: 5, detail: '连续 3/3 批通过。' },
            { key: 'expansion_feedback', label: '扩批热区', status: 'ok', target_chapter_count: 5, detail: '扩批热区已清。' },
            { key: 'structure_decision_execution', label: '结构决策执行', status: 'warn', target_chapter_count: 3, detail: '中段职责漏项 1 次。' },
          ],
        },
      },
    })

    expect(snapshot?.recoveryRoadmap).toMatchObject({
      visible: true,
      label: '安全连写恢复路线图',
      currentLane: 'small_batch',
      currentLaneLabel: '3章验证',
      currentTargetChapterCount: 3,
      recommendedFocus: {
        layerKey: 'structure_decision_execution',
        layerLabel: '结构决策执行',
        actionLabel: '补齐结构决策执行',
        targetView: 'repair_task',
        issueType: 'safe_batch_expansion_structure_decision_mismatch',
        taskCenterFilterLabel: '扩批结构决策',
      },
      nextRepairLayer: {
        key: 'structure_decision_execution',
        label: '结构决策执行',
        status: 'warn',
        actionLabel: '补齐结构决策执行',
        focus: {
          targetView: 'repair_task',
          issueType: 'safe_batch_expansion_structure_decision_mismatch',
          taskCenterFilterLabel: '扩批结构决策',
        },
      },
    })
    expect(snapshot?.recoveryRoadmap?.routeNodes).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'strengthened_acceptance', status: 'ok', targetChapterCount: 5 }),
      expect.objectContaining({ key: 'structure_decision_execution', status: 'warn', targetChapterCount: 3 }),
    ]))
  })

  test('summarizes passed recovery validation batches as a restore-five confirmation action', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'expanded',
        label: '强化扩批规则',
        summary: '扩批结构验证批通过，准备恢复 5 章扩批。',
        target_chapter_count: 5,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'recovered',
          label: '扩批热区反馈',
          summary: '扩批结构验证批通过：第50、51、52章核心守恒、显性回报和章末追读稳定，可作为恢复5章扩批证据。',
          target_chapter_count: 5,
          latest_chapter_nos: [50, 51, 52],
          risk_count: 0,
          expansion_structure_validation_result: {
            visible: true,
            status: 'ok',
            label: '扩批结构验证',
            summary: '扩批结构验证批通过：第50、51、52章核心守恒、显性回报和章末追读稳定，可作为恢复5章扩批证据。',
            validation_chapter_nos: [50, 51, 52],
            failed_chapter_nos: [],
            risk_count: 0,
          },
        },
        safe_batch_recovery_roadmap: {
          visible: true,
          label: '安全连写恢复路线图',
          current_lane: 'expanded_batch',
          current_lane_label: '5章扩批',
          current_target_chapter_count: 5,
          current_status: 'expanded',
          current_reason: '扩批结构验证批通过，恢复 5 章扩批。',
          route_nodes: [
            { key: 'structure_validation', label: '结构验证', status: 'ok', target_chapter_count: 5, detail: '验证批通过。' },
          ],
        },
      },
    })

    expect(snapshot?.recoveryValidation).toMatchObject({
      visible: true,
      status: 'passed',
      label: '3章验证批通过',
      validationChapterNos: [50, 51, 52],
      riskCount: 0,
      targetChapterCount: 5,
      nextActionKind: 'confirm_restore_five',
      nextActionLabel: '确认恢复5章扩批',
    })
    expect(snapshot?.recoveryValidation?.summary).toContain('第50、51、52章')
  })

  test('keeps default five-chapter recovery verdict in recovery validation summary', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'expanded',
        label: '强化扩批规则',
        summary: '默认档位回退后的3章验证批通过。',
        target_chapter_count: 5,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'recovered',
          label: '扩批热区反馈',
          summary: '扩批结构验证批通过，默认档位恢复判定已清零。',
          target_chapter_count: 5,
          latest_chapter_nos: [68, 69, 70],
          risk_count: 0,
          expansion_structure_validation_result: {
            visible: true,
            status: 'ok',
            label: '扩批结构验证',
            summary: '扩批结构验证批通过：第68、69、70章核心守恒、显性回报和章末追读稳定。',
            validation_chapter_nos: [68, 69, 70],
            failed_chapter_nos: [],
            risk_count: 0,
            default_five_chapter_recovery_verdict: {
              visible: true,
              status: 'passed',
              label: '默认档位恢复判定',
              summary: '默认档位恢复判定：核心偏移、回报欠账、追读拉力已清零。',
              default_batch_chapter_nos: [63, 64, 65, 66, 67],
              restore_chapter_nos: [58, 59, 60, 61, 62],
              previous_validation_chapter_nos: [50, 51, 52],
              validation_chapter_nos: [68, 69, 70],
              failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
              cleared_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
              remaining_failure_reasons: [],
              failure_reason_statuses: [
                { reason: '核心偏移', status: 'cleared', risk_count: 0 },
                { reason: '回报欠账', status: 'cleared', risk_count: 0 },
                { reason: '追读拉力', status: 'cleared', risk_count: 0 },
              ],
            },
          },
        },
      },
    })

    expect(snapshot?.recoveryValidation?.defaultFiveChapterRecoveryVerdict).toMatchObject({
      visible: true,
      status: 'passed',
      label: '默认档位恢复判定',
      defaultBatchChapterNos: [63, 64, 65, 66, 67],
      restoreChapterNos: [58, 59, 60, 61, 62],
      previousValidationChapterNos: [50, 51, 52],
      validationChapterNos: [68, 69, 70],
      failureReasons: ['核心偏移', '回报欠账', '追读拉力'],
      clearedFailureReasons: ['核心偏移', '回报欠账', '追读拉力'],
      remainingFailureReasons: [],
    })
    expect(snapshot?.recoveryValidation?.defaultFiveChapterRecoveryVerdict?.summary).toContain('已清零')
  })

  test('keeps default lane template validation verdict in recovery validation summary', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '默认档位模板回检未通过，继续保持 3 章验证。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 1,
        latest_status: 'warn',
        expansion_feedback: {
          status: 'rollback_to_small_batch',
          label: '扩批热区反馈',
          summary: '默认档位模板回检未通过：第91章缺回报密度，不能恢复默认5章档位。',
          target_chapter_count: 3,
          latest_chapter_nos: [90, 91, 92],
          risk_count: 1,
          expansion_structure_validation_result: {
            visible: true,
            status: 'warn',
            label: '扩批结构验证',
            summary: '扩批结构验证批未通过：默认档位模板回检未通过：第91章缺回报密度，不能恢复默认5章档位。',
            validation_chapter_nos: [90, 91, 92],
            failed_chapter_nos: [91],
            risk_count: 1,
            default_five_chapter_lane_template_verdict: {
              visible: true,
              status: 'failed',
              label: '默认档位模板回检',
              summary: '默认档位模板回检未通过：生产后验仍复发：回报欠账。',
              validation_chapter_nos: [90, 91, 92],
              requirements: [
                { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
                { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
                { key: 'default_lane_payoff_density', label: '回报密度', status: 'missing' },
                { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
              ],
              missing_count: 1,
              missing_requirements: [
                { key: 'default_lane_payoff_density', label: '回报密度', chapter_nos: [91] },
              ],
              production_failed_count: 1,
              production_relapse_verdict: {
                visible: true,
                status: 'failed',
                label: '默认档位模板生产后验判定',
                template_version_id: 'safe_batch_expansion_structure_repair:668',
                default_batch_chapter_nos: [86, 87, 88, 89, 90],
                restore_chapter_nos: [81, 82, 83, 84, 85],
                previous_validation_chapter_nos: [78, 79, 80],
                validation_chapter_nos: [90, 91, 92],
                failure_reasons: ['核心偏移', '回报欠账'],
                cleared_failure_reasons: ['核心偏移'],
                remaining_failure_reasons: ['回报欠账'],
                failed_count: 1,
                failed_requirements: [
                  { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账', chapter_nos: [90, 91, 92] },
                ],
                summary: '默认档位模板生产后验仍复发：回报欠账未清零。',
              },
              production_failed_requirements: [
                { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账', chapter_nos: [90, 91, 92] },
              ],
            },
          },
        },
      },
    })

    expect(snapshot?.recoveryValidation?.defaultFiveChapterLaneTemplateVerdict).toMatchObject({
      visible: true,
      status: 'failed',
      label: '默认档位模板回检',
      validationChapterNos: [90, 91, 92],
      missingCount: 1,
      missingRequirements: [
        { key: 'default_lane_payoff_density', label: '回报密度', chapterNos: [91] },
      ],
      productionFailedCount: 1,
      productionRelapseVerdict: {
        status: 'failed',
        templateVersionId: 'safe_batch_expansion_structure_repair:668',
        defaultBatchChapterNos: [86, 87, 88, 89, 90],
        validationChapterNos: [90, 91, 92],
        remainingFailureReasons: ['回报欠账'],
      },
      productionFailedRequirements: [
        { key: 'default_lane_payoff_density', label: '回报密度', failureReason: '回报欠账', chapterNos: [90, 91, 92] },
      ],
      requirements: [
        { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
        { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
        { key: 'default_lane_payoff_density', label: '回报密度', status: 'missing' },
        { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
      ],
    })
    expect(snapshot?.recoveryValidation?.defaultFiveChapterLaneTemplateVerdict?.summary).toContain('生产后验仍复发')
    expect(snapshot?.recoveryValidation?.nextActionLabel).toBe('修生产后验')
    expect(snapshot?.recoveryValidation?.reviewCta).toMatchObject({
      kind: 'repair_production_relapse',
      label: '修生产后验',
      remainingFailureReasons: ['回报欠账'],
    })
    expect(snapshot?.recoveryValidation?.reviewCta?.summary).toContain('回报欠账')
    expect(snapshot?.recoveryValidation?.reviewCta?.summary).not.toContain('核心偏移')
  })

  test('surfaces a single restore CTA after production relapse validation passes', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'expanded',
        label: '强化扩批规则',
        summary: '生产后验验证批通过，进入5章观察。',
        target_chapter_count: 5,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'recovered',
          label: '扩批热区反馈',
          summary: '默认档位模板生产后验已修复。',
          target_chapter_count: 5,
          latest_chapter_nos: [114, 115, 116],
          risk_count: 0,
          expansion_structure_validation_result: {
            visible: true,
            status: 'ok',
            label: '扩批结构验证',
            summary: '默认档位模板生产后验已修复：核心偏移、回报欠账、追读拉力已清零。',
            validation_chapter_nos: [114, 115, 116],
            failed_chapter_nos: [],
            risk_count: 0,
            default_five_chapter_lane_template_verdict: {
              visible: true,
              status: 'passed',
              label: '默认档位模板回检',
              summary: '默认档位模板生产后验已修复。',
              validation_chapter_nos: [114, 115, 116],
              requirements: [
                { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled' },
                { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled' },
                { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled' },
                { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled' },
              ],
              missing_count: 0,
              missing_requirements: [],
              production_failed_count: 0,
              production_relapse_verdict: {
                visible: true,
                status: 'passed',
                label: '默认档位模板生产后验判定',
                template_version_id: 'safe_batch_expansion_structure_repair:668',
                default_batch_chapter_nos: [109, 110, 111, 112, 113],
                restore_chapter_nos: [104, 105, 106, 107, 108],
                previous_validation_chapter_nos: [96, 97, 98],
                validation_chapter_nos: [114, 115, 116],
                failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
                cleared_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
                remaining_failure_reasons: [],
                failed_count: 0,
                failed_requirements: [],
                summary: '默认档位模板生产后验已修复：核心偏移、回报欠账、追读拉力已清零。',
              },
            },
          },
        },
      },
    })

    expect(snapshot?.recoveryValidation?.status).toBe('passed')
    expect(snapshot?.recoveryValidation?.nextActionLabel).toBe('进入5章观察批')
    expect(snapshot?.recoveryValidation?.reviewCta).toMatchObject({
      kind: 'enter_five_chapter_observation',
      label: '进入5章观察批',
      clearedFailureReasons: ['核心偏移', '回报欠账', '追读拉力'],
      remainingFailureReasons: [],
    })
    expect(snapshot?.recoveryValidation?.reviewCta?.summary).toContain('生产后验已修复')
    expect(snapshot?.recoveryValidation?.reviewCta?.summary).toContain('5章观察')
  })

  test('keeps default lane template stability profile in expansion feedback snapshot', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_recovery_restore_stability_lane: {
        visible: true,
        status: 'observing',
        label: '5章观察批',
        source: 'recovery_restore_stability_evidence',
        stable_pass_streak: 2,
        required_stable_pass_streak: 2,
        default_five_chapter_ready: false,
        restore_chapter_nos: [104, 105, 106, 107, 108],
        validation_chapter_nos: [96, 97, 98],
        latest_template_version_profile: {
          id: 'safe_batch_expansion_structure_repair:663',
          label: '默认5章档位模板重构',
          source_run_id: 663,
          latest_status: 'passed',
          validation_batch_count: 1,
          passed_batch_count: 1,
          failed_batch_count: 0,
          pass_streak: 1,
          required_pass_streak: 2,
          status: 'observing',
        },
        task_center_filter_label: '批次复盘筛选：5章观察批 / 当前模板版本 safe_batch_expansion_structure_repair:663',
        summary: '恢复5章扩批连续 2 批稳定，但当前模板版本 safe_batch_expansion_structure_repair:663 连过 1/2，继续观察。',
      },
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '默认档位模板进入稳定性观察。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 1,
        latest_status: 'ok',
        expansion_feedback: {
          status: 'recovered',
          label: '扩批热区反馈',
          summary: '默认档位模板最近通过，但历史仍有回报密度失败 1 次；继续3章观察。',
          target_chapter_count: 5,
          latest_chapter_nos: [93, 94, 95],
          risk_count: 0,
          default_five_chapter_lane_template_stability_profile: {
            visible: true,
            status: 'observing',
            label: '默认档位模板稳定性',
            summary: '默认档位模板最近通过，但历史仍有回报密度失败 1 次；继续3章观察 1/2 批。',
            latest_status: 'passed',
            latest_chapter_nos: [93, 94, 95],
            validation_batch_count: 2,
            passed_batch_count: 1,
            failed_batch_count: 1,
            pass_streak: 1,
            required_pass_streak: 2,
            recommendation: 'continue_validation',
            failed_requirement_count: 1,
            requirements: [
              { key: 'default_lane_payoff_density', label: '回报密度', passed_count: 1, failed_count: 1, latest_status: 'fulfilled' },
            ],
            latest_template_version_profile: {
              id: 'safe_batch_expansion_structure_repair:663',
              label: '默认5章档位模板重构',
              source_run_id: 663,
              latest_status: 'passed',
              validation_batch_count: 1,
              passed_batch_count: 1,
              failed_batch_count: 0,
              pass_streak: 1,
              status: 'observing',
            },
            template_version_profiles: [
              {
                id: 'safe_batch_expansion_structure_repair:663',
                label: '默认5章档位模板重构',
                source_run_id: 663,
                latest_status: 'passed',
                validation_batch_count: 1,
                passed_batch_count: 1,
                failed_batch_count: 0,
                pass_streak: 1,
                status: 'observing',
              },
            ],
          },
        },
      },
    })

    expect(snapshot?.expansionFeedback?.defaultFiveChapterLaneTemplateStabilityProfile).toMatchObject({
      visible: true,
      status: 'observing',
      label: '默认档位模板稳定性',
      latestStatus: 'passed',
      latestChapterNos: [93, 94, 95],
      validationBatchCount: 2,
      passedBatchCount: 1,
      failedBatchCount: 1,
      passStreak: 1,
      requiredPassStreak: 2,
      recommendation: 'continue_validation',
      failedRequirementCount: 1,
      requirements: [
        { key: 'default_lane_payoff_density', label: '回报密度', passedCount: 1, failedCount: 1, latestStatus: 'fulfilled' },
      ],
      latestTemplateVersionProfile: {
        id: 'safe_batch_expansion_structure_repair:663',
        sourceRunId: 663,
        latestStatus: 'passed',
        validationBatchCount: 1,
        passedBatchCount: 1,
        failedBatchCount: 0,
        passStreak: 1,
        status: 'observing',
      },
      templateVersionProfiles: [
        expect.objectContaining({
          id: 'safe_batch_expansion_structure_repair:663',
          sourceRunId: 663,
          latestStatus: 'passed',
          validationBatchCount: 1,
        }),
      ],
    })
    expect(snapshot?.expansionFeedback?.defaultFiveChapterLaneTemplateStabilityProfile?.summary).toContain('继续3章观察')
    expect(snapshot?.recoveryRestoreStabilityLane).toMatchObject({
      status: 'observing',
      defaultFiveChapterReady: false,
      stablePassStreak: 2,
      requiredStablePassStreak: 2,
      taskCenterFilterLabel: '批次复盘筛选：5章观察批 / 当前模板版本 safe_batch_expansion_structure_repair:663',
      latestTemplateVersionProfile: {
        id: 'safe_batch_expansion_structure_repair:663',
        status: 'observing',
        passStreak: 1,
        requiredPassStreak: 2,
      },
    })
  })

  test('summarizes failed recovery validation batches as a focused repair action', () => {
    const snapshot = buildSafeBatchExpansionPolicySnapshot({
      safe_batch_expansion_policy: {
        status: 'recovering',
        label: '强化扩批规则',
        summary: '扩批结构验证批未通过，继续保持 3 章验证。',
        target_chapter_count: 3,
        base_chapter_count: 3,
        expanded_chapter_count: 5,
        required_pass_streak: 3,
        pass_streak: 3,
        accepted_batch_count: 3,
        failed_batch_count: 0,
        latest_status: 'warn',
        expansion_feedback: {
          status: 'rollback_to_small_batch',
          label: '扩批热区反馈',
          summary: '扩批结构验证批未通过：第51章仍有 2 项核心/回报/追读风险，结构修复不能恢复5章扩批。',
          target_chapter_count: 3,
          latest_chapter_nos: [50, 51, 52],
          risk_count: 2,
          expansion_structure_validation_result: {
            visible: true,
            status: 'warn',
            label: '扩批结构验证',
            summary: '扩批结构验证批未通过：第51章仍有 2 项核心/回报/追读风险，结构修复不能恢复5章扩批。',
            validation_chapter_nos: [50, 51, 52],
            failed_chapter_nos: [51],
            risk_count: 2,
          },
        },
        safe_batch_recovery_roadmap: {
          visible: true,
          label: '安全连写恢复路线图',
          current_lane: 'small_batch',
          current_lane_label: '3章验证',
          current_target_chapter_count: 3,
          current_status: 'recovering',
          current_reason: '扩批结构验证批未通过，继续保持 3 章验证。',
          next_repair_layer: {
            key: 'structure_validation',
            label: '结构验证',
            status: 'warn',
            action_label: '重写扩批结构',
            detail: '第51章仍有结构验证风险。',
          },
          route_nodes: [
            { key: 'structure_validation', label: '结构验证', status: 'warn', target_chapter_count: 3, detail: '验证批未通过。' },
          ],
        },
      },
    })

    expect(snapshot?.recoveryValidation).toMatchObject({
      visible: true,
      status: 'failed',
      label: '3章验证批未过',
      validationChapterNos: [50, 51, 52],
      failedChapterNos: [51],
      riskCount: 2,
      targetChapterCount: 3,
      nextActionKind: 'focus_repair',
      nextActionLabel: '聚焦重写扩批结构',
      focus: {
        issueType: 'safe_batch_expansion_structure_repair',
        taskCenterFilterLabel: '扩批结构',
      },
    })
  })

  test('matches safe batch recovery focus to the intended task type and status', () => {
    const focus = {
      layerKey: 'structure_decision_execution',
      layerLabel: '结构决策执行',
      actionLabel: '补齐结构决策执行',
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_decision_mismatch',
      source: 'safe_batch_expansion_structure_decision_trend',
      taskStatuses: ['open', 'needs_review'],
      taskCenterFilterLabel: '扩批结构决策',
    }

    expect(safeBatchRecoveryFocusMatchesTask(focus, {
      issue_type: 'safe_batch_expansion_structure_decision_mismatch',
      task_status: 'needs_review',
    })).toBe(true)
    expect(safeBatchRecoveryFocusMatchesTask(focus, {
      issue_type: 'safe_batch_expansion_structure_decision_mismatch',
      task_status: 'resolved',
    })).toBe(false)
    expect(safeBatchRecoveryFocusMatchesTask(focus, {
      issue_type: 'safe_batch_expansion_structure_repair',
      task_status: 'open',
    })).toBe(false)
  })

  test('normalizes annotation categories before matching safe batch recovery focus tasks', () => {
    const focus = {
      layerKey: 'reader_retention_recovery',
      layerLabel: '追读恢复',
      actionLabel: '补追读恢复',
      targetView: 'repair_task',
      issueType: 'reader_retention_missed',
      source: 'safe_batch_reader_retention_trend',
      taskStatuses: ['open', 'needs_review'],
      taskCenterFilterLabel: '追读',
    }

    expect(safeBatchRecoveryFocusMatchesTask(focus, {
      annotation_category: 'reader_retention',
      task_status: 'needs_review',
    })).toBe(true)

    expect(safeBatchRecoveryFocusMatchesTask(focus, {
      issue_type: 'volume_segment_missed',
      annotation_category: 'reader_retention',
      task_status: 'needs_review',
    })).toBe(false)
  })

  test('matches default lane template focus only to structure decision tasks with default lane gaps', () => {
    const focus = {
      layerKey: 'structure_decision_execution',
      layerLabel: '结构决策执行',
      actionLabel: '补默认档位模板',
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_decision_mismatch',
      source: 'safe_batch_expansion_structure_decision_trend',
      taskStatuses: ['open', 'needs_review'],
      taskCenterFilterLabel: '默认档位模板',
      requirementKey: 'default_lane_template',
    }

    const genericStructureTask = {
      issue_type: 'safe_batch_expansion_structure_decision_mismatch',
      task_status: 'open',
      safe_batch_expansion_structure_decision_review: {
        failed_items: [{ key: 'segment_role', label: '中段职责', count: 1 }],
      },
    }
    const defaultLaneTask = {
      issue_type: 'safe_batch_expansion_structure_decision_mismatch',
      task_status: 'open',
      safe_batch_expansion_structure_decision_review: {
        default_five_chapter_lane_redesign: {
          reason: 'repeated_recovery_verdict_relapse',
          relapse_count: 2,
        },
        failed_items: [
          { key: 'default_lane_segment_duty', label: '默认档位段位职责', count: 1 },
        ],
      },
    }

    expect(safeBatchRecoveryFocusMatchesTask(focus as any, genericStructureTask)).toBe(false)
    expect(safeBatchRecoveryFocusMatchesTask(focus as any, defaultLaneTask)).toBe(true)
  })

  test('summarizes safe batch recovery focus after matched tasks are resolved', () => {
    const focus = {
      layerKey: 'structure_decision_execution',
      layerLabel: '结构决策执行',
      actionLabel: '补齐结构决策执行',
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_decision_mismatch',
      source: 'safe_batch_expansion_structure_decision_trend',
      taskStatuses: ['open', 'needs_review'],
      taskCenterFilterLabel: '扩批结构决策',
    }

    expect(buildSafeBatchRecoveryFocusReviewState(focus, [
      {
        task: {
          issue_type: 'safe_batch_expansion_structure_decision_mismatch',
          task_status: 'open',
        },
      },
    ])).toMatchObject({
      status: 'active',
      matchedCount: 1,
      activeCount: 1,
      resolvedCount: 0,
      nextActionLabel: '继续补齐结构决策执行',
    })

    expect(buildSafeBatchRecoveryFocusReviewState(focus, [
      {
        task: {
          issue_type: 'safe_batch_expansion_structure_decision_mismatch',
          task_status: 'resolved',
        },
      },
    ])).toMatchObject({
      status: 'ready_for_recheck',
      matchedCount: 1,
      activeCount: 0,
      resolvedCount: 1,
      nextActionLabel: '刷新路线图并启动验证批',
    })
  })

  test('summarizes resolved default lane template focus by four obligations', () => {
    const focus = {
      layerKey: 'structure_decision_execution',
      layerLabel: '结构决策执行',
      actionLabel: '补默认档位模板',
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_decision_mismatch',
      source: 'safe_batch_expansion_structure_decision_trend',
      taskStatuses: ['open', 'needs_review'],
      taskCenterFilterLabel: '默认档位模板',
      requirementKey: 'default_lane_template',
    }
    const state = buildSafeBatchRecoveryFocusReviewState(focus, [{
      task: {
        issue_type: 'safe_batch_expansion_structure_decision_mismatch',
        task_status: 'resolved',
        safe_batch_expansion_structure_decision_review: {
          default_five_chapter_lane_redesign: {
            reason: 'repeated_recovery_verdict_relapse',
            relapse_count: 2,
          },
          failed_items: [
            { key: 'default_lane_segment_duty', label: '默认档位段位职责', count: 1 },
            { key: 'default_lane_conflict_rotation', label: '冲突轮换', count: 1 },
            { key: 'default_lane_payoff_density', label: '回报密度', count: 1 },
            { key: 'default_lane_ending_hook_template', label: '章末追读模板', count: 1 },
          ],
        },
      },
    }])

    expect(state.status).toBe('ready_for_recheck')
    expect(state.summary).toContain('默认档位段位职责已补齐')
    expect(state.summary).toContain('冲突轮换已补齐')
    expect(state.summary).toContain('回报密度已补齐')
    expect(state.summary).toContain('章末追读模板已补齐')
    expect((state as any).obligationStatuses).toEqual([
      { key: 'default_lane_segment_duty', label: '默认档位段位职责', status: 'fulfilled', text: '默认档位段位职责已补齐', color: 'green' },
      { key: 'default_lane_conflict_rotation', label: '冲突轮换', status: 'fulfilled', text: '冲突轮换已补齐', color: 'green' },
      { key: 'default_lane_payoff_density', label: '回报密度', status: 'fulfilled', text: '回报密度已补齐', color: 'green' },
      { key: 'default_lane_ending_hook_template', label: '章末追读模板', status: 'fulfilled', text: '章末追读模板已补齐', color: 'green' },
    ])
  })

  test('surfaces production relapse closure criteria in active default lane template focus', () => {
    const focus = {
      layerKey: 'default_lane_template_version',
      layerLabel: '默认档位模板版本',
      actionLabel: '修生产后验',
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_repair',
      source: 'safe_batch_recovery_roadmap',
      taskStatuses: ['open', 'needs_review'],
      taskCenterFilterLabel: '生产后验仍复发',
      requirementKey: 'default_lane_template',
      templateVersionId: 'safe_batch_expansion_structure_repair:668',
    }
    const state = buildSafeBatchRecoveryFocusReviewState(focus, [{
      task: {
        issue_type: 'safe_batch_expansion_structure_repair',
        task_status: 'open',
        safe_batch_expansion_structure_review: {
          default_five_chapter_lane_template_repair: {
            visible: true,
            status: 'failed',
            production_relapse_verdict: {
              visible: true,
              status: 'failed',
              template_version_id: 'safe_batch_expansion_structure_repair:668',
              default_batch_chapter_nos: [109, 110, 111, 112, 113],
              validation_chapter_nos: [114, 115, 116],
              remaining_failure_reasons: ['核心偏移', '回报欠账'],
            },
            production_failed_requirements: [
              { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移' },
              { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账' },
            ],
          },
        },
      },
    }])

    expect(state.status).toBe('active')
    expect(state.summary).toContain('等待生产后验验证批')
    expect(state.summary).toContain('真实复发批：第109、110、111、112、113章')
    expect(state.summary).toContain('仍复发维度：核心偏移、回报欠账')
    expect(state.summary).toContain('production_relapse_verdict.status=passed')
    expect((state as any).productionRelapseClosure).toMatchObject({
      status: 'failed',
      templateVersionId: 'safe_batch_expansion_structure_repair:668',
      closeText: '等待生产后验验证批：下一轮以 production_relapse_verdict.status=passed 关闭，且 remaining_failure_reasons 为空。',
    })
  })

  test('surfaces production relapse closure criteria after default lane template focus is resolved', () => {
    const focus = {
      layerKey: 'default_lane_template_version',
      layerLabel: '默认档位模板版本',
      actionLabel: '修生产后验',
      targetView: 'repair_task',
      issueType: 'safe_batch_expansion_structure_repair',
      source: 'safe_batch_recovery_roadmap',
      taskStatuses: ['open', 'needs_review'],
      taskCenterFilterLabel: '生产后验仍复发',
      requirementKey: 'default_lane_template',
    }
    const state = buildSafeBatchRecoveryFocusReviewState(focus, [{
      task: {
        issue_type: 'safe_batch_expansion_structure_repair',
        task_status: 'resolved',
        safe_batch_expansion_structure_review: {
          default_five_chapter_lane_template_repair: {
            visible: true,
            status: 'failed',
            production_relapse_verdict: {
              visible: true,
              status: 'failed',
              template_version_id: 'safe_batch_expansion_structure_repair:668',
              default_batch_chapter_nos: [109, 110, 111, 112, 113],
              validation_chapter_nos: [114, 115, 116],
              remaining_failure_reasons: ['核心偏移'],
              cleared_failure_reasons: ['追读拉力'],
            },
            production_failed_requirements: [
              { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移' },
            ],
          },
        },
      },
    }])

    expect(state.status).toBe('ready_for_recheck')
    expect(state.nextActionLabel).toBe('启动生产后验验证批')
    expect(state.summary).toContain('已处理 1 个匹配任务')
    expect(state.summary).toContain('下一轮以 production_relapse_verdict.status=passed 关闭')
    expect(state.summary).toContain('remaining_failure_reasons 为空')
    expect(state.summary).toContain('不能只补 default_lane_*_delivered')
    expect((state as any).productionRelapseClosure).toMatchObject({
      status: 'failed',
      closeText: '等待生产后验验证批：下一轮以 production_relapse_verdict.status=passed 关闭，且 remaining_failure_reasons 为空。',
    })
  })
})

describe('default lane repair task card helpers', () => {
  test('extracts production relapse CTA execution from safe-batch preflight', async () => {
    const taskCenter = await import('./TaskCenterDrawer')
    const snapshot = (taskCenter as any).buildProductionRelapseCtaExecutionSnapshot?.({
      production_relapse_cta_execution: {
        source: 'safe_batch_production_relapse_review_cta',
        kind: 'enter_five_chapter_observation',
        label: '进入5章观察批',
        template_version_id: 'safe_batch_expansion_structure_repair:704',
        default_batch_chapter_nos: [119, 120, 121, 122, 123],
        validation_chapter_nos: [124, 125, 126],
        cleared_failure_reasons: ['核心偏移', '回报欠账', '追读拉力'],
        remaining_failure_reasons: [],
        target_chapter_count: 5,
      },
    })

    expect(snapshot).toEqual({
      visible: true,
      source: 'safe_batch_production_relapse_review_cta',
      kind: 'enter_five_chapter_observation',
      label: '进入5章观察批',
      templateVersionId: 'safe_batch_expansion_structure_repair:704',
      defaultBatchChapterNos: [119, 120, 121, 122, 123],
      validationChapterNos: [124, 125, 126],
      clearedFailureReasons: ['核心偏移', '回报欠账', '追读拉力'],
      remainingFailureReasons: [],
      targetChapterCount: 5,
      summary: '生产后验 CTA：进入5章观察批；模板 safe_batch_expansion_structure_repair:704；已修复 核心偏移、回报欠账、追读拉力；剩余 无。',
    })
  })

  test('extracts default lane template gap tags from structure decision repair tasks', async () => {
    const taskCenter = await import('./TaskCenterDrawer')
    const tags = (taskCenter as any).buildDefaultLaneRepairTaskTags?.({
      issue_type: 'safe_batch_expansion_structure_decision_mismatch',
      safe_batch_expansion_structure_decision_review: {
        default_five_chapter_lane_redesign: {
          reason: 'repeated_recovery_verdict_relapse',
          relapse_count: 2,
        },
        failed_items: [
          { key: 'default_lane_segment_duty', label: '默认档位段位职责', count: 1 },
          { key: 'default_lane_conflict_rotation', label: '冲突轮换', count: 1 },
          { key: 'default_lane_payoff_density', label: '回报密度', count: 1 },
          { key: 'default_lane_ending_hook_template', label: '章末追读模板', count: 1 },
        ],
      },
    })

    expect(tags).toEqual([
      { key: 'default_lane_template', label: '默认档位模板', color: 'gold' },
      { key: 'default_lane_segment_duty', label: '缺默认档位段位职责', color: 'gold' },
      { key: 'default_lane_conflict_rotation', label: '缺冲突轮换', color: 'gold' },
      { key: 'default_lane_payoff_density', label: '缺回报密度', color: 'gold' },
      { key: 'default_lane_ending_hook_template', label: '缺章末追读模板', color: 'gold' },
      { key: 'default_lane_relapse', label: '连续失效2次', color: 'gold' },
    ])
  })

  test('extracts default lane template redesign tags from structure repair tasks', async () => {
    const taskCenter = await import('./TaskCenterDrawer')
    const tags = (taskCenter as any).buildDefaultLaneRepairTaskTags?.({
      issue_type: 'safe_batch_expansion_structure_repair',
      safe_batch_expansion_structure_review: {
        default_five_chapter_lane_template_redesign_queue: {
          visible: true,
          label: '默认档位模板重构队列',
          top_failed_requirement: {
            key: 'default_lane_payoff_density',
            label: '回报密度',
            failed_count: 2,
          },
          redesign_requirements: [
            { key: 'default_lane_segment_duty', label: '默认档位段位职责' },
            { key: 'default_lane_conflict_rotation', label: '冲突轮换' },
            { key: 'default_lane_payoff_density', label: '回报密度' },
            { key: 'default_lane_ending_hook_template', label: '章末追读模板' },
          ],
        },
      },
    })

    expect(tags).toEqual(expect.arrayContaining([
      { key: 'default_lane_template_redesign', label: '默认档位模板重构', color: 'gold' },
      { key: 'default_lane_payoff_density', label: '重写回报密度', color: 'gold' },
    ]))
  })

  test('extracts production relapse verdict tags from structure repair tasks', async () => {
    const taskCenter = await import('./TaskCenterDrawer')
    const tags = (taskCenter as any).buildDefaultLaneRepairTaskTags?.({
      issue_type: 'safe_batch_expansion_structure_repair',
      safe_batch_expansion_structure_review: {
        default_five_chapter_lane_template_repair: {
          visible: true,
          label: '默认档位模板验证缺项',
          production_failed_count: 2,
          production_relapse_verdict: {
            status: 'failed',
            remaining_failure_reasons: ['核心偏移', '回报欠账'],
          },
          production_failed_requirements: [
            { key: 'default_lane_segment_duty', label: '默认档位段位职责', failure_reason: '核心偏移' },
            { key: 'default_lane_payoff_density', label: '回报密度', failure_reason: '回报欠账' },
          ],
        },
      },
    })

    expect(tags).toEqual(expect.arrayContaining([
      { key: 'default_lane_production_relapse', label: '生产后验仍复发', color: 'gold' },
      { key: 'default_lane_segment_duty', label: '核心偏移未修', color: 'gold' },
      { key: 'default_lane_payoff_density', label: '回报欠账未修', color: 'gold' },
    ]))
  })
})

describe('buildRecoveryEvidenceReviewRowAction', () => {
  test('routes recovery evidence source rows to the natural clickable action', () => {
    expect(buildRecoveryEvidenceReviewRowAction({
      evidence: '单章治理复查：生产阻断已解除',
      riskLabels: [],
      source: 'recovery_evidence_production_gate',
      sourceLabel: '入口生产闸门',
      sourceDetail: '单章治理复查 · 生产阻断已解除',
      sourceAction: 'single_chapter_governance_recheck',
      sourceActionLabel: '复检单章',
      productionGateSource: 'single_chapter_governance_recheck',
    })).toEqual({
      action: 'recheck_single_chapter',
      label: '复检单章',
      focusSource: 'single_chapter_governance_recheck',
    })

    expect(buildRecoveryEvidenceReviewRowAction({
      evidence: '批次恢复复查：生产阻断已解除',
      riskLabels: [],
      source: 'recovery_evidence_production_gate',
      sourceLabel: '入口生产闸门',
      sourceDetail: '批次恢复复查 · 生产阻断已解除',
      sourceAction: 'safe_batch_recovery_recheck',
      sourceActionLabel: '复盘批次',
      productionGateSource: 'safe_batch_recovery_recheck',
    })).toEqual({
      action: 'recheck_safe_batch',
      label: '复盘批次',
      focusSource: 'safe_batch_recovery_recheck',
    })

    expect(buildRecoveryEvidenceReviewRowAction({
      evidence: '第42章对白交锋已补回样章节奏',
      riskLabels: [],
      source: 'governance_recheck_memory',
      sourceLabel: '治理复查记忆',
      sourceDetail: '治理复查记忆 · 修后证据',
      sourceAction: 'review_governance_closure',
      sourceActionLabel: '治理复查台',
      productionGateSource: '',
    })).toEqual({
      action: 'review_governance_closure',
      label: '治理复查台',
      focusSource: '',
    })

    expect(buildRecoveryEvidenceReviewRowAction({
      evidence: '样章任务书复检通过 1 项',
      riskLabels: [],
      source: 'recovery_evidence',
      sourceLabel: '恢复放行依据',
      sourceDetail: '安全连写预检 · 恢复放行依据',
      sourceAction: 'create_safe_batch_risk_repair',
      sourceActionLabel: '按批次修订',
      productionGateSource: '',
    })).toEqual({
      action: 'execute_typed_repair',
      label: '按批次修订',
      focusSource: '',
    })
  })
})

describe('buildRecoveryEvidenceReviewActionFeedback', () => {
  test('summarizes the triggered action and next closure condition for a recovery evidence row', () => {
    const row = {
      evidence: '单章治理复查：生产阻断已解除',
      riskLabels: [],
      source: 'recovery_evidence_production_gate',
      sourceLabel: '入口生产闸门',
      sourceDetail: '单章治理复查 · 生产阻断已解除',
      sourceAction: 'single_chapter_governance_recheck',
      sourceActionLabel: '复检单章',
      productionGateSource: 'single_chapter_governance_recheck',
    }
    const rowAction = buildRecoveryEvidenceReviewRowAction(row)

    expect(buildRecoveryEvidenceReviewActionFeedbackKey(2, row, rowAction)).toBe(
      '2|recovery_evidence_production_gate|single_chapter_governance_recheck|recheck_single_chapter|单章治理复查：生产阻断已解除',
    )
    expect(buildRecoveryEvidenceReviewActionFeedback(rowAction, '14:20')).toEqual({
      statusLabel: '已触发复检单章',
      triggeredAt: '14:20',
      closureCondition: '关闭条件：单章复查为 ok 或 failed_evidence 为空。',
      detail: '最近动作：复检单章 · 14:20 · 已触发，等待复检结果回填。',
    })
  })

  test('uses batch repair closure wording for release evidence revision actions', () => {
    expect(buildRecoveryEvidenceReviewActionFeedback({
      action: 'execute_typed_repair',
      label: '按批次修订',
      focusSource: '',
    }, '15:05')).toEqual(expect.objectContaining({
      statusLabel: '已触发按批次修订',
      triggeredAt: '15:05',
      closureCondition: '关闭条件：完成批次修订并重新运行批次交稿复盘，recovery_evidence_review 为 ok。',
    }))
  })
})

describe('buildRecoveryEvidenceReviewRefreshAnchor', () => {
  test('records the row and source task focus after refreshing a recovery evidence action', () => {
    const row = {
      evidence: '单章治理复查：生产阻断已解除',
      riskLabels: [],
      source: 'recovery_evidence_production_gate',
      sourceLabel: '入口生产闸门',
      sourceDetail: '单章治理复查 · 生产阻断已解除',
      sourceAction: 'single_chapter_governance_recheck',
      sourceActionLabel: '复检单章',
      productionGateSource: 'single_chapter_governance_recheck',
    }
    const rowAction = buildRecoveryEvidenceReviewRowAction(row)

    expect(buildRecoveryEvidenceReviewRefreshAnchor({
      taskIndex: 2,
      row,
      rowAction,
      sourceTaskIndex: 5,
      refreshedAt: '14:22',
    })).toEqual({
      feedbackKey: '2|recovery_evidence_production_gate|single_chapter_governance_recheck|recheck_single_chapter|单章治理复查：生产阻断已解除',
      taskIndex: 2,
      sourceTaskIndex: 5,
      focusSource: 'single_chapter_governance_recheck',
      refreshedAt: '14:22',
      statusLabel: '已刷新结果',
    })
  })
})

describe('buildRecoveryEvidenceReviewRefreshFeedback', () => {
  test('turns local action feedback into a refreshed inline status while keeping closure guidance', () => {
    const rowAction = {
      action: 'recheck_safe_batch' as const,
      label: '复盘批次',
      focusSource: 'safe_batch_recovery_recheck',
    }
    const localFeedback = buildRecoveryEvidenceReviewActionFeedback(rowAction, '14:20')
    const feedback = buildRecoveryEvidenceReviewRefreshFeedback(localFeedback, {
      feedbackKey: 'feedback-key',
      taskIndex: 3,
      sourceTaskIndex: 4,
      focusSource: 'safe_batch_recovery_recheck',
      refreshedAt: '14:22',
      statusLabel: '已刷新结果',
    })

    expect(feedback).toEqual(expect.objectContaining({
      statusLabel: '已刷新结果',
      triggeredAt: '14:22',
      closureCondition: localFeedback.closureCondition,
    }))
    expect(feedback.detail).toContain('已刷新结果')
    expect(feedback.detail).toContain('刷新后继续定位此依据')
  })

  test('does not override a real running status with the refreshed local status', () => {
    const rowAction = {
      action: 'recheck_safe_batch' as const,
      label: '复盘批次',
      focusSource: 'safe_batch_recovery_recheck',
    }
    const localFeedback = buildRecoveryEvidenceReviewRefreshFeedback(
      buildRecoveryEvidenceReviewActionFeedback(rowAction, '14:20'),
      {
        feedbackKey: 'feedback-key',
        taskIndex: 3,
        sourceTaskIndex: 4,
        focusSource: 'safe_batch_recovery_recheck',
        refreshedAt: '14:22',
        statusLabel: '已刷新结果',
      },
    )

    const feedback = buildRecoveryEvidenceReviewResolvedFeedback({
      task: {
        issue_type: 'recovery_evidence_mismatch',
        recovery_evidence_review: {
          status: 'warn',
          failed_evidence: ['批次恢复复查：生产阻断已解除'],
        },
      },
      rowAction,
      currentRun: { id: 44, run_type: 'longform_production_repair' },
      runRecords: [
        {
          id: 44,
          run_type: 'longform_production_repair',
          status: 'running',
          output_ref: JSON.stringify({ audit_summary: { status: 'needs_followup' } }),
          created_at: '2026-06-13T10:00:00.000Z',
        },
      ],
      localFeedback,
    })

    expect(feedback).toEqual(expect.objectContaining({
      statusLabel: '运行中',
      detail: '最近动作：复盘批次 · 运行中 · 长线生产修复正在回填恢复依据结果。',
    }))
  })
})

describe('buildRecoveryEvidenceReviewResolvedFeedback', () => {
  test('marks a recovery evidence row as running from a matching repair audit run', () => {
    const rowAction = {
      action: 'recheck_safe_batch' as const,
      label: '复盘批次',
      focusSource: 'safe_batch_recovery_recheck',
    }

    const feedback = buildRecoveryEvidenceReviewResolvedFeedback({
      task: {
        issue_type: 'recovery_evidence_mismatch',
        recovery_evidence_review: {
          status: 'warn',
          failed_evidence: ['批次恢复复查：生产阻断已解除'],
        },
      },
      rowAction,
      currentRun: { id: 44, run_type: 'longform_production_repair' },
      runRecords: [
        {
          id: 44,
          run_type: 'longform_production_repair',
          status: 'running',
          step_name: 'repair-audit',
          output_ref: JSON.stringify({ audit_summary: { status: 'needs_followup' } }),
          created_at: '2026-06-13T10:00:00.000Z',
        },
      ],
    })

    expect(feedback).toEqual(expect.objectContaining({
      statusLabel: '运行中',
      triggeredAt: '实时状态',
      detail: '最近动作：复盘批次 · 运行中 · 长线生产修复正在回填恢复依据结果。',
    }))
  })

  test('keeps local feedback when a completed repair run has no audit refresh payload', () => {
    const rowAction = {
      action: 'recheck_safe_batch' as const,
      label: '复盘批次',
      focusSource: 'safe_batch_recovery_recheck',
    }
    const localFeedback = buildRecoveryEvidenceReviewActionFeedback(rowAction, '14:20')

    const feedback = buildRecoveryEvidenceReviewResolvedFeedback({
      task: {
        issue_type: 'recovery_evidence_mismatch',
        recovery_evidence_review: {
          status: 'warn',
          failed_evidence: ['批次恢复复查：生产阻断已解除'],
        },
      },
      rowAction,
      currentRun: { id: 44, run_type: 'longform_production_repair' },
      runRecords: [
        {
          id: 44,
          run_type: 'longform_production_repair',
          status: 'completed',
          output_ref: JSON.stringify({ tasks: [{ issue_type: 'recovery_evidence_mismatch' }] }),
          created_at: '2026-06-13T09:00:00.000Z',
        },
      ],
      localFeedback,
    })

    expect(feedback).toEqual(localFeedback)
  })

  test('marks a recovery evidence row as backfilled after the task review clears failed evidence', () => {
    const feedback = buildRecoveryEvidenceReviewResolvedFeedback({
      task: {
        issue_type: 'recovery_evidence_mismatch',
        recovery_evidence_review: {
          status: 'ok',
          failed_evidence: [],
          failed_items: [],
        },
      },
      rowAction: {
        action: 'execute_typed_repair' as const,
        label: '按批次修订',
        focusSource: '',
      },
      runRecords: [],
    })

    expect(feedback).toEqual(expect.objectContaining({
      statusLabel: '已回填',
      triggeredAt: '实时状态',
      detail: '最近动作：按批次修订 · 已回填 · 恢复依据复盘已清空失效项。',
    }))
  })

  test('marks a single-chapter recheck row as retryable when the matching quality run fails', () => {
    const feedback = buildRecoveryEvidenceReviewResolvedFeedback({
      task: {
        issue_type: 'recovery_evidence_mismatch',
        chapter_id: 42,
        annotation_source: 'governance_recheck_sync',
        recovery_evidence_review: {
          status: 'warn',
          failed_evidence: ['第42章对白交锋未继承'],
        },
      },
      rowAction: {
        action: 'recheck_single_chapter' as const,
        label: '复检单章',
        focusSource: 'single_chapter_governance_recheck',
      },
      runRecords: [
        {
          id: 92,
          run_type: 'prose_quality',
          status: 'failed',
          input_ref: JSON.stringify({ chapter_id: 42, source: 'governance_recheck_sync' }),
          error_message: '模型超时',
          created_at: '2026-06-13T10:03:00.000Z',
        },
      ],
    })

    expect(feedback).toEqual(expect.objectContaining({
      statusLabel: '失败需重试',
      triggeredAt: '实时状态',
      detail: '最近动作：复检单章 · 失败需重试 · 模型超时',
    }))
  })
})

describe('repairTaskActionLabel', () => {
  test('shows an executable action for first30 chapter retention patch tasks', () => {
    expect(repairTaskActionLabel({
      task_type: 'chapter_retention_patch',
      issue_type: '缺正文、章末钩子弱',
      chapter_id: 1,
    })).toBe('生成正文')

    expect(repairTaskActionLabel({
      task_type: 'chapter_retention_patch',
      issue_type: '章末钩子弱',
      chapter_id: 1,
    })).toBe('补留存')
  })

  test('labels single-chapter governance recheck recovery evidence tasks as evidence repair', () => {
    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      issue_type: 'recovery_evidence_mismatch',
      annotation_source: 'governance_recheck_sync',
      annotation_category: 'recovery_evidence',
      chapter_no: 42,
    })).toBe('回修依据')
  })

  test('keeps batch recovery evidence repairs on the batch revision action', () => {
    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'recovery_evidence_mismatch',
      segment: '第41-43章',
    })).toBe('按批次修订')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'safe_batch_expansion_segment_hotspot',
    })).toBe('修扩批热区')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'safe_batch_expansion_structure_repair',
    })).toBe('改扩批结构')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      issue_type: 'safe_batch_expansion_structure_decision_mismatch',
    })).toBe('查结构决策')
  })

  test('normalizes annotation categories before choosing repair task action labels', () => {
    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      annotation_category: 'reader_retention',
    })).toBe('补追读')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      annotation_category: 'innovation',
    })).toBe('补创新')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'volume_segment_missed',
      annotation_category: 'reader_retention',
    })).toBe('补阶段结算')
  })

  test('uses targeted action labels for oh-story revision closure sync tasks', () => {
    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      annotation_category: 'prose_revision_receipt',
    })).toBe('补回执')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      issue_type: 'quality_audit_repair_receipt',
    })).toBe('补质检')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      issue_type: 'deslop_repair_receipt',
    })).toBe('补去味')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      issue_type: 'revision_cascade_impact',
    })).toBe('补级联')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      issue_type: 'revision_scope_guard',
    })).toBe('稳幅度')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      annotation_category: 'prose_revision_receipt_sync',
    })).toBe('补回执')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      annotation_category: 'quality_audit_repair_receipt_sync',
    })).toBe('补质检')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      annotation_category: 'deslop_repair_receipt_sync',
    })).toBe('补去味')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      annotation_category: 'revision_cascade_impact_sync',
    })).toBe('补级联')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      annotation_category: 'revision_scope_guard_sync',
    })).toBe('稳幅度')
  })

  test('uses a targeted action for missing next-chapter quality plans', () => {
    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      issue_type: 'next_chapter_quality_plan',
      message: '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan。',
    })).toBe('补续航')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      annotation_category: 'approval_blocker',
      detail: '下一章质量续航计划缺失：必须输出 next_chapter_quality_plan。',
    })).toBe('补续航')

    expect(repairTaskActionLabel({
      source: 'review_annotation_risk',
      issue_type: 'next_chapter_quality_plan_receipts_gap',
      message: '质量续航回执缺失：必须输出 next_chapter_quality_plan_receipts。',
    })).toBe('补续航')
  })

  test('uses targeted labels for scene-card execution directive repairs', () => {
    const task = {
      source: 'review_annotation_risk',
      issue_type: 'scene_card_1_forbidden_directives',
      message: '场景1《蓝晶灼手》违反场景卡禁令：不得用整段来历/等级解释蓝晶。',
      action: '删掉说明书式来历、原理和等级解释，改成角色当下动作反应、对话半句、物理后果或证据判断变化。',
    }

    expect(repairTaskActionLabel(task)).toBe('修场景卡')
    expect(buildRepairTaskIssueTagMeta(task)).toEqual({ label: '场景卡执行', color: 'volcano' })
  })

  test('uses targeted labels for unattended Step 3 post-delivery repairs', () => {
    const cases = [
      ['title_uniqueness_gap', '改标题', { label: '标题去重', color: 'blue' }],
      ['blueprint_consumption_gap', '兑现细纲', { label: '细纲兑现', color: 'gold' }],
      ['foreshadowing_delta_gap', '补伏笔', { label: '伏笔增量', color: 'purple' }],
      ['deterministic_cleanup_gap', '清AI味', { label: '确定性清理', color: 'red' }],
      ['story_state_update_gap', '写状态', { label: '状态写回', color: 'cyan' }],
      ['write_preparation_receipts_gap', '补写前', { label: '写前准备', color: 'cyan' }],
      ['status_filter_receipts_gap', '补状态筛选', { label: '状态筛选', color: 'blue' }],
      ['source_readiness_gap', '补来源', { label: '来源就绪', color: 'cyan' }],
      ['intent_confirmation_gap', '补意图确认', { label: '意图确认', color: 'blue' }],
      ['benchmark_recall_gap', '补文风召回', { label: '文风召回', color: 'purple' }],
      ['style_sample_gap', '校样章', { label: '风格', color: 'purple' }],
    ] as const

    for (const [issueType, actionLabel, tagMeta] of cases) {
      const task = {
        source: 'unattended_post_delivery_quality',
        task_type: 'repair_quality',
        issue_type: issueType,
      }

      expect(repairTaskActionLabel(task)).toBe(actionLabel)
      expect(buildRepairTaskIssueTagMeta(task)).toEqual(tagMeta)
    }
  })

  test('shows targeted actions for pre-draft execution repair tasks', () => {
    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'intent_confirmation_gap',
    })).toBe('补意图确认')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'benchmark_recall_gap',
    })).toBe('补文风召回')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      annotation_category: 'pre_draft_execution',
    })).toBe('补意图确认')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'source_readiness_gap',
    })).toBe('补来源')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'state_tracking_gap',
    })).toBe('补状态')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'style_boundary_gap',
    })).toBe('校风格')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'story_drive_gap',
    })).toBe('补驱动')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'character_arc_gap',
    })).toBe('补弧光')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'runway_gap',
    })).toBe('补航线')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'quality_audit_gap',
    })).toBe('补诊断')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'beat_cooling_gap',
    })).toBe('补冷却')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'reader_expectation_debt',
    })).toBe('补期待')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'reader_payoff_debt',
    })).toBe('补回报')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'information_flow_gap',
    })).toBe('调信息')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'expectation_threshold_gap',
    })).toBe('补期待')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'story_loop_gap',
    })).toBe('补闭环')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'emotional_arc_gap',
    })).toBe('补情绪')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'chapter_hook_gap',
    })).toBe('补章钩')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'paragraph_hook_gap',
    })).toBe('补段钩')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'suspense_gap',
    })).toBe('补悬念')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'asset_linkage_gap',
    })).toBe('挂资产')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'dialogue_gap',
    })).toBe('修对白')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'scene_card_receipts_gap',
    })).toBe('修回执')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'delivery_risk_receipts_gap',
    })).toBe('补交稿')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'revision_context_receipts_gap',
    })).toBe('补上下文')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'plot_dynamics_gap',
    })).toBe('补动力')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'character_relation_gap',
    })).toBe('修关系')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'character_behavior_gap',
    })).toBe('修行为')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'conflict_structure_gap',
    })).toBe('加冲突')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'opening_gap',
    })).toBe('改开篇')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'bridge_unit_gap',
    })).toBe('补桥段')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'reversal_gap',
    })).toBe('补反转')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'showdown_gap',
    })).toBe('补高潮')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'prose_craft_gap',
    })).toBe('修工艺')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'chapter_handoff_gap',
    })).toBe('接章首')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'payoff_setup_gap',
    })).toBe('补铺垫')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'spectator_reaction_gap',
    })).toBe('补围观')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'punctuation_tone_gap',
    })).toBe('调语气')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'content_rubric_gap',
    })).toBe('补内容')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'reader_retention_gap',
    })).toBe('补追读')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'target_reader_gap',
    })).toBe('补读者')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'genre_positioning_gap',
    })).toBe('校题材')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'female_audience_gap',
    })).toBe('补女频')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'upgrade_rhythm_gap',
    })).toBe('补升级')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'chapter_structure_gap',
    })).toBe('补结构')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'chapter_progression_gap',
    })).toBe('补推进')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'information_load_gap',
    })).toBe('压信息')

    expect(repairTaskActionLabel({
      source: 'auto_creation_safe_batch_risk',
      task_type: 'repair_quality',
      issue_type: 'longform_continuity_gap',
    })).toBe('保长篇')
  })

  test('labels recovery evidence governance queue actions by their closure flow', () => {
    expect(repairTaskActionLabel({
      issue_type: 'recovery_evidence_governance_queue',
      action_key: 'revision',
    })).toBe('回修依据并复检')

    expect(repairTaskActionLabel({
      issue_type: 'recovery_evidence_governance_queue',
      action_key: 'recheck_single_chapter',
    })).toBe('复检单章')

    expect(repairTaskActionLabel({
      issue_type: 'recovery_evidence_governance_queue',
      action_key: 'recheck_safe_batch',
    })).toBe('复盘批次')

    expect(repairTaskActionLabel({
      issue_type: 'recovery_evidence_governance_queue',
      action_key: 'focus_task',
    })).toBe('已处理并复盘')

    expect(repairTaskActionLabel({
      issue_type: 'recovery_evidence_governance_queue',
      action_key: 'deep_repair_single_brief',
    })).toBe('深修单章任务书')

    expect(repairTaskActionLabel({
      issue_type: 'recovery_evidence_governance_queue',
      action_key: 'deep_repair_batch_brief',
    })).toBe('深修批次任务书')

    expect(repairTaskActionLabel({
      issue_type: 'recovery_evidence_governance_queue',
      action_key: 'deep_repair_single_brief',
      action_label: '强化单章任务书复盘',
      deep_repair_level: 'escalated_after_recurrence',
    })).toBe('强化单章任务书复盘')
  })
})
